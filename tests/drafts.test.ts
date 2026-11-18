import { describe, expect, it, vi } from 'vitest'
import { readDraft, writeDraft } from '../app/domain/drafts'

function fakeStorage(): Storage {
  const values = new Map<string, string>()
  return {
    get length() { return values.size },
    key: index => Array.from(values.keys())[index] ?? null,
    getItem: vi.fn(key => values.get(key) ?? null),
    setItem: vi.fn((key, value) => { values.set(key, value) }),
    removeItem: key => { values.delete(key) },
    clear: () => values.clear(),
  }
}

describe('session drafts', () => {
  it('keeps content and original revision, independently per note', () => {
    const storage = fakeStorage()
    const draft = { baseRevision: 2, content: { title: 'Черновик', todos: [] } }
    writeDraft(storage, 'first', draft)
    writeDraft(storage, 'second', { ...draft, baseRevision: null })
    expect(readDraft(storage, 'first')).toEqual(draft)
    expect(readDraft(storage, 'second')?.baseRevision).toBeNull()
    writeDraft(storage, 'first', null)
    expect(readDraft(storage, 'first')).toBeNull()
    expect(readDraft(storage, 'second')).not.toBeNull()
  })

  it('ignores malformed or unsupported data', () => {
    const storage = fakeStorage()
    vi.mocked(storage.getItem).mockReturnValueOnce('{').mockReturnValueOnce('{"version":4}')
    expect(readDraft(storage, 'first')).toBeNull()
    expect(readDraft(storage, 'first')).toBeNull()
  })
})
