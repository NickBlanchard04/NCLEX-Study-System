import { describe, expect, it } from 'vitest'
import type { MaterialFlashcard, MaterialQuestion } from '../../app/types'
import { filterMaterialStudyTools, summarizeMaterialQuality } from '../material-quality'

const makeCard = (overrides: Partial<MaterialFlashcard> = {}): MaterialFlashcard => ({
  id: overrides.id ?? crypto.randomUUID(),
  sourceMaterialId: 'material-1',
  sourceTitle: 'Lab Values',
  front: 'What are common causes of thrombocytopenia?',
  back: 'Common causes include bone marrow suppression, sepsis, sequestration from an enlarged spleen, increased platelet destruction, or decreased platelet production.',
  status: 'new',
  createdAt: '2026-06-23T12:00:00.000Z',
  ...overrides,
})

const makeQuestion = (overrides: Partial<MaterialQuestion> = {}): MaterialQuestion => ({
  id: overrides.id ?? crypto.randomUUID(),
  sourceMaterialId: 'material-1',
  sourceTitle: 'Lab Values',
  prompt: 'A nurse is reviewing thrombocytopenia. Which statement best explains the cause pattern from the material?',
  choices: [
    { id: 'A', text: 'The nurse should delay clinical judgment until an unrelated finding appears.' },
    { id: 'B', text: 'Common causes include bone marrow suppression, sepsis, sequestration from an enlarged spleen, increased platelet destruction, or decreased platelet production.' },
    { id: 'C', text: 'Hyperkalemia can cause dysrhythmias and muscle weakness.' },
    { id: 'D', text: 'The nurse should treat the cue as stable without completing a focused assessment.' },
  ],
  correctAnswer: ['B'],
  rationale:
    'The correct answer reflects the uploaded concept. The other choices are unsupported by this material or describe a different study point.',
  createdAt: '2026-06-23T12:00:00.000Z',
  ...overrides,
})

describe('material quality gates', () => {
  it('passes clear generated flashcards and questions', () => {
    const summary = summarizeMaterialQuality([makeCard()], [makeQuestion()])

    expect(summary.blockerCount).toBe(0)
    expect(summary.warningCount).toBe(0)
  })

  it('blocks raw extraction fragments and source metadata', () => {
    const summary = summarizeMaterialQuality(
      [
        makeCard({
          front: 'What should you know about result?',
          back: 'June 2025 www.nursingcenter.com result: of bone marrow suppression.',
        }),
      ],
      [
        makeQuestion({
          prompt: 'Based on your material, which answer best matches this point: What should you know about result?',
          choices: [
            { id: 'A', text: 'June 2025 www.nursingcenter.com' },
            { id: 'B', text: 'June 2025 www.nursingcenter.com' },
            { id: 'C', text: 'result: of bone marrow suppression.' },
            { id: 'D', text: 'https://www.nursingcenter.com/example' },
          ],
          correctAnswer: ['A'],
          rationale: 'Generated from source.',
        }),
      ],
    )

    expect(summary.blockerCount).toBeGreaterThan(0)
    expect(summary.issues.map((issue) => issue.code)).toEqual(
      expect.arrayContaining([
        'flashcard_source_noise',
        'question_duplicate_choices',
        'question_rationale_short',
        'question_source_noise',
      ]),
    )
  })

  it('blocks generic uploaded-material placeholders', () => {
    const summary = summarizeMaterialQuality(
      [
        makeCard({
          front: 'What is the key nursing point about uploaded nursing concept?',
        }),
      ],
      [
        makeQuestion({
          prompt: 'A nurse is reviewing this study material. Which statement is best supported?',
        }),
      ],
    )

    expect(summary.issues.map((issue) => issue.code)).toEqual(
      expect.arrayContaining(['flashcard_source_noise', 'question_source_noise']),
    )
  })

  it('blocks source-code shaped cards and questions before approval', () => {
    const summary = summarizeMaterialQuality(
      [
        makeCard({
          front: 'What does const makeChoices = () => { return choices } do?',
          back: 'export function buildQuestionPrompt(point) { return point.statement }',
        }),
      ],
      [
        makeQuestion({
          prompt: 'A nurse is reviewing sourceMaterialId. Which statement best matches correctAnswer?',
          choices: [
            { id: 'A', text: 'const choices = makeChoices(correctAnswer);' },
            { id: 'B', text: 'return { prompt, choices, whyCorrect };' },
            { id: 'C', text: 'export interface MaterialQuestion { rationale: string }' },
            { id: 'D', text: 'className="rounded-xl border border-cyan-200/20"' },
          ],
          correctAnswer: ['A'],
          rationale:
            'The correct answer appears to describe TypeScript application code rather than nursing study content, so it should be rejected before approval.',
        }),
      ],
    )

    expect(summary.issues.map((issue) => issue.code)).toEqual(
      expect.arrayContaining(['flashcard_code_artifact', 'question_code_artifact']),
    )
  })

  it('filters blocker items before they are saved', () => {
    const goodCard = makeCard({ id: 'good-card' })
    const badCard = makeCard({
      id: 'bad-card',
      front: 'What should you know about result?',
      back: 'www.nursingcenter.com',
    })
    const goodQuestion = makeQuestion({ id: 'good-question' })
    const badQuestion = makeQuestion({
      id: 'bad-question',
      prompt: 'A nurse is reviewing potassium. Which finding requires follow-up?',
      rationale: '',
    })

    const result = filterMaterialStudyTools([goodCard, badCard], [goodQuestion, badQuestion])

    expect(result.flashcards.map((card) => card.id)).toEqual(['good-card'])
    expect(result.questions.map((question) => question.id)).toEqual(['good-question'])
    expect(result.summary.blockerCount).toBeGreaterThan(0)
  })
})
