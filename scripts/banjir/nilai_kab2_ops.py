"""Penilai PROSPEKTIF KAB2-OPS (PRAREG-KAB2.md §5 "Prospektif" dan §8 A1.4). Ditulis 2 Nov 2026, SEBELUM data prospektif dilihat.

Menilai arsip harian data/banjir/arsip_kab2/*.jsonl (ditulis prediksi_kab2.py) terhadap label DIBI ATAU logbook hari mulai, SEKALI,
paling cepat 2027-06-01. Tidak menyunting model_kab2*.py maupun berkas bersidik; memakai ulang metrik model_kab2 (nilai, vonis, boot, POD kejadian),
bukan menulis ulang. Keluaran: data/banjir/kab2_ops/vonis_prospektif.json (O_EXCL, tidak pernah ditimpa).

Pakai:  python3 scripts/banjir/nilai_kab2_ops.py uji         swauji sintetis, tanpa jaringan, tanpa tulis
        python3 scripts/banjir/nilai_kab2_ops.py --kering   gladi pada arsip nyata: hanya hitungan, TANPA label, TANPA skor, TANPA vonis
        python3 scripts/banjir/nilai_kab2_ops.py            penilaian sungguhan (menolak sebelum 2027-06-01)

Gerbang (semua menolak, keluar != 0): hari ini < 2027-06-01; sidik kandidat != baris `sidik` terakhir model_kab2_ops.sidik di HEAD; baris arsip
dengan sidik lain, `waktu` (hari WIB) sesudah hari `terbit`, sasaran != terbit + lead, lead di luar 0..2, atau kunci (terbit, kab, sasaran) ganda;
arsip/berkas penting beda dari HEAD atau tak terlacak; arsip beda dari origin/main; tiap berkas arsip pernah kehilangan baris (bukan hanya-tambah);
baris arsip yang tanggal-penulis git-nya (WIB, blame) > terbit + 1 hari; `waktu` > 12.00 WIB hari terbit; peluang di luar (0,1)/NaN; sum(y) = 0 di satu lead;
baris penilai di model_kab2_ops.sidik (HEAD) tidak ada atau sha256 nilai_kab2_ops.py beda; vonis_prospektif.json pernah ada di riwayat git (`git log --all`).
Kegagalan git (timeout, iCloud) = TOLAK, bukan lolos. Jendela dibaca dari `git show HEAD:` bukan berkas kerja.
Tafsir dikunci lewat `sidik` (menambah SATU baris jenis=penilai di model_kab2_ops.sidik: sha256 berkas ini + ringkas tafsir); PRAREG-KAB2.md tidak disunting.
`waktu` tulis: cron banjir.yml 00.20 UTC = 07.20 WIB, prediksi_kab2 jalan sekitar 07.40; batas 12.00 WIB memberi ruang antrean Actions 4 jam; lewat itu
= baris dibuang dari kelayakan (ditolak, karena arsip harus dibangun dari prakiraan pagi, bukan sesudah kejadian siang).

TAFSIR (ditetapkan 2026-11-02, ditetapkan sebelum data prospektif dilihat; tiap butir memilih bacaan paling keras terhadap model):
 1. Waktu-tunda. Arsip memuat tiap kab-hari sasaran sampai tiga kali (lead 0, 1, 2). PRAREG diam soal ini. Tiap lead dinilai TERPISAH dengan kriteria
    §5 penuh (satu baris per kab-sasaran per lead, jadi tak ada baris ganda dalam satu tabel kontingensi). Vonis akhir = TERBURUK dari tiga lead
    (TIDAK LULUS < TIDAK DAPAT DINILAI < TIDAK MEYAKINKAN < LULUS). LULUS berarti LULUS di lead 0, 1, DAN 2. Ini perpanjangan uji irisan-gabungan §5,
    jadi galat jenis I tidak naik; tidak ada pemilihan lead terbaik.
 2. Jendela. Baris dinilai hanya bila terbit DAN sasaran ada di [awal, akhir] baris `sidik` terakhir (2026-11-01..2027-04-30). Baris sasaran di luar
    jendela, atau terbit sebelum awal, dihitung tetapi tidak dinilai.
 3. Label. §5 menyebut "DIBI ATAU logbook hari mulai" (`uji_logbook.label_dari`, nama `gab_mulai`), TANPA bobot: dipakai persis itu, bukan label v2
    (Groundsource berhenti Januari 2026, jadi TINGGI v2 tak punya padanan; bobot tingkat v2 hanya untuk melatih). Negatif = semua kab-hari yang
    punya baris arsip tanpa label (FAR batas atas), sama dengan uji 2026. Kab yang tak terpetakan ke kode BPS dibuang (seperti uji 2026).
    Berkas label hidup (public/data/logbook_kejadian.json, dibi_kejadian.json) dibaca saat menilai; sha256-nya dicatat di vonis.
 4. Hari tanpa arsip (Actions gagal, data basi) TIDAK diisi dan TIDAK jadi negatif; kab-hari itu keluar dari tabel. Bacaan keras: bila cakupan
    kab-hari yang dinilai di sebuah lead < 80% dari kab-terpetakan x hari jendela, lead itu "TIDAK DAPAT DINILAI" (bukan LULUS) dan menarik vonis akhir turun.
 5. Pembanding. Aturan = `fitur.level_aturan` dari arsip (level status.py yang dihitung ulang dari hujan operasional yang sama, jadi geseran
    masukan ERA5 -> Open-Meteo menimpa model dan aturan sama). Klimatologi-DIBI dan klimatologi-v2 dari `kandidat.model` (Platt LOYO beku);
    jumlah alarm model dan klimatologi = jumlah alarm aturan pada baris yang dinilai di lead itu, seri dipecah acak biji 11 (M2.nilai).
 6. Galat jenis I. Empat syarat §5 irisan-gabungan, satu-sisi 2,5% per syarat, TANPA koreksi Bonferroni (tidak perlu) dan TANPA mengganti
    ambang. Hasil 3 lead memakai bootstrap terpisah; tidak ada penyesuaian karena LULUS menuntut ketiganya.
 7. Masukan operasional (Open-Meteo prakiraan/analisis, hujan.json) berbeda dari data latih (ERA5-Land): keterampilan prospektif MENCAKUP geseran
    masukan itu. Disengaja; yang diuji rantai operasional nyata, tidak ada koreksi.
 8. Tayang tetap keputusan pemilik; vonis ini hanya bahan. Satu jalan: berkas vonis ada = tidak dinilai ulang.
"""
import datetime as dt, hashlib, json, math, os, subprocess, sys, tempfile

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import model_kab2 as M2           # noqa: E402  (impor tidak memasang MK.LATIH; pasang() hanya dari __main__ model_kab2)
import prediksi_kab2 as PK        # noqa: E402

