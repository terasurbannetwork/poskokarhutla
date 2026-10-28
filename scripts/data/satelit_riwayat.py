"""Riwayat deteksi per satelit setahun + gugus lintasan -> public/data/satelit/riwayat.json (halaman tersembunyi /satelit, kontrak "Data satelit")

Berkas KUMULATIF: dibaca, dilengkapi, ditulis lagi tiap jalan (harus bertahan antarjalan, lihat data.yml). Skema (kunci hari = tanggal WIB):
  {"dibuat": "2026-10-29T14:30Z", "sumber": "...", "mulai": "2026-01-01", "sampai": "2026-10-28",
   "satelit": ["NOAA-20", "NOAA-21", "Terra", "Aqua", "S-NPP"],
   "hari": {"2026-10-27": {"NOAA-20": {"d": 1542, "l": [[95, 170], [654, 142]]}, "Terra": {...},
                           "tiba": {"N20": {"n": 40, "lintasan": 5, "median": 205, "p90": 330, "maks": 610}}}}}
  d = jumlah deteksi (baris FIRMS) satelit itu pada hari WIB itu; l = gugus lintasan [menit sejak 00.00 WIB saat deteksi pertama gugus, jumlah deteksi];
  gugus = deteksi berurutan satu satelit dengan celah <= CELAH_MENIT (45) menit, celah lebih besar membuka gugus baru; sum(jumlah gugus) = d.
  Satelit tanpa deteksi hari itu tidak ditulis. mulai/sampai = hari pertama/terakhir yang ADA di `hari`.

Sumber. FIRMS area API lewat firms_sumber.unduh (SP bila hari di jangkauan arsip standar, selain itu NRT; dipilih dari /api/data_availability, bukan dari umur hari)
untuk VIIRS NOAA-20, NOAA-21, S-NPP dan MODIS (Terra/Aqua dipisah dari kolom `satellite`: "Terra"/"T", "Aqua"/"A"). Semua tingkat keyakinan. Deteksi yang dihitung = SAMA
dengan data titik aplikasi (harian.py, harian30.py, khg_prioritas.py): jatuh di darat Indonesia (wilayah.Wilayah.cari; laut dan negara tetangga dibuang) dan bukan sel
sumber panas tetap industri (titik_palsu.sel_industri; kawah tetap dihitung; matikan dengan env TITIK_PALSU=0 seperti di harian.py). Tidak ada saringan baru. Beda dengan
"lokasi unik" titik_unik.py: d di sini = baris FIRMS, hanya baris identik (lat, lon, waktu, satelit) yang dibuang.
Waktu FIRMS (acq_date/acq_time) = UTC; hari dan menit `l` = WIB (+7). Hari WIB D = UTC D-1 17:00 .. D 17:00, jadi hari UTC D-1 dan D diunduh dan hari D ditulis hanya bila
SEMUA famili wajib sukses untuk keduanya (firms_sumber.penuh); berhentinya S-NPP (FS.SNPP_AKHIR, 1 Nov 2026) ditangani firms_sumber. Hari tanpa satu deteksi pun (total
nol) dianggap unduhan salah (bug SP kosong 2-27 Agu 2026): tidak ditulis, dicoba lagi. Hari yang famili wajibnya tak punya sumber (mis. SP suatu sensor tak menjangkau)
tidak diminta dan dilaporkan; `mulai` ikut mundur ke hari pertama yang bisa dibangun.

Kumulatif. Hari yang belum ada dari --mulai (bawaan 2026-01-01) sampai KEMARIN WIB diisi, ditambah --segarkan (bawaan 3) hari terakhir yang selalu diunduh ulang (NRT bisa
bertambah). Hari lain yang sudah ada tidak disentuh. Urutan: hari terbaru dulu, supaya berkas selalu rapat tanpa lubang antara mulai dan sampai dan layar langsung punya data
mutakhir selagi isi mundur berjalan bertahap. --anggaran N = batas permintaan FIRMS per jalan (bawaan 60; data_availability ikut dihitung). Rencana dihitung SEBELUM
mengunduh dengan logika pemecahan blok yang sama (potong/biaya memanggil unduh() dengan penjawab kosong), jadi anggaran tidak terlampaui kecuali oleh percobaan ulang di dalam
harian.ambil. Hari diunduh dalam potongan <= 5 hari UTC (dihitung dari hari terbaru ke belakang) dan langsung diringkas supaya memori kecil. Penyegaran 3 hari memakan
~4-8 permintaan dulu; sisanya untuk isi mundur (anggaran di bawah ~15 praktis tidak maju). Dua potongan beruntun tanpa satu hari pun sukses menghentikan jalan (kunci/FIRMS
bermasalah; dicoba lagi jalan berikutnya).

Jam tiba. `harian` dari GET https://centurisk97.id/api/satelit/jeda (30 hari WIB terakhir; kunci baru, mungkin belum ada di produksi: diam-diam dilewati) disalin ke
hari[tgl]["tiba"][kode] = {n, lintasan, median, p90, maks} (menit; dari median_menit/p90_menit/maks_menit) hanya untuk hari yang sudah ada di `hari`; sensor yang
kuncinya tak lengkap dibuang. Nilai tiba yang sudah ada tidak hilang bila endpoint mati atau hari itu diunduh ulang.

Kode keluar: 0 normal, juga tanpa FIRMS_MAP_KEY (pesan dicetak, berkas tidak diubah) dan bila tidak ada yang perlu diunduh; 1 bila ada yang perlu diunduh tetapi tidak satu hari
pun berhasil ditulis (data_availability gagal atau semua potongan gagal). Berkas ditulis hanya bila isinya berubah (selain `dibuat`), lewat berkas sementara.

Pakai:  python3 -I scripts/data/satelit_riwayat.py                     jalan harian (data.yml)
        python3 -I scripts/data/satelit_riwayat.py --anggaran 300      isi mundur penuh sekali jalan (249 permintaan per 28 Okt 2026, lihat uji)
        python3 -I scripts/data/satelit_riwayat.py --uji               swa-uji tanpa jaringan
Bendera lain: --mulai YYYY-MM-DD, --segarkan N (jumlah hari terakhir diunduh ulang; besar = bangun ulang), --keluar BERKAS.
"""
import argparse, datetime as dt, io, json, math, os, re, sys, time, urllib.request

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import firms_sumber as FS  # noqa: E402
from firms_sumber import FAMILI, muat_ketersediaan, penuh, sumber_hari, unduh, wajib  # noqa: E402

AKAR = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "../.."))
KELUAR = os.path.join(AKAR, "public/data/satelit/riwayat.json")
UTC = dt.timezone.utc
WIB = dt.timezone(dt.timedelta(hours=7))
BBOX = "94,-11.5,141.5,6.5"          # sama dengan harian.BBOX
MULAI = "2026-01-01"
ANGGARAN = 60                         # permintaan FIRMS per jalan
SEGARKAN = 3                          # hari terakhir yang selalu diunduh ulang
CELAH_MENIT = 45                      # celah antardeteksi yang membuka gugus baru bila LEBIH besar dari ini
POTONG_HARI = 5                       # hari UTC per potongan unduhan (maks area API)
FAM = FAMILI + ("VIIRS_NOAA21",)      # sama dengan harian30.FAM4 / khg_prioritas.FAM4
SATELIT = ("NOAA-20", "NOAA-21", "Terra", "Aqua", "S-NPP")
SAT_FAMILI = {"VIIRS_NOAA20": "NOAA-20", "VIIRS_NOAA21": "NOAA-21", "VIIRS_SNPP": "S-NPP"}
SUMBER = ("NASA FIRMS (arsip SP + NRT), darat Indonesia tanpa sumber panas industri tetap, semua tingkat keyakinan; "
          "jam tiba dari riwayat kedatangan aplikasi")
URL_JEDA = "https://centurisk97.id/api/satelit/jeda"
TIBA_PERCOBAAN, TIBA_TIMEOUT, TIBA_BACA_MAKS = 2, 15, 2_000_000   # kali, dtk, byte
TIBA_KODE = ("N20", "N21", "M", "N")
TIBA_KUNCI = (("n", "n"), ("lintasan", "lintasan"), ("median", "median_menit"), ("p90", "p90_menit"), ("maks", "maks_menit"))   # (kunci berkas, kunci endpoint)
UA = {"User-Agent": "poskokarhutla/1.0"}
TGL = re.compile(r"[0-9]{4}-[0-9]{2}-[0-9]{2}", re.ASCII)
KONTROL = re.compile(r"[\x00-\x1f\x7f-\x9f\u2028\u2029]+")   # pemisah baris/kontrol: menyuntik perintah alur kerja `::` di log Actions


# ---------------------------------------------------------------- deteksi -> gugus
def gugus(menit, celah=CELAH_MENIT):
    """Daftar menit (WIB, 0..1439) -> [[menit pertama gugus, jumlah], ...]; celah antardeteksi berurutan > `celah` membuka gugus baru."""
    out, akhir = [], None
    for m in sorted(menit):
        if out and m - akhir <= celah:
            out[-1][1] += 1
        else:
            out.append([m, 1])
        akhir = m
    return out


