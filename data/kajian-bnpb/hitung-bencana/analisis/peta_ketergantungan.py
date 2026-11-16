"""Peta ketergantungan paradoks dari baris "Bergantung pada" dan "Menentukan" di naskah/lampiran-a-*.md.

Tepi a -> b berarti jawaban a menentukan jawaban b. Peringkat hulu = PageRank pada graf terbalik
(faktor redaman 0,85; 60 iterasi; simpul tanpa sumber menyebar rata). Keluaran: hasil/peta_ketergantungan.json.
Pakai: python peta_ketergantungan.py
"""
import re, glob, json, collections, os
SINI = os.path.dirname(os.path.abspath(__file__))
P = {}
for f in sorted(glob.glob(os.path.join(SINI, '..', 'naskah', 'lampiran-a-*.md'))):
    t = open(f, encoding='utf-8').read()
    for blk in re.split(r'\n(?=### P-\d\d)', t)[1:]:
        kode = blk[4:8]
        b = re.search(r'Bergantung pada:\**\s*(.*?)(?:\.\s*\*\*|\n)', blk)
        m = re.search(r'Menentukan:\**\s*(.*?)\n', blk)
        P[kode] = (set(re.findall(r'P-\d\d', b.group(1) if b else '')), set(re.findall(r'P-\d\d', m.group(1) if m else '')))
E = set()
for k, (bp, mn) in P.items():
    E |= {(x, k) for x in bp} | {(k, x) for x in mn}
E = sorted(e for e in E if e[0] != e[1])
out = collections.Counter(a for a, b in E); inn = collections.Counter(b for a, b in E)
nodes = sorted(set(P) | set(out) | set(inn))
rev = collections.defaultdict(list)
for a, b in E: rev[b].append(a)
pr = {n: 1 / len(nodes) for n in nodes}
for _ in range(60):
    new = {n: 0.15 / len(nodes) for n in nodes}
    for b in nodes:
        if rev[b]:
            for a in rev[b]: new[a] += 0.85 * pr[b] / len(rev[b])
        else:
            for n in nodes: new[n] += 0.85 * pr[b] / len(nodes)
    pr = new
json.dump({'paradoks': len(P), 'tepi': E, 'keluar': out, 'masuk': inn, 'pagerank': pr}, open(os.path.join(SINI, 'hasil', 'peta_ketergantungan.json'), 'w'), indent=0)
for n in sorted(nodes, key=lambda n: -pr[n])[:8]:
    print(n, out[n], round(pr[n] * 100, 1))
print('paradoks', len(P), 'tepi', len(E))
