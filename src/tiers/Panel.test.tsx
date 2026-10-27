import { afterEach,it,expect,vi } from 'vitest';
import { render,screen,fireEvent,cleanup } from '@testing-library/react';
import { CarryoverWorkspace } from '../carryover/Workspace';
import { demoTransport,seedWorkspace,type Transport } from '../carryover/client';
afterEach(cleanup);
it('shows per-skill empty evidence despite broad engine mastery',async()=>{
 const data=seedWorkspace('child');render(<CarryoverWorkspace studentId="child" studentName="Fake" owner onBack={()=>{}} transport={demoTransport(data)}/>);
 await screen.findAllByRole('button',{name:'Generate practice'});fireEvent.click(screen.getByRole('button',{name:'Skill tiers'}));
 expect(screen.getAllByText(/Building evidence/)).toHaveLength(5);expect(screen.getByText(/not a validated assessment/)).toBeTruthy();
});
it('records an adult check only after confirmation and refreshes the evidence',async()=>{
 const data=seedWorkspace('child');const transport=vi.fn(demoTransport(data)) as Transport;render(<CarryoverWorkspace studentId="child" studentName="Fake" owner onBack={()=>{}} transport={transport}/>);
 await screen.findAllByRole('button',{name:'Generate practice'});fireEvent.click(screen.getByRole('button',{name:'Skill tiers'}));
 expect((screen.getByRole('button',{name:'Save skill check'}) as HTMLButtonElement).disabled).toBe(true);
 fireEvent.change(screen.getByLabelText('Ability checked'),{target:{value:'explanation'}});fireEvent.click(screen.getByRole('checkbox'));fireEvent.click(screen.getByRole('button',{name:'Save skill check'}));
 await screen.findByText('Skill check saved. Tiers updated from the available evidence.');expect(data.assessments?.[0].task).toBe('explanation');expect(screen.getByText(/1 adult checks/)).toBeTruthy();
});
it('lets a child view tiers without recording an adult assessment',async()=>{
 render(<CarryoverWorkspace studentId="child" studentName="Fake" owner={false} onBack={()=>{}} transport={demoTransport(seedWorkspace('child'))}/>);
 fireEvent.click(screen.getByRole('button',{name:'My Skills'}));expect(screen.queryByRole('button',{name:'Save skill check'})).toBeNull();expect(screen.getAllByText('Getting started')).toHaveLength(5);expect(screen.getAllByLabelText('Tier 0 of 5 supported by current evidence')).toHaveLength(5);
});
