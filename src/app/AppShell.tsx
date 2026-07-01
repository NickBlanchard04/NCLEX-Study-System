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
import { lazy, Suspense, useEffect, useMemo, useState, type ComponentType, type FormEvent, type ReactNode } from 'react'
import { NavLink, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { clsx } from 'clsx'
import { SocialPage } from '../features/SocialPage'
import nursingCommandLogo from '../assets/brand/nursing-command-logo.png'
import {
  DashboardPage,
  ClinicalSimulatorPage,
  ExamPrepPage,
  FlashcardsPage,
  MyMaterialsPage,
  NurseCommandLabPage,
  NotesPage,
  PerformanceAnalyticsPage,
  PracticeQuestionsPage,
  QuickStudyPage,
  SettingsPage,
  StrategyTrainingPage,
  StudyMenuPage,
  StudyPlanPage,
  TestModePage,
  WeakAreasPage,
} from '../features/pages'
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

type NavigationItem = {
  label: string
  icon: ComponentType<{ className?: string }>
  to: string
  emphasis?: boolean
  activePaths?: string[]
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

const sidebarNavigationGroups = [
  { title: 'Start', tone: 'cyan' as const, items: commandNavigation },
  { title: 'Practice', tone: 'emerald' as const, items: practiceNavigation },
  { title: 'Review', tone: 'amber' as const, items: reviewNavigation },
  { title: 'Library', tone: 'rose' as const, items: libraryNavigation },
  { title: 'Connect', tone: 'violet' as const, items: communityNavigation },
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

const mobilePrimaryRoutes = new Set(mobilePrimaryNavigation.map((item) => item.to))

const mobileMoreNavigationGroups = [
  ...sidebarNavigationGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => !mobilePrimaryRoutes.has(item.to)),
    }))
    .filter((group) => group.items.length),
  { title: 'Account', tone: 'slate' as const, items: secondaryNavigation },
]

const pageMetaNavigation = [...labNavigation, ...mainNavigation, ...studyToolsNavigation, ...secondaryNavigation]

