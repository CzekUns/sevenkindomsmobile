import {chromium} from 'playwright';
const browser=await chromium.launch({headless:true,args:['--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader']});
const page=await browser.newPage({viewport:{width:1280,height:960}});
try {
  for (const pathname of ['/','/mod/']) {
    await page.goto('http://127.0.0.1:8765'+pathname,{waitUntil:'domcontentloaded',timeout:120000});
    await page.waitForFunction(()=>!document.getElementById('start').hidden,{timeout:170000});
    const report=await page.evaluate(()=>{
      const data=Module.FS.readFile('/data/RESOURCE/STD.SET');
      const v=new DataView(data.buffer,data.byteOffset,data.byteLength);
      const dec=b=>Array.from(b).map(x=>String.fromCharCode(x)).join('').replace(/\0/g,'').trim();
      const num=b=>Number.parseInt(dec(b),10)||0;
      const N=v.getUint16(0,true), offsets={};
      for(let i=0;i<N;i++){
        const p=2+i*13;
        offsets[dec(data.subarray(p,p+9))]=v.getUint32(p+9,true);
      }
      function rows(table,decode){
        const p=offsets[table], count=v.getUint32(p+4,true),
        len=v.getUint16(p+10,true),start=p+1+v.getUint16(p+8,true);
        const out=[];
        for(let i=0;i<count;i++){
          const b=data.subarray(start+i*len,start+i*len+len-1);
          out.push(decode(b,i+1));
        }
        return out;
      }
      const sprites=rows('SPRITE',(b,i)=>({
        i,name:dec(b.subarray(0,8)),type:dec(b.subarray(8,9)),
        turning:num(b.subarray(10,11)),
        turnRes:num(b.subarray(11,13)),
        speed:num(b.subarray(17,19)),
        framesPerStep:num(b.subarray(19,21)),
        firstAction:num(b.subarray(29,34)),
        actionCount:num(b.subarray(34,39))
      }));
      const actions=rows('SACTION',(b,i)=>({
        i,name:dec(b.subarray(0,8)),action:dec(b.subarray(8,10)),
        dir:num(b.subarray(10,12)),first:num(b.subarray(12,17)),
        count:num(b.subarray(17,19))
      }));
      const frames=rows('SFRAME',(b,i)=>({
        i,name:dec(b.subarray(0,8)),action:dec(b.subarray(8,10)),
        dir:dec(b.subarray(10,12)),n:num(b.subarray(12,14)),
        x:num(b.subarray(14,18)),y:num(b.subarray(18,22)),
        w:num(b.subarray(22,25)),h:num(b.subarray(25,28)),
        file:dec(b.subarray(28,36)),
        offset:new DataView(b.buffer,b.byteOffset+36,4).getUint32(0,true)
      }));
      const special=['ROMAN','CELT','SAMNITE','ETRUSCAN','MONGOL','IBERIAN','BABYLON','CARTHAGE','JUPITER','CERNUNNO','MAMERTE','TINIA','TENGRI','NETON','MARDUK','BAAL_HAM'];
      const records=[];
      for(const sprite of sprites){
        const arr=actions.slice(sprite.firstAction-1,sprite.firstAction-1+sprite.actionCount);
        const move=arr.filter(a=>a.action==='M');
        const attacks=arr.filter(a=>a.action[0]==='A');
        const idle=arr.filter(a=>a.action==='S');
        const deaths=arr.filter(a=>a.action==='D');
        const problems=[];
        const dirs={};
        for(const a of move){
          const seq=frames.slice(a.first-1,a.first-1+a.count);
          if(a.first<1||seq.length!==a.count||seq.some(f=>f.name!==sprite.name)){
            problems.push('invalid frame range for M'+a.dir);
          }
          const xs=seq.map(x=>x.x),ys=seq.map(x=>x.y);
          dirs[a.dir]={num:a.count,frameIds:seq.map(f=>f.i),codes:seq.map(f=>f.file),
            offsetX:xs,offsetY:ys,width:seq.map(f=>f.w),height:seq.map(f=>f.h)};
        }
        if (move.length<8)problems.push('move directions only '+move.length);
        const moveCounts=move.map(a=>a.count);
        if(new Set(moveCounts).size>1)problems.push('irregular move counts '+moveCounts.join(','));
        if(moveCounts.some(x=>x<2))problems.push('static movement (less than 2 frames)');
        records.push({name:sprite.name,group:special.includes(sprite.name)?'NEW': 'OLD',
          spriteID:sprite.i,speed:sprite.speed,framesPerStep:sprite.framesPerStep,
          actions:arr.length,moves:move.length,moveCounts,
          attackCount:attacks.length,idleCount:idle.length,deathCount:deaths.length,
          problems,dirs
        });
      }
      const errors=[];
      for(const a of actions){
        if(a.first<1||a.first+a.count-1>frames.length)errors.push(a.name+' '+a.action+'@'+a.dir+' invalid range');
      }
      return {size:data.length,sprites:sprites.length,actions:actions.length,frames:frames.length,
        records,globalErrors:errors.slice(0,40),firstFrames:frames.slice(0,3)};
    });
    console.log('FRAME_AUDIT_'+(pathname==='/mod/'?'MOD':'BASE')+'='+JSON.stringify(report));
  }
}finally{await browser.close();}
