import { describe, expect, it } from 'vitest'
import { getExamSystems } from '../../data/content'
import { studySystemArtwork } from '../study-system-artwork'

describe('NCLEX-RN system illustrations', () => {
  it('keeps the book for All systems and uses the safety shield for Fundamentals', () => {
    expect(studySystemArtwork.All).toBe('/images/exam-prep/all-topics.webp')
    expect(studySystemArtwork.Fundamentals).toBe('/images/question-bank/systems/fundamentals.webp')
    expect(studySystemArtwork.Fundamentals).not.toBe(studySystemArtwork.All)
  })
  it('has an artwork path for every system and All systems', () => {
    for (const system of ['All', ...getExamSystems('nclex-rn')]) {
      expect(studySystemArtwork[system], system).toBeTruthy()
      expect(studySystemArtwork[system], system).toMatch(/^\/images\/.+\.webp$/)
    }
  })
})
