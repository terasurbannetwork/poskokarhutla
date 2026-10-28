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


def unduh_sel(kunci, titik, ambil=True, coba=3, tunggu=240):
    jalur = os.path.join(MENTAH, f"{kunci}.json")
    if os.path.exists(jalur):
        return json.load(open(jalur))
    if not ambil:
        return None
    time.sleep(JEDA)
    req = urllib.request.Request(MIRROR, data=urllib.parse.urlencode({"data": kueri(titik)}).encode(), headers={"User-Agent": UA})
    for c in range(coba):
        try:
            with urllib.request.urlopen(req, timeout=tunggu) as r:
                d = json.loads(r.read())
            break
        except Exception as e:
            print("  gagal", kunci, e, file=sys.stderr)
            if c == coba - 1:
                return None
            time.sleep(10)
    os.makedirs(MENTAH, exist_ok=True)
    json.dump(d, open(jalur, "w"))
    return d


# Aturan nama tampilan (keputusan 27 Okt 2026): satu sungai = satu grup di panel.
ALIAS = {"banjir kanal barat": "Banjir Kanal Barat", "kanal banjir barat": "Banjir Kanal Barat", "bkb": "Banjir Kanal Barat",
         "banjir kanal timur": "Banjir Kanal Timur", "kanal banjir timur": "Banjir Kanal Timur", "bkt": "Banjir Kanal Timur"}
# Penimpaan manual pos DSDA yang namanya jelas memuat sungai; sumber: nama pos DSDA DKI. Urutan penting (pertama cocok menang).
MANUAL = [("sunter hulu", "Sunter"), ("pulo gadung", "Sunter"), ("angke hulu", "Angke"), ("pesanggrahan", "Pesanggrahan"),
          ("krukut hulu", "Krukut"), ("cipinang hulu", "Cipinang"), ("cideng", "Cideng"), ("pluit", "Waduk Pluit"),
          ("marina ancol 1 (laut)", "Laut"), ("katulampa", "Ciliwung"), ("depok", "Ciliwung"), ("manggarai", "Ciliwung"),
          ("istiqlal", "Ciliwung"), ("karet", "Banjir Kanal Barat"), ("cibalok", "Ciliwung")]
JARAK_MAKS = 100  # m; di atas ini null
JARAK_DSDA = 50   # m; DSDA tanpa penimpaan


def rapikan(n):
    """Nama tampilan: buang 'Kali '/'Sungai '/'K. ', 'Ci X' -> 'Cix', alias kanal, SEMUA HURUF BESAR -> Judul."""
    n = " ".join((n or "").split())
    if not n:
        return None
    for aw in ("Kali ", "Sungai ", "K. "):
        if n.lower().startswith(aw.lower()):
            n = n[len(aw):].strip()
            break
    if n.isupper():
        n = n.title()
    if n.lower() in ALIAS:
        return ALIAS[n.lower()]
    if n.lower().startswith("ci ") and len(n) > 3:
        n = "Ci" + n[3].lower() + n[4:]
    return n or None


def manual(nama):
    k = (nama or "").lower()
    return next((v for kunci, v in MANUAL if kunci in k), None)


def putuskan(pid, nama, osm_nama, jarak):
    """-> entri keluaran. osm_nama/jarak = hasil terdekat dalam 300 m (atau None)."""
    if pid.startswith("t:") and sungai_dari_nama(nama):
        return {"sungai": rapikan(sungai_dari_nama(nama)), "sungai_osm": sungai_dari_nama(nama), "jarak_m": None, "cara": "nama"}
    if pid.startswith("d:") and manual(nama):
        return {"sungai": manual(nama), "sungai_osm": osm_nama, "jarak_m": jarak, "cara": "manual"}
    batas = JARAK_DSDA if pid.startswith("d:") else JARAK_MAKS
    ok = osm_nama and jarak is not None and jarak <= batas
    return {"sungai": rapikan(osm_nama) if ok else None, "sungai_osm": osm_nama if ok else None,
            "jarak_m": jarak if ok else None, "cara": "osm"}


