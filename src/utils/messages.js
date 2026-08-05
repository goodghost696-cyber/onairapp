import { supabase, authHeader } from '../lib/supabase'

// Single-coach-per-gym model (same assumption as the rest of the app —
// Login/App.jsx route every coach/admin account to the same /coach space).
// Picks the earliest-created coach/admin profile as "the" coach a member
// talks to.
export async function fetchPrimaryCoach() {
  const { data, error } = await supabase
    .from('profiles')
    .select('user_id, prenom, email')
    .in('role', ['coach', 'admin'])
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()
  if (error) {
    console.error('[messages] fetchPrimaryCoach failed', error)
    return null
  }
  return data
}

// Full thread between the current user and one counterpart, oldest first.
export async function fetchConversation(currentUserId, otherUserId) {
  if (!currentUserId || !otherUserId) return []
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .or(`and(sender_id.eq.${currentUserId},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${currentUserId})`)
    .order('created_at', { ascending: true })
  if (error) {
    console.error('[messages] fetchConversation failed', error)
    return []
  }
  return data
}

// `meta.senderIsCoach` + `meta.senderName` let the push notification say the
// right thing and deep-link to the right screen without an extra round trip
// in the common case — see notifyReceiver below.
export async function sendMessage(senderId, receiverId, content, meta = {}) {
  const trimmed = content.trim()
  if (!trimmed || !senderId || !receiverId) return { success: false }
  const { data, error } = await supabase
    .from('messages')
    .insert({ sender_id: senderId, receiver_id: receiverId, content: trimmed })
    .select()
    .single()
  if (error) {
    console.error('[messages] sendMessage failed', error)
    return { success: false, error }
  }

  // Best-effort push, both directions — the endpoint reads the receiver's
  // subscriptions using OUR (the sender's) token, gated by the "Coaches can
  // view member push subscriptions" / "Members can view coach push
  // subscriptions" RLS policies, so this silently no-ops (0 sent) for
  // anyone without that relationship rather than needing a role check here.
  // Never blocks or fails the send itself.
  notifyReceiver(receiverId, trimmed, senderId, meta).catch(err => console.error('[messages] push notify failed', err))

  return { success: true, message: data }
}

async function notifyReceiver(receiverId, content, senderId, { senderIsCoach, senderName } = {}) {
  const headers = await authHeader()
  if (!headers.Authorization) return

  let title, url
  if (senderIsCoach) {
    title = 'Ton coach t’a écrit'
    url = '/messages/coach'
  } else {
    title = `${senderName || 'Un membre'} t’a écrit`
    // The coach's conversation route is keyed by the member's *profile* id
    // (/coach/messages/:memberId), not their auth user_id — resolve it here
    // rather than plumbing it through every call site. Self-row lookup
    // (senderId is always the caller), so RLS allows it unconditionally.
    const { data: profile } = await supabase.from('profiles').select('id').eq('user_id', senderId).maybeSingle()
    url = profile ? `/coach/messages/${profile.id}` : '/coach/messages'
  }

  await fetch('/api/send-push', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify({
      receiverId,
      title,
      body: content.length > 100 ? `${content.slice(0, 100)}…` : content,
      url,
    }),
  })
}

// Marks every unread message from `otherUserId` to `currentUserId` as read.
export async function markConversationRead(currentUserId, otherUserId) {
  if (!currentUserId || !otherUserId) return
  const { error } = await supabase
    .from('messages')
    .update({ read_at: new Date().toISOString() })
    .eq('receiver_id', currentUserId)
    .eq('sender_id', otherUserId)
    .is('read_at', null)
  if (error) console.error('[messages] markConversationRead failed', error)
}

// Total unread count across every conversation for the current user — a
// count-only query (head: true), not a full row fetch, since nav bars call
// this on every mount.
export async function fetchUnreadCount(userId) {
  if (!userId) return 0
  const { count, error } = await supabase
    .from('messages')
    .select('id', { count: 'exact', head: true })
    .eq('receiver_id', userId)
    .is('read_at', null)
  if (error) {
    console.error('[messages] fetchUnreadCount failed', error)
    return 0
  }
  return count || 0
}

// Live updates for a conversation — Postgres changes filters can't express
// an OR across two columns, so two subscriptions cover both directions.
export function subscribeToMessages(currentUserId, onInsert) {
  if (!currentUserId) return () => {}
  const channel = supabase
    .channel(`messages-${currentUserId}`)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `receiver_id=eq.${currentUserId}` }, payload => onInsert(payload.new))
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `sender_id=eq.${currentUserId}` }, payload => onInsert(payload.new))
    .subscribe()
  return () => supabase.removeChannel(channel)
}

// Last message + unread count per counterpart, from every message that
// touches the current user — one query total (not one per client), same
// approach as fetchMemberActivitySummaries in coachStats.js.
export async function fetchConversationSummaries(currentUserId) {
  if (!currentUserId) return {}
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .or(`sender_id.eq.${currentUserId},receiver_id.eq.${currentUserId}`)
    .order('created_at', { ascending: false })
  if (error) {
    console.error('[messages] fetchConversationSummaries failed', error)
    return {}
  }
  const summaries = {}
  for (const m of data) {
    const otherId = m.sender_id === currentUserId ? m.receiver_id : m.sender_id
    if (!summaries[otherId]) summaries[otherId] = { lastMessage: m, unreadCount: 0 }
    if (m.receiver_id === currentUserId && !m.read_at) summaries[otherId].unreadCount += 1
  }
  return summaries
}
