"""Prasarana kritis OSM 38 provinsi -> public/data/osm_nasional/<kode>.json + ringkas.json

Pakai:  python3 scripts/scrape/osm_nasional.py
Mentah: data/raw/osm/prov-fasilitas-<kode>.json dan prov-vital-<kode>.json dari
        scripts/scrape/tarik_osm.py fasilitas|vital <kode ...> (workflow osm-nasional.yml).
Baris tiap kategori: [lat, lon, nama], untuk rs, puskesmas, polisi, damkar ditambah nomor telepon bila tercatat di OSM: [lat, lon, nama, "+62..."]; rumah ibadah BERNAMA disimpan terpisah di ibadah/<kode>.json (tidak membengkakkan berkas utama), sisanya hanya dihitung.
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
BERNOMOR = {"rs", "puskesmas", "polisi", "damkar"}   # nomor telepon untuk kartu Nomor penting /lapor (pemilik 25 Nov 2026)


def nomor(t):
    """nomor pertama dari tag phone, contact:phone, contact:mobile dirapikan ke +62...; None bila tidak sah"""
    for kunci in ("phone", "contact:phone", "contact:mobile"):
        for mentah in str(t.get(kunci, "")).replace(",", ";").replace("/", ";").split(";"):
            d = "".join(ch for ch in mentah if ch.isdigit() or ch == "+")
            if d.startswith("+"):
                d = d[1:]
            if d.startswith("0"):
                d = "62" + d[1:]
            if not d.startswith("62") and len(d) >= 3 and d[:2] in ("21", "22", "24", "31", "61") :
                d = "62" + d   # kode area tanpa 0 di depan
            if d.startswith("62") and d[2:].startswith(("1500", "1300", "1400")):
                return d[2:]   # nomor layanan 1500xxx ditelepon tanpa kode negara
            if d.startswith(("1500", "1300", "1400")) and 6 <= len(d) <= 8:
                return d
            if d.startswith("62") and 9 <= len(d) <= 15 and "+" not in d:
                return "+" + d
    return None


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
    out, ibadah, seen, nama_ib = {k: [] for k in KATEGORI}, 0, set(), set()
    for el in els:
        if (el["type"], el["id"]) in seen:
            continue
        seen.add((el["type"], el["id"]))
        k = kategori(el.get("tags", {}))
        if k == "ibadah":
            ibadah += 1
            c = el if "lat" in el else el.get("center")
            nm = el.get("tags", {}).get("name", "").strip()
            if c and nm:
                nama_ib.add((round(c["lat"], 5), round(c["lon"], 5), nm))
            continue
        c = el if "lat" in el else el.get("center")
        if not k or not c:
            continue
        baris = [round(c["lat"], 5), round(c["lon"], 5), el["tags"].get("name", "")]
        no = nomor(el["tags"]) if k in BERNOMOR else None
        out[k].append(baris + [no] if no else baris)
    for v in out.values():
        v.sort()
    out["ibadah_n"] = ibadah
    out["ibadah"] = [list(t) for t in sorted(nama_ib)]
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
        os.makedirs(os.path.join(KELUAR, "ibadah"), exist_ok=True)
        json.dump(d.pop("ibadah"), open(os.path.join(KELUAR, "ibadah", f"{kode}.json"), "w"), ensure_ascii=False, separators=(",", ":"))
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
           {"type": "node", "id": 6, "lat": -6.4000001, "lon": 106.7, "tags": {"amenity": "place_of_worship", "name": "Masjid Al-Ikhlas"}},
           {"type": "node", "id": 7, "lat": -6.4, "lon": 106.7, "tags": {"amenity": "place_of_worship", "name": "Masjid Al-Ikhlas"}},
           {"type": "node", "id": 4, "lat": -6.4, "lon": 106.7, "tags": {"emergency": "assembly_point"}},
           {"type": "node", "id": 5, "lat": -6.4, "lon": 106.7, "tags": {"amenity": "bank"}}]
    d = susun(els)
    assert d["puskesmas"] == [[-6.2, 106.8, "Puskesmas Tebet"]], d  # duplikat dibuang
    assert len(d["jembatan"]) == 1 and len(d["titik_kumpul"]) == 1 and d["ibadah_n"] == 3
    assert d["ibadah"] == [[-6.4, 106.7, "Masjid Al-Ikhlas"]], d["ibadah"]  # bernama masuk, tak bernama tidak, kembar koordinat sama dibuang
    assert sum(len(d[k]) for k in KATEGORI) == 3  # bank tidak masuk
    assert nomor({"phone": "+62 21 5203 435"}) == "+62215203435"
    assert nomor({"contact:phone": "(021) 8191986; 0812-3456-789"}) == "+62218191986"
    assert nomor({"phone": "0812 3456 7890"}) == "+6281234567890"
    assert nomor({"phone": "+62 1 500 799"}) == "1500799" and nomor({"phone": "1500 799"}) == "1500799"
    assert nomor({"phone": "112"}) is None and nomor({"phone": "abc"}) is None and nomor({}) is None
    d2 = susun([{"type": "node", "id": 9, "lat": -6.1, "lon": 106.8, "tags": {"amenity": "hospital", "name": "RS A", "phone": "021-555-1234"}},
                {"type": "node", "id": 10, "lat": -6.1, "lon": 106.8, "tags": {"amenity": "school", "name": "SD B", "phone": "021-555-9999"}}])
    assert d2["rs"] == [[-6.1, 106.8, "RS A", "+62215551234"]] and d2["sekolah"] == [[-6.1, 106.8, "SD B"]], d2  # sekolah tidak diberi nomor


if __name__ == "__main__":
    uji()
    bangun()
