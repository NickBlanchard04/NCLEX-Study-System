import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Check,
  ChevronRight,
  CircleDollarSign,
  ClipboardList,
  FastForward,
  MessageCircle,
  Pencil,
  Play,
  ShieldCheck,
  TriangleAlert,
  X,
  Zap,
} from 'lucide-react'
import { useStudySystemStore } from '../app/store'
import type {
  TycoonCareStep,
  TycoonGameState,
  TycoonTask,
  TycoonTaskUrgency,
} from '../app/types'
import { getBestTycoonTask } from '../services/tycoon-engine'
import { getTycoonPatientNoteId } from '../services/tycoon-note-id'
import { getTycoonClockTime } from '../services/tycoon-clock'
import { CARE_LABELS, careDestination, nextCareStep } from '../services/tycoon-care'
import { BedsideCareAction, CareCheckAction, CareChecklist } from './TycoonCareFlow'
import { TycoonClock } from './TycoonClock'
import { TycoonHospitalMap, type WardMapHandle } from './TycoonHospitalMap'
import { TycoonShop } from './TycoonShop'
import { TycoonTooltip } from './TycoonTooltip'
import type { WardTarget } from '../game/tycoon-ward'
import {
  TycoonClinicImage,
  TycoonLaunchLogo,
  TycoonPortrait,
} from './tycoon-reference-art'
import './nurse-tycoon.css'
import './tycoon-launch.css'
import './tycoon-prototype.css'
import './tycoon-ward.css'
import './tycoon-gameplay.css'

const urgencyLabels: Record<TycoonTaskUrgency, string> = {
  critical: 'Critical',
  urgent: 'Urgent',
  watch: 'Watch',
  stable: 'Routine',
}
const urgencyHelp: Record<TycoonTaskUrgency, string> = {
  critical: 'Highest urgency in the game’s task order.',
  urgent: 'High urgency, below Critical in the game’s task order.',
  watch: 'Below Urgent and above Routine in the game’s task order.',
  stable: 'Lowest urgency in the game’s task order.',
}
const formatTime = (minute: number) =>
  getTycoonClockTime(minute).shortLabel
type PatientView = { kind: 'assess' | 'orders' | 'note' | 'equipment' | 'safety' | 'care' | 'reassessment'; taskId: string; shiftId: string } | null

