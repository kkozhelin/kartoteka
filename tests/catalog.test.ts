import { IDBFactory } from 'fake-indexeddb'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { initialCatalog, parseCatalog } from '../app/domain/catalog'
import type { Catalog, CatalogChange } from '../app/domain/catalog'
import { createCatalogRepository } from '../app/infrastructure/catalogRepository'
import type { CatalogRepository } from '../app/infrastructure/catalogRepository'
import { useCatalogStore } from '../app/stores/catalog'

const createNote = (id: string): CatalogChange => ({
  kind: 'upsert', id, expected: null, content: { title: id, todos: [] }, time: 10,
})

describe('catalog store and repository', () => {
  let database: IDBFactory
  let repository: CatalogRepository

  beforeEach(() => {
    setActivePinia(createPinia())
    database = new IDBFactory()
    repository = createCatalogRepository(database)
  })

  it('loads sample cards and persists committed notes across store instances', async () => {
    const store = useCatalogStore()
    await store.refresh(repository)
    expect(store.ready).toBe(true)
    expect(store.notes).toHaveLength(4)
    await store.commit(repository, createNote('first'))
    expect(store.notes[0]?.id).toBe('first')
    const otherStore = useCatalogStore(createPinia())
    await otherStore.refresh(createCatalogRepository(database))
    expect(otherStore.notes[0]).toMatchObject({ id: 'first', revision: 1 })
  })

  it('serializes two independent writes against the latest catalog', async () => {
    const other = createCatalogRepository(database)
    await Promise.all([repository.commit(createNote('first')), other.commit(createNote('second'))])
    const result = await repository.read()
    expect(result.sequence).toBe(2)
    expect(result.notes.map(note => note.id)).toEqual(expect.arrayContaining(['first', 'second']))
  })

  it('rejects a stale revision and never revives a deleted note', async () => {
    const store = useCatalogStore()
    await store.commit(repository, createNote('shared'))
    const other = createCatalogRepository(database)
    const update = {
      kind: 'upsert', id: 'shared', expected: 1, content: { title: 'Первая версия', todos: [] }, time: 15,
    } satisfies CatalogChange
    await other.commit(update)
    expect(await store.commit(repository, update)).toMatchObject({ ok: false, reason: 'conflict' })
    expect(store.notes[0]?.revision).toBe(2)
    await other.commit({ kind: 'delete', id: 'shared', expected: 2 })
    expect(await store.commit(repository, { ...update, expected: 2 })).toMatchObject({ ok: false, reason: 'missing' })
    expect(store.notes.some(note => note.id === 'shared')).toBe(false)
  })

  it('keeps an intentionally empty catalog empty', async () => {
    for (const note of (await repository.read()).notes) {
      await repository.commit({ kind: 'delete', id: note.id, expected: note.revision })
    }
    expect((await createCatalogRepository(database).read()).notes).toEqual([])
  })

  it('ignores a delayed refresh after accepting a newer write', async () => {
    const store = useCatalogStore()
    let finishOldRead!: (catalog: Catalog) => void
    const oldRead = new Promise<Catalog>(resolve => { finishOldRead = resolve })
    const refreshing = store.refresh({ ...repository, read: () => oldRead })
    await store.commit(repository, createNote('newer'))
    finishOldRead(initialCatalog())
    await refreshing
    expect(store.notes[0]?.id).toBe('newer')
  })

  it('reports unavailable storage and recovers on a later successful read', async () => {
    const store = useCatalogStore()
    await store.refresh({ ...repository, read: () => Promise.reject(new Error('storage unavailable')) })
    expect(store.readError).toBe(true)
    expect(store.ready).toBe(false)
    await store.refresh(repository)
    expect(store.readError).toBe(false)
    expect(store.ready).toBe(true)
  })

  it('rejects incompatible schema versions and malformed notes', () => {
    expect(() => parseCatalog({ ...initialCatalog(), version: 2 })).toThrow()
    expect(() => parseCatalog({ ...initialCatalog(), notes: [{ id: 'a', todos: [] }] })).toThrow()
  })
})
