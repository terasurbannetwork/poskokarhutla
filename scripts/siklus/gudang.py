"""Gudang R2 Siklus: put/get/hapus lewat biner wrangler@4.42.0 (dipasang sekali per job) atau folder (--lokal).

Daftar objek dibaca dari siklus/saji/manifest.json (wrangler 4.42.0 tidak punya daftar objek). Hanya berkas yang sidiknya
berubah diunggah, manifest diunggah paling akhir. Unggah di atas anggaran ditolak dengan laporan; t_L dari manifest, bukan pindai R2.
Tiga lapis: mentah hanya tambah, bersih dan saji ditulis ulang utuh.
Pakai: python3 -I scripts/siklus/gudang.py sinkron SRC (--lokal DIR | --wrangler BIN [--bucket B]) | ls ... | uji
"""
import concurrent.futures as cf, datetime as dt, hashlib, importlib.util, json, os, shutil, subprocess, sys, tempfile

AB = os.path.dirname(os.path.abspath(__file__))
AKAR = os.path.normpath(os.path.join(AB, "../.."))
MANIFEST = "siklus/saji/manifest.json"
ANGGARAN = "siklus/saji/anggaran.json"
PENGELOLA = (MANIFEST, ANGGARAN)
LAPIS = ("mentah", "bersih", "saji")
BUCKET = "poskokarhutla-foto"
PARALEL = 8


def sidik(isi):
    """Isi bytes, atau jalur berkas. JSON: kanonik (kunci terurut, tanpa spasi, UTF-8 tanpa lolos ASCII)."""
    if isinstance(isi, str):
        jalur = isi
        isi = open(jalur, "rb").read()
        if jalur.endswith(".json"):
            try:
                isi = json.dumps(json.loads(isi), sort_keys=True, separators=(",", ":"), ensure_ascii=False).encode("utf-8")
            except ValueError:
                pass
    return hashlib.sha256(isi).hexdigest()


class Lokal:
    def __init__(self, akar):
        self.akar = akar

    def _j(self, kunci):
        return os.path.join(self.akar, *kunci.split("/"))

    def put(self, kunci, jalur):
        os.makedirs(os.path.dirname(self._j(kunci)), exist_ok=True)
        shutil.copyfile(jalur, self._j(kunci))

    def get(self, kunci):
        j = self._j(kunci)
        return open(j, "rb").read() if os.path.exists(j) else None

    def hapus(self, kunci):
        if os.path.exists(self._j(kunci)):
            os.remove(self._j(kunci))


class Wrangler:
    def __init__(self, biner, bucket=BUCKET):
        self.biner, self.bucket = biner, bucket

    def _r2(self, aksi, kunci, *lebih):
        return subprocess.run([self.biner, "r2", "object", aksi, f"{self.bucket}/{kunci}", *lebih, "--remote"],
                              capture_output=True, text=True)

    def put(self, kunci, jalur):
        r = self._r2("put", kunci, "--file", jalur)
        if r.returncode:
            raise RuntimeError(f"put {kunci}: {r.stderr.strip()[:300]}")

    def get(self, kunci):
        with tempfile.TemporaryDirectory() as d:
            j = os.path.join(d, "o")
            r = self._r2("get", kunci, "--file", j)
            return open(j, "rb").read() if r.returncode == 0 and os.path.exists(j) else None

    def hapus(self, kunci):
        self._r2("delete", kunci)


def pasang_wrangler(dir_):
    subprocess.run(["npm", "i", "--prefix", dir_, "wrangler@4.42.0"], check=True)
    return os.path.join(dir_, "node_modules", ".bin", "wrangler")


def lapis_dari(kunci):
    p = kunci.split("/")
    if len(p) < 3 or p[0] != "siklus" or p[1] not in LAPIS:
        raise ValueError(f"kunci di luar siklus/{{mentah,bersih,saji}}/: {kunci}")
    return p[1]


def baca_manifest(be):
    b = be.get(MANIFEST)
    return json.loads(b) if b else {"v": 1, "berkas": [], "lapis": {}, "total_byte": 0}


