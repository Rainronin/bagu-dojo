import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'

import { isRecord, readStored, writeStored } from '@/shared/lib/storage'

const STORAGE_KEY = 'bt.handwritten.v1'

interface HandwrittenState {
  version: 1
  readIds: string[]
}

function isState(value: unknown): value is HandwrittenState {
  return (
    isRecord(value) &&
    value.version === 1 &&
    Array.isArray(value.readIds) &&
    value.readIds.every((id) => typeof id === 'string')
  )
}

export const useHandwrittenStore = defineStore('handwritten', () => {
  const state = ref<HandwrittenState>(
    readStored<HandwrittenState>(STORAGE_KEY, { version: 1, readIds: [] }, isState),
  )

  watch(
    state,
    (value) => {
      writeStored(STORAGE_KEY, value)
    },
    { deep: true },
  )

  const readSet = computed(() => new Set(state.value.readIds))
  const readCount = computed(() => state.value.readIds.length)

  function isRead(id: string): boolean {
    return readSet.value.has(id)
  }

  function markRead(id: string): void {
    if (!readSet.value.has(id)) {
      state.value.readIds.push(id)
    }
  }

  function unmarkRead(id: string): void {
    state.value.readIds = state.value.readIds.filter((entry) => entry !== id)
  }

  function toggleRead(id: string): void {
    if (isRead(id)) {
      unmarkRead(id)
    } else {
      markRead(id)
    }
  }

  function reset(): void {
    state.value = { version: 1, readIds: [] }
  }

  return { state, readCount, isRead, markRead, unmarkRead, toggleRead, reset }
})
