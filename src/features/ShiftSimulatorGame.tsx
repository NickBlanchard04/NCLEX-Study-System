import { AnimatePresence, motion } from 'framer-motion'
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  FileText,
  HeartPulse,
  ListChecks,
  PhoneCall,
  Play,
  Radio,
  ShieldAlert,
  Sparkles,
  Stethoscope,
  Target,
  UserCheck,
  Users,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { clsx } from 'clsx'
import type React from 'react'
import { Shift3DEngine } from '../game/shift3d-engine'

type PatientStatus = 'stable' | 'watch' | 'urgent' | 'critical'
type ActionCategory = 'assessment' | 'intervention' | 'delegation' | 'escalation' | 'documentation'
type NpcRole = 'uap' | 'rt' | 'provider' | 'charge'

interface ShiftPatient {
  id: string
  room: string
  name: string
  age: number
  diagnosis: string
  risk: PatientStatus
  chiefConcern: string
  vitals: {
    bp: string
    hr: number
    rr: number
    spo2: number
    temp: number
    pain: number
    glucose?: number
  }
  labs: Array<{ label: string; value: string; flag?: 'normal' | 'abnormal' | 'critical' }>
  orders: string[]
  priorityFrame: string
  correctActions: string[]
  unsafeActions: string[]
}

interface ShiftAction {
  id: string
  label: string
  category: ActionCategory
  minutes: number
  scope: 'rn' | 'uap' | 'provider'
  description: string
}

interface ShiftEvent {
  id: string
  patientId: string
  time: number
  deadline: number
  title: string
  message: string
  requiredActions: string[]
  impact: string
}

interface LogEntry {
  id: string
  time: number
  tone: 'safe' | 'warn' | 'danger' | 'info'
  text: string
}

interface MissionCard {
  id: string
  title: string
  description: string
  reward: string
  complete: boolean
}

interface DelegationAssignment {
  id: string
  role: NpcRole
  patientId: string
  actionId: string
  startedAt: number
  safe: boolean
}

const shiftStart = 7 * 60
const shiftEnd = 19 * 60

const patients: ShiftPatient[] = [
  {
    id: 'p1',
    room: '402A',
    name: 'Mara Ellis',
    age: 67,
    diagnosis: 'Post-op day 1 total hip replacement',
    risk: 'watch',
    chiefConcern: 'New dizziness when standing, pain 7/10, dressing intact.',
    vitals: { bp: '98/58', hr: 112, rr: 20, spo2: 95, temp: 99.1, pain: 7 },
    labs: [
      { label: 'Hgb', value: '8.4 g/dL', flag: 'abnormal' },
      { label: 'WBC', value: '11.2', flag: 'abnormal' },
      { label: 'K+', value: '4.1', flag: 'normal' },
    ],
    orders: ['Fall precautions', 'Assess dressing q4h', 'Ambulate with assistance'],
    priorityFrame: 'Post-op dizziness plus low BP means fall risk and possible bleeding need assessment before routine comfort tasks.',
    correctActions: ['focused-assessment', 'vitals', 'fall-precautions', 'notify-provider', 'document'],
    unsafeActions: ['delegate-assessment', 'delay-care'],
  },
  {
    id: 'p2',
    room: '404B',
    name: 'Theo Grant',
    age: 54,
    diagnosis: 'Type 1 diabetes, pneumonia',
    risk: 'urgent',
    chiefConcern: 'Diaphoretic and confused after breakfast tray was delayed.',
    vitals: { bp: '124/72', hr: 118, rr: 22, spo2: 93, temp: 100.8, pain: 1, glucose: 48 },
    labs: [
      { label: 'Glucose', value: '48 mg/dL', flag: 'critical' },
      { label: 'WBC', value: '15.8', flag: 'abnormal' },
      { label: 'Lactate', value: '1.9', flag: 'normal' },
    ],
    orders: ['Hypoglycemia protocol', 'Antibiotics due 0900', 'Blood glucose AC/HS'],
    priorityFrame: 'Low glucose with neuro changes is immediate. Treat first if safe, then reassess and document the response.',
    correctActions: ['focused-assessment', 'glucose-protocol', 'reassess', 'document'],
    unsafeActions: ['delegate-assessment', 'delay-care'],
  },
  {
    id: 'p3',
    room: '407A',
    name: 'Lina Torres',
    age: 29,
    diagnosis: 'Postpartum 6 hours, vaginal delivery',
    risk: 'urgent',
    chiefConcern: 'Reports soaking a pad in 15 minutes and feeling weak.',
    vitals: { bp: '92/54', hr: 124, rr: 24, spo2: 97, temp: 98.7, pain: 5 },
    labs: [
      { label: 'Hgb', value: '9.1 g/dL', flag: 'abnormal' },
      { label: 'Platelets', value: '188k', flag: 'normal' },
      { label: 'Fundus', value: 'boggy', flag: 'critical' },
    ],
    orders: ['Fundal checks', 'Oxytocin per protocol', 'Quantify blood loss'],
    priorityFrame: 'Postpartum bleeding with tachycardia and hypotension suggests hemorrhage until proven otherwise.',
    correctActions: ['focused-assessment', 'hemorrhage-protocol', 'notify-provider', 'document'],
    unsafeActions: ['delegate-assessment', 'delay-care'],
  },
  {
    id: 'p4',
    room: '410C',
    name: 'Evan Reed',
    age: 4,
    diagnosis: 'Asthma exacerbation',
    risk: 'critical',
    chiefConcern: 'Retractions, wheezing, anxious parent at bedside.',
    vitals: { bp: '100/62', hr: 142, rr: 36, spo2: 88, temp: 99.5, pain: 0 },
    labs: [
      { label: 'SpO2', value: '88%', flag: 'critical' },
      { label: 'Peak flow', value: 'Red zone', flag: 'critical' },
      { label: 'CO2', value: 'Rising', flag: 'abnormal' },
    ],
    orders: ['Oxygen per protocol', 'Nebulizer treatment', 'Notify provider for distress'],
    priorityFrame: 'Airway and breathing beat everything. Support oxygenation and escalate before routine tasks.',
    correctActions: ['focused-assessment', 'oxygen', 'respiratory-therapy', 'notify-provider', 'reassess', 'document'],
    unsafeActions: ['delay-care'],
  },
  {
    id: 'p5',
    room: '412B',
    name: 'Ruth Chen',
    age: 78,
    diagnosis: 'Heart failure exacerbation',
    risk: 'watch',
    chiefConcern: 'Crackles, 2+ edema, asking for help to bathroom.',
    vitals: { bp: '148/86', hr: 96, rr: 24, spo2: 91, temp: 98.4, pain: 2 },
    labs: [
      { label: 'BNP', value: '980 pg/mL', flag: 'abnormal' },
      { label: 'K+', value: '3.3', flag: 'abnormal' },
      { label: 'Creatinine', value: '1.4', flag: 'abnormal' },
    ],
    orders: ['Strict I&O', 'Daily weight', 'Diuretic due 1000', 'Low sodium diet'],
    priorityFrame: 'Volume overload matters, but this patient is less immediately unstable than airway, hemorrhage, or glucose emergencies.',
    correctActions: ['delegate-vitals', 'focused-assessment', 'give-scheduled-med', 'document'],
    unsafeActions: ['ignore-labs'],
  },
]

