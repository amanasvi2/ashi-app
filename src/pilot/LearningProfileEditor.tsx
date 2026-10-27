import {useEffect,useRef,useState} from 'react';
import type {StudentProfileInput} from '../profileTypes';
import {PLAIN_LANGUAGE_SUPPORT,validateLearningPreferences,type LearningPreferences} from './preferences';
export function LearningProfileEditor({profile,onSave}:{profile:StudentProfileInput;onSave:(p:LearningPreferences)=>Promise<unknown>}){
 const [open,setOpen]=useState(false);const [grade,setGrade]=useState(profile.grade);const [reading,setReading]=useState(profile.reading_level);
 const [interests,setInterests]=useState(profile.interests.join(', '));const [plain,setPlain]=useState(profile.supports.includes(PLAIN_LANGUAGE_SUPPORT));
 const [busy,setBusy]=useState(false);const [error,setError]=useState('');const [notice,setNotice]=useState('');const alive=useRef(false);
 useEffect(()=>{alive.current=true;return()=>{alive.current=false;};},[]);
 function edit(){setGrade(profile.grade);setReading(profile.reading_level);setInterests(profile.interests.join(', '));setPlain(profile.supports.includes(PLAIN_LANGUAGE_SUPPORT));setError('');setNotice('');setOpen(true);}
 if(!open)return <div>{notice&&<p role="status" className="text-sm mb-3">{notice}</p>}<button className="ashi-button" onClick={edit}>Edit learning profile</button></div>;
 return <form aria-label="Learning profile" className="border border-rule rounded-xl p-4 space-y-4" onSubmit={async e=>{e.preventDefault();if(busy)return;setError('');let preferences;try{preferences=validateLearningPreferences({grade,reading_level:reading,interests:interests.split(',').map(x=>x.trim()).filter(Boolean),plainLanguage:plain});}catch(e){setError((e as Error).message);return;}setBusy(true);try{await onSave(preferences);if(alive.current){setOpen(false);setNotice('Learning profile saved. Updated wording appears when your child opens a new screen or practice session.');}}catch(e){if(alive.current)setError(e instanceof Error?e.message:'The learning profile was not saved.');}finally{if(alive.current)setBusy(false);}}}>
  <h3 className="font-semibold">Learning profile</h3><p className="text-sm text-muted">School grade shapes situations. Reading grade shapes the wording. These do not change earned skill tiers or adaptive support.</p>
  <label className="block text-sm">School grade<select className="ashi-field" value={grade} disabled={busy} onChange={e=>setGrade(Number(e.target.value))}>{Array.from({length:13},(_,n)=><option key={n} value={n}>{n===0?'Kindergarten':`Grade ${n}`}</option>)}</select></label>
  <label className="block text-sm">Reading grade<input className="ashi-field" type="number" min="0" max="13" step="0.5" required value={Number.isFinite(reading)?reading:''} disabled={busy} onChange={e=>setReading(e.target.value===''?NaN:Number(e.target.value))}/></label>
  <label className="block text-sm">Interests (comma-separated)<input className="ashi-field" maxLength={320} value={interests} disabled={busy} onChange={e=>setInterests(e.target.value)}/></label>
  <label className="flex gap-2 text-sm"><input type="checkbox" checked={plain} disabled={busy} onChange={e=>setPlain(e.target.checked)}/>Always use plain language</label><p className="text-xs text-muted">Uses clear labels such as “People Clues” at every grade. School contexts still follow the learner’s grade.</p>
  {error&&<p role="alert" className="text-sm">{error}</p>}<div className="flex gap-3"><button type="button" className="ashi-button" disabled={busy} onClick={()=>setOpen(false)}>Cancel</button><button className="ashi-button ashi-button-primary" disabled={busy}>{busy?'Saving…':'Save learning profile'}</button></div>
 </form>;
}
