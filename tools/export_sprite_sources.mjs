import {chromium} from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const dest='restoration-source';
fs.mkdirSync(dest,{recursive:true});
const browser=await chromium.launch({headless:true,channel:'chrome',args:['--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader']});
const page=await browser.newPage();
try{
 await page.goto('http://127.0.0.1:8765/mod/',{waitUntil:'domcontentloaded',timeout:150000});
 await page.waitForFunction(()=>!document.getElementById('start').hidden,{timeout:210000});
 const races=['ROMAN','CELT','SAMNITE','ETRUSCAN','MONGOL','IBERIAN','BABYLON','CARTHAGE'];
 const list=races.map(x=>['/data/SPRITE/'+x+'.SPR',x+'.SPR']);
 list.push(['/data/RESOURCE/STD.SET','STD.SET']);
 for(const [gamePath,filename] of list){
  const bytes=await page.evaluate(file=>{
    return Array.from(Module.FS.readFile(file));
  },gamePath);
  fs.writeFileSync(path.join(dest,filename),Buffer.from(bytes));
  console.log('EXPORTED',filename,bytes.length);
 }
}finally{await browser.close();}
