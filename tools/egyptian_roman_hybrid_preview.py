#!/usr/bin/env python3
"""Non-playable art prototype: real Egyptian lower-body animation + real Roman upper.
Source raster bytes are not altered; only a proof-of-concept contact sheet and GIF.
"""
import sys, json
from pathlib import Path
from PIL import Image,ImageDraw
sys.path.insert(0,str(Path(__file__).resolve().parent))
from restore_walk_frames import tables,decode,rgba,sha
ROOT=Path(__file__).resolve().parents[1]
SRC=ROOT/"restoration-source-all"
ROM=ROOT/"mod"/"sprite-restoration-candidate"
OUT=ROOT/"mod"/"art-previews"/"roman-egyptian"
OUT.mkdir(parents=True,exist_ok=True)
std=(ROM/"STD.SET").read_bytes()
sprites,actions,frames=tables(std)
blobs={"EGYPTIAN":(SRC/"EGYPTIAN.SPR").read_bytes(),"ROMAN":(ROM/"ROMAN.SPR").read_bytes()}

def cycle(name,direc):
    s=sprites[name]
    arr=actions[s["first"]-1:s["first"]-1+s["count"]]
    a=next(a for a in arr if a["act"]=="M" and a["dir"]==direc)
    return [(frames[i],decode(blobs[name],frames[i]["off"])[0]) for i in range(a["first"]-1,a["first"]-1+a["count"])]

def raw_rgba(im):
    return rgba(im,1)

def pieces(roman,egypt):
    rf,ro=roman; ef,eg=egypt
    rcut=round(ro.height*.67)
    ecut=round(eg.height*.65)
    # Both use their real pixels; the Egyptian lower half is not regenerated.
    torso=raw_rgba(ro.crop((0,0,ro.width,rcut)))
    lower=raw_rgba(eg.crop((0,ecut,eg.width,eg.height)))
    canvas=Image.new("RGBA",(100,100),(0,0,0,0))
    seam_y=58
    canvas.alpha_composite(lower,(50-lower.width//2,seam_y))
    canvas.alpha_composite(torso,(50-torso.width//2,seam_y-rcut))
    return canvas,torso,lower,rcut,ecut

def scaled(im,scale=3):
    return im.resize((im.width*scale,im.height*scale),Image.Resampling.NEAREST)

def make(direc,label):
    egypt=cycle("EGYPTIAN",direc);roman=cycle("ROMAN",direc)
    assert len(egypt)==len(roman)==6
    sheet=Image.new("RGB",(1680,690),(26,28,34));d=ImageDraw.Draw(sheet)
    d.text((20,18),f"LEG ANIMATION STUDY: {label}  |  AUTHENTIC EGYPTIAN LOWER BODY + ROMAN UPPER",fill=(242,222,186))
    d.text((20,37),"Preview only: no new pose invented, no in-game sprite replacement.",fill=(190,190,201))
    rows=[("EGYPTIAN donor (original complete frame)",[raw_rgba(im) for f,im in egypt]),
          ("ROMAN current (original complete frame)",[raw_rgba(im) for f,im in roman]),
          ("HYBRID: Roman upper + Egyptian lower",[pieces(a,b)[0] for a,b in zip(roman,egypt)])]
    anim=[]
    for r,(title,frames_) in enumerate(rows):
        y=80+r*198
        d.text((20,y),title,fill=(224,224,223))
        for i,frame in enumerate(frames_):
            left=280+i*228
            d.rectangle((left,y,left+198,y+167),fill=(57,60,68))
            tile=scaled(frame,2 if r==2 else 3)
            x=left+99-tile.width//2
            yy=y+85-tile.height//2
            sheet.paste(tile,(x,yy),tile)
            d.text((left+6,y+4),f"F{i+1}",fill=(235,198,133))
    dest=OUT/f"roman-egyptian-hybrid-{label}.png"
    sheet.save(dest,optimize=True)
    for i in range(6):
        frame=Image.new("RGB",(380,360),(39,43,50));dr=ImageDraw.Draw(frame)
        dr.text((20,15),f"ROMAN / EGYPTIAN LEGS — {label} F{i+1}",fill=(229,218,190))
        tile=scaled(pieces(roman[i],egypt[i])[0],3)
        frame.paste(tile,(40,50),tile)
        anim.append(frame)
    anim[0].save(OUT/f"roman-egyptian-hybrid-{label}.gif",save_all=True,append_images=anim[1:],duration=130,loop=0,disposal=2)
    print("HYBRID_OUTPUT",dest,"bytes",dest.stat().st_size)
    return {"direction":label,"egypt_authored":6,"egypt_unique":len({sha(x[1]) for x in egypt}),
            "roman_authored":6,"roman_unique":len({sha(x[1]) for x in roman}),
            "notes":"Pixel-source hybrid demonstration only; seam and equipment occlusion need per-frame art review."}

def main():
    print("HYBRID_REPORT",json.dumps([make(1,"NE"),make(3,"SE")]))

if __name__=="__main__": main()
