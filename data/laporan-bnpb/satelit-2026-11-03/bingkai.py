"""Bingkai Laporan Penanganan Pengendalian Karhutla 031126 lewat mesin ppt-konsultan (deck.py, format 'penanganan'), pola sama dengan
laporan harian 021126 (pemilik 31 Okt: "kalo bentuknya dalam ppt semuanya harus pasti ke deck.py"; 2 Nov: "utamakan pembuatan slidenya
pakai skill itu"). Isi tiga slide dari jalan.py (generator penanganan) + slide native Hasil Pemadaman Satgas (satgas.py), dibingkai:
sampul + KRIS, penanda bagian, kaki Sumber, penutup.

    PYTHONUTF8=1 DECK_BNPB=~/.claude/skills/ppt-konsultan/bnpb python bingkai.py   (sesudah jalan.py)
"""
import datetime as dt, os, re, shutil, sys, zipfile
S = os.path.dirname(os.path.abspath(__file__)); G = os.path.normpath(os.path.join(S, '..', 'generator')); sys.path.insert(0, G); sys.path.insert(0, S)
import lewat_deck, pdf, satgas
T = dt.date(2026, 11, 3)
nama = os.path.join(S, 'Laporan Penanganan Pengendalian Karhutla 031126.pptx')
gen = os.path.join(S, 'Laporan Penanganan Pengendalian Karhutla 031126 (generator).pptx')
if not os.path.exists(gen):   # simpan hasil jalan.py sekali; bingkai ulang selalu dari berkas generator ini
    shutil.copyfile(nama, gen)
# firespot generator C9503A tidak ada di palet tema; deck.py memetakannya ke oranye terdekat (= warna BELUM PADAM). Pakai merah tema
# C8102E dan tint bahaya F8DDE0 supaya firespot tetap beda warna dari belum padam (pemeriksa bersih 2 Nov: oranye berarti empat hal).
with zipfile.ZipFile(gen) as zi, zipfile.ZipFile(nama, 'w', zipfile.ZIP_DEFLATED) as zo:
    for it in zi.infolist():
        b = zi.read(it.filename)
        if it.filename.endswith('.xml'): b = b.replace(b'C9503A', b'C8102E').replace(b'FFE3DC', b'F8DDE0')
        if re.match(r'ppt/slides/slide\d+\.xml$', it.filename):
            # pemilik 2 Nov: catatan kaki "*Data berdasarkan GIS ... (FIRMS: VIIRS dan MODIS)" dihapus ("kan udah ada di footer sumber"),
            # beserta garis aksen biru di kirinya dan bintang rujukan di kepala kolom (HOTSPOT* -> HOTSPOT)
            x = b.decode('utf-8')
            x = ''.join('' if ('Data berdasarkan Geographic' in s or '<a:off x="548640" y="6199632"/><a:ext cx="45720" cy="219456"/>' in s) else s
                        for s in re.split(r'(<p:sp>.*?</p:sp>)', x, flags=re.S))
            x = re.sub(r'<a:t>(HOTSPOT|FIRESPOT|LUAS TERBAKAR|BELUM PADAM)\*</a:t>', r'<a:t>\1</a:t>', x)
            b = x.encode('utf-8')
        zo.writestr(it, b)
SG = 'GIS BNPB, satelit NASA FIRMS (VIIRS dan MODIS), 3 Nov 2026 18.00 WIB'
lewat_deck.bingkai(nama, 'penanganan', 'Laporan Penanganan Pengendalian Karhutla', 'Cut-off data 3 Nov 2026, 18.00 WIB', T, pdf=False,
    tanpa_kepada='sama dengan laporan harian 2 Nov 2026 (pola tetap 3 Nov): laporan dipresentasikan Kepala BNPB sendiri',
    bagian=[{'judul': 'Situasi Hotspot dan Firespot', 'label': 'Situasi', 'halaman_tetap': [1, 2]},
            {'judul': 'Operasi Penanganan', 'label': 'Operasi', 'halaman_tetap': [3]}],
    spek_tambah={'panel_sisi': 'gelap', 'skala_logo_bnpb': 1.0},   # pemilik 2 Nov 17.4x: "logo bnpb terlalu besar" (bawaan mesin 1,3x)
    susun=[   # pemilik 3 Nov: laporan karhutla tanpa sampul dan penutup (lewat_deck juga membuangnya untuk format penanganan)
           {'halaman': 1, 'bagian': 1, 'sumber': SG},
           {'halaman': 2, 'bagian': 1, 'sumber': f'GIS BNPB, NASA FIRMS 3 Nov 18.00 WIB; PM2,5 CAMS 1 Nov; hujan model Open-Meteo, kelas BMKG'},   # pil tabel (pil_sendiri.py); klarifikasi hujan 2 Nov
           # slide Hasil Pemadaman Satgas (satgas.slide) dihapus pemilik 2 Nov: "hapus slide 4"
           {'halaman': 3, 'bagian': 2, 'sumber': satgas.SO},   # D-10 menolak "provinsi prioritas" di baris sumber
           ])
print('mesin ok', nama)
print('pdf', pdf.ke_pdf(nama))
