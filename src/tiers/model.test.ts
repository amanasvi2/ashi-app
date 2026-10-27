import { describe,it,expect } from 'vitest';
import { skillTier,validateAssessment,type Assessment,type Task,type SkillAttempt } from './model';
import type { TransferCheck } from '../carryover/model';
const now=Date.parse('2026-10-26T12:00:00Z');
function a(task:Task,index=0,patch:Partial<Assessment>={}):Assessment{return {id:`${task}-${index}`,skill_id:'perspective_taking',task,situation: index===0?'excluded':index===1?'help':'disagreement',setting:index===0?'classroom':index===1?'home':'lunch',context:'familiar',result:'correct',help:'independent',created_at:`2026-10-${index===0?'10':index===1?'18':'20'}T12:00:00Z`,...patch};}
const stage=(task:Task)=>[0,1,2].map(i=>a(task,i));
const base=()=>[...stage('recognition'),...stage('explanation'),...stage('response')];
const generalized=()=>base().map(x=>x.task==='response'&&x.setting!=='classroom'?{...x,context:'new' as const}:x);
const run=(rows:Assessment[]=[],checks:TransferCheck[]=[],attempts:SkillAttempt[]=[])=>skillTier('perspective_taking',rows,[],checks,attempts,now);
const checks:TransferCheck[]=['2026-10-12','2026-10-19'].map(week=>({skill_id:'perspective_taking',week,opportunity:'yes',rating:'better',help:'independent'}));
describe('Evidence based skill tiers',()=>{
 it('starts with building evidence rather than assigning a deficit level',()=>expect(run().tier).toBe(0));
 it('recognizes three distinct supported examples across two days',()=>expect(run(stage('recognition').map(x=>({...x,help:'model'}))).tier).toBe(1));
 it('does not mistake recognition for explanation',()=>expect(run(stage('recognition')).gates[1].met).toBe(false));
 it('requires independent explanations',()=>expect(run([...stage('recognition'),...stage('explanation').map(x=>({...x,help:'general cue' as const}))]).tier).toBe(1));
 it('advances through explain and respond independently',()=>{expect(run([...stage('recognition'),...stage('explanation')]).tier).toBe(2);expect(run(base()).tier).toBe(3);});
 it('requires all preceding tiers even when higher evidence is present',()=>expect(run(stage('response'),checks).tier).toBe(0));
 it('requires unfamiliar settings and a delayed check for generalization',()=>{expect(run(base()).tier).toBe(3);expect(run(generalized()).tier).toBe(4);});
 it('does not substitute two new settings on the same day for retention',()=>expect(run(generalized().map(x=>({...x,created_at:'2026-10-20T12:00:00Z'}))).gates[3].met).toBe(false));
 it('needs two observed independent weeks for carryover',()=>{expect(run(generalized(),checks.slice(0,1)).tier).toBe(4);expect(run(generalized(),checks).tier).toBe(5);});
 it('ignores no opportunity and unsure without reducing a demonstrated tier',()=>expect(run(generalized(),[...checks,{skill_id:'perspective_taking',week:'2026-10-26',opportunity:'no',rating:null,help:null}]).tier).toBe(5));
 it('uses the latest actual opportunities, including a new need for help',()=>expect(run(generalized(),[...checks,{...checks[0],week:'2026-10-26',help:'model'}]).tier).toBe(4));
 it('cannot manufacture evidence by repeating one example',()=>expect(run(Array.from({length:20},(_,i)=>a('recognition',0,{id:String(i)}))).tier).toBe(0));
 it('uses a newer failed observation instead of an old success on the same example',()=>expect(run([...stage('recognition'),a('recognition',0,{created_at:'2026-10-25T12:00:00Z',result:'incorrect'})]).tier).toBe(0));
 it('does not count partial answers as successful',()=>expect(run(stage('recognition').map(x=>({...x,result:'partial'}))).tier).toBe(0));
 it('separates different skills',()=>expect(run(stage('recognition').map(x=>({...x,skill_id:'nonverbal_cues'}))).tier).toBe(0));
 it('excludes stale, future, and invalid timestamps',()=>{for(const created_at of ['2025-01-01','2027-01-01','bad date'])expect(run(stage('recognition').map(x=>({...x,created_at}))).tier).toBe(0);});
 it('does not count duplicate weekly observations as two weeks',()=>expect(run(generalized(),[checks[0],checks[0]]).tier).toBe(4));
 it('maps only skill labelled app examples to recognition even at open support',()=>{
  const attempts=stage('recognition').map((x,i)=>({id:x.id,skill_id:x.skill_id,carryover_item_id:String(i),result:x.result,support_level:0,created_at:x.created_at}));
  expect(run([],[],attempts).tier).toBe(1);expect(run([],[],attempts).gates[1].met).toBe(false);
 });
 it('does not use duplicated app items as distinct examples',()=>{
  const attempts=stage('recognition').map(x=>({id:x.id,skill_id:x.skill_id,carryover_item_id:'same',result:x.result,support_level:3,created_at:x.created_at}));expect(run([],[],attempts).tier).toBe(0);
 });
 it('recognition respects the 80% success threshold over latest ten examples',()=>{
  const rows=Array.from({length:10},(_,i)=>a('recognition',i,{setting: ['home','classroom','lunch','team activity','group chat'][i%5] as Assessment['setting'],situation:i<5?'help':'tone',result:i<8?'correct':'incorrect'}));
  expect(run(rows).tier).toBe(1);rows[7].result='partial';expect(run(rows).tier).toBe(0);
 });
 it('accepts valid structured evidence and strips client timestamps, names and IDs',()=>{
  const parsed=validateAssessment({...a('explanation'),notes:'Alice',student_id:'other'});expect(parsed).not.toHaveProperty('created_at');expect(parsed).not.toHaveProperty('notes');expect(parsed).not.toHaveProperty('student_id');
 });
 it.each([{skill_id:'bad'},{help:'none'},{setting:'Alice school'},{task:'mastered'},{context:'unknown'},{result:'passed'}])('rejects unlisted observation values %j',patch=>expect(()=>validateAssessment({...a('response'),...patch})).toThrow());
});

it('uses a seven-day interval exactly, not just a later date',()=>{
 const rows=generalized().map(x=>x.task==='response'&&x.setting!=='classroom'?{...x,created_at:'2026-10-17T12:00:00Z'}:x);
 expect(run(rows).tier).toBe(4);
 expect(run(rows.map(x=>x.task==='response'&&x.setting!=='classroom'?{...x,created_at:'2026-10-17T11:59:59Z'}:x)).tier).toBe(3);
});
it('counts lab choices as recognition for their own skill only',()=>{
 const events=[{activity:'unfamiliar' as const,scene:0,result:'correct' as const,help:false,created_at:'2026-10-10T12:00:00Z'},
 {activity:'interpretations' as const,scene:0,result:'correct' as const,help:false,created_at:'2026-10-18T12:00:00Z'},
 {activity:'interpretations' as const,scene:1,result:'correct' as const,help:true,created_at:'2026-10-20T12:00:00Z'}];
 expect(skillTier('perspective_taking',[],events,[],[],now).tier).toBe(1);
 expect(skillTier('nonliteral_language',[],events,[],[],now).tier).toBe(0);
});
it('expires carryover observations older than the evidence window',()=>expect(run(generalized(),checks.map(c=>({...c,week:'2025-01-06'}))).tier).toBe(4));
it('a younger skill evidence set cannot borrow another skill transfer ratings',()=>expect(run(generalized(),checks.map(c=>({...c,skill_id:'nonverbal_cues'}))).tier).toBe(4));
