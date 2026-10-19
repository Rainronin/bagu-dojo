<script setup lang="ts">
defineProps<{
  title?: string
  message: string
  retryLabel?: string
}>()

defineEmits<{ retry: [] }>()
</script>

<template>
  <div class="error-state surface" role="alert">
    <span class="error-state__mark mono" aria-hidden="true">!</span>
    <h2>{{ title ?? '数据加载失败' }}</h2>
    <p>{{ message }}</p>
    <button v-if="retryLabel !== ''" class="error-state__action" type="button" @click="$emit('retry')">
      {{ retryLabel ?? '重试' }}
    </button>
  </div>
</template>

<style scoped>
.error-state {
  display: grid;
  justify-items: center;
  gap: 10px;
  padding: 44px 24px;
  text-align: center;
  border-color: color-mix(in srgb, var(--wrong) 30%, var(--border));
}

.error-state__mark {
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  border: 1px solid color-mix(in srgb, var(--wrong) 50%, transparent);
  border-radius: 50%;
  color: var(--wrong);
}

.error-state h2 {
  font-size: 18px;
}

.error-state p {
  max-width: 48ch;
  color: var(--muted);
  font-size: 13px;
}

.error-state__action {
  margin-top: 8px;
  padding: 9px 16px;
  border: 1px solid var(--border-strong);
  border-radius: 9px;
  background: var(--surface);
  color: var(--text);
  font-size: 13px;
}
</style>
