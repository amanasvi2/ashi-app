import {clearAllDescriptionDrafts} from '../pages/onboarding/draftStorage';
import {supabase} from '../supabase';
export {RECOVERY_KEY} from './recoveryLocation';
export const recoveryServices={
 async request(email:string){
  const normalized=email.trim().toLowerCase();
  if(!normalized||!normalized.includes('@')||normalized.length>254)throw new Error('Enter your account email.');
  // Root is already ASHI's normal auth destination. Entry recognizes recovery
  // fragments before the SDK consumes them, including Site URL fallbacks.
  const {error}=await supabase.auth.resetPasswordForEmail(normalized,{redirectTo:`${window.location.origin}/`});
  if(error)throw new Error('The reset link could not be requested. Please try again shortly.');
 },
 async session(){const {data,error}=await supabase.auth.getSession();if(error)throw new Error('That reset link is invalid or expired.');return data.session?.user.id??null;},
 async verify(){const {data,error}=await supabase.auth.getUser();if(error||!data.user)throw new Error('That reset link is invalid or expired.');return data.user.id;},
 watch(callback:(event:string,id:string|null)=>void){const {data}=supabase.auth.onAuthStateChange((event,session)=>callback(event,session?.user.id??null));return()=>data.subscription.unsubscribe();},
 async update(password:string){if(password.length<8)throw new Error('Use at least 8 characters.');const {error}=await supabase.auth.updateUser({password});if(error)throw new Error('The password was not changed. Try a different password or request a new link.');},
 async logout(){const {error}=await supabase.auth.signOut({scope:'local'});if(error)throw new Error('Your password was updated, but sign out failed. Try signing out again.');clearAllDescriptionDrafts();},
};
export type RecoveryServices=typeof recoveryServices;
