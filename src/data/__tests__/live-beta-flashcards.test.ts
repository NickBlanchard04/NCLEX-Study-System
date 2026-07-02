import { describe, expect, it } from 'vitest'
import { flashcards } from '../content'
import { liveBetaBatchExpectedCounts, liveBetaBatchFlashcards } from '../live-beta-flashcards'

describe('live beta flashcard batches', () => {
  it('promotes manifest batches into the core flashcard inventory', () => {
    const totalExpected = Object.values(liveBetaBatchExpectedCounts).reduce((sum, count) => sum + count, 0)
    expect(liveBetaBatchFlashcards).toHaveLength(totalExpected)

    Object.entries(liveBetaBatchExpectedCounts).forEach(([batchId, expectedCount]) => {
      const batchCards = liveBetaBatchFlashcards.filter((card) => card.sourcePackId === batchId)
      expect(batchCards, batchId).toHaveLength(expectedCount)
      batchCards.forEach((card) => {
        expect(flashcards.some((inventoryCard) => inventoryCard.id === card.id), card.id).toBe(true)
      })
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
