"""Tabel FAKTOR bahaya banjir per kecamatan (7.270; kunci "prov|kab|kec" = bahaya_kelas.json).

  python3 faktor_kec.py ambil [--sumber topo|meteo] [--maks N]   elevasi kisi titik, bisa dilanjut
                                           topo (default): Open Topo Data SRTM 90 m, <= 900 panggilan/hari
                                           meteo: Open-Meteo Copernicus 90 m, <= 2.500 TITIK/hari (kuota per lokasi)
  python3 faktor_kec.py susun              -> public/banjir/data/faktor_kec.json
  python3 faktor_kec.py uji                swauji luring

Metode dan keterbatasan: RISET-FAKTOR-KEC.md. Python stdlib saja."""
import bisect, datetime as dt, json, math, os, sys, time, urllib.parse

sys.path.insert(0, os.path.dirname(__file__))
from umum import KELUAR, MENTAH, KuotaHabis, ambil, baca, simpan
from wilayah import _di_dalam

CACHE = os.path.join(MENTAH, "faktor_kec")
URL = "https://api.open-meteo.com/v1/elevation"
URL_TOPO = "https://api.opentopodata.org/v1/srtm90m"
PER_PANGGILAN, MAKS_TITIK, MIN_TITIK, JEDA = 100, 25, 4, 1.1
# Open-Meteo menghitung KUOTA PER LOKASI (diukur 31 Okt 2026: 100 titik/panggilan = 100 unit, ~7 panggilan/menit),
# jadi batasnya 2.500 TITIK/hari. Open Topo Data (SRTM 90 m): 1.000 panggilan/hari, 1/dtk, 100 titik.
MAKS_HARI = {"meteo": 2500, "topo": 900}
MARGIN_RENDAH_M = 5
TAHUN = ("2008", "2025")
TAHUN_LATIH = ("2008", "2021")  # untuk model: di luar jendela uji 2022-2025


# ---------- kisi titik ----------
def kisi(rings, km2):
    """Titik di dalam poligon (paritas semua cincin: lubang dan bagian jamak benar). Jumlah ~ luas/4 km2, 4..25."""
    n = min(MAKS_TITIK, max(MIN_TITIK, int(km2 / 4)))
    xs = [p[0] for r in rings for p in r]; ys = [p[1] for r in rings for p in r]
    x0, x1, y0, y1 = min(xs), max(xs), min(ys), max(ys)
    m = max(2, math.ceil(math.sqrt(n * 2.5)))
    dalam = []
    for i in range(m):
        for j in range(m):
            x = x0 + (i + .5) * (x1 - x0) / m; y = y0 + (j + .5) * (y1 - y0) / m
            if sum(_di_dalam(x, y, r) for r in rings) % 2:
                dalam.append((round(y, 4), round(x, 4)))
    if len(dalam) > n:
        langkah = len(dalam) / n
        dalam = [dalam[int(k * langkah)] for k in range(n)]
    if not dalam:  # kecamatan sangat sempit/ramping: rata-rata simpul cincin terbesar
        r = max(rings, key=len)
        dalam = [(round(sum(p[1] for p in r) / len(r), 4), round(sum(p[0] for p in r) / len(r), 4))]
    return dalam


def kunci_titik(t):
    return f"{t[0]},{t[1]}"


# ---------- statistik ----------
def kuantil(v, q):
    s = sorted(v)
    if not s:
        return None
    k = (len(s) - 1) * q
    a = int(k)
    return s[a] + (s[min(a + 1, len(s) - 1)] - s[a]) * (k - a)


def persentil(nilai, lebih=False):
    """% kecamatan non-null yang nilainya LEBIH KECIL secara ketat (lebih=True: LEBIH BESAR secara ketat), 0-100.
    Nilai seri tidak dihitung, jadi nilai terkecil bersama = 0."""
    s = sorted(v for v in nilai if v is not None)
    out = []
    for v in nilai:
        if v is None or len(s) < 2:
            out.append(None)
            continue
        n = len(s) - bisect.bisect_right(s, v) if lebih else bisect.bisect_left(s, v)
        out.append(round(100 * n / len(s)))
    return out


