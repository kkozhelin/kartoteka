import { onBeforeUnmount, shallowRef } from 'vue'

export interface Confirmation {
  title: string
  description: string
  confirmLabel: string
  cancelLabel: string
  danger?: boolean
  focusConfirm?: boolean
}

export function useConfirmation() {
  const dialog = shallowRef<Confirmation>()
  let resolve: ((answer: boolean | undefined) => void) | undefined

  function close(answer?: boolean) {
    const settle = resolve
    resolve = undefined
    dialog.value = undefined
    settle?.(answer)
  }

  function ask(options: Confirmation) {
    close()
    dialog.value = options
    return new Promise<boolean | undefined>(done => { resolve = done })
  }

  onBeforeUnmount(() => close())
  return { dialog, ask, close }
}
