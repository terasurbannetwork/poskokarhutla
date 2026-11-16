"""Tambahan kelompok B (P-40): hotspot per provinsi lawan baris karhutla DIBI per provinsi.

Sumber hotspot: public/data/hotspot.json (VIIRS S-NPP, NOAA-20, NOAA-21, keyakinan nominal/tinggi, 5-12 Okt 2026 WIB).
Sumber DIBI: analisis/hasil/dibi_mentah_2024_2026.json (tarikan 12 Nov 2026), jenis Kebakaran Hutan dan Lahan.
Provinsi hotspot dari dua digit pertama kode wilayah. Provinsi DIBI dari nama. Jangan diedit tanpa membaca ulang.
Jalankan: python tambahan_B.py
"""
import json, collections, datetime, os, sys
akar = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..', '..'))
H = json.load(open(os.path.join(akar, 'public/data/hotspot.json'), encoding='utf8'))
kol = H['kolom']
iw, it, ik, isn = kol.index('wilayah'), kol.index('tgl_wib'), kol.index('keyakinan'), kol.index('sensor')
W = H['wilayah']
kodeprov = {
 '11':'Aceh','12':'Sumatera Utara','13':'Sumatera Barat','14':'Riau','15':'Jambi','16':'Sumatera Selatan','17':'Bengkulu','18':'Lampung','19':'Kepulauan Bangka Belitung','21':'Kepulauan Riau',
 '31':'DKI Jakarta','32':'Jawa Barat','33':'Jawa Tengah','34':'DI Yogyakarta','35':'Jawa Timur','36':'Banten','51':'Bali','52':'Nusa Tenggara Barat','53':'Nusa Tenggara Timur',
 '61':'Kalimantan Barat','62':'Kalimantan Tengah','63':'Kalimantan Selatan','64':'Kalimantan Timur','65':'Kalimantan Utara','71':'Sulawesi Utara','72':'Sulawesi Tengah','73':'Sulawesi Selatan','74':'Sulawesi Tenggara','75':'Gorontalo','76':'Sulawesi Barat',
 '81':'Maluku','82':'Maluku Utara','91':'Papua','92':'Papua Barat','93':'Papua Selatan','94':'Papua Tengah','95':'Papua Pegunungan','96':'Papua Barat Daya'}
hs = collections.Counter(); hs_all = 0
for r in H['baris']:
    if r[isn] not in ('N', 'N20', 'N21'): continue
    if r[ik] not in (1, 2): continue
    kp = W[r[iw]].split('|')[0]
    hs[kp] += 1; hs_all += 1
D = json.load(open(os.path.join(akar, 'data/kajian-bnpb/hitung-bencana/analisis/hasil/dibi_mentah_2024_2026.json'), encoding='utf8'))['data']
def tgl(r): return (datetime.datetime.utcfromtimestamp(r['dt']/1000) + datetime.timedelta(hours=7)).date()
dari, sampai, lag = datetime.date(2026,10,5), datetime.date(2026,10,12), datetime.date(2026,10,15)
dibi = collections.Counter(); dibi_lag = collections.Counter()
for r in D:
    if r['kategori_bencana'] != 'Kebakaran hutan dan lahan': continue
    t = tgl(r)
    if dari <= t <= sampai: dibi[r['provinsi']] += 1
    if dari <= t <= lag: dibi_lag[r['provinsi']] += 1
out = {'titik_viirs_total': hs_all, 'baris_dibi_karhutla_5_12okt': sum(dibi.values()), 'baris_dibi_karhutla_5_15okt': sum(dibi_lag.values()), 'per_provinsi': []}
for kp, n in hs.most_common():
    p = kodeprov.get(kp, kp)
    out['per_provinsi'].append({'kode': kp, 'provinsi': p, 'titik': n, 'dibi_5_12okt': dibi.get(p, 0), 'dibi_5_15okt': dibi_lag.get(p, 0)})
json.dump(out, open(os.path.join(os.path.dirname(__file__), 'hasil', 'tambahan_B.json'), 'w', encoding='utf8'), ensure_ascii=False, indent=1)
print(hs_all, sum(dibi.values()), sum(dibi_lag.values()))
for x in out['per_provinsi'][:14]: print(x)
tot_top5 = sum(x['titik'] for x in out['per_provinsi'][:5]); print('top5 titik', tot_top5, tot_top5/hs_all)
print('prov DIBI karhutla 5-15 Okt:', dict(dibi_lag))

