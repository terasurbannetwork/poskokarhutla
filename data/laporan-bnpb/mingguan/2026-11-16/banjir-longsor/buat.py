"""Paparan "Laporan Situasi dan Kondisi Wilayah Terdampak Banjir dan Tanah Longsor" sepekan 9 s.d. 15 Nov 2026 (dibuat 16 Nov 2026).

Mesin dan desain sama dengan minggu sebelumnya (../../2026-11-09/banjir-longsor/buat.py); berkas ini hanya mengisi data minggunya.
Data = tanggal laphar Dit. Koordalops 9 s.d. 15 Nov 2026, dari teks WA laporan pagi 10 s.d. 16 Nov
(harian/2026-11/2026-11-*/wa-koordalops.txt). Laporan 15 Nov (laphar 14 Nov) tidak tersedia di repo.
Mulai, selesai, kabar terakhir = tanggal laphar. Kejadian yang hanya muncul sebagai pengkinian tanpa tanggal mulai: mulai = None ('–').
Bagian Probabilitas banjir dan Mitigasi tidak ada: slide itu berasal dari deck 091126 (GIS BNPB 9 Nov) dan belum ada versi 16 Nov.

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

M.MINGGU = {'awal': date(2026, 11, 9), 'akhir': date(2026, 11, 15), 'paparan': date(2026, 11, 16),
            'nama': 'Paparan Situasi Banjir dan Longsor Sepekan 161126', 'impor_091': False, 'catatan_longsor': '',
            'catatan_sumber': 'laporan harian 14 Nov tidak tersedia',
            # pemilik 16 Nov 2026: bagian Probabilitas banjir dan Mitigasi ditambahkan; data prakiraan sistem banjir (centurisk97.id/banjir/data,
            # dibuat 15 Nov 2026 14.17 WIB, prakiraan 15-18 Nov) disalin ke bahan/gis supaya deck bisa dibangun ulang dengan angka yang sama
            'gis': os.path.join(SINI, 'bahan', 'gis')}

# langkah untuk kab/kota terdampak yang belum dilaporkan surut: dari laporan Koordalops 9-15 Nov dan status Siaga GIS 15 Nov
M.MITIGASI = {
    'Pidie Jaya': 'Perkuat tebing sungai yang jebol di Dayah Usen; layani 40 jiwa di Balee Meunasah',
    'Gayo Lues': 'Buka jalur Ise-Ise di Pantan Cuaca; siapkan jembatan darurat pengganti 4 jembatan putus',
    'Aceh Tamiang': 'Layani 2.650 jiwa pengungsi di huntara BNPB; perbaiki tanggul yang terkikis',
    'Kota Subulussalam': 'Lanjutkan logistik ke desa tergenang di Sultan Daulat dan Rundeng',
    'Aceh Tenggara': 'Pantau 5 desa yang masih tergenang; bersihkan lokasi yang sudah surut',
    'Aceh Barat': 'Siapkan akses pengganti ke Sikundo; pantau Sungai Mas dan Pante Ceureumen',
    'Langkat': 'Siapkan evakuasi Secanggang, Besitang; 10 kecamatan berstatus Siaga',
    'Toba': 'Perbaiki tanggul sungai yang roboh sebelum hujan berikutnya',
    'Simalungun': 'Tuntaskan pendataan 15 rumah rusak; pantau lokasi terdampak',
    'Rokan Hilir': 'Siapkan evakuasi Bagan Sinembah Raya, Kubu Babussalam; 8 kecamatan Siaga',
    'Pesisir Barat': 'Konfirmasi status surut dan data terdampak ke BPBD',
}
M.PANTAU = [('Aceh Tengah', 'Longsor: buka jalan Kampung Arul Badak; pantau lereng saat hujan'),
            ('Hulu Sungai Selatan', 'Longsor: tuntaskan data 5 rumah rusak berat; dampingi 21 jiwa pengungsi')]
M.KODE.update({'Riau': '14', 'Lampung': '18', 'Kalimantan Selatan': '63'})

# (prov, kab, kecamatan, mulai, selesai|None, kk, jiwa, ungsi_kk, ungsi_jiwa, tinggi, kabar, kondisi_teks)
M.BANJIR = [
    ('Aceh', 'Pidie Jaya', 'Meurah Dua, Meureudu, Bandar Dua, Bandar Baru, Panteraja', '31 Okt', None, 8608, 32272, 10, 40, D, '13 Nov',
     'Sebagian gampong sudah surut dengan sisa genangan; tebing sungai jebol di Dayah Usen meluas'),
    ('Aceh', 'Gayo Lues', 'Pining, Pantan Cuaca', '9 Nov', None, 118, 376, 8, 26, D, '13 Nov',
     'Air belum surut; 4 jembatan putus, jalur Ise-Ise di Pantan Cuaca tidak bisa dilalui'),
    ('Aceh', 'Aceh Tamiang', 'Tenggulun', '12 Nov', None, 4397, 15921, 784, 2650, D, '15 Nov',
     'Tinggi air naik turun; tanggul penahan banjir terkikis; 6 akses jalan terputus'),
    ('Aceh', 'Kota Subulussalam', 'Sultan Daulat, Rundeng', '13 Nov', None, 1897, 7703, 70, 278, '30-100 cm', '15 Nov',
     'Air belum surut; BPBD menyalurkan logistik ke desa terdampak'),
    ('Aceh', 'Aceh Tenggara', '', None, None, 503, 1697, D, D, D, '15 Nov',
     'Air belum surut di 5 dari 17 desa terdampak, antara lain Pancar Iman dan Lawe Rutung'),
    ('Aceh', 'Aceh Barat', 'Sungai Mas, Pante Ceureumen', None, None, 147, 645, D, D, D, '15 Nov',
     'Tinggi air naik turun dan hujan masih turun; jalan menuju Sikundo tidak bisa dilalui'),
    ('Sumatera Utara', 'Langkat', '', '12 Nov', None, 835, 2755, 150, 336, '10-50 cm', '13 Nov',
     'Banjir berangsur surut; pengungsi sudah kembali ke rumah'),
    ('Sumatera Utara', 'Toba', '', '13 Nov', None, 2, D, D, D, D, '13 Nov',
     'Tanggul sungai roboh; 10 ha lahan pertanian gagal panen; masih ditangani pemerintah daerah'),
    ('Sumatera Utara', 'Simalungun', '', None, None, 15, D, D, D, D, '13 Nov',
     '1 rumah rusak berat dan 14 rumah rusak ringan; masih ditangani pemerintah daerah'),
    ('Sumatera Utara', 'Tapanuli Selatan', '', None, '15 Nov', 17, D, D, D, D, '15 Nov',
     'Air sudah surut; BPBD menyiagakan 1 perahu untuk banjir susulan'),
    ('Riau', 'Rokan Hilir', '', '15 Nov', None, 4403, 17612, D, D, '30-40 cm', '15 Nov', 'Banjir belum surut; 5,5 km jalan terdampak'),
    ('Sumatera Barat', 'Padang Pariaman', '', '6 Nov', '6 Nov', 140, D, D, D, D, '9 Nov', 'Surut total; 8 rumah rusak, 2 jembatan terdampak'),
    ('Sumatera Barat', 'Pesisir Selatan', '', '15 Nov', '15 Nov', D, 2280, D, D, D, '15 Nov', 'Banjir sudah surut; 13 ha sawah terdampak'),
    ('Lampung', 'Pesisir Barat', '', '13 Nov', None, 100, D, D, D, D, '13 Nov', 'Air masih menggenangi sejumlah rumah warga'),
]

# (prov, kab, lokasi, mulai, md, hilang, kk, kerusakan, kondisi_teks, kabar, masih[, [(label, teks) tambahan untuk tabel ringkas]])
M.LONGSOR = [
    ('Aceh', 'Aceh Tengah', 'Kampung Arul Badak', None, 1, D, D, '2 ruas jalan nasional terdampak',
     'Longsor disertai banjir; korban hilang ditemukan meninggal dunia 15 Nov; air belum surut dan jalan Kampung Arul Badak belum bisa dilalui', '15 Nov', True,
     [('Status', 'Siaga Darurat Provinsi 11 Nov 2026 s.d. 31 Jan 2027'), ('Pengungsi', 'tidak ada pengungsian')]),   # WA 16 Nov "Pengungsi: Nihil"; pemilik 16 Nov: tulis "tidak ada pengungsian"
    ('Kalimantan Selatan', 'Hulu Sungai Selatan', 'Lokasi belum disebut dalam laporan', '12 Nov', D, D, 13, '5 rumah rusak berat',
     'BPBD bersama perangkat daerah dan aparat kecamatan menangani di lapangan', '12 Nov', True,
     [('Terdampak', '13 KK, 21 jiwa'), ('Pengungsi', '21 jiwa mengungsi mandiri di rumah sanak saudara')]),
]

# (prov, kab, jenis, masih, kk, jiwa, lokasi pengungsian dan asal, kabar terakhir)
M.UNGSI = [
    ('Aceh', 'Pidie Jaya', 'banjir', True, 10, 40, 'Balee Meunasah Gampong Dayah Usen', '13 Nov'),
    ('Aceh', 'Gayo Lues', 'banjir', True, 8, 26, 'Rumah saudara; 9 Nov di Kampung Pertik', '11 Nov'),
    ('Aceh', 'Aceh Tamiang', 'banjir', True, 784, 2650, 'Kawasan yang lebih tinggi (hunian sementara BNPB)', '15 Nov'),
    ('Aceh', 'Kota Subulussalam', 'banjir', True, 70, 278, 'Lokasi belum disebut', '15 Nov'),
    ('Sumatera Utara', 'Langkat', 'banjir', True, 150, 336, 'Lokasi belum disebut; sudah kembali ke rumah 13 Nov', '12 Nov'),
    ('Kalimantan Selatan', 'Hulu Sungai Selatan', 'longsor', True, D, 21, 'Rumah sanak saudara (mengungsi mandiri)', '12 Nov'),
]

# peta: Sumatera sampai Pesisir Selatan (Pesisir Barat, Lampung, ditunjuk ke inset); label diatur otomatis
M.EXT_SUM = (92.9, 104.1, 6.3, -2.75)
M.POS_BANJIR = {}
# bingkai digeser ke daratan (D-39: laut dan Selat Malaka tanpa Malaysia terbaca ruang kosong); skala tetap 8,9 derajat selebar panel
M.PANEL = [('Aceh', (94.8, 103.7, 5.6, 2.09), 102, ['11', '12', '13', '14', '21']),
           ('Kalimantan Selatan', (109.6, 118.5, -0.4, -3.91), 273, ['61', '62', '63', '64'])]
M.POS_LONGSOR = {'Aceh Tengah': (215, 130), 'Hulu Sungai Selatan': (300, 300)}

if __name__ == '__main__':
    M.main()
