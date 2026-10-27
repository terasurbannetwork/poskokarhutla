"""Catatan prospektif prakiraan harian, append-only -> public/banjir/data/prospektif.json

Tiap hari, sesudah status.py, satu entri "tanggal terbit": untuk 4 hari ke depan (waktu-tunda 0..3) level banjir dan longsor
tertinggi per kabupaten (satuan yang sama dengan DIBI dan uji_balik.py) plus peluang Siaga jalur hujan tertinggi di kabupaten itu:
  {"versi": 1, "n_kab": 514, "terbit": {"2026-10-18": {"hari": [4 tanggal], "kab": {"prov|kab": [[lb, ll, psb, psl] x 4]}}}}
  lb/ll = level 0..3; psb/psl = peluang % mencapai >= Siaga (None bila ansambel tak ada). Kabupaten yang tak tertulis = Normal
  dan peluang Siaga < 10% (berkas hanya memuat kabupaten yang bernilai).
Ini satu-satunya cara mengukur ketepatan prakiraan NYATA per waktu-tunda: uji_balik.py memakai hujan ERA5 sempurna, jadi semua
waktu-tunda identik di sana. Saat DIBI terbit, `python3 scripts/banjir/prospektif.py nilai` menilai entri yang tanggal targetnya
sudah tercakup DIBI (POD/FAR/CSI >= Siaga per waktu-tunda); belum ada entri yang tercakup = n 0, bukan angka karangan.
Aturan: berkas tidak pernah menyusut dan entri TIDAK PERNAH diubah: jalan ulang di hari yang sama tidak menimpa (prakiraan pertama
hari itu yang dinilai, bukan yang paling mujur). Berkas rusak = berhenti. Berkas hilang padahal tercatat di git = berhenti
(tidak memulai log baru diam-diam). `periksa` menolak tulisan yang menghilangkan/mengubah entri lama.
Catatan hanya memuat kabupaten berstatus atau berpeluang Siaga >= 10%, jadi peluang kabupaten lain tidak tercatat: kalibrasi
peluang (apakah 30% berarti 30%) BELUM bisa dinilai dari berkas ini; yang bisa dinilai hanya status deterministik per waktu-tunda.
DIBI terlambat terbit/terisi: `nilai` hanya memakai tanggal sasaran sampai (tanggal DIBI terakhir - MARGIN_DIBI hari).
PRA-REGISTRASI (PRAREG-PROSPEKTIF.md): `skor` memberi skor jujur (POD/FAR/CSI/ETS model vs persistensi dan klimatologi, bootstrap blok
hari) hanya untuk hari yang kebenarannya sudah ada, ke prospektif_skor.json. Kriteria beku di KRITERIA (hash KRITERIA_SHA256, blok
BEKU di PRAREG sama persis, dan sama dengan versi di JANGKAR_COMMIT bila terisi); berubah = menolak menilai. Arsip dibandingkan dengan
versi di git (HEAD): lebih pendek atau berubah = keluar kode 3. Vonis akhir dikunci sekali. Ambang status.py tidak disentuh.
Pakai:  python3 scripts/banjir/prospektif.py   |   ... nilai   |   ... skor   |   ... uji
"""
import ast, datetime as dt, hashlib, json, os, random, re, subprocess, sys
from collections import defaultdict

sys.path.insert(0, os.path.dirname(__file__))
from umum import AKAR, KELUAR, MENTAH, baca, simpan

JALUR = os.path.join(KELUAR, "prospektif.json")
SIAGA = 2
MIN_P = 10  # kabupaten dengan peluang Siaga di bawah ini dan level 0 tidak dicatat
MARGIN_DIBI = 14  # hari: kejadian DIBI dilaporkan menyusul; tanggal terakhir DIBI belum lengkap, jadi tidak dinilai


def entri(st, pra, n_kab):
    """status.json + prakiraan72.json -> entri satu tanggal terbit."""
    kab = defaultdict(lambda: [[0, 0, None, None] for _ in st["hari"]])
    for k, v in st["kec"].items():
        kb = kab["|".join(k.split("|")[:2])]
        for d in range(len(st["hari"])):
            kb[d][0], kb[d][1] = max(kb[d][0], v["b"][d]), max(kb[d][1], v["l"][d])
    for k, v in pra.get("kec", {}).items():
        if "pb" not in v:
            continue
        kb = kab["|".join(k.split("|")[:2])]
        for d in range(len(st["hari"])):
            for i, q in ((2, "pb"), (3, "pl")):
                kb[d][i] = max(kb[d][i] or 0, v[q][d][1])
    ada = pra.get("anggota") is not None
    keep = {k: [[a, b, c if ada else None, e if ada else None] for a, b, c, e in v] for k, v in kab.items()
            if any(a or b or (c or 0) >= MIN_P or (e or 0) >= MIN_P for a, b, c, e in v)}
    return {"hari": st["hari"], "kab": keep}


