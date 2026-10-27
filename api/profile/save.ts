import {validateLearningPreferences,PLAIN_LANGUAGE_SUPPORT} from '../../src/pilot/preferences.js';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { verifyUser } from '../../server/verifyUser.js';
import { supabaseAsUser } from '../../server/asUser.js';
import { validateStudentProfile } from '../../src/profileValidation.js';
import type { StudentProfileInput } from '../../src/profileTypes';
import { isUnderStudentCap, type OwnerType } from '../../src/ownerCaps.js';

// Uses the caller's own token (not the service-role client) — RLS's
// "owner_id = auth.uid()" policy already permits exactly this insert, so
// there's no need to bypass it.
export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const owner = await verifyUser(req.headers.authorization);
    if (!owner) return res.status(401).json({ error: 'Unauthorized' });

    if(req.body?.action==='update-learning-profile'){
      const {studentId}=req.body;
      if(typeof studentId!=='string'||!studentId)return res.status(400).json({error:'A student is required.'});
      let preferences;
      try{preferences=validateLearningPreferences(req.body.preferences);}catch(e){return res.status(400).json({error:(e as Error).message});}
      const token=String(req.headers.authorization).replace(/^Bearer\s+/i,'');
      const client=supabaseAsUser(token);
      const {data:existing,error:readError}=await client.from('student_profiles').select('id,supports').eq('student_id',studentId).eq('owner_id',owner.id).eq('is_active',true).maybeSingle();
      if(readError)return res.status(503).json({error:'The learning profile could not be loaded.'});
      if(!existing)return res.status(403).json({error:'Only this learner’s owner can edit their learning profile.'});
      const supports=(existing.supports??[]).filter((s:string)=>s!==PLAIN_LANGUAGE_SUPPORT);
      if(preferences.plainLanguage)supports.push(PLAIN_LANGUAGE_SUPPORT);
      const {data,error}=await client.from('student_profiles').update({grade:preferences.grade,reading_level:preferences.reading_level,interests:preferences.interests,supports}).eq('id',existing.id).eq('owner_id',owner.id).eq('student_id',studentId).eq('is_active',true).select('display_name,grade,reading_level,strengths,focus,supports,session_length_min,interests').maybeSingle();
      if(error||!data)return res.status(503).json({error:'The learning profile was not saved. Please try again.'});
      return res.status(200).json({profile:data});
    }
    if(req.body?.action)return res.status(400).json({error:'Unknown profile action.'});

    const { profile }: { profile?: StudentProfileInput } = req.body ?? {};
    if (!profile) return res.status(400).json({ error: 'Missing profile' });

    const { valid, errors } = validateStudentProfile(profile);
    if (!valid) return res.status(400).json({ error: errors[0] });

    const token = String(req.headers.authorization).replace(/^Bearer\s+/i, '');
    const client = supabaseAsUser(token);

    // A Student is a profile (with or without a login yet), so this is
    // the one place a new Student gets created — the cap is checked here,
    // server-side, regardless of what the UI does or doesn't gate on.
    const [{ data: ownerRow,error:ownerError }, { count: activeCount,error:countError }] = await Promise.all([
      client.from('owners').select('owner_type').eq('id', owner.id).maybeSingle(),
      client.from('student_profiles').select('id', { count: 'exact', head: true })
        .eq('owner_id', owner.id).eq('is_active', true),
    ]);
    if(ownerError||countError||!Number.isInteger(activeCount))return res.status(503).json({error:'Account limits could not be checked. Please try again.'});
    const ownerType: OwnerType = (ownerRow?.owner_type as OwnerType | undefined) ?? 'parent';
    if (!isUnderStudentCap(activeCount ?? 0, ownerType)) {
      return res.status(409).json({ error: `You've reached the limit of students for this account.` });
    }

    const { data, error } = await client
      .from('student_profiles')
      .insert({
        owner_id: owner.id,
        student_id: null,
        display_name: profile.display_name.trim(),
        grade: profile.grade,
        reading_level: profile.reading_level,
        strengths: profile.strengths,
        focus: profile.focus,
        supports: profile.supports,
        session_length_min: profile.session_length_min,
        interests: profile.interests,
        is_active: true,
      })
      .select('id, display_name')
      .single();

    if (error || !data) {
      return res.status(500).json({ error: error?.message ?? 'Could not save profile' });
    }

    res.status(200).json({ id: data.id, displayName: data.display_name });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err instanceof Error ? err.message : 'Could not save profile' });
  }
}
