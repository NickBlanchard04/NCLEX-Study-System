import { describe, expect, it } from 'vitest'
import { questionBank } from '../content'

const metadataNoisePattern = /\b(?:focus area|blueprint)\s*:/i
const oldGeneratedDistractorCopy =
  'The distractors either delay needed action, move outside the role being tested, or skip the assessment and safety logic needed for clinical judgment.'
const generatedDistractorFallback = 'This choice does not best address the priority cue in the stem.'

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

  it('uses choice-level feedback instead of the old canned distractor rationale', () => {
    const generatedQuestion = questionBank.find((question) => question.contentQuality === 'generated-starter')

    expect(generatedQuestion).toBeTruthy()
    expect(generatedQuestion?.rationale.whyOthers).toBe(generatedDistractorFallback)
    expect(generatedQuestion?.rationale.whyOthers).not.toBe(oldGeneratedDistractorCopy)
    expect(Object.keys(generatedQuestion?.rationale.choices ?? {})).toEqual(
      generatedQuestion?.choices.map((choice) => choice.id),
    )
    generatedQuestion?.choices
      .filter((choice) => !generatedQuestion.correctAnswer.includes(choice.id))
      .forEach((choice) => {
        expect(generatedQuestion.rationale.choices?.[choice.id]).toBe(generatedDistractorFallback)
      })
  })
})
