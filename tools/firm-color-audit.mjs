import {chromium} from 'playwright';
const browser=await chromium.launch({headless:true,channel:'chrome',args:['--disable-dev-shm-usage']});
const page=await browser.newPage();
try{
  for(const mode of ['','mod/']){
    await page.goto('http://127.0.0.1:8765/'+mode,{waitUntil:'domcontentloaded',timeout:120000});
    await page.waitForFunction(()=>!document.getElementById('start').hidden,{timeout:180000});
    const result=await page.evaluate(()=>{
      const bytes=Module.FS.readFile('/data/RESOURCE/STD.SET');
      const v=new DataView(bytes.buffer,bytes.byteOffset,bytes.length);
      const s=x=>Array.from(x).map(b=>String.fromCharCode(b)).join('').replace(/\0/g,'').trim();
      const n=x=>parseInt(s(x),10)||0;
      const d={};
      for(let i=0;i<v.getUint16(0,true);i++){
        const pos=2+i*13;
        const name=s(bytes.slice(pos,pos+9));
        d[name]=v.getUint32(pos+9,true);
      }
      const names=Object.keys(d).filter(x=>/FIRM|FBIT|FBUILD|FFRAME|RACE/.test(x));
      const records={};
      for(const name of names){
        const p=d[name],count=v.getUint32(p+4,true),sz=v.getUint16(p+10,true),head=v.getUint16(p+8,true);
        if(count>5000||sz>200||sz===0)continue;
        const begin=p+1+head;
        records[name]={count,size:sz,samples:[]};
        for(let i=0;i<Math.min(count,name==='FIRM'?50:20);i++){
          const row=bytes.slice(begin+i*sz,begin+(i+1)*sz-1);
          records[name].samples.push({id:i+1,text:s(row.slice(0,Math.min(58,row.length))),prefix:Array.from(row.slice(0,48))});
        }
      }
      return {names,records,firmRES:Module.FS.stat('/data/RESOURCE/I_FIRM.RES').size};
    });
    console.log('FIRM_AUDIT_'+(mode?'MOD':'ORIGINAL')+'='+JSON.stringify(result));
  }
}finally{await browser.close();}
