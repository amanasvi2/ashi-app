// Development only: real presentation components, isolated in-memory practice data.
import { useEffect,useRef,useState } from 'react';
import { PlayHome } from '../pages/Home';
import { CarryoverWorkspace } from '../carryover/Workspace';
import { demoTransport,seedWorkspace } from '../carryover/client';
import type { SessionMode } from '../types';
import type { LabActivity } from '../carryover/model';
const transport=demoTransport(seedWorkspace('kid-play-preview'));
const starts:Record<SessionMode,{activity:LabActivity;scene:number}>={mixed:{activity:'unfamiliar',scene:0},social:{activity:'repair',scene:0},nonverbal:{activity:'tone',scene:0},inference:{activity:'interpretations',scene:0}};
export function KidPreview(){
 const [game,setGame]=useState<{activity:LabActivity;scene:number}|null>(null);
 const [dialog,setDialog]=useState<'chat'|'profile'|null>(null);
 const modal=useRef<HTMLDialogElement>(null);
 useEffect(()=>{if(dialog)modal.current?.showModal();},[dialog]);
 return <div className="kid-zone"><div className="play-preview-note">DESIGN PREVIEW · sample learner · no API calls or database writes</div>{game?<CarryoverWorkspace studentId="kid-play-preview" studentName="Player" owner={false} transport={transport} initialLab={game} onBack={()=>setGame(null)}/>:<PlayHome username="Player" coins={24} todayCount={1} dailyGoal={3} streak={0} journalDone={false} onStart={mode=>setGame(starts[mode])} onCarryover={()=>setGame(starts.mixed)} onConversation={()=>setDialog('chat')} onOpenProfile={()=>setDialog('profile')}/>}{dialog&&<dialog ref={modal} onCancel={()=>setDialog(null)} className="play-preview-dialog" aria-labelledby="preview-dialog-title"><div><h2 id="preview-dialog-title">{dialog==='chat'?'Meet Alex':'Your player card'}</h2><p>{dialog==='chat'?'Alex is a computer practice buddy. Live conversations need a signed-in account. This design preview does not send messages.':'This is a sample player with 24 sample coins. Your real profile and progress stay in your own account.'}</p><button autoFocus className="ashi-button" onClick={()=>setDialog(null)}>Back to play</button></div></dialog>}</div>;
}
