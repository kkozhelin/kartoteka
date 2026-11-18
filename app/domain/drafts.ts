import { cloneContent, isContent, isRecord } from './notes'
import type { NoteContent } from './notes'

const DRAFT_PREFIX = 'kartoteka.draft.'
const DRAFT_VERSION = 1

export interface Draft {
  baseRevision: number | null
  content: NoteContent
}

export function readDraft(storage: Storage, id: string): Draft | null {
  const raw = storage.getItem(DRAFT_PREFIX + id)
  if (!raw) return null

  let value: unknown
  try {
    value = JSON.parse(raw)
  } catch {
    return null
  }
  if (!isRecord(value) || value.version !== DRAFT_VERSION || !isContent(value.content)) return null
  const revision = value.baseRevision
  if (revision !== null && (typeof revision !== 'number' || !Number.isSafeInteger(revision) || revision < 1)) return null
  return { content: cloneContent(value.content), baseRevision: revision }
}

export function writeDraft(storage: Storage, id: string, draft: Draft | null): void {
  const key = DRAFT_PREFIX + id
  if (draft) storage.setItem(key, JSON.stringify({ version: DRAFT_VERSION, ...draft }))
  else storage.removeItem(key)
}
