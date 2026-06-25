import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BarChart3,
  BookOpenCheck,
  Brain,
  CheckCircle2,
  Clock3,
  Database,
  Eye,
  FileQuestion,
  Gauge,
  Layers3,
  LineChart,
  LockKeyhole,
  MousePointer2,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  Target,
  TimerReset,
  TrendingDown,
  TrendingUp,
  UploadCloud,
  Users,
  Zap,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { loadRecentAdminEvents } from '../services/admin-analytics'
import { getLocalAppEvents, type StoredAppEvent } from '../services/analytics-client'

type RangeFilter = 'Today' | '7 days' | '30 days' | '90 days'
type SourceFilter = 'All' | 'Google Ads' | 'LinkedIn' | 'Direct' | 'Email' | 'Organic'
type ExamFilter = 'All' | 'NCLEX-RN' | 'NCLEX-PN' | 'TEAS' | 'FNP' | 'CCMA'
type StatusTone = 'good' | 'watch' | 'critical' | 'info'

interface JourneyNode {
  id: string
  label: string
  users: number
  conversion: number
  dropOff: number
  avgTime: string
  source: SourceFilter
  tone: StatusTone
  action: string
}

interface FeatureRow {
  feature: string
  opens: number
  uniqueUsers: number
  completion: number
  returnRate: number
  feedback: number
  interest: number
  recommendation: string
}

interface PageRow {
  page: string
  views: number
  avgTime: string
  exitRate: number
  nextAction: string
  interest: number
}

interface TimelineEvent {
  time: string
  event: string
  detail: string
  tone: StatusTone
}

interface AdminUserRow {
  id: string
  label: string
  examTrack: ExamFilter
  source: SourceFilter
  status: string
  createdAt: string
  lastActive: string
  sessionMinutes: number
  activationScore: number
  timeline: TimelineEvent[]
}

const dateRanges: RangeFilter[] = ['Today', '7 days', '30 days', '90 days']
const sources: SourceFilter[] = ['All', 'Google Ads', 'LinkedIn', 'Direct', 'Email', 'Organic']
const examTracks: ExamFilter[] = ['All', 'NCLEX-RN', 'NCLEX-PN', 'TEAS', 'FNP', 'CCMA']

const journeyNodes: JourneyNode[] = [
  {
    id: 'traffic',
    label: 'Traffic source',
    users: 1420,
    conversion: 100,
    dropOff: 0,
    avgTime: '0:00',
    source: 'Google Ads',
    tone: 'info',
    action: 'Judge ads by activated users, not clicks.',
  },
  {
    id: 'landing',
    label: 'Landing page',
    users: 1036,
    conversion: 73,
    dropOff: 27,
    avgTime: '0:41',
    source: 'Direct',
    tone: 'watch',
    action: 'Clarify free beta value above the fold.',
  },
  {
    id: 'signup',
    label: 'Demo or signup started',
    users: 548,
    conversion: 53,
    dropOff: 47,
    avgTime: '1:12',
    source: 'LinkedIn',
    tone: 'watch',
    action: 'Reduce account friction before first study action.',
  },
  {
    id: 'onboarding',
    label: 'Onboarding completed',
    users: 388,
    conversion: 71,
    dropOff: 29,
    avgTime: '2:36',
    source: 'LinkedIn',
    tone: 'good',
    action: 'Keep exam-track setup short and guided.',
  },
  {
    id: 'study',
    label: 'First study action',
    users: 291,
    conversion: 75,
    dropOff: 25,
    avgTime: '3:08',
    source: 'Organic',
    tone: 'good',
    action: 'Push Quick Study immediately after onboarding.',
  },
  {
    id: 'quiz',
    label: 'Quiz completed',
    users: 188,
    conversion: 65,
    dropOff: 35,
    avgTime: '8:44',
    source: 'Direct',
    tone: 'watch',
    action: 'Add progress reassurance inside the quiz.',
  },
  {
    id: 'remediation',
    label: 'Remediation opened',
    users: 79,
    conversion: 42,
    dropOff: 58,
    avgTime: '1:09',
    source: 'Email',
    tone: 'critical',
    action: 'Make weak-area repair feel like the next step, not a separate page.',
  },
  {
    id: 'return',
    label: 'Returned later',
    users: 52,
    conversion: 66,
    dropOff: 34,
    avgTime: '1 day',
    source: 'LinkedIn',
    tone: 'watch',
    action: 'Add weekly readiness report and streak protection.',
  },
]

