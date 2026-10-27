#!/usr/bin/env python3
"""Read-only scaled diagnostic of the EXACT native Roman walk frames and leg regions."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import sys,json
sys.path.insert(0,str(Path(__file__).resolve().parent))
from restore_walk_frames import decode,tables,rgba,sha
ROOT=Path(__file__).resolve().parents[1]
DIR=ROOT/"mod"/"sprite-restoration-candidate"
OUT=ROOT/"mod"/"art-previews"/"roman-native-obliques"
OUT.mkdir(parents=True,exist_ok=True)
std=(DIR/"STD.SET").read_bytes()
sp,actions,frames=tables(std)
rom=(DIR/"ROMAN.SPR").read_bytes()
s=sp["ROMAN"]
data={}
for mode in ("M","GM"):
 for direction in (1,3,5,7):
  a=next(a for a in actions[s["first"]-1:s["first"]-1+s["count"]] if a["act"]==mode and a["dir"]==direction)
  poses=[]
  for ix in range(a["first"]-1,a["first"]-1+a["count"]):
   f=frames[ix];im,_=decode(rom,f["off"],(f["w"],f["h"]))
   poses.append((f,im))
  data[(mode,direction)]=poses
  sheet=Image.new("RGB",(6*275,390),(26,29,35));p=ImageDraw.Draw(sheet)
  p.text((10,8),f"ROMAN exact {mode} D{direction} | 6 frames | 6x indexed-palette pseudo-colour | native pixel grid",fill=(242,218,185))
  for n,(f,img) in enumerate(poses):
   x=n*275+12;y=38
   p.text((x,y),f"F{n+1} ({img.width}x{img.height}) origin {f['x']},{f['y']}",fill=(210,211,213))
   big=rgba(img,5)
   sheet.paste((52,55,64),(x,y+18,x+253,y+314))
   sheet.paste(big,(x+15,y+22),big)
   cutoff=round(img.height*.66)*5
   p.line((x+15,y+22+cutoff,x+15+img.width*5,y+22+cutoff),fill=(255,208,0),width=2)
   # Y coordinate labels every 5 native pixels.
   for yy in range(0,img.height,5):
    p.text((x+221,y+20+yy*5),str(yy),fill=(183,207,196))
   p.text((x,y+326),f"top=0 / yellow={round(img.height*.66)} | sha {sha(img)[:8]}",fill=(212,210,205))
  file=OUT/f"inspect-{mode}-D{direction}.png"
  sheet.save(file)
  print("ROMAN_DEBUG",mode,direction,"=>",file)
print("ROMAN_DEBUG_READY")
