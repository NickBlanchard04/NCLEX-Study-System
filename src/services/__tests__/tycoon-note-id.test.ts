import { afterEach, describe, expect, it, vi } from 'vitest'
import { getTycoonPatientNoteId } from '../tycoon-note-id'

afterEach(() => vi.unstubAllGlobals())

describe('tycoon patient note identity', () => {
  it('creates the same valid UUID v8 when reopening a patient note', async () => {
    const first = await getTycoonPatientNoteId('tycoon-shift-m0abc-123def', 'f-101')
    const reopened = await getTycoonPatientNoteId('tycoon-shift-m0abc-123def', 'f-101')

    expect(first).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-8[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)
    expect(reopened).toBe(first)
  })

  it('keeps different patients and repeat shifts in separate notes', async () => {
    const ids = await Promise.all([
      getTycoonPatientNoteId('shift-one', 'f-101'),
      getTycoonPatientNoteId('shift-one', 'f-102'),
      getTycoonPatientNoteId('shift-two', 'f-101'),
    ])

    expect(new Set(ids).size).toBe(3)
  })

  it('keeps distinct shift and patient tuples separate even when concatenation would collide', async () => {
    const first = await getTycoonPatientNoteId('shift-a', 'b-c')
    const second = await getTycoonPatientNoteId('shift-a-b', 'c')

    expect(first).not.toBe(second)
  })

  it('reports unavailable Web Crypto instead of returning an invalid storage ID', async () => {
    vi.stubGlobal('crypto', undefined)

    await expect(getTycoonPatientNoteId('shift-one', 'f-101')).rejects.toThrow(
      'Secure note storage is unavailable',
    )
  })
})
