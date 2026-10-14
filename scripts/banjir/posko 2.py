"""Titik tengah kecamatan dan rekomendasi posko banjir/longsor -> public/banjir/data/pusat_kec.json, public/banjir/data/posko.json

Posko mengikuti status (status.json) untuk hari ini s.d. +3:
  lapangan  : kecamatan yang mencapai Siaga/Awas (banjir atau longsor) di salah satu hari; kecamatan berdekatan
              (<= GABUNG_KM) di kabupaten yang sama dilayani satu posko, ditaruh di kecamatan berstatus tertinggi.
  kabupaten : satu per kabupaten yang punya posko lapangan, di titik tengah kecamatan-kecamatannya (berbobot level).
  provinsi  : di ibu kota provinsi yang punya posko kabupaten.
  permanen  : posko pra-musim di kabupaten paling sering banjir (kejadian BNPB) — satu per kabupaten, di kecamatan dengan
              indeks bahaya banjir InaRISK tertinggi; dipilih TERATAS kabupaten.
Jarak = haversine. Titik tengah kecamatan = titik berat luas poligon terbesar (shoelace).
"""
import json, math, os, sys

sys.path.insert(0, os.path.dirname(__file__))
from wilayah import AKAR

DATA = os.path.join(AKAR, "public/banjir/data")
GABUNG_KM, TERATAS = 15.0, 60
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


def km(a, b, c, d):
    r = math.pi / 180
    x = math.sin((c - a) * r / 2) ** 2 + math.cos(a * r) * math.cos(c * r) * math.sin((d - b) * r / 2) ** 2
    return 12742 * math.asin(math.sqrt(x))


def sentroid(ring):
    a = cx = cy = 0.0
    for (x1, y1), (x2, y2) in zip(ring, ring[1:] + ring[:1]):
        c = x1 * y2 - x2 * y1
        a += c; cx += (x1 + x2) * c; cy += (y1 + y2) * c
    if abs(a) < 1e-12:
        return sum(p[1] for p in ring) / len(ring), sum(p[0] for p in ring) / len(ring)
    return cy / (3 * a), cx / (3 * a)


def pusat_kec():
    out, d = {}, os.path.join(AKAR, "public/geo/kecamatan")
    for fn in sorted(os.listdir(d)):
        kode = fn[:2]
        for f in json.load(open(os.path.join(d, fn)))["features"]:
            g, p = f["geometry"], f["properties"]
            ring = max((q[0] for q in (g["coordinates"] if g["type"] == "MultiPolygon" else [g["coordinates"]])), key=len)
            la, lo = sentroid(ring)
            out[f"{kode}|{p['kab']}|{p['kec']}"] = [round(la, 4), round(lo, 4)]
    return out


def gabung(kec, pusat):
    """kec: [(kunci, level)] satu kabupaten, urut level turun. Greedy: kecamatan tertinggi jadi posko, yang <= GABUNG_KM ikut."""
    sisa, hasil = list(kec), []
    while sisa:
        k, lv = sisa.pop(0)
        la, lo = pusat[k]
        ikut = [x for x in sisa if km(la, lo, *pusat[x[0]]) <= GABUNG_KM]
        sisa = [x for x in sisa if x not in ikut]
        hasil.append((k, lv, [k] + [x[0] for x in ikut]))
    return hasil


