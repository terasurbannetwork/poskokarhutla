"""Elemen orbit (TLE) empat satelit pendeteksi titik panas dari CelesTrak -> public/data/tle.json

Pakai:  python3 scripts/data/tle.py        tarik 4 satelit (satu GET per satelit) + riwayat jeda, tulis public/data/tle.json
        python3 scripts/data/tle.py uji    swa-uji tanpa jaringan (checksum, epoch, bentuk JSON, aturan gagal, aturan jeda)

Layar "Satelit berikutnya melintas pukul ..." menghitung lintasan di peramban (satellite.js). CelesTrak tidak mengirim header
CORS, jadi pipeline yang menyalin. Satelit (urut): NOAA-20, NOAA-21 (VIIRS), Terra, Aqua (MODIS). S-NPP sengaja tidak ada
(produknya berhenti 1 Nov 2026 20.00 WIB).

Kontrak keluaran. Tingkat atas: dibuat, sumber, jeda, satelit. Tiap entri satelit:
  nama, norad, sensor, epoch, tle (elemen orbit);
  setengah_sapuan_km = lebar sapuan sensor / 2 (VIIRS 1520, MODIS 1165);
  jeda_data_menit    = jeda sesudah lintas: median terukur bila terukur, kalau tidak nilai bawaan tabel SATELIT;
  jeda_p90_menit, jeda_n, jeda_kode = persentil 90, jumlah granul, kode sensor FIRMS (N20/N21/M; jeda_n dibaca per kode, Terra dan Aqua
                       berbagi M); HANYA ada bila terukur;
  jeda_sumber        = "terukur" | "bawaan"; selalu ada.
Dua jeda ini BEDA BESARAN. Terukur = sampai tampil di aplikasi: latensi FIRMS + tunggu putaran pengambilan Worker berikutnya (+-3 jam), dari
riwayat kedatangan granul. Bawaan (VIIRS 180, MODIS 120) = latensi FIRMS saja, diukur manual 27 Okt 2026 (VIIRS +-2,5-3 j, MODIS +-1-2 j).
Blok `jeda` (tanggal WIB): hari = (sampai - dari).days + 1, dari, sampai (null bila tak ada satelit terukur), bawaan_diukur, asal
("endpoint" | "lama" | null), dan arti = "tampil_di_aplikasi" (kunci ini ADA hanya bila ada satelit terukur).

Jeda terukur: GET https://centurisk97.id/api/satelit/jeda (riwayat kedatangan granul FIRMS yang dicatat Worker di
tabel D1 satelit_granul). Kode sensor FIRMS tiap satelit: NOAA-20 -> N20, NOAA-21 -> N21, Terra dan Aqua -> M.
Periode jujur: dari = yang lebih akhir antara `dari` endpoint dan tanggal WIB `mulai_catat` (granul sebelum itu tidak dihitung).
Sebuah satelit terukur hanya bila kodenya punya lintasan >= 40 (bila medan `lintasan` ada, kalau tidak n >= 100), hari_ada >= 14,
hari_ada <= n, hari_ada <= hari + 1 (hari = medan endpoint), median 60..720 menit, dan median <= p90 <= 720; selain itu bawaan
(diputuskan per satelit, jadi bisa campuran). Blok siang dan malam dibaca dengan fungsi yang sama (hari_ada dipinjam dari induknya);
bila keduanya terukur dan median keduanya beda lebih dari 90 menit, jeda_p90_menit = terbesar dari p90 gabungan, siang, malam, plus satu
peringatan. Respons endpoint harus segar: `sampai` -1..2 hari dari hari ini (WIB) dan `hari` selisih paling banyak 1 dari
(sampai - dari).days + 1; kalau tidak dianggap gagal. Endpoint gagal (jaringan, HTTP, JSON rusak, bentuk salah, basi): jeda dipakai dari
tle.json lama selama jeda.sampai-nya <= 7 hari, kalau tidak bawaan; SATU peringatan ke stderr, tle.py tidak gagal. Satu-satunya
alasan tle.py gagal tetap elemen orbit. Satu percobaan, timeout 12 dtk (anggaran data.yml, lihat bawah).

Aturan gagal: tiap pasangan baris divalidasi (baris 1 mulai "1 ", baris 2 mulai "2 ", panjang 69, hanya [0-9A-Z .+-], nomor
katalog cocok, checksum mod 10 kedua baris). Tarik: timeout 15 dtk, baca <= 64 KB, 2 percobaan, HTTP 403/404/429 tidak diulang;
anggaran terburuk 4 satelit + riwayat jeda 148 dtk (< timeout-minutes 3 di data.yml, dijaga swa-uji). Satelit yang gagal ditarik/valid
memakai entri lamanya dari tle.json bila epoch-nya < 14 hari, kalau tidak entri itu dibuang dengan peringatan. Nol satelit sah -> keluar kode 1 tanpa menimpa berkas.
Epoch dipotong ke menit (bukan dibulatkan). CelesTrak memperbarui GP tiap ~2 jam dan menolak (403) unduhan berulang atas data
yang belum berubah: balasan itu bukan TLE, jadi jatuh ke entri lama. Jangan jadwalkan lebih sering dari 2 jam.
Berdiri sendiri (tanpa impor modul tetangga) supaya jalan juga di bawah `python3 -I`.
"""
import datetime as dt, json, os, re, sys, tempfile, time, urllib.error, urllib.request

AKAR = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "../.."))
KELUAR = os.path.join(AKAR, "public/data/tle.json")
URL = "https://celestrak.org/NORAD/elements/gp.php?CATNR={}&FORMAT=TLE"
UA = {"User-Agent": "poskokarhutla/1.0"}
UMUR_MAKS = 14  # hari; entri lama yang lebih tua dari ini dibuang
# Anggaran tarik: langkah workflow dibatasi timeout-minutes 3 (data.yml). Terburuk = 4 x (PERCOBAAN x TIMEOUT + jeda ulang) + jeda antar satelit
TIMEOUT, PERCOBAAN, JEDA_ULANG, JEDA_ANTAR, BACA_MAKS = 15, 2, 3, 1, 65536  # dtk, kali, dtk, dtk, byte
TANPA_ULANG = (403, 404, 429)  # CelesTrak menolak unduhan berulang (403): mengulang tak menolong, malah memperpanjang blokir
KARAKTER = re.compile(r"[0-9A-Z .+\-]{69}")  # himpunan karakter sah sebuah baris TLE (angka, huruf besar, spasi, titik, plus, minus)
# Riwayat jeda (Worker). Satu percobaan: 136 dtk (CelesTrak) + 12 = 148 < 150 dtk, anggaran timeout-minutes 3 (data.yml); gagal = jatuh ke jeda lama/bawaan
URL_JEDA = "https://centurisk97.id/api/satelit/jeda"
JEDA_PERCOBAAN, JEDA_TIMEOUT = 1, 12  # kali, dtk
JEDA_HARI = 30  # nilai `hari` blok jeda bila tak ada satelit terukur
# Ambang "terukur" per kode sensor: lintasan >= 40 (bila endpoint mengirim `lintasan`, kalau tidak n >= 100), hari_ada >= 14 dan <= n dan
# <= hari + 1, median 60..720 menit, median <= p90 <= 720. Sama untuk gabungan, siang, dan malam.
JEDA_LINTASAN_MIN, JEDA_N_TANPA_LINTASAN, JEDA_HARI_ADA_MIN = 40, 100, 14
JEDA_MEDIAN_MIN, JEDA_MEDIAN_MAKS, JEDA_P90_MAKS = 60, 720, 720  # menit
JEDA_SELISIH_SIANG_MALAM = 90  # menit; keduanya terukur dan selisih median lebih dari ini -> p90 diambil yang terbesar dari tiga
JEDA_SEGAR = (-1, 2)  # hari; sampai endpoint boleh 1 hari di depan dan 2 hari di belakang hari ini (WIB), kalau tidak respons dianggap basi
JEDA_HARI_TOL = 1  # hari; |hari endpoint - ((sampai - dari).days + 1)| paling banyak ini (jendela tepat 30 hari = 31 tanggal WIB)
JEDA_LAMA_MAKS = 7  # hari; jeda dari tle.json lama dipakai selama jeda.sampai-nya tidak lebih tua dari ini
BAWAAN_DIUKUR = "2026-10-27"  # tanggal ukuran manual di balik nilai bawaan tabel SATELIT
WIB = dt.timezone(dt.timedelta(hours=7))
KODE = {43013: "N20", 54234: "N21", 25994: "M", 27424: "M"}  # norad -> kode sensor FIRMS: NOAA-20, NOAA-21, Terra, Aqua (Terra dan Aqua berbagi M)

# (nama, norad, sensor, setengah_sapuan_km, jeda_data_menit), urut tetap
SATELIT = [
    ("NOAA-20", 43013, "VIIRS", 1520, 180),
    ("NOAA-21", 54234, "VIIRS", 1520, 180),
    ("Terra", 25994, "MODIS", 1165, 120),
    ("Aqua", 27424, "MODIS", 1165, 120),
]