MK, ub, UL, AKAR = M2.MK, M2.ub, M2.UL, M2.AKAR
MULAI_NILAI = dt.date(2027, 6, 1)
LEAD = PK.LEAD
KOBER_MIN = 0.8
GIT_DETIK = 180
BATAS_JAM = 12                    # waktu tulis baris arsip <= 12.00 WIB hari terbit
REL_ARSIP = os.path.relpath(PK.ARSIP, AKAR)
REL_VONIS = os.path.relpath(os.path.join(AKAR, "data/banjir/kab2_ops/vonis_prospektif.json"), AKAR)
REL_SIDIK = PK.SIDIK
REL_SELF = "scripts/banjir/nilai_kab2_ops.py"
BERKAS_BEKU = [REL_ARSIP, "data/banjir/kab2_ops/kandidat.json", "data/banjir/kab2_ops/sampel.json", REL_SIDIK, "scripts/banjir/PRAREG-KAB2.md", REL_SELF,
               "scripts/banjir/model_kab2.py", "scripts/banjir/model_kab2_ops.py", "scripts/banjir/prediksi_kab2.py", "scripts/banjir/uji_logbook.py",
               "scripts/banjir/model_kab_hulu.py", "scripts/banjir/model_kab.py"]
TAFSIR = ("1 tiap lead 0-2 dinilai terpisah, vonis = terburuk; 2 jendela dari sidik HEAD, terbit DAN sasaran di dalamnya; "
          "3 label = DIBI ATAU logbook hari mulai tanpa bobot, negatif = kab-hari berarsip tanpa label; hari tanpa arsip tak diisi, cakupan < 80% = TIDAK DAPAT DINILAI; "
          "4 pembanding aturan = fitur.level_aturan arsip, alarm sama dengan aturan, klimatologi dari kandidat; "
          "5 tanpa Bonferroni, empat syarat irisan-gabungan PRAREG §5, ambang tak diubah")
URUT = {"TIDAK LULUS": 0, "TIDAK DAPAT DINILAI": 1, "TIDAK MEYAKINKAN": 2, "LULUS": 3}
VONIS = os.path.join(AKAR, "data/banjir/kab2_ops/vonis_prospektif.json")
WIB = dt.timezone(dt.timedelta(hours=7))


def gerbang_tanggal(hari, kering=False):
    """None bila boleh; pesan penolakan bila belum 2027-06-01 dan bukan gladi."""
    if kering or hari >= MULAI_NILAI:
        return None
    return f"hari ini {hari} < {MULAI_NILAI}: penilaian prospektif ditolak (label perlu waktu tiba); pakai `--kering` untuk hitungan saja"


def jendela(isi):
    """Baris `sidik` terakhir -> (sidik, awal, akhir) (date)."""
    s = [b for b in map(json.loads, filter(str.strip, isi.splitlines())) if b.get("jenis") == "sidik"]
    if not s:
        raise ValueError("tak ada baris sidik")
    return s[-1]["sidik"], *(dt.date.fromisoformat(x) for x in s[-1]["prospektif"])


