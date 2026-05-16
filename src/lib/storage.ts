// Tiny localStorage helper — backend-ready: swap for Supabase later.
export const load = <T,>(key: string, seed: T): T => {
  try {
    const raw = localStorage.getItem(`hf:${key}`);
    if (!raw) return seed;
    return JSON.parse(raw) as T;
  } catch { return seed; }
};
export const save = <T,>(key: string, value: T) => {
  try { localStorage.setItem(`hf:${key}`, JSON.stringify(value)); } catch {}
};
export const uid = () => Math.random().toString(36).slice(2, 10);
