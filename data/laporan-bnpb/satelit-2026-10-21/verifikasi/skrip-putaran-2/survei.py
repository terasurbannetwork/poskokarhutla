import csv, glob, os, collections
RAW = "/private/tmp/claude-501/-Users-alfatehanseptianta-Documents-GitHub-poskokarhutla/519b7abb-b696-465e-bd1c-bcbbfb8815f9/scratchpad/raw/"
allrows = collections.Counter()
for f in sorted(glob.glob(RAW + "*.csv")):
    c = collections.Counter(); d = collections.Counter(); conf = collections.Counter(); n = 0
    for r in csv.DictReader(open(f)):
        n += 1
        c[r["satellite"]] += 1; d[r["acq_date"]] += 1; conf[r["confidence"] if not r["confidence"].isdigit() else "num"] += 1
        allrows[(r["latitude"], r["longitude"], r["acq_date"], r["acq_time"], r["satellite"])] += 1
    print(os.path.basename(f), n, dict(c), dict(d), dict(conf))
print("dup keys:", sum(1 for v in allrows.values() if v > 1))
