"""Titik panas kumulatif tahun berjalan vs tahun parah pada hari yang sama -> public/data/kumulatif.json

Dua dasar yang TIDAK dicampur:
  banding  (semua satelit M + N + N20, public/data/musim_harian.json, terbarui tiap hari): 2019, 2023 dan rerata 2019-2025 (NOAA-20
           ada sejak April 2018, jadi 2019-2026 satu definisi) vs tahun berjalan.
  setara_2015 (MODIS + S-NPP saja, data/kumulatif_mn.json): 2015 belum punya NOAA-20 (terbang 2017), jadi 2015, 2019, 2023, dan tahun
           berjalan dihitung ulang tanpa NOAA-20 supaya persen vs 2015 sah. Berkas ini dibangun LOKAL dari arsip FIRMS dan berhenti di
           `sd`-nya sendiri (tanggal potong ditulis di keluaran); bangun ulang untuk memperpanjang:
    SENSOR=MODIS python3 scripts/data/firms.py 2015-01-01 2015-12-31 > m2015.csv   (juga 2019, 2023, tahun berjalan)
    python3 scripts/data/firms.py 2015-01-01 2015-12-31 > v2015.csv                (VIIRS_SNPP, juga 2019, 2023, tahun berjalan)
    python3 scripts/data/kumulatif.py dasar_mn <sd> m2015.csv v2015.csv m2019.csv v2019.csv ...
Hari dibandingkan = hari ke-n dalam tahun (1 Jan = 1); 29 Feb tahun kabisat menggeser rerata paling banyak 1 hari.
Kurva disimpan kumulatif tiap 7 hari + hari ke-n, nasional dan per provinsi. Luas terbakar: hanya total tahunan SiPongi (luas_resmi.json).

Pakai:  python3 scripts/data/kumulatif.py   |   python3 scripts/data/kumulatif.py uji
"""

import datetime as dt, importlib, json, os, sys

sys.path.insert(0, os.path.dirname(__file__))
from wilayah import AKAR, PROVINSI

MUSIM = os.path.join(AKAR, "public/data/musim_harian.json")
DASAR = os.path.join(AKAR, "data/kumulatif_mn.json")
LUAS = os.path.join(AKAR, "public/data/luas_resmi.json")
KELUAR = os.path.join(AKAR, "public/data/kumulatif.json")
RERATA = [str(y) for y in range(2019, 2026)]


def kum(seri, n):
    """Jumlah n hari pertama; None bila serinya lebih pendek dari n."""
    return sum(seri[:n]) if len(seri) >= n else None


def kurva(seri, n_maks=366):
    """Kumulatif di hari 7, 14, ... <= min(len, n_maks) + hari terakhir."""
    m = min(len(seri), n_maks)
    return [sum(seri[:k]) for k in list(range(7, m + 1, 7)) + ([m] if m % 7 else [])]


def persen(a, b):
    return round(100 * a / b) if a is not None and b else None


def baris(seri, n, banding, rata=()):
    """seri: {tahun: [harian], "ini": [...]}; banding: tahun pembanding; rata: tahun untuk rerata. -> perbandingan di hari ke-n + kurva."""
    ini = kum(seri["ini"], n)
    cmp = {y: {"titik": kum(seri[y], n)} for y in banding if y in seri}
    kv = {y: kurva(seri[y]) for y in banding if y in seri}
    ada = [y for y in rata if y in seri and len(seri[y]) >= 365]
    if ada:
        v = [kum(seri[y], n) for y in ada]
        cmp["rerata"] = {"titik": round(sum(v) / len(v))}
        kv["rerata"] = [round(sum(c) / len(c)) for c in zip(*[kurva(seri[y]) for y in ada])]
    for c in cmp.values():
        c["persen"] = persen(ini, c["titik"])
    kv["ini"] = kurva(seri["ini"], n)
    return {"ini": ini, "banding": cmp, "kurva": kv}


def kalimat(nama, b, tahun, n, vs="2015", dasar=""):
    c = b["banding"].get(vs)
    if not c or c["persen"] is None:
        return None
    f = lambda x: f"{x:,}".replace(",", ".")
    label = "rerata 2019\u20132025" if vs == "rerata" else vs
    return (f"Sampai minggu ke-{-(-n // 7)}, titik panas{dasar} {tahun} di {nama} {'sudah' if c['persen'] >= 100 else 'baru'} "
            f"{c['persen']}% dari {label} pada minggu yang sama ({f(b['ini'])} vs {f(c['titik'])}).")


