"""PB-61.2, PB-61.10 (DATA-PUBLIK A2, A10): produk USGS per gempa di kotak Indonesia -> longsor dan likuefaksi akibat gempa
(ground-failure) dan mekanisme fokus (moment-tensor). Dua data, satu permintaan detail per gempa, jadi satu skrip.
-> public/data/usgs_produk.json   (bergulir 365 hari, digabung per id; cache data-)

Akses (diperiksa 25 Nov 2026, tanpa kunci): daftar https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&... (kotak sama dengan
src/gempa.js), lalu detail ...query?eventid=<id>&format=geojson; produk dibaca dari properties.products[<jenis>], versi pilihan = preferredWeight
terbesar. Domain publik (karya pemerintah AS), atribusi USGS.
Isi: ground-failure = tingkat peringatan USGS (green/yellow/orange/red) dan perkiraan penduduk terpapar model Nowicki Jessee 2018 (longsor) dan
Zhu 2017 (likuefaksi). Itu MODEL USGS, bukan pengamatan dan bukan uji balik kita; nilai "None" dari USGS disimpan null, BUKAN 0.
moment-tensor = jenis magnitudo, Mw, dua bidang sesar (strike, dip, rake), persen double couple.
Pakai: python3 -I scripts/umum/usgs_produk.py   |   python3 -I scripts/umum/usgs_produk.py uji
"""
import datetime as dt, importlib.util, json, os, sys, urllib.parse

AKAR = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "../.."))
DIR = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(AKAR, "public/data/usgs_produk.json")
API = "https://earthquake.usgs.gov/fdsnws/event/1/query?"
KOTAK = {"minlatitude": -11.5, "maxlatitude": 6.5, "minlongitude": 94, "maxlongitude": 142}
M_MIN, HARI_TARIK, HARI_SIMPAN, MAKS_DETAIL = 5, 30, 365, 60


def _mod(nama):
    s = importlib.util.spec_from_file_location("umum_" + nama, os.path.join(DIR, nama + ".py"))
    m = importlib.util.module_from_spec(s)
    s.loader.exec_module(m)
    return m


def angka(v):
    """teks USGS -> float, atau None untuk kosong/'None'/'nan' (tidak pernah 0 karangan)."""
    try:
        f = float(v)
    except (TypeError, ValueError):
        return None
    return None if f != f else f


def pilih(produk, jenis):
    daftar = produk.get(jenis) or []
    return max(daftar, key=lambda x: x.get("preferredWeight") or 0)["properties"] if daftar else None


