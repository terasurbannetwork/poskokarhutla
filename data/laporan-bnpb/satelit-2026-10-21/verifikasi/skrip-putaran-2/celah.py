"""S-NPP 20 Oct gap: when is it, and how much does it touch hot/padam/fs/belum."""
import csv, glob, sys, collections
from datetime import datetime, timedelta, date
sys.path.insert(0, "/Users/alfatehanseptianta/Documents/GitHub/poskokarhutla/scripts/data")
from wilayah import Wilayah
S = "/private/tmp/claude-501/-Users-alfatehanseptianta-Documents-GitHub-poskokarhutla/519b7abb-b696-465e-bd1c-bcbbfb8815f9/scratchpad/"
CUT = datetime(2026, 10, 21, 7, 0); G = 0.003375
W = Wilayah(); memo = {}
def prov(lon, lat):
    k = (lon, lat)
    if k not in memo:
        r = W.cari(lon, lat); memo[k] = r[0] if r else None
    return memo[k]
pts = []
for f in glob.glob(S + "raw/*.csv"):
    for r in csv.DictReader(open(f)):
        t = datetime.strptime(r["acq_date"] + r["acq_time"].zfill(4), "%Y-%m-%d%H%M") + timedelta(hours=7)
        if t < CUT:
            pts.append((r["satellite"], r["confidence"], t, float(r["longitude"]), float(r["latitude"]), r["daynight"]))
# 1) WIB-day x day/night counts per satellite, Indonesia land, all conf
print("== national (land) counts by WIB day, sat, D/N (all conf) ==")
c = collections.Counter()
for p in pts:
    if prov(p[3], p[4]):
        c[(p[2].date().day, p[0], p[5])] += 1
for d in range(16, 21):
    print(d, {s: (c[(d, s, 'D')], c[(d, s, 'N')]) for s in ("N", "N20", "N21", "Terra", "Aqua")})
# 2) S-NPP UTC hour histogram, UTC 18..20
print("== S-NPP land detections by UTC date/hour ==")
h = collections.Counter()
for p in pts:
    if p[0] == "N" and prov(p[3], p[4]):
        u = p[2] - timedelta(hours=7); h[(u.date().day, u.hour)] += 1
for d in (17, 18, 19, 20):
    print(d, {hr: h[(d, hr)] for hr in range(24) if h[(d, hr)]})
# 3) hot per province: actual vs N-expected from N/N20 ratio on 17-19
PROV = ["62", "16", "63", "15", "61", "93", "72", "64"]
cnt = collections.Counter()
for p in pts:
    k = prov(p[3], p[4])
    if k in PROV:
        cnt[(k, p[2].date().day, p[0], p[5])] += 1
def n(k, d, sats, dn=("D", "N")):
    return sum(cnt[(k, d, s, x)] for s in sats for x in dn)
print("== hot 20 Oct per province: N day/night share vs 17-19 ==")
print("prov | N_D/N20_D 17,18,19 | 20 | N_N/N20_N 17-19 | 20 | hot20 | N20 | N_exp(ratio) | hot20_adj | shortfall")
tot = [0, 0]
for k in PROV:
    rD = [n(k, d, ["N"], ("D",)) / max(1, n(k, d, ["N20"], ("D",))) for d in (17, 18, 19)]
    rN = [n(k, d, ["N"], ("N",)) / max(1, n(k, d, ["N20"], ("N",))) for d in (17, 18, 19)]
    # pooled ratio over 17-19 day/night separately
    pD = sum(n(k, d, ["N"], ("D",)) for d in (17, 18, 19)) / max(1, sum(n(k, d, ["N20"], ("D",)) for d in (17, 18, 19)))
    hot = n(k, 20, ["N", "N20", "Terra", "Aqua"])
    nD20 = n(k, 20, ["N"], ("D",)); n20D = n(k, 20, ["N20"], ("D",))
    expD = pD * n20D
    short = expD - nD20
    tot[0] += hot; tot[1] += short
    print(k, [round(x, 2) for x in rD], round(nD20 / max(1, n20D), 2), [round(x, 2) for x in rN],
          round(n(k, 20, ["N"], ("N",)) / max(1, n(k, 20, ["N20"], ("N",))), 2),
          hot, n(k, 20, ["N20"]), round(expD), round(hot + short), f"{short:.0f} ({short / hot * 100:.0f}%)")
print("8-prov hot20", tot[0], "est. missing N daytime", round(tot[1]))
# 4) N share in hot for 17-19 and 20
for k in PROV:
    print(k, "N share of hot:", [round(n(k, d, ["N"]) / max(1, n(k, d, ["N", "N20", "Terra", "Aqua"])) * 100) for d in (17, 18, 19, 20)], "%")