def ls(be):
    return [x["kunci"] for x in baca_manifest(be)["berkas"]]


def anggaran_sumber():
    s = importlib.util.spec_from_file_location("registri", os.path.join(AB, "registri.py"))
    m = importlib.util.module_from_spec(s)
    s.loader.exec_module(m)
    return m.muat()["anggaran"]


def cek_anggaran(lapis, berkas, u, t_L, a_L, u_lama=0):
    """-> None bila diterima, laporan penolakan bila t_L + u - u_lama > a_L."""
    lebih = t_L + u - u_lama - a_L
    return None if lebih <= 0 else {"lapis": lapis, "berkas": berkas, "u": u, "t_L": t_L, "a_L": a_L, "kelebihan": lebih}


def _terpakai(entri):
    t = {L: 0 for L in LAPIS}
    for x in entri.values():
        t[lapis_dari(x["kunci"])] += x["byte"]
    return t


def rencana(src, entri, a_lapis):
    """-> (daftar unggah [(kunci, jalur, sidik, byte)], dilewati {kunci: alasan}, penolakan [laporan])."""
    unggah, lewat, tolak = [], {}, []
    t = _terpakai(entri)
    terbaru_mentah = {}
    for k, x in sorted(entri.items()):
        p = k.split("/")
        if p[1] == "mentah":
            terbaru_mentah[p[2]] = x["sha256"]
    for dasar, _, nama in sorted(os.walk(src)):
        for n in sorted(nama):
            j = os.path.join(dasar, n)
            k = os.path.relpath(j, src).replace(os.sep, "/")
            L = lapis_dari(k)
            if k in PENGELOLA:
                continue
            sd, by = sidik(j), os.path.getsize(j)
            lama = entri.get(k)
            if L == "mentah":
                if lama:
                    if lama["sha256"] != sd:
                        raise ValueError(f"mentah hanya tambah, isi berbeda untuk kunci yang sama: {k}")
                    lewat[k] = "tak_berubah"
                    continue
                if terbaru_mentah.get(k.split("/")[2]) == sd:
                    lewat[k] = "tak_berubah"
                    continue
            elif lama and lama["sha256"] == sd:
                lewat[k] = "tak_berubah"
                continue
            u_lama = lama["byte"] if lama else 0
            lap = cek_anggaran(L, k, by, t[L], a_lapis[L], u_lama)
            if lap:
                tolak.append(lap)
                continue
            t[L] += by - u_lama
            unggah.append((k, j, sd, by))
    return unggah, lewat, tolak