def baca_arsip(dir_):
    out = []
    for n in sorted(os.listdir(dir_)) if os.path.isdir(dir_) else ():
        if n.endswith(".jsonl"):
            out += [json.loads(t) for t in open(os.path.join(dir_, n)) if t.strip()]
    return out


def periksa_arsip(baris, sidik, awal, akhir):
    """-> (baris dinilai, hitungan, galat). Galat tidak kosong = tolak. Hitungan memuat yang dikecualikan."""
    galat, ada, ok = [], set(), []
    n = {"total": len(baris), "luar_jendela": 0}
    for b in baris:
        k = (b["terbit"], b["kab"], b["sasaran"])
        t, s = dt.date.fromisoformat(b["terbit"]), dt.date.fromisoformat(b["sasaran"])
        w = dt.datetime.fromisoformat(b["waktu"])
        w = w.astimezone(WIB) if w.tzinfo else w.replace(tzinfo=WIB)
        if b["sidik"] != sidik:
            galat.append(f"sidik {b['sidik']} != beku {sidik}: {k}")
        if b["lead"] not in LEAD or s != t + dt.timedelta(b["lead"]):
            galat.append(f"lead/sasaran tak cocok: {k} lead {b['lead']}")
        if w > dt.datetime.combine(t, dt.time(BATAS_JAM), WIB):
            galat.append(f"waktu {b['waktu']} sesudah {BATAS_JAM}.00 WIB hari terbit {t}: {k}")
        p_ = b["peluang"]
        if not isinstance(p_, (int, float)) or not math.isfinite(p_) or not 0 < p_ < 1:
            galat.append(f"peluang {p_!r} di luar (0,1)/NaN: {k}")
        if (k, b["lead"]) in ada:
            galat.append(f"kunci ganda: {k}")
        ada.add((k, b["lead"]))
        if awal <= t <= akhir and awal <= s <= akhir:
            ok.append(b)
        else:
            n["luar_jendela"] += 1
    return ok, n, galat[:20]


def kober(ok, kabs, awal, akhir):
    """{lead: (kab-hari dinilai, kab-hari harapan, porsi)} pada kab terpetakan `kabs`."""
    harap = len(kabs) * ((akhir - awal).days + 1)
    out = {}
    for L in LEAD:
        n = len({(b["kab"], b["sasaran"]) for b in ok if b["lead"] == L and b["kab"] in kabs})
        out[L] = (n, harap, n / harap if harap else 0.0)
    return out


def label_prospektif(lb, dibi, kode_kab, awal, akhir):
    """lb, dibi = isi berkas label; kode_kab = {kab: 'pp.kk'}. -> ({kab: {tanggal(date)}}, [{'kab_kode': kab, '_a': ub.hari_ke}]) gab_mulai di jendela."""
    lab, kej = UL.label_dari(lb, dibi, akhir=akhir)
    ke = {v: k for k, v in kode_kab.items()}
    tgl = lambda i: UL.AWAL + dt.timedelta(i)
    y = {ke[c]: {tgl(i) for i in v if awal <= tgl(i) <= akhir} for c, v in lab["gab_mulai"].items() if c in ke}
    kj = [{"kab_kode": ke[e["kab_kode"]], "_a": ub.hari_ke(tgl(e["_a"]))} for e in kej
          if e["kab_kode"] in ke and awal <= tgl(e["_a"]) <= akhir and e["jenis"] in UL.JENIS_LB]
    return y, kj


def susun(ok, L, mod, y_kab, kabs):
    """Baris lead L pada kab terpetakan -> (B, P) berbentuk masukan M2.nilai. Urut (kab, sasaran): deterministik."""
    r = sorted((b for b in ok if b["lead"] == L and b["kab"] in kabs), key=lambda b: (b["kab"], b["sasaran"]))
    tg = [dt.date.fromisoformat(b["sasaran"]) for b in r]
    B = {"kab": [b["kab"] for b in r], "tahun": [d.year for d in tg], "bulan": [d.month for d in tg], "e": [ub.hari_ke(d) for d in tg],
         "level": [b["fitur"]["level_aturan"] for b in r], "y": [int(d in y_kab.get(b["kab"], ())) for b, d in zip(r, tg)]}
    if not sum(B["y"]):
        sys.exit(f"lead {L}: tak ada satu pun kab-hari berlabel di jendela (sum(y)=0): ditolak, periksa label/pemetaan kab")
    P = {"model": [b["peluang"] for b in r], "klim": M2.p_klim(mod, B), "klim_dibi": M2.p_klim_dibi(mod, B), "aturan": M2.p_aturan(mod, B)}
    return B, P


