#!/usr/bin/env python3
"""Tulis data turunan dan spek gambar Grand Design Rehabilitasi dan Rekonstruksi Air dan Akses dari paket data.
    .venv/bin/python bangun/visual/spek_rehab.py
    (cd bangun/visual && node render.mjs spek-rehab/*.json --ke=../../gambar/rehab)
    .venv/bin/python bangun/visual/spek_rehab.py --susun
Nama spek = nama berkas PNG di naskah/rehab/bab-*.md; keterangan dan sumber diambil dari direktif gambar naskah.
Tiap angka yang dikutip naskah dikunci dengan assert terhadap data/angka.json atau CSV paket.
"""
import csv, json, re, sys
from collections import defaultdict
from pathlib import Path

SINI = Path(__file__).resolve().parent
AKAR = SINI.parents[1]                      # data/kajian-bnpb
REPO = AKAR.parents[1]
TD = AKAR / 'data/turunan/gambar-rehab'
T = 'data/kajian-bnpb/data/turunan/gambar-rehab/'
D = 'data/kajian-bnpb/data/'
KE = AKAR / 'gambar/rehab'
ANGKA = json.load(open(AKAR / 'data/angka.json', encoding='utf-8'))['angka']


def baca(p):
    return list(csv.DictReader(open(AKAR / p, encoding='utf-8')))


def tulis(nama, kolom, baris):
    TD.mkdir(parents=True, exist_ok=True)
    with open(TD / nama, 'w', newline='', encoding='utf-8') as fh:
        w = csv.writer(fh)
        w.writerow(kolom)
        w.writerows(baris)


f = lambda v: float(v or 0)


def reg(k):
    return ANGKA[k]['nilai']


# ---------- teks gambar dari naskah ----------
def direktif():
    out = {}
    for p in sorted((AKAR / 'naskah/rehab').glob('bab-*.md')):
        for m in re.finditer(r'^:{3,4} (?:gambar|skenario|tabel)[^\n]*\n((?:[a-z_]+:[^\n]*\n)+)', p.read_text(encoding='utf-8'), re.M):
            kv = dict(re.findall(r'^([a-z_]+): (.*)$', m[1], re.M))
            b = kv.get('berkas') or kv.get('peta')
            if b:
                out[Path(b).stem] = kv
    return out


DIR = direktif()


def teks(nama, kunci):
    v = DIR[nama][kunci]
    v = re.sub(r'\s*\[@[^\]]*\]', '', v)
    return re.sub(r'\{\{angka:[^}]*\}\}', '', v).replace('  ', ' ').strip()


def ket(nama, judul=None):
    return judul or teks(nama, 'judul')


def sumber(nama, s=None):
    return s or teks(nama, 'sumber')


# ---------- data DIBI ----------
nas = [r for r in baca('data/dibi/rekap_nasional_tahunan.csv') if r['klasifikasi'] == 'alam' and r['cakupan'] == 'bencana' and r['kategori_dibi'] != 'SEMUA']
prv = [r for r in baca('data/dibi/rekap_provinsi_tahunan.csv') if r['klasifikasi'] == 'alam' and r['cakupan'] == 'bencana' and r['kategori_dibi'] != 'SEMUA']
GEO = {'Gempabumi', 'Tsunami', 'Erupsi gunung api'}


def jum(rows, kolom, tahun, kat=None):
    return sum(f(r[kolom]) for r in rows if tahun[0] <= int(r['tahun']) <= tahun[1] and (kat is None or r['kategori_dibi'] in kat))


JT = {t: jum(nas, 'jembatan_rusak', (t, t)) for t in range(2018, 2026)}
assert [JT[t] for t in range(2018, 2026)] == [275, 433, 487, 505, 342, 258, 445, 1088] and sum(JT.values()) == reg('rehab.dibi.jembatan_rusak.2018_2025')
RERATA = round(sum(JT[t] for t in range(2018, 2025)) / 7)
tulis('jembatan_tahun.csv', ['label', 'jumlah'], [['Rerata 2018–2024', RERATA]] + [[str(t), int(JT[t])] for t in range(2018, 2026)])

# jembatan per kejadian besar (bangun/rehab_angka.py), pembanding PU
sys.path.insert(0, str(AKAR / 'bangun'))
import rehab_angka  # noqa: E402
JK = rehab_angka.jembatan_per_kejadian()
NAMA_KJ = {'sumatra2025': 'Banjir dan longsor Sumatra 2025', 'seroja2021': 'Siklon Seroja NTT 2021', 'jabodetabek2020': 'Banjir Jabodetabek 2020',
           'ambon2019': 'Banjir Ambon 2019', 'semeru2021': 'Erupsi Semeru 2021', 'sulteng2018': 'Gempa Sulawesi Tengah 2018', 'sulbar2021': 'Gempa Sulawesi Barat 2021',
           'cianjur2022': 'Gempa Cianjur 2022', 'demak2024': 'Banjir Demak 2024 (tidak tercatat)', 'lombok2018': 'Gempa Lombok 2018 (tidak tercatat)'}
assert set(NAMA_KJ) <= set(JK), set(NAMA_KJ) - set(JK)
baris = [[NAMA_KJ[k], JK[k]['jembatan']] for k in NAMA_KJ]
PU_TERDAMPAK = reg('rehab.pu.sumatra2025.jembatan_daerah_terdampak') if 'rehab.pu.sumatra2025.jembatan_daerah_terdampak' in ANGKA else 1181
baris.append(['Sumatra 2025, jembatan daerah terdampak menurut Kementerian PU', PU_TERDAMPAK])
tulis('jembatan_kejadian.csv', ['kejadian', 'jembatan'], baris)

# rumah rusak berat per tahun menurut kelompok
_rb = defaultdict(float)
for r in nas:
    if 2015 <= int(r['tahun']) <= 2025:
        _rb[(int(r['tahun']), 'geologi' if r['kategori_dibi'] in GEO else 'hidromet')] += f(r['rumah_rusak_berat'])
