// Opt-in, fake-data model check. No auth accounts or database writes.
import { writeFile } from 'node:fs/promises';
import { CONVERSATION_MODEL, GroqRequestError } from '../server/groq.js';
import { classifyCarryoverMoment,generateCarryoverItems } from '../server/carryover.js';
import { seedWorkspace } from '../src/carryover/fixtures.js';
import type { SupportLevel } from '../src/types';
async function backoff<T>(run:()=>Promise<T>):Promise<T>{
 for(let attempt=0;;attempt++){
  try{return await run();}catch(e){
   if(!(e instanceof GroqRequestError)||e.status!==429||attempt>=4)throw e;
   await new Promise(resolve=>setTimeout(resolve,15000));
  }
 }
}
const results=[];
for (const [index,moment] of seedWorkspace('fake-only').moments.entries()) {
 const support=[3,2,0][index] as SupportLevel;
 const levels={social:support,nonverbal:support,inference:support};
 const difficulty={social:1,nonverbal:1,inference:1} as const;
 try {
  const skill=await backoff(()=>classifyCarryoverMoment(moment));
  const items=await backoff(()=>generateCarryoverItems(moment,skill,levels,difficulty));
  results.push({case:index+1,support,skill,status:'passed',itemCount:items.length,example:items[0]});
 }catch(e){results.push({case:index+1,support,status:'failed',reason:e instanceof Error?e.message:'Unknown model error'});}
}
const output={model:CONVERSATION_MODEL,runAt:new Date().toISOString(),fakeDataOnly:true,results};
await writeFile('../outputs/ashi-live-model-check.json',JSON.stringify(output,null,2));
console.log(JSON.stringify(output,null,2));
