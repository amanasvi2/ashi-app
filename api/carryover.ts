import { validateAssessment } from '../src/tiers/model.js';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { verifyUser } from '../server/verifyUser.js';
import { supabaseAsUser } from '../server/asUser.js';
import { classifyCarryoverMoment, generateCarryoverItems, validateEditedItem } from '../server/carryover.js';
import { safeCapture, defaultSkill, SKILL_TYPES, MISSIONS, validateCheck, labResult,
  type CarryoverSkill, type LabActivity } from '../src/carryover/model.js';
import type { LevelState, DifficultyState } from '../src/types';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const user = await verifyUser(req.headers.authorization);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  const client = supabaseAsUser(String(req.headers.authorization).replace(/^Bearer\s+/i, ''));
  const b = req.body ?? {};
  const studentId = typeof b.studentId === 'string' ? b.studentId : user.id;
  const { data: student, error: studentError } = await client.from('students').select('id,owner_id').eq('id', studentId).maybeSingle();
  if (studentError) return res.status(503).json({ error: 'Could not check student access.' });
  if (!student || (student.id !== user.id && student.owner_id !== user.id)) return res.status(403).json({ error: 'Student access denied.' });
  const owner = student.owner_id === user.id;
  if (['capture','generate','review','check','assessment'].includes(b.action) && !owner) return res.status(403).json({ error: 'Only the owner can review or record observations.' });
  if (['mission','lab'].includes(b.action) && student.id !== user.id) return res.status(403).json({ error: 'This choice belongs to the student.' });
  try {
    if (b.action === 'load') {
      const tables = ['carryover_moments','carryover_items','carryover_checks','carryover_lab_events','carryover_snapshots','carryover_missions'];
      const results = await Promise.all(tables.map(t => {
        const query=client.from(t).select('*').eq('student_id',studentId);
        return t==='carryover_missions'?query.limit(1):query.order(t==='carryover_checks'?'week':'created_at',{ascending:false}).limit(500);
      }));
      if (results.some(r => r.error)) return res.status(503).json({ error: 'Carryover storage is unavailable. Apply migration 0009 and check database access.' });
      const [moments, items, checks, events, snapshots, missions] = results.map(r => r.data ?? []);
      const [assessmentRows, attemptRows] = await Promise.all([
        client.from('skill_assessments').select('id,skill_id,task,situation,setting,context,result,help,created_at').eq('student_id',studentId).order('created_at',{ascending:false}).limit(500),
        client.from('item_attempts').select('id,skill_id,carryover_item_id,support_level,result,created_at').eq('student_id',studentId).eq('source','carryover').order('created_at',{ascending:false}).limit(500),
      ]);
      if (assessmentRows.error || attemptRows.error) return res.status(503).json({error:'Skill tier storage is unavailable. Apply migrations 0009 and 0010 and check database access.'});
      return res.json({ moments, items, checks, events, snapshots, assessments:assessmentRows.data??[], skillAttempts:attemptRows.data??[], mission: missions[0]?.mission ?? null });
    }
    if (b.action === 'capture') {
      const capture = safeCapture(b.capture);
      const { data, error } = await client.from('carryover_moments').insert({ ...capture, student_id: studentId, skill_id: defaultSkill(capture) }).select().single();
      if (error) throw new Error('Could not save the anonymous moment.');
      return res.json(data);
    }
    if (b.action === 'generate') {
      const { data: moment } = await client.from('carryover_moments').select('*').eq('id', b.momentId).eq('student_id', studentId).single();
      if (!moment) return res.status(404).json({ error: 'Moment not found.' });
      const capture = safeCapture(moment);
      const skill = await classifyCarryoverMoment(capture);
      const type = SKILL_TYPES[skill];
      const [{ data: l }, { data: d }] = await Promise.all([
        client.from('level_state').select('levels').eq('student_id',studentId).single(),
        client.from('difficulty_state').select('state').eq('student_id',studentId).single(),
      ]);
      if (!l || !d) throw new Error('Student support state is unavailable.');
      const levels = l.levels as LevelState; const difficulty = d.state as DifficultyState;
      const items = await generateCarryoverItems(capture,skill,levels,difficulty);
      const { data, error } = await client.from('carryover_items').insert(items.map(item=>({ student_id:studentId,moment_id:moment.id,
        skill_id:skill,support_level:levels[type],difficulty:difficulty[type],item,status:'pending' }))).select();
      if (error) throw new Error('Could not save pending items.');
      const updated = await client.from('carryover_moments').update({skill_id:skill}).eq('id',moment.id).eq('student_id',studentId);
      if (updated.error) throw new Error('Items saved, but the moment skill could not be updated. Reload before retrying.');
      return res.json(data);
    }
    if (b.action === 'review') {
      if (!['approved','rejected','pending'].includes(b.status)) return res.status(400).json({error:'Invalid review status.'});
      const { data: row } = await client.from('carryover_items').select('*').eq('id',b.itemId).eq('student_id',studentId).single();
      if (!row) return res.status(404).json({error:'Review item not found.'});
      const type = SKILL_TYPES[row.skill_id as CarryoverSkill];
      const item = b.status==='rejected' ? row.item : validateEditedItem(b.item ?? row.item,row.skill_id,
        {social:3,nonverbal:3,inference:3,[type]:row.support_level},
        {social:1,nonverbal:1,inference:1,[type]:row.difficulty});
      const { error } = await client.from('carryover_items').update({item,status:b.status,reviewer_id:user.id,reviewed_at:new Date().toISOString()})
        .eq('id',row.id).eq('student_id',studentId);
      if (error) throw new Error('The review was not saved.');
      return res.json({ok:true});
    }
    if (b.action === 'check') {
      const check = validateCheck(b.check);
      const { error } = await client.from('carryover_checks').upsert({...check,student_id:studentId});
      if (error) throw new Error('The observation was not saved.');
      return res.json({ok:true});
    }
    if (b.action === 'assessment') {
      const assessment = validateAssessment(b.assessment);
      const {error} = await client.from('skill_assessments').insert({...assessment,student_id:studentId});
      if (error) throw new Error('The skill check was not saved.');
      return res.json({ok:true});
    }
    if (b.action === 'mission') {
      if (!MISSIONS.includes(b.mission)) return res.status(400).json({error:'Choose a listed mission.'});
      const {error} = await client.from('carryover_missions').upsert({student_id:studentId,mission:b.mission});
      if (error) throw new Error('The mission was not saved.');
      return res.json({ok:true});
    }
    if (b.action === 'lab') {
      const verdict = labResult(b.activity as LabActivity,b.scene,b.choice);
      if (typeof b.help !== 'boolean') return res.status(400).json({error:'Missing support information.'});
      const {error} = await client.from('carryover_lab_events').insert({student_id:studentId,activity:b.activity,scene:b.scene,
        result:verdict.result,help:b.help});
      if (error) throw new Error('The practice result was not saved.');
      return res.json(verdict);
    }
    return res.status(400).json({error:'Unknown Carryover action.'});
  } catch {
    // No raw model output, credentials, or student data in error logs.
    return res.status(422).json({error:'Could not complete this action. Check the fields and try again; no approval was granted.'});
  }
}
