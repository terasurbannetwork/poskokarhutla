"""Kompleks api x areal konsesi: perusahaan pemegang izin di lokasi titik panas tiap kompleks.

Pakai:  python3 scripts/data/konsesi_kompleks.py        # setelah harian.py -> public/data/kompleks_konsesi.json
        python3 scripts/data/konsesi_kompleks.py uji    # uji sintetis (tanpa berkas data) + invarian berkas hasil

Kompleks dicocokkan lewat LOKASI titik panasnya (id K0001.. diurut ulang tiap hari): titik VIIRS 7 hari yang dipakai
harian.py (sensor != MODIS, keyakinan >= nominal) dimasukkan ke kompleks yang lambungnya memuat titik itu, lalu tiap titik
diuji terhadap poligon konsesi, kawasan hutan, dan gambut. Bahasa keluaran netral: "titik panas berada di dalam areal
konsesi X" -- bukan tuduhan siapa yang membakar. Batas konsesi berumur (lihat KONSESI.md).

Keluaran:
  kompleks[id] = {lat, lon, n, luar, gambut, kawasan{fungsi: porsi}, perusahaan[{nama, grup, jenis, izin, tgl_izin, status,
                  sumber, tahun_data, n, porsi, luas_ha, sanksi[id]}]}
  perusahaan[] = peringkat 7 hari: {nama, grup, jenis, n, luas_ha, kompleks[id], sanksi[id], musim}
  harian{kunci: {tanggal: n}} = tali musim (dibawa antar-jalan lewat cache public/data), musim = sejak 1 Jan tahun berjalan.
"""
import datetime as dt, json, math, os, sys

AKAR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "../..")
DATA = os.path.join(AKAR, "public/data")
sys.path.insert(0, os.path.join(AKAR, "scripts/data"))
from wilayah import _di_dalam  # noqa: E402

SEL = 0.1
PIKSEL_HA = 0.375 * 0.375 * 100  # sama dengan harian.py


def kunci(nama):  # salinan scripts/scrape/konsesi.py (tanpa impor modul scrape di jalur harian)
    import re
    n = re.sub(r"\(.*?\)|\bD\.?\s?H\.?\b.*", " ", (nama or "").upper())
    n = re.sub(r"[^A-Z0-9& ]", " ", n)
    n = re.sub(r"\b(PT|TBK|CV|PERSERO|KOPERASI|KOP|COY|CO|LTD|INC)\b", " ", n)
    n = re.sub(r"\bTBR\b", "TIMBER", n).replace("DJ", "J").replace("TJ", "C").replace("OE", "U")
    n = re.sub(r"(\s+(UNIT|BLOK)\b.*|\s+(\d+|I{1,3}|IV|V|VI{1,3}))+$", "", " ".join(n.split()))
    return n.replace(" ", "")  # "WANA LESTARI" = "WANALESTARI"


class Indeks:
    """Semua poligon yang memuat sebuah titik (bukan cuma yang pertama: konsesi bisa tumpang tindih)."""

    def __init__(self, fitur):
        self.sel = {}
        for i, f in enumerate(fitur):
            g = f["geometry"]
            if not g or g["type"] not in ("Polygon", "MultiPolygon"):
                continue
            for poli in (g["coordinates"] if g["type"] == "MultiPolygon" else [g["coordinates"]]):
                xs, ys = [c[0] for c in poli[0]], [c[1] for c in poli[0]]
                kotak = (min(xs), min(ys), max(xs), max(ys))
                for gx in range(math.floor(kotak[0] / SEL), math.floor(kotak[2] / SEL) + 1):
                    for gy in range(math.floor(kotak[1] / SEL), math.floor(kotak[3] / SEL) + 1):
                        self.sel.setdefault((gx, gy), []).append((kotak, poli, i))

    def cari(self, lon, lat):
        hasil = set()
        for kotak, poli, i in self.sel.get((math.floor(lon / SEL), math.floor(lat / SEL)), ()):
            if i not in hasil and kotak[0] <= lon <= kotak[2] and kotak[1] <= lat <= kotak[3] \
                    and _di_dalam(lon, lat, poli[0]) and not any(_di_dalam(lon, lat, h) for h in poli[1:]):
                hasil.add(i)
        return hasil


