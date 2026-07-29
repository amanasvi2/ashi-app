// Server-only. Builds a Supabase client scoped to the calling user's own
// session token, so ordinary RLS policies apply — used when a handler needs
// to read the caller's own rows (e.g. their active student_profiles row)
// without reaching for the service-role client.

import { createClient } from '@supabase/supabase-js';

export function supabaseAsUser(bearerToken: string) {
  return createClient(process.env.VITE_SUPABASE_URL ?? '', process.env.VITE_SUPABASE_ANON_KEY ?? '', {
    global: { headers: { Authorization: `Bearer ${bearerToken}` } },
  });
}
