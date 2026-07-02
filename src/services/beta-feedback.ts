import type { AppEventContext } from './analytics-client'
import { trackAppEvent } from './analytics-client'

export type BetaFeedbackSource = 'dashboard' | 'materials' | 'question-bank' | 'auth' | 'help'
export type BetaFeedbackSentiment = 'confused' | 'blocked' | 'liked' | 'idea'

export interface BetaFeedbackInput {
  source: BetaFeedbackSource
  sentiment: BetaFeedbackSentiment
  confusion: string
  expected: string
  returnTrigger: string
}

export interface BetaFeedbackReport extends BetaFeedbackInput {
  id: string
  submittedAt: string
}

const localFeedbackKey = 'nurse-command-beta-feedback'
const emailLikePattern = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi
const tokenLikePattern = /(eyJ[a-zA-Z0-9_-]{12,}|access_token|refresh_token|bearer\s+[a-zA-Z0-9._-]+)/gi

const safeId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

export const sanitizeBetaFeedbackText = (value: string) =>
  value
    .replace(emailLikePattern, '[redacted-email]')
    .replace(tokenLikePattern, '[redacted-token]')
    .trim()
    .slice(0, 1000)

export function createBetaFeedbackReport(input: BetaFeedbackInput): BetaFeedbackReport {
  return {
    id: safeId(),
    source: input.source,
    sentiment: input.sentiment,
    confusion: sanitizeBetaFeedbackText(input.confusion),
    expected: sanitizeBetaFeedbackText(input.expected),
    returnTrigger: sanitizeBetaFeedbackText(input.returnTrigger),
    submittedAt: new Date().toISOString(),
  }
}

const appendLocalFeedback = (report: BetaFeedbackReport) => {
  if (typeof window === 'undefined') return
  try {
    const previous = JSON.parse(window.localStorage.getItem(localFeedbackKey) ?? '[]') as BetaFeedbackReport[]
    window.localStorage.setItem(localFeedbackKey, JSON.stringify([report, ...previous].slice(0, 100)))
  } catch {
    // Feedback capture must never interrupt studying.
  }
}

export const getLocalBetaFeedback = (): BetaFeedbackReport[] => {
  if (typeof window === 'undefined') return []
  try {
    return JSON.parse(window.localStorage.getItem(localFeedbackKey) ?? '[]') as BetaFeedbackReport[]
  } catch {
    return []
  }
}

export function createBetaFeedbackMailto(report: BetaFeedbackReport) {
  const subject = encodeURIComponent(`Nurse Command beta feedback - ${report.sentiment}`)
  const body = encodeURIComponent(
    [
      `Source: ${report.source}`,
      `Type: ${report.sentiment}`,
      '',
      'What felt confusing or useful?',
      report.confusion || '(blank)',
      '',
      'What did you expect to happen?',
      report.expected || '(blank)',
      '',
      'What would make you come back?',
      report.returnTrigger || '(blank)',
    ].join('\n'),
  )
  return `mailto:support@nursecommand.com?subject=${subject}&body=${body}`
}

export function recordBetaFeedback(input: BetaFeedbackInput, context: AppEventContext = {}) {
  const report = createBetaFeedbackReport(input)
  appendLocalFeedback(report)
  void trackAppEvent(
    'feedback_submitted',
    {
      page_path: typeof window === 'undefined' ? '/' : window.location.pathname,
      feature_name: 'Beta Feedback',
      metadata: {
        source: report.source,
        sentiment: report.sentiment,
        has_confusion: Boolean(report.confusion),
        has_expected: Boolean(report.expected),
        has_return_trigger: Boolean(report.returnTrigger),
      },
    },
    context,
  )
  return report
}
