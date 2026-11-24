"""Bangun Excel landasan formulir pelaporan bencana dari isian.json.

  py data/kajian-bnpb/standar-data-bencana/04-landasan-formulir/buat_excel.py
Keluaran: data/kajian-bnpb/standar-data-bencana/keluaran/04 Landasan Formulir Pelaporan/Landasan Formulir Pelaporan Bencana <ddmmyy>.xlsx
"""
import datetime
import json
import os

from openpyxl import Workbook
from openpyxl.drawing.image import Image as XLImage
from openpyxl.formatting.rule import ColorScaleRule
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.utils import get_column_letter as kol

DI = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(DI, '../../../..'))
H = json.load(open(os.path.join(DI, 'isian.json'), encoding='utf-8'))
PANDUAN = json.load(open(os.path.join(REPO, 'scripts/wa/panduan_resmi.json'), encoding='utf-8'))
JENIS = H['jenis']
KUNCI = [j[0] for j in JENIS]
NAMA = {j[0]: j[1] for j in JENIS}
KAT = H['katalog']

NAVY, ORANYE, BIRU_MUDA, ORANYE_MUDA, ABU = '051C2C', 'D9600B', 'DCEBF8', 'FBE7D6', 'F1F3F6'
F = 'Arial'
f_judul = Font(name=F, size=16, bold=True, color=NAVY)
f_sub = Font(name=F, size=10, color='2E3440')
f_kepala = Font(name=F, size=9, bold=True, color='FFFFFF')
f_isi = Font(name=F, size=9)
f_tebal = Font(name=F, size=9, bold=True, color=NAVY)
f_bagian = Font(name=F, size=11, bold=True, color=NAVY)
isi_kepala = PatternFill('solid', fgColor=NAVY)
isi_bagian = PatternFill('solid', fgColor=BIRU_MUDA)
isi_oranye = PatternFill('solid', fgColor=ORANYE_MUDA)
garis = Border(bottom=Side(style='thin', color='BFC5CC'))
bungkus = Alignment(wrap_text=True, vertical='top')
tengah = Alignment(horizontal='center', vertical='center', wrap_text=True)

wb = Workbook()


def kepala(ws, baris, teks, lebar=None):
    for i, t in enumerate(teks, 1):
        c = ws.cell(baris, i, t)
        c.font, c.fill, c.alignment = f_kepala, isi_kepala, tengah
    ws.row_dimensions[baris].height = 40
    if lebar:
        for i, w in enumerate(lebar, 1):
            ws.column_dimensions[kol(i)].width = w


def tulis(ws, baris, nilai, font=f_isi):
    for i, v in enumerate(nilai, 1):
        c = ws.cell(baris, i, v)
        c.font, c.alignment, c.border = font, bungkus, garis


def judul(ws, t, s):
    ws['A1'] = t
    ws['A1'].font = f_judul
    ws['A2'] = s
    ws['A2'].font = f_sub
    ws['A2'].alignment = Alignment(wrap_text=False)


# ---------------------------------------------------------------- Data hitungan (dasar semua persen)
wd = wb.active
wd.title = 'Data hitungan'
judul(wd, 'Data hitungan', 'Jumlah kejadian yang pernah menulis setiap isian. Lembar lain menghitung persen dari angka di lembar ini.')
r = 4
REF_N = {}      # (sumber, jenis) -> sel jumlah kejadian
REF_ADA = {}    # (sumber, isian, jenis) -> sel jumlah
kepala(wd, r, ['Sumber', 'Ukuran'] + [NAMA[j] for j in KUNCI], [12, 44] + [11] * len(KUNCI))
r += 1
for src in ('laphar', 'logbook'):
    s = H['sumber'][src]
    tulis(wd, r, [src, 'Jumlah kejadian'] + [s['n_kejadian'][j] for j in KUNCI], f_tebal)
    for i, j in enumerate(KUNCI):
        REF_N[(src, j)] = f"'Data hitungan'!${kol(3 + i)}${r}"
    r += 1
    tulis(wd, r, [src, 'Jumlah entri harian'] + [s['n_entri'][j] for j in KUNCI])
    r += 1
r += 1
for src in ('laphar', 'logbook'):
    wd.cell(r, 1, f'Isian yang ditulis, {src} (jumlah kejadian)').font = f_bagian
    r += 1
    kepala(wd, r, ['Kelompok', 'Isian'] + [NAMA[j] for j in KUNCI])
    r += 1
    for kel, isian, _ in KAT:
        tulis(wd, r, [kel, isian] + [H['sumber'][src]['ada'][j].get(isian, 0) for j in KUNCI])
        for i, j in enumerate(KUNCI):
            REF_ADA[(src, isian, j)] = f"'Data hitungan'!${kol(3 + i)}${r}"
        r += 1
    r += 1
