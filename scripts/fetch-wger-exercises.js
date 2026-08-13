// One-shot local script — jamais exécuté en prod, jamais appelé au runtime
// de l'app. Interroge l'API publique wger.de (gratuite, sans clé, sans
// quota — CC-BY-SA 4.0) pour peupler src/data/exercisesLibrary.json,
// agrandissant le catalogue Maison/Salle au-delà des 18 exercices/section
// codés en dur dans LOCAL_EXERCISES (WorkoutLibrary.jsx), plafonnés par la
// limite de 5 résultats/requête du tier gratuit API Ninjas (api/exercises.js,
// useExercises.js — voir rapport d'investigation, JOURNAL.md).
//
// Usage : node scripts/fetch-wger-exercises.js
//
// Dehors n'est pas concerné : wger n'a pas de notion "extérieur" (comme
// api-ninjas), cette section reste 100% curatée à la main dans
// WorkoutLibrary.jsx.
//
// Ré-exécutable à volonté (idempotent, écrase le JSON existant) si le
// catalogue wger évolue — pas de dépendance à un run précédent.

import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_PATH = join(__dirname, '..', 'src', 'data', 'exercisesLibrary.json');

const API_BASE = 'https://wger.de/api/v2';
const PAGE_SIZE = 100;
const FR_LANGUAGE_ID = 12;
const EN_LANGUAGE_ID = 2;
const TARGET_PER_SECTION = 110;

// Équipement gym (barre/haltères/machines/banc) -> Salle. Tout le reste
// (aucun équipement, tapis, swiss ball, élastique) -> Maison. Ids tirés de
// GET /api/v2/equipment/.
const SALLE_EQUIPMENT_IDS = new Set([1, 2, 3, 6, 8, 9, 10, 12]); // Barbell, SZ-Bar, Dumbbell, Pull-up bar, Bench, Incline bench, Kettlebell, Cable machine
const EQUIPMENT_FR = {
  1: 'Barre', 2: 'Barre EZ', 3: 'Haltères', 4: 'Tapis de sol',
  5: 'Swiss Ball', 6: 'Barre de traction', 7: 'Aucun', 8: 'Banc',
  9: 'Banc incliné', 10: 'Kettlebell', 11: 'Élastique', 12: 'Poulie',
};

// Réutilise les valeurs FR de MUSCLE_FR (useExercises.js) partout où le
// muscle wger correspond à une clé existante — seuls les 4 muscles absents
// de ce mapping (obliques, dentelé, brachial, trapèzes non nommés côté
// name_en) reçoivent un libellé propre ci-dessous. Ids tirés de
// GET /api/v2/muscle/.
const MUSCLE_ID_FR = {
  1: 'Biceps',            // Biceps brachii
  2: 'Épaules',            // Anterior deltoid
  3: 'Dentelé antérieur',  // Serratus anterior
  4: 'Pectoraux',          // Pectoralis major
  5: 'Triceps',            // Triceps brachii
  6: 'Abdos',              // Rectus abdominis
  7: 'Mollets',            // Gastrocnemius
  8: 'Fessiers',           // Gluteus maximus
  9: 'Trapèzes',           // Trapezius
  10: 'Quadriceps',        // Quadriceps femoris
  11: 'Ischio-jambiers',   // Biceps femoris
  12: 'Dos',               // Latissimus dorsi
  13: 'Brachial',          // Brachialis
  14: 'Obliques',          // Obliquus externus abdominis
  15: 'Mollets',           // Soleus
};

// category.name (wger) -> `type` FR affiché en repli quand `muscles` est
// vide (même rôle que TYPE_FR côté useExercises.js, vocabulaire différent
// car wger catégorise par zone du corps, pas par style d'exercice).
const CATEGORY_FR = {
  Abs: 'Abdos', Arms: 'Bras', Back: 'Dos', Calves: 'Mollets',
  Cardio: 'Cardio', Chest: 'Pectoraux', Legs: 'Jambes', Shoulders: 'Épaules',
};

