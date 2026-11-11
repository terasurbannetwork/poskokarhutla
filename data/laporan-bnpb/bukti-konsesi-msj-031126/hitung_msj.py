import csv, json, glob, os, datetime as dt, sys
from collections import Counter, defaultdict
R='D:/Project/Work/BNPB/poskokarhutla'
d=json.load(open(R+'/public/data/konsesi2026/93.json',encoding='utf8'))
p=[x for x in d['perusahaan'] if x['id']=='sawit-gfw-1377'][0]
poly=p['geom'][0]['coordinates'][0][0]
def inside(lon,lat):
    c=False; n=len(poly)
    for i in range(n):
        x1,y1=poly[i]; x2,y2=poly[(i+1)%n]
        if (y1>lat)!=(y2>lat) and lon < (x2-x1)*(lat-y1)/(y2-y1)+x1: c=not c
    return c
xs=[a for a,b in poly]; ys=[b for a,b in poly]
bb=(min(xs)-.05,max(xs)+.05,min(ys)-.05,max(ys)+.05)
WIB=dt.timezone(dt.timedelta(hours=7))
rows=[]
for f in sorted(glob.glob(R+'/data/laporan-bnpb/generator/cache/raw/*.csv')):
    src=os.path.basename(f).rsplit('-',3)[0]
    for r in csv.DictReader(open(f)):
        lat=float(r['latitude']); lon=float(r['longitude'])
        if not(bb[0]<=lon<=bb[1] and bb[2]<=lat<=bb[3]): continue
        t=dt.datetime.strptime(r['acq_date']+r['acq_time'].zfill(4),'%Y-%m-%d%H%M').replace(tzinfo=dt.timezone.utc).astimezone(WIB)
        rows.append(dict(src=src,lat=lat,lon=lon,t=t.strftime('%Y-%m-%d %H:%M'),hari=t.strftime('%Y-%m-%d'),frp=float(r['frp']),conf=r['confidence'],dn=r['daynight'],dalam=inside(lon,lat)))
dalam=[r for r in rows if r['dalam']]
print('baris bbox',len(rows),'dalam',len(dalam))
per=defaultdict(Counter)
for r in dalam: per[r['hari']][r['src']]+=1
for h in sorted(per): print(h, dict(per[h]), 'total',sum(per[h].values()))
# S-NPP n/h (metode repo)
snpp=[r for r in dalam if r['src']=='VIIRS_SNPP_NRT' and r['conf'] in('n','h','nominal','high')]
print('SNPP n/h per hari', sorted(Counter(r['hari'] for r in snpp).items()))
print('FRP maks', max(dalam,key=lambda r:r['frp']))
json.dump(dict(poly=poly,dalam=dalam,bbox=rows),open(sys.argv[1],'w'))
