"""Model produksi P1: peluang api 7 hari per sel 0,05 derajat (docs/riset/RISIKO-MINGGUAN.md, "Pendaftaran model produksi P1",
di-commit f7a3f5da SEBELUM dilatih). Eksperimental, hanya untuk akun login sampai lolos uji prospektif.

  python3 scripts/sebaran/risiko_produksi.py arsip              # arsip NOAA-20 bergulir: CSV lokal (bila ada) + FIRMS -> data/raw/risiko/p1/n20.jsonl.gz
  python3 scripts/sebaran/risiko_produksi.py latih              # SEKALI, lokal, numpy: data/raw/risiko + arsip -> data/risiko_p1/ (menolak bila sudah ada)
  python3 scripts/sebaran/risiko_produksi.py ramal [YYYY-MM-DD] # ramalan minggu yang memuat tanggal itu (bawaan hari ini WIB), dibekukan
  python3 scripts/sebaran/risiko_produksi.py nilai              # nilai ramalan beku yang minggunya selesai >= 2 hari lalu
  python3 scripts/sebaran/risiko_produksi.py harian             # CI (data.yml): arsip -> nilai -> ramal -> data/risiko_p1/keluaran/
  python3 scripts/sebaran/risiko_produksi.py kemas <tujuan.jsonl.gz>   # catatan prospektif (ramalan + nilai + tolak) untuk R2
  python3 scripts/sebaran/risiko_produksi.py pulih <berkas.jsonl.gz>   # gabungkan salinan R2 (catatan atau arsip NOAA-20), tidak pernah membuang
  python3 scripts/sebaran/risiko_produksi.py uji                # swauji (termasuk yang harus DITOLAK) + paritas dengan artefak
Selain `latih`: Python stdlib saja (CI tanpa data/raw, tanpa numpy).

Keputusan pelaksanaan (yang tidak tertulis rinci di pendaftaran; hasil di dokumen yang sama, "Hasil latih P1"):
- Sel statis = sel 0,05 yang memuat sel `titik_palsu.sel_industri()` (semua sumber statis KECUALI kawah: deteksi gunung api sudah
  dibuang penapis tipe FIRMS 1 / sel 0,01 bukan-vegetasi; menutup sel 5,5 km di puncak membuang api lereng) + sel yang berapi
  > 20% dari 572 minggu 2015-2025 (seluruh kisi, termasuk sel luar Indonesia yang ikut jumlah tetangga). Titik di sel statis
  dibuang sebelum fitur, riwayat, dan target dihitung; sel statis tidak diramal dan tidak tampil.
- Penapis titik sama dengan uji balik (risiko_mingguan.baca_firms): keyakinan n/h; baris bertipe hanya tipe 0; baris NRT tanpa tipe
  dibuang bila sel 0,01 derajatnya bertipe 1/2/3 di arsip standar (daftar `nonveg` dibekukan di artefak).
- Fitur NaN/hilang ditolak; data hari terbit yang belum ada = fitur n7 hilang = ditolak, selain syarat >= 85 dari 90 hari. Hari WIB
  tercakup bila kedua hari UTC penyusunnya ada di arsip dan berisi deteksi.
- FIRMS area API menolak rentang > 5 hari ("Invalid day range. Expects [1..5]", diukur 23 Okt 2026), jadi permintaan <= 5 hari.
- Terbit tepat waktu = dibuat pada hari terbit (WIB); data.yml jalan 21.20 WIB, jadi lintasan malam Indonesia timur ~23.00 WIB hari
  terbit belum masuk fitur (di latih ikut). Terbit sesudah minggunya mulai = `terlambat`, tampil, tidak pernah dinilai.
- Vonis syarat publik dihitung SEKALI pada awalan minggu terpendek yang memenuhi >= 6 minggu dan >= 2.000 sel berapi (tanpa
  berhenti-pilih); minggu sesudahnya tampil sebagai `berjalan` dan tidak mengubah vonis.
- Tabel riwayat artefak untuk baris tahun 2026 (riwayat 2012-2025). Minggu 2027 ditolak sampai tabel riwayat 2027 diekspor.
"""
import array, csv, datetime as dt, gzip, hashlib, io, json, math, os, random, re, socket, struct, sys, time, urllib.error, urllib.request
from concurrent.futures import ThreadPoolExecutor

DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, DIR)
sys.path.insert(1, os.path.join(DIR, "..", "data"))
from wilayah import PRIORITAS  # noqa: E402  (stdlib)

AKAR = os.path.abspath(os.path.join(DIR, "../.."))
ART = os.path.join(AKAR, "data/risiko_p1")
KELUAR = os.path.join(ART, "keluaran")
TOKO = os.path.join(AKAR, "data/raw/risiko/p1")
CSV_N20 = os.path.join(AKAR, "data/raw/firms/viirs_noaa20.csv")
DOK = os.path.join(AKAR, "docs/riset/RISIKO-MINGGUAN.md")
WIB = dt.timezone(dt.timedelta(hours=7))
API = "https://firms.modaps.eosdis.nasa.gov/api"
BBOX = "94,-11.5,141.5,6.5"

X0, Y1, SEL, NX, NY = 94.5, 6.5, 0.05, 940, 360          # = risiko_mingguan (kisi riwayat_sel)
HARI0 = dt.date(2012, 1, 1)
MINGGU = 52
API_F = ["n7", "n30", "n7_3", "n30_3", "n7_11", "n30_11", "hari_sejak"]
LAHAN_F = ["gambut", "hutan", "produksi", "apl", "kebun", "hti", "hph", "konsesi", "kanal_km", "jalan_km", "penduduk_km2"]
RIWAYAT_F = ["klim", "klim5", "klim_3", "kekerapan", "reg_prov", "reg_kab"]
FITUR = API_F + ["minggu"] + LAHAN_F + RIWAYAT_F          # 25, urutan pendaftaran
B1_F = API_F + RIWAYAT_F                                  # B1: 13 fitur api + riwayat, log1p
TGL_DAFTAR = dt.date(2026, 10, 23)
H_ARSIP = (dt.date(2026, 10, 12) - HARI0).days            # latih: hari WIB >= 12 Okt dari arsip (CSV lokal berakhir 12 Okt UTC)
JENDELA, CAKUP_MIN = 90, 85
JAGA_HARI = 150                                           # hari UTC yang disimpan arsip (90 fitur + minggu dinilai + longgar)
RENTANG = 5
TUNGGU, BATAS_TUNGGU = 2, 9                               # dinilai >= 2 hari sesudah minggu berakhir; celah data ditunggu sampai 9 hari
PUBLIK_MIN = {"minggu": 6, "berapi": 2000, "prov_berapi": 300, "rasio": [0.7, 1.3], "bootstrap": 2000}
BATAS_R2 = 7_500_000          # keluaran JSON polos (tanpa gzip) yang dialirkan Worker apa adanya; Worker menolak > 8 MB
NAMA_ART = ["sel.json.gz", "lahan.f32.gz", "klim.f32.gz", "klim5.f32.gz", "klim_3.f32.gz", "kek.f32.gz", "reg_prov.f32.gz",
            "reg_kab.f32.gz", "statis.json", "nonveg.json.gz", "p1_pohon.json.gz"]


class Tolak(Exception):
    """Ramalan ditolak: status `tanpa_ramalan` + alasan."""


def log(*a):
    print(time.strftime("%H:%M:%S"), *a, file=sys.stderr, flush=True)


def hari(d):
    return (d - HARI0).days


def tgl(h):
    return HARI0 + dt.timedelta(days=int(h))


def hari_terbit(Y, k):
    """Minggu k (0..51) tahun Y = hari-dalam-tahun 7k+1..7k+7 (WIB); hari terbit sehari sebelumnya."""
    return hari(dt.date(Y, 1, 1)) + 7 * k - 1


def minggu_dari(d):
    k = (d.timetuple().tm_yday - 1) // 7
    return (d.year, k) if k < MINGGU else None          # hari 365/366 tidak masuk minggu mana pun


def sel_id(lon, lat):
    ix, iy = int((lon - X0) / SEL), int((Y1 - lat) / SEL)
    return iy * NX + ix if 0 <= ix < NX and 0 <= iy < NY else -1