# ---------------------------------------------------------------------------
# P-17 dan P-58: ambang K2 terhadap penduduk kabupaten, dan ambang menonjol lawan ambang Juklak.
# Penduduk: public/data/penduduk.json (WorldPop 2026, dijumlah per kabupaten dari kunci 'kodeprov|kab|kec').
# DIBI 12 bulan: 13 Nov 2025 sampai 12 Nov 2026. K2 = menderita + luka_sakit + mengungsi (seperti uji_kriteria.py).
# ---------------------------------------------------------------------------
import re, statistics
P = json.load(open(os.path.join(akar, 'public/data/penduduk.json'), encoding='utf8'))['kec']
pk = collections.Counter()
for key, v in P.items():
    kp, kab, _ = key.split('|', 2)
    pk[(kp, kab)] += v
def norm(s):
    s = s.lower().replace('kabupaten ', '').replace('kab. ', '')
    s = s.replace('kota administrasi ', 'kota ').replace('adm. ', '')
    return re.sub(r'[^a-z0-9]', '', s)
pn = {(kp, norm(kab)): v for (kp, kab), v in pk.items()}
d0, d1 = datetime.date(2025,11,13), datetime.date(2026,11,12)
dua = []   # baris K2 saja (K2 terpenuhi, K1 dan K3 tidak)
semua12 = 0; cocok = 0
def k3(r): return r['rumah_rusak_berat']+r['rumah_rusak_sedang']+r['rumah_rusak_ringan']+r['pendidikan_rusak']+r['rumah_ibadat_rusak']+r['fasyankes_rusak']+r['kantor_rusak']+r['jembatan_rusak']
rows12 = [r for r in D if d0 <= tgl(r) <= d1]
for r in rows12:
    t = r['menderita'] + r['luka_sakit'] + r['mengungsi']
    if t >= 50 and r['meninggal'] < 1 and k3(r) < 5:
        semua12 += 1
        pop = pn.get((str(r['id_kab_bps'])[:2], norm(r['kabupaten'])))
        if pop: cocok += 1; dua.append((r['kategori_bencana'], t, pop, r['kabupaten'], r['provinsi']))
rasio = sorted(t/pop for _, t, pop, _, _ in dua)
pops = sorted(pop for _, _, pop, _, _ in dua)
def q(a, p): return a[int(p*(len(a)-1))]
res = {'baris_K2_saja_12bln': semua12, 'baris_K2_saja_terhubung_ke_penduduk': cocok,
       'rasio_terdampak_per_penduduk_persen': {'p10': q(rasio,.1)*100, 'median': q(rasio,.5)*100, 'p90': q(rasio,.9)*100, 'maks': rasio[-1]*100},
       'penduduk_kab_pada_baris_K2_saja': {'min': pops[0], 'median': q(pops,.5), 'maks': pops[-1]}}
# berapa baris K2-saja yang terdampaknya di bawah 0,1 persen penduduk kabupaten dan di bawah 1 persen
res['K2_saja_bawah_0_1_persen_penduduk'] = sum(1 for x in rasio if x < 0.001)
res['K2_saja_bawah_1_persen_penduduk'] = sum(1 for x in rasio if x < 0.01)
res['K2_saja_banjir'] = sum(1 for j, *_ in dua if j == 'Banjir')
# jumlah kabupaten (penduduk) terkecil dan terbesar di seluruh Indonesia
res['penduduk_kab_seluruh'] = {'n_kab': len(pk), 'min': min(pk.values()), 'median': statistics.median(pk.values()), 'maks': max(pk.values())}
# ambang menonjol per jenis lawan Juklak (DIBI 12 bulan, K2 saja dalam satuan orang; KK tidak tersedia di DIBI)
def hitung(jenis_sub, ambang):
    n50 = sum(1 for r in rows12 if r['kategori_bencana'] == jenis_sub and (r['menderita']+r['luka_sakit']+r['mengungsi']) >= 50)
    nA = sum(1 for r in rows12 if r['kategori_bencana'] == jenis_sub and (r['menderita']+r['luka_sakit']+r['mengungsi']) >= ambang)
    tot = sum(1 for r in rows12 if r['kategori_bencana'] == jenis_sub)
    return {'baris_jenis': tot, 'orang_ge_50': n50, 'orang_ge_ambang_menonjol': nA, 'ambang_menonjol_orang': ambang}
