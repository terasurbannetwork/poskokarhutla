"""Kunci J4 (PRAREG-J4.md bagian 8). Pola kunci_j3.py: sidik sha256 + jangkar = commit yang SUDAH di-push ke origin.
Sidik = sha256 atas PRAREG-J4.md, semua kode yang membentuk prediksi dan skor (mesin.mjs, sim_genangan.js, skor_j3/j4, j4_operasi, kalibrasi_j4, petabencana, bersama, wilayah, umum),
raster panggang j4_medan_100m.json.gz, j4_kalibrasi.json, dan data masukan statis (kecamatan 31, pompa, hulu snap, subsidensi, InaRISK). TIDAK termasuk pengambil FTP (gsmap.py, m1_kumpul.py):
hujan yang diambilnya dicatat per hash di tiap baris prediksi (sha_hujan).
  sidik     cetak sidik sekarang
  jangkar   SEKALI, sesudah commit berkas di-push: tulis j4_sidik.json {sidik, jangkar_commit, jangkar_tanggal, berkas}; menolak bila berkas kotor/belum di-commit, HEAD belum di origin, atau sudah dijangkar
  cek       gagal bila sidik beda, berkas beda dari commit jangkar, commit jangkar bukan leluhur HEAD atau tidak ada di cabang remote (`git branch -r --contains`)
  uji       swa-uji luring
Pakai:  python3 scripts/banjir/genangan/kunci_j4.py sidik | jangkar | cek | uji
Clone Actions untuk `cek` wajib fetch-depth: 0 (clone dangkal tak bisa membuktikan leluhur: ditolak). Sesi induk yang menjalankan `jangkar`, lalu commit dan push j4_sidik.json.
"""
import datetime as dt, hashlib, json, os, subprocess, sys, tempfile

AKAR = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "../../.."))
G = "scripts/banjir/genangan/"
BERKAS = ["public/banjir/sim_genangan.js", "scripts/banjir/wilayah.py", "scripts/banjir/umum.py",
          G + "PRAREG-J4.md", G + "mesin.mjs", G + "j4_operasi.py", G + "skor_j4.py", G + "skor_j3.py", G + "kalibrasi_j4.py", G + "kunci_j3.py", G + "kunci_j4.py",
          G + "petabencana.py", G + "bersama.py", G + "j4_medan_100m.json.gz", G + "j4_kalibrasi.json",
          "public/geo/kecamatan/31.json", "public/banjir/data/genangan/pompa.json", "public/banjir/data/genangan/hulu.json", "public/banjir/data/subsiden_literatur.json", "public/banjir/data/bahaya.json"]
SIDIK_BERKAS = os.path.join(AKAR, G + "j4_sidik.json")


def sha_berkas(j, akar=AKAR):
    return hashlib.sha256(open(os.path.join(akar, j), "rb").read()).hexdigest() if os.path.exists(os.path.join(akar, j)) else "HILANG"


def manifes(akar=AKAR, berkas=None):
    return {j: sha_berkas(j, akar) for j in (berkas or BERKAS)}


def sidik(akar=AKAR, berkas=None):
    return hashlib.sha256(json.dumps(manifes(akar, berkas), sort_keys=True).encode()).hexdigest()


def git(*a, akar=AKAR):
    return subprocess.run(["git", *a], cwd=akar, capture_output=True)


def git_show(commit, j, akar=AKAR):
    r = git("show", f"{commit}:{j}", akar=akar)
    return r.stdout if r.returncode == 0 else None


def leluhur(commit, akar=AKAR):
    return git("merge-base", "--is-ancestor", commit, "HEAD", akar=akar).returncode == 0


def di_remote(commit, akar=AKAR):
    return git("merge-base", "--is-ancestor", commit, "origin/main", akar=akar).returncode == 0    # origin/main saja, sama dengan di_origin


def periksa(akar=AKAR, sidik_berkas=SIDIK_BERKAS, berkas=None, show=git_show, lel=leluhur, remote=di_remote):
    """-> pesan galat (str) atau None bila hijau."""
    try:
        S = json.load(open(sidik_berkas))
    except (OSError, ValueError):
        return "j4_sidik.json tidak terbaca (belum dijangkar)"
    if not S.get("sidik") or not S.get("jangkar_commit"):
        return "belum dijangkar: jalankan `kunci_j4.py jangkar` sesudah commit di-push"
    hilang = [j for j, v in manifes(akar, berkas).items() if v == "HILANG"]
    if hilang:
        return f"berkas hilang: {hilang}"
    if sidik(akar, berkas) != S["sidik"]:
        beda = [j for j, v in manifes(akar, berkas).items() if S.get("berkas", {}).get(j) != v]
        return f"sidik beda: {beda}; hasil tidak sah"
    c = S["jangkar_commit"]
    if not lel(c):
        return "jangkar_commit bukan leluhur HEAD (clone dangkal? gunakan fetch-depth: 0): tak bisa diverifikasi, tolak"
    if not remote(c):
        return "jangkar_commit tidak ada di cabang remote (belum di-push?): tolak"
    for j in (berkas or BERKAS):
        if show(c, j) != open(os.path.join(akar, j), "rb").read():
            return f"{j} beda dari versi di commit jangkar {c[:10]}"
    return None


