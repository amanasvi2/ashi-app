const CREDS_KEY = 'ashi_creds_v1';
const SESSION_KEY = 'ashi_sess_v1';

export type Role = 'kid' | 'parent';

interface StoredCreds {
  kid:    { username: string; hash: string };
  parent: { username: string; hash: string };
}

export interface Session {
  role: Role;
  username: string;
}

// djb2-variant hash — not cryptographic, but enough to obscure plaintext in localStorage
function hash(password: string): string {
  const salted = `ashi:${password}:2024`;
  let h = 5381;
  for (let i = 0; i < salted.length; i++) {
    h = (Math.imul(31, h) + salted.charCodeAt(i)) | 0;
  }
  return (h >>> 0).toString(36);
}

// ── Credentials ───────────────────────────────────────────────────────────────

export function hasCredentials(): boolean {
  return localStorage.getItem(CREDS_KEY) !== null;
}

export function loadCreds(): StoredCreds | null {
  try {
    return JSON.parse(localStorage.getItem(CREDS_KEY) ?? 'null');
  } catch { return null; }
}

export function setupCredentials(
  kidUsername: string, kidPassword: string,
  parentUsername: string, parentPassword: string,
): void {
  const creds: StoredCreds = {
    kid:    { username: kidUsername.trim().toLowerCase(),    hash: hash(kidPassword) },
    parent: { username: parentUsername.trim().toLowerCase(), hash: hash(parentPassword) },
  };
  localStorage.setItem(CREDS_KEY, JSON.stringify(creds));
}

// Returns the role if credentials match, null otherwise
export function validateLogin(username: string, password: string): Role | null {
  const creds = loadCreds();
  if (!creds) return null;
  const u = username.trim().toLowerCase();
  if (u === creds.kid.username    && hash(password) === creds.kid.hash)    return 'kid';
  if (u === creds.parent.username && hash(password) === creds.parent.hash) return 'parent';
  return null;
}

export function getKidUsername(): string {
  return loadCreds()?.kid.username ?? 'student';
}

// ── Session ───────────────────────────────────────────────────────────────────

export function getSession(): Session | null {
  try {
    return JSON.parse(sessionStorage.getItem(SESSION_KEY) ?? 'null');
  } catch { return null; }
}

export function setSession(session: Session): void {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function clearSession(): void {
  sessionStorage.removeItem(SESSION_KEY);
}
