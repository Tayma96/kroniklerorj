import sys,os
sys.path.insert(0,'/workspace/kr-gorsel-is')
from sheet import font
from PIL import Image,ImageDraw
O='/workspace/kr-gorsel-orijinal/assets/'; N='/workspace/kr-gorsel/mobile/assets/'
def circ(im,s):
    im=im.resize((s,s),Image.LANCZOS); m=Image.new('L',(s,s),0); ImageDraw.Draw(m).ellipse((0,0,s-1,s-1),fill=255)
    bg=Image.new('RGB',(s,s),(0x2a,0x1c,0x0c)); bg.paste(im,(0,0),m); return bg
def ba(files,out,title,cell=200,circle=False):
    ncol=len(files); lab=22; rowh=cell+lab+(70 if circle else 0)
    W=150+ncol*(cell+8); H=50+2*(rowh+8)
    S=Image.new('RGB',(W,H),(24,20,16)); d=ImageDraw.Draw(S)
    d.text((10,10),title,fill=(230,200,140),font=font(20))
    for ri,(root,name) in enumerate([(O,'ONCE'),(N,'SONRA')]):
        y=50+ri*(rowh+8); d.text((10,y+cell//2),name,fill=(230,200,140),font=font(22))
        for ci,f in enumerate(files):
            x=150+ci*(cell+8); im=Image.open(root+f).convert('RGB'); t=im.copy(); t.thumbnail((cell,cell))
            S.paste(t,(x+(cell-t.width)//2,y+(cell-t.height)//2))
            d.text((x,y+cell+3),os.path.splitext(os.path.basename(f))[0],fill=(235,225,210),font=font(13))
            if circle:
                for j,s in enumerate((64,44,26)): S.paste(circ(im,s),(x+[0,72,124][j],y+cell+lab+2))
    S.save(out); print(out,S.size)
