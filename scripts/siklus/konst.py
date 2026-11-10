"""Konstanta bernama Siklus (ALGORITMA). Kembaran public/siklus/konst.js, dijaga tests/siklus/paritas.test.mjs.

None = menunggu (parameter tanpa nilai tertulis di riset; tidak ditebak).
Pakai: python3 -I scripts/siklus/konst.py json | uji
"""
import importlib.util, json, os, sys

JENDELA_JENIS = {"bawaan": 3, "kekeringan": None, "karhutla": None, "gunungapi": None}
BASI_HARI = 3
PITA = 4
AMBANG_BANGUNAN = 0.70
BATAS_INARISK = [0.33, 0.66]
REHAB_MACET_HARI = 60
RENKON_SEGERA_HARI = 90
JRC_HUNIAN = [[0, 0], [0.5, 0.33], [1, 0.49], [1.5, 0.62], [2, 0.72], [3, 0.87], [4, 0.93], [5, 0.98], [6, 1]]
JRC_D_MAKS = {"hunian": 111, "niaga": 138, "industri": 114}
KURS = None
FAKTOR_HARGA = None
TAG_OSM = None

NAMA = ("JENDELA_JENIS", "BASI_HARI", "PITA", "AMBANG_BANGUNAN", "BATAS_INARISK", "REHAB_MACET_HARI",
        "RENKON_SEGERA_HARI", "JRC_HUNIAN", "JRC_D_MAKS", "KURS", "FAKTOR_HARGA", "TAG_OSM")


def sebagai_dict():
    return {k: globals()[k] for k in NAMA}


def jrc_f(d):
    """Faktor kerusakan hunian pada kedalaman d (m); linear antar titik, 0 untuk d <= 0, 1 untuk d >= 6."""
    if d <= 0:
        return 0.0
    if d >= 6:
        return 1.0
    for (d0, f0), (d1, f1) in zip(JRC_HUNIAN, JRC_HUNIAN[1:]):
        if d <= d1:
            return f0 + (f1 - f0) * (d - d0) / (d1 - d0)


def _uji():
    assert abs(jrc_f(0.75) - 0.41) < 1e-9 and jrc_f(7) == 1.0 and jrc_f(-1) == 0.0
    assert abs(jrc_f(0.75) * 111 * 50 - 2275.5) < 1e-9
    s = importlib.util.spec_from_file_location("terpapar", os.path.join(os.path.dirname(os.path.abspath(__file__)), "../bnpb/terpapar.py"))
    t = importlib.util.module_from_spec(s)
    s.loader.exec_module(t)
    assert list(t.AMBANG) == BATAS_INARISK, "batas InaRISK harus satu nilai dengan terpapar.py"
    assert json.loads(json.dumps(sebagai_dict())) == sebagai_dict()
    print("konst: uji hijau")


if __name__ == "__main__":
    aksi = sys.argv[1] if len(sys.argv) > 1 else ""
    if aksi == "json":
        print(json.dumps(sebagai_dict(), sort_keys=True))
    elif aksi == "uji":
        _uji()
    else:
        sys.exit("pakai: konst.py json | uji")
