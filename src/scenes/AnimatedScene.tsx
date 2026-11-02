import {useEffect, useState} from 'react';
import type {SceneSpec} from './catalog';
import './scenes.css';

function Person({x,shirt,reach=false}:{x:number;shirt:string;reach?:boolean}) {
  return <g transform={`translate(${x} 92)`} className="scene-person">
    <circle cy="-22" r="16" fill="#f5e5c9" stroke="#294d42" strokeWidth="3"/>
    <path d="M-5-24h.1M5-24h.1" stroke="#294d42" strokeWidth="3" strokeLinecap="round"/>
    <path d="M-3-16h6" stroke="#294d42" strokeWidth="2" strokeLinecap="round"/>
    <path d="M0-3v49" stroke={shirt} strokeWidth="15" strokeLinecap="round"/>
    <path d="M0 44l-17 38m17-38 17 38" stroke="#294d42" strokeWidth="6" fill="none" strokeLinecap="round"/>
    <path className={reach?'scene-arm scene-arm-reach':'scene-arm'} d={reach?(x<210?'M0 10l-22 25m22-25 82 27':'M0 10l22 25m-22-25-82 27'):'M0 10l-22 25m22-25 22 25'} stroke="#294d42" strokeWidth="5" fill="none" strokeLinecap="round"/>
  </g>;
}
function SceneDrawing({kind,beat}:{kind:SceneSpec['kind'];beat:number}) {
  return <svg viewBox="0 0 420 230" aria-hidden="true" focusable="false">
    <path d="M24 192h372" stroke="#bed1b5" strokeWidth="3"/>
    <ellipse cx="210" cy="192" rx="150" ry="12" fill="#dce9d1"/>
    {kind==='join'&&<><path d="M274 160h42v-38h-42v64m42-26v26" fill="#f5e8ad" stroke="#6b8060" strokeWidth="4" strokeLinejoin="round"/><g className={`scene-arrival ${beat>0?'scene-arrived':''}`}><Person x={56} shirt="#d89871"/></g><Person x={194} shirt="#72ae91"/></>}
    {kind!=='join'&&<><g className={beat>0&&kind==='share'?'scene-reaching-left':''}><Person x={102} shirt="#72ae91" reach={kind==='share'&&beat>0}/></g><g className={beat>0&&kind==='share'?'scene-reaching-right':''}><Person x={318} shirt="#d89871" reach={kind==='share'&&beat>0}/></g></>}
    <path d="M151 145h118v13H151zm8 13v34m102-34v34" fill="#d4bd94" stroke="#6b8060" strokeWidth="4" strokeLinecap="round"/>
    {kind==='share'?<><path d="M175 132h65v10h-65" fill="#fffdf5" stroke="#92b794"/><g stroke="#294d42" strokeWidth="2.5" fill="none"><circle cx="201" cy="134" r="4"/><circle cx="213" cy="134" r="4"/><path d="m204 131 11-12m-6 12-10-12"/></g></>:<><path d="M169 135h82v7h-82" fill="#7aa777"/><circle cx="189" cy="134" r="4" fill="#edc55f"/><circle cx="230" cy="134" r="4" fill="#fffdf5"/>{kind==='quiet'&&<g className={`scene-game-piece ${beat>0?'scene-piece-down':''}`}><rect x="124" y="112" width="15" height="10" rx="3" fill="#edc55f" stroke="#7e7649"/></g>}</>}
  </svg>;
}
export function AnimatedScene({scene}:{scene:SceneSpec}) {
  const [reduced,setReduced]=useState(()=>typeof window.matchMedia==='function'&&window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [beat,setBeat]=useState(reduced?2:0);
  const [playing,setPlaying]=useState(!reduced);
  const [visible,setVisible]=useState(true);
  useEffect(()=>{
    if(typeof window.matchMedia!=='function')return;
    const media=window.matchMedia('(prefers-reduced-motion: reduce)');
    const change=()=>{setReduced(media.matches);if(media.matches){setPlaying(false);setBeat(2);}};
    media.addEventListener('change',change);return()=>media.removeEventListener('change',change);
  },[]);
  useEffect(()=>{
    if(!playing||!visible||reduced)return;
    const timer=setTimeout(()=>{if(beat===2)setPlaying(false);else setBeat(beat+1);},1900);
    return()=>clearTimeout(timer);
  },[playing,beat,visible,reduced]);
  return <section className="animated-scene" aria-label="Story scene">
    <div className="scene-toolbar"><span>Watch the story</span><button type="button" onClick={()=>{setVisible(!visible);setPlaying(false);}}>{visible?'Hide scene':'Show scene'}</button></div>
    {visible&&<><div className={`scene-stage scene-${scene.kind} ${reduced?'scene-still':''} ${playing?'':'scene-paused'}`} role="img" aria-label={scene.label}>
      <SceneDrawing kind={scene.kind} beat={beat}/>
      {scene.speech&&beat===2&&<p className="scene-speech">“{scene.speech}”</p>}
    </div><div className="scene-caption"><span>{scene.beats[beat]}</span><span className="scene-count" aria-label={`Scene part ${beat+1} of 3`}>{beat+1}/3</span></div>
    <div className="scene-controls">
      {!reduced&&<button type="button" onClick={()=>{if(beat===2&&!playing){setBeat(0);setPlaying(true);}else setPlaying(!playing);}}>{playing?'Pause scene':beat===2?'Replay scene':'Play scene'}</button>}
      <button type="button" disabled={beat===0} onClick={()=>{setPlaying(false);setBeat(beat-1);}}>Previous picture</button>
      <button type="button" disabled={beat===2} onClick={()=>{setPlaying(false);setBeat(beat+1);}}>Next picture</button>
    </div></>}
  </section>;
}
