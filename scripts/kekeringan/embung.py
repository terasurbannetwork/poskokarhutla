"""Tampungan air (embung, waduk, bendungan) per kabupaten dari OpenStreetMap -> public/kekeringan/data/embung.json (statis, dijalankan tangan sesekali).

Satu kueri Overpass: way/relation landuse=reservoir atau water=reservoir, dan waterway=dam di Indonesia, titik tengahnya.
Kabupaten = kabupaten kecamatan dengan titik tengah terdekat (public/banjir/data/pusat_kec.json), jadi kasar; tanpa poligon batas kabupaten.
Peta OSM tidak lengkap dan kolam kecil ikut tercacah: angka ini batas bawah yang kasar, bukan inventaris resmi.

Pakai:  python3 scripts/kekeringan/embung.py        unduh + tulis
        python3 scripts/kekeringan/embung.py pusat  tambah titik pusat kabupaten ke berkas yang ada (tanpa jaringan)
        python3 scripts/kekeringan/embung.py uji    self-check tanpa jaringan
"""
import datetime as dt, json, math, os, sys, time, urllib.parse, urllib.request

AKAR = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "../.."))
KELUAR = os.path.join(AKAR, "public/kekeringan/data/embung.json")
SERVER = ["https://overpass-api.de/api/interpreter", "https://overpass.kumi.systems/api/interpreter"]
UA = {"User-Agent": "poskokarhutla/1.0 (karhutla public layer)"}
Q = ('[out:json][timeout:240];area["ISO3166-1"="ID"]->.a;'
     '(way(area.a)["landuse"="reservoir"];way(area.a)["water"="reservoir"];way(area.a)["waterway"="dam"];relation(area.a)["water"="reservoir"];);out center;')
MAKS = 100_000_000  # byte; 3.550 objek OSM ~1 MB, longgar untuk Overpass
MAKS_JARAK_KM = 60  # titik yang jauh dari pusat kecamatan mana pun (laut, perbatasan) dibuang


def unduh():
    data = urllib.parse.urlencode({"data": Q}).encode()
    for url in SERVER:
        try:
            with urllib.request.urlopen(urllib.request.Request(url, data, UA), timeout=280) as r:
                b = r.read(MAKS + 1)
            if len(b) > MAKS:
                raise RuntimeError(f"respons melebihi {MAKS // 1_000_000} MB")
            return json.loads(b)["elements"]
        except Exception as e:
            print(f"  overpass {url}: {e}", file=sys.stderr)
            time.sleep(5)
    raise RuntimeError("semua server Overpass gagal")


def titik(el):
    c = el.get("center") or el
    return (c["lat"], c["lon"]) if "lat" in c and "lon" in c else None


def hitung(elemen, pusat):
    """elemen = hasil Overpass, pusat = {'prov|kab|kec': [lat, lon]} -> {'prov|kab': jumlah}. Titik >MAKS_JARAK_KM dari pusat mana pun dibuang; id ganda dihitung sekali."""
    for k, (a, o) in pusat.items():
        if not (-90 <= a <= 90 and -180 <= o <= 180) or len(k.split("|")) != 3:
            raise ValueError(f"pusat kecamatan tak sah: {k} {a},{o}")
    daftar = [(k.rsplit("|", 1)[0], a, o) for k, (a, o) in pusat.items()]
    n, lihat = {}, set()
    for el in elemen:
        kid = (el.get("type"), el.get("id"))
        p = titik(el)
        if not p or kid in lihat:
            continue
        lihat.add(kid)
        c = math.cos(math.radians(p[0]))
        d, kab = min((((p[0] - a) ** 2 + ((p[1] - o) * c) ** 2), k) for k, a, o in daftar)
        if math.sqrt(d) * 111.2 <= MAKS_JARAK_KM:
            n[kab] = n.get(kab, 0) + 1
    return n


def pusat_kab(pusat, kab):
    """{'prov|kab': [lat, lon]} = rata-rata titik tengah kecamatan, hanya untuk kabupaten di `kab`; dipakai lapisan peta (lingkaran per kabupaten, bukan lokasi tampungan)."""
    a = {}
    for k, (la, lo) in pusat.items():
        kb = k.rsplit("|", 1)[0]
        if kb in kab:
            t = a.setdefault(kb, [0.0, 0.0, 0])
            t[0] += la; t[1] += lo; t[2] += 1
    return {kb: [round(t[0] / t[2], 3), round(t[1] / t[2], 3)] for kb, t in sorted(a.items())}


def tambah_pusat():
    """Tambahkan `pusat` ke embung.json yang sudah ada tanpa mengunduh ulang dari Overpass."""
    d = json.load(open(KELUAR))
    d["pusat"] = pusat_kab(json.load(open(os.path.join(AKAR, "public/banjir/data/pusat_kec.json"))), d["kab"])
    with open(KELUAR + ".tmp", "w") as f:
        json.dump(d, f, ensure_ascii=False, separators=(",", ":"))
    os.replace(KELUAR + ".tmp", KELUAR)
    print(f"embung: pusat {len(d['pusat'])} dari {len(d['kab'])} kabupaten")


def tulis():
    pusat = json.load(open(os.path.join(AKAR, "public/banjir/data/pusat_kec.json")))
    el = unduh()
    n = hitung(el, pusat)
    out = {"sumber": "OpenStreetMap (ODbL) via Overpass: landuse=reservoir, water=reservoir, waterway=dam",
           "tanggal": dt.date.today().isoformat(), "satuan": "jumlah objek per kabupaten (kasar: kabupaten kecamatan terdekat)",
           "total": sum(n.values()), "kab": dict(sorted(n.items()))}
    out["pusat"] = pusat_kab(pusat, out["kab"])
    with open(KELUAR + ".tmp", "w") as f:
        json.dump(out, f, ensure_ascii=False, separators=(",", ":"))
    os.replace(KELUAR + ".tmp", KELUAR)
    print(f"embung: {len(el)} objek OSM, {out['total']} terpetakan di {len(n)} kabupaten")


def uji():
    pusat = {"11|A|x": [3.0, 97.0], "11|A|y": [3.1, 97.1], "12|B|z": [-2.0, 110.0]}
    el = [{"type": "way", "id": 1, "center": {"lat": 3.05, "lon": 97.05}}, {"type": "way", "id": 1, "center": {"lat": 3.05, "lon": 97.05}},
          {"type": "way", "id": 2, "center": {"lat": -2.01, "lon": 110.01}}, {"type": "way", "id": 3, "center": {"lat": 20.0, "lon": 120.0}},
          {"type": "way", "id": 4}]
    assert hitung(el, pusat) == {"11|A": 1, "12|B": 1}, hitung(el, pusat)   # ganda sekali, jauh dibuang, tanpa titik dibuang
    try:
        hitung(el, {"11|A|x": [99.0, 0]})
        raise SystemExit("lat 99 harus ditolak")
    except ValueError:
        pass
    try:
        hitung(el, {"11|A": [1.0, 1.0]})
        raise SystemExit("kode wilayah rusak harus ditolak")
    except ValueError:
        pass
    assert pusat_kab(pusat, {"11|A": 1}) == {"11|A": [3.05, 97.05]}, pusat_kab(pusat, {"11|A": 1})   # rata-rata kecamatan; kab tak terhitung dibuang
    print("embung: ok")


if __name__ == "__main__":
    uji() if sys.argv[1:] == ["uji"] else tambah_pusat() if sys.argv[1:] == ["pusat"] else tulis()
