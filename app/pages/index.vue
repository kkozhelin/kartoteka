<script setup lang="ts">
import { copy } from '../content/copy'
import { completedCount, NEW_NOTE, notePath, progressPercent } from '../domain/notes'
import type { Note } from '../domain/notes'

const store = useCatalogStore()
const { $catalogRepository, $notifyCatalogChanged } = useNuxtApp()
const { dialog, ask, close } = useConfirmation()
const busy = ref(false)
const failed = ref(false)
const total = computed(() => store.notes.reduce((sum, note) => sum + note.todos.length, 0))
const done = computed(() => store.notes.reduce((sum, note) => sum + completedCount(note.todos), 0))

useHead({ title: copy.brand })

async function remove(note: Note) {
  const confirmed = await ask({
    title: copy.deleteTitle, description: copy.deleteDescription(note.title),
    confirmLabel: copy.delete, cancelLabel: copy.cancel, danger: true,
  })
  if (!confirmed) return
  failed.value = false
  busy.value = true
  try {
    const result = await store.commit($catalogRepository, {
      kind: 'delete', id: note.id, expected: note.revision,
    })
    if (result.ok) $notifyCatalogChanged()
    else if (result.reason === 'conflict') failed.value = true
  } catch {
    failed.value = true
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <main id="main" class="shell home" tabindex="-1">
    <section class="hero" aria-labelledby="hero-title">
      <div class="hero__body">
        <h1 id="hero-title">{{ copy.heroTitle[0] }}<br><em>{{ copy.heroTitle[1] }}</em></h1>
        <p>{{ copy.heroDescription }}</p>
        <NuxtLink class="button button--mint" :to="notePath(NEW_NOTE)">
          <AppIcon name="plus" />{{ copy.newNote }}
        </NuxtLink>
      </div>
      <IndexIllustration />
    </section>

    <p v-if="store.readError" class="notice notice--error" role="alert">{{ copy.storageError }}</p>
    <p v-if="failed" class="notice notice--error" role="alert">{{ copy.writeError }}</p>
    <p v-if="!store.ready && !store.readError" class="notice" role="status">{{ copy.loading }}</p>

    <template v-if="store.ready">
      <dl class="metrics">
        <div><dt>{{ copy.totalHeading }}</dt><dd>{{ total }}</dd></div>
        <div><dt>{{ copy.doneHeading }}</dt><dd>{{ done }}</dd></div>
        <div class="metrics__progress"><dt>{{ copy.progressHeading }}</dt>
          <dd>{{ progressPercent(done, total) }}%</dd>
          <div class="progress-track" aria-hidden="true"><div :style="{ width: progressPercent(done, total) + '%' }" /></div>
        </div>
      </dl>

      <section aria-labelledby="shelf-title">
        <div class="shelf-head">
          <h2 id="shelf-title">{{ copy.notesHeading }}</h2>
          <span>{{ copy.notesCount(store.notes.length) }}</span>
        </div>
        <div v-if="store.notes.length" class="note-grid">
          <NoteCard v-for="(note, index) in store.notes" :key="note.id"
            :note="note" :index="index" :busy="busy" @remove="remove" />
        </div>
        <div v-else class="empty">
          <span class="empty__icon"><AppIcon name="archive" /></span>
          <h3>{{ copy.noNotes }}</h3>
          <p>{{ copy.noNotesDescription }}</p>
          <NuxtLink class="button button--primary" :to="notePath(NEW_NOTE)"><AppIcon name="plus" />{{ copy.newNote }}</NuxtLink>
        </div>
      </section>
    </template>
    <ConfirmDialog v-if="dialog" :options="dialog" @close="close" />
  </main>
</template>