def periksa(lama, baru):
    """Menolak tulisan yang menyusutkan/mengubah catatan. lama/baru = isi berkas."""
    if lama is None:
        return
    for t, e in lama["terbit"].items():
        if t not in baru["terbit"]:
            raise ValueError(f"entri {t} hilang: berkas prospektif tidak boleh menyusut")
        if baru["terbit"][t] != e:
            raise ValueError(f"entri {t} berubah: catatan prospektif tidak pernah diubah")
    if baru["n_kab"] < 1:
        raise ValueError("n_kab kosong")


def tambah(log, tgl, e, n_kab):
    baru = json.loads(json.dumps(log))
    if tgl in baru["terbit"] or (baru["terbit"] and tgl < max(baru["terbit"])):
        return None  # sudah tercatat atau mundur: tidak dicatat, tidak ditimpa
    baru["terbit"][tgl], baru["n_kab"] = e, n_kab
    periksa(log, baru)
    return baru


def nilai(log, baris):
    """Penilaian >= Siaga banjir per waktu-tunda terhadap DIBI. baris = dibi_tanggal.json [jenis, prov, kab, tanggal, n].
    Hanya target <= (tanggal DIBI terakhir - MARGIN_DIBI hari) yang dinilai. -> {tunda: {n_hari, a, b, c, d, pod, far, csi}}"""
    ev = {(f"{p}|{kb}", tgl) for jenis, p, kb, tgl, n in baris if n >= 1 and {"banjir", "bandang"} & set(jenis)}
    akhir = str(dt.date.fromisoformat(max(r[3] for r in baris)) - dt.timedelta(days=MARGIN_DIBI)) if baris else ""
    out = {}
    for tunda in range(4):
        a = b = c = d = hari = 0
        for t, e in log["terbit"].items():
            if len(e["hari"]) <= tunda or e["hari"][tunda] > akhir:
                continue
            tgt, hari = e["hari"][tunda], hari + 1
            ramal = {k for k, v in e["kab"].items() if v[tunda][0] >= SIAGA}
            kena = {k for k, x in ev if x == tgt}
            a, b, c = a + len(ramal & kena), b + len(ramal - kena), c + len(kena - ramal)
            d += log["n_kab"] - len(ramal | kena)
        bagi = lambda x, y: round(x / y, 3) if y else None
        out[tunda] = {"n_hari": hari, "a": a, "b": b, "c": c, "d": d, "pod": bagi(a, a + c), "far": bagi(b, a + b), "csi": bagi(a, a + b + c)}
    return out


def tercatat_git():
    """True bila prospektif.json dilacak git (sudah pernah di-commit). Tanpa git/di luar repo: False."""
    try:
        return subprocess.run(["git", "ls-files", "--error-unmatch", JALUR], cwd=os.path.dirname(JALUR), capture_output=True).returncode == 0
    except OSError:
        return False


# ---- PRA-REGISTRASI, SKOR JUJUR, ARSIP TAK MENYUSUT (PRAREG-PROSPEKTIF.md) ----
# Angka beku. Mengubahnya = mengubah KRITERIA, KRITERIA_SHA256, dan blok BEKU di PRAREG sekaligus (terlihat di diff, dan
# JANGKAR_COMMIT menahan versi PRAREG yang didaftarkan). Tidak ada jalan pintas lewat env.
KRITERIA = {"tanggal_registrasi": "2026-10-27", "jendela_mulai": "2026-10-19", "kebenaran": "DIBI banjir/bandang >= 1 kejadian per kabupaten-hari",
            "tunda_primer": 1, "ambang_status": SIAGA, "n_hari_min": 60, "kejadian_min": 100, "margin_dibi": 14, "blok_hari": 7, "boot_b": 1000, "benih": 7,
            "selang_persen": 95, "pembanding": ["persistensi", "klimatologi"], "ets_selisih_bawah_min": 0.0, "ets_model_bawah_min": 0.0,
            "klimatologi_jendela_hari": 15,
            "definisi_ramalan": "level banjir tertinggi kecamatan di kabupaten >= ambang_status pada waktu-tunda yang dinilai",
            "metode_klimatologi": "top-N kabupaten menurut frekuensi kejadian +-jendela hari kalender pada tahun < tahun sasaran (frekuensi > 0), N = jumlah ramalan model hari itu, seri diurut (frekuensi turun, kunci naik)",
            "metode_persistensi": "kabupaten berkejadian pada tanggal terbit minus 1",
            "metode_bootstrap": "blok-bergerak atas hari terbit, panjang blok_hari, boot_b ulangan, benih; ulangan tanpa kejadian model (ETS tak terdefinisi) dilewati; selang persentil dua sisi",
            "rumus_ets": "ar=(a+b)(a+c)/N; ETS=(a-ar)/(a+b+c-ar); N=a+b+c+d; d=n_kab(entri terbaru)-|ramalan U kejadian|"}
