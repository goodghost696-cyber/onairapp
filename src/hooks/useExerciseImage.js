import { useState, useEffect } from 'react';

const imageCache = {};

export const useExerciseImage = (wgerId) => {
  const [imageUrl, setImageUrl] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!wgerId) return;

    if (imageCache[wgerId]) {
      setImageUrl(imageCache[wgerId]);
      setLoading(false);
      return;
    }

    fetch(`https://wger.de/api/v2/exerciseimage/?exercise_base=${wgerId}&format=json`)
      .then(r => r.json())
      .then(data => {
        const url = data.results?.[0]?.image || null;
        imageCache[wgerId] = url;
        setImageUrl(url);
        setLoading(false);
      })
      .catch(() => {
        setImageUrl(null);
        setLoading(false);
      });
  }, [wgerId]);

  return { imageUrl, loading };
};
