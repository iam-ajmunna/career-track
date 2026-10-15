import { EMPTY_STATE, validateState, reconcile } from './model.js';
import { applyTracking } from '../tracking.js';
import { transitionScholarship, advanceScholarshipLifecycle } from '../scholarship-lifecycle.js';
export const STORAGE_KEY='career-track:v2';
export function createLocalStore(onChange, storage=localStorage) {
  let state=structuredClone(EMPTY_STATE),failed=false,problem='',rev=0;
  try{const raw=storage.getItem(STORAGE_KEY);if(raw)state=validateState(JSON.parse(raw));}catch{failed=true;problem='Saved v2 progress could not be read. Export recovery data before continuing.';}
  let corrupt=failed;
  const event=()=>({state,status:failed?'failed':'saved',authorized:true,pending:failed?1:0,conflicts:[],clockOffset:0,storageFailed:failed,cacheProblem:problem,draftProblem:corrupt});
  function emit(){onChange(event());}
  function save(){if(corrupt){emit();return;}try{storage.setItem(STORAGE_KEY,JSON.stringify(state));failed=false;problem='';}catch{failed=true;problem='Browser storage is unavailable. Export a backup before closing this tab.';}emit();}
  const store={get:event,load:emit,sync:async()=>save(),
    change(bucket,key,value){if(corrupt)throw Error('Export unreadable state first.');state=reconcile({state,rev},[{bucket,key:bucket==='profile'?'current':key,value,baseRev:rev}]).state;rev++;save();},
    changeMany(changes){if(corrupt)throw Error('Export unreadable state first.');state=reconcile({state,rev},changes.map(op=>({...op,baseRev:rev}))).state;rev++;save();},
    applyState(next){if(corrupt)throw Error('Export unreadable state first.');state=validateState(next);rev++;save();},
    bulkTrack(ids,status){store.applyState(applyTracking(state,ids,status));},
    lifecycle(action,id){store.applyState(transitionScholarship(state,id,action));},
    reap(){if(corrupt)return;const next=advanceScholarshipLifecycle(state,Date.now(),{expire:false});if(next!==state)store.applyState(next);},
    export:()=>({format:'career-track-v2-export',version:2,exported_at:new Date().toISOString(),state,raw_recovery:corrupt?storage.getItem(STORAGE_KEY):undefined}),
    reloadFromBrowser(){try{const raw=storage.getItem(STORAGE_KEY);state=raw?validateState(JSON.parse(raw)):structuredClone(EMPTY_STATE);corrupt=false;failed=false;problem='';emit();}catch{failed=true;problem='Another tab wrote unreadable progress. Export before retrying.';emit();}},stop(){} };
  return store;
}
