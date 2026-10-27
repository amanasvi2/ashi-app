import {it,expect,beforeEach,vi} from 'vitest';
const m=vi.hoisted(()=>({verify:vi.fn(),from:vi.fn(),createUser:vi.fn(),deleteUser:vi.fn()}));
vi.mock('./verifyUser.js',()=>({verifyUser:m.verify}));
vi.mock('./supabaseAdmin.js',()=>({supabaseAdmin:{from:m.from,auth:{admin:{createUser:m.createUser,deleteUser:m.deleteUser}}}}));
import createStudent from '../api/create-student';
function query(result:unknown){const q:Record<string,unknown>={};for(const key of ['select','eq','update','insert','delete'])q[key]=vi.fn(()=>q);q.maybeSingle=async()=>result;q.then=(resolve:(v:unknown)=>unknown)=>Promise.resolve(result).then(resolve);return q;}
function response(){return {code:0,body:{} as Record<string,unknown>,status(code:number){this.code=code;return this;},json(body:Record<string,unknown>){this.body=body;return this;}};}
beforeEach(()=>{vi.resetAllMocks();m.verify.mockResolvedValue({id:'owner'});m.createUser.mockResolvedValue({data:{user:{id:'new-child'}},error:null});m.deleteUser.mockResolvedValue({error:null});});
async function run(){const res=response();await createStudent({method:'POST',headers:{authorization:'Bearer synthetic'},body:{profileId:'profile',username:'fake',password:'fake-password'}} as never,res as never);return res;}
function setup(failed=false){m.from.mockReturnValueOnce(query({data:{id:'profile',owner_id:'owner',student_id:null,display_name:'Fake',interests:[]},error:null})).mockReturnValueOnce(query({data:null,error:null})).mockReturnValueOnce(query({error:null})).mockReturnValueOnce(query({error:null}));for(let i=0;i<4;i++)m.from.mockReturnValueOnce(query({error:failed&&i===1?{message:'offline'}:null}));}
it('rejects another owner before creating any child account',async()=>{m.from.mockReturnValue(query({data:{owner_id:'other'},error:null}));const res=await run();expect(res.code).toBe(403);expect(m.createUser).not.toHaveBeenCalled();});
it('reports setup success only after all initial state writes succeed',async()=>{setup();const res=await run();expect(res.code).toBe(200);expect(res.body.studentId).toBe('new-child');expect(m.deleteUser).not.toHaveBeenCalled();});
it('does not claim success when a required state row fails and cleans up the new auth user',async()=>{setup(true);const res=await run();expect(res.code).toBe(500);expect(m.deleteUser).toHaveBeenCalledWith('new-child');expect(res.body.error).toContain('Please try again');});
it('reports incomplete setup when cleanup also fails instead of encouraging a duplicate retry',async()=>{setup(true);m.deleteUser.mockResolvedValue({error:{message:'offline'}});const res=await run();expect(res.code).toBe(500);expect(res.body.error).toContain('Contact support');});
