import type { TycoonTask } from '../app/types'

type ScenarioId = NonNullable<TycoonTask['simulation']>['scenario']
export type Observation = { pulse: number; respiration: number; oxygen: number; pressure: string; symptoms: string }
type Scenario = {
  title: string; category: TycoonTask['category']; urgency: TycoonTask['safetyRisk']; window: number
  observations: Record<NonNullable<TycoonTask['simulation']>['condition'], Observation>
  intervention: string; choices: { id: string; label: string; feedback: string }[]
  source: string
}
// Authored game cases: numbers and response timelines are fictional, not clinical protocols.
export const tycoonScenarios: Record<ScenarioId, Scenario> = {
  chest: {
    title: 'Chest tightness with breathlessness', category: 'prioritization', urgency: 'critical', window: 7,
    observations: {
      concerning: { pulse: 112, respiration: 26, oxygen: 92, pressure: '148/88', symptoms: 'New chest tightness, shortness of breath, and sweating.' },
      worsening: { pulse: 124, respiration: 30, oxygen: 89, pressure: '98/62', symptoms: 'Persistent chest tightness; breathing and circulation are worsening.' },
      improving: { pulse: 98, respiration: 22, oxygen: 95, pressure: '122/76', symptoms: 'After the simulated team response, breathing is easier. Continued monitoring is needed.' },
      stable: { pulse: 86, respiration: 18, oxygen: 97, pressure: '120/74', symptoms: 'The simulated clinical team has accepted handoff and arranged the appropriate onward care.' },
    },
    intervention: 'urgent-help',
    choices: [
      { id: 'routine-round', label: 'Finish routine rounds before requesting help', feedback: 'New chest symptoms with breathlessness require urgent attention; routine work can wait.' },
      { id: 'urgent-help', label: 'Stay with the patient and activate urgent clinical help', feedback: 'Urgent help requested with focused findings. The simulated team begins its response.' },
      { id: 'walk-it-off', label: 'Ask the patient to walk again to check tolerance', feedback: 'Further exertion is inappropriate while chest symptoms and breathlessness remain unresolved.' },
    ], source: 'https://www.nhs.uk/symptoms/chest-pain/',
  },
  medication: {
    title: 'Digoxin due with a slow pulse', category: 'medication-check', urgency: 'urgent', window: 12,
    observations: {
      concerning: { pulse: 48, respiration: 18, oxygen: 97, pressure: '106/64', symptoms: 'Nausea and lightheadedness before the scheduled medication. The order requires review of a low pulse before administration.' },
      worsening: { pulse: 42, respiration: 22, oxygen: 95, pressure: '90/56', symptoms: 'Increasing dizziness and weakness; urgent clinical review is needed.' },
      improving: { pulse: 58, respiration: 18, oxygen: 97, pressure: '112/70', symptoms: 'After simulated clinician review, nausea is easing. The medication plan has been clarified.' },
      stable: { pulse: 66, respiration: 16, oxygen: 98, pressure: '118/72', symptoms: 'Follow-up observations reviewed; the simulated team has confirmed the ongoing medication and monitoring plan.' },
    },
    intervention: 'verify-order',
    choices: [
      { id: 'give-now', label: 'Give the scheduled medication without clarifying the low pulse', feedback: 'The concerning pulse and symptoms need assessment and order clarification before proceeding.' },
      { id: 'double-dose', label: 'Give an extra dose to correct the symptoms', feedback: 'Do not change a medication dose independently. Report the symptoms and verify the plan.' },
      { id: 'verify-order', label: 'Pause administration, verify findings and order, and contact the clinician', feedback: 'The low pulse and symptoms have been escalated for a verified medication plan.' },
    ], source: 'https://medlineplus.gov/druginfo/meds/a682301.html',
  },
  falls: {
    title: 'Dizziness when standing', category: 'vitals', urgency: 'watch', window: 18,
    observations: {
      concerning: { pulse: 96, respiration: 18, oxygen: 98, pressure: '102/66', symptoms: 'The patient feels dizzy on standing and asks to walk to the bathroom alone.' },
      worsening: { pulse: 110, respiration: 22, oxygen: 97, pressure: '90/58', symptoms: 'Dizziness has increased. Unassisted mobility remains unsafe.' },
      improving: { pulse: 84, respiration: 16, oxygen: 98, pressure: '114/72', symptoms: 'Dizziness eased at rest after assistance and simulated clinical review; mobility still requires support.' },
      stable: { pulse: 80, respiration: 16, oxygen: 98, pressure: '118/74', symptoms: 'The patient explains how to call for help; the team has reviewed the assisted mobility and follow-up plan.' },
    },
    intervention: 'assist-mobility',
    choices: [
      { id: 'assist-mobility', label: 'Assist to safety, assess the dizziness, and arrange a supported mobility plan', feedback: 'Fall precautions and clinical review address the current symptoms and mobility risk.' },
      { id: 'walk-alone', label: 'Let the patient walk alone to build confidence', feedback: 'Active dizziness makes unsupported mobility unsafe.' },
      { id: 'ignore-call', label: 'Leave the call bell out of reach until the next round', feedback: 'The patient needs an accessible way to request assistance.' },
    ], source: 'https://www.cdc.gov/falls/prevention/index.html',
  },
}

const scenarioIds: ScenarioId[] = ['chest', 'medication', 'falls']
const names = ['M. Carter', 'A. Nguyen', 'R. Alvarez', 'J. Brooks', 'L. Patel', 'S. Williams', 'D. Morgan', 'K. Rivera']
export function createScenarioTask(shiftId: string, sequence: number, admission: number, room: string, minute: number): TycoonTask {
  const scenario = scenarioIds[(admission + sequence - 1) % scenarioIds.length]
  const definition = tycoonScenarios[scenario]
  const variant = (sequence + admission) % 2
  return {
    id: `${shiftId}-admission-${admission}`, patientId: `${shiftId}-patient-${admission}`,
    patientName: names[(admission + sequence - 1) % names.length], room,
    title: definition.title, category: definition.category, safetyRisk: definition.urgency, status: 'available',
    rewardMoney: scenario === 'medication' ? 160 : 120, rewardXp: 45, rewardReputation: 2, rewardSafety: 3,
    timeCost: 3, deadlineMinute: minute + definition.window, correctActionId: 'focused-assessment',
    unsafePenalty: { money: 35, reputation: 2, patientSafety: 6 },
    actions: [
      { id: 'routine-first', label: 'Finish routine paperwork first', description: 'Return to the patient after charting other work.', scope: 'RN-only', feedback: '', clinicalReason: 'Assess a new change before routine paperwork.' },
      { id: 'focused-assessment', label: 'Assess the patient and review current observations', description: 'Confirm identity, ask about symptoms, and interpret the focused findings.', scope: 'RN-only', feedback: 'Assessment, care, reassessment, and documentation completed.', clinicalReason: 'A focused assessment guides the next decision.', energyCost: 10 },
      { id: 'assume-stable', label: 'Assume the previous assessment still applies', description: 'Skip reassessment and continue the old plan.', scope: 'RN-only', feedback: '', clinicalReason: 'New symptoms require a fresh assessment.' },
    ],
    mapPosition: { x: 20, y: 30 },
    simulation: { scenario, variant, admittedMinute: minute, condition: 'concerning', attempted: [] },
  }
}

export function patientObservation(task: Pick<TycoonTask, 'simulation'>): Observation | null {
  if (!task.simulation) return null
  const data = tycoonScenarios[task.simulation.scenario].observations[task.simulation.condition]
  return { ...data, pulse: data.pulse + task.simulation.variant * 2 }
}
