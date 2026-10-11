import sys,os
from PIL import Image,ImageDraw,ImageFont
def font(s):
    for f in ["/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf","/usr/share/fonts/dejavu/DejaVuSans-Bold.ttf"]:
        if os.path.exists(f): return ImageFont.truetype(f,s)
    return ImageFont.load_default()
def sheet(rows,out,cell=256,title=None,bg=(24,20,16)):
    # rows: list of list of (path,label)
    ncol=max(len(r) for r in rows); lab=26; th=40 if title else 0
    W=ncol*(cell+8)+8; H=th+len(rows)*(cell+lab+8)+8
    S=Image.new('RGB',(W,H),bg); d=ImageDraw.Draw(S); f=font(15)
    if title: d.text((10,8),title,fill=(230,200,140),font=font(20))
    for ri,r in enumerate(rows):
        for ci,(p,l) in enumerate(r):
            if p is None: continue
            im=Image.open(p).convert('RGB'); im.thumbnail((cell,cell))
            x=8+ci*(cell+8); y=th+8+ri*(cell+lab+8)
            S.paste(im,(x+(cell-im.width)//2,y+(cell-im.height)//2))
            d.text((x+2,y+cell+4),l,fill=(235,225,210),font=f)
    S.save(out); print(out,S.size)
