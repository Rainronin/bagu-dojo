<script setup lang="ts">
import gsap from 'gsap'
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import SourceLabel from '@/shared/components/SourceLabel.vue'
import BaseButton from '@/shared/components/BaseButton.vue'
import ReportDialog from '@/shared/components/ReportDialog.vue'
import { formatPercent } from '@/shared/lib/date'
import { orderedOptions } from '@/shared/lib/practice-engine'
import type { QuestionOption } from '@/shared/types'
import { useCatalogStore } from '@/stores/catalog'
import { usePracticeStore } from '@/stores/practice'
import { useProgressStore } from '@/stores/progress'
import { useSettingsStore } from '@/stores/settings'

const route = useRoute()
const router = useRouter()
const catalogStore = useCatalogStore()
const practiceStore = usePracticeStore()
const progressStore = useProgressStore()
const settingsStore = useSettingsStore()

const explanationEl = ref<HTMLElement | null>(null)
const questionCardEl = ref<HTMLElement | null>(null)
const setupCount = ref<number | 'all'>(10)
const starting = ref(false)
const localError = ref<string | null>(null)
const reportOpen = ref(false)
const reportNotice = ref('')
let reportTimer: number | undefined

const countOptions: Array<{ value: number | 'all'; label: string }> = [
  { value: 10, label: '10 题' },
  { value: 20, label: '20 题' },
  { value: 'all', label: '全部' },
]

const scope = computed(() => String(route.params.scope ?? ''))
const isWrongScope = computed(() => scope.value === 'wrong')
const mode = computed(() => (isWrongScope.value ? 'wrong' : 'random'))

const catalogCategory = computed(() => catalogStore.categoryBySlug.get(scope.value) ?? null)

const scopeLabel = computed(() => {
  if (scope.value === 'frontend') return '前端综合'
  if (scope.value === 'backend') return '后端综合'
  if (scope.value === 'all') return '全部随机'
  if (scope.value === 'wrong') return '错题重练'
  return catalogCategory.value?.name ?? '练习'
})

const scopeDescription = computed(() => {
  if (scope.value === 'frontend') return '前端 13 类 + 计算机基础共享类，混合抽题。'
  if (scope.value === 'backend') return '后端 8 类 + 计算机基础共享类，混合抽题。'
  if (scope.value === 'all') return '全部题库一起抽，顺序每轮重新洗牌。'
  if (scope.value === 'wrong') return '只抽当前错题本里的题，连续答对 2 次移出。'
  return catalogCategory.value?.domain === 'shared'
    ? '前后端共享的计算机基础题。'
    : '本分类的题目，答对答错都显示题库原答案。'
})

const availableCount = computed(() => {
  if (catalogCategory.value) {
    return catalogCategory.value.questionCount
  }
  if (scope.value === 'frontend') return catalogStore.domainQuestionCount('frontend')
  if (scope.value === 'backend') return catalogStore.domainQuestionCount('backend')
  if (scope.value === 'all') return catalogStore.totalQuestions
  if (scope.value === 'wrong') return progressStore.wrongQuestionIds.length
  return 0
})

const wrongInScope = computed(() => {
  const wrong = new Set(progressStore.wrongQuestionIds)
  if (isWrongScope.value) {
    return wrong.size
  }
  if (!catalogCategory.value) {
    return scope.value === 'all' || scope.value === 'frontend' || scope.value === 'backend'
      ? wrong.size
      : 0
  }
  const prefix = `q_${catalogCategory.value.slug}_`
  return [...wrong].filter((id) => id.startsWith(prefix)).length
})

const isActive = computed(
  () =>
    practiceStore.session !== null &&
    practiceStore.session.scope === scope.value &&
    !practiceStore.session.finishedAt &&
    practiceStore.questions.length > 0,
)

const currentQuestion = computed(() => practiceStore.currentQuestion)
const currentAnswer = computed(() => practiceStore.currentAnswer)
const optionList = computed<QuestionOption[]>(() => {
  const question = currentQuestion.value
  if (!question) {
    return []
  }
  return orderedOptions(question, practiceStore.currentOptionOrder)
})
const isLast = computed(() => practiceStore.currentIndex >= practiceStore.total - 1)
const correctCount = computed(() => practiceStore.correctCount)
const progressPercent = computed(() => practiceStore.progressPercent)
const accuracyLabel = computed(() =>
  formatPercent(
    practiceStore.answeredCount === 0
      ? 0
      : practiceStore.correctCount / practiceStore.answeredCount,
  ),
)
const answered = computed(() => currentAnswer.value !== null)
const correctOption = computed(() => currentQuestion.value?.options.find((option) => option.correct))