def jalankan():
    mulai = time.time()
    pos = json.load(urllib.request.urlopen(urllib.request.Request(API, headers={"User-Agent": UA}), timeout=60))["pos"]
    hasil, sisa, sel = {}, [], {}  # hasil: id -> (nama OSM, jarak) mentah dalam 300 m
    for p in pos:
        if p.get("lon") is not None and p.get("lat") is not None and not (p["id"].startswith("t:") and sungai_dari_nama(p["nama"])):
            sel.setdefault(f"{math.floor(p['lon'] / SEL)}_{math.floor(p['lat'] / SEL)}", []).append(p)

    def isi(sub, dd):
        ways = [e for e in dd["elements"] if e["type"] == "way"]
        for p in sub:
            hasil[p["id"]] = terdekat(p["lon"], p["lat"], ways)

    for k, ps in sorted(sel.items()):  # 1) pakai cache lama (sel 3 derajat utuh atau potongan 10 pos)
        d = unduh_sel(k, [], ambil=False)
        if d:
            isi(ps, d)
            continue
        for j in range(0, len(ps), 10):
            dd = unduh_sel(f"{k}_{j // 10}", [], ambil=False)
            isi(ps[j:j + 10], dd) if dd else sisa.extend(ps[j:j + 10])
    print(f"dari cache: {len(hasil)} pos, sisa {len(sisa)}", flush=True)
    kecil = {}
    for p in sisa:  # 2) sisa: sel 1 derajat, potongan 5 pos, sekali coba, batas total MENIT_MAKS
        kecil.setdefault((math.floor(p["lon"]), math.floor(p["lat"])), []).append(p)
    for (lo, la), ps in sorted(kecil.items(), key=lambda kv: len(kv[1])):
        for j in range(0, len(ps), 5):
            if time.time() - mulai > MENIT_MAKS * 60:
                break
            sub = ps[j:j + 5]
            dd = unduh_sel(f"m{lo}_{la}_{j // 5}", [(p["lon"], p["lat"]) for p in sub], coba=1, tunggu=90)
            if dd:
                isi(sub, dd)
    out = {}
    for p in pos:
        if p["id"] in hasil or p["id"].startswith(("t:", "d:")):
            if p["id"] in hasil or (p["id"].startswith("t:") and sungai_dari_nama(p["nama"])) or manual(p["nama"]):
                out[p["id"]] = putuskan(p["id"], p["nama"], *hasil.get(p["id"], (None, None)))
    simpan(KELUAR, {"dibuat": dt.datetime.now(WIB).isoformat(timespec="minutes"),
                    "sumber": "OpenStreetMap (ODbL); nama SIPANTAU; nama pos DSDA", "pos": out})
    ringkas = {}
    for p in pos:
        r = ringkas.setdefault(p["sumber"], [0, 0, 0])
        r[0] += 1; r[1] += p["id"] in out; r[2] += bool(out.get(p["id"], {}).get("sungai"))
    print("sumber: [pos, punya entri, bernama]", ringkas)
    for p in pos:
        if p["sumber"].startswith("DSDA"):
            v = out[p["id"]]
            print("  DSDA", p["nama"], "->", v["sungai"], v["cara"], v["jarak_m"])


MENIT_MAKS = 30


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
    assert [rapikan(x) for x in ("Ci Liwung", "Sungai Ciliwung", "Kali Ciliwung", "CIRARAB", "Kanal Banjir Barat", "BKT", "K. Sunter", "Ci Pinang")] == \
        ["Ciliwung", "Ciliwung", "Ciliwung", "Cirarab", "Banjir Kanal Barat", "Banjir Kanal Timur", "Sunter", "Cipinang"]
    assert manual("P.A. Marina Ancol 1 (Laut)") == "Laut" and manual("P.A. Marina Ancol 1 (Kali)") is None
    assert manual("P.S. Sunter Hulu") == "Sunter" and manual("P.A. Pulo Gadung 2") == "Sunter"
    assert putuskan("d:1", "Waduk X", "Kali Y", 80)["sungai"] is None  # DSDA > 50 m
    assert putuskan("s1", "X", "Kali Y", 80)["sungai"] == "Y" and putuskan("s1", "X", "Kali Y", 120)["sungai"] is None
    assert putuskan("d:1", "P.A. Karet 1", "Krukut", 8) == {"sungai": "Banjir Kanal Barat", "sungai_osm": "Krukut", "jarak_m": 8, "cara": "manual"}
    print("pos_sungai uji ok")


if __name__ == "__main__":
    uji() if sys.argv[1:] == ["uji"] else jalankan()
