/* Seven Kingdoms MOD — install native restored walking frames before callMain.
 * Only affects /mod/ and mounts 8 new soldiers, 8 new deities, and SFRAME.
 * Never mutates the original game, WASM, or the compressed .data packages.
 */
(function(){
  "use strict";
  const races=["ROMAN","CELT","SAMNITE","ETRUSCAN","MONGOL","IBERIAN","BABYLON","CARTHAGE"];
  const gods=["JUPITER","CERNUNNO","MAMERTE","TINIA","TENGRI","NETON","MARDUK","BAAL_HAM"];
  // Production opt-in: /mod/?roman_test=1 mounts only the experimental
  // Roman walking frames plus their matching SFRAME table. Ordinary /mod/
  // remains byte-for-byte identical in all sprites and game saves.
  const romanPreview = new URLSearchParams(window.location.search).get("roman_test")==="1";
  const items=[["/data/RESOURCE/STD.SET","STD.SET",
      romanPreview ? "roman-preview/STD.SET" : "god-shadow-candidate/STD.SET"],
    ...races.map(name=>["/data/SPRITE/"+name+".SPR",name+".SPR",
      romanPreview && name==="ROMAN" ? "roman-preview/ROMAN.SPR"
                                   : "sprite-restoration-candidate/"+name+".SPR"]),
    ...gods.map(name=>["/data/SPRITE/"+name+".SPR",name+".SPR","god-shadow-candidate/"+name+".SPR"])];
  const state={status:"pending",loaded:0,total:items.length,error:null,romanPreview};
  window.SevenKingdomsRestoredWalk=state;
  let inFlight;
  const u32=(a,at)=>new DataView(a.buffer,a.byteOffset,a.byteLength).getUint32(at,true);
  function check(path,oldBytes,newBytes){
    if(path.endsWith(".SET")){
      if(newBytes.length!==oldBytes.length||newBytes.length<100000) throw new Error("Unexpected STD.SET size");
      if(new DataView(newBytes.buffer,newBytes.byteOffset).getUint16(0,true)!==
         new DataView(oldBytes.buffer,oldBytes.byteOffset).getUint16(0,true)) throw new Error("STD.SET index mismatch");
    }else{
      if(newBytes.length<20000 || newBytes.length>2000000 || u32(newBytes,0)<8 || u32(newBytes,0)>=newBytes.length)
        throw new Error("Invalid native sprite archive: "+path);
    }
  }
  async function install(){
    if(state.status==="installed")return state;
    if(inFlight)return inFlight;
    inFlight=(async function(){
      state.status="loading";state.error=null;
      const blobs=await Promise.all(items.map(async ([target,name,url])=>{
        const response=await fetch(url,{cache:"no-cache"});
        if(!response.ok)throw new Error("Cannot download "+name+" (HTTP "+response.status+")");
        const bytes=new Uint8Array(await response.arrayBuffer());
        state.loaded++;
        return {target,bytes};
      }));
      if(!Module.FS)throw new Error("Native game filesystem is not ready");
      const originals=[];
      for(const blob of blobs){
        const old=Module.FS.readFile(blob.target);
        check(blob.target,old,blob.bytes);
        originals.push({target:blob.target,bytes:old});
      }
      const changed=[];
      try{
        for(const blob of blobs){
          Module.FS.unlink(blob.target);
          Module.FS.writeFile(blob.target,blob.bytes);
          const verify=Module.FS.readFile(blob.target);
          if(verify.length!==blob.bytes.length || verify[0]!==blob.bytes[0])
            throw new Error("VFS install failed: "+blob.target);
          changed.push(blob.target);
        }
      }catch(e){
        // Restore all touched files on failure; never launch half-updated tables.
        for(const original of originals){
          if(!changed.includes(original.target))continue;
          try{Module.FS.unlink(original.target);Module.FS.writeFile(original.target,original.bytes);}
          catch(err){console.error("Cannot restore sprite backup",original.target,err);}
        }
        throw e;
      }
      state.status="installed";
      return state;
    })().catch(error=>{state.status="error";state.error=String(error);throw error;})
       .finally(()=>{inFlight=null;});
    return inFlight;
  }
  window.installSevenKingdomsRestoredWalk=install;
})();
