import { describe, expect, it } from 'vitest'
import type { ExamTrackId, Question, QuestionAttempt, QuestionCategory } from '../../app/types'
import { getExamCategories, getExamQuestionBank } from '../../data/content'
import {
  generateQuickStudySession,
  getActiveSessionSummary,
  getPracticeHistory,
  selectQuickStudyQuestionIds,
} from '../study-system'

const makeAttempt = (
  question: Pick<Question, 'id' | 'examTrack'>,
  index: number,
  overrides: Partial<QuestionAttempt> = {},
): QuestionAttempt => ({
  id: `attempt-${index}`,
  questionId: question.id,
  examTrack: question.examTrack,
  selectedAnswer: ['A'],
  isCorrect: index % 2 === 0,
  confidence: 'medium',
  timeSpentSec: 45,
  flagged: false,
  completedAt: new Date(Date.UTC(2026, 5, 1, 12, index)).toISOString(),
  sessionType: 'quick-study',
  ...overrides,
})

const getCategoryWithFreshAlternatives = (examTrack: ExamTrackId) => {
  const bank = getExamQuestionBank(examTrack)
  const category = getExamCategories(examTrack).find(
    (candidate) => bank.filter((question) => question.category === candidate).length >= 14,
  )
  if (!category) throw new Error(`Expected enough ${examTrack} questions for repeat-prevention test.`)
  return {
    category,
    questions: bank.filter((question) => question.category === category),
  }
}

describe('quick study selection', () => {
  it('excludes recent repeats when enough fresh questions exist', () => {
    const { questions } = getCategoryWithFreshAlternatives('nclex-rn')
    const recentQuestions = questions.slice(0, 8)
    const recentIds = new Set(recentQuestions.map((question) => question.id))
    const attempts = recentQuestions.map((question, index) => makeAttempt(question, index))

    const selectedIds = selectQuickStudyQuestionIds(questions, attempts, 'developing', 5)

    expect(selectedIds).toHaveLength(5)
    expect(selectedIds.some((id) => recentIds.has(id))).toBe(false)
  })

  it('creates quick study sessions without repeating recent question stems', () => {
    const { category, questions } = getCategoryWithFreshAlternatives('nclex-rn')
    const recentQuestions = questions.slice(0, 8)
    const recentIds = new Set(recentQuestions.map((question) => question.id))
    const attempts = recentQuestions.map((question, index) => makeAttempt(question, index))

    const session = generateQuickStudySession(attempts, 'nclex-rn', category as QuestionCategory)

    expect(session.questionIds).toHaveLength(5)
    expect(session.questionIds.some((id) => recentIds.has(id))).toBe(false)
    expect(session.config.category).toBe(category)
  })
})

describe('practice session summaries', () => {
  it('summarizes unfinished and completed sessions for dashboard resume/history', () => {
    const session = generateQuickStudySession([], 'nclex-rn')
    const unfinished = {
      ...session,
      responses: [
        {
          questionId: session.questionIds[0],
          selectedAnswer: ['A'],
          isCorrect: true,
          confidence: 'medium' as const,
          flagged: false,
          submittedAt: '2026-06-01T12:00:00.000Z',
          timeSpentSec: 40,
        },
      ],
      updatedAt: '2026-06-01T12:02:00.000Z',
      lastActivityAt: '2026-06-01T12:02:00.000Z',
    }
    const completed = {
      ...unfinished,
      id: 'completed-session',
      endedAt: '2026-06-01T12:10:00.000Z',
      score: 1,
      status: 'completed' as const,
    }

    expect(getActiveSessionSummary(unfinished)).toMatchObject({
      id: unfinished.id,
      label: 'Quick Study',
      answeredCount: 1,
      questionCount: unfinished.questionIds.length,
      route: '/quick-study',
    })
    expect(getActiveSessionSummary(completed)).toBeNull()
    expect(getPracticeHistory([unfinished, completed])).toEqual([
      expect.objectContaining({
        id: 'completed-session',
        label: 'Quick Study',
        score: 1,
      }),
    ])
  })
})
