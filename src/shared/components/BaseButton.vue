<script setup lang="ts">
withDefaults(
  defineProps<{
    variant?: 'primary' | 'secondary' | 'ghost'
    size?: 'sm' | 'md' | 'lg'
    block?: boolean
    disabled?: boolean
    type?: 'button' | 'submit'
  }>(),
  {
    variant: 'primary',
    size: 'md',
    block: false,
    disabled: false,
    type: 'button',
  },
)
</script>

<template>
  <button
    :type="type"
    class="btn"
    :class="[`btn--${variant}`, `btn--${size}`, { 'btn--block': block }]"
    :disabled="disabled"
  >
    <slot />
  </button>
</template>

<style scoped>
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border: 1px solid transparent;
  border-radius: 10px;
  font-weight: 550;
  line-height: 1;
  white-space: nowrap;
  transition:
    transform var(--duration-press) var(--ease-out),
    background var(--duration-hover) var(--ease-out),
    border-color var(--duration-hover) var(--ease-out),
    color var(--duration-hover) var(--ease-out),
    box-shadow var(--duration-hover) var(--ease-out);
}

.btn:active:not(:disabled) {
  transform: scale(0.985);
}

.btn:disabled {
  cursor: not-allowed;
  opacity: 0.45;
}

.btn--sm {
  min-height: 32px;
  padding: 0 12px;
  font-size: 12px;
}

.btn--md {
  min-height: 42px;
  padding: 0 18px;
  font-size: 14px;
}

.btn--lg {
  min-height: 50px;
  padding: 0 24px;
  font-size: 15px;
}

.btn--primary {
  background: var(--accent);
  color: #04110d;
  box-shadow: 0 0 0 1px color-mix(in srgb, var(--accent) 40%, transparent);
}

.btn--primary:hover:not(:disabled) {
  background: var(--accent-strong);
  box-shadow: 0 0 26px color-mix(in srgb, var(--accent) 28%, transparent);
}

.btn--secondary {
  border-color: var(--border-strong);
  background: color-mix(in srgb, var(--surface) 82%, transparent);
  color: var(--text);
}

.btn--secondary:hover:not(:disabled) {
  border-color: color-mix(in srgb, var(--accent) 45%, var(--border-strong));
  background: var(--surface);
}

.btn--ghost {
  background: transparent;
  color: var(--muted);
}

.btn--ghost:hover:not(:disabled) {
  color: var(--text);
  background: color-mix(in srgb, var(--surface) 65%, transparent);
}

.btn--block {
  width: 100%;
}
</style>
