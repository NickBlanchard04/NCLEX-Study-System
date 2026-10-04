import type {
  TycoonActionChoice,
  TycoonGameState,
  TycoonPayoutSummary,
  TycoonShift,
  TycoonShiftEvent,
  TycoonTask,
} from '../app/types'
import { tycoonStarterTasks, tycoonUpgrades } from '../data/tycoon'
import { createScenarioTask } from '../data/tycoon-scenarios'
import { successfulShiftCount, upgradeRequirement } from './tycoon-progression'
import { advanceShiftLoop } from './tycoon-shift-loop'

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value))

const makeId = (prefix: string) =>
  `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`

export const createInitialTycoonState = (): TycoonGameState => ({
  mapVersion: 7,
  money: 500,
  xp: 0,
  level: 1,
  reputation: 72,
  patientSafety: 86,
  staffEnergy: 92,
  currentUnitId: 'fundamentals-clinic',
  unlockedUnitIds: ['fundamentals-clinic'],
  upgrades: {},
  activeShift: null,
  completedShifts: [],
  selectedTaskId: null,
})

export const getTycoonLevel = (xp: number) => Math.floor(xp / 450) + 1

const getUpgradeLevel = (state: TycoonGameState, upgradeId: string) => state.upgrades[upgradeId] ?? 0

const getSimulationBonus = (state: TycoonGameState) =>
  getUpgradeLevel(state, 'simulation-room') *
  (tycoonUpgrades.find((upgrade) => upgrade.id === 'simulation-room')?.effectValue ?? 0)

const getMonitoringBuffer = (state: TycoonGameState) =>
  getUpgradeLevel(state, 'vitals-monitor') *
  (tycoonUpgrades.find((upgrade) => upgrade.id === 'vitals-monitor')?.effectValue ?? 0)

const getStaffEnergyBuffer = (state: TycoonGameState) =>
  getUpgradeLevel(state, 'staff-training') *
  (tycoonUpgrades.find((upgrade) => upgrade.id === 'staff-training')?.effectValue ?? 0)

const getMedScannerBonus = (state: TycoonGameState, task: TycoonTask) =>
  task.category === 'medication-check'
    ? getUpgradeLevel(state, 'med-safety-scanner') *
      (tycoonUpgrades.find((upgrade) => upgrade.id === 'med-safety-scanner')?.effectValue ?? 0)
    : 0

const getEhrTimeDiscount = (state: TycoonGameState, task: TycoonTask) =>
  task.category === 'documentation'
    ? getUpgradeLevel(state, 'ehr-station') *
      (tycoonUpgrades.find((upgrade) => upgrade.id === 'ehr-station')?.effectValue ?? 0)
    : 0

const getLabTimeDiscount = (state: TycoonGameState, task: TycoonTask) =>
  task.category === 'vitals'
    ? getUpgradeLevel(state, 'lab-runner') *
      (tycoonUpgrades.find((upgrade) => upgrade.id === 'lab-runner')?.effectValue ?? 0)
    : 0

const eventAt = (
  shift: TycoonShift,
  type: TycoonShiftEvent['type'],
  title: string,
  message: string,
  taskId?: string,
): TycoonShiftEvent => ({
  id: makeId('tycoon-event'),
  minute: shift.shiftMinute,
  type,
  title,
  message,
  taskId,
})

const cloneStarterTasks = (roomIds?: readonly string[]): TycoonTask[] =>
  tycoonStarterTasks.filter((task) => !roomIds || roomIds.includes(task.room)).map((task) => ({
    ...task,
    status: 'available',
    actions: task.actions.map((action) => ({ ...action })),
    mapPosition: { ...task.mapPosition },
    unsafePenalty: { ...task.unsafePenalty },
  }))

