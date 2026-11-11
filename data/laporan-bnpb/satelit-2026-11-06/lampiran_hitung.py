"""Lampiran kab/kota 061126 (pemilik dan Bang Ghozi 5 Nov 18.21: angka per provinsi bisa menyesatkan, rincian kab/kota di lampiran).
Memakai salinan web/ yang sama dengan jalan.py (terbitan 17.10), jadi angka kab/kota berjumlah sama dengan baris provinsi di slide 2:
- hotspot: satelit.hitung tingkat kab (lokasi unik) atas hotspot.json web; dicocokkan ke harian30 per provinsi;
- firespot: kluster.json fs_ini (kunci prov|kab|kec);
- luas: rumus luas_sendiri jalan.py dikelompokkan per kab;
- belum padam: satelit.hitung tingkat kab hari laporan (rumus belum_kini peta_karhutla); dicocokkan ke belum_kini per provinsi.
Menulis lampiran-kab.json. Jalankan: PYTHONUTF8=1 C:/Python314/python lampiran_hitung.py"""
import json, os
from collections import Counter, defaultdict
S = os.path.dirname(os.path.abspath(__file__))
src = open(os.path.join(S, 'jalan.py'), encoding='utf-8').read()
src = src[:src.index('penanganan.wa_operasi.operasi = lambda')]   # persiapan jalan.py saja, tanpa membangun deck
g = {'__file__': os.path.join(S, 'jalan.py'), '__name__': 'jalan_persiapan'}
exec(compile(src, 'jalan.py', 'exec'), g)
D, H, KINI, KL, HS, DET, F, asli = (g[k] for k in ('D', 'H', 'KINI', 'KL', 'HS', 'DET', 'F', 'asli'))
TOP6 = sorted(g['TOP6'], key=lambda k: -H['prov'][k][g['iH']])
a = asli(D, g['JAM'], 2)
i = a['hari'].index(D.isoformat())

kab = defaultdict(lambda: {'hot': 0, 'fs': 0, 'luas': 0.0, 'belum': 0.0})
for k, o in a['kab'].items():
    kab[k]['hot'], kab[k]['belum'] = o['hot'][i], o['belum'][i]
for f in KL['features']:
    for k, v in (f['properties'].get('fs_ini') or {}).items():
        kab['|'.join(k.split('|')[:2])]['fs'] += v
c = Counter()
for lat, lon, jam, sen, frp, yak, wil, tgl, hit in HS['baris']:
    if sen in F and yak >= 1 and tgl == D.strftime('%m-%d'):
        p, kb = HS['wilayah'][wil].split('|')[:2]
        c[(p + '|' + kb, sen)] += 1
for (k, s), n in c.items():
    kab[k]['luas'] += n * F[s] / 2

# 6 Nov: belum_kini hari laporan belum terbit (masih 5 Nov 23.45), jadi jalan.py memakai versi hari utuh: luas dan belum padam kolom D
# = peta_karhutla hari utuh D-1. Lampiran ikut: sebaran per kab dari peta_karhutla_kab.json D-1 (d = [indeks hari, luas, belum]).
if not g['KINI_ADA']:
    KAB = json.load(open(os.path.join(S, 'web', 'peta_karhutla_kab.json'), encoding='utf-8'))
    ik = KAB['hari'].index(g['KEMARIN'].isoformat()); jP = g['P']['hari'].index(g['KEMARIN'].isoformat())
    for v in kab.values(): v['luas'] = v['belum'] = 0.0
    for kk, v in KAB['kab'].items():
        for r in v['d']:
            if r[0] == ik: kab[kk]['luas'], kab[kk]['belum'] = r[1], r[2]
    g['LUAS_D'] = {p: g['P']['prov'][p]['luas'][jP] or 0 for p in g['P']['prov']}
    KINI = {'prov': {p: g['P']['prov'][p]['belum'][jP] or 0 for p in g['P']['prov']}}

NAMA = {'93': 'Papua Selatan', '62': 'Kalimantan Tengah', '64': 'Kalimantan Timur', '74': 'Sulawesi Tenggara', '63': 'Kalimantan Selatan',
        '72': 'Sulawesi Tengah', '61': 'Kalimantan Barat', '16': 'Sumatera Selatan', '15': 'Jambi', '14': 'Riau', '53': 'Nusa Tenggara Timur',
        '94': 'Papua', '73': 'Sulawesi Selatan', '81': 'Maluku', '52': 'Nusa Tenggara Barat', '19': 'Kepulauan Bangka Belitung', '18': 'Lampung', '71': 'Sulawesi Utara'}


def bagi(nilai, total):
    """Total provinsi di slide dibagi ke kab/kota sebanding hitungan sendiri, sisa pembulatan ke pecahan terbesar (jumlah = total persis)."""
    s_ = sum(nilai)
    if not s_: return [0] * len(nilai)
    x = [v * total / s_ for v in nilai]; b = [int(v) for v in x]
    for j in sorted(range(len(x)), key=lambda j: -(x[j] - b[j]))[:round(total) - sum(b)]: b[j] += 1
    return b


out, cek, csvb = {}, [], []
for p in TOP6:
    rows = sorted(((k.split('|')[1], v) for k, v in kab.items() if k.split('|')[0] == p and any(v.values())),
                  key=lambda r: (-r[1]['hot'], -r[1]['fs'], -r[1]['belum']))
    tl, tb = round(g['LUAS_D'].get(p, 0)), round(KINI['prov'].get(p, 0))
    L, B = bagi([v['luas'] for _, v in rows], tl), bagi([v['belum'] for _, v in rows], tb)
    rows = [{'kab': n, 'hot': v['hot'], 'fs': v['fs'], 'luas': L[j], 'belum': B[j], 'luas_sendiri': round(v['luas']), 'belum_sendiri': round(v['belum'])}
            for j, (n, v) in enumerate(rows)]
    jum = {m: sum(r[m] for r in rows) for m in ('hot', 'fs', 'luas', 'belum')}
    assert jum == {'hot': H['prov'][p][g['iH']], 'fs': jum['fs'], 'luas': tl, 'belum': tb}, (p, jum)
    cek.append((p, jum)); out[p] = rows
    csvb += [(NAMA[p], r['kab'], r['hot'], r['fs'], r['luas'], r['belum']) for r in rows]
json.dump({'hari': D.isoformat(), 'prov': out}, open(os.path.join(S, 'lampiran-kab.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
import csv
AKAR = os.path.join(os.environ.get('DECK_BNPB', os.path.expanduser('~/.claude/skills/ppt-konsultan/bnpb')), 'assets', 'proyek-bnpb')
with open(os.path.join(AKAR, 'data', 'lap', 'penanganan-061126-kab.csv'), 'w', newline='', encoding='utf-8') as f:
    w = csv.writer(f); w.writerow(['provinsi', 'kab', 'hot', 'fs', 'luas', 'belum']); w.writerows(csvb)
for p, j in cek:
    print(p, NAMA[p], 'kab', len(out[p]), j)
print('baris', len(csvb))
