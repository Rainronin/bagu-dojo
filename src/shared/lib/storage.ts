export function readStored<T>(
  key: string,
  fallback: T,
  isValid: (value: unknown) => value is T,
): T {
  if (typeof localStorage === 'undefined') {
    return fallback
  }
  try {
    const raw = localStorage.getItem(key)
    if (!raw) {
      return fallback
    }
    const parsed: unknown = JSON.parse(raw)
    if (!isValid(parsed)) {
      localStorage.removeItem(key)
      return fallback
    }
    return parsed
  } catch {
    localStorage.removeItem(key)
    return fallback
  }
}

export function writeStored(key: string, value: unknown): void {
  if (typeof localStorage === 'undefined') {
    return
  }
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Quota or private-mode failures must not break the practice flow.
  }
}

export function removeStored(key: string): void {
  if (typeof localStorage === 'undefined') {
    return
  }
  localStorage.removeItem(key)
}

export function downloadJson(filename: string, value: unknown): void {
  const blob = new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
