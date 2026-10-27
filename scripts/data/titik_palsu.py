"""Titik panas FIRMS yang BUKAN kebakaran vegetasi -> public/data/titik_palsu.json (daftar sumber statis; dipasang di harian.py, bendera env TITIK_PALSU=0 mematikan).

Data NRT (yang dipakai harian.py) tidak membawa kolom `type`, sedangkan arsip standar (SP) membawanya (0 vegetasi, 1 gunung api,
2 sumber panas tetap darat, 3 lepas pantai). Skrip ini menurunkan daftar sel dari ARSIP, lalu titik NRT dicocokkan ke daftar itu.

Aturan (diukur pada arsip VIIRS S-NPP 2019 dan 2023-2025: sel vegetasi murni dengan >= 30 hari per tahun hanya 41, 13, 11, 6 per tahun dan tak ada yang lolos 2 tahun; uji OKI di bawah: 1 sel di kotak OKI, -3,19/104,60, tertandai karena menyala 12 bulan di 2015 dan 2019 dan FIRMS menandainya tipe 2):
  sel 0,01 derajat (~1,1 km; piksel 375 m bergeser antar lintasan sehingga sel 375 m terpecah) menyala
  >= HARI_MIN hari dalam setahun, tersebar di >= BULAN_MIN bulan, pada >= TAHUN_MIN tahun berbeda.
  Kebakaran gambut besar (OKI 2015/2019) menyala berminggu-minggu di musim kemarau saja (3-5 bulan) dan tidak di sel yang sama
  tiap tahun, jadi lolos; sumber industri/tambang/kilang menyala sepanjang tahun, tiap tahun.
Jenis: PLTU (<= 1 km dari scripts/udara/pltu.py), kawah (<= aturan.RADIUS_GUNUNG_API dari puncak), selain itu tipe FIRMS mayoritas
(2 sumber panas tetap, 3 lepas pantai, 1 gunung api) atau "persisten" bila arsip menandainya vegetasi tetapi pola menyala-nya statis.
Tidak dipakai: suar migas VIIRS Nightfire / Global Gas Flaring (butuh akun EOG; tanpa kunci tidak terjangkau); suar darat tertangkap
lewat tipe FIRMS 2 dan pola persisten.

Penyegaran bulanan (CI): `segar` menarik SENDIRI arsip standar (SP, kolom type) S-NPP untuk TAHUN_JENDELA tahun kalender PENUH terakhir lewat firms.py
(FIRMS_MAP_KEY; ~73 permintaan, ~1 menit per tahun) ke data/raw/firms/viirs_<tahun>.csv, lalu `bangun` dengan ambang yang sama. Tahun penuh bersifat tetap, jadi berkas
yang sudah ada TIDAK ditarik ulang (cache Actions per tahun); tahun berjalan tak dipakai (NRT tak punya kolom type, SP tertinggal). Berkas hasil tidak ditimpa bila
jumlah sel turun > 50% dari berkas lama (tanda tarikan separuh jadi) atau tarikan < MIN_BARIS baris.

Pakai:  python3 scripts/data/titik_palsu.py segar                                           (CI bulanan; butuh FIRMS_MAP_KEY)
        python3 scripts/data/titik_palsu.py bangun <viirs_2023.csv> <viirs_2024.csv> ...   (CSV dari firms.py, boleh satu per tahun)
        python3 scripts/data/titik_palsu.py dampak <csv_30hari>                            hitung titik terbuang di CSV itu
        python3 scripts/data/titik_palsu.py uji   (bila data/raw/firms/viirs_*.csv ada: uji out-of-sample, sel OKI tak boleh tertandai)
"""
import csv, collections, datetime as dt, json, math, os, subprocess, sys

sys.path.insert(0, os.path.dirname(__file__))
from wilayah import AKAR, PROVINSI, Wilayah
import aturan
import firms_sumber as FS

JALUR = os.path.join(AKAR, "public/data/titik_palsu.json")
PLTU = os.path.join(AKAR, "public/udara/data/pltu.json")
HARI_MIN, BULAN_MIN, TAHUN_MIN, R_PLTU = 30, 8, 2, 1.0
TAHUN_JENDELA, MIN_BARIS, TURUN_MAKS = 4, 100_000, 0.5   # 2022-2025 punya ratusan ribu baris S-NPP per tahun; < 100 rb = tarikan gagal
ARSIP = os.path.join(AKAR, "data/raw/firms")
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


