"""Pengumpul prospektif M1 (docs/banjir/KRITERIA-M1.md, terkunci): hujan GSMaP per jam -> hari WIB dan label genangan.

  m1_kumpul.py uji                         self-check tanpa jaringan
  m1_kumpul.py hujan [--tanggal YYYY-MM-DD]  bawaan kemarin WIB; GSMAP_USER/GSMAP_PASS (hanya di Actions)
  m1_kumpul.py label [--tanggal YYYY-MM-DD] [--alasan TEKS]  bawaan kemarin WIB; PetaBencana + pos DSDA, tanpa kunci.
                                             --alasan dicatat di baris (workflow: label ditulis tanpa baris hujan karena umur >= 4 hari)
Kode keluar: 0 kemajuan atau baris sudah ada, 1 tanpa kemajuan (sumber belum siap/gagal; dicoba lagi besok), 2 login GSMaP gagal.

Keluaran, satu baris JSON per tanggal, APPEND-ONLY (data/banjir/genangan/):
  m1_hujan.jsonl  {tanggal, jendela_utc, produk{nama:jam}, pola(24 huruf G/N/-), jam_hilang, dikeluarkan, alasan, dibuat,
                   kec{"kab|kec": {mm, m1, m3, h}}}   mm = total harian, m1 = maks 1 jam, m3 = maks 3 jam berurutan,
                   h = jam yang selnya kosong (berkas jam itu hilang atau nilai < 0)
  m1_label.jsonl  {tanggal, dibuat, pb{ok, n_dki, kec{"kab|kec": {n, maks_cm}}},
                   dsda{status ok|gagal, cakupan_dari, kec{"kab|kec": {siaga (1..3, null = normal terpantau), n_pos}}}}
Aturan yang dipilih (dan alasannya):
- Hari WIB = 24 berkas jam UTC dari 17Z hari sebelumnya sampai 16Z; tanpa pergeseran hari UTC (kriteria M1).
- Per jam produk pertama yang punya berkas: NRT gauge (/realtime_ver/v8/hourly_G), lalu NRT (/realtime_ver/v8/hourly).
  Produk tiap jam dicatat di `pola` (G = gauge, N = biasa, - = hilang).
- Hilang 1-3 jam: baris hanya ditulis bila semuanya sudah lengkap ATAU hari itu >= 3 hari lalu (NRT sering telat; workflow
  mencoba lagi tiga hari). Hilang > 3 jam: ditulis hanya sesudah 3 hari, dengan dikeluarkan=true + alasan (kriteria: dikeluarkan
  dan dicatat); sebelum itu dilewati (kode 1) supaya bisa pulih. Baris append-only tak bisa diperbaiki kemudian.
- Label: laporan PetaBencana gagal diambil = BARIS DILEWATI (kode 1), coba lagi besok; tidak pernah menulis nol diam-diam.
  DSDA hanya pendamping: gagal = baris tetap ditulis dengan dsda.status "gagal".
- DSDA: tertinggi per kecamatan dihitung dari deret pos 24 jam (/pos/<id>) terhadap ambang siaga pos; cakupan deret hanya 24 jam
  terakhir, jadi tanggal yang lebih tua dari itu tercakup sebagian atau tidak (dsda.cakupan_dari mencatat awal deret, WIB).
- Tanggal belum selesai (>= hari ini WIB) ditolak, sehingga label tak pernah lebih awal dari 24 jam sejak hari itu mulai.
"""
import datetime as dt, ftplib, json, os, re, subprocess, sys, time, urllib.parse
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from bersama import AKAR, WIB, KecDKI, ambil_json
import gsmap, petabencana
import pemicu

DIR = os.environ.get("M1_DIR") or os.path.join(AKAR, "data/banjir/genangan")   # M1_DIR hanya untuk uji lokal
HUJAN = os.path.join(DIR, "m1_hujan.jsonl")
LABEL = os.path.join(DIR, "m1_label.jsonl")
NRT = [("nrt_gauge_v8", "G", "/realtime_ver/v8/hourly_G"), ("nrt_v8", "N", "/realtime_ver/v8/hourly")]
API = "https://centurisk97.id/api/banjir/sungai-ukur"
HILANG_MAKS = 3        # kriteria M1: lebih dari 3 jam hilang = hari dikeluarkan
TUNGGU_HARI = 3        # sampai umur ini baris tak lengkap ditunda, sesudahnya ditulis apa adanya (ditandai)
MAKS_MM_JAM = 300.0    # satu sel di atas ini per jam = satuan/format salah, hari ditolak
KOTAK = gsmap.KOTAK_HARIAN


