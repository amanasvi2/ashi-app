import {it,expect,vi,beforeEach} from 'vitest';
const m=vi.hoisted(()=>({request:vi.fn(),update:vi.fn()}));
vi.mock('../supabase',()=>({supabase:{auth:{resetPasswordForEmail:m.request,updateUser:m.update}}}));
import {recoveryServices} from './recoveryServices';
beforeEach(()=>{vi.clearAllMocks();m.request.mockResolvedValue({error:null});m.update.mockResolvedValue({error:null});});
it('normalizes the email and uses the application root callback',async()=>{await recoveryServices.request(' FAKE@example.invalid ');expect(m.request).toHaveBeenCalledWith('fake@example.invalid',{redirectTo:window.location.origin+'/'});});
it('does not send an empty address or accept a short new password',async()=>{await expect(recoveryServices.request('')).rejects.toThrow();await expect(recoveryServices.update('short')).rejects.toThrow();expect(m.request).not.toHaveBeenCalled();expect(m.update).not.toHaveBeenCalled();});
it('surfaces transport failures without claiming email delivery',async()=>{m.request.mockResolvedValue({error:{message:'limited'}});await expect(recoveryServices.request('fake@example.invalid')).rejects.toThrow('could not be requested');});
