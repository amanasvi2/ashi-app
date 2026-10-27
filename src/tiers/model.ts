import { LAB, SETTINGS, SITUATIONS, SKILL_TYPES, type CarryoverSkill, type LabEvent, type TransferCheck } from '../carryover/model';

export const TIER_NAMES = ['Building evidence', 'Recognize', 'Explain', 'Respond', 'Generalize', 'Carry over'] as const;
export const TIER_RULES = { version: 'pilot-v1', days: 90, window: 10, minimum: 3, accuracy: .8, delayDays: 7 } as const;
export type Task = 'recognition' | 'explanation' | 'response';
export interface Assessment {
  id: string; skill_id: CarryoverSkill; task: Task; situation: keyof typeof SITUATIONS;
  setting: typeof SETTINGS[number]; context: 'familiar' | 'new';
  result: 'correct' | 'partial' | 'incorrect'; help: 'independent' | 'general cue' | 'model'; created_at: string;
}
export interface SkillAttempt {
  id: string; skill_id: CarryoverSkill; carryover_item_id: string; support_level: number;
  result: 'correct' | 'partial' | 'incorrect'; created_at: string;
}
export function validateAssessment(value: unknown): Omit<Assessment, 'id' | 'created_at'> {
  const a = value as Assessment;
  if (!a || !Object.hasOwn(SKILL_TYPES, a.skill_id) || !['recognition','explanation','response'].includes(a.task) ||
      !Object.hasOwn(SITUATIONS, a.situation) || !SETTINGS.includes(a.setting) || !['familiar','new'].includes(a.context) ||
      !['correct','partial','incorrect'].includes(a.result) || !['independent','general cue','model'].includes(a.help)) throw new Error('Choose all observation fields.');
  return {skill_id:a.skill_id,task:a.task,situation:a.situation,setting:a.setting,context:a.context,result:a.result,help:a.help};
}
const DAY = 86400000;
const LAB_SKILLS: Record<LabEvent['activity'], readonly CarryoverSkill[]> = {
  unfamiliar: ['perspective_taking','inference_from_text','perspective_taking'],
  repair: ['identify_problem_and_solutions','nonliteral_language','identify_problem_and_solutions'],
  interpretations: ['perspective_taking','perspective_taking'], tone: ['nonverbal_cues','nonverbal_cues'],
};
interface Evidence { key: string; created_at: string; correct: boolean; independent: boolean }
export interface TierGate { label: string; met: boolean; detail: string }
// Latest observation per example: repeated clicks/retries cannot manufacture a
// range of examples. Partial answers count as practice, not a successful check.
function uniqueLatest<T extends Evidence>(rows: T[]): T[] {
  const unique = new Map<string,T>();
  for (const r of rows.toSorted((a,b)=>a.created_at.localeCompare(b.created_at))) unique.set(r.key,r);
  return [...unique.values()].toSorted((a,b)=>a.created_at.localeCompare(b.created_at)).slice(-TIER_RULES.window);
}
function performance(rows: Evidence[], independent: boolean): TierGate {
  const sample=uniqueLatest(rows);
  const correct=sample.filter(r=>r.correct&&(!independent||r.independent));
  const days=new Set(correct.map(r=>r.created_at.slice(0,10))).size;
  return {label:'',met:sample.length>=TIER_RULES.minimum && correct.length/sample.length>=TIER_RULES.accuracy && days>=2,
    detail:`${correct.length}/${sample.length} ${independent?'independent ':''}successful examples across ${days} days; need at least 3 examples, 80%, and 2 days.`};
}
export function skillTier(skill: CarryoverSkill, assessments: Assessment[], events: LabEvent[], checks: TransferCheck[], attempts: SkillAttempt[] = [], now=Date.now()) {
  const recent=(date:string)=>Number.isFinite(Date.parse(date)) && Date.parse(date)<=now && Date.parse(date)>=now-TIER_RULES.days*DAY;
  const observed=assessments.filter(a=>a.skill_id===skill&&recent(a.created_at));
  const evidence=(task:Task)=>observed.filter(a=>a.task===task).map(a=>({key:`adult:${a.setting}:${a.situation}`,created_at:a.created_at,correct:a.result==='correct',independent:a.help==='independent'}));
  const lab:Evidence[]=events.filter(e=>LAB[e.activity]?.[e.scene]&&LAB_SKILLS[e.activity]?.[e.scene]===skill&&recent(e.created_at)).map(e=>({key:`lab:${e.activity}:${e.scene}`,created_at:e.created_at,correct:e.result==='correct',independent:!e.help}));
  // Unlabelled legacy attempts and broad engine mastery cannot establish a skill tier.
  // Open-response correctness does not prove explanation quality: it only supports recognition.
  const app:Evidence[]=attempts.filter(a=>a.skill_id===skill&&a.carryover_item_id&&recent(a.created_at)).map(a=>({key:`app:${a.carryover_item_id}`,created_at:a.created_at,correct:a.result==='correct',independent:a.support_level===0}));
  const recognition=performance([...evidence('recognition'),...lab,...app],false);
  const explanation=performance(evidence('explanation'),true);
  const response=performance(evidence('response'),true);
  const responses=uniqueLatest(observed.filter(a=>a.task==='response').map(a=>({...a,key:`adult:${a.setting}:${a.situation}`,correct:a.result==='correct',independent:a.help==='independent'})));
  const successful=responses.filter(a=>a.correct&&a.independent);
  const first=successful.length?Math.min(...successful.map(a=>Date.parse(a.created_at))):Infinity;
  const newResponses=successful.filter(a=>a.context==='new');
  const settings=new Set(newResponses.map(a=>a.setting));
  const delayed=newResponses.some(a=>Date.parse(a.created_at)-first>=TIER_RULES.delayDays*DAY);
  const generalize={label:'Generalize',met:response.met&&settings.size>=2&&delayed,
    detail:`${settings.size} unfamiliar settings; ${delayed?'delayed check recorded':'need an independent unfamiliar response at least 7 days after the first successful response'}. Need 2 settings.`};
  // No opportunity/unsure is excluded, never scored as failure. Latest two actual
  // opportunities must both demonstrate independent use, in different weeks.
  const weekly=new Map<string,TransferCheck>();
  for(const c of checks.filter(c=>c.skill_id===skill&&recent(c.week+'T00:00:00Z')))weekly.set(c.week,c);
  const opportunities=[...weekly.values()].filter(c=>c.opportunity==='yes').sort((a,b)=>a.week.localeCompare(b.week)).slice(-2);
  const carry={label:'Carry over',met:opportunities.length===2&&opportunities.every(c=>c.help==='independent'&&(c.rating==='same'||c.rating==='better')),
    detail:`${opportunities.filter(c=>c.help==='independent'&&(c.rating==='same'||c.rating==='better')).length}/2 recent observed weeks with independent use rated same or better. No opportunity is excluded.`};
  const gates:TierGate[]=[{...recognition,label:'Recognize'},{...explanation,label:'Explain'},{...response,label:'Respond'},generalize,carry];
  let tier=0;for(const gate of gates){if(!gate.met)break;tier++;}
  return {tier,name:TIER_NAMES[tier],gates,next:gates[tier]??null,observations:observed.length,appExamples:uniqueLatest([...lab,...app]).length};
}
