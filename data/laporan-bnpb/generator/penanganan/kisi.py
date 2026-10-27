"""Kisi kolom tabel slide 1 deck Penanganan, dipakai bersama oleh ganti.py (yang menggambar) dan cek6.py (yang memeriksa),
supaya pemeriksanya tidak bisa lulus karena memakai kisi yang berbeda dari penggambarnya.

4 kelompok x 3 hari. Kolom FIRESPOT ditambahkan sesudah HOTSPOT, urutan sama dengan slide peta (pemilik 25 dan 27 Okt 2026). Blok tabel dipertahankan
selebar dan sekanan templat BNPB supaya pil PM2,5/cuaca di kirinya (berakhir tepat di KOL0 - 45.720) tidak perlu digeser:
4 kelompok + 3 sela harus muat di tempat 3 kelompok + 2 sela, jadi kolomnya menyempit dari 709.473 ke PITCH.
"""
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
Y_KEPALA, Y_HARI, H_KEPALA, H_HARI = 1463040, 1911096, 402336, 182880
T0, PB = 2167128, 518160                          # y pita baris pertama, jarak antarbaris
NX = [4709160, 5418633, 6128106, 7020458, 7729931, 8439404, 9331757, 10041230, 10750702]   # x kolom templat (buat membuang "NA" lama)


def lebar_teks(runs):
    """Lebar EMU deretan run [(teks, sz seperseratus pt, tebal)], diukur dengan metrik Arial (Roboto deck tidak terpasang; lebarnya mirip).
    Dipakai untuk menengahkan ikon + tulisan di kotak kepala (ganti.py, tambah_peta.py)."""
    from PIL import ImageFont
    f = {b: ImageFont.truetype(f'/System/Library/Fonts/Supplemental/Arial{" Bold" if b else ""}.ttf', 1000) for b in (False, True)}
    return round(sum(f[b].getlength(t) * sz / 100 / 1000 * 12700 for t, sz, b in runs))
