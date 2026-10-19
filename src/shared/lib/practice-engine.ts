import { shuffle, type RandomSource } from '@/shared/lib/random'
import type {
  Question,
  QuestionOption,
  QuestionProgress,
  SessionAnswer,
  SessionResult,
  SessionState,
} from '@/shared/types'
import type { SessionMode } from '@/shared/types'

export interface BuildQueueOptions {
  questions: readonly Question[]
  mode: SessionMode
  count: number | 'all'
  getProgress: (questionId: string) => QuestionProgress | undefined
  random?: RandomSource
}

export function buildQuestionQueue({
  questions,
  mode,
  count,
  getProgress,
  random = Math.random,
}: BuildQueueOptions): Question[] {
  const pool = questions.filter((question) => {
    if (mode === 'wrong') {
      return getProgress(question.id)?.wrongBook === true
    }
    return true
  })

  if (pool.length === 0) {
    return []
  }

  const unseen: Question[] = []
  const wrong: Question[] = []
  const seen: Question[] = []

  for (const question of pool) {
    const progress = getProgress(question.id)
    if (!progress || progress.seen === 0) {
      unseen.push(question)
    } else if (progress.wrongBook) {
      wrong.push(question)
    } else {
      seen.push(question)
    }
  }

  const ordered =
    mode === 'wrong'
      ? shuffle(pool, random)
      : [...shuffle(unseen, random), ...shuffle(wrong, random), ...shuffle(seen, random)]

  return count === 'all' ? ordered : ordered.slice(0, Math.min(count, ordered.length))
}

export function createOptionOrder(question: Question, random: RandomSource = Math.random): string[] {
  return shuffle(
    question.options.map((option) => option.id),
    random,
  )
}

export function orderedOptions(question: Question, order: readonly string[]): QuestionOption[] {
  const byId = new Map(question.options.map((option) => [option.id, option]))
  const ordered = order
    .map((id) => byId.get(id))
    .filter((option): option is QuestionOption => option !== undefined)
  if (ordered.length === question.options.length) {
    return ordered
  }
  const missing = question.options.filter((option) => !order.includes(option.id))
  return [...ordered, ...missing]
}

export function correctOption(question: Question): QuestionOption | undefined {
  return question.options.find((option) => option.correct)
}

export function isCorrectOption(question: Question, optionId: string): boolean {
  return question.options.some((option) => option.id === optionId && option.correct)
}

export function buildSessionResult(
  session: SessionState,
  questions: readonly Question[],
  now = Date.now(),
): SessionResult {
  const answers = Object.entries(session.answers)
  const correct = answers.filter(([, answer]) => answer.correct).length
  const wrong = answers.length - correct
  const total = session.questionIds.length
  const startedAt = session.startedAt
  const finishedAt = session.finishedAt ?? now
  const byId = new Map(questions.map((question) => [question.id, question]))

  return {
    total,
    answered: answers.length,
    correct,
    wrong,
    accuracy: answers.length === 0 ? 0 : correct / answers.length,
    durationMs: Math.max(0, finishedAt - startedAt),
    wrongQuestionIds: answers
      .filter(([, answer]) => !answer.correct)
      .map(([questionId]) => byId.get(questionId))
      .filter((question): question is Question => question !== undefined)
      .map((question) => question.id),
  }
}

export function makeAnswer(
  question: Question,
  optionId: string,
  optionOrder: string[],
): SessionAnswer {
  return {
    optionId,
    correct: isCorrectOption(question, optionId),
    optionOrder,
    at: Date.now(),
  }
}

export { questionCategoryFromId } from '@/shared/lib/questionId'
