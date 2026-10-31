"""Indeks bahaya InaRISK BNPB (raster 100 m, 0-1) per kecamatan -> public/banjir/data/bahaya.json

Raster bahaya InaRISK hanya bernilai di zona bahaya; di luar zona nilainya kosong (dicatat 0). Satu titik pusat
sering jatuh di luar zona padahal sebagian kecamatan rawan, jadi tiap kecamatan dicuplik di titik berat
(shoelace) + titik kisi 3x3 di kotak batasnya yang jatuh di dalam poligon (maks 10 titik), dan yang disimpan
adalah NILAI TERTINGGI: "ada bagian kecamatan ini dengan indeks bahaya setinggi x".
ponytail: 10 titik per kecamatan, bukan statistik zonal penuh; ganti dengan computeHistograms per poligon bila
kecamatan besar (Papua, Kalimantan) terbukti terlewat.

Mode `kelas` -> public/banjir/data/bahaya_kelas.json: SEBARAN kelas per kecamatan, bukan satu nilai tertinggi.
Tiap kecamatan dikirim utuh sebagai poligon ke computeHistograms InaRISK, jadi yang dihitung SEMUA piksel 100 m di
dalamnya. Kelas mengikuti InaRISK: rendah < 0,333 <= sedang < 0,666 <= tinggi. Hasilnya persen luas kecamatan per
kelas; sisanya (100 - jumlah) = di luar zona bahaya. Luas satu piksel = (100 m x cos lintang)^2 karena raster
memakai World Mercator (EPSG 3395). bahaya.json TIDAK diubah: status.py memakai nilai tertingginya.

Pakai:  python3 scripts/banjir/bahaya.py   |   python3 scripts/banjir/bahaya.py kelas   |   python3 scripts/banjir/bahaya.py uji
"""
import json, math, os, sys, time
from concurrent.futures import ThreadPoolExecutor

sys.path.insert(0, os.path.dirname(__file__))
from umum import KELUAR, ambil, simpan
from wilayah import AKAR, PROVINSI, _di_dalam

BASIS = "https://gis.bnpb.go.id/server/rest/services/inarisk"
LAPISAN = {
    "banjir": "layer_bahaya_banjir", "bandang": "layer_bahaya_banjir_bandang", "longsor": "layer_bahaya_tanah_longsor",
    "kering": "layer_bahaya_kekeringan", "gelombang": "layer_bahaya_gelombang_ekstrim_dan_abrasi",
}
PER_PANGGIL = 200


def sentroid(ring):
    """Titik berat luas poligon (rumus shoelace) -> (lat, lon); rata-rata simpul bila luasnya nol."""
    a = cx = cy = 0.0
    for (x1, y1), (x2, y2) in zip(ring, ring[1:] + ring[:1]):
        c = x1 * y2 - x2 * y1
        a += c; cx += (x1 + x2) * c; cy += (y1 + y2) * c
    if abs(a) < 1e-12:
        return sum(p[1] for p in ring) / len(ring), sum(p[0] for p in ring) / len(ring)
    return cy / (3 * a), cx / (3 * a)


def cuplikan(ring):
    """Titik berat + titik kisi 3x3 di dalam poligon, sebagai [(lon, lat)]."""
    la, lo = sentroid(ring)
    xs, ys = [c[0] for c in ring], [c[1] for c in ring]
    out = [(lo, la)]
    for i in range(3):
        for j in range(3):
            x = min(xs) + (i + .5) / 3 * (max(xs) - min(xs))
            y = min(ys) + (j + .5) / 3 * (max(ys) - min(ys))
            if _di_dalam(x, y, ring):
                out.append((x, y))
    return out


def kecamatan():
    """-> {"prov|kab|kec": {"lat", "lon", "titik": [(lon, lat)]}} dari cincin terbesar tiap kecamatan."""
    out = {}
    for kode in PROVINSI:
        for f in json.load(open(os.path.join(AKAR, "public/geo/kecamatan", f"{kode}.json")))["features"]:
            g = f["geometry"]
            ring = max((p[0] for p in (g["coordinates"] if g["type"] == "MultiPolygon" else [g["coordinates"]])), key=len)
            k = f"{kode}|{f['properties']['kab']}|{f['properties']['kec']}"
            la, lo = sentroid(ring)
            if k in out:  # kecamatan yang terbelah jadi dua fitur: titik cuplik digabung, pusat dari fitur pertama
                out[k]["titik"] += cuplikan(ring)
            else:
                out[k] = {"lat": round(la, 4), "lon": round(lo, 4), "titik": cuplikan(ring)}
    return out


def nilai(v):
    return round(float(v), 3) if v not in ("", None, "NoData") else 0.0


