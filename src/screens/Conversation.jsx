import { useState, useRef, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import CoachNav from '../components/CoachNav'
import { MOCK_MEMBERS } from './CoachDashboard'

const INITIAL_MESSAGES = [
  { id:1, from:'coach', text:"Salut Léo, belle séance aujourd'hui", time:'09:14' },
  { id:2, from:'member', text:'Merci Thomas ! Je me suis vraiment donné sur les squats', time:'09:18' },
  { id:3, from:'coach', text:'Ça se voit dans tes stats. Ton volume a augmenté de 15% cette semaine.', time:'09:20' },
  { id:4, from:'member', text:'Trop bien ! On fait quoi demain ?', time:'09:21' },
  { id:5, from:'coach', text:'Pull day demain. Je te prépare le programme ce soir.', time:'09:22' },
]

export default function Conversation({ isCoach = false }) {
  const navigate = useNavigate()
  const { memberId } = useParams()
  const { user } = useAuth()
  const [messages, setMessages] = useState(INITIAL_MESSAGES)
  const [input, setInput] = useState('')
  const bottomRef = useRef(null)
  const member = memberId ? MOCK_MEMBERS.find(m => m.id === parseInt(memberId)) : null
  const title = isCoach ? (member?.name || 'Membre') : 'Thomas · Coach ON AIR'

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  function send() {
    if (!input.trim()) return
    const now = new Date()
    const t = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`
    setMessages(prev => [...prev, { id: Date.now(), from: isCoach ? 'coach' : 'member', text: input, time: t }])
    setInput('')
  }

  const myRole = isCoach ? 'coach' : 'member'

  return (
    <div className="app-wrapper" style={{ height: '100vh', overflow: 'hidden', position: 'relative' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '20px 16px 12px', borderBottom: '0.5px solid var(--border)', background: 'var(--bg)', position: 'sticky', top: 0, zIndex: 10 }}>
        <button style={{ background: 'none', border: 'none', cursor: 'pointer' }} onClick={() => navigate(isCoach ? '/coach/messages' : '/messages')}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--text-primary)" strokeWidth="1.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: '#000', flexShrink: 0 }}>
          {isCoach ? (member?.name?.[0] || 'M') : 'TH'}
        </div>
        <h1 className="text-base bold">{title}</h1>
      </div>

      <div style={{ position: 'absolute', top: 73, left: 0, right: 0, bottom: 100, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {messages.map(m => {
          const isMine = m.from === myRole
          return (
            <div key={m.id} style={{ display: 'flex', flexDirection: 'column', alignItems: isMine ? 'flex-end' : 'flex-start' }}>
              <div style={{
                maxWidth: '75%', padding: '10px 14px', fontSize: 15, lineHeight: '1.4',
                background: isMine ? 'var(--accent)' : 'var(--surface-2)',
                color: isMine ? '#fff' : 'var(--text-primary)',
                borderRadius: isMine ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
              }}>{m.text}</div>
              <span style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>{m.time}</span>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      <div style={{ position: 'fixed', bottom: 100, left: '50%', transform: 'translateX(-50%)', width: 'calc(100% - 32px)', maxWidth: 358, display: 'flex', gap: 8, alignItems: 'center', zIndex: 90, background: 'var(--bg)', paddingTop: 8 }}>
        <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && send()} placeholder="Message..." style={{ flex: 1, background: 'var(--surface-2)', border: '0.5px solid var(--border)', borderRadius: 24, padding: '12px 16px' }} />
        <button onClick={send} style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--accent)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="#000"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
        </button>
      </div>

      {isCoach ? <CoachNav /> : <BottomNav />}
    </div>
  )
}
