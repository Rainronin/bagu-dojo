import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'

import { loadQuestionsForCategories } from '@/data/question.repository'
import { randomId } from '@/shared/lib/random'
import { isRecord, readStored, removeStored, writeStored } from '@/shared/lib/storage'
import type { Question, SessionAnswer, SessionMode, SessionResult, SessionState } from '@/shared/types'
import { useCatalogStore } from '@/stores/catalog'
import { useProgressStore } from '@/stores/progress'

import {
  buildQuestionQueue,
  buildSessionResult,
  createOptionOrder,
  makeAnswer,
  questionCategoryFromId,
} from '@/shared/lib/practice-engine'

const SESSION_KEY = 'bt.session.v1'

function isSessionState(value: unknown): value is SessionState {
  if (!isRecord(value)) {
    return false
  }
  return (
    value.version === 1 &&
    typeof value.id === 'string' &&
    typeof value.scope === 'string' &&
    (value.mode === 'random' || value.mode === 'wrong') &&
    Array.isArray(value.questionIds) &&
    isRecord(value.optionOrders) &&
    isRecord(value.answers) &&
    typeof value.index === 'number' &&
    typeof value.startedAt === 'number'
  )
}

export const usePracticeStore = defineStore('practice', () => {
  const catalogStore = useCatalogStore()
  const progressStore = useProgressStore()

  const session = ref<SessionState | null>(
    readStored<SessionState | null>(SESSION_KEY, null, (value): value is SessionState | null =>
      value === null || isSessionState(value),
    ),
  )
  const questions = ref<Question[]>([])
  const loading = ref(false)
  const restoring = ref(false)
  const error = ref<string | null>(null)

  const currentIndex = computed(() => session.value?.index ?? 0)
  const total = computed(() => session.value?.questionIds.length ?? 0)
  const currentQuestion = computed<Question | null>(() => {
    const current = session.value
    if (!current) {
      return null
    }
    const id = current.questionIds[current.index]
    return id ? (questions.value.find((question) => question.id === id) ?? null) : null
  })
  const currentAnswer = computed<SessionAnswer | null>(() => {
    const question = currentQuestion.value
    return question && session.value ? (session.value.answers[question.id] ?? null) : null
  })
  const currentOptionOrder = computed<string[]>(() => {
    const question = currentQuestion.value
    if (!question || !session.value) {
      return []
    }
    return session.value.optionOrders[question.id] ?? question.options.map((option) => option.id)
  })
  const answeredCount = computed(() => Object.keys(session.value?.answers ?? {}).length)
  const correctCount = computed(
    () => Object.values(session.value?.answers ?? {}).filter((answer) => answer.correct).length,
  )
  const isFinished = computed(() => Boolean(session.value?.finishedAt))
  const hasSavedSession = computed(
    () =>
      Boolean(session.value) &&
      !session.value?.finishedAt &&
      (session.value?.questionIds.length ?? 0) > 0,
  )
  const progressPercent = computed(() =>
    total.value === 0 ? 0 : Math.round((answeredCount.value / total.value) * 100),
  )
  const result = computed<SessionResult | null>(() => {
    if (!session.value) {
      return null
    }
    return buildSessionResult(session.value, questions.value)
  })

  const scopeLabel = computed(() => {
    if (!session.value) {
      return ''
    }
    const scope = session.value.scope
    if (scope === 'frontend') {
      return '前端综合'
    }
    if (scope === 'backend') {
      return '后端综合'
    }
    if (scope === 'all') {
      return '全部随机'
    }
    if (scope === 'wrong') {
      return '错题重练'
    }
    return catalogStore.categoryBySlug.get(scope)?.name ?? scope
  })

  watch(
    session,
    (value) => {
      if (value) {
        writeStored(SESSION_KEY, value)
      } else {
        removeStored(SESSION_KEY)
      }
    },
    { deep: true },
  )

  async function resolveQuestionPool(scope: string): Promise<Question[]> {
    const catalog = await catalogStore.ensureCatalog()
    let slugs: string[]
    if (scope === 'frontend' || scope === 'backend') {
      slugs = catalogStore.categorySlugsForDomain(scope)
    } else if (scope === 'all' || scope === 'wrong') {
      slugs = [...new Set(catalog.domains.flatMap((domain) => domain.groups.flatMap((group) => group.categories.map((category) => category.slug))))]
    } else {
      slugs = [scope]
    }
    return loadQuestionsForCategories(slugs)
  }

  async function startSession(options: {
    scope: string
    mode?: SessionMode
    count?: number | 'all'
  }): Promise<void> {
    loading.value = true
    error.value = null
    try {
      const mode = options.mode ?? 'random'
      const count = options.count ?? 10
      const pool = await resolveQuestionPool(options.scope)
      const queue = buildQuestionQueue({
        questions: pool,
        mode,
        count,
        getProgress: progressStore.getQuestionProgress,
      })
      if (queue.length === 0) {
        error.value =
          mode === 'wrong'
            ? '错题本还是空的，先做几道题吧。'
            : '这个范围暂时没有可练习的题目。'
        return
      }
      const optionOrders: Record<string, string[]> = {}
      for (const question of queue) {
        optionOrders[question.id] = createOptionOrder(question)
      }
      questions.value = queue
      session.value = {
        version: 1,
        id: randomId(),
        scope: options.scope,
        mode,
        questionIds: queue.map((question) => question.id),
        optionOrders,
        index: 0,
        answers: {},
        startedAt: Date.now(),
      }
    } catch (reason) {
      error.value = reason instanceof Error ? reason.message : '练习加载失败'
      throw reason
    } finally {
      loading.value = false
    }
  }

  async function restoreSession(): Promise<boolean> {
    if (!session.value) {
      return false
    }
    if (questions.value.length > 0) {
      return true
    }
    restoring.value = true
    error.value = null
    try {
      const ids = session.value.questionIds
      const slugs = [...new Set(ids.map(questionCategoryFromId).filter((slug): slug is string => Boolean(slug)))]
      let pool: Question[]
      if (slugs.length === 0) {
        pool = await resolveQuestionPool('all')
      } else {
        pool = await loadQuestionsForCategories(slugs)
      }
      const byId = new Map(pool.map((question) => [question.id, question]))
      const restored = ids
        .map((id) => byId.get(id))
        .filter((question): question is Question => question !== undefined)
      if (restored.length !== ids.length) {
        clearSession()
        error.value = '题库已更新，上次练习无法恢复。'
        return false
      }
      questions.value = restored
      return true
    } catch (reason) {
      error.value = reason instanceof Error ? reason.message : '恢复练习失败'
      return false
    } finally {
      restoring.value = false
    }
  }

  function answer(optionId: string): SessionAnswer | null {
    const current = session.value
    const question = currentQuestion.value
    if (!current || !question || current.finishedAt || current.answers[question.id]) {
      return null
    }
    const optionOrder =
      current.optionOrders[question.id] ??
      question.options.map((option) => option.id)
    current.optionOrders[question.id] = optionOrder
    const answerRecord = makeAnswer(question, optionId, optionOrder)
    current.answers[question.id] = answerRecord
    progressStore.recordAnswer(question.id, answerRecord.correct)
    return answerRecord
  }

  function next(): boolean {
    const current = session.value
    if (!current) {
      return false
    }
    if (current.index >= current.questionIds.length - 1) {
      finish()
      return false
    }
    current.index += 1
    return true
  }

  function finish(): SessionResult | null {
    const current = session.value
    if (!current) {
      return null
    }
    current.finishedAt = Date.now()
    return result.value
  }

  function clearSession(): void {
    session.value = null
    questions.value = []
    error.value = null
  }

  function questionsForResult(): Question[] {
    return questions.value
  }

  return {
    session,
    questions,
    loading,
    restoring,
    error,
    currentIndex,
    total,
    currentQuestion,
    currentAnswer,
    currentOptionOrder,
    answeredCount,
    correctCount,
    isFinished,
    hasSavedSession,
    progressPercent,
    result,
    scopeLabel,
    startSession,
    restoreSession,
    answer,
    next,
    finish,
    clearSession,
    questionsForResult,
  }
})
