"""Garis kanal OSM (waterway=canal|ditch|drain) -> ubin 1x1 derajat public/data/kanal/<lon>_<lat>.json + indeks.json + nasional.json.

Pakai:  python3 scripts/scrape/kanal_garis.py            (mentah dari data/raw/osm, atau OSM_MENTAH=/jalur/ke/osm)
Ubin: FeatureCollection LineString, properti {j: 1 canal, 2 ditch, 3 drain}, koordinat 4 desimal, Douglas-Peucker TOL derajat.
nasional.json: ruas terpanjang saja, disederhanakan kasar, untuk zoom jauh (< 8).
Dibuang: ruas < MIN_KM (kecuali canal), titik duplikat setelah pembulatan. Sumber: OpenStreetMap (ODbL).
Peta lama (kanal.json grid 0,02) tetap dibangun kanal.py karena dipakai skrip model.
"""
import json, math, os, shutil, sys

AKAR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "../..")
sys.path.insert(0, os.path.join(AKAR, "scripts/data"))
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from wilayah import PRIORITAS
import tarik_osm
from tarik_osm import berkas, ubin
from kanal import GAMBUT_LAIN

if os.environ.get("OSM_MENTAH"):
    tarik_osm.MENTAH = os.environ["OSM_MENTAH"]

KELUAR = os.path.join(AKAR, "public/data/kanal")
TOL, MIN_KM = 0.0003, 0.05  # 0,0003 derajat = ~33 m
TOL_NAS, MIN_NAS_KM, MAKS_NAS = 0.01, 1.5, 1_300_000
JENIS = {"canal": 1, "ditch": 2, "drain": 3}


def jarak(p, a, b):
    dx, dy = b[0] - a[0], b[1] - a[1]
    t = 0 if dx == dy == 0 else max(0, min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (dx * dx + dy * dy)))
    return math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy)


def sederhana(c, tol):
    jaga, tumpuk = {0, len(c) - 1}, [(0, len(c) - 1)]
    while tumpuk:
        i, j = tumpuk.pop()
        d, m = max(((jarak(c[k], c[i], c[j]), k) for k in range(i + 1, j)), default=(0, 0))
        if d > tol:
            jaga.add(m)
            tumpuk += [(i, m), (m, j)]
    return [c[k] for k in sorted(jaga)]


def km(c):
    return sum(math.hypot((b[0] - a[0]) * 111.32 * math.cos(math.radians((a[1] + b[1]) / 2)), (b[1] - a[1]) * 110.57) for a, b in zip(c, c[1:]))


def bulat(c):
    out = []
    for x, y in c:
        p = [round(x, 4), round(y, 4)]
        if not out or out[-1] != p:
            out.append(p)
    return out


def potong(c, tol):
    """Ruas -> daftar (kunci ubin, garis) dengan titik batas ubin diinterpolasi (garis tidak putus di tepi)."""
    c = sederhana(c, tol)
    keluar, cur, kunci = [], [c[0]], (math.floor(c[0][0]), math.floor(c[0][1]))
    for a, b in zip(c, c[1:]):
        k2 = (math.floor(b[0]), math.floor(b[1]))
        if k2 != kunci:  # ubin pindah: belah di titik tengah (cukup, ruas antar-titik pendek setelah DP berbatas)
            cur.append(b)  # ponytail: ruas melintasi batas ikut ubin titik awal; lintas ubin 1 derajat jarang dan tetap tergambar utuh
            keluar.append((kunci, cur))
            cur, kunci = [b], k2
        else:
            cur.append(b)
    keluar.append((kunci, cur))
    return keluar


def bangun():
    mentah = tarik_osm.MENTAH
    ubinan, nas, seen, prov, dibuang = {}, [], set(), [], 0
    for kode in PRIORITAS + GAMBUT_LAIN:
        fs = [berkas(kode, "sungai", y, x) for y, x, _ in ubin(kode)]
        if not all(map(os.path.exists, fs)):
            print("lewati", kode, file=sys.stderr)
            continue
        prov.append(kode)
        for f in fs:
            for el in json.load(open(f))["elements"]:
                j = JENIS.get(el.get("tags", {}).get("waterway"))
                if not j or not el.get("geometry") or el["id"] in seen:
                    continue
                seen.add(el["id"])
                c = [(g["lon"], g["lat"]) for g in el["geometry"]]
                pj = km(c)
                if pj < MIN_KM and j != 1:
                    dibuang += 1
                    continue
                for k, g in potong(c, TOL):
                    g = bulat(g)
                    if len(g) >= 2:
                        ubinan.setdefault(k, []).append({"type": "Feature", "properties": {"j": j}, "geometry": {"type": "LineString", "coordinates": g}})
                if pj >= MIN_NAS_KM:
                    nas.append((pj, j, c))
    if os.path.isdir(KELUAR):
        shutil.rmtree(KELUAR)
    os.makedirs(KELUAR)
    indeks, total = {}, 0
    for (x, y), fs in sorted(ubinan.items()):
        nama = f"{x}_{y}"
        with open(os.path.join(KELUAR, nama + ".json"), "w") as o:
            json.dump({"type": "FeatureCollection", "features": fs}, o, separators=(",", ":"))
        indeks[nama] = len(fs)
        total += os.path.getsize(os.path.join(KELUAR, nama + ".json"))
    nas.sort(key=lambda t: -t[0])
    fn, ukuran = [], 0
    for pj, j, c in nas:  # ruas terpanjang dulu sampai anggaran byte habis
        g = bulat(sederhana(c, TOL_NAS))
        if len(g) < 2:
            continue
        f = {"type": "Feature", "properties": {"j": j}, "geometry": {"type": "LineString", "coordinates": g}}
        s = len(json.dumps(f, separators=(",", ":"))) + 1
        if ukuran + s > MAKS_NAS:
            break
        fn.append(f)
        ukuran += s
    json.dump({"type": "FeatureCollection", "features": fn}, open(os.path.join(KELUAR, "nasional.json"), "w"), separators=(",", ":"))
    json.dump({"sumber": "OpenStreetMap waterway=canal|ditch|drain (ODbL)", "j": {"1": "canal", "2": "ditch", "3": "drain"}, "provinsi": prov, "ubin": indeks},
              open(os.path.join(KELUAR, "indeks.json"), "w"), separators=(",", ":"))
    print(f"{len(seen)} ruas, {len(indeks)} ubin {total / 1e6:.1f} MB, nasional {len(fn)} ruas {ukuran / 1e6:.2f} MB, dibuang pendek (<{MIN_KM * 1000:.0f} m, ditch/drain) {dibuang}, provinsi {prov}")
    assert total < 25_000_000, "total ubin melebihi 25 MB: naikkan TOL atau MIN_KM"


if __name__ == "__main__":
    a = bulat(sederhana([(0, 0), (1, 1e-5), (2, 0), (2, 5)], 0.01))
    assert a == [[0, 0], [2, 0], [2, 5]], a
    assert [k for k, _ in potong([(0.5, 0.5), (1.5, 0.5)], 0.001)] == [(0, 0), (1, 0)]
    bangun()
