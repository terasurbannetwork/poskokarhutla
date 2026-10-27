"""Kunci kalibrasi J3 model genangan Jakarta (PRAREG-J3.md). Pola `pemicu.py` (sha256 + `buka` sekali) dan jangkar commit `prospektif.py`.

  sidik  cetak sha256 atas kode (mesin, penilai, penyetel, vonis, kunci), PRAREG-J3.md (blok BEKU termasuk), dan manifes sha256 MASUKAN data; `hasil` cetak sha256 hasil_j3.json
  cek    gagal bila berkas beda dari sidik di j3_sidik.json atau dari versi di commit jangkar (kalibrasi hanya boleh jalan bila hijau)
  buka   SEKALI: menolak bila sidik beda, jangkar tak terverifikasi, penilai belum ada, hash hasil_j3.json tak cocok dengan j3_sidik.json, ditolak pagar, atau sudah dibuka; menulis j3_state.json (gerbang label uji di mesin.mjs)
  uji    swa-uji luring
Pakai:  python3 scripts/banjir/genangan/kunci_j3.py sidik | cek | buka | uji
Pemilik: sesi induk mengisi j3_sidik.json {sidik, jangkar_commit} sesudah verifikasi, lalu commit.
"""
import datetime as dt, hashlib, json, os, re, subprocess, sys, tempfile

AKAR = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "../../.."))
G = "scripts/banjir/genangan/"
WAJIB = ["public/banjir/sim_genangan.js", G + "mesin.mjs", G + "kunci_j3.py", G + "PRAREG-J3.md", G + "bersama.py", G + "gsmap.py", G + "hujan_jam.py", G + "petabencana.py", G + "debit_hulu.py"]
NANTI = [G + "skor_j3.py", G + "kalibrasi_j3.py", G + "vonis_j3.py"]   # penilai, penyetel, vonis: harus ada SEBELUM jangkar, lalu ikut sidik
EVENT = ["2017-01", "2018-01", "2020-01", "2021-02", "2024-08", "2025-04"]
D = "data/raw/banjir/genangan/"
# MASUKAN data (di-hash, bukan di git): geometri, pompa, InaRISK, hujan jam dan debit hulu SEMUA kejadian, DEM, alur OSM, subsidensi, label PetaBencana
MASUKAN = ["public/geo/kecamatan/31.json", "public/banjir/data/genangan/pompa.json", "public/banjir/data/bahaya.json", "public/banjir/data/genangan/hulu.json", "public/banjir/data/subsiden_literatur.json",
           D + "medan/demnas_kotak.f32.gz", D + "medan/demnas_kotak.json", D + "saluran_osm.json", D + "petabencana_laporan.json"] \
    + [D + f"hujan_jam/{e}.json" for e in EVENT] + [D + f"hulu/{n}.json" for n in ("Angke", "Bekasi", "Ciliwung", "Cipinang", "Cisadane", "Krukut", "Pesanggrahan", "Sunter")]
HASIL = os.path.join(AKAR, "data/raw/banjir/genangan/j3_kal/hasil_j3.json")
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


def sha_berkas(jalur):
    h = hashlib.sha256()
    with open(jalur, "rb") as f:
        for b in iter(lambda: f.read(1 << 22), b""):
            h.update(b)
    return h.hexdigest()


def manifes(akar=AKAR, daftar=None):
    """{jalur masukan: sha256 atau "HILANG"}"""
    return {j: (sha_berkas(os.path.join(akar, j)) if os.path.exists(os.path.join(akar, j)) else "HILANG") for j in (MASUKAN if daftar is None else daftar)}


def sidik(akar=AKAR, daftar=None):
    h = hashlib.sha256(json.dumps(manifes(akar, daftar), sort_keys=True).encode())
    for j in berkas(akar):
        h.update(j.encode() + b"\0" + hashlib.sha256(open(os.path.join(akar, j), "rb").read()).digest())
    return h.hexdigest()


def git_show(commit, jalur, akar=AKAR):
    r = subprocess.run(["git", "show", f"{commit}:{jalur}"], cwd=akar, capture_output=True)
    return r.stdout if r.returncode == 0 else None


