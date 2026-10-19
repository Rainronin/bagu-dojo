export type ThemeMode = 'dark' | 'light' | 'system'

export interface SettingsState {
  version: 1
  theme: ThemeMode
  reducedMotion: boolean
  lastScope?: string
}

export interface FeedbackEntry {
  id: string
  questionId: string
  category: string
  message: string
  createdAt: number
}

export function createDefaultSettings(): SettingsState {
  return {
    version: 1,
    theme: 'dark',
    reducedMotion: false,
  }
}
