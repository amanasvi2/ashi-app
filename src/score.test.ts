import {it,expect,vi} from 'vitest';
vi.mock('./api',()=>({callApi:vi.fn()}));
import {callApi} from './api';
import {evaluateFreeText} from './score';
it('does not turn a failed evaluator into a keyword-based grade',async()=>{vi.mocked(callApi).mockRejectedValueOnce(new Error('offline'));await expect(evaluateFreeText('I do not want to play','I want to play','scene','question')).rejects.toThrow('has not been scored');});
it('rejects malformed evaluation instead of storing a false grade',async()=>{vi.mocked(callApi).mockResolvedValueOnce({result:'maybe',feedback:''});await expect(evaluateFreeText('ask for help','ask','scene','question')).rejects.toThrow('has not been scored');});
