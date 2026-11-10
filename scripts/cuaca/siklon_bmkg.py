"""Siklon tropis resmi BMKG TCWC Jakarta -> public/banjir/data/cuaca_siklon_bmkg.json (+ arsip bulanan append-only)

Sumber: halaman publik https://www.bmkg.go.id/cuaca/siklon-tropis (HTML Nuxt; data di <script id="__NUXT_DATA__"> format devalue: larik datar,
nilai = indeks ke larik). Hanya halaman ini; service-api tropicalcyclone.bmkg.go.id butuh token dan TIDAK dipakai. Token sesi yang ikut tertanam di
state halaman tidak dibaca dan tidak disimpan.
Berkas terpisah dari cuaca_siklon.json (JTWC/GDACS/JMA): BMKG sumber berlabel sendiri, tidak dicampur diam-diam.
Tidak ada siklon = "aktif": [] (sah). Bentuk halaman berubah (NUXT hilang, cycloneDataList tak ada) = RuntimeError, berkas lama tetap.
AoR/AoM hanya dari kolom BMKG (is_aor, area); batasnya tidak dikarang.
Arsip: public/banjir/data/cuaca_bmkg_arsip_siklon_<YYYY-MM>.json {"terbit": {"<analysis_time>|<NAMA>": {...}}}; entri lama tak pernah diubah
(nama diawali cuaca_bmkg_arsip_ supaya ikut dipulihkan dan di-commit lintas.yml per kunci terbit).
Pakai: python3 scripts/cuaca/siklon_bmkg.py   |   python3 scripts/cuaca/siklon_bmkg.py uji
"""
import datetime as dt, html as _html, json, os, re, sys, tempfile, urllib.request

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from dasar import KELUAR, baca, sekarang, simpan

URL = "https://www.bmkg.go.id/cuaca/siklon-tropis"
UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36"
SUMBER = "BMKG TCWC Jakarta (bmkg.go.id/cuaca/siklon-tropis)"
BUNGKUS = ("ShallowReactive", "Reactive", "ShallowRef", "Ref", "EmptyRef", "EmptyShallowRef")
DALAM_MAKS = 60


def unduh():
    req = urllib.request.Request(URL, headers={"User-Agent": UA, "Accept": "text/html", "Accept-Language": "id,en;q=0.8"})
    with urllib.request.urlopen(req, timeout=40) as r:
        return r.read(8_000_000).decode("utf-8", "replace")


def nuxt(halaman):
    m = re.search(r'<script[^>]*id="__NUXT_DATA__"[^>]*>(.*?)</script>', halaman, re.S)
    if not m:
        raise RuntimeError("siklon_bmkg: __NUXT_DATA__ tidak ada (bentuk halaman berubah)")
    a = json.loads(m.group(1))
    if not isinstance(a, list) or not a:
        raise RuntimeError("siklon_bmkg: __NUXT_DATA__ bukan larik devalue")
    return a


def hidup(a, i=0):
    """Urai devalue; berbatas kedalaman, tahan siklus (rujukan balik -> None), nilai bersama dihitung sekali."""
    memo, jalan = {}, set()

    def f(i, d):
        if not isinstance(i, int) or isinstance(i, bool):
            return i
        if i < 0 or i >= len(a):
            return None
        if i in memo:
            return memo[i]
        if i in jalan or d > DALAM_MAKS:
            return None
        jalan.add(i)
        v = a[i]
        if isinstance(v, dict):
            h = {k: f(x, d + 1) for k, x in v.items()}
        elif isinstance(v, list):
            if len(v) == 2 and isinstance(v[0], str) and v[0] in BUNGKUS:
                h = f(v[1], d + 1)
            elif len(v) == 2 and v[0] == "Date":
                h = v[1]
            else:
                h = [f(x, d + 1) for x in v]
        else:
            h = v
        jalan.discard(i)
        memo[i] = h
        return h
    return f(i, 0)


def teks(v):
    """Kolom teks BMKG (HTML/daftar) -> teks polos atau None."""
    if isinstance(v, list):
        v = "\n".join(t for t in (teks(x) for x in v) if t)
    if isinstance(v, dict):
        v = v.get("text") or v.get("teks") or ""
    if not isinstance(v, str):
        return None
    v = re.sub(r"(?i)<\s*(br|/p|/li|/div)[^>]*>", "\n", v)
    v = _html.unescape(re.sub(r"<[^>]+>", "", v))
    v = "\n".join(re.sub(r"[ \t ]+", " ", s).strip() for s in v.splitlines())
    return re.sub(r"\n{3,}", "\n\n", v).strip() or None


def tautan(v):
    """Hanya URL https (string, atau dalam daftar/dict); selain itu None."""
    if isinstance(v, list):
        return [u for u in (tautan(x) for x in v) if u] or None
    if isinstance(v, dict):
        v = v.get("url") or v.get("src") or v.get("path")
    return v.strip() if isinstance(v, str) and v.strip().startswith("https://") else None


def angka(v):
    try:
        return None if v is None or v == "" else float(v)
    except (TypeError, ValueError):
        return None


