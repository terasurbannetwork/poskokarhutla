import sys, json, math, datetime as dt
sys.path.insert(0,'D:/Project/Work/BNPB/poskokarhutla/scripts/data')
import citra as C, konsesi_citra as K
OUT='D:/Project/Work/BNPB/poskokarhutla/data/laporan-bnpb/bukti-konsesi-msj-031126/citra/'
xs=[140.53807,140.79513]; ys=[-7.97433,-7.71797]
lat=sum(ys)/2; lon=sum(xs)/2
km=max((xs[1]-xs[0])*111.32*math.cos(math.radians(lat)),(ys[1]-ys[0])*110.574)  # sama dengan bbox citra lama
def cari(d0,d1,tag,maks=3):
    q={"collections":["sentinel-2-l2a"],"bbox":C.kotak(lat,lon,2),"limit":50,
       "datetime":f"{d0}T00:00:00Z/{d1}T23:59:59Z","sortby":[{"field":"properties.datetime","direction":"desc"}]}
    feats=json.loads(C.ambil(C.STAC,data=json.dumps(q).encode()))["features"]
    kand=[]
    for it in feats:
        tgl=it["properties"]["datetime"][:10]
        if any(k[1]==tgl for k in kand): continue
        try: aw,ksg=K.awan(it,lat,lon,km)
        except Exception as e: print('scl gagal',it['id'],e); continue
        print(tag,tgl,it['id'],'awan',aw,'kosong',ksg)
        if ksg<=10: kand.append((it,tgl,aw))
    kand.sort(key=lambda k:k[2])
    hasil=[]
    for it,tgl,aw in kand[:maks]:
        if aw>40: continue
        f=f"msj_{tag}_{tgl.replace('-','')}.png"; K.swir(it,lat,lon,km,OUT+f)
        hasil.append(dict(f=f,tgl=tgl,awan=aw,adegan=it['id']))
    return hasil
r={'bbox':C.kotak(lat,lon,km),'km':km}
r['sebelum']=cari('2026-04-01','2026-06-12','sebelum',2)
r['sesudah']=cari('2026-10-20','2026-11-03','sesudah',3)
json.dump(r,open(OUT+'citra.json','w'),indent=1); print(json.dumps(r,indent=1))
