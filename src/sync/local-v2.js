import { EMPTY_STATE, validateState, reconcile } from './model.js';
import { applyTracking } from '../tracking.js';
import { transitionScholarship, advanceScholarshipLifecycle } from '../scholarship-lifecycle.js';
export const STORAGE_KEY='career-track:v2';
export function createLocalStore(onChange, storage) {
  let state=structuredClone(EMPTY_STATE),failed=false,problem='',rev=0,corrupt=false,dirty=false,externalConflict=false,rawRecovery;
  try{storage ||= globalThis.localStorage;rawRecovery=storage.getItem(STORAGE_KEY);}
  catch{failed=true;problem='Browser storage is unavailable. Changes stay in this tab; export before closing.';}
  if(rawRecovery!==null&&rawRecovery!==undefined){
    try{state=validateState(JSON.parse(rawRecovery));}
    catch{failed=true;corrupt=true;problem='Saved v2 progress could not be read. Export recovery data before continuing.';}
  }
  const blocked=()=>corrupt||externalConflict;
  const event=()=>({state,status:failed?'failed':'saved',authorized:true,pending:dirty?1:0,conflicts:[],clockOffset:0,storageFailed:failed,cacheProblem:problem,draftProblem:blocked()});
  function emit(){onChange(event());}
  function save(){if(blocked()){emit();return;}dirty=true;try{storage ||= globalThis.localStorage;storage.setItem(STORAGE_KEY,JSON.stringify(state));failed=false;dirty=false;problem='';}catch{failed=true;problem='Browser storage is unavailable. Export a backup before closing this tab.';}emit();}
  const store={get:event,load:emit,sync:async()=>save(),
    change(bucket,key,value){if(blocked())throw Error('Export recovery data before reloading.');state=reconcile({state,rev},[{bucket,key:bucket==='profile'?'current':key,value,baseRev:rev}]).state;rev++;save();},
    changeMany(changes){if(blocked())throw Error('Export recovery data before reloading.');state=reconcile({state,rev},changes.map(op=>({...op,baseRev:rev}))).state;rev++;save();},
    applyState(next){if(blocked())throw Error('Export recovery data before reloading.');state=validateState(next);rev++;save();},
    bulkTrack(ids,status){store.applyState(applyTracking(state,ids,status));},
    lifecycle(action,id){store.applyState(transitionScholarship(state,id,action));},
    reap(){if(blocked())return;const next=advanceScholarshipLifecycle(state,Date.now(),{expire:false});if(next!==state)store.applyState(next);},
    export:()=>({format:'career-track-v2-export',version:2,exported_at:new Date().toISOString(),state,raw_recovery:corrupt?rawRecovery:undefined}),
    reloadFromBrowser(){
      if(dirty){externalConflict=true;failed=true;problem='Another tab changed saved progress while this tab has unsaved work. Export this tab before reloading.';emit();return;}
      try{const raw=storage.getItem(STORAGE_KEY);rawRecovery=raw;state=raw===null?structuredClone(EMPTY_STATE):validateState(JSON.parse(raw));corrupt=false;failed=false;problem='';rev++;emit();}
      catch{corrupt=true;failed=true;problem='Saved progress changed but could not be read. Export recovery data before reloading.';emit();}
    },stop(){} };
  return store;
}