KRITERIA_SHA256 = "2df5613aa36dd27af5abc8a00ad0ac06f290ece286b78f835f47648399a37912"
JANGKAR_COMMIT = "46d543a0bdf61188ddfda19474e49176571434a1"   # commit yang memuat PRAREG-PROSPEKTIF.md; isi sesudah commit pendaftaran (lihat PRAREG bagian Jangkar)
PRAREG = os.path.join(os.path.dirname(os.path.abspath(__file__)), "PRAREG-PROSPEKTIF.md")
PRAREG_GIT = "scripts/banjir/PRAREG-PROSPEKTIF.md"
SKOR = os.path.join(KELUAR, "prospektif_skor.json")
REL_LOG = "public/banjir/data/prospektif.json"
REL_SKOR = "public/banjir/data/prospektif_skor.json"
BELUM = "belum cukup data"
_BEKU = re.compile(r"<!-- BEKU:mulai -->\s*```json\s*(.*?)\s*```\s*<!-- BEKU:akhir -->", re.S)


def kriteria_sha(K):
    return hashlib.sha256(json.dumps(K, sort_keys=True, ensure_ascii=False, separators=(",", ":")).encode()).hexdigest()


def blok_beku(teks):
    m = _BEKU.search(teks or "")
    return json.loads(m.group(1)) if m else None


def git_teks(rev_jalur):
    try:
        r = subprocess.run(["git", "show", rev_jalur], cwd=AKAR, capture_output=True, text=True, timeout=30)
    except (OSError, subprocess.SubprocessError):
        return None
    return r.stdout if r.returncode == 0 else None


PENILAI = ("tabel_hari", "metrik", "_ets", "_jumlah", "klimatologi", "frek", "tabel_per_terbit", "bootstrap", "skor_tunda", "skor_semua")
PRAKODE = "scripts/banjir/prospektif.py"


def sidik_penilai(kode):
    """{nama: ast.dump tanpa docstring} untuk fungsi penilai: kebal terhadap spasi dan komentar, peka terhadap logika."""
    out = {}
    for n in ast.parse(kode).body:
        if isinstance(n, ast.FunctionDef) and n.name in PENILAI:
            if n.body and isinstance(n.body[0], ast.Expr) and isinstance(getattr(n.body[0], "value", None), ast.Constant) and isinstance(n.body[0].value.value, str):
                n.body = n.body[1:] or [ast.Pass()]
            out[n.name] = ast.dump(n)
    return out


def pastikan_logika_beku(kini, jangkar_kode):
    """Fungsi penilai sekarang harus sama dengan di commit jangkar (menurut AST); beda = tolak, sebut nama fungsinya."""
    a, b = sidik_penilai(kini), sidik_penilai(jangkar_kode)
    beda = sorted({n for n in set(a) | set(b) if a.get(n) != b.get(n)} | {n for n in PENILAI if n not in b})
    if beda:
        sys.exit(f"logika penilaian berubah sejak commit jangkar ({', '.join(beda)}): tolak menilai")


def jangkar_leluhur(jangkar):
    try:
        return subprocess.run(["git", "merge-base", "--is-ancestor", jangkar, "HEAD"], cwd=AKAR, capture_output=True, timeout=30).returncode == 0
    except (OSError, subprocess.SubprocessError):
        return False


def pastikan_kriteria_beku(teks_prareg=None, teks_jangkar=None, jangkar=None, leluhur=None, kode_jangkar=None, kode_kini=None):
    """Tolak (SystemExit) bila KRITERIA, hash, blok BEKU di PRAREG, atau versi di commit jangkar tidak sama persis."""
    jangkar = JANGKAR_COMMIT if jangkar is None else jangkar
    if kriteria_sha(KRITERIA) != KRITERIA_SHA256:
        sys.exit(f"kriteria pra-registrasi beku tidak cocok dengan KRITERIA_SHA256 ({kriteria_sha(KRITERIA)}): tolak menilai")
    if teks_prareg is None:
        teks_prareg = open(PRAREG).read() if os.path.exists(PRAREG) else ""
    if blok_beku(teks_prareg) != KRITERIA:
        sys.exit("blok BEKU di PRAREG-PROSPEKTIF.md tidak sama dengan KRITERIA: tolak menilai")
    if jangkar:
        asli = teks_jangkar if teks_jangkar is not None else git_teks(f"{jangkar}:{PRAREG_GIT}")
        if asli is None:
            sys.exit(f"commit jangkar {jangkar} tidak tersedia (clone dangkal? gunakan fetch-depth: 0): tolak menilai, jangkar tidak boleh dilewati")
        if not (leluhur or jangkar_leluhur)(jangkar):
            sys.exit(f"commit jangkar {jangkar} bukan leluhur HEAD: tolak menilai")
        if blok_beku(asli) != KRITERIA:
            sys.exit(f"kriteria beku berbeda dari versi di commit jangkar {jangkar}: tolak menilai")
        kj = kode_jangkar if kode_jangkar is not None else git_teks(f"{jangkar}:{PRAKODE}")
        if kj is None:
            sys.exit(f"prospektif.py di commit jangkar {jangkar} tidak tersedia: tolak menilai")
        pastikan_logika_beku(kode_kini if kode_kini is not None else open(os.path.abspath(__file__)).read(), kj)


