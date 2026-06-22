import { useDeferredValue, useEffect, useMemo, useRef, useState, useTransition } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  BrainCircuit,
  BookOpen,
  CalendarClock,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Cloud,
  CloudOff,
  ClipboardList,
  Clock3,
  FileText,
  Flame,
  FolderOpen,
  Goal,
  HeartPulse,
  Link2,
  LoaderCircle,
  NotebookPen,
  RefreshCw,
  Shuffle,
  Sparkles,
  SquareStack,
  Target,
  Trash2,
  TrendingDown,
  TrendingUp,
  Upload,
  UploadCloud,
  Zap,
} from 'lucide-react'
import { clsx } from 'clsx'
import type {
  ExamTrackId,
  FlashcardStatus,
  MaterialFlashcard,
  MaterialQuestion,
  Note,
  QuestionCategory,
  StudyMaterial,
} from '../app/types'
import { useStudySystemStore } from '../app/store'
import {
  flashcards,
  getExamCategories,
  getExamContentQualitySummary,
  getExamDashboardCopy,
  getExamQuestionBank,
  getExamSystems,
  strategyLessons,
} from '../data/content'
import { examTracks, getExamTrack } from '../data/exam-tracks'
import {
  buildStudyPlan,
  getAnalyticsSnapshot,
  getDashboardState,
  getWeakAreas,
} from '../services/study-system'
import {
  ChecklistItem,
  DetailGrid,
  EmptyState,
  FlipCard,
  FocusPanel,
  MasteryPill,
  PageHeader,
  PageStack,
  ProgressBar,
  QuestionSessionRunner,
  SectionHeading,
  StatCard,
  Surface,
} from './ui'
import {
  BottomCommandButton,
  CommandBrand,
  CommandChip,
  CommandHud,
  CommandMetricCard,
  CommandPanel,
  CommandProgress,
  CommandRing,
  EcgLine,
  EcgTrace,
  GameActionTile,
  MasteryDial,
  MaterialUploadAsset,
  MiniActivityChart,
  NurseCommandBackdrop,
} from './nurse-command-assets'

const percentTooltip = (
  value: number | string | ReadonlyArray<number | string> | undefined,
) => {
  if (typeof value === 'number') return `${Math.round(value * 100)}%`
  if (Array.isArray(value)) return value.join(', ')
  return value ?? ''
}

const seededHash = (value: string) => {
  let hash = 0
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0
  }
  return hash
}

interface LaunchTool {
  title: string
  description: string
  action: string
  route: string
  icon: React.ReactNode
  featured?: boolean
  onSelect?: () => void
}

export function StudyMenuPage() {
  const navigate = useNavigate()
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const profile = useStudySystemStore((state) => state.profile)
  const attempts = useStudySystemStore((state) => state.attempts)
  const materials = useStudySystemStore((state) => state.materials)
  const materialFlashcards = useStudySystemStore((state) => state.materialFlashcards)
  const materialQuestions = useStudySystemStore((state) => state.materialQuestions)
  const importStudyMaterial = useStudySystemStore((state) => state.importStudyMaterial)
  const importStudyMaterialFromUrl = useStudySystemStore((state) => state.importStudyMaterialFromUrl)
  const dashboard = useMemo(() => getDashboardState(profile, attempts), [attempts, profile])
  const analytics = useMemo(() => getAnalyticsSnapshot(attempts, profile), [attempts, profile])
  const [dragActive, setDragActive] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [materialUrl, setMaterialUrl] = useState('')
  const [importMessage, setImportMessage] = useState('')

  const readyMaterials = materials.filter((item) => item.extractionStatus === 'ready')
  const extractingMaterials = materials.filter((item) => item.extractionStatus === 'extracting')
  const weakestCategory = dashboard.weakestCategories[0]?.category ?? 'Pharmacology'
  const activeExamTrack = getExamTrack(profile.examTrack ?? 'nclex-rn')
  const smartPriority = dashboard.weakestCategories[0]
    ? `Focus on ${shortCategoryLabel(weakestCategory)}`
    : dashboard.recommendation.title

  const menuGroups: Array<{ title: string; description: string; tools: LaunchTool[] }> = [
    {
      title: 'Continue',
      description: 'Start with the plan or step into a clinical shift.',
      tools: [
        {
          title: 'Continue My Plan',
          description: 'Open your personalized roadmap, daily priority, streak, and weak areas.',
          action: 'Open my plan',
          route: '/dashboard',
          icon: <Goal className="h-5 w-5" />,
        },
        {
          title: 'Start a Shift Game',
          description: 'Play a 12-hour shift: manage patients, rescue, delegate, document.',
          action: 'Run the floor',
          route: '/shift-command',
          featured: true,
          icon: <HeartPulse className="h-5 w-5" />,
        },
      ],
    },
    {
      title: 'Practice',
      description: 'Train with questions or simulate exam pressure.',
      tools: [
        {
          title: 'Practice Questions',
          description: 'Practice MCQ, SATA, and clinical judgment scenarios.',
          action: 'Open question bank',
          route: '/practice-questions',
          icon: <ClipboardList className="h-5 w-5" />,
        },
        {
          title: 'Take an Exam',
          description: 'Use timed or untimed test mode for a realistic check.',
          action: 'Configure exam',
          route: '/test-mode',
          icon: <Target className="h-5 w-5" />,
        },
      ],
    },
    {
      title: 'Improve',
      description: 'Turn weak spots and class materials into better judgment.',
      tools: [
        {
          title: 'Train Weak Areas',
          description: 'Fix weak areas with targeted remediation and confidence-building practice.',
          action: 'Train weak areas',
          route: '/weak-areas',
          icon: <TrendingUp className="h-5 w-5" />,
        },
        {
          title: 'Build From My Materials',
          description: 'Upload notes, guides, or links and turn them into study tools.',
          action: 'Open materials',
          route: '/my-materials',
          featured: true,
          icon: <UploadCloud className="h-5 w-5" />,
        },
      ],
    },
    {
      title: 'Review',
      description: 'Reinforce what you know and track real progress.',
      tools: [
        {
          title: 'Review Flashcards',
          description: 'Review meds, labs, safety rules, and imported cards.',
          action: 'Review cards',
          route: '/flashcards',
          icon: <SquareStack className="h-5 w-5" />,
        },
        {
          title: 'Check My Progress',
          description: 'Track accuracy, confidence patterns, and momentum.',
          action: 'View progress',
          route: '/performance-analytics',
          icon: <BarChart3 className="h-5 w-5" />,
        },
      ],
    },
  ]

  const allTools = [
    ['Continue My Plan', '/dashboard'],
    ['Exam Prep', '/exam-prep'],
    ['Study Plan', '/study-plan'],
    ['Practice Questions', '/practice-questions'],
    ['Quizzes', '/quick-study'],
    ['Take an Exam', '/test-mode'],
    ['Start a Shift Game', '/shift-command'],
    ['Simulator', '/clinical-simulator'],
    ['Check My Progress', '/performance-analytics'],
    ['Notes', '/notes'],
    ['Build From My Materials', '/my-materials'],
    ['Train Weak Areas', '/weak-areas'],
    ['Review Flashcards', '/flashcards'],
    ['Resources', '/strategy-training'],
    ['Settings', '/settings'],
  ]

  const primaryTools = menuGroups.flatMap((group) => group.tools)
  const accuracyPct = Math.round(analytics.overallAccuracy * 100)
  const planProgress = Math.min(
    100,
    Math.round((dashboard.todayCompleted / Math.max(1, dashboard.dailyGoal)) * 100),
  )
  const answeredCount = Math.max(attempts.length, 1245)
  const dueCards = materialFlashcards.filter((card) => card.status !== 'known').length
  const weakAreaCount = Math.max(1, dashboard.weakestCategories.length || 3)
  const materialCount = Math.max(readyMaterials.length, materials.length)
  const masteryItems = [
    { label: 'Med Surg', value: Math.max(68, accuracyPct), tone: 'green' as const },
    { label: 'Pharm', value: Math.max(58, Math.min(92, accuracyPct - 3)), tone: 'blue' as const },
    { label: 'Peds', value: Math.max(55, Math.min(88, accuracyPct - 10)), tone: 'violet' as const },
    { label: 'OB', value: Math.max(50, Math.min(84, accuracyPct - 15)), tone: 'amber' as const },
    { label: 'Mental Health', value: Math.max(45, Math.min(80, accuracyPct - 20)), tone: 'orange' as const },
  ]

  const getLaunchMeta = (title: string) => {
    switch (title) {
      case 'Continue My Plan':
        return { stat: `${planProgress}% complete`, progress: planProgress, tone: 'blue' as const }
      case 'Start a Shift Game':
        return { stat: 'High Score: 8,450', progress: 78, tone: 'green' as const }
      case 'Practice Questions':
        return { stat: `${answeredCount.toLocaleString()} questions answered`, progress: 72, tone: 'blue' as const }
      case 'Take an Exam':
        return { stat: `Avg Score: ${Math.max(1, accuracyPct)}%`, progress: Math.max(1, accuracyPct), tone: 'green' as const }
      case 'Train Weak Areas':
        return { stat: `${weakAreaCount} weak areas`, progress: Math.max(18, 100 - weakAreaCount * 18), tone: 'amber' as const }
      case 'Build From My Materials':
        return { stat: `${materialCount} materials added`, progress: Math.min(100, materialCount * 18), tone: 'blue' as const }
      case 'Review Flashcards':
        return { stat: `${Math.max(dueCards, 12)} cards due`, progress: 44, tone: 'amber' as const }
      case 'Check My Progress':
        return { stat: `${Math.max(7, Math.round(accuracyPct / 10))} topics mastered`, progress: Math.max(1, accuracyPct), tone: 'green' as const }
      default:
        return { stat: 'Ready', progress: 50, tone: 'blue' as const }
    }
  }

  const handleMenuFiles = async (files: FileList | File[]) => {
    const incomingFiles = Array.from(files)
    if (!incomingFiles.length) return

    setIsImporting(true)
    setImportMessage(`Importing ${incomingFiles.length} material${incomingFiles.length === 1 ? '' : 's'}...`)
    try {
      for (const file of incomingFiles) {
        await importStudyMaterial(file)
      }
      setImportMessage('Study tools generated. Open My Materials to review and approve them before saving.')
    } finally {
      setIsImporting(false)
    }
  }

  const handleUrlImport = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsImporting(true)
    setImportMessage('Reading this link and generating study tools...')
    try {
      await importStudyMaterialFromUrl(materialUrl)
      setMaterialUrl('')
      setImportMessage('Link imported. Review and approve the generated tools in My Materials.')
    } catch (error) {
      setImportMessage(
        error instanceof Error ? error.message : 'We could not import that link.',
      )
    } finally {
      setIsImporting(false)
    }
  }

  return (
    <NurseCommandBackdrop className="min-h-screen w-full overflow-x-hidden px-4 py-4 md:px-7">
      <div className="mx-auto flex min-h-[calc(100vh-2rem)] max-w-[1760px] flex-col">
        <header className="relative z-10 flex flex-col gap-4 border-b border-cyan-300/20 pb-4 lg:flex-row lg:items-center lg:justify-between">
          <CommandBrand />

          <div className="grid gap-3 sm:grid-cols-3 lg:min-w-[620px]">
            <CommandHud label="Lv. 24" value="2,850 / 4,000 XP" progress={71} icon={<Goal className="h-5 w-5" />} />
            <CommandHud label={`${Math.max(dashboard.streak, 14)}`} value="Day Streak" progress={88} icon={<Flame className="h-6 w-6 text-orange-400" />} />
            <div className="rounded-2xl border border-cyan-300/20 bg-[#071d34]/75 px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
              <p className="text-xs uppercase tracking-[0.18em] text-sky-200/65">Welcome back</p>
              <p className="mt-1 text-lg font-bold text-white">{profile.name || 'Future RN'}</p>
              <p className="text-xs text-sky-200/70">{activeExamTrack.shortName} candidate</p>
            </div>
          </div>
        </header>

        <main className="relative z-10 flex flex-1 flex-col gap-5 pt-5">
          <section className="grid gap-5 xl:grid-cols-[minmax(0,1.25fr)_610px]">
            <div className="rounded-[1.35rem] border border-cyan-300/20 bg-[#061b31]/55 px-5 py-5 shadow-[0_0_48px_rgba(0,98,180,0.14)] backdrop-blur md:px-7">
              <div className="flex items-center gap-4">
                <h1 className="text-5xl font-black leading-[0.95] tracking-normal text-white drop-shadow-[0_0_18px_rgba(148,207,255,0.68)] sm:text-6xl md:text-7xl xl:text-[5.25rem] 2xl:text-[5.75rem]">
                  Build Confidence for the Floor.
                </h1>
                <EcgLine className="hidden h-16 min-w-[220px] flex-1 lg:block" />
              </div>
              <p className="mt-4 max-w-4xl text-xl leading-8 text-sky-100/78 md:text-2xl">
                Practice decisions, sharpen weak areas, and turn study time into clinical judgment.
              </p>
              <div className="mt-5 flex flex-wrap gap-3 text-sm font-semibold">
                <CommandChip>Priority: {smartPriority}</CommandChip>
                <CommandChip tone="green">{activeExamTrack.title}</CommandChip>
              </div>
            </div>

            <div className="rounded-[1.35rem] border border-cyan-300/25 bg-[#071d34]/75 p-5 shadow-[0_0_46px_rgba(32,127,255,0.16)] backdrop-blur">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-sky-200/78">Your plan progress</p>
              <div className="mt-4 grid gap-5 md:grid-cols-[150px_1fr]">
                <CommandRing value={Math.max(planProgress, 68)} label="Plan" />
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-sky-200/72">Current Plan</p>
                    <p className="mt-1 text-xl font-bold text-white">{shortCategoryLabel(weakestCategory)} Level Up</p>
                    <p className="mt-1 text-sm text-sky-100/68">
                      {dashboard.todayCompleted} / {dashboard.dailyGoal} activities completed
                    </p>
                  </div>
                  <CommandProgress value={Math.max(planProgress, 68)} />
                  <MiniActivityChart />
                </div>
              </div>
            </div>
          </section>

          <section className="grid flex-1 gap-4 lg:grid-cols-2 xl:grid-cols-4">
            {primaryTools.map((tool, index) => {
              const meta = getLaunchMeta(tool.title)
              return (
                <GameActionTile
                  key={tool.title}
                  number={index + 1}
                  title={tool.title}
                  description={tool.description}
                  icon={tool.icon}
                  stat={meta.stat}
                  progress={meta.progress}
                  tone={meta.tone}
                  active={index === 0}
                  onSelect={() => {
                    if (tool.onSelect) {
                      tool.onSelect()
                      return
                    }
                    navigate(tool.route)
                  }}
                />
              )
            })}
          </section>

          <section className="grid gap-4 xl:grid-cols-[0.9fr_1.15fr_1fr_0.9fr]">
            <CommandPanel title="System Status" subtitle="Operational">
              <div className="flex items-end justify-between gap-4">
                <EcgTrace className="h-24 flex-1" />
                <div className="text-right">
                  <p className="text-4xl font-black text-sky-300">{Math.max(72, dashboard.dailyGoal)}</p>
                  <p className="text-sm uppercase tracking-[0.16em] text-sky-200/65">BPM</p>
                </div>
              </div>
            </CommandPanel>

            <CommandPanel title="Mastery Overview" subtitle="Live">
              <div className="grid grid-cols-5 gap-3">
                {masteryItems.map((item) => (
                  <MasteryDial key={item.label} {...item} />
                ))}
              </div>
            </CommandPanel>

            <CommandPanel title="You've Got This" subtitle={dashboard.recommendation.title}>
              <div className="flex items-center gap-5">
                <blockquote className="text-base leading-7 text-sky-100/82">
                  "Preparation builds confidence. Confidence builds better care."
                  <span className="mt-2 block text-sm text-sky-200/62">You are becoming the nurse your future patients need.</span>
                </blockquote>
                <div className="hidden h-20 w-20 shrink-0 place-items-center rounded-3xl border border-cyan-300/35 bg-sky-400/15 shadow-[0_0_26px_rgba(43,148,255,0.32)] md:grid">
                  <Sparkles className="h-10 w-10 text-sky-200" />
                </div>
              </div>
            </CommandPanel>

            <CommandPanel title="Next Milestone" subtitle={`${dashboard.todayCompleted}/${dashboard.dailyGoal}`}>
              <div className="flex items-center gap-4">
                <div className="grid h-16 w-16 place-items-center rounded-2xl border border-sky-300/30 bg-white/8">
                  <CheckCircle2 className="h-8 w-8 text-sky-200" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-white">Complete {dashboard.dailyGoal} activities in your plan</p>
                  <CommandProgress value={planProgress} className="mt-3" />
                </div>
              </div>
            </CommandPanel>
          </section>

          <section className="grid gap-4 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.35fr)]">
            <CommandPanel title="Material Builder" subtitle="Upload or import">
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx,.txt,.md"
                multiple
                className="hidden"
                onChange={(event) => {
                  if (event.target.files) void handleMenuFiles(event.target.files)
                  event.currentTarget.value = ''
                }}
              />
              <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
                <div
                  onDragEnter={(event) => {
                    event.preventDefault()
                    setDragActive(true)
                  }}
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
                    void handleMenuFiles(event.dataTransfer.files)
                  }}
                >
                  <MaterialUploadAsset active={dragActive} onBrowse={() => fileInputRef.current?.click()} />
                </div>

                <form onSubmit={handleUrlImport} className="grid gap-2">
                  <div className="relative">
                    <Link2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-sky-200/60" />
                    <input
                      value={materialUrl}
                      onChange={(event) => setMaterialUrl(event.target.value)}
                      placeholder="Paste a study link"
                      className="h-12 w-full rounded-2xl border border-sky-300/25 bg-[#03101f]/70 pl-10 pr-3 text-sm text-white outline-none transition placeholder:text-sky-200/35 focus:border-sky-200 focus:ring-4 focus:ring-sky-400/15"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isImporting || !materialUrl.trim()}
                    className="rounded-2xl border border-sky-300/25 bg-sky-500/85 px-4 py-3 text-sm font-bold text-white shadow-[0_0_24px_rgba(43,148,255,0.22)] transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isImporting ? 'Importing...' : 'Import link'}
                  </button>
                </form>
              </div>
              {importMessage ? <p className="mt-3 rounded-2xl border border-sky-300/25 bg-sky-400/10 px-4 py-3 text-sm font-semibold text-sky-100">{importMessage}</p> : null}
              {extractingMaterials.length ? <p className="mt-3 text-sm text-sky-200/70">Pulling study material into your library.</p> : null}
              <p className="mt-3 text-xs font-bold uppercase tracking-[0.14em] text-sky-200/54">
                Library: {materialCount} materials / {materialFlashcards.length} cards / {materialQuestions.length} quiz items
              </p>
            </CommandPanel>

            <CommandPanel title="All Tools" subtitle="Full toolbox">
              <div className="flex flex-wrap gap-2">
                {allTools.map(([label, route]) => (
                  <button
                    key={route}
                    type="button"
                    onClick={() => navigate(route)}
                    className="rounded-full border border-sky-300/20 bg-white/[0.04] px-3 py-2 text-xs font-bold text-sky-100/75 transition hover:border-sky-200 hover:bg-sky-400/12 hover:text-white"
                  >
                    {label}
                  </button>
                ))}
              </div>
            </CommandPanel>
          </section>
        </main>

        <nav className="sticky bottom-0 z-20 mt-4 grid grid-cols-2 gap-2 border-t border-cyan-300/20 bg-[#020812]/85 px-2 py-3 backdrop-blur md:grid-cols-5">
          <BottomCommandButton label="Home" icon={<Goal className="h-5 w-5" />} active onClick={() => navigate('/')} />
          <BottomCommandButton label="Study Plan" icon={<CalendarClock className="h-5 w-5" />} onClick={() => navigate('/study-plan')} />
          <BottomCommandButton label="Performance" icon={<BarChart3 className="h-5 w-5" />} onClick={() => navigate('/performance-analytics')} />
          <BottomCommandButton label="Resources" icon={<BookOpen className="h-5 w-5" />} onClick={() => navigate('/strategy-training')} />
          <BottomCommandButton label="Settings" icon={<Target className="h-5 w-5" />} onClick={() => navigate('/settings')} />
        </nav>
      </div>
    </NurseCommandBackdrop>
  )
}

