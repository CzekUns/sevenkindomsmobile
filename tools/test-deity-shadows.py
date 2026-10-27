#!/usr/bin/env python3
"""Assert newly shadowed deity pixels only extend transparent ground area."""
import sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parent))
from restore_walk_frames import tables,decode
from enhance_deity_shadows import GODS
root=Path(__file__).resolve().parents[1]
orig=root/"restoration-source-all"
out=root/"god-shadow-output"
base=root/"mod"/"sprite-restoration-candidate"
a=(base/"STD.SET").read_bytes();b=(out/"STD.SET").read_bytes()
sp1,ac1,fr1=tables(a);sp2,ac2,fr2=tables(b)
assert sp1==sp2 and ac1==ac2 and len(fr1)==len(fr2)
added=0;changes=0
for name in GODS:
    prior=(orig/(name+".SPR")).read_bytes()
    latest=(out/(name+".SPR")).read_bytes()
    for x,y in zip((f for f in fr1 if f["name"]==name),(f for f in fr2 if f["name"]==name)):
        assert (x["file"],x["x"],x["y"],x["w"],x["h"])==(y["file"],y["x"],y["y"],y["w"],y["h"])
        old,_=decode(prior,x["off"]);new,_=decode(latest,y["off"])
        oldb=old.tobytes();newb=new.tobytes()
        changed=[i for i,(a,b) in enumerate(zip(oldb,newb)) if a!=b]
        for i in changed:
            assert oldb[i]==255 and newb[i]==0,(name,x["file"],i)
            assert i//old.width>=old.height-8,(name,x["file"],i//old.width)
        if changed:changes+=1;added+=len(changed)
assert changes>1000 and added>changes
print("ALL_EIGHT_ADDED_DEITY_SHADOWS_PASS",{"frames":changes,"added_pixels":added})
