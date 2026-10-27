import {it,expect,vi,beforeEach} from 'vitest';
const m=vi.hoisted(()=>({verify:vi.fn(),from:vi.fn(),groq:vi.fn(),moderate:vi.fn()}));
vi.mock('./verifyUser.js',()=>({verifyUser:m.verify}));vi.mock('./asUser.js',()=>({supabaseAsUser:()=>({from:m.from})}));
vi.mock('./groq.js',()=>({groqChat:m.groq,GroqRequestError:class extends Error{}}));
vi.mock('./conversationSafety.js',async original=>({...await original<typeof import('./conversationSafety')>(),runModeration:m.moderate}));
import generate from '../api/items/generate';
import evaluate from '../api/evaluate-answer';
import conversation from '../api/conversation';
import {demoItem} from '../src/carryover/fixtures';
function query(data:unknown){const q:Record<string,unknown>={};for(const k of ['select','eq','limit','insert','update'])q[k]=vi.fn(()=>q);q.single=q.maybeSingle=async()=>({data,error:null});q.then=(r:(v:unknown)=>unknown)=>Promise.resolve({data,error:null}).then(r);return q;}
const profile=query({grade:1,reading_level:1,focus:[]});
beforeEach(()=>{vi.clearAllMocks();m.verify.mockResolvedValue({id:'young-child'});m.moderate.mockResolvedValue({verdict:'safe'});m.from.mockImplementation(table=>table==='student_profiles'?profile:table==='carryover_items'?query([]):table==='conversation_sessions'?query({id:'sample-session'}):query({}));});
function response(){return {code:0,body:undefined as unknown,status(n:number){this.code=n;return this;},json(b:unknown){this.body=b;return this;}};}
function request(body:unknown){return {method:'POST',headers:{authorization:'Bearer synthetic'},body} as never;}
function assertYoungPrompt(){expect(m.groq.mock.calls[0][0][0].content).toContain('early elementary');expect(m.groq.mock.calls[0][0][0].content).toContain('reading grade 1');expect(profile.eq).toHaveBeenCalledWith('student_id','young-child');}
it('generates from the authenticated child profile, ignoring a client-supplied older grade',async()=>{m.groq.mockResolvedValue(JSON.stringify([demoItem('perspective_taking',0)]));const res=response();await generate(request({mode:'social',difficulty:{social:1,nonverbal:1,inference:1},levels:{social:3,nonverbal:3,inference:3},count:1,grade:12}),res as never);expect(res.code).toBe(200);assertYoungPrompt();});
it('uses the saved reading profile for typed-answer feedback',async()=>{m.groq.mockResolvedValue('{"result":"correct","feedback":"You found the clue."}');const res=response();await evaluate(request({scenario:'A fictional situation.',questionText:'What could you do?',correctAnswer:'Ask.',userAnswer:'I can ask.',grade:12}),res as never);expect(res.code).toBe(200);assertYoungPrompt();});
it('starts a conversation using the saved profile and keeps moderation',async()=>{m.groq.mockResolvedValue('What games do you like?');const res=response();await conversation(request({topicId:'games',grade:12}),res as never);expect(res.code).toBe(200);assertYoungPrompt();expect(m.moderate).toHaveBeenCalledWith('What games do you like?');});
it('passes the saved plain-language preference to generation while retaining secondary-school settings',async()=>{m.from.mockImplementation(table=>table==='student_profiles'?query({grade:8,reading_level:8,focus:[],supports:['plain_language']}):table==='carryover_items'?query([]):query({}));m.groq.mockResolvedValue(JSON.stringify([demoItem('perspective_taking',0)]));const res=response();await generate(request({mode:'social',difficulty:{social:1,nonverbal:1,inference:1},levels:{social:3,nonverbal:3,inference:3},count:1}),res as never);expect(res.code).toBe(200);const prompt=m.groq.mock.calls[0][0][0].content;expect(prompt).toContain('Always use short concrete directions');expect(prompt).toContain('secondary school');});
