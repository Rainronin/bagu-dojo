<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { RouterLink } from 'vue-router'

import ProgressRing from '@/shared/components/ProgressRing.vue'
import { questionCategoryFromId } from '@/shared/lib/questionId'
import type { Category } from '@/shared/types'
import { useCatalogStore } from '@/stores/catalog'
import { useProgressStore } from '@/stores/progress'

const props = defineProps<{ domainId: 'frontend' | 'backend' }>()

const catalogStore = useCatalogStore()
const progressStore = useProgressStore()

onMounted(() => {
  void catalogStore.ensureCatalog().catch(() => undefined)
})

const domain = computed(() => catalogStore.domain(props.domainId))
const groups = computed(() => domain.value?.groups ?? [])
const domainName = computed(() => (props.domainId === 'frontend' ? '前端题库' : '后端题库'))
const kicker = computed(() => (props.domainId === 'frontend' ? 'FRONTEND / DRILL' : 'BACKEND / DRILL'))
const total = computed(() => catalogStore.domainQuestionCount(props.domainId))

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

function answered(category: Category): number {
  return answeredByCategory.value.get(category.slug) ?? 0
}

function percent(category: Category): number {
  return category.questionCount === 0
    ? 0
    : Math.min(100, Math.round((answered(category) / category.questionCount) * 100))
}

const answeredTotal = computed(() => {
  const slugs = new Set(groups.value.flatMap((group) => group.categories.map((category) => category.slug)))
  return [...answeredByCategory.value.entries()]
    .filter(([slug]) => slugs.has(slug))
    .reduce((sum, [, count]) => sum + count, 0)
})

const domainPercent = computed(() => (total.value === 0 ? 0 : Math.round((answeredTotal.value / total.value) * 100)))
</script>

<template>
  <div class="domain container-page">
    <header class="domain-head">
      <div>
        <p class="kicker">{{ kicker }}</p>
        <h1>{{ domainName }}</h1>
        <p class="domain-head__lede">
          <template v-if="props.domainId === 'frontend'">
            JavaScript、TypeScript、Vue、React、HTML/CSS、浏览器、工程化与性能。
          </template>
          <template v-else>
            Java 基础、集合、并发、JVM、Spring、MySQL、Redis 与消息队列。
          </template>
        </p>
      </div>
      <div class="domain-head__stat">
        <span class="kicker">PROGRESS</span>
        <strong class="mono">{{ domainPercent }}%</strong>
        <span class="mono">{{ answeredTotal }} / {{ total }}</span>
      </div>
    </header>

    <div class="domain-actions">
      <RouterLink class="action" :to="`/practice/${domainId}`">综合练习 <span aria-hidden="true">→</span></RouterLink>
      <RouterLink class="action action--ghost" to="/practice/all">全部随机</RouterLink>
      <span class="domain-actions__hint">题目顺序每轮重新洗牌</span>
    </div>

    <div v-if="catalogStore.loading && !domain" class="loading-grid" aria-hidden="true">
      <span v-for="index in 6" :key="index" class="loading-card" />
    </div>

    <div v-else-if="catalogStore.error && !domain" class="domain-error">
      <p>题库入口加载失败：{{ catalogStore.error }}</p>
      <button class="retry" type="button" @click="catalogStore.retry()">重试</button>
    </div>

    <template v-else>
      <section v-for="group in groups" :key="group.key" class="group">
        <div class="group__head">
          <h2>{{ group.name }}</h2>
          <span v-if="group.shared" class="group__badge mono">SHARED</span>
          <span class="group__count mono">{{ group.categories.length }} 类</span>
        </div>
        <div class="category-grid">
          <RouterLink
            v-for="category in group.categories"
            :key="category.slug"
            :to="`/practice/${category.slug}`"
            class="category surface"
          >
            <div class="category__top">
              <ProgressRing :value="percent(category)" :size="38" :stroke="3.5" />
              <span class="category__count mono">{{ category.questionCount }} 题</span>
            </div>
            <h3>{{ category.name }}</h3>
            <p class="category__meta">
              <span>{{ answered(category) }} 已做</span>
              <span v-if="category.domain === 'shared'" class="category__shared">前后端共享</span>
            </p>
            <span class="category__arrow" aria-hidden="true">↗</span>
          </RouterLink>
        </div>
      </section>
    </template>
  </div>
