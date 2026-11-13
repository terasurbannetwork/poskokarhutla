"""Province assignment: deck (simplified provinsi.json outer rings) vs platform (wilayah.Wilayah on kecamatan polygons)."""
import csv, glob, sys, json
from collections import defaultdict, Counter
from datetime import datetime, timedelta
SP = sys.argv[1]
sys.path.insert(0, '/Users/alfatehanseptianta/Documents/GitHub/poskokarhutla/scripts/data')
from wilayah import Wilayah
W = Wilayah()
src = open(SP + '/hitung.py').read().split('CUT = ')[0].replace(
    "RAW, GEO, OUT = sys.argv[1], sys.argv[2], sys.argv[3]",
    "RAW,GEO,OUT='x','/Users/alfatehanseptianta/Documents/GitHub/poskokarhutla/public/geo/provinsi.json',None")
ns = {}; exec(src, ns); prov = ns['prov']; TGT = ns['TGT']
hot_d, hot_p, nh_d, nh_p = defaultdict(int), defaultdict(int), defaultdict(int), defaultdict(int)
moves = Counter()
for fn in glob.glob(SP + '/raw/*.csv'):
    for r in csv.DictReader(open(fn)):
        s = r['satellite']
        if s not in ('N', 'N20', 'Terra', 'Aqua'): continue
        t = datetime.strptime(r['acq_date'] + r['acq_time'].zfill(4), '%Y-%m-%d%H%M')
        if t >= datetime(2026, 10, 21): continue
        d = (t + timedelta(hours=7)).date().isoformat()
        if d not in ('2026-10-18', '2026-10-19', '2026-10-20'): continue
        x, y = float(r['longitude']), float(r['latitude'])
        a = prov(x, y); w = W.cari(x, y); b = w[0] if w else None
        if a != b and (a in TGT or b in TGT): moves[(a, b)] += 1
        if a in TGT: hot_d[(a, d)] += 1
        if b in TGT: hot_p[(b, d)] += 1
        if s == 'N' and r['confidence'] in ('n', 'h'):
            if a in TGT: nh_d[(a, d)] += 1
            if b in TGT: nh_p[(b, d)] += 1
for k in TGT:
    print(k, 'hot deck', [hot_d[(k, d)] for d in ('2026-10-18', '2026-10-19', '2026-10-20')], 'hot platform-polygons', [hot_p[(k, d)] for d in ('2026-10-18', '2026-10-19', '2026-10-20')])
print('reassignments (deck_prov, platform_prov): count, 18-20 Oct, M+N+N20:', moves.most_common(20))
