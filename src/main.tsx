import { lazy,StrictMode,Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Keep both the preview routes and their in-memory fixtures out of production.
const demo = import.meta.env.DEV ? new URLSearchParams(window.location.search).get('demo') : null;
const Demo = import.meta.env.DEV ? lazy(() => demo==='play'
  ? import('./design/KidPreview').then(m=>({default:m.KidPreview}))
  : import('./carryover/Demo').then(m=>({default:m.CarryoverDemo}))) : null;
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {Demo&&(demo==='carryover'||demo==='play')
      ? <Suspense fallback={<p>Loading preview…</p>}><Demo/></Suspense> : <App/>}
  </StrictMode>,
)