</template>

<style scoped>
.domain {
  padding-block: 44px 12px;
}

.domain-head {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 28px;
}

.domain-head h1 {
  margin-top: 12px;
  font-size: clamp(38px, 5vw, 62px);
  letter-spacing: -0.04em;
}

.domain-head__lede {
  max-width: 62ch;
  margin-top: 14px;
  color: var(--muted);
  font-size: 14px;
}

.domain-head__stat {
  display: grid;
  justify-items: end;
  gap: 5px;
  flex-shrink: 0;
}

.domain-head__stat strong {
  color: var(--accent);
  font-size: 32px;
  font-weight: 500;
  line-height: 1;
}

.domain-head__stat > span:last-child {
  color: var(--faint);
  font-size: 11px;
}

.domain-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  margin-top: 28px;
  padding-bottom: 28px;
  border-bottom: 1px solid var(--border);
}

.action {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 40px;
  padding: 0 15px;
  border-radius: 9px;
  background: var(--accent);
  color: #04110d;
  font-size: 13px;
  font-weight: 550;
}

.action--ghost {
  border: 1px solid var(--border-strong);
  background: transparent;
  color: var(--text);
}

.domain-actions__hint {
  margin-left: auto;
  color: var(--faint);
  font-size: 11px;
}

.group {
  margin-top: 34px;
}

.group__head {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 14px;
}

.group__head h2 {
  font-size: 16px;
  font-weight: 550;
}

.group__badge {
  padding: 2px 6px;
  border: 1px solid color-mix(in srgb, var(--accent-2) 35%, var(--border));
  border-radius: 4px;
  color: var(--accent-2);
  font-size: 8px;
  letter-spacing: 0.12em;
}

.group__count {
  margin-left: auto;
  color: var(--faint);
  font-size: 10px;
}

.category-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.category {
  position: relative;
  display: grid;
  gap: 8px;
  padding: 18px;
  transition:
    transform var(--duration-hover) var(--ease-out),
    border-color var(--duration-hover) var(--ease-out),
    box-shadow var(--duration-hover) var(--ease-out);
}

.category:hover {
  transform: translateY(-2px);
  border-color: var(--border-strong);
  box-shadow: var(--shadow-surface), var(--shadow-glow);
}

.category__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.category__count {
  color: var(--faint);
  font-size: 10px;
}

.category h3 {
  margin-top: 10px;
  font-size: 17px;
  font-weight: 550;
}

.category__meta {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--muted);
  font-size: 11px;
}

.category__shared {
  color: var(--accent-2);
}

.category__arrow {
  position: absolute;
  right: 18px;
  bottom: 16px;
  color: var(--faint);
  font-size: 14px;
  transition: transform var(--duration-hover) var(--ease-out);
}

.category:hover .category__arrow {
  transform: translate(2px, -2px);
  color: var(--text);
}

.loading-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin-top: 34px;
}

.loading-card {
  height: 150px;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  background: linear-gradient(100deg, var(--surface) 20%, var(--elevated) 45%, var(--surface) 70%);
  background-size: 220% 100%;
  animation: shimmer 1.4s infinite linear;
}

@keyframes shimmer {
  to {
    background-position: -220% 0;
  }
}

.domain-error {
  display: grid;
  justify-items: start;
  gap: 12px;
  margin-top: 34px;
  padding: 24px;
  border: 1px solid color-mix(in srgb, var(--wrong) 30%, var(--border));
  border-radius: var(--radius-md);
  color: var(--muted);
  font-size: 13px;
}

.retry {
  padding: 8px 14px;
  border: 1px solid var(--border-strong);
  border-radius: 8px;
  background: var(--surface);
  color: var(--text);
  font-size: 12px;
}

@media (max-width: 900px) {
  .category-grid,
  .loading-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .domain-head {
    align-items: start;
  }
}

@media (max-width: 640px) {
  .domain {
    padding-top: 28px;
  }

  .domain-head {
    display: grid;
  }

  .domain-head__stat {
    justify-items: start;
  }

  .category-grid,
  .loading-grid {
    grid-template-columns: 1fr;
  }

  .domain-actions__hint {
    display: none;
  }
}
</style>
