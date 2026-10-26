/* Landscape mobile navigation. No native game binaries are modified. */
(function () {
  'use strict';
  const game = document.getElementById('canvas');
  // The game normally discards its WebGL drawing buffer after presenting.
  // Keep it readable on touch devices so a minimap-only canvas can magnify
  // the real live minimap without touching the WebAssembly renderer.
  const originalGetContext = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function(type, attrs) {
    if (this === game && /^webgl2?$|^experimental-webgl$/i.test(type) &&
        matchMedia('(pointer:coarse)').matches) {
      attrs = Object.assign({},attrs,{preserveDrawingBuffer:true});
    }
    return originalGetContext.call(this,type,attrs);
  };
  const source = {x:586, y:57, w:204, h:200}; // Seven Kingdoms 800x600 minimap interior.
  const root = document.body;
  const joystick = document.createElement('div');
  joystick.id = 'mobileJoystick';
  joystick.hidden = true;
  joystick.setAttribute('role','group');
  joystick.setAttribute('aria-label','Joystick per scorrere la mappa');
  joystick.innerHTML = '<span class="joy-heading">MAPPA</span><span class="joy-marker joy-n">▲</span><span class="joy-marker joy-s">▼</span><span class="joy-marker joy-w">◀</span><span class="joy-marker joy-e">▶</span><span id="mobileJoyThumb"></span>';
  root.appendChild(joystick);
  const thumb = document.getElementById('mobileJoyThumb');

  const tools = document.createElement('div');
  tools.id = 'mobileMiniTools';
  tools.hidden = true;
  tools.innerHTML = '<span class="mini-label">MINIMAPPA</span><button type="button" id="mobileMiniPlus" aria-label="Ingrandisci minimappa">+</button><output id="mobileMiniLevel">1×</output><button type="button" id="mobileMiniMinus" aria-label="Riduci minimappa" disabled>−</button>';
  root.appendChild(tools);
  const plus = document.getElementById('mobileMiniPlus');
  const minus = document.getElementById('mobileMiniMinus');
  const level = document.getElementById('mobileMiniLevel');

  const lens = document.createElement('canvas');
  lens.id = 'mobileMiniLens';
  lens.hidden = true;
  lens.width = source.w;
  lens.height = source.h;
  lens.setAttribute('role','img');
  lens.setAttribute('aria-label','Minimappa ingrandita: tocca per spostarti, trascina per esplorare');
  root.appendChild(lens);
  const ctx = lens.getContext('2d', {alpha:false});

  let enabled = false;
  let isActive = false;
  let activePointer = null;
  let direction = [];
  let timer = 0;
  let factor = 1;
  let center = {x:source.w/2, y:source.h/2};
  let miniPointer = null;
  let drawPending = 0;

  const codes = {ArrowLeft:37,ArrowUp:38,ArrowRight:39,ArrowDown:40};
  // SDL/Emscripten listens for DOM keyboard events. Keep arrows down while
  // the virtual stick is displaced, and send repeat events for game menus
  // and platforms that react to keydown rather than a polled key state.
  function emit(key, type, repeat) {
    const ev = new KeyboardEvent(type, {
      key:key, code:key, keyCode:codes[key], which:codes[key],
      bubbles:true, cancelable:true, repeat:!!repeat
    });
    window.dispatchEvent(ev);
  }
  function releaseKeys() {
    for (const k of direction) emit(k,'keyup');
    direction = [];
  }
  function changeKeys(next) {
    for (const k of direction) if (!next.includes(k)) emit(k,'keyup');
    for (const k of next) if (!direction.includes(k)) emit(k,'keydown');
    direction = next;
  }
  function joystickMove(e) {
    const r = joystick.getBoundingClientRect();
    const dx = e.clientX-(r.left+r.width/2);
    const dy = e.clientY-(r.top+r.height/2);
    const dist = Math.hypot(dx,dy);
    const max = r.width*0.32;
    const scale = dist > max ? max/dist : 1;
    thumb.style.transform='translate('+Math.round(dx*scale)+'px,'+Math.round(dy*scale)+'px)';
    const threshold = r.width*0.14;
    const next = [];
    if (dx < -threshold) next.push('ArrowLeft');
    if (dx > threshold) next.push('ArrowRight');
    if (dy < -threshold) next.push('ArrowUp');
    if (dy > threshold) next.push('ArrowDown');
    changeKeys(next);
  }
  function stopStick() {
    if (activePointer === null) return;
    activePointer = null;
    joystick.classList.remove('active');
    thumb.style.transform='';
    releaseKeys();
    if (timer) clearInterval(timer);
    timer=0;
  }
  joystick.addEventListener('pointerdown', e=>{
    if (!isActive || activePointer !== null) return;
    e.preventDefault();
    activePointer=e.pointerId;
    try{joystick.setPointerCapture(e.pointerId);}catch(_){}
    joystick.classList.add('active');
    joystickMove(e);
    timer=setInterval(()=>{
      for(const k of direction) emit(k,'keydown',true);
    }, 65);
  });
  joystick.addEventListener('pointermove',e=>{
    if (e.pointerId !== activePointer) return;
    e.preventDefault();
    joystickMove(e);
  });
  for (const type of ['pointerup','pointercancel','lostpointercapture']) {
    joystick.addEventListener(type,e=>{if(e.pointerId === activePointer) stopStick();});
  }

  function showLandscape() {
    return enabled && matchMedia('(pointer:coarse)').matches && window.innerWidth>window.innerHeight;
  }
  function position() {
    const r=game.getBoundingClientRect();
    const size=Math.max(76,Math.min(112,Math.round(window.innerHeight*.275)));
    joystick.style.width=size+'px';
    joystick.style.height=size+'px';
    joystick.style.left=Math.max(7,Math.round((r.left-size)/2))+'px';
    joystick.style.top=Math.round(Math.max(50,(window.innerHeight-size)/2))+'px';
    const tx=r.right + Math.max(7,(window.innerWidth-r.right-48)/2);
    tools.style.left=Math.round(Math.min(window.innerWidth-52,tx))+'px';
    tools.style.top=Math.round(Math.max(65,r.top+r.height*.17))+'px';
    // The image is drawn over the game's minimap only, never over its buttons.
    const xFactor=r.width/game.width,yFactor=r.height/game.height;
    lens.style.left=Math.round(r.left+source.x*xFactor)+'px';
    lens.style.top=Math.round(r.top+source.y*yFactor)+'px';
    lens.style.width=Math.round(source.w*xFactor)+'px';
    lens.style.height=Math.round(source.h*yFactor)+'px';
  }
  function syncVisibility() {
    isActive=showLandscape();
    joystick.hidden=!isActive;
    tools.hidden=!isActive;
    lens.hidden=!isActive||factor===1;
    if (!isActive) stopStick();
    if (isActive) position();
    if (isActive && factor>1) scheduleDraw();
  }
  function normalizeCenter() {
    const halfW=source.w/(2*factor), halfH=source.h/(2*factor);
    center.x=Math.max(halfW,Math.min(source.w-halfW,center.x));
    center.y=Math.max(halfH,Math.min(source.h-halfH,center.y));
  }
  function scheduleDraw() {
    if (drawPending) return;
    drawPending=requestAnimationFrame(draw);
  }
  function draw() {
    drawPending=0;
    if (lens.hidden || !isActive || document.hidden) return;
    normalizeCenter();
    const sw=source.w/factor,sh=source.h/factor;
    ctx.imageSmoothingEnabled=false;
    try {
      ctx.drawImage(game,source.x+center.x-sw/2,source.y+center.y-sh/2,sw,sh,0,0,lens.width,lens.height);
      ctx.fillStyle='rgba(16,13,8,.73)';
      ctx.fillRect(0,0,37,20);
      ctx.font='bold 13px system-ui';
      ctx.fillStyle='#ffe4b0';
      ctx.fillText(factor+'×',6,15);
    } catch(err) { console.warn('Minimap lens unavailable:',err); }
    // Throttled refresh allows the camera/view rectangle to stay current.
    setTimeout(scheduleDraw,110);
  }
  function setMiniZoom(value) {
    factor=Math.max(1,Math.min(4,value));
    normalizeCenter();
    level.textContent=factor+'×';
    minus.disabled=factor===1;
    plus.disabled=factor===4;
    syncVisibility();
  }
  plus.addEventListener('click',()=>setMiniZoom(factor+.5));
  minus.addEventListener('click',()=>setMiniZoom(factor-.5));

  function minimapPoint(e) {
    const r=lens.getBoundingClientRect();
    const u=Math.max(0,Math.min(1,(e.clientX-r.left)/r.width));
    const v=Math.max(0,Math.min(1,(e.clientY-r.top)/r.height));
    return {
      x:Math.max(0,Math.min(source.w,center.x+(u-.5)*source.w/factor)),
      y:Math.max(0,Math.min(source.h,center.y+(v-.5)*source.h/factor))
    };
  }
  function navigateTo(point) {
    const r=game.getBoundingClientRect();
    const clientX=r.left+(source.x+point.x)*r.width/game.width;
    const clientY=r.top+(source.y+point.y)*r.height/game.height;
    const opts={bubbles:true,cancelable:true,clientX,clientY,button:0};
    game.dispatchEvent(new MouseEvent('mousemove',opts));
    game.dispatchEvent(new MouseEvent('mousedown',Object.assign({},opts,{buttons:1})));
    setTimeout(()=>game.dispatchEvent(new MouseEvent('mouseup',opts)),65);
  }
  lens.addEventListener('pointerdown',e=>{
    if (miniPointer) return;
    e.preventDefault();
    miniPointer={id:e.pointerId,x:e.clientX,y:e.clientY,originX:center.x,originY:center.y,moved:false};
    try{lens.setPointerCapture(e.pointerId);}catch(_){}
  });
  lens.addEventListener('pointermove',e=>{
    if (!miniPointer||e.pointerId!==miniPointer.id) return;
    e.preventDefault();
    const dx=e.clientX-miniPointer.x, dy=e.clientY-miniPointer.y;
    if (Math.hypot(dx,dy)>6)miniPointer.moved=true;
    if (miniPointer.moved){
      const r=lens.getBoundingClientRect();
      center.x=miniPointer.originX-dx/r.width*source.w/factor;
      center.y=miniPointer.originY-dy/r.height*source.h/factor;
      normalizeCenter();
      scheduleDraw();
    }
  });
  lens.addEventListener('pointerup',e=>{
    if (!miniPointer||e.pointerId!==miniPointer.id)return;
    e.preventDefault();
    if (!miniPointer.moved) {
      const point=minimapPoint(e);
      navigateTo(point);
      center=point;
      normalizeCenter();
    }
    miniPointer=null;
  });
  lens.addEventListener('pointercancel',()=>{miniPointer=null;});
  lens.addEventListener('lostpointercapture',()=>{miniPointer=null;});

  const originalShow=window.showPhoneControls;
  window.showPhoneControls=function(){
    if (originalShow) originalShow();
    enabled=true;
    syncVisibility();
  };
  window.addEventListener('resize',syncVisibility);
  window.addEventListener('orientationchange',syncVisibility);
  window.addEventListener('blur',stopStick);
  document.addEventListener('visibilitychange',()=>{if(document.hidden)stopStick();else syncVisibility();});

  // Expose diagnostics for automated mobile browser regression tests.
  window.__mobileNavState=()=>({
    enabled,isActive,activePointer,factor,center:{x:center.x,y:center.y},
    direction:direction.slice(),minimapVisible:!lens.hidden
  });
})();