def kec_daratan():
    """-> [(kunci, lat, lon)] 42 kecamatan DKI daratan (Kepulauan Seribu dikeluarkan)."""
    return [k for k in pemicu.kecamatan() if "SERIBU" not in k[0].upper()]


def kemarin():
    return dt.datetime.now(WIB).date() - dt.timedelta(days=1)


def jam_wib(tgl):
    """24 (tanggal UTC, jam UTC): 17Z hari sebelumnya sampai 16Z = hari WIB tgl 00.00-23.59."""
    a = dt.datetime.combine(tgl, dt.time(0), WIB).astimezone(dt.timezone.utc)
    return [(a + dt.timedelta(hours=i)).replace(tzinfo=None) for i in range(24)]


# ------------------------------------------------------------------ JSONL append-only
def baca_jsonl(jalur):
    if not os.path.exists(jalur):
        return []
    return [json.loads(b) for b in open(jalur, encoding="utf-8") if b.strip()]


def periksa_baris(r, ada, jenis, kunci_kec=None, sekarang=None):
    """Menolak baris yang tak sah SEBELUM ditulis. ada = set tanggal yang sudah ada."""
    sekarang = sekarang or dt.datetime.now(WIB).date()
    t = dt.date.fromisoformat(r["tanggal"])
    if t in ada:
        raise ValueError(f"{r['tanggal']} sudah ada: baris lama tidak boleh ditimpa")
    if t >= sekarang:
        raise ValueError(f"{r['tanggal']} belum selesai (hari ini WIB {sekarang}) atau di masa depan")
    luar = set(r["kec"] if jenis == "hujan" else r["pb"]["kec"]) - set(kunci_kec)
    if luar:
        raise ValueError(f"kecamatan di luar daftar 42: {sorted(luar)[:3]}")
    if jenis == "hujan":
        if set(r["kec"]) != set(kunci_kec):
            raise ValueError("hujan harus memuat tepat 42 kecamatan")
        if r["jam_hilang"] > HILANG_MAKS and not r.get("dikeluarkan"):
            raise ValueError(f"{r['jam_hilang']} jam hilang > {HILANG_MAKS} tanpa penanda dikeluarkan")
    elif r["dsda"].get("kec") and set(r["dsda"]["kec"]) - set(kunci_kec):
        raise ValueError("kecamatan DSDA di luar daftar 42")


def pastikan_tak_menyusut(jalur):
    """Arsip lokal harus diawali persis isi git HEAD (tidak menyusut, tidak berubah). Tanpa git/belum dilacak: lolos."""
    rel = os.path.relpath(jalur, AKAR)
    try:
        h = subprocess.run(["git", "-C", AKAR, "show", f"HEAD:{rel}"], capture_output=True, timeout=30)
    except (OSError, subprocess.SubprocessError):
        return
    if h.returncode != 0:
        return
    ini = open(jalur, "rb").read() if os.path.exists(jalur) else b""
    if not ini.startswith(h.stdout):
        raise SystemExit(f"{rel}: lebih pendek/berubah dibanding git HEAD, berhenti (arsip tak boleh menyusut)")


def tambah(jalur, r, jenis):
    os.makedirs(os.path.dirname(jalur), exist_ok=True)
    pastikan_tak_menyusut(jalur)
    periksa_baris(r, {dt.date.fromisoformat(x["tanggal"]) for x in baca_jsonl(jalur)}, jenis, [k for k, _, _ in kec_daratan()])
    with open(jalur, "a", encoding="utf-8") as f:
        f.write(json.dumps(r, ensure_ascii=False, separators=(",", ":")) + "\n")


def opsi(a, nama):
    return a[a.index(nama) + 1] if nama in a[:-1] else None


