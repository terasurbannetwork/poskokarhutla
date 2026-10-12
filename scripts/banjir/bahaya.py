"""Indeks bahaya InaRISK BNPB (raster 100 m, 0-1) per kecamatan -> public/banjir/data/bahaya.json

Raster bahaya InaRISK hanya bernilai di zona bahaya; di luar zona nilainya kosong (dicatat 0). Satu titik pusat
sering jatuh di luar zona padahal sebagian kecamatan rawan, jadi tiap kecamatan dicuplik di titik berat
(shoelace) + titik kisi 3x3 di kotak batasnya yang jatuh di dalam poligon (maks 10 titik), dan yang disimpan
adalah NILAI TERTINGGI: "ada bagian kecamatan ini dengan indeks bahaya setinggi x".
ponytail: 10 titik per kecamatan, bukan statistik zonal penuh; ganti dengan computeHistograms per poligon bila
kecamatan besar (Papua, Kalimantan) terbukti terlewat.

Pakai:  python3 scripts/data/bahaya.py        |  python3 scripts/data/bahaya.py uji
"""
import json, os, sys, time
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


def uji():
    persegi = [[0, 0], [2, 0], [2, 2], [0, 2]]
    assert sentroid(persegi) == (1.0, 1.0)
    la, lo = sentroid([[0, 0], [3, 0], [0, 3]])  # segitiga: titik berat (1, 1)
    assert abs(la - 1) < 1e-9 and abs(lo - 1) < 1e-9
    assert len(cuplikan(persegi)) == 10
    huruf_l = [[0, 0], [3, 0], [3, 1], [1, 1], [1, 3], [0, 3]]  # bentuk L: sebagian titik kisi di luar
    assert 1 < len(cuplikan(huruf_l)) < 10
    assert nilai("") == 0.0 and nilai("0.6666") == 0.667 and nilai(None) == 0.0
    print("ok bahaya")


if __name__ == "__main__":
    uji() if sys.argv[1:] == ["uji"] else main()
