import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile,readdir } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { EMPTY_STATE,validateState,reconcile } from '../src/sync/model.js';
import { inspectLegacy } from '../src/sync/import.js';
import { createCache } from '../src/sync/cache.js';
import { createProgressStore } from '../src/sync/store.js';
import { countries,scholarships } from '../src/data/normalized.js';
const memory=()=>{const m=new Map();return {get length(){return m.size;},key:i=>[...m.keys()][i]??null,getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,v),removeItem:k=>m.delete(k)};};
test('normalized catalogue retains every scholarship, host mobility and sourced exact instants',()=>{
 assert.equal(scholarships.length,21);assert.equal(new Set(countries.map(c=>c.code)).size,countries.length);
 assert.equal(countries.length,251);assert.equal(new Set(countries.map(c=>c.name)).size,countries.length);assert.equal(scholarships.find(s=>s.id==='commonwealth').countryCode,'GB');assert.equal(scholarships.find(s=>s.id==='eiffel').countryCode,'FR');assert.equal(scholarships.find(s=>s.id==='ediss').countryCode,'FI');
 for(const s of scholarships){assert.ok(countries.some(c=>c.code===s.countryCode));assert.ok(['full','partial','none'].includes(s.funding));if(s.deadlineAt){assert.ok(s.deadlineTz&&s.deadline_source_url&&s.deadline_verified_on);}}
});
test('pins, notes and priorities validate and concurrent removals/free-text edits report conflicts',()=>{
 const state={...structuredClone(EMPTY_STATE),pins:{kaust:true},notes:{kaust:'remote'},preferences:{'enabled-pr':true}};
 assert.throws(()=>validateState({...state,notes:{kaust:100}}));assert.throws(()=>validateState({...state,preferences:{sortOrder:'bad'}}));
 const result=reconcile({state,rev:2},[{bucket:'pins',key:'kaust',value:false,baseRev:1},{bucket:'notes',key:'kaust',value:'local',baseRev:1}]);
 assert.equal(result.state.pins.kaust,true);assert.equal(result.state.notes.kaust,'remote');assert.equal(result.conflicts.length,2);
 assert.equal(reconcile({state,rev:2},[{bucket:'pins',key:'kaust',value:false,baseRev:2}]).state.pins.kaust,false);
});
test('legacy preview is read-only, merges completions and is idempotent',()=>{
 const storage=memory(),raw=JSON.stringify({...structuredClone(EMPTY_STATE),progress:{'sch-kaust-0':true},tracking:{kaust:'researching'}});storage.setItem('career-track:local-state:v1',raw);
 const current=structuredClone(EMPTY_STATE),preview=inspectLegacy(storage,current);assert.equal(preview.newItems,2);assert.deepEqual(current.progress,{});
 const next=reconcile({state:current,rev:0},preview.changes.map(x=>({...x,baseRev:0}))).state;
 assert.equal(inspectLegacy(storage,next).newItems,0);assert.equal(storage.getItem('career-track:local-state:v1'),raw);
});
test('v2 cloud queue persists pins, ordinary unpin, notes and research tracking',async()=>{
 const storage=memory(),ownerId='11111111-1111-4111-8111-111111111111';
 let row={owner_id:ownerId,state:structuredClone(EMPTY_STATE),rev:0,updated_at:new Date().toISOString()};
 const backend={load:async()=>({snapshot:structuredClone(row),server_time:new Date().toISOString()}),compareAndSwap:async(rev,state)=>{if(rev!==row.rev)return null;row={...row,state:structuredClone(state),rev:rev+1};return structuredClone(row);}};
 const cache=createCache({storage,namespace:'fixture',ownerId,version:'v2'});const store=createProgressStore({ownerId,backend,cache,isOnline:()=>true});
 await store.load();store.change('pins','kaust',true);store.change('notes','kaust','private note');store.bulkTrack(['kaust'],'researching');await store.sync();
 assert.equal(row.state.pins.kaust,true);assert.equal(row.state.notes.kaust,'private note');assert.equal(row.state.tracking.kaust,'researching');
 store.change('pins','kaust',false);await store.sync();assert.equal(row.state.pins.kaust,false);assert.equal(store.get().status,'saved');assert.equal(cache.operations().length,0);store.stop();
});
test('additive database migration enforces v2 shape and preserves the owner-only RLS contract',async()=>{
 const db=new PGlite();try{
 await db.exec("CREATE ROLE anon;CREATE ROLE authenticated;CREATE ROLE service_role BYPASSRLS;CREATE SCHEMA auth;CREATE TABLE auth.users(id uuid primary key);CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;GRANT USAGE ON SCHEMA auth,public TO anon,authenticated,service_role;");
 for(const file of (await readdir('supabase/migrations')).sort())await db.exec(await readFile('supabase/migrations/'+file,'utf8'));
 const check=async state=>(await db.query('select public.career_valid_state($1::jsonb) as valid',[JSON.stringify(state)])).rows[0].valid;
 assert.equal(await check({...structuredClone(EMPTY_STATE),pins:{kaust:true},notes:{kaust:'safe'},preferences:{'enabled-pr':false},ui:{unratedOpen:true},progress:{'goal-ipcvai-0':true}}),true);
 assert.equal(await check({...structuredClone(EMPTY_STATE),pins:{kaust:'true'}}),false);
 assert.equal(await check({...structuredClone(EMPTY_STATE),preferences:{bad:true}}),false);
 assert.equal(await check({...structuredClone(EMPTY_STATE),notes:{kaust:'x'.repeat(8001)}}),false);
 const policies=(await db.query("select policyname from pg_policies where tablename='user_state'")).rows;assert.deepEqual(policies.map(p=>p.policyname).sort(),['owner_read','owner_update']);
 }finally{await db.close();}
});

