<script setup lang="ts">
import { onBeforeRouteLeave, onBeforeRouteUpdate } from 'vue-router'
import { copy } from '../../content/copy'
import { completedCount, makeId, NEW_NOTE, progressPercent } from '../../domain/notes'
import type { NoteContent } from '../../domain/notes'
import type { Draft } from '../../domain/drafts'

definePageMeta({ key: route => String(route.params.id) })

const id = String(useRoute().params.id)
const isNew = id === NEW_NOTE
const store = useCatalogStore()
const { $catalogRepository, $notifyCatalogChanged } = useNuxtApp()
const { dialog, ask, close } = useConfirmation()
const editor = useNoteEditor(id)
const { content, dirty, canUndo, canRedo, draftError, baseRevision } = editor
const current = computed(() => store.notes.find(note => note.id === id))
const initialized = ref(false)
const pendingDraft = shallowRef<Draft>()
const recoveredMissing = ref(false)
const busy = ref(false)
const submitAttempted = ref(false)
const error = ref(false)
const titleInput = ref<HTMLInputElement>()
const addButton = ref<HTMLButtonElement>()
let leaving = false

const available = computed(() => isNew || baseRevision.value !== null || recoveredMissing.value)
const conflict = computed(() => !isNew && available.value && current.value?.revision !== baseRevision.value)
const done = computed(() => completedCount(content.value.todos))
const total = computed(() => content.value.todos.length)
const invalidTitle = computed(() => submitAttempted.value && !content.value.title.trim())
const invalidTodos = computed(() => submitAttempted.value && content.value.todos.some(todo => !todo.text.trim()))
const heading = isNew ? copy.newHeading : copy.editHeading

useHead({ title: heading + ' · ' + copy.brand })
useHistoryShortcuts(editor.travel, () => initialized.value && available.value
  && !dialog.value && !pendingDraft.value && !busy.value)

watch(() => store.ready, (ready) => {
  if (!ready || initialized.value) return
  editor.reset(current.value)
  pendingDraft.value = editor.loadDraft() ?? undefined
  initialized.value = true
  if (pendingDraft.value) void restorePrompt()
  else editor.enableDraft()
}, { immediate: true })

async function restorePrompt() {
  const draft = pendingDraft.value
  if (!draft) return
  const answer = await ask({
    title: copy.restoreTitle, description: copy.restoreDescription,
    confirmLabel: copy.restore, cancelLabel: copy.discardDraft, focusConfirm: true,
  })
  if (answer === undefined) return
  pendingDraft.value = undefined
  if (answer) {
    recoveredMissing.value = !isNew && !current.value
    editor.enableDraft()
    editor.restore(draft)
  } else {
    editor.clearDraft()
    editor.enableDraft()
  }
}

function confirmDiscard() {
  return ask({
    title: copy.discardTitle, description: copy.discardDescription,
    confirmLabel: copy.discard, cancelLabel: copy.continueEditing, danger: true,
  })
}

async function canLeave() {
  if (leaving) return true
  if (busy.value) return false
  if (!dirty.value) return true
  if (!await confirmDiscard()) return false
  editor.clearDraft()
  return true
}

onBeforeRouteLeave(canLeave)
onBeforeRouteUpdate((to, from) => to.params.id === from.params.id || canLeave())

async function goHome() {
  leaving = true
  await navigateTo('/')
}

async function discard() {
  if (!await confirmDiscard()) return
  editor.clearDraft()
  editor.reset(current.value)
  await goHome()
}

function focusTask(taskId: string | undefined) {
  if (taskId) document.getElementById('task-' + taskId)?.focus()
  else addButton.value?.focus()
}

async function addTask() {
  const taskId = editor.add()
  await nextTick()
  focusTask(taskId)
}

