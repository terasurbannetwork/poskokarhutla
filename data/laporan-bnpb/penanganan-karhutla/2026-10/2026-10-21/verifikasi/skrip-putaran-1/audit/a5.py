"""Sensitivity of 19->20 Oct arrows to the missing S-NPP daytime pass on 20 Oct, plus padam/belum base consistency."""
import csv, glob, sys, json
from collections import defaultdict
from datetime import datetime, timedelta, date
SP = sys.argv[1]
src = open(SP + '/hitung.py').read().split('CUT = ')[0].replace(
    "RAW, GEO, OUT = sys.argv[1], sys.argv[2], sys.argv[3]",
    "RAW,GEO,OUT='x','/Users/alfatehanseptianta/Documents/GitHub/poskokarhutla/public/geo/provinsi.json',None")
ns = {}; exec(src, ns); prov = ns['prov']; TGT = ns['TGT']
G = 0.003375
cells = defaultdict(set); cells_noN = defaultdict(set); P = defaultdict(list); hotx = defaultdict(int)
for fn in glob.glob(SP + '/raw/*.csv'):
    for r in csv.DictReader(open(fn)):
        t = datetime.strptime(r['acq_date'] + r['acq_time'].zfill(4), '%Y-%m-%d%H%M')
        if t >= datetime(2026, 10, 21): continue
        d = (t + timedelta(hours=7)).date().isoformat()
        x, y = float(r['longitude']), float(r['latitude']); s = r['satellite']
        k = prov(x, y)
        if s in ('N20', 'Terra', 'Aqua') and k: hotx[(k, d)] += 1   # hot without S-NPP
        if s in ('N', 'N20', 'N21') and r['confidence'] in ('n', 'h'):
            c = (round(x / G), round(y / G)); cells[d].add(c)
            if s != 'N': cells_noN[d].add(c)
            if k and s in ('N', 'N20'): P[(k, d)].append((s, c))
near = lambda c, S: any((c[0] + i, c[1] + j) in S for i in (-1, 0, 1) for j in (-1, 0, 1))
spec = lambda L: (sum(1 for s, _ in L if s == 'N') + 0.978 * sum(1 for s, _ in L if s == 'N20')) / 2 * 4.3
n20 = lambda L: 0.978 * sum(1 for s, _ in L if s == 'N20') * 4.3
pct = lambda a, b: round((a - b) / b * 100) if b else None
A = json.load(open(SP + '/angka.json'))['prov']
print('prov | deck luas 19->20 | N20-only luas 19->20 | deck belum 19->20 | N20-only belum (vs cells w/o S-NPP) | hot deck | hot w/o S-NPP')
for k in TGT:
    l19, l20 = n20(P[(k, '2026-10-19')]), n20(P[(k, '2026-10-20')])
    b19 = n20([t for t in P[(k, '2026-10-19')] if near(t[1], cells_noN['2026-10-18'])])
    b20 = n20([t for t in P[(k, '2026-10-20')] if near(t[1], cells_noN['2026-10-19'])])
    print(k, f"luas {A[k]['luas'][2]:.0f}->{A[k]['luas'][3]:.0f} ({pct(A[k]['luas'][3], A[k]['luas'][2])}%) | {l19:.0f}->{l20:.0f} ({pct(l20, l19)}%)",
          f"| belum {A[k]['belum'][2]:.0f}->{A[k]['belum'][3]:.0f} ({pct(A[k]['belum'][3], A[k]['belum'][2])}%) | {b19:.0f}->{b20:.0f} ({pct(b20, b19)}%)",
          f"| hot {A[k]['hot'][2]}->{A[k]['hot'][3]} ({pct(A[k]['hot'][3], A[k]['hot'][2])}%) | {hotx[(k,'2026-10-19')]}->{hotx[(k,'2026-10-20')]} ({pct(hotx[(k,'2026-10-20')], hotx[(k,'2026-10-19')])}%)")
# subtitle base consistency: padam(20) is measured on 19-Oct points; its complement on the same base
P5 = ['62', '16', '63', '15', '61']
pad = sum(spec([t for t in P[(k, '2026-10-19')] if not near(t[1], cells['2026-10-20'])]) for k in P5)
stay = sum(spec([t for t in P[(k, '2026-10-19')] if near(t[1], cells['2026-10-20'])]) for k in P5)
bel = sum(spec([t for t in P[(k, '2026-10-20')] if near(t[1], cells['2026-10-19'])]) for k in P5)
l19 = sum(spec(P[(k, '2026-10-19')]) for k in P5)
print(f'5-prov: padam20 {pad:.1f}, 19-Oct points still seen on 20 {stay:.1f}, sum {pad+stay:.1f} == luas19 {l19:.1f}; belum20 (20-Oct points) {bel:.1f}')
print(f'deck Q = P/(P+B) = {pad/(pad+bel)*100:.1f}%; same-base share P/luas19 = {pad/l19*100:.1f}%')
# padam if the missing S-NPP pass were irrelevant: re-test 19-Oct points against cells[20] built without S-NPP at all
pad_noN = sum(spec([t for t in P[(k, '2026-10-19')] if not near(t[1], cells_noN['2026-10-20'])]) for k in P5)
print(f'padam20 using cells[20] without any S-NPP: {pad_noN:.1f} (S-NPP night pass alone removes {pad_noN-pad:.1f} ha from padam)')
# hours since last detection at cut-off for 19-Oct points (platform: active until 72 h / 168 h)
print('max age at cut-off of a 19 Oct WIB detection:', (datetime(2026, 10, 21, 7) - datetime(2026, 10, 19, 0)).total_seconds() / 3600, 'h')