res['menonjol_banjir_200_orang'] = hitung('Banjir', 200)
res['menonjol_kekeringan_800_orang'] = hitung('Kekeringan', 800)
res['menonjol_longsor_40_orang'] = hitung('Longsor', 40)
json.dump(res, open(os.path.join(os.path.dirname(__file__), 'hasil', 'tambahan_B_p17_p58.json'), 'w', encoding='utf8'), ensure_ascii=False, indent=1)
print(json.dumps(res, ensure_ascii=False, indent=1))

# ---------------------------------------------------------------------------
# P-62 dan P-63: SK status darurat karhutla (public/data/status_darurat.json, dibuat 3 Nov 2026) lawan baris karhutla DIBI.
# Pertanyaan: bila K6 dibaca "ada SK status berlaku di provinsi", berapa baris karhutla DIBI 2026 otomatis memenuhi K6?
# ---------------------------------------------------------------------------
S = json.load(open(os.path.join(akar, 'public/data/status_darurat.json'), encoding='utf8'))['sk']
def karhutla_sk(s): return 'Kebakaran Hutan' in s['jenis'] or 'Asap' in s['jenis']
KS = [s for s in S if karhutla_sk(s) and s['skala'] == 'provinsi' and s['mulai'][:4] == '2026']
def tg(s): return datetime.date.fromisoformat(s)
rowsK = [r for r in D if r['kategori_bencana'] == 'Kebakaran hutan dan lahan' and datetime.date(2026,1,1) <= tgl(r) <= datetime.date(2026,11,12)]
def tercakup(r, hanya_tanggap=False):
    for s in KS:
        if s['prov'] != r['provinsi']: continue
        if hanya_tanggap and s['status'] != 'Tanggap Darurat': continue
        if tg(s['mulai']) <= tgl(r) <= tg(s['berakhir']): return True
    return False
r62 = {
 'sk_karhutla_provinsi_2026': len(KS),
 'sk_karhutla_semua': sum(1 for s in S if karhutla_sk(s)),
 'sk_karhutla_siaga': sum(1 for s in S if karhutla_sk(s) and s['status'] == 'Siaga Darurat'),
 'sk_karhutla_prov_2026_hari_median': statistics.median(s['hari'] for s in KS if s['hari']),
 'sk_karhutla_prov_2026_hari_maks': max(s['hari'] for s in KS if s['hari']),
 'sk_karhutla_prov_2026_lewat_batas_31': sum(1 for s in KS if s['lewat_batas']),
 'baris_karhutla_DIBI_2026_1jan_12nov': len(rowsK),
 'baris_dalam_SK_provinsi_siaga_atau_tanggap': sum(1 for r in rowsK if tercakup(r)),
 'baris_dalam_SK_provinsi_tanggap_saja': sum(1 for r in rowsK if tercakup(r, True)),
 'provinsi_dengan_baris_DIBI_dan_SK': sorted({r['provinsi'] for r in rowsK if tercakup(r)}),
}
json.dump(r62, open(os.path.join(os.path.dirname(__file__), 'hasil', 'tambahan_B_p62.json'), 'w', encoding='utf8'), ensure_ascii=False, indent=1)
print(json.dumps(r62, ensure_ascii=False, indent=1))

# ---------------------------------------------------------------------------
# P-16: uji penumpukan di ambang (bunching). Bila angka dimarkup demi lolos, jumlah baris tepat di atas ambang
# akan melebihi jumlah baris tepat di bawah ambang. Dihitung pada seluruh baris DIBI 2025 sampai 12 Nov 2026
# (tahun 2024 dibuang: tidak lengkap dan ambang belum diterapkan penuh, lihat SIM-KRITERIA 1.4).
# ---------------------------------------------------------------------------
rows25 = [r for r in D if tgl(r) >= datetime.date(2025,1,1)]
def K2(r): return r['menderita'] + r['luka_sakit'] + r['mengungsi']
def k3b(r): return k3(r)
def hist(fn, rentang):
    c = collections.Counter(fn(r) for r in rows25)
    return {f'{a}-{b}': sum(c[x] for x in range(a, b+1)) for a, b in rentang}