async function removeTask(taskId: string) {
  const index = content.value.todos.findIndex(todo => todo.id === taskId)
  const nextId = content.value.todos[index + 1]?.id ?? content.value.todos[index - 1]?.id
  editor.remove(taskId)
  await nextTick()
  focusTask(nextId)
}

async function save(asNew = false) {
  if (busy.value || (conflict.value && !asNew)) return
  editor.flushText()
  submitAttempted.value = true
  const title = content.value.title.trim()
  const blank = content.value.todos.find(todo => !todo.text.trim())
  if (!title) {
    titleInput.value?.focus()
    return
  }
  if (blank) {
    focusTask(blank.id)
    return
  }

  const clean: NoteContent = {
    title, todos: content.value.todos.map(todo => ({ ...todo, text: todo.text.trim() })),
  }
  error.value = false
  busy.value = true
  try {
    const result = await store.commit($catalogRepository, {
      kind: 'upsert', id: isNew || asNew ? makeId() : id,
      expected: asNew ? null : baseRevision.value, content: clean, time: Date.now(),
    })
    if (!result.ok) return
    $notifyCatalogChanged()
    editor.clearDraft()
    editor.reset()
    await goHome()
  } catch {
    error.value = true
  } finally {
    busy.value = false
  }
}

async function removeNote() {
  const note = current.value
  if (!note || busy.value || conflict.value) return
  const confirmed = await ask({
    title: copy.deleteTitle, description: copy.deleteDescription(note.title),
    confirmLabel: copy.delete, cancelLabel: copy.cancel, danger: true,
  })
  if (!confirmed) return
  busy.value = true
  error.value = false
  try {
    const result = await store.commit($catalogRepository, { kind: 'delete', id, expected: note.revision })
    if (!result.ok) return
    $notifyCatalogChanged()
    editor.clearDraft()
    editor.reset()
    await goHome()
  } catch {
    error.value = true
  } finally {
    busy.value = false
  }
}

async function reloadNote() {
  if (dirty.value && !await confirmDiscard()) return
  if (!current.value) return
  editor.clearDraft()
  editor.reset(current.value)
  editor.enableDraft()
  submitAttempted.value = false
  error.value = false
  await nextTick()
  titleInput.value?.focus()
}

function onTitleInput(event: Event) {
  const input = event.currentTarget as HTMLInputElement
  if (!(event instanceof InputEvent && event.isComposing)) editor.updateText(input.value)
}
</script>

