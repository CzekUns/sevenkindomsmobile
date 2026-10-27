import {chromium} from 'playwright';
import fs from 'node:fs';
const browser=await chromium.launch({headless:true,channel:'chrome',args:['--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader']});
const page=await browser.newPage();
try{
 await page.goto('http://127.0.0.1:8765/mod/',{waitUntil:'domcontentloaded',timeout:140000});
 await page.waitForFunction(()=>!document.getElementById('start').hidden,{timeout:180000});
 fs.mkdirSync('restoration-source-all',{recursive:true});
 const frame=await page.evaluate(()=>Array.from(Module.FS.readFile('/data/SPRITE/EGYPTIAN.SPR')));
 fs.writeFileSync('restoration-source-all/EGYPTIAN.SPR',Buffer.from(frame));
 console.log('AUTHENTIC_EGYPTIAN_SPR_EXPORTED',frame.length);
}finally{await browser.close();}
