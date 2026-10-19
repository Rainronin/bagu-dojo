<script setup lang="ts">
import gsap from 'gsap'
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'

import { useGsapContext } from '@/shared/composables/useGsapContext'
import { formatPercent } from '@/shared/lib/date'
import { questionCategoryFromId } from '@/shared/lib/questionId'
import { useCatalogStore } from '@/stores/catalog'
import { usePracticeStore } from '@/stores/practice'
import { useProgressStore } from '@/stores/progress'

const catalogStore = useCatalogStore()
const progressStore = useProgressStore()
const practiceStore = usePracticeStore()

const homeEl = ref<HTMLElement | null>(null)

useGsapContext(homeEl, () => {
  const root = homeEl.value
  if (!root) {
    return
  }
  const heroItems = [...root.querySelectorAll<HTMLElement>('.hero__copy > *, .console')]
  const cards = [...root.querySelectorAll<HTMLElement>('.entry, .shortcut')]
  if (heroItems.length > 0) {
    gsap.from(heroItems, {
      y: 16,
      opacity: 0,
      duration: 0.55,
      stagger: 0.06,
      ease: 'power3.out',
    })
  }
  if (cards.length > 0) {
    gsap.from(cards, {
      y: 20,
      opacity: 0,
      duration: 0.5,
      stagger: 0.05,
      delay: 0.12,
      ease: 'power3.out',
    })
  }
})

onMounted(() => {
  void catalogStore.ensureCatalog().catch(() => undefined)
})

const totalQuestions = computed(() => catalogStore.totalQuestions || 0)
const answeredUnique = computed(() => progressStore.answeredQuestionIds.length)
const overallPercent = computed(() =>
  totalQuestions.value === 0 ? 0 : Math.round((answeredUnique.value / totalQuestions.value) * 100),
)
const accuracyLabel = computed(() => formatPercent(progressStore.accuracy))
const streak = computed(() => progressStore.streakDays())
const wrongCount = computed(() => progressStore.wrongQuestionIds.length)

const cards = computed(() => {
  const frontendTotal = catalogStore.domainQuestionCount('frontend')
  const backendTotal = catalogStore.domainQuestionCount('backend')
  return [
    {
      index: '01',
      title: '前端',
      subtitle: 'Vue / React / JavaScript / CSS',
      count: `${catalogStore.categorySlugsForDomain('frontend').length} 类 · ${frontendTotal} 题`,
      to: '/frontend',
      tone: 'mint',
    },
    {
      index: '02',
      title: '后端',
      subtitle: 'Java / Spring / MySQL / Redis',
      count: `${catalogStore.categorySlugsForDomain('backend').length} 类 · ${backendTotal} 题`,
      to: '/backend',
      tone: 'violet',
    },
    {
      index: '03',
      title: '全部随机',
      subtitle: '不分分类，混合抽取',
      count: `${totalQuestions.value} 题`,
      to: '/practice/all',
      tone: 'neutral',
    },
  ]
})

const answeredByCategory = computed(() => {
  const map = new Map<string, number>()
  for (const questionId of progressStore.answeredQuestionIds) {
    const category = questionCategoryFromId(questionId)
    if (category) {
      map.set(category, (map.get(category) ?? 0) + 1)
    }
  }
  return map
})

function categoryAnswered(slugs: string[]): number {
  return slugs.reduce((sum, slug) => sum + (answeredByCategory.value.get(slug) ?? 0), 0)
}

const frontendAnswered = computed(() => {
  const slugs = catalogStore.categorySlugsForDomain('frontend')
  return categoryAnswered(slugs)
})

const backendAnswered = computed(() => {
  const slugs = catalogStore.categorySlugsForDomain('backend')
  return categoryAnswered(slugs)
})

const frontendPercent = computed(() => {
  const total = catalogStore.domainQuestionCount('frontend')
  return total === 0 ? 0 : Math.round((frontendAnswered.value / total) * 100)
})

const backendPercent = computed(() => {
  const total = catalogStore.domainQuestionCount('backend')
  return total === 0 ? 0 : Math.round((backendAnswered.value / total) * 100)
})

const continueTo = computed(() => {
  if (!practiceStore.hasSavedSession || !practiceStore.session) {
    return null
  }
  return `/practice/${practiceStore.session.scope}?resume=1`
})

const continueLabel = computed(() => {
  if (!practiceStore.session) {
    return ''
  }
  return practiceStore.scopeLabel
})
</script>

