"""Jalankan pipeline udara berurutan; tiap langkah boleh gagal tanpa mematikan yang lain (langkah hilir memakai berkas jalan sebelumnya).

Urutan: angin -> prakiraan -> riwayat -> musim_asap -> lintasan -> atribusi -> rentan -> laporan_udara -> asal -> peluang_udara. pltu.py dan kota.py statis, dijalankan tangan.
Keluar 1 hanya bila SEMUA langkah gagal (tidak ada yang layak di-commit).
Pakai : python3 scripts/udara/jalan.py   (udara.yml)
"""
import importlib
import importlib.util
import os
import sys
import time
import traceback

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import alat

LANGKAH = ["angin", "prakiraan", "riwayat", "musim_asap", "lintasan", "atribusi", "rentan", "laporan_udara", "asal", "peluang_udara"]
BATAS_KB = {"laporan.json": 400}


def main():
    gagal = []
    for nama in LANGKAH:
        t = time.time()
        try:
            importlib.import_module(nama).main()
            alat.log(f"[{nama}] ok {time.time() - t:.0f} dtk")
        except Exception as e:
            gagal.append(nama)
            traceback.print_exc()
            alat.log(f"::warning title=udara {nama} gagal::{type(e).__name__}: {str(e)[:300]}")
    for f in sorted(os.listdir(alat.OUT)):
        if f.endswith(".json"):
            kb = os.path.getsize(os.path.join(alat.OUT, f)) / 1024
            if kb > BATAS_KB.get(f, 600):
                alat.log(f"::warning title=udara berkas besar::{f} {kb:.0f} KB melebihi {BATAS_KB.get(f, 600)} KB")
    try:   # laporan kejadian per kab/kota Siaga (scripts/umum/laporan_kejadian.py), sesudah laporan_udara dan asal
        sp = importlib.util.spec_from_file_location("laporan_kejadian", os.path.join(os.path.dirname(os.path.abspath(__file__)), "../umum/laporan_kejadian.py"))
        m = importlib.util.module_from_spec(sp)
        sp.loader.exec_module(m)
        m.uji()
        m.jalankan("udara")
    except (Exception, SystemExit) as e:
        traceback.print_exc()
        alat.log(f"::warning title=udara laporan_kejadian gagal::{type(e).__name__}: {str(e)[:300]}")
    alat.log(f"udara: {len(LANGKAH) - len(gagal)}/{len(LANGKAH)} langkah ok" + (f", gagal: {', '.join(gagal)}" if gagal else ""))
    return 1 if len(gagal) == len(LANGKAH) else 0


if __name__ == "__main__":
    sys.exit(main())