def checksum(baris):
    """Checksum TLE: jumlah semua angka, tanda minus dihitung 1, lainnya 0; mod 10."""
    return sum(int(c) if c.isdigit() else (1 if c == "-" else 0) for c in baris[:68]) % 10


def cek_tle(l1, l2, norad):
    """Lempar ValueError berisi alasannya bila pasangan baris tidak sah."""
    for no, b in ((1, l1), (2, l2)):
        if not b.startswith(f"{no} "):
            raise ValueError(f"baris {no} tidak mulai '{no} '")
        if len(b) != 69:
            raise ValueError(f"baris {no} panjang {len(b)}, bukan 69")
        if not KARAKTER.fullmatch(b):
            raise ValueError(f"baris {no} memuat karakter di luar [0-9A-Z .+-]")
        if not b[68].isdigit() or checksum(b) != int(b[68]):
            raise ValueError(f"checksum baris {no} salah (hitung {checksum(b)}, tertulis {b[68]})")
        if not b[2:7].strip().isdigit() or int(b[2:7]) != norad:
            raise ValueError(f"nomor katalog baris {no} '{b[2:7]}' bukan {norad}")


def ambil_tle(teks, norad):
    """Teks balasan CelesTrak (baris nama + 2 baris, atau 2 baris) -> (baris1, baris2) yang sudah divalidasi."""
    baris = [b.rstrip() for b in teks.splitlines()]
    i1 = next((i for i, b in enumerate(baris) if b.startswith("1 ")), None)
    if i1 is None or i1 + 1 >= len(baris) or not baris[i1 + 1].startswith("2 "):
        raise ValueError("balasan bukan TLE: " + " ".join(teks.split())[:80])
    l1, l2 = baris[i1], baris[i1 + 1]
    cek_tle(l1, l2, norad)
    return l1, l2


def epoch_waktu(l1):
    """Kolom epoch baris 1 (YYDDD.dddddddd, UTC) -> datetime UTC. YY < 57 = 20YY, selebihnya 19YY (aturan NORAD)."""
    yy = int(l1[18:20])
    tahun = (2000 if yy < 57 else 1900) + yy
    hari, _, pecah = l1[20:32].strip().partition(".")
    detik = int(pecah or "0") * 86400 // 10 ** len(pecah)  # bilangan bulat: tanpa galat float
    w = dt.datetime(tahun, 1, 1, tzinfo=dt.timezone.utc) + dt.timedelta(days=int(hari) - 1, seconds=detik)
    if int(hari) < 1 or w.year != tahun:
        raise ValueError(f"hari-dalam-tahun {hari} di luar tahun {tahun}")
    return w


iso = lambda w: w.strftime("%Y-%m-%dT%H:%MZ")  # menit, dipotong


def unduh(url, percobaan, timeout, buka=urllib.request.urlopen, tidur=time.sleep):
    """GET (maks `percobaan` kali, baca <= BACA_MAKS byte). HTTP 403/404/429 tidak diulang. Mengembalikan teks balasan."""
    for i in range(percobaan):
        try:
            with buka(urllib.request.Request(url, headers=UA), timeout=timeout) as r:
                return r.read(BACA_MAKS).decode("utf-8", "replace")
        except urllib.error.HTTPError as ex:
            if ex.code in TANPA_ULANG or i == percobaan - 1:
                raise
            tidur(JEDA_ULANG)
        except Exception:
            if i == percobaan - 1:
                raise
            tidur(JEDA_ULANG)


def tarik(norad, buka=urllib.request.urlopen, tidur=time.sleep):
    """Satu GET ke CelesTrak (maks PERCOBAAN kali). Mengembalikan teks balasan."""
    return unduh(URL.format(norad), PERCOBAAN, TIMEOUT, buka, tidur)


def tarik_jeda(buka=urllib.request.urlopen, tidur=time.sleep):
    """GET riwayat jeda dari Worker (JEDA_PERCOBAAN kali, JEDA_TIMEOUT dtk). Mengembalikan teks balasan."""
    return unduh(URL_JEDA, JEDA_PERCOBAAN, JEDA_TIMEOUT, buka, tidur)


# ---- jeda terukur --------------------------------------------------------------------------------------------------------
def bulat(x):
    """int bila x bilangan bulat (int, atau float utuh); bool, NaN, pecahan, teks, None -> None."""
    if isinstance(x, bool):
        return None
    if isinstance(x, int):
        return x
    return int(x) if isinstance(x, float) and x.is_integer() else None


def ambang_menit(median, p90):
    """median 60..720 menit dan median <= p90 <= 720."""
    return JEDA_MEDIAN_MIN <= median <= JEDA_MEDIAN_MAKS and median <= p90 <= JEDA_P90_MAKS


def ambang_nilai(median, p90, n):
    """Bagian ambang 'terukur' yang tersimpan di tle.json (hari_ada dan lintasan tidak ikut disimpan), untuk memvalidasi ulang nilai lama:
    ambang_menit dan n >= 14 (batas bawah yang tersirat: hari_ada >= 14 dan hari_ada <= n)."""
    return n >= JEDA_HARI_ADA_MIN and ambang_menit(median, p90)


def terukur(b, hari, hari_ada_induk=None):
    """Blok satu sensor (atau siang/malam-nya) dari endpoint -> (median, p90, n) bila lolos ambang, kalau tidak None (juga bila bentuknya salah).
    hari = medan `hari` endpoint. Blok siang/malam tidak membawa hari_ada: dipinjam dari sensor induknya (hari_ada_induk)."""
    if not isinstance(b, dict):
        return None
    n, median, p90 = (bulat(b.get(k)) for k in ("n", "median_menit", "p90_menit"))
    hari_ada = bulat(b["hari_ada"]) if "hari_ada" in b else hari_ada_induk
    if None in (n, hari_ada, median, p90):
        return None
    if "lintasan" in b:  # medan ada tetapi rusak = tidak terukur (bukan jatuh ke aturan n >= 100)
        lintasan = bulat(b["lintasan"])
        cukup = lintasan is not None and lintasan >= JEDA_LINTASAN_MIN
    else:
        cukup = n >= JEDA_N_TANPA_LINTASAN
    if cukup and JEDA_HARI_ADA_MIN <= hari_ada <= n and hari_ada <= hari + 1 and ambang_menit(median, p90):
        return median, p90, n


def ukur_kode(kode, b, hari):
    """Satu kode sensor -> ((median, p90, n) atau None, [catatan peringatan]). Bila siang DAN malam sama-sama terukur dan median keduanya
    beda lebih dari 90 menit, p90 diambil yang terbesar dari gabungan, siang, malam (jeda sepanjang hari tak seragam)."""
    t = terukur(b, hari)
    if t is None:
        return None, []
    hari_ada = bulat(b.get("hari_ada"))
    siang, malam = terukur(b.get("siang"), hari, hari_ada), terukur(b.get("malam"), hari, hari_ada)
    if siang and malam and abs(siang[0] - malam[0]) > JEDA_SELISIH_SIANG_MALAM:
        p90 = max(t[1], siang[1], malam[1])
        return (t[0], p90, t[2]), [f"::warning title=TLE jeda {kode}::median siang {siang[0]} menit, malam {malam[0]} menit; "
                                   f"jeda_p90_menit diambil {p90} menit (terbesar dari gabungan, siang, malam)"]
    return t, []


def tanggal_wib(s):
    """Waktu ISO 8601 ('2026-10-21T14:00:00.000Z') -> tanggal WIB (dt.date). ValueError bila bukan waktu."""
    if not isinstance(s, str):
        raise ValueError(f"bukan waktu: {s!r}")
    w = dt.datetime.fromisoformat(s[:-1] + "+00:00" if s.endswith("Z") else s)
    if w.tzinfo is None:
        w = w.replace(tzinfo=dt.timezone.utc)
    return w.astimezone(WIB).date()


def baca_jeda(teks, sekarang):
    """Teks JSON endpoint -> ({hari, dari, sampai}, {norad: (median, p90, n)} hanya yang terukur, [peringatan]). ValueError bila JSON
    rusak, bentuk salah, atau respons basi/tak masuk akal. Periode jujur: dari = yang lebih akhir antara `dari` endpoint dan tanggal WIB
    mulai_catat, hari = (sampai - dari).days + 1 (tanggal WIB, hitung inklusif)."""
    d = json.loads(teks)
    if not isinstance(d, dict) or not isinstance(d.get("sensor"), dict):
        raise ValueError("bentuk salah: tanpa objek 'sensor'")
    for kode in sorted(set(KODE.values())):
        if not isinstance(d["sensor"].get(kode), dict):
            raise ValueError(f"bentuk salah: sensor {kode} tidak ada")
    hari = bulat(d.get("hari"))
    if hari is None or not 1 <= hari <= 366:
        raise ValueError(f"bentuk salah: hari {d.get('hari')!r}")
    dari_ep, sampai = tanggal_wib(d.get("dari")), tanggal_wib(d.get("sampai"))
    if dari_ep > sampai:
        raise ValueError(f"bentuk salah: dari {dari_ep} sesudah sampai {sampai}")
    umur = (sekarang.astimezone(WIB).date() - sampai).days
    if not JEDA_SEGAR[0] <= umur <= JEDA_SEGAR[1]:
        raise ValueError(f"respons basi: sampai {sampai}, hari ini {sekarang.astimezone(WIB).date()}")
    hitung = (sampai - dari_ep).days + 1
    if abs(hari - hitung) > JEDA_HARI_TOL:
        raise ValueError(f"hari {hari} tak cocok dengan dari {dari_ep} .. sampai {sampai} ({hitung} tanggal)")
    per_kode, catatan = {}, []
    for kode in sorted(set(KODE.values())):
        per_kode[kode], c = ukur_kode(kode, d["sensor"][kode], hari)
        catatan += c
    ukur = {norad: per_kode[kode] for norad, kode in KODE.items() if per_kode[kode]}
    mulai = d.get("mulai_catat")
    if mulai is None and ukur:
        raise ValueError("bentuk salah: mulai_catat kosong padahal ada sensor terukur")
    dari = max(dari_ep, tanggal_wib(mulai)) if mulai is not None else dari_ep
    if dari > sampai:
        raise ValueError(f"bentuk salah: mulai_catat {dari} sesudah sampai {sampai}")
    return {"hari": (sampai - dari).days + 1, "dari": dari.isoformat(), "sampai": sampai.isoformat()}, ukur, catatan


