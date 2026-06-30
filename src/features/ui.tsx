import { AnimatePresence, motion } from 'framer-motion'
import { Link, useNavigate } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Check,
  CheckCircle2,
  Clock3,
  Eye,
  Flag,
  Lightbulb,
  ShieldCheck,
  Target,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { clsx } from 'clsx'
import type { ActiveSession, ConfidenceLevel, MasteryLevel } from '../app/types'
import { useStudySystemStore } from '../app/store'
import {
  contentFeedbackReasonLabels,
  contentFeedbackReasons,
  recordContentFeedback,
  trackContentFeedbackOpened,
  type ContentFeedbackReason,
} from '../services/content-feedback'
import { trackAppEvent } from '../services/analytics-client'
import {
  getQuestionCategoryBreakdown,
  getMissReason,
  getQuestionTutorInsight,
  getQuestionResult,
  getSessionAccuracy,
  questionLookup,
} from '../services/study-system'

export function PageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string
  title: string
  description: string
  action?: React.ReactNode
}) {
  return (
    <div className="mb-7 overflow-hidden rounded-[1.35rem] border border-cyan-300/20 bg-[#061b31]/55 px-5 py-5 shadow-[0_0_48px_rgba(0,98,180,0.14)] backdrop-blur md:px-7 lg:flex lg:items-start lg:justify-between lg:gap-6">
      <div className="max-w-3xl">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-sky-300">
          {eyebrow}
        </p>
        <h2 className="mt-2 text-[clamp(2.1rem,3.2vw,4.6rem)] font-black leading-[0.95] tracking-[-0.05em] text-white drop-shadow-[0_0_16px_rgba(148,207,255,0.42)]">
          {title}
        </h2>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-sky-100/72 md:text-base">
          {description}
        </p>
      </div>
      {action ? <div className="mt-5 shrink-0 lg:mt-0">{action}</div> : null}
    </div>
  )
}

export function SectionHeading({
  title,
  description,
  action,
}: {
  title: string
  description?: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
      <div>
        <h3 className="text-xl font-black tracking-[-0.03em] text-white md:text-2xl">{title}</h3>
        {description ? (
          <p className="mt-1 text-sm leading-6 text-sky-100/64">{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  )
}

export function Surface({
  className,
  style,
  children,
}: {
  className?: string
  style?: React.CSSProperties
  children: React.ReactNode
}) {
  return (
    <section className={clsx('nclex-surface rounded-[1.15rem] p-5 md:p-6', className)} style={style}>
      {children}
    </section>
  )
}

export function PageStack({
  className,
  children,
}: {
  className?: string
  children: React.ReactNode
}) {
  return <div className={clsx('space-y-5 md:space-y-6', className)}>{children}</div>
}

export function FocusPanel({
  className,
  style,
  children,
}: {
  className?: string
  style?: React.CSSProperties
  children: React.ReactNode
}) {
  return <Surface className={clsx('overflow-hidden p-0', className)} style={style}>{children}</Surface>
}

type CommandTone = 'cyan' | 'emerald' | 'amber' | 'rose' | 'slate' | 'violet'

const commandToneStyles: Record<CommandTone, {
  badge: string
  icon: string
  stat: string
  line: string
  action: string
}> = {
  cyan: {
    badge: 'border-cyan-200/26 bg-cyan-300/10 text-cyan-100',
    icon: 'border-cyan-200/30 bg-cyan-300/14 text-cyan-100',
    stat: 'border-cyan-200/22 bg-cyan-300/[0.08] text-cyan-100',
    line: 'bg-cyan-300',
    action: 'border-cyan-200/24 bg-cyan-300/[0.07] hover:border-cyan-200/45 hover:bg-cyan-300/[0.11]',
  },
  emerald: {
    badge: 'border-emerald-200/26 bg-emerald-300/10 text-emerald-100',
    icon: 'border-emerald-200/30 bg-emerald-300/14 text-emerald-100',
    stat: 'border-emerald-200/22 bg-emerald-300/[0.08] text-emerald-100',
    line: 'bg-emerald-300',
    action: 'border-emerald-200/24 bg-emerald-300/[0.07] hover:border-emerald-200/45 hover:bg-emerald-300/[0.11]',
  },
  amber: {
    badge: 'border-amber-200/26 bg-amber-300/10 text-amber-100',
    icon: 'border-amber-200/30 bg-amber-300/14 text-amber-100',
    stat: 'border-amber-200/22 bg-amber-300/[0.08] text-amber-100',
    line: 'bg-amber-300',
    action: 'border-amber-200/24 bg-amber-300/[0.07] hover:border-amber-200/45 hover:bg-amber-300/[0.11]',
  },
  rose: {
    badge: 'border-rose-200/26 bg-rose-300/10 text-rose-100',
    icon: 'border-rose-200/30 bg-rose-300/14 text-rose-100',
    stat: 'border-rose-200/22 bg-rose-300/[0.08] text-rose-100',
    line: 'bg-rose-300',
    action: 'border-rose-200/24 bg-rose-300/[0.07] hover:border-rose-200/45 hover:bg-rose-300/[0.11]',
  },
  slate: {
    badge: 'border-slate-200/18 bg-slate-300/[0.07] text-slate-100',
    icon: 'border-slate-200/20 bg-slate-300/12 text-slate-100',
    stat: 'border-slate-200/18 bg-slate-300/[0.07] text-slate-100',
    line: 'bg-slate-300',
    action: 'border-slate-200/16 bg-slate-300/[0.055] hover:border-slate-200/35 hover:bg-slate-300/[0.09]',
  },
  violet: {
    badge: 'border-fuchsia-200/22 bg-fuchsia-300/10 text-fuchsia-100',
    icon: 'border-fuchsia-200/26 bg-fuchsia-300/14 text-fuchsia-100',
    stat: 'border-fuchsia-200/20 bg-fuchsia-300/[0.08] text-fuchsia-100',
    line: 'bg-fuchsia-300',
    action: 'border-fuchsia-200/22 bg-fuchsia-300/[0.07] hover:border-fuchsia-200/40 hover:bg-fuchsia-300/[0.11]',
  },
}

export function CommandBadge({
  children,
  icon,
  tone = 'cyan',
}: {
  children: React.ReactNode
  icon?: React.ReactNode
  tone?: CommandTone
}) {
  return (
    <span className={clsx('inline-flex min-h-8 items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-black', commandToneStyles[tone].badge)}>
      {icon}
      {children}
    </span>
  )
}

export function CommandStatTile({
  label,
  value,
  detail,
  icon,
  tone = 'cyan',
}: {
  label: string
  value: string
  detail: string
  icon?: React.ReactNode
  tone?: CommandTone
}) {
  return (
    <div className={clsx('min-w-0 rounded-xl border px-2 py-2.5 sm:px-3 sm:py-3', commandToneStyles[tone].stat)}>
      <div className="flex items-center gap-1.5 text-[0.68rem] font-black uppercase sm:gap-2 sm:text-xs">
        {icon ? <span className="hidden sm:inline-flex">{icon}</span> : null}
        <span className="min-w-0 break-words leading-tight">{label}</span>
      </div>
      <p className="mt-1.5 min-w-0 break-words text-xl font-black leading-tight text-white sm:mt-2 sm:text-2xl">{value}</p>
      <p className="min-w-0 break-words text-[0.68rem] font-semibold leading-tight text-sky-100/58 sm:text-xs">{detail}</p>
    </div>
  )
}

export function CommandPageIntro({
  title,
  description,
  badges,
  action,
  aside,
  stats,
}: {
  title: string
  description: string
  badges?: React.ReactNode
  action?: React.ReactNode
  aside?: React.ReactNode
  stats?: React.ReactNode
}) {
  return (
    <FocusPanel>
      <div className="relative overflow-hidden bg-[#061c31] p-4 text-white sm:p-5 md:p-6">
        <div className="pointer-events-none absolute inset-0 opacity-35 [background-image:linear-gradient(rgba(125,211,252,0.12)_1px,transparent_1px),linear-gradient(90deg,rgba(125,211,252,0.09)_1px,transparent_1px)] [background-size:38px_38px]" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,#22d3ee_0%,#34d399_38%,#fbbf24_72%,#f472b6_100%)]" />
        <div className={clsx('relative grid gap-5', aside && 'lg:grid-cols-[minmax(0,1fr)_250px] lg:items-stretch')}>
          <div className="min-w-0">
            {badges ? <div className="flex flex-wrap gap-2">{badges}</div> : null}
            <h2 className={clsx('max-w-3xl font-black leading-[1.08] text-white', badges ? 'mt-5' : '', 'text-[2rem] sm:text-3xl md:text-4xl')}>
              {title}
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-sky-100/78">{description}</p>
            {action ? <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">{action}</div> : null}
          </div>
          {aside ? <div className="hidden sm:block">{aside}</div> : null}
        </div>
        {stats ? <div className="relative mt-5 grid grid-cols-3 gap-2 border-t border-white/10 pt-4">{stats}</div> : null}
      </div>
    </FocusPanel>
  )
}

export function CommandActionCard({
  title,
  description,
  meta,
  icon,
  tone = 'cyan',
  action,
  onClick,
  to,
}: {
  title: string
  description: string
  meta?: string
  icon?: React.ReactNode
  tone?: CommandTone
  action?: React.ReactNode
  onClick?: () => void
  to?: string
}) {
  const content = (
    <>
      <span className={clsx('absolute inset-y-0 left-0 w-1', commandToneStyles[tone].line)} />
      <div className="flex items-start gap-3">
        {icon ? (
          <span className={clsx('inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border', commandToneStyles[tone].icon)}>
            {icon}
          </span>
        ) : null}
        <span className="min-w-0 flex-1">
          {meta ? <span className="block text-xs font-black uppercase text-sky-100/54">{meta}</span> : null}
          <span className="block text-sm font-black text-white">{title}</span>
          <span className="mt-1 block text-sm leading-6 text-sky-100/62">{description}</span>
        </span>
        {action ? <span className="shrink-0 text-sm font-black text-cyan-100">{action}</span> : null}
      </div>
    </>
  )
  const className = clsx('relative block min-h-[6.25rem] w-full overflow-hidden rounded-[1rem] border p-4 text-left transition focus:outline-none focus:ring-2 focus:ring-cyan-200/45', commandToneStyles[tone].action)

  if (to) {
    return (
      <Link to={to} className={className}>
        {content}
      </Link>
    )
  }

  return (
    <button type="button" onClick={onClick} className={className}>
      {content}
    </button>
  )
}

export function NextActionPanel({
  eyebrow = 'Next action',
  title,
  description,
  primary,
  secondary,
  tone = 'cyan',
}: {
  eyebrow?: string
  title: string
  description: string
  primary: React.ReactNode
  secondary?: React.ReactNode
  tone?: CommandTone
}) {
  const toneClasses = {
    cyan: 'border-cyan-200/26 bg-cyan-300/[0.08]',
    emerald: 'border-emerald-200/26 bg-emerald-300/[0.08]',
    amber: 'border-amber-200/26 bg-amber-300/[0.08]',
    rose: 'border-rose-200/26 bg-rose-300/[0.08]',
    slate: 'border-slate-200/18 bg-slate-300/[0.07]',
    violet: 'border-fuchsia-200/22 bg-fuchsia-300/[0.08]',
  }

  return (
    <section className={clsx('rounded-[1.15rem] border p-4 text-white md:p-5', toneClasses[tone])}>
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-sky-100/66">
            {eyebrow}
          </p>
          <h3 className="mt-2 text-2xl font-black tracking-normal text-white md:text-3xl">{title}</h3>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-sky-100/68">{description}</p>
        </div>
        <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:flex-wrap">
          {primary}
          {secondary}
        </div>
      </div>
    </section>
  )
}

export function DetailGrid({
  className,
  children,
}: {
  className?: string
  children: React.ReactNode
}) {
  return <div className={clsx('grid gap-5 lg:grid-cols-2', className)}>{children}</div>
}

export function QuickMetric({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="rounded-[18px] border border-[var(--nclex-border)] bg-white p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--nclex-blue)]">{label}</p>
      <p className="mt-2 font-serif text-3xl text-[var(--nclex-text)]">{value}</p>
      <p className="mt-2 text-sm text-[var(--nclex-text-muted)]">{detail}</p>
    </div>
  )
}

export function MetricChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[18px] border border-[var(--nclex-border)] bg-[var(--nclex-card-muted)] p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--nclex-text-muted)]">{label}</p>
      <p className="mt-2 font-serif text-3xl text-[var(--nclex-text)]">{value}</p>
    </div>
  )
}

