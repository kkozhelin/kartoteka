import { defineStore } from 'pinia'
import { computed, shallowRef, ref } from 'vue'
import type { Catalog, CatalogChange } from '../domain/catalog'
import type { CatalogRepository } from '../infrastructure/catalogRepository'

export const useCatalogStore = defineStore('catalog', () => {
  const catalog = shallowRef<Catalog>()
  const readError = ref(false)
  const notes = computed(() => catalog.value?.notes ?? [])
  const ready = computed(() => catalog.value !== undefined)

  function accept(incoming: Catalog) {
    if (!catalog.value || incoming.sequence >= catalog.value.sequence) catalog.value = incoming
    readError.value = false
  }

  async function refresh(repository: CatalogRepository) {
    try {
      accept(await repository.read())
    } catch {
      readError.value = true
    }
  }

  async function commit(repository: CatalogRepository, change: CatalogChange) {
    const result = await repository.commit(change)
    accept(result.catalog)
    return result
  }

  return { notes, ready, readError, refresh, commit }
})
