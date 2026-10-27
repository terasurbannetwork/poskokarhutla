"""Memilih sumber FIRMS (arsip standar SP atau NRT) per sensor per hari dari /api/data_availability, dipakai harian30.py dan khg_prioritas.py.

Arsip SP tertinggal ~3 bulan dari NRT dan jangkauannya beda per sensor (19 Okt 2026: VIIRS SP berakhir 30 Jun, MODIS SP 31 Jul, NRT VIIRS mulai 1 Jul,
MODIS NRT 1 Agu). Menebak dari umur hari membuat SP kosong (balasan 200 berisi header saja) diterima sebagai "nol titik" (bug 2-27 Agu).
Balasan yang bukan CSV (galat kunci/kuota juga datang berstatus 200) dianggap gagal. Hari WIB D = UTC D-1 17:00 .. D 17:00, jadi hari selesai bila
hari UTC D-1 dan D sukses untuk SEMUA famili sensor.

BERHENTINYA S-NPP (pengumuman NASA Earthdata: distribusi produk Suomi NPP, termasuk VIIRS_SNPP_NRT, berhenti 1 Nov 2026 13:00 UTC; tanggal bisa bergeser,
ubah SATU konstanta SNPP_AKHIR di sini). Aturannya menurut TANGGAL DATA, bukan jam dinding: NRT S-NPP tidak ada untuk hari UTC sesudah tanggal SNPP_AKHIR
(sumber_hari tak mengembalikannya, wajib() tak menuntutnya, unduh() menandai famili itu terpenuhi di `ok`), tetapi hari <= tanggal itu TETAP diminta walau dijalankan
sesudah batas (isi mundur hari lampau masih bisa utuh 4 sensor bila FIRMS masih melayaninya). Galat S-NPP tidak fatal: hari itu belum penuh (dicoba lagi jalan berikutnya)
dan unduh berhenti meminta blok S-NPP berikutnya sesudah 2 galat berturut-turut (tanpa itu tiap blok menunggu 4-5 percobaan). Pemanggil yang tidak bergantung pada S-NPP
untuk keutuhan harinya (peta_karhutla.py: luas hanya N20/N21) memakai wajib(..., longgar=True): sesudah batas S-NPP NRT opsional di mana pun (gagal tak menahan hari).
Waktu patokan sekarang() = jam dinding, dapat dibekukan swa-uji lewat _SEKARANG.

Uji:  python3 scripts/data/firms_sumber.py
"""
import csv, datetime as dt, io, json, os, re, sys

