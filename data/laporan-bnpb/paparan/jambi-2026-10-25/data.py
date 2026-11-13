"""Titik panas Jambi 18-25 Okt 2026 (hari WIB, cut-off 25 Okt 23.30 WIB) dari CSV FIRMS mentah yang ditarik satelit.py (generator/cache/raw),
untuk peta. Definisi titik = lokasi unik ~375 m per hari WIB, M + N + N20 + N21 keyakinan sedang/tinggi, tanpa sel industri (titik_unik.py,
keputusan pemilik 25 Okt 2026); jumlah per hari diassert sama dengan satelit.json. Keluaran: titik.json."""
import csv, glob, json, sys, datetime as dt
from collections import Counter
R = '/Users/alfatehanseptianta/Documents/GitHub/poskokarhutla'
sys.path.insert(0, R + '/scripts/data')
from wilayah import Wilayah
import peta_karhutla as PK
import titik_palsu as TP
import titik_unik as TU
SEL, _ = TP.sel_industri()
W = Wilayah()
S = json.load(open('satelit.json'))
CUT = dt.datetime.fromisoformat(S['cutoff'])
AWAL = dt.datetime.fromisoformat(S['hari'][0] + 'T00:00+07:00')
SUMBER = ('MODIS_NRT', 'VIIRS_SNPP_NRT', 'VIIRS_NOAA20_NRT', 'VIIRS_NOAA21_NRT')
pts = {}
for fn in sorted(glob.glob(R + '/data/laporan-bnpb/generator/cache/raw/*.csv')):
    if fn.split('/')[-1].rsplit('-', 3)[0] not in SUMBER: continue
    for r in csv.DictReader(open(fn)):
        lat, lon = float(r['latitude']), float(r['longitude'])
        if not (-2.9 < lat < -0.6 and 101.0 < lon < 104.7): continue
        sen = {'Terra': 'M', 'Aqua': 'M'}.get(r['satellite'], r['satellite'])
        if sen not in TU.SENSOR or not PK.sedang(r) or TP.palsu(lat, lon, SEL): continue
        t = dt.datetime.strptime(r['acq_date'] + r['acq_time'].zfill(4), '%Y-%m-%d%H%M').replace(tzinfo=PK.UTC)
        if not (AWAL <= t < CUT): continue
        pts[(sen, lat, lon, t)] = {'s': sen, 'c': 1, 'lat': lat, 'lon': lon, 't': t, 'wib': t.astimezone(PK.WIB)}   # CSV hari UTC bertumpuk antartarikan
out = []
for p in TU.unik(sorted(pts.values(), key=lambda x: x['t']), lambda x: x['wib'].date().isoformat()):
    id_ = W.cari(p['lon'], p['lat'])
    if id_ and id_[0] == '15':
        out.append({'lat': p['lat'], 'lon': p['lon'], 'w': p['wib'].strftime('%Y-%m-%d %H:%M'), 's': p['s'], 'kab': id_[1], 'kec': id_[2]})
json.dump({'hot': out}, open('titik.json', 'w'))
per = Counter(p['w'][:10] for p in out)
assert [per[d] for d in S['hari']] == S['prov']['15']['hot_bersih'], ([per[d] for d in S['hari']], S['prov']['15']['hot_bersih'])
print('per hari', sorted(per.items()))
