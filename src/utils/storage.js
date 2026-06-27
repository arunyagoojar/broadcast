export function readJson(key, fallback) {
  try {
    const value = window.localStorage.getItem(key);
    if (!value) return fallback;
    return JSON.parse(value);
  } catch (err) {
    console.warn(`[Broadcast] Resetting invalid localStorage key: ${key}`, err);
    return fallback;
  }
}

export function writeJson(key, value) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.warn(`[Broadcast] Could not persist localStorage key: ${key}`, err);
  }
}
