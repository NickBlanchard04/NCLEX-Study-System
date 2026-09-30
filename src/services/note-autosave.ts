import type { Note } from '../app/types'

// Flush on navigation/pagehide as well as inactivity; never save untouched blanks.
export function createNoteAutosave(save: (note: Note) => void, delay = 500) {
  let pending: Note | null = null
  let timer: ReturnType<typeof setTimeout> | undefined
  const flush = () => {
    clearTimeout(timer)
    if (!pending) return
    const note = pending
    pending = null
    save(note)
  }
  return {
    flush,
    schedule(note: Note) {
      pending = note
      clearTimeout(timer)
      timer = setTimeout(flush, delay)
    },
  }
}
