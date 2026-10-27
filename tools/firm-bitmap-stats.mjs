import {chromium} from 'playwright';
const browser=await chromium.launch({headless:true,channel:'chrome',args:['--disable-dev-shm-usage']});
const page=await browser.newPage();
try{
 for(const route of ['','mod/']){
  await page.goto('http://127.0.0.1:8765/'+route,{waitUntil:'domcontentloaded',timeout:150000});
  await page.waitForFunction(()=>!document.getElementById('start').hidden,{timeout:190000});
  const a=await page.evaluate(()=>{
    const std=Module.FS.readFile('/data/RESOURCE/STD.SET'),res=Module.FS.readFile('/data/RESOURCE/I_FIRM.RES'),pal=Module.FS.readFile('/data/RESOURCE/PAL_STD.RES');
    const v=new DataView(std.buffer,std.byteOffset,std.length),view=new DataView(res.buffer,res.byteOffset,res.length);
    const s=x=>Array.from(x).map(b=>String.fromCharCode(b)).join('').replace(/\0/g,'').trim();
    const n=x=>parseInt(s(x),10)||0;
    const d={};for(let i=0;i<v.getUint16(0,true);i++){const p=2+i*13;d[s(std.slice(p,p+9))]=v.getUint32(p+9,true);}
    const rows=(name,fn)=>{
       const p=d[name],cnt=v.getUint32(p+4,true),w=v.getUint16(p+10,true),header=v.getUint16(p+8,true),begin=p+1+header;
       return Array.from({length:cnt},(_,i)=>{const data=std.slice(begin+i*w,begin+(i+1)*w-1);return fn(data,i+1)});
    };
    const bitmap=rows('FBITMAP',(b,id)=>({id,firm:s(b.slice(0,8)),race:s(b.slice(8,16)),mode:s(b.slice(16,17)),frame:n(b.slice(17,19)),loc:[n(b.slice(19,22)),n(b.slice(22,25))],layer:s(b.slice(25,26)),offxy:[n(b.slice(26,29)),n(b.slice(29,32))],file:s(b.slice(34,42)),off:new DataView(b.buffer,b.byteOffset+42,4).getUint32(0,true)}));
    const counts={},picked=[];
    for(const b of bitmap){
      if(!counts[b.firm])counts[b.firm]=[];
      const off=b.off;
      const len=view.getUint32(off,true),w=view.getUint16(off+4,true),h=view.getUint16(off+6,true);
      if(w>250||h>250||w<1||h<1)throw new Error('dimensions '+b.firm+' '+w+' '+h);
      let bytes=res.slice(off+8,off+4+len),j=0;
      const pixels=new Uint8Array(w*h);let p=0;
      while(p<pixels.length&&j<bytes.length){
        const v=bytes[j++];if(v<248)pixels[p++]=v;
        else{const len=v===248?bytes[j++]:256-v;pixels.fill(255,p,p+len);p+=len;}
      }
      if(p!==pixels.length)throw new Error('RLE '+b.firm+' '+b.file+' '+p+'/'+pixels.length);
      let colors=new Array(256).fill(0);
      pixels.forEach(x=>colors[x]++);
      const arr={id:b.id,firm:b.firm,race:b.race,mode:b.mode,file:b.file,size:[w,h],loc:b.loc,offxy:b.offxy,remap:colors.slice(224,232),pixels:w*h-colors[255],directColor:colors.slice(160,224).reduce((a,b)=>a+b,0),topColors:colors.map((n,i)=>({n,i})).sort((x,y)=>y.n-x.n).slice(0,15)};
      counts[b.firm].push(arr);
      if((b.firm==='GMARKET'||b.firm==='MARKET'||b.firm==='UNIV'||b.firm==='HAUNTED') && b.mode==='A')picked.push({...arr,bitmap:b.off,pixels:Array.from(pixels)});
    }
    return {fileLength:res.length,palLength:pal.length,palStart:Array.from(pal.slice(0,30)),palette:Object.fromEntries([160,161,162,163,192,193,194,195,224,225,226,227,228,229,230,231].map(x=>[x,Array.from(pal.slice(8+x*3,8+x*3+3))])),groups:Object.fromEntries(Object.entries(counts).map(([k,arr])=>[k,{count:arr.length,active:arr.filter(x=>x.mode==='A').slice(0,6),allRemap:arr.reduce((n,x)=>n+x.remap.reduce((a,b)=>a+b,0),0)}])),picked:picked.map(({pixels,...other})=>other)};
  });
  console.log('BUILDING_PIXELS_'+(route?'MOD':'BASE')+'='+JSON.stringify(a));
 }
}finally{await browser.close();}