def sampel(layanan, titik):
    """titik [(lon, lat)] -> [nilai 0-1] urut sama. getSamples multipoint, 200 titik per permintaan, jeda 1 dtk."""
    hasil = [0.0] * len(titik)
    for a in range(0, len(titik), PER_PANGGIL):
        b = titik[a:a + PER_PANGGIL]
        geom = json.dumps({"points": [[round(x, 5), round(y, 5)] for x, y in b], "spatialReference": {"wkid": 4326}})
        r = ambil(f"{BASIS}/{layanan}/ImageServer/getSamples",
                  {"geometry": geom, "geometryType": "esriGeometryMultipoint", "returnFirstValueOnly": "true", "f": "json"})
        if "error" in r:
            raise RuntimeError(f"{layanan}: {r['error']}")
        for s in r.get("samples", []):
            hasil[a + s["locationId"]] = nilai(s.get("value"))
        time.sleep(1)
    return hasil


def main():
    mulai = time.time()
    kec = kecamatan()
    datar, milik = [], []
    for k, v in kec.items():
        for t in v["titik"]:
            datar.append(t)
            milik.append(k)
    print(f"{len(kec)} kecamatan, {len(datar)} titik cuplik x {len(LAPISAN)} lapisan", file=sys.stderr)
    with ThreadPoolExecutor(3) as ex:  # 3 lapisan sekaligus; tiap utas tetap berjeda 1 dtk
        nilai_lapisan = dict(zip(LAPISAN, ex.map(lambda s: sampel(s, datar), LAPISAN.values())))
    out = {k: {kunci: 0.0 for kunci in LAPISAN} for k in kec}
    for kunci, vs in nilai_lapisan.items():
        for k, v in zip(milik, vs):
            out[k][kunci] = max(out[k][kunci], v)
    simpan(os.path.join(KELUAR, "bahaya.json"), {
        "sumber": "InaRISK BNPB (gis.bnpb.go.id), indeks bahaya raster 100 m; nilai = maksimum dari titik berat + kisi 3x3 di dalam kecamatan",
        "lapisan": {k: f"{BASIS}/{s}/ImageServer" for k, s in LAPISAN.items()}, "kec": out})
    for kunci in LAPISAN:
        vs = [v[kunci] for v in out.values()]
        print(f"  {kunci}: {sum(1 for v in vs if v > 0)} kec > 0, {sum(1 for v in vs if v >= .66)} kec >= 0,66", file=sys.stderr)
    print(f"bahaya.json: {len(out)} kecamatan, {time.time() - mulai:.0f} dtk", file=sys.stderr)


KELAS_LAPISAN = ("banjir", "bandang", "longsor")
AMBANG_KELAS = (0.333, 0.666)  # InaRISK: rendah < 0,333 <= sedang < 0,666 <= tinggi
PIKSEL_M = 100.0


def kelas_hist(h):
    """Histogram ArcGIS {min, max, counts} -> [n_rendah, n_sedang, n_tinggi] menurut nilai tengah tiap kotak."""
    n, c = [0, 0, 0], h["counts"]
    lebar = (h["max"] - h["min"]) / len(c)
    for i, x in enumerate(c):
        if x:
            v = h["min"] + (i + .5) * lebar
            n[(v >= AMBANG_KELAS[0]) + (v >= AMBANG_KELAS[1])] += x
    return n


def luas_km2(ring):
    """Luas cincin [lon, lat] (km2), proyeksi sinusoidal lokal; cukup untuk kecamatan (galat < 0,5%)."""
    la0 = sum(p[1] for p in ring) / len(ring)
    kx = 111.32 * math.cos(math.radians(la0))
    pts = [(x * kx, y * 110.574) for x, y in ring]
    return abs(sum(x1 * y2 - x2 * y1 for (x1, y1), (x2, y2) in zip(pts, pts[1:] + pts[:1]))) / 2


def poligon_kec():
    """-> {"prov|kab|kec": {"rings": [...], "km2": luas, "lat": lintang tengah}}; kecamatan terbelah digabung."""
    out = {}
    for kode in PROVINSI:
        for f in json.load(open(os.path.join(AKAR, "public/geo/kecamatan", f"{kode}.json")))["features"]:
            g = f["geometry"]
            polys = g["coordinates"] if g["type"] == "MultiPolygon" else [g["coordinates"]]
            k = f"{kode}|{f['properties']['kab']}|{f['properties']['kec']}"
            v = out.setdefault(k, {"rings": [], "km2": 0.0, "lat": sentroid(max((p[0] for p in polys), key=len))[0]})
            for p in polys:
                v["rings"] += p
                v["km2"] += luas_km2(p[0]) - sum(luas_km2(r) for r in p[1:])
    return out


def persen_kelas(n, km2, lat):
    """Jumlah piksel per kelas -> persen luas kecamatan (1 desimal, total dibatasi 100)."""
    px_km2 = (PIKSEL_M * math.cos(math.radians(lat)) / 1000) ** 2
    if km2 <= 0:
        return [0.0, 0.0, 0.0]
    p = [100 * x * px_km2 / km2 for x in n]
    s = sum(p)
    p = [round(x * (100 / s if s > 100 else 1), 1) for x in p]
    lebih = round(sum(p) - 100, 1)
    if lebih > 0:  # pembulatan bisa memberi 100,1: kurangi dari kelas terbesar
        i = p.index(max(p))
        p[i] = round(p[i] - lebih, 1)
    return p