b = {
 'K2_orang': hist(K2, [(30,39),(40,49),(50,59),(60,69)]),
 'K2_orang_tepat': {str(x): sum(1 for r in rows25 if K2(r) == x) for x in (48,49,50,51,52)},
 'K2_orang_kelipatan_10_antara_30_dan_100': {str(x): sum(1 for r in rows25 if K2(r) == x) for x in (30,40,50,60,70,80,90,100)},
 'K3_unit': {str(x): sum(1 for r in rows25 if k3(r) == x) for x in (2,3,4,5,6,7,8)},
 'n_baris_2025_2026': len(rows25),
}
json.dump(b, open(os.path.join(os.path.dirname(__file__), 'hasil', 'tambahan_B_p16.json'), 'w', encoding='utf8'), ensure_ascii=False, indent=1)
print(json.dumps(b, ensure_ascii=False, indent=1))

# ---------------------------------------------------------------------------
# P-18 dan P-19: gempa tanpa dampak, banjir genangan (jenis_bencana DIBI) lawan K1 sampai K3, DIBI 12 bulan.
# ---------------------------------------------------------------------------
def lolos(r): return r['meninggal'] >= 1 or K2(r) >= 50 or k3(r) >= 5
def nol(r): return all(r[k] == 0 for k in ('meninggal','hilang','luka_sakit','menderita','mengungsi','rumah_rusak_berat','rumah_rusak_sedang','rumah_rusak_ringan','rumah_terendam','pendidikan_rusak','rumah_ibadat_rusak','fasyankes_rusak','fasum_rusak','kantor_rusak','jembatan_rusak'))
gem = [r for r in rows12 if r['kategori_bencana'] in ('Gempabumi', 'Tsunami')]
gen = [r for r in rows12 if r['jenis_bencana'].strip() == 'Banjir Genangan']
ban = [r for r in rows12 if r['kategori_bencana'] == 'Banjir']
kar = [r for r in rows12 if r['kategori_bencana'] == 'Kebakaran hutan dan lahan']
r1819 = {
 'gempa_baris': len(gem), 'gempa_lolos': sum(map(lolos, gem)), 'gempa_dampak_nol': sum(map(nol, gem)),
 'gempa_is_bencana_true': sum(1 for r in gem if r['is_bencana']),
 'banjir_genangan_baris': len(gen), 'banjir_genangan_lolos': sum(map(lolos, gen)), 'banjir_genangan_lolos_hanya_K2': sum(1 for r in gen if lolos(r) and r['meninggal']<1 and k3(r)<5),
 'banjir_baris': len(ban), 'banjir_lolos': sum(map(lolos, ban)),
 'karhutla_baris': len(kar), 'karhutla_dampak_nol': sum(map(nol, kar)), 'karhutla_is_bencana_true': sum(1 for r in kar if r['is_bencana']),
}
json.dump(r1819, open(os.path.join(os.path.dirname(__file__), 'hasil', 'tambahan_B_p18_p19.json'), 'w', encoding='utf8'), ensure_ascii=False, indent=1)
print(json.dumps(r1819, ensure_ascii=False, indent=1))

# ---------------------------------------------------------------------------
# P-13 dan P-20: sebaran luas karhutla di logbook CSV (data/pusdalops/logbook_kejadian.csv, kolom ha, hasil urai teks bebas).
# Dipakai untuk melihat apakah ada penumpukan tepat di ambang 1 ha dan 2 ha. Baris >= 10.000 ha dibuang (salah urai, SIM-KRITERIA 5).
# ---------------------------------------------------------------------------
import csv
rowsc = list(csv.DictReader(open(os.path.join(akar, 'data/pusdalops/logbook_kejadian.csv'), encoding='utf8')))
def sebar(awal, akhir=None):
    v = []
    for r in rowsc:
        if r['jenis'] != 'karhutla' or not r['ha']: continue
        if r['tgl_kejadian'][:4] < awal: continue
        if akhir and r['tgl_kejadian'][:4] > akhir: continue
        try: h = float(r['ha'])
        except ValueError: continue
        if h < 10000: v.append(h)
    return v