def titik(f):
    p, g = f.get("properties") or {}, (f.get("geometry") or {}).get("coordinates") or [None, None]
    return {"waktu": p.get("time"), "lat": angka(g[1]), "lon": angka(g[0]), "tekanan_hpa": angka(p.get("pressure")), "angin_kt": angka(p.get("mean_wind")),
            "embusan_kt": angka(p.get("gust")), "kategori": p.get("cat"), "prakiraan": bool(p.get("is_forecast")), "akurasi": p.get("accuracy"),
            "jarak_angin": p.get("wind_distance"), "ketidakpastian": p.get("uncertainty"), "analisis": p.get("analysis_time"), "kuadran": p.get("quadrants")}


def daftar_siklon(d):
    """Daftar siklon musim ini: kunci `$f...` acak, jadi cari yang bentuknya {data:[{name, tc_code, ...}]}."""
    for k, v in d.items():
        if k.startswith("$f") and isinstance(v, dict) and isinstance(v.get("data"), list):
            L = [{"nama": x.get("name"), "musim": x.get("season"), "aktif": bool(x.get("is_current")), "area": x.get("area"), "tc_code": x.get("tc_code"),
                  "is_aor": bool(x.get("is_aor")), "is_cyclone": bool(x.get("is_cyclone"))} for x in v["data"] if isinstance(x, dict) and "tc_code" in x]
            if L:
                return L
    return []


def olah(halaman):
    r = hidup(nuxt(halaman))
    d = r.get("data") if isinstance(r, dict) else None
    if not isinstance(d, dict) or not isinstance(d.get("cycloneDataList"), list):
        raise RuntimeError("siklon_bmkg: cycloneDataList tidak ada (bentuk halaman berubah)")
    daftar = daftar_siklon(d)
    info = {x["nama"]: x for x in daftar}
    aktif = []
    for c in d["cycloneDataList"]:
        if not isinstance(c, dict):
            continue
        T = [titik(f) for f in ((c.get("geojson") or {}).get("features") or []) if isinstance(f, dict)]
        T = [t for t in T if t["lat"] is not None and t["lon"] is not None]
        if not T:
            continue
        nama = ((c.get("geojson") or {}).get("features") or [{}])[0].get("properties", {}).get("name")
        amatan = [t for t in T if not t["prakiraan"]]
        akhir = (amatan or T)[-1]
        det = (((c.get("detail") or {}).get("data")) or [{}])[0] or {}
        i = info.get(nama, {})
        aktif.append({"nama": nama, "tc_code": i.get("tc_code"), "kategori": akhir["kategori"], "is_aor": i.get("is_aor"), "area": i.get("area"),
                      "titik": T, "analisis": akhir["analisis"], "deskripsi": teks(det.get("description_id")), "intensitas": det.get("intensity"),
                      "intensitas24": det.get("intensity24"), "cuaca_ekstrem": teks(det.get("extreme_weather")), "gelombang_tinggi": teks(det.get("ocean_gale")),
                      "angin_kencang": teks(det.get("gale")), "dampak_langsung": teks(det.get("direct_impact")), "peringatan": teks(det.get("warning_text")),
                      "peta": tautan(det.get("track_and_impact_map")), "infografis": tautan(det.get("infografis")),
                      "publikasi_berikut": det.get("next_publication_time")})
    return {"dibuat": sekarang(), "sumber": SUMBER, "aktif": aktif, "daftar": daftar}


def arsipkan(hasil, folder):
    """Tiap (analisis, nama) ditambah sekali ke arsip bulan analisisnya; yang sudah ada tak diubah. -> jumlah entri baru."""
    baru = 0
    for s in hasil["aktif"]:
        if not s["analisis"] or not s["nama"]:
            continue
        jalur = os.path.join(folder, f"cuaca_bmkg_arsip_siklon_{s['analisis'][:7]}.json")
        arsip = baca(jalur, None) or {"terbit": {}}
        kunci = f"{s['analisis']}|{s['nama']}"
        if kunci in arsip.setdefault("terbit", {}):
            continue
        akhir = next((t for t in s["titik"] if t["analisis"] == s["analisis"] and not t["prakiraan"]), s["titik"][0])
        arsip["terbit"][kunci] = {"nama": s["nama"], "tc_code": s["tc_code"], "kategori": s["kategori"], "is_aor": s["is_aor"], "area": s["area"],
                                  "lat": akhir["lat"], "lon": akhir["lon"], "tekanan_hpa": akhir["tekanan_hpa"], "angin_kt": akhir["angin_kt"],
                                  "embusan_kt": akhir["embusan_kt"], "intensitas": s["intensitas"], "prakiraan": [t for t in s["titik"] if t["prakiraan"]]}
        simpan(jalur, arsip)
        baru += 1
    return baru


def main(halaman=None, folder=None):
    folder = folder or KELUAR
    hasil = olah(halaman if halaman is not None else unduh())   # galat = berkas lama tetap
    simpan(os.path.join(folder, "cuaca_siklon_bmkg.json"), hasil)
    baru = arsipkan(hasil, folder)
    print(f"siklon_bmkg: {len(hasil['aktif'])} aktif, {len(hasil['daftar'])} di daftar musim, arsip +{baru}")