export function NurseTycoonGame() {
  const navigate = useNavigate()
  const tycoon = useStudySystemStore((state) => state.tycoon)
  const startShift = useStudySystemStore((state) => state.startTycoonShift)
  const selectTask = useStudySystemStore((state) => state.selectTycoonTask)
  const assessPatient = useStudySystemStore((state) => state.assessTycoonPatient)
  const advanceCare = useStudySystemStore((state) => state.advanceTycoonCare)
  const wardRef = useRef<WardMapHandle>(null)
  const pendingNoteRef = useRef<string | null>(null)
  const [manuallyPaused, setManuallyPaused] = useState(false)
  const [stationOpen, setStationOpen] = useState(false)
  const finishShift = useStudySystemStore((state) => state.finishTycoonShift)
  const [patientView, setPatientView] = useState<PatientView>(null)
  const [feedback, setFeedback] = useState<{
    title: string
    message: string
    good: boolean
    completedTaskId?: string
  } | null>(null)
  const [showUpgrades, setShowUpgrades] = useState(false)
  const [commandOpen, setCommandOpen] = useState(false)
  const [nearbyTaskId, setNearbyTaskId] = useState<string | null>(null)
  const [dismissedTaskId, setDismissedTaskId] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const panelVisible = commandOpen || Boolean(nearbyTaskId && nearbyTaskId !== dismissedTaskId)
  useEffect(() => {
    const onShopKey = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() !== 'i' || event.repeat || event.ctrlKey || event.metaKey || event.altKey) return
      if (event.target instanceof HTMLElement && event.target.closest('input, textarea, select, [contenteditable="true"]')) return
      event.preventDefault()
      setShowUpgrades((value) => !value)
    }
    window.addEventListener('keydown', onShopKey)
    return () => window.removeEventListener('keydown', onShopKey)
  }, [])
  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(null), 4200)
    return () => window.clearTimeout(timer)
  }, [toast])
  const [compact, setCompact] = useState(() => window.matchMedia('(max-width: 899px)').matches)
  const commandPanelRef = useRef<HTMLElement>(null)
  const mapPanelRef = useRef<HTMLElement>(null)
  useEffect(() => {
    const media = window.matchMedia('(max-width: 899px)')
    const update = () => {
      setCompact(media.matches)
      setCommandOpen(false)
    }
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])
  const shift = tycoon.activeShift
  const bestTask = getBestTycoonTask(shift)
  const selectedTask =
    shift?.tasks.find((task) => task.id === (!commandOpen && nearbyTaskId ? nearbyTaskId : tycoon.selectedTaskId)) ??
    bestTask ??
    shift?.tasks[0]
  const modalTask = shift?.id === patientView?.shiftId
    ? shift?.tasks.find((task) => task.id === patientView?.taskId)
    : undefined
  const completedCount =
    shift?.tasks.filter((task) => task.status === 'completed').length ?? 0
  const assessmentUnavailableReason =
    shift && shift.status !== 'running'
      ? 'Assessments are available during a running shift.'
      : selectedTask?.status === 'completed'
        ? 'This patient’s care task is already complete. Orders and notes remain available.'
        : selectedTask?.status === 'failed'
          ? 'This task closed after an unsafe choice. Orders and notes remain available.'
          : undefined

  function selectRoomTask(task: TycoonTask) {
    selectTask(task.id)
    setCommandOpen(true)
    window.requestAnimationFrame(() => commandPanelRef.current?.focus({ preventScroll: true }))
  }

  function returnToMap() {
    setCommandOpen(false)
    setDismissedTaskId(nearbyTaskId)
    window.requestAnimationFrame(() => mapPanelRef.current?.focus({ preventScroll: true }))
  }

  function beginShift() {
    setPatientView(null)
    setFeedback(null)
    setShowUpgrades(false)
    setCommandOpen(false)
    setStationOpen(false)
    setManuallyPaused(false)
    pendingNoteRef.current = null
    setNearbyTaskId(null)
    setDismissedTaskId(null)
    setToast(null)
    const capacity = Math.min(6, 3 + (tycoon.upgrades['extra-bed'] ?? 0))
    startShift('fundamentals-clinic', { roomIds: Array.from({ length: capacity }, (_, index) => `Room ${101 + index}`) })
  }

  function travelTo(targetId: string, noteTaskId?: string) {
    pendingNoteRef.current = noteTaskId ?? null
    setPatientView(null)
    setStationOpen(false)
    setManuallyPaused(false)
    setCommandOpen(false)
    setDismissedTaskId(nearbyTaskId)
    window.requestAnimationFrame(() => {
      mapPanelRef.current?.focus({ preventScroll: true })
      if (!wardRef.current?.goTo(targetId)) {
        setFeedback({ title: 'Movement unavailable', message: 'Let bedside care finish, then try again. If the map is still loading, wait a moment or reload the ward.', good: false })
      }
    })
  }

  function interactWithWard(target: WardTarget) {
    const current = useStudySystemStore.getState().tycoon.activeShift
    if (!shift || current?.id !== shift.id || current.status !== 'running') return
    if (target.kind === 'station') {
      const noteTaskId = pendingNoteRef.current
      pendingNoteRef.current = null
      if (noteTaskId && current.tasks.some((task) => task.id === noteTaskId)) {
        setPatientView({ kind: 'note', taskId: noteTaskId, shiftId: current.id })
      } else setStationOpen(true)
      return
    }
    pendingNoteRef.current = null
    const task = current.tasks.find((item) => item.id === target.taskId)
    if (!task) return
    selectTask(task.id)
    const step = nextCareStep(task)
    setPatientView({
      kind: target.kind === 'equipment' ? 'equipment' : target.kind === 'safety' ? 'safety' : step === 'assessment' ? 'assess' : step === 'care' ? 'care' : step === 'reassessment' ? 'reassessment' : 'orders',
      taskId: task.id, shiftId: current.id,
    })
  }

  function chooseAction(task: TycoonTask, actionId: string) {
    const currentShift = useStudySystemStore.getState().tycoon.activeShift
    if (!shift || currentShift?.id !== shift.id || patientView?.shiftId !== shift.id) return
    const previousEvents = new Set(currentShift.events.map((event) => event.id))
    assessPatient(task.id, actionId, shift.id)
    const assessed = useStudySystemStore.getState().tycoon.activeShift?.tasks.find((item) => item.id === task.id)
    if (assessed?.careProgress?.steps.includes('assessment') && !task.careProgress?.steps.includes('assessment')) {
      setToast('Assessment recorded · check the patient monitor next')
    }
    const result = useStudySystemStore
      .getState()
      .tycoon.activeShift?.events.find(
        (event) =>
          !previousEvents.has(event.id) &&
          event.taskId === task.id &&
          (event.type === 'reward' || event.type === 'penalty'),
      )
    if (result)
      setFeedback({
        title: result.title,
        message: result.message,
        good: result.type === 'reward',
        completedTaskId: result.type === 'reward' ? task.id : undefined,
      })
    setPatientView(null)
  }

  function continueCare(task: TycoonTask) {
    travelTo(careDestination(task), nextCareStep(task) === 'documentation' ? task.id : undefined)
  }

  function recordCareStep(task: TycoonTask, step: TycoonCareStep) {
    if (!shift) return
    advanceCare(task.id, step, shift.id)
    const updated = useStudySystemStore.getState().tycoon.activeShift?.tasks.find((item) => item.id === task.id)
    setPatientView(null)
    setCommandOpen(false)
    if (updated && nextCareStep(updated)) setToast(`${CARE_LABELS[step]} recorded · next: ${CARE_LABELS[nextCareStep(updated)!]}`)
  }

  function dismissFeedback() {
    setFeedback(null)
    if (compact) returnToMap()
  }

  const shopDialog = showUpgrades ? <TycoonShop tycoon={tycoon} onClose={() => setShowUpgrades(false)} /> : null

  if (!shift)
    return (
      <main className="tycoon tycoon-launch" aria-label="Nurse Command Tycoon">
        <TycoonHud tycoon={tycoon} />
        <button type="button" className="tycoon-launch-shop" onClick={() => setShowUpgrades(true)}><kbd>I</kbd> Shop</button>
        {shopDialog}
        <section className="tycoon-launch-content">
          <div className="tycoon-brand">
            <div className="tycoon-brand-logo">
              <TycoonLaunchLogo />
            </div>
            <div>
              <h1>
                NURSE COMMAND<span>TYCOON</span>
              </h1>
              <p>STUDY. PRACTICE. LEAD.</p>
            </div>
          </div>
          <button
            type="button"
            className="tycoon-clinic"
            onClick={beginShift}
            aria-label="Play Fundamentals Clinic"
          >
            <span className="tycoon-clinic-image">
              <TycoonClinicImage />
            </span>
            <span className="tycoon-clinic-copy">
              <span className="tycoon-play-label">PLAY</span>
              <strong>Fundamentals Clinic</strong>
              <span className="tycoon-clinic-meta">
                {Math.min(6, 3 + (tycoon.upgrades['extra-bed'] ?? 0))} patient rooms • 1 nursing station
              </span>
              <span className="tycoon-clinic-description">
                Start here. Manage daily care, make
                <br className="tycoon-desktop-break" /> decisions, and grow your
                unit.
              </span>
            </span>
            <ChevronRight className="tycoon-clinic-arrow" aria-hidden="true" />
          </button>
          <button type="button" className="tycoon-start" onClick={beginShift}>
            <Play fill="currentColor" aria-hidden="true" />
            START SHIFT
          </button>
        </section>
      </main>
    )

  return (
    <main
      className={`tycoon tycoon-game tycoon-prototype${panelVisible ? ' is-command-open' : ''}`}
      aria-label="Nurse Command Tycoon shift"
    >
      <TycoonHud
        tycoon={tycoon}
        inGame
        clockPaused={Boolean(patientView || feedback || stationOpen || showUpgrades || manuallyPaused || (compact && commandOpen))}
      />
      <div className="tycoon-workspace">
        <section
          className="tycoon-panel tycoon-priority"
          aria-labelledby="tycoon-priority-title"
        >
          <div className="tycoon-priority-copy">
            <TycoonTooltip text="The game’s highest-urgency unfinished task. Earlier deadlines break ties.">
              <h2 className="tycoon-section-label" id="tycoon-priority-title">
                Current priority
              </h2>
            </TycoonTooltip>
            <h3>
              {bestTask ? (
                <button type="button" className="tycoon-priority-select" onClick={() => selectRoomTask(bestTask)} aria-controls="tycoon-command-panel">
                  {bestTask.patientName}: {bestTask.title}
                </button>
              ) : completedCount === shift.tasks.length ? 'Patient care complete' : 'No open care tasks'}
            </h3>
            <p>
              {bestTask
                ? `Due ${formatTime(bestTask.deadlineMinute)}`
                : 'Finish your shift to review patient care and earnings.'}
            </p>
          </div>
          {bestTask ? (
            <div className="tycoon-priority-status">
              <UrgencyBadge task={bestTask} prominent />
            </div>
          ) : (
            <Check className="tycoon-all-done" aria-hidden="true" />
          )}
        </section>
        <section
          className="tycoon-panel tycoon-map"
          aria-labelledby="tycoon-map-title"
          ref={mapPanelRef}
          tabIndex={-1}
        >
          <h2 className="tycoon-section-label" id="tycoon-map-title">
            Hospital ward
          </h2>
          {shift.tasks.length > 1 ? (
            <nav className="tycoon-saved-rooms" aria-label="Ward rooms">
              {shift.tasks.map((task) => (
                <button
                  key={task.id}
                  type="button"
                  onClick={() => selectRoomTask(task)}
                  aria-controls="tycoon-command-panel"
                  aria-pressed={task.id === selectedTask?.id}
                >
                  {task.room}
                </button>
              ))}
            </nav>
          ) : null}
          {shift.tasks.length ? (
            <TycoonHospitalMap
              key={shift.id}
              shiftId={shift.id}
              ref={wardRef}
              tasks={shift.tasks}
              selectedTaskId={selectedTask?.id}
              reviewedTaskIds={shift.equipmentReviewedTaskIds ?? []}
              upgrades={tycoon.upgrades}
              onOpenShop={() => setShowUpgrades(true)}
              onNearbyTask={(id) => { setNearbyTaskId(id); if (!id) setDismissedTaskId(null) }}
              paused={Boolean(patientView || feedback || stationOpen || showUpgrades || manuallyPaused || (compact && commandOpen)) || shift.status !== 'running'}
              manuallyPaused={manuallyPaused}
              onTogglePause={() => setManuallyPaused((value) => !value)}
              onInteract={interactWithWard}
            />
          ) : (
            <p className="tycoon-map-unavailable">No patient rooms are available for this shift.</p>
          )}
        </section>
        <aside
          className="tycoon-panel tycoon-command"
          id="tycoon-command-panel"
          aria-labelledby="tycoon-command-title"
          ref={commandPanelRef}
          tabIndex={-1}
          inert={!panelVisible}
          aria-hidden={!panelVisible}
          onKeyDown={(event) => {
            if (event.key === 'Escape') returnToMap()
          }}
        >
          <header className="tycoon-command-header">
            <h2 className="tycoon-section-label" id="tycoon-command-title">
              Patient commands
            </h2>
            <span>
              {completedCount}/{shift.tasks.length} complete
            </span>
            <button type="button" className="tycoon-command-close" onClick={returnToMap} aria-label="Close patient details">
              <X aria-hidden="true" />
            </button>
          </header>
          {selectedTask ? (
            <>
              <div className="tycoon-patient">
                <span className="tycoon-patient-portrait">
                  <TycoonPortrait task={selectedTask} />
                </span>
                <h3>{selectedTask.patientName}</h3>
                <UrgencyBadge task={selectedTask} />
                <span className="tycoon-patient-room">{selectedTask.room}</span>
              </div>
              <div className="tycoon-command-details">
                <section
                  className="tycoon-patient-tasks"
                  aria-labelledby="tycoon-tasks-title"
                  aria-live="polite"
                  aria-atomic="true"
                >
                  <h2 className="tycoon-section-label" id="tycoon-tasks-title">
                    Patient task
                  </h2>
                  <h3>{selectedTask.title}</h3>
                  <dl className="tycoon-task-meta">
                    <div>
                      <dt>Room</dt>
                      <dd>{selectedTask.room.replace('Room ', '')}</dd>
                    </div>
                    <div>
                      <dt>Due by</dt>
                      <dd>
                        <time>{formatTime(selectedTask.deadlineMinute)}</time>
                      </dd>
                    </div>
                    <div>
                      <dt>Care</dt>
                      <dd>{selectedTask.category.replaceAll('-', ' ')}</dd>
                    </div>
                  </dl>
                </section>
              </div>
              <div className="tycoon-command-actions">
                <CareChecklist task={selectedTask} />
                <TycoonTooltip text={assessmentUnavailableReason}>
                  <span
                    className="tycoon-assessment-action"
                    aria-label={
                      assessmentUnavailableReason
                        ? 'Assessment unavailable'
                        : undefined
                    }
                  >
                    <button
                      type="button"
                      className="is-primary"
                      disabled={
                        selectedTask.status === 'completed' ||
                        selectedTask.status === 'failed' ||
                        shift.status !== 'running'
                      }
                      onClick={() => continueCare(selectedTask)}
                    >
                      <ClipboardList aria-hidden="true" />
                      <span>
                        {selectedTask.status === 'completed'
                          ? 'Care Complete'
                          : selectedTask.status === 'failed'
                            ? 'Task Closed'
                            : CARE_LABELS[nextCareStep(selectedTask) ?? 'assessment']}
                      </span>
                      <ChevronRight aria-hidden="true" />
                    </button>
                  </span>
                </TycoonTooltip>
                <button
                  type="button"
                  disabled={shift.status !== 'running'}
                  onClick={() => travelTo(`equipment:${selectedTask.id}`)}
                >
                  <Pencil aria-hidden="true" />
                  <span>{shift.equipmentReviewedTaskIds?.includes(selectedTask.id) ? 'Revisit equipment' : 'Inspect equipment'}</span>
                  <ChevronRight aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() =>
                    travelTo('station', selectedTask.id)
                  }
                >
                  <MessageCircle aria-hidden="true" />
                  <span>Care notes</span>
                  <ChevronRight aria-hidden="true" />
                </button>
              </div>
            </>
          ) : (
            <p>Select a patient to begin care.</p>
          )}
        </aside>
      </div>
      <footer className="tycoon-game-footer">
        <button
          type="button"
          className="tycoon-finish"
          onClick={() => travelTo('station')}
          disabled={shift.status !== 'running'}
        >
          <FastForward fill="currentColor" aria-hidden="true" />
          Return for handoff
        </button>
      </footer>
      {patientView && modalTask ? (
        <TycoonDialog
          expanded={patientView.kind === 'assess'}
          title={
            patientView.kind === 'assess'
              ? 'Assess Patient'
              : patientView.kind === 'orders'
                ? 'View Orders'
                : patientView.kind === 'equipment' ? 'Patient monitor'
                  : patientView.kind === 'safety' ? 'Bedside safety check'
                    : patientView.kind === 'care' ? 'Provide care'
                      : patientView.kind === 'reassessment' ? 'Reassess patient' : 'Add Note'
          }
          onClose={() => setPatientView(null)}
        >
          <div className="tycoon-dialog-patient">
            <span>
              <TycoonPortrait task={modalTask} />
            </span>
            <div>
              <h3>{modalTask.patientName}</h3>
              <p>
                {modalTask.room} · {modalTask.title}
              </p>
            </div>
            <UrgencyBadge task={modalTask} />
          </div>
          <CareChecklist task={modalTask} />
          {patientView.kind === 'assess' ? (
            <>
              <p className="tycoon-dialog-intro">
                Choose the safest next action.
              </p>
              <div className="tycoon-assessment-choices">
                {modalTask.actions.map((action) => (
                  <TycoonTooltip
                    key={action.id}
                    text={
                      action.scope === 'RN-only'
                        ? 'RN-only: an action assigned to the registered nurse in this game. This label does not mean it is the best next choice.'
                        : action.scope === 'UAP-safe'
                          ? 'UAP-safe: an action eligible for delegation to unlicensed assistive personnel in this game. It may still be the wrong choice for this task.'
                          : undefined
                    }
                  >
                    <button
                      type="button"
                      onClick={() => chooseAction(modalTask, action.id)}
                      disabled={
                        shift.status !== 'running' ||
                        modalTask.status === 'completed' ||
                        modalTask.status === 'failed'
                      }
                    >
                      <strong>{action.label}</strong>
                      <span>{action.description}</span>
                      <small>{action.scope}</small>
                    </button>
                  </TycoonTooltip>
                ))}
              </div>
            </>
          ) : null}
          {patientView.kind === 'equipment' || patientView.kind === 'safety' || patientView.kind === 'reassessment' ? (
            <CareCheckAction key={`${modalTask.id}-${patientView.kind}`} task={modalTask}
              step={patientView.kind === 'equipment' ? 'monitor' : patientView.kind}
              onComplete={(step) => recordCareStep(modalTask, step)} onContinue={() => continueCare(modalTask)} />
          ) : null}
          {patientView.kind === 'care' ? <BedsideCareAction key={modalTask.id} task={modalTask} paused={showUpgrades} onComplete={() => recordCareStep(modalTask, 'care')} onContinue={() => continueCare(modalTask)} /> : null}
          {patientView.kind === 'orders' ? (
            <div className="tycoon-orders">
              <h3>Current care task</h3>
              <p>{modalTask.title}</p>
              <dl>
                <div>
                  <dt>Care category</dt>
                  <dd>{modalTask.category.replaceAll('-', ' ')}</dd>
                </div>
                <div>
                  <dt>Due by</dt>
                  <dd>{formatTime(modalTask.deadlineMinute)}</dd>
                </div>
                <div>
                  <dt>Status</dt>
                  <dd>{modalTask.status}</dd>
                </div>
              </dl>
              <p>{nextCareStep(modalTask) ? `Next: ${CARE_LABELS[nextCareStep(modalTask)!]}.` : 'Care task closed. Your saved notes remain available at the station.'}</p>
              <button
                type="button"
                className="tycoon-modal-primary"
                onClick={() =>
                  continueCare(modalTask)
                }
                disabled={
                  modalTask.status === 'completed' ||
                  modalTask.status === 'failed' ||
                  shift.status !== 'running'
                }
              >
                Continue care
                <ChevronRight aria-hidden="true" />
              </button>
            </div>
          ) : null}
          {patientView.kind === 'note' ? (
            <PatientNote
              key={`${shift.id}-${modalTask.id}`}
              shiftId={shift.id}
              task={modalTask}
              onSaved={() => {
                const readyToComplete = nextCareStep(modalTask) === 'documentation'
                if (readyToComplete) advanceCare(modalTask.id, 'documentation', shift.id)
                setPatientView(null)
                setFeedback({
                  title: readyToComplete ? 'Patient care complete' : 'Note saved',
                  message: readyToComplete ? `Care documented for ${modalTask.patientName}. Your task rewards have been added.` : `Your note for ${modalTask.patientName} is saved in Notes.`,
                  completedTaskId: readyToComplete ? modalTask.id : undefined,
                  good: true,
                })
              }}
            />
          ) : null}
        </TycoonDialog>
      ) : null}
      {stationOpen && shift.status === 'running' ? (
        <TycoonDialog title="Nursing station · handoff" onClose={() => setStationOpen(false)}>
          <p className="tycoon-dialog-intro">{completedCount}/{shift.tasks.length} patients completed. Equipment reviewed in {shift.equipmentReviewedTaskIds?.length ?? 0}/{shift.tasks.length} rooms.</p>
          <ul className="tycoon-handoff-list">
            {shift.tasks.map((task) => (
              <li key={task.id}>
                <span>{task.room} · {task.patientName}</span>
                <strong>{task.status === 'completed' ? 'Care complete' : task.status === 'failed' ? 'Task closed' : 'Needs care'}</strong>
                {task.status !== 'completed' && task.status !== 'failed' ? <button type="button" onClick={() => continueCare(task)}>Continue care</button> : null}
              </li>
            ))}
          </ul>
          <button type="button" className="tycoon-modal-primary" disabled={shift.tasks.some((task) => task.status === 'available' || task.status === 'deteriorating')} onClick={() => { setStationOpen(false); finishShift() }}>Complete handoff & finish shift</button>
          {shift.tasks.some((task) => task.status === 'available' || task.status === 'deteriorating') ? <p className="tycoon-dialog-intro">Visit the remaining patients before completing handoff.</p> : null}
        </TycoonDialog>
      ) : null}
      {feedback ? (
        <TycoonDialog title={feedback.title} onClose={dismissFeedback}>
          <div
            className={`tycoon-feedback ${feedback.good ? 'is-good' : 'is-warning'}${feedback.completedTaskId ? ' is-care-complete' : ''}`}
          >
            {feedback.completedTaskId ? (
              <CareCompleteCheck className="tycoon-feedback-check" />
            ) : feedback.good ? (
              <Check aria-hidden="true" />
            ) : (
              <TriangleAlert aria-hidden="true" />
            )}
            <p>{feedback.message}</p>
          </div>
          <button
            type="button"
            className="tycoon-modal-primary"
            onClick={dismissFeedback}
          >
            Continue Shift
            <ChevronRight aria-hidden="true" />
          </button>
        </TycoonDialog>
      ) : null}
      {shift.status === 'finished' && shift.payoutSummary ? (
        <TycoonDialog title="End of Shift Summary">
          <h3 className="tycoon-summary-title">Shift complete.</h3>
          <div className="tycoon-summary-rewards">
            <Reward
              label="Tasks completed"
              value={`${shift.payoutSummary.completedTasks}/${shift.tasks.length}`}
            />
            <Reward
              label="Money earned"
              value={`$${shift.payoutSummary.moneyEarned}`}
            />
            <Reward
              label="XP earned"
              value={`+${shift.payoutSummary.xpEarned}`}
            />
            <Reward
              label="Mistakes"
              value={`${shift.payoutSummary.mistakes}`}
            />
            <Reward
              label="Safety score"
              value={`${shift.payoutSummary.safetyScore}%`}
            />
            <Reward
              label="Reputation"
              value={`${shift.payoutSummary.reputationChange >= 0 ? '+' : ''}${shift.payoutSummary.reputationChange}`}
            />
          </div>
          <p className="tycoon-dialog-intro">
            {shift.payoutSummary.recommendation}
          </p>
          <div className="tycoon-summary-actions">
            <button
              type="button"
              className="tycoon-modal-primary"
              onClick={beginShift}
            >
              <Play fill="currentColor" aria-hidden="true" />
              Start Next Shift
            </button>
            <button
              type="button"
              onClick={() => setShowUpgrades(!showUpgrades)}
              aria-expanded={showUpgrades}
            >
              Upgrade Unit
            </button>
            <button type="button" onClick={() => navigate('/')}>
              Return Home
            </button>
          </div>
        </TycoonDialog>
      ) : null}
      {shopDialog}
      {toast ? <div className="tycoon-care-toast" role="status">{toast}</div> : null}
    </main>
  )
}

