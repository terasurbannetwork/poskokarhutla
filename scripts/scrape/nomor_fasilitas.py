"""Isi nomor telepon fasilitas (rs, puskesmas, polisi, damkar) di public/data/osm_nasional/<prov>.json
dari Overture Maps Places (data/raw/overture/places_telp.json, di luar git).

Jalankan SESUDAH osm_nasional.py (bangun menulis ulang berkas dari OSM saja).
Baris: [lat, lon, nama, nomor, sumber] dengan sumber "osm" | "overture"; tanpa nomor tetap 3 unsur.
Cocok bila jenis sama, jarak < 150 m, dan nama mirip (nama pembeda kosong atau ragu = ditolak).
Python stdlib saja:  python3 -I scripts/scrape/nomor_fasilitas.py [uji]
"""
import difflib, json, math, os, re, sys, datetime

AKAR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DIR = os.path.join(AKAR, "public", "data", "osm_nasional")
MENTAH = os.path.join(AKAR, "data", "raw", "overture", "places_telp.json")
RILIS = "2026-11-18.0"
JARAK_M, MIRIP = 150, 0.6
JENIS = ("rs", "puskesmas", "polisi", "damkar")
BUANG = re.compile(r"\b(rs|rsu|rsud|rsia|rumah|sakit|umum|daerah|puskesmas|pustu|polsek|polres|polresta|polda|kantor|pos|pemadam|kebakaran|damkar|dan|unit|pelaksana|teknis|upt|uptd)\b")


def kunci(nama):
    return re.sub(r"\s+", " ", BUANG.sub(" ", re.sub(r"[^a-z0-9 ]", " ", (nama or "").lower()))).strip()


def jenis_dari(nama, dasar):
    n = (nama or "").lower()
    if re.match(r"^(puskesmas|pustu|poskesdes|polindes)\b", n):
        return "puskesmas"
    return dasar


def jenis_overture(r):
    n, k = (r["nama"] or "").lower(), r["kat"] or ""
    if re.search(r"\bpuskesmas\b|\bpustu\b", n): return "puskesmas"
    if k == "hospital" or re.search(r"\brs\b|rsud|rumah sakit", n): return "rs"
    if k == "police_station" or re.search(r"polsek|polres|polda|kepolisian", n): return "polisi"
    if k in ("fire_station", "fire_protection_service") or re.search(r"damkar|pemadam", n): return "damkar"
    return None


def nomor(daftar):
    for t in daftar or []:
        s = re.sub(r"[^\d+]", "", t or "")
        if re.fullmatch(r"\+62\d{8,13}", s):
            return s
    return None


def jarak_m(a, b, c, d):
    p = math.pi / 180
    x = (d - b) * p * math.cos((a + c) / 2 * p)
    return 6371000 * math.hypot(x, (c - a) * p)


def cocok(nama_a, nama_b):
    a, b = kunci(nama_a), kunci(nama_b)
    return bool(a) and bool(b) and difflib.SequenceMatcher(None, a, b).ratio() >= MIRIP


def jalankan():
    ov = [r for r in json.load(open(MENTAH)) if jenis_overture(r) and nomor(r["phones"])]
    grid = {}
    for r in ov:
        grid.setdefault((round(r["lat"], 2), round(r["lon"], 2)), []).append(r)
    berkas = sorted(f for f in os.listdir(DIR) if f[:2].isdigit() and f.endswith(".json"))
    sebelum, sesudah, total, tolak = {}, {}, {}, {}
    contoh, dipakai = [], set()
    for f in berkas:
        d = json.load(open(os.path.join(DIR, f)))
        for k in JENIS:
            for row in d.get(k) or []:
                j = jenis_dari(row[2], k)
                total[j] = total.get(j, 0) + 1
                if len(row) > 3 and row[3]:
                    sebelum[j] = sebelum.get(j, 0) + 1
                    del row[4:]; row.append("osm"); sesudah[j] = sesudah.get(j, 0) + 1
                    continue
                del row[3:]
                la, lo = row[0], row[1]
                kand = [r for dx in (-.01, 0, .01) for dy in (-.01, 0, .01)
                        for r in grid.get((round(la + dx, 2), round(lo + dy, 2)), [])]
                ok = [(jarak_m(la, lo, r["lat"], r["lon"]), r) for r in kand if jenis_overture(r) == j]
                ok = sorted(((m, r) for m, r in ok if m < JARAK_M and r["nama"]), key=lambda t: t[0])
                if not ok:
                    continue
                bagus = [(m, r) for m, r in ok if cocok(row[2], r["nama"])]
                if not bagus:
                    tolak[j] = tolak.get(j, 0) + 1   # ada tetangga dekat tapi nama ragu
                    continue
                m, r = bagus[0]
                row += [nomor(r["phones"]), "overture"]
                sesudah[j] = sesudah.get(j, 0) + 1
                if len(contoh) < 40: contoh.append((j, row[2], r["nama"], round(m), row[3]))
        json.dump(d, open(os.path.join(DIR, f), "w"), ensure_ascii=False, separators=(",", ":"))
    json.dump({"tanggal": datetime.date.today().isoformat(), "osm": "OpenStreetMap (ODbL), kontributor OpenStreetMap",
               "overture": f"Overture Maps Foundation Places rilis {RILIS}, sumber Meta/Microsoft/Foursquare (CDLA Permissive 2.0, Apache 2.0)",
               "aturan": f"jenis sama, jarak < {JARAK_M} m, kemiripan nama >= {MIRIP}"},
              open(os.path.join(DIR, "nomor_sumber.json"), "w"), ensure_ascii=False)
    return total, sebelum, sesudah, tolak, contoh


def uji():
    assert kunci("RSUD Dr. Soetomo") == "dr soetomo" and kunci("Puskesmas") == ""
    assert nomor(["+62 21 5203 435"]) == "+62215203435" and nomor(["112", "x"]) is None
    assert cocok("Puskesmas Tebet", "UPT Puskesmas Tebet") and not cocok("Puskesmas Tebet", "Puskesmas Kemang")
    assert not cocok("Puskesmas", "Puskesmas")   # tanpa nama pembeda: ragu
    assert 100 < jarak_m(0, 0, 0.001, 0) < 120
    print("ok")


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "uji":
        uji()
    else:
        t, s, a, x, c = jalankan()
        print("total", t); print("sebelum", s); print("sesudah", a); print("ditolak ragu", x)
        for r in c[:10]: print(r)
