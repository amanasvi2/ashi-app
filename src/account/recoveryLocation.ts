export const RECOVERY_KEY='ashi_recovery_user_v1';
export function recoveryLocation(location:{pathname:string;hash:string;search:string}){
 const fragment=new URLSearchParams(location.hash.replace(/^#/,''));
 const query=new URLSearchParams(location.search);
 return {route:location.pathname==='/account-recovery',incoming:fragment.get('type')==='recovery',expired:fragment.has('error')||query.has('error')};
}
