"""KS-02: pipeline banjir kerusakan satelit: air dari Sentinel-1 -> bangunan terendam per pasangan (kabupaten, kejadian). Baca
data/kajian-bnpb/kerusakan-satelit/ALGORITMA.md bagian 1 dan 3. TIDAK menghitung vonis (itu KS-03).

Semua parameter uji (kisi dB, jendela adegan, ambang) dibaca dari scripts/siklus/kerusakan_kriteria.json; pipeline menolak jalan bila
jangkar_commit di kerusakan_sidik.json kosong, sidik berkas kriteria tidak cocok, atau isi di commit jangkar berbeda.
Memakai ulang: scripts/banjir/citra_banjir.py (STAC, SAS, pembuka COG float32), scripts/siklus/paparan.py (sel halus 110 m per kab),
scripts/banjir/fitur_banjir.py (HAND, naif kerawanan). Keluaran per pasangan ke data/raw/siklus/kerusakan/ (gitignored), tidak ke public/.

Batas yang ditulis di keluaran: air permanen WorldCover dan lereng curam belum dikurangi (butuh GDAL); komposit sebelum = median nilai sah
(satu sampai tiga adegan sah per sel); satu piksel per sel halus 110 m di pusat sel; bangunan terendam = batas bawah.
Pakai:  python3 -I scripts/siklus/kerusakan.py uji
        python3 -I scripts/siklus/kerusakan.py pasangan INDEKS [--bagian kalibrasi|uji --izin-uji]   # INDEKS = baris di kriteria.pasangan
        python3 -I scripts/siklus/kerusakan.py hand KAB4
"""
import datetime as dt, hashlib, importlib.util, json, math, os, re, shutil, statistics, subprocess, sys, tempfile, time

AB = os.path.dirname(os.path.abspath(__file__))
AKAR = os.path.normpath(os.path.join(AB, "../.."))
KRI = os.path.join(AB, "kerusakan_kriteria.json")
SID = os.path.join(AB, "kerusakan_sidik.json")
KELUAR = os.path.join(AKAR, "data/raw/siklus/kerusakan")
PC_STAC = "https://planetarycomputer.microsoft.com/api/stac/v1/search"
RES_M = 110            # satu contoh per sel halus
SISIR_PLASEBO_HARI = 120   # jendela cari ke belakang: 60 hari komposit + adegan plasebo (pilihan implementasi, bukan kriteria)
KETERBATASAN = ("Air permanen WorldCover dan lereng curam belum dikurangi (butuh GDAL). Komposit sebelum = median nilai sah; satu piksel per sel halus 110 m "
                "di pusat sel; bangunan terendam adalah batas bawah (pantulan ganda di permukiman padat). Label estimasi-model, parameter hipotesis.")


class Tolak(RuntimeError):
    """kriteria tidak terkunci: pipeline tidak boleh jalan"""


def _muat(nama, rel):
    s = importlib.util.spec_from_file_location(nama, os.path.join(AKAR, rel))
    m = importlib.util.module_from_spec(s)
    sys.modules.setdefault(nama, m)
    s.loader.exec_module(m)
    return m


# ---------------------------------------------------------------- kunci kriteria
def periksa_kunci(kri=KRI, sid=SID, git=True):
    """-> kriteria (dict). Tolak bila jangkar kosong, sidik beda, atau isi di commit jangkar beda."""
    s = json.load(open(sid))
    if not s.get("jangkar_commit"):
        raise Tolak("jangkar_commit kosong: kriteria belum dijangkar ke commit")
    isi = open(kri, "rb").read()
    if hashlib.sha256(isi[:-1] if isi.endswith(b"\n") else isi).hexdigest() != s["sidik"]:
        raise Tolak("sidik berkas kriteria tidak cocok dengan kerusakan_sidik.json: kriteria berubah sesudah dikunci")
    if git:
        rel = os.path.relpath(kri, AKAR)
        r = subprocess.run(["git", "-C", AKAR, "show", f"{s['jangkar_commit']}:{rel}"], capture_output=True)
        if r.returncode or r.stdout != isi:
            raise Tolak("isi kriteria berbeda dari commit jangkar (atau commit jangkar tidak ada)")
        if subprocess.run(["git", "-C", AKAR, "merge-base", "--is-ancestor", s["jangkar_commit"], "HEAD"], capture_output=True).returncode:
            raise Tolak("commit jangkar bukan leluhur HEAD")
    return json.loads(isi)


