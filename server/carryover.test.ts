import { beforeEach,describe,it,expect,vi } from 'vitest';
import type { VercelRequest,VercelResponse } from '@vercel/node';
const mocks=vi.hoisted(()=>({verify:vi.fn(),from:vi.fn(),groq:vi.fn()}));
vi.mock('./verifyUser',()=>({verifyUser:mocks.verify}));
vi.mock('./asUser',()=>({supabaseAsUser:()=>({from:mocks.from})}));
vi.mock('./groq',()=>({groqChat:mocks.groq}));
import handler from '../api/carryover';
import { seedWorkspace } from '../src/carryover/fixtures';
function query(data:unknown,error:unknown=null){
 const q:Record<string,unknown>={};
 for(const name of ['select','eq','limit','order','insert','update','upsert'])q[name]=vi.fn(()=>q);
 q.single=q.maybeSingle=()=>Promise.resolve({data,error});
 q.then=(resolve:(r:unknown)=>unknown)=>Promise.resolve({data,error}).then(resolve);
 return q;
}
async function request(body:Record<string,unknown>){
 const res={status:vi.fn(),json:vi.fn()};res.status.mockReturnValue(res);
 await handler({method:'POST',headers:{authorization:'Bearer fake'},body} as VercelRequest,res as unknown as VercelResponse);
 return res;
}
beforeEach(()=>{vi.clearAllMocks();mocks.verify.mockResolvedValue({id:'owner'});mocks.from.mockImplementation(()=>query({id:'child',owner_id:'owner'}));});
describe('Carryover API boundaries and responses',()=>{
 it('rejects unauthenticated access before database reads',async()=>{
  mocks.verify.mockResolvedValue(null);const r=await request({action:'load'});expect(r.status).toHaveBeenCalledWith(401);expect(mocks.from).not.toHaveBeenCalled();
 });
 it('rejects a different owner before looking at moments',async()=>{
  mocks.from.mockReturnValue(query({id:'child',owner_id:'someone-else'}));const r=await request({action:'load',studentId:'child'});expect(r.status).toHaveBeenCalledWith(403);expect(mocks.from).toHaveBeenCalledTimes(1);
 });
 it.each(['capture','generate','review','check','assessment'])('does not let a student perform owner action %s',async action=>{
  mocks.verify.mockResolvedValue({id:'child'});const r=await request({action,studentId:'child'});expect(r.status).toHaveBeenCalledWith(403);
 });
 it('does not let an owner choose the child mission',async()=>{const r=await request({action:'mission',studentId:'child',mission:'Join an activity'});expect(r.status).toHaveBeenCalledWith(403);});
 it('saves only anonymous allowlisted fields, never raw names',async()=>{
  const save=query({id:'new-moment'});mocks.from.mockImplementation(t=>t==='students'?query({id:'child',owner_id:'owner'}):save);
  const r=await request({action:'capture',studentId:'child',capture:{situation:'tone',setting:'home',role:'sibling',response:'stayed quiet',notes:'Alice told bob a secret',name:'Alice'}});
  expect(r.json).toHaveBeenCalledWith({id:'new-moment'});
  expect(JSON.stringify((save.insert as ReturnType<typeof vi.fn>).mock.calls)).not.toMatch(/Alice|bob|notes|name/);
 });
 it('refuses an unsupported identifying role without calling the model',async()=>{
  const r=await request({action:'capture',studentId:'child',capture:{role:'Alice'}});expect(r.status).toHaveBeenCalledWith(422);expect(mocks.groq).not.toHaveBeenCalled();
 });
 it('does not accept a forged correct lab result',async()=>{
  mocks.verify.mockResolvedValue({id:'child'});const save=query(null);
  mocks.from.mockImplementation(t=>t==='students'?query({id:'child',owner_id:'owner'}):save);
  const r=await request({action:'lab',studentId:'child',activity:'interpretations',scene:0,choice:2,help:false,result:'correct'});
  expect((save.insert as ReturnType<typeof vi.fn>).mock.calls[0][0].result).toBe('incorrect');
  expect(r.json).toHaveBeenCalledWith(expect.objectContaining({result:'incorrect',feedback:expect.stringContaining('Try another explanation')}));
 });
 it('rejects malformed model batches without saving practice',async()=>{
  const moment=seedWorkspace('child').moments[0];
  mocks.from.mockImplementation(t=>query(t==='students'?{id:'child',owner_id:'owner'}:t==='carryover_moments'?moment:t==='level_state'?{levels:{social:3,nonverbal:3,inference:3}}:{state:{social:1,nonverbal:1,inference:1}}));
  mocks.groq.mockResolvedValueOnce('{"skillId":"perspective_taking"}').mockResolvedValueOnce('[]').mockResolvedValueOnce('[]');
  const r=await request({action:'generate',studentId:'child',momentId:moment.id});expect(r.status).toHaveBeenCalledWith(422);
  expect(mocks.from.mock.calls.some(c=>c[0]==='carryover_items')).toBe(false);
 });
 it('reports missing migration instead of pretending the workspace is empty',async()=>{
  mocks.from.mockImplementation(t=>t==='students'?query({id:'child',owner_id:'owner'}):query(null,{message:'missing relation'}));
  const r=await request({action:'load',studentId:'child'});expect(r.status).toHaveBeenCalledWith(503);expect(r.json).toHaveBeenCalledWith(expect.objectContaining({error:expect.stringContaining('migration 0009')}));
 });
});

