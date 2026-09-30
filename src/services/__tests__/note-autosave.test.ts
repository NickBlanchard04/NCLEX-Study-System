import { afterEach, describe, expect, it, vi } from 'vitest'
import { createNoteAutosave } from '../note-autosave'
import type { Note } from '../../app/types'
const note: Note = { id: 'test', title: 'Title', body: 'Body', category: 'General', updatedAt: '2026-09-29' }
afterEach(() => vi.useRealTimers())
describe('note autosave', () => {
  it('debounces edits and saves only the latest version', () => {
    vi.useFakeTimers()
    const save = vi.fn()
    const autosave = createNoteAutosave(save)
    autosave.schedule(note)
    autosave.schedule({ ...note, body: 'Latest' })
    vi.advanceTimersByTime(500)
    expect(save).toHaveBeenCalledTimes(1)
    expect(save.mock.calls[0][0].body).toBe('Latest')
  })
  it('flushes on navigation without a duplicate delayed write', () => {
    vi.useFakeTimers()
    const save = vi.fn()
    const autosave = createNoteAutosave(save)
    autosave.schedule(note)
    autosave.flush()
    vi.runAllTimers()
    expect(save).toHaveBeenCalledTimes(1)
  })
  it('does not create untouched notes', () => {
    const save = vi.fn()
    createNoteAutosave(save).flush()
    expect(save).not.toHaveBeenCalled()
  })
})