def nilai_semua(ok, mod, y_kab, kej, kabs, awal, akhir, ulang=None):
    """-> {'lead': {L: {kober, hasil, vonis...}}, 'vonis': terburuk}."""
    kb = kober(ok, kabs, awal, akhir)
    out = {}
    for L in LEAD:
        B, P = susun(ok, L, mod, y_kab, kabs)
        if kb[L][2] < KOBER_MIN or not B["y"]:
            out[L] = {"kober": kb[L], "vonis": "TIDAK DAPAT DINILAI", "alasan": f"cakupan {kb[L][2]:.2f} < {KOBER_MIN}"}
            continue
        r = M2.nilai(B, P, kej, ulang=ulang)
        v = M2.vonis(r)
        out[L] = {"kober": kb[L], "hasil": r, "rincian": v["rincian"], "vonis": v["vonis"]}
    return {"lead": out, "vonis": min((o["vonis"] for o in out.values()), key=URUT.get)}


def tulis_vonis(isi, jalur=VONIS):
    fd = os.open(jalur, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o644)       # FileExistsError bila sudah ada: tidak pernah menimpa
    with os.fdopen(fd, "w") as f:
        json.dump(isi, f, ensure_ascii=False, indent=1, sort_keys=True)


def sha_berkas(p):
    return hashlib.sha256(open(p, "rb").read()).hexdigest()


def git(repo, *a):
    """stdout git; kegagalan/timeout (mis. iCloud) = TOLAK."""
    try:
        r = subprocess.run(["git", "-C", repo, *a], capture_output=True, text=True, timeout=GIT_DETIK)
    except subprocess.TimeoutExpired:
        sys.exit(f"git {' '.join(a)[:80]} timeout {GIT_DETIK} dtk: ditolak")
    if r.returncode:
        sys.exit(f"git {' '.join(a)[:80]} gagal (kode {r.returncode}): {r.stderr.strip()[:160] or r.stdout.strip()[:160]}: ditolak")
    return r.stdout


def bersih_git(repo, rel):
    """Semua `rel` terlacak dan sama dengan HEAD (tanpa untracked). -> {rel: blob sha di HEAD} (arsip: sha pohon)."""
    for r in rel:
        git(repo, "ls-files", "--error-unmatch", "--", r)
    if git(repo, "status", "--porcelain", "--", *rel).strip():
        sys.exit("berkas beku/arsip beda dari HEAD atau tak terlacak:\n" + git(repo, "status", "--porcelain", "--", *rel)[:300])
    return {r: git(repo, "rev-parse", f"HEAD:{r}").strip() for r in rel}


def sama_origin(repo, rel, ref="origin/main"):
    """HEAD dan origin/main identik untuk `rel`. -> (sha HEAD, sha origin)."""
    o = git(repo, "rev-parse", ref).strip()
    git(repo, "diff", "--quiet", ref, "HEAD", "--", *rel)         # kode 1 (beda) -> git() menolak
    return git(repo, "rev-parse", "HEAD").strip(), o


def autentik_arsip(repo, rel_dir):
    """Hanya-tambah dan waktu commit: tiap berkas arsip tak pernah kehilangan baris di riwayat (git log per jalur, tanpa --follow: --follow melewati timeout di repo ini; blame tetap mengikuti rename), dan tanggal-penulis tiap baris (blame, WIB)
    <= terbit + 1 hari. -> jumlah baris diperiksa. Menolak (sys.exit) bila ada pelanggaran."""
    n = 0
    for f in git(repo, "ls-files", "--", rel_dir).split():
        for ln in git(repo, "log", "--format=@%H", "--numstat", "--", f).splitlines():
            c = ln.split("\t")
            if len(c) == 3 and c[1] != "-" and int(c[1]) > 0:
                sys.exit(f"{f}: commit menghapus {c[1]} baris (arsip harus hanya-tambah): ditolak")
        t = None
        for ln in git(repo, "blame", "--line-porcelain", "HEAD", "--", f).splitlines():
            if ln.startswith("author-time "):
                t = dt.datetime.fromtimestamp(int(ln.split()[1]), WIB).date()
            elif ln.startswith("\t") and ln.strip():
                b = json.loads(ln)
                n += 1
                if t is None or t > dt.date.fromisoformat(b["terbit"]) + dt.timedelta(1):
                    sys.exit(f"{f}: baris {b['terbit']}/{b['kab']}/{b['sasaran']} ditulis di git {t}, > terbit + 1 hari: ditolak")
    return n


def jendela_head(repo, rel):
    """Jendela dari `git show HEAD:` -> (sidik, awal, akhir, baris penilai atau None)."""
    isi = git(repo, "show", f"HEAD:{rel}")
    pen = [b for b in map(json.loads, filter(str.strip, isi.splitlines())) if b.get("jenis") == "penilai"]
    return (*jendela(isi), pen[-1] if pen else None)


def tidak_pernah_ada(repo, rel):
    if git(repo, "log", "--all", "--format=%H", "--", rel).strip():
        sys.exit(f"{rel} pernah ada di riwayat git: dinilai sekali saja, ditolak")


