<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'

import EmptyState from '@/shared/components/EmptyState.vue'
import SourceLabel from '@/shared/components/SourceLabel.vue'
import { loadQuestionsForCategories } from '@/data/question.repository'
import { formatDate } from '@/shared/lib/date'
import { questionCategoryFromId } from '@/shared/lib/questionId'
import type { Question } from '@/shared/types'
import { useCatalogStore } from '@/stores/catalog'
import { useProgressStore } from '@/stores/progress'

const catalogStore = useCatalogStore()
const progressStore = useProgressStore()

const questions = ref<Question[]>([])
const loading = ref(false)
const error = ref<string | null>(null)
const activeCategory = ref<string | 'all'>('all')

const wrongIds = computed(() => progressStore.wrongQuestionIds)
const wrongSet = computed(() => new Set(wrongIds.value))

const categoriesWithWrong = computed(() => {
  const map = new Map<string, number>()
  for (const id of wrongIds.value) {
    const slug = questionCategoryFromId(id)
    if (slug) {
      map.set(slug, (map.get(slug) ?? 0) + 1)
    }
  }
  return catalogStore.categories
    .filter((category) => map.has(category.slug))
    .map((category) => ({ ...category, wrongCount: map.get(category.slug) ?? 0 }))
})

const filtered = computed(() => {
  const list = questions.value.filter(
    (question) =>
      wrongSet.value.has(question.id) &&
      (activeCategory.value === 'all' || question.category === activeCategory.value),
  )
  return list.sort((left, right) => {
    const leftProgress = progressStore.getQuestionProgress(left.id)
    const rightProgress = progressStore.getQuestionProgress(right.id)
    return (rightProgress?.lastAt ?? 0) - (leftProgress?.lastAt ?? 0)
  })
})

const missingData = computed(
  () => wrongIds.value.length > 0 && questions.value.length < wrongIds.value.length,
)

onMounted(async () => {
  void catalogStore.ensureCatalog().catch(() => undefined)
  await loadWrongQuestions()
})

async function loadWrongQuestions(): Promise<void> {
  if (wrongIds.value.length === 0) {
    return
  }
  loading.value = true
  error.value = null
  try {
    const slugs = [
      ...new Set(
        wrongIds.value.map(questionCategoryFromId).filter((slug): slug is string => Boolean(slug)),
      ),
    ]
    const loaded = await loadQuestionsForCategories(slugs)
    questions.value = loaded.filter((question) => wrongSet.value.has(question.id))
  } catch (reason) {
    error.value = reason instanceof Error ? reason.message : '错题数据加载失败'
  } finally {
    loading.value = false
  }
}

function categoryName(slug: string): string {
  return catalogStore.categoryBySlug.get(slug)?.name ?? slug
}

function wrongCount(questionId: string): number {
  return progressStore.getQuestionProgress(questionId)?.wrong ?? 0
}

function lastAt(questionId: string): string {
  const timestamp = progressStore.getQuestionProgress(questionId)?.lastAt
  return timestamp ? `${formatDate(timestamp)}` : '—'
}

function remove(questionId: string): void {
  progressStore.removeFromWrongBook(questionId)
}
</script>

