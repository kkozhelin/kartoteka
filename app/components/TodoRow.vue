<script setup lang="ts">
import { copy } from '../content/copy'
import type { Todo } from '../domain/notes'

defineProps<{ todo: Todo; index: number; invalid: boolean }>()
const emit = defineEmits<{
  text: [value: string]
  toggle: [value: boolean]
  remove: []
  blur: []
}>()

function onInput(event: Event) {
  const input = event.currentTarget as HTMLInputElement
  if (!(event instanceof InputEvent && event.isComposing)) emit('text', input.value)
}
</script>

<template>
  <li class="todo-row" :class="{ 'todo-row--done': todo.done }">
    <input class="check" type="checkbox" :checked="todo.done" :aria-label="copy.toggleTask(index + 1)"
      @change="emit('toggle', ($event.currentTarget as HTMLInputElement).checked)">
    <input :id="'task-' + todo.id" class="todo-row__text" type="text" :value="todo.text"
      :placeholder="copy.taskPlaceholder" :aria-label="copy.taskLabel(index + 1)"
      :aria-invalid="invalid || undefined" :aria-describedby="invalid ? 'task-error' : undefined"
      @input="onInput" @compositionend="onInput" @blur="emit('blur')">
    <button class="icon-button todo-row__remove" type="button" :title="copy.removeTask(index + 1)"
      :aria-label="copy.removeTask(index + 1)" @click="emit('remove')">
      <AppIcon name="close" />
    </button>
  </li>
</template>