def adalah_leluhur(commit, akar=AKAR):
    return subprocess.run(["git", "merge-base", "--is-ancestor", commit, "HEAD"], cwd=akar, capture_output=True).returncode == 0


def periksa(akar=AKAR, sidik_berkas=SIDIK_BERKAS, show=git_show, leluhur=adalah_leluhur, perlu_jangkar=True, daftar=None, ketat=True):
    """-> pesan galat (str) atau None bila hijau."""
    try:
        S = json.load(open(sidik_berkas))
    except (OSError, ValueError):
        return "j3_sidik.json tidak terbaca"
    if not S.get("sidik"):
        return "belum dijangkar: sesi induk mengisi j3_sidik.json (sidik dari `sidik`) sesudah verifikasi"
    hilang = [j for j, v in manifes(akar, daftar).items() if v == "HILANG"]
    if ketat and hilang:
        return f"masukan hilang (panen belum lengkap): {hilang}"
    if sidik(akar, daftar) != S["sidik"]:
        return f"sidik beda ({sidik(akar, daftar)} != {S['sidik']}): kode, parameter, kriteria, atau masukan berubah; hasil tidak sah"
    if perlu_jangkar:
        c = S.get("jangkar_commit")
        if not c or not leluhur(c):
            return "jangkar_commit kosong atau bukan leluhur HEAD (clone dangkal?): tak bisa diverifikasi, tolak"
        for j in berkas(akar):
            if show(c, j) != open(os.path.join(akar, j), "rb").read():
                return f"{j} beda dari versi di commit jangkar {c[:10]}"
    return None


def buka(akar=AKAR, sidik_berkas=SIDIK_BERKAS, state=STATE, hasil=HASIL, **kw):
    hilang = [j for j in NANTI if not os.path.exists(os.path.join(akar, j))]
    if hilang:
        return f"penilai/penyetel belum ada: {hilang}"
    if os.path.exists(state) and json.load(open(state)).get("dibuka"):
        return f"sudah dibuka {json.load(open(state))['dibuka']['tanggal']}; tak bisa dibuka lagi"
    g = periksa(akar, sidik_berkas, **kw)
    if g:
        return g
    S = json.load(open(sidik_berkas))
    if not os.path.exists(hasil) or not S.get("hasil_sha256") or sha_berkas(hasil) != S["hasil_sha256"]:
        return "hasil_j3.json (skala*, Kd*, peta Kd) tidak tercatat/tidak cocok dengan hasil_sha256 di j3_sidik.json: kalibrasi harus selesai dan hash-nya dijangkar SEBELUM buka"
    if json.load(open(hasil)).get("ditolak_pagar"):
        return "konfigurasi ditolak pagar 2021-02 (PRAREG): tidak boleh dibuka"
    os.makedirs(os.path.dirname(state), exist_ok=True)
    json.dump({"dibuka": {"tanggal": dt.date.today().isoformat(), "sidik": sidik(akar, kw.get("daftar"))}}, open(state, "w"))
    return None


