import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import '../styles/WorkoutHistory.css';

export default function WorkoutHistory() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { appData } = useApp();
  const session = (appData.sessionHistory || []).find(s => String(s.id) === id);

  // Même mécanisme que les 21 écrans du chantier mode sombre (fond
  // derrière .app-wrapper, overscroll iOS compris) — absent jusqu'ici
  // puisque cet écran n'avait jamais de fond propre en clair (le dégradé
  // corail de <body> montrait déjà à travers, sans besoin de le
  // répliquer). Ajouté maintenant pour porter le fond sombre.
  useEffect(() => {
    document.body.classList.add('wh-history-body-bg')
    return () => document.body.classList.remove('wh-history-body-bg')
  }, [])

  if (!session) return (
    <div className="app-wrapper wh-history">
      <div className="screen">
        <p className="hd-muted" style={{ padding: '40px 0', textAlign: 'center' }}>Séance introuvable</p>
      </div>

    </div>
  );

  return (
    <div className="app-wrapper wh-history">
      <div className="screen">
        <div className="screen-header" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '20px 0 8px' }}>
          <button className="hd-back" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }} onClick={() => navigate('/workout')}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          </button>
          <div>
            <p className="hd-muted" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 1 }}>{session.date}</p>
            <h1 className="text-xl bold">{session.type}</h1>
          </div>
        </div>

        <div className="history-detail-stats">
          <div className="history-stat">
            <p className="history-stat-val">{session.duration}</p>
            <p className="history-stat-label">DURÉE</p>
          </div>
          <div className="history-stat">
            <p className="history-stat-val">{session.totalSets}</p>
            <p className="history-stat-label">SÉRIES</p>
          </div>
          <div className="history-stat">
            <p className="history-stat-val">{(session.exerciseDetails || []).length}</p>
            <p className="history-stat-label">EXERCICES</p>
          </div>
        </div>

        <p className="section-label">EXERCICES</p>
        {(session.exerciseDetails || []).map((ex, i) => (
          <div key={i} className="history-detail-card">
            <p className="history-detail-name">{ex.name}</p>
            {ex.sets.map((set, j) => (
              <div key={j} className="history-detail-set-row">
                <span className="set-num-label">Série {j + 1}</span>
                <span className="set-detail">{set.reps} reps · {set.kg} kg</span>
              </div>
            ))}
          </div>
        ))}
      </div>

    </div>
  );
}
