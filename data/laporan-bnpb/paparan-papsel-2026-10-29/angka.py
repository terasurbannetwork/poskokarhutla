"""Semua angka paparan Papua Selatan 291026 (cut-off 29 Okt 2026 24.00 WIB, hari 29 Okt penuh) -> angka.json.
Mesin ini tidak punya FIRMS_MAP_KEY, jadi semua angka dari berkas situs live di web/ (dibuat situs 30 Okt 11.28-11.29 WIB; ditarik ulang
14.45, isinya sama persis):
- titik provinsi dan kab/kota 22-29 Okt: harian30.json, angka tabel dan tren halaman utama situs (lokasi unik ~375 m per hari WIB, semua
  keyakinan, tanpa sel industri). peta_karhutla.json memakai definisi yang sama tetapi berbeda 0-53 titik per hari; deck Jambi 241026
  memakai angka harian30.
- titik kecamatan 24-29 Okt: hotspot.json kolom hitung, sumber tren kecamatan di situs. hotspot.json tidak memuat 22-23 Okt, jadi semua
  angka kecamatan berjendela 24-29 Okt. Jumlah kecamatan per kab per hari diassert = harian30.json.
- luas, belum padam, padam: peta_karhutla.json (provinsi), peta_karhutla_wil.json (kab/kota, kecamatan).
- cluster: kluster_hari/2026-10-29.json, keadaan akhir 29 Okt (kluster_awal.json = keadaan 30 Okt pagi, tidak sesuai cut-off). Arsip
  hanya memuat pusat cluster level >= 1 [id, lon, lat, level, n, px24] dan jumlah per wilayah; kab/kec diturunkan dengan Wilayah, label
  lahan dengan logika penanggung() harian.py (konsesi lalu kawasan; divalidasi sama dengan 158/158 label kluster_awal 30 Okt).
- banjir: banjir/status.json (30 Okt-2 Nov per kecamatan) dan banjir/riwayat.json (DIBI BNPB)."""
import datetime as dt, json, os, sys
from collections import Counter

AKAR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
sys.path.insert(0, os.path.join(AKAR, 'scripts', 'data'))
from wilayah import Poligon, Wilayah, _cincin, _di_dalam  # noqa: E402

WEB = 'web/'
KODE, FOKUS = '93', 'Merauke'
HARI = ['2026-10-%d' % i for i in range(22, 30)]   # provinsi dan kab/kota
HK = HARI[2:]                                     # kecamatan (hotspot.json)
KAW = ['Jagebob', 'Tanah Miring', 'Animha', 'Semangga']             # koridor: separuh belum padam provinsi 29 Okt
KIMAAM = ['Kimaam', 'Kontuar', 'Waan', 'Tabonji', 'Padua']          # distrik yang wilayahnya di Pulau Kimaam (Yos Sudarso)
PUSAT_KIMAAM = (138.28, -8.22)                                      # titik di pulau (cluster Kontuar): penanda bagian poligon pulau
P = json.load(open(WEB + 'peta_karhutla.json')); W = json.load(open(WEB + 'peta_karhutla_wil.json')); H30 = json.load(open(WEB + 'harian30.json'))
HS = json.load(open(WEB + 'hotspot.json')); AR = json.load(open(WEB + 'kluster_hari_2026-10-29.json'))
KEC_GEO = [f['properties'] for f in json.load(open(os.path.join(AKAR, 'public/geo/kecamatan', KODE + '.json')))['features']]
assert P['hari'][-1] == HARI[-1] and AR['hari'] == HARI[-1], (P['hari'][-1], AR['hari'])
pi = [P['hari'].index(d) for d in HARI]; hi = [H30['hari'].index(d) for d in HARI]
H0 = dt.date.fromisoformat(W['hari0']); wi = [(dt.date.fromisoformat(d) - H0).days for d in HARI]
b = lambda xs: [round(x or 0) for x in xs]


def wil(k):
    """peta_karhutla_wil: [indeks_hari, hot, luas, belum, padam] datar -> deret luas/belum per HARI."""
    d = W['d'].get(k, []); m = {d[j]: d[j + 1:j + 5] for j in range(0, len(d), 5)}
    return {nm: [m.get(i, [0] * 4)[n] for i in wi] for n, nm in ((1, 'luas'), (2, 'belum'), (3, 'padam'))}