describe('Carryover generation and review success paths',()=>{
 it('stores valid generated items as pending, never approved',async()=>{
  const fixture=seedWorkspace('child');const moment=fixture.moments[0];const insert=query(fixture.items);
  mocks.from.mockImplementation(t=>t==='carryover_items'?insert:query(t==='students'?{id:'child',owner_id:'owner'}:t==='carryover_moments'?moment:t==='level_state'?{levels:{social:3,nonverbal:3,inference:3}}:{state:{social:1,nonverbal:1,inference:1}}));
  mocks.groq.mockResolvedValueOnce('{"skillId":"perspective_taking"}').mockResolvedValueOnce(JSON.stringify(Array(3).fill(fixture.items[0].item)));
  const r=await request({action:'generate',studentId:'child',momentId:moment.id});
  expect(r.json).toHaveBeenCalledWith(fixture.items);
  const payload=(insert.insert as ReturnType<typeof vi.fn>).mock.calls[0][0];
  expect(payload).toHaveLength(3);expect(payload.every((v:{status:string})=>v.status==='pending')).toBe(true);
 });
 it('persists owner approval with reviewer identity only after validation',async()=>{
  const row=seedWorkspace('child').items[0];const update=query(row);
  mocks.from.mockImplementation(t=>t==='students'?query({id:'child',owner_id:'owner'}):update);
  const r=await request({action:'review',studentId:'child',itemId:row.id,item:row.item,status:'approved'});
  expect(r.json).toHaveBeenCalledWith({ok:true});
  expect((update.update as ReturnType<typeof vi.fn>).mock.calls[0][0]).toMatchObject({status:'approved',reviewer_id:'owner'});
 });
});

describe('Specific skill routing',()=>{
 it('rejects a broad perspective label for a selected tone event',async()=>{
  const {classifyCarryoverMoment}=await import('./carryover');
  mocks.groq.mockResolvedValueOnce('{"skillId":"perspective_taking"}');
  await expect(classifyCarryoverMoment({situation:'tone',setting:'home',role:'sibling',response:'stayed quiet'})).rejects.toThrow(/selected event category/);
 });
 it('accepts the specific nonverbal skill for a tone event',async()=>{
  const {classifyCarryoverMoment}=await import('./carryover');
  mocks.groq.mockResolvedValueOnce('{"skillId":"nonverbal_cues"}');
  await expect(classifyCarryoverMoment({situation:'tone',setting:'home',role:'sibling',response:'stayed quiet'})).resolves.toBe('nonverbal_cues');
 });
});

it('saves a validated skill assessment without client identity, dates or narrative',async()=>{
 const save=query(null);mocks.from.mockImplementation(t=>t==='students'?query({id:'child',owner_id:'owner'}):save);
 const r=await request({action:'assessment',studentId:'child',assessment:{skill_id:'perspective_taking',task:'explanation',situation:'excluded',setting:'home',context:'new',result:'correct',help:'independent',student_id:'another-child',created_at:'2025-01-01',notes:'Alice'}});
 expect(r.json).toHaveBeenCalledWith({ok:true});expect((save.insert as ReturnType<typeof vi.fn>).mock.calls[0][0]).toEqual({student_id:'child',skill_id:'perspective_taking',task:'explanation',situation:'excluded',setting:'home',context:'new',result:'correct',help:'independent'});
});
it('rejects invalid skill checks without writing evidence',async()=>{
 const save=query(null);mocks.from.mockImplementation(t=>t==='students'?query({id:'child',owner_id:'owner'}):save);
 const r=await request({action:'assessment',studentId:'child',assessment:{skill_id:'all'}});expect(r.status).toHaveBeenCalledWith(422);expect(save.insert).not.toHaveBeenCalled();
});
it('fails visibly when tier migration is missing',async()=>{
 mocks.from.mockImplementation(t=>t==='students'?query({id:'child',owner_id:'owner'}):t==='skill_assessments'?query(null,{code:'42P01'}):query([]));
 const r=await request({action:'load',studentId:'child'});expect(r.status).toHaveBeenCalledWith(503);expect(r.json).toHaveBeenCalledWith(expect.objectContaining({error:expect.stringContaining('0010')}));
});
