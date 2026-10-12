"""Bandara, landasan perintis, helipad & pangkalan udara -> public/data/udara.json

Pakai:  python3 scripts/scrape/udara.py
Sumber: OurAirports (domain publik) seluruh Indonesia + OpenStreetMap via Overpass (ODbL,
(c) kontributor OpenStreetMap) untuk 9 provinsi prioritas. Respons mentah di data/raw/udara/
dan data/raw/osm/ dipakai ulang (hapus untuk menarik ulang).
Titik OSM yang jatuh < 2 km dari titik OurAirports dibuang (OurAirports lebih lengkap: ICAO,
panjang landasan); OSM hanya menambah yang tidak dikenal OurAirports.
"""
import csv, io, json, math, os, re, sys, urllib.request

AKAR = os.path.join(os.path.dirname(__file__), "../..")
sys.path.insert(0, os.path.join(AKAR, "scripts/data"))
sys.path.insert(0, os.path.dirname(__file__))
from wilayah import PRIORITAS, Wilayah
from osm import bbox, overpass

MENTAH = os.path.join(AKAR, "data/raw/udara")
KELUAR = os.path.join(AKAR, "public/data/udara.json")
OA = "https://davidmegginson.github.io/ourairports-data/"
MILITER = re.compile(r"\b(lanud|lanal|lanudal|air force|air base|airbase|afb|pangkalan|tni|militer|military|naval air)\b", re.I)
JENIS_OA = {"large_airport": "bandara_besar", "medium_airport": "bandara_sedang",
            "small_airport": "bandara_kecil", "heliport": "helipad"}
PERMUKAAN = [("aspal", r"asp|bitum|tar|pem|paved"), ("beton", r"con|cem|pcc"), ("rumput", r"gr[as]|turf"),
             ("tanah", r"dirt|earth|soil|clay|lat|gvl|grav|sand|coral|unpaved|gnd|ground"), ("air", r"water")]


def unduh(nama):
    berkas = os.path.join(MENTAH, nama)
    if not os.path.exists(berkas):
        os.makedirs(MENTAH, exist_ok=True)
        req = urllib.request.Request(OA + nama, headers={"User-Agent": "poskokarhutla/1.0"})
        open(berkas, "wb").write(urllib.request.urlopen(req, timeout=120).read())
    return list(csv.DictReader(io.open(berkas, encoding="utf-8")))


def permukaan(s):
    s = (s or "").lower()
    for nama, pola in PERMUKAAN:
        if re.search(pola, s):
            return nama
    return s or None


def km(a, b):
    dx = (a[0] - b[0]) * 111.32 * math.cos(math.radians((a[1] + b[1]) / 2))
    return math.hypot(dx, (a[1] - b[1]) * 110.57)


def jenis(dasar, nama, militer, landasan_m, perm):
    if militer or MILITER.search(nama or ""):
        return "pangkalan_militer"
    if dasar == "bandara_kecil" and (perm in ("tanah", "rumput") or (landasan_m and landasan_m < 1200)):
        return "landasan_perintis"
    return dasar


def dari_ourairports():
    landasan = {}
    for r in unduh("runways.csv"):
        if r["closed"] == "1":
            continue
        try:
            m = round(float(r["length_ft"]) * 0.3048)
        except ValueError:
            continue
        if m > landasan.get(r["airport_ref"], (0,))[0]:
            landasan[r["airport_ref"]] = (m, permukaan(r["surface"]))
    hasil = []
    for a in unduh("airports.csv"):
        if a["iso_country"] != "ID" or a["type"] not in JENIS_OA:
            continue  # buang closed, seaplane_base, balloonport
        m, perm = landasan.get(a["id"], (None, None))
        icao = a["icao_code"] or (a["gps_code"] if re.fullmatch(r"W[AIR][A-Z]{2}", a["gps_code"] or "") else "")
        hasil.append({"id": "oa-" + a["ident"], "nama": a["name"], "icao": icao or None,
                      "iata": a["iata_code"] or None,
                      "jenis": jenis(JENIS_OA[a["type"]], a["name"] + " " + a["keywords"], False, m, perm),
                      "lat": round(float(a["latitude_deg"]), 5), "lon": round(float(a["longitude_deg"]), 5),
                      "landasan_m": m, "permukaan": perm, "sumber": "OurAirports"})
    return hasil