def nama_satelit(src, baris):
    """Sumber FIRMS (mis. MODIS_NRT) + baris CSV -> 'NOAA-20' | 'NOAA-21' | 'S-NPP' | 'Terra' | 'Aqua' | None (MODIS dengan kolom satellite tak dikenal)."""
    fam = src.rsplit("_", 1)[0]
    if fam != "MODIS":
        return SAT_FAMILI.get(fam)
    return {"T": "Terra", "A": "Aqua"}.get((baris.get("satellite") or "").strip()[:1].upper())


def kumpul(baris, sasaran, cari, saring, acc, stat):
    """Baris FIRMS [(sumber, dict)] -> menambah acc[tgl WIB][satelit] = [menit WIB, ...] untuk hari di `sasaran` (set 'YYYY-MM-DD').
    Saringan SAMA dengan titik aplikasi: saring(lat, lon) True = sel industri (dibuang), cari(lon, lat) None = laut/luar negeri (dibuang).
    Baris identik (lat, lon, waktu, satelit) dihitung sekali. stat: 'rusak' (baris tak terbaca), 'tak_dikenal' (satelit MODIS tak dikenal)."""
    lihat = set()
    for src, r in baris:
        try:
            lat, lon = round(float(r["latitude"]), 4), round(float(r["longitude"]), 4)
            jam = r["acq_time"].strip().zfill(4)
            t = dt.datetime.fromisoformat(f"{r['acq_date']}T{jam[:2]}:{jam[2:]}:00+00:00").astimezone(WIB)
        except (KeyError, ValueError, AttributeError):
            stat["rusak"] = stat.get("rusak", 0) + 1
            continue
        tgl = t.date().isoformat()
        if tgl not in sasaran:
            continue
        sat = nama_satelit(src, r)
        if sat is None:
            stat["tak_dikenal"] = stat.get("tak_dikenal", 0) + 1
            continue
        k = (lat, lon, t, sat)
        if k in lihat:
            continue
        lihat.add(k)
        if (saring and saring(lat, lon)) or not cari(lon, lat):
            continue
        acc.setdefault(tgl, {}).setdefault(sat, []).append(t.hour * 60 + t.minute)


def rakit_hari(per_sat):
    """{satelit: [menit]} -> {satelit: {"d": n, "l": gugus}} urut SATELIT, hanya yang punya deteksi."""
    return {s: {"d": len(per_sat[s]), "l": gugus(per_sat[s])} for s in SATELIT if per_sat.get(s)}


# ---------------------------------------------------------------- jam tiba (centurisk97.id/api/satelit/jeda)
def baca_tiba(harian):
    """Medan `harian` endpoint -> {tgl: {kode: {n, lintasan, median, p90, maks}}}. Toleran: bukan dict, tanggal bukan YYYY-MM-DD, kode tak dikenal, dan sensor yang
    salah satu dari lima nilainya tak ada/bukan bilangan tak negatif dibuang (tanpa galat). Bilangan pecahan dibulatkan ke menit."""
    out = {}
    if not isinstance(harian, dict):
        return out
    for tgl, per in harian.items():
        if not (tgl_sah(tgl) and isinstance(per, dict)):
            continue
        for kode in TIBA_KODE:
            b, nilai = per.get(kode), {}
            if not isinstance(b, dict):
                continue
            for ke, dari in TIBA_KUNCI:
                x = b.get(dari)
                if isinstance(x, bool) or not isinstance(x, (int, float)) or x != x or x < 0 or x == float("inf"):
                    nilai = None
                    break
                nilai[ke] = int(round(x))
            if nilai:
                out.setdefault(tgl, {})[kode] = nilai
    return out


def tarik_tiba(buka=urllib.request.urlopen, tidur=time.sleep, log=sys.stderr):
    """GET endpoint jeda -> medan `harian` (dict) atau None bila endpoint mati, bukan JSON, atau belum punya kunci itu. Tidak pernah melempar."""
    for i in range(TIBA_PERCOBAAN):
        try:
            with buka(urllib.request.Request(URL_JEDA, headers=UA), timeout=TIBA_TIMEOUT) as r:
                d = json.loads(r.read(TIBA_BACA_MAKS).decode("utf-8"))
            h = d.get("harian") if isinstance(d, dict) else None
            if not isinstance(h, dict):
                print("satelit_riwayat: endpoint jeda belum punya `harian`; jam tiba dilewati", file=log)
                return None
            return h
        except Exception as e:  # noqa: BLE001  jaringan, HTTP, JSON rusak: semuanya "tidak ada"
            if i + 1 < TIBA_PERCOBAAN:
                tidur(3)
            else:
                print(f"satelit_riwayat: jam tiba dilewati ({type(e).__name__})", file=log)
    return None


# ---------------------------------------------------------------- rencana unduhan
def potong(u0, u1):
    """Hari UTC u0..u1 -> [(awal, akhir)] urut naik, tiap potongan <= POTONG_HARI hari, dihitung dari u1 ke belakang (potongan paling lama yang terpotong)."""
    out, akhir = [], u1
    while akhir >= u0:
        awal = max(u0, akhir - dt.timedelta(days=POTONG_HARI - 1))
        out.append((awal, akhir))
        akhir = awal - dt.timedelta(days=1)
    return out[::-1]


def biaya(u0, u1, ket):
    """Jumlah permintaan area FIRMS untuk hari UTC u0..u1: menjalankan unduh() sungguhan (pemecahan blok SP/NRT, S-NPP opsional) dengan penjawab kosong."""
    n = [0]

    def kosong(url):
        n[0] += 1
        return "latitude,longitude\n"
    for a, b in potong(u0, u1):
        unduh(a, b, "K", kosong, "b", ket, log=io.StringIO(), famili=FAM)
    return n[0]


def bisa(d, ket):
    """Hari WIB d bisa dibangun: tiap famili yang wajib untuk hari UTC d-1 dan d punya sumber (SP/NRT) di data_availability."""
    for x in (d - dt.timedelta(days=1), d):
        if any(sumber_hari(f, x, ket) is None for f in wajib(x, ket, FAM)):
            return False
    return True


def muat_terbaru(hari, sisa, ket):
    """hari = daftar date berurutan naik, tanpa lubang -> bagian TERBARU terpanjang yang biayanya <= sisa (kosong bila tak ada yang muat). Biaya tak menurun saat
    hari bertambah di sisi lama (potongan dihitung dari hari terbaru), jadi pencarian biner."""
    lo, hi = 0, len(hari)
    while lo < hi:
        m = (lo + hi + 1) // 2
        b = hari[-m:]
        if biaya(b[0] - dt.timedelta(days=1), b[-1], ket) <= sisa:
            lo = m
        else:
            hi = m - 1
    return hari[len(hari) - lo:]


def ruas(hari):
    """date terurut naik -> ruas hari berurutan, terbaru dulu."""
    out = []
    for d in hari:
        if out and d - out[-1][-1] == dt.timedelta(days=1):
            out[-1].append(d)
        else:
            out.append([d])
    return out[::-1]


# ---------------------------------------------------------------- berkas kumulatif
def satu_baris(x):
    """Teks galat/balasan jaringan jadi satu baris (tanpa newline/CR) sebelum masuk ke pesan `::warning`."""
    return KONTROL.sub(" ", str(x))


def tgl_sah(t):
    """Kunci hari: tanggal kalender YYYY-MM-DD dengan angka ASCII."""
    if not (isinstance(t, str) and TGL.fullmatch(t)):
        return False
    try:
        dt.date.fromisoformat(t)
    except ValueError:
        return False
    return True


def _int(x):
    return isinstance(x, int) and not isinstance(x, bool)


def _angka(x):
    return isinstance(x, (int, float)) and not isinstance(x, bool) and math.isfinite(x) and x >= 0


def isi_sah(per):
    """Skema satu hari dari berkas lama/cache: minimal satu satelit; kunci isi hanya SATELIT atau "tiba"; per satelit tepat {d, l} dengan d int >= 0, l = daftar
    [menit 0..1439, jumlah >= 0] (int) dan d = jumlah gugus; tiba = {kode di TIBA_KODE: tepat lima angka terbatas >= 0}. Selain itu rusak."""
    if not isinstance(per, dict) or not any(k in SATELIT for k in per):
        return False
    for k, v in per.items():
        if k == "tiba":
            if not isinstance(v, dict) or not all(kode in TIBA_KODE and isinstance(b, dict) and set(b) == {ke for ke, _ in TIBA_KUNCI} and all(_angka(x) for x in b.values())
                                                  for kode, b in v.items()):
                return False
        elif k in SATELIT:
            if not (isinstance(v, dict) and set(v) == {"d", "l"} and _int(v["d"]) and v["d"] >= 0 and isinstance(v["l"], list)):
                return False
            jumlah = 0
            for g in v["l"]:
                if not (isinstance(g, list) and len(g) == 2 and _int(g[0]) and _int(g[1]) and 0 <= g[0] < 1440 and g[1] >= 0):
                    return False
                jumlah += g[1]
            if jumlah != v["d"]:
                return False
        else:
            return False
    return True


