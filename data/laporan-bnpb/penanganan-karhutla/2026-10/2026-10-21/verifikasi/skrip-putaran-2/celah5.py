"""Upper bound on belum(20) sensitivity: day-20 N20/N21 pts whose window reaches the 04:0x UTC S-NPP Papua pass and are NOT bertahan now."""
import csv, glob, sys, collections
from datetime import datetime, timedelta, date
sys.path.insert(0, "/Users/alfatehanseptianta/Documents/GitHub/poskokarhutla/scripts/data")
from wilayah import Wilayah
S = "/private/tmp/claude-501/-Users-alfatehanseptianta-Documents-GitHub-poskokarhutla/519b7abb-b696-465e-bd1c-bcbbfb8815f9/scratchpad/"
CUT = datetime(2026, 10, 21, 7, 0); G = 0.003375; PORSI = 0.5337924177818518
W = Wilayah(); memo = {}
def prov(lon, lat):
    k = (lon, lat)
    if k not in memo:
        r = W.cari(lon, lat); memo[k] = r[0] if r else None
    return memo[k]
V = []
for f in glob.glob(S + "raw/VIIRS*.csv"):
    for r in csv.DictReader(open(f)):
        t = datetime.strptime(r["acq_date"] + r["acq_time"].zfill(4), "%Y-%m-%d%H%M") + timedelta(hours=7)
        if t < CUT and r["confidence"] in ("n", "h"):
            V.append((r["satellite"], t, float(r["longitude"]), float(r["latitude"])))
cell = lambda p: (round(p[2] / G), round(p[3] / G))
det = collections.defaultdict(list)
for p in V: det[cell(p)].append(p[1])
def bert(p):
    lo, hi = p[1] - timedelta(hours=36), p[1] - timedelta(hours=12)
    return any(lo <= x <= hi for i in (-1, 0, 1) for j in (-1, 0, 1) for x in det.get((cell(p)[0] + i, cell(p)[1] + j), ()))
J = [p for p in V if p[0] in ("N20", "N21") and p[1].date() == date(2026, 10, 20) and prov(p[2], p[3]) == "93"]
late = [p for p in J if p[1] - timedelta(hours=12) >= datetime(2026, 10, 20, 11, 0)]
nb = [p for p in late if not bert(p)]
L = len(J) * PORSI * 4.3
print("93 day-20 N20/N21 n/h:", len(J), "luas20", round(L), "| late-window pts", len(late), "of which not bertahan", len(nb),
      "| max belum(20) shift", round(len(nb) / len(J) * L), "ha")
