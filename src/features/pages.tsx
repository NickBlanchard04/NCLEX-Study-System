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
  Activity,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Award,
  BadgeCheck,
  BarChart3,
  BrainCircuit,
  BookOpen,
  BookOpenCheck,
  CalendarCheck,
  CalendarClock,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Cloud,
  CloudOff,
  ClipboardList,
  Clock3,
  FileText,
  FileClock,
  Flame,
  Flag,
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
  MaterialImportMode,
  MaterialQuestion,
  Note,
  QuestionCategory,
  StudyMaterial,
} from '../app/types'
import { useStudySystemStore } from '../app/store'
import { createClientId } from '../services/ids'
import { getSafeErrorCopy, reportSafeError } from '../services/safe-errors'
import { summarizeMaterialQuality, type MaterialQualityIssue } from '../services/material-quality'
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
  getActiveSessionSummary,
  getDashboardState,
  getPracticeHistory,
  getWeakAreas,
  questionLookup,
} from '../services/study-system'
import {
  ChecklistItem,
  CommandActionCard,
  CommandBadge,
  CommandPageIntro,
  CommandStatTile,
  DetailGrid,
  EmptyState,
  FlipCard,
  FocusPanel,
  MasteryPill,
  MetricChip,
  NextActionPanel,
  PageHeader,
  PageStack,
  ProgressBar,
  QuickMetric,
  QuestionSessionRunner,
  SectionHeading,
  Surface,
} from './ui'
import {
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
  mobilePrimary?: boolean
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
    idle: string
    button: string
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
    idle: 'border-cyan-200/26 from-cyan-400/[0.075] via-[#03101f]/72 to-[#020812]/88',
    button: 'border-cyan-200/24 bg-cyan-300/[0.07] hover:border-cyan-100/68 hover:bg-cyan-300/14 hover:shadow-[0_0_26px_rgba(34,211,238,0.16)] focus:ring-cyan-300/18',
    hover: 'hover:border-cyan-100/85 hover:from-cyan-300/[0.32] hover:shadow-[0_0_30px_rgba(34,211,238,0.18)]',
    glow: 'bg-cyan-300/30',
  },
  emerald: {
    accent: 'bg-emerald-300 shadow-[0_0_18px_rgba(110,231,183,0.75)]',
    border: 'border-emerald-200/50',
    surface: 'bg-gradient-to-br from-emerald-400/[0.24] via-[#052a2c]/88 to-[#061426]/92',
    icon: 'border-emerald-200/60 bg-emerald-300/22 text-emerald-50 shadow-[0_0_22px_rgba(52,211,153,0.2)]',
    text: 'text-emerald-50',
    meta: 'border-emerald-100/42 bg-emerald-300/20 text-emerald-50',
    idle: 'border-emerald-200/24 from-emerald-400/[0.065] via-[#03101f]/72 to-[#020812]/88',
    button: 'border-emerald-200/22 bg-emerald-300/[0.065] hover:border-emerald-100/64 hover:bg-emerald-300/14 hover:shadow-[0_0_26px_rgba(52,211,153,0.15)] focus:ring-emerald-300/18',
    hover: 'hover:border-emerald-100/80 hover:from-emerald-300/[0.3] hover:shadow-[0_0_30px_rgba(52,211,153,0.16)]',
    glow: 'bg-emerald-300/28',
  },
  amber: {
    accent: 'bg-amber-300 shadow-[0_0_18px_rgba(252,211,77,0.75)]',
    border: 'border-amber-200/52',
    surface: 'bg-gradient-to-br from-amber-300/[0.25] via-[#2b2412]/78 to-[#061426]/92',
    icon: 'border-amber-200/62 bg-amber-300/24 text-amber-50 shadow-[0_0_22px_rgba(251,191,36,0.2)]',
    text: 'text-amber-50',
    meta: 'border-amber-100/42 bg-amber-300/22 text-amber-50',
    idle: 'border-amber-200/24 from-amber-300/[0.07] via-[#03101f]/72 to-[#020812]/88',
    button: 'border-amber-200/22 bg-amber-300/[0.065] hover:border-amber-100/64 hover:bg-amber-300/14 hover:shadow-[0_0_26px_rgba(251,191,36,0.15)] focus:ring-amber-300/18',
    hover: 'hover:border-amber-100/80 hover:from-amber-300/[0.32] hover:shadow-[0_0_30px_rgba(251,191,36,0.16)]',
    glow: 'bg-amber-300/28',
  },
  rose: {
    accent: 'bg-rose-300 shadow-[0_0_18px_rgba(253,164,175,0.72)]',
    border: 'border-rose-200/50',
    surface: 'bg-gradient-to-br from-rose-400/[0.23] via-[#2b1428]/78 to-[#061426]/92',
    icon: 'border-rose-200/58 bg-rose-300/22 text-rose-50 shadow-[0_0_22px_rgba(251,113,133,0.2)]',
    text: 'text-rose-50',
    meta: 'border-rose-100/42 bg-rose-300/20 text-rose-50',
    idle: 'border-rose-200/22 from-rose-400/[0.065] via-[#03101f]/72 to-[#020812]/88',
    button: 'border-rose-200/22 bg-rose-300/[0.065] hover:border-rose-100/62 hover:bg-rose-300/14 hover:shadow-[0_0_26px_rgba(251,113,133,0.15)] focus:ring-rose-300/18',
    hover: 'hover:border-rose-100/78 hover:from-rose-300/[0.3] hover:shadow-[0_0_30px_rgba(251,113,133,0.16)]',
    glow: 'bg-rose-300/26',
  },
  violet: {
    accent: 'bg-violet-300 shadow-[0_0_18px_rgba(196,181,253,0.74)]',
    border: 'border-violet-200/52',
    surface: 'bg-gradient-to-br from-violet-400/[0.24] via-[#1d1b42]/82 to-[#061426]/92',
    icon: 'border-violet-200/62 bg-violet-300/22 text-violet-50 shadow-[0_0_22px_rgba(167,139,250,0.2)]',
    text: 'text-violet-50',
    meta: 'border-violet-100/42 bg-violet-300/21 text-violet-50',
    idle: 'border-violet-200/24 from-violet-400/[0.07] via-[#03101f]/72 to-[#020812]/88',
    button: 'border-violet-200/22 bg-violet-300/[0.065] hover:border-violet-100/64 hover:bg-violet-300/14 hover:shadow-[0_0_26px_rgba(167,139,250,0.15)] focus:ring-violet-300/18',
    hover: 'hover:border-violet-100/80 hover:from-violet-300/[0.31] hover:shadow-[0_0_30px_rgba(167,139,250,0.17)]',
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
        eyebrow: 'Start',
        description: 'Next action',
        action: 'Open dashboard',
        route: '/dashboard',
        featured: true,
        mobilePrimary: true,
        icon: <Flag className="h-5 w-5" />,
        status: planProgress + '% today',
        tone: 'amber',
      },
      {
        title: 'Quick Study',
        eyebrow: 'Practice',
        description: 'Weak-spot drill',
        action: 'Start drill',
        route: '/quick-study',
        mobilePrimary: true,
        icon: <Timer className="h-5 w-5" />,
        status: shortCategoryLabel(weakestCategory),
        tone: 'rose',
      },
      {
        title: 'Study Plan',
        eyebrow: 'Plan',
        description: 'Today / week / later',
        action: 'View plan',
        route: '/study-plan',
        mobilePrimary: true,
        icon: <CalendarCheck className="h-5 w-5" />,
        status: dashboard.todayCompleted + '/' + dashboard.dailyGoal + ' done',
        tone: 'cyan',
      },
      {
        title: 'Question Bank',
        eyebrow: 'Bank',
        description: 'Build a set',
        action: 'Open bank',
        route: '/practice-questions',
        mobilePrimary: true,
        icon: <ClipboardList className="h-5 w-5" />,
        status: Math.max(attempts.length, 1245).toLocaleString() + ' answered',
        tone: 'cyan',
      },
      {
        title: 'Performance',
        eyebrow: 'Insight',
        description: 'Signals',
        action: 'Read signals',
        route: '/performance-analytics',
        icon: <BarChart3 className="h-5 w-5" />,
        status: Math.max(1, accuracyPct) + '% accuracy',
        tone: 'violet',
      },
      {
        title: 'Nurse Lab',
        eyebrow: 'Lab',
        description: 'Simulation',
        action: 'Open lab',
        route: '/nurse-command-lab',
        icon: <FlaskConical className="h-5 w-5" />,
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
          icon: <BookOpenCheck className="h-4 w-4" />,
          tone: 'amber',
        },
        {
          title: 'Take an Exam',
          description: 'Run a timed exam mode session.',
          action: 'Open',
          route: '/test-mode',
          icon: <FileClock className="h-4 w-4" />,
          tone: 'amber',
        },
        {
          title: 'Train Weak Areas',
          description: 'Target the categories that need attention.',
          action: 'Open',
          route: '/weak-areas',
          icon: <HeartPulse className="h-4 w-4" />,
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
        {
          title: 'Performance',
          description: 'Review signals and trends.',
          action: 'Open',
          route: '/performance-analytics',
          icon: <BarChart3 className="h-4 w-4" />,
          tone: 'violet',
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
          icon: <FlaskConical className="h-4 w-4" />,
          tone: 'violet',
        },
        {
          title: 'Settings',
          description: 'Adjust profile, exam track, and app preferences.',
          action: 'Open',
          route: '/settings',
          icon: <Settings className="h-4 w-4" />,
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
      reportSafeError('material-link-import', error)
      setImportMessage(getSafeErrorCopy('material-link-import'))
    } finally {
      setIsImporting(false)
    }
  }

  return (
    <NurseCommandBackdrop className="min-h-screen w-full overflow-x-hidden px-4 pb-4 pt-3 md:px-7 md:pt-6">
      <div className="mx-auto flex min-h-[calc(100vh-1rem)] max-w-7xl flex-col">
        <main className="relative z-10 flex flex-1 flex-col gap-5">
          <section className="home-title-stage relative isolate grid min-h-[calc(100svh-3rem)] overflow-hidden border-y border-cyan-300/18 py-4 sm:py-5 lg:min-h-[calc(100vh-7.25rem)] lg:grid-cols-[minmax(0,0.88fr)_minmax(20rem,0.46fr)] lg:items-center lg:gap-6 lg:py-8 xl:gap-8">
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
              <div className="mt-2 max-w-3xl pr-14 sm:mt-0 lg:max-w-2xl">
                <p className="nc-eyebrow text-cyan-200/72 sm:text-sm">
                  Study. Practice. Lead.
                </p>
                <h1 className="nc-hero-title mt-2 text-5xl uppercase text-white drop-shadow-[0_0_26px_rgba(125,211,252,0.24)] sm:text-6xl lg:text-7xl xl:text-[4.5rem]">
                  Nurse
                  <span className="block text-cyan-100">Command</span>
                </h1>
                <p className="mt-4 max-w-xl text-base leading-7 text-sky-50/76">
                  Start with one focused win.
                </p>
              </div>

              <div className="mt-6 grid max-w-3xl gap-2 md:gap-2.5" aria-label="Title menu">
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
                        'group relative min-h-[3.75rem] w-full min-w-0 items-center gap-3 overflow-hidden rounded-xl border bg-gradient-to-br px-3 py-2.5 pl-4 text-left transition focus:outline-none focus:ring-4 sm:min-h-[4rem] sm:px-4 sm:pl-5',
                        item.mobilePrimary ? 'flex' : 'hidden sm:flex',
                        isActive
                          ? clsx(selectedTaskClasses.border, selectedTaskClasses.surface, selectedTaskClasses.glow)
                          : clsx(tone.idle, tone.hover, 'focus:ring-cyan-300/16'),
                      )}
                    >
                      <span className={clsx('pointer-events-none absolute inset-y-2 left-0 w-1 rounded-r-full transition', isActive ? selectedTaskClasses.accent : tone.accent)} />
                      <span className={clsx('grid h-11 w-11 shrink-0 place-items-center rounded-lg border transition', isActive ? selectedTaskClasses.icon : tone.icon)}>
                        {item.icon}
                      </span>
                      <span className="grid min-w-0 flex-1 gap-1 sm:grid-cols-[minmax(0,0.95fr)_minmax(0,0.75fr)] sm:items-center">
                        <span className="flex min-w-0 items-center gap-2">
                          <span className="nc-card-title text-base text-white sm:text-lg">{item.title}</span>
                          <span className={clsx('nc-chip-label hidden rounded-md border px-2 py-1 sm:inline-flex', isActive ? selectedTaskClasses.meta : tone.meta)}>
                            {item.status}
                          </span>
                        </span>
                        <span className="hidden min-w-0 text-sm font-semibold text-sky-50/62 sm:block sm:text-right">
                          {item.eyebrow} - {item.description}
                        </span>
                      </span>
                      <ArrowRight className={clsx('h-5 w-5 shrink-0 transition group-hover:translate-x-1', isActive ? selectedTaskClasses.text : tone.text)} />
                    </button>
                  )
                })}
              </div>
            </div>

            <aside className="mt-5 min-w-0 lg:mt-0">
              <div className="overflow-hidden rounded-xl border border-sky-200/20 bg-[linear-gradient(135deg,rgba(14,165,233,0.13),rgba(2,8,18,0.82)_42%,rgba(124,58,237,0.13))] p-4 shadow-[0_18px_38px_rgba(0,0,0,0.18)] sm:p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="nc-eyebrow text-cyan-100/66">Today&apos;s Status</p>
                    <h2 className="nc-section-title mt-1 text-xl text-white">Level, mastery, streak.</h2>
                  </div>
                  <span className="shrink-0 rounded-full border border-amber-200/38 bg-amber-300/14 px-3 py-1 text-xs font-bold text-amber-100">
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
                      <p className={clsx('nc-metric-label mt-3 text-[0.7rem]', badge.labelClass)}>{badge.label}</p>
                      <p className="nc-metric-value mt-1 truncate text-xl text-white">{badge.value}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-4 rounded-lg border border-cyan-200/16 bg-[#03101f]/58 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <span className="nc-metric-label text-cyan-100/68">Today&apos;s progress</span>
                    <span className="nc-metric-value text-sm text-white">{dashboard.todayCompleted}/{dashboard.dailyGoal}</span>
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
                    <h2 className="nc-card-title text-base text-white">{group.title}</h2>
                    <p className="mt-1 text-sm leading-6 text-sky-50/66">{group.description}</p>
                  </div>
                </div>
                <div className="mt-4 grid min-w-0 gap-2">
                  {group.tools.map((tool) => (
                    <button
                      key={tool.route}
                      type="button"
                      onClick={() => navigate(tool.route)}
                      className={clsx(
                        'group relative flex min-h-[4.25rem] w-full min-w-0 items-start gap-3 overflow-hidden rounded-lg border px-3 py-3 pl-4 text-left transition focus:outline-none focus:ring-4 sm:min-h-16',
                        launchToneClasses[tool.tone].button,
                      )}
                    >
                      <span className={clsx('pointer-events-none absolute inset-y-2 left-0 w-1 rounded-r-full opacity-70 transition group-hover:opacity-100', launchToneClasses[tool.tone].accent)} />
                      <span className={clsx('grid h-8 w-8 shrink-0 place-items-center rounded-md border', launchToneClasses[tool.tone].icon)}>
                        {tool.icon}
                      </span>
                      <span className="min-w-0 flex-1 overflow-hidden">
                        <span className="nc-card-title block text-sm text-white">{tool.title}</span>
                        <span className="block whitespace-normal break-words text-xs leading-4 text-sky-50/58">{tool.description}</span>
                      </span>
                      <ArrowRight className={clsx('mt-2 h-4 w-4 shrink-0 transition group-hover:translate-x-0.5', launchToneClasses[tool.tone].text)} />
                    </button>
                  ))}
                </div>
              </section>
            ))}
          </section>

          <section className="grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]" aria-label="User added materials">
            <section className="relative overflow-hidden rounded-xl border border-violet-200/24 bg-[#03101f]/66 p-4">
              <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-violet-300 via-cyan-300 to-emerald-300" />
              <h2 className="nc-card-title text-base text-white">User added materials</h2>
              <p className="mt-1 text-sm leading-6 text-sky-50/66">
                Your uploaded notes, files, and study links stay here when you need them.
              </p>
              <div className="mt-4 rounded-lg border border-violet-200/24 bg-violet-300/[0.1] px-4 py-4">
                <p className="nc-metric-label text-violet-100/72">Total added</p>
                <p className="nc-metric-value mt-1 text-4xl text-white">{materials.length}</p>
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
                    onClick={() => {
                      startQuickStudy(area.category)
                      navigate('/quick-study')
                    }}
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
  const selectedCategoryLabel = category === 'All' ? 'Mixed bank' : shortCategoryLabel(category)
  const selectedSystemLabel = system === 'All' ? 'All systems' : system
  const questionStatusLabel =
    questionStatus === 'all' ? 'All questions' : questionStatus === 'unused' ? 'Unused only' : 'Missed before'
  const sessionFormatLabel = format === 'mixed' ? 'Mixed formats' : format === 'multiple-choice' ? 'Multiple choice' : 'Select all'
  const practicePresets = [
    {
      title: 'Start adaptive set',
      description: 'Best everyday route: mixed questions tuned to the filters below.',
      action: 'Start here',
      tone: 'amber' as const,
      icon: <Target className="h-5 w-5" />,
      config: {},
    },
    {
      title: 'Repair missed questions',
      description: 'Five misses for a short, direct remediation loop.',
      action: 'Repair misses',
      tone: 'rose' as const,
      icon: <TrendingDown className="h-5 w-5" />,
      config: { category: priorityCategory, questionStatus: 'incorrect' as const, questionCount: 5 },
    },
    {
      title: 'New questions only',
      description: 'Fresh items for a cleaner read on readiness.',
      action: 'Fresh set',
      tone: 'emerald' as const,
      icon: <Sparkles className="h-5 w-5" />,
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
        title="Question Bank"
        description="Build a focused practice set without turning the setup screen into the work."
        action={
          <button
            type="button"
            onClick={() => launchPracticeSession()}
            className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl border border-amber-100/48 bg-[linear-gradient(180deg,#fbbf24_0%,#b77912_100%)] px-5 py-3 text-sm font-bold text-white shadow-[0_14px_34px_rgba(251,191,36,0.22)] transition hover:brightness-110 focus:outline-none focus:ring-4 focus:ring-amber-300/20"
          >
            {isPending ? 'Building set...' : 'Start adaptive set'}
            <ArrowRight className="h-4 w-4" />
          </button>
        }
      />
      <FocusPanel className="border-amber-200/34 bg-[linear-gradient(135deg,rgba(251,191,36,0.16),rgba(6,28,49,0.94)_42%,rgba(2,8,18,0.96))] text-white shadow-[0_0_38px_rgba(251,191,36,0.12)]">
        <div className="grid gap-5 p-4 sm:p-5 md:p-6 xl:grid-cols-[minmax(0,1fr)_21rem]">
          <div className="min-w-0">
            <div className="flex flex-wrap gap-2">
              <CommandBadge tone="cyan" icon={<BadgeCheck className="h-3.5 w-3.5" />}>{activeTrack.shortName}</CommandBadge>
              <CommandBadge tone="amber" icon={<Zap className="h-3.5 w-3.5" />}>Practice mode</CommandBadge>
              <CommandBadge tone="emerald" icon={<ShieldCheck className="h-3.5 w-3.5" />}>Instant rationale</CommandBadge>
            </div>
            <h3 className="mt-4 max-w-3xl text-3xl font-bold tracking-normal text-white md:text-4xl">
              Start focused set
            </h3>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-sky-100/72">
              {questionCount} questions from {selectedCategoryLabel}. Start adaptive for the cleanest signal, or tune the set below when you need precision.
            </p>
            <div className="mt-5 grid gap-2 sm:grid-cols-3">
              <CommandStatTile label="Count" value={`${questionCount}`} detail="questions" icon={<ClipboardList className="h-4 w-4" />} tone="amber" />
              <CommandStatTile label="Track" value={activeTrack.shortName} detail="blueprint bank" icon={<BadgeCheck className="h-4 w-4" />} tone="cyan" />
              <CommandStatTile label="Review" value="Instant" detail="rationale" icon={<BookOpen className="h-4 w-4" />} tone="emerald" />
            </div>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <button
                type="button"
                onClick={() => launchPracticeSession()}
                className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-xl border border-amber-100/48 bg-[linear-gradient(180deg,#fbbf24_0%,#b77912_100%)] px-5 py-3 text-sm font-bold text-white shadow-[0_14px_34px_rgba(251,191,36,0.22)] transition hover:brightness-110 focus:outline-none focus:ring-4 focus:ring-amber-300/20"
              >
                {isPending ? 'Building set...' : 'Start adaptive set'}
                <ArrowRight className="h-4 w-4" />
              </button>
              <Link
                to="/quick-study"
                className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-xl border border-cyan-200/24 bg-cyan-300/[0.07] px-5 py-3 text-sm font-bold text-cyan-100 transition hover:border-cyan-100/55 hover:bg-cyan-300/13"
              >
                Quick Study
                <Zap className="h-4 w-4" />
              </Link>
            </div>
          </div>
          <div className="rounded-[1rem] border border-white/10 bg-[#031426]/74 p-4">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-sky-100/58">Set preview</p>
            <p className="mt-2 text-3xl font-bold text-white">{questionCount}</p>
            <p className="text-sm font-semibold text-sky-100/70">questions queued</p>
            <div className="mt-4 space-y-2">
              {[
                { label: 'Focus', value: selectedCategoryLabel, tone: 'amber' },
                { label: 'System', value: selectedSystemLabel, tone: 'cyan' },
                { label: 'Status', value: questionStatusLabel, tone: 'rose' },
                { label: 'Format', value: sessionFormatLabel, tone: 'violet' },
              ].map((item) => (
                <div
                  key={item.label}
                  className={clsx(
                    'flex items-center justify-between gap-3 rounded-xl border px-3 py-2',
                    item.tone === 'amber' && 'border-amber-200/18 bg-amber-300/[0.06]',
                    item.tone === 'cyan' && 'border-cyan-200/18 bg-cyan-300/[0.06]',
                    item.tone === 'rose' && 'border-rose-200/18 bg-rose-300/[0.06]',
                    item.tone === 'violet' && 'border-violet-200/18 bg-fuchsia-300/[0.06]',
                  )}
                >
                  <span className="text-xs font-bold uppercase text-sky-100/48">{item.label}</span>
                  <span className="min-w-0 break-words text-right text-sm font-bold text-white">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </FocusPanel>

      <Surface>
        <SectionHeading
          title="Choose a practice route"
          description="Amber starts a normal set, rose repairs misses, emerald gives you fresh questions."
        />
        <div className="mt-5 grid gap-3 md:grid-cols-3">
          {practicePresets.map((preset) => (
            <CommandActionCard
              key={preset.title}
              title={preset.title}
              description={preset.description}
              meta={preset.action}
              tone={preset.tone}
              icon={preset.icon}
              action={<ArrowRight className="h-4 w-4" />}
              onClick={() => launchPracticeSession(preset.config)}
            />
          ))}
        </div>
      </Surface>

      <div className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
        <Surface>
          <SectionHeading
            title="Tune the set"
            description="Use filters when you need precision. Otherwise, start adaptive and keep moving."
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
            description="Misses become repairs. Finished sets update your performance readout."
          />
          <div className="mt-5 grid gap-3">
            <CommandActionCard
              to="/weak-areas"
              title="Open remediation"
              description="Turn missed categories into a repair queue."
              meta="Repair"
              tone="rose"
              icon={<Target className="h-5 w-5" />}
              action={<ArrowRight className="h-4 w-4" />}
            />
            <CommandActionCard
              to="/performance-analytics"
              title="Check performance"
              description="See whether practice is improving readiness signal."
              meta="Readout"
              tone="violet"
              icon={<BarChart3 className="h-5 w-5" />}
              action={<ArrowRight className="h-4 w-4" />}
            />
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
        title="Choose your exam lane."
        description="Pick the credential you are preparing for, then start a high-yield review or practice block without digging through a long document page."
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

      <Surface className="border-cyan-200/18 bg-[#061426]">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-100/68">
              Current Track
            </p>
            <h3 className="mt-2 nc-section-title text-3xl text-white">
              {activeTrack.title}
            </h3>
            <p className="mt-2 max-w-3xl text-sm leading-7 text-sky-100/64">
              {activeTrack.subtitle}
            </p>
          </div>
          <span className={activeTrack.status === 'live' ? 'nclex-chip nclex-chip-success' : 'nclex-chip nclex-chip-warning'}>
            {activeTrack.status === 'live' ? 'Live content' : 'Expansion ready'}
          </span>
        </div>
      </Surface>

      <NextActionPanel
        eyebrow="What to do next"
        title={`Practice in ${selectedTrack.shortName}`}
        description="Pick the exam lane, then move into questions. Track details stay collapsed until you need to inspect coverage."
        tone="amber"
        primary={
          <button
            type="button"
            onClick={() => {
              updateProfile({ examTrack: selectedTrackId })
              navigate('/practice-questions')
            }}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-amber-100/48 bg-[linear-gradient(180deg,#fbbf24_0%,#b77912_100%)] px-5 py-3 text-sm font-bold text-white shadow-[0_14px_34px_rgba(251,191,36,0.22)] transition hover:brightness-110 focus:outline-none focus:ring-4 focus:ring-amber-300/20"
          >
            Start practice
            <ArrowRight className="h-4 w-4" />
          </button>
        }
        secondary={
          <button
            type="button"
            onClick={() => {
              updateProfile({ examTrack: selectedTrackId })
              navigate('/test-mode')
            }}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-cyan-200/24 bg-cyan-300/[0.07] px-5 py-3 text-sm font-bold text-cyan-100 transition hover:border-cyan-100/55 hover:bg-cyan-300/13 focus:outline-none focus:ring-4 focus:ring-cyan-300/18"
          >
            Start exam
            <Target className="h-4 w-4" />
          </button>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[0.82fr_1.18fr]">
        <Surface className="border-cyan-200/18 bg-cyan-300/[0.045]">
          <SectionHeading
            title="Choose exam"
            description="Cyan is navigation: choose the prep path before building a session."
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
                  'rounded-[18px] border p-4 text-left transition hover:-translate-y-0.5',
                  selectedTrack.id === track.id
                    ? 'border-amber-200/50 bg-amber-300/[0.09] shadow-[0_0_24px_rgba(251,191,36,0.12)]'
                    : 'border-cyan-200/18 bg-white/[0.045] hover:border-cyan-100/38 hover:bg-cyan-300/[0.07]',
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-white">{track.shortName}</p>
                    <p className="mt-1 text-sm leading-6 text-sky-100/64">
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

        <Surface className="overflow-hidden border-violet-200/18 bg-[#061426] p-0">
          <details>
            <summary className="flex cursor-pointer list-none flex-col gap-3 px-5 py-5 text-white transition hover:bg-white/[0.035] md:flex-row md:items-center md:justify-between md:px-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-100/70">
                  Track details
                </p>
                <h3 className="mt-2 text-2xl font-black tracking-normal text-white">
                  Exam overview, coverage, and quality notes
                </h3>
                <p className="mt-1 text-sm leading-6 text-sky-100/62">
                  Open this when you want the blueprint, domains, systems, formats, and resource list.
                </p>
              </div>
              <span className="inline-flex min-h-10 items-center justify-center rounded-xl border border-violet-200/24 bg-violet-300/[0.08] px-4 py-2 text-sm font-bold text-violet-100">
                Show details
              </span>
            </summary>
          <div className="border-t border-violet-200/14 bg-[linear-gradient(135deg,#003b66_0%,#12375a_100%)] px-5 py-6 text-white md:px-6">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-100">
              {selectedTrack.shortName} Exam overview
            </p>
            <h3 className="mt-3 nc-section-title text-4xl leading-tight">
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
            <div className="rounded-[18px] border border-violet-200/18 bg-white/[0.045] p-4 md:col-span-2">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-violet-100/70">
                Content quality pass
              </p>
              <div className="mt-4 grid gap-3 md:grid-cols-4">
                <MetricChip label="Review-ready" value={`${qualitySummary.reviewReady}`} />
                <MetricChip label="Authored drafts" value={`${qualitySummary.authoredDraft}`} />
                <MetricChip label="SME reviewed" value={`${qualitySummary.smeReviewed}`} />
                <MetricChip label="Starter fill" value={`${qualitySummary.generatedStarter}`} />
              </div>
              <p className="mt-4 text-sm leading-6 text-sky-100/64">
                Review-ready items are higher-quality clinical-editor drafts prepared for SME validation. The app does not label content as SME-authored until a real reviewer marks it reviewed.
              </p>
            </div>
            <ExamTrackList title="Domains" items={selectedTrack.domains} />
            <ExamTrackList title="Systems" items={selectedTrack.systems} />
            <ExamTrackList title="Testing formats" items={selectedTrack.testingFormats} />
            <ExamTrackList title="Resources" items={selectedTrack.resources} />
          </div>
          </details>
        </Surface>
      </div>

      {isFnp ? (
        <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <Surface className="border-amber-200/20 bg-amber-300/[0.055]">
            <SectionHeading
              title="FNP product: Create test"
              description="Gold is the next action: build the test block, then move into practice."
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
              <div className="mt-5 rounded-[18px] border border-emerald-200/24 bg-emerald-300/[0.08] p-4 text-sm leading-6 text-emerald-100">
                Created a {testMode} {fnpBoard} FNP practice test using {questionStatus} questions in {fnpSystem}. In the next content pass, this connects to the FNP QBank and question status history.
              </div>
            ) : null}
          </Surface>

          <Surface className="border-violet-200/18 bg-violet-300/[0.045]">
            <SectionHeading
              title="FNP feature coverage"
              description="Violet is strategy and mastery: what this exam lane needs to support."
            />
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {fnpCoverage.map((item) => (
                <div key={item} className="rounded-[16px] border border-violet-200/16 bg-white/[0.045] p-4">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-200" />
                    <p className="text-sm font-semibold leading-6 text-sky-100/74">{item}</p>
                  </div>
                </div>
              ))}
            </div>
          </Surface>

          <Surface className="border-violet-200/18 bg-[#061426] xl:col-span-2">
            <SectionHeading
              title="FNP diagnostic report preview"
              description="Breaks results down by AANP/ANCC blueprint, domain, body system, mode, and question status."
            />
            <div className="mt-5 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
              {reportRows.map((row) => (
                <div key={row.label} className="rounded-[18px] border border-violet-200/16 bg-white/[0.045] p-4">
                  <p className="font-semibold text-white">{row.label}</p>
                  <p className="mt-2 text-sm leading-6 text-sky-100/64">{row.detail}</p>
                  <div className="mt-4">
                    <ProgressBar value={row.value} tone={row.tone} />
                  </div>
                  <p className="mt-2 text-sm font-semibold text-sky-100">
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
  const [customizeOpen, setCustomizeOpen] = useState(false)
  const weakArea = useMemo(
    () => getWeakAreas(attempts, profile.examTrack ?? 'nclex-rn', profile.preferences.analyticsScope ?? 'selected-track')[0],
    [attempts, profile.examTrack, profile.preferences.analyticsScope],
  )
  const activeTrack = getExamTrack(profile.examTrack ?? 'nclex-rn')
  const quickStudyCategory = weakArea?.category ?? getExamCategories(activeTrack.id)[0]
  const quickStudyCategoryLabel = shortCategoryLabel(quickStudyCategory)
  const quickStudyAccuracy = weakArea ? Math.round(weakArea.accuracy * 100) : null
  const repairSignal = weakArea ? Math.max(0.14, 1 - weakArea.accuracy) : 0.35
  const quickStudyModeLabel = weakArea ? 'Weak-area repair' : 'First signal'
  const quickStudySourceLabel = weakArea ? `${quickStudyAccuracy}% accuracy signal` : `${activeTrack.shortName} starter set`
  const quickStudyReason = weakArea
    ? `${quickStudyAccuracy}% accuracy in ${shortCategoryLabel(weakArea.category)}. Keep the rep short, then review the pattern while it is fresh.`
    : `Start with high-yield ${activeTrack.shortName} questions so Nurse Command can find your first repair pattern.`
  const quickStudyLoop = [
    {
      title: 'Answer',
      detail: 'One decision at a time.',
      tone: 'amber',
      icon: <Zap className="h-4 w-4" />,
    },
    {
      title: 'Review',
      detail: 'Read the rationale before moving on.',
      tone: 'emerald',
      icon: <CheckCircle2 className="h-4 w-4" />,
    },
    {
      title: 'Repair',
      detail: 'Misses feed your weak-area plan.',
      tone: 'rose',
      icon: <Target className="h-4 w-4" />,
    },
  ] as const

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
        title="Quick Study"
        description="A short, focused practice loop for the next best repair."
        action={
          <button
            type="button"
            onClick={() => startQuickStudy()}
            className="inline-flex min-h-[48px] items-center gap-2 rounded-xl border border-amber-100/48 bg-[linear-gradient(180deg,#fbbf24_0%,#b77912_100%)] px-5 py-3 text-sm font-bold text-white shadow-[0_14px_34px_rgba(251,191,36,0.22)] transition hover:brightness-110 focus:outline-none focus:ring-4 focus:ring-amber-300/20"
          >
            <Sparkles className="h-4 w-4" />
            Start 10-minute drill
          </button>
        }
      />
      <FocusPanel className="border-amber-200/34 bg-[linear-gradient(135deg,rgba(251,191,36,0.18),rgba(6,28,49,0.94)_40%,rgba(2,8,18,0.96))] text-white shadow-[0_0_42px_rgba(251,191,36,0.12)]">
        <div className="grid gap-5 p-4 sm:p-5 md:p-6 xl:grid-cols-[minmax(0,1fr)_21rem]">
          <div className="min-w-0">
            <div className="flex flex-wrap gap-2">
              <CommandBadge tone="amber" icon={<Zap className="h-3.5 w-3.5" />}>Current action</CommandBadge>
              <CommandBadge tone={weakArea ? 'rose' : 'cyan'} icon={<Target className="h-3.5 w-3.5" />}>{quickStudyCategoryLabel}</CommandBadge>
            </div>
            <h3 className="mt-4 max-w-3xl text-3xl font-bold tracking-normal text-white md:text-4xl">
              Start 10-minute drill
            </h3>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-sky-100/72">
              {quickStudyReason}
            </p>
            <div className="mt-5 grid gap-2 sm:grid-cols-3">
              <div className="rounded-xl border border-rose-200/18 bg-rose-300/[0.075] p-3">
                <p className="text-xs font-bold uppercase text-rose-100/70">Focus</p>
                <p className="mt-1 break-words text-lg font-bold text-white">{quickStudyCategoryLabel}</p>
              </div>
              <div className="rounded-xl border border-amber-200/20 bg-amber-300/[0.08] p-3">
                <p className="text-xs font-bold uppercase text-amber-100/72">Set</p>
                <p className="mt-1 text-lg font-bold text-white">5 questions</p>
              </div>
              <div className="rounded-xl border border-cyan-200/18 bg-cyan-300/[0.075] p-3">
                <p className="text-xs font-bold uppercase text-cyan-100/72">Pace</p>
                <p className="mt-1 text-lg font-bold text-white">About 10m</p>
              </div>
            </div>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <button
                type="button"
                onClick={() => startQuickStudy()}
                className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-xl border border-amber-100/48 bg-[linear-gradient(180deg,#fbbf24_0%,#b77912_100%)] px-5 py-3 text-sm font-bold text-white shadow-[0_14px_34px_rgba(251,191,36,0.22)] transition hover:brightness-110 focus:outline-none focus:ring-4 focus:ring-amber-300/20"
              >
                Start 10-minute drill
                <ArrowRight className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setCustomizeOpen((current) => !current)}
                className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-xl border border-cyan-200/24 bg-cyan-300/[0.07] px-5 py-3 text-sm font-bold text-cyan-100 transition hover:border-cyan-100/55 hover:bg-cyan-300/13 focus:outline-none focus:ring-4 focus:ring-cyan-300/18"
                aria-expanded={customizeOpen}
              >
                {customizeOpen ? 'Hide options' : 'Customize'}
                <Shuffle className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div className="rounded-[1rem] border border-white/10 bg-[#031426]/74 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-sky-100/58">Drill signal</p>
                <h4 className="mt-2 text-xl font-bold text-white">{quickStudyModeLabel}</h4>
              </div>
              <CommandBadge tone={weakArea ? 'rose' : 'cyan'}>{quickStudySourceLabel}</CommandBadge>
            </div>
            <div className="mt-4">
              <ProgressBar value={repairSignal} tone={weakArea ? 'red' : 'blue'} />
            </div>
            <div className="mt-4 space-y-3">
              {quickStudyLoop.map((step) => (
                <div key={step.title} className="flex items-start gap-3 rounded-xl border border-white/8 bg-white/[0.035] p-3">
                  <span className={clsx(
                    'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border',
                    step.tone === 'amber' && 'border-amber-200/28 bg-amber-300/12 text-amber-100',
                    step.tone === 'emerald' && 'border-emerald-200/28 bg-emerald-300/12 text-emerald-100',
                    step.tone === 'rose' && 'border-rose-200/28 bg-rose-300/12 text-rose-100',
                  )}>
                    {step.icon}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-bold text-white">{step.title}</span>
                    <span className="mt-0.5 block text-xs leading-5 text-sky-100/62">{step.detail}</span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </FocusPanel>

      {customizeOpen ? (
        <Surface className="border-cyan-200/22 bg-cyan-300/[0.055]">
          <SectionHeading
            title="Adjust before starting"
            description="Keep the default drill when you want speed. Use these paths when you need more control."
          />
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            <CommandActionCard
              title={`Train ${quickStudyCategoryLabel}`}
              description="Start from the current weak-area signal."
              meta="Rose / remediation"
              icon={<Target className="h-4 w-4" />}
              tone="rose"
              onClick={() => startQuickStudy(quickStudyCategory)}
              action={<ArrowRight className="h-4 w-4" />}
            />
            <CommandActionCard
              title="Use Study Plan"
              description="Open today's tasks before starting."
              meta="Cyan / planning"
              icon={<CalendarClock className="h-4 w-4" />}
              tone="cyan"
              to="/study-plan"
              action={<ArrowRight className="h-4 w-4" />}
            />
            <CommandActionCard
              title="Build a question set"
              description="Choose count, category, and format from the bank."
              meta="Violet / control"
              icon={<ClipboardList className="h-4 w-4" />}
              tone="violet"
              to="/practice-questions"
              action={<ArrowRight className="h-4 w-4" />}
            />
          </div>
        </Surface>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <Surface className="border-emerald-200/24 bg-emerald-300/[0.055]">
          <SectionHeading
            title="What happens after you answer"
            description="The session keeps the feedback loop tight: submit, read the rationale, mark confidence, then move forward."
          />
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <CommandStatTile label="Correct" value="Green" detail="safe decision" tone="emerald" icon={<ShieldCheck className="h-4 w-4" />} />
            <CommandStatTile label="Missed" value="Rose" detail="repair signal" tone="rose" icon={<AlertTriangle className="h-4 w-4" />} />
            <CommandStatTile label="Review" value="Violet" detail="summary queue" tone="violet" icon={<BookOpenCheck className="h-4 w-4" />} />
          </div>
        </Surface>
        <Surface className="border-violet-200/22 bg-fuchsia-300/[0.045]">
          <SectionHeading
            title="Need a different practice path?"
            description="Use the bank for full control, Study Plan for scheduled work, or remediation when the problem area is obvious."
          />
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <Link to="/practice-questions" className="rounded-xl border border-violet-200/20 bg-fuchsia-300/[0.07] p-4 text-sm font-bold text-white transition hover:border-violet-100/45 hover:bg-fuchsia-300/[0.12]">
              Question Bank
              <span className="mt-2 block text-xs font-semibold leading-5 text-sky-100/58">Choose category and count.</span>
            </Link>
            <Link to="/study-plan" className="rounded-xl border border-cyan-200/20 bg-cyan-300/[0.07] p-4 text-sm font-bold text-white transition hover:border-cyan-100/45 hover:bg-cyan-300/[0.12]">
              Study Plan
              <span className="mt-2 block text-xs font-semibold leading-5 text-sky-100/58">Follow today's queue.</span>
            </Link>
            <Link to="/weak-areas" className="rounded-xl border border-rose-200/20 bg-rose-300/[0.07] p-4 text-sm font-bold text-white transition hover:border-rose-100/45 hover:bg-rose-300/[0.12]">
              Remediation
              <span className="mt-2 block text-xs font-semibold leading-5 text-sky-100/58">Repair missed patterns.</span>
            </Link>
          </div>
        </Surface>
      </div>
    </PageStack>
  )
}

export function TestModePage() {
  const profile = useStudySystemStore((state) => state.profile)
  const activeSession = useStudySystemStore((state) => state.activeSession)
  const practiceSessions = useStudySystemStore((state) => state.practiceSessions)
  const startTestSession = useStudySystemStore((state) => state.startTestSession)
  const abandonSession = useStudySystemStore((state) => state.abandonSession)
  const [isPending, startTransition] = useTransition()
  const [resumeExamNow, setResumeExamNow] = useState(false)
  const [questionCount, setQuestionCount] = useState(25)
  const [timed, setTimed] = useState(true)
  const [noBacktracking, setNoBacktracking] = useState(true)
  const activeTrack = getExamTrack(profile.examTrack ?? 'nclex-rn')
  const activeTestSummary = activeSession?.mode === 'test' ? getActiveSessionSummary(activeSession) : null
  const recentExamHistory = useMemo(
    () => getPracticeHistory(practiceSessions, 4).filter((session) => session.mode === 'test'),
    [practiceSessions],
  )

  if (activeSession?.mode === 'test' && resumeExamNow) {
    return (
      <QuestionSessionRunner
        key={`${activeSession.id}-${activeSession.currentIndex}`}
        session={activeSession}
        modeLabel="Test Mode"
        onExit={abandonSession}
      />
    )
  }

  const examMode = timed ? (noBacktracking ? 'Timed' : 'Readiness') : 'Tutor'
  const modeOptions = [
    {
      label: 'Timed',
      detail: 'Pressure practice',
      active: examMode === 'Timed',
      onSelect: () => {
        setTimed(true)
        setNoBacktracking(true)
      },
    },
    {
      label: 'Tutor',
      detail: 'Learn as you go',
      active: examMode === 'Tutor',
      onSelect: () => {
        setTimed(false)
        setNoBacktracking(false)
      },
    },
    {
      label: 'Readiness',
      detail: 'Balanced check',
      active: examMode === 'Readiness',
      onSelect: () => {
        setTimed(true)
        setNoBacktracking(false)
      },
    },
  ]

  return (
    <PageStack>
      <PageHeader
        eyebrow="Exam Simulation"
        title="Start a serious exam block."
        description={`A calmer ${activeTrack.shortName} test surface: choose the mode, set the count, then review misses without extra noise.`}
        action={
          <button
            type="button"
            onClick={() => startTransition(() => startTestSession({ questionCount, timed, noBacktracking }))}
            className="inline-flex min-h-[48px] items-center gap-2 rounded-xl border border-amber-100/48 bg-[linear-gradient(180deg,#fbbf24_0%,#b77912_100%)] px-5 py-3 text-sm font-bold text-white shadow-[0_14px_34px_rgba(251,191,36,0.22)] transition hover:brightness-110 focus:outline-none focus:ring-4 focus:ring-amber-300/20"
          >
            {isPending ? 'Building exam...' : 'Start exam'}
            <ArrowRight className="h-4 w-4" />
          </button>
        }
      />

      {activeTestSummary ? (
        <NextActionPanel
          eyebrow="Resume exam"
          title={`${activeTestSummary.answeredCount}/${activeTestSummary.questionCount} answered`}
          description={`Continue the active ${activeTrack.shortName} exam block from ${activeTestSummary.topCategory}, or discard it before starting a clean test.`}
          tone="amber"
          primary={
            <button
              type="button"
              onClick={() => setResumeExamNow(true)}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-amber-100/48 bg-[linear-gradient(180deg,#fbbf24_0%,#b77912_100%)] px-5 py-3 text-sm font-bold text-white shadow-[0_14px_34px_rgba(251,191,36,0.22)] transition hover:brightness-110 focus:outline-none focus:ring-4 focus:ring-amber-300/20"
            >
              Resume exam
              <ArrowRight className="h-4 w-4" />
            </button>
          }
          secondary={
            <button
              type="button"
              onClick={abandonSession}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-rose-200/25 bg-rose-300/[0.08] px-5 py-3 text-sm font-bold text-rose-100 transition hover:bg-rose-300/14 focus:outline-none focus:ring-4 focus:ring-rose-300/18"
            >
              Discard
            </button>
          }
        />
      ) : null}

      {recentExamHistory.length ? (
        <Surface className="border-violet-200/20 bg-violet-300/[0.05]">
          <SectionHeading
            title="Recent exam history"
            description="Review the last exam-style blocks before starting another timed set."
            action={
              <Link
                to="/performance-analytics"
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-violet-200/24 bg-violet-300/[0.08] px-3 py-2 text-xs font-black uppercase tracking-[0.12em] text-violet-100 transition hover:bg-violet-300/14"
              >
                View history
                <ArrowRight className="h-4 w-4" />
              </Link>
            }
          />
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {recentExamHistory.map((session) => (
              <div key={session.id} className="rounded-2xl border border-violet-200/16 bg-white/[0.04] p-4">
                <p className="text-xs font-black uppercase tracking-[0.14em] text-violet-100/58">
                  {new Date(session.completedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                </p>
                <p className="mt-2 text-2xl font-black text-white">{Math.round(session.score * 100)}%</p>
                <p className="mt-1 text-sm font-semibold text-sky-100/64">
                  {session.answeredCount}/{session.questionCount} questions
                </p>
                <Link
                  to="/weak-areas"
                  className="mt-3 inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-cyan-200/18 bg-cyan-300/[0.07] px-3 py-2 text-sm font-bold text-cyan-100"
                >
                  Review misses
                </Link>
              </div>
            ))}
          </div>
        </Surface>
      ) : null}

      <FocusPanel className="border-amber-200/34 bg-[linear-gradient(135deg,rgba(251,191,36,0.15),rgba(6,28,49,0.92)_42%,rgba(2,8,18,0.94))] text-white shadow-[0_0_38px_rgba(251,191,36,0.12)]">
        <div className="grid gap-5 p-5 md:p-6 xl:grid-cols-[minmax(0,1fr)_20rem] xl:items-end">
          <div>
            <div className="flex flex-wrap gap-2">
              <CommandBadge tone="amber" icon={<Clock3 className="h-3.5 w-3.5" />}>Current mode</CommandBadge>
              <CommandBadge tone="cyan" icon={<BadgeCheck className="h-3.5 w-3.5" />}>{activeTrack.shortName}</CommandBadge>
            </div>
            <h3 className="mt-4 max-w-3xl text-3xl font-bold tracking-normal text-white md:text-5xl">
              {examMode} exam block
            </h3>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-sky-100/72">
              {questionCount} mixed questions with a clean result screen after you finish. Advanced settings stay below so starting the test is the obvious action.
            </p>
            <div className="mt-6 grid gap-2 sm:grid-cols-3">
              {modeOptions.map((mode) => (
                <button
                  key={mode.label}
                  type="button"
                  onClick={mode.onSelect}
                  className={clsx(
                    'min-h-[58px] rounded-2xl border px-4 py-3 text-left transition focus:outline-none focus:ring-4',
                    mode.active
                      ? 'border-amber-100/55 bg-amber-300/18 text-white shadow-[0_0_26px_rgba(251,191,36,0.16)] focus:ring-amber-300/20'
                      : 'border-cyan-200/18 bg-white/[0.045] text-sky-100/74 hover:border-cyan-100/42 hover:bg-cyan-300/[0.08] focus:ring-cyan-300/18',
                  )}
                >
                  <span className="block text-sm font-bold">{mode.label}</span>
                  <span className="mt-1 block text-xs font-semibold text-sky-100/58">{mode.detail}</span>
                </button>
              ))}
            </div>
            <div className="mt-6">
              <Field label="Question count">
                <input
                  type="range"
                  min={20}
                  max={60}
                  step={5}
                  value={questionCount}
                  onChange={(event) => setQuestionCount(Number(event.target.value))}
                  className="w-full accent-amber-300"
                />
                <p className="mt-2 text-sm font-semibold text-sky-100/70">{questionCount} mixed questions</p>
              </Field>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-3 xl:grid-cols-1">
            <CommandStatTile label="Count" value={`${questionCount}`} detail="questions" tone="amber" icon={<ClipboardList className="h-4 w-4" />} />
            <CommandStatTile label="Mode" value={examMode} detail="exam setup" tone="cyan" icon={<Clock3 className="h-4 w-4" />} />
            <CommandStatTile label="Review" value="After" detail="miss queue" tone="violet" icon={<BarChart3 className="h-4 w-4" />} />
          </div>
        </div>
      </FocusPanel>

      <DetailGrid>
        <Surface className="border-violet-200/22 bg-violet-300/[0.055]">
          <SectionHeading
            title="Results preview"
            description="One verdict first, then category signal and review queue."
          />
          <div className="mt-5 space-y-4">
            <ReviewRow icon={<CheckCircle2 className="h-4 w-4" />} title="Score + category breakdown" detail="See what held up under mixed exam pressure and where accuracy dropped." />
            <ReviewRow icon={<TrendingDown className="h-4 w-4" />} title="Missed questions review" detail="Review weak clinical decisions while the reasoning is still active in memory." />
            <ReviewRow icon={<Sparkles className="h-4 w-4" />} title="Next prep move" detail="Close each test with a concrete follow-up instead of a vague score report." />
          </div>
        </Surface>

        <Surface>
          <SectionHeading
            title="Advanced settings"
            description="Useful controls, parked below the start action."
          />
          <div className="mt-5 grid gap-4">
            <ToggleRow label="Timed mode" description="Uses a realistic countdown and keeps the interface lean." checked={timed} onChange={setTimed} />
            <ToggleRow label="No backtracking" description="Once you move forward, you stay forward." checked={noBacktracking} onChange={setNoBacktracking} />
          </div>
        </Surface>
      </DetailGrid>
    </PageStack>
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

  return (
    <div className="space-y-6">
      <CommandPageIntro
        title="One readout. One next move."
        description={`${performanceTakeaway} Readiness is practice evidence from Nurse Command activity, not a licensure prediction or official exam guarantee.`}
        badges={
          <>
            <CommandBadge tone="cyan" icon={<BarChart3 className="h-3.5 w-3.5" />}>
              Performance
            </CommandBadge>
            <CommandBadge tone="emerald" icon={<ShieldCheck className="h-3.5 w-3.5" />}>
              Practice evidence
            </CommandBadge>
            <CommandBadge tone="amber" icon={<Target className="h-3.5 w-3.5" />}>
              {activeTrack.shortName}
            </CommandBadge>
          </>
        }
        action={
          <>
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
            <Link
              to="/weak-areas"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-cyan-100/45 bg-[linear-gradient(180deg,#24b8ff_0%,#0b83d6_100%)] px-5 py-3 text-sm font-bold text-white shadow-[0_12px_34px_rgba(14,165,233,0.24)] transition hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-cyan-200/55"
            >
              Open remediation
              <Target className="h-4 w-4" />
            </Link>
            <Link
              to="/practice-questions"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-sky-200/22 bg-white/[0.06] px-5 py-3 text-sm font-bold text-sky-100 transition hover:border-sky-200/45 hover:bg-white/[0.09]"
            >
              Start practice
              <ArrowRight className="h-4 w-4" />
            </Link>
          </>
        }
        aside={
          <div className="h-full rounded-[1rem] border border-emerald-200/24 bg-emerald-300/[0.07] p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-sky-100/70">Readiness</p>
                <p className="mt-2 text-3xl font-bold text-white">{readinessLabel}</p>
                <p className="text-sm font-semibold text-sky-100/75">{readinessPercent}% readiness score</p>
              </div>
              <span className="rounded-lg border border-white/12 bg-white/8 px-2.5 py-1 text-[0.68rem] font-bold uppercase text-emerald-100">
                Signal
              </span>
            </div>
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
        }
        stats={
          <>
            <CommandStatTile
              label="Accuracy"
              value={`${Math.round(readiness.practiceAccuracy * 100)}%`}
              detail={`${analytics.questionsCompleted} questions completed`}
              icon={<Activity className="h-4 w-4" />}
              tone={readiness.practiceAccuracy >= 0.75 ? 'emerald' : 'amber'}
            />
            <CommandStatTile
              label="Trusted"
              value={`${readiness.trustedAttemptCount}`}
              detail={`${readiness.practiceAttemptCount} practice attempts`}
              icon={<BadgeCheck className="h-4 w-4" />}
              tone={readiness.status === 'ready' ? 'emerald' : 'cyan'}
            />
            <CommandStatTile
              label="Repair"
              value={`${repairQueueCount}`}
              detail="Transfer proof needed"
              icon={<Target className="h-4 w-4" />}
              tone={repairQueueCount ? 'rose' : 'emerald'}
            />
          </>
        }
      />

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
                    className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-cyan-300/24 bg-cyan-300/10 px-4 py-2 text-sm font-bold text-cyan-100 transition hover:border-cyan-200/60 hover:bg-cyan-300/16"
                  >
                    Repair target
                    <Target className="h-4 w-4" />
                  </Link>
                  <Link
                    to="/practice-questions"
                    className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-bold text-sky-100/76 transition hover:border-cyan-200/40 hover:text-white"
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

      <Surface className="p-0">
        <details>
          <summary className="flex cursor-pointer list-none flex-col gap-2 p-5 md:p-6">
            <span className="text-xs font-black uppercase tracking-[0.16em] text-sky-100/58">Optional details</span>
            <span className="text-2xl font-black tracking-normal text-white">History and method notes</span>
            <span className="text-sm leading-6 text-sky-100/64">
              Open this after the main takeaway when you need the evidence count, scope, and methodology.
            </span>
          </summary>
          <div className="border-t border-cyan-200/14 p-5 md:p-6">
            <div className="grid gap-3 md:grid-cols-4">
              <MetricChip label="Questions" value={`${analytics.questionsCompleted}`} />
              <MetricChip label="Trusted attempts" value={`${readiness.trustedAttemptCount}`} />
              <MetricChip label="Coverage gaps" value={`${readiness.coverageGaps.length}`} />
              <MetricChip label="Scope" value={(profile.preferences.analyticsScope ?? 'selected-track') === 'selected-track' ? activeTrack.shortName : 'All exams'} />
            </div>
            <div className="mt-5 rounded-2xl border border-cyan-200/15 bg-sky-300/[0.045] p-4">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-sky-100/56">Method note</p>
              <p className="mt-2 text-sm leading-7 text-sky-100/70">
                Performance separates practice attempts, trusted evidence, confidence mismatches, and coverage gaps so the next action stays about learning behavior rather than a single chart line.
              </p>
            </div>
          </div>
        </details>
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
  const [flashcardFeedbackOpen, setFlashcardFeedbackOpen] = useState(false)
  const [flashcardFeedbackReason, setFlashcardFeedbackReason] =
    useState<ContentFeedbackReason>('source_concern')
  const [flashcardFeedbackNote, setFlashcardFeedbackNote] = useState('')
  const [flashcardFeedbackSubmittedId, setFlashcardFeedbackSubmittedId] = useState<string | null>(null)
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

  const setCardStatus = (status: FlashcardStatus) => {
    if (!currentCard) return
    if (currentCard.origin === 'imported') {
      void updateMaterialFlashcardStatus(currentCard.id, status)
      return
    }
    updateFlashcardStatus(currentCard.id, status)
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
            <h3 className="mt-2 nc-section-title text-2xl text-[var(--nclex-text)]">
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
                  <h3 className="mt-2 nc-section-title text-2xl text-[#163042]">Card {activeIndex + 1} of {filtered.length}</h3>
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
              {currentCardNeedsDraftWarning ? (
                <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                  <div className="flex gap-3">
                    <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
                    <div>
                      <p className="font-semibold">Beta draft: source-needed and not SME reviewed.</p>
                      <p className="mt-1 leading-6">
                        Use this card as draft practice only. It is not source checked and remains under content review.
                      </p>
                      <p className="mt-2 text-xs font-semibold uppercase tracking-[0.14em] text-amber-700">
                        {currentCard.sourceStatus ?? 'source_needed'} / {currentCard.clinicalReviewStatus ?? 'not_sme_reviewed'}
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
                  Swipe cards - tap to flip
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
  const profile = useStudySystemStore((state) => state.profile)
  const materialsHydrated = useStudySystemStore((state) => state.materialsHydrated)
  const materials = useStudySystemStore((state) => state.materials)
  const materialFlashcards = useStudySystemStore((state) => state.materialFlashcards)
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
  const [selectedMaterialId, setSelectedMaterialId] = useState<string | null>(null)
  const [dragActive, setDragActive] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [materialUrl, setMaterialUrl] = useState('')
  const [assistedImportOpen, setAssistedImportOpen] = useState(false)
  const [assistedImportText, setAssistedImportText] = useState('')
  const [assistedImportMode, setAssistedImportMode] = useState<MaterialImportMode>('full')
  const [assistedSourceUrl, setAssistedSourceUrl] = useState('')
  const [blockedImportSourceUrl, setBlockedImportSourceUrl] = useState('')
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

  const readyCount = materials.filter((item) => item.extractionStatus === 'ready').length
  const errorCount = materials.filter((item) => item.extractionStatus === 'error').length
  const pendingReviewCount = materials.filter((item) => item.reviewStatus === 'pending-review').length
  const totalGeneratedCards = materialFlashcards.length
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
        'Quizlet-style study sites usually block direct import. Assisted import is open: copy the visible terms and definitions from the set, then paste or read clipboard below.',
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
        setUploadMessage('This site blocks direct import. Assisted import is open: copy the visible terms, definitions, or notes from the page, then paste or read clipboard below.')
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
    <div className="space-y-6">
      <CommandPageIntro
        title="Your Study Library"
        description="Add class material, review what Nurse Command creates, then study only the tools you approve."
        badges={
          <>
            <CommandBadge tone="violet" icon={<FolderOpen className="h-3.5 w-3.5" />}>
              Library
            </CommandBadge>
            <CommandBadge tone="amber" icon={<ShieldCheck className="h-3.5 w-3.5" />}>
              Review gate
            </CommandBadge>
            <CommandBadge tone="cyan" icon={<UploadCloud className="h-3.5 w-3.5" />}>
              {materials.length} files
            </CommandBadge>
          </>
        }
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
        aside={
          <div className="h-full rounded-[1rem] border border-violet-200/24 bg-violet-300/[0.08] p-4">
            <p className="text-xs font-bold uppercase text-violet-100/72">Study tools</p>
            <p className="mt-2 text-3xl font-bold text-white">{totalGeneratedCards + materialQuestions.length}</p>
            <p className="text-sm font-semibold text-sky-100/70">approved cards + quiz items</p>
            <p className="mt-4 text-sm leading-6 text-sky-100/62">
              Gold marks anything that needs review before it enters your study flow.
            </p>
          </div>
        }
        stats={
          <>
            <CommandStatTile label="Materials" value={`${materials.length}`} detail="uploaded sources" icon={<FolderOpen className="h-4 w-4" />} tone="violet" />
            <CommandStatTile label="Needs review" value={`${pendingReviewCount}`} detail="approve first" icon={<ShieldCheck className="h-4 w-4" />} tone="amber" />
            <CommandStatTile label="Ready" value={`${readyCount}`} detail="clean sources" icon={<CheckCircle2 className="h-4 w-4" />} tone="emerald" />
          </>
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
                  ? 'Quizlet-style sites usually block scraping. We will open Assisted import so you can copy the visible set once and keep moving.'
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
            <div className="mt-5 rounded-2xl border border-violet-200/20 bg-violet-300/[0.06] p-4">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-violet-100/70">User-added material total</p>
                <p className="mt-2 text-3xl font-bold text-white">{materials.length}</p>
                <p className="text-sm font-semibold text-sky-100/66">uploaded files and links in your library</p>
            </div>
            </div>
          </NurseCommandBackdrop>

          <Surface className="border-violet-200/18 bg-violet-300/[0.045]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="nc-section-title text-2xl text-white">Materials library</h3>
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
                  const materialPendingTotal = (material.pendingFlashcards?.length ?? 0) + (material.pendingQuestions?.length ?? 0)
                  const materialApprovedTotal = material.generatedFlashcardIds.length + material.generatedQuestionIds.length
                  const materialActionLabel =
                    material.extractionStatus === 'error'
                      ? 'Fix source'
                      : material.extractionStatus === 'extracting'
                        ? 'Processing'
                        : material.reviewStatus === 'pending-review'
                          ? 'Review generated tools'
                          : materialApprovedTotal
                            ? 'Ready to study'
                            : 'Open material'

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
                            <span className={materialStatusClass(material.extractionStatus)}>
                              {material.extractionStatus === 'error'
                                ? 'Needs attention'
                                : material.extractionStatus === 'extracting'
                                  ? 'Extracting'
                                  : 'Ready'}
                            </span>
                          </div>
                          <p className="mt-3 truncate text-base font-semibold text-white">
                            {material.displayTitle}
                          </p>
                          <p className="mt-1 text-sm text-sky-100/58">
                            Imported {formatImportDate(material.importedAt)}
                          </p>
                          <span className="mt-3 inline-flex min-h-8 items-center rounded-lg border border-violet-200/24 bg-violet-300/[0.08] px-3 py-1 text-xs font-semibold text-violet-100">
                            {materialActionLabel}
                          </span>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-sm font-semibold text-white">
                            {material.reviewStatus === 'pending-review'
                              ? `${materialPendingTotal} pending`
                              : `${material.generatedFlashcardIds.length} cards`}
                          </p>
                          <p className="mt-1 text-xs text-sky-100/54">
                            {material.reviewStatus === 'pending-review'
                              ? 'Approve first'
                              : `${material.generatedQuestionIds.length} quiz items`}
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
                    <span className={materialStatusClass(selectedMaterial.extractionStatus)}>
                      {selectedMaterial.extractionStatus === 'error'
                        ? "We couldn't read this file cleanly"
                        : selectedMaterial.extractionStatus === 'extracting'
                          ? 'Pulling study material into your library'
                          : 'Study tools ready'}
                    </span>
                  </div>
                  <h3 className="mt-3 nc-section-title text-3xl text-white">
                    {selectedMaterial.displayTitle}
                  </h3>
                  <p className="mt-2 text-sm leading-7 text-sky-100/64">
                    {selectedMaterial.error
                      ? selectedMaterial.error
                      : `${selectedMaterial.textLength.toLocaleString()} characters extracted locally from ${selectedMaterial.filename}.`}
                  </p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <MetricChip label="Flashcards" value={`${selectedFlashcardCount}`} />
                  <MetricChip label="Quiz items" value={`${selectedQuestionCount}`} />
                  {selectedMaterial.reviewStatus === 'pending-review' ? (
                    <MetricChip label="Pending" value={`${selectedPendingTotal}`} />
                  ) : null}
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
                  description="Direct scraping failed or the text was unreadable. Use assisted paste for Quizlet-style pages, retry the source, or remove the failed import from your library."
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
                            setUploadMessage('Source link restored. Import again or open assisted import if the site blocks scraping.')
                          }}
                          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-cyan-200/24 bg-cyan-300/[0.07] px-5 py-3 text-sm font-bold text-cyan-100 transition hover:border-cyan-100/55 hover:bg-cyan-300/13 focus:outline-none focus:ring-4 focus:ring-cyan-300/18"
                        >
                          Retry link
                          <RefreshCw className="h-4 w-4" />
                        </button>
                      ) : null}
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
                    Manage material
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
                      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 sm:col-span-2"
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
                      <h4 className="mt-2 nc-section-title text-2xl text-[var(--nclex-text)]">
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
              ? 'border-rose-200 bg-rose-50 text-rose-800'
              : 'border-amber-200 bg-amber-50 text-amber-800',
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
          <h4 className="mt-2 nc-section-title text-2xl text-[var(--nclex-text)]">
            Approve generated study tools
          </h4>
          <p className="mt-2 max-w-3xl text-sm leading-7 text-[var(--nclex-text-muted)]">
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
            ? 'border-rose-200 bg-rose-50 text-rose-800'
            : qualitySummary.warningCount
              ? 'border-amber-200 bg-amber-50 text-amber-800'
              : 'border-emerald-200 bg-emerald-50 text-emerald-800',
        )}
      >
        {qualitySummary.blockerCount
          ? `${qualitySummary.blockerCount} item issue${qualitySummary.blockerCount === 1 ? '' : 's'} must be fixed or removed before those items save.`
          : qualitySummary.warningCount
            ? `${qualitySummary.warningCount} review note${qualitySummary.warningCount === 1 ? '' : 's'} found. You can still approve ready items.`
            : 'Generated tools passed the review checks and are ready to save.'}
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
                  <MaterialQualityMessages issues={qualitySummary.issuesByItemId[question.id] ?? []} />
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
                        <div key={choice.id} className="flex flex-col gap-2 rounded-xl border border-[var(--nclex-border)] bg-[var(--nclex-card-muted)] p-2 sm:flex-row sm:items-center">
                          <label className="inline-flex min-h-9 shrink-0 items-center gap-2 rounded-lg border border-[var(--nclex-border)] bg-white px-3 text-xs font-semibold text-[var(--nclex-text-secondary)]">
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
                            className="min-h-10 flex-1 rounded-lg border border-[var(--nclex-border)] bg-white px-3 py-2 text-sm text-[var(--nclex-text)] outline-none transition focus:border-[#93c5fd] focus:ring-4 focus:ring-[#dbeafe]"
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
              <h3 className="mt-3 nc-section-title text-3xl leading-tight md:text-[2.15rem]">
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
                  <p className="text-lg font-bold text-white">{item.value}</p>
                  <p className="mt-1 text-[0.68rem] font-bold uppercase tracking-[0.12em] text-sky-100/62">{item.label}</p>
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
                  <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-cyan-300/12 text-sm font-bold text-cyan-100">
                    {index + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="font-bold text-white">{task.title}</p>
                    <p className="mt-1 text-sm leading-6 text-sky-100/70">{task.detail}</p>
                  </div>
                </div>
                <span className="w-fit shrink-0 rounded-full border border-cyan-200/25 bg-cyan-300/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-cyan-100">
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
                  <span className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-cyan-300/12 text-xs font-bold text-cyan-100">
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
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-100/70">Today progress</p>
                <p className="mt-2 text-3xl font-bold text-white">{todayCompleted}/{profile.dailyGoal}</p>
                <p className="text-sm font-semibold text-sky-100/70">questions completed</p>
              </div>
              <span className="rounded-full border border-emerald-200/25 bg-emerald-300/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-emerald-100">
                {Math.round(todayProgress * 100)}%
              </span>
            </div>
            <div className="mt-4">
              <ProgressBar value={todayProgress} tone="green" />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-1">
            <div className="rounded-2xl border border-cyan-200/15 bg-sky-300/[0.055] p-4">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-sky-100/58">Intensity</p>
              <p className="mt-2 text-xl font-bold capitalize text-white">{profile.studyIntensity}</p>
            </div>
            <div className="rounded-2xl border border-amber-200/20 bg-amber-300/[0.07] p-4">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-amber-100/62">Exam window</p>
              <p className="mt-2 text-xl font-bold text-white">{daysUntilExam} days</p>
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
            className="nclex-btn-primary inline-flex min-h-[48px] items-center gap-2 rounded-xl px-5 py-3 text-sm font-bold"
          >
            Start featured lab
            <ArrowRight className="h-4 w-4" />
          </Link>
        }
      />

      <FocusPanel className="nclex-dark-panel text-white">
        <div className="grid gap-5 p-5 md:p-6 xl:grid-cols-[minmax(0,1fr)_22rem] xl:items-stretch">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-200">Featured lab</p>
            <h3 className="mt-3 max-w-3xl text-3xl font-bold tracking-normal text-white md:text-5xl">
              {featuredLabModule.title}
            </h3>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-sky-100/72">
              {featuredLabModule.description} Use this first when you want a clinical judgment loop instead of another question set.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Link
                to={featuredLabModule.to}
                className="nclex-btn-primary inline-flex min-h-[52px] items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-bold"
              >
                {featuredLabModule.action}
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/quick-study"
                className="nclex-btn-secondary inline-flex min-h-[52px] items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-bold"
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
                  <span className="rounded-full border border-cyan-300/25 bg-white/[0.04] px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-sky-100/64">
                    {meta}
                  </span>
                </div>
                <h2 className="mt-5 text-2xl font-bold tracking-normal text-white">{title}</h2>
                <p className="mt-3 text-sm leading-6 text-sky-100/66">{description}</p>
              </div>
            </div>
            <Link
              to={to}
              className="mx-5 mb-5 inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl border border-cyan-300/24 bg-white/[0.04] px-4 py-3 text-sm font-bold text-cyan-100 transition group-hover:border-cyan-200/60 group-hover:bg-cyan-300/12 md:mx-6 md:mb-6"
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
        title="Pick a thinking pattern, then practice it."
        description="Curated NCLEX strategy support for prioritization, delegation, first action, and safety decisions."
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
      <NextActionPanel
        eyebrow="Recommended"
        title="Run a prioritization drill."
        description="The fastest use of Resources is not reading more. Pick a decision type, answer a few items, then review the rationale."
        tone="cyan"
        primary={
          <button
            type="button"
            onClick={() => startClinicalThinking('Prioritization')}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-cyan-100/45 bg-[linear-gradient(180deg,#24b8ff_0%,#0b83d6_100%)] px-5 py-3 text-sm font-bold text-white shadow-[0_12px_34px_rgba(14,165,233,0.24)] transition hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-cyan-200/55"
          >
            Start prioritization drill
            <ArrowRight className="h-4 w-4" />
          </button>
        }
        secondary={
          <Link
            to="/my-materials"
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-violet-200/24 bg-violet-300/[0.08] px-5 py-3 text-sm font-bold text-violet-100 transition hover:bg-violet-300/14"
          >
            Add class material
            <FolderOpen className="h-4 w-4" />
          </Link>
        }
      />
      <Surface className="overflow-hidden p-0">
        <div className="flex flex-col gap-5 bg-[linear-gradient(135deg,#ffffff_0%,#eef5ff_100%)] px-5 py-6 lg:flex-row lg:items-end lg:justify-between md:px-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--nclex-blue)]">Clinical thinking mode</p>
            <h3 className="mt-3 nc-section-title text-4xl text-[var(--nclex-text)]">Drill the decision types that move scores.</h3>
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
      <div className="grid gap-4">
        {strategyLessons.map((lesson) => (
          <Surface key={lesson.id} className="p-0">
            <details className="group">
              <summary className="flex cursor-pointer list-none flex-col gap-3 p-5 md:flex-row md:items-center md:justify-between md:p-6">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-100/66">{lesson.framework}</p>
                  <h3 className="mt-2 text-2xl font-black tracking-normal text-white">{lesson.title}</h3>
                  <p className="mt-2 max-w-3xl text-sm leading-6 text-sky-100/64">{lesson.summary}</p>
                </div>
                <span className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-cyan-200/24 bg-cyan-300/[0.07] px-4 py-2 text-sm font-bold text-cyan-100">
                  Open framework
                  <ArrowRight className="h-4 w-4" />
                </span>
              </summary>
              <div className="grid gap-5 border-t border-cyan-200/14 p-5 lg:grid-cols-[0.95fr_1.05fr] md:p-6">
                <div>
                  <ul className="space-y-3 text-sm leading-6 text-sky-100/70">
                    {lesson.bullets.map((bullet) => (
                      <li key={bullet}>{bullet}</li>
                    ))}
                  </ul>
                  <button
                    type="button"
                    onClick={() => startClinicalThinking(lesson.framework)}
                    className="mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-cyan-200/24 bg-cyan-300/[0.07] px-4 py-2 text-sm font-bold text-cyan-100 transition hover:bg-cyan-300/13 focus:outline-none focus:ring-4 focus:ring-cyan-300/18"
                  >
                    Practice this
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
                <div className="rounded-[18px] border border-cyan-200/16 bg-cyan-300/[0.06] p-5">
                  <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200/24 bg-emerald-300/[0.08] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-100">
                    <BrainCircuit className="h-3.5 w-3.5" />
                    Mini scenario
                  </div>
                  <p className="mt-4 font-semibold text-white">{lesson.microScenario.prompt}</p>
                  <p className="mt-3 text-sm leading-6 text-sky-100/70">{lesson.microScenario.bestResponse}</p>
                </div>
              </div>
            </details>
          </Surface>
        ))}
      </div>
    </div>
  )
}

export function NotesPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const seedCategory = searchParams.get('category')
  const profile = useStudySystemStore((state) => state.profile)
  const notes = useStudySystemStore((state) => state.notes)
  const saveNote = useStudySystemStore((state) => state.saveNote)
  const deleteNote = useStudySystemStore((state) => state.deleteNote)
  const importStudyMaterialFromText = useStudySystemStore((state) => state.importStudyMaterialFromText)
  const startPracticeSession = useStudySystemStore((state) => state.startPracticeSession)
  const [selectedCategory, setSelectedCategory] = useState<string>(seedCategory ?? 'All')
  const [search, setSearch] = useState('')
  const deferredSearch = useDeferredValue(search)
  const [noteMessage, setNoteMessage] = useState('')
  const [draft, setDraft] = useState<Note>({
    id: createClientId(),
    title: '',
    body: '',
    category: (seedCategory as QuestionCategory) ?? 'General',
    updatedAt: new Date().toISOString(),
  })
  const trackCategories = getExamCategories(profile.examTrack ?? 'nclex-rn')
  const resetDraft = () => {
    setDraft({
      id: createClientId(),
      title: '',
      body: '',
      category: (seedCategory as QuestionCategory) ?? 'General',
      updatedAt: new Date().toISOString(),
    })
    setNoteMessage('')
  }
  const draftHasContent = Boolean(draft.title.trim() || draft.body.trim())
  const saveDraft = () => {
    if (!draftHasContent) {
      setNoteMessage('Add a title or body before saving this note.')
      return false
    }
    saveNote({ ...draft, updatedAt: new Date().toISOString() })
    setNoteMessage('Note saved.')
    return true
  }
  const convertDraftToMaterial = async (mode: MaterialImportMode = 'full') => {
    if (!saveDraft()) return
    try {
      await importStudyMaterialFromText({
        mode,
        title: draft.title.trim() || 'Study note',
        text: [draft.title, draft.body].filter(Boolean).join('\n\n'),
      })
      navigate('/my-materials')
    } catch (error) {
      reportSafeError('material-assisted-import', error)
      setNoteMessage(getSafeErrorCopy('material-assisted-import'))
    }
  }
  const quizDraftTopic = () => {
    if (draft.category === 'General') {
      navigate('/practice-questions')
      return
    }
    startPracticeSession({
      category: draft.category,
      difficulty: 'adaptive',
      format: 'mixed',
      questionCount: 10,
    })
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
    <div className="space-y-6">
      <PageHeader
        eyebrow="Notes"
        title="Turn your own words into study tools."
        description="Capture the clinical anchor, attach it to a topic, then turn it into review tools when it is worth practicing."
        action={
          <button
            type="button"
            onClick={resetDraft}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-amber-100/48 bg-[linear-gradient(180deg,#fbbf24_0%,#b77912_100%)] px-5 py-3 text-sm font-bold text-white shadow-[0_14px_34px_rgba(251,191,36,0.2)] transition hover:brightness-110 focus:outline-none focus:ring-4 focus:ring-amber-300/20"
          >
            <NotebookPen className="h-4 w-4" />
            New note
          </button>
        }
      />
      <NextActionPanel
        eyebrow="Library action"
        title={draftHasContent ? 'Make this note usable.' : 'Start with one clinical anchor.'}
        description={draftHasContent ? 'Save it, turn it into editable cards and quiz items, or run a topic drill from the attached category.' : 'Write the rule, pitfall, or reminder that makes an answer click. Keep it short enough to review later.'}
        tone="violet"
        primary={
          <button
            type="button"
            onClick={() => void convertDraftToMaterial('full')}
            disabled={!draftHasContent}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-violet-200/30 bg-violet-300/[0.1] px-5 py-3 text-sm font-bold text-violet-100 transition hover:bg-violet-300/16 focus:outline-none focus:ring-4 focus:ring-violet-300/18 disabled:cursor-not-allowed disabled:opacity-45"
          >
            Make cards + quiz
            <Sparkles className="h-4 w-4" />
          </button>
        }
        secondary={
          <button
            type="button"
            onClick={quizDraftTopic}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-cyan-200/24 bg-cyan-300/[0.07] px-5 py-3 text-sm font-bold text-cyan-100 transition hover:border-cyan-100/55 hover:bg-cyan-300/13 focus:outline-none focus:ring-4 focus:ring-cyan-300/18"
          >
            Quiz this topic
            <ClipboardList className="h-4 w-4" />
          </button>
        }
      />
      {noteMessage ? (
        <p role="status" aria-live="polite" className="rounded-2xl border border-cyan-200/20 bg-cyan-300/[0.08] px-4 py-3 text-sm font-semibold text-cyan-100">
          {noteMessage}
        </p>
      ) : null}
      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <Surface>
          <div className="mb-5 grid gap-3 md:grid-cols-3">
            <CommandActionCard
              title="Create clinical anchor"
              description="Capture the one rule or pitfall you want to remember."
              meta="Write"
              icon={<NotebookPen className="h-4 w-4" />}
              tone="violet"
              onClick={resetDraft}
            />
            <CommandActionCard
              title="Import larger notes"
              description="Use Materials when a file, lecture handout, or copied page needs parsing."
              meta="Import"
              icon={<Upload className="h-4 w-4" />}
              tone="cyan"
              to="/my-materials"
            />
            <CommandActionCard
              title="Review missed areas"
              description="Open the repair queue and attach notes to the weak topic."
              meta="Repair"
              icon={<Target className="h-4 w-4" />}
              tone="rose"
              to="/weak-areas"
            />
          </div>
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
            {filteredNotes.length ? filteredNotes.map((note) => (
              <button
                key={note.id}
                type="button"
                onClick={() => setDraft(note)}
                className="w-full rounded-2xl border border-cyan-200/16 bg-white/[0.045] p-4 text-left transition hover:border-cyan-100/38 focus:outline-none focus:ring-2 focus:ring-cyan-200/55"
              >
                <div className="flex items-center justify-between gap-4">
                  <p className="font-semibold text-white">{note.title || 'Untitled note'}</p>
                  <span className="nclex-chip nclex-chip-info">
                    {note.category}
                  </span>
                </div>
                <p className="mt-2 line-clamp-2 text-sm leading-6 text-sky-100/62">{note.body}</p>
              </button>
            )) : (
              <EmptyState
                title="No notes match this view."
                description="Create a clinical anchor, relax the filters, or import a larger study file into Materials."
              />
            )}
          </div>
        </Surface>
        <Surface>
          <div className="flex items-center justify-between">
            <h3 className="nc-section-title text-3xl text-white">{draft.title || 'New note'}</h3>
            <button
              type="button"
              onClick={resetDraft}
              className="inline-flex min-h-10 items-center justify-center rounded-xl border border-cyan-200/20 bg-cyan-300/[0.07] px-4 py-2 text-sm font-semibold text-cyan-100"
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
              onClick={() => saveDraft()}
              className="nclex-btn-primary rounded-xl px-4 py-2.5 text-sm font-semibold"
            >
              Save note
            </button>
            <button
              type="button"
              onClick={() => {
                deleteNote(draft.id)
                resetDraft()
                setNoteMessage('Note deleted.')
              }}
              className="rounded-xl border border-rose-200/25 bg-rose-300/[0.08] px-4 py-2.5 text-sm font-semibold text-rose-100"
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
          <h3 className="nc-section-title text-3xl text-[#163042]">Profile preferences</h3>
          <div className="mt-6 grid gap-4">
            <div className="rounded-[20px] border border-[var(--nclex-border)] bg-[var(--nclex-card-muted)] p-4">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-[#b8d7f4] bg-[linear-gradient(180deg,#0f7aff_0%,#062d63_100%)] text-xl font-bold text-white shadow-[0_12px_28px_rgba(43,148,255,0.22)]">
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
                      <span className="mt-3 inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-700">
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
          <h3 className="nc-section-title text-3xl text-[#163042]">Cloud account & sync</h3>
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
          <h3 className="mt-7 nc-section-title text-3xl text-[#163042]">Monetization-ready structure</h3>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <FeatureCallout title="User accounts" description="Supabase Auth now provides real account sessions and password recovery entry points." />
            <FeatureCallout title="Saved progress" description="Attempts, flashcards, notes, materials, and generated study tools can sync to Postgres." />
            <FeatureCallout title="Premium tiers" description="Feature gating can layer on top of existing page and session boundaries." />
            <FeatureCallout title="Retention hooks" description="Quick Study, streaks, weak-area review, and notes already support daily return behavior." />
          </div>
          <h3 className="mt-7 nc-section-title text-3xl text-[#163042]">Privacy, terms & support</h3>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <FeatureCallout title="Privacy" description="Cloud accounts store your email and synced study activity. Do not upload protected health information or patient-identifying material." />
            <FeatureCallout title="Terms" description="Nurse Command is practice study support only. Readiness and adaptive signals are practice evidence, not clinical advice or licensure guarantees." />
            <FeatureCallout title="Support" description="For account, email, or study-material issues, contact support@nursecommand.com." />
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
    <div className="nclex-soft-panel rounded-[18px] p-4">
      <p className="font-semibold text-[var(--nclex-text)]">{title}</p>
      <p className="mt-2 text-sm leading-6 text-[var(--nclex-text-muted)]">{description}</p>
    </div>
  )
}

function ExamTrackList({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-[18px] border border-cyan-200/16 bg-white/[0.045] p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-cyan-100/68">{title}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {items.map((item) => (
          <span key={item} className="rounded-full border border-cyan-200/18 bg-cyan-300/[0.07] px-3 py-1.5 text-xs font-semibold text-sky-100/78">
            {item}
          </span>
        ))}
      </div>
    </div>
  )
}

function ReviewRow({ icon, title, detail }: { icon: React.ReactNode; title: string; detail: string }) {
  return (
    <div className="rounded-[18px] border border-violet-200/18 bg-white/[0.045] p-4">
      <div className="flex items-center gap-3 text-violet-100">{icon}<p className="font-semibold text-white">{title}</p></div>
      <p className="mt-2 text-sm leading-6 text-sky-100/64">{detail}</p>
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