function CareCompleteCheck({ className }: { className: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m5 12 4 4L19 6" pathLength="1" />
    </svg>
  )
}

function TycoonHud({
  tycoon,
  inGame = false,
  clockPaused = false,
}: {
  tycoon: TycoonGameState
  inGame?: boolean
  clockPaused?: boolean
}) {
  const xp = tycoon.xp % 450
  return (
    <header className="tycoon-hud" aria-label="Shift statistics">
      <TycoonTooltip text="Your game balance. Safe choices earn money; mistakes and unit upgrades spend it.">
        <div className="tycoon-hud-money">
          <span className="tycoon-hud-icon">
            <CircleDollarSign aria-hidden="true" />
          </span>
          <strong aria-label={`Money: $${tycoon.money}`}>
            ${tycoon.money.toLocaleString()}
          </strong>
        </div>
      </TycoonTooltip>
      <TycoonTooltip
        text={`Earn XP through safe care to level up. ${450 - xp} XP remaining until level ${tycoon.level + 1}.`}
      >
        <div className="tycoon-hud-level">
          <span className="tycoon-hud-icon">
            <Zap fill={inGame ? 'none' : 'currentColor'} aria-hidden="true" />
          </span>
          <div>
            <strong>Lv {tycoon.level}</strong>
            {inGame ? (
              <span className="tycoon-xp-remaining">{450 - xp} XP</span>
            ) : null}
            <progress value={xp} max={450} aria-label="XP toward next level" />
            {!inGame ? <small>{xp} / 450 XP</small> : null}
          </div>
        </div>
      </TycoonTooltip>
      <TycoonTooltip text="Your unit’s safety score. Safe choices raise it; unsafe choices and overdue tasks lower it.">
        <div className="tycoon-hud-safety">
          <span className="tycoon-hud-icon">
            <ShieldCheck aria-hidden="true" />
          </span>
          <div>
            <strong aria-label={`Patient safety: ${tycoon.patientSafety}%`}>
              {tycoon.patientSafety}%
            </strong>
            {inGame ? (
              <>
                <progress
                  value={tycoon.patientSafety}
                  max={100}
                  aria-label="Patient safety"
                />
                <span className="tycoon-safety-label">Safety</span>
              </>
            ) : null}
          </div>
        </div>
      </TycoonTooltip>
      <TycoonClock
        key={tycoon.activeShift?.id ?? 'lobby'}
        shift={tycoon.activeShift}
        completedShifts={tycoon.completedShifts.length}
        inGame={inGame}
        paused={clockPaused}
      />
    </header>
  )
}

