import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { StudyNavigation } from './study-tools-menu'
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
import { CallBellBoard, PatientCall, PatientObservations, ShiftObjectives } from './TycoonSimulation'
import { careCompletions, type CareCompletion } from '../services/tycoon-care-feedback'
import { worldJobActive } from '../services/tycoon-world-jobs'
import { careNoteDraft } from '../services/tycoon-shift-loop'
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
import './tycoon-code-red.css'
import './tycoon-mobile-controls.css'
import './tycoon-compact-care.css'

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
type PatientView = { kind: 'call' | 'assess' | 'orders' | 'note' | 'equipment' | 'safety' | 'care' | 'reassessment'; taskId: string; shiftId: string } | null

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
  const [briefingOpen, setBriefingOpen] = useState(false)
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
  const [patientsOpen, setPatientsOpen] = useState(false)
  const [nearbyTaskId, setNearbyTaskId] = useState<string | null>(null)
  const [reward, setReward] = useState<{money: number; xp: number} | null>(null)
  useEffect(() => { if (!reward) return; const timer = window.setTimeout(() => setReward(null), 3600); return () => window.clearTimeout(timer) }, [reward])
  const [completion, setCompletion] = useState<CareCompletion | null>(null)
  const [guidedTaskId, setGuidedTaskId] = useState<string | null>(null)
  useEffect(() => { if (!completion) return; const timer = window.setTimeout(() => setCompletion(null), 2400); return () => window.clearTimeout(timer) }, [completion])
  const [toast, setToast] = useState<string | null>(null)
  const panelVisible = commandOpen && !patientView && !feedback && !showUpgrades && !stationOpen
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
  const [compact, setCompact] = useState(() => window.matchMedia('(max-width: 899px), (pointer: coarse)').matches)
  const commandPanelRef = useRef<HTMLElement>(null)
  const mapPanelRef = useRef<HTMLElement>(null)
  useEffect(() => {
    const media = window.matchMedia('(max-width: 899px), (pointer: coarse)')
    const update = () => {
      setCompact(media.matches)
      setCommandOpen(false)
    }
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])
  const shift = tycoon.activeShift
  useEffect(() => useStudySystemStore.subscribe((state, previous) => {
    const current = state.tycoon.activeShift, before = previous.tycoon.activeShift
    if (current?.id !== before?.id || current?.worldJobs === before?.worldJobs) return
    for (const job of current?.worldJobs ?? []) {
      if (job.phase !== 'complete' || before?.worldJobs?.some((old) => old.id === job.id && old.phase === 'complete')) continue
      if (job.kind === 'chart' || job.kind === 'scanner') continue
      setToast(job.kind === 'lab' ? 'Training sample delivered to the station.' : 'Support RN returned. Comfort care completed.')
    }
  }), [])
  useEffect(() => useStudySystemStore.subscribe((state, previous) => {
    const changes = careCompletions(previous.tycoon, state.tycoon)
    const latest = changes.at(-1)
    if (!latest) return
    setGuidedTaskId(latest.taskId)
    setToast(null)
    if (latest.reward) { setReward(latest.reward); setCompletion(null) }
    else setCompletion(latest)
  }), [])
  const guidedTask = shift?.tasks.find(task => task.id === guidedTaskId)
  const guidedStep = guidedTask ? nextCareStep(guidedTask) : null
  const bestTask = getBestTycoonTask(shift)
  const selectedTask =
    shift?.tasks.find((task) => task.id === (!commandOpen && nearbyTaskId ? nearbyTaskId : tycoon.selectedTaskId)) ??
    bestTask ??
    shift?.tasks[0]
  const modalTask = shift?.id === patientView?.shiftId
    ? shift?.tasks.find((task) => task.id === patientView?.taskId)
    : undefined
  const modalCall = shift?.loop?.calls.filter((call) => call.taskId === modalTask?.id && (call.status === 'ringing' || call.status === 'missed')).sort((a, b) => Number(b.kind === 'change') - Number(a.kind === 'change'))[0]
  const completedCount =
    [...(shift?.simulation?.archived ?? []), ...(shift?.tasks ?? [])].filter((task) => task.status === 'completed').length
  const patientCount = shift?.simulation?.admitted ?? shift?.tasks.length ?? 0
  const assessmentUnavailableReason =
    shift && shift.status !== 'running'
      ? 'Assessments are available during a running shift.'
      : selectedTask?.status === 'completed'
        ? 'This patient’s care task is already complete. Orders and notes remain available.'
        : selectedTask?.status === 'failed'
          ? 'This task closed after an unsafe choice. Orders and notes remain available.'
          : undefined

  function selectRoomTask(task: TycoonTask) {
    setPatientsOpen(false)
    selectTask(task.id)
    setCommandOpen(true)
    window.requestAnimationFrame(() => commandPanelRef.current?.focus({ preventScroll: true }))
  }

  function returnToMap() {
    setCommandOpen(false)
    window.requestAnimationFrame(() => mapPanelRef.current?.focus({ preventScroll: true }))
  }

  function beginShift() {
    setPatientView(null)
    setFeedback(null)
    setShowUpgrades(false)
    setCommandOpen(false)
    setStationOpen(false)
    setBriefingOpen(true)
    setManuallyPaused(false)
    pendingNoteRef.current = null
    setNearbyTaskId(null)
    setToast(null)
    const capacity = Math.min(6, 3 + (tycoon.upgrades['extra-bed'] ?? 0))
    startShift('fundamentals-clinic', { simulation: true, paced: true, physicalInteractions: true, roomIds: Array.from({ length: capacity }, (_, index) => `Room ${101 + index}`) })
  }

  function startWorldWork(task: TycoonTask, kind: 'lab' | 'scanner' | 'chart', noteId?: string) {
    if (!shift) return
    useStudySystemStore.getState().queueTycoonWorldJob(task.id, kind, shift.id, wardRef.current?.position(), noteId)
    const job = useStudySystemStore.getState().tycoon.activeShift?.worldJobs?.find((job) => job.taskId === task.id && job.kind === kind && worldJobActive(job))
    if (!job) { setToast('Visit the correct work area and finish the preceding care steps first.'); return }
    setPatientView(null); setStationOpen(false); setManuallyPaused(false); returnToMap()
    setToast(kind === 'lab' ? 'Sample pickup queued. The runner will collect and deliver it.' : kind === 'scanner' ? 'Scanning at the bedside…' : 'Note saved. Finishing charting at the station…')
  }

  function travelTo(targetId: string, noteTaskId?: string) {
    pendingNoteRef.current = noteTaskId ?? null
    setPatientView(null)
    setStationOpen(false)
    setManuallyPaused(false)
    setCommandOpen(false)
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
    const hasCall = target.kind === 'patient' && current.loop?.calls.some((call) => call.taskId === task.id && (call.status === 'ringing' || call.status === 'missed'))
    setPatientView({
      kind: hasCall ? 'call' : target.kind === 'equipment' ? 'equipment' : target.kind === 'safety' ? 'safety' : step === 'assessment' ? 'assess' : step === 'care' ? 'care' : step === 'reassessment' ? 'reassessment' : 'orders',
      taskId: task.id, shiftId: current.id,
    })
  }

  function chooseAction(task: TycoonTask, actionId: string) {
    const currentShift = useStudySystemStore.getState().tycoon.activeShift
    if (!shift || currentShift?.id !== shift.id || patientView?.shiftId !== shift.id) return
    const previousEvents = new Set(currentShift.events.map((event) => event.id))
    assessPatient(task.id, actionId, shift.id)

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
    const current = useStudySystemStore.getState().tycoon.activeShift?.tasks.find(item => item.id === task.id)
    if (current && nextCareStep(current)) travelTo(careDestination(current), nextCareStep(current) === 'documentation' ? current.id : undefined)
  }

  function recordCareStep(task: TycoonTask, step: TycoonCareStep) {
    if (!shift) return
    advanceCare(task.id, step, shift.id)
    setPatientView(null)
    setCommandOpen(false)
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
                Complete and discharge 3 patients with 80% safety.
                <br className="tycoon-desktop-break" /> 24 game minutes · new admissions · $150 goal bonus.
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
      className={`tycoon tycoon-game tycoon-prototype tycoon-code-red${panelVisible ? ' is-command-open' : ''}${patientView || feedback || stationOpen ? ' is-patient-focus' : ''}`}
      data-patients-open={patientsOpen}
      aria-label="Nurse Command Tycoon shift"
    >
      <TycoonHud
        tycoon={tycoon}
        inGame
        clockPaused={Boolean(briefingOpen || patientView || feedback || stationOpen || showUpgrades || manuallyPaused || (compact && commandOpen))}
      />
      <div className="tycoon-workspace">
        <section
          className="tycoon-panel tycoon-priority"
          id="tycoon-mobile-patients"
          aria-labelledby="tycoon-priority-title"
        >
          <button type="button" className="tycoon-mobile-patients-close" aria-label="Close patients" onClick={() => setPatientsOpen(false)}><X aria-hidden="true" /></button>
          <div className="tycoon-priority-copy">
            <TycoonTooltip text="The game’s highest-urgency unfinished task. Earlier deadlines break ties.">
              <h2 className="tycoon-section-label" id="tycoon-priority-title">
                Next patient
              </h2>
            </TycoonTooltip>
            <h3>
              {bestTask ? (
                <button type="button" className="tycoon-priority-select" onClick={() => selectRoomTask(bestTask)} aria-controls="tycoon-command-panel">
                  <span className="tycoon-priority-name">{bestTask.patientName}</span>
                  <span className="tycoon-priority-task">{bestTask.title}</span>
                </button>
              ) : 'Patient care complete — arrange discharge'}
            </h3>
            <p>
              {bestTask
                ? `Due ${formatTime(bestTask.deadlineMinute)}`
                : 'Finish your shift to review patient care and earnings.'}
            </p>
            <details className="tycoon-goals-drawer"><summary>Shift goals{shift.simulation ? ` · ${Math.max(0, Math.ceil(shift.simulation.duration - shift.shiftMinute))} min left` : ''}</summary><ShiftObjectives tycoon={tycoon} /></details>
            <CallBellBoard tycoon={tycoon} onVisit={(task) => travelTo(`patient:${task.id}`)} />
            {shift.worldJobs?.some(worldJobActive) ? <div className="tycoon-world-jobs" role="status" aria-label="Ward work">{shift.worldJobs.filter(worldJobActive).map((job) => <p key={job.id}>{shift.tasks.find((task) => task.id === job.taskId)?.room} · {job.kind === 'support' ? 'Support RN' : job.kind === 'lab' ? 'Lab runner' : job.kind === 'scanner' ? 'Scanner' : 'Charting'}: {job.phase === 'to-patient' ? 'walking to room' : job.phase === 'to-station' ? 'returning to station' : job.phase === 'reporting' ? 'reporting completion' : 'working'}</p>)}</div> : null}
            {shift.tasks.length > 1 ? <nav className="tycoon-saved-rooms" aria-label="Ward rooms">
              {shift.tasks.map((task) => <button key={task.id} type="button" onClick={() => selectRoomTask(task)} aria-controls="tycoon-command-panel" aria-pressed={task.id === selectedTask?.id}>{task.room}</button>)}
            </nav> : null}
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
          {shift.tasks.length ? (
            <TycoonHospitalMap
              key={shift.id}
              shiftId={shift.id}
              ref={wardRef}
              tasks={shift.tasks}
              selectedTaskId={selectedTask?.id}
              suggestedTargetId={guidedTask && guidedStep ? careDestination(guidedTask) : undefined}
              reviewedTaskIds={shift.equipmentReviewedTaskIds ?? []}
              upgrades={tycoon.upgrades}
              calls={shift.loop?.calls}
              worldJobs={shift.worldJobs}
              onOpenPatients={() => setPatientsOpen((open) => !open)}
              patientsOpen={patientsOpen}
              onOpenShop={() => { setPatientsOpen(false); setShowUpgrades(true) }}
              onNearbyTask={setNearbyTaskId}
              paused={Boolean(briefingOpen || patientView || feedback || stationOpen || showUpgrades || manuallyPaused || (compact && commandOpen)) || shift.status !== 'running'}
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
              {completedCount}/{patientCount} complete
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
              <details className="tycoon-observation-drawer"><summary>Observations &amp; care details</summary>
              <div className="tycoon-command-details">
                <PatientObservations task={selectedTask} remote />
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
              </details>
              <div className="tycoon-command-actions">
                <CareChecklist task={selectedTask} />
                {selectedTask.simulation?.physicalEquipment && selectedTask.category === 'vitals' && tycoon.upgrades['lab-runner'] > 0 && selectedTask.careProgress?.steps.includes('assessment') && selectedTask.status !== 'completed' && selectedTask.status !== 'failed' ? <button type="button" disabled={shift.status !== 'running' || shift.worldJobs?.some((job) => job.taskId === selectedTask.id && job.kind === 'lab' && job.phase !== 'cancelled')} onClick={() => startWorldWork(selectedTask, 'lab')}><ClipboardList aria-hidden="true" /><span>{selectedTask.simulation.labDelivered ? 'Training sample delivered' : shift.worldJobs?.some((job) => job.taskId === selectedTask.id && job.kind === 'lab' && worldJobActive(job)) ? 'Sample pickup in progress' : 'Request training sample pickup'}</span><ChevronRight aria-hidden="true" /></button> : null}
                {selectedTask.simulation && selectedTask.status === 'completed' ? <button type="button" className="is-primary" disabled={Boolean(selectedTask.simulation.discharged) || shift.status !== 'running'} onClick={() => {
                  useStudySystemStore.getState().dischargeTycoonPatient(selectedTask.id, shift.id)
                  setNearbyTaskId(null)
                  setToast('Patient discharged · admission board updated')
                }}><Check aria-hidden="true" /><span>{selectedTask.simulation.discharged ? 'Room available' : 'Discharge & admit next patient'}</span><ChevronRight aria-hidden="true" /></button> : null}
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
          aria-label="Return for handoff"
          onClick={() => travelTo('station')}
          disabled={shift.status !== 'running'}
        >
          <FastForward fill="currentColor" aria-hidden="true" />
          <span className="tycoon-handoff-desktop-label">Return for handoff</span><span className="tycoon-handoff-mobile-label">Handoff</span>
        </button>
      </footer>
      {patientView && modalTask && shift.status === 'running' ? (
        <TycoonDialog
          key={`${shift.id}-${modalTask.id}-${patientView.kind}`}
          compact
          expanded={patientView.kind === 'assess'}
          title={
            patientView.kind === 'call' ? 'Call bell' : patientView.kind === 'assess'
              ? 'Assess patient'
              : patientView.kind === 'orders'
                ? 'Care orders'
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
                {modalTask.room}
              </p>
            </div>
            <UrgencyBadge task={modalTask} />
          </div>
          {['assess', 'equipment', 'care', 'reassessment'].includes(patientView.kind) || patientView.kind === 'call' && modalCall?.kind === 'change' ? <PatientObservations task={modalTask} compact /> : null}
          {patientView.kind === 'call' && modalCall ? <PatientCall call={modalCall} onAttend={() => {
            useStudySystemStore.getState().respondToTycoonCall(modalCall.id, 'attend', shift.id)
            const step = nextCareStep(modalTask)
            setPatientView({ kind: step === 'assessment' ? 'assess' : step === 'care' ? 'care' : step === 'reassessment' ? 'reassessment' : 'orders', taskId: modalTask.id, shiftId: shift.id })
          }} /> : null}
          {patientView.kind === 'assess' ? (
            <>
              <p className="tycoon-dialog-intro">
                Choose the safest next action using these findings.
              </p>
              <div className="tycoon-assessment-choices">
                {modalTask.actions.map((action) => (
                  <TycoonTooltip
                    key={action.id}
                    text={`${action.description} ${
                      action.scope === 'RN-only'
                        ? 'RN-only: an action assigned to the registered nurse in this game. This label does not mean it is the best next choice.'
                        : action.scope === 'UAP-safe'
                          ? 'UAP-safe: an action eligible for delegation to unlicensed assistive personnel in this game. It may still be the wrong choice for this task.'
                          : ''
                    }`}
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
                    </button>
                  </TycoonTooltip>
                ))}
              </div>
            </>
          ) : null}
          {patientView.kind === 'equipment' || patientView.kind === 'safety' || patientView.kind === 'reassessment' ? (
            <CareCheckAction key={`${modalTask.id}-${patientView.kind}`} task={modalTask}
              step={patientView.kind === 'equipment' ? 'monitor' : patientView.kind}
              onScan={() => startWorldWork(modalTask, 'scanner')}
              onComplete={(step) => recordCareStep(modalTask, step)} onContinue={() => continueCare(modalTask)} />
          ) : null}
          {patientView.kind === 'care' ? <BedsideCareAction key={modalTask.id} task={modalTask} paused={showUpgrades} onComplete={() => recordCareStep(modalTask, 'care')} onContinue={() => continueCare(modalTask)} /> : null}
          {patientView.kind === 'orders' ? (
            <div className="tycoon-orders">
              {modalTask.simulation?.physicalEquipment && modalTask.category === 'vitals' && tycoon.upgrades['lab-runner'] > 0 && modalTask.careProgress?.steps.includes('assessment') ? <button type="button" className="tycoon-modal-primary" disabled={shift.worldJobs?.some((job) => job.taskId === modalTask.id && job.kind === 'lab' && job.phase !== 'cancelled')} onClick={() => startWorldWork(modalTask, 'lab')}>{modalTask.simulation.labDelivered ? 'Training sample delivered' : shift.worldJobs?.some((job) => job.taskId === modalTask.id && job.kind === 'lab' && worldJobActive(job)) ? 'Sample pickup in progress' : 'Request training sample pickup'}</button> : null}
              <p>{modalTask.title}</p>
              <dl>
                <div>
                  <dt>Due by</dt>
                  <dd>{formatTime(modalTask.deadlineMinute)}</dd>
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
              onSaved={(noteId) => {
                const readyToComplete = nextCareStep(modalTask) === 'documentation'
                if (readyToComplete && modalTask.simulation?.physicalEquipment) { startWorldWork(modalTask, 'chart', noteId); return }
                if (readyToComplete) { advanceCare(modalTask.id, 'documentation', shift.id); setPatientView(null); return }
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
          <details className="tycoon-patient-details" key={`details-${modalTask.id}-${patientView.kind}`}>
            <summary>Patient details</summary>
            <p>{modalTask.title} · {modalTask.category.replaceAll('-', ' ')} · {modalTask.status}</p>
            <PatientObservations task={modalTask} />
            {patientView.kind === 'assess' ? <dl className="tycoon-choice-details">{modalTask.actions.map(action => <div key={action.id}><dt>{action.label}</dt><dd>{action.description} <small>{action.scope}</small></dd></div>)}</dl> : null}
          </details>
        </TycoonDialog>
      ) : null}
      {stationOpen && shift.status === 'running' ? (
        <TycoonDialog title="Nursing station · handoff" onClose={() => setStationOpen(false)}>
          <p className="tycoon-dialog-intro">{completedCount}/{patientCount} patients completed. Equipment reviewed in {shift.equipmentReviewedTaskIds?.length ?? 0}/{shift.tasks.length} current rooms.</p>
          <div className="tycoon-dialog-intro"><ShiftObjectives tycoon={tycoon} />{shift.simulation ? <p>Handoff ends this shift. Unfinished patients remain on the review; discharge at least 3 patients and keep safety at 80% to earn the goal bonus.</p> : null}</div>
          <ul className="tycoon-handoff-list">
            {shift.tasks.map((task) => (
              <li key={task.id}>
                <span>{task.room} · {task.patientName}</span>
                <strong>{task.status === 'completed' ? 'Care complete' : task.status === 'failed' ? 'Task closed' : 'Needs care'}</strong>
                {task.simulation && task.status === 'completed' && !task.simulation.discharged ? <button type="button" onClick={() => useStudySystemStore.getState().dischargeTycoonPatient(task.id, shift.id)}>Discharge patient</button> : null}
                {task.status !== 'completed' && task.status !== 'failed' ? <button type="button" onClick={() => continueCare(task)}>Continue care</button> : null}
              </li>
            ))}
          </ul>
          <button type="button" className="tycoon-modal-primary" disabled={!shift.simulation && shift.tasks.some((task) => task.status === 'available' || task.status === 'deteriorating')} onClick={() => { setStationOpen(false); finishShift() }}>Complete handoff & finish shift</button>
          {!shift.simulation && shift.tasks.some((task) => task.status === 'available' || task.status === 'deteriorating') ? <p className="tycoon-dialog-intro">Visit the remaining patients before completing handoff.</p> : null}
        </TycoonDialog>
      ) : null}
      {briefingOpen && shift.status === 'running' ? <TycoonDialog title="Shift briefing" onClose={() => setBriefingOpen(false)}>
        <div className="tycoon-debrief"><h3>One shift, three priorities.</h3>
          <ol><li>Opening rounds: assess patients and combine routine bedside checks.</li><li>Respond &amp; recover: watch for a changed-symptom call. Comfort requests can wait or go to support staff; clinical changes need you.</li><li>Handoff: discharge at least 3 patients with safety at 80% or higher. Review your decisions and invest the earnings.</li></ol>
          <p>24 game minutes. Dialogs, the shop, and Pause stop the clock. Two replacement admissions are available after discharge.</p>
          <p>{tycoon.upgrades['staff-training'] ? 'Support staff available for comfort requests. ' : ''}{tycoon.upgrades['vitals-monitor'] ? 'Live ward-board telemetry installed. ' : ''}{tycoon.upgrades['ehr-station'] ? 'EHR care-note drafts available. ' : ''}</p>
          <button type="button" className="tycoon-modal-primary" onClick={() => setBriefingOpen(false)}>Begin rounds</button>
        </div></TycoonDialog> : null}
      {feedback && shift.status === 'running' ? (
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
              value={`${shift.payoutSummary.completedTasks}/${patientCount}`}
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
          {shift.simulation ? <section className="tycoon-debrief">
            <h3>{shift.payoutSummary.objectiveMet ? 'Shift goals achieved · $150 bonus paid' : 'Shift goals not yet achieved'}</h3>
            <p>{shift.payoutSummary.dischargedPatients}/{shift.simulation.goal} patients discharged · {shift.payoutSummary.safetyScore}% safety (goal 80%). Earnings include the bonus and completed care; purchases and penalties are deducted from your wallet separately.</p>
            <p>{shift.payoutSummary.objectiveMet ? 'Your successful shift counts toward room, staff, and equipment unlocks. Visit the shop before the next shift.' : 'Prioritize changing symptoms, reassess after care, and discharge documented patients. Try another shift with a new patient mix.'}</p>
            {shift.payoutSummary.highlights ? <><h3>What went well</h3><ul>{shift.payoutSummary.highlights.map((item) => <li key={item}>{item}</li>)}</ul><h3>What waited</h3>{shift.payoutSummary.delays?.length ? <ul>{shift.payoutSummary.delays.map((item, i) => <li key={i}>{item}</li>)}</ul> : <p>No overdue patients or unanswered calls at handoff.</p>}<h3>Next investment: {shift.payoutSummary.recommendedUpgrade}</h3></> : null}
            <details><summary>Review care decisions ({shift.payoutSummary.decisions?.length ?? 0})</summary><ol>{shift.payoutSummary.decisions?.map((decision, index) => <li key={index}>{decision}</li>)}</ol></details>
          </section> : null}
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
      {reward ? <div className="tycoon-reward-feedback" role="status"><Check aria-hidden="true" /><strong>+${reward.money}</strong><span>+{reward.xp} XP · Care recorded</span></div> : null}
      {completion ? <div className="tycoon-step-completion" role="status"><Check aria-hidden="true" /><span>{CARE_LABELS[completion.step]} recorded</span></div> : null}
      {guidedTask && guidedStep && !patientView && !feedback && !stationOpen && !showUpgrades && !panelVisible && shift.status === 'running' ? <button type="button" className="tycoon-next-care" onClick={() => continueCare(guidedTask)} disabled={manuallyPaused || Boolean(shift.worldJobs?.some(job => ['chart', 'scanner'].includes(job.kind) && worldJobActive(job)))}><span>{guidedTask.room} · Next</span><strong>{CARE_LABELS[guidedStep]}</strong><ChevronRight aria-hidden="true" /></button> : null}
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
          {inGame ? <span className="tycoon-code-label">Funds</span> : null}
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
      <StudyNavigation />
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
  compact = false,
}: {
  title: string
  children: ReactNode
  onClose?: () => void
  expanded?: boolean
  compact?: boolean
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
      className={`tycoon-dialog${expanded ? ' tycoon-dialog-assessment' : ''}${compact ? ' tycoon-dialog-compact' : ''}`}
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
  onSaved: (noteId: string) => void
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
  onSaved: (noteId: string) => void
}) {
  const savedNote = useStudySystemStore((state) =>
    state.notes.find((note) => note.id === noteId),
  )
  const saveNote = useStudySystemStore((state) => state.saveNote)
  const hasEhr = useStudySystemStore((state) => (state.tycoon.upgrades['ehr-station'] ?? 0) > 0)
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
        onSaved(noteId)
      }}
    >
      <label htmlFor="tycoon-patient-note">Care note</label>
      {hasEhr && task.simulation ? <><button type="button" className="tycoon-modal-primary" onClick={() => setBody(careNoteDraft(task))}>Prepare EHR care draft</button><p>Review the draft against the care you provided, edit as needed, then save.</p></> : null}
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
