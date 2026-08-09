import { useLanguage } from '../context/LanguageContext';
import { useSwipeToDismiss } from '../hooks/useSwipeToDismiss';
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
  m9: {
    muscles_primary: ['Triceps', 'Pectoraux'],
    muscles_secondary: ['Épaules'],
    steps: ["Mains jointes sous la poitrine, pouces et index formant un losange.", "Descends coudes près du corps.", "Pousse fort, contracte les triceps en haut."],
    muscle_group: 'arms'
  },
  m10: {
    muscles_primary: ['Dos bas', 'Fessiers'],
    muscles_secondary: ['Épaules'],
    steps: ["Allongé sur le ventre, bras tendus devant.", "Lève simultanément bras et jambes du sol.", "Tiens 1-2s en haut, redescends contrôlé."],
    muscle_group: 'back'
  },
  m11: {
    muscles_primary: ['Quadriceps'],
    muscles_secondary: ['Endurance'],
    steps: ["Dos plaqué contre un mur, descends comme pour t'asseoir.", "Cuisses parallèles au sol, genoux à 90°.", "Tiens la position le plus longtemps possible."],
    muscle_group: 'legs'
  },
  m12: {
    muscles_primary: ['Abdos'],
    muscles_secondary: ['Core'],
    steps: ["Allongé, genoux fléchis, mains derrière la tête.", "Décolle les épaules du sol en contractant les abdos.", "Redescends sans reposer complètement la tête."],
    muscle_group: 'core'
  },
  m13: {
    muscles_primary: ['Cardio', 'Full body'],
    muscles_secondary: ['Mollets'],
    steps: ["Debout, pieds joints, bras le long du corps.", "Saute en écartant jambes et bras au-dessus de la tête.", "Reviens à la position initiale, enchaîne le rythme."],
    muscle_group: 'fullbody'
  },
  m14: {
    muscles_primary: ['Quadriceps', 'Fessiers'],
    muscles_secondary: ['Explosivité'],
    steps: ["Position squat, pieds à largeur des épaules.", "Descends puis saute explosivement vers le haut.", "Atterris en douceur, enchaîne directement le squat suivant."],
    muscle_group: 'legs'
  },
  m15: {
    muscles_primary: ['Obliques', 'Core'],
    muscles_secondary: ['Épaules'],
    steps: ["Allongé sur le côté, appui sur l'avant-bras.", "Décolle les hanches, corps aligné de la tête aux pieds.", "Tiens la position, garde les hanches hautes."],
    muscle_group: 'core'
  },
  m16: {
    muscles_primary: ['Épaules', 'Triceps'],
    muscles_secondary: ['Core'],
    steps: ["Position pompe, hanches levées en V inversé.", "Descends la tête vers le sol en pliant les coudes.", "Pousse pour remonter, garde les jambes tendues."],
    muscle_group: 'arms'
  },
  s9: {
    muscles_primary: ['Quadriceps', 'Fessiers'],
    muscles_secondary: [],
    steps: ["Assis, dos calé, pieds à largeur des épaules sur la plateforme.", "Descends jusqu'à 90° de flexion de genoux.", "Pousse dans le sol sans verrouiller les genoux en haut."],
    muscle_group: 'legs'
  },
  s10: {
    muscles_primary: ['Dos', 'Biceps'],
    muscles_secondary: [],
    steps: ["Assis, cuisses calées, prise large sur la barre.", "Tire la barre vers le haut de la poitrine.", "Remonte contrôlé, bras complètement tendus."],
    muscle_group: 'back'
  },
  s11: {
    muscles_primary: ['Ischio-jambiers'],
    muscles_secondary: [],
    steps: ["Allongé face contre la machine, tibias sous le rouleau.", "Fléchis les genoux pour amener les talons vers les fessiers.", "Redescends contrôlé, sans à-coup."],
    muscle_group: 'legs'
  },
  s12: {
    muscles_primary: ['Épaules'],
    muscles_secondary: [],
    steps: ["Debout, haltères le long du corps.", "Lève les bras sur les côtés jusqu'à hauteur d'épaules.", "Redescends contrôlé, coudes légèrement fléchis."],
    muscle_group: 'shoulders'
  },
  s13: {
    muscles_primary: ['Biceps'],
    muscles_secondary: [],
    steps: ["Debout, prise supination à largeur des épaules.", "Fléchis les coudes en gardant les bras collés au corps.", "Redescends lentement, sans balancer."],
    muscle_group: 'arms'
  },
  s14: {
    muscles_primary: ['Triceps'],
    muscles_secondary: [],
    steps: ["Face à la poulie haute, coudes fixes le long du corps.", "Pousse la barre vers le bas jusqu'à extension complète.", "Remonte contrôlé, coudes toujours fixes."],
    muscle_group: 'arms'
  },
  s15: {
    muscles_primary: ['Fessiers', 'Ischio-jambiers'],
    muscles_secondary: [],
    steps: ["Dos calé sur un banc, barre sur les hanches.", "Pousse les hanches vers le haut, contracte les fessiers.", "Redescends contrôlé sans reposer la charge."],
    muscle_group: 'legs'
  },
  s16: {
    muscles_primary: ['Quadriceps', 'Core'],
    muscles_secondary: [],
    steps: ["Barre posée sur les deltoïdes avant, coudes hauts.", "Descends en gardant le buste vertical.", "Remonte en poussant dans le sol, coudes toujours hauts."],
    muscle_group: 'legs'
  },
  d9: {
    muscles_primary: ['Cardio', 'Endurance'],
    muscles_secondary: [],
    steps: ["Alterne allures rapides et récupération sur un parcours.", "Varie l'intensité selon les repères du terrain (arbres, lampadaires).", "Termine par un retour au calme en marche."],
    muscle_group: 'fullbody'
  },
  d10: {
    muscles_primary: ['Explosivité', 'Quadriceps'],
    muscles_secondary: ['Fessiers'],
    steps: ["Pieds à largeur des épaules, flexion des genoux.", "Saute le plus loin possible vers l'avant, bras en élan.", "Atterris en souplesse, genoux fléchis."],
    muscle_group: 'legs'
  },
  d11: {
    muscles_primary: ['Full body', 'Grip'],
    muscles_secondary: ['Core'],
    steps: ["Charge lourde dans chaque main (kettlebells, bidons).", "Marche droit, épaules en arrière, abdos gainés.", "Repose et recommence sur la distance voulue."],
    muscle_group: 'fullbody'
  },
  d12: {
    muscles_primary: ['Quadriceps', 'Fessiers'],
    muscles_secondary: [],
    steps: ["Face à un banc ou un muret stable.", "Monte une jambe puis l'autre, buste droit.", "Redescends contrôlé, alterne la jambe qui monte en premier."],
    muscle_group: 'legs'
  },
  d13: {
    muscles_primary: ['Full body', 'Cardio'],
    muscles_secondary: ['Épaules'],
    steps: ["Une corde lourde dans chaque main, genoux fléchis.", "Fais onduler les cordes en alternant les bras rapidement.", "Garde le gainage tout au long de l'exercice."],
    muscle_group: 'fullbody'
  },
  d14: {
    muscles_primary: ['Cardio', 'Quadriceps'],
    muscles_secondary: ['Mollets'],
    steps: ["Trouve un escalier extérieur (stade, parc).", "Monte en sprint en poussant sur l'avant du pied.", "Redescends en marchant pour récupérer, répète."],
    muscle_group: 'fullbody'
  },
  d15: {
    muscles_primary: ['Cardio', 'Endurance'],
    muscles_secondary: ['Quadriceps'],
    steps: ["Course sur terrain naturel varié (chemin, forêt).", "Adapte l'allure au dénivelé et au terrain.", "Reste attentif aux appuis sur sol irrégulier."],
    muscle_group: 'fullbody'
  },
  d16: {
    muscles_primary: ['Full body', 'Explosivité'],
    muscles_secondary: ['Dos'],
    steps: ["Sac au sol, pieds de chaque côté, dos plat.", "Tire le sac vers le haut en poussant avec les jambes.", "Réceptionne à l'épaule ou repose au sol, contrôlé."],
    muscle_group: 'fullbody'
  },
  m17: {
    muscles_primary: ['Cardio', 'Jambes'],
    muscles_secondary: [],
    steps: ["Démarre à allure de marche pour t'échauffer 3-5 min.", "Augmente progressivement l'allure ou l'inclinaison.", "Termine par 3-5 min de retour au calme."],
    muscle_group: 'cardio'
  },
  m18: {
    muscles_primary: ['Cardio', 'Quadriceps'],
    muscles_secondary: ['Mollets'],
    steps: ["Règle la selle à hauteur de hanche, genou légèrement fléchi en bas de course.", "Pédale à allure régulière, dos droit.", "Varie la résistance pour alterner endurance et intensité."],
    muscle_group: 'cardio'
  },
  s17: {
    muscles_primary: ['Cardio', 'Jambes'],
    muscles_secondary: [],
    steps: ["Démarre à allure de marche pour t'échauffer 3-5 min.", "Augmente progressivement l'allure ou l'inclinaison.", "Termine par 3-5 min de retour au calme."],
    muscle_group: 'cardio'
  },
  s18: {
    muscles_primary: ['Cardio', 'Dos'],
    muscles_secondary: ['Jambes', 'Bras'],
    steps: ["Pousse avec les jambes, buste droit, avant de tirer avec les bras.", "Tire la poignée vers le bas des côtes, coudes près du corps.", "Reviens en inversant l'ordre : bras, buste, jambes."],
    muscle_group: 'cardio'
  },
};