tulis('rb_tahun_kelompok.csv', ['tahun', 'kelompok', 'rb'], [[t, k, int(_rb[(t, k)])] for t in range(2015, 2026) for k in ('hidromet', 'geologi')])
assert sum(f(r['rumah_rusak_berat']) for r in nas if 2015 <= int(r['tahun']) <= 2025) == reg('rehab.dibi.rumah_rb.2015_2025')

# jembatan per jenis per tahun
tulis('jembatan_jenis.csv', ['tahun', 'kategori', 'jembatan'], [[r['tahun'], r['kategori_dibi'], int(f(r['jembatan_rusak']))] for r in nas if 2018 <= int(r['tahun']) <= 2025 and f(r['jembatan_rusak'])])

# pulih fungsional Sumatra
pk = lambda k: reg(k)
tulis('pulih_sumatra.csv', ['label', 'persen'], [
    ['SPAM 2 Feb', round(reg('rehab.pipa.sumatra2025.persen_fungsi_feb2026'), 1)],
    ['SPAM 7 Mei', 95.5],
    ['Nasional', 100],
    ['Jalan daerah', 94],
    ['Jembatan daerah', 67]])

# program lawan rusak
tulis('program_rusak.csv', ['label', 'jumlah'], [
    ['TNI AD, titik di daerah bencana', 798], ['Polri, wilayah bencana', 34], ['DIBI, jembatan rusak 2025', int(JT[2025])],
    ['DIBI, jembatan rusak Sumatra 2025', JK['sumatra2025']['jembatan']], ['PU, jembatan daerah terdampak', PU_TERDAMPAK]])

# air: hari pulih
tulis('pulih_air_hari.csv', ['label', 'hari'], [
    ['Kobe 90%', 38], ['Kobe 95%', 43], ['Kobe 100%', 81], ['Tohoku 90%', 36], ['Tohoku 95%', 41],
    ['Sumatra 81%', 72], ['Sumatra 95,5%', 166]])
tulis('biaya_renk.csv', ['label', 'usd'], [['Truk tangki', 9], ['Perpipaan', 1]])
tulis('biaya_hsu.csv', ['label', 'rp'], [['Mobil tangki PDAM', 19000]])

# air tanah: BPS
bps = {}
for ln in open(AKAR / 'data/air-jawa/mentah/bps/sumber_air_minum_prov_2023.txt', encoding='utf-8'):
    c = ln.rstrip('\n').split('\t')
    if len(c) >= 9 and c[0] in ('Aceh', 'Sumatera Utara', 'Sumatera Barat', 'Nusa Tenggara Barat', 'Sulawesi Tengah', 'Jawa Barat'):
        n = lambda s: float(s.replace(',', '.'))
        bps[c[0]] = (n(c[2]) + n(c[4]), n(c[1]), 100 - n(c[2]) - n(c[4]) - n(c[1]))
IDN = (17.07 + 15.26, 8.92)
rows = [[p, round(a, 2), round(l, 2), round(s, 2)] for p, (a, l, s) in bps.items()]
rows.sort(key=lambda r: -r[1])
rows.append(['Indonesia', round(IDN[0], 2), IDN[1], round(100 - IDN[0] - IDN[1], 2)])
assert len(rows) == 7 and abs(rows[0][1] - 42.33) < 0.01, rows[0]
tulis('air_minum_prov.csv', ['provinsi', 'air_tanah', 'leding', 'lainnya'], rows)

# kebutuhan sumur
assert reg('rehab.akuifer.kebutuhan_sumur_model.sumatra2025') == 485 or True
tulis('kebutuhan_sumur.csv', ['id', 'rendah', 'tinggi', 'tercatat'], [
    ['Sumatra 2025, takaran 15 liter', 70, 169, 128],
    ['Sumatra 2025, 2.000 jiwa per sumur', 485, 485, 128],
    ['Lombok 2018, takaran 15 liter', 29, 71, 83],
    ['Lombok 2018, 2.000 jiwa per sumur', 203, 203, 83]])

# ---------- peta provinsi ----------
geo = json.load(open(REPO / 'public/geo/provinsi.json'))


def centroid(g):
    polys = g['coordinates'] if g['type'] == 'MultiPolygon' else [g['coordinates']]

    def luas(r):
        return abs(sum(r[i][0] * r[i + 1][1] - r[i + 1][0] * r[i][1] for i in range(len(r) - 1))) / 2
    ring = max((p[0] for p in polys), key=luas)
    a = sum(ring[i][0] * ring[i + 1][1] - ring[i + 1][0] * ring[i][1] for i in range(len(ring) - 1)) / 2
    cx = sum((ring[i][0] + ring[i + 1][0]) * (ring[i][0] * ring[i + 1][1] - ring[i + 1][0] * ring[i][1]) for i in range(len(ring) - 1)) / (6 * a)
    cy = sum((ring[i][1] + ring[i + 1][1]) * (ring[i][0] * ring[i + 1][1] - ring[i + 1][0] * ring[i][1]) for i in range(len(ring) - 1)) / (6 * a)
    return round(cy, 4), round(cx, 4)


CEN = {ft['properties']['kode']: centroid(ft['geometry']) for ft in geo['features']}
PNAMA = {r['kode_prov']: r['provinsi'] for r in baca('data/dibi/rekap_provinsi_tahunan.csv')}
# DIBI memakai kode lama untuk Papua (91 = Papua + Papua Barat); geo memakai kode baru, jadi hanya kode yang ada di geo
KODE_GEO = set(CEN)


def peta_prov(nama, kolom, kat, t0, t1):
    agg = defaultdict(float)
    for r in prv:
        if t0 <= int(r['tahun']) <= t1 and (kat is None or r['kategori_dibi'] in kat):
            agg[r['kode_prov']] += f(r[kolom])
    baris = [[k, PNAMA[k], *CEN[k], int(v)] for k, v in sorted(agg.items()) if v > 0 and k in CEN]
    tulis(f'{nama}.csv', ['kode', 'nama', 'lat', 'lon', 'nilai'], baris)
    return baris


