import { describe, expect, it } from 'vitest'
import { questionBank } from '../content'

const metadataNoisePattern = /\b(?:focus area|blueprint)\s*:/i

describe('generated question content', () => {
  it('keeps blueprint metadata out of visible generated text', () => {
    const generatedQuestions = questionBank
      .filter((question) => question.contentQuality === 'generated-starter')
      .slice(0, 40)

    expect(generatedQuestions.length).toBeGreaterThan(0)

    generatedQuestions.forEach((question) => {
      const visibleText = [
        question.scenario,
        question.prompt,
        question.rationale.whyCorrect,
        question.rationale.whyOthers,
        question.choices.map((choice) => choice.text).join(' '),
      ]
        .filter(Boolean)
        .join(' ')

      expect(visibleText).not.toMatch(metadataNoisePattern)
      expect(question.contentFingerprint).toBeTruthy()
      expect(question.contentFingerprint).not.toMatch(metadataNoisePattern)
    })
  })
})
