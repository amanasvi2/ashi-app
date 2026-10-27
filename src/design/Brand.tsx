export function Brand({small=false}:{small?:boolean}) {
  return <span className={`ashi-brand ${small?'ashi-brand-small':''}`}><svg aria-hidden="true" viewBox="0 0 40 40" fill="none"><path d="M20 31V19M20 22C9 23 6 15 8 8c8-1 14 4 12 14ZM20 25c0-10 5-15 13-14 2 8-3 15-13 14Z" fill="currentColor"/><path d="M14 34h13" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/></svg><span>ashi<span className="brand-dot">.</span></span></span>;
}
export function JourneyIllustration(){
 return <svg className="journey-illustration" viewBox="0 0 560 260" fill="none" role="img" aria-label="A path connecting noticing a clue, practicing a response, and everyday life">
  <path d="M62 158C127 240 185 59 269 137c66 61 119 73 216-28" stroke="var(--color-rule)" strokeWidth="3" strokeDasharray="7 8"/>
  <circle cx="79" cy="155" r="52" fill="var(--color-soft-green)"/><circle cx="283" cy="123" r="59" fill="var(--color-soft-peach)"/><circle cx="476" cy="96" r="47" fill="var(--color-soft-gold)"/>
  <rect x="45" y="130" width="67" height="43" rx="16" fill="var(--color-surface)" stroke="var(--color-accent)" strokeWidth="2"/><path d="m57 169-5 15 20-11" fill="var(--color-surface)" stroke="var(--color-accent)" strokeWidth="2"/><circle cx="64" cy="152" r="3" fill="var(--color-accent)"/><circle cx="79" cy="152" r="3" fill="var(--color-accent)"/><circle cx="94" cy="152" r="3" fill="var(--color-accent)"/>
  <path d="M263 123c-13-18 5-33 20-17 15-16 33-1 20 17l-20 21-20-21Z" fill="var(--color-accent)"/>
  <path d="M458 98v-9m12 15V76m12 29V84m12 15V90m-36 8c0 28 36 28 36 1" stroke="var(--color-accent)" strokeWidth="4" strokeLinecap="round"/>
  <text x="79" y="235" textAnchor="middle" fill="var(--color-ink)" fontSize="14" fontWeight="600">Notice a clue</text><text x="283" y="223" textAnchor="middle" fill="var(--color-ink)" fontSize="14" fontWeight="600">Try a response</text><text x="476" y="191" textAnchor="middle" fill="var(--color-ink)" fontSize="14" fontWeight="600">Take it into your day</text>
 </svg>;
}
