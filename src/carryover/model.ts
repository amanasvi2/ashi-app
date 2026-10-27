import type { Assessment, SkillAttempt } from '../tiers/model';
import type { Item, ItemType, LevelState, DifficultyState, SupportLevel } from '../types';

export const SITUATIONS = {
  unclear: 'Someone said something that was hard to understand.',
  excluded: 'Someone was left out of a group activity.',
  disagreement: 'Two people wanted different things.',
  tone: 'The words and the tone seemed different.',
  help: 'Someone needed help but was not sure how to ask.',
} as const;
export const SETTINGS = ['classroom', 'lunch', 'home', 'team activity', 'group chat', 'other setting'] as const;
export const ROLES = ['friend', 'sibling', 'teacher', 'classmate', 'adult', 'another person'] as const;
export const RESPONSES = ['asked for help', 'asked what it meant', 'stayed quiet', 'disagreed', 'left the situation', 'tried another response'] as const;
export const SKILL_TYPES = {
  perspective_taking: 'social', nonverbal_cues: 'nonverbal',
  inference_from_text: 'inference', nonliteral_language: 'inference',
  identify_problem_and_solutions: 'social',
} as const satisfies Record<string, ItemType>;
export type CarryoverSkill = keyof typeof SKILL_TYPES;
export function redactNames(text: string, names: string[]): string {
  return names.map(n=>n.trim()).filter(Boolean).sort((a,b)=>b.length-a.length).reduce((result,name)=>{
    const escaped=name.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
    return result.replace(new RegExp(`(?<![\\p{L}\\p{N}_])${escaped}(?![\\p{L}\\p{N}_])`,'giu'),'another person');
  },text);
}
export function redactItemNames(item: Item, names: string[]): Item {
  const clean=(text:string)=>redactNames(text,names);
  return {...item,scenario:clean(item.scenario),questions:item.questions.map(q=>({...q,text:clean(q.text),
    stem:q.stem?clean(q.stem):undefined,evidence:q.evidence?clean(q.evidence):undefined,
    choices:q.choices?.map(clean) as [string,string,string]|undefined,
    wordBank:q.wordBank?.map(w=>({...w,text:clean(w.text)}))}))};
}
export const COACHING:Record<CarryoverSkill,string>={
  perspective_taking:'Pause. If needed, ask “What might the other person need?” Model an explanation only if the cue was not enough.',
  nonverbal_cues:'Pause. Ask which words, expression, or context gave a clue. Offer possibilities instead of telling the child what someone must feel.',
  inference_from_text:'Pause. Ask which detail supports the idea. Model connecting two clues only if needed.',
  nonliteral_language:'Pause. Ask whether the words fit the situation. Model asking “What do you mean?” if needed.',
  identify_problem_and_solutions:'Pause. Ask what each person wants. Model one safe option, including asking for help or leaving.',
};
export const SKILL_LABELS: Record<CarryoverSkill, string> = {
  perspective_taking: 'Other points of view', nonverbal_cues: 'Tone and body language',
  inference_from_text: 'Reading between the lines', nonliteral_language: 'Implied meaning',
  identify_problem_and_solutions: 'Problems and solutions',
};
export interface Capture {
  situation: keyof typeof SITUATIONS;
  setting: typeof SETTINGS[number]; role: typeof ROLES[number]; response: typeof RESPONSES[number];
}
// Privacy by construction: free-text notes and extra fields never enter this
// object. Arbitrary-name detection cannot guarantee anonymous free text.
export function safeCapture(value: unknown): Capture {
  if (!value || typeof value !== 'object') throw new Error('Choose a situation, setting, role, and response.');
  const v = value as Record<string, unknown>;
  if (typeof v.situation !== 'string' || !Object.hasOwn(SITUATIONS, v.situation) || !SETTINGS.includes(v.setting as Capture['setting']) ||
      !ROLES.includes(v.role as Capture['role']) || !RESPONSES.includes(v.response as Capture['response'])) {
    throw new Error('Choose only the listed role-based options.');
  }
  return { situation: v.situation, setting: v.setting, role: v.role, response: v.response } as Capture;
}
export function momentSummary(capture: Capture): string {
  const c = safeCapture(capture);
  return `${SITUATIONS[c.situation]} Setting: ${c.setting}. Other person: ${c.role}. The child ${c.response}.`;
}
export function defaultSkill(c: Capture): CarryoverSkill {
  return c.situation === 'tone' ? 'nonverbal_cues' : c.situation === 'unclear' ? 'nonliteral_language' :
    c.situation === 'excluded' ? 'perspective_taking' : 'identify_problem_and_solutions';
}
export interface Moment extends Capture { id: string; student_id: string; skill_id: CarryoverSkill; created_at: string }
export interface ReviewedItem {
  id: string; student_id: string; moment_id: string; skill_id: CarryoverSkill;
  support_level: SupportLevel; difficulty: number; item: Item;
  status: 'pending' | 'approved' | 'rejected'; reviewed_at?: string;
}
export interface TransferCheck {
  skill_id: CarryoverSkill; week: string;
  opportunity: 'yes' | 'no' | 'unsure'; rating: 'worse' | 'same' | 'better' | null;
  help: 'independent' | 'general cue' | 'model' | null;
}
export interface LabEvent { activity: LabActivity; scene: number; result: 'correct' | 'incorrect'; help: boolean; created_at: string }
export function recheckDue(events: LabEvent[], now = Date.now()): boolean {
  const dates=events.filter(e=>e.activity==='unfamiliar').map(e=>Date.parse(e.created_at)).filter(Number.isFinite);
  return dates.length>0 && now-Math.max(...dates)>=7*86400000;
}
export interface Snapshot { item_type: ItemType; mastered: boolean; support_level: number; difficulty: number; created_at: string }
export interface Workspace {
  moments: Moment[]; items: ReviewedItem[]; checks: TransferCheck[]; events: LabEvent[];
  snapshots: Snapshot[]; mission: string | null;
  assessments?: Assessment[]; skillAttempts?: SkillAttempt[];
}
export type LabActivity = 'unfamiliar' | 'repair' | 'interpretations' | 'tone';
export const MISSIONS = ['Join an activity', 'Ask what someone means', 'Ask for more time', 'Set a boundary'] as const;
export const MISSION_PRACTICE:Record<string,{activity:LabActivity;scene:number}>={
  'Join an activity':{activity:'unfamiliar',scene:0},
  'Ask what someone means':{activity:'repair',scene:1},
  'Ask for more time':{activity:'repair',scene:0},
  'Set a boundary':{activity:'repair',scene:2},
};
export function weekKey(now = new Date()): string {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  d.setUTCDate(d.getUTCDate() - (d.getUTCDay() + 6) % 7);
  return d.toISOString().slice(0, 10);
}
export function validateCheck(value: unknown): TransferCheck {
  const c = value as TransferCheck;
  if (!c || !Object.hasOwn(SKILL_TYPES, c.skill_id) || !/^\d{4}-\d{2}-\d{2}$/.test(c.week) ||
      !['yes','no','unsure'].includes(c.opportunity)) throw new Error('Invalid transfer check.');
  if (new Date(c.week+'T00:00:00Z').toISOString().slice(0,10)!==c.week || weekKey(new Date(c.week+'T00:00:00Z'))!==c.week || c.week>weekKey()) throw new Error('Choose a valid current or past Monday.');
  if (c.opportunity === 'yes' && (!['worse','same','better'].includes(c.rating ?? '') ||
      !['independent','general cue','model'].includes(c.help ?? ''))) throw new Error('Choose how it went and the help needed.');
  return { skill_id: c.skill_id, week: c.week, opportunity: c.opportunity,
    rating: c.opportunity === 'yes' ? c.rating : null, help: c.opportunity === 'yes' ? c.help : null };
}
export function transferFlag(snapshot: Snapshot | undefined, checks: TransferCheck[]): boolean {
  const observed = checks.filter(c => c.opportunity === 'yes');
  return !!snapshot?.mastered && observed.length >= 2 && observed.slice(-2).every(c => c.rating === 'worse' || c.help === 'model');
}
export function selectCarryover(rows: ReviewedItem[], mode: string, levels: LevelState, difficulty: DifficultyState,
  floor: Record<ItemType, boolean>, count: number): Item[] {
  return rows.filter(r => r.status === 'approved' && r.support_level === levels[r.item.type] &&
    r.difficulty === difficulty[r.item.type] && !floor[r.item.type] && (mode === 'mixed' || mode === r.item.type))
    .slice(0, count).map(r => ({ ...r.item, id: r.id, source: 'carryover' as const, momentId: r.moment_id, skillId: r.skill_id }));
}