UTC = dt.timezone.utc
# Akuisisi S-NPP terakhir yang didistribusikan FIRMS (NASA Earthdata): 1 Nov 2026 13:00 UTC. SATU-SATUNYA tempat batas ini ditulis; modul lain mengimpornya.
SNPP_AKHIR = dt.datetime(2026, 11, 1, 13, 0, tzinfo=UTC)
SNPP = "VIIRS_SNPP"
SNPP_NRT = SNPP + "_NRT"
# Rasio deteksi NOAA-20 / S-NPP (keyakinan n/h, tanpa sel sumber panas tetap, di provinsi). Setara-S-NPP sesudah SNPP_AKHIR = deteksi N20 / rasio. Diukur dan DIPILIH
# oleh scripts/data/rasio_n20_n.py (28 Okt 2026; ulangi: `ukur` untuk komponen Oktober, `pilih` untuk konstanta, `uji` memastikan konstanta di bawah = pilih(RASIO_DASAR)).
# ASUMSI: lintasan kedua satelit setara (orbit JPSS sama) dan rasio stabil sepanjang musim. Komponen:
#  - OKTOBER, satuan pemakaian (hari laporan nasional, rasio-dari-jumlah): 12 hari laporan lengkap tanpa celah sensor (7-12, 16-19, 22-23 Okt 2026; snapshot hotspot.json di riwayat
#    commit 606fff79/b5b131f6/70200d78/2ae0f44e + firms-raw-15-22okt.tar.gz + CSV publik firms-7hari-publik-25okt-0721.tar.gz, confidence nominal/high -> n/h): 99.199 N20 / 109.316 N = 0,907,
#    selang 95% bootstrap antar-hari 0,80-1,04; per hari median 0,83, IQR 0,75-1,05 (satu hari bisa meleset +-25%).
#  - AGUSTUS 0,98 dan SEPTEMBER 1,00 (bulanan, jangka lebih panjang): sejarah.json (S-NPP) vs kalibrasi_noaa.json (N20); satuannya sedikit beda (bulan WIB, saringan type vs sel industri),
#    selisih <= 3% pada 130-200 rb titik per bulan. Agu dikoreksi: 3-4 Agu S-NPP nol, N20 hari itu (~3.956, bagian lokasi unik) dibuang dari pembilang (mentah 1,014).
#    Tidak dipakai: Juli (S-NPP nol 11-16 Jul), Mar-Jun (S-NPP diisi N20 x 0,978: melingkar), F20/4,3 ha (himpunan tahun beda).
#  - HARIAN (laporan.py): rasio-dari-jumlah semua komponen = 0,97 (menyambung dengan faktor isi 0,978 di sejarah.json); tak bias untuk luas yang dijumlahkan. Tanpa koreksi Agu 0,98.
#    Selang antar-periode 0,91-1,00. Per hari tetap lebar (lihat Oktober).
#  - LOKAL (insiden.py, watak_kluster.py; jendela 3x3 sel 0,05 derajat ~16 km): median 4.458 jendela ber-N >= 50 pada Oktober = 0,83 (IQR 0,67-1,00), digeser ke level jangka panjang dengan
#    faktor harian/Oktober = 1,07: 0,89, IQR 0,72-1,07. Median (bukan jumlah) karena yang diwakili satu insiden / kluster; per provinsi 0,83 (Papua Selatan) - 1,31 (Sulut).
#    Menggeser level dengan faktor yang sama MENGASUMSIKAN bentuk sebaran lokal tetap; tanpa pergeseran 0,83.
RASIO_DASAR = {
    "okt": {"periode": "7-12, 16-19, 22-23 Okt 2026", "n_hari": 12, "N": 109316, "N20": 99199, "ci95": (0.80, 1.04), "median_harian": 0.83, "iqr_harian": (0.75, 1.05),
            "lokal_median": 0.831, "lokal_iqr": (0.673, 1.000), "lokal_n_jendela": 4458},
    "bulanan": [{"bulan": "2026-08", "N": 131423, "N20": 133212, "celah_n20": 3956}, {"bulan": "2026-09", "N": 199494, "N20": 199307, "celah_n20": 0}],
}
RASIO_N20_N = 0.97
RASIO_N20_N_HARIAN = {"antar_periode": (0.91, 1.00), "ci95_okt": (0.80, 1.04), "median": 0.83, "iqr": (0.75, 1.05), "n_hari": 12, "periode": "Okt 2026"}
RASIO_N20_N_LOKAL = 0.89
RASIO_N20_N_LOKAL_IQR = (0.72, 1.07)


def _k(x):
    return f"{x:.2f}".replace(".", ",")


def rasio_teks(lokal=False):
    """Kalimat rasio + selangnya, dari konstanta di atas (satu sumber untuk laporan.json, insiden.json, dokumentasi)."""
    if lokal:
        return f"{_k(RASIO_N20_N_LOKAL)} (median jendela 3x3, IQR {_k(RASIO_N20_N_LOKAL_IQR[0])}-{_k(RASIO_N20_N_LOKAL_IQR[1])})"
    h = RASIO_N20_N_HARIAN
    return (f"{_k(RASIO_N20_N)} (gabungan {h['n_hari']} hari laporan {h['periode']} tanpa celah sensor, Agu, dan Sep 2026; selang antar-periode {_k(h['antar_periode'][0])}-{_k(h['antar_periode'][1])}; "
            f"Okt: selang 95% {_k(h['ci95_okt'][0])}-{_k(h['ci95_okt'][1])}, per hari median {_k(h['median'])}, IQR {_k(h['iqr'][0])}-{_k(h['iqr'][1])})")


