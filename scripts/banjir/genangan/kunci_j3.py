"""Kunci kalibrasi J3 model genangan Jakarta (PRAREG-J3.md). Pola `pemicu.py` (sha256 + `buka` sekali) dan jangkar commit `prospektif.py`.

  sidik  cetak sha256 atas kode mesin, penilai, kunci ini, dan PRAREG-J3.md (blok BEKU termasuk)
  cek    gagal bila berkas beda dari sidik di j3_sidik.json atau dari versi di commit jangkar (kalibrasi hanya boleh jalan bila hijau)
  buka   SEKALI: menolak bila sidik beda, jangkar tak terverifikasi, penilai belum ada, atau sudah dibuka; menulis j3_state.json (gerbang label uji di mesin.mjs)
  uji    swa-uji luring
Pakai:  python3 scripts/banjir/genangan/kunci_j3.py sidik | cek | buka | uji
Pemilik: sesi induk mengisi j3_sidik.json {sidik, jangkar_commit} sesudah verifikasi, lalu commit.
"""
import datetime as dt, hashlib, json, os, re, subprocess, sys, tempfile

AKAR = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "../../.."))
G = "scripts/banjir/genangan/"
WAJIB = ["public/banjir/sim_genangan.js", G + "mesin.mjs", G + "kunci_j3.py", G + "PRAREG-J3.md"]
NANTI = [G + "skor_j3.py", G + "kalibrasi_j3.py"]   # penilai dan penyetel: harus ada SEBELUM jangkar, lalu ikut sidik
PRAREG = G + "PRAREG-J3.md"
SIDIK_BERKAS = os.path.join(AKAR, G + "j3_sidik.json")
STATE = os.path.join(AKAR, "data/raw/banjir/genangan/j3_state.json")   # sama dengan STATE_J3 di mesin.mjs


def beku(akar=AKAR):
    m = re.search(r"<!-- BEKU:mulai -->\s*```json\n(.*?)\n```\s*<!-- BEKU:akhir -->", open(os.path.join(akar, PRAREG), encoding="utf8").read(), re.S)
    if not m:
        sys.exit("blok BEKU tidak ada di PRAREG-J3.md")
    return json.loads(m.group(1))


def argumen_beku(akar=AKAR):
    """Argumen mesin.mjs yang HARUS dipakai tiap run kalibrasi/uji (nilai dari blok BEKU)."""
    b = beku(akar)
    return ["--faktor", str(b["dx_faktor"]), "--jam", str(b["jam"]), "--hujan", b["hujan"], "--cn", str(b["cn"]), "--muka", str(b["muka"]), "--rentang", str(b["rentang"]),
            "--skala-subsiden", str(b["skala_subsiden"]), "--skala-hulu", str(b["skala_hulu"]), "--radius-hulu-km", str(b["radius_hulu_km"]), "--tanggul", str(b["tanggul_m"])]


def berkas(akar=AKAR):
    return WAJIB + [j for j in NANTI if os.path.exists(os.path.join(akar, j))]


def sidik(akar=AKAR):
    h = hashlib.sha256()
    for j in berkas(akar):
        h.update(j.encode() + b"\0" + hashlib.sha256(open(os.path.join(akar, j), "rb").read()).digest())
    return h.hexdigest()


def git_show(commit, jalur, akar=AKAR):
    r = subprocess.run(["git", "show", f"{commit}:{jalur}"], cwd=akar, capture_output=True)
    return r.stdout if r.returncode == 0 else None


def adalah_leluhur(commit, akar=AKAR):
    return subprocess.run(["git", "merge-base", "--is-ancestor", commit, "HEAD"], cwd=akar, capture_output=True).returncode == 0


def periksa(akar=AKAR, sidik_berkas=SIDIK_BERKAS, show=git_show, leluhur=adalah_leluhur, perlu_jangkar=True):
    """-> pesan galat (str) atau None bila hijau."""
    try:
        S = json.load(open(sidik_berkas))
    except (OSError, ValueError):
        return "j3_sidik.json tidak terbaca"
    if not S.get("sidik"):
        return "belum dijangkar: sesi induk mengisi j3_sidik.json (sidik dari `sidik`) sesudah verifikasi"
    if sidik(akar) != S["sidik"]:
        return f"sidik beda ({sidik(akar)} != {S['sidik']}): kode, parameter, atau kriteria berubah; hasil tidak sah"
    if perlu_jangkar:
        c = S.get("jangkar_commit")
        if not c or not leluhur(c):
            return "jangkar_commit kosong atau bukan leluhur HEAD (clone dangkal?): tak bisa diverifikasi, tolak"
        for j in berkas(akar):
            if show(c, j) != open(os.path.join(akar, j), "rb").read():
                return f"{j} beda dari versi di commit jangkar {c[:10]}"
    return None