def jangkar(akar=AKAR, sidik_berkas=SIDIK_BERKAS, berkas=None, kepala=None, remote=di_remote, kotor=None, sekarang=None):
    """Tulis j4_sidik.json. -> pesan galat atau None."""
    try:
        if json.load(open(sidik_berkas)).get("jangkar_commit"):
            return "sudah dijangkar: tak bisa dijangkar ulang (kriteria baru = berkas baru)"
    except (OSError, ValueError):
        pass
    berkas = berkas or BERKAS
    hilang = [j for j, v in manifes(akar, berkas).items() if v == "HILANG"]
    if hilang:
        return f"berkas hilang: {hilang}"
    kotor = kotor if kotor is not None else git("status", "--porcelain", "--", *berkas, akar=akar).stdout.decode().strip()
    if kotor:
        return f"berkas belum di-commit atau berubah:\n{kotor}"
    c = kepala or git("rev-parse", "HEAD", akar=akar).stdout.decode().strip()
    if not c or not remote(c):
        return "HEAD belum ada di cabang remote: push dulu, baru jangkar (`git branch -r --contains HEAD` kosong)"
    h = (sekarang or dt.datetime.now(dt.timezone(dt.timedelta(hours=7)))).date().isoformat()
    json.dump({"sidik": sidik(akar, berkas), "jangkar_commit": c, "jangkar_tanggal": h, "berkas": manifes(akar, berkas)}, open(sidik_berkas, "w"), indent=1, sort_keys=True)
    return None


def uji():
    with tempfile.TemporaryDirectory() as d:
        B = ["a.txt", "b.txt"]
        for j in B:
            open(os.path.join(d, j), "w").write("x" + j)
        sb = os.path.join(d, "j4_sidik.json"); show = lambda c, j, akar=None: open(os.path.join(d, j), "rb").read()
        K = dict(akar=d, sidik_berkas=sb, berkas=B)
        assert "tidak terbaca" in periksa(**K, show=show, lel=lambda c: True, remote=lambda c: True)
        # jangkar menolak: berkas kotor, HEAD belum di remote; berhasil sekali
        assert "belum di-commit" in jangkar(**K, kepala="abc", remote=lambda c: True, kotor=" M a.txt")
        assert "belum ada di cabang remote" in jangkar(**K, kepala="abc", remote=lambda c: False, kotor="")
        assert not os.path.exists(sb)
        assert jangkar(**K, kepala="abc", remote=lambda c: True, kotor="") is None and json.load(open(sb))["jangkar_commit"] == "abc" and json.load(open(sb))["jangkar_tanggal"]
        assert "sudah dijangkar" in jangkar(**K, kepala="def", remote=lambda c: True, kotor="")
        ok = dict(K, show=show, lel=lambda c: True, remote=lambda c: True)
        assert periksa(**ok) is None
        assert "bukan leluhur" in periksa(**dict(ok, lel=lambda c: False)) and "remote" in periksa(**dict(ok, remote=lambda c: False))
        assert "commit jangkar" in periksa(**dict(ok, show=lambda c, j, akar=None: b"lain"))
        open(os.path.join(d, "b.txt"), "w").write("diubah"); g = periksa(**ok); assert "sidik beda" in g and "b.txt" in g and "a.txt" not in g
        open(os.path.join(d, "b.txt"), "w").write("xb.txt"); assert periksa(**ok) is None
        os.remove(os.path.join(d, "a.txt")); assert "hilang" in periksa(**ok)
        open(os.path.join(d, "a.txt"), "w").write("xa.txt"); json.dump({"sidik": "", "jangkar_commit": ""}, open(sb, "w")); assert "belum dijangkar" in periksa(**ok)
    assert all(os.path.exists(os.path.join(AKAR, j)) for j in BERKAS), [j for j in BERKAS if not os.path.exists(os.path.join(AKAR, j))]
    assert G + "j4_operasi.py" in BERKAS and G + "j4_medan_100m.json.gz" in BERKAS and G + "kunci_j4.py" in BERKAS and G + "PRAREG-J4.md" in BERKAS
    print("ok")


if __name__ == "__main__":
    c = sys.argv[1:2]
    if c == ["uji"]:
        uji()
    elif c == ["sidik"]:
        print(sidik())
    elif c in (["jangkar"], ["cek"]):
        g = jangkar() if c == ["jangkar"] else periksa()
        sys.exit(g or print("ok"))
    else:
        sys.exit(__doc__)
