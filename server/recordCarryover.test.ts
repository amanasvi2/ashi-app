import { beforeEach,describe,it,expect,vi } from 'vitest';
import type { VercelRequest,VercelResponse } from '@vercel/node';
const mocks=vi.hoisted(()=>({from:vi.fn()}));
vi.mock('./verifyUser',()=>({verifyUser:async()=>({id:'child'})}));
vi.mock('./asUser',()=>({supabaseAsUser:()=>({from:mocks.from})}));
import handler from '../api/record-attempt';
function query(data:unknown){const q:Record<string,unknown>={};for(const key of ['select','eq','insert'])q[key]=vi.fn(()=>q);q.maybeSingle=()=>({data});q.then=(r:(v:unknown)=>unknown)=>Promise.resolve({data,error:null}).then(r);return q;}
async function send(){const r={status:vi.fn(),json:vi.fn()};r.status.mockReturnValue(r);await handler({method:'POST',headers:{authorization:'Bearer fake'},body:{itemType:'social',supportLevel:3,difficulty:1,optionCount:3,result:'correct',source:'carryover',carryoverItemId:'approved-id'}} as VercelRequest,r as unknown as VercelResponse);return r;}
beforeEach(()=>vi.clearAllMocks());
describe('Carryover attempt provenance',()=>{
 it('rejects attempts for an unapproved or inaccessible item',async()=>{mocks.from.mockReturnValue(query(null));const r=await send();expect(r.status).toHaveBeenCalledWith(400);expect(mocks.from).not.toHaveBeenCalledWith('item_attempts');});
 it('takes the skill from the approved database item, not client claims',async()=>{
  const insert=query(null);mocks.from.mockImplementation(t=>t==='carryover_items'?query({id:'approved-id',skill_id:'perspective_taking',item:{type:'social'},difficulty:1}):insert);
  const r=await send();expect(r.json).toHaveBeenCalledWith({ok:true});expect((insert.insert as ReturnType<typeof vi.fn>).mock.calls[0][0]).toMatchObject({source:'carryover',carryover_item_id:'approved-id',skill_id:'perspective_taking',student_id:'child'});
 });
});
