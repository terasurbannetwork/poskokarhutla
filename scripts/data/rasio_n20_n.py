"""Ukur rasio deteksi NOAA-20 / S-NPP (N20/N) pada SATUAN YANG SAMA dengan pemakaiannya, untuk menggantikan S-NPP sesudah firms_sumber.SNPP_AKHIR.

Satuan pemakaian:
  harian (laporan.py)           deteksi per HARI LAPORAN (D-1 16.00, D 16.00] WIB, nasional, keyakinan n/h, tanpa sel sumber panas tetap, di dalam provinsi
                                (= baris hotspot.json). RASIO_N20_N = jumlah N20 / jumlah N atas hari lengkap tanpa celah (tak bias untuk luas yang dijumlahkan);
                                median harian + IQR = galat per hari; selang 95% = bootstrap antar-hari (5.000 undian, benih 1).
  lokal (insiden, watak_kluster) jendela 3x3 sel 0,05 derajat (~16 km, sama dengan watak_kluster.n7), dijumlahkan per blok hari berurutan;
                                RASIO_N20_N_LOKAL = median rasio jendela ber-N >= LOKAL_N_MIN, IQR = sebarannya. Median (bukan jumlah) karena yang diwakili
                                satu insiden / satu kluster, bukan total nasional yang didominasi segelintir jendela besar.
Hari dibuang: jendelanya tidak seluruhnya ada di sumber (awal/akhir sumber), atau hari WIB D / D-1 tercantum di `celah` public/data/peta_karhutla.json
(celah sensor: S-NPP nol 13 Okt, 20 Okt dst.).

Sumber (tiga jenis, boleh dicampur; baris yang sama dari dua sumber dihitung sekali):
  --hotspot <hotspot.json>...   snapshot hotspot.json (git show <sha>:public/data/hotspot.json); cakupan = acuan - 7 hari + 6 jam .. acuan - 3 jam (lihat MARGIN_*)
  --tar <firms-raw.tar.gz>      CSV FIRMS mentah per sensor per hari UTC (data/laporan-bnpb/satelit-*/firms-raw-*.tar.gz); hari UTC terakhir dianggap parsial
  --csv <berkas.csv>...         arsip FIRMS (firms.py; kolom satellite N/N20); cakupan = acq_date terkecil .. terbesar
  --publik <J1_*.csv SUOMI_*.csv>  CSV 7 hari publik FIRMS (data/laporan-bnpb/satelit-2026-10-25/firms-7hari-publik-25okt-0721.tar.gz); hari pertama/terakhir parsial dibuang
PEMILIHAN KONSTANTA (pilih(), perintah `pilih`): `ukur` hanya memberi komponen Oktober (12 hari laporan, ~110 rb N). Jangka lebih panjang dari bulanan 2026 yang lengkap:
Agu dan Sep (S-NPP: sejarah.json; N20: data/laporan-bnpb/metode-2026-10-25/kalibrasi_noaa.json bulan_2026_n20; satuan bulan WIB dan saringan sel industri/type sedikit beda, selisih
<= 3% pada 130-200 rb titik per bulan). Jul tak dipakai (S-NPP nol 11-16 Jul), Mar-Jun tak dipakai (S-NPP diisi N20 x 0,978: melingkar), F20/4,3 tak dipakai (himpunan tahun
beda). Agu memuat 3-4 Agu (S-NPP nol): N20 hari itu (perkiraan = N20 bulan x bagian lokasi unik 3-4 Agu di titik_hari/indeks.json) dibuang dari pembilang. Konstanta harian = rasio-dari-jumlah
semua komponen; lokal = median jendela Oktober x (harian / rasio Oktober) (bentuk sebaran lokal diasumsikan sama, tingkatnya digeser ke jangka panjang). Masukan tercatat di
firms_sumber.RASIO_DASAR; uji memastikan konstanta = hasil pilih(RASIO_DASAR).
Pakai:  python3 -I scripts/data/rasio_n20_n.py ukur --hotspot a.json b.json --tar firms-raw.tar.gz --publik J1_*.csv SUOMI_*.csv [--json]
        python3 -I scripts/data/rasio_n20_n.py pilih          # konstanta dari firms_sumber.RASIO_DASAR + verifikasi komponen bulanan terhadap berkas bila ada
        python3 -I scripts/data/rasio_n20_n.py uji
Hasil 28 Okt 2026 (snapshot hotspot.json di riwayat commit 606fff79, b5b131f6, 70200d78, 2ae0f44e + tarball satelit-2026-10-22 + CSV publik satelit-2026-10-25): 12 hari laporan
(7-12, 16-19, 22-23 Okt); nilainya ada di firms_sumber.RASIO_DASAR / RASIO_N20_N / _LOKAL beserta selangnya. Arsip mentah 2026 penuh (data/raw/firms/viirs*.csv) tidak ada di mesin ini: jalankan ulang dengan --csv
bila ada, lalu perbarui konstanta di firms_sumber.py.
"""
import csv, datetime as dt, io, json, os, random, statistics, sys, tarfile

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

