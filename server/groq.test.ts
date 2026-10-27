import { afterEach,describe,it,expect,vi } from 'vitest';
import { groqChat,CONVERSATION_MODEL,GroqRequestError } from './groq';
afterEach(()=>vi.unstubAllGlobals());
describe('Supported Groq generation model',()=>{
 it('uses a supported replacement and never returns the hidden reasoning field',async()=>{
  const fetcher=vi.fn(async(_url:string,_options:{body:string})=>new Response(JSON.stringify({choices:[{message:{content:'{"skillId":"perspective_taking"}',reasoning:'not student feedback'}}]}),{status:200}));
  vi.stubGlobal('fetch',fetcher);
  expect(await groqChat([{role:'user',content:'fake moment'}],{maxTokens:100})).toBe('{"skillId":"perspective_taking"}');
  const payload=JSON.parse(fetcher.mock.calls[0][1].body);
  expect(payload.model).toBe(CONVERSATION_MODEL);expect(payload.model).not.toBe('llama-3.3-70b-versatile');
  if(CONVERSATION_MODEL.startsWith('openai/gpt-oss-'))expect(payload).toMatchObject({include_reasoning:false,reasoning_effort:'low'});
 });
 it('returns only a numeric status error on provider failure',async()=>{
  vi.stubGlobal('fetch',vi.fn(async()=>new Response('private provider diagnostics',{status:429})));
  try{await groqChat([{role:'user',content:'fake moment'}]);expect.fail('Expected rejection');}
  catch(e){expect(e).toBeInstanceOf(GroqRequestError);expect((e as Error).message).toBe('Groq request failed with status 429');}
 });
});
