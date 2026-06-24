import { AnimatePresence, motion } from 'framer-motion'
import {
  Activity,
  Bell,
  BadgeDollarSign,
  BookOpen,
  Brain,
  ChevronDown,
  ChevronLeft,
  ClipboardList,
  Cloud,
  CloudOff,
  FileText,
  Flashlight,
  FolderOpen,
  Gamepad2,
  Headphones,
  HelpCircle,
  HeartPulse,
  LayoutGrid,
  Menu,
  NotebookPen,
  RefreshCw,
  Settings,
  ShieldCheck,
  SquareStack,
  Target,
  Trophy,
  Users,
  X,
} from 'lucide-react'
import { lazy, Suspense, useEffect, useMemo, useState, type ComponentType, type ReactNode } from 'react'
import { NavLink, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { clsx } from 'clsx'
import { PwaInstallPrompt } from '../features/PwaInstallPrompt'
import { SocialPage } from '../features/SocialPage'
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

const mainNavigation: NavigationItem[] = [
  { label: 'Home', icon: LayoutGrid, to: '/' },
  { label: 'Dashboard', icon: LayoutGrid, to: '/dashboard' },
  { label: 'Study Plan', icon: BookOpen, to: '/study-plan' },
  { label: 'Question Bank', icon: ClipboardList, to: '/practice-questions' },
  { label: 'Quick Study', icon: Flashlight, to: '/quick-study' },
  { label: 'Remediation', icon: FileText, to: '/weak-areas' },
  { label: 'Performance', icon: Trophy, to: '/performance-analytics' },
  { label: 'Nurse Lab', icon: Gamepad2, to: '/nurse-command-lab', activePaths: nurseLabRoutePaths },
]

const studyToolsNavigation: NavigationItem[] = [
  { label: 'Exam Prep', icon: Target, to: '/exam-prep' },
  { label: 'Exams', icon: Target, to: '/test-mode' },
  { label: 'Flashcards', icon: SquareStack, to: '/flashcards' },
  { label: 'Notes', icon: NotebookPen, to: '/notes' },
  { label: 'My Materials', icon: FolderOpen, to: '/my-materials' },
  { label: 'Resources', icon: Brain, to: '/strategy-training' },
]

const labNavigation: NavigationItem[] = [
  { label: 'Shift Game', icon: HeartPulse, to: '/shift-command' },
  { label: 'Hospitalvania', icon: Gamepad2, to: '/hospitalvania' },
  { label: 'Tycoon', icon: BadgeDollarSign, to: '/nurse-tycoon' },
  { label: 'Simulator', icon: Brain, to: '/clinical-simulator' },
]

const secondaryNavigation: NavigationItem[] = [
  { label: 'Social', icon: Users, to: '/social' },
  { label: 'Settings', icon: Settings, to: '/settings' },
]

const mobilePrimaryNavigation: NavigationItem[] = [
  { label: 'Home', icon: LayoutGrid, to: '/' },
  { label: 'Bank', icon: ClipboardList, to: '/practice-questions' },
  { label: 'Quick', icon: Flashlight, to: '/quick-study', emphasis: true },
  { label: 'Cards', icon: SquareStack, to: '/flashcards' },
]

const mobileMoreNavigationGroups = [
  {
    title: 'Command',
    items: mainNavigation.filter((item) => !['/', '/practice-questions', '/quick-study'].includes(item.to)),
  },
  {
    title: 'Study Tools',
    items: studyToolsNavigation.filter((item) => item.to !== '/flashcards'),
  },
  {
    title: 'Account',
    items: secondaryNavigation,
  },
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

function RouteLoadingScreen({ label = 'Loading module' }: { label?: string }) {
  return (
    <div className="grid min-h-screen place-items-center bg-[#04101f] px-6 text-center text-white">
      <div>
        <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-2xl border border-cyan-300/30 bg-cyan-400/10 text-cyan-200">
          <RefreshCw className="h-5 w-5 animate-spin" />
        </div>
        <p className="text-sm font-black uppercase tracking-[0.18em] text-sky-200/72">
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
  const showMobileQuickStudyCta =
    location.pathname !== '/dashboard' &&
    location.pathname !== '/study-plan' &&
    location.pathname !== '/performance-analytics' &&
    location.pathname !== '/quick-study' &&
    location.pathname !== '/practice-questions' &&
    !location.pathname.startsWith('/nurse-command-lab')
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
            <div className="lg:hidden">
              <PwaInstallPrompt />
            </div>
            {migrationPromptVisible ? (
              <div className="mb-5 rounded-[20px] border border-[#cfe1f7] bg-[linear-gradient(135deg,#ffffff_0%,#eef5ff_100%)] p-4 shadow-sm">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--nclex-blue)]">
                      Cloud migration ready
                    </p>
                    <h2 className="mt-1 font-serif text-2xl text-[var(--nclex-text)]">
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
        <aside className="nclex-sidebar hidden w-[282px] shrink-0 px-5 py-5 text-white lg:flex lg:flex-col">
          <BrandLockup />
          <nav className="mt-8 flex-1 space-y-1.5">
            {mainNavigation.map(({ label, icon: Icon, to, activePaths }) => (
              <SidebarLink key={to} label={label} icon={<Icon className="h-4 w-4" />} to={to} activePaths={activePaths} />
            ))}
            <div className="pt-5">
              <p className="px-3 pb-2 text-[10px] font-black uppercase tracking-[0.2em] text-sky-100/42">
                Study Tools
              </p>
              <div className="space-y-1.5">
                {studyToolsNavigation.map(({ label, icon: Icon, to, activePaths }) => (
                  <SidebarLink key={to} label={label} icon={<Icon className="h-4 w-4" />} to={to} activePaths={activePaths} />
                ))}
              </div>
            </div>
          </nav>
          <div className="space-y-1.5 border-t border-white/10 pt-5">
            {secondaryNavigation.map(({ label, icon: Icon, to }) => (
              <SidebarLink key={to} label={label} icon={<Icon className="h-4 w-4" />} to={to} />
            ))}
            <button
              type="button"
              onClick={() => setSupportOpen(true)}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-200 transition hover:bg-white/8 hover:text-white"
            >
              <HelpCircle className="h-4 w-4" />
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
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-sky-200/60">
                    Nurse Command
                  </p>
                  <h1 className="truncate text-lg font-black text-white md:text-xl">
                    {pageMeta.label}
                  </h1>
                </div>
              </div>

              <div className="flex items-center gap-2 md:gap-3">
                <button
                  type="button"
                  onClick={() => void syncNow()}
                  className={clsx(
                    'hidden items-center gap-2 rounded-xl border px-3 py-2 text-xs font-bold uppercase tracking-[0.12em] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] transition md:inline-flex',
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
                  {isDemoMode ? <CloudOff className="h-4 w-4" /> : <Cloud className="h-4 w-4" />}
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
                  className="flex items-center gap-2 rounded-xl border border-sky-300/24 bg-white/5 px-2 py-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] transition hover:border-sky-200/60"
                >
                  <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border border-cyan-300/30 bg-[linear-gradient(180deg,#0f7aff_0%,#062d63_100%)] text-sm font-black text-white shadow-[0_0_20px_rgba(43,148,255,0.28)]">
                    {profile.profileImageDataUrl ? (
                      <img src={profile.profileImageDataUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      initials
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
            {accountOpen ? (
              <div className="absolute right-4 top-[4.5rem] z-30 w-[290px] rounded-[20px] border border-sky-300/24 bg-[#071d34]/95 p-4 shadow-[0_24px_60px_rgba(0,0,0,0.34)] backdrop-blur md:right-8">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-sky-200/62">
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
              <div className="lg:hidden">
                <PwaInstallPrompt />
              </div>
              {migrationPromptVisible ? (
                <div className="mb-5 rounded-[20px] border border-sky-300/24 bg-[#071d34]/78 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_16px_34px_rgba(0,0,0,0.18)] backdrop-blur">
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.16em] text-sky-300">
                        Cloud migration ready
                      </p>
                      <h2 className="mt-1 text-2xl font-black text-white">
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

      {showMobileQuickStudyCta ? (
        <button
          type="button"
          onClick={() => navigate('/quick-study')}
          className="mobile-sticky-cta fixed bottom-[6.1rem] right-4 z-30 inline-flex items-center gap-2 rounded-2xl bg-[linear-gradient(180deg,#3388ef_0%,#2a7de1_100%)] px-4 py-3 text-sm font-bold text-white lg:hidden"
        >
          <Flashlight className="h-4 w-4" />
          10 min
        </button>
      ) : null}

      <AnimatePresence>
        {mobileMenuOpen ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-slate-950/40 lg:hidden"
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
                  className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/6"
                  aria-label="Close navigation"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <nav className="mt-8 flex-1 space-y-1.5 overflow-y-auto">
                {mainNavigation.map(({ label, icon: Icon, to, activePaths }) => (
                  <SidebarLink
                    key={to}
                    label={label}
                    icon={<Icon className="h-4 w-4" />}
                    to={to}
                    activePaths={activePaths}
                    onClick={() => setMobileMenuOpen(false)}
                  />
                ))}
                <div className="pt-5">
                  <p className="px-3 pb-2 text-[10px] font-black uppercase tracking-[0.2em] text-sky-100/42">
                    Study Tools
                  </p>
                  <div className="space-y-1.5">
                    {studyToolsNavigation.map(({ label, icon: Icon, to, activePaths }) => (
                      <SidebarLink
                        key={to}
                        label={label}
                        icon={<Icon className="h-4 w-4" />}
                        to={to}
                        activePaths={activePaths}
                        onClick={() => setMobileMenuOpen(false)}
                      />
                    ))}
                  </div>
                </div>
              </nav>
              <div className="space-y-1.5 border-t border-white/10 pt-5">
                <SidebarLink
                  label="Settings"
                  icon={<Settings className="h-4 w-4" />}
                  to="/settings"
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
                  <Headphones className="h-4 w-4" />
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
            onClick={() => setMobileMoreOpen(false)}
          >
            <motion.div
              initial={{ y: 24, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 24, opacity: 0 }}
              className="safe-bottom fixed inset-x-0 bottom-0 flex max-h-[calc(100vh-1rem)] flex-col rounded-t-[28px] border border-sky-300/20 bg-[#04101f]/95 px-4 pb-6 pt-4 shadow-[0_-18px_44px_rgba(0,0,0,0.34)] backdrop-blur-xl"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="mx-auto mb-4 h-1.5 w-14 rounded-full bg-sky-300/24" />
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-sky-200/62">
                    More
                  </p>
                  <h2 className="text-xl font-black text-white">Study tools</h2>
                </div>
                <button
                  type="button"
                  onClick={() => setMobileMoreOpen(false)}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-sky-300/24 bg-white/5 text-sky-100/72"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="mt-5 min-h-0 space-y-5 overflow-y-auto pr-1">
                {mobileMoreNavigationGroups.map((group) => (
                  <div key={group.title}>
                    <p className="px-1 pb-2 text-[10px] font-black uppercase tracking-[0.2em] text-sky-100/44">
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
                              'flex items-center justify-between rounded-2xl border px-4 py-3.5 text-left',
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
                  className="flex items-center justify-between rounded-2xl border border-sky-300/20 bg-white/[0.04] px-4 py-3.5 text-left text-sky-100/76"
                >
                  <span className="flex items-center gap-3 text-sm font-semibold">
                    <Headphones className="h-4 w-4" />
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

function SidebarLink({
  label,
  icon,
  to,
  activePaths,
  onClick,
}: {
  label: string
  icon: React.ReactNode
  to: string
  activePaths?: string[]
  onClick?: () => void
}) {
  const location = useLocation()
  const activeByPath = activePaths?.some((path) => location.pathname.startsWith(path)) ?? false

  return (
    <NavLink
      to={to}
      end={to === '/'}
      onClick={onClick}
      className={({ isActive }) =>
        clsx(
          'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition',
          isActive || activeByPath
            ? 'bg-[linear-gradient(180deg,#2f87f0_0%,#2a7de1_100%)] text-white shadow-[0_14px_28px_rgba(42,125,225,0.28)]'
            : 'text-slate-200 hover:bg-white/8 hover:text-white',
        )
      }
    >
      {icon}
      {label}
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

  return (
    <div className="mobile-bottom-bar safe-bottom fixed inset-x-0 bottom-0 z-30 border-t border-sky-300/20 bg-[#020812]/92 px-3 py-2 backdrop-blur-xl lg:hidden">
      <div className="mx-auto flex max-w-[560px] items-end justify-between gap-1">
        {mobilePrimaryNavigation.map(({ label, icon: Icon, to, emphasis }) => {
          const active = to === '/' ? pathname === '/' : pathname.startsWith(to)
          return (
            <button
              key={to}
              type="button"
              onClick={() => {
                if (emphasis) {
                  onOpenQuickStudy()
                  return
                }
                navigate(to)
              }}
              className={clsx(
                'flex min-w-0 flex-1 flex-col items-center gap-1 rounded-[18px] px-2 py-2.5 text-[11px] font-semibold transition active:scale-[0.98]',
                emphasis
                  ? 'nclex-btn-primary -mt-5 px-3 py-3 text-white'
                  : active
                    ? 'bg-sky-400/12 text-sky-200 shadow-[inset_0_-2px_0_#1d9bff]'
                    : 'text-sky-100/56',
              )}
            >
              <Icon className={clsx('h-4 w-4', emphasis && 'h-5 w-5')} />
              <span className="truncate">{label}</span>
            </button>
          )
        })}
        <button
          type="button"
          onClick={onOpenMore}
          className="flex flex-1 flex-col items-center gap-1 rounded-[18px] px-2 py-2.5 text-[11px] font-semibold text-sky-100/56 active:scale-[0.98]"
        >
          <Menu className="h-4 w-4" />
          <span>More</span>
        </button>
      </div>
    </div>
  )
}

function BrandLockup({ compact = false }: { compact?: boolean }) {
  return (
    <div className={clsx('rounded-[18px] border border-cyan-300/22 bg-[#071d34]/75 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_0_24px_rgba(43,148,255,0.14)]', compact && 'p-3')}>
      <div className="flex items-start gap-3">
        <div className="relative grid h-12 w-12 shrink-0 place-items-center rounded-[16px] border border-cyan-300/35 bg-[#092845] text-white shadow-[0_0_26px_rgba(43,148,255,0.26)]">
          <ShieldCheck className="h-8 w-8 text-cyan-100" />
          <Activity className="absolute h-4 w-4 text-emerald-200" />
          <span className="absolute -right-1 -top-1 grid h-5 w-5 place-items-center rounded-lg border border-amber-200/50 bg-amber-300/20 text-amber-100">
            <HeartPulse className="h-3 w-3" />
          </span>
        </div>
        <div className="min-w-0">
          <p className="text-lg font-black uppercase tracking-[0.14em] text-white drop-shadow-[0_0_12px_rgba(144,204,255,0.36)]">
            Nurse Command
          </p>
          <p className="-mt-0.5 text-[10px] font-bold uppercase tracking-[0.28em] text-sky-100">
            Study. Practice. Lead.
          </p>
          {!compact ? (
            <div className="mt-3 grid grid-cols-3 gap-1.5">
              {['RN', 'PN', 'FNP'].map((label) => (
                <span
                  key={label}
                  className="rounded-lg border border-white/10 bg-white/[0.055] px-2 py-1 text-center text-[10px] font-black text-sky-100/70"
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
                <p className="text-xs font-black uppercase tracking-[0.18em] text-sky-300">
                  Help & Support
                </p>
                <h3 className="mt-2 text-2xl font-black text-white">
                  Need a quick reset?
                </h3>
                <p className="mt-2 text-sm leading-6 text-sky-100/64">
                  Start with Quick Study if you feel stuck, use Remediation for weak areas, and check Notes if you want to reinforce your own anchors.
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-sky-300/24 bg-white/5 text-sky-100/72"
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
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