def haversine(la1, lo1, la2, lo2):
    p = math.pi / 180
    a = math.sin((la2 - la1) * p / 2) ** 2 + math.cos(la1 * p) * math.cos(la2 * p) * math.sin((lo2 - lo1) * p / 2) ** 2
    return 12742 * math.asin(math.sqrt(a))


def r(x, n=1):
    return None if x is None else round(x, n)


# ---------- ambil ----------
def titik_semua(kec):
    return {k: kisi(v["rings"], v["km2"]) for k, v in kec.items()}


def ambil_elevasi(maks=None, sumber="topo"):
    maks = maks or MAKS_HARI[sumber]
    from bahaya import poligon_kec
    kec = poligon_kec()
    jalur, jalur_s = os.path.join(CACHE, f"elevasi_{sumber}.json"), os.path.join(CACHE, f"status_{sumber}.json")
    elev = baca(jalur, {})
    st = baca(jalur_s, {})
    hari = dt.date.today().isoformat()
    terpakai = st.get(hari, 0)
    sisa = max(0, maks - terpakai)
    if sumber == "meteo":
        sisa //= PER_PANGGILAN  # maks dihitung dalam titik
    belum, lihat = [], set()
    for k, ts in titik_semua(kec).items():  # urut kecamatan: yang diproses selesai utuh
        for t in ts:
            kt = kunci_titik(t)
            if kt not in elev and kt not in lihat:
                lihat.add(kt); belum.append(t)
    print(f"[{sumber}] {len(elev)} titik di cache, {len(belum)} belum; jatah hari ini {sisa} panggilan (terpakai {terpakai} unit)", file=sys.stderr)
    unit = PER_PANGGILAN if sumber == "meteo" else 1
    n = 0
    try:
        for i in range(0, len(belum), PER_PANGGILAN):
            if n >= sisa:
                break
            b = belum[i:i + PER_PANGGILAN]
            if sumber == "meteo":
                q = {"latitude": ",".join(str(t[0]) for t in b), "longitude": ",".join(str(t[1]) for t in b)}
                es = ambil(URL + "?" + urllib.parse.urlencode(q, safe=","))["elevation"]
            else:
                q = {"locations": "|".join(f"{t[0]},{t[1]}" for t in b)}
                es = [x["elevation"] for x in ambil(URL_TOPO + "?" + urllib.parse.urlencode(q, safe=",|"))["results"]]
            n += 1
            for t, e in zip(b, es):
                elev[kunci_titik(t)] = e
            if n % 20 == 0:
                simpan(jalur, elev); st[hari] = terpakai + n * unit; simpan(jalur_s, st)
                print(f"  {n} panggilan, {len(elev)} titik", file=sys.stderr)
            time.sleep(JEDA)
    except KuotaHabis as e:
        print(f"  kuota Open-Meteo habis: {e}", file=sys.stderr)
    finally:
        simpan(jalur, elev); st[hari] = terpakai + n * unit; simpan(jalur_s, st)
    sisa_titik = len([t for t in belum if kunci_titik(t) not in elev])
    print(f"selesai {n} panggilan; titik belum terambil {sisa_titik} (~{math.ceil(sisa_titik / PER_PANGGILAN)} panggilan). "
          f"Lanjut: python3 scripts/banjir/faktor_kec.py ambil --sumber {sumber}", file=sys.stderr)


# ---------- susun ----------
KOLOM = ["kunci", "elev_p10", "elev_p50", "elev_p90", "relief", "rendah", "padat", "zona_tinggi", "zona_sedang",
         "pesisir", "jarak_sungai", "kej_100rb", "kej_100rb_latih"]
PERSEN = ["elev_p50", "relief", "rendah", "padat", "zona_tinggi", "zona_sedang", "jarak_sungai", "kej_100rb", "kej_100rb_latih"]
PCTR = ["elev_p50", "relief", "jarak_sungai"]  # kartu membalik skala ini: persentase kecamatan yang LEBIH BESAR


