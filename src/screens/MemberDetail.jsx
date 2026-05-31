import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { MOCK_MEMBERS } from './CoachDashboard'
import CoachNav from '../components/CoachNav'

const STATUS_COLORS = { 'ON TRACK': 'var(--success)', 'AT RISK': 'var(--warning)', 'INACTIVE': 'var(--danger)' }

const MOCK_OBJECTIVES = {
  default: ['5 séances cette semaine', '2500 kcal/jour', '8h de sommeil', '10 000 pas/jour']
}

const weekDays = ['L', 'M', 'M', 'J', 'V', 'S', 'D']

export default function MemberDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [analysis, setAnalysis] = useState('')
  const [loading, setLoading] = useState(false)
  const [showMessage, setShowMessage] = useState(false)
  const [message, setMessage] = useState('')
  const [msgSent, setMsgSent] = useState(false)

  const member = MOCK_MEMBERS.find(m => m.id === parseInt(id))
  if (!member) return (
    <div className="app-wrapper"><div className="screen"><p className="text-base text-muted" style={{ marginTop: 40 }}>Membre introuvable.</p></div></div>
  )

  const color = STATUS_COLORS[member.status] || 'var(--text-muted)'

  // Mock weekly sessions data
  const sessionsSeed = [1,0,1,1,0,0,0].map((v, i) => ({ day: weekDays[i], count: (member.id + i) % 3 === 0 ? 1 : v }))

  async function generateAnalysis() {
    setLoading(true)
    setAnalysis('')
    try {
      const res = await fetch('/api/claude', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 400,
          system: `Tu es Thomas, coach chez ON AIR Fitness Clichy. Bilan court sur ${member.name}. Données : séances ${member.sessions}/mois, dernière visite ${member.lastSeen}, calories ${member.calories} kcal, sommeil ${member.sleep}, pas ${member.steps}, statut ${member.status}, objectif ${member.goal}. 3 phrases max. Direct, pro, actionnable. Termine par une reco concrète. Pas de bullet points. Pas de titre.`,
          messages: [{ role: 'user', content: `Bilan pour ${member.name}` }],
        }),
      })
      if (!res.ok) throw new Error()
      const data = await res.json()
      setAnalysis(data.content[0].text)
    } catch {
      setAnalysis('Erreur lors de la génération. Réessaie.')
    } finally {
      setLoading(false)
    }
  }

  function sendMessage() {
    setMsgSent(true)
    setTimeout(() => { setShowMessage(false); setMsgSent(false); setMessage('') }, 1500)
  }

  return (
    <div className="app-wrapper">
      <div className="screen" style={{ paddingBottom: 110 }}>
        <div className="screen-header" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '20px 0 8px' }}>
          <button style={{ background: 'none', border: 'none', cursor: 'pointer' }} onClick={() => navigate('/coach')}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--text-primary)" strokeWidth="1.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          <h1 className="text-xl bold" style={{ flex: 1 }}>{member.name}</h1>
          <span style={{ border: `1px solid ${color}`, color, fontSize: 9, padding: '3px 8px', borderRadius: 4, letterSpacing: 1, textTransform: 'uppercase', fontWeight: 700 }}>{member.status}</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
          {[
            { label: 'Objectif', val: member.goal },
            { label: 'Séances', val: member.sessions },
            { label: 'Calories moy.', val: `${member.calories} kcal` },
            { label: 'Sommeil moy.', val: member.sleep },
            { label: 'Pas/jour', val: member.steps.toLocaleString() },
            { label: 'Poids', val: `${member.weight} kg` },
          ].map(s => (
            <div key={s.label} className="card card-animated" style={{ '--delay': '0ms', padding: '12px 16px' }}>
              <div className="text-xs text-muted">{s.label}</div>
              <div className="text-sm bold" style={{ marginTop: 4 }}>{s.val}</div>
            </div>
          ))}
        </div>

        {/* Weekly sessions chart */}
        <div className="section-label">SÉANCES CETTE SEMAINE</div>
        <div className="card" style={{ marginBottom: 8 }}>
          <div style={{ width: '100%' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
              {sessionsSeed.map((d, i) => (
                <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                  <div style={{ width: '100%', height: d.count > 0 ? 36 : 6, background: d.count > 0 ? 'var(--accent)' : 'var(--border)', borderRadius: '3px 3px 0 0' }} />
                  <span style={{ fontSize: 9, color: 'var(--text-muted)', overflow: 'hidden', width: '100%', textAlign: 'center' }}>{d.day}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Objectives */}
        <div className="section-label">OBJECTIFS ASSIGNÉS</div>
        <div className="card" style={{ marginBottom: 8 }}>
          {MOCK_OBJECTIVES.default.map((obj, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: i < MOCK_OBJECTIVES.default.length - 1 ? '0.5px solid var(--border)' : 'none' }}>
              <div style={{ width: 18, height: 18, borderRadius: '50%', border: '1.5px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: i % 2 === 0 ? 'var(--success)' : 'var(--border)' }} />
              </div>
              <span className="text-sm">{obj}</span>
            </div>
          ))}
          <button style={{ background: 'none', border: '0.5px dashed var(--border)', color: 'var(--accent)', fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', padding: '8px 16px', borderRadius: 8, cursor: 'pointer', width: '100%', marginTop: 10 }}>
            + ASSIGNER UN OBJECTIF
          </button>
        </div>

        {/* Message button */}
        <button className="btn-ghost" style={{ marginBottom: 16 }} onClick={() => setShowMessage(true)}>
          ENVOYER UN MESSAGE
        </button>

        {/* AI Analysis */}
        <div className="section-label">ANALYSE IA</div>
        <button className="btn-accent" onClick={generateAnalysis} disabled={loading} style={{ opacity: loading ? 0.7 : 1, marginBottom: analysis ? 0 : 16 }}>
          {loading ? 'GÉNÉRATION EN COURS...' : 'GÉNÉRER ANALYSE IA'}
        </button>
        {analysis && (
          <div className="card" style={{ marginTop: 12, animation: 'fadeIn 400ms ease-out' }}>
            <p className="text-base" style={{ lineHeight: '24px' }}>{analysis}</p>
            <p className="text-xs text-muted" style={{ marginTop: 10 }}>Généré par AI Coach ON AIR</p>
          </div>
        )}
        <style>{`@keyframes fadeIn { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }`}</style>
      </div>

      {/* Message modal */}
      {showMessage && (
        <>
          <div onClick={() => setShowMessage(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 200 }} />
          <div style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 390, background: 'var(--surface)', borderRadius: '20px 20px 0 0', padding: '24px 20px 40px', zIndex: 201 }}>
            <h2 className="text-lg bold" style={{ marginBottom: 16 }}>Message à {member.name}</h2>
            <textarea value={message} onChange={e => setMessage(e.target.value)} placeholder="Écris ton message..." style={{ width: '100%', minHeight: 100, background: 'var(--surface-2)', border: '0.5px solid var(--border)', borderRadius: 10, color: 'var(--text-primary)', fontSize: 15, padding: '12px', resize: 'none', outline: 'none', fontFamily: 'inherit' }} />
            <button className="btn-accent" onClick={sendMessage} style={{ marginTop: 12 }}>
              {msgSent ? '✓ ENVOYÉ' : 'ENVOYER'}
            </button>
          </div>
        </>
      )}
      <CoachNav />
    </div>
  )
}
