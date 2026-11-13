import os; HOME = os.path.expanduser('~').replace(chr(92), '/') + '/'   # folder rumah, bukan jalur mutlak satu mesin
"""Peta slide 1: hanya empat kab/kota yang tercatat terdampak banjir; wilayah lain abu."""
import json,hashlib,math,shutil,glob,os
from PIL import Image,ImageDraw,ImageFont,ImageFilter
SK=HOME + '.claude/skills/ppt-konsultan/bnpb/assets/'
PJ=SK+'proyek-banjir0811/'; G=SK+'proyek-bnpb/geo/kabupaten/'
IK='D:/Project/Work/BNPB/poskokarhutla/data/laporan-bnpb/harian/2026-11/2026-11-08/kerja-081126-rev4/ik/'
LON0,LON1,LAT0,LAT1=94.2,116.0,-9.9,6.6
SS=2; PW=1760; PH=int(PW*(LAT1-LAT0)/(LON1-LON0))
X=lambda o:(o-LON0)/(LON1-LON0)*PW*SS; Y=lambda a:(LAT1-a)/(LAT1-LAT0)*PH*SS
LAP,AMAN,NAVY='#1B5A93','#E6EAF0','#24384F'
_LP=json.load(open('lap.json',encoding='utf-8')); WR={r['prov']+'|'+r['kab']:('#68A8E0' if r['surut'] else '#C8102E') for r in _LP}
TERDAMPAK=set(WR)
im=Image.new('RGB',(PW*SS,PH*SS),'#FFFFFF'); d=ImageDraw.Draw(im)
F=lambda s,b=True: ImageFont.truetype(SK+'fonts/Roboto-'+('Bold' if b else 'Medium')+'.ttf',s*SS)
rings=lambda g:[g['coordinates']] if g['type']=='Polygon' else g['coordinates']
def inp(x,y,r):
    c=False;j=len(r)-1
    for i in range(len(r)):
        if (r[i][1]>y)!=(r[j][1]>y) and x<(r[j][0]-r[i][0])*(y-r[i][1])/(r[j][1]-r[i][1])+r[i][0]: c=not c
        j=i
    return c
def dalam(r):
    xs=[c[0] for c in r]; ys=[c[1] for c in r]; best=None; bd=-1; V=r[::max(1,len(r)//150)]
    for i in range(1,24):
        for j in range(1,24):
            x=min(xs)+(max(xs)-min(xs))*i/24; y=min(ys)+(max(ys)-min(ys))*j/24
            if inp(x,y,r):
                q=min((x-c[0])**2+(y-c[1])**2 for c in V)
                if q>bd: bd=q; best=(x,y)
    return best or (sum(xs)/len(xs),sum(ys)/len(ys))
pus={}; teks={}
for f_ in sorted(glob.glob(G+'*.json')):
    kp=os.path.basename(f_)[:2]
    for ft in json.load(open(f_,encoding='utf-8'))['features']:
        k=kp+'|'+ft['properties']['kab']; besar=None; la=0
        for q in rings(ft['geometry']):
            pts=[(X(c[0]),Y(c[1])) for c in q[0]]
            if len(pts)>2: d.polygon(pts,fill=WR.get(k,AMAN),outline='#FFFFFF',width=1)
            A=abs(sum(q[0][i][0]*q[0][i-1][1]-q[0][i-1][0]*q[0][i][1] for i in range(len(q[0])))/2)
            if A>la: la=A;besar=q[0]
        if k in TERDAMPAK: pus[k]=dalam(besar)
assert len(pus)==len(WR),(len(pus),[k for k in WR if k not in pus])
def label(x,y,t):
    f=F(40); w=d.textlength(t,font=f)+52*SS; h=68*SS
    tepi=26*SS; m=Image.new('L',(int(w)+2*tepi,int(h)+2*tepi),0); ImageDraw.Draw(m).rounded_rectangle([tepi,tepi,tepi+w,tepi+h],radius=h/2,fill=90); m=m.filter(ImageFilter.GaussianBlur(8*SS))
    im.paste(Image.new('RGB',m.size,'#24384F'),(int(x-w/2)-tepi,int(y-h/2)-tepi+4*SS),m)
    d.rounded_rectangle([x-w/2,y-h/2,x+w/2,y+h/2],radius=h/2,fill='#FFFFFF',outline='#C9D1DB',width=2*SS); d.text((x,y),t,font=f,fill=NAVY,anchor='mm')
n=lambda pr:sum(1 for r in _LP if r['prov']==pr)
label(X(98.0),Y(6.05),f'Aceh {n("11")}'); label(X(103.0),Y(3.3),f'Sumut {n("12")}'); label(X(96.6),Y(-0.9),f'Sumbar {n("13")}'); label(X(112.6),Y(-9.2),f'Jatim {n("35")}')
km=111.32*math.cos(math.radians(2)); px=500/km/(LON1-LON0)*PW*SS; x0,y0=X(95.0),Y(-5.9)
d.line([(x0,y0),(x0+px,y0)],fill=NAVY,width=4*SS); d.text((x0+px/2,y0-32*SS),'500 km',font=F(30,False),fill=NAVY,anchor='mm')
ax,ay=X(95.6),Y(-3.7); d.polygon([(ax,ay-50*SS),(ax-15*SS,ay),(ax+15*SS,ay)],fill=NAVY); d.text((ax,ay+22*SS),'U',font=F(32),fill=NAVY,anchor='mm')
im=im.resize((PW,PH),Image.LANCZOS)
png=PJ+'petanya/banjir-081126.png'; im.save(png,optimize=True)
mas=PJ+'petanya/status-kab-081126.json'; shutil.copy('data/banjir_data_wilayah_hari.json',mas)
sha=lambda p:hashlib.sha256(open(p,'rb').read()).hexdigest()
json.dump({'unsur_peta':{'sumber_batas':'Batas kab/kota BIG','sistem_referensi':'WGS 84','proyeksi':'ekuirektangular','catatan':'Batas wilayah bukan rujukan resmi'},'masukan':{'status-kab-081126.json':sha(mas)}},open(PJ+'petanya/banjir-081126.json','w',encoding='utf-8'),ensure_ascii=False)
print(im.size)
