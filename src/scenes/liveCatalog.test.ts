import {it,expect} from 'vitest';
import {ITEMS} from '../items';
import {selectAnimatedItems} from './liveCatalog';
import {sceneForItem} from './catalog';
import {isValidItem} from '../itemValidation';
import type {Difficulty,ItemType,SupportLevel} from '../types';
it('has a faithful three-picture scene for every item in the live library',()=>{
 expect(ITEMS).toHaveLength(15);
 for(const item of ITEMS){const scene=sceneForItem(item);expect(scene,item.id).toBeTruthy();expect(scene!.beats).toHaveLength(3);if(scene!.speech)expect(item.scenario,item.id).toContain(scene!.speech);}
});
it('covers every adaptive type and difficulty without relabeling stories',()=>{
 for(const type of ['social','nonverbal','inference'] as ItemType[])for(const difficulty of [1,2,3] as Difficulty[]){
  const items=selectAnimatedItems(Array.from({length:5},()=>({type,difficulty})));
  expect(items.length).toBeGreaterThan(0);expect(new Set(items.map(i=>i.id)).size).toBe(items.length);
  for(const item of items){expect(item.type).toBe(type);expect(item.difficulty).toBe(difficulty);for(const level of [0,1,2,3] as SupportLevel[])expect(isValidItem(item,{social:level,nonverbal:level,inference:level},{[type]:difficulty})).toBe(true);}
 }
});
it('does not duplicate a hard item to pad a round or serve a paused skill',()=>{
 expect(selectAnimatedItems(Array.from({length:5},()=>({type:'social',difficulty:3})))).toHaveLength(1);
 expect(selectAnimatedItems([{type:'social',difficulty:1},{type:'inference',difficulty:1}],{social:true}).every(i=>i.type==='inference')).toBe(true);
 expect(selectAnimatedItems([{type:'social',difficulty:1}],{social:true})).toEqual([]);
});
