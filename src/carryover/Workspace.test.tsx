import { afterEach,beforeEach,describe,expect,it,vi } from 'vitest';
import { render,screen,fireEvent,waitFor,cleanup } from '@testing-library/react';
import { CarryoverWorkspace } from './Workspace';
import { demoTransport,seedWorkspace,type Transport } from './client';

beforeEach(()=>{vi.stubGlobal('speechSynthesis',{cancel:vi.fn(),speak:vi.fn()});});
afterEach(()=>{cleanup();vi.unstubAllGlobals();});
function setup(owner=true){
 const data=seedWorkspace('fake-child');const send=demoTransport(data);
 const transport=vi.fn(send) as Transport;
 render(<CarryoverWorkspace studentId="fake-child" studentName="Fake learner" owner={owner} onBack={()=>{}} transport={transport}/>);
 return {data,transport};
}
describe('Carryover owner and child screens',()=>{
 it('requires confirmation and never sends optional named notes',async()=>{
  const {data,transport}=setup();await waitFor(()=>expect(screen.getAllByText(/Setting: lunch/).length).toBeGreaterThan(0));
  const save=screen.getByRole('button',{name:'Save anonymous moment'}) as HTMLButtonElement;expect(save.disabled).toBe(true);
  fireEvent.change(screen.getByLabelText('Optional notes — not saved'),{target:{value:'Alice and bob at Lincoln School'}});
  fireEvent.click(screen.getByRole('checkbox'));fireEvent.click(save);
  await screen.findByText('Anonymous moment saved. Generate practice below.');
  const calls=(transport as ReturnType<typeof vi.fn>).mock.calls.filter(c=>c[0].action==='capture');
  expect(JSON.stringify(calls)).not.toMatch(/Alice|bob|Lincoln/);expect(data.moments).toHaveLength(4);
 });
 it('keeps generated demo items pending until an owner approves',async()=>{
  const {data}=setup();await screen.findAllByRole('button',{name:'Generate practice'});
  fireEvent.click(screen.getAllByRole('button',{name:'Generate practice'})[0]);
  await screen.findByText('Three practice items are pending review. Open Review practice.');
  expect(data.items).toHaveLength(6);expect(data.items.every(i=>i.status==='pending')).toBe(true);
  fireEvent.click(screen.getByRole('button',{name:'Review practice'}));fireEvent.click(screen.getAllByLabelText('This item uses roles, not real names.')[0]);fireEvent.click(screen.getAllByRole('button',{name:'Approve'})[0]);
  await screen.findByText('Review saved: approved.');expect(data.items[0].status).toBe('approved');
 });
 it('shows a save error instead of approving invalid edited evidence',async()=>{
  const {data}=setup();await screen.findAllByRole('button',{name:'Generate practice'});fireEvent.click(screen.getByRole('button',{name:'Review practice'}));
  fireEvent.change(screen.getAllByLabelText('Supporting sentence')[0],{target:{value:'This sentence is missing from the scenario.'}});
  fireEvent.click(screen.getAllByLabelText('This item uses roles, not real names.')[0]);fireEvent.click(screen.getAllByRole('button',{name:'Approve'})[0]);await screen.findByRole('alert');expect(data.items[0].status).toBe('pending');
 });
 it('records no opportunity without inventing a rating',async()=>{
  const {data}=setup();await screen.findAllByRole('button',{name:'Generate practice'});fireEvent.click(screen.getByRole('button',{name:'Weekly check-in'}));
  fireEvent.change(screen.getAllByLabelText('Did this come up again?')[0],{target:{value:'no'}});
  fireEvent.click(screen.getAllByRole('button',{name:'Save observation'})[0]);await screen.findByText('Weekly observation saved.');
  expect(data.checks.find(c=>c.opportunity==='no')).toMatchObject({opportunity:'no',rating:null,help:null});
 });
 it('lets the child choose a self-advocacy mission',async()=>{
  const {data}=setup(false);fireEvent.click(screen.getByRole('button',{name:'My mission'}));
  fireEvent.click(screen.getByRole('button',{name:'Set a boundary'}));await screen.findByText('Your mission is saved.');expect(data.mission).toBe('Set a boundary');
  expect(screen.queryByRole('button',{name:'Review practice'})).toBeNull();
 });
 it('responds to clarification with a partner repair and records help separately',async()=>{
  const {data}=setup(false);fireEvent.click(screen.getByRole('button',{name:'Fix a misunderstanding'}));
  fireEvent.click(screen.getByRole('button',{name:'Show a cue'}));
  fireEvent.click(screen.getByRole('button',{name:'I mean a break today, not quitting.'}));
  await screen.findByText('Partner: “Thanks for explaining. A break today makes sense.”');
  expect(data.events[0]).toMatchObject({activity:'repair',result:'correct',help:true});
 });
 it('clears previous-child data immediately when changing children',async()=>{
  const a=seedWorkspace('a');const b=seedWorkspace('b');b.moments=[];b.items=[];
  const view=render(<CarryoverWorkspace studentId="a" studentName="A" owner onBack={()=>{}} transport={demoTransport(a)}/>);
  await screen.findAllByRole('button',{name:'Generate practice'});
  view.rerender(<CarryoverWorkspace studentId="b" studentName="B" owner onBack={()=>{}} transport={demoTransport(b)}/>);
  await screen.findByText('No moments yet.');expect(screen.queryByRole('button',{name:'Generate practice'})).toBeNull();
 });
});