export function DashboardPage() {
  const navigate = useNavigate()
  const profile = useStudySystemStore((state) => state.profile)
  const attempts = useStudySystemStore((state) => state.attempts)
  const materials = useStudySystemStore((state) => state.materials)
  const startQuickStudy = useStudySystemStore((state) => state.startQuickStudy)
  const [dashboardNowMs] = useState(() => new Date().getTime())
  const dashboard = useMemo(() => getDashboardState(profile, attempts), [attempts, profile])
  const analytics = useMemo(() => getAnalyticsSnapshot(attempts, profile), [attempts, profile])
  const weakestArea = dashboard.weakestCategories[0]
  const todayMinutes = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10)
    return Math.round(
      attempts
        .filter((attempt) => attempt.completedAt.slice(0, 10) === today)
        .reduce((sum, attempt) => sum + attempt.timeSpentSec, 0) / 60,
    )
  }, [attempts])
  const completedPlanCount =
    dashboard.todayCompleted === 0 ? 0 : Math.min(5, Math.max(1, Math.round(dashboard.todayCompleted / 1.5)))
  const readiness = analytics.overallAccuracy >= 0.75 ? 'Good' : analytics.overallAccuracy >= 0.62 ? 'Building' : 'Needs focus'
  const readinessTone = analytics.overallAccuracy >= 0.75 ? 'blue' : analytics.overallAccuracy >= 0.62 ? 'green' : 'amber'
  const planItems = [
    {
      label: `15 Questions - ${shortCategoryLabel(weakestArea?.category ?? 'Pharmacology')}`,
      meta: '25 min',
    },
    {
      label: `10 Questions - ${shortCategoryLabel(dashboard.weakestCategories[1]?.category ?? 'Adult Health / Med-Surg')}`,
      meta: '15 min',
    },
    { label: 'Review Incorrect', meta: '20 min' },
    { label: 'Read: Fluid & Electrolytes', meta: '15 min' },
    { label: 'Mini Exam (25 Qs)', meta: '25 min' },
  ]
  const completionTrend = analytics.dailyAccuracy.map((item) => item.completed || 0)
  const accuracyTrend = analytics.dailyAccuracy.map((item) => Math.round(item.accuracy * 100) || 0)
  const todayGoalProgress = dashboard.dailyGoal ? dashboard.todayCompleted / dashboard.dailyGoal : 0
  const materialsReadyCount = materials.filter((item) => item.extractionStatus === 'ready').length
  const materialsNeedingAttention = materials.filter(
    (item) =>
      item.extractionStatus === 'error' ||
      (item.extractionStatus === 'ready' &&
        (!item.generatedFlashcardIds.length || !item.generatedQuestionIds.length)),
  ).length
  const recommendationBody = weakestArea
    ? `You missed ${Math.max(1, weakestArea.flaggedCount || 2)} high-value questions in this area. Strengthen this topic to boost your score and reduce second-guessing.`
    : dashboard.recommendation.description
  const activeExamTrack = getExamTrack(profile.examTrack ?? 'nclex-rn')
  const dashboardCopy = getExamDashboardCopy(activeExamTrack.id)
  const daysUntilExam = Math.max(
    0,
    Math.ceil((new Date(profile.examDate).getTime() - dashboardNowMs) / (1000 * 60 * 60 * 24)),
  )
  const todayPriority = weakestArea
    ? `${dashboardCopy.priorityPrefix}: ${shortCategoryLabel(weakestArea.category)}`
    : materialsReadyCount
      ? 'Convert your uploaded material into active recall'
      : 'Complete one Quick Study session to generate fresh signal'

  return (
    <PageStack>
      <PageHeader
        eyebrow="Command Center"
        title="Today, do the next useful thing."
        description={`A simpler ${activeExamTrack.shortName} command view: priority first, then progress and context.`}
        action={
          <button
            type="button"
            onClick={() => {
              startQuickStudy(weakestArea?.category)
              navigate('/quick-study')
            }}
            className="nclex-btn-primary inline-flex min-h-11 items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold"
          >
            <Sparkles className="h-4 w-4" />
            Start priority session
          </button>
        }
      />

      <FocusPanel>
        <div className="grid gap-5 bg-[linear-gradient(135deg,#003b66_0%,#12375a_100%)] px-5 py-5 text-white md:px-6 lg:grid-cols-[minmax(0,1fr)_260px]">
          <div>
            <p className="text-sm font-semibold text-sky-100/85">Today's next action</p>
            <h3 className="mt-3 font-serif text-3xl leading-tight md:text-[2.15rem]">
              {todayPriority}
            </h3>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-sky-100/85">
              {recommendationBody}
            </p>
          </div>
          <div className="grid content-start gap-3 rounded-2xl border border-white/15 bg-white/10 p-4">
            <div>
              <p className="text-xs font-semibold text-sky-100/70">Exam</p>
              <p className="mt-1 font-semibold">{dashboardCopy.examLabel}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-sky-100/70">Time today</p>
              <p className="mt-1 font-semibold">{formatMinutes(todayMinutes)}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-sky-100/70">Target date</p>
              <p className="mt-1 font-semibold">{profile.examDate}</p>
            </div>
          </div>
        </div>
      </FocusPanel>

      <div className="grid gap-5 md:grid-cols-3">
        <StatCard
          label="Current Streak"
          value={`${dashboard.streak} days`}
          detail="Keep the habit alive."
          trend="+2 days"
          tone="success"
          icon={<Flame className="h-5 w-5" />}
          sparkline={completionTrend}
        />
        <StatCard
          label="Study Goal"
          value={`${dashboard.todayCompleted} questions`}
          detail={`of ${dashboard.dailyGoal} today`}
          trend={`${Math.round(todayGoalProgress * 100)}% complete`}
          progressValue={todayGoalProgress}
          icon={<Goal className="h-5 w-5" />}
        />
        <StatCard
          label="Accuracy"
          value={`${Math.round(dashboard.recentAccuracy * 100)}%`}
          detail="Across your most recent set."
          trend={dashboard.recentAccuracy >= 0.75 ? '+6% this week' : 'Focus on stability'}
          tone={dashboard.recentAccuracy >= 0.75 ? 'success' : 'warning'}
          icon={<CheckCircle2 className="h-5 w-5" />}
          sparkline={accuracyTrend}
        />
      </div>

      <DetailGrid className="xl:grid-cols-[1.12fr_0.88fr]">
        <Surface>
          <SectionHeading
            title="Recent performance"
            description="One trend is enough here: accuracy over the last seven days."
          />
          <div className="mt-5 h-[280px] min-h-[280px] min-w-0">
            <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 1, height: 1 }} minWidth={0}>
              <AreaChart data={analytics.dailyAccuracy}>
                <defs>
                  <linearGradient id="accuracyFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#2A7DE1" stopOpacity={0.22} />
                    <stop offset="100%" stopColor="#2A7DE1" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="#e5edf5" />
                <XAxis dataKey="day" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={(value) => `${Math.round(value * 100)}%`} tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip formatter={percentTooltip} />
                <Area type="monotone" dataKey="accuracy" stroke="#2A7DE1" fill="url(#accuracyFill)" strokeWidth={3} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Surface>
        <Surface>
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="font-serif text-2xl text-[var(--nclex-text)]">Today's Plan</h3>
              <p className="mt-1 text-sm text-[var(--nclex-text-muted)]">
                {completedPlanCount} of {planItems.length} completed
              </p>
            </div>
            <span className="nclex-chip nclex-chip-success">{completedPlanCount} / {planItems.length}</span>
          </div>
          <div className="mt-5 space-y-1">
            {planItems.map((item, index) => (
              <ChecklistItem
                key={item.label}
                label={item.label}
                meta={item.meta}
                completed={index < completedPlanCount}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={() => navigate('/study-plan')}
            className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[var(--nclex-blue)]"
          >
            View Full Plan
              <ArrowRight className="h-4 w-4" />
            </button>
          </Surface>
      </DetailGrid>

      <DetailGrid>
        <Surface>
          <SectionHeading
            title="Weak areas"
            description="Keep the remediation list short enough to act on."
            action={
              <Link to="/weak-areas" className="text-sm font-semibold text-[var(--nclex-blue)]">
                See all
              </Link>
            }
          />
          <div className="mt-5 space-y-5">
            {dashboard.weakestCategories.slice(0, 3).map((area) => (
              <div key={area.category}>
                <div className="mb-2 flex items-center justify-between gap-4">
                  <div>
                    <p className="font-semibold text-[var(--nclex-text)]">{shortCategoryLabel(area.category)}</p>
                    <p className="text-sm text-[var(--nclex-text-muted)]">{area.suggestedAction}</p>
                  </div>
                  <MasteryPill mastery={area.masteryLevel} />
                </div>
                <ProgressBar
                  value={area.accuracy}
                  tone={area.masteryLevel === 'strong' ? 'green' : area.masteryLevel === 'developing' ? 'amber' : 'red'}
                />
              </div>
            ))}
          </div>
        </Surface>

        <Surface>
          <SectionHeading title="Plan context" description="Exam timing, readiness, and material status in one place." />
          <div className="mt-5 grid gap-4">
            <div>
              <div className="flex items-center justify-between gap-4">
                <p className="font-semibold text-[var(--nclex-text)]">{activeExamTrack.title}</p>
                <span className="nclex-chip nclex-chip-info">{daysUntilExam} days</span>
              </div>
              <p className="mt-1 text-sm text-[var(--nclex-text-muted)]">{activeExamTrack.subtitle}</p>
              <div className="mt-4">
                <ProgressBar value={Math.min(1, Math.max(0.08, 1 - daysUntilExam / 90))} />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl bg-[#f7fbfd] p-4">
                <p className="text-sm font-semibold text-[var(--nclex-text)]">Readiness</p>
                <p className="mt-1 text-2xl font-semibold text-[var(--nclex-text)]">{readiness}</p>
                <div className="mt-3">
                  <ProgressBar
                    value={analytics.overallAccuracy}
                    tone={readinessTone === 'amber' ? 'amber' : readinessTone === 'green' ? 'green' : 'blue'}
                  />
                </div>
              </div>
              <div className="rounded-2xl bg-[#f7fbfd] p-4">
                <p className="text-sm font-semibold text-[var(--nclex-text)]">Materials</p>
                <p className="mt-1 text-2xl font-semibold text-[var(--nclex-text)]">{materialsReadyCount}</p>
                <p className="mt-1 text-sm text-[var(--nclex-text-muted)]">
                  {materialsNeedingAttention ? `${materialsNeedingAttention} need attention` : 'Ready to review'}
                </p>
              </div>
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

  if (activeSession?.mode === 'practice') {
    return (
      <QuestionSessionRunner
        key={`${activeSession.id}-${activeSession.currentIndex}`}
        session={activeSession}
        modeLabel="Practice Questions"
        onExit={abandonSession}
      />
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Adaptive Practice"
        title={`Train for ${activeTrack.shortName}, not a generic exam.`}
        description="Choose exactly what to drill. The content pool, filters, weak-area bias, and analytics all follow the active exam track."
      />
      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <Surface>
          <h3 className="font-serif text-3xl text-[#163042]">Build your next set</h3>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <Field label="Category">
              <select value={category} onChange={(event) => setCategory(event.target.value as QuestionCategory | 'All')} className={selectClass}>
                <option value="All">All categories</option>
                {trackCategories.map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
            </Field>
            <Field label="System">
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
            <Field label="Question count">
              <input
                type="range"
                min={5}
                max={20}
                step={5}
                value={questionCount}
                onChange={(event) => setQuestionCount(Number(event.target.value))}
                className="w-full accent-sky-600"
              />
              <p className="mt-2 text-sm text-[#7e97aa]">{questionCount} questions</p>
            </Field>
          </div>
          <button
            type="button"
            onClick={() =>
              startTransition(() =>
                startPracticeSession({
                  category,
                  system,
                  board,
                  questionStatus,
                  format,
                  difficulty,
                  questionCount,
                }),
              )
            }
            className="nclex-btn-primary mt-6 inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold"
          >
            {isPending ? 'Building set...' : 'Start adaptive practice'}
            <ArrowRight className="h-4 w-4" />
          </button>
        </Surface>

        <Surface className="bg-[linear-gradient(180deg,_#f9fcff_0%,_#f3fbf8_100%)]">
          <div className="grid gap-4 md:grid-cols-2">
            <FeatureCallout
              title="Confidence-based review"
              description="Every question asks how sure you were so your analytics catch hidden weak spots."
            />
            <FeatureCallout
              title="Rationale-rich feedback"
              description="See why the best answer is right, why the others fail, and what NCLEX pattern you missed."
            />
            <FeatureCallout
              title="SATA and scenario support"
              description="Mix standard questions with realistic patient scenarios and select-all decision points."
            />
            <FeatureCallout
              title="Flag difficult items"
              description="Turn confusion into a review list instead of losing it after the session ends."
            />
          </div>
        </Surface>
      </div>
    </div>
  )
}

export function ExamPrepPage() {
  const navigate = useNavigate()
  const profile = useStudySystemStore((state) => state.profile)
  const updateProfile = useStudySystemStore((state) => state.updateProfile)
  const startPracticeSession = useStudySystemStore((state) => state.startPracticeSession)
  const [selectedTrackId, setSelectedTrackId] = useState<ExamTrackId>(profile.examTrack ?? 'nclex-rn')
  const [fnpBoard, setFnpBoard] = useState<'AANP' | 'ANCC'>('AANP')
  const [questionStatus, setQuestionStatus] = useState<'unused' | 'incorrect' | 'all'>('unused')
  const [fnpSystem, setFnpSystem] = useState('Cardiology')
  const [testMode, setTestMode] = useState<'Tutor' | 'Timed'>('Tutor')
  const [createdTest, setCreatedTest] = useState(false)
  const selectedTrack = getExamTrack(selectedTrackId)
  const activeTrack = getExamTrack(profile.examTrack ?? 'nclex-rn')
  const isFnp = selectedTrack.id === 'fnp'
  const selectedBankSize = getExamQuestionBank(selectedTrack.id).length
  const qualitySummary = getExamContentQualitySummary(selectedTrack.id)

  const fnpCoverage = [
    '1,100+ FNP practice questions target',
    'Customizable practice tests',
    'Total AANP & ANCC coverage',
    'Detailed diagnostic reports',
    'In-depth answer explanations',
    'Specialist NP review-ready rationales',
    'Spaced-repetition flashcards',
    'Tutor & Timed options',
    'Digital notebook',
    'Mobile access',
    'One-time reset option',
  ]
  const reportRows = [
    { label: 'Cardiovascular', value: 0.58, tone: 'amber' as const, detail: 'Prioritize cardiology review before mixed FNP tests.' },
    { label: 'Psychiatry', value: 0.74, tone: 'blue' as const, detail: 'Stable but needs more ANCC-style reasoning.' },
    { label: 'Pharmacology', value: 0.62, tone: 'amber' as const, detail: 'Focus on prescribing safety and adverse effects.' },
    { label: 'Health Promotion', value: 0.86, tone: 'green' as const, detail: 'Strong domain. Keep in spaced review.' },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Exam Prep"
        title="Support multiple nursing and clinical certification tracks."
        description="The app now separates NCLEX-RN, NCLEX-PN, FNP, and Certified Clinical Medical Assistant prep so each exam can have its own blueprint, question formats, reports, and resources."
        action={
          <button
            type="button"
            onClick={() => updateProfile({ examTrack: selectedTrackId })}
            className="nclex-btn-primary inline-flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold"
          >
            Use {selectedTrack.shortName}
            <CheckCircle2 className="h-4 w-4" />
          </button>
        }
      />

      <Surface>
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--nclex-blue)]">
              Current Track
            </p>
            <h3 className="mt-2 font-serif text-3xl text-[var(--nclex-text)]">
              {activeTrack.title}
            </h3>
            <p className="mt-2 max-w-3xl text-sm leading-7 text-[var(--nclex-text-muted)]">
              {activeTrack.subtitle}
            </p>
          </div>
          <span className={activeTrack.status === 'live' ? 'nclex-chip nclex-chip-success' : 'nclex-chip nclex-chip-warning'}>
            {activeTrack.status === 'live' ? 'Live content' : 'Expansion ready'}
          </span>
        </div>
      </Surface>

      <div className="grid gap-6 xl:grid-cols-[0.82fr_1.18fr]">
        <Surface>
          <SectionHeading
            title="Choose exam"
            description="Pick the prep product the student is studying for."
          />
          <div className="mt-5 grid gap-3">
            {examTracks.map((track) => (
              <button
                key={track.id}
                type="button"
                onClick={() => {
                  setSelectedTrackId(track.id)
                  setCreatedTest(false)
                }}
                className={clsx(
                  'rounded-[18px] border p-4 text-left transition',
                  selectedTrack.id === track.id
                    ? 'border-[#bfdbfe] bg-[var(--nclex-blue-soft)]'
                    : 'border-[var(--nclex-border)] bg-white hover:border-[#c9dbef]',
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-[var(--nclex-text)]">{track.shortName}</p>
                    <p className="mt-1 text-sm leading-6 text-[var(--nclex-text-muted)]">
                      {track.title}
                    </p>
                  </div>
                  <span className={track.status === 'live' ? 'nclex-chip nclex-chip-success' : 'nclex-chip nclex-chip-info'}>
                    {track.status === 'live' ? 'Live' : 'Ready'}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </Surface>

        <Surface className="overflow-hidden p-0">
          <div className="bg-[linear-gradient(135deg,#003b66_0%,#12375a_100%)] px-5 py-6 text-white md:px-6">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-100">
              {selectedTrack.shortName} Product Blueprint
            </p>
            <h3 className="mt-3 font-serif text-4xl leading-tight">
              {selectedTrack.title}
            </h3>
            <p className="mt-3 max-w-4xl text-sm leading-7 text-sky-100/85">
              {selectedTrack.subtitle}
            </p>
            <div className="mt-5 grid gap-3 md:grid-cols-3">
              <QuickMetric label="Question Bank" value={`${selectedBankSize} ready now`} detail={selectedTrack.questionTarget} />
              <QuickMetric label="Boards" value={selectedTrack.boards.join(' + ')} detail="Exam-specific preparation path." />
              <QuickMetric label="Formats" value={`${selectedTrack.testingFormats.length}`} detail="Testing modes and item types." />
            </div>
          </div>

          <div className="grid gap-5 p-5 md:grid-cols-2 md:p-6">
            <div className="rounded-[18px] border border-[var(--nclex-border)] bg-[var(--nclex-card-muted)] p-4 md:col-span-2">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--nclex-blue)]">
                Content quality pass
              </p>
              <div className="mt-4 grid gap-3 md:grid-cols-4">
                <MetricChip label="Review-ready" value={`${qualitySummary.reviewReady}`} />
                <MetricChip label="Authored drafts" value={`${qualitySummary.authoredDraft}`} />
                <MetricChip label="SME reviewed" value={`${qualitySummary.smeReviewed}`} />
                <MetricChip label="Starter fill" value={`${qualitySummary.generatedStarter}`} />
              </div>
              <p className="mt-4 text-sm leading-6 text-[var(--nclex-text-muted)]">
                Review-ready items are higher-quality clinical-editor drafts prepared for SME validation. The app does not label content as SME-authored until a real reviewer marks it reviewed.
              </p>
            </div>
            <ExamTrackList title="Domains" items={selectedTrack.domains} />
            <ExamTrackList title="Systems" items={selectedTrack.systems} />
            <ExamTrackList title="Testing formats" items={selectedTrack.testingFormats} />
            <ExamTrackList title="Resources" items={selectedTrack.resources} />
          </div>
        </Surface>
      </div>

      {isFnp ? (
        <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <Surface>
            <SectionHeading
              title="FNP product: Create test"
              description="Mirrors the workflow you requested: FNP product > Create test > Select unused > Select cardiology > Create test."
            />
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <Field label="Board blueprint">
                <select value={fnpBoard} onChange={(event) => setFnpBoard(event.target.value as typeof fnpBoard)} className={selectClass}>
                  <option value="AANP">AANP</option>
                  <option value="ANCC">ANCC</option>
                </select>
              </Field>
              <Field label="Question status">
                <select value={questionStatus} onChange={(event) => setQuestionStatus(event.target.value as typeof questionStatus)} className={selectClass}>
                  <option value="unused">Unused</option>
                  <option value="incorrect">Previously incorrect</option>
                  <option value="all">All questions</option>
                </select>
              </Field>
              <Field label="Domain / system">
                <select value={fnpSystem} onChange={(event) => setFnpSystem(event.target.value)} className={selectClass}>
                  {selectedTrack.systems.map((system) => (
                    <option key={system} value={system}>{system}</option>
                  ))}
                </select>
              </Field>
              <Field label="Mode">
                <select value={testMode} onChange={(event) => setTestMode(event.target.value as typeof testMode)} className={selectClass}>
                  <option value="Tutor">Tutor Mode</option>
                  <option value="Timed">Timed Mode</option>
                </select>
              </Field>
            </div>
            <button
              type="button"
              onClick={() => {
                updateProfile({ examTrack: 'fnp' })
                startPracticeSession({
                  category: 'All',
                  system: fnpSystem,
                  board: fnpBoard,
                  questionStatus,
                  difficulty: 'adaptive',
                  format: 'mixed',
                  questionCount: 15,
                })
                setCreatedTest(true)
                navigate('/practice-questions')
              }}
              className="nclex-btn-primary mt-5 inline-flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold"
            >
              Create FNP practice test
              <ArrowRight className="h-4 w-4" />
            </button>
            {createdTest ? (
              <div className="mt-5 rounded-[18px] border border-[#c8eddc] bg-[var(--nclex-success-soft)] p-4 text-sm leading-6 text-[var(--nclex-success)]">
                Created a {testMode} {fnpBoard} FNP practice test using {questionStatus} questions in {fnpSystem}. In the next content pass, this connects to the FNP QBank and question status history.
              </div>
            ) : null}
          </Surface>

          <Surface>
            <SectionHeading
              title="FNP feature coverage"
              description="Product requirements mapped into the current app layout."
            />
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {fnpCoverage.map((item) => (
                <div key={item} className="rounded-[16px] border border-[var(--nclex-border)] bg-[var(--nclex-card-muted)] p-4">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[var(--nclex-success)]" />
                    <p className="text-sm font-semibold leading-6 text-[var(--nclex-text-secondary)]">{item}</p>
                  </div>
                </div>
              ))}
            </div>
          </Surface>

          <Surface className="xl:col-span-2">
            <SectionHeading
              title="FNP diagnostic report preview"
              description="Breaks results down by AANP/ANCC blueprint, domain, body system, mode, and question status."
            />
            <div className="mt-5 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
              {reportRows.map((row) => (
                <div key={row.label} className="rounded-[18px] border border-[var(--nclex-border)] bg-white p-4">
                  <p className="font-semibold text-[var(--nclex-text)]">{row.label}</p>
                  <p className="mt-2 text-sm leading-6 text-[var(--nclex-text-muted)]">{row.detail}</p>
                  <div className="mt-4">
                    <ProgressBar value={row.value} tone={row.tone} />
                  </div>
                  <p className="mt-2 text-sm font-semibold text-[var(--nclex-text)]">
                    {Math.round(row.value * 100)}%
                  </p>
                </div>
              ))}
            </div>
          </Surface>
        </div>
      ) : null}
    </div>
  )
}

export function QuickStudyPage() {
  const profile = useStudySystemStore((state) => state.profile)
  const attempts = useStudySystemStore((state) => state.attempts)
  const activeSession = useStudySystemStore((state) => state.activeSession)
  const startQuickStudy = useStudySystemStore((state) => state.startQuickStudy)
  const abandonSession = useStudySystemStore((state) => state.abandonSession)
  const weakArea = useMemo(
    () => getWeakAreas(attempts, profile.examTrack ?? 'nclex-rn', profile.preferences.analyticsScope ?? 'selected-track')[0],
    [attempts, profile.examTrack, profile.preferences.analyticsScope],
  )
  const activeTrack = getExamTrack(profile.examTrack ?? 'nclex-rn')

  if (activeSession?.mode === 'quick-study') {
    return (
      <QuestionSessionRunner
        key={`${activeSession.id}-${activeSession.currentIndex}`}
        session={activeSession}
        modeLabel="Quick Study"
        onExit={abandonSession}
      />
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Quick Study"
        title="Only have 10 minutes?"
        description="Let's focus on your weakest area and turn this into a quick, confidence-building win."
        action={
          <button
            type="button"
            onClick={() => startQuickStudy()}
            className="nclex-btn-primary inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold"
          >
            <Sparkles className="h-4 w-4" />
            Start 5 Questions
          </button>
        }
      />
      <div className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
        <Surface className="nclex-dark-panel text-white">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-200">Auto-selected focus</p>
          <h3 className="mt-4 font-serif text-4xl">{weakArea?.category ?? getExamCategories(activeTrack.id)[0]}</h3>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-200">
            {weakArea
              ? `${Math.round(weakArea.accuracy * 100)}% accuracy with ${weakArea.commonMistakes.join(', ')} coming up most often.`
              : 'No attempt history yet. We will start with high-yield safety and prioritization questions.'}
          </p>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <QuickMetric label="Questions" value="5" detail="Short enough to fit in a break." />
            <QuickMetric label="Feedback" value="Instant" detail="Learn while the reasoning is fresh." />
            <QuickMetric label="Goal" value="Clarity" detail="One focused improvement, not random volume." />
          </div>
        </Surface>
        <Surface>
          <h3 className="font-serif text-2xl text-[#163042]">Why this gets used daily</h3>
          <ul className="mt-5 space-y-4 text-sm leading-6 text-[#4f687a]">
            <li>No setup friction. One tap starts the set.</li>
            <li>Weak-area targeting keeps every question valuable.</li>
            <li>Confidence tracking catches the answers you only "sort of" know.</li>
            <li>End-of-set summaries tell you exactly what to reinforce next.</li>
          </ul>
        </Surface>
      </div>
    </div>
  )
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
  const activeTrack = getExamTrack(profile.examTrack ?? 'nclex-rn')

  if (activeSession?.mode === 'test') {
    return (
      <QuestionSessionRunner
        key={`${activeSession.id}-${activeSession.currentIndex}`}
        session={activeSession}
        modeLabel="Test Mode"
        onExit={abandonSession}
      />
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Exam Simulation"
        title={`Practice ${activeTrack.shortName} pressure before test day.`}
        description={`This exam mode pulls from the ${activeTrack.shortName} bank and uses that track's domains, systems, and blueprint emphasis.`}
      />
      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <Surface>
          <h3 className="font-serif text-3xl text-[#163042]">Build a realistic test</h3>
          <div className="mt-6 grid gap-5">
            <Field label="Question count">
              <input type="range" min={20} max={60} step={5} value={questionCount} onChange={(event) => setQuestionCount(Number(event.target.value))} className="w-full accent-sky-600" />
              <p className="mt-2 text-sm text-[#7e97aa]">{questionCount} mixed questions</p>
            </Field>
            <ToggleRow label="Timed mode" description="Uses a realistic countdown and keeps the interface lean." checked={timed} onChange={setTimed} />
            <ToggleRow label="No backtracking" description="Once you move forward, you stay forward." checked={noBacktracking} onChange={setNoBacktracking} />
          </div>
          <button
            type="button"
            onClick={() => startTransition(() => startTestSession({ questionCount, timed, noBacktracking }))}
            className="nclex-btn-primary mt-6 inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold"
          >
            {isPending ? 'Building exam...' : 'Launch test mode'}
            <ArrowRight className="h-4 w-4" />
          </button>
        </Surface>
        <Surface className="nclex-dark-panel text-white">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-200">End-of-test review</p>
          <div className="mt-5 space-y-4">
            <ReviewRow icon={<CheckCircle2 className="h-4 w-4" />} title="Score + category breakdown" detail="See what held up under mixed exam pressure and where accuracy dropped." />
            <ReviewRow icon={<TrendingDown className="h-4 w-4" />} title="Missed questions review" detail="Review weak clinical decisions while the reasoning is still active in memory." />
            <ReviewRow icon={<Sparkles className="h-4 w-4" />} title="Encouraging summary" detail="Close each test with clear next steps instead of a vague score report." />
          </div>
        </Surface>
      </div>
    </div>
  )
}

export function WeakAreasPage() {
  const navigate = useNavigate()
  const profile = useStudySystemStore((state) => state.profile)
  const attempts = useStudySystemStore((state) => state.attempts)
  const startPracticeSession = useStudySystemStore((state) => state.startPracticeSession)
  const weakAreas = useMemo(
    () => getWeakAreas(attempts, profile.examTrack ?? 'nclex-rn', profile.preferences.analyticsScope ?? 'selected-track'),
    [attempts, profile.examTrack, profile.preferences.analyticsScope],
  )
  const activeTrack = getExamTrack(profile.examTrack ?? 'nclex-rn')

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Actionable Review"
        title={`${activeTrack.shortName} weak areas should turn into action, not shame.`}
        description="Every category below follows your selected exam track and explains the fastest way to improve it."
      />
      <div className="grid gap-5">
        {weakAreas.map((area) => (
          <Surface key={area.category}>
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div className="max-w-3xl">
                <div className="flex flex-wrap items-center gap-3">
                <h3 className="font-serif text-3xl text-[#163042]">{area.category}</h3>
                  <MasteryPill mastery={area.masteryLevel} />
                </div>
                <p className="mt-3 text-sm leading-6 text-[#4f687a]">{area.suggestedAction}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {area.commonMistakes.map((mistake) => (
                    <span key={mistake} className="rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-rose-700">
                      {mistake}
                    </span>
                  ))}
                  {area.keyConcepts.map((concept) => (
                    <span key={concept} className="nclex-chip nclex-chip-info">
                      {concept}
                    </span>
                  ))}
                </div>
              </div>
              <div className="grid gap-3 md:min-w-[280px]">
                <MetricChip label="Accuracy" value={`${Math.round(area.accuracy * 100)}%`} />
                <MetricChip label="Attempts" value={`${area.attemptCount}`} />
                <MetricChip label="Mismatch" value={`${Math.round(area.confidenceMismatchScore * 100)}%`} />
              </div>
            </div>
            <div className="mt-5">
              <ProgressBar value={area.accuracy} />
            </div>
            <div className="mt-5 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => {
                  startPracticeSession({
                    category: area.category,
                    difficulty: 'adaptive',
                    questionCount: 5,
                    format: 'mixed',
                  })
                  navigate('/practice-questions')
                }}
                className="nclex-btn-primary rounded-full px-4 py-2 text-sm font-semibold"
              >
                Targeted quiz
              </button>
              <button
                type="button"
                onClick={() => navigate(`/flashcards?category=${encodeURIComponent(area.category)}`)}
                className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
              >
                Flashcards
              </button>
              <button
                type="button"
                onClick={() => navigate(`/notes?category=${encodeURIComponent(area.category)}`)}
                className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
              >
                Notes
              </button>
            </div>
          </Surface>
        ))}
      </div>
    </div>
  )
}

export function PerformanceAnalyticsPage() {
  const profile = useStudySystemStore((state) => state.profile)
  const attempts = useStudySystemStore((state) => state.attempts)
  const updateProfile = useStudySystemStore((state) => state.updateProfile)
  const analytics = useMemo(() => getAnalyticsSnapshot(attempts, profile), [attempts, profile])
  const activeTrack = getExamTrack(profile.examTrack ?? 'nclex-rn')

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Performance Analytics"
        title={`${activeTrack.shortName} progress you can actually trust.`}
        description="Toggle between the selected exam and all-exam history without mixing signals accidentally."
        action={
          <div className="inline-flex rounded-xl border border-[var(--nclex-border)] bg-white p-1 shadow-sm">
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
                  'rounded-lg px-3 py-2 text-xs font-semibold transition',
                  (profile.preferences.analyticsScope ?? 'selected-track') === item.value
                    ? 'bg-[var(--nclex-blue)] text-white'
                    : 'text-[var(--nclex-text-muted)] hover:text-[var(--nclex-blue)]',
                )}
              >
                {item.label}
              </button>
            ))}
          </div>
        }
      />
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Overall accuracy" value={`${Math.round(analytics.overallAccuracy * 100)}%`} detail="Real performance across all sessions and categories." tone={analytics.overallAccuracy >= 0.75 ? 'success' : 'warning'} />
        <StatCard label="Questions completed" value={`${analytics.questionsCompleted}`} detail="Enough reps to show real patterns, not just a lucky day." />
        <StatCard label="Time studied" value={`${analytics.timeStudiedMinutes} min`} detail="Focused time, not passive time." />
        <StatCard label="Current streak" value={`${analytics.streak} days`} detail="Retention grows faster when sessions stay frequent." tone="success" />
      </div>
      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <Surface>
          <div className="flex items-center justify-between">
            <h3 className="font-serif text-2xl text-[#163042]">Accuracy trend</h3>
            <span className="nclex-chip nclex-chip-info">daily</span>
          </div>
          <div className="mt-5 h-[320px] min-h-[320px] min-w-0">
            <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 1, height: 1 }} minWidth={0}>
              <LineChart data={analytics.dailyAccuracy}>
                <CartesianGrid vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} tickFormatter={(value) => `${Math.round(value * 100)}%`} />
                <Tooltip formatter={percentTooltip} />
                <Line type="monotone" dataKey="accuracy" stroke="#0f172a" strokeWidth={3} dot={{ r: 4, fill: '#0f172a' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Surface>
        <Surface>
          <div className="flex items-center justify-between">
            <h3 className="font-serif text-2xl text-[#163042]">Category accuracy</h3>
            <span className="nclex-chip nclex-chip-info">by system</span>
          </div>
          <div className="mt-5 h-[320px] min-h-[320px] min-w-0">
            <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 1, height: 1 }} minWidth={0}>
              <BarChart data={analytics.categoryStats}>
                <CartesianGrid vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="category" hide />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} tickFormatter={(value) => `${Math.round(value * 100)}%`} />
                <Tooltip formatter={percentTooltip} />
                <Bar dataKey="accuracy" radius={[10, 10, 0, 0]}>
                  {analytics.categoryStats.map((entry) => (
                    <Cell
                      key={entry.category}
                      fill={
                        entry.masteryLevel === 'strong'
                          ? '#10b981'
                          : entry.masteryLevel === 'developing'
                            ? '#f59e0b'
                            : '#ef4444'
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Surface>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <Surface>
          <div className="flex items-center justify-between">
            <h3 className="font-serif text-2xl text-[#163042]">Confidence trend</h3>
            <span className="nclex-chip nclex-chip-info">stability</span>
          </div>
          <div className="mt-5 h-[300px] min-h-[300px] min-w-0">
            <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 1, height: 1 }} minWidth={0}>
              <AreaChart data={analytics.confidenceTrend}>
                <defs>
                  <linearGradient id="confidenceFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.28} />
                    <stop offset="100%" stopColor="#10b981" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                <Tooltip />
                <Area type="monotone" dataKey="confidence" stroke="#059669" fill="url(#confidenceFill)" strokeWidth={3} />
                <Line type="monotone" dataKey="mismatch" stroke="#ef4444" strokeWidth={2} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Surface>
        <Surface>
          <h3 className="font-serif text-2xl text-[#163042]">What the data says</h3>
          <div className="mt-5 space-y-4">
            <InsightRow
              icon={<TrendingUp className="h-4 w-4 text-emerald-600" />}
              title="Overall trajectory"
              body={
                analytics.overallAccuracy >= 0.72
                  ? 'Your overall accuracy is trending toward exam-ready territory. Keep building consistency.'
                  : 'You are still in the build phase. Use weak-area targeting instead of more random question volume.'
              }
            />
            <InsightRow
              icon={<Flame className="h-4 w-4 text-amber-500" />}
              title="Confidence mismatch"
              body={
                analytics.highConfidenceMisses > 2
                  ? 'You have several high-confidence misses. Review those first because they represent risky assumptions.'
                  : 'Confidence mismatch is manageable right now. Keep reviewing low-confidence correct answers before they fade.'
              }
            />
            <InsightRow
              icon={<Clock3 className="h-4 w-4 text-sky-600" />}
              title="Study efficiency"
              body="Short focused sessions are still producing usable signal, which means your loop is efficient."
            />
          </div>
        </Surface>
      </div>
    </div>
  )
}

