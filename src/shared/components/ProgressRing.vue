<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    value: number
    size?: number
    stroke?: number
    label?: string
  }>(),
  {
    size: 44,
    stroke: 4,
    label: '',
  },
)

const strokeUnits = computed(() => (props.stroke / props.size) * 100)
const radius = computed(() => 50 - strokeUnits.value / 2)
const circumference = computed(() => 2 * Math.PI * radius.value)
const normalized = computed(() => Math.min(100, Math.max(0, props.value)))
const dashOffset = computed(() => circumference.value * (1 - normalized.value / 100))
</script>

<template>
  <span class="progress-ring" :style="{ width: `${size}px`, height: `${size}px` }">
    <svg width="100%" height="100%" viewBox="0 0 100 100" aria-hidden="true">
      <circle
        cx="50"
        cy="50"
        :r="radius"
        fill="none"
        class="progress-ring__track"
        :stroke-width="strokeUnits"
      />
      <circle
        cx="50"
        cy="50"
        :r="radius"
        fill="none"
        class="progress-ring__value"
        :stroke-width="strokeUnits"
        :stroke-dasharray="circumference"
        :stroke-dashoffset="dashOffset"
        stroke-linecap="round"
        transform="rotate(-90 50 50)"
      />
    </svg>
    <span v-if="label" class="progress-ring__label mono">{{ label }}</span>
  </span>
</template>

<style scoped>
.progress-ring {
  position: relative;
  display: inline-grid;
  place-items: center;
  flex-shrink: 0;
}

.progress-ring svg {
  position: absolute;
  inset: 0;
}

.progress-ring__track {
  stroke: color-mix(in srgb, var(--border) 100%, transparent);
}

.progress-ring__value {
  stroke: var(--accent);
  transition: stroke-dashoffset var(--duration-scene) var(--ease-out);
}

.progress-ring__label {
  color: var(--muted);
  font-size: 9px;
  letter-spacing: 0.04em;
}
</style>
