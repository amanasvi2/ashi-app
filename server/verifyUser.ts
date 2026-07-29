// Server-only. Confirms a request carries a valid Supabase session (parent
// or student — both are ordinary Supabase Auth users) before we spend money
// calling Groq on their behalf.

import { createClient } from '@supabase/supabase-js';
import type { User } from '@supabase/supabase-js';

export async function verifyUser(authHeader: string | string[] | undefined): Promise<User | null> {
  const header = Array.isArray(authHeader) ? authHeader[0] : authHeader;
  if (!header?.startsWith('Bearer ')) return null;

  const token = header.slice('Bearer '.length);
  const supabase = createClient(process.env.VITE_SUPABASE_URL ?? '', process.env.VITE_SUPABASE_ANON_KEY ?? '');
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return null;
  return data.user;
}
