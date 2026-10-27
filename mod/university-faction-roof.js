/*
 * University faction-roof correction. Bounded to precisely two baked-in
 * terra-cotta shades in UNIV_A1. No WASM or existing .data package changes.
 *
 * 7kaa Game::init_remap_table remaps E0..E3 (primary) and E4..E7 (secondary)
 * to the actual faction palette. The active University's terracotta roof
 * uses palette 210 and 211, which always stay red regardless of ownership.
 */
(function () {
  "use strict";
  const status={applied:false,changed:0,frame:null,error:null,counts:{oldLight:0,oldDark:0}};
  window.__universityRoofFix=status;
  const esc=b=>String.fromCharCode(...b).replace(/\0/g,"").trim();
  const int=b=>parseInt(esc(b),10)||0;

  function apply() {
    if(status.applied)return true;
    try {
      const FS=Module.FS||window.FS;
      if(!FS)throw Error("Virtual filesystem unavailable");
      const set=FS.readFile("/data/RESOURCE/STD.SET");
      const src=FS.readFile("/data/RESOURCE/I_FIRM.RES");
      const v=new DataView(set.buffer,set.byteOffset,set.byteLength);
      let table=0;
      for(let i=0;i<v.getUint16(0,true);i++){
        const p=2+i*13;
        if(esc(set.subarray(p,p+9))==="FBITMAP"){table=v.getUint32(p+9,true);break}
      }
      if(table===0)throw Error("FBITMAP missing");
      const count=v.getUint32(table+4,true),
            size=v.getUint16(table+10,true),
            begin=table+1+v.getUint16(table+8,true);
      if(size!==47||count<188)throw Error("Unexpected FBITMAP layout");
      let picked=null;
      for(let id=0;id<count;id++){
        const row=set.subarray(begin+id*size,begin+(id+1)*size-1);
        if(esc(row.subarray(0,8))!=="UNIV"||esc(row.subarray(16,17))!=="A"
          ||esc(row.subarray(34,42))!=="UNIV_A1")continue;
        if(picked)throw Error("Ambiguous University main frame");
        const ptr=new DataView(row.buffer,row.byteOffset+42,4).getUint32(0,true);
        picked={ptr,id:id+1};
      }
      if(!picked)throw Error("University main frame not found");
      const off=picked.ptr;
      const srcView=new DataView(src.buffer,src.byteOffset,src.byteLength);
      const payloadBytes=srcView.getUint32(off,true);
      const w=srcView.getUint16(off+4,true),h=srcView.getUint16(off+6,true);
      if(w!==160||h!==145||off+4+payloadBytes>src.length)throw Error("Unexpected University image dimensions");
      const output=new Uint8Array(src);
      let p=off+8,decoded=0,light=0,dark=0;
      const end=off+4+payloadBytes;
      while(p<end&&decoded<w*h){
        const b=output[p];
        if(b<248){
          if(b===210){output[p]=0xE1;light++}
          if(b===211){output[p]=0xE2;dark++}
          decoded++;p++;
        }else if(b===248){
          if(p+1>=end)throw Error("Malformed RLE skip");
          decoded+=output[p+1];p+=2;
        }else{
          decoded+=256-b;p++;
        }
      }
      if(decoded!==w*h||p!==end)throw Error("Malformed RLE sprite");
      // Guard against unrelated / future resource versions.
      if(light!==189||dark!==518)throw Error("University roof palette signature changed ("+light+","+dark+")");
      // Emscripten LZ4 preloaded files are read-only. Replace this one
      // decompressed VFS file before the engine ever loads FirmRes.
      FS.unlink("/data/RESOURCE/I_FIRM.RES");
      FS.writeFile("/data/RESOURCE/I_FIRM.RES",output);
      status.applied=true;
      status.changed=light+dark;
      status.frame=picked.id;
      status.counts={oldLight:light,oldDark:dark};
      console.info("[7kaa] University faction roof restored",status);
      return true;
    }catch(e){
      status.error=String(e);
      console.warn("[7kaa] University roof patch skipped:",e);
      return false;
    }
  }
  window.SevenKingdomsUniversityRoof=Object.freeze({apply,status:()=>({...status})});
})();
