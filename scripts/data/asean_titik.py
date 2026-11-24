"""Titik panas VIIRS S-NPP Indonesia vs Asia Tenggara -> public/data/asean_titik.json (PKH-28).

Angka: hanya VIIRS S-NPP, keyakinan nominal/tinggi, type 0 (api vegetasi; gunung api, sumber panas tetap, lepas pantai dibuang).
Riwayat 2012-2025: arsip negara FIRMS (publik, tanpa kunci), negara ditentukan FIRMS sendiri:
  https://firms.modaps.eosdis.nasa.gov/data/country/viirs-snpp/<tahun>/viirs-snpp_<tahun>_<Negara>.csv
7 hari: berkas NRT S-NPP Asia Tenggara (tanpa kunci, tanpa kolom type) -> disaring mask sumber panas tetap (<= 750 m;
  data/asean/sumber_statis.csv + sumber_statis titik_palsu.json), negara dari poligon (data/asean/negara.geojson, jarak <= 3 km ke pantai
  dibulatkan ke pantai itu, selebihnya dibuang). Tanpa kolom type, jadi 7 hari = batas atas dibanding riwayat.
Per 1.000 km2 daratan: Bank Dunia AG.LND.TOTL.K2 (tahun terbaru). Papua Nugini ikut tampil, tidak diperingkat. Gagal ambil = null, bukan 0.
Titik bukan luas terbakar. Arsip Indonesia disimpan di data/raw/asean/ (dipakai uji PKH-30 di iklim.py); negara lain dihapus sesudah dihitung.

Rujukan pembanding (MIT, Pantau Karhutla 2026): pipeline/src/haze/compare.py, pipeline/scripts/build_compare.py, pipeline/static/compare_*.
Poligon: Natural Earth 10m admin-0 v5.1.2 (domain publik), disederhanakan 0,002 derajat, disalin dari rujukan itu.

Pakai:  python3 scripts/data/asean_titik.py bangun   (unduh ~1 GB sekali, dicache per negara di data/raw/asean/riwayat_<iso>.json; lalu tulis JSON; ASEAN_ISO=THA,VNM = hanya isi cache negara itu, boleh paralel)
        python3 scripts/data/asean_titik.py segar    (tanpa unduh arsip: 7 hari + luas; riwayat dari cache, JSON lama, atau berkas pembanding)
        python3 scripts/data/asean_titik.py uji
"""
import csv, datetime as dt, io, json, math, os, sys, time, urllib.error, urllib.request

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from wilayah import AKAR  # noqa: E402

KELUAR = os.path.join(AKAR, "public/data/asean_titik.json")
CACHE = os.path.join(AKAR, "data/raw/asean")
POLIGON = os.path.join(AKAR, "data/asean/negara.geojson")
STATIS = os.path.join(AKAR, "data/asean/sumber_statis.csv")
PEMBANDING = os.path.join(AKAR, "data/asean/riwayat_pembanding.json")
PALSU = os.path.join(AKAR, "public/data/titik_palsu.json")
TAHUN = list(range(2012, 2026))
ARSIP = "https://firms.modaps.eosdis.nasa.gov/data/country/viirs-snpp/{y}/viirs-snpp_{y}_{n}.csv"
NRT = "https://firms.modaps.eosdis.nasa.gov/data/active_fire/suomi-npp-viirs-c2/csv/SUOMI_VIIRS_C2_SouthEast_Asia_7d.csv"
BANK = "https://api.worldbank.org/v2/country/{k}/indicator/AG.LND.TOTL.K2?format=json&date=2015:2026&per_page=500"
SEL_DERAJAT, MASK_KM, PANTAI_KM = 0.0034, 0.75, 3.0
# iso3, nama berkas FIRMS, nama Indonesia, bukan peringkat
NEGARA = [("IDN", "Indonesia", "Indonesia", 0), ("MYS", "Malaysia", "Malaysia", 0), ("THA", "Thailand", "Thailand", 0),
          ("VNM", "Vietnam", "Vietnam", 0), ("MMR", "Myanmar", "Myanmar", 0), ("LAO", "Lao_PDR", "Laos", 0),
          ("KHM", "Cambodia", "Kamboja", 0), ("PHL", "Philippines", "Filipina", 0), ("BRN", "Brunei_Darussalam", "Brunei Darussalam", 0),
          ("TLS", "Timor-Leste", "Timor Leste", 0), ("SGP", "Singapore", "Singapura", 0), ("PNG", "Papua_New_Guinea", "Papua Nugini", 1)]


