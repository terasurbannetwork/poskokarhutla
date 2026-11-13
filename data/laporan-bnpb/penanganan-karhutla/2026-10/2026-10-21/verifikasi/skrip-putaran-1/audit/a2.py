"""Per-sensor, per-WIB-day, per-UTC-hour coverage of n/h VIIRS and MODIS rows (Indonesia bbox)."""
import csv, glob, sys
from collections import Counter, defaultdict
from datetime import datetime, timedelta
SP = sys.argv[1]
h = defaultdict(Counter); day = defaultdict(Counter); night = defaultdict(Counter)
for fn in sorted(glob.glob(SP + '/raw/*.csv')):
    for r in csv.DictReader(open(fn)):
        t = datetime.strptime(r['acq_date'] + r['acq_time'].zfill(4), '%Y-%m-%d%H%M')
        w = t + timedelta(hours=7)
        if r['satellite'] in ('N', 'N20', 'N21') and r['confidence'] not in ('n', 'h'): continue
        s = r['satellite']
        if datetime(2026, 10, 18, 0) <= t < datetime(2026, 10, 21, 3):
            h[s][t.strftime('%d %H')] += 1
        day[s][(w.date().isoformat(), r['daynight'])] += 1
for s in ('N', 'N20', 'N21', 'Terra', 'Aqua'):
    print(s, 'WIB-day x D/N:', sorted(day[s].items()))
for s in ('N', 'N20', 'N21'):
    print(s, 'UTC hours:', sorted(h[s].items()))
