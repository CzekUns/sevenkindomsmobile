#!/usr/bin/env python3
"""Read-only color, foot and shadow diagnostics on the Roman native 8-bit sprites."""
from collections import Counter
from pathlib import Path
import sys
sys.path.insert(0,str(Path(__file__).resolve().parent))
from restore_walk_frames import tables,decode
ROOT=Path(__file__).resolve().parents[1]
DIR=ROOT/"mod"/"sprite-restoration-candidate"
sp,actions,frames=tables((DIR/"STD.SET").read_bytes())
blob=(DIR/"ROMAN.SPR").read_bytes()
meta=sp["ROMAN"]
for action in actions[meta["first"]-1:meta["first"]-1+meta["count"]]:
    if action["act"] not in ("M","GM"):continue
    print("ROMAN",action["act"],"D",action["dir"])
    for i in range(action["first"]-1,action["first"]-1+action["count"]):
        f=frames[i];image,_=decode(blob,f["off"])
        w,h=image.size;pixels=image.load()
        lower=Counter(pixels[x,y] for y in range(int(h*.8),h) for x in range(w) if pixels[x,y]!=255)
        edge=Counter(pixels[x,y] for y in range(max(0,h-8),h) for x in range(w) if pixels[x,y]!=255)
        occupied=[(x,y) for y in range(h) for x in range(w) if pixels[x,y]!=255]
        bottom=[x for y in range(max(0,h-6),h) for x in range(w) if pixels[x,y]!=255]
        print("  frame",i-(action["first"]-1)+1,"size",w,h,"origin",f["x"],f["y"],
              "opaque",len(occupied),"bottom pixels",len(bottom),
              "bottom-width",max(bottom)-min(bottom) if bottom else 0,
              "edgeIndices",edge.most_common(9),"lowerIndices",lower.most_common(9))
