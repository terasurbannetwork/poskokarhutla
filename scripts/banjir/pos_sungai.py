"""Tabel id pos tinggi air -> nama sungai, untuk pengelompokan panel pos per sungai.

API /api/banjir/sungai-ukur tidak membawa nama sungai. Dua cara:
- "nama": pos SIPANTAU ("t:..") bernama "Sungai - Lokasi", sungai = bagian sebelum " - " (apa adanya).
- "osm": waterway OSM bernama terdekat (river|canal|stream|drain|ditch) dalam 300 m dari titik pos,
  lewat mirror Overpass maps.mail.ru; satu kueri per sel 3 derajat, dicache di data/raw/banjir/pos_sungai/.
Keluaran public/banjir/data/pos_sungai.json. Data (c) kontributor OpenStreetMap, ODbL.
Dijalankan manual bila pos bertambah (belum di workflow): python3 scripts/banjir/pos_sungai.py
"""
import datetime as dt, json, math, os, sys, time, urllib.parse, urllib.request

AKAR = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "../.."))
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from umum import simpan, WIB  # noqa: E402

API = "https://centurisk97.id/api/banjir/sungai-ukur"
MIRROR = "https://maps.mail.ru/osm/tools/overpass/api/interpreter"
UA = "poskobanjir/1.0 (nama sungai pos duga air; +https://centurisk97.id)"
MENTAH = os.path.join(AKAR, "data/raw/banjir/pos_sungai")
KELUAR = os.path.join(AKAR, "public/banjir/data/pos_sungai.json")
RADIUS = 300.0
SEL = 3.0  # derajat
JEDA = 6  # detik antar kueri


def sungai_dari_nama(nama):
    """'Cirarab - Telesonik' -> 'Cirarab'; tanpa ' - ' -> None."""
    if " - " not in (nama or ""):
        return None
    s = nama.split(" - ", 1)[0].strip()
    return s or None


def jarak_titik_garis(lon, lat, geom):
    """Meter dari titik ke polyline [{lon,lat}], proyeksi datar lokal."""
    ky, kx = 110540.0, 111320.0 * math.cos(math.radians(lat))
    p = [((g["lon"] - lon) * kx, (g["lat"] - lat) * ky) for g in geom]
    if len(p) == 1:
        return math.hypot(*p[0])
    best = float("inf")
    for (ax, ay), (bx, by) in zip(p, p[1:]):
        dx, dy = bx - ax, by - ay
        L = dx * dx + dy * dy
        t = 0.0 if L == 0 else max(0.0, min(1.0, -(ax * dx + ay * dy) / L))
        best = min(best, math.hypot(ax + t * dx, ay + t * dy))
    return best


def terdekat(lon, lat, ways, radius=RADIUS):
    """ways: unsur Overpass way ber-nama dengan geometry. -> (nama, jarak_m) atau (None, None)."""
    b = (None, radius + 1)
    for w in ways:
        n = ((w.get("tags") or {}).get("name") or "").strip()
        if not n or not w.get("geometry"):
            continue
        d = jarak_titik_garis(lon, lat, w["geometry"])
        if d < b[1]:
            b = (n, d)
    return (b[0], round(b[1])) if b[0] and b[1] <= radius else (None, None)


def kueri(titik):
    k = "".join(f'way["waterway"~"^(river|canal|stream|drain|ditch)$"]["name"](around:{int(RADIUS)},{la},{lo});' for lo, la in titik)
    return f"[out:json][timeout:180];({k});out geom tags;"


def unduh_sel(kunci, titik):
    jalur = os.path.join(MENTAH, f"{kunci}.json")
    if os.path.exists(jalur):
        return json.load(open(jalur))
    time.sleep(JEDA)
    req = urllib.request.Request(MIRROR, data=urllib.parse.urlencode({"data": kueri(titik)}).encode(), headers={"User-Agent": UA})
    for coba in range(3):
        try:
            with urllib.request.urlopen(req, timeout=240) as r:
                d = json.loads(r.read())
            break
        except Exception as e:
            print("  gagal", kunci, e, file=sys.stderr)
            if coba == 2:
                return None
            time.sleep(30)
    os.makedirs(MENTAH, exist_ok=True)
    json.dump(d, open(jalur, "w"))
    return d


def jalankan():
    pos = json.load(urllib.request.urlopen(urllib.request.Request(API, headers={"User-Agent": UA}), timeout=60))["pos"]
    out, sel = {}, {}
    for p in pos:
        n = sungai_dari_nama(p["nama"]) if p["id"].startswith("t:") else None
        if n:
            out[p["id"]] = {"sungai": n, "jarak_m": None, "cara": "nama"}
        elif p.get("lon") is not None and p.get("lat") is not None:
            sel.setdefault(f"{math.floor(p['lon'] / SEL)}_{math.floor(p['lat'] / SEL)}", []).append(p)
    for i, (k, ps) in enumerate(sorted(sel.items()), 1):
        print(f"sel {i}/{len(sel)} {k}: {len(ps)} pos", flush=True)
        d = unduh_sel(k, [(p["lon"], p["lat"]) for p in ps])
        if d is None:
            continue  # sel gagal: pos tanpa entri, dicoba lagi pada jalan berikutnya
        ways = [e for e in d["elements"] if e["type"] == "way"]
        for p in ps:
            n, j = terdekat(p["lon"], p["lat"], ways)
            out[p["id"]] = {"sungai": n, "jarak_m": j, "cara": "osm"}
    simpan(KELUAR, {"dibuat": dt.datetime.now(WIB).isoformat(timespec="minutes"),
                    "sumber": "OpenStreetMap (ODbL); nama SIPANTAU", "pos": out})
    sumber = {p["id"]: p["sumber"] for p in pos}
    nama = {p["id"]: p["nama"] for p in pos}
    ringkas = {}
    for i, v in out.items():
        r = ringkas.setdefault(sumber[i], [0, 0]); r[0] += 1; r[1] += bool(v["sungai"])
    print("sumber: [pos, bernama]", ringkas)
    for i, v in out.items():
        if sumber[i].startswith("DSDA"):
            print("  DSDA", nama[i], "->", v["sungai"], v["jarak_m"])


def uji():
    assert sungai_dari_nama("Cirarab - Telesonik") == "Cirarab"
    assert sungai_dari_nama("Sp. Mutiara Pluit - Periuk") == "Sp. Mutiara Pluit"
    assert sungai_dari_nama("Kali Ciliwung - A - B") == "Kali Ciliwung"
    assert sungai_dari_nama("LUNGAU") is None and sungai_dari_nama(" - x") is None
    g = [{"lon": 0.0, "lat": 0.0}, {"lon": 0.01, "lat": 0.0}]  # ~1113 m lurus timur
    assert abs(jarak_titik_garis(0.005, 0.001, g) - 110.5) < 1
    assert abs(jarak_titik_garis(-0.001, 0, g) - 111.3) < 1  # lewat ujung: jarak ke simpul
    w = [{"tags": {"name": "Kali A"}, "geometry": g}, {"tags": {"name": "Kali B"}, "geometry": [{"lon": 0.005, "lat": 0.0015}, {"lon": 0.006, "lat": 0.0015}]},
         {"tags": {}, "geometry": g}]
    assert terdekat(0.005, 0.0, w) == ("Kali A", 0)
    assert terdekat(0.005, 0.002, w)[0] == "Kali B"  # B ~55 m, A ~221 m
    assert terdekat(0.005, 0.01, w) == (None, None)  # > 300 m
    print("pos_sungai uji ok")


if __name__ == "__main__":
    uji() if sys.argv[1:] == ["uji"] else jalankan()
