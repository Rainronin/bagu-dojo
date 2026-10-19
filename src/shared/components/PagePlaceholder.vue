<script setup lang="ts">
defineProps<{
  kicker: string
  title: string
  description: string
}>()
</script>

<template>
  <div class="placeholder container-page">
    <p class="kicker">{{ kicker }}</p>
    <h1>{{ title }}</h1>
    <p>{{ description }}</p>
    <RouterLink to="/">回首页</RouterLink>
  </div>
</template>

<style scoped>
.placeholder {
  display: grid;
  justify-items: start;
  gap: 12px;
  max-width: 680px;
  padding-block: 80px;
}

.placeholder h1 {
  font-size: clamp(32px, 5vw, 48px);
  letter-spacing: -0.03em;
}

.placeholder > p {
  color: var(--muted);
  font-size: 14px;
}

.placeholder a {
  margin-top: 8px;
  color: var(--accent);
  font-size: 13px;
}
</style>
