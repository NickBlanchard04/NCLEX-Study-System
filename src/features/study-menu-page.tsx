import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronDown, UserRound, X } from 'lucide-react'
import { useStudySystemStore } from '../app/store'
import nursingCommandLogo from '../assets/brand/nursing-command-logo.png'
import bannerReference from '../assets/home/banner-reference.png'

const learningActivities = [
  { title: 'Daily Lesson', description: 'The default 3–5 minute learning session', route: '/dashboard', tone: 'gold', x: 106, width: 402 },
  { title: 'Practice', description: 'Quick nursing questions', route: '/quick-study', tone: 'blue', x: 542, width: 392 },
  { title: 'Review', description: 'Missed questions and weak areas', route: '/weak-areas', tone: 'teal', x: 964, width: 400 },
] as const

const studyToolGroups = [
  { title: 'Practice and plan', links: [
    { title: 'Question Bank', route: '/practice-questions' },
    { title: 'Study Plan', route: '/study-plan' },
    { title: 'Exam Prep', route: '/exam-prep' },
    { title: 'Take an Exam', route: '/test-mode' },
  ] },
  { title: 'Review and reference', links: [
    { title: 'Flashcards', route: '/flashcards' },
    { title: 'Notes', route: '/notes' },
    { title: 'Resources', route: '/strategy-training' },
    { title: 'Performance', route: '/performance-analytics' },
  ] },
  { title: 'Library and account', links: [
    { title: 'Study Library / Upload materials', route: '/my-materials' },
    { title: 'Nurse Lab', route: '/nurse-command-lab' },
    { title: 'Settings', route: '/settings' },
  ] },
] as const

export function StudyMenuPage() {
  const profileImage = useStudySystemStore((state) => state.profile.profileImageDataUrl)
  const [activeActivity, setActiveActivity] = useState(0)
  const toolsDialog = useRef<HTMLDialogElement>(null)

  return (
    <div className="home-launcher">
      <header className="home-launcher-header">
        <h1 className="home-launcher-brand">
          <img src={nursingCommandLogo} alt="" />
          <span>Nurse <span>Command</span></span>
        </h1>
        <div className="home-launcher-actions">
          <button
            className="home-tools-trigger"
            type="button"
            aria-haspopup="dialog"
            aria-controls="home-study-tools"
            onClick={() => toolsDialog.current?.showModal()}
          >
            Study tools <ChevronDown size={16} aria-hidden="true" />
          </button>
          <Link className="home-profile-link" to="/settings" aria-label="Open profile settings">
            {profileImage ? <img src={profileImage} alt="" /> : <UserRound size={21} aria-hidden="true" />}
          </Link>
        </div>
      </header>

      <main className="home-launcher-main" aria-label="Choose how to study">
        <div className="home-activity-selector" role="group" aria-label="Choose a learning activity">
          {learningActivities.map((activity, index) => (
            <button
              key={activity.route}
              type="button"
              aria-pressed={activeActivity === index}
              aria-controls={`home-activity-${index}`}
              onClick={() => setActiveActivity(index)}
            >
              {activity.title}
            </button>
          ))}
        </div>
        <div className="home-launcher-stage">
          <div className="home-banner-trio">
            {learningActivities.map((activity, index) => (
              <Link
                id={`home-activity-${index}`}
                key={activity.route}
                to={activity.route}
                aria-label={`${activity.title}: ${activity.description}`}
                className="home-learning-banner"
                data-banner-tone={activity.tone}
                data-active={activeActivity === index}
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
              </Link>
            ))}
          </div>
        </div>
      </main>

      <dialog
        ref={toolsDialog}
        id="home-study-tools"
        className="home-tools-dialog"
        aria-labelledby="home-tools-heading"
        onClick={(event) => {
          if (event.target === event.currentTarget) toolsDialog.current?.close()
        }}
      >
        <div className="home-tools-content">
          <div className="home-tools-heading">
            <h2 id="home-tools-heading">Study tools</h2>
            <button type="button" className="home-profile-link" aria-label="Close study tools" onClick={() => toolsDialog.current?.close()}>
              <X size={20} aria-hidden="true" />
            </button>
          </div>
          <nav className="home-tools-groups" aria-label="More study tools">
            {studyToolGroups.map((group) => (
              <section key={group.title}>
                <h3>{group.title}</h3>
                {group.links.map((tool) => (
                  <Link key={tool.route} to={tool.route} onClick={() => toolsDialog.current?.close()}>{tool.title}</Link>
                ))}
              </section>
            ))}
          </nav>
        </div>
      </dialog>
    </div>
  )
}
