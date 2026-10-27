import type { Capture, Moment, ReviewedItem, Workspace, CarryoverSkill } from './model';
import { defaultSkill, SKILL_TYPES, weekKey } from './model';
import type { Item } from '../types';
export function demoItem(skill: CarryoverSkill, index=0): Item {
  if(SKILL_TYPES[skill]==='nonverbal')return {id:`example-${index}`,type:'nonverbal',difficulty:1,
    scenario:'At home, a sibling says the game is fine. The sibling sighs and pushes the controller away. The child is not sure what the sibling means.',
    questions:[{text:'What might the sibling mean?',stem:'The sibling might be',choices:['Frustrated with the game','Definitely asleep','Excited to keep playing'],evidence:'The sibling sighs and pushes the controller away.'}]};
  if(SKILL_TYPES[skill]==='inference')return {id:`example-${index}`,type:'inference',difficulty:1,
    scenario:'A friend puts a notebook in a bag and checks the classroom clock. The friend stands near the door with the bag on. The next lesson starts soon.',
    questions:[{text:'What might the friend be about to do?',stem:'The friend might',choices:['Leave for the next lesson','Go to sleep','Start cooking'],evidence:'The next lesson starts soon.'}]};
  const scenario = 'A classmate looks at the activity materials. The classmate says they have not had a turn. The child is not sure what to do.';
  return {id:`example-${index}`,type:SKILL_TYPES[skill],difficulty:1,scenario,questions:[{
    text:'What could the child do?',stem:'The child could',choices:['Ask if the classmate wants a turn','Hide the materials','Assume the classmate is angry'],
    evidence:'The classmate says they have not had a turn.',
  }]};
}
export function seedWorkspace(studentId: string): Workspace {
  const captures: Capture[] = [
    {situation:'excluded',setting:'lunch',role:'classmate',response:'stayed quiet'},
    {situation:'tone',setting:'home',role:'sibling',response:'asked what it meant'},
    {situation:'help',setting:'classroom',role:'teacher',response:'asked for help'},
  ];
  const now=new Date().toISOString();
  const moments: Moment[]=captures.map((c,i)=>({...c,id:`demo-moment-${i}`,student_id:studentId,skill_id:defaultSkill(c),created_at:now}));
  const items: ReviewedItem[]=moments.map((m,i)=>({id:`demo-item-${i}`,student_id:studentId,moment_id:m.id,skill_id:m.skill_id,
    support_level:3,difficulty:1,item:demoItem(m.skill_id,i),status:'pending'}));
  return {moments,items,checks:[
    {skill_id:'perspective_taking',week:weekKey(new Date(Date.now()-14*86400000)),opportunity:'yes',rating:'same',help:'model'},
    {skill_id:'perspective_taking',week:weekKey(new Date(Date.now()-7*86400000)),opportunity:'yes',rating:'worse',help:'model'},
  ],events:[],snapshots:[
    {item_type:'social',mastered:true,support_level:0,difficulty:3,created_at:new Date(Date.now()-14*86400000).toISOString()},
    {item_type:'social',mastered:true,support_level:0,difficulty:3,created_at:new Date(Date.now()-7*86400000).toISOString()},
  ],mission:null};
}
