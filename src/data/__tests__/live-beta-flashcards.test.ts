import { describe, expect, it } from 'vitest'
import { loadLiveBetaFlashcards } from '../content'
import { liveBetaBatchExpectedCounts, liveBetaBatchFlashcards } from '../live-beta-flashcards'

describe('live beta flashcard batches', () => {
  it('loads every manifest batch into the route-scoped flashcard inventory', async () => {
    const loadedFlashcards = await loadLiveBetaFlashcards()
    const totalExpected = Object.values(liveBetaBatchExpectedCounts).reduce((sum, count) => sum + count, 0)
    expect(loadedFlashcards).toHaveLength(totalExpected)
    expect(loadedFlashcards).toBe(liveBetaBatchFlashcards)

    Object.entries(liveBetaBatchExpectedCounts).forEach(([batchId, expectedCount]) => {
      const batchCards = loadedFlashcards.filter((card) => card.sourcePackId === batchId)
      expect(batchCards, batchId).toHaveLength(expectedCount)
    })
  })

  it('keeps promoted cards in live beta draft posture with feedback enabled', () => {
    liveBetaBatchFlashcards.forEach((card) => {
      expect(card.examTrack).toBe('nclex-rn')
      expect(card.contentQuality).toBe('authored-draft')
      expect(card.sourceStatus).toBe('source_needed')
      expect(card.sourceMapStatus).toBe('candidate_mapped_not_verified')
      expect(card.clinicalReviewStatus).toBe('not_sme_reviewed')
      expect(card.contentStage).toBe('beta_draft')
      expect(card.learnerVisible).toBe(true)
      expect(card.visibility).toBe('learner')
      expect(card.countsTowardOfficialReadiness).toBe(false)
      expect(card.feedbackEnabled).toBe(true)
      expect(card.fixtureId).toBe(`LIVE-BETA-${card.sourcePackId}`)
      expect(card.sourceNeededClaims?.length).toBeGreaterThan(0)
      expect(card.front.length).toBeGreaterThan(0)
      expect(card.back.length).toBeGreaterThan(0)
    })
  })
})
