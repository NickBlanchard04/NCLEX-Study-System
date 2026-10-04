import { useEffect, useRef, useState } from 'react'
import type { TycoonCareStep, TycoonTask } from '../app/types'
import { CARE_LABELS, CARE_STEPS, nextCareStep } from '../services/tycoon-care'
import { useStudySystemStore } from '../app/store'
import { PatientDecision } from './TycoonSimulation'
import { tycoonScenarios } from '../data/tycoon-scenarios'

export function CareChecklist({ task }: { task: TycoonTask }) {
  const next = nextCareStep(task)
  const combined = task.simulation?.workflow === 'bedside'
  const steps = combined ? CARE_STEPS.filter((step) => step !== 'monitor' && (step !== 'safety' || task.simulation?.scenario === 'medication' && !task.simulation.scannerUsed)) : CARE_STEPS
  return <ol className="tycoon-care-steps" aria-label="Patient care progress">
    {steps.map((step, index) => {
      const done = task.status === 'completed' || task.careProgress?.steps.includes(step)
      return <li key={step} className={done ? 'is-done' : next === step ? 'is-current' : ''} aria-current={next === step ? 'step' : undefined}>
        <span aria-hidden="true">{done ? '✓' : index + 1}</span>{combined && step === 'assessment' ? 'Bedside assessment' : combined && step === 'safety' ? 'Verify medication' : CARE_LABELS[step]}
      </li>
    })}
  </ol>
}

const checks: Record<'monitor' | 'safety' | 'reassessment', readonly string[]> = {
  monitor: ['Match the monitor to this patient', 'Review the concern in the current care task'],
  safety: ['Confirm patient identity', 'Match bedside equipment to the care plan', 'Review the selected action before care'],
  reassessment: ['Revisit the original patient concern', 'Review the simulated response before charting'],
}

export function CareCheckAction({ task, step, onComplete, onContinue, onScan }: {
  task: TycoonTask; step: 'monitor' | 'safety' | 'reassessment'
  onScan?: () => void
  onComplete: (step: TycoonCareStep) => void; onContinue: () => void
}) {
  const [checked, setChecked] = useState<string[]>([])
  const scanner = useStudySystemStore((state) => (state.tycoon.upgrades['med-safety-scanner'] ?? 0) > 0)
  const available = nextCareStep(task) === step
  const done = task.status === 'completed' || task.careProgress?.steps.includes(step)
  const stepChecks = task.simulation?.workflow === 'bedside' && task.simulation.scenario === 'medication' && step === 'safety'
    ? ['Match patient identity and the scheduled medication order', 'Review the low pulse and order requirement before administration'] : checks[step]
  if (step === 'safety' && available && scanner && task.simulation?.physicalEquipment && task.simulation.scenario === 'medication') return <div className="tycoon-care-check"><p>Scan the wristband and prepared medication at the bedside. Verification is recorded when scanning finishes.</p><button type="button" className="tycoon-modal-primary" onClick={onScan}>Scan wristband &amp; medication</button></div>
  if (step === 'reassessment' && task.simulation) return <div className="tycoon-care-check"><PatientDecision task={task} phase="reassessment" onContinue={onContinue} /></div>
  return <div className="tycoon-care-check">
    {step === 'monitor' ? <div className="tycoon-monitor-preview" aria-label="Illustrative monitor display">
      <svg viewBox="0 0 480 70" aria-hidden="true"><path d="M0 38H75l8-5 8 5h30l8-24 12 45 12-29 8 8h90l8-5 8 5h30l8-24 12 45 12-29 8 8h100" /></svg>
      <span>Simulation display · {task.room}</span>
    </div> : null}
    <p>{done ? 'This check is recorded.' : available ? 'Complete each check to record this step.' : `Next: ${CARE_LABELS[nextCareStep(task) ?? 'documentation']}.`}</p>
    <fieldset disabled={!available}>
      <legend>{CARE_LABELS[step]}</legend>
      {stepChecks.map((label) => <label key={label}><input type="checkbox" checked={Boolean(done) || checked.includes(label)} onChange={(event) => setChecked((current) => event.target.checked ? [...current, label] : current.filter((item) => item !== label))} />{label}</label>)}
    </fieldset>
    <button type="button" className="tycoon-modal-primary" disabled={available && checked.length !== stepChecks.length} onClick={() => available ? onComplete(step) : onContinue()}>
      {available ? `Record ${step === 'monitor' ? 'monitor check' : step === 'safety' ? 'safety check' : 'reassessment'}` : 'Continue care'}
    </button>
  </div>
}

export function BedsideCareAction({ task, paused, onComplete, onContinue }: {
  task: TycoonTask; paused: boolean; onComplete: () => void; onContinue: () => void
}) {
  const [started, setStarted] = useState(false)
  const [progress, setProgress] = useState(0)
  const elapsed = useRef(0)
  const completeRef = useRef(onComplete)
  useEffect(() => { completeRef.current = onComplete }, [onComplete])
  useEffect(() => {
    if (!started || paused) return
    let frame = 0, previous = 0, stopped = false
    const tick = (now: number) => {
      if (stopped) return
      if (previous && !document.hidden) elapsed.current += Math.min(now - previous, 80)
      previous = now
      const duration = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 100 : 2800
      setProgress(Math.min(100, elapsed.current / duration * 100))
      if (elapsed.current >= duration) { stopped = true; completeRef.current(); return }
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => { stopped = true; cancelAnimationFrame(frame) }
  }, [started, paused])
  const available = nextCareStep(task) === 'care'
  const action = task.actions.find((item) => item.id === task.careProgress?.assessmentActionId)
  const intervention = task.simulation ? tycoonScenarios[task.simulation.scenario].choices.find((choice) => choice.id === task.simulation?.intervention) : undefined
  return <div className="tycoon-bedside-action">
    {task.simulation && available ? <PatientDecision task={task} phase="care" /> : null}
    <h3>{task.simulation ? 'Care plan' : action?.label ?? 'Bedside care'}</h3>
    <p>{task.simulation ? intervention?.feedback ?? 'Choose a care response above, then begin bedside care.' : action?.description ?? task.title}</p>
    {available ? <>
      {started ? <><progress value={progress} max={100} aria-label="Bedside care progress" /><p role="status">{paused ? 'Care paused' : `Providing care… ${Math.round(progress)}%`}</p></> : null}
      <button type="button" className="tycoon-modal-primary" disabled={started || Boolean(task.simulation && !task.simulation.intervention)} onClick={() => setStarted(true)}>{started ? 'Care in progress' : 'Begin bedside care'}</button>
    </> : <button type="button" className="tycoon-modal-primary" onClick={onContinue}>Continue care</button>}
  </div>
}
