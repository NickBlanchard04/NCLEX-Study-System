import { createNoteAutosave } from '../services/note-autosave'
import { useDeferredValue, useEffect, useMemo, useRef, useState, useTransition } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import topicGuides from '../seo/topics.json'
import { TopicLinks } from './topic-links'
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Award,
  BadgeCheck,
  BarChart3,
  BrainCircuit,
  BookOpen,
  CalendarClock,
  CheckCircle2,
  ChevronLeft,
  ChevronDown,
  ChevronRight,
  Cloud,
  CloudOff,
  ClipboardList,
  Clock3,
  FileText,
  Flame,
  FlaskConical,
  FolderOpen,
  HeartPulse,
  ExternalLink,
  Link2,
  LoaderCircle,
  LockKeyhole,
  NotebookPen,
  RefreshCw,
  Shuffle,
  Settings,
  ShieldCheck,
  Sparkles,
  SquareStack,
  Target,
  Timer,
  Trash2,
  TrendingUp,
  Upload,
  UploadCloud,
  UserRound,
  Zap,
} from 'lucide-react'
import { clsx } from 'clsx'
import type {
  ActiveSession,
  ExamTrackId,
  Flashcard,
  FlashcardStatus,
  MaterialFlashcard,
  MaterialImportMode,
  MaterialQuestion,
  Note,
  QuestionCategory,
  StudyMaterial,
} from '../app/types'
import { useStudySystemStore } from '../app/store'
import { createClientId } from '../services/ids'
import { getSafeErrorCopy, reportSafeError } from '../services/safe-errors'
import { filterMaterialStudyTools, summarizeMaterialQuality, type MaterialQualityIssue } from '../services/material-quality'
import { trackAppEvent } from '../services/analytics-client'
import {
  contentFeedbackReasonLabels,
  contentFeedbackReasons,
  recordContentFeedback,
  trackContentFeedbackOpened,
  type ContentFeedbackReason,
} from '../services/content-feedback'
import {
  flashcards,
  getExamCategories,
  getExamDashboardCopy,
  getExamSystems,
  loadLiveBetaFlashcards,
  strategyLessons,
} from '../data/content'
import { examTracks, getExamTrack } from '../data/exam-tracks'
import {
  buildStudyPlan,
  getAnalyticsSnapshot,
  getActiveSessionSummary,
  getDashboardState,
  getPracticeHistory,
  getWeakAreas,
  questionLookup,
} from '../services/study-system'
import {
  CommandBadge,
  CommandDisclosurePanel,
  CommandEmptyState,
  CommandFocusPanel,
  CommandInsightPanel,
  CommandRouteLink,
  CommandStatTile,
  CommandStatusRow,
  DetailGrid,
  EmptyState,
  FocusPanel,
  MasteryPill,
  MetricChip,
  NextActionPanel,
  PageHeader,
  PageStack,
  ProgressBar,
  QuestionSessionRunner,
  SectionHeading,
  Surface,
} from './ui'
import { MaterialUploadAsset, NurseCommandBackdrop } from './nurse-command-assets'

const percentTooltip = (
  value: number | string | ReadonlyArray<number | string> | undefined,
) => {
  if (typeof value === 'number') return `${Math.round(value * 100)}%`
  if (Array.isArray(value)) return value.join(', ')
  return value ?? ''
}

const isActiveSessionOpen = (session: ActiveSession | null | undefined) =>
  Boolean(session && !session.endedAt && session.status !== 'discarded' && !session.deletedAt)

const isRenderableSession = (session: ActiveSession | null | undefined) =>
  Boolean(session && session.status !== 'discarded' && !session.deletedAt)

const seededHash = (value: string) => {
  let hash = 0
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0
  }
  return hash
}

export { StudyMenuPage } from './study-menu-page'
export { QuickStudyPage } from './quick-study-page'