def tahun_penuh(kini=None, n=TAHUN_JENDELA):
    """n tahun kalender penuh terakhir (tahun berjalan tidak ikut), paling jauh sampai tahun S-NPP berhenti (FS.SNPP_AKHIR, 2026): arsip standar S-NPP tahun
    sesudahnya kosong (< MIN_BARIS), jadi tanpa batas ini `segar` gagal tiap bulan mulai Jan 2028. Jendela lalu membeku di 4 tahun terakhir ber-S-NPP."""
    y = min((kini or dt.date.today()).year, FS.SNPP_AKHIR.year + 1)
    return list(range(y - n, y))


def segar(kini=None, tarik=None):
    """Pastikan arsip SP n tahun penuh terakhir ada (tarik yang belum), lalu bangun dan tulis JALUR (dengan pengaman). -> dict hasil.
    tarik(tahun, jalur_csv): pengganti firms.py untuk uji. Gagal menarik = SystemExit, berkas daftar lama tidak disentuh."""
    os.makedirs(ARSIP, exist_ok=True)
    berkas = []
    for y in tahun_penuh(kini):
        b = os.path.join(ARSIP, f"viirs_{y}.csv")
        if not os.path.exists(b):
            tmp = b + ".tmp"
            if tarik:
                tarik(y, tmp)
            else:
                if not os.environ.get("FIRMS_MAP_KEY"):
                    sys.exit("titik_palsu segar: FIRMS_MAP_KEY kosong dan arsip %d tidak ada" % y)
                with open(tmp, "w") as f:
                    r = subprocess.run([sys.executable, os.path.join(os.path.dirname(__file__), "firms.py"), f"{y}-01-01", f"{y}-12-31"], stdout=f, env={**os.environ, "SENSOR": "VIIRS_SNPP"})
                if r.returncode:
                    os.remove(tmp)
                    sys.exit("titik_palsu segar: firms.py gagal untuk %d" % y)
            n = sum(1 for _ in open(tmp)) - 1
            if n < MIN_BARIS:
                os.remove(tmp)
                sys.exit("titik_palsu segar: arsip %d hanya %d baris (< %d), dibatalkan" % (y, n, MIN_BARIS))
            os.replace(tmp, b)
        berkas.append(b)
    d = bangun(berkas)
    lama = len(json.load(open(JALUR))["sumber_statis"]) if os.path.exists(JALUR) else 0
    baru = len(d["sumber_statis"])
    if lama and baru < lama * (1 - TURUN_MAKS):
        sys.exit("titik_palsu segar: %d sel < %d%% dari %d sel lama, tidak ditimpa" % (baru, 100 * (1 - TURUN_MAKS), lama))
    return {"d": d, "lama": lama, "baru": baru, "berkas": berkas}


def palsu(lat, lon, daftar_sel):
    """daftar_sel: set sel(...) dari entri sumber_statis. True bila titik jatuh di sel sumber statis."""
    return sel(lat, lon) in daftar_sel


def muat():
    d = json.load(open(JALUR))
    return {sel(s["lat"], s["lon"]) for s in d["sumber_statis"]}, d