def bangun(m, mn, luas=None):
    """m: musim_harian.json (semua satelit); mn: kumulatif_mn.json (MODIS + S-NPP) atau None."""
    tahun = m["tahun"][-1]
    n = (dt.date.fromisoformat(m["sd"]) - dt.date(int(tahun), 1, 1)).days + 1
    ambil = lambda kode: ({y: (m["nasional"][y] if kode is None else m["prov"][kode][y]) for y in m["nasional"] if y != tahun}
                          | {"ini": m["nasional"][tahun] if kode is None else m["prov"][kode][tahun]})
    out = {"nasional": {**baris(ambil(None), n, ["2019", "2023"], RERATA), "nama": "Indonesia"}, "prov": {}}
    for k in m["prov"]:
        out["prov"][k] = {**baris(ambil(k), n, ["2019", "2023"], RERATA), "nama": PROVINSI.get(k, k)}
    res = {"versi": 2, "dibuat": dt.datetime.now(dt.timezone.utc).replace(microsecond=0).isoformat(), "tahun": tahun, "sd": m["sd"], "hari_ke": n,
           "rerata_tahun": [RERATA[0], RERATA[-1]],
           "hari_kurva": "hari ke-7, 14, ... lalu hari ke-n (ini) atau hari terakhir tahun (pembanding); nilai = titik panas kumulatif",
           "definisi": "banding: M + N + N20, semua keyakinan, hari WIB (musim_harian.json). setara_2015: M + N saja, di tanggal potongnya sendiri.",
           **out}
    if mn:
        ny = (dt.date.fromisoformat(mn["sd"]) - dt.date(int(tahun), 1, 1)).days + 1
        def mn_seri(kode):
            g = lambda y: mn["tahun"][y]["nasional"] if kode is None else mn["tahun"][y]["prov"].get(kode, [0] * 365)
            return {**{y: g(y) for y in mn["tahun"] if y != tahun}, "ini": g(tahun)[:ny]}
        sz = {"sd": mn["sd"], "hari_ke": ny, "dasar": "MODIS + VIIRS S-NPP", "nasional": {**baris(mn_seri(None), ny, ["2015", "2019", "2023"]), "nama": "Indonesia"}, "prov": {}}
        for k in m["prov"]:
            sz["prov"][k] = {**baris(mn_seri(k), ny, ["2015", "2019", "2023"]), "nama": PROVINSI.get(k, k)}
        for b in [sz["nasional"], *sz["prov"].values()]:
            b["kalimat"] = kalimat(b["nama"], b, tahun, ny, "2015", " MODIS + S-NPP")
        res["setara_2015"] = sz
        res["kalimat"] = sz["nasional"]["kalimat"]
    for b in [out["nasional"], *out["prov"].values()]:
        b["kalimat_rerata"] = kalimat(b["nama"], b, tahun, n, "rerata")
    res["batasan"] = ["Persen vs 2015 hanya memakai MODIS + VIIRS S-NPP (NOAA-20 belum terbang di 2015); perbandingan dengan 2019, 2023, dan rerata memakai semua satelit.",
                      "Dasar MODIS + S-NPP dibangun lokal dan berhenti di tanggal potongnya (setara_2015.sd), tidak ikut bertambah tiap hari.",
                      "Titik panas bukan luas terbakar dan bukan jumlah kebakaran; satu kebakaran besar bisa menghasilkan banyak titik di hari yang sama.",
                      "Hari dibandingkan = hari ke-n dalam tahun; 29 Februari tahun kabisat menggeser paling banyak 1 hari pada rerata."]
    if luas:
        ha = {y: round(sum(v[i] for v in luas["ha"].values() if v[i] is not None)) for i, y in enumerate(luas["tahun"]) if y in ("2019", "2023", tahun)}
        res["luas_ha"] = {"nilai": ha, "sampai": luas.get("sampai", {}), "catatan": "Total tahunan SiPongi (indikasi dari titik panas, bukan citra); 2015 tidak ada di repo; tahun berjalan sebagian."}
    return res


