import type { Workspace } from '../carryover/model';
import type { Assessment, Task } from './model';
// Fake, deliberately differentiated evidence for the development-only demo.
export function seedTierDemo(data:Workspace):Workspace {
  const date=(days:number)=>new Date(Date.now()-days*86400000).toISOString();
  const example=(skill:Assessment['skill_id'],task:Task,i:number):Assessment=>({
    id:`fake-${skill}-${task}-${i}`,skill_id:skill,task,
    situation:i===0?'excluded':i===1?'help':'disagreement',
    setting:i===0?'classroom':i===1?'home':'lunch',context:'familiar',
    result:'correct',help:'independent',created_at:date(i===0?16:i===1?8:5),
  });
  data.assessments=[
    ...(['recognition','explanation','response'] as Task[]).flatMap(t=>[0,1,2].map(i=>example('perspective_taking',t,i))),
    ...[0,1,2].map(i=>example('nonverbal_cues','recognition',i)),
    ...(['recognition','explanation','response'] as Task[]).flatMap(t=>[0,1,2].map(i=>({...example('identify_problem_and_solutions',t,i),context:i>0?'new' as const:'familiar' as const}))),
  ];
  return data;
}
