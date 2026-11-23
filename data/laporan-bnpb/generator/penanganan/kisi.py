"""Kisi kolom tabel slide 1 deck Penanganan, dipakai bersama oleh ganti.py (yang menggambar) dan cek6.py (yang memeriksa),
supaya pemeriksanya tidak bisa lulus karena memakai kisi yang berbeda dari penggambarnya.

4 kelompok x 3 hari. Kolom FIRESPOT ditambahkan sesudah HOTSPOT, urutan sama dengan slide peta (pemilik 25 dan 27 Okt 2026). Blok tabel dipertahankan
selebar dan sekanan templat BNPB supaya pil PM2,5/cuaca di kirinya (berakhir tepat di KOL0 - 45.720) tidak perlu digeser:
4 kelompok + 3 sela harus muat di tempat 3 kelompok + 2 sela, jadi kolomnya menyempit dari 709.473 ke PITCH.

BENCANA=banjir (env, dipasang penanganan_banjir.py): kunci kelompok tetap hot/fs/luas/belum supaya penggambar dan pemeriksanya sama,
isinya kecamatan Siaga/Awas banjir, kecamatan Siaga/Awas longsor, titik rob Siaga, dan jiwa terpapar (public/banjir/data/laporan.json).

PB-58 (17 Nov 2026): BENCANA=gempa dan BENCANA=kekeringan (penanganan_gempa.py, penanganan_kekeringan.py) memakai tata letak yang sama dengan banjir.
Semua yang khas per bencana (warna, kepala kolom, ikon, desimal, agregat baris jumlah, teks slide) ada di PROFIL; BANJIR = tata letak non-karhutla.
Profil banjir sama persis dengan isi lama, jadi deck karhutla dan banjir tidak berubah.
"""
import math, os
JENIS = os.environ.get('BENCANA') or 'karhutla'
BANJIR = JENIS != 'karhutla'   # nama lama: tata letak non-karhutla (banjir, gempa, kekeringan)
# per kelompok: desimal angka tampil dan agregat baris jumlah/kotak nasional ('jumlah', 'maks', 'rerata'); bawaan = bilangan bulat dijumlah
DES = {'hot': 0, 'fs': 0, 'luas': 0, 'belum': 0}
AGR = {'hot': 'jumlah', 'fs': 'jumlah', 'luas': 'jumlah', 'belum': 'jumlah'}
GRUP = ('hot', 'fs', 'luas', 'belum')
KOL0, PITCH0, GW0, SELA = 4709160, 709473, 2128418, 182879   # templat: x kelompok 1, lebar kolom, lebar kelompok, sela
GW = (3 * GW0 + 2 * SELA - 3 * SELA) // 4
PITCH = GW // 3
BW = round(297979 * PITCH / PITCH0)        # batang ikut menyempit
LW = PITCH + 45720                         # kotak angka sedikit melebihi kolomnya, seperti templat; teksnya rata tengah
GX = {g: KOL0 + i * (GW + SELA) for i, g in enumerate(GRUP)}
LX = {g: [GX[g] + i * PITCH - (LW - PITCH) // 2 for i in range(3)] for g in GRUP}
BX = {g: [GX[g] + i * PITCH + (PITCH - BW) // 2 for i in range(3)] for g in GRUP}
HGX = {'fs': 'C9503A', 'hot': '051C2C', 'luas': '3F5F80', 'belum': 'D9600B'}   # warna kepala; FIRESPOT = merah Firespot layar
HGX_MUDA = {'fs': 'FFE3DC', 'hot': 'E6ECF3', 'luas': 'E6ECF3', 'belum': 'FFE6D5'}
KEPALA = {'fs': ('FIRESPOT*', '  (titik)'), 'hot': ('HOTSPOT*', '  (titik)'),   # firespot bagian dari hotspot, satuan sama
          'luas': ('LUAS TERBAKAR*', '  (ha)'), 'belum': ('BELUM PADAM*', '  (ha)')}
KEPALA_SZ, IKON_W, IKON_SELA = 800, 164592, 68580  # templat 1050/219456; ikon + sela + tulisan kepala, rata tengah di kotaknya
# ikon kepala per kelompok = ikon pil slide peta: api templat, firespot deck 25 Okt (ikon/firespot.png), kotak, peringatan
# (pemilik 27 Okt 2026: sama untuk tiap kategori di semua slide, beda antarkategori). Relasi gambar slide tabel; rIdFs ditambahkan ganti.py.
IKON = {'hot': 'rId2', 'fs': 'rIdFs', 'luas': 'rId3', 'belum': 'rId4'}
# PROFIL per bencana non-karhutla. ikon/<berkas>.png dibuat ikon.mjs; relasi ditambahkan ganti.py (slide tabel) dan tambah_peta.py (slide peta).
# berkas = semua gambar profil (kepala kolom dan ikon pil); judul_peta, judul_tabel, kaki, leg dipakai jenis selain banjir (banjir memakai teks
# lamanya di ganti.py dan tambah_peta.py, tidak diubah). Kepala kolom sekitar 20 huruf supaya muat di kotak kelompok 4 kolom.
PROFIL = {
    'banjir': dict(hgx={'hot': '1F4E79', 'fs': '8A6A2E', 'luas': '2B8C86', 'belum': 'D9600B'},
                   muda={'hot': 'DCE7F5', 'fs': 'F1E6D2', 'luas': 'D6EFEC', 'belum': 'FFE6D5'},
                   kepala={'hot': ('BANJIR*', '  (kec)'), 'fs': ('LONGSOR*', '  (kec)'), 'luas': ('ROB SIAGA*', '  (titik)'), 'belum': ('TERPAPAR*', '  (ribu jiwa)')},
                   ikon={'hot': 'rIdB1', 'fs': 'rIdB2', 'luas': 'rIdB3', 'belum': 'rIdB4'},
                   berkas={'rIdB1': 'banjir-air', 'rIdB2': 'banjir-longsor', 'rIdB3': 'banjir-rob', 'rIdB4': 'banjir-jiwa'}),
    # public/gempa/data/laporan.json: kejadian (M 4+), m5, dirasakan, mmaks (agregat maks, 1 desimal)
    'gempa': dict(hgx={'hot': '5C3A1E', 'fs': '9A4A1F', 'luas': '3F5F80', 'belum': '051C2C'},
                  muda={'hot': 'F0E3D6', 'fs': 'F6E0D2', 'luas': 'E6ECF3', 'belum': 'E6ECF3'},
                  kepala={'hot': ('M 4+*', '  (kejadian)'), 'fs': ('M 5+*', '  (kejadian)'), 'luas': ('DIRASAKAN*', '  (kejadian)'), 'belum': ('M TERBESAR*', '  (M)')},
                  ikon={'hot': 'rIdG1', 'fs': 'rIdG2', 'luas': 'rIdG3', 'belum': 'rIdG4'},
                  berkas={'rIdG1': 'gempa-m4', 'rIdG2': 'gempa-m5', 'rIdG3': 'gempa-rasa', 'rIdG4': 'gempa-maks',
                          'rIdP1': 'pil-gempa-putih', 'rIdP2': 'pil-gempa-gelap', 'rIdP3': 'pil-hitung-putih'},
                  des={'belum': 1}, agr={'belum': 'maks'}, warna_peta='#7B4B2A',
                  tanpa_panah=('belum',),   # magnitudo skala logaritmik: persen naik/turun M terbesar tidak bermakna
                  sub=[('hot', '', ' gempa M 4+'), ('fs', ', ', ' M 5+'), ('luas', ', ', ' dirasakan'), ('belum', ', M terbesar ', '')],
                  judul_peta='Peta Gempa Bumi per Provinsi 2026',
                  judul_tabel='Gempa Bumi per Provinsi per Tanggal ',
                  kaki='*Katalog gempa BMKG dan USGS; M 4+ dan M 5+ = jumlah gempa per provinsi pada hari itu; dirasakan = gempa yang dirasakan '
                       'menurut BMKG; M terbesar dan baris jumlahnya = magnitudo terbesar. Pil: M terbesar dan jumlah gempa M 4+ dalam 7 hari. –: tidak ada data.',
                  leg=[('ellipse', '7B4B2A', 'Ukuran lingkaran sebanding jumlah gempa M 4+'), ('rect', '051C2C', 'Provinsi dengan gempa M 4+'),
                       ('rect', 'DCE1E7', 'Tanpa gempa M 4+'), ('rect', 'D9600B', 'naik dari hari sebelumnya'), ('rect', '2F86D1', 'turun dari hari sebelumnya')]),
    # public/data/kekeringan_laporan.json: jiwa31 (ribu jiwa di sini), hth_maks (agregat maks), kab31, hujan (rerata, 1 desimal)
    'kekeringan': dict(hgx={'hot': '8A4B00', 'fs': 'B5651D', 'luas': '3F5F80', 'belum': '2F6FB5'},
                       muda={'hot': 'F6DCB5', 'fs': 'F6E1CC', 'luas': 'E6ECF3', 'belum': 'DCE7F5'},
                       kepala={'hot': ('HTH 31+*', '  (ribu jiwa)'), 'fs': ('HTH MAKS*', '  (hari)'), 'luas': ('KAB HTH 31+*', '  (kab)'), 'belum': ('HUJAN*', '  (mm/hari)')},
                       ikon={'hot': 'rIdK1', 'fs': 'rIdK2', 'luas': 'rIdK3', 'belum': 'rIdK4'},
                       berkas={'rIdK1': 'kering-jiwa', 'rIdK2': 'kering-hth', 'rIdK3': 'kering-kab', 'rIdK4': 'kering-hujan',
                               'rIdP1': 'pil-kering-putih', 'rIdP2': 'pil-kering-gelap'},
                       des={'belum': 1}, agr={'fs': 'maks', 'belum': 'rerata'}, warna_peta='#B5651D',
                       sub=[('hot', '', ' ribu jiwa di HTH 31+ hari'), ('fs', ', HTH terpanjang ', ' hari'), ('luas', ', ', ' kabupaten'), ('belum', ', hujan rerata ', ' mm/hari')],
                       judul_peta='Peta Kekeringan per Provinsi 2026',
                       judul_tabel='Kekeringan per Provinsi per Tanggal ',
                       kaki='*Hitungan Centurisk97 dari hujan harian Open-Meteo, bukan peta BMKG. HTH = hari tanpa hujan (hujan < 1 mm) berturut-turut; '
                            'HTH 31+ = penduduk di HTH 31 hari atau lebih; kab = kabupaten dengan 30% penduduk di HTH 31+ (ambang hipotesis); '
                            'baris jumlah HTH maks = terbesar, hujan = rerata. Pil: kelas HTH BMKG dan hujan 7 hari.',
                       leg=[('ellipse', 'B5651D', 'Ukuran lingkaran sebanding penduduk di HTH 31 hari atau lebih'), ('rect', '051C2C', 'Provinsi dengan penduduk di HTH 31+'),
                            ('rect', 'DCE1E7', 'Tanpa penduduk di HTH 31+'), ('rect', 'D9600B', 'naik dari hari sebelumnya'), ('rect', '2F86D1', 'turun dari hari sebelumnya')]),
}
PRF = PROFIL.get(JENIS, {})
if BANJIR:
    HGX, HGX_MUDA, KEPALA, IKON = PRF['hgx'], PRF['muda'], PRF['kepala'], PRF['ikon']
    DES.update(PRF.get('des', {})); AGR.update(PRF.get('agr', {}))
IKON_BANJIR = PRF.get('berkas', {})   # nama lama: rId -> berkas ikon profil (kosong untuk karhutla)
TANPA_PANAH = set(PRF.get('tanpa_panah', ()))   # kelompok tanpa panah persen (tabel, slide peta, cek6.py)
Y_KEPALA, Y_HARI, H_KEPALA, H_HARI = 1463040, 1911096, 402336, 182880
T0, PB = 2167128, 518160                          # y pita baris pertama, jarak antarbaris
NX = [4709160, 5418633, 6128106, 7020458, 7729931, 8439404, 9331757, 10041230, 10750702]   # x kolom templat (buat membuang "NA" lama)


def nol(v):
    """Banjir: None = tidak dipantau (rob di provinsi tanpa titik pantau, terpapar sebelum ada data), digambar 0, ditulis "–"."""
    return 0 if v is None else v


def tampil(g, v):
    """Angka seperti tampil di slide: dibulatkan setengah ke atas pada DES[g] desimal (DES 0 = bilangan bulat, sama dengan bul() lama)."""
    d = DES[g]
    return int(math.floor(v + .5)) if not d else math.floor(v * 10 ** d + .5) / 10 ** d


def teks(g, v):
    """Angka tampil berformat Indonesia: titik ribuan, koma desimal."""
    d = DES[g]
    return f"{tampil(g, v):,.{d}f}".replace(',', ' ').replace('.', ',').replace(' ', '.')


def agregat(g, xs):
    """Baris jumlah dan kotak nasional dari angka yang TAMPIL: None diabaikan, semua None = None. AGR[g] jumlah, maks, atau rerata."""
    xs = [tampil(g, x) for x in xs if x is not None]
    if not xs:
        return None
    return sum(xs) if AGR[g] == 'jumlah' else max(xs) if AGR[g] == 'maks' else tampil(g, sum(xs) / len(xs))


def lebar_teks(runs):
    """Lebar EMU deretan run [(teks, sz seperseratus pt, tebal)], diukur dengan metrik Arial (Roboto deck tidak terpasang; lebarnya mirip).
    Dipakai untuk menengahkan ikon + tulisan di kotak kepala (ganti.py, tambah_peta.py)."""
    from PIL import ImageFont
    jalur = lambda b: next(p for p in (f'/System/Library/Fonts/Supplemental/Arial{" Bold" if b else ""}.ttf',
                                       rf'C:\Windows\Fonts\arial{"bd" if b else ""}.ttf') if os.path.exists(p))   # Mac, Windows (30 Okt)
    f = {b: ImageFont.truetype(jalur(b), 1000) for b in (False, True)}
    return round(sum(f[b].getlength(t) * sz / 100 / 1000 * 12700 for t, sz, b in runs))
