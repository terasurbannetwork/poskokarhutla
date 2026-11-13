"""Was the S-NPP 04:0x UTC Papua pass on 20 Oct complete over prov 93? count + scan geometry per day."""
import csv, sys, statistics
sys.path.insert(0, "/Users/alfatehanseptianta/Documents/GitHub/poskokarhutla/scripts/data")
from wilayah import Wilayah
S = "/private/tmp/claude-501/-Users-alfatehanseptianta-Documents-GitHub-poskokarhutla/519b7abb-b696-465e-bd1c-bcbbfb8815f9/scratchpad/raw/"
W = Wilayah()
for d in (17, 18, 19, 20):
    for f, sat in ((f"VIIRS_SNPP_NRT-{d}.csv", "N"), (f"VIIRS_NOAA20_NRT-{d}.csv", "N20")):
        sc = []; tm = set()
        for r in csv.DictReader(open(S + f)):
            if r["daynight"] != "D": continue
            p = W.cari(float(r["longitude"]), float(r["latitude"]))
            if p and p[0] == "93":
                sc.append(float(r["scan"])); tm.add(r["acq_time"])
        print(d, sat, "93 daytime UTC-file pts:", len(sc), "median scan:", round(statistics.median(sc), 2) if sc else None, "times:", sorted(tm))