WIB = dt.timezone(dt.timedelta(hours=7))
UTC = dt.timezone.utc
TUTUP_JAM = 16          # sama dengan laporan.TUTUP_JAM
SEL, X0, Y1 = 0.05, 94.5, 6.5   # sama dengan watak_kluster
LOKAL_N_MIN = 50
BOOT = 5000
# hotspot.json hanya mencatat `acuan` (deteksi terakhir), bukan jam jalan: jendela 7 hari dipotong dari jam jalan (acuan + ~3-5 jam latensi NRT), jadi ujung awal digeser +6 jam
# dan ujung akhir -3 jam (deteksi lintasan siang baru tiba ~3 jam sesudah akuisisi) supaya hari laporan di tepi tidak dihitung lengkap secara keliru
MARGIN_AWAL, MARGIN_AKHIR = dt.timedelta(hours=6), dt.timedelta(hours=3)
KONF = {"nominal": "n", "high": "h", "low": "l"}   # CSV publik FIRMS menulis kata penuh; API area menulis n/h/l
PUBLIK_SENSOR = {"J1_": "N20", "SUOMI_": "N"}       # nama berkas publik -> sensor; J2 (NOAA-21) dan MODIS tak dipakai


def hari_lap(t):
    """Waktu akuisisi -> hari laporan (sama dengan laporan.hari_lap)."""
    w = (t.astimezone(WIB) + dt.timedelta(seconds=30)).replace(second=0, microsecond=0)
    return (w + dt.timedelta(hours=24 - TUTUP_JAM, minutes=-1)).date()


def jendela(d):
    """(awal, akhir] UTC hari laporan d."""
    akhir = dt.datetime.combine(d, dt.time(TUTUP_JAM), WIB).astimezone(UTC)
    return akhir - dt.timedelta(days=1), akhir


class Deteksi:
    """Himpunan deteksi N / N20 n/h bersaringan produksi: kunci (lat, lon, menit UTC, sensor); cakupan = daftar (awal, akhir) UTC sumber."""

    def __init__(self):
        self.titik, self.cakupan = {}, []

    def tambah(self, lat, lon, t, s):
        self.titik[(round(lat, 4), round(lon, 4), t, s)] = 1

    def liputan(self, awal, akhir):
        self.cakupan.append((awal, akhir))

    def lengkap(self, d):
        a, b = jendela(d)
        return any(c0 <= a and b <= c1 for c0, c1 in self.cakupan)   # jendela hari laporan seluruhnya dalam SATU sumber