export const ExerciseModal = ({ exercise, onClose, onAdd }) => {
  const { t } = useLanguage();
  // Same handle-bar-does-nothing bug as Dashboard's activity sheet,
  // reported on the same real screenshot ("les cartes" — fixed both).
  const swipeDismiss = useSwipeToDismiss(() => onClose());
  if (!exercise) return null;

  // EXERCISE_DATA only ever covered the 24 hand-written local exercises
  // (ids m1-m8/s1-s8/d1-d8) — for the far larger set fetched live from
  // api/exercises.js (API Ninjas, ids like "bench_press"), this lookup was
  // always undefined and the modal silently returned null. Tapping any of
  // those cards did nothing, no error, no feedback — the library "felt"
  // thin even when the API returned plenty, because most exercises simply
  // couldn't be opened. Now falls back to the exercise's own fields
  // (muscles/instructions/equipment from useExercises.js) when there's no
  // curated entry, instead of failing silently.
  const curated = EXERCISE_DATA[exercise.id];
  const muscles = curated
    ? [...curated.muscles_primary, ...curated.muscles_secondary].join(' · ')
    : exercise.muscles || 'Non précisé'
  const steps = curated ? curated.steps : null
  const instructions = !curated ? exercise.instructions : null

  return (
    <>
      <div className="modal-overlay" onClick={onClose} />
      <div className="exercise-modal" style={swipeDismiss.style}>
        <div className="sheet-drag-zone" {...swipeDismiss.handlers}>
          <div className="modal-handle" />
        </div>

        <div className="modal-content">
          <h2 className="modal-title">{exercise.name}</h2>

          <p className="modal-muscles-text">
            MUSCLES · {muscles}
          </p>

          {!curated && exercise.equipment && (
            <p className="modal-muscles-text" style={{ marginTop: -8 }}>ÉQUIPEMENT · {exercise.equipment}</p>
          )}

          {steps && (
            <div className="modal-steps">
              {steps.map((step, i) => (
                <div key={i} className="modal-step">
                  <span className="step-num">{i + 1}</span>
                  <span className="step-text">{step}</span>
                </div>
              ))}
            </div>
          )}

          {instructions && (
            <p className="modal-muscles-text" style={{ whiteSpace: 'pre-line', textTransform: 'none', letterSpacing: 'normal', marginTop: 4 }}>
              {instructions}
            </p>
          )}

          <button className="modal-add-btn" onClick={() => { onAdd(exercise); onClose(); }}>
            {t('add_btn')} À LA SÉANCE
          </button>
        </div>
      </div>
    </>
  );
};
