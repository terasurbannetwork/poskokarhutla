#!/usr/bin/env python3
"""Cadangan beku data masukan model yang dikunci sidik pra-registrasi (banjir PRAREG-CAMPUR, longsor PRAREG-LHASA2).

data/raw/** gitignored dan pernah hilang bersama worktree. Berkas disalin ke R2 dengan kunci isi-teralamat
`beku/<sha256>`; daftar jalur->sha256 ada di data/beku/manifest.json (terlacak git, tanpa secret, jalur relatif).

  python3 scripts/umum/cadangan_beku.py daftar    # tulis manifest dari disk + ringkas total ukuran
  python3 scripts/umum/cadangan_beku.py unggah    # unggah yang belum ada ke R2 (--remote, login wrangler pengguna)
  python3 scripts/umum/cadangan_beku.py pulih     # unduh berkas yang hilang dari R2, verifikasi sha256
  python3 scripts/umum/cadangan_beku.py cek       # disk vs manifest
  python3 scripts/umum/cadangan_beku.py uji       # self-check tanpa jaringan
"""
import ast, datetime as dt, hashlib, json, os, re, subprocess, sys, tempfile, time

AKAR = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".."))
MANIFEST = "data/beku/manifest.json"
BUCKET, PREFIKS = "poskokarhutla-foto", "beku/"   # wrangler.jsonc binding MEDIA
BATAS_GB = 5
SUMBER_SIDIK = "scripts/banjir/model_kab_campur.py"
FOLDER = ["data/raw/banjir/" + d for d in ("jam_era5", "q2_pusat", "koreksi_bias", "label_kec", "fitur", "iklim", "model_kab_campur")] \
    + ["data/raw/longsor", "data/raw/logbook", "data/raw/publik", "data/raw/banjir/gfm/ref"]   # publik: sumber yang bisa hilang (COOLR, GFD, Mendeley, PetaBencana), ~270 MB; gfm/ref kecil (3.8 MB)
# GFM: hanya hasil (kab_hari.csv.gz + manifest.jsonl); cache/ (tif sementara) dan panen.log sengaja tidak dicadangkan
# masukan sidik longsor (PRAREG-LHASA2 §327) yang berada di luar folder di atas
TAMBAHAN = ["data/raw/banjir/gfm/kab_hari.csv.gz", "data/raw/banjir/gfm/manifest.jsonl",
            "public/longsor/data/pvmbg.json", "public/longsor/data/kerentanan.json", "public/data/bnpb/kerentanan.json",
            "public/data/penduduk.json", "public/data/neraca_air/grace.json"]
LEWATI = re.compile(r"(^|/)(venv|\.venv|__pycache__|\.git|node_modules)(/|$)|\.(part|tmp|lock|crdownload|pyc)$|(^|/)\.DS_Store$|~$")
TUNGGU_DETIK = 300   # berkas diubah <5 menit lalu dianggap unduhan yang masih berjalan


def sha_berkas(p):
    h = hashlib.sha256()
    with open(p, "rb") as f:
        for b in iter(lambda: f.read(1 << 20), b""):
            h.update(b)
    return h.hexdigest()


def daftar_sidik(akar=AKAR):
    """Baca BERKAS_SIDIK dari sumber (tanpa mengimpor modul berat); berkas di scripts/ sudah di git, dilewati."""
    src = open(os.path.join(akar, SUMBER_SIDIK)).read()
    for n in ast.walk(ast.parse(src)):
        if isinstance(n, ast.Assign) and getattr(n.targets[0], "id", "") == "BERKAS_SIDIK":
            d = ast.literal_eval(n.value)
            return sorted({r for v in d.values() for r in v if not r.startswith("scripts/")})
    sys.exit("BERKAS_SIDIK tidak ditemukan di " + SUMBER_SIDIK)


