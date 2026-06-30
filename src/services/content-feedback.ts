import type { ExamTrackId, Question } from '../app/types'
import { trackAppEvent, type AppEventContext } from './analytics-client'

export type ContentFeedbackReason =
  | 'wrong_answer'
  | 'confusing_rationale'
  | 'unsafe_wording'
  | 'typo'
  | 'source_concern'

export interface ContentFeedbackInput {
  question: Pick<
    Question,
    | 'id'
    | 'examTrack'
    | 'category'
    | 'sourcePackId'
    | 'fixtureId'
    | 'sourceStatus'
    | 'clinicalReviewStatus'
    | 'visibility'
    | 'contentStage'
    | 'learnerVisible'
  >
  reason: ContentFeedbackReason
  note?: string
  route?: string
  reviewState?: 'pre_submit' | 'review_open' | 'review_hidden' | 'confidence_pending' | 'confidence_recorded'
  context?: AppEventContext
}

export interface StoredContentFeedback {
  id: string
  createdAt: string
  questionId: string
  examTrack: ExamTrackId
  category: string
  reason: ContentFeedbackReason
  note?: string
  route: string
  reviewState?: ContentFeedbackInput['reviewState']
  sourcePackId?: string
  fixtureId?: string
  sourceStatus?: string
  clinicalReviewStatus?: string
  visibility?: string
  contentStage?: string
  learnerVisible?: boolean
}

const storageKey = 'nurse-command-content-feedback'
const emailLikePattern = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi
const tokenLikePattern = /(eyJ[a-zA-Z0-9_-]{12,}|access_token|refresh_token|bearer\s+[a-zA-Z0-9._-]+)/gi

export const contentFeedbackReasonLabels: Record<ContentFeedbackReason, string> = {
  wrong_answer: 'Wrong answer',
  confusing_rationale: 'Confusing rationale',
  unsafe_wording: 'Unsafe wording',
  typo: 'Typo',
  source_concern: 'Source concern',
}

export const contentFeedbackReasons = Object.keys(contentFeedbackReasonLabels) as ContentFeedbackReason[]

const safeRandomId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

const sanitizeNote = (note?: string) => {
  const cleaned = (note ?? '')
    .replace(emailLikePattern, '[redacted-email]')
    .replace(tokenLikePattern, '[redacted-token]')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 500)
  return cleaned || undefined
}

const readStoredReports = (): StoredContentFeedback[] => {
  if (typeof window === 'undefined') return []
  try {
    return JSON.parse(window.localStorage.getItem(storageKey) ?? '[]') as StoredContentFeedback[]
  } catch {
    return []
  }
}

const writeStoredReports = (reports: StoredContentFeedback[]) => {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(reports.slice(0, 250)))
  } catch {
    // Feedback capture must never interrupt studying.
  }
}

export const getLocalContentFeedbackReports = () => readStoredReports()

export const trackContentFeedbackOpened = (
  question: Pick<Question, 'id' | 'examTrack' | 'category' | 'sourcePackId' | 'fixtureId' | 'visibility' | 'contentStage'>,
  route = '/',
  context: AppEventContext = {},
) => {
  void trackAppEvent('feedback_opened', {
    page_path: route,
    feature_name: 'Content Feedback',
    exam_track: question.examTrack,
    question_category: question.category,
    metadata: {
      question_id: question.id,
      sourcePackId: question.sourcePackId ?? null,
      fixtureId: question.fixtureId ?? null,
      visibility: question.visibility ?? null,
      contentStage: question.contentStage ?? null,
    },
  }, context).catch(() => undefined)
}

export const recordContentFeedback = ({
  question,
  reason,
  note,
  route = '/',
  reviewState,
  context = {},
}: ContentFeedbackInput): StoredContentFeedback => {
  const record: StoredContentFeedback = {
    id: `feedback_${safeRandomId()}`,
    createdAt: new Date().toISOString(),
    questionId: question.id,
    examTrack: question.examTrack,
    category: question.category,
    reason,
    note: sanitizeNote(note),
    route,
    reviewState,
    sourcePackId: question.sourcePackId,
    fixtureId: question.fixtureId,
    sourceStatus: question.sourceStatus,
    clinicalReviewStatus: question.clinicalReviewStatus,
    visibility: question.visibility,
    contentStage: question.contentStage,
    learnerVisible: question.learnerVisible,
  }

  writeStoredReports([record, ...readStoredReports()])

  void trackAppEvent('feedback_submitted', {
    page_path: route,
    feature_name: 'Content Feedback',
    exam_track: question.examTrack,
    question_category: question.category,
    metadata: {
      question_id: question.id,
      reason,
      sourcePackId: question.sourcePackId ?? null,
      fixtureId: question.fixtureId ?? null,
      sourceStatus: question.sourceStatus ?? null,
      clinicalReviewStatus: question.clinicalReviewStatus ?? null,
      visibility: question.visibility ?? null,
      contentStage: question.contentStage ?? null,
      learnerVisible: question.learnerVisible ?? null,
      reviewState: reviewState ?? null,
    },
  }, context).catch(() => undefined)

  return record
}