function slugify(name) {
  return 'w_' + name
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '') // accents
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function stripHtml(html) {
  if (!html) return '';
  return html
    .replace(/<\/(p|li|ol|ul)>/gi, '\n')
    .replace(/<li>/gi, '- ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

async function fetchAllExercises() {
  const results = [];
  let url = `${API_BASE}/exerciseinfo/?limit=${PAGE_SIZE}&offset=0&format=json`;
  let page = 0;
  while (url) {
    page += 1;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`wger fetch failed: ${res.status} ${res.statusText}`);
    const data = await res.json();
    results.push(...data.results);
    url = data.next;
    console.log(`  page ${page} — ${results.length}/${data.count} exercices récupérés`);
    // Poli envers l'API publique — pas de rate-limit documenté mais pas de
    // raison de la marteler pour un script one-shot.
    if (url) await new Promise(r => setTimeout(r, 150));
  }
  return results;
}

function pickTranslation(translations) {
  return translations.find(t => t.language === FR_LANGUAGE_ID && t.name)
    || translations.find(t => t.language === EN_LANGUAGE_ID && t.name)
    || translations.find(t => t.name)
    || null;
}

function classifyEquipment(equipment) {
  const ids = equipment.map(e => e.id);
  if (ids.length === 0) return 'maison';
  if (ids.some(id => SALLE_EQUIPMENT_IDS.has(id))) return 'salle';
  return 'maison';
}

function toMuscleLabels(muscles) {
  return muscles
    .map(m => MUSCLE_ID_FR[m.id])
    .filter(Boolean);
}

function transform(raw) {
  const translation = pickTranslation(raw.translations || []);
  if (!translation) return null;

  const name = translation.name.trim();
  if (!name) return null;

  const primary = toMuscleLabels(raw.muscles || []);
  const secondary = toMuscleLabels(raw.muscles_secondary || []);
  // Dédup en gardant l'ordre (primaire d'abord), même convention que
  // LOCAL_EXERCISES ("Pectoraux · Triceps · Épaules").
  const muscleLabels = [...new Set([...primary, ...secondary])];
  const categoryFr = CATEGORY_FR[raw.category?.name] || raw.category?.name || null;
  const muscles = muscleLabels.length > 0 ? muscleLabels.join(' · ') : (categoryFr || '');

  const equipmentIds = (raw.equipment || []).map(e => e.id);
  const equipmentFr = equipmentIds.length > 0
    ? equipmentIds.map(id => EQUIPMENT_FR[id] || null).filter(Boolean).join(', ')
    : 'Aucun';

  const instructions = stripHtml(translation.description) || null;

  return {
    id: slugify(name),
    name,
    muscles,
    type: categoryFr,
    instructions,
    equipment: equipmentFr,
    section: classifyEquipment(raw.equipment || []),
    // Utilisé uniquement pour la sélection équilibrée ci-dessous, retiré du
    // JSON final.
    _primaryMuscle: muscleLabels[0] || categoryFr || 'Autre',
  };
}

// Sélection round-robin par groupe musculaire principal plutôt que les N
// premiers de la liste brute — évite qu'une section se retrouve avec 80
// variantes de développé couché et 5 exercices de jambes si wger renvoie
// ses résultats groupés par catégorie/ordre d'ajout.
function pickVaried(candidates, target) {
  const byMuscle = new Map();
  for (const ex of candidates) {
    const key = ex._primaryMuscle;
    if (!byMuscle.has(key)) byMuscle.set(key, []);
    byMuscle.get(key).push(ex);
  }
  const groups = [...byMuscle.values()];
  const picked = [];
  let round = 0;
  while (picked.length < target && groups.some(g => g.length > round)) {
    for (const g of groups) {
      if (g.length > round) picked.push(g[round]);
      if (picked.length >= target) break;
    }
    round += 1;
  }
  return picked
    // `section`/`_primaryMuscle` ne servent qu'au tri/bucketing ci-dessus —
    // retirés du JSON final, même forme exacte que LOCAL_EXERCISES
    // (WorkoutLibrary.jsx) où la catégorie est donnée par la clé du
    // dictionnaire (maison/salle), pas par un champ sur l'exercice.
    .map(({ _primaryMuscle, section, ...rest }) => rest)
    .sort((a, b) => a.name.localeCompare(b.name, 'fr'));
}

async function main() {
  console.log('Récupération du catalogue wger (exerciseinfo, toutes langues)...');
  const raw = await fetchAllExercises();
  console.log(`${raw.length} exercices bruts récupérés depuis wger.`);

  const transformed = raw.map(transform).filter(Boolean);
  console.log(`${transformed.length} exercices exploitables après transformation (nom + traduction valides).`);

  const seenMaison = new Set();
  const seenSalle = new Set();
  const maisonCandidates = [];
  const salleCandidates = [];
  for (const ex of transformed) {
    const key = ex.name.toLowerCase();
    if (ex.section === 'maison' && !seenMaison.has(key)) {
      seenMaison.add(key);
      maisonCandidates.push(ex);
    } else if (ex.section === 'salle' && !seenSalle.has(key)) {
      seenSalle.add(key);
      salleCandidates.push(ex);
    }
  }

  const maison = pickVaried(maisonCandidates, TARGET_PER_SECTION);
  const salle = pickVaried(salleCandidates, TARGET_PER_SECTION);

  const output = {
    source: 'wger.de API v2 — https://wger.de/api/v2/',
    license: 'CC-BY-SA 4.0 — https://creativecommons.org/licenses/by-sa/4.0/',
    generated: new Date().toISOString(),
    maison,
    salle,
  };

  await writeFile(OUTPUT_PATH, JSON.stringify(output, null, 2) + '\n', 'utf-8');
  console.log(`\nÉcrit dans ${OUTPUT_PATH}`);
  console.log(`  Maison : ${maison.length} exercices`);
  console.log(`  Salle  : ${salle.length} exercices`);
}

main().catch(err => {
  console.error('Échec du script :', err);
  process.exit(1);
});
