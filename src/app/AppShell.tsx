import { AnimatePresence, motion } from 'framer-motion'
import {
  Bell,
  BookOpen,
  BookOpenCheck,
  Building2,
  CalendarCheck,
  ChartColumn,
  ChevronDown,
  ChevronLeft,
  ChevronsLeft,
  ChevronsRight,
  CircleHelp,
  ClipboardList,
  Cloud,
  FileClock,
  FlaskConical,
  FolderOpen,
  Gamepad2,
  HeartPulse,
  House,
  Layers,
  LayoutDashboard,
  LockKeyhole,
  Menu,
  NotebookPen,
  RefreshCw,
  Settings,
  Stethoscope,
  Timer,
  UsersRound,
  X,
} from 'lucide-react'
import {
  lazy,
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentType,
  type FormEvent,
  type ReactNode,
  type RefObject,
} from 'react'
import { NavLink, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { clsx } from 'clsx'
import { PublicLaunchPage } from '../features/PublicLaunchPages'
import { isPublicLaunchPath } from '../features/publicLaunchPaths'
import nursingCommandLogo from '../assets/brand/nursing-command-logo.png'
import { getExamTrack } from '../data/exam-tracks'
import { useStudySystemStore } from './store'
import { AuthGate } from './AuthGate'
import {
  checkAdminAccess,
  hasStoredAdminPreviewPasskeyAccess,
  isAdminPanelEnabled,
  isAdminPreviewPasskeyEnabled,
  isLocalAdminPreview,
  verifyAdminPreviewPasskey,
} from '../services/admin-analytics'
import { trackAppEvent } from '../services/analytics-client'
import {
  createBetaFeedbackMailto,
  recordBetaFeedback,
  type BetaFeedbackReport,
  type BetaFeedbackSentiment,
  type BetaFeedbackSource,
} from '../services/beta-feedback'

type NavigationItem = {
  label: string
  icon: ComponentType<{ className?: string }>
  to: string
  emphasis?: boolean
  activePaths?: string[]
}

type NavigationGroup = {
  title: string
  tone: NavigationTone
  items: NavigationItem[]
}

const nurseLabRoutePaths = [
  '/nurse-command-lab',
  '/shift-command',
  '/hospitalvania',
  '/nurse-tycoon',
  '/clinical-simulator',
]

const commandNavigation: NavigationItem[] = [
  { label: 'Home', icon: House, to: '/' },
  { label: 'Dashboard', icon: LayoutDashboard, to: '/dashboard' },
  { label: 'Study Plan', icon: CalendarCheck, to: '/study-plan' },
]

const practiceNavigation: NavigationItem[] = [
  { label: 'Question Bank', icon: ClipboardList, to: '/practice-questions' },
  { label: 'Quick Study', icon: Timer, to: '/quick-study' },
  { label: 'Exam Prep', icon: BookOpenCheck, to: '/exam-prep' },
  { label: 'Exams', icon: FileClock, to: '/test-mode' },
]

const reviewNavigation: NavigationItem[] = [
  { label: 'Remediation', icon: HeartPulse, to: '/weak-areas' },
  { label: 'Performance', icon: ChartColumn, to: '/performance-analytics' },
]

const libraryNavigation: NavigationItem[] = [
  { label: 'Study Library', icon: FolderOpen, to: '/my-materials' },
  { label: 'Flashcards', icon: Layers, to: '/flashcards' },
  { label: 'Notes', icon: NotebookPen, to: '/notes' },
  { label: 'Resources', icon: BookOpen, to: '/strategy-training' },
]

const communityNavigation: NavigationItem[] = [
  { label: 'Nurse Lab', icon: FlaskConical, to: '/nurse-command-lab', activePaths: nurseLabRoutePaths },
  { label: 'Social', icon: UsersRound, to: '/social' },
]

const labNavigation: NavigationItem[] = [
  { label: 'Shift Game', icon: HeartPulse, to: '/shift-command' },
  { label: 'Hospitalvania', icon: Gamepad2, to: '/hospitalvania' },
  { label: 'Tycoon', icon: Building2, to: '/nurse-tycoon' },
  { label: 'Simulator', icon: Stethoscope, to: '/clinical-simulator' },
]

const secondaryNavigation: NavigationItem[] = [
  { label: 'Settings', icon: Settings, to: '/settings' },
]

const mainNavigation = [
  ...commandNavigation,
  ...practiceNavigation,
  ...reviewNavigation,
  ...libraryNavigation,
  ...communityNavigation,
]

const studyToolsNavigation = [...practiceNavigation, ...reviewNavigation, ...libraryNavigation]

const sidebarNavigationGroups: NavigationGroup[] = [
  { title: 'Start', tone: 'cyan', items: commandNavigation },
  { title: 'Practice', tone: 'emerald', items: practiceNavigation },
  { title: 'Review', tone: 'amber', items: reviewNavigation },
  { title: 'Library', tone: 'rose', items: libraryNavigation },
  { title: 'Connect', tone: 'violet', items: communityNavigation },
]

const mobilePrimaryNavigation: NavigationItem[] = [
  { label: 'Dashboard', icon: LayoutDashboard, to: '/dashboard' },
  { label: 'Quick Study', icon: Timer, to: '/quick-study' },
  {
    label: 'Library',
    icon: FolderOpen,
    to: '/my-materials',
    activePaths: ['/flashcards', '/notes', '/strategy-training'],
  },
]

const mobileMoreNavigationGroups = [
  ...sidebarNavigationGroups,
  { title: 'Account', tone: 'slate' as const, items: secondaryNavigation },
]

const pageMetaNavigation = [...labNavigation, ...mainNavigation, ...studyToolsNavigation, ...secondaryNavigation]

const isNavigationItemActive = (pathname: string, item: NavigationItem) =>
  item.to === '/'
    ? pathname === '/'
    : pathname.startsWith(item.to) || item.activePaths?.some((path) => pathname.startsWith(path))

const isNavigationGroupActive = (pathname: string, group: NavigationGroup) =>
  group.items.some((item) => isNavigationItemActive(pathname, item))

const RetroMedicalDashboard = lazy(() =>
  import('../features/RetroMedicalDashboard').then((module) => ({
    default: module.RetroMedicalDashboard,
  })),
)
const ShiftSimulatorGame = lazy(() =>
  import('../features/ShiftSimulatorGame').then((module) => ({
    default: module.ShiftSimulatorGame,
  })),
)
const NurseHospitalvaniaGame = lazy(() =>
  import('../features/NurseHospitalvaniaGame').then((module) => ({
    default: module.NurseHospitalvaniaGame,
  })),
)
const NurseTycoonGame = lazy(() =>
  import('../features/NurseTycoonGame').then((module) => ({
    default: module.NurseTycoonGame,
  })),
)
const AdminMonitorPage = lazy(() =>
  import('../features/AdminMonitorPage').then((module) => ({
    default: module.AdminMonitorPage,
  })),
)
const StudyMenuPage = lazy(() =>
  import('../features/pages').then((module) => ({
    default: module.StudyMenuPage,
  })),
)
const DashboardPage = lazy(() =>
  import('../features/pages').then((module) => ({
    default: module.DashboardPage,
  })),
)
const ExamPrepPage = lazy(() =>
  import('../features/pages').then((module) => ({
    default: module.ExamPrepPage,
  })),
)
const PracticeQuestionsPage = lazy(() =>
  import('../features/pages').then((module) => ({
    default: module.PracticeQuestionsPage,
  })),
)
const TestModePage = lazy(() =>
  import('../features/pages').then((module) => ({
    default: module.TestModePage,
  })),
)
const NurseCommandLabPage = lazy(() =>
  import('../features/pages').then((module) => ({
    default: module.NurseCommandLabPage,
  })),
)
const ClinicalSimulatorPage = lazy(() =>
  import('../features/pages').then((module) => ({
    default: module.ClinicalSimulatorPage,
  })),
)
const QuickStudyPage = lazy(() =>
  import('../features/pages').then((module) => ({
    default: module.QuickStudyPage,
  })),
)
const WeakAreasPage = lazy(() =>
  import('../features/pages').then((module) => ({
    default: module.WeakAreasPage,
  })),
)
const PerformanceAnalyticsPage = lazy(() =>
  import('../features/pages').then((module) => ({
    default: module.PerformanceAnalyticsPage,
  })),
)
const FlashcardsPage = lazy(() =>
  import('../features/pages').then((module) => ({
    default: module.FlashcardsPage,
  })),
)
const StudyPlanPage = lazy(() =>
  import('../features/pages').then((module) => ({
    default: module.StudyPlanPage,
  })),
)
const StrategyTrainingPage = lazy(() =>
  import('../features/pages').then((module) => ({
    default: module.StrategyTrainingPage,
  })),
)
const NotesPage = lazy(() =>
  import('../features/pages').then((module) => ({
    default: module.NotesPage,
  })),
)
const MyMaterialsPage = lazy(() =>
  import('../features/pages').then((module) => ({
    default: module.MyMaterialsPage,
  })),
)
const SettingsPage = lazy(() =>
  import('../features/pages').then((module) => ({
    default: module.SettingsPage,
  })),
)
const SocialPage = lazy(() =>
  import('../features/SocialPage').then((module) => ({
    default: module.SocialPage,
  })),
)

function RouteLoadingScreen({ label = 'Loading module' }: { label?: string }) {
  return (
    <div className="grid min-h-screen place-items-center bg-[#04101f] px-6 text-center text-white">
      <div>
        <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-2xl border border-cyan-300/30 bg-cyan-400/10 text-cyan-200">
          <RefreshCw className="h-5 w-5 animate-spin" />
        </div>
        <p className="nc-eyebrow text-sky-200/72">
          {label}
        </p>
      </div>
    </div>
  )
}

function LazyRoute({
  children,
  label,
}: {
  children: ReactNode
  label?: string
}) {
  return <Suspense fallback={<RouteLoadingScreen label={label} />}>{children}</Suspense>
}

export function AppShell() {
  const location = useLocation()

  if (isPublicLaunchPath(location.pathname)) {
    return <PublicLaunchPage />
  }

  if (location.pathname.startsWith('/admin')) {
    return (
      <AdminAccessGate>
        <LazyRoute label="Loading admin cockpit">
          <AdminMonitorPage />
        </LazyRoute>
      </AdminAccessGate>
    )
  }

  if (location.pathname.startsWith('/medical-command-center')) {
    return (
      <LazyRoute label="Loading command center">
        <RetroMedicalDashboard />
      </LazyRoute>
    )
  }

  if (location.pathname.startsWith('/shift-command')) {
    return (
      <LazyRoute label="Loading shift game">
        <ShiftSimulatorGame />
      </LazyRoute>
    )
  }

  if (location.pathname.startsWith('/hospitalvania')) {
    return (
      <LazyRoute label="Loading Hospitalvania">
        <NurseHospitalvaniaGame />
      </LazyRoute>
    )
  }

  if (location.pathname.startsWith('/nurse-tycoon')) {
    return (
      <LazyRoute label="Loading tycoon">
        <NurseTycoonGame />
      </LazyRoute>
    )
  }

  return <NclexAppShell />
}

function NclexAppShell() {
  const location = useLocation()
  const navigate = useNavigate()
  const profile = useStudySystemStore((state) => state.profile)
  const authUser = useStudySystemStore((state) => state.authUser)
  const isDemoMode = useStudySystemStore((state) => state.isDemoMode)
  const syncStatus = useStudySystemStore((state) => state.syncStatus)
  const syncError = useStudySystemStore((state) => state.syncError)
  const migrationPromptVisible = useStudySystemStore((state) => state.migrationPromptVisible)
  const initializeAuth = useStudySystemStore((state) => state.initializeAuth)
  const initializeMaterials = useStudySystemStore((state) => state.initializeMaterials)
  const migrateLocalDataToCloud = useStudySystemStore((state) => state.migrateLocalDataToCloud)
  const dismissMigrationPrompt = useStudySystemStore((state) => state.dismissMigrationPrompt)
  const syncNow = useStudySystemStore((state) => state.syncNow)
  const signOut = useStudySystemStore((state) => state.signOut)
  const activeExamTrack = getExamTrack(profile.examTrack ?? 'nclex-rn')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [mobileMoreOpen, setMobileMoreOpen] = useState(false)
  const [supportOpen, setSupportOpen] = useState(false)
  const [accountOpen, setAccountOpen] = useState(false)
  const mobileMenuTriggerRef = useRef<HTMLButtonElement | null>(null)
  const mobileMenuCloseRef = useRef<HTMLButtonElement | null>(null)
  const mobileMoreTriggerRef = useRef<HTMLButtonElement | null>(null)
  const mobileMoreCloseRef = useRef<HTMLButtonElement | null>(null)
  const [expandedNavigationGroups, setExpandedNavigationGroups] = useState<Record<string, boolean>>({})
  const [desktopHubCollapsed, setDesktopHubCollapsed] = useState(() => {
    try {
      return window.localStorage.getItem('nurse-command-desktop-hub-collapsed') === 'true'
    } catch {
      return false
    }
  })

  const activeNavigationGroupTitle = useMemo(
    () => sidebarNavigationGroups.find((group) => isNavigationGroupActive(location.pathname, group))?.title ?? 'Start',
    [location.pathname],
  )

  useEffect(() => {
    void initializeAuth()
  }, [initializeAuth])

  useEffect(() => {
    void initializeMaterials()
  }, [initializeMaterials])

  useEffect(() => {
    window.scrollTo({ left: 0, top: 0, behavior: 'auto' })
  }, [location.pathname])

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      setMobileMenuOpen(false)
      setMobileMoreOpen(false)
      setSupportOpen(false)
      setAccountOpen(false)
    }

    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [])

  useEffect(() => {
    if (!mobileMenuOpen) return
    const trigger = mobileMenuTriggerRef.current
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const focusFrame = window.requestAnimationFrame(() => mobileMenuCloseRef.current?.focus())

    return () => {
      window.cancelAnimationFrame(focusFrame)
      document.body.style.overflow = previousOverflow
      trigger?.focus()
    }
  }, [mobileMenuOpen])

  useEffect(() => {
    if (!mobileMoreOpen) return
    const trigger = mobileMoreTriggerRef.current
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const focusFrame = window.requestAnimationFrame(() => mobileMoreCloseRef.current?.focus())

    return () => {
      window.cancelAnimationFrame(focusFrame)
      document.body.style.overflow = previousOverflow
      trigger?.focus()
    }
  }, [mobileMoreOpen])

  useEffect(() => {
    const featureName = getFeatureNameFromPath(location.pathname)
    const context = { userId: authUser?.id, isDemoUser: isDemoMode }
    void trackAppEvent(
      'page_view',
      {
        page_path: location.pathname,
        exam_track: profile.examTrack ?? 'nclex-rn',
        feature_name: featureName,
        is_demo_user: isDemoMode,
      },
      context,
    )
    if (featureName) {
      void trackAppEvent(
        featureName === 'Weak Areas' ? 'weak_area_opened' : featureName === 'Study Plan' ? 'study_plan_opened' : 'feature_opened',
        {
          page_path: location.pathname,
          exam_track: profile.examTrack ?? 'nclex-rn',
          feature_name: featureName,
          is_demo_user: isDemoMode,
        },
        context,
      )
    }
  }, [authUser?.id, isDemoMode, location.pathname, profile.examTrack])

  const pageMeta = useMemo(() => {
    const match = pageMetaNavigation.find((item) => isNavigationItemActive(location.pathname, item))
    return match ?? mainNavigation[0]
  }, [location.pathname])

  const initials = useMemo(
    () =>
      profile.name
        .split(' ')
        .slice(0, 2)
        .map((item) => item[0]?.toUpperCase())
        .join(''),
    [profile.name],
  )
  const isLocalDraft =
    import.meta.env.DEV ||
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1'
  const syncBadgeLabel =
    syncStatus === 'syncing'
      ? 'Syncing'
      : syncStatus === 'error'
        ? 'Sync issue'
        : syncStatus === 'offline'
          ? 'Saved locally'
          : isDemoMode
            ? isLocalDraft
              ? 'Local draft'
              : 'Live / saved locally'
            : 'Synced'
  const syncBadgeTitle =
    syncError ??
    (isDemoMode
      ? isLocalDraft
        ? 'Local draft build using this browser only'
        : 'Live build using local browser storage'
      : 'Cloud sync is active')
  const getNavigationGroupExpanded = (title: string) =>
    expandedNavigationGroups[title] ?? title === activeNavigationGroupTitle
  const toggleNavigationGroup = (title: string) => {
    setExpandedNavigationGroups((current) => ({
      ...current,
      [title]: !(current[title] ?? title === activeNavigationGroupTitle),
    }))
  }
  const toggleDesktopHubCollapsed = () => {
    setDesktopHubCollapsed((current) => {
      const next = !current
      try {
        window.localStorage.setItem('nurse-command-desktop-hub-collapsed', String(next))
      } catch {
        // Ignore storage failures; the UI still toggles for this session.
      }
      return next
    })
  }

  if (location.pathname === '/') {
    return (
      <AuthGate>
        <div className="nurse-command-app min-h-screen bg-[#04101f] text-white">
          <div className="w-full">
            {migrationPromptVisible ? (
              <div className="mb-5 rounded-[20px] border border-[#cfe1f7] bg-[linear-gradient(135deg,#ffffff_0%,#eef5ff_100%)] p-4 shadow-sm">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--nclex-blue)]">
                      Cloud migration ready
                    </p>
                    <h2 className="mt-1 nc-section-title text-2xl text-[var(--nclex-text)]">
                      Move this device's study progress into your account.
                    </h2>
                    <p className="mt-1 text-sm text-[var(--nclex-text-muted)]">
                      We found local attempts, notes, flashcards, or materials that can be synced now.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => void migrateLocalDataToCloud()}
                      className="nclex-btn-primary rounded-xl px-4 py-2.5 text-sm font-semibold"
                    >
                      Import local progress
                    </button>
                    <button
                      type="button"
                      onClick={dismissMigrationPrompt}
                      className="nclex-btn-secondary rounded-xl px-4 py-2.5 text-sm font-semibold"
                    >
                      Start fresh
                    </button>
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          <StudyMenuPage />
          <SupportSheet open={supportOpen} onClose={() => setSupportOpen(false)} />
        </div>
      </AuthGate>
    )
  }

  return (
    <AuthGate>
    <div className="nurse-command-app nclex-shell-bg min-h-screen text-[var(--nclex-text)]">
      <div className="flex min-h-screen w-full">
        <aside
          data-testid="desktop-sidebar"
          className={clsx(
            'nclex-sidebar hidden shrink-0 py-5 text-white transition-[width,padding] duration-200 lg:flex lg:flex-col',
            desktopHubCollapsed ? 'w-[80px] px-3' : 'w-[264px] px-4',
          )}
        >
          <div
            className={clsx(
              'flex',
              desktopHubCollapsed ? 'flex-col items-center gap-2' : 'items-start gap-3',
            )}
          >
            <button
              type="button"
              onClick={toggleDesktopHubCollapsed}
              className="relative z-10 inline-flex h-11 w-11 shrink-0 items-center justify-center overflow-visible rounded-xl border border-cyan-300/24 bg-white/[0.055] p-0 text-sky-100/72 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] transition hover:border-sky-200/60 hover:text-sky-100 focus:outline-none focus:ring-2 focus:ring-cyan-200/60"
              data-testid="desktop-sidebar-toggle"
              aria-label={desktopHubCollapsed ? 'Expand command hub' : 'Collapse command hub'}
              aria-expanded={!desktopHubCollapsed}
              aria-controls="desktop-command-hub-navigation"
              title={desktopHubCollapsed ? 'Expand command hub' : 'Collapse command hub'}
            >
              {desktopHubCollapsed ? (
                <ChevronsRight className="h-5 w-5 overflow-visible" />
              ) : (
                <ChevronsLeft className="h-5 w-5 overflow-visible" />
              )}
            </button>
            {desktopHubCollapsed ? (
              <div
                className="relative grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-cyan-300/30 bg-[#092845] shadow-[0_0_22px_rgba(43,148,255,0.22)]"
                title="Nurse Command"
              >
                <img src={nursingCommandLogo} alt="" className="h-9 w-9 object-contain" />
              </div>
            ) : (
              <BrandLockup desktopRail testId="desktop-sidebar-brand" />
            )}
          </div>
          <nav
            id="desktop-command-hub-navigation"
            className={clsx(
              'mt-5 flex-1 overflow-y-auto',
              desktopHubCollapsed ? 'space-y-2' : 'space-y-2.5 pr-1',
            )}
            aria-label="Command hub"
          >
            {desktopHubCollapsed
              ? sidebarNavigationGroups.flatMap((group) =>
                  group.items.map(({ label, icon: Icon, to, activePaths }) => (
                    <SidebarLink
                      key={`${group.title}-${to}`}
                      label={label}
                      icon={<Icon className="h-4 w-4" />}
                      to={to}
                      activePaths={activePaths}
                      tone={group.tone}
                      compact
                    />
                  )),
                )
              : sidebarNavigationGroups.map((group) => (
                  <SidebarNavigationGroup
                    key={group.title}
                    group={group}
                    collapsible
                    expanded={getNavigationGroupExpanded(group.title)}
                    idPrefix="desktop-hub"
                    onToggle={() => toggleNavigationGroup(group.title)}
                  />
                ))}
          </nav>
          <div className={clsx('space-y-1.5 border-t border-white/10 pt-5', desktopHubCollapsed && 'flex flex-col items-center')}>
            {secondaryNavigation.map(({ label, icon: Icon, to }) => (
              <SidebarLink
                key={to}
                label={label}
                icon={<Icon className="h-4 w-4" />}
                to={to}
                tone="slate"
                compact={desktopHubCollapsed}
              />
            ))}
            <button
              type="button"
              onClick={() => setSupportOpen(true)}
              className={clsx(
                'flex items-center rounded-xl text-sm font-medium text-slate-200 transition hover:bg-white/8 hover:text-white focus:outline-none focus:ring-2 focus:ring-cyan-200/55',
                desktopHubCollapsed ? 'h-11 w-11 justify-center' : 'w-full gap-3 px-3 py-2.5',
              )}
              aria-label="Help and support"
              title="Help and support"
            >
              <CircleHelp className="h-4 w-4" />
              <span className={desktopHubCollapsed ? 'sr-only' : undefined}>Help & Support</span>
            </button>
          </div>
        </aside>

        <div className="flex min-h-screen min-w-0 flex-1 flex-col">
          <header className="nclex-topbar safe-top sticky top-0 z-20 px-4 py-4 md:px-6 lg:px-8">
            <div className="flex w-full items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <button
                  type="button"
                  onClick={() => navigate(-1)}
                  className="hidden h-11 w-11 items-center justify-center rounded-xl border border-sky-300/24 bg-white/5 text-sky-100/72 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] transition hover:border-sky-200/60 hover:text-sky-200 md:inline-flex"
                  aria-label="Go back"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  ref={mobileMenuTriggerRef}
                  type="button"
                  onClick={() => setMobileMenuOpen(true)}
                  className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-sky-300/24 bg-white/5 text-sky-100/72 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] lg:hidden"
                  aria-label="Open navigation"
                >
                  <Menu className="h-4 w-4" />
                </button>
                <div className="min-w-0">
                    <p className="nc-eyebrow text-sky-200/60">
                      Nurse Command
                    </p>
                  <h1 className="nc-section-title truncate text-lg text-white md:text-xl">
                    {pageMeta.label}
                  </h1>
                </div>
              </div>

              <div className="flex items-center gap-2 md:gap-3">
                <button
                  type="button"
                  onClick={() => void syncNow()}
                  className={clsx(
                    'nc-chip-label hidden items-center gap-2 rounded-xl border px-3 py-2 uppercase shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] transition md:inline-flex',
                    syncStatus === 'error'
                      ? 'border-rose-300/35 bg-rose-400/12 text-rose-300'
                      : syncStatus === 'offline'
                        ? 'border-amber-300/35 bg-amber-400/12 text-amber-300'
                        : isDemoMode
                          ? 'border-sky-300/24 bg-white/5 text-sky-100/64'
                          : 'border-emerald-300/35 bg-emerald-300/12 text-emerald-300',
                  )}
                  title={syncBadgeTitle}
                >
                  <Cloud className="h-4 w-4" />
                  {syncBadgeLabel}
                </button>
                <button
                  type="button"
                  onClick={() => setSupportOpen(true)}
                  className="hidden rounded-xl border border-sky-300/24 bg-white/5 px-3 py-2 text-sm font-semibold text-sky-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] transition hover:border-sky-200/60 md:inline-flex"
                >
                  Help
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/social')}
                  className="relative inline-flex h-11 w-11 items-center justify-center rounded-xl border border-sky-300/24 bg-white/5 text-sky-100/72 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] transition hover:text-sky-200"
                  aria-label="Open notifications"
                >
                  <Bell className="h-4 w-4" />
                  <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-rose-400 ring-2 ring-[#04101f]" />
                </button>
                <button
                  type="button"
                  onClick={() => setAccountOpen((current) => !current)}
                  aria-label="Open account menu"
                  aria-expanded={accountOpen}
                  aria-haspopup="menu"
                  className="flex items-center gap-2 rounded-xl border border-sky-300/24 bg-white/5 px-2 py-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] transition hover:border-sky-200/60"
                >
                  <div className="relative flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border border-cyan-300/30 bg-[linear-gradient(135deg,rgba(34,211,238,0.34),rgba(168,85,247,0.2)_46%,rgba(3,20,38,0.96))] text-sm font-bold text-white shadow-[0_0_20px_rgba(43,148,255,0.28)]">
                    {profile.profileImageDataUrl ? (
                      <img src={profile.profileImageDataUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <>
                        <UsersRound className="absolute h-5 w-5 text-cyan-100/18" />
                        <span className="relative z-10">{initials}</span>
                      </>
                    )}
                  </div>
                  <div className="hidden text-left md:block">
                    <p className="text-sm font-semibold text-white">{profile.name}</p>
                    <p className="text-xs text-sky-200/62">{activeExamTrack.shortName} learner</p>
                  </div>
                  <ChevronDown className="hidden h-4 w-4 text-sky-200/60 md:block" />
                </button>
              </div>
            </div>
            <span role="status" aria-live="polite" className="sr-only">
              Sync status: {syncBadgeLabel}
            </span>
            {accountOpen ? (
              <div
                role="menu"
                aria-label="Account menu"
                className="absolute right-4 top-[4.5rem] z-30 w-[290px] rounded-[20px] border border-sky-300/24 bg-[#071d34]/95 p-4 shadow-[0_24px_60px_rgba(0,0,0,0.34)] backdrop-blur md:right-8"
              >
                <p className="nc-eyebrow text-sky-200/62">
                  Account
                </p>
                <p className="mt-2 font-semibold text-white">{authUser?.email ?? profile.name}</p>
                <p className="mt-1 text-sm text-sky-100/64">
                  {isDemoMode ? 'Local demo mode. Sign in to sync across devices.' : `${activeExamTrack.shortName} cloud sync active.`}
                </p>
                <div className="mt-4 grid gap-2">
                  <button
                    type="button"
                    onClick={() => void syncNow()}
                    role="menuitem"
                    className="nclex-btn-secondary inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Sync now
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setAccountOpen(false)
                      navigate('/settings')
                    }}
                    className="nclex-btn-secondary inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold"
                  >
                    <Settings className="h-4 w-4" />
                    Account settings
                  </button>
                  {authUser ? (
                    <button
                      type="button"
                      onClick={() => void signOut()}
                      role="menuitem"
                      className="rounded-xl border border-[#ffd1d1] bg-[var(--nclex-danger-soft)] px-3 py-2 text-sm font-semibold text-[var(--nclex-danger)]"
                    >
                      Sign out
                    </button>
                  ) : null}
                </div>
              </div>
            ) : null}
          </header>

          <main className="page-mobile-pad flex-1 px-4 py-5 md:px-6 lg:px-8 lg:py-8">
            <div className="mx-auto w-full max-w-[1600px]">
              {migrationPromptVisible ? (
                <div className="mb-5 rounded-[20px] border border-sky-300/24 bg-[#071d34]/78 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_16px_34px_rgba(0,0,0,0.18)] backdrop-blur">
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="nc-eyebrow text-sky-300">
                        Cloud migration ready
                      </p>
                      <h2 className="nc-section-title mt-1 text-2xl text-white">
                        Move this device's study progress into your account.
                      </h2>
                      <p className="mt-1 text-sm text-sky-100/64">
                        We found local attempts, notes, flashcards, or materials that can be synced now.
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => void migrateLocalDataToCloud()}
                        className="nclex-btn-primary rounded-xl px-4 py-2.5 text-sm font-semibold"
                      >
                        Import local progress
                      </button>
                      <button
                        type="button"
                        onClick={dismissMigrationPrompt}
                        className="nclex-btn-secondary rounded-xl px-4 py-2.5 text-sm font-semibold"
                      >
                        Start fresh
                      </button>
                    </div>
                  </div>
                </div>
              ) : null}
              <AnimatePresence mode="wait">
                <motion.div
                  key={location.pathname}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.22, ease: 'easeOut' }}
                >
                  <Routes location={location}>
                    <Route path="/" element={<LazyRoute label="Loading command hub"><StudyMenuPage /></LazyRoute>} />
                    <Route path="/dashboard" element={<LazyRoute label="Loading dashboard"><DashboardPage /></LazyRoute>} />
                    <Route path="/exam-prep" element={<LazyRoute label="Loading exam prep"><ExamPrepPage /></LazyRoute>} />
                    <Route path="/practice-questions" element={<LazyRoute label="Loading question bank"><PracticeQuestionsPage /></LazyRoute>} />
                    <Route path="/test-mode" element={<LazyRoute label="Loading exam simulation"><TestModePage /></LazyRoute>} />
                    <Route path="/nurse-command-lab" element={<LazyRoute label="Loading nurse lab"><NurseCommandLabPage /></LazyRoute>} />
                    <Route path="/clinical-simulator" element={<LazyRoute label="Loading clinical simulator"><ClinicalSimulatorPage /></LazyRoute>} />
                    <Route path="/quick-study" element={<LazyRoute label="Loading quick study"><QuickStudyPage /></LazyRoute>} />
                    <Route path="/weak-areas" element={<LazyRoute label="Loading remediation"><WeakAreasPage /></LazyRoute>} />
                    <Route path="/performance-analytics" element={<LazyRoute label="Loading performance signals"><PerformanceAnalyticsPage /></LazyRoute>} />
                    <Route path="/flashcards" element={<LazyRoute label="Loading flashcards"><FlashcardsPage /></LazyRoute>} />
                    <Route path="/study-plan" element={<LazyRoute label="Loading study plan"><StudyPlanPage /></LazyRoute>} />
                    <Route path="/strategy-training" element={<LazyRoute label="Loading resources"><StrategyTrainingPage /></LazyRoute>} />
                    <Route path="/notes" element={<LazyRoute label="Loading notes"><NotesPage /></LazyRoute>} />
                    <Route path="/my-materials" element={<LazyRoute label="Loading study library"><MyMaterialsPage /></LazyRoute>} />
                    <Route path="/social" element={<LazyRoute label="Loading social"><SocialPage /></LazyRoute>} />
                    <Route path="/settings" element={<LazyRoute label="Loading settings"><SettingsPage /></LazyRoute>} />
                  </Routes>
                </motion.div>
              </AnimatePresence>
            </div>
          </main>
        </div>
      </div>

      <MobileTabBar
        pathname={location.pathname}
        onOpenMore={() => setMobileMoreOpen(true)}
        onOpenQuickStudy={() => navigate('/quick-study')}
        moreButtonRef={mobileMoreTriggerRef}
      />

      <AnimatePresence>
        {mobileMenuOpen ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-slate-950/40 lg:hidden"
              role="dialog"
              aria-modal="true"
              aria-labelledby="mobile-navigation-title"
              onClick={() => setMobileMenuOpen(false)}
            >
            <motion.div
              initial={{ x: -32, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -32, opacity: 0 }}
              className="nclex-sidebar safe-top flex h-full w-[88vw] max-w-[320px] flex-col overflow-hidden px-5 py-5 text-white"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-3">
                <div id="mobile-navigation-title">
                  <BrandLockup compact />
                </div>
                <button
                  ref={mobileMenuCloseRef}
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/6 focus:outline-none focus:ring-2 focus:ring-cyan-200/60"
                  aria-label="Close navigation"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <nav className="mt-6 flex-1 space-y-2.5 overflow-y-auto pr-1" aria-label="Command hub">
                {sidebarNavigationGroups.map((group) => (
                  <SidebarNavigationGroup
                    key={group.title}
                    group={group}
                    collapsible
                    expanded={getNavigationGroupExpanded(group.title)}
                    idPrefix="mobile-hub"
                    onToggle={() => toggleNavigationGroup(group.title)}
                    onNavigate={() => setMobileMenuOpen(false)}
                  />
                ))}
              </nav>
              <div className="space-y-1.5 border-t border-white/10 pt-5">
                <SidebarLink
                  label="Settings"
                  icon={<Settings className="h-4 w-4" />}
                  to="/settings"
                  tone="slate"
                  onClick={() => setMobileMenuOpen(false)}
                />
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false)
                    setSupportOpen(true)
                  }}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-200 transition hover:bg-white/8 hover:text-white"
                >
                  <CircleHelp className="h-4 w-4" />
                  Help & Support
                </button>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {mobileMoreOpen ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-slate-950/35 lg:hidden"
            role="dialog"
            aria-modal="true"
            aria-labelledby="mobile-more-title"
            onClick={() => setMobileMoreOpen(false)}
          >
            <motion.div
              initial={{ y: 24, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 24, opacity: 0 }}
              className="safe-bottom fixed inset-x-0 bottom-0 flex max-h-[calc(100vh-1rem)] flex-col rounded-t-2xl border border-sky-300/20 bg-[#04101f]/98 px-4 pb-6 pt-4 shadow-[0_-12px_32px_rgba(0,0,0,0.3)] [--safe-bottom-offset:1.5rem]"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="mx-auto mb-4 h-1.5 w-14 rounded-full bg-sky-300/24" />
              <div className="flex items-center justify-between">
                <div>
                  <p className="nc-eyebrow text-sky-200/62">
                    More
                  </p>
                  <h2 id="mobile-more-title" className="nc-section-title text-xl text-white">Command hub</h2>
                </div>
                <button
                  ref={mobileMoreCloseRef}
                  type="button"
                  onClick={() => setMobileMoreOpen(false)}
                  className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-sky-300/24 bg-white/5 text-sky-100/72 focus:outline-none focus:ring-2 focus:ring-cyan-200/60"
                  aria-label="Close more navigation"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="mt-5 min-h-0 space-y-4 overflow-y-auto pr-1">
                {mobileMoreNavigationGroups.map((group) => (
                  <div key={group.title}>
                    <p className={clsx('nc-eyebrow flex items-center gap-2 px-1 pb-2 text-[10px]', navigationToneClasses[group.tone].group)}>
                      <span className={clsx('h-1.5 w-1.5 rounded-full', navigationToneClasses[group.tone].dot)} />
                      <span>{group.title}</span>
                    </p>
                    <div className="grid gap-2">
                      {group.items.map((item) => {
                        const { label, icon: Icon, to } = item
                        const active = isNavigationItemActive(location.pathname, item)
                        return (
                          <button
                            key={to}
                            type="button"
                            onClick={() => {
                              navigate(to)
                              setMobileMoreOpen(false)
                            }}
                            className={clsx(
                              'flex min-h-12 items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left focus:outline-none focus:ring-2 focus:ring-cyan-200/55',
                              active
                                ? 'border-sky-200/60 bg-sky-400/12 text-white shadow-[0_0_24px_rgba(56,189,248,0.16)]'
                                : 'border-sky-300/20 bg-white/[0.04] text-sky-100/76',
                            )}
                          >
                            <span className="flex min-w-0 items-center gap-3 text-sm font-semibold">
                              <Icon className="h-4 w-4 shrink-0" />
                              <span className="min-w-0 break-words leading-tight">{label}</span>
                            </span>
                            {active ? (
                              <span className="nclex-chip nclex-chip-info">Open</span>
                            ) : null}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    setMobileMoreOpen(false)
                    setSupportOpen(true)
                  }}
                  className="flex min-h-12 items-center justify-between gap-3 rounded-xl border border-sky-300/20 bg-white/[0.04] px-4 py-3 text-left text-sky-100/76 focus:outline-none focus:ring-2 focus:ring-cyan-200/55"
                >
                  <span className="flex min-w-0 items-center gap-3 text-sm font-semibold">
                    <CircleHelp className="h-4 w-4 shrink-0" />
                    <span className="min-w-0 break-words leading-tight">Help & Support</span>
                  </span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <SupportSheet open={supportOpen} onClose={() => setSupportOpen(false)} />
    </div>
    </AuthGate>
  )
}

function getFeatureNameFromPath(pathname: string) {
  if (pathname === '/') return 'Study Menu'
  if (pathname.startsWith('/dashboard')) return 'Dashboard'
  if (pathname.startsWith('/study-plan')) return 'Study Plan'
  if (pathname.startsWith('/practice-questions')) return 'Question Bank'
  if (pathname.startsWith('/quick-study')) return 'Quick Study'
  if (pathname.startsWith('/weak-areas')) return 'Weak Areas'
  if (pathname.startsWith('/performance-analytics')) return 'Performance Analytics'
  if (pathname.startsWith('/flashcards')) return 'Flashcards'
  if (pathname.startsWith('/notes')) return 'Notes'
  if (pathname.startsWith('/my-materials')) return 'Study Library'
  if (pathname.startsWith('/exam-prep')) return 'Exam Prep'
  if (pathname.startsWith('/test-mode')) return 'Test Mode'
  if (pathname.startsWith('/clinical-simulator')) return 'Clinical Simulator'
  if (pathname.startsWith('/social')) return 'Social'
  if (pathname.startsWith('/settings')) return 'Settings'
  return undefined
}

function AdminAccessGate({ children }: { children: ReactNode }) {
  const authInitialized = useStudySystemStore((state) => state.authInitialized)
  const authConfigured = useStudySystemStore((state) => state.authConfigured)
  const authUser = useStudySystemStore((state) => state.authUser)
  const initializeAuth = useStudySystemStore((state) => state.initializeAuth)
  const localPreview = isLocalAdminPreview()
  const passkeyEnabled = isAdminPreviewPasskeyEnabled()
  const enabled = isAdminPanelEnabled()
  const [passkeyAllowed, setPasskeyAllowed] = useState(() => hasStoredAdminPreviewPasskeyAccess())
  const [allowed, setAllowed] = useState(localPreview || passkeyAllowed)
  const [checking, setChecking] = useState(!localPreview && !passkeyAllowed)

  useEffect(() => {
    if (localPreview || passkeyAllowed || !enabled) return
    void initializeAuth()
  }, [enabled, initializeAuth, localPreview, passkeyAllowed])

  useEffect(() => {
    if (localPreview || passkeyAllowed) return
    if (!enabled) return
    if (!authInitialized) return

    let cancelled = false
    void Promise.resolve().then(async () => {
      if (cancelled) return
      setChecking(true)
      const nextAllowed = await checkAdminAccess(authUser)
      if (cancelled) return
      setAllowed(nextAllowed)
      setChecking(false)
    })

    return () => {
      cancelled = true
    }
  }, [authInitialized, authUser, enabled, localPreview, passkeyAllowed])

  if (!enabled) {
    return (
      <AdminAccessState
        title="Admin panel disabled"
        detail="Set VITE_ENABLE_ADMIN_PANEL=true only for environments where admin access should exist."
      />
    )
  }

  if (localPreview || passkeyAllowed || allowed) return children

  if (passkeyEnabled) {
    return (
      <AdminPasskeyState
        onVerified={() => {
          setPasskeyAllowed(true)
          setAllowed(true)
          setChecking(false)
        }}
      />
    )
  }

  if (!authConfigured) {
    return (
      <AdminAccessState
        title="Admin auth unavailable"
        detail="Supabase must be configured before the public admin panel can verify admin accounts."
      />
    )
  }

  if (!authUser) {
    return (
      <AuthGate>
        <AdminAccessState
          title="Checking admin access"
          detail="Sign-in completed. Verifying admin role before loading the cockpit."
        />
      </AuthGate>
    )
  }

  if (checking || !authInitialized) {
    return <RouteLoadingScreen label="Verifying admin access" />
  }

  if (!allowed) {
    return (
      <AdminAccessState
        title="Admin access required"
        detail="This account is signed in but is not listed as a Nurse Command admin."
      />
    )
  }

  return children
}

function AdminPasskeyState({ onVerified }: { onVerified: () => void }) {
  const [value, setValue] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const submitPasskey = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSubmitting(true)
    setError('')
    const verified = await verifyAdminPreviewPasskey(value)
    setSubmitting(false)
    if (!verified) {
      setError('Pass key did not match.')
      return
    }
    onVerified()
  }

  return (
    <div className="grid min-h-screen place-items-center bg-[#020812] px-6 text-white">
      <form
        onSubmit={submitPasskey}
        className="w-full max-w-[460px] rounded-[28px] border border-cyan-200/18 bg-[#071d34]/88 p-7 shadow-[0_24px_80px_rgba(0,0,0,0.38)]"
      >
        <div className="grid h-14 w-14 place-items-center rounded-2xl border border-cyan-200/24 bg-cyan-300/10 text-cyan-100">
          <LockKeyhole className="h-6 w-6" />
        </div>
        <p className="nc-eyebrow mt-5 text-cyan-200/74">Admin preview access</p>
        <h1 className="nc-section-title mt-2 text-2xl">Enter command pass key</h1>
        <p className="mt-3 text-sm leading-6 text-sky-100/64">
          This unlocks the live cockpit preview. Remote user analytics still require Supabase admin access.
        </p>
        <label
          className="nc-eyebrow mt-6 block text-sky-100/56"
          htmlFor="admin-passkey"
        >
          Pass key
        </label>
        <input
          id="admin-passkey"
          type="password"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          autoComplete="off"
          className="mt-2 h-12 w-full rounded-2xl border border-cyan-200/24 bg-[#020b17] px-4 text-base font-bold text-white outline-none transition focus:border-cyan-200/70 focus:ring-2 focus:ring-cyan-300/20"
        />
        {error ? <p className="mt-3 text-sm font-bold text-rose-200">{error}</p> : null}
        <button
          type="submit"
          disabled={submitting || !value.trim()}
          className="nc-primary-label mt-5 inline-flex h-12 w-full items-center justify-center rounded-2xl border border-cyan-200/24 bg-cyan-300/14 px-4 text-sm uppercase text-cyan-50 transition hover:bg-cyan-300/20 disabled:cursor-not-allowed disabled:opacity-45"
        >
          {submitting ? 'Checking' : 'Unlock admin'}
        </button>
      </form>
    </div>
  )
}

function AdminAccessState({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="grid min-h-screen place-items-center bg-[#020812] px-6 text-center text-white">
      <div className="w-full max-w-[440px] rounded-[28px] border border-cyan-200/18 bg-[#071d34]/84 p-7 shadow-[0_24px_80px_rgba(0,0,0,0.38)]">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl border border-cyan-200/24 bg-cyan-300/10 text-cyan-100">
          <LockKeyhole className="h-6 w-6" />
        </div>
        <h1 className="nc-section-title mt-5 text-2xl">{title}</h1>
        <p className="mt-3 text-sm leading-6 text-sky-100/64">{detail}</p>
      </div>
    </div>
  )
}

type NavigationTone = 'amber' | 'cyan' | 'emerald' | 'rose' | 'slate' | 'violet'

const navigationToneClasses: Record<
  NavigationTone,
  { active: string; dot: string; group: string; icon: string }
> = {
  amber: {
    active: 'border-amber-200/42 bg-amber-300/12 text-white shadow-[inset_3px_0_0_rgba(251,191,36,0.95)]',
    dot: 'bg-amber-300',
    group: 'text-amber-100/72',
    icon: 'text-amber-100',
  },
  cyan: {
    active: 'border-cyan-200/42 bg-cyan-300/12 text-white shadow-[inset_3px_0_0_rgba(34,211,238,0.95)]',
    dot: 'bg-cyan-300',
    group: 'text-cyan-100/72',
    icon: 'text-cyan-100',
  },
  emerald: {
    active: 'border-emerald-200/42 bg-emerald-300/12 text-white shadow-[inset_3px_0_0_rgba(52,211,153,0.95)]',
    dot: 'bg-emerald-300',
    group: 'text-emerald-100/72',
    icon: 'text-emerald-100',
  },
  rose: {
    active: 'border-rose-200/42 bg-rose-300/12 text-white shadow-[inset_3px_0_0_rgba(251,113,133,0.9)]',
    dot: 'bg-rose-300',
    group: 'text-rose-100/72',
    icon: 'text-rose-100',
  },
  slate: {
    active: 'border-sky-200/34 bg-white/[0.07] text-white shadow-[inset_3px_0_0_rgba(186,230,253,0.7)]',
    dot: 'bg-sky-200',
    group: 'text-sky-100/52',
    icon: 'text-sky-100',
  },
  violet: {
    active: 'border-fuchsia-200/38 bg-fuchsia-300/12 text-white shadow-[inset_3px_0_0_rgba(217,70,239,0.88)]',
    dot: 'bg-fuchsia-300',
    group: 'text-fuchsia-100/72',
    icon: 'text-fuchsia-100',
  },
}

function SidebarNavigationGroup({
  group,
  collapsible = false,
  expanded = true,
  idPrefix = 'hub',
  onToggle,
  onNavigate,
}: {
  group: NavigationGroup
  collapsible?: boolean
  expanded?: boolean
  idPrefix?: string
  onToggle?: () => void
  onNavigate?: () => void
}) {
  const location = useLocation()
  const tone = navigationToneClasses[group.tone]
  const active = isNavigationGroupActive(location.pathname, group)
  const panelId = `${idPrefix}-${group.title.toLowerCase()}`

  return (
    <div className={clsx(collapsible && 'rounded-2xl border border-white/[0.045] bg-white/[0.018] p-1')}>
      {collapsible ? (
        <button
          type="button"
          aria-controls={panelId}
          aria-expanded={expanded}
          onClick={onToggle}
          className={clsx(
            'flex w-full items-center justify-between gap-3 rounded-xl px-2.5 py-2 text-left transition focus:outline-none focus:ring-2 focus:ring-cyan-200/55',
            active ? 'bg-white/[0.055]' : 'hover:bg-white/[0.04]',
          )}
        >
          <span className="flex min-w-0 items-center gap-2">
            <span className={clsx('h-1.5 w-1.5 rounded-full', tone.dot)} />
            <span className={clsx('nc-eyebrow truncate text-[10px]', tone.group)}>
              {group.title}
            </span>
          </span>
          <ChevronDown
            className={clsx(
              'h-4 w-4 shrink-0 text-sky-100/48 transition',
              expanded && 'rotate-180 text-sky-100/72',
            )}
          />
        </button>
      ) : (
        <div className="mb-2 flex items-center gap-2 px-3">
          <span className={clsx('h-1.5 w-1.5 rounded-full', tone.dot)} />
          <p className={clsx('nc-eyebrow text-[10px]', tone.group)}>
            {group.title}
          </p>
        </div>
      )}
      <div id={panelId} className={clsx('space-y-1', collapsible && 'mt-1', collapsible && !expanded && 'hidden')}>
        {group.items.map(({ label, icon: Icon, to, activePaths }) => (
          <SidebarLink
            key={to}
            label={label}
            icon={<Icon className="h-4 w-4" />}
            to={to}
            activePaths={activePaths}
            tone={group.tone}
            onClick={onNavigate}
          />
        ))}
      </div>
    </div>
  )
}

function SidebarLink({
  label,
  icon,
  to,
  activePaths,
  tone = 'cyan',
  onClick,
  compact = false,
}: {
  label: string
  icon: React.ReactNode
  to: string
  activePaths?: string[]
  tone?: NavigationTone
  onClick?: () => void
  compact?: boolean
}) {
  const location = useLocation()
  const activeByPath = activePaths?.some((path) => location.pathname.startsWith(path)) ?? false
  const toneClass = navigationToneClasses[tone]

  return (
    <NavLink
      to={to}
      end={to === '/'}
      onClick={onClick}
      aria-label={compact ? label : undefined}
      title={compact ? label : undefined}
      className={({ isActive }) =>
        clsx(
          'group flex items-center rounded-xl border border-transparent text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-cyan-200/55',
          compact ? 'h-11 w-11 justify-center' : 'gap-3 px-3 py-2.5',
          isActive || activeByPath
            ? toneClass.active
            : 'text-slate-200/88 hover:border-white/10 hover:bg-white/[0.055] hover:text-white',
        )
      }
    >
      <span className={clsx('transition group-hover:text-white', toneClass.icon)}>{icon}</span>
      <span className={compact ? 'sr-only' : 'truncate'}>{label}</span>
    </NavLink>
  )
}

function MobileTabBar({
  pathname,
  onOpenMore,
  onOpenQuickStudy,
  moreButtonRef,
}: {
  pathname: string
  onOpenMore: () => void
  onOpenQuickStudy: () => void
  moreButtonRef: RefObject<HTMLButtonElement | null>
}) {
  const navigate = useNavigate()
  const moreActive = !mobilePrimaryNavigation.some((item) => isNavigationItemActive(pathname, item))

  return (
    <div
      data-testid="mobile-tab-bar"
      className="mobile-bottom-bar safe-bottom fixed inset-x-0 bottom-0 z-30 border-t border-sky-300/20 bg-[#020812]/96 pt-2 lg:hidden"
    >
      <div className="mx-auto grid max-w-[520px] grid-cols-4 gap-1 px-2">
        {mobilePrimaryNavigation.map((item) => {
          const { label, icon: Icon, to, emphasis } = item
          const active = isNavigationItemActive(pathname, item)
          return (
            <button
              key={to}
              type="button"
              aria-current={active ? 'page' : undefined}
              onClick={() => {
                if (emphasis) {
                  onOpenQuickStudy()
                  return
                }
                navigate(to)
              }}
              className={clsx(
                'flex min-h-[58px] min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-1 py-2 text-center text-xs font-semibold leading-tight transition focus:outline-none focus:ring-2 focus:ring-cyan-200/55',
                emphasis
                  ? 'nclex-btn-primary -mt-5 px-3 py-3 text-white'
                  : active
                    ? 'bg-sky-400/12 text-sky-200 shadow-[inset_0_-2px_0_#1d9bff]'
                    : 'text-sky-100/56',
              )}
            >
              <Icon className={clsx('h-4 w-4', emphasis && 'h-5 w-5')} />
              <span className="block w-full min-w-0 break-words text-center leading-[1.06]">{label}</span>
            </button>
          )
        })}
        <button
          ref={moreButtonRef}
          type="button"
          onClick={onOpenMore}
          className={clsx(
            'flex min-h-[58px] min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-1 py-2 text-center text-xs font-semibold leading-tight focus:outline-none focus:ring-2 focus:ring-cyan-200/55',
            moreActive ? 'bg-sky-400/12 text-sky-200 shadow-[inset_0_-2px_0_#1d9bff]' : 'text-sky-100/56',
          )}
          aria-current={moreActive ? 'page' : undefined}
        >
          <Menu className="h-4 w-4" />
          <span className="block w-full min-w-0 break-words text-center leading-[1.06]">More</span>
        </button>
      </div>
    </div>
  )
}

function BrandLockup({
  compact = false,
  desktopRail = false,
  testId,
}: {
  compact?: boolean
  desktopRail?: boolean
  testId?: string
}) {
  return (
    <div
      data-testid={testId}
      className={clsx('rounded-[18px] border border-cyan-300/22 bg-[#071d34]/75 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_0_24px_rgba(43,148,255,0.14)]', compact || desktopRail ? 'p-3' : 'p-4')}
    >
      <div className={clsx('flex items-center', desktopRail ? 'gap-1' : 'gap-3')}>
        <div
          className={clsx(
            'relative grid shrink-0 place-items-center border border-cyan-300/35 bg-[#092845] shadow-[0_0_26px_rgba(43,148,255,0.26)]',
            desktopRail ? 'h-11 w-11 rounded-[14px]' : 'h-12 w-12 rounded-[16px]',
          )}
        >
          <img src={nursingCommandLogo} alt="Nurse Command logo" className="h-10 w-10 object-contain" />
        </div>
        <div className="min-w-0">
          <p className="nc-section-title text-lg uppercase text-white drop-shadow-[0_0_12px_rgba(144,204,255,0.36)]">
            Nurse Command
          </p>
        </div>
      </div>
    </div>
  )
}

function SupportSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const authUser = useStudySystemStore((state) => state.authUser)
  const isDemoMode = useStudySystemStore((state) => state.isDemoMode)
  const location = useLocation()
  const feedbackSource = getFeedbackSourceFromPath(location.pathname)
  const [feedbackType, setFeedbackType] = useState<BetaFeedbackSentiment>('confused')
  const [confusion, setConfusion] = useState('')
  const [expected, setExpected] = useState('')
  const [returnTrigger, setReturnTrigger] = useState('')
  const [lastFeedback, setLastFeedback] = useState<BetaFeedbackReport | null>(null)
  const canSubmitFeedback = confusion.trim().length >= 6 || expected.trim().length >= 6 || returnTrigger.trim().length >= 6

  const submitFeedback = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!canSubmitFeedback) return

    const report = recordBetaFeedback(
      {
        source: feedbackSource,
        sentiment: feedbackType,
        confusion,
        expected,
        returnTrigger,
      },
      { userId: authUser?.id, isDemoUser: isDemoMode },
    )

    setLastFeedback(report)
    setConfusion('')
    setExpected('')
    setReturnTrigger('')
  }

  useEffect(() => {
    if (!open) return
    void trackAppEvent(
      'feedback_opened',
      {
        page_path: location.pathname,
        feature_name: 'Help & Support',
        is_demo_user: isDemoMode,
        metadata: { source: feedbackSource },
      },
      { userId: authUser?.id, isDemoUser: isDemoMode },
    )
  }, [authUser?.id, feedbackSource, isDemoMode, location.pathname, open])

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-slate-950/35"
          role="dialog"
          aria-modal="true"
          aria-label="Help and support"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 18, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            className="absolute inset-x-4 top-10 mx-auto max-h-[calc(100vh-5rem)] max-w-[520px] overflow-y-auto rounded-[24px] border border-sky-300/24 bg-[#071d34]/95 p-6 shadow-[0_24px_60px_rgba(0,0,0,0.34)] backdrop-blur"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="nc-eyebrow text-sky-300">
                  Help & Support
                </p>
                <h3 className="nc-section-title mt-2 text-2xl text-white">
                  Need a quick reset?
                </h3>
                <p className="mt-2 text-sm leading-6 text-sky-100/64">
                  Start with Quick Study if you feel stuck, use Remediation for weak areas, and check Notes if you want to reinforce your own anchors.
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-sky-300/24 bg-white/5 text-sky-100/72 focus:outline-none focus:ring-2 focus:ring-cyan-200/60"
                aria-label="Close help and support"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-5 grid gap-3">
              {[
                'Quick Study gives you a 5-question session in your weakest area.',
                'Question Bank is best when you want focused reps with rationales.',
                'Exams help you build stamina with mixed-question simulation.',
              ].map((item) => (
                <div
                  key={item}
                  className="rounded-2xl border border-sky-300/20 bg-white/[0.04] px-4 py-3 text-sm text-sky-100/76"
                >
                  {item}
                </div>
              ))}
              <div className="grid gap-3 sm:grid-cols-2">
                <a
                  href="mailto:support@nursecommand.com?subject=Nurse%20Command%20beta%20feedback"
                  className="rounded-2xl border border-emerald-300/24 bg-emerald-300/10 px-4 py-3 text-sm font-semibold text-emerald-100 transition hover:border-emerald-200/48"
                >
                  Send beta feedback
                </a>
                <NavLink
                  to="/settings"
                  onClick={onClose}
                  className="rounded-2xl border border-cyan-300/24 bg-cyan-300/10 px-4 py-3 text-sm font-semibold text-cyan-100 transition hover:border-cyan-200/48"
                >
                  Privacy, terms, support
                </NavLink>
              </div>
              <form
                onSubmit={submitFeedback}
                className="rounded-2xl border border-cyan-300/20 bg-cyan-300/[0.055] p-4"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.14em] text-cyan-100/70">
                      Beta feedback
                    </p>
                    <p className="mt-1 text-sm font-semibold text-sky-100/70">
                      Tell us what made the page clear, confusing, or worth returning to.
                    </p>
                  </div>
                  <select
                    value={feedbackType}
                    onChange={(event) => setFeedbackType(event.target.value as BetaFeedbackSentiment)}
                    className="min-h-11 rounded-xl border border-cyan-200/20 bg-[#03101f]/70 px-3 text-sm font-bold text-white outline-none focus:border-cyan-100 focus:ring-2 focus:ring-cyan-300/18"
                  >
                    <option value="confused">Confusing</option>
                    <option value="blocked">Blocked</option>
                    <option value="liked">Useful</option>
                    <option value="idea">Idea</option>
                  </select>
                </div>
                <label className="mt-4 block">
                  <span className="text-xs font-bold uppercase tracking-[0.12em] text-sky-100/58">
                    What stood out?
                  </span>
                  <textarea
                    value={confusion}
                    onChange={(event) => setConfusion(event.target.value)}
                    className="mt-2 min-h-20 w-full resize-y rounded-xl border border-sky-300/20 bg-[#03101f]/72 p-3 text-sm leading-6 text-white outline-none placeholder:text-sky-100/34 focus:border-cyan-100 focus:ring-2 focus:ring-cyan-300/18"
                    placeholder="Example: I was not sure what to click next."
                  />
                </label>
                <label className="mt-3 block">
                  <span className="text-xs font-bold uppercase tracking-[0.12em] text-sky-100/58">
                    What did you expect?
                  </span>
                  <textarea
                    value={expected}
                    onChange={(event) => setExpected(event.target.value)}
                    className="mt-2 min-h-16 w-full resize-y rounded-xl border border-sky-300/20 bg-[#03101f]/72 p-3 text-sm leading-6 text-white outline-none placeholder:text-sky-100/34 focus:border-cyan-100 focus:ring-2 focus:ring-cyan-300/18"
                    placeholder="Example: I expected this to start a short quiz."
                  />
                </label>
                <label className="mt-3 block">
                  <span className="text-xs font-bold uppercase tracking-[0.12em] text-sky-100/58">
                    What would make you come back?
                  </span>
                  <input
                    value={returnTrigger}
                    onChange={(event) => setReturnTrigger(event.target.value)}
                    className="mt-2 min-h-11 w-full rounded-xl border border-sky-300/20 bg-[#03101f]/72 px-3 text-sm text-white outline-none placeholder:text-sky-100/34 focus:border-cyan-100 focus:ring-2 focus:ring-cyan-300/18"
                    placeholder="Example: A clear weekly plan or better notes import."
                  />
                </label>
                <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <button
                    type="submit"
                    disabled={!canSubmitFeedback}
                    className="inline-flex min-h-11 items-center justify-center rounded-xl border border-cyan-100/36 bg-cyan-500/80 px-4 py-2 text-sm font-black text-white transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Save beta feedback
                  </button>
                  {lastFeedback ? (
                    <a
                      href={createBetaFeedbackMailto(lastFeedback)}
                      className="inline-flex min-h-11 items-center justify-center rounded-xl border border-emerald-300/24 bg-emerald-300/10 px-4 py-2 text-sm font-black text-emerald-100 transition hover:border-emerald-200/48"
                    >
                      Send details by email
                    </a>
                  ) : null}
                </div>
                {lastFeedback ? (
                  <p role="status" className="mt-3 rounded-xl border border-emerald-300/20 bg-emerald-300/10 px-3 py-2 text-sm font-semibold text-emerald-100">
                    Feedback saved on this device and logged as a privacy-safe beta signal.
                  </p>
                ) : null}
              </form>
              <div className="rounded-2xl border border-amber-200/24 bg-amber-300/10 px-4 py-3 text-xs font-semibold leading-5 text-amber-50/82">
                Readiness and adaptive labels are practice evidence only. Nurse Command is study support, not clinical advice or a licensure prediction.
              </div>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}

function getFeedbackSourceFromPath(pathname: string): BetaFeedbackSource {
  if (pathname === '/dashboard' || pathname === '/') return 'dashboard'
  if (pathname === '/my-materials' || pathname === '/flashcards' || pathname === '/notes' || pathname === '/strategy-training') return 'materials'
  if (pathname === '/practice-questions' || pathname === '/quick-study' || pathname === '/test-mode' || pathname === '/exam-prep') return 'question-bank'
  if (pathname === '/settings') return 'help'
  return 'help'
}