def buka(akar=AKAR, sidik_berkas=SIDIK_BERKAS, state=STATE, **kw):
    hilang = [j for j in NANTI if not os.path.exists(os.path.join(akar, j))]
    if hilang:
        return f"penilai/penyetel belum ada: {hilang}"
    if os.path.exists(state) and json.load(open(state)).get("dibuka"):
        return f"sudah dibuka {json.load(open(state))['dibuka']['tanggal']}; tak bisa dibuka lagi"
    g = periksa(akar, sidik_berkas, **kw)
    if g:
        return g
    os.makedirs(os.path.dirname(state), exist_ok=True)
    json.dump({"dibuka": {"tanggal": dt.date.today().isoformat(), "sidik": sidik(akar)}}, open(state, "w"))
    return None


def uji():
    with tempfile.TemporaryDirectory() as d:
        for j in WAJIB:
            os.makedirs(os.path.dirname(os.path.join(d, j)), exist_ok=True)
            open(os.path.join(d, j), "w").write("x")
        open(os.path.join(d, PRAREG), "w").write('t\n<!-- BEKU:mulai -->\n```json\n{"dx_faktor": 12, "jam": 96, "hujan": "era5", "cn": 80, "muka": 0.6, "rentang": 1, '
                                              '"skala_subsiden": 1, "skala_hulu": 1, "radius_hulu_km": 10, "tanggul_m": 2.5}\n```\n<!-- BEKU:akhir -->\n')
        assert argumen_beku(d)[:4] == ["--faktor", "12", "--jam", "96"]
        sb, st = os.path.join(d, "s.json"), os.path.join(d, "state.json")
        palsu = {"show": lambda c, j, akar=None: open(os.path.join(d, j), "rb").read(), "leluhur": lambda c: True}
        json.dump({"sidik": "", "jangkar_commit": ""}, open(sb, "w"))
        assert "belum dijangkar" in periksa(d, sb, **palsu)
        s0 = sidik(d)
        json.dump({"sidik": s0, "jangkar_commit": "abc"}, open(sb, "w"))
        assert periksa(d, sb, **palsu) is None
        assert "bukan leluhur" in periksa(d, sb, show=palsu["show"], leluhur=lambda c: False)
        assert "commit jangkar" in periksa(d, sb, show=lambda c, j, akar=None: b"lain", leluhur=lambda c: True)
        assert "penilai/penyetel belum ada" in buka(d, sb, st, **palsu)
        for j in NANTI:
            open(os.path.join(d, j), "w").write("y")
        assert sidik(d) != s0 and "sidik beda" in buka(d, sb, st, **palsu), "berkas penilai baru mengubah sidik"
        json.dump({"sidik": sidik(d), "jangkar_commit": "abc"}, open(sb, "w"))
        open(os.path.join(d, WAJIB[1]), "w").write("diubah")
        assert "sidik beda" in buka(d, sb, st, **palsu) and not os.path.exists(st), "kode berubah: tolak, state tak ditulis"
        open(os.path.join(d, WAJIB[1]), "w").write("x")
        assert buka(d, sb, st, **palsu) is None and json.load(open(st))["dibuka"]["sidik"] == sidik(d)
        assert "sudah dibuka" in buka(d, sb, st, **palsu), "buka hanya sekali"
        open(os.path.join(d, PRAREG), "a").write(" ")
        assert "sidik beda" in periksa(d, sb, **palsu), "teks kriteria berubah"
    assert re.search(r"<!-- BEKU:mulai -->", open(os.path.join(AKAR, PRAREG), encoding="utf8").read()) and beku()["dx_faktor"] == 12
    print("ok")


if __name__ == "__main__":
    c = sys.argv[1:2]
    if c == ["uji"]:
        uji()
    elif c == ["sidik"]:
        print(sidik())
        [print("PERINGATAN: belum ada", j, file=sys.stderr) for j in NANTI if not os.path.exists(os.path.join(AKAR, j))]
    elif c in (["cek"], ["buka"]):
        g = periksa() if c == ["cek"] else buka()
        sys.exit(g or print("ok"))
    else:
        sys.exit(__doc__)
