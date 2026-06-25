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
  Target,
  TimerReset,
  TrendingDown,
  Users,
  Zap,
  type LucideIcon,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import {
  getAdminDataAccessStatus,
  loadAdminProfiles,
  loadRecentAdminEvents,
  type AdminDataAccessStatus,
  type AdminProfileSummary,
} from '../services/admin-analytics'
import { getLocalAppEvents, type StoredAppEvent } from '../services/analytics-client'

type RangeFilter = 'Today' | '7 days' | '30 days' | '90 days'
type SourceFilter = 'All' | 'Google Ads' | 'LinkedIn' | 'Direct' | 'Email' | 'Organic' | 'Other'
type ExamFilter = 'All' | 'NCLEX-RN' | 'NCLEX-PN' | 'TEAS' | 'FNP' | 'CCMA' | 'Unknown'
type StatusTone = 'good' | 'watch' | 'critical' | 'info' | 'muted'
type AdminSectionId =
  | 'overview'
  | 'acquisition'
  | 'activation'
  | 'users'
  | 'feature-usage'
  | 'retention'
  | 'content-quality'
  | 'security'

interface AdminSection {
  id: AdminSectionId
  label: string
  segment: string
  icon: LucideIcon
  color: string
  description: string
}

interface JourneyStep {
  id: string
  label: string
  description: string
  users: number
  previousUsers: number
  conversion: number | null
  dropOff: number | null
  tone: StatusTone
}

interface SourceRow {
  source: SourceFilter
  users: number
  sessions: number
  events: number
  percentage: number
  lastSeen: number
}

interface CampaignRow {
  campaign: string
  source: SourceFilter
  users: number
  events: number
  lastSeen: number
}

interface PageRow {
  page: string
  users: number
  views: number
  events: number
  avgSeconds: number
  lastSeen: number
}

interface FeatureRow {
  feature: string
  users: number
  events: number
  starts: number
  completions: number
  failures: number
  lastSeen: number
}

interface UserRow {
  id: string
  label: string
  displayId: string
  displayName: string
  email: string | null
  examTrack: ExamFilter
  source: SourceFilter
  status: string
  presence: 'Online' | 'Idle' | 'Offline'
  currentPage: string
  events: number
  sessions: number
  sessionSeconds: number
  firstSeen: number
  lastActive: number
  journeySteps: number
  timeline: StoredAppEvent[]
}

interface CategoryRow {
  category: string
  answered: number
  correct: number
  incorrect: number
  highConfidenceMisses: number
}

interface DashboardModel {
  events: StoredAppEvent[]
  users: UserRow[]
  profileCount: number
  totalUsers: number
  totalSessions: number
  totalEvents: number
  activatedUsers: number
  activationRate: number
  avgSessionSeconds: number
  returningUsers: number
  returnRate: number
  highConfidenceMisses: number
  firstEvent: number | null
  lastEvent: number | null
  sourceRows: SourceRow[]
  campaignRows: CampaignRow[]
  journeySteps: JourneyStep[]
  pageRows: PageRow[]
  featureRows: FeatureRow[]
  categoryRows: CategoryRow[]
  questionAnswered: number
  correctAnswers: number
  incorrectAnswers: number
}

const dateRanges: RangeFilter[] = ['Today', '7 days', '30 days', '90 days']
const sources: SourceFilter[] = ['All', 'Google Ads', 'LinkedIn', 'Direct', 'Email', 'Organic', 'Other']
const examTracks: ExamFilter[] = ['All', 'NCLEX-RN', 'NCLEX-PN', 'TEAS', 'FNP', 'CCMA', 'Unknown']

const adminSections: AdminSection[] = [
  {
    id: 'overview',
    label: 'Overview',
    segment: '',
    icon: BarChart3,
    color: 'cyan',
    description: 'Real live-event summary',
  },
  {
    id: 'acquisition',
    label: 'Acquisition',
    segment: 'acquisition',
    icon: MousePointer2,
    color: 'violet',
    description: 'Sources, campaigns, first visits',
  },
  {
    id: 'activation',
    label: 'Activation',
    segment: 'activation',
    icon: Zap,
    color: 'emerald',
    description: 'First value and study actions',
  },
  {
    id: 'users',
    label: 'Users',
    segment: 'users',
    icon: Users,
    color: 'amber',
    description: 'Anonymous behavior timelines',
  },
  {
    id: 'feature-usage',
    label: 'Feature Usage',
    segment: 'feature-usage',
    icon: Layers3,
    color: 'sky',
    description: 'Feature opens and completions',
  },
  {
    id: 'retention',
    label: 'Retention',
    segment: 'retention',
    icon: TimerReset,
    color: 'teal',
    description: 'Return visits and repeat sessions',
  },
  {
    id: 'content-quality',
    label: 'Content Quality',
    segment: 'content-quality',
    icon: FileQuestion,
    color: 'rose',
    description: 'Question outcomes and confidence misses',
  },
  {
    id: 'security',
    label: 'Security',
    segment: 'security',
    icon: LockKeyhole,
    color: 'lime',
    description: 'Access, privacy, and data mode',
  },
]

const sectionStyles: Record<
  string,
  {
    nav: string
    panel: string
    text: string
    icon: string
    ring: string
    soft: string
  }
> = {
  cyan: {
    nav: 'border-cyan-200/75 bg-cyan-300/12 text-cyan-50 shadow-[0_0_28px_rgba(103,232,249,0.14)]',
    panel: 'border-cyan-300/24 bg-cyan-300/10',
    text: 'text-cyan-100',
    icon: 'border-cyan-300/40 bg-cyan-300/12 text-cyan-100',
    ring: 'ring-cyan-300/35',
    soft: 'bg-cyan-300/10 text-cyan-100',
  },
  violet: {
    nav: 'border-violet-200/75 bg-violet-400/12 text-violet-50 shadow-[0_0_28px_rgba(167,139,250,0.14)]',
    panel: 'border-violet-300/24 bg-violet-400/10',
    text: 'text-violet-100',
    icon: 'border-violet-300/40 bg-violet-400/12 text-violet-100',
    ring: 'ring-violet-300/35',
    soft: 'bg-violet-400/10 text-violet-100',
  },
  emerald: {
    nav: 'border-emerald-200/75 bg-emerald-400/12 text-emerald-50 shadow-[0_0_28px_rgba(52,211,153,0.14)]',
    panel: 'border-emerald-300/24 bg-emerald-400/10',
    text: 'text-emerald-100',
    icon: 'border-emerald-300/40 bg-emerald-400/12 text-emerald-100',
    ring: 'ring-emerald-300/35',
    soft: 'bg-emerald-400/10 text-emerald-100',
  },
  amber: {
    nav: 'border-amber-200/75 bg-amber-300/12 text-amber-50 shadow-[0_0_28px_rgba(252,211,77,0.14)]',
    panel: 'border-amber-300/24 bg-amber-300/10',
    text: 'text-amber-100',
    icon: 'border-amber-300/40 bg-amber-300/12 text-amber-100',
    ring: 'ring-amber-300/35',
    soft: 'bg-amber-300/10 text-amber-100',
  },
  sky: {
    nav: 'border-sky-200/75 bg-sky-400/12 text-sky-50 shadow-[0_0_28px_rgba(56,189,248,0.14)]',
    panel: 'border-sky-300/24 bg-sky-400/10',
    text: 'text-sky-100',
    icon: 'border-sky-300/40 bg-sky-400/12 text-sky-100',
    ring: 'ring-sky-300/35',
    soft: 'bg-sky-400/10 text-sky-100',
  },
  teal: {
    nav: 'border-teal-200/75 bg-teal-300/12 text-teal-50 shadow-[0_0_28px_rgba(45,212,191,0.14)]',
    panel: 'border-teal-300/24 bg-teal-300/10',
    text: 'text-teal-100',
    icon: 'border-teal-300/40 bg-teal-300/12 text-teal-100',
    ring: 'ring-teal-300/35',
    soft: 'bg-teal-300/10 text-teal-100',
  },
  rose: {
    nav: 'border-rose-200/75 bg-rose-400/12 text-rose-50 shadow-[0_0_28px_rgba(251,113,133,0.14)]',
    panel: 'border-rose-300/24 bg-rose-400/10',
    text: 'text-rose-100',
    icon: 'border-rose-300/40 bg-rose-400/12 text-rose-100',
    ring: 'ring-rose-300/35',
    soft: 'bg-rose-400/10 text-rose-100',
  },
  lime: {
    nav: 'border-lime-200/75 bg-lime-300/12 text-lime-50 shadow-[0_0_28px_rgba(190,242,100,0.14)]',
    panel: 'border-lime-300/24 bg-lime-300/10',
    text: 'text-lime-100',
    icon: 'border-lime-300/40 bg-lime-300/12 text-lime-100',
    ring: 'ring-lime-300/35',
    soft: 'bg-lime-300/10 text-lime-100',
  },
}

