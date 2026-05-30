import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const API_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY

const MOCK_MEMBERS = [
  { id: 2, name: 'Léo', lastSeen: 'Aujourd\'hui', sessions: 5, status: 'ON TRACK', calories: 1847, sleep: '7h23', steps: 8247 },
  { id: 3, name: 'Sarah', lastSeen: 'Hier', sessions: 3, status: 'AT RISK', calories: 1200, sleep: '4h50', steps: 4200 },
  { id: 4, name: 'Marcus', lastSeen: 'Il y a 5 jours', sessions: 1, status: 'INACTIVE', calories: 900, sleep: '6h10', steps: 2100 },
  { id: 5, name: 'Amina', lastSeen: 'Aujourd\'hui', sessions: 6, status: 'ON TRACK', calories: 2100, sleep: '8h05', steps: 11000 },
]

const STATUS_COLORS = {
  'ON TRACK': 'var(--success)',
  'AT RISK': 'var(--warning)',
  'INACTIVE': 'var(--danger)',
}

export default function MemberDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [analysis, setAnalysis] = useState('')
  const [loading, setLoading] = useState(false)

  const member = MOCK_MEMBERS.find(m => m.id === parseInt(id))
  if (!member) return <div className="app-wrapper"><div className="screen"><p className="text-base text-muted" style={{marginTop:40}}>Membre introuvable.</p></div></div>

  async function generateAnalysis() {
    setLoading(true)
    setAnalysis('')
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': API_KEY,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-calls': 'true',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 400,
          system: `Tu es Thomas, coach chez ON AIR Fitness Clichy.
Tu dois faire un bilan court et précis sur un de tes adhérents.

Données de ${member.name} :
- Séances ce mois : ${member.sessions}
- Dernière visite : ${member.lastSeen}
- Calories moy. : ${member.calories} kcal
- Sommeil moy. : ${member.sleep}
- Pas/jour moy. : ${member.steps}
- Statut : ${member.status}

Génère un bilan coach de 3 phrases maximum. Direct, professionnel, actionnable.
Termine par une recommandation concrète pour la semaine.
Pas de bullet points. Pas de titre. Juste le texte.`,
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

  const color = STATUS_COLORS[member.status] || 'var(--text-muted)'

  return (
    <div className="app-wrapper">
      <div className="screen" style={{ paddingBottom: 40 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '20px 0 8px' }}>
          <button style={{ background: 'none', border: 'none', cursor: 'pointer' }} onClick={() => navigate('/coach')}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="var(--text-primary)">
              <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
            </svg>
          </button>
          <div style={{ flex: 1 }}>
            <h1 className="text-xl bold">{member.name}</h1>
          </div>
          <span style={{
            border: `1px solid ${color}`, color,
            fontSize: 10, padding: '3px 8px',
            letterSpacing: 1, textTransform: 'uppercase', fontWeight: 700,
          }}>{member.status}</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
          {[
            { label: 'Séances', val: member.sessions },
            { label: 'Dernière visite', val: member.lastSeen },
            { label: 'Calories moy.', val: `${member.calories} kcal` },
            { label: 'Sommeil moy.', val: member.sleep },
            { label: 'Pas/jour', val: member.steps.toLocaleString() },
          ].map(s => (
            <div key={s.label} className="card" style={{ padding: '14px 16px' }}>
              <div className="text-xs text-muted">{s.label}</div>
              <div className="text-base bold" style={{ marginTop: 4 }}>{s.val}</div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 24 }}>
          <div className="section-label">ANALYSE IA</div>
          <button
            className="btn-accent"
            onClick={generateAnalysis}
            disabled={loading}
            style={{ opacity: loading ? 0.7 : 1 }}
          >
            {loading ? 'GÉNÉRATION EN COURS...' : 'GÉNÉRER ANALYSE IA'}
          </button>

          {analysis && (
            <div className="card" style={{ marginTop: 16, animation: 'fadeIn 400ms ease-out' }}>
              <p className="text-base" style={{ lineHeight: '24px' }}>{analysis}</p>
              <p className="text-xs text-muted" style={{ marginTop: 12 }}>Généré par AI Coach ON AIR</p>
            </div>
          )}
        </div>

        <style>{`
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(8px); }
            to { opacity: 1; transform: translateY(0); }
          }
        `}</style>
      </div>
    </div>
  )
}
