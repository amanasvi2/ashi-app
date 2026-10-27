// Compile the server dependency graph, then execute it as strict Node ESM.
// Vite/Vitest resolve extensionless imports that a deployed function cannot.
import ts from 'typescript';
import { readdir,mkdtemp,writeFile,readFile,symlink,rm } from 'node:fs/promises';
import { resolve,join,relative } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
const root=process.cwd();const temporary=await mkdtemp(join(tmpdir(),'ashi-runtime-'));
async function files(dir){const entries=await readdir(dir,{withFileTypes:true});return (await Promise.all(entries.map(e=>e.isDirectory()?files(join(dir,e.name)):[join(dir,e.name)]))).flat();}
try {
 const handlers=(await files(join(root,'api'))).filter(p=>p.endsWith('.ts'));
 const raw=ts.readConfigFile(join(root,'tsconfig.server.json'),ts.sys.readFile);
 const parsed=ts.parseJsonConfigFileContent(raw.config,ts.sys,root);
 const program=ts.createProgram(handlers,{...parsed.options,rootDir:root,outDir:temporary,noEmit:false,allowImportingTsExtensions:false,incremental:false,tsBuildInfoFile:undefined});
 const diagnostics=ts.getPreEmitDiagnostics(program).filter(d=>d.category===ts.DiagnosticCategory.Error);
 if(diagnostics.length)throw new Error(ts.formatDiagnosticsWithColorAndContext(diagnostics,{getCurrentDirectory:()=>root,getCanonicalFileName:x=>x,getNewLine:()=>"\n"}));
 program.emit();
 await writeFile(join(temporary,'package.json'),JSON.stringify({type:'module'}));
 await symlink(join(root,'node_modules'),join(temporary,'node_modules'),'dir');
 const cases=handlers.map(p=>({file:relative(root,p).replace(/\.ts$/,'.js'),expected:p.endsWith('/health.ts')?405:p.endsWith('/kid-login.ts')?400:401}));
 const resultFile=join(temporary,'results.json');
 await writeFile(join(temporary,'runner.mjs'),`
 import {writeFile} from 'node:fs/promises';
 let networkCalls=0;globalThis.fetch=async()=>{networkCalls++;throw new Error('Network calls are forbidden in runtime smoke tests');};
 const checks=[];
 for(const item of ${JSON.stringify(cases)}){
  try {
   const {default:handler}=await import('./'+item.file);
   const response={statusCode:200,setHeader(){},status(n){this.statusCode=n;return this;},json(body){this.body=body;return this;}};
   await handler({method:'POST',headers:{},body:{}},response);
   checks.push({route:item.file,passed:response.statusCode===item.expected,status:response.statusCode,expected:item.expected});
  }catch(e){checks.push({route:item.file,passed:false,error:e.code??e.name,message:e.message});}
 }
 await writeFile(${JSON.stringify(resultFile)},JSON.stringify({scope:'Strict compiled Node ESM; synthetic requests, fake configuration, no accounts or database writes',passed:checks.filter(c=>c.passed).length,total:checks.length,networkCalls,checks},null,2));
 `);
 const child=spawnSync(process.execPath,[join(temporary,'runner.mjs')],{encoding:'utf8',env:{...process.env,VITE_SUPABASE_URL:'https://example.invalid',VITE_SUPABASE_ANON_KEY:'fake-public-key',SUPABASE_SERVICE_ROLE_KEY:'fake-server-key',GROQ_API_KEY:'fake-model-key'}});
 if(child.status!==0)throw new Error('Runtime subprocess failed: '+child.stderr);
 const result=JSON.parse(await readFile(resultFile,'utf8'));
 if(process.env.ASHI_RUNTIME_REPORT)await writeFile(resolve(process.env.ASHI_RUNTIME_REPORT),JSON.stringify(result,null,2));
 console.log(JSON.stringify(result,null,2));
 if(result.passed!==result.total||result.networkCalls)process.exitCode=1;
} finally {await rm(temporary,{recursive:true,force:true});}
