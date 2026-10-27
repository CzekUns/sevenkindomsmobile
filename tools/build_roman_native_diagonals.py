#!/usr/bin/env python3
"""Roman-only native oblique candidate, following skills/seven-kingdoms-oblique-walk.

A visual-review experiment: no loader changes and NO publication of game assets.
Each leg is sampled from a genuine Roman source frame, rigidly rotated at 1:1,
with external leg always composited above internal; no ImageGen or body warping.
"""
import hashlib,json,math,struct,sys
from pathlib import Path
from PIL import Image,ImageDraw
sys.path.insert(0,str(Path(__file__).resolve().parent))
from restore_walk_frames import tables,decode,encode,rgba,sha
ROOT=Path(__file__).resolve().parents[1]
SOURCE=ROOT/"mod"/"sprite-restoration-candidate"
DEST=ROOT/"roman-native-output"
PREVIEW=ROOT/"mod"/"art-previews"/"roman-native-obliques"
DIRECTIONS={1:"NE",3:"SE",5:"SW",7:"NW"}
PHASES=(0.0,0.45,0.90,1.0,0.55,0.15)
X_PAD=9
Y_PAD=3

def pad_canvas(source,size,dx=0,dy=0):
    out=Image.new("L",size,255)
    out.paste(source,(X_PAD+dx,Y_PAD+dy))
    return out

def stroke_mask(im,top_x,foot_x,cut,foot_y):
    """Manual skeletal corridor, select only genuine native leg pixels."""
    w,h=im.size
    mask=Image.new("L",im.size,0)
    d=ImageDraw.Draw(mask)
    d.line([(top_x,cut+1),(foot_x,foot_y-3),(foot_x,foot_y)],fill=255,width=7)
    # Toe cap: keep entire boot from the genuine donor, not just the shin.
    d.ellipse((foot_x-5,foot_y-3,foot_x+5,foot_y+2),fill=255)
    src=im.load();m=mask.load()
    for yy in range(h):
      for xx in range(w):
        if yy<=cut or src[xx,yy] in (0,255):m[xx,yy]=0
    return mask

def rigid_rotate(layer, pivot,angle_degrees,translation_x=0):
    """Orthogonal transform only (scale 1), inverse affine nearest."""
    theta=math.radians(angle_degrees)
    co=math.cos(theta);si=math.sin(theta)
    px,py=pivot
    target_x=px+translation_x
    # The swing moves the hip pivot horizontally underneath the skirt.
    # This is TRANSLATION, not a size or shape change.
    affine=(co,si,px-co*target_x-si*py,-si,co,py+si*target_x-co*py)
    return layer.transform(layer.size,Image.Transform.AFFINE,affine,
                           resample=Image.Resampling.NEAREST,fillcolor=255)

def image_layer(original,mask,out_size,offx,offy):
    ix=pad_canvas(original,out_size,offx,offy)
    mx=pad_canvas(mask,out_size,offx,offy)
    out=Image.new("L",out_size,255)
    out.paste(ix,(0,0),mx)
    return out

def overlay(base,layer):
    base.paste(layer,(0,0),layer.point(lambda v:255 if v!=255 else 0))
    return base

