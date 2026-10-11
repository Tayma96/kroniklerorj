import sys,os,time,urllib.parse,urllib.request,io
sys.path.insert(0,'/workspace/kr-gorsel-is')
from prompts import *
from PIL import Image
C='/workspace/kr-gorsel-is/cand'; os.makedirs(C,exist_ok=True)
WM=48  # alttaki filigran şeridi kırpılır
def fetch(key,prompt,w,h,seed):
    out=f"{C}/{key.replace('/','__')}_s{seed}.jpg"
    if os.path.exists(out): return out
    url="https://image.pollinations.ai/prompt/"+urllib.parse.quote(prompt+NEG)+f"?width={w}&height={h+WM}&nologo=true&seed={seed}&model=sana"
    for a in range(4):
        try:
            d=urllib.request.urlopen(url,timeout=180).read()
            im=Image.open(io.BytesIO(d)).convert('RGB')
            im=im.crop((0,0,im.width,im.height-WM*im.height//(h+WM)))
            im.save(out,quality=95); return out
        except Exception as e:
            print('retry',key,e,flush=True); time.sleep(5+5*a)
    return None
def jobs():
    for k,d in PORTRELER.items(): yield (f"portre/{k}", f"{d}, {PORTRE}", 512,512)
    for b,kd in KUSAK.items():
        for s,md in MEVSIM.items(): yield (f"hero/{b}_{s}", f"{kd}, {md}, {SAHNE}", 640,640)
    for k,d in DIGER.items():
        st = FOTO if k.startswith(('arma','mektep')) else SAHNE
        yield (k, f"{d}, {st}", 512,512)
    for k,(w,h,d) in WIDE.items():
        gw,gh = {"mulk/mulk_hero":(896,504),"mektep/mektep_hero":(640,384),"yeni_oyun_bg":(512,1110)}[k]
        yield (k, f"{d}, {SAHNE}", gw,gh)
if __name__=="__main__":
    flt=sys.argv[1] if len(sys.argv)>1 else ""
    seeds=[int(x) for x in (sys.argv[2] if len(sys.argv)>2 else "101,202").split(',')]
    for key,p,w,h in jobs():
        if not key.startswith(flt): continue
        for s in seeds:
            r=fetch(key,p,w,h,s); print(('OK ' if r else 'FAIL ')+key+f' s{s}',flush=True)
