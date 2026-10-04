import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, Check, CircleX, Flag, FileText, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import { StudyToolsMenu } from './study-tools-menu'
import type { ActiveSession, ConfidenceLevel, Question, SessionResponse } from '../app/types'
import {
  contentFeedbackReasonLabels,
  contentFeedbackReasons,
  type ContentFeedbackReason,
} from '../services/content-feedback'

interface QuestionViewProps {
  focused?: boolean
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
  const { session, question, selectedAnswers, submitted, finalResponse } = props
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [discardRequested, setDiscardRequested] = useState(false)
  const dialogRef = useRef<HTMLDialogElement>(null)
  const bodyRef = useRef<HTMLDivElement>(null)
  const isLast = session.currentIndex === session.questionIds.length - 1
  const reviewing = submitted
  const result = props.isCorrect ? 'correct' : props.resultLabel === 'Partial' ? 'partial' : 'incorrect'
  const clinicalReviewed = question.clinicalReviewStatus === 'sme_reviewed'
  const sourcesNeeded = question.sourceStatus === 'source_needed' || !question.sourceBacked
  // Keep the original clinical wording; longer rationales remain in the Why dialog.
  const takeaway = question.rationale.whyCorrect.length <= 240 ? question.rationale.whyCorrect : null

  useEffect(() => {
    const dialog = dialogRef.current
    if (detailsOpen && dialog && !dialog.open) dialog.showModal()
    else if (!detailsOpen && dialog?.open) dialog.close()
  }, [detailsOpen])

  useEffect(() => {
    const body = bodyRef.current
    if (!body) return
    const selected = body.querySelector('[data-selected="true"]')
    const top = reviewing && selected && window.innerWidth < 640
      ? selected.getBoundingClientRect().top - body.getBoundingClientRect().top + body.scrollTop - 12
      : 0
    body.scrollTo({ top })
  }, [reviewing, session.currentIndex])

  return (
    <section className={`quick-session${props.focused ? ' focused-practice' : ''}`} aria-label={props.focused ? 'Practice session' : 'Quick Study session'}>
      <header className="quick-session-header">
        {props.focused ? <><nav className="focused-practice-top" aria-label="Practice navigation">
          <Link to="/" className="focused-practice-home"><ArrowLeft size={24} aria-hidden="true" />Home</Link>
          <div className="focused-practice-progress">
          <progress value={session.currentIndex + 1} max={session.questionIds.length} aria-label="Question position" />
          <span>{session.currentIndex + 1} of {session.questionIds.length}</span>
          </div>
          <StudyToolsMenu />
        </nav></> : <>
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
        </>}
      </header>

      <div className="quick-session-body" ref={bodyRef} tabIndex={0} aria-label={reviewing ? 'Answer review' : 'Question and answer choices'}>
          <>
            {!props.focused ? <div className="quick-session-question-meta">
              <span>{question.format === 'select-all-that-apply' ? 'Select all that apply' : 'Choose one answer'}</span>
              <button type="button" className="quick-session-text-button" onClick={props.onFlag} disabled={submitted || Boolean(finalResponse)} aria-pressed={props.flagged}>
                <Flag size={16} aria-hidden="true" />{props.flagged ? 'Flagged' : 'Flag for review'}
              </button>
            </div> : null}
            {!props.focused && question.scenario ? <p className="quick-session-scenario">{question.scenario}</p> : null}
            {props.focused && question.scenario ? <div className="focused-practice-patient"><p>{question.scenario}</p></div> : null}
            <h2 id="quick-study-question">{question.prompt}</h2>
            {props.focused && question.format === 'select-all-that-apply' ? <p className="focused-practice-instruction">Select all that apply.</p> : null}
            <div className="quick-session-choices" role="group" aria-labelledby="quick-study-question">
              {question.choices.map((choice) => {
                const selected = selectedAnswers.includes(choice.id)
                const correct = question.correctAnswer.includes(choice.id)
                const choiceResult = submitted ? correct ? selected ? 'correct' : 'missed' : selected ? 'incorrect' : undefined : undefined
                const multiple = question.format === 'select-all-that-apply'
                const label = !submitted ? selected ? 'Selected' : ''
                  : correct ? selected ? multiple ? 'Correct selection' : 'Correct answer · Your answer'
                    : multiple ? 'Missed correct answer' : 'Correct answer'
                    : selected ? multiple ? 'Incorrect selection' : 'Your answer · Incorrect' : ''
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
                    {props.focused ? <span className="focused-practice-marker" aria-hidden="true">{choice.id}</span> : <span className="quick-session-choice-key">{choice.id}</span>}
                    <span className="quick-session-choice-content"><span>{choice.text}</span>
                      {label && (!props.focused || submitted) ? <span className="quick-session-choice-label">{submitted ? correct ? <Check size={16} aria-hidden="true" /> : <X size={16} aria-hidden="true" /> : <Check size={16} aria-hidden="true" />}{label}</span> : null}
                    </span>
                  </button>
                )
              })}
            </div>
          </>
      </div>