def iso(t):
    return t.astimezone(dt.timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")


def waktu(s):
    return dt.datetime.fromisoformat(s.replace("Z", "+00:00"))


def sha256(jalur):
    with open(jalur, "rb") as f:
        return hashlib.sha256(f.read()).hexdigest()


def tulis_atom(jalur, data):
    os.makedirs(os.path.dirname(jalur), exist_ok=True)
    with open(jalur + ".tmp", "wb") as f:
        f.write(data)
    os.replace(jalur + ".tmp", jalur)


def baca_jsonl(j):
    if not os.path.exists(j):
        return []
    out = []
    for l in open(j):
        try:
            out.append(json.loads(l))
        except ValueError:
            pass          # baris terpotong (jalan mati di tengah tulis)
    return out


def tambah_jsonl(j, r):
    os.makedirs(os.path.dirname(j), exist_ok=True)
    with open(j, "a") as f:
        f.write(json.dumps(r, separators=(",", ":"), ensure_ascii=False) + "\n")


# ---------------------------------------------------------------- arsip NOAA-20 bergulir
# Satu baris JSON per hari UTC: {"d", "diambil", "sumber": csv|sp|nrt, "n": semua deteksi hari itu, "r": [[lat, lon, "hhmm", n|h, tipe]]}
def baca_arsip(toko=TOKO):
    j = os.path.join(toko, "n20.jsonl.gz")
    if not os.path.exists(j):
        return {}
    with gzip.open(j, "rt") as f:
        return {r["d"]: r for r in map(json.loads, f)}


def tulis_arsip(A, toko=TOKO):
    isi = "".join(json.dumps(A[d], separators=(",", ":")) + "\n" for d in sorted(A))
    tulis_atom(os.path.join(toko, "n20.jsonl.gz"), gzip.compress(isi.encode(), 6))


def gabung_arsip(A, B):
    """Per hari UTC: rekaman dengan deteksi lebih banyak menang, seri = yang diambil terakhir. FIRMS NRT tidak menghapus deteksi,
    jadi jawaban yang lebih miskin (terpotong/kosong sesaat) tidak pernah menimpa yang lebih kaya. -> jumlah hari berubah."""
    n = 0
    for d, r in B.items():
        if d not in A or (r["n"], r["diambil"]) > (A[d]["n"], A[d]["diambil"]):
            A[d] = r
            n += 1
    return n


def final(r):
    """Hari UTC sudah lengkap di FIRMS: arsip standar/CSV, atau NRT diambil >= 30 jam sesudah hari itu berakhir (ada deteksi),
    atau >= 5 hari sesudahnya (kosong = celah sensor)."""
    if r["sumber"] in ("csv", "sp"):
        return True
    akhir = waktu(r["d"] + "T00:00:00Z") + dt.timedelta(days=1)
    t = waktu(r["diambil"])
    return (t >= akhir + dt.timedelta(hours=30) and r["n"] > 0) or t >= akhir + dt.timedelta(days=5)


def potong(hs):
    """Tanggal urut -> [(mulai, n)] berurutan, n <= RENTANG."""
    out = []
    for d in hs:
        if out and out[-1][0] + dt.timedelta(days=out[-1][1]) == d and out[-1][1] < RENTANG:
            out[-1] = (out[-1][0], out[-1][1] + 1)
        else:
            out.append((d, 1))
    return out


def baris_firms(teks, mulai, n, sumber, diambil):
    """CSV FIRMS area -> {hari UTC: rekaman} untuk SETIAP hari rentang (hari tanpa deteksi ikut, n = 0)."""
    if teks.strip() and not teks.startswith("latitude"):
        raise RuntimeError("FIRMS menjawab: " + teks[:120].strip())
    per = {}
    for i in range(n):
        d = (mulai + dt.timedelta(days=i)).isoformat()
        per[d] = {"d": d, "diambil": diambil, "sumber": sumber, "n": 0, "r": []}
    for r in csv.DictReader(io.StringIO(teks)):
        x = per.get(r["acq_date"])
        if x is None:
            continue
        x["n"] += 1
        if r["confidence"] in ("n", "h"):
            x["r"].append([float(r["latitude"]), float(r["longitude"]), r["acq_time"].zfill(4), r["confidence"], r.get("type") or ""])
    return per


def benih_csv(A, jalur, awal):
    """Arsip lokal firms.py (SP dengan kolom type, lalu NRT) -> hari UTC >= awal yang belum ada di A. Hari terakhir berkas dilewati
    (unduhan bisa terpotong; 12 Okt 2026 tanpa lintasan 17-18 UTC) dan diambil dari FIRMS."""
    mt = iso(dt.datetime.fromtimestamp(os.path.getmtime(jalur), dt.timezone.utc))
    per = {}
    for r in csv.DictReader(open(jalur)):
        d = r["acq_date"]
        if d < awal or d in A:
            continue
        x = per.setdefault(d, {"d": d, "diambil": mt, "sumber": "csv", "n": 0, "r": []})
        x["n"] += 1
        if r["confidence"] in ("n", "h"):
            x["r"].append([float(r["latitude"]), float(r["longitude"]), r["acq_time"].zfill(4), r["confidence"], r.get("type") or ""])
    if per:
        del per[max(per)]
    A.update(per)
    return len(per)


_IPV4 = []


def ipv4_dulu():
    """= scripts/data/harian.py: AAAA FIRMS = IPv6 privat yang tak terjangkau dari runner; alamat IPv4 diurutkan lebih dulu."""
    if not _IPV4:
        asli = socket.getaddrinfo
        socket.getaddrinfo = lambda *a, **k: sorted(asli(*a, **k), key=lambda r: r[0] != socket.AF_INET)
        _IPV4.append(asli)


def kunci_firms():
    k = os.environ.get("FIRMS_MAP_KEY", "").strip()
    env = os.path.join(AKAR, ".env")
    if not k and os.path.exists(env):
        for b in open(env):
            if b.startswith("FIRMS_MAP_KEY="):
                k = b.split("=", 1)[1].strip()
    if not k:
        raise RuntimeError("FIRMS_MAP_KEY tidak ada (env atau .env)")
    return k


def unduh(url, kunci, awalan="latitude", coba=4):
    """Teks jawaban FIRMS. Galat tidak pernah memuat kunci. 400/401/403 tidak diulang."""
    for i in range(coba):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "poskokarhutla/1.0"})
            with urllib.request.urlopen(req, timeout=180) as r:
                teks = r.read().decode()
            if teks.strip() and not teks.startswith(awalan):
                raise RuntimeError("FIRMS menjawab: " + teks[:120].strip())
            return teks
        except Exception as e:  # noqa: BLE001
            pesan = f"{type(e).__name__}: {e}".replace(kunci, "***")
            if i == coba - 1 or getattr(e, "code", 0) in (400, 401, 403):
                raise RuntimeError(pesan) from None
            time.sleep(90 if "429" in pesan or "Exceeding" in pesan else 20 * (i + 1))


def perbarui_arsip(toko=TOKO, kini=None, ambil=None, batas=None, csv_benih=CSV_N20):
    """Isi/segarkan arsip: benih CSV lokal (bila ada), lalu tiap hari UTC jendela yang belum ada atau belum final diambil dari FIRMS
    (arsip standar SP bila tersedia untuk hari itu, seperti firms.py; selain itu NRT). ambil(sumber, mulai, n) = pengganti untuk uji."""
    kini = kini or dt.datetime.now(dt.timezone.utc)
    hari_ini = kini.astimezone(dt.timezone.utc).date()
    awal = hari_ini - dt.timedelta(days=JAGA_HARI - 1)
    A = baca_arsip(toko)
    benih = benih_csv(A, csv_benih, awal.isoformat()) if csv_benih and os.path.exists(csv_benih) else 0
    if ambil is None:
        kunci = kunci_firms()
        ipv4_dulu()
        try:
            teks = unduh(f"{API}/data_availability/csv/{kunci}/all", kunci, awalan="data_id")
            batas = {b["data_id"]: (dt.date.fromisoformat(b["min_date"]), dt.date.fromisoformat(b["max_date"]))
                     for b in csv.DictReader(io.StringIO(teks))}
        except Exception as e:  # noqa: BLE001
            log(f"data_availability: {e}; anggap NRT 60 hari terakhir")
        diambil = iso(kini)

        def ambil(sumber, mulai, n):
            u = f"{API}/area/csv/{kunci}/VIIRS_NOAA20_{sumber.upper()}/{BBOX}/{n}/{mulai.isoformat()}"
            return baris_firms(unduh(u, kunci), mulai, n, sumber, diambil)
    batas = batas or {}
    nrt0 = batas.get("VIIRS_NOAA20_NRT", (hari_ini - dt.timedelta(days=60),))[0]
    sp = batas.get("VIIRS_NOAA20_SP")
    perlu = {"sp": [], "nrt": []}
    d = awal
    while d <= hari_ini:
        r = A.get(d.isoformat())
        if r is None or not final(r):
            if sp and sp[0] <= d <= sp[1]:
                perlu["sp"].append(d)
            elif d >= nrt0:
                perlu["nrt"].append(d)
        d += dt.timedelta(days=1)
    tugas = [(s, m, n) for s, hs in perlu.items() for m, n in potong(hs)]
    gagal = []

    def satu(t):
        try:
            return ambil(*t)
        except Exception as e:  # noqa: BLE001
            gagal.append(f"{t[0]} {t[1]}+{t[2]} hari: {e}")
            return {}
    with ThreadPoolExecutor(3) as ex:
        for per in ex.map(satu, tugas):
            gabung_arsip(A, per)
    for d in [d for d in A if d < awal.isoformat()]:
        del A[d]
    tulis_arsip(A, toko)
    return {"hari": len(A), "benih_csv": benih, "permintaan": len(tugas), "gagal": gagal,
            "rentang": [min(A), max(A)] if A else None}


def tercakup(A, hw):
    """Hari WIB hw (UTC hw-1 17.00 .. hw 17.00) tercakup bila kedua hari UTC penyusunnya ada dan berisi deteksi."""
    a, b = A.get(tgl(hw - 1).isoformat()), A.get(tgl(hw).isoformat())
    return bool(a and b and a["n"] > 0 and b["n"] > 0)


def hitung(A, h0, h1, nonveg, statis):
    """-> {sel: {hari WIB: titik}} titik NOAA-20 n/h api vegetasi di hari WIB h0..h1, sel statis dibuang (= baca_firms uji balik)."""
    out = {}
    for hu in range(h0 - 1, h1 + 1):
        r = A.get(tgl(hu).isoformat())
        if not r:
            continue
        for lat, lon, jam, conf, tipe in r["r"]:
            if conf not in ("n", "h"):
                continue
            if tipe:
                if tipe != "0":
                    continue
            elif (round(lat, 2), round(lon, 2)) in nonveg:
                continue
            c = sel_id(lon, lat)
            if c < 0 or c in statis:
                continue
            hw = hu + (int(jam[:2]) * 60 + int(jam[2:]) + 420) // 1440      # UTC + 7 jam
            if h0 <= hw <= h1:
                d = out.setdefault(c, {})
                d[hw] = d.get(hw, 0) + 1
    return out


# ---------------------------------------------------------------- artefak & fitur (stdlib)
def muat(art=ART):
    """Artefak P1 -> M. sha256 tiap berkas dicocokkan dengan meta.json (berubah/rusak = Tolak)."""
    try:
        meta = json.load(open(os.path.join(art, "meta.json")))
        for nm in NAMA_ART:
            if sha256(os.path.join(art, nm)) != meta["berkas"][nm]:
                raise Tolak(f"artefak {nm} berbeda dari meta.json (sha256)")
    except (OSError, ValueError, KeyError) as e:
        raise Tolak(f"artefak P1 tidak terbaca ({type(e).__name__}: {e})") from None

    def isi(nm):
        return gzip.decompress(open(os.path.join(art, nm), "rb").read())

    def f32s(nm):
        a = array.array("f")
        a.frombytes(isi(nm))
        if sys.byteorder != "little":
            a.byteswap()
        return a
    s = json.loads(isi("sel.json.gz"))
    M = {"meta": meta, "sel": s["sel"], "pi": s["pi"], "ai": s["ai"], "prov": s["prov"], "kab": s["kab"],
         "statis": set(json.load(open(os.path.join(art, "statis.json")))["sel"]),
         "nonveg": {(a, b) for a, b in json.loads(isi("nonveg.json.gz"))},
         "pohon": siapkan_pohon(json.loads(isi("p1_pohon.json.gz"))), "b1": meta["b1"]["koef"], "b2": meta["b2"]["koef"],
         **{k: f32s(f"{k}.f32.gz") for k in ("lahan", "klim", "klim5", "klim_3", "kek", "reg_prov", "reg_kab")}}
    return lengkapi(M)


