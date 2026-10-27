"""GSMaP per jam (JAXA) untuk jendela kejadian J1 (puncak laporan PetaBencana +-3 hari) di kotak Jakarta.

Server: FTP hokusai.eorc.jaxa.jp (login terdaftar; anonim hanya melihat /pub). Secret GSMAP_USER dan GSMAP_PASS
(GitHub Actions; tidak ada lokal, tidak pernah dicetak). Tanpa keduanya skrip melewati dengan pesan, keluar 0.
Struktur direktori (FAQ Q18 sharaku.eorc.jaxa.jp/GSMaP: /standard/v8/doc, /realtime_ver/v8/doc; nama berkas dari praktik
pengguna GSMaP, BELUM terverifikasi dengan login di mesin ini): per hari .../YYYY/MM/DD/ berkas *.YYYYMMDD.HHMM.*dat.gz.
Prioritas produk (hari pertama yang berisi berkas menang, produk dicatat per jam):
  gauge v8 (/standard/v8/hourly_G), standard MVK v8 (/standard/v8/hourly), NRT gauge (/realtime_ver/v8/hourly_G), NRT.
Nama berkas ditemukan dari NLST, bukan ditebak. Jam berkas = UTC (rata-rata laju hujan jam itu, mm/jam = mm).
Biner: float32 little-endian, 3600 kolom x 1200 baris, 0,1 derajat, baris pertama = lintang 59,95 U (utara ke selatan),
kolom pertama = bujur 0,05 T (0 sampai 360). Nilai < 0 = hilang. Konstanta ini dari panduan format (DataFormatDescription,
berkas di balik login): periksa `grid` di keluaran pada jalan pertama bersama ERA5 (hujan_jam.json) sebelum dipakai.
Sel = pusat sel dalam KOTAK +-0,05 derajat (sel 0,1 derajat tumpang tindih kotak). Atribusi: "GSMaP data by JAXA".
Keluaran: data/raw/banjir/genangan/gsmap/<kejadian>.json (per jam per sel) dan
public/banjir/data/genangan/gsmap.json (ringkasan seperti hujan_jam.json, kunci model "gsmap").

MODE MUSIM (sumber hujan M0, 27 Okt 2026): GSMaP HARIAN 0,1 derajat, gauge v8, Nov-Apr, digabung ke
data/banjir/genangan/gsmap_harian.json (dilacak git). Pakai:
  gsmap.py uji                                   self-check tanpa jaringan/kunci
  gsmap.py musim --dari YYYY-MM --sampai YYYY-MM panen hari yang belum ada (resumable); kode 0 = ada kemajuan atau tak ada
                                                 yang perlu dipanen, 1 = tak ada kemajuan, 2 = kunci/login gagal
  gsmap.py jam                                   mode lama: per jam untuk jendela kejadian J1
Jalur produk harian ditemukan lewat NLST di bawah /standard/v8 (nama direktori mengandung "daily"; akhiran _G atau
"gauge" = gauge-adjusted), BELUM terverifikasi dengan login. Satuan berkas harian diasumsikan RATA-RATA mm/jam
(panduan GSMaP) sehingga dikali SKALA_HARIAN=24 jadi mm/hari; PERIKSA pada jalan pertama (ringkasan dicetak). Jendela
hari: berkas harian GSMaP bertanggal UTC (00Z-23Z), label kita hari WIB (17Z-16Z): ada pergeseran 7 jam yang tidak
dikoreksi (menjumlah 24 berkas per jam per hari ~26 ribu berkas, tidak sebanding); jendela dari nama berkas dicatat di meta.
Hari musim ditambah margin 7 hari sebelum dan 1 hari sesudah musim (fitur a7 dan d+1 di pemicu.py butuh itu).
"""
import datetime as dt, ftplib, gzip, io, json, os, re, struct, sys, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from bersama import AKAR, MENTAH, RINGKAS, WIB, baca, hari, simpan

