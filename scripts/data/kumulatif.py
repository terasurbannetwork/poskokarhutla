"""Titik panas kumulatif tahun berjalan vs tahun parah (2015, 2019, 2023) dan rerata 2019-2025, pada hari yang sama -> public/data/kumulatif.json

Tanpa unduhan: tahun 2019+ dari public/data/musim_harian.json (M + N + N20, semua keyakinan, hari WIB, sudah ada di repo);
2015 dari data/kumulatif_2015.json (dibangun SEKALI dari arsip FIRMS 2015, M + N saja karena NOAA-20 baru terbang 2017:
  SENSOR=MODIS python3 scripts/data/firms.py 2015-01-01 2015-12-31 > modis.csv ; python3 scripts/data/firms.py 2015-01-01 2015-12-31 > snpp.csv
  python3 scripts/data/kumulatif.py dasar2015 modis.csv snpp.csv).
Hari dibandingkan = hari ke-n dalam tahun (1 Jan = 1); 29 Feb tahun kabisat menggeser rerata paling banyak 1 hari.
Kurva disimpan kumulatif tiap 7 hari (hari ke-7, 14, ...) + hari ke-n terakhir, nasional dan per provinsi.
Luas terbakar: hanya total tahunan SiPongi dari luas_resmi.json (2018+), bukan kurva.

Pakai:  python3 scripts/data/kumulatif.py   |   python3 scripts/data/kumulatif.py uji
"""
import datetime as dt, importlib, json, os, sys

sys.path.insert(0, os.path.dirname(__file__))
from wilayah import AKAR, PROVINSI

MUSIM = os.path.join(AKAR, "public/data/musim_harian.json")
DASAR = os.path.join(AKAR, "data/kumulatif_2015.json")
LUAS = os.path.join(AKAR, "public/data/luas_resmi.json")
KELUAR = os.path.join(AKAR, "public/data/kumulatif.json")
BANDING = ["2015", "2019", "2023"]
RERATA = [str(y) for y in range(2019, 2026)]


def kum(seri, n):
    """Jumlah n hari pertama; None bila serinya lebih pendek dari n."""
    return sum(seri[:n]) if len(seri) >= n else None


def kurva(seri, n_maks):
    """Kumulatif di hari 7, 14, ... <= min(len, n_maks) + hari terakhir."""
    m = min(len(seri), n_maks)
    t, c, out = [], 0, []
    ks = list(range(7, m + 1, 7)) + ([m] if m % 7 else [])
    for k in ks:
        out.append(sum(seri[:k]))
    return out


def rerata(seris, n):
    v = [kum(s, n) for s in seris]
    v = [x for x in v if x is not None]
    return round(sum(v) / len(v)) if v else None


def baris(seri_tahun, n):
    """seri_tahun: {tahun: [harian]}; -> perbandingan di hari ke-n dan kurva."""
    ini = kum(seri_tahun["ini"], n)
    cmp = {}
    for y in BANDING:
        if y in seri_tahun:
            c = kum(seri_tahun[y], n)
            cmp[y] = {"titik": c, "persen": round(100 * ini / c) if c else None}
    rr = rerata([seri_tahun[y] for y in RERATA if y in seri_tahun], n)
    cmp["rerata_2019_2025"] = {"titik": rr, "persen": round(100 * ini / rr) if rr else None}
    kv = {y: kurva(seri_tahun[y], 366) for y in BANDING if y in seri_tahun}
    kv["rerata_2019_2025"] = [round(sum(c) / len(c)) for c in zip(*[kurva(seri_tahun[y], 366) for y in RERATA if y in seri_tahun and len(seri_tahun[y]) >= 365])]
    kv["ini"] = kurva(seri_tahun["ini"], n)
    return {"ini": ini, "banding": cmp, "kurva": kv}


def kalimat(nama, b, tahun, n):
    c = b["banding"].get("2015")
    if not c or c["persen"] is None:
        return None
    return f"Sampai hari ke-{n} tahun {tahun}, titik panas {nama} = {c['persen']}% dari 2015 pada hari yang sama ({b['ini']:,} vs {c['titik']:,}).".replace(",", ".")


