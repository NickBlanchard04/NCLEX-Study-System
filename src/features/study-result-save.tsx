import { StudyToolsMenu } from './study-tools-menu'
import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useStudySystemStore } from '../app/store'
import { mergeStudyResult, readStudyLocal, validStudyResult, writeStudyLocal } from '../services/study-handoff'
import type { SavedStudyResult } from '../services/study-handoff'
import { normalizeQuickStudyProgress, recordQuickStudyAnswer } from '../services/daily-lesson'
import logo from '../assets/brand/nursing-command-logo.png'
import { trackAppEvent } from '../services/analytics-client'
import { getExamQuestionBank } from '../data/content'

const availableRnQuestions = new Set(getExamQuestionBank('nclex-rn').filter(question => question.learnerVisible !== false && question.visibility !== 'internal').map(question => question.id)).size

function ResultFrame({ children }: { children: React.ReactNode }) {
  return <div className="quick-study-page"><header className="home-launcher-header"><Link className="home-launcher-brand" to="/"><img src={logo} alt="" /><span>Nurse <span>Command</span></span></Link><div className="home-launcher-actions"><StudyToolsMenu /><Link className="home-tools-trigger" to="/">Home</Link></div></header><div className="quick-study-main">{children}</div></div>
}

export function StudyResultSave({ result, autoSave = false, onContinue }: { result: SavedStudyResult; autoSave?: boolean; onContinue?: () => void }) {
  const user = useStudySystemStore((state) => state.authUser)
  const profile = useStudySystemStore((state) => state.profile)
  const sync = useStudySystemStore((state) => state.syncStatus)
  const [error, setError] = useState('')
  const navigate = useNavigate()
  const stored = profile.userId === user?.id && profile.preferences.studyResults?.some((item) => item.id === result.id)
  useEffect(() => {
    if (!user || stored || profile.userId !== user.id || sync === 'syncing' || sync === 'error') return
    const owner = readStudyLocal<string>(`owner:${result.id}`)
    if (owner && owner !== user.id) return
    // A guest result is imported only after an explicit Save/sign-in action.
    if (!autoSave && readStudyLocal<string>('save-intent') !== result.id) return
    writeStudyLocal(`owner:${result.id}`, user.id)
    const state = useStudySystemStore.getState()
    let quickStudy = normalizeQuickStudyProgress(state.profile.preferences.quickStudy)
    if (result.route === '/quick-study' || result.route === '/daily-lesson') {
      for (const answer of result.answers) quickStudy = recordQuickStudyAnswer(quickStudy, answer.id, answer.correct)
    }
    state.updateProfile({ preferences: { ...state.profile.preferences, quickStudy, studyResults: mergeStudyResult(state.profile.preferences.studyResults, result) } })
  }, [user, stored, profile.userId, sync, result, autoSave])
  function signIn(mode: string) {
    if (!writeStudyLocal(`result:${result.id}`, result) || !writeStudyLocal('save-intent', result.id)) {
      setError('Browser storage is unavailable. Allow site storage before signing in so your result is not lost.'); return
    }
    navigate(`${result.route}?studyResult=${result.id}&auth=${mode}`)
    void trackAppEvent('external_cta_clicked', { page_path: result.route, feature_name: 'Results signup CTA', metadata: { destination: mode, placement: 'session_results' } })
  }
  if (user) return <section className="study-save-prompt" aria-label="Result saving">
    <p role="status">{stored ? sync === 'syncing' ? 'Saving your result…' : sync === 'error' || sync === 'offline' ? 'Result is on this device; cloud save needs a connection.' : 'Result saved to your private study history.' : 'Your result is available on this device.'}</p>
    {(sync === 'error' || sync === 'offline') && <button className="quick-session-secondary" onClick={() => void useStudySystemStore.getState().syncNow()}>Retry save</button>}
    <Link to="/study-results">Saved results</Link>
    <p>Connecting with other students is optional. Your results are not shared.</p>
    <Link to="/social">Explore the community</Link>
  </section>
  return <section className="study-save-prompt" aria-labelledby="keep-progress-title">
    <h2 id="keep-progress-title">Keep your progress. Keep practicing.</h2>
    <p>Create an account to save your results and keep practicing{availableRnQuestions > 300 ? ' with 300+ NCLEX-RN questions.' : ' by topic.'}</p>
    <div className="quick-session-review-actions"><button className="quick-session-primary" onClick={() => signIn('signup')}>Create my account</button>{onContinue ? <button className="quick-session-secondary" onClick={onContinue}>Keep practicing as a guest</button> : <Link className="quick-session-secondary" to={result.route}>Keep practicing as a guest</Link>}</div>
    <button className="quick-session-text-button" onClick={() => signIn('signin')}>Already have an account? Sign in</button>
    <p className="quick-bank-muted">Private by default. Joining the community is optional.</p>
    {error && <p role="alert">{error}</p>}
  </section>
}

export function StudyResultReturn() {
  const location = useLocation()
  const profile = useStudySystemStore((state) => state.profile)
  const user = useStudySystemStore((state) => state.authUser)
  const id = new URLSearchParams(location.search).get('studyResult') ?? ''
  const local = readStudyLocal<unknown>(`result:${id}`)
  const owner = readStudyLocal<string>(`owner:${id}`)
  const result = profile.userId === user?.id ? profile.preferences.studyResults?.find((item) => item.id === id) : undefined
  const item = result ?? ((!owner || owner === user?.id) && validStudyResult(local) ? local : null)
  return <ResultFrame><main className="learning-entry"><h1>Your results</h1>{item ? <>
    <h2>{item.title}</h2><p>{item.answers.filter((answer) => answer.correct).length} / {item.total} correct</p>
    <p>Practice results, not an NCLEX readiness measure.</p><StudyResultSave result={item} />
    <Link className="quick-session-secondary" to={item.route}>Keep practicing</Link>
  </> : <p>This result is not available in this browser or account. Use the original browser to save guest results.</p>}</main></ResultFrame>
}

export function SavedStudyResultsPage() {
  const results = useStudySystemStore((state) => state.profile.preferences.studyResults) ?? []
  return <ResultFrame><main className="learning-entry"><h1>Saved results</h1><p>Private practice history. Not a readiness prediction. Your latest 100 Quick Study and saved guest results are kept here.</p>
    {results.filter(validStudyResult).length ? <ul>{results.filter(validStudyResult).map((item) => <li key={item.id}><Link to={`${item.route}?studyResult=${item.id}`}>{item.title} — {item.answers.filter((a) => a.correct).length}/{item.total} · {new Date(item.completedAt).toLocaleDateString()}</Link></li>)}</ul> : <p>No saved results yet.</p>}</main></ResultFrame>
}
