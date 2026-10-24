"""Semua angka paparan Jambi 241026 (cut-off 24 Okt 24.00 WIB, hari 24 Okt penuh) -> angka.json. Jendela 17-24 Okt.
Titik, luas, belum padam provinsi/kabupaten/kecamatan: satelit.json (mesin website, generator/satelit.py --tanggal 2026-10-24 --jam 23:59
--hari 8); 17-23 Okt diassert sama dengan peta_karhutla*.json dan harian30.json website. Cluster: kluster_awal.json. Banjir: web/banjir/
(status.json = status deterministik 24-27 Okt, riwayat.json = DIBI BNPB 2008-2025)."""
import json
from collections import Counter
WEB = 'web/'
S = json.load(open('satelit.json')); HARI = S['hari']
H30 = json.load(open(WEB + 'harian30.json')); P = json.load(open(WEB + 'peta_karhutla.json')); K = json.load(open(WEB + 'peta_karhutla_kab.json'))
KL = [f['properties'] for f in json.load(open(WEB + 'kluster_awal.json'))['features'] if f['properties']['prov'] == '15']
b = lambda xs: [round(x) for x in xs]
pv = S['prov']['15']
# ---- cek: hari lama = website
lama = HARI[:-1]; pi = [P['hari'].index(d) for d in lama]
assert b(pv['luas'][:-1]) == [round(P['prov']['15']['luas'][i] or 0) for i in pi], 'luas != website'
assert b(pv['belum'][:-1]) == [round(P['prov']['15']['belum'][i] or 0) for i in pi], 'belum != website'
assert pv['hot_bersih'] == [H30['prov']['15'][H30['hari'].index(d)] for d in HARI], 'titik != harian30'
prov = {'hot': pv['hot_bersih'], 'luas': b(pv['luas']), 'belum': b(pv['belum']),
        'kum': round(sum(v or 0 for v in P['prov']['15']['luas'][:pi[-1] + 1]) + pv['luas'][-1])}
kosong = {m: [0] * len(HARI) for m in ('hot_bersih', 'luas', 'belum')}
def wil(k):
    o = S['kab'].get(k) or S['kec'].get(k) or kosong
    return {'hot': o['hot_bersih'], 'luas': b(o['luas']), 'belum': b(o['belum'])}
kabs = sorted({k.split('|')[1] for k in H30['kab'] if k.startswith('15|')})
KAB = {}
for k in kabs:
    KAB[k] = wil('15|' + k); KAB[k]['komp'] = sum(1 for c in KL if c['kab'] == k)
    d = {x: (l, bb) for x, l, bb in K['kab'].get('15|' + k, {'d': []})['d']}
    assert all(abs(KAB[k]['luas'][j] - round(d.get(P['hari'].index(x), (0, 0))[0])) <= 1 for j, x in enumerate(lama)), ('kab luas != website', k)
rank = sorted(kabs, key=lambda k: (-KAB[k]['hot'][-1], -KAB[k]['hot'][-2], -KAB[k]['luas'][-1]))
lvl = Counter(c['level'] for c in KL)
prio = sorted(KL, key=lambda c: (-c['level'], -c.get('n24', 0), -c.get('luas', 0)))[:3]
# ---- Kab. Muaro Jambi dan kawasan gambut Kumpeh-Sadu
MJ = 'Muaro Jambi'
kec_mj = sorted([(k.split('|')[2], sum(v['hot_bersih'])) for k, v in S['kec'].items() if k.startswith(f'15|{MJ}|')], key=lambda x: -x[1])
gambut_kec = {(c['kab'], c['kec']) for c in KL if c.get('gambut')}
KAW = [('Muaro Jambi', 'Kumpeh'), ('Tanjung Jabung Timur', 'Sadu'), ('Tanjung Jabung Timur', 'Berbak'), ('Muaro Jambi', 'Kumpeh Ulu')]
kaw_kec = {kc: wil(f'15|{kc[0]}|{kc[1]}') for kc in KAW}
kaw = {m: [sum(v[m][j] for v in kaw_kec.values()) for j in range(len(HARI))] for m in ('hot', 'luas', 'belum')}
kl_kaw = [c for c in KL if (c['kab'], c['kec']) in KAW]
# ---- banjir: status 25-27 Okt per kecamatan, riwayat DIBI
ST = json.load(open(WEB + 'banjir/status.json')); RW = json.load(open(WEB + 'banjir/riwayat.json'))
assert ST['hari'][1:] == ['2026-10-25', '2026-10-26', '2026-10-27'], ST['hari']
st = {k: v for k, v in ST['kec'].items() if k.startswith('15|')}
def kab_banjir(k):
    ks = {kk.split('|')[2]: v for kk, v in st.items() if kk.split('|')[1] == k}
    bj = sorted([(n, v['h3']) for n, v in ks.items() if max(v['b'][1:]) >= 1], key=lambda x: -x[1])
    ls = sorted([(n, v['h3']) for n, v in ks.items() if max(v['l'][1:]) >= 1], key=lambda x: -x[1])
    rb = RW['jenis']['banjir']['kab'].get('15|' + k, {'total': 0}); rl = RW['jenis']['longsor']['kab'].get('15|' + k, {'total': 0})
    return {'banjir': bj, 'longsor': ls, 'h3': max((v['h3'] for v in ks.values()), default=0), 'n_kec': len(ks),
            'dibi_banjir': rb['total'], 'dibi_longsor': rl['total'], 'maks_st': max((max(v['b'][1:] + v['l'][1:]) for v in ks.values()), default=0)}
