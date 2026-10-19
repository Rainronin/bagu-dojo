export type SessionMode = 'random' | 'wrong'

export interface SessionAnswer {
  optionId: string
  correct: boolean
  optionOrder: string[]
  at: number
}

export interface SessionState {
  version: 1
  id: string
  scope: string
  mode: SessionMode
  questionIds: string[]
  optionOrders: Record<string, string[]>
  index: number
  answers: Record<string, SessionAnswer>
  startedAt: number
  finishedAt?: number
}

export interface SessionResult {
  total: number
  answered: number
  correct: number
  wrong: number
  accuracy: number
  durationMs: number
  wrongQuestionIds: string[]
}

export type SessionScopeKind = 'category' | 'frontend' | 'backend' | 'all' | 'wrong'
