"""Bingkai Laporan Penanganan Pengendalian Karhutla 111126 lewat mesin ppt-konsultan (deck.py, format 'penanganan'), pola sama dengan 081126
tanpa halaman perusahaan (halaman itu hanya untuk deck 081126). Slide Operasi hanya ada bila wa-satgas.txt ada.

    PYTHONUTF8=1 DECK_BNPB=~/.claude/skills/ppt-konsultan/bnpb python bingkai.py   (sesudah jalan.py)
"""
import datetime as dt, os, re, shutil, sys, zipfile
S = os.path.dirname(os.path.abspath(__file__)); G = os.path.normpath(os.path.join(S, '..', '..', '..', 'generator')); sys.path.insert(0, G); sys.path.insert(0, S)
import lewat_deck, pdf
T = dt.date(2026, 11, 11)
nama = os.path.join(S, 'Laporan Penanganan Pengendalian Karhutla 111126.pptx')
gen = os.path.join(S, 'Laporan Penanganan Pengendalian Karhutla 111126 (generator).pptx')
ADA_OPERASI = os.path.exists(os.path.join(S, 'wa-satgas.txt'))


def tanpa_kartu_personel(x):
    """Pemilik 10 Nov 2026: slide 3 tanpa kartu PENANGANAN dan PERSONEL PER PROVINSI. Personel keluar dari subjudul; dua panel di bawahnya
    direntang ke ruang bekas kartu dengan titik tengah tiap bentuk dipetakan linear, jadi bentuk yang sejajar tetap sejajar."""
    ATAS, PANEL, TINGGI, BAKU = 1325880, 2212848, 4142232, 6446520
    k = (PANEL + TINGGI - ATAS) / TINGGI
    # panel OMC berisi sedikit baris: dua bagiannya dibuat sama tinggi dan baris tiap bagian ditaruh di tengah sisa ruangnya, supaya dasar panel tidak kosong
    KIRI = [tuple(map(int, g)) for g in re.findall(r'<a:off x="(\d+)" y="(\d+)"/>\s*<a:ext cx="(\d+)" cy="(\d+)"/>', x) if 600000 <= int(g[0]) < 6100000 and PANEL < int(g[1]) < BAKU and int(g[3]) != TINGGI]
    gb = sorted(g[1] for g in KIRI if g[0] == 676656 and g[2] == 5222596 and g[3] == 0)[1]
    pita = sorted({int(re.search(r'<a:off x="\d+" y="(\d+)"', q)[1]) for q in re.findall(r'<p:sp>(?:(?!</p:sp>).)*?<a:t>PROVINSI</a:t>(?:(?!</p:sp>).)*?</p:sp>', x, re.S)})
    lega = PANEL + TINGGI - 91440 - (max(g[1] + g[3] for g in KIRI) + ATAS - PANEL)
    kiri = lambda y: y + ATAS - PANEL + (lega // 2 if y >= gb else 0) + (lega // 4 if (pita[0] + 177800 <= y < gb or y >= pita[1] + 177800) else 0)
    def ubah(m):
        b = m.group(0); o = re.search(r'<a:off x="(-?\d+)" y="(-?\d+)"/>\s*<a:ext cx="(\d+)" cy="(\d+)"/>', b)
        if not o: return b
        x0, y, cx, cy = map(int, o.groups())
        if y == 905256:   # subjudul: dua run pertama = angka personel dan labelnya
            pp = r'(?:<a:pPr(?:(?!</a:pPr>).)*?</a:pPr>)?'   # generator mengulang pPr di antara run
            b = re.sub(rf'<a:r>(?:(?!</a:r>).)*?</a:r>{pp}<a:r>(?:(?!</a:r>).)*?<a:t>\s*personel darat,\s*</a:t></a:r>{pp}', '', b, count=1, flags=re.S)
            assert 'personel' not in b, 'subjudul slide 3 masih memuat personel'
            return re.sub(r'armada udara, dan OMC', 'armada udara dan OMC', b, count=1)
        if ATAS <= y < PANEL: return ''
        if y < PANEL or y >= BAKU: return b
        if cy == TINGGI: y1, cy1 = ATAS, TINGGI + PANEL - ATAS
        elif x0 < 6100000 and not os.environ.get('RAPAT'): y1, cy1 = kiri(y), cy   # RAPAT=1: baris panel OMC berjarak rapat, sisa ruang di bawah isi (versi kedua, pemilik 10 Nov)
        else: y1, cy1 = round(ATAS + (y + cy / 2 - PANEL) * k - cy / 2), cy
        return b.replace(o.group(0), f'<a:off x="{x0}" y="{y1}"/><a:ext cx="{cx}" cy="{cy1}"/>', 1)
    return re.sub(r'<p:(sp|pic|cxnSp)>.*?</p:\1>', ubah, x, flags=re.S)

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
            if it.filename == 'ppt/slides/slide3.xml' and ADA_OPERASI: x = tanpa_kartu_personel(x)
            b = x.encode('utf-8')
        zo.writestr(it, b)
SG = 'GIS BNPB, satelit NASA FIRMS (VIIRS dan MODIS), 11 Nov 2026 18.00 WIB; luas terbakar hari utuh 10 Nov'
bagian = [{'judul': 'Situasi Hotspot dan Firespot', 'label': 'Situasi', 'halaman_tetap': [1, 2]}]
susun = [{'halaman': 1, 'bagian': 1, 'sumber': SG},
         {'halaman': 2, 'bagian': 1, 'sumber': 'GIS BNPB, NASA FIRMS 11 Nov 18.00 WIB; luas terbakar hari utuh 10 Nov; PM2,5 CAMS 10 Nov; hujan model Open-Meteo, kelas BMKG'}]
if ADA_OPERASI:
    bagian.append({'judul': 'Operasi Penanganan', 'label': 'Operasi', 'halaman_tetap': [3]})
    susun.append({'halaman': 3, 'bagian': 2, 'sumber': 'Laporan Penanganan Karhutla Satgas, 11 Nov 2026 (kegiatan 10 Nov 2026)'})
lewat_deck.bingkai(nama, 'penanganan', 'Laporan Penanganan Pengendalian Karhutla', 'Cut-off data 11 Nov 2026, 18.00 WIB', T, pdf=False,
    tanpa_kepada='sama dengan laporan harian 2 Nov 2026 (pola tetap 3-5 Nov): laporan dipresentasikan Kepala BNPB sendiri',
    bagian=bagian, spek_tambah={'panel_sisi': 'gelap', 'skala_logo_bnpb': 1.0}, susun=susun)

print('mesin ok', nama)
if os.environ.get('UJI'):   # uji coba sebelum cut-off: tidak membuat folder Revisi
    print('uji', pdf.ke_pdf(nama)); sys.exit()
print('folder', lewat_deck.serah_revisi(nama, pdf.ke_pdf(nama)))   # pemilik 9 Nov: Revisi N/<nama>.pptx dan .pdf