def jeda_lama(lama, sekarang):
    """tle.json lama -> (blok, ukur) seperti baca_jeda bila jeda.sampai-nya tidak lebih tua dari JEDA_LAMA_MAKS hari, kalau tidak (None, {}).
    Nilai tiap satelit divalidasi ulang dengan ambang yang sama dan jeda_kode-nya harus cocok; jeda.sampai tidak pernah diperpanjang,
    jadi nilai lama kedaluwarsa."""
    try:
        j = lama["jeda"]
        dari, sampai = dt.date.fromisoformat(j["dari"]), dt.date.fromisoformat(j["sampai"])
        hari = bulat(j.get("hari"))
        if hari is None or dari > sampai or hari != (sampai - dari).days + 1:
            return None, {}
        if not -1 <= (sekarang.astimezone(WIB).date() - sampai).days <= JEDA_LAMA_MAKS:
            return None, {}
        ukur = {}
        for e in lama.get("satelit", []):
            norad = e.get("norad") if isinstance(e, dict) else None
            if isinstance(norad, int) and norad in KODE and e.get("jeda_sumber") == "terukur" and e.get("jeda_kode") == KODE[norad]:
                median, p90, n = (bulat(e.get(k)) for k in ("jeda_data_menit", "jeda_p90_menit", "jeda_n"))
                if None not in (median, p90, n) and ambang_nilai(median, p90, n):
                    ukur[norad] = (median, p90, n)
        return {"hari": hari, "dari": dari.isoformat(), "sampai": sampai.isoformat()}, ukur
    except Exception:
        return None, {}


def tentukan_jeda(ambil_jeda, lama, sekarang, peringatan):
    """Jeda tiap satelit: endpoint, gagal -> jeda tle.json lama (segar), gagal -> kosong (bawaan). Tidak pernah melempar.
    Mengembalikan (blok, ukur, asal) dengan asal "endpoint" | "lama" | None (bawaan). Endpoint dicoba dan gagal = SATU peringatan;
    endpoint berhasil tetapi siang/malam tak seragam = satu peringatan per kode sensor."""
    alasan = None
    if ambil_jeda is not None:
        try:
            blok, ukur, catatan = baca_jeda(ambil_jeda(), sekarang)
        except Exception as ex:
            alasan = " ".join(f"{type(ex).__name__}: {ex}".split())[:160]
        else:
            for c in catatan:
                peringatan(c)
            return blok, ukur, "endpoint"
    blok, ukur = jeda_lama(lama, sekarang)
    if alasan:
        peringatan(f"::warning title=TLE jeda::riwayat jeda tidak terbaca ({alasan}); dipakai: "
                   + (f"jeda lama sampai {blok['sampai']}" if blok and ukur else "bawaan"))
    return blok, ukur, "lama" if blok and ukur else None


def entri(nama, norad, sensor, sapuan, jeda, l1, l2, ukur=None):
    """ukur = (median, p90, n) bila jeda terukur; None = nilai bawaan `jeda`. Entri terukur membawa jeda_kode (jeda_n dibaca per kode)."""
    e = {"nama": nama, "norad": norad, "sensor": sensor, "setengah_sapuan_km": sapuan, "jeda_data_menit": ukur[0] if ukur else jeda}
    if ukur:
        e["jeda_p90_menit"], e["jeda_n"], e["jeda_kode"] = ukur[1], ukur[2], KODE[norad]
    e["jeda_sumber"] = "terukur" if ukur else "bawaan"
    e["epoch"], e["tle"] = iso(epoch_waktu(l1)), [l1, l2]
    return e


def susun(ambil, lama, sekarang, pesan=print, jeda=0, ambil_jeda=None, peringatan=None):
    """ambil(norad) -> teks CelesTrak. lama = isi tle.json sebelumnya (atau None). ambil_jeda() -> teks JSON riwayat jeda (None = tak ada
    sumber: jeda dari tle.json lama/bawaan, tanpa peringatan). peringatan(teks) default ke stderr. Mengembalikan dokumen, atau None bila
    nol satelit sah; kegagalan jeda tidak pernah menggagalkan."""
    peringatan = peringatan or (lambda t: print(t, file=sys.stderr))
    lama = lama if isinstance(lama, dict) else None  # tle.json lama yang bukan objek = tak ada
    daftar_lama = (lama or {}).get("satelit")
    lama_per = {e.get("norad"): e for e in (daftar_lama if isinstance(daftar_lama, list) else []) if isinstance(e, dict)}
    umur_hari = lambda l1: (sekarang - epoch_waktu(l1)).total_seconds() / 86400
    blok, ukur, asal_jeda = tentukan_jeda(ambil_jeda, lama, sekarang, peringatan)
    hasil = []
    for nama, norad, sensor, sapuan, jmenit in SATELIT:
        e, asal = None, "baru"
        try:
            l1, l2 = ambil_tle(ambil(norad), norad)
            e = entri(nama, norad, sensor, sapuan, jmenit, l1, l2, ukur.get(norad))
            if umur_hari(l1) >= UMUR_MAKS:
                pesan(f"::warning title=TLE {nama}::epoch CelesTrak sudah {umur_hari(l1):.1f} hari")
        except Exception as ex:
            asal = f"gagal ({ex})"
            try:  # entri lama divalidasi ulang dari barisnya sendiri; konstanta diambil dari konfigurasi sekarang
                l1, l2 = lama_per[norad]["tle"]
                cek_tle(l1, l2, norad)
                if umur_hari(l1) < UMUR_MAKS:
                    e, asal = entri(nama, norad, sensor, sapuan, jmenit, l1, l2, ukur.get(norad)), "lama (tarik gagal)"
                else:
                    asal += f"; entri lama {umur_hari(l1):.1f} hari >= {UMUR_MAKS}, dibuang"
            except Exception:
                asal += "; tak ada entri lama yang sah"
            if e is None:
                pesan(f"::warning title=TLE {nama} dibuang::{asal}")
        if e:
            hasil.append(e)
            pesan(f"{nama:8s} epoch {e['epoch']}  umur {umur_hari(e['tle'][0]):4.1f} hari  [{asal}]")
        time.sleep(jeda)
    if not hasil:
        return None
    n_ukur = sum(e["jeda_sumber"] == "terukur" for e in hasil)
    pesan(f"jeda     {n_ukur}/{len(hasil)} satelit terukur  [{asal_jeda or 'bawaan'}]")
    jeda_doc = {"hari": blok["hari"] if n_ukur else JEDA_HARI, "dari": blok["dari"] if n_ukur else None,
                "sampai": blok["sampai"] if n_ukur else None, "bawaan_diukur": BAWAAN_DIUKUR, "asal": asal_jeda if n_ukur else None}
    if n_ukur:
        jeda_doc["arti"] = "tampil_di_aplikasi"  # sampai tampil di aplikasi (latensi FIRMS + tunggu putaran Worker), BUKAN latensi FIRMS murni
    return {"dibuat": iso(sekarang), "sumber": "CelesTrak GP", "jeda": jeda_doc, "satelit": hasil}


def tulis(path, doc):
    f = tempfile.NamedTemporaryFile("w", dir=os.path.dirname(path), delete=False, suffix=".tmp", encoding="utf-8")
    try:
        with f:
            json.dump(doc, f, ensure_ascii=False, separators=(",", ":"))
            f.write("\n")
        os.chmod(f.name, 0o644)  # mkstemp membuat 0600; berkas lain di public/data 0644
        os.replace(f.name, path)
    except BaseException:  # gagal di langkah mana pun: jangan tinggalkan .tmp (bisa ikut ter-commit), berkas lama utuh
        try:
            os.unlink(f.name)
        except OSError:
            pass
        raise


