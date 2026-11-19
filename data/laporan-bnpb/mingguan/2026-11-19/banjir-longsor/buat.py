"""Paparan "Laporan Situasi dan Kondisi Wilayah Terdampak Banjir" 16 s.d. 19 Nov 2026 (dibuat 19 Nov 2026).

Mesin dan desain sama dengan minggu sebelumnya (../../2026-11-09/banjir-longsor/buat.py, diisi seperti ../../2026-11-16/banjir-longsor/buat.py).
Data = laphar Dit. Koordalops 16 s.d. 18 Nov 2026, dari teks WA laporan pagi 17 s.d. 19 Nov (harian/2026-11/2026-11-1[789]/wa-koordalops.txt;
WA 19 Nov ditempel pemilik, dipakai mulai Revisi 2). Laphar 19 Nov baru terbit pagi 20 Nov.
Kejadian minggu lalu yang tidak dilaporkan lagi pada 16-18 Nov (Pidie Jaya, Gayo Lues, Aceh Tenggara, Aceh Barat, Toba, Simalungun,
Pesisir Barat) tidak dimasukkan. Pemilik 19 Nov: "paparan banjir sepekan", jadi deck tanah longsor (Banyumas 16 Nov) tidak dibangun.
Probabilitas dan mitigasi dari data prakiraan sistem banjir (centurisk97.id/banjir/data, dibuat 19 Nov 2026 07.49 WIB, prakiraan 19-22 Nov),
disalin ke bahan/gis.

    python buat.py          # keluaran ke Revisi N di folder ini
"""
import importlib.util, os, sys
from datetime import date

SINI = os.path.dirname(os.path.abspath(__file__))
_sp = importlib.util.spec_from_file_location('banjir_longsor_mingguan', os.path.join(SINI, '..', '..', '2026-11-09', 'banjir-longsor', 'buat.py'))
M = importlib.util.module_from_spec(_sp); _sp.loader.exec_module(M)
M.SINI = M.B.SINI = SINI
os.makedirs(os.path.join(SINI, 'bahan', 'ikon'), exist_ok=True)
D = None

M.MINGGU = {'awal': date(2026, 11, 16), 'akhir': date(2026, 11, 19), 'paparan': date(2026, 11, 19),
            'nama': 'Paparan Situasi Banjir dan Longsor Sepekan 191126', 'impor_091': False, 'catatan_longsor': '',
            'catatan_sumber': 'laporan 19 Nov belum tersedia',
            'gis': os.path.join(SINI, 'bahan', 'gis')}

# langkah untuk kab/kota terdampak yang belum dilaporkan surut: dari laporan Koordalops 16-18 Nov
M.MITIGASI = {
    'Aceh Singkil': 'Pantau 10 desa yang belum surut di Kec. Singkil; pulihkan jembatan beton amblas dan 5 tiang listrik roboh',
    'Aceh Selatan': 'Layani 245 jiwa pengungsi; pantau genangan 5-40 cm di Cot Bayu',
    'Aceh Tamiang': 'Layani 679 jiwa pengungsi; perbaiki 2 tanggul jebol; pantau 25 gampong yang belum surut',
    'Seluma': 'Pantau 168 rumah tergenang; tangani 1 rumah terdampak abrasi',
    'Melawi': 'Tuntaskan pendataan pengungsi dan kerusakan',
    'Banyuwangi': 'Pantau 25 rumah tergenang 80-100 cm; siapkan evakuasi bila air naik',
}
M.PANTAU = []
M.KODE.update({'Riau': '14', 'Bengkulu': '17', 'Kalimantan Barat': '61', 'Nusa Tenggara Barat': '52'})