def faktor_elevasi(titik_kec, elev, p10_kab):
    """titik_kec -> (p10, p50, p90, relief, porsi_rendah%); semuanya None bila belum ada titik terambil."""
    e = [elev[kunci_titik(t)] for t in titik_kec if elev.get(kunci_titik(t)) is not None]
    if len(e) < min(len(titik_kec), 3):  # belum lengkap: jangan menebak dari 1-2 titik
        return (None,) * 5
    p10, p50, p90 = kuantil(e, .1), kuantil(e, .5), kuantil(e, .9)
    rendah = 100 * sum(1 for v in e if v < p10_kab + MARGIN_RENDAH_M) / len(e)
    return p10, p50, p90, p90 - p10, rendah


def susun_baris(kec, titik, elev, bk, pend, sungai, rob_kec, kej, pusat):
    """kec: {kunci:{km2}}, titik: {kunci:[(lat,lon)]} -> (baris[list], p10 kab)."""
    per_kab = {}
    for k, ts in titik.items():
        kab = k.rsplit("|", 1)[0]
        per_kab.setdefault(kab, []).extend(elev[kunci_titik(t)] for t in ts if elev.get(kunci_titik(t)) is not None)
    p10_kab = {kab: kuantil(v, .1) for kab, v in per_kab.items() if v}
    pop_kab = {}
    for k, p in pend.items():
        if p:
            kab = k.rsplit("|", 1)[0]; pop_kab[kab] = pop_kab.get(kab, 0) + p
    baris = []
    for k in kec:
        kab = k.rsplit("|", 1)[0]
        e = faktor_elevasi(titik[k], elev, p10_kab[kab]) if kab in p10_kab else (None,) * 5
        km2, p = kec[k]["km2"], pend.get(k)
        banjir = bk.get(k, {}).get("banjir", [0, 0, 0])
        js = None
        if k in pusat and sungai:
            la, lo = pusat[k]
            d, t = min((haversine(la, lo, s["lat"], s["lon"]), i) for i, s in enumerate(sungai))
            js = d
        kj = kl = None
        if kab in kej and pop_kab.get(kab):
            kj, kl = (x * 1e5 / pop_kab[kab] for x in kej[kab])
        baris.append([k, r(e[0]), r(e[1]), r(e[2]), r(e[3]), r(e[4]),
                      r(p / km2, 0) if p is not None and km2 > 0 else None, banjir[2], banjir[1],
                      1 if k.split("|", 1)[1] in rob_kec else 0,
                      r(js), r(kj, 1), r(kl, 1)])
    return baris


def tambah_persen(baris):
    idx = {n: KOLOM.index(n) for n in PERSEN}
    kol = {n: persentil([b[i] for b in baris]) for n, i in idx.items()}
    kolr = {n: persentil([b[idx[n]] for b in baris], True) for n in PCTR}
    for j, b in enumerate(baris):
        b.extend(kol[n][j] for n in PERSEN)
        b.extend(kolr[n][j] for n in PCTR)
    return baris


