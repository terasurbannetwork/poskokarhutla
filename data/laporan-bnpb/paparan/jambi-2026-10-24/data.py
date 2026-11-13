"""Titik panas Jambi 17-24 Okt 2026 (hari WIB, cut-off 24 Okt 24.00 WIB) dari CSV FIRMS mentah yang ditarik satelit.py (generator/cache/raw),
untuk peta. hot = MODIS + VIIRS S-NPP + NOAA-20, semua keyakinan, titik sumber panas industri dibuang: sama dengan harian30.json (diassert).
Keluaran: titik.json."""
import csv, glob, json, sys, datetime as dt
from collections import Counter
R = '/Users/alfatehanseptianta/Documents/GitHub/poskokarhutla'
sys.path.insert(0, R + '/scripts/data')
from wilayah import Wilayah
import titik_palsu as TP
SEL, _ = TP.sel_industri()
W = Wilayah()
CUT = dt.datetime(2026, 10, 25, 0, 0)   # cut-off paparan (WIB): 24 Okt hari penuh
UTAMA = {'VIIRS_SNPP_NRT': 'N', 'VIIRS_NOAA20_NRT': 'N20', 'MODIS_NRT': 'M'}
out = []
for fn in sorted(glob.glob(R + '/data/laporan-bnpb/generator/cache/raw/*.csv')):
    src = fn.split('/')[-1].rsplit('-', 3)[0]
    if src not in UTAMA: continue
    for r in csv.DictReader(open(fn)):
        lat, lon = float(r['latitude']), float(r['longitude'])
        if not (-2.9 < lat < -0.6 and 101.0 < lon < 104.7): continue
        w = dt.datetime.strptime(r['acq_date'] + r['acq_time'].zfill(4), '%Y-%m-%d%H%M') + dt.timedelta(hours=7)
        if w >= CUT or w < dt.datetime(2026, 10, 17): continue
        if TP.palsu(lat, lon, SEL): continue
        id_ = W.cari(lon, lat)
        if not id_ or id_[0] != '15': continue
        out.append({'lat': lat, 'lon': lon, 'w': w.strftime('%Y-%m-%d %H:%M'), 's': UTAMA[src], 'kab': id_[1], 'kec': id_[2]})
out = list({(p['lat'], p['lon'], p['w'], p['s']): p for p in out}.values())   # CSV hari UTC bertumpuk antartarikan
json.dump({'hot': out}, open('titik.json', 'w'))
S = json.load(open('satelit.json'))
per = Counter(p['w'][:10] for p in out)
assert [per[d] for d in S['hari']] == S['prov']['15']['hot_bersih'], ([per[d] for d in S['hari']], S['prov']['15']['hot_bersih'])
print('per hari', sorted(per.items()))
