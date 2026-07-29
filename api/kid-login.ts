import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { supabaseAdmin } from '../server/supabaseAdmin';

// Kids only have a username, not an email, so Supabase Auth's own
// signInWithPassword can't be called directly from the client. This looks
// up the synthetic email behind the scenes (via a SECURITY DEFINER function
// only the service role can call) and signs in on the kid's behalf.
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { username, password }: { username?: string; password?: string } = req.body ?? {};
  if (!username || !password) return res.status(400).json({ error: 'Missing username or password' });

  const { data: email, error: lookupError } = await supabaseAdmin.rpc('get_kid_login_email', {
    p_username: username,
  });
  if (lookupError || !email) return res.status(401).json({ error: 'Invalid credentials' });

  const anon = createClient(process.env.VITE_SUPABASE_URL ?? '', process.env.VITE_SUPABASE_ANON_KEY ?? '');
  const { data, error } = await anon.auth.signInWithPassword({ email, password });
  if (error || !data.session) return res.status(401).json({ error: 'Invalid credentials' });

  res.status(200).json({
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
  });
}
