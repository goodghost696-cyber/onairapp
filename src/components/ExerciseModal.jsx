import { useLanguage } from '../context/LanguageContext';
import '../styles/ExerciseModal.css';

const EXERCISE_DATA = {
  m1: {
    muscles_primary: ['Pectoraux', 'Triceps'],
    muscles_secondary: ['Épaules'],
    steps: ["Mains à largeur des épaules, corps aligné.", "Descends jusqu'à 90°, coudes serrés.", "Pousse fort en expirant."],
    muscle_group: 'chest'
  },
  m2: {
    muscles_primary: ['Quadriceps', 'Fessiers'],
    muscles_secondary: ['Ischio-jambiers'],
    steps: ["Pieds à largeur des épaules, orteils légèrement tournés.", "Descends comme pour t'asseoir, genoux dans l'axe.", "Remonte en contractant les fessiers."],
    muscle_group: 'legs'
  },
  m3: {
    muscles_primary: ['Core', 'Abdos'],
    muscles_secondary: ['Épaules', 'Fessiers'],
    steps: ["Appui sur les avant-bras, corps droit.", "Contracte les abdos et les fessiers.", "Tiens la position sans creuser le dos."],
    muscle_group: 'core'
  },
  m4: {
    muscles_primary: ['Full body'],
    muscles_secondary: ['Cardio'],
    steps: ["Debout, puis squat et mains au sol.", "Saute les pieds en arrière en position pompe.", "Reviens et saute en l'air, mains en haut."],
    muscle_group: 'fullbody'
  },
  m5: {
    muscles_primary: ['Quadriceps', 'Fessiers'],
    muscles_secondary: ['Ischio-jambiers', 'Core'],
    steps: ["Grand pas en avant, buste droit.", "Descends le genou arrière vers le sol.", "Pousse sur le pied avant pour revenir."],
    muscle_group: 'legs'
  },
  m6: {
    muscles_primary: ['Triceps'],
    muscles_secondary: ['Épaules', 'Pectoraux'],
    steps: ["Mains sur une chaise derrière toi, jambes tendues.", "Descends en pliant les coudes à 90°.", "Pousse pour revenir à la position initiale."],
    muscle_group: 'arms'
  },
  m7: {
    muscles_primary: ['Core', 'Cardio'],
    muscles_secondary: ['Épaules'],
    steps: ["Position pompe, mains sous les épaules.", "Ramène les genoux vers la poitrine en alternant.", "Garde le rythme, abdos contractés."],
    muscle_group: 'core'
  },
  m8: {
    muscles_primary: ['Fessiers', 'Ischio-jambiers'],
    muscles_secondary: ['Core'],
    steps: ["Allongé sur le dos, pieds à plat, genoux fléchis.", "Pousse sur les talons pour lever les hanches.", "Contracte les fessiers en haut, redescends lentement."],
    muscle_group: 'legs'
  },
  s1: {
    muscles_primary: ['Pectoraux', 'Triceps'],
    muscles_secondary: ['Épaules'],
    steps: ["Barre à largeur des épaules, dos légèrement cambré.", "Descends la barre jusqu'à effleurer la poitrine.", "Pousse explosif, coudes pas trop écartés."],
    muscle_group: 'chest'
  },
  s2: {
    muscles_primary: ['Quadriceps', 'Fessiers'],
    muscles_secondary: ['Ischio-jambiers', 'Core'],
    steps: ["Barre sur les trapèzes, pieds à largeur des épaules.", "Descends cuisses parallèles au sol minimum.", "Remonte en poussant dans le sol, dos droit."],
    muscle_group: 'legs'
  },
  s3: {
    muscles_primary: ['Ischio-jambiers', 'Dos'],
    muscles_secondary: ['Fessiers', 'Trapèzes'],
    steps: ["Barre au sol, dos plat, hanches en arrière.", "Tire la barre en gardant dos neutre.", "Debout, épaules en arrière, repose contrôlé."],
    muscle_group: 'back'
  },
  s4: {
    muscles_primary: ['Dos', 'Biceps'],
    muscles_secondary: ['Core'],
    steps: ["Prise pronation ou supination, bras tendus.", "Tire le menton au-dessus de la barre.", "Redescends lentement, bras complètement tendus."],
    muscle_group: 'back'
  },
  s5: {
    muscles_primary: ['Épaules', 'Triceps'],
    muscles_secondary: ['Trapèzes'],
    steps: ["Barre à hauteur des épaules, prise légèrement plus large.", "Pousse la barre au-dessus de la tête.", "Redescends à hauteur du menton, contrôlé."],
    muscle_group: 'shoulders'
  },
  s6: {
    muscles_primary: ['Ischio-jambiers', 'Fessiers'],
    muscles_secondary: ['Dos bas'],
    steps: ["Barre en main, dos plat, légère flexion des genoux.", "Penche le buste en avant, barre près des jambes.", "Reviens avec les hanches, pas le dos."],
    muscle_group: 'legs'
  },
  s7: {
    muscles_primary: ['Pectoraux haut', 'Triceps'],
    muscles_secondary: ['Épaules'],
    steps: ["Banc incliné à 30-45°, haltères en main.", "Descends les haltères jusqu'à la poitrine haute.", "Pousse en arc de cercle, contracte les pecs."],
    muscle_group: 'chest'
  },
  s8: {
    muscles_primary: ['Dos', 'Biceps'],
    muscles_secondary: ['Core'],
    steps: ["Assis face à la poulie, dos droit.", "Tire la poignée vers le nombril, coudes en arrière.", "Retiens la charge en revenant, dos droit."],
    muscle_group: 'back'
  },
  d1: {
    muscles_primary: ['Full body', 'Cardio'],
    muscles_secondary: ['Quadriceps', 'Fessiers'],
    steps: ["Départ en position basse, explosif.", "Sprint maximal sur 100m.", "Récupère 2-3 min entre les séries."],
    muscle_group: 'fullbody'
  },
  d2: {
    muscles_primary: ['Dos', 'Biceps'],
    muscles_secondary: ['Core'],
    steps: ["Barre fixe, prise en supination ou pronation.", "Tire jusqu'au menton au-dessus de la barre.", "Redescends contrôlé, bras complètement tendus."],
    muscle_group: 'back'
  },
  d3: {
    muscles_primary: ['Quadriceps', 'Fessiers'],
    muscles_secondary: ['Explosivité'],
    steps: ["Debout face à la box, pieds à largeur des épaules.", "Squat partiel puis saut explosif sur la box.", "Atterris en douceur, descends en contrôle."],
    muscle_group: 'legs'
  },
  d4: {
    muscles_primary: ['Cardio', 'Mollets'],
    muscles_secondary: ['Coordination'],
    steps: ["Poignées à hauteur des hanches, saute légèrement.", "Fais tourner la corde avec les poignets.", "Maintiens le rythme, reste sur l'avant du pied."],
    muscle_group: 'fullbody'
  },
  d5: {
    muscles_primary: ['Full body', 'Core'],
    muscles_secondary: ['Épaules'],
    steps: ["À quatre pattes, dos plat, genoux décollés.", "Avance main droite + pied gauche simultanément.", "Garde le dos horizontal, rythme régulier."],
    muscle_group: 'fullbody'
  },
  d6: {
    muscles_primary: ['Quadriceps', 'Équilibre'],
    muscles_secondary: ['Fessiers', 'Core'],
    steps: ["Debout sur une jambe, autre jambe tendue devant.", "Descends en squat sur une jambe.", "Remonte en poussant fort, garde l'équilibre."],
    muscle_group: 'legs'
  },
  d7: {
    muscles_primary: ['Cardio', 'Fessiers'],
    muscles_secondary: ['Ischio-jambiers'],
    steps: ["Trouve une côte, départ en bas.", "Sprint maximum en montée, penche le buste.", "Redescends en marchant pour récupérer."],
    muscle_group: 'fullbody'
  },
  d8: {
    muscles_primary: ['Dos', 'Pectoraux', 'Triceps'],
    muscles_secondary: ['Core'],
    steps: ["Traction jusqu'au menton au-dessus de la barre.", "Pousse les coudes vers le bas pour passer la barre.", "Dips en haut, redescends contrôlé."],
    muscle_group: 'back'
  },
};

