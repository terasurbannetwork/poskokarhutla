#!/usr/bin/env python3
"""Korpus OpenAlex per pakar untuk pencocokan Kemitraan Kampus (ALG §4.1, DT §7.2, KM-C06).
<= 25 karya per pakar (15 sitasi tertinggi + 10 terbaru >= 2018), abstrak dibalik dari inverted index.
Keluaran DATA PAKAR: hanya ke --keluar (di luar repo/public) atau R2 `kemitraan/korpus/<angka id % 64>.json`;
modul ini menolak --keluar di dalam public/ atau data/ yang dilacak git. Cicil + lanjut: `_status.json`.
Kunci API dari env OPENALEX_KEY (tak pernah dicetak). Laju <= 8 req/dtk, coba ulang 4x eksponensial.
Pakai: python3 -I scripts/kemitraan/korpus.py --induk induk.json --keluar DIR [--maks N] [--detik S] [--segar HARI] | --r2 | --cek"""
import datetime, email.utils, http.client, json, math, os, re, subprocess, sys, tempfile, time, urllib.parse, urllib.request, urllib.error

AKAR = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".."))
sys.path.insert(0, os.path.join(AKAR, "scripts", "kemitraan"))
from konst import KONST  # noqa: E402

PK = KONST["PAKAR"]
API = "https://api.openalex.org/works"
UA = "Centurisk97-BNPB-kemitraan/1.0 (mailto:terasurbannetwork@gmail.com)"
BUCKET = "poskokarhutla-foto"
PECAHAN = 64
LAJU_DETIK = 0.13          # 1/0.13 = 7,7 req/dtk (<= 8)
ULANG = 4
SELECT = "id,title,display_name,abstract_inverted_index,publication_year,doi,primary_location,cited_by_count,topics"
RE_ID = re.compile(r"^A\d{4,12}$")
ABSTRAK_MAKS = 3000
KARYA_KUNCI = ("id", "judul", "abstrak", "tahun", "doi", "terbitan", "sitasi", "topik")


RETRY_AFTER_MAKS = 60      # detik; lebih lama dari ini = berhenti, lanjutkan di jalan berikutnya
GAGAL_BERUNTUN = 4         # pakar gagal berturut-turut (5xx/jaringan) sebelum seluruh jalan berhenti


class Berhenti(Exception):
    """Gangguan GLOBAL (429 menetap, 401/403, Retry-After panjang): hentikan, simpan, lanjutkan di jalan berikutnya."""


class Sementara(Exception):
    """5xx/jaringan/jawaban rusak menetap untuk SATU pakar: catat gagal, lanjut ke pakar berikutnya."""


# ---------------------------------------------------------------- murni
def balik_abstrak(inv):
    """abstract_inverted_index {kata: [posisi]} -> teks urut posisi; kosong/None -> ''."""
    if not isinstance(inv, dict):
        return ""
    ps = [(p, k) for k, v in inv.items() if isinstance(v, list) for p in v if isinstance(p, int)]
    return " ".join(k for _, k in sorted(ps))


def ringkas_karya(w):
    """satu objek works OpenAlex -> karya ringkas; tanpa judul -> None."""
    judul = (w.get("title") or w.get("display_name") or "").strip()
    if not judul:
        return None
    src = ((w.get("primary_location") or {}).get("source") or {}).get("display_name") or ""
    topik = [t.get("display_name") for t in (w.get("topics") or []) if isinstance(t, dict) and t.get("display_name")][:5]
    return {"id": str(w.get("id") or "").rsplit("/", 1)[-1], "judul": judul[:400], "abstrak": balik_abstrak(w.get("abstract_inverted_index"))[:ABSTRAK_MAKS],
            "tahun": w.get("publication_year"), "doi": w.get("doi") if str(w.get("doi") or "").startswith("https://") else None,
            "terbitan": src[:160], "sitasi": w.get("cited_by_count") or 0, "topik": topik}