const featureRows: FeatureRow[] = [
  {
    feature: 'Quick Study',
    opens: 486,
    uniqueUsers: 221,
    completion: 78,
    returnRate: 42,
    feedback: 12,
    interest: 92,
    recommendation: 'Make this the default first action.',
  },
  {
    feature: 'Question Bank',
    opens: 392,
    uniqueUsers: 188,
    completion: 64,
    returnRate: 37,
    feedback: 9,
    interest: 81,
    recommendation: 'Keep rationales and confidence prompt tight.',
  },
  {
    feature: 'Weak Areas',
    opens: 126,
    uniqueUsers: 71,
    completion: 31,
    returnRate: 18,
    feedback: 15,
    interest: 66,
    recommendation: 'Needs clearer next action after misses.',
  },
  {
    feature: 'Material Upload',
    opens: 74,
    uniqueUsers: 39,
    completion: 22,
    returnRate: 11,
    feedback: 18,
    interest: 58,
    recommendation: 'High curiosity, high friction. Improve upload confidence copy.',
  },
  {
    feature: 'Flashcards',
    opens: 91,
    uniqueUsers: 44,
    completion: 49,
    returnRate: 12,
    feedback: 4,
    interest: 43,
    recommendation: 'Package as review loop after missed questions.',
  },
]

const pageRows: PageRow[] = [
  { page: '/quick-study', views: 632, avgTime: '9:12', exitRate: 18, nextAction: 'quiz_completed', interest: 91 },
  { page: '/practice-questions', views: 514, avgTime: '7:45', exitRate: 24, nextAction: 'question_answered', interest: 84 },
  { page: '/weak-areas', views: 166, avgTime: '2:38', exitRate: 46, nextAction: 'remediation_opened', interest: 59 },
  { page: '/my-materials', views: 118, avgTime: '1:51', exitRate: 52, nextAction: 'material_upload_started', interest: 48 },
  { page: '/social', views: 73, avgTime: '0:49', exitRate: 63, nextAction: 'profile_viewed', interest: 28 },
]

const seededUsers: AdminUserRow[] = [
  {
    id: 'anon-1842',
    label: 'User 1842',
    examTrack: 'NCLEX-RN',
    source: 'LinkedIn',
    status: 'Activated, needs remediation nudge',
    createdAt: 'Today 9:08 AM',
    lastActive: '11 min ago',
    sessionMinutes: 18,
    activationScore: 82,
    timeline: [
      { time: '9:08 AM', event: 'Account created', detail: 'Entered NCLEX-RN track from LinkedIn', tone: 'info' },
      { time: '9:11 AM', event: 'Onboarding completed', detail: 'Selected Adult Health as weak area', tone: 'good' },
      { time: '9:13 AM', event: 'Quick Study started', detail: '10-question focused session', tone: 'good' },
      { time: '9:22 AM', event: 'Quiz completed', detail: '6/10 correct, 3 high-confidence misses', tone: 'watch' },
      { time: '9:24 AM', event: 'Remediation ignored', detail: 'Left after rationale view', tone: 'critical' },
    ],
  },
  {
    id: 'anon-2219',
    label: 'User 2219',
    examTrack: 'NCLEX-PN',
    source: 'Google Ads',
    status: 'Dropped during account setup',
    createdAt: 'Today 8:42 AM',
    lastActive: '1 hr ago',
    sessionMinutes: 4,
    activationScore: 34,
    timeline: [
      { time: '8:42 AM', event: 'Landing page viewed', detail: 'Campaign nclex_free_beta', tone: 'info' },
      { time: '8:43 AM', event: 'Signup opened', detail: 'Beta terms viewed', tone: 'info' },
      { time: '8:44 AM', event: 'Signup abandoned', detail: 'No first study action', tone: 'critical' },
    ],
  },
  {
    id: 'anon-3091',
    label: 'User 3091',
    examTrack: 'NCLEX-RN',
    source: 'Direct',
    status: 'Power user',
    createdAt: 'Yesterday',
    lastActive: '26 min ago',
    sessionMinutes: 34,
    activationScore: 94,
    timeline: [
      { time: '10:04 AM', event: 'Returned later', detail: 'Second session in 24 hours', tone: 'good' },
      { time: '10:06 AM', event: 'Question Bank opened', detail: 'Mixed adult health set', tone: 'good' },
      { time: '10:19 AM', event: 'Question answered', detail: 'High confidence incorrect in prioritization', tone: 'watch' },
      { time: '10:21 AM', event: 'Weak Areas opened', detail: 'Reviewed prioritization plan', tone: 'good' },
      { time: '10:38 AM', event: 'Note created', detail: 'Stored count only; note body not visible in admin', tone: 'info' },
    ],
  },
  {
    id: 'anon-4170',
    label: 'User 4170',
    examTrack: 'TEAS',
    source: 'Organic',
    status: 'Wrong segment signal',
    createdAt: 'Yesterday',
    lastActive: '20 hrs ago',
    sessionMinutes: 6,
    activationScore: 38,
    timeline: [
      { time: '3:16 PM', event: 'Exam track selected', detail: 'TEAS selected', tone: 'watch' },
      { time: '3:17 PM', event: 'Dashboard opened', detail: 'Looked for pre-nursing material', tone: 'watch' },
      { time: '3:21 PM', event: 'Exited', detail: 'No quiz started', tone: 'critical' },
    ],
  },
]