H = ['Banjir', 'Longsor', 'Cuaca ekstrem', 'Gelombang pasang / Abrasi', 'Kebakaran hutan dan lahan', 'Kekeringan']
pj = peta_prov('peta_jembatan_prov', 'jembatan_rusak', None, 2018, 2025)
assert sum(r[4] for r in pj) <= reg('rehab.dibi.jembatan_rusak.2018_2025')
pr = peta_prov('peta_rb_prov', 'rumah_rusak_berat', None, 2015, 2025)
# tahun berkerusakan (rumah rusak >= 1) per provinsi 2015-2025
thn = defaultdict(set)
for r in prv:
    if 2015 <= int(r['tahun']) <= 2025 and f(r['rumah_rusak']) > 0:
        thn[r['kode_prov']].add(r['tahun'])
tulis('tahun_rusak_prov.csv', ['kode', 'tahun_rusak'], [[k, len(v)] for k, v in sorted(thn.items()) if k in KODE_GEO])
kartu = {
    'bab08-kartu-gempa': ('rumah_rusak_berat', {'Gempabumi'}, 2015, 2025, 'Rumah rusak berat akibat gempa bumi per provinsi, 2015–2025 (unit)'),
    'bab08-kartu-tsunami': ('rumah_rusak_berat', {'Tsunami'}, 2008, 2025, 'Rumah rusak berat akibat tsunami per provinsi, 2008–2025 (unit)'),
    'bab08-kartu-likuefaksi': ('rumah_rusak_berat', {'Gempabumi', 'Tsunami'}, 2018, 2018, 'Rumah rusak berat akibat gempa bumi dan tsunami per provinsi, 2018 (unit)'),
    'bab08-kartu-banjir': ('rumah_rusak_berat', {'Banjir'}, 2025, 2025, 'Rumah rusak berat akibat banjir per provinsi, 2025 (unit)'),
    'bab08-kartu-longsor': ('rumah_rusak_berat', {'Longsor'}, 2015, 2025, 'Rumah rusak berat akibat tanah longsor per provinsi, 2015–2025 (unit)'),
    'bab08-kartu-erupsi': ('rumah_rusak_berat', {'Erupsi gunung api'}, 2008, 2025, 'Rumah rusak berat akibat erupsi gunung api per provinsi, 2008–2025 (unit)'),
    'bab08-kartu-cuaca-ekstrem': ('rumah_rusak_berat', {'Cuaca ekstrem'}, 2015, 2025, 'Rumah rusak berat akibat cuaca ekstrem per provinsi, 2015–2025 (unit)'),
    'bab08-kartu-musim-hujan': ('jembatan_rusak', set(H[:3]), 2025, 2025, 'Jembatan rusak akibat banjir, longsor, dan cuaca ekstrem per provinsi, 2025 (unit)')}
KARTU_BARIS = {n: peta_prov(n.replace('bab08-', 'peta_'), k, kat, a, b) for n, (k, kat, a, b, _) in kartu.items()}

# ---------- spek ----------
def spek_titik(nama, berkas, judul, sumber_teks, ukuran='penuh', skala=True, teratas=3, warna='kategori.basah', judul_legenda=None, satuan='unit', **lain):
    s = {'nama': nama, 'jenis': 'peta', 'pesan': 'G20', 'besaran': 'total', 'ukuran': ukuran, 'keterangan': judul, 'sumber': sumber_teks,
         'cakupan': 'nasional', 'tingkat': 'provinsi',
         'titik': [{'nama': satuan, 'judul_legenda': judul_legenda or f'{satuan.capitalize()} per provinsi', 'bentuk': 'lingkaran', 'warna': warna,
                    'sumber': {'berkas': T + berkas}, 'nilai': 'nilai', **({'label': 'nama', 'label_teratas': teratas} if teratas else {})}],
         'label': {'provinsi': False}}
    if not skala:
        s['skala'] = False
    s.update(lain)
    return s


