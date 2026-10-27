import { useEffect, useState } from 'react';
import type { SessionMode, SessionRecord, ParentConfig, CoinsState } from '../types';
import { loadSessions, calculateStreak, sessionsTodayCount, loadConfig, loadCoins, journalWrittenToday } from '../storage';
import { LoadingScreen, LoadFailure } from '../components/LoadingScreen';
import { PlayLogo,PlayBuddy,GameArt } from '../design/PlayArt';

const PLAY_MODES: {mode:SessionMode;title:string;hint:string}[]=[
 {mode:'mixed',title:'Remix',hint:'A bit of everything'},
 {mode:'social',title:'Squad Quest',hint:'Pick your next move'},
 {mode:'nonverbal',title:'Vibe Check',hint:'Spot the clues'},
 {mode:'inference',title:'Plot Twist',hint:'Find the hidden meaning'},
];
interface Props {
  onCarryover?:()=>void;username:string;onStart:(mode:SessionMode)=>void;
  onConversation:()=>void;onLogout:()=>void;onOpenProfile:()=>void;
}
export interface PlayHomeProps {
 username:string;coins:number;todayCount:number;dailyGoal:number;streak:number;journalDone:boolean;
 onStart:(mode:SessionMode)=>void;onConversation:()=>void;onCarryover?:()=>void;onOpenProfile:()=>void;
}
export function PlayHome({username,coins,todayCount,dailyGoal,journalDone,onStart,onConversation,onCarryover,onOpenProfile}:PlayHomeProps){
 const goalMet=todayCount>=dailyGoal;
 return <main className="play-home">
  <header className="play-home-header"><PlayLogo/><div className="play-player-tools"><span className="play-coins" aria-label={`${coins} coins`}><span aria-hidden="true">✦</span>{coins}</span><button className="play-avatar" onClick={onOpenProfile} aria-label="Open profile">{username[0]?.toUpperCase()??'?'}</button></div></header>
  <section className="play-hero"><div><span className="play-tag">LET’S DO THIS</span><p className="play-hello">Hey, {username}!</p><h1>Big brain.<br/><span>Small quests.</span></h1><p>Pick a game. Find your next move.</p></div><PlayBuddy/><span className="hero-spark one" aria-hidden="true">✦</span><span className="hero-spark two" aria-hidden="true">+</span></section>
  <div className="play-daily"><span className="daily-star" aria-hidden="true">★</span><div><strong>{goalMet?'Quest complete!':'Today’s mini quest'}</strong><span>{goalMet?'Nice work. Breaks count too.':`${todayCount} / ${dailyGoal} rounds`}</span></div><div className="play-daily-track" role="progressbar" aria-label="Daily practice goal" aria-valuenow={Math.min(todayCount,dailyGoal)} aria-valuemin={0} aria-valuemax={dailyGoal}>{Array.from({length:dailyGoal},(_,i)=><span key={i} data-filled={i<todayCount}/>)}</div>{goalMet&&<span aria-hidden="true">✓</span>}</div>
  <section className="play-games" aria-labelledby="pick-game"><div className="play-section-title"><h2 id="pick-game">Pick your play</h2><span>4 ways to level up your skills</span></div><div className="play-game-grid">{PLAY_MODES.map((g,i)=><button className={`play-game-card game-${g.mode}`} key={g.mode} onClick={()=>onStart(g.mode)}><span className="game-number" aria-hidden="true">0{i+1}</span><GameArt kind={g.mode}/><span className="game-title">{g.title}</span><span className="game-hint">{g.hint}</span><span className="game-play" aria-hidden="true">PLAY <span>↗</span></span></button>)}</div></section>
  <section className="play-extra-grid" aria-label="More ways to play">{onCarryover&&<button className="play-extra-card play-extra-lab" onClick={onCarryover}><GameArt kind="mission"/><span><strong>Quick Play</strong><span>Mini games. Real-life moves.</span></span><span aria-hidden="true">↗</span></button>}<button className="play-extra-card play-extra-chat" onClick={onConversation}><GameArt kind="chat"/><span><strong>Chat with Alex</strong><span>Your computer practice buddy.</span></span><span aria-hidden="true">↗</span></button></section>
  {journalDone&&<p className="play-journal-done">✓ Journal done today.</p>}
  <footer className="play-home-footer">Your pace. Your space.</footer>
 </main>;
}
export function Home({username,onStart,onConversation,onOpenProfile,onCarryover}:Props){
 const [loading,setLoading]=useState(true);const [loadFailed,setLoadFailed]=useState(false);
 const [sessions,setSessions]=useState<SessionRecord[]>([]);const [config,setConfig]=useState<ParentConfig>({dailyMinimum:1});
 const [coins,setCoins]=useState<CoinsState>({balance:0,totalEarned:0,hintTokens:0});const [journalDone,setJournalDone]=useState(false);
 useEffect(()=>{let active=true;(async()=>{const [s,c,m,j]=await Promise.all([loadSessions(),loadConfig(),loadCoins(),journalWrittenToday()]);if(!active)return;setSessions(s);setConfig(c);setCoins(m);setJournalDone(j);setLoading(false);})().catch(()=>{if(active){setLoadFailed(true);setLoading(false);}});return()=>{active=false;};},[]);
 if(loadFailed)return <LoadFailure/>;if(loading)return <LoadingScreen/>;
 return <PlayHome username={username} coins={coins.balance} todayCount={sessionsTodayCount(sessions)} dailyGoal={config.dailyMinimum} streak={calculateStreak(sessions)} journalDone={journalDone} onStart={onStart} onConversation={onConversation} onOpenProfile={onOpenProfile} onCarryover={onCarryover}/>;
}