test('sign-in import can transfer the v2 device workspace without replacing existing cloud notes',()=>{
 const storage=memory();storage.setItem('career-track:v2',JSON.stringify({...structuredClone(EMPTY_STATE),pins:{kaust:true},notes:{kaust:'device',mext:'new'},preferences:{'enabled-pr':false}}));
 const current={...structuredClone(EMPTY_STATE),notes:{kaust:'cloud'}};
 const preview=inspectLegacy(storage,current);assert.equal(preview.newItems,3);
 const next=reconcile({state:current,rev:0},preview.changes.map(op=>({...op,baseRev:0}))).state;
 assert.equal(next.pins.kaust,true);assert.equal(next.notes.kaust,'cloud');assert.equal(next.notes.mext,'new');assert.equal(next.preferences['enabled-pr'],false);assert.equal(inspectLegacy(storage,next).newItems,0);
});

test('history queue operations validate against their lifecycle context',()=>{
 const storage=memory(),cache=createCache({storage,namespace:'fixture',ownerId:'owner',version:'v2'});
 const expiredAt='2026-10-15T10:00:00.000Z';
 cache.append({bucket:'lifecycle',key:'khs',value:{status:'expired',at:expiredAt},baseRev:0});
 cache.append({bucket:'history',key:'khs',value:{name:'KHS',deadline:'2026-10-06',expiredAt},baseRev:0});
 assert.equal(cache.operations().length,2);assert.equal(cache.draftProblem,false);
});

test('v2 retains closed application progress while honoring the trash recovery window',async()=>{
 const {advanceScholarshipLifecycle}=await import('../src/scholarship-lifecycle.js');
 const before={...structuredClone(EMPTY_STATE),progress:{'sch-khs-0':true}};
 const next=advanceScholarshipLifecycle(before,Date.parse('2027-01-01T00:00:00Z'),{expire:false});
 assert.equal(next.progress['sch-khs-0'],true);assert.equal(next.lifecycle.khs,undefined);
});
