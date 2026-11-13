"""How much of BELUM PADAM rests on a d-1 neighbour seen only a few hours earlier (same night across WIB midnight)?"""
import csv, glob, sys, json
from collections import defaultdict
from datetime import datetime, timedelta, date
SP = sys.argv[1]
src = open(SP + '/hitung.py').read().split('CUT = ')[0].replace(
    "RAW, GEO, OUT = sys.argv[1], sys.argv[2], sys.argv[3]",
    "RAW,GEO,OUT='x','/Users/alfatehanseptianta/Documents/GitHub/poskokarhutla/public/geo/provinsi.json',None")
ns = {}; exec(src, ns); prov = ns['prov']; TGT = ns['TGT']
G = 0.003375
first = defaultdict(dict)   # day -> cell -> earliest WIB time that day
P = defaultdict(list)
for fn in glob.glob(SP + '/raw/*.csv'):
    for r in csv.DictReader(open(fn)):
        if r['satellite'] not in ('N', 'N20', 'N21') or r['confidence'] not in ('n', 'h'): continue
        t = datetime.strptime(r['acq_date'] + r['acq_time'].zfill(4), '%Y-%m-%d%H%M') + timedelta(hours=7)
        if t >= datetime(2026, 10, 21, 7): continue
        d = t.date().isoformat(); x, y = float(r['longitude']), float(r['latitude'])
        c = (round(x / G), round(y / G))
        if c not in first[d] or t < first[d][c]: first[d][c] = t
        k = prov(x, y)
        if k and r['satellite'] in ('N', 'N20'): P[(k, d)].append((r['satellite'], c, t))
area = lambda L: (sum(1 for s, *_ in L if s == 'N') + 0.978 * sum(1 for s, *_ in L if s == 'N20')) / 2 * 4.3
def nb(c, S): return [S[(c[0] + i, c[1] + j)] for i in (-1, 0, 1) for j in (-1, 0, 1) if (c[0] + i, c[1] + j) in S]
for d in ('2026-10-18', '2026-10-19', '2026-10-20'):
    p = (date.fromisoformat(d) - timedelta(days=1)).isoformat()
    tot = strict = 0
    for k in TGT:
        L = P[(k, d)]
        a = [q for q in L if nb(q[1], first[p])]
        b = [q for q in a if min(nb(q[1], first[p])) <= q[2] - timedelta(hours=12)]
        tot += area(a); strict += area(b)
    print(d, f'belum 8-prov {tot:.0f} ha; with d-1 neighbour >=12 h earlier {strict:.0f} ha ({strict/tot*100:.0f}%)')