def lengkapi(M):
    ns, npv, nab = len(M["sel"]), len(M["prov"]), len(M["kab"])
    ukur = {"lahan": ns * len(LAHAN_F), "klim": MINGGU * ns, "klim5": MINGGU * ns, "klim_3": MINGGU * ns, "kek": ns,
            "reg_prov": npv * MINGGU, "reg_kab": nab * MINGGU}
    salah = [k for k, v in ukur.items() if len(M[k]) != v] + [k for k in ("pi", "ai") if len(M[k]) != ns]
    if salah or len(M["b1"]) != len(B1_F) + 1 or len(M["b2"]) != 3:
        raise Tolak(f"ukuran artefak tidak cocok: {salah or 'koefisien B1/B2'}")
    M["i13"] = [FITUR.index(f) for f in B1_F]
    rng = random.Random(1)
    M["acak"] = [rng.random() for _ in range(ns)]                 # pemecah seri peringkat, sama untuk semua metode
    M["per_prov"] = {}
    for i, u in enumerate(M["pi"]):
        M["per_prov"].setdefault(u, []).append(i)
    return M


def kotak_tebar(v, r):
    """{sel: nilai} -> daftar penuh NY*NX: jumlah jendela (2r+1)^2 dipotong di tepi kisi (= risiko_mingguan.kotak)."""
    out = [0] * (NY * NX)
    for c, x in v.items():
        y, xx = divmod(c, NX)
        a, b = max(xx - r, 0), min(xx + r + 1, NX)
        for yy in range(max(y - r, 0), min(y + r + 1, NY)):
            o = yy * NX
            for i in range(o + a, o + b):
                out[i] += x
    return out


def fitur_dari_hitungan(M, cnt, t, k):
    """Hitungan titik hari t-89..t -> baris fitur (urutan FITUR) tiap sel M['sel'] (= risiko_mingguan.fitur_tetap + baris_tahun)."""
    n7, n30, akhir = {}, {}, {}
    for c, dd in cnt.items():
        for hw, v in dd.items():
            if hw > t - 30:
                n30[c] = n30.get(c, 0) + v
            if hw > t - 7:
                n7[c] = n7.get(c, 0) + v
        akhir[c] = max(dd)
    k73, k303, k711, k3011 = kotak_tebar(n7, 1), kotak_tebar(n30, 1), kotak_tebar(n7, 5), kotak_tebar(n30, 5)
    ns, nl = len(M["sel"]), len(LAHAN_F)
    L, K, K5, K3, KE, RP, RA, pi, ai = (M[x] for x in ("lahan", "klim", "klim5", "klim_3", "kek", "reg_prov", "reg_kab", "pi", "ai"))
    X = []
    for i, c in enumerate(M["sel"]):
        X.append([n7.get(c, 0), n30.get(c, 0), k73[c], k303[c], k711[c], k3011[c], min(t - akhir.get(c, -10 ** 6), 90), k,
                  *L[i * nl:(i + 1) * nl], K[k * ns + i], K5[k * ns + i], K3[k * ns + i], KE[i], RP[pi[i] * MINGGU + k], RA[ai[i] * MINGGU + k]])
    for i, x in enumerate(X):
        if len(x) != len(FITUR) or not all(isinstance(v, (int, float)) and math.isfinite(v) for v in x):
            j = next((j for j, v in enumerate(x) if not (isinstance(v, (int, float)) and math.isfinite(v))), len(x))
            raise Tolak(f"fitur {FITUR[j] if j < len(FITUR) else '?'} NaN/hilang di sel {M['sel'][i]}")
    return X


def fitur_minggu(M, A, Y, k):
    """-> (baris fitur, info) untuk minggu (Y, k) dari arsip; Tolak bila data kurang."""
    th = M["meta"]["riwayat"]["tahun_baris"]
    if Y != th:
        raise Tolak(f"tabel riwayat artefak untuk baris tahun {th} (riwayat 2012-{th - 1}), bukan {Y}: ekspor riwayat {Y} dulu")
    t = hari_terbit(Y, k)
    ada = [h for h in range(t - JENDELA + 1, t + 1) if tercakup(A, h)]
    if len(ada) < CAKUP_MIN:
        raise Tolak(f"data NOAA-20 hanya {len(ada)} dari {JENDELA} hari terakhir (minimal {CAKUP_MIN})")
    if t not in ada:
        raise Tolak(f"data NOAA-20 hari terbit {tgl(t)} belum ada (fitur n7 hilang)")
    cnt = hitung(A, t - JENDELA + 1, t, M["nonveg"], M["statis"])
    return fitur_dari_hitungan(M, cnt, t, k), {"cakupan": len(ada), "titik": sum(sum(d.values()) for d in cnt.values())}


def f32(a):
    return struct.unpack("<f", struct.pack("<f", a))[0]


def siapkan_pohon(mdl):
    """Ambang ke float32: gbdt_np.nilai membandingkan X float32 dengan ambang Python float, dan NumPy 2 melakukannya di float32."""
    return mdl["bias"], [[(nd[0], f32(nd[1]), nd[2], nd[3]) if len(nd) > 1 else (-1, nd[0], 0, 0) for nd in s] for s in mdl["pohon"]]


def p_pohon(P, x):
    bias, hutan = P
    s = 0.0
    for nd in hutan:
        k = 0
        while True:
            f, a, l, r = nd[k]
            if f < 0:
                break
            k = l if x[f] <= a else r
        s += a
    return 1 / (1 + math.exp(-min(max(bias + s, -700.0), 700.0)))


def p_logit(b, xs):
    z = b[0] + sum(bj * xj for bj, xj in zip(b[1:], xs))
    return 1 / (1 + math.exp(-min(max(z, -35.0), 35.0)))       # = gbdt_np.pred_logistik


def peluang(M, x):
    """-> (P1, B1, B2) untuk satu baris fitur."""
    return (p_pohon(M["pohon"], x), p_logit(M["b1"], [math.log1p(x[j]) for j in M["i13"]]),
            p_logit(M["b2"], [1.0 if x[0] > 0 else 0.0, x[FITUR.index("klim")]]))


def ramal(M, A, Y, k, kini):
    """-> rekaman beku (P1 + B1 + B2 untuk SEMUA sel non-statis, satuan 1e-6). Tolak bila belum hari terbit atau data kurang."""
    t = hari_terbit(Y, k)
    d = kini.astimezone(WIB).date()
    if d < tgl(t):
        raise Tolak(f"belum hari terbit ({tgl(t)})")
    X, info = fitur_minggu(M, A, Y, k)
    p = [peluang(M, x) for x in X]
    return {"versi": "P1", "tahun": Y, "minggu": k, "terbit": tgl(t).isoformat(), "berlaku": [tgl(t + 1).isoformat(), tgl(t + 7).isoformat()],
            "dibuat": iso(kini), "terlambat": d > tgl(t), "kunci": M["meta"]["kunci"], "n_sel": len(X), **info, "satuan": 1e-6,
            **{m: [round(q[j] * 1e6) for q in p] for j, m in enumerate(("p1", "b1", "b2"))}}


# ---------------------------------------------------------------- catatan prospektif (append-only)
def nama_ramalan(r):
    return f"{r['tahun']}-{r['minggu']:02d}_{r['dibuat'].replace('-', '').replace(':', '')}_{'L' if r['terlambat'] else 'T'}.json.gz"


def daftar_ramalan(toko=TOKO):
    """-> [(tahun, minggu, dibuat_kompak, terlambat, nama)] dari nama berkas, urut."""
    d = os.path.join(toko, "ramalan")
    out = []
    for nm in sorted(os.listdir(d)) if os.path.isdir(d) else []:
        m = re.fullmatch(r"(\d{4})-(\d{2})_(\d{8}T\d{6}Z)_([LT])\.json\.gz", nm)
        if m:
            out.append((int(m[1]), int(m[2]), m[3], m[4] == "L", nm))
    return out


def baca_ramalan(nm, toko=TOKO):
    return json.loads(gzip.decompress(open(os.path.join(toko, "ramalan", nm), "rb").read()))


def kanonik(toko=TOKO):
    """{(tahun, minggu): entri daftar} = ramalan PALING AWAL dibekukan tiap minggu (salinan dobel dari cache/R2 tidak menggantikannya)."""
    out = {}
    for e in daftar_ramalan(toko):
        if (e[0], e[1]) not in out or e[2] < out[(e[0], e[1])][2]:
            out[(e[0], e[1])] = e
    return out


def bekukan(r, toko=TOKO):
    j = os.path.join(toko, "ramalan", nama_ramalan(r))
    if os.path.exists(j):
        raise RuntimeError(f"{j} sudah ada: ramalan beku tidak ditimpa")
    tulis_atom(j, gzip.compress((json.dumps(r, separators=(",", ":")) + "\n").encode(), 6))
    return j


def skor_minggu(M, r, y):
    """Jumlah per provinsi: [n, berapi, sse_p1, sse_b1, sse_b2, jumlah_p1, kena10_p1, kena10_b1] (10% teratas = recall_atas)."""
    s = r.get("satuan", 1e-6)
    P = {m: [v * s for v in r[m]] for m in ("p1", "b1", "b2")}
    prov = {}
    for u, ii in M["per_prov"].items():
        n = len(ii)
        top = math.ceil(0.1 * n)
        v = [n, sum(y[i] for i in ii)] + [sum((P[m][i] - y[i]) ** 2 for i in ii) for m in ("p1", "b1", "b2")] + [sum(P["p1"][i] for i in ii)]
        for m in ("p1", "b1"):
            v.append(sum(y[i] for i in sorted(ii, key=lambda i: (-P[m][i], M["acak"][i]))[:top]))
        prov[M["prov"][u]] = v
    tot = [sum(v[j] for v in prov.values()) for j in range(8)]
    return {"n_sel": tot[0], "berapi": tot[1], "sse": tot[2:5], "jumlah_p1": tot[5], "kena10": tot[6:8], "prov": prov}


def nilai(M, A, kini, toko=TOKO):
    """Nilai ramalan kanonik tepat waktu yang minggunya selesai >= TUNGGU hari lalu, dengan titik di DALAM minggu itu saja."""
    jn = os.path.join(toko, "nilai.jsonl")
    sudah = {(w["tahun"], w["minggu"]) for w in baca_jsonl(jn)}
    h = hari(kini.astimezone(WIB).date())
    baru = []
    for (Y, k), e in sorted(kanonik(toko).items()):
        if (Y, k) in sudah or e[3]:
            continue                                   # sudah dinilai, atau terlambat (tidak pernah dinilai)
        t = hari_terbit(Y, k)
        if h < t + 7 + TUNGGU:
            continue
        r = baca_ramalan(e[4], toko)
        out = {"tahun": Y, "minggu": k, "terbit": r["terbit"], "dibuat_ramalan": r["dibuat"], "dinilai": iso(kini)}
        if r["kunci"] != M["meta"]["kunci"] or r["n_sel"] != len(M["sel"]):
            out.update(status="tidak_dinilai", alasan="artefak berbeda dari saat terbit")
        elif not all(tercakup(A, x) for x in range(t + 1, t + 8)):
            if h < t + 7 + BATAS_TUNGGU:
                continue
            out.update(status="tidak_dinilai", alasan=f"celah data NOAA-20 di minggu itu (ditunggu {BATAS_TUNGGU} hari)")
        else:
            cnt = hitung(A, t + 1, t + 7, M["nonveg"], M["statis"])
            out.update(status="dinilai", **skor_minggu(M, r, [1 if c in cnt else 0 for c in M["sel"]]))
        tambah_jsonl(jn, out)
        baru.append(out)
    return baru