def cek_arsip(lokal, git_ver):
    """Arsip lokal tidak boleh lebih pendek atau mengubah apa pun dari versi di git: keluar kode 3 (langkah bash -e berhenti)."""
    if git_ver is None:
        print("prospektif: HEAD belum punya prospektif.json (pertama kali, atau git tak tersedia); tidak ada pembanding arsip, lanjut", file=sys.stderr)
        return
    try:
        periksa(git_ver, lokal if lokal is not None else {"terbit": {}, "n_kab": 1})
    except ValueError as e:
        print(f"prospektif: arsip tidak boleh menyusut/berubah dibanding git HEAD ({e})", file=sys.stderr)
        sys.exit(3)


def git_log():
    t = git_teks(f"HEAD:{REL_LOG}")
    try:
        return json.loads(t) if t else None
    except ValueError:
        return None


# --- metrik ---
def tabel_hari(ramal, kena, n_kab):
    a, b, c = len(ramal & kena), len(ramal - kena), len(kena - ramal)
    return (a, b, c, max(n_kab - len(ramal | kena), 0))


def metrik(t):
    a, b, c, d = t
    n = a + b + c + d
    ar = (a + b) * (a + c) / n if n else 0
    bagi = lambda x, y: round(x / y, 4) if y else None
    return {"a": a, "b": b, "c": c, "d": d, "pod": bagi(a, a + c), "far": bagi(b, a + b), "csi": bagi(a, a + b + c),
            "ets": bagi(a - ar, a + b + c - ar)}


def _ets(t):
    return metrik(t)["ets"]


def _jumlah(ts):
    return tuple(sum(x[i] for x in ts) for i in range(4))


def klimatologi(baris, tahun, jendela):
    """kab -> frekuensi kejadian per tahun-hari dalam +-jendela hari kalender, hanya tahun < `tahun` (tanpa kebocoran)."""
    sebelum = defaultdict(lambda: [0] * 366)
    for jenis, p, kb, tgl, n in baris:
        if n >= 1 and {"banjir", "bandang"} & set(jenis) and int(tgl[:4]) < tahun:
            sebelum[f"{p}|{kb}"][dt.date.fromisoformat(tgl).timetuple().tm_yday - 1] += 1
    return sebelum


def frek(vec, doy, jendela):
    return sum(vec[(doy - 1 + k) % 366] for k in range(-jendela, jendela + 1))


def tabel_per_terbit(log, baris, K=KRITERIA):
    """-> {tunda: [(tanggal_terbit, {model, persistensi, klimatologi: tabel})]} hanya hari yang kebenarannya sudah tersedia."""
    ev = defaultdict(set)
    for jenis, p, kb, tgl, n in baris:
        if n >= 1 and {"banjir", "bandang"} & set(jenis):
            ev[tgl].add(f"{p}|{kb}")
    akhir = str(dt.date.fromisoformat(max(r[3] for r in baris)) - dt.timedelta(days=K["margin_dibi"])) if baris else ""
    klim, out = {}, {t: [] for t in range(4)}
    for terbit in sorted(log["terbit"]):
        e = log["terbit"][terbit]
        if terbit < K["jendela_mulai"]:
            continue
        for tunda in range(min(4, len(e["hari"]))):
            tgt = e["hari"][tunda]
            if tgt > akhir:
                continue
            ramal = {k for k, v in e["kab"].items() if v[tunda][0] >= K["ambang_status"]}
            kena = ev.get(tgt, set())
            kemarin = str(dt.date.fromisoformat(terbit) - dt.timedelta(days=1))
            pers = ev.get(kemarin, set())
            th = int(tgt[:4])
            if th not in klim:
                klim[th] = klimatologi(baris, th, K["klimatologi_jendela_hari"])
            doy = dt.date.fromisoformat(tgt).timetuple().tm_yday
            urut = sorted(((frek(v, doy, K["klimatologi_jendela_hari"]), k) for k, v in klim[th].items()), key=lambda x: (-x[0], x[1]))
            klm = {k for f, k in urut[:len(ramal)] if f > 0}  # sebanyak ramalan model, kab paling sering kena pada musim yang sama
            out[tunda].append((terbit, {"model": tabel_hari(ramal, kena, log["n_kab"]), "persistensi": tabel_hari(pers, kena, log["n_kab"]),
                                        "klimatologi": tabel_hari(klm, kena, log["n_kab"])}))
    return out


