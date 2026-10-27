"""Elemen orbit (TLE) empat satelit pendeteksi titik panas dari CelesTrak -> public/data/tle.json

Pakai:  python3 scripts/data/tle.py        tarik 4 satelit (satu GET per satelit), tulis public/data/tle.json
        python3 scripts/data/tle.py uji    swa-uji tanpa jaringan (checksum, epoch, bentuk JSON, aturan gagal)

Layar "Satelit berikutnya melintas pukul ..." menghitung lintasan di peramban (satellite.js). CelesTrak tidak mengirim header
CORS, jadi pipeline yang menyalin. Satelit (urut): NOAA-20, NOAA-21 (VIIRS), Terra, Aqua (MODIS). S-NPP sengaja tidak ada
(produknya berhenti 1 Nov 2026 20.00 WIB). Tiga konstanta per satelit ikut disimpan supaya layar membaca apa adanya:
  setengah_sapuan_km = lebar sapuan sensor / 2 (VIIRS 1520, MODIS 1165);
  jeda_data_menit    = jeda aman titik tiba di FIRMS sesudah lintas, terukur 27 Okt 2026 (VIIRS +-2,5-3 j, MODIS +-1-2 j).

Aturan gagal: tiap pasangan baris divalidasi (baris 1 mulai "1 ", baris 2 mulai "2 ", panjang 69, hanya [0-9A-Z .+-], nomor
katalog cocok, checksum mod 10 kedua baris). Tarik: timeout 15 dtk, baca <= 64 KB, 2 percobaan, HTTP 403/404/429 tidak diulang;
anggaran terburuk 4 satelit 136 dtk (< timeout-minutes 3 di data.yml, dijaga swa-uji). Satelit yang gagal ditarik/valid
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


def tarik(norad, buka=urllib.request.urlopen, tidur=time.sleep):
    """Satu GET ke CelesTrak (maks PERCOBAAN kali, baca <= BACA_MAKS byte). HTTP 403/404/429 tidak diulang. Mengembalikan teks balasan."""
    for i in range(PERCOBAAN):
        try:
            with buka(urllib.request.Request(URL.format(norad), headers=UA), timeout=TIMEOUT) as r:
                return r.read(BACA_MAKS).decode("utf-8", "replace")
        except urllib.error.HTTPError as ex:
            if ex.code in TANPA_ULANG or i == PERCOBAAN - 1:
                raise
            tidur(JEDA_ULANG)
        except Exception:
            if i == PERCOBAAN - 1:
                raise
            tidur(JEDA_ULANG)


def entri(nama, norad, sensor, sapuan, jeda, l1, l2):
    return {"nama": nama, "norad": norad, "sensor": sensor, "setengah_sapuan_km": sapuan, "jeda_data_menit": jeda,
            "epoch": iso(epoch_waktu(l1)), "tle": [l1, l2]}


def susun(ambil, lama, sekarang, pesan=print, jeda=0):
    """ambil(norad) -> teks CelesTrak. lama = isi tle.json sebelumnya (atau None). Mengembalikan dokumen, atau None bila nol satelit sah."""
    lama_per = {e.get("norad"): e for e in (lama or {}).get("satelit", []) if isinstance(e, dict)}
    umur_hari = lambda l1: (sekarang - epoch_waktu(l1)).total_seconds() / 86400
    hasil = []
    for nama, norad, sensor, sapuan, jmenit in SATELIT:
        e, asal = None, "baru"
        try:
            l1, l2 = ambil_tle(ambil(norad), norad)
            e = entri(nama, norad, sensor, sapuan, jmenit, l1, l2)
            if umur_hari(l1) >= UMUR_MAKS:
                pesan(f"::warning title=TLE {nama}::epoch CelesTrak sudah {umur_hari(l1):.1f} hari")
        except Exception as ex:
            asal = f"gagal ({ex})"
            try:  # entri lama divalidasi ulang dari barisnya sendiri; konstanta diambil dari konfigurasi sekarang
                l1, l2 = lama_per[norad]["tle"]
                cek_tle(l1, l2, norad)
                if umur_hari(l1) < UMUR_MAKS:
                    e, asal = entri(nama, norad, sensor, sapuan, jmenit, l1, l2), "lama (tarik gagal)"
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
    return {"dibuat": iso(sekarang), "sumber": "CelesTrak GP", "satelit": hasil}


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


def main():
    try:
        with open(KELUAR, encoding="utf-8") as f:
            lama = json.load(f)
    except Exception:
        lama = None
    doc = susun(tarik, lama, dt.datetime.now(dt.timezone.utc), jeda=JEDA_ANTAR)  # sopan ke CelesTrak
    if doc is None:
        print("::error title=TLE kosong::nol satelit sah; tle.json tidak ditimpa", file=sys.stderr)
        sys.exit(1)
    tulis(KELUAR, doc)
    print(f"{len(doc['satelit'])} satelit -> {KELUAR}")


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
    assert list(doc) == ["dibuat", "sumber", "satelit"] and doc["dibuat"] == "2026-10-27T14:25Z" and doc["sumber"] == "CelesTrak GP"
    assert [(e["nama"], e["norad"], e["sensor"], e["setengah_sapuan_km"], e["jeda_data_menit"]) for e in doc["satelit"]] == [
        ("NOAA-20", 43013, "VIIRS", 1520, 180), ("NOAA-21", 54234, "VIIRS", 1520, 180),
        ("Terra", 25994, "MODIS", 1165, 120), ("Aqua", 27424, "MODIS", 1165, 120)]
    for e in doc["satelit"]:
        assert list(e) == ["nama", "norad", "sensor", "setengah_sapuan_km", "jeda_data_menit", "epoch", "tle"], list(e)
        assert tuple(e["tle"]) == FIX[e["norad"]] and len(e["epoch"]) == 17 and e["epoch"].endswith("Z") and e["epoch"][10] == "T"
    assert doc["satelit"][2]["epoch"] == "2026-10-26T21:49Z" and len(log) == 4 and "umur  0.7 hari" in log[2], log
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
    terburuk = len(SATELIT) * (PERCOBAAN * TIMEOUT + (PERCOBAAN - 1) * JEDA_ULANG) + len(SATELIT) * JEDA_ANTAR
    assert terburuk < 150, f"anggaran terburuk {terburuk} dtk >= 150 (timeout-minutes 3 di data.yml)"
    print("tle: swa-uji lulus", file=sys.stderr)


if __name__ == "__main__":
    uji() if sys.argv[1:] == ["uji"] else main()