def hitung_syarat(N, ulang=0, seed=20261023):
    """Syarat publik terdaftar pada minggu N. ulang > 0: selang 95% bootstrap blok minggu untuk syarat 1."""
    pos = sum(w["berapi"] for w in N)
    se = [w["sse"] for w in N]
    bss = 1 - sum(s[0] for s in se) / sum(s[1] for s in se)
    s1 = {"bss": round(bss, 4), "ok": bss > 0}
    if ulang:
        rng = random.Random(seed)
        bs = sorted(1 - sum(se[j][0] for j in ix) / sum(se[j][1] for j in ix)
                    for ix in ([rng.randrange(len(N)) for _ in N] for _ in range(ulang)))
        s1["ci95"] = [round(bs[int(.025 * ulang)], 4), round(bs[int(.975 * ulang) - 1], 4)]
        s1["ok"] = bss > 0 and s1["ci95"][0] > 0
    r1, rb, rasio = ((sum(w["kena10"][0] for w in N) / pos, sum(w["kena10"][1] for w in N) / pos, sum(w["jumlah_p1"] for w in N) / pos)
                     if pos else (None, None, None))
    prov = {}
    for kode in PRIORITAS:
        v = [w["prov"][kode] for w in N if kode in w["prov"]]
        if sum(x[1] for x in v) >= PUBLIK_MIN["prov_berapi"]:
            b = 1 - sum(x[2] for x in v) / sum(x[4] for x in v)
            prov[kode] = {"berapi": sum(x[1] for x in v), "bss_b2": round(b, 4), "ok": b >= 0}
    s = {"1_bss_b1": s1,
         "2_recall10": {"p1": r1 and round(r1, 4), "b1": rb and round(rb, 4), "ok": bool(pos) and r1 >= rb},
         "3_rasio": {"nilai": rasio and round(rasio, 4), "rentang": PUBLIK_MIN["rasio"], "ok": bool(pos) and PUBLIK_MIN["rasio"][0] <= rasio <= PUBLIK_MIN["rasio"][1]},
         "4_prov_b2": {"rinci": prov, "ok": all(v["ok"] for v in prov.values())}}
    return {"minggu": len(N), "berapi": pos, "syarat": s, "lolos": all(v["ok"] for v in s.values())}


def syarat_publik(N):
    """-> (blok syarat, lolos). Vonis SEKALI pada awalan terpendek dengan >= 6 minggu dan >= 2.000 sel berapi; sebelum itu None."""
    out = {"ambang": PUBLIK_MIN, "berjalan": hitung_syarat(N) if N else None, "vonis": None}
    acc = 0
    for i, w in enumerate(N):
        acc += w["berapi"]
        if i + 1 >= PUBLIK_MIN["minggu"] and acc >= PUBLIK_MIN["berapi"]:
            out["vonis"] = {**hitung_syarat(N[:i + 1], PUBLIK_MIN["bootstrap"]), "dinilai_pada": [[w["tahun"], w["minggu"]] for w in N[:i + 1]]}
            return out, out["vonis"]["lolos"]
    return out, None


def ringkas_prospektif(toko, kini):
    semua = baca_jsonl(os.path.join(toko, "nilai.jsonl"))
    N = sorted((w for w in semua if w.get("status") == "dinilai"), key=lambda w: (w["tahun"], w["minggu"]))
    blok, lolos = syarat_publik(N)
    kn = kanonik(toko)
    dinilai = {(w["tahun"], w["minggu"]) for w in semua}
    minggu = [{"tahun": w["tahun"], "minggu": w["minggu"], "terbit": w["terbit"], "n_sel": w["n_sel"], "berapi": w["berapi"],
               "brier_p1": round(w["sse"][0] / w["n_sel"], 6), "brier_b1": round(w["sse"][1] / w["n_sel"], 6),
               "brier_b2": round(w["sse"][2] / w["n_sel"], 6), "recall10_p1": w["berapi"] and round(w["kena10"][0] / w["berapi"], 4),
               "recall10_b1": w["berapi"] and round(w["kena10"][1] / w["berapi"], 4),
               "rasio_p": w["berapi"] and round(w["jumlah_p1"] / w["berapi"], 4)} for w in N]
    pos = sum(w["berapi"] for w in N)
    if lolos is None:
        ringkas = (f"{len(N)} minggu dinilai, {pos:,} sel berapi".replace(",", ".") +
                   f"; syarat publik dinilai sesudah >= {PUBLIK_MIN['minggu']} minggu dan >= {PUBLIK_MIN['berapi']:,} sel berapi".replace(",", "."))
        if N:
            ringkas += f"; Brier skill P1 vs pembanding riwayat sejauh ini {blok['berjalan']['syarat']['1_bss_b1']['bss']:.3f}".replace(".", ",")
    else:
        v = blok["vonis"]
        gagal = [k for k, x in v["syarat"].items() if not x["ok"]]
        ringkas = (f"{'LOLOS' if lolos else 'GAGAL'} syarat publik pada {v['minggu']} minggu pertama ({v['berapi']:,} sel berapi)".replace(",", ".")
                   + ("" if lolos else f"; tidak terpenuhi: {', '.join(gagal)}"))
    return {"versi": "P1", "diperbarui": iso(kini), "definisi": "berapi = sel non-statis dengan >= 1 titik NOAA-20 NRT keyakinan sedang/tinggi "
            "(api vegetasi) dalam 7 hari WIB minggu itu; dinilai >= 2 hari sesudah minggu berakhir; ramalan terbit terlambat tidak dinilai",
            "minggu": minggu, "terlambat": [{"tahun": e[0], "minggu": e[1], "dibuat": e[2]} for e in kn.values() if e[3]],
            "menunggu": [{"tahun": e[0], "minggu": e[1]} for (Y, k), e in sorted(kn.items()) if not e[3] and (Y, k) not in dinilai],
            "tidak_dinilai": [{k: w[k] for k in ("tahun", "minggu", "alasan")} for w in semua if w.get("status") == "tidak_dinilai"],
            "tanpa_ramalan": baca_jsonl(os.path.join(toko, "tolak.jsonl"))[-20:],
            "syarat": blok, "lolos": lolos, "ringkas": ringkas}


