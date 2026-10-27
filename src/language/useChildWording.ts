import {createContext,useContext} from 'react';
import {childWording} from './wording';
export const ChildWordingContext=createContext(childWording());
export function useChildWording(){return useContext(ChildWordingContext);}
