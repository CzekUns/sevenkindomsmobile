import {chromium} from 'playwright';
const browser=await chromium.launch({headless:true,channel:'chrome',args:['--disable-dev-shm-usage']});
const page=await browser.newPage();
try{
 await page.goto('http://127.0.0.1:8765/mod/',{waitUntil:'domcontentloaded',timeout:120000});
 await page.waitForFunction(()=>!document.getElementById('start').hidden,{timeout:180000});
 const ret=await page.evaluate(()=>{
 const std=Module.FS.readFile('/data/RESOURCE/STD.SET'),res=Module.FS.readFile('/data/RESOURCE/I_FIRM.RES'),pal=Module.FS.readFile('/data/RESOURCE/PAL_STD.RES');
 const st=new DataView(std.buffer,std.byteOffset,std.length),rv=new DataView(res.buffer,res.byteOffset,res.length);
 const str=b=>String.fromCharCode(...b).replace(/\0/g,'').trim();
 const n=b=>parseInt(str(b),10)||0;
 let off=0;
 for(let i=0;i<st.getUint16(0,true);i++){let p=2+i*13;if(str(std.slice(p,p+9))==='FBITMAP'){off=st.getUint32(p+9,true);break}}
 let count=st.getUint32(off+4,true),head=st.getUint16(off+8,true),sz=st.getUint16(off+10,true),begin=off+1+head;
 const entries=[];
 for(let id=0;id<count;id++){let b=std.slice(begin+id*sz,begin+id*sz+sz-1);if(str(b.slice(0,8))!=='UNIV')continue;
 let ptr=new DataView(b.buffer,b.byteOffset+42,4).getUint32(0,true),len=rv.getUint32(ptr,true),w=rv.getUint16(ptr+4,true),h=rv.getUint16(ptr+6,true);
 let pix=new Uint8Array(w*h);pix.fill(255);let pos=0,j=ptr+8;
 while(pos<pix.length&&j<ptr+4+len){const c=res[j++];if(c<248)pix[pos++]=c;else pos+=(c===248?res[j++]:256-c)}
 const bins={};for(let c=208;c<=216;c++) bins[c]=pix.reduce((sum,x)=>sum+(x===c),0);
 entries.push({id:id+1,file:str(b.slice(34,42)),mode:str(b.slice(16,17)),size:[w,h],bins,pixels:pix});
 }
 const main=entries.find(x=>x.mode==='A'),w=main.size[0],h=main.size[1];
 const palettes=[
  {name:'ORIGINAL',repl:{}},
  {name:'ROSSO',repl:{208:227,209:227,210:226,211:225,212:224}},
  {name:'VERDE',repl:{208:227,209:227,210:226,211:225,212:224}},
  {name:'BLU',repl:{208:227,209:227,210:226,211:225,212:224}},
  {name:'MASK',repl:{}}
 ];
 const schemes=[[160,161,162,163],[164,165,166,167],[168,169,170,171]];
 const rgb=i=>[pal[8+i*3],pal[9+i*3],pal[10+i*3]];
 const canvas=document.createElement('canvas');canvas.width=950;canvas.height=206;
 const ctx=canvas.getContext('2d');ctx.fillStyle='#252631';ctx.fillRect(0,0,950,206);
 for(let k=0;k<5;k++){
  const img=ctx.createImageData(w,h);
  for(let p=0;p<w*h;p++){
   let orig=main.pixels[p],v=orig;
   if(k!==0&&k!==4) v=palettes[k].repl[orig]??orig;
   if(v>=224&&v<=227&&k>=1&&k<=3) v=schemes[k-1][v-224];
   if(k===4){const mask=orig>=208&&orig<=212;if(orig===255){img.data[p*4+3]=0;continue;}img.data[p*4]=mask?249:95;img.data[p*4+1]=mask?30:95;img.data[p*4+2]=mask?238:95;img.data[p*4+3]=mask?255:85;continue;}
   if(v===255){img.data[p*4+3]=0;continue;}const c=rgb(v);img.data[p*4]=c[0];img.data[p*4+1]=c[1];img.data[p*4+2]=c[2];img.data[p*4+3]=255;
  }
  const tmp=document.createElement('canvas');tmp.width=w;tmp.height=h;tmp.getContext('2d').putImageData(img,0,0);
  ctx.imageSmoothingEnabled=false;ctx.drawImage(tmp,k*190+15,22,w,h);
  ctx.font='bold 14px sans-serif';ctx.fillStyle='white';ctx.fillText(palettes[k].name,k*190+15,15);
 }
 return {jpeg:canvas.toDataURL('image/jpeg',.9).split(',')[1],frames:entries.map(({pixels,...r})=>r),palette:Object.fromEntries(Array.from({length:13},(_,i)=>208+i).map(i=>[i,rgb(i)]))};
 });
 console.log('UNIVERSITY_COLOR_PREVIEW='+ret.jpeg);
 console.log('UNIVERSITY_COLOR_ANALYSIS='+JSON.stringify({frames:ret.frames,palette:ret.palette}));
}finally{await browser.close();}
