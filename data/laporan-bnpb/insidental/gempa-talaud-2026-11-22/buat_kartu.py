"""Tiga alternatif desain kartu peluang susulan (permintaan pemilik 23 Nov 2026, "buat 3 alternatif desain ini").
Dasar Alternatif 1; keluaran di folder "Alternatif kartu A", "... B", "... C".

    python buat_kartu.py A     # satu gaya
    python buat_kartu.py       # ketiganya
"""
import os, sys

SINI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, SINI)
gaya = [a for a in sys.argv[1:] if a in 'ABC' and a] or ['A', 'B', 'C']
sys.argv = sys.argv[:1]
import buat   # noqa: E402
import alternatif_susulan as AS   # noqa: E402

if __name__ == '__main__':
    import copy
    for g in gaya:
        c = copy.deepcopy(buat.c)
        c['sini'] = c['keluar'] = os.path.join(SINI, f'Alternatif kartu {g}')
        AS.GAYA = g
        AS.bangun(c)