def baca(jalur, log=None):
    """-> ({tgl: isi hari}, utuh) dari berkas lama (cache Actions bisa basi, rusak, atau diracuni, jadi diperiksa): tak ada -> ({}, True); tak terbaca, bukan objek, atau
    `sumber`/`dibuat` berawalan "FIXTURE" (fixture uji layar, hari karangan) -> ({}, False), seluruh dokumen dibuang; hari dengan kunci bukan tanggal atau isi melanggar
    isi_sah() dibuang satu per satu (hari itu dianggap belum ada: diunduh ulang bila masuk anggaran) -> utuh False. utuh False = berkas di disk perlu ditulis ulang."""
    try:
        with open(jalur, encoding="utf-8") as f:
            doc = json.load(f)
        if not isinstance(doc, dict) or not isinstance(doc["hari"], dict):
            raise TypeError("bukan dokumen riwayat")
        for k in ("sumber", "dibuat"):
            if isinstance(doc.get(k), str) and doc[k].lstrip().upper().startswith("FIXTURE"):
                print(f"::warning title=satelit_riwayat::berkas lama bertanda FIXTURE ({k}); seluruh isinya dibuang, dibangun ulang dari awal", file=log or sys.stderr)
                return {}, False
        h = {t: v for t, v in doc["hari"].items() if tgl_sah(t) and isi_sah(v)}
        if len(h) < len(doc["hari"]):
            print(f"::warning title=satelit_riwayat::{len(doc['hari']) - len(h)} hari di berkas lama melanggar skema dan dibuang (diunduh ulang bila masuk anggaran)", file=log or sys.stderr)
        return h, len(h) == len(doc["hari"])
    except FileNotFoundError:
        return {}, True
    except (OSError, ValueError, KeyError, TypeError, AttributeError, RecursionError) as e:
        print(f"::warning title=satelit_riwayat::berkas lama tidak terbaca ({type(e).__name__}); dibangun ulang dari awal", file=log or sys.stderr)
        return {}, False


def rakit_dokumen(hari, sekarang):
    h = dict(sorted(hari.items()))
    return {"dibuat": sekarang.astimezone(UTC).strftime("%Y-%m-%dT%H:%MZ"), "sumber": SUMBER, "mulai": next(iter(h)), "sampai": next(reversed(h)),
            "satelit": list(SATELIT), "hari": h}


def tulis(jalur, doc):
    os.makedirs(os.path.dirname(jalur), exist_ok=True)
    sementara = jalur + ".tmp"
    try:
        with open(sementara, "w", encoding="utf-8") as f:
            json.dump(doc, f, ensure_ascii=False, separators=(",", ":"))
        os.replace(sementara, jalur)
    finally:
        if os.path.exists(sementara):
            os.remove(sementara)


def sama(a, b):
    """Dua dokumen sama selain `dibuat`."""
    return {k: v for k, v in a.items() if k != "dibuat"} == {k: v for k, v in b.items() if k != "dibuat"}


# ---------------------------------------------------------------- jalan
def perbarui(keluar, kunci, ambil, cari, saring, ambil_tiba, sekarang, anggaran=ANGGARAN, mulai=MULAI, segarkan=SEGARKAN, bbox=BBOX, log=sys.stderr):
    """Satu jalan. cari(lon, lat) -> wilayah|None; saring(lat, lon) -> True bila dibuang (atau None); ambil_tiba() -> medan `harian` atau None (atau ambil_tiba None);
    sekarang = datetime sadar zona. -> kode keluar (0 / 1). Lihat docstring modul."""
    pesan = lambda *a: print("satelit_riwayat:", *a, file=log)
    lama, utuh = baca(keluar, log)
    kemarin = sekarang.astimezone(WIB).date() - dt.timedelta(days=1)
    masa_depan = [t for t in lama if t > kemarin.isoformat()]      # hari yang belum selesai/belum terjadi tidak mungkin sah
    if masa_depan:
        print(f"::warning title=satelit_riwayat::{len(masa_depan)} hari di berkas lama melewati kemarin ({kemarin}) dan dibuang", file=log)
        lama, utuh = {t: v for t, v in lama.items() if t <= kemarin.isoformat()}, False
    hari = {t: dict(v) for t, v in lama.items()}
    d0 = dt.date.fromisoformat(mulai)
    stat, diminta, berhasil, butuh = {}, [0], 0, False

    def cacah(url):
        diminta[0] += "/api/area/" in url
        return ambil(url)

    if kemarin >= d0 and anggaran > 1:
        sisa, ket = anggaran - 1, None                             # 1 permintaan = data_availability
        diminta[0] += 1
        try:
            ket = muat_ketersediaan(kunci, ambil, FAM)
        except Exception as e:  # noqa: BLE001
            print(f"::warning title=satelit_riwayat::data_availability gagal ({satu_baris(FS.sensor_url(type(e).__name__ + ': ' + str(e)))}); hari FIRMS dilewati", file=log)
            butuh = True
        if ket is not None:
            segar = [kemarin - dt.timedelta(days=i) for i in range(min(segarkan, (kemarin - d0).days + 1) - 1, -1, -1)]
            belum = [d0 + dt.timedelta(days=i) for i in range((kemarin - d0).days + 1) if (d0 + dt.timedelta(days=i)).isoformat() not in hari]
            kandidat = sorted(set(segar) | set(belum))
            bisa_hari = [d for d in kandidat if bisa(d, ket)]
            if len(bisa_hari) < len(kandidat):
                tak = [d for d in kandidat if d not in bisa_hari]
                pesan(f"{len(tak)} hari tidak punya sumber FIRMS untuk famili wajib (mis. {tak[0]}); dilewati")
            sasaran, acc, ok_total, gagal_beruntun = [], {}, {}, 0
            for r in ruas(bisa_hari):                              # hari terbaru dulu
                if sisa <= 0 or gagal_beruntun >= 2:
                    break
                ambil_r = muat_terbaru(r, sisa, ket)
                if not ambil_r:
                    break
                butuh = True
                sisa -= biaya(ambil_r[0] - dt.timedelta(days=1), ambil_r[-1], ket)
                tgl_sasaran = {d.isoformat() for d in ambil_r}
                for a, b in potong(ambil_r[0] - dt.timedelta(days=1), ambil_r[-1]):
                    baris, ok = unduh(a, b, kunci, cacah, bbox, ket, log=log, famili=FAM)
                    kumpul(baris, tgl_sasaran, cari, saring, acc, stat)
                    del baris
                    for d, fs in ok.items():
                        ok_total.setdefault(d, set()).update(fs)
                    gagal_beruntun = 0 if ok else gagal_beruntun + 1
                    if gagal_beruntun >= 2:
                        print("::warning title=satelit_riwayat::dua potongan beruntun gagal total; unduhan dihentikan (dicoba lagi jalan berikutnya)", file=log)
                        break
                sasaran += ambil_r
                if len(ambil_r) < len(r):                          # ruas ini tidak muat seluruhnya: anggaran habis
                    break
            kosong = []
            for d in sasaran:
                t = d.isoformat()
                if not penuh(ok_total, d, FAM):
                    continue
                rakit = rakit_hari(acc.get(t, {}))
                if not rakit:
                    kosong.append(t)                               # total nol = unduhan salah, bukan hari sepi
                    continue
                tiba = hari.get(t, {}).get("tiba")
                hari[t] = {**rakit, **({"tiba": tiba} if tiba else {})}
                berhasil += 1
            if kosong:
                print(f"::warning title=satelit_riwayat::{len(kosong)} hari tanpa satu deteksi pun tidak ditulis (mis. {kosong[0]}); dicoba lagi", file=log)
            if stat.get("tak_dikenal"):
                print(f"::warning title=satelit_riwayat::{stat['tak_dikenal']} baris MODIS dengan kolom satellite tak dikenal dibuang", file=log)
            if stat.get("rusak"):
                print(f"::warning title=satelit_riwayat::{stat['rusak']} baris FIRMS tak terbaca dibuang", file=log)

    n_tiba = 0
    for t, per in baca_tiba(ambil_tiba() if ambil_tiba else None).items():
        if t in hari:                                              # hanya hari yang sudah punya deteksi; hari lain menunggu giliran
            hari[t]["tiba"] = per
            n_tiba += 1

    if hari:
        doc = rakit_dokumen(hari, sekarang)
        if utuh and lama and sama(doc, rakit_dokumen(lama, sekarang)):
            pesan(f"tidak ada perubahan ({len(hari)} hari, {doc['mulai']} s.d. {doc['sampai']}); berkas dibiarkan")
        else:
            tulis(keluar, doc)
            pesan(f"{len(hari)} hari ({doc['mulai']} s.d. {doc['sampai']}), +{len(hari) - len(lama)} baru, {berhasil} hari diunduh, tiba {n_tiba} hari, "
                  f"{diminta[0]} permintaan FIRMS, {os.path.getsize(keluar) / 1e3:.0f} KB")
    else:
        pesan("belum ada hari; berkas tidak ditulis" + ("" if utuh else " (berkas lama di disk rusak/dibuang dan TIDAK dibersihkan; dicoba lagi jalan berikutnya)"))
    return 1 if butuh and berhasil == 0 else 0


