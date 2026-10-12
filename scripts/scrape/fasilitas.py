"""Fasilitas rentan asap (sekolah, faskes, rumah sakit) 9 provinsi prioritas -> public/data/fasilitas.json

Pakai:  python3 scripts/scrape/fasilitas.py
Mentah: data/raw/osm/prov-fasilitas-<kode>.json dari scripts/scrape/tarik_osm.py fasilitas.
Sumber: OpenStreetMap via Overpass (ODbL, (c) kontributor OpenStreetMap). Kelengkapan OSM rendah untuk sekolah
(Kalteng: ± 430 di OSM vs ± 3.000+ di Dapodik) - peta ini menunjukkan yang terpeta, bukan semua.
Bila hasil > BATAS titik, hanya yang <= 50 km dari kompleks siaga/prioritas yang disimpan.
"""
import json, math, os, sys

AKAR = os.path.join(os.path.dirname(__file__), "../..")
sys.path.insert(0, os.path.dirname(__file__))
sys.path.insert(0, os.path.join(AKAR, "scripts/data"))
from wilayah import PRIORITAS

MENTAH = os.path.join(AKAR, "data/raw/osm")
KELUAR = os.path.join(AKAR, "public/data/fasilitas.json")
BATAS, RADIUS_KM = 30000, 50


def jenis(t):
    a, h = t.get("amenity", ""), t.get("healthcare", "")
    if a == "hospital" or h == "hospital":
        return "rs"
    if a in ("clinic", "doctors") or h in ("centre", "clinic"):
        return "faskes"
    if a in ("school", "kindergarten"):
        return "sekolah"
    return None


def nama(t, j):
    n = t.get("name") or t.get("name:id") or ""
    return n or {"rs": "Rumah sakit", "faskes": "Fasilitas kesehatan", "sekolah": "Sekolah"}[j] + " (tanpa nama)"


def susun(elemen_per_prov):
    out, seen = [], set()
    for prov, els in elemen_per_prov:
        for el in els:
            j = jenis(el.get("tags", {}))
            if not j or (el["type"], el["id"]) in seen:
                continue
            c = el if "lat" in el else el.get("center")
            if not c:
                continue
            seen.add((el["type"], el["id"]))
            out.append({"t": j, "nama": nama(el["tags"], j), "lat": round(c["lat"], 4), "lon": round(c["lon"], 4), "prov": prov})
    return out


def dekat_kompleks(fas, kompleks, r_km=RADIUS_KM):
    sel = {}
    for la, lo in kompleks:
        sel.setdefault((math.floor(la * 2), math.floor(lo * 2)), []).append((la, lo))
    def ok(f):
        gy, gx = math.floor(f["lat"] * 2), math.floor(f["lon"] * 2)
        for y in (gy - 1, gy, gy + 1):
            for x in (gx - 1, gx, gx + 1):
                for la, lo in sel.get((y, x), ()):
                    if math.hypot((la - f["lat"]) * 110.57, (lo - f["lon"]) * 111.32 * math.cos(math.radians(la))) <= r_km:
                        return True
        return False
    return [f for f in fas if ok(f)]


def bangun():
    per = []
    for kode in PRIORITAS:
        p = os.path.join(MENTAH, f"prov-fasilitas-{kode}.json")
        if os.path.exists(p):
            per.append((kode, json.load(open(p))["elements"]))
        else:
            print("lewati", kode, "(belum ditarik)", file=sys.stderr)
    fas = susun(per)
    if len(fas) > BATAS:
        kl = json.load(open(os.path.join(AKAR, "public/data/kluster.json")))["features"]
        fas = dekat_kompleks(fas, [(f["properties"]["lat"], f["properties"]["lon"]) for f in kl if f["properties"].get("level", 0) >= 2])
    json.dump(fas, open(KELUAR, "w"), ensure_ascii=False, separators=(",", ":"))
    hit = {}
    for f in fas:
        hit[(f["prov"], f["t"])] = hit.get((f["prov"], f["t"]), 0) + 1
    print(f"fasilitas.json {len(fas)} titik dari {len(per)} provinsi, {os.path.getsize(KELUAR) / 1e3:.0f} KB", dict(sorted(hit.items())))


def uji():
    els = [{"type": "node", "id": 1, "lat": -2.2, "lon": 113.9, "tags": {"amenity": "school", "name": "SDN 1"}},
           {"type": "way", "id": 2, "center": {"lat": -2.21, "lon": 113.91}, "tags": {"healthcare": "hospital"}},
           {"type": "node", "id": 3, "lat": -2.3, "lon": 113.8, "tags": {"amenity": "clinic", "name": "Puskesmas X"}},
           {"type": "node", "id": 4, "lat": -2.3, "lon": 113.8, "tags": {"amenity": "bank"}}]
    f = susun([("62", els), ("63", els)])  # lintas provinsi: elemen sama hanya sekali
    assert [x["t"] for x in f] == ["sekolah", "rs", "faskes"], f
    assert f[1]["nama"] == "Rumah sakit (tanpa nama)"
    assert len(dekat_kompleks(f, [(-2.2, 113.9)], 5)) == 2  # puskesmas X ± 15 km: di luar 5 km


if __name__ == "__main__":
    uji()
    bangun()