out13 = {}
for lab, a, b2 in (('2024_2026', '2024', None), ('2011_2026', '2011', None)):
    v = sebar(a, b2)
    c = collections.Counter(v)
    out13[lab] = {
     'n_baris_dengan_ha': len(v), 'median_ha': statistics.median(v),
     'di_bawah_1_ha': sum(1 for x in v if x < 1), 'tepat_1_ha': c[1.0], 'di_atas_1_sampai_di_bawah_2': sum(1 for x in v if 1 < x < 2),
     'tepat_2_ha': c[2.0], 'di_atas_2_sampai_5': sum(1 for x in v if 2 < x <= 5), 'tepat_5_ha': c[5.0], 'tepat_10_ha': c[10.0],
     'ha_0_5_sampai_0_99': sum(1 for x in v if 0.5 <= x < 1), 'ha_1_sampai_1_5': sum(1 for x in v if 1 <= x <= 1.5),
     'ge_1': sum(1 for x in v if x >= 1), 'ge_2': sum(1 for x in v if x >= 2), 'ge_50': sum(1 for x in v if x >= 50),
    }
json.dump(out13, open(os.path.join(os.path.dirname(__file__), 'hasil', 'tambahan_B_p13.json'), 'w', encoding='utf8'), ensure_ascii=False, indent=1)
print(json.dumps(out13, ensure_ascii=False, indent=1))

# ---------------------------------------------------------------------------
# P-51: baris DIBI 12 bulan yang lolos K1-K3 hanya karena orang mengungsi (K2 dipenuhi oleh kolom mengungsi, tanpa meninggal,
# tanpa rumah rusak 5 unit, dan menderita + luka di bawah 50), menurut kategori. DIBI tidak membedakan mengungsi karena
# kerusakan dan mengungsi karena peringatan, jadi ini batas atas evakuasi preventif.
# ---------------------------------------------------------------------------
pre = collections.Counter(); pre_all = collections.Counter()
for r in rows12:
    if r['meninggal'] < 1 and k3(r) < 5 and K2(r) >= 50:
        pre_all[r['kategori_bencana']] += 1
        if r['menderita'] + r['luka_sakit'] < 50 and r['mengungsi'] >= 50:
            pre[r['kategori_bencana']] += 1
r51 = {'lolos_hanya_K2_semua': sum(pre_all.values()), 'lolos_hanya_karena_mengungsi': sum(pre.values()),
       'per_kategori_mengungsi': dict(pre.most_common()), 'per_kategori_K2_saja': dict(pre_all.most_common()),
       'erupsi_baris': sum(1 for r in rows12 if r['kategori_bencana']=='Erupsi gunung api'),
       'erupsi_lolos_karena_mengungsi': pre.get('Erupsi gunung api', 0)}
json.dump(r51, open(os.path.join(os.path.dirname(__file__), 'hasil', 'tambahan_B_p51.json'), 'w', encoding='utf8'), ensure_ascii=False, indent=1)
print(json.dumps(r51, ensure_ascii=False, indent=1))

# ---------------------------------------------------------------------------
# P-20: kolom ha di logbook CSV menurut jenis (kejadian bertanggal 2024 ke atas; baris >= 10.000 ha dibuang).
# ---------------------------------------------------------------------------
r20 = {}
for j in ('banjir', 'kekeringan', 'karhutla', 'longsor', 'cuaca'):
    n = 0; v = []
    for r in rowsc:
        if r['jenis'] != j or r['tgl_kejadian'][:4] < '2024': continue
        n += 1
        if r['ha']:
            h = float(r['ha'])
            if h < 10000: v.append(h)
    r20[j] = {'kejadian': n, 'dengan_ha': len(v), 'median_ha': statistics.median(v) if v else None, 'ge_1_ha': sum(1 for x in v if x >= 1)}
json.dump(r20, open(os.path.join(os.path.dirname(__file__), 'hasil', 'tambahan_B_p20.json'), 'w', encoding='utf8'), ensure_ascii=False, indent=1)
print(json.dumps(r20, ensure_ascii=False))
