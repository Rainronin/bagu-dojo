<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'

import EmptyState from '@/shared/components/EmptyState.vue'
import SourceLabel from '@/shared/components/SourceLabel.vue'
import { loadHandwritten } from '@/data/question.repository'
import type { HandwrittenItem } from '@/shared/types'
import { useHandwrittenStore } from '@/stores/handwritten'

const handwrittenStore = useHandwrittenStore()
const items = ref<HandwrittenItem[]>([])
const loading = ref(false)
const error = ref<string | null>(null)

const readCount = computed(() => handwrittenStore.readCount)
const total = computed(() => items.value.length)

onMounted(async () => {
  loading.value = true
  error.value = null
  try {
    items.value = await loadHandwritten()
  } catch (reason) {
    error.value = reason instanceof Error ? reason.message : '手写题加载失败'
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="handwritten container-page">
    <header class="handwritten__head">
      <div>
        <p class="kicker">HANDWRITTEN / 50</p>
        <h1>手写题阅读</h1>
        <p>
          50 道 JS 手写题，保留题库原题与答案。阅读模式不计入选择题进度，
          适合在刷题之外过一遍实现思路。
        </p>
      </div>
      <div class="handwritten__stat">
        <span class="kicker">READ</span>
        <strong class="mono">{{ readCount }}<small>/ {{ total || '—' }}</small></strong>
      </div>
    </header>

    <div v-if="loading" class="handwritten__state surface">正在加载手写题…</div>
    <div v-else-if="error" class="handwritten__state surface" role="alert">
      {{ error }}
      <RouterLink to="/">回首页</RouterLink>
    </div>
    <div v-else-if="items.length === 0" class="handwritten__empty">
      <EmptyState
        title="手写题还没生成"
        description="运行题库抽取与数据构建后，这里会出现 50 道 JS 手写题。"
        action-label="回首页"
        @action="$router.push('/')"
      />
    </div>
    <ol v-else class="handwritten-list">
      <li v-for="item in items" :key="item.id">
        <RouterLink class="handwritten-item surface" :to="`/handwritten/${item.id}`">
          <span class="handwritten-item__order mono">{{ String(item.order).padStart(2, '0') }}</span>
          <div class="handwritten-item__body">
            <p class="handwritten-item__title">{{ item.title }}</p>
            <SourceLabel :source="item.source" />
          </div>
          <span
            class="handwritten-item__state mono"
            :class="{ 'handwritten-item__state--read': handwrittenStore.isRead(item.id) }"
          >
            {{ handwrittenStore.isRead(item.id) ? 'READ' : 'OPEN' }}
          </span>
        </RouterLink>
      </li>
    </ol>
  </div>
</template>

<style scoped>
.handwritten {
  padding-block: 44px 24px;
}

.handwritten__head {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 28px;
}

.handwritten__head h1 {
  margin-top: 12px;
  font-size: clamp(36px, 5vw, 56px);
  letter-spacing: -0.04em;
}

.handwritten__head > div > p:last-child {
  max-width: 64ch;
  margin-top: 12px;
  color: var(--muted);
  font-size: 13px;
}

.handwritten__stat {
  display: grid;
  justify-items: end;
  gap: 3px;
  flex-shrink: 0;
}

.handwritten__stat strong {
  font-size: 30px;
  font-weight: 500;
  line-height: 1;
}

.handwritten__stat small {
  color: var(--faint);
  font-size: 11px;
}

.handwritten__state {
  margin-top: 28px;
  padding: 24px;
  color: var(--muted);
  font-size: 13px;
}

.handwritten__state a {
  float: right;
  color: var(--accent);
}

.handwritten__empty {
  margin-top: 28px;
}

.handwritten-list {
  display: grid;
  gap: 8px;
  margin: 28px 0 0;
  padding: 0;
  list-style: none;
}

.handwritten-item {
  display: grid;
  grid-template-columns: 34px 1fr auto;
  align-items: center;
  gap: 14px;
  padding: 14px 18px;
  transition:
    border-color var(--duration-hover) var(--ease-out),
    transform var(--duration-hover) var(--ease-out);
}

.handwritten-item:hover {
  border-color: var(--border-strong);
  transform: translateX(2px);
}

.handwritten-item__order {
  color: var(--faint);
  font-size: 10px;
}

.handwritten-item__body {
  display: grid;
  gap: 4px;
  min-width: 0;
}

.handwritten-item__title {
  color: var(--text-soft);
  font-size: 13px;
  line-height: 1.55;
}

.handwritten-item__state {
  color: var(--faint);
  font-size: 8px;
  letter-spacing: 0.12em;
}

.handwritten-item__state--read {
  color: var(--correct);
}

@media (max-width: 640px) {
  .handwritten {
    padding-top: 28px;
  }

  .handwritten__head {
    display: grid;
    align-items: start;
  }

  .handwritten__stat {
    justify-items: start;
  }
}
</style>
