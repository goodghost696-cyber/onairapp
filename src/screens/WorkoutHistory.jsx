import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import BottomNav from '../components/BottomNav';
import '../styles/WorkoutHistory.css';

export default function WorkoutHistory() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { appData } = useApp();
  const session = (appData.sessionHistory || []).find(s => s.id === parseInt(id));

  if (!session) return (
    <div className="app-wrapper">
      <div className="screen" style={{ paddingBottom: 110 }}>
        <p style={{ color: 'var(--text-muted)', padding: '40px 0', textAlign: 'center' }}>Séance introuvable</p>
      </div>
      <BottomNav />
    </div>
  );

  return (
    <div className="app-wrapper">
      <div className="screen" style={{ paddingBottom: 110 }}>
        <div className="screen-header" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '20px 0 8px' }}>
          <button style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }} onClick={() => navigate('/workout')}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--text-primary)" strokeWidth="1.5" strokeLinecap="round">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          </button>
          <div>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1 }}>{session.date}</p>
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
      <BottomNav />
    </div>
  );
}
