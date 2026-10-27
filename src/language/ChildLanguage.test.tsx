import {it,expect,afterEach,vi} from 'vitest';
import {render,screen,cleanup,act} from '@testing-library/react';
const m=vi.hoisted(()=>({load:vi.fn()}));
vi.mock('../storage',()=>({loadStudentProfile:m.load}));
import {ChildLanguage,StudentLanguage} from './ChildLanguage';
import {useChildWording} from './useChildWording';
function Labels(){const w=useChildWording();return <><h1>{w.modeLabels.nonverbal}</h1><p>{w.hero.join(' ')}</p></>;}
afterEach(()=>{cleanup();vi.resetAllMocks();});
it('updates visible language across all three bands and falls back to plain text',()=>{const view=render(<ChildLanguage profile={{grade:8,reading_level:8}}><Labels/></ChildLanguage>);expect(screen.getByText('Vibe Check')).toBeTruthy();view.rerender(<ChildLanguage profile={{grade:4,reading_level:4}}><Labels/></ChildLanguage>);expect(screen.getByText('People Clues')).toBeTruthy();expect(screen.queryByText(/Big brain/)).toBeNull();view.rerender(<ChildLanguage><Labels/></ChildLanguage>);expect(screen.getByText('Let’s play. Find the clues.')).toBeTruthy();});
it('ignores a late language profile from the previous student',async()=>{let old!:(v:unknown)=>void;m.load.mockReturnValueOnce(new Promise(r=>{old=r;})).mockResolvedValue({grade:1,reading_level:1});const view=render(<StudentLanguage studentId="older"><Labels/></StudentLanguage>);view.rerender(<StudentLanguage studentId="young"><Labels/></StudentLanguage>);await screen.findByText('People Clues');await act(async()=>old({grade:8,reading_level:8}));expect(screen.queryByText('Vibe Check')).toBeNull();});
it('uses plain wording when a profile cannot be loaded',async()=>{m.load.mockRejectedValue(new Error('offline'));render(<StudentLanguage studentId="fake"><Labels/></StudentLanguage>);await act(async()=>{});expect(screen.getByText('People Clues')).toBeTruthy();});