export const startTycoonShiftForUnit = (
  state: TycoonGameState,
  unitId: string,
  options: { roomIds?: readonly string[]; simulation?: boolean; paced?: boolean; physicalInteractions?: boolean } = {},
): TycoonGameState => {
  if (!state.unlockedUnitIds.includes(unitId)) return state

  if (options.simulation && state.activeShift?.status === 'running') return state
  const id = makeId('tycoon-shift')
  const sequence = (state.completedShifts[0]?.simulation?.sequence ?? state.completedShifts.length) + 1
  const rooms = options.roomIds ?? Array.from({ length: Math.min(6, 3 + getUpgradeLevel(state, 'extra-bed')) }, (_, i) => `Room ${101 + i}`)
  const tasks = options.simulation ? rooms.slice(0, Math.min(6, 3 + getUpgradeLevel(state, 'extra-bed'))).map((room, i) => createScenarioTask(id, sequence, i, room, 0)) : cloneStarterTasks(options.roomIds)
  if (options.paced) tasks.forEach((task) => { if (task.simulation) task.simulation.workflow = 'bedside' })
  if (options.physicalInteractions) tasks.forEach((task) => { if (task.simulation) task.simulation.physicalEquipment = true })
  if (!tasks.length) return state

  const shift: TycoonShift = {
    id,
    loop: options.simulation && options.paced ? { calls: [], comfortRaised: false, complicationRaised: false, physicalInteractions: options.physicalInteractions } : undefined,
    worldJobs: options.physicalInteractions ? [] : undefined,
    simulation: options.simulation ? { sequence, duration: 24, goal: 3, admissionLimit: tasks.length + 2, admitted: tasks.length, archived: [], startingReputation: state.reputation } : undefined,
    unitId,
    startedAt: new Date().toISOString(),
    shiftMinute: 0,
    tasks,
    events: [
      {
        id: makeId('tycoon-event'),
        minute: 0,
        type: 'shift',
        title: 'Shift started',
        message: 'Fundamentals Clinic is open. Keep safety high and finish priority care first.',
      },
    ],
    status: 'running',
  }

  return {
    ...state,
    currentUnitId: unitId,
    staffEnergy: clamp(92 + getStaffEnergyBuffer(state), 0, 100),
    patientSafety: clamp(Math.max(state.patientSafety, 82), 0, 100),
    activeShift: shift,
    selectedTaskId: shift.tasks[0]?.id ?? null,
  }
}

export const selectTycoonTaskById = (
  state: TycoonGameState,
  taskId: string,
): TycoonGameState => {
  if (
    state.activeShift?.status !== 'running' ||
    !state.activeShift.tasks.some((task) => task.id === taskId) ||
    state.selectedTaskId === taskId
  ) return state

  return { ...state, selectedTaskId: taskId }
}

