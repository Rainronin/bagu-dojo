import type { Catalog, Category } from '@/shared/types'

import { fetchJson } from './http'

let catalogPromise: Promise<Catalog> | null = null

export function loadCatalog(): Promise<Catalog> {
  catalogPromise ??= fetchJson<Catalog>('catalog.json')
  return catalogPromise
}

export function getCategoryFromCatalog(catalog: Catalog, slug: string): Category | undefined {
  for (const domain of catalog.domains) {
    for (const group of domain.groups) {
      const category = group.categories.find((item) => item.slug === slug)
      if (category) {
        return category
      }
    }
  }
  return undefined
}

export function flattenCategories(catalog: Catalog): Category[] {
  const map = new Map<string, Category>()
  for (const domain of catalog.domains) {
    for (const group of domain.groups) {
      for (const category of group.categories) {
        map.set(category.slug, category)
      }
    }
  }
  return [...map.values()]
}

export function resetCatalogCache(): void {
  catalogPromise = null
}
