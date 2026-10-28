import {afterEach,it,expect,vi} from 'vitest';
import {render,screen,cleanup} from '@testing-library/react';
vi.mock('../auth',()=>({getSession:async()=>null,signOut:vi.fn(),signInKid:vi.fn(),signInParent:vi.fn(),signUpOwner:vi.fn()}));
vi.mock('../supabase',()=>({supabase:{}}));
import App from '../App';
afterEach(()=>{cleanup();window.history.replaceState({},'','/');});
it('shows the public landing page when signed out',async()=>{window.history.replaceState({},'','/');render(<App/>);await screen.findByRole('link',{name:/Try the demo/});expect(screen.queryByLabelText('Username')).toBeNull();});
it('keeps the existing account login directly reachable',async()=>{window.history.replaceState({},'','/login');render(<App/>);await screen.findByLabelText('Username');expect(screen.queryByRole('link',{name:/Try the demo/})).toBeNull();});
