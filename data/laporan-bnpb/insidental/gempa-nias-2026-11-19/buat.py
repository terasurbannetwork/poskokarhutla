"""Laporan Khusus satu halaman: Gempa M5,4 barat daya Nias Barat, 19 Nov 2026 08.34.48 WIB (Kepulauan Nias, Sumatera Utara).

Laporan ini adalah rujukan gaya baku Laporan Khusus Gempa (pemilik 20 Nov 2026); mesinnya ../gempa_khusus.py.
Bahan: parameter BMKG (data.bmkg.go.id gempaterkini dan gempadirasakan, diakses 20 Nov 2026) dan laporan BPBD lewat Pusdalops BNPB
(laphar 19/11/2026 entri 07, teks WA Koordalops 20 Nov 2026). Guncangan per kab/kota adalah MODEL repo (scripts/gempa/guncangan.py,
jenis kerak dangkal, Vs30 baku), bukan pengamatan; penduduk WorldPop 2026 per kecamatan.

    python buat.py          # isi.pptx -> deck.py (tanpa sampul) -> PPTX + PDF
    python buat.py --isi    # hanya slide isi
"""
import os, sys
from datetime import date

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
import gempa_khusus   # noqa: E402

KONFIG = {
    'sini': os.path.dirname(os.path.abspath(__file__)),
    'nama': 'Laporan Khusus Gempa M5,4 Nias Barat 191126',
    'gempa': {'m': 5.4, 'dalam': 12, 'lat': 0.47, 'lon': 96.56},          # jenis: tebakan guncangan.py (kerak)
    'prov': ['12'],                                                        # kode provinsi yang dihitung dan diwarnai
    'judul': ('Gempa [M5,4] di laut barat daya Nias mengguncang Nias Selatan;', 'gempa [tidak berpotensi tsunami]'),
    'par': {'waktu': '19 Nov 2026, 08.34', 'pusat': '114 km barat daya Nias Barat', 'tsunami': 'Tidak ada'},
    'ext': (95.6, 98.9, 2.05),                                             # bujur kiri, bujur kanan, lintang atas peta
    'radius': (100, 200, 300),
    'pos': {'Nias Utara': (80, 150), 'Kota Gunungsitoli': (330, 150), 'Nias': (350, 196), 'Nias Barat': (80, 196),
            'Nias Selatan': (350, 262), 'Tapanuli Tengah': (330, 108)},   # kiri atas pil label kab/kota (pt)
    # laphar 19/11 entri 07 (BPBD Nias Barat) dan gempadirasakan BMKG (II Nias Selatan)
    'dilapor': {'Nias Barat', 'Nias Selatan'},
    # (kab di peta, nama di tabel, MMI BMKG dirasakan, kondisi menurut BPBD/Pusdalops[, jarak])
    'lapor': [
        ('Nias Barat', 'Kab. Nias Barat', '-',
         'BPBD memantau situasi pascagempa; belum ada laporan dampak. Kerusakan akan dilaporkan bila ditemukan.'),
        ('Nias Selatan', 'Kab. Nias Selatan', 'II',
         'Getaran dirasakan menurut BMKG (skala II). Belum ada laporan dampak dari BPBD.'),
    ],
    # halaman 2: susulan, penanganan, langkah
    'waktu_utama': (2026, 11, 19, 8, 34, 48),                             # WIB
    'judul2': 'penanganan BPBD saat ini berupa [pemantauan situasi]',
    'bpbd': {'Nias Barat'},                                                # kab dengan laporan BPBD
    'penanganan': [('BPBD Kab. Nias Barat', 'Memantau situasi pascagempa; kerusakan akan dilaporkan bila ditemukan.')],
    'kerusakan': False,
    'judul_dokumen': 'Laporan Khusus Gempa Bumi M5,4 Nias Barat',
    'subjudul': 'Kabupaten Nias Barat dan Nias Selatan, Provinsi Sumatera Utara',
    'tanggal': date(2026, 11, 19),
    'sumber': 'BMKG 19 Nov 2026; BPBD lewat Pusdalops BNPB; MMI model kerak dangkal; penduduk WorldPop 2026',
}

if __name__ == '__main__':
    gempa_khusus.bangun(KONFIG)
