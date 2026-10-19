import { usePreferredDark, usePreferredReducedMotion } from '@vueuse/core'
import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'

import { readStored, writeStored } from '@/shared/lib/storage'
import type { SettingsState, ThemeMode } from '@/shared/types'
import { createDefaultSettings } from '@/shared/types'

const STORAGE_KEY = 'bt.settings.v1'

function isSettingsState(value: unknown): value is SettingsState {
  if (typeof value !== 'object' || value === null) {
    return false
  }
  const candidate = value as Partial<SettingsState>
  return (
    candidate.version === 1 &&
    (candidate.theme === 'dark' || candidate.theme === 'light' || candidate.theme === 'system') &&
    typeof candidate.reducedMotion === 'boolean'
  )
}

export const useSettingsStore = defineStore('settings', () => {
  const state = ref<SettingsState>(readStored(STORAGE_KEY, createDefaultSettings(), isSettingsState))
  const systemDark = usePreferredDark()
  const systemReduced = usePreferredReducedMotion()

  const effectiveTheme = computed<'dark' | 'light'>(() =>
    state.value.theme === 'system' ? (systemDark.value ? 'dark' : 'light') : state.value.theme,
  )

  const prefersReducedMotion = computed(
    () => state.value.reducedMotion || systemReduced.value === 'reduce',
  )

  watch(
    state,
    (value) => {
      writeStored(STORAGE_KEY, value)
    },
    { deep: true },
  )

  watch(
    effectiveTheme,
    (theme) => {
      document.documentElement.dataset.theme = theme
    },
    { immediate: true },
  )

  function setTheme(theme: ThemeMode): void {
    state.value.theme = theme
  }

  function setReducedMotion(value: boolean): void {
    state.value.reducedMotion = value
  }

  function resetSettings(): void {
    state.value = createDefaultSettings()
  }

  return {
    state,
    effectiveTheme,
    prefersReducedMotion,
    setTheme,
    setReducedMotion,
    resetSettings,
  }
})
