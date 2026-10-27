"""Angka 2026 per perusahaan untuk kartu Insight "Perusahaan" (public/aktor.js), dari laporan konsesi (konsesi_laporan.py).

Menambah p["sawit26"] ke tiap perusahaan di aktor_karhutla.json (dipanggil aktor_walhi.tulis):
  titik          jumlah titik panas VIIRS (nominal/tinggi) di poligon konsesinya, 1 Jan 2026 s.d. `sampai` (konsesi2026/<prov>.json: titik)
  luas_bakar_ha  indikasi luas terbakar = jumlah luas_bakar_ha tiap poligonnya (piksel VIIRS 375 m unik x 14,06 ha, dipotong luas konsesi).
                 Indikasi dari piksel satelit, bukan citra dan bukan luas resmi; poligon dijumlah satu per satu, tumpang tindih antarpoligon tidak dibuang.
  sampai         hari terakhir laporan konsesi (konsesi2026/index.json: sampai), WIB; laporan dijalankan manual, bisa lebih tua dari titik terkini
Firespot terkini (cek.firespot_terkini) dihitung di aktor_walhi.cek_terkini, bukan di sini.

Pakai: python3 scripts/data/aktor_sawit.py uji
"""
import glob, json, os, sys

AKAR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "../..")
KONSESI = os.path.join(AKAR, "public/data/konsesi2026")


def per_poligon(folder=KONSESI):
    """-> ({id poligon: (titik, luas_bakar_ha)}, 'YYYY-MM-DD' hari terakhir laporan atau '')."""
    r = {}
    for f in glob.glob(os.path.join(folder, "*.json")):
        b = os.path.basename(f)
        if not b[:2].isdigit() or b.endswith(".ringkas.json") or "_" in b:
            continue
        for x in json.load(open(f)).get("perusahaan", []):
            r[x["id"]] = (x["titik"], x["luas_bakar_ha"])
    ix = os.path.join(folder, "index.json")
    sampai = json.load(open(ix)).get("sampai", "")[:10] if os.path.exists(ix) else ""
    return r, sampai


def tambah(daf, poli, folder=KONSESI):
    """daf = perusahaan[]; poli = {id poligon: nama perusahaan}. Tanpa laporan konsesi: dibiarkan (kartu menampilkan '–')."""
    pp, sampai = per_poligon(folder)
    if not pp:
        return
    ids = {}
    for i, n in poli.items():
        ids.setdefault(n, []).append(i)
    for p in daf:
        if p.get("kosong") or not p["cek"].get("poligon"):
            continue
        rs = [pp[i] for i in ids.get(p["nama"], []) if i in pp]  # poligon tanpa titik 2026 tidak ada di laporan = 0
        p["sawit26"] = {"titik": sum(t for t, _ in rs), "luas_bakar_ha": sum(l for _, l in rs), "sampai": sampai}


def uji_berkas(d):
    for p in d["perusahaan"]:
        s = p.get("sawit26")
        if s:
            assert s["titik"] >= 0 and s["luas_bakar_ha"] >= 0 and (s["titik"] > 0 or s["luas_bakar_ha"] == 0), p["nama"]
        c = p["cek"]
        if c.get("firespot_terkini") is not None:
            assert 0 <= c["firespot_terkini"] <= c.get("titik_terkini", 0), f"{p['nama']}: firespot lebih banyak dari titik terkini"


def uji():
    import tempfile
    with tempfile.TemporaryDirectory() as t:
        json.dump({"perusahaan": [{"id": "a", "titik": 10, "luas_bakar_ha": 100}, {"id": "b", "titik": 5, "luas_bakar_ha": 20}]}, open(f"{t}/14.json", "w"))
        json.dump({"perusahaan": [{"id": "a", "titik": 99, "luas_bakar_ha": 9}]}, open(f"{t}/14.ringkas.json", "w"))  # ringkas tidak boleh terhitung
        json.dump({"sampai": "2026-10-19 14:46 WIB"}, open(f"{t}/index.json", "w"))
        daf = [{"nama": "X", "cek": {"poligon": 1}}, {"nama": "Y", "cek": {"poligon": 1}}, {"nama": "Z", "cek": {}}]
        tambah(daf, {"a": "X", "b": "X", "c": "Y"}, t)
        assert daf[0]["sawit26"] == {"titik": 15, "luas_bakar_ha": 120, "sampai": "2026-10-19"}, daf[0]
        assert daf[1]["sawit26"]["titik"] == 0 and "sawit26" not in daf[2], daf
    pp, _ = per_poligon()
    assert pp, "konsesi2026 kosong"
    print("ok aktor_sawit")


if __name__ == "__main__":
    uji() if sys.argv[1:] == ["uji"] else sys.exit(__doc__)
