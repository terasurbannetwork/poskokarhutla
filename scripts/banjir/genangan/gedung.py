"""Kepadatan gedung per kecamatan Jakarta dari OSM (cadangan; Overture butuh duckdb/pyarrow yang tidak ada).

Overture buildings (GeoParquet di S3) tidak terbaca tanpa pyarrow/duckdb; stdlib tidak cukup. Cadangan: jumlah way["building"]
OSM per ubin 0,05 derajat lewat Overpass `out count` (63 kueri sopan, cache per ubin di data/raw/.../gedung_osm/). Kepadatan
ubin (gedung/km2) dibagikan ke kecamatan menurut sampel titik (langkah 0,001 derajat) di dalam poligonnya, jadi RESOLUSI
KASAR (~5 km): bukan jumlah gedung per kecamatan yang tepat. Kelengkapan OSM bervariasi.
Keluaran: public/banjir/data/genangan/gedung_kec.json. Data (c) kontributor OpenStreetMap, ODbL 1.0.
"""
import datetime as dt, json, math, os, sys, time, urllib.parse, urllib.request
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from bersama import KOTAK, MENTAH, RINGKAS, UA, WIB, KecDKI, baca, simpan

MIRROR = "https://maps.mail.ru/osm/tools/overpass/api/interpreter"
UBIN = 0.05
LANGKAH = 0.001


def ubin_semua():
    lon0, lat0 = math.floor(KOTAK[0] / UBIN) * UBIN, math.floor(KOTAK[1] / UBIN) * UBIN
    return [(round(lat0 + j * UBIN, 4), round(lon0 + i * UBIN, 4))
            for j in range(math.ceil((KOTAK[3] - lat0) / UBIN)) for i in range(math.ceil((KOTAK[2] - lon0) / UBIN))]


def hitung(lat, lon, coba=4):
    q = f'[out:json][timeout:120];way["building"]({lat},{lon},{lat + UBIN},{lon + UBIN});out count;'
    for i in range(coba):
        try:
            req = urllib.request.Request(MIRROR, data=urllib.parse.urlencode({"data": q}).encode(), headers={"User-Agent": UA})
            with urllib.request.urlopen(req, timeout=150) as r:
                return int(json.loads(r.read())["elements"][0]["tags"]["ways"])
        except Exception as e:
            if i == coba - 1:
                raise RuntimeError(f"ubin {lat},{lon}: {e}")
            time.sleep(20 * (i + 1))


def kepadatan(cache, kec):
    """-> {kab|kec: {luas_km2, gedung_perkiraan, per_km2}}"""
    h = {}
    lon = KOTAK[0]
    while lon <= KOTAK[2]:
        lat = KOTAK[1]
        while lat <= KOTAK[3]:
            k = kec.cari(lon, lat)
            if k:
                n = cache.get(f"{math.floor(lat / UBIN) * UBIN:.2f},{math.floor(lon / UBIN) * UBIN:.2f}")
                if n is not None:
                    luas_ubin = (UBIN * 111.32 * math.cos(math.radians(lat))) * (UBIN * 110.57)
                    l = (LANGKAH * 111.32 * math.cos(math.radians(lat))) * (LANGKAH * 110.57)
                    a = h.setdefault(f"{k[0]}|{k[1]}", [0.0, 0.0])
                    a[0] += l
                    a[1] += n / luas_ubin * l
            lat += LANGKAH
        lon += LANGKAH
    return {k: {"luas_km2": round(a[0], 2), "gedung_perkiraan": round(a[1]), "per_km2": round(a[1] / a[0]) if a[0] else None}
            for k, a in sorted(h.items())}


def jalankan():
    jalur = os.path.join(MENTAH, "gedung_osm", "ubin.json")
    cache = baca(jalur, {})
    gagal = 0
    for lat, lon in ubin_semua():
        kunci = f"{lat:.2f},{lon:.2f}"
        if kunci in cache:
            continue
        try:
            cache[kunci] = hitung(lat, lon)
        except RuntimeError as e:
            print("  GAGAL", e, file=sys.stderr)
            gagal += 1
            continue
        simpan(jalur, cache)
        time.sleep(2)
    simpan(os.path.join(RINGKAS, "gedung_kec.json"), {
        "dibuat": dt.datetime.now(WIB).isoformat(timespec="minutes"),
        "sumber": "(c) kontributor OpenStreetMap, ODbL 1.0 (Overpass maps.mail.ru). Overture tidak dipakai: butuh duckdb/pyarrow.",
        "resolusi": f"ubin {UBIN} derajat (~5 km); kecamatan = pembagian kepadatan ubin menurut sampel titik",
        "ubin_total": len(ubin_semua()), "ubin_terisi": len(cache), "ubin_gagal": gagal,
        "kecamatan": kepadatan(cache, KecDKI())})
    print(len(cache), "ubin,", sum(cache.values()), "gedung OSM total, gagal", gagal)


def uji():
    u = ubin_semua()
    assert len(set(u)) == len(u) and (-6.4, 106.6) in u and 50 < len(u) < 100, len(u)
    kec = KecDKI()
    c = {f"{math.floor(-6.2 / UBIN) * UBIN:.2f},{math.floor(106.8 / UBIN) * UBIN:.2f}": 1000}
    r = kepadatan(c, kec)
    assert r and all(v["per_km2"] >= 0 for v in r.values()), r
    print("ok")


if __name__ == "__main__":
    uji() if sys.argv[1:] == ["uji"] else jalankan()
