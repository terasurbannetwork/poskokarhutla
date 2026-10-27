"""Sungai di sekitar pos tinggi air berambang (Siaga) dari OSM lewat Overpass -> public/banjir/data/sungai_pos.json.

Sebab: ruas berwarna di layar hanya bisa memakai sungai ubin vektor peta dasar, dan sungai kecil (mis. Cirarab) baru ada di
ubin mulai zoom 12. Berkas ini memberi geometri yang sama untuk zoom jauh (public/banjir/ruas_jauh.js).
Pos: /api/banjir/sungai-ukur yang punya `ambang` atau id berawalan d:/t:. Waterway river|canal|stream|drain dalam RADIUS_KM
tiap pos, garis dipotong ke radius, disederhanakan Douglas-Peucker, 5 desimal. Data (c) kontributor OpenStreetMap, ODbL.
Tulis atomik; hasil kosong/separuh tidak menimpa berkas lama. Self-check tanpa jaringan: python3 sungai_pos.py uji
"""
import json, math, os, sys, time, urllib.parse, urllib.request

AKAR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
JALUR = os.path.join(AKAR, "public/banjir/data/sungai_pos.json")
API = os.environ.get("POS_API", "https://centurisk97.id/api/banjir/sungai-ukur")
SERVER = ["https://overpass-api.de/api/interpreter", "https://overpass.kumi.systems/api/interpreter",
          "https://maps.mail.ru/osm/tools/overpass/api/interpreter"]
UA = "poskobanjir/1.0 (pantau bencana; sungai pos)"
RADIUS_KM, TOL_M, BATAS_BYTE, MIN_FITUR, GRUP = 6.0, 20.0, 600_000, 20, 1
KELAS = "river|canal|stream|drain"
GAGAL_MAKS = 0.1
MENTAH = os.path.join(AKAR, "data/raw/banjir/sungai_pos")


def km(a, b, c, d):
    r = math.pi / 180
    x = math.sin((c - a) * r / 2) ** 2 + math.cos(a * r) * math.cos(c * r) * math.sin((d - b) * r / 2) ** 2
    return 12742 * math.asin(math.sqrt(x))


def pos_terpilih(d):
    """Pos berambang atau berid d:/t: yang punya koordinat -> [(lon, lat)] unik (dibulatkan 3 desimal ~ 110 m)."""
    out = {}
    for p in (d or {}).get("pos") or []:
        if not (p.get("ambang") or str(p.get("id", "")).startswith(("d:", "t:"))):
            continue
        if isinstance(p.get("lon"), (int, float)) and isinstance(p.get("lat"), (int, float)):
            out[(round(p["lon"], 3), round(p["lat"], 3))] = (p["lon"], p["lat"])
    return list(out.values())


def dekat(pt, pos, r=RADIUS_KM):
    return any(km(pt[1], pt[0], la, lo) <= r for lo, la in pos)


def potong(garis, pos, r=RADIUS_KM):
    """Garis [(lon,lat)] -> daftar potongan yang titiknya di dalam radius dari salah satu pos (>= 2 titik)."""
    out, cur = [], []
    for pt in garis:
        if dekat(pt, pos, r):
            cur.append(pt)
        else:
            if len(cur) > 1: out.append(cur)
            cur = []
    if len(cur) > 1: out.append(cur)
    return out


def sederhana(g, tol_m=TOL_M):
    """Douglas-Peucker iteratif pada bidang meter lokal; ujung selalu dipertahankan."""
    if len(g) < 3: return list(g)
    kx = 111320 * math.cos(math.radians(g[0][1])); ky = 110574
    P = [((x - g[0][0]) * kx, (y - g[0][1]) * ky) for x, y in g]
    simpan, tumpuk = {0, len(g) - 1}, [(0, len(g) - 1)]
    while tumpuk:
        a, b = tumpuk.pop(); (ax, ay), (bx, by) = P[a], P[b]; dx, dy = bx - ax, by - ay; pj = math.hypot(dx, dy)
        jmax, imax = -1.0, -1
        for i in range(a + 1, b):
            px, py = P[i]
            j = math.hypot(px - ax, py - ay) if pj == 0 else abs(dy * (px - ax) - dx * (py - ay)) / pj
            if j > jmax: jmax, imax = j, i
        if jmax > tol_m and imax > 0:
            simpan.add(imax); tumpuk += [(a, imax), (imax, b)]
    return [g[i] for i in sorted(simpan)]


def fitur(elemen, pos):
    """Elemen way Overpass (out geom) -> Feature GeoJSON, atau None (di luar radius / bukan garis)."""
    t = elemen.get("tags") or {}
    if elemen.get("type") != "way" or not elemen.get("geometry"): return None
    garis = [(g["lon"], g["lat"]) for g in elemen["geometry"]]
    bagian = []
    for b in potong(garis, pos):
        s = sederhana(b)
        s = [[round(x, 5), round(y, 5)] for x, y in s]
        if len(s) > 1 and s[0] != s[-1] or len(s) > 2: bagian.append(s)
    if not bagian: return None
    prop = {"class": t.get("waterway", "stream")}
    if t.get("name"): prop["name"] = t["name"]
    geom = {"type": "LineString", "coordinates": bagian[0]} if len(bagian) == 1 else {"type": "MultiLineString", "coordinates": bagian}
    return {"type": "Feature", "properties": prop, "geometry": geom}


