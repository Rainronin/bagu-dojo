<script setup lang="ts">
import { ref } from 'vue'

import BaseButton from '@/shared/components/BaseButton.vue'
import { downloadJson } from '@/shared/lib/storage'
import type { ThemeMode } from '@/shared/types'
import { useFeedbackStore } from '@/stores/feedback'
import { useHandwrittenStore } from '@/stores/handwritten'
import { usePracticeStore } from '@/stores/practice'
import { useProgressStore } from '@/stores/progress'
import { useSettingsStore } from '@/stores/settings'

const settingsStore = useSettingsStore()
const progressStore = useProgressStore()
const practiceStore = usePracticeStore()
const handwrittenStore = useHandwrittenStore()
const feedbackStore = useFeedbackStore()

const importInput = ref<HTMLInputElement | null>(null)
const message = ref<{ tone: 'ok' | 'error'; text: string } | null>(null)

const themeOptions: Array<{ value: ThemeMode; label: string; hint: string }> = [
  { value: 'dark', label: '深色', hint: '技术实验室' },
  { value: 'light', label: '浅色', hint: '实验笔记' },
  { value: 'system', label: '跟随系统', hint: '自动切换' },
]

function exportProgress(): void {
  const date = new Date().toISOString().slice(0, 10)
  downloadJson(`bagu-training-ground-progress-${date}.json`, progressStore.exportProgress())
  message.value = { tone: 'ok', text: '进度已导出。' }
}

function openImport(): void {
  importInput.value?.click()
}

async function onImportFile(event: Event): Promise<void> {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) {
    return
  }
  try {
    const raw: unknown = JSON.parse(await file.text())
    const result = progressStore.importProgress(raw)
    if (result.ok) {
      practiceStore.clearSession()
      message.value = { tone: 'ok', text: '进度已导入，当前练习已重置。' }
    } else {
      message.value = { tone: 'error', text: result.error }
    }
  } catch {
    message.value = { tone: 'error', text: '文件不是合法 JSON。' }
  } finally {
    input.value = ''
  }
}

function resetProgress(): void {
  if (!window.confirm('确认清空全部答题进度、错题和手写题已读记录？此操作不可撤销。')) {
    return
  }
  progressStore.resetAll()
  practiceStore.clearSession()
  handwrittenStore.reset()
  message.value = { tone: 'ok', text: '练习数据已清空。' }
}

function onReducedMotionChange(event: Event): void {
  settingsStore.setReducedMotion((event.target as HTMLInputElement).checked)
}

function exportFeedback(): void {
  const date = new Date().toISOString().slice(0, 10)
  downloadJson(`bagu-training-ground-feedback-${date}.json`, feedbackStore.exportFeedback())
  message.value = { tone: 'ok', text: '题目反馈已导出。' }
}

function clearFeedback(): void {
  if (!window.confirm('确认清空全部题目反馈？')) {
    return
  }
  feedbackStore.clear()
  message.value = { tone: 'ok', text: '题目反馈已清空。' }
}

function feedbackDate(timestamp: number): string {
  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(timestamp))
}
</script>