def q_udara(b):
    s = "%.4f,%.4f,%.4f,%.4f" % b
    return f"""[out:json][timeout:180];
(
  nwr[aeroway~"^(aerodrome|airstrip|helipad|heliport)$"]({s});
  nwr[military=airfield]({s});
  way[aeroway=runway]({s});
);
out center tags;"""


def dari_osm():
    hasil, landasan = [], []
    for kode in PRIORITAS:
        for e in overpass(q_udara(bbox(kode)), os.path.join(AKAR, "data/raw/osm", f"udara-{kode}.json"))["elements"]:
            t, c = e.get("tags", {}), e.get("center") or e
            if "lat" not in c:
                continue
            titik = (c["lon"], c["lat"])
            if t.get("aeroway") == "runway":
                landasan.append((titik, t))
                continue
            aw = t.get("aeroway", "")
            dasar = "helipad" if aw in ("helipad", "heliport") else (
                "landasan_perintis" if aw == "airstrip" else "bandara_kecil")
            perm = permukaan(t.get("surface"))
            hasil.append({"id": f"osm-{e['type'][0]}{e['id']}", "nama": t.get("name") or t.get("name:id"),
                          "icao": t.get("icao") or None, "iata": t.get("iata") or None,
                          "jenis": jenis(dasar, t.get("name", "") + " " + t.get("operator", ""),
                                         "military" in t or t.get("landuse") == "military", None, perm),
                          "lat": round(c["lat"], 5), "lon": round(c["lon"], 5),
                          "landasan_m": None, "permukaan": perm, "sumber": "OSM"})
    # landasan OSM: panjang tidak ada di tag `out center`; pakai tag length bila diisi kontributor
    for titik, t in landasan:
        try:
            m = round(float(re.sub(r"[^\d.]", "", t.get("length", "")) or "x"))
        except ValueError:
            m = None
        dekat = min(hasil, key=lambda h: km(titik, (h["lon"], h["lat"])), default=None)
        if dekat and km(titik, (dekat["lon"], dekat["lat"])) < 3:
            if m and m > (dekat["landasan_m"] or 0):
                dekat["landasan_m"] = m
            dekat["permukaan"] = dekat["permukaan"] or permukaan(t.get("surface"))
    return hasil


def susun():
    oa = dari_ourairports()
    osm = [o for o in dari_osm()
           if not any(km((o["lon"], o["lat"]), (a["lon"], a["lat"])) < 2
                      and (o["jenis"] == "helipad") == (a["jenis"] == "helipad") for a in oa)]
    seen, gabung = set(), []
    for x in oa + osm:
        if x["id"] not in seen:
            seen.add(x["id"]); gabung.append(x)
    w = Wilayah()
    for x in gabung:
        r = w.cari(x["lon"], x["lat"])
        x["prov"], x["kab"] = (r[0], r[1]) if r else (None, None)
    return [{k: x[k] for k in ("id", "nama", "icao", "iata", "jenis", "lat", "lon", "prov", "kab",
                                "landasan_m", "permukaan", "sumber")} for x in gabung]


if __name__ == "__main__":
    assert permukaan("ASP") == "aspal" and permukaan("CON") == "beton" and permukaan("GRS") == "rumput"
    assert jenis("bandara_besar", "Roesmin Nurjadin Lanud", False, 2600, "aspal") == "pangkalan_militer"
    assert jenis("bandara_kecil", "Ewer", False, 900, "aspal") == "landasan_perintis"
    data = susun()
    json.dump(data, open(KELUAR, "w"), ensure_ascii=False, separators=(",", ":"))
    from collections import Counter
    print(len(data), "titik ->", KELUAR)
    print(Counter(d["jenis"] for d in data).most_common())
    print(sorted(Counter(d["prov"] for d in data if d["prov"] in PRIORITAS).items()))
