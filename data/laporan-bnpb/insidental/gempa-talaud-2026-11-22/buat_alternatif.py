"""Alternatif 1 Laporan Khusus Gempa Talaud: prediksi gempa susulan mengisi ruang kosong halaman 1 (lihat alternatif_susulan.py).
KONFIG sama dengan buat.py; keluaran di folder "Alternatif 1".

    python buat_alternatif.py
"""
import os, sys

SINI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, SINI)
import buat   # noqa: E402  (KONFIG c, juga memasang jalur ke mesin)
import alternatif_susulan   # noqa: E402

c = buat.c
c['sini'] = c['keluar'] = os.path.join(SINI, 'Alternatif 1')

if __name__ == '__main__':
    alternatif_susulan.bangun(c)
