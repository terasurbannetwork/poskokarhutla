"""Exact timing of S-NPP daytime passes vs belum(20) look-back window end."""
import csv, collections, sys
from datetime import datetime, timedelta, date
sys.path.insert(0, "/Users/alfatehanseptianta/Documents/GitHub/poskokarhutla/scripts/data")
from wilayah import Wilayah
S = "/private/tmp/claude-501/-Users-alfatehanseptianta-Documents-GitHub-poskokarhutla/519b7abb-b696-465e-bd1c-bcbbfb8815f9/scratchpad/raw/"
W = Wilayah()
for d in (17, 18, 19, 20):
    g = collections.defaultdict(list)
    for r in csv.DictReader(open(f"{S}VIIRS_SNPP_NRT-{d}.csv")):
        if r["daynight"] == "D":
            g[r["acq_time"]].append(float(r["longitude"]))
    print(d, "S-NPP day granules (UTC hhmm: n, lon range):",
          {k: (len(v), round(min(v)), round(max(v))) for k, v in sorted(g.items())})
for sat, f in (("N20", "VIIRS_NOAA20_NRT-20.csv"), ("N21", "VIIRS_NOAA21_NRT-20.csv")):
    g = collections.defaultdict(list)
    for r in csv.DictReader(open(S + f)):
        g[r["acq_time"][:2]].append(float(r["longitude"]))
    print(sat, "UTC20 by hour (n, lon range):", {k: (len(v), round(min(v)), round(max(v))) for k, v in sorted(g.items())})
# day-20 N20/N21 points whose window end (t-12h) >= 20 Oct 04:00 UTC: where/when
late = collections.Counter()
for f in ("VIIRS_NOAA20_NRT-20.csv", "VIIRS_NOAA21_NRT-20.csv"):
    for r in csv.DictReader(open(S + f)):
        if r["confidence"] not in ("n", "h"): continue
        t = datetime.strptime(r["acq_date"] + r["acq_time"].zfill(4), "%Y-%m-%d%H%M")
        if t + timedelta(hours=7) < datetime(2026, 10, 21) and t - timedelta(hours=12) >= datetime(2026, 10, 20, 4, 0):
            p = W.cari(float(r["longitude"]), float(r["latitude"]))
            late[(r["satellite"], r["acq_time"], p[0] if p else None)] += 1
print("late-window pts (sat, UTC time, prov): n ->", dict(late))
