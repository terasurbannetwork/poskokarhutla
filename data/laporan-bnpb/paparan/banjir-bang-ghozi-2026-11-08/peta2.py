import os; HOME = os.path.expanduser('~').replace(chr(92), '/') + '/'   # folder rumah, bukan jalur mutlak satu mesin
"""Peta slide alternatif: 22 kab/kota bernomor sesuai tabel, warna menurut tanggal mulai; Dipantau abu."""
import json,hashlib,math,shutil,os,glob
from PIL import Image,ImageDraw,ImageFont,ImageFilter
SK=HOME + '.claude/skills/ppt-konsultan/bnpb/assets/'
PJ=SK+'proyek-banjir0811/'; G=SK+'proyek-bnpb/geo/kabupaten/'
ALT=json.load(open('alt.json',encoding='utf-8'))
WARNA={'9 Nov':'#8F3F07','10 Nov':'#A07A32','11 Nov':'#E8894A','Dipantau':'#7F93AA'}
AMAN,GARIS,NAVY,LUAR='#E6EAF0','#FFFFFF','#24384F','#F3F5F8'
LON0,LON1,LAT0,LAT1=94.6,104.6,-2.3,6.3
SS=2; PW=1600; PH=int(PW*(LAT1-LAT0)/(LON1-LON0))
X=lambda o:(o-LON0)/(LON1-LON0)*PW*SS; Y=lambda a:(LAT1-a)/(LAT1-LAT0)*PH*SS
im=Image.new('RGB',(PW*SS,PH*SS),'#FFFFFF'); d=ImageDraw.Draw(im)
F=lambda s,b=True: ImageFont.truetype(SK+'fonts/Roboto-'+('Bold' if b else 'Medium')+'.ttf',s*SS)
TANDA={r['kode']:r for r in ALT}
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
pus={}
GEO={}
for f_ in sorted(glob.glob(G+'*.json')):
    kp=os.path.basename(f_)[:2]
    for ft in json.load(open(f_,encoding='utf-8'))['features']:
        k=kp+'|'+ft['properties']['kab']; GEO[k]=ft['geometry']; besar=None; la=0
        for q in rings(ft['geometry']):
            A=abs(sum(q[0][i][0]*q[0][i-1][1]-q[0][i-1][0]*q[0][i][1] for i in range(len(q[0])))/2)
            if A>la: la=A;besar=q[0]
        if k in TANDA: pus[k]=dalam(besar)
wr=lambda k:WARNA[TANDA[k]['kel']] if k in TANDA else None
for k,g in GEO.items():
    if k[:2] not in ('11','12','13','14','15','16','17','21'): continue
    for q in rings(g):
        pts=[(X(c[0]),Y(c[1])) for c in q[0]]
        if len(pts)>2: d.polygon(pts,fill=wr(k) or (AMAN if k[:2] in('11','12','13') else LUAR),outline=GARIS,width=2)
def bulat(xc,yc,no,w,r=25*SS):
    d.ellipse([xc-r,yc-r,xc+r,yc+r],fill='#FFFFFF',outline=w,width=5*SS)
    d.text((xc,yc),str(no),font=F(30),fill=NAVY,anchor='mm')
letak={}
for k,r in TANDA.items():
    if k[:2] in('11','12','13','14'):
        a,b=pus[k]; letak[k]=(X(a),Y(b))
# dorong bulatan yang berdempet
for _ in range(60):
    ks=list(letak)
    for i,p in enumerate(ks):
        for q in ks[i+1:]:
            dx,dy=letak[p][0]-letak[q][0],letak[p][1]-letak[q][1]; jr=math.hypot(dx,dy) or 1
            if jr<58*SS:
                g=(58*SS-jr)/2; letak[p]=(letak[p][0]+dx/jr*g,letak[p][1]+dy/jr*g); letak[q]=(letak[q][0]-dx/jr*g,letak[q][1]-dy/jr*g)
