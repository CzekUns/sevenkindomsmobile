#!/usr/bin/env python3
"""Read-only reference atlas from REAL Seven Kingdoms sprites.
Egyptians: leg-motion donor, Romans: torso recipient. Only diagonal walking.
Never makes an in-game patch or mutates sprites.
"""
from pathlib import Path
from PIL import Image, ImageDraw
import sys, json, hashlib
sys.path.insert(0,str(Path(__file__).resolve().parent))
from restore_walk_frames import tables,decode,rgba,sha

ROOT=Path(__file__).resolve().parents[1]
INP=ROOT/"restoration-source-all"
ROM=ROOT/"mod"/"sprite-restoration-candidate"
OUT=ROOT/"mod"/"art-previews"/"roman-egyptian"
DIRECTIONS=(("NE",1),("SE",3),("SW",5),("NW",7))
MODES=("M","GM")
SCALE=3

def walking(std,blob,name,mode,direction):
    sprites,acts,frames=tables(std)
    sprite=sprites[name]
    permitted=acts[sprite["first"]-1:sprite["first"]-1+sprite["count"]]
    matching=[x for x in permitted if x["act"]==mode and x["dir"]==direction]
    if not matching:
        return []
    act=matching[0]
    assert act["count"]>0,(name,mode,direction)
    out=[]
    for index in range(act["first"]-1,act["first"]-1+act["count"]):
        f=frames[index]
        im,_=decode(blob,f["off"],(f["w"],f["h"]))
        out.append((f,im))
    return out

def tile_image(frames,center_x,center_y,height=130,max_frames=6):
    # The composite preview uses a common *world offset*, never crop-centered,
    # so authentic leg movement can be compared across source frames.
    result=Image.new("RGBA",(max_frames*120,height),(0,0,0,0))
    markers=[]
    for i,(fr,im) in enumerate(frames[:max_frames]):
        scaled=rgba(im,SCALE)
        # The SFRAME x/y are world-relative. Normalize against that action's
        # median origin to avoid drift from crops of different dimensions.
        x=center_x+i*120+int((fr["x"]-frames[0][0]["x"])*SCALE)-scaled.width//2
        y=center_y+int((fr["y"]-frames[0][0]["y"])*SCALE)-scaled.height//2
        result.alpha_composite(scaled,(max(0,min(result.width-scaled.width,x)),max(0,min(height-scaled.height,y))))
        markers.append({"step":i+1,"sha":sha(im)[:10],"size":list(im.size),"anchor":[fr["x"],fr["y"]]})
    return result,markers

def main():
    OUT.mkdir(parents=True,exist_ok=True)
    std=(ROM/"STD.SET").read_bytes()
    eg=(INP/"EGYPTIAN.SPR").read_bytes()
    ro=(ROM/"ROMAN.SPR").read_bytes()
    report={}
    for mode in MODES:
        W,H=1660,4*290+80
        sheet=Image.new("RGB",(W,H),(27,29,34))
        draw=ImageDraw.Draw(sheet)
        draw.text((20,20),f"REAL 7K FRAMES | EGYPTIAN LEGS → ROMAN TORSO | {mode} | ORIGINAL BITMAPS",fill=(231,222,197))
        for n,(label,di) in enumerate(DIRECTIONS):
            yy=65+n*290
            draw.text((22,yy+7),f"{label} | D{di}",fill=(239,200,137))
            for col,(name,blob) in enumerate((("EGYPTIAN",eg),("ROMAN",ro))):
                samples=walking(std,blob,name,mode,di)
                if not samples:
                    draw.text((50+col*800,yy+70),f"{name} DOES NOT HAVE {mode} D{di}",fill=(235,106,96))
                    report[f"{mode}-{label}-{name}"]={"count":0}
                    continue
                title=f"{name} — {len(samples)} authored frames, {len({sha(im) for _,im in samples})} unique"
                draw.text((42+col*810,yy+12),title,fill=(230,231,225))
                t,metadata=tile_image(samples,45,92,height=160)
                bg=Image.new("RGB",t.size,(55,58,64))
                bg.paste(t,(0,0),t)
                sheet.paste(bg,(30+col*810,yy+42))
                draw.line((32+col*810,yy+206,750+col*810,yy+206),fill=(100,100,109))
                for i in range(min(6,len(samples))):
                    draw.text((50+col*810+i*120,yy+215),f"F{i+1}",fill=(200,207,208))
                # also show original leg-only pixels as transparent cutout
                legstrip=Image.new("RGBA",(720,58),(0,0,0,0))
                for i,(fr,im) in enumerate(samples[:6]):
                    crop=im.crop((0,int(im.height*.63),im.width,im.height))
                    scaled=rgba(crop,2)
                    x=55+i*120-scaled.width//2
                    legstrip.alpha_composite(scaled,(max(0,x),0))
                legbg=Image.new("RGB",legstrip.size,(55,58,64));legbg.paste(legstrip,(0,0),legstrip)
                sheet.paste(legbg,(30+col*810,yy+235))
                report[f"{mode}-{label}-{name}"]={"count":len(samples),"unique":len({sha(im) for _,im in samples}),"frames":metadata}
            draw.line((20,yy+286,W-20,yy+286),fill=(104,101,90),width=1)
        dest=OUT/f"egyptian-vs-roman-{mode}-diagonals.png"
        sheet.save(dest,optimize=True)
        print("PREVIEW_OUTPUT",dest,"size",dest.stat().st_size)
    (OUT/"report.json").write_text(json.dumps(report,indent=2),encoding="utf8")
    print("REFERENCE_SUMMARY="+json.dumps({k:{"count":v["count"],"unique":v.get("unique")} for k,v in report.items()}))

if __name__=="__main__":main()
