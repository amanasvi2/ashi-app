import { afterEach,describe,expect,it,vi } from 'vitest';
import { render,screen,cleanup } from '@testing-library/react';
vi.mock('../supabase',()=>({supabase:{}}));
import { QuestionPanel } from './Practice';
afterEach(cleanup);
const props={scenario:'A friend needs more time.',questionText:'What could the child do?',stem:'The child could',
 choices:['Ask the friend','Leave','Shout'] as [string,string,string],level:0 as const,hintTokens:0,hintActive:false,
 onUseHint:()=>{},speak:()=>{},stop:()=>{},speakingText:null,activeCharIndex:null,readingReady:true,readProgress:1,
 evaluating:false,onSubmit:()=>{},feedback:null,onNext:()=>{}};
describe('Support level rendering for generated and carryover questions',()=>{
 it('does not expose the generated sentence stem at support level zero',()=>{
  render(<QuestionPanel {...props}/>);expect(screen.queryByText(/The child could/)).toBeNull();
  expect(screen.getByText('What could the child do?')).toBeTruthy();expect(screen.getByPlaceholderText('Type your answer here')).toBeTruthy();
 });
 it('shows the sentence stem at support level one',()=>{
  render(<QuestionPanel {...props} level={1}/>);expect(screen.getByText(/The child could/)).toBeTruthy();
 });
});
