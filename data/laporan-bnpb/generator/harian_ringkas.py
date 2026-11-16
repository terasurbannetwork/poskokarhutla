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

    python harian_ringkas.py --tanggal 2026-11-16 --koordalops k.txt --bmkg b.txt --pvmbg p.txt --out DIR
    python harian_ringkas.py --uji
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
    'banjir': r'belum surut|fluktuatif|menggenang|tergenang|terendam|genangan|berangsur surut|sebagian.*(?:surut|genang)|masih diguyur|naik|meluap',
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
    return re.sub(r'(\*Gn\. [^(*\n]+?) \([^)]*\)\*', r'\1*', t)


def blok_wa(teks, lokasi):
    """Teks satu kejadian di WA Koordalops (untuk angka yang tidak diurai wa_harian, mis. pengungsi KK)."""
    for b in re.split(r'\n(?=\d+\.\s)', teks):
        if re.search(rf'\bdi (?:Kab\.? |Kota |Kabupaten )?{re.escape(lokasi.replace("Kota ", ""))}\b', b.split('\n')[0]):
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
TITIK_PROV = {'11': (97.8, 2.3, 'kanan'), '12': (99.2, 0.7, 'kanan'), '13': (100.6, -0.7, 'kiri'), '14': (101.9, 0.4, 'kanan'), '15': (103.0, -1.7, 'kanan'),
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
            baris.append((f'hujansolid_{wr}', 'Hujan lebat', bungkus([SINGKAT_PANEL[k] for k in kd]), pil, wr, per))
            peta += [(*TITIK_PROV[k][:2], f"{'' if k in prov_kejadian or k in TANPA_NAMA else harian.NAMA[k]}|Hujan lebat", wr, TITIK_PROV[k][2]) for k in kd]
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
    for j in ['banjir', 'cuaca', 'kekeringan', 'longsor'] + [x['jenis'] for x in kej]:
        if any(x['jenis'] == j for x in kej): per.setdefault(j, [x for x in kej if x['jenis'] == j])
    lok = lambda xs: daftar_kata([x['lokasi'] for x in xs])
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
            rm = sum(int(x['angka'].get('rumah_dampak') or 0) for x in xs)
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
    if ungsi:
        kartu.insert(1, ('tenda_putih', 'Pengungsi', f"Memantau layanan ±{f0(sum(n for _, n in ungsi))} KK pengungsi di {daftar_kata([l for l, _ in ungsi])}."))
    return kartu[:3]


# ----------------------------------------------------------------------------- MULAI
def mulai_lama(T, out):
    """{(prov, lokasi): mulai} dari data.json laporan 1-4 hari sebelumnya (keluaran bot di folder tanggal sebelahnya, lalu folder repo)."""
    import jalur
    hasil = {}
    for n in range(4, 0, -1):   # yang paling dekat menang
        d = T - dt.timedelta(days=n)
        calon = [os.path.join(os.path.dirname(out), d.isoformat(), f'kerja-{d:%d%m%y}', 'data.json'), os.path.join(out, '..', d.isoformat(), f'kerja-{d:%d%m%y}', 'data.json')]
        try: calon.append(os.path.join(jalur.harian(d), f'kerja-{d:%d%m%y}', 'data.json'))
        except Exception: pass
        f = next((c for c in calon if os.path.exists(c)), None)
        if not f: continue
        for x in json.load(open(f, encoding='utf-8'))['kejadian']:
            if x.get('mulai') and x.get('jenis') != 'karhutla':
                hasil[(x['prov'], x['lokasi'])] = x['mulai']
    return hasil


PENDEK_LOK = {'Hulu Sungai Selatan': 'Hulu Sungai Sel.'}   # 12-13 Nov: nama penuh terpotong di kolom KAB/KOTA


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
    ap.add_argument('--terima-kurang', action='store_true', help='WA Koordalops merinci lebih sedikit dari jumlah menonjol; hanya atas perintah pemilik')   # --jam diterima supaya pemanggil sama dengan harian.py; cut-off format ini selalu 07.00
    g = ap.parse_args()
    if g.uji:
        return uji()
    os.chdir(G)
    import harian, lewat_deck, pdf, wa_harian, desain_kemarin
    T = dt.date.fromisoformat(g.tanggal)
    tpl = os.path.join(G, 'cache', 'templat', 'harian-221026.pptx')
    if not os.path.exists(tpl):
        sys.exit(f'templat tidak ada: {tpl}')
    baca = lambda p: open(p, encoding='utf-8').read()
    teks_k = wa_normal(baca(g.koordalops))
    wa = wa_harian.koordalops(teks_k, terima_kurang=g.terima_kurang)
    w = wa_harian.bmkg(baca(g.bmkg).replace('Sumatra ', 'Sumatera '))   # 16 Nov: "Sumatra Barat"
    ga = wa_harian.pvmbg(pvmbg_normal(baca(g.pvmbg)))
    if wa['sampai'][:10] != g.tanggal:
        sys.exit(f"WA Koordalops s.d. {wa['sampai']} bukan hari laporan {g.tanggal}")
    out = os.path.abspath(g.out); ke = os.path.join(out, f'kerja-{T:%d%m%y}'); os.makedirs(ke, exist_ok=True)

    # 6 Nov pemilik: slide tanpa karhutla; jumlah laporan dikurangi laporan karhutla
    wa['laporan'] -= sum(x['jenis'] == 'karhutla' for x in wa['kejadian'])
    wa['kejadian'] = [x for x in wa['kejadian'] if x['jenis'] != 'karhutla']
    for x in wa['kejadian']:   # 16 Nov: "Tanah Longsor dan Banjir di Kab. Aceh Tengah" terurai banjir; korbannya tertimbun longsor
        if re.match(r'(?i)tanah longsor', x.get('label') or ''): x['jenis'] = 'longsor'
    # 11 Nov pemilik: slide 1 = kejadian baru + kejadian yang bencananya masih berlangsung
    buang = [f"{x['jenis']} {x['lokasi']}" for x in wa['kejadian'] if not (x.get('baru') or masih_berlangsung(x))]
    wa['kejadian'] = [x for x in wa['kejadian'] if x.get('baru') or masih_berlangsung(x)]
    harian.angka_karhutla = lambda kej, web, tanggal, jam: (T, '07:00', set(), lambda k: {})   # format ini tanpa karhutla: tidak perlu hitung satelit
    web = harian.ambil_web(os.path.join(ke, 'web'))
    D = harian.susun(wa, web, T, None)
    lama, awal = mulai_lama(T, out), wa['mulai'][:10]
    for x in D['kejadian']:
        x['mulai'] = awal if x.get('baru') else lama.get((x['prov'], x['lokasi']), awal)
        pil = pil_kondisi(x['teks']['kondisi'])
        if pil: x['kondisi_pil'] = pil
        x['lokasi'] = PENDEK_LOK.get(x['lokasi'], x['lokasi'])
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
    lewat_deck.bingkai(nama, 'harian', 'Laporan Kejadian Bencana Harian', f'Periode {bl(mulai)}, {mulai:%H.%M} sampai {bl(sampai)}, {sampai:%H.%M} WIB', T, pdf=False,
                       tanpa_kepada=TANPA_KEPADA, bagian=bagian, spek_tambah={'panel_sisi': 'gelap'}, susun=susun)
    sementara = nama + '.tmp'   # 2 Nov: ejaan resmi "Kota Parepare"
    with zipfile.ZipFile(nama) as zi, zipfile.ZipFile(sementara, 'w', zipfile.ZIP_DEFLATED) as zo:
        for it in zi.infolist():
            b = zi.read(it.filename)
            zo.writestr(it, b.replace(b'Pare Pare', b'Parepare') if it.filename.endswith('.xml') else b)
    os.replace(sementara, nama)
    # 5 Nov pemilik: banjir WA ikut Pantau Banjir, sesudah deck jadi; gagal unggah tidak menghentikan laporan; WA_KERING = uji tanpa kirim
    if not os.environ.get('WA_KERING') and any(x['jenis'] == 'banjir' for x in D['kejadian']):
        subprocess.run([sys.executable, 'scripts/data/dalops_banjir.py', '--unggah'], cwd=AKAR)
    print('ok', nama, '| pdf', pdf.ke_pdf(nama), '| laporan', wa['laporan'], '| tampil', len(D['kejadian']))


if __name__ == '__main__':
    utama()
