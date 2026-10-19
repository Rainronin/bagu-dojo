export class DataLoadError extends Error {
  readonly path: string
  readonly status?: number

  constructor(message: string, path: string, status?: number) {
    super(message)
    this.name = 'DataLoadError'
    this.path = path
    this.status = status
  }
}

function dataUrl(relativePath: string): string {
  const base = import.meta.env.BASE_URL.endsWith('/')
    ? import.meta.env.BASE_URL
    : `${import.meta.env.BASE_URL}/`
  return `${base}data/${relativePath.replace(/^\//, '')}`
}

export async function fetchJson<T>(relativePath: string): Promise<T> {
  const url = dataUrl(relativePath)
  let response: Response
  try {
    response = await fetch(url, {
      headers: { Accept: 'application/json' },
    })
  } catch (error) {
    throw new DataLoadError(
      `题库数据加载失败：${error instanceof Error ? error.message : '网络错误'}`,
      relativePath,
    )
  }

  if (!response.ok) {
    throw new DataLoadError(`题库数据加载失败（HTTP ${response.status}）`, relativePath, response.status)
  }

  try {
    return (await response.json()) as T
  } catch {
    throw new DataLoadError('题库数据格式错误', relativePath, response.status)
  }
}