# (prov, kab, kecamatan, mulai, selesai|None, kk, jiwa, ungsi_kk, ungsi_jiwa, tinggi, kabar, kondisi_teks)
M.BANJIR = [
    ('Aceh', 'Aceh Singkil', 'Singkil, Simpang Kanan, Gunung Meriah, Kuta Baharu', '14 Nov', None, 3517, 13720, D, D, D, '18 Nov',
     'Kec. Singkil: 10 desa belum surut, 3 desa berangsur surut; kecamatan lain berangsur surut; 1 jembatan beton amblas, 5 tiang listrik roboh'),
    ('Aceh', 'Aceh Selatan', '', None, None, 254, 947, 66, 245, '5-40 cm', '18 Nov',
     'Lhok Raya dan Padang Harapan sudah surut total; Cot Bayu masih tergenang 5-40 cm, di rumah warga 5-20 cm'),
    # 18 Nov: angka direvisi turun dari 4.397 KK, 15.921 jiwa (17 Nov); 8 kecamatan terdampak, namanya belum disebut
    ('Aceh', 'Aceh Tamiang', '', '12 Nov', None, 2756, 9682, 219, 679, D, '18 Nov',
     '6 kecamatan (37 gampong) sudah surut, 2 kecamatan (25 gampong) belum surut; 1.968 rumah dan 706 ha sawah terendam; 2 tanggul jebol'),
    ('Aceh', 'Kota Subulussalam', 'Sultan Daulat, Rundeng', '13 Nov', '18 Nov', 2185, 9064, 4, 18, D, '18 Nov',
     'Air sudah surut dan keadaan kembali normal; Tanggap Darurat s.d. 19 Nov'),
    ('Sumatera Utara', 'Mandailing Natal', '', None, '18 Nov', 170, D, D, D, D, '18 Nov',
     'Banjir sudah surut; jalan raya Sumut-Sumbar kembali bisa dilalui; warga membersihkan rumah'),
    ('Riau', 'Rokan Hilir', '', '15 Nov', '17 Nov', 4403, 17612, D, D, D, '17 Nov', 'Air sudah surut; 5,5 km jalan terdampak'),
    ('Bengkulu', 'Seluma', '', '16 Nov', None, 168, D, D, D, D, '16 Nov', 'Banjir dan abrasi; air belum surut; 1 rumah terdampak abrasi'),
    ('Bengkulu', 'Kota Bengkulu', '', '17 Nov', '17 Nov', 2083, 7518, D, D, D, '18 Nov', 'Air sudah surut'),
    ('Kalimantan Barat', 'Sambas', '', '16 Nov', '16 Nov', 117, D, D, D, D, '16 Nov', 'Banjir sudah surut; 112 rumah terdampak'),
    ('Kalimantan Barat', 'Sekadau', '', '16 Nov', '16 Nov', 480, D, D, D, D, '16 Nov', 'Banjir sudah surut; 480 rumah terdampak'),
    ('Kalimantan Barat', 'Melawi', '', '16 Nov', None, 178, D, D, D, D, '16 Nov', 'Banjir berangsur surut; pengungsi dan kerusakan dalam pendataan'),
    ('Jawa Timur', 'Banyuwangi', '', '18 Nov', None, 25, D, D, D, '80-100 cm', '18 Nov', 'Air belum surut; 25 rumah terdampak'),
    ('Nusa Tenggara Barat', 'Kota Mataram', '', '18 Nov', '18 Nov', 83, 308, D, D, D, '18 Nov', 'Banjir sudah surut; 2 rumah rusak'),
]

M.LONGSOR = []   # deck banjir saja

# (prov, kab, jenis, masih, kk, jiwa, lokasi pengungsian dan asal, kabar terakhir)
M.UNGSI = [
    ('Aceh', 'Aceh Selatan', 'banjir', True, 66, 245, 'Lokasi belum disebut', '18 Nov'),
    ('Aceh', 'Aceh Tamiang', 'banjir', True, 219, 679, 'Lokasi belum disebut (15 Nov: hunian sementara BNPB)', '18 Nov'),
    ('Aceh', 'Kota Subulussalam', 'banjir', False, 4, 18, 'Lokasi belum disebut; 70 KK, 278 jiwa sudah kembali ke rumah (16 Nov)', '18 Nov'),
]

# L2: jiwa mengungsi per laphar 16, 17, 18 Nov (WA 17-19 Nov); Subulussalam 16 Nov = angka yang dilaporkan mengungsi
M.UNGSI_HARI = {'tanggal': ['16 Nov', '17 Nov', '18 Nov'],
                'kab': {'Aceh Selatan': [233, 245, 245], 'Aceh Tamiang': [1462, 1143, 679], 'Kota Subulussalam': [279, 18, 18]},
                'catatan': 'Subulussalam 16 Nov: 278 dari 279 jiwa sudah kembali ke rumah'}

# peta (pemilik 19 Nov, Revisi 4: "bikin multipeta"): tiga panel berskala sama, Sumatera, Kalimantan Barat, Jawa Timur dan NTB.
# Label diatur tangan (pt slide): Aceh dan Sumatera Utara di laut barat, Bengkulu di laut barat daya, panel kecil di ruang kosong panel.
M.PANEL_BANJIR = [('Sumatera', 43.2, 102, 252, 338, (95.9, 5.95), ['11', '12', '13', '14', '15', '16', '17', '18', '19', '21']),
                  ('Kalimantan Barat', 301.2, 102, 160, 166, (108.7, 2.3), ['61', '62', '63', '64', '65']),
                  ('Jawa Timur dan Nusa Tenggara Barat', 301.2, 274, 160, 166, (112.0, -6.0), ['33', '34', '35', '51', '52'])]
M.POS_BANJIR = {'Aceh Tamiang': (150, 112), 'Aceh Selatan': (150, 140), 'Kota Subulussalam': (130, 161), 'Aceh Singkil': (150, 182),
                'Rokan Hilir': (170, 203), 'Mandailing Natal': (149, 290),
                'Kota Bengkulu': (95, 384), 'Seluma': (130, 408),
                'Sambas': (355, 128), 'Sekadau': (306, 222), 'Melawi': (360, 242),
                'Banyuwangi': (306, 392), 'Kota Mataram': (330, 414)}

if __name__ == '__main__':
    M.main()