export const completeTycoonTaskWithAction = (
  state: TycoonGameState,
  taskId: string,
  actionId: string,
  expectedShiftId?: string,
): TycoonGameState => {
  const shift = state.activeShift
  if (
    !shift ||
    shift.status !== 'running' ||
    (expectedShiftId !== undefined && shift.id !== expectedShiftId)
  ) return state

  const task = shift.tasks.find((item) => item.id === taskId)
  if (!task || task.status === 'completed' || task.status === 'failed') return state

  const action = task.actions.find((item) => item.id === actionId)
  if (!action) return state

  const isCorrect = actionId === task.correctActionId
  if (task.simulation && isCorrect && (!task.careProgress?.steps.includes('documentation') || !task.simulation.reassessment)) return state
  if (task.simulation?.attempted.includes(`assessment:${actionId}`)) return state
  const timeCost = task.simulation
    ? Math.max(1, task.timeCost - getUpgradeLevel(state, 'ehr-station') * 0.5 - (task.category === 'vitals' && (!task.simulation.physicalEquipment || task.simulation.labDelivered) ? getUpgradeLevel(state, 'lab-runner') * 0.5 : 0))
    : Math.max(4, task.timeCost - getEhrTimeDiscount(state, task) - getLabTimeDiscount(state, task))
  const energyCost = Math.max(0, (action.energyCost ?? 0) - getStaffEnergyBuffer(state))

  if (isCorrect) {
    const moneyEarned = task.rewardMoney + getMedScannerBonus(state, task)
    const xpEarned = task.rewardXp + getSimulationBonus(state)
    const nextShift: TycoonShift = {
      ...shift,
      shiftMinute: shift.shiftMinute + timeCost,
      tasks: shift.tasks.map((item) => (item.id === taskId ? { ...item, status: 'completed', payout: { money: moneyEarned, xp: xpEarned } } : item)),
      events: [
        eventAt(shift, 'reward', 'Safe task complete', `${action.feedback} +$${moneyEarned}, +${xpEarned} XP.`, taskId),
        ...shift.events,
      ],
    }

    return applyDeteriorationCheck({
      ...state,
      money: state.money + moneyEarned,
      xp: state.xp + xpEarned,
      level: getTycoonLevel(state.xp + xpEarned),
      reputation: clamp(state.reputation + task.rewardReputation, 0, 100),
      patientSafety: clamp(state.patientSafety + task.rewardSafety, 0, 100),
      staffEnergy: clamp(state.staffEnergy - energyCost, 0, 100),
      activeShift: nextShift,
      selectedTaskId: nextShift.tasks.find((item) => item.status === 'available')?.id ?? taskId,
    })
  }

  const penaltySafety = Math.max(1, task.unsafePenalty.patientSafety - getMonitoringBuffer(state))
  const nextShift: TycoonShift = {
    ...shift,
    shiftMinute: shift.shiftMinute + Math.ceil(timeCost / 2),
    tasks: shift.tasks.map((item) =>
      item.id === taskId ? { ...item, status: !item.simulation && item.safetyRisk === 'critical' ? 'failed' : 'deteriorating', simulation: item.simulation ? { ...item.simulation, condition: 'worsening', attempted: [...item.simulation.attempted, `assessment:${actionId}`] } : undefined } : item,
    ),
    events: [
      eventAt(
        shift,
        'penalty',
        'Unsafe choice',
        `${action.label} was not the safest move. ${action.clinicalReason} -$${task.unsafePenalty.money}, -${penaltySafety} safety.`,
        taskId,
      ),
      ...shift.events,
    ],
  }

  return applyDeteriorationCheck({
    ...state,
    money: Math.max(0, state.money - task.unsafePenalty.money),
    reputation: clamp(state.reputation - task.unsafePenalty.reputation, 0, 100),
    patientSafety: clamp(state.patientSafety - penaltySafety, 0, 100),
    staffEnergy: clamp(state.staffEnergy - (task.unsafePenalty.staffEnergy ?? energyCost), 0, 100),
    activeShift: nextShift,
    selectedTaskId: taskId,
  })
}

export const reviewTycoonEquipment = (state: TycoonGameState, taskId: string, expectedShiftId: string): TycoonGameState => {
  const shift = state.activeShift
  if (!shift || shift.id !== expectedShiftId || shift.status !== 'running' || !shift.tasks.some((task) => task.id === taskId) || shift.equipmentReviewedTaskIds?.includes(taskId)) return state
  return { ...state, activeShift: { ...shift, equipmentReviewedTaskIds: [...(shift.equipmentReviewedTaskIds ?? []), taskId] } }
}

export const advanceTycoonShiftTime = (
  state: TycoonGameState,
  minutes: number,
  options: { recordEvent?: boolean } = {},
): TycoonGameState => {
  if (
    !Number.isFinite(minutes) ||
    minutes <= 0 ||
    !state.activeShift ||
    state.activeShift.status !== 'running'
  ) return state

  return applyDeteriorationCheck({
    ...state,
    activeShift: {
      ...state.activeShift,
      shiftMinute: state.activeShift.shiftMinute + minutes,
      events: options.recordEvent === false
        ? state.activeShift.events
        : [
            eventAt(state.activeShift, 'shift', 'Time advanced', `${minutes} minutes passed on the unit.`),
            ...state.activeShift.events,
          ],
    },
  })
}