<template>
  <div ref="homeEl" class="home container-page">
    <section class="hero">
      <div class="hero__copy">
        <p class="kicker">INTERVIEW DRILL / 2026</p>
        <h1>
          把八股，<br />
          练成<span class="hero__accent">肌肉记忆</span>。
        </h1>
        <p class="hero__lede">
          基于个人前后端题库的四选一练习场。随机抽题、即时判定、原文解析，
          用一轮一轮的重复把知识点压进长期记忆。
        </p>
        <div class="hero__actions">
          <RouterLink class="cta" to="/frontend">从前端开始 <span aria-hidden="true">↗</span></RouterLink>
          <RouterLink class="cta cta--ghost" to="/backend">进入后端</RouterLink>
        </div>
        <dl class="hero__metrics">
          <div>
            <dt class="kicker">SOURCE</dt>
            <dd class="mono">106 篇 / 11 类 PDF</dd>
          </div>
          <div>
            <dt class="kicker">QUESTIONS</dt>
            <dd class="mono">{{ totalQuestions || '—' }}</dd>
          </div>
          <div>
            <dt class="kicker">MODE</dt>
            <dd class="mono">RANDOM / NO REPEAT</dd>
          </div>
        </dl>
      </div>

      <aside class="console" aria-label="训练状态">
        <div class="console__head">
          <span class="kicker">YOUR TRAINING</span>
          <span class="console__id mono">LOCAL</span>
        </div>
        <div class="console__grid">
          <div>
            <span class="kicker">已答</span>
            <strong class="mono">{{ answeredUnique }}</strong>
          </div>
          <div>
            <span class="kicker">正确率</span>
            <strong class="mono">{{ accuracyLabel }}</strong>
          </div>
          <div>
            <span class="kicker">连续</span>
            <strong class="mono">{{ streak }}<small>d</small></strong>
          </div>
          <div>
            <span class="kicker">错题</span>
            <strong class="mono">{{ wrongCount }}</strong>
          </div>
        </div>
        <div class="console__bar" aria-hidden="true">
          <span :style="{ width: `${overallPercent}%` }" />
        </div>
        <div class="console__progress">
          <span>总进度</span>
          <span class="mono">{{ answeredUnique }} / {{ totalQuestions || '—' }}</span>
        </div>
        <RouterLink v-if="continueTo" class="console__continue" :to="continueTo">
          继续上次：{{ continueLabel }} <span aria-hidden="true">→</span>
        </RouterLink>
        <p v-else class="console__note">选一个入口开始。每次练习的题目顺序都会重新洗牌。</p>
      </aside>
    </section>

    <section class="entries" aria-label="练习入口">
      <RouterLink
        v-for="card in cards"
        :key="card.index"
        :to="card.to"
        class="entry surface"
        :data-tone="card.tone"
      >
        <div class="entry__top">
          <span class="entry__index mono">{{ card.index }}</span>
          <span class="entry__count mono">{{ card.count }}</span>
        </div>
        <h2>{{ card.title }}</h2>
        <p class="entry__subtitle">{{ card.subtitle }}</p>
        <div class="entry__foot">
          <span class="entry__pending">
            {{
              card.index === '01'
                ? `${frontendPercent}% 已做`
                : card.index === '02'
                  ? `${backendPercent}% 已做`
                  : '从这里开始'
            }}
          </span>
          <span class="entry__arrow" aria-hidden="true">↗</span>
        </div>
      </RouterLink>
    </section>

    <section class="shortcuts" aria-label="快捷入口">
      <RouterLink to="/wrong" class="shortcut surface">
        <span class="kicker">WRONG BOOK</span>
        <strong>错题本</strong>
        <span>{{ wrongCount }} 道待复习</span>
      </RouterLink>
      <RouterLink to="/stats" class="shortcut surface">
        <span class="kicker">STATS</span>
        <strong>训练统计</strong>
        <span>正确率、分类进度与连续天数</span>
      </RouterLink>
      <RouterLink to="/handwritten" class="shortcut surface">
        <span class="kicker">HANDWRITTEN</span>
        <strong>手写题阅读</strong>
        <span>50 道 JS 手写题，不计入选择题</span>
      </RouterLink>
    </section>

    <p v-if="catalogStore.error" class="home__error">
      题库入口暂未加载：{{ catalogStore.error }}。请确认 `public/data` 已生成。
    </p>
  </div>
</template>

<style scoped>
.home {
  padding-block: clamp(40px, 6vw, 76px) 24px;
}

.hero {
  display: grid;
  grid-template-columns: minmax(0, 1.16fr) minmax(320px, 0.84fr);
  gap: 64px;
  align-items: end;
}

.hero__copy h1 {
  margin-top: 18px;
  font-size: clamp(44px, 7vw, 86px);
  font-weight: 600;
  letter-spacing: -0.045em;
  line-height: 1.02;
}

.hero__accent {
  color: var(--accent);
}

.hero__lede {
  max-width: 56ch;
  margin-top: 24px;
  color: var(--muted);
  font-size: 16px;
}

.hero__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 30px;
}

.cta {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 44px;
  padding: 0 18px;
  border-radius: 10px;
  background: var(--accent);
  color: #04110d;
  font-size: 13px;
  font-weight: 550;
  transition:
    transform var(--duration-press) var(--ease-out),
    box-shadow var(--duration-hover) var(--ease-out);
}

.cta:hover {
  box-shadow: 0 0 28px color-mix(in srgb, var(--accent) 25%, transparent);
}

