import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useApp } from '../context/AppContext'
import { useLanguage } from '../context/LanguageContext'
import { authHeader } from '../lib/supabase'

const LANG_NAMES = { fr: 'français', en: 'English', es: 'español' }

function TypingIndicator() {
  return (
    <div style={{ display: 'flex', gap: 4, padding: '12px 16px', alignItems: 'center' }}>
      {[0,1,2].map(i => (
        <div key={i} style={{
          width: 6, height: 6, borderRadius: '50%',
          background: 'var(--text-muted)',
          animation: `dotPulse 1.2s ${i*0.2}s ease-in-out infinite`,
        }} />
      ))}
      <style>{`
        @keyframes dotPulse {
          0%,80%,100% { opacity: 0.3; transform: scale(0.8); }
          40% { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  )
}

export default function AICoach() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { appData } = useApp()
  const { lang, t } = useLanguage()
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: `Salut ${user?.name} ! Je suis ton coach IA ON AIR. J'ai accès à toutes tes données du jour. Qu'est-ce qu'on fait ?`,
      ts: new Date(),
    }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef(null)
  const messagesRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const quickPrompts = [
    "Comment j'ai géré ma semaine ?",
    "Donne-moi un défi pour aujourd'hui",
    "Mes points faibles ?",
    "Qu'est-ce que je mange ce soir ?",
  ]

  async function sendMessage(text) {
    if (!text.trim() || loading) return
    const userMsg = { role: 'user', content: text, ts: new Date() }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)

    const history = [...messages, userMsg].map(m => ({ role: m.role, content: m.content }))

    try {
      const res = await fetch('/api/claude', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(await authHeader()),
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 1000,
          system: `T'es le coach IA de ${user?.name} chez ON AIR Fitness.

Tu as accès à toutes ses données :
- Calories aujourd'hui : ${appData?.calories || 0} / ${appData?.calorieGoal || 2400} kcal
- Pas : ${appData?.steps || 0}
- Km courus : ${appData?.kmRun || 0}
- Hydratation : ${appData?.water || 0}ml
- Sommeil : ${appData?.sleep?.hours || 0}h${appData?.sleep?.minutes || 0}min
- Séances cette semaine : ${appData?.weeklyWorkouts || 0}/6
- Objectif : ${user?.goal || 'Prise de masse'}

TON STYLE — OBLIGATOIRE :
— Tu tutoies toujours. Jamais de "vous".
— Tu parles comme un pote coach : direct, motivant, chaleureux. Pas robotique.
— Tu fais des blagues légères si le contexte s'y prête.
— Exemples de ton : "Allez ${user?.name}, t'as trop assuré cette semaine 💪", "Bois de l'eau mec, 1200ml c'est pas assez", "Là t'es en mode beast, continue comme ça"
— Réponses courtes et percutantes. Max 3-4 phrases.
— Tu utilises les vraies données. Jamais de réponses génériques.
— Si le sommeil est mauvais tu le signales. Si les calories sont basses tu interroges.
— Tu termines parfois par une question ou un défi court.
— LANGUE : Réponds toujours en ${lang === 'fr' ? 'français' : lang === 'en' ? 'anglais' : 'espagnol'}.`,
          messages: history,
        }),
      })

      if (!res.ok) throw new Error('API error')
      const data = await res.json()
      const aiMsg = { role: 'assistant', content: data.content[0].text, ts: new Date() }
      setMessages(prev => [...prev, aiMsg])
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Connexion perdue. Réessaie.',
        ts: new Date(),
        error: true,
      }])
    } finally {
      setLoading(false)
    }
  }

  function fmt(d) {
    return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="app-wrapper" style={{ position: 'relative', height: '100vh', overflow: 'hidden' }}>
      {/* Header */}
      <div className="screen-header" style={{
        padding: '20px 16px 12px',
        borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', gap: 12,
        flexShrink: 0,
        background: 'var(--bg)',
        position: 'sticky', top: 0, zIndex: 10,
      }}>
        <button style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }} onClick={() => navigate('/dashboard')}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="var(--text-primary)">
            <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
          </svg>
        </button>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, lineHeight: '28px' }}>{t('ai_coach_title')}</h1>
          <span style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{t('powered_by')}</span>
        </div>
      </div>

      {/* Messages */}
      <div
        ref={messagesRef}
        style={{
          position: 'absolute',
          top: 73,
          left: 0, right: 0,
          bottom: 185,
          overflowY: 'auto',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}
      >
        {messages.map((m, i) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
            <div style={{
              maxWidth: '80%',
              padding: '12px 16px',
              borderRadius: m.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
              background: m.role === 'user' ? 'var(--accent)' : 'var(--surface)',
              border: m.role === 'user' ? 'none' : `1px solid ${m.error ? 'var(--danger)' : 'var(--border)'}`,
              color: m.role === 'user' ? '#000' : 'var(--text-primary)',
              fontSize: 15,
              lineHeight: '22px',
            }}>
              {m.content}
            </div>
            <span style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{fmt(m.ts)}</span>
          </div>
        ))}
        {loading && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '16px 16px 16px 4px' }}>
              <TypingIndicator />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input area — fixed above nav */}
      <div style={{
        position: 'fixed',
        bottom: 100,
        left: '50%',
        transform: 'translateX(-50%)',
        width: 'calc(100% - 32px)',
        maxWidth: 358,
        zIndex: 90,
        background: 'var(--bg)',
        borderTop: '1px solid var(--border)',
        paddingTop: 12,
      }}>
        {/* Quick prompts */}
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', marginBottom: 10, paddingBottom: 2 }}>
          {quickPrompts.map(p => (
            <button key={p} onClick={() => sendMessage(p)} style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              color: 'var(--text-secondary)',
              fontSize: 12,
              padding: '6px 12px',
              borderRadius: 50,
              whiteSpace: 'nowrap',
              cursor: 'pointer',
              flexShrink: 0,
            }}>{p}</button>
          ))}
        </div>
        {/* Text input */}
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && sendMessage(input)}
            placeholder={t('chat_placeholder')}
            style={{ flex: 1, borderRadius: 10 }}
          />
          <button onClick={() => sendMessage(input)} style={{
            background: 'var(--accent)',
            border: 'none',
            color: 'var(--accent-ink)',
            padding: '0 20px',
            cursor: 'pointer',
            borderRadius: 10,
            flexShrink: 0,
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="var(--accent-ink)">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
            </svg>
          </button>
        </div>
      </div>


    </div>
  )
}
