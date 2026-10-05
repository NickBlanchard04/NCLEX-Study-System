import { StudyNavigation } from './study-tools-menu'
import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useStudySystemStore } from '../app/store'
import { normalizeQuickStudyProgress } from '../services/daily-lesson'
import { launchDailyLesson } from '../services/learning-progress'
import { quickStudyBank } from '../services/quick-study-bank'
import type { QuickStudyItem } from '../services/quick-study-bank'
import { QuickStudyPage } from './quick-study-page'
import logo from '../assets/brand/nursing-command-logo.png'

function EntryFrame({ title, children }: { title: string; children: React.ReactNode }) {
  return <div className="quick-study-page">
    <header className="home-launcher-header"><Link className="home-launcher-brand" to="/"><img src={logo} alt="" /><span>Nurse <span>Command</span></span></Link><StudyNavigation /></header>
    <main className="quick-study-main"><section className="learning-entry"><h1>{title}</h1>{children}</section></main>
  </div>
}

export function DailyLessonPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const [error, setError] = useState('')
  const state = location.state as { questionIds?: unknown; launchId?: string } | null
  const ids = Array.isArray(state?.questionIds) ? state.questionIds : []
  const items = ids.flatMap((id) => quickStudyBank.questions.filter((question) => question.id === id)).slice(0, 5)
  function start(repeat: boolean) {
    const next = launchDailyLesson(repeat)
    if (next === null) { setError('Your account is loading or could not sync. Please try again when it is ready.'); return }
    navigate('/daily-lesson', { replace: true, state: { questionIds: next.map((item) => item.id), launchId: crypto.randomUUID() } })
  }
  if (items.length) return <QuickStudyPage key={state?.launchId ?? location.key} initialItems={items} mode="daily" />
  const exhausted = Array.isArray(state?.questionIds)
  return <EntryFrame title={exhausted ? 'You’ve tried every available question' : 'Daily Lesson'}>
    <p>{exhausted ? 'There are no unseen questions left in the current set. You can repeat the set or choose a practice topic.' : 'Start a fresh selection of up to five questions you haven’t seen in this question pool.'}</p>
    <button className="quick-session-primary" onClick={() => start(exhausted)}>{exhausted ? 'Start a repeat round' : 'Start lesson'}</button>
    <Link className="quick-session-text-button" to="/quick-study">Choose a practice topic</Link>
    {error && <p role="status">{error}</p>}
  </EntryFrame>
}

export function ReviewPage() {
  const user = useStudySystemStore((state) => state.authUser)
  const initialized = useStudySystemStore((state) => state.authInitialized)
  const profile = useStudySystemStore((state) => state.profile)
  const syncStatus = useStudySystemStore((state) => state.syncStatus)
  const syncNow = useStudySystemStore((state) => state.syncNow)
  const hydrate = useStudySystemStore((state) => state.hydrateCloudState)
  const [round, setRound] = useState<QuickStudyItem[] | null>(null)
  const [reviewedIds, setReviewedIds] = useState<string[]>([])
  const progress = normalizeQuickStudyProgress(profile.preferences.quickStudy)
  const queued = new Set([...progress.missedIds, ...progress.savedIds])
  const items = quickStudyBank.questions.filter((question) => queued.has(question.id))
  const remaining = items.filter((question) => !reviewedIds.includes(question.id))
  if (!initialized) return <EntryFrame title="Review"><p role="status">Checking your account…</p></EntryFrame>
  if (!user) return <EntryFrame title="Keep your questions for later">
    <p>Sign in to collect missed questions and questions you save. Your review list stays with your account.</p>
    <div className="learning-entry-actions"><Link className="quick-session-primary" to="/review?auth=signin">Sign in</Link><Link className="quick-session-secondary" to="/review?auth=signup">Create account</Link></div>
    <Link className="quick-session-text-button" to="/">Keep studying without an account</Link>
  </EntryFrame>
  if (round?.length && profile.userId === user.id) return <QuickStudyPage key={user.id} initialItems={round} mode="review" onComplete={() => { setReviewedIds((previous) => [...previous, ...round.map((question) => question.id)]); setRound(null) }} />
  if (profile.userId !== user.id || syncStatus === 'syncing') return <EntryFrame title="Review"><p role="status">Loading your saved questions…</p></EntryFrame>
  if (syncStatus === 'error') return <EntryFrame title="Review"><p role="alert">Your saved questions could not sync. Try again before continuing.</p><button className="quick-session-primary" onClick={() => void (profile.preferences.quickStudy ? syncNow() : hydrate())}>Try again</button></EntryFrame>
  return <EntryFrame title="Review">
    <p>{items.length ? `${items.length} saved or missed ${items.length === 1 ? 'question' : 'questions'} to revisit.` : 'Nothing to review yet. Missed answers appear here automatically when you study while signed in. You can also save a question yourself.'}</p>
    {items.length > 0 && <button className="quick-session-primary" onClick={() => {
      if (!remaining.length) setReviewedIds([])
      setRound((remaining.length ? remaining : items).slice(0, 5))
    }}>{remaining.length ? `Review ${Math.min(5, remaining.length)} ${remaining.length === 1 ? 'question' : 'questions'}` : 'Repeat remaining saved or missed questions'}</button>}
    <Link className="quick-session-text-button" to="/quick-study">Practice by topic</Link>
    <p className="quick-bank-muted">Correct answers leave the missed list. Questions you save stay until you unsave them. Draft practice does not affect readiness.</p>
    {syncStatus === 'offline' && <p role="status">Offline — keep this page open and retry when connected. <button className="quick-session-text-button" onClick={() => void syncNow()}>Retry sync</button></p>}
  </EntryFrame>
}
