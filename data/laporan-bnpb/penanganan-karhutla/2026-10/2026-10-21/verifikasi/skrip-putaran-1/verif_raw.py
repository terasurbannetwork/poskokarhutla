"""Independent re-implementation of the deck metrics from raw FIRMS CSVs."""
import csv, glob, json, os, sys, collections
from datetime import datetime, timedelta

S = '/private/tmp/claude-501/-Users-alfatehanseptianta-Documents-GitHub-poskokarhutla/519b7abb-b696-465e-bd1c-bcbbfb8815f9/scratchpad'
RAW = S + '/raw'
GEO = '/Users/alfatehanseptianta/Documents/GitHub/poskokarhutla/public/geo/provinsi.json'
PROVS = ['62', '16', '63', '15', '61', '93', '72', '64']
DAYS = ['2026-10-16', '2026-10-17', '2026-10-18', '2026-10-19', '2026-10-20']
CUTOFF = datetime(2026, 10, 21, 7, 0)  # WIB
G = 0.003375

# --- polygons -------------------------------------------------------------
def load_polys():
    d = json.load(open(GEO))
    out = {}
    for f in d['features']:
        g = f['geometry']
        parts = g['coordinates'] if g['type'] == 'MultiPolygon' else [g['coordinates']]
        ps = []
        for p in parts:
            xs = [x for r in p for x, y in r]; ys = [y for r in p for x, y in r]
            ps.append(((min(xs), min(ys), max(xs), max(ys)), p))
        out[f['properties']['kode']] = ps
    return out

def in_ring(x, y, ring):
    ins = False
    n = len(ring)
    j = n - 1
    for i in range(n):
        xi, yi = ring[i]; xj, yj = ring[j]
        if (yi > y) != (yj > y) and x < (xj - xi) * (y - yi) / (yj - yi) + xi:
            ins = not ins
        j = i
    return ins

def in_poly(x, y, parts):
    for (x0, y0, x1, y1), rings in parts:
        if x0 <= x <= x1 and y0 <= y <= y1:
            if in_ring(x, y, rings[0]) and not any(in_ring(x, y, h) for h in rings[1:]):
                return True
    return False

POLY = load_polys()

def prov_of(x, y, cache={}):
    k = (x, y)
    if k not in cache:
        cache[k] = next((p for p in PROVS if in_poly(x, y, POLY[p])), None)
    return cache[k]

