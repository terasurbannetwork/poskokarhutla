"""Firespot (titik) nasional per hari, S-NPP saja, 1 Jan..27 Okt (+ varian). Pakai harian.firespot/dbscan/pix + titik_unik + titik_palsu + Wilayah.
python3 -I fs_tahun.py TAHUN  -> fs_<tahun>.json"""
import sys, os, csv, json, datetime as dt, collections
AKAR = os.path.abspath(os.path.join(os.path.dirname(__file__), *['..'] * 5))
sys.path.insert(0, AKAR + '/scripts/data')
import harian as H, aturan as A, titik_palsu as TP, titik_unik as TU
from wilayah import Wilayah
th = int(sys.argv[1])
BER = {2015: 'viirs_2015.csv', 2019: 'viirs_2019.csv', 2023: 'viirs_2023.csv', 2026: 'arsip_281026/viirs.csv'}[th]
w, ind = Wilayah(), TP.sel_industri()[0]
cache = {}
pts, hs_all = [], {}   # hs_all: hari WIB -> set sel (semua keyakinan)
for r in csv.DictReader(open(f'{AKAR}/data/raw/firms/{BER}')):
    if not r['acq_date'].startswith(str(th)) and not r['acq_date'].startswith(str(th - 1)): continue
    lat, lon = round(float(r['latitude']), 4), round(float(r['longitude']), 4)
    j = r['acq_time'].zfill(4)
    t = dt.datetime.fromisoformat(f"{r['acq_date']}T{j[:2]}:{j[2:]}:00+00:00")
    if H.tgl(t).year != th: continue
    k = TU.sel(lat, lon)
    if k not in cache: cache[k] = (not TP.palsu(lat, lon, ind)) and w.cari(lon, lat) is not None
    if not cache[k]: continue
    c = {'l': 0, 'n': 1, 'h': 2}.get(r['confidence'], 1)
    hs_all.setdefault(H.tgl(t), set()).add(k)
    if c < 1 or A.gunung_api(lat, lon): continue
    pts.append({'lat': lat, 'lon': lon, 't': t, 's': 'N', 'c': c, 'px': max(float(r.get('scan') or .4), float(r.get('track') or .4))})
pts = sorted({(p['lat'], p['lon'], p['t']): p for p in pts}.values(), key=lambda p: p['t'])
print(th, 'titik', len(pts), flush=True)
akhir = dt.date(th, 10, 27); d = dt.date(th, 1, 1)
byday = collections.defaultdict(list)
for p in pts: byday[H.tgl(p['t'])].append(p)
out = {}
while d <= akhir:
    if d in byday:
        kini = dt.datetime.combine(d + dt.timedelta(days=1), dt.time(), H.WIB)
        win = [p for dd in range(7) for p in byday.get(d - dt.timedelta(days=dd), ())]
        win.sort(key=lambda p: p['t'])
        lab, _ = H.dbscan(win)
        K = collections.defaultdict(list)
        for p, l in zip(win, lab): K[l].append(p)
        sel_d = {H.pix(p) for p in byday[d]}   # sel S-NPP hari D (keyakinan >= n) -- basis klaster
        fs = fs3 = 0
        for ps in K.values():
            hari_ini = {H.pix(p) for p in ps if H.tgl(p['t']) == d}
            if not hari_ini: continue
            if H.firespot(ps)[1] == 'ya':
                fs += len(hari_ini)
                if len(ps) >= 3: fs3 += len(hari_ini)
        out[d.isoformat()] = [fs, fs3, len(hs_all.get(d, ())), len(sel_d)]
    d += dt.timedelta(days=1)
    if d.day == 1 or d == akhir: print(d, flush=True)
json.dump(out, open(f'fs_{th}.json', 'w'))
