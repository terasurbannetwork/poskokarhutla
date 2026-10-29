"""Pustaka bersama /prediksi: jalur, daftar 514 kab/kota, arsip prakiraan append-only, unduh Open-Meteo.

Daftar kab TIDAK dibuat ulang: dibaca dari scripts/udara/kota.json (kode Kepmendagri 2025, titik = rata-rata pusat kecamatan
berbobot penduduk, jiwa WorldPop 2026), milik cuaca-udara. Kunci nama lintas berkas (status.json, titik_hari, DIBI, rob.json)
dicocokkan lewat kota.kunci() (nama dinormalkan + alias), bukan kode: kode DIBI berbeda dari Kepmendagri (169 dari 461 beda).

Arsip: public/prediksi/data/arsip/YYYY-MM.jsonl, satu baris per (tanggal terbit, kode):
  {"t": terbit WIB, "k": kode, "dibuat": ISO, "sumber": str, "hari": [3 tanggal sasaran], "kol": [nama kolom],
   "kab": {id: [[nilai per kolom] x 3 tenggang]}}  (null = tidak ada untuk tenggang itu)
Baris tidak pernah diubah atau dihapus. Arsip lokal yang lebih pendek/berbeda dari git HEAD = keluar kode 3.
"""
import datetime as dt, json, math, os, subprocess, sys

SINI = os.path.dirname(os.path.abspath(__file__))
AKAR = os.path.normpath(os.path.join(SINI, "..", ".."))
sys.path.insert(0, os.path.join(AKAR, "scripts", "udara"))
sys.path.insert(1, os.path.join(AKAR, "scripts", "banjir"))
from kota import kunci  # noqa: E402  (nama kab dinormalkan + alias; satu sumber dengan pipeline udara)
from umum import KuotaHabis, ambil, per_lokasi  # noqa: E402,F401  (unduh dengan coba-ulang, milik banjir)
from wilayah import PROVINSI  # noqa: E402

DATA = os.path.join(AKAR, "public", "prediksi", "data")
ARSIP = os.path.join(DATA, "arsip")
WIB = dt.timezone(dt.timedelta(hours=7))
KODE = ["HJN", "API", "BNJ", "LSR", "ASP", "ROB"]
TENGGANG = 3


def hari_ini():
    return dt.datetime.now(WIB).date().isoformat()


def geser(t, n):
    return (dt.date.fromisoformat(t) + dt.timedelta(days=n)).isoformat()


def kab(akar=AKAR):
    """-> [{id, nama, prov, pn, lat, lon, jiwa, geo}]; id = kode 4 digit Kepmendagri, geo = 'prov|nama kab di public/geo'."""
    d = json.load(open(os.path.join(akar, "scripts", "udara", "kota.json")))
    i = {k: n for n, k in enumerate(d["kolom"])}
    return [{"id": r[i["kode"]], "nama": r[i["nama"]], "prov": r[i["prov"]], "pn": PROVINSI.get(r[i["prov"]], r[i["prov"]]),
             "lat": r[i["lat"]], "lon": r[i["lon"]], "jiwa": r[i["jiwa"]], "geo": f"{r[i['prov']]}|{r[i['kab']]}"} for r in d["baris"]]


def pencari(daftar):
    """-> fungsi (prov kode atau nama, nama kab) -> id. Cocok di provinsi dulu; bila gagal (Papua/DKI berganti nama
    provinsi di DIBI) cocok nasional bila nama itu unik."""
    nama_prov = {v: k for k, v in PROVINSI.items()}
    di_prov, nasional = {}, {}
    for k in daftar:
        for n in {k["geo"].split("|", 1)[1], k["nama"]}:
            di_prov[(k["prov"], kunci(n))] = k["id"]
            nasional.setdefault(kunci(n), set()).add(k["id"])

    def cari(prov, nama):
        if not nama:
            return None
        p = nama_prov.get(prov, prov)
        n = kunci(nama.replace("Adm. ", "Administrasi ").replace("Kota Adm ", "Kota Administrasi "))
        if (p, n) in di_prov:
            return di_prov[(p, n)]
        s = nasional.get(n, set())
        return next(iter(s)) if len(s) == 1 else None
    return cari


def jarak(a, b, c, d):
    return math.hypot(a - c, (b - d) * math.cos(math.radians((a + c) / 2)))


def terdekat(lat, lon, titik, maks):
    """titik = [(lat, lon, isi)] -> isi terdekat dalam `maks` derajat, atau None."""
    best = min(titik, key=lambda q: jarak(lat, lon, q[0], q[1]), default=None)
    return best[2] if best and jarak(lat, lon, best[0], best[1]) <= maks else None


def baca(jalur, bawaan=None):
    try:
        return json.load(open(jalur))
    except (OSError, ValueError):
        return bawaan


def simpan(jalur, isi):
    os.makedirs(os.path.dirname(jalur), exist_ok=True)
    with open(jalur + ".tmp", "w") as f:
        json.dump(isi, f, ensure_ascii=False, separators=(",", ":"))
    os.replace(jalur + ".tmp", jalur)


