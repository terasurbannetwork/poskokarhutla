"""KS-02 (kriteria v2): pipeline banjir kerusakan satelit: air dari Sentinel-1 10 m -> bangunan terendam per pasangan (kabupaten, kejadian).
Baca data/kajian-bnpb/kerusakan-satelit/ALGORITMA.md bagian 1 dan 3. TIDAK menghitung vonis (itu KS-03).

Semua parameter (kisi dB, jendela adegan, aturan baca, pengecualian, plasebo, kelayakan) dibaca dari scripts/siklus/kerusakan_kriteria.json.
Pipeline menolak jalan bila jangkar_commit di kerusakan_sidik.json kosong, sidik berkas kriteria tidak cocok, atau isi di commit jangkar berbeda.
Satu-satunya jalan lain: --asap-tanpa-jangkar, hanya untuk pasangan bagian kalibrasi, sidik tetap diperiksa, keluaran ditandai tanpa_jangkar.
Memakai ulang: scripts/banjir/citra_banjir.py (STAC, SAS, pembuka COG float32), scripts/siklus/paparan.py (sel halus 110 m per kab),
scripts/banjir/fitur_banjir.py (HAND). Keluaran ke data/raw/siklus/kerusakan/v2/ (gitignored), tidak ke public/.
Pakai:  python3 -I scripts/siklus/kerusakan.py uji
        python3 -I scripts/siklus/kerusakan.py pasangan INDEKS [--izin-uji] [--asap-tanpa-jangkar]
        python3 -I scripts/siklus/kerusakan.py ringkas | kelayakan | prasyarat | hand KAB4
"""
import datetime as dt, hashlib, importlib.util, json, math, os, re, shutil, statistics, subprocess, sys, tempfile

AB = os.path.dirname(os.path.abspath(__file__))
AKAR = os.path.normpath(os.path.join(AB, "../.."))
KRI = os.path.join(AB, "kerusakan_kriteria.json")
SID = os.path.join(AB, "kerusakan_sidik.json")
KELUAR = os.path.join(AKAR, "data/raw/siklus/kerusakan/v2")
KELUAR_HAND = os.path.join(AKAR, "data/raw/siklus/kerusakan")   # naif HAND tidak bergantung versi
PC_STAC = "https://planetarycomputer.microsoft.com/api/stac/v1/search"
STEP = 0.001   # sel halus bangunan.py (HALUS = 1000)
M_LON, M_LAT = 111320.0, 110574.0


class Tolak(RuntimeError):
    """kriteria tidak terkunci: pipeline tidak boleh jalan"""


def _muat(nama, rel):
    s = importlib.util.spec_from_file_location(nama, os.path.join(AKAR, rel))
    m = importlib.util.module_from_spec(s)
    sys.modules.setdefault(nama, m)
    s.loader.exec_module(m)
    return m


# ---------------------------------------------------------------- kunci kriteria
def periksa_kunci(kri=KRI, sid=SID, git=True, izin_tanpa_jangkar=False):
    """-> kriteria (dict). Tolak bila jangkar kosong (kecuali asap kalibrasi), sidik beda, atau isi di commit jangkar beda."""
    s = json.load(open(sid))
    if not s.get("jangkar_commit") and not izin_tanpa_jangkar:
        raise Tolak("jangkar_commit kosong: kriteria belum dijangkar ke commit")
    isi = open(kri, "rb").read()
    if hashlib.sha256(isi[:-1] if isi.endswith(b"\n") else isi).hexdigest() != s["sidik"]:
        raise Tolak("sidik berkas kriteria tidak cocok dengan kerusakan_sidik.json: kriteria berubah sesudah dikunci")
    if git and s.get("jangkar_commit"):
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
    """bagian titik yang jatuh di salah satu jejak adegan"""
    if not titik:
        return 0.0
    return sum(1 for x, y in titik if any(di_dalam(x, y, p[0]) for it in items for p in _poli(it))) / len(titik)


