import { supabase } from './supabase';

export type Role = 'kid' | 'parent';

export interface Session {
  role: Role;
  userId: string;
  username: string; // parent: email; kid: their chosen username
}

interface AuthResult {
  error?: string;
  session?: Session;
}

// ── Parent auth (ordinary Supabase email/password) ──────────────────────────

export async function signUpParent(email: string, password: string): Promise<AuthResult> {
  const { data, error } = await supabase.auth.signUp({ email: email.trim().toLowerCase(), password });
  if (error) return { error: error.message };
  if (!data.user) return { error: 'Something went wrong creating your account.' };
  // If email confirmation is enabled on the Supabase project, no session is
  // issued yet — the parent has to confirm their email, then sign in.
  if (!data.session) return { error: 'Check your email to confirm your account, then sign in.' };
  return { session: { role: 'parent', userId: data.user.id, username: data.user.email ?? '' } };
}

export async function signInParent(email: string, password: string): Promise<AuthResult> {
  const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
  if (error || !data.user) return { error: 'That email or password is not right.' };
  return { session: { role: 'parent', userId: data.user.id, username: data.user.email ?? '' } };
}

// ── Kid auth (username + password, proxied through api/kid-login.ts since ──
// ── Supabase Auth itself only knows the kid by a synthetic email) ──────────

export async function signInKid(username: string, password: string): Promise<AuthResult> {
  const res = await fetch('/api/kid-login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: username.trim().toLowerCase(), password }),
  });
  if (!res.ok) return { error: 'That username or password is not right.' };

  const { access_token, refresh_token } = await res.json();
  const { data, error } = await supabase.auth.setSession({ access_token, refresh_token });
  if (error || !data.user) return { error: 'That username or password is not right.' };
  return { session: { role: 'kid', userId: data.user.id, username: username.trim().toLowerCase() } };
}

// ── Session ───────────────────────────────────────────────────────────────

// Role isn't stored on the JWT — a kid's auth user id IS the students.id, so
// checking for a matching students row (readable under RLS by the student
// themselves) is the authoritative way to tell kid from parent.
export async function getSession(): Promise<Session | null> {
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user;
  if (!user) return null;

  const { data: student } = await supabase.from('students').select('username').eq('id', user.id).maybeSingle();
  if (student) return { role: 'kid', userId: user.id, username: student.username };
  return { role: 'parent', userId: user.id, username: user.email ?? '' };
}

export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
}
