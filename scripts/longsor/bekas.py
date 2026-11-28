"""LS-03 (paket longsor-satelit): inti murni pemetaan bekas longsor dari komposit Sentinel-2 sebelum dan sesudah. stdlib saja.
Baca data/kajian-bnpb/longsor-satelit/ALGORITMA.md bagian 1, 2, 5. TIDAK menarik citra dan TIDAK menghitung vonis (itu LS-05).
Parameter dibaca dari bekas_kriteria.json (terkunci oleh bekas_sidik.json); pembaca TIFF dipakai ulang lewat lereng_dem.py (tiff_mini).
Grid = daftar baris (daftar float, NaN = tidak ada data); piksel 10 m = 0,01 ha. Keluaran bukan-lulus: kec dan ha_* null, bukan 0.
Pakai:  python3 -I scripts/longsor/bekas.py uji | cek | prasyarat | kunci"""
import hashlib, json, math, os, subprocess, sys

AB = os.path.dirname(os.path.abspath(__file__))
AKAR = os.path.normpath(os.path.join(AB, "../.."))
KRI = os.path.join(AB, "bekas_kriteria.json")
SID = os.path.join(AB, "bekas_sidik.json")
NAN = float("nan")
HA_PIKSEL = 0.01


class Tolak(RuntimeError):
    """kriteria tidak terkunci: pipeline tidak boleh jalan"""


def _sha(isi):
    return hashlib.sha256(isi[:-1] if isi.endswith(b"\n") else isi).hexdigest()


def periksa_kunci(kri=KRI, sid=SID, git=True, perlu_jangkar=True):
    """-> kriteria (dict). Tolak bila sidik tak ada/beda; bila perlu_jangkar: jangkar kosong, isi di commit jangkar beda, atau bukan leluhur HEAD."""
    if not os.path.exists(sid):
        raise Tolak("bekas_sidik.json belum ada: kriteria belum dikunci")
    s = json.load(open(sid))
    isi = open(kri, "rb").read()
    if _sha(isi) != s["sidik"]:
        raise Tolak("sidik berkas kriteria tidak cocok dengan bekas_sidik.json: kriteria berubah sesudah dikunci")
    if perlu_jangkar and not s.get("jangkar_commit"):
        raise Tolak("jangkar_commit kosong: kriteria belum dijangkar ke commit")
    if git and s.get("jangkar_commit"):
        rel = os.path.relpath(kri, AKAR)
        r = subprocess.run(["git", "-C", AKAR, "show", f"{s['jangkar_commit']}:{rel}"], capture_output=True)
        if r.returncode or r.stdout != isi:
            raise Tolak("isi kriteria berbeda dari commit jangkar (atau commit jangkar tidak ada)")
        if subprocess.run(["git", "-C", AKAR, "merge-base", "--is-ancestor", s["jangkar_commit"], "HEAD"], capture_output=True).returncode:
            raise Tolak("commit jangkar bukan leluhur HEAD")
    return json.loads(isi)


def kunci(kri=KRI, sid=SID):
    """Tulis sidik sekali. Menolak menimpa: perubahan kriteria = berkas versi baru + sidik baru (ALGORITMA 4)."""
    if os.path.exists(sid):
        raise Tolak("sidik sudah ada; kriteria tidak diubah, buat versi baru")
    d = {"berkas": os.path.relpath(kri, AKAR), "sidik": _sha(open(kri, "rb").read()),
         "cara": "sha256 atas isi berkas kriteria tanpa satu baris baru penutup (byte per byte)",
         "ditulis": "2026-11-26", "versi": 1, "jangkar_commit": None,
         "catatan": "Isi jangkar_commit dengan hash commit yang memuat kedua berkas, sesudah di-push, SEBELUM data apa pun ditarik atau kejadian uji dihitung. bekas.py prasyarat menolak selama kosong."}
    json.dump(d, open(sid, "w"), indent=1, ensure_ascii=False)
    open(sid, "a").write("\n")
    return d