const buildPriorities = [
  {
    label: 'Remediation next-step prompts',
    score: 94,
    reason: 'High-confidence misses are visible but users do not always enter repair mode.',
    tone: 'critical' as StatusTone,
  },
  {
    label: 'First-study shortcut after onboarding',
    score: 87,
    reason: 'First study action is the strongest activation milestone.',
    tone: 'good' as StatusTone,
  },
  {
    label: 'Material upload trust copy',
    score: 73,
    reason: 'Users open upload but abandon before completion.',
    tone: 'watch' as StatusTone,
  },
]

const toneClass: Record<StatusTone, string> = {
  good: 'border-emerald-300/35 bg-emerald-300/12 text-emerald-100',
  watch: 'border-amber-300/35 bg-amber-300/12 text-amber-100',
  critical: 'border-rose-300/35 bg-rose-300/12 text-rose-100',
  info: 'border-cyan-300/30 bg-cyan-300/12 text-cyan-100',
}

const toneDotClass: Record<StatusTone, string> = {
  good: 'bg-emerald-300 shadow-[0_0_18px_rgba(110,231,183,0.38)]',
  watch: 'bg-amber-300 shadow-[0_0_18px_rgba(252,211,77,0.34)]',
  critical: 'bg-rose-300 shadow-[0_0_18px_rgba(253,164,175,0.34)]',
  info: 'bg-cyan-300 shadow-[0_0_18px_rgba(103,232,249,0.32)]',
}

const formatPercent = (value: number) => `${Math.round(value)}%`

const eventLabel = (eventName: string) =>
  eventName
    .split('_')
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join(' ')

const featureFromPath = (path: string) => {
  if (path.includes('quick-study')) return 'Quick Study'
  if (path.includes('practice-questions')) return 'Question Bank'
  if (path.includes('weak-areas')) return 'Weak Areas'
  if (path.includes('my-materials')) return 'Material Upload'
  if (path.includes('flashcards')) return 'Flashcards'
  if (path.includes('study-plan')) return 'Study Plan'
  return 'App Navigation'
}

function usersFromEvents(events: StoredAppEvent[]): AdminUserRow[] {
  if (!events.length) return []
  const grouped = new Map<string, StoredAppEvent[]>()
  for (const event of events) {
    const key = event.user_id ?? event.anonymous_user_id
    grouped.set(key, [...(grouped.get(key) ?? []), event])
  }

  return [...grouped.entries()].slice(0, 8).map(([id, rows], index) => {
    const sorted = [...rows].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    const first = sorted[sorted.length - 1]
    const latest = sorted[0]
    const quizCompleted = sorted.some((event) => event.event_name === 'quiz_completed')
    const onboarding = sorted.some((event) => event.event_name === 'onboarding_completed')
    const activationScore = Math.min(100, 28 + sorted.length * 8 + (quizCompleted ? 22 : 0) + (onboarding ? 14 : 0))
    return {
      id,
      label: latest.user_id ? `Account ${index + 1}` : `Anonymous ${index + 1}`,
      examTrack: ((latest.exam_track ?? 'nclex-rn').toUpperCase() as ExamFilter).replace('NCLEX-', 'NCLEX-') as ExamFilter,
      source: ((latest.source ?? 'Direct') as SourceFilter) || 'Direct',
      status: quizCompleted ? 'Activated' : onboarding ? 'Onboarded, no completed quiz' : 'Browsing',
      createdAt: new Date(first.created_at).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }),
      lastActive: new Date(latest.created_at).toLocaleString([], { hour: 'numeric', minute: '2-digit' }),
      sessionMinutes: Math.max(1, Math.round(sorted.reduce((sum, event) => sum + (event.time_spent_seconds ?? 45), 0) / 60)),
      activationScore,
      timeline: sorted.slice(0, 10).map((event) => ({
        time: new Date(event.created_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
        event: eventLabel(event.event_name),
        detail: event.feature_name ?? event.question_category ?? event.page_path,
        tone: event.event_name.includes('failed') ? 'critical' : event.event_name.includes('completed') ? 'good' : 'info',
      })),
    }
  })
}