def tanggal_arg(a):
    t = opsi(a, "--tanggal")
    if t:
        return dt.date.fromisoformat(t)
    if a and not set(a) <= {"--alasan", opsi(a, "--alasan")}:
        sys.exit("pakai: ... [--tanggal YYYY-MM-DD]")
    return kemarin()


# ------------------------------------------------------------------ hujan
def cari_jam(f, folder, d, h, cache, kedalaman=3):
    """Jalur berkas jam (UTC d, jam h) di bawah folder; susunan folder dijelajah seperti gsmap.cari_harian."""
    isi = gsmap.isi_folder(f, folder, cache)
    c = [f"{folder}/{n}" for n in isi if gsmap.cocok(n, d, h)]
    if c or kedalaman == 0:
        return c[0] if c else None
    tgl = {f"{d:%Y}", f"{d:%m}", f"{d:%d}", f"{d:%Y%m}", f"{d:%Y%m%d}"}
    for n in [n for n in isi if n in tgl] + sorted(n for n in isi if "." not in n and not re.fullmatch(r"\d+", n)):
        r = cari_jam(f, f"{folder}/{n}", d, h, cache, kedalaman - 1)
        if r:
            return r
    return None


def unduh_jam(f, baru, jalur, ci, cj):
    for coba in range(3):
        try:
            return gsmap.baca_biner(gsmap.unduh_batas(f, jalur), ci, cj), f
        except (ValueError, AssertionError) as e:
            print(f"  {jalur}: {e}", file=sys.stderr)
            return None, f
        except ftplib.all_errors + (EOFError,) as e:
            print(f"  ulang {jalur}: {type(e).__name__}: {e}", file=sys.stderr)
            time.sleep(2 * (coba + 1))
            f = baru()
    return None, f


def maks_n(v, n):
    """Maks jumlah n jam berurutan (None = 0; kekosongan dicatat terpisah di h)."""
    x = [a or 0 for a in v]
    return round(max(sum(x[i:i + n]) for i in range(len(x) - n + 1)), 1)


def susun_hujan(tgl, jam, produk, sel, now=None):
    """jam: 24 larik sel (atau None bila berkas hilang); produk: 24 huruf G/N/-; sel: {kunci: indeks sel}. -> baris JSONL."""
    kec = {}
    for k, idx in sel.items():
        v = [None if j is None else j[idx] for j in jam]
        kec[k] = {"mm": round(sum(a or 0 for a in v), 1), "m1": round(max((a or 0 for a in v), default=0), 1),
                  "m3": maks_n(v, 3), "h": sum(a is None for a in v)}
    hilang = sum(j is None for j in jam)
    r = {"tanggal": tgl.isoformat(), "jendela_utc": f"{jam_wib(tgl)[0]:%Y-%m-%dT%HZ}..{jam_wib(tgl)[-1]:%Y-%m-%dT%HZ}",
         "produk": {n: produk.count(c) for n, c, _ in NRT if produk.count(c)}, "pola": produk, "jam_hilang": hilang,
         "dikeluarkan": hilang > HILANG_MAKS, "dibuat": (now or dt.datetime.now(WIB)).isoformat(timespec="minutes"), "kec": kec}
    if r["dikeluarkan"]:
        r["alasan"] = f"{hilang} jam GSMaP hilang (> {HILANG_MAKS}), hari dikeluarkan dari uji (KRITERIA-M1)"
    return r


def indeks_sel():
    ci, cj = gsmap.indeks_sel(KOTAK)
    g = {"meta": {"grid": {"lon": [lo for _, lo in ci], "lat": [la for _, la in cj]}}}
    return ci, cj, {k: pemicu.sel_gsmap(g, la, lo)[0] for k, la, lo in kec_daratan()}


def ringkasan(jam):
    v = [x for j in jam if j for x in j if x is not None]
    return f"{len(v)} nilai sel: maks {max(v, default=0)} mm/jam, rata-rata {round(sum(v) / len(v), 3) if v else None} mm/jam"


