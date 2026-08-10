import { useState, useEffect } from 'react'
import { subscribe, flush, pendingCount } from '../utils/writeQueue'

// La partie visible du correctif du point 02 (audit 2026-08-10) : tant que
// des écritures attendent, on le dit. Avant, l'app affichait la donnée
// comme enregistrée et le membre ne découvrait la perte qu'au
// rafraîchissement — ou jamais, en concluant juste que "l'app perd mes
// trucs".
//
// Volontairement discret : ce n'est pas une erreur bloquante, la donnée
// n'est pas perdue et repartira toute seule. C'est une information, pas
// une alarme — d'où le bandeau bas, pas une modale.
export default function SyncIndicator() {
  const [count, setCount] = useState(() => pendingCount())
  const [online, setOnline] = useState(() => navigator.onLine !== false)

  useEffect(() => subscribe(setCount), [])

  useEffect(() => {
    const up = () => setOnline(true)
    const down = () => setOnline(false)
    window.addEventListener('online', up)
    window.addEventListener('offline', down)
    return () => {
      window.removeEventListener('online', up)
      window.removeEventListener('offline', down)
    }
  }, [])

  // Filet de sécurité : si l'app reste ouverte et que le réseau revient
  // sans que l'événement `online` ne se déclenche (ça arrive, notamment
  // quand on repasse d'un wifi capricieux à la 4G), on retente quand même.
  useEffect(() => {
    if (!count) return
    const id = setInterval(() => flush(), 30000)
    return () => clearInterval(id)
  }, [count])

  if (!count) return null

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: 'fixed',
        left: '50%',
        transform: 'translateX(-50%)',
        // Empilé au-dessus du FAB, en prolongeant la formule déjà utilisée
        // dans fab.css et global.css : 60px de pill + 16px d'écart = 76,
        // puis les 46px du FAB (fab.css) + 12px d'écart, plus la même
        // safe-area que la pill elle-même. Sans ça, l'indicateur centré
        // (jusqu'à 340px de large) recouvrait le FAB ancré à droite.
        bottom: 'calc(76px + 46px + 12px + env(safe-area-inset-bottom))',
        zIndex: 60,
        maxWidth: 'min(340px, calc(100vw - 32px))',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '10px 16px',
        borderRadius: 999,
        background: 'var(--surface)',
        border: '2px solid var(--border-strong)',
        boxShadow: '0 6px 20px rgba(0,0,0,0.16)',
        fontSize: 12,
        fontWeight: 600,
        color: 'var(--text-primary)',
        fontFamily: 'inherit',
      }}
    >
      <span
        aria-hidden="true"
        style={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          flexShrink: 0,
          background: online ? 'var(--warning)' : 'var(--text-muted)',
        }}
      />
      <span>
        {online
          ? `Synchronisation… ${count} en attente`
          : `Hors ligne — ${count} en attente`}
      </span>
      {online && (
        <button
          onClick={() => flush()}
          style={{
            marginLeft: 'auto',
            background: 'none',
            border: 'none',
            color: 'var(--accent-secondary, var(--text-secondary))',
            fontSize: 12,
            fontWeight: 700,
            cursor: 'pointer',
            fontFamily: 'inherit',
            padding: 0,
            flexShrink: 0,
          }}
        >
          Réessayer
        </button>
      )}
    </div>
  )
}