def main(ambil=tarik, ambil_jeda=tarik_jeda, keluar=KELUAR, tunggu=JEDA_ANTAR):
    try:
        with open(keluar, encoding="utf-8") as f:
            lama = json.load(f)
    except Exception:
        lama = None
    doc = susun(ambil, lama, dt.datetime.now(dt.timezone.utc), jeda=tunggu, ambil_jeda=ambil_jeda)  # tunggu: sopan ke CelesTrak
    if doc is None:
        print("::error title=TLE kosong::nol satelit sah; tle.json tidak ditimpa", file=sys.stderr)
        sys.exit(1)
    tulis(keluar, doc)
    print(f"{len(doc['satelit'])} satelit -> {keluar}")


# ---- swa-uji -----------------------------------------------------------------------------------------------------------
# Pasangan TLE nyata dari CelesTrak (GP, diambil 27 Okt 2026), nama satelit CelesTrak dibuang
FIX = {
    43013: ("1 43013U 17073A   26299.88035777  .00000038  00000+0  39212-4 0  9993",
            "2 43013  98.7891 238.2259 0000400 133.8390 226.2819 14.19533254463153"),
    54234: ("1 54234U 22150A   26299.91105875  .00000007  00000+0  24070-4 0  9995",
            "2 54234  98.7172 236.5322 0001985 145.9675 214.1629 14.19555484205230"),
    25994: ("1 25994U 99068A   26299.90914919  .00000191  00000+0  47687-4 0  9997",
            "2 25994  97.9295 344.1283 0002811 146.0058 266.6011 14.61184239428840"),
    27424: ("1 27424U 02022A   26299.91410615  .00000425  00000+0  94236-4 0  9998",
            "2 27424  98.4464 271.9536 0000800  91.7868 293.5838 14.62252733302521"),
}
TEKS = lambda n: f"SATELIT {n}".ljust(24) + "\n" + FIX[n][0] + "\n" + FIX[n][1] + "\n"  # bentuk balasan CelesTrak: baris nama + 2 baris


