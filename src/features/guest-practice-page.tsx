import { StudyToolsMenu } from './study-tools-menu'
import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { prepareGuestPractice, useStudySystemStore } from '../app/store'
import type { ActiveSession } from '../app/types'
import { readStudyLocal, writeStudyLocal } from '../services/study-handoff'
import { PracticeQuestionsPage, ExamPrepPage, TestModePage } from './pages'
import { QuestionSessionRunner } from './ui'
import { StudyResultSave } from './study-result-save'
import logo from '../assets/brand/nursing-command-logo.png'

export function AccountPracticePage({ route }: { route: string }) {
  const location = useLocation()
  const active = useStudySystemStore((state) => state.activeSession)
  const mode = route === '/test-mode' ? 'test' : 'practice'
  const [resumeId, setResumeId] = useState(() => !location.state?.resumeStudySession && active?.mode === mode && !active.endedAt && !active.deletedAt ? active.id : null)
  if (resumeId && active?.id === resumeId && !active.endedAt && !active.deletedAt) return <section className="learning-entry">
    <h1>Welcome back</h1><p>Continue where you left off?</p><p>{active.responses.length} of {active.questionIds.length} questions answered.</p>
    {active.config.timed && <p>The exam timer keeps running while you are away.</p>}
    <div className="quick-session-review-actions"><button className="quick-session-primary" onClick={() => setResumeId(null)}>Resume session</button><button className="quick-session-secondary" onClick={() => { if (window.confirm('Discard the unfinished session and start fresh?')) { useStudySystemStore.getState().abandonSession(); setResumeId(null) } }}>Start fresh</button></div>
  </section>
  if (active?.mode === mode && !active.deletedAt && active.status !== 'discarded') return <QuestionSessionRunner focused={route === '/practice-questions'} key={`${active.id}-${active.currentIndex}`} session={active} modeLabel={mode === 'test' ? 'Exam practice' : 'Practice'} onExit={() => useStudySystemStore.getState().abandonSession()} />
  return route === '/test-mode' ? <TestModePage /> : route === '/exam-prep' ? <ExamPrepPage /> : <PracticeQuestionsPage />
}

export function GuestPracticePage({ route }: { route: string }) {
  const initialized = useStudySystemStore((state) => state.authInitialized)
  const user = useStudySystemStore((state) => state.authUser)
  const active = useStudySystemStore((state) => state.activeSession)
  const [saved] = useState(() => {
    const value = readStudyLocal<ActiveSession>(`engine:${route}`)
    return value && Array.isArray(value.questionIds) && value.questionIds.length && Array.isArray(value.responses) && value.config && Number.isInteger(value.currentIndex) && value.currentIndex >= 0 && value.currentIndex < value.questionIds.length && !value.deletedAt ? value : null
  })
  const [ready, setReady] = useState(false)
  const [storageError, setStorageError] = useState(false)
  useEffect(() => {
    if (!initialized || user || saved) return
    prepareGuestPractice()
    // External account-store isolation must finish before rendering the guest engine.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setReady(true)
  }, [initialized, user, saved])
  useEffect(() => {
    if (!ready || user || !active) return
    // Report the outcome of synchronizing the session to browser storage.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setStorageError(!writeStudyLocal(`engine:${route}`, active))
  }, [active, ready, route, user])
  function begin(resume: boolean) { prepareGuestPractice(resume ? saved : null); writeStudyLocal(`engine:${route}`, resume ? saved : null); setReady(true) }
  const title = route === '/test-mode' ? 'Exam practice' : route === '/exam-prep' ? 'Exam Prep' : 'Question Bank'
  return <div className="quick-study-page">
    <header className="home-launcher-header"><Link className="home-launcher-brand" to="/"><img src={logo} alt="" /><span>Nurse <span>Command</span></span></Link><div className="home-launcher-actions"><StudyToolsMenu /><Link className="home-tools-trigger" to="/">Home</Link></div></header>
    <main className="guest-practice-content">
      {!initialized ? <p role="status">Loading study tools…</p> : !ready ? <section className="learning-entry"><h1>{saved?.endedAt ? 'Your previous results' : 'Welcome back'}</h1><p>{saved?.endedAt ? 'View your results or start a new session.' : 'Continue where you left off?'}</p>
        {saved?.config.timed && <p>The exam timer keeps running while you are away. Resuming an expired exam will show your results.</p>}
        <div className="quick-session-review-actions"><button className="quick-session-primary" onClick={() => begin(true)}>{saved?.endedAt ? 'View results' : 'Resume session'}</button><button className="quick-session-secondary" onClick={() => { if (window.confirm('Start fresh and replace the session saved on this device?')) begin(false) }}>Start fresh</button></div></section> : <>
        {storageError || route !== '/practice-questions' || !active ? <p className="guest-study-note" role="status">{storageError ? 'Browser storage is unavailable. Keep this page open; your session cannot be resumed after leaving.' : 'Your session is saved on this device for 30 days. Create an account after finishing to keep your results.'}</p> : null}
        {active?.endedAt && (route === '/practice-questions' ? <QuestionSessionRunner focused session={active} modeLabel={title} onExit={() => begin(false)} completionActions={<StudyResultSave onContinue={() => begin(false)} result={{ id: active.id, title, route, completedAt: active.endedAt, total: active.questionIds.length, answers: active.responses.map(answer => ({ id: answer.questionId, correct: answer.isCorrect })) }} />} /> : <section className="learning-entry"><h1>Session complete</h1><p>{active.responses.filter((answer) => answer.isCorrect).length} / {active.questionIds.length} correct</p><StudyResultSave onContinue={() => begin(false)} result={{ id: active.id, title, route, completedAt: active.endedAt, total: active.questionIds.length, answers: active.responses.map((answer) => ({ id: answer.questionId, correct: answer.isCorrect })) }} /></section>)}
        {!active?.endedAt && (active ? <QuestionSessionRunner focused={route === '/practice-questions'} key={`${active.id}-${active.currentIndex}`} session={active} modeLabel={title} onExit={() => { if (window.confirm('Discard this unfinished session?')) begin(false) }} /> : route === '/test-mode' ? <TestModePage /> : route === '/exam-prep' ? <ExamPrepPage /> : <PracticeQuestionsPage />)}
      </>}
    </main>
  </div>
}