def pasang_kompleks(kluster, titik):
    """Titik -> id kompleks. Lambung (Polygon) memuat titik; titik di tepi lambung / kompleks Point -> pusat terdekat <= 3 km."""
    idx = Indeks(kluster)
    pusat = {}
    for i, f in enumerate(kluster):
        p = f["properties"]
        pusat.setdefault((math.floor(p["lon"] / SEL), math.floor(p["lat"] / SEL)), []).append(i)
    hasil = []
    for lat, lon in titik:
        kena = idx.cari(lon, lat)
        if kena:
            hasil.append(min(kena))
            continue
        gx, gy, best, d0 = math.floor(lon / SEL), math.floor(lat / SEL), None, (3 / 111) ** 2
        for dx in (-1, 0, 1):
            for dy in (-1, 0, 1):
                for i in pusat.get((gx + dx, gy + dy), ()):
                    p = kluster[i]["properties"]
                    d = (p["lat"] - lat) ** 2 + ((p["lon"] - lon) * math.cos(math.radians(lat))) ** 2
                    if d < d0:
                        best, d0 = i, d
        hasil.append(best)
    return hasil


def hitung(kluster, titik, tgl, konsesi, kawasan, gambut, sanksi, lama=None, acuan=None):
    """kluster/konsesi/kawasan/gambut: list fitur GeoJSON; titik: [(lat, lon)]; tgl: tanggal WIB ISO tiap titik."""
    milik = pasang_kompleks(kluster, titik)
    # HTI/HPH yang di lokasinya tidak ada PBPH aktif (Kemenhut Mei 2026) = izin kemungkinan berakhir: tidak dijadikan pemegang
    konsesi = [f for f in konsesi if f["properties"].get("aktif") is not False]
    ik, ikw, igb = Indeks(konsesi), Indeks(kawasan), Indeks(gambut)
    s_idx = {}
    for s in sanksi:
        for nm in [s["nama"], *s.get("alias", [])]:
            s_idx.setdefault(kunci(nm), []).append(s["id"])
    K = {}
    harian = {k: dict(v) for k, v in ((lama or {}).get("harian") or {}).items()}
    hari_ini = {}  # (kunci, tanggal) -> n dari berkas titik hari ini; menimpa tali lama untuk tanggal yang sama
    for (lat, lon), i, t in zip(titik, milik, tgl):
        if i is None:
            continue
        kid = kluster[i]["properties"]["id"]
        k = K.setdefault(kid, {"n": 0, "luar": 0, "gb": 0, "kw": {}, "per": {}, "px": {}})
        k["n"] += 1
        hit = ik.cari(lon, lat)
        if not hit:
            k["luar"] += 1
        pix = (round(lat / 0.003375), round(lon * math.cos(math.radians(lat)) / 0.003375))
        for j in {kunci(konsesi[j]["properties"]["nama"]) + "|" + konsesi[j]["properties"]["jenis"]: j for j in hit}.values():
            pr = konsesi[j]["properties"]
            ku = kunci(pr["nama"]) + "|" + pr["jenis"]
            k["per"].setdefault(ku, [0, pr])[0] += 1
            k["px"].setdefault(ku, set()).add(pix)
            hari_ini[ku, t] = hari_ini.get((ku, t), 0) + 1
        if igb.cari(lon, lat):
            k["gb"] += 1
        for j in ikw.cari(lon, lat):
            f = kawasan[j]["properties"]["fungsi"]
            k["kw"][f] = k["kw"].get(f, 0) + 1
    for (ku, t), n in hari_ini.items():
        harian.setdefault(ku, {})[t] = n

    def baris(ku, pr, n, total, px):
        return {"nama": pr["nama"], "grup": pr.get("grup", ""), "jenis": pr["jenis"], "izin": pr.get("izin", ""),
                "tgl_izin": pr.get("tgl_izin", ""), "status": pr.get("status", ""), "sumber": pr["sumber"],
                "tahun_data": pr["tahun_data"], "n": n, "porsi": round(n / total, 3), "luas_ha": round(len(px) * PIKSEL_HA),
                "sanksi": s_idx.get(ku.split("|")[0], [])}

    keluar, rangk = {}, {}
    for f in kluster:
        p = f["properties"]
        k = K.get(p["id"])
        if not k:
            continue
        per = sorted((baris(ku, pr, n, k["n"], k["px"][ku]) for ku, (n, pr) in k["per"].items()), key=lambda r: -r["n"])
        if not per and not k["gb"] and not k["kw"]:
            continue  # di luar konsesi, kawasan, gambut: tidak perlu dicatat (UI: tidak ada entri = 100% di luar konsesi)
        keluar[p["id"]] = {"lat": p["lat"], "lon": p["lon"], "n": k["n"], "luar": round(k["luar"] / k["n"], 3),
                           "gambut": round(k["gb"] / k["n"], 3), "kawasan": {a: round(b / k["n"], 3) for a, b in k["kw"].items()},
                           "perusahaan": per}
        for ku, (n, pr) in k["per"].items():
            a = rangk.setdefault(ku, {**{x: y for x, y in baris(ku, pr, 0, 1, ()).items() if x in ("nama", "grup", "jenis", "sanksi", "sumber", "tahun_data")},
                                      "n": 0, "px": set(), "kompleks": []})
            a["n"] += n
            a["px"] |= k["px"][ku]
            a["kompleks"].append(p["id"])
    th = (acuan or dt.date.today().isoformat())[:4]
    per = []
    for ku, a in rangk.items():
        a["luas_ha"] = round(len(a.pop("px")) * PIKSEL_HA)
        a["musim"] = sum(n for t, n in harian.get(ku, {}).items() if t[:4] == th)
        per.append(a)
    for ku, h in harian.items():  # perusahaan tanpa api 7 hari ini tetap masuk peringkat musim
        if ku not in rangk and sum(n for t, n in h.items() if t[:4] == th):
            pr = next((f["properties"] for f in konsesi if kunci(f["properties"]["nama"]) + "|" + f["properties"]["jenis"] == ku), None)
            if pr:
                per.append({"nama": pr["nama"], "grup": pr.get("grup", ""), "jenis": pr["jenis"], "sanksi": s_idx.get(ku.split("|")[0], []),
                            "sumber": pr["sumber"], "tahun_data": pr["tahun_data"], "n": 0, "luas_ha": 0, "kompleks": [],
                            "musim": sum(n for t, n in h.items() if t[:4] == th)})
    per.sort(key=lambda a: (-a["n"], -a["musim"]))
    # tali musim: buang tanggal tahun lalu supaya berkas tidak tumbuh tanpa batas
    harian = {ku: {t: n for t, n in h.items() if t[:4] == th} for ku, h in harian.items()}
    harian = {ku: h for ku, h in harian.items() if h}
    return {"kompleks": keluar, "perusahaan": per, "harian": harian}


