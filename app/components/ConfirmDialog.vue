<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, useId } from 'vue'
import type { Confirmation } from '../composables/useConfirmation'

defineProps<{ options: Confirmation }>()
const emit = defineEmits<{ close: [answer?: boolean] }>()
const dialog = ref<HTMLDialogElement>()
const titleId = useId()
const descriptionId = useId()
let previous: HTMLElement | null = null

onMounted(() => {
  previous = document.activeElement instanceof HTMLElement ? document.activeElement : null
  dialog.value?.showModal()
})

onBeforeUnmount(() => {
  dialog.value?.close()
  void nextTick(() => {
    if (previous?.isConnected && document.activeElement === document.body) previous.focus()
  })
})

function trapTab(event: KeyboardEvent) {
  if (event.key !== 'Tab') return
  const buttons = Array.from(dialog.value?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)') ?? [])
  const first = buttons[0]
  const last = buttons.at(-1)
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault()
    last?.focus()
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault()
    first?.focus()
  }
}
</script>

<template>
  <dialog ref="dialog" class="confirm" :aria-labelledby="titleId" :aria-describedby="descriptionId"
    @cancel.prevent="emit('close')" @keydown="trapTab">
    <div class="confirm__icon" :class="{ 'confirm__icon--danger': options.danger }">
      <AppIcon :name="options.danger ? 'trash' : 'info'" />
    </div>
    <h2 :id="titleId">{{ options.title }}</h2>
    <p :id="descriptionId">{{ options.description }}</p>
    <div class="confirm__actions">
      <button class="button button--secondary" type="button" :autofocus="!options.focusConfirm" @click="emit('close', false)">
        {{ options.cancelLabel }}
      </button>
      <button class="button" :class="options.danger ? 'button--danger' : 'button--primary'"
        type="button" :autofocus="options.focusConfirm" @click="emit('close', true)">{{ options.confirmLabel }}</button>
    </div>
  </dialog>
</template>
