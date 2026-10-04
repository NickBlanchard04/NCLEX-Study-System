import { StudyToolsMenu } from './study-tools-menu'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useStudySystemStore } from '../app/store'
import nursingCommandLogo from '../assets/brand/nursing-command-logo.png'
import { launchDailyLesson } from '../services/learning-progress'
import bannerReference from '../assets/home/banner-reference.png'

const learningActivities = [
  { title: 'Daily Lesson', description: 'The default 3–5 minute learning session', route: '/daily-lesson', tone: 'gold', x: 106, width: 402 },
  { title: 'Practice', description: 'Quick nursing questions', route: '/quick-study', tone: 'blue', x: 542, width: 392 },
  { title: 'Review', description: 'Missed questions and weak areas', route: '/review', tone: 'teal', x: 964, width: 400 },
] as const

export function StudyMenuPage() {
  const navigate = useNavigate()
  const authUser = useStudySystemStore((state) => state.authUser)
  const authInitialized = useStudySystemStore((state) => state.authInitialized)
  const syncStatus = useStudySystemStore((state) => state.syncStatus)
  const [launchError, setLaunchError] = useState('')

  return (
    <div className="home-launcher">
      <header className="home-launcher-header">
        <h1 className="home-launcher-brand">
          <img src={nursingCommandLogo} alt="" />
          <span>Nurse <span>Command</span></span>
        </h1>
        <div className="home-launcher-actions">
          <StudyToolsMenu />
        </div>
      </header>

      <main className="home-launcher-main" aria-label="Choose how to study">
        <div className="home-launcher-stage">
          <div className="home-banner-trio">
            {learningActivities.map((activity, index) => (
              <Link
                id={`home-activity-${index}`}
                key={activity.route}
                to={activity.route}
                onClick={activity.route === '/daily-lesson' ? (event) => {
                  event.preventDefault()
                  const items = launchDailyLesson()
                  if (items === null) { setLaunchError('Your account is still loading or could not sync. Please try again when it is ready.'); return }
                  navigate('/daily-lesson', { state: { questionIds: items.map((item) => item.id), launchId: crypto.randomUUID() } })
                } : undefined}
                aria-disabled={activity.route === '/daily-lesson' && (!authInitialized || (Boolean(authUser) && syncStatus === 'syncing'))}
                aria-label={`${activity.title}: ${activity.description}`}
                className="home-learning-banner"
                data-banner-tone={activity.tone}
                style={{ aspectRatio: `${activity.width} / 690` }}
              >
                {/* Preserve the supplied artwork's exact crop and proportions. */}
                <img
                  src={bannerReference}
                  alt=""
                  aria-hidden="true"
                  draggable={false}
                  style={{ width: `${1470 / activity.width * 100}%`, left: `${-activity.x / activity.width * 100}%`, top: `${-256 / 690 * 100}%` }}
                />
                <span className="home-mobile-card-copy" aria-hidden="true"><strong>{activity.title}</strong><span>{activity.description}</span></span>
              </Link>
            ))}
          </div>
        </div>
        {launchError && <p role="status">{launchError}</p>}
      </main>


    </div>
  )
}
