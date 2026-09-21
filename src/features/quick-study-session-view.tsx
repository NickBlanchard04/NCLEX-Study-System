import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, Check, Flag, X } from 'lucide-react'
import type { ActiveSession, ConfidenceLevel, Question, SessionResponse } from '../app/types'
import {
  contentFeedbackReasonLabels,
  contentFeedbackReasons,
  type ContentFeedbackReason,
} from '../services/content-feedback'

interface QuestionViewProps {
  session: ActiveSession
  question: Question
  selectedAnswers: string[]
  submitted: boolean
  showRationale: boolean
  flagged: boolean
  finalResponse: SessionResponse | null
  resultLabel: string
  isCorrect: boolean
  missReason: string
  remediation?: string
  evidenceLevel: string
  trustFlags: string[]
  tutorCue: string
  remainingSeconds: number | null
  feedbackOpen: boolean
  feedbackReason: ContentFeedbackReason
  feedbackNote: string
  feedbackSubmittedId: string | null
  onChoice: (choiceId: string) => void
  onFlag: () => void
  onSubmit: () => void
  onConfidence: (confidence: ConfidenceLevel) => void
  onToggleReview: () => void
  onNext: () => void
  onBack: () => void
  onGoTo: (index: number) => void
  onFinish: () => void
  onSaveAndLeave: () => void
  onExit: () => void
  onLinkedCard: () => void
  onFeedbackToggle: () => void
  onFeedbackReason: (reason: ContentFeedbackReason) => void
  onFeedbackNote: (note: string) => void
  onFeedbackSubmit: () => void
}