BJ = {k: kab_banjir(k) for k in sorted({kk.split('|')[1] for kk in st})}
rb = RW['jenis']['banjir']['prov']['15']; rl = RW['jenis']['longsor']['prov']['15']
th = RW['jenis']['banjir']['tahun_cakup']
ms = RW['musim']['banjir']['15']['rata']; bulan = [round(sum(ms[i * 3:i * 3 + 3]), 1) for i in range(12)]
banjir = {'kab': BJ, 'kec_waspada_b': sum(1 for v in st.values() if max(v['b'][1:]) >= 1), 'kec_waspada_l': sum(1 for v in st.values() if max(v['l'][1:]) >= 1),
          'kec_waspada': sum(1 for v in st.values() if max(v['b'][1:] + v['l'][1:]) >= 1), 'n_kec': len(st),
          'dibi': {'banjir': rb['total'], 'longsor': rl['total'], 'th0': th[0], 'th1': th[-1], 'v': dict(zip([str(t) for t in range(int(th[0]), int(th[0]) + len(rb['v']))], rb['v']))},
          'bulan': bulan, 'dibuat_status': ST.get('dibuat')}
A = {'HARI': HARI, 'prov': prov, 'kab': KAB, 'rank': rank, 'level': {str(k): v for k, v in lvl.items()}, 'n_komp': len(KL),
     'prio': [{k: c.get(k) for k in ('id', 'kab', 'kec', 'n24', 'n', 'luas', 'lat', 'lon', 'level', 'awal', 'gambut')} for c in prio],
     'mj_kec': kec_mj, 'gambut_kec': sorted(['|'.join(x) for x in gambut_kec]),
     'kaw': kaw, 'kaw_kec': {'|'.join(k): v for k, v in kaw_kec.items()}, 'kaw_komp': len(kl_kaw), 'kaw_prio': sum(1 for c in kl_kaw if c['level'] == 3),
     'kaw_luas_klaster': round(sum(c.get('luas', 0) for c in kl_kaw if c['level'] == 3)),
     'banjir': banjir, 'dibuat': H30['dibuat']}
json.dump(A, open('angka.json', 'w'), ensure_ascii=False, indent=1)
if __name__ == '__main__':
    print('prov', prov)
    for k in rank: print(k, KAB[k]['hot'][-1], KAB[k]['luas'][-1], KAB[k]['belum'][-1], KAB[k]['komp'], 'sum', sum(KAB[k]['hot']))
    print('lvl', lvl, 'prio', [(c['kec'], c['n24'], c['luas']) for c in prio])
    print('MJ', KAB[MJ], kec_mj[:7]); print('gambut', A['gambut_kec'])
    print('KAW', kaw, A['kaw_komp'], A['kaw_prio'], A['kaw_luas_klaster'])
    print('banjir', {k: v for k, v in banjir.items() if k != 'kab'})
    for k, v in sorted(BJ.items(), key=lambda x: -len(x[1]['banjir']) - len(x[1]['longsor'])): print(' ', k, len(v['banjir']), len(v['longsor']), v['n_kec'], v['h3'], v['dibi_banjir'], v['dibi_longsor'], v['banjir'][:3], v['longsor'][:3])