def selubung(jenis, isi):
    return {"v": 1, "jenis": jenis, "dibuat": dt.datetime.now(dt.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
            "sumber": [{"id": "pipeline-siklus", "diambil": dt.date.today().isoformat(), "lisensi": "internal"}],
            "yakin": "terverifikasi", **isi}


def bangun_manifest(entri, maks):
    t = _terpakai(entri)
    return selubung("manifest", {"berkas": sorted(entri.values(), key=lambda x: x["kunci"]),
            "lapis": {L: {"byte": t[L], "maks": maks["lapis"][L]} for L in LAPIS},
            "total_byte": sum(t.values()), "maks_byte": maks["plafon_byte"]})


def bangun_anggaran(manifest, maks, n_public=None):
    return selubung("anggaran", {"lapis": manifest["lapis"], "total_byte": manifest["total_byte"], "maks_byte": manifest["maks_byte"],
                                 "fitur": maks["fitur"], "berkas_public": {"n": n_public, "maks": maks["berkas_public_maks"]}})


def n_public():
    r = subprocess.run(["git", "ls-files", "public/siklus"], cwd=AKAR, capture_output=True, text=True)
    return len(r.stdout.split()) if r.returncode == 0 else None


def sinkron(src, be, maks=None, public=None):
    """Unggah hanya yang berubah; anggaran.json lalu manifest paling akhir. -> {'diunggah','dilewati','ditolak'}."""
    maks = maks or anggaran_sumber()
    entri = {x["kunci"]: x for x in baca_manifest(be)["berkas"]}
    unggah, lewat, tolak = rencana(src, entri, maks["lapis"])
    if tolak:
        return {"diunggah": [], "dilewati": lewat, "ditolak": tolak}
    with cf.ThreadPoolExecutor(PARALEL) as ex:
        list(ex.map(lambda x: be.put(x[0], x[1]), unggah))
    for k, _, sd, by in unggah:
        entri[k] = {"kunci": k, "byte": by, "sha256": sd}
    if unggah:
        m = bangun_manifest(entri, maks)
        with tempfile.TemporaryDirectory() as d:
            for kunci, isi in ((ANGGARAN, bangun_anggaran(m, maks, public)), (MANIFEST, m)):
                j = os.path.join(d, "o.json")
                json.dump(isi, open(j, "w"), ensure_ascii=False, sort_keys=True)
                be.put(kunci, j)
    return {"diunggah": [x[0] for x in unggah], "dilewati": lewat, "ditolak": []}


def hapus(be, kunci):
    lapis_dari(kunci)
    be.hapus(kunci)
    m = baca_manifest(be)
    maks = anggaran_sumber()
    entri = {x["kunci"]: x for x in m["berkas"] if x["kunci"] != kunci}
    with tempfile.TemporaryDirectory() as d:
        j = os.path.join(d, "m.json")
        json.dump(bangun_manifest(entri, maks), open(j, "w"), ensure_ascii=False, sort_keys=True)
        be.put(MANIFEST, j)


def _uji():
    assert sidik(b"abc") == "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"
    MB = 1_000_000
    assert cek_anggaran("saji", "a", 15 * MB, 90 * MB, 100 * MB) == {
        "lapis": "saji", "berkas": "a", "u": 15 * MB, "t_L": 90 * MB, "a_L": 100 * MB, "kelebihan": 5 * MB}
    assert cek_anggaran("saji", "a", 10 * MB, 90 * MB, 100 * MB) is None
    assert cek_anggaran("saji", "a", 12 * MB, 90 * MB, 100 * MB, u_lama=8 * MB) is None
    maks = {"plafon_byte": 1000, "lapis": {"mentah": 300, "bersih": 300, "saji": 300}, "fitur": {"F1": "menunggu"}, "berkas_public_maks": 200}

    with tempfile.TemporaryDirectory() as d:
        a, b = os.path.join(d, "a.json"), os.path.join(d, "b.json")
        open(a, "w").write('{"b":1,"a":2}')
        open(b, "w").write('{\n "a": 2, "b": 1}')
        assert sidik(a) == sidik(b) == hashlib.sha256(b'{"a":2,"b":1}').hexdigest()

        def tulis(root, kunci, isi):
            j = os.path.join(root, *kunci.split("/"))
            os.makedirs(os.path.dirname(j), exist_ok=True)
            open(j, "w").write(isi)

        src, gud = os.path.join(d, "src"), os.path.join(d, "gudang")
        be = Lokal(gud)
        tulis(src, "siklus/saji/x.json", '{"a":1}')
        tulis(src, "siklus/bersih/k/2026.jsonl.gz", "bbb")
        tulis(src, "siklus/mentah/dibi/2026/2026-11-01.json", '{"n":1}')
        r = sinkron(src, be, maks)
        assert len(r["diunggah"]) == 3 and not r["ditolak"]
        m = baca_manifest(be)
        assert m["total_byte"] == sum(x["byte"] for x in m["berkas"]) and m["maks_byte"] == 1000
        assert sorted(ls(be)) == sorted(r["diunggah"]) and be.get(ANGGARAN)
        r = sinkron(src, be, maks)
        assert r["diunggah"] == [] and set(r["dilewati"].values()) == {"tak_berubah"}
        tulis(src, "siklus/saji/x.json", '{"a":2}')
        assert sinkron(src, be, maks)["diunggah"] == ["siklus/saji/x.json"]
        tulis(src, "siklus/mentah/dibi/2026/2026-11-02.json", '{"n":1}')
        r = sinkron(src, be, maks)
        assert r["diunggah"] == [] and r["dilewati"]["siklus/mentah/dibi/2026/2026-11-02.json"] == "tak_berubah"
        tulis(src, "siklus/mentah/dibi/2026/2026-11-03.json", '{"n":2}')
        assert sinkron(src, be, maks)["diunggah"] == ["siklus/mentah/dibi/2026/2026-11-03.json"]
        tulis(src, "siklus/mentah/dibi/2026/2026-11-01.json", '{"n":9}')
        try:
            sinkron(src, be, maks)
            raise AssertionError("mentah tidak boleh ditimpa")
        except ValueError:
            pass
        tulis(src, "siklus/mentah/dibi/2026/2026-11-01.json", '{"n":1}')
        tulis(src, "siklus/saji/besar.bin", "x" * 400)
        m0 = open(os.path.join(gud, *MANIFEST.split("/"))).read()
        r = sinkron(src, be, maks)
        assert r["diunggah"] == [] and r["ditolak"][0]["lapis"] == "saji" and r["ditolak"][0]["kelebihan"] > 0
        assert open(os.path.join(gud, *MANIFEST.split("/"))).read() == m0 and be.get("siklus/saji/besar.bin") is None
        try:
            lapis_dari("bangunan/grid_33.json")
            raise AssertionError("kunci bangunan/ tidak boleh disentuh")
        except ValueError:
            pass

        os.remove(os.path.join(src, "siklus", "saji", "besar.bin"))
        fake = os.path.join(d, "wrangler")
        open(fake, "w").write(
            "#!/usr/bin/env python3\nimport sys,os,shutil\na=sys.argv[1:]\n"
            f"open({os.path.join(d, 'log')!r},'a').write(' '.join(a)+'\\n')\n"
            f"o=os.path.join({os.path.join(d, 'r2')!r},*a[3].split('/')[1:])\n"
            "f=a[a.index('--file')+1] if '--file' in a else None\n"
            "if a[2]=='put': os.makedirs(os.path.dirname(o),exist_ok=True); shutil.copyfile(f,o)\n"
            "elif a[2]=='get':\n"
            "    if not os.path.exists(o): sys.exit(1)\n"
            "    shutil.copyfile(o,f)\n"
            "elif a[2]=='delete' and os.path.exists(o): os.remove(o)\n")
        os.chmod(fake, 0o755)
        wb = Wrangler(fake, "bkt")
        sinkron(src, wb, maks)
        log = open(os.path.join(d, "log")).read().splitlines()
        assert all(x.startswith("r2 object ") and x.endswith("--remote") for x in log)
        assert not any(" list" in x or "bulk" in x for x in log), "wrangler 4.42.0 tidak punya daftar objek"
        assert log[-1].startswith("r2 object put bkt/" + MANIFEST), log[-3:]
        assert sum(MANIFEST in x for x in log if " put " in x) == 1
        n = len(log)
        sinkron(src, wb, maks)
        log = open(os.path.join(d, "log")).read().splitlines()
        assert [x for x in log[n:] if " put " in x] == []
        hapus(wb, "siklus/saji/x.json")
        assert "siklus/saji/x.json" not in ls(wb)
    print("gudang: uji hijau")


if __name__ == "__main__":
    a = sys.argv[1:]
    if a[:1] == ["uji"]:
        _uji()
    elif a[:1] in (["sinkron"], ["ls"]):
        be = Lokal(a[a.index("--lokal") + 1]) if "--lokal" in a else Wrangler(a[a.index("--wrangler") + 1], a[a.index("--bucket") + 1] if "--bucket" in a else BUCKET)
        if a[0] == "ls":
            print("\n".join(ls(be)))
        else:
            r = sinkron(a[1], be, public=n_public())
            print(json.dumps(r, ensure_ascii=False, indent=1))
            sys.exit(1 if r["ditolak"] else 0)
    else:
        sys.exit("pakai: gudang.py sinkron SRC (--lokal DIR | --wrangler BIN [--bucket B]) | ls ... | uji")
