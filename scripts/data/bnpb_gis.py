"""Data publik gis.bnpb.go.id (ArcGIS Server, tanpa login):
1. Indeks bahaya karhutla InaRISK (raster 100 m, 0-1) di titik kompleks siaga/prioritas dan semua posko -> public/data/inarisk.json
2. Kantor BPBD (alamat kantor & Pusdalops saja; nomor pribadi pejabat TIDAK disimpan) -> public/data/bpbd.json
"""
import json, os, sys, time, urllib.parse, urllib.request

sys.path.insert(0, os.path.dirname(__file__))
from wilayah import AKAR

D = os.path.join(AKAR, "public/data")
BASIS = "https://gis.bnpb.go.id/server/rest/services"


def ambil(url, data=None):
    for i in range(4):
        try:
            req = urllib.request.Request(url, data=data, headers={"User-Agent": "poskokarhutla/1.0"})
            with urllib.request.urlopen(req, timeout=120) as r:
                return json.loads(r.read())
        except Exception:
            if i == 3:
                raise
            time.sleep(5 * (i + 1))


def sampel(titik):
    """titik: [(id, lon, lat)] -> {id: nilai 0-1 atau None}. getSamples multipoint, 200 titik per permintaan."""
    hasil = {}
    for a in range(0, len(titik), 200):
        b = titik[a:a + 200]
        geom = json.dumps({"points": [[x[1], x[2]] for x in b], "spatialReference": {"wkid": 4326}})
        data = urllib.parse.urlencode({"geometry": geom, "geometryType": "esriGeometryMultipoint", "returnFirstValueOnly": "true", "f": "json"}).encode()
        r = ambil(f"{BASIS}/inarisk/layer_bahaya_kebakaran_hutan_dan_lahan/ImageServer/getSamples", data)
        for s in r.get("samples", []):
            v = s.get("value")
            hasil[b[s["locationId"]][0]] = round(float(v), 3) if v not in ("", None) else None
        time.sleep(1)
    return hasil


def main():
    K = json.load(open(os.path.join(D, "kluster.json")))["features"]
    pk = json.load(open(os.path.join(D, "posko.json")))
    titik = [(f["properties"]["id"], f["properties"]["lon"], f["properties"]["lat"]) for f in K if f["properties"]["level"] >= 2]
    titik += [(x["id"], x["lon"], x["lat"]) for kel in ("posko", "menengah", "pusat") for x in pk.get(kel, [])]
    nilai = sampel(titik)
    json.dump({"sumber": "InaRISK BNPB, indeks bahaya karhutla (raster 100 m)", "nilai": nilai},
              open(os.path.join(D, "inarisk.json"), "w"), separators=(",", ":"))
    r = ambil(f"{BASIS}/peta_bpbd/MapServer/0/query?where=1%3D1&outFields=*&f=json")
    kantor = []
    for f in r.get("features", []):
        a = f.get("attributes", {})
        try:
            la, lo = float(a.get("LAT")), float(a.get("LONG"))
        except (TypeError, ValueError):
            continue
        if not a.get("BPBD") or not (-12 < la < 7 and 94 < lo < 142):
            continue
        kantor.append({"nama": a["BPBD"].strip(), "lat": round(la, 5), "lon": round(lo, 5),
                       "alamat": (a.get("ALAMAT") or "").strip(), "pusdalops": (a.get("PUSDALOPS") or "").strip()})
    json.dump({"sumber": "BNPB peta_bpbd (gis.bnpb.go.id)", "kantor": kantor}, open(os.path.join(D, "bpbd.json"), "w"), ensure_ascii=False, separators=(",", ":"))
    ada = [v for v in nilai.values() if v is not None]
    print(f"{len(nilai)} titik InaRISK ({len(ada)} bernilai, rata {sum(ada) / max(1, len(ada)):.2f}); {len(kantor)} kantor BPBD", file=sys.stderr)


if __name__ == "__main__":
    main()
