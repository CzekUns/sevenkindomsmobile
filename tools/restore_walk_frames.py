#!/usr/bin/env python3
"""Experimental gait restoration. Reads original binary sprite archives; never edits main."""
import csv,hashlib,json,re,struct,zipfile
from pathlib import Path
from PIL import Image,ImageDraw

ROOT=Path(__file__).resolve().parents[1]
SRC=ROOT/"mod"/"data"
OUT=ROOT/"sprite-restoration-output"
RACES=("ROMAN","CELT","SAMNITE","ETRUSCAN","MONGOL","IBERIAN","BABYLON","CARTHAGE")
MODES=("M","GM")

def metadata(path):
    txt=path.read_text("utf-8")
    match=list(re.finditer(r'loadPackage\s*\(',txt))
    assert match,"Missing Emscripten package metadata"
    st=match[-1].end()
    meta,n=json.JSONDecoder().raw_decode(txt[st:])
    return txt,(st,st+n),meta

def members(pack,metadata):
    out={}
    for item in metadata["files"]:
        a,b=item["start"],item["end"]
        assert 0<=a<=b<=len(pack),(item["filename"],a,b,len(pack))
        out[item["filename"]]=pack[a:b]
    return out

def record_data(std,name):
    n=struct.unpack_from("<H",std,0)[0]
    entries={}
    for i in range(n):
        p=2+13*i
        key=bytes(std[p:p+9]).split(b"\0")[0].decode().strip()
        entries[key]=struct.unpack_from("<I",std,p+9)[0]
    p=entries[name];count=struct.unpack_from("<I",std,p+4)[0]
    hdr,sz=struct.unpack_from("<HH",std,p+8)
    pos=p+1+hdr
    assert sz>0 and pos+count*sz<=len(std),(name,count,sz,pos)
    return [(pos+i*sz,memoryview(std)[pos+i*sz:pos+(i+1)*sz-1]) for i in range(count)]

def fld(b,a,z):return bytes(b[a:z]).decode("ascii","replace").strip()
def number(b,a,z):return int(fld(b,a,z) or "0")

def tables(std):
    sprites={}
    for i,(_,b) in enumerate(record_data(std,"SPRITE"),1):
        sprites[fld(b,0,8)]={"id":i,"first":number(b,29,34),"count":number(b,34,39)}
    acts=[]
    for i,(_,b) in enumerate(record_data(std,"SACTION"),1):
        acts.append({"id":i,"name":fld(b,0,8),"act":fld(b,8,10),
                     "dir":number(b,10,12),"first":number(b,12,17),"count":number(b,17,19)})
    frames=[]
    for i,(p,b) in enumerate(record_data(std,"SFRAME"),1):
        frames.append({"id":i,"row":p,"name":fld(b,0,8),
                       "file":fld(b,28,36),"w":number(b,22,25),"h":number(b,25,28),
                       "off":struct.unpack_from("<I",b,36)[0]})
    return sprites,acts,frames

def decode(blob,off,size=None):
    assert off+8<=len(blob),(off,len(blob))
    n=struct.unpack_from("<I",blob,off)[0]
    p=blob[off+4:off+4+n]
    assert len(p)==n and n>=4
    w,h=struct.unpack_from("<HH",p)
    assert w>0 and h>0 and w<200 and h<200 and (not size or size==(w,h)),(size,(w,h))
    out=bytearray();i=4
    while len(out)<w*h and i<len(p):
        x=p[i];i+=1
        if x<248:out.append(x)
        elif x==248:
            repeat=p[i];i+=1
            assert 0<repeat<=255
            out.extend([255]*repeat)
        else:out.extend([255]*(256-x))
    assert len(out)==w*h,(off,len(out),w,h)
    return Image.frombytes("L",(w,h),bytes(out)),p

def encode(im):
    w,h=im.size
    raw=im.tobytes();out=bytearray(struct.pack("<HH",w,h));i=0
    while i<len(raw):
        x=raw[i]
        if x!=255:
            assert x<248
            out.append(x);i+=1
        else:
            j=i
            while j<len(raw) and raw[j]==255 and j-i<255:j+=1
            n=j-i
            if n<=7:out.append(256-n)
            else:out.extend((248,n))
            i=j
    return bytes(out)

