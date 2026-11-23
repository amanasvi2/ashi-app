import {afterEach,expect,it,vi} from 'vitest';
import {cleanup,fireEvent,render,screen} from '@testing-library/react';
import {Walkthrough} from './Walkthrough';
import {STORY_LIBRARY} from '../scenes/catalog';

afterEach(()=>{cleanup();vi.restoreAllMocks();window.history.replaceState({},'','/');});

it.each([0,0.4,0.999])('grades all stories by answer identity with random draw %s',random=>{
  vi.spyOn(Math,'random').mockReturnValue(random);
  window.history.replaceState({},'','/demo?stories=1');
  render(<Walkthrough/>);
  for(const [index,story] of STORY_LIBRARY.entries()){
    fireEvent.change(screen.getByRole('combobox',{name:'Story library'}),{target:{value:String(index)}});
    for(const [id,text] of story.choices.entries()){
      const button=screen.getByRole('button',{name:new RegExp(text.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'))});
      fireEvent.click(button);
      expect(screen.getByRole('status').textContent).toBe(id===0?story.feedback:story.retry);
      expect(button.getAttribute('aria-pressed')).toBe('true');
    }
  }
});

it('keeps positions stable during retries, hints and tour navigation, then reshuffles on reset',()=>{
  const random=vi.spyOn(Math,'random').mockReturnValue(0);
  render(<Walkthrough/>);
  const correct=()=>screen.getByRole('button',{name:/They may want to join/});
  expect(correct().textContent).toMatch(/^C/);
  fireEvent.click(correct());
  fireEvent.click(screen.getByRole('button',{name:'Show me a clue'}));
  fireEvent.click(screen.getByRole('button',{name:/Capture a moment/}));
  fireEvent.click(screen.getByRole('button',{name:/Try practice/}));
  expect(correct().textContent).toMatch(/^C/);
  expect(correct().getAttribute('aria-pressed')).toBe('true');
  random.mockReturnValue(0.999);
  fireEvent.click(screen.getByRole('button',{name:/Reset demo/}));
  expect(correct().textContent).toMatch(/^A/);
  expect(screen.queryByRole('status')).toBeNull();
  fireEvent.click(screen.getByRole('button',{name:'Show me a clue'}));
  random.mockReturnValue(0);
  fireEvent.click(screen.getByRole('button',{name:'Share scissors'}));
  expect(screen.getByRole('button',{name:/Both friends need/}).textContent).toMatch(/^C/);
  expect(screen.queryByRole('status')).toBeNull();
  expect(screen.getByRole('button',{name:'Show me a clue'})).toBeTruthy();
});
