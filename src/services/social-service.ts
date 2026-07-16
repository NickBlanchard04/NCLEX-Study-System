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

export interface SocialMessage {
  id: string
  senderId: string
  recipientId: string
  body: string
  readAt?: string
  createdAt: string
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

type SocialMessageRow = {
  id: string
  sender_id: string
  recipient_id: string
  body: string
  read_at: string | null
  created_at: string
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

const mapMessage = (row: SocialMessageRow): SocialMessage => ({
  id: row.id,
  senderId: row.sender_id,
  recipientId: row.recipient_id,
  body: row.body,
  readAt: optionalText(row.read_at),
  createdAt: row.created_at,
})

const requireCurrentUserId = async () => {
  const client = requireClient()
  const { data, error } = await client.auth.getUser()
  if (error) throw error
  if (!data.user) throw new Error('Sign in to use social messaging.')
  return { client, userId: data.user.id }
}

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
  const requestId = typeof data === 'string' ? data : null
  if (requestId) {
    const { error: notificationError } = await client.functions.invoke('send-friend-request-notification', {
      body: { requestId },
    })
    if (notificationError) {
      console.warn('Friend request email notification was not sent.', notificationError.message)
    }
  }
  return requestId
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

export async function listConversation(peerUserId: string) {
  const peerId = peerUserId.trim()
  if (!peerId) throw new Error('Choose a friend to open messages.')
  const { client, userId } = await requireCurrentUserId()
  const participantFilter = [
    `and(sender_id.eq.${userId},recipient_id.eq.${peerId})`,
    `and(sender_id.eq.${peerId},recipient_id.eq.${userId})`,
  ].join(',')
  const { data, error } = await client
    .from('social_messages')
    .select('id,sender_id,recipient_id,body,read_at,created_at')
    .or(participantFilter)
    .is('deleted_at', null)
    .order('created_at', { ascending: true })
    .limit(200)
  if (error) throw error
  return ((data ?? []) as SocialMessageRow[]).map(mapMessage)
}

export async function sendSocialMessage(recipientUserId: string, body: string) {
  const recipientId = recipientUserId.trim()
  const messageBody = body.trim()
  if (!recipientId) throw new Error('Choose a friend before sending a message.')
  if (!messageBody) throw new Error('Write a message before sending.')
  if (messageBody.length > 1000) throw new Error('Messages must be 1,000 characters or fewer.')

  const { client, userId } = await requireCurrentUserId()
  const { data, error } = await client
    .from('social_messages')
    .insert({ sender_id: userId, recipient_id: recipientId, body: messageBody })
    .select('id,sender_id,recipient_id,body,read_at,created_at')
    .single()
  if (error) throw error
  return mapMessage(data as SocialMessageRow)
}