def kumpulkan(akar=AKAR, folder=None, tambahan=None, sekarang=None):
    """-> (rel_terpilih, dilewati[(rel, alasan)])"""
    sekarang = sekarang or time.time()
    pilih, lewat = set(), []
    def coba(rel):
        p = os.path.join(akar, rel)
        if LEWATI.search(rel):
            return
        if sekarang - os.path.getmtime(p) < TUNGGU_DETIK:
            lewat.append((rel, "baru diubah (unduhan berjalan?)")); return
        pilih.add(rel)
    for fo in (FOLDER if folder is None else folder):
        for d, _, fs in os.walk(os.path.join(akar, fo)):
            for f in fs:
                coba(os.path.relpath(os.path.join(d, f), akar).replace(os.sep, "/"))
    extra = (daftar_sidik(akar) if tambahan is None else []) + (TAMBAHAN if tambahan is None else tambahan)
    for rel in extra:
        if os.path.isfile(os.path.join(akar, rel)):
            coba(rel)
        else:
            lewat.append((rel, "tidak ada"))
    return sorted(pilih), lewat


def muat(akar=AKAR):
    p = os.path.join(akar, MANIFEST)
    return json.load(open(p)) if os.path.exists(p) else {"dibuat": "", "berkas": {}}


def tulis(m, akar=AKAR):
    p = os.path.join(akar, MANIFEST)
    os.makedirs(os.path.dirname(p), exist_ok=True)
    out = {"dibuat": m["dibuat"], **{k: v for k, v in m.items() if k != "dibuat"}}   # "dibuat" kunci pertama
    json.dump(out, open(p, "w"), indent=1, sort_keys=False, ensure_ascii=False)
    open(p, "a").write("\n")


def bangun(akar=AKAR, rels=None, lama=None):
    lama = (lama or {}).get("berkas", {})
    out = {}
    for rel in rels:
        p = os.path.join(akar, rel)
        ukuran, mt = os.path.getsize(p), os.path.getmtime(p)
        o = lama.get(rel)
        if o and o["ukuran"] == ukuran and o.get("mtime") == mt:
            out[rel] = o; continue   # tak diubah: tak perlu hash ulang
        s = sha_berkas(p)
        out[rel] = {"sha256": s, "ukuran": ukuran, "mtime": mt, "kunci": PREFIKS + s,
                    "diunggah": o["diunggah"] if o and o["sha256"] == s else None}
    return out


def wrangler(*a):
    return subprocess.run(["npx", "wrangler", *a], cwd=AKAR, capture_output=True, text=True, stdin=subprocess.DEVNULL, timeout=3600)


def cmd_daftar():
    rels, lewat = kumpulkan()
    m = muat()
    m = {"dibuat": dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds"), "bucket": BUCKET,
         "berkas": bangun(rels=rels, lama=m)}
    tulis(m)
    tot = sum(o["ukuran"] for o in m["berkas"].values())
    print(f"{len(rels)} berkas, {tot/1e6:.1f} MB ({tot/1e9:.2f} GB; batas {BATAS_GB} GB)")
    for r, a in lewat:
        print("  lewati", r, "-", a)
    return m


def cmd_unggah():
    m = cmd_daftar()
    tot = sum(o["ukuran"] for o in m["berkas"].values())
    if tot > BATAS_GB * 1e9:
        sys.exit(f"total {tot/1e9:.1f} GB > {BATAS_GB} GB: lapor pemilik dulu, tidak diunggah")
    sudah, n, byt = {o["sha256"] for o in m["berkas"].values() if o["diunggah"]}, 0, 0
    for rel, o in m["berkas"].items():
        if o["sha256"] in sudah:
            o["diunggah"] = o["diunggah"] or "sama-isi"; continue
        r = wrangler("r2", "object", "put", f"{BUCKET}/{o['kunci']}", "--file", os.path.join(AKAR, rel), "--remote")
        if r.returncode:
            tulis(m)
            sys.exit(f"wrangler gagal di {rel}: {(r.stderr or r.stdout)[-400:]}\n(berhenti; tidak ada jalur lain)")
        o["diunggah"] = dt.date.today().isoformat(); sudah.add(o["sha256"]); n += 1; byt += o["ukuran"]
        tulis(m)
    tulis(m)
    print(f"terunggah {n} berkas baru, {byt/1e6:.1f} MB ke {BUCKET}/{PREFIKS}")


