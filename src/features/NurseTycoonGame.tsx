import type React from 'react'
import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  BadgeDollarSign,
  Bed,
  CheckCircle2,
  Clock3,
  Map,
  ShieldCheck,
  Star,
  Users,
  Zap,
} from 'lucide-react'
import { clsx } from 'clsx'
import type { TycoonTask, TycoonTaskUrgency } from '../app/types'
import { useStudySystemStore } from '../app/store'
import { tycoonUnits, tycoonUpgrades } from '../data/tycoon'
import { getBestTycoonTask, getUpgradeCost } from '../services/tycoon-engine'
import {
  CommandBrand,
  CommandChip,
  CommandIconBubble,
  CommandPanel,
  CommandProgress,
  EcgTrace,
  NurseCommandBackdrop,
} from './nurse-command-assets'

const urgencyStyles: Record<TycoonTaskUrgency, { label: string; className: string; dot: string }> = {
  stable: {
    label: 'Stable',
    className: 'border-sky-300/30 bg-sky-400/10 text-sky-200',
    dot: 'bg-sky-300',
  },
  watch: {
    label: 'Watch',
    className: 'border-amber-300/35 bg-amber-400/10 text-amber-200',
    dot: 'bg-amber-300',
  },
  urgent: {
    label: 'Urgent',
    className: 'border-orange-300/40 bg-orange-400/12 text-orange-200',
    dot: 'bg-orange-300',
  },
  critical: {
    label: 'Critical',
    className: 'border-rose-300/45 bg-rose-400/16 text-rose-200',
    dot: 'bg-rose-300',
  },
}

const mapRooms = [
  { label: 'Room 101', x: 6, y: 10, w: 22, h: 27 },
  { label: 'Room 102', x: 31, y: 8, w: 22, h: 27 },
  { label: 'Room 103', x: 65, y: 12, w: 26, h: 28 },
  { label: 'Nursing Station', x: 35, y: 40, w: 30, h: 22 },
  { label: 'Med Room', x: 7, y: 51, w: 21, h: 20 },
  { label: 'Lab Station', x: 70, y: 48, w: 20, h: 18 },
  { label: 'Room 104', x: 7, y: 75, w: 22, h: 18 },
  { label: 'Room 105', x: 39, y: 73, w: 23, h: 19 },
  { label: 'Room 106', x: 70, y: 72, w: 22, h: 20 },
]

const formatShiftTime = (minute: number) => {
  const hour = Math.floor(minute / 60)
  const minutes = minute % 60
  return `${hour + 7}:${minutes.toString().padStart(2, '0')}`
}

const getTaskTone = (task: TycoonTask) => {
  if (task.status === 'completed') return 'border-emerald-300/50 bg-emerald-400/20 text-emerald-100'
  if (task.status === 'failed' || task.status === 'deteriorating') return 'border-rose-300/60 bg-rose-400/22 text-rose-100'
  return urgencyStyles[task.safetyRisk].className
}

