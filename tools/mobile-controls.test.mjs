import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const errors=[];
const browser=await chromium.launch({headless:true,args:['--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader']});
const context=await browser.newContext({viewport:{width:844,height:390},hasTouch:true,isMobile:true,deviceScaleFactor:1});
const page=await context.newPage();
page.on('pageerror',e=>errors.push(String(e)));
page.on('requestfailed',r=>errors.push(r.url()+' '+r.failure()?.errorText));
async function pointOnCanvas(x,y) {
 const r=await page.locator('#canvas').boundingBox();
 return {x:r.x+(x/800)*r.width,y:r.y+(y/600)*r.height};
}
async function clickCanvas(x,y) {
 const p=await pointOnCanvas(x,y);
 await page.mouse.click(p.x,p.y,{delay:80});
}
async function checkRoute(route) {
 await page.goto('http://127.0.0.1:8765/'+route,{waitUntil:'domcontentloaded',timeout:120000});
 await page.waitForFunction(()=>!document.getElementById('start').hidden,{timeout:180000});
 await page.evaluate(()=>{document.documentElement.requestFullscreen=()=>Promise.resolve();});
 assert.equal(await page.locator('#mobileJoystick').isHidden(),true,'joystick should be hidden until game starts');
 await page.locator('#start').click();
 await page.waitForTimeout(1100);
 let info=await page.evaluate(()=>window.__mobileNavState());
 console.log('MOBILE_READY_'+(route||'original')+'='+JSON.stringify(info));
 assert.equal(info.isActive,true,'landscape controls should be active');
 const joy=await page.locator('#mobileJoystick').boundingBox();
 const game=await page.locator('#canvas').boundingBox();
 const plus=await page.locator('#mobileMiniPlus').boundingBox();
 assert.ok(joy.x+joy.width <=game.x,'joystick must fit entirely in the left gutter');
 assert.ok(plus.x>=game.x+game.width,'minimap tools must fit in the right gutter');
 await page.screenshot({path:'mobile-'+(route?'mod':'original')+'-controls.png'});
 const center={x:joy.x+joy.width/2,y:joy.y+joy.height/2};
 await page.mouse.move(center.x+joy.width*.28,center.y);
 await page.mouse.down();
 await page.waitForTimeout(260);
 info=await page.evaluate(()=>window.__mobileNavState());
 assert.ok(info.direction.includes('ArrowRight'),'joystick must issue ArrowRight');
 await page.mouse.up();
 info=await page.evaluate(()=>window.__mobileNavState());
 assert.equal(info.direction.length,0,'joystick must release keys');
 await page.locator('#mobileMiniPlus').click();
 await page.waitForTimeout(900);
 info=await page.evaluate(()=>window.__mobileNavState());
 console.log('MINIMAP_ZOOM_'+(route||'original')+'='+JSON.stringify(info));
 assert.equal(info.factor,1.5);
 assert.equal(info.minimapVisible,true);
 assert.equal(await page.locator('#mobileMiniMinus').isEnabled(),true);
 const pixels=await page.evaluate(()=>{
  const c=document.getElementById('mobileMiniLens');
  const data=c.getContext('2d').getImageData(0,0,c.width,c.height).data;
  let set=new Set();
  for(let y=12;y<c.height;y+=9)for(let x=10;x<c.width;x+=9) {
   const i=(y*c.width+x)*4;
   set.add(data[i]+','+data[i+1]+','+data[i+2]);
  }
  return {uniqueColors:set.size,canvasWidth:c.width,canvasHeight:c.height};
 });
 console.log('MINIMAP_PIXELS_'+(route||'original')+'='+JSON.stringify(pixels));
 assert.ok(pixels.uniqueColors>12,'minimap crop must render game image, not blank');
 await page.locator('#mobileMiniPlus').click();
 assert.equal((await page.evaluate(()=>window.__mobileNavState())).factor,2);
 const before=(await page.evaluate(()=>window.__mobileNavState())).center;
 const mini=await page.locator('#mobileMiniLens').boundingBox();
 await page.mouse.move(mini.x+mini.width*.5,mini.y+mini.height*.5);
 await page.mouse.down();
 await page.mouse.move(mini.x+mini.width*.22,mini.y+mini.height*.35,{steps:8});
 await page.mouse.up();
 const after=(await page.evaluate(()=>window.__mobileNavState())).center;
 assert.ok(Math.abs(before.x-after.x)>8,'dragging lens must pan magnified minimap');
 await page.locator('#mobileMiniMinus').click();
 await page.locator('#mobileMiniMinus').click();
 assert.equal((await page.evaluate(()=>window.__mobileNavState())).factor,1);
 assert.equal(await page.locator('#mobileMiniLens').isHidden(),true);
 // Go into a real single-player game to test the image and the joystick in-game.
 await clickCanvas(420,230);
 await page.waitForTimeout(900);
 await clickCanvas(420,285);
 await page.waitForTimeout(1100);
 await clickCanvas(270,560);
 await page.waitForTimeout(24000);
 const fault=await page.locator('#fault').textContent();
 assert.equal(fault?.trim(),'');
 await page.screenshot({path:'mobile-'+(route?'mod':'original')+'-game.png'});
 const grabFrame=()=>page.evaluate(()=>{
   const main=document.getElementById('canvas');
   const off=document.createElement('canvas');
   off.width=84;off.height=68;
   const ctx=off.getContext('2d',{willReadFrequently:true});
   ctx.drawImage(main,85,135,420,340,0,0,84,68);
   return Array.from(ctx.getImageData(0,0,84,68).data);
 });
 const difference=(a,b)=>{
   let changed=0;
   for(let i=0;i<a.length;i+=4){
     if(Math.abs(a[i]-b[i])+Math.abs(a[i+1]-b[i+1])+Math.abs(a[i+2]-b[i+2])>60) changed++;
   }
   return changed/(a.length/4);
 };
 const stillA=await grabFrame();
 await page.waitForTimeout(1000);
 const stillB=await grabFrame();
 const navJoy=await page.locator('#mobileJoystick').boundingBox();
 await page.mouse.move(navJoy.x+navJoy.width*.8,navJoy.y+navJoy.height*.5);
 await page.mouse.down();
 await page.waitForTimeout(1750);
 await page.mouse.up();
 await page.waitForTimeout(250);
 const moved=await grabFrame();
 console.log('CAMERA_MOTION_'+(route||'original')+'='+JSON.stringify({idleDifference:difference(stillA,stillB),joystickDifference:difference(stillB,moved)}));
 const panBefore=await grabFrame();
 function mouseDrag(type,x,y,buttons) {
   return page.evaluate(({type,x,y,buttons})=>{
     const c=document.getElementById('canvas'),r=c.getBoundingClientRect();
     c.dispatchEvent(new MouseEvent(type,{bubbles:true,cancelable:true,button:2,
       buttons,clientX:r.left+x/800*r.width,clientY:r.top+y/600*r.height}));
   },{type,x,y,buttons});
 }
 await mouseDrag('mousemove',320,340,0);
 await mouseDrag('mousedown',320,340,2);
 for(let n=1;n<=15;n++) {
   await mouseDrag('mousemove',320-n*10,340,2);
   await page.waitForTimeout(70);
 }
 await mouseDrag('mouseup',170,340,0);
 await page.waitForTimeout(200);
 const panAfter=await grabFrame();
 console.log('RIGHT_DRAG_MOTION_'+(route||'original')+'='+JSON.stringify({difference:difference(panBefore,panAfter)}));
 await page.screenshot({path:'mobile-'+(route?'mod':'original')+'-after-joystick.png'});
 await page.locator('#mobileMiniPlus').click();
 await page.waitForTimeout(900);
 await page.screenshot({path:'mobile-'+(route?'mod':'original')+'-minimap-zoom.png'});
 console.log('MOBILE_TEST_OK_'+(route||'original')+'=true');
}
try {
 await checkRoute('mod/');
 await checkRoute('');
 assert.deepEqual(errors,[]);
} finally {
 console.log('MOBILE_ERRORS='+JSON.stringify(errors.slice(0,20)));
 await browser.close();
}
