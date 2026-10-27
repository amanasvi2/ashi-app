import {ChildLanguage} from '../language/ChildLanguage';
import { afterEach,beforeEach,it,expect,vi } from 'vitest';
import { render,screen,fireEvent,cleanup,waitFor,act } from '@testing-library/react';
const m=vi.hoisted(()=>({loadSessions:vi.fn(),loadLevelSlice:vi.fn(),loadLevelSliceForDisplay:vi.fn(),loadDifficulty:vi.fn(),loadCoins:vi.fn(),loadConfig:vi.fn(),loadCustomRewards:vi.fn(),loadInterests:vi.fn(),saveInterests:vi.fn(),updateKidGender:vi.fn(),loadJournalEntries:vi.fn(),todaysJournalEntry:vi.fn(),saveJournalEntry:vi.fn(),journalWrittenToday:vi.fn(),loadFloorAlarms:vi.fn(),parentJournalWrittenToday:vi.fn(),parentJournalActivity:vi.fn(),loadStudentProfile:vi.fn(),loadConversationSessions:vi.fn(),loadConversationEscalation:vi.fn(),saveConfig:vi.fn(),addCustomReward:vi.fn(),deleteCustomReward:vi.fn()}));
vi.mock('../auth',()=>({getSession:async()=>({role:'kid',userId:'fake-child',username:'fake'}),signOut:async()=>{},signInKid:vi.fn(),signInParent:vi.fn(),signUpOwner:vi.fn()}));
vi.mock('../supabase',()=>({supabase:{}}));
vi.mock('../storage',async importOriginal=>({...await importOriginal<typeof import('../storage')>(),...m}));
import { Home } from './Home';
import { ProgressPage } from './ProgressPage';
import { Journal } from './Journal';
import { ProfilePanel } from './ProfilePanel';
import App from '../App';
import { ParentDashboard } from './ParentDashboard';
import { StudentRoster } from './StudentRoster';
import type { StudentSummary } from '../students';
const levels={levels:{social:3,nonverbal:2,inference:0},streaks:{social:{correct:0,incorrect:0},nonverbal:{correct:0,incorrect:0},inference:{correct:0,incorrect:0}},pending:{social:null,nonverbal:null,inference:null}};
beforeEach(()=>{vi.resetAllMocks();m.loadSessions.mockResolvedValue([]);m.loadLevelSlice.mockResolvedValue(levels);m.loadLevelSliceForDisplay.mockResolvedValue(levels);m.loadDifficulty.mockResolvedValue({social:1,nonverbal:2,inference:3});m.loadCoins.mockResolvedValue({balance:30,totalEarned:50,hintTokens:2});m.loadConfig.mockResolvedValue({dailyMinimum:1});m.loadCustomRewards.mockResolvedValue([]);m.loadInterests.mockResolvedValue([]);m.loadJournalEntries.mockResolvedValue([]);m.todaysJournalEntry.mockResolvedValue(null);m.journalWrittenToday.mockResolvedValue(false);m.loadFloorAlarms.mockResolvedValue({social:false,nonverbal:false,inference:false});m.saveJournalEntry.mockResolvedValue(undefined);m.parentJournalWrittenToday.mockResolvedValue(true);m.parentJournalActivity.mockResolvedValue([]);m.loadStudentProfile.mockResolvedValue(null);m.loadConversationSessions.mockResolvedValue([]);m.loadConversationEscalation.mockResolvedValue(false);m.saveConfig.mockResolvedValue(undefined);m.saveInterests.mockResolvedValue(undefined);m.updateKidGender.mockResolvedValue(undefined);m.addCustomReward.mockImplementation(async(_id,r)=>({...r,id:'fake-reward'}));m.deleteCustomReward.mockResolvedValue(undefined);});
afterEach(cleanup);
it('opens all four practice modes from the student home',async()=>{
 const start=vi.fn();render(<Home username="fake" onStart={start} onConversation={()=>{}} onLogout={()=>{}} onOpenProfile={()=>{}} onCarryover={()=>{}}/>);
 await screen.findByText('Play All');for(const name of ['Play All','Friends','People Clues','Story Clues'])fireEvent.click(screen.getByRole('button',{name:new RegExp('^'+name)}));
 expect(new Set(start.mock.calls.map(c=>c[0])).size).toBe(4);
});
it('opens conversation and carryover from home',async()=>{const conversation=vi.fn(),carryover=vi.fn();render(<Home username="fake" onStart={()=>{}} onConversation={conversation} onLogout={()=>{}} onOpenProfile={()=>{}} onCarryover={carryover}/>);await screen.findByText('Play All');fireEvent.click(screen.getByRole('button',{name:/Chat with Alex/}));fireEvent.click(screen.getByRole('button',{name:/Quick Play/}));expect(conversation).toHaveBeenCalled();expect(carryover).toHaveBeenCalled();});
it('shows an empty progress page without inventing sessions',async()=>{render(<ProgressPage/>);await screen.findByRole('heading',{name:'Your Progress'});expect(screen.getByText(/No practice sessions yet/i)).toBeTruthy();});
it('shows stored session scores and mode on progress',async()=>{m.loadSessions.mockResolvedValue([{id:'session',date:new Date().toISOString(),mode:'inference',score:3,maxScore:4,itemCount:4,endedBy:'completed',levelSnapshot:levels.levels,difficultySnapshot:{social:1,nonverbal:2,inference:3}}]);render(<ProgressPage/>);await screen.findByRole('heading',{name:'Recent sessions'});expect(screen.getByText('3 / 4')).toBeTruthy();});
it('can choose a journal mood, request a prompt, and save writing',async()=>{render(<Journal onBack={()=>{}}/>);const input=await screen.findByPlaceholderText('Write anything you want here…');fireEvent.click(screen.getByRole('button',{name:'Need a prompt?'}));fireEvent.change(input,{target:{value:'Today I asked for more time.'}});fireEvent.click(screen.getByRole('button',{name:'Happy'}));fireEvent.click(screen.getByRole('button',{name:'Save'}));await screen.findByRole('button',{name:'Saved'});expect(m.saveJournalEntry).toHaveBeenCalledWith(expect.objectContaining({mood:'happy',content:'Today I asked for more time.'}));});
it('keeps journal writing and shows an error if saving fails',async()=>{m.saveJournalEntry.mockRejectedValue(new Error('Offline'));render(<Journal onBack={()=>{}}/>);const input=await screen.findByPlaceholderText('Write anything you want here…');fireEvent.change(input,{target:{value:'My unsaved writing'}});fireEvent.click(screen.getByRole('button',{name:'Save'}));await screen.findByRole('alert');expect((input as HTMLTextAreaElement).value).toBe('My unsaved writing');expect(screen.queryByRole('button',{name:'Saved'})).toBeNull();});
it('does not allow an empty journal save and can go back',async()=>{const back=vi.fn();render(<Journal onBack={back}/>);await screen.findByPlaceholderText('Write anything you want here…');expect((screen.getByRole('button',{name:'Save'}) as HTMLButtonElement).disabled).toBe(true);fireEvent.click(screen.getByRole('button',{name:'Back'}));expect(back).toHaveBeenCalled();});
it('shows past journal entries and allows expanding them',async()=>{m.loadJournalEntries.mockResolvedValue([{id:'past',date:new Date(Date.now()-86400000).toISOString(),mood:'calm',content:'Fictional yesterday entry'}]);render(<Journal onBack={()=>{}}/>);await screen.findByRole('heading',{name:'Past entries'});fireEvent.click(screen.getByText('Fictional yesterday entry'));expect(screen.getByText('Fictional yesterday entry')).toBeTruthy();});
it('changes profile interests, partner preference and signs out',async()=>{const close=vi.fn(),logout=vi.fn();render(<ProfilePanel username="fake" onClose={close} onLogout={logout}/>);fireEvent.click(await screen.findByRole('button',{name:'Boy'}));await waitFor(()=>expect(m.updateKidGender).toHaveBeenCalledWith('boy'));fireEvent.click(screen.getByRole('button',{name:'Art'}));await waitFor(()=>expect(m.saveInterests).toHaveBeenCalledWith(['art']));fireEvent.click(screen.getByRole('button',{name:'Sign out'}));expect(close).toHaveBeenCalled();expect(logout).toHaveBeenCalled();});
it('lets a clinician select a student and add another',async()=>{const select=vi.fn(),add=vi.fn();const students=[{id:'fake-a',displayName:'Fake A',username:'fake-a'},{id:'fake-b',displayName:'Fake B',username:'fake-b'}] as StudentSummary[];render(<StudentRoster students={students} incompleteProfile={null} canAddStudent onSelectStudent={select} onAddStudent={add} onFinishSetup={()=>{}} onLogout={()=>{}}/>);await screen.findByRole('heading',{name:'2 students'});fireEvent.click(screen.getByRole('button',{name:/Fake A/i}));expect(select).toHaveBeenCalledWith('fake-a');fireEvent.click(screen.getByRole('button',{name:/Add a student/i}));expect(add).toHaveBeenCalled();expect(m.loadSessions).toHaveBeenCalledWith('fake-a');expect(m.loadSessions).toHaveBeenCalledWith('fake-b');});

