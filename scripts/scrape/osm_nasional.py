"""Prasarana kritis OSM 38 provinsi -> public/data/osm_nasional/<kode>.json + ringkas.json

Pakai:  python3 scripts/scrape/osm_nasional.py
Mentah: data/raw/osm/prov-fasilitas-<kode>.json dan prov-vital-<kode>.json dari
        scripts/scrape/tarik_osm.py fasilitas|vital <kode ...> (workflow osm-nasional.yml).
Baris tiap kategori: [lat, lon, nama]; rumah ibadah hanya dihitung (terlalu banyak untuk dipetakan).
Provinsi yang mentahnya belum lengkap dilewati, berkas lamanya dibiarkan.
Sumber: OpenStreetMap via Overpass (ODbL, (c) kontributor OpenStreetMap).
"""
import json, os, sys

AKAR = os.path.join(os.path.dirname(__file__), "../..")
sys.path.insert(0, os.path.join(AKAR, "scripts/data"))
from wilayah import PROVINSI

MENTAH = os.path.join(AKAR, "data/raw/osm")
KELUAR = os.path.join(AKAR, "public/data/osm_nasional")
KATEGORI = ["rs", "puskesmas", "klinik", "sekolah", "polisi", "damkar", "titik_kumpul", "pemerintahan", "jembatan"]


def kategori(t):
    am, hc, nm = t.get("amenity", ""), t.get("healthcare", ""), t.get("name", "").lower()
    if t.get("bridge") and t.get("highway"):
        return "jembatan"
    if am == "hospital" or hc == "hospital":
        return "rs"
    if "puskesmas" in nm or hc == "centre":
        return "puskesmas"
    if am in ("clinic", "doctors") or hc == "clinic":
        return "klinik"
    if am in ("school", "kindergarten"):
        return "sekolah"
    if am == "police":
        return "polisi"
    if am == "fire_station":
        return "damkar"
    if am == "shelter" or t.get("emergency") in ("assembly_point", "evacuation_centre", "evacuation_center"):
        return "titik_kumpul"
    if am == "townhall" or t.get("office") == "government":
        return "pemerintahan"
    if am == "place_of_worship":
        return "ibadah"
    return None


def susun(els):
    out, ibadah, seen = {k: [] for k in KATEGORI}, 0, set()
    for el in els:
        if (el["type"], el["id"]) in seen:
            continue
        seen.add((el["type"], el["id"]))
        k = kategori(el.get("tags", {}))
        if k == "ibadah":
            ibadah += 1
            continue
        c = el if "lat" in el else el.get("center")
        if not k or not c:
            continue
        out[k].append([round(c["lat"], 5), round(c["lon"], 5), el["tags"].get("name", "")])
    for v in out.values():
        v.sort()
    out["ibadah_n"] = ibadah
    return out


def bangun():
    os.makedirs(KELUAR, exist_ok=True)
    ringkas = {}
    for kode in PROVINSI:
        ps = [os.path.join(MENTAH, f"prov-{j}-{kode}.json") for j in ("fasilitas", "vital")]
        if not all(os.path.exists(p) for p in ps):
            print("lewati", kode, "(mentah belum lengkap)", file=sys.stderr)
            continue
        d = susun([el for p in ps for el in json.load(open(p))["elements"]])
        json.dump(d, open(os.path.join(KELUAR, f"{kode}.json"), "w"), ensure_ascii=False, separators=(",", ":"))
    for f in sorted(os.listdir(KELUAR)):
        if f[:2].isdigit():
            d = json.load(open(os.path.join(KELUAR, f)))
            ringkas[f[:2]] = {k: len(d[k]) for k in KATEGORI} | {"ibadah": d["ibadah_n"]}
    json.dump({"sumber": "OpenStreetMap (ODbL), kontributor OpenStreetMap", "provinsi": ringkas},
              open(os.path.join(KELUAR, "ringkas.json"), "w"), ensure_ascii=False, separators=(",", ":"))
    print(f"osm_nasional: {len(ringkas)} dari {len(PROVINSI)} provinsi")


def uji():
    els = [{"type": "node", "id": 1, "lat": -6.2, "lon": 106.8, "tags": {"amenity": "clinic", "name": "Puskesmas Tebet"}},
           {"type": "node", "id": 1, "lat": -6.2, "lon": 106.8, "tags": {"amenity": "clinic", "name": "Puskesmas Tebet"}},
           {"type": "way", "id": 2, "center": {"lat": -6.3, "lon": 106.9}, "tags": {"bridge": "yes", "highway": "primary"}},
           {"type": "node", "id": 3, "lat": -6.4, "lon": 106.7, "tags": {"amenity": "place_of_worship"}},
           {"type": "node", "id": 4, "lat": -6.4, "lon": 106.7, "tags": {"emergency": "assembly_point"}},
           {"type": "node", "id": 5, "lat": -6.4, "lon": 106.7, "tags": {"amenity": "bank"}}]
    d = susun(els)
    assert d["puskesmas"] == [[-6.2, 106.8, "Puskesmas Tebet"]], d  # duplikat dibuang
    assert len(d["jembatan"]) == 1 and len(d["titik_kumpul"]) == 1 and d["ibadah_n"] == 1
    assert sum(len(d[k]) for k in KATEGORI) == 3  # bank tidak masuk


if __name__ == "__main__":
    uji()
    bangun()