def kunci_firms(akar=AKAR):
    """FIRMS_MAP_KEY dari env, atau dari <akar>/.env; None bila tak ada."""
    if os.environ.get("FIRMS_MAP_KEY"):
        return os.environ["FIRMS_MAP_KEY"]
    try:
        with open(os.path.join(akar, ".env"), encoding="utf-8") as f:
            for b in f:
                if b.startswith("FIRMS_MAP_KEY="):
                    return b.split("=", 1)[1].strip() or None
    except OSError:
        pass
    return None


def main(argv=None, ambil_kunci=kunci_firms):
    ap = argparse.ArgumentParser(description="Riwayat deteksi per satelit -> public/data/satelit/riwayat.json")
    ap.add_argument("--uji", action="store_true", help="swa-uji tanpa jaringan")
    ap.add_argument("--anggaran", type=int, default=ANGGARAN, help="maks permintaan FIRMS per jalan (bawaan %(default)s)")
    ap.add_argument("--mulai", default=MULAI, help="hari pertama isi mundur (bawaan %(default)s)")
    ap.add_argument("--segarkan", type=int, default=SEGARKAN, help="hari terakhir yang diunduh ulang (bawaan %(default)s)")
    ap.add_argument("--keluar", default=KELUAR, help="berkas keluaran")
    a = ap.parse_args(argv)
    if a.uji:
        uji()
        return 0
    try:
        dt.date.fromisoformat(a.mulai)
    except ValueError:
        ap.error(f"--mulai bukan tanggal YYYY-MM-DD: {a.mulai}")
    if a.anggaran < 1 or a.segarkan < 0:
        ap.error("--anggaran minimal 1 dan --segarkan minimal 0")
    kunci = ambil_kunci()
    if not kunci:
        print("satelit_riwayat: FIRMS_MAP_KEY tidak ada; dilewati, riwayat.json tidak diubah")
        return 0
    import harian, titik_palsu as TP   # noqa: E402  ambil() dengan percobaan ulang + IPv4 dulu, dan saringan yang SAMA dengan titik aplikasi
    from wilayah import Wilayah
    pakai_palsu = os.environ.get("TITIK_PALSU", "1") != "0"
    sel_ind = TP.sel_industri()[0] if pakai_palsu else set()
    if pakai_palsu and not sel_ind:
        print("::warning title=Filter titik palsu mati::public/data/titik_palsu.json tidak ada; titik industri ikut dihitung", file=sys.stderr)
    return perbarui(a.keluar, kunci, lambda u: harian.ambil(u, coba=3), Wilayah().cari, (lambda la, lo: TP.palsu(la, lo, sel_ind)) if sel_ind else None, tarik_tiba,
                    dt.datetime.now(UTC), anggaran=a.anggaran, mulai=a.mulai, segarkan=a.segarkan)


# ---------------------------------------------------------------- swa-uji
D = dt.date.fromisoformat
EP = {"n": 40, "lintasan": 5, "median_menit": 205.4, "p90_menit": 330, "maks_menit": 610}   # satu sensor di `harian` endpoint
EP_BERKAS = {"n": 40, "lintasan": 5, "median": 205, "p90": 330, "maks": 610}
HDR_FIRMS = "latitude,longitude,acq_date,acq_time,satellite,confidence\n"
SEKARANG = dt.datetime(2026, 3, 10, 14, 25, tzinfo=UTC)          # 10 Mar 21.25 WIB -> kemarin = 9 Mar
LAUT = lambda lon, lat: ("62", "K", "X") if lat < 0 else None     # lat >= 0 = laut
PALSU = lambda lat, lon: (round(lat * 100), round(lon * 100)) == (-300, 11300)   # satu sel industri buatan


def ketersediaan(sp_viirs, sp_modis):
    """Teks /api/data_availability buatan: SP sampai sp_* (VIIRS / MODIS), NRT mulai hari sesudahnya sampai akhir 2026, untuk tiap famili FAM."""
    ke = lambda s: (D(s) + dt.timedelta(days=1)).isoformat()
    return "data_id,min_date,max_date\n" + "".join(
        f"{f}_SP,2012-01-01,{sp_modis if f == 'MODIS' else sp_viirs}\n{f}_NRT,{ke(sp_modis if f == 'MODIS' else sp_viirs)},2026-12-31\n" for f in FAM)


def isi_dasar():
    """{(famili, tanggal UTC): [(lat, lon, 'HHMM', kolom satellite)]} untuk 28 Feb..9 Mar. Tiap hari UTC: N20 05.00/05.10/09.00 (WIB 12.00, 12.10, 16.00), NOAA-21 06.00 (WIB 13.00),
    S-NPP 07.00 (WIB 14.00), Terra 03.00 (WIB 10.00), Aqua 04.00 (WIB 11.00). 4 Mar UTC juga memuat N20 16:59 (WIB 23:59 hari yang sama) dan satu deteksi di laut."""
    out, d = {}, D("2026-02-28")
    while d <= D("2026-03-09"):
        t = d.isoformat()
        out[("VIIRS_NOAA20", t)] = [(-2.0, 113.0, "0500", "N20"), (-2.0, 113.001, "0510", "N20"), (-2.0, 113.002, "0900", "N20")]
        out[("VIIRS_NOAA21", t)] = [(-2.1, 113.0, "0600", "N21")]
        out[("VIIRS_SNPP", t)] = [(-2.2, 113.0, "0700", "N")]
        out[("MODIS", t)] = [(-2.3, 113.0, "0300", "Terra"), (-2.4, 113.0, "0400", "Aqua")]
        d += dt.timedelta(days=1)
    out[("VIIRS_NOAA20", "2026-03-04")] += [(-2.0, 113.003, "1659", "N20"), (2.0, 113.0, "0200", "N20")]
    return out


def pabrik(isi, avail_teks=None, gagal=None):
    """Penjawab FIRMS buatan. isi: dict seperti isi_dasar() atau fungsi (famili, tanggal) -> baris. gagal(famili, tanggal) -> None | teks balasan | Exception. -> (ambil, catat)."""
    avail_teks = avail_teks or ketersediaan("2026-03-05", "2026-03-05")
    sumber = isi if callable(isi) else (lambda fam, t: isi.get((fam, t), []))
    catat = {"area": [], "avail": 0}

    def ambil(u):
        if "data_availability" in u:
            catat["avail"] += 1
            return avail_teks
        catat["area"].append(u)
        p = u.split("/")
        src, n, tgl = p[-4], int(p[-2]), D(p[-1])
        fam = src.rsplit("_", 1)[0]
        g = gagal(fam, tgl) if gagal else None
        if isinstance(g, BaseException):
            raise g
        if isinstance(g, str):
            return g
        out = [HDR_FIRMS]
        for i in range(n):
            d = tgl + dt.timedelta(days=i)
            out += [f"{la},{lo},{d},{jam},{sc},n\n" for la, lo, jam, sc in sumber(fam, d.isoformat())]
        return "".join(out)
    return ambil, catat


def jalan(keluar, ambil, tiba=None, now=SEKARANG, mulai="2026-03-01", **kw):
    """perbarui() dengan saringan buatan -> (kode keluar, teks log)."""
    err = io.StringIO()
    kode = perbarui(keluar, "K", ambil, LAUT, PALSU, (lambda: tiba) if tiba is not None else None, now, mulai=mulai, log=err, **kw)
    return kode, err.getvalue()


def uji():
    global_asli = FS._SEKARANG
    FS._SEKARANG = FS.PRA   # hermetis: jam dibekukan sebelum SNPP_AKHIR (sesudahnya VIIRS_SNPP_NRT tak diminta lagi)
    try:
        uji_gugus_dan_kumpul()
        uji_rencana()
        uji_tiba()
        uji_jalan_penuh()
        uji_isi_mundur()
        uji_gagal()
        uji_berkas_lama()
        uji_produksi()
    finally:
        FS._SEKARANG = global_asli
    print("satelit_riwayat: uji lolos")