def sha(im):return hashlib.sha256(im.tobytes()).hexdigest()

def make_pose(src,variant):
    """Reflect the leg stride below the hip around silhouette pivot; upper body unchanged."""
    w,h=src.size
    srcpx=src.load()
    dst=src.copy();p=dst.load()
    hip=round(h*.60)
    band=[x for y in range(hip,min(hip+8,h)) for x in range(w) if srcpx[x,y]!=255]
    pivot=round(sum(band)/len(band)) if band else (w-1)//2
    stride_shift=0 if variant==5 else 1
    for y in range(hip+1,h):
        alpha=(y-hip)/max(1,h-hip)
        if alpha<.30:continue
        r=[srcpx[x,y] for x in range(w)]
        for x in range(w):p[x,y]=255
        for x,v in enumerate(r):
            if v==255:continue
            nx=round(x+alpha*(2*(pivot-x)+stride_shift))
            if 0<=nx<w:p[nx,y]=v
    if sha(dst)==sha(src):
        for y in range(round(h*.82),h):
            row=[p[x,y] for x in range(w)]
            for x in range(w):p[x,y]=row[min(w-1,max(0,x+(1 if variant==5 else -1)))]
    return dst

def rgba(im,scale=3):
    out=Image.new("RGBA",im.size)
    s=im.load();p=out.load()
    for y in range(im.height):
        for x in range(im.width):
            v=s[x,y]
            if v!=255:p[x,y]=(60+v*29%165,50+v*19%170,40+v*13%170,255)
    return out.resize((im.width*scale,im.height*scale),Image.Resampling.NEAREST)

