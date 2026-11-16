"""Angka tambahan Lampiran A kelompok C (ukuran dan korban): P-21, P-22, P-24, P-25, P-26, P-49, P-53, P-54, P-60.
Masukan (semua sudah ada di repo, tidak ada tarikan baru):
  hasil/dibi_mentah_2024_2026.json (lewat uji_kriteria.muat), public/gempa/data/katalog_merusak.json (BMKG),
  public/gempa/data/factsheet_gempa.json (USGS), public/data/luas_resmi.json, public/data/luas_satelit.json.
Keluaran: hasil/tambahan_C.json. Jalankan: python tambahan_C.py"""
import json, os, re, sys, datetime as dt, statistics as st
AK = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(AK, '..', '..', '..', '..'))
sys.path.insert(0, AK)
from uji_kriteria import muat, kr  # noqa: E402

H = {}

# ---------- A. Katalog BMKG gempa signifikan dan merusak (P-21, P-22) ----------
kat = json.load(open(os.path.join(REPO, 'public/gempa/data/katalog_merusak.json'), encoding='utf8'))['baris']
besar = [r for r in kat if r['magnitudo'] and r['magnitudo'] >= 7.0 and r['bagian_tahun'] and 2000 <= r['bagian_tahun'] <= 2025]
RE_NOL = re.compile(r'meninggal\s*:?\s*-\s*(?:orang|korban|$)|tidak ada korban jiwa', re.I)
nol_eksplisit = [r for r in besar if RE_NOL.search((r['korban_kerusakan'] or '').replace('\n', ' '))]
H['katalog_bmkg'] = {
    'baris_total': len(kat), 'baris_tanpa_magnitudo': sum(1 for r in kat if r['magnitudo'] is None),
    'M_ge_7_tahun_2000_2025': len(besar),
    'M_ge_7_menulis_tanpa_korban_jiwa_eksplisit': len(nol_eksplisit),
    'tanggal_nol_eksplisit': [f"{r['tanggal']} M{r['magnitudo']}" for r in nol_eksplisit],
    'M_ge_7_kolom_korban_kosong_atau_tanpa_angka_meninggal': sum(1 for r in besar if not re.search(r'meninggal', (r['korban_kerusakan'] or ''), re.I)),
}

jt = [r for r in kat if re.search(r'jantung', (r['korban_kerusakan'] or ''), re.I)]
H['katalog_bmkg']['baris_menyebut_jantung'] = len(jt)
H['katalog_bmkg']['baris_menyebut_jantung_tanggal_M'] = [f"{r['tanggal']} M{r['magnitudo']}" for r in jt]
H['katalog_bmkg']['baris_menyebut_jantung_M_lt_6'] = sum(1 for r in jt if r['magnitudo'] and r['magnitudo'] < 6)
cj = [r for r in kat if r['tanggal'] == '2022-11-21' and 'Cianjur' in r['lokasi']]
H['cianjur_bmkg'] = {'magnitudo': cj[0]['magnitudo'], 'kedalaman_km': cj[0]['kedalaman_km'], 'korban_teks': cj[0]['korban_kerusakan'][:230]} if cj else None

# ---------- B. USGS (factsheet) lawan BMKG pada gempa yang sama (P-22) ----------
fs = json.load(open(os.path.join(REPO, 'public/gempa/data/factsheet_gempa.json'), encoding='utf8'))['kasus']
banding = []
for k in fs:
    t = dt.date.fromisoformat(k['tanggal'])
    cand = [r for r in kat if r['magnitudo'] and abs((dt.date.fromisoformat(r['tanggal']) - t).days) <= 1
            and abs(r['magnitudo'] - k['m']) <= 1.0 and r['bagian_tahun'] and r['bagian_tahun'] >= 2000]
    cand.sort(key=lambda r: abs(r['magnitudo'] - k['m']))
    banding.append({'tanggal': k['tanggal'], 'nama': k['nama'], 'm_usgs': k['m'], 'm_bmkg': cand[0]['magnitudo'] if cand else None,
                    'lokasi_bmkg': cand[0]['lokasi'] if cand else None})
H['usgs_vs_bmkg'] = banding