.cta--ghost {
  border: 1px solid var(--border-strong);
  background: transparent;
  color: var(--text);
}

.cta--ghost:hover {
  border-color: color-mix(in srgb, var(--accent) 45%, var(--border-strong));
  box-shadow: none;
}

.hero__metrics {
  display: flex;
  flex-wrap: wrap;
  gap: 18px 40px;
  margin-top: 38px;
}

.hero__metrics div {
  display: grid;
  gap: 6px;
}

.hero__metrics dd {
  margin: 0;
  color: var(--text-soft);
  font-size: 13px;
  letter-spacing: 0.02em;
}

.console {
  padding: 22px;
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  background:
    linear-gradient(180deg, color-mix(in srgb, var(--accent) 4%, transparent), transparent 42%),
    color-mix(in srgb, var(--surface) 88%, transparent);
  box-shadow: var(--shadow-surface);
}

.console__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--border);
}

.console__id {
  color: var(--faint);
  font-size: 10px;
  letter-spacing: 0.12em;
}

.console__grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
  padding-block: 18px;
}

.console__grid div {
  display: grid;
  gap: 4px;
}

.console__grid strong {
  font-size: 26px;
  font-weight: 500;
  line-height: 1.1;
}

.console__grid small {
  margin-left: 2px;
  color: var(--muted);
  font-size: 11px;
}

.console__bar {
  height: 3px;
  overflow: hidden;
  border-radius: 999px;
  background: color-mix(in srgb, var(--border) 90%, transparent);
}

.console__bar span {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, var(--accent), var(--accent-2));
  transition: width var(--duration-scene) var(--ease-out);
}

.console__progress {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 10px;
  color: var(--faint);
  font-size: 11px;
}

.console__continue {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-top: 18px;
  padding: 11px 13px;
  border: 1px solid color-mix(in srgb, var(--accent) 26%, var(--border));
  border-radius: 10px;
  background: color-mix(in srgb, var(--accent) 6%, transparent);
  color: var(--accent);
  font-size: 12px;
}

.console__note {
  margin-top: 16px;
  color: var(--muted);
  font-size: 12px;
}

.entries {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
  margin-top: 56px;
}

.entry {
  position: relative;
  display: flex;
  flex-direction: column;
  min-height: 216px;
  padding: 22px;
  transition:
    transform var(--duration-hover) var(--ease-out),
    border-color var(--duration-hover) var(--ease-out),
    box-shadow var(--duration-hover) var(--ease-out);
}

.entry:hover {
  transform: translateY(-3px);
  border-color: var(--border-strong);
  box-shadow: var(--shadow-surface), var(--shadow-glow);
}

.entry[data-tone='mint'] {
  background:
    radial-gradient(120% 80% at 0% 0%, color-mix(in srgb, var(--accent) 9%, transparent), transparent 60%),
    var(--surface);
}

.entry[data-tone='violet'] {
  background:
    radial-gradient(120% 80% at 0% 0%, color-mix(in srgb, var(--accent-2) 10%, transparent), transparent 60%),
    var(--surface);
}

.entry__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.entry__index {
  color: var(--faint);
  font-size: 12px;
  letter-spacing: 0.16em;
}

.entry__count {
  color: var(--muted);
  font-size: 10px;
  text-align: right;
}

.entry h2 {
  margin-top: auto;
  padding-top: 36px;
  font-size: 27px;
  letter-spacing: -0.02em;
}

.entry__subtitle {
  margin-top: 8px;
  color: var(--muted);
  font-size: 13px;
}

.entry__foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 20px;
  padding-top: 14px;
  border-top: 1px solid var(--border);
}

.entry__pending {
  color: var(--faint);
  font-size: 11px;
}

.entry__arrow {
  color: var(--muted);
  font-size: 16px;
  transition: transform var(--duration-hover) var(--ease-out);
}

.entry:hover .entry__arrow {
  transform: translate(2px, -2px);
  color: var(--text);
}

.shortcuts {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  margin-top: 16px;
}

.shortcut {
  display: grid;
  gap: 4px;
  padding: 16px 18px;
  transition:
    border-color var(--duration-hover) var(--ease-out),
    transform var(--duration-hover) var(--ease-out);
}

.shortcut:hover {
  border-color: var(--border-strong);
  transform: translateY(-2px);
}

.shortcut strong {
  font-size: 14px;
  font-weight: 550;
}

.shortcut > span:last-child {
  color: var(--muted);
  font-size: 11px;
}

.home__error {
  margin-top: 20px;
  color: var(--warning);
  font-size: 12px;
}

@media (max-width: 900px) {
  .hero {
    grid-template-columns: 1fr;
    gap: 36px;
    align-items: start;
  }

  .entries,
  .shortcuts {
    grid-template-columns: 1fr;
  }

  .entry {
    min-height: 180px;
  }
}

@media (max-width: 640px) {
  .hero__metrics {
    gap: 16px 24px;
  }

  .console {
    padding: 18px;
  }

  .entries {
    margin-top: 36px;
  }
}
</style>
