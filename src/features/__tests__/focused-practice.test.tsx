import { createElement, type ComponentProps } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { questionBank } from '../../data/content'
import { QuickStudyQuestionView } from '../quick-study-session-view'

const question = questionBank.find((item) => item.format === 'multiple-choice' && item.scenario)!
const noop = () => {}
const base: ComponentProps<typeof QuickStudyQuestionView> = {
  focused: true,
  session: { id: 'layout-test', mode: 'practice', title: 'Practice', subtitle: '', questionIds: [question.id], startedAt: '2026-10-01T12:00:00Z', currentIndex: 0, config: { questionCount: 1 }, responses: [] },
  question, selectedAnswers: [], submitted: false, showRationale: false, flagged: false,
  finalResponse: null, resultLabel: 'Incorrect', isCorrect: false, missReason: '',
  evidenceLevel: 'Practice evidence only', trustFlags: [], tutorCue: '', remainingSeconds: null,
  feedbackOpen: false, feedbackReason: 'wrong_answer', feedbackNote: '', feedbackSubmittedId: null,
  onChoice: noop, onFlag: noop, onSubmit: noop, onConfidence: noop, onToggleReview: noop,
  onNext: noop, onBack: noop, onGoTo: noop, onFinish: noop, onSaveAndLeave: noop,
  onExit: noop, onLinkedCard: noop, onFeedbackToggle: noop, onFeedbackReason: noop,
  onFeedbackNote: noop, onFeedbackSubmit: noop,
}
const render = (overrides: Partial<typeof base> = {}) => renderToStaticMarkup(
  createElement(MemoryRouter, null, createElement(QuickStudyQuestionView, { ...base, ...overrides })),
)

describe('focused Question Bank presentation', () => {
  it('puts the question before the patient context and retains all choices', () => {
    const html = render()
    expect(html.indexOf('id="quick-study-question"')).toBeLessThan(html.indexOf('focused-practice-patient'))
    expect(html).not.toContain('Your patient')
    expect(html).not.toContain('Clinical scenario')
    expect(html.match(/class="quick-session-choice"/g)).toHaveLength(question.choices.length)
    expect(html).toContain('Check answer')
    expect(html).toContain('Content &amp; source status')
  })
  it('shows selection without claiming correctness before submission', () => {
    const html = render({ selectedAnswers: [question.correctAnswer[0]] })
    expect(html).toContain('data-selected="true"')
    expect(html).not.toContain('data-result="correct"')
    expect(html).not.toContain('Correct answer · Your answer')
    expect(html).not.toContain('Save &amp; leave')
    expect(html).not.toContain('practice-feedback-actions')
  })
  it('labels both a wrong selection and the correct answer after checking', () => {
    const wrong = question.choices.find((choice) => !question.correctAnswer.includes(choice.id))!
    const html = render({ submitted: true, selectedAnswers: [wrong.id] })
    expect(html).toContain('Your answer · Incorrect')
    expect(html).toContain('Correct answer')
    expect(html).toContain('Not quite')
    expect(html).toContain('practice-feedback-actions')
    expect(html).toContain('Save &amp; leave')
    expect(html).toMatch(/<button type="button" aria-pressed="false">/)
  })
  it('shows the correct feedback icon and post-answer actions without a new submission', () => {
    const html = render({ submitted: true, isCorrect: true, selectedAnswers: question.correctAnswer, flagged: true })
    expect(html).toContain('practice-feedback-sparkles')
    expect(html).toContain('Correct!')
    expect(html).toContain('Flagged')
    expect(html).not.toContain('Check answer')
  })
  it('keeps select-all instructions and the original Quick Study layout', () => {
    const multiple = questionBank.find((item) => item.format === 'select-all-that-apply')!
    expect(render({ question: multiple })).toContain('Select all that apply.')
    const legacy = render({ focused: false })
    expect(legacy).toContain('aria-label="Quick Study session"')
    expect(legacy).not.toContain('focused-practice')
  })
})