def dari_hotspot(h, den):
    K = {k: i for i, k in enumerate(h["kolom"])}
    ac = dt.datetime.fromisoformat(h["acuan"])
    for b in h["baris"]:
        s = b[K["sensor"]]
        if s in ("N", "N20") and b[K["keyakinan"]] >= 1:
            t = (ac + dt.timedelta(hours=b[K["jam"]]) + dt.timedelta(seconds=30)).replace(second=0, microsecond=0)
            den.tambah(b[K["lat"]], b[K["lon"]], t, s)
    den.liputan(ac - dt.timedelta(days=7) + MARGIN_AWAL, ac - MARGIN_AKHIR)


def dari_csv_teks(teks, den, sensor=None):
    """Satu CSV FIRMS mentah; menerapkan saringan produksi (n/h, sel industri, provinsi). -> (tgl_min, tgl_maks)"""
    import titik_palsu
    from wilayah import Wilayah
    global _IND, _W
    if "_IND" not in globals():
        _IND, _ = titik_palsu.sel_industri()
        _W = Wilayah()
    lo = hi = None
    for r in csv.DictReader(io.StringIO(teks)):
        s = sensor or r.get("satellite")
        d = r["acq_date"]
        lo, hi = min(lo or d, d), max(hi or d, d)
        if s not in ("N", "N20") or KONF.get(r["confidence"].lower(), r["confidence"].lower()) not in ("n", "h"):
            continue
        lat, lon = float(r["latitude"]), float(r["longitude"])
        if titik_palsu.palsu(lat, lon, _IND) or not _W.cari(lon, lat):
            continue
        j = r["acq_time"].zfill(4)
        den.tambah(lat, lon, dt.datetime.fromisoformat(f"{d}T{j[:2]}:{j[2:]}:00+00:00"), s)
    return lo, hi


def dari_tar(jalur, den):
    lo = hi = None
    with tarfile.open(jalur) as tf:
        for m in tf.getmembers():
            n = os.path.basename(m.name)
            if n.startswith("._") or not n.endswith(".csv") or not (n.startswith("VIIRS_SNPP") or n.startswith("VIIRS_NOAA20")):
                continue
            a, b = dari_csv_teks(tf.extractfile(m).read().decode(), den)
            lo, hi = min(lo or a, a), max(hi or b, b)
    # hari UTC terakhir diunduh di tengah hari (TARIK.txt): parsial, jadi cakupan berakhir di awal hari itu
    den.liputan(dt.datetime.fromisoformat(lo + "T00:00:00+00:00"), dt.datetime.fromisoformat(hi + "T00:00:00+00:00"))


def dari_csv(jalur, den, sensor=None):
    a, b = dari_csv_teks(open(jalur).read(), den, sensor)
    den.liputan(dt.datetime.fromisoformat(a + "T00:00:00+00:00"), dt.datetime.fromisoformat(b + "T00:00:00+00:00") + dt.timedelta(days=1))


def dari_publik(jalur, den):
    """CSV 7 hari publik FIRMS (J1_VIIRS_C2_*.csv = NOAA-20, SUOMI_VIIRS_C2_*.csv = S-NPP; kolom confidence nominal/high/low dipetakan ke n/h/l; Asia Tenggara, jadi
    dipotong ke provinsi oleh saringan produksi). Hari tanggal pertama dan terakhir berkas parsial (tarikan di tengah hari): cakupan = tanggal pertama + 1 s.d. tanggal terakhir 00.00 UTC."""
    sensor = next((v for k, v in PUBLIK_SENSOR.items() if os.path.basename(jalur).startswith(k)), None)
    if sensor is None:
        raise SystemExit(f"{jalur}: bukan berkas publik J1_/SUOMI_")
    a, b = dari_csv_teks(open(jalur).read(), den, sensor)
    den.liputan(dt.datetime.fromisoformat(a + "T00:00:00+00:00") + dt.timedelta(days=1), dt.datetime.fromisoformat(b + "T00:00:00+00:00"))


def kuartil(v):
    q = statistics.quantiles(v, n=4, method="inclusive")
    return q[0], q[2]


