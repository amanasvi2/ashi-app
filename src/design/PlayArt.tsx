import type { SessionMode } from '../types';
export function PlayBuddy({win=false}:{win?:boolean}){
 return <svg viewBox="0 0 220 210" fill="none" aria-hidden="true" className="play-buddy">
  <ellipse cx="112" cy="192" rx="65" ry="10" fill="currentColor" opacity=".12"/>
  <path d="m42 105-20-15m155 19 24-29" stroke="var(--play-ink)" strokeWidth="13" strokeLinecap="round"/>
  <path d="m78 166-7 19m73-19 8 19" stroke="var(--play-ink)" strokeWidth="14" strokeLinecap="round"/>
  <path d="M107 47V26" stroke="var(--play-ink)" strokeWidth="5"/><path d="m108 9 6 10 12 2-8 8 1 12-11-5-10 5 1-12-9-8 13-2 5-10Z" fill="var(--play-yellow)" stroke="var(--play-ink)" strokeWidth="3" strokeLinejoin="round"/>
  <rect x="43" y="46" width="134" height="128" rx="42" fill="var(--play-mint)" stroke="var(--play-ink)" strokeWidth="5"/>
  <rect x="60" y="72" width="100" height="72" rx="26" fill="var(--play-ink)"/>
  {win?<><path d="m78 100 9-9 9 9m28 0 9-9 9 9" stroke="white" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round"/></>:<><ellipse cx="87" cy="102" rx="7" ry="10" fill="white"/><ellipse cx="134" cy="102" rx="7" ry="10" fill="white"/></>}
  <path d="M101 122q10 10 20 0" stroke="var(--play-yellow)" strokeWidth="5" strokeLinecap="round"/>
  <path d="m181 30 5 10 11 2-8 8 2 11-10-6-10 6 2-11-8-8 11-2 5-10Z" fill="var(--play-coral)"/>
 </svg>;
}
export function PlayLogo(){return <span className="play-logo"><svg aria-hidden="true" viewBox="0 0 32 32"><path d="m16 1 4 10 11 5-11 4-4 11-5-11-10-4 10-5 5-10Z" fill="currentColor"/></svg><span>ashi<span className="play-logo-tag">PLAY</span></span></span>;}
export function GameArt({kind}:{kind:SessionMode|'chat'|'mission'|'journal'}){
 const common={stroke:'var(--play-ink)',strokeWidth:4,strokeLinecap:'round' as const,strokeLinejoin:'round' as const};
 return <svg viewBox="0 0 140 120" fill="none" aria-hidden="true" className="game-art">
  {kind==='mixed'&&<><rect x="34" y="17" width="77" height="77" rx="20" transform="rotate(12 34 17)" fill="white" {...common}/>{[[57,43],[86,48],[68,65],[51,78],[81,84]].map(([x,y])=><circle key={x} cx={x} cy={y} r="5" fill="var(--play-ink)"/>)}</>}
  {kind==='social'&&<><path d="M17 24h74a18 18 0 0 1 18 18v26a18 18 0 0 1-18 18H56L31 103V84a18 18 0 0 1-14-18V24Z" fill="white" {...common}/><path d="M43 53q5-10 10 0m22 0q5-10 10 0M53 68q11 10 21-1" {...common}/><path d="m110 12 5 10 11 2-8 8 2 11-10-6-10 6 2-11-8-8 11-2 5-10Z" fill="var(--play-purple)"/></>}
  {kind==='nonverbal'&&<><circle cx="69" cy="60" r="43" fill="var(--play-yellow)" {...common}/><path d="m26 41 44 5 43-5M27 46l4 21q14 9 30-1l8-19m0 0 8 19q16 10 30-1l6-19" fill="var(--play-ink)" {...common}/><path d="M53 83q17 13 34-1" {...common}/><path d="m12 21 10 7m101-11-3 12" {...common}/></>}
  {kind==='inference'&&<><path d="M29 89 51 65" stroke="var(--play-ink)" strokeWidth="18" strokeLinecap="round"/><circle cx="82" cy="46" r="32" fill="white" {...common}/><path d="m82 25 6 13 14 2-10 10 2 14-12-7-13 7 3-14-11-10 15-2 6-13Z" fill="var(--play-purple)"/><path d="m114 88 5 9m-3-24 11 1" {...common}/></>}
  {kind==='chat'&&<><rect x="25" y="23" width="88" height="66" rx="22" fill="white" {...common}/><path d="m45 88-6 17 27-17" fill="white" {...common}/>{[48,70,92].map(x=><circle key={x} cx={x} cy="56" r="5" fill="var(--play-ink)"/>)}</>}
  {kind==='mission'&&<><path d="M38 105V20m0 1h70L91 46l17 24H38" fill="var(--play-purple)" {...common}/><path d="m64 33 4 8 9 1-6 6 1 9-8-4-8 4 2-9-7-6 9-1 4-8Z" fill="var(--play-yellow)"/></>}
  {kind==='journal'&&<><rect x="32" y="16" width="72" height="91" rx="12" fill="white" {...common}/><path d="M47 17v89m12-67h29M59 54h29m-29 15h17" {...common}/><path d="m93 87 26-37 10 8-26 37-14 6 4-14Z" fill="var(--play-yellow)" {...common}/></>}
 </svg>;
}
