#!/usr/bin/env python3
from pathlib import Path
from collections import Counter
import sys
sys.path.insert(0,str(Path(__file__).resolve().parent))
from restore_walk_frames import record_data,fld,number,tables,decode
root=Path(__file__).resolve().parents[1]
raw=root/"restoration-source-all"
std=(raw/"STD.SET").read_bytes()
sprites,acts,frames=tables(std)
for (p,row) in record_data(std,"SPRITE"):
    name=fld(row,0,8)
    typ=fld(row,8,9)
    path=raw/(name+".SPR")
    if not path.exists(): continue
    b=path.read_bytes()
    selected=[f for f in frames if f["name"]==name]
    count=0;valid=0;xs=[]
    for f in selected[:32]:
        try:
            img,_=decode(b,f["off"])
        except Exception:
            continue
        valid+=1
        pixels=img.load();h=img.height;w=img.width
        allzero=sum(x==0 for x in img.tobytes())
        shadows=[(x,y) for y in range(max(0,h-7),h) for x in range(w) if pixels[x,y]==0]
        if allzero and 4<=len(shadows)<=65 and len(shadows)/allzero>=.70 and max(y for x,y in shadows)>=h-4:
            count+=1;xs.append(len(shadows))
    print("SHADOW_ROSTER",name,"kind",typ,"frames",len(selected),"scanned",valid,"candidates",count,"mean_seed",round(sum(xs)/len(xs),1) if xs else 0)
