import {useEffect,useState,type ReactNode} from 'react';
import {loadStudentProfile} from '../storage';
import {childWording,type LanguageProfile} from './wording';
import {ChildWordingContext as Context} from './useChildWording';
export function ChildLanguage({profile,children}:{profile?:LanguageProfile;children:ReactNode}){return <Context.Provider value={childWording(profile)}>{children}</Context.Provider>;}
export function StudentLanguage({studentId,children}:{studentId:string;children:ReactNode}){
 const [loaded,setLoaded]=useState<{id:string;profile:LanguageProfile}|null>(null);
 useEffect(()=>{let active=true;loadStudentProfile(studentId).then(profile=>{if(active)setLoaded({id:studentId,profile});}).catch(()=>{if(active)setLoaded({id:studentId,profile:null});});return()=>{active=false;};},[studentId]);
 return <ChildLanguage profile={loaded?.id===studentId?loaded.profile:null}>{children}</ChildLanguage>;
}
