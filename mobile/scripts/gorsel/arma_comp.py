import numpy as np, math
from PIL import Image, ImageDraw, ImageFilter
C='cand/'
def star(d,cx,cy,r,col=255):
    pts=[]
    for i in range(10):
        a=-math.pi/2+i*math.pi/5; rr=r if i%2==0 else r*0.42
        pts.append((cx+rr*math.cos(a),cy+rr*math.sin(a)))
    d.polygon(pts,fill=col)
def blade(d,cx,cy,ang,L=300,w=16):
    # kavisli kılıç: merkezden geçen bıçak + kabza + balçak
    pts=[];pts2=[]
    for t in np.linspace(-0.5,0.5,30):
        bend=0.12*L*(t+0.5)**2
        x=cx+t*L; y=cy-bend
        pts.append((x,y-w/2*(1-max(0,t-0.35)/0.15*0.9 if t>0.35 else 1)));pts2.append((x,y+w/2*(1-max(0,t-0.35)/0.15*0.9 if t>0.35 else 1)))
    poly=pts+pts2[::-1]
    R=lambda p:(cx+(p[0]-cx)*math.cos(ang)-(p[1]-cy)*math.sin(ang), cy+(p[0]-cx)*math.sin(ang)+(p[1]-cy)*math.cos(ang))
    d.polygon([R(p) for p in poly],fill=255)
    g=[(cx-0.5*L+38,cy-30),(cx-0.5*L+48,cy-30),(cx-0.5*L+48,cy+30),(cx-0.5*L+38,cy+30)]
    d.polygon([R(p) for p in g],fill=255)
    h=[(cx-0.5*L-25,cy-7),(cx-0.5*L+40,cy-7),(cx-0.5*L+40,cy+7),(cx-0.5*L-25,cy+7)]
    d.polygon([R(p) for p in h],fill=255)
def mask(kind,S=512):
    m=Image.new('L',(S,S),0); d=ImageDraw.Draw(m); c=S/2
    if kind=='hilal':
        d.ellipse((c-120,c-120,c+120,c+120),fill=255); d.ellipse((c-75,c-140,c+145,c+90),fill=0); star(d,c+55,c-15,48)
    elif kind=='tac':
        d.polygon([(c-130,c+70),(c-140,c-60),(c-70,c+5),(c,c-110),(c+70,c+5),(c+140,c-60),(c+130,c+70)],fill=255)
        d.rectangle((c-135,c+80,c+135,c+115),fill=255)
        for x,y in [(c-140,c-70),(c,c-122),(c+140,c-70)]: d.ellipse((x-16,y-16,x+16,y+16),fill=255)
    elif kind=='kilic':
        blade(d,c,c+10,math.radians(45),330,26); blade(d,c,c+10,math.radians(135),330,26)
    elif kind=='hancer':
        blade(d,c,c,math.radians(-90),300,40)
    elif kind=='bugday':
        for ang in (-25,0,25):
            a=math.radians(ang); top=(c+170*math.sin(a),c-150*math.cos(a)+20); bot=(c,c+150)
            d.line([bot,top],fill=255,width=9)
            for k in range(7):
                t=0.45+k*0.08; x=bot[0]+(top[0]-bot[0])*t; y=bot[1]+(top[1]-bot[1])*t
                for s in (-1,1):
                    e=Image.new('L',(S,S),0); de=ImageDraw.Draw(e); de.ellipse((x-11,y-26,x+11,y+4),fill=255)
                    e=e.rotate(-(ang+s*28),center=(x,y)); m.paste(255,(0,0),e)
            d.ellipse((top[0]-10,top[1]-28,top[0]+10,top[1]+6),fill=255)
        d.rectangle((c-40,c+60,c+40,c+80),fill=255)
    return m
def relief(base,kind,metal=(196,150,72)):
    S=base.size[0]; M=mask(kind,S).filter(ImageFilter.GaussianBlur(1.5))
    H=np.asarray(M.filter(ImageFilter.GaussianBlur(5)),np.float32)/255
    gy,gx=np.gradient(H); sh=np.clip(0.55+(-gx*0.7-gy*0.7)*14,0,1.4)
    b=np.asarray(base,np.float32)
    col=np.array(metal,np.float32)[None,None]*sh[...,None]
    col+=np.random.default_rng(1).normal(0,6,col.shape)
    a=(np.asarray(M,np.float32)/255)[...,None]
    # gölge (sol-üst ışık → sağ-alt gölge)
    sm=np.asarray(M.filter(ImageFilter.GaussianBlur(6)).transform(M.size,Image.AFFINE,(1,0,-6,0,1,-6)),np.float32)[...,None]/255
    b=b*(1-0.5*sm*(1-a))
    out=b*(1-a)+col*a
    return Image.fromarray(np.clip(out,0,255).astype(np.uint8))
def tint(im,rgb,amt=0.55):
    a=np.asarray(im,np.float32); g=a.mean(-1,keepdims=True)
    t=g/128*np.array(rgb,np.float32); return Image.fromarray(np.clip(a*(1-amt)+t*amt,0,255).astype(np.uint8))
if __name__=='__main__':
    hb=Image.open(C+'arma__hilal_s101.jpg').convert('RGB')
    hb2=Image.open(C+'arma__hilal_s202.jpg').convert('RGB')
    out={'hilal':relief(hb,'hilal'),
         'tac':relief(tint(hb2,(120,60,40)),'tac',(214,170,80)),
         'kilic':relief(tint(hb,(95,95,105),0.8),'kilic',(200,200,205)),
         'bugday':relief(tint(hb,(105,105,45),0.6),'bugday',(205,165,80)),
         'hancer':relief(tint(hb,(90,40,110),0.7),'hancer',(205,205,210))}
    for k,v in out.items(): v.save(C+f'arma__{k}_s9000.jpg',quality=95)
    print('ok')
