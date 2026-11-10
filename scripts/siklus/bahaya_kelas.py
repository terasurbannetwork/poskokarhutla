"""Kelas bahaya InaRISK per sel (ALGORITMA F2.3): ambil H di pusat sel lewat ImageServer gis.bnpb.go.id, kelaskan, jumlahkan bangunan.

Raster tidak disimpan. nodata/gagal ambil/H di luar 0..1 = kelas null ("tidak terliput"), BUKAN rendah. Batas dari konst.BATAS_INARISK
(sama dengan scripts/bnpb/terpapar.py, dijaga konst.py uji). Label estimasi-model; sumber resmi batas kelas tidak ditemukan (U12).
Pakai: python3 -I scripts/siklus/bahaya_kelas.py uji
"""
import importlib.util, json, math, os, sys

AB = os.path.dirname(os.path.abspath(__file__))
JEDA = 2   # detik antarpanggilan ke gis.bnpb.go.id (registri: jeda minimal 2)
KELAS = ("rendah", "sedang", "tinggi")
CATATAN = ("Batas kelas rendah < 0,33, sedang 0,33 sampai 0,66, tinggi > 0,66 adalah bawaan program (U12), sama dengan terpapar.py; "
           "sumber resmi batas kelas InaRISK tidak ditemukan. Nilai H dibaca di pusat sel 110 m (raster 100 m).")


def _muat(nama, jalur):
    s = importlib.util.spec_from_file_location(nama, jalur)
    m = importlib.util.module_from_spec(s)
    s.loader.exec_module(m)
    return m


K = _muat("sk_konst", os.path.join(AB, "konst.py"))
_T = _muat("sk_terpapar", os.path.join(AB, "../bnpb/terpapar.py"))


def kelas(h, batas=None):
    """H -> 'rendah'|'sedang'|'tinggi'|None. Persis 0,33 dan 0,66 = sedang; 0,661 = tinggi."""
    lo, hi = batas or K.BATAS_INARISK
    if isinstance(h, bool) or not isinstance(h, (int, float)) or math.isnan(h) or not 0 <= h <= 1:
        return None
    return "rendah" if h < lo else ("sedang" if h <= hi else "tinggi")


def klasifikasi(sel, batas=None):
    """sel [(n, H)] -> bangunan per kelas; n pada sel tanpa H masuk tak_terliput, tidak pernah rendah."""
    out = {k: 0 for k in KELAS}
    out["tak_terliput"] = 0
    for n, h in sel:
        out[kelas(h, batas) or "tak_terliput"] += n
    return out


def sampel(bahaya, titik, ambil=None):
    """titik [(lon, lat)] -> [H|None]. Satu panggilan getSamples per 200 titik; gagal satu batch = None untuk batch itu."""
    if bahaya not in _T.LAPISAN:
        raise ValueError(f"bahaya {bahaya!r} bukan salah satu {sorted(_T.LAPISAN)}")
    ambil = ambil or (lambda u, p: _T.D.ambil(u, p, jeda=JEDA))
    out = [None] * len(titik)
    for a in range(0, len(titik), _T.PER_PANGGIL):
        geom = json.dumps({"points": [list(p) for p in titik[a:a + _T.PER_PANGGIL]], "spatialReference": {"wkid": 4326}})
        try:
            r = ambil(f"{_T.INARISK}/{_T.LAPISAN[bahaya]}/ImageServer/getSamples",
                      {"geometry": geom, "geometryType": "esriGeometryMultipoint", "returnFirstValueOnly": "true", "f": "json"})
        except Exception:
            continue
        if "error" in r:
            continue
        for s in r.get("samples", []):
            try:
                out[a + s["locationId"]] = float(s["value"])
            except (KeyError, TypeError, ValueError, IndexError):
                pass   # "", "NoData", None -> tetap None
    return out


def keluaran(bahaya, per_kelas, resolusi="halus"):
    """Selubung hasil kelas untuk satu bahaya; resolusi 'halus' (110 m) atau 'kasar' (0,01 derajat, ditandai)."""
    return {"bahaya": bahaya, "yakin": "estimasi-model", "resolusi": resolusi, "kelas": per_kelas,
            "batas_versi": {"rendah_di_bawah": K.BATAS_INARISK[0], "tinggi_di_atas": K.BATAS_INARISK[1], "sumber": "bawaan U12"},
            "catatan": CATATAN}


def _uji():
    # ALG F2.3: n = 10,20,30,40; H = 0,20; 0,33; 0,66; 0,70 -> rendah 10, sedang 50, tinggi 40, jumlah 100
    k = klasifikasi([(10, .20), (20, .33), (30, .66), (40, .70)])
    assert k == {"rendah": 10, "sedang": 50, "tinggi": 40, "tak_terliput": 0}, k
    assert kelas(0.661) == "tinggi" and kelas(0.329) == "rendah" and kelas(0) == "rendah" and kelas(1) == "tinggi"
    for salah in (None, float("nan"), -0.1, 1.01, "NoData", "", True):
        assert kelas(salah) is None, salah
    assert klasifikasi([(5, None), (7, "NoData"), (3, .5)]) == {"rendah": 0, "sedang": 3, "tinggi": 0, "tak_terliput": 12}
    assert list(K.BATAS_INARISK) == list(_T.AMBANG)
    # sampel tanpa jaringan: nodata, gagal, galat server, id di luar rentang
    def palsu(u, p):
        assert "layer_bahaya_banjir" in u
        return {"samples": [{"locationId": 0, "value": "0.5"}, {"locationId": 1, "value": "NoData"}, {"locationId": 2, "value": ""}, {"locationId": 99, "value": "0.9"}]}
    assert sampel("banjir", [(1, 1)] * 4, palsu) == [0.5, None, None, None]
    assert sampel("banjir", [(1, 1)], lambda u, p: {"error": {"code": 500}}) == [None]
    def putus(u, p):
        raise RuntimeError("jaringan putus")
    assert sampel("banjir", [(1, 1)] * 3, putus) == [None] * 3
    try:
        sampel("tsunami", [(1, 1)], palsu)
        raise SystemExit("bahaya tak dikenal harus ditolak")
    except ValueError:
        pass
    o = keluaran("banjir", k)
    assert o["yakin"] == "estimasi-model" and o["batas_versi"]["tinggi_di_atas"] == 0.66 and "tidak ditemukan" in o["catatan"]
    print("bahaya_kelas: uji hijau")


if __name__ == "__main__":
    if sys.argv[1:] == ["uji"]:
        _uji()
    else:
        sys.exit("pakai: bahaya_kelas.py uji")