def ukur(den, celah=(), lokal_n_min=LOKAL_N_MIN, boot=BOOT):
    """-> dict hasil. Hari dipakai = jendela lengkap dan WIB D, D-1 bukan celah sensor."""
    per = {}
    for (lat, lon, t, s) in den.titik:
        per.setdefault(hari_lap(t), {"N": 0, "N20": 0})[s] += 1
    semua = sorted(per)
    pakai, buang = [], {}
    for d in semua:
        if not den.lengkap(d):
            buang[d.isoformat()] = "jendela tak lengkap"
        elif d.isoformat() in celah or (d - dt.timedelta(days=1)).isoformat() in celah:
            buang[d.isoformat()] = "celah sensor"
        elif per[d]["N"] and per[d]["N20"]:
            pakai.append(d)
    if len(pakai) < 3:
        raise SystemExit(f"hanya {len(pakai)} hari laporan lengkap tanpa celah: tidak cukup untuk mengukur")
    harian = {d.isoformat(): per[d]["N20"] / per[d]["N"] for d in pakai}
    r = list(harian.values())
    pooled = sum(per[d]["N20"] for d in pakai) / sum(per[d]["N"] for d in pakai)
    rng = random.Random(1)
    bs = sorted(sum(per[x]["N20"] for x in pick) / sum(per[x]["N"] for x in pick) for pick in ([rng.choice(pakai) for _ in pakai] for _ in range(boot)))
    q1, q3 = kuartil(r)
    # lokal: jendela 3x3 per blok hari berurutan
    blok, now = [], []
    for d in pakai:
        if now and (d - now[-1]).days != 1:
            blok.append(now); now = []
        now.append(d)
    blok.append(now)
    rj = []
    for b in blok:
        sel = {}
        for (lat, lon, t, s) in den.titik:
            if hari_lap(t) in b:
                c = (int((lon - X0) / SEL), int((Y1 - lat) / SEL))
                sel.setdefault(c, {"N": 0, "N20": 0})[s] += 1
        win = {}
        for (ix, iy), v in sel.items():
            for a in (-1, 0, 1):
                for bb in (-1, 0, 1):
                    w = win.setdefault((ix + a, iy + bb), {"N": 0, "N20": 0})
                    w["N"] += v["N"]; w["N20"] += v["N20"]
        rj += [w["N20"] / w["N"] for w in win.values() if w["N"] >= lokal_n_min]
    l1, l3 = kuartil(rj) if len(rj) >= 4 else (None, None)
    return {"hari": [d.isoformat() for d in pakai], "dibuang": buang, "n_hari": len(pakai), "N": sum(per[d]["N"] for d in pakai), "N20": sum(per[d]["N20"] for d in pakai),
            "harian": harian, "pooled": pooled, "ci95": (bs[int(0.025 * boot)], bs[int(0.975 * boot) - 1]), "median_harian": statistics.median(r), "iqr_harian": (q1, q3),
            "lokal": {"median": statistics.median(rj) if rj else None, "iqr": (l1, l3), "n_jendela": len(rj), "n_min": lokal_n_min, "blok": [f"{b[0]}..{b[-1]}" for b in blok]}}


CELAH_SNPP_NOL = {"2026-08": ("2026-08-03", "2026-08-04")}   # S-NPP nol (peta_karhutla.json celah; ilmu pipa-data): N20 ada, N tidak


def bulanan(bulan, akar=None):
    """Komponen bulanan 2026 dari berkas repo -> {"bulan", "N", "N20", "celah_n20"}. N = jumlah S-NPP bulan itu di sejarah.json; N20 = kalibrasi_noaa.json bulan_2026_n20;
    celah_n20 = perkiraan N20 pada hari S-NPP nol bulan itu (bagian lokasi unik hari itu di titik_hari/indeks.json x N20 bulan), dibuang dari pembilang."""
    from wilayah import AKAR
    akar = akar or AKAR
    sj = json.load(open(os.path.join(akar, "public/data/sejarah.json")))
    m = int(bulan[5:7])
    n = sum((v.get("2026") or [0] * 12)[m - 1] for v in sj["prov"].values())
    n20 = json.load(open(os.path.join(akar, "data/laporan-bnpb/metode-2026-10-25/kalibrasi_noaa.json")))["bulan_2026_n20"][str(m)]
    jml = json.load(open(os.path.join(akar, "public/data/titik_hari/indeks.json")))["jumlah"]
    total = sum(v for d, v in jml.items() if d.startswith(bulan))
    celah = round(n20 * sum(jml[d] for d in CELAH_SNPP_NOL.get(bulan, ())) / total)
    return {"bulan": bulan, "N": n, "N20": n20, "celah_n20": celah}


