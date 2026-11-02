import {beforeEach,it,expect,vi} from 'vitest';
const m=vi.hoisted(()=>({verify:vi.fn(),from:vi.fn(),groq:vi.fn()}));
vi.mock('./verifyUser.js',()=>({verifyUser:m.verify}));vi.mock('./asUser.js',()=>({supabaseAsUser:()=>({from:m.from})}));vi.mock('./groq.js',()=>({groqChat:m.groq}));
import handler from '../api/items/generate';
import {sceneForItem} from '../src/scenes/catalog';
import type {Item} from '../src/types';
function query(data:unknown,error:unknown=null){const q:Record<string,unknown>={};for(const key of ['select','eq','limit'])q[key]=vi.fn(()=>q);q.maybeSingle=async()=>({data,error});q.then=(r:(v:unknown)=>unknown)=>Promise.resolve({data,error}).then(r);return q;}
const body={mode:'mixed',difficulty:{social:1,nonverbal:1,inference:1},levels:{social:3,nonverbal:3,inference:3},count:5,presentation:'animated'};
async function send(overrides:Record<string,unknown>={}){const res={code:0,body:{} as {items?:Item[];error?:string},status(n:number){this.code=n;return this;},json(b:unknown){this.body=b as typeof this.body;return this;}};await handler({method:'POST',headers:{authorization:'Bearer synthetic'},body:{...body,...overrides}} as never,res as never);return res;}
beforeEach(()=>{vi.clearAllMocks();m.verify.mockResolvedValue({id:'fake-child'});m.from.mockImplementation(table=>table==='carryover_items'?query([]):table==='student_profiles'?query({grade:3,reading_level:2,focus:[]}):query({floor_alarm:{social:false,nonverbal:false,inference:false}}));});
it('serves authenticated animated rounds with a scene for every returned item and no model call',async()=>{const res=await send();expect(res.code).toBe(200);expect(res.body.items!.length).toBeGreaterThan(0);for(const item of res.body.items!)expect(sceneForItem(item)).toBeTruthy();expect(m.groq).not.toHaveBeenCalled();});
it('requires authentication before reading learner data',async()=>{m.verify.mockResolvedValue(null);expect((await send()).code).toBe(401);expect(m.from).not.toHaveBeenCalled();});
it('keeps mixed rounds out of paused skills even without an active profile',async()=>{m.from.mockImplementation(t=>t==='carryover_items'?query([]):t==='student_profiles'?query(null):query({floor_alarm:{social:true,nonverbal:false,inference:true}}));const res=await send();expect(res.code).toBe(200);expect(res.body.items!.every(i=>i.type==='nonverbal')).toBe(true);});
it('pauses the entire mixed round when all skills are paused',async()=>{m.from.mockReturnValue(query({floor_alarm:{social:true,nonverbal:true,inference:true}}));expect((await send()).code).toBe(409);expect(m.groq).not.toHaveBeenCalled();});
it('preserves the floor alarm for an explicitly selected skill',async()=>{m.from.mockReturnValue(query({floor_alarm:{social:true}}));expect((await send({mode:'social'})).code).toBe(409);});
it('does not serve a bank after a profile read failure',async()=>{m.from.mockImplementation(t=>t==='student_profiles'?query(null,{message:'offline'}):query({}));expect((await send()).code).toBe(503);});
it('rejects unsupported presentation and malformed item requests',async()=>{for(const override of [{presentation:'video'},{count:0},{count:21},{count:1.5},{mode:'fake'},{difficulty:{social:0,nonverbal:1,inference:1}}])expect((await send(override)).code).toBe(400);});
it('keeps approved Carryover items eligible without guessing an animation for them',async()=>{
 const {ITEMS}=await import('../src/items');const row={id:'approved-fake',moment_id:'fake-moment',skill_id:'perspective_taking',status:'approved',support_level:3,difficulty:1,item:ITEMS[0]};
 m.from.mockImplementation(t=>t==='carryover_items'?query([row]):t==='student_profiles'?query({focus:[]}):query({floor_alarm:{}}));
 const res=await send({mode:'social'});expect(res.code).toBe(200);expect(res.body.items![0].source).toBe('carryover');expect(res.body.items![0].id).toBe('approved-fake');expect(sceneForItem(res.body.items![0])).toBeNull();expect(m.groq).not.toHaveBeenCalled();
});
it('retains fresh AI generation for the text format',async()=>{
 const {ITEMS}=await import('../src/items');m.groq.mockResolvedValue(JSON.stringify([ITEMS[0]]));
 const res=await send({mode:'social',count:1,presentation:'text'});expect(res.code).toBe(200);expect(m.groq).toHaveBeenCalledOnce();expect(res.body.items![0].id).toMatch(/^gen_/);expect(sceneForItem(res.body.items![0])).toBeNull();
});
