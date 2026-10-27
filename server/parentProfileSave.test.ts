import {it,expect,beforeEach,vi} from 'vitest';
const m=vi.hoisted(()=>({verify:vi.fn(),from:vi.fn()}));
vi.mock('./verifyUser.js',()=>({verifyUser:m.verify}));vi.mock('./asUser.js',()=>({supabaseAsUser:()=>({from:m.from})}));
import save from '../api/profile/save';
function query(result:unknown){const q:Record<string,unknown>={};for(const k of ['select','eq','insert'])q[k]=vi.fn(()=>q);q.maybeSingle=q.single=async()=>result;q.then=(r:(v:unknown)=>unknown)=>Promise.resolve(result).then(r);return q;}
const profile={display_name:'Fake child',grade:1,reading_level:1,strengths:[],focus:[],supports:[],session_length_min:12,interests:['drawing']};
beforeEach(()=>{vi.resetAllMocks();m.verify.mockResolvedValue({id:'fake-owner'});});
async function run(){const res={code:0,body:{} as Record<string,unknown>,status(n:number){this.code=n;return this;},json(b:Record<string,unknown>){this.body=b;return this;}};await save({method:'POST',headers:{authorization:'Bearer fake'},body:{profile}} as never,res as never);return res;}
it('fails closed on a count error rather than assuming zero children',async()=>{m.from.mockReturnValueOnce(query({data:{owner_type:'parent'},error:null})).mockReturnValueOnce(query({count:null,error:{message:'offline'}}));expect((await run()).code).toBe(503);expect(m.from).toHaveBeenCalledTimes(2);});
it('rejects new profiles at the parent cap before inserting',async()=>{m.from.mockReturnValueOnce(query({data:{owner_type:'parent'},error:null})).mockReturnValueOnce(query({count:5,error:null}));expect((await run()).code).toBe(409);expect(m.from).toHaveBeenCalledTimes(2);});
it('saves an allowed profile under the verified owner',async()=>{const insert=query({data:{id:'p',display_name:'Fake child'},error:null});m.from.mockReturnValueOnce(query({data:{owner_type:'parent'},error:null})).mockReturnValueOnce(query({count:0,error:null})).mockReturnValueOnce(insert);expect((await run()).code).toBe(200);expect(insert.insert).toHaveBeenCalledWith(expect.objectContaining({owner_id:'fake-owner',grade:1,reading_level:1}));});