FAMILI = ("VIIRS_SNPP", "VIIRS_NOAA20", "MODIS")
SENSOR = {"VIIRS_SNPP": "N", "VIIRS_NOAA20": "N20", "MODIS": "M"}
_SEKARANG = None   # hanya diisi swa-uji (membekukan jam)


def sekarang():
    """Jam patokan (UTC, sadar zona): jam dinding, atau _SEKARANG bila swa-uji membekukannya."""
    return _SEKARANG or dt.datetime.now(UTC)


def snpp_berhenti(acuan=None):
    """True bila acuan (datetime sadar zona; bawaan sekarang()) sudah melewati SNPP_AKHIR."""
    return (acuan or sekarang()) >= SNPP_AKHIR


def sensor_url(teks):
    """Sensor kunci FIRMS dari teks/URL apa pun sebelum dicetak atau dimasukkan ke pesan galat: segmen sesudah `/csv/` -> `***`, juga nilai env FIRMS_MAP_KEY."""
    teks = re.sub(r"(/csv/)[^/\s'\"]+", r"\1***", str(teks))
    k = os.environ.get("FIRMS_MAP_KEY")
    return teks.replace(k, "***") if k else teks


def kelas_yakin(conf, modis):
    """Keyakinan FIRMS -> 0 rendah, 1 sedang, 2 tinggi (BRIN: MODIS 0-29/30-79/80-100; VIIRS l/n/h, nilai tak dikenal = sedang).
    Titik panas yang dihitung = kelas >= 1 (keputusan pemilik 25 Okt 2026)."""
    if modis:
        return 0 if not conf.isdigit() or int(conf) < 30 else 1 if int(conf) < 80 else 2
    return {"l": 0, "n": 1, "h": 2}.get(conf.lower(), 1)


def muat_ketersediaan(kunci, ambil, famili=FAMILI, acuan=None):
    """{data_id: (tgl_min, tgl_maks)}; RuntimeError bila NRT satu famili (bawaan FAMILI) tak tercantum. Sesudah SNPP_AKHIR (acuan) VIIRS_SNPP
    boleh hilang dari daftar (barisnya dihapus FIRMS): tidak dituntut lagi."""
    ket = {}
    for b in ambil(f"https://firms.modaps.eosdis.nasa.gov/api/data_availability/csv/{kunci}/ALL").splitlines()[1:]:
        p = b.split(",")
        if len(p) == 3:
            ket[p[0]] = (dt.date.fromisoformat(p[1]), dt.date.fromisoformat(p[2]))
    if not all(f + "_NRT" in ket for f in famili if not (f == SNPP and snpp_berhenti(acuan))):
        raise RuntimeError(f"data_availability tak lengkap: {sorted(ket)}")
    return ket


def sumber_hari(fam, d, ket):
    """SP bila d dalam jangkauannya, selain itu NRT bila d dalam jangkauannya, selain itu None. VIIRS_SNPP_NRT tidak pernah dikembalikan untuk hari UTC
    sesudah tanggal SNPP_AKHIR (tak ada datanya); hari <= tanggal itu tetap, kapan pun dijalankan (aturan menurut tanggal data, bukan jam dinding)."""
    for sfx in ("_SP", "_NRT"):
        if fam == SNPP and sfx == "_NRT" and d > SNPP_AKHIR.date():
            continue
        r = ket.get(fam + sfx)
        if r and r[0] <= d <= r[1]:
            return fam + sfx
    return None


