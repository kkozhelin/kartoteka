import { changeCatalog, parseCatalog } from '../domain/catalog'
import type { Catalog, CatalogChange, ChangeResult } from '../domain/catalog'

const DATABASE = 'kartoteka'
const STORE = 'workspace'
const KEY = 'catalog'
const DATABASE_VERSION = 1

export interface CatalogRepository {
  read(): Promise<Catalog>
  commit(change: CatalogChange): Promise<ChangeResult>
}

export function createCatalogRepository(factory: IDBFactory): CatalogRepository {
  let connection: Promise<IDBDatabase> | undefined

  function open(): Promise<IDBDatabase> {
    if (connection) return connection

    connection = new Promise<IDBDatabase>((resolve, reject) => {
      const request = factory.open(DATABASE, DATABASE_VERSION)
      request.onupgradeneeded = () => request.result.createObjectStore(STORE)
      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        const db = request.result
        db.onversionchange = () => {
          db.close()
          connection = undefined
        }
        resolve(db)
      }
    }).catch((error) => {
      connection = undefined
      throw error
    })
    return connection
  }

  async function transact<T>(mode: IDBTransactionMode, action: (catalog: Catalog, store: IDBObjectStore) => T): Promise<T> {
    const db = await open()
    return new Promise<T>((resolve, reject) => {
      const transaction = db.transaction(STORE, mode)
      const store = transaction.objectStore(STORE)
      const request = store.get(KEY)
      let result: T

      request.onsuccess = () => {
        try {
          result = action(parseCatalog(request.result), store)
        } catch (error) {
          reject(error)
          transaction.abort()
        }
      }

      transaction.oncomplete = () => resolve(result)
      transaction.onabort = () => reject(transaction.error ?? new Error('Catalog transaction aborted'))
    })
  }

  return {
    read: () => transact('readonly', catalog => catalog),
    commit: (change) => transact('readwrite', (catalog, store) => {
      const result = changeCatalog(catalog, change)
      if (result.ok) store.put(result.catalog, KEY)
      return result
    }),
  }
}