def ringkas(detail):
    """detail GeoJSON satu gempa -> baris keluaran, atau None bila tak ada kedua produk."""
    p, (lon, lat, dalam) = detail["properties"], detail["geometry"]["coordinates"][:3]
    gf, mt = pilih(p.get("products") or {}, "ground-failure"), pilih(p.get("products") or {}, "moment-tensor")
    if not gf and not mt:
        return None
    r = {"id": detail["id"], "waktu": dt.datetime.fromtimestamp(p["time"] / 1000, dt.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
         "m": p.get("mag"), "tempat": p.get("place"), "lat": lat, "lon": lon, "dalam_km": dalam, "tautan": p.get("url"),
         "longsor": None, "likuefaksi": None, "mekanisme": None}
    if gf:
        for k, nama in (("landslide", "longsor"), ("liquefaction", "likuefaksi")):
            r[nama] = {"tingkat": gf.get(f"{k}-alert") or None, "penduduk": angka(gf.get(f"{k}-population-alert-value")),
                       "bahaya": angka(gf.get(f"{k}-hazard-alert-value"))}
    if mt:
        r["mekanisme"] = {"jenis_m": mt.get("derived-magnitude-type"), "mw": angka(mt.get("derived-magnitude")),
                          "bidang": [[angka(mt.get(f"nodal-plane-{i}-{s}")) for s in ("strike", "dip", "rake")] for i in (1, 2)],
                          "dc": angka(mt.get("percent-double-couple"))}
    return r


def gabung(lama, baru, hari):
    """baris lama + baru per id (baru menang), buang yang lebih tua dari HARI_SIMPAN, urut terbaru dulu."""
    batas = (hari - dt.timedelta(days=HARI_SIMPAN)).isoformat()
    d = {r["id"]: r for r in lama}
    d.update({r["id"]: r for r in baru})
    return sorted((r for r in d.values() if r["waktu"][:10] >= batas), key=lambda r: r["waktu"], reverse=True)


def jalan():
    J, simp = _mod("jaring"), _mod("kejadian").simpan
    hari = dt.datetime.now(dt.timezone.utc).date()
    q = {"format": "geojson", "minmagnitude": M_MIN, "starttime": (hari - dt.timedelta(days=HARI_TARIK)).isoformat(), "orderby": "time", **KOTAK}
    gagal, baru = [], []
    daftar = [f for f in J.ambil(API + urllib.parse.urlencode(q), jeda_host=1)["features"]
              if {"ground-failure", "moment-tensor"} & set((f["properties"].get("types") or "").split(","))]
    for f in daftar[:MAKS_DETAIL]:
        try:
            r = ringkas(J.ambil(API + urllib.parse.urlencode({"eventid": f["id"], "format": "geojson"}), jeda_host=1))
            if r:
                baru.append(r)
        except Exception as e:
            gagal.append(f"{f['id']}: {e}")
    try:
        lama = json.load(open(OUT, encoding="utf-8")).get("gempa", [])
    except (OSError, ValueError):
        lama = []
    simp(OUT, {"sumber": "USGS ComCat, produk ground-failure dan moment-tensor", "atribusi": "U.S. Geological Survey, earthquake.usgs.gov",
               "lisensi": "domain publik (karya pemerintah AS), atribusi USGS", "jenis_keluaran": "MODEL USGS (bukan pengamatan; belum diuji balik di sistem ini)",
               "diambil": hari.isoformat(), "gagal": gagal,
               "catatan": f"Gempa M{M_MIN}+ di kotak Indonesia, {HARI_TARIK} hari tiap jalan, disimpan {HARI_SIMPAN} hari. tingkat = peringatan USGS green/yellow/orange/red; "
                          "penduduk = perkiraan penduduk terpapar menurut model USGS; null = USGS tidak menerbitkan, bukan nol. bidang = [strike, dip, rake] derajat.",
               "gempa": gabung(lama, baru, hari)})
    print(f"usgs_produk: {len(daftar)} gempa berproduk, {len(baru)} diringkas, gagal {len(gagal)}")


def uji():
    assert angka("1.5") == 1.5 and angka("None") is None and angka("nan") is None and angka(None) is None and angka("0") == 0.0
    gf = {"landslide-alert": "green", "landslide-population-alert-value": "None", "landslide-hazard-alert-value": "0.0",
          "liquefaction-alert": "yellow", "liquefaction-population-alert-value": "1200", "liquefaction-hazard-alert-value": "1.5"}
    mt = {"derived-magnitude-type": "Mww", "derived-magnitude": "6.6", "percent-double-couple": "0.76",
          "nodal-plane-1-strike": "50.26", "nodal-plane-1-dip": "76.59", "nodal-plane-1-rake": "10.24",
          "nodal-plane-2-strike": "317.86", "nodal-plane-2-dip": "80.04", "nodal-plane-2-rake": "166.38"}
    det = {"id": "us7000tymu", "geometry": {"coordinates": [131.47, -6.02, 68.0]},
           "properties": {"time": 1794863480489, "mag": 6.6, "place": "147 km WSW of Tual, Indonesia", "url": "https://earthquake.usgs.gov/x",
                          "products": {"ground-failure": [{"preferredWeight": 158, "properties": gf}],
                                       "moment-tensor": [{"preferredWeight": 160, "properties": {**mt, "derived-magnitude-type": "Mwc"}},
                                                         {"preferredWeight": 218, "properties": mt}]}}}
    r = ringkas(det)
    assert r["waktu"] == "2026-11-16T21:11:20Z" and r["dalam_km"] == 68.0
    assert r["longsor"] == {"tingkat": "green", "penduduk": None, "bahaya": 0.0}   # "None" USGS -> null, bukan 0
    assert r["likuefaksi"]["penduduk"] == 1200.0 and r["likuefaksi"]["tingkat"] == "yellow"
    assert r["mekanisme"]["jenis_m"] == "Mww" and r["mekanisme"]["bidang"][1] == [317.86, 80.04, 166.38]   # preferredWeight terbesar
    tanpa = {**det, "properties": {**det["properties"], "products": {"shakemap": [{}]}}}
    assert ringkas(tanpa) is None
    hanya_mt = ringkas({**det, "properties": {**det["properties"], "products": {"moment-tensor": det["properties"]["products"]["moment-tensor"]}}})
    assert hanya_mt["longsor"] is None and hanya_mt["mekanisme"]["mw"] == 6.6
    h = dt.date(2026, 11, 25)
    g = gabung([{"id": "a", "waktu": "2025-01-01T00:00:00Z"}, {"id": "b", "waktu": "2026-11-01T00:00:00Z", "m": 5}],
               [{"id": "b", "waktu": "2026-11-01T00:00:00Z", "m": 5.1}, {"id": "c", "waktu": "2026-11-20T00:00:00Z"}], h)
    assert [x["id"] for x in g] == ["c", "b"] and g[1]["m"] == 5.1   # a basi dibuang, b baru menang
    print("uji usgs_produk: ok")


if __name__ == "__main__":
    uji() if sys.argv[1:] == ["uji"] else jalan()
