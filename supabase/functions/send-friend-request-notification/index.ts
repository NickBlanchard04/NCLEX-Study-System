type FriendRequestRecord = {
  created_at: string
  id: string
  recipient_id: string
  requester_id: string
  status: string
}

type NotificationRecord = {
  request_id: string
  sent_at: string | null
  status: string
}

type ProfileRecord = {
  id: string
  name: string | null
}

type AuthUser = {
  email?: string
  id?: string
}

const corsHeaders = {
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Origin': '*',
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
    status,
  })

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')

const normalizeName = (value: string | null | undefined, fallback: string) => {
  const trimmed = value?.replace(/\s+/g, ' ').trim()
  return trimmed || fallback
}

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

const requiredEnv = (name: string) => {
  const value = Deno.env.get(name)
  if (!value) throw new Error(`${name} is not configured.`)
  return value
}

const getSupabaseHeaders = (serviceRoleKey: string) => ({
  apikey: serviceRoleKey,
  Authorization: `Bearer ${serviceRoleKey}`,
  'Content-Type': 'application/json',
})

const fetchJson = async <T>(url: string, init: RequestInit): Promise<T> => {
  const response = await fetch(url, init)
  if (!response.ok) {
    const detail = await response.text().catch(() => '')
    throw new Error(`Supabase request failed: ${response.status} ${detail.slice(0, 180)}`)
  }
  return await response.json() as T
}

const fetchRows = async <T>(supabaseUrl: string, serviceRoleKey: string, path: string) =>
  fetchJson<T[]>(`${supabaseUrl}/rest/v1/${path}`, {
    headers: getSupabaseHeaders(serviceRoleKey),
    method: 'GET',
  })

const patchNotification = async (
  supabaseUrl: string,
  serviceRoleKey: string,
  requestId: string,
  body: Record<string, unknown>,
) => {
  const response = await fetch(
    `${supabaseUrl}/rest/v1/friend_request_email_notifications?request_id=eq.${requestId}`,
    {
      body: JSON.stringify(body),
      headers: {
        ...getSupabaseHeaders(serviceRoleKey),
        Prefer: 'return=minimal',
      },
      method: 'PATCH',
    },
  )

  if (!response.ok) {
    const detail = await response.text().catch(() => '')
    throw new Error(`Could not update notification status: ${response.status} ${detail.slice(0, 180)}`)
  }
}

const getAuthenticatedUser = async (supabaseUrl: string, anonKey: string, authorization: string) =>
  fetchJson<AuthUser>(`${supabaseUrl}/auth/v1/user`, {
    headers: {
      apikey: anonKey,
      Authorization: authorization,
    },
    method: 'GET',
  })

const getAuthUserById = async (supabaseUrl: string, serviceRoleKey: string, userId: string) =>
  fetchJson<AuthUser>(`${supabaseUrl}/auth/v1/admin/users/${userId}`, {
    headers: getSupabaseHeaders(serviceRoleKey),
    method: 'GET',
  })

const getProfileName = async (supabaseUrl: string, serviceRoleKey: string, userId: string, fallback: string) => {
  const profiles = await fetchRows<ProfileRecord>(
    supabaseUrl,
    serviceRoleKey,
    `profiles?id=eq.${userId}&select=id,name&limit=1`,
  )
  return normalizeName(profiles[0]?.name, fallback)
}

