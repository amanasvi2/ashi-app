import { useState } from 'react';
import { SETTINGS, SITUATIONS, SKILL_LABELS, type CarryoverSkill, type Workspace } from '../carryover/model';
import { skillTier, TIER_RULES, TIER_NAMES, validateAssessment, type Assessment, type Task } from './model';
const field='ashi-field';
const button='ashi-button';
export function TierPanel({data,owner,busy,onSave,heading=true,childView=false}:{data:Workspace;owner:boolean;busy:boolean;heading?:boolean;childView?:boolean;onSave:(assessment:Omit<Assessment,'id'|'created_at'>)=>Promise<boolean>}) {
  const [skill,setSkill]=useState<CarryoverSkill>('perspective_taking');
  const [task,setTask]=useState<Task>('recognition');
  const [situation,setSituation]=useState<keyof typeof SITUATIONS>('excluded');
  const [setting,setSetting]=useState<typeof SETTINGS[number]>('classroom');
  const [context,setContext]=useState<Assessment['context']>('familiar');
  const [result,setResult]=useState<Assessment['result']>('correct');
  const [help,setHelp]=useState<Assessment['help']>('independent');
  const [confirmed,setConfirmed]=useState(false);
  if(childView)return <section><div className="kid-skill-grid">{(Object.keys(SKILL_LABELS) as CarryoverSkill[]).map(s=>{const progress=skillTier(s,data.assessments??[],data.events,data.checks,data.skillAttempts??[]);return <article className="kid-skill-card" key={s}><strong>{progress.tier?`Step ${progress.tier} of 5`:'Getting started'}</strong><h2>{SKILL_LABELS[s]}</h2><p>{progress.tier?progress.name:"Try it with the help you need."}</p><div className="tier-progress" aria-label={`Tier ${progress.tier} of 5 supported by current evidence`}>{[1,2,3,4,5].map(n=><span key={n} data-met={n<=progress.tier}/>)}</div></article>;})}</div><details className="kid-skill-note"><summary>How do my steps work?</summary><p>Practice and grown-up check-ins help show your skills. Each skill has its own path. These are practice indicators, not a test or grade. Steps can change as examples get older. Help and breaks are always okay.</p></details></section>;
  return <section className="space-y-5">
    <header>{heading&&<h2 className="font-serif text-2xl">Skill tiers</h2>}<p className="text-sm mt-2">Each skill develops separately. Grade, reading level, difficulty, and adaptive support are separate from these tiers.</p>
      <p className="text-xs text-muted mt-2">Pilot progress indicators · not a validated assessment. Based on the last {TIER_RULES.days} days, latest 10 distinct examples per task. Tiers can change as evidence ages or performance changes.</p></header>
    {(Object.keys(SKILL_LABELS) as CarryoverSkill[]).map(s=>{const progress=skillTier(s,data.assessments??[],data.events,data.checks,data.skillAttempts??[]);return <article key={s} className="ashi-card tier-card space-y-3">
      <div className="tier-progress" aria-label={`Tier ${progress.tier} of 5 supported by current evidence`}>{[1,2,3,4,5].map(n=><span key={n} data-met={n<=progress.tier}/>)}</div><h3 className="font-semibold">{SKILL_LABELS[s]}: {progress.tier?`Tier ${progress.tier} · `:''}{progress.name}</h3>
      <p className="text-sm">{progress.tier===3?'Independent responses demonstrated; unfamiliar settings still developing.':progress.tier===4?'Independent responses demonstrated across unfamiliar settings; real-life transfer still developing.':progress.tier===5?'Independent responses and repeated real-life use observed.':'Build evidence at a comfortable pace; use the support that helps.'}</p>
      <p className="text-sm">{progress.observations} adult checks · {progress.appExamples} distinct app examples. App choices support recognition; explanation and independent response need adult checks.</p>
      <p className="text-sm">{progress.next?`Next: ${progress.next.label}. ${progress.next.detail}`:'Current evidence supports all five pilot tiers. Keep checking in across settings.'}</p>
      <details><summary className="cursor-pointer text-sm">See evidence and tier rules</summary><ol className="list-decimal pl-5 text-sm space-y-2 mt-3">{progress.gates.map((g,i)=><li key={g.label}><strong>{TIER_NAMES[i+1]}: {g.met?'evidence met':'more evidence needed'}</strong><p>{g.detail}</p></li>)}</ol><p className="text-xs text-muted mt-3">All earlier tiers must also be supported. A broad engine mastery score never advances a specific skill automatically. Repeated examples count once; partial answers do not count as successful checks.</p>
        <h4 className="font-semibold mt-3">Recent adult evidence for this skill</h4>
        {(data.assessments??[]).filter(a=>a.skill_id===s).toSorted((a,b)=>b.created_at.localeCompare(a.created_at)).slice(0,10).map(a=><p key={a.id} className="text-xs mt-2">{a.created_at.slice(0,10)} · {a.task} · {a.setting} · {a.context} · {a.result==='correct'?'successful':a.result==='partial'?'partly demonstrated':'not demonstrated yet'} · {a.help}</p>)}
        {!(data.assessments??[]).some(a=>a.skill_id===s)&&<p className="text-xs">No adult checks recorded yet.</p>}
      </details>
    </article>;})}
    {owner&&<form className="ashi-card tier-card space-y-3" onSubmit={async e=>{e.preventDefault();if(!confirmed)return;if(await onSave(validateAssessment({skill_id:skill,task,situation,setting,context,result,help})))setConfirmed(false);}}>
      <h3 className="font-serif text-xl">Record a skill check</h3><p className="text-sm">Observe a fresh example now. Accept any plausible answer supported by clues; do not require a single scripted interpretation. No names or free-text responses are saved.</p>
      <label className="block">Skill<select className={field} value={skill} onChange={e=>setSkill(e.target.value as CarryoverSkill)}>{Object.entries(SKILL_LABELS).map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></label>
      <label className="block">Ability checked<select className={field} value={task} onChange={e=>setTask(e.target.value as Task)}><option value="recognition">Recognize a plausible meaning</option><option value="explanation">Explain the clues behind a meaning</option><option value="response">Create a useful response</option></select></label>
      <label className="block">Example situation<select className={field} value={situation} onChange={e=>setSituation(e.target.value as typeof situation)}>{Object.entries(SITUATIONS).map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></label>
      <label className="block">Setting<select className={field} value={setting} onChange={e=>setSetting(e.target.value as typeof setting)}>{SETTINGS.map(x=><option key={x}>{x}</option>)}</select></label>
      <label className="block">Context<select className={field} value={context} onChange={e=>setContext(e.target.value as typeof context)}><option value="familiar">Familiar example</option><option value="new">Unfamiliar example for this child</option></select></label>
      <label className="block">Observed result<select className={field} value={result} onChange={e=>setResult(e.target.value as typeof result)}><option value="correct">Successful: plausible and supported / useful response</option><option value="partial">Partly demonstrated</option><option value="incorrect">Not demonstrated yet</option></select></label>
      <label className="block">Help needed<select className={field} value={help} onChange={e=>setHelp(e.target.value as typeof help)}><option value="independent">Independent</option><option value="general cue">General cue</option><option value="model">Adult modeled an answer</option></select></label>
      <label className="flex gap-2"><input type="checkbox" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)}/>I observed this ability on this example today.</label>
      <button className={button} disabled={busy||!confirmed}>Save skill check</button><p className="text-xs text-muted">The latest result for the same task, setting, and situation replaces that example in tier calculations. Recognize allows support; Explain and Respond require independent success.</p>
    </form>}
  </section>;
}