def pilih_plasebo(pra, mulai, K, gugus_lain, grup, orb):
    """A4. pra = tanggal pra-kejadian orbit sama, terbaru dulu. -> dict atau None."""
    a = K["adegan"]
    pl, n, win = a["plasebo"], a["n_sebelum"], hari_komposit(K)
    for idx, t in enumerate(pra):
        d = _tgl(t)
        if (mulai - d).days < pl["min_jarak_hari_dari_mulai"]:
            continue
        if any(m <= d <= ak + dt.timedelta(days=a["sesudah_maks_hari"]) for m, ak in gugus_lain):
            continue
        base = pra[idx + 1:idx + 1 + n]
        if len(base) < n or (d - _tgl(base[-1])).days > win:
            continue
        ad = lambda x: {"tgl": x, "orbit": orb, "items": grup[(orb, x)]}
        return {"sesudah": ad(t), "sebelum": [ad(x) for x in base]}
    return None


def pilih_adegan(items, mulai, K, titik_uji=None, di_dalam=None, gugus_lain=()):
    """B1: sesudah = tanggal paling dini mulai..mulai+sesudah_maks_hari yang punya n_sebelum adegan orbit sama dalam jendela komposit sebelum mulai;
    seri tanggal: jejak yang menutup lebih banyak titik, lalu orbit lebih kecil. B3: items diurut per id. -> dict atau None (sah dikeluarkan mekanis)."""
    a, mulai, win = K["adegan"], _tgl(mulai), hari_komposit(K)
    grup = {}
    for it in sorted(items, key=lambda i: i["id"]):
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
    ad = lambda t: {"tgl": t, "orbit": orb, "items": grup[(orb, t)]}
    return {"orbit": orb, "sesudah": ad(tgl), "sebelum": [ad(t) for t in pra[:a["n_sebelum"]]],
            "plasebo": pilih_plasebo(pra, mulai, K, gugus_lain, grup, orb), "liputan_geometri": round(-negcov, 3)}


def gugus_lain(K, p):
    """(mulai, akhir) gugus DIBI lain di kabupaten (provinsi + nama) yang sama, semua sumber"""
    ix = {c: i for i, c in enumerate(K["pasangan_kolom"])}
    return [(_tgl(r[ix["mulai"]]), _tgl(r[ix["akhir"]])) for r in K["pasangan"]
            if r[ix["prov"]] == p["prov"] and r[ix["kab"]] == p["kab"] and r[ix["mulai"]] != p["mulai"]]


# ---------------------------------------------------------------- air dan bangunan
def median_sah(nilai, min_sah):
    v = [x for x in nilai if x is not None]
    return statistics.median(v) if len(v) >= min_sah else None


def hitung_air(sel, sebelum, sesudah, kisi, A, min_sah):
    """sel (i,j,n,luas,...); sebelum = tiga daftar per-sel-berisi-k2-sub-nilai dB; sesudah = daftar per-sel sub-nilai.
    Sub-piksel air = sesudah < ambang <= median komposit (>= min_sah nilai sah). Sel sah bila sub-piksel sah >= min_subpiksel_sah_bagian;
    bangunan terendam = n sel sah dengan air/sah >= fraksi_air_min. -> ({ambang: {...}}, cakupan)"""
    pasang = []
    for c in range(len(sel)):
        pr = []
        for s, post in enumerate(sesudah[c]):
            k = median_sah([b[c][s] for b in sebelum], min_sah)
            if k is not None and post is not None:
                pr.append((post, k))
        pasang.append(pr)
    k2 = len(sesudah[0]) if sesudah else 1
    perlu = math.ceil(A["min_subpiksel_sah_bagian"] * k2)
    sah = [len(pr) >= perlu for pr in pasang]
    n_sah = sum(c[2] for c, ok in zip(sel, sah) if ok)
    n_semua = sum(c[2] for c in sel)
    out = {}
    for amb in kisi:
        idx = [c for c, ok in enumerate(sah) if ok and sum(1 for post, k in pasang[c] if post < amb <= k) / len(pasang[c]) >= A["fraksi_air_min"]]
        out[str(amb)] = {"terendam_n": sum(sel[c][2] for c in idx), "sel_air": len(idx)}
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


