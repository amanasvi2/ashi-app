// Development only. No auth calls, mail or saved passwords.
import {useMemo,useState} from 'react';
import {RecoveryPage} from './RecoveryPage';
export function RecoveryPreview(){
 const [mode,setMode]=useState<'request'|'valid'|'expired'>('request');
 const services=useMemo(()=>({request:async()=>{},session:async()=>mode==='valid'?'simulated-owner':null,verify:async()=> 'simulated-owner',watch:()=>()=>{},update:async()=>{},logout:async()=>{}}),[mode]);
 return <><aside className="play-preview-note">SIMULATED ACCOUNT RECOVERY · no email or account changes <button onClick={()=>setMode('request')}>Request example</button> <button onClick={()=>setMode('valid')}>Valid link example</button> <button onClick={()=>setMode('expired')}>Expired link example</button></aside><RecoveryPage key={mode} services={services} incoming={mode==='valid'} expired={mode==='expired'}/></>;
}
