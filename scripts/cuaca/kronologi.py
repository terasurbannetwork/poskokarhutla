"""Kronologi kejadian (H10): sinyal PERTAMA tiap sumber untuk satu kabupaten dalam satu jendela waktu. Studi kasus, bukan peringatan dan bukan validasi.

Pakai:  python3 scripts/cuaca/kronologi.py <kode_kab|nama> "<mulai WIB>" "<akhir WIB>" [--kejadian "YYYY-MM-DD HH:MM"] [--kec A,B] [--icao WIII,WIMM]
            [--himawari BERKAS.json | --unduh-himawari [--simpan BERKAS.json]] [--arsip BERKAS.json] [--metar-dir DIR] [--json]   |   ... uji
Waktu WIB "YYYY-MM-DD HH:MM". Kolom "menit sebelum": kejadian - sinyal; "N SESUDAH" = sinyal datang sesudah kejadian (tidak ada waktu tenggang).
Sumber: Himawari (scripts/udara/awan_tumbuh.py, A2), METAR arsip IEM (metar.embusan_badai, A1), peringatan BMKG terarsip (D1 cuaca_arsip, hasil SELECT hanya-baca
disimpan sebagai berkas), laporan harian Koordalops (hanya tanggal berkas dan nama kabupaten; tanpa nama, nomor, foto). Sumber tanpa arsip = "tidak terarsip".
Tidak ada ambang yang disetel di sini: semua ambang milik A1/A2 apa adanya.
"""
import csv, datetime as dt, glob, importlib, json, os, re, sys

AKAR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
WIB, UTC = dt.timezone(dt.timedelta(hours=7)), dt.timezone.utc
FIX = os.path.join(AKAR, "scripts/cuaca/fixture/kronologi")
sys.path.insert(0, os.path.join(AKAR, "scripts/udara"))
sys.path.insert(0, os.path.join(AKAR, "scripts/cuaca"))


def _muat(nama):   # modul sumber dimuat malas: metar/awan_tumbuh menarik modul lain
    return importlib.import_module(nama)


def wib(s):
    return dt.datetime.strptime(s, "%Y-%m-%d %H:%M").replace(tzinfo=WIB)


def ms(t):
    return dt.datetime.fromtimestamp(t / 1000, WIB)


def kab_cari(arg, semua):
    """kode (4 digit) atau nama persis ('Bandung' = Kab. Bandung, 'Kota Bandung'); awalan 'Kab.' dibuang. -> (kode, nama, titik)"""
    if arg in semua:
        return (arg, *semua[arg])
    n = re.sub(r"^kab\.?\s*", "", arg.strip(), flags=re.I).lower()
    ada = [k for k, (nm, _) in semua.items() if nm.lower() == n]
    if len(ada) != 1:
        raise SystemExit(f"kabupaten '{arg}' {'tidak ditemukan' if not ada else 'ambigu: ' + ','.join(ada)}")
    return (ada[0], *semua[ada[0]])


def kec_nama(kode, nama):
    """Kecamatan kab itu MINUS nama yang juga dipakai kab lain di provinsi sama (mis. Pameungpeuk Bandung/Garut, Sukasari): teks BMKG hanya memuat nama, tanpa kab."""
    ft = json.load(open(os.path.join(AKAR, f"public/geo/kecamatan/{kode[:2]}.json")))["features"]
    ini = {f["properties"]["kec"].upper() for f in ft if f["properties"]["kab"] == nama}
    lain = {f["properties"]["kec"].upper() for f in ft if f["properties"]["kab"] != nama}
    return ini - lain


