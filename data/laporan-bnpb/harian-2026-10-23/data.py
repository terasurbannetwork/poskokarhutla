"""Angka Laporan Kejadian Bencana Harian 22-23 Okt 2026 (format 221026). Karhutla = data kita persis seperti website centurisk97.id
(berkas live di web/): titik panas 22 Okt dari harian30.json (tabel Real Time, titik industri dibuang), sisa belum padam 22 Okt dan luas
terbakar 1 Jan-22 Okt (jumlah luas harian) dari peta_karhutla*.json (lapisan Luas terbakar / Belum padam).
Kejadian dan status dari isian Koordalops: data/laporan-bnpb/harian-2026-10-23.json. Keluaran data.json."""
import json
W = 'web/'; ISIAN = '/Users/alfatehanseptianta/Documents/GitHub/poskokarhutla/data/laporan-bnpb/harian-2026-10-23.json'
P = json.load(open(W + 'peta_karhutla.json')); K = json.load(open(W + 'peta_karhutla_kab.json')); WL = json.load(open(W + 'peta_karhutla_wil.json')); H = json.load(open(W + 'harian30.json'))
HARI = '2026-10-22'; i = P['hari'].index(HARI); j = H['hari'].index(HARI)
assert K['hari'] == P['hari'], 'kab dan prov dari jalan berbeda'
def prov(k):
    p = P['prov'][k]; return {'kum': sum(v or 0 for v in p['luas'][:i + 1]), 'sisa': p['belum'][i] or 0, 'hot': H['prov'].get(k, [0] * len(H['hari']))[j]}
def kab(key):
    d = K['kab'].get(key, {'d': []})['d']; return {'kum': sum(l for x, l, b in d if x <= i), 'sisa': next((b for x, l, b in d if x == i), 0), 'hot': H['kab'].get(key, [0] * len(H['hari']))[j]}
# kawasan Gunung Arjuno = kecamatan lereng Arjuno-Welirang (sama dengan kotak kawasan paparan Jatim 231026)
ARJ = ['35|Pasuruan|Prigen', '35|Pasuruan|Purwosari', '35|Malang|Singosari', '35|Malang|Lawang', '35|Malang|Karangploso', '35|Kota Batu|Bumiaji',
       '35|Mojokerto|Gondang', '35|Mojokerto|Pacet', '35|Mojokerto|Trawas', '35|Mojokerto|Jatirejo']
i0 = P['hari'].index(WL['hari0'])
def kec(keys):
    o = {'kum': 0, 'sisa': 0, 'hot': 0}
    for kk in keys:
        f = WL['d'].get(kk, [])   # kecamatan tanpa satu angka pun bukan nol tidak tertulis
        for n in range(0, len(f), 5):
            x, hot, l, b, _ = f[n:n + 5]; x += i0
            if x <= i: o['kum'] += l
            if x == i: o['sisa'] += b; o['hot'] += hot
    return o
KAB = {'Bangka Tengah': '19|Bangka Tengah', 'Sumedang': '32|Sumedang', 'Karanganyar': '33|Karanganyar', 'Wonosobo': '33|Wonosobo', 'Klaten': '33|Klaten',
       'Probolinggo': '35|Probolinggo', 'Magetan': '35|Magetan', 'Jombang': '35|Jombang', 'Tojo Una-Una': '72|Tojo Una Una', 'Sidenreng Rappang': '73|Sidenreng Rappang',
       'Luwu': '73|Luwu', 'Sinjai': '73|Sinjai', 'Minahasa': '71|Minahasa', 'Kota Tidore': '82|Kota Tidore Kepulauan', 'Raja Ampat': '96|Raja Ampat'}
for kk in KAB.values(): assert kk in K['kab'] or kk in H['kab'], kk
isi = json.load(open(ISIAN))['isi']; kej = list(isi['kejadian'])
# pedoman pemilik 23 Okt: tiap provinsi berstatus Prioritas di website (ada cluster level 3) wajib masuk laporan. Yang belum ada di isian
# Koordalops ditambahkan sebagai baris provinsi, sesudah baris provinsi isian, urut sisa belum padam terbesar
KL = json.load(open(W + 'kluster_awal.json')); PRIO = {f['properties']['prov'] for f in KL['features'] if f['properties']['level'] == 3}
ada = {x['prov'] for x in kej if x['jenis'] == 'karhutla'}
baru = [{'jenis': 'karhutla', 'prov': k, 'lokasi': '', 'status': 'berjalan', 'catatan': 'website: provinsi berstatus Prioritas'}
        for k in sorted(PRIO - ada, key=lambda k: -(prov(k)['sisa']))]
n = max(n for n, x in enumerate(kej) if x['jenis'] == 'karhutla' and not x['lokasi']) + 1; kej[n:n] = baru
out = []
for x in kej:
    y = dict(x)
    if x['jenis'] == 'karhutla': y['sat'] = kec(ARJ) if x['lokasi'] == 'Gunung Arjuno' else kab(KAB[x['lokasi']]) if x['lokasi'] else prov(x['prov'])
    sisa = round(y['sat']['sisa']) if 'sat' in y else None
    # sisa belum padam satelit 0 ha = selesai walau laporan lapangan belum menutupnya (pemilik 23 Okt: "udah nol ya masuk selesai dong")
    # sisa < 10 ha tanpa laporan BPBD api belum padam juga selesai (pemilik 23 Okt soal Riau ±2 ha, Raja Ampat ±5 ha: "gausah deh kan dikit aja")
    y['tangani'] = x['status'] != 'selesai' and sisa != 0 and not (sisa is not None and sisa < 10 and x['status'] != 'belum')
    # perlu perhatian = karhutla yang masih ditangani dengan sisa >= 100 ha atau dilapor BPBD api belum padam (pemilik 23 Okt)
    # ponytail: ambang 100 ha tetap; pindahkan ke isian bila pemilik minta ambang lain per laporan
    y['perhatian'] = y['tangani'] and sisa is not None and (sisa >= 100 or x['status'] == 'belum')
    out.append(y)
json.dump({'hari': HARI, 'dibuat': P['dibuat'], 'kejadian': out, 'isi': {k: v for k, v in isi.items() if k != 'kejadian'}}, open('data.json', 'w'), ensure_ascii=False, indent=1)
print('prioritas website', sorted(PRIO), 'ditambahkan', [x['prov'] for x in baru])
for y in out:
    if 'sat' in y: print(y['prov'], y['lokasi'] or '(prov)', y['status'], 'ditangani' if y['tangani'] else 'selesai', 'PERHATIAN' if y['perhatian'] else '', y['sat'])
