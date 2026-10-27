import {readdir,readFile} from 'node:fs/promises';
async function files(dir){const entries=await readdir(dir,{withFileTypes:true});return (await Promise.all(entries.map(e=>e.isDirectory()?files(`${dir}/${e.name}`):[`${dir}/${e.name}`]))).flat();}
const content=(await Promise.all((await files('dist')).map(p=>readFile(p,'utf8')))).join('\n');
const checks={childDesignIncluded:content.includes('Pick your play'),developmentFixturesExcluded:!['DESIGN PREVIEW','FAKE-DATA DEMO','kid-play-preview'].some(marker=>content.includes(marker))};
console.log(JSON.stringify(checks,null,2));
if(Object.values(checks).some(ok=>!ok))process.exitCode=1;
