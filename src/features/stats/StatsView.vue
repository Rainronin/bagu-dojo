<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { RouterLink } from 'vue-router'

import { formatPercent, localDateKey } from '@/shared/lib/date'
import { questionCategoryFromId } from '@/shared/lib/questionId'
import { useCatalogStore } from '@/stores/catalog'
import { useProgressStore } from '@/stores/progress'

const catalogStore = useCatalogStore()
const progressStore = useProgressStore()

onMounted(() => {
  void catalogStore.ensureCatalog().catch(() => undefined)
})

const totalQuestions = computed(() => catalogStore.totalQuestions)
const answeredUnique = computed(() => progressStore.answeredQuestionIds.length)
const totalAnswered = computed(() => progressStore.totalAnswered)
const accuracy = computed(() => formatPercent(progressStore.accuracy))
const wrongCount = computed(() => progressStore.wrongQuestionIds.length)
const streak = computed(() => progressStore.streakDays())

const overallPercent = computed(() =>
  totalQuestions.value === 0 ? 0 : Math.round((answeredUnique.value / totalQuestions.value) * 100),
)

const days = computed(() => {
  const list: Array<{ key: string; label: string; answered: number; correct: number }> = []
  for (let offset = 6; offset >= 0; offset -= 1) {
    const date = new Date()
    date.setDate(date.getDate() - offset)
    const key = localDateKey(date)
    const stat = progressStore.state.daily[key] ?? { answered: 0, correct: 0 }
    list.push({
      key,
      label: new Intl.DateTimeFormat('zh-CN', { weekday: 'short' }).format(date),
      answered: stat.answered,
      correct: stat.correct,
    })
  }
  return list
})

const maxDayAnswered = computed(() => Math.max(1, ...days.value.map((day) => day.answered)))

const byCategory = computed(() => {
  const map = new Map<string, { seen: number; correct: number }>()
  for (const questionId of progressStore.answeredQuestionIds) {
    const slug = questionCategoryFromId(questionId)
    if (!slug) continue
    const progress = progressStore.state.questions[questionId]
    if (!progress) continue
    const current = map.get(slug) ?? { seen: 0, correct: 0 }
    current.seen += progress.seen
    current.correct += progress.correct
    map.set(slug, current)
  }
  return catalogStore.categories
    .map((category) => {
      const stat = map.get(category.slug) ?? { seen: 0, correct: 0 }
      return {
        ...category,
        seen: stat.seen,
        correct: stat.correct,
        accuracy: stat.seen === 0 ? 0 : stat.correct / stat.seen,
      }
    })
    .sort((left, right) => right.seen - left.seen || left.name.localeCompare(right.name, 'zh-CN'))
})

const hasData = computed(() => totalAnswered.value > 0)
</script>

<template>
  <div class="stats container-page">
    <header class="stats__head">
      <p class="kicker">STATS / LOCAL</p>
      <h1>训练统计</h1>
      <p>所有数据只保存在当前浏览器。换设备前可在设置页导出进度。</p>
    </header>

    <section class="summary" aria-label="总览">
      <div class="summary__item surface">
        <span class="kicker">累计答题</span>
        <strong class="mono">{{ totalAnswered }}</strong>
        <span>次作答</span>
      </div>
      <div class="summary__item surface">
        <span class="kicker">正确率</span>
        <strong class="mono">{{ accuracy }}</strong>
        <span>{{ progressStore.totalCorrect }} 次答对</span>
      </div>
      <div class="summary__item surface">
        <span class="kicker">连续天数</span>
        <strong class="mono">{{ streak }}<small>d</small></strong>
        <span>有练习即计入</span>
      </div>
      <div class="summary__item surface">
        <span class="kicker">错题</span>
        <strong class="mono">{{ wrongCount }}</strong>
        <span><RouterLink to="/wrong">去错题本 →</RouterLink></span>
      </div>
    </section>

    <section class="progress-card surface">
      <div class="progress-card__head">
        <span class="kicker">LIBRARY COVERAGE</span>
        <span class="mono">{{ answeredUnique }} / {{ totalQuestions }} 题</span>
      </div>
      <div class="progress-card__bar">
        <span :style="{ width: `${overallPercent}%` }" />
      </div>
      <p>{{ overallPercent }}% 的题目至少做过一次。题目重复作答会累计正确率，但“已做”按题目去重。</p>
    </section>

    <section class="activity surface">
      <div class="activity__head">
        <h2>近 7 日</h2>
        <span class="mono">{{ days.reduce((sum, day) => sum + day.answered, 0) }} 次</span>
      </div>
      <div class="activity__bars">
        <div v-for="day in days" :key="day.key" class="activity__day">
          <div class="activity__track">
            <span
              class="activity__fill"
              :style="{ height: `${Math.max(day.answered === 0 ? 2 : (day.answered / maxDayAnswered) * 100, 2)}%` }"
              :data-empty="day.answered === 0"
            />
          </div>
          <span class="activity__label">{{ day.label }}</span>
          <span class="activity__count mono">{{ day.answered }}</span>
        </div>
      </div>
    </section>

    <section class="breakdown">
      <div class="breakdown__head">
        <h2>分类进度</h2>
        <span class="mono">{{ catalogStore.categories.length }} 类</span>
      </div>
      <div class="breakdown__list">
        <div v-for="category in byCategory" :key="category.slug" class="category-row surface">
          <div class="category-row__main">
            <div class="category-row__title">
              <strong>{{ category.name }}</strong>
              <span v-if="category.domain === 'shared'" class="chip mono">SHARED</span>
              <span class="mono category-row__count">{{ category.seen }} / {{ category.questionCount }}</span>
            </div>
            <div class="category-row__bar">
              <span
                :style="{
                  width: `${category.questionCount === 0 ? 0 : Math.min(100, (category.seen / category.questionCount) * 100)}%`,
                }"
              />
            </div>
          </div>
          <div class="category-row__accuracy">
            <span class="mono">{{ category.seen === 0 ? '—' : formatPercent(category.accuracy) }}</span>
            <span class="kicker">ACC</span>
          </div>
        </div>
      </div>
    </section>

    <div v-if="!hasData" class="stats__empty">
      <p>还没有练习记录。先从前端或后端挑一类开始。</p>
      <RouterLink to="/frontend">去前端题库 →</RouterLink>
    </div>
  </div>