export function NurseTycoonGame() {
  const navigate = useNavigate()
  const tycoon = useStudySystemStore((state) => state.tycoon)
  const startShift = useStudySystemStore((state) => state.startTycoonShift)
  const selectTask = useStudySystemStore((state) => state.selectTycoonTask)
  const completeTask = useStudySystemStore((state) => state.completeTycoonTask)
  const advanceTime = useStudySystemStore((state) => state.advanceTycoonTime)
  const purchaseUpgrade = useStudySystemStore((state) => state.purchaseTycoonUpgrade)
  const finishShift = useStudySystemStore((state) => state.finishTycoonShift)
  const resetTycoon = useStudySystemStore((state) => state.resetTycoonProgress)

  const shift = tycoon.activeShift
  const bestTask = useMemo(() => getBestTycoonTask(shift), [shift])
  const selectedTask =
    shift?.tasks.find((task) => task.id === tycoon.selectedTaskId) ?? bestTask ?? shift?.tasks[0] ?? null
  const completedCount = shift?.tasks.filter((task) => task.status === 'completed').length ?? 0
  const riskCount = shift?.tasks.filter((task) => task.status === 'deteriorating' || task.status === 'failed').length ?? 0
  const xpToNext = 450 - (tycoon.xp % 450)

  if (!shift) {
    return (
      <NurseCommandBackdrop className="min-h-screen w-screen overflow-x-hidden px-5 py-5 lg:h-screen lg:overflow-hidden lg:px-10">
        <div className="mx-auto flex min-h-[calc(100vh-40px)] max-w-[1700px] flex-col gap-6">
          <TycoonHeader onBack={() => navigate('/')} tycoon={tycoon} />

          <main className="grid flex-1 gap-5 xl:grid-cols-[minmax(0,1.25fr)_minmax(420px,0.75fr)]">
            <section className="rounded-[1.5rem] border border-cyan-300/24 bg-[#061b31]/72 p-6 shadow-[0_0_54px_rgba(43,148,255,0.18)] backdrop-blur md:p-8">
              <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                <div className="max-w-4xl">
                  <p className="text-sm font-black uppercase tracking-[0.2em] text-cyan-300">Nurse Command Tycoon</p>
                  <h1 className="mt-4 text-[clamp(48px,5.8vw,104px)] font-black leading-[0.9] tracking-[-0.06em] text-white drop-shadow-[0_0_22px_rgba(148,207,255,0.58)]">
                    Build the safest unit on the floor.
                  </h1>
                  <p className="mt-5 max-w-3xl text-xl leading-8 text-sky-100/74">
                    Complete safe nursing tasks, earn money and XP, protect reputation, then upgrade your clinic.
                  </p>
                </div>
                <CommandPanel title="Starter Unit" subtitle="Playable" className="min-w-[320px]">
                  <div className="flex items-center gap-4">
                    <CommandIconBubble size="lg">
                      <Bed className="h-7 w-7" />
                    </CommandIconBubble>
                    <div>
                      <p className="text-xl font-black text-white">Fundamentals Clinic</p>
                      <p className="mt-1 text-sm text-sky-100/66">6 patients, priority calls, med safety, delegation.</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => startShift('fundamentals-clinic')}
                    className="nclex-btn-primary mt-5 w-full rounded-2xl px-5 py-3 text-base font-black"
                  >
                    Start Shift
                  </button>
                </CommandPanel>
              </div>

              <div className="mt-8 grid gap-4 md:grid-cols-3">
                <TycoonLaunchMetric icon={<BadgeDollarSign className="h-6 w-6" />} label="Money" value={`$${tycoon.money}`} detail="Buy upgrades after safe care." />
                <TycoonLaunchMetric icon={<ShieldCheck className="h-6 w-6" />} label="Patient Safety" value={`${tycoon.patientSafety}%`} detail="The real win condition." />
                <TycoonLaunchMetric icon={<Star className="h-6 w-6" />} label="Reputation" value={`${tycoon.reputation}%`} detail="Trust grows with clean shifts." />
              </div>

              <div className="mt-8 grid gap-4 lg:grid-cols-4">
                {tycoonUnits.map((unit) => {
                  const unlocked = tycoon.unlockedUnitIds.includes(unit.id)
                  return (
                    <div
                      key={unit.id}
                      className={clsx(
                        'rounded-2xl border p-4',
                        unlocked ? 'border-cyan-300/30 bg-sky-400/10' : 'border-sky-300/14 bg-white/[0.035] opacity-70',
                      )}
                    >
                      <p className="text-lg font-black text-white">{unit.name}</p>
                      <p className="mt-2 min-h-16 text-sm leading-5 text-sky-100/62">{unit.description}</p>
                      <p className={clsx('mt-4 text-xs font-black uppercase tracking-[0.14em]', unlocked ? 'text-emerald-300' : 'text-amber-300')}>
                        {unit.unlockRequirement}
                      </p>
                    </div>
                  )
                })}
              </div>
            </section>

            <CommandPanel title="How You Win" subtitle="Safety first">
              <div className="space-y-4">
                {[
                  ['Accept a shift', 'Start with Fundamentals Clinic and clear six real nursing tasks.'],
                  ['Choose safe actions', 'Correct clinical decisions pay money, XP, safety, and reputation.'],
                  ['Upgrade the unit', 'Spend earnings on monitors, med scanners, staff training, and EHR tools.'],
                  ['Unlock harder floors', 'Future units add acuity, more patients, and tighter time pressure.'],
                ].map(([title, detail], index) => (
                  <div key={title} className="flex gap-4 rounded-2xl border border-sky-300/18 bg-white/[0.04] p-4">
                    <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-sky-400/15 text-sm font-black text-sky-200">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-black text-white">{title}</p>
                      <p className="mt-1 text-sm text-sky-100/64">{detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CommandPanel>
          </main>
        </div>
      </NurseCommandBackdrop>
    )
  }

  return (
    <NurseCommandBackdrop className="min-h-screen w-screen overflow-x-hidden px-4 pb-24 pt-4 lg:px-7">
      <div className="flex min-h-[calc(100vh-32px)] flex-col gap-4">
        <TycoonHeader onBack={() => navigate('/')} tycoon={tycoon} compact />

        <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
          <HudStat icon={<BadgeDollarSign className="h-5 w-5" />} label="Money" value={`$${tycoon.money.toLocaleString()}`} progress={Math.min(100, tycoon.money / 12)} tone="green" />
          <HudStat icon={<Zap className="h-5 w-5" />} label={`Level ${tycoon.level}`} value={`${xpToNext} XP to next`} progress={(tycoon.xp % 450) / 4.5} />
          <HudStat icon={<Star className="h-5 w-5" />} label="Reputation" value={`${tycoon.reputation}%`} progress={tycoon.reputation} tone="green" />
          <HudStat icon={<ShieldCheck className="h-5 w-5" />} label="Patient Safety" value={`${tycoon.patientSafety}%`} progress={tycoon.patientSafety} tone={tycoon.patientSafety < 70 ? 'amber' : 'blue'} />
          <HudStat icon={<Users className="h-5 w-5" />} label="Staff Energy" value={`${tycoon.staffEnergy}%`} progress={tycoon.staffEnergy} tone={tycoon.staffEnergy < 35 ? 'amber' : 'blue'} />
          <HudStat icon={<Clock3 className="h-5 w-5" />} label="Shift Time" value={formatShiftTime(shift.shiftMinute)} progress={(shift.shiftMinute / 720) * 100} />
        </div>

        <main className="grid flex-1 gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
          <section className="grid gap-4 lg:grid-rows-[auto_minmax(0,1fr)]">
            <CommandPanel title="Current Priority" subtitle={bestTask ? urgencyStyles[bestTask.safetyRisk].label : 'Clear'}>
              <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-center">
                <div>
                  <p className="text-2xl font-black text-white">
                    {bestTask ? `${bestTask.patientName}: ${bestTask.title}` : 'All priority tasks are complete.'}
                  </p>
                  <p className="mt-2 text-sm text-sky-100/66">
                    {bestTask
                      ? `Deadline ${formatShiftTime(bestTask.deadlineMinute)}. Use nursing judgment: assess unstable patients before routine care.`
                      : 'Finish the shift or buy upgrades before the next run.'}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {bestTask ? (
                    <>
                      <CommandChip>{bestTask.room}</CommandChip>
                      <CommandChip tone={bestTask.safetyRisk === 'critical' ? 'orange' : bestTask.safetyRisk === 'watch' ? 'amber' : 'blue'}>
                        {bestTask.category.replaceAll('-', ' ')}
                      </CommandChip>
                    </>
                  ) : (
                    <CommandChip tone="green">Ready for summary</CommandChip>
                  )}
                </div>
              </div>
            </CommandPanel>

            <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.8fr)]">
              <CommandPanel title="2D Unit Map" subtitle="Click a room" className="overflow-hidden">
                <div className="relative h-[clamp(340px,42vh,500px)] overflow-hidden rounded-[1.2rem] border border-cyan-300/22 bg-[#03111f]/88 shadow-[inset_0_0_40px_rgba(32,127,255,0.18)]">
                  <div className="absolute inset-0 opacity-[0.16] [background-image:linear-gradient(rgba(88,169,255,0.32)_1px,transparent_1px),linear-gradient(90deg,rgba(88,169,255,0.28)_1px,transparent_1px)] [background-size:36px_36px]" />
                  <div className="absolute left-[35%] top-[40%] h-[22%] w-[30%] rounded-3xl border border-cyan-300/22 bg-sky-400/8 shadow-[0_0_35px_rgba(56,189,248,0.1)]" />
                  {mapRooms.map((room) => (
                    <div
                      key={room.label}
                      className="absolute rounded-2xl border border-sky-300/20 bg-white/[0.035] p-3 text-xs font-black uppercase tracking-[0.12em] text-sky-200/60"
                      style={{ left: `${room.x}%`, top: `${room.y}%`, width: `${room.w}%`, height: `${room.h}%` }}
                    >
                      {room.label}
                    </div>
                  ))}
                  <div className="absolute left-[43%] top-[46%] flex items-center gap-2 text-sm font-black text-white">
                    <Map className="h-5 w-5 text-sky-300" />
                    Command Desk
                  </div>
                  {shift.tasks.map((task) => (
                    <button
                      key={task.id}
                      type="button"
                      onClick={() => selectTask(task.id)}
                      className={clsx(
                        'absolute grid h-14 w-14 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border text-xs font-black shadow-[0_0_24px_rgba(56,189,248,0.22)] transition hover:scale-110',
                        getTaskTone(task),
                        task.id === selectedTask?.id ? 'ring-2 ring-sky-100/80' : '',
                        task.status === 'deteriorating' ? 'animate-pulse' : '',
                      )}
                      style={{ left: `${task.mapPosition.x}%`, top: `${task.mapPosition.y}%` }}
                      aria-label={`Select ${task.patientName}`}
                    >
                      {task.status === 'completed' ? <CheckCircle2 className="h-7 w-7" /> : task.room.slice(-3)}
                    </button>
                  ))}
                </div>
              </CommandPanel>

              <CommandPanel title="Patient Task Board" subtitle={`${completedCount}/6 complete`} className="overflow-hidden">
                <div className="max-h-[clamp(340px,42vh,500px)] space-y-3 overflow-y-auto pr-1">
                  {shift.tasks.map((task) => (
                    <button
                      key={task.id}
                      type="button"
                      onClick={() => selectTask(task.id)}
                      className={clsx(
                        'w-full rounded-2xl border p-4 text-left transition hover:border-sky-200/70',
                        task.id === selectedTask?.id ? 'border-sky-200 bg-sky-400/14' : 'border-sky-300/18 bg-white/[0.04]',
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-black text-white">{task.patientName}</p>
                          <p className="mt-1 text-sm text-sky-100/70">{task.title}</p>
                        </div>
                        <UrgencyBadge urgency={task.safetyRisk} status={task.status} />
                      </div>
                      <div className="mt-3 flex items-center justify-between text-xs font-bold uppercase tracking-[0.12em] text-sky-200/58">
                        <span>{task.room}</span>
                        <span>{formatShiftTime(task.deadlineMinute)}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </CommandPanel>
            </div>
          </section>

          <aside className="grid gap-4 xl:grid-rows-[auto_auto]">
            <CommandPanel title="Command Panel" subtitle={selectedTask ? selectedTask.status : 'Ready'} className="h-[clamp(310px,36vh,370px)] overflow-hidden">
              {selectedTask ? (
                <div className="flex h-full flex-col">
                  <div>
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-2xl font-black text-white">{selectedTask.patientName}</p>
                        <p className="mt-1 text-sm text-sky-100/64">{selectedTask.room} - {selectedTask.category.replaceAll('-', ' ')}</p>
                      </div>
                      <UrgencyBadge urgency={selectedTask.safetyRisk} status={selectedTask.status} />
                    </div>
                    <p className="mt-4 text-lg font-bold leading-7 text-sky-50">{selectedTask.title}</p>
                    <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                      <MiniReward label="Money" value={`+$${selectedTask.rewardMoney}`} />
                      <MiniReward label="XP" value={`+${selectedTask.rewardXp}`} />
                      <MiniReward label="Safety" value={`+${selectedTask.rewardSafety}`} />
                    </div>
                  </div>

                  <div className="mt-5 flex-1 space-y-3 overflow-y-auto pr-1">
                    {selectedTask.actions.map((action) => {
                      const disabled = selectedTask.status === 'completed' || selectedTask.status === 'failed'
                      const isCorrect = action.id === selectedTask.correctActionId
                      return (
                        <button
                          key={action.id}
                          type="button"
                          disabled={disabled}
                          onClick={() => completeTask(selectedTask.id, action.id)}
                          className={clsx(
                            'w-full rounded-2xl border p-4 text-left transition',
                            disabled
                              ? 'cursor-not-allowed border-sky-300/10 bg-white/[0.025] text-sky-100/40'
                              : 'border-sky-300/20 bg-white/[0.04] hover:-translate-y-0.5 hover:border-sky-200/70 hover:bg-sky-400/10',
                          )}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="font-black text-white">{action.label}</p>
                              <p className="mt-1 text-sm leading-5 text-sky-100/62">{action.description}</p>
                            </div>
                            <span className={clsx('rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em]', isCorrect ? 'border-emerald-300/40 text-emerald-200' : 'border-sky-300/24 text-sky-200/68')}>
                              {action.scope}
                            </span>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>
              ) : (
                <p className="text-sky-100/64">Select a task on the map to make a clinical decision.</p>
              )}
            </CommandPanel>

            <CommandPanel title="Upgrade Shop" subtitle="Spend earnings" className="h-[clamp(145px,17vh,185px)] overflow-hidden">
              <div className="max-h-[clamp(86px,10vh,122px)] space-y-3 overflow-y-auto pr-1">
                {tycoonUpgrades.map((upgrade) => {
                  const level = tycoon.upgrades[upgrade.id] ?? 0
                  const cost = getUpgradeCost(upgrade.cost, level)
                  const locked = level >= upgrade.maxLevel
                  const unaffordable = tycoon.money < cost
                  return (
                    <button
                      key={upgrade.id}
                      type="button"
                      disabled={locked || unaffordable}
                      onClick={() => purchaseUpgrade(upgrade.id)}
                      className={clsx(
                        'w-full rounded-2xl border p-3 text-left transition',
                        locked
                          ? 'border-emerald-300/26 bg-emerald-400/10'
                          : unaffordable
                            ? 'cursor-not-allowed border-sky-300/12 bg-white/[0.025] opacity-60'
                            : 'border-sky-300/20 bg-white/[0.04] hover:border-sky-200/70 hover:bg-sky-400/10',
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-black text-white">{upgrade.name}</p>
                          <p className="mt-1 text-xs leading-5 text-sky-100/62">{upgrade.description}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-black text-emerald-300">{locked ? 'MAX' : `$${cost}`}</p>
                          <p className="text-xs text-sky-200/56">Lv {level}/{upgrade.maxLevel}</p>
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            </CommandPanel>
          </aside>
        </main>

        <footer className="z-30 grid gap-3 rounded-3xl border border-cyan-300/18 bg-[#041426]/92 p-3 shadow-[0_-12px_40px_rgba(0,0,0,0.18)] backdrop-blur lg:fixed lg:bottom-4 lg:left-7 lg:right-7 lg:grid-cols-[1fr_auto] lg:items-center">
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => advanceTime(15)} className="nclex-btn-secondary rounded-xl px-4 py-2 text-sm font-black">
              Advance 15 min
            </button>
            <button type="button" onClick={finishShift} className="nclex-btn-primary rounded-xl px-4 py-2 text-sm font-black">
              Finish Shift
            </button>
            <button type="button" onClick={resetTycoon} className="rounded-xl border border-rose-300/30 bg-rose-400/10 px-4 py-2 text-sm font-black text-rose-200">
              Reset Tycoon
            </button>
          </div>
          <div className="flex items-center gap-4 rounded-2xl border border-sky-300/18 bg-white/[0.04] px-4 py-2">
            <EcgTrace className="h-10 w-36" />
            <p className="text-sm font-bold text-sky-100/72">
              {riskCount ? `${riskCount} patient${riskCount === 1 ? '' : 's'} need reassessment.` : 'Unit stable. Keep the loop closed.'}
            </p>
          </div>
        </footer>

        {shift.status === 'finished' && shift.payoutSummary ? (
          <div className="fixed inset-0 z-40 grid place-items-center bg-slate-950/70 p-4 backdrop-blur">
            <div className="w-full max-w-3xl rounded-[1.6rem] border border-cyan-300/30 bg-[#071d34]/95 p-6 shadow-[0_0_70px_rgba(43,148,255,0.35)]">
              <p className="text-sm font-black uppercase tracking-[0.18em] text-cyan-300">End of Shift Summary</p>
              <h2 className="mt-2 text-4xl font-black text-white">Payout complete.</h2>
              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                <MiniReward label="Tasks Completed" value={`${shift.payoutSummary.completedTasks}/6`} />
                <MiniReward label="Money Earned" value={`$${shift.payoutSummary.moneyEarned}`} />
                <MiniReward label="XP Earned" value={`+${shift.payoutSummary.xpEarned}`} />
                <MiniReward label="Mistakes" value={`${shift.payoutSummary.mistakes}`} />
                <MiniReward label="Safety Score" value={`${shift.payoutSummary.safetyScore}%`} />
                <MiniReward label="Reputation" value={`${shift.payoutSummary.reputationChange >= 0 ? '+' : ''}${shift.payoutSummary.reputationChange}`} />
              </div>
              <p className="mt-5 rounded-2xl border border-sky-300/18 bg-white/[0.04] p-4 text-sky-100/76">
                {shift.payoutSummary.recommendation}
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <button type="button" onClick={() => startShift('fundamentals-clinic')} className="nclex-btn-primary rounded-xl px-5 py-3 font-black">
                  Start Next Shift
                </button>
                <button type="button" onClick={() => navigate('/')} className="nclex-btn-secondary rounded-xl px-5 py-3 font-black">
                  Return Home
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </NurseCommandBackdrop>
  )
}

function TycoonHeader({
  onBack,
  tycoon,
  compact = false,
}: {
  onBack: () => void
  tycoon: ReturnType<typeof useStudySystemStore.getState>['tycoon']
  compact?: boolean
}) {
  return (
    <header className="flex shrink-0 flex-col gap-4 border-b border-cyan-300/18 pb-4 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={onBack}
          className="grid h-11 w-11 place-items-center rounded-2xl border border-sky-300/24 bg-white/5 text-sky-100/74 transition hover:border-sky-200/70 hover:text-white"
          aria-label="Back to launch menu"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <CommandBrand compact={compact} label="Nurse Command Tycoon" />
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <HudStat icon={<BadgeDollarSign className="h-5 w-5" />} label="Bank" value={`$${tycoon.money.toLocaleString()}`} progress={Math.min(100, tycoon.money / 12)} tone="green" />
        <HudStat icon={<Zap className="h-5 w-5" />} label={`Lv. ${tycoon.level}`} value={`${tycoon.xp.toLocaleString()} XP`} progress={(tycoon.xp % 450) / 4.5} />
        <HudStat icon={<ShieldCheck className="h-5 w-5" />} label="Safety" value={`${tycoon.patientSafety}%`} progress={tycoon.patientSafety} />
      </div>
    </header>
  )
}

function HudStat({
  icon,
  label,
  value,
  progress,
  tone = 'blue',
}: {
  icon: React.ReactNode
  label: string
  value: string
  progress: number
  tone?: 'blue' | 'green' | 'amber'
}) {
  return (
    <div className="rounded-2xl border border-cyan-300/20 bg-[#071d34]/78 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
      <div className="flex items-center gap-3">
        <CommandIconBubble size="sm" tone={tone}>{icon}</CommandIconBubble>
        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-[0.12em] text-sky-200/58">{label}</p>
          <p className="truncate text-base font-black text-white">{value}</p>
        </div>
      </div>
      <CommandProgress value={progress} tone={tone} className="mt-3" />
    </div>
  )
}

function TycoonLaunchMetric({
  icon,
  label,
  value,
  detail,
}: {
  icon: React.ReactNode
  label: string
  value: string
  detail: string
}) {
  return (
    <div className="rounded-2xl border border-sky-300/20 bg-white/[0.04] p-4">
      <div className="flex items-center gap-3">
        <CommandIconBubble>{icon}</CommandIconBubble>
        <div>
          <p className="text-xs font-black uppercase tracking-[0.14em] text-sky-200/62">{label}</p>
          <p className="mt-1 text-3xl font-black text-white">{value}</p>
        </div>
      </div>
      <p className="mt-3 text-sm text-sky-100/64">{detail}</p>
    </div>
  )
}

function UrgencyBadge({
  urgency,
  status,
}: {
  urgency: TycoonTaskUrgency
  status: TycoonTask['status']
}) {
  if (status === 'completed') {
    return (
      <span className="inline-flex items-center gap-2 rounded-full border border-emerald-300/40 bg-emerald-400/12 px-3 py-1 text-xs font-black uppercase tracking-[0.12em] text-emerald-200">
        <span className="h-2 w-2 rounded-full bg-emerald-300" />
        Complete
      </span>
    )
  }

  if (status === 'failed' || status === 'deteriorating') {
    return (
      <span className="inline-flex items-center gap-2 rounded-full border border-rose-300/45 bg-rose-400/14 px-3 py-1 text-xs font-black uppercase tracking-[0.12em] text-rose-200">
        <span className="h-2 w-2 rounded-full bg-rose-300" />
        Deteriorating
      </span>
    )
  }

  const style = urgencyStyles[urgency]
  return (
    <span className={clsx('inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-black uppercase tracking-[0.12em]', style.className)}>
      <span className={clsx('h-2 w-2 rounded-full', style.dot)} />
      {style.label}
    </span>
  )
}

function MiniReward({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-sky-300/16 bg-white/[0.04] p-3">
      <p className="text-[10px] font-black uppercase tracking-[0.14em] text-sky-200/54">{label}</p>
      <p className="mt-1 text-lg font-black text-white">{value}</p>
    </div>
  )
}
