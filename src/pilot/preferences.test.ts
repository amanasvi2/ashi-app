import {it,expect} from 'vitest';
import {validateLearningPreferences} from './preferences';
const valid={grade:4,reading_level:2.5,interests:[' blocks ','blocks','drawing'],plainLanguage:true};
it('validates and normalizes a minimal learning update',()=>expect(validateLearningPreferences(valid)).toEqual({...valid,interests:['blocks','drawing']}));
it.each([{grade:-1},{grade:13},{grade:1.5},{reading_level:NaN},{reading_level:14},{plainLanguage:'true'},{interests:[]},{interests:['x'.repeat(41)]},{interests:[{},'blocks']},{interests:Array(9).fill('blocks')}])('rejects invalid or oversized preferences %j',patch=>expect(()=>validateLearningPreferences({...valid,...patch})).toThrow());
it('returns only allowed fields',()=>expect(validateLearningPreferences({...valid,owner_id:'other',levels:{social:0}})).not.toHaveProperty('owner_id'));