def _P():
    """kriteria mentah (tanpa penjaga: fungsi murni dan uji). Jalur hitung memakai hitung(), yang memanggil periksa_kunci()."""
    return json.load(open(KRI))


# ---------------------------------------------------------------- inti murni
def ndvi(b08, b04):
    """grid NDVI; NaN bila salah satu NaN atau penyebut 0."""
    out = []
    for r8, r4 in zip(b08, b04):
        row = []
        for n, r in zip(r8, r4):
            s = n + r
            row.append(NAN if (n != n or r != r or s == 0) else (n - r) / s)
        out.append(row)
    return out


def rdndvi(sebelum, sesudah):
    """(sesudah - sebelum) / sebelum; NaN bila sebelum <= 0 atau salah satu NaN (penyebut tak bermakna)."""
    return [[NAN if (a != a or b != b or a <= 0) else (b - a) / a for a, b in zip(ra, rb)] for ra, rb in zip(sebelum, sesudah)]


def mndwi(b03, b11):
    return [[NAN if (g != g or s != s or g + s == 0) else (g - s) / (g + s) for g, s in zip(rg, rs)] for rg, rs in zip(b03, b11)]


def median_sah(nilai, min_obs=None):
    """median nilai tak-NaN; NaN bila kurang dari min_obs pengamatan bersih (tidak terliput, bukan nol)."""
    v = sorted(x for x in nilai if x == x)
    if len(v) < (_P()["komposit"]["min_pengamatan_bersih"] if min_obs is None else min_obs):
        return NAN
    m = len(v) // 2
    return v[m] if len(v) % 2 else (v[m - 1] + v[m]) / 2


def komposit(adegan, scl_buang=None, min_obs=None):
    """adegan: daftar (grid_nilai, grid_scl). Piksel ber-SCL terbuang atau NaN diabaikan; median per piksel."""
    P = _P()["komposit"]
    scl_buang = P["masker_scl_dibuang"] if scl_buang is None else scl_buang
    min_obs = P["min_pengamatan_bersih"] if min_obs is None else min_obs
    h, w = len(adegan[0][0]), len(adegan[0][0][0])
    out = []
    for r in range(h):
        row = []
        for c in range(w):
            v = [g[r][c] for g, s in adegan if s[r][c] not in scl_buang]
            row.append(median_sah(v, min_obs))
        out.append(row)
    return out


def klasifikasi(rd, ndvi_sebelum, lereng_derajat, ambang, air=None, sungai=None, tebang=None):
    """grid kelas: 0 bukan, 1 bekas, 2 tumpang tindih tebangan (tidak dihitung bekas, D5), NaN tak terliput (rd atau ndvi NaN).
    ambang = rdNDVI (negatif); batas NDVI awal dan lereng dari kriteria."""
    K = _P()["optik"]
    nmin, lmin = K["ndvi_sebelum_min"], K["lereng_min_derajat"]
    out = []
    for r, row in enumerate(rd):
        o = []
        for c, v in enumerate(row):
            nb, ln = ndvi_sebelum[r][c], lereng_derajat[r][c]
            if v != v or nb != nb:
                o.append(NAN)
            elif ln != ln or ln < lmin or nb < nmin or v > ambang or (air and air[r][c]) or (sungai and sungai[r][c]):
                o.append(0)
            else:
                o.append(2 if (tebang and tebang[r][c]) else 1)
        out.append(o)
    return out


def gugus(kelas, nilai=1, piksel_min=None):
    """gugus 8-tetangga piksel == nilai dengan >= piksel_min piksel (300 m2 = 3 piksel 10 m) -> daftar daftar (r,c)."""
    piksel_min = _P()["optik"]["poligon"]["piksel_min"] if piksel_min is None else piksel_min
    h, w = len(kelas), len(kelas[0])
    lihat = set()
    hasil = []
    for r in range(h):
        for c in range(w):
            if kelas[r][c] != nilai or (r, c) in lihat:
                continue
            lihat.add((r, c))
            tumpuk, g = [(r, c)], []
            while tumpuk:
                y, x = tumpuk.pop()
                g.append((y, x))
                for dy in (-1, 0, 1):
                    for dx in (-1, 0, 1):
                        yy, xx = y + dy, x + dx
                        if 0 <= yy < h and 0 <= xx < w and (yy, xx) not in lihat and kelas[yy][xx] == nilai:
                            lihat.add((yy, xx))
                            tumpuk.append((yy, xx))
            if len(g) >= piksel_min:
                hasil.append(g)
    return hasil