def bootstrap(hari, K=KRITERIA):
    """Bootstrap blok-bergerak hari terbit. -> {"model": [lo, hi], "selisih_<pembanding>": [lo, hi]} ETS, selang K['selang_persen']."""
    rng, n, bl = random.Random(K["benih"]), len(hari), K["blok_hari"]
    nama = ["model"] + [f"selisih_{p}" for p in K["pembanding"]]
    hasil = {k: [] for k in nama}
    for _ in range(K["boot_b"]):
        pilih = []
        while len(pilih) < n:
            i = rng.randrange(0, max(n - bl + 1, 1))
            pilih += hari[i:i + bl]
        tabs = {m: _jumlah([h[1][m] for h in pilih[:n]]) for m in ["model"] + K["pembanding"]}
        em = _ets(tabs["model"])
        if em is None:
            continue
        hasil["model"].append(em)
        for p in K["pembanding"]:
            ep = _ets(tabs[p])
            hasil[f"selisih_{p}"].append(em - (ep if ep is not None else 0))
    sisi = (100 - K["selang_persen"]) / 200
    out = {}
    for k, v in hasil.items():
        v.sort()
        out[k] = [round(v[int(sisi * len(v))], 4), round(v[min(int((1 - sisi) * len(v)), len(v) - 1)], 4)] if len(v) >= 100 else None
    return out


def skor_tunda(hari, K=KRITERIA):
    """hari = [(terbit, {metode: tabel})] -> n, metrik tiap metode, selang bootstrap, vonis tunda ini."""
    tot = {m: _jumlah([h[1][m] for h in hari]) for m in ["model"] + K["pembanding"]} if hari else {}
    out = {"n_hari": len(hari), "n_kejadian": (tot["model"][0] + tot["model"][2]) if hari else 0,
           "metode": {m: metrik(t) for m, t in tot.items()}}
    if len(hari) < K["n_hari_min"] or out["n_kejadian"] < K["kejadian_min"]:
        out["selang_ets"], out["vonis"] = None, BELUM
        return out
    out["selang_ets"] = ci = bootstrap(hari, K)
    ok = ci["model"] is not None and ci["model"][0] > K["ets_model_bawah_min"] and all(
        ci[f"selisih_{p}"] is not None and ci[f"selisih_{p}"][0] > K["ets_selisih_bawah_min"] for p in K["pembanding"])
    out["vonis"] = "lolos" if ok else "tidak lolos"
    return out


def skor_semua(log, baris, K=KRITERIA):
    tab = tabel_per_terbit(log, baris, K)
    return {str(t): skor_tunda(h, K) for t, h in tab.items()}


def susun_skor(log, baris, lama_skor, kini, K=KRITERIA):
    """Isi prospektif_skor.json. vonis_akhir dikunci sekali: sekali lolos/tidak lolos pada tunda primer, tidak diganti lagi."""
    per = skor_semua(log, baris, K)
    berjalan = per[str(K["tunda_primer"])]["vonis"]
    akhir = (lama_skor or {}).get("vonis_akhir")
    if akhir is None and berjalan != BELUM:
        akhir = {"vonis": berjalan, "dikunci_pada": kini, "n_hari": per[str(K["tunda_primer"])]["n_hari"]}
    return {"versi": 1, "diperbarui": kini, "kriteria": K, "kriteria_sha256": kriteria_sha(K), "jangkar_commit": JANGKAR_COMMIT or None,
            "vonis_berjalan": berjalan, "vonis_akhir": akhir, "tunda": per, "n_terbit": len(log["terbit"]),
            "catatan": "Skor hanya untuk hari yang kebenaran DIBI-nya sudah tersedia; ambang status tidak diubah."}


def vonis_lama(lokal, git_):
    """vonis_akhir dari skor lokal DAN git HEAD: bila keduanya ada harus sama persis, beda = gagal keras. -> skor lama yang dipakai."""
    a, b = (lokal or {}).get("vonis_akhir"), (git_ or {}).get("vonis_akhir")
    if a and b and a != b:
        sys.exit(f"vonis_akhir lokal {a} berbeda dari git HEAD {b}: tolak menilai")
    return lokal if a else (git_ if b else (lokal or git_))


def main_skor():
    pastikan_kriteria_beku()
    log, baris = baca(JALUR), baca(os.path.join(MENTAH, "dibi_tanggal.json"))
    if not log or not baris:
        sys.exit("prospektif.json atau dibi_tanggal.json belum ada: tidak ada yang bisa dinilai")
    cek_arsip(log, git_log())
    t = git_teks(f"HEAD:{REL_SKOR}")
    lama = vonis_lama(baca(SKOR), json.loads(t) if t else None)
    kini = dt.datetime.now(dt.timezone(dt.timedelta(hours=7))).strftime("%Y-%m-%d")
    s = susun_skor(log, baris, lama, kini)
    if lama and lama.get("vonis_akhir") and s["vonis_akhir"] != lama["vonis_akhir"]:
        sys.exit("vonis_akhir sudah dikunci dan tidak boleh berubah")
    simpan(SKOR, s)
    p = s["tunda"][str(KRITERIA["tunda_primer"])]
    print(f"prospektif skor: tunda {KRITERIA['tunda_primer']} n_hari {p['n_hari']}, kejadian {p['n_kejadian']}, vonis {s['vonis_berjalan']}", file=sys.stderr)