HOST = "hokusai.eorc.jaxa.jp"
PRODUK = [("gauge_v8", "/standard/v8/hourly_G"), ("standard_v8", "/standard/v8/hourly"),
          ("nrt_gauge_v8", "/realtime_ver/v8/hourly_G"), ("nrt_v8", "/realtime_ver/v8/hourly")]
NX, NY, D, LON0, LAT0 = 3600, 1200, 0.1, 0.05, 59.95
KOTAK = (106.6, -6.4, 107.0, -6.1)  # sama dengan hujan_jam.py (lon_min, lat_min, lon_maks, lat_maks)
# Hari puncak laporan PetaBencana DKI per tahun (terbanyak, WIB; dihitung 27 Okt 2026 dari petabencana_laporan.json)
# + 2020-01-01 (kejadian J2 uji mesin). Jendela = puncak +-3 hari.
PUNCAK = {"2017-02": "2017-02-21", "2018-02": "2018-02-15", "2020-01": "2020-01-01", "2020-02": "2020-02-25",
          "2021-02": "2021-02-20", "2022-04": "2022-04-26", "2023-05": "2023-05-07", "2024-08": "2024-08-18",
          "2025-04": "2025-04-24"}


def indeks_sel(kotak=KOTAK, tepi=D / 2):
    """Kolom dan baris yang pusatnya dalam kotak +-tepi: ([(i, lon)], [(j, lat)])."""
    lo0, la0, lo1, la1 = kotak
    ci = [(i, round(LON0 + i * D, 3)) for i in range(NX) if lo0 - tepi - 1e-9 <= LON0 + i * D <= lo1 + tepi + 1e-9]
    cj = [(j, round(LAT0 - j * D, 3)) for j in range(NY) if la0 - tepi - 1e-9 <= LAT0 - j * D <= la1 + tepi + 1e-9]
    return ci, cj


DASAR_HARIAN = "/standard/v8"
KOTAK_HARIAN = (106.4, -6.5, 107.1, -5.5)  # 44 kecamatan DKI daratan + Kepulauan Seribu (utara sampai -5.6)
SKALA_HARIAN = 24.0                        # rata-rata mm/jam -> mm/hari; BELUM terverifikasi (lihat docstring)
MUSIM = {11, 12, 1, 2, 3, 4}
BATAS_BYTE = 40_000_000                    # satu berkas harian ~ratusan KB sampai beberapa MB; di atas ini dibuang
KELUAR_HARIAN = os.path.join(AKAR, "data/banjir/genangan/gsmap_harian.json")


def baca_biner(isi_gz, ci, cj, skala=1.0):
    """.dat.gz -> larik per sel (urutan baris lalu kolom), mm/jam x skala; hilang (<0 atau bukan angka) = None."""
    b = gzip.decompress(isi_gz)
    assert len(b) == NX * NY * 4, f"ukuran {len(b)} bukan {NX * NY * 4} (3600x1200 float32)"
    out = []
    for j, _ in cj:
        baris = struct.unpack_from(f"<{NX}f", b, j * NX * 4)
        out += [None if (v < 0 or v != v) else round(v * skala, 3 if skala == 1 else 1) for v in (baris[i] for i, _ in ci)]
    return out


def cocok(nama, tgl, jam):
    return f".{tgl:%Y%m%d}.{jam:02d}00." in nama and nama.endswith(".dat.gz")


def sambung(user, sandi):
    try:
        f = ftplib.FTP_TLS(HOST, timeout=60)
        f.login(user, sandi)
        f.prot_p()
        return f
    except Exception:  # server tanpa TLS: FTP polos (sandi lewat jaringan tanpa enkripsi; tak ada pilihan lain di server ini)
        f = ftplib.FTP(HOST, timeout=60)
        f.login(user, sandi)
        return f


