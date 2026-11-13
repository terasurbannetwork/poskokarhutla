"""Titik panas Lampung 17-24 Okt 2026 (24 Okt s.d. 06.44 WIB) (hari WIB) dari FIRMS mentah raw/*.csv untuk peta dan hitungan kawasan TNWK.
hot = MODIS + VIIRS S-NPP + NOAA-20, semua keyakinan, titik sumber panas industri (titik_palsu.json) dibuang: sama dengan harian30.json.
TNWK = relasi OSM 7757736 (osm/tnwk.json). Keluaran: titik.json, tnwk.geojson."""
import csv, glob, json, sys, datetime as dt
R = '/Users/alfatehanseptianta/Documents/GitHub/poskokarhutla'
sys.path.insert(0, R + '/scripts/data')
from wilayah import Wilayah, _di_dalam
import titik_palsu as TP
SEL, _ = TP.sel_industri()
W = Wilayah()
CUT = dt.datetime(2026, 10, 24, 6, 44)   # cut-off paparan (WIB)
UTAMA = {'VIIRS_SNPP_NRT': 'N', 'VIIRS_NOAA20_NRT': 'N20', 'MODIS_NRT': 'M'}
# TNWK: sambung way outer jadi cincin
o = json.load(open('osm/tnwk.json'))['elements'][0]
segs = [[(p['lon'], p['lat']) for p in m['geometry']] for m in o['members'] if m['type'] == 'way' and m['role'] in ('outer', '')]
cincin = []
while segs:
    r = segs.pop(0)
    while r[0] != r[-1] and segs:
        for i, s in enumerate(segs):
            if s[0] == r[-1]: r += s[1:]; segs.pop(i); break
            if s[-1] == r[-1]: r += s[::-1][1:]; segs.pop(i); break
        else: break
    cincin.append(r)
json.dump({'type': 'FeatureCollection', 'features': [{'type': 'Feature', 'properties': {'nama': 'TNWK'}, 'geometry': {'type': 'Polygon', 'coordinates': [c]}} for c in cincin]}, open('tnwk.geojson', 'w'))
tn = lambda lon, lat: any(_di_dalam(lon, lat, c) for c in cincin)
out, det = [], []
DET = {'VIIRS_NOAA20_NRT', 'VIIRS_NOAA21_NRT'}
for fn in sorted(glob.glob('raw/*.csv')):
    src = fn.split('/')[-1].rsplit('-', 1)[0]
    for r in csv.DictReader(open(fn)):
        lat, lon = float(r['latitude']), float(r['longitude'])
        if not (-6.3 < lat < -3.6 and 103.4 < lon < 106.3): continue
        w = dt.datetime.strptime(r['acq_date'] + r['acq_time'].zfill(4), '%Y-%m-%d%H%M') + dt.timedelta(hours=7)
        if w >= CUT: continue
        if TP.palsu(lat, lon, SEL): continue
        id_ = W.cari(lon, lat)
        if not id_ or id_[0] != '18': continue
        if src in DET and r['confidence'] in ('n', 'h'):
            det.append({'lat': lat, 'lon': lon, 'w': w.strftime('%Y-%m-%d %H:%M'), 'kab': id_[1], 'kec': id_[2], 'tn': tn(lon, lat)})
        if src not in UTAMA or w < dt.datetime(2026, 10, 17): continue
        out.append({'lat': lat, 'lon': lon, 'w': w.strftime('%Y-%m-%d %H:%M'), 's': UTAMA[src], 'kab': id_[1], 'kec': id_[2], 'tn': tn(lon, lat)})
json.dump({'hot': out, 'det': det}, open('titik.json', 'w'))
from collections import Counter
print('per hari', sorted(Counter(p['w'][:10] for p in out).items()))
print('TNWK', len(cincin), 'cincin', sorted(Counter(p['w'][:10] for p in out if p['tn']).items()))
print('TNWK per kec', Counter(p['kec'] for p in out if p['tn']))
