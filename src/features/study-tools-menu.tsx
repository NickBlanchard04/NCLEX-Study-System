import { useId, useRef } from 'react'
import { Link } from 'react-router-dom'
import { ChevronDown, X } from 'lucide-react'
import { Breadcrumbs } from '../seo/RouteSeo'

const studyToolGroups = [
  { title: 'Practice and exams', links: [
    { title: 'Question Bank', route: '/practice-questions' },
    { title: 'Exam Prep', route: '/exam-prep' },
    { title: 'Take an Exam', route: '/test-mode' },
  ] },
  { title: 'Review and reference', links: [
    { title: 'Study Plan', route: '/study-plan' },
    { title: 'Flashcards', route: '/flashcards' },
    { title: 'Notes', route: '/notes' },
    { title: 'Resources', route: '/strategy-training' },
    { title: 'Progress', route: '/performance-analytics' },
    { title: 'Saved results', route: '/study-results' },
  ] },
  { title: 'More', links: [
    { title: 'Nurse Lab', route: '/nurse-command-lab' },
    { title: 'Account & settings', route: '/settings' },
  ] },
] as const

export function StudyToolsMenu() {
  const toolsDialog = useRef<HTMLDialogElement>(null)
  const id = useId()
  return <>
          <button
            className="home-tools-trigger"
            type="button"
            aria-haspopup="dialog"
            aria-controls={id}
            onClick={() => toolsDialog.current?.showModal()}
          >
            Menu <ChevronDown size={16} aria-hidden="true" />
          </button>
      <dialog
        ref={toolsDialog}
        id={id}
        className="home-tools-dialog"
        aria-labelledby={`${id}-heading`}
        onClick={(event) => {
          if (event.target === event.currentTarget) toolsDialog.current?.close()
        }}
      >
        <div className="home-tools-content">
          <Breadcrumbs />
          <div className="home-tools-heading">
            <h2 id={`${id}-heading`}>Study tools</h2>
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
          <nav className="site-info-links" aria-label="About Nurse Command">
            <Link to="/about" onClick={() => toolsDialog.current?.close()}>About</Link>
            <Link to="/nclex-rn" onClick={() => toolsDialog.current?.close()}>NCLEX-RN</Link>
            <Link to="/privacy" onClick={() => toolsDialog.current?.close()}>Privacy</Link>
            <Link to="/terms" onClick={() => toolsDialog.current?.close()}>Terms</Link>
          </nav>
        </div>
      </dialog>
  </>
}
