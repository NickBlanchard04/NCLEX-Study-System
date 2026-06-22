import type {
  TycoonActionChoice,
  TycoonGameState,
  TycoonPayoutSummary,
  TycoonShift,
  TycoonShiftEvent,
  TycoonTask,
} from '../app/types'
import { tycoonStarterTasks, tycoonUpgrades } from '../data/tycoon'

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value))

const makeId = (prefix: string) =>
  `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`

export const createInitialTycoonState = (): TycoonGameState => ({
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

const cloneStarterTasks = (): TycoonTask[] =>
  tycoonStarterTasks.map((task) => ({
    ...task,
    status: 'available',
    actions: task.actions.map((action) => ({ ...action })),
    mapPosition: { ...task.mapPosition },
    unsafePenalty: { ...task.unsafePenalty },
  }))

export const startTycoonShiftForUnit = (
  state: TycoonGameState,
  unitId: string,
): TycoonGameState => {
  if (!state.unlockedUnitIds.includes(unitId)) return state

  const shift: TycoonShift = {
    id: makeId('tycoon-shift'),
    unitId,
    startedAt: new Date().toISOString(),
    shiftMinute: 0,
    tasks: cloneStarterTasks(),
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
): TycoonGameState => ({
  ...state,
  selectedTaskId: taskId,
})

export const completeTycoonTaskWithAction = (
  state: TycoonGameState,
  taskId: string,
  actionId: string,
): TycoonGameState => {
  const shift = state.activeShift
  if (!shift || shift.status !== 'running') return state

  const task = shift.tasks.find((item) => item.id === taskId)
  if (!task || task.status === 'completed' || task.status === 'failed') return state

  const action = task.actions.find((item) => item.id === actionId)
  if (!action) return state

  const isCorrect = actionId === task.correctActionId
  const timeCost = Math.max(4, task.timeCost - getEhrTimeDiscount(state, task) - getLabTimeDiscount(state, task))
  const energyCost = Math.max(0, (action.energyCost ?? 0) - getStaffEnergyBuffer(state))

  if (isCorrect) {
    const moneyEarned = task.rewardMoney + getMedScannerBonus(state, task)
    const xpEarned = task.rewardXp + getSimulationBonus(state)
    const nextShift: TycoonShift = {
      ...shift,
      shiftMinute: shift.shiftMinute + timeCost,
      tasks: shift.tasks.map((item) => (item.id === taskId ? { ...item, status: 'completed' } : item)),
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
      item.id === taskId ? { ...item, status: item.safetyRisk === 'critical' ? 'failed' : 'deteriorating' } : item,
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

export const advanceTycoonShiftTime = (
  state: TycoonGameState,
  minutes: number,
): TycoonGameState => {
  if (!state.activeShift || state.activeShift.status !== 'running') return state

  return applyDeteriorationCheck({
    ...state,
    activeShift: {
      ...state.activeShift,
      shiftMinute: state.activeShift.shiftMinute + minutes,
      events: [
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
    if (task.status !== 'available' || shift.shiftMinute <= task.deadlineMinute) return task
    safetyPenalty += Math.max(2, task.unsafePenalty.patientSafety - getMonitoringBuffer(state))
    overdueTasks.push(task.id)
    return { ...task, status: 'deteriorating' as const }
  })

  if (!overdueTasks.length) return state

  const events = overdueTasks.map((taskId) =>
    eventAt(
      shift,
      'deterioration',
      'Patient deteriorating',
      'A delayed task crossed its safety window. Reassess now before routine work.',
      taskId,
    ),
  )

  return {
    ...state,
    patientSafety: clamp(state.patientSafety - safetyPenalty, 0, 100),
    activeShift: {
      ...shift,
      tasks,
      events: [...events, ...shift.events],
    },
  }
}

export const purchaseTycoonUpgradeById = (
  state: TycoonGameState,
  upgradeId: string,
): TycoonGameState => {
  const upgrade = tycoonUpgrades.find((item) => item.id === upgradeId)
  if (!upgrade) return state

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
  if (!shift) return state

  const summary = summarizeTycoonShift(shift, state)
  const finishedShift: TycoonShift = {
    ...shift,
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
    activeShift: finishedShift,
    completedShifts: [finishedShift, ...state.completedShifts].slice(0, 20),
    selectedTaskId: null,
  }
}

export const summarizeTycoonShift = (
  shift: TycoonShift,
  state: TycoonGameState,
): TycoonPayoutSummary => {
  const completedTasks = shift.tasks.filter((task) => task.status === 'completed').length
  const mistakes = shift.tasks.filter((task) => task.status === 'failed' || task.status === 'deteriorating').length
  const moneyEarned = shift.tasks
    .filter((task) => task.status === 'completed')
    .reduce((total, task) => total + task.rewardMoney + getMedScannerBonus(state, task), 0)
  const xpEarned = shift.tasks
    .filter((task) => task.status === 'completed')
    .reduce((total, task) => total + task.rewardXp + getSimulationBonus(state), 0)

  return {
    completedTasks,
    mistakes,
    safetyScore: state.patientSafety,
    moneyEarned,
    xpEarned,
    reputationChange: completedTasks * 2 - mistakes * 3,
    recommendation:
      mistakes > 0
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
      const urgencyDelta = urgencyWeight[b.safetyRisk] - urgencyWeight[a.safetyRisk]
      if (urgencyDelta !== 0) return urgencyDelta
      return a.deadlineMinute - b.deadlineMinute
    })[0] ?? null
}

export const getTaskAction = (task: TycoonTask | undefined, actionId: string): TycoonActionChoice | undefined =>
  task?.actions.find((action) => action.id === actionId)
