import {it,expect,afterEach,vi} from 'vitest';
import {render,screen,fireEvent,cleanup} from '@testing-library/react';
const m=vi.hoisted(()=>({generate:vi.fn()}));
vi.mock('./auth',()=>({getSession:async()=>({role:'kid',userId:'fake-child',username:'Player'}),signOut:async()=>{}}));
vi.mock('./supabase',()=>({supabase:{}}));
vi.mock('./generateItems',()=>({generateItems:m.generate}));
vi.mock('./storage',async original=>({...await original<typeof import('./storage')>(),loadLevelSlice:async()=>({levels:{social:3,nonverbal:3,inference:3},streaks:{social:{correct:0,incorrect:0},nonverbal:{correct:0,incorrect:0},inference:{correct:0,incorrect:0}},pending:{social:null,nonverbal:null,inference:null}}),loadDifficulty:async()=>({social:1,nonverbal:1,inference:1}),loadSessions:async()=>[],loadConfig:async()=>({dailyMinimum:1}),loadCoins:async()=>({balance:0,totalEarned:0,hintTokens:0}),journalWrittenToday:async()=>false,loadStudentProfile:async()=>null,loadInterests:async()=>[],saveLevelSlice:async()=>{},pickSessionCount:()=>5}));
import App from './App';
import {ITEMS} from './items';
afterEach(()=>{cleanup();vi.clearAllMocks();});
it('opens real practice from the child home and requests animated stories by default',async()=>{
 m.generate.mockResolvedValue([ITEMS[0]]);render(<App/>);await screen.findByRole('button',{name:'Story pictures'});
 fireEvent.click(screen.getByRole('button',{name:/^Friends/}));await screen.findByRole('region',{name:'Story scene'});
 expect(m.generate).toHaveBeenCalledWith('social',{social:1,nonverbal:1,inference:1},{social:3,nonverbal:3,inference:3},5,[],'animated');
 expect(await screen.findByRole('button',{name:/both friends need the same scissors/})).toBeTruthy();
});
it('carries the text format through home, App and practice without attaching a scene',async()=>{
 m.generate.mockResolvedValue([ITEMS[0]]);render(<App/>);await screen.findByRole('button',{name:'New stories'});
 fireEvent.click(screen.getByRole('button',{name:'New stories'}));fireEvent.click(screen.getByRole('button',{name:/^Friends/}));
 await screen.findByRole('button',{name:/both friends need the same scissors/});expect(screen.queryByRole('region',{name:'Story scene'})).toBeNull();expect(m.generate.mock.calls[0][5]).toBe('text');
});
