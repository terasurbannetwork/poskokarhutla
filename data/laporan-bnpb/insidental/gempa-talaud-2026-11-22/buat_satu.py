"""Varian SATU HALAMAN (riset gaya alternatif 23 Nov 2026): isi halaman 2 dipadatkan ke kolom kanan halaman 1.
KONFIG sama dengan buat.py; keluaran di subfolder 'Alternatif satu halaman'.

    python buat_satu.py
"""
import os, sys
SINI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, SINI)
import buat   # noqa: E402  (menyusun KONFIG c tanpa membangun)

c = buat.c
c['sini'] = c['keluar'] = os.path.join(SINI, 'Alternatif satu halaman')
c['nama'] = buat.NAMA + ' (satu halaman)'
c['satu_halaman'] = True
c['sumber'] = 'BMKG 22 Nov 2026; BPBD lewat Pusdalops BNPB; MMI model; model susulan Reasenberg-Jones; katalog gempa merusak BMKG'

if __name__ == '__main__':
    import gempa_khusus
    gempa_khusus.bangun(c)