const applyDeteriorationCheck = (state: TycoonGameState): TycoonGameState => {
  const shift = state.activeShift
  if (!shift || shift.status !== 'running') return state

  let safetyPenalty = 0
  const overdueTasks: string[] = []
  const tasks = shift.tasks.map((task) => {
    if (task.status !== 'available' || task.simulation?.reassessment || task.careProgress?.steps.includes('care') || shift.shiftMinute <= task.deadlineMinute) return task
    safetyPenalty += Math.max(2, task.unsafePenalty.patientSafety - getMonitoringBuffer(state))
    overdueTasks.push(task.id)
    return { ...task, status: 'deteriorating' as const, simulation: task.simulation ? { ...task.simulation, condition: 'worsening' as const } : undefined }
  })

  if (!overdueTasks.length) return finishIfTimeExpired(state)

  const events = overdueTasks.map((taskId) =>
    eventAt(
      shift,
      'deterioration',
      'Patient deteriorating',
      'A delayed task crossed its safety window. Reassess now before routine work.',
      taskId,
    ),
  )

  return finishIfTimeExpired({
    ...state,
    patientSafety: clamp(state.patientSafety - safetyPenalty, 0, 100),
    activeShift: {
      ...shift,
      tasks,
      events: [...events, ...shift.events],
    },
  })
}

function finishIfTimeExpired(state: TycoonGameState): TycoonGameState {
  state = advanceShiftLoop(state)
  const shift = state.activeShift
  return shift?.simulation && shift.shiftMinute >= shift.simulation.duration
    ? finishTycoonShiftNow({ ...state, activeShift: { ...shift, shiftMinute: shift.simulation.duration } }) : state
}

export const purchaseTycoonUpgradeById = (
  state: TycoonGameState,
  upgradeId: string,
): TycoonGameState => {
  const upgrade = tycoonUpgrades.find((item) => item.id === upgradeId)
  if (!upgrade || upgradeRequirement(state, upgradeId)) return state

  const currentLevel = state.upgrades[upgradeId] ?? 0
  const nextCost = getUpgradeCost(upgrade.cost, currentLevel)
  if (currentLevel >= upgrade.maxLevel || state.money < nextCost) return state

  const shift = state.activeShift
  return {
    ...state,
    money: state.money - nextCost,
    upgrades: {
      ...state.upgrades,
      [upgradeId]: currentLevel + 1,
    },
    staffEnergy:
      upgrade.effectType === 'staff-energy'
        ? clamp(state.staffEnergy + upgrade.effectValue, 0, 100)
        : state.staffEnergy,
    activeShift: shift
      ? {
          ...shift,
          events: [
            eventAt(
              shift,
              'upgrade',
              `${upgrade.name} upgraded`,
              `Level ${currentLevel + 1} is online. The unit is safer and faster.`,
            ),
            ...shift.events,
          ],
        }
      : shift,
  }
}

export const finishTycoonShiftNow = (state: TycoonGameState): TycoonGameState => {
  const shift = state.activeShift
  if (!shift || shift.status !== 'running') return state

  const summary = summarizeTycoonShift(shift, state)
  const finishedShift: TycoonShift = {
    ...shift,
    worldJobs: shift.worldJobs?.map((job) => job.phase === 'complete' ? job : { ...job, phase: 'cancelled' }),
    status: 'finished',
    endedAt: new Date().toISOString(),
    payoutSummary: summary,
    events: [
      eventAt(shift, 'shift', 'Shift complete', `Payout summary ready. Safety score: ${summary.safetyScore}%.`),
      ...shift.events,
    ],
  }

  return {
    ...state,
    money: state.money + (summary.objectiveBonus ?? 0),
    successfulShifts: successfulShiftCount(state) + (summary.objectiveMet ? 1 : 0),
    activeShift: finishedShift,
    completedShifts: [finishedShift, ...state.completedShifts].slice(0, 20),
    selectedTaskId: null,
  }
}

