"""CSV FIRMS 7 hari publik -> bentuk API yang dibaca hitung_nasional.py. Pakai: python3 -I normalkan.py raw7 raw2"""
import csv, glob, os, sys
C = {'nominal': 'n', 'high': 'h', 'low': 'l'}; S = {'T': 'Terra', 'A': 'Aqua'}
os.makedirs(sys.argv[2], exist_ok=True)
for fn in glob.glob(sys.argv[1] + '/*.csv'):
    rows = list(csv.DictReader(open(fn)))
    for r in rows: r['confidence'] = C.get(r['confidence'], r['confidence']); r['satellite'] = S.get(r['satellite'], r['satellite'])
    w = csv.DictWriter(open(os.path.join(sys.argv[2], os.path.basename(fn)), 'w'), fieldnames=list(rows[0])); w.writeheader(); w.writerows(rows)