describe('Practice limits and evidence interpretation',()=>{
 it('ends a lab session after five submitted exercises',async()=>{
  setup(false);
  for(let i=0;i<5;i++){
   const answer=screen.getByRole('button',{name:/^(Ask if they want a turn|Tell them the page number|Give them some time)$/});
   fireEvent.click(answer);
   if(i<4){const next=await screen.findByRole('button',{name:'Next situation'});fireEvent.click(next);}
  }
  await screen.findByRole('heading',{name:'Practice complete'});
  expect(screen.queryByRole('button',{name:'Next situation'})).toBeNull();
 });
 it('shows a transfer-review flag while keeping broad engine history separate',async()=>{
  setup();await screen.findAllByRole('button',{name:'Generate practice'});fireEvent.click(screen.getByRole('button',{name:'Evidence brief'}));
  await screen.findByText('High app mastery; transfer needs review.');
  expect(screen.getByText(/Engine mastery is measured for broad item types/)).toBeTruthy();
 });
 it('replaces a listed name in edits before sending a review request',async()=>{
  const {transport}=setup();await screen.findAllByRole('button',{name:'Generate practice'});fireEvent.click(screen.getByRole('button',{name:'Review practice'}));
  fireEvent.change(screen.getAllByLabelText('Situation')[0],{target:{value:'Alice is waiting. Alice has not had a turn at the group activity.'}});
  fireEvent.change(screen.getAllByLabelText('Supporting sentence')[0],{target:{value:'Alice has not had a turn at the group activity.'}});
  fireEvent.change(screen.getAllByLabelText('Names to replace, separated by commas — local only')[0],{target:{value:'Alice'}});
  fireEvent.click(screen.getAllByLabelText('This item uses roles, not real names.')[0]);fireEvent.click(screen.getAllByRole('button',{name:'Approve'})[0]);
  await screen.findByText('Review saved: approved.');
  const calls=(transport as ReturnType<typeof vi.fn>).mock.calls.filter(c=>c[0].action==='review');
  expect(JSON.stringify(calls)).not.toContain('Alice');expect(calls[0][0].item.scenario).toContain('another person');
 });
});

it('invokes browser printing for the evidence brief',async()=>{
 const print=vi.spyOn(window,'print').mockImplementation(()=>{});
 setup();await screen.findAllByRole('button',{name:'Generate practice'});
 fireEvent.click(screen.getByRole('button',{name:'Evidence brief'}));
 fireEvent.click(screen.getByRole('button',{name:'Print or save brief as PDF'}));expect(print).toHaveBeenCalledOnce();print.mockRestore();
});
