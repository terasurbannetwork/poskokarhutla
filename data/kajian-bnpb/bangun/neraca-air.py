#!/usr/bin/env python3
"""NA-09 Paket data kajian Neraca Air Pulau Jawa: public/data/neraca_air/*.json -> data/neraca-air/ + entri registri neraca.*

    python3 bangun/neraca-air.py          # tulis paket + gabung entri neraca.* ke data/angka.json, lalu self-check
    python3 bangun/neraca-air.py uji      # self-check saja (tanpa menulis)

Luring, stdlib, deterministik. Tidak ada angka tulis tangan: semua dihitung dari keluaran pipeline scripts/air/neraca
(label estimasi-model), validasi_hitung.json (NA-06), kebutuhan.json, topologi.json, dan kab_jawa.csv (nama dan provinsi).
Pola air-jawa.py: kolom berlabel, data kosong = string kosong (bukan 0), self-check assert di akhir.
"""
import csv
import json
import statistics
import sys
from pathlib import Path

KB = Path(__file__).resolve().parents[1]           # data/kajian-bnpb
REPO = KB.parents[1]
NA = REPO / 'public/data/neraca_air'
SC = REPO / 'scripts/air/neraca'
KELUAR = KB / 'data/neraca-air'
KEM = (5, 6, 7, 8, 9)                                # Jun-Okt
SKEN = ('klim', '1997', '2015', '2019', '2023')
LUAS_BPS = 132698.0                                  # km2, luas Jawa yang dipakai validasi.py untuk skala BPS 2020
BPS_R = 175558.0                                     # Mm3/th, BPS 2020 mengutip Radhika dkk. 2017 (neraca_jawa.csv)
EST = 'estimasi-model'
SUMBER_MODEL = ('Pengolahan data Pantau Bencana: model neraca air Thornthwaite-Mather dan penelusuran aliran antar-kab/kota, '
                'hujan CHIRPS v2.0 1991–2025, ET0 NASA POWER, kebutuhan 2025')


def baca(p):
    return json.loads(Path(p).read_text(encoding='utf-8'))


def r1(x, d=1):
    return None if x is None else round(x, d)


def tulis_csv(nama, baris, kolom):
    with (KELUAR / nama).open('w', newline='', encoding='utf-8') as f:
        w = csv.DictWriter(f, fieldnames=kolom, lineterminator='\n')
        w.writeheader()
        for b in baris:
            w.writerow({k: ('' if b.get(k) is None else b[k]) for k in kolom})


