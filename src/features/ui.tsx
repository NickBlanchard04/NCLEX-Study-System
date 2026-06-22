import { AnimatePresence, motion } from 'framer-motion'
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Bookmark,
  Check,
  CheckCircle2,
  Clock3,
  Eye,
  Flag,
  Lightbulb,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { clsx } from 'clsx'
import type { ActiveSession, ConfidenceLevel, MasteryLevel } from '../app/types'
import { useStudySystemStore } from '../app/store'
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
  children,
}: {
  className?: string
  children: React.ReactNode
}) {
  return (
    <section className={clsx('nclex-surface rounded-[1.15rem] p-5 md:p-6', className)}>
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
  children,
}: {
  className?: string
  children: React.ReactNode
}) {
  return <Surface className={clsx('overflow-hidden p-0', className)}>{children}</Surface>
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
  progressValue,
  sparkline,
}: {
  label: string
  value: string
  detail: string
  tone?: 'neutral' | 'success' | 'warning' | 'critical'
  icon?: React.ReactNode
  trend?: string
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
        <span className={theme.chip}>{tone === 'neutral' ? 'Track' : tone}</span>
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
    <div className={clsx('h-2.5 overflow-hidden rounded-full bg-sky-300/14', className)}>
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
      <div className="relative h-[134px] w-[134px]">
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
  low: 'border-[#f7d7a0] bg-[var(--nclex-warning-soft)] text-[var(--nclex-warning)]',
  medium: 'border-[#c5dcfb] bg-[var(--nclex-blue-soft)] text-[var(--nclex-blue)]',
  high: 'border-[#bfead8] bg-[var(--nclex-success-soft)] text-[var(--nclex-success)]',
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
  const attempts = useStudySystemStore((state) => state.attempts)
  const questionId = session.questionIds[session.currentIndex]
  const question = questionLookup[questionId]
  const existingResponse = session.responses.find((response) => response.questionId === questionId)
  const [selectedAnswers, setSelectedAnswers] = useState<string[]>(existingResponse?.selectedAnswer ?? [])
  const [submitted, setSubmitted] = useState(Boolean(existingResponse))
  const [showRationale, setShowRationale] = useState(Boolean(existingResponse))
  const [flagged, setFlagged] = useState(existingResponse?.flagged ?? false)
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null)
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
    const topMissReason = missedQuestions[0]
      ? getMissReason(missedQuestions[0].questionId, missedQuestions[0].selectedAnswer)
      : null
    return (
      <div className="space-y-6">
        <Surface className="overflow-hidden p-0">
          <div className="border-b border-[var(--nclex-border)] bg-[linear-gradient(180deg,#f9fbff_0%,#eef5ff_100%)] px-5 py-5 md:px-6">
            <div className="grid gap-5 md:grid-cols-[1.15fr_0.85fr] md:items-center">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--nclex-blue)]">
                  {modeLabel}
                </p>
                <h3 className="mt-2 font-serif text-3xl text-[var(--nclex-text)]">Session complete.</h3>
                <p className="mt-2 max-w-2xl text-sm leading-7 text-[var(--nclex-text-muted)]">
                  {score >= 80
                    ? 'Strong work. Your clinical judgment is getting more stable under pressure.'
                    : score >= 60
                      ? 'Useful progress. Review the misses now while the reasoning is still fresh.'
                      : 'This is a productive diagnostic. Your misses now give the clearest next-step plan.'}
                </p>
              </div>
              <div className="rounded-[18px] border border-[var(--nclex-border)] bg-white p-5 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--nclex-text-muted)]">
                  Score
                </p>
                <div className="mt-2 flex items-end justify-between gap-4">
                  <p className="font-serif text-5xl text-[var(--nclex-text)]">{score}%</p>
                  <p className="text-sm text-[var(--nclex-text-muted)]">
                    {session.responses.filter((response) => response.isCorrect).length} correct
                  </p>
                </div>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-3 px-5 py-4 md:px-6">
            <button
              type="button"
              onClick={onExit}
              className="nclex-btn-secondary rounded-xl px-4 py-2.5 text-sm font-semibold"
            >
              Close session
            </button>
          </div>
        </Surface>

        {topMissReason ? (
          <Surface className="border-[#ffe0b0] bg-[var(--nclex-warning-soft)]">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-1 h-5 w-5 shrink-0 text-[var(--nclex-warning)]" />
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--nclex-warning)]">
                  Why you missed it
                </p>
                <h4 className="mt-2 font-serif text-2xl text-[var(--nclex-text)]">
                  Pattern detected from this quiz
                </h4>
                <p className="mt-2 text-sm leading-7 text-[var(--nclex-text-secondary)]">
                  {topMissReason}
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

  const finalResponse = existingResponse ?? null
  const confidenceChosen = Boolean(finalResponse)
  const finalAttempt = finalResponse ? getAttemptForResponse(finalResponse) : null
  const finalDiagnosis = finalAttempt?.engineDiagnosis
  const finalRemediation = finalAttempt?.engineRemediationEvents?.[0]
  const tutorInsight = getQuestionTutorInsight(questionId)

  return (
    <div className="space-y-6">
      <Surface className="p-4 md:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--nclex-blue)]">
              {modeLabel}
            </p>
            <h3 className="mt-1 font-serif text-2xl text-[var(--nclex-text)] md:text-3xl">
              {session.title}
            </h3>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--nclex-text-muted)]">
              {session.subtitle}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <div className="rounded-xl border border-[var(--nclex-border)] bg-[var(--nclex-card-muted)] px-4 py-2 text-sm font-semibold text-[var(--nclex-text-secondary)]">
              Question {session.currentIndex + 1} of {session.questionIds.length}
            </div>
            {session.config.timed && remainingSeconds !== null ? (
              <div className="inline-flex items-center gap-2 rounded-xl border border-[var(--nclex-border)] bg-[var(--nclex-card-muted)] px-4 py-2 text-sm font-semibold text-[var(--nclex-text-secondary)]">
                <Clock3 className="h-4 w-4 text-[var(--nclex-blue)]" />
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
                  goToSessionQuestion(index)
                }}
                disabled={session.config.noBacktracking}
                className={clsx(
                  'flex h-9 w-9 items-center justify-center rounded-full border text-xs font-semibold transition',
                  index === session.currentIndex
                    ? 'border-[var(--nclex-blue)] bg-[var(--nclex-blue)] text-white'
                    : answered
                      ? 'border-[#bce8d4] bg-[var(--nclex-success-soft)] text-[var(--nclex-success)]'
                      : 'border-[var(--nclex-border)] bg-white text-[var(--nclex-text-muted)]',
                  session.config.noBacktracking && 'cursor-not-allowed opacity-60',
                )}
              >
                {index + 1}
              </button>
            )
          })}
        </div>
      </Surface>

      <div className="grid gap-6 xl:grid-cols-[1.18fr_0.82fr]">
        <Surface className="nclex-surface-muted">
          {question.scenario ? (
            <div className="rounded-[16px] border border-[#cfe1f7] bg-[#eef5ff] p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--nclex-blue)]">
                Clinical scenario
              </p>
              <p className="mt-2 text-sm leading-7 text-[var(--nclex-text-secondary)]">{question.scenario}</p>
            </div>
          ) : null}

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <span className="nclex-chip nclex-chip-info">{question.category}</span>
            <span className="nclex-chip nclex-chip-success">
              {question.format === 'select-all-that-apply' ? 'Select all' : 'Single answer'}
            </span>
            <button
              type="button"
              onClick={() => setFlagged((current) => !current)}
              disabled={Boolean(existingResponse)}
              className={clsx(
                'inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em]',
                flagged
                  ? 'border-[#ffd9ae] bg-[var(--nclex-warning-soft)] text-[var(--nclex-warning)]'
                  : 'border-[var(--nclex-border)] bg-white text-[var(--nclex-text-muted)]',
              )}
            >
              <Flag className="h-3.5 w-3.5" />
              {flagged ? 'Flagged' : 'Flag for review'}
            </button>
          </div>

          <h4 className="mt-5 font-serif text-[1.7rem] leading-tight text-[var(--nclex-text)] md:text-[2rem]">
            {question.prompt}
          </h4>

          <div className="mt-6 space-y-3">
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
                  className={clsx(
                    'nclex-answer flex min-h-[64px] w-full items-start gap-4 rounded-[16px] border p-4 text-left transition active:scale-[0.995] sm:min-h-0',
                    selected && 'nclex-answer-selected',
                    submitted && correct && 'nclex-answer-correct',
                    incorrectSelection && 'nclex-answer-incorrect',
                    existingResponse && 'cursor-default',
                  )}
                >
                  <span
                    className={clsx(
                      'mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs font-semibold',
                      selected
                        ? 'border-[var(--nclex-blue)] bg-[var(--nclex-blue)] text-white'
                        : 'border-[var(--nclex-border-strong)] bg-white text-[var(--nclex-text-muted)]',
                      submitted && correct && 'border-[var(--nclex-success)] bg-[var(--nclex-success)] text-white',
                      incorrectSelection && 'border-[var(--nclex-danger)] bg-[var(--nclex-danger)] text-white',
                    )}
                  >
                    {choice.id}
                  </span>
                  <span className="text-sm leading-7 text-[var(--nclex-text-secondary)]">{choice.text}</span>
                </button>
              )
            })}
          </div>

          <div className="mobile-quiz-actions sticky bottom-[calc(env(safe-area-inset-bottom,0px)+5.9rem)] z-10 -mx-1 mt-6 flex flex-wrap gap-3 rounded-[18px] border border-[var(--nclex-border)] bg-white/96 p-3 backdrop-blur-xl md:static md:mx-0 md:rounded-none md:border-0 md:bg-transparent md:p-0">
            {!submitted ? (
              <button
                type="button"
                onClick={() => setSubmitted(true)}
                disabled={selectedAnswers.length === 0}
                className="nclex-btn-primary min-h-[48px] flex-1 rounded-xl px-5 py-3 text-sm font-semibold disabled:cursor-not-allowed disabled:bg-slate-300 md:flex-none"
              >
                Submit answer
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => setShowRationale((current) => !current)}
              className="nclex-btn-secondary inline-flex min-h-[48px] flex-1 items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold md:flex-none"
            >
              <Eye className="h-4 w-4" />
              {showRationale ? 'Hide explanation' : 'Show explanation'}
            </button>
          </div>

          <AnimatePresence>
            {submitted ? (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                className="mt-6 rounded-[18px] border border-[var(--nclex-border)] bg-white p-5"
              >
                <div className="flex flex-wrap items-center gap-3">
                  <span
                    className={clsx(
                      'inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em]',
                      finalResponse
                        ? finalResponse.isCorrect
                          ? 'bg-[var(--nclex-success-soft)] text-[var(--nclex-success)]'
                          : 'bg-[var(--nclex-danger-soft)] text-[var(--nclex-danger)]'
                        : currentIsCorrect
                          ? 'bg-[var(--nclex-success-soft)] text-[var(--nclex-success)]'
                          : 'bg-[var(--nclex-danger-soft)] text-[var(--nclex-danger)]',
                    )}
                  >
                    {finalResponse ? (
                      finalResponse.isCorrect ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />
                    ) : currentIsCorrect ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : (
                      <AlertTriangle className="h-4 w-4" />
                    )}
                    {finalResponse ? (finalResponse.isCorrect ? 'Correct' : 'Incorrect') : currentIsCorrect ? 'Correct' : 'Incorrect'}
                  </span>
                  {finalResponse ? (
                    <span
                      className={clsx(
                        'rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em]',
                        confidenceTone[finalResponse.confidence],
                      )}
                    >
                      Confidence: {finalResponse.confidence}
                    </span>
                  ) : null}
                </div>

                {!confidenceChosen ? (
                  <div className="mt-5">
                    <p className="text-sm font-semibold text-[var(--nclex-text)]">How confident were you?</p>
                    <p className="mt-1 text-sm text-[var(--nclex-text-muted)]">
                      High confidence + wrong reveals a critical blind spot. Low confidence + correct means the idea is close, but still unstable.
                    </p>
                    <div className="mt-4 flex flex-wrap gap-3">
                      {(['low', 'medium', 'high'] as ConfidenceLevel[]).map((level) => (
                        <button
                          key={level}
                          type="button"
                          onClick={() => handleConfidence(level)}
                          className={clsx(
                            'rounded-full border px-4 py-2 text-sm font-semibold capitalize transition',
                            confidenceTone[level],
                          )}
                        >
                          {level}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}

                {showRationale ? (
                  <div className="mt-5 grid gap-4 md:grid-cols-2">
                    <div className="md:col-span-2">
                      <RationaleCard
                        title="Tutor target"
                        tone="blue"
                        body={`${tutorInsight.reviewTarget}. Trap to watch: ${tutorInsight.trap}`}
                        footer={tutorInsight.trustFlags.join(' | ')}
                      />
                    </div>
                    {!currentIsCorrect ? (
                      <div className="md:col-span-2">
                        <RationaleCard
                          title="Why you may have missed it"
                          tone="amber"
                          body={getMissReason(questionId, selectedAnswers)}
                        />
                      </div>
                    ) : null}
                    {finalDiagnosis && !finalDiagnosis.scoreResult.isCorrect ? (
                      <div className="md:col-span-2">
                        <RationaleCard
                          title="Engine diagnosis"
                          tone="amber"
                          body={`This response suggests ${finalDiagnosis.likelyMisconceptionId.replaceAll('_', ' ')}. ${finalDiagnosis.confidenceEscalated ? 'Because confidence was high, repair this pattern before adding more random volume.' : 'Use the rationale, then answer a nearby repair item.'}`}
                          footer={
                            finalDiagnosis.countsTowardReadiness
                              ? 'Counts toward trusted readiness evidence'
                              : `Practice signal only: ${finalDiagnosis.readinessExclusionReasons.join(', ') || 'insufficient item trust'}`
                          }
                        />
                      </div>
                    ) : null}
                    {finalRemediation ? (
                      <div className="md:col-span-2">
                        <RationaleCard
                          title="Repair route"
                          tone="blue"
                          body={finalRemediation.nextActionCopy}
                          footer={finalRemediation.routeLabel}
                        />
                      </div>
                    ) : null}
                    <RationaleCard
                      title="Why the best answer is right"
                      tone="green"
                      body={question.rationale.whyCorrect}
                    />
                    <RationaleCard
                      title="Why the other choices are wrong"
                      tone="amber"
                      body={question.rationale.whyOthers}
                    />
                    <RationaleCard title="NCLEX tip" tone="blue" body={question.nclexTip} />
                    <RationaleCard
                      title="Clinical relevance"
                      tone="blue"
                      body={question.clinicalRelevance}
                    />
                  </div>
                ) : null}
              </motion.div>
            ) : null}
          </AnimatePresence>
        </Surface>

        <div className="space-y-6">
          <Surface className="hidden xl:block">
            <SectionHeading title="Session momentum" />
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
                  value={`${session.responses.filter((response) => response.isCorrect).length}`}
                />
                <MetricTile
                  label="Flagged"
                  value={`${session.responses.filter((response) => response.flagged).length + (flagged && !existingResponse ? 1 : 0)}`}
                />
              </div>
            </div>
          </Surface>

          <Surface className="hidden xl:block">
            <div className="flex items-center gap-3">
              <Bookmark className="h-5 w-5 text-[var(--nclex-blue)]" />
              <h4 className="font-serif text-xl text-[var(--nclex-text)]">Next move</h4>
            </div>
            <p className="mt-3 text-sm leading-6 text-[var(--nclex-text-muted)]">
              Stay deliberate. Immediate feedback matters more than rushing volume.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={previousQuestion}
                disabled={session.currentIndex === 0 || Boolean(session.config.noBacktracking)}
                className="nclex-btn-secondary inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ArrowLeft className="h-4 w-4" />
                Previous
              </button>
              {!isLastQuestion ? (
                <button
                  type="button"
                  onClick={nextQuestion}
                  disabled={!confidenceChosen}
                  className="nclex-btn-primary inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  Next question
                  <ArrowRight className="h-4 w-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={finishSession}
                  disabled={!confidenceChosen}
                  className="nclex-btn-primary inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  Finish session
                  <CheckCircle2 className="h-4 w-4" />
                </button>
              )}
              <button
                type="button"
                onClick={onExit}
                className="nclex-btn-secondary rounded-xl px-4 py-2.5 text-sm font-semibold"
              >
                Exit
              </button>
            </div>
          </Surface>

          <Surface className="hidden xl:block">
            <div className="flex items-center gap-3">
              <Lightbulb className="h-5 w-5 text-[var(--nclex-warning)]" />
              <h4 className="font-serif text-xl text-[var(--nclex-text)]">Micro-coaching</h4>
            </div>
            <ul className="mt-4 space-y-3 text-sm leading-6 text-[var(--nclex-text-muted)]">
              <li>Ask what makes the client unsafe right now, not which task simply feels urgent.</li>
              <li>Read the whole stem before scanning for familiar answer words.</li>
              <li>High-confidence misses deserve the slowest review because they expose habits.</li>
            </ul>
          </Surface>
        </div>
      </div>

      <div className="safe-bottom mobile-quiz-actions sticky bottom-[5.15rem] z-20 -mx-1 rounded-[20px] border border-[var(--nclex-border)] bg-white/96 p-3 backdrop-blur-xl xl:hidden">
        <div className="mb-2 flex items-center justify-between text-xs font-semibold uppercase tracking-[0.14em] text-[var(--nclex-text-muted)]">
          <span>Question flow</span>
          <span>
            {session.responses.length}/{session.questionIds.length} complete
          </span>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={previousQuestion}
            disabled={session.currentIndex === 0 || Boolean(session.config.noBacktracking)}
            className="nclex-btn-secondary inline-flex min-h-[48px] flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
          {!isLastQuestion ? (
            <button
              type="button"
              onClick={nextQuestion}
              disabled={!confidenceChosen}
              className="nclex-btn-primary inline-flex min-h-[48px] flex-[1.3] items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              Next
              <ArrowRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={finishSession}
              disabled={!confidenceChosen}
              className="nclex-btn-primary inline-flex min-h-[48px] flex-[1.3] items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              Finish
              <CheckCircle2 className="h-4 w-4" />
            </button>
          )}
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

function RationaleCard({
  title,
  body,
  tone,
  footer,
}: {
  title: string
  body: string
  tone: 'blue' | 'green' | 'amber'
  footer?: string
}) {
  const styles = {
    blue: 'border-[#cfe1f7] bg-[#eef5ff] text-[var(--nclex-blue)]',
    green: 'border-[#c8eddc] bg-[var(--nclex-success-soft)] text-[var(--nclex-success)]',
    amber: 'border-[#ffe0b0] bg-[var(--nclex-warning-soft)] text-[var(--nclex-warning)]',
  }[tone]

  return (
    <div className={clsx('rounded-[16px] border p-4', styles)}>
      <p className="text-xs font-semibold uppercase tracking-[0.16em]">{title}</p>
      <p className="mt-2 text-sm leading-6 text-[var(--nclex-text-secondary)]">{body}</p>
      {footer ? (
        <p className="mt-3 rounded-full border border-sky-300/25 bg-sky-300/10 px-3 py-1.5 text-xs font-semibold text-sky-900/70">
          {footer}
        </p>
      ) : null}
    </div>
  )
}
