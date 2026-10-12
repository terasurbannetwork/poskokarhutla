"""Lapisan OSM per provinsi prioritas: permukiman, sumber air, faskes -> public/data/osm/<kode>.json

Pakai:  python3 scripts/scrape/osm.py [kode ...]     # lapisan OSM
        python3 scripts/scrape/osm.py desa           # titik pusat desa ber-kode Kemendagri (MIT)
Sumber: OpenStreetMap via Overpass (ODbL, (c) kontributor OpenStreetMap).
Respons mentah disimpan di data/raw/osm/; yang sudah ada dipakai ulang (hapus untuk menarik ulang).
Cakupan = kotak batas provinsi (+0,1 derajat), jadi fitur provinsi/negara tetangga di tepi ikut;
itu disengaja: sumber air/faskes terdekat tidak berhenti di garis batas.
"""
import json, math, os, re, sys, time, urllib.parse, urllib.request

AKAR = os.path.join(os.path.dirname(__file__), "../..")
sys.path.insert(0, os.path.join(AKAR, "scripts/data"))
from wilayah import PRIORITAS

MENTAH = os.path.join(AKAR, "data/raw/osm")
KELUAR = os.path.join(AKAR, "public/data/osm")
SERVER = ["https://overpass-api.de/api/interpreter", "https://overpass.kumi.systems/api/interpreter"]
UBIN = 2.0  # derajat; ditarik per ubin supaya kueri tidak kena 504 dan respons out geom tidak raksasa
JARAK_SUNGAI_KM = 1.0


def bbox(kode):
    xs, ys = [], []
    def jalan(c):
        if isinstance(c[0], (int, float)):
            xs.append(c[0]); ys.append(c[1])
        else:
            for d in c:
                jalan(d)
    for f in json.load(open(os.path.join(AKAR, "public/geo/kabupaten", f"{kode}.json")))["features"]:
        jalan(f["geometry"]["coordinates"])
    return min(ys) - 0.1, min(xs) - 0.1, max(ys) + 0.1, max(xs) + 0.1  # s, w, n, e


def overpass(q, berkas):
    if os.path.exists(berkas):
        return json.load(open(berkas))
    data = urllib.parse.urlencode({"data": q}).encode()
    for coba in range(30):  # 504 publik sering; cache per berkas membuat jalan ulang murah
        url = SERVER[0] if coba % 3 else SERVER[1]
        try:
            req = urllib.request.Request(url, data, headers={"User-Agent": "poskokarhutla/1.0 (karhutla public layer)"})
            raw = urllib.request.urlopen(req, timeout=300).read()
            j = json.loads(raw)
            if "remark" in j and "runtime error" in j["remark"]:
                raise RuntimeError(j["remark"][:200])
            os.makedirs(os.path.dirname(berkas), exist_ok=True)
            open(berkas, "wb").write(raw)
            time.sleep(5)  # sopan: satu kueri sekali jalan, jeda antar kueri
            return j
        except Exception as e:
            jeda = min(30 * (coba + 1), 180)
            print(f"  gagal {url}: {e}; tunggu {jeda} s", file=sys.stderr)
            time.sleep(jeda)
    raise SystemExit(f"Overpass menyerah: {berkas}")


def q_titik(b):
    s = "%.4f,%.4f,%.4f,%.4f" % b
    return f"""[out:json][timeout:180];
(
  node[place~"^(village|hamlet|town|city|suburb)$"]({s});
  nwr[amenity~"^(hospital|clinic|doctors)$"]({s});
  nwr[healthcare=centre]({s});
  nwr[amenity][name~"puskesmas",i]({s});
  nwr[building][name~"puskesmas",i]({s});
  nwr[natural=water]({s});
  nwr[landuse~"^(reservoir|basin)$"]({s});
);
out center tags;"""


def q_sungai(b):
    s = "%.4f,%.4f,%.4f,%.4f" % b
    return f"""[out:json][timeout:180];
way[waterway~"^(river|canal|ditch|drain)$"]({s});
out geom tags;"""


def km(a, b):
    la = math.radians((a[0] + b[0]) / 2)
    return math.hypot((b[0] - a[0]) * 111.32, (b[1] - a[1]) * 111.32 * math.cos(la))


def sampel(geom, langkah=JARAK_SUNGAI_KM):
    """Titik wakil tiap ~langkah km sepanjang garis, plus kedua ujung."""
    pts = [(g["lat"], g["lon"]) for g in geom]
    keluar, sisa = [pts[0]], 0.0
    for a, b in zip(pts, pts[1:]):
        d = km(a, b)
        while d > 0 and sisa + d >= langkah:
            t = (langkah - sisa) / d
            a = (a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t)
            keluar.append(a)
            d, sisa = km(a, b), 0.0
        sisa += d
    if km(keluar[-1], pts[-1]) > langkah / 4:
        keluar.append(pts[-1])
    return keluar


def r4(x):
    return round(x, 4)


