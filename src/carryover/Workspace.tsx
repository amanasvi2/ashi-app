import { WorkspaceFrame } from '../design/WorkspaceFrame';
import { TierPanel } from '../tiers/Panel';
import { useEffect, useMemo, useState } from 'react';
import type { Item } from '../types';
import { LAB, MISSIONS, MISSION_PRACTICE, ROLES, SETTINGS, RESPONSES, SITUATIONS, SKILL_LABELS, SKILL_TYPES,
  safeCapture, momentSummary, validateCheck, weekKey, transferFlag, redactItemNames, COACHING, recheckDue,
  type Capture, type LabActivity, type ReviewedItem, type TransferCheck, type Workspace as Data } from './model';
import { liveTransport, type Transport } from './client';

const box='ashi-card space-y-4';
const button='ashi-button';
const field='ashi-field';
const EMPTY:Data={moments:[],items:[],checks:[],events:[],snapshots:[],mission:null};
export function CarryoverWorkspace({studentId,studentName,owner,onBack,transport=liveTransport}: {
  studentId:string;studentName:string;owner:boolean;onBack:()=>void;transport?:Transport;
}) {
  const [data,setData]=useState<Data>(EMPTY);
  const [error,setError]=useState('');const [notice,setNotice]=useState('');const [busy,setBusy]=useState(false);
  const [tab,setTab]=useState(owner?'moments':'practice');
  const [capture,setCapture]=useState<Capture>({situation:'unclear',setting:'classroom',role:'friend',response:'stayed quiet'});
  const [notes,setNotes]=useState('');
  const [confirmed,setConfirmed]=useState(false);
  useEffect(()=>{
    let live=true;setData(EMPTY);setError('');
    transport<Data>({action:'load',studentId}).then(d=>{if(live)setData(d);}).catch(e=>{if(live)setError(e.message);});
    return()=>{live=false;};
  },[studentId,transport]);
  async function act(body:Record<string,unknown>,message:string){
    setBusy(true);setError('');setNotice('');
    try{await transport({...body,studentId});setData(await transport<Data>({action:'load',studentId}));setNotice(message);return true;}
    catch(e){setError(e instanceof Error?e.message:'Could not save. Try again.');return false;}
    finally{setBusy(false);}
  }
  const skills=[...new Set(data.moments.map(m=>m.skill_id))];
  const recentSkills=[...new Set(data.moments.filter(m=>Date.now()-new Date(m.created_at).getTime()<7*86400000).map(m=>m.skill_id))];
  const due=recentSkills.filter(skill=>!data.checks.some(c=>c.skill_id===skill&&c.week===weekKey()));
  return <WorkspaceFrame owner={owner} studentName={studentName} tab={tab} onTab={setTab} onBack={onBack} pending={data.items.filter(i=>i.status==='pending').length} moments={data.moments.length} due={due.length}>
      {error&&<p role="alert" className="border border-alert p-3">{error}</p>}{notice&&<p role="status">{notice}</p>}
      {tab==='tiers'&&<TierPanel heading={false} data={data} owner={owner} busy={busy} onSave={assessment=>act({action:'assessment',assessment},'Skill check saved. Tiers updated from the available evidence.')}/>}
      {owner&&tab==='moments'&&<div className="capture-layout">
        <form className={box} onSubmit={async e=>{e.preventDefault();if(!confirmed)return;
          if(await act({action:'capture',capture:safeCapture(capture)},'Anonymous moment saved. Generate practice below.')){setNotes('');setConfirmed(false);}}}>
          <div className="card-heading"><span className="eyebrow">START WITH WHAT HAPPENED</span><h2 className="font-serif text-2xl">Add a moment</h2></div>
          <p className="text-xs text-muted">Moment notes and names are never saved or sent. Optional notes stay in this form only; only the role-based summary below is saved.</p>
          <label className="block">What happened?<select className={field} value={capture.situation} onChange={e=>{setCapture({...capture,situation:e.target.value as Capture['situation']});setConfirmed(false);}}>{Object.entries(SITUATIONS).map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></label>
          <label className="block">Optional notes — not saved<textarea className={field} value={notes} maxLength={500} onChange={e=>setNotes(e.target.value)} placeholder="For your own reference while choosing the summary"/></label>
          {(['setting','role','response'] as const).map(key=><label className="block" key={key}>{key==='setting'?'Where?':key==='role'?'Who? Role only':'How did the child respond?'}<select className={field} value={capture[key]} onChange={e=>{setCapture({...capture,[key]:e.target.value});setConfirmed(false);}}>{(key==='setting'?SETTINGS:key==='role'?ROLES:RESPONSES).map(s=><option key={s}>{s}</option>)}</select></label>)}
          <p className="text-sm border-l-2 border-accent pl-3">Saved summary: {momentSummary(capture)}</p>
          <label className="flex gap-2 text-sm"><input type="checkbox" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)}/>This summary is accurate enough to use for practice.</label>
          <button className={`${button} ashi-button-primary`} disabled={busy||!confirmed}>Save anonymous moment</button>
        </form>
        <section className={box}><h2 className="font-serif text-xl">Your moments</h2>{!data.moments.length&&<p>No moments yet.</p>}
          {data.moments.map(m=><article key={m.id} className="border-t border-rule pt-3 space-y-2"><p>{momentSummary(m)}</p><p className="text-xs text-muted">{SKILL_LABELS[m.skill_id]}</p>
            <button className={button} disabled={busy} onClick={()=>void act({action:'generate',momentId:m.id},'Three practice items are pending review. Open Review practice.')}>Generate practice</button>
            <p className="text-xs text-muted">Before the next opportunity: {COACHING[m.skill_id]} Record the help used.</p></article>)}
        </section>
      </div>}
      {owner&&tab==='review'&&<section className="space-y-4"><p>Only approved items can enter normal practice. The owner reviews for this child; there is no shared parent–clinician access yet.</p>
        {!data.items.length&&<p>No items to review.</p>}{data.items.map(row=><ReviewEditor key={row.id+row.status} row={row} busy={busy} onSave={(item,status)=>act({action:'review',itemId:row.id,item,status},`Review saved: ${status}.`)}/>)}</section>}
      {owner&&tab==='check-in'&&<section className={box}><h2 className="font-serif text-xl">This week's observations</h2><p className="text-sm text-muted">Adult observations are not a clinical assessment. No opportunity is not failure.</p>
        {recentSkills.length===0&&<p>No moments from the last seven days.</p>}{recentSkills.map(skill=><TransferForm key={studentId+skill+weekKey()} skill={skill} existing={data.checks.find(c=>c.skill_id===skill&&c.week===weekKey())} busy={busy} onSave={check=>act({action:'check',check},'Weekly observation saved.')}/>)}
      </section>}
      {owner&&tab==='brief'&&<section className={box}><h2 className="font-serif text-xl">Evidence brief</h2>
        <TierPanel data={data} owner={false} busy={busy} onSave={async()=>false}/>
        <p className="text-sm">Mission chosen by child: {data.mission??'Not chosen yet'}</p><p className="text-xs text-muted">Engine mastery is measured for broad item types. It does not establish mastery of each specific skill or real-life transfer.</p>
        <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr><th>Skill</th><th>App engine history</th><th>Adult observation history</th></tr></thead><tbody>{skills.map(skill=>{
          const snaps=data.snapshots.filter(s=>s.item_type===SKILL_TYPES[skill]).sort((a,b)=>a.created_at.localeCompare(b.created_at));
          const checks=data.checks.filter(c=>c.skill_id===skill).sort((a,b)=>a.week.localeCompare(b.week));
          return <tr key={skill} className="border-t border-rule align-top"><td className="py-3 pr-3">{SKILL_LABELS[skill]}{transferFlag(snaps.at(-1),checks)&&<p className="text-alert">High app mastery; transfer needs review.</p>}</td>
            <td className="py-3 pr-3">{snaps.length?snaps.slice(-6).map((s,i)=><p key={i}>{s.created_at.slice(0,10)}: {s.mastered?'mastered':'developing'} · support {s.support_level}</p>):'No engine history yet'}</td>
            <td className="py-3">{checks.length?checks.slice(-6).map(c=><p key={c.week}>{c.week}: {c.opportunity==='yes'?`${c.rating} · ${c.help}`:c.opportunity==='no'?'No opportunity':'Unsure'}</p>):'No observations yet'}</td></tr>;
        })}</tbody></table></div>
        <h3 className="font-semibold">Unfamiliar situations and practice</h3><p className="text-xs text-muted">Recent stored results, up to 500 events. An independent answer used no cue in that exercise.</p>
        {(['unfamiliar','repair','interpretations','tone'] as const).map(a=>{const events=data.events.filter(e=>e.activity===a);return <p key={a} className="text-sm">{a}: {events.filter(e=>e.result==='correct'&&!e.help).length} independent correct / {events.length} attempts; {events.filter(e=>e.help).length} used a cue.</p>;})}
        <p className="text-sm">Review activity: {data.items.filter(i=>i.status==='approved').length} approved · {data.items.filter(i=>i.status==='pending').length} pending · {data.items.filter(i=>i.status==='rejected').length} rejected/withdrawn.</p>
        <p className="text-sm">Suggested next focus: compare the next real-life opportunity with the help used. This is a rule-based suggestion, not an AI clinical judgment.</p>
        <button className={button} onClick={()=>window.print()}>Print or save brief as PDF</button>
      </section>}
      {!owner&&tab==='mission'&&<section className={box}><h2 className="font-serif text-xl">What would you like to practice?</h2><p>Your choice can include saying no or asking for a break.</p>{MISSIONS.map(m=><button key={m} className={`${button} block ${data.mission===m?'bg-accent text-white':''}`} disabled={busy} onClick={()=>void act({action:'mission',mission:m},'Your mission is saved.')}>{m}</button>)}</section>}
      {!owner&&tab==='practice'&&<LabPanel key={studentId} mission={data.mission} events={data.events} transport={transport} studentId={studentId} refresh={()=>transport<Data>({action:'load',studentId}).then(setData)}/>}
  </WorkspaceFrame>;
}

