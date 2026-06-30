import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Ban,
  BadgeCheck,
  Check,
  GraduationCap,
  Inbox,
  LoaderCircle,
  Map,
  MoreHorizontal,
  RefreshCw,
  Search,
  Send,
  Sparkles,
  Trash2,
  UserCheck,
  UserPlus,
  UsersRound,
  X,
} from 'lucide-react'
import { clsx } from 'clsx'
import { useStudySystemStore } from '../app/store'
import {
  blockUser,
  cancelFriendRequest,
  listInboxItems,
  listSocialConnections,
  markMessagesRead,
  removeFriend,
  respondFriendRequest,
  searchPeople,
  sendFriendRequest,
  suggestPeople,
  type InboxItem,
  type SocialConnection,
  type SocialPerson,
} from '../services/social-service'
import { EmptyState, NextActionPanel, PageHeader, Surface } from './ui'

type RequestTab = 'friends' | 'requests'

const getInitials = (name: string) => {
  const initials = name
    .split(' ')
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')

  return initials || 'NC'
}

const fallbackValue = (value: string | undefined) => value || 'N/A'

function PersonAvatar({
  name,
  imageUrl,
  size = 'md',
}: {
  name: string
  imageUrl?: string
  size?: 'sm' | 'md' | 'lg'
}) {
  const sizeClass = {
    sm: 'h-10 w-10 text-xs',
    md: 'h-12 w-12 text-sm',
    lg: 'h-14 w-14 text-base sm:h-16 sm:w-16',
  }[size]

  return (
    <div
      className={clsx(
        'grid shrink-0 place-items-center overflow-hidden rounded-2xl border border-cyan-200/28 bg-[#0b2a48] font-bold text-white',
        sizeClass,
      )}
    >
      {imageUrl ? <img src={imageUrl} alt="" className="h-full w-full object-cover" /> : getInitials(name)}
    </div>
  )
}

function IconBadge({
  icon,
  label,
  tone = 'sky',
}: {
  icon: React.ReactNode
  label: string
  tone?: 'sky' | 'emerald' | 'amber' | 'lime'
}) {
  const toneClass = {
    sky: 'border-cyan-200/22 bg-cyan-300/[0.08] text-cyan-100',
    emerald: 'border-emerald-200/22 bg-emerald-300/[0.08] text-emerald-100',
    amber: 'border-amber-200/24 bg-amber-300/[0.1] text-amber-100',
    lime: 'border-lime-200/24 bg-lime-300/[0.1] text-lime-100',
  }[tone]

  return (
    <span className={clsx('inline-flex min-h-8 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-bold', toneClass)}>
      {icon}
      <span className="max-w-[8.5rem] truncate">{label}</span>
    </span>
  )
}

function ProfileBadges({
  person,
  compact = false,
}: {
  person: Pick<SocialPerson, 'college' | 'state' | 'memberNumber'>
  compact?: boolean
}) {
  return (
    <div className={clsx('flex flex-wrap gap-2', compact && 'gap-1.5')}>
      <IconBadge icon={<GraduationCap className="h-3.5 w-3.5" />} label={fallbackValue(person.college)} />
      <IconBadge icon={<Map className="h-3.5 w-3.5" />} label={fallbackValue(person.state)} tone="emerald" />
      {person.memberNumber ? (
        <IconBadge icon={<BadgeCheck className="h-3.5 w-3.5" />} label={`#${person.memberNumber}`} tone="amber" />
      ) : null}
    </div>
  )
}

function SocialActionMark() {
  return (
    <div
      className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-cyan-200/42 bg-cyan-300/[0.12] text-cyan-50 shadow-[0_0_24px_rgba(34,211,238,0.18)]"
      aria-hidden="true"
    >
      <UserPlus className="h-6 w-6" />
    </div>
  )
}

function SectionTitle({
  icon,
  label,
  count,
  action,
}: {
  icon: React.ReactNode
  label: string
  count?: number
  action?: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-3">
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-sky-300/20 bg-sky-300/[0.08] text-sky-100">
          {icon}
        </div>
        <div className="min-w-0">
          <p className="truncate text-lg font-bold text-white sm:text-2xl">{label}</p>
          {typeof count === 'number' ? (
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-sky-100/50">{count} active</p>
          ) : null}
        </div>
      </div>
      {action}
    </div>
  )
}

