export type AnswerResult = 'correct' | 'wrong'

export interface QuestionProgress {
  seen: number
  correct: number
  wrong: number
  correctStreak: number
  wrongBook: boolean
  lastResult?: AnswerResult
  lastAt: number
}

export interface DailyStat {
  answered: number
  correct: number
}

export interface ProgressState {
  version: 1
  questions: Record<string, QuestionProgress>
  daily: Record<string, DailyStat>
  updatedAt: number
}

export interface ProgressExport {
  app: 'bagu-training-ground'
  version: 1
  exportedAt: string
  progress: ProgressState
}

export function createEmptyProgress(): ProgressState {
  return {
    version: 1,
    questions: {},
    daily: {},
    updatedAt: Date.now(),
  }
}

export function createQuestionProgress(): QuestionProgress {
  return {
    seen: 0,
    correct: 0,
    wrong: 0,
    correctStreak: 0,
    wrongBook: false,
    lastAt: 0,
  }
}
