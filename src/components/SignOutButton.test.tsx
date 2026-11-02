import {it,expect,vi,afterEach} from 'vitest';
import {render,screen,fireEvent,cleanup} from '@testing-library/react';
import {SignOutButton} from './SignOutButton';
afterEach(cleanup);
it('shows a failed sign out and allows retry without claiming success',async()=>{const out=vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(undefined);render(<SignOutButton onSignOut={out}/>);fireEvent.click(screen.getByRole('button',{name:'Log out'}));await screen.findByRole('alert');fireEvent.click(screen.getByRole('button',{name:'Log out'}));await vi.waitFor(()=>expect(out).toHaveBeenCalledTimes(2));});
