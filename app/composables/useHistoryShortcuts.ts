import { onBeforeUnmount, onMounted } from 'vue'

export function useHistoryShortcuts(run: (direction: 'undo' | 'redo') => void, enabled: () => boolean) {
  function onKeydown(event: KeyboardEvent) {
    if (event.defaultPrevented || event.isComposing || event.altKey || !(event.ctrlKey || event.metaKey)
      || (event.code !== 'KeyZ' && event.key.toLowerCase() !== 'z') || !enabled()) return

    const target = event.target
    if (target instanceof HTMLElement && target.closest('input:not([type=checkbox]), textarea, [contenteditable=true]')) return

    event.preventDefault()
    run(event.shiftKey ? 'redo' : 'undo')
  }

  onMounted(() => window.addEventListener('keydown', onKeydown))
  onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown))
}