# ---- Pulau Kimaam = bagian poligon Kab. Merauke yang memuat PUSAT_KIMAAM. Hitungan pulau memakai geometri, bukan nama distrik:
#      Kec. Kimaam juga punya wilayah di daratan seberang Selat Muli dan pulau kecil (309 dari 697 titiknya 24-29 Okt)
gk = [f['geometry'] for f in json.load(open(os.path.join(AKAR, 'public/geo/kabupaten', KODE + '.json')))['features'] if f['properties']['kab'] == FOKUS][0]
bagian = gk['coordinates'] if gk['type'] == 'MultiPolygon' else [gk['coordinates']]
PULAU = [p for p in bagian if _di_dalam(*PUSAT_KIMAAM, p[0])]
assert len(PULAU) == 1 and len(PULAU[0]) == 1, 'bagian pulau Kimaam tidak tunggal / berlubang'
di_pulau = lambda lon, lat: _di_dalam(lon, lat, PULAU[0][0])
# ---- titik kecamatan dari hotspot.json (kolom hitung)
KO = {n: i for i, n in enumerate(HS['kolom'])}
hs = Counter(); n_pulau = 0
for r in HS['baris']:
    w = HS['wilayah'][r[KO['wilayah']]]; d = '2026-' + r[KO['tgl_wib']]
    if w.startswith(KODE + '|') and d in HK and r[KO['hitung']]:
        hs[(w.split('|', 1)[1], d)] += 1
        n_pulau += w.startswith(f'{KODE}|{FOKUS}|') and di_pulau(r[KO['lon']], r[KO['lat']])
# ---- provinsi
pv = P['prov'][KODE]
prov = {'hot': [H30['prov'][KODE][i] for i in hi], **{m: b(pv[m][i] for i in pi) for m in ('luas', 'belum', 'padam')}}
prov['kum'] = round(sum(v or 0 for v in pv['luas'][:pi[-1] + 1]))
# ---- kab/kota
kabs = sorted(k.split('|')[1] for k in H30['kab'] if k.startswith(KODE + '|'))
kw_ = AR['w']
KAB = {k: {'hot': [H30['kab'][f'{KODE}|{k}'][i] for i in hi], **wil(f'{KODE}|{k}'), 'komp': kw_.get(f'{KODE}|{k}', [0])[0]} for k in kabs}
assert [sum(KAB[k]['hot'][j] for k in kabs) for j in range(len(HARI))] == prov['hot'], 'jumlah titik kab != provinsi (harian30)'
rank = sorted(kabs, key=lambda k: (-KAB[k]['hot'][-1], -KAB[k]['hot'][-2], -KAB[k]['luas'][-1]))
# ---- kecamatan (semua yang punya titik atau luas)
nama_kec = sorted({f"{g['kab']}|{g['kec']}" for g in KEC_GEO})
KEC = {k: {'hot': [hs[(k, d)] for d in HK], **{m: v[-1] for m, v in wil(f'{KODE}|{k}').items()}} for k in nama_kec}
for k in kabs:
    assert [sum(v['hot'][j] for kk, v in KEC.items() if kk.split('|')[0] == k) for j in range(len(HK))] == KAB[k]['hot'][2:], ('kec != kab', k)
assert sum(sum(v['hot']) for v in KEC.values()) == sum(prov['hot'][2:]), 'ada titik di luar kecamatan geo'
# ---- cluster keadaan akhir 29 Okt
Wl = Wilayah(); L = os.path.join(AKAR, 'public/data/lahan')
KONS, KAWA, GAMB = Poligon(L + '/konsesi.geojson'), Poligon(L + '/kawasan.geojson'), Poligon(L + '/gambut.geojson')
PJ = {'sawit': 'Areal konsesi sawit', 'hph': 'Areal konsesi HPH (hutan alam)', 'hti': 'Areal konsesi HTI (kayu pulp)', 'tambang': 'Areal izin tambang'}


def tanggung(lon, lat):
    """= harian.py penanggung()[1]: konsesi aktif dulu, lalu fungsi kawasan hutan, sisanya APL."""
    k = KONS.cari(lon, lat)
    if k and k.get('aktif') is not False: return PJ.get(k.get('jenis'), 'Areal konsesi')
    kw = KAWA.cari(lon, lat)
    if kw:
        f = kw.get('fungsi')
        if f == 'HK': return kw.get('nama') or 'Kawasan konservasi'
        if f in ('HL', 'THR'): return 'Hutan lindung' if f == 'HL' else 'Tahura'
        return {'HP': 'Hutan produksi', 'HPT': 'Hutan produksi terbatas', 'HPK': 'Hutan produksi dapat dikonversi'}.get(f, f)
    return 'Area penggunaan lain (lahan masyarakat)'