def berkas_hari(f, tgl):
    """(produk, folder, {jam: nama}) dari produk pertama yang berisi berkas hari itu."""
    for nama, dasar in PRODUK:
        folder = f"{dasar}/{tgl:%Y/%m/%d}"
        try:
            ada = f.nlst(folder)
        except ftplib.error_perm:
            continue
        per_jam = {h: n for h in range(24) for n in ada if cocok(os.path.basename(n), tgl, h)}
        if per_jam:
            return nama, folder, per_jam
    return None, None, {}


def unduh(f, jalur):
    buf = io.BytesIO()
    f.retrbinary("RETR " + jalur, buf.write)
    return buf.getvalue()


# ------------------------------------------------------------------ harian (sumber hujan M0)
def hari_musim(a, b):
    """Tanggal a..b (date) di bulan Nov-Apr, ditambah margin 7 hari sebelum dan 1 hari sesudah di luar musim."""
    inti = {a + dt.timedelta(i) for i in range((b - a).days + 1) if (a + dt.timedelta(i)).month in MUSIM}
    ekstra = {x for d in inti for o in range(-7, 2) for x in [d + dt.timedelta(o)] if x.month not in MUSIM}
    return sorted(inti | ekstra)


def pilih_direktori(nama):
    """Nama isi /standard/v8 (hasil NLST) -> [(produk, jalur)] gauge dulu, lalu standar tanpa gauge. Tanpa daftar: tebakan terakhir."""
    ada = {os.path.basename(n.rstrip("/")) for n in nama}
    d = sorted(n for n in ada if "daily" in n.lower())
    g = [n for n in d if n.lower().endswith("_g") or "gauge" in n.lower()]
    p = [n for n in d if n not in g]
    if not d:
        g, p = ["daily_G"], ["daily"]
    return ([("gauge_v8", f"{DASAR_HARIAN}/{g[0]}")] if g else []) + ([("standard_v8", f"{DASAR_HARIAN}/{p[0]}")] if p else [])


def cocok_harian(nama, tgl):
    """Berkas harian bertanggal tgl: memuat .YYYYMMDD., berakhir .dat.gz, BUKAN berkas per jam (.YYYYMMDD.HH00.)."""
    ymd = f"{tgl:%Y%m%d}"
    return f".{ymd}." in nama and nama.endswith(".dat.gz") and not re.search(ymd + r"\.\d{4}\.", nama)


def isi_folder(f, folder, cache):
    """NLST bercache; folder tak ada dibalas JAXA dengan 450 (error_temp) atau 550 (error_perm): keduanya = kosong."""
    if folder not in cache:
        try:
            cache[folder] = [os.path.basename(n.rstrip("/")) for n in f.nlst(folder)]
        except (ftplib.error_perm, ftplib.error_temp):
            cache[folder] = []
    return cache[folder]


def cari_harian(f, folder, tgl, cache, kedalaman=3):
    """Jelajah susunan folder yang belum diketahui (diverifikasi 27 Okt: bukan YYYY/MM/DD). Hanya masuk ke anak yang
    cocok dengan tanggal ini (YYYY, MM, DD, YYYYMM, YYYYMMDD) atau anak tanpa pola tanggal (mis. 00Z-23Z), jadi tidak
    pernah menyapu folder tanggal lain. -> daftar jalur berkas harian tgl."""
    isi = isi_folder(f, folder, cache)
    c = [f"{folder}/{n}" for n in isi if cocok_harian(n, tgl)]
    if c or kedalaman == 0:
        return c
    cocok_tgl = {f"{tgl:%Y}", f"{tgl:%m}", f"{tgl:%d}", f"{tgl:%Y%m}", f"{tgl:%Y%m%d}"}
    anak = [n for n in isi if n in cocok_tgl] + sorted((n for n in isi if "." not in n and not re.fullmatch(r"\d+", n)),
                                                      key=lambda n: ("00Z-23Z" not in n, n))
    for n in anak:
        c = cari_harian(f, f"{folder}/{n}", tgl, cache, kedalaman - 1)
        if c:
            return c
    return []


