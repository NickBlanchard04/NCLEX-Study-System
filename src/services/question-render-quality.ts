import type { ExamTrackId, Question } from '../app/types'

export type QuestionRenderSeverity = 'info' | 'warning' | 'review' | 'blocker'

export type QuestionRenderIssueCode =
  | 'missing_prompt'
  | 'missing_choices'
  | 'missing_rationale'
  | 'missing_correct_answer_choice'
  | 'scenario_prompt_duplicate'
  | 'scenario_prompt_spacing'
  | 'raw_html'
  | 'internal_metadata_leak'
  | 'unsupported_markup'
  | 'weird_character'
  | 'control_character'
  | 'excessive_whitespace'
  | 'long_unbroken_token'
  | 'prompt_too_long'
  | 'scenario_too_long'
  | 'choice_too_long'
  | 'rationale_too_long'
  | 'duplicate_answer_choice'
  | 'metadata_crowding_risk'
  | 'mobile_wrapping_risk'
  | 'learner_reported_formatting_issue'

export type QuestionRenderFeedbackReason =
  | 'formatting_display_issue'
  | 'text_cut_off'
  | 'text_overlap'
  | 'bad_line_break'
  | 'weird_characters'
  | 'mobile_layout_issue'
  | 'rationale_formatting_issue'
  | 'scenario_prompt_spacing'
  | 'metadata_crowding'
  | 'other'

export type QuestionRenderTrustAction =
  | 'none'
  | 'monitor'
  | 'needs_render_review'
  | 'hide_from_readiness_until_render_review'

export interface QuestionRenderViewport {
  deviceClass: 'mobile' | 'tablet' | 'desktop'
  height: number
  width: number
}

export interface QuestionRenderFeedbackEvent {
  id: string
  createdAt: string
  questionId: string
  attemptId?: string
  examTrack?: ExamTrackId
  reason: QuestionRenderFeedbackReason
  userNote?: string
  route?: string
  renderState?: 'pre_submit' | 'review_open' | 'review_hidden' | 'confidence_pending' | 'confidence_recorded'
  viewport?: QuestionRenderViewport
}

export interface QuestionRenderDiagnostic {
  code: QuestionRenderIssueCode
  field?: string
  message: string
  severity: QuestionRenderSeverity
}

export interface QuestionRenderAuditResult {
  action: QuestionRenderTrustAction
  displaySafe: boolean
  issueCount: number
  issues: QuestionRenderDiagnostic[]
  question: Question
  recommendedActions: string[]
}

export interface QuestionRenderAuditSummary {
  blockerCount: number
  displaySafeCount: number
  issueCountsByCode: Record<QuestionRenderIssueCode, number>
  issueCountsBySeverity: Record<QuestionRenderSeverity, number>
  items: QuestionRenderAuditResult[]
  reviewCount: number
  totalQuestions: number
  warningCount: number
}

export interface QuestionRenderFeedbackDiagnosis {
  action: QuestionRenderTrustAction
  feedbackCount: number
  issueCountsByCode: Record<QuestionRenderIssueCode, number>
  questionId: string
  reasonCounts: Record<QuestionRenderFeedbackReason, number>
  renderAudit: QuestionRenderAuditResult
  recommendedActions: string[]
}

const emptySeverityCounts: Record<QuestionRenderSeverity, number> = {
  info: 0,
  warning: 0,
  review: 0,
  blocker: 0,
}