def pilih(dasar):
    """Konstanta dari komponen tercatat (lihat docstring modul) -> {"harian", "lokal", "lokal_iqr", "per_periode", "antar_periode"}."""
    okt = dasar["okt"]
    N = okt["N"] + sum(b["N"] for b in dasar["bulanan"])
    N20 = okt["N20"] + sum(b["N20"] - b["celah_n20"] for b in dasar["bulanan"])
    harian = N20 / N
    skala = harian / (okt["N20"] / okt["N"])
    per = {"okt": okt["N20"] / okt["N"], **{b["bulan"]: (b["N20"] - b["celah_n20"]) / b["N"] for b in dasar["bulanan"]}}
    return {"harian": harian, "skala": skala, "lokal": okt["lokal_median"] * skala, "lokal_iqr": (okt["lokal_iqr"][0] * skala, okt["lokal_iqr"][1] * skala),
            "per_periode": per, "antar_periode": (min(per.values()), max(per.values()))}


def laporkan(h):
    f = lambda x: f"{x:.3f}".replace(".", ",")
    print(f"hari laporan dipakai ({h['n_hari']}): {', '.join(h['hari'])}")
    print(f"dibuang: {h['dibuang']}")
    print(f"harian   : jumlah N {h['N']}, N20 {h['N20']} -> terpooled {f(h['pooled'])} (selang 95% antar-hari {f(h['ci95'][0])}-{f(h['ci95'][1])}); median {f(h['median_harian'])}, IQR {f(h['iqr_harian'][0])}-{f(h['iqr_harian'][1])}")
    L = h["lokal"]
    if L["median"] is not None:
        print(f"lokal    : {L['n_jendela']} jendela 3x3 (N >= {L['n_min']}; blok {', '.join(L['blok'])}) median {f(L['median'])}, IQR {f(L['iqr'][0])}-{f(L['iqr'][1])}")