def susun(sumber="topo"):
    from bahaya import poligon_kec
    kec = poligon_kec()
    D = lambda f: json.load(open(os.path.join(KELUAR, f)))
    bk = D("bahaya_kelas.json")["kec"]
    ris = D("risiko_kecamatan.json")
    pend = {f"{x[0]}|{x[1]}|{x[2]}": x[ris["kolom"].index("pend")] for x in ris["kec"]}
    sungai = D("sungai.json")["titik"]
    rob_kec = {f"{t['kab']}|{t['kec']}" for t in D("rob.json")["titik"]}
    kejab = D("kejadian.json")["kab"]
    hit = lambda v, t: sum(v.get(j, {}).get(str(y), 0) for j in ("banjir", "bandang") for y in range(int(t[0]), int(t[1]) + 1))
    kej = {kab: (hit(v, TAHUN), hit(v, TAHUN_LATIH)) for kab, v in kejab.items()}
    pusat = {k: v for k, v in D("pusat_kec.json").items()}
    elev = baca(os.path.join(CACHE, f"elevasi_{sumber}.json"), {})
    titik = titik_semua(kec)
    baris = tambah_persen(susun_baris(kec, titik, elev, bk, pend, sungai, rob_kec, kej, pusat))
    keluar = {
        "dibuat": dt.date.today().isoformat(), "tahun_kejadian": list(TAHUN), "tahun_kejadian_latih": list(TAHUN_LATIH),
        "kolom": KOLOM + ["pct_" + n for n in PERSEN] + ["pctr_" + n for n in PCTR],
        "sumber": {
            "elevasi": ("Open Topo Data, SRTM 90 m" if sumber == "topo" else "Open-Meteo Elevation API, Copernicus GLO-90 90 m") + "; kisi <= 25 titik per kecamatan di dalam poligon",
            "rendah": "porsi titik kisi dengan elevasi < p10 kabupaten + 5 m (p10 dari semua titik kisi kabupaten)",
            "padat": "risiko_kecamatan.json kolom pend (WorldPop) / km2 bahaya_kelas.json",
            "zona": "InaRISK BNPB bahaya banjir, persen luas kelas tinggi dan sedang (bahaya_kelas.json)",
            "pesisir": "1 bila kecamatan punya titik di rob.json, selain itu 0",
            "sungai": "jarak titik berat kecamatan ke titik GloFAS terdekat di sungai.json",
            "kejadian": "banjir+bandang DIBI di kabupaten (kejadian.json kab) per 100.000 penduduk (jumlah pend kecamatan); kej_100rb 2008-2025 untuk tampilan, kej_100rb_latih 2008-2021 untuk model (di luar jendela uji 2022-2025)",
        },
        "satuan": {"elev_*": "m dpl", "relief": "m (p90-p10)", "rendah": "% titik", "padat": "jiwa/km2",
                   "zona_*": "% luas kecamatan", "pesisir": "0/1", "jarak_sungai": "km",
                   "kej_100rb": "kejadian per 100 ribu jiwa, 2008-2025", "kej_100rb_latih": "kejadian per 100 ribu jiwa, 2008-2021",
                   "pct_*": "% kecamatan non-null yang nilainya LEBIH KECIL secara ketat (0-100; seri tidak dihitung)",
                   "pctr_*": "hanya elev_p50, relief, jarak_sungai: % kecamatan non-null yang nilainya LEBIH BESAR secara ketat; untuk kalimat 'lebih rendah/dekat dari X% kecamatan'"},
        "asumsi": [
            "ASUMSI: 'rendah' (elevasi dekat p10 kabupaten + 5 m) hanyalah proksi dataran banjir lokal; HAND tidak tersedia tanpa GDAL.",
            "Elevasi 90 m dari kisi paling banyak 25 titik: relief kecamatan luas/berbukit bisa terlewat; kecamatan sempit diwakili >= 4 titik.",
            "pesisir=0 berarti tidak ada titik rob di berkas, bukan terbukti tidak berpantai (garis pantai tidak ada di repo).",
            "Jarak sungai = jarak lurus ke titik GloFAS (192 titik), bukan jarak ke alur sungai.",
            "Zona InaRISK: kecamatan tanpa kunci banjir di bahaya_kelas.json memang tanpa zona (pengambilan ulang 31 Okt 2026 mencatat 0 gagal), jadi 0 adalah nilai benar, bukan data hilang.",
            "padat = 0 bila penduduk 0 (luas ada); null hanya bila penduduk tidak ada.",
            "Kejadian DIBI di tingkat kabupaten, sama untuk semua kecamatan di dalamnya.",
        ],
        "tidak_tersedia": {"hujan_ekstrem": "ERA5 harian di repo hanya 104 sel uji balik dan riwayat_grid.json adalah kejadian DIBI, bukan hujan; cakupan nasional tidak ada, arsip tidak dipanggil",
                           "jarak_pantai": "tidak ada data garis pantai di repo"},
        "persentil_dari": "semua kecamatan bernilai non-null",
        "baris": baris,
    }
    simpan(os.path.join(KELUAR, "faktor_kec.json"), keluar)
    ukuran = os.path.getsize(os.path.join(KELUAR, "faktor_kec.json")) / 1024
    per_prov, total = {}, {}
    for b in baris:
        p = b[0].split("|")[0]
        total[p] = total.get(p, 0) + 1
        per_prov[p] = per_prov.get(p, 0) + (b[2] is not None)
    for p in sorted(total):
        print(f"  prov {p}: elevasi terisi {per_prov[p]}/{total[p]}")
    n = sum(per_prov.values())
    print(f"faktor_kec.json: {len(baris)} kecamatan, elevasi terisi {n} ({100 * n / len(baris):.1f}%), {ukuran:.0f} KB")