def banding(m, akar=AKAR):
    ok, hilang, beda = [], [], []
    for rel, o in m["berkas"].items():
        p = os.path.join(akar, rel)
        if not os.path.exists(p):
            hilang.append(rel)
        elif sha_berkas(p) == o["sha256"]:
            ok.append(rel)
        else:
            beda.append(rel)
    return ok, hilang, beda


def cmd_cek():
    ok, hilang, beda = banding(muat())
    print(f"cocok {len(ok)}, hilang {len(hilang)}, beda {len(beda)}")
    for r in hilang: print("  hilang", r)
    for r in beda: print("  beda  ", r)
    return 1 if hilang or beda else 0


def tulis_terverifikasi(p, data, sha):
    """Tulis hanya bila sha cocok; kalau tidak, tolak dan tak meninggalkan berkas."""
    if hashlib.sha256(data).hexdigest() != sha:
        raise ValueError("sha256 beda: " + p)
    os.makedirs(os.path.dirname(p), exist_ok=True)
    open(p, "wb").write(data)


def cmd_pulih():
    m = muat()
    _, hilang, _ = banding(m)
    for rel in hilang:
        o = m["berkas"][rel]
        with tempfile.TemporaryDirectory() as t:
            tmp = os.path.join(t, "x")
            r = wrangler("r2", "object", "get", f"{BUCKET}/{o['kunci']}", "--file", tmp, "--remote")
            if r.returncode:
                sys.exit(f"unduh {rel} gagal: {(r.stderr or r.stdout)[-300:]}")
            tulis_terverifikasi(os.path.join(AKAR, rel), open(tmp, "rb").read(), o["sha256"])
        print("pulih", rel)
    print(f"{len(hilang)} berkas dipulihkan")


def uji():
    with tempfile.TemporaryDirectory() as t:
        os.makedirs(os.path.join(t, "data/raw/x/venv"))
        for rel, isi in (("data/raw/x/a.json", b"{}"), ("data/raw/x/b.bin", b"abc"), ("data/raw/x/venv/z.py", b"1"), ("data/raw/x/c.part", b"1")):
            open(os.path.join(t, rel), "wb").write(isi)
        lama = time.time() + 1000
        rels, _ = kumpulkan(t, ["data/raw/x"], [], sekarang=lama)
        assert rels == ["data/raw/x/a.json", "data/raw/x/b.bin"], rels            # venv & .part dikecualikan
        _, lw = kumpulkan(t, ["data/raw/x"], [], sekarang=time.time())
        assert any("baru diubah" in a for _, a in lw)                              # unduhan berjalan dilewati
        m = {"dibuat": "t", "berkas": bangun(t, rels)}
        assert bangun(t, rels, m) == m["berkas"]                                    # idempoten
        tulis(m, t)
        m2 = muat(t)
        assert list(m2)[0] == "dibuat" and m2["berkas"] == m["berkas"]
        assert not any(os.path.isabs(r) for r in m2["berkas"]) and "/Users/" not in json.dumps(m2)
        assert all(o["kunci"] == PREFIKS + o["sha256"] for o in m2["berkas"].values())
        assert banding(m2, t)[0] == rels
        os.remove(os.path.join(t, rels[0]))
        assert banding(m2, t)[1] == [rels[0]]                                       # hilang terdeteksi
        o = m2["berkas"][rels[0]]
        p = os.path.join(t, rels[0])
        try:
            tulis_terverifikasi(p, b"rusak", o["sha256"]); assert False
        except ValueError:
            assert not os.path.exists(p)                                            # berkas rusak ditolak
        tulis_terverifikasi(p, b"{}", o["sha256"])
        assert banding(m2, t)[0] == rels
    assert all(not r.startswith("scripts/") for r in daftar_sidik())
    print("uji cadangan_beku: OK")


if __name__ == "__main__":
    c = sys.argv[1] if len(sys.argv) > 1 else ""
    f = {"daftar": cmd_daftar, "unggah": cmd_unggah, "pulih": cmd_pulih, "cek": cmd_cek, "uji": uji}.get(c)
    if not f:
        sys.exit(__doc__)
    sys.exit(f() if c == "cek" else (f() and None))
