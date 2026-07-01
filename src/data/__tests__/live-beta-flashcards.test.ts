import { describe, expect, it } from 'vitest'
import { flashcards } from '../content'
import { liveBetaBatchFlashcards } from '../live-beta-flashcards'

const promotedBatchIds = [
  'FC-RN-DIABETES-TEACHING-0001',
  'FC-RN-OXYGENATION-0001',
] as const

describe('live beta flashcard batches', () => {
  it('promotes the diabetes and oxygenation batches into the core flashcard inventory', () => {
    expect(liveBetaBatchFlashcards).toHaveLength(80)

    promotedBatchIds.forEach((batchId) => {
      const batchCards = liveBetaBatchFlashcards.filter((card) => card.sourcePackId === batchId)
      expect(batchCards, batchId).toHaveLength(40)
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
      expect(card.clinicalReviewStatus).toBe('not_sme_reviewed')
      expect(card.contentStage).toBe('beta_draft')
      expect(card.learnerVisible).toBe(true)
      expect(card.visibility).toBe('learner')
      expect(card.countsTowardOfficialReadiness).toBe(false)
      expect(card.feedbackEnabled).toBe(true)
      expect(card.sourceNeededClaims?.length).toBeGreaterThan(0)
      expect(card.front.length).toBeGreaterThan(0)
      expect(card.back.length).toBeGreaterThan(0)
    })
  })
})
