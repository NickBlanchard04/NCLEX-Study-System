import { describe, expect, it } from 'vitest'
import { flashcards } from '../content'

const visibleMinimumCategories = [
  'Leadership / Prioritization / Delegation',
  'Safe and Effective Care Environment',
  'Health Promotion and Maintenance',
  'Pharmacology',
  'Lab Values / Clinical Judgment',
  'Fundamentals & Safety',
  'Strategy',
  'Maternal-Newborn',
  'Pediatrics',
  'Mental Health',
  'Adult Health / Med-Surg',
  'Science',
  'Mathematics',
  'Reading',
  'English and Language Usage',
  'Management of Care',
  'Safety and Infection Control',
  'Health Promotion',
  'Psychosocial Integrity',
  'Physiological Integrity',
]

describe('flashcard category coverage', () => {
  it('keeps visible dropdown categories at ten or more core cards', () => {
    const countsByCategory = flashcards.reduce((counts, card) => {
      counts.set(card.category, (counts.get(card.category) ?? 0) + 1)
      return counts
    }, new Map<string, number>())

    visibleMinimumCategories.forEach((category) => {
      expect(countsByCategory.get(category) ?? 0, category).toBeGreaterThanOrEqual(10)
    })
  })

  it('keeps category-minimum expansion cards source-needed and not SME reviewed', () => {
    const expansionCards = flashcards.filter((card) => card.id.startsWith('fc-min-'))

    expect(expansionCards.length).toBeGreaterThan(0)
    expansionCards.forEach((card) => {
      expect(card.contentQuality).toBe('authored-draft')
      expect(card.sourceStatus).toBe('source_needed')
      expect(card.clinicalReviewStatus).toBe('not_sme_reviewed')
      expect(card.contentStage).toBe('beta_draft')
      expect(card.countsTowardOfficialReadiness).toBe(false)
      expect(card.feedbackEnabled).toBe(true)
    })
  })
})