def pilih(teratas, terbaru, maks=None):
    """15 sitasi tertinggi + sampai 10 terbaru (tanpa duplikat), total <= maks (25). Daftar sudah berurut dari API."""
    maks = maks or PK["KORPUS_KARYA"]
    out, ada = [], set()
    for k in teratas[:PK["KORPUS_SITASI"]]:
        if k and k["id"] not in ada:
            out.append(k); ada.add(k["id"])
    n_baru = 0
    for k in terbaru:
        if n_baru >= PK["KORPUS_BARU"] or len(out) >= maks:
            break
        if k and k["id"] not in ada:
            out.append(k); ada.add(k["id"]); n_baru += 1
    return out[:maks]


def pecahan(id_a):
    return int(id_a[1:]) % PECAHAN


def url_karya(id_a, urut, per, baru, kunci):
    f = f"author.id:{id_a},is_paratext:false" + (f",from_publication_date:{PK['KORPUS_TAHUN']}-01-01" if baru else "")
    q = {"filter": f, "sort": urut, "per-page": per, "select": SELECT}
    if kunci:
        q["api_key"] = kunci
    return API + "?" + urllib.parse.urlencode(q)


def aman(teks, kunci):
    return teks.replace(kunci, "***") if kunci else teks


# ---------------------------------------------------------------- jaringan
class Laju:
    def __init__(self, tidur=time.sleep, jam=time.monotonic):
        self.t, self.tidur, self.jam = 0.0, tidur, jam

    def tunggu(self):
        d = self.t + LAJU_DETIK - self.jam()
        if d > 0:
            self.tidur(d)
        self.t = self.jam()


def retry_after(v, kini=None):
    """Header Retry-After: detik (angka) atau HTTP-date -> detik >= 0; tak terbaca -> 0."""
    v = (v or "").strip()
    if v.isdigit():
        return int(v)
    try:
        t = email.utils.parsedate_to_datetime(v)
        return max(0, math.ceil(t.timestamp() - (kini if kini is not None else time.time())))
    except (TypeError, ValueError, IndexError):
        return 0


def ambil_http(url):
    """-> (kode, dict|None, retry_after_detik). Galat jaringan (termasuk IncompleteRead) -> kode 0."""
    try:
        with urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": UA}), timeout=30) as r:
            return r.status, json.load(r), 0
    except urllib.error.HTTPError as e:
        return e.code, None, retry_after(e.headers.get("Retry-After", "") if e.headers else "")
    except (urllib.error.URLError, http.client.HTTPException, TimeoutError, ValueError, OSError):
        return 0, None, 0


def dapat(url, ambil, laju, tidur=time.sleep):
    """Satu permintaan dengan coba ulang ULANG kali (1,2,4,8 dtk atau Retry-After <= 60). 200 wajib memuat daftar `results`.
    401/403 = Berhenti (kunci/izin, global); Retry-After > 60 = Berhenti; 4xx lain = ValueError (pakar ini dilewati);
    429 menetap = Berhenti; 5xx/jaringan/jawaban rusak menetap = Sementara (pakar ini saja)."""
    for i in range(ULANG + 1):
        laju.tunggu()
        kode, js, ra = ambil(url)
        if kode == 200 and isinstance(js, dict) and isinstance(js.get("results"), list):
            return js
        if kode in (401, 403):
            raise Berhenti(f"OpenAlex menolak kunci/izin (HTTP {kode})")
        if ra > RETRY_AFTER_MAKS:
            raise Berhenti(f"OpenAlex minta menunggu {ra} dtk (> {RETRY_AFTER_MAKS})")
        if kode not in (0, 200, 429) and not 500 <= kode < 600:
            raise ValueError(f"HTTP {kode}")
        if i < ULANG:
            tidur(max(ra, 2 ** i))
    if kode == 429:
        raise Berhenti(f"OpenAlex 429 menetap setelah {ULANG} ulangan")
    raise Sementara(f"OpenAlex tak menjawab sehat setelah {ULANG} ulangan (kode terakhir {kode})")