const feedback = computed(() => {
  const answer = currentAnswer.value
  if (!answer) {
    return ''
  }
  if (answer.correct) {
    return '回答正确。'
  }
  return `回答错误。正确选项是「${correctOption.value?.text ?? ''}」。`
})

const backTo = computed(() => {
  if (scope.value === 'frontend') return '/frontend'
  if (scope.value === 'backend') return '/backend'
  if (scope.value === 'wrong') return '/wrong'
  if (scope.value === 'all') return '/'
  const domain = catalogCategory.value?.domain
  if (domain === 'backend') return '/backend'
  if (domain === 'frontend' || domain === 'shared') return '/frontend'
  return '/'
})

const savedSessionScope = computed(() => practiceStore.session?.scope ?? '')
const savedSessionLink = computed(() =>
  practiceStore.session ? `/practice/${practiceStore.session.scope}?resume=1` : '/',
)

const canStart = computed(() => availableCount.value > 0 && !starting.value)

watch(scope, () => {
  setupCount.value = 10
  localError.value = null
})

onMounted(async () => {
  void catalogStore.ensureCatalog().catch(() => undefined)
  if (practiceStore.session && practiceStore.session.scope === scope.value && !practiceStore.session.finishedAt) {
    await practiceStore.restoreSession()
    return
  }
  if (route.query.resume === '1' && practiceStore.session) {
    await practiceStore.restoreSession()
  }
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeydown)
  if (reportTimer) {
    window.clearTimeout(reportTimer)
  }
  if (questionCardEl.value) {
    gsap.killTweensOf(questionCardEl.value)
    gsap.killTweensOf(questionCardEl.value.querySelectorAll('.option'))
  }
})

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
})

watch(
  () => practiceStore.currentQuestion?.id,
  async () => {
    await nextTick()
    window.scrollTo({ top: 0, behavior: settingsStore.prefersReducedMotion ? 'auto' : 'smooth' })
    animateQuestion()
  },
)

function animateQuestion(): void {
  if (settingsStore.prefersReducedMotion || !questionCardEl.value) {
    return
  }
  const card = questionCardEl.value
  const options = card.querySelectorAll('.option')
  gsap.killTweensOf([card, options])
  gsap.fromTo(
    card,
    { opacity: 0, y: 16 },
    { opacity: 1, y: 0, duration: 0.36, ease: 'power3.out' },
  )
  if (options.length > 0) {
    gsap.fromTo(
      options,
      { opacity: 0, y: 8 },
      { opacity: 1, y: 0, duration: 0.28, stagger: 0.04, delay: 0.06, ease: 'power2.out' },
    )
  }
}

function animateAnswer(): void {
  if (settingsStore.prefersReducedMotion || !questionCardEl.value) {
    return
  }
  const wrong = questionCardEl.value.querySelector('.option--wrong')
  const correct = questionCardEl.value.querySelector('.option--correct')
  if (wrong) {
    gsap.fromTo(wrong, { x: -4 }, { x: 0, duration: 0.34, ease: 'elastic.out(1, 0.35)' })
  }
  if (correct) {
    gsap.fromTo(correct, { scale: 0.997 }, { scale: 1, duration: 0.36, ease: 'power2.out' })
  }
}

function onReportSubmitted(): void {
  reportNotice.value = '已记录到本地，可在设置页查看或导出。'
  if (reportTimer) {
    window.clearTimeout(reportTimer)
  }
  reportTimer = window.setTimeout(() => {
    reportNotice.value = ''
  }, 4000)
}

function optionState(option: QuestionOption): 'idle' | 'correct' | 'wrong' | 'dim' {
  if (!currentAnswer.value) {
    return 'idle'
  }
  if (option.correct) {
    return 'correct'
  }
  if (option.id === currentAnswer.value.optionId) {
    return 'wrong'
  }
  return 'dim'
}

function optionLetter(index: number): string {
  return String.fromCharCode(65 + index)
}

async function selectOption(option: QuestionOption): Promise<void> {
  if (answered.value || practiceStore.isFinished) {
    return
  }
  practiceStore.answer(option.id)
  await nextTick()
  animateAnswer()
  if (explanationEl.value) {
    explanationEl.value.scrollIntoView({
      behavior: settingsStore.prefersReducedMotion ? 'auto' : 'smooth',
      block: 'nearest',
    })
  }
}

