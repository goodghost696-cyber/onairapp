export const save = (key, value) => {
  try {
    localStorage.setItem(`onair_${key}`, JSON.stringify(value));
  } catch(e) { console.error(e); }
};

export const load = (key, fallback = null) => {
  try {
    const val = localStorage.getItem(`onair_${key}`);
    return val ? JSON.parse(val) : fallback;
  } catch(e) { return fallback; }
};

export const clearDay = () => {
  const today = new Date().toDateString();
  const lastReset = localStorage.getItem('onair_last_reset');
  if (lastReset !== today) {
    localStorage.setItem('onair_last_reset', today);
    return true;
  }
  return false;
};
