import sys, json, math
sys.path.insert(0,'D:/Project/Work/BNPB/poskokarhutla/scripts/data')
import citra as C
from PIL import Image, ImageDraw
R='D:/Project/Work/BNPB/poskokarhutla'
OUT=R+'/data/laporan-bnpb/paparan/bukti-konsesi-msj-031126/'
cj=json.load(open(OUT+'citra/citra.json'))
km=cj['km']; xs=[140.53807,140.79513]; ys=[-7.97433,-7.71797]
lat0=sum(ys)/2; lon0=sum(xs)/2
E0,N0=C.ke_utm(lat0,lon0,54); kiri=E0-km*500; atas=N0+km*500; m_px=km*1000/500
def px(lon,lat):
    E,N=C.ke_utm(lat,lon,54); return ((E-kiri)/m_px,(atas-N)/m_px)
d=json.load(open(R+'/public/data/konsesi2026/93.json',encoding='utf8'))
p=[x for x in d['perusahaan'] if x['id']=='sawit-gfw-1377'][0]
poly=p['geom'][0]['coordinates'][0][0]
ppx=[px(a,b) for a,b in poly]
mask=Image.new('L',(500,500),0); ImageDraw.Draw(mask).polygon(ppx,fill=1)
mk=mask.load()
ha_px=(m_px**2)/1e4
stat={}
for grp in ('sebelum','sesudah'):
    for c in cj[grp]:
        im=Image.open(OUT+'citra/'+c['f']).convert('RGB'); a=im.load()
        n=buka=awan=0
        for y in range(500):
            for x in range(500):
                if not mk[x,y]: continue
                r,g,b=a[x,y]; n+=1
                if r>190 and g>190 and b>190: awan+=1; continue
                if r>g: buka+=1
        stat[c['f']]=dict(tgl=c['tgl'],px_dalam=n,awan_px=awan,buka_px=buka,buka_ha=round(buka*ha_px),dalam_ha=round(n*ha_px),buka_pct_sah=round(100*buka/max(1,n-awan),1))
print(json.dumps(stat,indent=1))
# overlay
tit=json.load(open(sys.argv[1]))
lama=[(q[1],q[0]) for q in p['pt']]            # S-NPP 14 Jun - 26 Okt
baru=[(q['lon'],q['lat']) for q in tit['dalam'] if q['hari']>='2026-10-27']
def gambar(src,dst,titik_lama=True,titik_baru=True,skala=2):
    im=Image.open(OUT+'citra/'+src).convert('RGB').resize((500*skala,500*skala),Image.LANCZOS)
    dr=ImageDraw.Draw(im,'RGBA')
    if titik_lama:
        for lo,la in lama:
            x,y=px(lo,la); dr.ellipse([x*skala-2,y*skala-2,x*skala+2,y*skala+2],fill=(255,235,59,150))
    if titik_baru:
        for lo,la in baru:
            x,y=px(lo,la); dr.ellipse([x*skala-3,y*skala-3,x*skala+3,y*skala+3],fill=(255,0,0,230),outline=(255,255,255,255))
    dr.line([(x*skala,y*skala) for x,y in ppx]+[(ppx[0][0]*skala,ppx[0][1]*skala)],fill=(0,229,255,255),width=4)
    im.save(OUT+dst)
gambar('msj_sebelum_20260605.png','peta_sebelum_20260605.png',False,False)
gambar('msj_sesudah_20261028.png','peta_sesudah_20261028.png',False,False)
gambar('msj_sesudah_20261028.png','peta_titik_20261028.png',True,True)
json.dump(dict(luas=stat,n_lama=len(lama),n_baru=len(baru)),open(OUT+'citra/statistik_citra.json','w'),indent=1)
print('titik lama',len(lama),'baru',len(baru))