def histogram(layanan, rings):
    geom = json.dumps({"rings": [[[round(x, 5), round(y, 5)] for x, y in r] for r in rings], "spatialReference": {"wkid": 4326}})
    r = ambil(f"{BASIS}/{layanan}/ImageServer/computeHistograms",
              {"geometry": geom, "geometryType": "esriGeometryPolygon", "f": "json"})
    if "error" in r:
        raise RuntimeError(f"{layanan}: {r['error']}")
    h = r.get("histograms") or []
    return kelas_hist(h[0]) if h and h[0].get("counts") else [0, 0, 0]


def main_kelas():
    mulai = time.time()
    kec = poligon_kec()
    kerja = [(k, b) for k in kec for b in KELAS_LAPISAN]
    print(f"{len(kec)} kecamatan x {len(KELAS_LAPISAN)} lapisan = {len(kerja)} histogram", file=sys.stderr)

    def satu(kb):
        k, b = kb
        try:
            return k, b, histogram(LAPISAN[b], kec[k]["rings"])
        except RuntimeError as e:  # gagal ambil != tanpa zona: dicatat, tidak ditulis 0, tidak mematikan proses
            print(f"  gagal {k} {b}: {e}"[:200], file=sys.stderr)
            return k, b, None
    out = {k: {"km2": round(v["km2"], 2)} for k, v in kec.items()}
    gagal = []
    with ThreadPoolExecutor(4) as ex:
        for i, (k, b, n) in enumerate(ex.map(satu, kerja), 1):
            if n is None:
                gagal.append(f"{k}|{b}")
                continue
            p = persen_kelas(n, kec[k]["km2"], kec[k]["lat"])
            if any(p):
                out[k][b] = p
            if i % 2000 == 0:
                print(f"  {i}/{len(kerja)} ({time.time() - mulai:.0f} dtk)", file=sys.stderr)
    simpan(os.path.join(KELUAR, "bahaya_kelas.json"), {
        "sumber": "InaRISK BNPB (gis.bnpb.go.id), raster bahaya 100 m; computeHistograms per poligon kecamatan",
        "dibuat": time.strftime("%Y-%m-%d"),
        "kelas": ["rendah", "sedang", "tinggi"], "ambang": list(AMBANG_KELAS),
        "catatan": "Nilai = persen luas kecamatan per kelas; 100 dikurangi jumlahnya = di luar zona bahaya. km2 = luas poligon. "
                   "gagal = kecamatan|lapisan yang tidak terambil (bukan berarti tanpa zona).",
        "gagal": gagal, "kec": out})
    if gagal:
        print(f"  {len(gagal)} histogram gagal; jalankan ulang untuk mengisinya", file=sys.stderr)
    for b in KELAS_LAPISAN:
        t = sum(1 for v in out.values() if v.get(b, [0, 0, 0])[2] >= 25)
        print(f"  {b}: {sum(1 for v in out.values() if b in v)} kec punya zona, {t} kec >= 25% luas kelas tinggi", file=sys.stderr)
    print(f"bahaya_kelas.json: {time.time() - mulai:.0f} dtk", file=sys.stderr)


def uji():
    persegi = [[0, 0], [2, 0], [2, 2], [0, 2]]
    assert sentroid(persegi) == (1.0, 1.0)
    la, lo = sentroid([[0, 0], [3, 0], [0, 3]])  # segitiga: titik berat (1, 1)
    assert abs(la - 1) < 1e-9 and abs(lo - 1) < 1e-9
    assert len(cuplikan(persegi)) == 10
    huruf_l = [[0, 0], [3, 0], [3, 1], [1, 1], [1, 3], [0, 3]]  # bentuk L: sebagian titik kisi di luar
    assert 1 < len(cuplikan(huruf_l)) < 10
    assert nilai("") == 0.0 and nilai("0.6666") == 0.667 and nilai(None) == 0.0
    # 4 kotak 0..1: tengah 0,125 / 0,375 / 0,625 / 0,875 -> rendah, sedang, sedang, tinggi
    assert kelas_hist({"min": 0, "max": 1, "counts": [5, 1, 2, 7]}) == [5, 3, 7]
    assert kelas_hist({"min": .7, "max": .7, "counts": [4]}) == [0, 0, 4]  # min = max: semua satu nilai
    # persegi 0,01 derajat di ekuator ~ 1,23 km2
    assert abs(luas_km2([[0, 0], [.01, 0], [.01, .01], [0, .01]]) - 1.231) < .01
    # 100 piksel di ekuator = 1 km2 dari kecamatan 4 km2 = 25%; jumlah > 100 dinormalkan
    assert persen_kelas([100, 0, 0], 4.0, 0) == [25.0, 0.0, 0.0]
    assert sum(persen_kelas([300, 300, 0], 4.0, 0)) == 100.0
    assert sum(persen_kelas([333, 333, 334], 10.0, 0)) <= 100.0  # pembulatan tidak melampaui 100
    assert persen_kelas([5, 5, 5], 0, 0) == [0.0, 0.0, 0.0]
    print("ok bahaya")


if __name__ == "__main__":
    {"uji": uji, "kelas": main_kelas}.get((sys.argv[1:] or [""])[0], main)()
