import type { TycoonCall, TycoonGameState, TycoonTask } from '../app/types'
import { useStudySystemStore } from '../app/store'
import { patientObservation, tycoonScenarios } from '../data/tycoon-scenarios'
import './tycoon-simulation.css'
import { openCall, patientResponse, shiftPhase } from '../services/tycoon-shift-loop'

export function PatientObservations({ task, remote = false, compact = false }: { task: TycoonTask; remote?: boolean; compact?: boolean }) {
  const monitoring = useStudySystemStore((state) => state.tycoon.upgrades['vitals-monitor'] ?? 0)
  const observation = patientObservation(task)
  if (!observation || !task.simulation) return null
  const response = patientResponse(task)
  const hideVitals = remote && task.simulation.workflow === 'bedside' && !monitoring
  return <section className={`tycoon-observations${compact ? ' is-compact' : ''}`} aria-label="Patient observations">
    {!compact && !task.simulation.discharged ? <div className={`tycoon-patient-response is-${response.pose}`} aria-label={`Patient expression: ${response.expression}`}>
      <svg viewBox="0 0 64 66" role="img" aria-label={`${response.expression}, ${response.pose} posture`}>
        <path d={response.pose === 'tense' ? 'M4 64V49Q10 37 24 44H40Q56 37 60 49V64' : 'M4 64V56Q10 45 25 47H39Q54 45 60 56V64'} fill="#79a4ad" />
        <ellipse cx="32" cy="26" rx="19" ry="22" fill="#f1cfab" />
        <path d={response.pose === 'tense' ? 'M20 20l7-3M37 17l7 3' : 'M20 18h7M37 18h7'} stroke="#504a47" strokeWidth="2" fill="none" />
        <circle cx="24" cy="25" r="2" fill="#504a47" /><circle cx="40" cy="25" r="2" fill="#504a47" />
        <path d={response.pose === 'tense' ? 'M25 38Q32 31 39 38' : 'M25 34Q32 42 39 34'} stroke="#80594e" strokeWidth="2" fill="none" />
      </svg><div><strong>{response.expression}</strong><q>{response.dialogue}</q></div>
    </div> : null}
    {!compact ? <strong>{task.simulation.discharged ? 'Room available' : `Condition: ${task.simulation.condition}`}</strong> : null}
    <p>{observation.symptoms}</p>
    {hideVitals ? <p className="tycoon-remote-hint">Read vitals at the bedside. Install a Vitals Monitor for live ward-board trends.</p> : <>
    {remote && task.simulation.workflow === 'bedside' ? <strong className="tycoon-telemetry">Live telemetry · {task.simulation.condition === 'worsening' ? 'Worsening ↓' : task.simulation.condition === 'improving' ? 'Improving ↑' : task.simulation.condition}</strong> : null}
    <dl>
      <div><dt>Pulse</dt><dd>{observation.pulse} bpm</dd></div>
      <div><dt>Respirations</dt><dd>{observation.respiration}/min</dd></div>
      <div><dt>SpO₂</dt><dd>{observation.oxygen}%</dd></div>
      <div><dt>BP</dt><dd>{observation.pressure}</dd></div>
    </dl>
    </>}
    {task.simulation.scannerUsed ? <p>Scanner: patient and medication verification recorded.</p> : null}
    {!compact ? <small>Fictional training case · <a href={tycoonScenarios[task.simulation.scenario].source} target="_blank" rel="noreferrer">Background reading</a></small> : null}
  </section>
}

export function PatientDecision({ task, phase, onContinue }: { task: TycoonTask; phase: 'care' | 'reassessment'; onContinue?: () => void }) {
  const tycoon = useStudySystemStore((state) => state.tycoon)
  const decide = useStudySystemStore((state) => state.decideTycoonCare)
  const sim = task.simulation
  if (!sim) return null
  const choices = phase === 'care' ? tycoonScenarios[sim.scenario].choices : [
    { id: 'improved', label: 'Findings improved: continue the agreed plan and document' },
    { id: 'escalate', label: 'Findings remain concerning: escalate and obtain further review' },
  ]
  const finished = Boolean(phase === 'care' ? sim.intervention : sim.reassessment)
  const last = tycoon.activeShift?.events.find((event) => event.taskId === task.id && ['Care decision', 'Reassessment recorded', 'Decision needs review'].includes(event.title))
  return <div className="tycoon-decision">
    <h3>{phase === 'care' ? 'Choose the care response' : 'Interpret the patient response'}</h3>
    <div>{choices.map((choice) => <button type="button" key={choice.id} disabled={finished || sim.attempted.includes(`${phase}:${choice.id}`)} onClick={() => {
      if (tycoon.activeShift) decide(task.id, choice.id, phase, tycoon.activeShift.id)
    }}>{choice.label}</button>)}</div>
    {last ? <p role="status">{last.message}{last.type === 'penalty' ? ' −$25 · −4 safety. Review the findings and try another response.' : ''}</p> : null}
    {finished && phase === 'reassessment' ? <button type="button" className="tycoon-modal-primary" onClick={onContinue}>Continue to documentation</button> : null}
  </div>
}

