# Unrounded recomputation (same logic as hitung2.py, read-only; prints, writes nothing)
import csv, glob, json, sys
from datetime import datetime, timedelta, date
from collections import defaultdict
SP = '/private/tmp/claude-501/-Users-alfatehanseptianta-Documents-GitHub-poskokarhutla/519b7abb-b696-465e-bd1c-bcbbfb8815f9/scratchpad'
src = open(SP + '/hitung.py').read().split("CUT = ")[0].replace(
    "RAW, GEO, OUT = sys.argv[1], sys.argv[2], sys.argv[3]",
    "RAW,GEO,OUT=%r,'/Users/alfatehanseptianta/Documents/GitHub/poskokarhutla/public/geo/provinsi.json',None" % (SP + '/raw'))
exec(src)
G = 0.003375; F = {'N': 1.0, 'N20': 0.978}
hot = defaultdict(int); cells = defaultdict(set); pc = defaultdict(set); pts = defaultdict(list)
sats = defaultdict(int)
for fn in glob.glob(SP + '/raw/*.csv'):
    for r in csv.DictReader(open(fn)):
        sats[(fn.split('/')[-1][:18], r['satellite'], r['confidence'])] += 1
        w = datetime.strptime(r['acq_date'] + r['acq_time'].zfill(4), '%Y-%m-%d%H%M') + timedelta(hours=7)
        if w >= datetime(2026, 10, 21, 7): continue
        x, y = float(r['longitude']), float(r['latitude'])
        d = w.date().isoformat()
        if r['satellite'] in ('N', 'N20', 'Terra', 'Aqua'):
            k0 = prov(x, y)
            if k0: hot[(k0, d)] += 1
        if r['confidence'].lower() not in ('n', 'h'): continue
        c = (round(x / G), round(y / G)); cells[d].add(c)
        k = prov(x, y)
        if not k: continue
        pc[(k, d)].add(c)
        if r['satellite'] in F: pts[(k, d)].append((r['satellite'], c))
def near(c, S): return any((c[0] + i, c[1] + j) in S for i in (-1, 0, 1) for j in (-1, 0, 1))
def rata(lst): return sum(F[s] * sum(1 for t, _ in lst if t == s) for s in F) / 2
def cnt(lst): return tuple(sum(1 for t, _ in lst if t == s) for s in F)
HARI = ['2026-10-17', '2026-10-18', '2026-10-19', '2026-10-20']
A = json.load(open(SP + '/angka.json'))['prov']
print('satellite/confidence keys:', sorted(set((a, b) for a, b, c in sats)))
for k in TGT:
    for i, d in enumerate(HARI):
        p = (date.fromisoformat(d) - timedelta(days=1)).isoformat()
        L = pts[(k, d)]
        bl = [t for t in L if near(t[1], cells[p])]
        pd = [t for t in pts[(k, p)] if not near(t[1], cells[d])]
        v = {'hot': hot[(k, d)], 'luas': rata(L) * 4.3, 'belum': rata(bl) * 4.3, 'padam': rata(pd) * 4.3}
        for m, val in v.items():
            if abs(A[k][m][i] - val) > 0.051: print('MISMATCH', k, d, m, A[k][m][i], val)
            if m != 'hot' and abs(val - int(val) - 0.5) < 0.06:
                print(f'HALF {k} {d} {m}: angka={A[k][m][i]} exact={val!r} counts(N,N20)={cnt({"luas": L, "belum": bl, "padam": pd}[m])} -> true round {round(val)}')
# arrows from exact values vs from angka.json 1-decimal values
EX = {}
for k in TGT:
    for i, d in enumerate(HARI):
        p = (date.fromisoformat(d) - timedelta(days=1)).isoformat()
        L = pts[(k, d)]
        EX[(k, 'luas', i)] = rata(L) * 4.3
        EX[(k, 'belum', i)] = rata([t for t in L if near(t[1], cells[p])]) * 4.3
        EX[(k, 'hot', i)] = hot[(k, d)]
for k in TGT:
    for g in ('hot', 'luas', 'belum'):
        for i in (1, 2, 3):
            pe = round((EX[(k, g, i)] - EX[(k, g, i - 1)]) / EX[(k, g, i - 1)] * 100)
            pa = round((A[k][g][i] - A[k][g][i - 1]) / A[k][g][i - 1] * 100)
            if pe != pa: print('ARROW exact vs angka', k, g, i, pe, pa)
            if round(EX[(k, g, i)]) != round(A[k][g][i]): print('DISPLAY exact vs angka', k, g, i, round(EX[(k, g, i)]), round(A[k][g][i]), EX[(k, g, i)])
print('done arrows')
for k, g, i in (('15', 'belum', 2), ('72', 'luas', 1), ('72', 'luas', 2), ('72', 'belum', 1)):
    a, b = EX[(k, g, i - 1)], EX[(k, g, i)]
    print(k, g, i, f'prev={a:.4f} cur={b:.4f} exact%={(b - a) / a * 100:.4f}', f'angka prev={A[k][g][i-1]} cur={A[k][g][i]} %={(A[k][g][i] - A[k][g][i-1]) / A[k][g][i-1] * 100:.4f}')
