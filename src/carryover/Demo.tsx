import { seedTierDemo } from '../tiers/fixtures';
import { useState } from 'react';
import { CarryoverWorkspace } from './Workspace';
import { seedWorkspace, demoTransport } from './client';
const demoStores=[demoTransport(seedTierDemo(seedWorkspace('demo-one'))),demoTransport(seedWorkspace('demo-two'))];
export function CarryoverDemo(){
  const [owner,setOwner]=useState(true);const [child,setChild]=useState(0);
  return <><aside className="demo-banner bg-accent text-white p-3 flex flex-wrap items-center gap-4 text-sm">
    <strong>FAKE-DATA DEMO · no API calls or database writes</strong>
    <button className="underline" onClick={()=>setOwner(!owner)}>View as {owner?'student':'owner'}</button>
    <button className="underline" onClick={()=>setChild(child===0?1:0)}>Switch demo child</button>
  </aside><CarryoverWorkspace key={`${owner}-${child}`} studentId={`demo-${child}`} studentName={child===0?'Demo learner one':'Demo learner two'} owner={owner}
    transport={demoStores[child]} onBack={()=>{window.location.href='/';}}/></>;
}