def pasangan_dict(K, i):
    return dict(zip(K["pasangan_kolom"], K["pasangan"][i]))


def hari_komposit(K):
    m = re.search(r"dalam (\d+) hari", K["adegan"]["sebelum"])
    if not m:
        raise Tolak("jendela hari komposit tidak terbaca dari kriteria.adegan.sebelum")
    return int(m.group(1))


# ---------------------------------------------------------------- pilih adegan (geometri dan tanggal saja, tanpa melihat nilai)
def _tgl(s):
    return dt.date.fromisoformat(s)


def _poli(it):
    g = it["geometry"]
    return [g["coordinates"]] if g["type"] == "Polygon" else g["coordinates"]


def liputan(items, titik, di_dalam):
    """bagian titik yang jatuh di salah satu jejak adegan (geometri saja)"""
    if not titik:
        return 0.0
    return sum(1 for x, y in titik if any(di_dalam(x, y, p[0]) for it in items for p in _poli(it))) / len(titik)


def pilih_adegan(items, mulai, K, titik_uji=None, di_dalam=None):
    """Sesudah = adegan paling dini mulai..mulai+sesudah_maks_hari yang punya >= n_sebelum adegan orbit sama dalam jendela komposit sebelum mulai.
    Seri tanggal (orbit beda): jejak yang menutup lebih banyak titik. Plasebo = adegan pra-kejadian terakhir lawan komposit tiga adegan di belakangnya.
    -> dict atau None (sah dikeluarkan mekanis)."""
    a, mulai, win = K["adegan"], _tgl(mulai), hari_komposit(K)
    grup = {}
    for it in items:
        p = it["properties"]
        grup.setdefault((p.get("sat:relative_orbit"), p["datetime"][:10]), []).append(it)
    cand = []
    for (orb, tgl), its in grup.items():
        if orb is None or not 0 <= (_tgl(tgl) - mulai).days <= a["sesudah_maks_hari"]:
            continue
        pra = sorted((t for (o, t) in grup if o == orb and (mulai - _tgl(t)).days >= 1), reverse=True)
        if len(pra) < a["n_sebelum"] or (mulai - _tgl(pra[a["n_sebelum"] - 1])).days > win:
            continue
        cov = liputan(its, titik_uji, di_dalam) if titik_uji and di_dalam else 0.0
        cand.append((tgl, -cov, orb, pra))
    if not cand:
        return None
    tgl, negcov, orb, pra = min(cand)
    n = a["n_sebelum"]
    ad = lambda t: {"tgl": t, "orbit": orb, "items": grup[(orb, t)]}
    plas = {"sesudah": ad(pra[0]), "sebelum": [ad(t) for t in pra[1:n + 1]]} if len(pra) > n else None
    return {"orbit": orb, "sesudah": ad(tgl), "sebelum": [ad(t) for t in pra[:n]], "plasebo": plas, "liputan_geometri": round(-negcov, 3)}


# ---------------------------------------------------------------- air dan bangunan
def median_sah(nilai):
    v = [x for x in nilai if x is not None]
    return statistics.median(v) if v else None


def hitung_air(sel, sebelum, sesudah, kisi):
    """sel (i,j,n,luas,...), sebelum = tiga daftar dB sejajar sel, sesudah = daftar dB. -> {ambang: {terendam_n, sel_air, ...}}, cakupan.
    Air = sesudah < ambang DAN median sebelum >= ambang (kriteria skor_satelit.piksel_air)."""
    komp = [median_sah(v) for v in zip(*sebelum)]
    sah = [k is not None and s is not None for k, s in zip(komp, sesudah)]
    n_sah = sum(c[2] for c, ok in zip(sel, sah) if ok)
    n_semua = sum(c[2] for c in sel)
    out = {}
    for amb in kisi:
        idx = [i for i, ok in enumerate(sah) if ok and sesudah[i] < amb <= komp[i]]
        out[str(amb)] = {"terendam_n": sum(sel[i][2] for i in idx), "sel_air": len(idx)}
    return out, {"sel_n": len(sel), "sel_sah": sum(sah), "bangunan_n": n_semua, "bangunan_terliput": n_sah,
                 "bagian_terliput": round(n_sah / n_semua, 4) if n_semua else None}


