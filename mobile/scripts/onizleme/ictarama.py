import re, os, sys
kok=os.getcwd(); bas=sys.argv[1:]
yasak={"lib/store.tsx","lib/game.ts","lib/nufus.ts"}
gor={}; yigin=[(b,None) for b in bas]
def coz(dosya, yol):
    if not yol.startswith("."): return None
    t=os.path.normpath(os.path.join(os.path.dirname(dosya), yol))
    for e in ["",".ts",".tsx","/index.ts","/index.tsx"]:
        if os.path.isfile(t+e): return os.path.relpath(t+e,kok)
    return None
while yigin:
    d,ata=yigin.pop()
    if d in gor: continue
    gor[d]=ata
    src=open(d).read()
    for m in re.finditer(r'^\s*import\s+(?!type\b)[^;]*?from\s+["\']([^"\']+)["\']|^\s*export\s+[^;]*?from\s+["\']([^"\']+)["\']|require\(["\'](\.[^"\']+)["\']\)', src, re.M):
        y=m.group(1) or m.group(2) or m.group(3)
        h=coz(d,y)
        if h and not h.endswith((".png",".jpg",".m4a",".json")): yigin.append((h,d))
for y in sorted(yasak):
    if y in gor:
        zincir=[y]; x=gor[y]
        while x: zincir.append(x); x=gor[x]
        print("ULASIYOR:", " <- ".join(zincir))
print("tarandi", len(gor))
