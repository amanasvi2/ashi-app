export type DependencyStatus = 'ok' | 'unavailable' | 'missing_config' | 'missing_migration' | 'inaccessible';
export interface BackendConfig { url?:string; anonKey?:string; modelKey?:string }
// Only health and zero-row reads. Never query or return student records, secrets,
// model output, or raw upstream errors. This does not perform a paid model call.
export async function backendHealth(config:BackendConfig, request:typeof fetch=fetch) {
  const checks:{auth:DependencyStatus;database:DependencyStatus;carryover:DependencyStatus;model:'configured'|'missing_config'}={auth:'missing_config',database:'missing_config',carryover:'missing_config',model:config.modelKey?'configured':'missing_config'};
  if(config.url&&config.anonKey){
    try {
      const base=new URL(config.url);
      if(base.protocol!=='https:')throw new Error('Invalid backend URL');
      const check=async(path:string):Promise<DependencyStatus>=>{
        try {
          const response=await request(new URL(path,base),{headers:{apikey:config.anonKey!,Authorization:`Bearer ${config.anonKey}`},signal:AbortSignal.timeout(5000)});
          if(response.ok)return 'ok';
          if(response.status===404)return 'missing_migration';
          if(response.status===401||response.status===403)return 'inaccessible';
          return 'unavailable';
        }catch{return 'unavailable';}
      };
      const [auth,database,carryover]=await Promise.all([check('/auth/v1/health'),check('/rest/v1/students?select=id&limit=0'),check('/rest/v1/skill_assessments?select=id&limit=0')]);
      checks.auth=auth;checks.database=database;checks.carryover=carryover;
    }catch{checks.auth=checks.database=checks.carryover='missing_config';}
  }
  const ready=checks.auth==='ok'&&checks.database==='ok'&&checks.carryover==='ok'&&checks.model==='configured';
  return {status:ready?'ready' as const:'degraded' as const,checks,modelVerification:'configuration_only' as const,checkedAt:new Date().toISOString()};
}
