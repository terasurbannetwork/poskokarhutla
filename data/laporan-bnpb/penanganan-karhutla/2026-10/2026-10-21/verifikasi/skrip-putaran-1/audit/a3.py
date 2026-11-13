"""S-NPP daytime gap on 20 Oct WIB: per-province pass counts, and luas under alternative fills."""
import csv, glob, sys, json
from collections import Counter, defaultdict
from datetime import datetime, timedelta
SP = sys.argv[1]
src = open(SP + '/hitung.py').read().split('CUT = ')[0].replace(
    "RAW, GEO, OUT = sys.argv[1], sys.argv[2], sys.argv[3]",
    "RAW,GEO,OUT='x','/Users/alfatehanseptianta/Documents/GitHub/poskokarhutla/public/geo/provinsi.json',None")
ns = {}; exec(src, ns); prov = ns['prov']
TGT = ns['TGT']
cnt = defaultdict(Counter)   # (k, wibday) -> Counter[(sat, D/N)]
lon04 = []
for fn in glob.glob(SP + '/raw/*.csv'):
    for r in csv.DictReader(open(fn)):
        if r['satellite'] not in ('N', 'N20') or r['confidence'] not in ('n', 'h'): continue
        t = datetime.strptime(r['acq_date'] + r['acq_time'].zfill(4), '%Y-%m-%d%H%M')
        if t >= datetime(2026, 10, 21): continue
        w = (t + timedelta(hours=7)).date().isoformat()
        x, y = float(r['longitude']), float(r['latitude'])
        if r['satellite'] == 'N' and r['acq_date'] == '2026-10-20' and r['acq_time'].zfill(4)[:2] == '04': lon04.append(x)
        k = prov(x, y)
        if k: cnt[(k, w)][(r['satellite'], r['daynight'])] += 1
print('S-NPP UTC-04 20 Oct pass lon range', min(lon04), max(lon04), len(lon04))
for k in TGT:
    row = []
    for d in ('2026-10-18', '2026-10-19', '2026-10-20'):
        c = cnt[(k, d)]
        row.append(f"{d[-2:]}: N D{c[('N','D')]}/N{c[('N','N')]} N20 D{c[('N20','D')]}/N{c[('N20','N')]}")
    c = cnt[(k, '2026-10-20')]
    N, N20 = c[('N','D')] + c[('N','N')], c[('N20','D')] + c[('N20','N')]
    spec = (N + 0.978 * N20) / 2 * 4.3
    n20only = 0.978 * N20 * 4.3
    print(k, ' | '.join(row), f"| luas20 spec={spec:.0f} N20x0.978={n20only:.0f} SNPPonly={N*4.3:.0f}")