<template>
  <div class="settings container-page">
    <header class="settings__head">
      <p class="kicker">SETTINGS / LOCAL</p>
      <h1>设置</h1>
      <p>所有偏好和进度只保存在当前浏览器。没有账号，也没有云端同步。</p>
    </header>

    <section class="settings-section surface">
      <div class="settings-section__head">
        <h2>外观</h2>
        <span class="kicker">APPEARANCE</span>
      </div>
      <div class="theme-grid">
        <button
          v-for="option in themeOptions"
          :key="option.value"
          type="button"
          class="theme-option"
          :class="{ 'theme-option--active': settingsStore.state.theme === option.value }"
          @click="settingsStore.setTheme(option.value)"
        >
          <span class="theme-option__swatch" :data-theme-preview="option.value" />
          <strong>{{ option.label }}</strong>
          <span>{{ option.hint }}</span>
        </button>
      </div>
      <label class="switch-row">
        <span>
          <strong>减弱动效</strong>
          <span>关闭位移、粒子和数字滚动，只保留淡入。</span>
        </span>
        <input
          type="checkbox"
          :checked="settingsStore.state.reducedMotion"
          @change="onReducedMotionChange"
        />
      </label>
    </section>

    <section class="settings-section surface">
      <div class="settings-section__head">
        <h2>数据</h2>
        <span class="kicker">PROGRESS</span>
      </div>
      <div class="data-grid">
        <div class="data-card">
          <strong class="mono">{{ progressStore.answeredQuestionIds.length }}</strong>
          <span>道题至少做过一次</span>
        </div>
        <div class="data-card">
          <strong class="mono">{{ progressStore.wrongQuestionIds.length }}</strong>
          <span>道在错题本</span>
        </div>
        <div class="data-card">
          <strong class="mono">{{ progressStore.streakDays() }}<small>d</small></strong>
          <span>连续练习天数</span>
        </div>
      </div>
      <div class="settings-actions">
        <BaseButton variant="secondary" @click="exportProgress">导出进度 JSON</BaseButton>
        <BaseButton variant="secondary" @click="openImport">导入进度</BaseButton>
        <BaseButton variant="ghost" @click="resetProgress">清空练习数据</BaseButton>
        <input
          ref="importInput"
          class="sr-only"
          type="file"
          accept="application/json,.json"
          @change="onImportFile"
        />
      </div>
      <p v-if="message" class="settings-message" :data-tone="message.tone" role="status">
        {{ message.text }}
      </p>
      <p class="settings-hint">导入会覆盖当前进度；导入前建议先导出一份备份。</p>
    </section>

    <section class="settings-section surface">
      <div class="settings-section__head">
        <h2>题目反馈</h2>
        <span class="kicker">FEEDBACK</span>
      </div>
      <p v-if="feedbackStore.items.length === 0" class="feedback-empty">
        在练习解析面板点「题目报错」会记录到这里。反馈只保存在本地，不会上传。
      </p>
      <ul v-else class="feedback-list">
        <li v-for="entry in feedbackStore.items" :key="entry.id" class="feedback-item">
          <div>
            <p class="feedback-item__meta">
              <span class="mono">{{ entry.category }}</span>
              <span>{{ feedbackDate(entry.createdAt) }}</span>
            </p>
            <p class="feedback-item__message">{{ entry.message }}</p>
            <p class="feedback-item__id mono">{{ entry.questionId }}</p>
          </div>
          <button type="button" class="feedback-item__remove" @click="feedbackStore.remove(entry.id)">
            删除
          </button>
        </li>
      </ul>
      <div v-if="feedbackStore.items.length > 0" class="settings-actions">
        <BaseButton variant="secondary" @click="exportFeedback">导出反馈 JSON</BaseButton>
        <BaseButton variant="ghost" @click="clearFeedback">清空反馈</BaseButton>
      </div>
    </section>

    <section class="settings-section surface">
      <div class="settings-section__head">
        <h2>关于</h2>
        <span class="kicker">ABOUT</span>
      </div>
      <dl class="about-list">
        <div>
          <dt>站点</dt>
          <dd>八股训练场 · TRAINING GROUND</dd>
        </div>
        <div>
          <dt>题库</dt>
          <dd>个人整理的前端 Markdown 与「小林coding」后端 PDF；解析保留原文。</dd>
        </div>
        <div>
          <dt>选项</dt>
          <dd>正确项与干扰项由 AI 基于原文生成，仅供学习；发现错误欢迎通过解析面板反馈。</dd>
        </div>
        <div>
          <dt>版本</dt>
          <dd class="mono">v0.1.0 · LOCAL FIRST</dd>
        </div>
      </dl>
    </section>
  </div>
</template>

<style scoped>
.settings {
  max-width: 880px;
  padding-block: 44px 24px;
}

.settings__head h1 {
  margin-top: 12px;
  font-size: clamp(36px, 5vw, 56px);
  letter-spacing: -0.04em;
}

.settings__head > p:last-child {
  margin-top: 12px;
  color: var(--muted);
  font-size: 13px;
}

.settings-section {
  margin-top: 16px;
  padding: 24px;
}

.settings-section__head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 18px;
}

.settings-section__head h2 {
  font-size: 16px;
}

