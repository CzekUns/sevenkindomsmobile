import {chromium} from 'playwright';
import fs from 'node:fs';
import assert from 'node:assert/strict';
const pageErrors=[];
const browser=await chromium.launch({headless:true,channel:'chrome',args:['--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader']});
const page=await browser.newPage({viewport:{width:1280,height:960}});
page.on('pageerror',e=>pageErrors.push(String(e)));
const dir='mod/sprite-restoration-candidate';
const godDir='mod/god-shadow-candidate';
const civs=['ROMAN','CELT','SAMNITE','ETRUSCAN','MONGOL','IBERIAN','BABYLON','CARTHAGE'];
const gods=['JUPITER','CERNUNNO','MAMERTE','TINIA','TENGRI','NETON','MARDUK','BAAL_HAM'];
try {
 await page.goto('http://127.0.0.1:8765/mod/',{waitUntil:'domcontentloaded',timeout:120000});
 await page.waitForFunction(()=>!document.getElementById('start').hidden,{timeout:180000});
 await page.evaluate(()=>{document.documentElement.requestFullscreen=()=>Promise.resolve()});
 await page.locator('#start').click();
 await page.waitForFunction(()=>window.SevenKingdomsRestoredWalk &&
      ['installed','error'].includes(window.SevenKingdomsRestoredWalk.status),{timeout:90000});
 const state=await page.evaluate(()=>window.SevenKingdomsRestoredWalk);
 assert.equal(state.status,'installed','Restored sprites must be mounted before engine startup: '+JSON.stringify(state));
 assert.equal(state.loaded,17,'All eight human and eight deity sprites plus STD.SET must load');
 const sources=[['/data/RESOURCE/STD.SET',godDir+'/STD.SET'],
                ...civs.map(x=>['/data/SPRITE/'+x+'.SPR',dir+'/'+x+'.SPR']),
                ...gods.map(x=>['/data/SPRITE/'+x+'.SPR',godDir+'/'+x+'.SPR'])];
 for(const [file,filename] of sources){
   const expected=fs.readFileSync(filename);
   const actual=await page.evaluate(path=>{
     const x=Module.FS.readFile(path);
     return {length:x.length,first:Array.from(x.slice(0,16)),last:Array.from(x.slice(-16))};
   },file);
   assert.equal(actual.length,expected.length,'VFS native sprite length '+file);
   assert.deepEqual(actual.first,Array.from(expected.subarray(0,16)),'VFS native sprite prefix '+file);
   assert.deepEqual(actual.last,Array.from(expected.subarray(-16)),'VFS native sprite suffix '+file);
   console.log('RESTORED_VFS',file,actual.length);
 }
 await page.waitForTimeout(750);
 function cpoint(x,y,r){return {x:r.x+x/800*r.width,y:r.y+y/600*r.height}}
 const r=await page.locator('#canvas').boundingBox();
 for(const [x,y] of [[420,230],[420,285],[270,560]]){
   const p=cpoint(x,y,r);
   await page.mouse.click(p.x,p.y,{delay:80});
   await page.waitForTimeout(1150);
 }
 await page.waitForTimeout(21000);
 const fault=await page.locator('#fault').textContent();
 console.log('RESTORED_FAULT',JSON.stringify(fault));
 assert.equal(fault?.trim(),'','Game must remain running after injected sprite/SET patches');
 await page.screenshot({path:'restored-sprite-mod-game.png'});
 assert.deepEqual(pageErrors,[]);
 console.log('RESTORED_GAME_SMOKE_SUCCESS',true);
}finally{console.log('RESTORED_PAGE_ERRORS',JSON.stringify(pageErrors));await browser.close()}
