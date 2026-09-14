/**
 * Where the doctor is sitting, as this machine remembers it (0091).
 *
 * A doctor at a hospital by day and their chamber by evening uses a different
 * computer at each. Whichever place they last chose on the prescription pad —
 * or for a walk-in — is remembered here, per browser, and the pad and the
 * walk-in form start from it. A per-machine convenience, so localStorage is
 * the right home: nothing about it belongs on the server or to another device.
 */

const KEY = "hf.rx.place";

export const rememberedPlace = (): string | null => {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
};

export const rememberPlace = (tenantId: string) => {
  try {
    localStorage.setItem(KEY, tenantId);
  } catch {
    // Private window or blocked storage: the choice holds for this page only.
  }
};
