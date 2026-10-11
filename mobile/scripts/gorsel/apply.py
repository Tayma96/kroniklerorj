import sys
from PIL import Image
A="/home/box/agent-data/agents/9ec3ad2d-d274-580d-acb0-ea087ef857c9/assets"
R="/workspace/kr-gorsel/mobile/assets/"
pref=sys.argv[1]
for line in open("/workspace/kr-gorsel-v2/map.txt"):
    k,h=line.split()
    if not k.startswith(pref): continue
    path=R+k+".jpg"
    if k=="yeni_oyun_bg": path=R+"yeni_oyun_bg.png"
    tgt=Image.open(path); TW,TH=tgt.size
    im=Image.open(f"{A}/{h}.jpg").convert("RGB"); w,hh=im.size
    tr=TW/TH; 
    if w/hh>tr: nw=int(hh*tr); box=((w-nw)//2,0,(w-nw)//2+nw,hh)
    else: nh=int(w/tr); box=(0,(hh-nh)//2,w,(hh-nh)//2+nh)
    im=im.crop(box).resize((TW,TH),Image.LANCZOS)
    if path.endswith(".png"): im.save(path,optimize=True)
    else: im.save(path,quality=86)
    print(k,TW,TH)