REF_MEDAN = {}
for src in ('laphar', 'logbook'):
    wd.cell(r, 1, f'Medan laporan yang terisi, {src} (jumlah entri harian)').font = f_bagian
    r += 1
    kepala(wd, r, ['Kunci', 'Medan'] + [NAMA[j] for j in KUNCI])
    r += 1
    for m, label in H['medan'][src]['daftar']:
        tulis(wd, r, [m, label] + [H['medan'][src]['isi'][j].get(m, 0) for j in KUNCI])
        for i, j in enumerate(KUNCI):
            REF_MEDAN[(src, m, j)] = f"'Data hitungan'!${kol(3 + i)}${r}"
        r += 1
    r += 1
for i, j in enumerate(KUNCI):   # baris jumlah entri untuk persen medan
    pass
REF_ENTRI = {}
for src_i, src in enumerate(('laphar', 'logbook')):
    for i, j in enumerate(KUNCI):
        REF_ENTRI[(src, j)] = f"'Data hitungan'!${kol(3 + i)}${6 + src_i * 2}"
wd.freeze_panes = 'C5'

# ---------------------------------------------------------------- Petunjuk
wp = wb.create_sheet('Petunjuk', 0)
wp.sheet_view.showGridLines = False
wp.column_dimensions['A'].width = 3
wp.column_dimensions['B'].width = 30
wp.column_dimensions['C'].width = 110
for p, sel, tinggi in ((os.path.join(REPO, 'data/laporan-bnpb/generator/sampul/media/kris-logo.png'), 'B1', 28),
                       (os.path.expanduser('~/.claude/skills/ppt-konsultan/bnpb/assets/proyek-bnpb/logo/sumber-bnpb.png'), 'C1', 44)):
    if os.path.exists(p):
        im = XLImage(p)
        im.width, im.height = int(im.width * tinggi / im.height), tinggi
        if sel == 'C1':
            im.anchor = 'D1'
        else:
            im.anchor = sel
        wp.add_image(im)
