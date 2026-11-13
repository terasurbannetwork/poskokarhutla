"""Titik panas Papua Selatan 24-29 Okt 2026 (hari WIB) untuk peta, dari web/hotspot.json situs (lokasi unik ~375 m per hari WIB, kolom
'hitung' = 1). hotspot.json hanya menyimpan sekitar 7 x 24 jam terakhir (23 Okt terpotong saat ditarik), jadi peta mulai 24 Okt; angka 22-23 Okt
tetap ada di angka.json. Jumlah per hari diassert sama dengan harian30.json (tabel situs; beda 0-6 titik per hari dengan peta_karhutla.json).
Keluaran: titik.json."""
import json
from collections import Counter

H = json.load(open('web/hotspot.json')); A = json.load(open('angka.json')); H30 = json.load(open('web/harian30.json'))
K = {n: i for i, n in enumerate(H['kolom'])}
HARI = A['HARI'][2:]
out = []
for r in H['baris']:
    w = H['wilayah'][r[K['wilayah']]]
    d = '2026-' + r[K['tgl_wib']]
    if not w.startswith('93|') or d not in HARI or not r[K['hitung']]: continue
    _, kab, kec = w.split('|')
    out.append({'lat': r[K['lat']], 'lon': r[K['lon']], 'w': d, 's': r[K['sensor']], 'kab': kab, 'kec': kec})
json.dump({'hot': out}, open('titik.json', 'w'))
per = Counter(p['w'] for p in out)
h30 = [H30['prov']['93'][H30['hari'].index(d)] for d in HARI]
assert [per[d] for d in HARI] == h30, ([per[d] for d in HARI], h30)
print('per hari', sorted(per.items()))
