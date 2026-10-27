"""Saluran dan rumah pompa Jakarta dari OSM lewat mirror Overpass (maps.mail.ru), satu kueri.

waterway=drain|canal|river|stream + man_made=pumping_station / amenity=pumping_station dalam KOTAK.
Keluaran: data/raw/banjir/genangan/saluran_osm.json (mentah, geometri) dan
public/banjir/data/genangan/saluran_kec.json (panjang km per jenis per kecamatan, jumlah rumah pompa).
OSM memberi topologi, TIDAK kapasitas (RANCANGAN §3). Data (c) kontributor OpenStreetMap, ODbL.
"""
import datetime as dt, json, math, os, sys, time, urllib.parse, urllib.request
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from bersama import KOTAK, MENTAH, RINGKAS, UA, WIB, KecDKI, baca, simpan

MIRROR = "https://maps.mail.ru/osm/tools/overpass/api/interpreter"
ATRIBUSI = "(c) kontributor OpenStreetMap, ODbL 1.0, lewat mirror Overpass maps.mail.ru; diolah Pantau Bencana."


def kueri():
    bb = f"{KOTAK[1]},{KOTAK[0]},{KOTAK[3]},{KOTAK[2]}"
    return (f'[out:json][timeout:180];(way["waterway"~"^(drain|canal|river|stream|ditch)$"]({bb});'
            f'nwr["man_made"="pumping_station"]({bb});nwr["amenity"="pumping_station"]({bb}););out geom;')


def unduh():
    jalur = os.path.join(MENTAH, "saluran_osm.json")
    if os.path.exists(jalur):
        return baca(jalur)
    req = urllib.request.Request(MIRROR, data=urllib.parse.urlencode({"data": kueri()}).encode(), headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=240) as r:
        d = json.loads(r.read())
    simpan(jalur, d)
    return d


def panjang_km(g):
    s = 0.0
    for a, b in zip(g, g[1:]):
        dy = (b["lat"] - a["lat"]) * 110.57
        dx = (b["lon"] - a["lon"]) * 111.32 * math.cos(math.radians((a["lat"] + b["lat"]) / 2))
        s += math.hypot(dx, dy)
    return s


def titik_tengah(e):
    if "lat" in e:
        return e["lon"], e["lat"]
    g = e.get("geometry") or []
    if g:
        m = g[len(g) // 2]
        return m["lon"], m["lat"]
    b = e.get("bounds")
    return ((b["minlon"] + b["maxlon"]) / 2, (b["minlat"] + b["maxlat"]) / 2) if b else None


def agregat(elemen, kec):
    out, luar = {}, 0
    for e in elemen:
        tag = e.get("tags") or {}
        p = titik_tengah(e)
        k = kec.cari(*p) if p else None
        if not k:
            luar += 1
            continue
        h = out.setdefault(f"{k[0]}|{k[1]}", {"km": {}, "rumah_pompa": 0})
        if tag.get("waterway") and e["type"] == "way":
            h["km"][tag["waterway"]] = round(h["km"].get(tag["waterway"], 0) + panjang_km(e["geometry"]), 3)
        elif tag.get("man_made") == "pumping_station" or tag.get("amenity") == "pumping_station":
            h["rumah_pompa"] += 1
    return out, luar


def jalankan():
    d = unduh()
    el = d["elements"]
    ag, luar = agregat(el, KecDKI())
    n = {}
    for e in el:
        t = (e.get("tags") or {}).get("waterway") or "pumping_station"
        n[t] = n.get(t, 0) + 1
    simpan(os.path.join(RINGKAS, "saluran_kec.json"), {
        "dibuat": dt.datetime.now(WIB).isoformat(timespec="minutes"), "sumber": ATRIBUSI, "osm_waktu": d.get("osm3s", {}).get("timestamp_osm_base"),
        "unsur_per_jenis": n, "unsur_luar_dki": luar, "kecamatan": ag,
        "catatan": "panjang = jumlah ruas yang titik tengahnya jatuh di kecamatan; kapasitas tidak ada di OSM."})
    print(n, "luar DKI:", luar, "kecamatan:", len(ag))


def uji():
    assert "waterway" in kueri() and "pumping_station" in kueri()
    g = [{"lat": -6.2, "lon": 106.8}, {"lat": -6.2, "lon": 106.81}]
    assert abs(panjang_km(g) - 1.106) < 0.01, panjang_km(g)
    ag, luar = agregat([{"type": "way", "tags": {"waterway": "canal"}, "geometry": g},
                        {"type": "node", "lat": -6.2, "lon": 106.81, "tags": {"man_made": "pumping_station"}},
                        {"type": "node", "lat": -7, "lon": 107, "tags": {}}], KecDKI())
    v = list(ag.values())[0]
    assert len(ag) == 1 and luar == 1 and v["rumah_pompa"] == 1 and v["km"]["canal"] > 1, (ag, luar)
    print("ok")


if __name__ == "__main__":
    uji() if sys.argv[1:] == ["uji"] else jalankan()
