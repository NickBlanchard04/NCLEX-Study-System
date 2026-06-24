import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState, useTransition } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
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
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
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
  ShieldCheck,
  Sparkles,
  SquareStack,
  Target,
  Trash2,
  TrendingDown,
  TrendingUp,
  Upload,
  UploadCloud,
  UserRound,
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
  questionLookup,
} from '../services/study-system'
import {
  ChecklistItem,
  DetailGrid,
  EmptyState,
  FlipCard,
  FocusPanel,
  MasteryPill,
  MetricChip,
  PageHeader,
  PageStack,
  ProgressBar,
  QuickMetric,
  QuestionSessionRunner,
  SectionHeading,
  StatCard,
  Surface,
} from './ui'
import {
  CommandMetricCard,
  CommandProgress,
  MaterialUploadAsset,
  NurseCommandBackdrop,
} from './nurse-command-assets'
import levelBadgeIcon from '../assets/progress-badges/level-shield.png'
import masteryBadgeIcon from '../assets/progress-badges/mastery-emblem.png'
import streakBadgeIcon from '../assets/progress-badges/streak-flame.png'

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

type LaunchTone = 'cyan' | 'emerald' | 'amber' | 'rose' | 'violet'

const launchToneClasses: Record<
  LaunchTone,
  {
    accent: string
    border: string
    surface: string
    icon: string
    text: string
    meta: string
    hover: string
    glow: string
  }
> = {
  cyan: {
    accent: 'bg-cyan-300 shadow-[0_0_18px_rgba(103,232,249,0.75)]',
    border: 'border-cyan-200/55',
    surface: 'bg-gradient-to-br from-cyan-400/[0.26] via-[#06243d]/90 to-[#061426]/92',
    icon: 'border-cyan-200/65 bg-cyan-300/24 text-cyan-50 shadow-[0_0_22px_rgba(34,211,238,0.22)]',
    text: 'text-cyan-50',
    meta: 'border-cyan-100/45 bg-cyan-300/22 text-cyan-50',
    hover: 'hover:border-cyan-100/85 hover:from-cyan-300/[0.32]',
    glow: 'bg-cyan-300/30',
  },
  emerald: {
    accent: 'bg-emerald-300 shadow-[0_0_18px_rgba(110,231,183,0.75)]',
    border: 'border-emerald-200/50',
    surface: 'bg-gradient-to-br from-emerald-400/[0.24] via-[#052a2c]/88 to-[#061426]/92',
    icon: 'border-emerald-200/60 bg-emerald-300/22 text-emerald-50 shadow-[0_0_22px_rgba(52,211,153,0.2)]',
    text: 'text-emerald-50',
    meta: 'border-emerald-100/42 bg-emerald-300/20 text-emerald-50',
    hover: 'hover:border-emerald-100/80 hover:from-emerald-300/[0.3]',
    glow: 'bg-emerald-300/28',
  },
  amber: {
    accent: 'bg-amber-300 shadow-[0_0_18px_rgba(252,211,77,0.75)]',
    border: 'border-amber-200/52',
    surface: 'bg-gradient-to-br from-amber-300/[0.25] via-[#2b2412]/78 to-[#061426]/92',
    icon: 'border-amber-200/62 bg-amber-300/24 text-amber-50 shadow-[0_0_22px_rgba(251,191,36,0.2)]',
    text: 'text-amber-50',
    meta: 'border-amber-100/42 bg-amber-300/22 text-amber-50',
    hover: 'hover:border-amber-100/80 hover:from-amber-300/[0.32]',
    glow: 'bg-amber-300/28',
  },
  rose: {
    accent: 'bg-rose-300 shadow-[0_0_18px_rgba(253,164,175,0.72)]',
    border: 'border-rose-200/50',
    surface: 'bg-gradient-to-br from-rose-400/[0.23] via-[#2b1428]/78 to-[#061426]/92',
    icon: 'border-rose-200/58 bg-rose-300/22 text-rose-50 shadow-[0_0_22px_rgba(251,113,133,0.2)]',
    text: 'text-rose-50',
    meta: 'border-rose-100/42 bg-rose-300/20 text-rose-50',
    hover: 'hover:border-rose-100/78 hover:from-rose-300/[0.3]',
    glow: 'bg-rose-300/26',
  },
  violet: {
    accent: 'bg-violet-300 shadow-[0_0_18px_rgba(196,181,253,0.74)]',
    border: 'border-violet-200/52',
    surface: 'bg-gradient-to-br from-violet-400/[0.24] via-[#1d1b42]/82 to-[#061426]/92',
    icon: 'border-violet-200/62 bg-violet-300/22 text-violet-50 shadow-[0_0_22px_rgba(167,139,250,0.2)]',
    text: 'text-violet-50',
    meta: 'border-violet-100/42 bg-violet-300/21 text-violet-50',
    hover: 'hover:border-violet-100/80 hover:from-violet-300/[0.31]',
    glow: 'bg-violet-300/28',
  },
}

const selectedTaskClasses = {
  border: 'border-amber-200/72',
  surface: 'bg-gradient-to-br from-amber-300/[0.28] via-[#2d2612]/88 to-[#061426]/92',
  icon: 'border-amber-100/70 bg-amber-300/26 text-amber-50 shadow-[0_0_22px_rgba(251,191,36,0.28)]',
  meta: 'border-amber-100/52 bg-amber-300/24 text-amber-50',
  text: 'text-amber-100',
  glow: 'shadow-[0_0_34px_rgba(251,191,36,0.22)]',
  accent: 'bg-amber-300 shadow-[0_0_18px_rgba(252,211,77,0.78)]',
}