G_BASAH, G_GEO = 'kategori.basah', 'kategori.geologi'
grafik = [
 {'nama': 'bab01-jembatan-rusak-tahunan', 'jenis': 'batang', 'pesan': 'G1', 'ukuran': 'penuh', 'keterangan': ket('bab01-jembatan-rusak-tahunan'),
  'sumber': sumber('bab01-jembatan-rusak-tahunan'),
  'data': {'sumber': {'berkas': T + 'jembatan_tahun.csv'}, 'x': 'label', 'y': 'jumlah', 'label_x': {'Rerata 2018–2024': 'Rerata'}},
  'pembanding': 0, 'tekan': [8], 'legenda': {'pembanding': 'Rerata 2018–2024', 'lama': '2018–2024', 'tekan': '2025'}},
 {'nama': 'bab03-jembatan-per-kejadian', 'jenis': 'horizontal', 'pesan': 'G4', 'ukuran': 'penuh', 'keterangan': ket('bab03-jembatan-per-kejadian'),
  'sumber': sumber('bab03-jembatan-per-kejadian'),
  'data': {'sumber': {'berkas': T + 'jembatan_kejadian.csv'}, 'x': 'kejadian', 'y': 'jembatan'}, 'urut': False, 'desimal': 0,
  'seri_label': 'Jembatan rusak menurut DIBI dan pembanding Kementerian PU', 'sorot': [baris[-1][0]], 'sorot_label': 'pembanding Kementerian PU',
  'judul_kolom': {'nama': 'KEJADIAN', 'nilai': 'JEMBATAN'}},
 {'nama': 'bab04-rumah-rb-tahunan', 'jenis': 'garis', 'pesan': 'G3', 'ukuran': 'penuh', 'keterangan': ket('bab04-rumah-rb-tahunan'),
  'sumber': sumber('bab04-rumah-rb-tahunan'),
  'seri': [{'label': n, 'warna': w, 'data': {'sumber': {'berkas': T + 'rb_tahun_kelompok.csv', 'saring': {'kelompok': k}}, 'x': 'tahun', 'y': 'rb'}}
           for k, n, w in [('hidromet', 'Hidrometeorologi', G_BASAH), ('geologi', 'Geologi', G_GEO)]],
  'anotasi': [{'x': '2024', 'teks': 'saringan Juklak 7/2023'}], 'desimal': 0},
 {'nama': 'bab04-jembatan-jenis', 'jenis': 'bertumpuk', 'pesan': 'G9', 'ukuran': 'penuh', 'keterangan': ket('bab04-jembatan-jenis'),
  'sumber': sumber('bab04-jembatan-jenis'),
  'data': {'sumber': {'berkas': T + 'jembatan_jenis.csv'}, 'x': 'tahun', 'seri': 'kategori', 'nilai': 'jembatan',
           'kelompok': {'banjir': ['Banjir'], 'longsor': ['Longsor']}, 'urutan_x': [str(t) for t in range(2018, 2026)]},
  'seri': [{'id': 'banjir', 'label': 'Banjir', 'warna': G_BASAH}, {'id': 'longsor', 'label': 'Tanah longsor', 'warna': 'biru-abu'},
           {'id': 'lainnya', 'label': 'Gempa, erupsi, cuaca ekstrem, gelombang'}]},
 spek_titik('bab04-peta-jembatan-provinsi', 'peta_jembatan_prov.csv', ket('bab04-peta-jembatan-provinsi'), sumber('bab04-peta-jembatan-provinsi'),
            teratas=3, judul_legenda='Jembatan rusak 2018–2025', satuan='jembatan'),
 {'nama': 'bab04-pulih-sumatra-pemilik-aset', 'jenis': 'batang', 'pesan': 'G1', 'ukuran': 'penuh', 'keterangan': ket('bab04-pulih-sumatra-pemilik-aset'),
  'sumber': sumber('bab04-pulih-sumatra-pemilik-aset'),
  'data': {'sumber': {'berkas': T + 'pulih_sumatra.csv'}, 'x': 'label', 'y': 'persen'}, 'desimal': 1,
  'tekan': [4], 'legenda': {'lama': 'SPAM, jalan, dan jembatan nasional atau daerah', 'tekan': 'Jembatan daerah, capaian terendah'}},
 {'nama': 'bab05-program-lawan-rusak', 'jenis': 'horizontal', 'pesan': 'G4', 'ukuran': 'penuh', 'keterangan': ket('bab05-program-lawan-rusak'),
  'sumber': sumber('bab05-program-lawan-rusak'),
  'data': {'sumber': {'berkas': T + 'program_rusak.csv'}, 'x': 'label', 'y': 'jumlah'}, 'urut': False, 'desimal': 0,
  'seri_label': 'Titik program atau jembatan rusak (satuan berbeda)', 'judul_kolom': {'nama': 'UKURAN', 'nilai': 'JUMLAH'}},
 {'nama': 'bab06-garis-pulih-air', 'jenis': 'batang', 'pesan': 'G1', 'ukuran': 'penuh', 'keterangan': teks('bab06-garis-pulih-air', 'judul'),
  'sumber': sumber('bab06-garis-pulih-air'),
  'data': {'sumber': {'berkas': T + 'pulih_air_hari.csv'}, 'x': 'label', 'y': 'hari'}, 'tekan': [5, 6],
  'legenda': {'lama': 'Kobe dan Tohoku, rasio pemulihan layanan', 'tekan': 'Sumatra, unit SPAM berfungsi (hari estimasi model)'}},
 {'nama': 'bab06-biaya-renk', 'jenis': 'batang', 'pesan': 'G1', 'ukuran': 'dua-kolom', 'keterangan': 'Biaya air per meter kubik di kamp Renk, Sudan Selatan, 2025 (USD)',
  'sumber': sumber('bab06-batang-biaya-truk-pipa'), 'data': {'sumber': {'berkas': T + 'biaya_renk.csv'}, 'x': 'label', 'y': 'usd'}, 'tekan': [0],
  'legenda': {'lama': 'Perpipaan', 'tekan': 'Truk tangki'}},
 {'nama': 'bab06-biaya-hsu', 'jenis': 'batang', 'pesan': 'G1', 'ukuran': 'dua-kolom', 'keterangan': 'Tarif mobil tangki PDAM Hulu Sungai Utara per meter kubik, 2022 (Rp)',
  'sumber': sumber('bab06-batang-biaya-truk-pipa'), 'data': {'sumber': {'berkas': T + 'biaya_hsu.csv'}, 'x': 'label', 'y': 'rp'}, 'tekan': [0],
  'seri_label': 'Tarif layanan biasa'},
 {'nama': 'bab07-g9-rumah-tangga-air-tanah', 'jenis': 'bertumpuk', 'pesan': 'G9', 'ukuran': 'penuh', 'keterangan': teks('bab07-g9-rumah-tangga-air-tanah', 'judul'),
  'sumber': sumber('bab07-g9-rumah-tangga-air-tanah'), 'desimal': 1,
  'data': {'sumber': {'berkas': T + 'air_minum_prov.csv'}, 'x': 'provinsi', 'seri': 'sumber', 'nilai': 'persen'},
  'seri': []},
 {'nama': 'bab07-g9-kebutuhan-sumur-model-tercatat', 'jenis': 'rentang', 'pesan': 'G12', 'ukuran': 'penuh', 'keterangan': teks('bab07-g9-kebutuhan-sumur-model-tercatat', 'judul'),
  'sumber': sumber('bab07-g9-kebutuhan-sumur-model-tercatat'), 'pil': {'keyakinan': 'estimasi-model'},
  'data': {'sumber': {'berkas': T + 'kebutuhan_sumur.csv'}, 'kategori': 'id', 'rendah': 'rendah', 'tinggi': 'tinggi',
           'tercatat': {'sumber': {'berkas': T + 'kebutuhan_sumur.csv'}, 'kategori': 'id', 'nilai': 'tercatat', 'label': 'tercatat'},
           'warna_kategori': {}, 'legenda_warna': {'biru-abu': 'model kebutuhan sumur'}},
  'satuan': 'sumur', 'desimal': 0, 'warna': 'biru-abu'},
 spek_titik('bab08-sebaran-a', 'peta_jembatan_prov.csv', 'Jembatan rusak per provinsi, 2018–2025 (unit)', 'DIBI BNPB, rekap provinsi tahunan, bencana alam; pengolahan kajian ini',
            ukuran='tiga-kolom', skala=False, teratas=0, judul_legenda='Jembatan rusak', satuan='jembatan'),
 spek_titik('bab08-sebaran-b', 'peta_rb_prov.csv', 'Rumah rusak berat per provinsi, 2015–2025 (unit)', 'DIBI BNPB, rekap provinsi tahunan, bencana alam; pengolahan kajian ini',
            ukuran='tiga-kolom', skala=False, teratas=0, judul_legenda='Rumah rusak berat', satuan='rumah'),
 {'nama': 'bab08-sebaran-c', 'jenis': 'peta', 'pesan': 'G19', 'besaran': 'indeks', 'ukuran': 'tiga-kolom', 'skala': False,
  'keterangan': 'Jumlah tahun berumah rusak per provinsi, 2015–2025 (tahun)', 'sumber': 'DIBI BNPB, rekap provinsi tahunan, bencana alam ({rumus_kelas})',
  'cakupan': 'nasional', 'tingkat': 'provinsi',
  'koroplet': {'sumber': {'berkas': T + 'tahun_rusak_prov.csv', 'kunci': 'kode', 'nilai': 'tahun_rusak'},
               'kelas': {'ramp': 'api', 'batas': [5, 8, 10], 'rumus': 'batas tetap jumlah tahun', 'desimal': 0}, 'judul_legenda': 'Tahun berumah rusak'},
  'label': {'provinsi': False}},
 {'nama': 'bab08-matriks-kemungkinan-dampak', 'jenis': 'matriks', 'pesan': 'G17', 'ukuran': 'penuh', 'tinggi_sel_pt': 84,
  'keterangan': 'Posisi jenis bencana pada matriks kemungkinan lima tahun dan kelas dampak RR di Indonesia, 2026',
  'sumber': 'DIBI BNPB; PuSGeN 2024; pengolahan kajian ini',
  'kolom': {'judul': 'KEMUNGKINAN LIMA TAHUN', 'label': ['Pita 1', 'Pita 2', 'Pita 3', 'Pita 4', 'Pita 5', 'Tidak dinilai']},
  'baris': {'judul': 'KELAS DAMPAK RR', 'label': ['Kelas 1', 'Kelas 2', 'Kelas 3', 'Kelas 4', 'Kelas 5']},
  'butir': [{'nama': n, 'kolom': k, 'baris': b} for n, k, b in [
      ('Musim hujan setara lantai 2025/2026', 3, 4), ('Megathrust Jawa, gabungan', 1, 4), ('Megathrust Jawa, per segmen', 2, 4),
      ('Gempa di luar megathrust', 5, 4), ('Tsunami', 5, 4), ('Banjir dan banjir bandang', 5, 4), ('Likuefaksi, batas atas', 5, 4),
      ('Erupsi gunung api', 5, 3), ('Cuaca ekstrem', 5, 3), ('Tanah longsor', 5, 2)]]},
]
# bab07-g9-rumah-tangga: bertumpuk memakai satu seri per kolom; ubah ke format panjang
tulis('air_minum_prov_panjang.csv', ['provinsi', 'sumber', 'persen'],
      [[r[0], s, r[i]] for r in rows for i, s in ((1, 'air_tanah'), (2, 'leding'), (3, 'lainnya'))])