def ambil(url, coba=4, ke=None):
    """Unduh ke berkas `ke` (atau bytes bila None); None bila 404."""
    for i in range(coba):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": "poskokarhutla/1.0"}), timeout=600) as r:
                if ke is None:
                    return r.read()
                with open(ke + ".part", "wb") as f:
                    while b := r.read(1 << 20):
                        f.write(b)
                os.replace(ke + ".part", ke)
                return ke
        except urllib.error.HTTPError as e:
            if e.code == 404:
                return None
            err = e
        except Exception as e:  # jaringan putus: ulang
            err = e
        if i == coba - 1:
            raise RuntimeError(f"{url}: {type(err).__name__}")
        time.sleep(5 * 2 ** i)


# ---------------------------------------------------------------- riwayat

def agregat(baris):
    """Iterator dict CSV arsip -> {titik, sel, bulanan[12]} (type 0, keyakinan n/h; sel 0,0034 derajat unik)."""
    n, sel, bln = 0, set(), [0] * 12
    for r in baris:
        if r.get("type") != "0" or r["confidence"].strip().lower() not in ("n", "h"):
            continue
        n += 1
        sel.add((math.floor(float(r["longitude"]) / SEL_DERAJAT), math.floor(float(r["latitude"]) / SEL_DERAJAT)))
        bln[int(r["acq_date"][5:7]) - 1] += 1
    return {"titik": n, "sel": len(sel), "bulanan": bln}


def riwayat(iso_saja=None):
    """{iso3: {tahun: agregat | None}}; cache per negara di CACHE/riwayat_<iso>.json supaya bisa dilanjutkan dan dijalankan paralel
    (ASEAN_ISO=THA,VNM python3 asean_titik.py bangun hanya mengisi cache negara itu)."""
    os.makedirs(CACHE, exist_ok=True)
    out = {}
    for iso, nama, _, _ in NEGARA:
        jalur = os.path.join(CACHE, f"riwayat_{iso}.json")
        h = json.load(open(jalur)) if os.path.exists(jalur) else {}
        if iso_saja is None or iso in iso_saja:
            for y in TAHUN:
                if str(y) in h:
                    continue
                f = os.path.join(CACHE, f"viirs-snpp_{y}_{nama}.csv")
                ok = f if os.path.exists(f) else ambil(ARSIP.format(y=y, n=nama), ke=f)
                a = None
                if ok:
                    with open(ok, newline="") as fh:
                        a = agregat(csv.DictReader(fh))
                    if iso != "IDN":
                        os.remove(ok)   # hanya arsip Indonesia disimpan (uji PKH-30)
                h[str(y)] = a
                json.dump(h, open(jalur, "w"), separators=(",", ":"))
                print(iso, y, a and a["titik"], file=sys.stderr, flush=True)
        out[iso] = h
    return out


# ---------------------------------------------------------------- 7 hari

def haversine_km(la1, lo1, la2, lo2):
    p = math.pi / 180
    a = math.sin((la2 - la1) * p / 2) ** 2 + math.cos(la1 * p) * math.cos(la2 * p) * math.sin((lo2 - lo1) * p / 2) ** 2
    return 12742 * math.asin(math.sqrt(a))


def sumber_statis():
    s = [(float(r["lat"]), float(r["lon"])) for r in csv.DictReader(open(STATIS))]
    if os.path.exists(PALSU):
        s += [(x["lat"], x["lon"]) for x in json.load(open(PALSU))["sumber_statis"] if x["jenis"] != "kawah"]
    g = {}
    for la, lo in s:
        g.setdefault((math.floor(la * 100 / 2), math.floor(lo * 100 / 2)), []).append((la, lo))   # sel 0,02 derajat > 750 m
    return g


def dekat_statis(g, la, lo):
    k = (math.floor(la * 50), math.floor(lo * 50))
    return any(haversine_km(la, lo, a, b) <= MASK_KM for dx in (-1, 0, 1) for dy in (-1, 0, 1) for a, b in g.get((k[0] + dx, k[1] + dy), ()))


