import urllib.request, datetime as dt, re, os, sys
from concurrent.futures import ThreadPoolExecutor
K=re.search(r'^FIRMS_MAP_KEY=(\S+)',open('/Users/priyankaalfatehan28/Developer/poskokarhutla/.env').read(),re.M).group(1)
def ambil(a):
    src,u=a; f=f'nrt/{src}-{u}.csv'
    if os.path.exists(f): return
    for _ in range(3):
        try:
            t=urllib.request.urlopen(f'https://firms.modaps.eosdis.nasa.gov/api/area/csv/{K}/{src}/94,-11.5,141.5,6.5/1/{u}',timeout=200).read().decode()
            if t.startswith('latitude'): open(f,'w').write(t); print(src,u,len(t.splitlines()),flush=True); return
            print(src,u,'bukan csv',t[:50],flush=True); return
        except Exception as e: print(src,u,'err',e,flush=True)
J=[(s,dt.date(2026,10,26)+dt.timedelta(days=i)) for s in ('MODIS_NRT','VIIRS_SNPP_NRT','VIIRS_NOAA20_NRT','VIIRS_NOAA21_NRT') for i in range(8)]
with ThreadPoolExecutor(12) as e: list(e.map(ambil,J))
