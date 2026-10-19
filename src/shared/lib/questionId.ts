export function questionCategoryFromId(questionId: string): string | undefined {
  const match = /^q_([a-z0-9-]+)_/.exec(questionId)
  return match?.[1]
}
