<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'

import BaseButton from '@/shared/components/BaseButton.vue'
import EmptyState from '@/shared/components/EmptyState.vue'
import SourceLabel from '@/shared/components/SourceLabel.vue'
import { loadHandwritten } from '@/data/question.repository'
import type { HandwrittenItem } from '@/shared/types'
import { useHandwrittenStore } from '@/stores/handwritten'

const route = useRoute()
const router = useRouter()
const handwrittenStore = useHandwrittenStore()

const item = ref<HandwrittenItem | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)

const itemId = computed(() => String(route.params.id ?? ''))
const isRead = computed(() => (item.value ? handwrittenStore.isRead(item.value.id) : false))

onMounted(async () => {
  try {
    const items = await loadHandwritten()
    item.value = items.find((entry) => entry.id === itemId.value) ?? null
  } catch (reason) {
    error.value = reason instanceof Error ? reason.message : '手写题加载失败'
  } finally {
    loading.value = false
  }
})

function toggleRead(): void {
  if (item.value) {
    handwrittenStore.toggleRead(item.value.id)
  }
}
</script>

<template>
  <div class="handwritten-detail container-page">
    <button class="back" type="button" @click="router.push('/handwritten')">← 手写题列表</button>

    <div v-if="loading" class="state surface">正在加载…</div>
    <div v-else-if="error" class="state surface" role="alert">{{ error }}</div>
    <div v-else-if="!item" class="state surface">
      <EmptyState title="没有找到这道手写题" description="可能题库已更新，回列表重新选择。" action-label="回列表" @action="router.push('/handwritten')" />
    </div>
    <template v-else>
      <header class="detail-head">
        <div>
          <p class="kicker">HANDWRITTEN / {{ String(item.order).padStart(2, '0') }}</p>
          <h1>{{ item.title }}</h1>
          <SourceLabel :source="item.source" />
        </div>
        <BaseButton :variant="isRead ? 'secondary' : 'primary'" size="sm" @click="toggleRead">
          {{ isRead ? '取消已读' : '标记已读' }}
        </BaseButton>
      </header>

      <section class="block surface">
        <p class="kicker">QUESTION</p>
        <div class="prose" v-html="item.questionHtml" />
      </section>

      <section class="block surface">
        <p class="kicker">ANSWER / 原文答案</p>
        <div class="prose" v-html="item.answerHtml" />
      </section>

      <p class="detail-foot">
        阅读模式不计入选择题进度。想刷四选一，请回
        <RouterLink to="/frontend">前端题库</RouterLink>。
      </p>
    </template>
  </div>
</template>

<style scoped>
.handwritten-detail {
  max-width: 900px;
  padding-block: 32px 24px;
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

.detail-head {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 24px;
  margin-top: 26px;
}

.detail-head h1 {
  margin-block: 12px 8px;
  font-size: clamp(24px, 4vw, 38px);
  letter-spacing: -0.02em;
}

.block {
  margin-top: 16px;
  padding: clamp(20px, 3vw, 30px);
}

.block > .kicker {
  margin-bottom: 14px;
}

.prose {
  color: var(--text-soft);
  font-size: 14px;
  line-height: 1.8;
  overflow-wrap: anywhere;
}

.prose :deep(p) {
  margin-block: 10px;
}

.prose :deep(h1),
.prose :deep(h2),
.prose :deep(h3),
.prose :deep(h4) {
  margin-block: 20px 8px;
  color: var(--text);
  font-size: 15px;
}

.prose :deep(ul),
.prose :deep(ol) {
  margin-block: 10px;
  padding-left: 22px;
}

.prose :deep(code) {
  padding: 1px 5px;
  border-radius: 4px;
  background: var(--elevated);
  font-family: var(--font-mono);
  font-size: 0.85em;
}

.prose :deep(pre) {
  margin-block: 14px;
  padding: 14px 16px;
  overflow-x: auto;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: #060a0c;
  font-size: 12px;
  line-height: 1.65;
}

.prose :deep(pre code) {
  padding: 0;
  background: transparent;
  font-size: inherit;
}

.prose :deep(blockquote) {
  margin-block: 12px;
  padding: 8px 14px;
  border-left: 2px solid var(--accent);
  background: color-mix(in srgb, var(--accent) 5%, transparent);
  color: var(--muted);
}

.prose :deep(table) {
  width: 100%;
  margin-block: 14px;
  border-collapse: collapse;
  font-size: 12px;
}

.prose :deep(th),
.prose :deep(td) {
  padding: 7px 9px;
  border: 1px solid var(--border);
  text-align: left;
}

.state {
  margin-top: 28px;
  padding: 32px;
  color: var(--muted);
  text-align: center;
  font-size: 13px;
}

.detail-foot {
  margin-top: 22px;
  color: var(--faint);
  font-size: 11px;
}

.detail-foot a {
  color: var(--accent);
}

@media (max-width: 640px) {
  .detail-head {
    align-items: start;
    flex-direction: column;
  }
}
</style>
