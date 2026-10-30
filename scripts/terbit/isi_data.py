"""Situs live sebagai cadangan data terakhir.

Insiden 23 Okt 2026: cache Actions `data-` hilang, workflow memakai salinan public/data di git (12 Okt). Supaya kegagalan cache
tidak pernah membuat data mundur:
  buat   (sebelum tiap deploy) tulis public/data/_isi.json: {berkas: {jalur relatif: [ukuran, sha1]}} untuk semua berkas data
         yang ikut terbit. Daftar ini ikut tayang.
  tarik  baca LIVE/data/_isi.json, unduh dari situs live setiap berkas yang isinya berbeda dari salinan lokal, periksa sha1-nya.
         Lapisan statis yang sama dengan git tidak diunduh.
  perlu  (sesudah memulihkan cache, di tiap workflow yang menerbitkan) jalankan `tarik` HANYA bila public/data/meta.json lokal
         tidak ada atau `dibuat`-nya lebih tua dari yang tayang. Cache yang lebih baru dari live tidak pernah ditimpa.
Gagal menarik = peringatan, bukan galat: scripts/terbit/jaga_segar.py tetap menolak deploy bila data akhirnya basi.

Pakai:  python3 scripts/terbit/isi_data.py buat
        python3 scripts/terbit/isi_data.py tarik
        python3 scripts/terbit/isi_data.py perlu
        python3 scripts/terbit/isi_data.py uji
"""
import concurrent.futures as cf, datetime as dt, hashlib, json, os, sys, urllib.request

AKAR = os.path.normpath(os.path.join(os.path.dirname(__file__), "../.."))
DATA = os.path.join(AKAR, "public/data")
LIVE = os.environ.get("LIVE_URL", "https://centurisk97.terasurbannetwork.workers.dev")
NAMA = "_isi.json"
BUSTER = int(dt.datetime.now().timestamp())


def sha(jalur):
    h = hashlib.sha1()
    with open(jalur, "rb") as f:
        for blok in iter(lambda: f.read(1 << 20), b""):
            h.update(blok)
    return h.hexdigest()


def nyasar(rel):
    """salinan sinkronisasi ('x 2.json') dan berkas tersembunyi tidak ikut daftar"""
    b = os.path.basename(rel)
    return b.startswith(".") or any(f" {i}." in b for i in range(2, 10))


# Dihitung hanya di terbit.yml (butuh cache semua modul); titik/data/banjir.yml men-deploy tanpa berkas ini, jadi tanpa
# salinan dari live tiap deploy mereka menghapusnya dari situs (rapor_belajar.json 404 sesudah 30 Okt 2026).
BAWA_LIVE = ["rapor_belajar.json"]


def bawa_live(data=DATA, live=LIVE, ambil=None):
    """berkas BAWA_LIVE yang tidak ada lokal disalin dari live; isi yang bukan JSON (halaman galat) tidak ditulis"""
    for rel in BAWA_LIVE:
        p = os.path.join(data, rel)
        if os.path.exists(p):
            continue
        try:
            isi = (ambil or ambil_url)(f"{live}/data/{rel}?cek={BUSTER}", 30)
            json.loads(isi)
        except Exception as e:
            print(f"::warning title=isi_data::{rel} tidak terbawa dari live: {type(e).__name__}")
            continue
        with open(p, "wb") as f:
            f.write(isi)