export const summarizeTycoonShift = (
  shift: TycoonShift,
  state: TycoonGameState,
): TycoonPayoutSummary => {
  const patients = [...(shift.simulation?.archived ?? []), ...shift.tasks]
  const completedTasks = patients.filter((task) => task.status === 'completed').length
  const mistakes = shift.simulation ? shift.events.filter((event) => event.type === 'penalty').length : patients.filter((task) => task.status === 'failed' || task.status === 'deteriorating').length
  const moneyEarned = patients
    .filter((task) => task.status === 'completed')
    .reduce((total, task) => total + (task.payout?.money ?? task.rewardMoney + getMedScannerBonus(state, task)), 0)
  const xpEarned = patients
    .filter((task) => task.status === 'completed')
    .reduce((total, task) => total + (task.payout?.xp ?? task.rewardXp + getSimulationBonus(state)), 0)
  const dischargedPatients = patients.filter((task) => task.simulation?.discharged).length
  const objectiveMet = Boolean(shift.simulation && completedTasks >= shift.simulation.goal && dischargedPatients >= shift.simulation.goal && state.patientSafety >= 80)
  const objectiveBonus = objectiveMet ? 150 : 0
  const calls = shift.loop?.calls ?? []
  const missed = calls.filter((call) => call.status === 'missed' || call.deferred)
  const delays = shift.events.filter((event) => event.type === 'deterioration' || event.title === 'Call response delayed')
  const recommendedUpgrade = calls.some((call) => call.kind === 'comfort' && (call.status === 'missed' || call.deferred)) && !state.upgrades['staff-training']
    ? 'Support Nurse' : delays.length && !state.upgrades['vitals-monitor'] ? 'Vitals Monitor' : !state.upgrades['ehr-station'] ? 'EHR Station' : !state.upgrades['med-safety-scanner'] ? 'Med Safety Scanner' : 'Extra Bed'

  return {
    completedTasks,
    mistakes,
    safetyScore: state.patientSafety,
    moneyEarned: moneyEarned + objectiveBonus,
    objectiveMet, objectiveBonus, dischargedPatients,
    highlights: shift.loop ? [`${completedTasks} patients completed with documented reassessment.`, `${calls.filter((call) => call.status === 'answered').length}/${calls.length} call requests answered.`, `${calls.filter((call) => call.answeredBy === 'staff').length} comfort requests completed by support staff.`] : undefined,
    delays: shift.loop ? [...delays.map((event) => `${patients.find((task) => task.id === event.taskId)?.room ?? 'Ward'}: ${event.message}`), ...calls.filter((call) => call.status === 'ringing' || call.status === 'assigned').map((call) => `${patients.find((task) => task.id === call.taskId)?.room}: ${call.kind === 'change' ? 'Changed symptoms' : 'Comfort request'} still awaiting response at handoff.`)] : undefined,
    recommendedUpgrade: shift.loop ? recommendedUpgrade : undefined,
    decisions: shift.simulation ? shift.events.filter((event) => ['penalty', 'deterioration'].includes(event.type) || event.title === 'Care decision' || event.title === 'Reassessment recorded' || event.title === 'Call response').reverse().map((event) => `${Math.floor(event.minute)} min · ${patients.find((task) => task.id === event.taskId)?.patientName ?? 'Ward'}: ${event.message}`) : undefined,
    xpEarned,
    reputationChange: shift.simulation ? state.reputation - shift.simulation.startingReputation : completedTasks * 2 - mistakes * 3,
    recommendation:
      shift.loop
        ? `${missed.length ? 'Protect time for call responses while prioritizing clinical changes.' : 'Keep pairing each care decision with reassessment.'} Next purchase: ${recommendedUpgrade}, ${recommendedUpgrade === 'Support Nurse' ? 'to delegate comfort requests' : recommendedUpgrade === 'Vitals Monitor' ? 'to see vital trends from the ward board' : recommendedUpgrade === 'EHR Station' ? 'to prepare charting drafts from recorded care' : recommendedUpgrade === 'Med Safety Scanner' ? 'to combine medication safety checks with assessment' : 'to increase next-shift capacity'}.`
        : shift.simulation && !objectiveMet
        ? 'Prioritize deteriorating patients, complete reassessment, and discharge documented patients before handoff. Monitoring upgrades reduce delay penalties.'
        : mistakes > 0
        ? 'Upgrade monitoring or staff training before increasing patient load.'
        : 'Strong safe shift. Consider buying a simulation room to accelerate XP gains.',
  }
}

