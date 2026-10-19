<script setup lang="ts">
withDefaults(
  defineProps<{
    title: string
    description?: string
    actionLabel?: string
  }>(),
  {
    description: '',
    actionLabel: '',
  },
)

defineEmits<{ action: [] }>()
</script>

<template>
  <div class="empty-state surface">
    <span class="empty-state__mark mono" aria-hidden="true">∅</span>
    <h2>{{ title }}</h2>
    <p v-if="description">{{ description }}</p>
    <button v-if="actionLabel" class="empty-state__action" type="button" @click="$emit('action')">
      {{ actionLabel }}
    </button>
  </div>
</template>

<style scoped>
.empty-state {
  display: grid;
  justify-items: center;
  gap: 10px;
  padding: 48px 24px;
  text-align: center;
}

.empty-state__mark {
  color: var(--faint);
  font-size: 24px;
}

.empty-state h2 {
  font-size: 18px;
}

.empty-state p {
  max-width: 46ch;
  color: var(--muted);
  font-size: 13px;
}

.empty-state__action {
  margin-top: 8px;
  padding: 9px 16px;
  border: 1px solid var(--border-strong);
  border-radius: 9px;
  background: var(--surface);
  color: var(--text);
  font-size: 13px;
}

.empty-state__action:hover {
  border-color: var(--accent);
}
</style>