async function startPractice(nextMode: 'random' | 'wrong' = 'random'): Promise<void> {
  if (starting.value) {
    return
  }
  starting.value = true
  localError.value = null
  try {
    await practiceStore.startSession({
      scope: scope.value,
      mode: nextMode,
      count: setupCount.value,
    })
    if (practiceStore.error) {
      localError.value = practiceStore.error
    }
  } catch (reason) {
    localError.value = reason instanceof Error ? reason.message : '开始练习失败'
  } finally {
    starting.value = false
  }
}

async function startWrongOnly(): Promise<void> {
  setupCount.value = 'all'
  await startPractice('wrong')
}

async function goNext(): Promise<void> {
  if (!answered.value || practiceStore.isFinished) {
    return
  }
  if (isLast.value) {
    practiceStore.finish()
    await router.push('/result')
    return
  }
  practiceStore.next()
}

function handleKeydown(event: KeyboardEvent): void {
  const target = event.target as HTMLElement | null
  if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) {
    return
  }
  if (!isActive.value) {
    return
  }
  if (event.key >= '1' && event.key <= '4') {
    const option = optionList.value[Number(event.key) - 1]
    if (option) {
      event.preventDefault()
      void selectOption(option)
    }
    return
  }
  if (event.key === 'Enter' && answered.value) {
    event.preventDefault()
    void goNext()
  }
  if (event.key === 'Escape') {
    void router.push(backTo.value)
  }
}
</script>