      {props.focused ? <footer className="quick-session-footer practice-feedback-dock" data-result={submitted ? result : undefined}>
        {submitted ? <div className="practice-feedback-summary" key={`${question.id}-${result}`}>
          <span className={`practice-feedback-icon${props.isCorrect ? ' practice-check-draw' : ''}`} aria-hidden="true">
            {props.isCorrect ? <Check size={32} strokeWidth={3} /> : <X size={32} strokeWidth={3} />}
          </span>
          <div className="practice-feedback-copy">
            <p role="status">{props.isCorrect ? 'Correct!' : result === 'partial' ? 'Almost!' : 'Not quite.'}</p>
            <span>{props.isCorrect ? 'Nice work.' : result === 'partial' ? 'Review the highlighted choices.' : 'The correct answer is highlighted above.'}</span>
            <div className="practice-feedback-actions">
              <button type="button" onClick={props.onFlag} aria-pressed={props.flagged}><Flag size={16} aria-hidden="true" />{props.flagged ? 'Flagged' : 'Flag'}</button>
              <button type="button" onClick={props.onSaveAndLeave}><FileText size={16} aria-hidden="true" />Save &amp; leave</button>
              <button type="button" onClick={() => setDetailsOpen(true)}>Why?<span className="sr-only"> Explanation and sources</span></button>
            </div>
          </div>
        </div> : null}
        <button type="button" className="quick-session-primary" data-check-answer={!submitted || undefined} disabled={!submitted ? !selectedAnswers.length : !finalResponse} onClick={!submitted ? props.onSubmit : isLast ? props.onFinish : props.onNext}>
          {!submitted ? 'Check answer' : isLast ? 'Finish session' : 'Continue'}<ArrowRight size={18} aria-hidden="true" />
        </button>
      </footer> : <footer className="quick-session-footer">
        {submitted ? (
          <div className="quick-session-feedback" data-result={result}>
            <p className="quick-session-result" data-result={result} role="status">
              {props.isCorrect ? <Check size={20} aria-hidden="true" /> : <X size={20} aria-hidden="true" />}
              {props.isCorrect ? 'Correct!' : result === 'partial' ? 'Almost — check the highlighted choices.' : 'Not quite'}
            </p>
            {takeaway && !props.focused ? <p className="quick-session-takeaway">{takeaway}</p> : null}
            <button type="button" className="quick-session-text-button" onClick={() => setDetailsOpen(true)}>Why? <span className="sr-only">Explanation and sources</span></button>
          </div>
        ) : null}
        <div className="quick-session-navigation">
          <div className="quick-session-navigation-secondary">
            {props.focused ? <button type="button" className="quick-session-text-button" onClick={props.onFlag} disabled={submitted || Boolean(finalResponse)} aria-pressed={props.flagged}><Flag size={20} aria-hidden="true" />{props.flagged ? 'Flagged' : 'Flag'}</button> : <button type="button" className="quick-session-text-button" onClick={props.onBack} disabled={session.currentIndex === 0 || Boolean(session.config.noBacktracking)} aria-label="Previous question"><ArrowLeft size={18} aria-hidden="true" /><span>Back</span></button>}
            <button type="button" className="quick-session-text-button" onClick={props.onSaveAndLeave}>{props.focused ? <FileText size={20} aria-hidden="true" /> : null}Save &amp; leave</button>
            {!submitted ? <button type="button" className="quick-session-text-button" onClick={() => setDetailsOpen(true)}>{props.focused ? 'More' : 'Sources & options'}</button> : null}
          </div>
          {!submitted ? (
            <button type="button" className="quick-session-primary" data-check-answer="true" onClick={props.onSubmit} disabled={!selectedAnswers.length}>Check answer<ArrowRight size={18} aria-hidden="true" /></button>
          ) : finalResponse ? (
            <button type="button" className="quick-session-primary" onClick={isLast ? props.onFinish : props.onNext}>{isLast ? 'Finish session' : 'Continue'}<ArrowRight size={18} aria-hidden="true" /></button>
          ) : null}
        </div>
      </footer>}

