import sys,os,json
from PIL import Image,ImageFilter,ImageEnhance,ImageChops,ImageDraw
import numpy as np
C='/workspace/kr-gorsel-is/cand'; R='/workspace/kr-gorsel/mobile/assets'
SEL=json.load(open('/workspace/kr-gorsel-is/secim.json'))
def grade(im,vig=0.55,lum=0.42,warm=True):
    a=np.asarray(im).astype(np.float32)/255
    # parlaklık normalizasyonu (ortalama luma hedefe)
    L=(0.299*a[...,0]+0.587*a[...,1]+0.114*a[...,2]).mean()
    a=np.clip(a*(lum/max(L,1e-3))**0.6,0,1)
    # hafif desatürasyon + sıcak split-tone (gölgeler umber, ışıklar amber)
    g=(0.299*a[...,0]+0.587*a[...,1]+0.114*a[...,2])[...,None]
    a=g+(a-g)*0.85
    if warm:
        sh=np.array([0.10,0.06,0.02]); hi=np.array([1.0,0.93,0.80])
        a=a*(1-0.10)+0.10*(sh*(1-g)+hi*g)
    # vinyet → arka planı koyu sıcak kahveye (#2a1c0c) yaklaştırır
    h,w=a.shape[:2]; y,x=np.ogrid[:h,:w]
    d=np.sqrt(((x-w/2)/(w/2))**2+((y-h*0.45)/(h/2))**2)
    m=np.clip((d-0.55)/0.75,0,1)[...,None]**1.5*vig
    bg=np.array([0x2a,0x1c,0x0c])/255
    a=a*(1-m)+bg*m
    return Image.fromarray((np.clip(a,0,1)*255).astype(np.uint8))
def save(im,dst,size,fmt):
    im=im.convert('RGB')
    # hedef en-boy oranına merkez kırp, sonra yeniden boyutla
    tw,th=size; r=tw/th
    if abs(im.width/im.height-r)>0.01:
        if im.width/im.height>r: nw=int(im.height*r); im=im.crop(((im.width-nw)//2,0,(im.width-nw)//2+nw,im.height))
        else: nh=int(im.width/r); im=im.crop((0,0,im.width,nh))
    im=im.resize(size,Image.LANCZOS).filter(ImageFilter.UnsharpMask(1.2,40,2))
    if fmt=='PNG': im.save(dst,optimize=True)
    else: im.save(dst,quality=86,optimize=True,progressive=False,subsampling=2)
if __name__=='__main__':
    flt=sys.argv[1] if len(sys.argv)>1 else ''
    for key,seed in SEL.items():
        if not key.startswith(flt): continue
        src=f"{C}/{key.replace('/','__')}_s{seed}.jpg"
        ext='.png' if key=='yeni_oyun_bg' else '.jpg'
        dst=f"{R}/{key}{ext}"
        o=Image.open(dst); size,fmt=o.size,o.format
        im=Image.open(src).convert('RGB')
        kw=dict(vig=0.8,lum=0.36) if key.startswith('portre') else dict(vig=0.35,lum=0.42)
        save(grade(im,**kw),dst,size,fmt)
        n=Image.open(dst); assert n.size==size and n.format==fmt
        print(key,seed,size,fmt,os.path.getsize(dst)//1024,'KB')
