import {afterEach,it,expect} from 'vitest';
import {render,cleanup,screen} from '@testing-library/react';
import {Landing} from './Landing';
afterEach(cleanup);
it('keeps the landing copy brief and free of dashes and hyphens',()=>{const {container}=render(<Landing/>);const text=container.textContent??'';expect(text).not.toMatch(/[—–-]/);expect(text.trim().split(/\s+/).length).toBeLessThan(370);expect(screen.getByRole('heading',{level:1}).textContent).toContain('Practice people skills.');expect(screen.getByRole('link',{name:'Try the demo'}).getAttribute('href')).toBe('/demo');});