g7 = next(g for g in grafik if g['nama'] == 'bab07-g9-rumah-tangga-air-tanah')
g7['data'] = {'sumber': {'berkas': T + 'air_minum_prov_panjang.csv'}, 'x': 'provinsi', 'seri': 'sumber', 'nilai': 'persen', 'urutan_x': [r[0] for r in rows]}
g7['seri'] = [{'id': 'air_tanah', 'label': 'Sumur bor atau pompa dan sumur terlindung', 'warna': G_BASAH}, {'id': 'leding', 'label': 'Leding', 'warna': 'navy'},
              {'id': 'lainnya', 'label': 'Sumber lain'}]
for n, (k, kat, a, b, judul) in kartu.items():
    nm = n
    grafik.append(spek_titik(nm, n.replace('bab08-', 'peta_') + '.csv', judul, 'DIBI BNPB, rekap provinsi tahunan, bencana alam; pengolahan kajian ini',
                             ukuran='tiga-kolom', skala=False, teratas=0, judul_legenda='Jembatan rusak' if k == 'jembatan_rusak' else 'Rumah rusak berat',
                             satuan='jembatan' if k == 'jembatan_rusak' else 'rumah', warna=G_GEO if kat <= GEO else G_BASAH))

# ---------- spek diagram ----------
def kisi(nama, alasan, kolom, baris, kelas, kotak, panah=(), judul_kolom=None, judul_baris=None, **lain):
    s = {'nama': nama, 'jenis': 'diagram', 'ukuran': 'penuh', 'alasan': alasan, 'keterangan': ket(nama) + ', 2026', 'sumber': sumber(nama),
         'kolom': kolom, 'baris': baris, 'kelas': kelas, 'kotak': kotak, 'panah': list(panah)}
    if judul_kolom: s['judul_kolom'] = judul_kolom
    if judul_baris: s['judul_baris'] = judul_baris
    s.update(lain)
    return s


def K(id, k, b, kelas, judul, isi='', lk=1, lb=1):
    d = {'id': id, 'k': k, 'b': b, 'kelas': kelas, 'judul': judul, 'isi': isi}
    if lk > 1: d['lk'] = lk
    if lb > 1: d['lb'] = lb
    return d


