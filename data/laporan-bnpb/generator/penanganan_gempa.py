"""Generator "Laporan Penanganan Gempa Bumi DDMMYY" (PB-58, F-11): slide peta dan tabel 6 provinsi (M 4+, M 5+, dirasakan, M terbesar),
angka dari laporan harian gempa yang tayang. Mesinnya penanganan_jenis.py; tata letak sama dengan penanganan_banjir.py.

    python penanganan_gempa.py [--tanggal 2026-11-15] [--out DIR] [--laporan BERKAS_ATAU_URL]
    python penanganan_gempa.py uji"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import penanganan_jenis   # noqa: E402

if __name__ == '__main__':
    penanganan_jenis.utama('gempa')
