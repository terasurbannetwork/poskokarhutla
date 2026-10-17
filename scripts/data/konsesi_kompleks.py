"""Kompleks api x areal konsesi: porsi titik panas tiap kompleks yang berada di areal konsesi, PER JENIS konsesi.

Pakai:  python3 scripts/data/konsesi_kompleks.py        # setelah harian.py -> public/data/kompleks_konsesi.json
        python3 scripts/data/konsesi_kompleks.py uji    # uji sintetis (tanpa berkas data) + invarian berkas hasil

Keputusan pemilik 14 Okt 2026: TANPA nama perusahaan, grup, nomor izin, atau kasus sanksi -- hanya status lahan
(konsesi sawit / HTI kayu pulp / HPH hutan alam / izin tambang) dengan porsi titik panas dan luas indikatif.

Kompleks dicocokkan lewat LOKASI titik panasnya (id K0001.. diurut ulang tiap hari): titik VIIRS 7 hari yang dipakai
harian.py (sensor != MODIS, keyakinan >= nominal) dimasukkan ke kompleks yang lambungnya memuat titik itu, lalu tiap titik
diuji terhadap poligon konsesi, kawasan hutan, dan gambut. Bahasa keluaran netral: "titik panas berada di dalam areal
konsesi sawit" -- bukan tuduhan siapa yang membakar. Batas konsesi berumur (lihat KONSESI.md).

Keluaran (satu titik bisa jatuh di dua jenis yang tumpang tindih; porsi per jenis boleh berjumlah > 1 - luar):
  kompleks[id] = {lat, lon, n, luar, gambut, kawasan{fungsi: porsi}, jenis{sawit|hti|hph|tambang: {n, porsi, luas_ha}}}
  jenis[]      = ringkasan 7 hari per jenis: {jenis, n, luas_ha, kompleks (jumlah), musim, prov{kode: n}}
  total        = {n (titik di kompleks), konsesi (titik di areal konsesi mana pun), kompleks}
  harian{jenis: {tanggal: n}} = tali musim (dibawa antar-jalan lewat cache public/data), musim = sejak 1 Jan tahun berjalan.
"""
import datetime as dt, json, math, os, re, sys

AKAR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "../..")
DATA = os.path.join(AKAR, "public/data")
sys.path.insert(0, os.path.join(AKAR, "scripts/data"))
from wilayah import _di_dalam  # noqa: E402

SEL = 0.1
PIKSEL_HA = 0.375 * 0.375 * 100  # sama dengan harian.py
JENIS = {"sawit", "hti", "hph", "tambang"}


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