def susun(kode):
    s, w, n, e = bbox(kode)
    desa, air, faskes = [], [], []
    ys = [s + i * UBIN for i in range(math.ceil((n - s) / UBIN))]
    xs = [w + i * UBIN for i in range(math.ceil((e - w) / UBIN))]
    seen = set()  # fitur lintas ubin muncul dua kali
    for y in ys:
        for x in xs:
            b = (y, x, min(y + UBIN, n), min(x + UBIN, e))
            for el in overpass(q_titik(b), os.path.join(MENTAH, f"{kode}-titik-{y:.1f}_{x:.1f}.json"))["elements"]:
                if (el["type"], el["id"]) in seen or not ("lat" in el or "center" in el):
                    continue
                seen.add((el["type"], el["id"]))
                t = el.get("tags", {})
                lat, lon = (el["lat"], el["lon"]) if "lat" in el else (el["center"]["lat"], el["center"]["lon"])
                nama = t.get("name", "")
                nl = nama.lower()
                if el["type"] == "node" and t.get("place") in ("village", "hamlet", "town", "city", "suburb"):
                    desa.append([r4(lat), r4(lon), nama, t["place"]])
                if t.get("amenity") in ("hospital", "clinic", "doctors") or t.get("healthcare") == "centre" or "puskesmas" in nl:
                    jenis = "puskesmas" if "puskesmas" in nl else t.get("amenity") or t.get("healthcare")
                    faskes.append([r4(lat), r4(lon), nama, jenis])
                if t.get("natural") == "water" or t.get("landuse") in ("reservoir", "basin"):
                    jenis = "embung" if "embung" in nl else t.get("water") or t.get("landuse") or "water"
                    if jenis in ("river", "canal", "ditch", "drain", "stream", "stream_pool"):  # poligon sungai: garisnya diambil di bawah
                        continue
                    air.append([r4(lat), r4(lon), jenis, nama])
            for el in overpass(q_sungai(b), os.path.join(MENTAH, f"{kode}-sungai-{y:.1f}_{x:.1f}.json"))["elements"]:
                if (el["type"], el["id"]) in seen or not el.get("geometry"):
                    continue
                seen.add((el["type"], el["id"]))
                t = el.get("tags", {})
                for lat, lon in sampel(el["geometry"]):
                    air.append([r4(lat), r4(lon), t["waterway"], t.get("name", "")])
    dedup = lambda xs: [list(v) for v in dict.fromkeys(tuple(r) for r in xs)]
    out = {"desa": dedup(desa), "air": dedup(air), "faskes": dedup(faskes)}
    os.makedirs(KELUAR, exist_ok=True)
    p = os.path.join(KELUAR, f"{kode}.json")
    json.dump(out, open(p, "w"), ensure_ascii=False, separators=(",", ":"))
    print(kode, {k: len(v) for k, v in out.items()}, f"{os.path.getsize(p) / 1e6:.1f} MB", flush=True)


DESA_REPO = "cahyadsn/wilayah_boundaries"  # MIT; kode & nama per Kepmendagri 300.2.2-2430/2025
BARIS = re.compile(r"\('(\d\d\.\d\d\.\d\d\.\d{4})','((?:[^']|'')*)',(-?[\d.]+),(-?[\d.]+),")


def desa_kemendagri(kodes):
    """Titik pusat desa/kelurahan ber-kode Kemendagri -> public/data/osm/desa.json {prov: [[lat,lon,kode,nama]]}"""
    pohon = json.load(urllib.request.urlopen(f"https://api.github.com/repos/{DESA_REPO}/git/trees/main?recursive=1"))
    out = {}
    for kode in kodes:
        baris = []
        for f in pohon["tree"]:
            if not (f["path"].startswith(f"db/kel/{kode}/") and f["path"].endswith(".sql")):
                continue
            berkas = os.path.join(AKAR, "data/raw/desa", os.path.basename(f["path"]))
            if not os.path.exists(berkas):
                os.makedirs(os.path.dirname(berkas), exist_ok=True)
                url = f"https://raw.githubusercontent.com/{DESA_REPO}/main/{f['path']}"
                open(berkas, "wb").write(urllib.request.urlopen(url, timeout=120).read())
            for m in BARIS.finditer(open(berkas, encoding="utf-8").read()):
                baris.append([r4(float(m[3])), r4(float(m[4])), m[1], m[2].replace("''", "'")])
        out[kode] = baris
        print("desa", kode, len(baris), flush=True)
    p = os.path.join(KELUAR, "desa.json")
    os.makedirs(KELUAR, exist_ok=True)
    json.dump(out, open(p, "w"), ensure_ascii=False, separators=(",", ":"))
    print("desa.json", f"{os.path.getsize(p) / 1e6:.1f} MB")


if __name__ == "__main__":
    if sys.argv[1:] == ["desa"]:
        desa_kemendagri(PRIORITAS)
        raise SystemExit
    # cek kecil sampel(): garis 3 km lurus ke utara -> 4 titik (0,1,2,3 km)
    g = [{"lat": 0, "lon": 0}, {"lat": 3 / 111.32, "lon": 0}]
    assert len(sampel(g)) == 4, sampel(g)
    for kode in sys.argv[1:] or PRIORITAS:
        susun(kode)