def uji_gugus_dan_kumpul():
    # gugus: tepat 45 menit tetap satu gugus, 46 membuka gugus baru; urutan masukan tak penting
    assert gugus([100, 110, 150, 196, 197]) == [[100, 3], [196, 2]] and gugus([0, 45, 90, 136]) == [[0, 3], [136, 1]], "celah <= 45 satu gugus, 46 gugus baru"
    assert gugus([300, 100, 346]) == [[100, 1], [300, 1], [346, 1]] and gugus([]) == [] and gugus([5, 5, 5]) == [[5, 3]]
    # satelit: VIIRS dari famili, MODIS dari kolom satellite (nama panjang NRT, huruf tunggal SP)
    assert [nama_satelit(s, {}) for s in ("VIIRS_NOAA20_NRT", "VIIRS_NOAA21_SP", "VIIRS_SNPP_NRT")] == ["NOAA-20", "NOAA-21", "S-NPP"]
    assert [nama_satelit("MODIS_NRT", {"satellite": v}) for v in ("Terra", "Aqua", "T", "A", "X", "")] == ["Terra", "Aqua", "Terra", "Aqua", None, None]

    def b(src, lat, lon, tgl, jam, sat=""):
        return (src, {"latitude": str(lat), "longitude": str(lon), "acq_date": tgl, "acq_time": jam, "satellite": sat})
    N20, acc, st = "VIIRS_NOAA20_NRT", {}, {}
    kumpul([b(N20, -2.0, 113.0, "2026-03-04", "1659"), b(N20, -2.0, 113.0, "2026-03-04", "1700"),        # 4 Mar 23:59 WIB; 5 Mar 00:00 WIB
            b(N20, -2.0, 113.0, "2026-03-04", "1659"),                                                     # duplikat identik: sekali
            b(N20, -2.0, 113.001, "2026-03-04", "1659"),                                                   # lokasi lain, waktu sama: dihitung (d = baris, bukan lokasi unik)
            b(N20, 2.0, 113.0, "2026-03-04", "0500"),                                                      # laut
            b(N20, -3.0, 113.0, "2026-03-04", "0500"),                                                     # sel industri
            b("MODIS_NRT", -2.0, 113.0, "2026-03-04", "0510", "Terra"), b("MODIS_NRT", -2.0, 113.0, "2026-03-04", "0510", "Aqua"),
            b("MODIS_SP", -2.0, 113.2, "2026-03-04", "0510", "T"), b("MODIS_NRT", -2.0, 113.0, "2026-03-04", "0510", "X"),
            b(N20, -2.0, 113.0, "2026-03-04", "5"), b(N20, "x", 113.0, "2026-03-04", "0100"),              # "5" -> 00:05 UTC = 07:05 WIB; lintang rusak
            b(N20, -2.0, 113.0, "2026-03-09", "0100")],                                                    # di luar sasaran
           {"2026-03-04", "2026-03-05"}, LAUT, PALSU, acc, st)
    assert sorted(acc["2026-03-04"]["NOAA-20"]) == [425, 1439, 1439] and acc["2026-03-05"]["NOAA-20"] == [0], acc
    assert acc["2026-03-04"]["Terra"] == [730, 730] and acc["2026-03-04"]["Aqua"] == [730], acc   # "T" dari arsip SP juga Terra
    assert st == {"tak_dikenal": 1, "rusak": 1} and "2026-03-09" not in acc, (st, acc)
    assert rakit_hari(acc["2026-03-04"]) == {"NOAA-20": {"d": 3, "l": [[425, 1], [1439, 2]]}, "Terra": {"d": 2, "l": [[730, 2]]}, "Aqua": {"d": 1, "l": [[730, 1]]}}
    assert list(rakit_hari(acc["2026-03-04"])) == ["NOAA-20", "Terra", "Aqua"] and rakit_hari({}) == {} and rakit_hari({"Aqua": []}) == {}


def uji_rencana():
    p = potong(D("2026-01-01"), D("2026-02-01"))      # 32 hari, dari 1 Feb ke belakang: 6 potongan penuh + 2 hari
    assert p[0] == (D("2026-01-01"), D("2026-01-02")) and p[-1] == (D("2026-01-28"), D("2026-02-01")) and len(p) == 7 and all((b - a).days <= 4 for a, b in p) and all(
        q[0] - r[1] == dt.timedelta(days=1) for r, q in zip(p, p[1:])), p
    assert potong(D("2026-03-05"), D("2026-03-05")) == [(D("2026-03-05"),) * 2] and potong(D("2026-03-05"), D("2026-03-04")) == []
    ket = muat_ketersediaan("K", lambda u: ketersediaan("2026-06-30", "2026-07-31"), FAM)
    # biaya = permintaan nyata unduh(): satu potongan 5 hari NRT = 4 famili; 6 hari = dua potongan; potongan yang memuat batas SP/NRT sensor itu menambah satu
    assert biaya(D("2026-10-23"), D("2026-10-27"), ket) == 4 and biaya(D("2026-10-22"), D("2026-10-27"), ket) == 8 and biaya(D("2026-10-28"), D("2026-10-27"), ket) == 0
    assert biaya(D("2026-06-29"), D("2026-07-03"), ket) == 4 + 3 and biaya(D("2026-07-30"), D("2026-08-03"), ket) == 4 + 1, "batas SP/NRT VIIRS (3 famili) dan MODIS (1)"
    # isi mundur penuh 1 Jan..27 Okt 2026: hari UTC 31 Des..27 Okt = 301 hari = 61 potongan x 4 famili, ditambah potongan yang memuat batas SP/NRT; +1 data_availability
    penuh_biaya = biaya(D("2025-12-31"), D("2026-10-27"), ket)
    assert penuh_biaya == 248, penuh_biaya
    hari = [D("2026-10-27") - dt.timedelta(days=i) for i in range(299, -1, -1)]
    assert muat_terbaru(hari[-6:], 3, ket) == [] and muat_terbaru(hari[-6:], 4, ket) == hari[-4:] and muat_terbaru(hari[-6:], 100, ket) == hari[-6:]
    m = muat_terbaru(hari, 55, ket)
    assert m[-1] == D("2026-10-27") and biaya(m[0] - dt.timedelta(days=1), m[-1], ket) <= 55 and 60 <= len(m) <= 70, (len(m), m[0])
    assert ruas([D("2026-03-01"), D("2026-03-02"), D("2026-03-05"), D("2026-03-09"), D("2026-03-10")]) == [
        [D("2026-03-09"), D("2026-03-10")], [D("2026-03-05")], [D("2026-03-01"), D("2026-03-02")]]
    # bisa(): famili wajib tanpa sumber (SP NOAA-21 tak ada, NRT mulai 6 Mar) -> hari sebelum 7 Mar tak bisa
    ket_c = muat_ketersediaan("K", lambda u: ketersediaan("2026-03-05", "2026-03-05").replace("VIIRS_NOAA21_SP,2012-01-01,2026-03-05\n", ""), FAM)
    assert [bisa(D(f"2026-03-0{i}"), ket_c) for i in (5, 6, 7)] == [False, False, True] and bisa(D("2026-03-05"), ket)


def uji_tiba():
    assert baca_tiba({"2026-10-28": {"N20": EP, "M": EP, "N21": {**EP, "maks_menit": None}, "N": {"n": 3}, "Z": EP}, "bukan": {"N20": EP}, "2026-10-27": []}) == {
        "2026-10-28": {"N20": EP_BERKAS, "M": EP_BERKAS}}, "kunci diganti, pecahan dibulatkan, yang tak lengkap/tak dikenal/tanggal rusak dibuang"
    assert baca_tiba(None) == {} and baca_tiba([]) == {} and baca_tiba({}) == {} and baca_tiba({"2026-10-28": {"N20": {**EP, "n": True}}}) == {}
    assert baca_tiba({"2026-10-28": {"N20": {**EP, "n": -1}}}) == {} and baca_tiba({"2026-10-28": {"N20": {**EP, "p90_menit": "9"}}}) == {}
    assert baca_tiba({"2026-10-28": {"N20": {**EP, "median_menit": float("nan")}}}) == {} and list(baca_tiba({"2026-10-28": {"N20": EP}})["2026-10-28"]["N20"]) == list(EP_BERKAS)

    class Jawab:
        def __init__(self, teks):
            self.teks = teks.encode()

        def __enter__(self):
            return self

        def __exit__(self, *a):
            return False

        def read(self, n=-1):
            return self.teks if n < 0 else self.teks[:n]
    tarik = lambda f: tarik_tiba(f, lambda s: None, io.StringIO())
    log, tidur = io.StringIO(), []
    def mati(req, timeout):
        raise OSError("putus")
    assert tarik_tiba(mati, tidur.append, log) is None and "jam tiba dilewati" in log.getvalue() and tidur == [3], "dua percobaan, tidak melempar"
    assert tarik(lambda req, timeout: Jawab("{rusak")) is None and tarik(lambda req, timeout: Jawab('{"sensor":{}}')) is None and tarik(lambda req, timeout: Jawab("[]")) is None
    assert tarik(lambda req, timeout: Jawab('{"harian":[]}')) is None and tarik(lambda req, timeout: Jawab('{"harian":{"2026-10-28":{}}}')) == {"2026-10-28": {}}


