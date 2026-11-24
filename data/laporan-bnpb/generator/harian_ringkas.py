"""Laporan Kejadian Bencana Harian untuk bot WA (scripts/wa/otomatis.mjs), format sama dengan laporan manual 16 Nov 2026
(harian/2026-11/2026-11-16/jalan.py, VERSI_AWAL=1 ALT=2): 2 slide (ringkasan, status siaga), tanpa karhutla.

Slide 1 memuat kejadian baru DAN kejadian yang bencananya masih berlangsung, kolom MULAI, kartu per jenis, peta dengan penanda
peringatan dini, panel Status Siaga dan Peringatan Dini, serta pita Rencana Aksi. Bagian yang di laporan manual diketik tangan tiap hari
di sini diisi aturan (pemilik 16 Nov 2026: "Setuju, pakai aturan"):
- masih berlangsung: Kondisi Mutakhir WA (belum surut, fluktuatif, menggenangi, ...); angin/cuaca ekstrem dan gempa tidak pernah;
- MULAI: tanggal di data.json laporan hari sebelumnya (bot: folder keluaran tanggal sebelumnya; manual: jalur.harian), mundur sampai 4 hari;
  tidak ketemu = tanggal awal periode WA;
- Peringatan Dini dan penanda peta: dari WA BMKG. PM2,5 Sangat Tidak Sehat atau lebih dibuang bila bandara terdekat (jarak pandang website)
  mencatat jarak pandang 5 km atau lebih tanpa asap/kabut asap (pemilik 16 Nov: Pekanbaru 2.534,7 galat sensor, jarak pandang 6 km);
- Rencana Aksi: kalimat baku per jenis bencana dan pengungsi, angka dari WA Koordalops.

    python harian_ringkas.py --tanggal 2026-11-16 --koordalops k.txt --bmkg b.txt --pvmbg p.txt --out DIR [--isian isian.json]
    python harian_ringkas.py --uji

Bot laporan (BL-06): nama shape stabil s<n>_<peran> di deck akhir, <deck>.kunci.json selalu ditulis, --isian opsional (ISIAN_HARIAN).
"""
import argparse, collections, datetime as dt, json, math, os, re, shutil, subprocess, sys, zipfile

G = os.path.dirname(os.path.abspath(__file__))
AKAR = os.path.abspath(os.path.join(G, '..', '..', '..'))
sys.path.insert(0, G)
TANPA_KEPADA = 'pemilik 2 Nov 2026: pil Disampaikan kepada dihapus, laporan harian dipresentasikan Kepala BNPB sendiri'

# Urutan penting: yang lebih khusus dulu. Kalimat baru jatuh ke tanpa pil; tambah baris bila pemilik minta label lain.
ATURAN_PIL = [
    (r'belum surut', 'Belum surut', 'waspada'),
    (r'fluktuatif', 'TMA fluktuatif', 'waspada'),
    (r'berangsur surut', 'Berangsur surut', 'surut'),
    (r'sebagian.*surut|surut sebagian', 'Sebagian surut', 'surut'),
    (r'surut.*pembersihan', 'Surut, pembersihan', 'tangani'),
    (r'surut', 'Sudah surut', 'selesai'),
    (r'menggenangi|tergenang|terendam|genangan', 'Menggenangi', 'waspada'),
    (r'air bersih|distribusi air|dropping', 'Distribusi air', 'tangani'),
    (r'perbaikan rumah', 'Perbaikan rumah', 'tangani'),
    (r'pohon.*dievakuasi', 'Pohon tumbang dievakuasi', 'selesai'),
    (r'kondusif', 'Sudah kondusif', 'selesai'),
    (r'penanganan oleh bpbd', 'Ditangani BPBD', 'tangani'),
    (r'(?<!belum )padam', 'Sudah padam', 'selesai'),
    (r'pencarian', 'Pencarian korban', 'tangani'),
    (r'pembersihan', 'Pembersihan', 'tangani'),
    (r'pendataan', 'Dalam pendataan', 'tangani'),
    (r'penanganan', 'Dalam penanganan', 'tangani'),
]


def pil_kondisi(teks):
    t = (teks or '').lower()
    return next(((label, jenis) for pola, label, jenis in ATURAN_PIL if re.search(pola, t)), None)


# 11 Nov pemilik: "yang ongoing tuh BENCANANYA, bukan penanganannya". Banjir/longsor berlangsung selama air belum surut atau TMA
# masih naik turun; kekeringan selama air bersih masih disalurkan. Angin kencang, cuaca ekstrem, gempa: kejadiannya sudah lewat.
BERLANGSUNG = {
    'banjir': r'belum surut|fluktuatif|menggenang|tergenang|terendam|genangan|berangsur surut|mulai surut|sebagian.*(?:surut|genang)|masih diguyur|naik|meluap',   # 20 Nov: "mulai surut" = masih ada genangan (Lima Puluh Kota)
    'longsor': r'belum surut|belum (?:bisa|dapat) dilalui|tertutup material|pencarian|longsor susulan|fluktuatif',
    'kekeringan': r'air bersih|distribusi|dropping|kekeringan|krisis air',
}


def masih_berlangsung(x):
    pola = BERLANGSUNG.get(x['jenis'])
    t = (x['teks'].get('kondisi') or '').lower()
    return bool(pola and re.search(pola, t))


def wa_normal(t):
    """Ragam tulisan WA Koordalops yang belum dibaca wa_harian (sama dengan wa_normal laporan manual 12-16 Nov)."""
    t = t.replace('- ⁠', '- ')                                        # 16 Nov: "- ⁠Pengungsi" dengan word joiner
    t = re.sub(r'\bKab (?=[A-Z])', 'Kab. ', t)                             # 16 Nov: "Kab Aceh Barat"
    t = re.sub(r'\*\((Kejadian Baru|Pengkinian [Dd]ata|Update)\)\*', lambda m: '(' + m[1].replace(' data', ' Data') + ')', t)
    t = re.sub(r'\n\* ', '\n- ', t); t = re.sub(r'\nDetail:', '\n- Detail:', t)   # 12 Nov: butir "* "
    t = t.replace('Kota. ', 'Kota ').replace('Kab. Banggai Kep.', 'Kab. Banggai Kepulauan')
    t = re.sub(r'\*([A-Z])\. Provinsi ', r'*\1. Prov. ', t)                # 13-16 Nov: kepala blok "Provinsi Aceh"
    return t


def pvmbg_normal(t):   # 14 Nov: "Level *IV (Awas)*", "*Laporan Khusus Gunung Api ...*", "*Visual:*" berbintang, "*Gn. X (Kab ...)*"
    t = re.sub(r'Level \*([IV]+ \(\w+\))\*', r'Level \1', t)
    t = t.replace('*Laporan Khusus Gunung Api pada', '*Laporan khusus gunung api pada')
    t = re.sub(r'(?m)^\*(Visual|Kegempaan|Rekomendasi):\*[ \t]*$', r'\1:', t)
    # 19-20 Nov: kepala "> LAPORAN KHUSUS GUNUNG API PADA LEVEL III (Siaga)" kapital dan judul gunung bernomor "*1. Gn. Anak Krakatau (...)*"
    # (tanpa ini gunung Siaga hilang dari panel Status Siaga dan peta slide 1; laporan manual 19 Nov sudah menormalkannya di jalan.py)
    t = re.sub(r'(?m)^> LAPORAN KHUSUS GUNUNG API PADA LEVEL (\w+) \((\w+)\)\s*$', lambda m: f'*Laporan khusus gunung api pada Level {m[1]} ({m[2]})*', t)
    t = re.sub(r'(?m)^\*\d+\. (Gn\. )', r'*\1', t)
    return re.sub(r'(\*Gn\. [^(*\n]+?) \([^)]*\)\*', r'\1*', t)


def blok_wa(teks, lokasi):
    """Teks satu kejadian di WA Koordalops (untuk angka yang tidak diurai wa_harian, mis. pengungsi KK)."""
    for b in re.split(r'\n(?=\d+\.\s)', teks):
        # 20 Nov: nama kab/kota sudah ejaan batas wilayah ("Lima Puluh Kota", "Kepulauan Mentawai"), WA bisa "Lima puluh Kota", "Kep. Mentawai"
        nm_ = re.escape(re.sub(r'^Kepulauan ', 'Kep. ', lokasi.replace('Kota ', ''))).replace(r'Kep\.\ ', r'(?:Kep\.\s*|Kepulauan\s+)')
        if re.search(rf'\bdi (?:Kab\.? |Kota\.? |Kabupaten )?(?:{nm_}|{re.escape(lokasi.replace("Kota ", ""))})\b', b.split('\n')[0], re.I):
            return b
    return ''


def angka_id(s):
    return int(s.replace('.', '').replace(',', '')) if s else 0


def pengungsi_kk(blok):
    m = re.search(r'Pengungsi\s*[:;]\s*[±+]?\s*([\d.]+)\s*KK', blok)
    return angka_id(m[1]) if m else 0


# ----------------------------------------------------------------------------- nama provinsi
NAMA_PROV = None


def kode_prov(nama, harian):
    """Nama provinsi dari WA BMKG -> kode ('Sumatra Barat', 'NTT', 'Kep. Riau', 'DIY' ...)."""
    global NAMA_PROV
    if NAMA_PROV is None:
        n = lambda s: re.sub(r'[^a-z]', '', s.lower().replace('kepulauan', 'kep').replace('sumatra', 'sumatera'))
        NAMA_PROV = {n(v): k for k, v in harian.NAMA.items()}
        NAMA_PROV.update({n(v): k for v, k in (('NTT', '53'), ('NTB', '52'), ('DIY', '34'), ('Yogyakarta', '34'), ('D.I. Yogyakarta', '34'), ('Jakarta', '31'),
                                              ('Babel', '19'), ('Bangka Belitung', '19'), ('Kepri', '21'), ('Riau Kepulauan', '21'))})
        NAMA_PROV['n'] = n
    return NAMA_PROV.get(NAMA_PROV['n'](nama))


# singkatan sama dengan panel Peringatan Dini laporan manual 14-16 Nov
SINGKAT_PANEL = {'11': 'Aceh', '12': 'Sumut', '13': 'Sumbar', '14': 'Riau', '15': 'Jambi', '16': 'Sumsel', '17': 'Bengkulu', '18': 'Lampung', '19': 'Babel',
                 '21': 'Kepri', '31': 'Jakarta', '32': 'Jabar', '33': 'Jateng', '34': 'DIY', '35': 'Jatim', '36': 'Banten', '51': 'Bali', '52': 'NTB',
                 '53': 'NTT', '61': 'Kalbar', '62': 'Kalteng', '63': 'Kalsel', '64': 'Kaltim', '65': 'Kaltara', '71': 'Sulut', '72': 'Sulteng',
                 '73': 'Sulsel', '74': 'Sultra', '75': 'Gorontalo', '76': 'Sulbar', '81': 'Maluku', '82': 'Malut', '91': 'Papua', '92': 'Papua Barat',
                 '93': 'Papua Selatan', '94': 'Papua Tengah', '95': 'Papua Pegunungan', '96': 'Papua Barat Daya'}

# Titik penanda peringatan dini per provinsi di peta (lon, lat, sisi label). Diambil dari letak yang sudah dirapikan di laporan manual
# 14-16 Nov (pemilik 16 Nov: "bisa diperbaiki ga agar tidak numpuk2": Banten di atas Anak Krakatau, Jakarta ke kanan, Jabar dan Jateng berjauhan).
# 20 Nov 2026 pemilik ("Sama ini bro ketutup"): Sumut 99,2 BT 0,7 LU menutup lencana gempa Nias Barat di pojok bulatan Sumut -> 98,2 BT 1,0 LU
TITIK_PROV = {'11': (97.8, 2.3, 'kanan'), '12': (98.2, 1.0, 'kanan'), '13': (100.6, -0.7, 'kiri'), '14': (101.9, 0.4, 'kanan'), '15': (103.0, -1.7, 'kanan'),
              '16': (104.2, -3.4, 'kanan'), '17': (102.3, -3.7, 'kiri'), '18': (105.0, -4.9, 'kiri'), '19': (106.4, -2.4, 'kanan'), '21': (104.4, 0.9, 'kanan'),
              '31': (107.55, -5.75, 'kanan'), '32': (107.85, -7.3, 'kanan'), '33': (109.45, -7.05, 'kanan'), '34': (110.4, -8.2, 'kiri'), '35': (112.5, -7.6, 'kanan'),
              '36': (106.55, -5.45, 'kiri'), '51': (115.1, -8.4, 'kanan'), '52': (117.0, -8.6, 'kanan'), '53': (121.5, -8.7, 'kanan'), '61': (110.5, 0.0, 'kiri'),
              '62': (113.5, -1.6, 'kanan'), '63': (115.4, -2.9, 'kanan'), '64': (116.4, 0.5, 'kanan'), '65': (116.3, 2.9, 'kanan'), '71': (124.6, 1.0, 'kanan'),
              '72': (121.0, -1.3, 'kanan'), '73': (120.0, -4.0, 'kiri'), '74': (122.3, -4.0, 'kanan'), '75': (122.6, 0.6, 'kanan'), '76': (119.2, -2.6, 'kiri'),
              '81': (129.5, -3.3, 'kanan'), '82': (127.8, 1.0, 'kanan'), '91': (139.5, -2.6, 'kanan'), '92': (133.3, -1.3, 'kanan'), '93': (139.5, -7.4, 'kiri'),
              '94': (136.5, -3.8, 'kanan'), '95': (139.0, -4.2, 'kiri'), '96': (131.8, -1.0, 'kanan')}
# penanda tanpa nama provinsi (laporan manual 14-16 Nov): titiknya berdesakan dengan penanda lain atau label kejadian/gunung api
TANPA_NAMA = {'11', '12', '32', '33'}
# stasiun PM2,5 BMKG: (label peta, lon, lat, sisi). Stasiun lain dicari dari pusat kecamatan website (nama kab/kota atau kecamatan).
TITIK_KOTA = {'Kemayoran': ('Jakarta', 107.55, -5.75, 'kanan'), 'Jakarta': ('Jakarta', 107.55, -5.75, 'kanan'), 'Medan': ('Medan', 98.7, 3.6, 'kanan'),
              'Pekanbaru': ('Pekanbaru', 101.45, 0.5, 'kanan'), 'Samarinda': ('Samarinda', 117.15, -0.5, 'kiri'), 'Palembang': ('Palembang', 104.75, -2.95, 'kanan')}


