import {PGlite} from '@electric-sql/pglite';
import {readFile,readdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const db=new PGlite();const results=[];
await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create schema storage;
create table auth.users(id uuid primary key,email text);
create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
grant usage on schema auth to anon,authenticated,service_role;
create table storage.buckets(id text primary key,name text,public boolean);
create table storage.objects(id uuid primary key,bucket_id text,name text);
create function storage.foldername(text) returns text[] language sql immutable as $$select string_to_array($1,'/')$$;`);
// gen_random_uuid is built into this PostgreSQL runtime; only extension loading
// is omitted. All actual application tables, functions, grants and policies run.
for(const file of (await readdir('supabase/migrations')).filter(f=>f.endsWith('.sql')).sort()){
 const sql=(await readFile(`supabase/migrations/${file}`,'utf8')).replace('create extension if not exists pgcrypto;','');
 await db.exec(sql);
}
results.push({test:'All ten real application migrations execute in isolated PostgreSQL',passed:true});
const owner='10000000-0000-4000-8000-000000000001',other='10000000-0000-4000-8000-000000000002';
const child='20000000-0000-4000-8000-000000000001',sibling='20000000-0000-4000-8000-000000000002',foreign='20000000-0000-4000-8000-000000000003';
await db.exec(`insert into auth.users(id) values('${owner}'),('${other}'),('${child}'),('${sibling}'),('${foreign}');
insert into owners(id) values('${owner}'),('${other}');
insert into students(id,owner_id,username,display_name) values('${child}','${owner}','fake-one','Fake one'),('${sibling}','${owner}','fake-two','Fake two'),('${foreign}','${other}','fake-three','Fake three');
insert into student_profiles(owner_id,student_id,display_name,grade,reading_level) select owner_id,id,display_name,1,1 from students;
insert into parent_config(student_id) select id from students;
insert into coins_state(student_id) select id from students;
insert into level_state(student_id,levels,streaks) select id,'{}','{}' from students;
insert into difficulty_state(student_id,state) select id,'{}' from students;
insert into practice_sessions(student_id,mode,score,max_score,item_count,ended_by,level_snapshot,difficulty_snapshot) select id,'social',2,3,1,'complete','{}','{}' from students;
insert into conversation_sessions(student_id,topic,transcript) select id,'games','[{"role":"user","content":"Synthetic chat"}]' from students;
insert into journal_entries(student_id,mood,content) values('${child}','okay','Synthetic private note');`);
async function as(id){await db.exec(`reset role;select set_config('request.jwt.claim.sub','${id}',false);set role authenticated;`);}
async function test(test,fn){try{await fn();results.push({test,passed:true});}catch(e){results.push({test,passed:false,error:e.message});}}
for(const table of ['students','student_profiles','practice_sessions','coins_state','level_state','difficulty_state','parent_config','conversation_sessions']){
 await test(`Parent reads only own two children in ${table}`,async()=>{await as(owner);assert.equal((await db.query(`select * from ${table}`)).rows.length,2);});
}
await test('Parent daily-goal write returns exactly the selected child',async()=>{await as(owner);const rows=(await db.query(`update parent_config set daily_minimum=2 where student_id='${child}' returning student_id`)).rows;assert.equal(rows.length,1);assert.equal(rows[0].student_id,child);assert.equal((await db.query(`select daily_minimum from parent_config where student_id='${sibling}'`)).rows[0].daily_minimum,1);});
await test('Another family cannot update that daily goal',async()=>{await as(other);assert.equal((await db.query(`update parent_config set daily_minimum=3 where student_id='${child}' returning *`)).rows.length,0);});
let reward;
await test('Parent creates a reward for the selected child',async()=>{await as(owner);reward=(await db.query(`insert into custom_rewards(student_id,label,emoji,url,cost) values('${child}','Synthetic reward','*','https://youtu.be/fake',25) returning id`)).rows[0].id;});
await test('Another family cannot read or delete that reward',async()=>{await as(other);assert.equal((await db.query(`select * from custom_rewards where id='${reward}'`)).rows.length,0);assert.equal((await db.query(`delete from custom_rewards where id='${reward}' returning id`)).rows.length,0);});
await test('Child reads own reward and cannot see sibling records',async()=>{await as(child);assert.equal((await db.query('select * from custom_rewards')).rows.length,1);assert.equal((await db.query('select * from practice_sessions')).rows.length,1);});
await test('Parent reads own conversation history but cannot change transcripts',async()=>{await as(owner);assert.equal((await db.query('select * from conversation_sessions')).rows.length,2);assert.equal((await db.query(`update conversation_sessions set transcript='[]' where student_id='${child}' returning id`)).rows.length,0);});
await test('Parent cannot read journal content; RPC returns dates only',async()=>{await as(owner);assert.equal((await db.query('select * from journal_entries')).rows.length,0);const rows=(await db.query(`select * from journal_activity_for_owner('${child}')`)).rows;assert.equal(rows.length,1);assert.deepEqual(Object.keys(rows[0]),['date']);});
await test('Other parent and sibling cannot read journal activity',async()=>{for(const id of [other,sibling]){await as(id);assert.equal((await db.query(`select * from journal_activity_for_owner('${child}')`)).rows.length,0);}});
await test('Parent cannot forge child practice results or coins',async()=>{await as(owner);assert.equal((await db.query(`update coins_state set balance=999 where student_id='${child}' returning *`)).rows.length,0);await assert.rejects(db.exec(`insert into practice_sessions(student_id,mode,score,max_score,item_count,ended_by,level_snapshot,difficulty_snapshot) values('${child}','social',9,9,1,'complete','{}','{}')`),/row-level security/);});
await test('Owner deletes own reward and receives its id',async()=>{await as(owner);assert.equal((await db.query(`delete from custom_rewards where id='${reward}' returning id`)).rows[0].id,reward);});
await test('Anonymous clients receive no parent or child records',async()=>{await db.exec("reset role;select set_config('request.jwt.claim.sub','',false);set role anon;");for(const table of ['students','student_profiles','practice_sessions','parent_config','custom_rewards','conversation_sessions','journal_entries'])assert.equal((await db.query(`select * from ${table}`)).rows.length,0);});
await db.close();
const output={scope:'Isolated PostgreSQL with actual migrations 0001–0010; synthetic families only; no live writes',passed:results.filter(r=>r.passed).length,total:results.length,results};
if(process.env.ASHI_PARENT_DB_REPORT)await writeFile(process.env.ASHI_PARENT_DB_REPORT,JSON.stringify(output,null,2));console.log(JSON.stringify(output,null,2));if(output.passed!==output.total)process.exitCode=1;
