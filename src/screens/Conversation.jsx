import { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { fetchPrimaryCoach, fetchConversation, sendMessage, markConversationRead, subscribeToMessages } from '../utils/messages'
import CoachNav from '../components/CoachNav'
import BottomNav from '../components/BottomNav'

function formatTime(iso) {
  const d = new Date(iso)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export default function Conversation({ isCoach = false }) {
  const navigate = useNavigate()
  const { memberId } = useParams()
  const { user } = useAuth()
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [member, setMember] = useState(null)
  // The other participant's auth user_id — resolved differently depending
  // on which side we're on (coach picks a specific member from the route,
  // member always talks to the single primary coach).
  const [otherUserId, setOtherUserId] = useState(null)
  const [loading, setLoading] = useState(true)
  const bottomRef = useRef(null)

  // Resolve the counterpart.
  useEffect(() => {
    let cancelled = false
    async function resolve() {
      if (isCoach) {
        if (!memberId) return
        const { data } = await supabase.from('profiles').select('*').eq('id', memberId).single()
        if (!cancelled && data) {
          setMember(data)
          setOtherUserId(data.user_id)
        }
      } else {
        const coach = await fetchPrimaryCoach()
        if (!cancelled && coach) {
          setMember(coach)
          setOtherUserId(coach.user_id)
        }
      }
    }
    resolve()
    return () => { cancelled = true }
  }, [isCoach, memberId])

  const title = isCoach ? (member?.prenom || 'Membre') : (member?.prenom ? `${member.prenom} · Coach ON AIR` : 'Coach ON AIR')

  // Load history + mark it read once we know both participants.
  useEffect(() => {
    if (!user?.id || !otherUserId) return
    let cancelled = false
    setLoading(true)
    fetchConversation(user.id, otherUserId).then(data => {
      if (cancelled) return
      setMessages(data)
      setLoading(false)
      markConversationRead(user.id, otherUserId)
    })
    return () => { cancelled = true }
  }, [user?.id, otherUserId])

  // Live updates — covers both the other side sending a message and our
  // own message echoing back, so two devices logged in as each role stay
  // in sync without a refresh.
  const onInsert = useCallback(row => {
    if (!otherUserId) return
    const belongsHere = (row.sender_id === otherUserId || row.receiver_id === otherUserId)
    if (!belongsHere) return
    setMessages(prev => prev.some(m => m.id === row.id) ? prev : [...prev, row])
    if (row.receiver_id === user?.id) markConversationRead(user.id, otherUserId)
  }, [otherUserId, user?.id])

  useEffect(() => {
    if (!user?.id) return
    return subscribeToMessages(user.id, onInsert)
  }, [user?.id, onInsert])

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  async function send() {
    const text = input.trim()
    if (!text || !user?.id || !otherUserId) return
    setInput('')
    const { success, message, error } = await sendMessage(user.id, otherUserId, text)
    if (success) {
      setMessages(prev => prev.some(m => m.id === message.id) ? prev : [...prev, message])
    } else {
      console.error('[Conversation] send failed', error)
      setInput(text)
    }
  }

  return (
    <div className="app-wrapper" style={{ height: '100vh', overflow: 'hidden', position: 'relative' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '20px 16px 12px', borderBottom: '0.5px solid var(--border)', background: 'var(--bg)', position: 'sticky', top: 0, zIndex: 10 }}>
        <button style={{ background: 'none', border: 'none', cursor: 'pointer' }} onClick={() => navigate(isCoach ? '/coach/messages' : '/messages')}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--text-primary)" strokeWidth="1.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: 'var(--accent-ink)', flexShrink: 0 }}>
          {(member?.prenom?.[0] || '?').toUpperCase()}
        </div>
        <h1 className="text-base bold">{title}</h1>
      </div>

      <div style={{ position: 'absolute', top: 73, left: 0, right: 0, bottom: 100, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {loading && <p className="text-sm text-muted">Chargement...</p>}
        {!loading && messages.length === 0 && <p className="text-sm text-muted">Aucun message pour l'instant — écris le premier.</p>}
        {messages.map(m => {
          const isMine = m.sender_id === user?.id
          return (
            <div key={m.id} style={{ display: 'flex', flexDirection: 'column', alignItems: isMine ? 'flex-end' : 'flex-start' }}>
              <div style={{
                maxWidth: '75%', padding: '10px 14px', fontSize: 15, lineHeight: '1.4',
                background: isMine ? 'var(--accent)' : 'var(--surface-2)',
                color: isMine ? 'var(--accent-ink)' : 'var(--text-primary)',
                borderRadius: isMine ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
              }}>{m.content}</div>
              <span style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>{formatTime(m.created_at)}</span>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      <div style={{ position: 'fixed', bottom: 100, left: '50%', transform: 'translateX(-50%)', width: 'calc(100% - 32px)', maxWidth: 358, display: 'flex', gap: 8, alignItems: 'center', zIndex: 90, background: 'var(--bg)', paddingTop: 8 }}>
        <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && send()} placeholder="Message..." style={{ flex: 1, background: 'var(--surface-2)', border: '0.5px solid var(--border)', borderRadius: 24, padding: '12px 16px' }} />
        <button onClick={send} disabled={!otherUserId} style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--accent)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="var(--accent-ink)"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
        </button>
      </div>

      {isCoach ? <CoachNav /> : <BottomNav />}
    </div>
  )
}