def main():
    pusat = pusat_kec()
    json.dump(pusat, open(os.path.join(DATA, "pusat_kec.json"), "w"), ensure_ascii=False, separators=(",", ":"))
    st = json.load(open(os.path.join(DATA, "status.json")))
    bahaya = json.load(open(os.path.join(DATA, "bahaya.json"))).get("kec", {})
    kj = json.load(open(os.path.join(DATA, "kejadian.json")))
    per_kab = {}
    for k, v in st["kec"].items():
        lv = max(max(v.get("b", [0])), max(v.get("l", [0])))
        if lv >= 2 and k in pusat:
            per_kab.setdefault("|".join(k.split("|")[:2]), []).append((k, lv))
    lap, kab, prov = [], [], {}
    for kb, kec in sorted(per_kab.items()):
        kec.sort(key=lambda x: (-x[1], x[0]))
        anggota = []
        for k, lv, layan in gabung(kec, pusat):
            v = st["kec"][k]
            idx = f"L{len(lap) + 1:03d}"
            lap.append({"id": idx, "prov": k[:2], "kab": k.split("|")[1], "kec": k.split("|")[2], "lat": pusat[k][0], "lon": pusat[k][1],
                        "b": max(v.get("b", [0])), "l": max(v.get("l", [0])), "h3": v.get("h3"), "layan": [x.split("|")[2] for x in layan], "induk": None})
            anggota.append(lap[-1])
        w = sum(a["b"] + a["l"] for a in anggota) or 1
        la = sum(a["lat"] * (a["b"] + a["l"]) for a in anggota) / w
        lo = sum(a["lon"] * (a["b"] + a["l"]) for a in anggota) / w
        ik = f"K{len(kab) + 1:03d}"
        kab.append({"id": ik, "prov": kb[:2], "kab": kb.split("|")[1], "lat": round(la, 4), "lon": round(lo, 4), "lapangan": [a["id"] for a in anggota],
                    "awas": sum(1 for a in anggota if max(a["b"], a["l"]) == 3), "induk": "P" + kb[:2]})
        for a in anggota:
            a["induk"] = ik
        prov.setdefault(kb[:2], []).append(ik)
    pv = [{"id": "P" + k, "prov": k, "nama": IBUKOTA[k][0], "lat": IBUKOTA[k][1], "lon": IBUKOTA[k][2], "kabupaten": v} for k, v in sorted(prov.items()) if k in IBUKOTA]
    # permanen: kabupaten paling sering banjir (semua tahun yang ada untuk jenis banjir; bila tak ada, jenis "semua")
    def nk(v):
        j = v.get("banjir") or {}
        return sum(j.values()) if j else 0
    urut = sorted(((kb, nk(v)) for kb, v in kj.get("kab", {}).items() if nk(v) > 0), key=lambda x: -x[1])[:TERATAS]
    perm = []
    for kb, n in urut:
        cand = [(k, bahaya[k].get("banjir") or 0) for k in bahaya if k.startswith(kb + "|") and k in pusat]
        if not cand:
            continue
        k, b = max(cand, key=lambda x: x[1])
        perm.append({"id": f"T{len(perm) + 1:03d}", "prov": kb[:2], "kab": kb.split("|")[1], "kec": k.split("|")[2], "lat": pusat[k][0], "lon": pusat[k][1],
                     "kejadian": n, "bahaya": round(b, 2)})
    json.dump({"dibuat": st.get("hari", [""])[0], "gabung_km": GABUNG_KM, "lapangan": lap, "kabupaten": kab, "provinsi": pv, "permanen": perm},
              open(os.path.join(DATA, "posko.json"), "w"), ensure_ascii=False, separators=(",", ":"))
    print(f"{len(pusat)} kecamatan; posko lapangan {len(lap)}, kabupaten {len(kab)}, provinsi {len(pv)}, permanen {len(perm)}", file=sys.stderr)


if __name__ == "__main__":
    if sys.argv[1:] == ["uji"]:
        assert abs(km(0, 0, 0, 1) - 111.19) < .1
        la, lo = sentroid([[0, 0], [2, 0], [2, 2], [0, 2]])
        assert abs(la - 1) < 1e-9 and abs(lo - 1) < 1e-9
        p = {"a": [0, 0], "b": [0, .1], "c": [0, 1]}
        assert [x[2] for x in gabung([("a", 3), ("b", 2), ("c", 2)], p)] == [["a", "b"], ["c"]]
        print("ok")
    else:
        main()