<template>
  <div class="practice container-page">
    <div v-if="!isActive" class="setup">
      <header class="setup__head">
        <button class="back" type="button" @click="router.push(backTo)">← 返回</button>
        <p class="kicker">PRACTICE / SETUP</p>
        <h1>{{ scopeLabel }}</h1>
        <p>{{ scopeDescription }}</p>
      </header>

      <div class="setup__panel surface">
        <div class="setup__stat">
          <span class="kicker">AVAILABLE</span>
          <strong class="mono">{{ availableCount }}</strong>
          <span>道题可练</span>
        </div>
        <div class="setup__options">
          <span class="kicker">本轮题量</span>
          <div class="segmented" role="radiogroup" aria-label="本轮题量">
            <button
              v-for="option in countOptions"
              :key="option.label"
              type="button"
              role="radio"
              :aria-checked="setupCount === option.value"
              :class="{ 'segmented__item--active': setupCount === option.value }"
              class="segmented__item"
              @click="setupCount = option.value"
            >
              {{ option.label }}
            </button>
          </div>
        </div>
        <div class="setup__actions">
          <BaseButton size="lg" :disabled="!canStart" @click="startPractice(mode)">
            {{ starting ? '加载中…' : '开始练习' }}
          </BaseButton>
          <BaseButton
            v-if="wrongInScope > 0"
            variant="secondary"
            size="lg"
            :disabled="starting"
            @click="startWrongOnly"
          >
            只练错题（{{ wrongInScope }}）
          </BaseButton>
        </div>
        <p v-if="localError || practiceStore.error" class="setup__error" role="alert">
          {{ localError ?? practiceStore.error }}
        </p>
        <p v-else-if="availableCount === 0" class="setup__error">
          这个范围还没有题目。题库生成后会出现在这里。
        </p>
        <p class="setup__hint">
          同轮不重复；未做过的题优先；每轮重新洗牌。答题后显示原答案与逐项错因。
        </p>
      </div>

      <p v-if="practiceStore.hasSavedSession && savedSessionScope !== scope" class="setup__resume">
        有一轮未完成的练习：
        <RouterLink :to="savedSessionLink">继续上次</RouterLink>
      </p>
    </div>

    <div v-else-if="practiceStore.loading || practiceStore.restoring" class="state-panel surface">
      <span class="loading-dot" aria-hidden="true" />
      正在加载题目…
    </div>

    <template v-else-if="currentQuestion">
      <header class="practice-head">
        <button class="back" type="button" @click="router.push(backTo)">← 返回</button>
        <div class="practice-head__scope">
          <span class="kicker">{{ scopeLabel }}</span>
          <span class="mono">{{ practiceStore.currentIndex + 1 }} / {{ practiceStore.total }}</span>
        </div>
        <div class="practice-head__score">
          <span class="mono">{{ correctCount }} 正确</span>
          <span class="mono">{{ accuracyLabel }}</span>
        </div>
      </header>
      <div class="progress-track" aria-hidden="true">
        <span :style="{ width: `${progressPercent}%` }" />
      </div>

      <article ref="questionCardEl" class="question-card surface">
        <div class="question-card__meta">
          <span class="chip mono">{{ catalogCategory?.name ?? scopeLabel }}</span>
          <span v-if="mode === 'wrong'" class="chip chip--wrong mono">WRONG ONLY</span>
          <span class="question-card__index mono">Q{{ String(practiceStore.currentIndex + 1).padStart(2, '0') }}</span>
        </div>
        <h2 class="question-card__stem" v-html="currentQuestion.stemHtml" />

        <div class="options" role="radiogroup" aria-label="选项">
          <button
            v-for="(option, index) in optionList"
            :key="option.id"
            class="option"
            :class="[`option--${optionState(option)}`, { 'option--answered': answered }]"
            type="button"
            role="radio"
            :aria-checked="currentAnswer?.optionId === option.id"
            :disabled="answered"
            @click="selectOption(option)"
          >
            <span class="option__letter mono">{{ optionLetter(index) }}</span>
            <span class="option__body">
              <span class="option__text">{{ option.text }}</span>
              <span
                v-if="answered && !option.correct && option.wrongReason"
                class="option__reason"
              >
                {{ option.wrongReason }}
              </span>
            </span>
            <span class="option__mark" aria-hidden="true">
              {{ optionState(option) === 'correct' ? '✓' : optionState(option) === 'wrong' ? '×' : '' }}
            </span>
          </button>
        </div>

        <p class="sr-only" aria-live="polite">{{ feedback }}</p>
      </article>

      <section v-if="answered" ref="explanationEl" class="explain surface" aria-live="polite">
        <header class="explain__head">
          <span class="explain__badge" :data-correct="currentAnswer?.correct">
            {{ currentAnswer?.correct ? '回答正确' : '回答错误' }}
          </span>
          <span class="kicker">EXPLANATION / 原文解析</span>
        </header>
        <div class="explain__body" v-html="currentQuestion.explanationHtml" />
        <p v-if="currentQuestion.explanationNotice" class="explain__truncation" role="note">
          {{ currentQuestion.explanationNotice }}
        </p>
        <footer class="explain__foot">
          <SourceLabel :source="currentQuestion.source" />
          <button class="report" type="button" @click="reportOpen = true">题目报错</button>
        </footer>
        <p v-if="reportNotice" class="explain__notice" role="status">{{ reportNotice }}</p>
      </section>

      <footer class="practice-foot">
        <p class="practice-foot__hint">
          键盘 <span class="mono">1–4</span> 选择 · <span class="mono">Enter</span> 下一题 · <span class="mono">Esc</span> 返回
        </p>
        <BaseButton size="lg" :disabled="!answered" @click="goNext">
          {{ isLast ? '查看结果' : '下一题' }}
        </BaseButton>
      </footer>
    </template>

    <div v-else class="state-panel surface">
      <p>{{ practiceStore.error ?? '题目加载失败，请返回重试。' }}</p>
      <BaseButton variant="secondary" @click="router.push(backTo)">返回</BaseButton>
    </div>

    <ReportDialog
      v-if="reportOpen && currentQuestion"
      :question="currentQuestion"
      @close="reportOpen = false"
      @submitted="onReportSubmitted"
    />
  </div>
</template>

<style scoped>
.practice {
  padding-block: 28px 24px;
}

.back {
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--muted);
  font-size: 12px;
}

.back:hover {
  color: var(--text);
}

.setup {
  max-width: 840px;
  margin-inline: auto;
  padding-block: 28px;
}

.setup__head .kicker {
  margin-top: 28px;
}

.setup__head h1 {
  margin-top: 12px;
  font-size: clamp(36px, 5vw, 56px);
  letter-spacing: -0.04em;
}

.setup__head > p:last-child {
  margin-top: 12px;
  color: var(--muted);
  font-size: 14px;
}

.setup__panel {
  display: grid;
  gap: 24px;
  margin-top: 28px;
  padding: 28px;
}

.setup__stat {
  display: flex;
  align-items: end;
  gap: 8px;
  padding-bottom: 20px;
  border-bottom: 1px solid var(--border);
}

.setup__stat strong {
  color: var(--accent);
  font-size: 42px;
  font-weight: 500;
  line-height: 0.9;
}

.setup__stat > span:last-child {
  color: var(--muted);
  font-size: 12px;
}

.setup__options {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}

.segmented {
  display: inline-flex;
  padding: 3px;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--surface-soft);
}