<template>
  <div class="wrong container-page">
    <header class="wrong__head">
      <div>
        <p class="kicker">WRONG BOOK / {{ wrongIds.length }}</p>
        <h1>错题本</h1>
        <p>最近一次答错的题会留在这里。连续答对 2 次自动移出，也可以手动移除。</p>
      </div>
      <RouterLink v-if="wrongIds.length > 0" class="start" to="/practice/wrong">
        开始重练 <span aria-hidden="true">→</span>
      </RouterLink>
    </header>

    <div v-if="wrongIds.length === 0" class="wrong__empty">
      <EmptyState
        title="错题本是空的"
        description="练习中答错的题会自动收进来。连续答对 2 次后会移出。"
        action-label="去前端题库"
        @action="$router.push('/frontend')"
      />
    </div>

    <template v-else>
      <div class="filters" role="tablist" aria-label="按分类筛选">
        <button
          type="button"
          class="filter"
          :class="{ 'filter--active': activeCategory === 'all' }"
          @click="activeCategory = 'all'"
        >
          全部 <span class="mono">{{ wrongIds.length }}</span>
        </button>
        <button
          v-for="category in categoriesWithWrong"
          :key="category.slug"
          type="button"
          class="filter"
          :class="{ 'filter--active': activeCategory === category.slug }"
          @click="activeCategory = category.slug"
        >
          {{ category.name }} <span class="mono">{{ category.wrongCount }}</span>
        </button>
      </div>

      <div v-if="loading" class="wrong__state surface">正在加载错题…</div>
      <div v-else-if="error" class="wrong__state surface" role="alert">
        {{ error }}
        <button type="button" @click="loadWrongQuestions">重试</button>
      </div>
      <div v-else-if="filtered.length === 0" class="wrong__state surface">
        这个分类下没有可显示的错题。
      </div>
      <ol v-else class="wrong-list">
        <li v-for="question in filtered" :key="question.id" class="wrong-item surface">
          <div class="wrong-item__top">
            <span class="chip mono">{{ categoryName(question.category) }}</span>
            <span class="wrong-item__count mono">错 {{ wrongCount(question.id) }} 次 · {{ lastAt(question.id) }}</span>
          </div>
          <p class="wrong-item__stem">{{ question.stemText }}</p>
          <div class="wrong-item__foot">
            <SourceLabel :source="question.source" />
            <button class="remove" type="button" @click="remove(question.id)">移出错题本</button>
          </div>
        </li>
      </ol>

      <p v-if="missingData" class="wrong__warn">
        有 {{ wrongIds.length - filtered.length }} 道错题的数据暂未加载，可能是题库批次还没生成。
      </p>
    </template>
  </div>
</template>

<style scoped>
.wrong {
  padding-block: 44px 24px;
}

.wrong__head {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 24px;
}

.wrong__head h1 {
  margin-top: 12px;
  font-size: clamp(36px, 5vw, 56px);
  letter-spacing: -0.04em;
}

.wrong__head > div > p:last-child {
  max-width: 64ch;
  margin-top: 12px;
  color: var(--muted);
  font-size: 13px;
}

.start {
  flex-shrink: 0;
  padding: 11px 16px;
  border-radius: 9px;
  background: var(--accent);
  color: #04110d;
  font-size: 13px;
  font-weight: 550;
}

.wrong__empty {
  margin-top: 36px;
}

.filters {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
  margin-top: 28px;
  padding-bottom: 22px;
  border-bottom: 1px solid var(--border);
}

.filter {
  padding: 6px 10px;
  border: 1px solid var(--border);
  border-radius: 7px;
  background: transparent;
  color: var(--muted);
  font-size: 11px;
}

.filter:hover {
  border-color: var(--border-strong);
  color: var(--text);
}

.filter--active {
  border-color: color-mix(in srgb, var(--accent) 40%, var(--border));
  background: color-mix(in srgb, var(--accent) 8%, transparent);
  color: var(--accent);
}

.filter .mono {
  margin-left: 3px;
  font-size: 9px;
  opacity: 0.75;
}

.wrong__state {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 20px;
  padding: 24px;
  color: var(--muted);
  font-size: 13px;
}

.wrong__state button {
  border: 0;
  background: transparent;
  color: var(--accent);
  font-size: 12px;
}

.wrong-list {
  display: grid;
  gap: 10px;
  margin: 20px 0 0;
  padding: 0;
  list-style: none;
}

.wrong-item {
  padding: 16px 18px;
}

.wrong-item__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.chip {
  padding: 2px 6px;
  border: 1px solid var(--border);
  border-radius: 4px;
  color: var(--muted);
  font-size: 8px;
  letter-spacing: 0.08em;
}

.wrong-item__count {
  color: var(--faint);
  font-size: 10px;
}

.wrong-item__stem {
  margin-top: 10px;
  color: var(--text-soft);
  font-size: 14px;
  line-height: 1.65;
}

.wrong-item__foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid var(--border);
}

.remove {
  border: 0;
  background: transparent;
  color: var(--faint);
  font-size: 10px;
}

.remove:hover {
  color: var(--wrong);
}

.wrong__warn {
  margin-top: 16px;
  color: var(--warning);
  font-size: 11px;
}

@media (max-width: 640px) {
  .wrong {
    padding-top: 28px;
  }

  .wrong__head {
    display: grid;
    align-items: start;
  }

  .wrong-item__top {
    align-items: flex-start;
    flex-direction: column;
    gap: 6px;
  }
}
</style>