def main():
    st, pra = baca(os.path.join(KELUAR, "status.json")), baca(os.path.join(KELUAR, "prakiraan72.json"))
    hujan = baca(os.path.join(KELUAR, "hujan.json"))
    if not st or not pra or not hujan:
        sys.exit("status.json/prakiraan72.json/hujan.json belum ada")
    if st["hari"][0] != hujan["hari_ini"]:
        print(f"prospektif: status.json hari ke-0 {st['hari'][0]} bukan hari ini {hujan['hari_ini']}; tidak dicatat", file=sys.stderr)
        return
    try:
        lama = baca(JALUR)
    except ValueError as e:  # JSON rusak: jangan menimpa
        sys.exit(f"prospektif.json tidak terbaca ({e}); tidak ditimpa")
    cek_arsip(lama, git_log())  # arsip lebih pendek/berubah dibanding git HEAD (cache basi): kode 3, tidak mencatat
    if lama is None and tercatat_git():
        sys.exit("prospektif.json hilang padahal tercatat di git: pulihkan berkas (cache/checkout), tidak memulai log baru diam-diam")
    from bahaya import kecamatan
    n_kab = len({"|".join(k.split("|")[:2]) for k in kecamatan()})
    baru = tambah(lama or {"versi": 1, "n_kab": n_kab, "terbit": {}}, st["hari"][0], entri(st, pra, n_kab), n_kab)
    if baru is None:
        print(f"prospektif: {st['hari'][0]} sudah tercatat (atau mundur); tidak ditimpa", file=sys.stderr)
        return
    simpan(JALUR, baru)
    print(f"prospektif: {len(baru['terbit'])} tanggal terbit, {len(baru['terbit'][st['hari'][0]]['kab'])} kab dicatat hari ini", file=sys.stderr)


def main_nilai():
    log, baris = baca(JALUR), baca(os.path.join(MENTAH, "dibi_tanggal.json"))
    if not log or not baris:
        sys.exit("prospektif.json atau dibi_tanggal.json belum ada")
    for tunda, s in nilai(log, baris).items():
        print(f"tunda {tunda}: {s}")


def _tanpa_git(teks):
    """jangkar terisi tetapi git_teks None (clone dangkal) harus gagal keras."""
    global git_teks
    asli, git_teks = git_teks, lambda r: None
    try:
        pastikan_kriteria_beku(teks, jangkar="abc")
    finally:
        git_teks = asli