export function MiniSparkline({
  points,
  color = 'var(--nclex-blue)',
}: {
  points?: number[]
  color?: string
}) {
  const data = points ?? [14, 10, 12, 8, 9, 13, 11, 15]
  const width = 90
  const height = 28
  const max = Math.max(...data)
  const min = Math.min(...data)
  const range = Math.max(1, max - min)
  const path = data
    .map((value, index) => {
      const x = (index / Math.max(1, data.length - 1)) * width
      const y = height - ((value - min) / range) * (height - 4) - 2
      return `${index === 0 ? 'M' : 'L'} ${x} ${y}`
    })
    .join(' ')

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-7 w-[92px]" fill="none" aria-hidden="true">
      <path d={path} stroke={color} strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  )
}

export function StatCard({
  label,
  value,
  detail,
  tone = 'neutral',
  icon,
  trend,
  statusLabel,
  progressValue,
  sparkline,
}: {
  label: string
  value: string
  detail: string
  tone?: 'neutral' | 'success' | 'warning' | 'critical'
  icon?: React.ReactNode
  trend?: string
  statusLabel?: string
  progressValue?: number
  sparkline?: number[]
}) {
  const toneMap = {
    neutral: {
      chip: 'nclex-chip nclex-chip-info',
      icon: 'bg-[var(--nclex-blue-soft)] text-[var(--nclex-blue)]',
      progress: 'blue' as const,
      line: 'var(--nclex-blue)',
    },
    success: {
      chip: 'nclex-chip nclex-chip-success',
      icon: 'bg-[var(--nclex-success-soft)] text-[var(--nclex-success)]',
      progress: 'green' as const,
      line: 'var(--nclex-success)',
    },
    warning: {
      chip: 'nclex-chip nclex-chip-warning',
      icon: 'bg-[var(--nclex-warning-soft)] text-[var(--nclex-warning)]',
      progress: 'amber' as const,
      line: 'var(--nclex-warning)',
    },
    critical: {
      chip: 'nclex-chip nclex-chip-danger',
      icon: 'bg-[var(--nclex-danger-soft)] text-[var(--nclex-danger)]',
      progress: 'red' as const,
      line: 'var(--nclex-danger)',
    },
  }

  const theme = toneMap[tone]

  return (
    <Surface className="h-full p-4 md:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          {icon ? (
            <div className={clsx('inline-flex h-11 w-11 items-center justify-center rounded-2xl', theme.icon)}>
              {icon}
            </div>
          ) : null}
          <div>
            <p className="text-sm font-black text-white">{label}</p>
            <p className="mt-1 text-xs leading-5 text-sky-100/60">{detail}</p>
          </div>
        </div>
        <span className={theme.chip}>{statusLabel ?? (tone === 'neutral' ? 'Track' : tone)}</span>
      </div>
      <div className="mt-5 flex items-end justify-between gap-3">
        <div>
          <p className="text-3xl font-black text-white md:text-[2rem]">{value}</p>
          {trend ? (
            <p className="mt-1 text-xs font-semibold text-sky-100/60">{trend}</p>
          ) : null}
        </div>
        <MiniSparkline points={sparkline} color={theme.line} />
      </div>
      {typeof progressValue === 'number' ? (
        <div className="mt-4">
          <ProgressBar value={progressValue} tone={theme.progress} />
        </div>
      ) : null}
    </Surface>
  )
}