export function ShiftObjectives({ tycoon }: { tycoon: TycoonGameState }) {
  const shift = tycoon.activeShift, sim = shift?.simulation
  if (!shift || !sim) return null
  const discharged = [...sim.archived, ...shift.tasks].filter((task) => task.simulation?.discharged).length
  return <div className="tycoon-shift-objectives" aria-label="Shift objectives">
    <span>Shift {sim.sequence} · {Math.max(0, Math.ceil(sim.duration - shift.shiftMinute))} min left</span>
    {shift.loop ? <strong>{shiftPhase(shift)}</strong> : null}
    <strong>{discharged}/{sim.goal} patients discharged · Safety goal 80%</strong>
    <span>{sim.admissionLimit - sim.admitted} admissions waiting · Goal bonus $150</span>
  </div>
}

export function CallBellBoard({ tycoon, onVisit }: { tycoon: TycoonGameState; onVisit: (task: TycoonTask) => void }) {
  const respond = useStudySystemStore((state) => state.respondToTycoonCall)
  const shift = tycoon.activeShift
  if (!shift?.loop || shift.status !== 'running') return null
  const calls = shift.loop.calls.filter((call) => openCall(call) || call.status === 'missed' && shift.tasks.some((task) => task.id === call.taskId && !task.simulation?.discharged)).sort((a, b) => Number(b.kind === 'change') - Number(a.kind === 'change'))
  const urgent = calls.filter((call) => call.kind === 'change').length
  return <details className="tycoon-call-board">
    <summary><span role="status">Call bells · {urgent ? `${urgent} RN review` : calls.length ? `${calls.length} comfort request` : 'All quiet'}</span></summary>
    <div>{calls.length ? calls.map((call) => {
      const task = shift.tasks.find((task) => task.id === call.taskId)!
      const staffBusy = shift.loop!.calls.filter((item) => item.status === 'assigned').length >= (tycoon.upgrades['staff-training'] ?? 0)
      return <section key={call.id} aria-label={`${task.room} ${call.kind} call`}>
        <strong>{task.room} · {call.kind === 'change' ? 'Changed symptoms · RN' : 'Comfort request'}</strong>
        <p>{call.message}</p>
        <small>{call.status === 'assigned' ? 'Support staff assigned · report-back pending' : call.status === 'missed' ? 'Response overdue' : `${Math.max(0, Math.ceil(call.dueMinute - shift.shiftMinute))} min to respond`}</small>
        {call.status !== 'assigned' ? <div>
          <button type="button" onClick={() => onVisit(task)}>Visit {task.room}</button>
          {call.kind === 'comfort' ? <button type="button" disabled={staffBusy} onClick={() => respond(call.id, 'delegate', shift.id)}>{!tycoon.upgrades['staff-training'] ? 'Support staff not hired' : staffBusy ? 'Staff busy' : 'Delegate comfort request'}</button> : <small>Clinical review stays with the RN.</small>}
          <button type="button" disabled={call.deferred} onClick={() => respond(call.id, 'defer', shift.id)}>{call.deferred ? 'Deferred · deadline unchanged' : 'Finish current care first'}</button>
        </div> : null}
      </section>
    }) : <p>No unanswered calls. Continue your patient rounds.</p>}</div>
  </details>
}

export function PatientCall({ call, onAttend }: { call: TycoonCall; onAttend: () => void }) {
  return <div className="tycoon-care-check tycoon-call-action">
    <p>{call.message}</p><small>{call.kind === 'change' ? 'Changed symptoms · Clinical review required' : 'Comfort request · Clinical care continues separately'}</small>
    <button type="button" className="tycoon-modal-primary" onClick={onAttend}>{call.kind === 'change' ? 'Review patient' : 'Provide comfort'}</button>
  </div>
}
