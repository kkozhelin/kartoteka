<script setup lang="ts">
import { computed } from 'vue'
import { copy } from '../content/copy'
import { completedCount, notePath, PREVIEW_LIMIT, progressPercent } from '../domain/notes'
import type { Note } from '../domain/notes'

const props = defineProps<{ note: Note; index: number; busy: boolean }>()
defineEmits<{ remove: [note: Note] }>()
const done = computed(() => completedCount(props.note.todos))
const preview = computed(() => props.note.todos.slice(0, PREVIEW_LIMIT))
const extra = computed(() => props.note.todos.length - preview.value.length)
const palette = ['leaf', 'rose', 'blue', 'sand'] as const
</script>

<template>
  <article class="note-card" :data-tone="palette[index % palette.length]">
    <div class="note-card__head">
      <span class="note-card__tab"><AppIcon name="note" /></span>
      <button class="icon-button note-card__trash" type="button" :disabled="busy"
        :aria-label="copy.deleteNote(note.title)" :title="copy.deleteNote(note.title)" @click="$emit('remove', note)">
        <AppIcon name="trash" />
      </button>
    </div>
    <h3><NuxtLink class="note-card__link" :to="notePath(note.id)" :aria-label="copy.edit(note.title)">
      {{ note.title }}<AppIcon name="arrow" />
    </NuxtLink></h3>
    <ul v-if="preview.length" class="note-card__tasks">
      <li v-for="task in preview" :key="task.id" :class="{ complete: task.done }">
        <input class="check check--preview" type="checkbox" :checked="task.done" :aria-label="task.text" disabled>
        <span>{{ task.text }}</span>
      </li>
    </ul>
    <p v-else class="note-card__empty">{{ copy.noTasks }}</p>
    <div class="note-card__foot">
      <span>{{ copy.taskProgress(done, note.todos.length) }}</span>
      <span v-if="extra">{{ copy.previewMore(extra) }}</span>
    </div>
    <div class="progress-track" aria-hidden="true">
      <div :style="{ width: progressPercent(done, note.todos.length) + '%' }" />
    </div>
  </article>
</template>