function ReviewEditor({row,busy,onSave}:{row:ReviewedItem;busy:boolean;onSave:(item:Item,status:ReviewedItem['status'])=>Promise<boolean>}){
  const [item,setItem]=useState(row.item);const q=item.questions[0];
  const [names,setNames]=useState('');const [confirmed,setConfirmed]=useState(false);
  const clean=()=>redactItemNames(item,names.split(','));
  function updateQuestion(patch:Partial<typeof q>){setItem({...item,questions:[{...q,...patch}]});}
  return <article className={box}><h2 className="font-semibold">{SKILL_LABELS[row.skill_id]} · support {row.support_level} · {row.status}</h2>
    <label className="block">Situation<textarea className={field} value={item.scenario} onChange={e=>setItem({...item,scenario:e.target.value})}/></label>
    <label className="block">Question<input className={field} value={q.text} onChange={e=>updateQuestion({text:e.target.value})}/></label>
    <label className="block">Sentence starter<input className={field} value={q.stem??''} onChange={e=>updateQuestion({stem:e.target.value})}/></label>
    {q.choices?.map((c,i)=><label className="block" key={i}>{i===0?'Example correct answer':`Other choice ${i}`}<input className={field} value={c} onChange={e=>{const choices=[...q.choices!] as [string,string,string];choices[i]=e.target.value;updateQuestion({choices});}}/></label>)}
    <label className="block">Supporting sentence<input className={field} value={q.evidence??''} onChange={e=>updateQuestion({evidence:e.target.value})}/></label>
    {q.wordBank?.map((w,i)=><div key={i} className="flex gap-2"><label>Word-bank option {i+1}<input className={field} value={w.text} onChange={e=>updateQuestion({wordBank:q.wordBank!.map((v,j)=>j===i?{...v,text:e.target.value}:v)})}/></label><label className="flex gap-1 items-center"><input type="checkbox" checked={w.correct} onChange={e=>updateQuestion({wordBank:q.wordBank!.map((v,j)=>j===i?{...v,correct:e.target.checked}:v)})}/>Correct</label></div>)}
    <label className="block">Names to replace, separated by commas — local only<input className={field} value={names} onChange={e=>setNames(e.target.value)}/></label>
    <label className="flex gap-2"><input type="checkbox" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)}/>This item uses roles, not real names.</label>
    <p className="text-xs text-muted">Listed names are replaced before sending edits. Keep all people described by role. Approval means you checked the content and the evidence.</p>
    <div className="flex flex-wrap gap-2"><button className={button} disabled={busy} onClick={()=>void onSave(clean(),'pending')}>Save edits as pending</button><button className={button} disabled={busy||!confirmed} onClick={()=>void onSave(clean(),'approved')}>Approve</button><button className={button} disabled={busy} onClick={()=>void onSave(item,'rejected')}>{row.status==='approved'?'Withdraw approval':'Reject'}</button></div>
  </article>;
}
function TransferForm({skill,existing,busy,onSave}:{skill:TransferCheck['skill_id'];existing?:TransferCheck;busy:boolean;onSave:(c:TransferCheck)=>Promise<boolean>}){
  const [check,setCheck]=useState<TransferCheck>(existing??{skill_id:skill,week:weekKey(),opportunity:'unsure',rating:null,help:null});
  const [error,setError]=useState('');
  return <form className="border-t border-rule py-4 space-y-3" onSubmit={e=>{e.preventDefault();try{const c=validateCheck(check);setError('');void onSave(c);}catch(e){setError((e as Error).message);}}}>
    <h3 className="font-semibold">{SKILL_LABELS[skill]}</h3><label className="block">Did this come up again?<select className={field} value={check.opportunity} onChange={e=>setCheck({...check,opportunity:e.target.value as TransferCheck['opportunity']})}><option value="yes">Yes</option><option value="no">No opportunity</option><option value="unsure">Unsure</option></select></label>
    {check.opportunity==='yes'&&<><label className="block">How did it go?<select className={field} value={check.rating??''} onChange={e=>setCheck({...check,rating:e.target.value as TransferCheck['rating']})}><option value="">Choose</option>{['worse','same','better'].map(x=><option key={x}>{x}</option>)}</select></label><label className="block">How much help?<select className={field} value={check.help??''} onChange={e=>setCheck({...check,help:e.target.value as TransferCheck['help']})}><option value="">Choose</option>{['independent','general cue','model'].map(x=><option key={x}>{x}</option>)}</select></label></>}
    {error&&<p role="alert">{error}</p>}<button disabled={busy} className={button}>Save observation</button>
  </form>;
}
function LabPanel({events,transport,studentId,refresh,mission}:{mission:string|null;events:Data['events'];transport:Transport;studentId:string;refresh:()=>Promise<void>}){
  const start=MISSION_PRACTICE[mission??'']??{activity:'unfamiliar' as const,scene:0};
  const [activity,setActivity]=useState<LabActivity>(start.activity);const [scene,setScene]=useState(start.scene);
  const [hint,setHint]=useState(false);const [feedback,setFeedback]=useState('');const [busy,setBusy]=useState(false);const [answered,setAnswered]=useState(false);
  const [count,setCount]=useState(0);const [expired,setExpired]=useState(false);
  useEffect(()=>{const id=setTimeout(()=>setExpired(true),12*60*1000);return()=>clearTimeout(id);},[]);
  const choices=useMemo(()=>LAB[activity][scene].choices.map((text,index)=>({text,index})).sort(()=>Math.random()-.5),[activity,scene]);
  const s=LAB[activity][scene];const seen=events.some(e=>e.activity===activity&&e.scene===scene);
  const labels={unfamiliar:'New situations',repair:'Fix a misunderstanding',interpretations:'More than one meaning',tone:'Same words, different context'};
  function reset(a:LabActivity,n:number){window.speechSynthesis?.cancel();setActivity(a);setScene(n);setHint(false);setFeedback('');setAnswered(false);}
  useEffect(()=>()=>{window.speechSynthesis?.cancel();},[]);
  if(count>=5||expired)return <section className={box}><h2 className="font-serif text-xl">Practice complete</h2><p>You can take a break. Your saved results are in the evidence brief.</p></section>;
  return <section className={box}>{mission&&<p className="text-sm font-semibold">Your mission: {mission}</p>}{recheckDue(events)&&<p role="status">A one-week recheck is due. Try a new-situation exercise again with as little help as you need.</p>}<div className="flex flex-wrap gap-2">{(Object.keys(LAB) as LabActivity[]).map(a=><button key={a} className={button} onClick={()=>reset(a,0)}>{labels[a]}</button>)}</div>
    <p className="text-xs text-muted">{seen?'Practiced situation':'Unseen situation'} · {scene+1} of {LAB[activity].length}</p><h2 className="font-serif text-xl">{s.text}</h2>
    <button className={button} onClick={()=>{const utterance=new SpeechSynthesisUtterance(s.text);utterance.rate=.88;window.speechSynthesis.speak(utterance);}}>Read aloud</button>
    {activity==='tone'&&<p className="text-xs text-muted">This activity compares context clues. The computer voice does not demonstrate reliable emotional tone.</p>}
    <button className={button} disabled={answered} onClick={()=>setHint(true)}>Show a cue</button>{hint&&<p>{s.hint}</p>}
    <div className="space-y-2">{choices.map(({text:c,index:i})=><button className={`${button} block w-full text-left`} key={c} disabled={busy||answered} onClick={async()=>{setBusy(true);try{
      const result=await transport<{result:string;feedback:string}>({action:'lab',studentId,activity,scene,choice:i,help:hint});setFeedback(result.feedback);setAnswered(true);setCount(n=>n+1);await refresh().catch(()=>setFeedback(result.feedback+' Your answer was saved; reopen the lab to refresh the summary.'));
    }catch{setFeedback('Your result was not saved. Please try again.');}finally{setBusy(false);}}}>{c}</button>)}</div>
    {feedback&&<p role="status">{feedback}</p>}{answered&&<button className={button} onClick={()=>reset(activity,(scene+1)%LAB[activity].length)}>Next situation</button>}
    <p className="text-xs text-muted">These short exercises are separate from your adaptive practice score. Your parent or clinician can see results.</p>
  </section>;
}
