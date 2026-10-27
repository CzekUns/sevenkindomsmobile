import {chromium} from 'playwright';
import assert from 'node:assert/strict';

const browser=await chromium.launch({headless:true,args:['--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader']});
const context=await browser.newContext({viewport:{width:844,height:390},hasTouch:true,isMobile:true,deviceScaleFactor:1});
const page=await context.newPage();
const errors=[];
page.on('pageerror',e=>errors.push('page:'+e.message));
page.on('requestfailed',req=>errors.push('request:'+req.url()));
async function canvasTap(x,y){
  const r=await page.locator('#canvas').boundingBox();
  await page.mouse.click(r.x+x/800*r.width,r.y+y/600*r.height,{delay:80});
}
try{
  for(const route of ['mod/','']){
    const label=route?'mod':'original';
    await page.goto('http://127.0.0.1:8765/'+route,{waitUntil:'domcontentloaded',timeout:120000});
    await page.waitForFunction(()=>!document.getElementById('start').hidden,{timeout:180000});
    await page.evaluate(()=>{document.documentElement.requestFullscreen=()=>Promise.resolve();});
    assert.equal(await page.locator('#skMobileNews').isHidden(),true);
    await page.locator('#start').click();
    await page.waitForTimeout(900);
    assert.equal(await page.locator('#skMobileNews').isVisible(),true);
    assert.equal((await page.evaluate(()=>SevenKingdomsMobileNews.state())).expanded,true);
    await canvasTap(420,230);
    await page.waitForTimeout(900);
    await canvasTap(420,285);
    await page.waitForTimeout(1000);
    await canvasTap(270,560);
    await page.waitForTimeout(24000);
    const nativeSample=await page.evaluate(()=>{
      const lens=document.getElementById('skNewsImage');
      const pixels=lens.getContext('2d').getImageData(0,0,lens.width,lens.height).data;
      const palette=new Set();
      for(let y=5;y<lens.height;y+=8)for(let x=10;x<lens.width;x+=8){
        const i=4*(y*lens.width+x);
        palette.add(pixels[i]+'-'+pixels[i+1]+'-'+pixels[i+2]);
      }
      return palette.size;
    });
    console.log('NATIVE_NEWS_PIXELS_'+label+'='+nativeSample);
    assert.ok(nativeSample>20,'magnified native news must contain actual game pixels');
    await page.screenshot({path:'mobile-news-'+label+'.png'});
    // Native magnified message must forward a real game click to the native
    // x=13 go/reply icon, not a simulated UI notification.
    await page.evaluate(()=>{
      window.__newsClicks=[];
      const c=document.getElementById('canvas');
      c.addEventListener('mousedown',e=>{
        window.__newsClicks.push({x:e.clientX,y:e.clientY});
      },true);
    });
    await page.locator('#skNewsImage').click({position:{x:110,y:35}});
    const coords=await page.evaluate(()=>{
      const c=document.getElementById('canvas').getBoundingClientRect();
      return {bounds:{x:c.left,y:c.top,w:c.width,h:c.height},clicks:window.__newsClicks};
    });
    const nativeX=(coords.clicks.at(-1).x-coords.bounds.x)/coords.bounds.w*800;
    assert.ok(Math.abs(nativeX-13)<1,'HUD click must target native news GO icon');
    // An unsupported event must be rejected.
    assert.equal(await page.evaluate(()=>SevenKingdomsMobileNews.publish({type:'unknown',text:'invented'})),false);
    const newEvent={
      type:'construction-complete',
      id:'test-'+label,
      text:'Test tecnico: edificio completato',
      location:{x:40,y:45,mapSize:route?400:200}
    };
    assert.equal(await page.evaluate(e=>SevenKingdomsMobileNews.publish(e),newEvent),true);
    assert.equal(await page.evaluate(e=>SevenKingdomsMobileNews.publish(e),newEvent),false,'deduplicate engine events');
    await page.locator('#skInboxTab').click();
    assert.equal(await page.locator('.skNewsItem').count(),1);
    assert.equal(await page.locator('#skNewsInbox').textContent().then(t=>t.includes('Test tecnico: edificio completato')),true);
    await page.locator('.skNewsItem button').click();
    const clicks=await page.evaluate(()=>window.__newsClicks);
    const gameRect=coords.bounds;
    const latestX=(clicks.at(-1).x-gameRect.x)/gameRect.w*800;
    assert.ok(latestX>=586&&latestX<=790,'completion alert GO must map to original minimap');
    await page.locator('#skNewsToggle').click();
    assert.equal(await page.locator('#skMobileNews').getAttribute('data-collapsed'),'true');
    await page.locator('#skNewsToggle').click();
    await page.locator('#skNewsTab').click();
    console.log('MOBILE_NEWS_OK_'+label+'=true');
  }
  assert.deepEqual(errors,[]);
}finally{
  console.log('ERRORS='+JSON.stringify(errors));
  await browser.close();
}