def build(poses,mode,d):
    f0,ref=poses[0]
    w,h=ref.size
    down=d in (3,5)
    # Downhill original skirt/shield end around y=35 on a 55 px canvas.
    # Uphill M skirt ends around y=30, GM around y=35.
    cut=round(h*.65) if down else round(h*.65)
    if down:
        front_foot=(round(w*.75),h-5)
        inner_foot=(round(w*.34),h-5)
        front_donor=0
        inner_donor=1 if d==3 else 2
        front_start=round(w*.50);inner_start=round(w*.49)
        theta=51
        erase=(round(w*.17),round(w*.90))
    else:
        front_foot=(round(w*.28),h-5)
        inner_foot=(round(w*.64),h-5)
        front_donor=0;inner_donor=2
        front_start=round(w*.51);inner_start=round(w*.55)
        theta=-57
        erase=(round(w*.14),round(w*.73))
    dest_size=(w+2*X_PAD,h+2*Y_PAD)
    parts=[]
    for role,idx,hip,tip in (("external",front_donor,front_start,front_foot),
                             ("internal",inner_donor,inner_start,inner_foot)):
        f,img=poses[idx]
        delta_x=f["x"]-f0["x"]
        delta_y=f["y"]-f0["y"]
        sx=hip+(delta_x if role=="internal" else 0)
        mask=stroke_mask(img,sx,tip[0],cut,tip[1])
        layer=image_layer(img,mask,dest_size,delta_x,delta_y)
        size=sum(v!=255 for v in layer.tobytes())
        assert size>=12,(mode,d,role,"too few authentic pixels",size)
        pivot=(X_PAD+sx,Y_PAD+cut+1)
        parts.append((role,layer,pivot,size))
    # Rotation signs follow image coordinates (+Y down): downstream-facing
    # forward foot on the right requires +angle to swing left, not -angle.
    # Protect all torso/skirt pixels above the cut, including equipment/shield.
    torso=pad_canvas(ref,dest_size)
    op=torso.load()
    for yy in range(cut+1,h):
      for xx in range(erase[0],erase[1]+1):
        if 0<=xx<w and op[X_PAD+xx,Y_PAD+yy]!=0:
           op[X_PAD+xx,Y_PAD+yy]=255
    # Keep the ground contact shadow (native index 0) exactly fixed.
    preserved_shadow=pad_canvas(ref,dest_size)
    shadow=Image.new("L",dest_size,255)
    p=preserved_shadow.load();q=shadow.load()
    for yy in range(dest_size[1]):
      for xx in range(dest_size[0]):
        if p[xx,yy]==0:q[xx,yy]=0
    # Residual pixels under the skirt in the donor torso are forbidden:
    # these old-leg pixels must be cleared before layering fresh limbs.
    assert all(op[X_PAD+xx,Y_PAD+yy] in (0,255) for yy in range(cut+1,h)
               for xx in range(max(0,erase[0]),min(w,erase[1]+1)))
    out=[]
    extent=[]
    for n,t in enumerate(PHASES):
      phase_base=shadow.copy()
      # Outer/near leg ALWAYS on top of internal/far leg.
      roles={role:(layer,pivot,area) for role,layer,pivot,area in parts}
      for role in ("internal","external"):
        layer,pivot,area=roles[role]
        angle=(theta if role=="external" else -theta)*t
        # Analogous to the approved prototype, the two hidden leg pivots
        # drift apart so feet change places without intersecting at the ankle.
        direction_sign=(1 if not down else -1)
        drift=direction_sign*3.0*t*(1 if role=="external" else -1)
        transformed=rigid_rotate(layer,pivot,angle,drift)
        # Rotation is orthonormal; pixel coverage may fluctuate by discretization.
        coverage=sum(v!=255 for v in transformed.tobytes())
        assert abs(coverage-area)<max(8,round(area*.30)),(mode,d,role,n,area,coverage)
        overlay(phase_base,transformed)
      overlay(phase_base,torso)
      assert all(v==255 or v<248 for v in phase_base.tobytes())
      out.append(phase_base)
      extent.append({r[0]:r[3] for r in parts}|{"phase":t})
    return out,parts,torso,{"cutoff":cut,"sizes":dict((p[0],p[3]) for p in parts),
                           "angles":[theta,-theta],
                           "same_native_scale":True,"shadow_fixed":True,
                           "z_order":"shadow->internal->external->torso","phases":list(PHASES)}

