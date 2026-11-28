"""Fasilitas rentan asap (sekolah, faskes, rumah sakit) 38 provinsi (sekolah hanya 9 prioritas; DP-26) -> public/data/fasilitas.json

Pakai:  python3 scripts/scrape/fasilitas.py
Mentah: data/raw/osm/prov-fasilitas-<kode>.json dari scripts/scrape/tarik_osm.py fasilitas.
Sumber: OpenStreetMap via Overpass (ODbL, (c) kontributor OpenStreetMap). Kelengkapan OSM rendah untuk sekolah
(Kalteng: ± 430 di OSM vs ± 3.000+ di Dapodik) - peta ini menunjukkan yang terpeta, bukan semua.
Bila hasil > BATAS titik, hanya yang <= 50 km dari kompleks siaga/prioritas yang disimpan.
"""
import json, math, os, re, sys

AKAR = os.path.join(os.path.dirname(__file__), "../..")
sys.path.insert(0, os.path.dirname(__file__))
sys.path.insert(0, os.path.join(AKAR, "scripts/data"))
from wilayah import PRIORITAS, PROVINSI

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
            if j == "sekolah" and prov not in PRIORITAS:
                continue
            f = {"t": j, "nama": nama(el["tags"], j), "lat": round(c["lat"], 4), "lon": round(c["lon"], 4), "prov": prov}
            if j == "faskes" and re.match(r"\s*(upt\s+)?puskesmas", f["nama"], re.I):
                f["pkm"] = 1  # puskesmas; t tetap faskes supaya pembaca lama tak berubah
            out.append(f)
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
    for kode in PROVINSI:
        p = os.path.join(MENTAH, f"prov-fasilitas-{kode}.json")
        if os.path.exists(p):
            per.append((kode, json.load(open(p))["elements"]))
        else:
            print("lewati", kode, "(belum ditarik)", file=sys.stderr)
    fas = susun(per)
    if sum(f["t"] == "sekolah" for f in fas) > BATAS:  # hanya sekolah disaring; kesehatan semua provinsi tetap
        kl = json.load(open(os.path.join(AKAR, "public/data/kluster.json")))["features"]
        sk = dekat_kompleks([f for f in fas if f["t"] == "sekolah"], [(f["properties"]["lat"], f["properties"]["lon"]) for f in kl if f["properties"].get("level", 0) >= 2])
        fas = [f for f in fas if f["t"] != "sekolah"] + sk
    ada = {f["prov"] for f in fas}
    if "--cek" in sys.argv:
        assert ada == set(PROVINSI), f"provinsi kurang di keluaran: {sorted(set(PROVINSI) - ada)}"
        print("cek: 38 provinsi ada,", len(fas), "titik")
        return
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
    assert [x.get("pkm") for x in susun([("62", [{"type": "node", "id": 9, "lat": 0, "lon": 0, "tags": {"amenity": "clinic", "name": "UPT Puskesmas Y"}}])])] == [1]
    assert not susun([("11", els[:1])])  # sekolah non-prioritas tak disimpan
    assert len(dekat_kompleks(f, [(-2.2, 113.9)], 5)) == 2  # puskesmas X ± 15 km: di luar 5 km


if __name__ == "__main__":
    uji()
    bangun()
