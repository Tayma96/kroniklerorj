# CMU ASF/AMC -> BVH. Kullanım: python3 amc2bvh.py skel.asf motion.amc out.bvh [kare_atlama]
import sys, math
import numpy as np

def rx(a): c,s=math.cos(a),math.sin(a); return np.array([[1,0,0],[0,c,-s],[0,s,c]])
def ry(a): c,s=math.cos(a),math.sin(a); return np.array([[c,0,s],[0,1,0],[-s,0,c]])
def rz(a): c,s=math.cos(a),math.sin(a); return np.array([[c,-s,0],[s,c,0],[0,0,1]])
def e2m(x,y,z): return rz(z) @ ry(y) @ rx(x)  # CMU: statik XYZ

def parse_asf(path):
    lines=[l.strip() for l in open(path) if l.strip() and not l.startswith('#')]
    bones={}; hier={}; i=0; root_axis=(0,0,0); scale=1.0
    while i<len(lines):
        l=lines[i]
        if l.startswith(':units'):
            i+=1
            while not lines[i].startswith(':'):
                k,v=lines[i].split()[:2]
                if k=='length': scale=float(v)
                i+=1
            continue
        if l.startswith(':root'):
            i+=1
            while not lines[i].startswith(':'):
                p=lines[i].split()
                if p[0]=='orientation': root_axis=tuple(float(x) for x in p[1:4])
                i+=1
            continue
        if l.startswith(':bonedata'):
            i+=1
            while not lines[i].startswith(':'):
                if lines[i]=='begin':
                    b={'dof':[]}; i+=1
                    while lines[i]!='end':
                        p=lines[i].split()
                        if p[0]=='name': b['name']=p[1]
                        elif p[0]=='direction': b['dir']=np.array([float(x) for x in p[1:4]])
                        elif p[0]=='length': b['len']=float(p[1])
                        elif p[0]=='axis': b['axis']=[float(x) for x in p[1:4]]
                        elif p[0]=='dof': b['dof']=p[1:]
                        i+=1
                    bones[b['name']]=b
                i+=1
            continue
        if l.startswith(':hierarchy'):
            i+=1
            while i<len(lines) and lines[i]!='end':
                if lines[i]=='begin': i+=1; continue
                p=lines[i].split(); hier[p[0]]=p[1:]; i+=1
            i+=1; continue
        i+=1
    return bones,hier,root_axis,scale

def parse_amc(path):
    frames=[]; cur=None
    for l in open(path):
        l=l.strip()
        if not l or l.startswith('#') or l.startswith(':'): continue
        if l.isdigit():
            cur={}; frames.append(cur); continue
        p=l.split(); cur[p[0]]=[float(x) for x in p[1:]]
    return frames

def main(asf, amc, out, step=1):
    bones,hier,root_axis,scale=parse_asf(asf); frames=parse_amc(amc)[::step]
    unit=(1.0/scale)*0.0254  # inç -> metre
    for b in bones.values():
        C=e2m(*[math.radians(a) for a in b['axis']]); b['C']=C; b['Ci']=C.T
    Croot=e2m(*[math.radians(a) for a in root_axis])
    order=[]  # derinlik öncelikli
    def walk(n,par):
        order.append((n,par))
        for c in hier.get(n,[]): walk(c,n)
    walk('root',None)
    children={n:hier.get(n,[]) for n,_ in order}
    def offset(n,par):
        if par is None or par=='root': return np.zeros(3)
        pb=bones[par]; return pb['dir']*pb['len']*unit
    lines=['HIERARCHY']
    def emit(n,par,depth):
        ind='  '*depth
        if par is None:
            lines.append('ROOT root'); lines.append('{')
            lines.append(ind+'  OFFSET 0.0 0.0 0.0')
            lines.append(ind+'  CHANNELS 6 Xposition Yposition Zposition Xrotation Yrotation Zrotation')
        else:
            o=offset(n,par)
            lines.append(ind+'JOINT '+n); lines.append(ind+'{')
            lines.append(ind+'  OFFSET %.6f %.6f %.6f'%tuple(o))
            lines.append(ind+'  CHANNELS 3 Xrotation Yrotation Zrotation')
        kids=children[n]
        if not kids:
            b=bones[n]; e=b['dir']*b['len']*unit
            lines.append(ind+'  End Site'); lines.append(ind+'  {'); lines.append(ind+'    OFFSET %.6f %.6f %.6f'%tuple(e)); lines.append(ind+'  }')
        for c in kids: emit(c,n,depth+1)
        lines.append(ind+'}')
    emit('root',None,0)
    def m2xyz(R):  # R = Rx(a) Ry(b) Rz(c)
        b=math.asin(max(-1,min(1,R[0,2]))); a=math.atan2(-R[1,2],R[2,2]); c=math.atan2(-R[0,1],R[0,0])
        return [math.degrees(a),math.degrees(b),math.degrees(c)]
    lines.append('MOTION'); lines.append('Frames: %d'%len(frames)); lines.append('Frame Time: %.6f'%(step/120.0))
    for f in frames:
        row=[]
        for n,par in order:
            if n=='root':
                v=f['root']; pos=np.array(v[0:3])*unit; rot=e2m(*[math.radians(a) for a in v[3:6]])
                R=Croot@rot@Croot.T; row+=list(pos)+m2xyz(R)
            else:
                b=bones[n]; ang={'rx':0.0,'ry':0.0,'rz':0.0}
                for d,val in zip(b['dof'],f.get(n,[])): ang[d]=math.radians(val)
                R=b['C']@e2m(ang['rx'],ang['ry'],ang['rz'])@b['Ci']; row+=m2xyz(R)
        lines.append(' '.join('%.5f'%x for x in row))
    open(out,'w').write('\n'.join(lines)+'\n')
    print(out, len(frames), 'kare')

if __name__=='__main__':
    main(sys.argv[1],sys.argv[2],sys.argv[3],int(sys.argv[4]) if len(sys.argv)>4 else 1)
