<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink, useRoute } from 'vue-router'

import { useSettingsStore } from '@/stores/settings'

const settings = useSettingsStore()
const route = useRoute()

const navItems = [
  { label: '首页', to: '/' },
  { label: '前端', to: '/frontend' },
  { label: '后端', to: '/backend' },
  { label: '错题本', to: '/wrong' },
  { label: '统计', to: '/stats' },
]

const isDark = computed(() => settings.effectiveTheme === 'dark')

function toggleTheme(): void {
  settings.setTheme(isDark.value ? 'light' : 'dark')
}

function isActive(path: string): boolean {
  if (path === '/') {
    return route.path === '/'
  }
  return route.path.startsWith(path)
}
</script>

<template>
  <header class="site-header">
    <div class="container-page site-header__inner">
      <RouterLink class="brand" to="/" aria-label="八股训练场首页">
        <span class="brand__mark mono">八</span>
        <span class="brand__text">
          <strong>八股训练场</strong>
          <span class="kicker">TRAINING GROUND</span>
        </span>
      </RouterLink>

      <nav class="nav" aria-label="主导航">
        <RouterLink
          v-for="item in navItems"
          :key="item.to"
          :to="item.to"
          class="nav__link"
          :class="{ 'nav__link--active': isActive(item.to) }"
        >
          {{ item.label }}
        </RouterLink>
      </nav>

      <button
        class="theme-toggle"
        type="button"
        :aria-label="isDark ? '切换到浅色主题' : '切换到深色主题'"
        :title="isDark ? '切换到浅色主题' : '切换到深色主题'"
        @click="toggleTheme"
      >
        <svg v-if="isDark" viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
          <circle cx="12" cy="12" r="4.2" fill="none" stroke="currentColor" stroke-width="1.6" />
          <path
            d="M12 2.5v2.4M12 19.1v2.4M2.5 12h2.4M19.1 12h2.4M5.3 5.3l1.7 1.7M17 17l1.7 1.7M18.7 5.3 17 7M7 17l-1.7 1.7"
            fill="none"
            stroke="currentColor"
            stroke-width="1.6"
            stroke-linecap="round"
          />
        </svg>
        <svg v-else viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
          <path
            d="M20 15.2A8.4 8.4 0 0 1 8.8 4 8.5 8.5 0 1 0 20 15.2Z"
            fill="none"
            stroke="currentColor"
            stroke-width="1.6"
            stroke-linejoin="round"
          />
        </svg>
        <span class="theme-toggle__label">{{ isDark ? '浅色' : '深色' }}</span>
      </button>
    </div>
  </header>
</template>

<style scoped>
.site-header {
  position: sticky;
  top: 0;
  z-index: 30;
  border-bottom: 1px solid color-mix(in srgb, var(--border) 70%, transparent);
  background: color-mix(in srgb, var(--bg) 78%, transparent);
  backdrop-filter: blur(18px);
}

.site-header__inner {
  display: flex;
  align-items: center;
  gap: 28px;
  min-height: 66px;
}

.brand {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}

.brand__mark {
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  border: 1px solid var(--border-strong);
  border-radius: 10px;
  background: color-mix(in srgb, var(--accent) 9%, var(--surface));
  color: var(--accent);
  font-size: 15px;
  line-height: 1;
}

.brand__text {
  display: grid;
  gap: 1px;
}

.brand__text strong {
  font-size: 14px;
  letter-spacing: 0.02em;
}

.brand__text .kicker {
  font-size: 9px;
}

.nav {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-left: auto;
  overflow-x: auto;
  scrollbar-width: none;
}

.nav::-webkit-scrollbar {
  display: none;
}

.nav__link {
  padding: 7px 11px;
  border-radius: 8px;
  color: var(--muted);
  font-size: 13px;
  white-space: nowrap;
  transition:
    color var(--duration-hover) var(--ease-out),
    background var(--duration-hover) var(--ease-out);
}

.nav__link:hover {
  color: var(--text);
  background: color-mix(in srgb, var(--surface) 80%, transparent);
}

.nav__link--active {
  color: var(--text);
  background: color-mix(in srgb, var(--accent) 9%, var(--surface));
}

.theme-toggle {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
  padding: 7px 10px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: color-mix(in srgb, var(--surface) 70%, transparent);
  color: var(--muted);
  font-size: 12px;
  transition:
    color var(--duration-hover) var(--ease-out),
    border-color var(--duration-hover) var(--ease-out);
}

.theme-toggle:hover {
  color: var(--text);
  border-color: var(--border-strong);
}

@media (max-width: 720px) {
  .site-header__inner {
    flex-wrap: wrap;
    gap: 8px 12px;
    min-height: 58px;
    padding-block: 10px;
  }

  .brand {
    flex: 1 1 auto;
  }

  .brand__text .kicker {
    display: none;
  }

  .theme-toggle {
    margin-left: auto;
  }

  .theme-toggle__label {
    display: none;
  }

  .nav {
    order: 3;
    width: 100%;
    margin-left: 0;
    justify-content: space-between;
    overflow: visible;
  }

  .nav__link {
    padding: 6px 4px;
    font-size: 12px;
  }
}
</style>
