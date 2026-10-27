import {chromium} from 'playwright';
const browser=await chromium.launch({headless:true,args:['--disable-dev-shm-usage']});
const page=await browser.newPage();
try{
  await page.goto('http://127.0.0.1:8765/mod/',{waitUntil:'domcontentloaded',timeout:120000});
  await page.waitForFunction(()=>!document.getElementById('start').hidden,{timeout:180000});
  const result=await page.evaluate(()=>{
    const v=Module.FS.readFile('/data/RESOURCE/STD.SET');
    const view=new DataView(v.buffer,v.byteOffset,v.byteLength);
    const s=b=>Array.from(b).map(x=>String.fromCharCode(x)).join('').replace(/\0/g,'').trim();
    const num=b=>parseInt(s(b),10)||0;
    const count=view.getUint16(0,true);
    const indices={};
    for(let i=0;i<count;i++){
      const p=2+i*13;
      indices[s(v.subarray(p,p+9))]=view.getUint32(p+9,true);
    }
    const read=(name,cb)=>{
      const p=indices[name],n=view.getUint32(p+4,true),sz=view.getUint16(p+10,true),
        beg=p+1+view.getUint16(p+8,true);
      return Array.from({length:n},(_,i)=>cb(v.subarray(beg+i*sz,beg+i*sz+sz-1),i+1));
    };
    const sprites=read('SPRITE',(b,i)=>({
      id:i,name:s(b.subarray(0,8)),first:num(b.subarray(29,34)),count:num(b.subarray(34,39))
    }));
    const action=read('SACTION',(b,i)=>({
      id:i,name:s(b.subarray(0,8)),action:s(b.subarray(8,10)),
      dir:num(b.subarray(10,12)),first:num(b.subarray(12,17)),count:num(b.subarray(17,19))
    }));
    const frames=read('SFRAME',(b,i)=>({
      id:i,name:s(b.subarray(0,8)),action:s(b.subarray(8,10)),
      dir:s(b.subarray(10,12)),n:num(b.subarray(12,14)),
      x:num(b.subarray(14,18)),y:num(b.subarray(18,22)),
      w:num(b.subarray(22,25)),h:num(b.subarray(25,28)),
      file:s(b.subarray(28,36)),
      off:new DataView(b.buffer,b.byteOffset+36,4).getUint32(0,true)
    }));
    function hash(b){
      let h=2166136261;
      for(const value of b){h^=value;h=Math.imul(h,16777619);}
      return (h>>>0).toString(16);
    }
    const targets=['ROMAN','CELT','SAMNITE','ETRUSCAN','MONGOL','IBERIAN','BABYLON','CARTHAGE',
      'JUPITER','CERNUNNO','MAMERTE','TINIA','TENGRI','NETON','MARDUK','BAAL_HAM',
      'NORMAN','GREEK','MAYA','CHINESE','VIKING'];
    const out=[];
    for(const name of targets){
      const sprite=sprites.find(x=>x.name===name);
      const file=Module.FS.readFile('/data/SPRITE/'+name+'.SPR');
      const dv=new DataView(file.buffer,file.byteOffset,file.byteLength);
      const moves=action.slice(sprite.first-1,sprite.first+sprite.count-1).filter(x=>x.action==='M');
      const seen=new Map();const dirs=[];
      for(const a of moves){
        const seq=frames.slice(a.first-1,a.first+a.count-1);
        const images=[];
        for(const fr of seq){
          const len=dv.getUint32(fr.off,true);
          const data=file.subarray(fr.off+4,fr.off+4+len);
          if(fr.off<0||fr.off+len+4>file.length)throw new Error('INVALID '+name+' '+fr.file+' off '+fr.off+' len '+len);
          const h=hash(data);
          if(!seen.has(h))seen.set(h,[]);
          seen.get(h).push(fr.file);
          images.push({h,payload:len,offset:[fr.x,fr.y],size:[fr.w,fr.h]});
        }
        const fingerprints=images.map(x=>x.h);
        const local=new Map();
        let index=0;
        for(const h of fingerprints){if(!local.has(h))local.set(h,++index);}
        dirs.push({dir:a.dir,frameCount:seq.length,uniques:local.size,
          pattern:fingerprints.map(h=>[...local.keys()].indexOf(h)+1),
          images});
      }
      const bigDuplicates=[...seen.entries()].filter(([h,files])=>files.length>1).map(([h,files])=>files);
      out.push({name,totalFileBytes:file.length,moveDirections:moves.length,
        frames:dirs.reduce((n,x)=>n+x.frameCount,0),uniqueFrames:seen.size,
        numberDuplicateGroups:bigDuplicates.length,duplicateGroups:bigDuplicates.slice(0,20),
        dirs:dirs.map(d=>({dir:d.dir,frames:d.frameCount,unique:d.uniques,pattern:d.pattern,
          sizes:d.images.map(x=>x.size),offsets:d.images.map(x=>x.offset),hashes:d.images.map(x=>x.h)}))});
    }
    return out;
  });
  console.log('SPRITE_CONTENT_AUDIT='+JSON.stringify(result));
}finally{await browser.close()}