def uji_jalan_penuh():
    import tempfile
    with tempfile.TemporaryDirectory() as tmp:
        f = os.path.join(tmp, "satelit", "riwayat.json")
        ambil, catat = pabrik(isi_dasar())
        kode, err = jalan(f, ambil, anggaran=60)
        assert kode == 0 and os.path.exists(f) and not os.path.exists(f + ".tmp"), (kode, err)
        teks = open(f, encoding="utf-8").read()
        doc = json.loads(teks)
        assert list(doc) == ["dibuat", "sumber", "mulai", "sampai", "satelit", "hari"] and doc["dibuat"] == "2026-03-10T14:25Z" and doc["satelit"] == list(SATELIT)
        assert doc["mulai"] == "2026-03-01" and doc["sampai"] == "2026-03-09" and list(doc["hari"]) == sorted(doc["hari"]) and len(doc["hari"]) == 9
        assert "\n" not in teks and '"NOAA-20":{"d":3,"l":[[720,2],[960,1]]}' in teks, "JSON padat"
        # WIB 4 Mar = UTC 3 Mar 17:00 .. 4 Mar 17:00: N20 05.00/05.10/09.00 UTC pada 4 Mar (WIB 12.00, 12.10, 16.00) + 23.59 WIB; laut dibuang
        h4 = doc["hari"]["2026-03-04"]
        assert h4["NOAA-20"] == {"d": 4, "l": [[720, 2], [960, 1], [1439, 1]]}, h4["NOAA-20"]
        assert h4["NOAA-21"] == {"d": 1, "l": [[780, 1]]} and h4["S-NPP"] == {"d": 1, "l": [[840, 1]]} and h4["Terra"] == {"d": 1, "l": [[600, 1]]} and h4["Aqua"] == {"d": 1, "l": [[660, 1]]}, h4
        assert list(h4) == list(SATELIT[:2]) + ["Terra", "Aqua", "S-NPP"] and doc["hari"]["2026-03-01"]["NOAA-20"] == {"d": 3, "l": [[720, 2], [960, 1]]}
        for t, per in doc["hari"].items():
            for s, v in per.items():
                assert v["d"] == sum(n for _, n in v["l"]) and v["l"] == sorted(v["l"]) and all(0 <= m < 1440 and n > 0 for m, n in v["l"]), (t, s, v)
        ket = muat_ketersediaan("K", lambda u: ketersediaan("2026-03-05", "2026-03-05"), FAM)
        assert len(catat["area"]) == biaya(D("2026-02-28"), D("2026-03-09"), ket) == 12 and catat["avail"] == 1, "rencana = kenyataan"
        assert all(D(u.split("/")[-1]) <= D("2026-03-05") for u in catat["area"] if u.split("/")[-4].endswith("_SP")) and not any(
            u.split("/")[-4].endswith("_NRT") and D(u.split("/")[-1]) < D("2026-03-06") for u in catat["area"]), "sumber menurut jangkauan"
        # jalan ulang: hanya 3 hari terakhir (UTC 6..9 Mar) yang diunduh; hari lama TIDAK disentuh walau sumbernya berubah; hari segar ikut berubah
        isi2 = isi_dasar()
        isi2[("VIIRS_NOAA20", "2026-03-02")].append((-2.0, 113.5, "0501", "N20"))     # hari lama: berubah di sumber, tak boleh terbaca
        isi2[("VIIRS_NOAA20", "2026-03-08")].append((-2.0, 113.5, "0501", "N20"))     # dalam jendela segar
        ambil2, catat2 = pabrik(isi2)
        jalan(f, ambil2, anggaran=60, now=SEKARANG + dt.timedelta(minutes=5))
        d2 = json.load(open(f, encoding="utf-8"))
        assert d2["hari"]["2026-03-02"] == doc["hari"]["2026-03-02"] and d2["hari"]["2026-03-08"]["NOAA-20"]["d"] == doc["hari"]["2026-03-08"]["NOAA-20"]["d"] + 1
        assert len(catat2["area"]) == 4 and {D(u.split("/")[-1]) for u in catat2["area"]} == {D("2026-03-06")} and d2["dibuat"] == "2026-03-10T14:30Z", catat2["area"]
        # isi sama -> berkas dibiarkan (dibuat tidak bergerak)
        kode, err = jalan(f, pabrik(isi2)[0], anggaran=60, now=SEKARANG + dt.timedelta(minutes=20))
        assert json.load(open(f, encoding="utf-8"))["dibuat"] == "2026-03-10T14:30Z" and "tidak ada perubahan" in err, err
        # tiba: hanya hari yang ada, kunci diganti, ditaruh sesudah satelit
        tiba = {"2026-03-08": {"N20": EP, "M": EP, "N21": {"n": 1}}, "2026-03-09": {"N": EP}, "2026-04-01": {"N20": EP}}
        jalan(f, pabrik(isi2)[0], tiba=tiba, anggaran=60, now=SEKARANG + dt.timedelta(minutes=30))
        d3 = json.load(open(f, encoding="utf-8"))
        assert d3["hari"]["2026-03-08"]["tiba"] == {"N20": EP_BERKAS, "M": EP_BERKAS} and list(d3["hari"]["2026-03-08"])[-1] == "tiba", d3["hari"]["2026-03-08"]
        assert d3["hari"]["2026-03-09"]["tiba"] == {"N": EP_BERKAS} and "2026-04-01" not in d3["hari"] and d3["sampai"] == "2026-03-09"
        # endpoint mati / belum punya kunci / bentuk salah tidak menghapus tiba yang ada, juga saat hari itu diunduh ulang (isi3 mengubah 8 dan 9 Mar)
        isi3 = isi_dasar()
        isi3[("VIIRS_NOAA20", "2026-03-09")].append((-2.0, 113.6, "0502", "N20"))
        for tiba2 in (None, {}, [], {"bukan": 1}):
            jalan(f, pabrik(isi3)[0], tiba=tiba2, anggaran=60, now=SEKARANG + dt.timedelta(minutes=40))
            d4 = json.load(open(f, encoding="utf-8"))
            assert d4["hari"]["2026-03-08"]["tiba"] == d3["hari"]["2026-03-08"]["tiba"] and d4["hari"]["2026-03-09"]["tiba"] == d3["hari"]["2026-03-09"]["tiba"], tiba2
        assert d4["hari"]["2026-03-09"]["NOAA-20"]["d"] == d3["hari"]["2026-03-09"]["NOAA-20"]["d"] + 1 and d4["hari"]["2026-03-08"]["NOAA-20"]["d"] == d3["hari"]["2026-03-08"]["NOAA-20"]["d"] - 1


def uji_isi_mundur():
    import tempfile
    isi = isi_dasar()
    with tempfile.TemporaryDirectory() as tmp:
        ref = os.path.join(tmp, "ref.json")
        jalan(ref, pabrik(isi)[0], anggaran=100)
        penuh_doc = json.load(open(ref, encoding="utf-8"))
        # bertahap dengan anggaran kecil: hari terbaru dulu, tanpa lubang, tiap jalan <= anggaran; hasil akhir = satu jalan penuh
        f = os.path.join(tmp, "r.json")
        jumlah, n_jalan = [], 0
        while n_jalan < 20:
            n_jalan += 1
            ambil, catat = pabrik(isi)
            jalan(f, ambil, anggaran=9)
            assert len(catat["area"]) + catat["avail"] <= 9, (len(catat["area"]), catat["avail"])
            d = json.load(open(f, encoding="utf-8"))
            ks = sorted(d["hari"])
            assert ks[-1] == "2026-03-09" and (D(ks[-1]) - D(ks[0])).days + 1 == len(ks), ("lubang", ks)
            jumlah.append(len(ks))
            if len(ks) == 9:
                break
        assert jumlah == sorted(jumlah) and jumlah[0] < 9 and 3 <= n_jalan <= 8 and d["hari"] == penuh_doc["hari"] and d["mulai"] == "2026-03-01", (jumlah, n_jalan)
        # lubang tua di tengah: hanya hari itu (ruas sendiri) yang diminta, bukan seluruh rentang
        del d["hari"]["2026-03-03"]
        json.dump(d, open(f, "w"))
        ambil, catat = pabrik(isi)
        jalan(f, ambil, anggaran=60)
        assert json.load(open(f, encoding="utf-8"))["hari"] == penuh_doc["hari"] and len(catat["area"]) == 4 + 4, len(catat["area"])
        assert {D(u.split("/")[-1]) for u in catat["area"]} == {D("2026-03-02"), D("2026-03-06")}, "lubang 3 Mar (UTC 2-3 Mar, satu potongan) dan penyegaran 7-9 Mar (UTC 6-9 Mar)"
    # hari tanpa sumber (SP NOAA-21 tak ada): tidak diminta, mulai mundur ke hari pertama yang bisa
    with tempfile.TemporaryDirectory() as tmp:
        f = os.path.join(tmp, "r.json")
        ambil, catat = pabrik(isi, ketersediaan("2026-03-05", "2026-03-05").replace("VIIRS_NOAA21_SP,2012-01-01,2026-03-05\n", ""))
        kode, err = jalan(f, ambil, anggaran=60)
        d = json.load(open(f, encoding="utf-8"))
        assert d["mulai"] == "2026-03-07" and d["sampai"] == "2026-03-09" and "tidak punya sumber FIRMS" in err and kode == 0, (d["mulai"], err)
        assert not any(u.split("/")[-4] == "VIIRS_NOAA21_SP" for u in catat["area"])
    # hari tanpa satu deteksi pun = unduhan salah: tidak ditulis; hari lain tetap
    with tempfile.TemporaryDirectory() as tmp:
        f = os.path.join(tmp, "r.json")
        kosong = {k: ([] if k[1] in ("2026-03-07", "2026-03-08") else v) for k, v in isi.items()}   # deteksi WIB 7 dan 8 Mar semuanya berasal dari UTC 7 dan 8 Mar (jam 05-09 UTC)
        kode, err = jalan(f, pabrik(kosong)[0], anggaran=60)
        d = json.load(open(f, encoding="utf-8"))
        assert sorted(set(d["hari"]) ^ {f"2026-03-0{i}" for i in range(1, 10)}) == ["2026-03-07", "2026-03-08"] and "2 hari tanpa satu deteksi pun" in err, (sorted(d["hari"]), err)


