// Exercises the no-account device release. Supply CT_CHROMIUM_PATH for an existing Chromium binary.
import {spawn} from 'node:child_process';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES?process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright':'playwright');
const evidence='docs/upgrade/ux';await mkdir(evidence,{recursive:true});
const checks=[],errors=[],servers=[];let diagnosticPage;
async function start(script,port){const child=spawn(process.execPath,[script],{env:{...process.env,PORT:String(port)},stdio:['ignore','pipe','pipe']});servers.push(child);await new Promise((resolve,reject)=>{let output='';child.stdout.on('data',d=>{output+=d;if(output.includes('http://'))resolve();});child.stderr.on('data',d=>output+=d);child.on('exit',c=>reject(Error(output+' exit '+c)));});return child;}
async function check(name,fn){try{await fn();}catch(error){if(diagnosticPage&&!diagnosticPage.isClosed()){await diagnosticPage.screenshot({path:evidence+'/failure.png',fullPage:true});console.error((await diagnosticPage.locator('body').innerText()).slice(0,7000));console.error('Browser errors:',errors);}throw error;}checks.push({name,status:'PASS'});console.log('PASS '+name);}
const browser=await chromium.launch({executablePath:process.env.CT_CHROMIUM_PATH||undefined,headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--disable-gpu']});
try{
 await start('scripts/dev.mjs',8084);
 const context=await browser.newContext({viewport:{width:1440,height:960},reducedMotion:'reduce'});
 await context.addInitScript(()=>{
  localStorage.setItem('career-track-auth:yqqcfonzkkrboghhfbdx.supabase.co',JSON.stringify({access_token:'obsolete-session',refresh_token:'obsolete-refresh'}));
 });
 const authRequests=[];
 context.on('request',request=>{if(/\.supabase\.co$|^accounts\.google\.com$/.test(new URL(request.url()).hostname))authRequests.push(request.url());});
 const page=await context.newPage();diagnosticPage=page;page.on('pageerror',e=>{errors.push(e.message);console.error('PAGE ERROR:',e.message);});
 await page.goto('http://127.0.0.1:8084');await page.waitForSelector('#appShell:not([hidden])');
 await check('Workspace opens without login, ignores obsolete sessions and makes no auth requests',async()=>{
  assert.equal(await page.locator('#syncLabel').innerText(),'Saved on this device');
  assert.equal(await page.getByRole('button',{name:/sign in|sign out/i}).count(),0);
  assert.deepEqual(authRequests,[]);
 });
 await check('Countries first; unrated collapsed; empty country shows evidence',async()=>{
  await page.locator('#nav [data-view="scholarships"]').click();await page.waitForURL('**/#/scholarships');await page.waitForSelector('#view-scholarships.active-view .country-card');
  assert.ok(await page.locator('.country-card').count()>10);assert.equal(await page.locator('[data-unrated]').getAttribute('open'),null);
  await page.goto('http://127.0.0.1:8084/#/scholarships/country/BD');await page.waitForSelector('.evidence');assert.match(await page.locator('#view-scholarships').innerText(),/No scholarship tracked/);
 });
 await check('Pin, checklist and escaped notes survive reload; unpin preserves progress',async()=>{
  await page.goto('http://127.0.0.1:8084/#/scholarships/country/SA?focus=kaust');await page.waitForSelector('#sch-kaust[open]');
  await page.locator('[data-toggle-working="kaust"]').click();await page.locator('[data-progress-key="sch-kaust-0"]').check();
  await page.locator('[data-note="kaust"]').fill('<img src=x onerror=alert(1)> private note');await page.locator('[data-save-note="kaust"]').click();
  await page.reload();await page.waitForSelector('#sch-kaust[open]');assert.equal(await page.locator('[data-toggle-working="kaust"]').getAttribute('aria-pressed'),'true');assert.ok(await page.locator('[data-progress-key="sch-kaust-0"]').isChecked());assert.equal(await page.locator('[data-note="kaust"]').inputValue(),'<img src=x onerror=alert(1)> private note');assert.equal(await page.locator('.sch__body img').count(),0);
  await page.locator('[data-toggle-working="kaust"]').click();assert.equal(await page.locator('.active-view .tray-card').count(),0);assert.ok(await page.locator('[data-progress-key="sch-kaust-0"]').isChecked());
  await page.locator('[data-toggle-working="kaust"]').click();await page.locator('#nav [data-view="overview"]').click();await page.waitForSelector('#view-overview.active-view');await page.locator('#view-overview .tray-card').click();await page.waitForSelector('#sch-kaust[open]');await page.waitForFunction(()=>document.activeElement?.tagName==='SUMMARY');
 });
 await check('Country selection supports bulk research and completion without changing submission',async()=>{
  await page.locator('.active-view [data-track-select="kaust"]').check();await page.locator('.active-view [data-track-bulk="researching"]').click();assert.equal(await page.locator('.active-view [data-track-status-id="kaust"]').inputValue(),'researching');await page.locator('.active-view [data-track-select="kaust"]').check();await page.locator('.active-view [data-track-bulk="completed"]').click();assert.equal(await page.locator('.active-view [data-track-status-id="kaust"]').inputValue(),'completed');assert.equal(await page.locator('.active-view [data-application-status]').getAttribute('data-application-status'),'submitted');
 });
 await check('Priority/order persistence, shortcuts, country search and invalid routes',async()=>{
  await page.keyboard.press('2');await page.waitForURL('**/#/scholarships');await page.waitForSelector('#view-scholarships.active-view .country-card');await page.locator('.prefs summary').click();await page.locator('[data-pref-enabled="pr"]').uncheck();await page.locator('[data-pref-sort]').selectOption('worst-first');
  await page.reload();await page.locator('.prefs summary').click();assert.equal(await page.locator('[data-pref-enabled="pr"]').isChecked(),false);assert.equal(await page.locator('[data-pref-sort]').inputValue(),'worst-first');
  await page.locator('#globalSearch').fill('Atlantis');assert.match(await page.locator('#view-scholarships').innerText(),/No countries match/);await page.locator('#searchClear').click();assert.ok(await page.locator('.country-card').count()>0);
  for(const code of ['ZZ','%zz']){await page.goto('http://127.0.0.1:8084/#/scholarships/country/'+code);await page.waitForSelector('.empty');assert.match(await page.locator('#view-scholarships').innerText(),/Unknown country/);}
 });
 await check('Legacy import is explicit, idempotent and preserves original bytes',async()=>{
  const raw=JSON.stringify({schema_version:1,progress:{'sch-kaust-1':true},applications:{},profile:null,tracking:{},lifecycle:{},history:{}});await page.evaluate(raw=>localStorage.setItem('career-track:local-state:v1',raw),raw);
  await page.locator('#nav [data-view="settings"]').click();await page.waitForSelector('#view-settings.active-view');await page.locator('[data-preview-import]').click();assert.match(await page.locator('#importReport').innerText(),/1 new items/);await page.locator('[data-commit-import]').click();await page.locator('[data-preview-import]').click();assert.match(await page.locator('#importReport').innerText(),/0 new items/);assert.equal(await page.evaluate(()=>localStorage.getItem('career-track:local-state:v1')),raw);
 });
 await check('Calendar download has exact UTC deadline and four alarms per event',async()=>{
  await page.locator('#nav [data-view="overview"]').click();const download=page.waitForEvent('download');await page.locator('[data-export-visible-calendar]').first().click();const text=await readFile(await (await download).path(),'utf8');assert.equal((text.match(/BEGIN:VALARM/g)||[]).length,(text.match(/BEGIN:VEVENT/g)||[]).length*4);assert.match(text,/DTSTART:20261020T150000Z/);
 });
 await check('Eight tabs and country detail: desktop/mobile, both themes, no page overflow',async()=>{
  await page.goto('http://127.0.0.1:8084/#/scholarships');await page.waitForSelector('.prefs');await page.locator('.prefs summary').click();await page.locator('[data-pref-enabled="pr"]').check();await page.locator('[data-pref-sort]').selectOption('best-first');
  for(const width of [1440,390])for(const theme of ['light','dark']){
   await page.setViewportSize({width,height:960});if(await page.evaluate(()=>document.documentElement.dataset.theme)!==theme)await page.locator('#themeToggle').click();
   for(const view of ['overview','scholarships','pipeline','documents','profile','settings','goal','library']){
    await page.locator('#nav [data-view="'+view+'"]').click();await page.waitForURL('**/#/'+view);await page.waitForSelector('#view-'+view+'.active-view');await page.evaluate(()=>window.scrollTo(0,0));await page.screenshot({path:`${evidence}/${view}-${theme}-${width}.png`,fullPage:true});
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,view+' overflow '+width);
   }
   await page.goto('http://127.0.0.1:8084/#/scholarships/country/GB?focus=commonwealth');await page.waitForSelector('#sch-commonwealth[open]');await page.evaluate(()=>window.scrollTo(0,0));await page.screenshot({path:`${evidence}/country-${theme}-${width}.png`,fullPage:true});
  }
 });
 await check('Deletion dialog focuses Cancel; Escape preserves scholarship',async()=>{
  await page.goto('http://127.0.0.1:8084/#/scholarships/country/SA?focus=kaust');await page.waitForSelector('#sch-kaust[open]');await page.locator('.active-view [data-life-action="delete"][data-life-id="kaust"]').click();assert.ok(await page.locator('#confirmDialog').isVisible());assert.equal(await page.locator('#confirmDialog button').first().evaluate(n=>n===document.activeElement),true);await page.keyboard.press('Escape');assert.equal(await page.locator('#confirmDialog').isVisible(),false);
 });
 await check('Export and previewed JSON import restore progress in a clean browser without login',async()=>{
  await page.locator('#nav [data-view="settings"]').click();
  const downloaded=page.waitForEvent('download');await page.locator('[data-export-state]').click();
  const backup=await readFile(await(await downloaded).path());
  const c=await browser.newContext({viewport:{width:390,height:960},reducedMotion:'reduce'}),other=await c.newPage();
  other.on('pageerror',e=>errors.push(e.message));
  await other.goto('http://127.0.0.1:8084/#/settings');await other.waitForSelector('#backupFile',{state:'attached'});
  await other.locator('#backupFile').setInputFiles({name:'career-track-backup.json',mimeType:'application/json',buffer:backup});
  await other.waitForSelector('[data-commit-backup]');
  assert.equal(await other.evaluate(()=>localStorage.getItem('career-track:v2')),null,'Preview makes no write');
  await other.screenshot({path:evidence+'/backup-preview-mobile.png',fullPage:true});
  await other.locator('[data-commit-backup]').click();assert.match(await other.locator('#backupReport').innerText(),/saved on this device/);
  await other.goto('http://127.0.0.1:8084/#/scholarships/country/SA?focus=kaust');await other.waitForSelector('#sch-kaust[open]');
  assert.ok(await other.locator('[data-progress-key="sch-kaust-0"]').isChecked());
  assert.equal(await other.locator('[data-toggle-working="kaust"]').getAttribute('aria-pressed'),'true');
  assert.equal(await other.locator('[data-note="kaust"]').inputValue(),'<img src=x onerror=alert(1)> private note');
  await other.reload();await other.waitForSelector('#sch-kaust[open]');assert.ok(await other.locator('[data-progress-key="sch-kaust-0"]').isChecked());
  await other.goto('http://127.0.0.1:8084/#/settings');await other.waitForSelector('#backupFile',{state:'attached'});
  await other.locator('#backupFile').setInputFiles({name:'again.json',mimeType:'application/json',buffer:backup});await other.waitForFunction(()=>document.querySelector('#backupReport').textContent.includes('already up to date'));
  assert.equal(await other.locator('[data-commit-backup]').count(),0);
  await c.close();
 });
 await check('Malformed backup shows an inline error and preserves existing progress',async()=>{
  const before=await page.evaluate(()=>localStorage.getItem('career-track:v2'));
  await page.locator('#backupFile').setInputFiles({name:'broken.json',mimeType:'application/json',buffer:Buffer.from('{bad')});
  await page.waitForFunction(()=>document.querySelector('#backupReport').textContent.includes('not valid JSON'));
  assert.equal(await page.locator('[data-commit-backup]').count(),0);
  assert.equal(await page.evaluate(()=>localStorage.getItem('career-track:v2')),before);
  assert.equal(await page.locator('[data-pick-backup]').evaluate(n=>n===document.activeElement),true);
 });
 await check('Offline local writes and another tab preserve the same browser workspace',async()=>{
  const other=await context.newPage();await other.goto('http://127.0.0.1:8084/#/scholarships/country/SA?focus=kaust');await other.waitForSelector('#sch-kaust[open]');
  await context.setOffline(true);await other.locator('[data-progress-key="sch-kaust-2"]').check();
  await page.waitForFunction(()=>JSON.parse(localStorage.getItem('career-track:v2')).progress['sch-kaust-2']===true);
  assert.equal(await other.locator('#syncLabel').innerText(),'Saved on this device');
  await context.setOffline(false);await other.close();
 });
 await check('Local quota failure retains an exportable draft and Retry saves it',async()=>{
  await page.goto('http://127.0.0.1:8084/#/scholarships/country/SA?focus=kaust');await page.waitForSelector('#sch-kaust[open]');
  await page.evaluate(()=>{window.ctFailWrites=true;const original=Storage.prototype.setItem;Storage.prototype.setItem=function(key,value){if(key==='career-track:v2'&&window.ctFailWrites)throw new DOMException('Quota exceeded','QuotaExceededError');return original.call(this,key,value);};});
  await page.locator('[data-progress-key="sch-kaust-3"]').check();
  assert.equal(await page.locator('#syncLabel').innerText(),'Not saved — Retry');assert.ok(await page.locator('[data-progress-key="sch-kaust-3"]').isChecked());
  const downloaded=page.waitForEvent('download');await page.locator('#exportProgress').evaluate(n=>n.click());
  const backup=JSON.parse(await readFile(await(await downloaded).path(),'utf8'));assert.equal(backup.state.progress['sch-kaust-3'],true);
  await page.screenshot({path:evidence+'/storage-retry-mobile.png',fullPage:true});
  await page.evaluate(()=>window.ctFailWrites=false);await page.locator('#syncRetry').click();
  assert.equal(await page.locator('#syncLabel').innerText(),'Saved on this device');
  await page.reload();await page.waitForSelector('#sch-kaust[open]');assert.ok(await page.locator('[data-progress-key="sch-kaust-3"]').isChecked());
 });
 await check('Corrupt browser state is exportable and cannot be silently overwritten',async()=>{
  const c=await browser.newContext({reducedMotion:'reduce'});await c.addInitScript(()=>localStorage.setItem('career-track:v2','{corrupt'));
  const other=await c.newPage();other.on('pageerror',e=>errors.push(e.message));
  await other.goto('http://127.0.0.1:8084/#/scholarships/country/SA?focus=kaust');await other.waitForSelector('#sch-kaust[open]');
  assert.ok(await other.locator('[data-progress-key="sch-kaust-0"]').isDisabled());
  const downloaded=other.waitForEvent('download');await other.locator('#exportProgress').click();
  const backup=JSON.parse(await readFile(await(await downloaded).path(),'utf8'));assert.equal(backup.raw_recovery,'{corrupt');
  assert.equal(await other.evaluate(()=>localStorage.getItem('career-track:v2')),'{corrupt');await c.close();
 });
 await check('Blocked storage still opens an editable workspace with export and inline import recovery',async()=>{
  const c=await browser.newContext({reducedMotion:'reduce'});
  await c.addInitScript(()=>Object.defineProperty(window,'localStorage',{get(){throw new DOMException('Storage blocked','SecurityError');}}));
  const other=await c.newPage();other.on('pageerror',e=>errors.push(e.message));
  await other.goto('http://127.0.0.1:8084/#/scholarships/country/SA?focus=kaust');await other.waitForSelector('#sch-kaust[open]');
  await other.locator('[data-progress-key="sch-kaust-0"]').check();assert.ok(await other.locator('[data-progress-key="sch-kaust-0"]').isChecked());
  assert.equal(await other.locator('#syncLabel').innerText(),'Not saved — Retry');
  const downloaded=other.waitForEvent('download');await other.locator('#exportProgress').click();
  const backup=JSON.parse(await readFile(await(await downloaded).path(),'utf8'));assert.equal(backup.state.progress['sch-kaust-0'],true);
  await other.locator('#nav [data-view="settings"]').click();await other.locator('[data-preview-import]').click();
  assert.match(await other.locator('#importReport').innerText(),/Browser storage is unavailable/);
  const chooser=other.waitForEvent('filechooser');await other.locator('[data-pick-backup]').click();assert.ok(await chooser);
  await c.close();
 });
 assert.deepEqual(authRequests,[],'No Google or Supabase requests in device mode');
 await context.close();assert.deepEqual(errors,[],'No uncaught browser errors');
 await writeFile(evidence+'/results.json',JSON.stringify({date:new Date().toISOString(),checks,consoleErrors:errors,scope:'No-account device release; no real OAuth or live database needed.'},null,2)+'\n');console.log(checks.length+' browser checks passed');
}finally{await browser.close();servers.forEach(p=>p.kill());}