const student={id:'fake-a',username:'fake-a',displayName:'Fake A'};
it('saves a daily goal for the selected child only',async()=>{render(<ParentDashboard student={student} onLogout={()=>{}}/>);fireEvent.click(await screen.findByRole('button',{name:'2 sessions'}));await waitFor(()=>expect(m.saveConfig).toHaveBeenCalledWith({dailyMinimum:2},'fake-a'));});
it('adds and deletes a simulated video reward',async()=>{render(<ParentDashboard student={student} onLogout={()=>{}}/>);fireEvent.click(await screen.findByRole('button',{name:'+ Add a video reward'}));fireEvent.change(screen.getByPlaceholderText('Reward name'),{target:{value:'Fake reward'}});fireEvent.change(screen.getByPlaceholderText('YouTube URL'),{target:{value:'https://www.youtube.com/watch?v=fake-qa'}});fireEvent.click(screen.getByRole('button',{name:'Add reward'}));await screen.findByText('Fake reward');expect(m.addCustomReward).toHaveBeenCalledWith('fake-a',expect.objectContaining({label:'Fake reward',cost:50}));fireEvent.click(screen.getByRole('button',{name:'Delete reward Fake reward'}));await waitFor(()=>expect(screen.queryByText('Fake reward')).toBeNull());});
it('refuses an invalid reward URL instead of creating a broken link',async()=>{render(<ParentDashboard student={student} onLogout={()=>{}}/>);fireEvent.click(await screen.findByRole('button',{name:'+ Add a video reward'}));fireEvent.change(screen.getByPlaceholderText('Reward name'),{target:{value:'Bad URL'}});fireEvent.change(screen.getByPlaceholderText('YouTube URL'),{target:{value:'not a URL'}});fireEvent.click(screen.getByRole('button',{name:'Add reward'}));await screen.findByRole('alert');expect(m.addCustomReward).not.toHaveBeenCalled();});
it('shows an unsuccessful daily-goal save without pretending success',async()=>{m.saveConfig.mockRejectedValue(new Error('Denied'));render(<ParentDashboard student={student} onLogout={()=>{}}/>);fireEvent.click(await screen.findByRole('button',{name:'2 sessions'}));await screen.findByText('The daily goal was not saved. Please try again.');});
it('keeps journal contents out of the parent dashboard',async()=>{render(<ParentDashboard student={student} onLogout={()=>{}}/>);await screen.findByText("Fake A's Progress");expect(m.loadJournalEntries).not.toHaveBeenCalled();expect(screen.getByText(/Journal content is private/)).toBeTruthy();expect(m.parentJournalActivity).toHaveBeenCalledWith('fake-a',7);});
it('shows and expands simulated conversation history',async()=>{m.loadConversationSessions.mockResolvedValue([{id:'chat',topic:'games',startedAt:new Date().toISOString(),turnCount:1,endedReason:'turn_cap',transcript:[{role:'assistant',content:'Fictional partner message'},{role:'user',content:'Fictional child reply'}]}]);render(<ParentDashboard student={student} onLogout={()=>{}}/>);fireEvent.click(await screen.findByRole('button',{name:/Games.*exchange/}));await screen.findByText(/Fictional child reply/);});
it('reports a rejected profile preference save',async()=>{m.updateKidGender.mockRejectedValue(new Error('Denied'));render(<ProfilePanel username="fake" onClose={()=>{}} onLogout={()=>{}}/>);fireEvent.click(await screen.findByRole('button',{name:'Boy'}));await screen.findByRole('alert');});