export function StudyMenuPage() {
  const navigate = useNavigate()
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const profile = useStudySystemStore((state) => state.profile)
  const attempts = useStudySystemStore((state) => state.attempts)
  const materials = useStudySystemStore((state) => state.materials)
  const importStudyMaterial = useStudySystemStore((state) => state.importStudyMaterial)
  const importStudyMaterialFromUrl = useStudySystemStore((state) => state.importStudyMaterialFromUrl)
  const dashboard = useMemo(() => getDashboardState(profile, attempts), [attempts, profile])
  const analytics = useMemo(() => getAnalyticsSnapshot(attempts, profile), [attempts, profile])
  const [dragActive, setDragActive] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [materialUrl, setMaterialUrl] = useState('')
  const [importMessage, setImportMessage] = useState('')

  const extractingMaterials = materials.filter((item) => item.extractionStatus === 'extracting')
  const weakestCategory = dashboard.weakestCategories[0]?.category ?? 'Pharmacology'
  const planProgress = Math.min(
    100,
    Math.round((dashboard.todayCompleted / Math.max(1, dashboard.dailyGoal)) * 100),
  )
  const accuracyPct = Math.round(analytics.overallAccuracy * 100)
  const answeredCount = attempts.length
  const nurseLevel = Math.max(1, Math.floor(answeredCount / 50) + 1)
  const levelProgress = Math.round(((answeredCount % 50) / 50) * 100)
  const masteryPct = Math.max(1, accuracyPct)
  const streakDays = Math.max(dashboard.streak, 0)
  const todayPriority = dashboard.weakestCategories[0]
    ? 'Train ' + shortCategoryLabel(weakestCategory)
    : dashboard.recommendation.title

  const [activeMenuIndex, setActiveMenuIndex] = useState(0)

  const titleMenuItems = useMemo<Array<LaunchTool & { eyebrow: string; status: string; tone: LaunchTone }>>(
    () => [
      {
        title: 'Start Today',
        eyebrow: 'Plan',
        description: "Today's plan",
        action: 'Open dashboard',
        route: '/dashboard',
        featured: true,
        icon: <Goal className="h-5 w-5" />,
        status: planProgress + '% today',
        tone: 'cyan',
      },
      {
        title: 'Quick Study',
        eyebrow: 'Practice',
        description: '10 min drill',
        action: 'Start drill',
        route: '/quick-study',
        icon: <Zap className="h-5 w-5" />,
        status: shortCategoryLabel(weakestCategory),
        tone: 'amber',
      },
      {
        title: 'Study Plan',
        eyebrow: 'Plan',
        description: 'Today / week / later',
        action: 'View plan',
        route: '/study-plan',
        icon: <CalendarClock className="h-5 w-5" />,
        status: dashboard.todayCompleted + '/' + dashboard.dailyGoal + ' done',
        tone: 'cyan',
      },
      {
        title: 'Question Bank',
        eyebrow: 'Practice',
        description: 'Question sets',
        action: 'Open bank',
        route: '/practice-questions',
        icon: <ClipboardList className="h-5 w-5" />,
        status: Math.max(attempts.length, 1245).toLocaleString() + ' answered',
        tone: 'amber',
      },
      {
        title: 'Performance',
        eyebrow: 'Progress',
        description: 'Signals and trends',
        action: 'Read signals',
        route: '/performance-analytics',
        icon: <BarChart3 className="h-5 w-5" />,
        status: Math.max(1, accuracyPct) + '% accuracy',
        tone: 'emerald',
      },
      {
        title: 'Nurse Lab',
        eyebrow: 'Lab',
        description: 'Games and simulation',
        action: 'Open lab',
        route: '/nurse-command-lab',
        icon: <HeartPulse className="h-5 w-5" />,
        status: '4 modules',
        tone: 'violet',
      },
    ],
    [
      accuracyPct,
      attempts.length,
      dashboard.dailyGoal,
      dashboard.todayCompleted,
      planProgress,
      weakestCategory,
    ],
  )

  const activeTitleItem = titleMenuItems[activeMenuIndex] ?? titleMenuItems[0]

  const progressBadges: Array<{
    label: string
    value: string
    iconSrc: string
    cardClass: string
    iconFrameClass: string
    imageClass: string
    labelClass: string
  }> = [
    {
      label: 'Level',
      value: 'Lv ' + nurseLevel,
      iconSrc: levelBadgeIcon,
      cardClass: 'border-lime-200/70 bg-[linear-gradient(135deg,rgba(163,230,53,0.34),rgba(28,55,10,0.88)_48%,rgba(5,20,14,0.94))] shadow-[inset_0_1px_0_rgba(236,252,203,0.24),0_0_24px_rgba(163,230,53,0.14)]',
      iconFrameClass: 'border-lime-100/50 bg-lime-300/14 shadow-[0_0_18px_rgba(163,230,53,0.2)]',
      imageClass: 'h-10 w-10 drop-shadow-[0_0_10px_rgba(190,242,100,0.52)]',
      labelClass: 'text-lime-100/74',
    },
    {
      label: 'Mastery',
      value: masteryPct + '%',
      iconSrc: masteryBadgeIcon,
      cardClass: 'border-violet-200/76 bg-[linear-gradient(135deg,rgba(167,139,250,0.46),rgba(76,29,149,0.72)_46%,rgba(10,13,34,0.95))] shadow-[inset_0_1px_0_rgba(221,214,254,0.24),0_0_28px_rgba(139,92,246,0.2)]',
      iconFrameClass: 'border-violet-100/50 bg-violet-300/14 shadow-[0_0_20px_rgba(167,139,250,0.22)]',
      imageClass: 'h-11 w-12 max-w-none drop-shadow-[0_0_11px_rgba(167,139,250,0.58)]',
      labelClass: 'text-violet-100/76',
    },
    {
      label: 'Streak',
      value: streakDays + 'd',
      iconSrc: streakBadgeIcon,
      cardClass: 'border-amber-200/72 bg-gradient-to-br from-amber-300/[0.34] via-[#3a2b0f]/88 to-[#071426]/94 shadow-[inset_0_1px_0_rgba(254,240,138,0.24),0_0_26px_rgba(251,191,36,0.17)]',
      iconFrameClass: 'border-amber-100/56 bg-amber-300/16 shadow-[0_0_20px_rgba(251,191,36,0.24)]',
      imageClass: 'h-10 w-10 animate-pulse drop-shadow-[0_0_12px_rgba(251,191,36,0.72)]',
      labelClass: 'text-amber-100/78',
    },
  ]

  const secondaryGroups: Array<{ title: string; description: string; tone: LaunchTone; tools: Array<LaunchTool & { tone: LaunchTone }> }> = [
    {
      title: 'Practice and exams',
      description: 'Deeper test prep when you want a longer session.',
      tone: 'amber',
      tools: [
        {
          title: 'Exam Prep',
          description: 'Review exam strategy and high-yield areas.',
          action: 'Open',
          route: '/exam-prep',
          icon: <BrainCircuit className="h-4 w-4" />,
          tone: 'amber',
        },
        {
          title: 'Take an Exam',
          description: 'Run a timed exam mode session.',
          action: 'Open',
          route: '/test-mode',
          icon: <Clock3 className="h-4 w-4" />,
          tone: 'amber',
        },
        {
          title: 'Train Weak Areas',
          description: 'Target the categories that need attention.',
          action: 'Open',
          route: '/weak-areas',
          icon: <TrendingUp className="h-4 w-4" />,
          tone: 'rose',
        },
      ],
    },
    {
      title: 'Review and reference',
      description: 'Keep recall and notes close without crowding the launcher.',
      tone: 'emerald',
      tools: [
        {
          title: 'Flashcards',
          description: 'Review due cards and imported decks.',
          action: 'Open',
          route: '/flashcards',
          icon: <SquareStack className="h-4 w-4" />,
          tone: 'emerald',
        },
        {
          title: 'Notes',
          description: 'Capture what you need to remember.',
          action: 'Open',
          route: '/notes',
          icon: <NotebookPen className="h-4 w-4" />,
          tone: 'cyan',
        },
        {
          title: 'Resources',
          description: 'Use strategy training and references.',
          action: 'Open',
          route: '/strategy-training',
          icon: <BookOpen className="h-4 w-4" />,
          tone: 'emerald',
        },
      ],
    },
    {
      title: 'System and labs',
      description: 'Materials, preferences, and simulation stay one layer down.',
      tone: 'violet',
      tools: [
        {
          title: 'My Materials',
          description: 'Turn files and links into cards and questions.',
          action: 'Open',
          route: '/my-materials',
          icon: <UploadCloud className="h-4 w-4" />,
          tone: 'violet',
        },
        {
          title: 'Nurse Lab',
          description: 'Games and simulation hub.',
          action: 'Open',
          route: '/nurse-command-lab',
          icon: <Sparkles className="h-4 w-4" />,
          tone: 'violet',
        },
        {
          title: 'Settings',
          description: 'Adjust profile, exam track, and app preferences.',
          action: 'Open',
          route: '/settings',
          icon: <Target className="h-4 w-4" />,
          tone: 'cyan',
        },
      ],
    },
  ]

  const activateTitleMenuItem = useCallback((item: LaunchTool) => {
    if (item.onSelect) {
      item.onSelect()
      return
    }
    navigate(item.route)
  }, [navigate])

  useEffect(() => {
    const handleTitleMenuKeys = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      const targetTag = target?.tagName
      if (targetTag && ['A', 'BUTTON', 'INPUT', 'SELECT', 'TEXTAREA'].includes(targetTag)) return

      if (event.key === 'ArrowDown' || event.key.toLowerCase() === 's') {
        event.preventDefault()
        setActiveMenuIndex((current) => (current + 1) % titleMenuItems.length)
      }

      if (event.key === 'ArrowUp' || event.key.toLowerCase() === 'w') {
        event.preventDefault()
        setActiveMenuIndex((current) => (current - 1 + titleMenuItems.length) % titleMenuItems.length)
      }

      if (event.key === 'Enter') {
        event.preventDefault()
        activateTitleMenuItem(titleMenuItems[activeMenuIndex] ?? titleMenuItems[0])
      }
    }

    window.addEventListener('keydown', handleTitleMenuKeys)
    return () => window.removeEventListener('keydown', handleTitleMenuKeys)
  }, [activeMenuIndex, activateTitleMenuItem, titleMenuItems])

  const handleMenuFiles = async (files: FileList | File[]) => {
    const incomingFiles = Array.from(files)
    if (!incomingFiles.length) return

    setIsImporting(true)
    setImportMessage('Importing ' + incomingFiles.length + ' material' + (incomingFiles.length === 1 ? '' : 's') + '...')
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
    <NurseCommandBackdrop className="min-h-screen w-full overflow-x-hidden px-4 pb-4 pt-3 md:px-7 md:pt-6">
      <div className="mx-auto flex min-h-[calc(100vh-1rem)] max-w-7xl flex-col">
        <main className="relative z-10 flex flex-1 flex-col gap-5">
          <section className="home-title-stage relative isolate grid min-h-[calc(100vh-8.25rem)] overflow-hidden border-y border-cyan-300/18 py-5 lg:min-h-[calc(100vh-7.25rem)] lg:grid-cols-[minmax(0,0.9fr)_minmax(22rem,0.58fr)] lg:items-center lg:gap-8 lg:py-8">
            <div className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgba(56,189,248,0.08)_1px,transparent_1px),linear-gradient(180deg,rgba(56,189,248,0.06)_1px,transparent_1px)] bg-[length:88px_88px]" />
            <div className="home-motion-field pointer-events-none absolute inset-0 -z-10" aria-hidden="true" />
            <div className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgba(2,8,18,0.08),rgba(2,8,18,0.72)_75%,rgba(2,8,18,0.96))]" />
            <div className="pointer-events-none absolute left-0 top-0 h-full w-px bg-cyan-200/25" />
            <div className="pointer-events-none absolute right-0 top-0 h-full w-px bg-cyan-200/12" />
            <button
              type="button"
              onClick={() => navigate('/settings')}
              className="absolute right-3 top-3 z-20 grid h-14 w-14 place-items-center rounded-2xl border border-cyan-200/36 bg-[#03101f]/82 text-cyan-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_0_24px_rgba(56,189,248,0.18)] transition hover:border-cyan-100/70 hover:bg-cyan-300/10 focus:outline-none focus:ring-4 focus:ring-cyan-300/20 sm:right-5 sm:top-5"
              aria-label="Open profile settings"
              title="Profile settings"
            >
              <span className="relative grid h-10 w-10 place-items-center overflow-hidden rounded-full border border-cyan-200/45 bg-[radial-gradient(circle_at_50%_25%,rgba(125,211,252,0.3),rgba(2,8,18,0.9)_72%)]">
                {profile.profileImageDataUrl ? (
                  <img src={profile.profileImageDataUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <UserRound className="h-5 w-5" />
                )}
              </span>
              <span className="absolute bottom-2 right-2 h-3 w-3 rounded-full border-2 border-[#03101f] bg-emerald-300 shadow-[0_0_12px_rgba(110,231,183,0.82)]" />
            </button>

            <div className="min-w-0">
              <div className="mt-3 max-w-4xl pr-14 sm:mt-0">
                <p className="text-sm font-black uppercase tracking-normal text-cyan-200/72">
                  Study. Practice. Lead.
                </p>
                <h1 className="mt-2 text-[clamp(2.85rem,6.4vw,5.8rem)] font-black uppercase leading-[0.86] tracking-normal text-white drop-shadow-[0_0_26px_rgba(125,211,252,0.24)]">
                  Nurse
                  <span className="block text-cyan-100">Command</span>
                </h1>
                <p className="mt-5 max-w-xl text-base leading-7 text-sky-50/76 md:text-lg">
                  Start with one focused win.
                </p>
              </div>

              <div className="mt-7 grid max-w-3xl gap-2" aria-label="Title menu">
                {titleMenuItems.map((item, index) => {
                  const isActive = index === activeMenuIndex
                  const tone = launchToneClasses[item.tone]

                  return (
                    <button
                      key={item.route}
                      type="button"
                      aria-current={isActive ? 'page' : undefined}
                      onClick={() => activateTitleMenuItem(item)}
                      onFocus={() => setActiveMenuIndex(index)}
                      onMouseEnter={() => setActiveMenuIndex(index)}
                      className={clsx(
                        'group flex min-h-[4rem] w-full min-w-0 items-center gap-3 rounded-xl border bg-gradient-to-br px-3 py-2.5 text-left transition focus:outline-none focus:ring-4 focus:ring-cyan-300/20 sm:px-4',
                        isActive
                          ? clsx(selectedTaskClasses.border, selectedTaskClasses.surface, selectedTaskClasses.glow)
                          : clsx('border-sky-200/14 from-sky-300/[0.035] via-[#03101f]/68 to-[#020812]/88 hover:shadow-[0_0_28px_rgba(56,189,248,0.14)]', tone.hover),
                      )}
                    >
                      <span className={clsx('grid h-11 w-11 shrink-0 place-items-center rounded-lg border transition', isActive ? selectedTaskClasses.icon : clsx('border-sky-200/18 bg-sky-300/8 text-sky-100/62 group-hover:border-current group-hover:bg-white/10 group-hover:text-white'))}>
                        {item.icon}
                      </span>
                      <span className="grid min-w-0 flex-1 gap-1 sm:grid-cols-[minmax(0,0.95fr)_minmax(0,0.75fr)] sm:items-center">
                        <span className="flex min-w-0 items-center gap-2">
                          <span className="text-lg font-black text-white">{item.title}</span>
                          <span className={clsx('hidden rounded-md border px-2 py-1 text-xs font-black sm:inline-flex', isActive ? selectedTaskClasses.meta : 'border-sky-200/18 bg-sky-300/8 text-sky-100/58')}>
                            {item.status}
                          </span>
                        </span>
                        <span className="min-w-0 text-sm font-semibold text-sky-50/62 sm:text-right">
                          {item.eyebrow} · {item.description}
                        </span>
                      </span>
                      <ArrowRight className={clsx('h-5 w-5 shrink-0 transition group-hover:translate-x-1', isActive ? selectedTaskClasses.text : 'text-sky-100/42')} />
                    </button>
                  )
                })}
              </div>
            </div>

            <aside className="mt-5 min-w-0 lg:mt-0">
              <div className={clsx('relative overflow-hidden rounded-xl border p-5', selectedTaskClasses.border, selectedTaskClasses.surface, selectedTaskClasses.glow)}>
                <span className={clsx('pointer-events-none absolute inset-x-0 top-0 h-1.5', selectedTaskClasses.accent)} />
                <div className="relative">
                  <p className="text-xs font-black uppercase tracking-normal text-sky-100/62">
                    Selected
                  </p>
                  <div className="mt-3 flex items-center gap-3">
                    <span className={clsx('grid h-12 w-12 shrink-0 place-items-center rounded-lg border', selectedTaskClasses.icon)}>
                      {activeTitleItem.icon}
                    </span>
                    <div className="min-w-0">
                      <h2 className="text-2xl font-black leading-tight text-white">{activeTitleItem.title}</h2>
                      <p className={clsx('mt-2 inline-flex rounded-md border px-2 py-1 text-xs font-black', selectedTaskClasses.meta)}>
                        {activeTitleItem.eyebrow} · {activeTitleItem.status}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => activateTitleMenuItem(activeTitleItem)}
                    className={clsx(
                      'mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-black transition hover:brightness-110 focus:outline-none focus:ring-4 focus:ring-cyan-300/22 sm:w-auto',
                      selectedTaskClasses.border,
                      selectedTaskClasses.icon,
                    )}
                  >
                    {activeTitleItem.action}
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="mt-3 overflow-hidden rounded-xl border border-sky-200/16 bg-[linear-gradient(135deg,rgba(14,165,233,0.11),rgba(2,8,18,0.78)_42%,rgba(16,185,129,0.1))] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-black text-white">Progress badges</p>
                    <p className="mt-1 text-sm font-semibold leading-6 text-sky-50/66">Small wins stack up.</p>
                  </div>
                  <span className="shrink-0 rounded-full border border-amber-200/38 bg-amber-300/14 px-3 py-1 text-xs font-black text-amber-100">
                    {levelProgress}% to Lv {nurseLevel + 1}
                  </span>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2">
                  {progressBadges.map((badge) => (
                    <div key={badge.label} className={clsx('home-progress-badge-card relative min-w-0 overflow-hidden rounded-lg border px-3 py-3', badge.cardClass)}>
                      <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-white/38" />
                      <div className={clsx('flex h-11 w-11 items-center justify-center rounded-xl border', badge.iconFrameClass)}>
                        <img src={badge.iconSrc} alt="" className={clsx('object-contain', badge.imageClass)} />
                      </div>
                      <p className={clsx('mt-3 text-[0.7rem] font-black uppercase tracking-normal', badge.labelClass)}>{badge.label}</p>
                      <p className="mt-1 truncate text-xl font-black leading-none text-white">{badge.value}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-4 rounded-lg border border-cyan-200/16 bg-[#03101f]/58 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs font-black uppercase tracking-normal text-cyan-100/68">Today's momentum</span>
                    <span className="text-sm font-black text-white">{dashboard.todayCompleted}/{dashboard.dailyGoal}</span>
                  </div>
                  <CommandProgress value={planProgress} tone="blue" className="mt-3" />
                  <p className="mt-2 text-xs font-semibold leading-5 text-sky-100/56">{todayPriority}</p>
                </div>
              </div>
            </aside>
          </section>

          <section className="grid gap-3 lg:grid-cols-3" aria-label="Secondary tools">
            {secondaryGroups.map((group) => (
              <section key={group.title} className={clsx('min-w-0 rounded-xl border p-4 shadow-[0_14px_30px_rgba(0,0,0,0.12)]', launchToneClasses[group.tone].border, launchToneClasses[group.tone].surface)}>
                <div className="flex items-start gap-3">
                  <span className={clsx('mt-1 h-9 w-1 shrink-0 rounded-full', launchToneClasses[group.tone].accent)} />
                  <div className="min-w-0">
                    <h2 className="text-base font-black text-white">{group.title}</h2>
                    <p className="mt-1 text-sm leading-6 text-sky-50/66">{group.description}</p>
                  </div>
                </div>
                <div className="mt-4 grid min-w-0 gap-2">
                  {group.tools.map((tool) => (
                    <button
                      key={tool.route}
                      type="button"
                      onClick={() => navigate(tool.route)}
                      className="flex min-h-[4.25rem] w-full min-w-0 items-start gap-3 overflow-hidden rounded-lg border border-sky-200/14 bg-sky-300/[0.05] px-3 py-3 text-left transition hover:border-cyan-200/40 hover:bg-cyan-300/10 focus:outline-none focus:ring-4 focus:ring-sky-300/16 sm:min-h-16"
                    >
                      <span className={clsx('grid h-8 w-8 shrink-0 place-items-center rounded-md border', launchToneClasses[tool.tone].icon)}>
                        {tool.icon}
                      </span>
                      <span className="min-w-0 flex-1 overflow-hidden">
                        <span className="block text-sm font-bold text-white">{tool.title}</span>
                        <span className="block whitespace-normal break-words text-xs leading-4 text-sky-50/58">{tool.description}</span>
                      </span>
                      <ArrowRight className={clsx('mt-2 h-4 w-4 shrink-0', launchToneClasses[tool.tone].text)} />
                    </button>
                  ))}
                </div>
              </section>
            ))}
          </section>

          <section className="grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]" aria-label="User added materials">
            <section className="relative overflow-hidden rounded-xl border border-violet-200/24 bg-[#03101f]/66 p-4">
              <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-violet-300 via-cyan-300 to-emerald-300" />
              <h2 className="text-base font-black text-white">User added materials</h2>
              <p className="mt-1 text-sm leading-6 text-sky-50/66">
                Your uploaded notes, files, and study links stay here when you need them.
              </p>
              <div className="mt-4 rounded-lg border border-violet-200/24 bg-violet-300/[0.1] px-4 py-4">
                <p className="text-xs font-black uppercase tracking-normal text-violet-100/72">Total added</p>
                <p className="mt-1 text-4xl font-black leading-none text-white">{materials.length}</p>
              </div>
              {extractingMaterials.length ? (
                <p className="mt-3 rounded-lg border border-amber-300/22 bg-amber-300/10 px-3 py-2 text-sm font-semibold text-amber-100">
                  {extractingMaterials.length} material import in progress.
                </p>
              ) : null}
            </section>

            <section className="relative overflow-hidden rounded-xl border border-cyan-200/24 bg-[#03101f]/66 p-4">
              <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-cyan-300 via-sky-300 to-amber-300" />
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
              <div className="grid gap-3 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
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

                <form onSubmit={handleUrlImport} className="grid content-start gap-2">
                  <label className="text-sm font-bold text-sky-100/76" htmlFor="home-material-url">
                    Import from link
                  </label>
                  <div className="relative">
                    <Link2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-sky-200/60" />
                    <input
                      id="home-material-url"
                      value={materialUrl}
                      onChange={(event) => setMaterialUrl(event.target.value)}
                      placeholder="Paste a study link"
                      className="h-12 w-full rounded-lg border border-cyan-200/30 bg-[#03101f]/78 pl-10 pr-3 text-sm text-white outline-none transition placeholder:text-sky-200/38 focus:border-cyan-100 focus:ring-4 focus:ring-cyan-300/18"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isImporting || !materialUrl.trim()}
                    className="inline-flex min-h-11 items-center justify-center rounded-lg border border-cyan-100/45 bg-gradient-to-r from-cyan-500 to-sky-500 px-4 py-3 text-sm font-bold text-white shadow-[0_0_22px_rgba(14,165,233,0.18)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isImporting ? 'Importing...' : 'Import link'}
                  </button>
                  {importMessage ? <p className="rounded-lg border border-sky-300/18 bg-sky-400/10 px-3 py-2 text-sm font-semibold text-sky-100">{importMessage}</p> : null}
                </form>
              </div>
            </section>
          </section>
        </main>

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
    startQuickStudy(category)
    navigate('/quick-study')
  }
  const primaryCategory = weakestArea?.category ?? getExamCategories(activeExamTrack.id)[0] ?? 'Pharmacology'
  const missionTitle = priorityRepair
    ? `Repair: ${priorityRepair.routeLabel}`
    : primaryCoverageGap
      ? `Build evidence for ${coverageGapLabel}`
      : weakestArea
        ? `${dashboardCopy.priorityPrefix}: ${shortCategoryLabel(primaryCategory)}`
        : materialsReadyCount
          ? 'Turn one upload into active recall'
          : 'Complete one Quick Study session'
  const missionCopy = priorityRepair
    ? priorityRepair.nextActionCopy
    : primaryCoverageGap
      ? `The engine sees a ${formatEngineReasonLabel(primaryCoverageGap.gapType)} gap here. Build trustworthy signal before treating readiness as settled.`
      : weakestArea
        ? 'Train this first. It is the clearest practice signal for score lift right now.'
        : materialsReadyCount
          ? 'Use your uploaded materials for recall before adding more notes.'
          : 'One focused set gives the dashboard fresh evidence without overloading the day.'
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
      label: 'Today',
      value: `${dashboard.todayCompleted}/${dashboard.dailyGoal}`,
      detail: `${Math.round(todayGoalProgress * 100)}% complete`,
    },
    {
      label: 'Readiness',
      value: readinessBadge,
      detail: `${readinessSnapshot.trustedAttemptCount} trusted attempts`,
    },
    {
      label: 'Repairs',
      value: `${repairQueueCount}`,
      detail: primaryCoverageGap ? `${readinessSnapshot.coverageGaps.length} coverage gaps` : `${formatMinutes(todayMinutes)} today`,
    },
  ]
  const badgeToneClasses = {
    strong: {
      ring: 'border-emerald-300/38 bg-emerald-300/[0.105] text-emerald-100',
      icon: 'bg-emerald-300/16 text-emerald-100',
      progress: 'green' as const,
      label: 'Strong',
    },
    developing: {
      ring: 'border-amber-300/38 bg-amber-300/[0.105] text-amber-100',
      icon: 'bg-amber-300/16 text-amber-100',
      progress: 'amber' as const,
      label: 'Building',
    },
    fragile: {
      ring: 'border-rose-300/38 bg-rose-300/[0.105] text-rose-100',
      icon: 'bg-rose-300/16 text-rose-100',
      progress: 'red' as const,
      label: 'Focus',
    },
    empty: {
      ring: 'border-slate-300/22 bg-slate-300/[0.07] text-slate-100',
      icon: 'bg-slate-300/12 text-slate-100',
      progress: 'blue' as const,
      label: 'No signal',
    },
  }
  const masteryBadges = getExamCategories(activeExamTrack.id)
    .slice(0, 4)
    .map((category, index) => {
      const stat = analytics.categoryStats.find((item) => item.category === category)
      const tone = stat && stat.attemptCount > 0 ? stat.masteryLevel : 'empty'
      const progress = stat && stat.attemptCount > 0 ? stat.accuracy : 0
      const icon =
        index % 3 === 0 ? (
          <HeartPulse className="h-4 w-4" />
        ) : index % 3 === 1 ? (
          <BrainCircuit className="h-4 w-4" />
        ) : (
          <ShieldCheck className="h-4 w-4" />
        )

      return {
        category,
        label: shortCategoryLabel(category),
        progress,
        attempts: stat?.attemptCount ?? 0,
        theme: badgeToneClasses[tone],
        icon,
      }
    })
  const supportActions = planItems.slice(1, 4)

  return (
    <PageStack className="space-y-4 md:space-y-5">
      <FocusPanel>
        <div className="bg-[linear-gradient(135deg,#06294a_0%,#0c3c52_58%,#12375a_100%)] p-5 text-white md:p-6">
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_220px] lg:items-center">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-cyan-200/24 bg-cyan-300/10 px-3 py-1 text-xs font-black uppercase text-cyan-100">
                  {activeExamTrack.shortName}
                </span>
                <span className="rounded-full border border-white/14 bg-white/8 px-3 py-1 text-xs font-black uppercase text-sky-100/70">
                  Exam in {daysUntilExam}d
                </span>
                <span className="rounded-full border border-emerald-200/24 bg-emerald-300/10 px-3 py-1 text-xs font-black uppercase text-emerald-100">
                  {repairQueueCount} repairs
                </span>
              </div>
              <p className="mt-5 text-sm font-black uppercase text-cyan-100/72">Today&apos;s mission</p>
              <h2 className="mt-2 max-w-3xl text-3xl font-black leading-tight text-white md:text-4xl">
                {missionTitle}
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-sky-100/74">
                {missionCopy}
              </p>
              <p className="mt-3 max-w-2xl text-xs font-semibold uppercase tracking-[0.14em] text-sky-100/52">
                Engine pattern: {engineWeakPatternLabel}
              </p>
              <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <button
                  type="button"
                  onClick={planItems[0].onSelect}
                  className="nclex-btn-primary inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-black"
                >
                  {planItems[0].actionLabel}
                  <ArrowRight className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/study-plan')}
                  className="nclex-btn-secondary inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-black"
                >
                  View plan
                  <CalendarClock className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="flex items-center justify-between gap-4 rounded-[1rem] border border-white/14 bg-white/[0.075] p-4 lg:block">
              <div>
                <p className="text-xs font-black uppercase text-sky-100/62">Readiness badge</p>
                <p className="mt-2 max-w-36 text-xs leading-5 text-sky-100/60 lg:mt-3">
                  {readinessSnapshot.trustedAttemptCount} trusted / {readinessSnapshot.practiceAttemptCount} practice attempts.
                </p>
              </div>
              <div
                className={clsx(
                  'flex h-24 w-24 shrink-0 items-center justify-center rounded-full border text-center shadow-[0_0_28px_rgba(125,211,252,0.14)] lg:mt-3 lg:h-28 lg:w-28',
                  readinessTone === 'emerald' && 'border-emerald-200/45 bg-emerald-300/12',
                  readinessTone === 'cyan' && 'border-cyan-200/45 bg-cyan-300/12',
                  readinessTone === 'amber' && 'border-amber-200/45 bg-amber-300/12',
                  readinessTone === 'slate' && 'border-slate-200/25 bg-slate-300/10',
                )}
              >
                <div>
                  <p className="text-3xl font-black text-white">{readinessPercent}%</p>
                  <p className="mt-1 text-xs font-black uppercase text-sky-100/62">{readinessBadge}</p>
                </div>
              </div>
            </div>
          </div>
          <div className="mt-5 grid grid-cols-3 gap-2 border-t border-white/10 pt-4">
            {missionStats.map((stat) => (
              <div key={stat.label} className="min-w-0">
                <p className="truncate text-xs font-black uppercase text-sky-100/54">{stat.label}</p>
                <div className="mt-1">
                  <p className="text-lg font-black leading-tight text-white sm:text-xl">{stat.value}</p>
                  <p className="mt-1 text-xs font-semibold leading-snug text-sky-100/55">{stat.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </FocusPanel>

      <section>
        <div className="mb-3 flex items-end justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase text-sky-100/56">Badge board</p>
            <h3 className="mt-1 text-2xl font-black text-white">Mastery signals</h3>
            <p className="mt-1 text-sm font-semibold text-sky-100/58">
              {primaryConfidenceRisk
                ? `Confidence risk: ${confidenceRiskLabel}`
                : primaryCoverageGap
                  ? `Coverage gap: ${coverageGapLabel}`
                  : `Weakest pattern: ${engineWeakPatternLabel}`}
            </p>
          </div>
          <Link to="/performance-analytics" className="hidden text-sm font-black text-cyan-100 sm:inline-flex">
            Analytics
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-2.5 sm:gap-3 xl:grid-cols-4">
          {masteryBadges.map((badge) => (
            <div key={badge.category} className={clsx('rounded-[1rem] border p-3 sm:p-4', badge.theme.ring)}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2.5">
                  <span className={clsx('inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl', badge.theme.icon)}>
                    {badge.icon}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-black text-white">{badge.label}</p>
                    <p className="mt-1 text-xs font-semibold text-sky-100/58">{badge.attempts} attempts</p>
                  </div>
                </div>
                <span className="rounded-full border border-white/12 bg-white/8 px-2 py-1 text-[0.68rem] font-black text-sky-100">
                  {badge.theme.label}
                </span>
              </div>
              <div className="mt-4">
                <ProgressBar value={badge.progress} tone={badge.theme.progress} />
              </div>
              <p className="mt-2 text-xs font-semibold text-sky-100/55">
                {badge.attempts ? `${Math.round(badge.progress * 100)}% current accuracy` : 'Complete practice to unlock.'}
              </p>
            </div>
          ))}
        </div>
      </section>

      <DetailGrid className="xl:grid-cols-[0.9fr_1.1fr]">
        <Surface>
          <SectionHeading
            title="Next best actions"
            description="Only the work that should influence today."
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
                  <span className="block text-sm font-black text-white">{item.label}</span>
                  <span className="mt-0.5 block text-xs font-semibold text-sky-100/52">{item.meta}</span>
                </span>
                <span className="text-xs font-black uppercase text-cyan-100">{item.actionLabel}</span>
              </button>
            ))}
          </div>
          <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.035] p-4">
            <p className="text-xs font-black uppercase text-sky-100/48">Materials</p>
            <p className="mt-2 text-sm font-semibold leading-6 text-sky-100/68">
              {materialsReadyCount} ready file{materialsReadyCount === 1 ? '' : 's'}
              {materialsNeedingAttention ? `, ${materialsNeedingAttention} need attention.` : ', ready to review.'}
            </p>
          </div>
        </Surface>

        <Surface>
          <SectionHeading
            title="Focus lane"
            description="Weak areas stay compact until you want the full review view."
            action={<Link to="/weak-areas" className="text-sm font-black text-cyan-100">See all</Link>}
          />
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {dashboard.weakestCategories.slice(0, 2).map((area, index) => {
              const actionVerb = index === 0 ? 'Train' : 'Review'
              return (
                <div key={area.category} className="rounded-[1rem] border border-cyan-200/15 bg-sky-300/[0.055] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-black text-white">{shortCategoryLabel(area.category)}</p>
                    <MasteryPill mastery={area.masteryLevel} />
                  </div>
                  <p className="mt-2 text-sm leading-6 text-sky-100/62">{area.suggestedAction}</p>
                  <ProgressBar
                    value={area.accuracy}
                    className="mt-4"
                    tone={area.masteryLevel === 'strong' ? 'green' : area.masteryLevel === 'developing' ? 'amber' : 'red'}
                  />
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <div className="rounded-xl border border-cyan-200/12 bg-[#03101f]/36 p-3">
                      <p className="text-[0.68rem] font-black uppercase tracking-[0.14em] text-sky-100/50">Mismatch</p>
                      <p className="mt-1 text-lg font-black text-white">{Math.round(area.confidenceMismatchScore * 100)}%</p>
                    </div>
                    <div className="rounded-xl border border-cyan-200/12 bg-[#03101f]/36 p-3">
                      <p className="text-[0.68rem] font-black uppercase tracking-[0.14em] text-sky-100/50">Flags</p>
                      <p className="mt-1 text-lg font-black text-white">{area.flaggedCount}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      startQuickStudy(area.category)
                      navigate('/quick-study')
                    }}
                    className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-cyan-200/25 bg-cyan-300/10 px-4 py-2.5 text-sm font-black text-cyan-100 transition hover:border-cyan-200/50 hover:bg-cyan-300/16"
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
                <p className="text-xs font-black uppercase text-sky-100/48">Progress snapshot</p>
                <p className="mt-1 text-sm font-semibold text-sky-100/68">{activeExamTrack.title}</p>
              </div>
              <p className="text-sm font-black text-white">{dashboardCopy.examLabel}</p>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {[
                { label: 'Readiness', value: readinessBadge, detail: `${readinessPercent}% signal` },
                { label: 'Repairs', value: `${repairQueueCount}`, detail: `${readinessSnapshot.coverageGaps.length} gaps` },
                { label: 'Pattern', value: engineWeakPatternLabel, detail: primaryConfidenceRisk ? confidenceRiskLabel : 'engine signal' },
              ].map((metric) => (
                <div key={metric.label} className="min-w-0 border-t border-cyan-200/16 pt-3 first:border-t-0 first:pt-0 sm:border-l sm:border-t-0 sm:pl-3 sm:pt-0 sm:first:border-l-0 sm:first:pl-0">
                  <p className="truncate text-[0.68rem] font-black uppercase text-sky-100/46">{metric.label}</p>
                  <p className="mt-1 text-sm font-black leading-tight text-white">{metric.value}</p>
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
  const launchPracticeSession = (overrides: Partial<Parameters<typeof startPracticeSession>[0]> = {}) =>
    startTransition(() =>
      startPracticeSession({
        category,
        system,
        board,
        questionStatus,
        format,
        difficulty,
        questionCount,
        ...overrides,
      }),
    )
  const priorityCategory = category === 'All' ? trackCategories[0] : category
  const practicePresets = [
    {
      title: 'Adaptive practice',
      description: 'Mixed questions from the selected track and filters.',
      action: 'Recommended',
      config: {},
    },
    {
      title: 'Repair missed questions',
      description: 'Five missed items for a short remediation loop.',
      action: 'Repair misses',
      config: { category: priorityCategory, questionStatus: 'incorrect' as const, questionCount: 5 },
    },
    {
      title: 'New questions only',
      description: 'Unused items for a cleaner read on readiness.',
      action: 'Fresh set',
      config: { questionStatus: 'unused' as const, questionCount: 10 },
    },
  ]

  if (activeSession?.mode === 'practice') {
    return (
      <QuestionSessionRunner
        key={`${activeSession.id}-${activeSession.currentIndex}`}
        session={activeSession}
        modeLabel="Practice Set"
        onExit={abandonSession}
      />
    )
  }

  return (
    <PageStack>
      <PageHeader
        eyebrow="Question Bank"
        title="Choose the next practice set."
        description={`Build a ${activeTrack.shortName} set from the bank. Use Quick Study for a short weak-area sprint.`}
        action={
          <button
            type="button"
            onClick={() => launchPracticeSession()}
            className="nclex-btn-primary inline-flex min-h-[48px] items-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold"
          >
            {isPending ? 'Building set...' : 'Start focused set'}
            <ArrowRight className="h-4 w-4" />
          </button>
        }
      />
      <FocusPanel className="nclex-dark-panel text-white">
        <div className="grid gap-5 p-5 md:p-6 xl:grid-cols-[minmax(0,1fr)_22rem] xl:items-stretch">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-200">Next practice set</p>
            <h3 className="mt-3 text-3xl font-black tracking-[-0.04em] text-white md:text-5xl">
              {category === 'All' ? 'Mixed adaptive set' : category}
            </h3>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-sky-100/72">
              {questionCount} questions, {difficulty === 'adaptive' ? 'adaptive difficulty' : `${difficulty} difficulty`}, {format === 'mixed' ? 'mixed formats' : format.replaceAll('-', ' ')}.
              Start with a preset, then tune the bank only when the session needs a narrower target.
            </p>
            <div className="mt-6 grid gap-3 md:grid-cols-3">
              {practicePresets.map((preset, index) => (
                <button
                  key={preset.title}
                  type="button"
                  onClick={() => launchPracticeSession(preset.config)}
                  className={clsx(
                    'min-h-[9rem] rounded-2xl border p-4 text-left transition active:scale-[0.99]',
                    index === 0
                      ? 'border-cyan-200/45 bg-cyan-300/14 shadow-[0_0_30px_rgba(56,189,248,0.16)]'
                      : 'border-cyan-200/18 bg-white/[0.045] hover:border-cyan-200/42 hover:bg-cyan-300/10',
                  )}
                >
                  <span className="text-xs font-black uppercase tracking-[0.14em] text-cyan-100/72">
                    {preset.action}
                  </span>
                  <span className="mt-3 block text-lg font-black text-white">{preset.title}</span>
                  <span className="mt-2 block text-sm leading-6 text-sky-100/62">{preset.description}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
            <QuickMetric label="Questions" value={`${questionCount}`} detail="Current custom set length." />
            <QuickMetric label="Track" value={activeTrack.shortName} detail="Blueprint-aligned bank." />
            <QuickMetric label="Review" value="Instant" detail="Rationale after every answer." />
          </div>
        </div>
      </FocusPanel>

      <div className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
        <Surface>
          <SectionHeading
            title="Adjust the set"
            description="Keep the defaults unless you need a category, system, or missed-question repair."
          />
          <div className="mt-5 grid gap-4 md:grid-cols-2">
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
            onClick={() => launchPracticeSession()}
            className="nclex-btn-secondary mt-6 inline-flex min-h-[48px] items-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold"
          >
            {isPending ? 'Building set...' : 'Start with these settings'}
            <ArrowRight className="h-4 w-4" />
          </button>
        </Surface>

        <Surface>
          <SectionHeading
            title="After this set"
            description="After a set, missed items move into remediation and performance updates."
          />
          <div className="mt-5 grid gap-3">
            <Link
              to="/weak-areas"
              className="rounded-2xl border border-cyan-300/20 bg-cyan-300/[0.06] p-4 transition hover:border-cyan-200/55 hover:bg-cyan-300/12"
            >
              <p className="text-sm font-black text-white">Open remediation</p>
              <p className="mt-1 text-sm leading-6 text-sky-100/64">Turn missed categories into a repair queue.</p>
            </Link>
            <Link
              to="/performance-analytics"
              className="rounded-2xl border border-emerald-300/20 bg-emerald-300/[0.055] p-4 transition hover:border-emerald-200/55 hover:bg-emerald-300/12"
            >
              <p className="text-sm font-black text-white">Check performance</p>
              <p className="mt-1 text-sm leading-6 text-sky-100/64">See whether practice is improving readiness signal.</p>
            </Link>
            <ChecklistItem label="Answer, confidence, rationale, next action" completed meta="Session loop" />
            <ChecklistItem label="Flag confusing items without leaving the set" completed={false} meta="Optional" />
          </div>
        </Surface>
      </div>
    </PageStack>
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
    <PageStack>
      <PageHeader
        eyebrow="Quick Study"
        title="Start the rep. Repair one pattern."
        description="A five-question clinical sprint with the rationale, confidence check, and next move kept close to the answer."
        action={
          <button
            type="button"
            onClick={() => startQuickStudy()}
            className="nclex-btn-primary inline-flex min-h-[48px] items-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold"
          >
            <Sparkles className="h-4 w-4" />
            Start 5 questions
          </button>
        }
      />
      <FocusPanel className="nclex-dark-panel text-white">
        <div className="grid gap-5 p-5 md:p-6 xl:grid-cols-[minmax(0,1fr)_18rem] xl:items-end">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-200">Next five questions</p>
            <h3 className="mt-3 max-w-3xl text-3xl font-black tracking-[-0.04em] text-white md:text-5xl">
              {weakArea?.category ?? getExamCategories(activeTrack.id)[0]}
            </h3>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-sky-100/72">
              {weakArea
                ? `${Math.round(weakArea.accuracy * 100)}% accuracy here. Keep this short: answer, review, choose confidence, then move.`
                : 'No attempt history yet. Start with high-yield safety and prioritization questions, then let the engine find the first repair pattern.'}
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <button
                type="button"
                onClick={() => startQuickStudy()}
                className="nclex-btn-primary inline-flex min-h-[52px] items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-black"
              >
                Start 5 questions
                <ArrowRight className="h-4 w-4" />
              </button>
              <Link
                to="/study-plan"
                className="nclex-btn-secondary inline-flex min-h-[52px] items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-black"
              >
                View plan
                <CalendarClock className="h-4 w-4" />
              </Link>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 xl:grid-cols-1">
            <QuickMetric label="Set" value="5" detail="Short rep." />
            <QuickMetric label="Review" value="Now" detail="Rationale after submit." />
            <QuickMetric label="Finish" value="Repair" detail="Next action at the end." />
          </div>
        </div>
      </FocusPanel>

      <div className="grid gap-5 lg:grid-cols-3">
        <Surface>
          <SectionHeading title="1. Decide" description="Read the scenario, choose the safest answer, and submit without hunting through side panels." />
        </Surface>
        <Surface>
          <SectionHeading title="2. Review" description="The rationale opens after the answer so the clinical decision stays primary." />
        </Surface>
        <Surface>
          <SectionHeading title="3. Repair" description="The finish screen turns misses into a remediation or focused practice route." />
        </Surface>
      </div>
    </PageStack>
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

  return (
    <PageStack>
      <PageHeader
        eyebrow="Remediation"
        title="Repair the pattern, then prove transfer."
        description={`${activeTrack.shortName} weak areas now start with the next repair action. Details stay below the fold so remediation feels direct, not punitive.`}
        action={
          priorityArea ? (
            <button
              type="button"
              onClick={() => startRepairSet(priorityArea.category)}
              className="nclex-btn-primary inline-flex min-h-[48px] items-center gap-2 rounded-xl px-5 py-3 text-sm font-black"
            >
              Start repair set
              <ArrowRight className="h-4 w-4" />
            </button>
          ) : null
        }
      />

      {priorityArea ? (
        <FocusPanel className="nclex-dark-panel text-white">
          <div className="grid gap-5 p-5 md:p-6 xl:grid-cols-[1fr_0.76fr] xl:items-center">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-200">Next repair</p>
              <h3 className="mt-3 text-3xl font-black tracking-[-0.04em] text-white md:text-5xl">
                Train {shortCategoryLabel(priorityArea.category)}
              </h3>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-sky-100/72">
                {priorityArea.suggestedAction} Then answer a short transfer set to prove the pattern changed.
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                {priorityArea.commonMistakes.slice(0, 3).map((mistake) => (
                  <span key={mistake} className="rounded-full border border-rose-300/30 bg-rose-300/10 px-3 py-1.5 text-xs font-black uppercase tracking-[0.14em] text-rose-100">
                    {mistake}
                  </span>
                ))}
              </div>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <button
                  type="button"
                  onClick={() => startRepairSet(priorityArea.category)}
                  className="nclex-btn-primary inline-flex min-h-[52px] items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-black"
                >
                  Start {shortCategoryLabel(priorityArea.category)} repair
                  <ArrowRight className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => navigate(`/flashcards?category=${encodeURIComponent(priorityArea.category)}`)}
                  className="nclex-btn-secondary inline-flex min-h-[52px] items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-black"
                >
                  Review cards
                  <SquareStack className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
              <QuickMetric label="Accuracy" value={`${Math.round(priorityArea.accuracy * 100)}%`} detail={`${priorityArea.attemptCount} attempts`} />
              <QuickMetric label="Open repairs" value={`${getRepairCountForCategory(priorityArea.category)}`} detail="Misses or active repair routes." />
              <QuickMetric label="Mismatch" value={`${Math.round(priorityArea.confidenceMismatchScore * 100)}%`} detail="Confidence calibration risk." />
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
              className="nclex-btn-primary rounded-xl px-4 py-3 text-sm font-black"
            >
              Start practice
            </button>
          }
        />
      )}

      <DetailGrid>
        <Surface>
          <SectionHeading
            title="Repair queue"
            description="Train the first item now. The rest are backup lanes, not equal priorities."
            action={<span className="nclex-chip nclex-chip-warning">{activeRepairs.length} active</span>}
          />
          <div className="mt-5 grid gap-4">
            {weakAreas.slice(0, 4).map((area, index) => (
              <div key={area.category} className="rounded-2xl border border-cyan-200/15 bg-sky-300/[0.055] p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full border border-cyan-300/24 bg-cyan-300/10 px-2.5 py-1 text-xs font-black text-cyan-100">
                        {index === 0 ? 'Next' : `Later ${index}`}
                      </span>
                      <MasteryPill mastery={area.masteryLevel} />
                    </div>
                    <h3 className="mt-3 text-xl font-black tracking-[-0.03em] text-white">
                      {shortCategoryLabel(area.category)}
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-sky-100/65">{area.suggestedAction}</p>
                  </div>
                  <div className="grid min-w-[138px] grid-cols-2 gap-2 text-center">
                    <div className="rounded-xl border border-cyan-300/15 bg-white/[0.04] p-3">
                      <p className="text-lg font-black text-white">{Math.round(area.accuracy * 100)}%</p>
                      <p className="text-xs font-semibold text-sky-100/55">accuracy</p>
                    </div>
                    <div className="rounded-xl border border-cyan-300/15 bg-white/[0.04] p-3">
                      <p className="text-lg font-black text-white">{getRepairCountForCategory(area.category)}</p>
                      <p className="text-xs font-semibold text-sky-100/55">repairs</p>
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
                    className="nclex-btn-primary inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-black"
                  >
                    Train {shortCategoryLabel(area.category)}
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate(`/notes?category=${encodeURIComponent(area.category)}`)}
                    className="nclex-btn-secondary inline-flex min-h-[44px] items-center justify-center rounded-xl px-4 py-2.5 text-sm font-black"
                  >
                    Open notes
                  </button>
                </div>
              </div>
            ))}
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
                <p className="text-sm font-black text-white">{item}</p>
              </div>
            ))}
          </div>
          <div className="mt-5 rounded-2xl border border-amber-300/20 bg-amber-300/10 p-4">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-amber-200">Next best action</p>
            <p className="mt-2 text-sm leading-7 text-sky-100/72">{readiness.nextBestAction}</p>
          </div>
          {readiness.coverageGaps.length ? (
            <div className="mt-5 grid gap-3">
              {readiness.coverageGaps.slice(0, 3).map((gap, index) => (
                <div key={`${gap.dimensionType}-${gap.dimensionId}-${index}`} className="rounded-2xl border border-cyan-200/15 bg-white/[0.035] p-4">
                  <p className="font-black text-white">{gap.dimensionId.replaceAll('_', ' ')}</p>
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

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Performance Analytics"
        title="One readout. One next move."
        description={`${activeTrack.shortName} performance should explain what changed, what matters, and where to act next.`}
        action={
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
                  'rounded-lg px-3 py-2 text-xs font-black transition',
                  (profile.preferences.analyticsScope ?? 'selected-track') === item.value
                    ? 'bg-cyan-300 text-[#04101f] shadow-[0_0_18px_rgba(56,189,248,0.28)]'
                    : 'text-sky-100/62 hover:text-sky-100',
                )}
              >
                {item.label}
              </button>
            ))}
          </div>
        }
      />

      <FocusPanel>
        <div className="grid gap-5 bg-[linear-gradient(135deg,#003b66_0%,#12375a_100%)] px-5 py-5 text-white md:px-6 lg:grid-cols-[minmax(0,1fr)_260px]">
          <div>
            <p className="text-sm font-semibold text-sky-100/85">Main takeaway</p>
            <h3 className="mt-3 font-serif text-3xl leading-tight md:text-[2.15rem]">
              {performanceTakeaway}
            </h3>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-sky-100/82">
              Readiness is practice evidence from your activity in Nurse Command. It is not a licensure prediction, clinical advice, or a substitute for official exam guidance.
            </p>
            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Link
                to="/weak-areas"
                className="nclex-btn-primary inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-black"
              >
                Open remediation
                <Target className="h-4 w-4" />
              </Link>
              <Link
                to="/practice-questions"
                className="nclex-btn-secondary inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-black"
              >
                Start practice
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
          <div className="rounded-2xl border border-white/15 bg-white/10 p-4">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-sky-100/70">Readiness</p>
            <p className="mt-2 text-3xl font-black">{readinessLabel}</p>
            <p className="text-sm font-semibold text-sky-100/75">{Math.round(readiness.readinessScore * 100)}% readiness score</p>
            <p className="mt-2 text-xs font-bold uppercase tracking-[0.14em] text-sky-100/60">
              Practice evidence only
            </p>
            <div className="mt-4">
              <ProgressBar
                value={readiness.readinessScore}
                tone={readiness.status === 'ready' ? 'green' : readiness.status === 'approaching' ? 'blue' : 'amber'}
              />
            </div>
          </div>
        </div>
      </FocusPanel>

      <div className="grid gap-5 md:grid-cols-3">
        <StatCard
          label="Practice accuracy"
          value={`${Math.round(readiness.practiceAccuracy * 100)}%`}
          detail={`${analytics.questionsCompleted} questions completed`}
          tone={readiness.practiceAccuracy >= 0.75 ? 'success' : 'warning'}
          statusLabel={readiness.practiceAccuracy >= 0.75 ? 'On track' : 'Focus'}
        />
        <StatCard
          label="Trusted evidence"
          value={`${readiness.trustedAttemptCount}`}
          detail={`${readiness.practiceAttemptCount} practice attempts available`}
          tone={readiness.status === 'ready' ? 'success' : readiness.status === 'approaching' ? 'neutral' : 'warning'}
          statusLabel={readinessLabel}
        />
        <StatCard
          label="Repair queue"
          value={`${repairQueueCount}`}
          detail="High-confidence or safety-sensitive misses needing transfer proof."
          tone={repairQueueCount ? 'warning' : 'success'}
          statusLabel={repairQueueCount ? 'Repair' : 'Clear'}
        />
      </div>
      <Surface>
        <SectionHeading
          title="Accuracy Trend"
          description="The single chart worth checking first: daily accuracy over the last seven days."
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
                    <p className="font-black text-white">{shortCategoryLabel(category.category)}</p>
                    <p className="mt-1 text-sm text-sky-100/60">
                      {category.attemptCount} attempts · {Math.round(category.confidenceMismatchScore * 100)}% confidence mismatch
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
                    className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-cyan-300/24 bg-cyan-300/10 px-4 py-2 text-sm font-black text-cyan-100 transition hover:border-cyan-200/60 hover:bg-cyan-300/16"
                  >
                    Repair target
                    <Target className="h-4 w-4" />
                  </Link>
                  <Link
                    to="/practice-questions"
                    className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-black text-sky-100/76 transition hover:border-cyan-200/40 hover:text-white"
                  >
                    Practice set
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
            description="Practice signal, readiness evidence, and repair logic stay separated."
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

      <Surface>
        <SectionHeading
          title="History & Details"
          description="Lower-priority context for the current readout. Use this after the main takeaway and repair targets."
        />
        <div className="mt-5 grid gap-3 md:grid-cols-4">
          <MetricChip label="Questions" value={`${analytics.questionsCompleted}`} />
          <MetricChip label="Trusted attempts" value={`${readiness.trustedAttemptCount}`} />
          <MetricChip label="Coverage gaps" value={`${readiness.coverageGaps.length}`} />
          <MetricChip label="Scope" value={(profile.preferences.analyticsScope ?? 'selected-track') === 'selected-track' ? activeTrack.shortName : 'All exams'} />
        </div>
        <div className="mt-5 rounded-2xl border border-cyan-200/15 bg-sky-300/[0.045] p-4">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-sky-100/56">Method note</p>
          <p className="mt-2 text-sm leading-7 text-sky-100/70">
            Performance separates practice attempts, trusted evidence, confidence mismatches, and coverage gaps so the next action stays about learning behavior rather than a single chart line.
          </p>
        </div>
      </Surface>
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
  const [studyPlanToday] = useState(() => new Date().toISOString().slice(0, 10))
  const [studyPlanNowMs] = useState(() => new Date().getTime())
  const weakAreas = useMemo(
    () => getWeakAreas(attempts, profile.examTrack ?? 'nclex-rn', profile.preferences.analyticsScope ?? 'selected-track'),
    [attempts, profile.examTrack, profile.preferences.analyticsScope],
  )
  const plan = useMemo(() => buildStudyPlan(profile, weakAreas), [profile, weakAreas])
  const activeTrack = getExamTrack(profile.examTrack ?? 'nclex-rn')
  const priorityArea = weakAreas[0]?.category ?? 'prioritization'
  const todayCompleted = useMemo(() => {
    return attempts.filter((attempt) => attempt.completedAt.slice(0, 10) === studyPlanToday).length
  }, [attempts, studyPlanToday])
  const todayProgress = profile.dailyGoal ? todayCompleted / profile.dailyGoal : 0
  const daysUntilExam = Math.max(
    0,
    Math.ceil((new Date(profile.examDate).getTime() - studyPlanNowMs) / (1000 * 60 * 60 * 24)),
  )
  const todayTasks = [
    {
      title: `Priority drill: ${shortCategoryLabel(priorityArea)}`,
      detail: `${Math.max(5, Math.min(profile.dailyGoal, 15))} focused questions before anything else.`,
      meta: 'Next Action',
    },
    {
      title: 'Review the misses',
      detail: plan.dailyFocus[1] ?? 'Use rationales and notes to repair the decision pattern.',
      meta: 'Later Today',
    },
    {
      title: 'Lock one recall set',
      detail: plan.dailyFocus[2] ?? 'Run a short flashcard pass for the next weak category.',
      meta: 'Extra Time',
    },
  ]
  const thisWeekTasks = plan.weeklyGoals.slice(0, 4)
  const laterTasks = plan.recommendedSessions.slice(0, 4)

  return (
    <PageStack>
      <PageHeader
        eyebrow="Study Plan"
        title="Today first. The rest can wait."
        description={`A simpler ${activeTrack.shortName} plan: one action now, a small weekly lane, and later work kept out of the way.`}
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
        <div className="bg-[linear-gradient(135deg,#003b66_0%,#12375a_100%)] px-5 py-5 text-white md:px-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <p className="text-sm font-semibold text-sky-100/85">Next Action</p>
              <h3 className="mt-3 font-serif text-3xl leading-tight md:text-[2.15rem]">
                Start with {shortCategoryLabel(priorityArea)}
              </h3>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-sky-100/82">
                Run the priority drill first. Everything else on the plan stays secondary until this repair set is complete.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-2 lg:w-[22rem]">
              {[
                { label: 'Questions', value: `${Math.max(5, Math.min(profile.dailyGoal, 15))}` },
                { label: 'Completed', value: `${todayCompleted}` },
                { label: 'Exam', value: `${daysUntilExam}d` },
              ].map((item) => (
                <div key={item.label} className="rounded-2xl border border-white/15 bg-white/10 px-3 py-3 text-center">
                  <p className="text-lg font-black text-white">{item.value}</p>
                  <p className="mt-1 text-[0.68rem] font-black uppercase tracking-[0.12em] text-sky-100/62">{item.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </FocusPanel>

      <Surface>
        <SectionHeading
          title="Today"
          description="A small sequence: do the repair set, review what broke, then decide whether to keep going."
        />
        <div className="mt-5 grid gap-3">
          {todayTasks.map((task, index) => (
            <div key={task.title} className="rounded-2xl border border-cyan-200/15 bg-sky-300/[0.055] px-4 py-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex min-w-0 gap-3">
                  <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-cyan-300/12 text-sm font-black text-cyan-100">
                    {index + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="font-black text-white">{task.title}</p>
                    <p className="mt-1 text-sm leading-6 text-sky-100/70">{task.detail}</p>
                  </div>
                </div>
                <span className="w-fit shrink-0 rounded-full border border-cyan-200/25 bg-cyan-300/10 px-3 py-1 text-xs font-black uppercase tracking-[0.14em] text-cyan-100">
                  {task.meta}
                </span>
              </div>
            </div>
          ))}
        </div>
      </Surface>

      <DetailGrid>
        <Surface>
          <SectionHeading
            title="This Week"
            description="Only the weekly commitments that should influence today."
          />
          <ul className="mt-5 space-y-3">
            {thisWeekTasks.map((goal, index) => (
              <li key={goal} className="rounded-2xl border border-cyan-200/15 bg-sky-300/[0.055] px-4 py-3">
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-cyan-300/12 text-xs font-black text-cyan-100">
                    {index + 1}
                  </span>
                  <p className="text-sm leading-6 text-sky-100/76">{goal}</p>
                </div>
              </li>
            ))}
          </ul>
        </Surface>

        <Surface>
          <SectionHeading
            title="Later"
            description="Useful work, parked below the main plan until today is complete."
            action={<CalendarClock className="h-5 w-5 text-[#2d77bf]" />}
          />
          <ul className="mt-5 space-y-3">
            {laterTasks.map((item) => (
              <li key={item} className="rounded-2xl border border-cyan-200/15 bg-sky-300/[0.055] px-4 py-3">
                <div className="flex items-start gap-3">
                  <Clock3 className="mt-1 h-4 w-4 shrink-0 text-sky-200/70" />
                  <p className="text-sm leading-6 text-sky-100/76">{item}</p>
                </div>
              </li>
            ))}
          </ul>
        </Surface>
      </DetailGrid>

      <Surface>
        <SectionHeading
          title="Progress"
          description="A quick read on today and the exam window. Settings stay below the main plan."
        />
        <div className="mt-5 grid gap-4 md:grid-cols-[minmax(0,1fr)_0.9fr]">
          <div className="rounded-2xl border border-emerald-300/20 bg-emerald-300/[0.055] p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-100/70">Today progress</p>
                <p className="mt-2 text-3xl font-black text-white">{todayCompleted}/{profile.dailyGoal}</p>
                <p className="text-sm font-semibold text-sky-100/70">questions completed</p>
              </div>
              <span className="rounded-full border border-emerald-200/25 bg-emerald-300/10 px-3 py-1 text-xs font-black uppercase tracking-[0.14em] text-emerald-100">
                {Math.round(todayProgress * 100)}%
              </span>
            </div>
            <div className="mt-4">
              <ProgressBar value={todayProgress} tone="green" />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-1">
            <div className="rounded-2xl border border-cyan-200/15 bg-sky-300/[0.055] p-4">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-sky-100/58">Intensity</p>
              <p className="mt-2 text-xl font-black capitalize text-white">{profile.studyIntensity}</p>
            </div>
            <div className="rounded-2xl border border-amber-200/20 bg-amber-300/[0.07] p-4">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-amber-100/62">Exam window</p>
              <p className="mt-2 text-xl font-black text-white">{daysUntilExam} days</p>
            </div>
          </div>
        </div>
      </Surface>

      <Surface>
        <SectionHeading
          title="Plan Controls"
          description={`Lower priority settings. The plan is biased toward ${shortCategoryLabel(priorityArea)} because that is where the most score lift is available.`}
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

const nurseCommandLabModules = [
  {
    title: 'Shift Game',
    description: 'Practice prioritization under time pressure in a hospital shift loop.',
    to: '/shift-command',
    icon: HeartPulse,
    action: 'Start shift',
    meta: 'Prioritization',
    accent: 'from-rose-400/28 to-cyan-400/10',
  },
  {
    title: 'Hospitalvania',
    description: 'Run the side-scrolling clinical judgment prototype.',
    to: '/hospitalvania',
    icon: Zap,
    action: 'Enter Hospitalvania',
    meta: 'Arcade drill',
    accent: 'from-violet-400/28 to-cyan-400/10',
  },
  {
    title: 'Nurse Tycoon',
    description: 'Balance staffing, quality, and patient flow in the management sim.',
    to: '/nurse-tycoon',
    icon: BarChart3,
    action: 'Open tycoon',
    meta: 'Systems thinking',
    accent: 'from-amber-300/28 to-emerald-400/10',
  },
  {
    title: 'Clinical Simulator',
    description: 'Step through patient scenarios using the nursing judgment loop.',
    to: '/clinical-simulator',
    icon: Target,
    action: 'Train first actions',
    meta: 'Patient scenarios',
    accent: 'from-emerald-300/28 to-cyan-400/10',
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
        eyebrow="Nurse Command Lab"
        title="Simulation, games, and clinical reps in one lab."
        description="The lab keeps experimental practice modes grouped together so the core study app stays focused and the game surfaces still feel intentional."
        action={
          <Link
            to={featuredLabModule.to}
            className="nclex-btn-primary inline-flex min-h-[48px] items-center gap-2 rounded-xl px-5 py-3 text-sm font-black"
          >
            Start featured lab
            <ArrowRight className="h-4 w-4" />
          </Link>
        }
      />

      <FocusPanel className="nclex-dark-panel text-white">
        <div className="grid gap-5 p-5 md:p-6 xl:grid-cols-[minmax(0,1fr)_22rem] xl:items-stretch">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-200">Featured lab</p>
            <h3 className="mt-3 max-w-3xl text-3xl font-black tracking-[-0.04em] text-white md:text-5xl">
              {featuredLabModule.title}
            </h3>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-sky-100/72">
              {featuredLabModule.description} Use this first when you want a clinical judgment loop instead of another question set.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Link
                to={featuredLabModule.to}
                className="nclex-btn-primary inline-flex min-h-[52px] items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-black"
              >
                {featuredLabModule.action}
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/quick-study"
                className="nclex-btn-secondary inline-flex min-h-[52px] items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-black"
              >
                Back to questions
                <BookOpen className="h-4 w-4" />
              </Link>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
            <QuickMetric label="Modes" value="4" detail="Games, simulation, and management reps." />
            <QuickMetric label="Use for" value="Flow" detail="Priority, escalation, and patient-state decisions." />
            <QuickMetric label="Core app" value="Clean" detail="Lab tools stay grouped away from study nav." />
          </div>
        </div>
      </FocusPanel>

      <div>
        <SectionHeading
          title="Lab modes"
          description="Choose the simulation surface by the kind of thinking you want to practice."
        />
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        {nurseCommandLabModules.map(({ title, description, to, icon: Icon, action, meta, accent }) => (
          <Surface key={to} className="group flex min-h-[260px] flex-col justify-between p-0">
            <div className={clsx('h-1.5 bg-gradient-to-r', accent)} />
            <div>
              <div className="p-5 md:p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-[16px] border border-cyan-300/25 bg-cyan-300/12 text-cyan-100 shadow-[0_0_24px_rgba(56,189,248,0.16)]">
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className="rounded-full border border-cyan-300/25 bg-white/[0.04] px-3 py-1 text-xs font-black uppercase tracking-[0.14em] text-sky-100/64">
                    {meta}
                  </span>
                </div>
                <h2 className="mt-5 text-2xl font-black tracking-[-0.03em] text-white">{title}</h2>
                <p className="mt-3 text-sm leading-6 text-sky-100/66">{description}</p>
              </div>
            </div>
            <Link
              to={to}
              className="mx-5 mb-5 inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl border border-cyan-300/24 bg-white/[0.04] px-4 py-3 text-sm font-black text-cyan-100 transition group-hover:border-cyan-200/60 group-hover:bg-cyan-300/12 md:mx-6 md:mb-6"
            >
              {action}
              <ArrowRight className="h-4 w-4" />
            </Link>
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
                  <p className="font-black text-white">{title}</p>
                  <p className="mt-1 text-sm leading-6 text-sky-100/64">{description}</p>
                  <p className="mt-3 inline-flex items-center gap-2 text-sm font-black text-cyan-200">
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
  const profilePhotoInputRef = useRef<HTMLInputElement | null>(null)
  const [profilePhotoMessage, setProfilePhotoMessage] = useState('')
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
            <div className="rounded-[20px] border border-[var(--nclex-border)] bg-[var(--nclex-card-muted)] p-4">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-[#b8d7f4] bg-[linear-gradient(180deg,#0f7aff_0%,#062d63_100%)] text-xl font-black text-white shadow-[0_12px_28px_rgba(43,148,255,0.22)]">
                    {profile.profileImageDataUrl ? (
                      <img src={profile.profileImageDataUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      profileInitials
                    )}
                  </div>
                  <div>
                    <p className="font-semibold text-[var(--nclex-text)]">Profile picture</p>
                    <p className="mt-1 text-sm leading-6 text-[var(--nclex-text-muted)]">
                      Shows on the Home title screen and account menu.
                    </p>
                    {profile.memberNumber ? (
                      <span className="mt-3 inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-black text-amber-700">
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
                <p className="mt-3 rounded-xl border border-[#d7e6f7] bg-white px-3 py-2 text-sm font-semibold text-[var(--nclex-text-muted)]">
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
          <h3 className="mt-7 font-serif text-3xl text-[#163042]">Privacy, terms & support</h3>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <FeatureCallout title="Privacy" description="Cloud accounts store your email and synced study activity. Do not upload protected health information or patient-identifying material." />
            <FeatureCallout title="Terms" description="Nurse Command is practice study support only. Readiness and adaptive signals are practice evidence, not clinical advice or licensure guarantees." />
            <FeatureCallout title="Support" description="For account, email, or study-material issues, contact support@cosmicgames.info." />
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