def contoh_sel(cb, items, token, pusat, k, res_m):
    """per sel (lon, lat pusat) daftar k*k sub-nilai dB VV (None = tanpa data), sub-piksel di tengah petak k x k dalam sel 110 m, dibaca pada res_m.
    Tiap sel dibaca dari adegan pertama yang jejaknya menutup pusat sel."""
    C = cb.C
    from concurrent.futures import ThreadPoolExecutor
    hasil, sisa = [[None] * (k * k) for _ in pusat], list(range(len(pusat)))
    for it in items:
        kena = [i for i in sisa if any(C.di_dalam(pusat[i][0], pusat[i][1], p[0]) for p in _poli(it))]
        if not kena:
            continue
        ks = set(kena)
        sisa = [i for i in sisa if i not in ks]
        url = it["assets"]["vv"]["href"] + "?" + token
        c = C.COG(url)
        epsg, tr = it["properties"]["proj:epsg"], it["properties"]["proj:transform"]
        t = c.ifd[C.level_untuk(c, tr[0], res_m)]
        W, H, T = t[256], t[257], t[322]
        r = tr[0] * c.ifd[0][256] / W
        tx, off, cnt = math.ceil(W / T), t[324], t[325]
        piksel = []
        for i in kena:
            lon, lat = pusat[i]
            E, N = C.ke_utm(lat, lon, epsg % 100, C.epsg_selatan(epsg))
            dx, dy = STEP * M_LON * math.cos(math.radians(lat)), STEP * M_LAT
            for b in range(k):
                for a in range(k):
                    piksel.append((i, b * k + a, int((tr[5] - (N + (.5 - (b + .5) / k) * dy)) / r), int((E + ((a + .5) / k - .5) * dx - tr[2]) / r)))
        perlu = {(y // T, x // T) for _, _, y, x in piksel if 0 <= y < H and 0 <= x < W}

        def satu(yx):
            q = yx[0] * tx + yx[1]
            return yx, (cb.buka_float_pred3(C.ambil(url, (off[q], off[q] + cnt[q])), T, T) if cnt[q] else None)
        with ThreadPoolExecutor(8) as ex:
            ubin = dict(ex.map(satu, perlu))
        for i, s, y, x in piksel:
            u = ubin.get((y // T, x // T)) if 0 <= y < H and 0 <= x < W else None
            v = u[(y % T) * T + x % T] if u else None
            hasil[i][s] = 10 * math.log10(v) if v is not None and v > 0 and v == v else None
    return hasil


# ---------------------------------------------------------------- satu pasangan
def kab_dari_pasangan(p):
    kk = _muat("sk_kunci", "scripts/siklus/kunci.py")
    prov = str(p["id_kab_sumber"]).replace(".", "")[:2]
    return prov, kk.kab4(p["kab"], prov)


def keterbatasan(K):
    return " ".join(K["keterbatasan_wajib"]) + " Label estimasi-model, parameter hipotesis."


def jalankan_pasangan(K, i, keluar=KELUAR, sampel=None, cari=None, sel_kab=None, tanpa_jangkar=False):
    """Satu pasangan -> keluar/pasangan/<i>.json. sampel(items, pusat, k) , cari(), sel_kab(prov, kab4) bisa disuntik (uji sintetis)."""
    p, A = pasangan_dict(K, i), K["aturan_baca"]
    prov, kab4 = kab_dari_pasangan(p) if sel_kab is None else ("00", "0000")
    rec = {"indeks": i, "pasangan": p, "versi_kriteria": K["versi"], "sidik_kriteria": json.load(open(SID))["sidik"], "tanpa_jangkar": tanpa_jangkar,
           "label": "estimasi-model", "keterbatasan": keterbatasan(K), "dibuat": dt.date.today().isoformat(), "kab4": kab4,
           "aturan_baca": {x: A[x] for x in ("resolusi_m", "grid_k", "fraksi_air_min", "min_subpiksel_sah_bagian")}}
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
    pusat = [(c[5], c[6]) for c in sel]
    mulai = _tgl(p["mulai"])
    bb = [min(x for x, _ in pusat), min(y for _, y in pusat), max(x for x, _ in pusat), max(y for _, y in pusat)]
    a, k = K["adegan"], A["grid_k"]
    cb = unduh = None
    if cari is None or sampel is None:
        cb = _CB()
        unduh = Unduh(cb.C)
    if cari is None:
        cari = lambda: cb.stac(PC_STAC, {"collections": ["sentinel-1-rtc"], "bbox": bb, "limit": 500,
                                         "datetime": f"{mulai - dt.timedelta(days=a['jendela_cari_hari'])}T00:00:00Z/{mulai + dt.timedelta(days=a['sesudah_maks_hari'])}T23:59:59Z"})
    items = cari()
    uji_titik = pusat[::max(1, len(pusat) // a["titik_geometri"])]
    ad = pilih_adegan(items, p["mulai"], K, uji_titik, cb.C.di_dalam if cb else None, gugus_lain(K, p))
    if not ad:
        rec.update(status="dikeluarkan mekanis: tanpa adegan sesudah/sebelum yang sah", n_adegan_dicari=len(items))
        return _tulis(keluar, i, rec)
    if sampel is None:
        tok = cb.token_sas()
        sampel = lambda its, pts, kk: contoh_sel(cb, its, tok, pts, kk, A["resolusi_m"])
    memo = {}

    def ambil(g):
        if g["tgl"] not in memo:
            memo[g["tgl"]] = sampel(g["items"], pusat, k)
        return memo[g["tgl"]]
    sesudah, sebelum = ambil(ad["sesudah"]), [ambil(g) for g in ad["sebelum"]]
    kisi, ms = K["skor_satelit"]["kisi_db"], a["min_sah_komposit"]
    air, cak = hitung_air(sel, sebelum, sesudah, kisi, A, ms)
    pl = ad["plasebo"]
    rec["adegan"] = {"orbit": ad["orbit"], "sesudah": ad["sesudah"]["tgl"], "sebelum": [g["tgl"] for g in ad["sebelum"]],
                     "plasebo_sesudah": pl["sesudah"]["tgl"] if pl else None, "plasebo_sebelum": [g["tgl"] for g in pl["sebelum"]] if pl else None,
                     "liputan_geometri": ad["liputan_geometri"], "revisit_hari": (_tgl(ad["sesudah"]["tgl"]) - _tgl(ad["sebelum"][0]["tgl"])).days}
    rec["cakupan"], rec["bangunan_kab_n"] = cak, cak["bangunan_n"]
    if cak["bagian_terliput"] is None or cak["bagian_terliput"] < K["pengecualian_mekanis"]["min_bagian_terliput"]:
        rec["status"] = f"dikeluarkan mekanis: bagian_terliput {cak['bagian_terliput']} < {K['pengecualian_mekanis']['min_bagian_terliput']}"
    else:
        rec["status"] = "ok"
        rec["skor_per_ambang_db"] = air
        rec["tanpa_plasebo"] = pl is None
        # plasebo: null bila tak ada (menunggu, bukan nol)
        rec["plasebo_per_ambang_db"] = hitung_air(sel, [ambil(g) for g in pl["sebelum"]], ambil(pl["sesudah"]), kisi, A, ms)[0] if pl else None
    if unduh:
        rec["unduh_byte"] = unduh.n
        unduh.tutup()
    return _tulis(keluar, i, rec)


def _tulis(keluar, i, rec):
    os.makedirs(os.path.join(keluar, "pasangan"), exist_ok=True)
    j = os.path.join(keluar, "pasangan", f"{i}.json")
    json.dump(rec, open(j, "w"), ensure_ascii=False, indent=1)
    return j, rec


# ---------------------------------------------------------------- laporan
def baca_semua(keluar=KELUAR):
    d = os.path.join(keluar, "pasangan")
    return [json.load(open(os.path.join(d, f))) for f in sorted(os.listdir(d), key=lambda x: int(x.split(".")[0]))] if os.path.isdir(d) else []


def ringkas(recs):
    """fraksi pengecualian dan plasebo kosong per (sumber, tahun mulai); revisit per era"""
    g, rev = {}, {}
    for r in recs:
        kunci = f"{r['pasangan']['sumber']}|{r['pasangan']['mulai'][:4]}"
        e = g.setdefault(kunci, {"n": 0, "ok": 0, "dikeluarkan": 0, "menunggu": 0, "tanpa_plasebo": 0})
        e["n"] += 1
        e["ok" if r["status"] == "ok" else "dikeluarkan" if r["status"].startswith("dikeluarkan") else "menunggu"] += 1
        e["tanpa_plasebo"] += 1 if r.get("tanpa_plasebo") else 0
        if r.get("adegan"):
            rev[r["adegan"]["revisit_hari"]] = rev.get(r["adegan"]["revisit_hari"], 0) + 1
    return {"per_sumber_tahun": g, "revisit_hari": rev}


def kelayakan(recs, K):
    """KS-02 gerbang mekanis (tanpa DIBI): per ambang, n, informatif, proporsi satelit > plasebo, rasio jumlah. Tidak memvonis bila n < min_pasangan."""
    Q, hasil = K["kelayakan"], {}
    pakai = [r for r in recs if r["status"] == "ok" and r.get("plasebo_per_ambang_db") and r["pasangan"]["bagian"] == "kalibrasi"]
    for amb in map(str, K["skor_satelit"]["kisi_db"]):
        s = [(r["skor_per_ambang_db"][amb]["terendam_n"], r["plasebo_per_ambang_db"][amb]["terendam_n"]) for r in pakai]
        inf = [(a, b) for a, b in s if max(a, b) > 0]
        menang = sum(1 for a, b in inf if a > b)
        ja, jb = sum(a for a, _ in s), sum(b for _, b in s)
        e = {"n": len(s), "informatif": len(inf), "menang": menang, "proporsi": round(menang / len(inf), 3) if inf else None,
             "jumlah_satelit": ja, "jumlah_plasebo": jb, "rasio": (round(ja / jb, 2) if jb else (None if not ja else "tak hingga"))}
        if len(s) < Q["min_pasangan"]:
            e["layak"] = f"menunggu: n {len(s)} < {Q['min_pasangan']}"
        else:
            r_ok = jb == 0 and ja > 0 or (jb > 0 and ja / jb >= Q["min_rasio_jumlah"])
            e["layak"] = bool(e["proporsi"] is not None and e["proporsi"] >= Q["min_proporsi_menang"] and r_ok)
        hasil[amb] = e
    return hasil


def hand_lengkap(K, keluar=KELUAR_HAND):
    """B5: kab4 uji yang naif HAND-nya belum terhitung (kosong = lengkap). Tolak di KS-03 bila tidak kosong."""
    ix = {c: i for i, c in enumerate(K["pasangan_kolom"])}
    kab = set()
    for r in K["pasangan"]:
        if r[ix["bagian"]] == "uji":
            k4 = kab_dari_pasangan(dict(zip(K["pasangan_kolom"], r)))[1]
            kab.add(k4 or f"?{r[ix['kab']]}")
    ada = lambda k4: os.path.exists(os.path.join(keluar, "hand", f"{k4}.json"))
    return sorted(k for k in kab if not ada(k))


# ---------------------------------------------------------------- naif HAND (kerawanan tetap, sebelum vonis)
def naif_hand(kab4, prov, nama_geo, keluar=KELUAR_HAND, raster_kab=None):
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
    json.dump({"sidik": sha, "jangkar_commit": None}, open(sid, "w"))
    assert periksa_kunci(kri, sid, git=False, izin_tanpa_jangkar=True) == {"a": 1}
    json.dump({"sidik": "0" * 64, "jangkar_commit": None}, open(sid, "w"))
    try:
        periksa_kunci(kri, sid, git=False, izin_tanpa_jangkar=True)
        raise AssertionError("sidik salah harus tetap ditolak walau tanpa jangkar")
    except Tolak:
        pass
    jk = json.load(open(SID))["jangkar_commit"]
    K = periksa_kunci(git=bool(jk), izin_tanpa_jangkar=not jk)
    if not jk:
        try:
            periksa_kunci()
            raise AssertionError("jangkar null di berkas asli harus ditolak")
        except Tolak:
            pass
    assert K["versi"] == 2 and hari_komposit(K) == 60 and K["skor_satelit"]["kisi_db"] == [-16, -17, -18, -19, -20]
    A = K["aturan_baca"]
    assert A["resolusi_m"] == 10 and A["grid_k"] >= 2 and 0 < A["fraksi_air_min"] <= 1
    mk = lambda tgl, orb, geo=None, id_=None: {"id": id_ or f"{orb}_{tgl}", "properties": {"datetime": tgl + "T11:00:00Z", "sat:relative_orbit": orb},
                                               "geometry": geo or {"type": "Polygon", "coordinates": [[[0, 0], [2, 0], [2, 2], [0, 2], [0, 0]]]}}
    items = [mk(t, 7) for t in ("2026-01-02", "2026-01-14", "2026-01-26", "2026-02-07", "2026-02-19", "2026-03-03")] + [mk("2026-03-02", 9)]
    ad = pilih_adegan(items, "2026-03-01", K)
    assert ad["orbit"] == 7 and ad["sesudah"]["tgl"] == "2026-03-03" and [g["tgl"] for g in ad["sebelum"]] == ["2026-02-19", "2026-02-07", "2026-01-26"]
    # plasebo A4: 02-19 hanya 10 hari sebelum mulai -> dilewati; 02-07 (22 hari), komposit 01-26, 01-14, 01-02 dalam 60 hari
    assert ad["plasebo"]["sesudah"]["tgl"] == "2026-02-07" and [g["tgl"] for g in ad["plasebo"]["sebelum"]] == ["2026-01-26", "2026-01-14", "2026-01-02"]
    # gugus DIBI lain (02-05..02-06, +6 hari = 02-12) melingkupi 02-07; kandidat 01-26 hanya punya dua adegan di belakangnya -> plasebo menunggu
    g = [(dt.date(2026, 2, 5), dt.date(2026, 2, 6))]
    assert pilih_adegan(items, "2026-03-01", K, gugus_lain=g)["plasebo"] is None
    assert pilih_adegan(items, "2026-03-08", K) is None and pilih_adegan(items[:2], "2026-01-10", K) is None
    assert pilih_adegan([mk(t, 7) for t in ("2026-02-07", "2026-02-19", "2026-02-25", "2026-03-03")], "2026-03-01", K)["plasebo"] is None, "tanpa komposit plasebo menunggu"
    assert pilih_adegan([mk(t, 7) for t in ("2025-12-01", "2026-01-26", "2026-02-19", "2026-03-03")], "2026-03-01", K) is None
    kiri = {"type": "Polygon", "coordinates": [[[10, 0], [12, 0], [12, 2], [10, 2], [10, 0]]]}
    sr = [mk(t, 7) for t in ("2026-02-07", "2026-02-19", "2026-02-25", "2026-03-03")] + [mk(t, 9, kiri) for t in ("2026-02-08", "2026-02-20", "2026-02-26", "2026-03-03")]
    di = lambda x, y, r: min(a for a, b in r) <= x <= max(a for a, b in r) and min(b for a, b in r) <= y <= max(b for a, b in r)
    assert pilih_adegan(sr, "2026-03-01", K, [(11, 1), (11.5, 1)], di)["orbit"] == 9
    assert pilih_adegan(list(reversed(sr)), "2026-03-01", K)["orbit"] == pilih_adegan(sr, "2026-03-01", K)["orbit"], "B3: urutan items tak boleh menentukan"
    # air: k2 = 4 sub-piksel per sel; sel A basah penuh, B separuh (=0,5 lolos), C seperempat, D tak sah (sesudah None), E komposit hanya 1 nilai sah
    Ak = {"min_subpiksel_sah_bagian": 0.5, "fraksi_air_min": 0.5}
    sel = [(0, c, n, 1, "k", 0, 0) for c, n in enumerate((10, 20, 40, 80, 160))]
    kom = [-10] * 4
    sebelum = [[kom, kom, kom, kom, [-10, -10, None, None]], [kom, kom, kom, kom, [-10, None, None, None]], [kom, kom, kom, kom, [-10, None, None, None]]]
    sesudah = [[-25] * 4, [-25, -25, -5, -5], [-25, -5, -5, -5], [None, None, None, -25], [-25] * 4]
    out, cak = hitung_air(sel, sebelum, sesudah, [-16, -17], Ak, 2)
    assert out["-16"] == {"terendam_n": 10 + 20, "sel_air": 2}, out      # E: komposit < 2 nilai sah -> tak sah; D: 1 dari 4 sah -> tak sah
    assert cak["sel_sah"] == 3 and cak["bagian_terliput"] == round(70 / 310, 4), cak
    # pipeline utuh dengan penyuntik, tanpa jaringan
    K2 = dict(K, pasangan=[["s", "Prov", "Kab", "33.02", "2026-03-01", "2026-03-01", 1, 100, "b", "kalibrasi"],
                           ["s", "Prov", "Kab", "33.02", "2026-02-05", "2026-02-06", 1, 100, "b2", "kalibrasi"]])
    sel2 = [(0, 0, 10, 1, "k", 0, 0), (0, 1, 20, 1, "k", 0, 0)]
    baik, basah = [-10] * 4, [-25] * 4
    nilai = {"2026-03-03": [basah, baik], "2026-02-19": [baik, baik], "2026-02-07": [baik, baik], "2026-01-26": [baik, baik], "2026-01-14": [baik, baik], "2026-01-02": [baik, baik]}
    sampel = lambda its, pts, kk: nilai[its[0]["properties"]["datetime"][:10]]
    tmp = tempfile.mkdtemp()
    A4 = dict(K["aturan_baca"], grid_k=2)
    K2["aturan_baca"] = A4
    jb, rec = jalankan_pasangan(K2, 0, tmp, sampel, lambda: items, lambda prov, kab4: (sel2,), True)
    assert rec["status"] == "ok" and rec["skor_per_ambang_db"]["-16"]["terendam_n"] == 10, rec
    assert rec["tanpa_jangkar"] and rec["tanpa_plasebo"] and rec["plasebo_per_ambang_db"] is None and rec["adegan"]["revisit_hari"] == 12, rec   # gugus pasangan 1 menutup 02-07
    K3 = dict(K2, pasangan=K2["pasangan"][:1])
    _, rec = jalankan_pasangan(K3, 0, tmp, sampel, lambda: items, lambda prov, kab4: (sel2,))
    assert rec["adegan"]["plasebo_sesudah"] == "2026-02-07" and rec["plasebo_per_ambang_db"]["-16"]["terendam_n"] == 0 and not rec["tanpa_plasebo"], rec
    assert "public" not in os.path.relpath(jb, tmp)
    _, rec = jalankan_pasangan(K2, 0, tmp, sampel, lambda: [], lambda prov, kab4: (sel2,))
    assert rec["status"].startswith("dikeluarkan mekanis")
    _, rec = jalankan_pasangan(K2, 0, tmp, lambda its, pts, kk: [[None] * 4, [None] * 4], lambda: items, lambda prov, kab4: (sel2,))
    assert rec["status"].startswith("dikeluarkan mekanis: bagian_terliput") and "skor_per_ambang_db" not in rec
    # ringkas dan kelayakan: n kecil = menunggu, bukan vonis
    r1 = {"status": "ok", "pasangan": {"sumber": "S", "mulai": "2026-03-01", "bagian": "kalibrasi"}, "adegan": {"revisit_hari": 12}, "tanpa_plasebo": False,
          "skor_per_ambang_db": {str(a): {"terendam_n": 5} for a in K["skor_satelit"]["kisi_db"]}, "plasebo_per_ambang_db": {str(a): {"terendam_n": 1} for a in K["skor_satelit"]["kisi_db"]}}
    assert ringkas([r1])["per_sumber_tahun"]["S|2026"]["ok"] == 1 and ringkas([r1])["revisit_hari"] == {12: 1}
    kl = kelayakan([r1], K)
    assert kl["-17"]["proporsi"] == 1.0 and kl["-17"]["rasio"] == 5.0 and kl["-17"]["layak"].startswith("menunggu")
    kl = kelayakan([r1] * K["kelayakan"]["min_pasangan"], K)
    assert kl["-17"]["layak"] is True
    # HAND: tanpa GDAL/numpy = menunggu (bukan nol); dengan penyuntik = dicache
    h = naif_hand("3301", "33", "Cilacap", tmp, lambda k: {"hand_lt5": 0.42, "luas_darat_km2": 2000})
    assert h["hand_lt5"] == 0.42 and naif_hand("3301", "33", "Cilacap", tmp)["hand_lt5"] == 0.42
    assert naif_hand("3302", "33", "Banyumas", tmp, lambda k: {"hand_lt5": None})["status"].startswith("menunggu")
    print("uji kerusakan: lolos", file=sys.stderr)


def main(a):
    if a[:1] == ["uji"]:
        return _uji()
    try:
        asap = "--asap-tanpa-jangkar" in a
        K = periksa_kunci(izin_tanpa_jangkar=asap)
        if a[:1] == ["pasangan"]:
            i = int(a[1])
            bagian = pasangan_dict(K, i)["bagian"]
            if bagian == "uji" and "--izin-uji" not in a:
                sys.exit("pasangan bagian uji: hanya KS-03 sesudah ambang dipilih di kalibrasi (--izin-uji)")
            if asap and bagian != "kalibrasi":
                sys.exit("--asap-tanpa-jangkar hanya untuk bagian kalibrasi")
            j, rec = jalankan_pasangan(K, i, tanpa_jangkar=asap and not json.load(open(SID))["jangkar_commit"])
            print(j, rec["status"], json.dumps(rec.get("cakupan")), "unduh_MB", round(rec.get("unduh_byte", 0) / 1e6, 1))
        elif a[:1] == ["ringkas"]:
            print(json.dumps(ringkas(baca_semua()), indent=1))
        elif a[:1] == ["kelayakan"]:
            print(json.dumps(kelayakan(baca_semua(), K), indent=1))
        elif a[:1] == ["prasyarat"]:
            kurang = hand_lengkap(K)
            if kurang:
                sys.exit(f"DITOLAK KS-03: naif HAND belum terhitung untuk {len(kurang)} kabupaten uji (butuh mesin ber-numpy dan GDAL): {kurang[:8]}...")
            print("prasyarat HAND lengkap")
        elif a[:1] == ["hand"]:
            hv = _muat("sk_hvc", "scripts/bnpb/hvc_dasar.py").kab_kode()
            nama_geo = {v: k for k, v in hv.items()}[a[1]].split("|", 1)[1]
            print(json.dumps(naif_hand(a[1], a[1][:2], nama_geo), ensure_ascii=False))
        else:
            sys.exit(__doc__)
    except Tolak as e:
        sys.exit(f"DITOLAK: {e}")


if __name__ == "__main__":
    main(sys.argv[1:])