# ---- Himawari -------------------------------------------------------------------------------------------------------------------------------------------
def langkah(w0, w1):
    t = w0.astimezone(UTC).replace(second=0, microsecond=0)
    t = t.replace(minute=t.minute // 30 * 30)
    while t <= w1.astimezone(UTC):
        yield t
        t += dt.timedelta(minutes=30)


def _aman(f, t, kab):   # pindaian hilang di S3 = kosong (langkah itu dilewati), bukan seluruh run gagal
    try:
        return f(t, kab)
    except Exception as e:
        print(f"pindaian {t:%Y-%m-%d %H:%MZ} gagal: {e}", file=sys.stderr)
        return {}, 0, 0.0


def himawari_unduh(kode, titik, w0, w1, benang=12):
    """Pindaian (t dan t-30) diunduh paralel (satu sambungan ke NOAA S3 ~50 KB/s di jaringan ini), lalu nilai dihitung berurutan dari cache awan_tumbuh."""
    from concurrent.futures import ThreadPoolExecutor
    hw, at = _muat("awan_himawari"), _muat("awan_tumbuh")
    kab = {kode: ("", titik)}
    asli = hw.ambil
    hw.ambil = lambda url, coba=3: (lambda r: (print(f"unduh {url[-45:-8]} {len(r) / 1e6:.1f} MB", file=sys.stderr, flush=True), r)[1])(asli(url, coba))
    at._CACHE.clear()   # kunci cache awan_tumbuh hanya waktu, bukan kab: jangan bawa hasil kab lain
    ts = list(langkah(w0, w1))
    perlu = sorted({t for x in ts for t in (x, x - dt.timedelta(minutes=30))})
    hw._param_awal(perlu[0])   # parameter proyeksi diisi sekali sebelum benang jalan
    with ThreadPoolExecutor(benang) as ex:
        for t, h in zip(perlu, ex.map(lambda t: _aman(hw.proses, t, kab), perlu)):
            at._CACHE[t] = h
    out = {}
    for t in ts:
        isi = at.hitung(t, kab)[0]
        if kode in isi:
            out[t.strftime("%Y-%m-%dT%H:%MZ")] = isi[kode]
    return out


def himawari(langkah_utc, w0, w1):
    """{waktu UTC: nilai} -> baris pertama 'tumbuh' dan 'puncak_tembus' dalam jendela (waktu = jam nominal pindaian)."""
    r = []
    for k in ("tumbuh", "puncak_tembus"):
        for s, v in sorted(langkah_utc.items()):
            t = dt.datetime.strptime(s, "%Y-%m-%dT%H:%MZ").replace(tzinfo=UTC)
            if w0 <= t <= w1 and v[k]:
                r.append((f"Himawari {k}", t, f"Tb_min {v['tb_min_k']} K, delta {v['delta_k']} K per 30 mnt; jam pindaian nominal, data tersedia ~10-20 mnt kemudian"))
                break
        else:
            r.append((f"Himawari {k}", None, "tidak terpicu dalam jendela"))
    return r


# ---- METAR ----------------------------------------------------------------------------------------------------------------------------------------------
def metar_baca(berkas):
    """CSV IEM (station,valid,metar; valid UTC) -> [(raw, UTC naif)]"""
    return [(b["metar"], dt.datetime.strptime(b["valid"], "%Y-%m-%d %H:%M")) for b in csv.DictReader(open(berkas)) if b.get("metar")]


def metar(icao, w0, w1, dirm):
    fs = sorted(glob.glob(os.path.join(dirm, f"metar_{icao}_*.csv")))
    lap = [x for f in fs for x in metar_baca(f)]
    if not lap:
        return [(f"METAR {icao}", None, "tidak terarsip")]
    a, b = w0.astimezone(UTC).replace(tzinfo=None), w1.astimezone(UTC).replace(tzinfo=None)
    ev = [e for e in _muat("metar").embusan_badai(lap) if a <= dt.datetime.strptime(e["waktu"], "%Y-%m-%dT%H:%MZ") <= b]
    if not ev:
        return [(f"METAR {icao}", None, f"tidak ada embusan_badai ({len(lap)} laporan arsip)")]
    e = ev[0]
    return [(f"METAR {icao}", dt.datetime.strptime(e["waktu"], "%Y-%m-%dT%H:%MZ").replace(tzinfo=UTC),
             f"embusan_badai dT {e['dT']}, dQ {e['dQ']}, arah {e['arah_sebelum']}->{e['arah_sesudah']}, G {e['embusan_kmj']} km/jam, kuat={e['kuat']}")]


# ---- Peringatan BMKG terarsip ----------------------------------------------------------------------------------------------------------------------------
def bmkg(baris, kode, titik, kecs, fokus, w0, w1):
    """baris cuaca_arsip. Aturan NAMA: teks wilayah memuat kecamatan kab itu dan prov cocok. Aturan KOTAK: bbox memuat titik contoh kab (poligon arsip hanya
    <= 8 dari <= 20 cincin, jadi uji titik-dalam-poligon TIDAK sah; bbox kasar = lebih longgar, bukan bukti cakupan)."""
    prov = lambda r: kode[:2] in (r["prov"] or "").split(",")
    nama = lambda r: set(re.split(r",\s*", (r["wilayah"] or "").upper())) & kecs
    kotak = lambda r: bool(r["bbox"]) and any(b[0] <= lo <= b[2] and b[1] <= la <= b[3] for la, lo in titik for b in [json.loads(r["bbox"])])
    daftar = ([(f"BMKG nama {'/'.join(fokus)}", lambda r: prov(r) and bool(set(fokus) & nama(r)), set(fokus), "kecamatan fokus disebut di teks wilayah")] if fokus else []) + [
        ("BMKG nama kab", lambda r: prov(r) and bool(nama(r)), kecs, "kecamatan kab disebut di teks wilayah"),
        ("BMKG kotak kab", lambda r: prov(r) and kotak(r), set(), "hanya bbox memuat titik kab; BUKAN bukti poligon mencakup")]
    out = []
    for judul, f, himp, cat in daftar:
        c = sorted((r for r in baris if w0 <= ms(r["mulai"]) <= w1 and f(r)), key=lambda r: r["mulai"])
        if not c:
            out.append((judul, None, "tidak ada dalam jendela"))
            continue
        r = c[0]
        d = ", ".join(sorted(nama(r) & himp)[:5])
        out.append((judul, ms(r["mulai"]), f"{cat}{' (' + d + ')' if d else ''}; berlaku {ms(r['mulai']):%H:%M}, sistem kita pertama melihat {ms(r['pertama_dilihat']):%H:%M} WIB"))
    return out


# ---- Laporan harian Koordalops (tanggal berkas + nama kab saja) --------------------------------------------------------------------------------------
def laporan(nama, w0):
    """Berkas wa-koordalops.txt harian (diterima ~07:00 WIB pada tanggal berkas). Judul entri: 'Bencana ... di Kab./Kota <nama> *(Kejadian Baru|Pengkinian Data)*'."""
    pola = re.compile(r"di (Kab\.|Kota) ([^*\n(]+?)\s*\*\((Kejadian Baru|Pengkinian [Dd]ata)\)\*")
    for f in sorted(glob.glob(os.path.join(AKAR, "data/laporan-bnpb/harian/*/*/wa-koordalops.txt"))):
        h = os.path.basename(os.path.dirname(f))
        if h < f"{w0:%Y-%m-%d}":
            continue
        for aw, nm, jenis in pola.findall(open(f, encoding="utf-8").read()):
            if ((nm.strip().lower() == nama.lower()) if aw == "Kab." else ((aw + " " + nm.strip()).lower() == nama.lower())):
                return [("Laporan Koordalops (berkas harian)", dt.datetime.strptime(h, "%Y-%m-%d").replace(hour=7, tzinfo=WIB),
                         f"berkas tgl {h}, entri '{jenis.lower()}'; hanya tanggal berkas, jam 07:00 = batas atas penerimaan")]
    return [("Laporan Koordalops (berkas harian)", None, "tidak ada entri kabupaten ini dalam arsip repo")]


# ---- rakit ---------------------------------------------------------------------------------------------------------------------------------------------------
def rakit(arg, mulai, akhir, kejadian=None, fokus=(), icao=(), himawari_data=None, arsip=None, dirm=FIX):
    w0, w1 = wib(mulai), wib(akhir)
    kode, nama, titik = kab_cari(arg, _muat("awan_himawari").titik_kab())
    kecs = kec_nama(kode, nama)
    bar = himawari(himawari_data, w0, w1) if himawari_data is not None else [("Himawari", None, "tidak diminta")]
    for i in icao:
        bar += metar(i, w0, w1, dirm)
    bar += bmkg(arsip, kode, titik, kecs, [x.upper() for x in fokus], w0, w1) if arsip is not None else [("BMKG", None, "tidak terarsip (berkas arsip tidak diberikan)")]
    bar += laporan(nama, w0)
    k = wib(kejadian) if kejadian else None
    return {"kab": f"{kode} {nama}", "jendela_wib": [mulai, akhir], "kejadian_wib": kejadian,
            "baris": [{"sumber": s, "sinyal_wib": t.astimezone(WIB).strftime("%Y-%m-%d %H:%M") if t else None,
                       "mnt_sebelum": round((k - t).total_seconds() / 60) if (k and t) else None, "catatan": c} for s, t, c in bar]}


def tabel(r):
    s = [f"Kabupaten {r['kab']}; jendela {r['jendela_wib'][0]} s.d. {r['jendela_wib'][1]} WIB; kejadian {r['kejadian_wib'] or 'tanpa jam'}", "",
         "| Sumber | Sinyal pertama (WIB) | Menit sebelum kejadian | Catatan |", "| --- | --- | --- | --- |"]
    for b in r["baris"]:
        m = b["mnt_sebelum"]
        s.append(f"| {b['sumber']} | {b['sinyal_wib'] or '-'} | {'-' if m is None else (str(m) if m >= 0 else f'{-m} SESUDAH')} | {b['catatan']} |")
    return "\n".join(s)


def uji():
    sem = _muat("awan_himawari").titik_kab()
    assert kab_cari("Bandung", sem)[0] == "3219" and kab_cari("Kota Bandung", sem)[0] == "3216" and kab_cari("Kab. Aceh Tamiang", sem)[0] == "1115" and kab_cari("3224", sem)[1] == "Bandung Barat"
    assert {"CIWIDEY", "PASIRJAMBU", "RANCABALI"} <= kec_nama("3219", "Bandung")
    h = himawari({"2026-11-14T06:30Z": {"tumbuh": True, "puncak_tembus": False, "tb_min_k": 230.0, "delta_k": -9.0},
                  "2026-11-14T07:00Z": {"tumbuh": True, "puncak_tembus": True, "tb_min_k": 204.0, "delta_k": -27.0}}, wib("2026-11-14 12:00"), wib("2026-11-14 18:00"))
    assert h[0][1].astimezone(WIB).strftime("%H:%M") == "13:30" and h[1][1].astimezone(WIB).strftime("%H:%M") == "14:00"   # logika pilih, sintetis
    # data nyata tersimpan: arsip D1 12-18 Nov, Himawari NOAA S3, METAR IEM, berkas Koordalops repo
    arsip = json.load(open(os.path.join(FIX, "cuaca_arsip_9-18nov.json")))["baris"]
    hb = json.load(open(os.path.join(FIX, "himawari_3219_20261114.json")))
    r = rakit("Bandung", "2026-11-14 00:00", "2026-11-14 18:00", "2026-11-14 14:30", ("Ciwidey", "Pasirjambu", "Rancabali"), (), hb, arsip)
    b = {x["sumber"]: x for x in r["baris"]}
    assert b["Himawari tumbuh"]["sinyal_wib"] == "2026-11-14 13:30" and b["Himawari tumbuh"]["mnt_sebelum"] == 60, b["Himawari tumbuh"]
    assert b["Himawari puncak_tembus"]["sinyal_wib"] == "2026-11-14 14:30" and b["Himawari puncak_tembus"]["mnt_sebelum"] == 0
    f = b["BMKG nama CIWIDEY/PASIRJAMBU/RANCABALI"]
    assert f["sinyal_wib"] == "2026-11-14 15:20" and f["mnt_sebelum"] == -50, f
    assert b["Laporan Koordalops (berkas harian)"]["sinyal_wib"] == "2026-11-15 07:00"
    assert metar("WICC", wib("2026-11-14 00:00"), wib("2026-11-14 23:59"), FIX)[0][2] == "tidak terarsip"
    if os.path.exists(os.path.join(FIX, "metar_WIII_20261111_20261118.csv")):
        e = metar("WIII", wib("2026-11-17 00:00"), wib("2026-11-17 23:59"), FIX)[0]
        assert e[1] and e[1].astimezone(WIB).strftime("%H:%M") == "13:24", e   # kasus uji wajib A1
    print("ok kronologi")


def main():
    a = sys.argv[1:]
    if a == ["uji"]:
        return uji()
    if len(a) < 3:
        raise SystemExit(__doc__)
    op = {"--kejadian": None, "--kec": "", "--icao": "", "--himawari": None, "--arsip": None, "--metar-dir": FIX, "--simpan": None}
    i, unduh, js = 3, False, False
    while i < len(a):
        if a[i] == "--unduh-himawari":
            unduh = True
        elif a[i] == "--json":
            js = True
        else:
            op[a[i]] = a[i + 1]
            i += 1
        i += 1
    hd = None
    if op["--himawari"]:
        hd = json.load(open(op["--himawari"]))
    elif unduh:
        kode, _, titik = kab_cari(a[0], _muat("awan_himawari").titik_kab())
        hd = himawari_unduh(kode, titik, wib(a[1]), wib(a[2]))
        if op["--simpan"]:
            json.dump(hd, open(op["--simpan"], "w"), ensure_ascii=False, indent=0)
    ar = json.load(open(op["--arsip"]))["baris"] if op["--arsip"] else None
    r = rakit(a[0], a[1], a[2], op["--kejadian"], [x for x in op["--kec"].split(",") if x], [x for x in op["--icao"].split(",") if x], hd, ar, op["--metar-dir"])
    print(json.dumps(r, ensure_ascii=False, indent=1) if js else tabel(r))


if __name__ == "__main__":
    main()