for k,(xc,yc) in letak.items(): bulat(xc,yc,TANDA[k]['no'],WARNA[TANDA[k]['kel']])
# sisipan se-Indonesia
cw,ch=500*SS,232*SS; cx0,cy0=(PW-512)*SS,(PH-244)*SS
t_=26*SS; m=Image.new('L',(cw+2*t_,ch+2*t_),0); ImageDraw.Draw(m).rounded_rectangle([t_,t_,t_+cw,t_+ch],radius=16*SS,fill=95); m=m.filter(ImageFilter.GaussianBlur(8*SS))
im.paste(Image.new('RGB',m.size,'#24384F'),(cx0-t_,cy0-t_+4*SS),m)
d.rounded_rectangle([cx0,cy0,cx0+cw,cy0+ch],radius=16*SS,fill='#FFFFFF')
d.text((cx0+16*SS,cy0+20*SS),'Se-Indonesia',font=F(24),fill=NAVY,anchor='lm')
IL0,IL1,IA0,IA1=94.6,141.4,-11.4,6.5; ip=12*SS; iw=cw-2*ip; ih=ch-40*SS-ip
IX=lambda o:cx0+ip+(o-IL0)/(IL1-IL0)*iw; IY=lambda a:cy0+40*SS+(IA1-a)/(IA1-IA0)*ih
for k,g in GEO.items():
    for q in rings(g):
        pts=[(IX(c[0]),IY(c[1])) for c in q[0]]
        if len(pts)>2: d.polygon(pts,fill=wr(k) or AMAN)
d.rectangle([IX(94.8),IY(6.2),IX(104.4),IY(-2.2)],outline=NAVY,width=2*SS)
kl={}
for k,r in TANDA.items():
    if k[:2] not in('11','12','13','14'): kl.setdefault(k[:2] if k[:2]=='72' else 'jw',[]).append(k)
for gr,ks in kl.items():
    a=sum(pus[k][0] for k in ks)/len(ks); b=sum(pus[k][1] for k in ks)/len(ks); xc,yc=IX(a),IY(b)
    teks=', '.join(str(TANDA[k]['no']) for k in sorted(ks,key=lambda k:TANDA[k]['no']))
    w=WARNA[TANDA[ks[0]]['kel']]; f=F(20); tw=d.textlength(teks,font=f)+16*SS; yy=yc+(30*SS if gr=='jw' else -28*SS)
    d.line([(xc,yc),(xc,yy)],fill=NAVY,width=1*SS)
    d.rounded_rectangle([xc-tw/2,yy-15*SS,xc+tw/2,yy+15*SS],radius=15*SS,fill='#FFFFFF',outline=w,width=3*SS)
    d.text((xc,yy),teks,font=f,fill=NAVY,anchor='mm')
km=111.32*math.cos(math.radians(2)); px=100/km/(LON1-LON0)*PW*SS; x0,y0=X(95.1),Y(-1.7)
d.line([(x0,y0),(x0+px,y0)],fill=NAVY,width=4*SS); d.text((x0+px/2,y0-26*SS),'100 km',font=F(26,False),fill=NAVY,anchor='mm')
ax,ay=X(97.2),Y(-1.3); d.polygon([(ax,ay-44*SS),(ax-13*SS,ay),(ax+13*SS,ay)],fill=NAVY); d.text((ax,ay+18*SS),'U',font=F(28),fill=NAVY,anchor='mm')
im=im.resize((PW,PH),Image.LANCZOS)
png=PJ+'petanya/alternatif-081126.png'; im.save(png,optimize=True)
mas=PJ+'petanya/alt-081126.json'; shutil.copy('alt.json',mas)
sha=lambda p:hashlib.sha256(open(p,'rb').read()).hexdigest()
json.dump({'unsur_peta':{'sumber_batas':'Batas kab/kota BIG','sistem_referensi':'WGS 84','proyeksi':'ekuirektangular','catatan':'Batas wilayah bukan rujukan resmi'},'masukan':{'alt-081126.json':sha(mas)}},open(PJ+'petanya/alternatif-081126.json','w',encoding='utf-8'),ensure_ascii=False)
print(im.size,len(letak),kl.keys())