const isNavigationItemActive = (pathname: string, item: NavigationItem) =>
  item.to === '/'
    ? pathname === '/'
    : pathname.startsWith(item.to) || item.activePaths?.some((path) => pathname.startsWith(path))

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
        <aside className="nclex-sidebar hidden w-[264px] shrink-0 px-4 py-5 text-white lg:flex lg:flex-col">
          <BrandLockup />
          <nav className="mt-6 flex-1 space-y-4 overflow-y-auto pr-1">
            {sidebarNavigationGroups.map((group) => (
              <SidebarNavigationGroup key={group.title} group={group} />
            ))}
          </nav>
          <div className="space-y-1.5 border-t border-white/10 pt-5">
            {secondaryNavigation.map(({ label, icon: Icon, to }) => (
              <SidebarLink key={to} label={label} icon={<Icon className="h-4 w-4" />} to={to} tone="slate" />
            ))}
            <button
              type="button"
              onClick={() => setSupportOpen(true)}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-200 transition hover:bg-white/8 hover:text-white"
            >
              <CircleHelp className="h-4 w-4" />
              Help & Support
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
                  className="hidden h-10 w-10 items-center justify-center rounded-xl border border-sky-300/24 bg-white/5 text-sky-100/72 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] transition hover:border-sky-200/60 hover:text-sky-200 md:inline-flex"
                  aria-label="Go back"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(true)}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-sky-300/24 bg-white/5 text-sky-100/72 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] lg:hidden"
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
                  className="relative inline-flex h-10 w-10 items-center justify-center rounded-xl border border-sky-300/24 bg-white/5 text-sky-100/72 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] transition hover:text-sky-200"
                  aria-label="Notifications"
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
                    className="nclex-btn-secondary inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Sync now
                  </button>
                  {authUser ? (
                    <button
                      type="button"
                      onClick={() => void signOut()}
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
            <div className="w-full max-w-none">
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
                    <Route path="/" element={<StudyMenuPage />} />
                    <Route path="/dashboard" element={<DashboardPage />} />
                    <Route path="/exam-prep" element={<ExamPrepPage />} />
                    <Route path="/practice-questions" element={<PracticeQuestionsPage />} />
                    <Route path="/test-mode" element={<TestModePage />} />
                    <Route path="/nurse-command-lab" element={<NurseCommandLabPage />} />
                    <Route path="/clinical-simulator" element={<ClinicalSimulatorPage />} />
                    <Route path="/quick-study" element={<QuickStudyPage />} />
                    <Route path="/weak-areas" element={<WeakAreasPage />} />
                    <Route path="/performance-analytics" element={<PerformanceAnalyticsPage />} />
                    <Route path="/flashcards" element={<FlashcardsPage />} />
                    <Route path="/study-plan" element={<StudyPlanPage />} />
                    <Route path="/strategy-training" element={<StrategyTrainingPage />} />
                    <Route path="/notes" element={<NotesPage />} />
                    <Route path="/my-materials" element={<MyMaterialsPage />} />
                    <Route path="/social" element={<SocialPage />} />
                    <Route path="/settings" element={<SettingsPage />} />
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
              aria-label="Primary navigation"
            >
            <motion.div
              initial={{ x: -32, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -32, opacity: 0 }}
              className="nclex-sidebar safe-top flex h-full w-[84vw] max-w-[320px] flex-col px-5 py-5 text-white"
            >
              <div className="flex items-start justify-between gap-3">
                <BrandLockup compact />
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/6 focus:outline-none focus:ring-2 focus:ring-cyan-200/60"
                  aria-label="Close navigation"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <nav className="mt-6 flex-1 space-y-4 overflow-y-auto pr-1">
                {sidebarNavigationGroups.map((group) => (
                  <SidebarNavigationGroup
                    key={group.title}
                    group={group}
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
            aria-label="More navigation"
            onClick={() => setMobileMoreOpen(false)}
          >
            <motion.div
              initial={{ y: 24, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 24, opacity: 0 }}
              className="safe-bottom fixed inset-x-0 bottom-0 flex max-h-[calc(100vh-1rem)] flex-col rounded-t-[28px] border border-sky-300/20 bg-[#04101f]/95 px-4 pb-6 pt-4 shadow-[0_-18px_44px_rgba(0,0,0,0.34)] backdrop-blur-xl [--safe-bottom-offset:1.5rem]"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="mx-auto mb-4 h-1.5 w-14 rounded-full bg-sky-300/24" />
              <div className="flex items-center justify-between">
                <div>
                  <p className="nc-eyebrow text-sky-200/62">
                    More
                  </p>
                  <h2 className="nc-section-title text-xl text-white">Study tools</h2>
                </div>
                <button
                  type="button"
                  onClick={() => setMobileMoreOpen(false)}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-sky-300/24 bg-white/5 text-sky-100/72 focus:outline-none focus:ring-2 focus:ring-cyan-200/60"
                  aria-label="Close more navigation"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="mt-5 min-h-0 space-y-5 overflow-y-auto pr-1">
                {mobileMoreNavigationGroups.map((group) => (
                  <div key={group.title}>
                    <p className="nc-eyebrow px-1 pb-2 text-[10px] text-sky-100/44">
                      {group.title}
                    </p>
                    <div className="grid gap-3">
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
                              'flex items-center justify-between rounded-2xl border px-4 py-3.5 text-left focus:outline-none focus:ring-2 focus:ring-cyan-200/55',
                              active
                                ? 'border-sky-200/60 bg-sky-400/12 text-white shadow-[0_0_24px_rgba(56,189,248,0.16)]'
                                : 'border-sky-300/20 bg-white/[0.04] text-sky-100/76',
                            )}
                          >
                            <span className="flex items-center gap-3 text-sm font-semibold">
                              <Icon className="h-4 w-4" />
                              {label}
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
                  className="flex items-center justify-between rounded-2xl border border-sky-300/20 bg-white/[0.04] px-4 py-3.5 text-left text-sky-100/76 focus:outline-none focus:ring-2 focus:ring-cyan-200/55"
                >
                  <span className="flex items-center gap-3 text-sm font-semibold">
                    <CircleHelp className="h-4 w-4" />
                    Help & Support
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
  onNavigate,
}: {
  group: { title: string; tone: NavigationTone; items: NavigationItem[] }
  onNavigate?: () => void
}) {
  const tone = navigationToneClasses[group.tone]

  return (
    <div>
      <div className="mb-2 flex items-center gap-2 px-3">
        <span className={clsx('h-1.5 w-1.5 rounded-full', tone.dot)} />
        <p className={clsx('nc-eyebrow text-[10px]', tone.group)}>
          {group.title}
        </p>
      </div>
      <div className="space-y-1">
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
}: {
  label: string
  icon: React.ReactNode
  to: string
  activePaths?: string[]
  tone?: NavigationTone
  onClick?: () => void
}) {
  const location = useLocation()
  const activeByPath = activePaths?.some((path) => location.pathname.startsWith(path)) ?? false
  const toneClass = navigationToneClasses[tone]

  return (
    <NavLink
      to={to}
      end={to === '/'}
      onClick={onClick}
      className={({ isActive }) =>
        clsx(
          'group flex items-center gap-3 rounded-xl border border-transparent px-3 py-2.5 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-cyan-200/55',
          isActive || activeByPath
            ? toneClass.active
            : 'text-slate-200/88 hover:border-white/10 hover:bg-white/[0.055] hover:text-white',
        )
      }
    >
      <span className={clsx('transition group-hover:text-white', toneClass.icon)}>{icon}</span>
      <span className="truncate">{label}</span>
    </NavLink>
  )
}

function MobileTabBar({
  pathname,
  onOpenMore,
  onOpenQuickStudy,
}: {
  pathname: string
  onOpenMore: () => void
  onOpenQuickStudy: () => void
}) {
  const navigate = useNavigate()
  const moreActive = !mobilePrimaryNavigation.some((item) => isNavigationItemActive(pathname, item))

  return (
    <div className="mobile-bottom-bar safe-bottom fixed inset-x-0 bottom-0 z-30 border-t border-sky-300/20 bg-[#020812]/92 pt-2 backdrop-blur-xl lg:hidden">
      <div className="mx-auto grid max-w-[520px] grid-cols-4">
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
                'flex min-h-[58px] min-w-0 flex-col items-center justify-center gap-1 rounded-2xl px-0 py-2 text-center text-[10px] font-medium leading-tight transition active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-cyan-200/55',
                emphasis
                  ? 'nclex-btn-primary -mt-5 px-3 py-3 text-white'
                  : active
                    ? 'bg-sky-400/12 text-sky-200 shadow-[inset_0_-2px_0_#1d9bff]'
                    : 'text-sky-100/56',
              )}
            >
              <Icon className={clsx('h-4 w-4', emphasis && 'h-5 w-5')} />
              <span className="block w-full text-center leading-[1.05]">{label}</span>
            </button>
          )
        })}
        <button
          type="button"
          onClick={onOpenMore}
          className={clsx(
            'flex min-h-[58px] min-w-0 flex-col items-center justify-center gap-1 rounded-2xl px-0 py-2 text-center text-[10px] font-medium leading-tight active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-cyan-200/55',
            moreActive ? 'bg-sky-400/12 text-sky-200 shadow-[inset_0_-2px_0_#1d9bff]' : 'text-sky-100/56',
          )}
          aria-current={moreActive ? 'page' : undefined}
        >
          <Menu className="h-4 w-4" />
          <span className="block w-full text-center leading-[1.05]">More</span>
        </button>
      </div>
    </div>
  )
}