const MUSCLE_SVG = {
  chest: (
    <svg viewBox="0 0 80 120" width="80" height="120" fill="none">
      <ellipse cx="40" cy="60" rx="18" ry="28" fill="var(--surface-2)" stroke="var(--border)" strokeWidth="1"/>
      <ellipse cx="30" cy="52" rx="10" ry="8" fill="var(--accent)" opacity="0.8"/>
      <ellipse cx="50" cy="52" rx="10" ry="8" fill="var(--accent)" opacity="0.8"/>
      <circle cx="40" cy="25" r="8" fill="var(--surface-2)" stroke="var(--border)" strokeWidth="1"/>
      <line x1="40" y1="33" x2="40" y2="42" stroke="var(--border)" strokeWidth="1.5"/>
      <line x1="25" y1="80" x2="25" y2="110" stroke="var(--border)" strokeWidth="1.5"/>
      <line x1="55" y1="80" x2="55" y2="110" stroke="var(--border)" strokeWidth="1.5"/>
    </svg>
  ),
  back: (
    <svg viewBox="0 0 80 120" width="80" height="120" fill="none">
      <ellipse cx="40" cy="60" rx="18" ry="28" fill="var(--surface-2)" stroke="var(--border)" strokeWidth="1"/>
      <rect x="28" y="44" width="24" height="20" rx="4" fill="var(--accent)" opacity="0.8"/>
      <circle cx="40" cy="25" r="8" fill="var(--surface-2)" stroke="var(--border)" strokeWidth="1"/>
      <line x1="40" y1="33" x2="40" y2="42" stroke="var(--border)" strokeWidth="1.5"/>
      <line x1="25" y1="80" x2="25" y2="110" stroke="var(--border)" strokeWidth="1.5"/>
      <line x1="55" y1="80" x2="55" y2="110" stroke="var(--border)" strokeWidth="1.5"/>
    </svg>
  ),
  legs: (
    <svg viewBox="0 0 80 120" width="80" height="120" fill="none">
      <ellipse cx="40" cy="45" rx="18" ry="22" fill="var(--surface-2)" stroke="var(--border)" strokeWidth="1"/>
      <circle cx="40" cy="18" r="8" fill="var(--surface-2)" stroke="var(--border)" strokeWidth="1"/>
      <line x1="40" y1="26" x2="40" y2="35" stroke="var(--border)" strokeWidth="1.5"/>
      <rect x="24" y="68" width="13" height="35" rx="6" fill="var(--accent)" opacity="0.8"/>
      <rect x="43" y="68" width="13" height="35" rx="6" fill="var(--accent)" opacity="0.8"/>
    </svg>
  ),
  core: (
    <svg viewBox="0 0 80 120" width="80" height="120" fill="none">
      <ellipse cx="40" cy="55" rx="18" ry="28" fill="var(--surface-2)" stroke="var(--border)" strokeWidth="1"/>
      <circle cx="40" cy="18" r="8" fill="var(--surface-2)" stroke="var(--border)" strokeWidth="1"/>
      <line x1="40" y1="26" x2="40" y2="38" stroke="var(--border)" strokeWidth="1.5"/>
      <rect x="32" y="48" width="16" height="22" rx="3" fill="var(--accent)" opacity="0.8"/>
      <line x1="40" y1="48" x2="40" y2="70" stroke="var(--surface-2)" strokeWidth="1.5"/>
      <line x1="32" y1="56" x2="48" y2="56" stroke="var(--surface-2)" strokeWidth="1.5"/>
      <line x1="32" y1="63" x2="48" y2="63" stroke="var(--surface-2)" strokeWidth="1.5"/>
      <line x1="25" y1="83" x2="25" y2="110" stroke="var(--border)" strokeWidth="1.5"/>
      <line x1="55" y1="83" x2="55" y2="110" stroke="var(--border)" strokeWidth="1.5"/>
    </svg>
  ),
  shoulders: (
    <svg viewBox="0 0 80 120" width="80" height="120" fill="none">
      <ellipse cx="40" cy="55" rx="18" ry="26" fill="var(--surface-2)" stroke="var(--border)" strokeWidth="1"/>
      <circle cx="40" cy="18" r="8" fill="var(--surface-2)" stroke="var(--border)" strokeWidth="1"/>
      <line x1="40" y1="26" x2="40" y2="38" stroke="var(--border)" strokeWidth="1.5"/>
      <circle cx="22" cy="42" r="7" fill="var(--accent)" opacity="0.8"/>
      <circle cx="58" cy="42" r="7" fill="var(--accent)" opacity="0.8"/>
      <line x1="25" y1="83" x2="25" y2="110" stroke="var(--border)" strokeWidth="1.5"/>
      <line x1="55" y1="83" x2="55" y2="110" stroke="var(--border)" strokeWidth="1.5"/>
    </svg>
  ),
  arms: (
    <svg viewBox="0 0 80 120" width="80" height="120" fill="none">
      <ellipse cx="40" cy="55" rx="18" ry="26" fill="var(--surface-2)" stroke="var(--border)" strokeWidth="1"/>
      <circle cx="40" cy="18" r="8" fill="var(--surface-2)" stroke="var(--border)" strokeWidth="1"/>
      <line x1="40" y1="26" x2="40" y2="38" stroke="var(--border)" strokeWidth="1.5"/>
      <rect x="15" y="50" width="8" height="22" rx="4" fill="var(--accent)" opacity="0.8"/>
      <rect x="57" y="50" width="8" height="22" rx="4" fill="var(--accent)" opacity="0.8"/>
      <line x1="25" y1="83" x2="25" y2="110" stroke="var(--border)" strokeWidth="1.5"/>
      <line x1="55" y1="83" x2="55" y2="110" stroke="var(--border)" strokeWidth="1.5"/>
    </svg>
  ),
  fullbody: (
    <svg viewBox="0 0 80 120" width="80" height="120" fill="none">
      <ellipse cx="40" cy="50" rx="18" ry="24" fill="var(--accent)" opacity="0.6"/>
      <circle cx="40" cy="18" r="8" fill="var(--surface-2)" stroke="var(--accent)" strokeWidth="1.5"/>
      <line x1="40" y1="26" x2="40" y2="36" stroke="var(--accent)" strokeWidth="1.5"/>
      <rect x="15" y="46" width="8" height="20" rx="4" fill="var(--accent)" opacity="0.7"/>
      <rect x="57" y="46" width="8" height="20" rx="4" fill="var(--accent)" opacity="0.7"/>
      <rect x="25" y="74" width="13" height="32" rx="6" fill="var(--accent)" opacity="0.7"/>
      <rect x="42" y="74" width="13" height="32" rx="6" fill="var(--accent)" opacity="0.7"/>
    </svg>
  ),
};


