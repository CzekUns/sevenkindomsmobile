#!/usr/bin/env python3
"""Regression gate: never change E, NW or any direction other than SE."""
from pathlib import Path
from sys import path as sys_path
sys_path.insert(0,str(Path(__file__).resolve().parent))
from restore_walk_frames import tables,decode,sha,RACES,MODES

ROOT=Path(__file__).resolve().parents[1]
BEFORE=ROOT/"mod"/"sprite-restoration-candidate"
AFTER=ROOT/"sprite-restoration-output"
old_sprites,old_actions,old_frames=tables((BEFORE/"STD.SET").read_bytes())
new_sprites,new_actions,new_frames=tables((AFTER/"STD.SET").read_bytes())
assert old_sprites==new_sprites
assert len(old_frames)==len(new_frames)
assert len(old_actions)==len(new_actions)
changes={}
for race in RACES:
    prior=(BEFORE/(race+".SPR")).read_bytes()
    new=(AFTER/(race+".SPR")).read_bytes()
    info=old_sprites[race]
    a1=old_actions[info["first"]-1:info["first"]-1+info["count"]]
    a2=new_actions[info["first"]-1:info["first"]-1+info["count"]]
    assert a1==a2,(race,"action labels changed")
    for old_action,new_action in zip(a1,a2):
        original=[]
        restored=[]
        for idx in range(old_action["first"]-1,old_action["first"]-1+old_action["count"]):
            x,y=old_frames[idx],new_frames[idx]
            assert x["name"]==y["name"] and x["file"]==y["file"],(race,idx)
            old,_=decode(prior,x["off"])
            updated,_=decode(new,y["off"])
            original.append(sha(old))
            restored.append(sha(updated))
        edits=[i for i,(x,y) in enumerate(zip(original,restored)) if x!=y]
        if old_action["act"] in MODES and old_action["dir"]==3:
            assert edits==[1,2,3,4,5],(race,old_action["act"],edits)
            assert len(set(restored))==6,(race,old_action["act"],"missing actual alternating poses")
            changes[(race,old_action["act"])]=len(edits)
        else:
            assert not edits,(race,old_action["act"],old_action["dir"],edits)
assert len(changes)==len(RACES)*len(MODES)
print("SE_DIRECTION_ONLY=PASS, edited frame entries",sum(changes.values()),
      "all E/NW/NE/SW and classic directions untouched at bitmap level")
