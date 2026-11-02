import {ITEMS} from '../items.js';
import type {SceneSpec} from './catalog.js';
import type {Difficulty,Item,ItemType} from '../types.js';

export type StoryVisual='message'|'waiting'|'ball'|'test'|'tap'|'welcome'|'present'|'plan'|'music'|'library'|'drawing'|'lunch'|'calendar';
const authored: Record<string,{visual:StoryVisual;label:string;beats:readonly[string,string,string];speech?:string}>={
 s2:{visual:'message',label:'A group message about a project',beats:['Dani sends a group message.','A classmate replies.','Dani has not said which one.'],speech:'Are you asking for a partner or sharing your plan?'},
 s3:{visual:'waiting',label:'A classmate waits beside an empty chair',beats:['A game is on the table.','A classmate asks to join.','No one answers. The classmate waits.']},
 s4:{visual:'ball',label:'A teammate keeps the ball after Lena asks for a turn',beats:['The team is playing a game.','Lena asks for a turn.','The teammate keeps the ball.'],speech:'Only I get to use it'},
 s5:{visual:'test',label:'A classmate is taking a test while Sam asks questions',beats:['A classmate is still taking a test.','Sam asks a question.','Sam asks two more questions.'],speech:'Please wait until I finish.'},
 n2:{visual:'tap',label:'Kai taps a pencil and explains a plan',beats:['The group is working.','Kai taps a pencil.','Kai explains the plan clearly.'],speech:'Tapping helps me think'},
 n3:{visual:'welcome',label:'A leader welcomes Zoe and points to an empty seat',beats:['Zoe arrives at an activity.','The leader smiles and welcomes Zoe.','The leader points to an empty seat.'],speech:'Welcome, Zoe. I saved you a place.'},
 n4:{visual:'present',label:'Marcus has shaking hands before sharing a story',beats:['Marcus is about to share a story.','His hands shake a little.','Marcus says what he is thinking.'],speech:'I hope I remember what to say.'},
 n5:{visual:'plan',label:'A friend pauses and suggests a shorter plan',beats:['A friend hears a plan and pauses.','The friend talks about the time.','The friend suggests a shorter plan.'],speech:'Part of that could work, but I am not sure we have enough time.'},
 i1:{visual:'music',label:'A music group is full and Jordan puts a practice sheet away',beats:['Jordan wants a place in a music group.','Every place is filled. Try again next month.','Jordan puts the practice sheet away.']},
 i2:{visual:'library',label:'It is nearly four and a friend still wants a library book',beats:['The library closes at four.','It is nearly four now.','A friend still wants to choose a book.']},
 i3:{visual:'drawing',label:'Nadia shows the darker shading in a drawing',beats:['Nadia brings a drawing to the group.','The leader notices the shading.','Nadia points to the darker parts.'],speech:'I can see you tried the shading we practiced.'},
 i4:{visual:'lunch',label:'A crowded lunch room and a quiet area nearby',beats:['The lunch room is crowded and noisy.','Tyler tells a friend what he wants.','There is space in a quiet area nearby.'],speech:'I want somewhere quieter where I can still eat with you.'},
 i5:{visual:'calendar',label:'A sibling changes a weekend plan and Chloe asks about another day',beats:['A sibling has to change a weekend plan.','Chloe was looking forward to it.','Later, Chloe asks about another day.'],speech:'I am okay for now, but can we pick another day?'},
};
export function authoredScene(id:string):SceneSpec|null {
 const data=authored[id];return data?{kind:'story',...data}:null;
}
// Never repeat an item to fill a round, silently lower difficulty or include
// a paused skill. The bank is finite, so a round may be shorter than count.
export function selectAnimatedItems(requests:{type:ItemType;difficulty:Difficulty}[],floorAlarm:Partial<Record<ItemType,boolean>>={}):Item[]{
 const used=new Set<string>();const result:Item[]=[];
 for(const request of requests){
  if(floorAlarm[request.type])continue;
  const pool=ITEMS.filter(i=>i.type===request.type&&i.difficulty===request.difficulty&&!used.has(i.id));
  const item=pool[Math.floor(Math.random()*pool.length)];
  if(item){used.add(item.id);result.push(item);}
 }
 return result;
}
