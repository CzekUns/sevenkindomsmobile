// Read-only runtime probe: do not change WASM memory or settings.
import { chromium } from 'playwright';

const browser = await chromium.launch({headless: true, args:['--disable-dev-shm-usage']});
const page = await browser.newPage({viewport:{width:1280,height:960}});
const errors = [];
page.on('pageerror', e => errors.push('page: ' + String(e)));
page.on('console', m => { if (['error','warning'].includes(m.type())) errors.push(m.type() + ': ' + m.text().slice(0,250)); });
page.on('requestfailed', r => errors.push('request: ' + r.url() + ' ' + r.failure()?.errorText));
async function probe(phase) {
  const o = await page.evaluate(() => {
    const h = typeof HEAPU8 !== 'undefined' ? HEAPU8 : null;
    const result = {
      heapBytes:h?.length || 0, modKeys:typeof Module !== 'undefined' ? Object.keys(Module).filter(x => /main|memory|wasm|FS|ready/i.test(x)) : [],
      cwd: (() => { try { return FS.cwd(); } catch { return null; } })(),
      config: (() => { try { return FS.readdir('/saves-mod'); } catch { return null; } })(),
      root: (() => { try { return FS.readdir('/'); } catch { return null; } })(),
      matches: []
    };
    if (!h) return result;
    let pos = 0;
    let candidateCount = 0;
    while ((pos = h.indexOf(1, pos)) !== -1) {
      if (pos > h.length-36) break;
      let same = true;
      for (let i = 1; i < 12; i++) { if (h[pos+i] !== i+1) {same=false;break;} }
      if (same) {
        candidateCount++;
        if (result.matches.length < 60) {
          const bytes = Array.from(h.subarray(pos, pos+36));
          const counters = [];
          for (const offset of [12, 16, 20, 24]) {
            const value = h[pos+offset] + h[pos+offset+1]*256 + h[pos+offset+2]*65536 + h[pos+offset+3]*16777216;
            if (value >= 1 && value <= 24) counters.push([offset,value]);
          }
          result.matches.push({offset:pos, aligned:pos%4 === 0, bytes, counters});
        }
      }
      pos++;
    }
    result.totalCandidates = candidateCount;
    return result;
  });
  console.log('SPAWN_PROBE_' + phase + '=' + JSON.stringify(o));
}
try {
  await page.goto('http://127.0.0.1:8765/mod/', {timeout:120000, waitUntil:'domcontentloaded'});
  await page.waitForFunction(() => { const btn=document.getElementById('start');return btn && !btn.hidden; }, {timeout:160000});
  console.log('READY_STATUS=' + await page.locator('#status').textContent());
  await probe('READY');
  await page.screenshot({path:'probe-before.png'});
  await page.locator('#start').click({timeout:10000});
  await page.waitForTimeout(5000);
  await probe('AFTER_MAIN');
  console.log('FAULT=' + await page.locator('#fault').textContent());
  await page.screenshot({path:'probe-after.png'});
  const canvas = page.locator('#canvas');
  const menuJpeg = await canvas.screenshot({type:'jpeg',quality:35});
  console.log('SPAWN_SCREEN_MENU=' + menuJpeg.toString('base64'));
  await canvas.click({position:{x:670,y:371}});
  await page.waitForTimeout(1200);
  console.log('SPAWN_SCREEN_SINGLE_PLAYER=' + (await canvas.screenshot({type:'jpeg',quality:35})).toString('base64'));
  await canvas.click({position:{x:670,y:371}});
  await page.waitForTimeout(2000);
  console.log('SPAWN_SCREEN_NEW_GAME=' + (await canvas.screenshot({type:'jpeg',quality:35})).toString('base64'));
  await probe('AFTER_CLICK_NEW');
} finally {
  console.log('BROWSER_ERRORS=' + JSON.stringify(errors.slice(-20)));
  await browser.close();
}
