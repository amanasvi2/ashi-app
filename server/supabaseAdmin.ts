// Server-only. Uses the service-role key, which bypasses RLS entirely — only
// ever use this for actions an ordinary user session can't do for itself,
// like admin-creating a kid's Auth user (api/create-student.ts) or the
// username -> email lookup for kid login (api/kid-login.ts).

import { createClient } from '@supabase/supabase-js';

export const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL ?? '',
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
  { auth: { autoRefreshToken: false, persistSession: false } },
);