def buat(data=DATA, live=LIVE, ambil=None):
    bawa_live(data, live, ambil)
    isi = {}
    for akar, _, fs in os.walk(data):
        for f in fs:
            p = os.path.join(akar, f)
            rel = os.path.relpath(p, data).replace(os.sep, "/")
            if rel == NAMA or nyasar(rel):
                continue
            isi[rel] = [os.path.getsize(p), sha(p)]
    json.dump({"dibuat": dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds"), "berkas": isi},
              open(os.path.join(data, NAMA), "w"), separators=(",", ":"))
    return len(isi)


def aman(rel):
    """jalur dari jaringan: hanya relatif di bawah public/data, tanpa '..', tanpa jalur mutlak"""
    return isinstance(rel, str) and rel and not rel.startswith(("/", "\\")) and ".." not in rel.replace("\\", "/").split("/") \
        and ":" not in rel and not nyasar(rel)


def ambil_url(url, batas=120):
    req = urllib.request.Request(url, headers={"User-Agent": "poskokarhutla-ci/isi_data"})
    with urllib.request.urlopen(req, timeout=batas) as r:
        return r.read()


def tarik(data=DATA, live=LIVE, ambil=ambil_url, paralel=16):
    """-> (diunduh, sama, gagal). Tidak pernah menimpa berkas lokal dengan isi yang sha1-nya tidak cocok."""
    try:
        daftar = json.loads(ambil(f"{live}/data/{NAMA}?cek={BUSTER}"))["berkas"]
    except Exception as e:  # noqa: BLE001 (cadangan: gagal = peringatan)
        print(f"::warning title=Cadangan live::daftar isi live tidak terbaca ({type(e).__name__}); data tetap dari cache/git")
        return 0, 0, -1
    perlu, sama = [], 0
    for rel, (ukuran, h) in daftar.items():
        if not aman(rel):
            continue
        p = os.path.join(data, rel)
        if os.path.exists(p) and os.path.getsize(p) == ukuran and sha(p) == h:
            sama += 1
        else:
            perlu.append((rel, h))

    def satu(item):
        rel, h = item
        try:
            isi = ambil(f"{live}/data/{rel}?cek={BUSTER}")   # lewati salinan CDN 5 menit; isi dicocokkan sha1
        except Exception:  # noqa: BLE001
            return False
        if hashlib.sha1(isi).hexdigest() != h:
            return False
        p = os.path.join(data, rel)
        os.makedirs(os.path.dirname(p), exist_ok=True)
        tmp = p + ".tarik"
        with open(tmp, "wb") as f:
            f.write(isi)
        os.replace(tmp, p)
        return True

    with cf.ThreadPoolExecutor(paralel) as ex:
        hasil = list(ex.map(satu, perlu))
    ok, gagal = sum(hasil), len(hasil) - sum(hasil)
    print(f"cadangan live: {ok} berkas diunduh, {sama} sama dengan lokal, {gagal} gagal")
    if gagal:
        print(f"::warning title=Cadangan live::{gagal} berkas gagal diunduh/tidak cocok sha1; salinan lokal dipakai untuk berkas itu")
    return ok, sama, gagal


def dibuat(isi):
    t = dt.datetime.fromisoformat(json.loads(isi)["dibuat"].replace("Z", "+00:00"))
    return t if t.tzinfo else t.replace(tzinfo=dt.timezone.utc)


def perlu(data=DATA, live=LIVE, ambil=ambil_url):
    """tarik() hanya bila data lokal tidak ada atau lebih tua dari yang tayang. -> True bila menarik."""
    try:
        t_live = dibuat(ambil(f"{live}/data/meta.json?cek={int(dt.datetime.now().timestamp())}"))
    except Exception as e:  # noqa: BLE001
        print(f"::warning title=Cadangan live::meta.json live tidak terbaca ({type(e).__name__}); data tetap dari cache/git")
        return False
    try:
        t_lokal = dibuat(open(os.path.join(data, "meta.json"), "rb").read())
    except (OSError, ValueError, KeyError):
        t_lokal = None
    if t_lokal is not None and t_lokal >= t_live:
        print(f"data lokal ({t_lokal.isoformat()}) tidak lebih tua dari yang tayang ({t_live.isoformat()}): cadangan tidak dipakai")
        return False
    print(f"data lokal {'tidak ada' if t_lokal is None else t_lokal.isoformat()} < tayang {t_live.isoformat()}: tarik dari situs live")
    tarik(data, live, ambil)
    return True


def uji():
    import tempfile
    d = tempfile.mkdtemp()
    tulis = lambda rel, isi: (os.makedirs(os.path.dirname(os.path.join(d, rel)), exist_ok=True), open(os.path.join(d, rel), "wb").write(isi))
    tulis("meta.json", b'{"dibuat":"12 Okt"}')
    tulis("lahan/gambut.geojson", b"STATIS")
    tulis("riwayat_sel/1_1 2.json", b"nyasar")
    def tak_ada(url, batas=0):
        raise OSError("404")
    assert buat(d, "http://live", tak_ada) == 2, "salinan nyasar tidak boleh masuk daftar"
    # rapor_belajar.json yang tidak ada lokal dibawa dari live; halaman galat (bukan JSON) tidak ditulis; lokal tidak ditimpa
    assert buat(d, "http://live", lambda url, batas=0: b"<html>404</html>") == 2
    assert buat(d, "http://live", lambda url, batas=0: b'{"model":[]}') == 3
    assert buat(d, "http://live", lambda url, batas=0: b'{"model":["lama"]}') == 3
    assert open(os.path.join(d, "rapor_belajar.json"), "rb").read() == b'{"model":[]}', "salinan lokal tertimpa live"
    os.remove(os.path.join(d, "rapor_belajar.json"))
    # situs live: meta lebih baru, lapisan statis sama, satu berkas rusak, satu jalur jahat
    live = {"meta.json": b'{"dibuat":"23 Okt"}', "lahan/gambut.geojson": b"STATIS", "kluster.json": b"[1,2]", "rusak.json": b"isi-asli"}
    daftar = {k: [len(v), hashlib.sha1(v).hexdigest()] for k, v in live.items()}
    daftar["../../etc/passwd"] = [1, "0" * 40]
    daftar["/mutlak.json"] = [1, "0" * 40]
    live["rusak.json"] = b"isi-berubah-di-jalan"   # sha1 tidak cocok -> DITOLAK

    def ambil(url):
        rel = url.split("/data/", 1)[1].split("?")[0]
        if rel == NAMA:
            return json.dumps({"berkas": daftar}).encode()
        return live[rel]
    ok, sama, gagal = tarik(d, "http://live", ambil, paralel=2)
    assert (ok, sama, gagal) == (2, 1, 1), (ok, sama, gagal)
    assert open(os.path.join(d, "meta.json"), "rb").read() == b'{"dibuat":"23 Okt"}'
    assert not os.path.exists(os.path.join(d, "rusak.json")), "isi yang sha1-nya tidak cocok tidak boleh ditulis"
    assert not os.path.exists(os.path.join(os.path.dirname(d), "etc")), "jalur '..' harus ditolak"
    # live tidak terjangkau: peringatan, bukan galat
    def mati(url):
        raise OSError("tak terjangkau")
    assert tarik(d, "http://live", mati) == (0, 0, -1)
    # perlu(): lokal lebih baru dari live -> TIDAK menarik (cache baru tidak boleh ditimpa data live lama)
    tulis("meta.json", b'{"dibuat":"2026-10-23T16:00+07:00"}')
    lv = {"meta.json": b'{"dibuat":"2026-10-23T13:00+07:00"}'}
    daftar.clear(); daftar.update({k: [len(v), hashlib.sha1(v).hexdigest()] for k, v in lv.items()})
    live.clear(); live.update(lv)
    ambil2 = lambda url: ambil(url.split("?")[0])
    assert perlu(d, "http://live", ambil2) is False
    assert open(os.path.join(d, "meta.json"), "rb").read() == b'{"dibuat":"2026-10-23T16:00+07:00"}'
    # lokal lebih tua -> menarik
    tulis("meta.json", b'{"dibuat":"2026-10-12T21:45+07:00"}')
    assert perlu(d, "http://live", ambil2) is True
    assert open(os.path.join(d, "meta.json"), "rb").read() == lv["meta.json"]
    print("ok")


if __name__ == "__main__":
    a = sys.argv[1:]
    if a == ["uji"]:
        uji()
    elif a == ["buat"]:
        print(f"_isi.json: {buat()} berkas")
    elif a == ["tarik"]:
        tarik()
    elif a == ["perlu"]:
        perlu()
    else:
        sys.exit(__doc__)
