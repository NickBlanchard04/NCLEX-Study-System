import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Ban,
  Check,
  Inbox,
  LoaderCircle,
  Map,
  MoreHorizontal,
  Search,
  Send,
  Trash2,
  UserPlus,
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
  type InboxItem,
  type SocialConnection,
  type SocialPerson,
} from '../services/social-service'
import { EmptyState, PageHeader, Surface } from './ui'

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
    lg: 'h-16 w-16 text-base',
  }[size]

  return (
    <div className={clsx('grid shrink-0 place-items-center overflow-hidden rounded-2xl border border-cyan-200/28 bg-[#0b2a48] font-black text-white', sizeClass)}>
      {imageUrl ? <img src={imageUrl} alt="" className="h-full w-full object-cover" /> : getInitials(name)}
    </div>
  )
}

function ProfileBadges({ person }: { person: Pick<SocialPerson, 'college' | 'state' | 'memberNumber'> }) {
  return (
    <div className="flex flex-wrap gap-2">
      <span className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-200/22 bg-cyan-300/[0.08] px-2.5 py-1 text-xs font-black text-cyan-100">
        <span aria-hidden="true">🎓</span>
        {fallbackValue(person.college)}
      </span>
      <span className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200/22 bg-emerald-300/[0.08] px-2.5 py-1 text-xs font-black text-emerald-100">
        <Map className="h-3.5 w-3.5" />
        {fallbackValue(person.state)}
      </span>
      {person.memberNumber ? (
        <span className="inline-flex items-center rounded-lg border border-amber-200/24 bg-amber-300/[0.1] px-2.5 py-1 text-xs font-black text-amber-100">
          Learner #{person.memberNumber}
        </span>
      ) : null}
    </div>
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
        className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-sky-300/22 bg-white/[0.04] text-sky-100/72 transition hover:border-sky-200/50 hover:text-white"
        aria-label="Open person actions"
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>
      {open ? (
        <div className="absolute right-0 top-11 z-10 grid min-w-40 gap-1 rounded-xl border border-sky-300/22 bg-[#061b31] p-1.5 shadow-[0_18px_42px_rgba(0,0,0,0.3)]">
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
        'inline-flex items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-semibold transition',
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

  const refreshSocial = useCallback(async () => {
    if (!canUseSocial) return
    setSocialLoading(true)
    setError('')
    try {
      const [nextConnections, nextInbox] = await Promise.all([
        listSocialConnections(),
        listInboxItems(),
      ])
      setConnections(nextConnections)
      setInboxItems(nextInbox)
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
          eyebrow="Social"
          title="Find classmates and friends."
          description="Social search and messaging are available for signed-in cloud accounts."
        />
        <EmptyState
          title="Sign in to use Social."
          description="People search, friend requests, inbox activity, and messaging need an authenticated Supabase account."
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Social"
        title="Learner network"
        description="Search profiles, manage requests, and keep your study circle close."
        action={
          profile.memberNumber ? (
            <div className="rounded-2xl border border-amber-200/28 bg-amber-300/[0.1] px-4 py-3 text-amber-100">
              <p className="text-[10px] font-black uppercase tracking-[0.16em]">Achievement</p>
              <p className="mt-1 text-sm font-black">Learner #{profile.memberNumber}</p>
            </div>
          ) : null
        }
      />

      {error ? (
        <div className="rounded-2xl border border-rose-300/24 bg-rose-400/12 px-4 py-3 text-sm font-semibold text-rose-100">
          {error}
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[1.35fr_0.85fr]">
        <Surface>
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-sky-300">People search</p>
              <h3 className="mt-2 text-2xl font-black text-white">Find a learner</h3>
            </div>
            <div className="relative w-full md:max-w-[360px]">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-sky-100/44" />
              <input
                value={query}
                onChange={handleQueryChange}
                placeholder="Search by name"
                className="w-full rounded-xl border border-sky-300/22 bg-[#03101f]/70 py-3 pl-10 pr-4 text-sm font-semibold text-white outline-none transition placeholder:text-sky-100/38 focus:border-sky-200/55"
              />
            </div>
          </div>

          <div className="mt-5 grid gap-3">
            {query.trim().length < 2 ? (
              <div className="rounded-2xl border border-dashed border-sky-300/24 bg-white/[0.035] px-4 py-5 text-sm font-semibold text-sky-100/58">
                Type at least two letters.
              </div>
            ) : searchLoading ? (
              <div className="flex items-center gap-2 rounded-2xl border border-sky-300/22 bg-white/[0.04] px-4 py-5 text-sm font-semibold text-sky-100/72">
                <LoaderCircle className="h-4 w-4 animate-spin" />
                Searching
              </div>
            ) : results.length ? (
              results.map((person) => (
                <PersonSearchCard
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
              <div className="rounded-2xl border border-dashed border-sky-300/24 bg-white/[0.035] px-4 py-5 text-sm font-semibold text-sky-100/58">
                No learners matched that name.
              </div>
            )}
          </div>
        </Surface>

        <Surface>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-sky-300">Inbox</p>
              <h3 className="mt-2 text-2xl font-black text-white">Requests & messages</h3>
            </div>
            <button
              type="button"
              onClick={() => void refreshSocial()}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-sky-300/22 bg-white/[0.04] text-sky-100/72 transition hover:border-sky-200/50 hover:text-white"
              aria-label="Refresh inbox"
            >
              {socialLoading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Inbox className="h-4 w-4" />}
            </button>
          </div>
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
              <div className="rounded-2xl border border-dashed border-sky-300/24 bg-white/[0.035] px-4 py-5 text-sm font-semibold text-sky-100/58">
                No new requests or messages.
              </div>
            )}
          </div>
        </Surface>
      </div>

      <Surface>
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-sky-300">Friends</p>
            <h3 className="mt-2 text-2xl font-black text-white">Your study circle</h3>
          </div>
          <div className="inline-flex rounded-xl border border-sky-300/22 bg-white/[0.04] p-1">
            {(['friends', 'requests'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={clsx(
                  'rounded-lg px-4 py-2 text-sm font-black capitalize transition',
                  activeTab === tab
                    ? 'bg-sky-300/18 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]'
                    : 'text-sky-100/58 hover:text-white',
                )}
              >
                {tab}
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
              <div className="rounded-2xl border border-dashed border-sky-300/24 bg-white/[0.035] px-4 py-5 text-sm font-semibold text-sky-100/58">
                No friends yet.
              </div>
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
            <div className="rounded-2xl border border-dashed border-sky-300/24 bg-white/[0.035] px-4 py-5 text-sm font-semibold text-sky-100/58">
              No pending requests.
            </div>
          )}
        </div>
      </Surface>
    </div>
  )
}

function PersonSearchCard({
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
    <div className="rounded-2xl border border-sky-300/18 bg-white/[0.045] p-4">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex min-w-0 items-center gap-4">
          <PersonAvatar name={person.displayName} imageUrl={person.profileImageDataUrl} size="lg" />
          <div className="min-w-0">
            <h4 className="truncate text-lg font-black text-white">{person.displayName}</h4>
            <div className="mt-2">
              <ProfileBadges person={person} />
            </div>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          {person.friendStatus === 'friends' ? (
            <span className="inline-flex min-h-10 items-center rounded-xl border border-emerald-200/24 bg-emerald-300/[0.1] px-3 text-sm font-black text-emerald-100">
              Friends
            </span>
          ) : person.friendStatus === 'requested' ? (
            <span className="inline-flex min-h-10 items-center rounded-xl border border-amber-200/24 bg-amber-300/[0.1] px-3 text-sm font-black text-amber-100">
              Pending
            </span>
          ) : person.friendStatus === 'incoming' ? (
            <>
              <button
                type="button"
                onClick={onAccept}
                disabled={busy}
                className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-emerald-200/26 bg-emerald-400/14 px-3 text-sm font-black text-emerald-100 transition hover:bg-emerald-400/20 disabled:opacity-60"
              >
                <Check className="h-4 w-4" />
                Accept
              </button>
              <button
                type="button"
                onClick={onDeny}
                disabled={busy}
                className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-rose-200/26 bg-rose-400/14 px-3 text-sm font-black text-rose-100 transition hover:bg-rose-400/20 disabled:opacity-60"
              >
                <X className="h-4 w-4" />
                Deny
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={onSend}
              disabled={busy}
              className="nclex-btn-primary inline-flex min-h-10 items-center gap-2 rounded-xl px-3 text-sm font-black disabled:opacity-60"
            >
              {busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
              Add
            </button>
          )}
        </div>
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
    <div className="rounded-2xl border border-sky-300/18 bg-white/[0.045] p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <PersonAvatar name={item.displayName} imageUrl={item.profileImageDataUrl} />
          <div className="min-w-0">
            <p className="truncate text-sm font-black text-white">{item.displayName}</p>
            <p className="mt-1 text-xs font-semibold text-sky-100/58">
              {isRequest ? 'Friend request' : 'New message'}
            </p>
          </div>
        </div>
        {isRequest ? (
          <div className="flex shrink-0 gap-2">
            <button
              type="button"
              onClick={onAccept}
              disabled={busy}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-200/26 bg-emerald-400/14 text-emerald-100 transition hover:bg-emerald-400/20 disabled:opacity-60"
              aria-label="Accept friend request"
            >
              <Check className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={onDeny}
              disabled={busy}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-rose-200/26 bg-rose-400/14 text-rose-100 transition hover:bg-rose-400/20 disabled:opacity-60"
              aria-label="Deny friend request"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={onMarkRead}
            disabled={busy}
            className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-sky-300/22 bg-white/[0.04] px-3 text-xs font-black text-sky-100/72 transition hover:border-sky-200/50 hover:text-white disabled:opacity-60"
          >
            <Check className="h-4 w-4" />
            Read
          </button>
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
    <div className="flex flex-col gap-4 rounded-2xl border border-sky-300/18 bg-white/[0.045] p-4 md:flex-row md:items-center md:justify-between">
      <div className="flex min-w-0 items-center gap-4">
        <PersonAvatar name={connection.displayName} imageUrl={connection.profileImageDataUrl} />
        <div className="min-w-0">
          <p className="truncate text-base font-black text-white">{connection.displayName}</p>
          <div className="mt-2">
            <ProfileBadges person={connection} />
          </div>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {busy ? <LoaderCircle className="h-4 w-4 animate-spin text-sky-200" /> : null}
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
    <div className="flex flex-col gap-4 rounded-2xl border border-sky-300/18 bg-white/[0.045] p-4 md:flex-row md:items-center md:justify-between">
      <div className="flex min-w-0 items-center gap-4">
        <PersonAvatar name={request.displayName} imageUrl={request.profileImageDataUrl} />
        <div className="min-w-0">
          <p className="truncate text-base font-black text-white">{request.displayName}</p>
          <p className="mt-1 text-xs font-black uppercase tracking-[0.14em] text-sky-100/50">
            {incoming ? 'Incoming request' : 'Sent request'}
          </p>
        </div>
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        {incoming ? (
          <>
            <button
              type="button"
              onClick={onAccept}
              disabled={busy}
              className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-emerald-200/26 bg-emerald-400/14 px-3 text-sm font-black text-emerald-100 transition hover:bg-emerald-400/20 disabled:opacity-60"
            >
              <Check className="h-4 w-4" />
              Accept
            </button>
            <button
              type="button"
              onClick={onDeny}
              disabled={busy}
              className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-rose-200/26 bg-rose-400/14 px-3 text-sm font-black text-rose-100 transition hover:bg-rose-400/20 disabled:opacity-60"
            >
              <X className="h-4 w-4" />
              Deny
            </button>
          </>
        ) : (
          <span className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-amber-200/24 bg-amber-300/[0.1] px-3 text-sm font-black text-amber-100">
            <Send className="h-4 w-4" />
            Pending
          </span>
        )}
        {busy ? <LoaderCircle className="h-4 w-4 animate-spin text-sky-200" /> : null}
        <MenuButton id={menuId} openId={openMenuId} onOpen={onOpenMenu}>
          {incoming ? null : <MenuAction icon={<X className="h-4 w-4" />} label="Cancel" onClick={onCancel} />}
          <MenuAction tone="danger" icon={<Ban className="h-4 w-4" />} label="Block" onClick={onBlock} />
        </MenuButton>
      </div>
    </div>
  )
}