const claimNotification = async (
  supabaseUrl: string,
  serviceRoleKey: string,
  friendRequest: FriendRequestRecord,
) => {
  const existing = await fetchRows<NotificationRecord>(
    supabaseUrl,
    serviceRoleKey,
    `friend_request_email_notifications?request_id=eq.${friendRequest.id}&select=request_id,status,sent_at&limit=1`,
  )

  if (existing[0]?.status === 'sent' && existing[0].sent_at) {
    return false
  }

  if (!existing.length) {
    const response = await fetch(`${supabaseUrl}/rest/v1/friend_request_email_notifications`, {
      body: JSON.stringify({
        recipient_id: friendRequest.recipient_id,
        request_id: friendRequest.id,
        requester_id: friendRequest.requester_id,
        status: 'sending',
      }),
      headers: {
        ...getSupabaseHeaders(serviceRoleKey),
        Prefer: 'return=minimal',
      },
      method: 'POST',
    })

    if (response.status === 409) return false
    if (!response.ok) {
      const detail = await response.text().catch(() => '')
      throw new Error(`Could not create notification status: ${response.status} ${detail.slice(0, 180)}`)
    }

    return true
  }

  await patchNotification(supabaseUrl, serviceRoleKey, friendRequest.id, {
    error_message: null,
    status: 'sending',
  })
  return true
}

