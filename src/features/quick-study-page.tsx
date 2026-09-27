import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Check, X } from 'lucide-react'
import { useStudySystemStore } from '../app/store'
import { getQuickStudyResult, getQuickStudySet, isQuickStudyCorrect, quickStudyBank, quickStudySources } from '../services/quick-study-bank'
import type { QuickStudyItem } from '../services/quick-study-bank'
import { QuestionSessionRunner } from './ui'
import nursingCommandLogo from '../assets/brand/nursing-command-logo.png'

// Draft-bank rounds never write attempts or official readiness evidence.
export function QuickStudyPage() {
  const [sessionId, setSessionId] = useState(1)
  const [items, setItems] = useState(() => getQuickStudySet(1))
  const [index, setIndex] = useState(0)
  const [selected, setSelected] = useState<number[]>([])
  const [checked, setChecked] = useState(false)
  const [results, setResults] = useState<{ id: string; correct: boolean }[]>([])
  const [finished, setFinished] = useState(false)
  const [retry, setRetry] = useState(false)
  const [details, setDetails] = useState<'about' | 'why'>('about')
  const [legacy, setLegacy] = useState(false)
  const dialogRef = useRef<HTMLDialogElement>(null)
  const bodyRef = useRef<HTMLDivElement>(null)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const activeSession = useStudySystemStore((state) => state.activeSession)
  const abandonSession = useStudySystemStore((state) => state.abandonSession)
  const previousSession = activeSession?.mode === 'quick-study' && activeSession.status !== 'discarded' && !activeSession.deletedAt ? activeSession : null
  const question = items[index]
  const result = getQuickStudyResult(selected, question)
  const missed = items.filter((item) => results.some((answer) => answer.id === item.id && !answer.correct))
  const score = results.filter((answer) => answer.correct).length

  function focusQuestion() {
    requestAnimationFrame(() => {
      bodyRef.current?.scrollTo({ top: 0 })
      headingRef.current?.focus({ preventScroll: true })
    })
  }
  function start(id: number, subset?: QuickStudyItem[]) {
    setSessionId(id); setItems(subset ?? getQuickStudySet(id)); setIndex(0)
    setSelected([]); setChecked(false); setResults([]); setFinished(false); setRetry(Boolean(subset))
    focusQuestion()
  }
  function showDetails(value: 'about' | 'why') {
    setDetails(value)
    dialogRef.current?.showModal()
  }
  function advance() {
    if (finished) { start(sessionId === 10 ? 1 : sessionId + 1); return }
    if (!checked) {
      if (!selected.length) return
      setChecked(true)
      setResults((previous) => [...previous, { id: question.id, correct: isQuickStudyCorrect(selected, question.correct) }])
      return
    }
    if (index === items.length - 1) setFinished(true)
    else { setIndex(index + 1); setSelected([]); setChecked(false) }
    focusQuestion()
  }

  return (
    <div className="quick-study-page">
      <header className="home-launcher-header quick-study-header">
        <Link className="home-launcher-brand" to="/" aria-label="Nurse Command home">
          <img src={nursingCommandLogo} alt="" /><span>Nurse <span>Command</span></span>
        </Link>
        <div className="quick-bank-header-actions">
          <button className="quick-session-text-button" onClick={() => showDetails('about')}>About this set</button>
          <Link className="home-tools-trigger" to="/"><ArrowLeft size={16} aria-hidden="true" /> Home</Link>
        </div>
      </header>
      <main className="quick-study-main" aria-label="Quick Study">
        {legacy && previousSession ? <QuestionSessionRunner key={previousSession.id + '-' + previousSession.currentIndex} session={previousSession} modeLabel="Previous Quick Study" onExit={() => { abandonSession(); setLegacy(false) }} compact /> : (
          <section className="quick-session" aria-label="Five-question session">
            <header className="quick-session-header">
              <div className="quick-session-heading">
                <h1>Quick Study</h1>
                <label className="quick-bank-selector">Session
                  <select aria-label="Session" value={sessionId} onChange={(event) => {
                    const id = Number(event.target.value)
                    if (!finished && (selected.length || results.length) && !window.confirm('Switch sessions? Your current round is not saved.')) return
                    start(id)
                  }}>{quickStudyBank.sessions.map((session) => <option key={session.id} value={session.id}>{session.id}. {session.title}</option>)}</select>
                </label>
              </div>
              <div className="quick-session-progress-label"><span>{finished ? (retry ? 'Retry complete' : 'Session complete') : (retry ? 'Retry · ' : '') + 'Question ' + (index + 1) + ' of ' + items.length}</span><span>{results.length} checked</span></div>
              <progress className="quick-session-progress" aria-label="Session completion" max={items.length} value={results.length} />
            </header>
            <div className="quick-session-body" ref={bodyRef}>
              {finished ? <div className="quick-session-summary">
                <h2 tabIndex={-1} ref={headingRef}>Session complete</h2>
                <p className="quick-session-score">{score} <span>/ {items.length}</span></p>
                <p>{missed.length ? 'You have ' + missed.length + ' question' + (missed.length === 1 ? '' : 's') + ' to revisit.' : 'You answered every question correctly in this round.'}</p>
                <p className="quick-bank-muted">Exact-match practice score, not an NCLEX readiness measure.</p>
                <div className="quick-session-review-actions">{missed.length > 0 && <button className="quick-session-secondary" onClick={() => start(sessionId, missed)}>Retry missed questions</button>}<button className="quick-session-secondary" onClick={() => start(sessionId)}>Repeat session</button></div>
              </div> : <>
                <p className="quick-session-question-meta">{question.type === 'multiple' ? 'Select all that apply' : 'Choose the best answer'}</p>
                <h2 id="quick-bank-prompt" tabIndex={-1} ref={headingRef}>{question.prompt}</h2>
                <div className="quick-session-choices" role="group" aria-labelledby="quick-bank-prompt">
                  {question.choices.map((choice, choiceIndex) => {
                    const picked = selected.includes(choiceIndex)
                    const correct = question.correct.includes(choiceIndex)
                    const state = checked ? (correct ? (picked ? 'correct' : 'missed') : (picked ? 'incorrect' : undefined)) : undefined
                    const label = checked ? (correct ? (picked ? 'Correct selection' : 'Missed correct answer') : (picked ? 'Your answer · Incorrect' : '')) : (picked ? 'Selected' : '')
                    return <button key={choiceIndex} className="quick-session-choice" data-choice={choiceIndex} data-selected={picked} data-result={state} aria-pressed={picked} disabled={checked} onClick={() => setSelected((previous) => question.type === 'single' ? [choiceIndex] : previous.includes(choiceIndex) ? previous.filter((value) => value !== choiceIndex) : [...previous, choiceIndex])}>
                      <span className="quick-session-choice-key">{String.fromCharCode(65 + choiceIndex)}</span>
                      <span className="quick-session-choice-content"><span>{choice}</span>{label && <span className="quick-session-choice-label">{state === 'incorrect' ? <X size={16} aria-hidden="true" /> : <Check size={16} aria-hidden="true" />}{label}</span>}</span>
                    </button>
                  })}
                </div>
              </>}
            </div>
            <footer className="quick-session-footer">
              {checked && !finished && <div className="quick-session-feedback" data-result={result} role="status" aria-live="polite">
                <div className="quick-bank-result-row"><p className="quick-session-result" data-result={result}>{result === 'correct' ? 'Correct!' : result === 'partial' ? 'Almost — check the highlighted answers.' : 'Not quite — the correct answer is highlighted.'}</p><button className="quick-session-text-button" onClick={() => showDetails('why')}>Why?</button></div>
                <p className="quick-session-takeaway">{question.rationale}</p>
              </div>}
              <div className="quick-session-navigation"><span className="quick-bank-muted">{finished ? 'Five questions at a time' : checked ? 'Review, then continue' : question.type === 'multiple' ? 'Select all that apply' : 'Choose one answer'}</span><button className="quick-session-primary" onClick={advance} disabled={!finished && !selected.length}>{finished ? (sessionId === 10 ? 'Back to session 1' : 'Next session') : checked ? (index === items.length - 1 ? 'Finish session' : 'Continue') : 'Check answer'}</button></div>
            </footer>
          </section>
        )}
      </main>
      <dialog ref={dialogRef} className="quick-session-dialog" aria-labelledby="quick-bank-details-title">
        <header className="quick-session-dialog-header"><h2 id="quick-bank-details-title">{details === 'why' ? 'Why this answer?' : 'About this question set'}</h2><button className="quick-session-secondary" onClick={() => dialogRef.current?.close()}>Close</button></header>
        <div className="quick-session-dialog-body">{details === 'why' ? <>
          <p>{question.rationale}</p><p><strong>Correct {question.correct.length > 1 ? 'answers' : 'answer'}:</strong> {question.correct.map((value) => String.fromCharCode(65 + value) + '. ' + question.choices[value]).join(' ')}</p>
          <ul>{question.sources.map((key) => { const [title, url] = quickStudySources[key]; return <li key={key}>{url ? <a href={url} target="_blank" rel="noopener noreferrer">{title}</a> : title}</li> })}</ul>
          <p>Original draft · clinical expert review pending. Not clinical guidance.</p>
        </> : <>
          <p>50 original NCLEX-RN-style draft questions in ten five-question sessions. Choose, check, and continue. Retry missed questions at the end.</p>
          <p>Quizlet’s public topic index inspired the organization. These are not copied Quizlet cards, and this set is not affiliated with Quizlet or NCSBN. Clinical expert review is still pending. References are available through Why? after each answer.</p>
          <p>Multi-select uses exact-match practice scoring, not official NCLEX partial credit. This set does not contribute to readiness scores or cloud study history. The current round resets when you leave or reload. Medication orders are fictional arithmetic exercises, not dosing recommendations.</p>
          {previousSession && <button className="quick-session-secondary" onClick={() => { dialogRef.current?.close(); setLegacy(!legacy) }}>{legacy ? 'Return to 50-question set' : 'Resume previous Quick Study session'}</button>}
        </>}</div>
      </dialog>
    </div>
  )
}
