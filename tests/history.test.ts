import { describe, expect, it } from 'vitest'
import { applyEdit, createHistory } from '../app/domain/history'
import type { Edit } from '../app/domain/history'
import { emptyNote, HISTORY_LIMIT } from '../app/domain/notes'

function setup() {
  const content = emptyNote()
  const history = createHistory()
  function commit(edit: Edit) {
    applyEdit(content, edit, true)
    history.record(edit)
  }
  return { content, history, commit }
}

describe('edit history', () => {
  it('undoes and redoes an entire input batch as one step', () => {
    const { content, history, commit } = setup()
    commit({ kind: 'title', before: '', after: 'Мои дела' })
    history.undo(content)
    expect(content.title).toBe('')
    expect(history.canUndo).toBe(false)
    history.redo(content)
    expect(content.title).toBe('Мои дела')
    expect(history.canRedo).toBe(false)
  })

  it('preserves task identity, text and position across atomic steps', () => {
    const { content, history, commit } = setup()
    const task = { id: 'a', text: '', done: false }
    commit({ kind: 'insert', index: 0, todo: task })
    commit({ kind: 'insert', index: 1, todo: { id: 'b', text: 'Вторая задача', done: false } })
    commit({ kind: 'text', id: 'a', before: '', after: 'Первая задача' })
    commit({ kind: 'done', id: 'a', before: false, after: true })
    commit({ kind: 'remove', index: 0, todo: { id: 'a', text: 'Первая задача', done: true } })
    expect(content.todos.map(todo => todo.id)).toEqual(['b'])
    history.undo(content)
    expect(content.todos[0]).toEqual({ id: 'a', text: 'Первая задача', done: true })
    history.undo(content)
    expect(content.todos[0]?.done).toBe(false)
    history.undo(content)
    expect(content.todos[0]?.text).toBe('')
    history.redo(content)
    history.redo(content)
    history.redo(content)
    expect(content.todos.map(todo => todo.id)).toEqual(['b'])
  })

  it('clears redo only on a meaningful new edit', () => {
    const { content, history, commit } = setup()
    commit({ kind: 'title', before: '', after: 'A' })
    history.undo(content)
    commit({ kind: 'title', before: '', after: '' })
    expect(history.canRedo).toBe(true)
    commit({ kind: 'title', before: '', after: 'B' })
    expect(history.canRedo).toBe(false)
    history.redo(content)
    expect(content.title).toBe('B')
  })

  it('retains exactly the last 50 steps and clears them between sessions', () => {
    const { content, history, commit } = setup()
    for (let index = 1; index <= HISTORY_LIMIT + 3; index++) {
      commit({ kind: 'title', before: content.title, after: String(index) })
    }
    for (let index = 0; index < HISTORY_LIMIT + 1; index++) history.undo(content)
    expect(content.title).toBe('3')
    expect(history.canUndo).toBe(false)
    expect(history.canRedo).toBe(true)
    history.clear()
    expect(history.canRedo).toBe(false)
    expect(history.canUndo).toBe(false)
  })
})
