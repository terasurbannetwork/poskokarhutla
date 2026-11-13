"""Gap sensitivity: belum window overlap, padam/fs with vs without N daytime on day d, hot estimators."""
import csv, glob, sys, collections, statistics
from datetime import datetime, timedelta, date
sys.path.insert(0, "/Users/alfatehanseptianta/Documents/GitHub/poskokarhutla/scripts/data")
from wilayah import Wilayah
S = "/private/tmp/claude-501/-Users-alfatehanseptianta-Documents-GitHub-poskokarhutla/519b7abb-b696-465e-bd1c-bcbbfb8815f9/scratchpad/"
CUT = datetime(2026, 10, 21, 7, 0); G = 0.003375; PORSI = 0.5337924177818518
PROV = ["62", "16", "63", "15", "61", "93", "72", "64"]
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
V = [p for p in pts if p[0] in ("N", "N20", "N21") and p[1] in ("n", "h")]
cell = lambda p: (round(p[3] / G), round(p[4] / G))
nb = lambda c: [(c[0] + i, c[1] + j) for i in (-1, 0, 1) for j in (-1, 0, 1)]
det = collections.defaultdict(list)
for p in V:
    det[cell(p)].append(p[2])
def bert(p):
    lo, hi = p[2] - timedelta(hours=36), p[2] - timedelta(hours=12)
    return any(lo <= x <= hi for c in nb(cell(p)) for x in det.get(c, ()))

# A) belum(20): does any day-20 N20/N21 window reach the gap (WIB 20 11:00-15:00)?
J20 = [p for p in V if p[0] in ("N20", "N21") and p[2].date() == date(2026, 10, 20) and prov(p[3], p[4]) in PROV]
gap_lo = datetime(2026, 10, 20, 11, 0)
late = [p for p in J20 if p[2] - timedelta(hours=12) >= gap_lo]
print("A) day-20 N20/N21 pts in 8 prov:", len(J20), "| windows reaching >= 20 Oct 11:00 WIB:", len(late),
      "| max t-12h:", max(p[2] for p in J20) - timedelta(hours=12))
# B) padam / fs: all VIIRS vs excluding N daytime on day d
def is_ND(p): return p[0] == "N" and p[5] == "D"
cells = {k: collections.defaultdict(set) for k in ("all", "noND")}
for p in V:
    cells["all"][p[2].date()].add(cell(p))
    if not is_ND(p):
        cells["noND"][p[2].date()].add(cell(p))
def clusters(cs):
    cs = list(cs); par = list(range(len(cs)))
    def f(i):
        while par[i] != i: par[i] = par[par[i]]; i = par[i]
        return i
    for i in range(len(cs)):
        for j in range(i + 1, len(cs)):
            if max(abs(cs[i][0] - cs[j][0]), abs(cs[i][1] - cs[j][1])) <= 4: par[f(i)] = f(j)
    return len({f(i) for i in range(len(cs))})
print("B) padam(d): spec (day-d cells all VIIRS) vs day-d cells without S-NPP daytime; fs(d) same")
tot = collections.defaultdict(lambda: [0, 0, 0, 0])
for k in PROV:
    row = []
    for d in (17, 18, 19, 20):
        dd, dp = date(2026, 10, d), date(2026, 10, d - 1)
        Jp = [p for p in V if p[0] in ("N20", "N21") and p[2].date() == dp and prov(p[3], p[4]) == k]
        L = len(Jp) * PORSI * 4.3
        pa = L * sum(not any(c in cells["all"][dd] for c in nb(cell(p))) for p in Jp) / len(Jp)
        pb = L * sum(not any(c in cells["noND"][dd] for c in nb(cell(p))) for p in Jp) / len(Jp)
        Vd = [p for p in V if p[2].date() == dd and prov(p[3], p[4]) == k and bert(p)]
        fa = clusters({cell(p) for p in Vd}); fb = clusters({cell(p) for p in Vd if not is_ND(p)})
        t = tot[d]; t[0] += round(pa); t[1] += round(pb); t[2] += fa; t[3] += fb
        row.append(f"{d}: padam {pa:.0f}->{pb:.0f} ({(pb / pa - 1) * 100 if pa else 0:+.0f}%) fs {fa}->{fb}")
    print(k, " | ".join(row))
for d in (17, 18, 19, 20):
    t = tot[d]; print(f"  8-prov {d}: padam {t[0]} -> {t[1]} ({(t[1] / t[0] - 1) * 100:+.0f}%), fs {t[2]} -> {t[3]} ({(t[3] / t[2] - 1) * 100:+.0f}%)")
# C) hot: estimators of missing N daytime on 20 Oct
cnt = collections.Counter()
for p in pts:
    k = prov(p[3], p[4])
    if k:
        cnt[(k, p[2].date().day, p[0], p[5])] += 1
        cnt[("ID", p[2].date().day, p[0], p[5])] += 1
n = lambda k, d, s, dn=("D", "N"): sum(cnt[(k, d, x, y)] for x in s for y in dn)
rnat = sum(n("ID", d, ["N"], ("D",)) for d in (17, 18, 19)) / sum(n("ID", d, ["N20", "N21"], ("D",)) for d in (17, 18, 19))
print(f"C) national 17-19 N_day/(N20+N21)_day = {rnat:.3f}")
print("prov | hot 17..20 | (N20+MODIS) 17..20 | hot/(N20+MODIS) 17,18,19 -> 20 | est missing N_day: prov-ratio / nat-ratio / hot-ratio")
T = [0, 0, 0, 0]
for k in PROV:
    hot = [n(k, d, ["N", "N20", "Terra", "Aqua"]) for d in (17, 18, 19, 20)]
    base = [n(k, d, ["N20", "Terra", "Aqua"]) for d in (17, 18, 19, 20)]
    r = [h / b for h, b in zip(hot, base)]
    pr = sum(n(k, d, ["N"], ("D",)) for d in (17, 18, 19)) / max(1, sum(n(k, d, ["N20", "N21"], ("D",)) for d in (17, 18, 19)))
    j20 = n(k, 20, ["N20", "N21"], ("D",))
    e1 = pr * j20 - n(k, 20, ["N"], ("D",)); e2 = rnat * j20 - n(k, 20, ["N"], ("D",))
    e3 = statistics.median(r[:3]) * base[3] - hot[3]
    T[0] += hot[3]; T[1] += e1; T[2] += e2; T[3] += e3
    print(k, hot, base, [round(x, 2) for x in r], f"| {e1:.0f} ({e1 / hot[3] * 100:.0f}%) / {e2:.0f} ({e2 / hot[3] * 100:.0f}%) / {e3:.0f} ({e3 / hot[3] * 100:.0f}%)")
print(f"8-prov hot20 {T[0]}: missing ~{T[1]:.0f} / {T[2]:.0f} / {T[3]:.0f}  ({T[1] / T[0] * 100:.0f}% / {T[2] / T[0] * 100:.0f}% / {T[3] / T[0] * 100:.0f}%)")
