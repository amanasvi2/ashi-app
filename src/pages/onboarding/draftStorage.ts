// Raw school/IEP descriptions stay in this tab, scoped to the signed-in
// owner. Never restore a shared, persistent draft into a different account.
const LEGACY_KEY='ashi_intake_description_v1';
const PREFIX='ashi_intake_description_v2:';
export function clearLegacyDescriptionDraft():void {
 try{localStorage.removeItem(LEGACY_KEY);sessionStorage.removeItem(LEGACY_KEY);}catch{/* storage unavailable */}
}
export function saveDescriptionDraft(text:string,ownerId?:string):void {
 clearLegacyDescriptionDraft();if(!ownerId)return;
 try{sessionStorage.setItem(PREFIX+ownerId,text);}catch{/* storage unavailable */}
}
export function loadDescriptionDraft(ownerId?:string):string {
 clearLegacyDescriptionDraft();if(!ownerId)return '';
 try{return sessionStorage.getItem(PREFIX+ownerId)??'';}catch{return '';}
}
export function clearDescriptionDraft(ownerId?:string):void {
 clearLegacyDescriptionDraft();if(!ownerId)return;
 try{sessionStorage.removeItem(PREFIX+ownerId);}catch{/* storage unavailable */}
}
export function clearAllDescriptionDrafts():void {
 clearLegacyDescriptionDraft();try{for(let i=sessionStorage.length-1;i>=0;i--){const key=sessionStorage.key(i);if(key?.startsWith(PREFIX))sessionStorage.removeItem(key);}}catch{/* storage unavailable */}
}