const toneStyles: Record<StatusTone, string> = {
  good: 'border-emerald-300/30 bg-emerald-400/10 text-emerald-100',
  watch: 'border-amber-300/30 bg-amber-300/10 text-amber-100',
  critical: 'border-rose-300/35 bg-rose-400/12 text-rose-100',
  info: 'border-cyan-300/30 bg-cyan-300/10 text-cyan-100',
  muted: 'border-slate-500/30 bg-slate-500/10 text-slate-200',
}

const activationEvents = new Set<string>([
  'signup_completed',
  'onboarding_completed',
  'quiz_started',
  'question_answered',
  'quiz_completed',
  'weak_area_opened',
  'study_plan_opened',
  'flashcard_reviewed',
  'material_upload_completed',
])

const studyEvents = new Set<string>([
  'quiz_started',
  'question_answered',
  'confidence_selected',
  'rationale_opened',
  'quiz_completed',
  'weak_area_opened',
  'study_plan_opened',
  'flashcard_reviewed',
])

const eventLabels: Record<string, string> = {
  page_view: 'Page viewed',
  demo_started: 'Demo started',
  signup_started: 'Signup started',
  signup_completed: 'Account created',
  onboarding_started: 'Onboarding started',
  onboarding_completed: 'Onboarding completed',
  exam_track_selected: 'Exam track selected',
  feature_opened: 'Feature opened',
  quiz_started: 'Quiz started',
  question_answered: 'Question answered',
  confidence_selected: 'Confidence selected',
  rationale_opened: 'Rationale opened',
  quiz_completed: 'Quiz completed',
  weak_area_opened: 'Weak area opened',
  study_plan_opened: 'Study plan opened',
  flashcard_reviewed: 'Flashcard reviewed',
  material_upload_started: 'Material upload started',
  material_upload_completed: 'Material upload completed',
  material_upload_failed: 'Material upload failed',
  note_created: 'Note created',
  feedback_opened: 'Feedback opened',
  feedback_submitted: 'Feedback submitted',
  pricing_viewed: 'Pricing viewed',
  external_cta_clicked: 'External CTA clicked',
}

const routeBasePath = () => {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '')
  return `${base}/admin`
}

const sectionFromLocation = () => {
  if (typeof window === 'undefined') return 'overview' as AdminSectionId
  const parts = window.location.pathname.split('/').filter(Boolean)
  const adminIndex = parts.indexOf('admin')
  const segment = adminIndex >= 0 ? parts[adminIndex + 1] ?? '' : ''
  return adminSections.find((section) => section.segment === segment)?.id ?? 'overview'
}

const sectionPath = (section: AdminSection) => {
  const base = routeBasePath()
  return section.segment ? `${base}/${section.segment}` : `${base}/`
}

const eventTime = (event: StoredAppEvent) => {
  const timestamp = new Date(event.created_at).getTime()
  return Number.isFinite(timestamp) ? timestamp : 0
}

const groupBy = <T,>(items: T[], getKey: (item: T) => string) => {
  const groups = new Map<string, T[]>()
  for (const item of items) {
    const key = getKey(item)
    groups.set(key, [...(groups.get(key) ?? []), item])
  }
  return groups
}

const actorKey = (event: StoredAppEvent) => event.user_id ?? event.anonymous_user_id ?? event.session_id

const cleanDisplayId = (value: string) => {
  const compact = value.replace(/^anon_/, '').replace(/^session_/, '')
  return compact.length > 10 ? compact.slice(0, 10) : compact
}

const formatExamTrack = (track: StoredAppEvent['exam_track']): ExamFilter => {
  if (!track) return 'Unknown'
  const normalized = track.toLowerCase()
  if (normalized === 'nclex-rn') return 'NCLEX-RN'
  if (normalized === 'nclex-pn') return 'NCLEX-PN'
  if (normalized === 'teas') return 'TEAS'
  if (normalized === 'fnp') return 'FNP'
  if (normalized === 'ccma') return 'CCMA'
  return 'Unknown'
}

const classifySource = (source: string | null): SourceFilter => {
  const value = (source ?? '').trim().toLowerCase()
  if (!value) return 'Direct'
  if (value.includes('google') || value.includes('gads') || value.includes('paid')) return 'Google Ads'
  if (value.includes('linkedin') || value.includes('linked in')) return 'LinkedIn'
  if (value.includes('email') || value.includes('gmail') || value.includes('newsletter')) return 'Email'
  if (value.includes('organic') || value.includes('search')) return 'Organic'
  if (value.includes('direct')) return 'Direct'
  return 'Other'
}

const featureFromEvent = (event: StoredAppEvent) => {
  if (event.feature_name) return event.feature_name
  if (event.page_path === '/') return 'Study Menu'
  return event.page_path
    .split('/')
    .filter(Boolean)
    .map((part) =>
      part
        .split('-')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' '),
    )
    .join(' / ') || 'Unknown feature'
}

const formatEventLabel = (eventName: string) =>
  eventLabels[eventName] ??
  eventName
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')

const safePercent = (part: number, total: number) => (total > 0 ? Math.round((part / total) * 100) : 0)

const formatDuration = (seconds: number) => {
  if (!Number.isFinite(seconds) || seconds <= 0) return '0m'
  if (seconds < 60) return `${Math.round(seconds)}s`
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  const remaining = minutes % 60
  return remaining ? `${hours}h ${remaining}m` : `${hours}h`
}

const formatClock = (timestamp: number | null) => {
  if (!timestamp) return 'Not recorded'
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(timestamp))
}

const formatRelative = (timestamp: number | null) => {
  if (!timestamp) return 'Not recorded'
  const diffSeconds = Math.max(0, Math.round((Date.now() - timestamp) / 1000))
  if (diffSeconds < 60) return `${diffSeconds}s ago`
  const minutes = Math.round(diffSeconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.round(minutes / 60)
  if (hours < 48) return `${hours}h ago`
  return `${Math.round(hours / 24)}d ago`
}

const formatPageName = (pagePath: string | null | undefined, featureName: string | null | undefined) => {
  if (featureName?.trim()) return featureName.trim()
  if (!pagePath || pagePath === '/') return 'Study Menu'
  return pagePath
    .split('/')
    .filter(Boolean)
    .map((part) =>
      part
        .split('-')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' '),
    )
    .join(' / ')
}

const formatPresence = (lastActive: number | null) => {
  if (!lastActive) return 'Offline'
  const minutes = Math.max(0, Math.round((Date.now() - lastActive) / 60000))
  if (minutes <= 5) return 'Online'
  if (minutes <= 30) return 'Idle'
  return 'Offline'
}

const formatCurrentPage = (pagePath: string | null | undefined, featureName: string | null | undefined) => {
  const label = formatPageName(pagePath, featureName)
  const path = pagePath?.trim() || '/'
  return `${label} (${path})`
}

const sessionSecondsForEvents = (events: StoredAppEvent[]) => {
  const times = events.map(eventTime).filter(Boolean)
  const spanSeconds =
    times.length > 1 ? Math.max(0, (Math.max(...times) - Math.min(...times)) / 1000) : 0
  const explicitSeconds = events.reduce((sum, event) => sum + (event.time_spent_seconds ?? 0), 0)
  return Math.max(spanSeconds, explicitSeconds)
}

const getRangeStart = (range: RangeFilter) => {
  const now = new Date()
  if (range === 'Today') {
    const start = new Date(now)
    start.setHours(0, 0, 0, 0)
    return start.getTime()
  }
  const days = range === '7 days' ? 7 : range === '30 days' ? 30 : 90
  return now.getTime() - days * 24 * 60 * 60 * 1000
}