def hitung(kluster, titik, tgl, konsesi, kawasan, gambut, lama=None, acuan=None):
    """kluster/konsesi/kawasan/gambut: list fitur GeoJSON; titik: [(lat, lon)]; tgl: tanggal WIB ISO tiap titik."""
    milik = pasang_kompleks(kluster, titik)
    # HTI/HPH yang di lokasinya tidak ada PBPH aktif (Kemenhut Mei 2026) = izin kemungkinan berakhir: tidak dihitung
    konsesi = [f for f in konsesi if f["properties"].get("aktif") is not False]
    ik, ikw, igb = Indeks(konsesi), Indeks(kawasan), Indeks(gambut)
    K = {}
    harian = {}
    for ku, h in ((lama or {}).get("harian") or {}).items():  # berkas lama berkunci "NAMA|jenis": dijumlah per jenis
        j = ku.split("|")[-1]
        for t, n in h.items():
            harian.setdefault(j, {})[t] = harian.get(j, {}).get(t, 0) + n
    hari_ini, n_kons = {}, 0  # (jenis, tanggal) -> n dari berkas titik hari ini; menimpa tali lama untuk tanggal yang sama
    for (lat, lon), i, t in zip(titik, milik, tgl):
        if i is None:
            continue
        kid = kluster[i]["properties"]["id"]
        k = K.setdefault(kid, {"n": 0, "luar": 0, "gb": 0, "kw": {}, "jn": {}, "px": {}})
        k["n"] += 1
        jenis = {konsesi[j]["properties"]["jenis"] for j in ik.cari(lon, lat)}
        if not jenis:
            k["luar"] += 1
        else:
            n_kons += 1
        pix = (round(lat / 0.003375), round(lon * math.cos(math.radians(lat)) / 0.003375))
        for j in jenis:  # tiap jenis dihitung SEKALI per titik walau bloknya tumpang tindih
            k["jn"][j] = k["jn"].get(j, 0) + 1
            k["px"].setdefault(j, set()).add(pix)
            hari_ini[j, t] = hari_ini.get((j, t), 0) + 1
        if igb.cari(lon, lat):
            k["gb"] += 1
        for j in ikw.cari(lon, lat):
            f = kawasan[j]["properties"]["fungsi"]
            k["kw"][f] = k["kw"].get(f, 0) + 1
    for (j, t), n in hari_ini.items():
        harian.setdefault(j, {})[t] = n

    keluar, rangk, prov, gambut = {}, {}, {}, {}
    for f in kluster:
        p = f["properties"]
        k = K.get(p["id"])
        if not k:
            continue
        o = prov.setdefault(p.get("prov") or "?", [0, 0])  # [titik di kompleks, titik di konsesi (unik)]: penyebut porsi per provinsi
        o[0] += k["n"]
        o[1] += k["n"] - k["luar"]
        gambut[p.get("prov") or "?"] = gambut.get(p.get("prov") or "?", 0) + k["gb"]  # titik di gambut per provinsi (laporan harian)
        if not k["jn"] and not k["gb"] and not k["kw"]:
            continue  # di luar konsesi, kawasan, gambut: tidak perlu dicatat (UI: tidak ada entri = 100% di luar konsesi)
        keluar[p["id"]] = {"lat": p["lat"], "lon": p["lon"], "n": k["n"], "luar": round(k["luar"] / k["n"], 3),
                           "gambut": round(k["gb"] / k["n"], 3), "kawasan": {a: round(b / k["n"], 3) for a, b in k["kw"].items()},
                           "jenis": {j: {"n": n, "porsi": round(n / k["n"], 3), "luas_ha": round(len(k["px"][j]) * PIKSEL_HA)}
                                     for j, n in sorted(k["jn"].items(), key=lambda x: -x[1])}}
        for j, n in k["jn"].items():
            a = rangk.setdefault(j, {"jenis": j, "n": 0, "px": set(), "kompleks": 0, "prov": {}})
            a["n"] += n
            a["px"] |= k["px"][j]
            a["kompleks"] += 1
            pv = p.get("prov") or "?"
            a["prov"][pv] = a["prov"].get(pv, 0) + n
    th = (acuan or dt.date.today().isoformat())[:4]
    harian = {j: {t: n for t, n in h.items() if t[:4] == th} for j, h in harian.items()}  # buang tahun lalu
    harian = {j: h for j, h in harian.items() if h}
    for j in harian:
        rangk.setdefault(j, {"jenis": j, "n": 0, "px": set(), "kompleks": 0, "prov": {}})
    per = []
    for j, a in rangk.items():
        a["luas_ha"] = round(len(a.pop("px")) * PIKSEL_HA)
        a["musim"] = sum(harian.get(j, {}).values())
        per.append(a)
    per.sort(key=lambda a: (-a["n"], -a["musim"]))
    total = {"n": sum(k["n"] for k in K.values()), "konsesi": n_kons, "kompleks": len(K), "prov": prov, "gambut": gambut}
    return {"kompleks": keluar, "jenis": per, "total": total, "harian": harian}


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
    ks, kw, gb = L("konsesi.geojson"), L("kawasan.geojson"), L("gambut.geojson")
    jalur = os.path.join(DATA, "kompleks_konsesi.json")
    lama = json.load(open(jalur)) if os.path.exists(jalur) else None
    h = hitung(kl, titik, tgl, ks["features"], kw["features"], gb["features"], lama, acuan)
    h["dibuat"] = dt.datetime.now(dt.timezone.utc).isoformat(timespec="minutes")
    h["acuan"] = acuan
    h["musim_sejak"] = (lama or {}).get("musim_sejak") if (lama or {}).get("musim_sejak", "")[:4] == acuan[:4] else min(tgl, default=acuan[:10])
    h["sumber"] = ks.get("sumber", {})
    h["catatan"] = ("Titik panas berada di dalam areal konsesi menurut peta batas izin; ini bukan penetapan siapa yang membakar. "
                    "Batas konsesi: sawit Kemenhut 2012/2014 (via GFW), HTI Trase 2020-2022, HPH Kemenhut 2014 (via GFW), "
                    "tambang PPKH Kemenhut Jan 2026; bisa sudah berubah. Pastikan ke KPH/Dinas/ATR sebelum tindakan hukum.")
    with open(jalur, "w") as f:
        json.dump(h, f, ensure_ascii=False, separators=(",", ":"))
    n_ks = sum(1 for v in h["kompleks"].values() if v["jenis"])
    print(f"kompleks_konsesi.json: {n_ks} kompleks berisi titik di konsesi, {h['total']['konsesi']}/{h['total']['n']} titik, "
          f"{os.path.getsize(jalur) / 1e6:.2f} MB", file=sys.stderr)