const sendFriendRequestEmail = async ({
  appUrl,
  from,
  recipientEmail,
  recipientName,
  replyTo,
  requesterName,
  resendApiKey,
}: {
  appUrl: string
  from: string
  recipientEmail: string
  recipientName: string
  replyTo?: string
  requesterName: string
  resendApiKey: string
}) => {
  const socialUrl = `${appUrl.replace(/\/+$/, '')}/social`
  const safeRecipientName = escapeHtml(recipientName)
  const safeRequesterName = escapeHtml(requesterName)
  const safeSocialUrl = escapeHtml(socialUrl)
  const subject = `${requesterName} added you on Nurse Command`
  const text = [
    `Hi ${recipientName},`,
    '',
    `${requesterName} added you on Nurse Command.`,
    'Open your Social inbox to accept or deny the request:',
    socialUrl,
    '',
    'If you do not recognize this request, you can ignore it.',
    'Nurse Command',
  ].join('\n')

  const html = `
    <div style="margin:0;background:#f5f9fc;padding:24px;font-family:Arial,Helvetica,sans-serif;color:#102033;">
      <div style="max-width:560px;margin:0 auto;border:1px solid #dbe8f2;border-radius:18px;background:#ffffff;overflow:hidden;">
        <div style="background:#063257;padding:22px 24px;color:#ffffff;">
          <p style="margin:0;font-size:13px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#b8ecff;">Nurse Command</p>
          <h1 style="margin:10px 0 0;font-size:24px;line-height:1.25;">${safeRequesterName} added you</h1>
        </div>
        <div style="padding:24px;">
          <p style="margin:0 0 14px;font-size:16px;line-height:1.7;">Hi ${safeRecipientName},</p>
          <p style="margin:0 0 18px;font-size:16px;line-height:1.7;">${safeRequesterName} sent you a connection request on Nurse Command.</p>
          <p style="margin:0 0 24px;font-size:15px;line-height:1.7;color:#52657a;">Open your Social inbox to accept or deny the request.</p>
          <p style="margin:0;"><a href="${safeSocialUrl}" style="display:inline-block;background:#063257;color:#ffffff;text-decoration:none;font-size:14px;font-weight:800;padding:13px 18px;border-radius:12px;">Open Social</a></p>
        </div>
        <div style="border-top:1px solid #e4edf6;padding:16px 24px;background:#fbfdff;font-size:12px;line-height:1.6;color:#70849b;">
          This email was sent because another Nurse Command learner requested to connect with this account. If you do not recognize it, you can ignore it.
        </div>
      </div>
    </div>`

  const body: Record<string, unknown> = {
    from,
    html,
    subject,
    text,
    to: recipientEmail,
  }
  if (replyTo) body.reply_to = replyTo

  const response = await fetch('https://api.resend.com/emails', {
    body: JSON.stringify(body),
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json',
    },
    method: 'POST',
  })

  const responseJson = await response.json().catch(() => null) as null | { id?: string; message?: string }
  if (!response.ok) {
    throw new Error(`Resend email failed: ${response.status} ${responseJson?.message ?? ''}`.trim())
  }

  return responseJson?.id ?? null
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (request.method !== 'POST') return json({ error: 'Method not allowed.' }, 405)

  const authorization = request.headers.get('authorization')
  if (!authorization?.startsWith('Bearer ')) {
    return json({ error: 'Authentication required.' }, 401)
  }

  const body = await request.json().catch(() => null) as null | { requestId?: string }
  const requestId = body?.requestId?.trim()
  if (!requestId || !uuidPattern.test(requestId)) {
    return json({ error: 'A valid friend request id is required.' }, 400)
  }

  const supabaseUrl = requiredEnv('SUPABASE_URL')
  const anonKey = requiredEnv('SUPABASE_ANON_KEY')
  const serviceRoleKey = requiredEnv('SUPABASE_SERVICE_ROLE_KEY')

  let notificationClaimed = false

  try {
    const user = await getAuthenticatedUser(supabaseUrl, anonKey, authorization)
    if (!user.id) return json({ error: 'Authentication required.' }, 401)

    const friendRequests = await fetchRows<FriendRequestRecord>(
      supabaseUrl,
      serviceRoleKey,
      `friend_requests?id=eq.${requestId}&select=id,requester_id,recipient_id,status,created_at&limit=1`,
    )
    const friendRequest = friendRequests[0]
    if (!friendRequest) return json({ error: 'Friend request was not found.' }, 404)
    if (friendRequest.requester_id !== user.id) return json({ error: 'Only the requester can send this notification.' }, 403)
    if (friendRequest.status !== 'pending') return json({ error: 'Only pending requests can be emailed.' }, 409)

    notificationClaimed = await claimNotification(supabaseUrl, serviceRoleKey, friendRequest)
    if (!notificationClaimed) return json({ sent: false, status: 'already_sent' })

    const resendApiKey = Deno.env.get('RESEND_API_KEY')
    const from = Deno.env.get('FRIEND_REQUEST_EMAIL_FROM')
    if (!resendApiKey || !from) {
      await patchNotification(supabaseUrl, serviceRoleKey, friendRequest.id, {
        error_message: 'RESEND_API_KEY and FRIEND_REQUEST_EMAIL_FROM are required.',
        status: 'not_configured',
      })
      return json({ error: 'Friend request email delivery is not configured.', sent: false }, 503)
    }

    const recipient = await getAuthUserById(supabaseUrl, serviceRoleKey, friendRequest.recipient_id)
    if (!recipient.email) {
      await patchNotification(supabaseUrl, serviceRoleKey, friendRequest.id, {
        error_message: 'Recipient account has no email address.',
        status: 'failed',
      })
      return json({ error: 'Recipient account has no email address.', sent: false }, 422)
    }

    const requesterName = await getProfileName(supabaseUrl, serviceRoleKey, friendRequest.requester_id, 'A learner')
    const recipientName = await getProfileName(supabaseUrl, serviceRoleKey, friendRequest.recipient_id, 'there')
    const providerMessageId = await sendFriendRequestEmail({
      appUrl: Deno.env.get('FRIEND_REQUEST_EMAIL_BASE_URL') ?? 'https://nursecommand.com',
      from,
      recipientEmail: recipient.email,
      recipientName,
      replyTo: Deno.env.get('FRIEND_REQUEST_EMAIL_REPLY_TO') ?? undefined,
      requesterName,
      resendApiKey,
    })

    await patchNotification(supabaseUrl, serviceRoleKey, friendRequest.id, {
      error_message: null,
      provider_message_id: providerMessageId,
      sent_at: new Date().toISOString(),
      status: 'sent',
    })

    return json({ providerMessageId, sent: true })
  } catch (error) {
    if (notificationClaimed) {
      await patchNotification(supabaseUrl, serviceRoleKey, requestId, {
        error_message: error instanceof Error ? error.message.slice(0, 500) : 'Unknown email error.',
        status: 'failed',
      }).catch(() => undefined)
    }
    return json({ error: 'Could not send friend request email notification.', sent: false }, 500)
  }
})