const filterEvents = (
  events: StoredAppEvent[],
  range: RangeFilter,
  sourceFilter: SourceFilter,
  examFilter: ExamFilter,
) => {
  const rangeStart = getRangeStart(range)
  return events
    .filter((event) => eventTime(event) >= rangeStart)
    .filter((event) => !event.page_path.includes('/admin'))
    .filter((event) => sourceFilter === 'All' || classifySource(event.source) === sourceFilter)
    .filter((event) => examFilter === 'All' || formatExamTrack(event.exam_track) === examFilter)
}

const userStatus = (events: StoredAppEvent[]) => {
  const names = new Set(events.map((event) => event.event_name))
  if (names.has('quiz_completed')) return 'Quiz completed'
  if (names.has('question_answered')) return 'Answered questions'
  if (names.has('material_upload_completed')) return 'Uploaded material'
  if (names.has('onboarding_completed')) return 'Onboarded'
  if (names.has('signup_completed')) return 'Account created'
  if (events.some((event) => studyEvents.has(event.event_name))) return 'Started studying'
  if (names.has('feature_opened')) return 'Browsing features'
  return 'Visited'
}

const eventDetail = (event: StoredAppEvent) => {
  const parts = [
    event.feature_name,
    event.question_category,
    event.question_result ? `Result: ${event.question_result}` : null,
    event.confidence_level ? `Confidence: ${event.confidence_level}` : null,
    event.page_path ? `Path: ${event.page_path}` : null,
    event.source ? `Source: ${classifySource(event.source)}` : null,
  ].filter(Boolean)
  return parts.join(' | ') || 'No extra event fields'
}

const eventTone = (event: StoredAppEvent): StatusTone => {
  if (event.event_name.includes('failed')) return 'critical'
  if (event.question_result === 'incorrect' && event.confidence_level === 'high') return 'critical'
  if (event.event_name.includes('completed') || event.question_result === 'correct') return 'good'
  if (event.event_name.includes('started')) return 'watch'
  return 'info'
}

const buildJourney = (userGroups: Map<string, StoredAppEvent[]>, returningUsers: Set<string>) => {
  const countUsers = (match: (event: StoredAppEvent, userEvents: StoredAppEvent[]) => boolean) =>
    Array.from(userGroups.entries()).filter(([, userEvents]) =>
      userEvents.some((event) => match(event, userEvents)),
    ).length

  const definitions = [
    {
      id: 'traffic',
      label: 'Tracked visit',
      description: 'Any non-admin app event from the live website.',
      users: userGroups.size,
    },
    {
      id: 'landing',
      label: 'Page viewed',
      description: 'At least one page_view event.',
      users: countUsers((event) => event.event_name === 'page_view'),
    },
    {
      id: 'signup',
      label: 'Signup or demo',
      description: 'Started demo, signup, or account creation.',
      users: countUsers((event) =>
        ['demo_started', 'signup_started', 'signup_completed'].includes(event.event_name),
      ),
    },
    {
      id: 'onboarding',
      label: 'Onboarding',
      description: 'Started or completed exam/profile setup.',
      users: countUsers((event) =>
        ['onboarding_started', 'onboarding_completed', 'exam_track_selected'].includes(event.event_name),
      ),
    },
    {
      id: 'study',
      label: 'First study action',
      description: 'Quiz, question, flashcard, plan, or weak-area action.',
      users: countUsers((event) => studyEvents.has(event.event_name)),
    },
    {
      id: 'quiz',
      label: 'Quiz completed',
      description: 'Completed at least one quiz or practice session.',
      users: countUsers((event) => event.event_name === 'quiz_completed'),
    },
    {
      id: 'remediation',
      label: 'Remediation opened',
      description: 'Opened weak areas, rationales, or study plan after learning signal.',
      users: countUsers((event) =>
        ['weak_area_opened', 'rationale_opened', 'study_plan_opened'].includes(event.event_name),
      ),
    },
    {
      id: 'return',
      label: 'Returned later',
      description: 'Same anonymous/user key appeared in more than one session.',
      users: returningUsers.size,
    },
  ]

  return definitions.map<JourneyStep>((step, index) => {
    const previousUsers = index === 0 ? step.users : definitions[index - 1].users
    const conversion = index === 0 ? 100 : previousUsers > 0 ? safePercent(step.users, previousUsers) : null
    const dropOff = conversion === null ? null : 100 - conversion
    const tone: StatusTone =
      step.users === 0 ? 'muted' : conversion === null ? 'muted' : conversion >= 70 ? 'good' : conversion >= 35 ? 'watch' : 'critical'
    return {
      ...step,
      previousUsers,
      conversion,
      dropOff,
      tone,
    }
  })
}