.segmented__item {
  min-height: 34px;
  padding: 0 14px;
  border: 0;
  border-radius: 7px;
  background: transparent;
  color: var(--muted);
  font-size: 12px;
}

.segmented__item--active {
  background: var(--elevated);
  color: var(--text);
  box-shadow: 0 1px 0 color-mix(in srgb, white 8%, transparent) inset;
}

.setup__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.setup__error {
  color: var(--wrong);
  font-size: 12px;
}

.setup__hint {
  color: var(--faint);
  font-size: 11px;
}

.setup__resume {
  margin-top: 18px;
  color: var(--muted);
  font-size: 12px;
  text-align: center;
}

.setup__resume a {
  color: var(--accent);
}

.practice-head {
  display: flex;
  align-items: center;
  gap: 18px;
  padding-block: 10px;
}

.practice-head__scope {
  display: flex;
  align-items: baseline;
  gap: 10px;
}

.practice-head__scope .mono {
  color: var(--muted);
  font-size: 11px;
}

.practice-head__score {
  display: flex;
  gap: 14px;
  margin-left: auto;
  color: var(--muted);
  font-size: 11px;
}

.progress-track {
  height: 3px;
  margin-bottom: 24px;
  overflow: hidden;
  border-radius: 999px;
  background: color-mix(in srgb, var(--border) 90%, transparent);
}

.progress-track span {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, var(--accent), var(--accent-2));
  transition: width var(--duration-scene) var(--ease-out);
}

.question-card {
  max-width: 860px;
  margin-inline: auto;
  padding: clamp(22px, 4vw, 36px);
}

.question-card__meta {
  display: flex;
  align-items: center;
  gap: 8px;
}

.chip {
  padding: 3px 8px;
  border: 1px solid var(--border);
  border-radius: 5px;
  color: var(--muted);
  font-size: 9px;
  letter-spacing: 0.08em;
}

.chip--wrong {
  border-color: color-mix(in srgb, var(--wrong) 35%, var(--border));
  color: var(--wrong);
}

.question-card__index {
  margin-left: auto;
  color: var(--faint);
  font-size: 10px;
}

.question-card__stem {
  margin-top: 24px;
  font-size: clamp(19px, 2.4vw, 24px);
  font-weight: 550;
  line-height: 1.55;
}

.question-card__stem :deep(code) {
  padding: 1px 5px;
  border-radius: 4px;
  background: var(--elevated);
  font-family: var(--font-mono);
  font-size: 0.85em;
}

.options {
  display: grid;
  gap: 10px;
  margin-top: 28px;
}

.option {
  display: grid;
  grid-template-columns: 30px 1fr 18px;
  align-items: start;
  gap: 12px;
  width: 100%;
  padding: 14px 16px;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: color-mix(in srgb, var(--surface-soft) 92%, transparent);
  color: var(--text-soft);
  text-align: left;
  transition:
    border-color var(--duration-hover) var(--ease-out),
    background var(--duration-hover) var(--ease-out),
    transform var(--duration-press) var(--ease-out);
}

.option:not(:disabled):hover {
  border-color: var(--border-strong);
  background: var(--surface);
}

.option:not(:disabled):active {
  transform: scale(0.995);
}

.option__letter {
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  border: 1px solid var(--border);
  border-radius: 7px;
  color: var(--muted);
  font-size: 11px;
}

.option__body {
  display: grid;
  gap: 6px;
  padding-top: 2px;
}

.option__text {
  font-size: 14px;
  line-height: 1.65;
}

.option__reason {
  color: var(--muted);
  font-size: 11px;
  line-height: 1.6;
}

.option__mark {
  padding-top: 2px;
  font-size: 14px;
  text-align: center;
}

.option--correct {
  border-color: color-mix(in srgb, var(--correct) 55%, var(--border));
  background: color-mix(in srgb, var(--correct) 9%, var(--surface));
  color: var(--text);
}

.option--correct .option__letter {
  border-color: color-mix(in srgb, var(--correct) 55%, var(--border));
  color: var(--correct);
}

.option--correct .option__mark {
  color: var(--correct);
}

.option--wrong {
  border-color: color-mix(in srgb, var(--wrong) 55%, var(--border));
  background: color-mix(in srgb, var(--wrong) 8%, var(--surface));
  color: var(--text);
}

.option--wrong .option__letter {
  border-color: color-mix(in srgb, var(--wrong) 55%, var(--border));
  color: var(--wrong);
}

.option--wrong .option__mark {
  color: var(--wrong);
}

