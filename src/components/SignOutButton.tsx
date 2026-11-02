import {useEffect,useRef,useState} from 'react';
export function SignOutButton({onSignOut}:{onSignOut:()=>void|Promise<void>}){
 const [busy,setBusy]=useState(false);const [error,setError]=useState('');const alive=useRef(false);
 useEffect(()=>{alive.current=true;return()=>{alive.current=false;};},[]);
 return <div className="text-right shrink-0"><button type="button" disabled={busy} className="text-xs text-muted hover:text-ink mt-1 disabled:opacity-50 whitespace-nowrap" onClick={async()=>{if(busy)return;setBusy(true);setError('');try{await onSignOut();}catch{if(alive.current)setError('Could not sign out. Please try again.');}finally{if(alive.current)setBusy(false);}}}>{busy?'Signing out…':'Log out'}</button>{error&&<p role="alert" className="text-xs mt-2 max-w-48">{error}</p>}</div>;
}