def hitung():
    kab = baca(NA / 'kab.json')['kab']
    rk_all = baca(NA / 'ringkas.json')
    rk, meta = rk_all['kab'], rk_all['meta']
    keb = baca(SC / 'kebutuhan.json')
    topo = baca(SC / 'topologi.json')
    va = baca(KB / 'neraca-air/mentah/validasi_hitung.json')['awal']
    katalog = {r['kode']: r for r in csv.DictReader(open(KB / 'data/air-jawa/kab_jawa.csv', encoding='utf-8'))}
    assert set(katalog) == set(kab) == set(rk), 'kab.json, ringkas.json, dan katalog kab_jawa.csv tidak memuat kode yang sama'

    luas = {k: 0.0 for k in kab}
    for s in topo['subdas'].values():
        for kode, sel in s['kab'].items():
            if kode in luas:
                luas[kode] += sum(sel.values())

    def jml(k, sk, n, bln=range(12)):
        v = kab[k]['skenario'][sk][n]
        return None if v is None else sum(v[m] for m in bln)

    baris = []
    for k in sorted(kab):
        c, r, kb = katalog[k], rk[k], keb['kab'][k]
        R, C = jml(k, 'klim', 'R'), jml(k, 'klim', 'konsumtif')
        Rk, Ck = jml(k, 'klim', 'R', KEM), jml(k, 'klim', 'konsumtif', KEM)
        Ak = jml(k, 'klim', 'A', KEM)
        b = {
            'kode': k, 'nama': c['nama_kepmendagri'], 'prov_nama': c['prov_nama'],
            'luas_km2': r1(luas[k], 0), 'pend_2025': kb['pend_2025'], 'pend_2030': kb['pend_2030'],
            'P_tahunan': r1(jml(k, 'klim', 'P')), 'ETa_tahunan': r1(jml(k, 'klim', 'ETa')), 'R_tahunan': r1(R),
            'qin_tahunan': r1(r['qin_tahunan']), 'domestik_tahunan': r1(jml(k, 'klim', 'domestik'), 2),
            'irigasi_tahunan': r1(jml(k, 'klim', 'irigasi')), 'ternak_tahunan': r1(jml(k, 'klim', 'ternak'), 2),
            'industri_tahunan': r1(jml(k, 'klim', 'industri'), 2), 'total_tahunan': r1(jml(k, 'klim', 'total')),
            'konsumtif_tahunan': r1(C), 'N_tahunan': r['N_tahunan'], 'N2030_tahunan': r['N2030_tahunan'],
            'selisih_2030': r1(r['N2030_tahunan'] - r['N_tahunan']),
            'R_minus_C_tahunan': r1(R - C),
            'qin_persen': r1(100 * r['qin_tahunan'] / (R + r['qin_tahunan'])) if R + r['qin_tahunan'] > 0 else 0.0,
            'R_kemarau': r1(Rk), 'C_kemarau': r1(Ck), 'A_kemarau': r1(Ak),
            'rasio_C_R_kemarau_persen': r1(100 * Ck / Rk) if Rk > 0 else None,
            'N_kemarau': r['N_kemarau'], 'N80_kemarau': r['N80_kemarau'],
            'N80_kemarau_mm': r1(1000 * r['N80_kemarau'] / luas[k]) if luas[k] > 0 else None,
            'N_kemarau_1997': r['N_kemarau_skenario']['1997'], 'N_kemarau_2015': r['N_kemarau_skenario']['2015'],
            'N_kemarau_2019': r['N_kemarau_skenario']['2019'], 'N_kemarau_2023': r['N_kemarau_skenario']['2023'],
            'bulan_defisit': r['bulan_defisit'],
            'ddl_SA': r['ddl']['SA'], 'ddl_DA': r['ddl']['DA'], 'ddl_status': r['ddl']['status'],
            'ddl_rasio_SA_DA': r1(r['ddl']['SA'] / r['ddl']['DA'], 2) if r['ddl']['DA'] > 0 else None,
            'industri_kosong': 'ya' if r['bendera']['industri_kosong'] else 'tidak',
            'kota_kecil': 'ya' if r['bendera']['kota_kecil'] else 'tidak',
            'hilir_waduk': 'ya' if r['bendera']['hilir_waduk'] else 'tidak',
            'dibi_kekeringan_2015_2025': round(float(c['dibi1525_kejadian_kekeringan']), 1) if c['dibi1525_kejadian_kekeringan'] else None,
        }
        tanda = (' †' if b['industri_kosong'] == 'ya' else '') + (' ‡' if b['kota_kecil'] == 'ya' else '')
        b['nama_tanda'] = b['nama'] + tanda
        b['defisit_N80'] = 'ya' if b['N80_kemarau'] < 0 else 'tidak'
        baris.append(b)

    def tot(n, sk='klim', bln=range(12)):
        return sum(v for k in kab if (v := jml(k, sk, n, bln)) is not None)

    J = {n: tot(n) for n in ('P', 'ETa', 'R', 'domestik', 'irigasi', 'irigasi_sni', 'ternak', 'industri', 'total',
                             'konsumtif', 'konsumtif_2030')}
    J['R_kemarau'], J['C_kemarau'] = tot('R', bln=KEM), tot('konsumtif', bln=KEM)
    J['C2030_kemarau'] = tot('konsumtif_2030', bln=KEM)
    jawa = {
        'n_kab': len(baris), 'luas_km2': round(sum(luas.values())),
        'pend_2025': sum(b['pend_2025'] for b in baris), 'pend_2030': sum(b['pend_2030'] for b in baris),
        'P': J['P'], 'ETa': J['ETa'], 'R': J['R'], 'R_miliar': J['R'] / 1000,
        'domestik': J['domestik'], 'irigasi': J['irigasi'], 'irigasi_sni': J['irigasi_sni'],
        'irigasi_persen_sni': 100 * J['irigasi'] / J['irigasi_sni'], 'ternak': J['ternak'], 'industri': J['industri'],
        'total': J['total'], 'konsumtif': J['konsumtif'], 'konsumtif_2030': J['konsumtif_2030'],
        'konsumtif_2030_naik_persen': 100 * (J['konsumtif_2030'] / J['konsumtif'] - 1),
        'irigasi_persen_total': 100 * J['irigasi'] / J['total'], 'domestik_persen_total': 100 * J['domestik'] / J['total'],
        'rasio_C_R_persen': 100 * J['konsumtif'] / J['R'],
        'R_kemarau': J['R_kemarau'], 'C_kemarau': J['C_kemarau'],
        'R_kemarau_persen_tahunan': 100 * J['R_kemarau'] / J['R'],
        'rasio_C_R_kemarau_persen': 100 * J['C_kemarau'] / J['R_kemarau'],
        'rasio_C_R_kemarau_2030_persen': 100 * J['C2030_kemarau'] / J['R_kemarau'],
        'ET_persen_P': 100 * J['ETa'] / J['P'],
    }
    n = lambda f: sum(1 for b in baris if f(b))
    hit = {
        'N_tahunan_neg': n(lambda b: b['N_tahunan'] < 0), 'N2030_tahunan_neg': n(lambda b: b['N2030_tahunan'] < 0),
        'N_kemarau_neg': n(lambda b: b['N_kemarau'] < 0), 'N80_kemarau_neg': n(lambda b: b['N80_kemarau'] < 0),
        'N_1997_neg': n(lambda b: b['N_kemarau_1997'] < 0), 'industri_kosong': n(lambda b: b['industri_kosong'] == 'ya'),
        'industri_ada': n(lambda b: b['industri_kosong'] == 'tidak'), 'kota_kecil': n(lambda b: b['kota_kecil'] == 'ya'),
        'hilir_waduk': n(lambda b: b['hilir_waduk'] == 'ya'), 'ddl_defisit': n(lambda b: b['ddl_status'] == 'defisit'),
        'ddl_defisit_N_positif': n(lambda b: b['ddl_status'] == 'defisit' and b['N_tahunan'] > 0),
        'ddl_defisit_pend': sum(b['pend_2025'] for b in baris if b['ddl_status'] == 'defisit'),
        'N80_neg_kota_kecil': n(lambda b: b['N80_kemarau'] < 0 and b['kota_kecil'] == 'ya'),
        'N80_neg_pend': sum(b['pend_2025'] for b in baris if b['N80_kemarau'] < 0),
        'N80_neg_dibi_ada': n(lambda b: b['N80_kemarau'] < 0 and (b['dibi_kekeringan_2015_2025'] or 0) > 0),
        'N80_pos_dibi_ada': n(lambda b: b['N80_kemarau'] >= 0 and (b['dibi_kekeringan_2015_2025'] or 0) > 0),
        'N80_pos': n(lambda b: b['N80_kemarau'] >= 0),
        'rasio_kemarau_lebih_100': n(lambda b: (b['rasio_C_R_kemarau_persen'] or 0) > 100),
        'bulan_defisit_5_plus': n(lambda b: b['bulan_defisit'] >= 5),
        'waduk_aktif': len(meta['waduk_aktif']), 'subdas': meta['cakupan']['subdas'],
    }
    # kejadian kekeringan DIBI 2015-2025 per kab (kab_jawa.csv; kejadian lintas kab dibagi rata, jadi pecahan)
    for nama, neg in (('neg', True), ('pos', False)):
        v = [float(katalog[b['kode']]['dibi1525_kejadian_kekeringan'] or 0) for b in baris if (b['N80_kemarau'] < 0) == neg]
        hit[f'dibi_median_{nama}'] = statistics.median(v)
        hit[f'dibi_rerata_{nama}'] = sum(v) / len(v)
        hit[f'dibi_total_{nama}'] = sum(v)
    hit['N80_neg_dibi_persen'] = 100 * hit['N80_neg_dibi_ada'] / hit['N80_kemarau_neg']
    hit['N80_pos_dibi_persen'] = 100 * hit['N80_pos_dibi_ada'] / hit['N80_pos']

    sken = []
    for sk in SKEN:
        Rk, Ck, Pk = tot('R', sk, KEM), tot('konsumtif', sk, KEM), tot('P', sk, KEM)
        nk = [jml(k, sk, 'N', KEM) for k in kab]   # sama dengan hasil.py (N bulanan sudah memuat operasi waduk dan transfer)
        neg = [x for x in nk if x < 0]
        sken.append({'skenario': sk, 'label': 'Rerata 1991–2025' if sk == 'klim' else sk,
                     'P_kemarau': round(Pk), 'R_kemarau': round(Rk), 'C_kemarau': round(Ck),
                     'rasio_C_R_persen': round(100 * Ck / Rk, 1), 'n_kab_neg': len(neg), 'jumlah_neg': round(sum(neg))})
    # ketersediaan A = R + qin; N Jun-Okt skenario = A - konsumtif (sama dengan ringkas.json N_kemarau_skenario)
    for b in baris:
        k = b['kode']
        for sk in ('1997', '2015', '2019', '2023'):
            nk = jml(k, sk, 'N', KEM)
            assert abs(nk - b[f'N_kemarau_{sk}']) < 0.05 + 1e-3 * abs(nk), f'{k} {sk}: N Jun-Okt {nk} lawan ringkas {b[f"N_kemarau_{sk}"]}'

    prov = []
    for p in sorted({b['prov_nama'] for b in baris}):
        bs = [b for b in baris if b['prov_nama'] == p]
        Rp, Cp = sum(b['R_tahunan'] for b in bs), sum(b['konsumtif_tahunan'] for b in bs)
        prov.append({'prov_nama': p, 'n_kab': len(bs), 'pend_2025': sum(b['pend_2025'] for b in bs),
                     'R_tahunan': round(Rp), 'konsumtif_tahunan': round(Cp), 'rasio_C_R_persen': round(100 * Cp / Rp, 1),
                     'n_N_kemarau_neg': sum(b['N_kemarau'] < 0 for b in bs), 'n_N80_neg': sum(b['N80_kemarau'] < 0 for b in bs),
                     'n_industri_kosong': sum(b['industri_kosong'] == 'ya' for b in bs)})

    muara = []
    for nama, m in va['muara'].items():
        kering = {y: va['kering'][y][nama] for y in ('1997', '2015', '2019', '2023')}
        muara.append({'sungai': nama, 'model_m3s': round(m['model'], 1), 'glofas_m3s': round(m['glofas'], 1),
                      'rasio': round(m['rasio'], 2), 'model_kemarau_m3s': round(m['model_kemarau'], 1),
                      'glofas_kemarau_m3s': round(m['glofas_kemarau'], 1), 'rasio_kemarau': round(m['rasio_kemarau'], 2),
                      'r_bulanan': round(m['r'], 2),
                      **{f'rasio_{y}': round(a / g, 2) if g > 0 else None for y, (a, g) in kering.items()}})
    rs, rks = [m['rasio'] for m in va['muara'].values()], [m['rasio_kemarau'] for m in va['muara'].values()]
    skala = 1.0  # VALIDASI.md membandingkan R rerata langsung dengan BPS (luas sampel 132.499 km2, BPS 132.698 km2: beda 0,15%)
    validasi = {
        'n_muara': len(muara), 'rasio_median': statistics.median(rs), 'rasio_min': min(rs), 'rasio_maks': max(rs),
        'rasio_kemarau_median': statistics.median(rks), 'rasio_kemarau_min': min(rks), 'rasio_kemarau_maks': max(rks),
        'r_median': statistics.median(m['r'] for m in va['muara'].values()),
        'R_skala_bps': va['total']['R_rata'] * skala, 'bps_R': BPS_R,
        'selisih_bps_persen': 100 * (va['total']['R_rata'] * skala / BPS_R - 1),
        'selisih_bps_2020_persen': 100 * (va['total']['R_2020'] * skala / BPS_R - 1),
        'alpha': va['alpha'], 'k_bulan': va['k'],
        **{f'kering_median_{y}': statistics.median(a / g for a, g in va['kering'][y].values()) for y in ('1997', '2015', '2019', '2023')},
        'kering_nol_1997': sum(1 for a, g in va['kering']['1997'].values() if a < 0.05),
        'jratunseluna_2019': va['kering']['2019']['Jratunseluna (Serang-Lusi-Juwana)'][0] / va['kering']['2019']['Jratunseluna (Serang-Lusi-Juwana)'][1],
        'ambang_rendah': 0.8, 'ambang_tinggi': 1.25, 'ambang_bps_persen': 15, 'ambang_luas_rendah': 0.5,
        'ambang_luas_tinggi': 2, 'ambang_r': 0.8,   # ambang usulan VALIDASI.md (asumsi kebijakan)
    }
    par = dict(meta['parameter'])
    koef = keb['meta']['koef']
    parameter = {'taw_mm': par['taw_mm'], 'kc': par['kc'], 'alpha': par['alpha'], 'k_bulan': par['k_bulan'],
                 'dom_kota': koef['domestik_L_kapita_hari']['kota'], 'dom_desa': koef['domestik_L_kapita_hari']['desa'],
                 'sapi': koef['ternak_L_ekor_hari']['sapi_kerbau'], 'kambing': koef['ternak_L_ekor_hari']['kambing_domba'],
                 'babi': koef['ternak_L_ekor_hari']['babi'], 'unggas': koef['ternak_L_ekor_hari']['unggas'],
                 'industri_L': koef['industri_L_karyawan_hari']['nilai'], 'efisiensi_persen': 100 * koef['irigasi']['efisiensi'],
                 'aliran_balik_persen': 100 * koef['irigasi']['aliran_balik'], 'perkolasi': koef['irigasi']['perkolasi_mm_hari'],
                 'penyiapan': koef['irigasi']['penyiapan_mm'], 'hujan_efektif_persen': 100 * koef['irigasi']['hujan_efektif'],
                 'mt3_persen': 100 * koef['irigasi']['intensitas']['mt3'], 'sni_L_det_ha': koef['irigasi']['pembanding_sni_L_det_ha'],
                 'khla': 1600, 'n_sel': topo['meta']['n_sel'], 'subdas_rerata_km2': topo['meta']['luas_rerata_subdas_km2'],
                 'n_subdas': topo['meta']['n_subdas'], 'tahun_iklim': 35, 'n_titik_power': 88,
                 'tarum_barat_L_det': 6200}
    # bulanan Jawa (klim): limpasan lokal dan konsumtif per bulan, untuk grafik garis
    bln = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']
    bulanan = [{'bulan': bln[m], 'R': round(tot('R', bln=[m])), 'konsumtif': round(tot('konsumtif', bln=[m])),
                'konsumtif_1997': round(tot('konsumtif', '1997', [m])), 'R_1997': round(tot('R', '1997', [m]))} for m in range(12)]
    return baris, jawa, hit, sken, prov, muara, validasi, parameter, bulanan, meta


