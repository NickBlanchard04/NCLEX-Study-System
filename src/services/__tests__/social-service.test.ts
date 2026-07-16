import { beforeEach, describe, expect, it, vi } from 'vitest'

const supabaseMocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  from: vi.fn(),
}))

vi.mock('../supabase', () => ({
  isSupabaseConfigured: true,
  supabase: {
    auth: { getUser: supabaseMocks.getUser },
    from: supabaseMocks.from,
  },
}))

import { listConversation, sendSocialMessage } from '../social-service'

describe('social messaging service', () => {
  beforeEach(() => {
    supabaseMocks.getUser.mockReset()
    supabaseMocks.from.mockReset()
    supabaseMocks.getUser.mockResolvedValue({ data: { user: { id: 'viewer-id' } }, error: null })
  })

  it('loads only the two-party conversation in chronological order', async () => {
    const listChain = {
      select: vi.fn(),
      or: vi.fn(),
      is: vi.fn(),
      order: vi.fn(),
      limit: vi.fn(),
    }
    listChain.select.mockReturnValue(listChain)
    listChain.or.mockReturnValue(listChain)
    listChain.is.mockReturnValue(listChain)
    listChain.order.mockReturnValue(listChain)
    listChain.limit.mockResolvedValue({
      data: [{
        id: 'message-1',
        sender_id: 'viewer-id',
        recipient_id: 'friend-id',
        body: 'Study at 7?',
        read_at: null,
        created_at: '2026-07-15T12:00:00.000Z',
      }],
      error: null,
    })
    supabaseMocks.from.mockReturnValue(listChain)

    await expect(listConversation('friend-id')).resolves.toEqual([{
      id: 'message-1',
      senderId: 'viewer-id',
      recipientId: 'friend-id',
      body: 'Study at 7?',
      readAt: undefined,
      createdAt: '2026-07-15T12:00:00.000Z',
    }])
    expect(supabaseMocks.from).toHaveBeenCalledWith('social_messages')
    expect(listChain.or).toHaveBeenCalledWith(
      'and(sender_id.eq.viewer-id,recipient_id.eq.friend-id),and(sender_id.eq.friend-id,recipient_id.eq.viewer-id)',
    )
    expect(listChain.is).toHaveBeenCalledWith('deleted_at', null)
    expect(listChain.order).toHaveBeenCalledWith('created_at', { ascending: true })
  })

  it('trims and sends a friends-only message as the signed-in user', async () => {
    const insertChain = {
      insert: vi.fn(),
      select: vi.fn(),
      single: vi.fn(),
    }
    insertChain.insert.mockReturnValue(insertChain)
    insertChain.select.mockReturnValue(insertChain)
    insertChain.single.mockResolvedValue({
      data: {
        id: 'message-2',
        sender_id: 'viewer-id',
        recipient_id: 'friend-id',
        body: 'Ready to review?',
        read_at: null,
        created_at: '2026-07-15T12:05:00.000Z',
      },
      error: null,
    })
    supabaseMocks.from.mockReturnValue(insertChain)

    await expect(sendSocialMessage('friend-id', '  Ready to review?  ')).resolves.toMatchObject({
      id: 'message-2',
      senderId: 'viewer-id',
      recipientId: 'friend-id',
      body: 'Ready to review?',
    })
    expect(insertChain.insert).toHaveBeenCalledWith({
      sender_id: 'viewer-id',
      recipient_id: 'friend-id',
      body: 'Ready to review?',
    })
  })

  it('rejects empty and oversized messages before contacting Supabase', async () => {
    await expect(sendSocialMessage('friend-id', '   ')).rejects.toThrow('Write a message')
    await expect(sendSocialMessage('friend-id', 'a'.repeat(1001))).rejects.toThrow('1,000 characters')
    expect(supabaseMocks.getUser).not.toHaveBeenCalled()
  })
})