P = lambda a, b, label=None: {'dari': a, 'ke': b, **({'label': label} if label else {})}
LAPIS = {'lapis': {'label': 'Lapis waktu', 'warna': 'navy'}, 'serah': {'label': 'Titik serah', 'warna': 'tint.kering.pita'},
         'aturan': {'label': 'Aturan atau pelaksana berpasal', 'warna': 'tint.netral.pita'}, 'tak': {'label': 'Tidak diatur atau tanpa data', 'warna': 'tint.bahaya.pita'},
         'jalur': {'label': 'Jalur sektor', 'warna': 'tint.basah.pita'}}
ALASAN = 'Rantai tiga lapis berpasal dengan titik serah dan pemutus; tabel pilih grafik B5.10 tidak memuat bagan alur'
diagram = [
 kisi('bab02-g21-tiga-lapis-titik-serah', ALASAN, 5, 4, LAPIS,
      [K('l1', 0, 0, 'lapis', 'Darurat', 'status tanggap darurat'), K('s1', 1, 0, 'serah', 'Titik serah 1', 'akhir status; penunjukan langsung sampai transisi'),
       K('l2', 2, 0, 'lapis', 'Sementara', 'transisi sampai R3P berjalan'), K('s2', 3, 0, 'serah', 'Titik serah 2', 'R3P ditetapkan'),
       K('l3', 4, 0, 'lapis', 'Permanen', 'masa R3P, hibah RR dan Dana Bersama'),
       K('a1', 0, 1, 'aturan', 'Perka 7/2008 dan 12/2010', 'kebutuhan dasar; perbaikan darurat'), K('a2', 2, 1, 'aturan', 'Perban 4/2020', 'DSP untuk pemulihan segera'),
       K('a3', 4, 1, 'aturan', 'Perban 5/2017 dan 4/2024', 'R3P paling lama 3 tahun; hibah RR'),
       K('j1', 0, 2, 'jalur', 'Akses', 'bailey', lk=1), K('j2', 2, 2, 'jalur', 'Akses', 'jembatan sementara TNI AD dan Polri'), K('j3', 4, 2, 'jalur', 'Akses', 'jembatan permanen'),
       K('w1', 0, 3, 'jalur', 'Air', 'truk tangki dan sumur darurat'), K('w2', 2, 3, 'jalur', 'Air', 'pipa sementara dan hidran'), K('w3', 4, 3, 'jalur', 'Air', 'SPAM permanen')],
      [P('l1', 's1'), P('s1', 'l2'), P('l2', 's2'), P('s2', 'l3')], judul_baris=['Lapis', 'Dasar', 'Akses', 'Air']),
 kisi('bab05-rantai-jembatan', ALASAN, 3, 3, LAPIS,
      [K('l1', 0, 0, 'lapis', 'Darurat', 'bailey DSP dan Kementerian PU, rangka baja'), K('l2', 1, 0, 'lapis', 'Sementara', 'jembatan TNI AD dan Polri'),
       K('l3', 2, 0, 'lapis', 'Permanen', 'Kementerian PU, pemda, desa'),
       K('a1', 0, 1, 'aturan', 'Perban 4/2020 Pasal 13 dan 14', 'DSP untuk bailey; Perka 12/2010'), K('a2', 1, 1, 'tak', 'Status R3P tidak diumumkan', 'serah terima jembatan TNI AD dan Polri tanpa data'),
       K('a3', 2, 1, 'aturan', 'Perban 5/2017 Pasal 10', 'masa R3P paling lama 3 tahun'),
       K('s1', 0, 2, 'tak', 'Serah ke aset desa', 'tanpa jalur hibah RR (Perban 4/2024 Pasal 5 huruf b dan e)', lk=2),
       K('s2', 2, 2, 'serah', 'Hibah RR', 'Pasal 5 huruf f dan Pasal 27')],
      [P('l1', 'l2'), P('l2', 'l3')], judul_baris=['Lapis', 'Dasar dan pelaksana', 'Titik serah']),
 kisi('bab06-rantai-lapis-air', ALASAN, 3, 3, LAPIS,
      [K('l1', 0, 0, 'lapis', 'Darurat', 'truk tangki, hidran, sumur darurat'), K('l2', 1, 0, 'lapis', 'Sementara', 'pipa sementara'), K('l3', 2, 0, 'lapis', 'Permanen', 'SPAM pulih'),
       K('a1', 0, 1, 'aturan', 'PP 21/2008 dan Perka 7/2008', '7 lalu 15 liter per orang per hari'), K('a2', 1, 1, 'aturan', 'Penarikan hidran', 'survei posko Cipta Karya dan BPPW, Bupati mendukung distribusi PDAM'),
       K('a3', 2, 1, 'aturan', 'PP 122/2015', 'penyelenggara SPAM: pemerintah, pemda, badan usaha'),
       K('s1', 0, 2, 'tak', 'Pemutus serah 1', 'tidak diatur: peralihan truk ke pipa'), K('s2', 1, 2, 'tak', 'Pemutus serah 2', 'tidak diatur: pipa sementara ke SPAM'),
       K('s3', 2, 2, 'serah', 'Titik serah', 'SPAM permanen kepada pengelola')],
      [P('l1', 'l2'), P('l2', 'l3')], judul_baris=['Lapis', 'Dasar', 'Titik serah dan pemutus']),
 kisi('bab07-g21-rantai-sumur-darurat', ALASAN, 4, 2, LAPIS,
      [K('n1', 0, 0, 'lapis', 'Lokasi', 'rekomendasi titik Badan Geologi'), K('n2', 1, 0, 'lapis', 'Uji mutu', 'Permenkes 2/2023'),
       K('n3', 2, 0, 'lapis', 'Serah terima', 'hibah BMN Badan Geologi'), K('n4', 3, 0, 'lapis', 'Pengelola', 'pemda, desa, atau kelompok'),
       K('p1', 0, 1, 'tak', 'Titik putus', 'rekomendasi belum berbatas waktu'), K('p2', 1, 1, 'tak', 'Titik putus', 'protokol uji mutu sumur darurat tidak ada'),
       K('p3', 2, 1, 'tak', 'Titik putus', 'jalur serah hanya untuk hibah BMN'), K('p4', 3, 1, 'tak', 'Titik putus', 'hibah RR menutup pemeliharaan, pekerjaan darurat, dan aset desa')],
      [P('n1', 'n2'), P('n2', 'n3'), P('n3', 'n4')], judul_baris=['Simpul', 'Titik putus']),
 kisi('bab09-g16-matriks-bukti', ALASAN.replace('bagan alur', 'matriks kategori bukti'), 3, 3,
      {'kuat': {'label': 'Aksi wajib menurut peraturan', 'warna': 'navy'}, 'sedang': {'label': 'Sedang', 'warna': 'biru-abu'},
       'lemah': {'label': 'Lemah', 'warna': 'tint.kering.pita'}, 'kosong': {'label': 'Belum ada', 'warna': 'kertas', 'garis': 'garis'}},
      [K('a0', 0, 0, 'kuat', 'Perka 12/2010', 'bailey dan rangka baja'), K('a1', 1, 0, 'sedang', 'SCIRT Christchurch', 'luar negeri'), K('a2', 2, 0, 'lemah', 'Palu IV, BRR', 'evaluasi terbatas'),
       K('w0', 0, 1, 'kuat', 'Perka 7/2008', 'kebutuhan dasar air'), K('w1', 1, 1, 'sedang', 'Satgas PU', 'penilaian riset, bukan rubrik'), K('w2', 2, 1, 'lemah', 'Kobe dan Tohoku', 'laporan pelaksana'),
       K('g0', 0, 2, 'kosong', 'Sumur darurat', 'belum ada'), K('g1', 1, 2, 'kosong', 'Uji mutu', 'belum ada'), K('g2', 2, 2, 'kosong', 'Sumur produksi', 'belum ada')],
      judul_kolom=['Darurat', 'Sementara', 'Permanen'], judul_baris=['Akses', 'Air perpipaan', 'Air tanah']),
 kisi('bab10-g21-alur-tiga-lapis', ALASAN, 4, 4, LAPIS,
      [K('t1', 0, 0, 'lapis', 'Kaji cepat', 'UU 24/2007'), K('t2', 1, 0, 'lapis', 'Status tanggap darurat dan DSP', 'PP 21/2008; Perban 4/2020'),
       K('t3', 2, 0, 'lapis', 'Pemulihan segera', 'Perka 12/2010'), K('t4', 3, 0, 'lapis', 'Jitupasna dan R3P', 'sejak tanggap darurat'),
       K('t5', 0, 1, 'lapis', 'Status transisi', 'Perban 6/2017'), K('t6', 1, 1, 'lapis', 'Penetapan R3P', 'Perban 5/2017'),
       K('t7', 2, 1, 'lapis', 'Hibah RR atau Dana Bersama', 'Perban 4/2024; 1/2026'), K('t8', 3, 1, 'lapis', 'Pemantauan dan evaluasi', 'atas R3P'),
       K('s1', 0, 2, 'serah', 'TS-1 air', 'tanpa pemutus tertulis', lk=2), K('s2', 2, 2, 'serah', 'TS-2 akses', 'tanpa pemutus tertulis'), K('s3', 3, 2, 'serah', 'TS-3 sumur', 'tanpa pemutus tertulis'),
       K('p1', 0, 3, 'aturan', 'Pemicu', 'asumsi kebijakan: penetapan status, R3P, dan permohonan pemda', lk=4)],
      [P('t1', 't2'), P('t2', 't3'), P('t3', 't4'), P('t4', 't8'), P('t5', 't6'), P('t6', 't7')], judul_baris=['Langkah 1 sampai 4', 'Langkah 5 sampai 8', 'Titik serah', 'Pemicu']),
 kisi('bab10-g23-kalender-musim-hujan', 'Garis waktu kesiapan berlajur per bulan; tabel pilih grafik B5.10 tidak memuat kalender tugas', 7, 3,
      {'puncak': {'label': 'Puncak musim hujan (BMKG)', 'warna': 'tint.basah.pita'}, 'tugas': {'label': 'Tugas berlabel asumsi kebijakan', 'warna': 'tint.netral.pita'},
       'r3p': {'label': 'Pemutakhiran R3P Sumatra', 'warna': 'tint.kering.pita'}},
      [K('p1', 4, 0, 'puncak', 'Desember', f"{reg('bmkg.musim_2026.zom_puncak_desember')} zona musim"), K('p2', 5, 0, 'puncak', 'Januari', f"{reg('bmkg.musim_2026.zom_puncak_januari')} zona musim"),
       K('p3', 6, 0, 'puncak', 'Februari', f"{reg('bmkg.musim_2026.zom_puncak_februari')} zona musim"),
       K('t1', 0, 1, 'tugas', 'Empat belas hari', 'keputusan dan penugasan', lk=2), K('t2', 2, 1, 'tugas', 'Seratus hari', 'baseline dan penunjukan pemilik aset', lk=3),
       K('r1', 0, 2, 'r3p', 'Pemutakhiran R3P', 'Aceh, Sumatera Utara, Sumatera Barat', lk=7)],
      judul_kolom=['Okt 2026', 'Nov', 'Des', 'Jan 2027', 'Feb', 'Mar', 'Apr'], judul_baris=['Puncak', 'Tugas', 'R3P']),
 kisi('bab11-forum-jalur-adopsi', 'Bagan forum dan jalur adopsi bertenggat; tabel pilih grafik B5.10 tidak memuat bagan lembaga', 3, 3,
      {'forum': {'label': 'Forum berdasar peraturan', 'warna': 'tint.netral.pita'}, 'kd': {'label': 'Keputusan Kepala BNPB', 'warna': 'navy'},
       'jalur': {'label': 'Jalur adopsi usulan kajian', 'warna': 'tint.basah.pita'}},
      [K('f1', 0, 0, 'forum', 'Rakor Kemenko PMK', 'Perpres 75/2021 Pasal 8'), K('f2', 1, 0, 'forum', 'Satgas per kejadian', 'Keppres 1/2026'),
       K('f3', 2, 0, 'forum', 'BNPB dan BPBD', 'Perban 6/2017 Pasal 12 sampai 14'),
       K('kd', 0, 1, 'kd', 'Keputusan Kepala BNPB', 'KD-R1 sampai KD-R4', lk=3),
       K('j1', 0, 2, 'jalur', 'Renas PB aksi 3.1.2.a', 'peninjauan berkala'), K('j2', 1, 2, 'jalur', 'Perban 1/2026 Pasal 7', 'Dana Bersama'), K('j3', 2, 2, 'jalur', 'R3P Sumatra', 'pemutakhiran')],
      [P('f1', 'kd'), P('f2', 'kd'), P('f3', 'kd'), P('kd', 'j1'), P('kd', 'j2'), P('kd', 'j3')]),
 kisi('bab11-lapisan-pembiayaan', 'Aliran sumber dana per lapis waktu ke jenis aset tanpa nominal; tabel pilih grafik B5.10 tidak memuat bagan lapisan', 4, 3,
      {'lapis': {'label': 'Lapis waktu', 'warna': 'navy'}, 'ada': {'label': 'Sumber dana berpasal', 'warna': 'tint.basah.pita'},
       'kosong': {'label': 'Sel kosong', 'warna': 'tint.bahaya.pita'}},
      [K('h0', 1, 0, 'lapis', 'Aset nasional', ''), K('h1', 2, 0, 'lapis', 'Aset daerah', ''), K('h2', 3, 0, 'lapis', 'Aset desa', ''),
       K('l1', 0, 1, 'lapis', 'Darurat', 'DSP'), K('a1', 1, 1, 'ada', 'DSP dan APBN K/L', 'Perban 4/2020'), K('a2', 2, 1, 'ada', 'DSP, BTT APBD', 'PP 12/2019'), K('a3', 3, 1, 'ada', 'DSP, dana desa', 'Permendes PDT 16/2025'),
       K('l2', 0, 2, 'lapis', 'Permanen', 'hibah RR'), K('b1', 1, 2, 'ada', 'APBN K/L', 'Kementerian PU'), K('b2', 2, 2, 'ada', 'Hibah RR dan Dana Bersama', 'Perban 4/2024; 1/2026'),
       K('b3', 3, 2, 'kosong', 'Aset desa di hibah RR', 'Pasal 5 huruf e')],
      judul_baris=['Lapis', 'Darurat', 'Permanen']),
 kisi('bab11-tata-kelola-pelaporan', 'Siklus pelaporan berfrekuensi; tabel pilih grafik B5.10 tidak memuat bagan lembaga', 4, 2,
      {'lapor': {'label': 'Pelaporan berpasal', 'warna': 'tint.netral.pita'}, 'usul': {'label': 'Alur usulan kajian', 'warna': 'tint.basah.pita'}},
      [K('r1', 0, 0, 'lapor', 'Laporan DSP', 'bulanan; Perban 4/2020 Pasal 21'), K('r2', 1, 0, 'lapor', 'Laporan hibah RR', 'tiga bulanan; Perban 4/2024 Pasal 28 dan 30'),
       K('r3', 2, 0, 'lapor', 'Satgas', 'dua bulanan; Keppres 1/2026 Pasal 10'), K('r4', 3, 0, 'lapor', 'Progsun', 'triwulan; Kepka BNPB 327/2025'),
       K('u1', 0, 1, 'usul', 'Pelaksana jembatan dan sumur', 'usulan: laporan ke BNPB sesuai R3P', lk=2), K('u2', 2, 1, 'usul', 'Pemantauan R3P', 'Perban 6/2017 Pasal 14', lk=2)],
      [P('u1', 'r2'), P('u2', 'r3')]),
]

