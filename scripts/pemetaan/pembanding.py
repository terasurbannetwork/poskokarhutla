#!/usr/bin/env python3
"""HR-02: N_pembanding per kab dalam zona bahaya + rasio kelengkapan (ALGORITMA pemetaan-relawan §2).
Tidak menyalin hitungan bangunan: sel 110 m Open Buildings (ambang 0,70) dan zona bahaya dipakai dari
scripts/siklus/paparan.py (sel_kab, zona_dari_bagian) yang memakai scripts/umum/bangunan.py.
Keluaran hanya agregat per kab; nama orang tidak ada di sini.
Pakai: python3 -I scripts/pemetaan/pembanding.py --cek"""
import importlib.util, os, sys

AB = os.path.dirname(os.path.abspath(__file__))
AKAR = os.path.normpath(os.path.join(AB, "../.."))


def _muat(nama, rel):
    s = importlib.util.spec_from_file_location(nama, os.path.join(AKAR, rel))
    m = importlib.util.module_from_spec(s)
    sys.modules.setdefault(nama, m)
    s.loader.exec_module(m)
    return m


KONST = _muat("pm_konst", "scripts/pemetaan/konst.py").KONST


def _paparan():
    return _muat("pm_paparan", "scripts/siklus/paparan.py")


def n_pembanding(sel, zona):
    """sel [(i, j, n, luas_m2, kec, lon, lat)]; zona {fn(lon, lat)} dari paparan.zona_dari_bagian. -> jumlah bangunan di zona."""
    return sum(c[2] for c in sel if zona["fn"](c[5], c[6]))


def rasio(n_osm, n_pemb):
    """N_osm / N_pembanding; N_pembanding < N_PEMBANDING_MIN atau N_osm tak diketahui = None (bukan 0, bukan tak hingga).
    Nilai di atas 1 dikembalikan apa adanya; skor memakai skor_rasio()."""
    if n_osm is None or n_pemb is None or n_pemb < KONST["N_PEMBANDING_MIN"]:
        return None
    return n_osm / n_pemb


def skor_rasio(r):
    return None if r is None else min(r, 1.0)


def kelas(r):
    if r is None:
        return None
    k = KONST["KELAS"]
    return "tipis" if r < k["TIPIS_MAKS"] else ("memadai" if r > k["MEMADAI_MIN"] else "sedang")


def kab(prov, kab4, geoms, akar=AKAR):
    """N_pembanding satu kab untuk poligon zona `geoms` (GeoJSON geometry). Grid provinsi tak ada = None (menunggu), bukan 0."""
    P = _paparan()
    try:
        sel, _, _, _, nama, _ = P.sel_kab(prov, kab4, akar)
    except FileNotFoundError:
        return {"kab4": kab4, "terliput": False, "n_pembanding": None, "n_kab": None}
    z = P.zona_dari_bagian(geoms, "zona", "zona")
    return {"kab4": kab4, "terliput": True, "n_pembanding": n_pembanding(sel, z), "n_kab": sum(c[2] for c in sel)}


def cek():
    P = _paparan()
    sel = [(0, 0, 100, 5000, "A", 100.000, -1.0), (0, 1, 60, 3000, "A", 100.001, -1.0), (0, 9, 100, 5000, "A", 100.009, -1.0)]
    kotak = {"type": "Polygon", "coordinates": [[[99.9995, -1.0005], [100.0015, -1.0005], [100.0015, -0.9995], [99.9995, -0.9995], [99.9995, -1.0005]]]}
    z = P.zona_dari_bagian([kotak], "banjir", "poligon")
    assert n_pembanding(sel, z) == 160, "hanya dua sel pertama di zona"
    assert n_pembanding(sel, P.zona_dari_bagian([{"type": "Point", "coordinates": [150.0, 10.0]}], "x", "y")) == 0
    # T1: pembanding < 100 -> None, bukan 0/inf; tepat 100 boleh
    assert rasio(50, 99) is None and rasio(0, 99) is None and rasio(None, 500) is None and rasio(10, None) is None
    assert rasio(0, 100) == 0.0 and rasio(80, 100) == 0.8
    # T2: di atas 1 tampil apa adanya, skor dipotong 1,0
    assert rasio(150, 100) == 1.5 and skor_rasio(1.5) == 1.0 and skor_rasio(0.4) == 0.4 and skor_rasio(None) is None
    assert [kelas(x) for x in (None, 0.59, 0.6, 0.85, 0.86, 1.5)] == [None, "tipis", "sedang", "sedang", "memadai", "memadai"]
    # provinsi tanpa grid halus: menunggu, bukan 0
    import tempfile
    with tempfile.TemporaryDirectory() as t:
        r = kab("11", "1101", [kotak], akar=t)
        assert r["terliput"] is False and r["n_pembanding"] is None, r
    print("OK pembanding.py: n_pembanding memakai paparan.py, rasio null di bawah 100, di atas 1 apa adanya")


if __name__ == "__main__":
    if "--cek" in sys.argv:
        cek()
    else:
        sys.exit(__doc__)
