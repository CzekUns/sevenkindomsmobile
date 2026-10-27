import {chromium} from 'playwright';
const browser=await chromium.launch({headless:true,channel:'chrome',args:['--disable-dev-shm-usage']});
const page=await browser.newPage();
try {
 await page.goto('http://127.0.0.1:8765/mod/',{waitUntil:'domcontentloaded',timeout:120000});
 await page.waitForFunction(()=>!document.getElementById('start').hidden,{timeout:180000});
 const d=await page.evaluate(()=>{
   const fs=Module.FS, std=fs.readFile('/data/RESOURCE/STD.SET'),src=fs.readFile('/data/RESOURCE/I_FIRM.RES'),pal=fs.readFile('/data/RESOURCE/PAL_STD.RES');
   const str=x=>String.fromCharCode(...x).replace(/\0/g,'').trim(),v=new DataView(std.buffer,std.byteOffset,std.byteLength);
   let offset;
   for(let i=0;i<v.getUint16(0,true);i++){let p=2+13*i;if(str(std.slice(p,p+9))==='FBITMAP')offset=v.getUint32(p+9,true)}
   const sz=v.getUint16(offset+10,true),first=offset+1+v.getUint16(offset+8,true),count=v.getUint32(offset+4,true);
   let image;
   for(let id=0;id<count;id++){
     let b=std.slice(first+id*sz,first+(id+1)*sz-1);
     if(str(b.slice(0,8))!=='UNIV'||str(b.slice(16,17))!=='A') continue;
     const p=new DataView(b.buffer,b.byteOffset+42,4).getUint32(0,true),rv=new DataView(src.buffer,src.byteOffset,src.byteLength),n=rv.getUint32(p,true),w=rv.getUint16(p+4,true),h=rv.getUint16(p+6,true),data=new Uint8Array(w*h);
     data.fill(255);let k=p+8,l=0;while(l<w*h && k<p+4+n){let c=src[k++];if(c<248)data[l++]=c;else l+=c===248?src[k++]:256-c}
     image={w,h,indices:data};break;
   }
   if(!image)throw Error('no image');
   const {w,h,indices}=image;
   let items=[];
   for(let idx=0;idx<256;idx++){
     let n=0,xmin=w,ymin=h,xmax=0,ymax=0;
     const rowCount=[0,0,0,0,0,0];
     for(let y=0;y<h;y++)for(let x=0;x<w;x++){
       if(indices[y*w+x]!==idx)continue;
       n++;xmin=Math.min(xmin,x);ymin=Math.min(ymin,y);xmax=Math.max(xmax,x);ymax=Math.max(ymax,y);
       rowCount[Math.min(5,Math.floor(y/h*6))]++;
     }
     if(n>=5)items.push({idx,n,box:[xmin,ymin,xmax,ymax],rowCount});
   }
   items.sort((a,b)=>b.n-a.n);
   const mapRGB=i=>[pal[8+i*3],pal[8+i*3+1],pal[8+i*3+2]];
   const sets=[
      {label:'CURRENT',map:{}},
      {label:'PLUS FOUR REDS',map:{216:228,217:229,218:230,219:231}},
      {label:'ALL ROOF SHADES',map:{208:224,209:225,210:225,211:226,216:228,217:229,218:230,219:231}},
      {label:'MASK REMAINING REDS',map:{216:228,217:229,218:230,219:231}}
   ];
   const c=document.createElement('canvas');c.width=1050;c.height=520;const ctx=c.getContext('2d');
   ctx.fillStyle='#20232b';ctx.fillRect(0,0,c.width,c.height);
   let source=indices;
   for(let j=0;j<sets.length;j++){
     const im=document.createElement('canvas');im.width=w;im.height=h;
     const context=im.getContext('2d'),out=context.createImageData(w,h);
     for(let k=0;k<source.length;k++){
       const v=source[k],m=sets[j].map[v]??v;
       if(v===255)continue;
       const p=k*4;
       if(j===3){out.data[p]=[216,217,218,219].includes(v)?255:110;out.data[p+1]=[216,217,218,219].includes(v)?10:110;out.data[p+2]=[216,217,218,219].includes(v)?220:110;out.data[p+3]=[216,217,218,219].includes(v)?255:100;}
       else{const rgb=mapRGB(m);out.data[p]=rgb[0];out.data[p+1]=rgb[1];out.data[p+2]=rgb[2];out.data[p+3]=255;}
     }
     context.putImageData(out,0,0);
     const x=15+j*255,y=55;
     ctx.imageSmoothingEnabled=false;ctx.drawImage(im,x,y,w*1.48,h*1.48);
     ctx.font='bold 19px sans-serif';ctx.fillStyle='#fff';ctx.fillText(sets[j].label,x,30);
     if(j<3)for(let paletteId=0;paletteId<2;paletteId++){
       const lower=document.createElement('canvas');lower.width=w;lower.height=h;const lc=lower.getContext('2d');
       const image=lc.createImageData(w,h);
       for(let k=0;k<source.length;k++){
         const v=source[k],m=sets[j].map[v]??v;
         if(v===255)continue;
         let color=m;
         if(m>=224&&m<=227) color=(paletteId===0 ? 164 : 168)+(m-224);
         if(m>=228&&m<=231) color=(paletteId===0 ? 196 : 200)+(m-228);
         const rgb=mapRGB(color),p=k*4;image.data[p]=rgb[0];image.data[p+1]=rgb[1];image.data[p+2]=rgb[2];image.data[p+3]=255;
       }
       lc.putImageData(image,0,0);ctx.drawImage(lower,x+paletteId*110,302,w*.66,h*.66);
     }
   }
   return {data: c.toDataURL('image/jpeg',.78).split(',')[1],hist:items.filter(o=>o.n>25).slice(0,100),rawImportant:items.filter(o=>o.idx>=200&&o.idx<=231)};
 });
 console.log('ROOF_REMAINDER_IMAGE='+d.data);
 console.log('ROOF_REMAINDER_HIST='+JSON.stringify({top:d.hist,important:d.rawImportant}));
}finally{await browser.close()}
