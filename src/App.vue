<script setup lang="ts">
import { RouterView } from 'vue-router'

import AppFooter from '@/shared/components/AppFooter.vue'
import AppHeader from '@/shared/components/AppHeader.vue'
</script>

<template>
  <div class="app-shell">
    <div class="app-shell__glow" aria-hidden="true" />
    <div class="app-shell__grid" aria-hidden="true" />
    <AppHeader />
    <main class="app-shell__main">
      <RouterView v-slot="{ Component }">
        <Transition name="route" mode="out-in">
          <component :is="Component" />
        </Transition>
      </RouterView>
    </main>
    <AppFooter />
  </div>
</template>

<style scoped>
.app-shell {
  position: relative;
  display: flex;
  flex-direction: column;
  min-height: 100dvh;
  overflow-x: clip;
  isolation: isolate;
}

.app-shell__main {
  flex: 1;
}

.app-shell__glow {
  position: fixed;
  inset: -30% -10% auto;
  height: 70vh;
  z-index: -2;
  background:
    radial-gradient(42% 55% at 22% 18%, color-mix(in srgb, var(--accent) 16%, transparent), transparent 70%),
    radial-gradient(38% 52% at 78% 8%, color-mix(in srgb, var(--accent-2) 14%, transparent), transparent 72%);
  filter: blur(10px);
  pointer-events: none;
}

.app-shell__grid {
  position: fixed;
  inset: 0;
  z-index: -1;
  background-image:
    linear-gradient(to right, var(--grid-line) 1px, transparent 1px),
    linear-gradient(to bottom, var(--grid-line) 1px, transparent 1px);
  background-size: 72px 72px;
  mask-image: radial-gradient(ellipse 80% 60% at 50% 0%, black, transparent 78%);
  pointer-events: none;
}

.route-enter-active,
.route-leave-active {
  transition:
    opacity 220ms var(--ease-out),
    transform 220ms var(--ease-out);
}

.route-enter-from {
  opacity: 0;
  transform: translateY(10px);
}

.route-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}

@media (prefers-reduced-motion: reduce) {
  .route-enter-active,
  .route-leave-active {
    transition: opacity 120ms linear;
  }

  .route-enter-from,
  .route-leave-to {
    transform: none;
  }
}
</style>