function aggregateFeatureRows(events: StoredAppEvent[]): FeatureRow[] {
  if (!events.length) return featureRows
  const grouped = new Map<string, StoredAppEvent[]>()
  for (const event of events) {
    const feature = event.feature_name ?? featureFromPath(event.page_path)
    grouped.set(feature, [...(grouped.get(feature) ?? []), event])
  }

  const rows = [...grouped.entries()].map(([feature, rows]) => {
    const uniqueUsers = new Set(rows.map((row) => row.user_id ?? row.anonymous_user_id)).size
    const completed = rows.filter((row) => row.event_name.includes('completed')).length
    const feedback = rows.filter((row) => row.event_name.includes('feedback')).length
    const completion = rows.length ? Math.min(100, (completed / rows.length) * 160) : 0
    const returnRate = Math.min(100, uniqueUsers > 0 ? (rows.length / uniqueUsers) * 12 : 0)
    return {
      feature,
      opens: rows.length,
      uniqueUsers,
      completion,
      returnRate,
      feedback,
      interest: Math.min(100, rows.length * 6 + completion * 0.35 + returnRate * 0.25 + feedback * 4),
      recommendation:
        completion < 30
          ? 'High friction. Inspect the user timeline around this action.'
          : returnRate > 35
            ? 'Strong repeat signal. Consider packaging as a retention loop.'
            : 'Watch for more volume before prioritizing.',
    }
  })

  return rows.sort((a, b) => b.interest - a.interest).slice(0, 6)
}

function aggregatePageRows(events: StoredAppEvent[]): PageRow[] {
  if (!events.length) return pageRows
  const grouped = new Map<string, StoredAppEvent[]>()
  for (const event of events) {
    grouped.set(event.page_path, [...(grouped.get(event.page_path) ?? []), event])
  }
  return [...grouped.entries()].map(([page, rows]) => ({
    page,
    views: rows.length,
    avgTime: `${Math.max(1, Math.round(rows.reduce((sum, row) => sum + (row.time_spent_seconds ?? 42), 0) / rows.length / 60))}m`,
    exitRate: Math.max(12, 68 - rows.length * 2),
    nextAction: rows.find((row) => row.event_name !== 'page_view')?.event_name ?? 'page_view',
    interest: Math.min(100, rows.length * 8),
  })).sort((a, b) => b.interest - a.interest).slice(0, 6)
}

