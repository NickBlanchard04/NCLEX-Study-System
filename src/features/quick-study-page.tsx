import { StudyNavigation } from './study-tools-menu'
import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Check, CircleX, X } from 'lucide-react'
import { useStudySystemStore } from '../app/store'
import { getIntroPracticeSet, getNextQuickStudySessionId, getQuickStudyResult, getQuickStudySet, isQuickStudyCorrect, quickStudyBank, quickStudySources } from '../services/quick-study-bank'
import type { QuickStudyItem } from '../services/quick-study-bank'
import { QuestionSessionRunner } from './ui'
import { normalizeQuickStudyProgress, recordQuickStudyAnswer, readGuestSeenIds, writeGuestSeenIds } from '../services/daily-lesson'
import { updateLearningProgress } from '../services/learning-progress'
import nursingCommandLogo from '../assets/brand/nursing-command-logo.png'
import { readQuickStudyRound } from '../services/quick-study-resume'
import { writeStudyLocal } from '../services/study-handoff'
import { StudyResultSave } from './study-result-save'

// Draft-bank rounds never write attempts or official readiness evidence.
export function QuickStudyPage({ initialItems, mode = 'practice', onComplete }: { initialItems?: QuickStudyItem[]; mode?: 'practice' | 'daily' | 'review'; onComplete?: () => void }) {
  const navigate = useNavigate()
  const [search] = useSearchParams()
  const intro = mode === 'practice' && search.get('start') === '5'
  const authUser = useStudySystemStore((state) => state.authUser)
  const profile = useStudySystemStore((state) => state.profile)
  const syncStatus = useStudySystemStore((state) => state.syncStatus)
  const syncNow = useStudySystemStore((state) => state.syncNow)
  const progress = normalizeQuickStudyProgress(profile.preferences.quickStudy)
  const title = mode === 'daily' ? 'Daily Lesson' : mode === 'review' ? 'Review' : 'Practice'
  const roundKey = `quick-round:${authUser?.id ?? 'guest'}`
  const [savedRound] = useState(() => mode === 'practice' ? readQuickStudyRound(roundKey) : null)
  const [resumePrompt, setResumePrompt] = useState(Boolean(savedRound))
  const [roundId, setRoundId] = useState(() => savedRound?.id ?? crypto.randomUUID())
  const [startedAt, setStartedAt] = useState(() => savedRound?.startedAt ?? new Date().toISOString())
  const [completedAt, setCompletedAt] = useState(savedRound?.completedAt ?? savedRound?.startedAt)
  const [storageFailed, setStorageFailed] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [sessionId, setSessionId] = useState(savedRound?.sessionId ?? 1)
  const [items, setItems] = useState(() => savedRound ? savedRound.ids.map((id) => quickStudyBank.questions.find((q) => q.id === id)!) : initialItems ?? (intro ? getIntroPracticeSet(authUser ? progress.seenIds : readGuestSeenIds()) : getQuickStudySet(1)))
  const [index, setIndex] = useState(savedRound?.index ?? 0)
  const [selected, setSelected] = useState<number[]>(savedRound?.selected ?? [])
  const [checked, setChecked] = useState(savedRound?.checked ?? false)
  const [results, setResults] = useState<{ id: string; correct: boolean }[]>(savedRound?.results ?? [])
  const [finished, setFinished] = useState(savedRound?.finished ?? false)
  const [retry, setRetry] = useState(savedRound?.retry ?? false)
  const [details, setDetails] = useState<'about' | 'why'>('about')
  const [legacy, setLegacy] = useState(false)
  const dialogRef = useRef<HTMLDialogElement>(null)
  const bodyRef = useRef<HTMLDivElement>(null)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const activeSession = useStudySystemStore((state) => state.activeSession)
  const abandonSession = useStudySystemStore((state) => state.abandonSession)
  const previousSession = authUser && activeSession?.mode === 'quick-study' && activeSession.status !== 'discarded' && !activeSession.deletedAt ? activeSession : null
  const question = items[index]
  const result = getQuickStudyResult(selected, question)
  const missed = items.filter((item) => results.some((answer) => answer.id === item.id && !answer.correct))
  const score = results.filter((answer) => answer.correct).length
  useEffect(() => {
    if (mode !== 'practice' || resumePrompt) return
    const success = writeStudyLocal(roundKey, { id: roundId, startedAt, completedAt, sessionId, ids: items.map((item) => item.id), index, selected, checked, results, finished, retry })
    // Report browser-storage failures instead of claiming the round is saved.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setStorageFailed(!success)
  }, [mode, resumePrompt, roundKey, roundId, startedAt, completedAt, sessionId, items, index, selected, checked, results, finished, retry])

  function focusQuestion() {
    requestAnimationFrame(() => {
      bodyRef.current?.scrollTo({ top: 0 })
      headingRef.current?.focus({ preventScroll: true })
    })
  }
  function start(id: number, subset?: QuickStudyItem[]) {
    setRoundId(crypto.randomUUID()); setStartedAt(new Date().toISOString()); setResumePrompt(false)
    setCompletedAt(undefined)
    setSessionId(id); setItems(subset ?? (intro ? getIntroPracticeSet(authUser ? progress.seenIds : readGuestSeenIds()) : getQuickStudySet(id))); setIndex(0)
    setSelected([]); setChecked(false); setResults([]); setFinished(false); setRetry(Boolean(subset))
    focusQuestion()
  }
  function showDetails(value: 'about' | 'why') {
    setDetails(value)
    dialogRef.current?.showModal()
  }
  function advance() {
    if (finished) {
      if (mode !== 'practice') { if (onComplete) onComplete(); else navigate('/'); return }
      start(getNextQuickStudySessionId(sessionId)); return
    }
    if (!checked) {
      if (!selected.length) return
      const correct = isQuickStudyCorrect(selected, question.correct)
      if (authUser) {
        if (!updateLearningProgress((current) => recordQuickStudyAnswer(current, question.id, correct))) {
          setSaveError('Please wait for account sync, then check your answer again.'); return
        }
      } else writeGuestSeenIds([...readGuestSeenIds(), question.id])
      setSaveError('')
      setChecked(true)
      setResults((previous) => [...previous, { id: question.id, correct: isQuickStudyCorrect(selected, question.correct) }])
      return
    }
    if (index === items.length - 1) { setCompletedAt(new Date().toISOString()); setFinished(true) }
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
          <StudyNavigation />
        </div>
      </header>
      <main className="quick-study-main" aria-label={title}>
        {resumePrompt ? <section className="learning-entry"><h1>{finished ? 'Your previous results' : 'Welcome back'}</h1><p>{finished ? 'View your results or start a fresh round.' : 'Continue where you left off?'}</p><div className="quick-session-review-actions"><button className="quick-session-primary" onClick={() => setResumePrompt(false)}>{finished ? 'View results' : 'Resume session'}</button><button className="quick-session-secondary" onClick={() => { if (window.confirm('Start fresh and replace this saved round?')) start(1) }}>Start fresh</button></div></section> : legacy && previousSession ? <QuestionSessionRunner key={previousSession.id + '-' + previousSession.currentIndex} session={previousSession} modeLabel="Previous Quick Study" onExit={() => { abandonSession(); setLegacy(false) }} compact /> : (
          <section className="quick-session" aria-label="Five-question session" data-study-mode={mode} data-finished={finished}>
            <header className="quick-session-header">
              <div className="quick-session-heading">
                <h1>{title}</h1>
                {intro && <Link className="quick-session-text-button" to="/exam-prep/">Choose a topic</Link>}
                {mode === 'practice' && !intro && <label className="quick-bank-selector">Topic session
                  <select aria-label="Session" value={sessionId} onChange={(event) => {
                    const id = Number(event.target.value)
                    if (!finished && (selected.length || results.length) && !window.confirm('Switch sessions? Your current round is not saved.')) return
                    start(id)
                  }}>{quickStudyBank.sessions.map((session) => <option key={session.id} value={session.id}>{session.id}. {session.title}</option>)}</select>
                </label>}
              </div>
              <div className="quick-session-progress-label"><span>{finished ? (retry ? 'Retry complete' : 'Session complete') : (retry ? 'Retry · ' : '') + 'Question ' + (index + 1) + ' of ' + items.length}</span><span>{results.length} checked</span></div>
              <progress className="quick-session-progress" aria-label="Session completion" max={items.length} value={results.length} />
            </header>
            <div className="quick-session-body" ref={bodyRef}>
              {finished ? <div className="quick-session-summary">
                <div className="quick-result-score-block quick-completion-moment">
                <span className="quick-completion-mark" aria-hidden="true"><Check size={36} strokeWidth={3} /></span>
                <h2 tabIndex={-1} ref={headingRef}>Your session, at a glance</h2>
                <p>{items.length} questions completed</p>
                <ol className="practice-result-trail quick-result-trail" aria-label="Question results">
                  {items.map((item, itemIndex) => {
                    const correct = results.find((answer) => answer.id === item.id)?.correct === true
                    return <li key={item.id} aria-label={`Question ${itemIndex + 1}: ${correct ? 'Correct' : 'To review'}`}><span>{itemIndex + 1}</span>{correct ? <Check className="practice-result-correct" size={32} aria-hidden="true" /> : <CircleX className="practice-result-missed" size={32} aria-hidden="true" />}</li>
                  })}
                </ol>
                <div className="practice-result-legend"><span><Check className="practice-result-correct" size={26} aria-hidden="true" />{score} correct</span><span><CircleX className="practice-result-missed" size={26} aria-hidden="true" />{missed.length} to review</span><span className="practice-result-accuracy"><strong>{Math.round(score / items.length * 100)}%</strong> accuracy</span></div>
                <p>{missed.length ? 'You have ' + missed.length + ' question' + (missed.length === 1 ? '' : 's') + ' to revisit.' : 'You answered every question correctly in this round.'}</p>
                <div className="quick-session-review-actions">{missed.length > 0 && <button className="quick-session-secondary" onClick={() => start(sessionId, missed)}>Review missed questions</button>}{mode === 'practice' ? <button className="quick-session-primary" onClick={advance}>Try 5 more</button> : <button className="quick-session-secondary" onClick={() => start(sessionId, initialItems)}>Repeat session</button>}</div>
                </div>
                {mode !== 'review' && <StudyResultSave compact autoSave={Boolean(authUser)} onContinue={advance} result={{ id: roundId, title, route: mode === 'daily' ? '/daily-lesson' : '/quick-study', completedAt: completedAt ?? startedAt, total: items.length, answers: results }} />}
              </div> : <>
                <div className="quick-bank-result-row"><p className="quick-session-question-meta">{question.type === 'multiple' ? 'Select all that apply' : 'Choose the best answer'}</p>{authUser && <button className="quick-session-text-button" disabled={syncStatus === 'syncing'} onClick={() => {
                  const success = updateLearningProgress((current) => ({ ...current, savedIds: current.savedIds.includes(question.id) ? current.savedIds.filter((id) => id !== question.id) : [...current.savedIds, question.id] }))
                  setSaveError(success ? '' : 'Could not save yet. Please check your account connection.')
                }}>{progress.savedIds.includes(question.id) ? 'Unsave question' : 'Save for review'}</button>}</div>
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
            <footer className="quick-session-footer quick-bank-feedback-dock" data-result={checked && !finished ? result : undefined}>
              {!authUser && !finished && mode === 'practice' && <p className="quick-bank-muted">{storageFailed ? 'Storage unavailable. Keep this page open to retain this round.' : <>Saved on this device. <Link className="quick-session-signup-link" to={intro ? '/quick-study?start=5&auth=signup' : '/quick-study?auth=signup'}>Create an account</Link> to keep your results.</>}</p>}
              {saveError && <p role="alert">{saveError}</p>}
              {authUser && (syncStatus === 'error' || syncStatus === 'offline') && <p role="alert">Changes have not synced. Keep this page open. <button className="quick-session-text-button" onClick={() => void syncNow()}>Retry sync</button></p>}
              {checked && !finished && <div className="practice-feedback-summary" key={question.id} role="status" aria-live="polite">
                <span className={`practice-feedback-icon${result === 'correct' ? ' practice-check-draw' : ''}`} aria-hidden="true">{result === 'correct' ? <Check size={32} strokeWidth={3} /> : <X size={32} strokeWidth={3} />}</span>
                <div className="practice-feedback-copy"><p>{result === 'correct' ? 'Correct!' : result === 'partial' ? 'Almost!' : 'Not quite.'}</p><span>{result === 'correct' ? 'Nice work.' : 'Review the highlighted answers above.'}</span><div className="practice-feedback-actions"><button onClick={() => showDetails('why')}>Why?</button></div></div>
              </div>}
              <div className="quick-session-navigation"><span className="quick-bank-muted">{finished ? 'Five questions at a time' : checked ? 'Review, then continue' : question.type === 'multiple' ? 'Select all that apply' : 'Choose one answer'}</span><button className="quick-session-primary" onClick={advance} disabled={!finished && !selected.length}>{finished ? (mode !== 'practice' ? (mode === 'review' ? 'Back to review' : 'Back to home') : getNextQuickStudySessionId(sessionId) === quickStudyBank.sessions[0].id ? 'Back to session 1' : 'Next session') : checked ? (index === items.length - 1 ? 'Finish session' : 'Continue') : 'Check answer'}</button></div>
            </footer>
          </section>
        )}
      </main>
      <dialog ref={dialogRef} className="quick-session-dialog" aria-labelledby="quick-bank-details-title">
        <header className="quick-session-dialog-header"><h2 id="quick-bank-details-title">{details === 'why' ? 'Why this answer?' : 'About this question set'}</h2><button className="quick-session-secondary" onClick={() => dialogRef.current?.close()}>Close</button></header>
        <div className="quick-session-dialog-body">{details === 'why' ? <>
          <p>{question.rationale}</p><p><strong>Correct {question.correct.length > 1 ? 'answers' : 'answer'}:</strong> {question.correct.map((value) => String.fromCharCode(65 + value) + '. ' + question.choices[value]).join(' ')}</p>
          {question.choiceRationales.length > 0 && <details key={question.id}><summary className="quick-session-text-button">Why the other choices are wrong</summary><ul>{question.choices.map((choice, choiceIndex) => !question.correct.includes(choiceIndex) && <li key={choiceIndex}><strong>{String.fromCharCode(65 + choiceIndex)}. {choice}</strong><p>{question.choiceRationales[choiceIndex]}</p></li>)}</ul></details>}
          <ul>{question.sources.map((key) => { const [title, url] = quickStudySources[key]; return <li key={key}>{url ? <a href={url} target="_blank" rel="noopener noreferrer">{title}</a> : title}</li> })}</ul>
          <p>Original draft · clinical expert review pending. Not clinical guidance.</p>
        </> : <>
          <p>{quickStudyBank.questions.length} original NCLEX-RN-style draft questions in {quickStudyBank.sessions.length} five-question sessions. Choose, check, and continue. Retry missed questions at the end.</p>
          <p>Quizlet’s public topic index inspired the organization. These are not copied Quizlet cards, and this set is not affiliated with Quizlet or NCSBN. Clinical expert review is still pending. References are available through Why? after each answer.</p>
          <p>Multi-select uses exact-match practice scoring, not official NCLEX partial credit. This set does not contribute to readiness scores. Practice rounds can be resumed on this device for 30 days when browser storage is available. Create an account after finishing to save your result privately; signed-in results save automatically. Daily Lesson selects unseen questions on each launch and offers an explicit repeat after the pool is exhausted. Clearing browser data resets guest history. Medication orders are fictional arithmetic exercises, not dosing recommendations.</p>
          {previousSession && <button className="quick-session-secondary" onClick={() => { dialogRef.current?.close(); setLegacy(!legacy) }}>{legacy ? 'Return to topic sessions' : 'Resume previous Quick Study session'}</button>}
        </>}</div>
      </dialog>
    </div>
  )
}