def karya_pakar(id_a, ambil, laju, kunci, tidur=time.sleep):
    a = dapat(url_karya(id_a, "cited_by_count:desc", PK["KORPUS_SITASI"], False, kunci), ambil, laju, tidur)
    b = dapat(url_karya(id_a, "publication_date:desc", PK["KORPUS_KARYA"], True, kunci), ambil, laju, tidur)
    return pilih([ringkas_karya(w) for w in a["results"] if isinstance(w, dict)], [ringkas_karya(w) for w in b["results"] if isinstance(w, dict)])


# ---------------------------------------------------------------- penyimpanan
def jaga_keluar(d):
    """Data pakar tidak boleh mendarat di mana pun di bawah repo kecuali data/raw/kemitraan/ (diabaikan git); di luar repo (temp) boleh."""
    akar, r = os.path.realpath(AKAR), os.path.realpath(d)
    if r == akar or r.startswith(akar + os.sep):
        boleh = os.path.join(akar, "data", "raw", "kemitraan")
        if r == boleh or r.startswith(boleh + os.sep):
            return
        raise SystemExit(f"--keluar {d} berada di dalam repo: data pakar tidak boleh masuk repo (boleh: data/raw/kemitraan atau di luar repo)")


def wrangler(*a):
    """-> (returncode, stderr+stdout)."""
    r = subprocess.run(["npx", "wrangler", "r2", "object", *a, "--remote"], capture_output=True, text=True, cwd=AKAR)
    return r.returncode, (r.stderr or "") + (r.stdout or "")


RE_TAK_ADA = re.compile(r"does not exist|NoSuchKey|10007|not found", re.I)


def r2_ambil(kunci, path):
    """True = terunduh; False = kunci memang belum ada. Gagal lain (jaringan, izin) = SystemExit SEBELUM menyentuh OpenAlex,
    supaya jalan tidak mengira R2 kosong lalu menimpanya dengan data sebagian."""
    rc, ke = wrangler("get", f"{BUCKET}/{kunci}", "--file", path)
    if rc == 0:
        return True
    if RE_TAK_ADA.search(ke):
        return False
    raise SystemExit(f"gagal mengunduh R2 {kunci} (bukan 'tidak ada'): {ke.strip()[-300:]}")


def r2_taruh(kunci, path):
    rc, ke = wrangler("put", f"{BUCKET}/{kunci}", "--file", path, "--content-type", "application/json")
    if rc != 0:
        raise SystemExit(f"gagal mengunggah R2 {kunci}: {ke.strip()[-300:]}")


def baca(p, bawaan):
    """Berkas rusak/terpotong -> peringatan + bawaan (jangan menjatuhkan tiap jalan berikutnya)."""
    if not os.path.exists(p):
        return bawaan
    try:
        d = json.load(open(p, encoding="utf-8"))
    except (ValueError, OSError) as e:
        print(f"peringatan: {os.path.basename(p)} rusak ({e.__class__.__name__}), diganti bawaan", file=sys.stderr)
        return bawaan
    if not isinstance(d, type(bawaan)):
        print(f"peringatan: {os.path.basename(p)} bentuknya salah, diganti bawaan", file=sys.stderr)
        return bawaan
    return d


def tulis(p, d):
    t = p + ".tmp"
    with open(t, "w", encoding="utf-8") as f:
        json.dump(d, f, ensure_ascii=False, separators=(",", ":"))
        f.flush()
        os.fsync(f.fileno())
    os.replace(t, p)


def id_pakar(induk, maks=None):
    """induk.json {orang:[[id,nama,...]]} -> daftar id OpenAlex sah, unik, urut tampil."""
    out, ada = [], set()
    for o in (induk.get("orang") if isinstance(induk, dict) else induk) or []:
        i = o[0] if isinstance(o, list) and o else None
        if isinstance(i, str) and RE_ID.match(i) and i not in ada:
            out.append(i); ada.add(i)
    return out[:maks] if maks else out