export function QuickStudyQuestionView(props: QuestionViewProps) {
  const { session, question, selectedAnswers, submitted, showRationale, finalResponse } = props
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [discardRequested, setDiscardRequested] = useState(false)
  const dialogRef = useRef<HTMLDialogElement>(null)
  const bodyRef = useRef<HTMLDivElement>(null)
  const isLast = session.currentIndex === session.questionIds.length - 1
  const reviewing = submitted && showRationale
  const result = props.isCorrect ? 'correct' : props.resultLabel === 'Partial' ? 'partial' : 'incorrect'
  const clinicalReviewed = question.clinicalReviewStatus === 'sme_reviewed'
  const sourcesNeeded = question.sourceStatus === 'source_needed' || !question.sourceBacked
  const contentStatus = clinicalReviewed
    ? 'Practice only · SME reviewed'
    : question.contentQuality?.includes('draft') || question.contentQuality === 'generated-starter' || question.contentStage === 'beta_draft'
      ? 'Practice only · Draft, not SME reviewed'
      : 'Practice only · Not marked as SME reviewed'

  useEffect(() => {
    const dialog = dialogRef.current
    if (detailsOpen && dialog && !dialog.open) dialog.showModal()
    else if (!detailsOpen && dialog?.open) dialog.close()
  }, [detailsOpen])

  useEffect(() => {
    bodyRef.current?.scrollTo({ top: 0 })
  }, [reviewing, session.currentIndex])

  return (
    <section className="quick-session" aria-label="Quick Study session">
      <header className="quick-session-header">
        <div className="quick-session-heading">
          <h1>Quick Study</h1>
          <span>{question.category}</span>
        </div>
        <div className="quick-session-progress-label">
          <span>Question {session.currentIndex + 1} of {session.questionIds.length}</span>
          {session.config.timed && props.remainingSeconds !== null ? (
            <span aria-label="Time remaining">
              {Math.floor(props.remainingSeconds / 60)}:{String(props.remainingSeconds % 60).padStart(2, '0')}
            </span>
          ) : <span>{session.responses.length} answered</span>}
        </div>
        <progress className="quick-session-progress" value={session.responses.length} max={session.questionIds.length} aria-label="Questions answered" />
      </header>

      <div className="quick-session-body" ref={bodyRef} tabIndex={0} aria-label={reviewing ? 'Answer review' : 'Question and answer choices'}>
        {reviewing ? (
          <div className="quick-session-review">
            <p className="quick-session-result" data-result={result} role="status">
              {props.isCorrect ? <Check size={20} aria-hidden="true" /> : null}
              {props.resultLabel}
            </p>
            <h2>{question.prompt}</h2>
            <p className="quick-session-correct-answer">
              <strong>Correct answer: </strong>
              {question.choices.filter((choice) => question.correctAnswer.includes(choice.id)).map((choice) => `${choice.id}. ${choice.text}`).join(' · ')}
            </p>
            <p>{question.rationale.whyCorrect}</p>
            {!props.isCorrect ? <p className="quick-session-miss-reason">{props.missReason}</p> : null}
            {props.remediation ? <p className="quick-session-repair"><strong>Next repair: </strong>{props.remediation}</p> : null}
            <p className="quick-session-evidence">{contentStatus}</p>
            <div className="quick-session-review-actions">
              <button type="button" className="quick-session-secondary" onClick={props.onToggleReview}>View your answer</button>
              <button type="button" className="quick-session-secondary" onClick={() => setDetailsOpen(true)}>Full explanation &amp; sources</button>
              {question.relatedFlashcardIds?.length ? (
                <button type="button" className="quick-session-text-button" onClick={props.onLinkedCard}>Open linked flashcard</button>
              ) : null}
            </div>
          </div>
        ) : (
          <>
            <div className="quick-session-question-meta">
              <span>{question.format === 'select-all-that-apply' ? 'Select all that apply' : 'Choose one answer'}</span>
              <button type="button" className="quick-session-text-button" onClick={props.onFlag} disabled={submitted || Boolean(finalResponse)} aria-pressed={props.flagged}>
                <Flag size={16} aria-hidden="true" />{props.flagged ? 'Flagged' : 'Flag for review'}
              </button>
            </div>
            {question.scenario ? <p className="quick-session-scenario">{question.scenario}</p> : null}
            <h2 id="quick-study-question">{question.prompt}</h2>
            <div className="quick-session-choices" role="group" aria-labelledby="quick-study-question">
              {question.choices.map((choice) => {
                const selected = selectedAnswers.includes(choice.id)
                const correct = question.correctAnswer.includes(choice.id)
                const choiceResult = submitted ? correct ? 'correct' : selected ? 'incorrect' : undefined : undefined
                return (
                  <button
                    key={choice.id}
                    type="button"
                    className="quick-session-choice"
                    data-selected={selected}
                    data-result={choiceResult}
                    aria-pressed={selected}
                    disabled={submitted || Boolean(finalResponse)}
                    onClick={() => props.onChoice(choice.id)}
                  >
                    <span className="quick-session-choice-key">{choice.id}</span>
                    <span>{choice.text}</span>
                    {submitted && correct ? <Check size={18} aria-label="Correct answer" /> : null}
                    {submitted && selected && !correct ? <X size={18} aria-label="Your incorrect selection" /> : null}
                  </button>
                )
              })}
            </div>
            <div className="quick-session-evidence">
              <span>{contentStatus}</span>
              <button type="button" className="quick-session-text-button" onClick={() => setDetailsOpen(true)}>Item details</button>
              {submitted ? <button type="button" className="quick-session-text-button" onClick={props.onToggleReview}>Review rationale</button> : null}
            </div>
          </>
        )}
      </div>

      <footer className="quick-session-footer">
        {submitted && !finalResponse ? (
          <div className="quick-session-confidence" role="group" aria-label="Choose confidence to save your answer">
            <span>Choose confidence to continue</span>
            <div>{(['low', 'medium', 'high'] as const).map((level) => (
              <button key={level} type="button" className="quick-session-secondary" onClick={() => props.onConfidence(level)}>{level[0].toUpperCase() + level.slice(1)}</button>
            ))}</div>
          </div>
        ) : null}
        <div className="quick-session-navigation">
          <div className="quick-session-navigation-secondary">
            <button type="button" className="quick-session-text-button" onClick={props.onBack} disabled={session.currentIndex === 0 || Boolean(session.config.noBacktracking)} aria-label="Previous question"><ArrowLeft size={18} aria-hidden="true" /><span>Back</span></button>
            <button type="button" className="quick-session-text-button" onClick={props.onSaveAndLeave} disabled={submitted && !finalResponse}>Save &amp; leave</button>
          </div>
          {!submitted ? (
            <button type="button" className="quick-session-primary" onClick={props.onSubmit} disabled={!selectedAnswers.length}>Submit answer<ArrowRight size={18} aria-hidden="true" /></button>
          ) : finalResponse ? (
            <button type="button" className="quick-session-primary" onClick={isLast ? props.onFinish : props.onNext}>{isLast ? 'Finish session' : 'Next question'}<ArrowRight size={18} aria-hidden="true" /></button>
          ) : null}
        </div>
      </footer>

      <dialog ref={dialogRef} className="quick-session-dialog" aria-labelledby="quick-study-details-title" onClose={() => { setDetailsOpen(false); setDiscardRequested(false) }} onCancel={() => { setDetailsOpen(false); setDiscardRequested(false) }}>
        <header className="quick-session-dialog-header">
          <h2 id="quick-study-details-title">{submitted ? 'Explanation & sources' : 'Item details'}</h2>
          <button type="button" className="quick-session-text-button" aria-label="Close item details" onClick={() => setDetailsOpen(false)}><X size={22} aria-hidden="true" /></button>
        </header>
        <div className="quick-session-dialog-body">
          {submitted ? (
            <>
              <h3>Why this answer is correct</h3><p>{question.rationale.whyCorrect}</p>
              <h3>Why the other options fall away</h3><p>{question.rationale.whyOthers}</p>
              {question.rationale.choices ? <dl>{Object.entries(question.rationale.choices).map(([id, explanation]) => <div key={id}><dt>Option {id}</dt><dd>{explanation}</dd></div>)}</dl> : null}
              <h3>Test-taking cue</h3><p>{question.nclexTip} {props.tutorCue}</p>
              <h3>Clinical relevance</h3><p>{question.clinicalRelevance}</p>
            </>
          ) : null}
          <h3>Content &amp; source status</h3>
          <p>{props.evidenceLevel}. This is study practice, not a licensure prediction or clinical guidance.</p>
          <p>{clinicalReviewed ? 'SME reviewed.' : 'Not marked as SME reviewed.'} {sourcesNeeded ? 'Source verification is incomplete.' : 'Source-backed practice item.'}</p>
          {props.trustFlags.length ? <ul>{props.trustFlags.map((flag) => <li key={flag}>{flag}</li>)}</ul> : null}
          {question.sourceTopic ? <p>Source topic: {question.sourceTopic}</p> : null}
          {question.sourceStatus ? <p>Source review: {question.sourceStatus.replaceAll('_', ' ')}</p> : null}
          {question.sourceMapStatus ? <p>Source mapping: {question.sourceMapStatus.replaceAll('_', ' ')}</p> : null}
          {question.contentStage ? <p>Content stage: {question.contentStage.replaceAll('_', ' ')}</p> : null}
          {question.sourceRefs?.length ? <ul>{question.sourceRefs.map((source, index) => <li key={`${source}-${index}`}>{source}</li>)}</ul> : <p>No source references are listed for this item.</p>}
          {question.sourceNeededClaims?.length ? <><h3>Claims awaiting source review</h3><ul>{question.sourceNeededClaims.map((claim) => <li key={claim}>{claim}</li>)}</ul></> : null}
          {question.feedbackEnabled ? (
            <section className="quick-session-report">
              <h3>Report content issue</h3>
              <button type="button" className="quick-session-secondary" onClick={props.onFeedbackToggle} aria-expanded={props.feedbackOpen}>{props.feedbackOpen ? 'Close report' : 'Open report'}</button>
              {props.feedbackSubmittedId ? <p role="status">Report saved for internal review.</p> : null}
              {props.feedbackOpen ? (
                <form onSubmit={(event) => { event.preventDefault(); props.onFeedbackSubmit() }}>
                  <label>Issue type<select value={props.feedbackReason} onChange={(event) => props.onFeedbackReason(event.target.value as ContentFeedbackReason)}>{contentFeedbackReasons.map((reason) => <option key={reason} value={reason}>{contentFeedbackReasonLabels[reason]}</option>)}</select></label>
                  <label>Note<textarea value={props.feedbackNote} onChange={(event) => props.onFeedbackNote(event.target.value)} maxLength={500} rows={3} placeholder="Optional. Do not enter patient identifiers or private info." /></label>
                  <button type="submit" className="quick-session-primary">Submit report</button>
                </form>
              ) : null}
            </section>
          ) : null}
          {!session.config.noBacktracking ? (
            <details className="quick-session-question-list">
              <summary>Jump to a question</summary>
              <div>{session.questionIds.map((id, index) => <button key={id} type="button" className="quick-session-secondary" aria-current={index === session.currentIndex ? 'step' : undefined} onClick={() => { setDetailsOpen(false); props.onGoTo(index) }}>Question {index + 1}{session.responses.some((response) => response.questionId === id) ? ' · answered' : ''}</button>)}</div>
            </details>
          ) : null}
          <section className="quick-session-discard">
            {discardRequested ? (
              <div role="group" aria-label="Confirm session discard">
                <p>Discard this session? Your recorded answers will be kept, but this session will no longer be resumable.</p>
                <button type="button" className="quick-session-secondary" onClick={() => setDiscardRequested(false)}>Keep studying</button>
                <button type="button" className="quick-session-text-button" onClick={props.onExit}>Confirm discard</button>
              </div>
            ) : <button type="button" className="quick-session-text-button" onClick={() => setDiscardRequested(true)}>Discard this session</button>}
          </section>
        </div>
      </dialog>
    </section>
  )
}

