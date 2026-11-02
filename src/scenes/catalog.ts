import { ITEMS } from '../items';
import type { Item } from '../types';
import {authoredScene,type StoryVisual} from './liveCatalog';

// Authored scenes are tied to exact stories. Never guess an animation from
// keywords: an invented gesture can change the answer to an inference item.
export type SceneKind = 'join' | 'share' | 'quiet' | 'story';
export interface SceneSpec { kind: SceneKind; label: string; beats: readonly [string, string, string]; speech?: string; visual?: StoryVisual }
export const SCENES: Record<Exclude<SceneKind,'story'>, SceneSpec> = {
  join: {kind:'join',label:'A friend approaches a game',beats:['A game is on the table.','A friend walks up.','The friend asks. There is an empty chair.'],speech:'Is there room for one more?'},
  share: {kind:'share',label:'Two friends reach for one pair of scissors',beats:['Two friends make a poster.','Both reach for the scissors.','There is only one pair.']},
  quiet: {kind:'quiet',label:'A friend puts down a game and asks for quiet',beats:['Two friends are at a game.','One friend puts the game down.','The friend speaks softly.'],speech:'I need a quiet minute.'},
};
export const DEMO_SCENARIO='A friend walks up to a game. The friend asks, “Is there room for one more?” There is an empty chair.';
export const DEMO_SCENES = [
  {scene:SCENES.join,title:'Room for one more?',scenario:DEMO_SCENARIO,question:'What might the friend mean?',choices:['They may want to join the game.','They are asking when the game will end.','They are asking who owns the game.'],feedback:'That fits the clue: “one more” can mean another player. You could ask if they want to join.',retry:'Try connecting “one more” with the empty chair. Joining the game is one possible meaning.',clue:'The friend asks, “Is there room for one more?”'},
  {scene:SCENES.share,title:'One pair of scissors',scenario:ITEMS.find(i=>i.id==='s1')!.scenario,question:'What is the problem?',choices:['Both friends need the same scissors.','The scissors have gone missing.','The poster is already finished.'],feedback:'Both reach for one pair. They need a plan for sharing.',retry:'Look at the scissors. Both friends need the same pair.',clue:'Both need the scissors at the same time.'},
  {scene:SCENES.quiet,title:'A quiet minute',scenario:ITEMS.find(i=>i.id==='n1')!.scenario,question:'What could you ask?',choices:['Would you like to stop or play later?','Why do you want to play faster?','Which game did you win?'],feedback:'That asks what the friend needs. Their words tell us they want quiet.',retry:'The friend asks for quiet. You can ask whether to stop or play later.',clue:'The friend says, “I need a quiet minute.”'},
] as const;

export function sceneForItem(item: Item): SceneSpec | null {
  if (item.source === 'carryover' || item.source === 'generated') return null;
  const canonical=ITEMS.find(i=>i.id===item.id);
  if (!canonical || canonical.scenario!==item.scenario) return null;
  if (item.id==='s1') return SCENES.share;
  if (item.id==='n1') return SCENES.quiet;
  return authoredScene(item.id);
}

export const STORY_LIBRARY = [
  ...DEMO_SCENES,
  ...ITEMS.filter(i=>!['s1','n1'].includes(i.id)).map(item=>{
    const q=item.questions[0];
    const titles:Record<string,string>={s2:'A group message',s3:'Waiting for an answer',s4:'A turn with the ball',s5:'During a test',n2:'A tapping pencil',n3:'A saved place',n4:'Sharing a story',n5:'A shorter plan',i1:'The music group',i2:'At the library',i3:'A shaded drawing',i4:'A quieter lunch',i5:'Another day'};
    return {scene:sceneForItem(item)!,title:titles[item.id],scenario:item.scenario,question:q.text,choices:q.choices!,feedback:`That fits the story: ${q.evidence}`,retry:`Look at this clue: ${q.evidence}`,clue:q.evidence!};
  }),
];
