"""python3 -I fs2.py MODE  ; MODE setara26 (S-NPP, sampai 2 Nov) | semua26 (N+N20+N21 cluster, hotspot M+N+N20+N21)
Keluaran fs2_<mode>.json: {hari: [firespot_titik, hotspot_semua_keyakinan_sensor_mode, {prov: firespot}]}"""
import sys, os, csv, io, glob, json, datetime as dt, collections
AKAR = '/Users/priyankaalfatehan28/Developer/poskokarhutla'
sys.path.insert(0, AKAR + '/scripts/data')
import harian as H, aturan as A, titik_palsu as TP, titik_unik as TU
from wilayah import Wilayah
mode = sys.argv[1]
SEN = {'setara26': ['N'], 'semua26': ['N', 'N20', 'N21']}[mode]
HSEN = ['M', 'N'] if mode == 'setara26' else ['M', 'N', 'N20', 'N21']
ARS = AKAR + '/data/raw/firms/arsip_281026/'
NRT = os.path.dirname(os.path.abspath(__file__)) + '/nrt/'
SRC = {'M': ('modis.csv', 'MODIS_NRT'), 'N': ('viirs.csv', 'VIIRS_SNPP_NRT'), 'N20': ('viirs_noaa20.csv', 'VIIRS_NOAA20_NRT'), 'N21': ('viirs_noaa21.csv', 'VIIRS_NOAA21_NRT')}
w, ind = Wilayah(), TP.sel_industri()[0]
cache = {}
pts, hs = [], {}
seen = set()
def baris():
    for s in HSEN:
        a, n = SRC[s]
        for r in csv.DictReader(open(ARS + a)): yield s, r
        for f in sorted(glob.glob(NRT + n + '-*.csv')):
            for r in csv.DictReader(open(f)): yield s, r
for s, r in baris():
    lat, lon = round(float(r['latitude']), 4), round(float(r['longitude']), 4)
    j = r['acq_time'].zfill(4)
    t = dt.datetime.fromisoformat(f"{r['acq_date']}T{j[:2]}:{j[2:]}:00+00:00")
    if H.tgl(t) < dt.date(2026, 1, 1) or H.tgl(t) > dt.date(2026, 11, 2): continue
    if (s, lat, lon, t) in seen: continue
    seen.add((s, lat, lon, t))
    k = TU.sel(lat, lon)
    if k not in cache:
        a = w.cari(lon, lat)
        cache[k] = None if TP.palsu(lat, lon, ind) or a is None else a[0]
    if cache[k] is None: continue
    hs.setdefault(H.tgl(t), set()).add(k)
    if s == 'M': continue
    c = {'l': 0, 'n': 1, 'h': 2}.get(r['confidence'], 1)
    if c < 1 or A.gunung_api(lat, lon): continue
    pts.append({'lat': lat, 'lon': lon, 't': t, 's': s, 'c': c, 'px': max(float(r.get('scan') or .4), float(r.get('track') or .4))})
pts.sort(key=lambda p: p['t'])
print(mode, len(pts), max(hs), flush=True)
byday = collections.defaultdict(list)
for p in pts: byday[H.tgl(p['t'])].append(p)
out = {}
d = dt.date(2026, 1, 1)
while d <= dt.date(2026, 11, 2):
    if d in byday:
        win = sorted((p for dd in range(7) for p in byday.get(d - dt.timedelta(days=dd), ())), key=lambda p: p['t'])
        lab, _ = H.dbscan(win)
        K = collections.defaultdict(list)
        for p, l in zip(win, lab): K[l].append(p)
        fs, prov = 0, collections.Counter()
        for ps in K.values():
            sel = {H.pix(p) for p in ps if H.tgl(p['t']) == d}   # unik lintas satelit
            if sel and H.firespot(ps)[1] == 'ya':
                fs += len(sel)
                for x in sel: prov[cache[x]] += 1
        out[d.isoformat()] = [fs, len(hs.get(d, ())), dict(prov)]
    if d.day == 1: print(d, flush=True)
    d += dt.timedelta(days=1)
json.dump(out, open(f'fs2_{mode}.json', 'w'))
