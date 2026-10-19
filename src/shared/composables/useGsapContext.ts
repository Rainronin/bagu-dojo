import gsap from 'gsap'
import { onBeforeUnmount, onMounted, type Ref } from 'vue'

import { useSettingsStore } from '@/stores/settings'

/**
 * Mount-scoped GSAP context. Automatically skips animation when the user
 * prefers reduced motion and reverts all tweens on unmount.
 */
export function useGsapContext(
  scope: Ref<HTMLElement | null>,
  setup: (context: gsap.Context) => void,
): void {
  let context: gsap.Context | null = null

  onMounted(() => {
    const settings = useSettingsStore()
    if (settings.prefersReducedMotion || !scope.value) {
      return
    }
    context = gsap.context((self) => setup(self), scope.value)
  })

  onBeforeUnmount(() => {
    context?.revert()
    context = null
  })
}
