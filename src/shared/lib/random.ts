export type RandomSource = () => number

export function createRng(seed: number): RandomSource {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function shuffle<T>(items: readonly T[], random: RandomSource = Math.random): T[] {
  const result = [...items]
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1))
    const current = result[index] as T
    result[index] = result[swapIndex] as T
    result[swapIndex] = current
  }
  return result
}

export interface Weighted {
  weight: number
}

/**
 * Efraimidis–Spirakis weighted random sampling without replacement.
 * Every item gets key = random^(1/weight); sorting keys descending yields a
 * weighted shuffle.
 */
export function weightedShuffle<T extends Weighted>(
  items: readonly T[],
  random: RandomSource = Math.random,
): T[] {
  return items
    .map((item) => {
      const weight = Math.max(item.weight, Number.EPSILON)
      return { item, key: Math.pow(random(), 1 / weight) }
    })
    .sort((left, right) => right.key - left.key)
    .map((entry) => entry.item)
}

export function takeRandom<T>(items: readonly T[], count: number, random: RandomSource = Math.random): T[] {
  if (count >= items.length) {
    return shuffle(items, random)
  }
  return shuffle(items, random).slice(0, count)
}

export function randomId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `s_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`
}
