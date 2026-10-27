import type { SessionMode } from '../types';
export type LanguageProfile = {grade?:number|null;reading_level?:number|null}|null|undefined;
export type WordingBand = 'early'|'middle'|'older';
// Grade is a context proxy, not a claim about chronological age or ability.
// Missing profiles always get plain wording. Reading needs can simplify labels
// without changing the child's age-appropriate situations or adaptive support.
export function wordingBand(profile:LanguageProfile):WordingBand {
 const grade=profile?.grade;
 if(typeof grade!=='number'||!Number.isInteger(grade)||grade<0||grade>12)return 'early';
 const reading=profile?.reading_level;
 const level=typeof reading==='number'&&Number.isFinite(reading)&&reading>=0&&reading<=13?Math.min(grade,reading):grade;
 return level<=2?'early':level<=5?'middle':'older';
}
const modes:SessionMode[]=['mixed','social','nonverbal','inference'];
const titles={early:['Play All','Friends','People Clues','Story Clues'],middle:['Mix It Up','Social Quest','People Clues','Hidden Meaning'],older:['Remix','Squad Quest','Vibe Check','Plot Twist']};
export function childWording(profile?:LanguageProfile){
 const band=wordingBand(profile);const early=band==='early';const older=band==='older';
 const modeLabels=Object.fromEntries(modes.map((mode,i)=>[mode,titles[band][i]])) as Record<SessionMode,string>;
 return {band,modeLabels,games:modes.map((mode,i)=>({mode,title:titles[band][i],hint:(early?['Try each game','What could you do?','Look for clues','What might happen?']:['A bit of everything','Pick your next move','Spot the clues','Find the hidden meaning'])[i]})),hero:older?['Big brain.','Small quests.']:early?['Let’s play.','Find the clues.']:['Small games.','Big discoveries.'],intro:early?'Pick a game. Try it out.':'Pick a game. Find your next move.',subtitle:early?'Find clues. Try new things.':'4 ways to build your skills',daily:early?'Today’s play goal':'Today’s mini quest',complete:early?'You did it!':'Quest complete!',labLabels:{unfamiliar:early?'New stories':'New moves',repair:'Fix a mix-up',interpretations:early?'Word clues':'Plot twists',tone:older?'Vibe check':'People clues'}};
}
export function languagePrompt(profile:LanguageProfile):string {
 const grade=profile?.grade;
 const validGrade=typeof grade==='number'&&Number.isInteger(grade)&&grade>=0&&grade<=12;
 const reading=profile?.reading_level;
 const validReading=typeof reading==='number'&&Number.isFinite(reading)&&reading>=0&&reading<=13;
 const contexts=!validGrade?'everyday activities, home, sharing materials and asking for help':grade<=2?'early elementary activities, home, play, taking turns and asking for help':grade<=5?'elementary school activities, home, group work and friendships':'age-respectful secondary school, home, friendships and group activities';
 return `Use ${contexts}. ${validGrade?`The confirmed school grade is ${grade}; this is not the student's exact age.`:'The age and grade are unknown; do not assume the student is a teenager.'} ${validReading?`Use vocabulary at or below reading grade ${reading}.`:'Use short, concrete sentences and familiar words.'} ${wordingBand(profile)==='older'?'Explain unfamiliar slang instead of assuming the student knows it.':'Avoid slang, internet expressions and unexplained idioms.'} Keep topics respectful of school grade even if reading level is lower. Do not assume gender or diagnosis. Reading level and adaptive difficulty are separate.`;
}