def muat_poligon():
    """[(iso3, kotak, cincin_luar_dan_lubang)] per bagian poligon."""
    out = []
    for f in json.load(open(POLIGON))["features"]:
        g = f["geometry"]
        for bagian in (g["coordinates"] if g["type"] == "MultiPolygon" else [g["coordinates"]]):
            xs, ys = [p[0] for p in bagian[0]], [p[1] for p in bagian[0]]
            out.append((f["properties"]["iso3"], (min(xs), min(ys), max(xs), max(ys)), bagian))
    return out


def di_cincin(x, y, r):
    c, j = False, len(r) - 1
    for i in range(len(r)):
        if (r[i][1] > y) != (r[j][1] > y) and x < (r[j][0] - r[i][0]) * (y - r[i][1]) / (r[j][1] - r[i][1]) + r[i][0]:
            c = not c
        j = i
    return c


def jarak_cincin_km(x, y, r):
    """Jarak (km) titik ke ruas terdekat cincin, pendekatan bidang datar lokal."""
    k, best = math.cos(math.radians(y)), 1e9
    for i in range(len(r) - 1):
        ax, ay, bx, by = (r[i][0] - x) * k, r[i][1] - y, (r[i + 1][0] - x) * k, r[i + 1][1] - y
        dx, dy = bx - ax, by - ay
        t = 0 if dx == dy == 0 else max(0, min(1, -(ax * dx + ay * dy) / (dx * dx + dy * dy)))
        best = min(best, math.hypot(ax + t * dx, ay + t * dy) * 111.0)
    return best


def negara_titik(poligon, x, y):
    for iso, (x0, y0, x1, y1), b in poligon:
        if x0 <= x <= x1 and y0 <= y <= y1 and di_cincin(x, y, b[0]) and not any(di_cincin(x, y, h) for h in b[1:]):
            return iso
    m = PANTAI_KM / 111.0 * 1.2   # titik yang tepat di luar pantai disederhanakan: tarik ke pantai terdekat <= 3 km
    cand = [(jarak_cincin_km(x, y, b[0]), iso) for iso, (x0, y0, x1, y1), b in poligon if x0 - m <= x <= x1 + m and y0 - m <= y <= y1 + m]
    d = min(cand, default=(1e9, None))
    return d[1] if d[0] <= PANTAI_KM else None


def tujuh_hari(teks, poligon, statis):
    """CSV NRT -> ({iso3: n}, [tgl_awal, tgl_akhir]); keyakinan n/h, bukan sumber statis. Kolom `satellite` N = S-NPP."""
    n, tgl, m = {}, [], 0
    for r in csv.DictReader(io.StringIO(teks)):
        tgl.append(r["acq_date"])
        if r["confidence"].strip().lower() not in ("n", "h"):
            continue
        la, lo = float(r["latitude"]), float(r["longitude"])
        if dekat_statis(statis, la, lo):
            continue
        iso = negara_titik(poligon, lo, la)
        if iso:
            n[iso] = n.get(iso, 0) + 1
    if not tgl:
        return None, None   # berkas kosong (S-NPP berhenti ~2 Nov 2026): tak ada data, bukan nol deteksi
    return n, [min(tgl), max(tgl)]


# ---------------------------------------------------------------- luas daratan

def luas():
    """{iso3: (km2, tahun)} dari Bank Dunia; {} bila gagal."""
    try:
        d = json.loads(ambil(BANK.format(k=";".join(n[0] for n in NEGARA))))[1]
    except Exception as e:
        print("luas: gagal", e, file=sys.stderr)
        return {}
    b = {}
    for r in d:
        if r["value"] is not None and (r["countryiso3code"] not in b or int(r["date"]) > b[r["countryiso3code"]][1]):
            b[r["countryiso3code"]] = (float(r["value"]), int(r["date"]))
    return b


# ---------------------------------------------------------------- keluaran

def per1000(n, km2):
    return round(n / km2 * 1000, 3) if n is not None and km2 else None


def peringkat(nilai):
    """{kunci: nilai|None} -> {kunci: 1 = terbanyak, sama = peringkat terbaik; None tetap None}."""
    ada = {k: v for k, v in nilai.items() if v is not None}
    return {k: (1 + sum(o > ada[k] for o in ada.values()) if k in ada else None) for k in nilai}