# ---------- C. DIBI mentah ----------
R = muat()
P12 = [o for o in R if dt.date(2025, 11, 13) <= o['tgl'] <= dt.date(2026, 11, 12)]
NB = [o for o in P12 if o['grup'] != 'karhutla']


def lolos(o): return any(kr(o).values())


# P-24 hilang
h = [o for o in R if o['hilang'] > 0]
h12 = [o for o in P12 if o['hilang'] > 0]
H['p24_hilang'] = {
    'semua_baris_hilang_gt0': len(h), 'dari': len(R), 'jumlah_hilang_semua': sum(o['hilang'] for o in R),
    '12bln_baris_hilang_gt0': len(h12), '12bln_dari': len(P12), '12bln_jumlah_hilang': sum(o['hilang'] for o in P12),
    '12bln_hilang_dan_meninggal_nol': sum(1 for o in h12 if o['meninggal'] == 0),
    '12bln_tak_lolos_K1K2K3_tetapi_ada_hilang': sum(1 for o in h12 if not lolos(o)),
    '12bln_lolos_jika_hilang_dihitung_di_K1': sum(1 for o in P12 if (o['meninggal'] + o['hilang'] >= 1) and not lolos(o)),
    '12bln_baris_lolos_dasar': sum(1 for o in P12 if lolos(o)),
    'baris_hilang_terbanyak': max(((o['hilang'], str(o['tgl']), o['kab'], o['jenis']) for o in R)),
}
# P-25 K2 dijumlah
def k2_tunggal(o, a=50): return max(o['menderita'], o['luka'], o['mengungsi']) >= a
H['p25_k2'] = {
    '12bln_K2_jumlah_ge50': sum(1 for o in P12 if o['k2n'] >= 50),
    '12bln_K2_satu_kategori_ge50': sum(1 for o in P12 if k2_tunggal(o)),
    '12bln_K2_hanya_lolos_karena_dijumlah': sum(1 for o in P12 if o['k2n'] >= 50 and not k2_tunggal(o)),
    '12bln_menderita_dan_mengungsi_sama_sama_gt0': sum(1 for o in P12 if o['menderita'] > 0 and o['mengungsi'] > 0),
    '12bln_luka_dan_mengungsi_sama_sama_gt0': sum(1 for o in P12 if o['luka'] > 0 and o['mengungsi'] > 0),
    '12bln_K2_jumlah_ge50_tanpa_luka': sum(1 for o in P12 if (o['menderita'] + o['mengungsi']) >= 50),
    'catatan': 'DIBI punya kolom menderita_mengungsi = menderita + mengungsi; luka_sakit terpisah',
}
# P-26 bobot tingkat kerusakan; data mentah hanya menyimpan RB, RS, RR gabungan di rr, jadi baca ulang
raw = json.load(open(os.path.join(AK, 'hasil/dibi_mentah_2024_2026.json'), encoding='utf8'))['data']
WIB = dt.timezone(dt.timedelta(hours=7))
def n(r, k): return int(round(r.get(k) or 0))
rows = []
for r in raw:
    t = dt.datetime.fromtimestamp(r['dt'] / 1000, WIB).date()
    if not (dt.date(2025, 11, 13) <= t <= dt.date(2026, 11, 12)):
        continue
    rows.append(dict(rb=n(r, 'rumah_rusak_berat'), rs=n(r, 'rumah_rusak_sedang'), rr=n(r, 'rumah_rusak_ringan'), te=n(r, 'rumah_terendam'),
                     md=n(r, 'meninggal'), k2=n(r, 'menderita') + n(r, 'luka_sakit') + n(r, 'mengungsi'),
                     fas=n(r, 'pendidikan_rusak') + n(r, 'rumah_ibadat_rusak') + n(r, 'fasyankes_rusak') + n(r, 'kantor_rusak') + n(r, 'jembatan_rusak'),
                     jb=n(r, 'jembatan_rusak')))
