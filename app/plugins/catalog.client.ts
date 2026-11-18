import { createCatalogRepository } from '../infrastructure/catalogRepository'
import { useCatalogStore } from '../stores/catalog'

const CHANNEL = 'kartoteka.catalog'
const SIGNAL_KEY = 'kartoteka.catalog.changed'

export default defineNuxtPlugin(() => {
  const repository = createCatalogRepository(window.indexedDB)
  const store = useCatalogStore()
  const channel = typeof BroadcastChannel === 'function' ? new BroadcastChannel(CHANNEL) : undefined
  const refresh = () => { void store.refresh(repository) }

  channel?.addEventListener('message', refresh)
  window.addEventListener('focus', refresh)
  window.addEventListener('storage', (event) => {
    if (event.key === SIGNAL_KEY) refresh()
  })
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') refresh()
  })
  refresh()

  function notify() {
    try {
      if (channel) channel.postMessage(null)
      else window.localStorage.setItem(SIGNAL_KEY, String(Date.now()))
    } catch {
      // Focus and visibility refresh also work when browser messaging is unavailable.
    }
  }

  return { provide: { catalogRepository: repository, notifyCatalogChanged: notify } }
})