</template>

<style scoped>
.stats {
  padding-block: 44px 24px;
}

.stats__head h1 {
  margin-top: 12px;
  font-size: clamp(36px, 5vw, 56px);
  letter-spacing: -0.04em;
}

.stats__head > p:last-child {
  margin-top: 12px;
  color: var(--muted);
  font-size: 13px;
}

.summary {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  margin-top: 28px;
}

.summary__item {
  display: grid;
  gap: 4px;
  padding: 18px;
}

.summary__item strong {
  font-size: 28px;
  font-weight: 500;
  line-height: 1.1;
}

.summary__item strong small {
  color: var(--muted);
  font-size: 11px;
}

.summary__item > span:last-child {
  color: var(--faint);
  font-size: 10px;
}

.summary__item a {
  color: var(--accent);
}

.progress-card {
  margin-top: 12px;
  padding: 20px;
}

.progress-card__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.progress-card__head .mono {
  color: var(--muted);
  font-size: 11px;
}

.progress-card__bar {
  height: 4px;
  overflow: hidden;
  border-radius: 999px;
  background: color-mix(in srgb, var(--border) 90%, transparent);
}

.progress-card__bar span {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, var(--accent), var(--accent-2));
}

.progress-card p {
  margin-top: 10px;
  color: var(--faint);
  font-size: 11px;
}

.activity {
  margin-top: 12px;
  padding: 20px;
}

.activity__head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
}

.activity__head h2 {
  font-size: 16px;
}

.activity__head .mono {
  color: var(--faint);
  font-size: 11px;
}

.activity__bars {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 14px;
  height: 160px;
  margin-top: 20px;
}

.activity__day {
  display: grid;
  grid-template-rows: 1fr auto auto;
  justify-items: center;
  gap: 5px;
}

.activity__track {
  display: flex;
  align-items: end;
  width: 100%;
  max-width: 42px;
  height: 100%;
  border-bottom: 1px solid var(--border);
}

.activity__fill {
  width: 100%;
  border-radius: 5px 5px 1px 1px;
  background: linear-gradient(180deg, var(--accent), color-mix(in srgb, var(--accent) 30%, transparent));
  transition: height var(--duration-scene) var(--ease-out);
}

.activity__fill[data-empty='true'] {
  background: color-mix(in srgb, var(--border) 100%, transparent);
}

.activity__label,
.activity__count {
  color: var(--faint);
  font-size: 9px;
}

.breakdown {
  margin-top: 36px;
}

.breakdown__head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 12px;
}

.breakdown__head h2 {
  font-size: 16px;
}

.breakdown__head .mono {
  color: var(--faint);
  font-size: 10px;
}

.breakdown__list {
  display: grid;
  gap: 8px;
}

.category-row {
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 13px 16px;
}

.category-row__main {
  flex: 1;
  min-width: 0;
}

.category-row__title {
  display: flex;
  align-items: center;
  gap: 8px;
}

.category-row__title strong {
  font-size: 13px;
  font-weight: 550;
}

.chip {
  padding: 1px 5px;
  border: 1px solid color-mix(in srgb, var(--accent-2) 30%, var(--border));
  border-radius: 4px;
  color: var(--accent-2);
  font-size: 7px;
  letter-spacing: 0.1em;
}

.category-row__count {
  margin-left: auto;
  color: var(--faint);
  font-size: 10px;
}

.category-row__bar {
  height: 3px;
  margin-top: 8px;
  overflow: hidden;
  border-radius: 999px;
  background: color-mix(in srgb, var(--border) 90%, transparent);
}

.category-row__bar span {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: var(--accent);
}

.category-row__accuracy {
  display: grid;
  justify-items: end;
  gap: 2px;
  min-width: 48px;
}

.category-row__accuracy .mono {
  color: var(--text-soft);
  font-size: 12px;
}

.category-row__accuracy .kicker {
  font-size: 8px;
}

.stats__empty {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 36px;
  padding: 18px 20px;
  border: 1px dashed var(--border);
  border-radius: var(--radius-md);
  color: var(--muted);
  font-size: 12px;
}

.stats__empty a {
  color: var(--accent);
}

@media (max-width: 900px) {
  .summary {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 640px) {
  .stats {
    padding-top: 28px;
  }

  .activity__bars {
    gap: 8px;
  }

  .category-row {
    padding: 12px;
  }
}
</style>