def main():
    m = json.load(open(MUSIM))
    mn = json.load(open(DASAR)) if os.path.exists(DASAR) else None
    d = bangun(m, mn, json.load(open(LUAS)))
    with open(KELUAR, "w") as f:
        json.dump(d, f, ensure_ascii=False, separators=(",", ":"))
    print(f"kumulatif.json: {os.path.getsize(KELUAR) / 1024:.0f} KB, semua satelit hari ke-{d['hari_ke']} ({d['sd']})")
    print(" ", d.get("kalimat"))
    print("  semua satelit:", d["nasional"]["banding"], d["nasional"]["kalimat_rerata"])


def dasar_mn(sd, berkas):
    M = importlib.import_module("musim_harian")
    M.AWAL = 2015
    hit = M.hitung_csv(sd, berkas)
    tahun = {}
    for y, p in hit.items():
        if y in ("2015", "2019", "2023", sd[:4]):
            n = M.hari_tahun(y) if y != sd[:4] else (dt.date.fromisoformat(sd) - dt.date(int(y), 1, 1)).days + 1
            p = {k: v[:n] for k, v in p.items()}
            tahun[y] = {"nasional": [sum(v[i] for v in p.values()) for i in range(n)], "prov": p}
    with open(DASAR, "w") as f:
        json.dump({"sumber": "NASA FIRMS MODIS C6.1 + VIIRS S-NPP arsip standar (SP) + NRT, semua keyakinan, hari WIB, provinsi menurut batas BIG; tanpa NOAA-20",
                   "sd": sd, "tahun": tahun}, f, separators=(",", ":"))
    print(f"data/kumulatif_mn.json: {os.path.getsize(DASAR) / 1024:.0f} KB", {y: sum(v["nasional"]) for y, v in tahun.items()})


def uji():
    assert kum([1, 2, 3], 2) == 3 and kum([1], 2) is None
    assert kurva(list(range(1, 11))) == [28, 55] and kurva([1] * 14, 9) == [7, 9]
    s = {"ini": [1] * 10, "2015": [2] * 365, "2019": [4] * 365, "2023": [1] * 365, "2020": [5] * 366}
    b = baris(s, 10, ["2015", "2019", "2023"], RERATA)
    assert b["banding"]["2015"] == {"titik": 20, "persen": 50} and b["banding"]["2019"]["persen"] == 25
    assert b["banding"]["rerata"]["titik"] == round((40 + 10 + 50) / 3) and "2015" not in RERATA
    k = kalimat("Indonesia", b, "2026", 10, "2015", " MODIS + S-NPP")
    assert k == "Sampai minggu ke-2, titik panas MODIS + S-NPP 2026 di Indonesia baru 50% dari 2015 pada minggu yang sama (10 vs 20).", k
    assert "sudah 200% dari rerata 2019\u20132025" in kalimat("X", {"banding": {"rerata": {"titik": 5, "persen": 200}}, "ini": 10}, "2026", 7, "rerata") and kalimat("X", {"banding": {}, "ini": 1}, "2026", 1) is None
    m = {"tahun": ["2025", "2026"], "sd": "2026-01-10", "nasional": {"2025": [1] * 365, "2026": [1] * 10}, "prov": {"14": {"2025": [1] * 365, "2026": [1] * 10}}}
    mn = {"sd": "2026-01-08", "tahun": {"2015": {"nasional": [2] * 365, "prov": {"14": [2] * 365}}, "2026": {"nasional": [1] * 8, "prov": {"14": [1] * 8}}}}
    r = bangun(m, mn)
    assert r["hari_ke"] == 10 and r["setara_2015"]["hari_ke"] == 8 and "baru 50% dari 2015" in r["kalimat"] and r["prov"]["14"]["nama"] == "Riau"
    assert bangun(m, None).get("kalimat") is None
    print("kumulatif.py: uji lulus")


if __name__ == "__main__":
    a = sys.argv[1:]
    if a == ["uji"]:
        uji()
    elif a[:1] == ["dasar_mn"] and len(a) > 2:
        dasar_mn(a[1], a[2:])
    else:
        main()