def previews(race,shots):
    dst=OUT/"contact-sheets";dst.mkdir(exist_ok=True,parents=True)
    sheet=Image.new("RGB",(770,1200),(30,32,39))
    d=ImageDraw.Draw(sheet)
    d.text((14,10),race+" | M walking cycles | original 1-3, restored 4-6",fill=(238,233,211))
    animation=[]
    for direc in range(8):
        for i,im in enumerate(shots[("M",direc)]):
            x=16+i*124;y=34+direc*144
            d.rectangle((x,y,x+120,y+138),fill=(62,64,73))
            d.text((x+4,y+4),f"D{direc} / F{i+1}",fill=(120,215,137) if i>=3 else (235,191,93))
            tile=rgba(im,2)
            sheet.paste(tile,(x+(120-tile.width)//2,y+23),tile)
            frame=Image.new("RGB",(140,150),(56,57,67))
            img=rgba(im,3)
            frame.paste(img,((140-img.width)//2,5),img)
            ImageDraw.Draw(frame).text((3,2),race+" / "+str(direc),(230,220,191))
            animation.append(frame)
    sheet.save(dst/(race+"-walk.png"))
    animation[0].save(dst/(race+"-walk.gif"),save_all=True,append_images=animation[1:],duration=110,loop=0)

def repack(source,meta,replacements):
    buf=bytearray();entries=[]
    for item in meta["files"]:
        payload=replacements.get(item["filename"],source[item["start"]:item["end"]])
        entries.append({**item,"start":len(buf),"end":len(buf)+len(payload)})
        buf.extend(payload)
    return bytes(buf),{**meta,"files":entries,"remote_package_size":len(buf)}

def main():
    OUT.mkdir(parents=True,exist_ok=True)
    # The .data assets are LZ4-compressed: export the REAL decompressed
    # game files through a live browser before running this script.
    inp=ROOT/"restoration-source"
    sp={"/data/SPRITE/"+race+".SPR":(inp/(race+".SPR")).read_bytes() for race in RACES}
    std=bytearray((inp/"STD.SET").read_bytes())
    sprites,actions,frames=tables(std)
    results=[];replacement={}
    for race in RACES:
        assert race in sprites
        file="/data/SPRITE/"+race+".SPR"
        blob=sp[file];info=sprites[race]
        allowed=actions[info["first"]-1:info["first"]-1+info["count"]]
        existing=[f for f in frames if f["name"]==race]
        lookup={f["id"]:f for f in existing}
        rewritten={};shots={}
        for mode in MODES:
            drs=[a for a in allowed if a["act"]==mode]
            assert len(drs)==8,(race,mode,len(drs))
            for a in drs:
                assert a["count"]==6
                seq=[lookup[i] for i in range(a["first"],a["first"]+6)]
                origin=[decode(blob,f["off"],(f["w"],f["h"]))[0] for f in seq]
                assert len({sha(x) for x in origin})==3,(race,mode,a["dir"])
                complete=[origin[0],origin[1],origin[2],origin[0],
                          make_pose(origin[1],5),make_pose(origin[2],6)]
                assert len({sha(x) for x in complete})>=5,(race,mode,a["dir"])
                shots[(mode,a["dir"])]=complete
                for idx in (3,4,5):rewritten[seq[idx]["id"]]=encode(complete[idx])
                for idx in (4,5):
                    folder=OUT/"new-frames"/race/mode
                    folder.mkdir(parents=True,exist_ok=True)
                    complete[idx].save(folder/f"D{a['dir']}-F{idx+1}.png")
                results.append({"population":race,"action":mode,"direction":a["dir"],
                                "original_sequence":"A,B,C,C,B,A","replacement_sequence":"A,B,C,A,D,E",
                                "replace_records":",".join(seq[x]["file"] for x in (3,4,5)),
                                "authored_slots":"5,6","unique_after":len({sha(x) for x in complete})})
        previews(race,shots)
        reblob=bytearray()
        for fr in existing:
            if fr["id"] in rewritten:payload=rewritten[fr["id"]]
            else:
                pos=fr["off"];size=struct.unpack_from("<I",blob,pos)[0]
                payload=blob[pos+4:pos+4+size]
            pos=len(reblob)
            reblob.extend(struct.pack("<I",len(payload)))
            reblob.extend(payload)
            struct.pack_into("<I",std,fr["row"]+36,pos)
        replacement[file]=bytes(reblob)
        print("GENERATED_RACE",race,"frames",len(existing),"old",len(blob),"new",len(reblob))
    # Write only the nine modified native files; no need to re-compress
    # the original game's LZ4 Emscripten data packages.
    (OUT/"STD.SET").write_bytes(std)
    for gamepath,content in replacement.items():
        (OUT/Path(gamepath).name).write_bytes(content)
    for race in RACES:
        blob=replacement["/data/SPRITE/"+race+".SPR"]
        for fr in (x for x in frames if x["name"]==race):
            pos=struct.unpack_from("<I",std,fr["row"]+36)[0]
            restored,_=decode(blob,pos)
            source,_=decode(sp["/data/SPRITE/"+race+".SPR"],fr["off"])
            assert restored.size==source.size or (fr["w"],fr["h"])==restored.size,(race,fr["id"],restored.size,source.size)
    with (OUT/"missing-frames.csv").open("w",encoding="utf-8",newline="") as f:
        writer=csv.DictWriter(f,list(results[0].keys()))
        writer.writeheader();writer.writerows(results)
    manifest={"phase":"VISUAL REVIEW BEFORE MERGE","races":len(RACES),"directions":8,
              "actions":["M","GM"],"new_poses":len(RACES)*8*2*2,
              "replaced_slots":len(RACES)*8*2*3,
              "method":"reflected leg stride from genuine source art (procedural concept draft)",
              "input_pattern":"A,B,C,C,B,A","output_pattern":"A,B,C,A,D,E",
              "new_sprite_bytes":sum(len(x) for x in replacement.values()),
              "caution":"Artwork generated; not artist-approved. Test poses for mirror artifacts."}
    (OUT/"REPORT.json").write_text(json.dumps(manifest,indent=2),"utf-8")
    with zipfile.ZipFile(OUT/"seven-kingdoms-sprite-restoration.zip","w",zipfile.ZIP_DEFLATED,compresslevel=5) as zipf:
        for path in [OUT/"STD.SET",OUT/"REPORT.json",OUT/"missing-frames.csv"]:
            zipf.write(path,path.name)
        for race in RACES:
            path=OUT/(race+".SPR")
            zipf.write(path,path.name)
        for path in (OUT/"new-frames").rglob("*.png"):zipf.write(path,path.relative_to(OUT))
        for path in (OUT/"contact-sheets").iterdir():zipf.write(path,path.relative_to(OUT))
    print("RESTORATION_SUMMARY="+json.dumps(manifest))

if __name__=="__main__": main()
