"""Semua angka paparan Lampung 241026 (cut-off 24 Okt 06.44 WIB) -> angka.json. Jendela 17-24 Okt, 24 Okt sementara.
Provinsi dan kabupaten: titik dari harian30.json; luas/belum 17-23 Okt dari peta_karhutla*.json; 24 Okt (belum terbit di website) dihitung dari
titik FIRMS mentah s.d. 06.44 WIB dengan rumus website (luas.py; 18-23 Okt rumus ini sama persis dengan website). Kecamatan dan TNWK: titik mentah."""
import json
from collections import Counter
from luas import hitung
WEB = 'web/'
H30 = json.load(open(WEB + 'harian30.json')); P = json.load(open(WEB + 'peta_karhutla.json')); K = json.load(open(WEB + 'peta_karhutla_kab.json'))
KL = [f['properties'] for f in json.load(open(WEB + 'kluster_awal.json'))['features'] if f['properties']['prov'] == '18']
T = json.load(open('titik.json')); hot, det = T['hot'], T['det']
HARI = ['2026-10-%d' % i for i in range(17, 25)]; D = HARI[-1]; LAMA = HARI[:-1]
hi = [H30['hari'].index(d) for d in HARI]; pi = [P['hari'].index(d) for d in LAMA]
assert D not in P['hari'], 'website sudah punya 24 Okt: pakai angkanya'
pv = P['prov']['18']; r24 = hitung(det, [D])[D]
cek = hitung(det, ['2026-10-23'])['2026-10-23']; assert [round(v) for v in cek[:2]] == [round(pv['luas'][pi[-1]]), round(pv['belum'][pi[-1]])], 'rumus != website'
prov = {'hot': [H30['prov']['18'][i] for i in hi], 'luas': [round(pv['luas'][i] or 0) for i in pi] + [round(r24[0])], 'belum': [round(pv['belum'][i] or 0) for i in pi] + [round(r24[1])],
        'kum': round(sum(v or 0 for v in pv['luas'][:pi[-1] + 1]) + r24[0])}
assert prov['hot'] == [sum(1 for p in hot if p['w'][:10] == d) for d in HARI], 'titik FIRMS mentah != harian30'
def kab(k):
    d = K['kab'].get('18|' + k, {'d': []})['d']; m = {x: (l, b) for x, l, b in d}; r = hitung(det, [D], lambda p: p['kab'] == k)[D]
    return {'hot': [H30['kab'].get('18|' + k, [0] * 99)[i] for i in hi], 'luas': [round(m.get(i, (0, 0))[0]) for i in pi] + [round(r[0])],
            'belum': [round(m.get(i, (0, 0))[1]) for i in pi] + [round(r[1])], 'komp': sum(1 for c in KL if c['kab'] == k), 'siaga': sum(1 for c in KL if c['kab'] == k and c['level'] == 2)}
kabs = sorted({k.split('|')[1] for k in H30['kab'] if k.startswith('18|')})
KAB = {k: kab(k) for k in kabs}
rank = sorted(kabs, key=lambda k: (-KAB[k]['hot'][-1], -KAB[k]['hot'][-2], -KAB[k]['luas'][-1]))
lvl = Counter(c['level'] for c in KL)
siaga = sorted([c for c in KL if c['level'] == 2], key=lambda c: -c['skor'])
kec = Counter(p['kec'] for p in hot if p['kab'] == 'Lampung Timur')
kec_tn = Counter(p['kec'] for p in hot if p['kab'] == 'Lampung Timur' and p['tn'])
r = hitung(det, HARI, lambda p: p['tn'])
tn = {'hot': [sum(1 for p in hot if p['tn'] and p['w'][:10] == d) for d in HARI], 'luas': [round(r[d][0]) for d in HARI], 'belum': [round(r[d][1]) for d in HARI]}
tn_kec_hari = {k: [sum(1 for p in hot if p['tn'] and p['kec'] == k and p['w'][:10] == d) for d in HARI] for k in kec_tn}
A = {'HARI': HARI, 'prov': prov, 'kab': KAB, 'rank': rank, 'level': {str(k): v for k, v in lvl.items()}, 'n_komp': len(KL),
     'siaga_top': [{k: c[k] for k in ('id', 'kab', 'kec', 'n24', 'n', 'luas', 'lat', 'lon', 'skor', 'hari')} for c in siaga[:3]],
     'lt_kec': kec.most_common(), 'lt_kec_tn': dict(kec_tn), 'tn': tn, 'tn_kec_hari': tn_kec_hari, 'dibuat': H30['dibuat']}
json.dump(A, open('angka.json', 'w'), ensure_ascii=False, indent=1)
if __name__ == '__main__':
    print('prov', prov, 'total', sum(prov['hot']))
    for k in rank[:10]: print(k, KAB[k]['hot'][-1], KAB[k]['luas'][-1], KAB[k]['belum'][-1], KAB[k]['komp'], 'sum', sum(KAB[k]['hot']))
    print('lvl', lvl); print('siaga', [(c['kec'], c['kab'], c['n24']) for c in siaga[:3]])
    print('LT', KAB['Lampung Timur'], sum(KAB['Lampung Timur']['hot'])); print('kec', kec.most_common(8), kec_tn)
    print('TN', tn, sum(tn['hot']), sum(tn['luas'])); print(tn_kec_hari)