def tulis_penilai(jejak=None, berkas=None):
    """Subcommand `sidik`: tambah SATU baris jenis=penilai (sha256 berkas ini + tafsir). Menolak bila sudah ada."""
    jejak, berkas = jejak or os.path.join(AKAR, REL_SIDIK), berkas or os.path.abspath(__file__)
    isi = open(jejak).read()
    if any(b.get("jenis") == "penilai" for b in map(json.loads, filter(str.strip, isi.splitlines()))):
        sys.exit("baris penilai sudah ada: ditolak")
    b = {"jenis": "penilai", "sha256": sha_berkas(berkas), "tafsir": TAFSIR, "waktu": dt.datetime.now(WIB).isoformat(timespec="seconds")}
    open(jejak, "a").write(("" if isi.endswith("\n") or not isi else "\n") + json.dumps(b, sort_keys=True, ensure_ascii=False) + "\n")
    return b


def muat(kering):
    """Gerbang bersama (git dulu). -> (kand, ok, hitungan, awal, akhir, bukti)."""
    bukti = {"catatan": []}
    def gerbang(nama, f, bawaan):
        try:
            return f()
        except SystemExit as e:
            if not kering:
                raise
            bukti["catatan"].append(f"{nama} MENOLAK: {e}")      # gladi: laporkan, lanjut hitung
            return bawaan
    bukti["blob"] = gerbang("bersih_git", lambda: bersih_git(AKAR, BERKAS_BEKU), {})
    bukti["head"], bukti["origin_main"] = gerbang("origin", lambda: sama_origin(AKAR, [REL_ARSIP]), ("?", "?"))
    sidik, awal, akhir, pen = jendela_head(AKAR, REL_SIDIK)
    bukti["penilai"] = pen
    if pen is None or pen["sha256"] != sha_berkas(os.path.abspath(__file__)):
        if not kering:
            sys.exit("model_kab2_ops.sidik di HEAD tanpa baris penilai, atau sha256-nya beda dari nilai_kab2_ops.py: ditolak (jalankan `sidik` lalu commit)")
        bukti["catatan"].append("baris penilai belum ada/beda (jalankan `sidik` dulu)")
    sh = PK.sidik_head()
    kand = json.load(open(PK.KAND))
    if not (sh == sidik == kand["sidik"]):
        sys.exit(f"sidik HEAD {sh}, berkas {sidik}, kandidat {kand['sidik']} tidak sama: ditolak")
    import model_kab2_ops as MO
    lat = [b for b in map(json.loads, filter(str.strip, git(AKAR, "show", f"HEAD:{REL_SIDIK}").splitlines())) if b.get("jenis") == "latih"]
    if not lat or not (kand["sidik_kriteria"] == MO.sha_kriteria() == lat[-1]["sidik_kriteria"]):
        sys.exit("sidik_kriteria kandidat / kode / baris latih tidak sama: ditolak")
    bukti["autentik_baris"] = gerbang("autentik", lambda: autentik_arsip(AKAR, REL_ARSIP), 0)
    ok, n, galat = periksa_arsip(baca_arsip(PK.ARSIP), sidik, awal, akhir)
    if galat:
        sys.exit("arsip melanggar gerbang:\n  " + "\n  ".join(galat))
    return kand, ok, n, awal, akhir, bukti


def kering():
    print("KERING (tanpa label, tanpa skor, tanpa vonis)")
    try:
        kand, ok, n, awal, akhir, bukti = muat(True)
    except SystemExit as e:                     # gladi: laporkan alasan, jangan jatuh
        print(f"  gerbang MENOLAK: {e}")
        return
    kabs = set(M2.peta_kode(kand["kab"]))
    kb = kober(ok, kabs, awal, akhir)
    print(f"  sidik {kand['sidik']} jendela {awal}..{akhir} (HEAD {bukti['head'][:10]}, origin/main {bukti['origin_main'][:10]})")
    for c in bukti["catatan"]:
        print("  CATATAN", c[:200])
    print(f"  baris arsip {n['total']}, di luar jendela {n['luar_jendela']}, dinilai {len(ok)}, lolos autentik git {bukti['autentik_baris']}; kab terpetakan {len(kabs)}/{len(kand['kab'])}")
    for L, (a, h, p) in kb.items():
        print(f"  lead {L}: kab-hari {a}/{h} ({p:.1%})")
    print("  tidak ada vonis; penilaian hanya dari 2027-06-01")