it('walks the actual student app navigation, journal, profile and sign out with a simulated session',async()=>{
 render(<App/>);await screen.findByText('Play All');
 fireEvent.click(screen.getAllByRole('button',{name:'Progress'})[0]);await screen.findByRole('heading',{name:'Your Progress'});
 fireEvent.click(screen.getAllByRole('button',{name:'Rewards'})[0]);await screen.findByRole('heading',{name:'Rewards'});
 fireEvent.click(screen.getAllByRole('button',{name:'Home'})[0]);await screen.findByText('Play All');
 fireEvent.click(screen.getByRole('button',{name:'Open your journal'}));await screen.findByRole('heading',{name:'Your Journal'});
 fireEvent.click(screen.getByRole('button',{name:'Back'}));await screen.findByText('Play All');
 fireEvent.click(screen.getAllByRole('button',{name:'Open profile'})[0]);await screen.findByRole('heading',{name:'Profile & Settings'});
 fireEvent.click(screen.getByRole('button',{name:'Sign out'}));await screen.findByLabelText('Username');
});
it('ignores a late dashboard response from a previous child',async()=>{
 let finishOld!:(value:unknown[])=>void;
 m.loadSessions.mockReturnValueOnce(new Promise(r=>{finishOld=r;})).mockResolvedValue([]);
 const view=render(<ParentDashboard student={student} onLogout={()=>{}}/>);
 view.rerender(<ParentDashboard student={{...student,id:'fake-b',displayName:'Fake B'}} onLogout={()=>{}}/>);
 await screen.findByText("Fake B's Progress");
 await act(async()=>finishOld([{id:'old',date:new Date().toISOString(),mode:'social',score:9,maxScore:9,itemCount:9}]));
 await waitFor(()=>expect(screen.queryByText('9 / 9')).toBeNull());
 expect(screen.getByText("Fake B's Progress")).toBeTruthy();
});

