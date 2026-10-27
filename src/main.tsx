import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { CarryoverDemo } from './carryover/Demo'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {import.meta.env.DEV && new URLSearchParams(window.location.search).get('demo')==='carryover'
      ? <CarryoverDemo /> : <App />}
  </StrictMode>,
)
