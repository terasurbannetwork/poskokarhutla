import json, math, sys
sys.path.insert(0,'D:/Project/Work/BNPB/poskokarhutla/scripts/data')
import titik_unik as TU
from collections import defaultdict
t=json.load(open(sys.argv[1]))
poly=t['poly']; rows=t['bbox']
xs=[a for a,b in poly]; ys=[b for a,b in poly]
bb=(min(xs)-.05,max(xs)+.05,min(ys)-.05,max(ys)+.05)
lat0=-7.85; kmx=111.32*math.cos(math.radians(lat0)); kmy=110.574
bb_ha=(bb[1]-bb[0])*kmx*(bb[3]-bb[2])*kmy*100
dalam_ha=38612; luar_ha=bb_ha-dalam_ha
u=defaultdict(set); ul=defaultdict(set)
for r in rows:
    if r['hari']<'2026-10-24' or r['hari']>'2026-11-02': continue
    c=TU.sel(r['lat'],r['lon'])
    (u if r['dalam'] else ul)[r['hari']].add(c)
tot_d=sum(len(v) for v in u.values()); tot_l=sum(len(v) for v in ul.values())
print('unik per hari dalam', {k:len(u[k]) for k in sorted(u)})
print('unik per hari luar(cincin 5 km)', {k:len(ul[k]) for k in sorted(ul)})
print('total unik 24 Okt-2 Nov dalam',tot_d,'luar',tot_l)
print('luas cincin ha',round(luar_ha),'kepadatan per 1000 ha dalam',round(tot_d/dalam_ha*1000,1),'luar',round(tot_l/luar_ha*1000,1),'rasio',round((tot_d/dalam_ha)/(tot_l/luar_ha),1))
mx=max((r for r in rows if r['dalam']),key=lambda r:r['frp']); print('frp maks',mx)