KL = []
for id_, lon, lat, lv, n, px24 in AR['k']:
    w = Wl.cari(lon, lat)
    if w and w[0] == KODE:
        KL.append({'id': id_, 'lon': lon, 'lat': lat, 'level': lv, 'n': n, 'px24': px24, 'kab': w[1], 'kec': w[2],
                   'tanggung': tanggung(lon, lat), 'gambut': GAMB.cari(lon, lat) is not None})
n_komp = kw_[KODE][0]
lvl = Counter(c['level'] for c in KL); lvl[0] = n_komp - len(KL)
assert all(sum(1 for c in KL if c['kab'] == k) <= KAB[k]['komp'] for k in kabs), 'cluster level >= 1 melebihi jumlah aktif kab'
prio = sorted(KL, key=lambda c: (-c['level'], -c['px24'], -c['n']))[:3]
lv_kec = {k: kw_.get(f'{KODE}|{k}', [0, 0, -1])[2] for k in KEC}
gambut_kec = sorted({f"{c['kab']}|{c['kec']}" for c in KL if c['gambut']})
# ---- Kab. Merauke, koridor, Pulau Kimaam
mk = lambda k: KEC[f'{FOKUS}|{k}']
fk_kec = sorted([(k.split('|')[1], sum(v['hot'])) for k, v in KEC.items() if k.startswith(FOKUS + '|')], key=lambda x: -x[1])
fk_belum = max(((k.split('|')[1], v['belum']) for k, v in KEC.items() if k.startswith(FOKUS + '|')), key=lambda x: x[1])
kaw = {'hot': [sum(mk(k)['hot'][j] for k in KAW) for j in range(len(HK))], 'luas': sum(mk(k)['luas'] for k in KAW), 'belum': sum(mk(k)['belum'] for k in KAW)}
kl_kaw = [c for c in KL if c['kab'] == FOKUS and c['kec'] in KAW]
kaw_komp = sum(kw_.get(f'{KODE}|{FOKUS}|{k}', [0])[0] for k in KAW)
kimaam = {'hot': n_pulau, 'hot_5_distrik': sum(sum(mk(k)['hot']) for k in KIMAAM)}
assert n_pulau <= kimaam['hot_5_distrik'], 'titik pulau melebihi 5 distrik'
# puncak koridor tahun ini dari peta_karhutla_wil (satu-satunya seri kecamatan sejak 1 Jan; definisi titik sama)
kor = Counter()
for k in KAW:
    d = W['d'].get(f'{KODE}|{FOKUS}|{k}', [])
    for j in range(0, len(d), 5): kor[d[j]] += d[j + 1]
pk_i, pk_n = max(kor.items(), key=lambda x: (x[1], -x[0]))
kaw_puncak = {'hari': (H0 + dt.timedelta(days=pk_i)).isoformat(), 'hot': pk_n}
# ---- banjir: status 30 Okt-2 Nov per kecamatan (status.json hanya memuat kecamatan berstatus), riwayat DIBI
ST = json.load(open(WEB + 'banjir/status.json')); RW = json.load(open(WEB + 'banjir/riwayat.json'))
assert ST['hari'] == ['2026-10-30', '2026-10-31', '2026-11-01', '2026-11-02'], ST['hari']
st = {k: v for k, v in ST['kec'].items() if k.startswith(KODE + '|')}


def kab_banjir(k):
    ks = {kk.split('|')[2]: v for kk, v in st.items() if kk.split('|')[1] == k}
    bj = sorted([(n, v['h3']) for n, v in ks.items() if max(v['b']) >= 1], key=lambda x: -x[1])
    ls = sorted([(n, v['h3']) for n, v in ks.items() if max(v['l']) >= 1], key=lambda x: -x[1])
    rb = RW['jenis']['banjir']['kab'].get(f'{KODE}|{k}', {'total': 0}); rl = RW['jenis']['longsor']['kab'].get(f'{KODE}|{k}', {'total': 0})
    return {'banjir': bj, 'longsor': ls, 'h3': max((v['h3'] for v in ks.values()), default=0), 'n_kec': sum(1 for g in KEC_GEO if g['kab'] == k),
            'dibi_banjir': rb['total'], 'dibi_longsor': rl['total']}