def uji_sifat():
    """Tiga sifat pra-registrasi: kriteria beku, arsip tak menyusut, skor hanya hari berkebenaran + vonis jujur."""
    # 1. kriteria beku: hash, blok PRAREG, jangkar
    assert kriteria_sha(KRITERIA) == KRITERIA_SHA256
    assert kriteria_sha({**KRITERIA, "n_hari_min": 30}) != KRITERIA_SHA256
    teks = open(PRAREG).read()
    KODE = open(os.path.abspath(__file__)).read()
    assert blok_beku(teks) == KRITERIA
    pastikan_kriteria_beku(teks, jangkar="")                                             # ok
    pastikan_kriteria_beku(teks, teks_jangkar=teks, jangkar="abc", leluhur=lambda j: True, kode_jangkar=KODE)  # jangkar sama: ok
    for rusak in (teks.replace('"n_hari_min": 60', '"n_hari_min": 20'), "tanpa blok"):
        try:
            pastikan_kriteria_beku(rusak, jangkar=""); raise AssertionError("PRAREG berubah diterima")
        except SystemExit:
            pass
    try:
        pastikan_kriteria_beku(teks, teks_jangkar=teks.replace('"blok_hari": 7', '"blok_hari": 1'), jangkar="abc", leluhur=lambda j: True, kode_jangkar=KODE); raise AssertionError("beda jangkar diterima")
    except SystemExit:
        pass
    for gagal in (dict(teks_jangkar=None, leluhur=lambda j: True, kode_jangkar=KODE), dict(teks_jangkar=teks, leluhur=lambda j: False, kode_jangkar=KODE)):  # tak tersedia / bukan leluhur
        try:
            pastikan_kriteria_beku(teks, jangkar="abc", **gagal) if gagal["teks_jangkar"] else _tanpa_git(teks)
            raise AssertionError("jangkar tak terverifikasi diterima")
        except SystemExit:
            pass
    pastikan_kriteria_beku(teks, teks_jangkar=teks, jangkar="abc", leluhur=lambda j: True, kode_jangkar=KODE)
    # logika penilai beku: ubah fungsi penilai ditolak (sebut nama); ubah fungsi non-penilai, komentar, docstring diterima
    ubah = KODE.replace('ar = (a + b) * (a + c) / n if n else 0', 'ar = 0')
    assert ubah != KODE
    try:
        pastikan_logika_beku(ubah, KODE); raise AssertionError("fungsi penilai berubah diterima")
    except SystemExit as x:
        assert "metrik" in str(x.code), x.code
    try:
        pastikan_kriteria_beku(teks, teks_jangkar=teks, jangkar="abc", leluhur=lambda j: True, kode_jangkar=KODE, kode_kini=ubah); raise AssertionError("tak ditolak lewat pastikan_kriteria_beku")
    except SystemExit:
        pass
    aman = KODE.replace('print("ok prospektif")', 'print("ok prospektif") # komentar').replace('"""Isi prospektif_skor.json.', '"""Isi berkas skor.').replace("def main_skor():", "def main_skor():  # diubah")
    assert aman != KODE
    pastikan_logika_beku(aman, KODE)
    pastikan_logika_beku(KODE.replace("def " "tambah(log, tgl, e, n_kab):", "def " "tambah(log, tgl, e, n_kab):  # diubah\n    _x = 1"), KODE)  # non-penilai boleh berubah
    try:
        pastikan_logika_beku(KODE, KODE.replace("def skor_tunda(", "def skor_tunda_lama("))  # fungsi hilang di jangkar
        raise AssertionError("fungsi hilang diterima")
    except SystemExit:
        pass
    # 2. arsip tak menyusut / tak berubah dibanding git
    e = {"hari": ["2026-11-01"], "kab": {}}
    git_ver = {"versi": 1, "n_kab": 3, "terbit": {"2026-11-01": e, "2026-11-02": e}}
    cek_arsip({**git_ver, "terbit": {**git_ver["terbit"], "2026-11-03": e}}, git_ver)    # tumbuh: ok
    cek_arsip(None, None)                                                                 # tanpa git: ok
    for rusak in ({**git_ver, "terbit": {"2026-11-01": e}}, {**git_ver, "terbit": {**git_ver["terbit"], "2026-11-01": {"hari": [], "kab": {}}}}, None):
        try:
            cek_arsip(rusak, git_ver); raise AssertionError("arsip menyusut/berubah diterima")
        except SystemExit as x:
            assert x.code == 3, x.code
    # 3. skor: sintetis. 20 kab, 70 hari terbit; model sempurna pada tunda 1; kebenaran hanya sampai (terakhir DIBI - 14 hari)
    rng = random.Random(3)
    kabs = [f"32|K{i:02d}" for i in range(20)]
    awal = dt.date(2026, 11, 1)
    tgl = lambda i: str(awal + dt.timedelta(days=i))
    kej = {i: set(rng.sample(kabs, rng.choice([2, 3]))) for i in range(-3, 80)}
    dibi = [[["banjir"], k.split("|")[0], k.split("|")[1], tgl(i), 1] for i, ks in kej.items() for k in ks]
    dibi += [[["banjir"], "32", "K00", "2025-11-%02d" % d, 1] for d in range(1, 28)]    # sejarah tahun lalu
    def log_dari(n, bagus):
        L = {"versi": 1, "n_kab": 20, "terbit": {}}
        for i in range(n):
            hari = [tgl(i + t) for t in range(4)]
            kab = {}
            for t in range(4):
                ya = kej[i + t] if bagus else set(rng.sample(kabs, 2))
                for k in ya:
                    kab.setdefault(k, [[0, 0, None, None] for _ in range(4)])[t][0] = 2
            L["terbit"][tgl(i)] = {"hari": hari, "kab": kab}
        return L
    K = {**KRITERIA, "jendela_mulai": tgl(0)}
    pendek, panjang = log_dari(10, True), log_dari(70, True)
    sp = skor_semua(pendek, dibi, K)["1"]
    assert sp["vonis"] == BELUM and sp["n_hari"] == 10 and sp["selang_ets"] is None, sp                # n kecil
    sb = skor_semua(panjang, dibi, K)
    assert sb["1"]["vonis"] == "lolos" and sb["1"]["metode"]["model"]["pod"] == 1.0 and sb["1"]["metode"]["model"]["far"] == 0.0, sb["1"]
    # hanya hari berkebenaran: DIBI berakhir hari 79 -> target <= hari 65; tunda 1 dari terbit 0..64 -> 65 hari
    assert sb["1"]["n_hari"] == 65 and sb["3"]["n_hari"] == 63, (sb["1"]["n_hari"], sb["3"]["n_hari"])
    assert skor_semua(log_dari(70, False), dibi, K)["1"]["vonis"] == "tidak lolos"                      # acak tidak mengalahkan pembanding
    # vonis akhir dikunci: lolos sekali, data buruk berikutnya tidak membaliknya
    s1 = susun_skor(panjang, dibi, None, "2026-12-01", K)
    assert s1["vonis_akhir"]["vonis"] == "lolos"
    s2 = susun_skor(log_dari(70, False), dibi, s1, "2026-12-02", K)
    assert s2["vonis_akhir"] == s1["vonis_akhir"] and s2["vonis_berjalan"] == "tidak lolos"
    assert susun_skor(pendek, dibi, None, "2026-12-01", K)["vonis_akhir"] is None
    v = {"vonis": "lolos", "dikunci_pada": "2026-12-01", "n_hari": 65}
    assert vonis_lama({"vonis_akhir": v}, {"vonis_akhir": v})["vonis_akhir"] == v and vonis_lama(None, {"vonis_akhir": v})["vonis_akhir"] == v
    assert vonis_lama({"vonis_akhir": v}, None)["vonis_akhir"] == v and vonis_lama(None, None) is None
    for a, b in (({"vonis_akhir": v}, {"vonis_akhir": {**v, "vonis": "tidak lolos"}}),):
        try:
            vonis_lama(a, b); raise AssertionError("vonis_akhir beda lokal/git diterima")
        except SystemExit:
            pass
    assert metrik((0, 0, 0, 5))["ets"] is None                                                          # tanpa kejadian: bukan angka karangan