.theme-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.theme-option {
  display: grid;
  justify-items: start;
  gap: 4px;
  padding: 14px;
  border: 1px solid var(--border);
  border-radius: 11px;
  background: transparent;
  color: var(--text-soft);
  text-align: left;
}

.theme-option:hover {
  border-color: var(--border-strong);
}

.theme-option--active {
  border-color: color-mix(in srgb, var(--accent) 45%, var(--border));
  background: color-mix(in srgb, var(--accent) 6%, transparent);
}

.theme-option strong {
  margin-top: 8px;
  font-size: 13px;
  font-weight: 550;
}

.theme-option > span:last-child {
  color: var(--faint);
  font-size: 10px;
}

.theme-option__swatch {
  display: block;
  width: 100%;
  height: 36px;
  border: 1px solid var(--border);
  border-radius: 7px;
  background: linear-gradient(120deg, #070b0e, #16232b 55%, #7cf5d4);
}

.theme-option__swatch[data-theme-preview='light'] {
  background: linear-gradient(120deg, #f3f1ea, #ffffff 55%, #0e9f86);
}

.theme-option__swatch[data-theme-preview='system'] {
  background: linear-gradient(120deg, #070b0e 48%, #f3f1ea 52%);
}

.switch-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  margin-top: 20px;
  padding-top: 18px;
  border-top: 1px solid var(--border);
  cursor: pointer;
}

.switch-row > span {
  display: grid;
  gap: 3px;
}

.switch-row strong {
  font-size: 13px;
  font-weight: 550;
}

.switch-row > span > span {
  color: var(--faint);
  font-size: 11px;
}

.switch-row input {
  width: 18px;
  height: 18px;
  accent-color: var(--accent);
}

.data-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.data-card {
  display: grid;
  gap: 3px;
  padding: 14px;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--surface-soft);
}

.data-card strong {
  font-size: 24px;
  font-weight: 500;
}

.data-card small {
  color: var(--faint);
  font-size: 10px;
}

.data-card span {
  color: var(--faint);
  font-size: 10px;
}

.settings-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 9px;
  margin-top: 18px;
}

.settings-message {
  margin-top: 12px;
  padding: 9px 11px;
  border-radius: 8px;
  background: color-mix(in srgb, var(--correct) 9%, transparent);
  color: var(--correct);
  font-size: 12px;
}

.settings-message[data-tone='error'] {
  background: color-mix(in srgb, var(--wrong) 9%, transparent);
  color: var(--wrong);
}

.settings-hint {
  margin-top: 10px;
  color: var(--faint);
  font-size: 10px;
}

.feedback-empty {
  color: var(--faint);
  font-size: 11px;
}

.feedback-list {
  display: grid;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.feedback-item {
  display: flex;
  align-items: start;
  justify-content: space-between;
  gap: 14px;
  padding: 10px 12px;
  border: 1px solid var(--border);
  border-radius: 9px;
  background: var(--surface-soft);
}

.feedback-item__meta {
  display: flex;
  gap: 10px;
  color: var(--faint);
  font-size: 9px;
}

.feedback-item__message {
  margin-top: 4px;
  color: var(--text-soft);
  font-size: 12px;
  line-height: 1.55;
}

.feedback-item__id {
  margin-top: 4px;
  color: var(--faint);
  font-size: 8px;
}

.feedback-item__remove {
  flex-shrink: 0;
  border: 0;
  background: transparent;
  color: var(--faint);
  font-size: 10px;
}

.feedback-item__remove:hover {
  color: var(--wrong);
}

.about-list {
  display: grid;
  gap: 10px;
  margin: 0;
}

.about-list div {
  display: grid;
  grid-template-columns: 70px 1fr;
  gap: 14px;
  padding-bottom: 10px;
  border-bottom: 1px dashed color-mix(in srgb, var(--border) 80%, transparent);
}

.about-list dt {
  color: var(--faint);
  font-size: 11px;
}

.about-list dd {
  margin: 0;
  color: var(--text-soft);
  font-size: 12px;
  line-height: 1.6;
}

.about-list dd.mono {
  font-size: 10px;
}

@media (max-width: 640px) {
  .settings {
    padding-top: 28px;
  }

  .theme-grid,
  .data-grid {
    grid-template-columns: 1fr;
  }
}
</style>