def berkas_tanggal(f, produk, tgl, cache):
    """-> (nama_produk, jalur, jendela) dari produk pertama yang punya berkas harian tgl."""
    for nama, dasar in produk:
        c = sorted(cari_harian(f, dasar, tgl, cache))
        if c:
            c.sort(key=lambda n: ("0000_2300" not in n and "0000_2359" not in n and "00Z-23Z" not in n, n))
            m = re.search(r"(\d{2}Z-\d{2}Z|\d{4}_\d{4})", c[0])
            return nama, c[0], (m.group(1).replace("_", "-") if m else "tanpa")
    if not berkas_tanggal.dicetak:   # sekali per run: susunan folder nyata untuk log Actions bila tak ada yang cocok
        berkas_tanggal.dicetak = True
        for _, dasar in produk:
            print(f"  susunan {dasar}: {cache.get(dasar, [])[:30]}", file=sys.stderr)
    return None, None, None


berkas_tanggal.dicetak = False


def unduh_batas(f, jalur, batas=BATAS_BYTE):
    buf = bytearray()

    def tulis(b):
        buf.extend(b)
        if len(buf) > batas:
            raise ValueError(f"berkas melebihi {batas} byte")
    f.retrbinary("RETR " + jalur, tulis)
    return bytes(buf)


def panen(f, tanggal, data, ci, cj, baru, simpan_fn, tiap=25):
    """Panen hari di `tanggal` yang belum ada di data["hari"]. Satu hari gagal dicatat di data["gagal"], tidak menghentikan.
    `baru()` menyambung ulang FTP. -> jumlah hari baru."""
    cache, n = {}, 0
    try:
        daftar = f.nlst(DASAR_HARIAN)
    except ftplib.error_perm:
        daftar = []
    produk = pilih_direktori(daftar)
    print("  produk harian:", produk, file=sys.stderr)
    for k, tgl in enumerate([d for d in tanggal if d.isoformat() not in data["hari"]]):
        iso, alasan = tgl.isoformat(), None
        for coba in range(3):
            try:
                nama, jalur, jend = berkas_tanggal(f, produk, tgl, cache)
                if not jalur:
                    alasan = "tidak ada berkas harian di produk mana pun"
                    break
                data["hari"][iso] = baca_biner(unduh_batas(f, jalur), ci, cj, SKALA_HARIAN)
                data["produk"][iso] = nama
                data["meta"]["jendela_utc"] = sorted(set(data["meta"].get("jendela_utc", [])) | {jend})
                data["gagal"].pop(iso, None)
                n += 1
                break
            except (ValueError, AssertionError) as e:
                alasan = f"{type(e).__name__}: {e}"
                break
            except ftplib.all_errors + (EOFError,) as e:
                alasan = f"{type(e).__name__}: {e}"
                print(f"  ulang {iso}: {alasan}", file=sys.stderr)
                time.sleep(2 * (coba + 1))
                f = baru()
        if iso not in data["hari"]:
            data["gagal"][iso] = alasan
        if (k + 1) % tiap == 0:
            simpan_fn(data)
            print(f"  {k + 1} hari diproses, {n} baru", file=sys.stderr)
    simpan_fn(data)
    return n


def ringkasan_harian(data):
    v = [x for h in data["hari"].values() for x in h if x is not None]
    basah = [x for x in v if x >= 1]
    return (f"{len(data['hari'])} hari, gagal {len(data['gagal'])}, produk {sorted(set(data['produk'].values()))}, "
            f"jendela {data['meta'].get('jendela_utc')}; mm/hari sel: maks {max(v, default=0)}, rata-rata hari basah "
            f"{round(sum(basah) / len(basah), 1) if basah else None} (periksa: maks harian Jakarta wajar < ~400, rata-rata basah ~8-20)")