export function DashboardPage() {
  const navigate = useNavigate()
  const profile = useStudySystemStore((state) => state.profile)
  const authUser = useStudySystemStore((state) => state.authUser)
  const isDemoMode = useStudySystemStore((state) => state.isDemoMode)
  const attempts = useStudySystemStore((state) => state.attempts)
  const materials = useStudySystemStore((state) => state.materials)
  const activeSession = useStudySystemStore((state) => state.activeSession)
  const practiceSessions = useStudySystemStore((state) => state.practiceSessions)
  const discardPracticeSession = useStudySystemStore((state) => state.abandonSession)
  const startQuickStudy = useStudySystemStore((state) => state.startQuickStudy)
  const [dashboardNowMs] = useState(() => new Date().getTime())
  const dashboard = useMemo(() => getDashboardState(profile, attempts), [attempts, profile])
  const analytics = useMemo(() => getAnalyticsSnapshot(attempts, profile), [attempts, profile])
  const continueSession = useMemo(() => getActiveSessionSummary(activeSession), [activeSession])
  const practiceHistory = useMemo(() => getPracticeHistory(practiceSessions, 3), [practiceSessions])
  const weakestArea = dashboard.weakestCategories[0]
  const todayMinutes = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10)
    return Math.round(
      attempts
        .filter((attempt) => attempt.completedAt.slice(0, 10) === today)
        .reduce((sum, attempt) => sum + attempt.timeSpentSec, 0) / 60,
    )
  }, [attempts])
  const activeExamTrack = getExamTrack(profile.examTrack ?? 'nclex-rn')
  const dashboardCopy = getExamDashboardCopy(activeExamTrack.id)
  const daysUntilExam = Math.max(
    0,
    Math.ceil((new Date(profile.examDate).getTime() - dashboardNowMs) / (1000 * 60 * 60 * 24)),
  )
  const readinessSnapshot = analytics.readinessSnapshot
  const activeRepairEvents = analytics.engineRemediationEvents.filter(
    (event) => event.repairRequired && !event.repairSuccess,
  )
  const repairQueueCount = Math.max(activeRepairEvents.length, readinessSnapshot.remediationSummary.unresolvedRepairCount)
  const priorityRepair = activeRepairEvents[0]
  const primaryCoverageGap = readinessSnapshot.coverageGaps[0]
  const primaryWeakDimension = readinessSnapshot.topWeakDimensions[0]
  const primaryConfidenceRisk = readinessSnapshot.topConfidenceRisks[0]
  const engineWeakPatternLabel = formatEngineDimensionLabel(
    primaryWeakDimension
      ? `${primaryWeakDimension.dimensionType}:${primaryWeakDimension.dimensionId}`
      : analytics.learnerMasteryVector.summary.weakestDimensionId,
  )
  const coverageGapLabel = primaryCoverageGap
    ? formatEngineDimensionLabel(`${primaryCoverageGap.dimensionType}:${primaryCoverageGap.dimensionId}`)
    : ''
  const confidenceRiskLabel = primaryConfidenceRisk
    ? formatEngineDimensionLabel(`${primaryConfidenceRisk.dimensionType}:${primaryConfidenceRisk.dimensionId}`)
    : ''
  const readinessScore = readinessSnapshot.readinessScoreAvailable
    ? readinessSnapshot.readinessScore
    : Math.max(readinessSnapshot.readinessScore, analytics.overallAccuracy)
  const readinessPercent = Math.round(readinessScore * 100)
  const readinessBadge =
    readinessSnapshot.status === 'ready'
      ? 'Strong Signal'
      : readinessSnapshot.status === 'approaching'
        ? 'On Track'
        : readinessSnapshot.status === 'building'
          ? 'Building'
          : 'New Signal'
  const readinessTone =
    readinessSnapshot.status === 'ready'
      ? 'emerald'
      : readinessSnapshot.status === 'approaching'
        ? 'cyan'
        : readinessSnapshot.status === 'building'
          ? 'amber'
          : 'slate'
  const todayGoalProgress = dashboard.dailyGoal ? dashboard.todayCompleted / dashboard.dailyGoal : 0
  const materialsReadyCount = materials.filter((item) => item.extractionStatus === 'ready').length
  const materialsNeedingAttention = materials.filter(
    (item) =>
      item.extractionStatus === 'error' ||
      (item.extractionStatus === 'ready' &&
        (!item.generatedFlashcardIds.length || !item.generatedQuestionIds.length)),
  ).length
  const startPlanQuickStudy = (category?: QuestionCategory) => {
    if (continueSession) {
      navigate(continueSession.route)
      return
    }
    startQuickStudy(category)
    navigate('/quick-study')
  }
  const launchDashboardQuickStudy = (category?: QuestionCategory) => {
    const sessionIsOpen = isActiveSessionOpen(activeSession)
    if (!(sessionIsOpen && activeSession?.mode === 'quick-study')) {
      startQuickStudy(category)
    }
    navigate('/quick-study')
  }
  const primaryCategory = weakestArea?.category ?? getExamCategories(activeExamTrack.id)[0] ?? 'Pharmacology'
  const missionTitle = priorityRepair
    ? `Fix first: ${priorityRepair.routeLabel}`
    : primaryCoverageGap
      ? `Do this next: ${coverageGapLabel}`
      : weakestArea
        ? `Do this next: ${shortCategoryLabel(primaryCategory)}`
        : materialsReadyCount
          ? 'Review one uploaded material'
          : 'Complete one Quick Study session'
  const missionCopy = priorityRepair
    ? priorityRepair.nextActionCopy
    : primaryCoverageGap
      ? `Practice this area to create enough evidence for the readiness badge. Current gap: ${formatEngineReasonLabel(primaryCoverageGap.gapType)}.`
      : weakestArea
        ? 'One short drill is the clearest next step from recent misses. Finish it, then the dashboard will update.'
        : materialsReadyCount
        ? 'Use a material you already uploaded before adding more notes. Turn it into recall, not storage.'
        : 'One focused set gives the dashboard fresh practice evidence without overloading the day.'
  const missionReason = priorityRepair
    ? 'First task'
    : primaryCoverageGap
      ? 'Evidence gap'
      : weakestArea
    ? 'Recent misses'
    : materialsReadyCount
      ? 'Uploaded material'
      : 'Fresh practice signal'
  const planItems = [
    {
      id: 'priority-drill',
      label: `15 Questions - ${shortCategoryLabel(primaryCategory)}`,
      meta: '25 min',
      actionLabel: priorityRepair ? 'Start repair' : 'Start now',
      icon: <Sparkles className="h-4 w-4" />,
      onSelect: () => startPlanQuickStudy(weakestArea?.category),
    },
    {
      id: 'secondary-drill',
      label: `10 Questions - ${shortCategoryLabel(dashboard.weakestCategories[1]?.category ?? 'Adult Health / Med-Surg')}`,
      meta: '15 min',
      actionLabel: 'Drill',
      icon: <Target className="h-4 w-4" />,
      onSelect: () => startPlanQuickStudy(dashboard.weakestCategories[1]?.category),
    },
    {
      id: 'review-incorrect',
      label: 'Review Incorrect',
      meta: '20 min',
      actionLabel: 'Review',
      icon: <ClipboardList className="h-4 w-4" />,
      onSelect: () => navigate('/weak-areas'),
    },
    {
      id: 'reading',
      label: 'Read: Fluid & Electrolytes',
      meta: '15 min',
      actionLabel: 'Read',
      icon: <BookOpen className="h-4 w-4" />,
      onSelect: () => navigate('/strategy-training'),
    },
    {
      id: 'mini-exam',
      label: 'Mini Exam (25 Qs)',
      meta: '25 min',
      actionLabel: 'Open',
      icon: <CalendarClock className="h-4 w-4" />,
      onSelect: () => navigate('/test-mode'),
    },
  ]
  const missionStats = [
    {
      label: 'Daily target',
      value: `${dashboard.todayCompleted}/${dashboard.dailyGoal}`,
      detail: `${Math.round(todayGoalProgress * 100)}% complete`,
      icon: <Target className="h-4 w-4" />,
      tone: 'cyan',
    },
    {
      label: 'Badge signal',
      value: readinessBadge,
      detail: `${readinessSnapshot.trustedAttemptCount} trusted attempts`,
      icon: <Activity className="h-4 w-4" />,
      tone: readinessSnapshot.status === 'building' ? 'amber' : readinessSnapshot.status === 'ready' ? 'emerald' : 'cyan',
    },
    {
      label: 'Fix queue',
      value: `${repairQueueCount}`,
      detail: primaryCoverageGap ? `${readinessSnapshot.coverageGaps.length} coverage gaps` : `${formatMinutes(todayMinutes)} today`,
      icon: <Flame className="h-4 w-4" />,
      tone: 'amber',
    },
  ]
  const missionStatToneClasses = {
    cyan: 'border-cyan-200/22 bg-cyan-300/[0.08] text-cyan-100',
    emerald: 'border-emerald-200/22 bg-emerald-300/[0.08] text-emerald-100',
    amber: 'border-amber-200/22 bg-amber-300/[0.08] text-amber-100',
  }
  const badgeToneClasses = {
    strong: {
      ring: 'border-amber-200/45 bg-[linear-gradient(145deg,rgba(251,191,36,0.18),rgba(16,185,129,0.08))] text-amber-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]',
      icon: 'border-amber-200/30 bg-amber-300/18 text-amber-100',
      fill: 'bg-[linear-gradient(90deg,#fbbf24_0%,#34d399_100%)]',
      tier: 'Gold',
      label: 'Strong signal',
      marker: <Award className="h-4 w-4" />,
    },
    developing: {
      ring: 'border-slate-200/32 bg-[linear-gradient(145deg,rgba(226,232,240,0.14),rgba(20,184,166,0.07))] text-slate-100',
      icon: 'border-slate-200/24 bg-slate-200/12 text-slate-100',
      fill: 'bg-[linear-gradient(90deg,#cbd5e1_0%,#2dd4bf_100%)]',
      tier: 'Silver',
      label: 'Improving',
      marker: <BadgeCheck className="h-4 w-4" />,
    },
    fragile: {
      ring: 'border-sky-200/32 bg-[linear-gradient(145deg,rgba(56,189,248,0.15),rgba(251,113,133,0.07))] text-sky-100',
      icon: 'border-sky-200/24 bg-sky-300/14 text-sky-100',
      fill: 'bg-[linear-gradient(90deg,#38bdf8_0%,#fb7185_100%)]',
      tier: 'Blue',
      label: 'Needs reps',
      marker: <Activity className="h-4 w-4" />,
    },
    empty: {
      ring: 'border-slate-300/18 bg-slate-300/[0.055] text-slate-100',
      icon: 'border-slate-300/14 bg-slate-300/10 text-slate-200/72',
      fill: 'bg-slate-300/24',
      tier: 'Locked',
      label: 'No signal',
      marker: <LockKeyhole className="h-4 w-4" />,
    },
  }
  const categoryAccentThemes = [
    {
      match: ['management', 'leadership'],
      icon: <HeartPulse className="h-4 w-4" />,
      surface: 'border-cyan-200/22 bg-cyan-300/[0.07]',
      iconClass: 'border-cyan-200/30 bg-cyan-300/14 text-cyan-100',
      line: 'bg-cyan-300',
      fill: 'bg-[linear-gradient(90deg,#22d3ee_0%,#60a5fa_100%)]',
    },
    {
      match: ['safety', 'infection'],
      icon: <ShieldCheck className="h-4 w-4" />,
      surface: 'border-emerald-200/22 bg-emerald-300/[0.07]',
      iconClass: 'border-emerald-200/30 bg-emerald-300/14 text-emerald-100',
      line: 'bg-emerald-300',
      fill: 'bg-[linear-gradient(90deg,#34d399_0%,#a3e635_100%)]',
    },
    {
      match: ['health', 'promotion', 'maintenance'],
      icon: <Zap className="h-4 w-4" />,
      surface: 'border-amber-200/22 bg-amber-300/[0.07]',
      iconClass: 'border-amber-200/30 bg-amber-300/14 text-amber-100',
      line: 'bg-amber-300',
      fill: 'bg-[linear-gradient(90deg,#fbbf24_0%,#fb923c_100%)]',
    },
    {
      match: ['psychosocial', 'integrity'],
      icon: <BrainCircuit className="h-4 w-4" />,
      surface: 'border-fuchsia-200/20 bg-fuchsia-300/[0.07]',
      iconClass: 'border-fuchsia-200/28 bg-fuchsia-300/14 text-fuchsia-100',
      line: 'bg-fuchsia-300',
      fill: 'bg-[linear-gradient(90deg,#c084fc_0%,#f472b6_100%)]',
    },
  ]
  const fallbackCategoryAccent = {
    icon: <BookOpen className="h-4 w-4" />,
    surface: 'border-sky-200/18 bg-sky-300/[0.055]',
    iconClass: 'border-sky-200/24 bg-sky-300/12 text-sky-100',
    line: 'bg-sky-300',
    fill: 'bg-[linear-gradient(90deg,#38bdf8_0%,#94a3b8_100%)]',
  }
  const getCategoryAccent = (category: string, index = 0) => {
    const normalized = category.toLowerCase()
    return categoryAccentThemes.find((theme) => theme.match.some((match) => normalized.includes(match)))
      ?? categoryAccentThemes[index % categoryAccentThemes.length]
      ?? fallbackCategoryAccent
  }
  const normalizedReadinessScore = Math.max(0, Math.min(1, readinessScore))
  const personalizedEngineAction = priorityRepair
    ? `Repair ${priorityRepair.routeLabel}`
    : primaryCoverageGap
      ? `Build evidence in ${coverageGapLabel}`
      : weakestArea
        ? `Train ${shortCategoryLabel(primaryCategory)}`
        : readinessSnapshot.nextBestAction
  const personalizedEngineCopy = priorityRepair
    ? priorityRepair.nextActionCopy
    : primaryCoverageGap
      ? `${formatEngineReasonLabel(primaryCoverageGap.gapType)} is blocking a stronger readiness signal. Use a short set before adding more reading.`
      : primaryConfidenceRisk
        ? `${confidenceRiskLabel} is the confidence pattern to watch on the next session.`
        : readinessSnapshot.nextBestAction
  const readinessCircleSize = 124
  const readinessCircleStroke = 9
  const readinessCircleRadius = (readinessCircleSize - readinessCircleStroke) / 2
  const readinessCircleCircumference = 2 * Math.PI * readinessCircleRadius
  const readinessCircleOffset =
    readinessCircleCircumference - normalizedReadinessScore * readinessCircleCircumference
  const readinessTheme = {
    emerald: {
      card: 'border-emerald-200/30 bg-emerald-300/[0.08]',
      stroke: 'stroke-emerald-300',
      label: 'text-emerald-100',
    },
    cyan: {
      card: 'border-cyan-200/30 bg-cyan-300/[0.08]',
      stroke: 'stroke-cyan-300',
      label: 'text-cyan-100',
    },
    amber: {
      card: 'border-amber-200/30 bg-amber-300/[0.08]',
      stroke: 'stroke-amber-300',
      label: 'text-amber-100',
    },
    slate: {
      card: 'border-slate-200/18 bg-slate-300/[0.065]',
      stroke: 'stroke-slate-300',
      label: 'text-slate-100',
    },
  }[readinessTone]
  const masteryBadges = getExamCategories(activeExamTrack.id)
    .slice(0, 4)
    .map((category, index) => {
      const stat = analytics.categoryStats.find((item) => item.category === category)
      const tone = stat && stat.attemptCount > 0 ? stat.masteryLevel : 'empty'
      const progress = stat && stat.attemptCount > 0 ? stat.accuracy : 0
      const visual = getCategoryAccent(category, index)

      return {
        category,
        label: shortCategoryLabel(category),
        progress,
        attempts: stat?.attemptCount ?? 0,
        theme: badgeToneClasses[tone],
        visual,
      }
    })
  const supportActions = planItems.slice(1, 4)
  const showFirstSessionActivation = !attempts.length && !materials.length && !continueSession
  const chooseActivation = (choice: 'quick_study' | 'upload_material' | 'set_goal', action: () => void) => {
    void trackAppEvent(
      'activation_choice_clicked',
      {
        page_path: '/dashboard',
        feature_name: 'First Session Activation',
        exam_track: activeExamTrack.id,
        is_demo_user: isDemoMode,
        metadata: { choice },
      },
      { userId: authUser?.id, isDemoUser: isDemoMode },
    )
    action()
  }

  return (
    <PageStack className="space-y-4 md:space-y-5">
      <FocusPanel
        className="dashboard-section-mission border-cyan-200/24"
        style={{
          background:
            'radial-gradient(circle at 24% 18%, rgba(34, 211, 238, 0.2), transparent 34%), linear-gradient(135deg, rgba(7, 29, 52, 0.9), rgba(6, 28, 49, 0.82))',
          borderColor: 'rgba(103, 232, 249, 0.3)',
        }}
      >
        <div className="relative overflow-hidden bg-[linear-gradient(135deg,rgba(8,47,73,0.98),rgba(6,28,49,0.94)_54%,rgba(14,116,144,0.42))] p-4 text-white sm:p-5 md:p-6">
          <div className="pointer-events-none absolute inset-0 opacity-35 [background-image:linear-gradient(rgba(125,211,252,0.12)_1px,transparent_1px),linear-gradient(90deg,rgba(125,211,252,0.09)_1px,transparent_1px)] [background-size:38px_38px]" />
          <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,#22d3ee_0%,#34d399_36%,#fbbf24_70%,#f472b6_100%)]" />
          <div className="relative grid gap-5 lg:grid-cols-[minmax(0,1fr)_250px] lg:items-stretch">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-2 rounded-lg border border-cyan-200/26 bg-cyan-300/10 px-3 py-1.5 text-xs font-bold uppercase text-cyan-100">
                  <BadgeCheck className="h-3.5 w-3.5" />
                  {activeExamTrack.shortName}
                </span>
                <span className="inline-flex items-center gap-2 rounded-lg border border-white/14 bg-white/8 px-3 py-1.5 text-xs font-bold uppercase text-sky-100/72">
                  <CalendarClock className="h-3.5 w-3.5" />
                  Exam in {daysUntilExam}d
                </span>
                <span className="inline-flex items-center gap-2 rounded-lg border border-amber-200/22 bg-amber-300/10 px-3 py-1.5 text-xs font-bold uppercase text-amber-100">
                  <Zap className="h-3.5 w-3.5" />
                  {missionReason}
                </span>
                {repairQueueCount ? (
                  <span className="inline-flex items-center gap-2 rounded-lg border border-emerald-200/24 bg-emerald-300/10 px-3 py-1.5 text-xs font-bold uppercase text-emerald-100">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    {repairQueueCount} repairs
                  </span>
                ) : null}
              </div>

              <div className="mt-5 inline-flex max-w-full items-center gap-2 rounded-xl border border-cyan-200/20 bg-[#02101f]/32 px-3 py-2 text-xs font-bold text-cyan-50/78">
                <Target className="h-3.5 w-3.5 shrink-0 text-cyan-200" />
                <span className="min-w-0">One task, one badge signal, and one review queue for today.</span>
              </div>
              <p className="mt-5 text-sm font-bold uppercase text-cyan-100/78">Start here</p>
              <h2 className="mt-2 max-w-3xl text-[2rem] font-bold leading-[1.08] text-white sm:text-3xl md:text-4xl">
                {missionTitle}
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-sky-100/78">
                {missionCopy}
              </p>
              <p className="mt-3 max-w-2xl text-xs font-semibold uppercase tracking-[0.14em] text-sky-100/52">
                Study signal: {engineWeakPatternLabel}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-2 rounded-lg border border-emerald-200/24 bg-emerald-300/10 px-3 py-1.5 text-xs font-bold text-emerald-100">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Practice evidence only
                </span>
                <span className="inline-flex items-center gap-2 rounded-lg border border-sky-200/18 bg-white/[0.055] px-3 py-1.5 text-xs font-bold text-sky-100/70">
                  <Activity className="h-3.5 w-3.5" />
                  {readinessPercent}% readiness signal
                </span>
              </div>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <button
                  type="button"
                  onClick={planItems[0].onSelect}
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-cyan-100/45 bg-[linear-gradient(180deg,#24b8ff_0%,#0b83d6_100%)] px-6 py-3 text-sm font-bold text-white shadow-[0_12px_34px_rgba(14,165,233,0.28)] transition hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-cyan-200/55"
                >
                  Start now
                  <ArrowRight className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/study-plan')}
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-sky-200/22 bg-white/[0.06] px-5 py-3 text-sm font-bold text-sky-100 transition hover:border-sky-200/45 hover:bg-white/[0.09]"
                >
                  View plan
                  <CalendarClock className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className={clsx('rounded-[1rem] border p-4', readinessTheme.card)}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase text-sky-100/64">Readiness badge</p>
                  <p className="mt-2 max-w-40 text-xs leading-5 text-sky-100/62">
                    Practice evidence only, not a licensure prediction. {readinessSnapshot.trustedAttemptCount} trusted / {readinessSnapshot.practiceAttemptCount} practice attempts.
                  </p>
                </div>
                <span className={clsx('rounded-lg border border-white/12 bg-white/8 px-2.5 py-1 text-[0.68rem] font-bold uppercase', readinessTheme.label)}>
                  {readinessBadge}
                </span>
              </div>
              <div className="mt-4 flex items-center justify-center">
                <div className="relative h-[124px] w-[124px]" aria-label={`Readiness signal ${readinessPercent}%`}>
                  <svg viewBox={`0 0 ${readinessCircleSize} ${readinessCircleSize}`} className="h-full w-full -rotate-90">
                    <circle
                      cx={readinessCircleSize / 2}
                      cy={readinessCircleSize / 2}
                      r={readinessCircleRadius}
                      stroke="rgba(226,232,240,0.14)"
                      strokeWidth={readinessCircleStroke}
                      fill="none"
                    />
                    <circle
                      cx={readinessCircleSize / 2}
                      cy={readinessCircleSize / 2}
                      r={readinessCircleRadius}
                      className={clsx('transition-[stroke-dashoffset] duration-700 ease-out', readinessTheme.stroke)}
                      strokeWidth={readinessCircleStroke}
                      strokeLinecap="round"
                      fill="none"
                      style={{
                        strokeDasharray: readinessCircleCircumference,
                        strokeDashoffset: readinessCircleOffset,
                      }}
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                    <p className="text-3xl font-bold text-white">{readinessPercent}%</p>
                    <p className="mt-1 text-[0.68rem] font-bold uppercase text-sky-100/60">signal</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="relative mt-5 grid gap-2 border-t border-white/10 pt-4 sm:grid-cols-3">
            {missionStats.map((stat) => (
              <div
                key={stat.label}
                className={clsx(
                  'min-w-0 rounded-xl border px-3 py-3',
                  missionStatToneClasses[stat.tone as keyof typeof missionStatToneClasses],
                )}
              >
                <div className="flex items-center gap-2 text-xs font-bold uppercase">
                  {stat.icon}
                  <span className="truncate">{stat.label}</span>
                </div>
                <p className="mt-2 truncate text-2xl font-bold text-white">{stat.value}</p>
                <p className="truncate text-xs font-semibold text-sky-100/58">{stat.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </FocusPanel>

      {showFirstSessionActivation ? (
        <section className="rounded-[1.25rem] border border-cyan-300/24 bg-[radial-gradient(circle_at_18%_18%,rgba(34,211,238,0.16),transparent_34%),linear-gradient(135deg,rgba(7,29,52,0.9),rgba(2,8,18,0.96))] p-4 shadow-[0_20px_58px_rgba(14,165,233,0.1)] md:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-cyan-100/70">
                First-session start
              </p>
              <h3 className="mt-1 text-2xl font-bold text-white">
                Pick one starting move.
              </h3>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-sky-100/66">
                New accounts start clean. Choose the fastest path to create your first practice signal.
              </p>
            </div>
            <CommandBadge tone="emerald" icon={<ShieldCheck className="h-3.5 w-3.5" />}>
              Practice evidence only
            </CommandBadge>
          </div>
          <div className="mt-5 grid gap-3 lg:grid-cols-3">
            {[
              {
                title: 'Start 5-question Quick Study',
                description: 'Answer a short set so the dashboard has a first signal.',
                action: 'Start practice',
                icon: <Timer className="h-5 w-5" />,
                tone: 'cyan',
                onSelect: () => launchDashboardQuickStudy(primaryCategory),
              },
              {
                title: 'Upload study material',
                description: 'Turn notes or a guide into editable cards and quiz items.',
                action: 'Add material',
                icon: <UploadCloud className="h-5 w-5" />,
                tone: 'violet',
                onSelect: () => navigate('/my-materials'),
              },
              {
                title: 'Set your study target',
                description: 'Confirm exam track, goal date, and daily intensity.',
                action: 'Set goal',
                icon: <Settings className="h-5 w-5" />,
                tone: 'amber',
                onSelect: () => navigate('/settings'),
              },
            ].map((item) => (
              <button
                key={item.title}
                type="button"
                onClick={() =>
                  chooseActivation(
                    item.action === 'Start practice'
                      ? 'quick_study'
                      : item.action === 'Add material'
                        ? 'upload_material'
                        : 'set_goal',
                    item.onSelect,
                  )
                }
                className={clsx(
                  'group flex min-h-[142px] flex-col items-start justify-between rounded-[1rem] border p-4 text-left transition hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-cyan-200/50',
                  item.tone === 'cyan' && 'border-cyan-200/24 bg-cyan-300/[0.075] hover:bg-cyan-300/[0.11]',
                  item.tone === 'violet' && 'border-violet-200/22 bg-violet-300/[0.075] hover:bg-violet-300/[0.11]',
                  item.tone === 'amber' && 'border-amber-200/22 bg-amber-300/[0.075] hover:bg-amber-300/[0.11]',
                )}
              >
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-white/12 bg-white/[0.07] text-cyan-100">
                  {item.icon}
                </span>
                <span>
                  <span className="block text-base font-bold text-white">{item.title}</span>
                  <span className="mt-2 block text-sm leading-6 text-sky-100/64">{item.description}</span>
                  <span className="mt-3 inline-flex items-center gap-2 text-sm font-bold text-cyan-100">
                    {item.action}
                    <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                  </span>
                </span>
              </button>
            ))}
          </div>
        </section>
      ) : null}

      {continueSession || practiceHistory.length ? (
        <section className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
          {continueSession ? (
            <Surface className="border-cyan-300/24 bg-cyan-300/[0.065]">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-cyan-100/70">
                    Continue session
                  </p>
                  <h3 className="mt-1 text-xl font-bold text-white">{continueSession.label}</h3>
                  <p className="mt-1 text-sm leading-6 text-sky-100/66">
                    {continueSession.answeredCount}/{continueSession.questionCount} answered in {continueSession.topCategory}.
                    Resume where you left off.
                  </p>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => navigate(continueSession.route)}
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-cyan-100/45 bg-cyan-400/18 px-4 py-2.5 text-sm font-bold text-cyan-50 transition hover:bg-cyan-400/25"
                  >
                    Resume
                    <ArrowRight className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={discardPracticeSession}
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-rose-200/25 bg-rose-300/[0.08] px-4 py-2.5 text-sm font-bold text-rose-100 transition hover:bg-rose-300/14"
                  >
                    <Trash2 className="h-4 w-4" />
                    Discard
                  </button>
                </div>
              </div>
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-[linear-gradient(90deg,#22d3ee_0%,#34d399_100%)]"
                  style={{
                    width: `${Math.max(
                      6,
                      Math.round((continueSession.answeredCount / Math.max(continueSession.questionCount, 1)) * 100),
                    )}%`,
                  }}
                />
              </div>
            </Surface>
          ) : null}

          {practiceHistory.length ? (
            <Surface className="border-emerald-300/20 bg-emerald-300/[0.045]">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-100/70">
                    Recent practice
                  </p>
                  <h3 className="mt-1 text-xl font-bold text-white">Scores and review trail</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link
                    to="/weak-areas"
                    className="inline-flex min-h-9 items-center rounded-lg border border-amber-200/20 bg-amber-300/10 px-3 text-sm font-bold text-amber-100 transition hover:bg-amber-300/16"
                  >
                    Review missed
                  </Link>
                  <Link
                    to="/performance-analytics"
                    className="inline-flex min-h-9 items-center rounded-lg border border-cyan-200/18 bg-cyan-300/10 px-3 text-sm font-bold text-cyan-100 transition hover:bg-cyan-300/16"
                  >
                    View history
                  </Link>
                </div>
              </div>
              <div className="mt-4 grid gap-2">
                {practiceHistory.map((session) => (
                  <div
                    key={session.id}
                    className="grid gap-3 rounded-xl border border-white/10 bg-white/[0.04] p-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-white">{session.label}</p>
                      <p className="mt-1 text-xs font-semibold text-sky-100/58">
                        {session.topCategory} - {session.answeredCount}/{session.questionCount} answered -{' '}
                        {new Date(session.completedAt).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 sm:justify-end">
                      <span className="inline-flex min-w-16 justify-center rounded-lg border border-emerald-200/24 bg-emerald-300/10 px-3 py-1.5 text-sm font-bold text-emerald-100">
                        {Math.round(session.score * 100)}%
                      </span>
                      <button
                        type="button"
                        onClick={() => navigate('/performance-analytics')}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-cyan-200/16 bg-cyan-300/[0.07] text-cyan-100 transition hover:bg-cyan-300/14"
                        aria-label={`Review ${session.label}`}
                      >
                        <BarChart3 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </Surface>
          ) : null}
        </section>
      ) : null}

      <CommandFocusPanel tone={readinessTone}>
        <div className="grid gap-5 p-5 md:grid-cols-[minmax(0,1fr)_18rem] md:p-6 md:items-center">
          <div>
            <div className="flex flex-wrap gap-2">
              <CommandBadge tone={readinessTone} icon={<Activity className="h-3.5 w-3.5" />}>
                Engine signal
              </CommandBadge>
              <CommandBadge tone={repairQueueCount ? 'amber' : 'emerald'} icon={<ShieldCheck className="h-3.5 w-3.5" />}>
                {readinessSnapshot.trustedAttemptCount} trusted attempts
              </CommandBadge>
            </div>
            <h3 className="mt-4 text-2xl font-bold tracking-normal text-white md:text-3xl">
              {personalizedEngineAction}
            </h3>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-sky-100/68">
              {personalizedEngineCopy}
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2 md:grid-cols-1">
            <CommandStatTile
              label="Readiness"
              value={`${readinessPercent}%`}
              detail={readinessBadge}
              tone={readinessTone}
              icon={<BadgeCheck className="h-4 w-4" />}
            />
            <CommandStatTile
              label="Repair"
              value={`${repairQueueCount}`}
              detail="open fixes"
              tone={repairQueueCount ? 'amber' : 'emerald'}
              icon={<Target className="h-4 w-4" />}
            />
            <CommandStatTile
              label="Evidence"
              value={`${readinessSnapshot.practiceAttemptCount}`}
              detail="practice attempts"
              tone="cyan"
              icon={<ClipboardList className="h-4 w-4" />}
            />
          </div>
        </div>
      </CommandFocusPanel>

      <section
        className="dashboard-section-mastery rounded-[1.25rem] border border-emerald-300/22 p-4 shadow-[0_18px_50px_rgba(16,185,129,0.08)] md:p-5"
        style={{
          background:
            'radial-gradient(circle at 18% 24%, rgba(52, 211, 153, 0.18), transparent 32%), linear-gradient(135deg, rgba(6, 78, 59, 0.38), rgba(6, 28, 49, 0.82) 58%, rgba(20, 83, 45, 0.22))',
          borderColor: 'rgba(110, 231, 183, 0.28)',
        }}
      >
        <div className="mb-3 flex items-end justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase text-emerald-100/70">Badge board</p>
            <h3 className="mt-1 text-2xl font-bold text-white">Mastery badges</h3>
            <p className="mt-1 text-sm leading-6 text-sky-100/62">
              Category badges show where practice evidence is strong, improving, needs reps, or still locked.{' '}
              {primaryConfidenceRisk
                ? `Confidence risk: ${confidenceRiskLabel}`
                : primaryCoverageGap
                  ? `Coverage gap: ${coverageGapLabel}`
                  : `Weakest pattern: ${engineWeakPatternLabel}`}
            </p>
          </div>
          <Link to="/performance-analytics" className="hidden text-sm font-bold text-cyan-100 sm:inline-flex">
            Analytics
          </Link>
        </div>
        <div className="mb-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { label: 'Gold', detail: 'strong signal', className: 'border-amber-200/28 bg-amber-300/[0.09] text-amber-100' },
            { label: 'Silver', detail: 'improving', className: 'border-slate-200/24 bg-slate-300/[0.075] text-slate-100' },
            { label: 'Blue', detail: 'needs reps', className: 'border-sky-200/26 bg-sky-300/[0.08] text-sky-100' },
            { label: 'Locked', detail: 'practice to unlock', className: 'border-white/14 bg-white/[0.045] text-sky-100/70' },
          ].map((item) => (
            <div key={item.label} className={clsx('min-w-0 rounded-xl border px-3 py-2', item.className)}>
              <p className="text-xs font-black uppercase tracking-[0.14em]">{item.label}</p>
              <p className="mt-0.5 text-xs font-semibold leading-5 opacity-75">{item.detail}</p>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {masteryBadges.map((badge) => (
            <div key={badge.category} className={clsx('relative overflow-hidden rounded-[1rem] border p-3.5 sm:p-4', badge.theme.ring)}>
              <span className={clsx('absolute inset-x-0 top-0 h-1', badge.visual.line)} />
              <div className="flex items-start justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2.5">
                  <span className={clsx('inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border', badge.theme.icon)}>
                    {badge.theme.marker}
                  </span>
                  <div className="min-w-0">
                    <p className="max-w-full whitespace-normal break-words text-sm font-bold leading-tight text-white [overflow-wrap:anywhere]">{badge.label}</p>
                    <p className="mt-1 text-xs font-semibold text-sky-100/58">{badge.attempts} attempts</p>
                  </div>
                </div>
                <span className="shrink-0 rounded-lg border border-white/12 bg-white/8 px-2 py-1 text-[0.68rem] font-bold uppercase text-sky-100">
                  {badge.theme.tier}
                </span>
              </div>
              <div className="mt-4 flex items-center gap-2.5">
                <span className={clsx('inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border', badge.visual.iconClass)}>
                  {badge.visual.icon}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="h-2 overflow-hidden rounded-full bg-white/10">
                    <div
                      className={clsx('h-full rounded-full transition-all duration-700', badge.attempts ? badge.visual.fill : badge.theme.fill)}
                      style={{ width: badge.attempts ? `${Math.max(8, Math.round(badge.progress * 100))}%` : '10%' }}
                    />
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <p className="truncate text-xs font-bold text-sky-100">{badge.theme.label}</p>
                    <p className="shrink-0 text-xs font-bold text-white">
                      {badge.attempts ? `${Math.round(badge.progress * 100)}%` : '0%'}
                    </p>
                  </div>
                </div>
              </div>
              <p className="mt-2 text-xs font-semibold text-sky-100/55">
                {badge.attempts ? 'Current accuracy in this category.' : 'Complete practice to unlock.'}
              </p>
            </div>
          ))}
        </div>
      </section>

      <DetailGrid className="xl:grid-cols-[0.9fr_1.1fr]">
        <Surface
          className="dashboard-section-actions border-amber-300/22 shadow-[0_18px_50px_rgba(251,191,36,0.07)]"
          style={{
            background:
              'radial-gradient(circle at 18% 22%, rgba(251, 191, 36, 0.18), transparent 34%), linear-gradient(135deg, rgba(120, 53, 15, 0.28), rgba(6, 28, 49, 0.82) 62%)',
            borderColor: 'rgba(252, 211, 77, 0.3)',
          }}
        >
          <SectionHeading
            title="Next best actions"
            description="Short tasks only. These are the next moves worth doing today."
          />
          <div className="mt-5 grid gap-3">
            {supportActions.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={item.onSelect}
                className="flex min-h-14 w-full items-center gap-3 rounded-xl border border-cyan-200/12 bg-sky-300/[0.055] px-3 py-3 text-left transition hover:border-cyan-200/32 hover:bg-cyan-300/10 focus:outline-none focus:ring-2 focus:ring-cyan-200/45"
              >
                <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-cyan-300/12 text-cyan-100">
                  {item.icon}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-bold text-white">{item.label}</span>
                  <span className="mt-0.5 block text-xs font-semibold text-sky-100/52">{item.meta}</span>
                </span>
                <span className="text-xs font-bold uppercase text-cyan-100">{item.actionLabel}</span>
              </button>
            ))}
          </div>
          <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.035] p-4">
            <p className="text-xs font-bold uppercase text-sky-100/48">Materials</p>
            <p className="mt-2 text-sm font-semibold leading-6 text-sky-100/68">
              {materialsReadyCount} ready file{materialsReadyCount === 1 ? '' : 's'}
              {materialsNeedingAttention ? `, ${materialsNeedingAttention} need attention.` : ', ready to review.'}
            </p>
          </div>
        </Surface>

        <Surface
          className="dashboard-section-focus border-fuchsia-300/20 shadow-[0_18px_50px_rgba(192,132,252,0.07)]"
          style={{
            background:
              'radial-gradient(circle at 18% 22%, rgba(192, 132, 252, 0.18), transparent 34%), linear-gradient(135deg, rgba(88, 28, 135, 0.3), rgba(6, 28, 49, 0.82) 58%, rgba(14, 116, 144, 0.16))',
            borderColor: 'rgba(216, 180, 254, 0.28)',
          }}
        >
          <SectionHeading
            title="Focus lane"
            description="Weak areas stay compact until you want the full review view."
            action={<Link to="/weak-areas" className="text-sm font-bold text-cyan-100">See all</Link>}
          />
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {dashboard.weakestCategories.slice(0, 2).map((area, index) => {
              const actionVerb = index === 0 ? 'Train' : 'Review'
              const visual = getCategoryAccent(area.category, index)
              const areaPercent = Math.round(area.accuracy * 100)
              return (
                <div key={area.category} className={clsx('relative overflow-hidden rounded-[1rem] border p-4', visual.surface)}>
                  <span className={clsx('absolute inset-y-0 left-0 w-1', visual.line)} />
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className={clsx('inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border', visual.iconClass)}>
                        {visual.icon}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate font-bold text-white">{shortCategoryLabel(area.category)}</p>
                        <p className="mt-1 text-xs font-semibold text-sky-100/55">{areaPercent}% practice accuracy</p>
                      </div>
                    </div>
                    <MasteryPill mastery={area.masteryLevel} />
                  </div>
                  <p className="mt-2 text-sm leading-6 text-sky-100/62">{area.suggestedAction}</p>
                  <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-white/10">
                    <div
                      className={clsx('h-full rounded-full transition-all duration-700', visual.fill)}
                      style={{ width: `${Math.max(8, areaPercent)}%` }}
                    />
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <div className="rounded-xl border border-cyan-200/12 bg-[#03101f]/36 p-3">
                      <p className="text-[0.68rem] font-bold uppercase tracking-[0.14em] text-sky-100/50">Mismatch</p>
                      <p className="mt-1 text-lg font-bold text-white">{Math.round(area.confidenceMismatchScore * 100)}%</p>
                    </div>
                    <div className="rounded-xl border border-cyan-200/12 bg-[#03101f]/36 p-3">
                      <p className="text-[0.68rem] font-bold uppercase tracking-[0.14em] text-sky-100/50">Flags</p>
                      <p className="mt-1 text-lg font-bold text-white">{area.flaggedCount}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => launchDashboardQuickStudy(area.category)}
                    className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-cyan-200/25 bg-cyan-300/10 px-4 py-2.5 text-sm font-bold text-cyan-100 transition hover:border-cyan-200/50 hover:bg-cyan-300/16 focus:outline-none focus:ring-2 focus:ring-cyan-200/45"
                  >
                    {actionVerb} {shortCategoryLabel(area.category)}
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              )
            })}
          </div>
          <div className="mt-5 rounded-xl border border-cyan-200/12 bg-[#03101f]/45 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-bold uppercase text-sky-100/48">Progress snapshot</p>
                <p className="mt-1 text-sm font-semibold text-sky-100/68">{activeExamTrack.title}</p>
              </div>
              <p className="text-sm font-bold text-white">{dashboardCopy.examLabel}</p>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {[
                { label: 'Readiness', value: readinessBadge, detail: `${readinessPercent}% signal` },
                { label: 'Repairs', value: `${repairQueueCount}`, detail: `${readinessSnapshot.coverageGaps.length} gaps` },
                { label: 'Pattern', value: engineWeakPatternLabel, detail: primaryConfidenceRisk ? confidenceRiskLabel : 'engine signal' },
              ].map((metric) => (
                <div key={metric.label} className="min-w-0 border-t border-cyan-200/16 pt-3 first:border-t-0 first:pt-0 sm:border-l sm:border-t-0 sm:pl-3 sm:pt-0 sm:first:border-l-0 sm:first:pl-0">
                  <p className="truncate text-[0.68rem] font-bold uppercase text-sky-100/46">{metric.label}</p>
                  <p className="mt-1 text-sm font-bold leading-tight text-white">{metric.value}</p>
                  <p className="mt-0.5 text-xs font-semibold leading-snug text-sky-100/52">{metric.detail}</p>
                </div>
              ))}
            </div>
          </div>
        </Surface>
      </DetailGrid>
    </PageStack>
  )
}

export function PracticeQuestionsPage() {
  const profile = useStudySystemStore((state) => state.profile)
  const activeSession = useStudySystemStore((state) => state.activeSession)
  const startPracticeSession = useStudySystemStore((state) => state.startPracticeSession)
  const abandonSession = useStudySystemStore((state) => state.abandonSession)
  const [isPending, startTransition] = useTransition()
  const [category, setCategory] = useState<QuestionCategory | 'All'>('All')
  const [system, setSystem] = useState<string | 'All'>('All')
  const [board, setBoard] = useState<string | 'All'>('All')
  const [questionStatus, setQuestionStatus] = useState<'unused' | 'incorrect' | 'all'>('all')
  const [format, setFormat] = useState<'multiple-choice' | 'select-all-that-apply' | 'mixed'>('mixed')
  const [difficulty, setDifficulty] = useState<'foundation' | 'developing' | 'advanced' | 'adaptive' | 'mixed'>('adaptive')
  const [questionCount, setQuestionCount] = useState(10)
  const activeTrack = getExamTrack(profile.examTrack ?? 'nclex-rn')
  const trackCategories = getExamCategories(activeTrack.id)
  const trackSystems = getExamSystems(activeTrack.id)
  const activeSessionIsOpen = isActiveSessionOpen(activeSession)
  const launchPracticeSession = (overrides: Partial<Parameters<typeof startPracticeSession>[0]> = {}) =>
    startTransition(() => {
      if (activeSessionIsOpen && activeSession?.mode === 'practice') return
      startPracticeSession({
        category,
        system,
        board,
        questionStatus,
        format,
        difficulty,
        questionCount,
        ...overrides,
      })
    })
  if (activeSession?.mode === 'practice' && isRenderableSession(activeSession)) {
    return (
      <QuestionSessionRunner
        key={`${activeSession.id}-${activeSession.currentIndex}`}
        session={activeSession}
        modeLabel="Practice Set"
        focused
        onExit={abandonSession}
      />
    )
  }

  return <section className="simple-study" aria-labelledby="bank-title">
    <header><h1 id="bank-title">Question Bank</h1><p>{activeTrack.shortName} · Practice at your own pace.</p></header>
    <div className="simple-study-fields">
            <Field label="Category">
              <select value={category} onChange={(event) => setCategory(event.target.value as QuestionCategory | 'All')} className={selectClass}>
                <option value="All">All categories</option>
                {trackCategories.map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
            </Field>

      <Field label="Questions"><select className={selectClass} value={questionCount} onChange={(event) => setQuestionCount(Number(event.target.value))}>{[5,10,15,20].map((count) => <option key={count} value={count}>Up to {count} questions</option>)}</select></Field>
    </div>
    <details className="simple-study-details"><summary>More options</summary><div className="simple-study-fields">            <Field label="System">
              <select value={system} onChange={(event) => setSystem(event.target.value)} className={selectClass}>
                <option value="All">All systems</option>
                {trackSystems.map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
            </Field>
            <Field label="Board / blueprint">
              <select value={board} onChange={(event) => setBoard(event.target.value)} className={selectClass}>
                <option value="All">All boards</option>
                {activeTrack.boards.map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
            </Field>
            <Field label="Question status">
              <select value={questionStatus} onChange={(event) => setQuestionStatus(event.target.value as typeof questionStatus)} className={selectClass}>
                <option value="all">All questions</option>
                <option value="unused">Unused</option>
                <option value="incorrect">Previously incorrect</option>
              </select>
            </Field>
            <Field label="Question type">
              <select value={format} onChange={(event) => setFormat(event.target.value as typeof format)} className={selectClass}>
                <option value="mixed">Mixed</option>
                <option value="multiple-choice">Multiple choice</option>
                <option value="select-all-that-apply">Select all that apply</option>
              </select>
            </Field>
            <Field label="Difficulty">
              <select value={difficulty} onChange={(event) => setDifficulty(event.target.value as typeof difficulty)} className={selectClass}>
                <option value="adaptive">Adaptive</option>
                <option value="foundation">Foundation</option>
                <option value="developing">Developing</option>
                <option value="advanced">Advanced</option>
                <option value="mixed">Mixed</option>
              </select>
            </Field>
</div></details>
    <button className="simple-study-start" disabled={isPending} onClick={() => launchPracticeSession()}>{isPending ? 'Building set…' : 'Start practice'}<ArrowRight size={18} /></button>
    <Link className="simple-study-link" to="/study-results">Saved results</Link>
  </section>
}

const examPrepArtwork: Record<string, string> = {
  All: 'all-topics',
  'Management of Care': 'management',
  'Safety and Infection Control': 'safety',
  'Health Promotion': 'health',
  'Psychosocial Integrity': 'psychosocial',
  'Physiological Integrity': 'physiology',
}

export function ExamPrepPage() {
  const [params] = useSearchParams()
  const requestedTopic = topicGuides.find(topic => topic.slug === params.get('topic'))
  const preview = Boolean(requestedTopic && params.get('preview') === '5')
  const [examOpen, setExamOpen] = useState(false)
  const user = useStudySystemStore((state) => state.authUser)
  const profile = useStudySystemStore((state) => state.profile)
  const updateProfile = useStudySystemStore((state) => state.updateProfile)
  const active = useStudySystemStore((state) => state.activeSession)
  const startPracticeSession = useStudySystemStore((state) => state.startPracticeSession)
  const abandonSession = useStudySystemStore((state) => state.abandonSession)
  const [trackId, setTrackId] = useState<ExamTrackId>(requestedTopic ? 'nclex-rn' : profile.examTrack ?? 'nclex-rn')
  const [category, setCategory] = useState<QuestionCategory | 'All'>(requestedTopic?.category ?? 'All')
  const [isPending, startTransition] = useTransition()
  const track = getExamTrack(trackId)
  if (active?.mode === 'practice' && isRenderableSession(active)) return <QuestionSessionRunner focused key={active.id + active.currentIndex} session={active} modeLabel="Exam Prep" onExit={abandonSession} />
  const start = () => startTransition(() => {
    updateProfile({ examTrack: trackId })
    startPracticeSession({ category, questionCount: preview ? 5 : 10, difficulty: 'adaptive', format: 'mixed' })
  })
  return <section className="simple-study exam-prep-setup" aria-labelledby="prep-title">
    <header><h1 id="prep-title">Exam Prep</h1><p>Choose a topic. Review up to {preview ? 5 : 10} questions.</p></header>
    {trackId === 'nclex-rn' && <div className="exam-prep-signup">
      {!user ? <><Link className="exam-prep-signup-button" to="/exam-prep?auth=signup">Sign up to get access to over 300+ NCLEX-RN Exam Questions<ArrowRight size={22} aria-hidden="true" /></Link><p>Already have an account? <Link className="simple-study-link" to="/exam-prep?auth=signin">Log in</Link></p></> : <p><strong>Practice with 300+ NCLEX-RN questions.</strong></p>}
    </div>}
    <div className="exam-prep-exam"><button className="exam-prep-switcher" aria-expanded={examOpen} aria-controls="prep-exam-choice" onClick={() => setExamOpen(!examOpen)}>{track.shortName}<span>Change exam</span></button>
      {examOpen && <div id="prep-exam-choice"><Field label="Your exam"><select className={selectClass} value={trackId} onChange={(event) => { setTrackId(event.target.value as ExamTrackId); setCategory('All'); setExamOpen(false) }}>{examTracks.map((item) => <option key={item.id} value={item.id}>{item.shortName}</option>)}</select></Field></div>}
    </div>
    <fieldset className="exam-prep-topics"><legend className="sr-only">What would you like to review?</legend>
      {['All', ...getExamCategories(trackId)].map((item) => <label key={item} className="exam-prep-topic" data-selected={category === item}>
        <input type="radio" name="exam-prep-topic" value={item} checked={category === item} onChange={() => setCategory(item)} />
        <img className="exam-prep-art" src={`/images/exam-prep/${examPrepArtwork[item] ?? 'all-topics'}.webp`} alt="" width="160" height="160" />
        <span className="exam-prep-topic-name">{item === 'All' ? 'All topics' : item}</span>
        {category === item && <CheckCircle2 className="exam-prep-selected" size={28} aria-hidden="true" />}
      </label>)}
    </fieldset>
    <div className="exam-prep-start-bar"><button className="simple-study-start" disabled={isPending} onClick={start}>{isPending ? 'Building review…' : 'Start review'}<ArrowRight size={18} /></button></div>
    {trackId === 'nclex-rn' && <TopicLinks />}
  </section>
}

export function TestModePage() {
  const profile = useStudySystemStore((state) => state.profile)
  const activeSession = useStudySystemStore((state) => state.activeSession)
  const startTestSession = useStudySystemStore((state) => state.startTestSession)
  const abandonSession = useStudySystemStore((state) => state.abandonSession)
  const [isPending, startTransition] = useTransition()
  const [questionCount, setQuestionCount] = useState(25)
  const [timed, setTimed] = useState(true)
  const [noBacktracking, setNoBacktracking] = useState(true)
  if (activeSession?.mode === 'test' && isRenderableSession(activeSession)) return <QuestionSessionRunner key={activeSession.id + activeSession.currentIndex} session={activeSession} modeLabel="Exam practice" onExit={abandonSession} />
  return <section className="simple-study" aria-labelledby="exam-title">
    <header><h1 id="exam-title">Take an Exam</h1><p>{getExamTrack(profile.examTrack ?? 'nclex-rn').shortName} · A mixed practice exam.</p></header>
    <Field label="Questions"><select className={selectClass} value={questionCount} onChange={(event) => setQuestionCount(Number(event.target.value))}>{[20,25,30,35,40,45,50,55,60].map((count) => <option key={count} value={count}>Up to {count} questions</option>)}</select></Field>
    <p>{timed ? 'Timed' : 'Untimed'} · {noBacktracking ? 'No going back to earlier questions' : 'Earlier questions can be revisited'}</p>
    <details className="simple-study-details"><summary>Exam options</summary>
      <label className="simple-study-check"><input type="checkbox" checked={timed} onChange={(event) => setTimed(event.target.checked)} />Use a timer</label>
      <label className="simple-study-check"><input type="checkbox" checked={noBacktracking} onChange={(event) => setNoBacktracking(event.target.checked)} />Prevent backtracking</label>
      <p>For timed exams, the clock keeps running if you leave.</p>
    </details>
    <button className="simple-study-start" disabled={isPending} onClick={() => startTransition(() => startTestSession({ questionCount, timed, noBacktracking }))}>{isPending ? 'Building exam…' : 'Start exam'}<ArrowRight size={18} /></button>
    <Link className="simple-study-link" to="/study-results">Saved results</Link>
  </section>
}

export function WeakAreasPage() {
  const navigate = useNavigate()
  const profile = useStudySystemStore((state) => state.profile)
  const attempts = useStudySystemStore((state) => state.attempts)
  const activeSession = useStudySystemStore((state) => state.activeSession)
  const startPracticeSession = useStudySystemStore((state) => state.startPracticeSession)
  const analytics = useMemo(() => getAnalyticsSnapshot(attempts, profile), [attempts, profile])
  const weakAreas = useMemo(
    () => getWeakAreas(attempts, profile.examTrack ?? 'nclex-rn', profile.preferences.analyticsScope ?? 'selected-track'),
    [attempts, profile.examTrack, profile.preferences.analyticsScope],
  )
  const activeTrack = getExamTrack(profile.examTrack ?? 'nclex-rn')
  const priorityArea = weakAreas[0]
  const readiness = analytics.readinessSnapshot
  const activeRepairs = analytics.engineRemediationEvents.filter((event) => event.repairRequired && !event.repairSuccess)
  const highConfidenceMisses = analytics.engineDiagnoses.filter(
    (diagnosis) => diagnosis.confidenceEscalated && !diagnosis.scoreResult.isCorrect,
  )
  const startRepairSet = (category: QuestionCategory, questionCount = 5) => {
    const sessionIsOpen = isActiveSessionOpen(activeSession)
    if (sessionIsOpen && activeSession?.mode === 'practice') {
      navigate('/practice-questions')
      return
    }
    startPracticeSession({
      category,
      difficulty: 'adaptive',
      questionCount,
      format: 'mixed',
    })
    navigate('/practice-questions')
  }
  const getRepairCountForCategory = (category: QuestionCategory) =>
    attempts.filter((attempt) => {
      const attemptCategory = questionLookup[attempt.questionId]?.category
      const hasOpenRepair = attempt.engineRemediationEvents?.some(
        (event) => event.repairRequired && !event.repairSuccess,
      )
      return attemptCategory === category && (!attempt.isCorrect || hasOpenRepair)
    }).length
  const readinessBlockers = [
    `${readiness.trustedAttemptCount} trusted attempts`,
    `${readiness.coverageGaps.length} coverage gaps`,
    `${highConfidenceMisses.length} high-confidence misses`,
  ]
  const getRepairStatus = (area: NonNullable<typeof priorityArea>) => {
    const repairCount = getRepairCountForCategory(area.category)
    if (area.masteryLevel === 'strong') {
      return { label: 'Mastery building', tone: 'violet' as const, icon: <BadgeCheck className="h-3.5 w-3.5" /> }
    }
    if (area.accuracy >= 0.72 && repairCount <= 1) {
      return { label: 'Improving', tone: 'emerald' as const, icon: <TrendingUp className="h-3.5 w-3.5" /> }
    }
    if (repairCount >= 2 || area.confidenceMismatchScore >= 0.28) {
      return { label: 'Stuck', tone: 'rose' as const, icon: <AlertTriangle className="h-3.5 w-3.5" /> }
    }
    return { label: 'Needs reps', tone: 'rose' as const, icon: <Target className="h-3.5 w-3.5" /> }
  }
  const repairActionVerb = (index: number) => (index === 0 ? 'Train' : index === 1 ? 'Review' : 'Practice')
  const priorityStatus = priorityArea ? getRepairStatus(priorityArea) : null
  const priorityRepairCount = priorityArea ? getRepairCountForCategory(priorityArea.category) : 0
  const priorityConcepts = priorityArea?.commonMistakes.slice(0, 3) ?? []
  const repairQueue = weakAreas.slice(0, 3)

  return (
    <PageStack>
      <PageHeader
        eyebrow="Remediation"
        title="Remediation"
        description={`Repair the pattern by turning ${activeTrack.shortName} misses into one action at a time, then prove the pattern changed.`}
        action={
          priorityArea ? (
            <button
              type="button"
              onClick={() => startRepairSet(priorityArea.category)}
              className="inline-flex min-h-[48px] items-center gap-2 rounded-xl border border-amber-100/48 bg-[linear-gradient(180deg,#fbbf24_0%,#b77912_100%)] px-5 py-3 text-sm font-bold text-white shadow-[0_14px_34px_rgba(251,191,36,0.22)] transition hover:brightness-110 focus:outline-none focus:ring-4 focus:ring-amber-300/20"
            >
              Start repair set
              <ArrowRight className="h-4 w-4" />
            </button>
          ) : null
        }
      />

      {priorityArea ? (
        <FocusPanel className="border-rose-200/32 bg-[linear-gradient(135deg,rgba(244,63,94,0.16),rgba(6,20,38,0.95)_38%,rgba(2,8,18,0.96))] text-white shadow-[0_0_40px_rgba(244,63,94,0.12)]">
          <div className="grid gap-5 p-4 sm:p-5 md:p-6 xl:grid-cols-[minmax(0,1fr)_21rem]">
            <div className="min-w-0">
              <div className="flex flex-wrap gap-2">
                <CommandBadge tone="amber" icon={<Sparkles className="h-3.5 w-3.5" />}>Next repair</CommandBadge>
                <CommandBadge tone={priorityStatus?.tone ?? 'rose'} icon={priorityStatus?.icon}>
                  {priorityStatus?.label}
                </CommandBadge>
              </div>
              <h3 className="mt-4 text-3xl font-bold tracking-normal text-white md:text-4xl">
                Repair {shortCategoryLabel(priorityArea.category)}
              </h3>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-sky-100/72">
                {priorityArea.suggestedAction} Keep this short: train the pattern, check the rationale, then prove transfer.
              </p>
              <div className="mt-5 grid gap-2 sm:grid-cols-3">
                {priorityConcepts.map((mistake) => (
                  <div key={mistake} className="rounded-xl border border-rose-200/20 bg-rose-300/[0.075] p-3">
                    <p className="text-xs font-bold uppercase text-rose-100/70">Repair cue</p>
                    <p className="mt-1 min-w-0 break-words text-sm font-bold leading-5 text-white">{mistake}</p>
                  </div>
                ))}
              </div>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <button
                  type="button"
                  onClick={() => startRepairSet(priorityArea.category)}
                  className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-xl border border-amber-100/48 bg-[linear-gradient(180deg,#fbbf24_0%,#b77912_100%)] px-5 py-3 text-sm font-bold text-white shadow-[0_14px_34px_rgba(251,191,36,0.22)] transition hover:brightness-110 focus:outline-none focus:ring-4 focus:ring-amber-300/20"
                >
                  Start {shortCategoryLabel(priorityArea.category)} repair
                  <ArrowRight className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => navigate(`/flashcards?category=${encodeURIComponent(priorityArea.category)}`)}
                  className="nclex-btn-secondary inline-flex min-h-[52px] items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-bold"
                >
                  Review cards
                  <SquareStack className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="rounded-[1rem] border border-white/10 bg-[#031426]/74 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-sky-100/58">Proof target</p>
                  <h4 className="mt-2 text-xl font-bold text-white">Short transfer set</h4>
                </div>
                <CommandBadge tone={priorityArea.accuracy >= 0.72 ? 'emerald' : 'rose'}>
                  {Math.round(priorityArea.accuracy * 100)}%
                </CommandBadge>
              </div>
              <div className="mt-4">
                <ProgressBar value={priorityArea.accuracy} tone={priorityArea.accuracy >= 0.72 ? 'green' : 'red'} />
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2 xl:grid-cols-1">
              <CommandStatTile label="Accuracy" value={`${Math.round(priorityArea.accuracy * 100)}%`} detail={`${priorityArea.attemptCount} attempts`} tone={priorityArea.accuracy >= 0.72 ? 'emerald' : 'rose'} icon={<BadgeCheck className="h-4 w-4" />} />
              <CommandStatTile label="Repairs" value={`${priorityRepairCount}`} detail="open misses" tone="rose" icon={<AlertTriangle className="h-4 w-4" />} />
              <CommandStatTile label="Risk" value={`${Math.round(priorityArea.confidenceMismatchScore * 100)}%`} detail="confidence gap" tone="violet" icon={<BrainCircuit className="h-4 w-4" />} />
              </div>
            </div>
          </div>
        </FocusPanel>
      ) : (
        <EmptyState
          title="No weak area signal yet."
          description="Complete a short practice set so Nurse Command can turn misses into a repair queue."
          action={
            <button
              type="button"
              onClick={() => navigate('/practice-questions')}
              className="nclex-btn-primary rounded-xl px-4 py-3 text-sm font-bold"
            >
              Start practice
            </button>
          }
        />
      )}

      <DetailGrid>
        <Surface>
          <SectionHeading
            title="Repair actions"
            description="Three lanes only: train the priority, review the next pattern, then practice one backup."
            action={<span className="nclex-chip nclex-chip-warning">{activeRepairs.length} active</span>}
          />
          <div className="mt-5 grid gap-4">
            {repairQueue.map((area, index) => (
              <div
                key={area.category}
                className={clsx(
                  'relative overflow-hidden rounded-2xl border p-4 transition hover:-translate-y-0.5',
                  index === 0
                    ? 'border-amber-200/52 bg-amber-300/[0.08] shadow-[0_0_28px_rgba(251,191,36,0.12)]'
                    : 'border-rose-200/22 bg-rose-300/[0.045] hover:border-rose-200/38',
                )}
              >
                <span className={clsx('pointer-events-none absolute inset-y-4 left-0 w-1 rounded-r-full', index === 0 ? 'bg-amber-300' : 'bg-rose-300')} />
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={clsx('rounded-full border px-2.5 py-1 text-xs font-bold', index === 0 ? 'border-amber-200/36 bg-amber-300/12 text-amber-100' : 'border-rose-200/28 bg-rose-300/10 text-rose-100')}>
                        {index === 0 ? 'Next' : index === 1 ? 'Review next' : 'Backup'}
                      </span>
                      <CommandBadge tone={getRepairStatus(area).tone} icon={getRepairStatus(area).icon}>
                        {getRepairStatus(area).label}
                      </CommandBadge>
                    </div>
                    <h3 className="mt-3 text-xl font-bold tracking-normal text-white">
                      {repairActionVerb(index)} {shortCategoryLabel(area.category)}
                    </h3>
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-sky-100/68">
                      {area.suggestedAction}
                    </p>
                  </div>
                  <div className="grid min-w-[138px] grid-cols-2 gap-2 text-center">
                    <div className="rounded-xl border border-emerald-300/18 bg-emerald-300/[0.065] p-3">
                      <p className="text-lg font-bold text-white">{Math.round(area.accuracy * 100)}%</p>
                      <p className="text-xs font-semibold text-emerald-100/58">accuracy</p>
                    </div>
                    <div className="rounded-xl border border-rose-300/18 bg-rose-300/[0.065] p-3">
                      <p className="text-lg font-bold text-white">{getRepairCountForCategory(area.category)}</p>
                      <p className="text-xs font-semibold text-rose-100/58">repairs</p>
                    </div>
                  </div>
                </div>
                <div className="mt-4">
                  <ProgressBar value={area.accuracy} tone={area.masteryLevel === 'strong' ? 'green' : area.masteryLevel === 'developing' ? 'amber' : 'red'} />
                </div>
                <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                  <button
                    type="button"
                    onClick={() => startRepairSet(area.category)}
                    className={clsx(
                      'inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-bold text-white transition hover:brightness-110 focus:outline-none focus:ring-4',
                      index === 0
                        ? 'border-amber-100/48 bg-[linear-gradient(180deg,#fbbf24_0%,#b77912_100%)] shadow-[0_12px_28px_rgba(251,191,36,0.18)] focus:ring-amber-300/20'
                        : 'border-rose-100/38 bg-rose-400/18 focus:ring-rose-300/18',
                    )}
                  >
                    {repairActionVerb(index)} {shortCategoryLabel(area.category)}
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate(`/notes?category=${encodeURIComponent(area.category)}`)}
                    className="nclex-btn-secondary inline-flex min-h-[44px] items-center justify-center rounded-xl px-4 py-2.5 text-sm font-bold"
                  >
                    Open notes
                  </button>
                </div>
              </div>
            ))}
            {!repairQueue.length ? (
              <div className="rounded-2xl border border-cyan-200/18 bg-cyan-300/[0.055] p-5">
                <p className="font-bold text-white">No repair queue yet.</p>
                <p className="mt-2 text-sm leading-6 text-sky-100/64">Run a short practice set to create a trustworthy remediation signal.</p>
              </div>
            ) : null}
          </div>
        </Surface>

        <Surface>
          <SectionHeading
            title="Evidence context"
            description="Readiness stays separate from practice signal until evidence is trustworthy."
          />
          <div className="mt-5 grid gap-3">
            {readinessBlockers.map((item) => (
              <div key={item} className="rounded-2xl border border-cyan-200/15 bg-white/[0.035] p-4">
                <p className="text-sm font-bold text-white">{item}</p>
              </div>
            ))}
          </div>
          <div className="mt-5 rounded-2xl border border-amber-300/20 bg-amber-300/10 p-4">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-amber-200">Next best action</p>
            <p className="mt-2 text-sm leading-7 text-sky-100/72">{readiness.nextBestAction}</p>
          </div>
          {readiness.coverageGaps.length ? (
            <div className="mt-5 grid gap-3">
              {readiness.coverageGaps.slice(0, 3).map((gap, index) => (
                <div key={`${gap.dimensionType}-${gap.dimensionId}-${index}`} className="rounded-2xl border border-cyan-200/15 bg-white/[0.035] p-4">
                  <p className="font-bold text-white">{gap.dimensionId.replaceAll('_', ' ')}</p>
                  <p className="mt-1 text-sm text-sky-100/60">{gap.gapType.replaceAll('_', ' ')}</p>
                </div>
              ))}
            </div>
          ) : null}
        </Surface>
      </DetailGrid>
    </PageStack>
  )
}

export function PerformanceAnalyticsPage() {
  const profile = useStudySystemStore((state) => state.profile)
  const attempts = useStudySystemStore((state) => state.attempts)
  const updateProfile = useStudySystemStore((state) => state.updateProfile)
  const analytics = useMemo(() => getAnalyticsSnapshot(attempts, profile), [attempts, profile])
  const activeTrack = getExamTrack(profile.examTrack ?? 'nclex-rn')
  const readiness = analytics.readinessSnapshot
  const repairQueueCount = analytics.engineRemediationEvents.filter(
    (event) => event.repairRequired && !event.repairSuccess,
  ).length
  const readinessLabel =
    readiness.status === 'insufficient_evidence'
      ? 'Needs evidence'
      : readiness.status === 'building'
        ? 'Building'
        : readiness.status === 'approaching'
          ? 'Approaching'
          : 'Ready'
  const readinessPercent = Math.round(readiness.readinessScore * 100)
  const analyticsScope = profile.preferences.analyticsScope ?? 'selected-track'
  const categoryFocus = [...analytics.categoryStats]
    .sort((left, right) => left.accuracy - right.accuracy || right.confidenceMismatchScore - left.confidenceMismatchScore)
    .slice(0, 3)
  const primaryFocusCategory = categoryFocus[0]
  const weakestDimensionLabel = analytics.learnerMasteryVector.summary.weakestDimensionId
    ?.replaceAll('_', ' ')
    .replace(':', ': ')
  const primaryCoverageGap = readiness.coverageGaps[0]
  const performanceTakeaway =
    readiness.status === 'ready'
      ? `${activeTrack.shortName} readiness is in the ready range. Protect consistency with mixed timed sets.`
      : repairQueueCount
        ? `${repairQueueCount} repair ${repairQueueCount === 1 ? 'item needs' : 'items need'} transfer proof before adding more random volume.`
        : primaryFocusCategory
          ? `${shortCategoryLabel(primaryFocusCategory.category)} is the clearest score-lift opportunity right now.`
          : 'Keep building signal with short focused sessions before reading too much into the trend.'
  const recommendedAction = repairQueueCount
    ? 'Repair weakest pattern'
    : readiness.status === 'ready'
      ? 'Start transfer proof'
      : 'Build practice evidence'
  const recommendedActionDetail = primaryFocusCategory
    ? `${shortCategoryLabel(primaryFocusCategory.category)} is the best place to spend the next focused block.`
    : readiness.nextBestAction
  const trendTakeaway = primaryFocusCategory
    ? `Accuracy trend is useful only when paired with the current weak pattern: ${shortCategoryLabel(primaryFocusCategory.category)}.`
    : 'Accuracy trend is a signal check, not the whole story.'
  const scopeControl = (
    <div className="inline-flex rounded-xl border border-cyan-300/20 bg-white/[0.04] p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
      {[
        { label: 'Selected exam', value: 'selected-track' as const },
        { label: 'All exams', value: 'all-tracks' as const },
      ].map((item) => (
        <button
          key={item.value}
          type="button"
          onClick={() =>
            updateProfile({
              preferences: {
                ...profile.preferences,
                analyticsScope: item.value,
              },
            })
          }
          className={clsx(
            'rounded-lg px-3 py-2 text-xs font-bold transition',
            analyticsScope === item.value
              ? 'bg-cyan-300 text-[#04101f] shadow-[0_0_18px_rgba(56,189,248,0.28)]'
              : 'text-sky-100/62 hover:text-sky-100',
          )}
        >
          {item.label}
        </button>
      ))}
    </div>
  )

  return (
    <PageStack>
      <PageHeader
        eyebrow="Performance"
        title="Performance Signals"
        description="One main insight, one recommended move, and enough evidence to decide what to do next."
        action={
          <CommandRouteLink
            to={repairQueueCount ? '/weak-areas' : '/practice-questions'}
            emphasis="primary"
            icon={<ArrowRight className="h-4 w-4" />}
          >
            {recommendedAction}
          </CommandRouteLink>
        }
      />

      <CommandFocusPanel tone="violet">
        <div className="grid gap-5 p-5 md:p-6 xl:grid-cols-[minmax(0,1fr)_22rem] xl:items-end">
          <div>
            <div className="flex flex-wrap gap-2">
              <CommandBadge tone="violet" icon={<BarChart3 className="h-3.5 w-3.5" />}>Analytics</CommandBadge>
              <CommandBadge tone="emerald" icon={<ShieldCheck className="h-3.5 w-3.5" />}>Practice evidence</CommandBadge>
              <CommandBadge tone="amber" icon={<Target className="h-3.5 w-3.5" />}>{activeTrack.shortName}</CommandBadge>
            </div>
            <h3 className="mt-4 max-w-3xl text-3xl font-bold tracking-normal text-white md:text-4xl">
              {performanceTakeaway}
            </h3>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-sky-100/70">
              Readiness is practice evidence from Nurse Command activity, not a licensure prediction or official exam guarantee.
            </p>
            <CommandInsightPanel
              eyebrow="Recommended next action"
              title={recommendedAction}
              description={recommendedActionDetail}
              tone="amber"
              className="mt-5"
            />
            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <CommandRouteLink
                to="/weak-areas"
                emphasis="primary"
                icon={<Target className="h-4 w-4" />}
              >
                Repair weakest pattern
              </CommandRouteLink>
              <CommandRouteLink
                to="/practice-questions"
                tone="violet"
                icon={<ArrowRight className="h-4 w-4" />}
              >
                Start transfer proof
              </CommandRouteLink>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-3 xl:grid-cols-1">
            <CommandStatTile
              label="Accuracy"
              value={`${Math.round(readiness.practiceAccuracy * 100)}%`}
              detail={`${analytics.questionsCompleted} questions completed`}
              icon={<Activity className="h-4 w-4" />}
              tone={readiness.practiceAccuracy >= 0.75 ? 'emerald' : 'amber'}
            />
            <CommandStatTile
              label="Readiness"
              value={readinessLabel}
              detail={`${readinessPercent}% signal`}
              icon={<BadgeCheck className="h-4 w-4" />}
              tone={readiness.status === 'ready' ? 'emerald' : 'violet'}
            />
            <CommandStatTile
              label="Repair"
              value={`${repairQueueCount}`}
              detail="transfer proof"
              icon={<Target className="h-4 w-4" />}
              tone={repairQueueCount ? 'rose' : 'emerald'}
            />
          </div>
        </div>
      </CommandFocusPanel>

      <Surface>
        <SectionHeading
          title="Accuracy Trend"
          description={trendTakeaway}
          action={<span className="nclex-chip nclex-chip-info">daily</span>}
        />
        <div className="mt-5 h-[320px] min-h-[320px] min-w-0">
          <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 1, height: 1 }} minWidth={0}>
            <LineChart data={analytics.dailyAccuracy}>
              <CartesianGrid vertical={false} stroke="rgba(125,211,252,0.2)" />
              <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: '#bae6fd', fontSize: 12 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: '#bae6fd', fontSize: 12 }} tickFormatter={(value) => `${Math.round(value * 100)}%`} />
              <Tooltip formatter={percentTooltip} />
              <Line type="monotone" dataKey="accuracy" stroke="#38bdf8" strokeWidth={3} dot={{ r: 4, fill: '#38bdf8' }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Surface>

      <DetailGrid>
        <Surface>
          <SectionHeading
            title="Repair Targets"
            description="The few areas most likely to improve the next score report, paired with the next route."
          />
          <div className="mt-5 space-y-4">
            {categoryFocus.map((category) => (
              <div key={category.category} className="rounded-2xl border border-cyan-200/15 bg-sky-300/[0.055] p-4">
                <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="font-bold text-white">{shortCategoryLabel(category.category)}</p>
                    <p className="mt-1 text-sm text-sky-100/60">
                      {category.attemptCount} attempts - {Math.round(category.confidenceMismatchScore * 100)}% confidence mismatch
                    </p>
                  </div>
                  <MasteryPill mastery={category.masteryLevel} />
                </div>
                <ProgressBar
                  value={category.accuracy}
                  tone={category.masteryLevel === 'strong' ? 'green' : category.masteryLevel === 'developing' ? 'amber' : 'red'}
                />
                <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                  <Link
                    to="/weak-areas"
                    className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-amber-200/30 bg-amber-300/[0.1] px-4 py-2 text-sm font-bold text-amber-100 transition hover:border-amber-100/55 hover:bg-amber-300/16"
                  >
                    Repair weakest pattern
                    <Target className="h-4 w-4" />
                  </Link>
                  <Link
                    to="/practice-questions"
                    className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-violet-200/24 bg-violet-300/[0.075] px-4 py-2 text-sm font-bold text-violet-100 transition hover:border-violet-100/45 hover:bg-violet-300/[0.12]"
                  >
                    Start transfer proof
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </Surface>

        <Surface>
          <SectionHeading
            title="Engine Signals"
            description="Practice signal, practice evidence, and repair logic stay separated."
          />
          <div className="mt-5 space-y-4">
            <InsightRow
              icon={<Target className="h-4 w-4 text-cyan-300" />}
              title="Next action"
              body={readiness.nextBestAction}
            />
            <InsightRow
              icon={<Flame className="h-4 w-4 text-amber-300" />}
              title="Weakest pattern"
              body={
                weakestDimensionLabel
                  ? `${weakestDimensionLabel} is the strongest repair signal in the current mastery vector.`
                  : 'No durable weak pattern yet. Add practice evidence before over-reading the dashboard.'
              }
            />
            <InsightRow
              icon={<Clock3 className="h-4 w-4 text-sky-300" />}
              title="Evidence gap"
              body={
                primaryCoverageGap
                  ? `${primaryCoverageGap.dimensionId.replaceAll('_', ' ')} needs ${primaryCoverageGap.gapType.replaceAll('_', ' ')} repair before it can support readiness.`
                  : `${readiness.trustedAttemptCount} trusted attempts and ${readiness.practiceAttemptCount} practice attempts are currently separated.`
              }
            />
          </div>
        </Surface>
      </DetailGrid>

      <CommandDisclosurePanel
        title="History and method notes"
        description="Open this after the main takeaway when you need the evidence count, scope, and methodology."
      >
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <MetricChip label="Questions" value={`${analytics.questionsCompleted}`} />
            <MetricChip label="Trusted attempts" value={`${readiness.trustedAttemptCount}`} />
            <MetricChip label="Coverage gaps" value={`${readiness.coverageGaps.length}`} />
            <MetricChip label="Scope" value={(profile.preferences.analyticsScope ?? 'selected-track') === 'selected-track' ? activeTrack.shortName : 'All exams'} />
          </div>
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-sky-100/56">Analysis scope</p>
            {scopeControl}
          </div>
        </div>
        <div className="mt-5 rounded-2xl border border-cyan-200/15 bg-sky-300/[0.045] p-4">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-sky-100/56">Method note</p>
          <p className="mt-2 text-sm leading-7 text-sky-100/70">
            Performance separates practice attempts, trusted evidence, confidence mismatches, and coverage gaps so the next action stays about learning behavior rather than a single chart line.
          </p>
        </div>
      </CommandDisclosurePanel>
    </PageStack>
  )
}

export function FlashcardsPage() {
  const [searchParams] = useSearchParams()
  const initialCategory = searchParams.get('category')
  const materialIdParam = searchParams.get('materialId')
  const flashcardProgress = useStudySystemStore((state) => state.flashcardProgress)
  const flashcardReview = useStudySystemStore((state) => state.flashcardReview)
  const updateFlashcardStatus = useStudySystemStore((state) => state.updateFlashcardStatus)
  const materialFlashcards = useStudySystemStore((state) => state.materialFlashcards)
  const materials = useStudySystemStore((state) => state.materials)
  const preferredMaterialFlashcardsId = useStudySystemStore(
    (state) => state.preferredMaterialFlashcardsId,
  )
  const clearMaterialFlashcardsPreference = useStudySystemStore(
    (state) => state.clearMaterialFlashcardsPreference,
  )
  const updateMaterialFlashcardStatus = useStudySystemStore(
    (state) => state.updateMaterialFlashcardStatus,
  )
  const regenerateMaterialStudyTools = useStudySystemStore((state) => state.regenerateMaterialStudyTools)
  const activeMaterialId = materialIdParam ?? preferredMaterialFlashcardsId
  const [deckFilter, setDeckFilter] = useState<'All' | 'Core Deck' | 'Imported Materials'>(
    activeMaterialId ? 'Imported Materials' : 'All',
  )
  const [category, setCategory] = useState<string>(initialCategory ?? 'All')
  const [sourceFilter, setSourceFilter] = useState<string>(activeMaterialId ?? 'All')
  const [statusFilter, setStatusFilter] = useState<string>('All')
  const [shuffleMode, setShuffleMode] = useState(false)
  const [shuffleSeed, setShuffleSeed] = useState(1)
  const [index, setIndex] = useState(0)
  const [isFlipped, setIsFlipped] = useState(false)
  const [deckComplete, setDeckComplete] = useState(false)
  const [ratingPending, setRatingPending] = useState(false)
  const [ratingError, setRatingError] = useState('')
  const flashcardButtonRef = useRef<HTMLButtonElement>(null)
  const [liveBetaFlashcards, setLiveBetaFlashcards] = useState<Flashcard[]>([])
  const [liveBetaLoadFailed, setLiveBetaLoadFailed] = useState(false)
  const [flashcardFeedbackOpen, setFlashcardFeedbackOpen] = useState(false)
  const [flashcardFeedbackReason, setFlashcardFeedbackReason] =
    useState<ContentFeedbackReason>('source_concern')
  const [flashcardFeedbackNote, setFlashcardFeedbackNote] = useState('')
  const [flashcardFeedbackSubmittedId, setFlashcardFeedbackSubmittedId] = useState<string | null>(null)
  const [reviewNowMs] = useState(() => new Date().getTime())
  const repairingMaterialIdsRef = useRef(new Set<string>())
  const touchStartXRef = useRef<number | null>(null)

  useEffect(() => {
    let cancelled = false

    void loadLiveBetaFlashcards().then(
      (cards) => {
        if (!cancelled) setLiveBetaFlashcards(cards)
      },
      () => {
        if (!cancelled) setLiveBetaLoadFailed(true)
      },
    )

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (preferredMaterialFlashcardsId) {
      clearMaterialFlashcardsPreference()
    }
  }, [clearMaterialFlashcardsPreference, preferredMaterialFlashcardsId])

  useEffect(() => {
    if (!activeMaterialId || repairingMaterialIdsRef.current.has(activeMaterialId)) return
    const importedForMaterial = materialFlashcards.filter((card) => card.sourceMaterialId === activeMaterialId)
    const materialExists = materials.some((material) => material.id === activeMaterialId && material.extractionStatus === 'ready')
    const hasBadGeneratedCard = importedForMaterial.some((card) => {
      const front = card.front.toLowerCase()
      return card.front.length > 140 || front.includes('frontiersin.org') || front.includes('correspondence') || front.includes('received')
    })

    if (!hasBadGeneratedCard && (!materialExists || importedForMaterial.length > 0)) return

    repairingMaterialIdsRef.current.add(activeMaterialId)
    void regenerateMaterialStudyTools(activeMaterialId).finally(() => {
      repairingMaterialIdsRef.current.delete(activeMaterialId)
      setIndex(0)
                  setDeckComplete(false)
      setIsFlipped(false)
    })
  }, [activeMaterialId, materialFlashcards, materials, regenerateMaterialStudyTools])

  const effectiveDeckFilter =
    activeMaterialId && deckFilter !== 'Core Deck' ? 'Imported Materials' : deckFilter
  const effectiveSourceFilter = activeMaterialId ?? sourceFilter

  const combinedCards = useMemo(() => {
    const coreCards = [...flashcards, ...liveBetaFlashcards].map((card) => ({
      id: card.id,
      front: card.front,
      back: card.back,
      status: flashcardProgress[card.id] ?? card.status,
      review: flashcardReview[card.id],
      category: card.category,
      examTrack: card.examTrack ?? 'nclex-rn',
      sourceStatus: card.sourceStatus,
      sourceMapStatus: card.sourceMapStatus,
      clinicalReviewStatus: card.clinicalReviewStatus,
      learnerVisible: card.learnerVisible,
      visibility: card.visibility,
      contentStage: card.contentStage,
      sourceNeededClaims: card.sourceNeededClaims,
      sourcePackId: card.sourcePackId,
      fixtureId: card.fixtureId,
      feedbackEnabled: card.feedbackEnabled,
      sourceLabel: 'Core Deck',
      sourceMaterialId: null as string | null,
      origin: 'core' as const,
    }))

    const importedCards = materialFlashcards.map((card) => ({
      id: card.id,
      front: card.front,
      back: card.back,
      status: card.status,
      review: flashcardReview[card.id],
      category: 'Imported Materials',
      examTrack: 'nclex-rn',
      sourceStatus: undefined,
      sourceMapStatus: undefined,
      clinicalReviewStatus: undefined,
      learnerVisible: undefined,
      visibility: undefined,
      contentStage: undefined,
      sourceNeededClaims: undefined,
      sourcePackId: undefined,
      fixtureId: undefined,
      feedbackEnabled: undefined,
      sourceLabel: card.sourceTitle,
      sourceMaterialId: card.sourceMaterialId,
      origin: 'imported' as const,
    }))

    return [...coreCards, ...importedCards]
  }, [flashcardProgress, flashcardReview, liveBetaFlashcards, materialFlashcards])

  const filtered = useMemo(() => {
    const byDeck = combinedCards.filter((card) => {
      if (effectiveDeckFilter === 'All') return true
      return effectiveDeckFilter === 'Core Deck'
        ? card.origin === 'core'
        : card.origin === 'imported'
    })
    const byCategory = byDeck.filter((card) => category === 'All' || card.category === category)
    const bySource = byCategory.filter((card) => {
      if (effectiveSourceFilter === 'All') return true
      return card.sourceMaterialId === effectiveSourceFilter
    })
    const byStatus = bySource.filter(
      (card) => statusFilter === 'All' || card.status === statusFilter,
    )
    const arranged = shuffleMode
      ? [...byStatus].sort(
          (left, right) =>
            seededHash(`${shuffleSeed}-${left.id}`) - seededHash(`${shuffleSeed}-${right.id}`),
        )
      : byStatus
    return arranged
  }, [
    category,
    combinedCards,
    effectiveDeckFilter,
    effectiveSourceFilter,
    shuffleMode,
    shuffleSeed,
    statusFilter,
  ])
  const activeIndex = filtered.length ? Math.min(index, filtered.length - 1) : 0
  const currentCard = filtered[activeIndex] ?? null
  const currentCardNeedsDraftWarning = Boolean(
    currentCard?.sourceStatus === 'source_needed' ||
      currentCard?.clinicalReviewStatus === 'not_sme_reviewed' ||
      currentCard?.contentStage === 'beta_draft',
  )

  useEffect(() => {
    const resetFeedback = window.setTimeout(() => {
      setFlashcardFeedbackOpen(false)
      setFlashcardFeedbackReason('source_concern')
      setFlashcardFeedbackNote('')
      setFlashcardFeedbackSubmittedId(null)
    }, 0)

    return () => window.clearTimeout(resetFeedback)
  }, [currentCard?.id])

  const dueCards = useMemo(() => {
    return combinedCards.filter((card) => {
      if (card.status === 'new' || card.status === 'needs-review') return true
      if (!card.review?.nextReviewAt) return false
      return new Date(card.review.nextReviewAt).getTime() <= reviewNowMs
    })
  }, [combinedCards, reviewNowMs])

  const setCardStatus = async (status: FlashcardStatus) => {
    if (!currentCard || ratingPending) return
    setRatingPending(true)
    setRatingError('')
    try {
      if (currentCard.origin === 'imported') await updateMaterialFlashcardStatus(currentCard.id, status)
      else updateFlashcardStatus(currentCard.id, status)
      if (activeIndex === filtered.length - 1) setDeckComplete(true)
      else setIndex(statusFilter !== 'All' && statusFilter !== status ? activeIndex : activeIndex + 1)
      setIsFlipped(false)
      requestAnimationFrame(() => flashcardButtonRef.current?.focus())
    } catch {
      setRatingError('Could not save this card. Please try again.')
    } finally {
      setRatingPending(false)
    }
  }

  const submitFlashcardFeedback = () => {
    if (!currentCard || !currentCard.feedbackEnabled) return

    const report = recordContentFeedback({
      question: {
        id: currentCard.id,
        examTrack: currentCard.examTrack,
        category: currentCard.category,
        sourcePackId: currentCard.sourcePackId,
        fixtureId: currentCard.fixtureId,
        sourceStatus: currentCard.sourceStatus,
        clinicalReviewStatus: currentCard.clinicalReviewStatus,
        visibility: currentCard.visibility,
        contentStage: currentCard.contentStage,
        learnerVisible: currentCard.learnerVisible,
      },
      reason: flashcardFeedbackReason,
      note: flashcardFeedbackNote,
      route: '/flashcards',
      reviewState: flashcardFeedbackOpen ? 'review_open' : 'review_hidden',
    })

    setFlashcardFeedbackSubmittedId(report.id)
    setFlashcardFeedbackNote('')
    setFlashcardFeedbackOpen(false)
  }

  const showPreviousCard = () => {
    setIndex((current) => Math.max(0, current - 1))
    setIsFlipped(false)
  }

  const showNextCard = () => {
    setIndex((current) => Math.min(filtered.length - 1, current + 1))
    setIsFlipped(false)
  }

  const materialOptions = useMemo(
    () =>
      materials
        .filter((material) => material.extractionStatus === 'ready')
        .map((material) => ({ id: material.id, label: material.displayTitle })),
    [materials],
  )

  const categoryOptions = useMemo(() => {
    const values = new Set<string>()
    combinedCards.forEach((card) => values.add(card.category))
    return Array.from(values)
  }, [combinedCards])

  return (
    <section className="reference-page flashcards-workspace">
      <h1>Flashcards</h1>
      {liveBetaLoadFailed ? (
        <p role="alert" className="border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          The live-beta deck could not load. Refresh the page to try again.
        </p>
      ) : null}
      <div className="flashcards-layout">
        <details className="reference-options"><summary>Filters</summary>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Deck">
              <select
                value={deckFilter}
                onChange={(event) => {
                  setDeckFilter(event.target.value as typeof deckFilter)
                  setIndex(0)
                  setDeckComplete(false)
                  setIsFlipped(false)
                  if (event.target.value !== 'Imported Materials') setSourceFilter('All')
                }}
                className={selectClass}
              >
                <option value="All">All decks</option>
                <option value="Core Deck">Core deck</option>
                <option value="Imported Materials">Imported materials</option>
              </select>
            </Field>
            <Field label="Category">
              <select
                value={category}
                onChange={(event) => {
                  setCategory(event.target.value)
                  setIndex(0)
                  setDeckComplete(false)
                  setIsFlipped(false)
                }}
                className={selectClass}
              >
                <option value="All">All categories</option>
                {categoryOptions.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </Field>
            {deckFilter === 'Imported Materials' ? (
              <Field label="Material">
                <select
                  value={sourceFilter}
                  onChange={(event) => {
                    setSourceFilter(event.target.value)
                    setIndex(0)
                  setDeckComplete(false)
                    setIsFlipped(false)
                  }}
                  className={selectClass}
                >
                  <option value="All">All imported materials</option>
                  {materialOptions.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </Field>
            ) : null}
            <Field label="Status">
              <select
                value={statusFilter}
                onChange={(event) => {
                  setStatusFilter(event.target.value)
                  setIndex(0)
                  setDeckComplete(false)
                  setIsFlipped(false)
                }}
                className={selectClass}
              >
                <option value="All">All statuses</option>
                <option value="new">New</option>
                <option value="needs-review">Needs review</option>
                <option value="known">Known</option>
              </select>
            </Field>
          </div>
          <button
            type="button"
            onClick={() => {
              setShuffleMode((current) => !current)
              setShuffleSeed((current) => current + 1)
              setIndex(0)
                  setDeckComplete(false)
              setIsFlipped(false)
            }}
            className={clsx('mt-5 inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold', shuffleMode ? 'nclex-btn-primary border-transparent text-white' : 'nclex-btn-secondary border-transparent text-slate-700')}
          >
            <Shuffle className="h-4 w-4" />
            {shuffleMode ? 'Shuffle on' : 'Shuffle off'}
          </button>
          <p className="reference-muted">{dueCards.length} cards due for review</p>
        </details>

        <div className="flashcard-stage">

          {deckComplete ? <div className="reference-flashcard"><h2>Deck complete</h2><p>Your review choices are saved.</p><button type="button" className="simple-study-primary" onClick={() => { setIndex(0); setDeckComplete(false); setIsFlipped(false) }}>Review again</button></div> : currentCard ? (
            <>
              <div className="reference-card-meta"><span>{currentCard.category}</span><span>Card {activeIndex + 1} of {filtered.length}</span></div>
              <div
                className="mt-6"
                onTouchStart={(event) => {
                  touchStartXRef.current = event.touches[0]?.clientX ?? null
                }}
                onTouchEnd={(event) => {
                  if (touchStartXRef.current === null) return
                  const delta = (event.changedTouches[0]?.clientX ?? touchStartXRef.current) - touchStartXRef.current
                  touchStartXRef.current = null
                  if (Math.abs(delta) < 48) return
                  if (delta < 0) showNextCard()
                  else showPreviousCard()
                }}
              >
                <button ref={flashcardButtonRef} type="button" className="reference-flashcard" aria-label={isFlipped ? 'Show question' : 'Show answer'} onClick={() => setIsFlipped((current) => !current)}>
                  <p>{isFlipped ? currentCard.back : currentCard.front}</p>
                  <span className="reference-flip-hint">{isFlipped ? 'Tap to see question' : 'Tap to reveal answer'}</span>
                </button>
                <p className="mt-3 text-center text-xs font-semibold uppercase tracking-[0.14em] text-[var(--nclex-text-muted)] sm:hidden">
                  Swipe to change cards
                </p>
              </div>
              {isFlipped ? <div className="reference-card-actions">
                <button type="button" disabled={ratingPending} onClick={() => void setCardStatus('needs-review')} className="reference-review-button">Review again</button>
                <button type="button" disabled={ratingPending} onClick={() => void setCardStatus('known')} className="simple-study-primary">Got it</button>
              </div> : null}
              {ratingError ? <p role="alert">{ratingError}</p> : null}
              <p className="reference-muted reference-card-status" role="status">{currentCard.status === 'known' ? 'Marked as known' : currentCard.status === 'needs-review' ? 'Marked for review' : 'Not yet reviewed'}{currentCardNeedsDraftWarning ? ' · Draft content' : ''}</p>
              <details className="reference-options"><summary>Card details &amp; report an issue</summary><p>{currentCard.sourceLabel}</p>
              {currentCardNeedsDraftWarning ? (
                <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                  <div className="flex gap-3">
                    <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
                    <div>
                      <p className="font-semibold">Beta draft.</p>
                      <p className="mt-1 leading-6">
                        This card is still under content review and may change. Report anything that looks off.
                      </p>
                    </div>
                  </div>
                </div>
              ) : null}
              {currentCard.feedbackEnabled ? (
                <div className="mt-3 rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-[#163042]">Report a card issue</p>
                      <p className="mt-1 text-xs leading-5 text-[var(--nclex-text-muted)]">
                        Feedback is saved with this draft card&apos;s source and review labels.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        if (!flashcardFeedbackOpen) {
                          trackContentFeedbackOpened(
                            {
                              id: currentCard.id,
                              examTrack: currentCard.examTrack,
                              category: currentCard.category,
                              sourcePackId: currentCard.sourcePackId,
                              fixtureId: currentCard.fixtureId,
                              visibility: currentCard.visibility,
                              contentStage: currentCard.contentStage,
                            },
                            '/flashcards',
                          )
                        }
                        setFlashcardFeedbackOpen((current) => !current)
                      }}
                      className="nclex-btn-secondary rounded-xl px-3 py-2 text-xs font-semibold"
                    >
                      {flashcardFeedbackOpen ? 'Close report' : 'Open report'}
                    </button>
                  </div>
                  {flashcardFeedbackSubmittedId ? (
                    <p className="mt-3 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">
                      Report saved for internal content QA.
                    </p>
                  ) : null}
                  {flashcardFeedbackOpen ? (
                    <form
                      className="mt-3 grid gap-3"
                      onSubmit={(event) => {
                        event.preventDefault()
                        submitFlashcardFeedback()
                      }}
                    >
                      <Field label="Reason">
                        <select
                          value={flashcardFeedbackReason}
                          onChange={(event) =>
                            setFlashcardFeedbackReason(event.target.value as ContentFeedbackReason)
                          }
                          className={selectClass}
                        >
                          {contentFeedbackReasons.map((reason) => (
                            <option key={reason} value={reason}>
                              {contentFeedbackReasonLabels[reason]}
                            </option>
                          ))}
                        </select>
                      </Field>
                      <Field label="Note">
                        <textarea
                          value={flashcardFeedbackNote}
                          onChange={(event) => setFlashcardFeedbackNote(event.target.value)}
                          className={`${selectClass} min-h-24`}
                          placeholder="What should be checked?"
                        />
                      </Field>
                      <button
                        type="submit"
                        className="nclex-btn-primary inline-flex w-fit items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold"
                      >
                        Save report
                      </button>
                    </form>
                  ) : null}
                </div>
              ) : null}

              </details>
            </>
          ) : (
            <EmptyState
              title="No flashcards match this filter."
              description="Try a different category, status, or deck."
              action={
                activeMaterialId ? (
                  <button
                    type="button"
                    onClick={() => void regenerateMaterialStudyTools(activeMaterialId)}
                    className="nclex-btn-primary inline-flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Clean and rebuild this material
                  </button>
                ) : null
              }
            />
          )}
        </div>
      </div>
    </section>
  )
}

const isBlockedMaterialImport = (error: unknown) => {
  let current: unknown = error

  while (current && typeof current === 'object') {
    if ('name' in current && current.name === 'MaterialImportBlockedError') return true
    current = 'cause' in current ? current.cause : null
  }

  return false
}

const assistedImportHostPattern = /\b(?:quizlet\.com|chegg\.com|coursehero\.com|studocu\.com)\b/i

const normalizePotentialStudyUrl = (value: string) => {
  const trimmed = value.trim()
  if (!trimmed) return null

  try {
    return new URL(/^[a-z][a-z\d+.-]*:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`)
  } catch {
    return null
  }
}

const isAssistedImportStudyHost = (value: string) => {
  const source = normalizePotentialStudyUrl(value)
  return Boolean(source && assistedImportHostPattern.test(source.hostname))
}

export function MyMaterialsPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const profile = useStudySystemStore((state) => state.profile)
  const materialsHydrated = useStudySystemStore((state) => state.materialsHydrated)
  const materials = useStudySystemStore((state) => state.materials)
  const materialQuestions = useStudySystemStore((state) => state.materialQuestions)
  const activeMaterialQuizSession = useStudySystemStore((state) => state.activeMaterialQuizSession)
  const importStudyMaterial = useStudySystemStore((state) => state.importStudyMaterial)
  const importStudyMaterialFromUrl = useStudySystemStore((state) => state.importStudyMaterialFromUrl)
  const importStudyMaterialFromText = useStudySystemStore((state) => state.importStudyMaterialFromText)
  const deleteStudyMaterial = useStudySystemStore((state) => state.deleteStudyMaterial)
  const updateStudyMaterialMeta = useStudySystemStore((state) => state.updateStudyMaterialMeta)
  const regenerateMaterialStudyTools = useStudySystemStore((state) => state.regenerateMaterialStudyTools)
  const approveMaterialStudyTools = useStudySystemStore((state) => state.approveMaterialStudyTools)
  const startMaterialFlashcards = useStudySystemStore((state) => state.startMaterialFlashcards)
  const startMaterialQuiz = useStudySystemStore((state) => state.startMaterialQuiz)
  const abandonMaterialQuiz = useStudySystemStore((state) => state.abandonMaterialQuiz)
  const saveNote = useStudySystemStore((state) => state.saveNote)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const materialReviewRef = useRef<HTMLDivElement | null>(null)
  const initialImportUrl = searchParams.get('importUrl')?.trim() ?? ''
  const initialImportUrlNeedsAssistedImport = isAssistedImportStudyHost(initialImportUrl)
  const [selectedMaterialId, setSelectedMaterialId] = useState<string | null>(null)
  const [dragActive, setDragActive] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [materialUrl, setMaterialUrl] = useState(initialImportUrl)
  const [assistedImportOpen, setAssistedImportOpen] = useState(Boolean(initialImportUrl))
  const [assistedImportText, setAssistedImportText] = useState('')
  const [assistedImportMode, setAssistedImportMode] = useState<MaterialImportMode>('full')
  const [assistedSourceUrl, setAssistedSourceUrl] = useState(initialImportUrl)
  const [blockedImportSourceUrl, setBlockedImportSourceUrl] = useState(
    initialImportUrlNeedsAssistedImport ? initialImportUrl : '',
  )
  const [uploadMessage, setUploadMessage] = useState(() => {
    if (!initialImportUrl) return ''
    return initialImportUrlNeedsAssistedImport
      ? 'This study site usually blocks direct import. Open the source, copy the visible terms and definitions, then paste or read clipboard below.'
      : 'Assisted import is open. Paste study text from this link or upload the source file instead.'
  })
  const [previewExpanded, setPreviewExpanded] = useState(false)
  const [studyGuideOpen, setStudyGuideOpen] = useState(false)
  const trackCategories = getExamCategories(profile.examTrack ?? 'nclex-rn')
  const getLibraryStatus = (material: StudyMaterial) => {
    const approvedTotal = material.generatedFlashcardIds.length + material.generatedQuestionIds.length
    if (material.extractionStatus === 'error') {
      return { label: 'Failed', tone: 'rose' as const, detail: 'Fix source before studying' }
    }
    if (material.extractionStatus === 'extracting') {
      return { label: 'Importing', tone: 'cyan' as const, detail: 'Building library item' }
    }
    if (material.reviewStatus === 'pending-review') {
      return { label: 'Needs Review', tone: 'amber' as const, detail: 'Approve before studying' }
    }
    if (material.reviewStatus === 'approved' || approvedTotal > 0) {
      return { label: 'Approved', tone: 'emerald' as const, detail: 'Ready to study' }
    }
    return { label: 'Needs Review', tone: 'amber' as const, detail: 'Review generated tools' }
  }

  const selectedMaterial =
    materials.find((material) => material.id === selectedMaterialId) ?? materials[0] ?? null
  const selectedFlashcardCount = selectedMaterial?.generatedFlashcardIds.length ?? 0
  const selectedQuestionCount = selectedMaterial?.generatedQuestionIds.length ?? 0
  const selectedPendingFlashcardCount = selectedMaterial?.pendingFlashcards?.length ?? 0
  const selectedPendingQuestionCount = selectedMaterial?.pendingQuestions?.length ?? 0
  const selectedPendingTotal = selectedPendingFlashcardCount + selectedPendingQuestionCount
  const selectedIsPendingReview = selectedMaterial?.reviewStatus === 'pending-review'
  const selectedIsApproved = selectedMaterial?.reviewStatus === 'approved'
  const selectedHasApprovedTools = selectedFlashcardCount + selectedQuestionCount > 0
  const selectedPreviewText = selectedMaterial
    ? selectedMaterial.assets
        .slice(0, previewExpanded ? selectedMaterial.assets.length : 4)
        .map((asset) => `${asset.title}\n${asset.content}`)
        .join('\n\n')
    : ''
  const selectedStudyGuide = useMemo(
    () => (selectedMaterial ? buildMaterialStudyGuide(selectedMaterial) : null),
    [selectedMaterial],
  )
  const activeMaterialQuizIsRunnable = useMemo(() => {
    if (!activeMaterialQuizSession) return false
    if (!materials.some((material) => material.id === activeMaterialQuizSession.materialId)) return false
    if (activeMaterialQuizSession.endedAt) return true

    const currentQuestionId = activeMaterialQuizSession.questionIds[activeMaterialQuizSession.currentIndex]
    return Boolean(currentQuestionId && materialQuestions.some((question) => question.id === currentQuestionId))
  }, [activeMaterialQuizSession, materialQuestions, materials])

  const errorCount = materials.filter((item) => item.extractionStatus === 'error').length
  const latestMaterial = useMemo(
    () =>
      [...materials].sort(
        (left, right) => new Date(right.importedAt).getTime() - new Date(left.importedAt).getTime(),
      )[0] ?? null,
    [materials],
  )
  const latestMaterialStatus = latestMaterial ? getLibraryStatus(latestMaterial) : null
  const materialUrlNeedsAssistedImport = isAssistedImportStudyHost(materialUrl)
  const assistedSourceUrlForCopy = blockedImportSourceUrl || assistedSourceUrl || materialUrl
  const normalizedAssistedSource = normalizePotentialStudyUrl(assistedSourceUrlForCopy)?.toString() ?? ''

  const handleFiles = async (incoming: File[] | FileList) => {
    const files = Array.from(incoming)
    if (!files.length) return
    setUploadMessage('')
    setIsUploading(true)

    for (const file of files) {
      try {
        await importStudyMaterial(file)
      } catch (error) {
        reportSafeError('material-file-import', error)
        setUploadMessage(getSafeErrorCopy('material-file-import'))
      }
    }

    setIsUploading(false)
  }

  const handleMaterialUrlImport = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const trimmedUrl = materialUrl.trim()
    setUploadMessage('')

    if (isAssistedImportStudyHost(trimmedUrl)) {
      setAssistedImportOpen(true)
      setAssistedSourceUrl(trimmedUrl)
      setBlockedImportSourceUrl(trimmedUrl)
      setUploadMessage(
        'Assisted import is ready for this study set. Open the source, copy the visible terms and definitions, then paste or read clipboard below.',
      )
      return
    }

    setIsUploading(true)

    try {
      await importStudyMaterialFromUrl(materialUrl)
      setAssistedImportOpen(false)
      setAssistedSourceUrl('')
      setBlockedImportSourceUrl('')
      setAssistedImportText('')
      setMaterialUrl('')
      setUploadMessage('Link imported. Review the generated study tools before saving them to your deck.')
    } catch (error) {
      reportSafeError('material-link-import', error)
      const blocked = isBlockedMaterialImport(error)
      if (blocked) {
        setAssistedImportOpen(true)
        setAssistedSourceUrl(materialUrl)
        setBlockedImportSourceUrl(materialUrl)
        setUploadMessage('This page needs assisted import. Copy the visible terms, definitions, or notes from the page, then paste or read clipboard below.')
      } else {
        setBlockedImportSourceUrl('')
        setUploadMessage(getSafeErrorCopy('material-link-import'))
      }
    }

    setIsUploading(false)
  }

  const handleClipboardAssistedImport = async () => {
    if (!navigator.clipboard?.readText) {
      setUploadMessage('Clipboard access is not available in this browser. Paste the study text into the box below.')
      return
    }

    try {
      const text = await navigator.clipboard.readText()
      setAssistedImportText(text)
      setAssistedImportOpen(true)
      setUploadMessage('Copied page text loaded. Review it, then import.')
    } catch (error) {
      reportSafeError('material-assisted-import', error)
      setUploadMessage('Clipboard access was blocked. Paste the study text into the box below.')
    }
  }

  const handleAssistedImport = async () => {
    setUploadMessage('')
    setIsUploading(true)

    try {
      await importStudyMaterialFromText({
        mode: assistedImportMode,
        sourceUrl: assistedSourceUrl || materialUrl || undefined,
        text: assistedImportText,
      })
      setAssistedImportText('')
      setAssistedImportOpen(false)
      setAssistedSourceUrl('')
      setBlockedImportSourceUrl('')
      setMaterialUrl('')
      setUploadMessage('Study text imported. Review the generated tools before saving them to your deck.')
    } catch (error) {
      reportSafeError('material-assisted-import', error)
      setUploadMessage(getSafeErrorCopy('material-assisted-import'))
    }

    setIsUploading(false)
  }

  const sendToNotes = () => {
    if (!selectedMaterial) return

    const body = selectedMaterial.assets
      .slice(0, 4)
      .map((asset) => `${asset.title}\n${asset.content}`)
      .join('\n\n')

    saveNote({
      id: createClientId(),
      title: `${selectedMaterial.displayTitle} review note`,
      body,
      category: selectedMaterial.sourceCategory ?? 'General',
      updatedAt: new Date().toISOString(),
    })
    navigate('/notes')
  }

  const openStudyGuide = () => {
    if (!selectedMaterial?.assets.length) return
    setStudyGuideOpen((current) => !current)
  }

  const startSelectedMaterialFlashcards = () => {
    if (!selectedMaterial || !selectedFlashcardCount) return
    startMaterialFlashcards(selectedMaterial.id)
    navigate(`/flashcards?materialId=${encodeURIComponent(selectedMaterial.id)}`)
  }

  const startSelectedMaterialQuiz = () => {
    if (!selectedMaterial || !selectedQuestionCount) return
    startMaterialQuiz(selectedMaterial.id, {
      questionCount: Math.min(5, selectedQuestionCount),
      title: `Study from ${selectedMaterial.displayTitle}`,
    })
  }

  const scrollToMaterialReview = () => {
    materialReviewRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  useEffect(() => {
    if (!materialsHydrated || !activeMaterialQuizSession || activeMaterialQuizIsRunnable) return
    abandonMaterialQuiz()
  }, [abandonMaterialQuiz, activeMaterialQuizIsRunnable, activeMaterialQuizSession, materialsHydrated])

  if (activeMaterialQuizSession && activeMaterialQuizIsRunnable) {
    return <MaterialQuizRunner />
  }

  return (
    <PageStack>
      <PageHeader
        eyebrow="Study Library"
        title="Your Study Library"
        description="Keep your uploaded notes, guides, and generated study tools in one calmer library."
        action={
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-cyan-100/45 bg-[linear-gradient(180deg,#24b8ff_0%,#0b83d6_100%)] px-6 py-3 text-sm font-bold text-white shadow-[0_12px_34px_rgba(14,165,233,0.28)] transition hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-cyan-200/55"
          >
            <Upload className="h-4 w-4" />
            Upload material
          </button>
        }
      />
      <FocusPanel className="border-violet-200/30 bg-[linear-gradient(135deg,rgba(168,85,247,0.16),rgba(6,28,49,0.94)_42%,rgba(2,8,18,0.96))] text-white shadow-[0_0_40px_rgba(168,85,247,0.12)]">
        <div className="grid gap-5 p-4 sm:p-5 md:p-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
          <div className="min-w-0">
            <div className="flex flex-wrap gap-2">
              <CommandBadge tone="violet" icon={<FolderOpen className="h-3.5 w-3.5" />}>Library</CommandBadge>
              <CommandBadge tone={latestMaterialStatus?.tone ?? 'cyan'} icon={<UploadCloud className="h-3.5 w-3.5" />}>
                {latestMaterialStatus?.label ?? 'Ready to add'}
              </CommandBadge>
            </div>
            <h3 className="mt-4 max-w-3xl text-3xl font-bold tracking-normal text-white md:text-4xl">
              {latestMaterial ? `Review ${latestMaterial.displayTitle}` : 'Add your first study material'}
            </h3>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-sky-100/72">
              {latestMaterial
                ? `${latestMaterialStatus?.detail ?? 'Open the latest material'}, then study only the tools you approve.`
                : 'Upload a study guide, notes file, or public study link. Nurse Command keeps generated cards and quiz items behind a review gate.'}
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              {latestMaterial ? (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedMaterialId(latestMaterial.id)
                    setPreviewExpanded(false)
                    setStudyGuideOpen(false)
                  }}
                  className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-xl border border-amber-100/48 bg-[linear-gradient(180deg,#fbbf24_0%,#b77912_100%)] px-5 py-3 text-sm font-bold text-white shadow-[0_14px_34px_rgba(251,191,36,0.22)] transition hover:brightness-110 focus:outline-none focus:ring-4 focus:ring-amber-300/20"
                >
                  Review latest material
                  <ArrowRight className="h-4 w-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-xl border border-cyan-100/45 bg-[linear-gradient(180deg,#24b8ff_0%,#0b83d6_100%)] px-5 py-3 text-sm font-bold text-white shadow-[0_12px_34px_rgba(14,165,233,0.28)] transition hover:brightness-110 focus:outline-none focus:ring-4 focus:ring-cyan-300/18"
                >
                  Add your first material
                  <Upload className="h-4 w-4" />
                </button>
              )}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-xl border border-cyan-200/24 bg-cyan-300/[0.07] px-5 py-3 text-sm font-bold text-cyan-100 transition hover:border-cyan-100/55 hover:bg-cyan-300/13 focus:outline-none focus:ring-4 focus:ring-cyan-300/18"
              >
                Add material
                <UploadCloud className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div className="rounded-[1rem] border border-violet-200/18 bg-[#031426]/74 p-4">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-violet-100/66">User-added materials</p>
            <p className="mt-2 text-5xl font-black leading-none text-white">{materials.length}</p>
            <p className="mt-2 text-sm font-semibold text-sky-100/66">total files and links in your library</p>
            {latestMaterial ? (
              <div className="mt-4 rounded-xl border border-white/8 bg-white/[0.035] px-3 py-3">
                <p className="text-xs font-bold uppercase text-sky-100/48">Latest</p>
                <p className="mt-1 min-w-0 break-words text-sm font-bold text-white">{latestMaterial.displayTitle}</p>
                <p className="mt-1 text-xs font-semibold text-sky-100/56">{latestMaterialStatus?.label}</p>
              </div>
            ) : null}
          </div>
        </div>
      </FocusPanel>

      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.docx,.txt,.md"
        multiple
        className="hidden"
        onChange={(event) => {
          if (event.target.files) {
            void handleFiles(event.target.files)
          }
          event.target.value = ''
        }}
      />

      <div className="grid gap-6 xl:grid-cols-[0.86fr_1.14fr]">
        <div className="grid gap-6">
          <NurseCommandBackdrop className="order-2 rounded-[22px] border border-sky-300/20">
            <div className="p-4">
            <div className="mb-4">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-cyan-100/66">Add to library</p>
              <h3 className="mt-1 text-xl font-bold text-white">Upload or import material</h3>
              <p className="mt-1 text-sm leading-6 text-sky-100/62">
                Import tools stay lower so the library and next review stay first.
              </p>
            </div>
            <div
              onDragOver={(event) => {
                event.preventDefault()
                setDragActive(true)
              }}
              onDragLeave={(event) => {
                event.preventDefault()
                setDragActive(false)
              }}
              onDrop={(event) => {
                event.preventDefault()
                setDragActive(false)
                void handleFiles(event.dataTransfer.files)
              }}
            >
              <MaterialUploadAsset active={dragActive} onBrowse={() => fileInputRef.current?.click()} />
            </div>
            <div className="mt-4 rounded-2xl border border-amber-200/28 bg-amber-300/[0.08] p-4">
              <div className="flex gap-3">
                <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-amber-100" />
                <div>
                  <p className="text-sm font-black text-white">Upload privacy check</p>
                  <p className="mt-1 text-sm leading-6 text-sky-100/68">
                    Use study notes, guides, outlines, or public references only. Do not upload protected health information, patient-identifying data, clinical records, or private school records.
                  </p>
                </div>
              </div>
            </div>
            {isUploading ? (
              <p className="mt-4 rounded-2xl border border-sky-300/25 bg-sky-400/10 px-4 py-3 text-sm font-semibold text-sky-100">
                <LoaderCircle className="mr-2 inline h-4 w-4 animate-spin" />
                Pulling study material into your library.
              </p>
            ) : null}
            <p className="mt-4 text-xs font-semibold uppercase tracking-[0.14em] text-sky-200/60">
              Supports PDF, DOCX, TXT, MD up to 8 MB each
            </p>
            <form
              onSubmit={handleMaterialUrlImport}
              className="mt-5 rounded-[20px] border border-sky-300/20 bg-[#071d34]/70 p-4"
            >
              <Field label="Or import a study link">
                <div className="flex flex-col gap-3 sm:flex-row">
                  <div className="relative flex-1">
                    <Link2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-sky-200/60" />
                    <input
                      value={materialUrl}
                      onChange={(event) => setMaterialUrl(event.target.value)}
                      placeholder="https://example.com/study-guide"
                      className="h-12 w-full rounded-2xl border border-sky-300/25 bg-[#03101f]/70 pl-10 pr-3 text-sm text-white outline-none transition placeholder:text-sky-200/35 focus:border-sky-200 focus:ring-4 focus:ring-sky-400/15"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isUploading || !materialUrl.trim()}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-sky-300/25 bg-sky-500/85 px-4 py-3 text-sm font-semibold text-white shadow-[0_0_24px_rgba(43,148,255,0.22)] transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isUploading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
                    Import link
                  </button>
                </div>
              </Field>
              <p className="mt-3 text-xs leading-5 text-sky-200/60">
                {materialUrlNeedsAssistedImport
                  ? 'Paste the link, then use Assisted import to copy the visible set once and keep moving.'
                  : 'Works best with public text-heavy study pages. If a site blocks direct import, copy the visible terms or notes and use Assisted import.'}
              </p>
              <button
                type="button"
                onClick={() => {
                  setAssistedImportOpen((current) => !current)
                  setAssistedSourceUrl(materialUrl)
                  setBlockedImportSourceUrl(isAssistedImportStudyHost(materialUrl) ? materialUrl : '')
                }}
                className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-xl border border-sky-300/20 bg-white/[0.045] px-3 py-2 text-xs font-black uppercase tracking-[0.12em] text-sky-100 transition hover:bg-white/[0.08]"
              >
                <ClipboardList className="h-4 w-4" />
                {assistedImportOpen ? 'Hide assisted import' : materialUrlNeedsAssistedImport ? 'Open assisted import' : 'Use assisted import'}
              </button>
            </form>
            {assistedImportOpen ? (
              <div className="mt-4 rounded-[20px] border border-amber-200/24 bg-amber-300/[0.07] p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.14em] text-amber-100/70">
                      Assisted import
                    </p>
                    <h3 className="mt-1 text-lg font-black text-white">
                      Paste copied terms, definitions, or notes.
                    </h3>
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-sky-100/66">
                      For Quizlet-style pages, open the set, select the visible study text, copy it, then paste here. Nurse Command removes page noise and turns the content into editable study tools.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleClipboardAssistedImport()}
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-amber-100/25 bg-amber-200/12 px-4 py-2 text-sm font-black text-amber-50 transition hover:bg-amber-200/18"
                  >
                    <ClipboardList className="h-4 w-4" />
                    Read clipboard
                  </button>
                </div>

                {normalizedAssistedSource ? (
                  <div className="mt-4 rounded-2xl border border-amber-100/25 bg-[#03101f]/54 p-4">
                    <p className="text-xs font-black uppercase tracking-[0.14em] text-amber-100/76">
                      Fastest path for this link
                    </p>
                    <div className="mt-3 grid gap-3 md:grid-cols-3">
                      <a
                        href={normalizedAssistedSource}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-sky-200/22 bg-sky-400/12 px-4 py-2 text-sm font-black text-sky-50 transition hover:bg-sky-400/18"
                      >
                        <ExternalLink className="h-4 w-4" />
                        Open source set
                      </a>
                      <button
                        type="button"
                        onClick={() => void handleClipboardAssistedImport()}
                        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-amber-100/25 bg-amber-200/12 px-4 py-2 text-sm font-black text-amber-50 transition hover:bg-amber-200/18"
                      >
                        <ClipboardList className="h-4 w-4" />
                        Read copied text
                      </button>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-violet-100/24 bg-violet-300/12 px-4 py-2 text-sm font-black text-violet-50 transition hover:bg-violet-300/18"
                      >
                        <Upload className="h-4 w-4" />
                        Upload file instead
                      </button>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-sky-100/66">
                      Copy the visible terms and definitions from the source. Nurse Command will remove page clutter, build editable study tools, and ask you to approve them before saving.
                    </p>
                  </div>
                ) : null}

                <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto]">
                  <Field label="Build">
                    <select
                      value={assistedImportMode}
                      onChange={(event) => setAssistedImportMode(event.target.value as MaterialImportMode)}
                      className="h-12 w-full rounded-2xl border border-amber-100/20 bg-[#03101f]/70 px-3 text-sm font-semibold text-white outline-none transition focus:border-amber-100/70 focus:ring-4 focus:ring-amber-300/15"
                    >
                      <option value="full">Flashcards, quiz, and guide</option>
                      <option value="flashcards">Flashcards only</option>
                      <option value="quiz">Quiz only</option>
                      <option value="guide">Study guide only</option>
                    </select>
                  </Field>
                  <button
                    type="button"
                    disabled={isUploading || assistedImportText.trim().length < 80}
                    onClick={() => void handleAssistedImport()}
                    className="inline-flex min-h-12 items-center justify-center gap-2 self-end rounded-xl border border-emerald-100/30 bg-emerald-500/80 px-4 py-3 text-sm font-black text-white shadow-[0_0_24px_rgba(16,185,129,0.18)] transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isUploading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                    Clean and import
                  </button>
                </div>

                <textarea
                  value={assistedImportText}
                  onChange={(event) => setAssistedImportText(event.target.value)}
                  placeholder={'Paste copied study text here, for example:\nDigoxin\nMonitor pulse and watch for toxicity.\nWarfarin\nMonitor INR and bleeding precautions.'}
                  className="mt-3 min-h-44 w-full resize-y rounded-2xl border border-amber-100/20 bg-[#03101f]/78 p-4 text-sm leading-6 text-white outline-none transition placeholder:text-sky-100/34 focus:border-amber-100/70 focus:ring-4 focus:ring-amber-300/15"
                />
                <div className="mt-3 grid gap-2 text-xs leading-5 text-sky-100/58 md:grid-cols-3">
                  <p>Removes navigation, dates, ads, URLs, and duplicate deck lines.</p>
                  <p>Detects term-definition pairs, medication clues, lab values, safety cues, and nursing actions.</p>
                  <p>Keeps generated cards/questions editable until you approve them.</p>
                </div>
              </div>
            ) : null}
            {uploadMessage ? (
              <div className="mt-4 rounded-2xl border border-sky-300/25 bg-sky-400/10 px-4 py-3 text-sm font-semibold text-sky-100">
                {uploadMessage}
              </div>
            ) : null}
            </div>
          </NurseCommandBackdrop>

          <Surface className="order-1 border-violet-200/18 bg-violet-300/[0.045]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="nc-section-title text-2xl text-white">Your library</h3>
                <p className="mt-1 text-sm text-sky-100/64">
                  {errorCount
                    ? `${errorCount} item${errorCount === 1 ? '' : 's'} need attention.`
                    : 'Every upload stays separate until you approve the study tools.'}
                </p>
              </div>
              <CommandBadge tone="violet" icon={<FolderOpen className="h-3.5 w-3.5" />}>{materials.length} files</CommandBadge>
            </div>

            <div className="mt-5 space-y-3">
              {materialsHydrated && materials.length ? (
                materials.map((material) => {
                  const materialStatus = getLibraryStatus(material)
                  const materialPendingTotal = (material.pendingFlashcards?.length ?? 0) + (material.pendingQuestions?.length ?? 0)
                  const materialApprovedTotal = material.generatedFlashcardIds.length + material.generatedQuestionIds.length
                  const materialItemTotal = materialPendingTotal + materialApprovedTotal

                  return (
                    <button
                      key={material.id}
                      type="button"
                      onClick={() => {
                        setSelectedMaterialId(material.id)
                        setPreviewExpanded(false)
                        setStudyGuideOpen(false)
                      }}
                      className={clsx(
                        'w-full rounded-[18px] border p-4 text-left transition hover:-translate-y-0.5',
                        selectedMaterial?.id === material.id
                          ? 'border-amber-200/50 bg-amber-300/[0.09] shadow-[0_0_24px_rgba(251,191,36,0.12)]'
                          : 'border-violet-200/18 bg-white/[0.045] hover:border-violet-100/38 hover:bg-violet-300/[0.07]',
                      )}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="nclex-chip nclex-chip-info">{material.fileType.toUpperCase()}</span>
                            <CommandBadge tone={materialStatus.tone}>{materialStatus.label}</CommandBadge>
                          </div>
                          <p className="mt-3 truncate text-base font-semibold text-white">
                            {material.displayTitle}
                          </p>
                          <p className="mt-1 text-sm text-sky-100/58">
                            Imported {formatImportDate(material.importedAt)}
                          </p>
                          <span className={clsx(
                            'mt-3 inline-flex min-h-8 items-center rounded-lg border px-3 py-1 text-xs font-semibold',
                            materialStatus.tone === 'rose' && 'border-rose-200/24 bg-rose-300/[0.08] text-rose-100',
                            materialStatus.tone === 'cyan' && 'border-cyan-200/24 bg-cyan-300/[0.08] text-cyan-100',
                            materialStatus.tone === 'amber' && 'border-amber-200/24 bg-amber-300/[0.08] text-amber-100',
                            materialStatus.tone === 'emerald' && 'border-emerald-200/24 bg-emerald-300/[0.08] text-emerald-100',
                          )}>
                            {materialStatus.detail}
                          </span>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-sm font-semibold text-white">
                            {materialItemTotal}
                          </p>
                          <p className="mt-1 text-xs text-sky-100/54">
                            study items
                          </p>
                        </div>
                      </div>
                    </button>
                  )
                })
              ) : (
                <EmptyState
                  title="Your materials library is empty."
                  description="Upload a study guide and we'll turn it into a reusable review set."
                />
              )}
            </div>
          </Surface>
        </div>

        <Surface className="border-violet-200/18 bg-[#061426]">
          {selectedMaterial ? (
            <div className="space-y-6">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="nclex-chip nclex-chip-info">{selectedMaterial.fileType.toUpperCase()}</span>
                    <CommandBadge tone={getLibraryStatus(selectedMaterial).tone}>
                      {getLibraryStatus(selectedMaterial).label}
                    </CommandBadge>
                  </div>
                  <h3 className="mt-3 nc-section-title text-3xl text-white">
                    {selectedMaterial.displayTitle}
                  </h3>
                  <p className="mt-2 text-sm leading-7 text-sky-100/64">
                    {selectedMaterial.error
                      ? selectedMaterial.error
                      : 'Review the material, approve generated tools, then study from the items you trust.'}
                  </p>
                </div>
                <div className="min-w-[10rem]">
                  <CommandStatTile
                    label="Study items"
                    value={`${selectedFlashcardCount + selectedQuestionCount + selectedPendingTotal}`}
                    detail={getLibraryStatus(selectedMaterial).detail}
                    icon={<FolderOpen className="h-4 w-4" />}
                    tone={getLibraryStatus(selectedMaterial).tone}
                  />
                </div>
              </div>

              <div className="rounded-[18px] border border-cyan-200/18 bg-[#061c31] p-4 text-white">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <h4 className="text-xl font-bold text-white">What this upload can do</h4>
                    <p className="mt-2 max-w-3xl text-sm leading-6 text-sky-100/66">
                      Work from left to right: review generated tools, open a guide, drill flashcards, or run a quiz from this material.
                    </p>
                  </div>
                  <span
                    className={clsx(
                      'inline-flex min-h-8 items-center rounded-lg border px-3 py-1 text-xs font-bold',
                      selectedMaterial.extractionStatus === 'error'
                        ? 'border-rose-200/28 bg-rose-300/10 text-rose-100'
                        : selectedIsPendingReview
                          ? 'border-amber-200/28 bg-amber-300/10 text-amber-100'
                          : selectedIsApproved || selectedHasApprovedTools
                            ? 'border-emerald-200/28 bg-emerald-300/10 text-emerald-100'
                            : 'border-sky-200/20 bg-white/[0.055] text-sky-100/70',
                    )}
                  >
                    {selectedMaterial.extractionStatus === 'error'
                      ? 'Needs attention'
                      : selectedIsPendingReview
                        ? 'Review needed'
                        : selectedIsApproved || selectedHasApprovedTools
                          ? 'Ready to study'
                          : 'Processing'}
                  </span>
                </div>

                <div className="mt-4 grid gap-3 lg:grid-cols-4">
                  <MaterialToolCard
                    icon={<ShieldCheck className="h-5 w-5" />}
                    title="Review tools"
                    detail={
                      selectedIsPendingReview
                        ? `${selectedPendingTotal} proposed items waiting. Approve them before they enter your decks.`
                        : selectedIsApproved || selectedHasApprovedTools
                          ? 'Generated tools are approved and saved.'
                          : 'Tools appear here after the material is parsed.'
                    }
                    status={selectedIsPendingReview ? 'Next step' : selectedIsApproved || selectedHasApprovedTools ? 'Done' : 'Waiting'}
                    tone={selectedIsPendingReview ? 'amber' : selectedIsApproved || selectedHasApprovedTools ? 'green' : 'blue'}
                    actionLabel={selectedIsPendingReview ? 'Review now' : undefined}
                    onAction={selectedIsPendingReview ? scrollToMaterialReview : undefined}
                  />
                  <MaterialToolCard
                    icon={<BookOpen className="h-5 w-5" />}
                    title="Study guide"
                    detail="Open a clean summary, outline, and key terms from the uploaded content."
                    status={selectedMaterial.assets.length ? 'Available' : 'No text'}
                    tone="blue"
                    actionLabel={studyGuideOpen ? 'Hide guide' : 'Open guide'}
                    onAction={selectedMaterial.assets.length ? openStudyGuide : undefined}
                    disabled={!selectedMaterial.assets.length}
                  />
                  <MaterialToolCard
                    icon={<Sparkles className="h-5 w-5" />}
                    title="Flashcards"
                    detail={
                      selectedFlashcardCount
                        ? `${selectedFlashcardCount} approved cards ready for spaced review.`
                        : selectedIsPendingReview
                          ? 'Approve proposed flashcards first.'
                          : 'No flashcards saved yet.'
                    }
                    status={selectedFlashcardCount ? 'Ready' : selectedIsPendingReview ? 'Approve first' : 'Empty'}
                    tone={selectedFlashcardCount ? 'green' : 'slate'}
                    actionLabel="Study cards"
                    onAction={selectedFlashcardCount ? startSelectedMaterialFlashcards : undefined}
                    disabled={!selectedFlashcardCount}
                  />
                  <MaterialToolCard
                    icon={<ClipboardList className="h-5 w-5" />}
                    title="Quiz"
                    detail={
                      selectedQuestionCount
                        ? `${selectedQuestionCount} approved quiz items ready for a short drill.`
                        : selectedIsPendingReview
                          ? 'Approve proposed quiz items first.'
                          : 'No quiz items saved yet.'
                    }
                    status={selectedQuestionCount ? 'Ready' : selectedIsPendingReview ? 'Approve first' : 'Empty'}
                    tone={selectedQuestionCount ? 'green' : 'slate'}
                    actionLabel="Start quiz"
                    onAction={selectedQuestionCount ? startSelectedMaterialQuiz : undefined}
                    disabled={!selectedQuestionCount}
                  />
                </div>
              </div>

              {selectedMaterial.extractionStatus === 'error' ? (
                <NextActionPanel
                  eyebrow="Fix source"
                  title="This material needs a cleaner input."
                  description="The link did not provide clean study text. Use assisted paste, retry the source, upload the file, or remove this attempt from your library."
                  tone="amber"
                  primary={
                    <button
                      type="button"
                      onClick={() => {
                        setAssistedImportOpen(true)
                        setAssistedSourceUrl(selectedMaterial.sourceUrl ?? '')
                        setBlockedImportSourceUrl(selectedMaterial.sourceUrl ?? '')
                        setMaterialUrl(selectedMaterial.sourceUrl ?? '')
                        setUploadMessage('Assisted import is open. Paste copied study text or use Read clipboard.')
                      }}
                      className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-amber-100/35 bg-amber-300/[0.12] px-5 py-3 text-sm font-bold text-amber-50 transition hover:bg-amber-300/18 focus:outline-none focus:ring-4 focus:ring-amber-300/20"
                    >
                      Use assisted paste
                      <ClipboardList className="h-4 w-4" />
                    </button>
                  }
                  secondary={
                    <>
                      {selectedMaterial.sourceUrl ? (
                        <button
                          type="button"
                          onClick={() => {
                            setMaterialUrl(selectedMaterial.sourceUrl ?? '')
                            setUploadMessage('Source link restored. Retry direct import, or use assisted paste if the page blocks clean text.')
                          }}
                          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-cyan-200/24 bg-cyan-300/[0.07] px-5 py-3 text-sm font-bold text-cyan-100 transition hover:border-cyan-100/55 hover:bg-cyan-300/13 focus:outline-none focus:ring-4 focus:ring-cyan-300/18"
                        >
                          Retry link
                          <RefreshCw className="h-4 w-4" />
                        </button>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-violet-200/24 bg-violet-300/[0.08] px-5 py-3 text-sm font-bold text-violet-100 transition hover:bg-violet-300/14 focus:outline-none focus:ring-4 focus:ring-violet-300/18"
                      >
                        Upload file instead
                        <Upload className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => void deleteStudyMaterial(selectedMaterial.id)}
                        className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-rose-200/25 bg-rose-300/[0.08] px-5 py-3 text-sm font-bold text-rose-100 transition hover:bg-rose-300/14 focus:outline-none focus:ring-4 focus:ring-rose-300/18"
                      >
                        Remove failed import
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </>
                  }
                />
              ) : null}

              {selectedMaterial.reviewStatus === 'pending-review' ? (
                <div ref={materialReviewRef} className="scroll-mt-24">
                  <MaterialReviewPanel
                    key={`${selectedMaterial.id}-${selectedPendingFlashcardCount}-${selectedPendingQuestionCount}`}
                    material={selectedMaterial}
                    onApprove={(flashcardDrafts, questionDrafts) =>
                      approveMaterialStudyTools(selectedMaterial.id, flashcardDrafts, questionDrafts)
                    }
                  />
                </div>
              ) : null}

              <div className="grid gap-4 md:grid-cols-[0.9fr_1.1fr]">
                <Surface className="border-cyan-200/14 bg-white/[0.035] p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-sky-100/58">
                    Library settings
                  </p>
                  <div className="mt-4 grid gap-4">
                    <Field label="Assign category">
                      <select
                        value={selectedMaterial.sourceCategory ?? 'General'}
                        onChange={(event) =>
                          void updateStudyMaterialMeta(selectedMaterial.id, {
                            sourceCategory: event.target.value as StudyMaterial['sourceCategory'],
                          })
                        }
                        className={selectClass}
                      >
                        <option value="General">General</option>
                        {trackCategories.map((item) => (
                          <option key={item} value={item}>
                            {item}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <div>
                      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-sky-100/58">
                        Tags
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {selectedMaterial.tags.length ? (
                          selectedMaterial.tags.map((tag) => (
                            <span key={tag} className="nclex-chip nclex-chip-info">
                              {tag}
                            </span>
                          ))
                        ) : (
                          <span className="text-sm text-sky-100/56">
                            No inferred tags yet.
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </Surface>

                <Surface className="border-cyan-200/14 bg-white/[0.035] p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-sky-100/58">
                    Manage library item
                  </p>
                  <p className="mt-2 text-sm leading-6 text-sky-100/60">
                    Keep study actions in the workspace above. Use these when you want to move, rebuild, or remove the source.
                  </p>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={sendToNotes}
                      className="nclex-btn-secondary inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold"
                    >
                      <FileText className="h-4 w-4" />
                      Send to Notes
                    </button>
                    <button
                      type="button"
                      disabled={selectedMaterial.extractionStatus !== 'ready'}
                      onClick={() => void regenerateMaterialStudyTools(selectedMaterial.id)}
                      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-cyan-200/20 bg-cyan-300/[0.07] px-4 py-3 text-sm font-semibold text-cyan-100 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <RefreshCw className="h-4 w-4" />
                      Regenerate
                    </button>
                    <button
                      type="button"
                      onClick={() => void deleteStudyMaterial(selectedMaterial.id)}
                      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-rose-200/25 bg-rose-300/[0.08] px-4 py-3 text-sm font-semibold text-rose-100 transition hover:bg-rose-300/14 sm:col-span-2"
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </button>
                  </div>
                </Surface>
              </div>

              {studyGuideOpen && selectedStudyGuide ? (
                <Surface className="border-violet-200/16 bg-violet-300/[0.045] p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-violet-100/70">
                        Nursing exam study guide
                      </p>
                      <h4 className="mt-2 nc-section-title text-2xl text-white">
                        {selectedMaterial.displayTitle}
                      </h4>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        saveNote({
                          id: createClientId(),
                          title: `${selectedMaterial.displayTitle} study guide`,
                          body: [
                            'Simple summary',
                            selectedStudyGuide.summary,
                            '',
                            'Study outline',
                            ...selectedStudyGuide.outline.map((item) => `- ${item}`),
                            '',
                            'Key terms',
                            ...selectedStudyGuide.keyTerms.map((item) => `- ${item}`),
                          ].join('\n'),
                          category: selectedMaterial.sourceCategory ?? 'General',
                          updatedAt: new Date().toISOString(),
                        })
                        navigate('/notes')
                      }}
                      className="nclex-btn-secondary inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold"
                    >
                      <NotebookPen className="h-4 w-4" />
                      Save guide to Notes
                    </button>
                  </div>
                  <div className="mt-5 grid gap-4 lg:grid-cols-3">
                    <div className="rounded-[18px] border border-violet-200/14 bg-[#031426]/72 p-4 lg:col-span-2">
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-violet-100/62">
                        Simple summary
                      </p>
                      <p className="mt-2 text-sm leading-7 text-sky-100/70">
                        {selectedStudyGuide.summary}
                      </p>
                    </div>
                    <div className="rounded-[18px] border border-violet-200/14 bg-[#031426]/72 p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-violet-100/62">
                        Key terms
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {selectedStudyGuide.keyTerms.map((term) => (
                          <span key={term} className="nclex-chip nclex-chip-info">
                            {term}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="rounded-[18px] border border-violet-200/14 bg-[#031426]/72 p-4 lg:col-span-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-violet-100/62">
                        Study outline
                      </p>
                      <div className="mt-3 grid gap-2 md:grid-cols-2">
                        {selectedStudyGuide.outline.map((item) => (
                          <div
                            key={item}
                            className="rounded-xl border border-cyan-200/10 bg-cyan-300/[0.055] px-4 py-3 text-sm leading-6 text-sky-100/70"
                          >
                            {item}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </Surface>
              ) : null}

              <Surface className="border-cyan-200/14 bg-cyan-300/[0.04] p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-cyan-100/60">
                      Extracted text preview
                    </p>
                    <h4 className="mt-2 text-lg font-semibold text-white">
                      Open extracted text
                    </h4>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPreviewExpanded((current) => !current)}
                    className="nclex-btn-secondary inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold"
                  >
                    {previewExpanded ? 'Show less' : 'Show more'}
                  </button>
                </div>
                <div className="mt-4 max-h-[360px] overflow-y-auto rounded-[18px] border border-cyan-200/12 bg-[#031426]/76 p-4">
                  <pre className="whitespace-pre-wrap text-sm leading-7 text-sky-100/70">
                    {selectedPreviewText || selectedMaterial.preview || 'No readable text preview is available yet.'}
                  </pre>
                </div>
              </Surface>
            </div>
          ) : (
            <CommandEmptyState
              title="Add your first study material."
              description="Your uploads will show up with extracted text and proposed study tools to review before saving."
              tone="violet"
            />
          )}
        </Surface>
      </div>
    </PageStack>
  )
}

function MaterialToolCard({
  icon,
  title,
  detail,
  status,
  tone,
  actionLabel,
  onAction,
  disabled = false,
}: {
  icon: React.ReactNode
  title: string
  detail: string
  status: string
  tone: 'amber' | 'blue' | 'green' | 'slate'
  actionLabel?: string
  onAction?: () => void
  disabled?: boolean
}) {
  const styles = {
    amber: {
      card: 'border-amber-200/24 bg-amber-300/[0.075]',
      icon: 'border-amber-200/30 bg-amber-300/12 text-amber-100',
      status: 'border-amber-200/28 bg-amber-300/10 text-amber-100',
    },
    blue: {
      card: 'border-cyan-200/20 bg-cyan-300/[0.06]',
      icon: 'border-cyan-200/28 bg-cyan-300/12 text-cyan-100',
      status: 'border-cyan-200/24 bg-cyan-300/10 text-cyan-100',
    },
    green: {
      card: 'border-emerald-200/22 bg-emerald-300/[0.06]',
      icon: 'border-emerald-200/28 bg-emerald-300/12 text-emerald-100',
      status: 'border-emerald-200/24 bg-emerald-300/10 text-emerald-100',
    },
    slate: {
      card: 'border-slate-200/14 bg-white/[0.04]',
      icon: 'border-slate-200/18 bg-white/[0.055] text-slate-200/78',
      status: 'border-slate-200/16 bg-white/[0.05] text-slate-100/70',
    },
  }[tone]

  return (
    <div className={clsx('flex min-h-[14rem] flex-col rounded-[14px] border p-4', styles.card)}>
      <div className="flex items-start justify-between gap-3">
        <span className={clsx('inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border', styles.icon)}>
          {icon}
        </span>
        <span className={clsx('rounded-lg border px-2.5 py-1 text-[0.68rem] font-bold uppercase', styles.status)}>
          {status}
        </span>
      </div>
      <h5 className="mt-4 text-base font-bold text-white">{title}</h5>
      <p className="mt-2 flex-1 text-sm leading-6 text-sky-100/64">{detail}</p>
      {actionLabel ? (
        <button
          type="button"
          disabled={disabled || !onAction}
          onClick={onAction}
          className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-cyan-200/24 bg-white/[0.055] px-3 py-2 text-sm font-bold text-cyan-100 transition hover:border-cyan-200/45 hover:bg-cyan-300/10 disabled:cursor-not-allowed disabled:border-slate-200/10 disabled:text-slate-200/40"
        >
          {actionLabel}
          <ArrowRight className="h-4 w-4" />
        </button>
      ) : null}
    </div>
  )
}

function MaterialQualityMessages({ issues }: { issues: MaterialQualityIssue[] }) {
  if (!issues.length) return null

  return (
    <div className="mb-3 space-y-2">
      {issues.map((issue) => (
        <div
          key={`${issue.code}-${issue.field ?? 'item'}`}
          className={clsx(
            'rounded-xl border px-3 py-2 text-xs font-semibold leading-5',
            issue.severity === 'blocker'
              ? 'border-rose-200/25 bg-rose-300/[0.08] text-rose-100'
              : 'border-amber-200/25 bg-amber-300/[0.08] text-amber-100',
          )}
        >
          {issue.message}
        </div>
      ))}
    </div>
  )
}

function MaterialReviewPanel({
  material,
  onApprove,
}: {
  material: StudyMaterial
  onApprove: (flashcards: MaterialFlashcard[], questions: MaterialQuestion[]) => Promise<void>
}) {
  const [flashcardDrafts, setFlashcardDrafts] = useState<MaterialFlashcard[]>(
    () => material.pendingFlashcards ?? [],
  )
  const [questionDrafts, setQuestionDrafts] = useState<MaterialQuestion[]>(
    () => material.pendingQuestions ?? [],
  )
  const [isApproving, setIsApproving] = useState(false)
  const totalPending = flashcardDrafts.length + questionDrafts.length
  const qualitySummary = useMemo(
    () => summarizeMaterialQuality(flashcardDrafts, questionDrafts),
    [flashcardDrafts, questionDrafts],
  )
  const blockedItemIds = useMemo(
    () =>
      new Set(
        qualitySummary.issues
          .filter((issue) => issue.severity === 'blocker')
          .map((issue) => issue.itemId),
      ),
    [qualitySummary],
  )
  const saveableTotal = totalPending - blockedItemIds.size

  const updateFlashcardDraft = (
    id: string,
    updates: Partial<Pick<MaterialFlashcard, 'front' | 'back'>>,
  ) => {
    setFlashcardDrafts((current) =>
      current.map((card) => (card.id === id ? { ...card, ...updates } : card)),
    )
  }

  const updateQuestionDraft = (
    id: string,
    updates: Partial<Pick<MaterialQuestion, 'prompt' | 'rationale'>>,
  ) => {
    setQuestionDrafts((current) =>
      current.map((question) => (question.id === id ? { ...question, ...updates } : question)),
    )
  }

  const updateQuestionChoiceDraft = (questionId: string, choiceId: string, text: string) => {
    setQuestionDrafts((current) =>
      current.map((question) =>
        question.id === questionId
          ? {
              ...question,
              choices: question.choices.map((choice) =>
                choice.id === choiceId ? { ...choice, text } : choice,
              ),
            }
          : question,
      ),
    )
  }

  const updateQuestionCorrectAnswerDraft = (questionId: string, choiceId: string) => {
    setQuestionDrafts((current) =>
      current.map((question) =>
        question.id === questionId ? { ...question, correctAnswer: [choiceId] } : question,
      ),
    )
  }

  const approveDrafts = async () => {
    setIsApproving(true)
    try {
      const nonEmptyFlashcards = flashcardDrafts.filter((card) => card.front.trim() && card.back.trim())
      const nonEmptyQuestions = questionDrafts.filter(
        (question) => question.prompt.trim() && question.rationale.trim(),
      )
      const filtered = filterMaterialStudyTools(nonEmptyFlashcards, nonEmptyQuestions)
      await onApprove(filtered.flashcards, filtered.questions)
    } finally {
      setIsApproving(false)
    }
  }

  return (
    <Surface className="border-violet-200/18 bg-violet-300/[0.045] p-4">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-violet-100/70">
            Review before saving
          </p>
          <h4 className="mt-2 nc-section-title text-2xl text-white">
            Approve generated study tools
          </h4>
          <p className="mt-2 max-w-3xl text-sm leading-7 text-sky-100/64">
            These cards and quiz items were generated from {material.displayTitle}. Edit or remove weak items before they enter your flashcard deck and material quiz bank.
          </p>
        </div>
        <button
          type="button"
          disabled={!totalPending || !saveableTotal || isApproving}
          onClick={() => void approveDrafts()}
          className="nclex-btn-primary inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isApproving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
          {qualitySummary.blockerCount ? `Approve ${saveableTotal} ready item${saveableTotal === 1 ? '' : 's'}` : 'Approve and save'}
        </button>
      </div>

      <div
        className={clsx(
          'mt-4 rounded-2xl border px-4 py-3 text-sm font-semibold',
          qualitySummary.blockerCount
            ? 'border-rose-200/25 bg-rose-300/[0.08] text-rose-100'
            : qualitySummary.warningCount
              ? 'border-amber-200/25 bg-amber-300/[0.08] text-amber-100'
              : 'border-emerald-200/22 bg-emerald-300/[0.075] text-emerald-100',
        )}
      >
        {qualitySummary.blockerCount
          ? `${qualitySummary.blockerCount} item issue${qualitySummary.blockerCount === 1 ? '' : 's'} must be fixed or removed before those items save.`
          : qualitySummary.warningCount
            ? `${qualitySummary.warningCount} review note${qualitySummary.warningCount === 1 ? '' : 's'} found. You can still approve ready items.`
            : 'Generated tools passed the review checks and are ready to save.'}
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        <div className="rounded-[18px] border border-cyan-200/14 bg-[#031426]/72 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-cyan-100/60">
                Flashcards
              </p>
              <h5 className="mt-1 font-semibold text-white">
                {flashcardDrafts.length} proposed cards
              </h5>
            </div>
            <span className="nclex-chip nclex-chip-info">Editable</span>
          </div>
          <div className="mt-4 max-h-[460px] space-y-4 overflow-y-auto pr-1">
            {flashcardDrafts.length ? (
              flashcardDrafts.map((card, index) => (
                <div key={card.id} className="rounded-[16px] border border-cyan-200/12 bg-cyan-300/[0.045] p-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-cyan-100/65">
                      Card {index + 1}
                    </p>
                    <button
                      type="button"
                      onClick={() => setFlashcardDrafts((current) => current.filter((item) => item.id !== card.id))}
                      className="text-xs font-semibold text-rose-200"
                    >
                      Remove
                    </button>
                  </div>
                  <MaterialQualityMessages issues={qualitySummary.issuesByItemId[card.id] ?? []} />
                  <Field label="Front">
                    <textarea
                      value={card.front}
                      rows={2}
                      onChange={(event) => updateFlashcardDraft(card.id, { front: event.target.value })}
                      className={textareaClass}
                    />
                  </Field>
                  <div className="mt-3">
                    <Field label="Back">
                      <textarea
                        value={card.back}
                        rows={4}
                        onChange={(event) => updateFlashcardDraft(card.id, { back: event.target.value })}
                        className={textareaClass}
                      />
                    </Field>
                  </div>
                </div>
              ))
            ) : (
              <EmptyState
                title="No proposed flashcards remain."
                description="You removed every proposed card. You can still approve quiz items or regenerate the material."
              />
            )}
          </div>
        </div>

        <div className="rounded-[18px] border border-violet-200/14 bg-[#031426]/72 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-violet-100/62">
                Quiz questions
              </p>
              <h5 className="mt-1 font-semibold text-white">
                {questionDrafts.length} proposed items
              </h5>
            </div>
            <span className="nclex-chip nclex-chip-warning">Review</span>
          </div>
          <div className="mt-4 max-h-[460px] space-y-4 overflow-y-auto pr-1">
            {questionDrafts.length ? (
              questionDrafts.map((question, index) => (
                <div key={question.id} className="rounded-[16px] border border-violet-200/12 bg-violet-300/[0.045] p-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-violet-100/65">
                      Question {index + 1}
                    </p>
                    <button
                      type="button"
                      onClick={() => setQuestionDrafts((current) => current.filter((item) => item.id !== question.id))}
                      className="text-xs font-semibold text-rose-200"
                    >
                      Remove
                    </button>
                  </div>
                  <MaterialQualityMessages issues={qualitySummary.issuesByItemId[question.id] ?? []} />
                  <Field label="Prompt">
                    <textarea
                      value={question.prompt}
                      rows={3}
                      onChange={(event) => updateQuestionDraft(question.id, { prompt: event.target.value })}
                      className={textareaClass}
                    />
                  </Field>
                  <div className="mt-3 rounded-xl border border-violet-200/12 bg-[#031426]/72 p-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-violet-100/60">
                      Choices
                    </p>
                    <div className="mt-2 space-y-2">
                      {question.choices.map((choice) => (
                        <div key={choice.id} className="flex flex-col gap-2 rounded-xl border border-violet-200/12 bg-violet-300/[0.04] p-2 sm:flex-row sm:items-center">
                          <label className="inline-flex min-h-9 shrink-0 items-center gap-2 rounded-lg border border-violet-200/14 bg-[#031426]/80 px-3 text-xs font-semibold text-sky-100/70">
                            <input
                              type="radio"
                              name={`correct-answer-${question.id}`}
                              checked={question.correctAnswer[0] === choice.id}
                              onChange={() => updateQuestionCorrectAnswerDraft(question.id, choice.id)}
                            />
                            {choice.id}
                          </label>
                          <input
                            value={choice.text}
                            onChange={(event) => updateQuestionChoiceDraft(question.id, choice.id, event.target.value)}
                            className="min-h-10 flex-1 rounded-lg border border-violet-200/14 bg-[#031426]/80 px-3 py-2 text-sm text-sky-50 outline-none transition placeholder:text-sky-100/36 focus:border-violet-200/55 focus:ring-4 focus:ring-violet-300/14"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="mt-3">
                    <Field label="Rationale">
                      <textarea
                        value={question.rationale}
                        rows={4}
                        onChange={(event) => updateQuestionDraft(question.id, { rationale: event.target.value })}
                        className={textareaClass}
                      />
                    </Field>
                  </div>
                </div>
              ))
            ) : (
              <EmptyState
                title="No proposed quiz items remain."
                description="You removed every proposed question. You can still approve flashcards or regenerate the material."
              />
            )}
          </div>
        </div>
      </div>
    </Surface>
  )
}

export function StudyPlanPage() {
  const navigate = useNavigate()
  const profile = useStudySystemStore((state) => state.profile)
  const attempts = useStudySystemStore((state) => state.attempts)
  const activeSession = useStudySystemStore((state) => state.activeSession)
  const updateProfile = useStudySystemStore((state) => state.updateProfile)
  const startPracticeSession = useStudySystemStore((state) => state.startPracticeSession)
  const weakAreas = useMemo(() => getWeakAreas(attempts, profile.examTrack ?? 'nclex-rn', profile.preferences.analyticsScope ?? 'selected-track'), [attempts, profile.examTrack, profile.preferences.analyticsScope])
  const plan = useMemo(() => buildStudyPlan(profile, weakAreas), [profile, weakAreas])
  const category = weakAreas[0]?.category
  const questionCount = Math.max(5, Math.min(profile.dailyGoal, 15))
  const resume = isActiveSessionOpen(activeSession) && activeSession?.mode === 'practice'
  const start = () => {
    if (!resume) startPracticeSession({ category: category ?? 'All', questionCount, difficulty: 'adaptive', format: 'mixed' })
    navigate('/practice-questions', { state: { resumeStudySession: true } })
  }
  return <section className="simple-study" aria-labelledby="plan-title">
    <header><h1 id="plan-title">Study Plan</h1><p>{getExamTrack(profile.examTrack ?? 'nclex-rn').shortName} · Your next study session.</p></header>
    <div className="simple-study-today"><h2>{resume ? 'Continue your practice' : category ? shortCategoryLabel(category) : 'Mixed practice'}</h2>
      <p>{resume ? activeSession?.responses.length + ' of ' + activeSession?.questionIds.length + ' answered' : 'Up to ' + questionCount + ' questions · Review your answers as you go'}</p>
      <button className="simple-study-start" onClick={start}>{resume ? 'Resume session' : "Start today’s session"}<ArrowRight size={18} /></button>
    </div>
    <details className="simple-study-details"><summary>This week & later</summary>
      <h2>This week</h2><ul>{plan.weeklyGoals.map((goal) => <li key={goal}>{goal}</li>)}</ul>
      <h2>Later</h2><ul>{plan.recommendedSessions.map((goal) => <li key={goal}>{goal}</li>)}</ul>
      <Link className="simple-study-link" to="/review">Review saved & missed questions</Link>
    </details>
    <details className="simple-study-details"><summary>Plan settings</summary><div className="simple-study-fields">
      <Field label="Exam date"><input className={inputClass} type="date" value={profile.examDate} onChange={(event) => updateProfile({ examDate: event.target.value })} /></Field>
      <Field label="Study pace"><select className={selectClass} value={profile.studyIntensity} onChange={(event) => updateProfile({ studyIntensity: event.target.value as typeof profile.studyIntensity })}><option value="steady">Steady</option><option value="focused">Focused</option><option value="accelerated">Accelerated</option></select></Field>
      <Field label="Daily question goal"><select className={selectClass} value={profile.dailyGoal} onChange={(event) => updateProfile({ dailyGoal: Number(event.target.value) })}>{Array.from(new Set([5,10,15,20,25,30,35,40,profile.dailyGoal])).sort((a,b) => a-b).map((count) => <option key={count} value={count}>{count}</option>)}</select></Field>
    </div></details>
    <Link className="simple-study-link" to="/performance-analytics">View progress</Link>
  </section>
}

const clinicalScenarios = [
  {
    id: 'chest-pain',
    title: 'Adult patient with chest pain',
    brief: 'A 62-year-old reports crushing chest pain, diaphoresis, and shortness of breath after walking to the bathroom.',
    risk: 'High risk',
    steps: [
      {
        label: 'Assess',
        prompt: 'What should the nurse assess first?',
        options: ['Pain scale only', 'Airway, breathing, circulation, vital signs, and ECG changes', 'Home diet history'],
        best: 1,
        feedback: 'Start with ABCs, perfusion, vitals, and ECG because chest pain can become unstable quickly.',
      },
      {
        label: 'Problem',
        prompt: 'What is the priority concern?',
        options: ['Possible myocardial ischemia', 'Knowledge deficit', 'Activity intolerance only'],
        best: 0,
        feedback: 'The pattern suggests possible cardiac ischemia, so oxygenation and perfusion drive the next actions.',
      },
      {
        label: 'Intervention',
        prompt: 'What would you do first?',
        options: ['Leave to call dietary', 'Stop activity, place in semi-Fowler, obtain vitals, notify provider/rapid response per policy', 'Give oral fluids'],
        best: 1,
        feedback: 'Stabilize, collect critical data, and escalate. This is the safest first-action pattern.',
      },
      {
        label: 'Notify',
        prompt: 'Who needs to be notified?',
        options: ['Provider/rapid response based on acuity', 'Billing office', 'Physical therapy only'],
        best: 0,
        feedback: 'Escalate to the provider or rapid response team because the patient may be actively unstable.',
      },
      {
        label: 'Document',
        prompt: 'What documentation matters most?',
        options: ['Only the room number', 'Symptoms, vitals, ECG findings, interventions, response, and notifications', 'Meal preferences'],
        best: 1,
        feedback: 'Document the clinical picture, nursing actions, response, and escalation trail.',
      },
    ],
  },
  {
    id: 'low-blood-sugar',
    title: 'Patient with low blood sugar',
    brief: 'A diabetic client is shaky, sweating, confused, and has a blood glucose of 48 mg/dL.',
    risk: 'Immediate intervention',
    steps: [
      {
        label: 'Assess',
        prompt: 'What do you verify first?',
        options: ['Level of consciousness and ability to swallow safely', 'Last eye exam', 'Insurance status'],
        best: 0,
        feedback: 'Airway and swallowing safety determine whether oral glucose is safe or IV/glucagon is needed.',
      },
      {
        label: 'Problem',
        prompt: 'What problem is most likely?',
        options: ['Hyperglycemia', 'Hypoglycemia', 'Fluid overload'],
        best: 1,
        feedback: 'Sweating, shakiness, confusion, and glucose 48 point to hypoglycemia.',
      },
      {
        label: 'Intervention',
        prompt: 'What is the priority intervention if awake and able to swallow?',
        options: ['Give a fast-acting carbohydrate', 'Hold all food', 'Encourage ambulation'],
        best: 0,
        feedback: 'Treat hypoglycemia quickly with fast carbohydrate if swallowing is safe, then reassess.',
      },
      {
        label: 'Notify',
        prompt: 'When should the nurse notify/escalate?',
        options: ['If symptoms persist, LOC worsens, or protocol requires provider notification', 'Never', 'Only at discharge'],
        best: 0,
        feedback: 'Persistent or worsening neuro changes require escalation because glucose instability can become dangerous.',
      },
      {
        label: 'Document',
        prompt: 'What should be charted?',
        options: ['Blood glucose, symptoms, treatment, reassessment value, and patient response', 'Only medication list', 'The weather'],
        best: 0,
        feedback: 'The safety loop is complete only when treatment and reassessment are documented.',
      },
    ],
  },
  {
    id: 'child-respiratory',
    title: 'Child with respiratory distress',
    brief: 'A 4-year-old has nasal flaring, intercostal retractions, wheezing, and oxygen saturation of 89%.',
    risk: 'Airway priority',
    steps: [
      {
        label: 'Assess',
        prompt: 'Which finding is most urgent?',
        options: ['Retractions and oxygen saturation of 89%', 'Favorite toy', 'Mild hunger'],
        best: 0,
        feedback: 'Work of breathing plus low oxygen saturation means airway and breathing are priority.',
      },
      {
        label: 'Problem',
        prompt: 'What is the priority problem?',
        options: ['Impaired gas exchange', 'Delayed growth chart update', 'Knowledge deficit only'],
        best: 0,
        feedback: 'The child is showing signs of compromised oxygenation.',
      },
      {
        label: 'Intervention',
        prompt: 'What would you do first?',
        options: ['Apply oxygen per protocol and position upright while escalating care', 'Ask the child to run', 'Delay assessment'],
        best: 0,
        feedback: 'Support oxygenation and reduce work of breathing while getting help.',
      },
      {
        label: 'Notify',
        prompt: 'Who should be notified?',
        options: ['Provider/rapid response or respiratory therapy per policy', 'Cafeteria', 'Billing'],
        best: 0,
        feedback: 'Respiratory compromise in a child can deteriorate quickly, so escalation is appropriate.',
      },
      {
        label: 'Document',
        prompt: 'What documentation is essential?',
        options: ['Respiratory assessment, SpO2, oxygen/interventions, response, and notifications', 'Favorite color only', 'Parking instructions'],
        best: 0,
        feedback: 'Chart respiratory status, actions, response, and escalation.',
      },
    ],
  },
]

const nurseCommandLabModules = [
  {
    title: 'Hospitalvania',
    description: 'Run the side-scrolling clinical judgment prototype when you want fast pressure reps.',
    to: '/hospitalvania',
    icon: Zap,
    action: 'Enter Hospitalvania',
    skill: 'Rapid clinical judgment',
    sessionLength: '8-12 min',
    status: 'Experimental prototype',
    statusTone: 'rose' as const,
    tone: 'rose' as const,
    accent: 'from-violet-400/28 to-cyan-400/10',
  },
  {
    title: 'Nurse Tycoon',
    description: 'Balance staffing, quality, and patient flow in the management sim.',
    to: '/nurse-tycoon',
    icon: BarChart3,
    action: 'Open tycoon',
    skill: 'Systems thinking',
    sessionLength: '10-15 min',
    status: 'Ready',
    statusTone: 'emerald' as const,
    tone: 'violet' as const,
    accent: 'from-amber-300/28 to-emerald-400/10',
  },
  {
    title: 'Clinical Simulator',
    description: 'Step through patient scenarios using the nursing judgment loop.',
    to: '/clinical-simulator',
    icon: Target,
    action: 'Train first actions',
    skill: 'Assessment and escalation',
    sessionLength: '6-10 min',
    status: 'Recommended',
    statusTone: 'amber' as const,
    tone: 'amber' as const,
    accent: 'from-emerald-300/28 to-cyan-400/10',
  },
  {
    title: 'Shift Game',
    description: 'Practice prioritization under time pressure in a hospital shift loop.',
    to: '/shift-command',
    icon: HeartPulse,
    action: 'Start shift',
    skill: 'Prioritization',
    sessionLength: '10-12 min',
    status: 'Ready',
    statusTone: 'emerald' as const,
    tone: 'rose' as const,
    accent: 'from-rose-400/28 to-cyan-400/10',
  },
]

const nurseCommandLabUtilities = [
  {
    title: 'Command Center',
    description: 'Open the retro hospital dashboard for a quick operational readout.',
    to: '/medical-command-center',
    icon: BrainCircuit,
    action: 'Open command center',
  },
]

export function NurseCommandLabPage() {
  const featuredLabModule = nurseCommandLabModules.find((module) => module.to === '/clinical-simulator') ?? nurseCommandLabModules[0]

  return (
    <PageStack>
      <PageHeader
        eyebrow="Nurse Lab"
        title="Nurse Lab"
        description="Simulation and game-based clinical practice for priority, escalation, flow, and first-action thinking."
        action={
          <CommandRouteLink to={featuredLabModule.to} emphasis="primary" icon={<ArrowRight className="h-4 w-4" />}>
            Enter recommended module
          </CommandRouteLink>
        }
      />

      <CommandFocusPanel tone="violet">
        <div className="grid gap-5 p-5 md:p-6 xl:grid-cols-[minmax(0,1fr)_22rem] xl:items-stretch">
          <div>
            <div className="flex flex-wrap gap-2">
              <CommandBadge tone="amber" icon={<Target className="h-3.5 w-3.5" />}>Recommended module</CommandBadge>
              <CommandBadge tone="violet" icon={<FlaskConical className="h-3.5 w-3.5" />}>Simulation</CommandBadge>
            </div>
            <h3 className="mt-3 max-w-3xl text-3xl font-bold tracking-normal text-white md:text-5xl">
              Start with {featuredLabModule.title}
            </h3>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-sky-100/72">
              Use this when you want a clinical judgment loop instead of another question set. It trains {featuredLabModule.skill.toLowerCase()} in a short, contained run.
            </p>
            <div className="mt-5 grid gap-2 sm:grid-cols-3">
              <CommandStatTile label="Skill" value="First action" detail={featuredLabModule.skill} tone="violet" icon={<BrainCircuit className="h-4 w-4" />} />
              <CommandStatTile label="Length" value={featuredLabModule.sessionLength} detail="typical run" tone="cyan" icon={<Clock3 className="h-4 w-4" />} />
              <CommandStatTile label="Status" value={featuredLabModule.status} detail="recommended" tone={featuredLabModule.statusTone} icon={<ShieldCheck className="h-4 w-4" />} />
            </div>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <CommandRouteLink to={featuredLabModule.to} emphasis="primary" icon={<ArrowRight className="h-4 w-4" />}>
                {featuredLabModule.action}
              </CommandRouteLink>
              <CommandRouteLink
                to="/quick-study"
                tone="cyan"
                icon={<BookOpen className="h-4 w-4" />}
              >
                Back to questions
              </CommandRouteLink>
            </div>
          </div>
          <div className="grid gap-3">
            <CommandInsightPanel
              eyebrow="Why this lab exists"
              title="Practice the messy middle."
              description="These modules train priority, escalation, flow, and patient-state decisions that do not fit neatly inside a normal question set."
              tone="violet"
            />
            <CommandStatusRow
              icon={<ShieldCheck className="h-4 w-4" />}
              title="Core app stays clean"
              detail="Games and simulations stay one layer down so navigation does not become a link dump."
              tone="emerald"
            />
          </div>
        </div>
      </CommandFocusPanel>

      <div>
        <SectionHeading
          title="Choose a lab module"
          description="Each module has a job: what it trains, how long it takes, and whether it is ready for regular practice."
        />
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        {nurseCommandLabModules.map(({ title, description, to, icon: Icon, action, skill, sessionLength, status, statusTone, tone, accent }) => (
          <Surface key={to} className="group flex min-h-[260px] flex-col justify-between p-0">
            <div className={clsx('h-1.5 bg-gradient-to-r', accent)} />
            <div>
              <div className="p-5 md:p-6">
                <div className="flex items-start justify-between gap-4">
                  <div
                    className={clsx(
                      'flex h-12 w-12 items-center justify-center rounded-[16px] border shadow-[0_0_24px_rgba(56,189,248,0.12)]',
                      tone === 'amber'
                        ? 'border-amber-300/30 bg-amber-300/14 text-amber-100'
                        : tone === 'rose'
                          ? 'border-rose-300/28 bg-rose-300/12 text-rose-100'
                          : 'border-violet-300/28 bg-violet-300/12 text-violet-100',
                    )}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <CommandBadge tone={statusTone}>{status}</CommandBadge>
                </div>
                <h2 className="mt-5 text-2xl font-bold tracking-normal text-white">{title}</h2>
                <p className="mt-3 text-sm leading-6 text-sky-100/66">{description}</p>
                <div className="mt-5 grid gap-2 sm:grid-cols-2">
                  <CommandStatusRow icon={<BrainCircuit className="h-4 w-4" />} title="Skill trained" detail={skill} tone="violet" />
                  <CommandStatusRow icon={<Clock3 className="h-4 w-4" />} title="Session length" detail={sessionLength} tone="cyan" />
                </div>
              </div>
            </div>
            <CommandRouteLink
              to={to}
              tone={tone === 'rose' ? 'rose' : tone === 'amber' ? 'amber' : 'violet'}
              className="mx-5 mb-5 md:mx-6 md:mb-6"
              icon={<ArrowRight className="h-4 w-4" />}
            >
              {action}
            </CommandRouteLink>
          </Surface>
        ))}
      </div>

      <Surface>
        <SectionHeading
          title="Lab utility"
          description="Operational dashboards stay available without crowding the simulation choices."
        />
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {nurseCommandLabUtilities.map(({ title, description, to, icon: Icon, action }) => (
            <Link
              key={to}
              to={to}
              className="rounded-[18px] border border-cyan-300/20 bg-white/[0.035] p-4 transition hover:border-cyan-200/60 hover:bg-cyan-300/10"
            >
              <div className="flex items-start gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] border border-cyan-300/20 bg-cyan-300/10 text-cyan-100">
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-bold text-white">{title}</p>
                  <p className="mt-1 text-sm leading-6 text-sky-100/64">{description}</p>
                  <p className="mt-3 inline-flex items-center gap-2 text-sm font-bold text-cyan-200">
                    {action}
                    <ArrowRight className="h-4 w-4" />
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </Surface>
    </PageStack>
  )
}

export function ClinicalSimulatorPage() {
  const activeSession = useStudySystemStore((state) => state.activeSession)
  const startClinicalThinking = useStudySystemStore((state) => state.startClinicalThinking)
  const abandonSession = useStudySystemStore((state) => state.abandonSession)
  const [scenarioId, setScenarioId] = useState(clinicalScenarios[0].id)
  const [answers, setAnswers] = useState<Record<number, number>>({})

  const scenario = clinicalScenarios.find((item) => item.id === scenarioId) ?? clinicalScenarios[0]
  const completed = scenario.steps.filter((_, index) => typeof answers[index] === 'number').length
  const launchClinicalThinking = (focus: string) => {
    const sessionIsOpen = isActiveSessionOpen(activeSession)
    if (!(sessionIsOpen && activeSession?.mode === 'clinical-thinking')) {
      startClinicalThinking(focus)
    }
  }

  if (activeSession?.mode === 'clinical-thinking' && isRenderableSession(activeSession)) {
    return (
      <QuestionSessionRunner
        key={`${activeSession.id}-${activeSession.currentIndex}`}
        session={activeSession}
        modeLabel="Clinical Scenario Simulator"
        onExit={abandonSession}
      />
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Clinical Simulator"
        title="Train the question every nurse has to answer: what do you do first?"
        description="Work through realistic patient situations step by step: assess, identify the problem, choose the priority intervention, notify, and document."
        action={
          <button
            type="button"
            onClick={() => launchClinicalThinking('First Action')}
            className="nclex-btn-primary inline-flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold"
          >
            <Zap className="h-4 w-4" />
            Start NCLEX drill
          </button>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
        <Surface>
          <SectionHeading
            title="Patient scenarios"
            description="Pick a case, then move through the nursing judgment loop."
          />
          <div className="mt-5 space-y-3">
            {clinicalScenarios.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setScenarioId(item.id)
                  setAnswers({})
                }}
                className={clsx(
                  'w-full rounded-[18px] border p-4 text-left transition',
                  item.id === scenario.id
                    ? 'border-[#bfdbfe] bg-[var(--nclex-blue-soft)]'
                    : 'border-[var(--nclex-border)] bg-white hover:border-[#c9dbef]',
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-[var(--nclex-text)]">{item.title}</p>
                    <p className="mt-2 text-sm leading-6 text-[var(--nclex-text-muted)]">{item.brief}</p>
                  </div>
                  <span className="nclex-chip nclex-chip-warning">{item.risk}</span>
                </div>
              </button>
            ))}
          </div>
        </Surface>

        <Surface>
          <div className="rounded-[22px] border border-[#cfe1f7] bg-[#eef5ff] p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--nclex-blue)]">
              Active case
            </p>
            <h3 className="mt-2 nc-section-title text-3xl text-[var(--nclex-text)]">{scenario.title}</h3>
            <p className="mt-3 text-sm leading-7 text-[var(--nclex-text-secondary)]">{scenario.brief}</p>
            <div className="mt-5">
              <ProgressBar value={completed / scenario.steps.length} />
            </div>
          </div>

          <div className="mt-6 space-y-4">
            {scenario.steps.map((step, stepIndex) => {
              const selected = answers[stepIndex]
              const answered = typeof selected === 'number'
              const correct = selected === step.best
              return (
                <div key={step.label} className="rounded-[20px] border border-[var(--nclex-border)] bg-white p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <span className="nclex-chip nclex-chip-info">{stepIndex + 1}. {step.label}</span>
                    {answered ? (
                      <span className={correct ? 'nclex-chip nclex-chip-success' : 'nclex-chip nclex-chip-danger'}>
                        {correct ? 'Safe decision' : 'Review this step'}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-3 font-semibold text-[var(--nclex-text)]">{step.prompt}</p>
                  <div className="mt-4 grid gap-2">
                    {step.options.map((option, optionIndex) => (
                      <button
                        key={option}
                        type="button"
                        onClick={() => setAnswers((current) => ({ ...current, [stepIndex]: optionIndex }))}
                        className={clsx(
                          'rounded-xl border px-4 py-3 text-left text-sm transition',
                          selected === optionIndex && correct
                            ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                            : selected === optionIndex
                              ? 'border-rose-300 bg-rose-50 text-rose-800'
                              : 'border-[var(--nclex-border)] bg-[var(--nclex-card-muted)] text-[var(--nclex-text-secondary)] hover:border-[#c9dbef]',
                        )}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                  {answered ? (
                    <p className="mt-3 rounded-xl bg-[var(--nclex-card-muted)] px-4 py-3 text-sm leading-6 text-[var(--nclex-text-secondary)]">
                      {step.feedback}
                    </p>
                  ) : null}
                </div>
              )
            })}
          </div>
        </Surface>
      </div>
    </div>
  )
}

const resourceNames: Record<string, string> = { 'strat-1': 'Prioritization', 'strat-2': 'Basic needs', 'strat-3': 'Patient safety', 'strat-4': 'Delegation', 'strat-5': 'Clinical trends' }

export function StrategyTrainingPage() {
  const [search, setSearch] = useState('')
  const activeSession = useStudySystemStore((state) => state.activeSession)
  const startClinicalThinking = useStudySystemStore((state) => state.startClinicalThinking)
  const abandonSession = useStudySystemStore((state) => state.abandonSession)
  const launchClinicalThinking = (focus: string) => {
    const sessionIsOpen = isActiveSessionOpen(activeSession)
    if (!(sessionIsOpen && activeSession?.mode === 'clinical-thinking')) {
      startClinicalThinking(focus)
    }
  }

  if (activeSession?.mode === 'clinical-thinking' && isRenderableSession(activeSession)) {
    return (
      <QuestionSessionRunner
        key={`${activeSession.id}-${activeSession.currentIndex}`}
        session={activeSession}
        modeLabel="Clinical Thinking Mode"
        onExit={abandonSession}
      />
    )
  }

  return (
    <section className="reference-page resources-workspace">
      <h1>Resources</h1>
      <label className="reference-search">Search resources
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Find a topic or framework" className={inputClass} />
      </label>
      <div className="reference-resource-list">
        {strategyLessons.filter((lesson) => [resourceNames[lesson.id], lesson.title, lesson.framework, lesson.summary].join(' ').toLowerCase().includes(search.toLowerCase())).map((lesson) => (
          <details className="reference-resource" name="resource-topic" key={lesson.id}>
            <summary>{resourceNames[lesson.id] ?? lesson.title}<ChevronDown size={18} aria-hidden="true" /></summary>
            <div className="reference-resource-body">
              <p>{lesson.summary}</p>
              <ul>{lesson.bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}</ul>
              <details className="reference-options"><summary>Example</summary>
                <p>{lesson.microScenario.prompt}</p><p>{lesson.microScenario.bestResponse}</p>
              </details>
              <button type="button" className="simple-study-primary" onClick={() => launchClinicalThinking(lesson.framework)}>Practice this topic <ArrowRight size={18} /></button>
            </div>
          </details>
        ))}
        {!strategyLessons.some((lesson) => [resourceNames[lesson.id], lesson.title, lesson.framework, lesson.summary].join(' ').toLowerCase().includes(search.toLowerCase())) ? <p className="reference-muted">No resources match your search.</p> : null}
      </div>
    </section>
  )
}

export function NotesPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const seedCategory = searchParams.get('category')
  const profile = useStudySystemStore((state) => state.profile)
  const activeSession = useStudySystemStore((state) => state.activeSession)
  const notes = useStudySystemStore((state) => state.notes)
  const saveNote = useStudySystemStore((state) => state.saveNote)
  const deleteNote = useStudySystemStore((state) => state.deleteNote)
  const startPracticeSession = useStudySystemStore((state) => state.startPracticeSession)
  const [selectedCategory, setSelectedCategory] = useState<string>(seedCategory ?? 'All')
  const [search, setSearch] = useState('')
  const deferredSearch = useDeferredValue(search)
  const [noteMessage, setNoteMessage] = useState('')
  const ownerId = useStudySystemStore((state) => state.authUser?.id ?? 'local')
  const syncStatus = useStudySystemStore((state) => state.syncStatus)
  const noteKey = `nurse-command-last-note:${ownerId}`
  const [mobileView, setMobileView] = useState<'list' | 'editor'>('editor')
  const autosave = useMemo(() => createNoteAutosave(saveNote), [saveNote])
  useEffect(() => {
    const flush = () => autosave.flush()
    window.addEventListener('pagehide', flush)
    return () => { window.removeEventListener('pagehide', flush); flush() }
  }, [autosave])
  const rememberNote = (id: string) => { try { localStorage.setItem(noteKey, id) } catch { /* Storage may be unavailable. */ } }
  const [draft, setDraft] = useState<Note>(() => {
    let lastId: string | null = null
    try { lastId = localStorage.getItem(noteKey) } catch { /* Fall back to latest note. */ }
    const candidates = seedCategory ? notes.filter((note) => note.category === seedCategory) : notes
    return candidates.find((note) => note.id === lastId) ?? [...candidates].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0] ?? {
    id: createClientId(),
    title: '',
    body: '',
    category: (seedCategory as QuestionCategory) ?? 'General',
    updatedAt: new Date().toISOString(),
  } })
  const trackCategories = getExamCategories(profile.examTrack ?? 'nclex-rn')
  const resetDraft = () => {
    autosave.flush()
    setMobileView('editor')
    setDraft({
      id: createClientId(),
      title: '',
      body: '',
      category: (seedCategory as QuestionCategory) ?? 'General',
      updatedAt: new Date().toISOString(),
    })
    setNoteMessage('')
  }
  const editDraft = (patch: Partial<Note>) => {
    const next = { ...draft, ...patch }
    setDraft(next)
    rememberNote(next.id)
    setNoteMessage('')
    if (next.title.trim() || next.body.trim() || notes.some((note) => note.id === next.id)) autosave.schedule(next)
  }
  const selectedSavedNote = notes.find((note) => note.id === draft.id)
  const isSaved = selectedSavedNote?.title === draft.title && selectedSavedNote?.body === draft.body && selectedSavedNote?.category === draft.category
  const saveStatus = isSaved ? (syncStatus === 'error' || syncStatus === 'offline' ? 'Saved on this device · Cloud sync unavailable' : syncStatus === 'syncing' ? 'Saved on this device · Syncing…' : 'Saved on this device') : draft.title || draft.body ? 'Saving…' : 'Changes save automatically'
  const draftHasContent = Boolean(draft.title.trim() || draft.body.trim())
  const saveDraft = () => {
    if (!draftHasContent) {
      setNoteMessage('Add a title or body before saving this note.')
      return false
    }
    autosave.schedule({ ...draft, updatedAt: new Date().toISOString() })
    autosave.flush()
    rememberNote(draft.id)
    setNoteMessage('Note saved.')
    return true
  }
  const quizDraftTopic = () => {
    autosave.flush()
    if (draft.category === 'General') {
      navigate('/practice-questions')
      return
    }
    const sessionIsOpen = isActiveSessionOpen(activeSession)
    if (!(sessionIsOpen && activeSession?.mode === 'practice')) {
      startPracticeSession({
        category: draft.category,
        difficulty: 'adaptive',
        format: 'mixed',
        questionCount: 10,
      })
    }
    navigate('/practice-questions')
  }

  const filteredNotes = useMemo(() => {
    return notes.filter((note) => {
      const matchesCategory = selectedCategory === 'All' || note.category === selectedCategory
      const matchesSearch =
        deferredSearch.length === 0 ||
        note.title.toLowerCase().includes(deferredSearch.toLowerCase()) ||
        note.body.toLowerCase().includes(deferredSearch.toLowerCase())
      return matchesCategory && matchesSearch
    })
  }, [deferredSearch, notes, selectedCategory])

  return (
    <section className="reference-page notes-workspace">
      <h1>Notes</h1>
      <div className={`reference-notebook note-view-${mobileView}`}>
        <button type="button" className="reference-mobile-back" onClick={() => { autosave.flush(); setMobileView('list') }}>← Your notes</button>
        <aside className="reference-note-list" aria-label="Your notes">
          <button type="button" className="simple-study-primary" onClick={resetDraft}>New note</button>
          <label className="reference-search">Search notes<input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search your notes" className={inputClass} /></label>
          <details className="reference-options"><summary>Filter by category</summary>
            <select aria-label="Category filter" value={selectedCategory} onChange={(event) => setSelectedCategory(event.target.value)} className={selectClass}>
              <option value="All">All categories</option><option value="General">General</option>
              {trackCategories.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </details>
          <div className="reference-note-entries">
            {filteredNotes.map((note) => <button key={note.id} type="button" aria-pressed={draft.id === note.id} onClick={() => { autosave.flush(); setDraft(note); rememberNote(note.id); setMobileView('editor'); setNoteMessage('') }}>
              <strong>{note.title || 'Untitled note'}</strong><span>{note.category}</span>
            </button>)}
            {!filteredNotes.length ? <p className="reference-muted">No notes yet in this view.</p> : null}
          </div>
        </aside>
        <form className="reference-note-editor" onSubmit={(event) => { event.preventDefault(); saveDraft() }}>
          <label>Note title<input value={draft.title} onChange={(event) => editDraft({ title: event.target.value })} placeholder="Give your note a title" className={inputClass} /></label>
          <label>Category<select value={draft.category} onChange={(event) => editDraft({ category: event.target.value as Note['category'] })} className={selectClass}>
            <option value="General">General</option>{trackCategories.map((item) => <option key={item} value={item}>{item}</option>)}
          </select></label>
          <label className="reference-note-body">Note content<textarea value={draft.body} onChange={(event) => editDraft({ body: event.target.value })} placeholder="Write your notes here..." className={textareaClass} /></label>
          <div className="reference-editor-actions">
            <span className="reference-save-status" role="status" aria-live="polite">{saveStatus}</span>
            {notes.some((note) => note.id === draft.id) ? <button type="button" className="nclex-btn-secondary" onClick={() => { autosave.flush(); deleteNote(draft.id); resetDraft(); setNoteMessage('Note deleted.') }}>Delete</button> : null}
            <button type="button" className="reference-text-button" onClick={quizDraftTopic}>Practice this topic</button>
          </div>
          <p className="reference-muted" role="status" aria-live="polite">{noteMessage}</p>
        </form>
      </div>
    </section>
  )
}

export function SettingsPage() {
  const profile = useStudySystemStore((state) => state.profile)
  const authUser = useStudySystemStore((state) => state.authUser)
  const authConfigured = useStudySystemStore((state) => state.authConfigured)
  const isDemoMode = useStudySystemStore((state) => state.isDemoMode)
  const syncStatus = useStudySystemStore((state) => state.syncStatus)
  const syncError = useStudySystemStore((state) => state.syncError)
  const updateProfile = useStudySystemStore((state) => state.updateProfile)
  const syncNow = useStudySystemStore((state) => state.syncNow)
  const signOut = useStudySystemStore((state) => state.signOut)
  const resetProgress = useStudySystemStore((state) => state.resetProgress)
  const profilePhotoInputRef = useRef<HTMLInputElement | null>(null)
  const [profilePhotoMessage, setProfilePhotoMessage] = useState('')
  const [resetConfirmationOpen, setResetConfirmationOpen] = useState(false)
  const [accountMessage, setAccountMessage] = useState('')
  const profileInitials = getProfileInitials(profile.name)

  const handleProfilePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.currentTarget.value = ''
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setProfilePhotoMessage('Choose an image file.')
      return
    }

    try {
      const imageDataUrl = await createProfileImageDataUrl(file)
      updateProfile({ profileImageDataUrl: imageDataUrl })
      setProfilePhotoMessage('Profile picture updated.')
    } catch (error) {
      setProfilePhotoMessage(error instanceof Error ? error.message : 'Could not read that image.')
    }
  }

  return (
    <PageStack>
      <PageHeader
        eyebrow="Settings"
        title="Profile and settings"
        description="Manage your exam track, study preferences, and cloud sync status from one place."
      />
      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <Surface className="border-cyan-200/18 bg-cyan-300/[0.045]">
          <SectionHeading
            title="Profile"
            description="Your visible learner identity, exam lane, and study cadence."
          />
          <div className="mt-6 grid gap-4">
            <div className="rounded-[20px] border border-cyan-200/16 bg-[#031426]/72 p-4">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                  <div className="relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-cyan-300/30 bg-[linear-gradient(135deg,rgba(34,211,238,0.32),rgba(168,85,247,0.2)_45%,rgba(3,20,38,0.95))] text-xl font-bold text-white shadow-[0_12px_28px_rgba(43,148,255,0.22)]">
                    {profile.profileImageDataUrl ? (
                      <img src={profile.profileImageDataUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <>
                        <UserRound className="absolute h-11 w-11 text-cyan-100/18" />
                        <span className="relative z-10">{profileInitials}</span>
                      </>
                    )}
                  </div>
                  <div>
                    <p className="font-semibold text-white">Profile picture</p>
                    <p className="mt-1 text-sm leading-6 text-sky-100/64">
                      Shows on the Home title screen and account menu.
                    </p>
                    {profile.memberNumber ? (
                      <span className="mt-3 inline-flex items-center gap-2 rounded-full border border-amber-200/28 bg-amber-300/[0.08] px-3 py-1.5 text-xs font-bold text-amber-100">
                        <BadgeCheck className="h-4 w-4" />
                        Founding learner #{profile.memberNumber}
                      </span>
                    ) : null}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <input
                    ref={profilePhotoInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(event) => void handleProfilePhotoUpload(event)}
                  />
                  <button
                    type="button"
                    onClick={() => profilePhotoInputRef.current?.click()}
                    className="nclex-btn-primary inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold"
                  >
                    <UploadCloud className="h-4 w-4" />
                    Upload
                  </button>
                  {profile.profileImageDataUrl ? (
                    <button
                      type="button"
                      onClick={() => {
                        updateProfile({ profileImageDataUrl: undefined })
                        setProfilePhotoMessage('Profile picture removed.')
                      }}
                      className="nclex-btn-secondary inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold"
                    >
                      <Trash2 className="h-4 w-4" />
                      Remove
                    </button>
                  ) : null}
                </div>
              </div>
              {profilePhotoMessage ? (
                <p role="status" aria-live="polite" className="mt-3 rounded-xl border border-cyan-200/18 bg-cyan-300/[0.06] px-3 py-2 text-sm font-semibold text-cyan-100">
                  {profilePhotoMessage}
                </p>
              ) : null}
            </div>
            <Field label="Display name">
              <input value={profile.name} onChange={(event) => updateProfile({ name: event.target.value })} className={inputClass} />
            </Field>
            <Field label="College">
              <input
                value={profile.nursingSchool ?? ''}
                onChange={(event) => updateProfile({ nursingSchool: event.target.value })}
                placeholder="Optional"
                className={inputClass}
              />
            </Field>
            <Field label="State">
              <input
                value={profile.state ?? ''}
                onChange={(event) => updateProfile({ state: event.target.value })}
                placeholder="Optional"
                className={inputClass}
              />
            </Field>
            <Field label="Exam track">
              <select
                value={profile.examTrack ?? 'nclex-rn'}
                onChange={(event) => updateProfile({ examTrack: event.target.value as ExamTrackId })}
                className={selectClass}
              >
                {examTracks.map((track) => (
                  <option key={track.id} value={track.id}>
                    {track.shortName} - {track.title}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Daily goal">
              <input type="number" min={5} max={40} value={profile.dailyGoal} onChange={(event) => updateProfile({ dailyGoal: Number(event.target.value) })} className={inputClass} />
            </Field>
            <ToggleRow label="Show in people search" description="Let other learners find your name card." checked={profile.directoryVisible ?? true} onChange={(value) => updateProfile({ directoryVisible: value })} />
            <ToggleRow label="Reduced motion" description="Simplify motion if you prefer a calmer UI." checked={profile.preferences.reducedMotion} onChange={(value) => updateProfile({ preferences: { ...profile.preferences, reducedMotion: value } })} />
            <ToggleRow label="Study reminders" description="Choose whether Nurse Command may send study reminders when delivery is enabled." checked={profile.preferences.notifications} onChange={(value) => updateProfile({ preferences: { ...profile.preferences, notifications: value } })} />
          </div>
        </Surface>
        <Surface className="border-violet-200/18 bg-violet-300/[0.045]">
          <SectionHeading
            title="Account"
            description="Cloud sync, beta account status, privacy, and support."
          />
          <div className="mt-5 rounded-[20px] border border-cyan-200/16 bg-[#031426]/72 p-5">
            <div className="flex items-start gap-4">
              <div className="rounded-2xl border border-cyan-200/18 bg-cyan-300/[0.08] p-3 text-cyan-100">
                {isDemoMode ? <CloudOff className="h-5 w-5" /> : <Cloud className="h-5 w-5" />}
              </div>
              <div aria-live="polite">
                <p className="font-semibold text-white">
                  {authUser ? authUser.email : authConfigured ? 'Local demo mode' : 'Supabase not configured'}
                </p>
                <p className="mt-1 text-sm leading-6 text-sky-100/64">
                  {authUser
                    ? `Cloud sync is ${syncStatus === 'syncing' ? 'running' : syncStatus}.`
                    : authConfigured
                      ? 'Sign in from the account screen to sync progress across devices.'
                      : 'Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to enable production accounts.'}
                </p>
                {syncError ? (
                  <p className="mt-2 rounded-xl border border-[#ffd1d1] bg-[var(--nclex-danger-soft)] px-3 py-2 text-sm text-[var(--nclex-danger)]">
                    {syncError}
                  </p>
                ) : null}
              </div>
            </div>
            <div className="mt-5 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => void syncNow()}
                disabled={!authUser}
                className="nclex-btn-primary inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50"
              >
                <RefreshCw className="h-4 w-4" />
                Sync now
              </button>
              {authUser ? (
                <button
                  type="button"
                  onClick={() => void signOut()}
                  className="rounded-xl border border-rose-200/25 bg-rose-300/[0.08] px-4 py-2.5 text-sm font-semibold text-rose-100 transition hover:bg-rose-300/14"
                >
                  Sign out
                </button>
              ) : null}
            </div>
          </div>
          <div className="mt-7 rounded-[20px] border border-violet-200/18 bg-violet-300/[0.06] p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-violet-200/72">Current access</p>
                <h3 className="mt-2 nc-section-title text-2xl text-white">Open beta access</h3>
                <p className="mt-2 max-w-xl text-sm leading-6 text-sky-100/64">
                  Nurse Command is currently free during open beta. Paid plan controls are not active in this build.
                </p>
              </div>
              <Link
                to="/pricing"
                className="nclex-btn-secondary inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold"
              >
                View access details
                <ExternalLink className="h-4 w-4" />
              </Link>
            </div>
          </div>
          <h3 className="mt-7 nc-section-title text-2xl text-white">Account capabilities</h3>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <FeatureCallout title="User accounts" description="Supabase Auth now provides real account sessions and password recovery entry points." />
            <FeatureCallout title="Saved progress" description="Attempts, flashcards, notes, materials, and generated study tools can sync to Postgres." />
            <FeatureCallout title="Beta access" description="Open beta features can change as the product stabilizes and feedback comes in." />
            <FeatureCallout title="Retention hooks" description="Quick Study, streaks, weak-area review, and notes already support daily return behavior." />
          </div>
          <h3 className="mt-7 nc-section-title text-2xl text-white">Privacy, terms & support</h3>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <FeatureCallout title="Privacy" description="Cloud accounts store your email and synced study activity. Do not upload protected health information or patient-identifying material." />
            <FeatureCallout title="Terms" description="Nurse Command is practice study support only. Readiness and adaptive signals are practice evidence, not clinical advice or licensure guarantees." />
            <FeatureCallout title="Support" description="For account, email, or study-material issues, contact support@nursecommand.com." />
          </div>
          <div className="mt-7 border-t border-rose-200/16 pt-6">
            <h3 className="nc-section-title text-xl text-white">Local data controls</h3>
            <p className="mt-2 text-sm leading-6 text-sky-100/64">
              Resetting removes local study progress from this browser. Cloud account data is not deleted here.
            </p>
            {resetConfirmationOpen ? (
              <div
                role="alertdialog"
                aria-labelledby="reset-progress-title"
                aria-describedby="reset-progress-description"
                className="mt-4 rounded-[18px] border border-rose-200/28 bg-rose-300/[0.08] p-4"
              >
                <h4 id="reset-progress-title" className="font-semibold text-white">Reset local study progress?</h4>
                <p id="reset-progress-description" className="mt-2 text-sm leading-6 text-rose-100/78">
                  This cannot be undone from this device. Your account and cloud records remain intact.
                </p>
                <div className="mt-4 flex flex-wrap gap-3">
                  <button
                    type="button"
                    autoFocus
                    onClick={() => setResetConfirmationOpen(false)}
                    className="nclex-btn-secondary min-h-11 rounded-xl px-4 py-2.5 text-sm font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      resetProgress()
                      setResetConfirmationOpen(false)
                      setAccountMessage('Local study progress reset on this device.')
                    }}
                    className="min-h-11 rounded-xl border border-rose-200/30 bg-rose-400/16 px-4 py-2.5 text-sm font-semibold text-rose-100 transition hover:bg-rose-400/24"
                  >
                    Confirm reset
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setAccountMessage('')
                  setResetConfirmationOpen(true)
                }}
                className="mt-4 min-h-11 rounded-xl border border-rose-200/25 bg-rose-300/[0.08] px-4 py-2.5 text-sm font-semibold text-rose-100 transition hover:bg-rose-300/14"
              >
                Reset local progress
              </button>
            )}
            {accountMessage ? (
              <p role="status" aria-live="polite" className="mt-4 text-sm font-semibold text-emerald-200">
                {accountMessage}
              </p>
            ) : null}
          </div>
        </Surface>
      </div>
    </PageStack>
  )
}

function MaterialQuizRunner() {
  const navigate = useNavigate()
  const activeMaterialQuizSession = useStudySystemStore((state) => state.activeMaterialQuizSession)
  const materialQuestions = useStudySystemStore((state) => state.materialQuestions)
  const materials = useStudySystemStore((state) => state.materials)
  const submitMaterialQuizResponse = useStudySystemStore((state) => state.submitMaterialQuizResponse)
  const nextMaterialQuizQuestion = useStudySystemStore((state) => state.nextMaterialQuizQuestion)
  const previousMaterialQuizQuestion = useStudySystemStore((state) => state.previousMaterialQuizQuestion)
  const finishMaterialQuiz = useStudySystemStore((state) => state.finishMaterialQuiz)
  const abandonMaterialQuiz = useStudySystemStore((state) => state.abandonMaterialQuiz)
  const startMaterialFlashcards = useStudySystemStore((state) => state.startMaterialFlashcards)
  const [draftSelections, setDraftSelections] = useState<Record<string, string[]>>({})

  const material = materials.find((item) => item.id === activeMaterialQuizSession?.materialId) ?? null
  const currentQuestion = activeMaterialQuizSession
    ? materialQuestions.find(
        (item) => item.id === activeMaterialQuizSession.questionIds[activeMaterialQuizSession.currentIndex],
      ) ?? null
    : null
  const currentResponse = activeMaterialQuizSession && currentQuestion
    ? activeMaterialQuizSession.responses.find((item) => item.questionId === currentQuestion.id) ?? null
    : null

  if (!activeMaterialQuizSession) {
    return null
  }

  if (activeMaterialQuizSession.endedAt) {
    const score = Math.round((activeMaterialQuizSession.score ?? 0) * 100)

    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow="Imported Material Quiz"
          title="Your material review is complete."
          description="This quiz stayed separate from your adaptive NCLEX scoring. Use it to reinforce the content you uploaded without polluting your core analytics."
        />
        <Surface className="overflow-hidden p-0">
          <div className="grid gap-6 bg-[linear-gradient(135deg,#ffffff_0%,#eef5ff_100%)] px-5 py-6 md:grid-cols-[1fr_auto] md:items-center md:px-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--nclex-blue)]">
                Session Summary
              </p>
              <h3 className="mt-3 nc-section-title text-4xl text-[var(--nclex-text)]">{score}% correct</h3>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--nclex-text-muted)]">
                {material
                  ? `You completed ${activeMaterialQuizSession.questionIds.length} questions from ${material.displayTitle}.`
                  : 'You completed a material-based review session.'}
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <MetricChip label="Questions" value={`${activeMaterialQuizSession.questionIds.length}`} />
              <MetricChip
                label="Correct"
                value={`${activeMaterialQuizSession.responses.filter((item) => item.isCorrect).length}`}
              />
            </div>
          </div>
        </Surface>
        <div className="flex flex-wrap gap-3">
          {material ? (
            <button
              type="button"
              onClick={() => {
                startMaterialFlashcards(material.id)
                navigate(`/flashcards?materialId=${encodeURIComponent(material.id)}`)
                abandonMaterialQuiz()
              }}
              className="nclex-btn-primary inline-flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold"
            >
              <Sparkles className="h-4 w-4" />
              Review generated flashcards
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => {
              abandonMaterialQuiz()
              navigate('/my-materials')
            }}
            className="nclex-btn-secondary inline-flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold"
          >
            Back to Study Library
          </button>
        </div>
      </div>
    )
  }

  if (!currentQuestion) {
    return (
      <EmptyState
        title="This material quiz has no available questions."
        description="Go back to Your Study Library and regenerate the study tools for this file."
      />
    )
  }

  const progress =
    (activeMaterialQuizSession.currentIndex + 1) / Math.max(1, activeMaterialQuizSession.questionIds.length)
  const isSubmitted = Boolean(currentResponse)
  const correctChoiceId = currentQuestion.correctAnswer[0]
  const selectedAnswer = currentResponse?.selectedAnswer ?? draftSelections[currentQuestion.id] ?? []

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => {
            abandonMaterialQuiz()
            navigate('/my-materials')
          }}
          className="inline-flex items-center gap-2 rounded-xl border border-cyan-200/20 bg-white/[0.045] px-4 py-2.5 text-sm font-semibold text-cyan-100 transition hover:border-cyan-200/45 hover:bg-cyan-300/10"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Study Library
        </button>
        <span className="nclex-chip nclex-chip-info">
          Question {activeMaterialQuizSession.currentIndex + 1} of {activeMaterialQuizSession.questionIds.length}
        </span>
      </div>

      <Surface>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--nclex-blue)]">
              Study From Your Material
            </p>
            <h3 className="mt-2 nc-section-title text-3xl text-[var(--nclex-text)]">
              {material?.displayTitle ?? activeMaterialQuizSession.title}
            </h3>
          </div>
          <div className="min-w-[180px]">
            <ProgressBar value={progress} />
          </div>
        </div>

        <div className="mt-6 rounded-[20px] border border-[var(--nclex-border)] bg-[var(--nclex-card-muted)] p-5">
          <p className="text-sm leading-7 text-[var(--nclex-text)]">{currentQuestion.prompt}</p>
        </div>

        <div className="mt-5 space-y-3">
          {currentQuestion.choices.map((choice) => {
            const isSelected = selectedAnswer.includes(choice.id)
            const isCorrect = correctChoiceId === choice.id
            const isWrongSelection =
              isSubmitted && isSelected && !isCorrect

            return (
              <button
                key={choice.id}
                type="button"
                disabled={isSubmitted}
                onClick={() =>
                  setDraftSelections((current) => ({
                    ...current,
                    [currentQuestion.id]: [choice.id],
                  }))
                }
                className={clsx(
                  'w-full rounded-[20px] border p-4 text-left transition',
                  isSubmitted && isCorrect
                    ? 'border-emerald-300 bg-emerald-50'
                    : isWrongSelection
                      ? 'border-rose-300 bg-rose-50'
                      : isSelected
                        ? 'border-[#93c5fd] bg-[var(--nclex-blue-soft)]'
                        : 'border-[var(--nclex-border)] bg-white hover:border-[#c9dbef]',
                )}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={clsx(
                      'mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full border text-xs font-semibold',
                      isSubmitted && isCorrect
                        ? 'border-emerald-400 bg-emerald-500 text-white'
                        : isWrongSelection
                          ? 'border-rose-400 bg-rose-500 text-white'
                          : isSelected
                            ? 'border-[var(--nclex-blue)] bg-[var(--nclex-blue)] text-white'
                            : 'border-[var(--nclex-border)] bg-white text-[var(--nclex-text-muted)]',
                    )}
                  >
                    {isSubmitted && isCorrect ? <CheckCircle2 className="h-4 w-4" /> : choice.id}
                  </div>
                  <p className="text-sm leading-7 text-[var(--nclex-text)]">{choice.text}</p>
                </div>
              </button>
            )
          })}
        </div>

        {isSubmitted ? (
          <div className="mt-5 rounded-[20px] border border-[var(--nclex-border)] bg-white p-5">
            <div className="flex items-start gap-3">
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--nclex-blue-soft)] text-[var(--nclex-blue)]">
                <FileText className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold text-[var(--nclex-text)]">Generated rationale</p>
                <p className="mt-2 text-sm leading-7 text-[var(--nclex-text-muted)]">
                  {currentQuestion.rationale}
                </p>
              </div>
            </div>
          </div>
        ) : null}

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={previousMaterialQuizQuestion}
              disabled={activeMaterialQuizSession.currentIndex === 0}
              className="inline-flex items-center gap-2 rounded-xl border border-[var(--nclex-border)] bg-white px-4 py-3 text-sm font-semibold text-[var(--nclex-text-secondary)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </button>
            <button
              type="button"
              disabled={isSubmitted || !selectedAnswer.length}
              onClick={() => submitMaterialQuizResponse(currentQuestion.id, selectedAnswer)}
              className="nclex-btn-primary inline-flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50"
            >
              Submit answer
            </button>
          </div>
          <div className="flex flex-wrap gap-3">
            {activeMaterialQuizSession.currentIndex === activeMaterialQuizSession.questionIds.length - 1 ? (
              <button
                type="button"
                disabled={!isSubmitted}
                onClick={finishMaterialQuiz}
                className="nclex-btn-secondary inline-flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50"
              >
                Finish session
              </button>
            ) : (
              <button
                type="button"
                disabled={!isSubmitted}
                onClick={nextMaterialQuizQuestion}
                className="nclex-btn-secondary inline-flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50"
              >
                Next question
                <ChevronRight className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </Surface>
    </div>
  )
}

function getProfileInitials(name: string) {
  const initials = name
    .split(' ')
    .slice(0, 2)
    .map((item) => item[0]?.toUpperCase())
    .join('')

  return initials || 'NC'
}

function createProfileImageDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('Could not read that image.'))
    reader.onload = () => {
      const image = new Image()
      image.onerror = () => reject(new Error('Could not load that image.'))
      image.onload = () => {
        const maxSize = 320
        const scale = Math.min(1, maxSize / Math.max(image.width, image.height))
        const width = Math.max(1, Math.round(image.width * scale))
        const height = Math.max(1, Math.round(image.height * scale))
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const context = canvas.getContext('2d')
        if (!context) {
          reject(new Error('Could not prepare that image.'))
          return
        }
        context.drawImage(image, 0, 0, width, height)
        resolve(canvas.toDataURL('image/jpeg', 0.82))
      }
      image.src = String(reader.result)
    }
    reader.readAsDataURL(file)
  })
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-sky-100/62">{label}</p>
      {children}
    </label>
  )
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string
  description: string
  checked: boolean
  onChange: (checked: boolean) => void
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-[18px] border border-cyan-200/16 bg-white/[0.045] p-4">
      <div>
        <p className="font-semibold text-white">{label}</p>
        <p className="mt-1 text-sm leading-6 text-sky-100/64">{description}</p>
      </div>
      <button
        type="button"
        aria-pressed={checked}
        onClick={() => onChange(!checked)}
        className={clsx('relative inline-flex h-7 w-12 rounded-full transition', checked ? 'bg-cyan-400' : 'bg-slate-600')}
      >
        <span className={clsx('absolute top-1 h-5 w-5 rounded-full bg-white transition', checked ? 'left-6' : 'left-1')} />
      </button>
    </div>
  )
}

function FeatureCallout({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-[18px] border border-cyan-200/16 bg-white/[0.045] p-4">
      <p className="font-semibold text-white">{title}</p>
      <p className="mt-2 text-sm leading-6 text-sky-100/64">{description}</p>
    </div>
  )
}


function InsightRow({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="rounded-[18px] bg-[var(--nclex-card-muted)] p-4">
      <div className="flex items-center gap-3">
        {icon}
        <p className="font-semibold text-[var(--nclex-text)]">{title}</p>
      </div>
      <p className="mt-2 text-sm leading-6 text-[var(--nclex-text-muted)]">{body}</p>
    </div>
  )
}

function shortCategoryLabel(category: string) {
  return category
    .replace('Leadership / Prioritization / Delegation', 'Leadership')
    .replace('Adult Health / Med-Surg', 'Med Surg')
    .replace('Lab Values / Clinical Judgment', 'Clinical Judgment')
}

function formatEngineDimensionLabel(value?: string) {
  if (!value) return 'Not enough signal yet'
  const cleanValue = value.includes(':') ? value.split(':').slice(1).join(':') : value
  return formatEngineReasonLabel(cleanValue)
}

function formatEngineReasonLabel(value?: string) {
  if (!value) return 'evidence'
  return value
    .replaceAll('_', ' ')
    .replaceAll('-', ' ')
    .split(' ')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

function formatMinutes(minutes: number) {
  if (minutes <= 0) return '0m'
  const hours = Math.floor(minutes / 60)
  const remainder = minutes % 60
  if (!hours) return `${remainder}m`
  return `${hours}h ${remainder}m`
}

function buildMaterialStudyGuide(material: StudyMaterial) {
  const assets = material.assets.length
    ? material.assets
    : [{ title: 'Overview', content: material.preview, id: 'preview', materialId: material.id, order: 0 }]
  const sentences = assets
    .flatMap((asset) => asset.content.split(/(?<=[.?!])\s+/).map((sentence) => sentence.trim()))
    .filter((sentence) => sentence.length > 40)
  const summary = sentences.slice(0, 3).join(' ') || material.preview || 'This material is ready for focused review.'
  const outline = assets.slice(0, 8).map((asset) => {
    const firstSentence = asset.content.split(/(?<=[.?!])\s+/)[0]?.trim() || asset.content.slice(0, 140)
    return `${asset.title}: ${firstSentence}`
  })
  const keyTerms = Array.from(
    new Set(
      [
        ...material.tags,
        ...assets.flatMap((asset) =>
          asset.content
            .split(/\s*[-\u2022]\s*|\n/)
            .filter((item) => item.includes(':'))
            .map((item) => item.split(':')[0]?.trim())
            .filter(Boolean),
        ),
        ...(material.sourceCategory ? [material.sourceCategory] : []),
      ].filter((term): term is string => Boolean(term && term.length > 2)),
    ),
  ).slice(0, 10)

  return {
    summary,
    outline: outline.length ? outline : ['Review the extracted text, then use generated questions to test recall.'],
    keyTerms: keyTerms.length ? keyTerms : ['priority concepts', 'nursing interventions', 'safety cues'],
  }
}

function formatImportDate(value: string) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(value))
}

const inputClass =
  'nclex-input w-full rounded-xl px-4 py-3 text-sm outline-none transition'
const selectClass = inputClass
const textareaClass = `${inputClass} min-h-[220px]`