function BrandLockup({ compact = false }: { compact?: boolean }) {
  return (
    <div className={clsx('rounded-[18px] border border-cyan-300/22 bg-[#071d34]/75 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_0_24px_rgba(43,148,255,0.14)]', compact && 'p-3')}>
      <div className="flex items-start gap-3">
        <div className="relative grid h-12 w-12 shrink-0 place-items-center rounded-[16px] border border-cyan-300/35 bg-[#092845] shadow-[0_0_26px_rgba(43,148,255,0.26)]">
          <img src={nursingCommandLogo} alt="Nurse Command logo" className="h-10 w-10 object-contain" />
        </div>
        <div className="min-w-0">
          <p className="nc-section-title text-lg uppercase text-white drop-shadow-[0_0_12px_rgba(144,204,255,0.36)]">
            Nurse Command
          </p>
          <p className="nc-eyebrow -mt-0.5 text-[10px] text-sky-100">
            Study. Practice. Lead.
          </p>
          {!compact ? (
            <div className="mt-3 grid grid-cols-3 gap-1.5">
              {['RN', 'PN', 'FNP'].map((label) => (
                <span
                  key={label}
                  className="rounded-lg border border-white/10 bg-white/[0.055] px-2 py-1 text-center text-[10px] font-bold text-sky-100/70"
                >
                  {label}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}

function SupportSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
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
            className="absolute inset-x-4 top-20 mx-auto max-w-[460px] rounded-[24px] border border-sky-300/24 bg-[#071d34]/95 p-6 shadow-[0_24px_60px_rgba(0,0,0,0.34)] backdrop-blur"
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