def sel_industri():
    """Set sel untuk disaring pipeline: semua sumber statis KECUALI kawah (titik gunung api tetap dihitung setara SiPongi dan
    sudah ditangani aturan.gunung_api untuk kompleks). Kosong bila berkas daftar belum ada. -> (set, {sel: jenis})"""
    if not os.path.exists(JALUR):
        return set(), {}
    j = {sel(x["lat"], x["lon"]): x["jenis"] for x in json.load(open(JALUR))["sumber_statis"] if x["jenis"] != "kawah"}
    return set(j), j


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
    s_, j_ = sel_industri()
    assert not any(v == "kawah" for v in j_.values()) and set(j_) == s_
    import glob
    arsip = sorted(glob.glob(os.path.join(AKAR, "data/raw/firms/viirs_*.csv")))
    if len(arsip) >= 2:
        c, ty = hitung(arsip)
        oki = lambda k: -4.0 <= k[0] / 100 <= -2.5 and 104.5 <= k[1] / 100 <= 106.5   # OKI/Sumsel pesisir: kebakaran gambut 2015, 2019
        ramai = [k for k, ys in c.items() if oki(k) and any(len(h) >= 30 for h, _ in ys.values())]
        kena = [k for k in statis(c) if oki(k)]
        # yang tertandai di kotak OKI hanya boleh sumber yang FIRMS sendiri tandai bukan vegetasi (tipe 1/2/3), bukan api gambut
        assert ramai and all(ty[k] and ty[k].most_common(1)[0][0] != "0" for k in kena), "sel OKI vegetasi tertandai statis"
        print(f"  OKI: {len(ramai)} sel >= 30 hari/tahun (arsip {len(arsip)} tahun), tertandai statis {len(kena)} (semua tipe FIRMS non-vegetasi), api gambut 0")
    else:
        print("  (arsip data/raw/firms/viirs_*.csv tak ada: uji OKI dilewati)")
    # segar: tahun penuh, tarik hanya yang belum ada, pengaman terhadap tarikan separuh jadi
    import tempfile
    global ARSIP, JALUR, MIN_BARIS
    asli = (ARSIP, JALUR, MIN_BARIS)
    try:
        with tempfile.TemporaryDirectory() as tmp:
            ARSIP, JALUR, MIN_BARIS = os.path.join(tmp, "firms"), os.path.join(tmp, "tp.json"), 3
            assert tahun_penuh(dt.date(2026, 10, 22)) == [2022, 2023, 2024, 2025] and tahun_penuh(dt.date(2027, 1, 1), 1) == [2026]
            assert tahun_penuh(dt.date(2028, 2, 1)) == [2023, 2024, 2025, 2026] == tahun_penuh(dt.date(2027, 1, 1)), "jendela membeku di tahun S-NPP terakhir (2026): 2027+ tak punya arsip S-NPP"
            dipanggil = []
            def tarik(y, tmpf):
                dipanggil.append(y)
                with open(tmpf, "w") as f:
                    f.write("latitude,longitude,acq_date,type\n")
                    for d in range(1, 41):    # sel (-3,00 / 104,00) menyala 40 hari di 10 bulan; sel (-4,00 / 105,00) tipe 2 sama
                        f.write(f"-3.001,104.001,{y}-{(d % 10) + 1:02d}-{(d // 10) + 1:02d},0\n-4.001,105.001,{y}-{(d % 10) + 1:02d}-{(d // 10) + 1:02d},2\n")
            h = segar(dt.date(2026, 10, 22), tarik)
            assert dipanggil == [2022, 2023, 2024, 2025] and h["baru"] == 2, (dipanggil, h["baru"])
            assert {x["jenis"] for x in h["d"]["sumber_statis"]} == {"persisten", "sumber panas tetap"}, h["d"]["jumlah"]
            assert segar(dt.date(2026, 10, 22), tarik) and dipanggil == [2022, 2023, 2024, 2025], "arsip yang ada tidak boleh ditarik ulang"
            json.dump({"sumber_statis": [{}] * 10}, open(JALUR, "w"))
            try:
                segar(dt.date(2026, 10, 22), tarik)
                raise AssertionError("penurunan > 50% harus ditolak")
            except SystemExit as e:
                assert "tidak ditimpa" in str(e), e
            os.remove(os.path.join(ARSIP, "viirs_2022.csv"))
            try:
                segar(dt.date(2026, 10, 22), lambda y, f: open(f, "w").write("latitude\n"))
                raise AssertionError("tarikan kosong harus dibatalkan")
            except SystemExit as e:
                assert "dibatalkan" in str(e) and not os.path.exists(os.path.join(ARSIP, "viirs_2022.csv")), e
    finally:
        ARSIP, JALUR, MIN_BARIS = asli
    print("titik_palsu.py: uji lulus")


if __name__ == "__main__":
    a = sys.argv[1:]
    if a[:1] == ["uji"]:
        uji()
    elif a[:1] == ["segar"]:
        h = segar()
        with open(JALUR, "w") as f:
            json.dump(h["d"], f, ensure_ascii=False, separators=(",", ":"))
        print(f"titik_palsu.json: {h['lama']} -> {h['baru']} sel dari arsip {[os.path.basename(b)[6:10] for b in h['berkas']]}, {h['d']['jumlah']}")
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
