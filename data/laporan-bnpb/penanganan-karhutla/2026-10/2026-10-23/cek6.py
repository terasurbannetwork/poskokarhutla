"""Cek slide tabel 6 provinsi: tiap angka, panah, dan baris jumlah cocok dengan angka.json (pembulatan sekali, panah dari angka tampil)."""
import json, math, re, zipfile, sys
A = json.load(open('angka.json'))['prov']
bul = lambda v: int(math.floor(v + .5)); f0 = lambda v: f"{bul(v):,}".replace(',', '.')
LX = {'hot': [4663440, 5372913, 6082386], 'luas': [6974738, 7684211, 8393684], 'belum': [9286037, 9995510, 10704982]}
NAS = json.load(open('angka_nasional.json'))['prov']; P6 = sorted(NAS, key=lambda k: -NAS[k]['hot'][3])[:6]; T0, PB = 2167128, 518160
s = zipfile.ZipFile(sys.argv[1]).read('ppt/slides/slide1.xml').decode()
sh = []
for b in re.findall(r'<p:sp>.*?</p:sp>', s, re.S):
    o = re.search(r'<a:off x="(\d+)" y="(\d+)"/><a:ext cx="(\d+)" cy="(\d+)"/>', b)
    if o: sh.append((tuple(map(int, o.groups())), ''.join(re.findall(r'<a:t>([^<]*)</a:t>', b))))
ok = bad = 0
for i, k in enumerate(P6):
    for g, xs in LX.items():
        for j, x in enumerate(xs):
            v, p = bul(A[k][g][j + 1]), bul(A[k][g][j])
            lab = [t for (gx, gy, cx, cy), t in sh if gx == x and cy == 164592 and T0 + i * PB <= gy < T0 + (i + 1) * PB]
            arr = [t for (gx, gy, cx, cy), t in sh if gx == x and cy == 128016 and T0 + i * PB <= gy < T0 + (i + 1) * PB]
            q = None if not p else bul((v - p) / p * 100)
            ea = '' if q is None and v else '0%' if not q else (f'▲{f0(q)}%' if q > 0 else f'▼{f0(-q)}%')
            if lab == [f0(v)] and arr == [ea]: ok += 1
            else: bad += 1; print('BEDA', k, g, j, lab, arr, f0(v), ea)
tot = [t for (gx, gy, cx, cy), t in sh if gy == 5330952 and cy == 384048 and gx in sum(LX.values(), [])]
exp = [f0(sum(bul(A[k][g][j + 1]) for k in P6)) for g in LX for j in range(3)]
print('sel ok', ok, 'beda', bad, '| jumlah', 'cocok' if tot == exp else f'BEDA {tot} vs {exp}')