def uji():
    def _coba(l1, l2, n):
        try:
            cek_tle(l1, l2, n)
        except ValueError as e:
            return e

    # 1. checksum: pasangan nyata lolos, satu digit dirusak ditolak
    for n, (l1, l2) in FIX.items():
        assert _coba(l1, l2, n) is None, (n, _coba(l1, l2, n))
    l1, l2 = FIX[43013]
    ubah = lambda b, i: b[:i] + str((int(b[i]) + 1) % 10) + b[i + 1:]  # naikkan satu angka (i harus posisi angka)
    rusak = ubah(l1, 30)
    assert "checksum baris 1" in str(_coba(rusak, l2, 43013)), "baris 1 dirusak harus ditolak"
    rusak2 = ubah(l2, 19)
    assert "checksum baris 2" in str(_coba(l1, rusak2, 43013)), "baris 2 dirusak harus ditolak"
    assert checksum("1 " + "-" * 66) == 7 and checksum("1 " + "9" * 66) == (1 + 9 * 66) % 10  # '-' = 1, angka = nilainya
    # panjang, awalan, nomor katalog
    assert "panjang" in str(_coba(l1[:-1], l2, 43013)) and "mulai '1 '" in str(_coba("2" + l1[1:], l2, 43013))
    assert "nomor katalog" in str(_coba(*FIX[54234], 43013)), "satelit lain di slot NOAA-20 harus ditolak"
    # himpunan karakter: panjang 69 dan checksum bisa lolos, tapi karakter asing harus ditolak (huruf kecil, tab, non-ASCII, digit Unicode)
    for asing in ("a", "\t", "é", "\u0663", "<", ";"):
        for no, b in ((1, l1), (2, l2)):
            kotor = b[:10] + asing + b[11:]  # kolom 10 baris 1 = spasi, baris 2 = digit; panjang tetap 69
            assert len(kotor) == 69
            assert "karakter" in str(_coba(kotor, l2, 43013) if no == 1 else _coba(l1, kotor, 43013)), (asing, no)

    # 2. epoch YYDDD.dddddddd -> ISO. Hitung manual: 26299 = hari ke-299 2026 (Jan31+Feb28+...+Sep30 = 273) = 26 Okt;
    #    0,90914919 hari x 1440 = 1309,17 menit = 21 j 49,17 mnt -> 21:49 (dipotong). 43013: 0,88035777 x 1440 = 1267,7 -> 21:07.
    assert iso(epoch_waktu(FIX[25994][0])) == "2026-10-26T21:49Z", iso(epoch_waktu(FIX[25994][0]))
    assert iso(epoch_waktu(FIX[43013][0])) == "2026-10-26T21:07Z"
    ep = lambda s: iso(epoch_waktu("1 00000U 00000A   " + s.ljust(14) + " " * 37))
    assert ep("99068.50000000") == "1999-03-09T12:00Z", "YY >= 57 = 19YY; hari 68 1999 = 9 Mar"
    assert ep("24060.00000000") == "2024-02-29T00:00Z", "tahun kabisat: hari 60 = 29 Feb"
    assert ep("26365.99999999") == "2026-12-31T23:59Z", "dipotong, tidak dibulatkan ke hari berikutnya"
    for salah in ("26366.00000000", "26000.50000000"):
        try:
            ep(salah)
            raise AssertionError(f"hari di luar tahun harus ditolak: {salah}")
        except ValueError:
            pass

    # 3. ambil_tle: dengan/tanpa baris nama, balasan bukan TLE (blokir 403 CelesTrak, "No GP data found")
    assert ambil_tle(TEKS(43013), 43013) == FIX[43013] and ambil_tle("\n".join(FIX[43013]), 43013) == FIX[43013]
    for sampah in ("", "No GP data found", "GP data has not updated since your last successful download. Please wait."):
        try:
            ambil_tle(sampah, 43013)
            raise AssertionError("bukan TLE harus ditolak: " + sampah)
        except ValueError:
            pass

    # 4. susun: bentuk JSON sesuai kontrak, urutan, konstanta
    sekarang = dt.datetime(2026, 10, 27, 14, 25, tzinfo=dt.timezone.utc)
    log = []
    ok = lambda n: TEKS(n)
    doc = susun(ok, None, sekarang, log.append)
    assert list(doc) == ["dibuat", "sumber", "jeda", "satelit"] and doc["dibuat"] == "2026-10-27T14:25Z" and doc["sumber"] == "CelesTrak GP"
    # tanpa sumber jeda (ambil_jeda None): semua bawaan, blok jeda tanpa rentang
    assert doc["jeda"] == {"hari": 30, "dari": None, "sampai": None, "bawaan_diukur": "2026-10-27", "asal": None}  # tanpa kunci "arti"
    assert list(doc["jeda"]) == ["hari", "dari", "sampai", "bawaan_diukur", "asal"]
    assert [(e["nama"], e["norad"], e["sensor"], e["setengah_sapuan_km"], e["jeda_data_menit"]) for e in doc["satelit"]] == [
        ("NOAA-20", 43013, "VIIRS", 1520, 180), ("NOAA-21", 54234, "VIIRS", 1520, 180),
        ("Terra", 25994, "MODIS", 1165, 120), ("Aqua", 27424, "MODIS", 1165, 120)]
    for e in doc["satelit"]:
        assert list(e) == ["nama", "norad", "sensor", "setengah_sapuan_km", "jeda_data_menit", "jeda_sumber", "epoch", "tle"], list(e)
        assert e["jeda_sumber"] == "bawaan"  # bawaan: tanpa jeda_p90_menit / jeda_n
        assert tuple(e["tle"]) == FIX[e["norad"]] and len(e["epoch"]) == 17 and e["epoch"].endswith("Z") and e["epoch"][10] == "T"
    assert doc["satelit"][2]["epoch"] == "2026-10-26T21:49Z" and len(log) == 5 and "umur  0.7 hari" in log[2], log
    assert log[4].startswith("jeda") and "0/4 satelit terukur" in log[4], log
    assert json.loads(json.dumps(doc)) == doc

    # 5. aturan gagal: ganti epoch baris 1 (checksum dihitung ulang) untuk membuat entri lama
    def dengan_epoch(l1, ep14):
        b = l1[:18] + ep14 + l1[32:68]
        return b + str(checksum(b + "0"))
    assert _coba(dengan_epoch(FIX[54234][0], "26290.00000000"), FIX[54234][1], 54234) is None
    lama = lambda ep14: {"satelit": [{**doc["satelit"][1], "tle": [dengan_epoch(FIX[54234][0], ep14), FIX[54234][1]]}]}

    def gagal_21(n):
        if n == 54234:
            raise OSError("jaringan putus")
        return TEKS(n)
    log.clear()
    d = susun(gagal_21, lama("26290.00000000"), sekarang, log.append)  # 17 Okt: 10,6 hari -> dipakai
    assert [e["nama"] for e in d["satelit"]] == ["NOAA-20", "NOAA-21", "Terra", "Aqua"] and d["satelit"][1]["epoch"] == "2026-10-17T00:00Z"
    assert any("lama (tarik gagal)" in x for x in log), log
    log.clear()
    d = susun(gagal_21, lama("26280.00000000"), sekarang, log.append)  # 7 Okt: 20,6 hari -> dibuang
    assert [e["nama"] for e in d["satelit"]] == ["NOAA-20", "Terra", "Aqua"] and any("dibuang" in x for x in log), log
    d = susun(gagal_21, None, sekarang, log.append)  # tanpa berkas lama
    assert [e["nama"] for e in d["satelit"]] == ["NOAA-20", "Terra", "Aqua"]
    rusak_lama = lama("26290.00000000")
    rusak_lama["satelit"][0]["tle"][0] = rusak_lama["satelit"][0]["tle"][0][:30] + "9" + rusak_lama["satelit"][0]["tle"][0][31:]
    assert len(susun(gagal_21, rusak_lama, sekarang, log.append)["satelit"]) == 3, "entri lama dengan checksum rusak tidak dipakai"
    # balasan CelesTrak rusak (checksum salah) diperlakukan sama dengan gagal tarik
    busuk = lambda n: TEKS(n).replace(FIX[27424][1], FIX[27424][1][:-1] + "0") if n == 27424 else TEKS(n)
    assert [e["nama"] for e in susun(busuk, None, sekarang, log.append)["satelit"]] == ["NOAA-20", "NOAA-21", "Terra"]
    # nol satelit sah -> None (main keluar kode 1 dan tidak menulis)
    assert susun(lambda n: "GP data has not updated", lama("26290.00000000"), sekarang.replace(year=2027), log.append) is None
    assert susun(lambda n: (_ for _ in ()).throw(OSError("mati")), None, sekarang, log.append) is None

    # 6. tulis atomik: berkas sah, tanpa sisa .tmp
    with tempfile.TemporaryDirectory() as dirtmp:
        p = os.path.join(dirtmp, "tle.json")
        tulis(p, doc)
        assert json.load(open(p, encoding="utf-8")) == doc and os.listdir(dirtmp) == ["tle.json"]
        # gagal di tengah: serialisasi (set), chmod, replace (target direktori) -> tanpa .tmp, berkas lama utuh
        isi = open(p, encoding="utf-8").read()
        chmod_asli = os.chmod
        def _chmod_gagal(*a, **k):
            raise PermissionError("chmod ditolak")
        for nama, buat in (("json", lambda: tulis(p, {"x": {1, 2}})), ("chmod", lambda: tulis(p, doc)), ("replace", lambda: tulis(os.path.join(dirtmp, "dir"), doc))):
            os.mkdir(os.path.join(dirtmp, "dir")) if nama == "replace" else None
            os.chmod = _chmod_gagal if nama == "chmod" else chmod_asli
            try:
                buat()
                raise AssertionError(f"tulis harus gagal: {nama}")
            except (TypeError, OSError):
                pass
            finally:
                os.chmod = chmod_asli
            assert sorted(os.listdir(dirtmp)) == (["dir", "tle.json"] if nama == "replace" else ["tle.json"]), (nama, os.listdir(dirtmp))
            assert open(p, encoding="utf-8").read() == isi, nama
            if nama == "replace":
                os.rmdir(os.path.join(dirtmp, "dir"))

    # 7. tarik: HTTP 403/404/429 tidak diulang, kegagalan lain diulang sampai PERCOBAAN, baca dibatasi, anggaran terburuk < 150 dtk
    class Balasan:
        def __init__(self, isi): self.isi, self.n = isi, None
        def __enter__(self): return self
        def __exit__(self, *a): return False
        def read(self, n=-1): self.n = n; return self.isi[:n] if n >= 0 else self.isi
    def galat(kode): return urllib.error.HTTPError("https://x", kode, "x", {}, None)
    def pembuka(*urut):
        panggilan = []
        def buka(req, timeout=None):
            panggilan.append(timeout)
            x = urut[min(len(panggilan), len(urut)) - 1]
            if isinstance(x, BaseException):
                raise x
            return x
        return buka, panggilan
    tidur = []
    for kode in (403, 404, 429):  # literal, bukan TANPA_ULANG: konstanta kosong tak boleh meloloskan uji
        buka, pg = pembuka(galat(kode))
        try:
            tarik(1, buka, tidur.append)
            raise AssertionError(f"HTTP {kode} harus dilempar")
        except urllib.error.HTTPError as ex:
            assert ex.code == kode
        assert len(pg) == 1 and tidur == [], (kode, pg, tidur)  # satu percobaan, tanpa jeda
    buka, pg = pembuka(galat(503))
    try:
        tarik(1, buka, tidur.append)
        raise AssertionError("HTTP 503 harus dilempar setelah percobaan habis")
    except urllib.error.HTTPError:
        pass
    assert len(pg) == PERCOBAAN and tidur == [JEDA_ULANG] * (PERCOBAAN - 1) and set(pg) == {TIMEOUT}, (pg, tidur)  # 5xx diulang
    tidur.clear()
    buka, pg = pembuka(OSError("putus"), Balasan(b"ok"))
    assert tarik(1, buka, tidur.append) == "ok" and len(pg) == 2 and tidur == [JEDA_ULANG]  # gagal sekali lalu berhasil
    besar = Balasan(b"A" * (BACA_MAKS * 2))
    buka, pg = pembuka(besar)
    assert len(tarik(1, buka, tidur.append)) == BACA_MAKS and besar.n == BACA_MAKS, "baca harus dibatasi"
    # 8. jeda terukur. Fixture berbentuk balasan endpoint (kode N20/N21/M/N, waktu UTC ISO, menit bulat, medan `lintasan`); angka ambang
    #    SENGAJA literal (bukan konstanta) supaya ambang yang dikosongkan/digeser tertangkap. Tanpa jaringan.
    def sen(n, ha, med, p90, lin=60, siang=None, malam=None):
        """Blok satu sensor. lin=None: medan lintasan tidak dikirim. siang/malam bawaan: median/p90 sama dengan gabungan, lintasan separuh."""
        h = n // 2 if isinstance(n, int) else 0  # n sengaja bisa None/bool/teks di uji bentuk salah
        paruh = lambda x: x if x is not None else {"n": h, "median_menit": med, "p90_menit": p90, **({"lintasan": lin // 2} if isinstance(lin, int) else {})}
        b = {"n": n, "hari_ada": ha, "median_menit": med, "p90_menit": p90}
        if lin is not None:
            b["lintasan"] = lin
        b["siang"], b["malam"] = paruh(siang), paruh(malam)
        return b
    tanpa = sen(0, 0, None, None, lin=0)
    iso_ms = lambda w: w.strftime("%Y-%m-%dT%H:%M:%S.000Z")
    hr = lambda n: dt.timedelta(days=n)

    def balasan_pada(t, mulai="otomatis", **ganti):
        t = t.replace(minute=0, second=0, microsecond=0)
        d = {"dibuat": iso_ms(t), "hari": 30, "dari": iso_ms(t - hr(30)), "sampai": iso_ms(t),
             "mulai_catat": iso_ms(t - hr(40)) if mulai == "otomatis" else mulai,
             "sensor": {"N20": sen(140, 22, 205, 330), "N21": sen(120, 20, 190, 310), "M": sen(200, 25, 95, 160), "N": tanpa}}
        d["sensor"].update(ganti)
        return json.dumps(d)

    def ubah(f, t=None):
        d = json.loads(balasan_pada(t or s2))
        f(d)
        return json.dumps(d)
    s2 = dt.datetime(2026, 11, 20, 14, 25, tzinfo=dt.timezone.utc)  # 20 Nov 21.25 WIB; balasan(): sampai 2026-11-20 14.00Z, dari 21 Okt, mulai_catat 11 Okt
    balasan = lambda **g: balasan_pada(s2, **g)
    sekian = lambda hari: s2 + hr(hari)
    peri = []
    BAWAAN = {"NOAA-20": 180, "NOAA-21": 180, "Terra": 120, "Aqua": 120}
    log.clear()
    per_nama = lambda d: {e["nama"]: e for e in d["satelit"]}

    def cek_bawaan(e):
        assert e["jeda_sumber"] == "bawaan" and e["jeda_data_menit"] == BAWAAN[e["nama"]], e
        assert not {"jeda_p90_menit", "jeda_n", "jeda_kode"} & set(e), e
    JEDA_KOSONG = {"hari": 30, "dari": None, "sampai": None, "bawaan_diukur": "2026-10-27", "asal": None}  # tanpa kunci "arti"

    # 8a. terukur penuh: NOAA-20 -> N20, NOAA-21 -> N21, Terra dan Aqua -> M (nilai tiap kode berbeda, jadi salah-peta tertangkap)
    penuh = susun(ok, None, s2, log.append, ambil_jeda=balasan, peringatan=peri.append)
    assert peri == [] and list(penuh) == ["dibuat", "sumber", "jeda", "satelit"] and "4/4 satelit terukur" in log[-1], (peri, log)
    harapan = {"NOAA-20": (205, 330, 140, "N20"), "NOAA-21": (190, 310, 120, "N21"), "Terra": (95, 160, 200, "M"), "Aqua": (95, 160, 200, "M")}
    assert [e["nama"] for e in penuh["satelit"]] == list(harapan)
    for e in penuh["satelit"]:
        assert list(e) == ["nama", "norad", "sensor", "setengah_sapuan_km", "jeda_data_menit", "jeda_p90_menit", "jeda_n", "jeda_kode", "jeda_sumber",
                           "epoch", "tle"], list(e)
        assert (e["jeda_data_menit"], e["jeda_p90_menit"], e["jeda_n"], e["jeda_kode"]) == harapan[e["nama"]] and e["jeda_sumber"] == "terukur", e
        assert tuple(e["tle"]) == FIX[e["norad"]]
    assert penuh["jeda"] == {"hari": 31, "dari": "2026-10-21", "sampai": "2026-11-20", "bawaan_diukur": "2026-10-27", "asal": "endpoint",
                             "arti": "tampil_di_aplikasi"}, penuh["jeda"]
    assert list(penuh["jeda"]) == ["hari", "dari", "sampai", "bawaan_diukur", "asal", "arti"] and json.loads(json.dumps(penuh)) == penuh

    # 8b. sebagian sensor terukur: keputusan per satelit, blok jeda tetap berisi rentang
    d = susun(ok, None, s2, log.append, ambil_jeda=lambda: balasan(N21=sen(120, 22, 190, 310, lin=39), M=sen(200, 13, 95, 160)), peringatan=peri.append)
    pn = per_nama(d)
    assert (pn["NOAA-20"]["jeda_data_menit"], pn["NOAA-20"]["jeda_sumber"], pn["NOAA-20"]["jeda_kode"]) == (205, "terukur", "N20")
    for nama in ("NOAA-21", "Terra", "Aqua"):
        cek_bawaan(pn[nama])
    assert d["jeda"]["dari"] == "2026-10-21" and d["jeda"]["sampai"] == "2026-11-20" and d["jeda"]["asal"] == "endpoint" and "1/4 satelit terukur" in log[-1]
    d = susun(ok, None, s2, log.append, ambil_jeda=lambda: balasan(N20=tanpa, N21=sen(10, 3, 190, 310)), peringatan=peri.append)  # hanya MODIS
    pn = per_nama(d)
    cek_bawaan(pn["NOAA-20"]); cek_bawaan(pn["NOAA-21"])
    assert [(pn[n]["jeda_data_menit"], pn[n]["jeda_sumber"], pn[n]["jeda_kode"]) for n in ("Terra", "Aqua")] == [(95, "terukur", "M")] * 2
    # tidak ada yang terukur (mis. 14 hari pertama): endpoint menjawab, jadi nilai lama TIDAK dihidupkan lagi; rentang, asal null, tanpa "arti"
    d = susun(ok, penuh, s2, log.append, ambil_jeda=lambda: balasan(N20=tanpa, N21=tanpa, M=sen(5, 2, 100, 150)), peringatan=peri.append)
    assert peri == [] and d["jeda"] == JEDA_KOSONG and list(d["jeda"]) == ["hari", "dari", "sampai", "bawaan_diukur", "asal"], d["jeda"]
    for e in d["satelit"]:
        cek_bawaan(e)

    # 8c. ambang tepat di batas (literal). Terukur per kode: lintasan >= 40 (bila medan ada, kalau tidak n >= 100), hari_ada 14..min(n, hari+1=31),
    #     median 60..720, median <= p90 <= 720.
    def n20(**kw):
        a = dict(n=140, ha=22, med=205, p90=330, lin=60)
        a.update(kw)
        return susun(ok, None, s2, log.append, ambil_jeda=lambda: balasan(N20=sen(a["n"], a["ha"], a["med"], a["p90"], a["lin"])),
                     peringatan=peri.append)["satelit"][0]
    for kw, nilai in ((dict(lin=40), 205), (dict(lin=None, n=100), 205), (dict(n=100, lin=None, ha=14), 205), (dict(ha=14), 205), (dict(ha=31), 205),
                      (dict(n=23, ha=23, lin=40), 205),  # hari_ada == n (lintasan > n tak masuk akal, hanya untuk batas hari_ada <= n)
                      (dict(med=60, p90=60), 60), (dict(med=720, p90=720), 720), (dict(p90=720), 205), (dict(med=205, p90=205), 205), (dict(med=205.0), 205)):
        e = n20(**kw)
        assert e["jeda_sumber"] == "terukur" and e["jeda_data_menit"] == nilai and isinstance(e["jeda_data_menit"], int), (kw, e)
    for kw in (dict(lin=39), dict(lin=None, n=99), dict(lin="40"), dict(lin=39.5), dict(lin=True), dict(lin=-1), dict(lin=0, n=140),  # lintasan ada tapi kurang/rusak
               dict(ha=13), dict(ha=32), dict(n=22, ha=23, lin=40), dict(n=0, ha=0, lin=40),
               dict(med=59, p90=330), dict(med=721, p90=800), dict(p90=204), dict(p90=721), dict(med=None, p90=None), dict(med="205"),
               dict(med=205.5), dict(n=None), dict(ha=None), dict(n=True), dict(ha=False), dict(med=0, p90=0), dict(n=0, ha=0, med=205, lin=0)):
        e = n20(**kw)
        cek_bawaan(e)
    assert peri == []
    # lintasan ada tetapi tidak dikirim berupa angka (null): bukan jatuh ke aturan n >= 100
    d = json.loads(balasan())
    d["sensor"]["N20"]["lintasan"] = None
    e = susun(ok, None, s2, log.append, ambil_jeda=lambda: json.dumps(d), peringatan=peri.append)["satelit"][0]
    cek_bawaan(e)

    # 8c2. siang/malam dibaca dengan fungsi yang sama (hari_ada dipinjam dari induk). Keduanya terukur dan median beda > 90 menit:
    #      jeda_p90_menit = terbesar dari gabungan/siang/malam + SATU peringatan per kode; median tetap gabungan.
    def paruh(med, p90, lin=45, **ekstra):
        return {"n": 70, "median_menit": med, "p90_menit": p90, "lintasan": lin, **ekstra}

    def sm(siang, malam, kode="N20", **kw):
        peri.clear()
        isi = dict(n=140, ha=22, med=205, p90=330, lin=60)
        isi.update(kw)
        d = susun(ok, None, s2, log.append, ambil_jeda=lambda: balasan(**{kode: sen(isi["n"], isi["ha"], isi["med"], isi["p90"], isi["lin"], siang, malam)}),
                  peringatan=peri.append)
        return d, per_nama(d)
    d, pn = sm(paruh(150, 250), paruh(241, 400))                       # selisih 91 > 90: p90 = max(330, 250, 400)
    assert (pn["NOAA-20"]["jeda_data_menit"], pn["NOAA-20"]["jeda_p90_menit"]) == (205, 400) and len(peri) == 1, (pn["NOAA-20"], peri)
    assert peri[0].startswith("::warning title=TLE jeda N20::") and "\n" not in peri[0] and "400" in peri[0], peri
    d, pn = sm(paruh(300, 600), paruh(150, 250))                       # siang terbesar
    assert pn["NOAA-20"]["jeda_p90_menit"] == 600 and len(peri) == 1
    d, pn = sm(paruh(150, 250), paruh(240, 400))                       # selisih tepat 90: tidak > 90
    assert pn["NOAA-20"]["jeda_p90_menit"] == 330 and peri == []
    d, pn = sm(paruh(240, 400), paruh(150, 250))                       # arah sebaliknya, tepat 90
    assert pn["NOAA-20"]["jeda_p90_menit"] == 330 and peri == []
    d, pn = sm(paruh(150, 250), paruh(400, 500))                       # selisih 250, p90 malam terbesar
    assert pn["NOAA-20"]["jeda_p90_menit"] == 500 and len(peri) == 1
    d, pn = sm(paruh(150, 250), paruh(400, 500, lin=39))               # malam kurang lintasan: tak terukur, tak ada pelebaran
    assert pn["NOAA-20"]["jeda_p90_menit"] == 330 and peri == []
    d, pn = sm(paruh(150, 250, lin=39), paruh(400, 500))               # siang kurang lintasan
    assert pn["NOAA-20"]["jeda_p90_menit"] == 330 and peri == []
    d, pn = sm(paruh(150, 250, hari_ada=13), paruh(400, 500))          # siang punya hari_ada sendiri yang kurang
    assert pn["NOAA-20"]["jeda_p90_menit"] == 330 and peri == []
    d, pn = sm(paruh(150, 250), paruh(400, 721))                       # malam p90 di luar batas
    assert pn["NOAA-20"]["jeda_p90_menit"] == 330 and peri == []
    d, pn = sm(paruh(59, 100), paruh(400, 500))                        # siang median < 60
    assert pn["NOAA-20"]["jeda_p90_menit"] == 330 and peri == []
    d, pn = sm({}, paruh(400, 500))                                    # siang rusak
    assert pn["NOAA-20"]["jeda_p90_menit"] == 330 and peri == []
    d, pn = sm(paruh(150, 250), paruh(400, 500), lin=39)               # gabungan tak terukur: bawaan, tanpa peringatan
    cek_bawaan(pn["NOAA-20"])
    assert peri == []
    d, pn = sm(paruh(150, 250), paruh(400, 500), kode="M", n=200, ha=25, med=95, p90=160)  # M dipakai Terra dan Aqua: satu peringatan, p90 sama
    assert pn["Terra"]["jeda_p90_menit"] == pn["Aqua"]["jeda_p90_menit"] == 500 and len(peri) == 1 and "TLE jeda M::" in peri[0], peri

    # 8d. periode jujur: dari = max(dari endpoint, tanggal WIB mulai_catat), hari = (sampai - dari).days + 1
    def periode(**kw):
        peri.clear()
        j = susun(ok, None, s2, log.append, ambil_jeda=lambda: balasan_pada(s2, **kw), peringatan=peri.append)["jeda"]
        return j["dari"], j["sampai"], j["hari"]
    assert periode() == ("2026-10-21", "2026-11-20", 31) and peri == []
    assert periode(mulai="2026-10-21T14:00:00.000Z") == ("2026-10-21", "2026-11-20", 31)         # mulai == dari
    assert periode(mulai="2026-10-22T00:15:00.000Z") == ("2026-10-22", "2026-11-20", 30)
    assert periode(mulai="2026-11-10T00:15:00.000Z") == ("2026-11-10", "2026-11-20", 11)         # mulai_catat 10 Nov (hari_ada tak diuji terhadap periode)
    assert periode(mulai="2026-11-09T16:59:59.999Z") == ("2026-11-09", "2026-11-20", 12)         # 23.59 WIB masih 9 Nov
    assert periode(mulai="2026-11-09T17:00:00Z") == ("2026-11-10", "2026-11-20", 11)             # 00.00 WIB sudah 10 Nov
    assert periode(mulai="2026-11-20T00:00:00Z") == ("2026-11-20", "2026-11-20", 1)              # mulai hari ini
    # tanggal WIB dari waktu UTC di dari/sampai: 16.59 UTC masih hari itu, 17.00 UTC sudah hari berikutnya
    d = susun(ok, None, s2, log.append, ambil_jeda=lambda: ubah(lambda x: x.update(dari="2026-10-21T16:59:59.999Z", sampai="2026-11-20T17:00:00Z", hari=31)),
              peringatan=peri.append)
    assert (d["jeda"]["dari"], d["jeda"]["sampai"], d["jeda"]["hari"]) == ("2026-10-21", "2026-11-21", 32), d["jeda"]
    # mulai_catat kosong: wajar bila belum ada yang terukur; mustahil bila ada yang terukur (-> bentuk salah)
    peri.clear()
    d = susun(ok, None, s2, log.append, ambil_jeda=lambda: balasan_pada(s2, mulai=None, N20=tanpa, N21=tanpa, M=tanpa), peringatan=peri.append)
    assert peri == [] and d["jeda"] == JEDA_KOSONG
    peri.clear()
    d = susun(ok, None, s2, log.append, ambil_jeda=lambda: ubah(lambda x: (x.pop("mulai_catat"), x["sensor"].update(N20=tanpa, N21=tanpa, M=tanpa))),
              peringatan=peri.append)
    assert peri == [] and d["jeda"] == JEDA_KOSONG, "mulai_catat tak ada + tak ada yang terukur: bukan galat"

    # 8d2. kesegaran respons: sampai -1..2 hari dari hari ini (WIB); hari endpoint selisih <= 1 dari (sampai - dari).days + 1
    def respons(teks, sekarang=s2):
        peri.clear()
        d = susun(ok, None, sekarang, log.append, ambil_jeda=lambda: teks, peringatan=peri.append)
        return d["jeda"]["asal"], len(peri)
    assert respons(balasan_pada(s2 - hr(2))) == ("endpoint", 0)    # sampai 18 Nov, hari ini 20 Nov: 2 hari
    assert respons(balasan_pada(s2 - hr(3))) == (None, 1)          # 3 hari: basi
    assert respons(balasan_pada(s2 + hr(1))) == ("endpoint", 0)    # sampai 21 Nov: 1 hari di depan
    assert respons(balasan_pada(s2 + hr(2))) == (None, 1)          # 2 hari di depan: mustahil
    assert respons(balasan_pada(s2), sekarang=s2 + hr(2)) == ("endpoint", 0) and respons(balasan_pada(s2), sekarang=s2 + hr(3)) == (None, 1)
    assert respons(balasan_pada(s2), sekarang=s2 - hr(1)) == ("endpoint", 0) and respons(balasan_pada(s2), sekarang=s2 - hr(2)) == (None, 1)
    for hari_ep, diterima in ((29, False), (30, True), (31, True), (32, True), (33, False)):  # (sampai - dari).days + 1 = 31
        assert respons(ubah(lambda x: x.update(hari=hari_ep))) == (("endpoint", 0) if diterima else (None, 1)), hari_ep

    # 8e. endpoint gagal + tle.json lama: jeda.sampai lama <= 7 hari (WIB) -> nilai lama dipakai apa adanya (asal "lama"), kalau tidak bawaan; SATU peringatan
    def mati(): raise OSError("jaringan putus")
    def tolak(): raise galat(503)
    for hari, pakai in ((-2, False), (-1, True), (0, True), (3, True), (7, True), (8, False), (60, False)):
        for gagal in (mati, tolak):
            peri.clear()
            d = susun(ok, penuh, sekian(hari), log.append, ambil_jeda=gagal, peringatan=peri.append)
            assert len(peri) == 1 and peri[0].startswith("::warning title=TLE jeda::") and "\n" not in peri[0], (hari, peri)
            if pakai:
                assert d["satelit"] == penuh["satelit"] and d["jeda"] == {**penuh["jeda"], "asal": "lama"}, (hari, d["jeda"])
                assert "jeda lama sampai 2026-11-20" in peri[0]
            else:
                assert d["jeda"] == JEDA_KOSONG
                for e in d["satelit"]:
                    cek_bawaan(e)
                assert "bawaan" in peri[0]
    # nilai lama tidak pernah memperpanjang umurnya sendiri: jalan gagal ke-2 (hari 8) tak menghidupkan lagi apa yang dibawa di hari 3
    peri.clear()
    d1 = susun(ok, penuh, sekian(3), log.append, ambil_jeda=mati, peringatan=peri.append)
    d2 = susun(ok, d1, sekian(8), log.append, ambil_jeda=mati, peringatan=peri.append)
    assert d1["jeda"]["sampai"] == "2026-11-20" and d1["jeda"]["asal"] == "lama" and d2["jeda"] == JEDA_KOSONG and all(e["jeda_sumber"] == "bawaan" for e in d2["satelit"])
    # tle.json lama tanpa blok jeda (format sebelum kontrak ini) atau berbentuk aneh -> bawaan, tetap satu peringatan, tidak melempar
    for lama_aneh in (None, [], "x", {}, {"satelit": penuh["satelit"]}, {"jeda": None}, {"jeda": {"dari": "x", "sampai": "y"}}, {"jeda": 5, "satelit": 5},
                      {**penuh, "jeda": {**penuh["jeda"], "hari": 0}}, {**penuh, "jeda": {**penuh["jeda"], "hari": 5}},   # hari tak cocok dengan dari..sampai
                      {**penuh, "jeda": {**penuh["jeda"], "dari": "2026-12-01"}}):
        peri.clear()
        d = susun(ok, lama_aneh, s2, log.append, ambil_jeda=mati, peringatan=peri.append)
        assert len(peri) == 1 and all(e["jeda_sumber"] == "bawaan" for e in d["satelit"]) and d["jeda"] == JEDA_KOSONG, (lama_aneh, peri)
    # entri lama dipakai per satelit hanya bila masih lolos ambang, bertanda terukur, dan jeda_kode-nya cocok
    def rusak_entri(i, **kw):
        t = json.loads(json.dumps(penuh))
        t["satelit"][i].update(kw)
        return t
    for kw in (dict(jeda_data_menit=59), dict(jeda_data_menit=721, jeda_p90_menit=721), dict(jeda_p90_menit=721), dict(jeda_p90_menit=204), dict(jeda_n=13),
               dict(jeda_sumber="bawaan"), dict(jeda_data_menit="205"), dict(jeda_n=None), dict(jeda_kode="M"), dict(jeda_kode=None), dict(jeda_kode="N21")):
        peri.clear()
        pn = per_nama(susun(ok, rusak_entri(0, **kw), s2, log.append, ambil_jeda=mati, peringatan=peri.append))
        cek_bawaan(pn["NOAA-20"])
        assert pn["NOAA-21"]["jeda_sumber"] == "terukur" and pn["Terra"]["jeda_sumber"] == "terukur", kw
    for kw in (dict(jeda_n=14), dict(jeda_data_menit=60, jeda_p90_menit=720), dict(jeda_data_menit=720, jeda_p90_menit=720), dict(jeda_p90_menit=205)):
        pn = per_nama(susun(ok, rusak_entri(0, **kw), s2, log.append, ambil_jeda=mati, peringatan=peri.append))
        assert pn["NOAA-20"]["jeda_sumber"] == "terukur" and pn["NOAA-20"]["jeda_kode"] == "N20", kw
    # endpoint menjawab mengalahkan tle.json lama
    d = susun(ok, penuh, s2, log.append, ambil_jeda=lambda: balasan(N20=sen(140, 22, 250, 400)), peringatan=peri.append)
    assert per_nama(d)["NOAA-20"]["jeda_data_menit"] == 250 and per_nama(d)["NOAA-20"]["jeda_p90_menit"] == 400 and d["jeda"]["asal"] == "endpoint"

    # 8f. JSON rusak / bentuk salah: sama dengan gagal tarik (tanpa tle lama -> bawaan, dengan tle lama segar -> nilai lama), satu peringatan
    salah = {"kosong": "", "bukan JSON": "{rusak", "HTML": "<html><body>Not found</body></html>", "null": "null", "angka": "42", "larik": "[]",
             "tanpa sensor": '{"hari": 30}', "sensor larik": '{"sensor": []}',
             "tanpa N20": ubah(lambda x: x["sensor"].pop("N20")), "tanpa N21": ubah(lambda x: x["sensor"].pop("N21")),
             "tanpa M": ubah(lambda x: x["sensor"].pop("M")), "M bukan objek": ubah(lambda x: x["sensor"].update(M=5)),
             "tanpa sampai": ubah(lambda x: x.pop("sampai")), "tanpa dari": ubah(lambda x: x.pop("dari")),
             "sampai bukan waktu": ubah(lambda x: x.update(sampai="kemarin")), "sampai angka": ubah(lambda x: x.update(sampai=5)),
             "dari sesudah sampai": ubah(lambda x: x.update(dari="2026-12-01T00:00:00Z")),
             "hari nol": ubah(lambda x: x.update(hari=0)), "hari 367": ubah(lambda x: x.update(hari=367)), "hari teks": ubah(lambda x: x.update(hari="30")),
             "hari true": ubah(lambda x: x.update(hari=True)), "tanpa hari": ubah(lambda x: x.pop("hari")),
             "hari 29 tak cocok": ubah(lambda x: x.update(hari=29)), "hari 33 tak cocok": ubah(lambda x: x.update(hari=33)),
             "NaN": balasan().replace('"hari": 30', '"hari": NaN'),
             "tanpa mulai_catat padahal ada terukur": ubah(lambda x: x.pop("mulai_catat")),
             "mulai_catat null padahal ada terukur": ubah(lambda x: x.update(mulai_catat=None)),
             "mulai_catat bukan waktu": ubah(lambda x: x.update(mulai_catat="kemarin")), "mulai_catat angka": ubah(lambda x: x.update(mulai_catat=5)),
             "mulai_catat sesudah sampai": ubah(lambda x: x.update(mulai_catat="2026-11-25T00:00:00Z"))}
    for nama, teks in salah.items():
        peri.clear()
        d = susun(ok, None, s2, log.append, ambil_jeda=lambda t=teks: t, peringatan=peri.append)
        assert len(peri) == 1 and peri[0].startswith("::warning title=TLE jeda::"), (nama, peri)
        assert d is not None and all(e["jeda_sumber"] == "bawaan" for e in d["satelit"]) and d["jeda"] == JEDA_KOSONG, nama
        peri.clear()
        d = susun(ok, penuh, sekian(2), log.append, ambil_jeda=lambda t=teks: t, peringatan=peri.append)
        assert len(peri) == 1 and d["satelit"] == penuh["satelit"] and d["jeda"] == {**penuh["jeda"], "asal": "lama"}, (nama, peri)
    # BOM dan spasi di sekitar JSON tidak membuatnya "rusak"
    d = susun(ok, None, s2, log.append, ambil_jeda=lambda: "  \n" + balasan() + "\n", peringatan=peri.append)
    assert d["jeda"]["sampai"] == "2026-11-20"

    # 8g. elemen orbit tetap satu-satunya alasan gagal: CelesTrak mati -> None walau riwayat jeda sehat; endpoint mati tak menggagalkan
    assert susun(lambda n: (_ for _ in ()).throw(OSError("mati")), None, s2, log.append, ambil_jeda=balasan, peringatan=peri.append) is None
    assert susun(ok, None, s2, log.append, ambil_jeda=mati, peringatan=peri.append) is not None
    # entri TLE lama (tarik gagal) tetap menerima jeda terukur terbaru, bukan jeda lama dari entrinya
    d = susun(gagal_21, lama("26323.00000000"), s2, log.append, ambil_jeda=balasan, peringatan=peri.append)
    assert [e["nama"] for e in d["satelit"]] == ["NOAA-20", "NOAA-21", "Terra", "Aqua"] and d["satelit"][1]["epoch"] == "2026-11-19T00:00Z"
    assert (d["satelit"][1]["jeda_data_menit"], d["satelit"][1]["jeda_sumber"], d["satelit"][1]["jeda_kode"]) == (190, "terukur", "N21")

    # 8h. tarik_jeda: URL, timeout, satu percobaan (anggaran), baca dibatasi, 4xx/5xx dilempar
    def pembuka2(*urut):
        panggilan = []
        def buka(req, timeout=None):
            panggilan.append((req.full_url, timeout))
            x = urut[min(len(panggilan), len(urut)) - 1]
            if isinstance(x, BaseException):
                raise x
            return x
        return buka, panggilan
    tidur.clear()
    buka, pg = pembuka2(Balasan(b'{"x": 1}'))
    assert tarik_jeda(buka, tidur.append) == '{"x": 1}' and pg == [("https://centurisk97.id/api/satelit/jeda", 12)] and tidur == [], pg
    for kode in (400, 403, 404, 429, 500, 503):
        buka, pg = pembuka2(galat(kode))
        try:
            tarik_jeda(buka, tidur.append)
            raise AssertionError(f"HTTP {kode} harus dilempar")
        except urllib.error.HTTPError as ex:
            assert ex.code == kode
        assert len(pg) == 1 and tidur == [], (kode, pg, tidur)
    buka, pg = pembuka2(OSError("putus"))
    try:
        tarik_jeda(buka, tidur.append)
        raise AssertionError("galat jaringan harus dilempar")
    except OSError:
        pass
    assert len(pg) == 1 and tidur == []
    besar = Balasan(b"A" * 131072)
    buka, pg = pembuka2(besar)
    assert len(tarik_jeda(buka, tidur.append)) == 65536 and besar.n == 65536, "baca harus dibatasi"
    # unduh() umum tetap mengulang 5xx bila percobaan > 1 (CelesTrak) dan tidak mengulang 403/404/429
    buka, pg = pembuka2(galat(503), Balasan(b"ok"))
    assert unduh("https://x", 2, 5, buka, tidur.append) == "ok" and len(pg) == 2 and tidur == [3]
    tidur.clear()

    # 8i. main: terpasang ke tarik + tarik_jeda, menulis jeda; endpoint mati -> keluar normal + SATU peringatan di stderr; nol satelit -> keluar 1
    #     (balasan memakai jam nyata: kesegaran respons dicek terhadap hari ini)
    import contextlib, io
    kini = lambda: balasan_pada(dt.datetime.now(dt.timezone.utc))
    assert main.__defaults__[:2] == (tarik, tarik_jeda) and main.__defaults__[2].endswith("public/data/tle.json"), main.__defaults__
    with tempfile.TemporaryDirectory() as dirm:
        p1, p2, p3 = (os.path.join(dirm, x) for x in ("a.json", "b.json", "c.json"))
        with contextlib.redirect_stdout(io.StringIO()), contextlib.redirect_stderr(io.StringIO()) as err:
            main(ambil=ok, ambil_jeda=kini, keluar=p1, tunggu=0)
        tulis_a = json.load(open(p1, encoding="utf-8"))
        assert err.getvalue() == "" and tulis_a["jeda"]["asal"] == "endpoint" and tulis_a["jeda"]["arti"] == "tampil_di_aplikasi" and tulis_a["jeda"]["hari"] == 31
        assert [e["jeda_sumber"] for e in tulis_a["satelit"]] == ["terukur"] * 4 and [e["jeda_kode"] for e in tulis_a["satelit"]] == ["N20", "N21", "M", "M"]
        with contextlib.redirect_stdout(io.StringIO()), contextlib.redirect_stderr(io.StringIO()) as err:
            main(ambil=ok, ambil_jeda=mati, keluar=p2, tunggu=0)
        baris = err.getvalue().splitlines()
        assert len(baris) == 1 and baris[0].startswith("::warning title=TLE jeda::"), baris
        assert json.load(open(p2, encoding="utf-8"))["jeda"] == JEDA_KOSONG
        with contextlib.redirect_stdout(io.StringIO()), contextlib.redirect_stderr(io.StringIO()):
            try:
                main(ambil=lambda n: "bukan TLE", ambil_jeda=kini, keluar=p3, tunggu=0)
                raise AssertionError("nol satelit sah harus keluar kode 1")
            except SystemExit as ex:
                assert ex.code == 1
        assert not os.path.exists(p3) and sorted(os.listdir(dirm)) == ["a.json", "b.json"]

    terburuk = len(SATELIT) * (PERCOBAAN * TIMEOUT + (PERCOBAAN - 1) * JEDA_ULANG) + len(SATELIT) * JEDA_ANTAR \
        + JEDA_PERCOBAAN * JEDA_TIMEOUT + (JEDA_PERCOBAAN - 1) * JEDA_ULANG  # CelesTrak 4 satelit + satu tarik riwayat jeda
    assert terburuk < 150, f"anggaran terburuk {terburuk} dtk >= 150 (timeout-minutes 3 di data.yml)"
    print("tle: swa-uji lulus", file=sys.stderr)


if __name__ == "__main__":
    uji() if sys.argv[1:] == ["uji"] else main()
