import {chromium} from 'playwright';
const browser=await chromium.launch({headless:true,channel:'chrome',args:['--disable-dev-shm-usage']});
const page=await browser.newPage();
try{
 await page.goto('http://127.0.0.1:8765/mod/',{waitUntil:'domcontentloaded',timeout:140000});
 await page.waitForFunction(()=>!document.getElementById('start').hidden,{timeout:180000});
 const v=await page.evaluate(()=>{
 const std=Module.FS.readFile('/data/RESOURCE/STD.SET'),res=Module.FS.readFile('/data/RESOURCE/I_FIRM.RES'),pal=Module.FS.readFile('/data/RESOURCE/PAL_STD.RES');
 const view=new DataView(std.buffer,std.byteOffset,std.length),rv=new DataView(res.buffer,res.byteOffset,res.length);
 const s=b=>Array.from(b).map(x=>String.fromCharCode(x)).join('').replace(/\0/g,'').trim();
 const n=b=>parseInt(s(b),10)||0;
 const tbl={};for(let i=0;i<view.getUint16(0,true);i++){const pos=2+i*13;tbl[s(std.slice(pos,pos+9))]=view.getUint32(pos+9,true)}
 const db=(key)=>{const p=tbl[key],len=view.getUint16(p+10,true),cnt=view.getUint32(p+4,true),start=p+1+view.getUint16(p+8,true);return Array.from({length:cnt},(_,i)=>std.slice(start+i*len,start+(i+1)*len-1));};
 const frames=db('FBITMAP').map((b,id)=>({id:id+1,firm:s(b.slice(0,8)),mode:s(b.slice(16,17)),file:s(b.slice(34,42)),off:new DataView(b.buffer,b.byteOffset+42,4).getUint32(0,true)}));
 const selection=frames.filter(x=>['GMARKET','MARKET','UNIV'].includes(x.firm)&&x.mode==='A');
 const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d');
 const width=600,height=450;
 canvas.width=width;canvas.height=height;
 ctx.fillStyle='#22252c';ctx.fillRect(0,0,width,height);
 ctx.font='bold 12px sans-serif';
 const labels=['palette base','Rosso','Verde','Blu','Remap mask'];
 for(let i=0;i<labels.length;i++){ctx.fillStyle='#f2eadc';ctx.fillText(labels[i],i*118+5,16);}
 const colors=[null,0,1,2,3];
 const palrgb=(v)=>Array.from(pal.slice(8+v*3,8+v*3+3));
 const schemes=[[160,161,162,163,192,193,194,195],[164,165,166,167,196,197,198,199],[168,169,170,171,200,201,202,203],[172,173,174,175,204,205,206,207]];
 function remap(x,scheme){
  if(x>=224&&x<=231)return schemes[x-224];
  return x;
 }
 const hist={};
 for(let row=0;row<selection.length;row++){
  const f=selection[row],off=f.off,ln=rv.getUint32(off,true),w=rv.getUint16(off+4,true),h=rv.getUint16(off+6,true);
  let i=off+8,p=0,pixels=new Uint8Array(w*h);pixels.fill(255);
  while(p<pixels.length&&i<off+4+ln){
   let b=res[i++];if(b<248)pixels[p++]=b;else{const n=b===248?res[i++]:256-b;p+=n;}
  }
  const count=new Array(256).fill(0);pixels.forEach(x=>count[x]++);
  hist[f.file]={sizes:[w,h],paletteRemappable:count.slice(224,232),list:count.map((n,i)=>({n,i})).sort((a,b)=>b.n-a.n).slice(0,20)};
  const scale=Math.min(1,145/w,120/h);
  for(let col=0;col<5;col++){
    let id=ctx.createImageData(w,h);
    for(let n=0;n<pixels.length;n++){
      let q=pixels[n];const a=n*4;if(q===255){id.data[a+3]=0;continue;}
      if(col===4){let hit=(q>=224&&q<=231);id.data[a]=hit?252:120;id.data[a+1]=hit?40:120;id.data[a+2]=hit?232:120;id.data[a+3]=hit?255:110;continue;}
      let rgb=palrgb(col===0?q:remap(q,schemes[col-1]));id.data[a]=rgb[0];id.data[a+1]=rgb[1];id.data[a+2]=rgb[2];id.data[a+3]=255;
    }
    let temp=document.createElement('canvas');temp.width=w;temp.height=h;temp.getContext('2d').putImageData(id,0,0);
    ctx.imageSmoothingEnabled=false;
    ctx.drawImage(temp,col*118+Math.round((116-w*scale)/2),row*141+38,w*scale,h*scale);
  }
  ctx.fillStyle='#f2eadc';ctx.fillText(f.firm,5,row*141+35);
 }
 return {jpeg:canvas.toDataURL('image/jpeg',.86).split(',')[1],counts:hist,colors:Object.fromEntries([115,116,117,118,119,120,121,122,185,186,187,224,225,226,227,228,229,230,231].map(i=>[i,palrgb(i)]))};
 });
 console.log('BUILDING_COLOR_PREVIEW='+v.jpeg);
 console.log('BUILDING_COLOR_STATS='+JSON.stringify({counts:v.counts,colors:v.colors}));
}finally{await browser.close()}
