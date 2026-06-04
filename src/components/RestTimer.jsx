import { useState, useEffect, useRef } from 'react';
import '../styles/RestTimer.css';

export const RestTimer = ({ onDismiss }) => {
  const [seconds, setSeconds] = useState(60);
  const [active, setActive] = useState(true);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (!active) return;
    intervalRef.current = setInterval(() => {
      setSeconds(s => {
        if (s <= 1) {
          clearInterval(intervalRef.current);
          setActive(false);
          navigator.vibrate && navigator.vibrate([200, 100, 200]);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(intervalRef.current);
  }, [active]);

  const progress = seconds / 60;

  return (
    <div className="rest-timer">
      <div className="rest-timer-left">
        <svg width="36" height="36" viewBox="0 0 36 36">
          <circle cx="18" cy="18" r="15" fill="none" stroke="var(--border)" strokeWidth="2"/>
          <circle
            cx="18" cy="18" r="15"
            fill="none"
            stroke="var(--accent)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeDasharray={`${2 * Math.PI * 15}`}
            strokeDashoffset={`${2 * Math.PI * 15 * (1 - progress)}`}
            transform="rotate(-90 18 18)"
          />
        </svg>
        <div>
          <p className="rest-timer-label">REPOS</p>
          <p className="rest-timer-seconds">
            {seconds > 0 ? `${seconds}s` : 'Go !'}
          </p>
        </div>
      </div>
      <div className="rest-timer-actions">
        <button className="rest-timer-skip" onClick={onDismiss}>SKIP</button>
        <button className="rest-timer-adjust" onClick={() => setSeconds(s => s + 30)}>+30s</button>
      </div>
    </div>
  );
};