const actions: ShiftAction[] = [
  {
    id: 'focused-assessment',
    label: 'Focused RN assessment',
    category: 'assessment',
    minutes: 18,
    scope: 'rn',
    description: 'Assess the unstable cue directly: airway, perfusion, bleeding, neuro status, pain, or safety.',
  },
  {
    id: 'vitals',
    label: 'Obtain full vitals',
    category: 'assessment',
    minutes: 10,
    scope: 'uap',
    description: 'Collect objective data. Appropriate to delegate if the patient is stable enough and RN interprets results.',
  },
  {
    id: 'glucose-protocol',
    label: 'Start hypoglycemia protocol',
    category: 'intervention',
    minutes: 12,
    scope: 'rn',
    description: 'Treat low blood glucose based on LOC and swallowing safety, then reassess.',
  },
  {
    id: 'hemorrhage-protocol',
    label: 'Initiate hemorrhage protocol',
    category: 'intervention',
    minutes: 16,
    scope: 'rn',
    description: 'Fundal massage, quantify blood loss, medication per protocol, help to bedside, and escalation.',
  },
  {
    id: 'oxygen',
    label: 'Apply oxygen / position upright',
    category: 'intervention',
    minutes: 8,
    scope: 'rn',
    description: 'Support oxygenation immediately while preparing additional respiratory interventions.',
  },
  {
    id: 'respiratory-therapy',
    label: 'Call respiratory therapy',
    category: 'escalation',
    minutes: 6,
    scope: 'provider',
    description: 'Escalate respiratory compromise and coordinate treatment quickly.',
  },
  {
    id: 'notify-provider',
    label: 'Notify provider / rapid response',
    category: 'escalation',
    minutes: 8,
    scope: 'provider',
    description: 'Escalate unstable trends using concise SBAR.',
  },
  {
    id: 'delegate-vitals',
    label: 'Delegate routine vitals to UAP',
    category: 'delegation',
    minutes: 4,
    scope: 'uap',
    description: 'Appropriate for stable patients when RN retains interpretation and follow-up.',
  },
  {
    id: 'fall-precautions',
    label: 'Activate fall precautions',
    category: 'intervention',
    minutes: 7,
    scope: 'rn',
    description: 'Reduce immediate injury risk for hypotension, dizziness, post-op weakness, or confusion.',
  },
  {
    id: 'give-scheduled-med',
    label: 'Give scheduled medication',
    category: 'intervention',
    minutes: 12,
    scope: 'rn',
    description: 'Complete ordered therapy after checking labs, vitals, and contraindications.',
  },
  {
    id: 'reassess',
    label: 'Reassess response',
    category: 'assessment',
    minutes: 10,
    scope: 'rn',
    description: 'Close the clinical loop after an intervention.',
  },
  {
    id: 'document',
    label: 'Document outcome',
    category: 'documentation',
    minutes: 8,
    scope: 'rn',
    description: 'Chart cues, actions, patient response, notifications, and follow-up.',
  },
  {
    id: 'delegate-assessment',
    label: 'Ask UAP to assess the problem',
    category: 'delegation',
    minutes: 4,
    scope: 'uap',
    description: 'Unsafe delegation: assessment and clinical judgment belong to the RN.',
  },
  {
    id: 'delay-care',
    label: 'Delay and continue rounds',
    category: 'documentation',
    minutes: 30,
    scope: 'rn',
    description: 'A tempting but unsafe choice when the patient has unstable cues.',
  },
  {
    id: 'ignore-labs',
    label: 'Ignore abnormal labs for now',
    category: 'documentation',
    minutes: 20,
    scope: 'rn',
    description: 'Unsafe because abnormal trends change medication and safety decisions.',
  },
]

const shiftEvents: ShiftEvent[] = [
  {
    id: 'hypoglycemia',
    patientId: 'p2',
    time: 7 * 60 + 20,
    deadline: 8 * 60,
    title: 'Critical glucose alert',
    message: 'Theo is diaphoretic and confused. Glucose resulted at 48 mg/dL.',
    requiredActions: ['focused-assessment', 'glucose-protocol', 'reassess'],
    impact: 'Untreated hypoglycemia can progress to seizure, LOC, and airway compromise.',
  },
  {
    id: 'respiratory-distress',
    patientId: 'p4',
    time: 8 * 60 + 10,
    deadline: 8 * 60 + 45,
    title: 'Pediatric respiratory deterioration',
    message: 'Evan has worsening retractions and SpO2 remains below 90%.',
    requiredActions: ['focused-assessment', 'oxygen', 'respiratory-therapy', 'notify-provider'],
    impact: 'Airway deterioration in a child can become a rapid response situation quickly.',
  },
  {
    id: 'postpartum-bleeding',
    patientId: 'p3',
    time: 9 * 60 + 15,
    deadline: 9 * 60 + 55,
    title: 'Postpartum hemorrhage concern',
    message: 'Lina reports heavy bleeding and weakness. Fundus is boggy.',
    requiredActions: ['focused-assessment', 'hemorrhage-protocol', 'notify-provider'],
    impact: 'Hypovolemia and shock are the danger pattern. This outranks routine care.',
  },
  {
    id: 'fall-risk',
    patientId: 'p1',
    time: 10 * 60 + 5,
    deadline: 11 * 60,
    title: 'Fall risk escalation',
    message: 'Mara tries to get up alone after reporting dizziness.',
    requiredActions: ['focused-assessment', 'fall-precautions'],
    impact: 'Post-op hypotension plus weakness creates immediate injury risk.',
  },
]

const formatTime = (minutes: number) => {
  const hour = Math.floor(minutes / 60)
  const minute = minutes % 60
  const suffix = hour >= 12 ? 'PM' : 'AM'
  const displayHour = hour > 12 ? hour - 12 : hour
  return `${displayHour}:${minute.toString().padStart(2, '0')} ${suffix}`
}

const statusStyles: Record<PatientStatus, string> = {
  stable: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-100',
  watch: 'border-sky-400/30 bg-sky-400/10 text-sky-100',
  urgent: 'border-amber-400/30 bg-amber-400/10 text-amber-100',
  critical: 'border-rose-400/40 bg-rose-400/10 text-rose-100',
}

const categoryIcon: Record<ActionCategory, React.ReactNode> = {
  assessment: <Stethoscope className="h-4 w-4" />,
  intervention: <HeartPulse className="h-4 w-4" />,
  delegation: <Users className="h-4 w-4" />,
  escalation: <PhoneCall className="h-4 w-4" />,
  documentation: <FileText className="h-4 w-4" />,
}

