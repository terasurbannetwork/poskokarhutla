"""Tiga gaya alternatif blok peluang susulan di varian satu halaman (riset gaya 23 Nov 2026).

    python buat_gaya.py tangga|linimasa|sinyal
Keluaran: 'Alternatif susulan/<gaya>/'.
"""
import os, sys

gaya = sys.argv[1]
sys.argv = sys.argv[:1]
import buat_satu   # noqa: E402  (KONFIG satu halaman)

c = buat_satu.c
c['sini'] = c['keluar'] = os.path.join(buat_satu.SINI, 'Alternatif susulan', gaya)
os.makedirs(c['keluar'], exist_ok=True)
c['nama'] = buat_satu.buat.NAMA + f' (susulan {gaya})'
c['gaya_susulan'] = gaya

if __name__ == '__main__':
    import gempa_khusus
    gempa_khusus.bangun(c)
