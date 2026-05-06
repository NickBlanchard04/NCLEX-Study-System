import { AnimatePresence, motion } from 'framer-motion'
import {
  Bell,
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
  Headphones,
  HelpCircle,
  HeartPulse,
  LayoutGrid,
  Menu,
  NotebookPen,
  RefreshCw,
  Settings,
  SquareStack,
  Target,
  Trophy,
  X,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { NavLink, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { clsx } from 'clsx'
import { RetroMedicalDashboard } from '../features/RetroMedicalDashboard'
import { PwaInstallPrompt } from '../features/PwaInstallPrompt'
import { ShiftSimulatorGame } from '../features/ShiftSimulatorGame'
import {
  DashboardPage,
  ClinicalSimulatorPage,
  ExamPrepPage,
  FlashcardsPage,
  MyMaterialsPage,
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

const mainNavigation = [
  { label: 'Home', icon: LayoutGrid, to: '/' },
  { label: 'Dashboard', icon: LayoutGrid, to: '/dashboard' },
  { label: 'Exam Prep', icon: Target, to: '/exam-prep' },
  { label: 'Study Plan', icon: BookOpen, to: '/study-plan' },
  { label: 'Question Bank', icon: ClipboardList, to: '/practice-questions' },
  { label: 'Quizzes', icon: Flashlight, to: '/quick-study' },
  { label: 'Exams', icon: Target, to: '/test-mode' },
  { label: 'Shift Game', icon: HeartPulse, to: '/shift-command' },
  { label: 'Simulator', icon: Brain, to: '/clinical-simulator' },
  { label: 'Performance', icon: Trophy, to: '/performance-analytics' },
  { label: 'Notes', icon: NotebookPen, to: '/notes' },
  { label: 'My Materials', icon: FolderOpen, to: '/my-materials' },
  { label: 'Remediation', icon: FileText, to: '/weak-areas' },
  { label: 'Flashcards', icon: SquareStack, to: '/flashcards' },
  { label: 'Resources', icon: Brain, to: '/strategy-training' },
]

const secondaryNavigation = [{ label: 'Settings', icon: Settings, to: '/settings' }]

const mobilePrimaryNavigation = [
  { label: 'Home', icon: LayoutGrid, to: '/' },
  { label: 'Bank', icon: ClipboardList, to: '/practice-questions' },
  { label: 'Quiz', icon: Flashlight, to: '/quick-study', emphasis: true },
  { label: 'Cards', icon: SquareStack, to: '/flashcards' },
]

const allNavigation = [...mainNavigation, ...secondaryNavigation]

export function AppShell() {
  const location = useLocation()

  if (location.pathname.startsWith('/medical-command-center')) {
    return <RetroMedicalDashboard />
  }

  if (location.pathname.startsWith('/shift-command')) {
    return <ShiftSimulatorGame />
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

  const pageMeta = useMemo(() => {
    const match = allNavigation.find((item) =>
      item.to === '/' ? location.pathname === '/' : location.pathname.startsWith(item.to),
    )
    return match ?? allNavigation[0]
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

  if (location.pathname === '/') {
    return (
      <AuthGate>
        <div className="nurse-command-app min-h-screen bg-[#04101f] text-white">
          <div className="w-full">
            <PwaInstallPrompt />
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
      <div className="mx-auto flex min-h-screen max-w-[1760px]">
        <aside className="nclex-sidebar hidden w-[262px] shrink-0 px-5 py-5 text-white lg:flex lg:flex-col">
          <BrandLockup />
          <nav className="mt-8 flex-1 space-y-1.5">
            {mainNavigation.map(({ label, icon: Icon, to }) => (
              <SidebarLink key={to} label={label} icon={<Icon className="h-4 w-4" />} to={to} />
            ))}
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
            <div className="mx-auto flex w-full max-w-[1420px] items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <button
                  type="button"
                  onClick={() => navigate(-1)}
                  className="hidden h-10 w-10 items-center justify-center rounded-xl border border-[var(--nclex-border)] bg-white text-[var(--nclex-text-secondary)] shadow-sm transition hover:text-[var(--nclex-blue)] md:inline-flex"
                  aria-label="Go back"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(true)}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--nclex-border)] bg-white text-[var(--nclex-text-secondary)] shadow-sm lg:hidden"
                  aria-label="Open navigation"
                >
                  <Menu className="h-4 w-4" />
                </button>
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--nclex-text-muted)]">
                    NCLEX Study System
                  </p>
                  <h1 className="truncate text-lg font-black text-[var(--nclex-text)] md:text-xl">
                    {pageMeta.label}
                  </h1>
                </div>
              </div>

              <div className="flex items-center gap-2 md:gap-3">
                <button
                  type="button"
                  onClick={() => void syncNow()}
                  className={clsx(
                    'hidden items-center gap-2 rounded-xl border px-3 py-2 text-xs font-bold uppercase tracking-[0.12em] shadow-sm transition md:inline-flex',
                    syncStatus === 'error'
                      ? 'border-[#ffd1d1] bg-[var(--nclex-danger-soft)] text-[var(--nclex-danger)]'
                      : syncStatus === 'offline'
                        ? 'border-[#ffe0b0] bg-[var(--nclex-warning-soft)] text-[var(--nclex-warning)]'
                        : isDemoMode
                          ? 'border-[var(--nclex-border)] bg-white text-[var(--nclex-text-muted)]'
                          : 'border-[#c8eddc] bg-[var(--nclex-success-soft)] text-[var(--nclex-success)]',
                  )}
                  title={syncError ?? (isDemoMode ? 'Local demo mode' : 'Cloud sync is active')}
                >
                  {isDemoMode ? <CloudOff className="h-4 w-4" /> : <Cloud className="h-4 w-4" />}
                  {syncStatus === 'syncing' ? 'Syncing' : isDemoMode ? 'Local' : 'Synced'}
                </button>
                <button
                  type="button"
                  onClick={() => setSupportOpen(true)}
                  className="hidden rounded-xl border border-[var(--nclex-border)] bg-white px-3 py-2 text-sm font-semibold text-[var(--nclex-blue)] shadow-sm transition hover:border-[#c9dbef] md:inline-flex"
                >
                  Help
                </button>
                <button
                  type="button"
                  className="relative inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--nclex-border)] bg-white text-[var(--nclex-text-secondary)] shadow-sm transition hover:text-[var(--nclex-blue)]"
                  aria-label="Notifications"
                >
                  <Bell className="h-4 w-4" />
                  <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-[var(--nclex-danger)] ring-2 ring-white" />
                </button>
                <button
                  type="button"
                  onClick={() => setAccountOpen((current) => !current)}
                  className="flex items-center gap-2 rounded-xl border border-[var(--nclex-border)] bg-white px-2 py-1.5 shadow-sm transition hover:border-[#c9dbef]"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[linear-gradient(180deg,#ddecff_0%,#bfd9ff_100%)] text-sm font-semibold text-[var(--nclex-navy)]">
                    {initials}
                  </div>
                  <div className="hidden text-left md:block">
                    <p className="text-sm font-semibold text-[var(--nclex-text)]">{profile.name}</p>
                    <p className="text-xs text-[var(--nclex-text-muted)]">{activeExamTrack.shortName} learner</p>
                  </div>
                  <ChevronDown className="hidden h-4 w-4 text-[var(--nclex-text-muted)] md:block" />
                </button>
              </div>
            </div>
            {accountOpen ? (
              <div className="absolute right-4 top-[4.5rem] z-30 w-[290px] rounded-[20px] border border-[var(--nclex-border)] bg-white p-4 shadow-[0_24px_60px_rgba(15,37,61,0.14)] md:right-8">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--nclex-text-muted)]">
                  Account
                </p>
                <p className="mt-2 font-semibold text-[var(--nclex-text)]">{authUser?.email ?? profile.name}</p>
                <p className="mt-1 text-sm text-[var(--nclex-text-muted)]">
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
            <div className="mx-auto w-full max-w-[1420px]">
              <PwaInstallPrompt />
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
                    <Route path="/clinical-simulator" element={<ClinicalSimulatorPage />} />
                    <Route path="/quick-study" element={<QuickStudyPage />} />
                    <Route path="/weak-areas" element={<WeakAreasPage />} />
                    <Route path="/performance-analytics" element={<PerformanceAnalyticsPage />} />
                    <Route path="/flashcards" element={<FlashcardsPage />} />
                    <Route path="/study-plan" element={<StudyPlanPage />} />
                    <Route path="/strategy-training" element={<StrategyTrainingPage />} />
                    <Route path="/notes" element={<NotesPage />} />
                    <Route path="/my-materials" element={<MyMaterialsPage />} />
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

      {location.pathname !== '/quick-study' ? (
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
                {mainNavigation.map(({ label, icon: Icon, to }) => (
                  <SidebarLink
                    key={to}
                    label={label}
                    icon={<Icon className="h-4 w-4" />}
                    to={to}
                    onClick={() => setMobileMenuOpen(false)}
                  />
                ))}
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
              className="safe-bottom fixed inset-x-0 bottom-0 rounded-t-[28px] bg-white px-4 pb-6 pt-4 shadow-[0_-18px_44px_rgba(15,37,61,0.12)]"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="mx-auto mb-4 h-1.5 w-14 rounded-full bg-[var(--nclex-border)]" />
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--nclex-text-muted)]">
                    More
                  </p>
                  <h2 className="font-serif text-xl text-[var(--nclex-text)]">Study tools</h2>
                </div>
                <button
                  type="button"
                  onClick={() => setMobileMoreOpen(false)}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--nclex-border)] bg-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="mt-5 grid gap-3">
                {[...mainNavigation.slice(1), ...secondaryNavigation].map(({ label, icon: Icon, to }) => (
                  <button
                    key={to}
                    type="button"
                    onClick={() => {
                      navigate(to)
                      setMobileMoreOpen(false)
                    }}
                    className={clsx(
                      'flex items-center justify-between rounded-2xl border px-4 py-3.5 text-left',
                      location.pathname.startsWith(to)
                        ? 'border-[#c9dbef] bg-[var(--nclex-blue-soft)] text-[var(--nclex-text)]'
                        : 'border-[var(--nclex-border)] bg-white text-[var(--nclex-text-secondary)]',
                    )}
                  >
                    <span className="flex items-center gap-3 text-sm font-semibold">
                      <Icon className="h-4 w-4" />
                      {label}
                    </span>
                    {location.pathname.startsWith(to) ? (
                      <span className="nclex-chip nclex-chip-info">Open</span>
                    ) : null}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    setMobileMoreOpen(false)
                    setSupportOpen(true)
                  }}
                  className="flex items-center justify-between rounded-2xl border border-[var(--nclex-border)] bg-white px-4 py-3.5 text-left text-[var(--nclex-text-secondary)]"
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
  onClick,
}: {
  label: string
  icon: React.ReactNode
  to: string
  onClick?: () => void
}) {
  return (
    <NavLink
      to={to}
      end={to === '/'}
      onClick={onClick}
      className={({ isActive }) =>
        clsx(
          'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition',
          isActive
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
    <div className="mobile-bottom-bar safe-bottom fixed inset-x-0 bottom-0 z-30 border-t border-[var(--nclex-border)] bg-white/96 px-3 py-2 backdrop-blur-xl lg:hidden">
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
                    ? 'bg-[var(--nclex-blue-soft)] text-[var(--nclex-blue)]'
                    : 'text-[var(--nclex-text-muted)]',
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
          className="flex flex-1 flex-col items-center gap-1 rounded-[18px] px-2 py-2.5 text-[11px] font-semibold text-[var(--nclex-text-muted)] active:scale-[0.98]"
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
        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-[16px] border border-cyan-300/35 bg-[linear-gradient(180deg,#0f7aff_0%,#062d63_100%)] text-white shadow-[0_0_26px_rgba(43,148,255,0.34)]">
          <HeartPulse className="h-7 w-7" />
        </div>
        <div className="min-w-0">
          <p className="text-lg font-black uppercase tracking-[0.16em] text-white drop-shadow-[0_0_12px_rgba(144,204,255,0.45)]">
            Nurse Command
          </p>
          <p className="-mt-0.5 text-[10px] font-bold uppercase tracking-[0.32em] text-sky-100">
            Study. Practice. Lead.
          </p>
          {!compact ? (
            <p className="mt-2 text-xs leading-5 text-slate-300">
              Build confidence for the floor.
            </p>
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
            className="absolute inset-x-4 top-20 mx-auto max-w-[460px] rounded-[24px] border border-[var(--nclex-border)] bg-white p-6 shadow-[0_24px_60px_rgba(15,37,61,0.14)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--nclex-blue)]">
                  Help & Support
                </p>
                <h3 className="mt-2 font-serif text-2xl text-[var(--nclex-text)]">
                  Need a quick reset?
                </h3>
                <p className="mt-2 text-sm leading-6 text-[var(--nclex-text-muted)]">
                  Start with Quick Study if you feel stuck, use Remediation for weak areas, and check Notes if you want to reinforce your own anchors.
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--nclex-border)] bg-white"
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
                  className="rounded-2xl border border-[var(--nclex-border)] bg-[var(--nclex-card-muted)] px-4 py-3 text-sm text-[var(--nclex-text-secondary)]"
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
