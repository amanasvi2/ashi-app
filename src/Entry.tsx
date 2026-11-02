import {recoveryLocation} from './account/recoveryLocation';
import {lazy,Suspense,useState} from 'react';
const Recovery=lazy(()=>import('./account/RecoveryPage').then(m=>({default:m.RecoveryPage})));
const App=lazy(()=>import('./App'));
const Walkthrough=lazy(()=>import('./public/Walkthrough').then(m=>({default:m.Walkthrough})));
// Internal preview fixtures remain development-only. The public tour is a
// separate fixed-content simulation and never mounts the authenticated app.
const preview=import.meta.env.DEV?new URLSearchParams(window.location.search).get('demo'):null;
const Preview=import.meta.env.DEV?lazy(()=>preview==='recovery'?import('./account/RecoveryPreview').then(m=>({default:m.RecoveryPreview})):preview==='parent'?import('./design/ParentPreview').then(m=>({default:m.ParentPreview})):preview==='play'?import('./design/KidPreview').then(m=>({default:m.KidPreview})):import('./carryover/Demo').then(m=>({default:m.CarryoverDemo}))):null;
export function Entry(){
 const [recovery]=useState(()=>recoveryLocation(window.location));
 const publicDemo=['/demo','/demo/'].includes(window.location.pathname);
 return <Suspense fallback={<p>Opening ASHI…</p>}>{recovery.route||recovery.incoming||recovery.expired?<Recovery incoming={recovery.incoming} expired={recovery.expired}/>:publicDemo?<Walkthrough/>:Preview&&['parent','play','carryover','recovery'].includes(preview??'')?<Preview/>:<App/>}</Suspense>;
}
