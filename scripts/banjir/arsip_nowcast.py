"""Arsip prospektif nowcast bandang ke R2 (PRAREG-BANDANG §5): tiap fitur_<UTC>.json hasil `nowcast_bandang.py tarik`
diunggah gzip ke arsip/nowcast_bandang/YYYY/MM/DD/<HH>Z.json.gz beserta sha256-nya. Objek yang sudah ada TIDAK ditimpa:
isi sama = dilewati, isi beda = peringatan (arsip harus tak berubah sejak unggahan pertama).

  arsip_nowcast.py         unggah semua fitur_*.json di data/raw/banjir/nowcast_bandang
  arsip_nowcast.py uji     self-check tanpa jaringan
Tanpa CLOUDFLARE_API_TOKEN/CLOUDFLARE_ACCOUNT_ID: dilewati, keluar 0. Gagal unggah: keluar 1 (run merah, jam itu hilang dari arsip).
"""
import gzip, hashlib, os, re, sys, tempfile

D = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, D)
import arsip_pos as A

DIR = os.path.join(A.AKAR, "data/raw/banjir/nowcast_bandang")
POLA = re.compile(r"^fitur_(\d{4})(\d\d)(\d\d)T(\d\d)Z\.json$")


def kunci(nama):
    m = POLA.match(nama)
    return None if not m else "arsip/nowcast_bandang/{}/{}/{}/{}Z.json.gz".format(*m.groups())


def gz(b):
    return gzip.compress(b, mtime=0)          # mtime=0: gzip deterministik, sha sama untuk isi sama


def unggah_satu(p, r2=A.r2):
    """-> "baru" / "sama" / "beda". Galat jaringan/izin = RuntimeError."""
    k = kunci(os.path.basename(p))
    isi = gz(open(p, "rb").read())
    with tempfile.TemporaryDirectory() as t:
        lama = os.path.join(t, "lama.gz")
        r = r2("get", f"{A.BUCKET}/{k}", "--file", lama)
        if r.returncode == 0:
            return "sama" if open(lama, "rb").read() == isi else "beda"
        if not A.tidak_ada(r):
            raise RuntimeError("r2 get gagal: " + A.bersih(r.stderr[-200:]))
        baru = os.path.join(t, "baru.gz")
        open(baru, "wb").write(isi)
        r = r2("put", f"{A.BUCKET}/{k}", "--file", baru, "--content-type", "application/gzip")
        if r.returncode:
            raise RuntimeError("r2 put gagal: " + A.bersih(r.stderr[-200:]))
        sha = os.path.join(t, "sha")
        open(sha, "w").write(hashlib.sha256(isi).hexdigest() + "\n")
        r = r2("put", f"{A.BUCKET}/{k}.sha256", "--file", sha, "--content-type", "text/plain")
        if r.returncode:
            raise RuntimeError("r2 put sha gagal: " + A.bersih(r.stderr[-200:]))
    return "baru"


def jalan():
    if not (os.environ.get("CLOUDFLARE_API_TOKEN") and os.environ.get("CLOUDFLARE_ACCOUNT_ID")):
        print("arsip_nowcast: kredensial Cloudflare tidak ada, dilewati")
        return 0
    fs = sorted(f for f in os.listdir(DIR) if kunci(f)) if os.path.isdir(DIR) else []
    if not fs:
        print("arsip_nowcast: tidak ada fitur_*.json (tarik dilewati/gagal)")
        return 0
    for f in fs:
        try:
            h = unggah_satu(os.path.join(DIR, f))
        except RuntimeError as e:
            print(f"::error title=Arsip nowcast bandang::{kunci(f)}: {e}")
            return 1
        if h == "beda":
            print(f"::warning title=Arsip nowcast beda::{kunci(f)} sudah ada dengan isi BEDA; tidak ditimpa")
        print(f"arsip_nowcast: {kunci(f)} {h}")
    return 0


def uji():
    assert kunci("fitur_20261103T05Z.json") == "arsip/nowcast_bandang/2026/11/03/05Z.json.gz"
    assert kunci("fitur_2026113T05Z.json") is None and kunci("lain.json") is None
    assert gz(b"x") == gz(b"x")
    simpan, log = {}, []

    class R:
        def __init__(s, rc, err=""):
            s.returncode, s.stderr, s.stdout = rc, err, ""

    def r2(op, k, _f, path, *a):
        log.append((op, k))
        if op == "get":
            if k not in simpan:
                return R(1, "The specified key does not exist.")
            open(path, "wb").write(simpan[k])
            return R(0)
        simpan[k] = open(path, "rb").read()
        return R(0)

    with tempfile.TemporaryDirectory() as t:
        p = os.path.join(t, "fitur_20261103T05Z.json")
        open(p, "w").write('{"a":1}')
        assert unggah_satu(p, r2) == "baru" and len(simpan) == 2                     # data + .sha256
        k = f'{A.BUCKET}/{kunci("fitur_20261103T05Z.json")}'
        assert simpan[k + ".sha256"].decode().strip() == hashlib.sha256(simpan[k]).hexdigest()
        n = len(log)
        assert unggah_satu(p, r2) == "sama" and [o for o, _ in log[n:]] == ["get"]   # tidak ada put ulang
        open(p, "w").write('{"a":2}')
        assert unggah_satu(p, r2) == "beda" and gzip.decompress(simpan[k]) == b'{"a":1}'   # tidak ditimpa
        try:
            unggah_satu(p, lambda *a: R(1, "network down"))
            assert False
        except RuntimeError:
            pass
    print("ok arsip_nowcast")


if __name__ == "__main__":
    sys.exit(uji() if sys.argv[1:] == ["uji"] else jalan())