      <dialog ref={dialogRef} className="quick-session-dialog" aria-labelledby="quick-study-details-title" onClose={() => { setDetailsOpen(false); setDiscardRequested(false) }} onCancel={() => { setDetailsOpen(false); setDiscardRequested(false) }}>
        <header className="quick-session-dialog-header">
          <h2 id="quick-study-details-title">{submitted ? 'Why this answer?' : 'Item details'}</h2>
          <button type="button" className="quick-session-text-button" aria-label="Close item details" onClick={() => setDetailsOpen(false)}><X size={22} aria-hidden="true" /></button>
        </header>
        <div className="quick-session-dialog-body">
          {submitted ? (
            <>
              <p className="quick-session-main-explanation">{question.rationale.whyCorrect}</p>
              <details className="quick-session-explanation-more"><summary>Why not the other answers?</summary><p>{question.rationale.whyOthers}</p>
              {question.rationale.choices ? <dl>{Object.entries(question.rationale.choices).map(([id, explanation]) => <div key={id}><dt>Option {id}</dt><dd>{explanation}</dd></div>)}</dl> : null}
              </details>
              <details className="quick-session-explanation-more"><summary>Study tips</summary><p>{question.nclexTip} {props.tutorCue}</p>
              <h3>Clinical relevance</h3><p>{question.clinicalRelevance}</p>
              </details>
            </>
          ) : null}
          <details className="quick-session-explanation-more"><summary>Sources &amp; review status</summary>
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
          </details>
          <details className="quick-session-explanation-more"><summary>Report an issue &amp; session options</summary>
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
          </details>
        </div>
        <footer className="quick-session-dialog-footer"><button type="button" className="quick-session-primary" onClick={() => setDetailsOpen(false)}>Back to question<ArrowRight size={18} aria-hidden="true" /></button></footer>
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

export function QuickStudyCompleteView({ focused = false, completionActions, session, score, takeaway, missed, breakdown, onRepair, onRemediation, onExit }: {
  completionActions?: React.ReactNode
  focused?: boolean
  session: ActiveSession
  score: number
  takeaway: string
  missed: MissedReview[]
  breakdown: { category: string; accuracy: number }[]
  onRepair?: () => void
  onRemediation: () => void
  onExit: () => void
}) {
  const [reviewOpen, setReviewOpen] = useState(false)
  if (focused) return <section className="quick-session focused-practice practice-complete" aria-label="Practice results">
    <header className="quick-session-header"><nav className="focused-practice-top" aria-label="Practice navigation"><Link to="/" className="focused-practice-home"><ArrowLeft size={24} aria-hidden="true" />Home</Link><StudyToolsMenu /></nav></header>
    <div className="quick-session-body" tabIndex={0} aria-label="Session results and review">
      {!reviewOpen && <div className="practice-complete-summary">
        <h1>Your session, at a glance</h1>
        <p>{session.responses.length} questions completed</p>
        <ol className="practice-result-trail" aria-label="Question results">
          {session.questionIds.map((id, index) => {
            const correct = session.responses.find(response => response.questionId === id)?.isCorrect === true
            return <li key={id} aria-label={`Question ${index + 1}: ${correct ? 'Correct' : 'To review'}`}><span>{index + 1}</span>{correct ? <Check className="practice-result-correct" size={32} aria-hidden="true" /> : <CircleX className="practice-result-missed" size={32} aria-hidden="true" />}</li>
          })}
        </ol>
        <div className="practice-result-legend"><span><Check className="practice-result-correct" size={26} aria-hidden="true" />{session.responses.filter(response => response.isCorrect).length} correct</span><span><CircleX className="practice-result-missed" size={26} aria-hidden="true" />{missed.length} to review</span><span className="practice-result-accuracy"><strong>{score}%</strong> accuracy</span></div>
      </div>}
      <div className="practice-complete-actions">
        {!reviewOpen && <p>{missed.length ? 'Revisit the questions you missed.' : 'You answered every question correctly.'}</p>}
        <div>{missed.length > 0 && <button className="quick-session-primary" onClick={() => setReviewOpen(value => !value)} aria-expanded={reviewOpen}>{reviewOpen ? 'Back to results' : 'Review missed questions'}<ArrowRight size={18} aria-hidden="true" /></button>}<button className="quick-session-secondary" onClick={onExit}>Done</button></div>
      </div>
      {completionActions && !reviewOpen ? <div className="practice-complete-details">{completionActions}</div> : null}
      {reviewOpen && <section className="quick-session-missed" aria-label="Missed questions"><h2>Review missed questions</h2>{missed.map((item,index) => <details key={item.id}><summary>{index + 1}. {item.question?.prompt ?? 'Saved question unavailable'}</summary>{item.question ? <><p>{item.question.scenario}</p><p><strong>Correct answer: </strong>{item.question.choices.filter(choice => item.question!.correctAnswer.includes(choice.id)).map(choice => choice.text).join(' ')}</p><p>{item.question.rationale.whyCorrect}</p></> : <p>This saved question is no longer available.</p>}</details>)}</section>}
      <details className="practice-complete-details"><summary>Session details</summary><p>Practice results only, not a licensure prediction.</p><dl>{breakdown.map(item => <div key={item.category}><dt>{item.category}</dt><dd>{Math.round(item.accuracy * 100)}%</dd></div>)}</dl>{onRepair && <button className="quick-session-secondary" onClick={onRepair}>Practice missed topic</button>}<button className="quick-session-text-button" onClick={onRemediation}>Open study review</button></details>
    </div>
  </section>
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
