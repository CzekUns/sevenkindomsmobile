#!/usr/bin/env python3
"""Enhance the eight added gods' native indexed ground-contact shadows.

All original/classic sprites are intentionally excluded: their raster palette
does NOT contain the 0-index shadow marker (confirmed by full SPR roster audit).
"""
from pathlib import Path
import sys,json,struct
sys.path.insert(0,str(Path(__file__).resolve().parent))
from restore_walk_frames import tables,decode,encode,rgba
from enhance_unit_shadows import fixed_anchor,expand,make_contact_sheet,SHADOW
from PIL import Image,ImageDraw

ROOT=Path(__file__).resolve().parents[1]
BASE=ROOT/"mod"/"sprite-restoration-candidate"
SOURCE=ROOT/"restoration-source-all"
OUT=ROOT/"god-shadow-output"
GODS=("JUPITER","CERNUNNO","MAMERTE","TINIA","TENGRI","NETON","MARDUK","BAAL_HAM")

def previews(name,old,new,frames,actions):
    p=OUT/"previews";p.mkdir(exist_ok=True,parents=True)
    walks=sorted((a for a in actions if a["act"]=="M"),key=lambda a:a["dir"])
    if not walks:return
    sheet=Image.new("RGB",(790,1050),(30,32,40));d=ImageDraw.Draw(sheet)
    d.text((12,12),name+" walking directions | original vs enhanced ground shadow",fill=(241,228,185))
    for i,a in enumerate(walks):
        fid=a["first"];b=old[fid];c=new[fid]
        for j,im in enumerate((b,c)):
            x=100+j*320;y=36+i*126
            d.rectangle((x,y,x+270,y+120),fill=(65,65,75))
            tile=rgba(im,3)
            sheet.paste(tile,(x+135-tile.width//2,y+60-tile.height//2),tile)
            d.text((x+5,y+4),"ORIGINAL" if j==0 else "SHADOW",fill=(239,215,171))
        d.text((10,50+i*126),"D"+str(a["dir"]),fill=(228,221,202))
    sheet.save(p/(name+"-shadow.png"))

def main():
    OUT.mkdir(parents=True,exist_ok=True)
    std=bytearray((BASE/"STD.SET").read_bytes())
    sprites,actions,frames=tables(std)
    report={}
    for name in GODS:
        blob=(SOURCE/(name+".SPR")).read_bytes()
        info=sprites[name]
        acts=actions[info["first"]-1:info["first"]-1+info["count"]]
        all_frames=[x for x in frames if x["name"]==name]
        lookup={f["id"]:f for f in all_frames}
        originals={f["id"]:decode(blob,f["off"],(f["w"],f["h"]))[0] for f in all_frames}
        updated={k:x.copy() for k,x in originals.items()}
        changed=0;pixels=0;missing=0
        for action in acts:
            src=[(lookup[k],originals[k]) for k in range(action["first"],action["first"]+action["count"])]
            anchor=fixed_anchor(src)
            for frame,img in src:
                dst,n=expand(img,frame,anchor)
                if n:changed+=1;pixels+=n
                if anchor is None:missing+=1
                updated[frame["id"]]=dst
        reb=bytearray()
        for fr in all_frames:
            payload=encode(updated[fr["id"]])
            offset=len(reb)
            reb.extend(struct.pack("<I",len(payload)))
            reb.extend(payload)
            struct.pack_into("<I",std,fr["row"]+36,offset)
        (OUT/(name+".SPR")).write_bytes(reb)
        previews(name,originals,updated,frames,acts)
        report[name]={"total_frames":len(all_frames),"enhanced_frames":changed,"shadow_pixels_added":pixels,"no_anchor":missing}
        print("GOD_SHADOW",name,report[name])
    (OUT/"STD.SET").write_bytes(std)
    assert sum(report[n]["enhanced_frames"] for n in GODS)>1000
    report["summary"]={"gods":len(GODS),"frames":sum(report[n]["enhanced_frames"] for n in GODS),
                       "added_pixels":sum(report[n]["shadow_pixels_added"] for n in GODS),
                       "scope":"only added deities, no ancient/main original sprite assets changed"}
    (OUT/"REPORT.json").write_text(json.dumps(report,indent=2))
    print("GOD_SHADOW_SUMMARY="+json.dumps(report["summary"]))
if __name__=="__main__":main()