def lolos_lain(x): return x['md'] >= 1 or x['k2'] >= 50
def dasar(x): return (x['rb'] + x['rs'] + x['rr'] + x['fas']) >= 5
base = sum(1 for x in rows if lolos_lain(x) or dasar(x))
H['p26_kerusakan'] = {
    'baris_12bln': len(rows),
    'lolos_dasar_RB+RS+RR+fasilitas_ge5': base,
    'K3_dasar_baris': sum(1 for x in rows if dasar(x)),
    'K3_hanya_RB_ge5': sum(1 for x in rows if (x['rb'] + x['fas']) >= 5),
    'lolos_total_jika_K3_hanya_RB': sum(1 for x in rows if lolos_lain(x) or (x['rb'] + x['fas']) >= 5),
    'lolos_total_jika_K3_RB_dan_RS_saja_plus_fasilitas': sum(1 for x in rows if lolos_lain(x) or (x['rb'] + x['rs'] + x['fas']) >= 5),
    'K3_bobot_jepang_RB1_RS0.5_terendam0.333_ge5': sum(1 for x in rows if (x['rb'] + x['rs'] / 2 + x['te'] / 3) >= 5),
    'lolos_total_bobot_jepang_plus_fasilitas': sum(1 for x in rows if lolos_lain(x) or (x['rb'] + x['rs'] / 2 + x['te'] / 3 + x['fas']) >= 5),
    'K3_hanya_RR_tanpa_RB_RS_ge5': sum(1 for x in rows if x['rb'] == 0 and x['rs'] == 0 and x['rr'] >= 5 and not lolos_lain(x)),
    'K3_lolos_hanya_karena_RR_dan_tak_lolos_K1K2': sum(1 for x in rows if not lolos_lain(x) and dasar(x) and (x['rb'] + x['rs'] + x['fas']) < 5),
    'jembatan_ge10_baris': sum(1 for x in rows if x['jb'] >= 10),
    'jembatan_maks': max(x['jb'] for x in rows),
}
# P-54 terendam
H['p54_terendam'] = {
    'baris_terendam_gt0': sum(1 for x in rows if x['te'] > 0),
    'terendam_gt0_tak_lolos_dasar': sum(1 for x in rows if x['te'] > 0 and not (lolos_lain(x) or dasar(x))),
    'terendam_ge5_tak_lolos_dasar': sum(1 for x in rows if x['te'] >= 5 and not (lolos_lain(x) or dasar(x))),
    'lolos_jika_terendam_dihitung_sebagai_rusak': sum(1 for x in rows if lolos_lain(x) or (x['rb'] + x['rs'] + x['rr'] + x['te'] + x['fas']) >= 5),
    'tambahan_baris_jika_terendam_dihitung': sum(1 for x in rows if not (lolos_lain(x) or dasar(x)) and (x['rb'] + x['rs'] + x['rr'] + x['te'] + x['fas']) >= 5),
    'terendam_total_unit': sum(x['te'] for x in rows),
}
# P-49 kosong lawan nol
def nol(o): return (o['meninggal'] == 0 and o['hilang'] == 0 and o['luka'] == 0 and o['menderita'] == 0 and o['mengungsi'] == 0
                    and o['rr'] == 0 and o['terendam'] == 0 and o['fas'] == 0 and o['fasum'] == 0)
nb_all = [o for o in R if o['grup'] != 'karhutla']
H['p49_nol'] = {
    'semua_baris': len(R), 'semua_nol': sum(1 for o in R if nol(o)),
    'tanpa_karhutla_baris': len(nb_all), 'tanpa_karhutla_nol': sum(1 for o in nb_all if nol(o)),
    'tanpa_karhutla_nol_pct': round(100 * sum(1 for o in nb_all if nol(o)) / len(nb_all), 1),
    '12bln_baris': len(P12), '12bln_nol': sum(1 for o in P12 if nol(o)), '12bln_nol_pct': round(100 * sum(1 for o in P12 if nol(o)) / len(P12), 1),
    '12bln_tanpa_karhutla_nol_pct': round(100 * sum(1 for o in NB if nol(o)) / len(NB), 1),
    'tanpa_karhutla_is_bencana_true_nol': sum(1 for o in nb_all if nol(o) and o['is_b']),
    'nol_per_tahun_pct': {str(y): round(100 * sum(1 for o in R if o['th'] == y and nol(o)) / sum(1 for o in R if o['th'] == y), 1) for y in (2024, 2025, 2026)},
}
# P-53 kekeringan dan terancam: sebaran angka terdampak per jenis
def per_jenis(g):
    v = [o['k2n'] for o in P12 if o['grup'] == g]
    return {'n': len(v), 'median_K2': st.median(v) if v else None, 'ge50': sum(1 for x in v if x >= 50),
            'ge500': sum(1 for x in v if x >= 500), 'maks': max(v) if v else None, 'rumah_rusak_nol': sum(1 for o in P12 if o['grup'] == g and o['rr'] == 0)}