export function AdminMonitorPage() {
  const [range, setRange] = useState<RangeFilter>('7 days')
  const [source, setSource] = useState<SourceFilter>('All')
  const [examTrack, setExamTrack] = useState<ExamFilter>('All')
  const [selectedNodeId, setSelectedNodeId] = useState('study')
  const [query, setQuery] = useState('')
  const [remoteEvents, setRemoteEvents] = useState<StoredAppEvent[]>([])
  const [localEvents, setLocalEvents] = useState<StoredAppEvent[]>(() => getLocalAppEvents())

  useEffect(() => {
    let cancelled = false
    void loadRecentAdminEvents().then((events) => {
      if (!cancelled) setRemoteEvents(events)
    })

    return () => {
      cancelled = true
    }
  }, [])

  const refreshData = () => {
    setLocalEvents(getLocalAppEvents())
    void loadRecentAdminEvents().then(setRemoteEvents)
  }

  const eventRows = remoteEvents.length ? remoteEvents : localEvents
  const liveUsers = usersFromEvents(eventRows)
  const userRows = liveUsers.length ? liveUsers : seededUsers
  const selectedNode = journeyNodes.find((node) => node.id === selectedNodeId) ?? journeyNodes[4]
  const dashboardFeatureRows = aggregateFeatureRows(eventRows)
  const dashboardPageRows = aggregatePageRows(eventRows)

  const filteredUsers = useMemo(
    () =>
      userRows.filter((user) => {
        const matchesSource = source === 'All' || user.source === source
        const matchesExam = examTrack === 'All' || user.examTrack === examTrack
        const matchesQuery =
          !query ||
          user.label.toLowerCase().includes(query.toLowerCase()) ||
          user.status.toLowerCase().includes(query.toLowerCase())
        return matchesSource && matchesExam && matchesQuery
      }),
    [examTrack, query, source, userRows],
  )

  const [selectedUserId, setSelectedUserId] = useState(userRows[0]?.id ?? seededUsers[0].id)
  const selectedUser = filteredUsers.find((user) => user.id === selectedUserId) ?? filteredUsers[0] ?? userRows[0]

  const totalUsers = filteredUsers.reduce((sum, user) => sum + user.activationScore, 0)
  const averageActivation = filteredUsers.length ? totalUsers / filteredUsers.length : 0
  const activatedCount = filteredUsers.filter((user) => user.activationScore >= 70).length
  const weakSpots = dashboardFeatureRows.filter((row) => row.completion < 40).length

  return (
    <div className="min-h-screen overflow-hidden bg-[#020812] text-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_20%_12%,rgba(34,211,238,0.18),transparent_30%),radial-gradient(circle_at_86%_14%,rgba(16,185,129,0.10),transparent_24%),linear-gradient(135deg,#04101f_0%,#061b2d_38%,#020812_100%)]" />
      <div className="pointer-events-none fixed inset-0 bg-[linear-gradient(90deg,rgba(125,211,252,0.06)_1px,transparent_1px),linear-gradient(180deg,rgba(125,211,252,0.045)_1px,transparent_1px)] bg-[length:64px_64px] opacity-45" />

      <div className="relative z-10 flex min-h-screen">
        <aside className="hidden w-[260px] shrink-0 border-r border-cyan-200/12 bg-[#04101f]/76 px-4 py-5 backdrop-blur-xl lg:block">
          <div className="rounded-[18px] border border-cyan-300/24 bg-cyan-300/8 p-4">
            <div className="flex items-center gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-2xl border border-cyan-200/30 bg-cyan-300/12">
                <ShieldCheck className="h-6 w-6 text-cyan-100" />
              </div>
              <div>
                <p className="text-sm font-black uppercase tracking-[0.14em]">Admin</p>
                <p className="text-xs text-cyan-100/58">Nurse Command</p>
              </div>
            </div>
          </div>
          <nav className="mt-6 space-y-1.5 text-sm">
            {[
              ['Overview', BarChart3],
              ['Acquisition', MousePointer2],
              ['Activation', Target],
              ['Users', Users],
              ['Feature Usage', Layers3],
              ['Retention', TimerReset],
              ['Content Quality', FileQuestion],
              ['Security', LockKeyhole],
            ].map(([label, Icon]) => (
              <button
                key={label as string}
                type="button"
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left font-semibold text-sky-100/68 transition hover:bg-white/7 hover:text-white"
              >
                <Icon className="h-4 w-4" />
                {label as string}
              </button>
            ))}
          </nav>
          <div className="mt-6 rounded-[18px] border border-emerald-300/20 bg-emerald-300/8 p-4 text-sm text-emerald-50/76">
            <div className="mb-2 flex items-center gap-2 font-black text-emerald-100">
              <Database className="h-4 w-4" />
              Data Mode
            </div>
            {remoteEvents.length ? 'Live Supabase app_events' : localEvents.length ? 'Local event buffer' : 'Seeded preview data'}
          </div>
        </aside>

        <main className="min-w-0 flex-1 px-4 py-4 md:px-6 lg:px-7">
          <header className="rounded-[24px] border border-cyan-200/16 bg-[#071d34]/72 p-4 shadow-[0_24px_70px_rgba(0,0,0,0.26)] backdrop-blur-xl">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-cyan-100/64">
                  <span>Admin Cockpit</span>
                  <span className="h-1 w-1 rounded-full bg-cyan-200/50" />
                  <span>Aggregate + User Activity</span>
                </div>
                <h1 className="mt-2 text-2xl font-black md:text-4xl">Public beta behavior monitor</h1>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <FilterGroup label="Range" value={range} items={dateRanges} onChange={setRange} />
                <FilterGroup label="Source" value={source} items={sources} onChange={setSource} />
                <FilterGroup label="Track" value={examTrack} items={examTracks} onChange={setExamTrack} />
                <button
                  type="button"
                  onClick={refreshData}
                  className="inline-flex h-10 items-center gap-2 rounded-xl border border-cyan-200/20 bg-cyan-300/10 px-3 text-sm font-bold text-cyan-100"
                >
                  <RefreshCw className="h-4 w-4" />
                  Refresh
                </button>
              </div>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <MetricCard icon={Users} label="Tracked users" value={String(filteredUsers.length)} detail={`${activatedCount} activated`} tone="info" />
              <MetricCard icon={Gauge} label="Avg activation" value={formatPercent(averageActivation)} detail="Onboarding + first value" tone="good" />
              <MetricCard icon={Clock3} label="Useful session" value="8-15m" detail={`${range} benchmark`} tone="watch" />
              <MetricCard icon={AlertTriangle} label="Weak spots" value={String(weakSpots)} detail="Completion below 40%" tone={weakSpots ? 'critical' : 'good'} />
            </div>
          </header>

          <section className="mt-4 grid gap-4 2xl:grid-cols-[minmax(280px,0.78fr)_minmax(520px,1.36fr)_minmax(280px,0.72fr)]">
            <Panel title="Acquisition Radar" icon={MousePointer2}>
              <div className="grid gap-3">
                {[
                  ['LinkedIn', 38, 'best feedback quality', 'good' as StatusTone],
                  ['Direct', 24, 'warm referrals', 'info' as StatusTone],
                  ['Google Ads', 19, 'watch activation cost', 'watch' as StatusTone],
                  ['Email', 11, 'paused: deliverability hold', 'critical' as StatusTone],
                  ['Organic', 8, 'small but engaged', 'info' as StatusTone],
                ].map(([label, value, detail, tone]) => (
                  <div key={label as string} className="rounded-2xl border border-sky-200/12 bg-white/[0.035] p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-bold">{label as string}</p>
                        <p className="text-xs text-sky-100/54">{detail as string}</p>
                      </div>
                      <StatusPill tone={tone as StatusTone}>{value as number}%</StatusPill>
                    </div>
                    <ProgressBar value={value as number} tone={tone as StatusTone} />
                  </div>
                ))}
              </div>
            </Panel>

            <Panel title="Learner Journey Map" icon={LineChart} action={selectedNode.action}>
              <div className="grid gap-3 md:grid-cols-4">
                {journeyNodes.map((node, index) => (
                  <button
                    key={node.id}
                    type="button"
                    onClick={() => setSelectedNodeId(node.id)}
                    className={`relative min-h-[132px] rounded-[18px] border p-3 text-left transition ${
                      selectedNodeId === node.id
                        ? 'border-cyan-200/70 bg-cyan-300/14 shadow-[0_0_32px_rgba(34,211,238,0.16)]'
                        : 'border-sky-200/12 bg-white/[0.035] hover:border-cyan-200/35'
                    }`}
                  >
                    <div className={`mb-3 h-2.5 w-2.5 rounded-full ${toneDotClass[node.tone]}`} />
                    <p className="min-h-[40px] text-sm font-black leading-5">{node.label}</p>
                    <div className="mt-3 flex items-end justify-between gap-2">
                      <div>
                        <p className="text-2xl font-black">{node.users}</p>
                        <p className="text-[11px] uppercase tracking-[0.14em] text-sky-100/45">users</p>
                      </div>
                      <StatusPill tone={node.tone}>{formatPercent(node.conversion)}</StatusPill>
                    </div>
                    {index < journeyNodes.length - 1 ? (
                      <ArrowRight className="absolute -right-3 top-1/2 hidden h-5 w-5 -translate-y-1/2 text-cyan-100/44 md:block" />
                    ) : null}
                  </button>
                ))}
              </div>
              <div className="mt-4 grid gap-3 rounded-[18px] border border-cyan-200/14 bg-[#04101f]/52 p-4 md:grid-cols-4">
                <DetailStat label="Selected step" value={selectedNode.label} />
                <DetailStat label="Drop-off" value={formatPercent(selectedNode.dropOff)} />
                <DetailStat label="Avg time" value={selectedNode.avgTime} />
                <DetailStat label="Strong source" value={selectedNode.source} />
              </div>
            </Panel>

            <Panel title="Live Ops Queue" icon={Activity}>
              <div className="space-y-3">
                {[
                  ['Deliverability hold active', 'Do not restart cold email until reset plan is complete.', 'critical' as StatusTone, AlertTriangle],
                  ['Privacy mode', 'Admin timeline excludes note body and uploaded document text.', 'good' as StatusTone, ShieldCheck],
                  ['GA4 later', 'Use GA4 for ads and aggregates, not user timelines.', 'info' as StatusTone, Sparkles],
                  ['Material upload friction', 'High curiosity but low completion signal.', 'watch' as StatusTone, UploadCloud],
                ].map(([title, detail, tone, Icon]) => (
                  <div key={title as string} className={`rounded-2xl border p-3 ${toneClass[tone as StatusTone]}`}>
                    <div className="flex gap-3">
                      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
                      <div>
                        <p className="text-sm font-black">{title as string}</p>
                        <p className="mt-1 text-xs leading-5 opacity-75">{detail as string}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Panel>
          </section>

          <section className="mt-4 grid gap-4 xl:grid-cols-[minmax(320px,0.85fr)_minmax(520px,1.15fr)]">
            <Panel title="User Activity Timeline" icon={Eye}>
              <div className="mb-3 flex items-center gap-2 rounded-2xl border border-sky-200/14 bg-[#04101f]/58 px-3 py-2">
                <Search className="h-4 w-4 text-sky-100/48" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search users or status"
                  className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-sky-100/38"
                />
              </div>
              <div className="grid gap-2">
                {filteredUsers.map((user) => (
                  <button
                    key={user.id}
                    type="button"
                    onClick={() => setSelectedUserId(user.id)}
                    className={`rounded-2xl border p-3 text-left transition ${
                      selectedUser?.id === user.id
                        ? 'border-cyan-200/60 bg-cyan-300/12'
                        : 'border-sky-200/12 bg-white/[0.035] hover:border-cyan-200/30'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-black">{user.label}</p>
                        <p className="text-xs text-sky-100/56">{user.status}</p>
                      </div>
                      <StatusPill tone={user.activationScore >= 70 ? 'good' : user.activationScore >= 45 ? 'watch' : 'critical'}>
                        {user.activationScore}
                      </StatusPill>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-sky-100/58">
                      <span>{user.examTrack}</span>
                      <span>{user.source}</span>
                      <span>{user.lastActive}</span>
                    </div>
                  </button>
                ))}
              </div>
            </Panel>

            <Panel
              title={selectedUser ? `${selectedUser.label} Session Detail` : 'Session Detail'}
              icon={Brain}
              action="Exact product behavior, with private notes/uploads excluded."
            >
              {selectedUser ? (
                <>
                  <div className="grid gap-3 md:grid-cols-4">
                    <DetailStat label="Exam track" value={selectedUser.examTrack} />
                    <DetailStat label="Source" value={selectedUser.source} />
                    <DetailStat label="Session time" value={`${selectedUser.sessionMinutes}m`} />
                    <DetailStat label="Last active" value={selectedUser.lastActive} />
                  </div>
                  <div className="mt-4 space-y-3">
                    {selectedUser.timeline.map((item, index) => (
                      <div key={`${item.time}-${item.event}-${index}`} className="grid grid-cols-[86px_18px_minmax(0,1fr)] gap-3">
                        <p className="pt-1 text-xs font-bold text-sky-100/50">{item.time}</p>
                        <div className="flex flex-col items-center">
                          <span className={`mt-1 h-3 w-3 rounded-full ${toneDotClass[item.tone]}`} />
                          {index < selectedUser.timeline.length - 1 ? <span className="mt-1 h-full w-px bg-sky-200/14" /> : null}
                        </div>
                        <div className="rounded-2xl border border-sky-200/12 bg-white/[0.035] p-3">
                          <p className="font-black">{item.event}</p>
                          <p className="mt-1 text-sm text-sky-100/62">{item.detail}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <p className="text-sm text-sky-100/60">No users match the current filters.</p>
              )}
            </Panel>
          </section>

          <section className="mt-4 grid gap-4 2xl:grid-cols-3">
            <Panel title="Feature Interest" icon={Zap}>
              <div className="space-y-3">
                {dashboardFeatureRows.map((row) => (
                  <div key={row.feature} className="rounded-2xl border border-sky-200/12 bg-white/[0.035] p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-black">{row.feature}</p>
                        <p className="text-xs text-sky-100/54">{row.recommendation}</p>
                      </div>
                      <p className="text-xl font-black">{Math.round(row.interest)}</p>
                    </div>
                    <div className="mt-3 grid grid-cols-4 gap-2 text-center text-xs text-sky-100/62">
                      <MiniMetric label="opens" value={row.opens} />
                      <MiniMetric label="users" value={row.uniqueUsers} />
                      <MiniMetric label="done" value={`${Math.round(row.completion)}%`} />
                      <MiniMetric label="return" value={`${Math.round(row.returnRate)}%`} />
                    </div>
                  </div>
                ))}
              </div>
            </Panel>

            <Panel title="Page Interest + Drop-Offs" icon={TrendingDown}>
              <div className="space-y-3">
                {dashboardPageRows.map((row) => (
                  <div key={row.page} className="rounded-2xl border border-sky-200/12 bg-white/[0.035] p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-black">{row.page}</p>
                        <p className="text-xs text-sky-100/54">Next: {row.nextAction}</p>
                      </div>
                      <StatusPill tone={row.exitRate > 50 ? 'critical' : row.exitRate > 35 ? 'watch' : 'good'}>
                        {row.exitRate}% exit
                      </StatusPill>
                    </div>
                    <ProgressBar value={row.interest} tone={row.exitRate > 50 ? 'critical' : 'info'} />
                  </div>
                ))}
              </div>
            </Panel>

            <Panel title="Build Priority" icon={TrendingUp}>
              <div className="space-y-3">
                {buildPriorities.map((priority) => (
                  <div key={priority.label} className={`rounded-2xl border p-3 ${toneClass[priority.tone]}`}>
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-black">{priority.label}</p>
                      <p className="text-2xl font-black">{priority.score}</p>
                    </div>
                    <p className="mt-2 text-sm leading-6 opacity-75">{priority.reason}</p>
                  </div>
                ))}
              </div>
            </Panel>
          </section>

          <section className="mt-4 grid gap-4 xl:grid-cols-3">
            <Panel title="Launch Benchmarks" icon={Target}>
              <Benchmark label="Onboarding + first action" value={42} target="40%+" tone="good" />
              <Benchmark label="Quiz starter completion" value={64} target="50%+" tone="good" />
              <Benchmark label="Weekly return" value={26} target="25-30%" tone="good" />
              <Benchmark label="Material upload adoption" value={7} target="10%+" tone="watch" />
            </Panel>
            <Panel title="Content Behavior" icon={BookOpenCheck}>
              <QueueRow label="High-confidence miss questions" value="18" detail="Prioritization and safety lead" tone="watch" />
              <QueueRow label="Flagged rationales" value="6" detail="Needs SME review before claims" tone="critical" />
              <QueueRow label="Rationale open rate" value="71%" detail="Good learning signal" tone="good" />
            </Panel>
            <Panel title="Security Status" icon={LockKeyhole}>
              <QueueRow label="Admin access" value="Gated" detail="Local preview or admin account required" tone="good" />
              <QueueRow label="Personal content" value="Excluded" detail="No note body or uploaded text in events" tone="good" />
              <QueueRow label="GA4" value="Later" detail="Use only aggregate events for ads" tone="info" />
            </Panel>
          </section>
        </main>
      </div>
    </div>
  )
}

function Panel({
  title,
  icon: Icon,
  action,
  children,
}: {
  title: string
  icon: React.ComponentType<{ className?: string }>
  action?: string
  children: React.ReactNode
}) {
  return (
    <section className="rounded-[24px] border border-cyan-200/14 bg-[#071d34]/72 p-4 shadow-[0_24px_70px_rgba(0,0,0,0.22),inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-xl">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-cyan-200/24 bg-cyan-300/10 text-cyan-100">
            <Icon className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h2 className="truncate text-lg font-black">{title}</h2>
            {action ? <p className="mt-1 text-xs leading-5 text-sky-100/54">{action}</p> : null}
          </div>
        </div>
      </div>
      {children}
    </section>
  )
}

function FilterGroup<T extends string>({
  label,
  value,
  items,
  onChange,
}: {
  label: string
  value: T
  items: T[]
  onChange: (value: T) => void
}) {
  return (
    <div className="flex items-center gap-1 rounded-xl border border-cyan-200/14 bg-[#04101f]/54 p-1">
      <span className="hidden px-2 text-[11px] font-black uppercase tracking-[0.12em] text-sky-100/42 sm:inline">
        {label}
      </span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value as T)}
        className="h-8 rounded-lg border-0 bg-transparent px-2 text-sm font-bold text-cyan-50 outline-none"
      >
        {items.map((item) => (
          <option key={item} value={item} className="bg-[#04101f] text-white">
            {item}
          </option>
        ))}
      </select>
    </div>
  )
}

function MetricCard({
  icon: Icon,
  label,
  value,
  detail,
  tone,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string
  detail: string
  tone: StatusTone
}) {
  return (
    <div className={`rounded-[18px] border p-3 ${toneClass[tone]}`}>
      <div className="flex items-center justify-between gap-3">
        <Icon className="h-5 w-5 opacity-80" />
        <p className="text-2xl font-black">{value}</p>
      </div>
      <p className="mt-2 text-sm font-black">{label}</p>
      <p className="mt-1 text-xs opacity-70">{detail}</p>
    </div>
  )
}

function StatusPill({ tone, children }: { tone: StatusTone; children: React.ReactNode }) {
  return (
    <span className={`inline-flex shrink-0 items-center rounded-full border px-2.5 py-1 text-xs font-black ${toneClass[tone]}`}>
      {children}
    </span>
  )
}

function ProgressBar({ value, tone }: { value: number; tone: StatusTone }) {
  const fillClass =
    tone === 'good'
      ? 'bg-emerald-300'
      : tone === 'watch'
        ? 'bg-amber-300'
        : tone === 'critical'
          ? 'bg-rose-300'
          : 'bg-cyan-300'

  return (
    <div className="mt-3 h-2 overflow-hidden rounded-full bg-sky-950/70">
      <div className={`h-full rounded-full ${fillClass}`} style={{ width: `${Math.max(4, Math.min(100, value))}%` }} />
    </div>
  )
}

function DetailStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <p className="text-[11px] font-black uppercase tracking-[0.14em] text-sky-100/42">{label}</p>
      <p className="mt-1 truncate text-sm font-black text-white">{value}</p>
    </div>
  )
}

function MiniMetric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-sky-200/10 bg-[#04101f]/44 px-2 py-2">
      <p className="font-black text-white">{value}</p>
      <p className="mt-1 uppercase tracking-[0.12em]">{label}</p>
    </div>
  )
}

function Benchmark({ label, value, target, tone }: { label: string; value: number; target: string; tone: StatusTone }) {
  return (
    <div className="mb-3 rounded-2xl border border-sky-200/12 bg-white/[0.035] p-3 last:mb-0">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-black">{label}</p>
          <p className="text-xs text-sky-100/54">Target {target}</p>
        </div>
        <StatusPill tone={tone}>{value}%</StatusPill>
      </div>
      <ProgressBar value={value} tone={tone} />
    </div>
  )
}

function QueueRow({ label, value, detail, tone }: { label: string; value: string; detail: string; tone: StatusTone }) {
  const Icon = tone === 'good' ? CheckCircle2 : tone === 'critical' ? AlertTriangle : tone === 'watch' ? Clock3 : Activity
  return (
    <div className="mb-3 flex items-center gap-3 rounded-2xl border border-sky-200/12 bg-white/[0.035] p-3 last:mb-0">
      <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-2xl border ${toneClass[tone]}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-3">
          <p className="truncate font-black">{label}</p>
          <p className="text-sm font-black text-cyan-100">{value}</p>
        </div>
        <p className="mt-1 text-xs text-sky-100/54">{detail}</p>
      </div>
    </div>
  )
}