def hujan(tgl):
    if tgl >= dt.datetime.now(WIB).date():
        print(f"{tgl} belum selesai", file=sys.stderr)
        return 1
    if str(tgl) in {r["tanggal"] for r in baca_jsonl(HUJAN)}:
        print(f"hujan {tgl} sudah ada, dilewati")
        return 0
    user, sandi = os.environ.get("GSMAP_USER"), os.environ.get("GSMAP_PASS")
    if not user or not sandi:
        print("GSMAP_USER/GSMAP_PASS tidak ada di lingkungan (hanya di GitHub Actions).", file=sys.stderr)
        return 2
    try:
        f = gsmap.sambung(user, sandi)
    except ftplib.error_perm as e:
        print("login GSMaP gagal:", e, file=sys.stderr)
        return 2

    def baru():
        try:
            return gsmap.sambung(user, sandi)
        except ftplib.error_perm as e:
            print("login ulang GSMaP gagal:", e, file=sys.stderr)
            raise SystemExit(2)
    ci, cj, sel = indeks_sel()
    cache, jam, pola = {}, [], ""
    for w in jam_wib(tgl):
        isi, huruf = None, "-"
        for _, c, dasar in NRT:
            try:
                jalur = cari_jam(f, dasar, w.date(), w.hour, cache)
            except ftplib.all_errors + (EOFError,):
                f = baru()
                jalur = cari_jam(f, dasar, w.date(), w.hour, cache)
            if jalur:
                isi, f = unduh_jam(f, baru, jalur, ci, cj)
                if isi is not None:
                    huruf = c
                    break
        jam.append(isi)
        pola += huruf
    print(f"  {tgl} pola {pola}; {ringkasan(jam)}", file=sys.stderr)
    if any(x is not None and x > MAKS_MM_JAM for j in jam if j for x in j):
        print(f"  nilai > {MAKS_MM_JAM} mm/jam: satuan/format diragukan, hari ditolak", file=sys.stderr)
        return 1
    umur = (dt.datetime.now(WIB).date() - tgl).days
    hilang = pola.count("-")
    if hilang and umur < TUNGGU_HARI:
        print(f"  {hilang} jam belum ada, umur {umur} hari < {TUNGGU_HARI}: tunggu, coba lagi", file=sys.stderr)
        return 1
    if hilang == 24:
        print("  tidak ada berkas sama sekali", file=sys.stderr)
        return 1
    r = susun_hujan(tgl, jam, pola, sel)
    tambah(HUJAN, r, "hujan")
    print(f"hujan {tgl}: tertulis, jam hilang {hilang}, dikeluarkan {r['dikeluarkan']}")
    return 0


# ------------------------------------------------------------------ label
def laporan_pb(tgl):
    """Fitur laporan PetaBencana ID-JK satu hari WIB (batas 00.00 sampai 00.00 +0700)."""
    q = lambda d: urllib.parse.quote(f"{d.isoformat()}T00:00:00+0700")
    d = ambil_json(petabencana.URL % (q(tgl), q(tgl + dt.timedelta(days=1))))
    return [petabencana.ringkas(x) for x in d["result"]["features"]]


def agregat_pb(lap, tgl, kec, kunci_kec):
    """-> {kunci: {n, maks_cm}} untuk laporan yang jatuh di hari WIB tgl dan di dalam salah satu dari 42 kecamatan."""
    out = {}
    for r in lap:
        if r["t"][:10] != tgl.isoformat():
            continue
        c = kec.cari(r["lon"], r["lat"])
        k = c and f"{c[0]}|{c[1]}"
        if k not in kunci_kec:
            continue
        o = out.setdefault(k, {"n": 0, "maks_cm": 0})
        o["n"] += 1
        o["maks_cm"] = max(o["maks_cm"], r["kedalaman_cm"] or 0)
    return out


def level_siaga(v, ambang):
    """Nilai maksimum vs ambang pos {siaga3, siaga2, siaga1} -> 1 (tertinggi) .. 3, None = di bawah Siaga 3."""
    for n in (1, 2, 3):
        a = (ambang or {}).get(f"siaga{n}")
        if a is not None and v >= a:
            return n
    return None


