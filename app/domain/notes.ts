export interface Todo {
  id: string
  text: string
  done: boolean
}

export interface NoteContent {
  title: string
  todos: Todo[]
}

export interface Note extends NoteContent {
  id: string
  updatedAt: number
  revision: number
}

export const NEW_NOTE = 'new'
export const HISTORY_LIMIT = 50
export const PREVIEW_LIMIT = 3
export const DRAFT_DELAY = 300
export const INPUT_DELAY = 650

export const locale = 'ru-RU'
export const notePath = (id: string) => '/notes/' + encodeURIComponent(id)
export const emptyNote = (): NoteContent => ({ title: '', todos: [] })
export const cloneContent = ({ title, todos }: NoteContent): NoteContent => ({
  title,
  todos: todos.map(todo => ({ ...todo })),
})
export const completedCount = (todos: Todo[]) => todos.filter(todo => todo.done).length
export const progressPercent = (done: number, total: number) => total ? Math.round(100 * done / total) : 0

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

export function isContent(value: unknown): value is NoteContent {
  return isRecord(value) && typeof value.title === 'string' && Array.isArray(value.todos)
    && value.todos.every(todo => isRecord(todo) && typeof todo.id === 'string'
      && typeof todo.text === 'string' && typeof todo.done === 'boolean')
    && new Set(value.todos.map(todo => todo.id)).size === value.todos.length
}

export function sameContent(a: NoteContent, b: NoteContent): boolean {
  return a.title === b.title && a.todos.length === b.todos.length
    && a.todos.every((todo, index) => {
      const other = b.todos[index]
      return other?.id === todo.id && other.text === todo.text && other.done === todo.done
    })
}

export function makeId(): string {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  return Array.from(crypto.getRandomValues(new Uint8Array(16)), byte => byte.toString(16).padStart(2, '0')).join('')
}