<template>
  <main id="main" class="shell editor" tabindex="-1">
    <NuxtLink class="back-link" to="/"><AppIcon name="back" />{{ copy.back }}</NuxtLink>
    <header class="editor__heading">
      <h1>{{ heading }}</h1>
      <span v-if="initialized && available && !pendingDraft" class="editor__status"
        :class="{ 'editor__status--dirty': dirty }" role="status">
        <span aria-hidden="true" />{{ dirty ? copy.statusDirty : isNew ? copy.statusNew : copy.statusClean }}
      </span>
    </header>

    <p v-if="store.readError" class="notice notice--error" role="alert">{{ copy.storageError }}</p>
    <p v-if="error" class="notice notice--error" role="alert">{{ copy.writeError }}</p>
    <p v-if="draftError" class="notice notice--error" role="alert">{{ copy.statusDraftError }}</p>
    <p v-if="!initialized && !store.readError" class="notice" role="status">{{ copy.loading }}</p>

    <section v-else-if="pendingDraft" class="empty">
      <span class="empty__icon"><AppIcon name="note" /></span>
      <h2>{{ copy.restoreTitle }}</h2>
      <p>{{ copy.restoreDescription }}</p>
      <button class="button button--primary" type="button" @click="restorePrompt">{{ copy.restore }}</button>
    </section>

    <section v-else-if="initialized && !available" class="empty">
      <span class="empty__icon"><AppIcon name="archive" /></span>
      <h2>{{ copy.missingTitle }}</h2>
      <p>{{ copy.missingDescription }}</p>
      <NuxtLink class="button button--primary" to="/">{{ copy.back }}</NuxtLink>
    </section>

    <form v-else-if="initialized" class="editor-form" novalidate @submit.prevent="save(conflict)">
      <div v-if="conflict" class="notice notice--error editor-form__conflict" role="alert">
        <AppIcon name="info" />
        <div>
          <strong>{{ current ? copy.changedTitle : copy.removedTitle }}</strong>
          <p>{{ current ? copy.changedDescription : copy.removedDescription }}</p>
        </div>
        <button v-if="current" class="button button--secondary" type="button" :disabled="busy" @click="reloadNote">
          {{ copy.reloadNote }}
        </button>
      </div>

      <fieldset class="editor-form__paper" :disabled="busy">
        <div class="editor-form__toolbar" role="group" :aria-label="copy.shortcuts">
          <button class="icon-button" type="button" :disabled="!canUndo"
            :title="copy.undo + ' (' + copy.undoShortcut + ')'" :aria-label="copy.undo"
            :aria-keyshortcuts="copy.undoShortcut" @click="editor.travel('undo')"><AppIcon name="undo" /></button>
          <button class="icon-button" type="button" :disabled="!canRedo"
            :title="copy.redo + ' (' + copy.redoShortcut + ')'" :aria-label="copy.redo"
            :aria-keyshortcuts="copy.redoShortcut" @click="editor.travel('redo')"><AppIcon name="redo" /></button>
        </div>

        <label class="field-label" for="note-title">{{ copy.titleLabel }}</label>
        <input id="note-title" ref="titleInput" class="title-input" type="text" :value="content.title"
          :placeholder="copy.titlePlaceholder" :aria-invalid="invalidTitle || undefined"
          :aria-describedby="invalidTitle ? 'title-error' : undefined"
          @input="onTitleInput" @compositionend="onTitleInput" @blur="editor.flushText">
        <p v-if="invalidTitle" id="title-error" class="field-error" role="alert">{{ copy.titleRequired }}</p>

        <div class="tasks-head">
          <h2>{{ copy.tasksHeading }}</h2>
          <span>{{ copy.taskProgress(done, total) }}</span>
        </div>
        <div class="progress-track" aria-hidden="true"><div :style="{ width: progressPercent(done, total) + '%' }" /></div>

        <ul v-if="total" class="todo-list">
          <TodoRow v-for="(todo, index) in content.todos" :key="todo.id"
            :todo="todo" :index="index" :invalid="submitAttempted && !todo.text.trim()"
            @text="editor.updateText($event, todo.id)" @toggle="editor.toggle(todo.id, $event)"
            @blur="editor.flushText" @remove="removeTask(todo.id)" />
        </ul>
        <p v-else class="todo-list__empty">{{ copy.emptyEditor }}</p>
        <p v-if="invalidTodos" id="task-error" class="field-error" role="alert">{{ copy.taskRequired }}</p>
        <button ref="addButton" class="button button--add" type="button" @click="addTask">
          <AppIcon name="plus" />{{ copy.addTask }}
        </button>
      </fieldset>

      <div class="editor-form__footer">
        <button v-if="!isNew && !conflict" class="button button--quiet-danger" type="button" :disabled="busy"
          :aria-label="copy.deleteNote(current?.title ?? content.title)" @click="removeNote">
          <AppIcon name="trash" />{{ copy.delete }}
        </button>
        <div class="editor-form__actions">
          <button class="button button--secondary" type="button" :disabled="busy" @click="discard">{{ copy.cancel }}</button>
          <button class="button button--primary" type="submit" :disabled="busy">
            <AppIcon name="check" />{{ busy ? copy.saving : conflict ? copy.saveAsNew : copy.save }}
          </button>
        </div>
      </div>
    </form>
    <ConfirmDialog v-if="dialog" :options="dialog" @close="close" />
  </main>
</template>