def contact_sheet(mode,d,label,original,new,parts,torso):
    # 6 before + 6 after, fixed x/y origin and 5x zoom.
    canvas=Image.new("RGB",(6*150+30,400),(25,28,35))
    pen=ImageDraw.Draw(canvas)
    pen.text((12,7),f"ROMAN {mode} {label} | NATIVE PIXELS | six-frame before (top) and new candidate (bottom)",fill=(235,219,180))
    for row,images in enumerate((original,new)):
      pen.text((10,31+row*177),"BEFORE" if row==0 else "RIGID LEGS",fill=(235,193,110))
      for i,im in enumerate(images):
        x=25+i*150;y=52+row*175
        pen.rectangle((x,y,x+142,y+159),fill=(59,61,70))
        tile=rgba(im,3)
        canvas.paste(tile,(x+(142-tile.width)//2,y+5),tile)
        pen.text((x+6,y+144),f"F{i+1}",fill=(238,227,211))
    canvas.save(PREVIEW/f"ROMAN-{mode}-{label}-before-after.png")
    figs=[]
    for i,im in enumerate(new):
      fr=Image.new("RGB",(200,230),(38,41,49));dr=ImageDraw.Draw(fr)
      dr.text((12,8),f"ROMAN {mode} {label} F{i+1}",fill=(236,219,186))
      tile=rgba(im,4)
      fr.paste(tile,(100-tile.width//2,28),tile)
      figs.append(fr)
    figs[0].save(PREVIEW/f"ROMAN-{mode}-{label}.gif",save_all=True,append_images=figs[1:],
                 duration=150,disposal=2,loop=0)
    figs[0].save(PREVIEW/f"ROMAN-{mode}-{label}-slow.gif",save_all=True,append_images=figs[1:],
                 duration=350,disposal=2,loop=0)
    for i,im in enumerate(new):
      place=PREVIEW/"frames"/"ROMAN"/mode/label
      place.mkdir(parents=True,exist_ok=True)
      rgba(im,1).save(place/f"F{i+1:02d}.png")
    masks=Image.new("RGB",(3*220,240),(32,35,42))
    dd=ImageDraw.Draw(masks)
    for index,(title,layer) in enumerate([("INTERNAL",parts[1][1]),("EXTERNAL",parts[0][1]),("TORSO CLEAN",torso)]):
      x=index*220;dd.text((x+8,5),title,fill=(232,218,178))
      tile=rgba(layer,3)
      masks.paste(tile,(x+110-tile.width//2,25),tile)
    masks.save(PREVIEW/f"ROMAN-{mode}-{label}-masks.png")
    tri=Image.new("RGB",(3*240,290),(35,37,45))
    for i,idx in enumerate((0,2,3)):
       tile=rgba(new[idx],4)
       tri.paste(tile,(i*240+120-tile.width//2,30),tile)
       ImageDraw.Draw(tri).text((i*240+12,8),("A","CENTER","B")[i],fill=(232,205,150))
    tri.save(PREVIEW/f"ROMAN-{mode}-{label}-A-center-B.png")

def main():
    DEST.mkdir(parents=True,exist_ok=True)
    PREVIEW.mkdir(parents=True,exist_ok=True)
    raw=(SOURCE/"ROMAN.SPR").read_bytes()
    # The MOD actively loads the final god-shadow STD.SET (17 native assets).
    # Never regress deity offsets by building from the older restoration table.
    active_std=ROOT/"mod"/"god-shadow-candidate"/"STD.SET"
    assert active_std.exists(),"Missing active MOD SFRAME index"
    baseline=active_std.read_bytes()
    std=bytearray(baseline)
    sprites,acts,frames=tables(std)
    obj=sprites["ROMAN"]
    roman_acts=acts[obj["first"]-1:obj["first"]-1+obj["count"]]
    old_frames=[f for f in frames if f["name"]=="ROMAN"]
    lookup={f["id"]:f for f in old_frames}
    patched={}
    report={}
    for mode in ("M","GM"):
      for d,name in DIRECTIONS.items():
        act=next(a for a in roman_acts if a["act"]==mode and a["dir"]==d)
        assert act["count"]==6,(mode,d,act["count"])
        ids=list(range(act["first"],act["first"]+6))
        orig=[(lookup[i],decode(raw,lookup[i]["off"])[0]) for i in ids]
        images,parts,torso,notes=build(orig,mode,d)
        # Use a SINGLE fixed sprite crop and offset across the walk cycle;
        # preserve absolute world origin as base original frame + padding.
        f0=orig[0][0]
        for ident,im in zip(ids,images):
          f=lookup[ident]
          patched[ident]=im
          for k,start,length,value in (
               ("x",14,4,f0["x"]-X_PAD),
               ("y",18,4,f0["y"]-Y_PAD),
               ("w",22,3,im.width),("h",25,3,im.height)):
            v=str(value).rjust(length).encode("ascii")
            assert len(v)==length,(k,v)
            std[f["row"]+start:f["row"]+start+length]=v
        contact_sheet(mode,d,name,[x[1] for x in orig],images,parts,torso)
        report[f"{mode}-{name}"]=notes
        print("RIGID_ROMAN_CANDIDATE",mode,d,name,notes)
    # Construct an offline candidate .SPR; this branch must NOT serve it to the game
    # until visual approval and explicit merging.
    rewritten=bytearray()
    changed_ids=set(patched)
    for f in old_frames:
      if f["id"] in patched:
        payload=encode(patched[f["id"]])
      else:
        old_len=struct.unpack_from("<I",raw,f["off"])[0]
        payload=raw[f["off"]+4:f["off"]+4+old_len]
      offset=len(rewritten)
      rewritten.extend(struct.pack("<I",len(payload)))
      rewritten.extend(payload)
      struct.pack_into("<I",std,f["row"]+36,offset)
    (DEST/"ROMAN.SPR").write_bytes(rewritten)
    (DEST/"STD.SET").write_bytes(std)
    (_,new_actions,new_frames)=tables(std)
    assert acts==new_actions
    for f in old_frames:
      old,_=decode(raw,f["off"])
      after=next(x for x in new_frames if x["id"]==f["id"])
      new,_=decode(rewritten,after["off"])
      if f["id"] not in changed_ids:
         assert old.tobytes()==new.tobytes(),("Non-diagonal damaged",f["file"])
      else:
         assert new.size==(after["w"],after["h"])
    assert len(changed_ids)==48
    # Outside Roman SFRAME records, the complete active table must be
    # byte-identical (including all deity offsets and all unrelated resources).
    protected=bytearray(baseline)
    for f in old_frames:
      # Roman offsets change when the archive is rebuilt; the four bounding
      # fields change only for the 48 diagonal frames.
      if f["id"] in changed_ids:
        for at,length in ((14,4),(18,4),(22,3),(25,3)):
          idx=f["row"]+at
          protected[idx:idx+length]=std[idx:idx+length]
      idx=f["row"]+36
      protected[idx:idx+4]=std[idx:idx+4]
    assert bytes(protected)==bytes(std),"Non-Roman SFRAME / gods or resources changed"
    report["QA"]={"modified_frames":len(changed_ids),"non_diagonal_ROMAN_identical":True,
      "all_non_Roman_sprites_untouched":True,"native_loading_not_changed":True,
      "visual_review_required":True,"not_approved_for_merge":True}
    (PREVIEW/"QA.json").write_text(json.dumps(report,indent=2))
    print("NATIVE_ROMAN_CANDIDATES_PASS",json.dumps(report["QA"]))
if __name__=="__main__":main()
