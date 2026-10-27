import type { ReactNode } from 'react';
import { Brand } from './Brand';
import { PlayLogo,PlayBuddy } from './PlayArt';
const labels:Record<string,string>={moments:'Real-life moments',review:'Review practice','check-in':'Weekly check-in',tiers:'Skill tiers',brief:'Evidence brief',practice:'Practice lab',mission:'My mission'};
const descriptions:Record<string,string>={moments:'Turn an everyday moment into a little room to grow.',review:'A thoughtful check before practice reaches your child.','check-in':'Notice what is showing up beyond the screen.',tiers:'Different skills. Different paths. Progress at their pace.',brief:'App practice and everyday observations, side by side.',practice:'Try a new situation. Ask for a cue whenever you need.',mission:'Your voice matters. Choose what you want to practice.'};
const paths:Record<string,string>={moments:'M4 5h16v12H9l-5 4V5Zm4 4h8m-8 4h5',review:'m6 12 4 4 8-9', 'check-in':'M5 5h14v15H5V5Zm3-3v6m8-6v6M5 10h14',tiers:'M5 19v-5h4v5m2 0V9h4v10m2 0V4h4v15',brief:'M6 3h9l4 4v14H6V3Zm4 9h5m-5 4h5',practice:'m9 5 11 7-11 7V5Z',mission:'M5 21V4m0 0h13l-3 5 3 5H5'};
function NavIcon({name}:{name:string}){return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d={paths[name]}/></svg>;}
export function WorkspaceFrame({children,owner,studentName,tab,onTab,onBack,pending,moments,due}:{children:ReactNode;owner:boolean;studentName:string;tab:string;onTab:(tab:string)=>void;onBack:()=>void;pending:number;moments:number;due:number}){
 const tabs=owner?['moments','review','check-in','tiers','brief']:['practice','mission','tiers'];
 if(!owner){const kidLabels:Record<string,string>={practice:'Quick Play',mission:'My Mission',tiers:'My Skills'};return <div className="kid-zone kid-workspace"><header className="kid-workspace-header"><PlayLogo/><button aria-label="Back" className="ashi-button" onClick={onBack}>← Home</button></header><main className="kid-workspace-main"><div className="kid-workspace-title"><div><span className="play-tag">YOUR PLAY SPACE</span><h1>{kidLabels[tab]}</h1></div><PlayBuddy/></div><nav className="kid-workspace-nav" aria-label="Carryover sections">{tabs.map(t=><button key={t} aria-current={tab===t?'page':undefined} onClick={()=>onTab(t)}><NavIcon name={t}/>{kidLabels[t]}</button>)}</nav>{children}<footer className="kid-workspace-bottom">Your pace. Ask for help. Take a break.</footer></main></div>;}
 return <div className="workspace-shell">
  <aside className="workspace-sidebar"><Brand/><div className="workspace-child"><span className="child-avatar" aria-hidden="true">{studentName.charAt(0).toUpperCase()}</span><div><strong>{studentName}</strong><span>{owner?'Grown-up workspace':'My practice space'}</span></div></div>
    <p className="sidebar-eyebrow">{owner?'EVERYDAY GROWTH':'ONE STEP AT A TIME'}</p>
    <nav aria-label="Carryover sections" className="workspace-nav">{tabs.map(t=><button key={t} aria-label={labels[t]} aria-current={tab===t?'page':undefined} onClick={()=>onTab(t)}><NavIcon name={t}/><span>{labels[t]}</span>{t==='review'&&pending>0&&<span className="nav-count">{pending}</span>}</button>)}</nav>
    <div className="sidebar-footer"><p>Small steps count.<br/>So does taking a break.</p><button aria-label="Back" className="ashi-button" onClick={onBack}>← <span>Back</span></button></div>
  </aside>
  <main className="workspace-main"><header className="workspace-topbar"><span>Carryover <span aria-hidden="true">/</span> <strong>{labels[tab]}</strong></span><span className="workspace-role">{owner?'Parent & clinician tools':'Practice at your pace'}</span></header>
    <div className="workspace-body"><header className="workspace-heading"><span className="eyebrow">{owner?'A BRIDGE TO EVERYDAY LIFE':'A SPACE TO BE YOURSELF'}</span><h1>{tab==='moments'?'Little moments. Meaningful progress.':labels[tab]}</h1><p>{descriptions[tab]}</p></header>
      {owner&&['moments','review','check-in'].includes(tab)&&<div className="workspace-stats"><div><span className="stat-icon"><NavIcon name="moments"/></span><div><strong>{moments}</strong><span>Moments captured</span></div></div><button onClick={()=>onTab('review')}><span className="stat-icon peach"><NavIcon name="review"/></span><div><strong>{pending}</strong><span>Ready for review</span></div><span aria-hidden="true">↗</span></button><button onClick={()=>onTab('check-in')}><span className="stat-icon gold"><NavIcon name="check-in"/></span><div><strong>{due}</strong><span>Skills to check in on</span></div><span aria-hidden="true">↗</span></button></div>}
      <div className="workspace-content">{children}</div>
      <footer className="workspace-bottom-note">{owner?'Your observations make practice more personal.':'You can ask for help, say no, or take a break.'} <span>One small step at a time.</span></footer>
    </div>
  </main>
 </div>;
}
