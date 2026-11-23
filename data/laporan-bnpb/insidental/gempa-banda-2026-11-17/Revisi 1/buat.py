"""Laporan Khusus Gempa M7,1 Laut Banda, 17 Nov 2026 04.11.20 WIB, dibangun ulang dengan gaya baku Laporan Khusus Gempa
(pemilik 20 Nov 2026: "buat ulang laporan gempa yang waktu itu ... dengan gaya sekarang"). Versi lama: ../buat.py.

Bahan: parameter BMKG (buletin InaTEWS M5 dan gempadirasakan 17 Nov 2026, arsip public/gempa/data/inatews_detail_2026-11.json:
III Saumlaki, III Tiakur, III Dobo, III Tual) dan laporan BPBD lewat Pusdalops BNPB (teks WA 17 Nov 2026, sama dengan versi lama).
Guncangan per kab/kota adalah MODEL repo (scripts/gempa/guncangan.py, Zhao 2006 intraslab, Vs30 baku), bukan pengamatan;
penduduk WorldPop 2026 per kecamatan.

    python buat.py          # isi.pptx -> deck.py (tanpa sampul) -> PPTX + PDF
"""
import os, sys
from datetime import date

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))
import gempa_khusus   # noqa: E402

KONFIG = {
    'sini': os.path.dirname(os.path.abspath(__file__)),
    'nama': 'Laporan Khusus Gempa M7,1 Laut Banda 171126',
    'gempa': {'m': 7.1, 'dalam': 115, 'lat': -6.03, 'lon': 131.62, 'jenis': 'intraslab'},
    'prov': ['81'],
    'judul': ('Gempa [M7,1] di Laut Banda mengguncang Kepulauan Kei dan Tanimbar;', 'gempa [tidak berpotensi tsunami]'),
    'par': {'waktu': '17 Nov 2026, 04.11', 'pusat': '130 km barat daya Maluku Tenggara', 'tsunami': 'Tidak ada'},
    'ext': (127.4, 136.0, -2.55),
    'radius': (100, 200, 300, 400),
    'pil_pusat': 'kiri',
    'pos': {'Kota Tual': (232, 205), 'Maluku Tenggara': (330, 226), 'Kepulauan Aru': (360, 328), 'Kepulauan Tanimbar': (48, 394),
            'Maluku Tengah': (100, 156), 'Seram Bagian Timur': (232, 156), 'Seram Bagian Barat': (48, 178),
            'Maluku Barat Daya': (48, 370)},
    'label': {'Kepulauan Aru': 'Kep. Aru', 'Kepulauan Tanimbar': 'Kep. Tanimbar'},
    'titik': {'Maluku Barat Daya': (129.72, -7.90)},   # Kep. Babar; pusat poligon terbesar (Wetar) di luar peta
    # BPBD lewat Pusdalops (Malra, Tual, Tanimbar) dan gempadirasakan BMKG (Tual, Saumlaki, Tiakur, Dobo)
    'dilapor': {'Maluku Tenggara', 'Kota Tual', 'Kepulauan Tanimbar', 'Maluku Barat Daya', 'Kepulauan Aru'},
    # (kab di peta, nama di tabel, MMI BMKG dirasakan, kondisi menurut BPBD/Pusdalops, jarak menurut laporan)
    'lapor': [
        ('Maluku Tenggara', 'Kab. Maluku Tenggara', '-',
         'Dirasakan kuat sekitar 10 detik; sebagian warga panik keluar rumah. BPBD memantau.', '130 km'),
        ('Kota Tual', 'Kota Tual', 'III',
         'Dirasakan 3 sampai 5 detik; warga sempat keluar rumah, kini kondusif. BPBD memantau.', '133 km'),
        ('Kepulauan Tanimbar', 'Kab. Kepulauan Tanimbar', 'III',
         'Dirasakan kuat sekitar 10 detik; sebagian warga panik keluar rumah. BPBD memantau.', '218 km'),
    ],
    # halaman 2: susulan, penanganan, langkah
    'waktu_utama': (2026, 11, 17, 4, 11, 20),                             # WIB
    'judul2': 'penanganan BPBD saat ini berupa [pemantauan situasi]',
    'bpbd': {'Maluku Tenggara', 'Kota Tual', 'Kepulauan Tanimbar'},
    'penanganan': [('BPBD Kab. Maluku Tenggara', 'Memantau situasi pascagempa.'),
                   ('BPBD Kota Tual', 'Memantau situasi; warga sempat keluar rumah, kini kondusif.'),
                   ('BPBD Kab. Kepulauan Tanimbar', 'Memantau situasi pascagempa.')],
    'kerusakan': False,
    'judul_dokumen': 'Laporan Khusus Gempa Bumi M7,1 Laut Banda',
    'subjudul': 'Kepulauan Tanimbar, Maluku Tenggara, dan Kota Tual, Provinsi Maluku',
    'tanggal': date(2026, 11, 17),
    'sumber': 'BMKG 17 Nov 2026; BPBD lewat Pusdalops BNPB; MMI model Zhao 2006 intraslab; penduduk WorldPop 2026',
}

if __name__ == '__main__':
    gempa_khusus.bangun(KONFIG)
