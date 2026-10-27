#!/usr/bin/env python3
"""Assert global shadow enhancement never edits limbs, materials or direction."""
from pathlib import Path
import sys
sys.path.insert(0,str(Path(__file__).resolve().parent))
from restore_walk_frames import RACES,decode,tables
ROOT=Path(__file__).resolve().parents[1]
BASE=ROOT/"mod"/"sprite-restoration-candidate"
OUT=ROOT/"shadow-output"
a=BASE.joinpath("STD.SET").read_bytes();b=OUT.joinpath("STD.SET").read_bytes()
sa,aa,fa=tables(a);sb,ab,fb=tables(b)
assert sa==sb and aa==ab and len(fa)==len(fb)
changed=0;growth=0;unmodified=0
for race in RACES:
    old=(BASE/(race+".SPR")).read_bytes()
    new=(OUT/(race+".SPR")).read_bytes()
    for orig,next in zip((x for x in fa if x["name"]==race),(x for x in fb if x["name"]==race)):
        assert (orig["name"],orig["file"],orig["x"],orig["y"],orig["w"],orig["h"])==(
                next["name"],next["file"],next["x"],next["y"],next["w"],next["h"])
        p,_=decode(old,orig["off"]);q,_=decode(new,next["off"])
        before,after=p.tobytes(),q.tobytes()
        delta=[i for i,(x,y) in enumerate(zip(before,after)) if x!=y]
        for i in delta:
            assert before[i]==255 and after[i]==0,(race,orig["file"],i,before[i],after[i])
            assert i//p.width>=p.height-8,(race,orig["file"],i//p.width,p.height)
        if delta:changed+=1;growth+=len(delta)
        else:unmodified+=1
assert changed>500 and growth>changed
print("SHADOW_DIFF_PASS",{"changed":changed,"pixels_added":growth,"unchanged":unmodified,
                           "source_frames":"byte/palette preserved; only 255->0 near ground"})