interface MissedReview {
  id: string
  question?: Question
  reason: string
  diagnosis?: string
  remediation?: string
}

export function QuickStudyCompleteView({ session, score, takeaway, missed, breakdown, onRepair, onRemediation, onExit }: {
  session: ActiveSession
  score: number
  takeaway: string
  missed: MissedReview[]
  breakdown: { category: string; accuracy: number }[]
  onRepair?: () => void
  onRemediation: () => void
  onExit: () => void
}) {
  return (
    <section className="quick-session quick-session-complete" aria-label="Quick Study results">
      <header className="quick-session-header"><div className="quick-session-heading"><h1>Quick Study</h1><span>Session complete</span></div></header>
      <div className="quick-session-body" tabIndex={0} aria-label="Session results and review">
        <div className="quick-session-summary">
          <p className="quick-session-score">{score}<span>%</span></p>
          <h2>Session complete.</h2>
          <p>{session.responses.filter((response) => response.isCorrect).length} correct · {missed.length} missed · {session.responses.length} answered</p>
          <p>{takeaway}</p>
          <p className="quick-session-evidence">Practice evidence only, not a licensure prediction.</p>
        </div>
        {missed.length ? <div className="quick-session-missed"><h3>Review missed questions</h3>{missed.map((item, index) => <details key={item.id}><summary>{index + 1}. {item.question?.prompt ?? 'Saved question unavailable'}</summary>{item.question ? <><p>{item.question.rationale.whyCorrect}</p><p>{item.reason}</p>{item.diagnosis ? <p>Pattern: {item.diagnosis}</p> : null}{item.remediation ? <p>Next repair: {item.remediation}</p> : null}<p>{item.question.rationale.whyOthers}</p></> : <p>This saved question is no longer available. Rebuild the set before using this result for review.</p>}</details>)}</div> : null}
        {breakdown.length ? <details className="quick-session-breakdown"><summary>Category breakdown</summary><dl>{breakdown.map((item) => <div key={item.category}><dt>{item.category}</dt><dd>{Math.round(item.accuracy * 100)}%</dd></div>)}</dl></details> : null}
      </div>
      <footer className="quick-session-footer"><div className="quick-session-navigation"><div className="quick-session-navigation-secondary"><button type="button" className="quick-session-text-button" onClick={onRemediation}>Open remediation</button>{onRepair ? <button type="button" className="quick-session-secondary" onClick={onRepair}>Repair missed topic</button> : null}</div><button type="button" className="quick-session-primary" onClick={onExit}>Close session<Check size={18} aria-hidden="true" /></button></div></footer>
    </section>
  )
}

export function QuickStudyMissingView({ onRebuild, onExit }: { onRebuild: () => void; onExit: () => void }) {
  return (
    <section className="quick-session" aria-label="Unavailable Quick Study session">
      <header className="quick-session-header"><h1>Quick Study</h1></header>
      <div className="quick-session-body quick-session-summary"><h2>This practice set needs to be rebuilt.</h2><p>A saved question is no longer available. Your past attempts are preserved.</p></div>
      <footer className="quick-session-footer"><div className="quick-session-navigation"><button type="button" className="quick-session-secondary" onClick={onExit}>Close session</button><button type="button" className="quick-session-primary" onClick={onRebuild}>Rebuild set<ArrowRight size={18} aria-hidden="true" /></button></div></footer>
    </section>
  )
}
