<script setup lang="ts">
import gsap from 'gsap'
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'

import BaseButton from '@/shared/components/BaseButton.vue'
import ProgressRing from '@/shared/components/ProgressRing.vue'
import { formatDuration, formatPercent } from '@/shared/lib/date'
import type { Question } from '@/shared/types'
import { useCatalogStore } from '@/stores/catalog'
import { usePracticeStore } from '@/stores/practice'
import { useSettingsStore } from '@/stores/settings'

const router = useRouter()
const practiceStore = usePracticeStore()
const catalogStore = useCatalogStore()
const settingsStore = useSettingsStore()

const confettiEl = ref<HTMLElement | null>(null)
const displayScore = ref(0)

const result = computed(() => practiceStore.result)
const session = computed(() => practiceStore.session)
const score = computed(() => Math.round((result.value?.accuracy ?? 0) * 100))

const wrongQuestions = computed<Question[]>(() => {
  if (!result.value) {
    return []
  }
  const byId = new Map(practiceStore.questionsForResult().map((question) => [question.id, question]))
  return result.value.wrongQuestionIds
    .map((id) => byId.get(id))
    .filter((question): question is Question => question !== undefined)
})

onMounted(async () => {
  void catalogStore.ensureCatalog().catch(() => undefined)
  if (practiceStore.session && practiceStore.questions.length === 0) {
    await practiceStore.restoreSession()
  }
  await nextTick()
  animateResult()
})

onBeforeUnmount(() => {
  if (confettiEl.value) {
    gsap.killTweensOf(confettiEl.value.querySelectorAll('.confetti'))
  }
})

function animateResult(): void {
  if (settingsStore.prefersReducedMotion) {
    displayScore.value = score.value
    return
  }
  const proxy = { value: 0 }
  gsap.to(proxy, {
    value: score.value,
    duration: 0.9,
    ease: 'power2.out',
    onUpdate: () => {
      displayScore.value = Math.round(proxy.value)
    },
  })
  if (score.value >= 80) {
    burstConfetti()
  }
}

function burstConfetti(): void {
  const layer = confettiEl.value
  if (!layer) {
    return
  }
  const colors = ['#7CF5D4', '#A78BFA', '#F5C36B', '#5EE6A8', '#FF6B8A']
  for (let index = 0; index < 36; index += 1) {
    const piece = document.createElement('span')
    piece.className = 'confetti'
    piece.style.left = `${50 + (Math.random() * 44 - 22)}%`
    piece.style.background = colors[index % colors.length] ?? colors[0]!
    piece.style.width = `${4 + Math.random() * 5}px`
    piece.style.height = `${6 + Math.random() * 8}px`
    layer.appendChild(piece)
    gsap.fromTo(
      piece,
      { y: 0, x: 0, rotate: 0, opacity: 1 },
      {
        y: 220 + Math.random() * 220,
        x: (Math.random() * 2 - 1) * 240,
        rotate: (Math.random() * 2 - 1) * 540,
        opacity: 0,
        duration: 1.2 + Math.random() * 0.8,
        delay: Math.random() * 0.18,
        ease: 'power1.in',
        onComplete: () => piece.remove(),
      },
    )
  }
}

function categoryName(slug: string): string {
  return catalogStore.categoryBySlug.get(slug)?.name ?? slug
}

async function restart(): Promise<void> {
  if (!session.value) {
    return
  }
  await practiceStore.startSession({
    scope: session.value.scope,
    mode: session.value.mode,
    count: session.value.questionIds.length,
  })
  await router.push(`/practice/${session.value.scope}`)
}

function practiceWrong(): void {
  void router.push('/practice/wrong')
}
</script>