function UrgencyBadge({
  task,
  prominent = false,
}: {
  task: TycoonTask
  prominent?: boolean
}) {
  const tone =
    task.status === 'completed'
      ? 'complete'
      : task.status === 'failed' || task.status === 'deteriorating'
        ? 'critical'
        : task.safetyRisk
  const label =
    task.status === 'completed'
      ? 'Complete'
      : task.status === 'failed'
        ? 'Failed'
        : task.status === 'deteriorating'
          ? 'Deteriorating'
          : urgencyLabels[task.safetyRisk]
  const help =
    task.status === 'completed'
      ? 'This patient’s care task is finished.'
      : task.status === 'failed'
        ? 'This task closed after an unsafe choice.'
        : task.status === 'deteriorating'
          ? 'This task worsened after a delay or unsafe choice. It remains open.'
          : urgencyHelp[task.safetyRisk]
  return (
    <TycoonTooltip text={help}>
      <span
        data-status={task.status}
        className={`tycoon-badge ${tone}${prominent ? ' is-prominent' : ''}`}
      >
        {prominent ? (
          <TriangleAlert aria-hidden="true" />
        ) : (
          <span aria-hidden="true" />
        )}
        {label}
      </span>
    </TycoonTooltip>
  )
}
function Reward({ value, label }: { value: string; label: string }) {
  return (
    <div className="tycoon-reward">
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  )
}
function TycoonDialog({
  title,
  children,
  onClose,
  expanded = false,
}: {
  title: string
  children: ReactNode
  onClose?: () => void
  expanded?: boolean
}) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const dialog = dialogRef.current
    dialog?.showModal()
    return () => dialog?.close()
  }, [])
  return (
    <dialog
      ref={dialogRef}
      className={`tycoon-dialog${expanded ? ' tycoon-dialog-assessment' : ''}`}
      aria-label={title}
      onCancel={(event) => {
        event.preventDefault()
        onClose?.()
      }}
    >
      <header>
        <h2>{title}</h2>
        {onClose ? (
          <button type="button" onClick={onClose} aria-label="Close dialog">
            <X aria-hidden="true" />
          </button>
        ) : null}
      </header>
      {children}
    </dialog>
  )
}
function PatientNote({
  shiftId,
  task,
  onSaved,
}: {
  shiftId: string
  task: TycoonTask
  onSaved: () => void
}) {
  const [noteId, setNoteId] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    let cancelled = false
    void getTycoonPatientNoteId(shiftId, task.patientId).then(
      (id) => {
        if (!cancelled) setNoteId(id)
      },
      () => {
        if (!cancelled) setFailed(true)
      },
    )
    return () => {
      cancelled = true
    }
  }, [shiftId, task.patientId])

  if (failed)
    return (
      <p className="tycoon-dialog-intro" role="alert">
        We couldn't open this note. Close this window and try again.
      </p>
    )
  if (!noteId)
    return (
      <p className="tycoon-dialog-intro" role="status">
        Opening patient note…
      </p>
    )
  return (
    <PatientNoteEditor
      key={noteId}
      noteId={noteId}
      task={task}
      onSaved={onSaved}
    />
  )
}
function PatientNoteEditor({
  noteId,
  task,
  onSaved,
}: {
  noteId: string
  task: TycoonTask
  onSaved: () => void
}) {
  const savedNote = useStudySystemStore((state) =>
    state.notes.find((note) => note.id === noteId),
  )
  const saveNote = useStudySystemStore((state) => state.saveNote)
  const [body, setBody] = useState(savedNote?.body ?? '')
  return (
    <form
      className="tycoon-note"
      onSubmit={(event) => {
        event.preventDefault()
        if (!body.trim()) return
        saveNote({
          ...savedNote,
          id: noteId,
          title: `Tycoon · ${task.patientName} · ${task.room}`,
          body: body.trim(),
          category: 'General',
          updatedAt: new Date().toISOString(),
        })
        onSaved()
      }}
    >
      <label htmlFor="tycoon-patient-note">Care note</label>
      <textarea
        id="tycoon-patient-note"
        value={body}
        onChange={(event) => setBody(event.target.value)}
        placeholder="Record assessment, intervention, and patient response…"
        rows={6}
        required
      />
      <button
        type="submit"
        className="tycoon-modal-primary"
        disabled={!body.trim()}
      >
        Save Note
        <Check aria-hidden="true" />
      </button>
    </form>
  )
}