const rawHtmlPattern = /<\/?[a-z][\s\S]*>/i
const internalMetadataLeakPattern = /\b(?:focus\s+area|blueprint):\s*[^.]+\.?/i
const unsupportedMarkupPattern = /(?:```|#{1,6}\s|\*\*|__|\[[^\]]+\]\([^)]+\))/
const weirdCharacterPattern =
  /(?:\uFFFD|\u00E2[\u20AC\u2122\u0153\u201C\u201D\u2013]|\u00C3|\u00C2)/
const longUnbrokenTokenPattern = /\S{44,}/
const excessiveWhitespacePattern = /(?:[^\S\r\n]{3,}|\n{2,}|\t)/

const cleanText = (value = '') => value.replace(/\s+/g, ' ').trim()

const hasHiddenControlCharacter = (value: string) =>
  Array.from(value).some((character) => {
    const code = character.charCodeAt(0)
    return (code >= 0 && code <= 8) || code === 11 || code === 12 || (code >= 14 && code <= 31)
  })

const normalizedComparisonText = (value = '') =>
  cleanText(value)
    .toLowerCase()
    .replace(/(?<=\d),(?=\d)/g, '')
    .replace(/[^\p{L}\p{N}.\s]/gu, ' ')
    .replace(/\.(?!\d)/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

const getRationaleText = (question: Question) =>
  cleanText(`${question.rationale?.whyCorrect ?? ''} ${question.rationale?.whyOthers ?? ''}`)

const getQuestionTextFields = (question: Question) => [
  { field: 'scenario', value: question.scenario ?? '' },
  { field: 'prompt', value: question.prompt },
  ...question.choices.map((choice) => ({ field: `choice.${choice.id}`, value: choice.text })),
  { field: 'rationale.whyCorrect', value: question.rationale?.whyCorrect ?? '' },
  { field: 'rationale.whyOthers', value: question.rationale?.whyOthers ?? '' },
  { field: 'nclexTip', value: question.nclexTip },
  { field: 'clinicalRelevance', value: question.clinicalRelevance },
]

const pushIssue = (
  issues: QuestionRenderDiagnostic[],
  issue: QuestionRenderDiagnostic,
) => {
  if (
    issues.some(
      (existing) =>
        existing.code === issue.code &&
        existing.field === issue.field &&
        existing.message === issue.message,
    )
  ) {
    return
  }

  issues.push(issue)
}

const makeAction = (issues: QuestionRenderDiagnostic[]): QuestionRenderTrustAction => {
  if (issues.some((issue) => issue.severity === 'blocker')) {
    return 'hide_from_readiness_until_render_review'
  }

  if (issues.some((issue) => issue.severity === 'review')) {
    return 'needs_render_review'
  }

  if (issues.some((issue) => issue.severity === 'warning')) {
    return 'monitor'
  }

  return 'none'
}

const getRecommendedActions = (issues: QuestionRenderDiagnostic[]) => {
  const actions = new Set<string>()

  for (const issue of issues) {
    switch (issue.code) {
      case 'missing_prompt':
      case 'missing_choices':
      case 'missing_rationale':
      case 'missing_correct_answer_choice':
        actions.add('Block readiness use until the item has the missing display-critical fields.')
        break
      case 'raw_html':
      case 'internal_metadata_leak':
      case 'unsupported_markup':
        actions.add('Rewrite the affected text as plain display-safe copy.')
        break
      case 'weird_character':
      case 'control_character':
        actions.add('Replace encoding artifacts or hidden control characters before release.')
        break
      case 'long_unbroken_token':
      case 'choice_too_long':
      case 'prompt_too_long':
      case 'scenario_too_long':
      case 'rationale_too_long':
      case 'mobile_wrapping_risk':
        actions.add('Shorten or split the copy so it wraps cleanly on mobile and desktop.')
        break
      case 'scenario_prompt_duplicate':
      case 'scenario_prompt_spacing':
        actions.add('Separate clinical scenario details from the direct question stem.')
        break
      case 'metadata_crowding_risk':
        actions.add('Use wrapping badges or shorter labels for dense metadata.')
        break
      case 'duplicate_answer_choice':
        actions.add('Make each answer choice visually distinct for learners and reviewers.')
        break
      case 'learner_reported_formatting_issue':
        actions.add('Review the reported render state and reproduce the issue at the captured viewport.')
        break
    }
  }

  return Array.from(actions)
}

export const normalizeQuestionDisplayText = cleanText

export const summarizeQuestionRenderIssues = (
  issues: QuestionRenderDiagnostic[],
): Pick<QuestionRenderAuditSummary, 'issueCountsByCode' | 'issueCountsBySeverity'> => {
  const issueCountsByCode = {} as Record<QuestionRenderIssueCode, number>
  const issueCountsBySeverity = { ...emptySeverityCounts }

  for (const issue of issues) {
    issueCountsByCode[issue.code] = (issueCountsByCode[issue.code] ?? 0) + 1
    issueCountsBySeverity[issue.severity] += 1
  }

  return { issueCountsByCode, issueCountsBySeverity }
}

export function diagnoseQuestionRenderQuality(question: Question): QuestionRenderAuditResult {
  const issues: QuestionRenderDiagnostic[] = []
  const prompt = cleanText(question.prompt)
  const scenario = cleanText(question.scenario)
  const rationale = getRationaleText(question)
  const choiceTexts = question.choices.map((choice) => cleanText(choice.text))
  const normalizedChoices = choiceTexts.map(normalizedComparisonText)
  const metadataText = [
    question.category,
    question.subcategory,
    question.domain,
    question.system,
    question.board,
    question.sourceTopic,
  ].filter(Boolean).join(' ')

  if (!prompt) {
    pushIssue(issues, {
      code: 'missing_prompt',
      field: 'prompt',
      message: 'The question stem is missing.',
      severity: 'blocker',
    })
  }

  if (!question.choices.length) {
    pushIssue(issues, {
      code: 'missing_choices',
      field: 'choices',
      message: 'The answer list is missing.',
      severity: 'blocker',
    })
  }

  if (!rationale) {
    pushIssue(issues, {
      code: 'missing_rationale',
      field: 'rationale',
      message: 'The rationale text is missing.',
      severity: 'blocker',
    })
  }

  const choiceIds = new Set(question.choices.map((choice) => choice.id))
  const missingCorrectIds = question.correctAnswer.filter((answerId) => !choiceIds.has(answerId))
  if (missingCorrectIds.length) {
    pushIssue(issues, {
      code: 'missing_correct_answer_choice',
      field: 'correctAnswer',
      message: `The answer key references missing choice id(s): ${missingCorrectIds.join(', ')}.`,
      severity: 'blocker',
    })
  }

  if (scenario && prompt) {
    const normalizedScenario = normalizedComparisonText(scenario)
    const normalizedPrompt = normalizedComparisonText(prompt)
    if (
      normalizedScenario.length > 24 &&
      normalizedPrompt.length > 24 &&
      (normalizedScenario.includes(normalizedPrompt) || normalizedPrompt.includes(normalizedScenario))
    ) {
      pushIssue(issues, {
        code: 'scenario_prompt_duplicate',
        field: 'scenario',
        message: 'The scenario and prompt repeat the same text.',
        severity: 'review',
      })
    }

    if (/[?:.!]$/.test(scenario) && /^[a-z]/.test(prompt)) {
      pushIssue(issues, {
        code: 'scenario_prompt_spacing',
        field: 'prompt',
        message: 'The prompt reads like it may be a continuation of the scenario instead of a clear stem.',
        severity: 'warning',
      })
    }
  }

  getQuestionTextFields(question).forEach(({ field, value }) => {
    if (!value) return

    if (rawHtmlPattern.test(value)) {
      pushIssue(issues, {
        code: 'raw_html',
        field,
        message: 'Raw HTML appears in learner-visible question copy.',
        severity: 'review',
      })
    }

    if (internalMetadataLeakPattern.test(value)) {
      pushIssue(issues, {
        code: 'internal_metadata_leak',
        field,
        message: 'Internal topic or blueprint metadata appears in learner-visible question copy.',
        severity: 'review',
      })
    }

    if (unsupportedMarkupPattern.test(value)) {
      pushIssue(issues, {
        code: 'unsupported_markup',
        field,
        message: 'Markdown-style formatting appears in a plain text question field.',
        severity: 'warning',
      })
    }

    if (weirdCharacterPattern.test(value)) {
      pushIssue(issues, {
        code: 'weird_character',
        field,
        message: 'Encoding artifacts or replacement characters appear in learner-visible copy.',
        severity: 'review',
      })
    }

    if (hasHiddenControlCharacter(value)) {
      pushIssue(issues, {
        code: 'control_character',
        field,
        message: 'Hidden control characters appear in learner-visible copy.',
        severity: 'review',
      })
    }

    if (excessiveWhitespacePattern.test(value)) {
      pushIssue(issues, {
        code: 'excessive_whitespace',
        field,
        message: 'The text contains tabs, repeated spacing, or extra blank lines.',
        severity: 'warning',
      })
    }

    if (longUnbrokenTokenPattern.test(value)) {
      pushIssue(issues, {
        code: 'long_unbroken_token',
        field,
        message: 'A long unbroken token could force horizontal overflow.',
        severity: 'review',
      })
    }
  })

  if (prompt.length > 190) {
    pushIssue(issues, {
      code: 'prompt_too_long',
      field: 'prompt',
      message: 'The stem is long enough to crowd the active question header.',
      severity: 'warning',
    })
  }

  if (scenario.length > 340) {
    pushIssue(issues, {
      code: 'scenario_too_long',
      field: 'scenario',
      message: 'The scenario is long enough to make the question card feel detached from the answer list.',
      severity: 'warning',
    })
  }

  question.choices.forEach((choice) => {
    if (cleanText(choice.text).length > 170) {
      pushIssue(issues, {
        code: 'choice_too_long',
        field: `choice.${choice.id}`,
        message: 'This answer choice is long enough to create wrapping or comparison fatigue.',
        severity: 'warning',
      })
    }
  })

  if (rationale.length > 700) {
    pushIssue(issues, {
      code: 'rationale_too_long',
      field: 'rationale',
      message: 'The rationale panel may become too dense without sub-sectioning.',
      severity: 'warning',
    })
  }

  const duplicateChoiceText = normalizedChoices.some(
    (choice, index) => choice && normalizedChoices.indexOf(choice) !== index,
  )
  if (duplicateChoiceText) {
    pushIssue(issues, {
      code: 'duplicate_answer_choice',
      field: 'choices',
      message: 'Two answer choices normalize to the same display text.',
      severity: 'review',
    })
  }

  if (metadataText.length > 175) {
    pushIssue(issues, {
      code: 'metadata_crowding_risk',
      field: 'metadata',
      message: 'Combined category, system, board, and source labels may crowd the badge row.',
      severity: 'warning',
    })
  }

  const mobileCopyWeight =
    prompt.length +
    scenario.length +
    Math.max(0, ...choiceTexts.map((choice) => choice.length)) +
    metadataText.length
  if (mobileCopyWeight > 760 || question.choices.length > 5) {
    pushIssue(issues, {
      code: 'mobile_wrapping_risk',
      field: 'question',
      message: 'The visible question content is dense enough to need mobile layout verification.',
      severity: 'warning',
    })
  }

  const issueCounts = summarizeQuestionRenderIssues(issues).issueCountsBySeverity
  const action = makeAction(issues)

  return {
    action,
    displaySafe: issueCounts.blocker === 0 && issueCounts.review === 0,
    issueCount: issues.length,
    issues,
    question,
    recommendedActions: getRecommendedActions(issues),
  }
}

export function auditQuestionRenderFormatting(questions: Question[]): QuestionRenderAuditSummary {
  const items = questions.map((question) => diagnoseQuestionRenderQuality(question))
  const allIssues = items.flatMap((item) => item.issues)
  const { issueCountsByCode, issueCountsBySeverity } = summarizeQuestionRenderIssues(allIssues)

  return {
    blockerCount: issueCountsBySeverity.blocker,
    displaySafeCount: items.filter((item) => item.displaySafe).length,
    issueCountsByCode,
    issueCountsBySeverity,
    items,
    reviewCount: issueCountsBySeverity.review,
    totalQuestions: questions.length,
    warningCount: issueCountsBySeverity.warning,
  }
}

export function diagnoseQuestionRenderFeedback(
  question: Question,
  feedbackEvents: QuestionRenderFeedbackEvent[],
): QuestionRenderFeedbackDiagnosis {
  const matchingFeedback = feedbackEvents.filter((event) => event.questionId === question.id)
  const reasonCounts = {} as Record<QuestionRenderFeedbackReason, number>

  for (const event of matchingFeedback) {
    reasonCounts[event.reason] = (reasonCounts[event.reason] ?? 0) + 1
  }

  const renderAudit = diagnoseQuestionRenderQuality(question)
  const feedbackIssues: QuestionRenderDiagnostic[] = []
  const severeFeedbackReasons: QuestionRenderFeedbackReason[] = [
    'text_cut_off',
    'text_overlap',
    'weird_characters',
    'mobile_layout_issue',
  ]
  const hasSevereFeedback = severeFeedbackReasons.some((reason) => (reasonCounts[reason] ?? 0) > 0)

  if (matchingFeedback.length >= 3 || hasSevereFeedback) {
    feedbackIssues.push({
      code: 'learner_reported_formatting_issue',
      field: 'feedback',
      message: 'Learner feedback indicates this item needs a render-focused review before trust promotion.',
      severity: hasSevereFeedback ? 'review' : 'warning',
    })
  }

  const combinedIssues = [...renderAudit.issues, ...feedbackIssues]
  const { issueCountsByCode } = summarizeQuestionRenderIssues(combinedIssues)
  const action = makeAction(combinedIssues)

  return {
    action,
    feedbackCount: matchingFeedback.length,
    issueCountsByCode,
    questionId: question.id,
    reasonCounts,
    renderAudit,
    recommendedActions: getRecommendedActions(combinedIssues),
  }
}