function IconButton({
  icon,
  label,
  onClick,
  disabled,
  tone = 'default',
}: {
  icon: React.ReactNode
  label: string
  onClick: () => void
  disabled?: boolean
  tone?: 'default' | 'primary' | 'success' | 'danger'
}) {
  const toneClass = {
    default: 'border-sky-300/22 bg-white/[0.04] text-sky-100/72 hover:border-sky-200/50 hover:text-white',
    primary: 'nclex-btn-primary text-white',
    success: 'border-emerald-200/26 bg-emerald-400/14 text-emerald-100 hover:bg-emerald-400/20',
    danger: 'border-rose-200/26 bg-rose-400/14 text-rose-100 hover:bg-rose-400/20',
  }[tone]

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={clsx(
        'inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-xl border px-3 text-sm font-bold transition disabled:opacity-60',
        toneClass,
      )}
      aria-label={label}
      title={label}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </button>
  )
}

function MenuButton({
  id,
  openId,
  onOpen,
  children,
}: {
  id: string
  openId: string | null
  onOpen: (id: string | null) => void
  children: React.ReactNode
}) {
  const open = openId === id

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => onOpen(open ? null : id)}
        className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-sky-300/22 bg-white/[0.04] text-sky-100/72 transition hover:border-sky-200/50 hover:text-white"
        aria-label="Open person actions"
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>
      {open ? (
        <div className="absolute right-0 top-12 z-10 grid min-w-40 gap-1 rounded-xl border border-sky-300/22 bg-[#061b31] p-1.5 shadow-[0_18px_42px_rgba(0,0,0,0.3)]">
          {children}
        </div>
      ) : null}
    </div>
  )
}

function MenuAction({
  tone = 'default',
  icon,
  label,
  onClick,
}: {
  tone?: 'default' | 'danger'
  icon: React.ReactNode
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        'inline-flex min-h-11 items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-semibold transition',
        tone === 'danger'
          ? 'text-rose-200 hover:bg-rose-400/12'
          : 'text-sky-100/82 hover:bg-sky-300/10 hover:text-white',
      )}
    >
      {icon}
      {label}
    </button>
  )
}

