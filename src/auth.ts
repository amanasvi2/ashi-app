import {clearAllDescriptionDrafts} from './pages/onboarding/draftStorage';
import { supabase } from './supabase';
import type { OwnerType } from './ownerCaps';

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

// The selected account type survives email confirmation or an interrupted
// owners-row insert. Existing database rows remain authoritative and immutable.
async function ensureOwner(user:{id:string;user_metadata?:Record<string,unknown>}):Promise<boolean>{
 const {data,error}=await supabase.from('owners').select('owner_type').eq('id',user.id).maybeSingle();
 if(error)throw new Error('Account setup could not be checked.');
 if(data)return true;
 const ownerType=user.user_metadata?.owner_type==='clinician'?'clinician':'parent';
 const {error:insertError}=await supabase.from('owners').insert({id:user.id,owner_type:ownerType});
 if(!insertError)return true;
 // A second tab may have completed the same setup in the meantime.
 const retry=await supabase.from('owners').select('owner_type').eq('id',user.id).maybeSingle();
 return !retry.error&&!!retry.data;
}

// ── Owner auth (parent or clinician — ordinary Supabase email/password) ─────

export async function signUpOwner(email: string, password: string, ownerType: OwnerType): Promise<AuthResult> {
  const { data, error } = await supabase.auth.signUp({ email: email.trim().toLowerCase(), password, options:{data:{owner_type:ownerType}} });
  if (error) return { error: error.message };
  if (!data.user) return { error: 'Your account was not created. Try again.' };
  // If email confirmation is enabled on the Supabase project, no session is
  // issued yet — the owner has to confirm their email, then sign in.
  if (!data.session) return { error: 'Check your email to confirm your account. Then sign in.' };

  if (!await ensureOwner(data.user)) {
    await supabase.auth.signOut();
    return {error:'Your email account was created, but setup is unfinished. Sign in again to finish.'};
  }

  return { session: { role: 'parent', userId: data.user.id, username: data.user.email ?? '' } };
}

export async function signInParent(email: string, password: string): Promise<AuthResult> {
  const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
  if (error || !data.user) return { error: 'This email or password is not right. Try again.' };
  const student=await supabase.from('students').select('username').eq('id',data.user.id).maybeSingle();
  if(student.error)throw new Error('Account type could not be checked.');
  if(student.data){await supabase.auth.signOut();return {error:'Use Student sign in for this account.'};}
  if(!await ensureOwner(data.user))return {error:'Account setup could not be completed. Please try signing in again.'};
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
  if (!res.ok) return { error: 'This username or password is not right. Try again.' };

  const { access_token, refresh_token } = await res.json();
  const { data, error } = await supabase.auth.setSession({ access_token, refresh_token });
  if (error || !data.user) return { error: 'This username or password is not right. Try again.' };
  return { session: { role: 'kid', userId: data.user.id, username: username.trim().toLowerCase() } };
}

// ── Session ───────────────────────────────────────────────────────────────

// Role isn't stored on the JWT — a kid's auth user id IS the students.id, so
// checking for a matching students row (readable under RLS by the student
// themselves) is the authoritative way to tell kid from parent.
export async function getSession(): Promise<Session | null> {
  const { data: { session },error } = await supabase.auth.getSession();
  if(error)throw new Error('Your session could not be loaded.');
  const user = session?.user;
  if (!user) return null;

  const { data: student,error:studentError } = await supabase.from('students').select('username').eq('id', user.id).maybeSingle();
  if(studentError)throw new Error('Account type could not be checked.');
  if (student) return { role: 'kid', userId: user.id, username: student.username };
  if(!await ensureOwner(user))throw new Error('Account setup could not be completed.');
  return { role: 'parent', userId: user.id, username: user.email ?? '' };
}

export async function signOut(): Promise<void> {
  const {error}=await supabase.auth.signOut();
  if(error)throw new Error('Could not sign out. Please try again.');
  clearAllDescriptionDrafts();
}