# ---------- arsip ----------
def berkas_arsip(t, folder=None):
    return os.path.join(folder or ARSIP, t[:7] + ".jsonl")


def baris_arsip(jalur):
    """Baris mentah (teks) arsip; berkas rusak (bukan JSON per baris) = berhenti, bukan dilewati."""
    if not os.path.exists(jalur):
        return []
    out = []
    for n, b in enumerate(open(jalur).read().splitlines(), 1):
        if b.strip():
            try:
                json.loads(b)
            except ValueError:
                sys.exit(f"arsip rusak {jalur}:{n}: bukan JSON; tidak ditimpa, perbaiki tangan")
            out.append(b)
    return out


def semua_arsip(folder=None):
    folder = folder or ARSIP
    if not os.path.isdir(folder):
        return []
    return [json.loads(b) for f in sorted(os.listdir(folder)) if f.endswith(".jsonl") for b in baris_arsip(os.path.join(folder, f))]


def periksa_arsip(lama, baru):
    """lama/baru = daftar baris teks. Tiap baris lama wajib ada utuh di posisi yang sama. -> pesan galat atau None."""
    if len(baru) < len(lama):
        return f"arsip menyusut {len(lama)} -> {len(baru)} baris"
    for i, (a, b) in enumerate(zip(lama, baru)):
        if a != b:
            return f"baris {i + 1} berubah"
    return None


def git_teks(rel):
    try:
        r = subprocess.run(["git", "show", f"HEAD:{rel}"], cwd=AKAR, capture_output=True, text=True)
        return r.stdout if r.returncode == 0 else None
    except OSError:
        return None


def cek_arsip(folder=None, git=git_teks):
    """Tiap arsip yang ada di git HEAD tidak boleh menyusut/berubah di lokal: keluar kode 3."""
    folder = folder or ARSIP
    rel = os.path.relpath(folder, AKAR)
    try:
        r = subprocess.run(["git", "ls-tree", "--name-only", "HEAD", rel + "/"], cwd=AKAR, capture_output=True, text=True)
        dilacak = [os.path.basename(x) for x in r.stdout.split() if x.endswith(".jsonl")]
    except OSError:
        dilacak = []
    for f in dilacak:
        g = git(f"{rel}/{f}")
        if g is None:
            continue
        lokal = os.path.join(folder, f)
        galat = periksa_arsip([b for b in g.splitlines() if b.strip()], baris_arsip(lokal))
        if galat:
            print(f"prediksi: {f}: {galat} dibanding git HEAD; berhenti", file=sys.stderr)
            sys.exit(3)


def tambah_arsip(entri, folder=None):
    """Tambah satu baris; (t, k) yang sudah ada tidak ditimpa. -> True bila ditulis."""
    jalur = berkas_arsip(entri["t"], folder)
    lama = baris_arsip(jalur)
    if any((e := json.loads(b))["t"] == entri["t"] and e["k"] == entri["k"] for b in lama):
        return False
    galat = periksa_entri(entri)
    if galat:
        raise ValueError(f"{entri.get('k')}: {galat}")
    os.makedirs(os.path.dirname(jalur), exist_ok=True)
    with open(jalur, "a") as f:
        f.write(json.dumps(entri, ensure_ascii=False, separators=(",", ":")) + "\n")
    baru = baris_arsip(jalur)
    galat = periksa_arsip(lama, baru)
    if galat:
        print(f"prediksi: {galat} sesudah menulis {jalur}", file=sys.stderr)
        sys.exit(3)
    return True


def periksa_entri(e):
    """Invarian satu baris arsip. -> pesan galat atau None."""
    if e.get("k") not in KODE:
        return "kode tak dikenal"
    try:
        t = dt.date.fromisoformat(e["t"])
        hari = [dt.date.fromisoformat(h) for h in e["hari"]]
    except (KeyError, TypeError, ValueError):
        return "tanggal tidak sah"
    if len(hari) != TENGGANG or any(h != t + dt.timedelta(days=i + 1) for i, h in enumerate(hari)):
        return "hari bukan t+1..t+3 (prakiraan harus dibekukan sebelum sasaran)"
    if not e.get("kab"):
        return "kab kosong"
    n = len(e["kol"])
    for k, v in e["kab"].items():
        if len(v) != TENGGANG or any(r is not None and len(r) != n for r in v):
            return f"{k}: bentuk baris salah"
        for r in v:
            if r is None:
                continue
            for c, x in zip(e["kol"], r):
                if c.startswith("p") and c[1:].isdigit() or c in ("p", "ps", "pt"):
                    if x is not None and not 0 <= x <= 1:
                        return f"{k}: peluang {c}={x} di luar 0..1"
                if c in ("mulai", "puncak") and x is not None and not 0 <= x <= 23:
                    return f"{k}: jam {c}={x} di luar 0..23"
                if c in ("tot", "lama", "d", "pm") and x is not None and x < 0:
                    return f"{k}: {c} negatif"
    return None
