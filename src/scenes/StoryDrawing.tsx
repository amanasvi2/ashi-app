import type {StoryVisual} from './liveCatalog';
// Small, authored stage props. These are illustration primitives, not model
// instructions. Only the matching canonical story chooses a stage.
export function StoryProps({visual,beat}:{visual:StoryVisual;beat:number}) {
 const active=beat>0;
 const paper=<rect x="176" y="117" width="62" height="30" rx="3" fill="#fffdf4" stroke="#79987c" strokeWidth="2"/>;
 return <g className={`story-props ${active?'story-props-active':''}`} stroke="#416552" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
  {visual==='message'&&<g><rect x="175" y="65" width="68" height="105" rx="12" fill="#d9e7d2"/><path d="M185 82h40v25h-40z" fill="#fffdf4"/>{active&&<path d="M194 117h39v26h-39z" fill="#edcf8d"/>}</g>}
  {visual==='waiting'&&<><path d="M239 146h48v-32h-48v72m48-40v40" fill="#edcf8d"/><path d="M164 140h64m-55 1v44m45-44v44"/><circle cx="199" cy="131" r="5" fill="#7cad88"/></>}
  {visual==='ball'&&<circle className={active?'story-ball-held':''} cx="277" cy="120" r="20" fill="#edc55f"/>}
  {['test','tap','drawing','plan','music'].includes(visual)&&<><path d="M157 148h108m-100 1v37m92-37v37"/>{<g className={visual==='music'&&beat===2?'story-sheet-away':''}>{paper}{visual==='drawing'?<><path d="m182 137 15-15 14 15 18-14v19h-47z" fill="#8d9e88"/>{beat===2&&<path d="m210 139 20-16v18z" fill="#416552"/>}</>:<path d="M185 125h42m-42 8h30"/>}</g>}
   {visual==='tap'&&<g className={active?'story-pencil-tap':''}><path d="m246 105-13 34" stroke="#bd944c" strokeWidth="7"/></g>}
   {visual==='test'&&active&&<g><path d="M123 74h10m-5-5v10"/>{beat===2&&<path d="M135 50h10m-5-5v10M145 88h10m-5-5v10"/>}</g>}
   {visual==='plan'&&beat===2&&<rect x="191" y="95" width="33" height="18" fill="#f0d99f"/>}
   {visual==='music'&&<path d="M259 70v25m0-25 17-5v24m-17 6c-9-7-14 7-4 7m21-13c-9-7-14 7-4 7" fill="none"/>}
  </>}
  {visual==='welcome'&&<><path d="M194 152h47v-39h-47v73m47-34v34" fill="#edcf8d"/>{active&&<path d="m281 109-32 18" strokeWidth="5"/>}</>}
  {visual==='present'&&<><path d="M188 145h50v40h-50z" fill="#d9e7d2"/><g className={active?'story-hands-shake':''}><circle cx="60" cy="127" r="5" fill="#f5e5c9"/><circle cx="104" cy="127" r="5" fill="#f5e5c9"/></g></>}
  {visual==='library'&&<><rect x="175" y="101" width="69" height="66" rx="3" fill="#d9e7d2"/><path d="M181 109v49m10-49v49m11-49v49m13-49v49m13-49v49"/><circle cx="212" cy="56" r="25" fill="#fffdf4"/><path d="m212 56 18 10m-18-10-11-19"/>{active&&<path d="m177 112-15 18" stroke="#bd944c" strokeWidth="8"/>}</>}
  {visual==='lunch'&&<><g fill="#c4d7b9" stroke="none"><circle cx="163" cy="80" r="12"/><path d="M153 96h20v40h-20z"/><circle cx="199" cy="74" r="12"/><path d="M189 90h20v40h-20z"/></g><path d="M155 147h73m-65 0v35m57-35v35M262 147h40m-35 0v35m30-35v35"/><path d="m160 55-8-12m32 7 6-14m31 17 10-11" stroke="#bd944c"/>{beat===2&&<rect x="250" y="159" width="62" height="32" rx="8" fill="none" strokeDasharray="5 5"/>}</>}
  {visual==='calendar'&&<><rect x="169" y="82" width="86" height="82" rx="8" fill="#fffdf4"/><path d="M169 104h86m-65 8v40m22-40v40m22-40v40m-57-20h68" stroke="#b5c8a8"/>{active&&<path d="m178 114 18 15m0-15-18 15" stroke="#bd944c"/>}{beat===2&&<path d="M230 138q0-9 9-7 8 4-1 10v4m0 5h.1" fill="none"/>}</>}
 </g>;
}
