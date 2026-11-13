import csv, glob, json, os, collections, zipfile, re, sys
sys.path.insert(0, os.path.dirname(__file__))
S = '/private/tmp/claude-501/-Users-alfatehanseptianta-Documents-GitHub-poskokarhutla/519b7abb-b696-465e-bd1c-bcbbfb8815f9/scratchpad'
mine = json.load(open(S + '/verif/mine.json'))
ref = json.load(open(S + '/angka.json'))['prov']
P8 = ['62', '16', '63', '15', '61', '93', '72', '64']
n = eq = 0; maxd = 0
for p in P8:
    for k in ('hot', 'luas', 'belum', 'padam', 'fs'):
        for a, b in zip(ref[p][k], mine[p][k]):
            n += 1; eq += (abs(a - b) < 1e-6); maxd = max(maxd, abs(a - b))
print('values compared', n, 'exactly equal', eq, 'max abs diff', maxd)

# same lat/lon rows
rows = collections.defaultdict(list)
for f in sorted(glob.glob(S + '/raw/*.csv')):
    for r in csv.DictReader(open(f)):
        rows[(r['latitude'], r['longitude'])].append((os.path.basename(f), r['satellite'], r['acq_date'], r['acq_time'], r['confidence']))
for k, v in rows.items():
    if len(v) > 1:
        print('same latlon', k, v)

# expected display numbers from MY values (idx 1..3 = 18..20)
S1 = ['62', '16', '63', '15', '61']
Pv = sum(round(mine[p]['padam'][3]) for p in S1)
Bv = sum(round(mine[p]['belum'][3]) for p in S1)
Q = round(Pv / (Pv + Bv) * 100)
X = sum(round(mine[p]['belum'][3]) for p in P8)
pills = [sum(mine[p]['fs'][i] for p in P8) for i in (1, 2, 3)]
print('subtitle1 P=%d B=%d P+B=%d Q=%d ; subtitle2 X=%d ; fs pills 18/19/20=%s' % (Pv, Bv, Pv + Bv, Q, X, pills))
for k in ('hot', 'luas', 'belum', 'fs'):
    for grp, nm in ((S1, 'slide1'), (P8[5:], 'slide2')):
        print(nm, k, 'totals 18/19/20 =', [sum(round(mine[p][k][i]) for p in grp) for i in (1, 2, 3)])

pp = '/Users/alfatehanseptianta/Downloads/Laporan Penanganan Pengendalian Karhutla 211026 data satelit.pptx'
z = zipfile.ZipFile(pp)
for sl in ('ppt/slides/slide1.xml', 'ppt/slides/slide2.xml'):
    t = re.findall(r'<a:t>([^<]*)</a:t>', z.read(sl).decode('utf8'))
    print('\n==', sl, '\n' + ' | '.join(x for x in t if x.strip()))