def main():
    kl = json.load(open(os.path.join(DATA, "kluster.json")))["features"]
    hs = json.load(open(os.path.join(DATA, "hotspot.json")))
    c = {k: i for i, k in enumerate(hs["kolom"])}
    acuan = hs["acuan"]
    th = int(acuan[:4])
    rows = [r for r in hs["baris"] if r[c["sensor"]] != "M" and r[c["keyakinan"]] >= 1 and r[c["jam"]] >= -168]
    titik = [(r[c["lat"]], r[c["lon"]]) for r in rows]
    # tgl_wib "MM-DD": tahun dari acuan; Desember saat acuan Januari = tahun lalu
    tgl = [f"{th - (r[c['tgl_wib']][:2] == '12' and acuan[5:7] == '01')}-{r[c['tgl_wib']]}" for r in rows]
    L = lambda n: json.load(open(os.path.join(DATA, "lahan", n)))
    ks, kw, gb, sk = L("konsesi.geojson"), L("kawasan.geojson"), L("gambut.geojson"), L("sanksi_karhutla.json")
    jalur = os.path.join(DATA, "kompleks_konsesi.json")
    lama = json.load(open(jalur)) if os.path.exists(jalur) else None
    h = hitung(kl, titik, tgl, ks["features"], kw["features"], gb["features"], sk["kasus"], lama, acuan)
    h["dibuat"] = dt.datetime.now(dt.timezone.utc).isoformat(timespec="minutes")
    h["acuan"] = acuan
    h["musim_sejak"] = (lama or {}).get("musim_sejak") if (lama or {}).get("musim_sejak", "")[:4] == acuan[:4] else min(tgl, default=acuan[:10])
    h["sumber"] = ks.get("sumber", {})
    h["catatan"] = ("Titik panas berada di dalam areal konsesi menurut peta batas izin; ini bukan penetapan siapa yang membakar. "
                    "Batas konsesi: sawit Kemenhut 2012/2014 (via GFW), HTI Trase 2020-2022, HPH Kemenhut 2014 (via GFW), "
                    "tambang PPKH Kemenhut Jan 2026; bisa sudah berubah. Pastikan ke KPH/Dinas/ATR sebelum tindakan hukum.")
    with open(jalur, "w") as f:
        json.dump(h, f, ensure_ascii=False, separators=(",", ":"))
    n_ks = sum(1 for v in h["kompleks"].values() if v["perusahaan"])
    print(f"kompleks_konsesi.json: {n_ks} kompleks berisi titik di konsesi, {len(h['perusahaan'])} perusahaan, "
          f"{os.path.getsize(jalur) / 1e6:.2f} MB", file=sys.stderr)


