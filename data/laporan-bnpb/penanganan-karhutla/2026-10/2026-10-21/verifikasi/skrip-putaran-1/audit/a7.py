"""Which day window reproduces the BNPB template's own HOTSPOT numbers? (external check of the hot definition)."""
import csv, glob, sys
from collections import defaultdict
from datetime import datetime, timedelta
SP = sys.argv[1]
sys.path.insert(0, '/Users/alfatehanseptianta/Documents/GitHub/poskokarhutla/scripts/data')
from wilayah import Wilayah
W = Wilayah()
BNPB = {'62': [7950, 4213, 2083], '16': [1392, 545, 1055], '63': [711, 1013, 896], '15': [43, 341, 77], '61': [836, 450, 14],
        '93': [2618, 2632, 2766], '72': [205, 429, 886], '64': [1077, 673, 728]}
win = {'cal': 0, '07-07 ending d': -17, '07-07 starting d': 7}   # shift in hours added to WIB time before taking date
cnt = {w: defaultdict(int) for w in win}
for fn in glob.glob(SP + '/raw/*.csv'):
    for r in csv.DictReader(open(fn)):
        if r['satellite'] not in ('N', 'N20', 'Terra', 'Aqua'): continue
        t = datetime.strptime(r['acq_date'] + r['acq_time'].zfill(4), '%Y-%m-%d%H%M') + timedelta(hours=7)
        w0 = W.cari(float(r['longitude']), float(r['latitude']))
        if not w0 or w0[0] not in BNPB: continue
        for name, sh in win.items():
            # cal: date(t); ending d: [d-1 07:00, d 07:00) -> date(t + 17h); starting d: [d 07:00, d+1 07:00) -> date(t - 7h)
            d = (t + timedelta(hours=17)).date() if sh == -17 else (t - timedelta(hours=7)).date() if sh == 7 else t.date()
            cnt[name][(w0[0], d.isoformat())] += 1
for k, v in BNPB.items():
    print(k, 'BNPB template', v, {n: [c[(k, d)] for d in ('2026-10-18', '2026-10-19', '2026-10-20')] for n, c in cnt.items()})
