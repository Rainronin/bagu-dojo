import type {
  CategoryPayload,
  HandwrittenItem,
  HandwrittenPayload,
  Question,
} from '@/shared/types'

import { fetchJson } from './http'

const categoryCache = new Map<string, Promise<CategoryPayload>>()
let handwrittenPromise: Promise<HandwrittenItem[]> | null = null

export function loadCategoryQuestions(slug: string): Promise<CategoryPayload> {
  const cached = categoryCache.get(slug)
  if (cached) {
    return cached
  }
  const request = fetchJson<CategoryPayload>(`categories/${slug}.json`)
  categoryCache.set(slug, request)
  return request
}

export async function loadQuestionsForCategories(slugs: readonly string[]): Promise<Question[]> {
  const unique = [...new Set(slugs)]
  const payloads = await Promise.all(unique.map((slug) => loadCategoryQuestions(slug)))
  return payloads.flatMap((payload) => payload.questions)
}

export function loadHandwritten(): Promise<HandwrittenItem[]> {
  handwrittenPromise ??= fetchJson<HandwrittenPayload>('handwritten.json').then((payload) =>
    [...payload.items].sort((left, right) => left.order - right.order),
  )
  return handwrittenPromise
}

export function resetQuestionCache(): void {
  categoryCache.clear()
  handwrittenPromise = null
}
