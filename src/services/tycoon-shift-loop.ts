import type { TycoonCall, TycoonGameState, TycoonShift, TycoonTask } from '../app/types'
import { patientObservation, tycoonScenarios } from '../data/tycoon-scenarios'
import { STATION_POSITION } from '../game/tycoon-ward-layout'

export const openCall = (call: TycoonCall) => call.status === 'ringing' || call.status === 'assigned'
export function shiftPhase(shift: TycoonShift): string {
  if (shift.status === 'finished') return 'Shift review'
  const completed = [...(shift.simulation?.archived ?? []), ...shift.tasks].filter((task) => task.status === 'completed').length
  if (completed >= (shift.simulation?.goal ?? 3) && !shift.loop?.calls.some(openCall)) return 'Handoff ready'
  return shift.loop?.complicationRaised ? 'Respond & recover' : 'Opening rounds'
}

/** Clock-driven call generation and penalties; physical job completion is validated separately. */
export function advanceShiftLoop(state: TycoonGameState): TycoonGameState {
  const shift = state.activeShift
  if (!shift?.loop || shift.status !== 'running') return state
  const loop = { ...shift.loop, calls: [...shift.loop.calls] }
  let tasks = shift.tasks, safety = state.patientSafety, reputation = state.reputation
  const events = [...shift.events]
  const emit = (id: string, title: string, message: string, taskId: string, type: 'shift' | 'penalty' = 'shift') => events.unshift({ id: `${shift.id}:${id}`, minute: shift.shiftMinute, type, title, message, taskId })
  const eligible = tasks.filter((task) => task.simulation && task.status !== 'completed' && task.status !== 'failed' && !task.simulation.reassessment)
  if (!loop.comfortRaised && (shift.shiftMinute >= 1 || tasks.some((task) => task.careProgress?.steps.includes('assessment')))) {
    const task = eligible.find((task) => !task.careProgress) ?? eligible[0]
    loop.comfortRaised = true
    if (task) {
      const call: TycoonCall = { id: `${shift.id}:comfort`, taskId: task.id, kind: 'comfort', message: 'Please adjust the room light and move my belongings within reach.', raisedMinute: shift.shiftMinute, dueMinute: shift.shiftMinute + 5, status: 'ringing' }
      loop.calls.push(call)
      emit('comfort-raised', 'Call bell · comfort request', `${task.room}: ${call.message} Support staff may help; clinical care still needs the RN.`, task.id)
    }
  }
  if (!loop.complicationRaised && (shift.shiftMinute >= 3 || tasks.some((task) => task.status === 'completed'))) {
    loop.complicationRaised = true
    const task = [...eligible].sort((a, b) => a.deadlineMinute - b.deadlineMinute)[0]
    if (task) {
      const call: TycoonCall = { id: `${shift.id}:change`, taskId: task.id, kind: 'change', message: 'My symptoms are getting worse. Could you check on me now?', raisedMinute: shift.shiftMinute, dueMinute: shift.shiftMinute + 3, status: 'ringing' }
      loop.calls.push(call)
      tasks = tasks.map((item) => item.id === task.id ? { ...item, status: 'deteriorating', simulation: { ...item.simulation!, condition: 'worsening' } } : item)
      emit('change-raised', 'Call bell · changed symptoms', `${task.room}: ${call.message} RN review needed; comfort work can wait.`, task.id)
    }
  }
  loop.calls = loop.calls.map((call) => {
    if (!shift.loop?.physicalInteractions && call.status === 'assigned' && shift.shiftMinute >= call.assignedUntil!) {
      emit(`${call.id}:staff-done`, 'Support request completed', 'Support staff adjusted the room and reported completion. Clinical assessment remains with the RN.', call.taskId)
      return { ...call, status: 'answered', answeredBy: 'staff' }
    }
    if (call.status !== 'ringing' || shift.shiftMinute <= call.dueMinute) return call
    if (call.kind === 'change') safety = Math.max(0, safety - 5)
    else reputation = Math.max(0, reputation - 1)
    emit(`${call.id}:missed`, 'Call response delayed', call.kind === 'change' ? 'The changed-symptom call exceeded its response window. −5 safety; reassess the patient.' : 'The comfort request waited too long. −1 reputation; clinical priorities still come first.', call.taskId, 'penalty')
    return { ...call, status: 'missed' }
  })
  if (events.length === shift.events.length && loop.comfortRaised === shift.loop.comfortRaised && loop.complicationRaised === shift.loop.complicationRaised) return state
  return { ...state, patientSafety: safety, reputation, activeShift: { ...shift, tasks, events, loop } }
}