export function ProgressBar({
  value,
  className,
  tone = 'blue',
}: {
  value: number
  className?: string
  tone?: 'blue' | 'green' | 'amber' | 'red'
}) {
  const fillClass = {
    blue: 'bg-[linear-gradient(90deg,#16b7ff_0%,#55c6ff_100%)]',
    green: 'bg-[linear-gradient(90deg,#34d399_0%,#55c6ff_100%)]',
    amber: 'bg-[linear-gradient(90deg,#fbbf24_0%,#55c6ff_100%)]',
    red: 'bg-[linear-gradient(90deg,#fb7185_0%,#fca5a5_100%)]',
  }[tone]

  return (
    <div
      className={clsx('h-2.5 overflow-hidden rounded-full bg-sky-300/14', className)}
      role="progressbar"
      aria-valuenow={Math.round(Math.max(0, Math.min(1, value)) * 100)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${Math.max(4, value * 100)}%` }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className={clsx('h-full rounded-full shadow-[0_0_14px_currentColor]', fillClass)}
      />
    </div>
  )
}

export function CircularProgress({
  value,
  label,
  detail,
  tone = 'green',
}: {
  value: number
  label: string
  detail?: string
  tone?: 'blue' | 'green' | 'amber'
}) {
  const size = 134
  const stroke = 10
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const dashOffset = circumference - Math.max(0, Math.min(1, value)) * circumference
  const strokeColor =
    tone === 'green' ? '#10b981' : tone === 'amber' ? '#f59e0b' : '#2a7de1'

  return (
    <div className="flex flex-col items-center text-center">
      <div
        className="relative h-[134px] w-[134px]"
        role="progressbar"
        aria-label={`${label} ${Math.round(Math.max(0, Math.min(1, value)) * 100)}%`}
        aria-valuenow={Math.round(Math.max(0, Math.min(1, value)) * 100)}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <svg viewBox={`0 0 ${size} ${size}`} className="h-full w-full -rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="rgba(125,211,252,0.14)"
            strokeWidth={stroke}
            fill="none"
          />
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={strokeColor}
            strokeWidth={stroke}
            strokeLinecap="round"
            fill="none"
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: dashOffset }}
            transition={{ duration: 0.7, ease: 'easeOut' }}
            strokeDasharray={circumference}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <p className="text-3xl font-black text-white">{Math.round(value * 100)}%</p>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-sky-200/64">
            {label}
          </p>
        </div>
      </div>
      {detail ? <p className="mt-3 text-sm font-semibold text-emerald-300">{detail}</p> : null}
    </div>
  )
}

export function ChecklistItem({
  label,
  completed,
  meta,
}: {
  label: string
  completed: boolean
  meta?: string
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl px-1 py-1.5">
      <div className="flex items-center gap-3">
        <span
          className={clsx(
            'inline-flex h-5 w-5 items-center justify-center rounded-full border',
            completed
              ? 'border-emerald-300/60 bg-emerald-300/14 text-emerald-300'
              : 'border-sky-300/30 bg-white/5 text-transparent',
          )}
        >
          <Check className="h-3.5 w-3.5" />
        </span>
        <span className="text-sm text-sky-100/76">{label}</span>
      </div>
      {meta ? <span className="text-xs font-medium text-sky-200/56">{meta}</span> : null}
    </div>
  )
}

export function MasteryPill({ mastery }: { mastery: MasteryLevel }) {
  const classes = {
    fragile: 'nclex-chip nclex-chip-danger',
    developing: 'nclex-chip nclex-chip-warning',
    strong: 'nclex-chip nclex-chip-success',
  }
  const label = {
    fragile: 'Needs focus',
    developing: 'Improving',
    strong: 'Strong',
  }

  return <span className={clsx('inline-flex', classes[mastery])}>{label[mastery]}</span>
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string
  description: string
  action?: React.ReactNode
}) {
  return (
    <Surface className="border-dashed border-sky-300/30 bg-[#03101f]/60">
      <div className="flex flex-col items-start gap-4">
        <div className="inline-flex rounded-2xl border border-sky-300/30 bg-sky-400/12 p-3 text-sky-300 shadow-[0_0_24px_rgba(56,189,248,0.18)]">
          <Lightbulb className="h-5 w-5" />
        </div>
        <div>
          <h3 className="text-2xl font-black text-white">{title}</h3>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-sky-100/64">{description}</p>
        </div>
        {action}
      </div>
    </Surface>
  )
}

const confidenceTone: Record<ConfidenceLevel, string> = {
  low: 'border-amber-300/34 bg-amber-300/[0.08] text-amber-100 hover:bg-amber-300/14',
  medium: 'border-cyan-300/34 bg-cyan-300/[0.08] text-cyan-100 hover:bg-cyan-300/14',
  high: 'border-emerald-300/34 bg-emerald-300/[0.08] text-emerald-100 hover:bg-emerald-300/14',
}

const practiceActionButton = {
  submit:
    'inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl border border-amber-100/48 bg-[linear-gradient(180deg,#fbbf24_0%,#b77912_100%)] px-5 py-3 text-sm font-black text-white shadow-[0_14px_34px_rgba(251,191,36,0.2)] transition hover:brightness-110 focus:outline-none focus:ring-4 focus:ring-amber-300/20 disabled:cursor-not-allowed disabled:border-slate-400/20 disabled:bg-slate-500/18 disabled:text-slate-200/45 disabled:shadow-none',
  next:
    'inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl border border-cyan-100/42 bg-[linear-gradient(180deg,#22d3ee_0%,#0e7490_100%)] px-5 py-3 text-sm font-black text-white shadow-[0_14px_34px_rgba(34,211,238,0.18)] transition hover:brightness-110 focus:outline-none focus:ring-4 focus:ring-cyan-300/20',
  finish:
    'inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl border border-emerald-100/42 bg-[linear-gradient(180deg,#34d399_0%,#047857_100%)] px-5 py-3 text-sm font-black text-white shadow-[0_14px_34px_rgba(52,211,153,0.18)] transition hover:brightness-110 focus:outline-none focus:ring-4 focus:ring-emerald-300/20',
  review:
    'inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl border border-violet-200/30 bg-violet-300/[0.08] px-5 py-3 text-sm font-black text-violet-100 shadow-[0_12px_28px_rgba(124,58,237,0.12)] transition hover:border-violet-100/56 hover:bg-violet-300/14 focus:outline-none focus:ring-4 focus:ring-violet-300/18',
}

export function QuestionSessionRunner({
  session,
  modeLabel,
  onExit,
}: {
  session: ActiveSession
  modeLabel: string
  onExit: () => void
}) {
  const submitCurrentResponse = useStudySystemStore((state) => state.submitCurrentResponse)
  const nextQuestion = useStudySystemStore((state) => state.nextQuestion)
  const previousQuestion = useStudySystemStore((state) => state.previousQuestion)
  const goToSessionQuestion = useStudySystemStore((state) => state.goToSessionQuestion)
  const finishSession = useStudySystemStore((state) => state.finishSession)
  const startPracticeSession = useStudySystemStore((state) => state.startPracticeSession)
  const attempts = useStudySystemStore((state) => state.attempts)
  const profile = useStudySystemStore((state) => state.profile)
  const authUser = useStudySystemStore((state) => state.authUser)
  const isDemoMode = useStudySystemStore((state) => state.isDemoMode)
  const navigate = useNavigate()
  const questionId = session.questionIds[session.currentIndex]
  const question = questionId ? questionLookup[questionId] : undefined
  const existingResponse = session.responses.find((response) => response.questionId === questionId)
  const [selectedAnswers, setSelectedAnswers] = useState<string[]>(existingResponse?.selectedAnswer ?? [])
  const [submitted, setSubmitted] = useState(Boolean(existingResponse))
  const [showRationale, setShowRationale] = useState(Boolean(existingResponse))
  const [flagged, setFlagged] = useState(existingResponse?.flagged ?? false)
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null)
  const [feedbackOpen, setFeedbackOpen] = useState(false)
  const [feedbackReason, setFeedbackReason] = useState<ContentFeedbackReason>('wrong_answer')
  const [feedbackNote, setFeedbackNote] = useState('')
  const [feedbackSubmittedId, setFeedbackSubmittedId] = useState<string | null>(null)
  const isLastQuestion = session.currentIndex === session.questionIds.length - 1
  const currentIsCorrect = question ? getQuestionResult(questionId, selectedAnswers) : false
  useEffect(() => {
    if (!session.config.timed || !session.config.timeLimitMinutes || session.endedAt) return
    const totalSeconds = session.config.timeLimitMinutes * 60
    const tick = () => {
      const elapsed = Math.floor((Date.now() - new Date(session.startedAt).getTime()) / 1000)
      const remaining = Math.max(0, totalSeconds - elapsed)
      setRemainingSeconds(remaining)
      if (remaining === 0) finishSession()
    }
    tick()
    const timer = window.setInterval(tick, 1000)
    return () => window.clearInterval(timer)
  }, [finishSession, session.config.timeLimitMinutes, session.config.timed, session.endedAt, session.startedAt])

  const score = useMemo(() => Math.round(getSessionAccuracy(session) * 100), [session])
  const breakdown = useMemo(() => {
    const sessionAttempts = attempts.filter((attempt) => session.questionIds.includes(attempt.questionId))
    return getQuestionCategoryBreakdown(session.questionIds, sessionAttempts)
  }, [attempts, session.questionIds])
  const getAttemptForResponse = (response: { questionId: string; submittedAt: string }) =>
    attempts.find(
      (attempt) =>
        attempt.questionId === response.questionId &&
        attempt.completedAt === response.submittedAt,
    ) ?? attempts.toReversed().find((attempt) => attempt.questionId === response.questionId)

  if (session.endedAt) {
    const missedQuestions = session.responses.filter((response) => !response.isCorrect)
    const correctCount = session.responses.filter((response) => response.isCorrect).length
    const topMissedQuestion = missedQuestions[0] ? questionLookup[missedQuestions[0].questionId] : null
    const topMissedAttempt = missedQuestions[0] ? getAttemptForResponse(missedQuestions[0]) : null
    const topRemediation = topMissedAttempt?.engineRemediationEvents?.[0]
    const topMissReason = missedQuestions[0] && questionLookup[missedQuestions[0].questionId]
      ? getMissReason(missedQuestions[0].questionId, missedQuestions[0].selectedAnswer)
      : null
    const sessionTakeaway = topRemediation?.nextActionCopy ??
      (topMissedQuestion
        ? `Train ${topMissedQuestion.category} before adding more mixed volume.`
        : 'No repair needed from this set. Keep the same pace with a short mixed session.')
    const startRepairSet = () => {
      if (!topMissedQuestion) return
      startPracticeSession({
        category: topMissedQuestion.category,
        difficulty: 'adaptive',
        questionCount: 5,
        format: 'mixed',
      })
      navigate('/practice-questions')
    }

    return (
      <div className="space-y-6">
        <Surface className="overflow-hidden p-0">
          <div className="border-b border-[var(--nclex-border)] bg-[linear-gradient(135deg,#04213d_0%,#07172b_100%)] px-5 py-5 text-white md:px-6">
            <div className="grid gap-5 md:grid-cols-[1.15fr_0.85fr] md:items-center">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-cyan-200">
                  {modeLabel}
                </p>
                <h3 className="mt-2 text-3xl font-black tracking-[-0.04em] md:text-5xl">Session complete.</h3>
                <p className="mt-3 max-w-2xl text-sm leading-7 text-sky-100/78">
                  {sessionTakeaway}
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-3 md:grid-cols-1">
                <div className="rounded-2xl border border-white/15 bg-white/10 p-4">
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-sky-100/65">Score</p>
                  <p className="mt-2 text-3xl font-black">{score}%</p>
                  <p className="text-sm font-semibold text-sky-100/70">{correctCount} correct</p>
                </div>
                <div className="rounded-2xl border border-white/15 bg-white/10 p-4">
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-sky-100/65">Missed</p>
                  <p className="mt-2 text-3xl font-black">{missedQuestions.length}</p>
                  <p className="text-sm font-semibold text-sky-100/70">review items</p>
                </div>
                <div className="rounded-2xl border border-white/15 bg-white/10 p-4">
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-sky-100/65">Next</p>
                  <p className="mt-2 text-lg font-black">{topMissedQuestion?.category ?? 'Mixed set'}</p>
                </div>
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:flex-wrap md:px-6">
            {topMissedQuestion ? (
              <button
                type="button"
                onClick={startRepairSet}
                className="nclex-btn-primary inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-black"
              >
                Repair {topMissedQuestion.category}
                <ArrowRight className="h-4 w-4" />
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => navigate('/weak-areas')}
              className="nclex-btn-secondary inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-black"
            >
              Open remediation
            </button>
            <button
              type="button"
              onClick={onExit}
              className="nclex-btn-secondary min-h-[48px] rounded-xl px-4 py-2.5 text-sm font-black"
            >
              Close session
            </button>
          </div>
        </Surface>

        {topMissedQuestion ? (
          <Surface className="border-amber-300/30 bg-amber-300/10">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-1 h-5 w-5 shrink-0 text-amber-300" />
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-amber-200">
                  Why it matters
                </p>
                <h4 className="mt-2 text-2xl font-black tracking-[-0.03em] text-white">
                  {topMissedQuestion?.category ?? 'Pattern detected from this quiz'}
                </h4>
                <p className="mt-2 text-sm leading-7 text-sky-100/72">
                  {topMissReason ?? topRemediation?.nextActionCopy ?? `This miss belongs to ${topMissedQuestion.category}. Review the rationale, then answer a nearby transfer question before moving on.`}
                </p>
              </div>
            </div>
          </Surface>
        ) : null}

        <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <Surface>
            <SectionHeading title="Category breakdown" />
            <div className="mt-5 space-y-5">
              {breakdown.map((item) => (
                <div key={item.category}>
                  <div className="mb-2 flex items-center justify-between gap-4">
                    <span className="text-sm font-semibold text-[var(--nclex-text-secondary)]">
                      {item.category}
                    </span>
                    <span className="text-sm text-[var(--nclex-text-muted)]">
                      {Math.round(item.accuracy * 100)}%
                    </span>
                  </div>
                  <ProgressBar
                    value={item.accuracy}
                    tone={item.accuracy >= 0.8 ? 'green' : item.accuracy >= 0.6 ? 'blue' : 'amber'}
                  />
                </div>
              ))}
            </div>
          </Surface>

          <Surface>
            <SectionHeading title="Missed questions review" />
            <div className="mt-5 space-y-4">
              {missedQuestions.length ? (
                missedQuestions.map((response) => {
                  const missed = questionLookup[response.questionId]
                  const missedAttempt = getAttemptForResponse(response)
                  const diagnosis = missedAttempt?.engineDiagnosis
                  const remediation = missedAttempt?.engineRemediationEvents?.[0]
                  if (!missed) {
                    return (
                      <div
                        key={response.questionId}
                        className="rounded-[16px] border border-[var(--nclex-border)] bg-[var(--nclex-card-muted)] p-4"
                      >
                        <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[var(--nclex-warning)]">
                          Missing item
                        </p>
                        <p className="mt-2 text-sm leading-6 text-[var(--nclex-text-muted)]">
                          This saved question is no longer available. Rebuild the set before using this result for review.
                        </p>
                      </div>
                    )
                  }
                  return (
                    <div
                      key={response.questionId}
                      className="rounded-[16px] border border-[var(--nclex-border)] bg-[var(--nclex-card-muted)] p-4"
                    >
                      <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[var(--nclex-danger)]">
                        {missed.category}
                      </p>
                      <h5 className="mt-2 text-base font-semibold text-[var(--nclex-text)]">
                        {missed.prompt}
                      </h5>
                      <p className="mt-2 text-sm leading-6 text-[var(--nclex-text-muted)]">
                        {missed.rationale.whyCorrect}
                      </p>
                      <div className="mt-3 rounded-xl border border-[#ffe0b0] bg-white px-3 py-2 text-xs font-semibold leading-5 text-[var(--nclex-warning)]">
                        {getMissReason(response.questionId, response.selectedAnswer)}
                      </div>
                      {diagnosis ? (
                        <div className="mt-3 rounded-xl border border-[#bfdbfe] bg-white px-3 py-2 text-xs font-semibold leading-5 text-[var(--nclex-blue)]">
                          Pattern: {diagnosis.likelyMisconceptionId.replaceAll('_', ' ')}.
                          {diagnosis.confidenceEscalated ? ' High confidence makes this a priority repair.' : ''}
                        </div>
                      ) : null}
                      {remediation ? (
                        <div className="mt-3 rounded-xl border border-[#c8eddc] bg-white px-3 py-2 text-xs font-semibold leading-5 text-[var(--nclex-success)]">
                          Next repair: {remediation.nextActionCopy}
                        </div>
                      ) : null}
                    </div>
                  )
                })
              ) : (
                <div className="rounded-[16px] border border-[#c8eddc] bg-[var(--nclex-success-soft)] p-4 text-sm text-[var(--nclex-success)]">
                  No missed questions in this session. Keep that same calm pace on your next set.
                </div>
              )}
            </div>
          </Surface>
        </div>
      </div>
    )
  }

  if (!question || !questionId) {
    return (
      <div className="space-y-6">
        <EmptyState
          title="This practice set needs to be rebuilt."
          description="The saved session no longer points to an available question. Rebuild the set to continue without losing your past attempts."
          action={
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() =>
                  startPracticeSession({
                    questionCount: session.config.questionCount || 10,
                    category: 'All',
                    questionStatus: 'all',
                    format: 'mixed',
                    difficulty: 'adaptive',
                  })
                }
                className="nclex-btn-primary inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-black"
              >
                Rebuild set
                <ArrowRight className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={onExit}
                className="nclex-btn-secondary min-h-[48px] rounded-xl px-4 py-2.5 text-sm font-black"
              >
                Back to Question Bank
              </button>
            </div>
          }
        />
      </div>
    )
  }

  const openReviewForCurrentAnswer = () => {
    setSubmitted(true)
    setShowRationale(true)
    void trackAppEvent(
      'rationale_opened',
      {
        page_path: typeof window === 'undefined' ? '/practice-questions' : window.location.pathname,
        feature_name: 'Answer Rationale',
        exam_track: profile.examTrack ?? 'nclex-rn',
        question_category: question.category,
        question_result: currentIsCorrect ? 'correct' : 'incorrect',
        is_demo_user: isDemoMode,
        metadata: {
          question_id: questionId,
          review_state: 'answer_submitted',
        },
      },
      { userId: authUser?.id, isDemoUser: isDemoMode },
    )
  }

  const toggleChoice = (choiceId: string) => {
    if (existingResponse) return
    if (question.format === 'multiple-choice') {
      setSelectedAnswers([choiceId])
      return
    }
    setSelectedAnswers((current) =>
      current.includes(choiceId) ? current.filter((item) => item !== choiceId) : [...current, choiceId],
    )
  }

  const handleConfidence = (confidence: ConfidenceLevel) => {
    if (existingResponse || !submitted) return
    submitCurrentResponse({
      selectedAnswer: selectedAnswers,
      confidence,
      flagged,
      timeSpentSec:
        question.format === 'select-all-that-apply'
          ? 70
          : question.scenario
            ? 60
            : 45,
    })
  }

  const resetFeedbackForm = () => {
    setFeedbackOpen(false)
    setFeedbackReason('wrong_answer')
    setFeedbackNote('')
    setFeedbackSubmittedId(null)
  }

  const setQuestionUiState = (targetQuestionId?: string) => {
    const targetResponse = targetQuestionId
      ? session.responses.find((response) => response.questionId === targetQuestionId)
      : null
    setSelectedAnswers(targetResponse?.selectedAnswer ?? [])
    setSubmitted(Boolean(targetResponse))
    setShowRationale(Boolean(targetResponse))
    setFlagged(targetResponse?.flagged ?? false)
    resetFeedbackForm()
  }

  const goToQuestionIndex = (index: number) => {
    setQuestionUiState(session.questionIds[index])
    goToSessionQuestion(index)
  }

  const goToNextQuestion = () => {
    setQuestionUiState(session.questionIds[Math.min(session.currentIndex + 1, session.questionIds.length - 1)])
    nextQuestion()
  }

  const goToPreviousQuestion = () => {
    setQuestionUiState(session.questionIds[Math.max(session.currentIndex - 1, 0)])
    previousQuestion()
  }

  const route = typeof window === 'undefined' ? '/practice-questions' : window.location.pathname
  const feedbackReviewState = !submitted
    ? 'pre_submit'
    : showRationale
      ? 'review_open'
      : existingResponse
        ? 'confidence_recorded'
        : 'confidence_pending'

  const openContentFeedback = () => {
    if (!question) return
    setFeedbackOpen((current) => {
      const next = !current
      if (next) trackContentFeedbackOpened(question, route, { userId: authUser?.id, isDemoUser: isDemoMode })
      return next
    })
  }

  const submitContentFeedback = () => {
    if (!question) return
    const record = recordContentFeedback({
      question,
      reason: feedbackReason,
      note: feedbackNote,
      route,
      reviewState: feedbackReviewState,
      context: { userId: authUser?.id, isDemoUser: isDemoMode },
    })
    setFeedbackSubmittedId(record.id)
    setFeedbackOpen(false)
    setFeedbackNote('')
  }

  const finalResponse = existingResponse ?? null
  const confidenceChosen = Boolean(finalResponse)
  const finalAttempt = finalResponse ? getAttemptForResponse(finalResponse) : null
  const finalRemediation = finalAttempt?.engineRemediationEvents?.[0]
  const tutorInsight = getQuestionTutorInsight(questionId)
  const correctSoFar = session.responses.filter((response) => response.isCorrect).length
  const flaggedCount = session.responses.filter((response) => response.flagged).length + (flagged && !existingResponse ? 1 : 0)
  const currentStreak = session.responses
    .toReversed()
    .findIndex((response) => !response.isCorrect)
  const streakCount = currentStreak === -1 ? session.responses.length : currentStreak
  const hasPartialSignal =
    submitted &&
    question.format === 'select-all-that-apply' &&
    !currentIsCorrect &&
    selectedAnswers.some((answerId) => question.correctAnswer.includes(answerId))
  const resultLabel = currentIsCorrect ? 'Correct' : hasPartialSignal ? 'Partial' : 'Incorrect'
  const resultTone: 'green' | 'amber' | 'red' = currentIsCorrect ? 'green' : hasPartialSignal ? 'amber' : 'red'
  const answerReviewClass = currentIsCorrect
    ? 'border-emerald-300/24 bg-[#051f25]'
    : hasPartialSignal
      ? 'border-amber-300/28 bg-[#1f1a0a]'
      : 'border-rose-300/28 bg-[#210f1d]'
  const evidenceLevel = question.blueprintMapped && question.sourceBacked ? 'Readiness evidence' : 'Practice evidence'
  const qualityStatus = question.contentQuality?.replaceAll('-', ' ') ?? 'draft item'
  const reviewState = submitted ? (showRationale ? 'Review open' : 'Review hidden') : 'Answer pending'
  const confidenceState = confidenceChosen ? `Confidence: ${finalResponse?.confidence}` : submitted ? 'Confidence not chosen' : 'Confidence pending'
  const nextActionLabel = !submitted
    ? 'Submit answer'
    : !confidenceChosen
      ? 'Choose confidence'
      : !showRationale
        ? 'Review rationale'
        : !currentIsCorrect
          ? 'Repair later'
          : isLastQuestion
            ? 'Finish session'
            : 'Continue'
  const headerBadges = [
    { label: 'Priority', tone: 'blue' as const, icon: <Target className="h-3.5 w-3.5" /> },
    { label: 'Safety', tone: 'green' as const, icon: <ShieldCheck className="h-3.5 w-3.5" /> },
    { label: 'Clinical Judgment', tone: 'blue' as const, icon: <BadgeCheck className="h-3.5 w-3.5" /> },
    {
      label: question.sourceBacked ? 'Source-backed' : 'Practice item',
      tone: question.sourceBacked ? 'green' as const : 'amber' as const,
      icon: <CheckCircle2 className="h-3.5 w-3.5" />,
    },
    {
      label: evidenceLevel,
      tone: question.blueprintMapped && question.sourceBacked ? 'green' as const : 'amber' as const,
      icon: <BadgeCheck className="h-3.5 w-3.5" />,
    },
  ]
  const evidenceBadges = [...tutorInsight.trustFlags, `Evidence: ${evidenceLevel}`]

  return (
    <div className="space-y-6 pb-44 xl:pb-0">
      <Surface className="border-cyan-200/20 bg-[#061b31]/72 p-4 md:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-cyan-200">
              {modeLabel}
            </p>
            <h3 className="mt-1 text-2xl font-black tracking-[-0.03em] text-white md:text-3xl">
              {session.title}
            </h3>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-sky-100/68">
              {session.subtitle}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <div className="rounded-xl border border-amber-200/28 bg-amber-300/[0.08] px-4 py-2 text-sm font-black text-amber-100">
              Question {session.currentIndex + 1} of {session.questionIds.length}
            </div>
            {session.config.timed && remainingSeconds !== null ? (
              <div className="inline-flex items-center gap-2 rounded-xl border border-cyan-200/24 bg-cyan-300/[0.08] px-4 py-2 text-sm font-black text-cyan-100">
                <Clock3 className="h-4 w-4" />
                {Math.floor(remainingSeconds / 60)}:{String(remainingSeconds % 60).padStart(2, '0')}
              </div>
            ) : null}
          </div>
        </div>
        <div className="mt-4">
          <ProgressBar value={(session.currentIndex + 1) / session.questionIds.length} />
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {session.questionIds.map((item, index) => {
            const answered = session.responses.some((response) => response.questionId === item)
            return (
              <button
                key={item}
                type="button"
                onClick={() => {
                  if (session.config.noBacktracking) return
                  goToQuestionIndex(index)
                }}
                disabled={session.config.noBacktracking}
                className={clsx(
                  'flex h-9 w-9 items-center justify-center rounded-full border text-xs font-semibold transition',
                  index === session.currentIndex
                    ? 'border-amber-200/70 bg-amber-300/22 text-amber-50 shadow-[0_0_18px_rgba(251,191,36,0.18)]'
                    : answered
                      ? 'border-emerald-300/34 bg-emerald-300/[0.08] text-emerald-100'
                      : 'border-cyan-200/18 bg-white/[0.04] text-sky-100/58',
                  session.config.noBacktracking && 'cursor-not-allowed opacity-60',
                )}
              >
                {index + 1}
              </button>
            )
          })}
        </div>
      </Surface>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <Surface className="border-cyan-200/18 bg-[#041629]/78">
          {question.scenario ? (
            <div className="rounded-[16px] border border-cyan-200/20 bg-cyan-300/[0.07] p-4">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-cyan-100">
                Clinical scenario
              </p>
              <p className="mt-2 text-sm leading-7 text-sky-100/76">{question.scenario}</p>
            </div>
          ) : null}

          <div className="mt-5 flex flex-wrap items-center gap-2">
            {headerBadges.map((badge) => (
              <ReviewBadge key={badge.label} tone={badge.tone} icon={badge.icon}>
                {badge.label}
              </ReviewBadge>
            ))}
            <span className="nclex-chip nclex-chip-info">{question.category}</span>
            <span className="nclex-chip nclex-chip-success">
              {question.format === 'select-all-that-apply' ? 'Select all' : 'Single answer'}
            </span>
            <button
              type="button"
              onClick={() => setFlagged((current) => !current)}
              disabled={Boolean(existingResponse)}
              className={clsx(
                'inline-flex min-h-8 items-center gap-2 rounded-full border px-3 py-1 text-xs font-black uppercase tracking-[0.14em]',
                flagged
                  ? 'border-amber-200/40 bg-amber-300/12 text-amber-100'
                  : 'border-cyan-200/18 bg-white/[0.04] text-sky-100/58',
              )}
            >
              <Flag className="h-3.5 w-3.5" />
              {flagged ? 'Flagged' : 'Flag for review'}
            </button>
          </div>

          <h4 className="mt-5 text-[1.6rem] font-black leading-tight tracking-[-0.03em] text-white md:text-[2rem]">
            {question.prompt}
          </h4>

          <div className="mt-6 space-y-3.5">
            {question.choices.map((choice) => {
              const selected = selectedAnswers.includes(choice.id)
              const correct = question.correctAnswer.includes(choice.id)
              const incorrectSelection = submitted && selected && !correct
              return (
                <button
                  key={choice.id}
                  type="button"
                  onClick={() => toggleChoice(choice.id)}
                  disabled={Boolean(existingResponse)}
                  style={
                    selected && !submitted
                      ? {
                          background: 'rgba(251, 191, 36, 0.13)',
                          borderColor: 'rgba(251, 191, 36, 0.6)',
                          boxShadow: '0 0 28px rgba(251, 191, 36, 0.18)',
                        }
                      : undefined
                  }
                  className={clsx(
                    'nclex-answer flex min-h-[72px] w-full items-start gap-4 rounded-[16px] border p-4 text-left transition active:scale-[0.995]',
                    selected && 'nclex-answer-selected',
                    submitted && correct && 'nclex-answer-correct',
                    incorrectSelection && 'nclex-answer-incorrect',
                    existingResponse && 'cursor-default',
                  )}
                >
                  <span
                    className={clsx(
                      'mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-xs font-black',
                      selected
                        ? 'border-amber-200/70 bg-amber-300/22 text-amber-50 shadow-[0_0_16px_rgba(251,191,36,0.16)]'
                        : 'border-cyan-200/24 bg-white/[0.04] text-sky-100/58',
                      submitted && correct && 'border-[var(--nclex-success)] bg-[var(--nclex-success)] text-white',
                      incorrectSelection && 'border-[var(--nclex-danger)] bg-[var(--nclex-danger)] text-white',
                    )}
                  >
                    {choice.id}
                  </span>
                  <span className="text-base leading-7 text-sky-50/84">{choice.text}</span>
                </button>
              )
            })}
          </div>

          <div className="mt-5 flex flex-col gap-3 rounded-[14px] border border-cyan-300/18 bg-[#061b31]/72 p-3 sm:flex-row sm:flex-wrap sm:items-center">
            {!submitted ? (
              <button
                type="button"
                onClick={openReviewForCurrentAnswer}
                disabled={selectedAnswers.length === 0}
                className={clsx(practiceActionButton.submit, 'flex-1 md:flex-none')}
              >
                Submit answer
              </button>
            ) : confidenceChosen ? (
              !isLastQuestion ? (
                <button
                  type="button"
                  onClick={goToNextQuestion}
                  className={clsx(practiceActionButton.next, 'flex-[1.2] md:flex-none')}
                >
                  Next question
                  <ArrowRight className="h-4 w-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={finishSession}
                  className={clsx(practiceActionButton.finish, 'flex-[1.2] md:flex-none')}
                >
                  Finish session
                  <CheckCircle2 className="h-4 w-4" />
                </button>
              )
            ) : (
              <div className="flex min-h-[48px] flex-1 items-center rounded-xl border border-cyan-300/20 bg-white/[0.06] px-4 py-3 text-sm font-semibold text-sky-100/76 md:border-[var(--nclex-border)] md:bg-[var(--nclex-card-muted)] md:text-[var(--nclex-text-muted)]">
                Choose confidence below to continue
              </div>
            )}
            {submitted ? (
              <button
                type="button"
                onClick={() =>
                  setShowRationale((current) => {
                    const next = !current
                    if (next) {
                      void trackAppEvent(
                        'rationale_opened',
                        {
                          page_path: typeof window === 'undefined' ? '/practice-questions' : window.location.pathname,
                          feature_name: 'Answer Rationale',
                          exam_track: profile.examTrack ?? 'nclex-rn',
                          question_category: question.category,
                          question_result: currentIsCorrect ? 'correct' : 'incorrect',
                          confidence_level: finalResponse?.confidence,
                          is_demo_user: isDemoMode,
                          metadata: {
                            question_id: questionId,
                            review_state: finalResponse ? 'confidence_recorded' : 'confidence_pending',
                          },
                        },
                        { userId: authUser?.id, isDemoUser: isDemoMode },
                      )
                    }
                    return next
                  })
                }
                className={clsx(practiceActionButton.review, 'flex-1 md:flex-none')}
              >
                <Eye className="h-4 w-4" />
                {showRationale ? 'Hide review' : 'Review rationale'}
              </button>
            ) : null}
          </div>

          <AnimatePresence>
            {submitted ? (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                className={clsx('mt-5 rounded-[16px] border p-4 text-white shadow-[0_12px_30px_rgba(2,18,34,0.18)] md:p-5', answerReviewClass)}
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.16em] text-sky-200/70">Answer review</p>
                    <p className="mt-1 text-sm leading-6 text-sky-100/70">
                      Confirm confidence, read the clinical rationale, then move to the next best action.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <ReviewBadge
                      tone={resultTone}
                      icon={resultLabel === 'Correct' ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
                    >
                      {resultLabel}
                    </ReviewBadge>
                    <ReviewBadge tone="violet" icon={<ArrowRight className="h-3.5 w-3.5" />}>
                      Next action: {nextActionLabel}
                    </ReviewBadge>
                    {finalResponse ? (
                      <ReviewBadge tone="green">
                        Confidence: {finalResponse.confidence}
                      </ReviewBadge>
                    ) : null}
                  </div>
                </div>

                {!confidenceChosen ? (
                  <div className="mt-4 rounded-[14px] border border-cyan-300/14 bg-white/[0.04] p-4">
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div>
                        <p className="text-sm font-black text-white">Choose confidence</p>
                        <p className="mt-1 text-sm leading-6 text-sky-100/68">
                          This unlocks the next question and separates a solid answer from a lucky one.
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-3">
                      {(['low', 'medium', 'high'] as ConfidenceLevel[]).map((level) => (
                        <button
                          key={level}
                          type="button"
                          onClick={() => handleConfidence(level)}
                          className={clsx(
                            'min-h-[44px] rounded-full border px-4 py-2 text-sm font-black capitalize transition',
                            confidenceTone[level],
                          )}
                        >
                          {level}
                        </button>
                      ))}
                      </div>
                    </div>
                  </div>
                ) : null}

                {showRationale ? (
                  <>
                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                      <div className="md:col-span-2">
                        <RationaleCard
                          title="Correct answer"
                          tone="green"
                          body={question.rationale.whyCorrect}
                        />
                      </div>
                      {!currentIsCorrect ? (
                        <div className="md:col-span-2">
                          <RationaleCard
                            title="Miss pattern"
                            tone="rose"
                            body={getMissReason(questionId, selectedAnswers)}
                          />
                        </div>
                      ) : null}
                    {finalRemediation ? (
                      <div className="md:col-span-2">
                        <RationaleCard
                            title="Next repair"
                            tone="rose"
                            body={finalRemediation.nextActionCopy}
                            badges={[finalRemediation.routeLabel]}
                        />
                      </div>
                    ) : null}
                    {question.relatedFlashcardIds?.length ? (
                      <div className="md:col-span-2 rounded-[14px] border border-cyan-300/16 bg-white/[0.04] p-4">
                        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                          <div>
                            <p className="text-sm font-black text-white">Linked remediation card</p>
                            <p className="mt-1 text-sm leading-6 text-sky-100/64">
                              Open the matching flashcard for this missed pattern.
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              navigate(`/flashcards?cardId=${encodeURIComponent(question.relatedFlashcardIds![0])}`)
                            }
                            className="inline-flex min-h-[42px] items-center justify-center gap-2 rounded-xl border border-violet-300/24 bg-violet-300/[0.08] px-4 py-2 text-sm font-black text-violet-100 transition hover:bg-violet-300/14"
                          >
                            <Lightbulb className="h-4 w-4" />
                            Open linked card
                          </button>
                        </div>
                      </div>
                    ) : null}
                      <details className="md:col-span-2 rounded-[14px] border border-cyan-300/16 bg-white/[0.04] p-4">
                        <summary className="cursor-pointer text-sm font-black text-white focus:outline-none focus:ring-2 focus:ring-cyan-200/55">
                          More explanation and item details
                        </summary>
                        <div className="mt-4 grid gap-3 md:grid-cols-2">
                          <RationaleCard
                            title="Why the other options fall away"
                            tone="amber"
                            body={question.rationale.whyOthers}
                          />
                          <RationaleCard
                            title="Test-taking cue"
                            tone="violet"
                            body={`${question.nclexTip} ${tutorInsight.reviewTarget}. Watch for: ${tutorInsight.trap}`}
                            badges={evidenceBadges}
                          />
                        </div>
                      </details>
                    </div>
                    {question.feedbackEnabled ? (
                      <div className="mt-4 rounded-[14px] border border-cyan-300/16 bg-white/[0.04] p-4">
                        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                          <div>
                            <p className="text-sm font-black text-white">Report content issue</p>
                            <p className="mt-1 text-sm leading-6 text-sky-100/64">
                              Flag answer, rationale, wording, typo, or source concerns for internal review.
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={openContentFeedback}
                            className="inline-flex min-h-[42px] items-center justify-center gap-2 rounded-xl border border-cyan-300/24 bg-cyan-300/[0.08] px-4 py-2 text-sm font-black text-cyan-100 transition hover:bg-cyan-300/14"
                          >
                            <Flag className="h-4 w-4" />
                            {feedbackOpen ? 'Close report' : 'Open report'}
                          </button>
                        </div>
                        {feedbackSubmittedId ? (
                          <div className="mt-3 rounded-xl border border-emerald-300/24 bg-emerald-300/[0.08] px-3 py-2 text-sm font-semibold text-emerald-100">
                            Report saved for internal review.
                          </div>
                        ) : null}
                        {feedbackOpen ? (
                          <div className="mt-4 grid gap-3">
                            <label className="block">
                              <span className="mb-2 block text-xs font-black uppercase tracking-[0.14em] text-sky-100/58">
                                Issue type
                              </span>
                              <select
                                value={feedbackReason}
                                onChange={(event) => setFeedbackReason(event.target.value as ContentFeedbackReason)}
                                className="min-h-[44px] w-full rounded-xl border border-cyan-300/20 bg-[#061b31] px-3 py-2 text-sm font-semibold text-white"
                              >
                                {contentFeedbackReasons.map((reason) => (
                                  <option key={reason} value={reason}>
                                    {contentFeedbackReasonLabels[reason]}
                                  </option>
                                ))}
                              </select>
                            </label>
                            <label className="block">
                              <span className="mb-2 block text-xs font-black uppercase tracking-[0.14em] text-sky-100/58">
                                Note
                              </span>
                              <textarea
                                value={feedbackNote}
                                onChange={(event) => setFeedbackNote(event.target.value)}
                                maxLength={500}
                                rows={3}
                                placeholder="Optional. Do not enter patient identifiers or private info."
                                className="w-full resize-none rounded-xl border border-cyan-300/20 bg-[#061b31] px-3 py-2 text-sm font-semibold leading-6 text-white placeholder:text-sky-100/38"
                              />
                            </label>
                            <div className="flex justify-end">
                              <button
                                type="button"
                                onClick={submitContentFeedback}
                                className="inline-flex min-h-[42px] items-center justify-center rounded-xl border border-emerald-300/28 bg-emerald-300/[0.1] px-4 py-2 text-sm font-black text-emerald-100 transition hover:bg-emerald-300/16"
                              >
                                Submit report
                              </button>
                            </div>
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                  </>
                ) : null}
              </motion.div>
            ) : null}
          </AnimatePresence>
        </Surface>

        <div className="space-y-6">
          <Surface className="hidden xl:block xl:sticky xl:top-24">
            <SectionHeading title="Session" description="Compact status while the question stays primary." />
            <div className="mt-5 space-y-4">
              <div>
                <div className="mb-2 flex items-center justify-between text-sm text-[var(--nclex-text-muted)]">
                  <span>Progress</span>
                  <span>{session.responses.length}/{session.questionIds.length} completed</span>
                </div>
                <ProgressBar value={session.responses.length / session.questionIds.length} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <MetricTile
                  label="Correct so far"
                  value={`${correctSoFar}`}
                />
                <MetricTile
                  label="Flagged"
                  value={`${flaggedCount}`}
                />
              </div>
              <div className="grid gap-3">
                <StatusMiniCard label="Current streak" value={`${streakCount} correct`} tone={streakCount > 0 ? 'green' : 'blue'} />
                <StatusMiniCard label="Confidence" value={confidenceState} tone={confidenceChosen ? 'green' : submitted ? 'amber' : 'blue'} />
                <StatusMiniCard label="Review" value={reviewState} tone={showRationale ? 'green' : 'blue'} />
                <StatusMiniCard label="Evidence level" value={`${evidenceLevel} / ${qualityStatus}`} tone={question.sourceBacked ? 'green' : 'amber'} />
                {submitted ? (
                  <StatusMiniCard
                    label="Remediation"
                    value={!currentIsCorrect ? 'Repair needed' : 'No repair needed'}
                    tone={!currentIsCorrect ? 'amber' : 'green'}
                  />
                ) : null}
              </div>
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={goToPreviousQuestion}
                  disabled={session.currentIndex === 0 || Boolean(session.config.noBacktracking)}
                  className="nclex-btn-secondary inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/dashboard')}
                  className="nclex-btn-secondary rounded-xl px-4 py-2.5 text-sm font-semibold"
                >
                  Save & leave
                </button>
                <button
                  type="button"
                  onClick={onExit}
                  className="rounded-xl border border-rose-200/25 bg-rose-300/[0.08] px-4 py-2.5 text-sm font-semibold text-rose-100 transition hover:bg-rose-300/14"
                >
                  Discard
                </button>
              </div>
            </div>
          </Surface>
        </div>
      </div>

      <div className="safe-bottom mobile-quiz-actions rounded-[16px] border border-cyan-300/20 bg-[#061b31]/80 p-3 text-white xl:hidden">
        <div className="flex items-center justify-between gap-3 text-xs font-black uppercase tracking-[0.14em] text-sky-100/62">
          <span>Progress</span>
          <span>
            {session.responses.length}/{session.questionIds.length} complete
          </span>
        </div>
        <div className="mt-2">
          <ProgressBar value={session.responses.length / session.questionIds.length} />
        </div>
        <div className="mt-3 grid gap-2">
          {!submitted ? (
            <button
              type="button"
              onClick={openReviewForCurrentAnswer}
              disabled={selectedAnswers.length === 0}
              className={clsx(practiceActionButton.submit, 'w-full')}
            >
              Submit answer
            </button>
          ) : confidenceChosen ? (
            !isLastQuestion ? (
              <button
                type="button"
                onClick={goToNextQuestion}
                className={clsx(practiceActionButton.next, 'w-full')}
              >
                Next question
                <ArrowRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={finishSession}
                className={clsx(practiceActionButton.finish, 'w-full')}
              >
                Finish session
                <CheckCircle2 className="h-4 w-4" />
              </button>
            )
          ) : (
            <div className="flex min-h-[48px] w-full items-center justify-center rounded-xl border border-amber-300/22 bg-amber-300/[0.08] px-4 py-3 text-center text-sm font-black text-amber-100">
              Choose confidence to continue
            </div>
          )}
        </div>
        <div className="mt-2 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={goToPreviousQuestion}
            disabled={session.currentIndex === 0 || Boolean(session.config.noBacktracking)}
            className="nclex-btn-secondary inline-flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-black disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            className="nclex-btn-secondary inline-flex min-h-[44px] flex-1 items-center justify-center rounded-xl px-4 py-2 text-sm font-black"
          >
            Save & leave
          </button>
          <button
            type="button"
            onClick={onExit}
            className="inline-flex min-h-[44px] flex-1 items-center justify-center rounded-xl border border-rose-200/25 bg-rose-300/[0.08] px-4 py-2 text-sm font-black text-rose-100"
          >
            Discard
          </button>
        </div>
      </div>
    </div>
  )
}

export function FlipCard({
  isFlipped,
  onFlip,
  front,
  back,
}: {
  isFlipped: boolean
  onFlip: () => void
  front: string
  back: string
}) {
  return (
    <div className="perspective-1200 h-[320px] w-full">
      <motion.button
        type="button"
        onClick={onFlip}
        whileTap={{ scale: 0.985 }}
        animate={{ rotateY: isFlipped ? 180 : 0 }}
        transition={{ duration: 0.55, ease: 'easeInOut' }}
        className="relative h-full w-full rounded-[24px] text-left touch-pan-y [transform-style:preserve-3d]"
      >
        <div className="absolute inset-0 rounded-[24px] border border-[var(--nclex-border)] bg-[linear-gradient(180deg,#ffffff_0%,#eef5ff_100%)] p-6 shadow-[0_22px_46px_rgba(42,125,225,0.12)] [backface-visibility:hidden]">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--nclex-blue)]">
            Prompt
          </p>
          <div className="mt-8 flex h-[210px] items-center overflow-y-auto pr-1">
            <p className="break-words font-serif text-[1.6rem] leading-tight text-[var(--nclex-text)] md:text-3xl">{front}</p>
          </div>
          <p className="text-sm font-semibold text-[var(--nclex-text-muted)]">Tap to reveal</p>
        </div>
        <div className="absolute inset-0 rounded-[24px] border border-[#c8eddc] bg-[linear-gradient(180deg,#ffffff_0%,#edfdf6_100%)] p-6 shadow-[0_22px_46px_rgba(16,185,129,0.14)] [backface-visibility:hidden] [transform:rotateY(180deg)]">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--nclex-success)]">
            Answer
          </p>
          <div className="mt-8 flex h-[210px] items-center overflow-y-auto pr-1">
            <p className="break-words text-base leading-7 text-[var(--nclex-text-secondary)] md:text-lg md:leading-8">{back}</p>
          </div>
          <p className="text-sm font-semibold text-[var(--nclex-text-muted)]">Tap to flip back</p>
        </div>
      </motion.button>
    </div>
  )
}

function MetricTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[16px] border border-[var(--nclex-border)] bg-[var(--nclex-card-muted)] p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--nclex-text-muted)]">
        {label}
      </p>
      <p className="mt-2 font-serif text-3xl text-[var(--nclex-text)]">{value}</p>
    </div>
  )
}

function ReviewBadge({
  children,
  tone = 'blue',
  icon,
}: {
  children: React.ReactNode
  tone?: 'blue' | 'green' | 'amber' | 'red' | 'violet'
  icon?: React.ReactNode
}) {
  const styles = {
    blue: 'border-sky-300/28 bg-sky-300/10 text-sky-200',
    green: 'border-emerald-300/30 bg-emerald-300/10 text-emerald-200',
    amber: 'border-amber-300/32 bg-amber-300/10 text-amber-200',
    red: 'border-rose-300/32 bg-rose-300/10 text-rose-200',
    violet: 'border-violet-300/30 bg-violet-300/10 text-violet-200',
  }[tone]

  return (
    <span className={clsx('inline-flex min-h-[30px] items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-bold', styles)}>
      {icon}
      {children}
    </span>
  )
}

function StatusMiniCard({
  label,
  value,
  tone,
}: {
  label: string
  value: string
  tone: 'blue' | 'green' | 'amber'
}) {
  const styles = {
    blue: 'border-sky-300/20 bg-sky-300/8 text-sky-100',
    green: 'border-emerald-300/24 bg-emerald-300/8 text-emerald-100',
    amber: 'border-amber-300/24 bg-amber-300/8 text-amber-100',
  }[tone]

  return (
    <div className={clsx('rounded-[12px] border px-3 py-3', styles)}>
      <p className="text-[0.68rem] font-black uppercase tracking-[0.13em] opacity-65">{label}</p>
      <p className="mt-1 text-sm font-semibold leading-5">{value}</p>
    </div>
  )
}

function RationaleCard({
  title,
  body,
  tone,
  badges,
}: {
  title: string
  body: string
  tone: 'blue' | 'green' | 'amber' | 'rose' | 'violet'
  badges?: string[]
}) {
  const styles = {
    blue: 'border-cyan-300/24 bg-cyan-300/[0.07] text-cyan-100',
    green: 'border-emerald-300/28 bg-emerald-300/[0.08] text-emerald-100',
    amber: 'border-amber-300/30 bg-amber-300/[0.08] text-amber-100',
    rose: 'border-rose-300/30 bg-rose-300/[0.08] text-rose-100',
    violet: 'border-violet-300/30 bg-violet-300/[0.08] text-violet-100',
  }[tone]

  return (
    <div className={clsx('rounded-[16px] border p-4', styles)}>
      <p className="text-xs font-semibold uppercase tracking-[0.16em]">{title}</p>
      <p className="mt-2 text-sm leading-6 text-sky-100/72">{body}</p>
      {badges?.length ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {badges.map((badge) => (
            <span
              key={badge}
              className="rounded-lg border border-current bg-white/[0.06] px-2.5 py-1 text-xs font-semibold leading-5 text-sky-100/78"
            >
              {badge}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  )
}