# --- read points ----------------------------------------------------------
def wib_day(date, t):
    t = int(t)
    dt = datetime.strptime(date, '%Y-%m-%d') + timedelta(hours=t // 100, minutes=t % 100) + timedelta(hours=7)
    return dt

pts = []  # (wibday, sat, conf, lon, lat, file, utcdate, time)
seen = collections.Counter()
for f in sorted(glob.glob(RAW + '/*.csv')):
    for r in csv.DictReader(open(f)):
        dt = wib_day(r['acq_date'], r['acq_time'])
        if dt >= CUTOFF:
            continue
        day = dt.strftime('%Y-%m-%d')
        lon = float(r['longitude']); lat = float(r['latitude'])
        key = (r['satellite'], r['latitude'], r['longitude'], r['acq_date'], r['acq_time'])
        seen[key] += 1
        pts.append((day, r['satellite'], r['confidence'], lon, lat, os.path.basename(f)))

dups = {k: v for k, v in seen.items() if v > 1}
print('rows', len(pts), 'exact duplicate (sat,lat,lon,date,time) keys:', len(dups))
# cross-satellite same lat/lon/time (should be impossible physically)
xs = collections.Counter((p[3], p[4]) for p in pts)
print('same lat/lon appearing >1 time (any sat/time):', sum(1 for v in xs.values() if v > 1))

def cell(lon, lat):
    return (round(lon / G), round(lat / G))

VIIRS = ('N', 'N20', 'N21')
NH = ('n', 'h')

cells = collections.defaultdict(set)
for day, sat, conf, lon, lat, _ in pts:
    if sat in VIIRS and conf in NH and 94 <= lon <= 142:
        cells[day].add(cell(lon, lat))

def has_nb(c, S):
    cx, cy = c
    for dx in (-1, 0, 1):
        for dy in (-1, 0, 1):
            if (cx + dx, cy + dy) in S:
                return True
    return False

def prevday(d):
    return (datetime.strptime(d, '%Y-%m-%d') - timedelta(days=1)).strftime('%Y-%m-%d')

def nextday(d):
    return (datetime.strptime(d, '%Y-%m-%d') + timedelta(days=1)).strftime('%Y-%m-%d')

# per-province point lists
P = collections.defaultdict(list)
for p in pts:
    day, sat, conf, lon, lat, _ = p
    if day not in DAYS:
        continue
    pr = prov_of(lon, lat)
    if pr:
        P[(pr, day)].append(p)

def ha(nN, nN20):
    return (nN + 0.978 * nN20) / 2 * 4.3

def cluster(cs, R=4):
    cs = list(cs); parent = list(range(len(cs)))
    def find(i):
        while parent[i] != i:
            parent[i] = parent[parent[i]]; i = parent[i]
        return i
    idx = {c: i for i, c in enumerate(cs)}
    for i, (x, y) in enumerate(cs):
        for dx in range(-R, R + 1):
            for dy in range(-R, R + 1):
                j = idx.get((x + dx, y + dy))
                if j is not None:
                    a, b = find(i), find(j)
                    if a != b:
                        parent[a] = b
    return len({find(i) for i in range(len(cs))})

res = {}
for pr in PROVS:
    r = {k: [] for k in ('hot', 'luas', 'belum', 'padam', 'fs', 'fs_noN21', 'hot_allconfN21')}
    for d in DAYS[1:]:
        L = P[(pr, d)]
        Lp = P[(pr, prevday(d))]
        hot = sum(1 for p in L if p[1] in ('Terra', 'Aqua', 'N', 'N20'))
        nh = [p for p in L if p[1] in ('N', 'N20') and p[2] in NH]
        luas = ha(sum(p[1] == 'N' for p in nh), sum(p[1] == 'N20' for p in nh))
        prevc = cells[prevday(d)]
        bl = [p for p in nh if has_nb(cell(p[3], p[4]), prevc)]
        belum = ha(sum(p[1] == 'N' for p in bl), sum(p[1] == 'N20' for p in bl))
        nhp = [p for p in Lp if p[1] in ('N', 'N20') and p[2] in NH]
        pd = [p for p in nhp if not has_nb(cell(p[3], p[4]), cells[d])]
        padam = ha(sum(p[1] == 'N' for p in pd), sum(p[1] == 'N20' for p in pd))
        fsc = {cell(p[3], p[4]) for p in L if p[1] in VIIRS and p[2] in NH and has_nb(cell(p[3], p[4]), prevc)}
        fsc2 = {cell(p[3], p[4]) for p in L if p[1] in ('N', 'N20') and p[2] in NH and has_nb(cell(p[3], p[4]), prevc)}
        r['hot'].append(hot); r['luas'].append(luas); r['belum'].append(belum)
        r['padam'].append(padam); r['fs'].append(cluster(fsc)); r['fs_noN21'].append(cluster(fsc2))
    res[pr] = r

json.dump(res, open(S + '/verif/mine_raw.json', 'w'), indent=1)

ref = json.load(open(S + '/angka.json'))['prov']
bad = 0
for pr in PROVS:
    for k in ('hot', 'luas', 'belum', 'padam', 'fs'):
        for i, (a, b) in enumerate(zip(ref[pr][k], res[pr][k])):
            diff = abs(a - b)
            if diff > 2 and diff > 0.01 * max(abs(a), abs(b)):
                bad += 1
                print('DIFF', pr, k, DAYS[1 + i], 'angka.json=', a, 'mine=', b)
            elif diff > 0.05:
                print('small', pr, k, DAYS[1 + i], a, b)
print('mismatches:', bad)
for pr in PROVS:
    print(pr, 'fs(with N21)=', res[pr]['fs'], 'fs(N/N20 only)=', res[pr]['fs_noN21'])