def musim(dari, sampai):
    a = dt.date(int(dari[:4]), int(dari[5:7]), 1)
    y, m = int(sampai[:4]), int(sampai[5:7])
    b = (dt.date(y + (m == 12), m % 12 + 1, 1)) - dt.timedelta(days=1)
    user, sandi = os.environ.get("GSMAP_USER"), os.environ.get("GSMAP_PASS")
    if not user or not sandi:
        print("GSMAP_USER/GSMAP_PASS tidak ada di lingkungan (hanya di GitHub Actions).", file=sys.stderr)
        return 2
    ci, cj = indeks_sel(KOTAK_HARIAN)
    grid = {"lon": [lo for _, lo in ci], "lat": [la for _, la in cj]}
    data = baca(KELUAR_HARIAN) or {"meta": {}, "hari": {}, "produk": {}, "gagal": {}}
    meta = {"sumber": "GSMaP (JAXA) harian 0,1 derajat, gauge-adjusted v8 bila ada. GSMaP data by Japan Aerospace Exploration Agency (JAXA).",
            "versi": "v8", "dasar": DASAR_HARIAN, "satuan": "mm/hari", "skala_dari_mm_per_jam": SKALA_HARIAN,
            "kotak": KOTAK_HARIAN, "grid": grid,
            "urutan": "hari[tanggal][j * len(lon) + i], j = lintang utara ke selatan, i = bujur barat ke timur; null = hilang",
            "hari_label": "tanggal berkas (UTC 00Z-23Z) dipakai apa adanya sebagai hari WIB; geser 7 jam tidak dikoreksi"}
    if data["meta"].get("grid") and data["meta"]["grid"] != grid:
        sys.exit("grid berkas lama beda dengan kotak sekarang; tolak menggabung")
    data["meta"] = {**data["meta"], **meta}
    tanggal = hari_musim(a, b)
    perlu = [d for d in tanggal if d.isoformat() not in data["hari"]]
    print(f"{len(tanggal)} hari musim+margin dalam rentang, {len(perlu)} belum ada", file=sys.stderr)
    if not perlu:
        print(ringkasan_harian(data))
        return 0
    try:
        f = sambung(user, sandi)
    except ftplib.error_perm as e:
        print("login GSMaP gagal:", e, file=sys.stderr)
        return 2

    def baru():
        try:
            return sambung(user, sandi)
        except ftplib.error_perm as e:
            print("login ulang GSMaP gagal:", e, file=sys.stderr)
            raise SystemExit(2)
    n = panen(f, tanggal, data, ci, cj, baru, lambda d: simpan(KELUAR_HARIAN, d))
    print(ringkasan_harian(data), "| baru", n)
    return 0 if n else 1


def muat_harian(berkas=KELUAR_HARIAN):
    """-> (data, None) atau (None, pesan). Hanya membaca; tanpa jaringan."""
    d = baca(berkas)
    return (d, None) if d and d.get("hari") else (None, f"{berkas} belum ada atau kosong: jalankan gsmap.py musim di Actions (gsmap_musim.yml)")


def ringkas(mm, n):
    v = [x or 0 for x in mm]
    return round(max((sum(v[i:i + n]) for i in range(max(1, len(v) - n + 1))), default=0), 1)


