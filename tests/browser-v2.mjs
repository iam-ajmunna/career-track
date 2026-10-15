// Uses a local synthetic backend only. Supply CT_CHROMIUM_PATH for an existing Chromium binary.
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
 const localServer=await start('scripts/dev.mjs',8084);
 const context=await browser.newContext({viewport:{width:1440,height:960},reducedMotion:'reduce'});
 const page=await context.newPage();diagnosticPage=page;page.on('pageerror',e=>{errors.push(e.message);console.error('PAGE ERROR:',e.message);});
 await page.goto('http://127.0.0.1:8084');await page.waitForSelector('#appShell:not([hidden])');
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
 await context.close();localServer.kill();
 await start('tests/browser-fixture.mjs',8085);
 const cloud=await browser.newContext({viewport:{width:1440,height:960},reducedMotion:'reduce'}),p=await cloud.newPage();diagnosticPage=p;p.on('pageerror',e=>{errors.push(e.message);console.error('PAGE ERROR:',e.message);});
 await p.goto('http://127.0.0.1:8085/fixture');await p.locator('#owner').click();await p.waitForFunction(()=>document.querySelector('#syncLabel')?.textContent==='Saved');
 await check('Cloud pins and ticks survive refresh and a clean second browser',async()=>{
  await p.goto('http://127.0.0.1:8085/#/scholarships/country/SA?focus=kaust');await p.waitForSelector('#sch-kaust[open]');await p.locator('[data-toggle-working="kaust"]').click();await p.locator('[data-progress-key="sch-kaust-0"]').check();await p.waitForFunction(()=>document.querySelector('#syncLabel').textContent==='Saved');await p.reload();await p.waitForSelector('#sch-kaust[open]');assert.ok(await p.locator('[data-progress-key="sch-kaust-0"]').isChecked());
  const c=await browser.newContext({reducedMotion:'reduce'}),other=await c.newPage();await other.goto('http://127.0.0.1:8085/fixture');await other.locator('#owner').click();await other.waitForSelector('#appShell:not([hidden])');await other.goto('http://127.0.0.1:8085/#/scholarships/country/SA?focus=kaust');await other.waitForSelector('#sch-kaust[open]');assert.ok(await other.locator('[data-progress-key="sch-kaust-0"]').isChecked());assert.equal(await other.locator('[data-toggle-working="kaust"]').getAttribute('aria-pressed'),'true');await c.close();
 });
 await check('Failed write retains pending tick; Retry confirms save',async()=>{
  await p.request.post('http://127.0.0.1:8085/fixture/failure',{form:{mode:'fail'}});await p.locator('[data-progress-key="sch-kaust-1"]').check();await p.waitForFunction(()=>document.querySelector('#syncLabel').textContent==='Failed — Retry');assert.ok(await p.locator('#syncRetry').isVisible());await p.request.post('http://127.0.0.1:8085/fixture/failure',{form:{mode:'success'}});await p.locator('#syncRetry').click();await p.waitForFunction(()=>document.querySelector('#syncLabel').textContent==='Saved');
 });
 await check('Other account cannot read owner workspace',async()=>{
  const c=await browser.newContext(),other=await c.newPage();await other.goto('http://127.0.0.1:8085/fixture');await other.locator('#other').click();await other.waitForFunction(()=>document.querySelector('#authTitle')?.textContent==='Account not provisioned');assert.ok(await other.locator('#appShell').isHidden());await c.close();
 });
 await cloud.close();assert.deepEqual(errors,[],'No uncaught browser errors');
 await writeFile(evidence+'/results.json',JSON.stringify({date:new Date().toISOString(),checks,consoleErrors:errors,scope:'Synthetic local fixture; real owner OAuth/device acceptance is separate.'},null,2)+'\n');console.log(checks.length+' browser checks passed');
}finally{await browser.close();servers.forEach(p=>p.kill());}
