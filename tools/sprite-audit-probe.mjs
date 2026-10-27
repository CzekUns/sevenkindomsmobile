import {chromium} from 'playwright';
const browser=await chromium.launch({headless:true,args:['--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader']});
const page=await browser.newPage({viewport:{width:1280,height:960}});
try {
  for (const pathname of ['/','/mod/']) {
    await page.goto('http://127.0.0.1:8765'+pathname,{waitUntil:'domcontentloaded',timeout:120000});
    await page.waitForFunction(()=>!document.getElementById('start').hidden,{timeout:170000});
    const out=await page.evaluate(()=>{
      const bytes=Module.FS.readFile('/data/RESOURCE/STD.SET');
      const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
      const str=(b)=>Array.from(b).map(x=>String.fromCharCode(x)).join('').replace(/\0/g,'').trim();
      const u16=(n)=>view.getUint16(n,true),u32=(n)=>view.getUint32(n,true);
      const count=u16(0);
      const members=[];
      for(let i=0;i<count;i++){
        const p=2+i*13;
        members.push({name:str(bytes.subarray(p,p+9)),start:u32(p+9),end:0});
      }
      for(let i=0;i<count;i++)members[i].end=i+1<count ? members[i+1].start : u32(2+count*13+9);
      const tables={};
      for(const m of members){
        const p=m.start;
        if(m.end-p<32)continue;
        const size=u16(p+10),num=u32(p+4),header=u16(p+8);
        if(!num||size===0||size>1000||p+header+num*size>m.end+2)continue;
        tables[m.name]={size,num,header,first:str(bytes.subarray(p+1+header,p+1+header+Math.min(size,48)))};
      }
      return {length:bytes.length,prefix:Array.from(bytes.subarray(0,45)),count,items:members.slice(0,35),tables};
    });
    console.log('AUDIT_DB_'+(pathname==='/mod/'?'MOD':'BASE')+'='+JSON.stringify(out));
  }
} finally {await browser.close();}