<template>
  <div class="result container-page">
    <div ref="confettiEl" class="confetti-layer" aria-hidden="true" />
    <div v-if="!result" class="result__empty">
      <h1>还没有可结算的练习</h1>
      <RouterLink class="result__home" to="/">回首页</RouterLink>
    </div>

    <template v-else>
      <header class="result__head">
        <p class="kicker">SESSION COMPLETE</p>
        <h1>{{ practiceStore.scopeLabel }}</h1>
        <p>{{ formatDuration(result.durationMs) }} · {{ result.answered }} / {{ result.total }} 题已答</p>
      </header>

      <section class="score surface">
        <div class="score__ring">
          <ProgressRing :value="score" :size="150" :stroke="6" />
          <div class="score__center">
            <strong class="mono">{{ displayScore }}<small>%</small></strong>
            <span class="kicker">ACCURACY</span>
          </div>
        </div>
        <div class="score__stats">
          <div>
            <span class="kicker">答对</span>
            <strong class="mono score__good">{{ result.correct }}</strong>
          </div>
          <div>
            <span class="kicker">答错</span>
            <strong class="mono score__bad">{{ result.wrong }}</strong>
          </div>
          <div>
            <span class="kicker">正确率</span>
            <strong class="mono">{{ formatPercent(result.accuracy) }}</strong>
          </div>
          <div>
            <span class="kicker">用时</span>
            <strong class="mono">{{ formatDuration(result.durationMs) }}</strong>
          </div>
        </div>
      </section>

      <section class="result__actions">
        <BaseButton size="lg" @click="restart">再来一轮</BaseButton>
        <BaseButton v-if="wrongQuestions.length > 0" variant="secondary" size="lg" @click="practiceWrong">
          只练错题（{{ wrongQuestions.length }}）
        </BaseButton>
        <RouterLink class="result__link" to="/">回首页</RouterLink>
      </section>

      <section v-if="wrongQuestions.length > 0" class="wrong-list">
        <div class="wrong-list__head">
          <h2>本轮错题</h2>
          <span class="mono">{{ wrongQuestions.length }} 道</span>
        </div>
        <ol>
          <li v-for="(question, index) in wrongQuestions" :key="question.id" class="wrong-item surface">
            <span class="wrong-item__index mono">{{ String(index + 1).padStart(2, '0') }}</span>
            <div>
              <p class="wrong-item__meta">
                <span>{{ categoryName(question.category) }}</span>
                <span class="mono">{{ question.source.label }}</span>
              </p>
              <p class="wrong-item__stem">{{ question.stemText }}</p>
            </div>
          </li>
        </ol>
      </section>

      <section v-else class="perfect surface">
        <span class="mono">PERFECT</span>
        <h2>这一轮全对。</h2>
        <p>换一个范围继续，或者去统计页看看累计正确率。</p>
      </section>
    </template>
  </div>
</template>

<style scoped>
.result {
  position: relative;
  max-width: 880px;
  padding-block: 48px 24px;
}

.confetti-layer {
  position: fixed;
  inset: 0;
  z-index: 60;
  overflow: hidden;
  pointer-events: none;
}

.confetti-layer :deep(.confetti) {
  position: absolute;
  top: 26%;
  border-radius: 1px;
  will-change: transform, opacity;
}

.result__head {
  text-align: center;
}

.result__head h1 {
  margin-top: 12px;
  font-size: clamp(32px, 5vw, 48px);
  letter-spacing: -0.03em;
}

.result__head > p:last-child {
  margin-top: 10px;
  color: var(--muted);
  font-size: 12px;
}

.score {
  display: flex;
  align-items: center;
  gap: 40px;
  margin-top: 32px;
  padding: 30px 34px;
}

.score__ring {
  position: relative;
  display: grid;
  place-items: center;
  flex-shrink: 0;
}

.score__center {
  position: absolute;
  display: grid;
  justify-items: center;
  gap: 2px;
}

.score__center strong {
  color: var(--text);
  font-size: 34px;
  font-weight: 500;
  line-height: 1;
}

.score__center small {
  color: var(--muted);
  font-size: 13px;
}

.score__stats {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 22px 48px;
  flex: 1;
}

.score__stats div {
  display: grid;
  gap: 4px;
}

.score__stats strong {
  font-size: 22px;
  font-weight: 500;
}

.score__good {
  color: var(--correct);
}

.score__bad {
  color: var(--wrong);
}

.result__actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 10px;
  margin-top: 22px;
}

.result__link {
  padding: 10px 14px;
  color: var(--muted);
  font-size: 12px;
}

.result__link:hover {
  color: var(--text);
}

.wrong-list {
  margin-top: 48px;
}

.wrong-list__head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 12px;
}

.wrong-list__head h2 {
  font-size: 17px;
}

.wrong-list__head span {
  color: var(--faint);
  font-size: 11px;
}

.wrong-list ol {
  display: grid;
  gap: 10px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.wrong-item {
  display: grid;
  grid-template-columns: 26px 1fr;
  gap: 12px;
  padding: 16px 18px;
}

.wrong-item__index {
  color: var(--faint);
  font-size: 10px;
}

.wrong-item__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  color: var(--faint);
  font-size: 10px;
}

.wrong-item__meta .mono {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.wrong-item__stem {
  margin-top: 5px;
  color: var(--text-soft);
  font-size: 13px;
  line-height: 1.6;
}

.perfect {
  display: grid;
  justify-items: center;
  gap: 6px;
  margin-top: 40px;
  padding: 40px;
  text-align: center;
}

.perfect > span {
  color: var(--accent);
  font-size: 10px;
  letter-spacing: 0.18em;
}

.perfect h2 {
  font-size: 20px;
}

.perfect p {
  color: var(--muted);
  font-size: 12px;
}

.result__empty {
  display: grid;
  justify-items: center;
  gap: 16px;
  padding-block: 80px;
}

.result__home {
  color: var(--accent);
  font-size: 13px;
}

@media (max-width: 640px) {
  .score {
    flex-direction: column;
    gap: 24px;
    padding: 24px;
  }

  .score__stats {
    width: 100%;
    gap: 16px 24px;
  }
}
</style>