# ---------------------------------------------------------------- keluaran (kontrak R2 risiko/terbaru.json, risiko/prospektif.json)
def isi_terbaru(M, r, P, kini, minggu_ini=None):
    s = r.get("satuan", 1e-6)
    p = [v * s for v in r["p1"]]
    pk = [0] * len(p)
    prov = {}
    for u, ii in M["per_prov"].items():
        ii = sorted(ii, key=lambda i: (-p[i], i))
        for rk, i in enumerate(ii, 1):
            pk[i] = math.ceil(100 * rk / len(ii))
        sp = sum(p[i] for i in ii)
        prov[M["prov"][u]] = {"sel": len(ii), "harapan_berapi": round(sp, 1), "p_rata_permil": round(1000 * sp / len(ii), 2)}
    pilih = sorted((i for i in range(len(p)) if p[i] >= 0.001 or pk[i] <= 20), key=lambda i: (-p[i], i))
    ub = M["meta"]["uji_balik"]
    out = {"versi": "P1", "status": "eksperimental", "minggu": r["minggu"], "tahun": r["tahun"], "terbit": r["terbit"], "berlaku": r["berlaku"],
           "terlambat": r["terlambat"], "dibuat": r["dibuat"], "sensor": "NOAA-20", "grid": {"x0": X0, "y1": Y1, "sel": SEL},
           "sel": [[M["sel"][i] % NX, M["sel"][i] // NX, round(1000 * p[i], 1), pk[i]] for i in pilih], "prov": prov,
           "keandalan": {"uji_balik": {k: ub[k] for k in ("auc_dalam_prov_minggu", "pembanding_riwayat", "recall10")},
                         "prospektif": {"minggu_dinilai": len(P["minggu"]), "sel_berapi": sum(w["berapi"] for w in P["minggu"]),
                                        "lolos": P["lolos"], "ringkas": P["ringkas"]}},
           "catatan": "Peluang NOAA-20 menangkap >= 1 titik api di sel ~5,5 km dalam 7 hari berlaku. Eksperimental: belum lolos uji prospektif; "
                      "terbit terlambat = minggunya sudah mulai saat dibuat, tidak ikut dinilai.",
           "diperbarui": iso(kini)}
    if minggu_ini:
        out["minggu_ini"] = minggu_ini
    return out


def tulis_keluaran(M, toko, kel, kini, minggu_ini=None):
    P = ringkas_prospektif(toko, kini)
    kn = kanonik(toko)
    if kn:
        T = isi_terbaru(M, baca_ramalan(kn[max(kn)][4], toko), P, kini, minggu_ini)
    else:
        T = {"versi": "P1", "status": "tanpa_ramalan", **(minggu_ini or {}), "sel": [], "prov": {}, "diperbarui": iso(kini),
             "keandalan": {"uji_balik": {k: M["meta"]["uji_balik"][k] for k in ("auc_dalam_prov_minggu", "pembanding_riwayat", "recall10")},
                           "prospektif": {"minggu_dinilai": 0, "sel_berapi": 0, "lolos": None, "ringkas": P["ringkas"]}}}
    for nm, o in (("terbaru.json", T), ("prospektif.json", P)):
        b = json.dumps(o, ensure_ascii=False, separators=(",", ":")).encode()
        if len(b) > BATAS_R2:       # Worker mengalirkan objek R2 apa adanya dan menjawab 500 di atas 8 MB
            print(f"::error title=Risiko P1 {nm} terlalu besar::{len(b) / 1e6:.1f} MB > {BATAS_R2 / 1e6:.1f} MB; tidak ditulis, R2 memakai versi lama")
            continue
        tulis_atom(os.path.join(kel, nm), b)
    return T, P


def harian(kini=None, toko=TOKO, kel=KELUAR, M=None, ambil=None, csv_benih=CSV_N20):
    """CI: arsip -> nilai -> ramal (tepat waktu di hari terbit; terlambat bila minggu berjalan belum punya ramalan sama sekali) -> keluaran."""
    kini = kini or dt.datetime.now(dt.timezone.utc)
    M = M or muat()
    try:
        s = perbarui_arsip(toko, kini, ambil=ambil, csv_benih=csv_benih)
        log(f"arsip NOAA-20: {s['hari']} hari {s['rentang']}, {s['permintaan']} permintaan, benih CSV {s['benih_csv']}")
        for g in s["gagal"]:
            print(f"::warning title=Risiko P1 arsip NOAA-20::{g}")
    except Exception as e:  # noqa: BLE001
        print(f"::warning title=Risiko P1 arsip NOAA-20::{e}; dilanjutkan dengan arsip yang ada")
    A = baca_arsip(toko)
    for w in nilai(M, A, kini, toko):
        log(f"dinilai {w['tahun']}-{w['minggu']}: {w['status']} {w.get('berapi', w.get('alasan'))}")
    d = kini.astimezone(WIB).date()
    besok = minggu_dari(d + dt.timedelta(days=1))
    sasaran = besok if besok and tgl(hari_terbit(*besok)) == d else minggu_dari(d)
    minggu_ini = None
    if sasaran and sasaran not in kanonik(toko):
        try:
            r = ramal(M, A, *sasaran, kini)
            log(f"ramalan {sasaran} dibekukan{' (TERLAMBAT)' if r['terlambat'] else ''}: {os.path.basename(bekukan(r, toko))}")
        except Tolak as e:
            minggu_ini = {"tahun": sasaran[0], "minggu": sasaran[1], "status": "tanpa_ramalan", "alasan": str(e), "dicek": iso(kini)}
            tambah_jsonl(os.path.join(toko, "tolak.jsonl"), minggu_ini)
            print(f"::warning title=Risiko P1 tanpa ramalan::minggu {sasaran}: {e}")
    T, P = tulis_keluaran(M, toko, kel, kini, minggu_ini)
    log(f"keluaran: ramalan {T.get('tahun')}-{T.get('minggu')} {len(T['sel'])} sel; prospektif {len(P['minggu'])} minggu dinilai, lolos {P['lolos']}")
    return T, P


def kemas(tujuan, toko=TOKO):
    """Seluruh catatan (ramalan beku, nilai, tolak) -> satu jsonl.gz untuk R2 (poskokarhutla-foto/arsip/risiko_p1.jsonl.gz)."""
    baris = [{"j": "r", **baca_ramalan(e[4], toko)} for e in daftar_ramalan(toko)]
    baris += [{"j": "n", **w} for w in baca_jsonl(os.path.join(toko, "nilai.jsonl"))]
    baris += [{"j": "t", **w} for w in baca_jsonl(os.path.join(toko, "tolak.jsonl"))]
    tulis_atom(tujuan, gzip.compress("".join(json.dumps(b, separators=(",", ":"), ensure_ascii=False) + "\n" for b in baris).encode(), 6))
    return len(baris)


def pulih(sumber, toko=TOKO):
    """Gabungkan salinan R2: arsip NOAA-20 (per hari, yang lebih kaya menang) atau catatan (HANYA menambah yang belum ada)."""
    with gzip.open(sumber, "rt") as f:
        B = [json.loads(l) for l in f if l.strip()]
    if B and "j" not in B[0]:
        A = baca_arsip(toko)
        n = gabung_arsip(A, {r["d"]: r for r in B})
        tulis_arsip(A, toko)
        return f"arsip NOAA-20: {n} dari {len(B)} hari dipakai dari salinan"
    ada_r = {e[4] for e in daftar_ramalan(toko)}
    jn, jt = os.path.join(toko, "nilai.jsonl"), os.path.join(toko, "tolak.jsonl")
    ada_n = {(w["tahun"], w["minggu"]) for w in baca_jsonl(jn)}
    ada_t = {json.dumps(w, sort_keys=True) for w in baca_jsonl(jt)}
    n = [0, 0, 0]
    for b in B:
        j = b.pop("j")
        if j == "r" and nama_ramalan(b) not in ada_r:
            bekukan(b, toko)
            ada_r.add(nama_ramalan(b))
            n[0] += 1
        elif j == "n" and (b["tahun"], b["minggu"]) not in ada_n:
            tambah_jsonl(jn, b)
            ada_n.add((b["tahun"], b["minggu"]))
            n[1] += 1
        elif j == "t" and json.dumps(b, sort_keys=True) not in ada_t:
            tambah_jsonl(jt, b)
            ada_t.add(json.dumps(b, sort_keys=True))
            n[2] += 1
    return f"catatan: +{n[0]} ramalan, +{n[1]} nilai, +{n[2]} tolak dari salinan"


# ---------------------------------------------------------------- latih (sekali, lokal, numpy)
def latih():
    import numpy as np
    import gbdt_np as G
    import risiko_mingguan as R
    from riwayat_grid import bukan_vegetasi
    from titik_palsu import sel_industri
    if os.path.exists(os.path.join(ART, "meta.json")) and os.environ.get("RISIKO_TIMPA") != "1":
        sys.exit("data/risiko_p1/meta.json sudah ada: P1 beku. Versi baru = P2 (daftarkan dulu, folder sendiri).")
    w0, wkt = time.time(), {}
    h_akhir = hari_terbit(2026, 42)                 # 21 Okt 2026 = akhir minggu 41, minggu lengkap terakhir sebelum 23 Okt
    A = baca_arsip()
    kurang = [tgl(x).isoformat() for x in range(H_ARSIP, h_akhir + 1) if not tercakup(A, x)]
    if kurang:
        sys.exit(f"arsip NOAA-20 belum mencakup hari WIB {kurang}: jalankan `arsip` dulu")
    nonveg = set()
    for b in ("viirs_2012_2014.csv", "viirs.csv", "viirs_noaa20.csv"):          # = risiko_mingguan.api
        nonveg |= bukan_vegetasi(os.path.join(R.FIRMS, b))
    wkt["nonveg"] = round(time.time() - w0)
    log(f"nonveg {len(nonveg)} sel 0,01")
    # seri: S-NPP < 1 Apr 2018, NOAA-20 sesudahnya, TANPA faktor penyetara; hari WIB < 12 Okt dari api.npz, sesudahnya dari arsip
    Z = np.load(os.path.join(R.RAW, "api.npz"))
    ms, mn = Z["snpp_hari"] < R.SAKLAR, (Z["n20_hari"] >= R.SAKLAR) & (Z["n20_hari"] < H_ARSIP)
    ex = [(c, x, v) for c, d in hitung(A, H_ARSIP, h_akhir, nonveg, set()).items() for x, v in d.items()]
    c = np.concatenate([Z["snpp_sel"][ms], Z["n20_sel"][mn], np.array([e[0] for e in ex], np.int64)]).astype(np.int64)
    h = np.concatenate([Z["snpp_hari"][ms], Z["n20_hari"][mn], np.array([e[1] for e in ex], np.int32)]).astype(np.int32)
    n = np.concatenate([Z["snpp_n"][ms], Z["n20_n"][mn], np.array([e[2] for e in ex], np.int32)]).astype(np.float32)
    o = np.argsort(h, kind="stable")
    c, h, n = c[o], h[o], n[o]
    # sel statis: titik_palsu (tanpa kawah) + sel berapi > 20% dari 572 minggu 2015-2025, seluruh kisi
    tahun = np.array([tgl(x).year for x in range(int(h.max()) + 1)])
    kal = np.array([(tgl(x).timetuple().tm_yday - 1) // 7 for x in range(int(h.max()) + 1)])
    yy, kw = tahun[h], kal[h]
    m = (kw < MINGGU) & (yy >= 2015) & (yy <= 2025)
    jm = np.bincount(np.unique(c[m] * 1000 + (yy[m] - 2015) * MINGGU + kw[m]) // 1000, minlength=NY * NX)
    ambang = 0.2 * 11 * MINGGU
    kerap = set(np.flatnonzero(jm > ambang).tolist())
    tp = set()
    for la, lo in sel_industri()[0]:
        for dx in (-.00499, .00499):
            for dy in (-.00499, .00499):
                q = sel_id(lo / 100 + dx, la / 100 + dy)
                if q >= 0:
                    tp.add(q)
    statis = sorted(kerap | tp)
    keep = ~np.isin(c, statis)
    log(f"sel statis {len(statis)} (kerap {len(kerap)}, titik_palsu {len(tp)}); titik dibuang {int((~keep).sum())} sel-hari")
    c, h, n = c[keep], h[keep], n[keep]
    S0, prov0, kab0, XL0 = R.populasi()
    mp = ~np.isin(S0, statis)
    S, prov, kab, XL = S0[mp], prov0[mp], kab0[mp], XL0[mp]
    ns = len(S)
    assert np.isfinite(XL).all(), "lahan NaN"
    R.TH1 = 2026                                    # matriks_minggu memuat 2026 (target baris 2026); riwayat tetap < tahun baris
    try:
        P, P3 = R.matriks_minggu(c, h, n, S)
    finally:
        R.TH1 = 2025
    up, pi, ua, ai = R.kode_wilayah(prov, kab)
    kk = R.pilih_k_wilayah(P, pi, ai, len(up), len(ua), list(range(2013, 2026)), None)
    wkt["siapkan"] = round(time.time() - w0)
    log(f"populasi {ns} sel (statis dibuang {int((~mp).sum())}), k wilayah {kk}")
    W0, wk0 = np.zeros((1, 0, len(R.CUACA_F)), np.float32), np.zeros(ns, int)
    kol = list(range(len(API_F))) + [len(R.API_F) + len(R.CUACA_F)]          # API_F + minggu dari fitur_tetap

    def baris(Y):
        th = R.riwayat_tahun(Y, None)               # hanya tahun SEBELUM baris
        R.cek_riwayat(Y, None, th)
        Xt = R.fitur_tetap(Y, c, h, n, S, wk0, W0, {}, {})[:, kol]
        Rw = R.fitur_riwayat(P, P3, Y, th)
        rp, ra = R.susut(P, pi, ai, len(up), len(ua), th, *kk)
        reg = np.stack([rp[pi].T, ra[ai].T], 2).reshape(MINGGU * ns, 2).astype(np.float32)
        XLr = np.broadcast_to(XL[None], (MINGGU, ns, XL.shape[1])).reshape(MINGGU * ns, -1)
        return np.concatenate([Xt, XLr, Rw, reg], 1).astype(np.float32), Rw, rp, ra
    Xs, ys, ws, per_th = [], [], [], {}
    for Y in range(2013, 2027):
        X, Rw, rp, ra = baris(Y)
        y = R.target_tahun(P, Y)
        idx, w = R.ambil_latih(Y, None, y, R.SEED)
        if Y == 2026:
            ok = np.array([hari_terbit(Y, k) + 7 <= h_akhir for k in range(MINGGU)])[idx // ns]
            idx, w = idx[ok], w[ok]
            X26, ekspor = X[42 * ns:43 * ns].copy(), (Rw, rp, ra)
        assert np.isfinite(X[idx]).all(), f"fitur NaN di baris latih {Y}"
        Xs.append(X[idx]); ys.append(y[idx]); ws.append(w)
        per_th[Y] = [int(len(idx)), int(y[idx].sum())]
        del X
        log(f"baris {Y}: {per_th[Y][0]} ({per_th[Y][1]} positif)")
    X, y, w = np.concatenate(Xs), np.concatenate(ys), np.concatenate(ws)
    del Xs
    wkt["baris"] = round(time.time() - w0)
    mdl = G.latih(X, y, w, **R.HP, seed=R.SEED, log=log)
    wkt["gbdt"] = round(time.time() - w0)
    i13, ik = [FITUR.index(f) for f in B1_F], FITUR.index("klim")
    b1 = G.logistik(np.log1p(X[:, i13].astype(np.float64)), y, w)
    b2 = G.logistik(np.column_stack([(X[:, 0] > 0).astype(np.float64), np.nan_to_num(X[:, ik].astype(np.float64))]), y, w)
    assert np.isfinite(b1).all() and np.isfinite(b2).all()
    log(f"AUC dalam-sampel (info): P1 {G.auc(G.prediksi(mdl, X), y):.4f}, B1 {G.auc(G.pred_logistik(b1, np.log1p(X[:, i13])), y):.4f}")
    npos, nbaris = int(y.sum()), len(y)
    del X, y, w
    # ekspor
    os.makedirs(ART, exist_ok=True)

    def tulis(nm, data):
        tulis_atom(os.path.join(ART, nm), data if nm.endswith(".json") else gzip.compress(data, 9, mtime=0))
    f4 = lambda a: np.ascontiguousarray(a, "<f4").tobytes()  # noqa: E731
    js = lambda o: json.dumps(o, separators=(",", ":"), ensure_ascii=False).encode()  # noqa: E731
    Rw, rp, ra = ekspor
    tulis("sel.json.gz", js({"sel": S.tolist(), "pi": pi.tolist(), "ai": ai.tolist(), "prov": up.tolist(), "kab": ua.tolist()}))
    tulis("lahan.f32.gz", f4(XL))
    for j, nm in enumerate(("klim", "klim5", "klim_3")):
        tulis(f"{nm}.f32.gz", f4(Rw[:, j]))                        # (minggu, sel)
    tulis("kek.f32.gz", f4(Rw[:ns, 3]))
    tulis("reg_prov.f32.gz", f4(rp))
    tulis("reg_kab.f32.gz", f4(ra))
    tulis("statis.json", js({"sel": statis, "kerap": sorted(kerap), "titik_palsu": sorted(tp), "minggu_ambang": f"> {ambang:g} dari {11 * MINGGU}",
                             "catatan": "sel 0,05 (iy*940+ix); kerap = berapi > 20% minggu 2015-2025; titik_palsu = sel_industri() tanpa kawah"}))
    tulis("nonveg.json.gz", js(sorted(nonveg)))
    tulis("p1_pohon.json.gz", js(mdl))
    berkas = {nm: sha256(os.path.join(ART, nm)) for nm in NAMA_ART}
    meta = {"versi": "P1", "status": "eksperimental", "dibuat": iso(dt.datetime.now(dt.timezone.utc)),
            "pendaftaran": "docs/riset/RISIKO-MINGGUAN.md, Pendaftaran model produksi P1 (f7a3f5da)", "fitur": FITUR, "hp": R.HP, "seed": R.SEED,
            "sampel": {"positif": [0.5, 2.0], "negatif": [0.02, 50.0]}, "k_wilayah": [float(x) for x in kk],
            "latih": {"baris": nbaris, "positif": npos, "per_tahun": per_th, "minggu_akhir": [2026, 41], "data_sampai": tgl(h_akhir).isoformat(),
                      "sensor": "S-NPP s.d. 31 Mar 2018 lalu NOAA-20, tanpa faktor penyetara", "arsip_mulai_wib": tgl(H_ARSIP).isoformat()},
            "riwayat": {"tahun_baris": 2026, "tahun": [2012, 2025]}, "ns": ns,
            "statis": {"sel": len(statis), "kerap": len(kerap), "titik_palsu": len(tp), "di_populasi": int((~mp).sum())},
            "b1": {"fitur": B1_F, "ubah": "log1p", "koef": b1.tolist()}, "b2": {"fitur": ["n7>0", "klim"], "koef": b2.tolist()},
            "grid": {"x0": X0, "y1": Y1, "sel": SEL, "nx": NX, "ny": NY}, "berkas": berkas,
            "kunci": hashlib.sha256("".join(f"{k}{v}" for k, v in sorted(berkas.items())).encode()).hexdigest()[:16]}
    meta["uji_balik"] = angka_uji_balik(R, G, np)
    tulis_atom(os.path.join(ART, "meta.json"), json.dumps(meta, ensure_ascii=False, indent=1).encode())
    # paritas: jalur stdlib CI (artefak + arsip) = jalur numpy latih, minggu 42 2026 (hari terbit 21 Okt), SEMUA sel
    M = muat()
    Xs_, _ = fitur_minggu(M, A, 2026, 42)
    Xd = np.array(Xs_, np.float64)
    beda = int((Xd != X26.astype(np.float64)).any(1).sum())
    assert beda == 0, f"paritas fitur stdlib vs numpy: {beda} sel beda"
    pn = np.column_stack([G.prediksi(mdl, X26), G.pred_logistik(b1, np.log1p(X26[:, i13].astype(np.float64))),
                          G.pred_logistik(b2, np.column_stack([(X26[:, 0] > 0).astype(np.float64), X26[:, ik].astype(np.float64)]))])
    ps = np.array([peluang(M, x) for x in Xs_])
    dmax = float(np.abs(ps - pn).max())
    assert dmax < 1e-9, f"paritas peluang stdlib vs numpy beda {dmax}"
    t42 = hari_terbit(2026, 42)
    cnt = hitung(A, t42 - JENDELA + 1, t42, M["nonveg"], M["statis"])
    rng = np.random.default_rng(3)
    pilih = sorted(set(rng.choice(ns, 2500, replace=False).tolist()) | set(np.argsort(-pn[:, 0])[:500].tolist()))
    tulis("paritas.json.gz", js({"tahun": 2026, "minggu": 42, "t": t42, "hitungan": [[a, b_, v] for a, d in cnt.items() for b_, v in d.items()],
                                 "sampel": [[i, X26[i].tolist(), *pn[i].tolist()] for i in pilih]}))
    meta["paritas"] = {"minggu": [2026, 42], "sel": ns, "fitur_beda": beda, "peluang_beda_maks": dmax, "sha256": sha256(os.path.join(ART, "paritas.json.gz"))}
    wkt["total"] = round(time.time() - w0)
    meta["waktu_dtk"] = wkt
    tulis_atom(os.path.join(ART, "meta.json"), json.dumps(meta, ensure_ascii=False, indent=1).encode())
    uk = {nm: os.path.getsize(os.path.join(ART, nm)) for nm in sorted(os.listdir(ART)) if os.path.isfile(os.path.join(ART, nm))}
    log(f"artefak {sum(uk.values()) / 1e6:.1f} MB: " + ", ".join(f"{k} {v / 1e3:.0f} KB" for k, v in uk.items()))
    log(f"paritas: fitur beda {beda}, peluang beda maks {dmax:.2e}; waktu {wkt}")


def angka_uji_balik(R, G, np):
    """Angka keandalan uji balik untuk layar: AUC dalam provinsi-minggu dihitung ULANG dari lipatan (lipat_<th>.npz) dan harus sama dengan
    dokumen; recall dari risiko_mingguan_uji.json; pembanding riwayat (audit validasi-model, tak ada di berkas lain) dari dokumen."""
    doc = open(DOK, encoding="utf-8").read()
    a = re.search(r"AUC di dalam provinsi-minggu \(cara tim lapangan memilah\) model (\d+,\d+), logistik riwayat\s+(\d+,\d+)", doc)
    b = re.search(r"Recall bila 10% sel teratas per provinsi-minggu ditandai: (\d+,\d+)", doc)
    f = lambda s: float(s.replace(",", "."))  # noqa: E731
    out = {"auc_dalam_prov_minggu": f(a[1]), "pembanding_riwayat": f(a[2]), "recall10": f(b[1])}
    rj = json.load(open(os.path.join(R.PUBLIK, "risiko_mingguan_uji.json")))["himpunan"]["musim"]["semua"]["recall_atas10"]["model"]
    assert round(rj, 3) == out["recall10"], (rj, out)
    D, _ = R.kumpul()
    m = D["musim"]
    g = ((D["tahun"].astype(np.int64) * 100 + D["minggu"]) * 100 + D["prov"])[m]
    p, y = D["model"][m].astype(np.float64), D["y"][m]
    del D
    o = np.lexsort((p, g))
    p, y, g = p[o], y[o], g[o]
    U = PN = 0.0
    batas = np.flatnonzero(np.r_[True, g[1:] != g[:-1]])
    for a0, a1 in zip(batas, np.r_[batas[1:], len(g)]):
        yy = y[a0:a1]
        npos = int(yy.sum())
        if 0 < npos < len(yy):
            _, inv, cn = np.unique(p[a0:a1], return_inverse=True, return_counts=True)
            rk = (np.cumsum(cn) - (cn - 1) / 2.0)[inv]
            U += rk[yy].sum() - npos * (npos + 1) / 2
            PN += npos * (len(yy) - npos)
    auc = U / PN
    assert round(auc, 3) == out["auc_dalam_prov_minggu"], (auc, out)
    out.update({"auc_dalam_prov_minggu_dihitung": round(auc, 4), "himpunan": "Jul-Nov, tinggalkan-satu-tahun 2015-2025",
                "sumber": "lipat_<th>.npz (AUC), public/data/risiko_mingguan_uji.json (recall), docs/riset/RISIKO-MINGGUAN.md Koreksi audit (pembanding riwayat)",
                "catatan": "model uji balik (dengan cuaca, ENSO, sel statis belum ditapis); P1 tanpa keduanya, setara di 2026 menurut audit"})
    return out


# ---------------------------------------------------------------- swauji
def uji():
    import contextlib, tempfile
    # 1. kalender model
    assert tgl(hari_terbit(2026, 42)) == dt.date(2026, 10, 21) and minggu_dari(dt.date(2026, 10, 22)) == (2026, 42)
    assert minggu_dari(dt.date(2026, 10, 21)) == (2026, 41) and minggu_dari(dt.date(2026, 12, 31)) is None
    assert tgl(hari_terbit(2027, 0)) == dt.date(2026, 12, 31)
    # 2. potong <= 5 hari berurutan; final; gabung (yang lebih kaya menang, jawaban kosong tidak menimpa)
    D = [dt.date(2026, 10, d) for d in (1, 2, 3, 4, 5, 6, 7, 9)]
    assert potong(D) == [(D[0], 5), (D[5], 2), (D[7], 1)]
    rec = lambda d, n, t, s="nrt", r=(): {"d": d, "diambil": t, "sumber": s, "n": n, "r": list(r)}  # noqa: E731
    assert not final(rec("2026-10-20", 5, "2026-10-21T10:00:00Z")) and final(rec("2026-10-20", 5, "2026-10-22T06:00:00Z"))
    assert not final(rec("2026-10-20", 0, "2026-10-23T00:00:00Z")) and final(rec("2026-10-20", 0, "2026-10-26T00:00:00Z"))
    A = {"2026-10-20": rec("2026-10-20", 9, "2026-10-21T10:00:00Z")}
    gabung_arsip(A, {"2026-10-20": rec("2026-10-20", 0, "2026-10-22T10:00:00Z")})
    assert A["2026-10-20"]["n"] == 9, "jawaban FIRMS yang lebih miskin menimpa arsip"
    gabung_arsip(A, {"2026-10-20": rec("2026-10-20", 12, "2026-10-22T10:00:00Z")})
    assert A["2026-10-20"]["n"] == 12
    # 3. jawaban FIRMS bukan CSV ditolak; galat unduh tidak membocorkan kunci
    try:
        baris_firms("Invalid MAP_KEY.", dt.date(2026, 10, 1), 1, "nrt", "x")
        raise SystemExit("jawaban FIRMS bukan CSV seharusnya DITOLAK")
    except RuntimeError as e:
        assert "Invalid" in str(e)
    try:
        unduh("http://127.0.0.1:9/area/csv/RAHASIA123/x", "RAHASIA123", coba=1)
        raise SystemExit("unduh ke port tertutup seharusnya gagal")
    except RuntimeError as e:
        assert "RAHASIA123" not in str(e), e
    per = baris_firms("latitude,longitude,bright_ti4,scan,track,acq_date,acq_time,satellite,instrument,confidence,version,bright_ti5,frp,daynight\n"
                      "-2.0,113.0,330,0.4,0.4,2026-10-01,1659,N20,VIIRS,n,2.0NRT,290,3,N\n-2.0,113.0,330,0.4,0.4,2026-10-01,0610,N20,VIIRS,l,2.0NRT,290,3,D\n",
                      dt.date(2026, 10, 1), 2, "nrt", "2026-10-03T00:00:00Z")
    assert per["2026-10-01"]["n"] == 2 and len(per["2026-10-01"]["r"]) == 1 and per["2026-10-02"]["n"] == 0
    # 4. hitung: keyakinan l, tipe 2, NRT di sel bukan-vegetasi, sel statis, batas hari WIB (16.59 UTC = hari sama, 17.00 = besok)
    sa, sb, ss = sel_id(113.01, -2.01), sel_id(113.06, -2.01), sel_id(113.11, -2.01)
    h0 = hari(dt.date(2026, 10, 10))
    A = {tgl(h0 - 1).isoformat(): rec("", 1, "", "csv", [[-2.01, 113.01, "1700", "n", ""]]),          # = hari WIB h0
         tgl(h0).isoformat(): rec("", 6, "", "csv", [[-2.01, 113.01, "1659", "h", ""], [-2.01, 113.06, "0500", "l", ""],
                                                       [-2.01, 113.06, "0500", "n", "2"], [-2.03, 113.07, "0500", "n", ""],
                                                       [-2.01, 113.11, "0500", "n", "0"], [-2.01, 113.06, "1700", "n", "0"]])}
    c = hitung(A, h0, h0, {(-2.03, 113.07)}, {ss})
    assert c == {sa: {h0: 2}}, c
    assert hitung(A, h0 + 1, h0 + 1, set(), set()) == {sb: {h0 + 1: 1}}
    # 5. kotak_tebar = jumlah jendela brute force, terpotong di tepi kisi
    rng = random.Random(4)
    v = {rng.randrange(NY * NX): rng.randint(1, 9) for _ in range(300)} | {0: 3, NY * NX - 1: 2, 939: 4}
    for r in (1, 5):
        K = kotak_tebar(v, r)
        for q in list(v)[:40] + [0, 939, NY * NX - 1, 5 * NX + 7]:
            y, x = divmod(q, NX)
            bf = sum(v.get(yy * NX + xx, 0) for yy in range(max(y - r, 0), min(y + r + 1, NY)) for xx in range(max(x - r, 0), min(x + r + 1, NX)))
            assert K[q] == bf, (r, q, K[q], bf)
    # 6. model sintetis kecil: ramal / tolak / beku / nilai / syarat / keluaran
    sel = [sel_id(113.01 + .05 * i, -2.01) for i in range(10)]           # 10 sel berderet, satu provinsi
    statis = {sel_id(113.51, -2.01)}                                     # sel ke-11, statis: tidak di M['sel']
    pohon = {"bias": -3.0, "pohon": [[[0, 0.5, 1, 2], [-1.0], [2.0]], [[FITUR.index("n7_3"), 1.5, 1, 2], [0.0], [0.5]]]}

    def model(lahan_nan=False):
        L = array.array("f", [0.0] * (10 * len(LAHAN_F)))
        if lahan_nan:
            L[3] = float("nan")
        z = lambda n: array.array("f", [0.0] * n)  # noqa: E731
        return lengkapi({"meta": {"kunci": "uji", "riwayat": {"tahun_baris": 2026}, "uji_balik": {"auc_dalam_prov_minggu": .8, "pembanding_riwayat": .7, "recall10": .4}},
                         "sel": sel, "pi": [0] * 10, "ai": [0] * 10, "prov": ["62"], "kab": ["62|X"], "statis": statis, "nonveg": set(),
                         "pohon": siapkan_pohon(pohon), "b1": [-4.0] + [0.1] * 13, "b2": [-4.0, 2.0, 1.0], "lahan": L,
                         "klim": z(520), "klim5": z(520), "klim_3": z(520), "kek": z(10), "reg_prov": z(52), "reg_kab": z(52)})
    M = model()
    t = hari_terbit(2026, 42)

    def arsip(hari_ada, titik):
        """hari_ada: hari WIB tercakup; titik: [(sel_index atau 'statis', hari WIB, jam UTC)]"""
        A = {}
        for hw in hari_ada:
            for hu in (hw - 1, hw):
                A.setdefault(tgl(hu).isoformat(), rec(tgl(hu).isoformat(), 1, "2026-12-01T00:00:00Z", "csv"))
        for s, hw, jam in titik:
            lon = 113.51 if s == "statis" else 113.01 + .05 * s
            hu = hw if int(jam[:2]) < 17 else hw - 1
            A.setdefault(tgl(hu).isoformat(), rec(tgl(hu).isoformat(), 1, "2026-12-01T00:00:00Z", "csv"))["r"].append([-2.01, lon, jam, "n", ""])
        return A
    semua = range(t - 89, t + 30)
    A = arsip(semua, [(0, t, "0500"), (0, t - 40, "0500"), (3, t - 40, "0500"), ("statis", t, "0500"), ("statis", t, "0600"),
                      (5, t + 3, "0500"), (6, t, "0500"), (7, t + 8, "0500"), (8, t + 1, "1800")])
    kini = dt.datetime(2026, 10, 21, 14, 30, tzinfo=dt.timezone.utc)                     # hari terbit, 21.30 WIB
    X, _ = fitur_minggu(M, A, 2026, 42)
    # sel 0: titik hari t (t-40 di luar 30 hari); 11x11 = sel 0..5 (sel 6 enam kolom jauhnya); sel 1: tetangga sel 0, 11x11 memuat sel 0 dan 6
    assert X[0][:8] == [1, 1, 1, 1, 1, 1, 0, 42] and X[1][:7] == [0, 0, 1, 1, 2, 2, 90] and X[3][6] == 40, X[:4]
    assert X[9][2] == 0 and X[9][4] == 1, "titik sel statis ikut fitur tetangga"            # sel 9 bertetangga sel statis; 11x11 = sel 6 saja
    assert all(x[6] == 90 for i, x in enumerate(X) if i not in (0, 3, 6)), "titik sesudah hari terbit ikut fitur"
    r = ramal(M, A, 2026, 42, kini)
    assert not r["terlambat"] and len(r["p1"]) == len(r["b1"]) == len(r["b2"]) == 10, "B1/B2 tidak dibekukan bersama P1"
    assert all(isinstance(v, int) for v in r["p1"] + r["b1"] + r["b2"]) and r["p1"][0] > r["p1"][3]
    # DITOLAK: belum hari terbit, cakupan < 85/90, hari terbit kosong, fitur NaN, tahun riwayat lain
    tanpa_t = {d: x for d, x in A.items() if d != tgl(t).isoformat()}                    # hari UTC t hilang: hari WIB t tak tercakup (89/90)
    for f, kata in ((lambda: ramal(M, A, 2026, 43, kini), "belum hari terbit"),
                    (lambda: ramal(M, arsip([x for x in semua if x < t - 84 or x > t - 79], []), 2026, 42, kini), "hanya 84 dari 90"),
                    (lambda: ramal(M, tanpa_t, 2026, 42, kini), "hari terbit"),
                    (lambda: ramal(model(lahan_nan=True), A, 2026, 42, kini), "NaN"),
                    (lambda: ramal(M, A, 2027, 0, dt.datetime(2027, 1, 1, tzinfo=dt.timezone.utc)), "riwayat")):
        try:
            f()
            raise SystemExit(f"seharusnya DITOLAK ({kata})")
        except Tolak as e:
            assert kata in str(e), (kata, str(e))
    assert ramal(M, arsip([x for x in semua if x < t - 84 or x > t - 80], []), 2026, 42, kini)["cakupan"] == 85
    with tempfile.TemporaryDirectory() as tmp:
        toko, kel = os.path.join(tmp, "toko"), os.path.join(tmp, "kel")
        tulis_arsip(A, toko)
        tanpa_unduh = lambda *a: {}  # noqa: E731

        def hr(kini_):     # harian sintetis; log dan anotasi ::warning-nya dibungkam supaya tidak terbaca sebagai ramalan nyata di log CI
            with contextlib.redirect_stdout(io.StringIO()), contextlib.redirect_stderr(io.StringIO()):
                return harian(kini_, toko, kel, M, tanpa_unduh, None)
        # harian di hari terbit: tepat waktu, dibekukan; keluaran tanpa sel statis
        T, P = hr(kini)
        assert T["minggu"] == 42 and not T["terlambat"] and P["lolos"] is None and P["menunggu"] == [{"tahun": 2026, "minggu": 42}]
        assert {(s[0], s[1]) for s in T["sel"]} <= {(c % NX, c // NX) for c in sel} and all((s[1] * NX + s[0]) not in statis for s in T["sel"])
        assert len(daftar_ramalan(toko)) == 1
        hr(kini + dt.timedelta(hours=1))
        assert len(daftar_ramalan(toko)) == 1, "ramalan beku dibuat ulang"
        try:
            bekukan(baca_ramalan(daftar_ramalan(toko)[0][4], toko), toko)
            raise SystemExit("menimpa ramalan beku seharusnya DITOLAK")
        except RuntimeError:
            pass
        # belum >= 2 hari sesudah minggu berakhir: belum dinilai
        assert nilai(M, A, dt.datetime(2026, 10, 29, 12, tzinfo=dt.timezone.utc), toko) == []
        # dinilai: hanya titik DI DALAM minggu (t+1..t+7); titik hari terbit (sel 0, 6) dan t+8 (sel 7) tidak dihitung
        w = nilai(M, A, dt.datetime(2026, 10, 31, 12, tzinfo=dt.timezone.utc), toko)
        assert len(w) == 1 and w[0]["status"] == "dinilai" and w[0]["berapi"] == 2 and w[0]["n_sel"] == 10, w
        y = [1 if i in (5, 8) else 0 for i in range(10)]
        rr = baca_ramalan(daftar_ramalan(toko)[0][4], toko)
        assert abs(w[0]["sse"][0] - sum((rr["p1"][i] / 1e6 - y[i]) ** 2 for i in range(10))) < 1e-12
        assert nilai(M, A, dt.datetime(2026, 11, 5, tzinfo=dt.timezone.utc), toko) == [], "minggu dinilai dua kali"
        # terlambat: minggu 43 tanpa ramalan sampai 29 Okt -> ramalan terlambat, tampil, TIDAK pernah dinilai
        T, _ = hr(dt.datetime(2026, 10, 29, 3, tzinfo=dt.timezone.utc))
        assert T["minggu"] == 43 and T["terlambat"] is True
        assert nilai(M, A, dt.datetime(2026, 11, 20, tzinfo=dt.timezone.utc), toko) == [], "ramalan terlambat ikut dinilai"
        P = ringkas_prospektif(toko, kini)
        assert [x["minggu"] for x in P["terlambat"]] == [43] and [x["minggu"] for x in P["minggu"]] == [42]
        # hari terbit minggu 44 (4 Nov) tanpa data: tolak tercatat dan tampil sebagai minggu_ini; ramalan terakhir (43) tetap tampil
        tulis_arsip({d: x for d, x in A.items() if d != "2026-11-04"}, toko)
        T, _ = hr(dt.datetime(2026, 11, 4, 14, tzinfo=dt.timezone.utc))
        assert T["minggu"] == 43 and T["minggu_ini"]["status"] == "tanpa_ramalan" and T["minggu_ini"]["minggu"] == 44, T.get("minggu_ini")
        assert (2026, 44) not in kanonik(toko) and baca_jsonl(os.path.join(toko, "tolak.jsonl"))[0]["minggu"] == 44
        # kemas -> pulih ke toko kosong: semua kembali; pulih kedua tidak menambah apa pun (append-only, tanpa dobel)
        kemas(os.path.join(tmp, "r2.jsonl.gz"), toko)
        toko2 = os.path.join(tmp, "toko2")
        pulih(os.path.join(tmp, "r2.jsonl.gz"), toko2)
        assert daftar_ramalan(toko2) == daftar_ramalan(toko) and baca_jsonl(os.path.join(toko2, "nilai.jsonl")) == baca_jsonl(os.path.join(toko, "nilai.jsonl"))
        assert pulih(os.path.join(tmp, "r2.jsonl.gz"), toko2) == "catatan: +0 ramalan, +0 nilai, +0 tolak dari salinan"
        # salinan dobel minggu 42 yang dibekukan lebih akhir (jalan cache-hilang) tidak menggantikan yang paling awal
        r2 = dict(rr, dibuat="2026-10-21T16:00:00Z")
        bekukan(r2, toko2)
        assert kanonik(toko2)[(2026, 42)][2] == rr["dibuat"].replace("-", "").replace(":", "")
        # pulih arsip NOAA-20: hari yang lebih kaya menang
        tulis_arsip({"2026-10-01": rec("2026-10-01", 3, "2026-10-03T00:00:00Z")}, os.path.join(tmp, "x"))
        pulih(os.path.join(tmp, "x", "n20.jsonl.gz"), toko2)
        assert baca_arsip(toko2)["2026-10-01"]["n"] == 3
        # perbarui_arsip: hanya hari belum final, <= 5 hari per permintaan, hari lama dibuang
        minta = []

        def palsu(s, m, n):
            minta.append((s, m, n))
            return {(m + dt.timedelta(days=i)).isoformat(): rec((m + dt.timedelta(days=i)).isoformat(), 4, "2026-10-23T14:00:00Z") for i in range(n)}
        hasil = perbarui_arsip(os.path.join(tmp, "a"), dt.datetime(2026, 10, 23, 14, tzinfo=dt.timezone.utc), palsu,
                               {"VIIRS_NOAA20_NRT": (dt.date(2026, 7, 1), dt.date(2026, 10, 23)), "VIIRS_NOAA20_SP": (dt.date(2018, 4, 1), dt.date(2026, 6, 30))}, None)
        assert not hasil["gagal"] and all(n <= RENTANG for _, _, n in minta) and {s for s, _, _ in minta} == {"sp", "nrt"}
        assert min(baca_arsip(os.path.join(tmp, "a"))) == (dt.date(2026, 10, 23) - dt.timedelta(days=JAGA_HARI - 1)).isoformat()
        minta.clear()
        perbarui_arsip(os.path.join(tmp, "a"), dt.datetime(2026, 10, 23, 15, tzinfo=dt.timezone.utc), palsu,
                       {"VIIRS_NOAA20_NRT": (dt.date(2026, 7, 1), dt.date(2026, 10, 23))}, None)
        assert [d for _, d, _ in minta] == [dt.date(2026, 10, 22)], minta          # hanya 22-23 Okt yang belum final
    # 7. syarat publik: belum dinilai sebelum 6 minggu & 2.000 berapi; vonis pada awalan terpendek, minggu sesudahnya tak mengubah
    def mg(k, pos, sp1, sb1, sb2, kena=(50, 40), jp=None):
        return {"tahun": 2026, "minggu": k, "berapi": pos, "sse": [sp1, sb1, sb2], "jumlah_p1": jp or pos, "kena10": list(kena),
                "prov": {"62": [1000, pos, sp1, sb1, sb2, jp or pos, *kena]}}
    N = [mg(k, 400, 90, 100, 110) for k in range(43, 48)]
    assert syarat_publik(N)[1] is None, "dinilai sebelum 6 minggu"
    N.append(mg(48, 400, 90, 100, 110))
    blok, lolos = syarat_publik(N)
    assert lolos is True and blok["vonis"]["minggu"] == 6 and blok["vonis"]["syarat"]["4_prov_b2"]["rinci"]["62"]["ok"]
    assert syarat_publik(N + [mg(49, 400, 500, 100, 110)])[1] is True, "minggu sesudah vonis mengubah vonis"
    assert syarat_publik([mg(k, 400, 90, 100, 110, kena=(30, 40)) for k in range(6)])[1] is False          # recall P1 < B1
    assert syarat_publik([mg(k, 400, 90, 100, 110, jp=800) for k in range(6)])[1] is False                 # rasio 2,0
    assert syarat_publik([mg(k, 400, 105, 100, 110) for k in range(6)])[1] is False                        # Brier skill < 0
    assert syarat_publik([mg(k, 300, 90, 100, 110) for k in range(6)])[1] is None                          # 1.800 berapi < 2.000
    # 8. paritas dengan artefak nyata: fitur dari hitungan tersimpan = fitur numpy latih, peluang stdlib = numpy
    if os.path.exists(os.path.join(ART, "meta.json")):
        M = muat()
        meta = M["meta"]
        assert sha256(os.path.join(ART, "paritas.json.gz")) == meta["paritas"]["sha256"]
        Q = json.loads(gzip.decompress(open(os.path.join(ART, "paritas.json.gz"), "rb").read()))
        cnt = {}
        for a, b, v in Q["hitungan"]:
            cnt.setdefault(a, {})[b] = v
        assert not set(cnt) & M["statis"], "hitungan memuat sel statis"
        X = fitur_dari_hitungan(M, cnt, Q["t"], Q["minggu"])
        dmax = 0.0
        for i, x, p1, b1, b2 in Q["sampel"]:
            assert X[i] == x, f"paritas fitur sel {i}: {X[i]} vs {x}"
            dmax = max(dmax, *(abs(a - b) for a, b in zip(peluang(M, x), (p1, b1, b2))))
        assert dmax < 1e-9, dmax
        assert not M["statis"] & set(M["sel"]) and len(M["sel"]) == meta["ns"]
        print(f"  paritas artefak {meta['kunci']}: {len(Q['sampel'])} sel, fitur sama, peluang beda maks {dmax:.1e}")
    else:
        print("  (artefak data/risiko_p1 belum ada: paritas dilewati)")
    print("ok")


if __name__ == "__main__":
    a = sys.argv[1:]
    if a == ["uji"]:
        uji()
    elif a == ["latih"]:
        latih()
    elif a == ["arsip"]:
        print(json.dumps(perbarui_arsip(), ensure_ascii=False))
    elif a[:1] == ["ramal"]:
        kini = dt.datetime.now(dt.timezone.utc)
        d = dt.date.fromisoformat(a[1]) if len(a) > 1 else kini.astimezone(WIB).date()
        mg = minggu_dari(d)
        if mg is None:
            sys.exit(f"{d} tidak masuk minggu model mana pun (hari-dalam-tahun 365/366)")
        M, A = muat(), baca_arsip()
        if mg in kanonik():
            sys.exit(f"minggu {mg} sudah punya ramalan beku; tidak dibuat ulang")
        try:
            print(bekukan(ramal(M, A, *mg, kini)))
        except Tolak as e:
            sys.exit(f"tanpa_ramalan: {e}")
        tulis_keluaran(M, TOKO, KELUAR, kini)
    elif a == ["nilai"]:
        kini = dt.datetime.now(dt.timezone.utc)
        M = muat()
        print(json.dumps([{k: w.get(k) for k in ("tahun", "minggu", "status", "berapi", "alasan")} for w in nilai(M, baca_arsip(), kini)]))
        tulis_keluaran(M, TOKO, KELUAR, kini)
    elif a == ["harian"]:
        try:
            harian()
        except Tolak as e:
            sys.exit(f"::error title=Risiko P1::{e}")
    elif a[:1] == ["kemas"] and len(a) == 2:
        print(f"{kemas(a[1])} baris")
    elif a[:1] == ["pulih"] and len(a) == 2:
        print(pulih(a[1]))
    else:
        sys.exit(__doc__)