def siaga_hari(tgl, pos, deret, kec, kunci_kec):
    """pos: daftar snapshot 'd:'; deret: {id: {t:[detik], v:[...]}} atau tidak ada. -> ({kunci: {siaga, n_pos}}, awal_deret_wib).
    Pos tanpa nilai pada hari itu tidak dihitung (bukan dianggap normal)."""
    a = dt.datetime.combine(tgl, dt.time(0), WIB).timestamp()
    out, awal = {}, None
    for p in pos:
        c = p.get("lon") is not None and kec.cari(p["lon"], p["lat"])
        k = c and f"{c[0]}|{c[1]}"
        if k not in kunci_kec or not p.get("ambang"):
            continue
        d = deret.get(p["id"])
        v = [x for t, x in zip(d["t"], d["v"]) if a <= t < a + 86400 and x is not None] if d else []
        if d and d["t"]:
            w = dt.datetime.fromtimestamp(min(d["t"]), WIB).isoformat(timespec="minutes")
            awal = min(awal, w) if awal else w
        if not v and p.get("t") is not None and a <= p["t"] < a + 86400 and p.get("v") is not None:
            v = [p["v"]]    # tanpa deret: snapshot terakhir bila jatuh di hari itu
        if not v:
            continue
        o = out.setdefault(k, {"siaga": None, "n_pos": 0})
        o["n_pos"] += 1
        s = level_siaga(max(v), p["ambang"])
        if s and (o["siaga"] is None or s < o["siaga"]):
            o["siaga"] = s
    return out, awal


def dsda(tgl, kec, kunci_kec):
    try:
        pos = [p for p in ambil_json(API, coba=3, batas_waktu=60)["pos"] if str(p.get("id", "")).startswith("d:")]
    except Exception as e:
        return {"status": "gagal", "alasan": str(e)[:160], "cakupan_dari": None, "kec": {}}
    deret = {}
    for p in pos:
        if not (p.get("lon") is not None and kec.cari(p["lon"], p["lat"])):
            continue
        try:
            deret[p["id"]] = ambil_json(f"{API}/pos/{urllib.parse.quote(p['id'])}", coba=1, batas_waktu=30)
        except Exception:
            pass    # deret opsional ("bila ada"); snapshot jadi cadangan
    ka, awal = siaga_hari(tgl, pos, deret, kec, kunci_kec)
    return {"status": "ok", "cakupan_dari": awal, "n_deret": len(deret), "kec": ka}


def label(tgl, alasan=None):
    if tgl >= dt.datetime.now(WIB).date():
        print(f"{tgl} belum selesai: label ditolak", file=sys.stderr)
        return 1
    if str(tgl) in {r["tanggal"] for r in baca_jsonl(LABEL)}:
        print(f"label {tgl} sudah ada, dilewati")
        return 0
    kunci_kec = {k for k, _, _ in kec_daratan()}
    kec = KecDKI()
    try:
        lap = laporan_pb(tgl)
    except Exception as e:
        print(f"PetaBencana gagal ({e}): baris dilewati, coba lagi besok", file=sys.stderr)
        return 1
    ag = agregat_pb(lap, tgl, kec, kunci_kec)
    r = {"tanggal": tgl.isoformat(), "dibuat": dt.datetime.now(WIB).isoformat(timespec="seconds"),
         "pb": {"ok": True, "sumber": "data.petabencana.id/reports/archive?admin=ID-JK", "n_ditarik": len(lap),
                "n_dki": sum(v["n"] for v in ag.values()), "kec": ag},
         "dsda": dsda(tgl, kec, kunci_kec)}
    if alasan:
        r["catatan"] = alasan
    tambah(LABEL, r, "label")
    print(f"label {tgl}: {r['pb']['n_dki']} laporan di {len(ag)} kecamatan, dsda {r['dsda']['status']} {len(r['dsda']['kec'])} kec")
    return 0


