"""PD-1 Rapor peringatan dini (RU-088): pembungkus langkah jalan.py untuk scripts/prediksi/rapor_peringatan.py (RU-087, milik `prediksi`).

Mesin hitungnya satu, di rapor_peringatan.py; berkas ini hanya menaruh jalurnya ke sys.path supaya jalan.py bisa memanggilnya sebagai modul `unit.pd1`
(kontrak: jalan() -> {nama_berkas: dict}, cek()). Keluaran unit/rapor_peringatan.json.

  python3 -I scripts/bnpb/unit/pd1.py --cek
"""
import os
import sys

_AKAR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
sys.path.append(os.path.join(_AKAR, "scripts", "prediksi"))  # -I tidak menaruh folder skrip
from rapor_peringatan import jalan, cek  # noqa: E402,F401

if __name__ == "__main__":
    if "--cek" in sys.argv:
        cek()
    else:
        print(__doc__)