def uji_gagal():
    import tempfile
    with tempfile.TemporaryDirectory() as tmp:
        f = os.path.join(tmp, "r.json")
        # tanpa kunci: pesan, kode 0, berkas tidak disentuh, tak ada jaringan; kunci dari env lebih dulu daripada .env
        out = io.StringIO()
        asli = sys.stdout
        sys.stdout = out
        try:
            kode = main(["--keluar", f], ambil_kunci=lambda: None)
        finally:
            sys.stdout = asli
        assert kode == 0 and not os.path.exists(f) and "FIRMS_MAP_KEY tidak ada" in out.getvalue(), out.getvalue()
        env_asli = os.environ.pop("FIRMS_MAP_KEY", None)
        try:
            assert kunci_firms(tmp) is None
            open(os.path.join(tmp, ".env"), "w").write("X=1\nFIRMS_MAP_KEY=dariberkas\n")
            assert kunci_firms(tmp) == "dariberkas"
            os.environ["FIRMS_MAP_KEY"] = "darienv"
            assert kunci_firms(tmp) == "darienv"
        finally:
            os.environ.pop("FIRMS_MAP_KEY", None)
            if env_asli is not None:
                os.environ["FIRMS_MAP_KEY"] = env_asli
        isi = isi_dasar()
        # FIRMS mati total / balasan bukan CSV (kunci salah): kode 1, tanpa berkas, berhenti sesudah dua potongan beruntun
        for gagal in (lambda fam, tgl: RuntimeError("HTTP 500"), lambda fam, tgl: "Invalid MAP_KEY."):
            ambil, catat = pabrik(isi, gagal=gagal)
            kode, err = jalan(f, ambil, anggaran=60)
            assert kode == 1 and not os.path.exists(f) and len(catat["area"]) <= 12 and "dua potongan beruntun gagal total" in err, (kode, err, len(catat["area"]))
        ambil, catat = pabrik(isi, avail_teks="Invalid MAP_KEY.")
        kode, err = jalan(f, ambil, anggaran=60)
        assert kode == 1 and not os.path.exists(f) and catat["area"] == [] and "data_availability gagal" in err
        # satu famili gagal di semua hari: tak ada hari penuh -> tidak ditulis (bukan ditulis tanpa sensor itu)
        ambil, catat = pabrik(isi, gagal=lambda fam, tgl: RuntimeError("HTTP 500") if fam == "MODIS" else None)
        kode, err = jalan(f, ambil, anggaran=60)
        assert kode == 1 and not os.path.exists(f)
        # berkas lama rusak: dibangun ulang, bukan meledak; berkas yang gagal diperbarui tetap utuh
        open(f, "w").write("{rusak")
        kode, err = jalan(f, pabrik(isi)[0], anggaran=60)
        assert kode == 0 and len(json.load(open(f))["hari"]) == 9 and "tidak terbaca" in err
        sebelum = open(f, "rb").read()
        kode, err = jalan(f, pabrik(isi, gagal=lambda fam, tgl: RuntimeError("HTTP 500"))[0], anggaran=60, now=SEKARANG + dt.timedelta(hours=1))
        assert kode == 1 and open(f, "rb").read() == sebelum, "penyegaran gagal total: berkas tidak berubah"


