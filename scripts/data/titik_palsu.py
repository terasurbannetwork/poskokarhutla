"""Titik panas FIRMS yang BUKAN kebakaran vegetasi -> public/data/titik_palsu.json (daftar sumber statis; belum dipasang ke pipeline titik).

Data NRT (yang dipakai harian.py) tidak membawa kolom `type`, sedangkan arsip standar (SP) membawanya (0 vegetasi, 1 gunung api,
2 sumber panas tetap darat, 3 lepas pantai). Skrip ini menurunkan daftar sel dari ARSIP, lalu titik NRT dicocokkan ke daftar itu.

Aturan (angka kalibrasi di `kalibrasi`, diukur pada arsip VIIRS S-NPP 2019 dan 2023-2025):
  sel 0,01 derajat (~1,1 km; piksel 375 m bergeser antar lintasan sehingga sel 375 m terpecah) menyala
  >= HARI_MIN hari dalam setahun, tersebar di >= BULAN_MIN bulan, pada >= TAHUN_MIN tahun berbeda.
  Kebakaran gambut besar (OKI 2015/2019) menyala berminggu-minggu di musim kemarau saja (3-5 bulan) dan tidak di sel yang sama
  tiap tahun, jadi lolos; sumber industri/tambang/kilang menyala sepanjang tahun, tiap tahun.
Jenis: PLTU (<= 1 km dari scripts/udara/pltu.py), kawah (<= aturan.RADIUS_GUNUNG_API dari puncak), selain itu tipe FIRMS mayoritas
(2 sumber panas tetap, 3 lepas pantai, 1 gunung api) atau "persisten" bila arsip menandainya vegetasi tetapi pola menyala-nya statis.
Tidak dipakai: suar migas VIIRS Nightfire / Global Gas Flaring (butuh akun EOG; tanpa kunci tidak terjangkau); suar darat tertangkap
lewat tipe FIRMS 2 dan pola persisten.

Pakai:  python3 scripts/data/titik_palsu.py bangun <viirs_2023.csv> <viirs_2024.csv> ...   (CSV dari firms.py, boleh satu per tahun)
        python3 scripts/data/titik_palsu.py dampak <csv_30hari>                            hitung titik terbuang di CSV itu
        python3 scripts/data/titik_palsu.py uji
"""
import csv, collections, datetime as dt, json, math, os, sys

sys.path.insert(0, os.path.dirname(__file__))
from wilayah import AKAR, PROVINSI, Wilayah
import aturan

JALUR = os.path.join(AKAR, "public/data/titik_palsu.json")
PLTU = os.path.join(AKAR, "public/udara/data/pltu.json")
HARI_MIN, BULAN_MIN, TAHUN_MIN, R_PLTU = 30, 8, 2, 1.0
TIPE = {"1": "gunung api", "2": "sumber panas tetap (industri/tambang/kilang)", "3": "lepas pantai (anjungan/suar)"}


def sel(lat, lon):
    return round(float(lat) * 100), round(float(lon) * 100)


def hitung(berkas):
    """CSV FIRMS -> {sel: {tahun: [set hari, set bulan]}}, {sel: Counter tipe}."""
    c, ty = collections.defaultdict(lambda: collections.defaultdict(lambda: [set(), set()])), collections.defaultdict(collections.Counter)
    for b in berkas:
        for r in csv.DictReader(open(b)):
            k, d = sel(r["latitude"], r["longitude"]), r["acq_date"]
            y = c[k][d[:4]]
            y[0].add(d)
            y[1].add(d[5:7])
            if r.get("type"):
                ty[k][r["type"]] += 1
    return c, ty


def statis(c):
    """Sel lolos: {sel: {tahun: (hari, bulan)}} untuk tahun yang memenuhi syarat, bila >= TAHUN_MIN tahun."""
    out = {}
    for k, ys in c.items():
        ok = {y: (len(h), len(m)) for y, (h, m) in ys.items() if len(h) >= HARI_MIN and len(m) >= BULAN_MIN}
        if len(ok) >= TAHUN_MIN:
            out[k] = ok
    return out


def km(la1, lo1, la2, lo2):
    return math.hypot(la1 - la2, (lo1 - lo2) * math.cos(math.radians(la1))) * 111.2


def jenis(lat, lon, tipe, pltu):
    for p in pltu:
        if abs(p["lat"] - lat) < 0.02 and abs(p["lon"] - lon) < 0.02 and km(lat, lon, p["lat"], p["lon"]) <= R_PLTU:
            return "PLTU", p["nama"]
    g = aturan.gunung_api(lat, lon)
    if g:
        return "kawah", g
    if tipe:
        t = tipe.most_common(1)[0][0]
        if t in TIPE:
            return TIPE[t].split(" (")[0], None
    return "persisten", None