def uji():
    kotak = lambda x0, y0, x1, y1: {"type": "Polygon", "coordinates": [[[x0, y0], [x1, y0], [x1, y1], [x0, y1], [x0, y0]]]}
    kl = [{"properties": {"id": "K0001", "lat": .5, "lon": 100.5}, "geometry": kotak(100, 0, 101, 1)},
          {"properties": {"id": "K0002", "lat": 5.0, "lon": 105.0}, "geometry": {"type": "Point", "coordinates": [105, 5]}}]
    ks = [{"properties": {"nama": "PT Api Jaya 1", "jenis": "sawit", "grup": "Grup A", "sumber": "uji", "tahun_data": 2014}, "geometry": kotak(100, 0, 100.5, 1)},
          {"properties": {"nama": "PT. API JAYA 2", "jenis": "sawit", "sumber": "uji", "tahun_data": 2014}, "geometry": kotak(100.2, 0, 100.6, 1)},
          {"properties": {"nama": "PT Hutan Lain", "jenis": "hti", "sumber": "uji", "tahun_data": 2022}, "geometry": kotak(100.5, .5, 101, 1)}]
    kw = [{"properties": {"fungsi": "HK"}, "geometry": kotak(100.8, 0, 101, .2)}]
    gb = [{"properties": {}, "geometry": kotak(100, 0, 100.1, .1)}]
    sk = [{"id": "x-perdata", "nama": "PT Api Jaya"}]
    # 4 titik di Api Jaya (1 di tumpang tindih blok 1 & 2 -> tetap dihitung SEKALI), 2 di Hutan Lain, 2 di luar, 1 jauh (tak berkompleks)
    t = [(.05, 100.05), (.5, 100.1), (.5, 100.3), (.5, 100.45), (.7, 100.7), (.9, 100.9), (.1, 100.9), (.3, 100.7), (-5, 120)]
    lama = {"harian": {"APIJAYA|sawit": {"2026-01-03": 10, "2025-12-31": 99}}}
    h = hitung(kl, t, ["2026-10-12"] * len(t), ks, kw, gb, sk, lama, "2026-10-12")
    k = h["kompleks"]["K0001"]
    assert k["n"] == 8, k["n"]
    per = {r["nama"]: r for r in k["perusahaan"]}
    assert per["PT Api Jaya 1"]["n"] == 4 and per["PT Api Jaya 1"]["porsi"] == .5, per  # blok ganda tidak dobel
    assert per["PT Hutan Lain"]["n"] == 2 and per["PT Hutan Lain"]["porsi"] == .25, per
    assert k["luar"] == .25 and k["gambut"] == .125 and k["kawasan"] == {"HK": .125}, k
    assert per["PT Api Jaya 1"]["sanksi"] == ["x-perdata"] and per["PT Hutan Lain"]["sanksi"] == [], per
    assert per["PT Api Jaya 1"]["grup"] == "Grup A"
    assert sum(r["porsi"] for r in k["perusahaan"]) + k["luar"] <= 1.0001  # tanpa tumpang tindih, porsi tidak melebihi 100%
    assert "K0002" not in h["kompleks"]  # tidak ada titik
    r0 = h["perusahaan"][0]
    assert r0["nama"] == "PT Api Jaya 1" and r0["n"] == 4 and r0["kompleks"] == ["K0001"], r0
    assert r0["musim"] == 14, r0["musim"]  # 10 (Jan 2026, tali lama) + 4 hari ini; Des 2025 di luar musim
    assert "2025-12-31" not in h["harian"]["APIJAYA|sawit"]
    # jalan kedua di hari yang sama tidak menggandakan tali musim
    h2 = hitung(kl, t, ["2026-10-12"] * len(t), ks, kw, gb, sk, h, "2026-10-12")
    assert h2["perusahaan"][0]["musim"] == 14, h2["perusahaan"][0]["musim"]
    assert kunci("PT. API JAYA 2") == kunci("Api Jaya, PT") == "APIJAYA"
    # berkas hasil (kalau ada): invarian
    jalur = os.path.join(DATA, "kompleks_konsesi.json")
    if os.path.exists(jalur):
        d = json.load(open(jalur))
        for kid, v in d["kompleks"].items():
            assert 0 <= v["luar"] <= 1 and 0 <= v["gambut"] <= 1, kid
            assert all(0 < r["porsi"] <= 1 and r["nama"] and r["jenis"] for r in v["perusahaan"]), kid
        assert all(a["n"] >= 0 and a["musim"] >= 0 and a["nama"] for a in d["perusahaan"])
    print("ok")


if __name__ == "__main__":
    uji() if sys.argv[1:] == ["uji"] else main()
