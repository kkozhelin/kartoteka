import { HISTORY_LIMIT } from './notes'
import type { NoteContent, Todo } from './notes'

export type Edit =
  | { kind: 'title'; before: string; after: string }
  | { kind: 'text'; id: string; before: string; after: string }
  | { kind: 'done'; id: string; before: boolean; after: boolean }
  | { kind: 'insert' | 'remove'; index: number; todo: Todo }

export function applyEdit(content: NoteContent, edit: Edit, forward: boolean): void {
  switch (edit.kind) {
    case 'title':
      content.title = forward ? edit.after : edit.before
      break
    case 'text':
    case 'done': {
      const todo = content.todos.find(item => item.id === edit.id)
      if (!todo) return
      if (edit.kind === 'text') todo.text = forward ? edit.after : edit.before
      else todo.done = forward ? edit.after : edit.before
      break
    }
    default:
      if ((edit.kind === 'insert') === forward) content.todos.splice(edit.index, 0, { ...edit.todo })
      else content.todos.splice(edit.index, 1)
  }
}

export function createHistory(limit = HISTORY_LIMIT) {
  let edits: Edit[] = []
  let cursor = 0

  return {
    get canUndo() { return cursor > 0 },
    get canRedo() { return cursor < edits.length },
    record(edit: Edit) {
      if ('before' in edit && edit.before === edit.after) return
      edits.splice(cursor)
      edits.push(edit)
      if (edits.length > limit) edits.shift()
      cursor = edits.length
    },
    undo(content: NoteContent) {
      const edit = edits[cursor - 1]
      if (!edit) return
      applyEdit(content, edit, false)
      cursor--
    },
    redo(content: NoteContent) {
      const edit = edits[cursor]
      if (!edit) return
      applyEdit(content, edit, true)
      cursor++
    },
    clear() {
      edits = []
      cursor = 0
    },
  }
}