def uji():
    kotak = lambda x0, y0, x1, y1: {"type": "Polygon", "coordinates": [[[x0, y0], [x1, y0], [x1, y1], [x0, y1], [x0, y0]]]}
    kl = [{"properties": {"id": "K0001", "lat": .5, "lon": 100.5, "prov": "14"}, "geometry": kotak(100, 0, 101, 1)},
          {"properties": {"id": "K0002", "lat": 5.0, "lon": 105.0, "prov": "14"}, "geometry": {"type": "Point", "coordinates": [105, 5]}}]
    ks = [{"properties": {"nama": "PT Api Jaya 1", "jenis": "sawit", "sumber": "uji", "tahun_data": 2014}, "geometry": kotak(100, 0, 100.5, 1)},
          {"properties": {"nama": "PT. API JAYA 2", "jenis": "sawit", "sumber": "uji", "tahun_data": 2014}, "geometry": kotak(100.2, 0, 100.6, 1)},
          {"properties": {"nama": "PT Hutan Lain", "jenis": "hti", "sumber": "uji", "tahun_data": 2022}, "geometry": kotak(100.5, .5, 101, 1)},
          {"properties": {"jenis": "hph", "aktif": False}, "geometry": kotak(100, 0, 101, 1)}]  # izin berakhir: diabaikan
    kw = [{"properties": {"fungsi": "HK"}, "geometry": kotak(100.8, 0, 101, .2)}]
    gb = [{"properties": {}, "geometry": kotak(100, 0, 100.1, .1)}]
    # 4 titik di sawit (1 di tumpang tindih blok 1 & 2 -> tetap dihitung SEKALI), 2 di HTI, 2 di luar, 1 jauh (tak berkompleks)
    t = [(.05, 100.05), (.5, 100.1), (.5, 100.3), (.5, 100.45), (.7, 100.7), (.9, 100.9), (.1, 100.9), (.3, 100.7), (-5, 120)]
    lama = {"harian": {"APIJAYA|sawit": {"2026-01-03": 10, "2025-12-31": 99}, "LAIN|sawit": {"2026-01-03": 1}}}  # format lama bernama
    h = hitung(kl, t, ["2026-10-12"] * len(t), ks, kw, gb, lama, "2026-10-12")
    k = h["kompleks"]["K0001"]
    assert k["n"] == 8, k["n"]
    assert k["jenis"]["sawit"] == {"n": 4, "porsi": .5, "luas_ha": k["jenis"]["sawit"]["luas_ha"]} and k["jenis"]["sawit"]["luas_ha"] > 0, k
    assert k["jenis"]["hti"]["n"] == 2 and k["jenis"]["hti"]["porsi"] == .25, k
    assert "hph" not in k["jenis"], k  # izin berakhir tidak dihitung
    assert k["luar"] == .25 and k["gambut"] == .125 and k["kawasan"] == {"HK": .125}, k
    assert sum(v["porsi"] for v in k["jenis"].values()) + k["luar"] <= 1.0001  # tanpa tumpang tindih antarjenis, tidak > 100%
    assert "K0002" not in h["kompleks"]  # tidak ada titik
    r0 = h["jenis"][0]
    assert r0["jenis"] == "sawit" and r0["n"] == 4 and r0["kompleks"] == 1 and r0["prov"] == {"14": 4}, r0
    assert r0["musim"] == 15, r0["musim"]  # 10 + 1 (Jan 2026, tali lama dua kunci bernama dijumlah) + 4 hari ini; Des 2025 di luar
    assert set(h["harian"]) <= {"sawit", "hti", "hph", "tambang"}, h["harian"]  # kunci per jenis, bukan nama
    assert h["total"] == {"n": 8, "konsesi": 6, "kompleks": 1, "prov": {"14": [8, 6]}, "gambut": {"14": 1}}, h["total"]
    # jalan kedua di hari yang sama tidak menggandakan tali musim
    h2 = hitung(kl, t, ["2026-10-12"] * len(t), ks, kw, gb, h, "2026-10-12")
    assert h2["jenis"][0]["musim"] == 15, h2["jenis"][0]["musim"]
    assert "PT" not in json.dumps(h) and "Api" not in json.dumps(h), "nama perusahaan bocor ke keluaran"
    # berkas hasil (kalau ada): invarian + tanpa nama
    jalur = os.path.join(DATA, "kompleks_konsesi.json")
    if os.path.exists(jalur):
        teks = open(jalur, encoding="utf-8").read()
        d = json.loads(teks)
        assert "perusahaan" not in d and "grup" not in teks and "sanksi" not in teks, "berkas publik masih memuat perusahaan/grup/sanksi"
        assert not re.search(r"\bPT\.? ?[A-Z]|\bTbk\b", teks), "nama perusahaan (PT/Tbk) di kompleks_konsesi.json"
        for kid, v in d["kompleks"].items():
            assert 0 <= v["luar"] <= 1 and 0 <= v["gambut"] <= 1, kid
            assert all(j in JENIS and 0 < r["porsi"] <= 1 and r["n"] > 0 for j, r in v["jenis"].items()), kid
        assert all(a["jenis"] in JENIS and a["n"] >= 0 and a["musim"] >= 0 for a in d["jenis"])
        assert d["total"]["konsesi"] <= d["total"]["n"], d["total"]
        if "prov" in d["total"]:  # porsi per provinsi dan kalimat nasional memakai penyebut yang sama
            assert sum(a for a, _ in d["total"]["prov"].values()) == d["total"]["n"] and sum(b for _, b in d["total"]["prov"].values()) == d["total"]["konsesi"]
    print("ok")


if __name__ == "__main__":
    uji() if sys.argv[1:] == ["uji"] else main()
