import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'

import { localDateKey } from '@/shared/lib/date'
import { isRecord, readStored, writeStored } from '@/shared/lib/storage'
import type {
  AnswerResult,
  ProgressExport,
  ProgressState,
  QuestionProgress,
} from '@/shared/types'
import { createEmptyProgress, createQuestionProgress } from '@/shared/types'

const STORAGE_KEY = 'bt.progress.v1'

function isQuestionProgress(value: unknown): value is QuestionProgress {
  if (!isRecord(value)) {
    return false
  }
  return (
    typeof value.seen === 'number' &&
    typeof value.correct === 'number' &&
    typeof value.wrong === 'number' &&
    typeof value.correctStreak === 'number' &&
    typeof value.wrongBook === 'boolean'
  )
}

function isProgressState(value: unknown): value is ProgressState {
  if (!isRecord(value) || value.version !== 1 || !isRecord(value.questions) || !isRecord(value.daily)) {
    return false
  }
  return Object.values(value.questions).every(isQuestionProgress)
}

function ensureQuestion(state: ProgressState, questionId: string): QuestionProgress {
  const existing = state.questions[questionId]
  if (existing) {
    return existing
  }
  const created = createQuestionProgress()
  state.questions[questionId] = created
  return created
}

export const useProgressStore = defineStore('progress', () => {
  const state = ref<ProgressState>(readStored(STORAGE_KEY, createEmptyProgress(), isProgressState))

  watch(
    state,
    (value) => {
      value.updatedAt = Date.now()
      writeStored(STORAGE_KEY, value)
    },
    { deep: true },
  )

  const answeredQuestionIds = computed(() =>
    Object.entries(state.value.questions)
      .filter(([, item]) => item.seen > 0)
      .map(([id]) => id),
  )

  const wrongQuestionIds = computed(() =>
    Object.entries(state.value.questions)
      .filter(([, item]) => item.wrongBook)
      .map(([id]) => id),
  )

  const totalAnswered = computed(() =>
    Object.values(state.value.questions).reduce((sum, item) => sum + item.seen, 0),
  )

  const totalCorrect = computed(() =>
    Object.values(state.value.questions).reduce((sum, item) => sum + item.correct, 0),
  )

  const accuracy = computed(() =>
    totalAnswered.value === 0 ? 0 : totalCorrect.value / totalAnswered.value,
  )

  const todayStat = computed(() => state.value.daily[localDateKey()] ?? { answered: 0, correct: 0 })

  function recordAnswer(questionId: string, correct: boolean): void {
    const question = ensureQuestion(state.value, questionId)
    const result: AnswerResult = correct ? 'correct' : 'wrong'

    question.seen += 1
    question.lastResult = result
    question.lastAt = Date.now()

    if (correct) {
      question.correct += 1
      question.correctStreak += 1
      if (question.correctStreak >= 2) {
        question.wrongBook = false
      }
    } else {
      question.wrong += 1
      question.correctStreak = 0
      question.wrongBook = true
    }

    const day = localDateKey()
    const daily = state.value.daily[day] ?? { answered: 0, correct: 0 }
    daily.answered += 1
    if (correct) {
      daily.correct += 1
    }
    state.value.daily[day] = daily
  }

  function removeFromWrongBook(questionId: string): void {
    const question = state.value.questions[questionId]
    if (question) {
      question.wrongBook = false
    }
  }

  function getQuestionProgress(questionId: string): QuestionProgress | undefined {
    return state.value.questions[questionId]
  }

  function resetAll(): void {
    state.value = createEmptyProgress()
    writeStored(STORAGE_KEY, state.value)
  }

  function exportProgress(): ProgressExport {
    return {
      app: 'bagu-training-ground',
      version: 1,
      exportedAt: new Date().toISOString(),
      progress: JSON.parse(JSON.stringify(state.value)) as ProgressState,
    }
  }

  function importProgress(raw: unknown): { ok: true } | { ok: false; error: string } {
    if (!isRecord(raw) || raw.app !== 'bagu-training-ground' || !isProgressState(raw.progress)) {
      return { ok: false, error: '文件不是八股训练场的进度备份，或结构已损坏。' }
    }
    state.value = raw.progress
    writeStored(STORAGE_KEY, state.value)
    return { ok: true }
  }

  function streakDays(): number {
    const dates = Object.keys(state.value.daily).sort()
    if (dates.length === 0) {
      return 0
    }
    const today = localDateKey()
    const yesterday = localDateKey(new Date(Date.now() - 86_400_000))
    const last = dates[dates.length - 1]
    if (last !== today && last !== yesterday) {
      return 0
    }
    let streak = 0
    const cursor = new Date(`${last}T00:00:00`)
    for (;;) {
      const key = localDateKey(cursor)
      if (!state.value.daily[key] || state.value.daily[key]!.answered === 0) {
        break
      }
      streak += 1
      cursor.setDate(cursor.getDate() - 1)
    }
    return streak
  }

  return {
    state,
    answeredQuestionIds,
    wrongQuestionIds,
    totalAnswered,
    totalCorrect,
    accuracy,
    todayStat,
    recordAnswer,
    removeFromWrongBook,
    getQuestionProgress,
    resetAll,
    exportProgress,
    importProgress,
    streakDays,
  }
})