def uji():
    D = dt.date
    def buat(rasio_hari, n=100):
        """rasio_hari = {tanggal: N20/N}; tiap hari n deteksi N; titik dibagi ke 4 sel; waktu 03.00-05.59 UTC (= 10.00-12.59 WIB, hari laporan yang sama)."""
        den = Deteksi()
        for d, r in rasio_hari.items():
            for i in range(n):
                t = dt.datetime.combine(d, dt.time(3 + i // 50, i % 50), UTC)
                den.tambah(-2.0 - (i % 4) * 0.2, 113.0, t, "N")
            for i in range(round(n * r)):
                t = dt.datetime.combine(d, dt.time(3 + i // 50, i % 50), UTC)
                den.tambah(-2.0 - (i % 4) * 0.2, 113.0 + 0.001, t, "N20")
        return den
    hr = {D(2026, 10, d): r for d, r in zip(range(7, 17), (0.8, 0.9, 1.0, 1.1, 1.2, 0.9, 0.9, 0.9, 1.0, 1.0))}
    den = buat(hr)
    den.liputan(dt.datetime(2026, 10, 6, 9, tzinfo=UTC), dt.datetime(2026, 10, 17, 9, tzinfo=UTC))   # hari 7..16 lengkap
    h = ukur(den, celah={"2026-10-12"}, boot=500)
    # D=12 (celah), D=13 (D-1 celah) dibuang; sisa 8 hari
    assert h["n_hari"] == 8 and set(h["dibuang"]) == {"2026-10-12", "2026-10-13"} and h["dibuang"]["2026-10-13"] == "celah sensor", h["dibuang"]
    assert abs(h["pooled"] - sum(hr[D(2026, 10, d)] for d in (7, 8, 9, 10, 11, 14, 15, 16)) / 8) < 0.01, h["pooled"]   # n sama tiap hari: jumlah = rata
    assert h["ci95"][0] <= h["pooled"] <= h["ci95"][1] and h["iqr_harian"][0] <= h["median_harian"] <= h["iqr_harian"][1]
    assert abs(h["median_harian"] - statistics.median([0.8, 0.9, 1.0, 1.1, 1.2, 0.9, 1.0, 1.0])) < 1e-9
    assert ukur(den, celah={"2026-10-12"}, boot=500)["ci95"] == h["ci95"], "bootstrap harus deterministik (benih 1)"
    den2 = buat(hr)
    den2.liputan(dt.datetime(2026, 10, 8, 9, tzinfo=UTC), dt.datetime(2026, 10, 12, 9, tzinfo=UTC))   # cakupan sempit: hari 9..12 lengkap saja
    assert ukur(den2, boot=100)["hari"] == ["2026-10-09", "2026-10-10", "2026-10-11", "2026-10-12"], "jendela di luar cakupan sumber dibuang"
    # lokal: dua blok berurutan (7-11, 14-16) dan jendela di bawah ambang diabaikan
    assert h["lokal"]["blok"] == ["2026-10-07..2026-10-11", "2026-10-14..2026-10-16"] and h["lokal"]["n_jendela"] > 0 and abs(h["lokal"]["median"] - h["pooled"]) < 0.1
    assert ukur(den, celah={"2026-10-12"}, lokal_n_min=10**6, boot=100)["lokal"]["median"] is None
    # dua sumber memuat baris yang sama: dihitung sekali
    den3 = buat({D(2026, 10, 7): 1.0, D(2026, 10, 8): 1.0, D(2026, 10, 9): 1.0}); n0 = len(den3.titik)
    den3.tambah(-2.0, 113.0, dt.datetime.combine(D(2026, 10, 7), dt.time(3, 0), UTC), "N")
    assert len(den3.titik) == n0
    # hotspot.json: jam relatif acuan, keyakinan rendah dan sensor lain diabaikan
    ac = dt.datetime(2026, 10, 10, 12, 0, tzinfo=UTC)
    hs = {"kolom": ["lat", "lon", "jam", "sensor", "frp", "keyakinan"], "acuan": ac.isoformat(), "baris": [[-2, 113, -2.0, "N", 1, 1], [-2, 113, -2.0, "N20", 1, 2], [-2, 113, -2.0, "N", 1, 0], [-2, 113, -2.0, "N21", 1, 1], [-2, 113, -2.0, "M", 1, 1]]}
    d4 = Deteksi(); dari_hotspot(hs, d4)
    assert sorted(k[3] for k in d4.titik) == ["N", "N20"] and d4.cakupan == [(ac - dt.timedelta(days=7) + MARGIN_AWAL, ac - MARGIN_AKHIR)]
    assert hari_lap(dt.datetime(2026, 10, 12, 9, 0, tzinfo=UTC)) == D(2026, 10, 12) and hari_lap(dt.datetime(2026, 10, 12, 9, 1, tzinfo=UTC)) == D(2026, 10, 13), "batas 16.00 WIB masuk hari D"
    # pilih(): rasio-dari-jumlah semua komponen (Agu dikurangi N20 hari S-NPP nol), lokal digeser dengan faktor yang sama
    d = {"okt": {"N": 1000, "N20": 900, "lokal_median": 0.8, "lokal_iqr": (0.6, 1.0)},
         "bulanan": [{"bulan": "2026-08", "N": 3000, "N20": 3300, "celah_n20": 300}, {"bulan": "2026-09", "N": 6000, "N20": 6000, "celah_n20": 0}]}
    r = pilih(d)
    assert abs(r["harian"] - (900 + 3000 + 6000) / 10000) < 1e-12 and abs(r["skala"] - 0.99 / 0.9) < 1e-12 and abs(r["lokal"] - 0.8 * 1.1) < 1e-12
    assert r["lokal_iqr"] == (0.6 * r["skala"], 1.0 * r["skala"]) and r["per_periode"] == {"okt": 0.9, "2026-08": 1.0, "2026-09": 1.0} and r["antar_periode"] == (0.9, 1.0)
    # konstanta di firms_sumber = hasil pilih() atas komponen tercatat (cara memilih bisa diulang), dan komponen bulanan = berkas repo bila ada
    import firms_sumber as FS
    rr = pilih(FS.RASIO_DASAR)
    assert round(rr["harian"], 2) == FS.RASIO_N20_N == 0.97 and round(rr["lokal"], 2) == FS.RASIO_N20_N_LOKAL and tuple(round(x, 2) for x in rr["lokal_iqr"]) == FS.RASIO_N20_N_LOKAL_IQR, rr
    assert tuple(round(x, 2) for x in rr["antar_periode"]) == FS.RASIO_N20_N_HARIAN["antar_periode"], rr["antar_periode"]
    o = FS.RASIO_DASAR["okt"]
    assert round(o["N20"] / o["N"], 3) == 0.907 and o["n_hari"] == 12
    try:
        assert all(bulanan(b["bulan"]) == b for b in FS.RASIO_DASAR["bulanan"]), [bulanan(b["bulan"]) for b in FS.RASIO_DASAR["bulanan"]]
    except OSError:
        pass   # berkas komponen tak ada di salinan ini
    print("rasio_n20_n: uji lolos")


if __name__ == "__main__":
    a = sys.argv[1:]
    if a[:1] == ["uji"]:
        uji()
    elif a[:1] == ["pilih"]:
        import firms_sumber as FS
        r = pilih(FS.RASIO_DASAR)
        f = lambda x: f"{x:.3f}".replace(".", ",")
        print(f"harian {f(r['harian'])} -> konstanta {FS.RASIO_N20_N}; lokal {f(r['lokal'])} (IQR {f(r['lokal_iqr'][0])}-{f(r['lokal_iqr'][1])}) -> {FS.RASIO_N20_N_LOKAL}; "
              f"per periode { {k: f(v) for k, v in r['per_periode'].items()} }; antar-periode {f(r['antar_periode'][0])}-{f(r['antar_periode'][1])}")
        try:
            for b in FS.RASIO_DASAR["bulanan"]:
                cocok = bulanan(b["bulan"]) == b
                print(f"komponen {b['bulan']}: {'cocok dengan berkas repo' if cocok else 'BEDA dari berkas repo: ' + str(bulanan(b['bulan']))}")
        except OSError as e:
            print("berkas komponen bulanan tidak ada:", e)
    elif a[:1] == ["ukur"]:
        den, mode, celah = Deteksi(), None, set()
        for x in a[1:]:
            if x in ("--hotspot", "--tar", "--csv", "--publik"):
                mode = x
                continue
            if x == "--json":
                continue
            if mode == "--hotspot":
                dari_hotspot(json.load(open(x)), den)
            elif mode == "--tar":
                dari_tar(x, den)
            elif mode == "--csv":
                dari_csv(x, den)
            elif mode == "--publik":
                dari_publik(x, den)
        from wilayah import AKAR
        jp = os.path.join(AKAR, "public/data/peta_karhutla.json")
        if os.path.exists(jp):
            celah = set(json.load(open(jp)).get("celah", []))
        h = ukur(den, celah)
        print(json.dumps(h, ensure_ascii=False, default=list) if "--json" in a else "", end="")
        if "--json" not in a:
            laporkan(h)
    else:
        print(__doc__)
