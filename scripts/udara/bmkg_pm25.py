"""PM2,5 stasiun BMKG se-Indonesia (pengukuran, bukan model) -> public/udara/data/bmkg_pm25.json.

Sumber: https://cews.bmkg.go.id/tempatirk/TEMPORARY/dashboard_pm2p5.html (blob dashboardData, label WIB, ~5 hari per jam).
Pengurai dipakai ulang dari scripts/omc/panen.py (urai_bmkg). Pemilik memutuskan lanjut walau ada ketentuan BMKG soal akses otomatis.
Gagal-lunak: sumber mati = berkas lama tetap (jam terbit aslinya); stasiun tanpa nilai dalam SEGAR_JAM dari jam terbaru halaman TIDAK diberi nilai (bukan nol).
Pakai : python3 scripts/udara/bmkg_pm25.py [uji]   (dirantai di jalan.py)
"""
import datetime as dt
import importlib.util
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import alat

_sp = importlib.util.spec_from_file_location("omc_panen", os.path.join(os.path.dirname(os.path.abspath(__file__)), "../omc/panen.py"))
P = importlib.util.module_from_spec(_sp)
_sp.loader.exec_module(P)

BERKAS = os.path.join(alat.OUT, "bmkg_pm25.json")
SEGAR_JAM = 6
SUMBER = "BMKG (cews.bmkg.go.id), pengukuran stasiun"


def wib(idx):
    return dt.datetime.fromtimestamp(idx * 3600, alat.WIB).strftime("%Y-%m-%dT%H:00+07:00")


def bangun(st, sekarang=None):
    """{nama: {lat, lon, jam}} -> isi berkas. Deret = array per jam sejak t0 (None = tak ada nilai)."""
    akhir = max(max(s["jam"]) for s in st.values() if s["jam"])
    out = []
    for nama, s in sorted(st.items()):
        if not s["jam"]:
            continue
        j0, j1 = min(s["jam"]), max(s["jam"])
        segar = akhir - j1 <= SEGAR_JAM
        out.append({"nama": nama.title(), "lat": round(s["lat"], 4), "lon": round(s["lon"], 4),
                    "v": s["jam"][j1] if segar else None, "t": wib(j1), "t0": wib(j0),
                    "deret": [s["jam"].get(h) for h in range(j0, j1 + 1)]})
    return {"v": 1, "dibuat": (sekarang or dt.datetime.now(dt.timezone.utc)).strftime("%Y-%m-%dT%H:%MZ"), "terbit": wib(akhir),
            "sumber": SUMBER, "segar_jam": SEGAR_JAM, "satuan": "µg/m³", "n_stasiun": len(out),
            "n_segar": sum(1 for s in out if s["v"] is not None), "stasiun": out}


def main(html=None):
    try:
        st = P.urai_bmkg(html if html is not None else alat.ambil(P.URL_BMKG, teks=True, timeout=60))
    except Exception as e:   # sumber mati atau format berubah: berkas lama tetap, jam terbit aslinya
        if not os.path.exists(BERKAS):
            raise
        alat.log(f"::warning title=udara bmkg_pm25::sumber gagal, berkas lama dipakai: {type(e).__name__}: {str(e)[:200]}")
        return
    d = bangun(st)
    alat.simpan(BERKAS, d)
    alat.log(f"bmkg_pm25: {d['n_stasiun']} stasiun, {d['n_segar']} segar, terbit {d['terbit']}")


def uji():
    j = lambda h: P.jam_idx(dt.datetime(2026, 11, 10, h, tzinfo=alat.WIB))
    st = {"A": {"lat": 1, "lon": 2, "jam": {j(8): 10.0, j(9): 20.0, j(10): 30.0}},
          "B": {"lat": 3, "lon": 4, "jam": {j(1): 5.0, j(2): 0.0}},   # basi: bukan nol
          "C": {"lat": 5, "lon": 6, "jam": {}}}
    d = bangun(st)
    a, b = d["stasiun"]
    assert d["n_stasiun"] == 2 and d["n_segar"] == 1 and d["terbit"] == "2026-11-10T10:00+07:00", d
    assert a["v"] == 30.0 and a["deret"] == [10.0, 20.0, 30.0] and a["t0"].startswith("2026-11-10T08"), a
    assert b["v"] is None and b["deret"] == [5.0, 0.0], b
    try:
        P.urai_bmkg("<html></html>")
        raise AssertionError("format rusak harus ValueError")
    except ValueError:
        pass
    print("bmkg_pm25 uji ok")


if __name__ == "__main__":
    uji()
    if sys.argv[1:] != ["uji"]:
        main()
