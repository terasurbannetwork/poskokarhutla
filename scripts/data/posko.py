"""Rekomendasi lokasi posko lapangan per kabupaten (masalah cakupan maksimum, greedy).

Bobot kompleks = (3 bila prioritas, 1 bila siaga) x max(1, piksel aktif 24 jam).
Kandidat lokasi = desa OSM (public/data/osm/<prov>.json) bila ada, selain itu titik tengah kecamatan.
Ulangi: pilih kandidat yang menjangkau bobot terbesar dalam RADIUS_KM, sampai semua kompleks terjangkau
atau sisa kompleks tidak terjangkau kandidat mana pun.
"""
import json, math, os, sys

sys.path.insert(0, os.path.dirname(__file__))
from wilayah import AKAR

RADIUS_KM = 30.0  # kira-kira 1 jam perjalanan darat/sungai di lahan gambut

# Ibu kota provinsi = lokasi posko pusat (Satgas provinsi)
IBUKOTA = {
    "11": ("Banda Aceh", 5.55, 95.32), "12": ("Medan", 3.59, 98.67), "13": ("Padang", -0.95, 100.35), "14": ("Pekanbaru", 0.51, 101.45),
    "15": ("Kota Jambi", -1.61, 103.61), "16": ("Palembang", -2.98, 104.76), "17": ("Bengkulu", -3.80, 102.27), "18": ("Bandar Lampung", -5.43, 105.26),
    "19": ("Pangkalpinang", -2.13, 106.11), "21": ("Tanjungpinang", 0.92, 104.45), "31": ("Jakarta", -6.18, 106.83), "32": ("Bandung", -6.91, 107.61),
    "33": ("Semarang", -6.97, 110.42), "34": ("Yogyakarta", -7.80, 110.37), "35": ("Surabaya", -7.25, 112.75), "36": ("Serang", -6.12, 106.15),
    "51": ("Denpasar", -8.65, 115.22), "52": ("Mataram", -8.58, 116.12), "53": ("Kupang", -10.17, 123.61), "61": ("Pontianak", -0.03, 109.33),
    "62": ("Palangka Raya", -2.21, 113.92), "63": ("Banjarbaru", -3.44, 114.83), "64": ("Samarinda", -0.50, 117.15), "65": ("Tanjung Selor", 2.84, 117.37),
    "71": ("Manado", 1.47, 124.84), "72": ("Palu", -0.90, 119.87), "73": ("Makassar", -5.14, 119.42), "74": ("Kendari", -3.97, 122.51),
    "75": ("Gorontalo", 0.54, 123.06), "76": ("Mamuju", -2.68, 118.89), "81": ("Ambon", -3.70, 128.18), "82": ("Sofifi", 0.74, 127.56),
    "91": ("Jayapura", -2.53, 140.72), "92": ("Manokwari", -0.86, 134.08), "93": ("Merauke", -8.49, 140.40), "94": ("Nabire", -3.36, 135.50),
    "95": ("Wamena", -4.10, 138.94), "96": ("Sorong", -0.88, 131.26),
}
DATA = os.path.join(AKAR, "public/data")


def km(a1, o1, a2, o2):
    r = math.pi / 180
    h = math.sin((a2 - a1) * r / 2) ** 2 + math.cos(a1 * r) * math.cos(a2 * r) * math.sin((o2 - o1) * r / 2) ** 2
    return 12742 * math.asin(math.sqrt(h))


def tengah_kecamatan(kode):
    out = []
    for f in json.load(open(os.path.join(AKAR, "public/geo/kecamatan", f"{kode}.json")))["features"]:
        g = f["geometry"]
        ring = max((p[0] for p in (g["coordinates"] if g["type"] == "MultiPolygon" else [g["coordinates"]])), key=len)
        out.append({"lat": sum(c[1] for c in ring) / len(ring), "lon": sum(c[0] for c in ring) / len(ring),
                    "nama": "Kec. " + (f["properties"]["kec"] or "?"), "kab": f["properties"]["kab"], "jenis": "kecamatan"})
    return out


def osm(kode):
    p = os.path.join(DATA, "osm", f"{kode}.json")
    return json.load(open(p)) if os.path.exists(p) else None


def terdekat(lat, lon, titik):
    if not titik:
        return None
    t = min(titik, key=lambda x: (x[0] - lat) ** 2 + ((x[1] - lon) * math.cos(math.radians(lat))) ** 2)
    return t, km(lat, lon, t[0], t[1])


