import {chromium,devices} from 'playwright';
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true,channel:'chrome',args:['--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader']});
const errors=[];
const page=await browser.newPage({...devices['Pixel 5']});
page.on('pageerror',e=>errors.push(String(e)));
try {
  await page.goto('http://127.0.0.1:8765/mod/',{waitUntil:'domcontentloaded',timeout:120000});
  await page.waitForFunction(()=>document.getElementById('start').hidden===false,{timeout:180000});
  assert.equal(await page.locator('#barFill').evaluate(x=>x.style.width),'100%');
  assert.equal(await page.locator('#retry').isVisible(),false);
  console.log('MOBILE_BOOT_READY',await page.locator('#status').textContent());
  await page.locator('#start').click();
  await page.waitForFunction(()=>window.SevenKingdomsRestoredWalk &&
      ['installed','error'].includes(window.SevenKingdomsRestoredWalk.status),{timeout:90000});
  assert.equal(await page.evaluate(()=>window.SevenKingdomsRestoredWalk.status),'installed');
  console.log('MOBILE_GAME_LAUNCHED',true);
  const broken=await browser.newPage({...devices['Pixel 5']});
  try {
    await broken.route('**/mod/data/SPRITE.data',route=>route.abort('failed'));
    await broken.goto('http://127.0.0.1:8765/mod/',{waitUntil:'domcontentloaded',timeout:120000});
    await broken.waitForFunction(()=>document.getElementById('retry').hidden===false,{timeout:25000});
    assert.match(await broken.locator('#fault').textContent(),/Download|Errore|connessione|caricamento/i);
    console.log('MOBILE_NETWORK_ERROR_VISIBLE',await broken.locator('#fault').textContent());
    await broken.locator('#retry').click();
    await broken.waitForTimeout(1000);
    console.log('MOBILE_RETRY_INTERACTIVE',true);
  } finally {await broken.close();}
  assert.deepEqual(errors,[]);
}finally {await browser.close();}