def agregat_kec(kelas, kec, lereng_derajat, ndvi_sebelum, bekas_gugus, lulus=False):
    """kec: grid id kecamatan (None = di luar). Penyebut = lereng bervegetasi (lereng >= lmin DAN NDVI sebelum >= nmin; NDVI sebelum NaN
    tetap dihitung, sebagai tidak terliput), ALGORITMA 1. Per kec: ha_bekas (hanya piksel dalam gugus sah), ha_tebang_tumpang (kelas 2),
    bagian_terliput = piksel terliput / penyebut. Tidak lulus atau bagian_terliput < min_bagian_terliput_kec -> ha_* null (bukan 0)."""
    P = _P()
    lmin, nmin, mint = P["optik"]["lereng_min_derajat"], P["optik"]["ndvi_sebelum_min"], P["komposit"]["min_bagian_terliput_kec"]
    sah = {p for g in bekas_gugus for p in g}
    acc = {}
    for r, row in enumerate(kelas):
        for c, v in enumerate(row):
            k, ln, nb = kec[r][c], lereng_derajat[r][c], ndvi_sebelum[r][c]
            if k is None or ln != ln or ln < lmin or (nb == nb and nb < nmin):
                continue
            a = acc.setdefault(k, [0, 0, 0, 0])
            a[0] += 1
            if v == v:
                a[1] += 1
                if (r, c) in sah:
                    a[2] += 1
                elif v == 2:
                    a[3] += 1
    out = []
    for k in sorted(acc):
        n, t, b, tb = acc[k]
        bag = t / n
        ok = lulus and bag >= mint
        out.append({"kode": k, "ha_bekas": round(b * HA_PIKSEL, 2) if ok else None,
                    "ha_tebang_tumpang": round(tb * HA_PIKSEL, 2) if ok else None, "bagian_terliput": round(bag, 3)})
    return out


def hitung(sebelum_ndvi, sesudah_ndvi, lereng_derajat, kec, ambang, air=None, sungai=None, tebang=None, lulus=False, _izin_uji=False):
    """Jalur komputasi: SELALU lewat penjaga kunci (sidik cocok + jangkar commit). _izin_uji hanya untuk swa-uji sintetis.
    -> {"gugus": [...], "kec": [...]}; bukan-lulus -> ha_* null."""
    if not _izin_uji:
        periksa_kunci()
    kl = klasifikasi(rdndvi(sebelum_ndvi, sesudah_ndvi), sebelum_ndvi, lereng_derajat, ambang, air, sungai, tebang)
    g = gugus(kl)
    return {"gugus": g, "kelas": kl, "kec": agregat_kec(kl, kec, lereng_derajat, sebelum_ndvi, g, lulus)}