def pilih(kompleks, kandidat, radius=RADIUS_KM):
    """Greedy maximal covering. kompleks: [{lat, lon, w, ...}], kandidat: [{lat, lon, ...}]."""
    sisa = list(range(len(kompleks)))
    jangkau = [[i for i in range(len(kompleks)) if km(c["lat"], c["lon"], kompleks[i]["lat"], kompleks[i]["lon"]) <= radius]
               for c in kandidat]
    hasil = []
    while sisa:
        s = set(sisa)
        j = max(range(len(kandidat)), key=lambda j: sum(kompleks[i]["w"] for i in jangkau[j] if i in s), default=None)
        kena = [i for i in jangkau[j] if i in s] if j is not None else []
        if not kena:
            break
        hasil.append((kandidat[j], [kompleks[i] for i in kena]))
        sisa = [i for i in sisa if i not in kena]
    return hasil, [kompleks[i] for i in sisa]


def posko_permanen(target=0.8):
    """Posko permanen (didirikan sebelum musim) dari kekerapan kebakaran 2015-sekarang.
    Bobot kecamatan = jumlah tahun dengan >= 10 titik x log(1 + total titik). Per provinsi, greedy sampai 80% bobot terjangkau."""
    p = os.path.join(DATA, "sejarah.json")
    if not os.path.exists(p):
        return []
    sj = json.load(open(p))
    per_prov = {}
    for k, v in sj["kec"].items():
        prov, kab, kec = k.split("|")
        tahun = sum(1 for x in v if x >= 10)
        if tahun >= 3:  # langganan: terbakar berarti di >= 3 tahun
            per_prov.setdefault(prov, []).append({"kab": kab, "kec": kec, "tahun": tahun, "total": sum(v), "w": tahun * math.log1p(sum(v))})
    hasil = []
    for prov, kom in per_prov.items():
        pusat = {(c["kab"], c["nama"][5:]): c for c in tengah_kecamatan(prov)}
        kom = [dict(k, **{"lat": pusat[(k["kab"], k["kec"])]["lat"], "lon": pusat[(k["kab"], k["kec"])]["lon"]}) for k in kom if (k["kab"], k["kec"]) in pusat]
        total, kena = sum(k["w"] for k in kom), 0
        pilihan, _ = pilih(kom, kom)
        for c, ikut in pilihan:
            if kena >= target * total:
                break
            kena += sum(k["w"] for k in ikut)
            hasil.append({"prov": prov, "kab": c["kab"], "nama": "Kec. " + c["kec"], "lat": round(c["lat"], 4), "lon": round(c["lon"], 4),
                          "kecamatan": len(ikut), "tahun_maks": max(k["tahun"] for k in ikut), "titik": sum(k["total"] for k in ikut),
                          "cakupan": round(kena / total * 100)})
    hasil.sort(key=lambda x: -x["titik"])
    for i, x in enumerate(hasil):
        x["id"] = f"T{i + 1:03d}"
    print(f"{len(hasil)} posko permanen", file=sys.stderr)
    return hasil


