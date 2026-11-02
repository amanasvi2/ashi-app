import {it,expect,vi,afterEach} from 'vitest';
import {render,screen,cleanup} from '@testing-library/react';
vi.mock('./RecoveryPage',()=>({RecoveryPage:({incoming,expired}:{incoming?:boolean;expired?:boolean})=><p>Recovery {String(!!incoming)} {String(!!expired)}</p>}));
vi.mock('../App',()=>({default:()=> <p>Normal app</p>}));
import {Entry} from '../Entry';
afterEach(()=>{cleanup();window.history.replaceState({},'','/');});
it('routes an emailed recovery fragment on the home URL to recovery before loading the app',async()=>{window.history.replaceState({},'','/#type=recovery&access_token=synthetic');render(<Entry/>);await screen.findByText('Recovery true false');expect(screen.queryByText('Normal app')).toBeNull();});
it('routes a refreshed recovery URL to recovery',async()=>{window.history.replaceState({},'','/account-recovery');render(<Entry/>);await screen.findByText('Recovery false false');});
it('routes expired root links to a safe new-request screen',async()=>{window.history.replaceState({},'','/#error=access_denied&error_code=otp_expired');render(<Entry/>);await screen.findByText('Recovery false true');});