def uji():
    with tempfile.TemporaryDirectory() as d:
        for j in WAJIB:
            os.makedirs(os.path.dirname(os.path.join(d, j)), exist_ok=True)
            open(os.path.join(d, j), "w").write("x")
        open(os.path.join(d, PRAREG), "w").write('t\n<!-- BEKU:mulai -->\n```json\n{"dx_faktor": 12, "jam": 96, "hujan": "era5", "cn": 80, "muka": 0.6, "rentang": 1, '
                                              '"skala_subsiden": 1, "skala_hulu": 1, "radius_hulu_km": 10, "tanggul_m": 2.5}\n```\n<!-- BEKU:akhir -->\n')
        assert argumen_beku(d)[:4] == ["--faktor", "12", "--jam", "96"]
        sb, st, hs = os.path.join(d, "s.json"), os.path.join(d, "state.json"), os.path.join(d, "hasil.json")
        DL = ["m1.json", "m2.json"]; open(os.path.join(d, "m1.json"), "w").write("a"); open(os.path.join(d, "m2.json"), "w").write("b")
        palsu = {"show": lambda c, j, akar=None: open(os.path.join(d, j), "rb").read(), "leluhur": lambda c: True, "daftar": DL}
        simpan = lambda **k: json.dump({"jangkar_commit": "abc", **k}, open(sb, "w"))
        simpan(sidik="", jangkar_commit="")
        assert "belum dijangkar" in periksa(d, sb, **palsu)
        s0 = sidik(d, DL); simpan(sidik=s0)
        assert periksa(d, sb, **palsu) is None
        assert "bukan leluhur" in periksa(d, sb, show=palsu["show"], leluhur=lambda c: False, daftar=DL)
        assert "commit jangkar" in periksa(d, sb, show=lambda c, j, akar=None: b"lain", leluhur=lambda c: True, daftar=DL)
        assert "penilai/penyetel belum ada" in buka(d, sb, st, hs, **palsu)
        for j in NANTI:
            open(os.path.join(d, j), "w").write("y")
        assert sidik(d, DL) != s0 and "sidik beda" in buka(d, sb, st, hs, **palsu), "berkas penilai baru mengubah sidik"
        s1 = sidik(d, DL); simpan(sidik=s1)
        open(os.path.join(d, "m2.json"), "w").write("berubah"); assert "sidik beda" in periksa(d, sb, **palsu), "masukan data berubah"
        open(os.path.join(d, "m2.json"), "w").write("b")
        assert "masukan hilang" in periksa(d, sb, **{**palsu, "daftar": DL + ["tak_ada.json"]}), "masukan hilang ditolak (ketat)"
        open(os.path.join(d, WAJIB[1]), "w").write("diubah")
        assert "sidik beda" in buka(d, sb, st, hs, **palsu) and not os.path.exists(st), "kode berubah: tolak, state tak ditulis"
        open(os.path.join(d, WAJIB[1]), "w").write("x")
        assert "hasil_j3.json" in buka(d, sb, st, hs, **palsu), "tanpa hash hasil: tolak"
        json.dump({"skala": 1.5, "ditolak_pagar": False}, open(hs, "w")); simpan(sidik=s1, hasil_sha256="salah")
        assert "hasil_j3.json" in buka(d, sb, st, hs, **palsu), "hash hasil tak cocok: tolak"
        simpan(sidik=s1, hasil_sha256=sha_berkas(hs)); json.dump({"ditolak_pagar": True}, open(hs, "w"))
        assert "hasil_j3.json" in buka(d, sb, st, hs, **palsu), "hasil berubah sesudah dijangkar: tolak"
        json.dump({"ditolak_pagar": True}, open(hs, "w")); simpan(sidik=s1, hasil_sha256=sha_berkas(hs))
        assert "pagar" in buka(d, sb, st, hs, **palsu) and not os.path.exists(st)
        json.dump({"ditolak_pagar": False}, open(hs, "w")); simpan(sidik=s1, hasil_sha256=sha_berkas(hs))
        assert buka(d, sb, st, hs, **palsu) is None and json.load(open(st))["dibuka"]["sidik"] == s1
        assert "sudah dibuka" in buka(d, sb, st, hs, **palsu), "buka hanya sekali"
        open(os.path.join(d, PRAREG), "a").write(" ")
        assert "sidik beda" in periksa(d, sb, **palsu), "teks kriteria berubah"
    assert re.search(r"<!-- BEKU:mulai -->", open(os.path.join(AKAR, PRAREG), encoding="utf8").read()) and beku()["dx_faktor"] == 12
    print("ok")


if __name__ == "__main__":
    c = sys.argv[1:2]
    if c == ["uji"]:
        uji()
    elif c == ["sidik-saja"]:   # dipakai mesin.mjs labelTerbuka
        print(sidik())
    elif c == ["hasil"]:
        print(sha_berkas(HASIL))
    elif c == ["sidik"]:
        print(sidik())
        [print("PERINGATAN: masukan HILANG", j, file=sys.stderr) for j, v in manifes().items() if v == "HILANG"]
        [print("PERINGATAN: belum ada", j, file=sys.stderr) for j in NANTI if not os.path.exists(os.path.join(AKAR, j))]
    elif c in (["cek"], ["buka"]):
        g = periksa() if c == ["cek"] else buka()
        sys.exit(g or print("ok"))
    else:
        sys.exit(__doc__)
