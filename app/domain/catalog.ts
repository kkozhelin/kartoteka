import { copy } from '../content/copy'
import { cloneContent, isContent, isRecord } from './notes'
import type { Note, NoteContent } from './notes'

const SCHEMA_VERSION = 1
const STARTER_TIME = Date.UTC(2025, 8, 1)

export interface Catalog {
  version: typeof SCHEMA_VERSION
  sequence: number
  notes: Note[]
}

export type CatalogChange =
  | { kind: 'upsert'; id: string; expected: number | null; content: NoteContent; time: number }
  | { kind: 'delete'; id: string; expected: number }

export type ChangeResult =
  | { ok: true; catalog: Catalog }
  | { ok: false; reason: 'missing' | 'conflict'; catalog: Catalog }

function isNote(value: unknown): value is Note {
  if (!isRecord(value) || !isContent(value)) return false
  const { id, updatedAt, revision } = value
  return typeof id === 'string' && typeof updatedAt === 'number' && Number.isFinite(updatedAt)
    && typeof revision === 'number' && Number.isSafeInteger(revision) && revision >= 1
}

export function initialCatalog(): Catalog {
  return {
    version: SCHEMA_VERSION,
    sequence: 0,
    notes: copy.demo.map(({ title, tasks, complete }, index) => ({
      id: 'sample-' + (index + 1),
      revision: 1,
      updatedAt: STARTER_TIME - index,
      title,
      todos: tasks.map((text, taskIndex) => ({ id: 'task-' + taskIndex, text, done: taskIndex < complete })),
    })),
  }
}

export function parseCatalog(value: unknown): Catalog {
  if (value === undefined) return initialCatalog()
  if (isRecord(value) && value.version === SCHEMA_VERSION
    && typeof value.sequence === 'number' && Number.isSafeInteger(value.sequence) && value.sequence >= 0
    && Array.isArray(value.notes) && value.notes.every(isNote)
    && new Set(value.notes.map(note => note.id)).size === value.notes.length) {
    return { version: SCHEMA_VERSION, sequence: value.sequence, notes: value.notes }
  }
  throw new Error('Unsupported or invalid catalog schema')
}

export function changeCatalog(catalog: Catalog, change: CatalogChange): ChangeResult {
  const current = catalog.notes.find(note => note.id === change.id)

  if (!current && change.expected !== null) return { ok: false, reason: 'missing', catalog }
  if ((current?.revision ?? null) !== change.expected) return { ok: false, reason: 'conflict', catalog }

  const rest = catalog.notes.filter(note => note.id !== change.id)
  const notes = change.kind === 'delete' ? rest : [{
    ...cloneContent(change.content),
    id: change.id,
    updatedAt: change.time,
    revision: (current?.revision ?? 0) + 1,
  }, ...rest]

  return { ok: true, catalog: { ...catalog, sequence: catalog.sequence + 1, notes } }
}
