import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'

import { randomId } from '@/shared/lib/random'
import { isRecord, readStored, writeStored } from '@/shared/lib/storage'
import type { FeedbackEntry } from '@/shared/types'

const STORAGE_KEY = 'bt.feedback.v1'

interface FeedbackState {
  version: 1
  items: FeedbackEntry[]
}

function isFeedbackEntry(value: unknown): value is FeedbackEntry {
  if (!isRecord(value)) {
    return false
  }
  return (
    typeof value.id === 'string' &&
    typeof value.questionId === 'string' &&
    typeof value.category === 'string' &&
    typeof value.message === 'string' &&
    typeof value.createdAt === 'number'
  )
}

function isFeedbackState(value: unknown): value is FeedbackState {
  return (
    isRecord(value) &&
    value.version === 1 &&
    Array.isArray(value.items) &&
    value.items.every(isFeedbackEntry)
  )
}

export const useFeedbackStore = defineStore('feedback', () => {
  const state = ref<FeedbackState>(
    readStored<FeedbackState>(STORAGE_KEY, { version: 1, items: [] }, isFeedbackState),
  )

  watch(
    state,
    (value) => {
      writeStored(STORAGE_KEY, value)
    },
    { deep: true },
  )

  const items = computed(() => [...state.value.items].sort((left, right) => right.createdAt - left.createdAt))

  function add(questionId: string, category: string, message: string): void {
    state.value.items.unshift({
      id: randomId(),
      questionId,
      category,
      message: message.trim(),
      createdAt: Date.now(),
    })
    if (state.value.items.length > 200) {
      state.value.items = state.value.items.slice(0, 200)
    }
  }

  function remove(id: string): void {
    state.value.items = state.value.items.filter((item) => item.id !== id)
  }

  function clear(): void {
    state.value = { version: 1, items: [] }
  }

  function exportFeedback(): {
    app: string
    version: number
    exportedAt: string
    items: FeedbackEntry[]
  } {
    return {
      app: 'bagu-training-ground-feedback',
      version: 1,
      exportedAt: new Date().toISOString(),
      items: JSON.parse(JSON.stringify(state.value.items)) as FeedbackEntry[],
    }
  }

  return { state, items, add, remove, clear, exportFeedback }
})