wp.row_dimensions[1].height = 40
wp['B3'] = 'Landasan Formulir Pelaporan Kejadian Bencana'
wp['B3'].font = Font(name=F, size=18, bold=True, color=NAVY)
wp['B4'] = 'Isian yang ditulis dalam logbook dan laporan harian Pusdalops/Dit. Koordalops BNPB 1 Januari 2025 sampai Oktober 2026, dipilah per jenis bencana'
wp['B4'].font = f_sub
n_lap = sum(H['sumber']['laphar']['n_kejadian'].values())
n_lb = sum(H['sumber']['logbook']['n_kejadian'].values())
baris = [
    ('Tujuan', 'Mengetahui isian apa saja yang selama ini ditulis petugas untuk setiap jenis bencana, sebagai landasan awal formulir pelaporan bencana yang baku.'),
    ('Sumber 1', f'Laporan harian (laphar) Pusdalops/Dit. Koordalops BNPB {H["periode"]["laphar"][0]} sampai {H["periode"]["laphar"][1]}, {H["periode"]["laphar"][2]} hari, {f"{n_lap:,}".replace(",", ".")} kejadian. Bagian A (kejadian bencana) yang sudah diurai mesin. Hari yang arsipnya hanya .docx belum ikut.'),
    ('Sumber 2', f'Logbook harian Pusdalops BNPB {H["periode"]["logbook"][0]} sampai {H["periode"]["logbook"][1]}, {H["periode"]["logbook"][2]} hari, {f"{n_lb:,}".replace(",", ".")} kejadian. Tabel 6 kolom: No, Waktu dan Jenis, Lokasi, Dampak, Keterangan, Sumber.'),
    ('Sumber 3', 'Draft Panduan Penyusunan Logbook (01/PO.02/07/2025), Laphar (02/PO.02/07/2025), dan Lapjol (03/PO.02/07/2025) Pusdalops BNPB, serta kolom Rekap Harian 2026.'),
    ('Satuan hitung', 'Kejadian, bukan baris harian. Satu isian dihitung ada apabila pernah ditulis pada salah satu laporan kejadian tersebut, baik laporan pertama maupun pengkinian.'),
    ('Cara membaca persen', 'Persen = jumlah kejadian yang pernah menulis isian itu dibagi jumlah kejadian jenis tersebut. Contoh: 85 persen pada Banjir, Tinggi muka air, berarti 85 dari 100 kejadian banjir menyebut tinggi air.'),
    ('Lembar', 'Struktur laporan: kerangka logbook, laphar, lapjol, rekap harian, dan ambang kejadian menonjol per jenis.\nMedan per jenis: medan laporan yang terisi untuk setiap jenis.\nIsian per jenis: matriks isian dampak dan ancaman dengan warna, makin oranye makin sering ditulis.\nRincian per jenis: daftar panjang yang bisa disaring, dengan contoh tulisan asli.\nUsulan formulir: rancangan isian formulir baku, umum dan khusus per jenis, berikut tipe, satuan, dan tahap wajibnya.\nData hitungan: angka dasar; semua persen di lembar lain adalah rumus dari lembar ini.'),
    ('Keterbatasan', 'Isian dibaca mesin dari teks bebas dengan pencocokan kata, sehingga persen adalah perkiraan. Sebuah kata dapat tertangkap walaupun konteksnya lain, misalnya kata "jalan" dalam kronologi. Jenis dengan sedikit kejadian (tsunami, gelombang pasang, gunung api, gagal teknologi, konflik sosial) memiliki persen yang mudah berubah. Pada 2025 sampai 2026 tidak ada laporan tsunami, sehingga isian tsunami diambil dari panduan dan standar BMKG.'),
    ('Privasi', 'Contoh tulisan hanya diambil dari laporan harian (laphar), bukan dari logbook yang bersifat internal, dan hanya dari baris yang memuat angka dan tidak memuat sapaan, nama dengan umur, nomor telepon, atau surel. Nama korban, pelapor, dan petugas piket tidak dimuat.'),
    ('Disusun', f'Tim Ahli dan Tim Sus IT BNPB, {datetime.date.today():%d-%m-%Y}. Pembangun: data/kajian-bnpb/standar-data-bencana/04-landasan-formulir/.'),
]
for i, (a, b) in enumerate(baris, 6):
    wp.cell(i, 2, a).font = f_tebal
    c = wp.cell(i, 3, b)
    c.font, c.alignment = Font(name=F, size=10), Alignment(wrap_text=True, vertical='top')
    wp.cell(i, 2).alignment = Alignment(vertical='top')
    wp.row_dimensions[i].height = 14 * sum(len(x) // 115 + 1 for x in b.split('\n')) + 4

# ---------------------------------------------------------------- Struktur laporan
ws = wb.create_sheet('Struktur laporan', 1)
judul(ws, 'Struktur laporan Pusdalops yang berlaku', 'Kerangka logbook, laphar, lapjol, dan rekap harian menurut panduan 2025 dan berkas 2026')
r = 4
kepala(ws, r, ['Laporan', 'Bagian atau kolom', 'Isi', 'Keterangan'], [22, 40, 70, 40])
r += 1
STR = [
    ('Logbook harian', 'No', 'Nomor urut entri', 'Periode 07.00 WIB hari H-1 sampai 07.00 WIB hari H'),
    ('Logbook harian', 'Waktu dan jenis kejadian', 'Tanggal, jam, zona waktu, jenis bencana; penanda kejadian baru atau pengkinian', 'Format jam HH.MM, zona WIB/WITA/WIT'),
    ('Logbook harian', 'Lokasi', 'Provinsi, kabupaten/kota, kecamatan, desa; jumlah kecamatan dan desa', ''),
    ('Logbook harian', 'Dampak', 'Korban jiwa (MD, hilang, luka, terdampak, mengungsi dalam KK dan jiwa), kerugian materiil (rumah RB/RS/RR/terendam, fasilitas, lahan)', 'Teks bebas; label ditulis berbeda-beda antarpetugas'),
    ('Logbook harian', 'Keterangan', 'Kronologi, upaya, status SK, kondisi mutakhir, unsur terlibat, kebutuhan, kendala, peralatan', 'Teks bebas'),
    ('Logbook harian', 'Sumber', 'Instansi pelapor dan kontak', 'Nomor kontak tidak dimuat di sini'),
]
for m, label in H['medan']['laphar']['daftar']:
    STR.append(('Laphar bagian A', label, f'Medan bertanda ➢ dengan kunci {m}', 'Ejaan label berubah-ubah antarpetugas'))
STR += [('Laphar', 'Bagian I', 'Rekapitulasi status keadaan darurat per daerah per jenis kejadian', 'Siaga, tanggap, atau transisi; tanggal surat; SK posko'),
        ('Laphar', 'Bagian J dan K', 'Aktivitas gunung api (PVMBG); meteorologi dan klimatologi (BMKG)', 'Disalin dari lembaga sumber')]
for b in PANDUAN['lapjol_isi_kejadian']['bagian']:
    STR.append(('Lapjol (kejadian menonjol)', b, '', 'Jenis laporan: kejadian baru atau pengkinian kejadian'))
for k in PANDUAN['rekap_harian_kolom']['kolom']:
    STR.append(('Rekap Harian 2026 (xlsx)', k, '', ''))
for row in STR:
    tulis(ws, r, list(row))
    r += 1
r += 1
ws.cell(r, 1, 'Ambang kejadian menonjol per jenis (Panduan Lapjol 2025, salah satu terpenuhi)').font = f_bagian
r += 1
kepala(ws, r, ['Kode', 'Jenis', 'Ambang menonjol', 'Nama kejadian yang dipakai'])
r += 1
for j in PANDUAN['jenis']:
    mn = j.get('menonjol')
    if mn:
        bag = []
        if mn.get('kk'): bag.append(f"{mn['kk']} KK atau {mn.get('orang')} orang terdampak atau mengungsi")
        if mn.get('korban'): bag.append('ada korban meninggal' + (' atau hilang' if mn['korban'] == 'md_hilang' else ''))
        if mn.get('rumah_rusak'): bag.append(f"{mn['rumah_rusak']} rumah rusak")
        if mn.get('ha'): bag.append(f"{mn['ha']} ha lahan")
        if mn.get('ada_dampak'): bag.append('ada dampak pada manusia atau kerusakan')
        teks = '; '.join(bag)
    else:
        teks = 'Tidak ada ambang dalam panduan'
    tulis(ws, r, [j['kode'], j['nama'], teks, ', '.join(j.get('nama_kejadian', []))])
    r += 1
ws.freeze_panes = 'A5'

# ---------------------------------------------------------------- Medan per jenis
wm = wb.create_sheet('Medan per jenis', 2)
judul(wm, 'Medan laporan yang terisi per jenis bencana', 'Persen entri harian yang mengisi medan tersebut. Rumus dari lembar Data hitungan.')
r = 4
for src in ('laphar', 'logbook'):
    wm.cell(r, 1, 'Laporan harian (laphar)' if src == 'laphar' else 'Logbook harian').font = f_bagian
    r += 1
    kepala(wm, r, ['Medan'] + [NAMA[j] for j in KUNCI], [40] + [12] * len(KUNCI))
    r += 1
    awal = r
    for m, label in H['medan'][src]['daftar']:
        wm.cell(r, 1, label).font = f_isi
        for i, j in enumerate(KUNCI):
            c = wm.cell(r, 2 + i, f'=IFERROR({REF_MEDAN[(src, m, j)]}/{REF_ENTRI[(src, j)]},"")')
            c.number_format, c.font, c.alignment = '0%', f_isi, tengah
        r += 1
    wm.conditional_formatting.add(f'B{awal}:{kol(1 + len(KUNCI))}{r - 1}', ColorScaleRule(start_type='num', start_value=0, start_color='FFFFFF', end_type='num', end_value=1, end_color='F2A66B'))
    r += 2
wm.freeze_panes = 'B4'

# ---------------------------------------------------------------- Isian per jenis (matriks)
wi = wb.create_sheet('Isian per jenis', 3)
judul(wi, 'Isian yang ditulis per jenis bencana', 'Persen kejadian yang pernah menulis isian itu; angka terbesar dari laphar dan logbook. Makin oranye makin sering ditulis.')
r = 4
kepala(wi, r, ['Kelompok', 'Isian', 'Satuan lazim'] + [NAMA[j] for j in KUNCI], [16, 42, 16] + [11] * len(KUNCI))
r += 1
REF_GAB = {}
awal = r
for kel, isian, sat in KAT:
    tulis(wi, r, [kel, isian, sat])
    for i, j in enumerate(KUNCI):
        a = f'IFERROR({REF_ADA[("laphar", isian, j)]}/{REF_N[("laphar", j)]},0)'
        b = f'IFERROR({REF_ADA[("logbook", isian, j)]}/{REF_N[("logbook", j)]},0)'
        c = wi.cell(r, 4 + i, f'=MAX({a},{b})')
        c.number_format, c.font, c.alignment, c.border = '0%', f_isi, tengah, garis
        REF_GAB[(isian, j)] = f"'Isian per jenis'!${kol(4 + i)}${r}"
    r += 1
wi.conditional_formatting.add(f'D{awal}:{kol(3 + len(KUNCI))}{r - 1}', ColorScaleRule(start_type='num', start_value=0, start_color='FFFFFF', end_type='num', end_value=1, end_color='F2A66B'))
wi.freeze_panes = 'D5'
wi.auto_filter.ref = f'A4:{kol(3 + len(KUNCI))}{r - 1}'

# ---------------------------------------------------------------- Rincian per jenis
wr = wb.create_sheet('Rincian per jenis', 4)
judul(wr, 'Rincian isian per jenis bencana', 'Satu baris per jenis dan isian yang pernah ditulis. Saring kolom Jenis untuk melihat satu bencana.')
r = 4
kepala(wr, r, ['Kode', 'Jenis', 'Kelompok', 'Isian', 'Satuan lazim', '% kejadian (laphar)', '% kejadian (logbook)', 'Contoh tulisan dalam laporan'], [7, 26, 16, 40, 14, 12, 12, 80])
r += 1
kode = {j[0]: j[2] for j in JENIS}
for j in KUNCI:
    def nilai(isian):
        v = []
        for src in ('laphar', 'logbook'):
            n = H['sumber'][src]['n_kejadian'][j]
            v.append(H['sumber'][src]['ada'][j].get(isian, 0) / n if n else 0)
        return max(v)
    for kel, isian, sat in sorted(KAT, key=lambda k: -nilai(k[1])):
        if nilai(isian) <= 0:
            continue
        cth = H['sumber']['laphar']['contoh'][j].get(isian) or ''   # contoh hanya dari laphar; logbook internal
        tulis(wr, r, [kode[j], NAMA[j], kel, isian, sat, f'=IFERROR({REF_ADA[("laphar", isian, j)]}/{REF_N[("laphar", j)]},"")',
                      f'=IFERROR({REF_ADA[("logbook", isian, j)]}/{REF_N[("logbook", j)]},"")', cth])
        for c in (6, 7):
            wr.cell(r, c).number_format = '0%'
            wr.cell(r, c).alignment = tengah
        r += 1
wr.auto_filter.ref = f'A4:H{r - 1}'
wr.freeze_panes = 'A5'
wr.conditional_formatting.add(f'F5:G{r - 1}', ColorScaleRule(start_type='num', start_value=0, start_color='FFFFFF', end_type='num', end_value=1, end_color='F2A66B'))

# ---------------------------------------------------------------- Usulan formulir
wu = wb.create_sheet('Usulan formulir', 5)
judul(wu, 'Usulan isian formulir pelaporan kejadian bencana', 'Bagian umum berlaku untuk semua jenis; bagian khusus hanya untuk jenisnya. Kolom % menunjukkan seberapa sering isian itu sudah ditulis pada 2026.')
r = 4
kepala(wu, r, ['Bagian', 'Jenis', 'Kelompok', 'Nama isian', 'Tipe isian', 'Satuan atau pilihan', 'Wajib pada tahap', '% sudah ditulis', 'Dasar'], [10, 22, 16, 36, 12, 40, 16, 12, 44])
r += 1
TAHAP = {1: '1. Laporan awal', 2: '2. Rapid assessment', 3: '3. Pemutakhiran', 4: '4. Penutupan'}
UMUM = [
    ('Identitas', 'Nomor kejadian', 'Otomatis', 'diberikan sistem pada laporan pertama', 1, None, 'Perban BNPB 1/2023 Pasal 8: nomor induk tiap kejadian'),
    ('Identitas', 'Kode Identitas Bencana (KIB)', 'Otomatis', '16 digit: provinsi, kab/kota, kode bencana, tanggal, indeks', 2, None, 'Juklak 7/2023; Panduan Logbook 2025'),
    ('Identitas', 'Jenis bencana', 'Pilihan', 'kode 101 sampai 109, 201 sampai 203, 301', 1, None, 'Juklak 7/2023'),
    ('Identitas', 'Nama kejadian', 'Pilihan', 'daftar nama kejadian per jenis (lembar Struktur laporan)', 1, None, 'Panduan Logbook 2025'),
    ('Identitas', 'Kejadian baru atau pengkinian', 'Pilihan', 'kejadian baru; pengkinian', 1, None, 'Panduan Lapjol 2025'),
    ('Identitas', 'Kejadian pemicu', 'Teks', 'nomor kejadian pemicu bila berantai', 2, None, 'Kajian penentuan kejadian'),
    ('Waktu', 'Waktu kejadian', 'Tanggal dan jam', 'TTTT-BB-HH JJ.MM', 1, None, 'Panduan Logbook 2025'),
    ('Waktu', 'Zona waktu', 'Pilihan', 'WIB; WITA; WIT', 1, None, 'Panduan Logbook 2025'),
    ('Waktu', 'Waktu pengkinian', 'Tanggal dan jam', 'TTTT-BB-HH JJ.MM', 3, None, 'Medan Update laphar'),
    ('Lokasi', 'Provinsi, kab/kota, kecamatan, desa', 'Pilihan', 'kode wilayah Kemendagri; boleh lebih dari satu desa', 1, None, 'Kolom Lokasi logbook'),
    ('Lokasi', 'Koordinat', 'Angka', 'lintang dan bujur desimal', 2, None, 'Juklak 7/2023 Lampiran I'),
    ('Kronologi', 'Kronologi singkat', 'Teks', 'paling banyak 500 karakter', 1, None, 'Medan Kronologi laphar'),
    ('Korban', 'Meninggal', 'Angka', 'orang', 1, 'Meninggal', 'Panduan Logbook 2025 G.3'),
    ('Korban', 'Hilang', 'Angka', 'orang', 1, 'Hilang', 'Panduan Logbook 2025 G.3'),
    ('Korban', 'Luka berat, sedang, ringan', 'Angka', 'orang', 2, 'Luka-luka', 'Rekap Harian 2026 (LB/LS/LR)'),
    ('Korban', 'Terdampak', 'Angka', 'KK dan jiwa', 1, 'Terdampak (KK)', 'Panduan Logbook 2025 G.3'),
    ('Korban', 'Mengungsi', 'Angka', 'KK dan jiwa', 1, 'Mengungsi', 'Panduan Logbook 2025 G.3'),
    ('Korban', 'Terancam', 'Angka', 'KK, jiwa, rumah', 2, 'Terancam', 'Panduan Logbook 2025 G.3.d'),
    ('Korban', 'Kelompok rentan', 'Angka', 'balita, lansia, ibu hamil, disabilitas', 2, 'Kelompok rentan (balita, lansia, ibu hamil, disabilitas)', 'Juklak 9/2023'),
    ('Rumah', 'Rumah rusak berat, rusak sedang, tidak dapat dihuni sementara, rusak ringan', 'Angka', 'unit per tingkat; satu rumah satu tingkat, diperiksa dari rusak berat', 1, 'Rumah rusak berat', 'Juklak 7/2023; Rancangan Juklak Bab I huruf D; Rekap Harian 2026'),
    ('Rumah', 'Rumah terendam', 'Angka', 'unit; tergenang tanpa kerusakan dan masih dapat dihuni', 1, 'Rumah terendam', 'Panduan Logbook 2025 G.3; Rancangan Juklak Bab I huruf D'),
    ('Fasilitas', 'Satuan pendidikan, rumah ibadah, fasilitas kesehatan, kantor, pasar', 'Angka', 'unit per tingkat kerusakan', 2, 'Satuan pendidikan (sekolah)', 'Juklak 7/2023 Lampiran II'),
    ('Prasarana', 'Jalan', 'Angka dan pilihan', 'kilometer; status terputus, terbatas, normal', 2, 'Jalan', 'Rekap Harian 2026; Rancangan Juklak Lampiran I'),
    ('Prasarana', 'Jembatan', 'Angka dan pilihan', 'unit per tingkat kerusakan; dapat dilalui atau tidak; dihitung dalam kriteria c', 1, 'Jembatan', 'Rekap Harian 2026; Rancangan Juklak Bab II huruf C'),
    ('Layanan dasar', 'Listrik, air bersih, telekomunikasi', 'Pilihan', 'terputus; sebagian; normal', 2, 'Listrik', 'PP 21/2008 Pasal 22'),
    ('Lahan dan ekonomi', 'Sawah terendam dan puso, kebun, tambak, ternak', 'Angka', 'ha; ekor', 2, 'Sawah', 'Juklak 7/2023; Rekap Harian 2026'),
    ('Lahan dan ekonomi', 'Taksiran kerusakan dan kerugian', 'Angka', 'Rp, dua angka terpisah', 4, 'Taksiran kerugian (rupiah)', 'Perka BNPB 15/2011'),
    ('Penanganan', 'Status keadaan darurat', 'Pilihan dan teks', 'siaga; tanggap; transisi; nomor SK dan TMT', 1, 'Status keadaan darurat (SK)', 'Panduan Logbook 2025 G.4'),
    ('Penanganan', 'Upaya penanganan', 'Teks', '', 1, None, 'Medan Upaya laphar'),
    ('Penanganan', 'Unsur yang terlibat', 'Pilihan ganda', 'BPBD, TNI, Polri, Basarnas, relawan, dan lainnya', 2, 'Personel dan unsur yang terlibat', 'Medan Unsur yang terlibat laphar'),
    ('Penanganan', 'Pendampingan BNPB', 'Pilihan', 'telah; direncanakan; tidak ada', 2, None, 'Panduan Lapjol 2025'),
    ('Kebutuhan', 'Kebutuhan mendesak', 'Pilihan ganda', 'pangan, air bersih, hunian, kesehatan, sanitasi, alat berat, dan lainnya', 2, 'Kebutuhan mendesak', 'Medan Kebutuhan laphar'),
    ('Kebutuhan', 'Kendala', 'Teks', '', 2, 'Kendala lapangan', 'Medan Kendala laphar'),
    ('Kondisi', 'Kondisi mutakhir', 'Teks', '', 3, None, 'Medan Kondisi Mutakhir laphar'),
    ('Mutu data', 'Sumber dan jabatan pelapor', 'Teks', 'instansi dan jabatan, tanpa nomor pribadi', 1, None, 'Kolom Sumber logbook'),
    ('Mutu data', 'Dokumentasi', 'Berkas', 'foto bergeotag', 2, None, 'Medan Dokumentasi laphar'),
]
KHUSUS = {
    'banjir': [('Jenis banjir', 'Pilihan', 'luapan sungai; genangan; banjir bandang; tanggul jebol; drainase', None),
               ('Tinggi muka air atau genangan', 'Angka', 'cm per desa, terendah dan tertinggi', 'Tinggi muka air atau genangan'),
               ('Debit atau status pos duga air', 'Pilihan', 'normal; siaga; awas', 'Debit atau status sungai, pintu air'),
               ('Hujan pemicu', 'Pilihan', 'ringan; sedang; lebat; sangat lebat; ekstrem', 'Curah hujan atau intensitas hujan'),
               ('Lama genangan', 'Angka', 'jam atau hari', None),
               ('Tanggul atau talud jebol', 'Angka', 'meter, lokasi', 'Tanggul, talud, irigasi'),
               ('Pompa yang dioperasikan', 'Angka', 'unit', 'Pompa air')],
    'longsor': [('Jumlah titik longsor', 'Angka', 'titik', None),
                ('Dimensi longsoran', 'Angka', 'panjang, lebar, tinggi (m); volume (m³)', 'Dimensi (panjang, lebar, tinggi, volume)'),
                ('Material dan gerakan tanah', 'Pilihan', 'tanah; batuan; bahan rombakan; masih bergerak atau tidak', 'Material atau tanah bergerak, retakan'),
                ('Pemicu', 'Pilihan', 'hujan; gempa; aktivitas manusia', 'Curah hujan atau intensitas hujan'),
                ('Akses jalan tertutup material', 'Angka', 'meter, titik', 'Jalan'),
                ('Alat berat yang dikerahkan', 'Angka', 'unit', 'Alat berat')],
    'gelombang_pasang': [('Jenis', 'Pilihan', 'gelombang tinggi; rob; abrasi', 'Pasang atau rob, abrasi garis pantai'),
                         ('Tinggi gelombang', 'Angka', 'meter dan kategori BMKG', 'Tinggi gelombang'),
                         ('Perahu dan kapal rusak', 'Angka', 'unit', 'Perahu, kapal'),
                         ('Panjang pantai tergerus', 'Angka', 'meter', None),
                         ('Tambak terdampak', 'Angka', 'ha', 'Tambak, kolam')],
    'cuaca': [('Jenis cuaca', 'Pilihan', 'puting beliung; angin kencang; hujan es; hujan lebat; suhu ekstrem', None),
              ('Atap rusak', 'Angka', 'unit', 'Atap rusak atau terbang'),
              ('Pohon tumbang', 'Angka', 'batang, titik', 'Pohon tumbang'),
              ('Tiang listrik atau telekomunikasi roboh', 'Angka', 'unit', 'Listrik'),
              ('Kecepatan angin terukur', 'Angka', 'km/jam atau knot', 'Kecepatan angin'),
              ('Lintasan puting beliung', 'Angka', 'panjang dan lebar (m)', None)],
    'kekeringan': [('Desa krisis air bersih', 'Angka', 'desa', 'Krisis air bersih dan distribusi air'),
                   ('Penduduk krisis air bersih', 'Angka', 'KK dan jiwa', 'Krisis air bersih dan distribusi air'),
                   ('Distribusi air bersih', 'Angka', 'liter, tangki, frekuensi', 'Krisis air bersih dan distribusi air'),
                   ('Hari tanpa hujan', 'Angka', 'hari, tingkat peringatan dini BMKG (Waspada, Siaga, Awas)', 'Hari tanpa hujan, kemarau'),
                   ('Penduduk kesulitan air minum dan lamanya', 'Angka', 'jiwa dan hari; kurang dari 20 liter per orang per hari atau mengambil air jauh lebih jauh', None),
                   ('Sawah terancam dan puso', 'Angka', 'ha', 'Puso (gagal panen)'),
                   ('Luas tanam tanaman pangan musim ini', 'Angka', 'ha', None),
                   ('Sumber air kering', 'Angka', 'sumur, mata air, embung', 'Air bersih')],
    'karhutla': [('Hotspot', 'Otomatis', 'jumlah titik, satelit, confidence', 'Hotspot atau titik api'),
                 ('Luas terbakar', 'Angka', 'ha per tutupan: hutan dan lahan, atau savana, semak, dan padang rumput; sumber lapangan atau citra', 'Luas terbakar'),
                 ('Jenis lahan', 'Pilihan', 'gambut; mineral; semak belukar; kebun; hutan', 'Jenis lahan atau gambut'),
                 ('Status api', 'Pilihan', 'aktif; dikendalikan; pendinginan; padam', 'Status api (padam, dikendalikan, aktif)'),
                 ('Kualitas udara dan jarak pandang', 'Angka', 'ISPU, PM2,5 (µg/m³), jarak pandang (m)', 'Asap, kualitas udara, jarak pandang'),
                 ('Operasi udara', 'Angka', 'helikopter, sorti bom air, OMC', 'Operasi udara (bom air, patroli udara, OMC)'),
                 ('Personel satgas darat', 'Angka', 'orang per unsur', 'Personel dan unsur yang terlibat'),
                 ('Gangguan kesehatan', 'Angka', 'kasus ISPA', 'Gangguan kesehatan (ISPA, diare)')],
    'gempabumi': [('Magnitudo', 'Otomatis', 'M, sumber BMKG', 'Magnitudo'),
                  ('Kedalaman dan pusat gempa', 'Otomatis', 'km; lintang dan bujur', 'Kedalaman dan pusat gempa'),
                  ('Intensitas guncangan per desa', 'Pilihan', 'MMI atau SIG-BMKG', 'Intensitas guncangan (MMI) atau dirasakan'),
                  ('Gempa susulan', 'Angka', 'kali, magnitudo terbesar', 'Gempa susulan'),
                  ('Kerusakan menurut jenis bangunan', 'Angka', 'unit per jenis struktur', None),
                  ('Ancaman terpicu', 'Pilihan ganda', 'likuefaksi; longsor; retakan tanah; tsunami', 'Material atau tanah bergerak, retakan')],
    'tsunami': [('Peristiwa pemicu', 'Pilihan', 'gempa (nomor kejadian); longsor bawah laut; erupsi', None),
                ('Peringatan InaTEWS', 'Otomatis', 'Awas; Siaga; Waspada; waktu terbit dan berakhir', None),
                ('Waktu tiba gelombang', 'Tanggal dan jam', 'JJ.MM', None),
                ('Tinggi run-up', 'Angka', 'meter', None),
                ('Jarak genangan dari pantai', 'Angka', 'meter', None),
                ('Perahu dan kapal rusak', 'Angka', 'unit', 'Perahu, kapal')],
    'gunungapi': [('Level aktivitas', 'Otomatis', 'Level I sampai IV', 'Level atau status gunung api'),
                  ('Radius bahaya', 'Angka', 'km dan sektor', 'Awan panas, lahar, radius bahaya'),
                  ('Kolom abu dan hujan abu', 'Angka', 'tinggi (m); tebal abu per desa (mm)', 'Kolom abu, hujan abu'),
                  ('Awan panas dan lahar', 'Angka', 'jarak luncur (km); sungai terdampak', 'Awan panas, lahar, radius bahaya'),
                  ('Kode VONA', 'Pilihan', 'hijau; kuning; oranye; merah', None)],
    'kebakaran_permukiman': [('Penyebab', 'Pilihan', 'korsleting listrik; kompor atau tabung gas; lainnya', 'Penyebab kebakaran atau ledakan'),
                             ('Rumah dan bangunan terbakar', 'Angka', 'unit', 'Rumah terbakar'),
                             ('Unit pemadam', 'Angka', 'unit dan instansi', 'Personel dan unsur yang terlibat')],
}
for kel, isian, tipe, sat, tahap, ref, dasar in UMUM:
    pct = f"=MAX({','.join(REF_GAB[(ref, j)] for j in KUNCI[:9])})" if ref else ''
    tulis(wu, r, ['Umum', 'Semua jenis', kel, isian, tipe, sat, TAHAP[tahap], pct, dasar])
    wu.cell(r, 8).number_format = '0%'
    r += 1
for j in [k for k in KUNCI if k in KHUSUS]:
    wu.cell(r, 1, f'Khusus: {NAMA[j]}').font = f_bagian
    for c in range(1, 10):
        wu.cell(r, c).fill = isi_bagian
    r += 1
    for isian, tipe, sat, ref in KHUSUS[j]:
        tahap = 1 if tipe == 'Otomatis' else 2
        pct = f'={REF_GAB[(ref, j)]}' if ref else ''
        dasar = 'Sudah ditulis dalam laphar atau logbook 2025 sampai 2026' if ref else 'Belum ditulis; usulan dari standar lembaga pemantau dan literatur'
        if j == 'tsunami':
            dasar = 'Tidak ada laporan tsunami 2025 sampai 2026; usulan dari standar BMKG dan literatur'
        tulis(wu, r, ['Khusus', NAMA[j], 'Data khusus', isian, tipe, sat, TAHAP[tahap], pct, dasar])
        wu.cell(r, 8).number_format = '0%'
        if not ref:
            for c in range(1, 10):
                wu.cell(r, c).fill = isi_oranye
        r += 1
for rr in range(5, r):
    wu.cell(rr, 8).alignment = tengah
r += 1
wu.cell(r, 1, 'Keterangan: baris oranye adalah isian yang belum pernah ditulis dalam laporan 2025 sampai 2026 dan diusulkan berdasarkan standar lembaga pemantau atau literatur. Tipe Otomatis berarti isian ditarik dari sumber resmi (BMKG, PVMBG, sistem hotspot) lalu diperiksa petugas.').font = Font(name=F, size=9, italic=True)
wu.freeze_panes = 'A5'
wu.auto_filter.ref = f'A4:I{r - 2}'

for w in wb.worksheets:
    w.sheet_properties.tabColor = NAVY if w.title in ('Petunjuk', 'Usulan formulir') else ORANYE if w.title == 'Isian per jenis' else 'BFC5CC'
wb.active = 0
kel = os.path.join(DI, '..', 'keluaran', '04 Landasan Formulir Pelaporan', f'Landasan Formulir Pelaporan Bencana {datetime.date.today():%d%m%y}.xlsx')
os.makedirs(os.path.dirname(kel), exist_ok=True)
wb.save(kel)
print(os.path.abspath(kel))
