<script setup lang="ts">
import { ref } from 'vue'

import BaseButton from '@/shared/components/BaseButton.vue'
import type { Question } from '@/shared/types'
import { useFeedbackStore } from '@/stores/feedback'

const props = defineProps<{ question: Question }>()
const emit = defineEmits<{ close: []; submitted: [] }>()

const feedbackStore = useFeedbackStore()
const message = ref('')
const submitting = ref(false)

function submit(): void {
  if (submitting.value) {
    return
  }
  submitting.value = true
  feedbackStore.add(props.question.id, props.question.category, message.value || '未填写具体原因')
  emit('submitted')
  emit('close')
}

function close(): void {
  emit('close')
}
</script>

<template>
  <Teleport to="body">
    <div class="report-overlay" role="presentation" @click.self="close">
      <section
        class="report-dialog surface"
        role="dialog"
        aria-modal="true"
        aria-labelledby="report-title"
      >
        <header class="report-dialog__head">
          <div>
            <p class="kicker">REPORT / LOCAL</p>
            <h2 id="report-title">这道题有问题？</h2>
          </div>
          <button class="report-dialog__close" type="button" aria-label="关闭" @click="close">×</button>
        </header>
        <p class="report-dialog__stem">{{ question.stemText }}</p>
        <label class="report-dialog__field">
          <span>简单说明（选项错误、解析不对应、题干不通顺等）</span>
          <textarea
            v-model="message"
            rows="4"
            maxlength="500"
            placeholder="例如：正确项和原文答案冲突；某个干扰项其实也成立。"
            autofocus
          />
        </label>
        <div class="report-dialog__actions">
          <BaseButton :disabled="submitting" @click="submit">记录到本地</BaseButton>
          <BaseButton variant="ghost" @click="close">取消</BaseButton>
        </div>
        <p class="report-dialog__hint">反馈只保存在当前浏览器，可在设置页查看和导出。</p>
      </section>
    </div>
  </Teleport>
</template>

<style scoped>
.report-overlay {
  position: fixed;
  inset: 0;
  z-index: 80;
  display: grid;
  place-items: center;
  padding: 20px;
  background: rgb(0 0 0 / 0.62);
  backdrop-filter: blur(4px);
}

.report-dialog {
  width: min(560px, 100%);
  padding: 22px;
}

.report-dialog__head {
  display: flex;
  align-items: start;
  justify-content: space-between;
  gap: 16px;
}

.report-dialog__head h2 {
  margin-top: 8px;
  font-size: 20px;
}

.report-dialog__close {
  width: 30px;
  height: 30px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: transparent;
  color: var(--muted);
  font-size: 18px;
  line-height: 1;
}

.report-dialog__close:hover {
  color: var(--text);
  border-color: var(--border-strong);
}

.report-dialog__stem {
  margin-top: 16px;
  padding: 10px 12px;
  border-left: 2px solid var(--accent);
  background: color-mix(in srgb, var(--accent) 5%, transparent);
  color: var(--muted);
  font-size: 12px;
  line-height: 1.6;
}

.report-dialog__field {
  display: grid;
  gap: 8px;
  margin-top: 16px;
}

.report-dialog__field > span {
  color: var(--muted);
  font-size: 11px;
}

.report-dialog__field textarea {
  width: 100%;
  resize: vertical;
  padding: 10px 12px;
  border: 1px solid var(--border);
  border-radius: 9px;
  background: var(--surface-soft);
  color: var(--text);
  font-size: 13px;
  line-height: 1.6;
}

.report-dialog__field textarea:focus {
  border-color: color-mix(in srgb, var(--accent) 50%, var(--border));
  outline: none;
}

.report-dialog__actions {
  display: flex;
  gap: 9px;
  margin-top: 16px;
}

.report-dialog__hint {
  margin-top: 12px;
  color: var(--faint);
  font-size: 10px;
}
</style>
