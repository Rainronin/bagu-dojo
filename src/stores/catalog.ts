import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

import { loadCatalog } from '@/data/catalog.repository'
import type { Catalog, Category, DomainId } from '@/shared/types'

export const useCatalogStore = defineStore('catalog', () => {
  const catalog = ref<Catalog | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)
  let pending: Promise<Catalog> | null = null

  const categories = computed<Category[]>(() => {
    if (!catalog.value) {
      return []
    }
    const map = new Map<string, Category>()
    for (const domain of catalog.value.domains) {
      for (const group of domain.groups) {
        for (const category of group.categories) {
          map.set(category.slug, category)
        }
      }
    }
    return [...map.values()]
  })

  const categoryBySlug = computed(() => new Map(categories.value.map((item) => [item.slug, item])))

  const totalQuestions = computed(() =>
    catalog.value ? catalog.value.totals.questions : categories.value.reduce((sum, item) => sum + item.questionCount, 0),
  )

  const totalHandwritten = computed(() => catalog.value?.totals.handwritten ?? 0)

  function domain(id: DomainId) {
    return catalog.value?.domains.find((item) => item.id === id) ?? null
  }

  function domainQuestionCount(id: DomainId): number {
    const current = domain(id)
    if (!current) {
      return 0
    }
    const seen = new Set<string>()
    let count = 0
    for (const group of current.groups) {
      for (const category of group.categories) {
        if (!seen.has(category.slug)) {
          seen.add(category.slug)
          count += category.questionCount
        }
      }
    }
    return count
  }

  function categorySlugsForDomain(id: DomainId): string[] {
    const current = domain(id)
    if (!current) {
      return []
    }
    const slugs = new Set<string>()
    for (const group of current.groups) {
      for (const category of group.categories) {
        slugs.add(category.slug)
      }
    }
    return [...slugs]
  }

  async function ensureCatalog(): Promise<Catalog> {
    if (catalog.value) {
      return catalog.value
    }
    if (pending) {
      return pending
    }
    loading.value = true
    error.value = null
    pending = loadCatalog()
      .then((value) => {
        catalog.value = value
        return value
      })
      .catch((reason: unknown) => {
        error.value = reason instanceof Error ? reason.message : '题库入口加载失败'
        throw reason
      })
      .finally(() => {
        loading.value = false
        pending = null
      })
    return pending
  }

  function retry(): Promise<Catalog> {
    catalog.value = null
    return ensureCatalog()
  }

  return {
    catalog,
    loading,
    error,
    categories,
    categoryBySlug,
    totalQuestions,
    totalHandwritten,
    domain,
    domainQuestionCount,
    categorySlugsForDomain,
    ensureCatalog,
    retry,
  }
})