export function respondToCall(state: TycoonGameState, callId: string, response: 'attend' | 'delegate' | 'defer', shiftId: string): TycoonGameState {
  const shift = state.activeShift, call = shift?.loop?.calls.find((item) => item.id === callId)
  if (!shift?.loop || shift.id !== shiftId || shift.status !== 'running' || !call || !['ringing', 'missed'].includes(call.status)) return state
  const task = shift.tasks.find((task) => task.id === call.taskId)
  if (!task || task.simulation?.discharged) return state
  const staff = state.upgrades['staff-training'] ?? 0
  if (response === 'delegate' && (call.kind !== 'comfort' || !staff || shift.loop.calls.filter((item) => item.status === 'assigned').length >= staff)) return state
  if (response === 'defer' && call.deferred) return state
  const updated: TycoonCall = response === 'defer' ? { ...call, deferred: true } : response === 'delegate' ? { ...call, status: 'assigned', assignedUntil: shift.shiftMinute + 0.5 } : { ...call, status: 'answered', answeredBy: 'player' }
  const message = response === 'delegate' ? shift.loop.physicalInteractions ? 'Support staff assigned: walk to the room, provide comfort, then return to report.' : 'Comfort request assigned to support staff; report-back due in half a game minute.' : response === 'defer' ? 'Request deferred while you prioritize other care. Its response deadline is unchanged.' : call.kind === 'change' ? 'RN attended the changed-symptom call. Continue focused care and reassessment.' : 'Room lighting and belongings adjusted. The patient thanks you.'
  return { ...state, activeShift: { ...shift,
    worldJobs: response === 'delegate' && shift.loop.physicalInteractions ? [...(shift.worldJobs ?? []), { id: `${call.id}:support`, taskId: task.id, callId, kind: 'support', phase: 'to-patient', anchor: { ...STATION_POSITION } }] : shift.worldJobs,
    loop: { ...shift.loop, calls: shift.loop.calls.map((item) => item.id === callId ? updated : item) }, events: [{ id: `${call.id}:${response}`, minute: shift.shiftMinute, type: 'shift', title: 'Call response', message, taskId: task.id }, ...shift.events] } }
}

export function patientResponse(task: Pick<TycoonTask, 'simulation' | 'status' | 'careProgress'>) {
  const sim = task.simulation
  if (!sim) return { expression: 'Observing', dialogue: 'Could you check on me?', pose: 'resting' }
  if (sim.discharged) return { expression: 'Room available', dialogue: 'Ready for the next admission', pose: 'resting' }
  if (sim.condition === 'worsening') return { expression: 'Distressed', dialogue: sim.scenario === 'chest' ? 'It is harder to catch my breath.' : sim.scenario === 'medication' ? 'I feel more dizzy and weak.' : 'I still feel too dizzy to stand.', pose: 'tense' }
  if (sim.condition === 'stable') return { expression: 'Relieved', dialogue: 'I understand the plan. Thank you.', pose: 'relaxed' }
  if (sim.condition === 'improving') return { expression: 'Settling', dialogue: sim.scenario === 'falls' ? 'I feel better resting. I will call for help.' : 'I feel a little better. Please check again.', pose: 'relaxed' }
  return { expression: 'Concerned', dialogue: sim.scenario === 'chest' ? 'My chest feels tight.' : sim.scenario === 'medication' ? 'I feel nauseated and lightheaded.' : 'I feel dizzy when I get up.', pose: 'tense' }
}

export function careNoteDraft(task: TycoonTask): string {
  if (!task.simulation) return ''
  const definition = tycoonScenarios[task.simulation.scenario], observation = patientObservation(task)!
  const intervention = definition.choices.find((choice) => choice.id === task.simulation?.intervention)
  return `${task.patientName} · ${task.room}\nAssessment: ${task.careProgress?.steps.includes('assessment') ? 'Identity, focused observations, and bedside safety reviewed.' : 'Not yet completed.'}\nCare: ${task.careProgress?.steps.includes('care') ? intervention?.label ?? 'Recorded in care plan.' : 'Not yet completed.'}\nReassessment: ${task.simulation.reassessment ? observation.symptoms : 'Not yet completed.'}\nLatest observations: pulse ${observation.pulse}, respirations ${observation.respiration}, SpO₂ ${observation.oxygen}%, BP ${observation.pressure}.\nFollow-up: ${task.simulation.reassessment ? 'Continue the agreed plan and clinical handoff.' : 'Complete care and reassessment before handoff.'}`
}
