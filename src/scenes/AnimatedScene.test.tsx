import {afterEach,it,expect,vi} from 'vitest';
import {render,screen,fireEvent,cleanup,act} from '@testing-library/react';
import {AnimatedScene} from './AnimatedScene';
import {SCENES,sceneForItem,DEMO_SCENES} from './catalog';
import {ITEMS} from '../items';
import {Walkthrough} from '../public/Walkthrough';
afterEach(()=>{cleanup();vi.useRealTimers();vi.unstubAllGlobals();});
it('plays one short sequence, stops, and replays without an endless loop',()=>{
 vi.useFakeTimers();render(<AnimatedScene scene={SCENES.join}/>);
 expect(screen.getByText('A game is on the table.')).toBeTruthy();
 act(()=>vi.advanceTimersByTime(1900));expect(screen.getByText('A friend walks up.')).toBeTruthy();
 act(()=>vi.advanceTimersByTime(1900));expect(screen.getByText('“Is there room for one more?”')).toBeTruthy();
 act(()=>vi.advanceTimersByTime(1900));expect(screen.getByRole('button',{name:'Replay scene'})).toBeTruthy();
 act(()=>vi.advanceTimersByTime(20000));expect(screen.getByText('The friend asks. There is an empty chair.')).toBeTruthy();
 fireEvent.click(screen.getByRole('button',{name:'Replay scene'}));expect(screen.getByText('A game is on the table.')).toBeTruthy();
});
it('pauses progression and supports stepping through pictures',()=>{
 vi.useFakeTimers();render(<AnimatedScene scene={SCENES.share}/>);
 fireEvent.click(screen.getByRole('button',{name:'Pause scene'}));act(()=>vi.advanceTimersByTime(10000));
 expect(screen.getByText('Two friends make a poster.')).toBeTruthy();
 fireEvent.click(screen.getByRole('button',{name:'Next picture'}));expect(screen.getByText('Both reach for the scissors.')).toBeTruthy();
 fireEvent.click(screen.getByRole('button',{name:'Previous picture'}));expect(screen.getByText('Two friends make a poster.')).toBeTruthy();
});
it('hides the scene and stops its timer without hiding the story elsewhere',()=>{
 vi.useFakeTimers();render(<AnimatedScene scene={SCENES.quiet}/>);
 fireEvent.click(screen.getByRole('button',{name:'Hide scene'}));expect(screen.queryByRole('img')).toBeNull();
 act(()=>vi.advanceTimersByTime(10000));fireEvent.click(screen.getByRole('button',{name:'Show scene'}));
 expect(screen.getByText('Two friends are at a game.')).toBeTruthy();expect(screen.getByRole('button',{name:'Play scene'})).toBeTruthy();
});
it('uses still pictures when reduced motion is requested',()=>{
 vi.useFakeTimers();vi.stubGlobal('matchMedia',()=>({matches:true,addEventListener:vi.fn(),removeEventListener:vi.fn()}));
 render(<AnimatedScene scene={SCENES.join}/>);
 expect(screen.queryByRole('button',{name:'Pause scene'})).toBeNull();expect(screen.getByText('“Is there room for one more?”')).toBeTruthy();
 act(()=>vi.advanceTimersByTime(10000));expect(screen.getByLabelText('Scene part 3 of 3')).toBeTruthy();
 fireEvent.click(screen.getByRole('button',{name:'Previous picture'}));expect(screen.getByLabelText('Scene part 2 of 3')).toBeTruthy();
});
it('responds to a changed system motion preference and removes its listener',()=>{
 let change=()=>{};const remove=vi.fn();const media={matches:false,addEventListener:(_event:string,fn:()=>void)=>{change=fn;},removeEventListener:remove};
 vi.stubGlobal('matchMedia',()=>media);const {unmount}=render(<AnimatedScene scene={SCENES.quiet}/>);
 act(()=>{media.matches=true;change();});expect(screen.queryByRole('button',{name:'Pause scene'})).toBeNull();
 expect(screen.getByLabelText('Scene part 3 of 3')).toBeTruthy();unmount();expect(remove).toHaveBeenCalledWith('change',change);
});
it('cleans up playback timers on unmount',()=>{vi.useFakeTimers();const {unmount}=render(<AnimatedScene scene={SCENES.join}/>);expect(vi.getTimerCount()).toBe(1);unmount();expect(vi.getTimerCount()).toBe(0);});
it('binds authored animations to exact canonical stories only',()=>{
 const item=ITEMS.find(i=>i.id==='s1')!;expect(sceneForItem(item)?.kind).toBe('share');
 expect(sceneForItem({...item,scenario:'A different story with scissors.'})).toBeNull();
 expect(sceneForItem({...item,source:'carryover'})).toBeNull();expect(sceneForItem({...item,source:'generated'})).toBeNull();
 expect(sceneForItem({...item,id:'unknown'})).toBeNull();expect(sceneForItem(ITEMS.find(i=>i.id==='n1')!)?.kind).toBe('quiet');
});
it('keeps scene speech verbatim in the corresponding story without revealing the answer',()=>{
 for(const sample of DEMO_SCENES){if(sample.scene.speech)expect(sample.scenario).toContain(sample.scene.speech);expect([...sample.scene.beats,sample.scene.speech??''].join(' ')).not.toContain(sample.choices[0]);}
});
it('switches all three animated questions and clears old answers and clues',()=>{
 render(<Walkthrough/>);fireEvent.click(screen.getByRole('button',{name:/A They may want/}));fireEvent.click(screen.getByRole('button',{name:'Show me a clue'}));
 fireEvent.click(screen.getByRole('button',{name:'Share scissors',exact:true}));expect(screen.getByRole('heading',{name:'What is the problem?'})).toBeTruthy();expect(screen.queryByRole('status')).toBeNull();expect(screen.getByRole('button',{name:'Show me a clue'})).toBeTruthy();
 fireEvent.click(screen.getByRole('button',{name:/A Both friends/}));expect(screen.getByRole('status').textContent).toContain('sharing');
 fireEvent.click(screen.getByRole('button',{name:'A quiet minute',exact:true}));fireEvent.click(screen.getByRole('button',{name:/A Would you like/}));expect(screen.getByRole('status').textContent).toContain('what the friend needs');
 fireEvent.click(screen.getByRole('button',{name:/Reset demo/}));expect(screen.getByRole('heading',{name:'Room for one more?'})).toBeTruthy();expect(screen.queryByRole('status')).toBeNull();
});
it('offers a short child-facing preview without adult tour instructions',()=>{
 window.history.replaceState({},'','/demo?stories=1');render(<Walkthrough/>);
 expect(screen.getByRole('heading',{name:'Watch. Think. Choose.'})).toBeTruthy();expect(screen.queryByText('STOP 1 OF 5')).toBeNull();expect(screen.getByRole('link',{name:'Full demo'}).getAttribute('href')).toBe('/demo');
 window.history.replaceState({},'','/');
});