def kueri(grup):
    bag = "".join(f'way["waterway"~"^({KELAS})$"](around:{int(RADIUS_KM * 1000)},{la},{lo});' for lo, la in grup)
    return f"[out:json][timeout:150];({bag});out geom;"


def overpass(q):
    data = urllib.parse.urlencode({"data": q}).encode()
    for coba in range(8):
        url = SERVER[coba % len(SERVER)]
        try:
            j = json.loads(urllib.request.urlopen(urllib.request.Request(url, data, headers={"User-Agent": UA}), timeout=200).read())
            if "elements" in j and not (j.get("remark") or "").startswith("runtime error"): return j["elements"]
        except Exception as e:
            print(f"  gagal {url}: {e}", file=sys.stderr)
        time.sleep(min(10 * (coba + 1), 60))
    raise SystemExit("Overpass menyerah; berkas lama dibiarkan")


def periksa(fc, byte):
    if len(fc["features"]) < MIN_FITUR: raise SystemExit(f"hanya {len(fc['features'])} fitur (< {MIN_FITUR}); berkas lama dibiarkan")
    if byte > BATAS_BYTE: raise SystemExit(f"{byte} byte melewati batas {BATAS_BYTE}; berkas lama dibiarkan")


def tulis(fc):
    isi = json.dumps(fc, ensure_ascii=False, separators=(",", ":"))
    periksa(fc, len(isi.encode()))
    os.makedirs(os.path.dirname(JALUR), exist_ok=True)
    with open(JALUR + ".tmp", "w", encoding="utf-8") as f: f.write(isi)
    os.replace(JALUR + ".tmp", JALUR)
    return len(isi.encode())


def jalankan():
    req = urllib.request.Request(API, headers={"User-Agent": UA})
    pos = pos_terpilih(json.loads(urllib.request.urlopen(req, timeout=60).read()))
    if not pos: raise SystemExit("tidak ada pos berambang; berkas lama dibiarkan")
    unik, gagal = {}, 0
    for lo, la in pos:  # per pos, hasil mentah di-cache supaya jalan ulang melanjutkan; satu pos gagal dilewati (batas GAGAL_MAKS)
        c = os.path.join(MENTAH, f"{lo}_{la}.json")
        if os.path.exists(c): els = json.load(open(c))
        else:
            try: els = overpass(kueri([(lo, la)]))
            except SystemExit: gagal += 1; print(f"  pos {lo},{la} dilewati", file=sys.stderr); continue
            os.makedirs(MENTAH, exist_ok=True); json.dump(els, open(c, "w"), separators=(",", ":")); time.sleep(1)
        for e in els: unik[e.get("id")] = e
    if gagal > len(pos) * GAGAL_MAKS: raise SystemExit(f"{gagal} dari {len(pos)} pos gagal; berkas lama dibiarkan")
    fs = [f for f in (fitur(e, pos) for e in unik.values()) if f]
    fc = {"type": "FeatureCollection", "attribution": "(c) kontributor OpenStreetMap, ODbL 1.0, lewat Overpass; diolah Pantau Bencana.",
          "features": fs}
    n = tulis(fc)
    print(f"{len(pos)} pos, {len(fs)} fitur, {n} byte -> {JALUR}")


def uji():
    # penyederhanaan: lurus jadi 2 titik, tikungan tajam dipertahankan
    lurus = [(106.0 + i * 1e-4, -6.0) for i in range(50)]
    assert len(sederhana(lurus)) == 2
    siku = [(106.0 + i * 1e-4, -6.0) for i in range(10)] + [(106.0009, -6.0 + i * 1e-4) for i in range(1, 10)]
    s = sederhana(siku); assert 3 <= len(s) <= 4 and s[0] == siku[0] and s[-1] == siku[-1], s
    # radius: garis memanjang 0..0.2 derajat, pos di 0; hanya bagian <= 6 km tersisa
    pos = [(106.0, -6.0)]
    el = {"type": "way", "tags": {"waterway": "stream", "name": "Cirarab"}, "geometry": [{"lon": 106.0 + i * 0.01, "lat": -6.0} for i in range(21)]}
    f = fitur(el, pos); assert f and f["properties"] == {"class": "stream", "name": "Cirarab"}
    xs = [p[0] for p in f["geometry"]["coordinates"]]; assert max(xs) <= 106.0 + 6 / 110.5 + 1e-9 and min(xs) == 106.0, xs
    assert fitur({"type": "way", "tags": {"waterway": "drain"}, "geometry": [{"lon": 107.0, "lat": -6.0}, {"lon": 107.01, "lat": -6.0}]}, pos) is None
    # pemilihan pos
    d = {"pos": [{"id": "a", "lon": 1, "lat": 1, "ambang": {"siaga2": 1}}, {"id": "d:1", "lon": 2, "lat": 2}, {"id": "t:2", "lon": 3, "lat": 3},
                 {"id": "x", "lon": 4, "lat": 4}, {"id": "d:9", "lon": None, "lat": 1}]}
    assert len(pos_terpilih(d)) == 3
    # hasil kosong/separuh ditolak, besar berlebih ditolak
    for fc, b in [({"features": []}, 10), ({"features": [1] * (MIN_FITUR - 1)}, 10), ({"features": [1] * MIN_FITUR}, BATAS_BYTE + 1)]:
        try: periksa(fc, b)
        except SystemExit: pass
        else: raise AssertionError("harus ditolak")
    periksa({"features": [1] * MIN_FITUR}, 1000)
    print("sungai_pos uji OK")


if __name__ == "__main__":
    uji() if sys.argv[1:] == ["uji"] else jalankan()