it.each(['home','progress','journal','profile','roster','parent'])('shows recovery instead of an endless spinner when %s cannot load',async page=>{
 m.loadCoins.mockRejectedValue(new Error('Offline'));m.loadConfig.mockRejectedValue(new Error('Offline'));m.loadJournalEntries.mockRejectedValue(new Error('Offline'));m.loadSessions.mockRejectedValue(new Error('Offline'));
 if(page==='home')render(<Home username="fake" onStart={()=>{}} onConversation={()=>{}} onLogout={()=>{}} onOpenProfile={()=>{}}/>);
 if(page==='progress')render(<ProgressPage/>);
 if(page==='journal')render(<Journal onBack={()=>{}}/>);
 if(page==='profile')render(<ProfilePanel username="fake" onClose={()=>{}} onLogout={()=>{}}/>);
 if(page==='roster')render(<StudentRoster students={[student]} incompleteProfile={null} canAddStudent onSelectStudent={()=>{}} onAddStudent={()=>{}} onFinishSetup={()=>{}} onLogout={()=>{}}/>);
 if(page==='parent')render(<ParentDashboard student={student} onLogout={()=>{}}/>);
 await screen.findByRole('alert');expect(screen.getByRole('button',{name:'Reload ASHI'})).toBeTruthy();
});

it('ignores a reward save that finishes after switching children',async()=>{
 let finish!:(value:unknown)=>void;m.addCustomReward.mockReturnValue(new Promise(r=>{finish=r;}));
 const view=render(<ParentDashboard student={student} onLogout={()=>{}}/>);
 fireEvent.click(await screen.findByRole('button',{name:'+ Add a video reward'}));
 fireEvent.change(screen.getByPlaceholderText('Reward name'),{target:{value:'Old child reward'}});
 fireEvent.change(screen.getByPlaceholderText('YouTube URL'),{target:{value:'https://youtu.be/fake'}});
 fireEvent.click(screen.getByRole('button',{name:'Add reward'}));
 view.rerender(<ParentDashboard student={{...student,id:'fake-b',displayName:'Fake B'}} onLogout={()=>{}}/>);
 await screen.findByText("Fake B's Progress");
 await act(async()=>finish({id:'old',label:'Old child reward',emoji:'*',url:'https://youtu.be/fake',cost:50}));
 await waitFor(()=>expect(screen.queryByText('Old child reward')).toBeNull());
 expect(m.addCustomReward).toHaveBeenCalledWith('fake-a',expect.objectContaining({label:'Old child reward'}));
});
it('prevents overlapping daily-goal saves and ignores stale completion after a switch',async()=>{
 let finish!:()=>void;m.saveConfig.mockReturnValue(new Promise<void>(r=>{finish=r;}));
 const view=render(<ParentDashboard student={student} onLogout={()=>{}}/>);
 fireEvent.click(await screen.findByRole('button',{name:'2 sessions'}));
 expect((screen.getByRole('button',{name:'3 sessions'}) as HTMLButtonElement).disabled).toBe(true);
 view.rerender(<ParentDashboard student={{...student,id:'fake-b',displayName:'Fake B'}} onLogout={()=>{}}/>);
 await screen.findByText("Fake B's Progress");await act(async()=>finish());
 await waitFor(()=>expect(screen.getByRole('button',{name:'1 session'}).getAttribute('aria-pressed')).toBe('true'));
 expect(m.saveConfig).toHaveBeenCalledTimes(1);
});
it('shows an error when a reward deletion fails and keeps the reward visible',async()=>{
 m.loadCustomRewards.mockResolvedValue([{id:'fake-reward',label:'Keep me',emoji:'*',url:'https://youtu.be/fake',cost:25}]);m.deleteCustomReward.mockRejectedValue(new Error('denied'));
 render(<ParentDashboard student={student} onLogout={()=>{}}/>);fireEvent.click(await screen.findByRole('button',{name:'Delete reward Keep me'}));
 await screen.findByText('The reward was not deleted. Please try again.');expect(screen.getByText('Keep me')).toBeTruthy();
});

it.each([[1,'People Clues'],[8,'Vibe Check']] as const)('uses grade %i wording in the child progress screen',async(grade,label)=>{render(<ChildLanguage profile={{grade,reading_level:grade}}><ProgressPage/></ChildLanguage>);await screen.findByRole('heading',{name:'Your Progress'});expect(screen.getByText(label)).toBeTruthy();expect(screen.queryByText('Nonverbal Cues')).toBeNull();});
