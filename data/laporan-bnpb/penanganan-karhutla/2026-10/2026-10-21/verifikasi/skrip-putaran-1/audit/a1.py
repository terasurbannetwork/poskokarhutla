"""Independent recomputation of deck metrics from raw FIRMS CSVs, per the written spec."""
import csv, glob, json, os, sys
from collections import defaultdict, Counter
from datetime import datetime, timedelta, date

SP = sys.argv[1]
GEO = '/Users/alfatehanseptianta/Documents/GitHub/poskokarhutla/public/geo/provinsi.json'
TGT = ['62', '16', '63', '15', '61', '93', '72', '64']
G = 0.003375
CUT = datetime(2026, 10, 21, 0, 0)  # UTC == 07:00 WIB

# polygons: keep every ring, even-odd over all rings of a feature (handles holes too)
feat = {}
for f in json.load(open(GEO))['features']:
    k = str(f['properties']['kode'])
    g = f['geometry']
    polys = [g['coordinates']] if g['type'] == 'Polygon' else g['coordinates']
    feat[k] = [r for pl in polys for r in pl]

def pip(x, y, ring):
    n = len(ring); c = False
    for i in range(n):
        x1, y1 = ring[i - 1]; x2, y2 = ring[i]
        if (y1 > y) != (y2 > y):
            xc = x1 + (y - y1) * (x2 - x1) / (y2 - y1)
            if x < xc: c = not c
    return c

bb = {k: (min(p[0] for r in rs for p in r), max(p[0] for r in rs for p in r), min(p[1] for r in rs for p in r), max(p[1] for r in rs for p in r)) for k, rs in feat.items()}
cache = {}
def provs(x, y):
    key = (x, y)
    if key in cache: return cache[key]
    out = []
    for k, rs in feat.items():
        a, b, c, d = bb[k]
        if a <= x <= b and c <= y <= d:
            ins = False
            for r in rs:
                if pip(x, y, r): ins = not ins
            if ins: out.append(k)
    cache[key] = out
    return out

rows = []
files = sorted(glob.glob(SP + '/raw/*.csv'))
seen = Counter(); sats = Counter(); confs = defaultdict(Counter); filedate_mismatch = 0
for fn in files:
    base = os.path.basename(fn)
    for r in csv.DictReader(open(fn)):
        sats[(base.rsplit('-', 1)[0], r['satellite'])] += 1
        confs[r['satellite']][r['confidence'] if r['satellite'] not in ('Terra', 'Aqua') else 'num'] += 1
        if r['acq_date'][-2:] != base[-6:-4]: filedate_mismatch += 1
        key = (r['latitude'], r['longitude'], r['acq_date'], r['acq_time'], r['satellite'])
        seen[key] += 1
        rows.append(r)
print('files', len(files), 'rows', len(rows), 'dup keys', sum(v - 1 for v in seen.values() if v > 1), 'file/acq_date mismatch', filedate_mismatch)
print('sats', dict(sats))
print('confs', {k: dict(v) for k, v in confs.items()})

def wib(r):
    t = datetime.strptime(r['acq_date'] + ' ' + r['acq_time'].zfill(4), '%Y-%m-%d %H%M')
    return t, (t + timedelta(hours=7))

hot = defaultdict(int)
cells = defaultdict(set)
P = defaultdict(list)    # (k, d) -> [(sat, cell)] N/N20 n/h
PC = defaultdict(set)    # (k, d) -> VIIRS n/h cells
multi = 0; nh_noprov_near = 0
snpp_day = Counter(); main_day = Counter()
for r in rows:
    tu, tw = wib(r)
    if tu >= CUT: continue
    d = tw.date().isoformat()
    x, y = float(r['longitude']), float(r['latitude'])
    s = r['satellite']
    ks = provs(x, y)
    if len(ks) > 1: multi += 1
    k = ks[0] if ks else None
    viirs = s in ('N', 'N20', 'N21')
    nh = viirs and r['confidence'] in ('n', 'h')
    if s in ('N', 'N20', 'Terra', 'Aqua'):
        main_day[d] += 1
        if k in TGT: hot[(k, d)] += 1
    if s == 'N' and nh: snpp_day[d] += 1
    if nh and 94 <= x <= 142:
        c = (round(x / G), round(y / G))
        cells[d].add(c)
        if k in TGT:
            PC[(k, d)].add(c)
            if s in ('N', 'N20'): P[(k, d)].append((s, c))
print('points in >1 province polygon:', multi)
print('S-NPP n/h share of main-sensor count per WIB day:', {d: (snpp_day[d], main_day[d], round(snpp_day[d] / main_day[d], 3)) for d in sorted(main_day)})

def near(c, S): return any((c[0] + i, c[1] + j) in S for i in (-1, 0, 1) for j in (-1, 0, 1))
def area(lst): return (sum(1 for s, _ in lst if s == 'N') + 0.978 * sum(1 for s, _ in lst if s == 'N20')) / 2 * 4.3
def clusters(cs):
    cs = list(cs); par = list(range(len(cs)))
    def fd(i):
        while par[i] != i: par[i] = par[par[i]]; i = par[i]
        return i
    idx = {c: i for i, c in enumerate(cs)}
    for i, (a, b) in enumerate(cs):
        for di in range(-4, 5):
            for dj in range(-4, 5):
                j = idx.get((a + di, b + dj))
                if j is not None: par[fd(i)] = fd(j)
    return len({fd(i) for i in range(len(cs))})

HARI = ['2026-10-17', '2026-10-18', '2026-10-19', '2026-10-20']
A = json.load(open(SP + '/angka.json'))['prov']
mine = {}
bad = 0
for k in TGT:
    o = {'hot': [], 'luas': [], 'belum': [], 'padam': [], 'fs': [], 'luas_snpp_only': []}
    for d in HARI:
        p = (date.fromisoformat(d) - timedelta(days=1)).isoformat()
        o['hot'].append(hot[(k, d)])
        o['luas'].append(area(P[(k, d)]))
        o['belum'].append(area([t for t in P[(k, d)] if near(t[1], cells[p])]))
        o['padam'].append(area([t for t in P[(k, p)] if not near(t[1], cells[d])]))
        o['fs'].append(clusters([c for c in PC[(k, d)] if near(c, cells[p])]))
        o['luas_snpp_only'].append(sum(1 for s, _ in P[(k, d)] if s == 'N') * 4.3)
    mine[k] = o
    for m in ('hot', 'luas', 'belum', 'padam', 'fs'):
        for i in range(4):
            if abs(o[m][i] - A[k][m][i]) > 0.051:
                bad += 1; print('MISMATCH', k, m, HARI[i], 'mine', o[m][i], 'angka', A[k][m][i])
print('mismatches vs angka.json:', bad)
json.dump(mine, open(os.path.dirname(__file__) + '/mine_exact.json', 'w'), indent=1)
for k in TGT:
    print(k, 'luas spec', [round(v) for v in mine[k]['luas']], 'luas S-NPP-only (platform)', [round(v) for v in mine[k]['luas_snpp_only']])