def bangun(m, d15, luas=None):
    tahun = m["tahun"][-1]
    sd = m["sd"]
    n = (dt.date.fromisoformat(sd) - dt.date(int(tahun), 1, 1)).days + 1
    pecah = lambda a: {y: a[y] for y in a}
    def seri(nas, kode=None):
        s = {y: (m["nasional"][y] if kode is None else m["prov"][kode][y]) for y in m["nasional"] if y != tahun}
        s["ini"] = (m["nasional"][tahun] if kode is None else m["prov"][kode][tahun])
        a = d15["nasional"] if kode is None else d15["prov"].get(kode)
        if a:
            s["2015"] = a
        return s
    out = {"nasional": baris(seri(None), n), "prov": {}}
    out["nasional"]["nama"] = "Indonesia"
    for k in m["prov"]:
        b = baris(seri(None, k), n)
        b["nama"] = PROVINSI.get(k, k)
        out["prov"][k] = b
    for b in [out["nasional"], *out["prov"].values()]:
        b["kalimat"] = kalimat("Indonesia" if b is out["nasional"] else b["nama"], b, tahun, n)
    sd_s = dt.date.fromisoformat(sd)
    res = {"versi": 1, "dibuat": dt.datetime.now(dt.timezone.utc).replace(microsecond=0).isoformat(), "tahun": tahun, "sd": sd, "hari_ke": n,
           "banding": BANDING, "rerata_tahun": [RERATA[0], RERATA[-1]],
           "hari_kurva": "hari ke-7, 14, ... lalu hari ke-n (ini) atau hari terakhir tahun (pembanding); nilai = titik panas kumulatif",
           "definisi": "Titik panas M + N + N20, semua keyakinan, hari WIB (musim_harian.json); 2015 hanya M + N",
           "kalimat": out["nasional"]["kalimat"], **out,
           "batasan": ["2015 dihitung dari MODIS + VIIRS S-NPP saja (NOAA-20 belum terbang), jadi tahun lain dihitung dengan satelit lebih banyak: persen terhadap 2015 sedikit terlalu tinggi.",
                       "Titik panas bukan luas terbakar dan bukan jumlah kebakaran; satu kebakaran besar bisa menghasilkan banyak titik di hari yang sama.",
                       "Hari dibandingkan = hari ke-n dalam tahun; 29 Februari tahun kabisat menggeser paling banyak 1 hari pada rerata."]}
    if luas:
        ha = {y: round(sum(v[i] for v in luas["ha"].values() if v[i] is not None)) for i, y in enumerate(luas["tahun"]) if y in ("2019", "2023", tahun)}
        res["luas_ha"] = {"nilai": ha, "sampai": luas.get("sampai", {}), "catatan": "Total tahunan SiPongi (indikasi dari titik panas, bukan citra); 2015 tidak ada di repo; tahun berjalan sebagian."}
    return res


def main():
    m = json.load(open(MUSIM))
    d15 = json.load(open(DASAR))
    d = bangun(m, d15, json.load(open(LUAS)))
    with open(KELUAR, "w") as f:
        json.dump(d, f, ensure_ascii=False, separators=(",", ":"))
    print(f"kumulatif.json: {os.path.getsize(KELUAR) / 1024:.0f} KB, hari ke-{d['hari_ke']} ({d['sd']})")
    print(" ", d["kalimat"])
    print(" ", {k: v for k, v in d["nasional"]["banding"].items()}, d.get("luas_ha", {}).get("nilai"))


def dasar2015(berkas):
    M = importlib.import_module("musim_harian")
    M.AWAL = 2015
    hit = M.hitung_csv("2015-12-31", berkas).get("2015", {})
    nas = [sum(s[i] for s in hit.values()) for i in range(365)]
    with open(DASAR, "w") as f:
        json.dump({"sumber": "NASA FIRMS MODIS C6.1 + VIIRS S-NPP arsip standar, semua keyakinan, hari WIB, provinsi menurut batas BIG; tanpa NOAA-20",
                   "tahun": "2015", "nasional": nas, "prov": hit}, f, separators=(",", ":"))
    print(f"data/kumulatif_2015.json: total {sum(nas)} titik, {os.path.getsize(DASAR) / 1024:.0f} KB")


def uji():
    assert kum([1, 2, 3], 2) == 3 and kum([1], 2) is None
    assert kurva(list(range(1, 11)), 366) == [28, 55] and kurva([1] * 14, 9) == [7, 9]
    s = {"ini": [1] * 10, "2015": [2] * 365, "2019": [4] * 365, "2023": [1] * 365, "2020": [5] * 366}
    b = baris(s, 10)
    assert b["banding"]["2015"] == {"titik": 20, "persen": 50} and b["banding"]["2019"]["persen"] == 25
    assert b["banding"]["rerata_2019_2025"]["titik"] == round((40 + 10 + 50) / 3)
    assert "50% dari 2015" in kalimat("Indonesia", b, "2026", 10) and kalimat("X", {"banding": {}, "ini": 1}, "2026", 1) is None
    m = {"tahun": ["2025", "2026"], "sd": "2026-01-10", "nasional": {"2025": [1] * 365, "2026": [1] * 10}, "prov": {"14": {"2025": [1] * 365, "2026": [1] * 10}}}
    r = bangun(m, {"nasional": [2] * 365, "prov": {"14": [2] * 365}})
    assert r["hari_ke"] == 10 and "50%" in r["kalimat"] and r["prov"]["14"]["nama"] == "Riau"
    print("kumulatif.py: uji lulus")


if __name__ == "__main__":
    a = sys.argv[1:]
    if a == ["uji"]:
        uji()
    elif a[:1] == ["dasar2015"] and len(a) > 1:
        dasar2015(a[1:])
    else:
        main()
