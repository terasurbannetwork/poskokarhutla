#!/usr/bin/env python3
"""Gerbang paket data kajian: jalankan skrip pembangun tiap paket terdaftar dan gagal bila self-check-nya (assert) merah.

    python3 qa/paket.py            # semua paket di PAKET
    python3 qa/paket.py program-terbukti

Keluar 1 bila satu skrip keluar non-nol. Skrip pembangun menulis ulang keluarannya sendiri (deterministik, luring), jadi
gerbang ini sekaligus memastikan data di folder paket segar terhadap korpus `data/raw/hukum/teks` yang ada di mesin ini.
Korpus hukum tidak dilacak git, jadi gerbang ini lokal (dijalankan sebelum build kirim), bukan di CI.
"""
import subprocess
import sys
import time
from pathlib import Path

AKAR_REPO = Path(__file__).resolve().parents[3]
PAKET = {  # nama -> perintah, dijalankan dari akar repo
    "program-terbukti": [sys.executable, "data/kajian-bnpb/bangun/program-terbukti.py"],
}
# ponytail: daftar tangan; paket lain (dibi, irbi, nonalam-sosial, skenario-*, air-jawa, lembaga) masuk saat pemiliknya siap


def main(argv):
    pilih = argv or list(PAKET)
    gagal = []
    for nama in pilih:
        t0 = time.time()
        r = subprocess.run(PAKET[nama], cwd=AKAR_REPO, capture_output=True, text=True)
        ok = r.returncode == 0
        print(f"{'LOLOS' if ok else 'GAGAL'} {nama} ({time.time() - t0:.1f} dtk)")
        if not ok:
            gagal.append(nama)
            print("      " + "\n      ".join((r.stderr or r.stdout).strip().splitlines()[-6:]))
    return 1 if gagal else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
