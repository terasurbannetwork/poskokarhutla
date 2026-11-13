"""Pembanding: angka 6 Nov s.d. 18.00 bila HANYA MODIS (pemilik 6 Nov). Bukan metode resmi; faktor MODIS tidak pernah dikalibrasi.
- hotspot: lokasi unik ~375 m (titik_unik) MODIS saja, semua keyakinan, tanpa sel industri;
- firespot (proksi): hotspot MODIS 6 Nov yang jatuh di poligon cluster firespot website (kluster.json, fs_ini > 0);
- luas: titik MODIS keyakinan >= 30 x faktor F_M; F_M = median (luas website / titik MODIS) 2-5 Nov nasional;
- sisa (belum padam): titik MODIS 6 Nov yang petak 3x3 (~1 km) pernah terdeteksi MODIS 12-36 jam sebelumnya, x F_M."""
import csv, datetime as dt, json, os, statistics, sys
from collections import Counter
S = os.path.dirname(os.path.abspath(__file__)); G = os.path.join(S, '..', '..', '..', 'generator'); sys.path.insert(0, G)
import satelit
TU, TP, PK = satelit.TU, satelit.TP, satelit.PK
W = satelit.Wilayah(); IND, _ = TP.sel_industri()
WIB = dt.timedelta(hours=7); CUT = dt.datetime(2026, 11, 6, 18, 0)
pts = []
for u in ('2026-11-01', '2026-11-02', '2026-11-03', '2026-11-04', '2026-11-05', '2026-11-06'):
    f = os.path.join(S, 'firms', f'MODIS_NRT-{u}.csv')
    if not os.path.exists(f): f = os.path.join(G, 'cache', 'raw', f'MODIS_NRT-{u}.csv')
    for r in csv.DictReader(open(f)):
        t = dt.datetime.strptime(r['acq_date'] + r['acq_time'].zfill(4), '%Y-%m-%d%H%M') + WIB
        la, lo = float(r['latitude']), float(r['longitude'])
        if t >= CUT or TP.palsu(la, lo, IND): continue
        a = W.cari(lo, la)
        if not a: continue
        c = int(r['confidence'])
        pts.append({'t': t, 'd': t.date().isoformat(), 'p': a[0], 'lat': la, 'lon': lo, 'yak': c >= 30, 's': 'M', 'c': 2 if c >= 30 else 0})
pts.sort(key=lambda x: x['t'])
P = json.load(open(os.path.join(S, 'web', 'peta_karhutla.json'), encoding='utf-8'))
yak = Counter(x['d'] for x in pts if x['yak'])
rasio = {d: sum((v['luas'][P['hari'].index(d)] or 0) for v in P['prov'].values()) / yak[d] for d in ('2026-11-02', '2026-11-03', '2026-11-04', '2026-11-05')}
FM = statistics.median(rasio.values())
print('faktor MODIS (ha/titik) per hari:', {d: round(v, 1) for d, v in rasio.items()}, '-> median', round(FM, 1))
D = '2026-11-06'
hot = Counter(x['p'] for x in TU.unik([x for x in pts if x['d'] == D], lambda x: x['d']))
# firespot proksi
K = json.load(open(os.path.join(S, 'web', 'kluster.json'), encoding='utf-8'))
def cincin(c):
    if isinstance(c[0], (int, float)):   # cluster satu titik (Point): kotak ~1 km di sekitarnya
        x, y, e = c[0], c[1], 0.005; return [[[x - e, y - e], [x + e, y - e], [x + e, y + e], [x - e, y + e]]]
    if isinstance(c[0][0], (int, float)): return [c]
    return [r for x in c for r in cincin(x)]
poli = [r for f in K['features'] if f['properties'].get('fs_ini') for r in cincin(f['geometry']['coordinates'])[:1]]
def dalam(lo, la, ring):
    i, n = False, len(ring)
    for j in range(n):
        x1, y1 = ring[j]; x2, y2 = ring[j - 1]
        if (y1 > la) != (y2 > la) and lo < (x2 - x1) * (la - y1) / (y2 - y1) + x1: i = not i
    return i
fs = Counter(x['p'] for x in TU.unik([x for x in pts if x['d'] == D], lambda x: x['d']) if any(dalam(x['lon'], x['lat'], r) for r in poli))
sel = lambda x: (round(x['lat'] / 0.01), round(x['lon'] / 0.01))
hari = [x for x in pts if x['d'] == D and x['yak']]
luas = Counter(x['p'] for x in hari)
belum = Counter()
for x in hari:
    s0 = sel(x)
    lalu = {sel(y) for y in pts if y['yak'] and dt.timedelta(hours=12) <= x['t'] - y['t'] <= dt.timedelta(hours=36)} if False else None
    belum[x['p']] += 0
# hitung "bertahan" efisien
idx = {}
for y in pts:
    if y['yak']: idx.setdefault(sel(y), []).append(y['t'])
for x in hari:
    a, b = sel(x)
    if any(dt.timedelta(hours=12) <= x['t'] - t <= dt.timedelta(hours=36) for i in (-1, 0, 1) for j in (-1, 0, 1) for t in idx.get((a + i, b + j), [])):
        belum[x['p']] += 1
NAMA = {'64': 'Kalimantan Timur', '74': 'Sulawesi Tenggara', '62': 'Kalimantan Tengah', '72': 'Sulawesi Tengah', '16': 'Sumatera Selatan', '73': 'Sulawesi Selatan'}
out = {k: {'hot': hot[k], 'fs': fs[k], 'luas': round(luas[k] * FM), 'belum': round(belum[k] * FM)} for k in NAMA}
out['nasional'] = {'hot': sum(hot.values()), 'fs': sum(fs.values()), 'luas': round(sum(luas.values()) * FM), 'belum': round(sum(belum.values()) * FM)}
json.dump({'faktor': FM, 'rasio': rasio, 'hasil': out}, open(os.path.join(S, 'modis-saja.json'), 'w'), indent=1)
for k, v in out.items(): print(NAMA.get(k, k), v)
