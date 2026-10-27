#!/usr/bin/env python3
"""Enhance native foot-contact shadows on all eight added human civilizations.

The game's existing index 0 at each frame's base is the shadow marker. Never
change a drawn limb, weapon, or the artist's opaque pixels. Retain SFRAME crop,
pivot, playback order, and native 8-bit palette. Keep an action's shadow center
fixed in world coordinates to avoid footsteps making the shadow wobble.
"""
import hashlib,json,statistics,struct,sys
from collections import defaultdict
from pathlib import Path
from PIL import Image,ImageDraw
sys.path.insert(0,str(Path(__file__).resolve().parent))
from restore_walk_frames import RACES,MODES,decode,encode,sha,tables,rgba

ROOT=Path(__file__).resolve().parents[1]
BASE=ROOT/"mod"/"sprite-restoration-candidate"
OUT=ROOT/"shadow-output"
SHADOW=0
TRANSPARENT=255

def seeds(image):
    w,h=image.size;p=image.load()
    found=[(x,y) for y in range(max(0,h-7),h) for x in range(w) if p[x,y]==SHADOW]
    return found if len(found)>=4 and len(found)<=65 else []

def fixed_anchor(action_frames):
    """Stable per action & facing (coordinates account for SFRAME crop offsets)."""
    x_c=[];y_c=[];spans=[]
    for frame,image in action_frames:
        pp=seeds(image)
        if not pp:continue
        x_c.append(statistics.median(x for x,y in pp)+frame["x"])
        y_c.append(statistics.median(y for x,y in pp)+frame["y"])
        spans.append(max(x for x,y in pp)-min(x for x,y in pp))
    if len(x_c)<1:return None
    rx=max(7.0,min(11.0,statistics.median(spans)*0.80+4.0))
    return (statistics.median(x_c),statistics.median(y_c),rx)

def expand(image,frame,anchor):
    if not anchor or not seeds(image):return image.copy(),0
    w,h=image.size; src=image.load();dst=image.copy();pix=dst.load()
    world_x,world_y,rx=anchor
    x0=world_x-frame["x"];y0=world_y-frame["y"]
    ry=2.6
    added=0
    for y in range(max(0,int(y0-4)),min(h,int(y0+5))):
        for x in range(max(0,int(x0-rx-1)),min(w,int(x0+rx+2))):
            dx=(x-x0)/rx;dy=(y-y0)/ry
            dist=dx*dx+dy*dy
            if dist>1 or src[x,y]!=TRANSPARENT:continue
            # Center mostly filled, outer rim stippled for soft-ground contact.
            if dist<0.56 or (x*3+y*5)%5<3:
                pix[x,y]=SHADOW
                added+=1
    assert all((b==a or (b==TRANSPARENT and a==SHADOW))
               for b,a in zip(image.tobytes(),dst.tobytes()))
    return dst,added

def make_contact_sheet(race,original,updated,frames,actions):
    folder=OUT/"previews";folder.mkdir(exist_ok=True,parents=True)
    for mode in MODES:
        show=[action for action in actions if action["act"]==mode]
        if len(show)!=8:continue
        # image records keyed by the source global frame ID (not directional guess)
        sheet=Image.new("RGB",(880,8*132+40),(33,35,41))
        draw=ImageDraw.Draw(sheet)
        draw.text((12,8),race+" "+mode+" | left: original  |  right: enhanced ground shadow",fill=(238,222,186))
        for row,action in enumerate(sorted(show,key=lambda x:x["dir"])):
            record=frames[action["first"]-1]
            orig=original[record["id"]]
            new=updated[record["id"]]
            for col,(img,label) in enumerate(((orig,"BEFORE"),(new,"AFTER"))):
                box_x=130+col*350;box_y=35+row*132
                draw.rectangle((box_x,box_y,box_x+280,box_y+122),fill=(64,65,74))
                tile=rgba(img,3)
                sheet.paste(tile,(box_x+140-tile.width//2,box_y+60-tile.height//2),tile)
                draw.text((box_x+5,box_y+3),label,fill=(242,221,183))
            draw.text((8,42+row*132),"D"+str(action["dir"]),fill=(223,223,224))
        sheet.save(folder/(race+("-GM" if mode=="GM" else "")+"-shadow.png"))

def main():
    OUT.mkdir(exist_ok=True,parents=True)
    std=bytearray((BASE/"STD.SET").read_bytes())
    sprites,actions,frames=tables(std)
    frame_by_id={x["id"]:x for x in frames}
    report={}
    for race in RACES:
        blob=(BASE/(race+".SPR")).read_bytes()
        info=sprites[race]
        acts=actions[info["first"]-1:info["first"]-1+info["count"]]
        all_frames=[f for f in frames if f["name"]==race]
        decoded={f["id"]:decode(blob,f["off"],(f["w"],f["h"]))[0] for f in all_frames}
        out={k:im.copy() for k,im in decoded.items()}
        count=0;pixel_growth=0;skipped=0
        for action in acts:
            sources=[(frame_by_id[k],decoded[k]) for k in range(action["first"],action["first"]+action["count"])]
            anchor=fixed_anchor(sources)
            for frame,image in sources:
                enhanced,added=expand(image,frame,anchor)
                if not seeds(image):skipped+=1
                if added:
                    count+=1;pixel_growth+=added
                out[frame["id"]]=enhanced
        reb=bytearray()
        for f in all_frames:
            payload=encode(out[f["id"]])
            offset=len(reb)
            reb.extend(struct.pack("<I",len(payload)));reb.extend(payload)
            struct.pack_into("<I",std,f["row"]+36,offset)
        (OUT/(race+".SPR")).write_bytes(reb)
        make_contact_sheet(race,decoded,out,frames,acts)
        report[race]={"changed_frames":count,"shadow_pixels_added":pixel_growth,"frames_without_shadow_marker":skipped,"total_frames":len(all_frames)}
        print("SHADOW_CIV",race,report[race])
    (OUT/"STD.SET").write_bytes(std)
    report["summary"]={"changed_frames":sum(report[r]["changed_frames"] for r in RACES),
                       "added_pixels":sum(report[r]["shadow_pixels_added"] for r in RACES),
                       "note":"Only transparent pixels near each character's original contact shadow became native palette index 0; sprite offsets and action tables unchanged"}
    (OUT/"REPORT.json").write_text(json.dumps(report,indent=2))
    assert report["summary"]["changed_frames"]>500,"Unexpectedly few character frames received ground shadow"
    print("SHADOW_AUDIT="+json.dumps(report))

if __name__=="__main__":main()