def uji():
    st = {"hari": ["2026-01-01", "2026-01-02"], "kec": {"32|A|x": {"b": [2, 0], "l": [0, 1]}, "32|A|y": {"b": [3, 0], "l": [0, 0]}, "32|B|z": {"b": [0, 0], "l": [0, 0]}}}
    pra = {"anggota": 51, "kec": {"32|A|x": {"pb": [[50, 20, 0], [10, 5, 0]], "pl": [[0, 0, 0], [30, 12, 0]]}, "32|C|q": {"pb": [[60, 4, 0], [0, 0, 0]], "pl": [[0, 0, 0]] * 2}}}
    e = entri(st, pra, 3)
    assert e["kab"]["32|A"] == [[3, 0, 20, 0], [0, 1, 5, 12]] and "32|B" not in e["kab"] and "32|C" not in e["kab"], e  # C: peluang Siaga 4% < 10
    assert entri(st, {**pra, "anggota": None}, 3)["kab"]["32|A"][0][2] is None  # tanpa ansambel peluang tidak dikarang
    log = tambah({"versi": 1, "n_kab": 3, "terbit": {}}, "2026-01-01", e, 3)
    log2 = tambah(log, "2026-01-02", e, 3)
    assert list(log2["terbit"]) == ["2026-01-01", "2026-01-02"]
    assert tambah(log2, "2026-01-02", {"hari": [], "kab": {}}, 3) is None                                   # hari yang sama tidak ditimpa
    assert tambah(log2, "2026-01-01", e, 3) is None                                                         # mundur ditolak
    for rusak in ({**log2, "terbit": {"2026-01-02": log2["terbit"]["2026-01-02"]}},                         # menyusut
                  {**log2, "terbit": {**log2["terbit"], "2026-01-01": {"hari": [], "kab": {}}}}):           # lampau berubah
        try:
            periksa(log2, rusak)
            raise AssertionError("periksa menerima tulisan yang menyusutkan/mengubah catatan")
        except ValueError:
            pass
    # nilai: terbit 01-01, target 01-01 (tunda 0) dan 01-02 (tunda 1). DIBI terakhir 02-01 -> batas nilai 01-18: keduanya dinilai
    dibi = [[["banjir"], "32", "A", "2026-01-01", 1], [["longsor"], "32", "B", "2026-01-01", 5], [["banjir"], "32", "B", "2026-01-01", 1],
            [["banjir"], "32", "C", "2026-02-01", 1]]
    s = nilai(log, dibi)
    assert s[0]["a"] == 1 and s[0]["c"] == 1 and s[0]["b"] == 0 and s[0]["d"] == 1 and s[0]["pod"] == .5, s[0]
    assert s[1]["n_hari"] == 1 and s[1]["pod"] is None and s[1]["a"] == 0, s[1]
    # margin: DIBI hanya sampai 01-10 -> batas 12-27 tahun lalu, tak satu pun target dinilai (DIBI belum lengkap)
    assert all(x["n_hari"] == 0 for x in nilai(log, [[["banjir"], "32", "A", "2026-01-10", 1]]).values())
    assert MARGIN_DIBI == 14 == KRITERIA["margin_dibi"]
    uji_sifat()
    print("ok prospektif")


if __name__ == "__main__":
    {"uji": uji, "nilai": main_nilai, "skor": main_skor}.get(sys.argv[1] if sys.argv[1:] else "", main)()
