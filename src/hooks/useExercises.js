import { useState, useEffect } from 'react';
import { authHeader } from '../lib/supabase';

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
        const headers = await authHeader();

        // Was: any single failed request (offset 0..2, so up to 18
        // sequential calls for "salle" alone) threw and discarded every
        // exercise already fetched in this category — a free-tier
        // rate-limit hit on request #15 wiped out the 14 that had already
        // succeeded, showing "API indisponible" even though most of the
        // data was there. Now each page is independent: a failure just
        // skips that one page (and its ~5 exercises) instead of the whole
        // category. Also cut offset 0..3 -> 0..2 (18 -> 12 requests for
        // "salle") since that volume is a likely cause of the rate-limit
        // hits in the first place.
        for (const param of params) {
          for (let offset = 0; offset < 2; offset++) {
            try {
              const query = new URLSearchParams({ ...param, offset: offset * 5 });
              const res = await fetch(`/api/exercises?${query}`, { headers });
              const data = await res.json();
              if (!res.ok || data.error) continue;
              if (Array.isArray(data)) allExercises.push(...data);
            } catch {
              // network hiccup on this one page — move on, don't abort the category
            }
          }
        }
        if (allExercises.length === 0) throw new Error('API unavailable');

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