.option--dim {
  opacity: 0.62;
}

.explain {
  max-width: 860px;
  margin: 16px auto 0;
  padding: clamp(20px, 3.6vw, 30px);
}

.explain__head {
  display: flex;
  align-items: center;
  gap: 10px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--border);
}

.explain__badge {
  padding: 3px 8px;
  border-radius: 5px;
  font-size: 10px;
  letter-spacing: 0.06em;
}

.explain__badge[data-correct='true'] {
  background: color-mix(in srgb, var(--correct) 12%, transparent);
  color: var(--correct);
}

.explain__badge[data-correct='false'] {
  background: color-mix(in srgb, var(--wrong) 12%, transparent);
  color: var(--wrong);
}

.explain__body {
  margin-top: 18px;
  color: var(--text-soft);
  font-size: 14px;
  line-height: 1.8;
  overflow-wrap: anywhere;
}

.explain__body :deep(h1),
.explain__body :deep(h2),
.explain__body :deep(h3),
.explain__body :deep(h4) {
  margin-top: 22px;
  margin-bottom: 8px;
  color: var(--text);
  font-size: 15px;
}

.explain__body :deep(p) {
  margin-block: 10px;
}

.explain__body :deep(ul),
.explain__body :deep(ol) {
  margin-block: 10px;
  padding-left: 22px;
}

.explain__body :deep(li) {
  margin-block: 4px;
}

.explain__body :deep(strong) {
  color: var(--text);
}

.explain__body :deep(code) {
  padding: 1px 5px;
  border-radius: 4px;
  background: var(--elevated);
  font-family: var(--font-mono);
  font-size: 0.85em;
}

.explain__body :deep(pre) {
  margin-block: 14px;
  padding: 14px 16px;
  overflow-x: auto;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: #060a0c;
  font-size: 12px;
  line-height: 1.65;
}

.explain__body :deep(pre code) {
  padding: 0;
  background: transparent;
  font-size: inherit;
}

.explain__body :deep(blockquote) {
  margin-block: 12px;
  padding: 8px 14px;
  border-left: 2px solid var(--accent);
  background: color-mix(in srgb, var(--accent) 5%, transparent);
  color: var(--muted);
}

.explain__body :deep(table) {
  width: 100%;
  margin-block: 14px;
  border-collapse: collapse;
  font-size: 12px;
}

.explain__body :deep(th),
.explain__body :deep(td) {
  padding: 7px 9px;
  border: 1px solid var(--border);
  text-align: left;
}

.explain__foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 20px;
  padding-top: 14px;
  border-top: 1px solid var(--border);
}

.report {
  border: 0;
  background: transparent;
  color: var(--faint);
  font-size: 10px;
}

.report:hover {
  color: var(--text);
}

.explain__notice {
  margin-top: 10px;
  color: var(--correct);
  font-size: 11px;
}

.explain__truncation {
  margin-top: 16px;
  padding: 9px 12px;
  border-left: 2px solid var(--warning);
  background: color-mix(in srgb, var(--warning) 7%, transparent);
  color: var(--warning);
  font-size: 11px;
  line-height: 1.6;
}

.practice-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  max-width: 860px;
  margin: 20px auto 0;
  padding-top: 16px;
  border-top: 1px solid var(--border);
}

.practice-foot__hint {
  color: var(--faint);
  font-size: 11px;
}

.practice-foot__hint .mono {
  padding: 1px 4px;
  border: 1px solid var(--border);
  border-radius: 3px;
  font-size: 9px;
}

.state-panel {
  display: grid;
  justify-items: center;
  gap: 14px;
  max-width: 640px;
  margin: 64px auto;
  padding: 40px;
  color: var(--muted);
  text-align: center;
  font-size: 13px;
}

.loading-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--accent);
  box-shadow: 0 0 14px var(--accent);
  animation: pulse 1.2s infinite var(--ease-out);
}

@keyframes pulse {
  50% {
    opacity: 0.35;
    transform: scale(0.8);
  }
}

@media (max-width: 640px) {
  .practice {
    padding-top: 16px;
  }

  .practice-head {
    flex-wrap: wrap;
    gap: 10px;
  }

  .practice-head__score {
    width: 100%;
    margin-left: 0;
  }

  .question-card {
    padding: 18px;
  }

  .option {
    grid-template-columns: 28px 1fr 16px;
    padding: 12px;
  }

  .practice-foot {
    align-items: stretch;
    flex-direction: column;
  }

  .practice-foot__hint {
    display: none;
  }
}
</style>
