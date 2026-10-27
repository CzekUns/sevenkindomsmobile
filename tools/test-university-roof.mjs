import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true,channel:'chrome',args:['--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader']});
const page=await browser.newPage({viewport:{width:1280,height:960}});
const errors=[];
page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto('http://127.0.0.1:8765/mod/',{waitUntil:'domcontentloaded',timeout:120000});
 await page.waitForFunction(()=>!document.getElementById('start').hidden,{timeout:180000});
 await page.evaluate(()=>window.__originalFirmBytes=Module.FS.readFile('/data/RESOURCE/I_FIRM.RES'));
 assert.equal((await page.evaluate(()=>SevenKingdomsUniversityRoof.status())).applied,false);
 await page.locator('#start').click();
 await page.waitForTimeout(900);
 const patched=await page.evaluate(()=>{
    const status=SevenKingdomsUniversityRoof.status();
    const before=window.__originalFirmBytes,after=Module.FS.readFile('/data/RESOURCE/I_FIRM.RES');
    let different=0,expected=0,wrong=0;const changes={};
    for(let i=0;i<before.length;i++){
      if(before[i]===after[i])continue;
      different++;
      if((before[i]===210&&after[i]===225)||(before[i]===211&&after[i]===226))expected++;
      else wrong++;
      const k=before[i]+'>'+after[i];changes[k]=(changes[k]||0)+1;
    }
    return {status,originalSize:before.length,patchedSize:after.length,different,expected,wrong,changes};
 });
 console.log('UNIVERSITY_REMAP_CHECK='+JSON.stringify(patched));
 assert.equal(patched.status.applied,true,'University roof patch must activate');
 assert.equal(patched.status.changed,707);
 assert.equal(patched.originalSize,patched.patchedSize);
 assert.equal(patched.different,707);
 assert.equal(patched.wrong,0,'no other building or byte changed');
 assert.equal(patched.expected,707);
 const canvas=page.locator('#canvas'),r=await canvas.boundingBox();
 async function select(x,y){await page.mouse.click(r.x+x/800*r.width,r.y+y/600*r.height,{delay:90})}
 await select(420,230);await page.waitForTimeout(900);
 await select(420,285);await page.waitForTimeout(900);
 await select(270,560);
 await page.waitForTimeout(21000);
 assert.equal((await page.locator('#fault').textContent())?.trim(),'');
 await page.screenshot({path:'university-faction-patch-game.png'});
 assert.deepEqual(errors,[]);
 console.log('UNIVERSITY_PATCH_GAME_OK=true');
}finally{
 console.log('UNIVERSITY_PAGE_ERRORS='+JSON.stringify(errors));
 await browser.close();
}