def jalan(hari=None):
    hari = hari or dt.datetime.now(WIB).date()
    g = gerbang_tanggal(hari)
    if g:
        sys.exit(g)
    if os.path.exists(VONIS):
        sys.exit(f"{VONIS} sudah ada: dinilai sekali saja")
    tidak_pernah_ada(AKAR, REL_VONIS)
    kand, ok, n, awal, akhir, bukti = muat(False)
    kode = M2.peta_kode(kand["kab"])
    lbp, dbp = UL.LB, UL.DIBI
    y_kab, kej = label_prospektif(json.load(open(lbp))["kejadian"], json.load(open(dbp))["kejadian"], kode, awal, akhir)
    r = nilai_semua(ok, kand["model"], y_kab, kej, set(kode), awal, akhir)
    beku = {"y": {k: sorted(map(str, v)) for k, v in sorted(y_kab.items())}, "kej": sorted([e["kab_kode"], e["_a"]] for e in kej)}
    isi = {"dinilai": str(hari), "sidik": kand["sidik"], "jendela": [str(awal), str(akhir)], "arsip": n, "kab_terpetakan": len(kode), "bukti_git": bukti,
           "label_beku": beku, "sha256_label_beku": hashlib.sha256(json.dumps(beku, sort_keys=True).encode()).hexdigest(),
           "sha256_label_sumber": [sha_berkas(lbp), sha_berkas(dbp)], "sha256_arsip": {f: sha_berkas(os.path.join(PK.ARSIP, f)) for f in sorted(os.listdir(PK.ARSIP)) if f.endswith(".jsonl")},
           "kriteria": "PRAREG-KAB2.md §5; tafsir dikunci di baris penilai model_kab2_ops.sidik (vonis = terburuk dari lead 0,1,2)", **r}
    tulis_vonis(isi)
    print("VONIS prospektif KAB2-OPS:", r["vonis"], {L: o["vonis"] for L, o in r["lead"].items()})
    print(f"ditulis {VONIS}; COMMIT berkas itu. Keputusan tayang: pemilik.")


