export const PLAIN_LANGUAGE_SUPPORT='plain_language';
export interface LearningPreferences {grade:number;reading_level:number;interests:string[];plainLanguage:boolean}
export function validateLearningPreferences(value:unknown):LearningPreferences{
 if(!value||typeof value!=='object')throw new Error('Learning preferences are required.');
 const v=value as Record<string,unknown>;
 if(typeof v.grade!=='number'||!Number.isInteger(v.grade)||v.grade<0||v.grade>12)throw new Error('Choose a school grade from K to 12.');
 if(typeof v.reading_level!=='number'||!Number.isFinite(v.reading_level)||v.reading_level<0||v.reading_level>13)throw new Error('Reading grade must be between 0 and 13.');
 if(typeof v.plainLanguage!=='boolean')throw new Error('Choose a wording preference.');
 if(!Array.isArray(v.interests)||v.interests.length<1||v.interests.length>8||v.interests.some(x=>typeof x!=='string'||!x.trim()||x.trim().length>40))throw new Error('Add 1–8 interests, each up to 40 characters.');
 return {grade:v.grade,reading_level:v.reading_level,plainLanguage:v.plainLanguage,interests:[...new Set((v.interests as string[]).map(x=>x.trim()))]};
}