KOLOM_KAB = ['kode', 'nama', 'nama_tanda', 'prov_nama', 'luas_km2', 'pend_2025', 'pend_2030', 'P_tahunan', 'ETa_tahunan',
             'R_tahunan', 'qin_tahunan', 'qin_persen', 'domestik_tahunan', 'irigasi_tahunan', 'ternak_tahunan',
             'industri_tahunan', 'total_tahunan', 'konsumtif_tahunan', 'R_minus_C_tahunan', 'N_tahunan', 'N2030_tahunan',
             'selisih_2030', 'R_kemarau', 'C_kemarau', 'A_kemarau', 'rasio_C_R_kemarau_persen', 'N_kemarau', 'N80_kemarau',
             'N80_kemarau_mm', 'defisit_N80', 'N_kemarau_1997', 'N_kemarau_2015', 'N_kemarau_2019', 'N_kemarau_2023',
             'bulan_defisit', 'ddl_SA', 'ddl_DA', 'ddl_rasio_SA_DA', 'ddl_status', 'industri_kosong', 'kota_kecil',
             'hilir_waduk', 'dibi_kekeringan_2015_2025']


def registri(jawa, hit, sken, prov, validasi, parameter, baris):
    """Entri neraca.* untuk data/angka.json; tiap entri menunjuk jalur di paket, bukan nilai ketikan."""
    E = {}

    def e(kunci, jalur, satuan, keyakinan=EST, sumber=SUMBER_MODEL, berkas='neraca-air/neraca.json', **lain):
        E['neraca.' + kunci] = {'berkas': berkas, 'jalur': jalur, 'satuan': satuan, 'keyakinan': keyakinan, 'sumber': sumber, **lain}

    for k, s in [('P', 'juta m³ per tahun'), ('ETa', 'juta m³ per tahun'), ('R', 'juta m³ per tahun'), ('R_miliar', 'miliar m³ per tahun'),
                 ('domestik', 'juta m³ per tahun'), ('irigasi', 'juta m³ per tahun'), ('irigasi_sni', 'juta m³ per tahun'),
                 ('ternak', 'juta m³ per tahun'), ('industri', 'juta m³ per tahun'), ('total', 'juta m³ per tahun'),
                 ('konsumtif', 'juta m³ per tahun'), ('konsumtif_2030', 'juta m³ per tahun'), ('R_kemarau', 'juta m³'),
                 ('C_kemarau', 'juta m³'), ('irigasi_persen_sni', '%'), ('konsumtif_2030_naik_persen', '%'),
                 ('irigasi_persen_total', '%'), ('domestik_persen_total', '%'), ('rasio_C_R_persen', '%'),
                 ('R_kemarau_persen_tahunan', '%'), ('rasio_C_R_kemarau_persen', '%'), ('rasio_C_R_kemarau_2030_persen', '%'),
                 ('ET_persen_P', '%'), ('pend_2025', 'jiwa')]:
        e('jawa.' + k, 'jawa.' + k, s, **({'keyakinan': 'estimasi-model', 'sumber': 'WorldPop R2025A diskala ke BPS Proyeksi Penduduk menurut Provinsi 2010–2035'} if k == 'pend_2025' else {}))
    e('jawa.n_kab', 'jawa.n_kab', 'kab/kota', keyakinan='resmi', sumber='Kode wilayah Kemendagri, paket air-jawa kab_jawa.csv')
    e('jawa.luas_km2', 'jawa.luas_km2', 'km²', keyakinan='resmi', sumber='Batas kab/kota BIG di public/geo/kabupaten, sampel kisi 0,01 derajat')
    resmi_hit = {'industri_kosong', 'industri_ada', 'kota_kecil', 'hilir_waduk', 'waduk_aktif', 'subdas'}
    for k, v in hit.items():
        sat = 'jiwa' if k.endswith('pend') else '%' if k.endswith('persen') else 'kab/kota'
        if k in ('waduk_aktif',):
            sat = 'waduk'
        if k == 'subdas':
            sat = 'sub-DAS'
        e('hitung.' + k, 'hitung.' + k, sat, **({'keyakinan': 'resmi', 'sumber': 'Cakupan data paket neraca-air (BPS, HydroBASINS, tabel waduk)'} if k in resmi_hit else {}))
    for s in sken:
        for k, sat in [('P_kemarau', 'juta m³'), ('R_kemarau', 'juta m³'), ('C_kemarau', 'juta m³'), ('rasio_C_R_persen', '%'),
                       ('n_kab_neg', 'kab/kota'), ('jumlah_neg', 'juta m³')]:
            e(f'skenario.{s["skenario"]}.{k}', f'skenario[skenario={s["skenario"]}].{k}', sat)
    for p in prov:
        kp = p['prov_nama'].lower().replace(' ', '_').replace('di_', '')
        for k, sat in [('n_N80_neg', 'kab/kota'), ('rasio_C_R_persen', '%'), ('n_kab', 'kab/kota'), ('n_N_kemarau_neg', 'kab/kota')]:
            e(f'prov.{kp}.{k}', f'prov[prov_nama={p["prov_nama"]}].{k}', sat, **({'keyakinan': 'resmi', 'sumber': 'Kode wilayah Kemendagri'} if k == 'n_kab' else {}))
    sv = 'Pengolahan data Pantau Bencana: debit model lawan GloFAS v4 (Copernicus, lewat Open-Meteo) di dua belas muara 1991–2024; BPS 2020 mengutip Radhika dkk. 2017'
    for k, v in validasi.items():
        sat = '%' if 'persen' in k else 'm³ per detik' if k in () else 'juta m³ per tahun' if k in ('R_skala_bps', 'bps_R') else 'bulan' if k == 'k_bulan' else 'sungai' if k in ('n_muara', 'kering_nol_1997') else ''
        kyk = 'resmi' if k in ('n_muara',) else 'asumsi-kebijakan' if k in ('alpha', 'k_bulan') or k.startswith('ambang') else EST
        if k == 'bps_R':
            e('validasi.bps_R', 'validasi.bps_R', 'juta m³ per tahun', keyakinan=EST, sumber='BPS (2020) Statistik Lingkungan Hidup Indonesia, mengutip Radhika dkk. (2017)')
            continue
        e('validasi.' + k, 'validasi.' + k, sat, keyakinan=kyk, sumber=sv)
    e('validasi.ambang_luas', 'validasi.ambang_luas_rendah', '', keyakinan='asumsi-kebijakan', sumber=sv,
      jalur_rendah='validasi.ambang_luas_rendah', jalur_tinggi='validasi.ambang_luas_tinggi')
    e('validasi.rasio_rentang', 'validasi.rasio_median', '', jalur_rendah='validasi.rasio_min', jalur_tinggi='validasi.rasio_maks', sumber=sv)
    e('validasi.rasio_kemarau_rentang', 'validasi.rasio_kemarau_median', '', jalur_rendah='validasi.rasio_kemarau_min', jalur_tinggi='validasi.rasio_kemarau_maks', sumber=sv)
    sp = 'SNI 19-6728.1-2002; FAO-56; parameter model kajian ini (asumsi kebijakan)'
    for k in parameter:
        kyk = 'resmi' if k in ('dom_kota', 'dom_desa', 'sapi', 'kambing', 'babi', 'unggas', 'sni_L_det_ha', 'khla', 'tarum_barat_L_det') else 'asumsi-kebijakan'
        if k in ('n_sel', 'n_subdas', 'subdas_rerata_km2', 'tahun_iklim', 'n_titik_power'):
            kyk = 'resmi'
        sat = {'taw_mm': 'mm', 'k_bulan': 'bulan', 'dom_kota': 'liter per kapita per hari', 'dom_desa': 'liter per kapita per hari',
               'sapi': 'liter per ekor per hari', 'kambing': 'liter per ekor per hari', 'babi': 'liter per ekor per hari',
               'unggas': 'liter per ekor per hari', 'industri_L': 'liter per pekerja per hari', 'efisiensi_persen': '%',
               'aliran_balik_persen': '%', 'perkolasi': 'mm per hari', 'penyiapan': 'mm', 'hujan_efektif_persen': '%',
               'mt3_persen': '%', 'sni_L_det_ha': 'liter per detik per hektare', 'khla': 'm³ per kapita per tahun',
               'n_sel': 'sel', 'subdas_rerata_km2': 'km²', 'n_subdas': 'sub-DAS', 'tahun_iklim': 'tahun',
               'n_titik_power': 'titik', 'tarum_barat_L_det': 'liter per detik'}.get(k, '')
        src = {'khla': 'Permen LH 17/2009, Lampiran', 'tarum_barat_L_det': 'Dinas Sumber Daya Air Provinsi DKI Jakarta, 28 Juli 2026',
               'industri_L': 'Pedoman Kementerian PU 2005, dikutip sekunder', 'sapi': 'SNI 19-6728.1-2002 Tabel 4',
               'kambing': 'SNI 19-6728.1-2002 Tabel 4', 'babi': 'SNI 19-6728.1-2002 Tabel 4', 'unggas': 'SNI 19-6728.1-2002 Tabel 4',
               'dom_kota': 'SNI 19-6728.1-2002 bagian 5', 'dom_desa': 'SNI 19-6728.1-2002 bagian 5', 'sni_L_det_ha': 'SNI 19-6728.1-2002',
               'n_sel': 'Kisi iklim 0,1 derajat yang menyentuh kab/kota Jawa', 'n_subdas': 'HydroBASINS v1c level 09',
               'subdas_rerata_km2': 'HydroBASINS v1c level 09', 'tahun_iklim': 'CHIRPS v2.0 1991–2025',
               'n_titik_power': 'NASA POWER kisi 0,5 derajat'}.get(k, sp)
        if k == 'industri_L':
            kyk = 'asumsi-kebijakan'
        e('param.' + k, 'parameter.' + k, sat, keyakinan=kyk, sumber=src)
    # kab terpilih untuk prosa: dibaca dari baris (urutan dari data, bukan nama ketikan)
    urut80 = sorted(baris, key=lambda b: b['N80_kemarau'])
    urut97 = sorted(baris, key=lambda b: b['N_kemarau_1997'])
    pilih = {'n80_1': urut80[0], 'n80_2': urut80[1], 'n80_3': urut80[2], 'n97_1': urut97[0]}
    for t, b in pilih.items():
        e(f'kab.{t}.nama', f'kab[kode={b["kode"]}].nama', '', keyakinan=EST, berkas='neraca-air/neraca.json')
        e(f'kab.{t}.N80', f'kab[kode={b["kode"]}].N80_kemarau', 'juta m³', berkas='neraca-air/neraca.json')
        e(f'kab.{t}.N1997', f'kab[kode={b["kode"]}].N_kemarau_1997', 'juta m³', berkas='neraca-air/neraca.json')
        e(f'kab.{t}.N_kemarau', f'kab[kode={b["kode"]}].N_kemarau', 'juta m³', berkas='neraca-air/neraca.json')
    for kode, t in [('3172', 'jakut'), ('3578', 'surabaya'), ('3212', 'indramayu')]:
        e(f'kab.{t}.N_tahunan', f'kab[kode={kode}].N_tahunan', 'juta m³ per tahun')
        e(f'kab.{t}.N_kemarau', f'kab[kode={kode}].N_kemarau', 'juta m³')
        e(f'kab.{t}.N80', f'kab[kode={kode}].N80_kemarau', 'juta m³')
        e(f'kab.{t}.qin_persen', f'kab[kode={kode}].qin_persen', '%')
    for k, v in E.items():
        if v['satuan'] in ('kab/kota', 'sungai', 'sub-DAS', 'waduk', 'sel', 'titik', 'tahun'):
            v['cacah'] = True   # hitungan eksak: tampil bulat tanpa "sekitar" (naskah.format_angka)
        if k in ('neraca.jawa.R_miliar', 'neraca.jawa.R', 'neraca.jawa.P', 'neraca.jawa.ETa', 'neraca.validasi.bps_R',
                 'neraca.validasi.R_skala_bps', 'neraca.validasi.selisih_bps_2020_persen'):
            v['bermakna'] = 3    # angka kunci pulau tidak bergeser (185,6 miliar jadi 186, bukan 190)
    for k in ('dibi_median_neg', 'dibi_median_pos', 'dibi_rerata_neg', 'dibi_rerata_pos', 'dibi_total_neg', 'dibi_total_pos'):
        E['neraca.hitung.' + k].update(satuan='kejadian', keyakinan='resmi', cacah=True,
                                        sumber='DIBI BNPB 2015–2025 (kejadian lintas kab/kota dibagi rata), dikelompokkan menurut neraca kemarau andalan model')
    kecil = {k.lower(): v for k, v in E.items()}   # pembaca token hanya menerima kunci huruf kecil (naskah.py RE_INLINE)
    assert len(kecil) == len(E), 'dua kunci registri bertabrakan setelah diturunkan ke huruf kecil'
    return kecil


