import { validateAssessment } from '../tiers/model';
import { callApi } from '../api';
import { validateEditedItem } from './validation';
import type { ReviewedItem, Workspace } from './model';
import { defaultSkill, safeCapture, labResult, validateCheck } from './model';
import { demoItem } from './fixtures';
export { demoItem, seedWorkspace } from './fixtures';
export type Transport = <T>(body: Record<string, unknown>) => Promise<T>;
export const liveTransport: Transport = body => callApi('/api/carryover',body);

// Deliberately ephemeral, fake-only demo. Never stores notes or calls an API.
export function demoTransport(data: Workspace): Transport {
  return async <T,>(b: Record<string,unknown>): Promise<T> => {
    if(b.action==='load')return structuredClone(data) as T;
    if(b.action==='capture'){
      const capture=safeCapture(b.capture);
      data.moments.push({...capture,id:crypto.randomUUID(),student_id:'demo',skill_id:defaultSkill(capture),created_at:new Date().toISOString()});
    }
    if(b.action==='generate'){
      const m=data.moments.find(m=>m.id===b.momentId);
      if(!m)throw new Error('Moment not found');
      data.items.push(...Array.from({length:3},(_,i):ReviewedItem=>({id:crypto.randomUUID(),student_id:m.student_id,moment_id:m.id,
        skill_id:m.skill_id,support_level:3,difficulty:1,item:demoItem(m.skill_id,i),status:'pending'})));
    }
    if(b.action==='review'){
      const row=data.items.find(r=>r.id===b.itemId);if(!row)throw new Error('Item not found');
      const type=row.item.type;
      if(b.status!=='rejected')row.item=validateEditedItem(b.item,row.skill_id,{social:3,nonverbal:3,inference:3,[type]:row.support_level},{social:1,nonverbal:1,inference:1,[type]:row.difficulty});row.status=b.status as ReviewedItem['status'];row.reviewed_at=new Date().toISOString();
    }
    if(b.action==='check'){
      const c=validateCheck(b.check);data.checks=data.checks.filter(x=>x.skill_id!==c.skill_id||x.week!==c.week);data.checks.push(c);
    }
    if(b.action==='assessment'){
      const a=validateAssessment(b.assessment);(data.assessments??=[]).push({...a,id:crypto.randomUUID(),created_at:new Date().toISOString()});
    }
    if(b.action==='mission')data.mission=String(b.mission);
    if(b.action==='lab'){
      const verdict=labResult(b.activity as Parameters<typeof labResult>[0],Number(b.scene),Number(b.choice));
      data.events.push({activity:b.activity as Parameters<typeof labResult>[0],scene:Number(b.scene),result:verdict.result,help:!!b.help,created_at:new Date().toISOString()});
      return verdict as T;
    }
    return {ok:true} as T;
  };
}
