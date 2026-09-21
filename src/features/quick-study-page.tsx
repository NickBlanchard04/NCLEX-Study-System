import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { useStudySystemStore } from '../app/store'
import { getExamCategories } from '../data/content'
import { getExamTrack } from '../data/exam-tracks'
import { getWeakAreas } from '../services/study-system'
import { QuestionSessionRunner } from './ui'
import nursingCommandLogo from '../assets/brand/nursing-command-logo.png'
import practicePhoto from '../assets/home/practice-photo.jpg'

export function QuickStudyPage() {
  const profile = useStudySystemStore((state) => state.profile)
  const attempts = useStudySystemStore((state) => state.attempts)
  const activeSession = useStudySystemStore((state) => state.activeSession)
  const startQuickStudy = useStudySystemStore((state) => state.startQuickStudy)
  const abandonSession = useStudySystemStore((state) => state.abandonSession)
  const activeTrack = getExamTrack(profile.examTrack ?? 'nclex-rn')
  const weakArea = useMemo(
    () => getWeakAreas(attempts, profile.examTrack ?? 'nclex-rn', profile.preferences.analyticsScope ?? 'selected-track')[0],
    [attempts, profile.examTrack, profile.preferences.analyticsScope],
  )
  const category = weakArea?.category ?? getExamCategories(activeTrack.id)[0]
  const session = activeSession?.mode === 'quick-study' && activeSession.status !== 'discarded' && !activeSession.deletedAt
    ? activeSession
    : null

  return (
    <div className="quick-study-page">
      <header className="home-launcher-header quick-study-header">
        <Link className="home-launcher-brand" to="/" aria-label="Nurse Command home">
          <img src={nursingCommandLogo} alt="" />
          <span>Nurse <span>Command</span></span>
        </Link>
        <Link className="home-tools-trigger" to="/">
          <ArrowLeft size={16} aria-hidden="true" /> Home
        </Link>
      </header>
      <main className="quick-study-main" aria-label="Quick Study">
        {session ? (
          <QuestionSessionRunner key={`${session.id}-${session.currentIndex}`} session={session} modeLabel="Quick Study" onExit={abandonSession} compact />
        ) : (
          <section className="quick-study-intro" aria-labelledby="quick-study-title">
            <img className="quick-study-art" src={practicePhoto} alt="" aria-hidden="true" />
            <div className="quick-study-intro-content">
              <h1 id="quick-study-title">Quick Study</h1>
              <p className="quick-study-description">Five questions. One focused session.</p>
              <div className="quick-study-focus">
                <p>{weakArea ? 'Recommended focus' : `${activeTrack.shortName} starter set`}</p>
                <h2>{category}</h2>
              </div>
              <button type="button" className="quick-session-primary quick-study-start" onClick={() => startQuickStudy()}>
                Start 5 questions <ArrowRight size={20} aria-hidden="true" />
              </button>
              <Link className="quick-study-customize" to="/practice-questions">Choose your own questions</Link>
            </div>
          </section>
        )}
      </main>
    </div>
  )
}
