import {it,vi,expect,beforeEach} from 'vitest';
const m=vi.hoisted(()=>({from:vi.fn()}));
vi.mock('./supabase',()=>({supabase:{from:m.from}}));
import {listMyStudents} from './students';
import {listMyProfiles,getMyOwnerType} from './profiles';
function query(error:unknown){const q:Record<string,unknown>={};for(const key of ['select','eq','order'])q[key]=()=>q;q.maybeSingle=async()=>({data:null,error});q.then=(r:(v:unknown)=>unknown)=>Promise.resolve({data:null,error}).then(r);return q;}
beforeEach(()=>vi.resetAllMocks());
it.each([listMyStudents,listMyProfiles,getMyOwnerType])('rejects an account read failure instead of inventing empty setup data: %s',async fn=>{m.from.mockReturnValue(query({message:'denied'}));await expect(fn('fake-owner')).rejects.toThrow('Account data could not be loaded');});
it('treats a successful empty student list as genuinely empty',async()=>{m.from.mockReturnValue(query(null));expect(await listMyStudents('new-owner')).toEqual([]);});
