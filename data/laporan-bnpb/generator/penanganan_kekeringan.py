"""Generator "Laporan Penanganan Kekeringan DDMMYY" (PB-58, F-11): slide peta dan tabel 6 provinsi (penduduk di HTH 31+ hari, HTH terpanjang,
kabupaten HTH 31+, hujan rerata), angka dari laporan harian kekeringan yang tayang. Hitungan HTH Centurisk97, bukan peta BMKG; ambang
kabupaten (30% penduduk) masih hipotesis. Mesinnya penanganan_jenis.py; tata letak sama dengan penanganan_banjir.py.

    python penanganan_kekeringan.py [--tanggal 2026-11-15] [--out DIR] [--laporan BERKAS_ATAU_URL]
    python penanganan_kekeringan.py uji"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import penanganan_jenis   # noqa: E402

if __name__ == '__main__':
    penanganan_jenis.utama('kekeringan')