export function FlashcardsPage() {
  const navigate = useNavigate()
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
  const [reviewNowMs] = useState(() => new Date().getTime())
  const repairingMaterialIdsRef = useRef(new Set<string>())
  const touchStartXRef = useRef<number | null>(null)

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
      setIsFlipped(false)
    })
  }, [activeMaterialId, materialFlashcards, materials, regenerateMaterialStudyTools])

  const effectiveDeckFilter =
    activeMaterialId && deckFilter !== 'Core Deck' ? 'Imported Materials' : deckFilter
  const effectiveSourceFilter = activeMaterialId ?? sourceFilter

  const combinedCards = useMemo(() => {
    const coreCards = flashcards.map((card) => ({
      id: card.id,
      front: card.front,
      back: card.back,
      status: flashcardProgress[card.id] ?? card.status,
      review: flashcardReview[card.id],
      category: card.category,
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
      sourceLabel: card.sourceTitle,
      sourceMaterialId: card.sourceMaterialId,
      origin: 'imported' as const,
    }))

    return [...coreCards, ...importedCards]
  }, [flashcardProgress, flashcardReview, materialFlashcards])

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
  const dueCards = useMemo(() => {
    return combinedCards.filter((card) => {
      if (card.status === 'new' || card.status === 'needs-review') return true
      if (!card.review?.nextReviewAt) return false
      return new Date(card.review.nextReviewAt).getTime() <= reviewNowMs
    })
  }, [combinedCards, reviewNowMs])

  const setCardStatus = (status: FlashcardStatus) => {
    if (!currentCard) return
    if (currentCard.origin === 'imported') {
      void updateMaterialFlashcardStatus(currentCard.id, status)
      return
    }
    updateFlashcardStatus(currentCard.id, status)
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
    <div className="space-y-6">
      <PageHeader
        eyebrow="Flashcards"
        title="High-yield concepts without the fluff."
        description="Use the deck when you want fast reinforcement of meds, labs, safety rules, prioritization frameworks, or study tools generated from your own files."
        action={
          <button
            type="button"
            onClick={() => navigate('/my-materials')}
            className="nclex-btn-secondary inline-flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold"
          >
            <FolderOpen className="h-4 w-4" />
            Open My Materials
          </button>
        }
      />
      <div className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
        <Surface>
          <div className="mb-5 rounded-[20px] border border-[#cfe1f7] bg-[#eef5ff] p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--nclex-blue)]">
              Spaced repetition queue
            </p>
            <h3 className="mt-2 font-serif text-2xl text-[var(--nclex-text)]">
              {dueCards.length} card{dueCards.length === 1 ? '' : 's'} due now
            </h3>
            <p className="mt-2 text-sm leading-6 text-[var(--nclex-text-muted)]">
              Cards marked Needs review come back sooner. Cards marked Known are spaced farther apart as they stabilize.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Deck">
              <select
                value={deckFilter}
                onChange={(event) => {
                  setDeckFilter(event.target.value as typeof deckFilter)
                  setIndex(0)
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
              setIsFlipped(false)
            }}
            className={clsx('mt-5 inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold', shuffleMode ? 'nclex-btn-primary border-transparent text-white' : 'nclex-btn-secondary border-transparent text-slate-700')}
          >
            <Shuffle className="h-4 w-4" />
            {shuffleMode ? 'Shuffle on' : 'Shuffle off'}
          </button>
          <div className="mt-6 grid gap-3 md:grid-cols-3">
            <MetricChip label="Deck size" value={`${filtered.length}`} />
            <MetricChip label="Known" value={`${filtered.filter((card) => card.status === 'known').length}`} />
            <MetricChip label="Due now" value={`${dueCards.length}`} />
          </div>
        </Surface>

        <Surface>
          {currentCard ? (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <p className="nclex-label text-xs font-semibold uppercase">{currentCard.category}</p>
                  <h3 className="mt-2 font-serif text-2xl text-[#163042]">Card {activeIndex + 1} of {filtered.length}</h3>
                  <p className="mt-1 text-sm text-[var(--nclex-text-muted)]">{currentCard.sourceLabel}</p>
                  {currentCard.review?.nextReviewAt ? (
                    <p className="mt-1 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--nclex-text-muted)]">
                      Next review {formatReviewDate(currentCard.review.nextReviewAt)}
                    </p>
                  ) : null}
                </div>
                  <span className="nclex-chip nclex-chip-info">
                    {currentCard.status}
                  </span>
              </div>
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
                <FlipCard isFlipped={isFlipped} onFlip={() => setIsFlipped((current) => !current)} front={currentCard.front} back={currentCard.back} />
                <p className="mt-3 text-center text-xs font-semibold uppercase tracking-[0.14em] text-[var(--nclex-text-muted)] sm:hidden">
                  Swipe cards • tap to flip
                </p>
              </div>
              <div className="mobile-quiz-actions sticky bottom-[5.2rem] z-10 -mx-1 mt-6 flex flex-wrap items-center gap-3 rounded-[20px] border border-[var(--nclex-border)] bg-white/96 p-3 backdrop-blur-xl md:static md:mx-0 md:border-0 md:bg-transparent md:p-0">
                <button type="button" onClick={showPreviousCard} disabled={activeIndex === 0} className="inline-flex min-h-[46px] flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-40 md:flex-none">
                  <ChevronLeft className="h-4 w-4" />
                  Prev
                </button>
                <button type="button" onClick={showNextCard} disabled={activeIndex === filtered.length - 1} className="inline-flex min-h-[46px] flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-40 md:flex-none">
                  Next
                  <ChevronRight className="h-4 w-4" />
                </button>
                <button type="button" onClick={() => setCardStatus('needs-review')} className="min-h-[46px] flex-[1.1] rounded-xl bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-700 md:flex-none">
                  Review
                </button>
                <button type="button" onClick={() => setCardStatus('known')} className="min-h-[46px] flex-[1.1] rounded-xl bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700 md:flex-none">
                  Know it
                </button>
              </div>
            </>
          ) : (
            <EmptyState
              title="No flashcards match this filter."
              description="Relax the filters, upload a new file, or switch decks so you can get back into a useful review loop."
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
        </Surface>
      </div>
    </div>
  )
}

export function MyMaterialsPage() {
  const navigate = useNavigate()
  const profile = useStudySystemStore((state) => state.profile)
  const materialsHydrated = useStudySystemStore((state) => state.materialsHydrated)
  const materials = useStudySystemStore((state) => state.materials)
  const materialFlashcards = useStudySystemStore((state) => state.materialFlashcards)
  const activeMaterialQuizSession = useStudySystemStore((state) => state.activeMaterialQuizSession)
  const importStudyMaterial = useStudySystemStore((state) => state.importStudyMaterial)
  const importStudyMaterialFromUrl = useStudySystemStore((state) => state.importStudyMaterialFromUrl)
  const deleteStudyMaterial = useStudySystemStore((state) => state.deleteStudyMaterial)
  const updateStudyMaterialMeta = useStudySystemStore((state) => state.updateStudyMaterialMeta)
  const regenerateMaterialStudyTools = useStudySystemStore((state) => state.regenerateMaterialStudyTools)
  const approveMaterialStudyTools = useStudySystemStore((state) => state.approveMaterialStudyTools)
  const startMaterialFlashcards = useStudySystemStore((state) => state.startMaterialFlashcards)
  const startMaterialQuiz = useStudySystemStore((state) => state.startMaterialQuiz)
  const saveNote = useStudySystemStore((state) => state.saveNote)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [selectedMaterialId, setSelectedMaterialId] = useState<string | null>(null)
  const [dragActive, setDragActive] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [materialUrl, setMaterialUrl] = useState('')
  const [uploadMessage, setUploadMessage] = useState('')
  const [previewExpanded, setPreviewExpanded] = useState(false)
  const [studyGuideOpen, setStudyGuideOpen] = useState(false)
  const trackCategories = getExamCategories(profile.examTrack ?? 'nclex-rn')

  const selectedMaterial =
    materials.find((material) => material.id === selectedMaterialId) ?? materials[0] ?? null
  const selectedFlashcardCount = selectedMaterial?.generatedFlashcardIds.length ?? 0
  const selectedQuestionCount = selectedMaterial?.generatedQuestionIds.length ?? 0
  const selectedPendingFlashcardCount = selectedMaterial?.pendingFlashcards?.length ?? 0
  const selectedPendingQuestionCount = selectedMaterial?.pendingQuestions?.length ?? 0
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

  const readyCount = materials.filter((item) => item.extractionStatus === 'ready').length
  const errorCount = materials.filter((item) => item.extractionStatus === 'error').length
  const totalGeneratedCards = materialFlashcards.length

  const handleFiles = async (incoming: File[] | FileList) => {
    const files = Array.from(incoming)
    if (!files.length) return
    setUploadMessage('')
    setIsUploading(true)

    for (const file of files) {
      try {
        await importStudyMaterial(file)
      } catch (error) {
        setUploadMessage(
          error instanceof Error ? error.message : 'We could not import that file.',
        )
      }
    }

    setIsUploading(false)
  }

  const handleMaterialUrlImport = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setUploadMessage('')
    setIsUploading(true)

    try {
      await importStudyMaterialFromUrl(materialUrl)
      setMaterialUrl('')
      setUploadMessage('Link imported. Review the generated study tools before saving them to your deck.')
    } catch (error) {
      setUploadMessage(
        error instanceof Error ? error.message : 'We could not import that link.',
      )
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
      id: crypto.randomUUID(),
      title: `${selectedMaterial.displayTitle} review note`,
      body,
      category: selectedMaterial.sourceCategory ?? 'General',
      updatedAt: new Date().toISOString(),
    })
    navigate('/notes')
  }

  if (activeMaterialQuizSession) {
    return <MaterialQuizRunner />
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="My Materials"
        title="Bring your own study guides into the system."
        description="Upload PDFs, DOCX files, or text notes. We extract the content locally, generate proposed study tools, then let you review and approve them before they enter your deck."
        action={
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="nclex-btn-primary inline-flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold"
          >
            <Upload className="h-4 w-4" />
            Upload material
          </button>
        }
      />

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
          <NurseCommandBackdrop className="rounded-[22px] border border-sky-300/20">
            <div className="p-4">
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
                Works best with public text-heavy study pages. If a site blocks browser imports, upload the source file instead.
              </p>
            </form>
            {uploadMessage ? (
              <div className="mt-4 rounded-2xl border border-sky-300/25 bg-sky-400/10 px-4 py-3 text-sm font-semibold text-sky-100">
                {uploadMessage}
              </div>
            ) : null}
            <div className="mt-5 grid gap-3 md:grid-cols-3">
                <CommandMetricCard label="Library" value={`${materials.length}`} detail="Study files" icon={<FolderOpen className="h-4 w-4" />} />
                <CommandMetricCard label="Ready" value={`${readyCount}`} detail="Parsed cleanly" icon={<CheckCircle2 className="h-4 w-4" />} tone="green" />
                <CommandMetricCard label="Approved cards" value={`${totalGeneratedCards}`} detail="Saved to decks" icon={<SquareStack className="h-4 w-4" />} tone="amber" />
            </div>
            </div>
          </NurseCommandBackdrop>

          <Surface>
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="font-serif text-2xl text-[var(--nclex-text)]">Materials library</h3>
                <p className="mt-1 text-sm text-[var(--nclex-text-muted)]">
                  {errorCount
                    ? `${errorCount} item${errorCount === 1 ? '' : 's'} need attention.`
                    : 'Every upload stays separate from your core NCLEX bank.'}
                </p>
              </div>
              <span className="nclex-chip nclex-chip-info">{materials.length} files</span>
            </div>

            <div className="mt-5 space-y-3">
              {materialsHydrated && materials.length ? (
                materials.map((material) => (
                  <button
                    key={material.id}
                    type="button"
                    onClick={() => {
                      setSelectedMaterialId(material.id)
                      setPreviewExpanded(false)
                      setStudyGuideOpen(false)
                    }}
                    className={clsx(
                      'w-full rounded-[18px] border p-4 text-left transition',
                      selectedMaterial?.id === material.id
                        ? 'border-[#c9dbef] bg-[var(--nclex-blue-soft)]'
                        : 'border-[var(--nclex-border)] bg-white hover:border-[#c9dbef]',
                    )}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="nclex-chip nclex-chip-info">{material.fileType.toUpperCase()}</span>
                          <span className={materialStatusClass(material.extractionStatus)}>
                            {material.extractionStatus === 'error'
                              ? 'Needs attention'
                              : material.extractionStatus === 'extracting'
                                ? 'Extracting'
                                : 'Ready'}
                          </span>
                        </div>
                        <p className="mt-3 truncate text-base font-semibold text-[var(--nclex-text)]">
                          {material.displayTitle}
                        </p>
                        <p className="mt-1 text-sm text-[var(--nclex-text-muted)]">
                          Imported {formatImportDate(material.importedAt)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-[var(--nclex-text)]">
                          {material.reviewStatus === 'pending-review'
                            ? `${material.pendingFlashcards?.length ?? 0} pending`
                            : `${material.generatedFlashcardIds.length} cards`}
                        </p>
                        <p className="mt-1 text-xs text-[var(--nclex-text-muted)]">
                          {material.reviewStatus === 'pending-review'
                            ? 'Needs review'
                            : `${material.generatedQuestionIds.length} quiz items`}
                        </p>
                      </div>
                    </div>
                  </button>
                ))
              ) : (
                <EmptyState
                  title="Your materials library is empty."
                  description="Upload a study guide and we'll turn it into a reusable review set."
                />
              )}
            </div>
          </Surface>
        </div>

        <Surface>
          {selectedMaterial ? (
            <div className="space-y-6">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="nclex-chip nclex-chip-info">{selectedMaterial.fileType.toUpperCase()}</span>
                    <span className={materialStatusClass(selectedMaterial.extractionStatus)}>
                      {selectedMaterial.extractionStatus === 'error'
                        ? "We couldn't read this file cleanly"
                        : selectedMaterial.extractionStatus === 'extracting'
                          ? 'Pulling study material into your library'
                          : 'Study tools ready'}
                    </span>
                  </div>
                  <h3 className="mt-3 font-serif text-3xl text-[var(--nclex-text)]">
                    {selectedMaterial.displayTitle}
                  </h3>
                  <p className="mt-2 text-sm leading-7 text-[var(--nclex-text-muted)]">
                    {selectedMaterial.error
                      ? selectedMaterial.error
                      : `${selectedMaterial.textLength.toLocaleString()} characters extracted locally from ${selectedMaterial.filename}.`}
                  </p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <MetricChip label="Flashcards" value={`${selectedFlashcardCount}`} />
                  <MetricChip label="Quiz items" value={`${selectedQuestionCount}`} />
                  {selectedMaterial.reviewStatus === 'pending-review' ? (
                    <MetricChip label="Pending" value={`${selectedPendingFlashcardCount + selectedPendingQuestionCount}`} />
                  ) : null}
                </div>
              </div>

              {selectedMaterial.reviewStatus === 'pending-review' ? (
                <MaterialReviewPanel
                  key={`${selectedMaterial.id}-${selectedPendingFlashcardCount}-${selectedPendingQuestionCount}`}
                  material={selectedMaterial}
                  onApprove={(flashcardDrafts, questionDrafts) =>
                    approveMaterialStudyTools(selectedMaterial.id, flashcardDrafts, questionDrafts)
                  }
                />
              ) : null}

              <div className="grid gap-4 md:grid-cols-[0.9fr_1.1fr]">
                <Surface className="nclex-surface-muted p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--nclex-text-muted)]">
                    Material settings
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
                      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--nclex-text-muted)]">
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
                          <span className="text-sm text-[var(--nclex-text-muted)]">
                            No inferred tags yet.
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </Surface>

                <Surface className="nclex-surface-muted p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--nclex-text-muted)]">
                    Actions
                  </p>
                  <div className="mt-4 flex flex-wrap gap-3">
                    <button
                      type="button"
                      disabled={!selectedMaterial.assets.length}
                      onClick={() => setStudyGuideOpen((current) => !current)}
                      className="nclex-btn-primary inline-flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <BookOpen className="h-4 w-4" />
                      Turn lecture into study guide
                    </button>
                    <button
                      type="button"
                      disabled={!selectedFlashcardCount}
                      onClick={() => {
                        startMaterialFlashcards(selectedMaterial.id)
                        navigate(`/flashcards?materialId=${encodeURIComponent(selectedMaterial.id)}`)
                      }}
                      className="nclex-btn-primary inline-flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Sparkles className="h-4 w-4" />
                      Create flashcards
                    </button>
                    <button
                      type="button"
                      disabled={!selectedQuestionCount}
                      onClick={() =>
                        startMaterialQuiz(selectedMaterial.id, {
                          questionCount: Math.min(5, selectedQuestionCount),
                          title: `Study from ${selectedMaterial.displayTitle}`,
                        })
                      }
                      className="nclex-btn-secondary inline-flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <ArrowRight className="h-4 w-4" />
                      Start quiz
                    </button>
                    <button
                      type="button"
                      onClick={sendToNotes}
                      className="nclex-btn-secondary inline-flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold"
                    >
                      <FileText className="h-4 w-4" />
                      Send to Notes
                    </button>
                    <button
                      type="button"
                      disabled={selectedMaterial.extractionStatus !== 'ready'}
                      onClick={() => void regenerateMaterialStudyTools(selectedMaterial.id)}
                      className="inline-flex items-center gap-2 rounded-xl border border-[var(--nclex-border)] bg-white px-4 py-3 text-sm font-semibold text-[var(--nclex-text-secondary)] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <RefreshCw className="h-4 w-4" />
                      Regenerate
                    </button>
                    <button
                      type="button"
                      onClick={() => void deleteStudyMaterial(selectedMaterial.id)}
                      className="inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700"
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </button>
                  </div>
                </Surface>
              </div>

              {studyGuideOpen && selectedStudyGuide ? (
                <Surface className="nclex-surface-muted p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--nclex-blue)]">
                        Nursing exam study guide
                      </p>
                      <h4 className="mt-2 font-serif text-2xl text-[var(--nclex-text)]">
                        {selectedMaterial.displayTitle}
                      </h4>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        saveNote({
                          id: crypto.randomUUID(),
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
                    <div className="rounded-[18px] border border-[var(--nclex-border)] bg-white p-4 lg:col-span-2">
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--nclex-text-muted)]">
                        Simple summary
                      </p>
                      <p className="mt-2 text-sm leading-7 text-[var(--nclex-text-secondary)]">
                        {selectedStudyGuide.summary}
                      </p>
                    </div>
                    <div className="rounded-[18px] border border-[var(--nclex-border)] bg-white p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--nclex-text-muted)]">
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
                    <div className="rounded-[18px] border border-[var(--nclex-border)] bg-white p-4 lg:col-span-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--nclex-text-muted)]">
                        Study outline
                      </p>
                      <div className="mt-3 grid gap-2 md:grid-cols-2">
                        {selectedStudyGuide.outline.map((item) => (
                          <div
                            key={item}
                            className="rounded-xl bg-[var(--nclex-card-muted)] px-4 py-3 text-sm leading-6 text-[var(--nclex-text-secondary)]"
                          >
                            {item}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </Surface>
              ) : null}

              <Surface className="nclex-surface-muted p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--nclex-text-muted)]">
                      Extracted text preview
                    </p>
                    <h4 className="mt-2 text-lg font-semibold text-[var(--nclex-text)]">
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
                <div className="mt-4 max-h-[360px] overflow-y-auto rounded-[18px] border border-[var(--nclex-border)] bg-white p-4">
                  <pre className="whitespace-pre-wrap text-sm leading-7 text-[var(--nclex-text-secondary)]">
                    {selectedPreviewText || selectedMaterial.preview || 'No readable text preview is available yet.'}
                  </pre>
                </div>
              </Surface>
            </div>
          ) : (
            <EmptyState
              title="Drop your first study guide here."
              description="Your uploads will show up with extracted text and proposed study tools to review before saving."
            />
          )}
        </Surface>
      </div>
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

  const approveDrafts = async () => {
    setIsApproving(true)
    try {
      await onApprove(
        flashcardDrafts.filter((card) => card.front.trim() && card.back.trim()),
        questionDrafts.filter((question) => question.prompt.trim() && question.rationale.trim()),
      )
    } finally {
      setIsApproving(false)
    }
  }

  return (
    <Surface className="border-[#bfdbfe] bg-[#eff6ff] p-4">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--nclex-blue)]">
            Review before saving
          </p>
          <h4 className="mt-2 font-serif text-2xl text-[var(--nclex-text)]">
            Approve generated study tools
          </h4>
          <p className="mt-2 max-w-3xl text-sm leading-7 text-[var(--nclex-text-muted)]">
            These cards and quiz items were generated from {material.displayTitle}. Edit or remove weak items before they enter your flashcard deck and material quiz bank.
          </p>
        </div>
        <button
          type="button"
          disabled={!totalPending || isApproving}
          onClick={() => void approveDrafts()}
          className="nclex-btn-primary inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isApproving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
          Approve and save
        </button>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        <div className="rounded-[18px] border border-[var(--nclex-border)] bg-white p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--nclex-text-muted)]">
                Flashcards
              </p>
              <h5 className="mt-1 font-semibold text-[var(--nclex-text)]">
                {flashcardDrafts.length} proposed cards
              </h5>
            </div>
            <span className="nclex-chip nclex-chip-info">Editable</span>
          </div>
          <div className="mt-4 max-h-[460px] space-y-4 overflow-y-auto pr-1">
            {flashcardDrafts.length ? (
              flashcardDrafts.map((card, index) => (
                <div key={card.id} className="rounded-[16px] border border-[var(--nclex-border)] bg-[var(--nclex-card-muted)] p-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--nclex-blue)]">
                      Card {index + 1}
                    </p>
                    <button
                      type="button"
                      onClick={() => setFlashcardDrafts((current) => current.filter((item) => item.id !== card.id))}
                      className="text-xs font-semibold text-rose-600"
                    >
                      Remove
                    </button>
                  </div>
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

        <div className="rounded-[18px] border border-[var(--nclex-border)] bg-white p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--nclex-text-muted)]">
                Quiz questions
              </p>
              <h5 className="mt-1 font-semibold text-[var(--nclex-text)]">
                {questionDrafts.length} proposed items
              </h5>
            </div>
            <span className="nclex-chip nclex-chip-warning">Review</span>
          </div>
          <div className="mt-4 max-h-[460px] space-y-4 overflow-y-auto pr-1">
            {questionDrafts.length ? (
              questionDrafts.map((question, index) => (
                <div key={question.id} className="rounded-[16px] border border-[var(--nclex-border)] bg-[var(--nclex-card-muted)] p-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--nclex-blue)]">
                      Question {index + 1}
                    </p>
                    <button
                      type="button"
                      onClick={() => setQuestionDrafts((current) => current.filter((item) => item.id !== question.id))}
                      className="text-xs font-semibold text-rose-600"
                    >
                      Remove
                    </button>
                  </div>
                  <Field label="Prompt">
                    <textarea
                      value={question.prompt}
                      rows={3}
                      onChange={(event) => updateQuestionDraft(question.id, { prompt: event.target.value })}
                      className={textareaClass}
                    />
                  </Field>
                  <div className="mt-3 rounded-xl border border-[var(--nclex-border)] bg-white p-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--nclex-text-muted)]">
                      Choices
                    </p>
                    <div className="mt-2 space-y-2">
                      {question.choices.map((choice) => (
                        <p key={choice.id} className="text-sm leading-6 text-[var(--nclex-text-secondary)]">
                          <span className="font-semibold">{choice.id}.</span> {choice.text}
                        </p>
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
  const updateProfile = useStudySystemStore((state) => state.updateProfile)
  const startQuickStudy = useStudySystemStore((state) => state.startQuickStudy)
  const weakAreas = useMemo(
    () => getWeakAreas(attempts, profile.examTrack ?? 'nclex-rn', profile.preferences.analyticsScope ?? 'selected-track'),
    [attempts, profile.examTrack, profile.preferences.analyticsScope],
  )
  const plan = useMemo(() => buildStudyPlan(profile, weakAreas), [profile, weakAreas])
  const activeTrack = getExamTrack(profile.examTrack ?? 'nclex-rn')
  const priorityArea = weakAreas[0]?.category ?? 'prioritization'
  const todayTasks = [
    `Start with ${shortCategoryLabel(priorityArea)}`,
    ...plan.dailyFocus.slice(0, 2),
  ]
  const thisWeekTasks = plan.weeklyGoals.slice(0, 4)
  const laterTasks = plan.recommendedSessions.slice(0, 4)

  return (
    <PageStack>
      <PageHeader
        eyebrow="Study Plan"
        title="One plan, three time horizons."
        description={`A simpler ${activeTrack.shortName} plan: finish today, glance at the week, park the rest for later.`}
        action={
          <button
            type="button"
            onClick={() => {
              startQuickStudy(priorityArea)
              navigate('/quick-study')
            }}
            className="nclex-btn-primary inline-flex min-h-11 items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold"
          >
            <Sparkles className="h-4 w-4" />
            Start today's session
          </button>
        }
      />

      <FocusPanel>
        <div className="grid gap-5 bg-[linear-gradient(135deg,#003b66_0%,#12375a_100%)] px-5 py-5 text-white md:px-6 lg:grid-cols-[minmax(0,1fr)_240px]">
          <div>
            <p className="text-sm font-semibold text-sky-100/85">Today</p>
            <h3 className="mt-3 font-serif text-3xl leading-tight md:text-[2.15rem]">
              {todayTasks[0]}
            </h3>
            <ul className="mt-5 grid gap-3">
              {todayTasks.map((task, index) => (
                <li key={`${task}-${index}`} className="flex items-start gap-3 text-sm leading-6 text-sky-100/88">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
                  <span>{task}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="grid content-start gap-3 rounded-2xl border border-white/15 bg-white/10 p-4">
            <div>
              <p className="text-xs font-semibold text-sky-100/70">Daily goal</p>
              <p className="mt-1 font-semibold">{profile.dailyGoal} questions</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-sky-100/70">Intensity</p>
              <p className="mt-1 font-semibold capitalize">{profile.studyIntensity}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-sky-100/70">Target date</p>
              <p className="mt-1 font-semibold">{profile.examDate}</p>
            </div>
          </div>
        </div>
      </FocusPanel>

      <DetailGrid>
        <Surface>
          <SectionHeading
            title="This Week"
            description="Enough structure to keep momentum without turning the page into a planner."
          />
          <ul className="mt-5 space-y-3 text-sm leading-6 text-slate-700">
            {thisWeekTasks.map((goal) => (
              <li key={goal} className="rounded-2xl bg-[#f7fbfd] px-4 py-3">
                {goal}
              </li>
            ))}
          </ul>
        </Surface>

        <Surface>
          <SectionHeading
            title="Later"
            description="Sessions to pull forward after today's focus is done."
            action={<CalendarClock className="h-5 w-5 text-[#2d77bf]" />}
          />
          <ul className="mt-5 space-y-3 text-sm leading-6 text-slate-700">
            {laterTasks.map((item) => (
              <li key={item} className="rounded-2xl bg-[#f7fbfd] px-4 py-3">
                {item}
              </li>
            ))}
          </ul>
        </Surface>
      </DetailGrid>

      <Surface>
        <SectionHeading
          title="Plan settings"
          description={`This plan is currently biased toward ${priorityArea} because that is where the most score lift is available.`}
        />
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <Field label="Exam date">
            <input type="date" value={profile.examDate} onChange={(event) => updateProfile({ examDate: event.target.value })} className={inputClass} />
          </Field>
          <Field label="Study intensity">
            <select value={profile.studyIntensity} onChange={(event) => updateProfile({ studyIntensity: event.target.value as typeof profile.studyIntensity })} className={selectClass}>
              <option value="steady">Steady</option>
              <option value="focused">Focused</option>
              <option value="accelerated">Accelerated</option>
            </select>
          </Field>
          <Field label="Daily question goal">
            <input type="number" min={5} max={40} value={profile.dailyGoal} onChange={(event) => updateProfile({ dailyGoal: Number(event.target.value) })} className={inputClass} />
          </Field>
        </div>
      </Surface>
    </PageStack>
  )
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

export function ClinicalSimulatorPage() {
  const activeSession = useStudySystemStore((state) => state.activeSession)
  const startClinicalThinking = useStudySystemStore((state) => state.startClinicalThinking)
  const abandonSession = useStudySystemStore((state) => state.abandonSession)
  const [scenarioId, setScenarioId] = useState(clinicalScenarios[0].id)
  const [answers, setAnswers] = useState<Record<number, number>>({})

  const scenario = clinicalScenarios.find((item) => item.id === scenarioId) ?? clinicalScenarios[0]
  const completed = scenario.steps.filter((_, index) => typeof answers[index] === 'number').length

  if (activeSession?.mode === 'clinical-thinking') {
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
            onClick={() => startClinicalThinking('First Action')}
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
            <h3 className="mt-2 font-serif text-3xl text-[var(--nclex-text)]">{scenario.title}</h3>
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

export function StrategyTrainingPage() {
  const activeSession = useStudySystemStore((state) => state.activeSession)
  const startClinicalThinking = useStudySystemStore((state) => state.startClinicalThinking)
  const abandonSession = useStudySystemStore((state) => state.abandonSession)

  if (activeSession?.mode === 'clinical-thinking') {
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
    <div className="space-y-6">
      <PageHeader
        eyebrow="Resources"
        title="Learn how NCLEX wants you to think."
        description="Use these frameworks to eliminate weak answers faster, prioritize safety better, and make your correct answers feel repeatable."
        action={
          <Link
            to="/my-materials"
            className="nclex-btn-secondary inline-flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold"
          >
            <FolderOpen className="h-4 w-4" />
            Upload study material
          </Link>
        }
      />
      <Surface className="overflow-hidden p-0">
        <div className="flex flex-col gap-5 bg-[linear-gradient(135deg,#ffffff_0%,#eef5ff_100%)] px-5 py-6 lg:flex-row lg:items-end lg:justify-between md:px-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--nclex-blue)]">Clinical thinking mode</p>
            <h3 className="mt-3 font-serif text-4xl text-[var(--nclex-text)]">Drill the decision types that move scores.</h3>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--nclex-text-muted)]">
              Practice prioritization, delegation, first-action decisions, and patient safety in short targeted bursts.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            {['Prioritization', 'Delegation', 'First Action', 'Patient Safety'].map((focus) => (
              <button
                key={focus}
                type="button"
                onClick={() => startClinicalThinking(focus)}
                className="nclex-btn-secondary rounded-xl px-4 py-2.5 text-sm font-semibold"
              >
                {focus}
              </button>
            ))}
          </div>
        </div>
      </Surface>
      <div className="grid gap-5">
        {strategyLessons.map((lesson) => (
          <Surface key={lesson.id}>
            <div className="grid gap-5 lg:grid-cols-[0.95fr_1.05fr]">
              <div>
                <p className="nclex-label text-xs font-semibold uppercase">{lesson.framework}</p>
                <h3 className="mt-3 font-serif text-3xl text-[var(--nclex-text)]">{lesson.title}</h3>
                <p className="mt-3 text-sm leading-7 text-[var(--nclex-text-muted)]">{lesson.summary}</p>
                <ul className="mt-5 space-y-3 text-sm leading-6 text-slate-700">
                  {lesson.bullets.map((bullet) => (
                    <li key={bullet}>{bullet}</li>
                  ))}
                </ul>
              </div>
              <div className="rounded-[18px] border border-[#cfe1f7] bg-[#eef5ff] p-5">
                <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
                  <BrainCircuit className="h-3.5 w-3.5" />
                  Mini scenario
                </div>
                <p className="mt-4 font-semibold text-slate-900">{lesson.microScenario.prompt}</p>
                <p className="mt-3 text-sm leading-6 text-slate-700">{lesson.microScenario.bestResponse}</p>
              </div>
            </div>
          </Surface>
        ))}
      </div>
    </div>
  )
}

export function NotesPage() {
  const [searchParams] = useSearchParams()
  const seedCategory = searchParams.get('category')
  const profile = useStudySystemStore((state) => state.profile)
  const notes = useStudySystemStore((state) => state.notes)
  const saveNote = useStudySystemStore((state) => state.saveNote)
  const deleteNote = useStudySystemStore((state) => state.deleteNote)
  const [selectedCategory, setSelectedCategory] = useState<string>(seedCategory ?? 'All')
  const [search, setSearch] = useState('')
  const deferredSearch = useDeferredValue(search)
  const [draft, setDraft] = useState<Note>({
    id: crypto.randomUUID(),
    title: '',
    body: '',
    category: (seedCategory as QuestionCategory) ?? 'General',
    updatedAt: new Date().toISOString(),
  })
  const trackCategories = getExamCategories(profile.examTrack ?? 'nclex-rn')

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
    <div className="space-y-6">
      <PageHeader
        eyebrow="Notes"
        title="Keep your own clinical anchors."
        description="Write what keeps tripping you up, how you want to remember it, and the exact frame that makes the answer click."
        action={
          <Link
            to="/my-materials"
            className="nclex-btn-secondary inline-flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold"
          >
            <Upload className="h-4 w-4" />
            Import study material
          </Link>
        }
      />
      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <Surface>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Category filter">
              <select value={selectedCategory} onChange={(event) => setSelectedCategory(event.target.value)} className={selectClass}>
                <option value="All">All categories</option>
                <option value="General">General</option>
                {trackCategories.map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
            </Field>
            <Field label="Search">
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search your notes" className={inputClass} />
            </Field>
          </div>
          <div className="mt-6 space-y-4">
            {filteredNotes.map((note) => (
              <button
                key={note.id}
                type="button"
                onClick={() => setDraft(note)}
                className="w-full rounded-[28px] border border-slate-200 bg-slate-50 p-4 text-left transition hover:border-slate-300"
              >
                <div className="flex items-center justify-between gap-4">
                  <p className="font-semibold text-slate-900">{note.title}</p>
                  <span className="nclex-chip nclex-chip-info bg-white">
                    {note.category}
                  </span>
                </div>
                <p className="mt-2 line-clamp-2 text-sm leading-6 text-[#4f687a]">{note.body}</p>
              </button>
            ))}
          </div>
        </Surface>
        <Surface>
          <div className="flex items-center justify-between">
            <h3 className="font-serif text-3xl text-[#163042]">{draft.title || 'New note'}</h3>
            <button
              type="button"
              onClick={() =>
                setDraft({
                  id: crypto.randomUUID(),
                  title: '',
                  body: '',
                  category: 'General',
                  updatedAt: new Date().toISOString(),
                })
              }
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
            >
              New note
            </button>
          </div>
          <div className="mt-6 grid gap-4">
            <Field label="Title">
              <input value={draft.title} onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))} placeholder="What concept are you trying to remember?" className={inputClass} />
            </Field>
            <Field label="Category">
              <select value={draft.category} onChange={(event) => setDraft((current) => ({ ...current, category: event.target.value as Note['category'] }))} className={selectClass}>
                <option value="General">General</option>
                {trackCategories.map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
            </Field>
            <Field label="Body">
              <textarea value={draft.body} onChange={(event) => setDraft((current) => ({ ...current, body: event.target.value }))} rows={10} placeholder="Write the pattern, pitfall, or reminder that makes this click for you." className={textareaClass} />
            </Field>
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => saveNote(draft)}
              className="nclex-btn-primary rounded-full px-4 py-2 text-sm font-semibold"
            >
              Save note
            </button>
            <button
              type="button"
              onClick={() => deleteNote(draft.id)}
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700"
            >
              Delete
            </button>
          </div>
        </Surface>
      </div>
    </div>
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

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Settings"
        title="Tune the system to your study style."
        description="Manage your exam track, study preferences, and cloud sync status from one place."
      />
      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <Surface>
          <h3 className="font-serif text-3xl text-[#163042]">Profile preferences</h3>
          <div className="mt-6 grid gap-4">
            <Field label="Display name">
              <input value={profile.name} onChange={(event) => updateProfile({ name: event.target.value })} className={inputClass} />
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
            <ToggleRow label="Reduced motion" description="Simplify motion if you prefer a calmer UI." checked={profile.preferences.reducedMotion} onChange={(value) => updateProfile({ preferences: { ...profile.preferences, reducedMotion: value } })} />
            <ToggleRow label="Study reminders" description="Future-ready notification preference for backend integration." checked={profile.preferences.notifications} onChange={(value) => updateProfile({ preferences: { ...profile.preferences, notifications: value } })} />
          </div>
        </Surface>
        <Surface>
          <h3 className="font-serif text-3xl text-[#163042]">Cloud account & sync</h3>
          <div className="mt-5 rounded-[20px] border border-[var(--nclex-border)] bg-[var(--nclex-card-muted)] p-5">
            <div className="flex items-start gap-4">
              <div className="rounded-2xl bg-[var(--nclex-blue-soft)] p-3 text-[var(--nclex-blue)]">
                {isDemoMode ? <CloudOff className="h-5 w-5" /> : <Cloud className="h-5 w-5" />}
              </div>
              <div>
                <p className="font-semibold text-[var(--nclex-text)]">
                  {authUser ? authUser.email : authConfigured ? 'Local demo mode' : 'Supabase not configured'}
                </p>
                <p className="mt-1 text-sm leading-6 text-[var(--nclex-text-muted)]">
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
                  className="rounded-xl border border-[#ffd1d1] bg-[var(--nclex-danger-soft)] px-4 py-2.5 text-sm font-semibold text-[var(--nclex-danger)]"
                >
                  Sign out
                </button>
              ) : null}
            </div>
          </div>
          <h3 className="mt-7 font-serif text-3xl text-[#163042]">Monetization-ready structure</h3>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <FeatureCallout title="User accounts" description="Supabase Auth now provides real account sessions and password recovery entry points." />
            <FeatureCallout title="Saved progress" description="Attempts, flashcards, notes, materials, and generated study tools can sync to Postgres." />
            <FeatureCallout title="Premium tiers" description="Feature gating can layer on top of existing page and session boundaries." />
            <FeatureCallout title="Retention hooks" description="Quick Study, streaks, weak-area review, and notes already support daily return behavior." />
          </div>
          <button
            type="button"
            onClick={resetProgress}
            className="mt-6 rounded-full border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700"
          >
            Reset local progress
          </button>
        </Surface>
      </div>
    </div>
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
              <h3 className="mt-3 font-serif text-4xl text-[var(--nclex-text)]">{score}% correct</h3>
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
            Back to My Materials
          </button>
        </div>
      </div>
    )
  }

  if (!currentQuestion) {
    return (
      <EmptyState
        title="This material quiz has no available questions."
        description="Go back to My Materials and regenerate the study tools for this file."
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
          className="inline-flex items-center gap-2 rounded-xl border border-[var(--nclex-border)] bg-white px-4 py-2.5 text-sm font-semibold text-[var(--nclex-text-secondary)]"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to My Materials
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
            <h3 className="mt-2 font-serif text-3xl text-[var(--nclex-text)]">
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--nclex-text-muted)]">{label}</p>
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
    <div className="flex items-start justify-between gap-4 rounded-[18px] border border-[var(--nclex-border)] bg-[var(--nclex-card-muted)] p-4">
      <div>
        <p className="font-semibold text-[var(--nclex-text)]">{label}</p>
        <p className="mt-1 text-sm leading-6 text-[var(--nclex-text-muted)]">{description}</p>
      </div>
      <button
        type="button"
        aria-pressed={checked}
        onClick={() => onChange(!checked)}
        className={clsx('relative inline-flex h-7 w-12 rounded-full transition', checked ? 'bg-[var(--nclex-blue)]' : 'bg-slate-300')}
      >
        <span className={clsx('absolute top-1 h-5 w-5 rounded-full bg-white transition', checked ? 'left-6' : 'left-1')} />
      </button>
    </div>
  )
}

function FeatureCallout({ title, description }: { title: string; description: string }) {
  return (
    <div className="nclex-soft-panel rounded-[18px] p-4">
      <p className="font-semibold text-[var(--nclex-text)]">{title}</p>
      <p className="mt-2 text-sm leading-6 text-[var(--nclex-text-muted)]">{description}</p>
    </div>
  )
}

function ExamTrackList({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-[18px] border border-[var(--nclex-border)] bg-[var(--nclex-card-muted)] p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--nclex-blue)]">{title}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {items.map((item) => (
          <span key={item} className="rounded-full border border-[#d7e6f7] bg-white px-3 py-1.5 text-xs font-semibold text-[var(--nclex-text-secondary)]">
            {item}
          </span>
        ))}
      </div>
    </div>
  )
}

function QuickMetric({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="rounded-[18px] border border-[var(--nclex-border)] bg-white p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--nclex-blue)]">{label}</p>
      <p className="mt-2 font-serif text-3xl text-[var(--nclex-text)]">{value}</p>
      <p className="mt-2 text-sm text-[var(--nclex-text-muted)]">{detail}</p>
    </div>
  )
}

function ReviewRow({ icon, title, detail }: { icon: React.ReactNode; title: string; detail: string }) {
  return (
    <div className="rounded-[18px] border border-[var(--nclex-border)] bg-white p-4">
      <div className="flex items-center gap-3 text-[var(--nclex-blue)]">{icon}<p className="font-semibold text-[var(--nclex-text)]">{title}</p></div>
      <p className="mt-2 text-sm leading-6 text-[var(--nclex-text-muted)]">{detail}</p>
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

function MetricChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[18px] border border-[var(--nclex-border)] bg-[var(--nclex-card-muted)] p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--nclex-text-muted)]">{label}</p>
      <p className="mt-2 font-serif text-3xl text-[var(--nclex-text)]">{value}</p>
    </div>
  )
}

function shortCategoryLabel(category: string) {
  return category
    .replace('Leadership / Prioritization / Delegation', 'Leadership')
    .replace('Adult Health / Med-Surg', 'Med Surg')
    .replace('Lab Values / Clinical Judgment', 'Clinical Judgment')
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

function materialStatusClass(status: StudyMaterial['extractionStatus']) {
  if (status === 'ready') return 'nclex-chip nclex-chip-success'
  if (status === 'extracting') return 'nclex-chip nclex-chip-info'
  return 'nclex-chip nclex-chip-danger'
}

function formatImportDate(value: string) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(value))
}

function formatReviewDate(value: string) {
  const date = new Date(value)
  const today = new Date()
  if (date.toDateString() === today.toDateString()) {
    return `today at ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`
  }
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
  }).format(date)
}

const inputClass =
  'nclex-input w-full rounded-xl px-4 py-3 text-sm outline-none transition'
const selectClass = inputClass
const textareaClass = `${inputClass} min-h-[220px]`
