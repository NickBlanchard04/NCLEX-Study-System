import { isSupabaseConfigured, supabase } from './supabase'

export type FriendStatus = 'none' | 'friends' | 'requested' | 'incoming' | 'blocked'
export type SocialConnectionType = 'friend' | 'incoming_request' | 'outgoing_request'
export type InboxItemType = 'friend_request' | 'message'

export interface SocialPerson {
  userId: string
  displayName: string
  memberNumber?: number
  profileImageDataUrl?: string
  college?: string
  state?: string
  friendStatus: FriendStatus
  requestId?: string
  suggestionReason?: string
  matchScore?: number
}

export interface SocialConnection extends Omit<SocialPerson, 'friendStatus' | 'requestId'> {
  connectionType: SocialConnectionType
  requestId?: string
  createdAt: string
  status: string
}

export interface InboxItem {
  itemType: InboxItemType
  itemId: string
  userId: string
  displayName: string
  profileImageDataUrl?: string
  preview: string
  createdAt: string
  requestStatus?: string
}

type SocialPersonRow = {
  user_id: string
  display_name: string
  member_number: number | string | null
  profile_image_data_url: string | null
  college: string | null
  profile_state: string | null
  friend_status: FriendStatus | null
  request_id: string | null
}

type SocialSuggestionRow = SocialPersonRow & {
  suggestion_reason: string | null
  match_score: number | string | null
}

type SocialConnectionRow = Omit<SocialPersonRow, 'friend_status'> & {
  connection_type: SocialConnectionType
  created_at: string
  status: string
}

type InboxItemRow = {
  item_type: InboxItemType
  item_id: string
  user_id: string
  display_name: string
  profile_image_data_url: string | null
  preview: string | null
  created_at: string
  request_status: string | null
}

const requireClient = () => {
  if (!supabase || !isSupabaseConfigured) {
    throw new Error('Social features need Supabase to be configured.')
  }
  return supabase
}

const optionalText = (value: string | null | undefined) => {
  const trimmed = value?.trim()
  return trimmed || undefined
}

const optionalNumber = (value: number | string | null | undefined) => {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : undefined
  }
  return undefined
}

const mapPerson = (row: SocialPersonRow): SocialPerson => ({
  userId: row.user_id,
  displayName: row.display_name,
  memberNumber: optionalNumber(row.member_number),
  profileImageDataUrl: optionalText(row.profile_image_data_url),
  college: optionalText(row.college),
  state: optionalText(row.profile_state),
  friendStatus: row.friend_status ?? 'none',
  requestId: optionalText(row.request_id),
})

const mapSuggestion = (row: SocialSuggestionRow): SocialPerson => ({
  ...mapPerson(row),
  suggestionReason: optionalText(row.suggestion_reason),
  matchScore: optionalNumber(row.match_score),
})

const mapConnection = (row: SocialConnectionRow): SocialConnection => ({
  userId: row.user_id,
  displayName: row.display_name,
  memberNumber: optionalNumber(row.member_number),
  profileImageDataUrl: optionalText(row.profile_image_data_url),
  college: optionalText(row.college),
  state: optionalText(row.profile_state),
  connectionType: row.connection_type,
  requestId: optionalText(row.request_id),
  createdAt: row.created_at,
  status: row.status,
})

const mapInboxItem = (row: InboxItemRow): InboxItem => ({
  itemType: row.item_type,
  itemId: row.item_id,
  userId: row.user_id,
  displayName: row.display_name,
  profileImageDataUrl: optionalText(row.profile_image_data_url),
  preview: row.preview ?? '',
  createdAt: row.created_at,
  requestStatus: optionalText(row.request_status),
})

export async function searchPeople(query: string) {
  const client = requireClient()
  const { data, error } = await client.rpc('search_people', {
    search_text: query.trim(),
  })
  if (error) throw error
  return ((data ?? []) as SocialPersonRow[]).map(mapPerson)
}

export async function suggestPeople(limit = 18) {
  const client = requireClient()
  const { data, error } = await client.rpc('suggest_people', {
    limit_count: limit,
  })
  if (error) throw error
  return ((data ?? []) as SocialSuggestionRow[]).map(mapSuggestion)
}

export async function listSocialConnections() {
  const client = requireClient()
  const { data, error } = await client.rpc('list_social_connections')
  if (error) throw error
  return ((data ?? []) as SocialConnectionRow[]).map(mapConnection)
}

export async function listInboxItems() {
  const client = requireClient()
  const { data, error } = await client.rpc('list_inbox_items')
  if (error) throw error
  return ((data ?? []) as InboxItemRow[]).map(mapInboxItem)
}

export async function sendFriendRequest(userId: string) {
  const client = requireClient()
  const { data, error } = await client.rpc('send_friend_request', {
    target_user_id: userId,
  })
  if (error) throw error
  return typeof data === 'string' ? data : null
}

export async function respondFriendRequest(requestId: string, status: 'accepted' | 'declined') {
  const client = requireClient()
  const { error } = await client.rpc('respond_friend_request', {
    request_id: requestId,
    next_status: status,
  })
  if (error) throw error
}

export async function cancelFriendRequest(requestId: string) {
  const client = requireClient()
  const { error } = await client.rpc('cancel_friend_request', {
    request_id: requestId,
  })
  if (error) throw error
}

export async function removeFriend(userId: string) {
  const client = requireClient()
  const { error } = await client.rpc('remove_friend', {
    target_user_id: userId,
  })
  if (error) throw error
}

export async function blockUser(userId: string) {
  const client = requireClient()
  const { error } = await client.rpc('block_user', {
    target_user_id: userId,
  })
  if (error) throw error
}

export async function markMessagesRead(senderUserId: string) {
  const client = requireClient()
  const { error } = await client.rpc('mark_messages_read', {
    sender_user_id: senderUserId,
  })
  if (error) throw error
}