def susun(h, tujuh, jendela, km2, sekarang):
    baris = []
    for iso, _, nama, png in NEGARA:
        a = h.get(iso, {})
        lk = km2.get(iso)
        L = lk[0] if lk else None
        tahunan = {str(y): a.get(str(y)) for y in TAHUN}
        ada = [v["titik"] for v in tahunan.values() if v]
        rata = round(sum(ada) / len(ada), 1) if ada else None
        n7 = tujuh.get(iso, 0) if tujuh is not None else None
        baris.append({"iso3": iso, "nama": nama, "peringkat": not png, "luas_km2": L, "luas_tahun": lk[1] if lk else None,
                      "tahunan": tahunan, "rata_titik": rata, "rata_per1000": per1000(rata, L),
                      "tujuh_hari": n7, "tujuh_hari_per1000": per1000(n7, L)})
    rk = [r for r in baris if r["peringkat"]]
    for kunci, ambilnya in (("peringkat_tujuh_hari", lambda r: r["tujuh_hari"]), ("peringkat_tujuh_hari_per1000", lambda r: r["tujuh_hari_per1000"]),
                            ("peringkat_rata", lambda r: r["rata_titik"]), ("peringkat_rata_per1000", lambda r: r["rata_per1000"])):
        p = peringkat({r["iso3"]: ambilnya(r) for r in rk})
        for r in baris:
            r[kunci] = p.get(r["iso3"])
    for y in map(str, TAHUN):
        p = peringkat({r["iso3"]: (r["tahunan"][y] or {}).get("titik") for r in rk})
        p2 = peringkat({r["iso3"]: per1000((r["tahunan"][y] or {}).get("titik"), r["luas_km2"]) for r in rk})
        for r in baris:
            r.setdefault("peringkat_tahun", {})[y] = p.get(r["iso3"])
            r.setdefault("peringkat_tahun_per1000", {})[y] = p2.get(r["iso3"])
    return {"dibuat": sekarang, "tahun": TAHUN, "sumber": {"riwayat": ARSIP, "tujuh_hari": NRT, "luas": "Bank Dunia AG.LND.TOTL.K2"},
            "metode": {"riwayat": "VIIRS S-NPP, arsip standar FIRMS per negara, type 0, keyakinan n/h; negara menurut FIRMS",
                       "tujuh_hari": f"VIIRS S-NPP NRT Asia Tenggara, keyakinan n/h, tanpa kolom type: sumber panas tetap (<= {MASK_KM} km) disaring, negara dari poligon Natural Earth 10m (pantai <= {PANTAI_KM:g} km dibulatkan ke pantai)",
                       "per1000": "titik per 1.000 km2 daratan",
                       "catatan": "Titik, bukan luas terbakar. Daratan Asia Tenggara terbakar Feb-Apr (sisa panen, singkat), Indonesia Agu-Okt (gambut, berasap); per km2 negara daratan biasanya lebih tinggi. Awan dan asap menutupi api; satu satelit (lintasan ~13.30 dan ~01.30 waktu setempat). Papua Nugini tampil, tidak diperingkat."},
            "tujuh_hari_jendela": jendela, "tujuh_hari_tersedia": tujuh is not None,
            "tujuh_hari_catatan": None if tujuh is not None else "Berkas NRT S-NPP Asia Tenggara kosong atau tak terambil (S-NPP berhenti merekam sekitar 2 Nov 2026); angka 7 hari null, bukan 0.", "negara": baris}


def isi_dari_pembanding(h):
    """Isi negara-tahun yang belum ada di cache h dari berkas pembanding; -> ["IDN:2012", ...] yang diisi."""
    if not os.path.exists(PEMBANDING):
        return []
    p, pakai = json.load(open(PEMBANDING))["negara"], []
    for iso, *_ in NEGARA:
        for y in TAHUN:
            if str(y) not in h.setdefault(iso, {}) and p.get(iso, {}).get(str(y)):
                h[iso][str(y)] = p[iso][str(y)]
                pakai.append(f"{iso}:{y}")
    return pakai


def baca_cache():
    """Cache riwayat per negara tanpa mengunduh; negara tanpa cache -> {}."""
    out = {}
    for iso, *_ in NEGARA:
        j = os.path.join(CACHE, f"riwayat_{iso}.json")
        out[iso] = json.load(open(j)) if os.path.exists(j) else {}
    return out


