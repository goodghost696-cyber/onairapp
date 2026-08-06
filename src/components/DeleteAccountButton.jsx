import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { authHeader } from '../lib/supabase'

// Irreversible + destroys everything (via the DB's own on-delete-cascade —
// see api/delete-account.js), so this asks for a typed confirmation rather
// than a single tap, same bar as e.g. deleting a whole GitHub repo. Shared
// between Settings.jsx (member) and CoachSettings.jsx (coach) — the account
// section on both screens looked and worked identically otherwise.
export default function DeleteAccountButton() {
  const navigate = useNavigate()
  const { logout } = useAuth()
  const [open, setOpen] = useState(false)
  const [confirmText, setConfirmText] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleDelete() {
    if (confirmText.trim().toUpperCase() !== 'SUPPRIMER') return
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/delete-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(await authHeader()) },
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || `HTTP ${res.status}`)
      }
      await logout()
      navigate('/')
    } catch (err) {
      setError(err.message || 'La suppression a échoué, réessaie.')
      setLoading(false)
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        style={{
          width: '100%', padding: 16, background: 'transparent', border: '2px solid var(--danger)',
          color: 'var(--danger)', fontSize: 11, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase',
          borderRadius: 12, cursor: 'pointer', opacity: 0.7,
        }}
      >
        Supprimer mon compte
      </button>

      {open && (
        <>
          <div onClick={() => !loading && setOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 199 }} />
          <div style={{
            position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
            width: '100%', maxWidth: 480, background: 'var(--surface-solid)',
            backdropFilter: 'blur(40px)', WebkitBackdropFilter: 'blur(40px)',
            borderRadius: '20px 20px 0 0', borderTop: '1px solid var(--glass-border)',
            padding: '24px 20px 40px', zIndex: 200,
          }}>
            <h2 className="text-lg bold" style={{ marginBottom: 8, color: 'var(--danger)' }}>Supprimer définitivement ton compte ?</h2>
            <p className="text-sm text-muted" style={{ marginBottom: 20 }}>
              Toutes tes données seront effacées pour toujours : repas, séances, historique, objectifs. C'est irréversible.
            </p>
            <label className="text-xs text-muted" style={{ display: 'block', marginBottom: 8 }}>
              Tape SUPPRIMER pour confirmer
            </label>
            <input
              value={confirmText}
              onChange={e => setConfirmText(e.target.value)}
              placeholder="SUPPRIMER"
              autoFocus
              style={{ marginBottom: 16, textAlign: 'center', fontWeight: 700, letterSpacing: 1 }}
            />
            {error && <p className="text-xs" style={{ color: 'var(--danger)', marginBottom: 12 }}>{error}</p>}
            <button
              onClick={handleDelete}
              disabled={loading || confirmText.trim().toUpperCase() !== 'SUPPRIMER'}
              style={{
                width: '100%', padding: 16, marginBottom: 10,
                background: confirmText.trim().toUpperCase() === 'SUPPRIMER' ? 'var(--danger)' : 'var(--surface-2)',
                color: confirmText.trim().toUpperCase() === 'SUPPRIMER' ? '#fff' : 'var(--text-muted)',
                border: 'none', borderRadius: 12, fontSize: 13, fontWeight: 700, letterSpacing: 2,
                textTransform: 'uppercase', cursor: confirmText.trim().toUpperCase() === 'SUPPRIMER' ? 'pointer' : 'not-allowed',
              }}
            >
              {loading ? 'Suppression...' : 'Supprimer définitivement'}
            </button>
            <button className="btn-ghost" onClick={() => setOpen(false)} disabled={loading}>Annuler</button>
          </div>
        </>
      )}
    </>
  )
}