export function SocialPage() {
  const authUser = useStudySystemStore((state) => state.authUser)
  const authConfigured = useStudySystemStore((state) => state.authConfigured)
  const isDemoMode = useStudySystemStore((state) => state.isDemoMode)
  const profile = useStudySystemStore((state) => state.profile)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SocialPerson[]>([])
  const [connections, setConnections] = useState<SocialConnection[]>([])
  const [inboxItems, setInboxItems] = useState<InboxItem[]>([])
  const [suggestions, setSuggestions] = useState<SocialPerson[]>([])
  const [dismissedSuggestionIds, setDismissedSuggestionIds] = useState<string[]>([])
  const [activeTab, setActiveTab] = useState<RequestTab>('friends')
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [searchLoading, setSearchLoading] = useState(false)
  const [socialLoading, setSocialLoading] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const searchTimerRef = useRef<number | null>(null)
  const canUseSocial = Boolean(authConfigured && authUser && !isDemoMode)

  const friends = useMemo(
    () => connections.filter((connection) => connection.connectionType === 'friend'),
    [connections],
  )
  const requests = useMemo(
    () => connections.filter((connection) => connection.connectionType !== 'friend'),
    [connections],
  )
  const visibleSuggestions = useMemo(
    () => suggestions.filter((person) => !dismissedSuggestionIds.includes(person.userId)).slice(0, 12),
    [dismissedSuggestionIds, suggestions],
  )

  const refreshSocial = useCallback(async () => {
    if (!canUseSocial) return
    setSocialLoading(true)
    setError('')
    try {
      const [nextConnections, nextInbox, nextSuggestions] = await Promise.all([
        listSocialConnections(),
        listInboxItems(),
        suggestPeople(18),
      ])
      setConnections(nextConnections)
      setInboxItems(nextInbox)
      setSuggestions(nextSuggestions)
    } catch (socialError) {
      setError(socialError instanceof Error ? socialError.message : 'Could not load social activity.')
    } finally {
      setSocialLoading(false)
    }
  }, [canUseSocial])

  const runSearch = useCallback(
    async (nextQuery: string) => {
      const trimmed = nextQuery.trim()
      if (!canUseSocial || trimmed.length < 2) {
        setResults([])
        setSearchLoading(false)
        return
      }

      setSearchLoading(true)
      setError('')
      try {
        setResults(await searchPeople(trimmed))
      } catch (searchError) {
        setError(searchError instanceof Error ? searchError.message : 'Could not search learners.')
      } finally {
        setSearchLoading(false)
      }
    },
    [canUseSocial],
  )

  useEffect(() => {
    const refreshTimer = window.setTimeout(() => {
      void refreshSocial()
    }, 0)

    return () => window.clearTimeout(refreshTimer)
  }, [refreshSocial])

  useEffect(
    () => () => {
      if (searchTimerRef.current) window.clearTimeout(searchTimerRef.current)
    },
    [],
  )

  const refreshAfterAction = useCallback(async () => {
    await refreshSocial()
    if (query.trim().length >= 2) {
      await runSearch(query)
    }
  }, [query, refreshSocial, runSearch])

  const dismissSuggestion = useCallback((userId: string) => {
    setDismissedSuggestionIds((current) => (current.includes(userId) ? current : [...current, userId]))
  }, [])

  const performAction = useCallback(
    async (id: string, action: () => Promise<void>) => {
      setBusyId(id)
      setError('')
      setOpenMenuId(null)
      try {
        await action()
        await refreshAfterAction()
      } catch (actionError) {
        setError(actionError instanceof Error ? actionError.message : 'That action could not be completed.')
      } finally {
        setBusyId(null)
      }
    },
    [refreshAfterAction],
  )

  const handleQueryChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const nextQuery = event.target.value
    setQuery(nextQuery)

    if (searchTimerRef.current) {
      window.clearTimeout(searchTimerRef.current)
    }

    searchTimerRef.current = window.setTimeout(() => {
      void runSearch(nextQuery)
    }, 260)
  }

  if (!canUseSocial) {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow="Grow"
          title="Network"
          description="Sign in to see people, requests, and messages."
          action={<Sparkles className="h-10 w-10 text-lime-100" />}
        />
        <EmptyState
          title="Sign in to connect."
          description="People suggestions, requests, and messages need an authenticated Supabase account."
        />
      </div>
    )
  }

  return (
    <div className="space-y-5 md:space-y-6">
      <PageHeader
        eyebrow="Grow"
        title="Network"
        description="The right nursing connections for today."
        action={
          <div className="flex flex-wrap items-center justify-end gap-2">
            <SocialActionMark />
            <IconBadge icon={<UserPlus className="h-3.5 w-3.5" />} label={`${visibleSuggestions.length} picks`} tone="lime" />
            <IconBadge icon={<UsersRound className="h-3.5 w-3.5" />} label={`${friends.length} friends`} />
            {profile.memberNumber ? (
              <IconBadge icon={<BadgeCheck className="h-3.5 w-3.5" />} label={`#${profile.memberNumber}`} tone="amber" />
            ) : null}
          </div>
        }
      />

      {error ? (
        <div role="alert" className="rounded-2xl border border-rose-300/24 bg-rose-400/12 px-4 py-3 text-sm font-semibold text-rose-100">
          {error}
        </div>
      ) : null}

      <NextActionPanel
        eyebrow="Beta social"
        title="Find one learner or clear requests."
        description="Social is live for signed-in beta accounts, but suggestions may be empty while the network grows. Search by name, refresh suggestions, or keep your profile visible in Settings."
        tone="violet"
        primary={
          <button
            type="button"
            onClick={() => void refreshSocial()}
            disabled={socialLoading}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-violet-200/30 bg-violet-300/[0.1] px-5 py-3 text-sm font-bold text-violet-100 transition hover:bg-violet-300/16 focus:outline-none focus:ring-4 focus:ring-violet-300/18 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {socialLoading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Refresh network
          </button>
        }
        secondary={
          <button
            type="button"
            onClick={() => {
              const searchInput = document.querySelector<HTMLInputElement>('[data-social-search-input="true"]')
              searchInput?.focus()
            }}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-cyan-200/24 bg-cyan-300/[0.07] px-5 py-3 text-sm font-bold text-cyan-100 transition hover:border-cyan-100/55 hover:bg-cyan-300/13 focus:outline-none focus:ring-4 focus:ring-cyan-300/18"
          >
            Search by name
            <UserPlus className="h-4 w-4" />
          </button>
        }
      />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(20rem,0.85fr)]">
        <Surface>
          <SectionTitle
            icon={<UserPlus className="h-5 w-5" />}
            label="Today"
            count={visibleSuggestions.length}
            action={
              <IconButton
                icon={socialLoading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                label="Refresh"
                onClick={() => void refreshSocial()}
                disabled={socialLoading}
              />
            }
          />

          <div className="mt-5 grid gap-3">
            {socialLoading && !suggestions.length ? (
              <LoadingPanel label="Matching" />
            ) : visibleSuggestions.length ? (
              visibleSuggestions.map((person) => (
                <SuggestionCard
                  key={person.userId}
                  person={person}
                  busy={busyId === person.userId || busyId === person.requestId}
                  onSend={() => performAction(person.userId, () => sendFriendRequest(person.userId).then(() => undefined))}
                  onAccept={() =>
                    person.requestId
                      ? performAction(person.requestId, () => respondFriendRequest(person.requestId!, 'accepted'))
                      : undefined
                  }
                  onDeny={() =>
                    person.requestId
                      ? performAction(person.requestId, () => respondFriendRequest(person.requestId!, 'declined'))
                      : undefined
                  }
                  onDismiss={() => dismissSuggestion(person.userId)}
                />
              ))
            ) : (
              <IconEmpty icon={<UserPlus className="h-5 w-5" />} title="No picks yet" description="Refresh, search by name, or invite beta learners to create profiles." />
            )}
          </div>
        </Surface>

        <div className="grid gap-5">
          <Surface>
            <SectionTitle
              icon={<Inbox className="h-5 w-5" />}
              label="Queue"
              count={inboxItems.length}
              action={
                <IconButton
                  icon={socialLoading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                  label="Refresh"
                  onClick={() => void refreshSocial()}
                  disabled={socialLoading}
                />
              }
            />
            <div className="mt-5 grid gap-3">
              {inboxItems.length ? (
                inboxItems.map((item) => (
                  <InboxRow
                    key={`${item.itemType}-${item.itemId}`}
                    item={item}
                    busy={busyId === item.itemId}
                    onAccept={() => performAction(item.itemId, () => respondFriendRequest(item.itemId, 'accepted'))}
                    onDeny={() => performAction(item.itemId, () => respondFriendRequest(item.itemId, 'declined'))}
                    onMarkRead={() => performAction(item.itemId, () => markMessagesRead(item.userId))}
                  />
                ))
              ) : (
                <IconEmpty icon={<Inbox className="h-5 w-5" />} title="No requests waiting" description="When someone sends a request, accept or decline it here." />
              )}
            </div>
          </Surface>

          <Surface>
            <SectionTitle icon={<Search className="h-5 w-5" />} label="Search" />
            <div className="relative mt-5">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-sky-100/44" />
              <input
                value={query}
                onChange={handleQueryChange}
                placeholder="Name"
                data-social-search-input="true"
                className="min-h-11 w-full rounded-xl border border-sky-300/22 bg-[#03101f]/70 py-3 pl-10 pr-4 text-base font-semibold text-white outline-none transition placeholder:text-sky-100/38 focus:border-sky-200/55"
              />
            </div>
            <div className="mt-4 grid gap-3">
              {query.trim().length < 2 ? (
                <IconEmpty icon={<Search className="h-5 w-5" />} title="Search by learner name" description="Use this when suggestions are empty or you know who you want to add." />
              ) : searchLoading ? (
                <LoadingPanel label="Searching" />
              ) : results.length ? (
                results.map((person) => (
                  <PersonCard
                    key={person.userId}
                    person={person}
                    busy={busyId === person.userId || busyId === person.requestId}
                    onSend={() => performAction(person.userId, () => sendFriendRequest(person.userId).then(() => undefined))}
                    onAccept={() =>
                      person.requestId
                        ? performAction(person.requestId, () => respondFriendRequest(person.requestId!, 'accepted'))
                        : undefined
                    }
                    onDeny={() =>
                      person.requestId
                        ? performAction(person.requestId, () => respondFriendRequest(person.requestId!, 'declined'))
                        : undefined
                    }
                  />
                ))
              ) : (
                <IconEmpty icon={<Search className="h-5 w-5" />} title="No match found" description="Check spelling or ask the learner to enable people search in Settings." />
              )}
            </div>
          </Surface>
        </div>
      </div>

      <Surface>
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <SectionTitle icon={<UsersRound className="h-5 w-5" />} label="Circle" />
          <div className="inline-grid grid-cols-2 rounded-xl border border-sky-300/22 bg-white/[0.04] p-1">
            {(['friends', 'requests'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={clsx(
                  'inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-3 text-sm font-bold capitalize transition',
                  activeTab === tab
                    ? 'bg-sky-300/18 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]'
                    : 'text-sky-100/58 hover:text-white',
                )}
              >
                {tab === 'friends' ? <UsersRound className="h-4 w-4" /> : <Inbox className="h-4 w-4" />}
                <span className="hidden sm:inline">{tab}</span>
                <span className="sm:hidden">{tab === 'friends' ? friends.length : requests.length}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="mt-5 grid gap-3">
          {activeTab === 'friends' ? (
            friends.length ? (
              friends.map((friend) => (
                <ConnectionRow
                  key={friend.userId}
                  connection={friend}
                  openMenuId={openMenuId}
                  busy={busyId === friend.userId}
                  onOpenMenu={setOpenMenuId}
                  onRemove={() => performAction(friend.userId, () => removeFriend(friend.userId))}
                  onBlock={() => performAction(friend.userId, () => blockUser(friend.userId))}
                />
              ))
            ) : (
              <IconEmpty icon={<UsersRound className="h-5 w-5" />} title="Start connecting" />
            )
          ) : requests.length ? (
            requests.map((request) => (
              <RequestRow
                key={request.requestId ?? request.userId}
                request={request}
                openMenuId={openMenuId}
                busy={busyId === request.userId || busyId === request.requestId}
                onOpenMenu={setOpenMenuId}
                onAccept={() =>
                  request.requestId
                    ? performAction(request.requestId, () => respondFriendRequest(request.requestId!, 'accepted'))
                    : undefined
                }
                onDeny={() =>
                  request.requestId
                    ? performAction(request.requestId, () => respondFriendRequest(request.requestId!, 'declined'))
                    : undefined
                }
                onCancel={() =>
                  request.requestId
                    ? performAction(request.requestId, () => cancelFriendRequest(request.requestId!))
                    : undefined
                }
                onBlock={() => performAction(request.userId, () => blockUser(request.userId))}
              />
            ))
          ) : (
            <IconEmpty icon={<Inbox className="h-5 w-5" />} title="No requests" />
          )}
        </div>
      </Surface>
    </div>
  )
}

function LoadingPanel({ label }: { label: string }) {
  return (
    <div className="flex min-h-20 items-center justify-center gap-2 rounded-2xl border border-sky-300/22 bg-white/[0.04] px-4 py-5 text-sm font-bold text-sky-100/72">
      <LoaderCircle className="h-4 w-4 animate-spin" />
      {label}
    </div>
  )
}

function IconEmpty({ icon, title, description }: { icon: React.ReactNode; title: string; description?: string }) {
  return (
    <div className="flex min-h-20 items-center gap-3 rounded-2xl border border-dashed border-sky-300/24 bg-white/[0.035] px-4 py-4">
      <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-sky-300/18 bg-sky-300/[0.06] text-sky-100/70">
        {icon}
      </div>
      <div>
        <p className="text-sm font-bold text-sky-100/76">{title}</p>
        {description ? <p className="mt-1 text-xs leading-5 text-sky-100/54">{description}</p> : null}
      </div>
    </div>
  )
}

function RelationshipActions({
  person,
  busy,
  onSend,
  onAccept,
  onDeny,
}: {
  person: Pick<SocialPerson, 'friendStatus'>
  busy: boolean
  onSend: () => void
  onAccept: () => void
  onDeny: () => void
}) {
  if (person.friendStatus === 'friends') {
    return <IconBadge icon={<UserCheck className="h-3.5 w-3.5" />} label="Friends" tone="emerald" />
  }

  if (person.friendStatus === 'requested') {
    return <IconBadge icon={<Send className="h-3.5 w-3.5" />} label="Pending" tone="amber" />
  }

  if (person.friendStatus === 'incoming') {
    return (
      <>
        <IconButton icon={<Check className="h-4 w-4" />} label="Accept" onClick={onAccept} disabled={busy} tone="success" />
        <IconButton icon={<X className="h-4 w-4" />} label="Deny" onClick={onDeny} disabled={busy} tone="danger" />
      </>
    )
  }

  if (person.friendStatus === 'blocked') {
    return <IconBadge icon={<Ban className="h-3.5 w-3.5" />} label="Blocked" tone="amber" />
  }

  return (
    <IconButton
      icon={busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
      label="Connect"
      onClick={onSend}
      disabled={busy}
      tone="primary"
    />
  )
}

function SuggestionCard({
  person,
  busy,
  onSend,
  onAccept,
  onDeny,
  onDismiss,
}: {
  person: SocialPerson
  busy: boolean
  onSend: () => void
  onAccept: () => void
  onDeny: () => void
  onDismiss: () => void
}) {
  return (
    <div className="rounded-2xl border border-sky-300/18 bg-white/[0.045] p-3 sm:p-4">
      <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-3">
        <PersonAvatar name={person.displayName} imageUrl={person.profileImageDataUrl} size="lg" />
        <div className="min-w-0">
          <h4 className="truncate text-base font-bold text-white sm:text-lg">{person.displayName}</h4>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <IconBadge
              icon={<Sparkles className="h-3.5 w-3.5" />}
              label={person.suggestionReason ?? 'Suggested'}
              tone="lime"
            />
            {typeof person.matchScore === 'number' && person.matchScore > 0 ? (
              <IconBadge icon={<BadgeCheck className="h-3.5 w-3.5" />} label={`${person.matchScore}`} tone="amber" />
            ) : null}
          </div>
          <div className="mt-2">
            <ProfileBadges person={person} compact />
          </div>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-sky-300/16 bg-white/[0.03] text-sky-100/48 transition hover:border-sky-200/40 hover:text-white"
          aria-label="Dismiss suggestion"
          title="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="mt-3 flex flex-wrap justify-end gap-2">
        <RelationshipActions person={person} busy={busy} onSend={onSend} onAccept={onAccept} onDeny={onDeny} />
      </div>
    </div>
  )
}

function PersonCard({
  person,
  busy,
  onSend,
  onAccept,
  onDeny,
}: {
  person: SocialPerson
  busy: boolean
  onSend: () => void
  onAccept: () => void
  onDeny: () => void
}) {
  return (
    <div className="rounded-2xl border border-sky-300/18 bg-white/[0.045] p-3 sm:p-4">
      <div className="flex items-start gap-3">
        <PersonAvatar name={person.displayName} imageUrl={person.profileImageDataUrl} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-bold text-white">{person.displayName}</p>
          <div className="mt-2">
            <ProfileBadges person={person} compact />
          </div>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap justify-end gap-2">
        <RelationshipActions person={person} busy={busy} onSend={onSend} onAccept={onAccept} onDeny={onDeny} />
      </div>
    </div>
  )
}

function InboxRow({
  item,
  busy,
  onAccept,
  onDeny,
  onMarkRead,
}: {
  item: InboxItem
  busy: boolean
  onAccept: () => void
  onDeny: () => void
  onMarkRead: () => void
}) {
  const isRequest = item.itemType === 'friend_request'

  return (
    <div className="rounded-2xl border border-sky-300/18 bg-white/[0.045] p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <PersonAvatar name={item.displayName} imageUrl={item.profileImageDataUrl} size="sm" />
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-white">{item.displayName}</p>
            <IconBadge
              icon={isRequest ? <UserPlus className="h-3.5 w-3.5" /> : <Inbox className="h-3.5 w-3.5" />}
              label={isRequest ? 'Request' : 'Message'}
              tone={isRequest ? 'lime' : 'sky'}
            />
          </div>
        </div>
        {isRequest ? (
          <div className="flex shrink-0 gap-2">
            <IconButton icon={<Check className="h-4 w-4" />} label="Accept" onClick={onAccept} disabled={busy} tone="success" />
            <IconButton icon={<X className="h-4 w-4" />} label="Deny" onClick={onDeny} disabled={busy} tone="danger" />
          </div>
        ) : (
          <IconButton icon={<Check className="h-4 w-4" />} label="Read" onClick={onMarkRead} disabled={busy} />
        )}
      </div>
    </div>
  )
}

function ConnectionRow({
  connection,
  openMenuId,
  busy,
  onOpenMenu,
  onRemove,
  onBlock,
}: {
  connection: SocialConnection
  openMenuId: string | null
  busy: boolean
  onOpenMenu: (id: string | null) => void
  onRemove: () => void
  onBlock: () => void
}) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-sky-300/18 bg-white/[0.045] p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4">
      <div className="flex min-w-0 items-center gap-3">
        <PersonAvatar name={connection.displayName} imageUrl={connection.profileImageDataUrl} />
        <div className="min-w-0">
          <p className="truncate text-base font-bold text-white">{connection.displayName}</p>
          <div className="mt-2">
            <ProfileBadges person={connection} compact />
          </div>
        </div>
      </div>
      <div className="flex shrink-0 justify-end gap-2">
        {busy ? <LoaderCircle className="h-4 w-4 animate-spin self-center text-sky-200" /> : null}
        <MenuButton id={connection.userId} openId={openMenuId} onOpen={onOpenMenu}>
          <MenuAction icon={<Trash2 className="h-4 w-4" />} label="Remove" onClick={onRemove} />
          <MenuAction tone="danger" icon={<Ban className="h-4 w-4" />} label="Block" onClick={onBlock} />
        </MenuButton>
      </div>
    </div>
  )
}

function RequestRow({
  request,
  openMenuId,
  busy,
  onOpenMenu,
  onAccept,
  onDeny,
  onCancel,
  onBlock,
}: {
  request: SocialConnection
  openMenuId: string | null
  busy: boolean
  onOpenMenu: (id: string | null) => void
  onAccept: () => void
  onDeny: () => void
  onCancel: () => void
  onBlock: () => void
}) {
  const incoming = request.connectionType === 'incoming_request'
  const menuId = request.requestId ?? request.userId

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-sky-300/18 bg-white/[0.045] p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4">
      <div className="flex min-w-0 items-center gap-3">
        <PersonAvatar name={request.displayName} imageUrl={request.profileImageDataUrl} />
        <div className="min-w-0">
          <p className="truncate text-base font-bold text-white">{request.displayName}</p>
          <div className="mt-2">
            <IconBadge
              icon={incoming ? <UserPlus className="h-3.5 w-3.5" /> : <Send className="h-3.5 w-3.5" />}
              label={incoming ? 'Incoming' : 'Sent'}
              tone={incoming ? 'lime' : 'amber'}
            />
          </div>
        </div>
      </div>
      <div className="flex shrink-0 flex-wrap justify-end gap-2">
        {incoming ? (
          <>
            <IconButton icon={<Check className="h-4 w-4" />} label="Accept" onClick={onAccept} disabled={busy} tone="success" />
            <IconButton icon={<X className="h-4 w-4" />} label="Deny" onClick={onDeny} disabled={busy} tone="danger" />
          </>
        ) : (
          <IconBadge icon={<Send className="h-3.5 w-3.5" />} label="Pending" tone="amber" />
        )}
        {busy ? <LoaderCircle className="h-4 w-4 animate-spin self-center text-sky-200" /> : null}
        <MenuButton id={menuId} openId={openMenuId} onOpen={onOpenMenu}>
          {incoming ? null : <MenuAction icon={<X className="h-4 w-4" />} label="Cancel" onClick={onCancel} />}
          <MenuAction tone="danger" icon={<Ban className="h-4 w-4" />} label="Block" onClick={onBlock} />
        </MenuButton>
      </div>
    </div>
  )
}