def main():
    fitur = json.load(open(os.path.join(DATA, "kluster.json")))["features"]
    daops = json.load(open(os.path.join(DATA, "daops.json"))) if os.path.exists(os.path.join(DATA, "daops.json")) else []
    per_kab = {}
    for f in fitur:
        p = f["properties"]
        if p["level"] >= 2:
            per_kab.setdefault((p["prov"], p["kab"]), []).append(
                {"id": p["id"], "lat": p["lat"], "lon": p["lon"], "lv": p["level"], "w": (3 if p["level"] == 3 else 1) * max(1, p["px24"])})
    cache, posko, lepas = {}, [], 0
    for (prov, kab), kom in per_kab.items():
        if prov not in cache:
            o = osm(prov)
            cache[prov] = (o, [{"lat": d[0], "lon": d[1], "nama": d[2], "jenis": d[3]} for d in o["desa"]] if o else tengah_kecamatan(prov))
        o, kand = cache[prov]
        # kandidat: dalam kotak kabupaten + 0,3 derajat (posko boleh di kabupaten tetangga yang lebih dekat)
        a0, a1 = min(k["lat"] for k in kom) - .3, max(k["lat"] for k in kom) + .3
        b0, b1 = min(k["lon"] for k in kom) - .3, max(k["lon"] for k in kom) + .3
        kd = [c for c in kand if a0 <= c["lat"] <= a1 and b0 <= c["lon"] <= b1] or [{"lat": k["lat"], "lon": k["lon"], "nama": "dekat " + k["id"], "jenis": "kompleks"} for k in kom]
        hasil, sisa = pilih(kom, kd)
        lepas += len(sisa)
        for c, kena in hasil:
            d = min(daops, key=lambda d: km(c["lat"], c["lon"], d["lat"], d["lon"])) if daops else None
            air = terdekat(c["lat"], c["lon"], o["air"]) if o else None
            fk = terdekat(c["lat"], c["lon"], o["faskes"]) if o else None
            posko.append({
                "prov": prov, "kab": kab, "nama": c["nama"], "jenis": c["jenis"], "lat": round(c["lat"], 4), "lon": round(c["lon"], 4),
                "kompleks": [k["id"] for k in kena], "prioritas": sum(1 for k in kena if k["lv"] == 3), "bobot": sum(k["w"] for k in kena),
                "jarak_rata": round(sum(km(c["lat"], c["lon"], k["lat"], k["lon"]) for k in kena) / len(kena), 1),
                "jarak_maks": round(max(km(c["lat"], c["lon"], k["lat"], k["lon"]) for k in kena), 1),
                "daops": d and {"nama": d["nama"], "km": round(km(c["lat"], c["lon"], d["lat"], d["lon"]))},
                "air": air and {"jenis": air[0][2], "nama": air[0][3] if len(air[0]) > 3 else "", "km": round(air[1], 1)},
                "faskes": fk and {"nama": fk[0][2], "jenis": fk[0][3] if len(fk[0]) > 3 else "", "km": round(fk[1], 1)},
            })
    posko.sort(key=lambda x: -x["bobot"])
    for i, x in enumerate(posko):
        x["id"] = f"P{i + 1:03d}"

    # tingkat menengah: satu per kabupaten yang punya posko lapangan; lokasi = kota/kecamatan terdekat ke pusat bobot
    kab_geo = {}
    menengah = []
    for (prov, kab) in sorted({(x["prov"], x["kab"]) for x in posko}):
        anak = [x for x in posko if x["prov"] == prov and x["kab"] == kab]
        if prov not in kab_geo:
            kab_geo[prov] = tengah_kecamatan(prov)
        o = cache.get(prov, (None,))[0]
        kota = [{"lat": d[0], "lon": d[1], "nama": d[2]} for d in o["desa"] if d[3] in ("town", "city")] if o else []
        bw = sum(x["bobot"] for x in anak)
        la, lo = sum(x["lat"] * x["bobot"] for x in anak) / bw, sum(x["lon"] * x["bobot"] for x in anak) / bw
        kand = kota or [k for k in kab_geo[prov] if k["kab"] == kab] or [{"lat": la, "lon": lo, "nama": kab}]
        c = min(kand, key=lambda k: km(la, lo, k["lat"], k["lon"]))
        menengah.append({"id": f"M{len(menengah) + 1:03d}", "prov": prov, "kab": kab, "nama": c["nama"], "lat": round(c["lat"], 4), "lon": round(c["lon"], 4),
                         "lapangan": [x["id"] for x in anak], "kompleks": sum(len(x["kompleks"]) for x in anak),
                         "prioritas": sum(x["prioritas"] for x in anak), "bobot": bw})
        for x in anak:
            x["induk"] = menengah[-1]["id"]
    pusat = []
    for prov in sorted({m["prov"] for m in menengah}):
        anak = [m for m in menengah if m["prov"] == prov]
        nm, la, lo = IBUKOTA[prov]
        pusat.append({"id": f"U{prov}", "prov": prov, "nama": nm, "lat": la, "lon": lo, "menengah": [m["id"] for m in anak],
                      "lapangan": sum(len(m["lapangan"]) for m in anak), "kompleks": sum(m["kompleks"] for m in anak),
                      "prioritas": sum(m["prioritas"] for m in anak)})
        for m in anak:
            m["induk"] = pusat[-1]["id"]
            m["jarak_induk"] = round(km(m["lat"], m["lon"], la, lo))
    permanen = posko_permanen()
    with open(os.path.join(DATA, "posko.json"), "w") as f:
        json.dump({"radius_km": RADIUS_KM, "posko": posko, "menengah": menengah, "pusat": pusat, "permanen": permanen}, f, ensure_ascii=False, separators=(",", ":"))
    print(f"{len(pusat)} pusat, {len(menengah)} menengah, {len(posko)} lapangan", file=sys.stderr)
    print(f"{len(posko)} posko untuk {sum(len(v) for v in per_kab.values())} kompleks siaga/prioritas, {lepas} tak terjangkau", file=sys.stderr)


if __name__ == "__main__":
    if sys.argv[1:] == ["uji"]:
        kom = [{"id": "a", "lat": 0, "lon": 0, "w": 5}, {"id": "b", "lat": 0, "lon": .1, "w": 1}, {"id": "c", "lat": 0, "lon": 1, "w": 1}]
        kand = [{"lat": 0, "lon": .05}, {"lat": 0, "lon": 1}]
        h, s = pilih(kom, kand)
        assert [len(x[1]) for x in h] == [2, 1] and not s, h  # posko pertama menjangkau a+b, kedua c
        assert abs(km(0, 0, 0, 1) - 111.2) < .2
        print("ok")
    else:
        main()