# ---------------------------------------------------------------- swa-uji
def uji():
    # kunci: sidik cocok, berubah satu byte -> Tolak, jangkar kosong -> Tolak untuk jalur penuh
    import tempfile
    with tempfile.TemporaryDirectory() as d:
        k, s = os.path.join(d, "k.json"), os.path.join(d, "s.json")
        open(k, "w").write('{"a": 1}\n')
        try:
            periksa_kunci(k, s, git=False)
            raise SystemExit("harus Tolak: sidik belum ada")
        except Tolak:
            pass
        kunci(k, s)
        for panggil in (lambda: kunci(k, s), lambda: periksa_kunci(k, s, git=False)):
            try:
                panggil()
                raise SystemExit("harus Tolak (timpa / jangkar kosong)")
            except Tolak:
                pass
        assert periksa_kunci(k, s, git=False, perlu_jangkar=False) == {"a": 1}
        open(k, "w").write('{"a": 2}\n')
        try:
            periksa_kunci(k, s, git=False, perlu_jangkar=False)
            raise SystemExit("harus Tolak: kriteria berubah")
        except Tolak:
            pass
    # rumus
    assert abs(ndvi([[0.8]], [[0.2]])[0][0] - 0.6) < 1e-9 and ndvi([[0.0]], [[0.0]])[0][0] != ndvi([[0.0]], [[0.0]])[0][0]
    assert abs(rdndvi([[0.8]], [[0.4]])[0][0] + 0.5) < 1e-9 and rdndvi([[0.0]], [[0.4]])[0][0] != 0
    assert median_sah([1, NAN, 3]) == 2 and median_sah([5, NAN, NAN]) != median_sah([5, NAN, NAN])
    # medan sintetis 40x40: hutan NDVI 0,8; sebagian lereng curam
    H = W = 40
    lereng = [[30.0] * W for _ in range(H)]
    sebelum = [[0.8] * W for _ in range(H)]
    sesudah = [[0.8] * W for _ in range(H)]
    for r in range(5, 9):            # petak longsor buatan 4x6 = 24 piksel
        for c in range(5, 11):
            sesudah[r][c] = 0.3
    for r in range(20, 24):          # petak tebangan buatan, juga turun NDVI, ada di topeng tebang
        for c in range(20, 24):
            sesudah[r][c] = 0.3
    sesudah[30][30] = 0.3            # 1 piksel (di bawah 300 m2) tidak jadi poligon
    sesudah[35][35] = 0.3            # piksel air (MNDWI > 0) tersaring
    for r in range(15, 18):          # awan: NaN -> tidak terliput, BUKAN nol
        for c in range(30, 40):
            sesudah[r][c] = NAN
    rd = rdndvi(sebelum, sesudah)
    tebang = [[20 <= r < 24 and 20 <= c < 24 for c in range(W)] for r in range(H)]
    air = [[(r, c) == (35, 35) for c in range(W)] for r in range(H)]
    sungai = [[(r, c) == (37, 5) for c in range(W)] for r in range(H)]
    sesudah[37][5] = sesudah[37][6] = sesudah[37][7] = 0.3   # 3 piksel di alur sungai: tersaring
    rd = rdndvi(sebelum, sesudah)
    kl = klasifikasi(rd, sebelum, lereng, -0.35, air=air, sungai=sungai, tebang=tebang)
    assert kl[37][5] == 0 and kl[37][6] == 1 and kl[37][7] == 1   # hanya piksel bertopeng sungai tersaring; sisa 2 piksel < 3, bukan gugus
    assert sum(v == 1 for row in kl for v in row) == 24 + 1 + 2          # longsor + piksel tunggal sebelum saringan luas
    assert sum(v == 2 for row in kl for v in row) == 16              # tebangan terpisah
    assert kl[35][35] == 0 and kl[16][35] != kl[16][35]              # air bukan kandidat; awan NaN
    gs = gugus(kl)
    assert len(gs) == 1 and len(gs[0]) == 24                         # piksel tunggal 30,30 tidak jadi poligon
    assert len(gugus([[1, 0, 1], [0, 0, 0], [0, 0, 0]], piksel_min=1)) == 2 and len(gugus([[1, 0], [0, 1]], piksel_min=1)) == 1  # diagonal = 8-tetangga
    # lereng landai dan NDVI awal rendah tidak jadi kandidat
    lan = [[5.0] * W for _ in range(H)]
    assert not any(v == 1 for row in klasifikasi(rd, sebelum, lan, -0.35) for v in row)
    assert not any(v == 1 for row in klasifikasi(rd, [[0.4] * W for _ in range(H)], lereng, -0.35) for v in row)
    # agregat: dua kecamatan; kiri (kolom < 20) terliput penuh, kanan sebagian awan
    kec = [["A" if c < 20 else "B" for c in range(W)] for r in range(H)]
    ag = {a["kode"]: a for a in agregat_kec(kl, kec, lereng, sebelum, gs, lulus=True)}
    assert ag["A"]["ha_bekas"] == 0.24 and ag["A"]["bagian_terliput"] == 1.0
    assert ag["A"]["ha_tebang_tumpang"] == 0.0 and abs(ag["B"]["bagian_terliput"] - 1 + 30 / 800) < 1e-3
    assert ag["B"]["ha_bekas"] == 0.0                                 # terliput, tak ada bekas: nol nyata
    assert {a["ha_bekas"] for a in agregat_kec(kl, kec, lereng, sebelum, gs, lulus=False)} == {None}   # bukan lulus -> null
    awan = [[NAN] * W for _ in range(H)]
    assert agregat_kec(awan, kec, lereng, sebelum, [], lulus=True)[0]["ha_bekas"] is None             # tak terliput -> null, bukan 0
    # penyebut = lereng BERVEGETASI (ALGORITMA 1): 10x10, baris 0-4 NDVI awal 0,2 (tak masuk penyebut), baris 5-9 bervegetasi dengan baris 9 berawan
    k10 = [["A"] * 10 for _ in range(10)]
    nb = [[0.2] * 10 if r < 5 else [0.8] * 10 for r in range(10)]
    kls = [[0] * 10 for _ in range(10)]
    kls[9] = [NAN] * 10
    a = agregat_kec(kls, k10, [[30.0] * 10] * 10, nb, [], lulus=True)[0]
    assert a["bagian_terliput"] == 0.8 and a["ha_bekas"] == 0.0     # semua-lereng akan memberi 0,9
    # parameter dibaca dari kriteria (bukan hardcode)
    P0 = _P
    try:
        globals()["_P"] = lambda: {**P0(), "optik": {**P0()["optik"], "poligon": {**P0()["optik"]["poligon"], "piksel_min": 30}}}
        assert gugus(kl) == []                                       # 24 piksel < 30: parameter kriteria dipakai
    finally:
        globals()["_P"] = P0
    # jalur hitung lewat penjaga kunci
    asli = globals()["periksa_kunci"]
    globals()["periksa_kunci"] = lambda *a, **k: (_ for _ in ()).throw(Tolak("uji"))
    try:
        hitung(sebelum, sesudah, lereng, kec, -0.35)
        raise SystemExit("hitung harus lewat penjaga kunci")
    except Tolak:
        pass
    finally:
        globals()["periksa_kunci"] = asli
    h = hitung(sebelum, sesudah, lereng, kec, -0.35, air=air, sungai=sungai, tebang=tebang, lulus=True, _izin_uji=True)
    assert len(h["gugus"]) == 1 and {a["kode"] for a in h["kec"]} == {"A", "B"}
    # komposit: SCL awan dibuang, kurang dari 2 pengamatan = NaN
    g = [[1.0]], [[2.0]], [[9.0]]
    s = [[4]], [[4]], [[9]]
    assert komposit(list(zip(g, s)))[0][0] == 1.5
    assert komposit(list(zip(g[1:], s[1:])), min_obs=2)[0][0] != komposit(list(zip(g[1:], s[1:])), min_obs=2)[0][0]
    print("ok")


if __name__ == "__main__":
    a = sys.argv[1:2]
    if a == ["uji"]:
        uji()
    elif a == ["kunci"]:
        print(kunci()["sidik"])
    elif a in (["cek"], ["prasyarat"]):
        try:
            periksa_kunci(perlu_jangkar=(a == ["prasyarat"]))
        except Tolak as e:
            print("TOLAK:", e)
            sys.exit(1)
        j = json.load(open(SID)).get("jangkar_commit")
        print("kunci ok; jangkar:", j or "BELUM (isi sesudah commit, sebelum data ditarik)")
    else:
        print(__doc__)