def titik_kota(nama, pusat):
    if nama in TITIK_KOTA:
        return TITIK_KOTA[nama]
    n = nama.lower()
    for kunci_cocok in (lambda kb, kc: kb.lower() in (n, 'kota ' + n), lambda kb, kc: kc.lower() == n):
        c = [(la, lo) for k, (la, lo) in pusat.items() for pk, kb, kc in [k.split('|')] if kunci_cocok(kb, kc)]
        if c:
            return nama, sum(p[1] for p in c) / len(c), sum(p[0] for p in c) / len(c), 'kanan'
    return None


def jarak_km(a, b):
    la1, lo1, la2, lo2 = map(math.radians, (a[0], a[1], b[0], b[1]))
    return 6371 * 2 * math.asin(math.sqrt(math.sin((la2 - la1) / 2) ** 2 + math.cos(la1) * math.cos(la2) * math.sin((lo2 - lo1) / 2) ** 2))


def pm_galat(lat, lon, nilai, jp, saat):
    """Alasan membuang angka PM2,5 (str) atau None. Hanya Sangat Tidak Sehat ke atas (> 150,4) yang diperiksa: bandara dalam 60 km yang
    pada +-90 menit dari jam ukur mencatat jarak pandang >= 5 km tanpa FU/HZ (asap, kabut asap) = angka itu galat sensor."""
    if nilai <= 150.4 or not jp:
        return None
    dekat = min(((jarak_km((lat, lon), (s['lat'], s['lon'])), s) for s in jp['stasiun'] if not s.get('basi')), default=None, key=lambda t: t[0])
    if not dekat or dekat[0] > 60:
        return None
    obs = [o for o in dekat[1]['jam'] if abs((dt.datetime.fromisoformat(o['t'].replace('Z', '+00:00')) - saat).total_seconds()) <= 5400]
    if obs and all((o.get('vis_m') or 0) >= 5000 and not re.search(r'FU|HZ', o.get('wx') or '') for o in obs):
        return f"bandara {dekat[1]['icao']} ({dekat[0]:.0f} km) jarak pandang {min(o['vis_m'] for o in obs) / 1000:.0f} km tanpa asap"
    return None


KATEGORI = ['Tidak Sehat', 'Sangat Tidak Sehat', 'Berbahaya']


def f_id(v, d=1):
    return f'{v:,.{d}f}'.replace(',', '#').replace('.', ',').replace('#', '.')


def bungkus(nama, lebar=30):
    """Daftar nama dipisah koma, dipenggal per baris (panel Peringatan Dini menerima '\\n')."""
    baris, kini = [], ''
    for i, n in enumerate(nama):
        t = n + (',' if i < len(nama) - 1 else '')
        if kini and len(kini) + 1 + len(t) > lebar:
            baris.append(kini); kini = t
        else:
            kini = f'{kini} {t}'.strip()
    return '\n'.join(baris + [kini])


def peringatan(w, harian, jp, pusat, T, prov_kejadian):
    """-> (PERINGATAN_BARIS, PERINGATAN_PETA, catatan buang). Bentuk sama dengan isian tangan laporan manual 14-16 Nov."""
    jam = (re.search(r'(\d\d)[.:](\d\d)', w.get('jam') or '') or [None, '06', '00'])
    saat = dt.datetime(T.year, T.month, T.day, int(jam[1]), int(jam[2]), tzinfo=dt.timezone(dt.timedelta(hours=7)))
    per = re.sub(r'\s*\d{4}$', '', (w.get('periode') or '').replace(' – ', '–').replace(' - ', '–').strip())
    udara, buang = {}, []
    for kota, v, kat in w['pm']:
        kat = next((k for k in KATEGORI if k.lower() == (kat or '').lower()), None)
        if not kat:
            continue
        tk = titik_kota(kota, pusat)
        alasan = tk and pm_galat(tk[2], tk[1], v, jp, saat.astimezone(dt.timezone.utc))
        if alasan:
            buang.append(f'{kota} {f_id(v)} ({alasan})'); continue
        if kota not in udara or udara[kota][0] < v:
            udara[kota] = (v, kat, tk)
    baris, peta = [], []
    for kat in reversed(KATEGORI):
        kota = sorted((k for k, (v, c, _) in udara.items() if c == kat), key=lambda k: -udara[k][0])
        if not kota:
            continue
        wr = 'oranye' if kat == 'Tidak Sehat' else 'merah'
        lok = bungkus([f'{k} ({f_id(udara[k][0])})' for k in kota], 24)
        baris.append((f'asapsolid_{wr}', 'Kualitas udara', lok, kat, wr, f'µg/m³, {T.day} {harian.BULAN[T.month - 1][:3]} {jam[1]}.{jam[2]} WIB', 'jam_navy'))
        for k in kota:
            tk = udara[k][2]
            if tk: peta.append((tk[1], tk[2], f'{tk[0]}|PM2,5 {kat}', wr, tk[3]))
    for kunci, wr, pil in (('awas', 'merah', 'Awas'), ('siaga', 'oranye', 'Siaga')):
        kd = [k for k in (kode_prov(p, harian) for p in w.get(kunci) or []) if k]
        if kd:
            nm_h = 'Hujan sangat lebat' if kunci == 'awas' else 'Hujan lebat'   # 20 Nov: BMKG "Awas (hujan sangat lebat): Kalimantan Barat"
            baris.append((f'hujansolid_{wr}', nm_h, bungkus([SINGKAT_PANEL[k] for k in kd]), pil, wr, per))
            peta += [(*TITIK_PROV[k][:2], f"{'' if k in prov_kejadian or k in TANPA_NAMA else harian.NAMA[k]}|{nm_h}", wr, TITIK_PROV[k][2]) for k in kd]
    kd = [k for k in (kode_prov(p, harian) for p in w.get('angin') or []) if k]
    if kd:
        baris.append(('anginsolid_oranye', 'Angin kencang', bungkus([SINGKAT_PANEL[k] for k in kd]), 'Berpotensi', 'oranye', per))
        siaga_kd = {kode_prov(p, harian) for p in (w.get('awas') or []) + (w.get('siaga') or [])}
        peta += [(*TITIK_PROV[k][:2], f"{'' if k in prov_kejadian or k in TANPA_NAMA else harian.NAMA[k]}|Angin kencang", 'oranye', TITIK_PROV[k][2]) for k in kd if k not in siaga_kd]
    return baris, peta, buang


# ----------------------------------------------------------------------------- Rencana Aksi
ANGKA_KATA = {1: 'satu', 2: 'dua', 3: 'tiga', 4: 'empat', 5: 'lima', 6: 'enam', 7: 'tujuh', 8: 'delapan', 9: 'sembilan'}


def daftar_kata(n):
    return n[0] if len(n) == 1 else ', '.join(n[:-1]) + ' dan ' + n[-1]


def rencana_aksi(kej, wa_teks, harian):
    """Pita RENCANA AKSI: satu kartu per jenis bencana yang tampil (urut judul), kartu pengungsi sesudah kartu pertama bila ada pengungsi.
    Kalimat utuh, angka ditulis ± seperti WA (pemilik 11 Nov: "jangan pakai klausa/frasa nanggung")."""
    f0 = harian.f0
    per = collections.OrderedDict()
    sama = lambda j: 'cuaca' if j == 'angin' else j   # 20 Nov: angin dan cuaca satu kartu Cuaca ekstrem (slide menyatukannya), tidak tergeser gempa
    for j in ['banjir', 'cuaca', 'kekeringan', 'longsor'] + [sama(x['jenis']) for x in kej]:
        if any(sama(x['jenis']) == j for x in kej): per.setdefault(j, [x for x in kej if sama(x['jenis']) == j])
    # 20 Nov: lebih dari tiga lokasi ditulis jumlahnya ("di tujuh kab/kota", laporan manual 201126); daftar panjang meluber dari kartu
    lok = lambda xs: daftar_kata([x['lokasi'] for x in xs]) if len(xs) <= 3 else f"{ANGKA_KATA.get(len(xs), len(xs))} kab/kota"
    kk = lambda xs: sum(int(x['angka'].get('kk') or 0) for x in xs)
    kartu = []
    for j, xs in per.items():
        provs = sorted({x['prov'] for x in xs})
        if j == 'banjir':
            tempat = f"{ANGKA_KATA.get(len(provs), len(provs))} provinsi" if len(provs) > 1 else harian.NAMA[provs[0]] if len(xs) > 1 else xs[0]['lokasi']
            kartu.append(('banjir_putih', 'Banjir', f"Memantau banjir di {tempat}" + (f" yang berdampak pada ±{f0(kk(xs))} KK." if kk(xs) else '.')))
        elif j == 'kekeringan':
            kartu.append(('tetes_putih', 'Kekeringan', f"Mendukung BPBD {lok(xs)} menyalurkan air bersih" + (f" ke ±{f0(kk(xs))} KK." if kk(xs) else '.')))
        elif j in ('cuaca', 'angin'):
            rm = sum(int(x['angka'].get('rumah_dampak') or x['angka'].get('rumah') or 0) for x in xs)   # angin: wa_harian mengisi 'rumah' (RR/RS/RB)
            kartu.append(('angin_putih', 'Cuaca ekstrem', f"Mengkaji cepat ±{f0(rm)} rumah terdampak angin kencang di {lok(xs)}." if rm else f"Mengkaji cepat dampak cuaca ekstrem di {lok(xs)}."))
        elif j == 'longsor':
            md = sum(int(x['angka'].get('meninggal') or 0) for x in xs)
            kartu.append(('longsor_putih', 'Tanah longsor', f"Memantau penanganan tanah longsor di {lok(xs)}" + (f" dengan {f0(md)} korban meninggal." if md else '.')))
        elif j == 'gempabumi':
            kartu.append(('gempa_putih', 'Gempa bumi', f"Memantau penanganan dampak gempa bumi di {lok(xs)}."))
        else:
            nm = harian.JENIS_LAIN.get(j, (j.replace('_', ' ').capitalize(),))[0]
            kartu.append(('awas_putih', nm, f"Memantau penanganan {nm.lower()} di {lok(xs)}."))
    ungsi = [(x['lokasi'], pengungsi_kk(blok_wa(wa_teks, x['lokasi']))) for x in kej]
    ungsi = sorted([u for u in ungsi if u[1]], key=lambda u: -u[1])
    if ungsi and len(kartu) < 3:   # 20 Nov: kartu jenis bencana didahulukan (laporan manual 201126: banjir, longsor, cuaca ekstrem; pengungsi tidak menggeser jenis)
        tempat_u = daftar_kata([l for l, _ in ungsi]) if len(ungsi) <= 2 else f"{ANGKA_KATA.get(len(ungsi), len(ungsi))} kab/kota"
        kartu.insert(1, ('tenda_putih', 'Pengungsi', f"Memantau layanan ±{f0(sum(n for _, n in ungsi))} KK pengungsi di {tempat_u}."))
    return kartu[:3]


# ----------------------------------------------------------------------------- MULAI
def mulai_lama(T, out):
    """{(prov, lokasi): mulai} dari data.json laporan 1-4 hari sebelumnya (keluaran bot di folder tanggal sebelahnya, lalu folder repo)."""
    import jalur, harian_rincian
    hasil = {}
    for n in range(4, 0, -1):   # yang paling dekat menang
        d = T - dt.timedelta(days=n)
        calon = [os.path.join(os.path.dirname(out), d.isoformat(), f'kerja-{d:%d%m%y}', 'data.json'), os.path.join(out, '..', d.isoformat(), f'kerja-{d:%d%m%y}', 'data.json')]
        if os.environ.get('WA_MULAI_AKAR'):   # bot proyek (BL-08): keluaran per versi tidak bersebelahan dengan folder tanggal jalur terjadwal
            calon.append(os.path.join(os.environ['WA_MULAI_AKAR'], d.isoformat(), f'kerja-{d:%d%m%y}', 'data.json'))
        try: calon.append(os.path.join(jalur.harian(d), f'kerja-{d:%d%m%y}', 'data.json'))
        except Exception: pass
        f = next((c for c in calon if os.path.exists(c)), None)
        if not f: continue
        for x in json.load(open(f, encoding='utf-8'))['kejadian']:
            if x.get('mulai') and x.get('jenis') != 'karhutla':
                hasil[(x['prov'], harian_rincian.kunci_lok(x.get('lokasi_asli') or x['lokasi']))] = x['mulai']   # 20 Nov: kunci ejaan longgar (nama geo lawan nama WA)
    return hasil


PENDEK_LOK = {'Hulu Sungai Selatan': 'Hulu Sungai Sel.', 'Kota Administrasi Jakarta Selatan': 'Kota Jakarta Selatan'}   # 12-13 Nov: nama penuh terpotong di kolom KAB/KOTA


# ----------------------------------------------------------------------------- BL-06 bot laporan: isian, nama shape, kunci
# Dipakai juga penanganan_otomatis.py. Semuanya stdlib (venv bot hanya Pillow). Tanpa --isian keluaran deck sama dengan sebelumnya
# kecuali atribut name shape (D9); <deck>.kunci.json berkas baru di sebelah PPTX (D3, A6).
METRIK = (('hotspot', 'HOTSPOT'), ('firespot', 'FIRESPOT'), ('luas_terbakar', 'LUAS TERBAKAR'), ('belum_padam', 'BELUM PADAM'))
# K4: angka sistem tidak pernah dari WA dan tidak bisa diubah lewat isian (nama medan dan sinonimnya, sesudah normal_medan)
MEDAN_KUNCI = {'hotspot', 'hot', 'titik_panas', 'firespot', 'fs', 'titik_api', 'luas_terbakar', 'luas', 'terbakar', 'ha',
               'belum_padam', 'luas_belum_padam', 'belum', 'padam', 'luas_padam'}


def bersih_unicode(t):   # NFKC + buang karakter format (Cf: zero-width, word joiner) sebelum mencocokkan kata angka sistem
    import unicodedata
    return ''.join(c for c in unicodedata.normalize('NFKC', str(t)) if unicodedata.category(c) != 'Cf')