export const getUpgradeCost = (baseCost: number, currentLevel: number) =>
  Math.round(baseCost * (1 + currentLevel * 0.55))

export const getBestTycoonTask = (shift: TycoonShift | null): TycoonTask | null => {
  if (!shift) return null
  const urgencyWeight: Record<TycoonTask['safetyRisk'], number> = {
    critical: 4,
    urgent: 3,
    watch: 2,
    stable: 1,
  }

  return [...shift.tasks]
    .filter((task) => task.status === 'available' || task.status === 'deteriorating')
    .sort((a, b) => {
      const callUrgency = (task: TycoonTask) => shift.loop?.calls.some((call) => call.taskId === task.id && call.kind === 'change' && (call.status === 'ringing' || call.status === 'missed')) ? 1 : 0
      if (callUrgency(a) !== callUrgency(b)) return callUrgency(b) - callUrgency(a)
      const urgencyDelta = urgencyWeight[b.safetyRisk] - urgencyWeight[a.safetyRisk]
      if (urgencyDelta !== 0) return urgencyDelta
      return a.deadlineMinute - b.deadlineMinute
    })[0] ?? null
}

export const getTaskAction = (task: TycoonTask | undefined, actionId: string): TycoonActionChoice | undefined =>
  task?.actions.find((action) => action.id === actionId)

/** Discharge is a state transition, so stale/double clicks cannot admit twice or pay again. */
export function dischargeTycoonPatient(state: TycoonGameState, taskId: string, expectedShiftId: string): TycoonGameState {
  const shift = state.activeShift, task = shift?.tasks.find((item) => item.id === taskId)
  if (!shift?.simulation || shift.id !== expectedShiftId || shift.status !== 'running' || task?.status !== 'completed' || !task.simulation || task.simulation.discharged || task.simulation.condition !== 'stable') return state
  const closed: TycoonTask = { ...task, simulation: { ...task.simulation, discharged: true } }
  const admit = shift.simulation.admitted < shift.simulation.admissionLimit
  const replacement = admit ? createScenarioTask(shift.id, shift.simulation.sequence, shift.simulation.admitted, task.room, shift.shiftMinute) : closed
  if (admit && shift.loop && replacement.simulation) replacement.simulation.workflow = 'bedside'
  if (admit && shift.loop?.physicalInteractions && replacement.simulation) replacement.simulation.physicalEquipment = true
  return { ...state, selectedTaskId: replacement.id, activeShift: { ...shift,
    tasks: shift.tasks.map((item) => item.id === taskId ? replacement : item),
    worldJobs: shift.worldJobs?.map((job) => job.taskId === taskId && job.phase !== 'complete' ? { ...job, phase: 'cancelled' } : job),
    equipmentReviewedTaskIds: (shift.equipmentReviewedTaskIds ?? []).filter((id) => id !== taskId),
    loop: shift.loop ? { ...shift.loop, calls: shift.loop.calls.map((call) => call.taskId === taskId && (call.status === 'ringing' || call.status === 'assigned') ? { ...call, status: 'missed' } : call) } : undefined,
    simulation: { ...shift.simulation, admitted: shift.simulation.admitted + (admit ? 1 : 0), archived: admit ? [...shift.simulation.archived, closed] : shift.simulation.archived },
    events: [eventAt(shift, 'shift', admit ? 'New admission' : 'Room available', `${task.patientName} left after the simulated team cleared onward care.${admit ? ` ${replacement.patientName} admitted to ${task.room}.` : ' Admission queue is empty.'}`, taskId), ...shift.events],
  } }
}