# ---------------------------------------------------------------- sampel Sentinel-1 (pakai ulang citra_banjir)
def _CB():
    return _muat("sk_citra_banjir", "scripts/banjir/citra_banjir.py")


class Unduh:
    """penghitung byte lewat pembungkus C.ambil"""
    def __init__(self, C):
        self.C, self.n, self.asli = C, 0, C.ambil
        def hitung(*a, **k):
            r = self.asli(*a, **k)
            self.n += len(r) if r else 0
            return r
        C.ambil = hitung

    def tutup(self):
        self.C.ambil = self.asli


def contoh_titik(cb, items, token, titik, res_m=RES_M):
    """dB VV (None = tanpa data atau di luar jejak) di tiap titik (lon, lat); tiap titik dibaca dari adegan pertama yang jejaknya menutupnya."""
    C = cb.C
    from concurrent.futures import ThreadPoolExecutor
    hasil, sisa = [None] * len(titik), list(range(len(titik)))
    for it in items:
        kena = [i for i in sisa if any(C.di_dalam(titik[i][0], titik[i][1], p[0]) for p in _poli(it))]
        if not kena:
            continue
        sisa = [i for i in sisa if i not in set(kena)]
        url = it["assets"]["vv"]["href"] + "?" + token
        c = C.COG(url)
        epsg, tr = it["properties"]["proj:epsg"], it["properties"]["proj:transform"]
        t = c.ifd[C.level_untuk(c, tr[0], res_m)]
        W, H, T = t[256], t[257], t[322]
        r = tr[0] * c.ifd[0][256] / W
        tx, off, cnt = math.ceil(W / T), t[324], t[325]
        piksel = {}
        for i in kena:
            E, N = C.ke_utm(titik[i][1], titik[i][0], epsg % 100, C.epsg_selatan(epsg))
            piksel[i] = (int((tr[5] - N) / r), int((E - tr[2]) / r))
        perlu = {(y // T, x // T) for y, x in piksel.values() if 0 <= y < H and 0 <= x < W}

        def satu(yx):
            k = yx[0] * tx + yx[1]
            return yx, (cb.buka_float_pred3(C.ambil(url, (off[k], off[k] + cnt[k])), T, T) if cnt[k] else None)
        with ThreadPoolExecutor(8) as ex:
            ubin = dict(ex.map(satu, perlu))
        for i, (y, x) in piksel.items():
            u = ubin.get((y // T, x // T)) if 0 <= y < H and 0 <= x < W else None
            v = u[(y % T) * T + x % T] if u else None
            hasil[i] = 10 * math.log10(v) if v is not None and v > 0 and v == v else None
    return hasil


# ---------------------------------------------------------------- satu pasangan
def kab_dari_pasangan(p):
    kk = _muat("sk_kunci", "scripts/siklus/kunci.py")
    prov = str(p["id_kab_sumber"]).replace(".", "")[:2]
    kab4 = kk.kab4(p["kab"], prov)
    return prov, kab4


def jalankan_pasangan(K, i, keluar=KELUAR, sampel=None, cari=None, sel_kab=None):
    """Satu pasangan -> berkas keluar/pasangan/<i>.json. sampel, cari, sel_kab bisa disuntik (uji sintetis)."""
    p = pasangan_dict(K, i)
    prov, kab4 = kab_dari_pasangan(p) if sel_kab is None else ("00", "0000")
    rec = {"indeks": i, "pasangan": p, "sidik_kriteria": json.load(open(SID))["sidik"], "label": "estimasi-model", "keterbatasan": KETERBATASAN,
           "dibuat": dt.date.today().isoformat(), "kab4": kab4}
    if kab4 is None:
        rec["status"] = "menunggu: kabupaten tidak terpetakan ke kab4"
        return _tulis(keluar, i, rec)
    try:
        sel = (sel_kab or _muat("sk_paparan", "scripts/siklus/paparan.py").sel_kab)(prov, kab4)[0]
    except (OSError, KeyError) as e:
        rec["status"] = f"menunggu: grid bangunan provinsi {prov} tidak ada ({type(e).__name__})"
        return _tulis(keluar, i, rec)
    if not sel:
        rec["status"] = "menunggu: tidak ada sel bangunan di kabupaten"
        return _tulis(keluar, i, rec)
    titik = [(c[5], c[6]) for c in sel]
    xs, ys = [x for x, _ in titik], [y for _, y in titik]
    mulai = _tgl(p["mulai"])
    bb = [min(xs), min(ys), max(xs), max(ys)]
    cb = None
    if cari is None or sampel is None:
        cb = _CB()
        unduh = Unduh(cb.C)
        cari = cari or (lambda: cb.stac(PC_STAC, {"collections": ["sentinel-1-rtc"], "bbox": bb, "limit": 500,
                                                  "datetime": f"{mulai - dt.timedelta(days=SISIR_PLASEBO_HARI)}T00:00:00Z/{mulai + dt.timedelta(days=K['adegan']['sesudah_maks_hari'])}T23:59:59Z"}))
    items = cari()
    uji_titik = titik[::max(1, len(titik) // 400)]
    ad = pilih_adegan(items, p["mulai"], K, uji_titik, cb.C.di_dalam if cb else None)
    if not ad:
        rec["status"] = "dikeluarkan mekanis: tanpa adegan sesudah/sebelum yang sah"
        rec["n_adegan_dicari"] = len(items)
        return _tulis(keluar, i, rec)
    if sampel is None:
        tok = cb.token_sas()
        sampel = lambda its, pts: contoh_titik(cb, its, tok, pts)
    ambil = lambda g: sampel(g["items"], titik)
    sesudah, sebelum = ambil(ad["sesudah"]), [ambil(g) for g in ad["sebelum"]]
    kisi = K["skor_satelit"]["kisi_db"]
    air, cak = hitung_air(sel, sebelum, sesudah, kisi)
    rec.update(status="ok", adegan={"orbit": ad["orbit"], "sesudah": ad["sesudah"]["tgl"], "sebelum": [g["tgl"] for g in ad["sebelum"]],
                                    "plasebo_sesudah": ad["plasebo"]["sesudah"]["tgl"] if ad["plasebo"] else None,
                                    "plasebo_sebelum": [g["tgl"] for g in ad["plasebo"]["sebelum"]] if ad["plasebo"] else None,
                                    "liputan_geometri": ad["liputan_geometri"], "jendela_cari_hari": SISIR_PLASEBO_HARI},
               skor_per_ambang_db=air, cakupan=cak, bangunan_kab_n=cak["bangunan_n"])
    if ad["plasebo"]:
        pl, _ = hitung_air(sel, [ambil(g) for g in ad["plasebo"]["sebelum"]], sebelum[0], kisi)
        rec["plasebo_per_ambang_db"] = pl
    else:
        rec["plasebo_per_ambang_db"] = None   # tanpa adegan keempat: menunggu, bukan nol
    if cb is not None:
        rec["unduh_byte"] = unduh.n
        unduh.tutup()
    return _tulis(keluar, i, rec)


def _tulis(keluar, i, rec):
    os.makedirs(os.path.join(keluar, "pasangan"), exist_ok=True)
    j = os.path.join(keluar, "pasangan", f"{i}.json")
    json.dump(rec, open(j, "w"), ensure_ascii=False, indent=1)
    return j, rec


# ---------------------------------------------------------------- naif HAND (kerawanan tetap, sebelum vonis)
def naif_hand(kab4, prov, nama_geo, keluar=KELUAR, raster_kab=None):
    """fraksi darat kabupaten dengan HAND < 5 m (Copernicus GLO-30 HAND lewat fitur_banjir.raster_kab). Tanpa GDAL/numpy: menunggu, bukan nol.
    Hasil sukses di-cache di keluar/hand/<kab4>.json."""
    cache = os.path.join(keluar, "hand", f"{kab4}.json")
    if os.path.exists(cache):
        return json.load(open(cache))
    if raster_kab is None:
        try:
            import numpy  # noqa: F401
        except ImportError:
            return {"kab4": kab4, "hand_lt5": None, "status": "menunggu: numpy tidak ada"}
        if not shutil.which("gdalwarp"):
            return {"kab4": kab4, "hand_lt5": None, "status": "menunggu: GDAL tidak ada"}
        raster_kab = _muat("sk_fitur_banjir", "scripts/banjir/fitur_banjir.py").raster_kab
    r = raster_kab({"prov": prov, "nama_geo": nama_geo, "kab_kode": kab4})
    out = {"kab4": kab4, "hand_lt5": r.get("hand_lt5"), "luas_darat_km2": r.get("luas_darat_km2"), "status": "ok" if r.get("hand_lt5") is not None else "menunggu: tanpa piksel darat",
           "sumber": "Copernicus GLO-30 HAND via scripts/banjir/fitur_banjir.py raster_kab", "label": "estimasi-model", "dibuat": dt.date.today().isoformat()}
    if out["status"] == "ok":
        os.makedirs(os.path.dirname(cache), exist_ok=True)
        json.dump(out, open(cache, "w"))
    return out


# ---------------------------------------------------------------- uji
def _uji():
    d = tempfile.mkdtemp()
    kri, sid = os.path.join(d, "k.json"), os.path.join(d, "s.json")
    open(kri, "w").write('{"a":1}\n')
    sha = hashlib.sha256(b'{"a":1}').hexdigest()
    for s, pesan in (({"sidik": sha, "jangkar_commit": None}, "jangkar"), ({"sidik": "0" * 64, "jangkar_commit": "abc"}, "sidik")):
        json.dump(s, open(sid, "w"))
        try:
            periksa_kunci(kri, sid, git=False)
            raise AssertionError("harus menolak: " + pesan)
        except Tolak as e:
            assert pesan in str(e), e
    json.dump({"sidik": sha, "jangkar_commit": "abc"}, open(sid, "w"))
    assert periksa_kunci(kri, sid, git=False) == {"a": 1}
    K = periksa_kunci(git=subprocess.run(["git", "-C", AKAR, "cat-file", "-e", json.load(open(SID))["jangkar_commit"] or "x"], capture_output=True).returncode == 0)
    assert hari_komposit(K) == 60 and K["skor_satelit"]["kisi_db"] == [-16, -17, -18, -19, -20]
    # adegan: orbit 7 punya 5 pra + sesudah hari mulai+2; orbit 9 hanya sesudah mulai+1 tanpa pra -> dilewati
    mk = lambda tgl, orb, geo=None: {"id": f"{orb}_{tgl}", "properties": {"datetime": tgl + "T11:00:00Z", "sat:relative_orbit": orb},
                                     "geometry": geo or {"type": "Polygon", "coordinates": [[[0, 0], [2, 0], [2, 2], [0, 2], [0, 0]]]}}
    items = [mk(t, 7) for t in ("2026-01-02", "2026-01-14", "2026-01-26", "2026-02-07", "2026-02-19", "2026-03-03")] + [mk("2026-03-02", 9)]
    ad = pilih_adegan(items, "2026-03-01", K)
    assert ad["orbit"] == 7 and ad["sesudah"]["tgl"] == "2026-03-03" and [g["tgl"] for g in ad["sebelum"]] == ["2026-02-19", "2026-02-07", "2026-01-26"]
    assert ad["plasebo"]["sesudah"]["tgl"] == "2026-02-19" and [g["tgl"] for g in ad["plasebo"]["sebelum"]] == ["2026-02-07", "2026-01-26", "2026-01-14"]
    assert pilih_adegan(items, "2026-03-08", K) is None, "sesudah di luar 0-6 hari"
    assert pilih_adegan(items[:2], "2026-01-10", K) is None
    pendek = pilih_adegan([mk(t, 7) for t in ("2026-02-07", "2026-02-19", "2026-02-25", "2026-03-03")], "2026-03-01", K)
    assert pendek["plasebo"] is None, "tanpa adegan keempat plasebo menunggu"
    # komposit melewati 60 hari: tiga adegan tidak semua dalam jendela -> tidak sah
    assert pilih_adegan([mk(t, 7) for t in ("2025-12-01", "2026-01-26", "2026-02-19", "2026-03-03")], "2026-03-01", K) is None
    # jejak mengatasi seri tanggal: dua orbit sesudah di tanggal sama, orbit 9 menutup titik uji
    kiri = {"type": "Polygon", "coordinates": [[[10, 0], [12, 0], [12, 2], [10, 2], [10, 0]]]}
    sr = [mk(t, 7) for t in ("2026-02-07", "2026-02-19", "2026-02-25", "2026-03-03")] + [mk(t, 9, kiri) for t in ("2026-02-08", "2026-02-20", "2026-02-26", "2026-03-03")]
    di = lambda x, y, r: min(a for a, b in r) <= x <= max(a for a, b in r) and min(b for a, b in r) <= y <= max(b for a, b in r)
    assert pilih_adegan(sr, "2026-03-01", K, [(11, 1), (11.5, 1)], di)["orbit"] == 9
    # air dan cakupan: sel A (air baru), B (air lama: sebelum juga gelap), C (tanpa data sesudah), D (-17 persis: batas)
    sel = [(0, 0, 10, 1, "k", 0, 0), (0, 1, 20, 1, "k", 0, 0), (0, 2, 40, 1, "k", 0, 0), (0, 3, 80, 1, "k", 0, 0)]
    sebelum = [[-10, -25, -10, -10], [-12, -26, -11, -10], [-9, -24, None, -10]]    # median: -10, -25, -10.5, -10
    sesudah = [-22, -30, None, -17.0]
    out, cak = hitung_air(sel, sebelum, sesudah, [-16, -17, -20, -23])
    assert out["-16"] == {"terendam_n": 10 + 80, "sel_air": 2}, out      # D: -17 < -16 dan -10 >= -16
    assert out["-17"] == {"terendam_n": 10, "sel_air": 1}, out           # D: -17 < -17 salah
    assert out["-20"]["terendam_n"] == 10 and out["-23"]["terendam_n"] == 0 and cak["sel_sah"] == 3 and cak["bagian_terliput"] == round(110 / 150, 4)
    # pipeline utuh dengan penyuntik: tidak ada jaringan
    K2 = dict(K)
    kolom = K["pasangan_kolom"]
    K2["pasangan"] = [["s", "Prov", "Kab", "33.02", "2026-03-01", "2026-03-01", 1, 100, "b", "kalibrasi"]]
    K2["pasangan_kolom"] = kolom
    nilai = {"2026-03-03": [-22, -30, -10, -17.0], "2026-02-19": [-10, -25, -10, -10], "2026-02-07": [-12, -26, -11, -10], "2026-01-26": [-9, -24, -10, -10], "2026-01-14": [-9, -25, -10, -10]}
    sampel = lambda its, pts: nilai[its[0]["properties"]["datetime"][:10]]
    tmp = tempfile.mkdtemp()
    jb, rec = jalankan_pasangan(K2, 0, tmp, sampel, lambda: items, lambda prov, kab4: (sel,))
    assert rec["status"] == "ok" and rec["skor_per_ambang_db"]["-16"]["terendam_n"] == 90 and rec["plasebo_per_ambang_db"]["-16"]["terendam_n"] == 0, rec
    assert os.path.exists(jb) and "public" not in os.path.relpath(jb, tmp)
    _, rec = jalankan_pasangan(K2, 0, tmp, sampel, lambda: [], lambda prov, kab4: (sel,))
    assert rec["status"].startswith("dikeluarkan mekanis")
    # HAND: tanpa GDAL/numpy = menunggu (bukan nol); dengan penyuntik = dicache
    h = naif_hand("3301", "33", "Cilacap", tmp, lambda k: {"hand_lt5": 0.42, "luas_darat_km2": 2000})
    assert h["hand_lt5"] == 0.42 and naif_hand("3301", "33", "Cilacap", tmp)["hand_lt5"] == 0.42
    assert naif_hand("3302", "33", "Banyumas", tmp, lambda k: {"hand_lt5": None})["status"].startswith("menunggu")
    print("uji kerusakan: lolos", file=sys.stderr)


def main(a):
    if a[:1] == ["uji"]:
        return _uji()
    try:
        K = periksa_kunci()
        if a[:1] == ["pasangan"]:
            i = int(a[1])
            bagian = pasangan_dict(K, i)["bagian"]
            if bagian == "uji" and "--izin-uji" not in a:
                sys.exit("pasangan bagian uji: hanya KS-03 sesudah ambang dipilih di kalibrasi (--izin-uji)")
            j, rec = jalankan_pasangan(K, i)
            print(j, rec["status"], json.dumps(rec.get("cakupan")), "unduh_byte", rec.get("unduh_byte"))
        elif a[:1] == ["hand"]:
            kk = _muat("sk_kunci", "scripts/siklus/kunci.py")
            hv = _muat("sk_hvc", "scripts/bnpb/hvc_dasar.py").kab_kode()
            nama_geo = {v: k for k, v in hv.items()}[a[1]].split("|", 1)[1]
            print(json.dumps(naif_hand(a[1], a[1][:2], nama_geo), ensure_ascii=False))
        else:
            sys.exit(__doc__)
    except Tolak as e:
        sys.exit(f"DITOLAK: {e}")


if __name__ == "__main__":
    main(sys.argv[1:])