def uji_berkas_lama():
    """Berkas lama/cache tidak dipercaya: fixture, skema rusak per hari, tanggal bukan ASCII/kalender, hari masa depan. Hari rusak dibuang -> diunduh ulang."""
    import contextlib, copy, tempfile
    # tanggal: ASCII dan kalender sah
    assert [tgl_sah(t) for t in ("2026-03-04", "2026-02-30", "2026-3-4", "2026-03-04\n", "\uff12\uff10\uff12\uff16-03-04", "\u0662\u0660\u0662\u0666-03-04", "20260304", 20260304, None)] == [
        True, False, False, False, False, False, False, False, False], "angka non-ASCII dan tanggal mustahil ditolak"
    assert baca_tiba({"\uff12\uff10\uff12\uff16-03-04": {"N20": EP}, "2026-02-30": {"N20": EP}}) == {}
    assert satu_baris("a\nb\r::c\u2028d\x00e") == "a b ::c d e"
    ok_hari = {"NOAA-20": {"d": 3, "l": [[100, 2], [900, 1]]}, "Terra": {"d": 0, "l": []}, "tiba": {"N20": EP_BERKAS, "M": {**EP_BERKAS, "n": 7.5}}}
    assert isi_sah(ok_hari) and isi_sah({"Aqua": {"d": 1, "l": [[0, 1]]}}) and isi_sah({"Aqua": {"d": 1, "l": [[1439, 1]]}, "tiba": {}})
    nan, tak_hingga = float("nan"), float("inf")
    rusak = {   # nama -> isi satu hari yang harus ditolak
        "bukan dict": [], "kosong": {}, "hanya tiba": {"tiba": {"N20": EP_BERKAS}}, "kunci asing": {"NOAA-20": {"d": 1, "l": [[1, 1]]}, "Bulan": {"d": 1, "l": [[1, 1]]}},
        "d bool": {"NOAA-20": {"d": True, "l": [[1, 1]]}}, "d float": {"NOAA-20": {"d": 1.0, "l": [[1, 1]]}}, "d negatif": {"NOAA-20": {"d": -1, "l": []}},
        "d NaN": {"NOAA-20": {"d": nan, "l": [[1, 1]]}}, "d Infinity": {"NOAA-20": {"d": tak_hingga, "l": []}}, "d teks": {"NOAA-20": {"d": "1", "l": [[1, 1]]}},
        "d tanpa l": {"NOAA-20": {"d": 1}}, "kunci ekstra": {"NOAA-20": {"d": 1, "l": [[1, 1]], "x": 1}}, "satelit bukan dict": {"NOAA-20": [1, [[1, 1]]]},
        "l bukan list": {"NOAA-20": {"d": 1, "l": "x"}}, "gugus 3 unsur": {"NOAA-20": {"d": 1, "l": [[1, 1, 1]]}}, "gugus bukan list": {"NOAA-20": {"d": 1, "l": [5]}},
        "menit 1440": {"NOAA-20": {"d": 1, "l": [[1440, 1]]}}, "menit negatif": {"NOAA-20": {"d": 1, "l": [[-1, 1]]}}, "menit float": {"NOAA-20": {"d": 1, "l": [[1.5, 1]]}},
        "menit bool": {"NOAA-20": {"d": 1, "l": [[True, 1]]}}, "jumlah negatif": {"NOAA-20": {"d": 1, "l": [[1, 2], [5, -1]]}}, "jumlah teks": {"NOAA-20": {"d": 1, "l": [[1, "1"]]}},
        "jumlah != d": {"NOAA-20": {"d": 2, "l": [[1, 1]]}}, "tiba bukan dict": {"NOAA-20": {"d": 1, "l": [[1, 1]]}, "tiba": [1]},
        "tiba kode asing": {"NOAA-20": {"d": 1, "l": [[1, 1]]}, "tiba": {"X": EP_BERKAS}}, "tiba negatif": {"NOAA-20": {"d": 1, "l": [[1, 1]]}, "tiba": {"N20": {**EP_BERKAS, "maks": -1}}},
        "tiba NaN": {"NOAA-20": {"d": 1, "l": [[1, 1]]}, "tiba": {"N20": {**EP_BERKAS, "p90": nan}}}, "tiba Infinity": {"NOAA-20": {"d": 1, "l": [[1, 1]]}, "tiba": {"N20": {**EP_BERKAS, "p90": tak_hingga}}},
        "tiba kurang kunci": {"NOAA-20": {"d": 1, "l": [[1, 1]]}, "tiba": {"N20": {"n": 1}}}, "tiba teks": {"NOAA-20": {"d": 1, "l": [[1, 1]]}, "tiba": {"N20": {**EP_BERKAS, "n": "9"}}},
        "tiba bool": {"NOAA-20": {"d": 1, "l": [[1, 1]]}, "tiba": {"N20": {**EP_BERKAS, "n": True}}}, "tiba kunci ekstra": {"NOAA-20": {"d": 1, "l": [[1, 1]]}, "tiba": {"N20": {**EP_BERKAS, "x": 1}}}}
    assert not any(isi_sah(v) for v in rusak.values()) and [n for n, v in rusak.items() if isi_sah(v)] == []
    isi = isi_dasar()
    senyap = io.StringIO()
    with tempfile.TemporaryDirectory() as tmp:
        ref = os.path.join(tmp, "ref.json")
        jalan(ref, pabrik(isi)[0], tiba={"2026-03-04": {"N20": EP}}, anggaran=100)
        doc = json.load(open(ref, encoding="utf-8"))
        assert doc["hari"]["2026-03-04"]["tiba"] == {"N20": EP_BERKAS}
        with contextlib.redirect_stderr(senyap):
            assert baca(ref) == (doc["hari"], True) and baca(os.path.join(tmp, "tidak-ada.json")) == ({}, True), "berkas sah dibaca utuh"

        def tulis_kotor(d, hari):
            f = os.path.join(tmp, "kotor.json")
            json.dump({**d, "hari": hari}, open(f, "w", encoding="utf-8"))
            return f
        # tiap pelanggaran skema: hari itu dibuang, hari lain utuh, lalu diunduh ulang dan dokumen kembali sama dengan acuan
        for nama, bad in rusak.items():
            h = copy.deepcopy(doc["hari"])
            h["2026-03-05"] = bad
            f = tulis_kotor(doc, h)
            with contextlib.redirect_stderr(senyap):
                bersih, utuh = baca(f)
            assert utuh is False and set(bersih) == set(doc["hari"]) - {"2026-03-05"} and all(bersih[t] == doc["hari"][t] for t in bersih), nama
            kode, err = jalan(f, pabrik(isi)[0], tiba={"2026-03-04": {"N20": EP}}, anggaran=100, now=SEKARANG)
            baru = json.load(open(f, encoding="utf-8"))
            assert kode == 0 and baru["hari"] == doc["hari"] and baru["dibuat"] == doc["dibuat"], (nama, sorted(baru["hari"]))
        # kunci hari rusak: dibuang, hari asli yang hilang diunduh ulang
        for kunci in ("2026-3-5", "2026-02-30", "\uff12\uff10\uff12\uff16-03-05", "2026-03-05\n", "bukan tanggal", ""):
            h = copy.deepcopy(doc["hari"])
            h[kunci] = h.pop("2026-03-05")
            f = tulis_kotor(doc, h)
            with contextlib.redirect_stderr(senyap):
                bersih, utuh = baca(f)
            assert utuh is False and set(bersih) == set(doc["hari"]) - {"2026-03-05"}, repr(kunci)
            jalan(f, pabrik(isi)[0], tiba={"2026-03-04": {"N20": EP}}, anggaran=100)
            assert json.load(open(f, encoding="utf-8"))["hari"] == doc["hari"], repr(kunci)
        # fixture: sumber ATAU dibuat berawalan FIXTURE (huruf besar/kecil, spasi depan) membuang SELURUH dokumen, termasuk hari yang sah skemanya
        sintetis = {(D("2026-01-01") + dt.timedelta(days=i)).isoformat(): {"NOAA-20": {"d": 1, "l": [[0, 1]]}} for i in range(301)}
        for kunci, nilai in (("sumber", "FIXTURE data uji layar"), ("dibuat", "FIXTURE-2026-10-28"), ("sumber", "  fixture sintetis"), ("dibuat", "Fixture")):
            f = tulis_kotor({**doc, kunci: nilai}, {**sintetis, **doc["hari"]})
            err = io.StringIO()
            with contextlib.redirect_stderr(err):
                assert baca(f) == ({}, False)
            assert "FIXTURE" in err.getvalue() and err.getvalue().startswith("::warning"), kunci
            kode, log = jalan(f, pabrik(isi)[0], tiba={"2026-03-04": {"N20": EP}}, anggaran=100)
            baru = json.load(open(f, encoding="utf-8"))
            assert kode == 0 and baru["hari"] == doc["hari"] and baru["sumber"] == SUMBER and "FIXTURE" not in json.dumps(baru) and baru["mulai"] == "2026-03-01", kunci
        # fixture + FIRMS mati: tidak ada yang bisa ditulis; berkas lama dibiarkan tetapi tidak dipakai dan kode 1 (dilaporkan)
        f = tulis_kotor({**doc, "sumber": "FIXTURE"}, sintetis)
        antara = open(f, "rb").read()
        kode, log = jalan(f, pabrik(isi, gagal=lambda fam, tgl: RuntimeError("HTTP 500"))[0], anggaran=100)
        assert kode == 1 and "TIDAK dibersihkan" in log and open(f, "rb").read() == antara
        # hari melewati kemarin (belum selesai/mustahil) dibuang walau skemanya sah
        h = copy.deepcopy(doc["hari"])
        h["2026-03-10"] = h["2026-03-04"]
        h["2026-12-31"] = h["2026-03-04"]
        f = tulis_kotor(doc, h)
        kode, log = jalan(f, pabrik(isi)[0], anggaran=100)
        baru = json.load(open(f, encoding="utf-8"))
        assert baru["hari"] == doc["hari"] and baru["sampai"] == "2026-03-09" and "melewati kemarin" in log, (sorted(baru["hari"]), log)
        # berkas kotor + FIRMS mati: bagian sah tetap, yang kotor TERTULIS BERSIH (bukan dibiarkan karena "tidak ada perubahan")
        h = copy.deepcopy(doc["hari"])
        h["2026-03-05"] = rusak["jumlah != d"]
        f = tulis_kotor(doc, h)
        kode, log = jalan(f, pabrik(isi, gagal=lambda fam, tgl: RuntimeError("HTTP 500"))[0], anggaran=100)
        baru = json.load(open(f, encoding="utf-8"))
        assert kode == 1 and "2026-03-05" not in baru["hari"] and len(baru["hari"]) == 8, (kode, sorted(baru["hari"]))


def uji_produksi():
    """Simulasi isi mundur PENUH produksi (1 Jan s.d. 27 Okt 2026, batas SP VIIRS 30 Jun / MODIS 31 Jul) dengan penjawab yang selalu memberi satu deteksi."""
    import tempfile
    sekarang = dt.datetime(2026, 10, 28, 14, 25, tzinfo=UTC)
    av = ketersediaan("2026-06-30", "2026-07-31")
    sepi = lambda fam, t: [(-2.0, 113.0, "0500", "Terra" if fam == "MODIS" else "x")]
    with tempfile.TemporaryDirectory() as tmp:
        f = os.path.join(tmp, "r.json")
        jalan_ke, total = 0, 0
        while jalan_ke < 12:
            jalan_ke += 1
            ambil, catat = pabrik(sepi, av)
            jalan(f, ambil, mulai="2026-01-01", now=sekarang)          # anggaran bawaan 60
            assert len(catat["area"]) + catat["avail"] <= ANGGARAN
            total += len(catat["area"]) + catat["avail"]
            d = json.load(open(f, encoding="utf-8"))
            if d["mulai"] == "2026-01-01":
                break
        assert d["sampai"] == "2026-10-27" and len(d["hari"]) == 300 and (D(d["sampai"]) - D(d["mulai"])).days + 1 == 300, (d["mulai"], d["sampai"], len(d["hari"]))
        assert jalan_ke == 5, (jalan_ke, total)       # lima jalan harian (60 permintaan, termasuk data_availability dan penyegaran 3 hari) menutup 1 Jan..27 Okt
        # satu jalan --anggaran 300 dari nol: seluruhnya sekali jalan
        f2 = os.path.join(tmp, "r2.json")
        ambil, catat = pabrik(sepi, av)
        jalan(f2, ambil, anggaran=300, mulai="2026-01-01", now=sekarang)
        assert len(json.load(open(f2))["hari"]) == 300 and len(catat["area"]) == 248 and catat["avail"] == 1, (len(catat["area"]), catat["avail"])
        # hari berikutnya, berkas penuh: hanya penyegaran 3 hari (UTC 25..28 Okt, satu potongan x 4 famili)
        ambil, catat = pabrik(sepi, av)
        jalan(f2, ambil, mulai="2026-01-01", now=sekarang + dt.timedelta(days=1))
        assert len(catat["area"]) == 4 and catat["avail"] == 1, len(catat["area"])
    # ukuran: satu hari nyata (5 satelit, ~21 gugus, tiba 4 sensor) x 365 hari jauh di bawah 500 KB
    contoh = {"NOAA-20": {"d": 1542, "l": [[95, 170], [654, 142], [754, 847], [854, 33], [1416, 350]]}, "NOAA-21": {"d": 1400, "l": [[150, 170], [700, 142], [810, 847], [905, 33], [1330, 208]]},
              "Terra": {"d": 52, "l": [[423, 20], [521, 19], [1064, 13]]}, "Aqua": {"d": 60, "l": [[230, 20], [330, 19], [1100, 21]]}, "S-NPP": {"d": 1300, "l": [[60, 170], [700, 142], [800, 847], [900, 141]]},
              "tiba": {k: EP_BERKAS for k in TIBA_KODE}}
    per_hari = len(json.dumps({"2026-10-28": contoh}, separators=(",", ":"))) + 1
    assert per_hari * 365 < 300_000, per_hari   # ~0,2 MB setahun


if __name__ == "__main__":
    sys.exit(main())