H['p53_terdampak_per_jenis_12bln'] = {g: per_jenis(g) for g in ('kekeringan', 'banjir', 'cuaca ekstrem/angin', 'longsor')}

# ---------- D. Luas karhutla: SiPongi (indikasi) lawan GWIS (MODIS) (P-60) ----------
res = json.load(open(os.path.join(REPO, 'public/data/luas_resmi.json'), encoding='utf8'))
sat = json.load(open(os.path.join(REPO, 'public/data/luas_satelit.json'), encoding='utf8'))
ty_r = res['tahun']; ty_s = sat['tahun']
# samakan kunci provinsi: GWIS menggabung Kaltara ke 64, Papua lama ke '91+93+94+95', Papua Barat lama ke '92+96'
GAB = {'65': '64', '91': '91+93+94+95', '93': '91+93+94+95', '94': '91+93+94+95', '95': '91+93+94+95', '92': '92+96', '96': '92+96'}
gres = {}
for k, v in res['ha'].items():
    t = GAB.get(k, k)
    gres[t] = [a + b for a, b in zip(gres[t], v)] if t in gres else list(v)
res['ha'] = gres
kode = sorted(set(res['ha']) & set(sat['ha']))
H['p60_kunci_provinsi_dibandingkan'] = len(kode)
tahun_banding = [t for t in ty_r if t in ty_s and t != '2026']
def total(d, ty, t, ks): i = ty.index(t); return sum(d['ha'][k][i] for k in ks)
nas = {}
for t in tahun_banding:
    r = total(res, ty_r, t, res['ha'].keys()); s = total(sat, ty_s, t, sat['ha'].keys())
    nas[t] = {'sipongi_ha': round(r), 'gwis_modis_ha': round(s), 'rasio_gwis_per_sipongi': round(s / r, 2) if r else None}
H['p60_luas_nasional_per_tahun'] = nas
# tahun 2025: GWIS baru s/d Nov; SiPongi 2025 penuh; tandai
prov_nama = json.load(open(os.path.join(REPO, 'public/data/bnpb/rekonsiliasi_dalops_dibi.json'), encoding='utf8'))['prov_nama']
t0 = '2023'
rows_p = []
for k in kode:
    r = res['ha'][k][ty_r.index(t0)]; s = sat['ha'][k][ty_s.index(t0)]
    rows_p.append((k, prov_nama.get(k.split('+')[0], k), round(r), round(s), (round(s / r, 2) if r else None)))
rows_p.sort(key=lambda x: -max(x[2], x[3]))
H['p60_luas_prov_2023_10_terbesar'] = rows_p[:10]
# hitung provinsi yang berbeda lebih dari dua kali lipat pada 2018-2024
beda = {}
for t in [x for x in tahun_banding if x != '2025']:
    c = 0; tot = 0
    for k in kode:
        r = res['ha'][k][ty_r.index(t)]; s = sat['ha'][k][ty_s.index(t)]
        if max(r, s) < 1000:
            continue
        tot += 1
        mn = max(min(r, s), 1)
        if max(r, s) / mn >= 2:
            c += 1
    beda[t] = {'provinsi_dengan_luas_ge1000_di_salah_satu_sumber': tot, 'beda_dua_kali_atau_lebih': c}
H['p60_luas_prov_beda_2x'] = beda
H['p60_catatan'] = {'sipongi_sumber': res['sumber'][:200], 'gwis_sumber': sat['sumber'][:260]}

json.dump(H, open(os.path.join(AK, 'hasil/tambahan_C.json'), 'w', encoding='utf8'), ensure_ascii=False, indent=1)
print(json.dumps(H, ensure_ascii=False, indent=1))