def daftar(c, ty):
    pltu = json.load(open(PLTU))
    w, out = Wilayah(), []
    for k, ok in sorted(statis(c).items()):
        lat, lon = k[0] / 100, k[1] / 100
        j, nama = jenis(lat, lon, ty.get(k), pltu)
        a = w.cari(lon, lat)
        out.append({"lat": lat, "lon": lon, "jenis": j, "nama": nama, "hari": {y: v[0] for y, v in sorted(ok.items())},
                    "bulan": max(v[1] for v in ok.values()),
                    "wil": f"{a[2]}, {a[1]}, {PROVINSI.get(a[0], a[0])}" if a else "lepas pantai/luar batas"})
    return out


def bangun(berkas):
    c, ty = hitung(berkas)
    s = daftar(c, ty)
    tahun = sorted({y for ys in c.values() for y in ys})
    d = {"versi": 1, "dibuat": dt.datetime.now(dt.timezone.utc).replace(microsecond=0).isoformat(), "sel": 0.01, "tahun_arsip": tahun,
         "sumber": "NASA FIRMS VIIRS S-NPP arsip standar (kolom type), PLTU WRI Global Power Plant DB (public/udara/data/pltu.json), gunung api GVP (aturan.GUNUNG_API)",
         "kriteria": {"hari_min": HARI_MIN, "bulan_min": BULAN_MIN, "tahun_min": TAHUN_MIN, "r_pltu_km": R_PLTU, "r_kawah_km": aturan.RADIUS_GUNUNG_API},
         "kunci": "cocokkan titik: (round(lat*100), round(lon*100)) sama dengan (round(s.lat*100), round(s.lon*100)) milik satu entri sumber",
         "jumlah": dict(collections.Counter(x["jenis"] for x in s)),
         "kawah": [{"nama": n, "lat": la, "lon": lo, "r_km": aturan.RADIUS_GUNUNG_API} for n, la, lo in aturan.GUNUNG_API],
         "sumber_statis": s,
         "batasan": ["Daftar dari arsip tahun {} saja; sumber baru (smelter baru) baru tertangkap setelah menyala >= {} hari dalam {} tahun.".format(", ".join(tahun), HARI_MIN, TAHUN_MIN),
                     "Sel ~1,1 km: kebakaran nyata yang berada tepat di sel sumber statis ikut terbuang bila daftar dipasang.",
                     "Suar migas VIIRS Nightfire/Global Gas Flaring tidak dipakai (butuh akun); suar tertangkap hanya lewat tipe FIRMS 2 dan pola persisten."]}
    return d


def palsu(lat, lon, daftar_sel):
    """daftar_sel: set sel(...) dari entri sumber_statis. True bila titik jatuh di sel sumber statis."""
    return sel(lat, lon) in daftar_sel


def muat():
    d = json.load(open(JALUR))
    return {sel(s["lat"], s["lon"]) for s in d["sumber_statis"]}, d


def dampak(berkas):
    s, d = muat()
    n = tot = 0
    per = collections.Counter()
    for b in berkas:
        for r in csv.DictReader(open(b)):
            tot += 1
            if palsu(r["latitude"], r["longitude"], s):
                n += 1
                per[sel(r["latitude"], r["longitude"])] += 1
    return n, tot, per, d


def uji():
    # sel statis: 40 hari di 10 bulan dua tahun; kebakaran gambut: 60 hari tapi 4 bulan, dua tahun; satu tahun saja: dibuang
    def hari(y, n, bulan):
        return [set(f"{y}-{(i % bulan) + 1:02d}-{(i // bulan) + 1:02d}" for i in range(n)), {f"{(i % bulan) + 1:02d}" for i in range(n)}]
    c = {(0, 0): {"2024": hari("2024", 40, 10), "2025": hari("2025", 40, 10)},
         (1, 1): {"2019": hari("2019", 60, 4), "2023": hari("2023", 60, 4)},
         (2, 2): {"2025": hari("2025", 200, 12)}}
    assert set(statis(c)) == {(0, 0)}, statis(c)
    assert palsu(0.001, 0.001, {(0, 0)}) and not palsu(0.02, 0.0, {(0, 0)})
    assert jenis(-7.54, 110.446, None, [])[0] == "kawah" and jenis(-3.0, 120.0, collections.Counter({"2": 5}), [])[0] == "sumber panas tetap"
    assert jenis(-6.446, 110.742, None, json.load(open(PLTU)))[0] == "PLTU"
    assert jenis(-3.0, 120.0, None, [])[0] == "persisten"
    print("titik_palsu.py: uji lulus")


if __name__ == "__main__":
    a = sys.argv[1:]
    if a[:1] == ["uji"]:
        uji()
    elif a[:1] == ["bangun"] and len(a) > 1:
        d = bangun(a[1:])
        with open(JALUR, "w") as f:
            json.dump(d, f, ensure_ascii=False, separators=(",", ":"))
        print(f"titik_palsu.json: {len(d['sumber_statis'])} sel, {d['jumlah']}, {os.path.getsize(JALUR) / 1024:.0f} KB")
    elif a[:1] == ["dampak"] and len(a) > 1:
        n, tot, per, d = dampak(a[1:])
        print(f"{n} dari {tot} titik ({100 * n / max(tot, 1):.1f}%) jatuh di sel sumber statis")
    else:
        print(__doc__)
