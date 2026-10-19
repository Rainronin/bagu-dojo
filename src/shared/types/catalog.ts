export type Domain = 'frontend' | 'backend' | 'shared'
export type DomainId = 'frontend' | 'backend'

export interface Category {
  slug: string
  name: string
  domain: Domain
  group: string
  description?: string
  questionCount: number
  handwrittenCount?: number
}

export interface CategoryGroup {
  key: string
  name: string
  categories: Category[]
  shared?: boolean
}

export interface DomainSummary {
  id: DomainId
  name: string
  tagline: string
  questionCount: number
  groups: CategoryGroup[]
}

export interface Catalog {
  version: string
  generatedAt: string
  totals: {
    questions: number
    handwritten: number
    categories: number
  }
  domains: DomainSummary[]
}
