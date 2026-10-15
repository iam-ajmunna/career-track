import { createClient } from '@supabase/supabase-js';
import { createLocalStore, STORAGE_KEY } from './sync/local-v2.js';
import { createProgressStore } from './sync/store.js';
import { createBackend } from './sync/backend.js';
import { createCache } from './sync/cache.js';

const config=__PUBLIC_CONFIG__;
const $=id=>document.getElementById(id);
let store,ui,client,cache,mounted=false,lastEvent,mode='local',ownerId=null,sessionVersion=0;
const labels={loading:'Loading…',syncing:'Syncing…',saving:'Saving…',saved:'Saved',failed:'Failed — Retry',offline:'Offline — Retry',reauth:'Session expired — sign in',forbidden:'Access denied'};
function gate(title,message){$('appShell').hidden=true;$('authGate').hidden=false;$('authTitle').textContent=title;$('authMessage').textContent=message;$('authRetry').hidden=false;$('authSignIn').hidden=false;$('authSignOut').hidden=mode!=='cloud';if(mounted){ui.hideWorkspace();mounted=false;}}
function render(event){
  lastEvent=event;
  if(mode==='cloud' && (!event.authorized || !event.state)){
    if(event.status==='forbidden')gate('Account not provisioned','This Google account cannot open the owner workspace. Sign in with the owner account or finish owner provisioning.');
    else gate('Workspace unavailable',event.error || 'Loading your cloud progress…');
    return;
  }
  $('authGate').hidden=true;$('appShell').hidden=false;
  if(!mounted){ui.mountApp(store);mounted=true;}
  ui.updateWorkspace(event);
  $('syncLabel').textContent=mode==='local'?(event.storageFailed?'Failed — Retry':'Saved on this device · Sign in to sync'):(labels[event.status] || 'Syncing…');
  $('syncBar').dataset.status=event.status;
  $('syncRetry').hidden=!['failed','offline'].includes(event.status);
  $('signIn').hidden=mode==='cloud';$('signOut').hidden=mode!=='cloud';
  const messages=[event.cacheProblem,event.error,event.conflicts?.length ? 'A newer device edit was preserved. Review the affected item and repeat your change if needed.' : '',event.storageFailed?'Local backup could not be written. Export before closing this tab.':''].filter(Boolean);
  $('syncMessage').textContent=messages.join(' ');$('syncMessage').hidden=!messages.length;
  document.querySelectorAll('[data-progress-key],[data-application-status],[data-toggle-working],[data-save-note],[data-pref-enabled],[data-pref-weight],[data-pref-sort],[data-track-status-id],[data-track-bulk],[data-commit-import],#resetProgressForm button').forEach(node=>node.disabled=event.draftProblem || (mode==='cloud'&&['forbidden','reauth'].includes(event.status)));
}
async function openSession(session){
  if(session?.user?.id===ownerId && mode==='cloud'){void store?.sync();return;}
  const version=++sessionVersion;
  store?.stop();if(mounted){ui.hideWorkspace();mounted=false;}
  ownerId=session?.user?.id || null;mode=session?'cloud':'local';
  if(!session){store=createLocalStore(render);store.load();return;}
  $('appShell').hidden=true;$('authGate').hidden=false;$('authTitle').textContent='Loading cloud workspace';$('authMessage').textContent='Checking owner access and saved progress…';
  cache=createCache({storage:localStorage,namespace:new URL(config.url).host,ownerId,version:'v2'});
  store=createProgressStore({ownerId,backend:createBackend(client,ownerId),cache,onChange:event=>{if(version===sessionVersion)render(event);}});
  await store.load();
}
async function signIn(){
  if(!client){$('syncMessage').hidden=false;$('syncMessage').textContent='Cloud sync is not configured. Export progress and configure the project before signing in.';return;}
  const buttons=[$('signIn'),$('authSignIn')];buttons.forEach(b=>b.disabled=true);
  try{
    sessionStorage.setItem('career-track:return-to',location.hash || '#/overview');
    const {error}=await client.auth.signInWithOAuth({provider:'google',options:{redirectTo:location.origin+location.pathname}});
    if(error)throw error;
  }catch{
    const target=$('appShell').hidden?$('authMessage'):$('syncMessage');target.hidden=false;target.textContent='Google sign-in is unavailable. Check the Google provider and allowed redirect URL, then retry.';buttons.forEach(b=>b.disabled=false);
  }
}
function exportProgress(){
  if(!store)return false;
  try{const url=URL.createObjectURL(new Blob([JSON.stringify(store.export(),null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='career-track-'+new Date().toISOString().slice(0,10)+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);return true;}catch{$('syncMessage').hidden=false;$('syncMessage').textContent='Export failed. Keep this tab open and retry.';return false;}
}
async function signOut(){
  if(lastEvent?.pending){await store.sync();if(store.get().pending){$('signOutDescription').textContent='Your latest changes are still waiting to sync. Stay and retry, or export a backup before signing out.';$('signOutDialog').showModal();return;}}
  await finishSignOut();
}
async function finishSignOut(){
  $('signOut').disabled=true;
  const {error}=await client.auth.signOut({scope:'local'});
  $('signOut').disabled=false;
  if(error){$('syncMessage').hidden=false;$('syncMessage').textContent='Sign-out could not be confirmed. Retry when connected.';return;}
  cache?.clear();$('signOutDialog').close();await openSession(null);
}
$('signIn').addEventListener('click',signIn);$('authSignIn').addEventListener('click',signIn);
$('signOut').addEventListener('click',signOut);$('authSignOut').addEventListener('click',signOut);$('signOutCancel').addEventListener('click',()=>$('signOutDialog').close());
$('exportSignOut').addEventListener('click',async()=>{if(exportProgress())await finishSignOut();});
$('authRetry').addEventListener('click',()=>location.reload());$('syncRetry').addEventListener('click',()=>void store?.sync());
$('exportProgress').addEventListener('click',exportProgress);$('gateExport').addEventListener('click',exportProgress);
document.addEventListener('click',e=>{if(e.target.closest('[data-export-state]'))exportProgress();if(e.target.closest('[data-sign-in]'))void signIn();});
window.addEventListener('online',()=>void store?.sync());
window.addEventListener('offline',()=>{if(mode==='cloud')void store?.sync();});
window.addEventListener('storage',event=>{if(mode==='local'&&event.key===STORAGE_KEY)store?.reloadFromBrowser();else if(mode==='cloud'&&event.key?.startsWith(cache?.prefix))void store?.sync();});
window.addEventListener('focus',()=>{if(mode==='cloud')void store?.sync();});
window.addEventListener('beforeunload',event=>{if(lastEvent?.pending || lastEvent?.storageFailed || document.querySelector('[data-note-dirty]')){event.preventDefault();event.returnValue='';}});
(async()=>{
  try{
    ui=await import('./app.js');
    if(config.url&&config.key){client=createClient(config.url,config.key,{auth:{storageKey:'career-track-auth:'+new URL(config.url).host,persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});}
    let session=null;
    if(client){const {data}=await client.auth.getSession();session=data.session;client.auth.onAuthStateChange((event,next)=>{if(event!=='INITIAL_SESSION')setTimeout(()=>void openSession(next),0);});}
    try{const hash=sessionStorage.getItem('career-track:return-to');if(hash&&session){history.replaceState(null,'',location.pathname+hash);sessionStorage.removeItem('career-track:return-to');}}catch{/* Storage is optional. */}
    await openSession(session);
  }catch{gate('Workspace unavailable','The workspace could not open. Reload to retry; existing browser data has not been changed.');}
})();