def wajib(u, ket, famili=FAMILI, longgar=False, acuan=None):
    """Famili yang harus utuh untuk hari UTC u. VIIRS_SNPP opsional bila NOAA-20 masih ada dan: (1) tak ada sumber S-NPP hari itu karena u sesudah tanggal SNPP_AKHIR,
    barisnya hilang dari data_availability, atau u melewati max_date-nya; atau (2) longgar=True dan S-NPP sudah berhenti (acuan >= SNPP_AKHIR) untuk hari bersumber NRT
    (pemanggil yang keutuhan harinya tak bergantung pada S-NPP). Selain itu wajib, juga sesudah batas untuk hari <= 1 Nov (hari yang tak utuh dicoba lagi). Famili lain
    tidak pernah opsional (hari bolong = gagal keras); NOAA-20 tak tersedia = semua wajib."""
    w = set(famili)
    if SNPP in w and sumber_hari("VIIRS_NOAA20", u, ket):
        src, nrt = sumber_hari(SNPP, u, ket), ket.get(SNPP_NRT)
        if src is None and (u > SNPP_AKHIR.date() or nrt is None or u > nrt[1]):
            w.discard(SNPP)
        elif longgar and src and src.endswith("_NRT") and snpp_berhenti(acuan):
            w.discard(SNPP)
    return w


def csv_sah(teks):
    if not teks.lstrip().startswith("latitude"):
        raise ValueError("balasan FIRMS bukan CSV: " + teks.strip()[:80])
    return csv.DictReader(io.StringIO(teks))


def unduh(u0, u1, kunci, ambil, bbox, ket, log=sys.stderr, famili=FAMILI, acuan=None):
    """Unduh hari UTC u0..u1 (date) semua famili (bawaan FAMILI; peta_karhutla.py menambah VIIRS_NOAA21). -> ([(sumber, baris_csv)], ok)
    dengan ok[hari UTC] = set famili yang terpenuhi: sukses diunduh, atau (hanya VIIRS_SNPP) tidak diwajibkan hari itu (wajib()). Blok gagal/kosong-salah-sumber
    dilewati (hari UTC-nya tak masuk ok). S-NPP berhenti diminta sesudah 2 blok gagal berturut-turut dalam satu panggilan. Balasan NRT S-NPP kosong sesudah
    SNPP_AKHIR (`acuan`) hanya `::warning` (sulit dibedakan dari celah asli), hari tetap dianggap utuh."""
    baris, ok = [], {}
    for fam in famili:
        d, gagal_beruntun = u0, 0
        while d <= u1:
            src = sumber_hari(fam, d, ket)
            n = 1
            while n < 5 and d + dt.timedelta(days=n) <= u1 and sumber_hari(fam, d + dt.timedelta(days=n), ket) == src:
                n += 1
            if src is not None and not (fam == SNPP and gagal_beruntun >= 2):
                try:
                    isi = list(csv_sah(ambil(f"https://firms.modaps.eosdis.nasa.gov/api/area/csv/{kunci}/{src}/{bbox}/{n}/{d}")))
                    baris += [(src, r) for r in isi]
                    for i in range(n):
                        ok.setdefault(d + dt.timedelta(days=i), set()).add(fam)
                    gagal_beruntun = 0
                    if fam == SNPP and not isi and snpp_berhenti(acuan):
                        print(f"::warning title=S-NPP NRT kosong::{src} {d} +{n - 1} hari: balasan kepala saja sesudah SNPP_AKHIR; hari dianggap utuh tanpa S-NPP", file=log)
                except Exception as e:
                    gagal_beruntun += 1
                    print("firms_sumber: gagal", src, d, sensor_url(f"{type(e).__name__}: {e}"), file=log)
            d += dt.timedelta(days=n)
    if SNPP in famili:   # S-NPP yang tidak diwajibkan (sumbernya tak ada hari itu) dianggap terpenuhi supaya penuh() tidak menahan hari untuk selamanya
        d = u0
        while d <= u1:
            if SNPP not in ok.get(d, set()) and SNPP not in wajib(d, ket, famili):
                ok.setdefault(d, set()).add(SNPP)
            d += dt.timedelta(days=1)
    return baris, ok


def penuh(ok, d, famili=FAMILI):
    """Tanggal WIB d selesai bila hari UTC d-1 dan d sukses untuk semua famili."""
    return all(ok.get(x, set()) == set(famili) for x in (d - dt.timedelta(days=1), d))


def nasional_harian(jalur):
    """{tgl: titik nasional} semua tahun dari musim_harian.json (pembanding kewarasan: hari kosong padahal nasional besar = unduhan gagal)."""
    if not os.path.exists(jalur):
        return {}
    out = {}
    for th, v in json.load(open(jalur)).get("nasional", {}).items():
        d0 = dt.date(int(th), 1, 1)
        out.update({(d0 + dt.timedelta(days=i)).isoformat(): n for i, n in enumerate(v)})
    return out


