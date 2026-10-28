import {lazy,Suspense} from 'react';
const App=lazy(()=>import('./App'));
const Walkthrough=lazy(()=>import('./public/Walkthrough').then(m=>({default:m.Walkthrough})));
// Internal preview fixtures remain development-only. The public tour is a
// separate fixed-content simulation and never mounts the authenticated app.
const preview=import.meta.env.DEV?new URLSearchParams(window.location.search).get('demo'):null;
const Preview=import.meta.env.DEV?lazy(()=>preview==='parent'?import('./design/ParentPreview').then(m=>({default:m.ParentPreview})):preview==='play'?import('./design/KidPreview').then(m=>({default:m.KidPreview})):import('./carryover/Demo').then(m=>({default:m.CarryoverDemo}))):null;
export function Entry(){
 const publicDemo=['/demo','/demo/'].includes(window.location.pathname);
 return <Suspense fallback={<p>Opening ASHI…</p>}>{publicDemo?<Walkthrough/>:Preview&&['parent','play','carryover'].includes(preview??'')?<Preview/>:<App/>}</Suspense>;
}
