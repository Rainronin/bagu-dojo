<script setup lang="ts">
import type { SourceRef } from '@/shared/types'

defineProps<{ source: SourceRef }>()
</script>

<template>
  <span class="source-label">
    <span class="source-label__kind mono">{{ source.kind === 'pdf' ? 'PDF' : 'MD' }}</span>
    <span>{{ source.label }}</span>
  </span>
</template>

<style scoped>
.source-label {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  color: var(--faint);
  font-size: 11px;
}

.source-label__kind {
  padding: 1px 5px;
  border: 1px solid var(--border);
  border-radius: 4px;
  color: var(--muted);
  font-size: 8px;
  letter-spacing: 0.08em;
}
</style>