PRA = dt.datetime(2026, 10, 30, 12, 0, tzinfo=UTC)    # jam beku swa-uji: sebelum SNPP_AKHIR
SESUDAH = dt.datetime(2026, 11, 2, 12, 0, tzinfo=UTC)  # sesudah SNPP_AKHIR


def uji_snpp_berhenti():
    """Skenario berhentinya S-NPP: (a) CSV berisi kepala saja, (b) galat HTTP 400, (c) baris hilang dari data_availability; masing-masing sebelum dan sesudah SNPP_AKHIR."""
    D = dt.date.fromisoformat
    HDR = "latitude,longitude,acq_date,acq_time\n"
    BARIS = "-2.5,100.5,2026-10-31,0100\n"
    avail = "data_id,min_date,max_date\n" + "".join(f"{f}_SP,2012-01-01,2026-06-30\n{f}_NRT,2026-07-01,2026-11-05\n" for f in FAMILI)
    avail_c = avail.replace("VIIRS_SNPP_NRT", "X")   # (c)
    def pabrik(mode):
        urls = []
        def ambil(u):
            urls.append(u)
            if "VIIRS_SNPP" in u and "area/csv" in u:
                if mode == "a":
                    return HDR
                if mode == "b":
                    raise RuntimeError("HTTP Error 400: Bad Request")
            return HDR + BARIS
        return ambil, urls
    snpp = lambda urls: [u for u in urls if "/VIIRS_SNPP_" in u and "area/csv" in u]
    def uji(mode, ac, a=avail):
        ambil, urls = pabrik(mode)
        ket = muat_ketersediaan("K", lambda u: a, acuan=ac)
        return unduh(D("2026-10-30"), D("2026-11-03"), "K", ambil, "b", ket, log=io.StringIO(), acuan=ac), urls
    # --- SEBELUM batas: S-NPP diminta untuk hari <= tanggal batas saja; (a) kosong = sukses, (b) galat = hari belum penuh tetapi tidak meledak, berhenti sesudah 2 galat
    (b0, ok0), urls0 = uji("0", PRA)
    assert {u.split("/")[-4] for u in snpp(urls0)} == {"VIIRS_SNPP_NRT"} and all(D(u.split("/")[-1]) <= SNPP_AKHIR.date() for u in snpp(urls0)), snpp(urls0)
    assert all(SNPP in ok0[D(x)] for x in ("2026-10-30", "2026-10-31", "2026-11-01")) and penuh(ok0, D("2026-10-31"), FAMILI)
    assert SNPP in ok0[D("2026-11-02")] and penuh(ok0, D("2026-11-03"), FAMILI), "hari UTC sesudah tanggal batas: S-NPP tidak diwajibkan walau jamnya belum lewat"
    (ba, oka), _ = uji("a", PRA)
    assert penuh(oka, D("2026-10-31"), FAMILI) and not any(r["acq_date"] and "SNPP" in s for s, r in ba), "(a) sebelum batas: kepala saja = nol titik S-NPP, bukan galat"
    (bb, okb), urls_b = uji("b", PRA)
    assert not penuh(okb, D("2026-10-31"), FAMILI) and SNPP not in okb[D("2026-10-31")] and okb[D("2026-10-31")] >= {"VIIRS_NOAA20", "MODIS"}, "(b) sebelum batas: S-NPP gagal, sensor lain utuh"
    assert any("NOAA20" in s for s, _ in bb), "sensor lain tetap terunduh saat S-NPP galat"
    try:
        muat_ketersediaan("K", lambda u: avail_c, acuan=PRA); raise SystemExit("(c) sebelum batas: S-NPP hilang dari daftar harus RuntimeError (hari bolong = gagal keras)")
    except RuntimeError:
        pass
    assert "VIIRS_NOAA20_NRT" in muat_ketersediaan("K", lambda u: avail_c, famili=("VIIRS_NOAA20", "MODIS"), acuan=PRA)
    # berhenti dini: 12 blok S-NPP berurutan, semua galat -> hanya 2 permintaan
    kbanyak = {**{f + "_NRT": (D("2026-07-01"), D("2026-11-05")) for f in FAMILI}}
    hitung_snpp = []
    def mati(u):
        if "VIIRS_SNPP" in u:
            hitung_snpp.append(u)
            raise RuntimeError("HTTP Error 400")
        return HDR
    unduh(D("2026-08-01"), D("2026-09-30"), "K", mati, "b", kbanyak, log=io.StringIO(), acuan=PRA)
    assert len(hitung_snpp) == 2, f"sumber mati: berhenti sesudah 2 galat, bukan {len(hitung_snpp)}"
    # --- SESUDAH batas (aturan menurut tanggal data): hari <= 1 Nov TETAP diminta NRT S-NPP, hari sesudahnya tidak sama sekali
    for mode, a in (("0", avail), ("a", avail), ("b", avail)):
        log = io.StringIO()
        ambil, urls_s = pabrik(mode)
        ket = muat_ketersediaan("K", lambda u: a, acuan=SESUDAH)
        bs, oks = unduh(D("2026-10-30"), D("2026-11-03"), "K", ambil, "b", ket, log=log, acuan=SESUDAH)
        sn = snpp(urls_s)
        assert len(sn) == 1 and sn[0].split("/")[-4] == "VIIRS_SNPP_NRT" and sn[0].endswith("/3/2026-10-30"), (mode, sn)   # 30, 31 Okt, 1 Nov = satu blok; 2-3 Nov tidak
        assert penuh(oks, D("2026-11-03"), FAMILI), (mode, "hari sepenuhnya sesudah batas tak menunggu S-NPP")
        if mode == "0":
            assert penuh(oks, D("2026-10-31"), FAMILI) and penuh(oks, D("2026-11-02"), FAMILI) and any("SNPP" in s for s, _ in bs)
        elif mode == "a":   # kepala saja: dianggap utuh tetapi ada peringatan
            assert penuh(oks, D("2026-10-31"), FAMILI) and "::warning title=S-NPP NRT kosong" in log.getvalue(), log.getvalue()
        else:               # (b) galat: hari <= 1 Nov (dan WIB 2 Nov yang butuh UTC 1 Nov) belum penuh, tidak meledak, sensor lain utuh
            assert not penuh(oks, D("2026-10-31"), FAMILI) and not penuh(oks, D("2026-11-02"), FAMILI) and oks[D("2026-10-31")] >= {"VIIRS_NOAA20", "MODIS"}, oks
    for mode in ("0", "b"):   # (c) baris NRT S-NPP hilang dari data_availability: tak ada sumber, tak diminta, semua hari penuh
        ambil, urls_s = pabrik(mode)
        ket = muat_ketersediaan("K", lambda u: avail_c, acuan=SESUDAH)
        bs, oks = unduh(D("2026-10-30"), D("2026-11-03"), "K", ambil, "b", ket, log=io.StringIO(), acuan=SESUDAH)
        assert not snpp(urls_s) and penuh(oks, D("2026-10-31"), FAMILI) and penuh(oks, D("2026-11-02"), FAMILI), (mode, snpp(urls_s))
    global _SEKARANG
    _SEKARANG = SESUDAH   # jam dinding sudah lewat batas: hari lampau tetap bersumber NRT (tanggal data, bukan jam)
    try:
        assert sumber_hari(SNPP, D("2026-10-31"), {SNPP_NRT: (D("2026-07-01"), D("2026-11-05"))}) == SNPP_NRT and sumber_hari(SNPP, D("2026-11-02"), {SNPP_NRT: (D("2026-07-01"), D("2026-11-05"))}) is None
    finally:
        _SEKARANG = PRA
    ket_sp = {**{f + "_NRT": (D("2026-07-01"), D("2026-11-05")) for f in FAMILI}, "VIIRS_SNPP_SP": (D("2012-01-01"), D("2026-08-31")), "MODIS_SP": (D("2012-01-01"), D("2026-08-31")),
              "VIIRS_NOAA20_SP": (D("2012-01-01"), D("2026-08-31"))}
    ambil_sp, urls_sp = pabrik("0")
    unduh(D("2026-08-30"), D("2026-09-02"), "K", ambil_sp, "b", ket_sp, log=io.StringIO(), acuan=SESUDAH)
    assert [u.split("/")[-4] for u in snpp(urls_sp)] == ["VIIRS_SNPP_SP", "VIIRS_SNPP_NRT"], "arsip SP S-NPP dan NRT-nya (hari <= batas) tetap diminta sesudah batas"
    # wajib(): S-NPP wajib untuk hari <= 1 Nov kapan pun; hari sesudahnya dan baris hilang opsional; longgar (peta_karhutla) opsional sesudah batas; bolong tetap wajib
    ket = {**{f + "_NRT": (D("2026-07-01"), D("2026-11-05")) for f in FAMILI}}
    SEMUA, TANPA = set(FAMILI), set(FAMILI) - {SNPP}
    assert wajib(D("2026-10-31"), ket, FAMILI, acuan=PRA) == SEMUA and wajib(D("2026-11-01"), ket, FAMILI, acuan=SESUDAH) == SEMUA, "strict: sesudah batas pun wajib untuk hari <= 1 Nov"
    assert wajib(D("2026-11-02"), ket, FAMILI, acuan=PRA) == TANPA and wajib(D("2026-11-02"), ket, FAMILI, acuan=SESUDAH) == TANPA
    assert wajib(D("2026-10-31"), ket, FAMILI, longgar=True, acuan=PRA) == SEMUA and wajib(D("2026-10-31"), ket, FAMILI, longgar=True, acuan=SESUDAH) == TANPA
    assert wajib(D("2026-06-01"), ket, FAMILI, longgar=True, acuan=SESUDAH) == SEMUA and wajib(D("2026-11-20"), ket, FAMILI, acuan=SESUDAH) == SEMUA, "bolong tetap wajib"
    assert wajib(D("2026-10-31"), {k: v for k, v in ket.items() if k != SNPP_NRT}, FAMILI, acuan=PRA) == TANPA, "baris NRT S-NPP hilang + NOAA-20 ada = opsional"
    assert wajib(D("2026-10-31"), {**ket, "VIIRS_SNPP_SP": (D("2012-01-01"), D("2026-11-05"))}, FAMILI, longgar=True, acuan=SESUDAH) == SEMUA, "SP tak pernah opsional"
    assert snpp_berhenti(SNPP_AKHIR) and not snpp_berhenti(SNPP_AKHIR - dt.timedelta(seconds=1)) and snpp_berhenti(SESUDAH) and not snpp_berhenti(PRA)
    # konstanta rasio: di dalam selang antar-periode, komponen Oktober konsisten dengan selangnya, lokal di dalam IQR-nya; teks memuat angka-angkanya (satu sumber untuk laporan.json / insiden.json)
    h = RASIO_N20_N_HARIAN
    assert h["antar_periode"][0] <= RASIO_N20_N <= h["antar_periode"][1] and h["iqr"][0] <= h["median"] <= h["iqr"][1] and h["ci95_okt"][0] <= RASIO_DASAR["okt"]["N20"] / RASIO_DASAR["okt"]["N"] <= h["ci95_okt"][1]
    assert RASIO_N20_N_LOKAL_IQR[0] <= RASIO_N20_N_LOKAL <= RASIO_N20_N_LOKAL_IQR[1] and "0,97" in rasio_teks() and "0,91-1,00" in rasio_teks() and "0,80-1,04" in rasio_teks() and "0,75-1,05" in rasio_teks()
    assert "0,89" in rasio_teks(True) and "0,72-1,07" in rasio_teks(True)


