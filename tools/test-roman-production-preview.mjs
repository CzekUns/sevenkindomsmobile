import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {chromium} from 'playwright';

// Production contract: the ordinary MOD uses unchanged assets, the optional
// preview query changes ONLY ROMAN.SPR + its matching STD.SET.
const origin='http://127.0.0.1:8765/mod/';
const browser=await chromium.launch({headless:true,channel:'chrome',
  args:['--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader']});
const races=['ROMAN','CELT','SAMNITE','ETRUSCAN','MONGOL','IBERIAN','BABYLON','CARTHAGE'];
const gods=['JUPITER','CERNUNNO','MAMERTE','TINIA','TENGRI','NETON','MARDUK','BAAL_HAM'];
const expectedAssets=(experimental)=>[
 ['/data/RESOURCE/STD.SET',
  experimental?'mod/roman-preview/STD.SET':'mod/god-shadow-candidate/STD.SET'],
 ...races.map(n=>['/data/SPRITE/'+n+'.SPR',
 experimental&&n==='ROMAN'?'mod/roman-preview/ROMAN.SPR':
 'mod/sprite-restoration-candidate/'+n+'.SPR']),
 ...gods.map(n=>['/data/SPRITE/'+n+'.SPR','mod/god-shadow-candidate/'+n+'.SPR'])
];
async function testMode(experimental){
 const errors=[];
 const page=await browser.newPage({viewport:{width:1280,height:960}});
 page.on('pageerror',e=>errors.push(String(e)));
 const url=origin+(experimental?'?roman_test=1':'');
 try {
  await page.goto(url,{waitUntil:'domcontentloaded',timeout:120000});
  await page.waitForFunction(()=>!document.getElementById('start').hidden,
                              {timeout:180000});
  await page.evaluate(()=>{document.documentElement.requestFullscreen=()=>Promise.resolve()});
  await page.locator('#start').click();
  await page.waitForFunction(()=>['installed','error'].includes(
      window.SevenKingdomsRestoredWalk?.status),{timeout:100000});
  const state=await page.evaluate(()=>window.SevenKingdomsRestoredWalk);
  assert.equal(state.status,'installed',JSON.stringify(state));
  assert.equal(state.romanPreview,experimental,'Preview toggle must be explicit');
  assert.equal(state.loaded,17);
  for(const [target,filename] of expectedAssets(experimental)){
   const bytes=fs.readFileSync(filename);
   const originalHash=crypto.createHash('sha256').update(bytes).digest('hex');
   const browserHash=await page.evaluate(async filepath=>{
      const arr=Module.FS.readFile(filepath);
      const hash=await crypto.subtle.digest('SHA-256',arr);
      return Array.from(new Uint8Array(hash),b=>b.toString(16).padStart(2,'0')).join('');
   },target);
   assert.equal(browserHash,originalHash,filename+' differs in VFS');
  }
  await page.waitForTimeout(4500);
  const fault=await page.locator('#fault').textContent();
  assert.equal(fault?.trim(),'','No fault allowed on game boot');
  assert.deepEqual(errors,[]);
  console.log('ROMAN_PREVIEW_BOOT_OK',JSON.stringify({
    experimental,checks:17,roman:experimental?'experimental':'stable',status:state.status
  }));
 } finally {await page.close();}
}
try{
 await testMode(false);
 await testMode(true);
}finally{await browser.close();}