# ------------------------------------------------------------------ uji
def uji():
    import tempfile
    global HUJAN, LABEL
    kk = kec_daratan()
    kunci = [k for k, _, _ in kk]
    assert len(kk) == 42 and not any("SERIBU" in k.upper() for k in kunci), len(kk)
    # jendela WIB: 17Z hari sebelumnya .. 16Z
    j = jam_wib(dt.date(2026, 11, 2))
    assert len(j) == 24 and j[0] == dt.datetime(2026, 11, 1, 17) and j[-1] == dt.datetime(2026, 11, 2, 16), (j[0], j[-1])
    # susun_hujan: 3 jam hujan berurutan, satu jam hilang, 1 sel
    ci, cj, sel = indeks_sel()
    assert set(sel) == set(kunci)
    n = len(ci) * len(cj)
    jam = [[0.0] * n for _ in range(24)]
    s0 = sel[kunci[0]]
    for h, v in zip((5, 6, 7, 20), (10.0, 20.0, 5.0, 40.0)):
        jam[h][s0] = v
    jam[3] = None
    r = susun_hujan(dt.date(2026, 11, 2), jam, "G" * 3 + "-" + "N" * 20, sel)
    e = r["kec"][kunci[0]]
    assert e == {"mm": 75.0, "m1": 40.0, "m3": 40.0, "h": 1} and r["jam_hilang"] == 1 and not r["dikeluarkan"], e
    assert r["produk"] == {"nrt_gauge_v8": 3, "nrt_v8": 20} and len(r["kec"]) == 42
    assert susun_hujan(dt.date(2026, 11, 2), [None] * 4 + jam[4:], "-" * 4 + "N" * 20, sel)["dikeluarkan"]
    # periksa_baris menolak: menimpa, masa depan, kecamatan luar, hilang > 3 tanpa penanda
    hari_ini = dt.date(2026, 11, 3)
    periksa_baris(r, set(), "hujan", kunci, hari_ini)
    for buruk, ket in ((lambda: periksa_baris(r, {dt.date(2026, 11, 2)}, "hujan", kunci, hari_ini), "menimpa"),
                       (lambda: periksa_baris(r, set(), "hujan", kunci, dt.date(2026, 11, 2)), "masa depan"),
                       (lambda: periksa_baris(dict(r, kec={**r["kec"], "X|Y": e}), set(), "hujan", kunci, hari_ini), "luar 42"),
                       (lambda: periksa_baris(dict(r, jam_hilang=4, dikeluarkan=False), set(), "hujan", kunci, hari_ini), "hilang>3")):
        try:
            buruk()
            raise SystemExit("harus ditolak: " + ket)
        except ValueError:
            pass
    periksa_baris(dict(r, jam_hilang=4, dikeluarkan=True), set(), "hujan", kunci, hari_ini)
    # cari_jam dengan FTP palsu (layout YYYY/MM/DD, dan folder tak ada = 450)
    class Ftp(gsmap.FtpPalsu):
        def nlst(self, folder):
            if folder not in self.daftar:
                raise ftplib.error_temp("450 tidak ada")
            return self.daftar[folder]
    d = dt.date(2026, 11, 1)
    nm = "gsmap_nrt.20261101.1700.dat.gz"
    ft = Ftp({"/x": ["2025", "2026"], "/x/2026": ["10", "11"], "/x/2026/11": ["01"], "/x/2026/11/01": [nm]}, {})
    assert cari_jam(ft, "/x", d, 17, {}) == f"/x/2026/11/01/{nm}" and cari_jam(ft, "/x", d, 18, {}) is None
    assert cari_jam(ft, "/y", d, 17, {}) is None
    # label: agregat, siaga
    kec = KecDKI()
    c = kk[0]
    lap = [{"t": "2026-11-02T10:00:00+07:00", "lon": c[2], "lat": c[1], "kedalaman_cm": 30},
           {"t": "2026-11-02T11:00:00+07:00", "lon": c[2], "lat": c[1], "kedalaman_cm": None},
           {"t": "2026-11-01T23:59:00+07:00", "lon": c[2], "lat": c[1], "kedalaman_cm": 99},   # hari lain
           {"t": "2026-11-02T10:00:00+07:00", "lon": 107.5, "lat": -6.9, "kedalaman_cm": 50}]  # luar DKI
    ag = agregat_pb(lap, dt.date(2026, 11, 2), kec, set(kunci))
    assert ag == {c[0]: {"n": 2, "maks_cm": 30}}, ag
    assert level_siaga(100, {"siaga3": 90, "siaga2": 160, "siaga1": 210}) == 3 and level_siaga(220, {"siaga3": 90, "siaga2": 160, "siaga1": 210}) == 1
    assert level_siaga(10, {"siaga3": 90}) is None and level_siaga(10, None) is None
    a = dt.datetime(2026, 11, 2, tzinfo=WIB).timestamp()
    pos = [{"id": "d:1", "lon": c[2], "lat": c[1], "ambang": {"siaga3": 90, "siaga2": 160, "siaga1": 210}, "t": a + 5, "v": 1},
           {"id": "d:2", "lon": c[2], "lat": c[1], "ambang": {"siaga3": 90, "siaga2": 160, "siaga1": 210}, "t": a - 9999, "v": 999}]
    sg, awal = siaga_hari(dt.date(2026, 11, 2), pos, {"d:1": {"t": [a - 100, a + 100, a + 200], "v": [999, 100, 170]}}, kec, set(kunci))
    assert sg == {c[0]: {"siaga": 2, "n_pos": 1}} and awal, (sg, awal)    # d:2 tanpa nilai hari itu tak dihitung; 999 di luar hari
    # append-only nyata di berkas sementara
    with tempfile.TemporaryDirectory() as tmp:
        HUJAN, LABEL = os.path.join(tmp, "h.jsonl"), os.path.join(tmp, "l.jsonl")
        lama = dt.datetime.now(WIB).date() - dt.timedelta(days=2)
        r2 = dict(r, tanggal=lama.isoformat())
        tambah(HUJAN, r2, "hujan")
        isi = open(HUJAN).read()
        try:
            tambah(HUJAN, r2, "hujan")
            raise SystemExit("menimpa harus ditolak")
        except ValueError:
            pass
        assert open(HUJAN).read() == isi and len(baca_jsonl(HUJAN)) == 1
        lb = {"tanggal": lama.isoformat(), "pb": {"kec": ag}, "dsda": {"status": "gagal", "kec": {}}}
        tambah(LABEL, lb, "label")
        assert baca_jsonl(LABEL)[0]["pb"]["kec"] == ag
    # opsi baris perintah
    assert opsi(["--tanggal", "2026-11-02", "--alasan", "x y"], "--alasan") == "x y" and opsi(["--tanggal"], "--tanggal") is None
    assert tanggal_arg(["--tanggal", "2026-11-02", "--alasan", "x"]) == dt.date(2026, 11, 2) and tanggal_arg([]) == kemarin()
    # pastikan_tak_menyusut (dipakai m1_kumpul dan tangki.prakira): repo git sementara
    global AKAR
    asli_akar = AKAR
    with tempfile.TemporaryDirectory() as tmp:
        try:
            AKAR = tmp
            g = lambda *c: subprocess.run(["git", "-C", tmp, "-c", "user.name=u", "-c", "user.email=u@u", *c], capture_output=True, check=True)
            g("init", "-q")
            j = os.path.join(tmp, "a.jsonl")
            pastikan_tak_menyusut(j)                                   # belum dilacak: lolos
            open(j, "w").write('{"x":1}\n{"x":2}\n')
            g("add", "a.jsonl")
            g("commit", "-q", "-m", "a")
            pastikan_tak_menyusut(j)                                   # sama: lolos
            open(j, "a").write('{"x":3}\n')
            pastikan_tak_menyusut(j)                                   # bertambah: lolos
            for isi in ('{"x":1}\n', '{"x":9}\n{"x":2}\n{"x":3}\n'):  # menyusut / berubah
                open(j, "w").write(isi)
                try:
                    pastikan_tak_menyusut(j)
                    raise AssertionError("harus berhenti")
                except SystemExit as ex:
                    assert "menyusut" in str(ex.code), ex.code
            os.remove(j)                                               # hilang padahal tercatat
            try:
                pastikan_tak_menyusut(j)
                raise AssertionError("hilang harus berhenti")
            except SystemExit:
                pass
        finally:
            AKAR = asli_akar
    print("ok")


def utama(a):
    if a == ["uji"]:
        return uji()
    if a[:1] == ["hujan"]:
        sys.exit(hujan(tanggal_arg(a[1:])))
    if a[:1] == ["label"]:
        sys.exit(label(tanggal_arg(a[1:]), opsi(a, "--alasan")))
    sys.exit(__doc__)


if __name__ == "__main__":
    utama(sys.argv[1:])