def _enc(obj):
    """Pembungkus devalue untuk uji."""
    a = [None]

    def add(v):
        i = len(a)
        a.append(None)
        a[i] = {k: add(x) for k, x in v.items()} if isinstance(v, dict) else [add(x) for x in v] if isinstance(v, list) else v
        return i
    a[0] = ["ShallowReactive", add(obj)]
    return f'<html><script type="application/json" id="__NUXT_DATA__" data-ssr="true">{json.dumps(a)}</script></html>'


def uji():
    fit = lambda t, fc: {"type": "Feature", "geometry": {"type": "Point", "coordinates": [138, 25.1]}, "properties": {"name": "CEMPAKA", "time": t, "pressure": 955, "mean_wind": 85,
                         "gust": 120, "cat": "3", "is_forecast": fc, "analysis_time": "2026-11-10T00:00:00.000Z", "quadrants": {"ne": 0}}}
    siklon = {"id": "x", "geojson": {"features": [fit("2026-11-10 00:00 UTC", False), fit("2026-11-11 00:00 UTC", True)]},
              "detail": {"data": [{"description_id": "<p>Siklon &amp; <b>CEMPAKA</b></p><p>kedua</p>", "intensity": "Storm", "user_created": "RAHASIA", "gale": ["<li>Laut A</li>", "<li>Laut B</li>"],
                                   "ocean_gale": None, "infografis": ["https://x.bmkg.go.id/a.png", "javascript:x"], "track_and_impact_map": "abc-id"}]}}
    daftar = {"data": [{"name": "CEMPAKA", "season": 2026, "is_current": True, "area": "bbu", "tc_code": "31W", "is_aor": False, "is_cyclone": True, "user_created": "RAHASIA"}]}
    halaman = _enc({"data": {"$fabc123": daftar, "cycloneDataList": [siklon]}, "state": {"$sauth-token": "TOKEN-RAHASIA"}})
    # devalue: bungkus, nilai bersama, siklus
    assert hidup([["Ref", 1], {"a": 2, "b": 2}, [3, 4], 7, "x"]) == {"a": [7, "x"], "b": [7, "x"]}
    s = [{"a": 1}, {"balik": 0}]
    assert hidup(s) == {"a": {"balik": None}}
    r = olah(halaman)
    assert len(r["aktif"]) == 1 and r["daftar"][0]["tc_code"] == "31W", r
    x = r["aktif"][0]
    assert x["nama"] == "CEMPAKA" and x["kategori"] == "3" and x["is_aor"] is False and x["area"] == "bbu" and x["analisis"] == "2026-11-10T00:00:00.000Z"
    assert [t["prakiraan"] for t in x["titik"]] == [False, True] and x["titik"][0]["angin_kt"] == 85 and x["titik"][0]["lat"] == 25.1 and x["titik"][0]["lon"] == 138
    assert x["deskripsi"] == "Siklon & CEMPAKA\nkedua", repr(x["deskripsi"])
    assert x["angin_kencang"] == "Laut A\nLaut B" and x["gelombang_tinggi"] is None and x["peta"] is None and x["infografis"] == ["https://x.bmkg.go.id/a.png"]
    assert "RAHASIA" not in json.dumps(r) and "user_created" not in json.dumps(r)
    # aktif kosong sah
    assert olah(_enc({"data": {"$fz": {"data": []}, "cycloneDataList": []}}))["aktif"] == []
    # halaman rusak = raise
    for rusak in ("<html>kosong</html>", _enc({"data": {"lain": []}}), _enc({"x": 1})):
        try:
            olah(rusak)
            assert False, "harus raise"
        except RuntimeError:
            pass
    # main: berkas lama tetap bila galat; arsip tidak menimpa
    with tempfile.TemporaryDirectory() as t:
        simpan(os.path.join(t, "cuaca_siklon_bmkg.json"), {"lama": 1})
        try:
            main("<html></html>", t)
            assert False
        except RuntimeError:
            assert baca(os.path.join(t, "cuaca_siklon_bmkg.json")) == {"lama": 1}
        main(halaman, t)
        ar = os.path.join(t, "cuaca_bmkg_arsip_siklon_2026-11.json")
        a1 = baca(ar)
        assert list(a1["terbit"]) == ["2026-11-10T00:00:00.000Z|CEMPAKA"] and a1["terbit"]["2026-11-10T00:00:00.000Z|CEMPAKA"]["angin_kt"] == 85
        a1["terbit"]["2026-11-10T00:00:00.000Z|CEMPAKA"]["angin_kt"] = 1   # tanda: entri lama tak boleh diubah
        simpan(ar, a1)
        main(halaman, t)
        assert baca(ar)["terbit"]["2026-11-10T00:00:00.000Z|CEMPAKA"]["angin_kt"] == 1 and len(baca(ar)["terbit"]) == 1
        assert "RAHASIA" not in open(os.path.join(t, "cuaca_siklon_bmkg.json")).read()
    print("ok")


if __name__ == "__main__":
    uji() if sys.argv[1:] == ["uji"] else main()