def bangun(segar=False):
    t0 = dt.datetime.now(dt.timezone.utc).strftime("%Y-%m-%dT%H:%MZ")
    isi = os.environ.get("ASEAN_ISO")
    h = baca_cache() if segar else riwayat(isi.split(",") if isi else None)
    if isi and not segar:
        return   # mode pekerja paralel: hanya mengisi cache
    if segar and not any(h.values()) and os.path.exists(KELUAR):
        lama = json.load(open(KELUAR))   # tanpa cache (CI): pakai riwayat dari JSON lama
        h = {r["iso3"]: {y: v for y, v in r["tahunan"].items() if v} for r in lama["negara"]}
    try:
        tujuh, jendela = tujuh_hari(ambil(NRT).decode(), muat_poligon(), sumber_statis())
    except Exception as e:   # NRT mati: riwayat tetap terbit, 7 hari null
        print("7 hari: gagal", e, file=sys.stderr)
        tujuh, jendela = None, None
    pakai = isi_dari_pembanding(h)
    out = susun(h, tujuh, jendela, luas(), t0)
    out["riwayat_dari_pembanding"] = pakai   # negara-tahun yang BELUM terunduh sendiri (server FIRMS lambat); kosong = semua dari arsip
    if pakai:
        out["metode"]["riwayat_pembanding"] = "negara-tahun di riwayat_dari_pembanding diisi dari data/asean/riwayat_pembanding.json (Pantau Karhutla 2026, MIT; arsip FIRMS yang sama, cocok 100% pada negara-tahun yang diunduh sendiri); jalankan bangun lagi sampai daftar itu kosong"
    json.dump(out, open(KELUAR, "w"), ensure_ascii=False, separators=(",", ":"))
    print(KELUAR, f"{os.path.getsize(KELUAR) / 1e3:.0f} KB", "7 hari", jendela)


def uji():
    r = list(csv.DictReader(io.StringIO("latitude,longitude,acq_date,confidence,type\n"
                                        "-3.0010,112.0010,2015-09-01,n,0\n-3.0011,112.0011,2015-09-02,h,0\n"
                                        "-3.1,112.1,2015-09-03,l,0\n-3.2,112.2,2015-09-03,n,2\n-3.3,112.3,2015-10-03,n,0\n")))
    assert agregat(r) == {"titik": 3, "sel": 2, "bulanan": [0, 0, 0, 0, 0, 0, 0, 0, 2, 1, 0, 0]}, agregat(r)
    assert peringkat({"a": 5, "b": 5, "c": 1, "d": None}) == {"a": 1, "b": 1, "c": 3, "d": None}
    assert per1000(10, 2000) == 5.0 and per1000(None, 5) is None and per1000(3, None) is None
    kotak = [("AAA", (0, 0, 10, 10), [[[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]], [[4, 4], [6, 4], [6, 6], [4, 6], [4, 4]]])]
    assert negara_titik(kotak, 2, 2) == "AAA" and negara_titik(kotak, 5, 5) is None and negara_titik(kotak, 10.01, 5) == "AAA" and negara_titik(kotak, 11, 5) is None
    g = {(math.floor(1.0 * 50), math.floor(100.0 * 50)): [(1.0, 100.0)]}
    assert dekat_statis(g, 1.003, 100.0) and not dekat_statis(g, 1.01, 100.0)
    n, tg = tujuh_hari("latitude,longitude,acq_date,confidence\n1.0,100.0,2026-11-20,n\n5,5,2026-11-21,l\n", kotak, g)
    assert n == {} and tg == ["2026-11-20", "2026-11-21"]
    assert tujuh_hari("latitude,longitude,acq_date,confidence\n", kotak, g) == (None, None)
    hh = {"IDN": {"2012": {"titik": 1}}}
    assert isi_dari_pembanding(hh) and "2012" in hh["IDN"] and hh["IDN"]["2012"] == {"titik": 1}   # cache menang atas pembanding
    assert muat_poligon() and len(muat_poligon()) > 100
    p = muat_poligon()
    assert negara_titik(p, 112.0, -2.0) == "IDN" and negara_titik(p, 101.0, 15.0) == "THA" and negara_titik(p, 0.0, 0.0) is None
    print("asean_titik uji: OK")


if __name__ == "__main__":
    {"bangun": lambda: bangun(), "segar": lambda: bangun(True)}.get(sys.argv[1] if len(sys.argv) > 1 else "", uji)()
