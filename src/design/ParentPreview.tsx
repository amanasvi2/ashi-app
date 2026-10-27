// Local-only parent QA harness: the actual dashboard with explicit fake services.
import {useState} from 'react';
import {ParentDashboard,type ParentDashboardServices} from '../pages/ParentDashboard';
import {CarryoverWorkspace} from '../carryover/Workspace';
import {demoTransport,seedWorkspace} from '../carryover/client';
import type {CustomReward} from '../types';
const students=[{id:'parent-preview-one',displayName:'Sample child one',username:'sample-one'},{id:'parent-preview-two',displayName:'Sample child two',username:'sample-two'}];
const config=new Map(students.map(s=>[s.id,{dailyMinimum:1}]));
const rewards=new Map<string,CustomReward[]>(students.map(s=>[s.id,[]]));
const transports=students.map(s=>demoTransport(seedWorkspace(s.id)));
const services:ParentDashboardServices={
 loadSessions:async()=>[],loadLevelSlice:async()=>({levels:{social:3,nonverbal:3,inference:3},streaks:{social:{correct:0,incorrect:0},nonverbal:{correct:0,incorrect:0},inference:{correct:0,incorrect:0}},pending:{social:null,nonverbal:null,inference:null}}),loadDifficulty:async()=>({social:1,nonverbal:1,inference:1}),
 loadCoins:async()=>({balance:0,totalEarned:0,hintTokens:0}),loadConfig:async id=>structuredClone(config.get(id!)!),saveConfig:async(c,id)=>{config.set(id!,c);},
 loadCustomRewards:async id=>structuredClone(rewards.get(id!)!),addCustomReward:async(id,r)=>{const item={...r,id:crypto.randomUUID()};rewards.get(id)!.push(item);return item;},deleteCustomReward:async id=>{for(const [child,items] of rewards)rewards.set(child,items.filter(r=>r.id!==id));},
 parentJournalWrittenToday:async()=>false,parentJournalActivity:async(_id,pastDays=7)=>Array.from({length:pastDays},(_,i)=>({date:new Date(Date.now()-(pastDays-1-i)*86400000).toDateString(),hasEntry:false})),loadFloorAlarms:async()=>({social:false,nonverbal:false,inference:false}),
 loadStudentProfile:async id=>({display_name:students.find(s=>s.id===id)!.displayName,grade:id===students[0].id?1:8,reading_level:id===students[0].id?1:8,strengths:[],focus:['perspective_taking'],supports:[],interests:['drawing'],session_length_min:12}),
 loadConversationSessions:async()=>[{id:'sample-chat',topic:'games',startedAt:new Date().toISOString(),endedAt:new Date().toISOString(),turnCount:1,endedReason:'student_exit',escalation:false,transcript:[{role:'assistant',content:'This is a fictional practice message.',at:new Date().toISOString()},{role:'user',content:'This is a sample reply.',at:new Date().toISOString()}]}],loadConversationEscalation:async()=>false,
};
export function ParentPreview(){const [child,setChild]=useState(0);const [workspace,setWorkspace]=useState(false);const [notice,setNotice]=useState('');return <><aside className="play-preview-note">PARENT AUDIT PREVIEW · synthetic families · no API calls or database writes{notice&&<p role="status">{notice}</p>}</aside>{workspace?<CarryoverWorkspace owner studentId={students[child].id} studentName={students[child].displayName} transport={transports[child]} onBack={()=>setWorkspace(false)}/>:<ParentDashboard key={child} student={students[child]} students={students} services={services} onSwitchStudent={id=>setChild(students.findIndex(s=>s.id===id))} onCarryover={()=>setWorkspace(true)} onLogout={()=>setNotice('This is a local preview. No real account is signed in.')}/>}</>;}