def segar(tgl, kini, hari):
    try:
        return (kini - datetime.date.fromisoformat(tgl)).days < hari
    except (TypeError, ValueError):
        return False


def jalankan(ids, keluar, ambil, kunci, hari_segar=30, detik=None, kini=None, tidur=time.sleep, jam=time.monotonic, simpan=None, tiap=20):
    """Cicil: lewati pakar yang selesai < hari_segar hari lalu DAN datanya ada di pecahan. Pakar yang 5xx/jaringan menetap dicatat gagal
    dan dilewati; jalan berhenti setelah GAGAL_BERUNTUN gagal berturut-turut atau Berhenti global.
    `simpan(nama_berkas)` dipanggil tiap checkpoint (pecahan dulu, _status terakhir)."""
    os.makedirs(keluar, exist_ok=True)
    kini = kini or datetime.date.today()
    st_p = os.path.join(keluar, "_status.json")
    st = baca(st_p, {"selesai": {}, "gagal": {}})
    st.setdefault("selesai", {})
    st.setdefault("gagal", {})
    pec, ubah, laju, mulai = {}, set(), Laju(tidur, jam), jam()
    n_baru = n_lewat = n_gagal = beruntun = 0
    berhenti = None

    def pecah(n):
        if n not in pec:
            pec[n] = baca(os.path.join(keluar, f"{n}.json"), {})
        return pec[n]

    def checkpoint():
        for n in sorted(ubah):
            tulis(os.path.join(keluar, f"{n}.json"), pec[n])
        tulis(st_p, st)
        if simpan:
            simpan([f"{n}.json" for n in sorted(ubah)] + ["_status.json"])  # r2_taruh gagal = SystemExit, _status tidak terunggah
        ubah.clear()

    for i in ids:
        if segar(st["selesai"].get(i), kini, hari_segar) and i in pecah(pecahan(i)):
            n_lewat += 1
            continue
        if detik is not None and jam() - mulai > detik:
            berhenti = "batas waktu --detik"
            break
        try:
            karya = karya_pakar(i, ambil, laju, kunci, tidur)
        except ValueError as e:
            st["gagal"][i] = str(e)
            n_gagal += 1
            continue
        except Sementara as e:
            st["gagal"][i] = aman(str(e), kunci)
            n_gagal += 1
            beruntun += 1
            if beruntun >= GAGAL_BERUNTUN:
                berhenti = f"{beruntun} pakar gagal berturut-turut: {aman(str(e), kunci)}"
                break
            continue
        except Berhenti as e:
            berhenti = aman(str(e), kunci)
            break
        beruntun = 0
        n = pecahan(i)
        pecah(n)[i] = {"diperbarui": kini.isoformat(), "karya": karya}
        st["selesai"][i] = kini.isoformat()
        st["gagal"].pop(i, None)
        ubah.add(n)
        n_baru += 1
        if n_baru % tiap == 0:
            checkpoint()
    checkpoint()
    return {"baru": n_baru, "lewat": n_lewat, "gagal": n_gagal, "sisa": len(ids) - n_baru - n_lewat - n_gagal, "berhenti": berhenti}


# ---------------------------------------------------------------- --cek (tanpa jaringan)
FIX = os.path.join(AKAR, "tests", "kemitraan", "fixtures", "openalex")