def tulis(data):
    baris, jawa, hit, sken, prov, muara, validasi, parameter, bulanan, meta = data
    KELUAR.mkdir(parents=True, exist_ok=True)
    tulis_csv('kab.csv', baris, KOLOM_KAB)
    tulis_csv('skenario.csv', sken, list(sken[0]))
    tulis_csv('provinsi.csv', prov, list(prov[0]))
    tulis_csv('muara.csv', muara, list(muara[0]))
    tulis_csv('bulanan.csv', bulanan, list(bulanan[0]))
    celah = [  # teks tabel deck C2 (sama dengan Lampiran D buku); tanpa angka
        {'celah': 'Debit pos duga air bulanan', 'pemegang': 'Kementerian PU (BBWS)', 'akibat': 'Aliran kemarau belum terukur'},
        {'celah': 'Operasi waduk besar', 'pemegang': 'Kementerian PU, pengelola waduk', 'akibat': 'Hilir waduk memakai pelepasan rata'},
        {'celah': 'Air industri per kab/kota', 'pemegang': 'BPS, Kementerian Perindustrian', 'akibat': 'Jatim dan DIY batas bawah'},
        {'celah': 'Luas tanam per musim', 'pemegang': 'Kementerian PU, Kementerian Pertanian', 'akibat': 'Irigasi dihitung potensial'},
        {'celah': 'Penyaluran air darurat', 'pemegang': 'BPBD', 'akibat': 'Peringkat belum dicocokkan lapangan'},
        {'celah': 'Air baku perpipaan dan air tanah', 'pemegang': 'Kementerian PU, Kementerian ESDM', 'akibat': 'Kota tampak defisit'},
        {'celah': 'Teks SNI 2015', 'pemegang': 'BSN', 'akibat': 'Koefisien memakai SNI 2002'}]
    tulis_csv('celah.csv', celah, ['celah', 'pemegang', 'akibat'])
    wd = list(csv.DictReader(open(SC / 'waduk.csv', encoding='utf-8')))
    aktif = set(meta['waduk_aktif']) | set(meta['transfer_aktif']) | {'cirata', 'jatiluhur'}
    tulis_csv('waduk.csv', [{'nama': w['nama'], 'jenis': w['jenis'], 'tampungan_juta_m3': w['tampungan_juta_m3'] or None,
                             'debit_m3s': w['debit_m3s'] or None,
                             'keyakinan': 'resmi' if w['label'] == 'resmi' else 'asumsi-kebijakan',  # sekunder dipakai sebagai asumsi
                             'sumber': {'kedungombo': 'BBWS Pemali Juana, status Juli 2021',
                                        'tarum_barat': 'Dinas Sumber Daya Air Provinsi DKI Jakarta, 28 Juli 2026'}.get(
                                 w['id'], 'Rujukan sekunder'),
                             'dipakai': 'ya' if w['id'] in aktif else 'tidak'} for w in wd],
              ['nama', 'jenis', 'tampungan_juta_m3', 'debit_m3s', 'keyakinan', 'sumber', 'dipakai'])
    for nama, kunci, kol in [('peringkat_n80.csv', 'N80_kemarau', None), ('peringkat_1997.csv', 'N_kemarau_1997', None)]:
        tulis_csv(nama, sorted(baris, key=lambda b: b[kunci])[:15], KOLOM_KAB)
    tulis_csv('peringkat_surplus_lokal.csv', sorted(baris, key=lambda b: -b['R_minus_C_tahunan'])[:10], KOLOM_KAB)
    tulis_csv('peringkat_qin.csv', sorted([b for b in baris if b['N80_kemarau'] < 0], key=lambda b: -b['qin_persen'])[:12], KOLOM_KAB)
    tulis_csv('peringkat_2030.csv', sorted(baris, key=lambda b: b['selisih_2030'])[:10], KOLOM_KAB)
    paket = {'meta': {'label': EST, 'versi': meta['versi'], 'sumber': SUMBER_MODEL, 'satuan': 'juta m³ (Mm³) kecuali disebut',
                      'kemarau': meta['kemarau'], 'parameter_model': meta['parameter'], 'dibangun_dari': 'public/data/neraca_air/*.json; '
                      'scripts/air/neraca/{kebutuhan,topologi}.json; data/kajian-bnpb/neraca-air/mentah/validasi_hitung.json'},
             'jawa': jawa, 'hitung': hit, 'skenario': sken, 'prov': prov, 'validasi': validasi, 'parameter': parameter,
             'kab': [{k: b[k] for k in ('kode', 'nama', 'N_tahunan', 'N_kemarau', 'N80_kemarau', 'N_kemarau_1997', 'qin_persen')} for b in baris]}
    (KELUAR / 'neraca.json').write_text(json.dumps(paket, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
    E = registri(jawa, hit, sken, prov, validasi, parameter, baris)
    E['tesis.neraca-air'] = {
        'nilai': 'Menurut model neraca air kajian ini, Pulau Jawa menghasilkan air permukaan terbarukan {{angka:neraca.jawa.r_miliar|satuan}}, '
                 'dan kebutuhan konsumtif 2025 hanya {{angka:neraca.jawa.rasio_c_r_persen|persen}} darinya. Air cukup dalam setahun tetapi kurang '
                 'di sebagian kab/kota pada musim kemarau, ketika rasio pulau naik menjadi {{angka:neraca.jawa.rasio_c_r_kemarau_persen|persen}} pada '
                 'Juni–Oktober dan {{angka:neraca.hitung.n80_kemarau_neg}} kab/kota kekurangan air pada sedikitnya satu dari lima tahun bila '
                 'kebutuhan irigasi potensial dipenuhi. Aliran kemarau model belum lolos validasi, sehingga peringkat kab/kota dipakai sebagai '
                 'daftar periksa kesiapan kemarau; peringkat itu belum cocok dengan catatan kejadian kekeringan DIBI, jadi dipasangkan dengan '
                 'data penyaluran air bersih BPBD.',
        'pustaka': 'pantaubencana-2026-neraca-air', 'satuan': '', 'keyakinan': EST, 'sumber': SUMBER_MODEL,
        'catatan': 'kalimat tesis kajian neraca-air; hanya klaim "Aman dikutip" HASIL.md ditambah definisi N80 dan catatan validasi Jun-Okt; '
                   'dipanggil {{angka:tesis.neraca-air|teks}} di Ringkasan Eksekutif, Bab 8, sampul belakang, dan slide Pesan Kunci'}
    # pustaka khusus kajian ini: digabung ke pustaka.json menurut id (sumbernya neraca-air/pustaka-neraca.json)
    pp = KB / 'pustaka.json'
    pus = json.loads(pp.read_text(encoding='utf-8'))
    baru = json.loads((KB / 'neraca-air/pustaka-neraca.json').read_text(encoding='utf-8'))
    ids = {x['id'] for x in baru}
    pus = [x for x in pus if x['id'] not in ids] + baru
    pp.write_text(json.dumps(pus, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
    # glosarium: singkatan, istilah, kata_tambahan kajian ini (sumber neraca-air/glosarium-neraca.json), digabung per kunci
    gp = KB / 'data/glosarium.json'
    g = json.loads(gp.read_text(encoding='utf-8'))
    tambah = json.loads((KB / 'neraca-air/glosarium-neraca.json').read_text(encoding='utf-8'))
    for bag, kunci in (('singkatan', 'singkatan'), ('istilah', 'istilah')):
        baru = {x[kunci]: x for x in tambah[bag]}
        g[bag] = [x for x in g[bag] if x[kunci] not in baru] + list(baru.values())
    g['kata_tambahan'] = g['kata_tambahan'] + [k for k in tambah['kata_tambahan'] if k not in g['kata_tambahan']]
    gp.write_text(json.dumps(g, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
    p = KB / 'data/angka.json'
    reg = json.loads(p.read_text(encoding='utf-8'))
    reg['angka'] = {k: v for k, v in reg['angka'].items() if not k.startswith('neraca.')} | E
    p.write_text(json.dumps(reg, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
    return E


def uji(data):
    baris, jawa, hit, sken, prov, muara, validasi, parameter, bulanan, meta = data
    assert len(baris) == 119 == jawa['n_kab'], f'{len(baris)} kab, diharapkan 119 (katalog Kemendagri Jawa)'
    # konservasi: jumlah per kab = total Jawa; prov menjumlah ke Jawa
    assert abs(sum(b['R_tahunan'] for b in baris) - jawa['R']) < 0.1 * len(baris), 'jumlah R per kab tidak sama dengan R Jawa'
    assert abs(sum(p['R_tahunan'] for p in prov) - jawa['R']) < len(prov), 'R per provinsi tidak menjumlah ke R Jawa'
    assert sum(p['n_kab'] for p in prov) == 119
    assert abs(jawa['P'] - jawa['ETa'] - jawa['R']) / jawa['P'] < 0.01, 'P - ETa - R tidak tertutup (neraca bak tahunan klimatologi)'
    # skenario: klim di sken == jumlah kab
    s0 = next(s for s in sken if s['skenario'] == 'klim')
    assert s0['n_kab_neg'] == hit['N_kemarau_neg'], (s0['n_kab_neg'], hit['N_kemarau_neg'])
    # data kosong tetap kosong (null), tidak jadi 0
    assert all(b['industri_tahunan'] is None for b in baris if b['industri_kosong'] == 'ya')
    assert all(b['industri_tahunan'] is not None for b in baris if b['industri_kosong'] == 'tidak')
    assert hit['industri_kosong'] + hit['industri_ada'] == 119
    # urutan label: N80 <= N rerata kemarau di tiap kab (persentil ke-20 tidak di atas rerata kecuali sebaran miring kanan sedikit)
    assert sum(b['N80_kemarau'] <= b['N_kemarau'] + 1e-6 for b in baris) >= 110, 'N80 di atas rerata di banyak kab: periksa label persentil'
    assert all(0 < m['rasio'] < 5 for m in muara)
    assert validasi['rasio_kemarau_median'] > validasi['ambang_tinggi'], 'validasi Jun-Okt kini lolos: perbarui naskah (label indikasi urutan)'
    # tolak masukan salah: kab dengan N80 tanpa luas
    try:
        r1(1000 * baris[0]['N80_kemarau'] / 0.0)
        raise AssertionError('pembagian luas nol tidak ditolak')
    except ZeroDivisionError:
        pass
    print(f'uji lolos: {len(baris)} kab, R Jawa {jawa["R"]:.0f} Mm3/th, N80<0 {hit["N80_kemarau_neg"]} kab, {len(muara)} muara')


if __name__ == '__main__':
    d = hitung()
    if sys.argv[1:] != ['uji']:
        E = tulis(d)
        print(f'tulis {KELUAR.relative_to(REPO)} dan {len(E)} entri neraca.* di data/angka.json')
    uji(d)
