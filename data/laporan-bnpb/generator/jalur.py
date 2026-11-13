"""Satu sumber jalur folder laporan (pemilik 13 Nov 2026: data/laporan-bnpb dirapikan per jenis dan bulan).

    data/laporan-bnpb/harian/2026-11/2026-11-12/                 Laporan Kejadian Bencana Harian
    data/laporan-bnpb/penanganan-karhutla/2026-11/2026-11-12/    Laporan Penanganan Pengendalian Karhutla (dulu satelit-*)
    data/laporan-bnpb/mingguan/<tanggal paparan>/<bencana>/      paparan situasi sepekan
    data/laporan-bnpb/bulanan/<YYYY-MM>/, insidental/, paparan/, kajian/, kampus/, omc/, arsip/

Skrip mana pun yang membaca atau menulis folder hari memakai fungsi di sini, bukan menyusun 'harian-<tanggal>' sendiri.
Uji: python jalur.py --uji
"""
import datetime as dt
import glob
import os
import re

GENERATOR = os.path.dirname(os.path.abspath(__file__))
LAPORAN = os.path.dirname(GENERATOR)                 # data/laporan-bnpb
REPO = os.path.dirname(os.path.dirname(LAPORAN))
JENIS = {'harian': 'harian', 'penanganan': 'penanganan-karhutla'}
_TGL = re.compile(r'^\d{4}-\d{2}-\d{2}$')


def _iso(tanggal):
    if isinstance(tanggal, (dt.date, dt.datetime)):
        return tanggal.strftime('%Y-%m-%d')
    t = str(tanggal)
    assert _TGL.match(t), f'tanggal harus YYYY-MM-DD: {tanggal!r}'
    return t


def folder(jenis, tanggal, akar=LAPORAN):
    """Folder satu hari laporan rutin: jenis 'harian' atau 'penanganan'."""
    t = _iso(tanggal)
    return os.path.join(akar, JENIS[jenis], t[:7], t)


def harian(tanggal, akar=LAPORAN):
    return folder('harian', tanggal, akar)


def penanganan(tanggal, akar=LAPORAN):
    return folder('penanganan', tanggal, akar)


def semua(jenis, akar=LAPORAN):
    """Semua folder hari satu jenis, urut tanggal."""
    return sorted(p for p in glob.glob(os.path.join(akar, JENIS[jenis], '*', '*')) if os.path.isdir(p) and _TGL.match(os.path.basename(p)))


def berkas_hari(jenis, nama, akar=LAPORAN):
    """Glob satu nama berkas di semua folder hari, mis. berkas_hari('harian', 'wa-koordalops.txt')."""
    return sorted(glob.glob(os.path.join(akar, JENIS[jenis], '*', '*', nama)))


def tanggal_dari(path):
    """Tanggal (YYYY-MM-DD) dari jalur yang berada di dalam folder hari, atau None."""
    for bag in reversed(os.path.normpath(path).split(os.sep)):
        if _TGL.match(bag):
            return bag
    return None


if __name__ == '__main__':
    import sys
    if '--uji' in sys.argv:
        assert harian('2026-11-12').endswith(os.path.join('harian', '2026-11', '2026-11-12'))
        assert penanganan(dt.date(2026, 11, 3)).endswith(os.path.join('penanganan-karhutla', '2026-11', '2026-11-03'))
        assert tanggal_dari(os.path.join(LAPORAN, 'harian', '2026-11', '2026-11-05', 'kerja', 'data.json')) == '2026-11-05'
        assert os.path.isdir(os.path.join(REPO, '.git')), 'REPO bukan akar repo'
        print('jalur.py: uji lolos;', len(semua('harian')), 'folder harian,', len(semua('penanganan')), 'folder penanganan')