def normal_medan(k):
    return re.sub(r'[\s\-]+', '_', bersih_unicode(k).strip().lower())


# K4 juga untuk teks bebas: kata angka sistem bersama angka di satu teks ('hotspot 999 titik', '5.000 ha terbakar') ditolak
KATA_KUNCI = re.compile(r'hot[\s_-]*spot|fire[\s_-]*spot|titik[\s_-]*(?:panas|api)|(?:luas|lahan|hutan|area)[\s_-]*(?:yang\s+)?terbakar|\bha\s*terbakar|'
                        r'belum[\s_-]*padam|sudah[\s_-]*padam|luas[\s_-]*padam', re.I)   # spasi boleh hilang: Cf (soft hyphen) dibuang lebih dulu


def teks_angka_kunci(v):
    """True bila v (teks, atau daftar/objek berisi teks) memuat kata angka sistem dan angka sekaligus."""
    if isinstance(v, str):
        v = bersih_unicode(v); return bool(KATA_KUNCI.search(v) and re.search(r'\d', v))
    if isinstance(v, (list, tuple)): return any(teks_angka_kunci(x) for x in v)
    if isinstance(v, dict): return any(teks_angka_kunci(x) for x in v.values())
    return False


def medan_kunci(k):   # nama medan angka sistem, juga tanpa pemisah ('luasterbakar' sesudah Cf dibuang) atau berkata kunci ('jumlah_hotspot')
    kn = normal_medan(k)
    return kn in MEDAN_KUNCI or kn.replace('_', '') in {m.replace('_', '') for m in MEDAN_KUNCI} or bool(KATA_KUNCI.search(kn))


def _peringatan(pesan):
    print('PERINGATAN isian:', pesan, file=sys.stderr)


def saring_isian(nilai, skema, jalur='isian'):
    """Bersihkan isian menurut skema. skema: tipe (int, float, str, bool, 'tanggal'), dict medan -> skema, ('peta', skema) = dict berkunci
    bebas (nama provinsi, unsur), ('daftar', skema), ('pasang', skema) = [a, b], ('atau_kosong', skema). Medan tak dikenal dan medan angka
    sistem dibuang dengan peringatan ke stderr; nilai salah tipe juga. Hasil: nilai bersih, atau None bila ditolak."""
    if isinstance(skema, tuple) and skema[0] == 'atau_kosong':
        return None if nilai is None else saring_isian(nilai, skema[1], jalur)
    if isinstance(skema, dict):
        if not isinstance(nilai, dict):
            _peringatan(f'{jalur}: harus objek, diabaikan'); return None
        hasil = {}
        for k, v in nilai.items():
            kn = normal_medan(k)
            if medan_kunci(kn):
                _peringatan(f'{jalur}.{k}: angka sistem dikunci (hotspot, firespot, luas terbakar, luas belum padam hanya dari sistem), diabaikan'); continue
            if kn not in skema:
                _peringatan(f'{jalur}.{k}: medan tidak dikenal, diabaikan'); continue
            b = saring_isian(v, skema[kn], f'{jalur}.{k}')
            if b is not None or (isinstance(skema[kn], tuple) and skema[kn][0] == 'atau_kosong' and v is None):
                hasil[kn] = b
        return hasil
    if isinstance(skema, tuple) and skema[0] == 'peta':
        if not isinstance(nilai, dict):
            _peringatan(f'{jalur}: harus objek, diabaikan'); return None
        hasil = {}
        for k, v in nilai.items():
            if medan_kunci(k):
                _peringatan(f'{jalur}.{k}: angka sistem dikunci, diabaikan'); continue
            b = saring_isian(v, skema[1], f'{jalur}.{k}')
            if b is not None: hasil[str(k).strip()] = b
        return hasil
    if isinstance(skema, tuple) and skema[0] in ('daftar', 'pasang'):
        if not isinstance(nilai, list) or (skema[0] == 'pasang' and len(nilai) != 2):
            _peringatan(f"{jalur}: harus {'daftar' if skema[0] == 'daftar' else 'pasangan [a, b]'}, diabaikan"); return None
        hasil = [saring_isian(v, skema[1], f'{jalur}[{i}]') for i, v in enumerate(nilai)]
        if skema[0] == 'pasang' and None in hasil: return None
        return [h for h in hasil if h is not None]
    if skema == 'tanggal':
        try: return dt.date.fromisoformat(str(nilai))
        except ValueError: _peringatan(f'{jalur}: tanggal harus YYYY-MM-DD, diabaikan'); return None
    if skema is bool:
        if isinstance(nilai, bool): return nilai
    elif skema in (int, float):
        if isinstance(nilai, (int, float)) and not isinstance(nilai, bool) and (skema is float or float(nilai).is_integer()):
            return skema(nilai)
    elif skema is str:
        if isinstance(nilai, str):
            if teks_angka_kunci(nilai):
                _peringatan(f'{jalur}: teks memuat angka sistem (hotspot, firespot, luas terbakar, belum padam hanya dari sistem), diabaikan'); return None
            return nilai
    elif isinstance(skema, tuple) and skema[0] == 'apa':   # daftar/objek bebas yang diteruskan apa adanya (mis. baris PM2,5 [kota, nilai, kategori])
        if teks_angka_kunci(nilai):
            _peringatan(f'{jalur}: teks memuat angka sistem, diabaikan'); return None
        return nilai
    _peringatan(f'{jalur}: tipe salah ({type(nilai).__name__}), diabaikan')
    return None


def baca_isian(path, skema):
    """--isian <json>: objek medan non-sistem hasil urai bahan WA (BL-05/BL-08). Berkas rusak = berhenti (bendera diberikan tapi tak terbaca)."""
    try:
        with open(path, encoding='utf-8') as f: data = json.load(f)
    except (OSError, ValueError) as e: sys.exit(f'--isian {path} tidak terbaca: {e}')
    if not isinstance(data, dict): sys.exit(f'--isian {path}: isi harus objek JSON')
    return saring_isian(data, skema) or {}


ANGKA_KEJADIAN = {k: int for k in ('kk', 'jiwa', 'tangki', 'liter', 'meninggal', 'kios', 'rumah', 'rumah_dampak', 'potensi_kk', 'mengungsi', 'huntara', 'hilang')}
# medan bahan yang dibaca generator ini (wa_harian.koordalops/bmkg/pvmbg); kejadian dicocokkan lewat lokasi (+ jenis bila diisi)
ISIAN_HARIAN = {
    'laporan': int,
    'kejadian': ('daftar', {'lokasi': str, 'jenis': str, 'baru': bool, 'label': str, 'angka': ANGKA_KEJADIAN, 'transisi_sd': str,
                            'teks': {'dampak': str, 'status_darurat': str, 'kondisi': str, 'pengungsi': str}}),
    'bmkg': {'jam': str, 'periode': str, 'pm': ('daftar', ('apa',)), 'hujan': ('daftar', str), 'angin': ('daftar', str),
             'siaga': ('daftar', str), 'awas': ('daftar', str)},
    'pvmbg': {'jam': str, 'level': {'awas': int, 'siaga': int, 'waspada': int, 'normal': int}},
}


def _nama_wilayah(s):
    """Kunci banding lokasi: 'Kab. Aceh Selatan', 'Kabupaten Aceh Selatan', 'aceh selatan' sama; 'Kota. Mataram' = 'Kota Mataram'.
    Awalan kabupaten dibuang, awalan kota dipertahankan (Kota Bengkulu bukan Provinsi Bengkulu). Isian Claude menulis awalan resmi,
    urai bahan WA tidak (insiden 19 Nov 2026: 10 kejadian diabaikan)."""
    t = re.sub(r'\s+', ' ', (s or '').strip().lower())
    t = re.sub(r'^(kabupaten|kab)\.?\s+', '', t)
    t = re.sub(r'^kota\.?\s+', 'kota ', t)
    return t


def terap_isian_harian(wa, w, ga, isian):
    """Isian menimpa medan yang sama hasil urai bahan; yang tidak diisi tetap dari bahan. Mengubah wa, w, ga di tempat."""
    if 'laporan' in isian: wa['laporan'] = isian['laporan']
    for i, e in enumerate(isian.get('kejadian') or []):
        lok = _nama_wilayah(e.get('lokasi'))
        cocok = [x for x in wa['kejadian'] if _nama_wilayah(x['lokasi']) == lok and (not e.get('jenis') or x['jenis'] == e['jenis'])]
        if len(cocok) != 1:
            _peringatan(f"isian.kejadian[{i}] lokasi {e.get('lokasi')!r}: {'tidak ada di bahan' if not cocok else 'lebih dari satu, isi jenis'}, diabaikan"); continue
        x = cocok[0]
        for k in ('baru', 'label'):
            if k in e: x[k] = e[k]
        x['angka'].update(e.get('angka') or {})
        if 'transisi_sd' in e: x['angka']['transisi_sd'] = e['transisi_sd']
        x['teks'].update(e.get('teks') or {})
    b = dict(isian.get('bmkg') or {})
    if 'pm' in b:   # baris PM2,5 [kota, nilai, kategori] seperti wa_harian.bmkg
        ok = [tuple(x) for x in b['pm'] if isinstance(x, list) and len(x) == 3 and isinstance(x[0], str)
              and isinstance(x[1], (int, float)) and not isinstance(x[1], bool) and isinstance(x[2], str)]
        if len(ok) != len(b['pm']): _peringatan('isian.bmkg.pm: baris harus [kota, nilai, kategori]; baris salah diabaikan')
        b['pm'] = ok
    w.update(b)
    p = isian.get('pvmbg') or {}
    if 'jam' in p: ga['jam'] = p['jam']
    for k, v in (p.get('level') or {}).items(): ga['level'][k.capitalize()] = v
    return wa, w, ga


GENERIK = re.compile(r'(?:[A-Z]|Text|TextBox|Text Box|Shape|Peta|Image|Picture|Rectangle|Rounded Rectangle|Oval|Connector|Straight Connector|Elbow Connector|'
                     r'Group|Table|Chart|Freeform|Line|Title|Subtitle|Content Placeholder|Google Shape;[\d;_]*)(?: ?\d+)?')
JENIS_SHAPE = {'sp': 'bentuk', 'pic': 'gambar', 'cxnSp': 'garis', 'graphicFrame': 'tabel', 'grpSp': 'grup'}


def slug(t):
    t = re.sub(r'\s*\([^)]*\)\s*$', '', (t or '').split('\n')[0]).lower().replace('&', ' dan ')
    return re.sub(r'[^a-z0-9]+', '_', t).strip('_')[:40] or 'x'


def _kapital(t):   # label kepala: baris pertama huruf besar (kurung satuan di ujung dibuang), minimal 3 huruf
    b = re.sub(r'\s*\([^)]*\)\s*$', '', (t or '').split('\n')[0]).strip()
    return len(re.findall(r'[A-Z]', b)) >= 3 and not re.search(r'[a-z0-9]', b)


def _tanggal_kepala(t):
    return bool(re.fullmatch(r'\d{1,2} [A-Z][a-z]{2}', (t or '').strip()))


def _angka(t):
    return bool(re.match(r'^[±+]?\s*\d', (t or '').strip()))


def _nilai(t):   # isi kartu angka: '281 titik', '3.793 ha', '9'; bukan tanggal '17 Nov'
    t = (t or '').strip()
    return bool(re.fullmatch(r'[±+]?\s*\d[\d.,]*(?:\s*[A-Za-z%]+)?', t)) and not _tanggal_kepala(t)


def _metrik(t):
    b = re.sub(r'\s*\([^)]*\)\s*$', '', (t or '').split('\n')[0]).strip().rstrip('*').strip()
    return next((m for m, lab in METRIK if b == lab), None)


def baca_shape(x):
    """Shape satu slide (urutan dokumen): {tag, id, nama, rentang nama, x, y, cx, cy, teks, tbl}. Tanpa grup bersarang di generator ini;
    cNvPr grup (bila ada) tetap dicatat sebagai shape 'grpSp'."""
    import html
    out = []
    for m in re.finditer(r'<p:(sp|pic|cxnSp|graphicFrame)>.*?</p:\1>|<p:grpSp>\s*<p:nvGrpSpPr>\s*<p:cNvPr [^>]*>', x, re.S):
        b = m.group(0); tag = m.group(1) or 'grpSp'
        c = re.search(r'<p:cNvPr [^>]*?\bname="([^"]*)"', b)
        i = re.search(r'<p:cNvPr [^>]*?\bid="(\d+)"', b)
        g = re.search(r'<a:off x="(-?\d+)" y="(-?\d+)"/>\s*<a:ext cx="(\d+)" cy="(\d+)"/>', b)
        par = [html.unescape(''.join(re.findall(r'<a:t>([^<]*)</a:t>', p))) for p in re.findall(r'<a:p>.*?</a:p>', re.sub(r'<a:tbl>.*?</a:tbl>', '', b, flags=re.S), re.S)]
        tbl = [[html.unescape(''.join(re.findall(r'<a:t>([^<]*)</a:t>', sel))) for sel in re.findall(r'<a:tc\b.*?</a:tc>', tr, re.S)]
               for tr in re.findall(r'<a:tr\b.*?</a:tr>', b, re.S)] if tag == 'graphicFrame' else None
        x0, y0, cx, cy = map(int, g.groups()) if g else (0, 0, 0, 0)
        out.append({'tag': tag, 'id': int(i[1]) if i else 0, 'nama': c[1] if c else '', 'span': (m.start() + c.start(1), m.start() + c.end(1)) if c else None,
                    'x': x0, 'y': y0, 'cx': cx, 'cy': cy, 'tengah': x0 + cx / 2, 'teks': '\n'.join(par).strip(), 'tbl': tbl})
    return out