const npcRoster: Record<NpcRole, { label: string; cue: string; color: string }> = {
  uap: {
    label: 'UAP',
    cue: 'Best for routine vitals, transport, I&O, and safety rounds after RN assessment.',
    color: 'text-emerald-200',
  },
  rt: {
    label: 'Respiratory Therapy',
    cue: 'Best when airway or breathing cues need treatment support now.',
    color: 'text-sky-200',
  },
  provider: {
    label: 'Provider',
    cue: 'Best for unstable trends, orders, rapid response, and escalation.',
    color: 'text-violet-200',
  },
  charge: {
    label: 'Charge RN',
    cue: 'Best for getting help, protecting staffing, and coordinating high-risk care.',
    color: 'text-amber-200',
  },
}

const npcOptions: Array<{ role: NpcRole; actionId: string; label: string }> = [
  { role: 'uap', actionId: 'delegate-vitals', label: 'Send UAP for routine vitals' },
  { role: 'rt', actionId: 'respiratory-therapy', label: 'Dispatch respiratory therapy' },
  { role: 'provider', actionId: 'notify-provider', label: 'Page provider / rapid response' },
  { role: 'charge', actionId: 'fall-precautions', label: 'Ask charge RN to coordinate safety' },
]

export function ShiftSimulatorGame() {
  const [phase, setPhase] = useState<'briefing' | 'running' | 'ended'>('briefing')
  const [clock, setClock] = useState(shiftStart)
  const [selectedPatientId, setSelectedPatientId] = useState(patients[3].id)
  const [completedActions, setCompletedActions] = useState<Set<string>>(new Set())
  const [penalizedEvents, setPenalizedEvents] = useState<Set<string>>(new Set())
  const [delegationAssignments, setDelegationAssignments] = useState<DelegationAssignment[]>([])
  const [nearbyPatientId, setNearbyPatientId] = useState<string | null>(null)
  const [log, setLog] = useState<LogEntry[]>([
    {
      id: 'handoff',
      time: shiftStart,
      tone: 'info',
      text: 'Handoff received. Five patients assigned. Highest opening risk: pediatric respiratory distress.',
    },
  ])
  const [score, setScore] = useState({
    safety: 72,
    prioritization: 64,
    delegation: 50,
    documentation: 35,
  })

  const selectedPatient = patients.find((patient) => patient.id === selectedPatientId) ?? patients[0]

  const resolvedEvents = useMemo(
    () =>
      shiftEvents.filter((event) =>
        event.requiredActions.every((actionId) => completedActions.has(`${event.patientId}:${actionId}`)),
      ),
    [completedActions],
  )

  const activeEvents = useMemo(
    () =>
      shiftEvents.filter(
        (event) =>
          clock >= event.time &&
          !resolvedEvents.some((resolved) => resolved.id === event.id) &&
          !penalizedEvents.has(event.id),
      ),
    [clock, penalizedEvents, resolvedEvents],
  )

  const deterioratedEvents = useMemo(
    () => shiftEvents.filter((event) => penalizedEvents.has(event.id)),
    [penalizedEvents],
  )

  const deterioratingPatientIds = useMemo(
    () =>
      Array.from(
        new Set([
          ...activeEvents.map((event) => event.patientId),
          ...deterioratedEvents.map((event) => event.patientId),
        ]),
      ),
    [activeEvents, deterioratedEvents],
  )

  const shiftProgress = Math.min(1, (clock - shiftStart) / (shiftEnd - shiftStart))
  const totalScore = Math.round((score.safety + score.prioritization + score.delegation + score.documentation) / 4)
  const completedPatientIds = patients
    .filter((patient) =>
      patient.correctActions.every((actionId) => completedActions.has(`${patient.id}:${actionId}`)),
    )
    .map((patient) => patient.id)
  const missionCards = useMemo<MissionCard[]>(() => {
    const has = (patientId: string, actionId: string) => completedActions.has(`${patientId}:${actionId}`)
    const resolved = (eventId: string) => resolvedEvents.some((event) => event.id === eventId)
    const noPenalty = (eventId: string) => !penalizedEvents.has(eventId)
    const documentsCompleted = patients.filter((patient) => has(patient.id, 'document')).length
    const safeDelegations = delegationAssignments.filter((item) => item.safe).length
    const unsafeDelegations = delegationAssignments.filter((item) => !item.safe).length

    return [
      {
        id: 'rescue-airway',
        title: 'Airway Rescue',
        description: 'Stabilize Evan with oxygen, respiratory therapy, provider escalation, and reassessment.',
        reward: '+ safety command',
        complete:
          has('p4', 'oxygen') &&
          has('p4', 'respiratory-therapy') &&
          has('p4', 'notify-provider') &&
          has('p4', 'reassess') &&
          noPenalty('respiratory-distress'),
      },
      {
        id: 'reverse-glucose',
        title: 'Reverse Hypoglycemia',
        description: 'Treat Theo before neuro changes escalate, then reassess the response.',
        reward: '+ priority timing',
        complete: resolved('hypoglycemia') && noPenalty('hypoglycemia'),
      },
      {
        id: 'stop-hemorrhage',
        title: 'Stop the Bleed',
        description: 'Recognize postpartum hemorrhage cues and activate the care pathway.',
        reward: '+ OB judgment',
        complete: resolved('postpartum-bleeding') && noPenalty('postpartum-bleeding'),
      },
      {
        id: 'prevent-fall',
        title: 'Prevent a Fall',
        description: 'Protect Mara before dizziness turns into an injury event.',
        reward: '+ safety prevention',
        complete: has('p1', 'fall-precautions') && noPenalty('fall-risk'),
      },
      {
        id: 'delegate-smart',
        title: 'Delegate Without Dumping',
        description: 'Use the team for tasks within scope without assigning RN judgment away.',
        reward: '+ team leadership',
        complete: safeDelegations >= 2 && unsafeDelegations === 0,
      },
      {
        id: 'close-loop',
        title: 'Close the Charting Loop',
        description: 'Document outcomes on at least four patients before end-of-shift handoff.',
        reward: '+ continuity of care',
        complete: documentsCompleted >= 4,
      },
    ]
  }, [completedActions, delegationAssignments, penalizedEvents, resolvedEvents])
  const completedMissions = missionCards.filter((mission) => mission.complete).length
  const addLog = (entry: Omit<LogEntry, 'id' | 'time'>, at = clock) => {
    setLog((current) => [
      {
        ...entry,
        id: crypto.randomUUID(),
        time: at,
      },
      ...current,
    ])
  }

  const adjustScore = (delta: Partial<typeof score>) => {
    setScore((current) => ({
      safety: Math.max(0, Math.min(100, current.safety + (delta.safety ?? 0))),
      prioritization: Math.max(0, Math.min(100, current.prioritization + (delta.prioritization ?? 0))),
      delegation: Math.max(0, Math.min(100, current.delegation + (delta.delegation ?? 0))),
      documentation: Math.max(0, Math.min(100, current.documentation + (delta.documentation ?? 0))),
    }))
  }

  const advanceClock = (minutes: number) => {
    const nextClock = Math.min(shiftEnd, clock + minutes)

    shiftEvents.forEach((event) => {
      const unresolved =
        nextClock > event.deadline &&
        !event.requiredActions.every((actionId) => completedActions.has(`${event.patientId}:${actionId}`)) &&
        !penalizedEvents.has(event.id)

      if (unresolved) {
        setPenalizedEvents((current) => new Set([...current, event.id]))
        adjustScore({ safety: -12, prioritization: -10 })
        const patient = patients.find((item) => item.id === event.patientId)
        addLog(
          {
            tone: 'danger',
            text: `${patient?.name ?? 'Patient'} deteriorated after the escalation window was missed: ${event.impact}`,
          },
          event.deadline,
        )
      }
    })

    setClock(nextClock)
    if (nextClock >= shiftEnd) {
      setPhase('ended')
      addLog({ tone: 'info', text: 'Shift ended. Final report generated.' }, shiftEnd)
    }
  }

  const performAction = (action: ShiftAction) => {
    if (phase !== 'running') return
    const key = `${selectedPatient.id}:${action.id}`
    const alreadyDone = completedActions.has(key)

    if (selectedPatient.unsafeActions.includes(action.id)) {
      adjustScore({ safety: -14, prioritization: -8, delegation: action.category === 'delegation' ? -12 : 0 })
      addLog({
        tone: 'danger',
        text: `${selectedPatient.name}: ${action.label} was unsafe. ${action.description}`,
      })
      advanceClock(action.minutes)
      return
    }

    if (!alreadyDone) {
      setCompletedActions((current) => new Set([...current, key]))
    }

    const isCorrect = selectedPatient.correctActions.includes(action.id)
    if (isCorrect && !alreadyDone) {
      adjustScore({
        safety: action.category === 'intervention' || action.category === 'escalation' ? 7 : 4,
        prioritization: selectedPatient.risk === 'critical' || selectedPatient.risk === 'urgent' ? 6 : 3,
        delegation: action.category === 'delegation' ? 8 : 0,
        documentation: action.category === 'documentation' ? 12 : 0,
      })
      addLog({
        tone: 'safe',
        text: `${selectedPatient.name}: ${action.label}. Good move. ${action.description}`,
      })
    } else if (alreadyDone) {
      adjustScore({ prioritization: -2 })
      addLog({
        tone: 'warn',
        text: `${selectedPatient.name}: repeated ${action.label}. Safe, but time management slipped.`,
      })
    } else {
      adjustScore({ prioritization: -3 })
      addLog({
        tone: 'warn',
        text: `${selectedPatient.name}: ${action.label}. Reasonable in some contexts, but not the highest-value move right now.`,
      })
    }

    const wasResolved = activeEvents.find((event) => event.patientId === selectedPatient.id)
    advanceClock(action.minutes)

    if (
      wasResolved &&
      wasResolved.requiredActions.every((actionId) =>
        actionId === action.id ? true : completedActions.has(`${wasResolved.patientId}:${actionId}`),
      )
    ) {
      adjustScore({ safety: 10, prioritization: 8 })
      addLog({
        tone: 'safe',
        text: `Event resolved: ${wasResolved.title}. You closed the safety loop before the deadline.`,
      })
    }
  }

  const delegateNpc = (role: NpcRole, actionId: string) => {
    if (phase !== 'running') return
    const action = actions.find((item) => item.id === actionId)
    if (!action) return

    const key = `${selectedPatient.id}:${action.id}`
    const alreadyDone = completedActions.has(key)
    const isCorrectForPatient = selectedPatient.correctActions.includes(action.id)
    const isUnsafeForPatient = selectedPatient.unsafeActions.includes(action.id)
    const isWithinScope =
      (role === 'uap' && action.scope === 'uap' && selectedPatient.risk !== 'urgent' && selectedPatient.risk !== 'critical') ||
      (role === 'rt' && action.id === 'respiratory-therapy') ||
      (role === 'provider' && action.id === 'notify-provider') ||
      (role === 'charge' && (action.id === 'fall-precautions' || action.id === 'notify-provider'))
    const safe = isWithinScope && isCorrectForPatient && !isUnsafeForPatient

    setDelegationAssignments((current) => [
      {
        id: crypto.randomUUID(),
        role,
        patientId: selectedPatient.id,
        actionId: action.id,
        startedAt: clock,
        safe,
      },
      ...current,
    ])

    if (safe) {
      if (!alreadyDone) {
        setCompletedActions((current) => new Set([...current, key]))
      }
      adjustScore({
        safety: role === 'uap' ? 3 : 6,
        prioritization: selectedPatient.risk === 'critical' || selectedPatient.risk === 'urgent' ? 7 : 3,
        delegation: 10,
      })
      addLog({
        tone: 'safe',
        text: `${npcRoster[role].label} assigned to ${selectedPatient.name}: ${action.label}. Smart team use within scope.`,
      })
    } else {
      adjustScore({ safety: -10, prioritization: -6, delegation: -14 })
      addLog({
        tone: 'danger',
        text: `${npcRoster[role].label} assignment was unsafe for ${selectedPatient.name}. Delegate tasks, not assessment, interpretation, or rescue judgment.`,
      })
    }

    const activeEvent = activeEvents.find((event) => event.patientId === selectedPatient.id)
    const delegatedMinutes = Math.max(2, Math.round(action.minutes * 0.45))
    advanceClock(delegatedMinutes)

    if (
      safe &&
      activeEvent &&
      activeEvent.requiredActions.every((requiredActionId) =>
        requiredActionId === action.id ? true : completedActions.has(`${activeEvent.patientId}:${requiredActionId}`),
      )
    ) {
      adjustScore({ safety: 8, prioritization: 6, delegation: 4 })
      addLog({
        tone: 'safe',
        text: `Team response helped resolve ${activeEvent.title}. You used support without losing RN accountability.`,
      })
    }
  }

  const resetGame = () => {
    setPhase('briefing')
    setClock(shiftStart)
    setSelectedPatientId(patients[3].id)
    setNearbyPatientId(null)
    setCompletedActions(new Set())
    setPenalizedEvents(new Set())
    setDelegationAssignments([])
    setScore({ safety: 72, prioritization: 64, delegation: 50, documentation: 35 })
    setLog([
      {
        id: 'handoff',
        time: shiftStart,
        tone: 'info',
        text: 'Handoff received. Five patients assigned. Highest opening risk: pediatric respiratory distress.',
      },
    ])
  }

  return (
    <main className="min-h-screen overflow-hidden bg-[#071624] text-slate-100">
      <div className="pointer-events-none fixed inset-0 opacity-70">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_16%_10%,rgba(42,125,225,0.28),transparent_30%),radial-gradient(circle_at_84%_14%,rgba(16,185,129,0.18),transparent_28%),linear-gradient(180deg,#071624_0%,#0b1d31_52%,#07111f_100%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.025)_1px,transparent_1px)] bg-[size:28px_28px]" />
      </div>

      <div className="relative mx-auto flex min-h-screen max-w-[1500px] flex-col p-4 md:p-6">
        <header className="flex flex-col gap-4 rounded-[28px] border border-white/10 bg-white/8 p-4 shadow-[0_24px_80px_rgba(0,0,0,0.28)] backdrop-blur-xl md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <Link
              to="/"
              className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/8 text-slate-200 transition hover:bg-white/12"
              aria-label="Back to NCLEX Study System"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-black tracking-[-0.04em] text-white md:text-4xl">
                Nurse Shift Command
              </h1>
              <p className="mt-1 text-sm text-slate-300">
                A 12-hour clinical judgment strategy game: prioritize, delegate, rescue, document.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <HudStat icon={<Clock3 className="h-4 w-4" />} label="Shift Clock" value={formatTime(clock)} />
            <HudStat icon={<Activity className="h-4 w-4" />} label="Readiness" value={`${totalScore}%`} />
            <HudStat icon={<ShieldAlert className="h-4 w-4" />} label="Active Alerts" value={`${activeEvents.length}`} />
            <HudStat icon={<Target className="h-4 w-4" />} label="Missions" value={`${completedMissions}/${missionCards.length}`} />
          </div>
        </header>

        {phase === 'briefing' ? (
          <section className="grid flex-1 items-center gap-6 py-8 lg:grid-cols-[1.05fr_0.95fr]">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-[32px] border border-white/10 bg-white/8 p-6 shadow-[0_30px_90px_rgba(0,0,0,0.28)] backdrop-blur-xl md:p-8"
            >
              <div className="inline-flex rounded-2xl bg-[#2a7de1] p-4 text-white shadow-[0_18px_44px_rgba(42,125,225,0.34)]">
                <Sparkles className="h-7 w-7" />
              </div>
              <h2 className="mt-7 max-w-3xl text-4xl font-black leading-[0.95] tracking-[-0.06em] text-white md:text-6xl">
                Run the floor. Catch the crash before it happens.
              </h2>
              <p className="mt-5 max-w-2xl text-base leading-8 text-slate-300">
                You are the RN for five patients from 7 AM to 7 PM. Every action costs time. Choose who to see first,
                what to delegate, when to call for help, and when to document. The game scores safety, prioritization,
                delegation, and documentation.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => setPhase('running')}
                  className="inline-flex items-center gap-2 rounded-2xl bg-[#2a7de1] px-5 py-3 text-sm font-black text-white shadow-[0_18px_38px_rgba(42,125,225,0.32)] transition hover:-translate-y-0.5"
                >
                  <Play className="h-4 w-4" />
                  Start 12-hour shift
                </button>
                <button
                  type="button"
                  onClick={resetGame}
                  className="rounded-2xl border border-white/12 bg-white/8 px-5 py-3 text-sm font-bold text-slate-100 transition hover:bg-white/12"
                >
                  Reset briefing
                </button>
              </div>
            </motion.div>

            <div className="grid gap-4">
              {patients.map((patient) => (
                  <PatientRow
                    key={patient.id}
                    patient={patient}
                    selected={patient.id === selectedPatientId}
                    deteriorating={deterioratingPatientIds.includes(patient.id)}
                    deteriorated={deterioratedEvents.some((event) => event.patientId === patient.id)}
                    completed={patient.correctActions.filter((actionId) =>
                      completedActions.has(`${patient.id}:${actionId}`),
                    ).length}
                  onSelect={() => setSelectedPatientId(patient.id)}
                />
              ))}
            </div>
          </section>
        ) : (
          <section className="grid flex-1 gap-5 py-5 xl:grid-cols-[300px_minmax(0,1fr)_360px]">
            <aside className="space-y-4">
              <Panel title="Patient Census" icon={<Users className="h-4 w-4" />}>
                <div className="space-y-3">
                  {patients.map((patient) => (
                    <PatientRow
                      key={patient.id}
                      patient={patient}
                      selected={patient.id === selectedPatientId}
                      deteriorating={deterioratingPatientIds.includes(patient.id)}
                      deteriorated={deterioratedEvents.some((event) => event.patientId === patient.id)}
                      completed={patient.correctActions.filter((actionId) =>
                        completedActions.has(`${patient.id}:${actionId}`),
                      ).length}
                      onSelect={() => setSelectedPatientId(patient.id)}
                    />
                  ))}
                </div>
              </Panel>

              <Panel title="Shift Score" icon={<Activity className="h-4 w-4" />}>
                <ScoreBar label="Safety" value={score.safety} tone="emerald" />
                <ScoreBar label="Prioritization" value={score.prioritization} tone="sky" />
                <ScoreBar label="Delegation" value={score.delegation} tone="amber" />
                <ScoreBar label="Documentation" value={score.documentation} tone="violet" />
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10">
                  <motion.div
                    className="h-full rounded-full bg-gradient-to-r from-[#2a7de1] to-[#10b981]"
                    animate={{ width: `${shiftProgress * 100}%` }}
                  />
                </div>
                <p className="mt-2 text-xs text-slate-400">Shift progress: {Math.round(shiftProgress * 100)}%</p>
              </Panel>

              <Panel title="Mission Board" icon={<ListChecks className="h-4 w-4" />}>
                <div className="space-y-3">
                  {missionCards.map((mission) => (
                    <MissionRow key={mission.id} mission={mission} />
                  ))}
                </div>
              </Panel>
            </aside>

            <section className="space-y-5">
              <Shift3DViewport
                patients={patients}
                selectedPatientId={selectedPatientId}
                activeEventPatientIds={activeEvents.map((event) => event.patientId)}
                deterioratingPatientIds={deterioratingPatientIds}
                completedPatientIds={completedPatientIds}
                delegatedPatientIds={delegationAssignments.slice(0, 6).map((assignment) => assignment.patientId)}
                nearbyPatientId={nearbyPatientId}
                onSelectPatient={setSelectedPatientId}
                onProximityChange={setNearbyPatientId}
              />

              <Panel
                title={`${selectedPatient.room} - ${selectedPatient.name}`}
                icon={<HeartPulse className="h-4 w-4" />}
                right={<span className={clsx('rounded-full border px-3 py-1 text-xs font-black uppercase', statusStyles[selectedPatient.risk])}>{selectedPatient.risk}</span>}
              >
                <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
                  <div>
                    <h2 className="text-3xl font-black tracking-[-0.04em] text-white">
                      {selectedPatient.age} y/o - {selectedPatient.diagnosis}
                    </h2>
                    <p className="mt-3 text-sm leading-7 text-slate-300">{selectedPatient.chiefConcern}</p>
                    <div className="mt-5 rounded-2xl border border-sky-400/20 bg-sky-400/10 p-4">
                      <p className="text-xs font-black uppercase tracking-[0.16em] text-sky-200">Priority Frame</p>
                      <p className="mt-2 text-sm leading-6 text-slate-200">{selectedPatient.priorityFrame}</p>
                    </div>
                    {deterioratingPatientIds.includes(selectedPatient.id) ? (
                      <div className="mt-4 rounded-2xl border border-rose-300/30 bg-rose-500/12 p-4">
                        <p className="text-xs font-black uppercase tracking-[0.16em] text-rose-200">
                          Patient deterioration
                        </p>
                        <p className="mt-2 text-sm leading-6 text-rose-100">
                          This patient is trending unsafe. Prioritize assessment, rescue intervention, escalation, then reassessment.
                        </p>
                      </div>
                    ) : null}
                  </div>
                  <VitalsCard patient={selectedPatient} />
                </div>
              </Panel>

              <div className="grid gap-5 lg:grid-cols-[0.95fr_1.05fr]">
                <Panel title="Labs & Orders" icon={<ClipboardCheck className="h-4 w-4" />}>
                  <div className="grid gap-3">
                    {selectedPatient.labs.map((lab) => (
                      <div key={lab.label} className="flex items-center justify-between rounded-2xl border border-white/8 bg-white/6 px-4 py-3">
                        <span className="text-sm font-bold text-slate-200">{lab.label}</span>
                        <span
                          className={clsx(
                            'text-sm font-black',
                            lab.flag === 'critical'
                              ? 'text-rose-300'
                              : lab.flag === 'abnormal'
                                ? 'text-amber-300'
                                : 'text-emerald-300',
                          )}
                        >
                          {lab.value}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 space-y-2">
                    {selectedPatient.orders.map((order) => (
                      <p key={order} className="rounded-xl bg-white/6 px-3 py-2 text-sm text-slate-300">
                        {order}
                      </p>
                    ))}
                  </div>
                </Panel>

                <Panel title="Action Console" icon={<Stethoscope className="h-4 w-4" />}>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {actions.map((action) => {
                      const completed = completedActions.has(`${selectedPatient.id}:${action.id}`)
                      return (
                        <button
                          key={action.id}
                          type="button"
                          onClick={() => performAction(action)}
                          disabled={phase !== 'running'}
                          className={clsx(
                            'group min-h-[88px] rounded-2xl border p-3 text-left transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50',
                            completed
                              ? 'border-emerald-300/30 bg-emerald-400/10'
                              : 'border-white/10 bg-white/6 hover:border-sky-300/35 hover:bg-sky-400/10',
                          )}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span className="flex items-center gap-2 text-sm font-black text-white">
                              {categoryIcon[action.category]}
                              {action.label}
                            </span>
                            <span className="rounded-full bg-white/8 px-2 py-1 text-[11px] font-bold text-slate-300">
                              {action.minutes}m
                            </span>
                          </div>
                          <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-400">{action.description}</p>
                        </button>
                      )
                    })}
                  </div>
                </Panel>
              </div>
            </section>

            <aside className="space-y-4">
              <Panel title="Team Console" icon={<Radio className="h-4 w-4" />}>
                <div className="mb-4 rounded-2xl border border-white/8 bg-white/6 p-3">
                  <p className="text-sm font-black text-white">Selected: {selectedPatient.room}</p>
                  <p className="mt-1 text-xs leading-5 text-slate-400">
                    Delegate safe tasks to NPC teammates. Bad delegation hurts the shift just like the real floor.
                  </p>
                </div>
                <div className="space-y-3">
                  {npcOptions.map((option) => {
                    const role = npcRoster[option.role]
                    return (
                      <button
                        key={`${option.role}:${option.actionId}`}
                        type="button"
                        onClick={() => delegateNpc(option.role, option.actionId)}
                        disabled={phase !== 'running'}
                        className="w-full rounded-2xl border border-white/10 bg-white/6 p-3 text-left transition hover:-translate-y-0.5 hover:border-sky-300/35 hover:bg-sky-400/10 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <span className="flex items-center gap-2 text-sm font-black text-white">
                            <UserCheck className="h-4 w-4" />
                            {option.label}
                          </span>
                          <span className={clsx('text-[11px] font-black uppercase tracking-[0.12em]', role.color)}>
                            {role.label}
                          </span>
                        </div>
                        <p className="mt-2 text-xs leading-5 text-slate-400">{role.cue}</p>
                      </button>
                    )
                  })}
                </div>
                {delegationAssignments.length ? (
                  <div className="mt-4 space-y-2">
                    {delegationAssignments.slice(0, 3).map((assignment) => {
                      const patient = patients.find((item) => item.id === assignment.patientId)
                      const action = actions.find((item) => item.id === assignment.actionId)
                      return (
                        <div key={assignment.id} className="rounded-2xl border border-white/8 bg-white/6 px-3 py-2">
                          <p className="text-xs font-black text-white">
                            {npcRoster[assignment.role].label} - {patient?.room}
                          </p>
                          <p className={clsx('mt-1 text-xs', assignment.safe ? 'text-emerald-200' : 'text-rose-200')}>
                            {assignment.safe ? 'Safe delegation' : 'Unsafe delegation'}: {action?.label}
                          </p>
                        </div>
                      )
                    })}
                  </div>
                ) : null}
              </Panel>

              <Panel title="Live Event Feed" icon={<AlertTriangle className="h-4 w-4" />}>
                <AnimatePresence>
                  {activeEvents.length ? (
                    activeEvents.map((event) => {
                      const patient = patients.find((item) => item.id === event.patientId)
                      return (
                        <motion.button
                          key={event.id}
                          type="button"
                          onClick={() => setSelectedPatientId(event.patientId)}
                          initial={{ opacity: 0, x: 12 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -12 }}
                          className="mb-3 w-full rounded-2xl border border-rose-300/30 bg-rose-400/10 p-4 text-left"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-sm font-black text-rose-100">{event.title}</p>
                            <span className="rounded-full bg-rose-400/20 px-2 py-1 text-[11px] font-black text-rose-100">
                              by {formatTime(event.deadline)}
                            </span>
                          </div>
                          <p className="mt-2 text-xs font-bold text-rose-200">{patient?.room} - {patient?.name}</p>
                          <p className="mt-2 text-sm leading-6 text-slate-300">{event.message}</p>
                        </motion.button>
                      )
                    })
                  ) : (
                    <p className="rounded-2xl border border-emerald-300/20 bg-emerald-400/10 p-4 text-sm leading-6 text-emerald-100">
                      No unresolved critical events right now. Keep reassessing and closing documentation loops.
                    </p>
                  )}
                </AnimatePresence>
              </Panel>

              <Panel title="Charting Log" icon={<FileText className="h-4 w-4" />}>
                <div className="max-h-[390px] space-y-3 overflow-y-auto pr-1">
                  {log.map((entry) => (
                    <div key={entry.id} className="rounded-2xl border border-white/8 bg-white/6 p-3">
                      <div className="flex items-center justify-between gap-3">
                        <span
                          className={clsx(
                            'text-xs font-black uppercase tracking-[0.14em]',
                            entry.tone === 'safe'
                              ? 'text-emerald-300'
                              : entry.tone === 'danger'
                                ? 'text-rose-300'
                                : entry.tone === 'warn'
                                  ? 'text-amber-300'
                                  : 'text-sky-300',
                          )}
                        >
                          {entry.tone}
                        </span>
                        <span className="text-xs font-bold text-slate-500">{formatTime(entry.time)}</span>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-slate-300">{entry.text}</p>
                    </div>
                  ))}
                </div>
              </Panel>

              <div className="grid gap-3">
                <button
                  type="button"
                  onClick={() => advanceClock(30)}
                  disabled={phase !== 'running'}
                  className="rounded-2xl border border-white/10 bg-white/8 px-4 py-3 text-sm font-black text-white transition hover:bg-white/12 disabled:opacity-50"
                >
                  Advance 30 minutes
                </button>
                <button
                  type="button"
                  onClick={() => setPhase('ended')}
                  disabled={phase !== 'running'}
                  className="rounded-2xl bg-[#2a7de1] px-4 py-3 text-sm font-black text-white transition hover:-translate-y-0.5 disabled:opacity-50"
                >
                  End shift report
                </button>
              </div>
            </aside>
          </section>
        )}

        {phase === 'ended' ? (
          <EndShiftModal totalScore={totalScore} score={score} log={log} missions={missionCards} onRestart={resetGame} />
        ) : null}
      </div>
    </main>
  )
}

function Panel({
  title,
  icon,
  right,
  children,
}: {
  title: string
  icon: React.ReactNode
  right?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section className="rounded-[26px] border border-white/10 bg-white/8 p-4 shadow-[0_24px_80px_rgba(0,0,0,0.18)] backdrop-blur-xl">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-sm font-black uppercase tracking-[0.16em] text-slate-200">
          {icon}
          {title}
        </h2>
        {right}
      </div>
      {children}
    </section>
  )
}

function Shift3DViewport({
  patients,
  selectedPatientId,
  activeEventPatientIds,
  deterioratingPatientIds,
  completedPatientIds,
  delegatedPatientIds,
  nearbyPatientId,
  onSelectPatient,
  onProximityChange,
}: {
  patients: ShiftPatient[]
  selectedPatientId: string
  activeEventPatientIds: string[]
  deterioratingPatientIds: string[]
  completedPatientIds: string[]
  delegatedPatientIds: string[]
  nearbyPatientId: string | null
  onSelectPatient: (patientId: string) => void
  onProximityChange: (patientId: string | null) => void
}) {
  const mountRef = useRef<HTMLDivElement | null>(null)
  const engineRef = useRef<Shift3DEngine | null>(null)
  const patientSceneData = useMemo(
    () =>
      patients.map((patient) => ({
        id: patient.id,
        room: patient.room,
        name: patient.name,
        risk: patient.risk,
      })),
    [patients],
  )
  const nearbyPatient = nearbyPatientId
    ? patients.find((patient) => patient.id === nearbyPatientId) ?? null
    : null

  useEffect(() => {
    if (!mountRef.current || engineRef.current) return
    engineRef.current = new Shift3DEngine({
      mount: mountRef.current,
      patients: patientSceneData,
      selectedPatientId,
      activeEventPatientIds,
      deterioratingPatientIds,
      completedPatientIds,
      delegatedPatientIds,
      onSelectPatient,
      onProximityChange,
    })

    return () => {
      engineRef.current?.dispose()
      engineRef.current = null
    }
    // The 3D engine is intentionally created once. Live state is patched through engine.update below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    engineRef.current?.update({
      selectedPatientId,
      activeEventPatientIds,
      deterioratingPatientIds,
      completedPatientIds,
      delegatedPatientIds,
      onSelectPatient,
      onProximityChange,
    })
  }, [
    activeEventPatientIds,
    completedPatientIds,
    delegatedPatientIds,
    deterioratingPatientIds,
    onProximityChange,
    onSelectPatient,
    selectedPatientId,
  ])

  const setMove = (x: number, z: number) => {
    engineRef.current?.setVirtualDirection(x, z)
  }

  return (
    <section className="relative min-h-[520px] overflow-hidden rounded-[30px] border border-white/10 bg-[#071624] shadow-[0_30px_90px_rgba(0,0,0,0.32)]">
      <div ref={mountRef} className="absolute inset-0" />
      <div className="pointer-events-none absolute inset-x-0 top-0 bg-gradient-to-b from-[#071624]/88 to-transparent p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-sky-300">3D Shift Engine</p>
            <h2 className="mt-1 text-2xl font-black tracking-[-0.04em] text-white">Move through the unit</h2>
            <p className="mt-1 max-w-2xl text-sm text-slate-300">
              Use WASD or arrows. Click a patient room to select. Press E near a bedside to open that chart.
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm text-slate-200 backdrop-blur">
            {nearbyPatient ? (
              <>
                <span className="font-black text-emerald-200">Nearby:</span> {nearbyPatient.room} - {nearbyPatient.name}
              </>
            ) : (
              'Walk near a patient to interact'
            )}
          </div>
        </div>
      </div>

      <div className="absolute bottom-4 left-4 grid grid-cols-3 gap-2 md:hidden">
        <span />
        <TouchMoveButton label="↑" onPress={() => setMove(0, -1)} onRelease={() => setMove(0, 0)} />
        <span />
        <TouchMoveButton label="←" onPress={() => setMove(-1, 0)} onRelease={() => setMove(0, 0)} />
        <TouchMoveButton label="↓" onPress={() => setMove(0, 1)} onRelease={() => setMove(0, 0)} />
        <TouchMoveButton label="→" onPress={() => setMove(1, 0)} onRelease={() => setMove(0, 0)} />
      </div>

      <div className="absolute bottom-4 right-4 flex flex-col gap-2">
        <button
          type="button"
          onClick={() => nearbyPatientId && onSelectPatient(nearbyPatientId)}
          disabled={!nearbyPatientId}
          className="rounded-2xl border border-white/10 bg-white/12 px-4 py-3 text-sm font-black text-white backdrop-blur transition hover:bg-white/18 disabled:cursor-not-allowed disabled:opacity-45"
        >
          Interact
        </button>
      </div>
    </section>
  )
}

