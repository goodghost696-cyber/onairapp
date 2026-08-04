import { supabase } from '../lib/supabase'

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

export async function sendMessage(senderId, receiverId, content) {
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
  return { success: true, message: data }
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
