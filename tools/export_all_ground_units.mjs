import {chromium} from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
const root='restoration-source-all';
fs.mkdirSync(root,{recursive:true});
const packageSource=fs.readFileSync('mod/data/SPRITE.js','utf8');
const names=[...new Set([...packageSource.matchAll(/\/data\/SPRITE\/([A-Z0-9_]+\.SPR)/g)].map(x=>x[1]))].sort();
const browser=await chromium.launch({headless:true,channel:'chrome',args:['--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader']});
const page=await browser.newPage();
try{
 await page.goto('http://127.0.0.1:8765/mod/',{waitUntil:'domcontentloaded',timeout:140000});
 await page.waitForFunction(()=>!document.getElementById('start').hidden,{timeout:180000});
 for(const name of names){
    const data=await page.evaluate(n=>Array.from(Module.FS.readFile('/data/SPRITE/'+n)),name);
    fs.writeFileSync(path.join(root,name),Buffer.from(data));
    console.log('ASSET',name,data.length);
 }
 const std=await page.evaluate(()=>Array.from(Module.FS.readFile('/data/RESOURCE/STD.SET')));
 fs.writeFileSync(path.join(root,'STD.SET'),Buffer.from(std));
 console.log('EXPORTED_ARCHIVES',names.length);
}finally{await browser.close();}
