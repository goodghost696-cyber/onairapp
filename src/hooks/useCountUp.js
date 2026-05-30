import { useState, useEffect } from 'react';

const easeOutExpo = t => t === 1 ? 1 : 1 - Math.pow(2, -10 * t);

export const useCountUp = (target, duration = 900) => {
  const [value, setValue] = useState(0);
  useEffect(() => {
    let start = null;
    let raf;
    const step = (timestamp) => {
      if (!start) start = timestamp;
      const progress = Math.min((timestamp - start) / duration, 1);
      setValue(Math.floor(easeOutExpo(progress) * target));
      if (progress < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return value;
};
