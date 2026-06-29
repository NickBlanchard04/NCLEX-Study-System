import { describe, expect, it } from 'vitest'
import type { ExamTrackId, Question, QuestionAttempt, QuestionCategory } from '../../app/types'
import { getExamCategories, getExamQuestionBank } from '../../data/content'
import {
  generatePracticeSet,
  generateQuickStudySession,
  generateTestSession,
  getActiveSessionSummary,
  getQuestionStemFingerprint,
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
  const uniqueByStem = (items: Question[]) => {
    const seen = new Set<string>()
    return items.filter((question) => {
      const fingerprint = getQuestionStemFingerprint(question)
      if (seen.has(fingerprint)) return false
      seen.add(fingerprint)
      return true
    })
  }
  const category = getExamCategories(examTrack).find(
    (candidate) => uniqueByStem(bank.filter((question) => question.category === candidate)).length >= 8,
  )
  if (!category) throw new Error(`Expected enough ${examTrack} questions for repeat-prevention test.`)
  const questions = bank.filter((question) => question.category === category)
  return {
    category,
    questions,
    uniqueQuestions: uniqueByStem(questions),
  }
}

describe('quick study selection', () => {
  it('excludes recent repeats when enough fresh questions exist', () => {
    const { questions, uniqueQuestions } = getCategoryWithFreshAlternatives('nclex-rn')
    const byId = new Map(questions.map((question) => [question.id, question]))
    const recentQuestions = uniqueQuestions.slice(0, 3)
    const recentStems = new Set(recentQuestions.map(getQuestionStemFingerprint))
    const attempts = recentQuestions.map((question, index) => makeAttempt(question, index))

    const selectedIds = selectQuickStudyQuestionIds(questions, attempts, 'developing', 5)
    const selectedStems = selectedIds.map((id) => getQuestionStemFingerprint(byId.get(id)!))

    expect(selectedIds).toHaveLength(5)
    expect(selectedStems.some((stem) => recentStems.has(stem))).toBe(false)
  })

  it('creates quick study sessions without repeating recent question stems', () => {
    const { category, questions, uniqueQuestions } = getCategoryWithFreshAlternatives('nclex-rn')
    const byId = new Map(questions.map((question) => [question.id, question]))
    const recentQuestions = uniqueQuestions.slice(0, 3)
    const recentStems = new Set(recentQuestions.map(getQuestionStemFingerprint))
    const attempts = recentQuestions.map((question, index) => makeAttempt(question, index))

    const session = generateQuickStudySession(attempts, 'nclex-rn', category as QuestionCategory)
    const selectedStems = session.questionIds.map((id) => getQuestionStemFingerprint(byId.get(id)!))

    expect(session.questionIds).toHaveLength(5)
    expect(selectedStems.some((stem) => recentStems.has(stem))).toBe(false)
    expect(new Set(selectedStems).size).toBe(selectedStems.length)
    expect(session.config.category).toBe(category)
  })
})

describe('question bank repeat prevention', () => {
  it('creates practice sessions without duplicate visible question stems', () => {
    const bank = getExamQuestionBank('nclex-rn')
    const byId = new Map(bank.map((question) => [question.id, question]))

    const session = generatePracticeSet([], 'nclex-rn', {
      category: 'All',
      questionStatus: 'all',
      format: 'mixed',
      difficulty: 'mixed',
      questionCount: 20,
    })
    const stems = session.questionIds.map((id) => getQuestionStemFingerprint(byId.get(id)!))

    expect(session.questionIds.length).toBeGreaterThan(10)
    expect(new Set(stems).size).toBe(stems.length)
  })

  it('deprioritizes recently answered stems in question bank practice', () => {
    const { category, questions, uniqueQuestions } = getCategoryWithFreshAlternatives('nclex-rn')
    const recentQuestions = uniqueQuestions.slice(0, 3)
    const recentStems = new Set(recentQuestions.map(getQuestionStemFingerprint))
    const attempts = recentQuestions.map((question, index) =>
      makeAttempt(question, index, { sessionType: 'practice' }),
    )

    const session = generatePracticeSet(attempts, 'nclex-rn', {
      category,
      questionStatus: 'all',
      format: 'mixed',
      difficulty: 'mixed',
      questionCount: 5,
    })
    const byId = new Map(questions.map((question) => [question.id, question]))
    const selectedStems = session.questionIds.map((id) => getQuestionStemFingerprint(byId.get(id)!))

    expect(session.questionIds).toHaveLength(5)
    expect(selectedStems.some((stem) => recentStems.has(stem))).toBe(false)
    expect(new Set(selectedStems).size).toBe(selectedStems.length)
  })

  it('creates test sessions without duplicate visible question stems', () => {
    const bank = getExamQuestionBank('nclex-rn')
    const byId = new Map(bank.map((question) => [question.id, question]))

    const session = generateTestSession([], 'nclex-rn', {
      questionCount: 40,
      timed: false,
      noBacktracking: false,
    })
    const stems = session.questionIds.map((id) => getQuestionStemFingerprint(byId.get(id)!))

    expect(session.questionIds.length).toBeGreaterThan(20)
    expect(new Set(stems).size).toBe(stems.length)
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
