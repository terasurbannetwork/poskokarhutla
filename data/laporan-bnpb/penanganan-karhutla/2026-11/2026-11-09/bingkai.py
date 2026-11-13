"""Bingkai Laporan Penanganan Pengendalian Karhutla 091126 lewat mesin ppt-konsultan (deck.py, format 'penanganan'), pola sama dengan 081126
tanpa halaman perusahaan (halaman itu hanya untuk deck 081126). Slide Operasi hanya ada bila wa-satgas.txt ada.

    PYTHONUTF8=1 DECK_BNPB=~/.claude/skills/ppt-konsultan/bnpb python bingkai.py   (sesudah jalan.py)
"""
import datetime as dt, os, re, shutil, sys, zipfile
S = os.path.dirname(os.path.abspath(__file__)); G = os.path.normpath(os.path.join(S, '..', '..', '..', 'generator')); sys.path.insert(0, G); sys.path.insert(0, S)
import lewat_deck, pdf
T = dt.date(2026, 11, 9)
nama = os.path.join(S, 'Laporan Penanganan Pengendalian Karhutla 091126.pptx')
gen = os.path.join(S, 'Laporan Penanganan Pengendalian Karhutla 091126 (generator).pptx')
ADA_OPERASI = os.path.exists(os.path.join(S, 'wa-satgas.txt'))
if not os.path.exists(gen):   # simpan hasil jalan.py sekali; bingkai ulang selalu dari berkas generator ini
    shutil.copyfile(nama, gen)
# firespot generator C9503A tidak ada di palet tema; pakai merah tema supaya firespot tetap beda warna dari belum padam (pemeriksa bersih 2 Nov)
with zipfile.ZipFile(gen) as zi, zipfile.ZipFile(nama, 'w', zipfile.ZIP_DEFLATED) as zo:
    for it in zi.infolist():
        b = zi.read(it.filename)
        if it.filename.endswith('.xml'): b = b.replace(b'C9503A', b'C8102E').replace(b'FFE3DC', b'F8DDE0')
        if re.match(r'ppt/slides/slide\d+\.xml$', it.filename):
            # pemilik 2 Nov: catatan kaki sumber FIRMS dihapus beserta garis aksennya dan bintang di kepala kolom
            x = b.decode('utf-8')
            x = ''.join('' if ('Data berdasarkan Geographic' in s or '<a:off x="548640" y="6199632"/><a:ext cx="45720" cy="219456"/>' in s) else s
                        for s in re.split(r'(<p:sp>.*?</p:sp>)', x, flags=re.S))
            x = re.sub(r'<a:t>(HOTSPOT|FIRESPOT|LUAS TERBAKAR|BELUM PADAM)\*</a:t>', r'<a:t>\1</a:t>', x)
            b = x.encode('utf-8')
        zo.writestr(it, b)
SG = 'GIS BNPB, satelit NASA FIRMS (VIIRS dan MODIS), 9 Nov 2026 18.00 WIB; luas terbakar hari utuh 8 Nov'
bagian = [{'judul': 'Situasi Hotspot dan Firespot', 'label': 'Situasi', 'halaman_tetap': [1, 2]}]
susun = [{'halaman': 1, 'bagian': 1, 'sumber': SG},
         {'halaman': 2, 'bagian': 1, 'sumber': 'GIS BNPB, NASA FIRMS 9 Nov 18.00 WIB; luas terbakar hari utuh 8 Nov; PM2,5 CAMS 8 Nov; hujan model Open-Meteo, kelas BMKG'}]
if ADA_OPERASI:
    bagian.append({'judul': 'Operasi Penanganan', 'label': 'Operasi', 'halaman_tetap': [3]})
    susun.append({'halaman': 3, 'bagian': 2, 'sumber': 'Laporan Penanganan Karhutla Satgas, 9 Nov 2026 (kegiatan 8 Nov 2026)'})
lewat_deck.bingkai(nama, 'penanganan', 'Laporan Penanganan Pengendalian Karhutla', 'Cut-off data 9 Nov 2026, 18.00 WIB', T, pdf=False,
    tanpa_kepada='sama dengan laporan harian 2 Nov 2026 (pola tetap 3-5 Nov): laporan dipresentasikan Kepala BNPB sendiri',
    bagian=bagian, spek_tambah={'panel_sisi': 'gelap', 'skala_logo_bnpb': 1.0}, susun=susun)

print('mesin ok', nama)
print('folder', lewat_deck.serah_revisi(nama, pdf.ke_pdf(nama)))   # pemilik 9 Nov: Revisi N/<nama>.pptx dan .pdf