function TouchMoveButton({
  label,
  onPress,
  onRelease,
}: {
  label: string
  onPress: () => void
  onRelease: () => void
}) {
  return (
    <button
      type="button"
      onPointerDown={onPress}
      onPointerUp={onRelease}
      onPointerCancel={onRelease}
      onPointerLeave={onRelease}
      className="h-12 w-12 rounded-2xl border border-white/10 bg-white/14 text-lg font-black text-white backdrop-blur active:scale-95"
      aria-label={`Move ${label}`}
    >
      {label}
    </button>
  )
}

function HudStat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/8 px-3 py-2">
      <p className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.14em] text-slate-400">
        {icon}
        {label}
      </p>
      <p className="mt-1 text-lg font-black text-white">{value}</p>
    </div>
  )
}

function MissionRow({ mission }: { mission: MissionCard }) {
  return (
    <div
      className={clsx(
        'rounded-2xl border p-3 transition',
        mission.complete ? 'border-emerald-300/25 bg-emerald-400/10' : 'border-white/10 bg-white/6',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-black text-white">{mission.title}</p>
          <p className="mt-1 text-xs leading-5 text-slate-400">{mission.description}</p>
        </div>
        <span
          className={clsx(
            'rounded-full px-2 py-1 text-[10px] font-black uppercase tracking-[0.12em]',
            mission.complete ? 'bg-emerald-400/15 text-emerald-200' : 'bg-white/8 text-slate-400',
          )}
        >
          {mission.complete ? 'complete' : 'open'}
        </span>
      </div>
      <p className="mt-2 text-[11px] font-bold text-sky-200">{mission.reward}</p>
    </div>
  )
}

function PatientRow({
  patient,
  selected,
  deteriorating,
  deteriorated,
  completed,
  onSelect,
}: {
  patient: ShiftPatient
  selected: boolean
  deteriorating: boolean
  deteriorated: boolean
  completed: number
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={clsx(
        'w-full rounded-2xl border p-3 text-left transition hover:-translate-y-0.5',
        selected ? 'border-sky-300/40 bg-sky-400/10 shadow-[0_16px_40px_rgba(42,125,225,0.18)]' : 'border-white/10 bg-white/6 hover:bg-white/9',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-black text-white">{patient.room} - {patient.name}</p>
          <p className="mt-1 line-clamp-1 text-xs text-slate-400">{patient.diagnosis}</p>
        </div>
        <span className={clsx('rounded-full border px-2 py-1 text-[10px] font-black uppercase', statusStyles[patient.risk])}>
          {patient.risk}
        </span>
      </div>
      {deteriorating || deteriorated ? (
        <p className={clsx('mt-2 text-[11px] font-black uppercase tracking-[0.12em]', deteriorated ? 'text-rose-200' : 'text-amber-200')}>
          {deteriorated ? 'Deteriorated' : 'Deteriorating now'}
        </p>
      ) : null}
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-gradient-to-r from-[#2a7de1] to-[#10b981]"
          style={{ width: `${Math.round((completed / Math.max(1, patient.correctActions.length)) * 100)}%` }}
        />
      </div>
    </button>
  )
}

function VitalsCard({ patient }: { patient: ShiftPatient }) {
  const vitals = [
    ['BP', patient.vitals.bp],
    ['HR', patient.vitals.hr],
    ['RR', patient.vitals.rr],
    ['SpO2', `${patient.vitals.spo2}%`],
    ['Temp', `${patient.vitals.temp}F`],
    ['Pain', `${patient.vitals.pain}/10`],
    ...(typeof patient.vitals.glucose === 'number' ? [['Glucose', patient.vitals.glucose]] : []),
  ]

  return (
    <div className="rounded-[22px] border border-white/10 bg-[#071624]/70 p-4">
      <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-slate-400">
        <Activity className="h-4 w-4" />
        Vitals Monitor
      </p>
      <div className="mt-4 grid grid-cols-2 gap-3">
        {vitals.map(([label, value]) => (
          <div key={label} className="rounded-2xl border border-white/8 bg-white/6 p-3">
            <p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">{label}</p>
            <p className="mt-1 text-lg font-black text-white">{value}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

function ScoreBar({
  label,
  value,
  tone,
}: {
  label: string
  value: number
  tone: 'emerald' | 'sky' | 'amber' | 'violet'
}) {
  const color = {
    emerald: 'from-emerald-400 to-teal-300',
    sky: 'from-sky-400 to-blue-300',
    amber: 'from-amber-400 to-orange-300',
    violet: 'from-violet-400 to-fuchsia-300',
  }[tone]

  return (
    <div className="mb-3">
      <div className="mb-1 flex items-center justify-between text-xs font-bold text-slate-400">
        <span>{label}</span>
        <span>{value}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-white/10">
        <motion.div className={clsx('h-full rounded-full bg-gradient-to-r', color)} animate={{ width: `${value}%` }} />
      </div>
    </div>
  )
}

function EndShiftModal({
  totalScore,
  score,
  log,
  missions,
  onRestart,
}: {
  totalScore: number
  score: { safety: number; prioritization: number; delegation: number; documentation: number }
  log: LogEntry[]
  missions: MissionCard[]
  onRestart: () => void
}) {
  const dangerCount = log.filter((entry) => entry.tone === 'danger').length
  const safeCount = log.filter((entry) => entry.tone === 'safe').length
  const completedMissions = missions.filter((mission) => mission.complete).length

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/70 p-4 backdrop-blur-md">
      <motion.section
        initial={{ opacity: 0, y: 24, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        className="w-full max-w-3xl rounded-[34px] border border-white/12 bg-[#0b1d31] p-6 shadow-[0_30px_100px_rgba(0,0,0,0.5)]"
      >
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.18em] text-sky-300">End-of-shift report</p>
            <h2 className="mt-2 text-5xl font-black tracking-[-0.06em] text-white">{totalScore}%</h2>
            <p className="mt-3 max-w-xl text-sm leading-7 text-slate-300">
              {totalScore >= 85
                ? 'Strong clinical command. You prioritized unstable patients, escalated danger cues, and closed the loop.'
                : totalScore >= 70
                  ? 'Safe developing shift. A few time-management or documentation gaps are worth replaying.'
                  : 'High-yield replay. The misses show exactly where priority recognition and escalation need practice.'}
            </p>
          </div>
          <div className="rounded-[24px] border border-white/10 bg-white/8 p-5">
            <CheckCircle2 className="h-10 w-10 text-emerald-300" />
            <p className="mt-3 text-sm font-bold text-slate-300">{safeCount} safe decisions</p>
            <p className="mt-1 text-sm font-bold text-rose-300">{dangerCount} critical misses</p>
            <p className="mt-1 text-sm font-bold text-sky-200">
              {completedMissions}/{missions.length} missions complete
            </p>
          </div>
        </div>
        <div className="mt-6 grid gap-3 md:grid-cols-4">
          <ScoreSummary label="Safety" value={score.safety} />
          <ScoreSummary label="Priority" value={score.prioritization} />
          <ScoreSummary label="Delegation" value={score.delegation} />
          <ScoreSummary label="Charting" value={score.documentation} />
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={onRestart}
            className="rounded-2xl bg-[#2a7de1] px-5 py-3 text-sm font-black text-white"
          >
            Replay shift
          </button>
          <Link
            to="/dashboard"
            className="rounded-2xl border border-white/10 bg-white/8 px-5 py-3 text-sm font-black text-white"
          >
            Back to dashboard
          </Link>
        </div>
      </motion.section>
    </div>
  )
}

function ScoreSummary({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/8 p-4">
      <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-black text-white">{value}%</p>
    </div>
  )
}
