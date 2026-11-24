"""Angka paparan Dampak Bencana 2026 (19 Nov 2026): DIBI tarikan 18 Nov 2026, sistem karhutla BNPB (peta_karhutla 18 Nov 17.01 WIB),
dampak.json 14 Okt 2026 (komposisi lahan). Keluaran data.json dibaca bangun.py."""
import json, collections, os
S = os.path.dirname(os.path.abspath(__file__)); R = os.path.normpath(os.path.join(S, '../../../..'))
d = json.load(open(os.path.join(S, 'dibi_181126.json'), encoding='utf-8')); K = d['kolom']
KEL = {'Karhutla': ('Kebakaran Hutan dan Lahan', 'Kebakaran Lahan', 'Kebakaran Hutan', 'Kebakaran Lahan Gambut'),
       'Banjir': ('Banjir', 'Banjir Bandang', 'Banjir Rob', 'Banjir Genangan', 'Banjir dan Tanah Longsor', 'Banjir Lahar (Lahar)'),
       'Cuaca ekstrem': ('Cuaca Ekstrem', 'Angin Kencang', 'Puting Beliung', 'Angin Topan'),
       'Tanah longsor': ('Tanah Longsor', 'Gerakan Tanah'),
       'Gempa bumi': ('Gempabumi', 'Gempa Bumi dan Tsunami', 'Gempabumi Reruntuhan'),
       'Kekeringan': ('Kekeringan', 'Kekeringan Pertanian'),
       'Kebakaran permukiman': ('Kebakaran Gedung dan Permukiman',),
       'Erupsi gunung api': ('Erupsi Gunung Api',)}
peta = {j: k for k, v in KEL.items() for j in v}
g = collections.defaultdict(collections.Counter); tot = collections.Counter(); ntt = collections.defaultdict(collections.Counter)
for r in d['kejadian']:
    if r['tanggal'] < '2026-01-01': continue
    k = peta.get(r['jenis'], 'Lainnya')
    for c in (g[k], tot):
        c['kejadian'] += r['kejadian']
        for x in K: c[x] += r.get(x, 0)
    if r['jenis'] == 'Gempabumi' and r['tanggal'] == '2026-08-15':
        for x in K: ntt[r['kab']][x] += r.get(x, 0)
for c in list(g.values()) + [tot]: c['rumah'] = c['rr_berat'] + c['rr_sedang'] + c['rr_ringan']
gempa_lain = [r for r in d['kejadian'] if r['jenis'].startswith('Gempa') and r['tanggal'] >= '2026-01-01' and r['tanggal'] != '2026-08-15']
gl = collections.defaultdict(collections.Counter)
for r in gempa_lain:
    key = (r['tanggal'], r['prov']); gl[key]['kab'] += 1
    for x in K: gl[key][x] += r.get(x, 0)
p = json.load(open(os.path.join(S, 'peta_karhutla_181126.json'), encoding='utf-8'))
H, n = p['hari'], p['nasional']
bulan = collections.Counter(); bl = collections.Counter()
for h, a, l in zip(H, n['hot'], n['luas']): bulan[h[:7]] += a; bl[h[:7]] += l
prov = sorted(((v['nama'], sum(v['luas']), sum(v['hot'])) for v in p['prov'].values()), key=lambda r: -r[1])
dm = json.load(open(os.path.join(R, 'public/data/dampak.json'), encoding='utf-8'))
fs = json.load(open(os.path.join(R, 'public/data/factsheet_karhutla.json'), encoding='utf-8'))
out = {'dibi_sampai': d['sampai'], 'jenis': {k: dict(v) for k, v in g.items()}, 'total': dict(tot),
       'ntt': {k: dict(v) for k, v in ntt.items()}, 'gempa_lain': [[a, b, dict(c)] for (a, b), c in sorted(gl.items())],
       'karhutla': {'hari_akhir': H[-1], 'luas': sum(n['luas']), 'hot': sum(n['hot']), 'bulan_hot': dict(bulan), 'bulan_luas': dict(bl),
                    'prov': prov[:10], 'lahan': dm['lahan']['kategori_ha'], 'gambut': dm['lahan']['gambut_ha'], 'lahan_tgl': dm['dibuat'][:10],
                    'tahunan': fs['nasional']}}
json.dump(out, open(os.path.join(S, 'data.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print(json.dumps({k: out[k] for k in ('total',)}, ensure_ascii=False))
for k, v in sorted(g.items(), key=lambda x: -x[1]['kejadian']): print(k, v['kejadian'], v['meninggal'], v['mengungsi'], v['rumah'], v['terdampak'])
for k, v in sorted(ntt.items(), key=lambda x: -(x[1]['rr_berat'] + x[1]['rr_sedang'] + x[1]['rr_ringan'])): print(k, dict(v))
for x in out['gempa_lain']:
    if x[2].get('rr_berat', 0) + x[2].get('rr_sedang', 0) + x[2].get('rr_ringan', 0) > 100: print(x)
print(out['karhutla']['bulan_hot'], out['karhutla']['luas'], out['karhutla']['hot'])