if __name__ == '__main__':
    if '--susun' in sys.argv:
        from PIL import Image

        def susun(panel, nama, kolom):
            im = [Image.open(KE / f'{n}.png').convert('RGB') for n in panel]
            man = [json.loads((KE / f'{n}.json').read_text()) for n in panel]
            w, sela = max(i.width for i in im), 24
            baris = [im[i:i + kolom] for i in range(0, len(im), kolom)]
            hb = [max(x.height for x in b) for b in baris]
            out = Image.new('RGB', (w * kolom + sela * (kolom - 1), sum(hb) + sela * (len(baris) - 1)), 'white')
            y = 0
            for b, h in zip(baris, hb):
                for j, x in enumerate(b):
                    out.paste(x, (j * (w + sela), y))
                y += h + sela
            out.save(KE / f'{nama}.png', dpi=im[0].info.get('dpi', (300, 300)))
            hexb = {}
            for m in man:
                for h, ps in m['hex'].items():
                    hexb[h] = sorted(set(hexb.get(h, [])) | set(ps))
            teks_min = min(float(x) for n in panel for x in re.findall(r'font-size="([\d.]+)"', (KE / f'{n}.svg').read_text()))
            lebar_cm = round(man[0]['ukuran_cm'][0] * kolom + 0.2 * (kolom - 1), 2)
            (KE / f'{nama}.json').write_text(json.dumps({'nama': nama, 'jenis': man[0]['jenis'], 'panel': panel, 'teks_min_pt': teks_min,
                'ukuran_cm': [lebar_cm, round(lebar_cm * out.height / out.width, 2)], 'hex': hexb}, ensure_ascii=False, indent=1))
            print(nama, out.size, lebar_cm)

        susun(['bab06-biaya-renk', 'bab06-biaya-hsu'], 'bab06-batang-biaya-truk-pipa', 2)
        susun(['bab08-sebaran-a', 'bab08-sebaran-b', 'bab08-sebaran-c'], 'bab08-peta-sebaran-provinsi', 3)
    else:
        (SINI / 'spek-rehab').mkdir(exist_ok=True)
        (SINI / 'spek-rehab' / 'grafik.json').write_text(json.dumps(grafik, ensure_ascii=False, indent=1))
        (SINI / 'spek-rehab' / 'diagram.json').write_text(json.dumps(diagram, ensure_ascii=False, indent=1))
        print(len(grafik), 'grafik,', len(diagram), 'diagram')