BJ = {k: kab_banjir(k) for k in sorted({kk.split('|')[1] for kk in st})}
rb = RW['jenis']['banjir']['prov'][KODE]; rl = RW['jenis']['longsor']['prov'].get(KODE, {'total': 0, 'v': [0] * len(rb['v'])})
th = RW['jenis']['banjir']['tahun_cakup']; tahun = [str(t) for t in range(int(th[0]), int(th[0]) + len(rb['v']))]
assert sum(rb['v']) == rb['total'], 'DIBI: total != jumlah tahunan'
banjir = {'kab': BJ, 'hari': ST['hari'], 'n_kec': len(KEC_GEO),
          'kec_waspada_b': sum(1 for v in st.values() if max(v['b']) >= 1), 'kec_waspada_l': sum(1 for v in st.values() if max(v['l']) >= 1),
          'kec_waspada': sum(1 for v in st.values() if max(v['b'] + v['l']) >= 1), 'maks_st': max((max(v['b'] + v['l']) for v in st.values()), default=0),
          'dibi': {'banjir': rb['total'], 'longsor': rl['total'], 'th0': th[0], 'th1': th[-1], 'v': dict(zip(tahun, rb['v'])), 'v_longsor': dict(zip(tahun, rl['v']))}}
# ---- peringkat nasional 29 Okt (titik = harian30, luas/belum = peta_karhutla)
NAS = {'hot': sorted(H30['prov'], key=lambda k: -(H30['prov'][k][hi[-1]] or 0)).index(KODE) + 1,
       **{m: sorted(P['prov'], key=lambda k: -(P['prov'][k][m][pi[-1]] or 0)).index(KODE) + 1 for m in ('luas', 'belum')}, 'n_prov': len(P['prov'])}
A = {'HARI': HARI, 'HK': HK, 'prov': prov, 'kab': KAB, 'rank': rank, 'level': {str(k): v for k, v in sorted(lvl.items())}, 'n_komp': n_komp,
     'prio': prio, 'prio_total': lvl[3], 'kl': [[c['lon'], c['lat'], c['level']] for c in KL], 'lv_kec': lv_kec, 'gambut_kec': gambut_kec,
     'fk_kec': fk_kec, 'fk_belum': fk_belum, 'kec': KEC, 'kaw_nama': KAW, 'kaw': kaw, 'kaw_komp': kaw_komp, 'kaw_level': {str(k): v for k, v in sorted(Counter(c['level'] for c in kl_kaw).items())},
     'kaw_kec_level': {k: {str(lv): n for lv, n in sorted(Counter(c['level'] for c in kl_kaw if c['kec'] == k).items())} for k in KAW},
     'kaw_tanggung': Counter(c['tanggung'] for c in kl_kaw if c['level'] >= 2).most_common(), 'kaw_puncak': kaw_puncak, 'kimaam_nama': KIMAAM, 'kimaam': kimaam,
     'banjir': banjir, 'nasional': NAS, 'dibuat': {'harian30': H30['dibuat'], 'peta': P['dibuat'], 'cluster': AR['hari'] + ' akhir hari'}}
json.dump(A, open('angka.json', 'w'), ensure_ascii=False, indent=1)
if __name__ == '__main__':
    print('prov', prov)
    for k in rank: print(' ', k, 'hot', KAB[k]['hot'], 'luas29', KAB[k]['luas'][-1], 'belum29', KAB[k]['belum'][-1], 'komp', KAB[k]['komp'])
    print('cluster', n_komp, dict(lvl)); [print('  prio', c) for c in prio]
    print('Merauke kec 24-29', fk_kec[:8], 'belum terbesar', fk_belum)
    print('koridor', kaw, 'komp', kaw_komp, A['kaw_level'], A['kaw_tanggung'], 'puncak 2026', kaw_puncak); print('Pulau Kimaam', kimaam)
    print('lv_kec Merauke', {k: v for k, v in lv_kec.items() if k.startswith('Merauke|') and v >= 2}); print('gambut_kec', gambut_kec)
    print('banjir', {k: v for k, v in banjir.items() if k not in ('kab', 'dibi')}, banjir['dibi'])
    print('nasional', NAS)