def jalankan():
    user, sandi = os.environ.get("GSMAP_USER"), os.environ.get("GSMAP_PASS")
    if not user or not sandi:
        print("GSMaP dilewati: GSMAP_USER/GSMAP_PASS tidak ada di lingkungan (hanya di GitHub Actions).")
        return
    ci, cj = indeks_sel()
    sel = [(la, lo) for _, la in cj for _, lo in ci]
    f = sambung(user, sandi)
    ring = {}
    for ev, puncak in PUNCAK.items():
        a, b = hari(puncak) - dt.timedelta(days=3), hari(puncak) + dt.timedelta(days=3)
        jalur = os.path.join(MENTAH, "gsmap", f"{ev}.json")
        data = baca(jalur, {"waktu": [], "mm": [], "produk": []})
        sudah = set(data["waktu"])
        t = dt.datetime.combine(a, dt.time(0), dt.timezone.utc)
        while t < dt.datetime.combine(b + dt.timedelta(days=1), dt.time(0), dt.timezone.utc):
            if t.hour == 0:
                try:
                    produk, folder, per_jam = berkas_hari(f, t.date())
                except ftplib.all_errors + (OSError,):
                    f = sambung(user, sandi)
                    produk, folder, per_jam = berkas_hari(f, t.date())
            iso = t.strftime("%Y-%m-%dT%H:00Z")
            if iso not in sudah and per_jam.get(t.hour):
                for coba in range(3):
                    try:
                        data["mm"].append(baca_biner(unduh(f, per_jam[t.hour]), ci, cj))
                        data["waktu"].append(iso)
                        data["produk"].append(produk)
                        break
                    except ftplib.all_errors + (OSError,) as e:
                        print(f"  ulang {iso}: {type(e).__name__}", file=sys.stderr)
                        time.sleep(5 * (coba + 1))
                        f = sambung(user, sandi)
            t += dt.timedelta(hours=1)
        data.update(sel=[{"lat": la, "lon": lo} for la, lo in sel], puncak=puncak, jendela=[a.isoformat(), b.isoformat()])
        simpan(jalur, data)
        seri = list(zip(*data["mm"])) if data["mm"] else []
        ring[ev] = {"jendela": data["jendela"], "puncak": puncak, "jam": len(data["waktu"]), "produk": sorted(set(data["produk"])),
                    "gsmap": [{**s, "maks_1j": ringkas(x, 1), "maks_3j": ringkas(x, 3), "maks_24j": ringkas(x, 24),
                               "total_mm": round(sum(v or 0 for v in x), 1), "jam_kosong": sum(v is None for v in x)}
                              for s, x in zip(data["sel"], seri)]}
        print(ev, len(data["waktu"]), "jam", ring[ev]["produk"])
    try:
        f.quit()
    except Exception:
        pass
    simpan(os.path.join(RINGKAS, "gsmap.json"), {
        "dibuat": dt.datetime.now(WIB).isoformat(timespec="minutes"),
        "sumber": "GSMaP (JAXA), hujan per jam, gauge-adjusted bila ada. GSMaP data by Japan Aerospace Exploration Agency (JAXA).",
        "grid": {"kolom": NX, "baris": NY, "d": D, "lon0": LON0, "lat0_utara": LAT0, "kotak": KOTAK}, "kejadian": ring})


def uji():
    ci, cj = indeks_sel()
    assert [lo for _, lo in ci] == [106.55, 106.65, 106.75, 106.85, 106.95, 107.05], ci
    assert [la for _, la in cj] == [-6.05, -6.15, -6.25, -6.35, -6.45] and cj[0][0] == 660, cj
    v = [0.0] * (NX * NY)
    v[cj[1][0] * NX + ci[2][0]] = 12.5      # lat -6.15, lon 106.75
    v[cj[0][0] * NX + ci[0][0]] = -99.9     # hilang
    v[(cj[0][0] - 1) * NX + ci[0][0]] = 99  # di luar kotak: tak boleh ikut
    gz = gzip.compress(struct.pack(f"<{NX * NY}f", *v))
    o = baca_biner(gz, ci, cj)
    assert len(o) == 30 and o[0] is None and o[1 * 6 + 2] == 12.5 and sum(x for x in o if x) == 12.5, o
    try:
        baca_biner(gzip.compress(b"\0" * 8), ci, cj)
        raise SystemExit("ukuran salah harus ditolak")
    except AssertionError:
        pass
    assert cocok("gsmap_gauge.20200101.0300.v8.0000.0.dat.gz", dt.date(2020, 1, 1), 3)
    assert not cocok("gsmap_gauge.20200101.0300.v8.0000.0.dat.gz", dt.date(2020, 1, 1), 4)
    assert not cocok("gsmap_gauge.20200101.0300.v8.0000.0.dat", dt.date(2020, 1, 1), 3)
    assert ringkas([0, 5, 6, 0, 1], 3) == 11
    assert hari(PUNCAK["2020-01"]) == dt.date(2020, 1, 1)
    uji_harian()
    print("ok")


