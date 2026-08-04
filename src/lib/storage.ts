const PREFIX = "vg:";

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

export function storageGet<T>(key: string, fallback: T): T {
  if (!isBrowser()) return fallback;
  try {
    const v = window.localStorage.getItem(PREFIX + key);
    return v ? (JSON.parse(v) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function storageSet<T>(key: string, val: T): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(PREFIX + key, JSON.stringify(val));
  } catch {
    // quota exceeded / private mode — csendben elnyeljük, a nyaralás nem áll meg emiatt
  }
}