def cek():
    w = json.load(open(os.path.join(FIX, "works.json"), encoding="utf-8"))["results"]
    # 1. pembalik inverted index
    assert balik_abstrak({"Banjir": [0, 3], "besar": [1], "di": [2], "Jawa.": [4]}) == "Banjir besar di Banjir Jawa."
    assert balik_abstrak(None) == "" and balik_abstrak({}) == ""
    r0 = ringkas_karya(w[0])
    assert r0["abstrak"] == "Flood early warning system for river basins in Java. We propose a threshold method." and r0["tahun"] == 2022, r0
    assert r0["doi"] == "https://doi.org/10.1/aaa" and r0["terbitan"] == "Jurnal Contoh" and r0["topik"] == ["Flood Risk", "Hydrology"] and r0["id"] == "W1"
    assert ringkas_karya(w[2])["abstrak"] == "" and ringkas_karya({"id": "x"}) is None  # tanpa abstrak tetap dipakai; tanpa judul dibuang
    # 2. pilih: 15 teratas + 10 terbaru tanpa duplikat, <= 25
    teras = [{"id": f"W{i}"} for i in range(15)]
    baru = [{"id": f"W{i}"} for i in range(10, 40)]  # 10..14 duplikat
    p = pilih(teras, baru)
    assert len(p) == 25 and len({k["id"] for k in p}) == 25 and p[-1]["id"] == "W24", [k["id"] for k in p]
    assert pecahan("A5012345") == 5012345 % 64
    # 3. pipeline dengan ambil palsu: laju, cicil, lanjut, 429, 404, kunci tak bocor
    panggil, tidur = [], []
    def palsu(url):
        panggil.append(url)
        if "A9999999" in url:
            return 404, None, 0
        return 200, {"results": w}, 0
    ids = ["A1000001", "A1000002", "A9999999", "A1000066"]
    jam = lambda: len(panggil) * 0.01  # jam palsu: lambat maju sehingga Laju harus tidur
    with tempfile.TemporaryDirectory() as d:
        ks = os.path.join(d, "k")
        r = jalankan(ids, ks, palsu, "RAHASIA", kini=datetime.date(2026, 11, 5), tidur=tidur.append, jam=jam)
        assert r == {"baru": 3, "lewat": 0, "gagal": 1, "sisa": 0, "berhenti": None}, r
        assert all("api_key=RAHASIA" in u for u in panggil) and len(panggil) == 7 and min(tidur) > 0
        assert os.path.exists(os.path.join(ks, f"{pecahan('A1000001')}.json")) and os.path.exists(os.path.join(ks, f"{pecahan('A1000066')}.json"))
        pe = json.load(open(os.path.join(ks, f"{pecahan('A1000001')}.json")))
        assert len(pe["A1000001"]["karya"]) == 3 and set(pe["A1000001"]["karya"][0]) == set(KARYA_KUNCI)
        n0 = len(panggil)
        r2 = jalankan(ids, ks, palsu, "RAHASIA", kini=datetime.date(2026, 11, 20), tidur=tidur.append, jam=jam)  # lanjut: 15 hari < 30
        assert r2["baru"] == 0 and r2["lewat"] == 3 and len(panggil) == n0 + 1, (r2, len(panggil) - n0)  # hanya A9999999 dicoba lagi
        r3 = jalankan(ids, ks, palsu, "RAHASIA", kini=datetime.date(2026, 12, 20), tidur=tidur.append, jam=jam)  # bulan depan: segar ulang
        assert r3["baru"] == 3, r3
        # 429 terus -> berhenti setelah 4 ulangan (5 percobaan) dengan jeda eksponensial 1,2,4,8; status tersimpan
        tidur2, c = [], []
        def tolak(url):
            c.append(url); return 429, None, 0
        r4 = jalankan(["A2000001"], os.path.join(d, "k2"), tolak, "RAHASIA", tidur=tidur2.append, jam=jam)
        assert r4["berhenti"] and r4["baru"] == 0 and len(c) == 5 and [x for x in tidur2 if x >= 1] == [1, 2, 4, 8], (r4, len(c), tidur2)
        assert "RAHASIA" not in r4["berhenti"]
        # status 5xx lalu pulih
        n = []
        def goyah(url):
            n.append(1); return (503, None, 0) if len(n) < 3 else (200, {"results": w}, 0)
        assert jalankan(["A2000002"], os.path.join(d, "k3"), goyah, None, tidur=lambda s: None, jam=jam)["baru"] == 1
        # batas waktu --detik: berhenti rapi, sisa dilaporkan
        t = [0.0]
        def maju(url):
            t[0] += 10; return 200, {"results": w}, 0
        r5 = jalankan(["A3000001", "A3000002", "A3000003"], os.path.join(d, "k4"), maju, None, detik=15, tidur=lambda s: None, jam=lambda: t[0])
        assert r5["berhenti"] and 0 < r5["baru"] < 3 and r5["sisa"] == 3 - r5["baru"], r5
    # 3b. ketahanan: satu pakar 5xx tidak menghentikan jalan; 4 berturut-turut menghentikan; 401/403 dan Retry-After panjang global
    lt = lambda s: None
    with tempfile.TemporaryDirectory() as d:
        def rusak(url):
            return (503, None, 0) if "A4000001" in url else (200, {"results": w}, 0)
        r = jalankan(["A4000001", "A4000002"], os.path.join(d, "a"), rusak, None, tidur=lt, jam=jam)
        assert (r["baru"], r["gagal"], r["berhenti"]) == (1, 1, None), r
        r = jalankan([f"A40000{i}" for i in range(10, 16)], os.path.join(d, "b"), lambda u: (500, None, 0), None, tidur=lt, jam=jam)
        assert r["berhenti"] and r["gagal"] == GAGAL_BERUNTUN and r["sisa"] == 2, r
        for kode in (401, 403):
            r = jalankan(["A4000020", "A4000021"], os.path.join(d, f"c{kode}"), lambda u, k=kode: (k, None, 0), None, tidur=lt, jam=jam)
            assert r["berhenti"] and "kunci/izin" in r["berhenti"] and r["gagal"] == 0 and r["sisa"] == 2, r
        r = jalankan(["A4000030"], os.path.join(d, "e"), lambda u: (429, None, 120), "RAHASIA", tidur=lt, jam=jam)
        assert r["berhenti"] and "120" in r["berhenti"], r
        n = []
        r = jalankan(["A4000040"], os.path.join(d, "f"), lambda u: (n.append(1), (200, {"meta": 1}, 0))[1], None, tidur=lt, jam=jam)  # 200 tanpa results
        assert r["baru"] == 0 and r["gagal"] == 1 and len(n) == 5, (r, len(n))
        # berkas rusak tidak menjatuhkan jalan: status & pecahan terpotong dipulihkan, pakar diambil ulang
        kr = os.path.join(d, "g")
        os.makedirs(kr)
        open(os.path.join(kr, "_status.json"), "w").write('{"selesai": {"A4000050": "2026-11-0')
        open(os.path.join(kr, f"{pecahan('A4000050')}.json"), "w").write("{rusak")
        r = jalankan(["A4000050"], kr, lambda u: (200, {"results": w}, 0), None, kini=datetime.date(2026, 11, 5), tidur=lt, jam=jam)
        assert r["baru"] == 1 and "A4000050" in json.load(open(os.path.join(kr, f"{pecahan('A4000050')}.json"))), r
        # status bilang selesai tapi pecahan kehilangan datanya -> ambil ulang
        r = jalankan(["A4000050"], kr, lambda u: (200, {"results": w}, 0), None, kini=datetime.date(2026, 11, 6), tidur=lt, jam=jam)
        assert r["lewat"] == 1
        os.remove(os.path.join(kr, f"{pecahan('A4000050')}.json"))
        r = jalankan(["A4000050"], kr, lambda u: (200, {"results": w}, 0), None, kini=datetime.date(2026, 11, 6), tidur=lt, jam=jam)
        assert r["baru"] == 1, r
    # Retry-After: detik, HTTP-date, sampah
    assert retry_after("7") == 7 and retry_after("") == 0 and retry_after("sampah") == 0
    assert retry_after("Wed, 21 Oct 2015 07:28:00 GMT", kini=1445412480 - 30) == 30 and retry_after("Wed, 21 Oct 2015 07:28:00 GMT", kini=1445412480 + 30) == 0
    # R2: hanya 'tidak ada' yang boleh dianggap kosong; gagal lain menghentikan jalan SEBELUM memanggil OpenAlex
    global wrangler
    asli = wrangler
    try:
        wrangler = lambda *a: (1, 'The specified key does not exist. [code: 10007]')
        assert r2_ambil("k", "/x") is False
        wrangler = lambda *a: (1, "fetch failed: ENOTFOUND api.cloudflare.com")
        try:
            r2_ambil("k", "/x"); raise AssertionError("galat jaringan R2 dianggap 'tidak ada'")
        except SystemExit:
            pass
    finally:
        wrangler = asli
    # 4. penjaga: tolak keluar di mana pun dalam repo (kecuali data/raw/kemitraan), temp boleh
    jaga_keluar(os.path.join(AKAR, "data", "raw", "kemitraan", "korpus"))
    for bad in (os.path.join(AKAR, "public", "data", "kemitraan"), os.path.join(AKAR, "data", "kajian-bnpb"), os.path.join(AKAR, "data", "raw", "banjir"),
                os.path.join(AKAR, ".claude", "x"), os.path.join(AKAR, "keluar_baru")):
        try:
            jaga_keluar(bad); raise AssertionError(f"jaga_keluar meloloskan {bad}")
        except SystemExit:
            pass
    jaga_keluar(tempfile.gettempdir())
    # 5. id sah saja
    assert id_pakar({"orang": [["A1234", "x"], ["A1234567", "y"], ["B12", "z"], ["A1234567", "dup"], [None], ["A12", "pendek"]]}) == ["A1234", "A1234567"]
    print("OK korpus.py: pembalik inverted index, pilih 15+10 <=25, cicil+lanjut, 429 -> 4 ulangan eksponensial, 5xx per pakar tidak menghentikan, 401/403/Retry-After panjang global, berkas rusak pulih, R2 'tidak ada' vs galat, kunci tak bocor, penjaga keluar")