const buildModel = (events: StoredAppEvent[], profilesById: Map<string, AdminProfileSummary>): DashboardModel => {
  const sortedEvents = [...events].sort((a, b) => eventTime(b) - eventTime(a))
  const userGroups = groupBy(sortedEvents, actorKey)
  const sessionGroups = groupBy(sortedEvents, (event) => event.session_id)
  const totalUsers = userGroups.size
  const totalSessions = sessionGroups.size
  const totalEvents = sortedEvents.length
  const sessionSeconds = Array.from(sessionGroups.values()).map(sessionSecondsForEvents)
  const avgSessionSeconds =
    sessionSeconds.length > 0 ? sessionSeconds.reduce((sum, seconds) => sum + seconds, 0) / sessionSeconds.length : 0

  const returningUserKeys = new Set(
    Array.from(userGroups.entries())
      .filter(([, rows]) => new Set(rows.map((event) => event.session_id)).size > 1)
      .map(([key]) => key),
  )

  const users = Array.from(userGroups.entries())
    .map<UserRow>(([key, rows], index) => {
      const userEvents = [...rows].sort((a, b) => eventTime(b) - eventTime(a))
      const firstSeen = Math.min(...userEvents.map(eventTime))
      const lastActive = Math.max(...userEvents.map(eventTime))
      const sessions = new Set(userEvents.map((event) => event.session_id))
      const profile = profilesById.get(key)
      const email = profile?.email?.trim() || null
      const displayName =
        profile?.name?.trim() ||
        email ||
        `Learner ${index + 1}`
      const activatedSteps = [
        userEvents.some((event) => ['demo_started', 'signup_started', 'signup_completed'].includes(event.event_name)),
        userEvents.some((event) =>
          ['onboarding_started', 'onboarding_completed', 'exam_track_selected'].includes(event.event_name),
        ),
        userEvents.some((event) => studyEvents.has(event.event_name)),
        userEvents.some((event) => event.event_name === 'quiz_completed'),
        returningUserKeys.has(key),
      ].filter(Boolean).length
      const firstSource = classifySource(userEvents[userEvents.length - 1]?.source ?? null)
      const firstTrack =
        userEvents.find((event) => event.exam_track)?.exam_track ?? userEvents[userEvents.length - 1]?.exam_track ?? null
      const mostRecent = userEvents[0]
      return {
        id: key,
        label: displayName,
        displayId: cleanDisplayId(key),
        displayName,
        email,
        examTrack: formatExamTrack(firstTrack),
        source: firstSource,
        status: userStatus(userEvents),
        presence: formatPresence(lastActive),
        currentPage: formatCurrentPage(mostRecent?.page_path, mostRecent?.feature_name),
        events: userEvents.length,
        sessions: sessions.size,
        sessionSeconds: sessionSecondsForEvents(userEvents),
        firstSeen,
        lastActive,
        journeySteps: activatedSteps,
        timeline: userEvents,
      }
    })
    .sort((a, b) => b.lastActive - a.lastActive)

  const activatedUsers = users.filter((user) =>
    user.timeline.some((event) => activationEvents.has(event.event_name)),
  ).length

  const sourceRows = Array.from(groupBy(sortedEvents, (event) => classifySource(event.source)).entries())
    .map<SourceRow>(([source, rows]) => ({
      source: source as SourceFilter,
      users: new Set(rows.map(actorKey)).size,
      sessions: new Set(rows.map((event) => event.session_id)).size,
      events: rows.length,
      percentage: safePercent(new Set(rows.map(actorKey)).size, Math.max(1, totalUsers)),
      lastSeen: Math.max(...rows.map(eventTime)),
    }))
    .sort((a, b) => b.users - a.users || b.events - a.events)

  const campaignRows = Array.from(
    groupBy(
      sortedEvents.filter((event) => event.campaign),
      (event) => event.campaign ?? 'Unlabeled campaign',
    ).entries(),
  )
    .map<CampaignRow>(([campaign, rows]) => ({
      campaign,
      source: classifySource(rows[0]?.source ?? null),
      users: new Set(rows.map(actorKey)).size,
      events: rows.length,
      lastSeen: Math.max(...rows.map(eventTime)),
    }))
    .sort((a, b) => b.users - a.users || b.events - a.events)

  const pageRows = Array.from(groupBy(sortedEvents, (event) => event.page_path || '/').entries())
    .map<PageRow>(([page, rows]) => {
      const explicitSeconds = rows
        .map((event) => event.time_spent_seconds ?? 0)
        .filter((seconds) => seconds > 0)
      return {
        page,
        users: new Set(rows.map(actorKey)).size,
        views: rows.filter((event) => event.event_name === 'page_view').length,
        events: rows.length,
        avgSeconds:
          explicitSeconds.length > 0
            ? explicitSeconds.reduce((sum, seconds) => sum + seconds, 0) / explicitSeconds.length
            : 0,
        lastSeen: Math.max(...rows.map(eventTime)),
      }
    })
    .sort((a, b) => b.events - a.events)

  const featureRows = Array.from(groupBy(sortedEvents, featureFromEvent).entries())
    .map<FeatureRow>(([feature, rows]) => ({
      feature,
      users: new Set(rows.map(actorKey)).size,
      events: rows.length,
      starts: rows.filter((event) => event.event_name.includes('started')).length,
      completions: rows.filter((event) => event.event_name.includes('completed')).length,
      failures: rows.filter((event) => event.event_name.includes('failed')).length,
      lastSeen: Math.max(...rows.map(eventTime)),
    }))
    .sort((a, b) => b.users - a.users || b.events - a.events)

  const questionEvents = sortedEvents.filter((event) => event.event_name === 'question_answered')
  const categoryRows = Array.from(
    groupBy(questionEvents, (event) => event.question_category ?? 'Uncategorized').entries(),
  )
    .map<CategoryRow>(([category, rows]) => ({
      category,
      answered: rows.length,
      correct: rows.filter((event) => event.question_result === 'correct').length,
      incorrect: rows.filter((event) => event.question_result === 'incorrect').length,
      highConfidenceMisses: rows.filter(
        (event) => event.question_result === 'incorrect' && event.confidence_level === 'high',
      ).length,
    }))
    .sort((a, b) => b.highConfidenceMisses - a.highConfidenceMisses || b.answered - a.answered)

  const firstEvent = sortedEvents.length ? Math.min(...sortedEvents.map(eventTime)) : null
  const lastEvent = sortedEvents.length ? Math.max(...sortedEvents.map(eventTime)) : null
  const highConfidenceMisses = questionEvents.filter(
    (event) => event.question_result === 'incorrect' && event.confidence_level === 'high',
  ).length

  return {
    events: sortedEvents,
    users,
    profileCount: profilesById.size,
    totalUsers,
    totalSessions,
    totalEvents,
    activatedUsers,
    activationRate: safePercent(activatedUsers, totalUsers),
    avgSessionSeconds,
    returningUsers: returningUserKeys.size,
    returnRate: safePercent(returningUserKeys.size, totalUsers),
    highConfidenceMisses,
    firstEvent,
    lastEvent,
    sourceRows,
    campaignRows,
    journeySteps: buildJourney(userGroups, returningUserKeys),
    pageRows,
    featureRows,
    categoryRows,
    questionAnswered: questionEvents.length,
    correctAnswers: questionEvents.filter((event) => event.question_result === 'correct').length,
    incorrectAnswers: questionEvents.filter((event) => event.question_result === 'incorrect').length,
  }
}