# ------------------------------------------------------------------ swauji
def uji():
    import random
    D = dt.date.fromisoformat
    awal, akhir = D("2026-11-01"), D("2027-04-30")
    # gerbang tanggal
    assert gerbang_tanggal(D("2027-05-31")) and gerbang_tanggal(D("2027-06-01")) is None and gerbang_tanggal(D("2026-11-02"), kering=True) is None
    assert jendela(json.dumps({"jenis": "sidik", "sidik": "a", "prospektif": ["2026-11-01", "2027-04-30"]}) + "\n"
                   + json.dumps({"jenis": "uji", "sidik": "z"})) == ("a", awal, akhir)
    # arsip sintetis: 6 kab, seluruh jendela, tiga lead
    kabs = [f"{p}|K{p}{i}" for p in (11, 32, 64) for i in range(2)]
    hari = [awal + dt.timedelta(i) for i in range((akhir - awal).days + 1)]
    r0 = random.Random(5)
    mod = {"klim": {"r0": 0.05, "kab": {}, "km": {}}, "platt_klim": {"mu": -3, "sd": 1, "b0": -3, "b1": 1}, "klim_dibi": {"r0": 0.05, "kab": {}, "km": {}},
           "platt_klim_dibi": {"mu": -3, "sd": 1, "b0": -3, "b1": 1}, "laju_level": [.02, .05, .2, .4]}
    benar = {(k, d) for k in kabs for d in hari if r0.random() < 0.06}
    lvl = {(k, d): (lambda u: 2 if u < .04 else 1 if u < .25 else 0)(r0.random()) for k in kabs for d in hari}   # aturan tanpa keterampilan
    def baris(sidik="s", bagus=True, tunda=True):
        out = []
        for k in kabs:
            for d in hari:
                for L in LEAD:
                    t = d - dt.timedelta(L)
                    if t < awal:
                        continue
                    p = (0.5 if (k, d) in benar else 0.02) if bagus else (0.02 if (k, d) in benar else 0.5)
                    out.append({"terbit": str(t), "kab": k, "sasaran": str(d), "lead": L, "fitur": {"level_aturan": lvl[(k, d)]}, "peluang": p + r0.random() * 1e-3,
                                "sidik": sidik, "waktu": f"{t}T07:20:00+07:00", "status": PK.TANDA})
        return out
    A = baris()
    ok, n, galat = periksa_arsip(A, "s", awal, akhir)
    assert not galat and len(ok) == len(A) and n["luar_jendela"] == 0
    assert kober(ok, set(kabs), awal, akhir)[0][2] == 1.0
    # gerbang arsip: sidik lain, waktu sesudah terbit, sasaran/lead tak cocok, ganda, luar jendela
    c = lambda **kw: periksa_arsip([{**A[0], **kw}], "s", awal, akhir)[2]
    assert c(sidik="x") and c(waktu="2026-11-03T00:00:00+07:00") and c(lead=1) and not c()
    assert periksa_arsip([{**A[0], "waktu": "2026-11-01T20:00:00+00:00"}], "s", awal, akhir)[2]    # 20:00Z = 03:00 WIB 2 Nov > terbit 1 Nov: hari WIB, bukan UTC
    assert periksa_arsip([A[0], A[0]], "s", awal, akhir)[2]
    luar = {**A[0], "terbit": "2026-10-31", "sasaran": "2026-10-31", "waktu": "2026-10-31T07:00:00+07:00"}
    o2, n2, g2 = periksa_arsip([luar], "s", awal, akhir)
    assert not g2 and not o2 and n2["luar_jendela"] == 1
    # label: DIBI ATAU logbook hari mulai, kab terpetakan, dalam jendela
    kode = {k: f"{k[:2]}.0{i}" for i, k in enumerate(kabs)}
    k0 = kabs[0]
    lb = [{"jenis": "banjir", "kab_kode": kode[k0], "mulai": "2026-12-05", "terlihat": ["2026-12-05", "2026-12-07"], "surut": None},
          {"jenis": "banjir", "kab_kode": kode[k0], "mulai": "2027-05-20", "terlihat": ["2027-05-20", "2027-05-21"], "surut": None},   # luar jendela
          {"jenis": "gempa", "kab_kode": kode[k0], "mulai": "2026-12-06", "terlihat": ["2026-12-06", "2026-12-06"], "surut": None}]
    db = [{"jenis": "Banjir", "kab_kode": kode[kabs[1]], "tanggal": "2027-01-10", "kejadian": 1}, {"jenis": "Banjir", "kab_kode": "99.99", "tanggal": "2027-01-10", "kejadian": 1}]
    y, kej = label_prospektif(lb, db, kode, awal, akhir)
    assert y == {k0: {D("2026-12-05")}, kabs[1]: {D("2027-01-10")}} and [e["kab_kode"] for e in kej] == [k0], (y, kej)
    # nilai: model bagus mengalahkan aturan dan klimatologi di ketiga lead; model terbalik tidak
    y_ok = {}
    for (k, d) in benar:
        y_ok.setdefault(k, set()).add(d)
    B, P = susun(ok, 1, mod, y_ok, set(kabs))
    d1 = [d for d in hari if d - dt.timedelta(1) >= awal]                                  # lead 1: hari pertama jendela tak punya terbit di jendela
    assert len(B["y"]) == len(kabs) * len(d1) and sum(B["y"]) == len([1 for k, d in benar if d in d1]) and all(0 < p < 1 for m in P.values() for p in m)
    assert B["e"][1] - B["e"][0] == 1 and B["tahun"][0] == 2026 and B["bulan"][0] == 11 and B["level"][0] == lvl[(kabs[0], d1[0])]
    bagus = nilai_semua(ok, mod, y_ok, [], set(kabs), awal, akhir, ulang=200)
    assert bagus["vonis"] == "LULUS" and all(o["vonis"] == "LULUS" for o in bagus["lead"].values()), bagus["lead"][0].get("rincian")
    h = bagus["lead"][2]["hasil"]
    d2 = [d for d in hari if d - dt.timedelta(2) >= awal]
    assert h["n"] == len(kabs) * len(d2) and h["alarm"]["waspada"] == sum(1 for (k, d), v in lvl.items() if d in d2 and v >= 1)   # alarm = aturan
    ok_b, _, _ = periksa_arsip(baris(bagus=False), "s", awal, akhir)
    buruk = nilai_semua(ok_b, mod, y_ok, [], set(kabs), awal, akhir, ulang=200)
    assert buruk["vonis"] == "TIDAK LULUS", buruk["vonis"]
    # cakupan kurang dari 80% -> TIDAK DAPAT DINILAI (bukan LULUS); lead lain tetap dinilai, vonis akhir = terburuk
    sisa = [b for b in ok if not (b["lead"] == 2 and b["sasaran"] < "2027-02-15")]
    cov = nilai_semua(sisa, mod, y_ok, [], set(kabs), awal, akhir, ulang=50)
    assert cov["lead"][2]["vonis"] == "TIDAK DAPAT DINILAI" and cov["lead"][0]["vonis"] == "LULUS" and cov["vonis"] == "TIDAK DAPAT DINILAI"
    # tulis O_EXCL
    with tempfile.TemporaryDirectory() as t:
        j = os.path.join(t, "v.json")
        tulis_vonis({"a": 1}, j)
        try:
            tulis_vonis({"a": 2}, j)
            assert False
        except FileExistsError:
            pass
        assert json.load(open(j)) == {"a": 1}
    # gerbang git di repo sementara
    def tolak(f, frag=""):
        try:
            f()
        except SystemExit as e:
            assert frag in str(e), (frag, str(e))
            return
        raise AssertionError(f"harus ditolak: {frag}")
    with tempfile.TemporaryDirectory() as t:
        def gx(*a, tgl=None):
            env = {**os.environ, "GIT_AUTHOR_DATE": tgl or "", "GIT_COMMITTER_DATE": tgl or ""} if tgl else None
            return subprocess.run(["git", "-C", t, "-c", "user.name=t", "-c", "user.email=t@t", "-c", "commit.gpgsign=false", *a], capture_output=True, check=True, env=env)
        row = lambda d, k="K": json.dumps({"terbit": d, "kab": k, "sasaran": d}) + "\n"
        gx("init", "-q", "-b", "main")
        os.makedirs(os.path.join(t, "ars"))
        f = os.path.join(t, "ars/2026-11.jsonl")
        open(f, "w").write(row("2026-11-02"))
        tolak(lambda: bersih_git(t, ["ars"]), "gagal")                                    # belum terlacak
        gx("add", "ars"); gx("commit", "-q", "-m", "1", tgl="2026-11-02T08:00:00+07:00")
        assert set(bersih_git(t, ["ars"])) == {"ars"} and autentik_arsip(t, "ars") == 1
        open(f, "a").write(row("2026-11-03"))
        tolak(lambda: bersih_git(t, ["ars"]), "beda dari HEAD")                           # diubah sesudah commit
        gx("add", "ars"); gx("commit", "-q", "-m", "2", tgl="2026-11-03T08:00:00+07:00")
        assert autentik_arsip(t, "ars") == 2
        gx("branch", "ref")
        assert sama_origin(t, ["ars"], "ref")[0] == sama_origin(t, ["ars"], "ref")[1]
        open(f, "a").write(row("2026-11-04"))                                             # ditulis belakangan (tgl-penulis 2026-11-10 > terbit + 1)
        gx("add", "ars"); gx("commit", "-q", "-m", "3", tgl="2026-11-10T08:00:00+07:00")
        tolak(lambda: autentik_arsip(t, "ars"), "> terbit + 1")
        tolak(lambda: sama_origin(t, ["ars"], "ref"), "gagal")                            # HEAD beda dari ref
        tolak(lambda: sama_origin(t, ["ars"], "tak-ada"), "gagal")                        # ref hilang
        gx("reset", "-q", "--hard", "ref")
        open(f, "w").write(row("2026-11-03"))                                             # menghapus baris lama: bukan hanya-tambah
        gx("add", "ars"); gx("commit", "-q", "-m", "4", tgl="2026-11-04T08:00:00+07:00")
        tolak(lambda: autentik_arsip(t, "ars"), "menghapus")
        tolak(lambda: git(os.path.join(t, "tidak-ada"), "status"), "gagal")                # kegagalan git = tolak
        # jendela dari HEAD + baris penilai
        sd = os.path.join(t, "j.sidik")
        open(sd, "w").write(json.dumps({"jenis": "sidik", "sidik": "a", "prospektif": ["2026-11-01", "2027-04-30"]}))   # tanpa newline akhir
        pen = tulis_penilai(sd, os.path.abspath(__file__))
        assert pen["sha256"] == sha_berkas(os.path.abspath(__file__)) and "5 tanpa Bonferroni" in pen["tafsir"]
        tolak(lambda: tulis_penilai(sd, os.path.abspath(__file__)), "sudah ada")
        assert len(open(sd).read().splitlines()) == 2 and PK.sidik_terakhir(open(sd).read()) == "a"                  # sidik_head tetap baris `sidik`
        assert jendela(open(sd).read()) == ("a", awal, akhir)
        gx("add", "j.sidik"); gx("commit", "-q", "-m", "5")
        assert jendela_head(t, "j.sidik")[:3] == ("a", awal, akhir) and jendela_head(t, "j.sidik")[3]["sha256"] == pen["sha256"]
        # vonis tak boleh pernah ada di riwayat
        tidak_pernah_ada(t, "v/vonis.json")
        os.makedirs(os.path.join(t, "v")); open(os.path.join(t, "v/vonis.json"), "w").write("{}")
        gx("add", "v"); gx("commit", "-q", "-m", "6"); gx("rm", "-q", "v/vonis.json"); gx("commit", "-q", "-m", "7")
        tolak(lambda: tidak_pernah_ada(t, "v/vonis.json"), "pernah ada")
    # waktu tulis, peluang, sum(y)
    assert periksa_arsip([{**A[0], "waktu": f"{A[0]['terbit']}T11:59:00+07:00"}], "s", awal, akhir)[2] == []
    assert periksa_arsip([{**A[0], "waktu": f"{A[0]['terbit']}T12:30:00+07:00"}], "s", awal, akhir)[2]
    for pbad in (0, 1, -0.1, float("nan"), None, "0.5"):
        assert periksa_arsip([{**A[0], "peluang": pbad}], "s", awal, akhir)[2], pbad
    tolak(lambda: susun(ok, 0, mod, {}, set(kabs)), "sum(y)=0")
    # jalan() sebelum 2027-06-01 menolak sebelum menyentuh apa pun
    try:
        jalan(D("2027-05-31"))
        assert False
    except SystemExit as e:
        assert "ditolak" in str(e)
    print("ok nilai_kab2_ops")


if __name__ == "__main__":
    if sys.argv[1:] == ["uji"]:
        uji()
    elif sys.argv[1:] == ["--kering"]:
        kering()
    elif sys.argv[1:] == ["sidik"]:
        print(tulis_penilai())
    elif not sys.argv[1:]:
        jalan()
    else:
        sys.exit(__doc__)
