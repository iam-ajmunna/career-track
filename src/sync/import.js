import { validateState, EMPTY_STATE } from './model.js';
export const LEGACY_KEYS=['career-track:local-state:v1','scholarship-progress','career-track:v2'];
export function inspectLegacy(storage,current) {
  const candidates=[], errors=[];
  for(const key of LEGACY_KEYS){
    try{
      const raw=storage.getItem(key);if(!raw)continue;
      if(raw.length>262144)throw Error('Legacy data is too large.');
      const blob=JSON.parse(raw);
      const legacy=validateState(key!=='scholarship-progress'?blob:{...structuredClone(EMPTY_STATE),progress:blob.progress || blob});
      candidates.push(legacy);
    }catch{errors.push(key+' could not be imported. Export the original data before attempting recovery.');}
  }
  const changes=[], next=structuredClone(current),seen=new Set();
  for(const legacy of candidates){
    for(const bucket of ['progress','applications','tracking','pins','notes','preferences'])for(const [key,value] of Object.entries(legacy[bucket] || {})){
      const completed=bucket==='progress'?value===true:bucket==='applications'?value==='submitted':bucket==='tracking'?value==='completed'||value==='researching':bucket==='pins'?value===true:(next[bucket]?.[key]===undefined);
      const existing=next[bucket]?.[key];
      if(!completed || existing===value || (bucket==='applications'&&existing==='submitted') || (bucket==='tracking'&&existing==='completed'))continue;
      next[bucket] ||= {};next[bucket][key]=value;
    }
  }
  for(const bucket of ['progress','applications','tracking','pins','notes','preferences'])for(const [key,value] of Object.entries(next[bucket] || {})){
    if(current[bucket]?.[key]!==value){changes.push({bucket,key,value});seen.add(bucket+':'+key);}
  }
  return {changes,newItems:seen.size,newTicks:changes.filter(c=>c.bucket==='progress').length,errors,sources:candidates.length};
}