def namai_slide(S, n):
    """Nama stabil per shape: {indeks: nama}, dan kunci [(indeks, angka, sel)]. Nama berawalan s<n>_ dan unik per slide.
    Nama bermakna yang sudah ada (bukan nama bawaan 'T', 'Text 12', 'Peta 9003', ...) dipertahankan karena gerbang lain mencarinya
    (KRIS, Pita kaki, Ikon Hotspot). Urutan: bingkai, kartu angka, tabel berkepala, seksi berlabel huruf besar, sisanya per jenis."""
    nama, kunci = {}, []
    teks = [i for i, s in enumerate(S) if s['teks'] and s['tag'] == 'sp']
    bebas = lambda i: i not in nama
    kunci_t = lambda i, angka, sel=None: kunci.append((i, angka, sel))
    # 1. bingkai deck.py dan kepala slide generator
    for i in teks:
        s, t = S[i], S[i]['teks']
        if s['y'] < 200000 and re.match(r'\d\d\s', t): nama[i] = f'bagian_{int(t[:2])}'
        elif s['y'] >= 6350000 and t.startswith('Sumber'): nama[i] = 'kaki_sumber'
        elif s['y'] >= 6350000 and '©' in t: nama[i] = 'kaki_hakcipta'
        elif s['y'] >= 6350000 and t.isdigit(): nama[i] = 'kaki_halaman'
        elif t.startswith('CUT OFF'): nama[i] = 'pil_cutoff'
    for peran, y0, y1 in (('judul', 200000, 450000), ('subjudul', 800000, 1000000)):
        c = sorted((S[i]['y'], i) for i in teks if bebas(i) and y0 <= S[i]['y'] < y1 and S[i]['x'] < 1500000)
        if c:
            i = c[0][1]; nama[i] = peran
            if re.search(r'\d[\d.,]*\s*(?:titik|ha)\b', S[i]['teks']): kunci_t(i, 'ringkasan')   # kalimat temuan memuat angka sistem
    # 2. kartu angka: label metrik + nilai menumpuk di tempat yang sama (penanganan), atau angka dengan label kecil di bawahnya (harian)
    for i in teks:
        m = _metrik(S[i]['teks'])
        if not bebas(i) or not m: continue
        v = [j for j in teks if j != i and bebas(j) and abs(S[j]['x'] - S[i]['x']) <= 20000 and -20000 <= S[j]['y'] - S[i]['y'] <= 500000 and _nilai(S[j]['teks'])]
        if v:
            j = min(v, key=lambda j: (S[j]['y'], S[j]['id'])); nama[i], nama[j] = f'kpi_{m}_label', f'kpi_{m}'; kunci_t(j, m); kunci_t(i, m)   # label dikunci: tak bisa diganti ke/dari metrik
    for i in teks:
        if not bebas(i) or not re.fullmatch(r'[±+]?\s*\d[\d.,]*', S[i]['teks']): continue
        lab = [j for j in teks if bebas(j) and abs(S[j]['x'] - S[i]['x']) <= 20000 and 0 < S[j]['y'] - S[i]['y'] <= 400000
               and re.search(r'[a-z]{3}', S[j]['teks']) and not _angka(S[j]['teks']) and not re.match(r'[▲▼]', S[j]['teks'])]
        if lab:
            j = min(lab, key=lambda j: S[j]['y']); nama[i], nama[j] = f'kpi_{slug(S[j]["teks"])}', f'kpi_{slug(S[j]["teks"])}_label'
    # 3. tabel berkepala: baris kepala = >= 3 label (huruf besar atau tanggal '15 Nov') sejajar, minimal satu huruf besar
    pendek = lambda t: len(t) <= 15 and '\n' not in t and not re.search(r'\d', t) and t[:1].isupper()
    calon = sorted((i for i in teks if bebas(i) and (_kapital(S[i]['teks']) or _tanggal_kepala(S[i]['teks']) or pendek(S[i]['teks']))), key=lambda i: (S[i]['y'], S[i]['x']))
    baris_kepala = []
    for i in calon:
        if baris_kepala and abs(S[i]['y'] - S[baris_kepala[-1][0]]['y']) <= 20000: baris_kepala[-1].append(i)
        else: baris_kepala.append([i])
    induk_semua = [r for r in baris_kepala if all(_kapital(S[i]['teks']) for i in r)]
    unik_kapital = lambda r: (lambda k: len(k) == len(set(k)) and (len(k) >= 2 or (k and any(_tanggal_kepala(S[i]['teks']) for i in r))))(
        [S[i]['teks'] for i in r if _kapital(S[i]['teks'])])
    baris_kepala = [[i for i in r if _kapital(S[i]['teks']) or _tanggal_kepala(S[i]['teks']) or unik_kapital(r)] for r in baris_kepala]
    for r in [r for r in baris_kepala if len(r) >= 3 and unik_kapital(r)]:   # label kembar sejajar (ANCAMAN per gunung api) = seksi, bukan tabel
        if any(not bebas(i) for i in r): continue
        if not any(_tanggal_kepala(S[i]['teks']) for i in r) and any(len(r2) > len(r) and 0 < S[r2[0]]['y'] - S[r[0]]['y'] <= 600000
                                                                     and any(_tanggal_kepala(S[k]['teks']) for k in r2) for r2 in baris_kepala):
            continue   # baris induk (HOTSPOT (titik) di atas tanggal): dinamai bersama baris tanggalnya
        yk = S[r[0]]['y']
        kol = sorted(r, key=lambda i: S[i]['tengah'])
        # induk kolom tanggal: label metrik terdekat di atasnya
        induk = [i for rr in induk_semua for i in rr if bebas(i) and 0 < yk - S[i]['y'] <= 600000 and i not in r and _metrik(S[i]['teks'])]
        nama_kol, hitung = [], collections.Counter()
        for i in kol:
            if _tanggal_kepala(S[i]['teks']):
                p = min(induk, key=lambda j: abs(S[j]['tengah'] - S[i]['tengah'])) if induk else None
                dasar = (_metrik(S[p]['teks']) or slug(S[p]['teks'])) if p is not None else 'kol'
                hitung[dasar] += 1; nama_kol.append((dasar, f'{dasar}_d{hitung[dasar]}'))
            else:
                d = _metrik(S[i]['teks']) or slug(S[i]['teks']); nama_kol.append((d, d))
        pusat = [S[i]['tengah'] for i in kol]
        tol = [max(100000, min([abs(pusat[k] - pusat[k2]) for k2 in (k - 1, k + 1) if 0 <= k2 < len(kol)] or [800000]) / 2) for k in range(len(kol))]
        kiri, kanan = min(S[i]['x'] for i in kol) - 400000, max(S[i]['x'] + S[i]['cx'] for i in kol) + 400000
        # seksi di atas kepala (INFORMASI BENCANA) menamai tabel; tanpa seksi = 'tabel'
        sek = [i for i in teks if bebas(i) and i not in r and _kapital(S[i]['teks']) and not _metrik(S[i]['teks']) and 0 < yk - S[i]['y'] <= 400000
               and kiri <= S[i]['tengah'] <= kanan and i not in induk]
        tb = slug(S[max(sek, key=lambda i: S[i]['y'])]['teks']) if sek else 'tabel'
        if sek:
            lab = max(sek, key=lambda i: S[i]['y']); nama[lab] = f'{tb}_label'
            ket = sorted((i for i in teks if bebas(i) and abs(S[i]['y'] - S[lab]['y']) <= 20000 and kiri <= S[i]['tengah'] <= kanan + 4000000), key=lambda i: S[i]['x'])
            for k, i in enumerate(ket): nama[i] = f'{tb}_b0_{k + 1}'
        henti = min([S[i]['y'] for i in teks if bebas(i) and i not in r and _kapital(S[i]['teks']) and S[i]['y'] > yk + 20000
                     and kiri <= S[i]['x'] <= S[kol[0]]['tengah'] + tol[0]] + [6350000])   # seksi baru mulai di tepi kiri; pil HUJAN RINGAN di kolom HASIL bukan
        sel = [i for i in teks if bebas(i) and i not in r and yk + 20000 < S[i]['y'] < henti and kiri <= S[i]['tengah'] <= kanan]
        def kolom_dari(i):
            k = min(range(len(kol)), key=lambda k: abs(S[i]['tengah'] - pusat[k]))
            return k if abs(S[i]['tengah'] - pusat[k]) <= tol[k] else None
        per_kol = collections.defaultdict(list)
        for i in sel:
            k = kolom_dari(i)
            if k is not None and not re.match(r'^[\d±▲▼]', S[i]['teks']): per_kol[k].append(i)
        if not per_kol: continue
        utama = max(per_kol, key=lambda k: (len(per_kol[k]), -k))
        tengah_y = lambda i: S[i]['y'] + S[i]['cy'] / 2
        memuat = lambda k: sum(1 for i in per_kol[k] if sum(S[i]['y'] <= tengah_y(j) < S[i]['y'] + S[i]['cy'] for j in per_kol[utama]) >= 2)
        semua_kol = collections.Counter(kolom_dari(i) for i in sel)
        tunggal = sum(v == semua_kol[utama] for k, v in semua_kol.items() if k is not None) == 1   # KAB, DAMPAK, MULAI sama banyak: baris per kab
        tinggi = [k for k in sorted(per_kol) if tunggal and k != utama and memuat(k)]   # sel PROVINSI setinggi pil + keterangan HASIL: PROVINSI jangkarnya
        jangkar = sorted(per_kol[tinggi[0] if tinggi else utama], key=lambda i: S[i]['y'])
        tutup = next((k for k, i in enumerate(jangkar) if re.match(r'(?i)(jumlah|total)\b', S[i]['teks'])), None)
        if tutup is not None: jangkar = jangkar[:tutup + 1]   # legenda di bawah baris Jumlah bukan baris tabel
        atas = [S[i]['y'] for i in jangkar]
        jarak = sorted(b - a for a, b in zip(atas, atas[1:]) if b - a > 40000)
        pitch = jarak[len(jarak) // 2] if jarak else 400000
        t_ = 0.3 * pitch
        batas = [a - t_ for a in atas] + [atas[-1] + pitch - t_]
        for k, i in enumerate(kol):
            nama[i] = f'{tb}_kepala_{nama_kol[k][1]}'
            if nama_kol[k][0] in dict(METRIK): kunci_t(i, nama_kol[k][0])   # kepala kolom metrik dikunci
        for p in induk:
            if any(nama_kol[k][0] == _metrik(S[p]['teks']) for k in range(len(kol))): nama[p] = f'{tb}_kepala_{_metrik(S[p]["teks"])}'; kunci_t(p, _metrik(S[p]['teks']))
        isi = collections.defaultdict(list)
        for i in sel:
            b = next((k for k in range(len(atas)) if batas[k] <= S[i]['y'] < batas[k + 1]), None)
            if b is not None: isi[b].append(i)
        for b, anggota in isi.items():
            jumlah = re.match(r'(?i)(jumlah|total)\b', S[jangkar[b]]['teks'])
            awal = f'{tb}_jumlah' if jumlah else f'{tb}_b{b + 1}'
            lain = 0
            for i in sorted(anggota, key=lambda i: (S[i]['x'], S[i]['y'], S[i]['id'])):
                k, t = kolom_dari(i), S[i]['teks']
                if k is None:
                    if re.fullmatch(r'\d+', t) and S[i]['tengah'] < S[jangkar[b]]['tengah']: nama[i] = f'{awal}_no'
                    elif re.search(r'\bMM\b|(?i:hujan)', t): nama[i] = f'{awal}_hujan'
                    elif re.search(r'BAIK|SEDANG|SEHAT|BERBAHAYA', t): nama[i] = f'{awal}_udara'
                    else: lain += 1; nama[i] = f'{awal}_kol{lain}'
                    continue
                nk = nama_kol[k][1] + ('_ubah' if re.match(r'^[▲▼]|.*%$', t) else '')
                nama[i] = f'{awal}_{nk}'
                if nama_kol[k][0] in dict(METRIK): kunci_t(i, nama_kol[k][0])
    # tabel asli (graphicFrame): sel di bawah kepala metrik terkunci
    for i, s in enumerate(S):
        if s['tbl'] and s['tbl'][0]:
            for c, kepala in enumerate(s['tbl'][0]):
                m = _metrik(kepala)
                # sel = [baris, kolom]: baris 0 = baris kepala, baris data pertama = 1; kolom mulai 0 (skema operasi ubah bot memakai dasar yang sama)
                if m: kunci.extend((i, m, [r, c]) for r in range(0, len(s['tbl'])))   # termasuk sel kepala [0, c]
    # 4. seksi berlabel huruf besar (ARMADA UDARA, STATUS SIAGA, RENCANA AKSI): baris per y, urut x
    sek = sorted((i for i in teks if bebas(i) and _kapital(S[i]['teks'])), key=lambda i: (S[i]['y'], S[i]['x']))
    kembar = collections.Counter(slug(S[i]['teks']) for i in sek)
    dasar_sek, ke = {}, collections.Counter()
    for i in sorted(sek, key=lambda i: (S[i]['x'], S[i]['y'])):   # seksi kembar (tiga kolom gunung api) diberi nomor kolom
        d = slug(S[i]['teks']); ke[d] += 1; dasar_sek[i] = f'{d}{ke[d]}' if kembar[d] > 1 else d
    for i in sek: nama[i] = f'{dasar_sek[i]}_label'
    gugus = []   # kolom seksi: label yang x-nya berdekatan (< 1 juta EMU) satu kolom
    for j in sorted(sek, key=lambda j: S[j]['x']):
        if gugus and S[j]['x'] - S[gugus[-1][-1]]['x'] < 1000000: gugus[-1].append(j)
        else: gugus.append([j])
    anggota = collections.defaultdict(list)
    for i in teks:
        if not bebas(i): continue
        g = [gg for gg in gugus if S[gg[0]]['x'] - 500000 <= S[i]['x']]
        c = [j for j in (g[-1] if g else []) if S[j]['y'] <= S[i]['y'] + 20000]
        if c: anggota[max(c, key=lambda j: (S[j]['y'], S[j]['x']))].append(i)
    for j, isi_ in anggota.items():
        dasar, baris = dasar_sek[j], []
        for i in sorted(isi_, key=lambda i: (S[i]['y'], S[i]['x'])):
            if baris and S[i]['y'] - S[baris[-1][0]]['y'] <= 60000: baris[-1].append(i)
            else: baris.append([i])
        for r, b in enumerate(baris):
            nr = 0 if abs(S[b[0]]['y'] - S[j]['y']) <= 20000 else r + (0 if abs(S[baris[0][0]]['y'] - S[j]['y']) <= 20000 else 1)
            urut = sorted(b, key=lambda i: (S[i]['x'], S[i]['id']))
            for k, i in enumerate(urut):
                nama[i] = f'{dasar}_b{nr}' + (f'_{k + 1}' if len(urut) > 1 else '')
    # 5. sisa: per jenis, urut (y, x, id); nama bermakna bawaan dipertahankan
    hit, hasil = collections.Counter(), {}
    for i, s in sorted(enumerate(S), key=lambda p: (p[1]['y'], p[1]['x'], p[1]['id'])):
        if nama.get(i): continue
        if s['nama'] and not GENERIK.fullmatch(s['nama']): continue
        j = 'teks' if s['teks'] and s['tag'] == 'sp' else JENIS_SHAPE[s['tag']]
        hit[j] += 1; nama[i] = f'{j}_{hit[j]}'
    dipakai = set()
    for i, s in enumerate(S):   # unik per slide; nama bermakna bawaan yang kembar diberi akhiran
        if not nama.get(i):
            if s['nama'] not in dipakai: dipakai.add(s['nama']); continue
            nama[i] = f's{n}_{slug(s["nama"])}'
        else: nama[i] = f's{n}_{nama[i]}'
        dasar, k = nama[i], 1
        while nama[i] in dipakai: k += 1; nama[i] = f'{dasar}_{k}'
        dipakai.add(nama[i]); hasil[i] = nama[i]
    return hasil, kunci


SEL_DASAR = 'sel = [baris, kolom]: baris 0 = kepala tabel, baris data pertama = 1; kolom mulai 0'


def urutan_berkas_slide(z):
    """['ppt/slides/slideN.xml', ...] menurut urutan presentation.xml."""
    rel = {re.search(r'Id="([^"]+)"', r)[1]: re.search(r'Target="([^"]+)"', r)[1].lstrip('/').removeprefix('ppt/')
           for r in re.findall(r'<Relationship [^>]*>', z.read('ppt/_rels/presentation.xml.rels').decode())}
    return ['ppt/' + rel[i] for i in re.findall(r'<p:sldId [^>]*r:id="([^"]+)"', z.read('ppt/presentation.xml').decode())]


def namai_deck(pptx, tulis=True):
    """Beri nama shape stabil di PPTX akhir (hanya atribut name cNvPr; teks, posisi, dan bagian lain tidak disentuh) lalu tulis
    <deck>.kunci.json: [{slide, shape, angka, sel?}] untuk tiap shape/sel berisi angka sistem. Mengembalikan daftar kunci."""
    with zipfile.ZipFile(pptx) as z:
        urut = urutan_berkas_slide(z)
        ubah, kunci = {}, []
        for n, f in enumerate(urut, 1):
            x = z.read(f).decode('utf-8')
            S = baca_shape(x)
            nm, kc = namai_slide(S, n)
            potong, o = [], 0
            for i in sorted(nm, key=lambda i: S[i]['span'][0]):
                a, b = S[i]['span']; potong += [x[o:a], nm[i]]; o = b
            ubah[f] = (''.join(potong) + x[o:]).encode('utf-8')
            nama_akhir = lambda i: nm.get(i, S[i]['nama'])
            kunci += [{'slide': n, 'shape': nama_akhir(i), 'angka': m, **({'sel': sel, 'sel_dasar': SEL_DASAR} if sel else {})} for i, m, sel in kc]
        if tulis:
            sementara = pptx + '.tmp'
            with zipfile.ZipFile(sementara, 'w', zipfile.ZIP_DEFLATED) as zo:
                for it in z.infolist(): zo.writestr(it, ubah.get(it.filename) or z.read(it.filename))
    if tulis:   # tulis=False: hanya mengembalikan daftar kunci, PPTX dan kunci.json tidak disentuh
        os.replace(sementara, pptx)
        with open(pptx[:-5] + '.kunci.json', 'w', encoding='utf-8') as f:   # <deck>.kunci.json: harian dan penanganan berbagi folder keluaran bot
            json.dump(kunci, f, ensure_ascii=False, indent=1)
    return kunci


# ----------------------------------------------------------------------------- BL-06 bot laporan: isian, nama shape, kunci
# Dipakai juga penanganan_otomatis.py. Semuanya stdlib (venv bot hanya Pillow). Tanpa --isian keluaran deck sama dengan sebelumnya
# kecuali atribut name shape (D9); <deck>.kunci.json berkas baru di sebelah PPTX (D3, A6).
METRIK = (('hotspot', 'HOTSPOT'), ('firespot', 'FIRESPOT'), ('luas_terbakar', 'LUAS TERBAKAR'), ('belum_padam', 'BELUM PADAM'))
# K4: angka sistem tidak pernah dari WA dan tidak bisa diubah lewat isian (nama medan dan sinonimnya, sesudah normal_medan)
MEDAN_KUNCI = {'hotspot', 'hot', 'titik_panas', 'firespot', 'fs', 'titik_api', 'luas_terbakar', 'luas', 'terbakar', 'ha',
               'belum_padam', 'luas_belum_padam', 'belum', 'padam', 'luas_padam'}


def bersih_unicode(t):   # NFKC + buang karakter format (Cf: zero-width, word joiner) sebelum mencocokkan kata angka sistem
    import unicodedata
    return ''.join(c for c in unicodedata.normalize('NFKC', str(t)) if unicodedata.category(c) != 'Cf')


def normal_medan(k):
    return re.sub(r'[\s\-]+', '_', bersih_unicode(k).strip().lower())


# K4 juga untuk teks bebas: kata angka sistem bersama angka di satu teks ('hotspot 999 titik', '5.000 ha terbakar') ditolak
KATA_KUNCI = re.compile(r'hot[\s_-]*spot|fire[\s_-]*spot|titik[\s_-]*(?:panas|api)|(?:luas|lahan|hutan|area)[\s_-]*(?:yang\s+)?terbakar|\bha\s*terbakar|'
                        r'belum[\s_-]*padam|sudah[\s_-]*padam|luas[\s_-]*padam', re.I)   # spasi boleh hilang: Cf (soft hyphen) dibuang lebih dulu


def teks_angka_kunci(v):
    """True bila v (teks, atau daftar/objek berisi teks) memuat kata angka sistem dan angka sekaligus."""
    if isinstance(v, str):
        v = bersih_unicode(v); return bool(KATA_KUNCI.search(v) and re.search(r'\d', v))
    if isinstance(v, (list, tuple)): return any(teks_angka_kunci(x) for x in v)
    if isinstance(v, dict): return any(teks_angka_kunci(x) for x in v.values())
    return False


def medan_kunci(k):   # nama medan angka sistem, juga tanpa pemisah ('luasterbakar' sesudah Cf dibuang) atau berkata kunci ('jumlah_hotspot')
    kn = normal_medan(k)
    return kn in MEDAN_KUNCI or kn.replace('_', '') in {m.replace('_', '') for m in MEDAN_KUNCI} or bool(KATA_KUNCI.search(kn))


def _peringatan(pesan):
    print('PERINGATAN isian:', pesan, file=sys.stderr)


def saring_isian(nilai, skema, jalur='isian'):
    """Bersihkan isian menurut skema. skema: tipe (int, float, str, bool, 'tanggal'), dict medan -> skema, ('peta', skema) = dict berkunci
    bebas (nama provinsi, unsur), ('daftar', skema), ('pasang', skema) = [a, b], ('atau_kosong', skema). Medan tak dikenal dan medan angka
    sistem dibuang dengan peringatan ke stderr; nilai salah tipe juga. Hasil: nilai bersih, atau None bila ditolak."""
    if isinstance(skema, tuple) and skema[0] == 'atau_kosong':
        return None if nilai is None else saring_isian(nilai, skema[1], jalur)
    if isinstance(skema, dict):
        if not isinstance(nilai, dict):
            _peringatan(f'{jalur}: harus objek, diabaikan'); return None
        hasil = {}
        for k, v in nilai.items():
            kn = normal_medan(k)
            if medan_kunci(kn):
                _peringatan(f'{jalur}.{k}: angka sistem dikunci (hotspot, firespot, luas terbakar, luas belum padam hanya dari sistem), diabaikan'); continue
            if kn not in skema:
                _peringatan(f'{jalur}.{k}: medan tidak dikenal, diabaikan'); continue
            b = saring_isian(v, skema[kn], f'{jalur}.{k}')
            if b is not None or (isinstance(skema[kn], tuple) and skema[kn][0] == 'atau_kosong' and v is None):
                hasil[kn] = b
        return hasil
    if isinstance(skema, tuple) and skema[0] == 'peta':
        if not isinstance(nilai, dict):
            _peringatan(f'{jalur}: harus objek, diabaikan'); return None
        hasil = {}
        for k, v in nilai.items():
            if medan_kunci(k):
                _peringatan(f'{jalur}.{k}: angka sistem dikunci, diabaikan'); continue
            b = saring_isian(v, skema[1], f'{jalur}.{k}')
            if b is not None: hasil[str(k).strip()] = b
        return hasil
    if isinstance(skema, tuple) and skema[0] in ('daftar', 'pasang'):
        if not isinstance(nilai, list) or (skema[0] == 'pasang' and len(nilai) != 2):
            _peringatan(f"{jalur}: harus {'daftar' if skema[0] == 'daftar' else 'pasangan [a, b]'}, diabaikan"); return None
        hasil = [saring_isian(v, skema[1], f'{jalur}[{i}]') for i, v in enumerate(nilai)]
        if skema[0] == 'pasang' and None in hasil: return None
        return [h for h in hasil if h is not None]
    if skema == 'tanggal':
        try: return dt.date.fromisoformat(str(nilai))
        except ValueError: _peringatan(f'{jalur}: tanggal harus YYYY-MM-DD, diabaikan'); return None
    if skema is bool:
        if isinstance(nilai, bool): return nilai
    elif skema in (int, float):
        if isinstance(nilai, (int, float)) and not isinstance(nilai, bool) and (skema is float or float(nilai).is_integer()):
            return skema(nilai)
    elif skema is str:
        if isinstance(nilai, str):
            if teks_angka_kunci(nilai):
                _peringatan(f'{jalur}: teks memuat angka sistem (hotspot, firespot, luas terbakar, belum padam hanya dari sistem), diabaikan'); return None
            return nilai
    elif isinstance(skema, tuple) and skema[0] == 'apa':   # daftar/objek bebas yang diteruskan apa adanya (mis. baris PM2,5 [kota, nilai, kategori])
        if teks_angka_kunci(nilai):
            _peringatan(f'{jalur}: teks memuat angka sistem, diabaikan'); return None
        return nilai
    _peringatan(f'{jalur}: tipe salah ({type(nilai).__name__}), diabaikan')
    return None


def baca_isian(path, skema):
    """--isian <json>: objek medan non-sistem hasil urai bahan WA (BL-05/BL-08). Berkas rusak = berhenti (bendera diberikan tapi tak terbaca)."""
    try:
        with open(path, encoding='utf-8') as f: data = json.load(f)
    except (OSError, ValueError) as e: sys.exit(f'--isian {path} tidak terbaca: {e}')
    if not isinstance(data, dict): sys.exit(f'--isian {path}: isi harus objek JSON')
    return saring_isian(data, skema) or {}


ANGKA_KEJADIAN = {k: int for k in ('kk', 'jiwa', 'tangki', 'liter', 'meninggal', 'kios', 'rumah', 'rumah_dampak', 'potensi_kk', 'mengungsi', 'huntara', 'hilang')}
# medan bahan yang dibaca generator ini (wa_harian.koordalops/bmkg/pvmbg); kejadian dicocokkan lewat lokasi (+ jenis bila diisi)
ISIAN_HARIAN = {
    'laporan': int,
    'kejadian': ('daftar', {'lokasi': str, 'jenis': str, 'baru': bool, 'label': str, 'angka': ANGKA_KEJADIAN, 'transisi_sd': str,
                            'teks': {'dampak': str, 'status_darurat': str, 'kondisi': str, 'pengungsi': str}}),
    'bmkg': {'jam': str, 'periode': str, 'pm': ('daftar', ('apa',)), 'hujan': ('daftar', str), 'angin': ('daftar', str),
             'siaga': ('daftar', str), 'awas': ('daftar', str)},
    'pvmbg': {'jam': str, 'level': {'awas': int, 'siaga': int, 'waspada': int, 'normal': int}},
}


def _nama_wilayah(s):
    """Kunci banding lokasi: 'Kab. Aceh Selatan', 'Kabupaten Aceh Selatan', 'aceh selatan' sama; 'Kota. Mataram' = 'Kota Mataram'.
    Awalan kabupaten dibuang, awalan kota dipertahankan (Kota Bengkulu bukan Provinsi Bengkulu). Isian Claude menulis awalan resmi,
    urai bahan WA tidak (insiden 19 Nov 2026: 10 kejadian diabaikan)."""
    t = re.sub(r'\s+', ' ', (s or '').strip().lower())
    t = re.sub(r'^(kabupaten|kab)\.?\s+', '', t)
    t = re.sub(r'^kota\.?\s+', 'kota ', t)
    return t


def terap_isian_harian(wa, w, ga, isian):
    """Isian menimpa medan yang sama hasil urai bahan; yang tidak diisi tetap dari bahan. Mengubah wa, w, ga di tempat."""
    if 'laporan' in isian: wa['laporan'] = isian['laporan']
    for i, e in enumerate(isian.get('kejadian') or []):
        lok = _nama_wilayah(e.get('lokasi'))
        cocok = [x for x in wa['kejadian'] if _nama_wilayah(x['lokasi']) == lok and (not e.get('jenis') or x['jenis'] == e['jenis'])]
        if len(cocok) != 1:
            _peringatan(f"isian.kejadian[{i}] lokasi {e.get('lokasi')!r}: {'tidak ada di bahan' if not cocok else 'lebih dari satu, isi jenis'}, diabaikan"); continue
        x = cocok[0]
        for k in ('baru', 'label'):
            if k in e: x[k] = e[k]
        x['angka'].update(e.get('angka') or {})
        if 'transisi_sd' in e: x['angka']['transisi_sd'] = e['transisi_sd']
        x['teks'].update(e.get('teks') or {})
    b = dict(isian.get('bmkg') or {})
    if 'pm' in b:   # baris PM2,5 [kota, nilai, kategori] seperti wa_harian.bmkg
        ok = [tuple(x) for x in b['pm'] if isinstance(x, list) and len(x) == 3 and isinstance(x[0], str)
              and isinstance(x[1], (int, float)) and not isinstance(x[1], bool) and isinstance(x[2], str)]
        if len(ok) != len(b['pm']): _peringatan('isian.bmkg.pm: baris harus [kota, nilai, kategori]; baris salah diabaikan')
        b['pm'] = ok
    w.update(b)
    p = isian.get('pvmbg') or {}
    if 'jam' in p: ga['jam'] = p['jam']
    for k, v in (p.get('level') or {}).items(): ga['level'][k.capitalize()] = v
    return wa, w, ga


GENERIK = re.compile(r'(?:[A-Z]|Text|TextBox|Text Box|Shape|Peta|Image|Picture|Rectangle|Rounded Rectangle|Oval|Connector|Straight Connector|Elbow Connector|'
                     r'Group|Table|Chart|Freeform|Line|Title|Subtitle|Content Placeholder|Google Shape;[\d;_]*)(?: ?\d+)?')
JENIS_SHAPE = {'sp': 'bentuk', 'pic': 'gambar', 'cxnSp': 'garis', 'graphicFrame': 'tabel', 'grpSp': 'grup'}


def slug(t):
    t = re.sub(r'\s*\([^)]*\)\s*$', '', (t or '').split('\n')[0]).lower().replace('&', ' dan ')
    return re.sub(r'[^a-z0-9]+', '_', t).strip('_')[:40] or 'x'


def _kapital(t):   # label kepala: baris pertama huruf besar (kurung satuan di ujung dibuang), minimal 3 huruf
    b = re.sub(r'\s*\([^)]*\)\s*$', '', (t or '').split('\n')[0]).strip()
    return len(re.findall(r'[A-Z]', b)) >= 3 and not re.search(r'[a-z0-9]', b)


def _tanggal_kepala(t):
    return bool(re.fullmatch(r'\d{1,2} [A-Z][a-z]{2}', (t or '').strip()))


def _angka(t):
    return bool(re.match(r'^[±+]?\s*\d', (t or '').strip()))


def _nilai(t):   # isi kartu angka: '281 titik', '3.793 ha', '9'; bukan tanggal '17 Nov'
    t = (t or '').strip()
    return bool(re.fullmatch(r'[±+]?\s*\d[\d.,]*(?:\s*[A-Za-z%]+)?', t)) and not _tanggal_kepala(t)


def _metrik(t):
    b = re.sub(r'\s*\([^)]*\)\s*$', '', (t or '').split('\n')[0]).strip().rstrip('*').strip()
    return next((m for m, lab in METRIK if b == lab), None)


def baca_shape(x):
    """Shape satu slide (urutan dokumen): {tag, id, nama, rentang nama, x, y, cx, cy, teks, tbl}. Tanpa grup bersarang di generator ini;
    cNvPr grup (bila ada) tetap dicatat sebagai shape 'grpSp'."""
    import html
    out = []
    for m in re.finditer(r'<p:(sp|pic|cxnSp|graphicFrame)>.*?</p:\1>|<p:grpSp>\s*<p:nvGrpSpPr>\s*<p:cNvPr [^>]*>', x, re.S):
        b = m.group(0); tag = m.group(1) or 'grpSp'
        c = re.search(r'<p:cNvPr [^>]*?\bname="([^"]*)"', b)
        i = re.search(r'<p:cNvPr [^>]*?\bid="(\d+)"', b)
        g = re.search(r'<a:off x="(-?\d+)" y="(-?\d+)"/>\s*<a:ext cx="(\d+)" cy="(\d+)"/>', b)
        par = [html.unescape(''.join(re.findall(r'<a:t>([^<]*)</a:t>', p))) for p in re.findall(r'<a:p>.*?</a:p>', re.sub(r'<a:tbl>.*?</a:tbl>', '', b, flags=re.S), re.S)]
        tbl = [[html.unescape(''.join(re.findall(r'<a:t>([^<]*)</a:t>', sel))) for sel in re.findall(r'<a:tc\b.*?</a:tc>', tr, re.S)]
               for tr in re.findall(r'<a:tr\b.*?</a:tr>', b, re.S)] if tag == 'graphicFrame' else None
        x0, y0, cx, cy = map(int, g.groups()) if g else (0, 0, 0, 0)
        out.append({'tag': tag, 'id': int(i[1]) if i else 0, 'nama': c[1] if c else '', 'span': (m.start() + c.start(1), m.start() + c.end(1)) if c else None,
                    'x': x0, 'y': y0, 'cx': cx, 'cy': cy, 'tengah': x0 + cx / 2, 'teks': '\n'.join(par).strip(), 'tbl': tbl})
    return out


def namai_slide(S, n):
    """Nama stabil per shape: {indeks: nama}, dan kunci [(indeks, angka, sel)]. Nama berawalan s<n>_ dan unik per slide.
    Nama bermakna yang sudah ada (bukan nama bawaan 'T', 'Text 12', 'Peta 9003', ...) dipertahankan karena gerbang lain mencarinya
    (KRIS, Pita kaki, Ikon Hotspot). Urutan: bingkai, kartu angka, tabel berkepala, seksi berlabel huruf besar, sisanya per jenis."""
    nama, kunci = {}, []
    teks = [i for i, s in enumerate(S) if s['teks'] and s['tag'] == 'sp']
    bebas = lambda i: i not in nama
    kunci_t = lambda i, angka, sel=None: kunci.append((i, angka, sel))
    # 1. bingkai deck.py dan kepala slide generator
    for i in teks:
        s, t = S[i], S[i]['teks']
        if s['y'] < 200000 and re.match(r'\d\d\s', t): nama[i] = f'bagian_{int(t[:2])}'
        elif s['y'] >= 6350000 and t.startswith('Sumber'): nama[i] = 'kaki_sumber'
        elif s['y'] >= 6350000 and '©' in t: nama[i] = 'kaki_hakcipta'
        elif s['y'] >= 6350000 and t.isdigit(): nama[i] = 'kaki_halaman'
        elif t.startswith('CUT OFF'): nama[i] = 'pil_cutoff'
    for peran, y0, y1 in (('judul', 200000, 450000), ('subjudul', 800000, 1000000)):
        c = sorted((S[i]['y'], i) for i in teks if bebas(i) and y0 <= S[i]['y'] < y1 and S[i]['x'] < 1500000)
        if c:
            i = c[0][1]; nama[i] = peran
            if re.search(r'\d[\d.,]*\s*(?:titik|ha)\b', S[i]['teks']): kunci_t(i, 'ringkasan')   # kalimat temuan memuat angka sistem
    # 2. kartu angka: label metrik + nilai menumpuk di tempat yang sama (penanganan), atau angka dengan label kecil di bawahnya (harian)
    for i in teks:
        m = _metrik(S[i]['teks'])
        if not bebas(i) or not m: continue
        v = [j for j in teks if j != i and bebas(j) and abs(S[j]['x'] - S[i]['x']) <= 20000 and -20000 <= S[j]['y'] - S[i]['y'] <= 500000 and _nilai(S[j]['teks'])]
        if v:
            j = min(v, key=lambda j: (S[j]['y'], S[j]['id'])); nama[i], nama[j] = f'kpi_{m}_label', f'kpi_{m}'; kunci_t(j, m); kunci_t(i, m)   # label dikunci: tak bisa diganti ke/dari metrik
    for i in teks:
        if not bebas(i) or not re.fullmatch(r'[±+]?\s*\d[\d.,]*', S[i]['teks']): continue
        lab = [j for j in teks if bebas(j) and abs(S[j]['x'] - S[i]['x']) <= 20000 and 0 < S[j]['y'] - S[i]['y'] <= 400000
               and re.search(r'[a-z]{3}', S[j]['teks']) and not _angka(S[j]['teks']) and not re.match(r'[▲▼]', S[j]['teks'])]
        if lab:
            j = min(lab, key=lambda j: S[j]['y']); nama[i], nama[j] = f'kpi_{slug(S[j]["teks"])}', f'kpi_{slug(S[j]["teks"])}_label'
    # 3. tabel berkepala: baris kepala = >= 3 label (huruf besar atau tanggal '15 Nov') sejajar, minimal satu huruf besar
    pendek = lambda t: len(t) <= 15 and '\n' not in t and not re.search(r'\d', t) and t[:1].isupper()
    calon = sorted((i for i in teks if bebas(i) and (_kapital(S[i]['teks']) or _tanggal_kepala(S[i]['teks']) or pendek(S[i]['teks']))), key=lambda i: (S[i]['y'], S[i]['x']))
    baris_kepala = []
    for i in calon:
        if baris_kepala and abs(S[i]['y'] - S[baris_kepala[-1][0]]['y']) <= 20000: baris_kepala[-1].append(i)
        else: baris_kepala.append([i])
    induk_semua = [r for r in baris_kepala if all(_kapital(S[i]['teks']) for i in r)]
    unik_kapital = lambda r: (lambda k: len(k) == len(set(k)) and (len(k) >= 2 or (k and any(_tanggal_kepala(S[i]['teks']) for i in r))))(
        [S[i]['teks'] for i in r if _kapital(S[i]['teks'])])
    baris_kepala = [[i for i in r if _kapital(S[i]['teks']) or _tanggal_kepala(S[i]['teks']) or unik_kapital(r)] for r in baris_kepala]
    for r in [r for r in baris_kepala if len(r) >= 3 and unik_kapital(r)]:   # label kembar sejajar (ANCAMAN per gunung api) = seksi, bukan tabel
        if any(not bebas(i) for i in r): continue
        if not any(_tanggal_kepala(S[i]['teks']) for i in r) and any(len(r2) > len(r) and 0 < S[r2[0]]['y'] - S[r[0]]['y'] <= 600000
                                                                     and any(_tanggal_kepala(S[k]['teks']) for k in r2) for r2 in baris_kepala):
            continue   # baris induk (HOTSPOT (titik) di atas tanggal): dinamai bersama baris tanggalnya
        yk = S[r[0]]['y']
        kol = sorted(r, key=lambda i: S[i]['tengah'])
        # induk kolom tanggal: label metrik terdekat di atasnya
        induk = [i for rr in induk_semua for i in rr if bebas(i) and 0 < yk - S[i]['y'] <= 600000 and i not in r and _metrik(S[i]['teks'])]
        nama_kol, hitung = [], collections.Counter()
        for i in kol:
            if _tanggal_kepala(S[i]['teks']):
                p = min(induk, key=lambda j: abs(S[j]['tengah'] - S[i]['tengah'])) if induk else None
                dasar = (_metrik(S[p]['teks']) or slug(S[p]['teks'])) if p is not None else 'kol'
                hitung[dasar] += 1; nama_kol.append((dasar, f'{dasar}_d{hitung[dasar]}'))
            else:
                d = _metrik(S[i]['teks']) or slug(S[i]['teks']); nama_kol.append((d, d))
        pusat = [S[i]['tengah'] for i in kol]
        tol = [max(100000, min([abs(pusat[k] - pusat[k2]) for k2 in (k - 1, k + 1) if 0 <= k2 < len(kol)] or [800000]) / 2) for k in range(len(kol))]
        kiri, kanan = min(S[i]['x'] for i in kol) - 400000, max(S[i]['x'] + S[i]['cx'] for i in kol) + 400000
        # seksi di atas kepala (INFORMASI BENCANA) menamai tabel; tanpa seksi = 'tabel'
        sek = [i for i in teks if bebas(i) and i not in r and _kapital(S[i]['teks']) and not _metrik(S[i]['teks']) and 0 < yk - S[i]['y'] <= 400000
               and kiri <= S[i]['tengah'] <= kanan and i not in induk]
        tb = slug(S[max(sek, key=lambda i: S[i]['y'])]['teks']) if sek else 'tabel'
        if sek:
            lab = max(sek, key=lambda i: S[i]['y']); nama[lab] = f'{tb}_label'
            ket = sorted((i for i in teks if bebas(i) and abs(S[i]['y'] - S[lab]['y']) <= 20000 and kiri <= S[i]['tengah'] <= kanan + 4000000), key=lambda i: S[i]['x'])
            for k, i in enumerate(ket): nama[i] = f'{tb}_b0_{k + 1}'
        henti = min([S[i]['y'] for i in teks if bebas(i) and i not in r and _kapital(S[i]['teks']) and S[i]['y'] > yk + 20000
                     and kiri <= S[i]['x'] <= S[kol[0]]['tengah'] + tol[0]] + [6350000])   # seksi baru mulai di tepi kiri; pil HUJAN RINGAN di kolom HASIL bukan
        sel = [i for i in teks if bebas(i) and i not in r and yk + 20000 < S[i]['y'] < henti and kiri <= S[i]['tengah'] <= kanan]
        def kolom_dari(i):
            k = min(range(len(kol)), key=lambda k: abs(S[i]['tengah'] - pusat[k]))
            return k if abs(S[i]['tengah'] - pusat[k]) <= tol[k] else None
        per_kol = collections.defaultdict(list)
        for i in sel:
            k = kolom_dari(i)
            if k is not None and not re.match(r'^[\d±▲▼]', S[i]['teks']): per_kol[k].append(i)
        if not per_kol: continue
        utama = max(per_kol, key=lambda k: (len(per_kol[k]), -k))
        tengah_y = lambda i: S[i]['y'] + S[i]['cy'] / 2
        memuat = lambda k: sum(1 for i in per_kol[k] if sum(S[i]['y'] <= tengah_y(j) < S[i]['y'] + S[i]['cy'] for j in per_kol[utama]) >= 2)
        semua_kol = collections.Counter(kolom_dari(i) for i in sel)
        tunggal = sum(v == semua_kol[utama] for k, v in semua_kol.items() if k is not None) == 1   # KAB, DAMPAK, MULAI sama banyak: baris per kab
        tinggi = [k for k in sorted(per_kol) if tunggal and k != utama and memuat(k)]   # sel PROVINSI setinggi pil + keterangan HASIL: PROVINSI jangkarnya
        jangkar = sorted(per_kol[tinggi[0] if tinggi else utama], key=lambda i: S[i]['y'])
        tutup = next((k for k, i in enumerate(jangkar) if re.match(r'(?i)(jumlah|total)\b', S[i]['teks'])), None)
        if tutup is not None: jangkar = jangkar[:tutup + 1]   # legenda di bawah baris Jumlah bukan baris tabel
        atas = [S[i]['y'] for i in jangkar]
        jarak = sorted(b - a for a, b in zip(atas, atas[1:]) if b - a > 40000)
        pitch = jarak[len(jarak) // 2] if jarak else 400000
        t_ = 0.3 * pitch
        batas = [a - t_ for a in atas] + [atas[-1] + pitch - t_]
        for k, i in enumerate(kol):
            nama[i] = f'{tb}_kepala_{nama_kol[k][1]}'
            if nama_kol[k][0] in dict(METRIK): kunci_t(i, nama_kol[k][0])   # kepala kolom metrik dikunci
        for p in induk:
            if any(nama_kol[k][0] == _metrik(S[p]['teks']) for k in range(len(kol))): nama[p] = f'{tb}_kepala_{_metrik(S[p]["teks"])}'; kunci_t(p, _metrik(S[p]['teks']))
        isi = collections.defaultdict(list)
        for i in sel:
            b = next((k for k in range(len(atas)) if batas[k] <= S[i]['y'] < batas[k + 1]), None)
            if b is not None: isi[b].append(i)
        for b, anggota in isi.items():
            jumlah = re.match(r'(?i)(jumlah|total)\b', S[jangkar[b]]['teks'])
            awal = f'{tb}_jumlah' if jumlah else f'{tb}_b{b + 1}'
            lain = 0
            for i in sorted(anggota, key=lambda i: (S[i]['x'], S[i]['y'], S[i]['id'])):
                k, t = kolom_dari(i), S[i]['teks']
                if k is None:
                    if re.fullmatch(r'\d+', t) and S[i]['tengah'] < S[jangkar[b]]['tengah']: nama[i] = f'{awal}_no'
                    elif re.search(r'\bMM\b|(?i:hujan)', t): nama[i] = f'{awal}_hujan'
                    elif re.search(r'BAIK|SEDANG|SEHAT|BERBAHAYA', t): nama[i] = f'{awal}_udara'
                    else: lain += 1; nama[i] = f'{awal}_kol{lain}'
                    continue
                nk = nama_kol[k][1] + ('_ubah' if re.match(r'^[▲▼]|.*%$', t) else '')
                nama[i] = f'{awal}_{nk}'
                if nama_kol[k][0] in dict(METRIK): kunci_t(i, nama_kol[k][0])
    # tabel asli (graphicFrame): sel di bawah kepala metrik terkunci
    for i, s in enumerate(S):
        if s['tbl'] and s['tbl'][0]:
            for c, kepala in enumerate(s['tbl'][0]):
                m = _metrik(kepala)
                # sel = [baris, kolom]: baris 0 = baris kepala, baris data pertama = 1; kolom mulai 0 (skema operasi ubah bot memakai dasar yang sama)
                if m: kunci.extend((i, m, [r, c]) for r in range(0, len(s['tbl'])))   # termasuk sel kepala [0, c]
    # 4. seksi berlabel huruf besar (ARMADA UDARA, STATUS SIAGA, RENCANA AKSI): baris per y, urut x
    sek = sorted((i for i in teks if bebas(i) and _kapital(S[i]['teks'])), key=lambda i: (S[i]['y'], S[i]['x']))
    kembar = collections.Counter(slug(S[i]['teks']) for i in sek)
    dasar_sek, ke = {}, collections.Counter()
    for i in sorted(sek, key=lambda i: (S[i]['x'], S[i]['y'])):   # seksi kembar (tiga kolom gunung api) diberi nomor kolom
        d = slug(S[i]['teks']); ke[d] += 1; dasar_sek[i] = f'{d}{ke[d]}' if kembar[d] > 1 else d
    for i in sek: nama[i] = f'{dasar_sek[i]}_label'
    gugus = []   # kolom seksi: label yang x-nya berdekatan (< 1 juta EMU) satu kolom
    for j in sorted(sek, key=lambda j: S[j]['x']):
        if gugus and S[j]['x'] - S[gugus[-1][-1]]['x'] < 1000000: gugus[-1].append(j)
        else: gugus.append([j])
    anggota = collections.defaultdict(list)
    for i in teks:
        if not bebas(i): continue
        g = [gg for gg in gugus if S[gg[0]]['x'] - 500000 <= S[i]['x']]
        c = [j for j in (g[-1] if g else []) if S[j]['y'] <= S[i]['y'] + 20000]
        if c: anggota[max(c, key=lambda j: (S[j]['y'], S[j]['x']))].append(i)
    for j, isi_ in anggota.items():
        dasar, baris = dasar_sek[j], []
        for i in sorted(isi_, key=lambda i: (S[i]['y'], S[i]['x'])):
            if baris and S[i]['y'] - S[baris[-1][0]]['y'] <= 60000: baris[-1].append(i)
            else: baris.append([i])
        for r, b in enumerate(baris):
            nr = 0 if abs(S[b[0]]['y'] - S[j]['y']) <= 20000 else r + (0 if abs(S[baris[0][0]]['y'] - S[j]['y']) <= 20000 else 1)
            urut = sorted(b, key=lambda i: (S[i]['x'], S[i]['id']))
            for k, i in enumerate(urut):
                nama[i] = f'{dasar}_b{nr}' + (f'_{k + 1}' if len(urut) > 1 else '')
    # 5. sisa: per jenis, urut (y, x, id); nama bermakna bawaan dipertahankan
    hit, hasil = collections.Counter(), {}
    for i, s in sorted(enumerate(S), key=lambda p: (p[1]['y'], p[1]['x'], p[1]['id'])):
        if nama.get(i): continue
        if s['nama'] and not GENERIK.fullmatch(s['nama']): continue
        j = 'teks' if s['teks'] and s['tag'] == 'sp' else JENIS_SHAPE[s['tag']]
        hit[j] += 1; nama[i] = f'{j}_{hit[j]}'
    dipakai = set()
    for i, s in enumerate(S):   # unik per slide; nama bermakna bawaan yang kembar diberi akhiran
        if not nama.get(i):
            if s['nama'] not in dipakai: dipakai.add(s['nama']); continue
            nama[i] = f's{n}_{slug(s["nama"])}'
        else: nama[i] = f's{n}_{nama[i]}'
        dasar, k = nama[i], 1
        while nama[i] in dipakai: k += 1; nama[i] = f'{dasar}_{k}'
        dipakai.add(nama[i]); hasil[i] = nama[i]
    return hasil, kunci


SEL_DASAR = 'sel = [baris, kolom]: baris 0 = kepala tabel, baris data pertama = 1; kolom mulai 0'


def urutan_berkas_slide(z):
    """['ppt/slides/slideN.xml', ...] menurut urutan presentation.xml."""
    rel = {re.search(r'Id="([^"]+)"', r)[1]: re.search(r'Target="([^"]+)"', r)[1].lstrip('/').removeprefix('ppt/')
           for r in re.findall(r'<Relationship [^>]*>', z.read('ppt/_rels/presentation.xml.rels').decode())}
    return ['ppt/' + rel[i] for i in re.findall(r'<p:sldId [^>]*r:id="([^"]+)"', z.read('ppt/presentation.xml').decode())]


def namai_deck(pptx, tulis=True):
    """Beri nama shape stabil di PPTX akhir (hanya atribut name cNvPr; teks, posisi, dan bagian lain tidak disentuh) lalu tulis
    <deck>.kunci.json: [{slide, shape, angka, sel?}] untuk tiap shape/sel berisi angka sistem. Mengembalikan daftar kunci."""
    with zipfile.ZipFile(pptx) as z:
        urut = urutan_berkas_slide(z)
        ubah, kunci = {}, []
        for n, f in enumerate(urut, 1):
            x = z.read(f).decode('utf-8')
            S = baca_shape(x)
            nm, kc = namai_slide(S, n)
            potong, o = [], 0
            for i in sorted(nm, key=lambda i: S[i]['span'][0]):
                a, b = S[i]['span']; potong += [x[o:a], nm[i]]; o = b
            ubah[f] = (''.join(potong) + x[o:]).encode('utf-8')
            nama_akhir = lambda i: nm.get(i, S[i]['nama'])
            kunci += [{'slide': n, 'shape': nama_akhir(i), 'angka': m, **({'sel': sel, 'sel_dasar': SEL_DASAR} if sel else {})} for i, m, sel in kc]
        if tulis:
            sementara = pptx + '.tmp'
            with zipfile.ZipFile(sementara, 'w', zipfile.ZIP_DEFLATED) as zo:
                for it in z.infolist(): zo.writestr(it, ubah.get(it.filename) or z.read(it.filename))
    if tulis:   # tulis=False: hanya mengembalikan daftar kunci, PPTX dan kunci.json tidak disentuh
        os.replace(sementara, pptx)
        with open(pptx[:-5] + '.kunci.json', 'w', encoding='utf-8') as f:   # <deck>.kunci.json: harian dan penanganan berbagi folder keluaran bot
            json.dump(kunci, f, ensure_ascii=False, indent=1)
    return kunci


def uji():
    for teks, harap in [('Sedang dalam penanganan oleh BPBD Kab. Serdang Bedagai', 'Ditangani BPBD'), ('Sedang dalam penanganan', 'Dalam penanganan'),
                        ('Pohon-pohon yang tumbang telah selesai dievakuasi, sementara kerusakan', 'Pohon tumbang dievakuasi'), ('Kondisi sudah kondusif', 'Sudah kondusif'),
                        ('Air sudah surut, masih dalam proses pembersihan', 'Surut, pembersihan'), ('Air berangsur surut, TMA 5 - 10 cm', 'Berangsur surut'),
                        ('Sebagian warga melakukan perbaikan rumah secara mandiri', 'Perbaikan rumah'), ('Air Belum surut TMA 30-100 cm, telah dilakukan penyaluran', 'Belum surut'),
                        ('Kondisi TMA di beberapa wilayah fluktuatif, Wilayah Sungai Mas', 'TMA fluktuatif')]:
        assert pil_kondisi(teks)[0] == harap, (teks, pil_kondisi(teks))
    assert pil_kondisi('') is None and pil_kondisi('Total distribusi air 378.000 liter')[0] == 'Distribusi air'
    B = lambda j, k: masih_berlangsung({'jenis': j, 'teks': {'kondisi': k}})
    # Kondisi Mutakhir WA 14 dan 16 Nov, dengan putusan pemilik di laporan manual hari itu
    assert B('banjir', 'Air Belum surut TMA 30-100 cm, telah dilakukan penyaluran logistik') and B('banjir', 'Kondisi TMA di beberapa wilayah fluktuatif, tanggul penahan banjir mengalami ablasi')
    assert B('longsor', 'Korban hilang sudah ditemukan, Air belum surut dan jalan Kampung Arul Badak belum bisa dilalui') and B('banjir', 'Banjir belum surut, TMA ± 30-40 cm')
    assert not B('banjir', 'Air sudah surut dan BPBD Kab. Tapanuli Selatan melakukan pemantauan di lokasi terdampak serta menyiapkan 1 unit perahu')
    assert not B('banjir', 'Banjir sudah surut') and not B('cuaca', 'Masih dilakukan pembersihan sisa material pohon tumbang dan rumah rusak')
    assert B('kekeringan', 'Distribusi air bersih oleh BPBD') and B('banjir', 'Air berangsur surut, TMA 10-50 cm')
    assert pengungsi_kk('- Pengungsi: ± 784 KK / 2.650 Jiwa mengungsi') == 784 and pengungsi_kk('- Pengungsi: Nihil') == 0
    assert wa_normal('1. Bencana Alam Banjir di Kab Aceh Barat *(Pengkinian data)*\n- ⁠Pengungsi: Nihil') == '1. Bencana Alam Banjir di Kab. Aceh Barat (Pengkinian Data)\n- Pengungsi: Nihil'
    assert bungkus(['Aceh', 'Sumut', 'Sumbar', 'Sumsel', 'Banten', 'Jabar', 'Jateng', 'Papua Pegunungan']) == 'Aceh, Sumut, Sumbar, Sumsel,\nBanten, Jabar, Jateng,\nPapua Pegunungan'
    jp = {'stasiun': [{'icao': 'WIBB', 'lat': 0.459, 'lon': 101.444, 'jam': [{'t': '2026-11-15T23:00Z', 'vis_m': 6000, 'wx': None}]}]}
    saat = dt.datetime(2026, 11, 15, 23, 0, tzinfo=dt.timezone.utc)
    assert pm_galat(0.51, 101.44, 2534.7, jp, saat) and not pm_galat(0.51, 101.44, 72.4, jp, saat)   # pemilik 16 Nov: Pekanbaru dibuang
    jp['stasiun'][0]['jam'][0].update(vis_m=800, wx='FU')
    assert not pm_galat(0.51, 101.44, 603.0, jp, saat)   # asap sungguhan (Pangkalan Bun 603 Berbahaya, 24 Okt) tetap tampil
    print('ok pil kondisi, berlangsung, pengungsi, wa_normal, bungkus, galat PM2,5')


def utama():
    ap = argparse.ArgumentParser()
    ap.add_argument('--uji', action='store_true'); ap.add_argument('--tanggal'); ap.add_argument('--koordalops'); ap.add_argument('--bmkg'); ap.add_argument('--pvmbg')
    ap.add_argument('--jam'); ap.add_argument('--out', default='.')
    ap.add_argument('--isian', help='JSON medan bahan hasil urai bot (BL-06); menimpa medan yang sama dari bahan WA, angka sistem dikunci')
    ap.add_argument('--terima-kurang', action='store_true', help='WA Koordalops merinci lebih sedikit dari jumlah menonjol; hanya atas perintah pemilik')   # --jam diterima supaya pemanggil sama dengan harian.py; cut-off format ini selalu 07.00
    # 20 Nov 2026 pemilik (laporan 31 kejadian): slide Rincian Lokasi (harian_rincian.py) sesudah ringkasan; bot menanyakannya bila kejadian banyak
    ap.add_argument('--rincian', choices=('ya', 'tidak'), default='tidak', help='tambah slide Rincian Lokasi Kejadian (peta kab/kota + tabel per kab/kota)')
    ap.add_argument('--hitung', action='store_true', help='cetak JSON {laporan, tampil, banyak} kejadian slide 1 lalu keluar (bot: tanya slide rincian)')
    g = ap.parse_args()
    if g.uji:
        return uji()
    os.chdir(G)
    import harian, lewat_deck, pdf, wa_harian, desain_kemarin, harian_rincian
    T = dt.date.fromisoformat(g.tanggal)
    tpl = os.path.join(G, 'cache', 'templat', 'harian-221026.pptx')
    if not os.path.exists(tpl):
        sys.exit(f'templat tidak ada: {tpl}')
    baca = lambda p: open(p, encoding='utf-8').read()
    teks_k = wa_normal(baca(g.koordalops))
    wa = wa_harian.koordalops(teks_k, terima_kurang=g.terima_kurang)
    if not g.hitung or (g.bmkg and g.pvmbg):   # --hitung (bot, sebelum bertanya slide rincian) cukup WA Koordalops
        w = wa_harian.bmkg(baca(g.bmkg).replace('Sumatra ', 'Sumatera '))   # 16 Nov: "Sumatra Barat"
        ga = wa_harian.pvmbg(pvmbg_normal(baca(g.pvmbg)))
        if g.isian: terap_isian_harian(wa, w, ga, baca_isian(g.isian, ISIAN_HARIAN))
    if wa['sampai'][:10] != g.tanggal:
        sys.exit(f"WA Koordalops s.d. {wa['sampai']} bukan hari laporan {g.tanggal}")
    out = os.path.abspath(g.out); ke = os.path.join(out, f'kerja-{T:%d%m%y}'); os.makedirs(ke, exist_ok=True)

    # 6 Nov pemilik: slide tanpa karhutla; jumlah laporan dikurangi laporan karhutla
    laporan_wa, n_karhutla = wa['laporan'], sum(x['jenis'] == 'karhutla' for x in wa['kejadian'])
    wa['laporan'] -= sum(x['jenis'] == 'karhutla' for x in wa['kejadian'])
    wa['kejadian'] = [x for x in wa['kejadian'] if x['jenis'] != 'karhutla']
    for x in wa['kejadian']:   # 16 Nov: "Tanah Longsor dan Banjir di Kab. Aceh Tengah" terurai banjir; korbannya tertimbun longsor
        if re.match(r'(?i)tanah longsor', x.get('label') or ''): x['jenis'] = 'longsor'
    # 11 Nov pemilik: slide 1 = kejadian baru + kejadian yang bencananya masih berlangsung
    buang = [f"{x['jenis']} {x['lokasi']}" for x in wa['kejadian'] if not (x.get('baru') or masih_berlangsung(x))]
    wa['kejadian'] = [x for x in wa['kejadian'] if x.get('baru') or masih_berlangsung(x)]
    if g.hitung:   # bot: jumlah kejadian slide 1 dan apakah tabelnya digabung per provinsi (baris lebih dari harian.GABUNG_BARIS)
        # wa = jumlah di kepala WA; karhutla tidak dimuat format ini; selesai = kejadian yang bencananya sudah lewat (tidak tampil)
        print(json.dumps({'wa': laporan_wa, 'karhutla': n_karhutla, 'selesai': len(buang), 'tampil': len(wa['kejadian']), 'banyak': len(wa['kejadian']) > harian.GABUNG_BARIS}))
        return
    harian.angka_karhutla =lambda kej, web, tanggal, jam: (T, '07:00', set(), lambda k: {})   # format ini tanpa karhutla: tidak perlu hitung satelit
    web = harian.ambil_web(os.path.join(ke, 'web'))
    D = harian.susun(wa, web, T, None)
    lama, awal = mulai_lama(T, out), wa['mulai'][:10]
    for x in D['kejadian']:
        x['mulai'] = awal if x.get('baru') else lama.get((x['prov'], harian_rincian.kunci_lok(x['lokasi'])), awal)
        pil = pil_kondisi(x['teks']['kondisi'])
        if pil: x['kondisi_pil'] = pil
        try: x['lokasi'] = harian_rincian.nama_geo(x['prov'], x['lokasi'])   # 20 Nov: ejaan batas wilayah ("Lima puluh Kota" -> "Lima Puluh Kota", "Kep. Mentawai")
        except Exception as e: print('PERINGATAN', e)
        x['lokasi_asli'] = x['lokasi']; x['lokasi'] = PENDEK_LOK.get(x['lokasi'], x['lokasi'])   # nama utuh untuk slide rincian (peta dan tabel)
        if not (x['angka'].get('kk') or x['angka'].get('meninggal')): print('dampak strip (tanpa KK/MD di WA):', x['lokasi'], '|', x['teks']['dampak'][:60])   # 16 Nov atasan: "Di strip aja"
    print('dibuang (sudah selesai):', buang, '| tampil:', [(x['jenis'], x['lokasi'], x['mulai'], 'baru' if x.get('baru') else 'berlangsung') for x in D['kejadian']])
    json.dump({**D, 'kejadian': [{**x, 'perhatian': False} for x in D['kejadian']]}, open(os.path.join(ke, 'data.json'), 'w'), ensure_ascii=False, indent=1)   # 6 Nov: peta tanpa perlu perhatian
    if os.path.isdir(os.path.join(ke, 'tpl')): shutil.rmtree(os.path.join(ke, 'tpl'))
    zipfile.ZipFile(tpl).extractall(os.path.join(ke, 'tpl'))
    for js in ('harian_peta.mjs', 'harian_ikon.mjs'):
        subprocess.run(['node', os.path.join(G, js), ke], check=True, stdout=subprocess.DEVNULL)

    # peringatan dini BMKG dan Rencana Aksi
    try: jp = harian.unduh_json('https://centurisk97.id/udara/data/jarak_pandang.json', os.path.join(ke, 'web', 'jarak_pandang.json'))
    except Exception as e: jp = None; print('jarak pandang tidak terunduh, PM2,5 tidak diperiksa:', e)
    pusat = json.load(open(os.path.join(AKAR, 'public', 'banjir', 'data', 'pusat_kec.json'), encoding='utf-8'))
    baris, peta, pm_buang = peringatan(w, harian, jp, pusat, T, {x['prov'] for x in D['kejadian']})
    if pm_buang: print('PM2,5 dibuang (galat sensor):', pm_buang)
    kartu = rencana_aksi(D['kejadian'], teks_k, harian)
    print('peringatan dini:', [(b[1], b[2].replace('\n', ' '), b[3]) for b in baris], '| rencana aksi:', [k[2] for k in kartu])

    desain_kemarin.pasang(('judul', 's2'))   # format Revisi 14 (11 Nov): judul dan kartu desain 9 Nov, sisanya generator terbaru
    nama = os.path.join(out, f'Laporan Kejadian Bencana Harian {T:%d%m%y}.pptx')
    P = web['peta_karhutla.json']; H_DATA = min((T - dt.timedelta(days=1)).isoformat(), P['hari'][-1])
    HL = f"{int(H_DATA[8:])} {harian.BULAN[int(H_DATA[5:7]) - 1][:3].upper()}"
    dk = harian.Deck(ke, D, wa, w, T, None); dk.BJ = None; dk.TANPA_BARU = False; dk.V3 = dk.KRIS_ISI = True; dk.ALT_RINCI = False
    dk.CD_PIL = 960120; dk.INFO_PIL = True; dk.LAMPIRAN = True; dk.SIAGA = True; dk.GA_GAYAS = ['lingkaran']; dk.GA = ga; dk.LAMP_TAMBAH = []; dk.HAL_TAMBAH = []
    dk.TANPA_KONDISI = True; dk.KARTU_ALT = dk.SIAGA_INFO = dk.TINDAK_INFO = dk.KOLOM_MULAI = True; dk.INFO_Y = (1280160, 5010912)
    dk.INFO_GABUNG = harian.GABUNG_BARIS   # 20 Nov 2026: kejadian banyak = baris digabung per (jenis, provinsi, baru/berlangsung)
    dk.PERINGATAN_PETA = peta; dk.PERINGATAN_BARIS = baris; dk.PERINGATAN_KET = True; dk.RES_T = 1325880
    dk.JUDUL_STRIP = 'RENCANA AKSI'; dk.STRIP_KARTU = kartu
    for x in D['kejadian']:   # pemilik 10 Nov: angin kencang dan cuaca ekstrem satu nama di judul, kartu, peta, legenda, dan tabel
        if x['jenis'] == 'angin': x['jenis'] = 'cuaca'
    judul_asli = dk.judul

    def judul_jenis(a):   # 11 Nov atasan: "Terdapat N kejadian bencana dengan rincian X banjir dan Y ..."
        nm_ = lambda j: 'kekeringan' if j == 'kekeringan' else (lambda v: v[0][0].lower() + v[0][1:])(harian.JENIS_LAIN[j])
        urut_ = ['banjir', 'cuaca', 'kekeringan'] + [j for j in harian.JENIS_LAIN if j not in ('banjir', 'cuaca')]
        hit_ = [(n_, nm_(j)) for j in urut_ for n_ in [sum(1 for x in D['kejadian'] if x['jenis'] == j)] if n_]
        o_ = [(a[0][0].rstrip(': ') + ': Terdapat ', *a[0][1:]), a[1], (' kejadian bencana dengan rincian ', *a[0][1:])]
        for i_, (n_, l_) in enumerate(hit_):
            if i_: o_.append((', dan ' if i_ == len(hit_) - 1 and len(hit_) > 2 else ' dan ' if i_ == len(hit_) - 1 else ', ', *a[0][1:]))
            o_ += [(harian.f0(n_), *a[1][1:]), (' ' + l_, *a[0][1:])]
        return o_
    dk.judul = lambda: (lambda a, b: (judul_jenis(a), b))(*judul_asli())
    dk.lbl_kolom, dk.lbl_hot, dk.lbl_kum = f'FIRESPOT DAN SISA {HL}', 'firespot', f'TERBAKAR 1 JAN–{HL}'
    if g.rincian == 'ya':
        harian_rincian.pasang(dk, harian, teks_k)
    dk.bangun(tpl, nama)

    bl = lambda t: f"{t.day} {harian.BULAN[t.month - 1][:3]} {t.year}"
    mulai, sampai = (dt.datetime.strptime(wa[k], '%Y-%m-%d %H.%M') for k in ('mulai', 'sampai'))
    jam_ga = (re.search(r'(\d\d[.:]\d\d)\s*WIB', ga.get('jam') or '') or [None, '06.00'])[1].replace(':', '.')
    sv_ = f'PVMBG Badan Geologi, {bl(T)} {jam_ga} WIB'
    sk = f'Laporan Harian Dit. Koordalops BNPB, {bl(mulai)} {mulai:%H.%M} s.d. {bl(sampai)} {sampai:%H.%M} WIB; {sv_}'   # 13 Nov pemilik: tanpa "GIS BNPB"
    sv = f'{sv_}; definisi status Permen ESDM 15/2011'
    hal = dict(lewat_deck.urutan_slide(nama))   # stdlib: venv bot hanya Pillow
    h_ring = next(i for i, t in hal.items() if 'INFORMASI BENCANA' in t)
    h_siaga = next(i for i, t in hal.items() if 'Status siaga bencana' in t)
    bagian = [{'judul': 'Ringkasan Situasi', 'label': 'Ringkasan', 'halaman_tetap': [1]}, {'judul': 'Status Siaga Bencana', 'label': 'Status siaga', 'halaman_tetap': [2]}]
    susun = [{'sumber': sk, 'halaman': h_ring, 'bagian': 1}, {'sumber': sv, 'halaman': h_siaga, 'bagian': 2}]
    if g.rincian == 'ya':   # urutan Ringkasan, Rincian lokasi, Status siaga (laporan 201126)
        h_rinc = next(i for i, t in hal.items() if harian_rincian.JUDUL_PANEL in t)
        sr_ = f'Laporan Harian Dit. Koordalops BNPB, {bl(mulai)} {mulai:%H.%M} s.d. {bl(sampai)} {sampai:%H.%M} WIB'
        bagian = [bagian[0], {'judul': 'Rincian Lokasi', 'label': 'Rincian lokasi', 'halaman_tetap': [2]}, {**bagian[1], 'halaman_tetap': [3]}]
        susun = [susun[0], {'sumber': sr_, 'halaman': h_rinc, 'bagian': 2}, {**susun[1], 'bagian': 3}]
    lewat_deck.bingkai(nama, 'harian', 'Laporan Kejadian Bencana Harian', f'Periode {bl(mulai)}, {mulai:%H.%M} sampai {bl(sampai)}, {sampai:%H.%M} WIB', T, pdf=False,
                       tanpa_kepada=TANPA_KEPADA, bagian=bagian, spek_tambah={'panel_sisi': 'gelap'}, susun=susun)
    sementara = nama + '.tmp'   # 2 Nov: ejaan resmi "Kota Parepare"
    with zipfile.ZipFile(nama) as zi, zipfile.ZipFile(sementara, 'w', zipfile.ZIP_DEFLATED) as zo:
        for it in zi.infolist():
            b = zi.read(it.filename)
            zo.writestr(it, b.replace(b'Pare Pare', b'Parepare') if it.filename.endswith('.xml') else b)
    os.replace(sementara, nama)
    print('kunci', len(namai_deck(nama)), 'shape angka sistem ->', nama[:-5] + '.kunci.json')   # BL-06: nama shape stabil + kunci (D3)
    # 5 Nov pemilik: banjir WA ikut Pantau Banjir, sesudah deck jadi; gagal unggah tidak menghentikan laporan; WA_KERING = uji tanpa kirim
    if not os.environ.get('WA_KERING') and any(x['jenis'] == 'banjir' for x in D['kejadian']):
        subprocess.run([sys.executable, 'scripts/data/dalops_banjir.py', '--unggah'], cwd=AKAR)
    print('ok', nama, '| pdf', pdf.ke_pdf(nama), '| laporan', wa['laporan'], '| tampil', len(D['kejadian']))


if __name__ == '__main__':
    utama()