export const ExerciseModal = ({ exercise, onClose, onAdd }) => {
  const { t } = useLanguage();
  const data = EXERCISE_DATA[exercise?.id];
  if (!exercise || !data) return null;

  return (
    <>
      <div className="modal-overlay" onClick={onClose} />
      <div className="exercise-modal">
        <div className="modal-handle" />

        <div className="modal-content">
          <h2 className="modal-title">{exercise.name}</h2>

          <div className="modal-muscles-row">
            <div className="modal-svg-body">
              {MUSCLE_SVG[data.muscle_group]}
            </div>
            <div className="modal-muscles-info">
              <p className="modal-label">MUSCLES PRINCIPAUX</p>
              <div className="modal-badges">
                {data.muscles_primary.map(m => (
                  <span key={m} className="muscle-badge primary">{m}</span>
                ))}
              </div>
              <p className="modal-label" style={{ marginTop: 10 }}>SECONDAIRES</p>
              <div className="modal-badges">
                {data.muscles_secondary.map(m => (
                  <span key={m} className="muscle-badge secondary">{m}</span>
                ))}
              </div>
            </div>
          </div>

          <div className="modal-steps">
            {data.steps.map((step, i) => (
              <div key={i} className="modal-step">
                <span className="step-num">{i + 1}</span>
                <span className="step-text">{step}</span>
              </div>
            ))}
          </div>

          <button className="modal-add-btn" onClick={() => { onAdd(exercise); onClose(); }}>
            {t('add_btn')} À LA SÉANCE
          </button>
        </div>
      </div>
    </>
  );
};