export const LAB = {
  unfamiliar: [
    { text: 'At a team meeting, a classmate says “I have not had a turn” and moves toward the materials. What could you do?', choices: ['Ask if they want a turn', 'Assume they dislike you', 'Keep all the materials'], correct: [0], feedback: 'You used a new setting to notice someone might want a turn.', hint: 'Think about what they said they have not had.' },
    { text: 'In a group chat, a friend writes “Which page?” after you mention homework. What could you do?', choices: ['Tell them the page number', 'Assume they are angry', 'Leave the group'], correct: [0], feedback: 'You gave the missing information in a different setting.', hint: 'What information is missing?' },
    { text: 'At home, a sibling says “I need a minute” and steps away. What could you do?', choices: ['Give them some time', 'Follow and keep asking', 'Decide they never want to talk'], correct: [0], feedback: 'You respected a request for time.', hint: 'Listen to the request they made.' },
  ],
  repair: [
    { text: 'Computer partner: “You said you want to quit the team.” You meant you need a break today. How can you fix the misunderstanding?', choices: ['I mean a break today, not quitting.', 'You never listen.', 'Say nothing and hope they guess.'], correct: [0], feedback: 'Partner: “Thanks for explaining. A break today makes sense.”', hint: 'Tell the partner exactly which part was misunderstood.' },
    { text: 'Computer partner: “Put it over there.” You cannot tell where they mean. What could you say?', choices: ['Which place do you mean?', 'I should already know.', 'Put it anywhere.'], correct: [0], feedback: 'Partner: “I mean on the shelf by the door. I should have been clearer.”', hint: 'Ask for the missing detail.' },
    { text: 'Computer partner: “Tell me something private about yourself.” You do not want to share. What could you say?', choices: ['I do not want to share that.', 'I have to share anything someone asks.', 'Make up a secret about someone else.'], correct: [0], feedback: 'Partner: “That is okay. You do not have to share. We can talk about something else.”', hint: 'You can set a boundary without giving an explanation.' },
  ],
  interpretations: [
    { text: 'A friend does not reply to your message. What could explain this?', choices: ['They may be busy; I could check later.', 'They may not have seen it; I can ask.', 'They definitely dislike me.'], correct: [0,1], feedback: 'Both being busy and not seeing it are possible. There is not enough evidence to know yet.', hint: 'More than one explanation can fit the same clue.' },
    { text: 'A classmate looks away while you talk. What can you know?', choices: ['They might be thinking or distracted.', 'I can ask whether now is a good time.', 'Looking away always means disrespect.'], correct: [0,1], feedback: 'Looking away alone does not tell you their intention. Asking is a useful option.', hint: 'A single cue does not prove a feeling or intention.' },
  ],
  tone: [
    { text: '“Nice job.” A friend smiles after you finish a hard task. What might they mean?', choices: ['They are praising the effort.', 'They are definitely angry.', 'There is no clue at all.'], correct: [0], feedback: 'The completed task and smile support sincere praise.', hint: 'Use the situation and expression together.' },
    { text: '“Nice job.” A sibling sighs and points to a spilled drink. What might they mean?', choices: ['They might be frustrated about the spill.', 'They are certainly praising the spill.', 'They never like you.'], correct: [0], feedback: 'The sigh and spill suggest frustration. You can ask if you are unsure.', hint: 'The words stayed the same. Which context clues changed?' },
  ],
} as const;
export function labResult(activity: LabActivity, scene: number, choice: number) {
  const scenes = LAB[activity];
  const s = scenes?.[scene];
  if (!s || !Number.isInteger(choice) || choice < 0 || choice >= s.choices.length) throw new Error('Invalid practice choice.');
  const correct = (s.correct as readonly number[]).includes(choice);
  return { result: correct ? 'correct' as const : 'incorrect' as const,
    feedback: correct ? s.feedback : `Try another explanation. ${s.hint}` };
}
