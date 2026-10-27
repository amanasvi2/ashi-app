import { beforeEach,it,expect,vi } from 'vitest';
const m=vi.hoisted(()=>({from:vi.fn(),rpc:vi.fn()}));
vi.mock('./supabase',()=>({supabase:{auth:{getUser:async()=>({data:{user:{id:'fake-child'}}})},from:m.from,rpc:m.rpc}}));
import { buyHintTokens,saveJournalEntry,loadLevelSliceForDisplay,spendCoins } from './storage';
function query(data:unknown,error:unknown=null){const q:Record<string,unknown>={};for(const k of ['select','eq','update','upsert'])q[k]=vi.fn(()=>q);q.maybeSingle=async()=>({data,error});q.then=(r:(v:unknown)=>unknown)=>Promise.resolve({data,error}).then(r);return q;}
beforeEach(()=>vi.resetAllMocks());
it('writes coins and hints together in one purchase update',async()=>{const q=query({balance:50,total_earned:50,hint_tokens:2});m.from.mockReturnValue(q);expect(await buyHintTokens(25,10)).toEqual({balance:25,totalEarned:50,hintTokens:12});expect(q.update).toHaveBeenCalledTimes(1);expect(q.update).toHaveBeenCalledWith({balance:25,total_earned:50,hint_tokens:12});});
it('does not spend if balance is insufficient',async()=>{const q=query({balance:1,total_earned:1,hint_tokens:0});m.from.mockReturnValue(q);expect(await buyHintTokens(25,10)).toBeNull();expect(q.update).not.toHaveBeenCalled();});
it('does not report a purchase when the database rejects its update',async()=>{const read=query({balance:50,total_earned:50,hint_tokens:0});const write=query(null,{message:'denied'});m.from.mockReturnValueOnce(read).mockReturnValueOnce(write);await expect(spendCoins(25)).rejects.toThrow('Coin balance was not saved');});
it('does not report a failed coin read as a zero balance',async()=>{m.from.mockReturnValue(query(null,{message:'offline'}));await expect(buyHintTokens(25,10)).rejects.toThrow('could not be loaded');});
it('surfaces a rejected journal save to the editor',async()=>{m.from.mockReturnValue(query(null,{message:'denied'}));await expect(saveJournalEntry({id:'fake-entry',date:new Date().toISOString(),mood:'okay',content:'Fictional QA note'})).rejects.toThrow('Journal entry was not saved');});
it('reads progress without applying a pending adaptive change',async()=>{const pending={social:2,nonverbal:null,inference:null};const q=query({levels:{social:3,nonverbal:3,inference:3},streaks:{},pending});m.from.mockReturnValue(q);const result=await loadLevelSliceForDisplay();expect(result.pending).toEqual(pending);expect(q.eq).toHaveBeenCalledWith('student_id','fake-child');expect(q.update).not.toHaveBeenCalled();});
it.each(['loadSessions','loadDifficulty','loadFloorAlarms','loadStudentProfile','loadConfig','loadCustomRewards','loadConversationSessions','loadConversationEscalation'] as const)('surfaces %s database errors instead of displaying empty parent data',async name=>{
 const q=query(null,{message:'offline'});for(const key of ['order','limit'])q[key]=vi.fn(()=>q);m.from.mockReturnValue(q);
 const storage=await import('./storage');
 await expect(storage[name]('fake-child')).rejects.toThrow('could not be loaded');
});
it('does not claim a daily goal saved when the database matched no row',async()=>{m.from.mockReturnValue(query(null));const {saveConfig}=await import('./storage');await expect(saveConfig({dailyMinimum:2},'missing-child')).rejects.toThrow('Daily goal was not saved');});
it('requires a returned reward row before confirming deletion',async()=>{const q=query(null);q.delete=vi.fn(()=>q);m.from.mockReturnValue(q);const {deleteCustomReward}=await import('./storage');await expect(deleteCustomReward('missing-reward')).rejects.toThrow('Reward was not deleted');});

it('does not present a failed journal-activity RPC as no entries',async()=>{m.rpc.mockResolvedValue({data:null,error:{message:'offline'}});const {parentJournalActivity}=await import('./storage');await expect(parentJournalActivity('fake-child')).rejects.toThrow('Journal activity could not be loaded');});
it('does not display default support levels after a failed parent read',async()=>{m.from.mockReturnValue(query(null,{message:'offline'}));const {loadLevelSlice}=await import('./storage');await expect(loadLevelSlice('fake-child')).rejects.toThrow('Support levels could not be loaded');});
it('saves the daily goal to the explicitly selected student and confirms the returned row',async()=>{const q=query({student_id:'selected'});m.from.mockReturnValue(q);const {saveConfig}=await import('./storage');await saveConfig({dailyMinimum:2},'selected');expect(q.eq).toHaveBeenCalledWith('student_id','selected');expect(q.update).toHaveBeenCalledWith({daily_minimum:2});});