class FtpPalsu:
    """Server palsu: {folder: [jalur]} dan {jalur: bytes}; jalur yang ada di `rusak` melempar kesalahan sementara."""
    def __init__(self, daftar, isi, rusak=()):
        self.daftar, self.isi, self.rusak = daftar, isi, set(rusak)

    def nlst(self, folder):
        if folder not in self.daftar:
            raise ftplib.error_perm("550 tidak ada")
        return self.daftar[folder]

    def retrbinary(self, perintah, cb):
        j = perintah[5:]
        if j in self.rusak:
            raise ftplib.error_temp("421 putus")
        cb(self.isi[j])


def uji_harian():
    h = hari_musim(dt.date(2017, 1, 1), dt.date(2017, 4, 30))
    assert h[0] == dt.date(2017, 1, 1) and h[-1] == dt.date(2017, 5, 1) and len(h) == 120 + 1, (h[0], h[-1], len(h))
    assert dt.date(2017, 6, 1) not in h and len(hari_musim(dt.date(2017, 6, 1), dt.date(2017, 9, 30))) == 0
    assert hari_musim(dt.date(2016, 11, 1), dt.date(2016, 11, 30))[0] == dt.date(2016, 10, 25)
    ci, cj = indeks_sel(KOTAK_HARIAN)
    assert 5 <= len(ci) <= 10 and 9 <= len(cj) <= 14 and min(la for _, la in cj) <= -6.45 and max(la for _, la in cj) >= -5.55
    # direktori: gauge dulu, tanpa daftar memakai tebakan
    assert pilih_direktori(["/standard/v8/daily", "/standard/v8/daily_G", "/standard/v8/hourly"]) == \
        [("gauge_v8", "/standard/v8/daily_G"), ("standard_v8", "/standard/v8/daily")]
    assert pilih_direktori(["/standard/v8/hourly"]) == [("gauge_v8", "/standard/v8/daily_G"), ("standard_v8", "/standard/v8/daily")]
    assert pilih_direktori(["daily"]) == [("standard_v8", "/standard/v8/daily")]
    t = dt.date(2020, 1, 1)
    assert cocok_harian("gsmap_gauge.20200101.0000_2300.v8.0000.0.dat.gz", t) and cocok_harian("gsmap_gauge.20200101.dat.gz", t)
    assert not cocok_harian("gsmap_gauge.20200101.0300.v8.0000.0.dat.gz", t) and not cocok_harian("gsmap_gauge.20200102.dat.gz", t)
    # panen: 3 hari, satu rusak permanen, satu tanpa berkas; hari yang sudah ada dilewati; gagal tidak menghentikan
    def gz(v):
        a = [0.0] * (NX * NY)
        a[cj[1][0] * NX + ci[2][0]] = v
        return gzip.compress(struct.pack(f"<{NX * NY}f", *a))
    d1, d2, d3, d4 = (dt.date(2017, 1, i) for i in (1, 2, 3, 4))
    daftar = {"/standard/v8": ["/standard/v8/daily_G"],
              "/standard/v8/daily_G": ["2016", "2017"], "/standard/v8/daily_G/2017": ["01", "02"],
              "/standard/v8/daily_G/2017/01/01": ["/standard/v8/daily_G/2017/01/01/gsmap_gauge.20170101.0000_2300.v8.dat.gz"],
              "/standard/v8/daily_G/2017/01": ["01", "/standard/v8/daily_G/2017/01/gsmap_gauge.20170102.dat.gz",
                                               "/standard/v8/daily_G/2017/01/gsmap_gauge.20170103.dat.gz"]}
    isi = {"/standard/v8/daily_G/2017/01/01/gsmap_gauge.20170101.0000_2300.v8.dat.gz": gz(1.0),
           "/standard/v8/daily_G/2017/01/gsmap_gauge.20170102.dat.gz": gz(0.5),
           "/standard/v8/daily_G/2017/01/gsmap_gauge.20170103.dat.gz": gz(2.0)}
    rusak = ["/standard/v8/daily_G/2017/01/gsmap_gauge.20170103.dat.gz"]
    f = FtpPalsu(daftar, isi, rusak)
    data = {"meta": {}, "hari": {"2017-01-02": ["lama"]}, "produk": {}, "gagal": {}}
    tersimpan = []
    time_sleep, globals()["time"].sleep = time.sleep, lambda s: None
    try:
        n = panen(f, [d1, d2, d3, d4], data, ci, cj, lambda: f, lambda d: tersimpan.append(1))
    finally:
        time.sleep = time_sleep
    assert n == 1 and data["hari"]["2017-01-02"] == ["lama"], (n, data["gagal"])
    class Ftp450(FtpPalsu):
        def nlst(self, folder):
            if folder not in self.daftar:
                raise ftplib.error_temp("450 No such file or directory")
            return self.daftar[folder]
    g = Ftp450({"/x": ["00Z-23Z", "2016"], "/x/00Z-23Z": ["201701", "201702"],
                "/x/00Z-23Z/201701": ["gsmap_gauge.20170105.0.1d.daily.00Z-23Z.v8.0000.0.dat.gz"]}, {})
    assert berkas_tanggal(g, [("gauge_v8", "/x")], dt.date(2017, 1, 5), {}) == \
        ("gauge_v8", "/x/00Z-23Z/201701/gsmap_gauge.20170105.0.1d.daily.00Z-23Z.v8.0000.0.dat.gz", "00Z-23Z")
    assert berkas_tanggal(g, [("gauge_v8", "/x")], dt.date(2017, 1, 6), {}) == (None, None, None)
    assert data["hari"]["2017-01-01"][1 * len(ci) + 2] == 24.0 and data["produk"]["2017-01-01"] == "gauge_v8"
    assert set(data["gagal"]) == {"2017-01-03", "2017-01-04"} and tersimpan and data["meta"]["jendela_utc"] == ["0000-2300"]
    # run kedua: hari 3 pulih, hari 2 tak disentuh
    f.rusak.clear()
    assert panen(f, [d1, d2, d3, d4], data, ci, cj, lambda: f, lambda d: None) == 1 and "2017-01-03" not in data["gagal"]
    assert data["hari"]["2017-01-02"] == ["lama"]
    assert muat_harian("/tidak/ada.json")[0] is None and "belum ada" in muat_harian("/tidak/ada.json")[1]
    # berkas terlalu besar ditolak
    try:
        unduh_batas(FtpPalsu({}, {"x": b"0" * 20}), "x", batas=10)
        raise SystemExit("batas byte harus menolak")
    except ValueError:
        pass


def utama(a):
    if a == ["uji"]:
        return uji()
    if a[:1] == ["musim"]:
        o = dict(zip(a[1::2], a[2::2]))
        if set(o) != {"--dari", "--sampai"}:
            sys.exit("pakai: gsmap.py musim --dari YYYY-MM --sampai YYYY-MM")
        sys.exit(musim(o["--dari"], o["--sampai"]))
    if a == ["jam"]:
        return jalankan()
    sys.exit(__doc__)


if __name__ == "__main__":
    utama(sys.argv[1:])
