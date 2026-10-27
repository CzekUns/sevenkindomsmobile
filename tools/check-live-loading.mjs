import { chromium, devices } from 'playwright';
import fs from 'node:fs';
const base = process.env.GAME_URL || 'https://czekuns.github.io/sevenkindomsmobile/mod/';
const phone = devices['Pixel 5'];
const browser=await chromium.launch({headless:true,channel:'chrome',args:['--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader']});
const page=await browser.newPage({...phone,ignoreHTTPSErrors:true});
const events=[], responses=[];
page.on('console',m=>{if(m.type()==='error')events.push('CONSOLE '+m.text().slice(0,700))});
page.on('pageerror',e=>events.push('PAGEERROR '+String(e).slice(0,1000)));
page.on('requestfailed',req=>events.push('FAILED '+req.url()+' '+(req.failure()?.errorText||'')));
page.on('response',r=>{if(!r.ok())responses.push('HTTP '+r.status()+' '+r.url())});
try {
 await page.goto(base,{waitUntil:'domcontentloaded',timeout:120000});
 const beginning=Date.now();
 let success=false;
 while(Date.now()-beginning<120000) {
    const state=await page.evaluate(()=>({
      status:document.querySelector('#status')?.textContent,
      fault:document.querySelector('#fault')?.textContent,
      button:document.querySelector('#start')?.hidden===false,
      bar:document.querySelector('#barFill')?.style.width,
      dependencies:typeof Module!=='undefined'&&Module?.dataFileDownloads ? Object.fromEntries(Object.entries(Module.dataFileDownloads).map(([k,v])=>[k.split('/').pop(),v])):null,
      ready:typeof Module!=='undefined' && !!Module.FS && !!Module.FS.readFile,
      expected:Module?.expectedDataFileDownloads,
      dataPackageCount:Module?.finishedDataFileDownloads
    }));
    console.log('LIVE_LOAD '+Math.round((Date.now()-beginning)/1000)+'s '+JSON.stringify(state));
    if(state.button){success=true;break;}
    if(state.fault){break;}
    await page.waitForTimeout(5000);
 }
 await page.screenshot({path:'live-loading-diagnostic.png'});
 console.log('LIVE_RESPONSES',JSON.stringify(responses.slice(0,50)));
 console.log('LIVE_ERRORS',JSON.stringify(events.slice(0,50)));
 console.log('LIVE_READY',success);
 if(!success)process.exitCode=2;
}finally {await browser.close()}
