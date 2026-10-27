import {chromium} from 'playwright';
import fs from 'node:fs';
import assert from 'node:assert/strict';
const pageErrors=[];
const browser=await chromium.launch({headless:true,channel:'chrome',args:['--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader']});
const page=await browser.newPage({viewport:{width:1280,height:960}});
page.on('pageerror',e=>pageErrors.push(String(e)));
const dir='mod/sprite-restoration-candidate';
const civs=['ROMAN','CELT','SAMNITE','ETRUSCAN','MONGOL','IBERIAN','BABYLON','CARTHAGE'];
try {
 await page.goto('http://127.0.0.1:8765/mod/',{waitUntil:'domcontentloaded',timeout:120000});
 await page.waitForFunction(()=>!document.getElementById('start').hidden,{timeout:180000});
 const files=[['/data/RESOURCE/STD.SET',fs.readFileSync(dir+'/STD.SET')],
             ...civs.map(x=>['/data/SPRITE/'+x+'.SPR',fs.readFileSync(dir+'/'+x+'.SPR')])];
 for(const [path,bytes] of files){
   const result=await page.evaluate(({target,raw})=>{
     const data=Uint8Array.from(raw);
     let meta=null;
     try {
       const stat=Module.FS.stat(target);
       meta={mode:stat.mode,permissions:Module.FS.nodePermissions(Module.FS.lookupPath(target).node,'w')};
       Module.FS.unlink(target);
       Module.FS.writeFile(target,data);
     } catch(e) {
       return {error:String(e),errno:e.errno,meta};
     }
     const check=Module.FS.readFile(target);
     return {length:check.length,first:Array.from(check.slice(0,8)),meta};
   },{target:path,raw:Array.from(bytes)});
   console.log('RESTORED_VFS_INFO',path,JSON.stringify(result));
   assert.equal(result.length,bytes.length,'VFS replacement byte count');
   console.log('RESTORED_VFS',path,result.length);
 }
 await page.evaluate(()=>{document.documentElement.requestFullscreen=()=>Promise.resolve()});
 await page.locator('#start').click();
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
