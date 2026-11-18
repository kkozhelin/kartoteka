import { computed, onBeforeUnmount, onMounted, ref, shallowRef } from 'vue'
import { applyEdit, createHistory } from '../domain/history'
import type { Edit } from '../domain/history'
import { readDraft, writeDraft } from '../domain/drafts'
import {
  cloneContent, DRAFT_DELAY, emptyNote, INPUT_DELAY, makeId, sameContent,
} from '../domain/notes'
import type { Draft } from '../domain/drafts'
import type { Note, NoteContent } from '../domain/notes'

type TextEdit = Extract<Edit, { kind: 'title' | 'text' }>

export function useNoteEditor(id: string) {
  const history = createHistory()
  const base = shallowRef<NoteContent>(emptyNote())
  const baseRevision = ref<number | null>(null)
  const content = ref(emptyNote())
  const restored = ref(false)
  const historyVersion = ref(0)
  const pending = shallowRef<TextEdit>()
  const draftError = ref(false)
  let inputTimer: ReturnType<typeof setTimeout> | undefined
  let draftTimer: ReturnType<typeof setTimeout> | undefined
  let draftEnabled = false

  const dirty = computed(() => restored.value || !sameContent(base.value, content.value))
  const canUndo = computed(() => {
    void historyVersion.value
    return history.canUndo || (!!pending.value && pending.value.before !== pending.value.after)
  })
  const canRedo = computed(() => {
    void historyVersion.value
    return history.canRedo && (!pending.value || pending.value.before === pending.value.after)
  })

  function flushText() {
    clearTimeout(inputTimer)
    const edit = pending.value
    if (!edit) return
    history.record(edit)
    pending.value = undefined
    historyVersion.value++
  }

  function flushDraft() {
    clearTimeout(draftTimer)
    if (!draftEnabled) return
    try {
      writeDraft(window.sessionStorage, id, dirty.value
        ? { baseRevision: baseRevision.value, content: content.value }
        : null)
      draftError.value = false
    } catch {
      draftError.value = true
    }
  }

  function scheduleDraft() {
    clearTimeout(draftTimer)
    draftTimer = setTimeout(flushDraft, DRAFT_DELAY)
  }

  function updateText(value: string, todoId?: string) {
    const todo = todoId === undefined ? undefined : content.value.todos.find(item => item.id === todoId)
    if (todoId !== undefined && !todo) return

    const lastValue = todo?.text ?? content.value.title
    if (value === lastValue) return

    const previous = pending.value
    const sameField = previous && (todoId === undefined
      ? previous.kind === 'title'
      : previous.kind === 'text' && previous.id === todoId)
    if (!sameField) flushText()

    const before = sameField ? previous.before : lastValue
    const edit: TextEdit = todoId === undefined
      ? { kind: 'title', before, after: value }
      : { kind: 'text', id: todoId, before, after: value }

    applyEdit(content.value, edit, true)
    pending.value = edit
    clearTimeout(inputTimer)
    inputTimer = setTimeout(flushText, INPUT_DELAY)
    scheduleDraft()
  }

  function change(edit: Edit) {
    flushText()
    applyEdit(content.value, edit, true)
    history.record(edit)
    historyVersion.value++
    scheduleDraft()
  }

  function add() {
    const id = makeId()
    change({ kind: 'insert', index: content.value.todos.length, todo: { id, text: '', done: false } })
    return id
  }

  function remove(id: string) {
    const index = content.value.todos.findIndex(todo => todo.id === id)
    const todo = content.value.todos[index]
    if (todo) change({ kind: 'remove', index, todo: { ...todo } })
  }

  function toggle(id: string, done: boolean) {
    const todo = content.value.todos.find(item => item.id === id)
    if (todo && todo.done !== done) change({ kind: 'done', id, before: todo.done, after: done })
  }

  function travel(direction: 'undo' | 'redo') {
    flushText()
    if (direction === 'undo' ? !history.canUndo : !history.canRedo) return
    history[direction](content.value)
    historyVersion.value++
    scheduleDraft()
  }

  function reset(note?: Note) {
    clearTimeout(inputTimer)
    clearTimeout(draftTimer)
    pending.value = undefined
    restored.value = false
    baseRevision.value = note?.revision ?? null
    base.value = note ? cloneContent(note) : emptyNote()
    content.value = cloneContent(base.value)
    history.clear()
    historyVersion.value++
  }

  function loadDraft() {
    try {
      return readDraft(window.sessionStorage, id)
    } catch {
      draftError.value = true
      return null
    }
  }

  function restore(draft: Draft) {
    baseRevision.value = draft.baseRevision
    content.value = cloneContent(draft.content)
    restored.value = !sameContent(base.value, draft.content)
    if (!restored.value) flushDraft()
  }

  function clearDraft() {
    clearTimeout(draftTimer)
    draftEnabled = false
    try {
      writeDraft(window.sessionStorage, id, null)
      draftError.value = false
    } catch {
      draftError.value = true
    }
  }

  function enableDraft() {
    draftEnabled = true
  }

  function onVisibility() {
    if (document.visibilityState === 'hidden') flushDraft()
  }

  onMounted(() => {
    window.addEventListener('pagehide', flushDraft)
    document.addEventListener('visibilitychange', onVisibility)
  })

  onBeforeUnmount(() => {
    flushDraft()
    clearTimeout(inputTimer)
    window.removeEventListener('pagehide', flushDraft)
    document.removeEventListener('visibilitychange', onVisibility)
  })

  return {
    content, baseRevision, dirty, canUndo, canRedo, draftError, reset, loadDraft,
    restore, clearDraft, enableDraft, flushText, updateText, add, remove, toggle, travel,
  }
}