function AdminPanelShell({
  children,
  activeSection,
  setActiveSection,
  dataMode,
  totalEvents,
  loading,
  refresh,
  lastRefresh,
}: {
  children: React.ReactNode
  activeSection: AdminSection
  setActiveSection: (sectionId: AdminSectionId) => void
  dataMode: string
  totalEvents: number
  loading: boolean
  refresh: () => void
  lastRefresh: Date | null
}) {
  const activeStyle = sectionStyles[activeSection.color]

  return (
    <main className="min-h-screen overflow-hidden bg-[#030c18] text-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_16%_12%,rgba(34,211,238,0.12),transparent_32%),radial-gradient(circle_at_82%_0%,rgba(167,139,250,0.1),transparent_28%),linear-gradient(135deg,rgba(5,28,47,0.95),rgba(3,12,24,1)_52%,rgba(1,8,18,1))]" />
      <div className="relative flex min-h-screen">
        <aside className="hidden w-[260px] shrink-0 border-r border-cyan-200/10 bg-[#02101f]/92 px-4 py-5 xl:block">
          <div className="mb-5 rounded-3xl border border-cyan-300/24 bg-cyan-300/10 p-4">
            <div className="flex items-center gap-3">
              <div className="grid h-12 w-12 place-items-center rounded-2xl border border-cyan-200/30 bg-cyan-200/10 text-cyan-100">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-black uppercase tracking-[0.14em] text-white">Admin</p>
                <p className="text-xs font-bold text-cyan-100/70">Nurse Command</p>
              </div>
            </div>
          </div>

          <nav className="space-y-2">
            {adminSections.map((section) => {
              const Icon = section.icon
              const isActive = activeSection.id === section.id
              const style = sectionStyles[section.color]
              return (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => setActiveSection(section.id)}
                  className={`group flex w-full items-center gap-3 rounded-2xl border px-3 py-3 text-left transition ${
                    isActive
                      ? style.nav
                      : 'border-transparent bg-transparent text-slate-400 hover:border-white/10 hover:bg-white/[0.04] hover:text-white'
                  }`}
                >
                  <Icon className={`h-4 w-4 ${isActive ? style.text : 'text-slate-500 group-hover:text-white'}`} />
                  <span className="min-w-0">
                    <span className="block text-sm font-extrabold">{section.label}</span>
                    <span className="block truncate text-[11px] font-bold text-current/55">
                      {section.description}
                    </span>
                  </span>
                </button>
              )
            })}
          </nav>

          <div className="mt-5 rounded-3xl border border-emerald-300/20 bg-emerald-300/10 p-4">
            <div className="flex items-center gap-2 text-emerald-100">
              <Database className="h-4 w-4" />
            <p className="text-xs font-black uppercase tracking-[0.14em]">Data Mode</p>
          </div>
          <p className="mt-2 text-sm font-black text-white">{dataMode}</p>
          <p className="mt-1 text-xs font-bold text-emerald-100/65">{totalEvents} event rows visible</p>
        </div>
        </aside>

        <section className="min-w-0 flex-1 px-4 py-5 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-[1720px]">
            <div className="mb-5 flex flex-col gap-4 rounded-[28px] border border-cyan-200/12 bg-[#041628]/80 p-4 shadow-2xl shadow-black/30 backdrop-blur lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className={`text-xs font-black uppercase tracking-[0.22em] ${activeStyle.text}`}>
                  Admin cockpit / {activeSection.label}
                </p>
                <h1 className="mt-2 text-3xl font-black tracking-normal text-white sm:text-4xl">
                  Public beta behavior monitor
                </h1>
                <p className="mt-2 max-w-3xl text-sm font-bold leading-6 text-slate-300">
                  Real analytics only. Empty panels mean the live website has not produced that event yet.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <span className={`rounded-2xl border px-4 py-3 text-sm font-black ${activeStyle.panel}`}>
                  {dataMode}
                </span>
                <button
                  type="button"
                  onClick={refresh}
                  className="inline-flex items-center gap-2 rounded-2xl border border-cyan-200/20 bg-cyan-300/10 px-4 py-3 text-sm font-black text-cyan-50 transition hover:border-cyan-200/55 hover:bg-cyan-300/18"
                >
                  <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
              </div>
            </div>

            <div className="mb-5 flex flex-col gap-3 rounded-[24px] border border-white/10 bg-[#061628]/70 p-3 lg:hidden">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {adminSections.map((section) => {
                  const Icon = section.icon
                  const isActive = activeSection.id === section.id
                  const style = sectionStyles[section.color]
                  return (
                    <button
                      key={section.id}
                      type="button"
                      onClick={() => setActiveSection(section.id)}
                      className={`flex items-center gap-2 rounded-2xl border px-3 py-3 text-sm font-black transition ${
                        isActive
                          ? style.nav
                          : 'border-white/10 bg-white/[0.03] text-slate-300 hover:bg-white/[0.06]'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      {section.label}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="mb-5 flex flex-wrap items-center gap-2 text-xs font-bold text-slate-400">
              <span>Last refresh: {lastRefresh ? lastRefresh.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : 'not loaded'}</span>
              <span className="text-slate-600">/</span>
              <span>Source: Supabase app_events</span>
              <span className="text-slate-600">/</span>
              <span>No seeded preview data</span>
            </div>

            {children}
          </div>
        </section>
      </div>
    </main>
  )
}

function FilterBar({
  range,
  setRange,
  source,
  setSource,
  track,
  setTrack,
}: {
  range: RangeFilter
  setRange: (value: RangeFilter) => void
  source: SourceFilter
  setSource: (value: SourceFilter) => void
  track: ExamFilter
  setTrack: (value: ExamFilter) => void
}) {
  return (
    <div className="mb-5 grid gap-3 rounded-[24px] border border-cyan-200/12 bg-[#041628]/76 p-3 sm:grid-cols-3">
      <FilterSelect label="Range" value={range} options={dateRanges} onChange={(value) => setRange(value as RangeFilter)} />
      <FilterSelect label="Source" value={source} options={sources} onChange={(value) => setSource(value as SourceFilter)} />
      <FilterSelect label="Track" value={track} options={examTracks} onChange={(value) => setTrack(value as ExamFilter)} />
    </div>
  )
}

function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: string
  options: string[]
  onChange: (value: string) => void
}) {
  return (
    <label className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-[#020d1b] px-4 py-3">
      <span className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="min-w-0 flex-1 bg-transparent text-right text-sm font-black text-white outline-none"
      >
        {options.map((option) => (
          <option key={option} value={option} className="bg-[#04101f] text-white">
            {option}
          </option>
        ))}
      </select>
    </label>
  )
}

function KpiCard({
  icon: Icon,
  title,
  value,
  detail,
  tone,
}: {
  icon: LucideIcon
  title: string
  value: string
  detail: string
  tone: StatusTone
}) {
  return (
    <article className={`rounded-[24px] border p-4 ${toneStyles[tone]}`}>
      <div className="flex items-start justify-between gap-4">
        <Icon className="h-5 w-5 shrink-0 opacity-90" />
        <p className="text-3xl font-black leading-none text-white">{value}</p>
      </div>
      <p className="mt-5 text-sm font-black text-white">{title}</p>
      <p className="mt-1 text-xs font-bold leading-5 text-current/70">{detail}</p>
    </article>
  )
}

function Panel({
  title,
  subtitle,
  icon: Icon,
  section,
  children,
  className = '',
}: {
  title: string
  subtitle?: string
  icon: LucideIcon
  section: AdminSection
  children: React.ReactNode
  className?: string
}) {
  const style = sectionStyles[section.color]
  return (
    <section className={`rounded-[28px] border border-cyan-200/12 bg-[#041628]/86 p-4 shadow-xl shadow-black/20 ${className}`}>
      <div className="mb-4 flex items-start gap-3">
        <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-2xl border ${style.icon}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-xl font-black text-white">{title}</h2>
          {subtitle ? <p className="mt-1 text-sm font-bold text-slate-400">{subtitle}</p> : null}
        </div>
      </div>
      {children}
    </section>
  )
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-3xl border border-dashed border-slate-500/35 bg-slate-950/30 p-6 text-center">
      <div className="mx-auto mb-3 grid h-11 w-11 place-items-center rounded-2xl border border-slate-500/30 bg-slate-500/10 text-slate-300">
        <Database className="h-5 w-5" />
      </div>
      <p className="text-base font-black text-white">{title}</p>
      <p className="mt-2 text-sm font-bold leading-6 text-slate-400">{body}</p>
    </div>
  )
}

function Meter({ value, color = 'bg-cyan-300' }: { value: number; color?: string }) {
  return (
    <div className="h-2 overflow-hidden rounded-full bg-slate-800">
      <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  )
}

function OverviewPage({
  model,
  section,
  dataAccess,
}: {
  model: DashboardModel
  section: AdminSection
  dataAccess: AdminDataAccessStatus | null
}) {
  return (
    <div className="space-y-5">
      <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-4">
        <KpiCard
          icon={Users}
          title="Tracked users"
          value={model.totalUsers.toString()}
          detail={`${model.activatedUsers} activated from live events`}
          tone={model.totalUsers ? 'info' : 'muted'}
        />
        <KpiCard
          icon={Gauge}
          title="Activation rate"
          value={`${model.activationRate}%`}
          detail="Activated means study, onboarding, account, or remediation event"
          tone={model.activationRate >= 40 ? 'good' : model.totalUsers ? 'watch' : 'muted'}
        />
        <KpiCard
          icon={Clock3}
          title="Avg session"
          value={formatDuration(model.avgSessionSeconds)}
          detail="Computed from session span or explicit time_spent_seconds"
          tone={model.avgSessionSeconds >= 480 ? 'good' : model.totalSessions ? 'watch' : 'muted'}
        />
        <KpiCard
          icon={AlertTriangle}
          title="High-confidence misses"
          value={model.highConfidenceMisses.toString()}
          detail="Incorrect answers where confidence was high"
          tone={model.highConfidenceMisses ? 'critical' : model.questionAnswered ? 'good' : 'muted'}
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-[0.9fr_1.4fr_0.8fr]">
        <Panel title="Acquisition Reality" subtitle="Actual source values from app_events." icon={MousePointer2} section={section}>
          {model.sourceRows.length ? (
            <div className="space-y-3">
              {model.sourceRows.slice(0, 6).map((row) => (
                <div key={row.source} className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <div>
                      <p className="font-black text-white">{row.source}</p>
                      <p className="text-xs font-bold text-slate-400">
                        {row.users} users / {row.events} events
                      </p>
                    </div>
                    <span className="rounded-full border border-cyan-200/20 bg-cyan-300/10 px-3 py-1 text-xs font-black text-cyan-100">
                      {row.percentage}%
                    </span>
                  </div>
                  <Meter value={row.percentage} color="bg-cyan-300" />
                </div>
              ))}
            </div>
          ) : (
            <EmptyState title="No acquisition events yet" body="When someone visits the live website, the source mix will appear here." />
          )}
        </Panel>

        <Panel title="Learner Journey Map" subtitle="Each step is counted from live user/session events." icon={LineChart} section={section}>
          {model.journeySteps.length ? (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {model.journeySteps.map((step) => (
                <div key={step.id} className={`rounded-3xl border p-4 ${toneStyles[step.tone]}`}>
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <span className="h-2.5 w-2.5 rounded-full bg-current" />
                    {step.conversion !== null ? (
                      <span className="rounded-full border border-white/15 bg-black/20 px-2 py-1 text-xs font-black">
                        {step.conversion}%
                      </span>
                    ) : null}
                  </div>
                  <p className="text-sm font-black text-white">{step.label}</p>
                  <p className="mt-3 text-3xl font-black text-white">{step.users}</p>
                  <p className="text-[11px] font-black uppercase tracking-[0.14em] text-current/55">users</p>
                  <p className="mt-3 min-h-[40px] text-xs font-bold leading-5 text-current/70">{step.description}</p>
                  <div className="mt-3 flex items-center gap-2 text-xs font-bold text-current/65">
                    <TrendingDown className="h-3.5 w-3.5" />
                    <span>{step.dropOff === null ? 'No previous step' : `${step.dropOff}% drop-off from prior step`}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState title="No journey yet" body="The app has not recorded any live user behavior inside this filter." />
          )}
        </Panel>

        <Panel title="Live Truth" subtitle="What the panel knows right now." icon={Activity} section={section}>
          <div className="space-y-3">
            <StatusCard
              tone={!dataAccess?.signedIn || dataAccess?.isAdmin === false ? 'watch' : model.totalEvents ? 'good' : 'muted'}
              title={
                !dataAccess?.signedIn
                  ? 'Admin sign-in needed for live rows'
                  : dataAccess.isAdmin === false
                    ? 'Admin role needed for live rows'
                  : model.totalEvents
                    ? 'Live events loaded'
                    : 'No live events in this filter'
              }
              body={
                !dataAccess?.signedIn
                  ? 'The pass key opens the cockpit, but Supabase only releases app_events to a signed-in admin session.'
                  : dataAccess.isAdmin === false
                    ? `${dataAccess.email ?? 'This account'} is signed in, but Supabase does not report an active admin role.`
                  : `${model.totalEvents} event rows, ${model.totalSessions} sessions, ${model.totalUsers} users.`
              }
            />
            <StatusCard
              tone="info"
              title="No seeded data"
              body="Hard-coded dashboard numbers have been removed from this admin panel."
            />
            <StatusCard
              tone="good"
              title="Private content excluded"
              body="Timeline details show behavior fields only, not notes, uploads, passwords, or emails."
            />
            <StatusCard
              tone={model.lastEvent ? 'info' : 'muted'}
              title="Latest event"
              body={model.lastEvent ? `${formatClock(model.lastEvent)} (${formatRelative(model.lastEvent)})` : 'Not recorded yet.'}
            />
          </div>
        </Panel>
      </div>
    </div>
  )
}

function StatusCard({ tone, title, body }: { tone: StatusTone; title: string; body: string }) {
  return (
    <div className={`rounded-2xl border p-4 ${toneStyles[tone]}`}>
      <p className="text-sm font-black text-white">{title}</p>
      <p className="mt-1 text-xs font-bold leading-5 text-current/70">{body}</p>
    </div>
  )
}

function AcquisitionPage({ model, section }: { model: DashboardModel; section: AdminSection }) {
  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_1.2fr]">
      <Panel title="Sources" subtitle="Grouped by utm_source/source captured in app_events." icon={MousePointer2} section={section}>
        {model.sourceRows.length ? (
          <div className="space-y-3">
            {model.sourceRows.map((row) => (
              <div key={row.source} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-lg font-black text-white">{row.source}</p>
                    <p className="mt-1 text-sm font-bold text-slate-400">
                      {row.users} users, {row.sessions} sessions, {row.events} events
                    </p>
                  </div>
                  <span className="rounded-full border border-violet-200/25 bg-violet-400/10 px-3 py-1 text-sm font-black text-violet-100">
                    {row.percentage}%
                  </span>
                </div>
                <div className="mt-4">
                  <Meter value={row.percentage} color="bg-violet-300" />
                </div>
                <p className="mt-3 text-xs font-bold text-slate-500">Last seen {formatRelative(row.lastSeen)}</p>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState title="No source data yet" body="Open the public app from a live URL and this will populate from real events." />
        )}
      </Panel>

      <div className="space-y-5">
        <Panel title="Campaigns" subtitle="Only real campaign values appear here." icon={Target} section={section}>
          {model.campaignRows.length ? (
            <DataTable
              columns={['Campaign', 'Source', 'Users', 'Events', 'Last seen']}
              rows={model.campaignRows.map((row) => [
                row.campaign,
                row.source,
                row.users.toString(),
                row.events.toString(),
                formatRelative(row.lastSeen),
              ])}
            />
          ) : (
            <EmptyState title="No campaign data yet" body="Add UTM campaign links when ads or posts go live, then this table becomes useful." />
          )}
        </Panel>

        <Panel title="Landing Pages" subtitle="Page paths and page_view counts from live events." icon={Eye} section={section}>
          {model.pageRows.length ? (
            <DataTable
              columns={['Page', 'Users', 'Views', 'Events', 'Avg time']}
              rows={model.pageRows.slice(0, 12).map((row) => [
                row.page,
                row.users.toString(),
                row.views.toString(),
                row.events.toString(),
                formatDuration(row.avgSeconds),
              ])}
            />
          ) : (
            <EmptyState title="No page behavior yet" body="No page_view events were found for this filter." />
          )}
        </Panel>
      </div>
    </div>
  )
}

function ActivationPage({ model, section }: { model: DashboardModel; section: AdminSection }) {
  return (
    <div className="space-y-5">
      <div className="grid gap-3 md:grid-cols-3">
        <KpiCard
          icon={Zap}
          title="Activated users"
          value={model.activatedUsers.toString()}
          detail="A real study, onboarding, account, or remediation event"
          tone={model.activatedUsers ? 'good' : 'muted'}
        />
        <KpiCard
          icon={BookOpenCheck}
          title="Question answers"
          value={model.questionAnswered.toString()}
          detail="Actual question_answered event rows"
          tone={model.questionAnswered ? 'info' : 'muted'}
        />
        <KpiCard
          icon={CheckCircle2}
          title="Quiz completions"
          value={model.events.filter((event) => event.event_name === 'quiz_completed').length.toString()}
          detail="Actual quiz_completed event rows"
          tone={model.events.some((event) => event.event_name === 'quiz_completed') ? 'good' : 'muted'}
        />
      </div>

      <Panel title="Activation Journey" subtitle="Live user counts by behavioral step." icon={LineChart} section={section}>
        {model.journeySteps.length ? (
          <div className="space-y-3">
            {model.journeySteps.map((step, index) => (
              <div key={step.id} className="grid gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4 lg:grid-cols-[1fr_auto_1fr] lg:items-center">
                <div>
                  <p className="font-black text-white">{step.label}</p>
                  <p className="mt-1 text-sm font-bold text-slate-400">{step.description}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`rounded-full border px-3 py-1 text-sm font-black ${toneStyles[step.tone]}`}>
                    {step.users} users
                  </span>
                  {index < model.journeySteps.length - 1 ? <ArrowRight className="hidden h-4 w-4 text-slate-500 lg:block" /> : null}
                </div>
                <div>
                  <div className="flex items-center justify-between text-xs font-black uppercase tracking-[0.14em] text-slate-500">
                    <span>Conversion</span>
                    <span>{step.conversion === null ? 'n/a' : `${step.conversion}%`}</span>
                  </div>
                  <div className="mt-2">
                    <Meter value={step.conversion ?? 0} color="bg-emerald-300" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState title="No activation data yet" body="The live app has not recorded activation events for this filter." />
        )}
      </Panel>
    </div>
  )
}

function UsersPage({ model, section }: { model: DashboardModel; section: AdminSection }) {
  const [search, setSearch] = useState('')
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const filteredUsers = useMemo(() => {
    const needle = search.trim().toLowerCase()
    if (!needle) return model.users
    return model.users.filter((user) =>
      [user.label, user.displayName, user.email ?? '', user.displayId, user.source, user.examTrack, user.status]
        .join(' ')
        .toLowerCase()
        .includes(needle),
    )
  }, [model.users, search])
  const selectedUser = filteredUsers.find((user) => user.id === selectedUserId) ?? filteredUsers[0] ?? null

  useEffect(() => {
    if (!selectedUserId && filteredUsers[0]) setSelectedUserId(filteredUsers[0].id)
  }, [filteredUsers, selectedUserId])

  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_1.05fr]">
      <Panel title="Learners" subtitle={`${model.profileCount} named profiles linked from the live app.`} icon={Users} section={section}>
        <label className="mb-4 flex items-center gap-3 rounded-2xl border border-white/10 bg-[#020d1b] px-4 py-3">
          <Search className="h-4 w-4 text-slate-500" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search users, source, track, status"
            className="min-w-0 flex-1 bg-transparent text-sm font-bold text-white outline-none placeholder:text-slate-500"
          />
        </label>

        {filteredUsers.length ? (
          <div className="space-y-3">
            {filteredUsers.map((user) => (
              <button
                key={user.id}
                type="button"
                onClick={() => setSelectedUserId(user.id)}
                className={`w-full rounded-2xl border p-4 text-left transition ${
                  selectedUser?.id === user.id
                    ? 'border-amber-200/70 bg-amber-300/10'
                    : 'border-white/10 bg-white/[0.03] hover:border-amber-200/35 hover:bg-white/[0.055]'
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-black text-white">{user.displayName}</p>
                    <p className="mt-1 text-xs font-bold text-slate-500">
                      {user.examTrack} · ID ending {user.displayId}
                    </p>
                    {user.email ? <p className="mt-1 text-xs font-bold text-cyan-100/75">{user.email}</p> : null}
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span
                      className={`rounded-full border px-3 py-1 text-xs font-black ${
                        user.presence === 'Online'
                          ? 'border-emerald-200/30 bg-emerald-300/12 text-emerald-100'
                          : user.presence === 'Idle'
                            ? 'border-amber-200/30 bg-amber-300/12 text-amber-100'
                            : 'border-slate-400/25 bg-slate-500/10 text-slate-200'
                      }`}
                    >
                      {user.presence}
                    </span>
                    <span className="rounded-full border border-amber-200/25 bg-amber-300/10 px-3 py-1 text-xs font-black text-amber-100">
                      {user.status}
                    </span>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2 text-xs font-bold text-slate-400 sm:grid-cols-4">
                  <span>{user.source}</span>
                  <span>Current: {user.currentPage}</span>
                  <span>{user.events} events</span>
                  <span>{formatRelative(user.lastActive)}</span>
                </div>
                <p className="mt-3 text-[11px] font-bold text-slate-500">{user.email ? `Email: ${user.email}` : 'No email stored for this account yet.'}</p>
              </button>
            ))}
          </div>
        ) : (
          <EmptyState title="No users yet" body="No live user/session events match this filter." />
        )}
      </Panel>

      <Panel title={selectedUser ? `${selectedUser.displayName} Timeline` : 'User Timeline'} subtitle="Behavior only. Private content is excluded." icon={Eye} section={section}>
        {selectedUser ? (
          <div>
            <div className="mb-4 grid gap-3 sm:grid-cols-5">
              <MiniStat label="Events" value={selectedUser.events.toString()} />
              <MiniStat label="Sessions" value={selectedUser.sessions.toString()} />
              <MiniStat label="Time" value={formatDuration(selectedUser.sessionSeconds)} />
              <MiniStat label="Status" value={selectedUser.presence} />
              <MiniStat label="Current page" value={selectedUser.currentPage} />
            </div>

            <div className="mb-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">Learner</p>
              <p className="mt-1 text-lg font-black text-white">{selectedUser.displayName}</p>
              <p className="mt-1 text-sm font-bold text-slate-400">
                {selectedUser.examTrack} · {selectedUser.source} · last active {formatRelative(selectedUser.lastActive)}
              </p>
              <p className="mt-1 text-sm font-bold text-cyan-100/80">
                {selectedUser.email ? selectedUser.email : 'No email stored for this account yet.'}
              </p>
            </div>

            <div className="space-y-3">
              {selectedUser.timeline.map((event) => (
                <div key={event.id} className={`rounded-2xl border p-4 ${toneStyles[eventTone(event)]}`}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-black text-white">{formatEventLabel(event.event_name)}</p>
                      <p className="mt-1 text-xs font-bold leading-5 text-current/70">{eventDetail(event)}</p>
                    </div>
                    <span className="text-xs font-black text-current/70">{formatClock(eventTime(event))}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <EmptyState title="No selected user" body="Once live users exist, click one to inspect their behavior timeline." />
        )}
      </Panel>
    </div>
  )
}

function FeatureUsagePage({ model, section }: { model: DashboardModel; section: AdminSection }) {
  return (
    <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
      <Panel title="Feature Usage" subtitle="Feature rows are built from feature_name or page_path." icon={Layers3} section={section}>
        {model.featureRows.length ? (
          <div className="space-y-3">
            {model.featureRows.map((row) => (
              <div key={row.feature} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-lg font-black text-white">{row.feature}</p>
                    <p className="mt-1 text-sm font-bold text-slate-400">
                      {row.users} users / {row.events} events
                    </p>
                  </div>
                  <span className="rounded-full border border-sky-200/25 bg-sky-400/10 px-3 py-1 text-xs font-black text-sky-100">
                    {formatRelative(row.lastSeen)}
                  </span>
                </div>
                <div className="mt-4 grid gap-2 sm:grid-cols-3">
                  <MiniStat label="Starts" value={row.starts.toString()} />
                  <MiniStat label="Completions" value={row.completions.toString()} />
                  <MiniStat label="Failures" value={row.failures.toString()} />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState title="No feature events yet" body="Feature opens, quiz starts, uploads, and other interactions will appear here." />
        )}
      </Panel>

      <Panel title="Page Interest" subtitle="A true page ranking from live events." icon={Eye} section={section}>
        {model.pageRows.length ? (
          <DataTable
            columns={['Page', 'Users', 'Events', 'Avg time']}
            rows={model.pageRows.slice(0, 14).map((row) => [
              row.page,
              row.users.toString(),
              row.events.toString(),
              formatDuration(row.avgSeconds),
            ])}
          />
        ) : (
          <EmptyState title="No page rows yet" body="There are no live page events for this filter." />
        )}
      </Panel>
    </div>
  )
}

function RetentionPage({ model, section }: { model: DashboardModel; section: AdminSection }) {
  const returning = model.users.filter((user) => user.sessions > 1)

  return (
    <div className="space-y-5">
      <div className="grid gap-3 md:grid-cols-3">
        <KpiCard
          icon={TimerReset}
          title="Returning users"
          value={model.returningUsers.toString()}
          detail="Same user or anonymous ID with more than one session"
          tone={model.returningUsers ? 'good' : 'muted'}
        />
        <KpiCard
          icon={Gauge}
          title="Return rate"
          value={`${model.returnRate}%`}
          detail="Returning users divided by tracked users"
          tone={model.returnRate >= 25 ? 'good' : model.totalUsers ? 'watch' : 'muted'}
        />
        <KpiCard
          icon={Clock3}
          title="Avg session"
          value={formatDuration(model.avgSessionSeconds)}
          detail="Session time is sparse until events include time_spent_seconds"
          tone={model.avgSessionSeconds ? 'info' : 'muted'}
        />
      </div>

      <Panel title="Return Behavior" subtitle="No estimates. Only repeat sessions recorded in app_events." icon={TimerReset} section={section}>
        {returning.length ? (
          <DataTable
            columns={['User', 'Sessions', 'Events', 'First seen', 'Last active', 'Source']}
            rows={returning.map((user) => [
              user.label,
              user.sessions.toString(),
              user.events.toString(),
              formatClock(user.firstSeen),
              formatRelative(user.lastActive),
              user.source,
            ])}
          />
        ) : (
          <EmptyState title="No returning users yet" body="This is expected early. Once a live visitor returns in a new session, they will show up here." />
        )}
      </Panel>
    </div>
  )
}

function ContentQualityPage({ model, section }: { model: DashboardModel; section: AdminSection }) {
  const answerRate = safePercent(model.correctAnswers, model.questionAnswered)

  return (
    <div className="space-y-5">
      <div className="grid gap-3 md:grid-cols-4">
        <KpiCard
          icon={FileQuestion}
          title="Questions answered"
          value={model.questionAnswered.toString()}
          detail="Actual question_answered events"
          tone={model.questionAnswered ? 'info' : 'muted'}
        />
        <KpiCard
          icon={CheckCircle2}
          title="Correct answers"
          value={model.correctAnswers.toString()}
          detail={`${answerRate}% of answered questions`}
          tone={model.correctAnswers ? 'good' : 'muted'}
        />
        <KpiCard
          icon={AlertTriangle}
          title="Incorrect answers"
          value={model.incorrectAnswers.toString()}
          detail="Actual incorrect result events"
          tone={model.incorrectAnswers ? 'watch' : 'muted'}
        />
        <KpiCard
          icon={Brain}
          title="Confidence mismatch"
          value={model.highConfidenceMisses.toString()}
          detail="High-confidence incorrect answers"
          tone={model.highConfidenceMisses ? 'critical' : model.questionAnswered ? 'good' : 'muted'}
        />
      </div>

      <Panel title="Question Categories" subtitle="Category performance from question_answered events." icon={FileQuestion} section={section}>
        {model.categoryRows.length ? (
          <DataTable
            columns={['Category', 'Answered', 'Correct', 'Incorrect', 'High-confidence misses']}
            rows={model.categoryRows.map((row) => [
              row.category,
              row.answered.toString(),
              row.correct.toString(),
              row.incorrect.toString(),
              row.highConfidenceMisses.toString(),
            ])}
          />
        ) : (
          <EmptyState title="No question outcomes yet" body="When live users answer practice questions, category and confidence signals will appear here." />
        )}
      </Panel>
    </div>
  )
}

function SecurityPage({
  model,
  section,
  dataMode,
  usingLocalFallback,
  dataAccess,
}: {
  model: DashboardModel
  section: AdminSection
  dataMode: string
  usingLocalFallback: boolean
  dataAccess: AdminDataAccessStatus | null
}) {
  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_1fr]">
      <Panel title="Access And Data Mode" subtitle="What is live, protected, and visible." icon={LockKeyhole} section={section}>
        <div className="space-y-3">
          <StatusCard
            tone="good"
            title="Admin route is gated"
            body="The public admin panel requires admin access or the temporary pass key before it renders."
          />
          <StatusCard
            tone={usingLocalFallback ? 'watch' : model.totalEvents ? 'good' : 'muted'}
            title={dataMode}
            body={`${model.totalEvents} event rows are currently feeding the dashboard after filters.`}
          />
          <StatusCard
            tone={dataAccess?.signedIn && dataAccess?.isAdmin ? 'good' : 'watch'}
            title="Supabase app_events access"
            body={
              dataAccess?.signedIn && dataAccess?.isAdmin
                ? `${dataAccess.email ?? 'Signed-in admin'} can read live app_events.`
                : dataAccess?.signedIn
                  ? `${dataAccess.email ?? 'This account'} is signed in but is not authorized for app_events.`
                  : 'The pass key opens the cockpit. Sign into the main app with the admin account to let Supabase RLS return live rows.'
            }
          />
          <StatusCard
            tone="good"
            title="Seeded preview data removed"
            body="The panel no longer uses fake source, journey, feature, or user rows."
          />
          <StatusCard
            tone="info"
            title="Admin is not self-counted"
            body="Events whose page_path includes /admin are filtered out of the behavior model."
          />
        </div>
      </Panel>

      <Panel title="Privacy Guardrails" subtitle="Behavior analytics without private study content." icon={ShieldCheck} section={section}>
        <div className="grid gap-3">
          {[
            ['Allowed', 'Page path, source, campaign, feature, exam track, quiz outcome, confidence, timestamps, anonymous IDs.'],
            ['Blocked', 'Emails, names, passwords, tokens, note body, upload text, filenames, patient/PHI-looking fields.'],
            ['User timeline', 'Shows exact app behavior and sequence, but not private notes or uploaded document text.'],
            ['Next security step', 'Move temporary pass key to owner-only auth once beta traffic grows.'],
          ].map(([title, body]) => (
            <div key={title} className="rounded-2xl border border-lime-300/20 bg-lime-300/8 p-4">
              <p className="text-sm font-black text-white">{title}</p>
              <p className="mt-1 text-xs font-bold leading-5 text-lime-100/70">{body}</p>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  )
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-black text-white">{value}</p>
    </div>
  )
}

function DataTable({ columns, rows }: { columns: string[]; rows: string[][] }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-white/10">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-white/10 text-left">
          <thead className="bg-white/[0.04]">
            <tr>
              {columns.map((column) => (
                <th key={column} className="px-4 py-3 text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/8">
            {rows.map((row, index) => (
              <tr key={`${row.join('-')}-${index}`} className="bg-white/[0.015]">
                {row.map((cell, cellIndex) => (
                  <td key={`${cell}-${cellIndex}`} className="max-w-[280px] truncate px-4 py-3 text-sm font-bold text-slate-200">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export function AdminMonitorPage() {
  const [activeSectionId, setActiveSectionId] = useState<AdminSectionId>(() => sectionFromLocation())
  const [remoteEvents, setRemoteEvents] = useState<StoredAppEvent[]>([])
  const [localEvents, setLocalEvents] = useState<StoredAppEvent[]>([])
  const [profilesById, setProfilesById] = useState<Map<string, AdminProfileSummary>>(new Map())
  const [dataAccess, setDataAccess] = useState<AdminDataAccessStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)
  const [range, setRange] = useState<RangeFilter>('7 days')
  const [source, setSource] = useState<SourceFilter>('All')
  const [track, setTrack] = useState<ExamFilter>('All')

  const activeSection = adminSections.find((section) => section.id === activeSectionId) ?? adminSections[0]
  const usingLocalFallback = remoteEvents.length === 0 && import.meta.env.DEV && localEvents.length > 0
  const rawEvents = usingLocalFallback ? localEvents : remoteEvents
  const dataMode = usingLocalFallback
    ? 'Local browser events'
    : !dataAccess
      ? 'Checking live data access'
      : !dataAccess.configured
        ? 'Supabase not configured'
        : !dataAccess.signedIn
          ? 'Admin sign-in needed'
          : !dataAccess.isAdmin
            ? 'Admin role needed'
            : remoteEvents.length
              ? 'Live Supabase app_events'
              : 'No live events recorded'

  const loadEvents = async () => {
    setLoading(true)
    try {
      const [nextAccess, nextRemote] = await Promise.all([
        getAdminDataAccessStatus(),
        loadRecentAdminEvents(2000),
      ])
      const nextUserIds = [...new Set(nextRemote.map((event) => event.user_id).filter((value): value is string => Boolean(value)))]
      const nextProfiles = await loadAdminProfiles(nextUserIds)
      setDataAccess(nextAccess)
      setRemoteEvents(nextRemote)
      setLocalEvents(getLocalAppEvents())
      setProfilesById(new Map(nextProfiles.map((profile) => [profile.id, profile])))
      setLastRefresh(new Date())
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadEvents()
  }, [])

  useEffect(() => {
    const handlePopState = () => setActiveSectionId(sectionFromLocation())
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  const navigateSection = (sectionId: AdminSectionId) => {
    const section = adminSections.find((item) => item.id === sectionId) ?? adminSections[0]
    setActiveSectionId(section.id)
    window.history.pushState(null, '', sectionPath(section))
    window.scrollTo({ top: 0, left: 0, behavior: 'smooth' })
  }

  const model = useMemo(
    () => buildModel(filterEvents(rawEvents, range, source, track), profilesById),
    [rawEvents, range, source, track, profilesById],
  )

  return (
    <AdminPanelShell
      activeSection={activeSection}
      setActiveSection={navigateSection}
      dataMode={dataMode}
      totalEvents={model.totalEvents}
      loading={loading}
      refresh={loadEvents}
      lastRefresh={lastRefresh}
    >
      <FilterBar range={range} setRange={setRange} source={source} setSource={setSource} track={track} setTrack={setTrack} />

      {activeSection.id === 'overview' ? (
        <OverviewPage model={model} section={activeSection} dataAccess={dataAccess} />
      ) : null}
      {activeSection.id === 'acquisition' ? <AcquisitionPage model={model} section={activeSection} /> : null}
      {activeSection.id === 'activation' ? <ActivationPage model={model} section={activeSection} /> : null}
      {activeSection.id === 'users' ? <UsersPage model={model} section={activeSection} /> : null}
      {activeSection.id === 'feature-usage' ? <FeatureUsagePage model={model} section={activeSection} /> : null}
      {activeSection.id === 'retention' ? <RetentionPage model={model} section={activeSection} /> : null}
      {activeSection.id === 'content-quality' ? <ContentQualityPage model={model} section={activeSection} /> : null}
      {activeSection.id === 'security' ? (
        <SecurityPage
          model={model}
          section={activeSection}
          dataMode={dataMode}
          usingLocalFallback={usingLocalFallback}
          dataAccess={dataAccess}
        />
      ) : null}
    </AdminPanelShell>
  )
}
