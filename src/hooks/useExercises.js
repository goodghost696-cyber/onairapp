import { useState, useEffect } from 'react';

const CACHE_KEY = 'onair_exercises_cache';
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24h

const CATEGORY_PARAMS = {
  maison: [
    { type: 'strength', difficulty: 'beginner' },
    { type: 'plyometrics' },
    { type: 'stretching' },
  ],
  salle: [
    { muscle: 'chest' },
    { muscle: 'back' },
    { muscle: 'legs' },
    { muscle: 'shoulders' },
    { muscle: 'biceps' },
    { muscle: 'triceps' },
  ],
  dehors: [
    { type: 'cardio' },
    { type: 'olympic_weightlifting' },
    { type: 'strongman' },
  ],
};

const MUSCLE_FR = {
  chest: 'Pectoraux', back: 'Dos', legs: 'Jambes', shoulders: 'Épaules',
  biceps: 'Biceps', triceps: 'Triceps', abdominals: 'Abdos',
  hamstrings: 'Ischio-jambiers', quadriceps: 'Quadriceps',
  glutes: 'Fessiers', calves: 'Mollets', forearms: 'Avant-bras',
  middle_back: 'Dos milieu', lower_back: 'Bas du dos', neck: 'Nuque',
  traps: 'Trapèzes', abductors: 'Abducteurs', adductors: 'Adducteurs',
};

const TYPE_FR = {
  strength: 'Force', cardio: 'Cardio', stretching: 'Étirement',
  plyometrics: 'Pliométrie', powerlifting: 'Powerlifting',
  olympic_weightlifting: 'Haltérophilie', strongman: 'Strongman',
};

export const useExercises = (category) => {
  const [exercises, setExercises] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadExercises = async () => {
      // Check cache
      try {
        const cached = JSON.parse(localStorage.getItem(`${CACHE_KEY}_${category}`) || 'null');
        if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
          setExercises(cached.data);
          setLoading(false);
          return;
        }
      } catch(e) {}

      try {
        const params = CATEGORY_PARAMS[category] || [];
        const allExercises = [];

        for (const param of params) {
          for (let offset = 0; offset < 3; offset++) {
            const query = new URLSearchParams({ ...param, offset: offset * 5 });
            const res = await fetch(`/api/exercises?${query}`);
            if (!res.ok) throw new Error('API unavailable');
            const data = await res.json();
            if (data.error) throw new Error(data.error);
            if (Array.isArray(data)) allExercises.push(...data);
          }
        }

        const seen = new Set();
        const unique = allExercises
          .filter(ex => {
            if (seen.has(ex.name)) return false;
            seen.add(ex.name);
            return true;
          })
          .map(ex => ({
            id: ex.name.toLowerCase().replace(/\s/g, '_'),
            name: ex.name,
            muscles: MUSCLE_FR[ex.muscle] || ex.muscle,
            type: TYPE_FR[ex.type] || ex.type,
            difficulty: ex.difficulty,
            instructions: ex.instructions,
            equipment: ex.equipment?.join(', ') || 'Aucun',
          }));

        localStorage.setItem(`${CACHE_KEY}_${category}`, JSON.stringify({
          timestamp: Date.now(),
          data: unique,
        }));

        setExercises(unique);
      } catch (err) {
        setError('API indisponible — exercices locaux affichés.');
      }
      setLoading(false);
    };

    loadExercises();
  }, [category]);

  return { exercises, loading, error };
};