# ---------- uji ----------
def uji():
    persegi = [[0, 0], [1, 0], [1, 1], [0, 1]]
    ts = kisi([persegi], 100)
    assert 4 <= len(ts) <= MAKS_TITIK and all(0 < la < 1 and 0 < lo < 1 for la, lo in ts), ts
    lubang = [[.25, .25], [.75, .25], [.75, .75], [.25, .75]]
    assert all(not (.25 < la < .75 and .25 < lo < .75) for la, lo in kisi([persegi, lubang], 100))
    assert len(kisi([[[0, 0], [1e-5, 0], [0, 1e-5]]], 0.01)) >= 1  # sempit: tetap ada titik
    assert kuantil([1, 2, 3, 4, 5], .5) == 3 and kuantil([], .5) is None
    p = persentil([1, 2, 3, 4, None]); assert p[:4] == [0, 25, 50, 75] and p[4] is None, p
    assert persentil([0, 0, 0, 5]) == [0, 0, 0, 75]  # seri nol: tidak ada yang lebih kecil
    assert persentil([1, 2, 3, 4], True) == [75, 50, 25, 0] and persentil([5, 5], True) == [0, 0]
    assert abs(haversine(0, 0, 0, 1) - 111.19) < .1
    # elevasi: 3 titik rendah, p10 kabupaten 0 -> rendah = titik < 5
    t = [(0, 0), (0, 1), (0, 2), (0, 3)]
    e = {kunci_titik(x): v for x, v in zip(t, [1, 2, 50, 100])}
    f = faktor_elevasi(t, e, 0.0)
    assert f[4] == 50 and f[3] > 0, f
    assert faktor_elevasi(t, {}, 0.0) == (None,) * 5  # belum diambil -> None, bukan 0
    # susun_baris mainan
    kec = {"11|A|X": {"km2": 10.0}, "11|A|Y": {"km2": 20.0}}
    tk = {"11|A|X": t[:2] + t[2:3], "11|A|Y": t[3:] + t[:2]}
    ba = susun_baris(kec, tk, e, {"11|A|X": {"banjir": [1, 5, 9]}}, {"11|A|X": 1000, "11|A|Y": 4000},
                     [{"lat": 0, "lon": 0}], {"A|Y"}, {"11|A": (10, 4)}, {"11|A|X": (0.0, 1.0)})
    x, y = ba[0], ba[1]
    assert x[KOLOM.index("padat")] == 100 and x[KOLOM.index("zona_tinggi")] == 9 and x[KOLOM.index("pesisir")] == 0
    assert y[KOLOM.index("pesisir")] == 1 and y[KOLOM.index("jarak_sungai")] is None  # tanpa pusat -> None
    assert x[KOLOM.index("kej_100rb")] == 200.0 and x[KOLOM.index("kej_100rb_latih")] == 80.0  # 10 / 5000 * 1e5
    nol = susun_baris({"11|A|Z": {"km2": 5.0}}, {"11|A|Z": t}, e, {}, {"11|A|Z": 0}, [], set(), {}, {})
    assert nol[0][KOLOM.index("padat")] == 0 and nol[0][KOLOM.index("zona_tinggi")] == 0
    tambah_persen(ba)
    assert len(ba[0]) == len(KOLOM) + len(PERSEN) + len(PCTR)
    print("faktor_kec uji: lulus")


if __name__ == "__main__":
    a = sys.argv[1:] or ["uji"]
    if a[0] == "uji": uji()
    elif a[0] == "ambil": ambil_elevasi(int(a[a.index("--maks") + 1]) if "--maks" in a else None, a[a.index("--sumber") + 1] if "--sumber" in a else "topo")
    elif a[0] == "susun": susun(a[a.index("--sumber") + 1] if "--sumber" in a else "topo")
    else: sys.exit(__doc__)