def uji():
    global _SEKARANG
    _SEKARANG = PRA   # hermetis: hasil uji tidak boleh bergantung pada jam dinding (sesudah 1 Nov 2026 S-NPP NRT tak diminta lagi)
    D = dt.date.fromisoformat
    assert [kelas_yakin(c, False) for c in "lnhN"] == [0, 1, 2, 1] and [kelas_yakin(c, True) for c in ("0", "29", "30", "79", "80", "100")] == [0, 0, 1, 1, 2, 2], "keyakinan rendah (l, MODIS < 30) harus kelas 0"
    HDR = "latitude,longitude,acq_date,acq_time\n"
    avail = "data_id,min_date,max_date\n" + "".join(f"{f}_SP,2012-01-01,2026-01-02\n{f}_NRT,2026-01-03,2026-12-31\n" for f in FAMILI)
    ket = muat_ketersediaan("K", lambda u: avail)
    assert sumber_hari("MODIS", D("2026-01-02"), ket) == "MODIS_SP" and sumber_hari("MODIS", D("2026-01-03"), ket) == "MODIS_NRT"
    assert sumber_hari("MODIS", D("2027-01-01"), ket) is None
    urls = []
    def ambil(u):
        urls.append(u)
        return HDR + "-2.5,100.5,2026-01-02,0100\n"
    baris, ok = unduh(D("2026-01-01"), D("2026-01-03"), "K", ambil, "b", ket)
    assert sorted(u.split("/")[-4] for u in urls) == sorted([f + "_SP" for f in FAMILI] + [f + "_NRT" for f in FAMILI]), urls   # dipecah di batas SP/NRT
    assert len(baris) == 6 and penuh(ok, D("2026-01-02")) and penuh(ok, D("2026-01-03")) and not penuh(ok, D("2026-01-04"))
    b4, ok4 = unduh(D("2026-01-01"), D("2026-01-02"), "K", ambil, "b", ket, famili=FAMILI + ("VIIRS_NOAA21",))   # famili di luar bawaan: tak ada sumber -> tak masuk ok
    assert all(ok4[x] == set(FAMILI) for x in ok4) and not penuh(ok4, D("2026-01-02"), FAMILI + ("VIIRS_NOAA21",)) and penuh(ok4, D("2026-01-02"))
    assert "VIIRS_NOAA20_NRT" in muat_ketersediaan("K", lambda u: avail.replace("VIIRS_SNPP_NRT", "X"), famili=("VIIRS_NOAA20", "MODIS"))   # S-NPP boleh hilang bila tak diminta
    try:
        muat_ketersediaan("K", lambda u: avail.replace("VIIRS_SNPP_NRT", "X")); raise SystemExit("S-NPP hilang harus RuntimeError bila diminta")
    except RuntimeError:
        pass
    for galat in (lambda u: "Invalid MAP_KEY.", lambda u: (_ for _ in ()).throw(RuntimeError("mati"))):
        b, ok = unduh(D("2026-01-01"), D("2026-01-02"), "K", galat, "b", ket, log=io.StringIO())
        assert not b and not ok
    u = "https://firms.modaps.eosdis.nasa.gov/api/area/csv/RAHASIA123/VIIRS_SNPP_NRT/1,2,3,4/1/2026-01-01"
    assert "RAHASIA123" not in sensor_url(u) and "RAHASIA123" not in sensor_url("x: " + u + " gagal") and "/csv/***/VIIRS" in sensor_url(u)
    assert "RAHASIA123" not in sensor_url("https://firms.modaps.eosdis.nasa.gov/api/data_availability/csv/RAHASIA123/ALL")
    os.environ["FIRMS_MAP_KEY"] = "KUNCIENV"
    assert "KUNCIENV" not in sensor_url("galat KUNCIENV di sini")
    del os.environ["FIRMS_MAP_KEY"]
    log = io.StringIO()
    def meledak(url):
        raise RuntimeError("HTTP 500 " + url)
    unduh(D("2026-01-02"), D("2026-01-02"), "RAHASIA123", meledak, "1,2,3,4", ket, log=log)
    assert log.getvalue() and "RAHASIA123" not in log.getvalue(), log.getvalue()
    uji_snpp_berhenti()
    print("firms_sumber: uji lolos")


if __name__ == "__main__":
    uji()
