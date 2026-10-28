import json,sys
from PIL import Image, ImageDraw
d=json.load(open(sys.argv[1])); fr=sorted(d, key=int)
W=220; H=300; im=Image.new('RGB',(W*len(fr),H*2),'white'); dr=ImageDraw.Draw(im)
for i,f in enumerate(fr):
    for row,(ax,lab) in enumerate([(0,'yan: x'),(1,'ön: y')]):
        for b,(h,t) in d[f].items():
            def P(p): return (i*W+W/2+p[ax]*90, row*H+H-20-p[2]*90)
            col='red' if b.startswith('l') else 'blue' if b.startswith('r') else 'black'
            dr.line([P(h),P(t)],fill=col,width=3)
        dr.text((i*W+5,row*H+5),'kare %s %s'%(f,lab),fill='black')
im.save(sys.argv[2])
