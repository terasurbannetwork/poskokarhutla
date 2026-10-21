"""Independent re-implementation of SPEC v3. Writes verif3/ulang.json."""
import csv, glob, json, sys, os, collections, statistics
from datetime import datetime, timedelta, date
sys.path.insert(0, "/Users/alfatehanseptianta/Documents/GitHub/poskokarhutla/scripts/data")
from wilayah import Wilayah

S = "/private/tmp/claude-501/-Users-alfatehanseptianta-Documents-GitHub-poskokarhutla/519b7abb-b696-465e-bd1c-bcbbfb8815f9/scratchpad/"
RAW = S + "raw/"
CUT = datetime(2026, 10, 21, 7, 0)
PROV = ["62", "16", "63", "15", "61", "93", "72", "64"]
DAYS = [date(2026, 10, d) for d in (16, 17, 18, 19, 20)]
G = 0.003375
W = Wilayah()
memo = {}
def prov(lon, lat):
    k = (lon, lat)
    if k not in memo:
        r = W.cari(lon, lat)
        memo[k] = r[0] if r else None
    return memo[k]

pts = []  # (sat, conf, wib_dt, lon, lat)
for f in glob.glob(RAW + "*.csv"):
    for r in csv.DictReader(open(f)):
        t = datetime.strptime(r["acq_date"] + r["acq_time"].zfill(4), "%Y-%m-%d%H%M") + timedelta(hours=7)
        if t >= CUT:
            continue
        pts.append((r["satellite"], r["confidence"], t, float(r["longitude"]), float(r["latitude"])))

viirs_nh = [p for p in pts if p[0] in ("N", "N20", "N21") and p[1] in ("n", "h")]
cell = lambda p: (round(p[3] / G), round(p[4] / G))
det = collections.defaultdict(list)
for p in viirs_nh:
    det[cell(p)].append(p[2])
cells_day = collections.defaultdict(set)
for p in viirs_nh:
    cells_day[p[2].date()].add(cell(p))

def nb(c):
    return [(c[0] + i, c[1] + j) for i in (-1, 0, 1) for j in (-1, 0, 1)]

def bertahan(p):
    t = p[2]; lo, hi = t - timedelta(hours=36), t - timedelta(hours=12)
    return any(lo <= x <= hi for c in nb(cell(p)) for x in det.get(c, ()))

def padam_ok(p, d_next):
    s = cells_day[d_next]
    return not any(c in s for c in nb(cell(p)))

# porsi
rat = []
for d in DAYS[:4]:
    nN = sum(1 for p in viirs_nh if p[0] == "N" and p[2].date() == d and prov(p[3], p[4]))
    nJ = sum(1 for p in viirs_nh if p[0] in ("N20", "N21") and p[2].date() == d and prov(p[3], p[4]))
    rat.append(nN / nJ); print("porsi", d, nN, nJ, nN / nJ)
porsi = statistics.median(rat)
print("porsi median", porsi)

def clusters(cs):
    cs = list(cs); par = list(range(len(cs)))
    def f(i):
        while par[i] != i:
            par[i] = par[par[i]]; i = par[i]
        return i
    for i in range(len(cs)):
        for j in range(i + 1, len(cs)):
            if max(abs(cs[i][0] - cs[j][0]), abs(cs[i][1] - cs[j][1])) <= 4:
                par[f(i)] = f(j)
    return len({f(i) for i in range(len(cs))})

out = {"porsi": porsi, "prov": {}}
for k in PROV:
    R = {"hot": [], "luas": [], "belum": [], "padam": [], "fs": [], "nJ": [], "nN": [], "nM": [], "nN20": []}
    luas = {}
    jd = {}
    for d in DAYS:
        J = [p for p in viirs_nh if p[0] in ("N20", "N21") and p[2].date() == d and prov(p[3], p[4]) == k]
        jd[d] = J
        luas[d] = len(J) * porsi * 4.3
    for i, d in enumerate(DAYS[1:], 1):
        J = jd[d]; prev = DAYS[i - 1]
        R["hot"].append(sum(1 for p in pts if p[0] in ("N", "N20", "Terra", "Aqua") and p[2].date() == d and prov(p[3], p[4]) == k))
        R["nN"].append(sum(1 for p in pts if p[0] == "N" and p[2].date() == d and prov(p[3], p[4]) == k))
        R["nN20"].append(sum(1 for p in pts if p[0] == "N20" and p[2].date() == d and prov(p[3], p[4]) == k))
        R["nM"].append(sum(1 for p in pts if p[0] in ("Terra", "Aqua") and p[2].date() == d and prov(p[3], p[4]) == k))
        R["luas"].append(luas[d]); R["nJ"].append(len(J))
        R["belum"].append(luas[d] * (sum(map(bertahan, J)) / len(J)) if J else 0.0)
        Jp = jd[prev]
        R["padam"].append(luas[prev] * (sum(padam_ok(p, d) for p in Jp) / len(Jp)) if Jp else 0.0)
        V = [p for p in viirs_nh if p[2].date() == d and prov(p[3], p[4]) == k and bertahan(p)]
        R["fs"].append(clusters({cell(p) for p in V}))
    out["prov"][k] = R
json.dump(out, open(S + "verif3/ulang.json", "w"), indent=1, default=str)
print("done")
