/* Mobile notice magnifier and actionable game-event inbox.
 * The magnifier reflects the ORIGINAL news strip, including location and
 * diplomacy icons. No OCR or invented game events.
 *
 * Native completions require a game-engine bridge; an explicit publish API
 * below accepts ONLY actual, verified completion events.
 */
(function () {
  'use strict';
  const canvas=document.getElementById('canvas');
  const isMod=/\/mod\/?$/.test(location.pathname);
  const logical={x:0,y:502,width:562,height:95};
  const mini={x:586,y:57,width:204,height:200};
  let started=false, open=false, activeTab='news', focusY=579;
  let timer=null, newCount=0;
  const inbox=[],MAX_ALERTS=40;

  const dock=document.createElement('aside');
  dock.id='skMobileNews';
  dock.hidden=true;
  dock.dataset.collapsed='false';
  dock.setAttribute('aria-label','Notifiche e messaggi di gioco');
  dock.innerHTML='<header id="skNewsHead">'+
    '<strong>🔔 AVVISI <small id="skNewsAlertCount" hidden>0</small></strong>'+
    '<button id="skNewsTab" type="button">Messaggi</button>'+
    '<button id="skInboxTab" type="button">Eventi</button>'+
    '<button id="skNewsGo" type="button" aria-label="Vai al messaggio">↗ Vai</button>'+
    '<button id="skNewsToggle" type="button" aria-label="Riduci o espandi avvisi">▾</button>'+
    '</header>'+
    '<canvas id="skNewsImage" width="562" height="95" aria-label="Messaggi di gioco ingranditi. Tocca l’icona a sinistra di un messaggio per aprirlo o raggiungere il luogo." title="Tocca un avviso per raggiungerlo"></canvas>'+
    '<section id="skNewsInbox" hidden aria-label="Eventi del gioco"></section>';
  document.body.appendChild(dock);
  const zoom=dock.querySelector('#skNewsImage');
  const output=zoom.getContext('2d',{alpha:false});
  const inboxEl=dock.querySelector('#skNewsInbox');
  const countEl=dock.querySelector('#skNewsAlertCount');
  const go=dock.querySelector('#skNewsGo');
  const newsTab=dock.querySelector('#skNewsTab');
  const inboxTab=dock.querySelector('#skInboxTab');
  const toggle=dock.querySelector('#skNewsToggle');

  function available(){return started && matchMedia('(pointer:coarse)').matches &&
    innerWidth>innerHeight && !document.hidden;}
  function updateView(){
    dock.hidden=!available();
    dock.dataset.collapsed=String(!open);
    zoom.hidden=activeTab!=='news';
    inboxEl.hidden=activeTab!=='inbox';
    newsTab.setAttribute('aria-pressed',String(activeTab==='news'));
    inboxTab.setAttribute('aria-pressed',String(activeTab==='inbox'));
    go.hidden=activeTab!=='news';
    toggle.textContent=open?'▾':'▴';
    countEl.textContent=String(newCount);
    countEl.hidden=newCount===0;
    if(available() && open && activeTab==='news') scheduleRender();
  }
  function scheduleRender(){
    if(timer!==null)return;
    timer=setTimeout(render,175);
  }
  function render(){
    timer=null;
    if(!available()||!open||activeTab!=='news')return;
    // Capture game pixels: preserves native text, icons, ordering, and names.
    // Mobile joystick layer enables preserveDrawingBuffer on the game's WebGL context.
    try{
      output.imageSmoothingEnabled=false;
      output.drawImage(canvas,logical.x,logical.y,logical.width,logical.height,
        0,0,zoom.width,zoom.height);
    }catch(e){console.warn('[Seven Kingdoms] notice strip not ready',e);}
    scheduleRender();
  }
  function gameClick(gameX,gameY){
    const r=canvas.getBoundingClientRect();
    const coord={
      bubbles:true,cancelable:true,
      clientX:r.left+gameX/canvas.width*r.width,
      clientY:r.top+gameY/canvas.height*r.height,button:0
    };
    canvas.dispatchEvent(new MouseEvent('mousemove',coord));
    canvas.dispatchEvent(new MouseEvent('mousedown',Object.assign({},coord,{buttons:1})));
    setTimeout(()=>canvas.dispatchEvent(new MouseEvent('mouseup',coord)),75);
  }

  // The game's message links are at native news X=8..18.
  // Forwarding the Y coordinate instead of guessing the world location keeps
  // the native handler authoritative for diplomacy, surrender and NEWS_GO.
  function gotoNative(e){
    const r=zoom.getBoundingClientRect();
    focusY=Math.max(logical.y,Math.min(596,
      logical.y+(e.clientY-r.top)/r.height*logical.height));
    gameClick(13,focusY);
  }
  zoom.addEventListener('pointerup',e=>{e.preventDefault();gotoNative(e);});
  go.addEventListener('click',()=>gameClick(13,focusY));

  function setTab(tab){
    activeTab=tab;
    if(tab==='inbox')newCount=0;
    open=true;
    updateView();
    if(tab==='inbox')renderInbox();
  }
  newsTab.addEventListener('click',()=>setTab('news'));
  inboxTab.addEventListener('click',()=>setTab('inbox'));
  toggle.addEventListener('click',()=>{open=!open;updateView();});

  function mapJump(x,y,mapSize){
    const bound=isMod?400:200;
    mapSize=Number.isFinite(mapSize)?mapSize:bound;
    if(!Number.isFinite(x)||!Number.isFinite(y)||!Number.isFinite(mapSize)||
       mapSize<1||mapSize>4096||x<0||y<0||x>=mapSize||y>=mapSize) return false;
    // The native minimap remains at the same coordinates even when the
    // mobile magnifier is shown. Its own handler recentres the main camera.
    gameClick(mini.x+(x+.5)*mini.width/mapSize,
              mini.y+(y+.5)*mini.height/mapSize);
    return true;
  }

  function renderInbox(){
    inboxEl.replaceChildren();
    if(!inbox.length){
      const el=document.createElement('div');
      el.className='skNewsEmpty';
      el.textContent='Nessun evento di produzione ricevuto in questa partita.';
      inboxEl.appendChild(el);
    }
    for(const alert of inbox){
      const row=document.createElement('div');
      row.className='skNewsItem';
      const label=document.createElement('span');
      label.textContent=alert.text;
      row.appendChild(label);
      if(alert.location){
        const btn=document.createElement('button');
        btn.type='button';btn.textContent='↗ Vai';
        btn.setAttribute('aria-label','Vai al luogo: '+alert.text);
        btn.addEventListener('click',()=>mapJump(alert.location.x,alert.location.y,alert.location.mapSize));
        row.appendChild(btn);
      }
      inboxEl.appendChild(row);
    }
  }

  // Completers must publish only real engine events with explicit coordinates.
  // Do not synthesize them from elapsed time, sound or screenshots:
  // cancel/reorder/changed owner could otherwise generate false notices.
  function publish(event){
    if(!event||typeof event!=='object'||typeof event.text!=='string')return false;
    const type=String(event.type||'').toLowerCase();
    if(!['construction-complete','production-queue-empty','training-queue-empty'].includes(type))return false;
    const name=event.text.trim().slice(0,220);
    if(!name)return false;
    let locationData=null;
    if(event.location&&typeof event.location==='object'){
      const {x,y,mapSize}=event.location;
      const sz=Number.isFinite(mapSize)?mapSize:(isMod?400:200);
      if([x,y,sz].every(Number.isFinite)&&x>=0&&y>=0&&x<sz&&y<sz)
        locationData={x,y,mapSize:sz};
    }
    const entry={type,text:name,location:locationData,id:String(event.id||''),
      at:Date.now()};
    if(entry.id && inbox.some(item=>item.id===entry.id))return false;
    inbox.unshift(entry);if(inbox.length>MAX_ALERTS)inbox.length=MAX_ALERTS;
    newCount++;
    if(activeTab==='inbox')renderInbox();
    updateView();
    window.dispatchEvent(new CustomEvent('sk:mobile-notification',{detail:{type,text:name}}));
    return true;
  }

  const originalShow=window.showPhoneControls;
  window.showPhoneControls=function(){
    if(originalShow)originalShow();
    started=true;updateView();
  };
  window.addEventListener('resize',updateView);
  window.addEventListener('orientationchange',updateView);
  document.addEventListener('visibilitychange',updateView);

  window.SevenKingdomsMobileNews=Object.freeze({
    publish, jumpTo:mapJump, openInbox:()=>setTab('inbox'),
    state:()=>({started,visible:!dock.hidden,expanded:open,
      tab:activeTab,count:inbox.length,unread:newCount})
  });
})();