def main(a):
    if "--cek" in a:
        return cek()

    def g(n, b=None):
        if n not in a:
            return b
        if a.index(n) + 1 >= len(a) or a[a.index(n) + 1].startswith("--"):
            sys.exit(f"{n} butuh nilai\n{__doc__}")
        return a[a.index(n) + 1]
    if not g("--induk") or not (g("--keluar") or "--r2" in a):
        sys.exit(__doc__)
    kunci = os.environ.get("OPENALEX_KEY")
    if not kunci and sys.platform == "darwin" and not os.environ.get("CI"):  # mesin pemilik: Keychain
        try:
            kunci = subprocess.run(["security", "find-generic-password", "-s", "openalex-api", "-w"], capture_output=True, text=True, timeout=15).stdout.strip()
        except subprocess.TimeoutExpired:
            kunci = ""
    if not kunci:
        if os.environ.get("CI"):
            sys.exit("OPENALEX_KEY kosong di CI: berhenti (jangan jalan tanpa kunci)")
        print("peringatan: OPENALEX_KEY kosong; jalan tanpa kunci (kuota publik)", file=sys.stderr)
    r2 = "--r2" in a
    keluar = g("--keluar") or tempfile.mkdtemp(prefix="km_korpus_")
    jaga_keluar(keluar)
    os.makedirs(keluar, exist_ok=True)
    simpan = None
    if r2:
        for n in ["_status"] + list(range(PECAHAN)):
            r2_ambil(f"kemitraan/korpus/{n}.json", os.path.join(keluar, f"{n}.json"))  # 'tidak ada' = mulai baru; galat lain = berhenti di sini
        simpan = lambda nama: [r2_taruh(f"kemitraan/korpus/{x}", os.path.join(keluar, x)) for x in nama]  # urut: pecahan dulu, _status terakhir
    ids = id_pakar(json.load(open(g("--induk"), encoding="utf-8")), int(g("--maks")) if g("--maks") else None)
    r = jalankan(ids, keluar, ambil_http, kunci, int(g("--segar", 30)), float(g("--detik")) if g("--detik") else None, simpan=simpan)
    print(json.dumps(r, ensure_ascii=False))
    if r["berhenti"]:
        sys.exit(2)  # bukan galat data: jalankan lagi untuk melanjutkan


if __name__ == "__main__":
    main(sys.argv[1:])
