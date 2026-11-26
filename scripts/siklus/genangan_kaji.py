"""GS-07: perakit genangan satelit per kejadian (data/kajian-bnpb/genangan-satelit/DESAIN-TEKNIS.md bagian 3 dan 4).

Menjalankan langkah banjir GS-01 (genangan_nasional kejadian), GS-04 (genangan_lahan), GS-05 (citra_banjir kejadian) bila keluarannya belum ada,
lalu paparan (paparan.zona_gfm + hitung_kab), lalu menyusun kaji_banjir.banjir_gfm menjadi berkas R2 LOKAL di data/raw/siklus/kaji (gitignored):
  siklus/saji/kaji/<kj>_banjir_gfm_v<n>.json, siklus/saji/kaji_berkas/<kj>/banjir_gfm/v<n>/<kab4>_sel.geojson dan <kab4>_<citra>.png.
Versi v<n> naik hanya bila lintasan satu kab berubah; versi lama tidak ditimpa. Tidak mengunggah ke R2 atau D1 (rute Worker dan migrasi = GS-08).
Provinsi tanpa data/terkunci/bangunan/halus_<prov>.json: penduduk "data bangunan belum tersedia", kab itu keluar dari jiwa_kab_sah, tidak pernah 0.
Pakai: python3 scripts/siklus/genangan_kaji.py jalan --kj KJ --mulai TGL --kab 1116 1201 [--kering] [--ulang] [--keluar DIR] | prasyarat | uji
       python3 scripts/siklus/genangan_kaji.py vonis [--paralel 2] [--kering]   (GS-13: baca 300 sampel terkunci lewat jalur produksi, cache data/raw/siklus/vonis_gs13.jsonl,
         vonis ke genangan_sidik.json lalu dijangkar dengan commit; ringkasan public/banjir/data/lab/genangan_kaji_ringkas.md)
       python3 scripts/siklus/genangan_kaji.py kirim --keluar AKAR_SAJI [--kj KJ] [--wrangler W] [--basis URL] [--kirim]   (GS-12, siklus.yml; env PIPA_TOKEN)
  kirim: kejadian Q2 dari Buku Besar (banjir, fase tanggap, mulai <= JENDELA_HARI hari lalu; atau --kj yang dibuka staf), versi terakhir ditarik dari R2,
  langkah banjir dijalankan ulang, versi baru dikirim ke /api/siklus/ingest/kaji; berkasnya disalin ke --keluar (diunggah gudang.py) HANYA bila D1 menerima
  versi yang sama, jadi versi di R2 dan baris D1 tetap selangkah.
"""
import argparse, datetime as dt, fcntl, glob, hashlib, importlib.util, json, math, os, random, re, shutil, subprocess, sys, tempfile, threading
from concurrent.futures import ThreadPoolExecutor

AB = os.path.dirname(os.path.abspath(__file__))
AKAR = os.path.normpath(os.path.join(AB, "../.."))
KEJ = os.path.join(AKAR, "data/raw/banjir/gfm_nasional/kejadian")
KELUAR = os.path.join(AKAR, "data/raw/siklus/kaji")
MAKS_GEOJSON = 300 * 1000
LANGKAH = (("", "genangan_nasional.py"), ("_lahan.json", "genangan_lahan.py"), ("_citra.json", "citra_banjir.py"))


def _muat(rel):
    s = importlib.util.spec_from_file_location("gk_" + os.path.basename(rel)[:-3], os.path.join(AKAR, rel))
    m = importlib.util.module_from_spec(s)
    s.loader.exec_module(m)
    return m


def _baca(jalur):
    return json.load(open(jalur, encoding="utf-8")) if os.path.exists(jalur) else None


def jalankan_langkah(kj, mulai, kab, ulang=False, kering=False):
    """GS-01, GS-04, GS-05 lewat subprocess bila keluarannya belum ada atau tak memuat semua kab; --kering melarang unduh (cache saja)."""
    for akhiran, skrip in LANGKAH:
        d = _baca(os.path.join(KEJ, kj + (akhiran or ".json")))
        ada = d is not None and set(kab) <= {k["kab4"] for k in d["kab"]}
        if ada and not ulang:
            continue
        if kering:
            sys.exit(f"--kering: {kj}{akhiran or '.json'} belum ada atau tak memuat semua kab (cache saja, tanpa unduh)")
        sub = "banjir/" + skrip
        a = ["kejadian", "--kj", kj] + (["--mulai", mulai, "--kab", *kab] if skrip == "genangan_nasional.py" else [])
        if subprocess.run([sys.executable, os.path.join(AKAR, "scripts", sub), *a]).returncode:
            sys.exit(f"langkah {skrip} gagal")


def sel_geojson(titik):
    """titik_baru [(lon, lat, ha)] -> (bytes, sel_m). Pusat sel halus 110 m dan ha, tanpa bangunan; lebih dari 300 KB digabung bertingkat 110, 330, 550, 1100 m (DESAIN-TEKNIS 4); bila tingkat terkasar masih di atas batas, `catatan` di berkas memuat alasannya."""
    P = _P()
    ha = {}
    for lon, lat, h in titik:
        c = P._sel_halus(lon, lat)
        ha[c] = ha.get(c, 0.0) + h
    for b in (1, 3, 5, 10):
        g = {}
        for (i, j), h in ha.items():
            g[(i // b, j // b)] = g.get((i // b, j // b), 0.0) + h
        fit = [{"type": "Feature", "geometry": {"type": "Point", "coordinates": [round(P.BG.LON0 + (J * b + b / 2) / P.BG.HALUS, 5), round(P.BG.LAT0 + (I * b + b / 2) / P.BG.HALUS, 5)]},
                "properties": {"ha": round(h, 4)}} for (I, J), h in sorted(g.items())]
        data = json.dumps({"type": "FeatureCollection", "sel_m": 110 * b, "features": fit}, separators=(",", ":")).encode()
        if len(data) <= MAKS_GEOJSON:
            break
    else:
        data = json.dumps({"type": "FeatureCollection", "sel_m": 110 * b, "catatan": f"melebihi batas {MAKS_GEOJSON} B walau digabung ke {110 * b} m ({len(data)} B)", "features": fit}, separators=(",", ":")).encode()
    jml, tot = sum(f["properties"]["ha"] for f in fit), sum(ha.values())
    assert abs(jml - tot) <= 0.0005 * tot, f"total ha geojson {jml} menyimpang dari jumlah titik {tot}"
    return data, 110 * b


_PM = []


def _P():
    if not _PM:
        _PM.append(_muat("scripts/siklus/paparan.py"))
    return _PM[0]


def paparan_kab(g, desa_fn=None):
    """-> (hitung_kab dengan zona gfm_bawah dan gfm_atas | None, alasan). Tanpa grid halus provinsi: None + alasan, tidak pernah 0."""
    P = _P()
    try:
        sel, _, _, _, nama, w = P.sel_kab(g["prov"], g["kab4"])
    except OSError:
        return None, f"data bangunan belum tersedia (grid halus provinsi {g['prov']} tidak ada di data/terkunci/bangunan)"
    if not sel:
        return None, "data bangunan belum tersedia (kabupaten tidak terliput)"
    wp = {k.split("|", 2)[2]: v for k, v in _baca(os.path.join(AKAR, "public/data/penduduk.json"))["kec"].items() if k.startswith(f"{g['prov']}|{nama}|")}
    try:
        desa = (desa_fn or (lambda p, k, w: P.desa_dukcapil(p, k, w, os.path.join(AKAR, "data/raw/siklus"))))(g["prov"], g["kab4"], w)
    except Exception as e:   # Dukcapil tak terbaca: dukcapil jadi null (tidak tersedia), bukan 0
        print(f"  {g['kab4']}: Dukcapil tak terbaca ({type(e).__name__}: {e}), dukcapil tidak tersedia", file=sys.stderr)
        desa = []
    z = P.zona_gfm([tuple(t) for t in g["mentah"]["titik_baru"]], g["langkah"])
    return P.hitung_kab(sel, [z["bawah"], z["atas"]], desa, wp), None


SEL_TINGKAT = "110-330-550-1100"  # naik bila aturan penggabungan sel berubah, supaya versi hasil ikut naik


def sidik_masukan(hasil, kriteria_sidik):
    """sha256 atas lintasan per kab, rentang penduduk per kab (None atau [bawah, atas]), dan sidik kriteria."""
    def rg(k):
        p = (k.get("penduduk") or {}).get("worldpop")
        return [p["bawah"], p["atas"]] if p and p["tersedia"] else None
    isi = {"kab": {k["kab4"]: [k.get("lintasan"), rg(k)] for k in hasil["kab"]}, "kriteria": kriteria_sidik, "sel": SEL_TINGKAT}
    return hashlib.sha256(json.dumps(isi, sort_keys=True).encode()).hexdigest()


def versi(keluar, kj, sidik):
    """-> (n, baru). Sidik masukan sama dengan versi terakhir = versinya tetap; beda (atau versi lama tanpa sidik) = n+1; yang lama tidak ditimpa."""
    ada = sorted(glob.glob(os.path.join(keluar, "siklus/saji/kaji", f"{kj}_banjir_gfm_v*.json")),
                 key=lambda f: int(re.search(r"_v(\d+)\.json$", f).group(1)))
    if not ada:
        return 1, True
    n = int(re.search(r"_v(\d+)\.json$", ada[-1]).group(1))
    return (n, False) if json.load(open(ada[-1])).get("sidik_masukan") == sidik else (n + 1, True)


def atribusi_bangunan(provs, sumber_fn=None):
    """Sumber bangunan untuk pembagian penduduk per provinsi yang benar-benar dipakai (K9: Aceh dari Overture, lain Open Buildings v3)."""
    fn = sumber_fn or _muat("scripts/umum/bangunan.py").sumber_prov
    teks = []
    for p in sorted({p for p in provs if p}):
        t = fn(p) or "Google Open Buildings v3"
        t = "Overture Maps Foundation, kontributor OpenStreetMap, ODbL 1.0" if t.startswith("Overture") else "Google Open Buildings v3, CC BY 4.0"
        if t + " (bangunan untuk pembagian penduduk)" not in teks:
            teks.append(t + " (bangunan untuk pembagian penduduk)")
    return teks


def rakit(kj, kab, keluar=KELUAR, kej=KEJ, paparan_fn=None, sidik=None):
    """Menyusun satu versi. -> (n, baru, hasil, masalah[], berkas[(kunci, byte)])."""
    KB, S = _muat("scripts/siklus/kaji_banjir.py"), _muat("scripts/siklus/saji.py")
    gf, la, ci = (_baca(os.path.join(kej, kj + a)) for a in (".json", "_lahan.json", "_citra.json"))
    if gf is None:
        sys.exit(f"{kj}.json tidak ada: jalankan langkah GS-01")
    peta = lambda d: {k["kab4"]: k for k in (d or {}).get("kab", [])}
    la_, ci_ = peta(la), peta(ci)
    daftar = [k for k in gf["kab"] if k["kab4"] in kab]
    kabs = []
    for g in daftar:
        pap, why = (paparan_fn or paparan_kab)(g) if g["sah"] else (None, None)
        kabs.append({"gfm": g, "lahan": la_.get(g["kab4"]), "paparan": pap, "alasan_paparan": why, "citra": ci_.get(g["kab4"])})
    hasil = KB.banjir_gfm(kabs)
    sid = sidik or (_baca(os.path.join(AB, "genangan_sidik.json")) or {}).get("sidik")
    sm = sidik_masukan(hasil, sid)
    n, baru = versi(keluar, kj, sm)
    kunci = f"siklus/saji/kaji/{kj}_banjir_gfm_v{n}.json"
    if not baru:
        return n, False, json.load(open(os.path.join(keluar, *kunci.split("/")))), [], []
    atr = [gf.get("sumber"), (la or {}).get("sumber"), *((ci or {}).get("atribusi") or []), *atribusi_bangunan(k["gfm"].get("prov") for k in kabs if k["paparan"])]
    isi = {"versi": n, "mulai": gf["mulai"], "kriteria_sidik": sid, "sidik_masukan": sm, "ambang": gf["ambang"], "atribusi": [a for a in atr if a],
           "keterbatasan_paparan": _P().KETERBATASAN, **hasil}
    masalah, berkas = KB.tulis(keluar, kj, isi, kunci), []
    dasar = f"siklus/saji/kaji_berkas/{kj}/banjir_gfm/v{n}/"

    def taruh(nama, data):
        k = dasar + nama
        m = S.periksa_berkas(k, data)
        masalah.extend(m)
        if not m:
            j = os.path.join(keluar, *k.split("/"))
            os.makedirs(os.path.dirname(j), exist_ok=True)
            open(j, "wb").write(data)
            berkas.append((k, len(data)))
    for g in daftar:
        if not g["sah"]:
            continue
        if g["mentah"].get("titik_baru"):
            d, sm = sel_geojson(g["mentah"]["titik_baru"])
            taruh(f"{g['kab4']}_sel.geojson", d)
            if sm != 110:
                print(f"  {g['kab4']}: sel digabung ke {sm} m (lebih dari 300 KB)")
            if len(d) > MAKS_GEOJSON:
                masalah.append(f"{g['kab4']}_sel.geojson {len(d)} B melebihi {MAKS_GEOJSON} B di tingkat terkasar {sm} m")
        for nama, c in ((k, v) for k, v in ((ci_.get(g["kab4"]) or {}).get("citra") or {}).items() if isinstance(v, dict) and v.get("berkas")):
            taruh(c["berkas"], open(os.path.join(kej, kj + "_citra", c["berkas"]), "rb").read())
    return n, True, {**isi, "kunci": kunci}, masalah, berkas


def kirim(muatan, basis, http=None, sungguhan=False):
    """Jalur kirim ke /api/siklus/ingest/kaji (rute banjir_gfm baru ada setelah GS-08). Tanpa `sungguhan`, http tak pernah dipanggil."""
    KB = _muat("scripts/siklus/kaji_banjir.py")
    return [(b["kejadian_id"], "DITOLAK lokal: " + "; ".join(m) if (m := KB.periksa_gfm(b)) else
            (http("POST", basis.rstrip("/") + "/api/siklus/ingest/kaji", b) if sungguhan else "dry-run: rentang %s" % b["ringkas"]["rentang"])) for b in muatan]


JENDELA_HARI = 14   # lintasan GFM 0-12 hari sesudah mulai (genangan_nasional.JENDELA_KEJADIAN) + 2 hari jeda terbit GFM; sesudahnya versi tak berubah
BUCKET = "poskokarhutla-foto"


def _gfm(kj, n, hasil, kab):
    return {"kj": kj, "versi": n, "hasil": hasil, "masukan": {"kj": kj, "kab": kab if len(kab) <= 40 else len(kab),
                                                               "kriteria_sidik": hasil["kriteria_sidik"], "versi_pipeline": "GS-07"}}


def pilih(jendela, sumber, kini, kj=None):
    """Q2 (bawaan sementara): kejadian banjir berfase tanggap dengan mulai paling lama JENDELA_HARI hari lalu; --kj = kejadian yang dibuka staf
    (fase apa pun, Worker menolak yang digabung atau dibatalkan). Kab = kab4 kejadian + kab4 baris sumber terpasang. -> [(kj, mulai, [kab4])]"""
    out = []
    for e in jendela:
        if kj:
            if e["id"] != kj:
                continue
        elif not (e.get("jenis") == "banjir" and e.get("fase") == "tanggap" and 0 <= (kini - dt.date.fromisoformat(e["mulai"])).days <= JENDELA_HARI):
            continue
        kab = sorted(({e.get("kab4")} | {s.get("kab4") for s in sumber if s.get("kejadian_id") == e["id"] and s.get("status") == "terpasang"}) - {None, ""})
        if kab:
            out.append((e["id"], e["mulai"], kab))
    return out


def tarik_r2(wrangler, akar, kj):
    """Versi yang sudah terbit (v1, v2, ...) dari R2 ke akar lokal supaya versi() melanjutkan nomornya; -> jumlah versi."""
    n = 0
    while n < 99:
        kunci = f"siklus/saji/kaji/{kj}_banjir_gfm_v{n + 1}.json"
        j = os.path.join(akar, *kunci.split("/"))
        os.makedirs(os.path.dirname(j), exist_ok=True)
        if subprocess.run([wrangler, "r2", "object", "get", f"{BUCKET}/{kunci}", "--file", j, "--remote"], capture_output=True).returncode:
            if os.path.exists(j):
                os.remove(j)
            return n
        n += 1
    return n


def satu(a, http, kj, mulai, kab):
    """Satu kejadian -> 0 lancar atau dilewati, 1 gagal."""
    KB = _muat("scripts/siklus/kaji_banjir.py")
    with tempfile.TemporaryDirectory() as t:
        ada = tarik_r2(a.wrangler, t, kj) if a.wrangler else 0
        jalankan_langkah(kj, mulai, kab, ulang=True)
        n, baru, hasil, masalah, berkas = rakit(kj, kab, t)
        if masalah:
            print("MASALAH", kj, "; ".join(masalah))
            return 1
        if not baru:
            print("LEWATI", kj, f"v{n} lintasan tak berubah (R2 {ada} versi)")
            return 0
        mu, lw = KB.rencana([], [], None, None, gfm=[_gfm(kj, n, hasil, kab)])
        for x in lw:
            print("LEWATI", *x)
        if not mu:
            return 0
        if not a.kirim:
            print("KERING", kj, f"v{n}", "rentang", mu[0]["ringkas"]["rentang"])
            return 0
        r = http("POST", a.basis.rstrip("/") + "/api/siklus/ingest/kaji", mu[0])
        if r.get("versi") != n:
            print("GAGAL", kj, f"D1 memberi versi {r.get('versi')}, berkas v{n}; berkas tidak diunggah")
            return 1
        # Unggah langsung sesudah D1 menerima (bukan menunggu langkah sinkron di akhir job): baris D1 tanpa berkas R2 membuat jalan berikut
        # menghitung n lagi sementara D1 memberi n+1 dan CHECK hasil_r2 menolak. Salinan di --keluar tetap ada supaya sinkron mencatat manifest.
        # ponytail: unggah gagal dua kali = selisih D1 dan R2 yang dirapikan manual (tarik baris D1 itu atau unggah ulang berkasnya)
        W = _muat("scripts/siklus/gudang.py").Wrangler(a.wrangler) if a.wrangler else None
        for k in [*(k for k, _ in berkas), hasil["kunci"]]:   # hasil terakhir: berkas yang dirujuk sudah ada saat hasil tampil
            j = os.path.join(a.keluar, *k.split("/"))
            os.makedirs(os.path.dirname(j), exist_ok=True)
            shutil.copyfile(os.path.join(t, *k.split("/")), j)
            for coba in (1, 2):
                try:
                    W and W.put(k, j)
                    break
                except RuntimeError as e:
                    if coba == 2:
                        print("GAGAL", kj, f"v{n} sudah di D1 tetapi unggah R2 gagal: {e}")
                        return 1
        print("KIRIM", kj, f"v{n}", r)
        return 0


def _kirim(a):
    tk = os.environ.get("PIPA_TOKEN") or sys.exit("butuh env PIPA_TOKEN")
    P = _muat("scripts/siklus/pasang.py")
    http, kini = P._http(tk), dt.date.today()
    dari, sampai = (kini - dt.timedelta(days=365 if a.kj else JENDELA_HARI)).isoformat(), kini.isoformat()
    daftar = pilih(P._tarik(http, a.basis, "jendela", dari, sampai), P._tarik(http, a.basis, "sumber", dari, sampai), kini, a.kj)
    if a.kj and not daftar:
        sys.exit(f"{a.kj} tidak ada di Buku Besar 365 hari terakhir atau tanpa kab")
    if not a.wrangler:
        print("PERINGATAN tanpa --wrangler: versi R2 tidak ditarik, penomoran mulai v1")
    print(f"{len(daftar)} kejadian:", " ".join(kj for kj, _, _ in daftar) or "-")
    gagal = 0
    for kj, mulai, kab in daftar:
        try:
            gagal += satu(a, http, kj, mulai, kab)
        except (SystemExit, Exception) as e:   # langkah banjir, HTTP, atau jaringan gagal: kejadian lain tetap jalan
            print("GAGAL", kj, repr(e))
            gagal += 1
    return 1 if gagal else 0


def _jalan(a):
    jalankan_langkah(a.kj, a.mulai, a.kab, a.ulang, a.kering)
    KB = _muat("scripts/siklus/kaji_banjir.py")
    n, baru, hasil, masalah, berkas = rakit(a.kj, a.kab, a.keluar)
    print(f"v{n}: {'baru ditulis' if baru else 'lintasan tak berubah, versi lama dipakai'}")
    print("ringkas:", json.dumps(hasil["ringkas"], ensure_ascii=False), f"({len(json.dumps(hasil['ringkas'], ensure_ascii=False).encode())} B)")
    for k in hasil["kab"]:
        p = k.get("penduduk")
        print(" ", k["kab4"], k["kab"], "sah" if k["sah"] else "tak sah: " + k["alasan"], "|", "penduduk " + json.dumps(p["worldpop"], ensure_ascii=False) if p else "tanpa angka")
    for k, b in berkas:
        print("  berkas", k, b, "B")
    if baru:
        print("  hasil", hasil["kunci"], os.path.getsize(os.path.join(a.keluar, *hasil["kunci"].split("/"))), "B")
    for m in masalah:
        print("MASALAH", m)
    mu, lw = KB.rencana([], [], None, None, gfm=[_gfm(a.kj, n, hasil, a.kab)])
    for x in lw:
        print("LEWATI", *x)
    for kj, hs in kirim(mu, "https://centurisk97.id"):
        print("KERING", kj, hs)
    return 1 if masalah else 0


# ---------------------------------------------------------------- GS-13 uji balik (ALGORITMA bagian 7, kriteria terkunci GS-02 v2)
VONIS_CACHE = os.path.join(AKAR, "data/raw/siklus/vonis_gs13.jsonl")   # gitignored; satu baris per pasangan sampel, bisa dilanjutkan
RINGKAS = os.path.join(AKAR, "public/banjir/data/lab/genangan_kaji_ringkas.md")
SID = os.path.join(AB, "genangan_sidik.json")
COBA = 3   # percobaan per pasangan dalam satu jalan; sesudahnya `gagal` dan tetap di penyebut
GAGAL_MAKS = 30   # dikunci 26 Nov 2026 SEBELUM ada pasangan sah terbaca (6 dari 300, semua tak sah): lebih dari 10 persen gagal baca = jalan rusak
                  # (jaringan, GFM mati, bug), vonis tidak ditulis; ulangi dengan --ulang-gagal. Tidak bergantung pada rho.


def peringkat(v):
    """peringkat rata-rata untuk nilai seri (1-based)"""
    u = sorted(range(len(v)), key=lambda i: v[i])
    r = [0.0] * len(v)
    i = 0
    while i < len(u):
        j = i
        while j + 1 < len(u) and v[u[j + 1]] == v[u[i]]:
            j += 1
        for k in range(i, j + 1):
            r[u[k]] = (i + j) / 2 + 1
        i = j + 1
    return r


def spearman(x, y):
    """Spearman dengan seri; None bila salah satu sisi tanpa ragam (tak terdefinisi, bukan 0)."""
    rx, ry = peringkat(x), peringkat(y)
    mx, my = sum(rx) / len(rx), sum(ry) / len(ry)
    sxy = sum((a - mx) * (b - my) for a, b in zip(rx, ry))
    sx, sy = sum((a - mx) ** 2 for a in rx), sum((b - my) ** 2 for b in ry)
    return sxy / math.sqrt(sx * sy) if sx and sy else None


def kuantil(s, q):
    s = sorted(s)
    p = q * (len(s) - 1)
    i = int(p)
    return s[i] + (s[min(i + 1, len(s) - 1)] - s[i]) * (p - i)


def nilai_vonis(baris, K, dipilih):
    """baris sah [{x, y, naif_1, naif_2, naif_3, blok}] -> dict vonis menurut kriteria terkunci (tanpa membaca apa pun lagi)."""
    L, B, T = K["lulus"], K["bootstrap"], K["tak_dapat_dinilai"]
    blok = {}
    for b in baris:
        blok.setdefault(b["blok"], []).append(b)
    kode = sorted(blok)
    naif = [n["id"] for n in K["naif"]]
    out = {"dipilih": dipilih, "sah": len(baris), "blok_sah": len(kode), "sah_per_dipilih": round(len(baris) / dipilih, 3) if dipilih else 0}
    if len(kode) < L["n_blok_sah_min"] or not dipilih or len(baris) / dipilih < 0.30:
        return {**out, "label": T["label"], "alasan": T["bila"]}
    col = lambda bs, k: [b[k] for b in bs]
    rho = spearman(col(baris, "x"), col(baris, "y"))
    rn = {k: spearman(col(baris, k), col(baris, "y")) for k in naif}
    if rho is None:   # kriteria tidak mengatur rho tak terdefinisi: tidak dinilai, bukan gagal
        return {**out, "label": T["label"], "alasan": "Spearman model tak terdefinisi (x atau y tanpa ragam)"}
    rng = random.Random(B["seed"])
    sel, buang = {k: [] for k in naif}, 0
    for _ in range(B["ulang"]):
        bs = [b for c in (rng.choice(kode) for _ in kode) for b in blok[c]]
        r0 = spearman(col(bs, "x"), col(bs, "y"))
        rk = {k: spearman(col(bs, k), col(bs, "y")) for k in naif}
        if r0 is None or None in rk.values():   # ulangan tanpa ragam: dicatat, tidak diisi 0
            buang += 1
            continue
        for k in naif:
            sel[k].append(r0 - rk[k])
    a = (100 - B["ci_persen"]) / 200
    ci = {k: [round(kuantil(v, a), 4), round(kuantil(v, 1 - a), 4)] if v else None for k, v in sel.items()}
    lulus = rho >= L["rho_min"] and all(ci[k] and ci[k][0] > L["batas_bawah_ci_selisih_min_eksklusif"] for k in L["terhadap"])
    return {**out, "rho": round(rho, 4), "rho_naif": {k: None if v is None else round(v, 4) for k, v in rn.items()},
            "ci_selisih": ci, "ulangan_tanpa_ragam": buang, "label": L["label_bila_lulus"] if lulus else "gagal"}


def baca_pasangan(gn, kat, amb, m, kk, wp, prov, nama, tgl):
    """Satu pasangan sampel lewat jalur produksi: hitung_pasangan riwayat (jendela 6 hari, pra <= DIBI - margin, UTC Q14), sah dari ambang
    terkunci, penduduk dari paparan_kab (WorldPop, tanpa Dukcapil). -> baris cache tanpa titik dan tanpa data orang."""
    kab4 = kk.get(f"{prov}|{nama}")
    kec = gn.kec_kab(prov, nama)
    if not kec:
        return {"status": "tanpa_poligon", "sah": False}
    pt = gn.Titik(kec)
    h = gn.hitung_pasangan(pt, kat, tgl_(tgl), gn.JENDELA["dibi"], prov=prov, pra_sebelum=gn.pra_batas({"acuan": tgl, "sumber": "dibi"}, m), titik=True)
    r = gn.rekam_kab(kab4, prov, nama, pt, h, amb)
    w = [v for k, v in wp.items() if k.startswith(f"{prov}|{nama}|")]
    d = {"status": r["status"], "sah": r["sah"], "alasan": r["tampil"].get("alasan"), "lintasan": r.get("lintasan"), "pra": r.get("pra"),
         "cakupan_pct": r["mentah"]["cakupan_pct"], "naif_1": r["mentah"]["luas_ha"], "naif_3": r["mentah"]["baru_ha"],
         "naif_2": sum(w) if w and None not in w else None, "x": None}
    if r["sah"]:
        if not kab4:
            return {**d, "alasan_x": "kode kab tidak dikenal"}
        pap, why = paparan_kab(r, desa_fn=lambda *a: [])
        z = ((pap or {}).get("zona", {}).get("banjir") or {}).get("per_zona", {})
        wb, wa = ((z.get(k) or {}).get("jiwa", {}).get("worldpop") for k in ("gfm_bawah", "gfm_atas"))
        d.update(x=(wb + wa) / 2 if None not in (wb, wa) else None, wp_bawah=wb, wp_atas=wa, alasan_x=why)
    return d


def tgl_(s):
    return dt.date.fromisoformat(s[:10])


def _vonis(a):
    GK = _muat("scripts/siklus/genangan_kriteria.py")
    K = GK.periksa_kunci()   # menolak bila kunci rusak atau berkas vonis pernah ada
    s = json.load(open(SID))
    os.makedirs(os.path.dirname(VONIS_CACHE), exist_ok=True)
    kunci_f = open(VONIS_CACHE + ".kunci", "w")
    try:
        fcntl.flock(kunci_f, fcntl.LOCK_EX | fcntl.LOCK_NB)
    except OSError:
        sys.exit("vonis lain sedang jalan (cache terkunci)")
    if s.get("vonis"):
        sys.exit("sidik sudah memuat vonis GS-13: uji balik tidak diulang")
    gn = GK._gn()
    pas = K["sampel_uji"]["pasangan"]
    y = {(p, n, t): td for p, n, t, td, *_ in K["pasangan"]}
    sudah = {}
    if os.path.exists(VONIS_CACHE):
        for g in open(VONIS_CACHE):
            try:
                r = json.loads(g)
            except ValueError:
                continue
            if r.get("kriteria_sidik") != s["sidik"] or r.get("margin_pra_hari") != K["margin_pra_hari"]:
                continue   # baris dari kriteria atau margin lain tidak dipakai ulang
            if a.ulang_gagal and r["status"] == "gagal":
                continue   # galat infrastruktur dibaca ulang; baris baru di ujung berkas menimpa yang lama
            sudah[r["kunci"]] = r
    todo = [q for q in pas if "|".join(q) not in sudah]
    print(f"sampel {len(pas)}, sudah {len(pas) - len(todo)}, dibaca sekarang {len(todo)}", flush=True)
    if todo:
        kat = gn.Katalog(gn.muat_item())
        amb, m = gn.ambang(), gn.margin_pra()
        assert m == K["margin_pra_hari"], "margin genangan_nasional beda dari kriteria terkunci"
        kk = _muat("scripts/bnpb/hvc_dasar.py").kab_kode()
        wp = _baca(os.path.join(AKAR, "public/data/penduduk.json"))["kec"]
        kunci = threading.Lock()

        def kerja(q):
            prov, nama, tgl = q
            for c in range(COBA):
                try:
                    d = baca_pasangan(gn, kat, amb, m, kk, wp, prov, nama, tgl)
                    break
                except Exception as e:   # jaringan: coba lagi; sesudah COBA kali tercatat gagal (tetap di penyebut)
                    d = {"status": "gagal", "sah": False, "galat": f"{type(e).__name__}: {e}"[:300]}
                    print(f"  coba {c + 1} {prov}|{nama}|{tgl}: {d['galat']}", file=sys.stderr, flush=True)
            d.update(kunci="|".join(q), margin_pra_hari=m, kriteria_sidik=s["sidik"])
            with kunci:
                with open(VONIS_CACHE, "a") as g:
                    g.write(json.dumps(d, ensure_ascii=False) + "\n")
                sudah[d["kunci"]] = d
                print(f"  [{len(sudah)}/{len(pas)}] {d['kunci']}: {d['status']} sah={d['sah']} x={d.get('x')} cakupan={d.get('cakupan_pct')}", flush=True)
        with ThreadPoolExecutor(a.paralel) as ex:
            list(ex.map(kerja, todo))
    baris = [sudah["|".join(q)] for q in pas if "|".join(q) in sudah]
    if len(baris) < len(pas):
        sys.exit(f"belum lengkap: {len(baris)} dari {len(pas)} pasangan terbaca; jalankan ulang (cache dilanjutkan), vonis belum ditulis")
    pakai = [{"x": r["x"], "y": y[tuple(q)], "naif_1": r["naif_1"], "naif_2": r["naif_2"], "naif_3": r["naif_3"], "blok": GK.blok(q[0], q[2])}
             for q, r in zip(pas, baris) if r["sah"] and None not in (r.get("x"), r["naif_1"], r["naif_2"], r["naif_3"])]
    hit = lambda f: sum(1 for r in baris if f(r))
    rin = {"gagal_baca": hit(lambda r: r["status"] == "gagal"), "tanpa_poligon": hit(lambda r: r["status"] == "tanpa_poligon"),
           "tak_sah_radar": hit(lambda r: r["status"] not in ("gagal", "tanpa_poligon") and not r["sah"]),
           "sah_radar_tanpa_penduduk": hit(lambda r: r["sah"] and r.get("x") is None),
           "sah_radar_tanpa_naif": hit(lambda r: r["sah"] and r.get("x") is not None and None in (r["naif_1"], r["naif_2"], r["naif_3"])),
           "sah_radar": hit(lambda r: r["sah"]), "status": {k: hit(lambda r, k=k: r["status"] == k) for k in sorted({r["status"] for r in baris})}}
    assert rin["gagal_baca"] + rin["tanpa_poligon"] + rin["tak_sah_radar"] + rin["sah_radar"] == len(pas)
    assert rin["sah_radar"] - rin["sah_radar_tanpa_penduduk"] - rin["sah_radar_tanpa_naif"] == len(pakai)
    if rin["gagal_baca"] > GAGAL_MAKS:
        sys.exit(f"gagal baca {rin['gagal_baca']} dari {len(pas)} melebihi {GAGAL_MAKS}: jalan dianggap rusak, vonis tidak ditulis; ulangi dengan --ulang-gagal")
    v = nilai_vonis(pakai, K, len(pas))
    v["rincian"] = rin
    v.update(tiket="GS-13", tanggal=dt.date.today().isoformat(), kriteria_versi=K["versi"], kriteria_sidik=s["sidik"], cache_sidik=hashlib.sha256(
        "".join(json.dumps(r, sort_keys=True) for r in baris).encode()).hexdigest())
    print(json.dumps(v, ensure_ascii=False, indent=1))
    if a.kering:
        return
    s["vonis"] = v
    open(SID, "w").write(json.dumps(s, indent=1, ensure_ascii=False) + "\n")
    # berkas vonis menutup prasyarat dan versi-baru lewat mesin kunci yang sudah teruji (genangan_kriteria.periksa_kunci: ada atau pernah di git)
    open(GK.VONIS, "w").write(json.dumps(v, indent=1, ensure_ascii=False) + "\n")
    os.makedirs(os.path.dirname(RINGKAS), exist_ok=True)
    open(RINGKAS, "w").write(ringkas_md(v, K))
    print(f"vonis {v['label']} ditulis ke {os.path.relpath(SID, AKAR)} dan {os.path.relpath(RINGKAS, AKAR)}; jangkar dengan commit")


def ringkas_md(v, K):
    f = lambda x: "tidak terdefinisi" if x is None else f"{x:.2f}".replace(".", ",")
    nm = {n["id"]: n["nama"] for n in K["naif"]}
    t = [f"# Uji balik genangan satelit per kejadian (GS-13)", "",
         f"Vonis: **{v['label'].replace('_', ' ')}**. Kriteria versi {v['kriteria_versi']}, dikunci sebelum hitungan (GS-02), dijalankan {v['tanggal']}.", "",
         "Yang diuji: apakah peringkat kabupaten menurut penduduk di area genangan (Copernicus GFM, WorldPop, rentang tengah) sejalan dengan "
         "peringkat terdampak menurut DIBI, pada pasangan kab-hari banjir 2024 dan sesudahnya. Bukan angka mutlak, dan bukan kemampuan membedakan banjir dari tidak banjir.", "",
         "| Ukuran | Nilai |", "| --- | --- |",
         f"| Pasangan sampel dipilih | {v['dipilih']} |", f"| Pasangan sah dari radar | {v['rincian']['sah_radar']} |", f"| Pasangan dipakai menilai | {v['sah']} |", f"| Blok sah (provinsi x minggu) | {v['blok_sah']} |",
         f"| Gagal baca | {v['rincian']['gagal_baca']} |", f"| Tak sah dari radar | {v['rincian']['tak_sah_radar']} |",
         f"| Tanpa poligon kab | {v['rincian']['tanpa_poligon']} |",
         f"| Sah dari radar, penduduk tidak tersedia | {v['rincian']['sah_radar_tanpa_penduduk']} |",
         f"| Sah dari radar, pembanding tidak tersedia | {v['rincian']['sah_radar_tanpa_naif']} |"]
    if "rho" in v:
        t += [f"| Spearman model | {f(v['rho'])} (syarat paling sedikit 0,40) |"]
        t += [f"| Spearman {nm[k]} | {f(r)}; selisih CI 90 persen {f(v['ci_selisih'][k][0]) if v['ci_selisih'][k] else 'tidak terdefinisi'} sampai "
              f"{f(v['ci_selisih'][k][1]) if v['ci_selisih'][k] else 'tidak terdefinisi'} |" for k, r in v["rho_naif"].items()]
    else:
        t += ["", f"Tidak dinilai: {v['alasan']}."]
    t += ["", "Keterbatasan:", "",
          "- Tanggal DIBI adalah tanggal lapor. Citra pembanding dipilih paling lambat 7 hari sebelum tanggal itu (K6), tapi wilayah bisa sudah tergenang lebih awal (Q11).",
          "- Batas 7 hari dibandingkan pada tanggal UTC lintasan, bawaan sementara Q14.",
          "- Penduduk hanya WorldPop yang dibagi ke bangunan; Dukcapil tidak dipakai di uji ini.",
          "- Pil hipotesis tetap kecuali vonis lulus.", "",
          "Sumber: Copernicus Emergency Management Service, Global Flood Monitoring (GFM), EODC; DIBI BNPB; WorldPop; bangunan Google Open Buildings v3 dan Overture Maps.", ""]
    return "\n".join(t)


def _uji():
    P, KB = _P(), _muat("scripts/siklus/kaji_banjir.py")
    # GS-13: Spearman dengan seri, tanpa ragam = None (bukan 0), vonis menurut kriteria
    assert peringkat([3, 1, 3]) == [2.5, 1.0, 2.5] and abs(spearman([1, 2, 3, 4], [10, 20, 30, 40]) - 1) < 1e-12
    assert abs(spearman([1, 2, 3, 4], [4, 3, 2, 1]) + 1) < 1e-12 and spearman([1, 1, 1], [1, 2, 3]) is None
    assert kuantil([0, 10], 0.05) == 0.5
    Kd = {"lulus": {"n_blok_sah_min": 20, "rho_min": 0.4, "batas_bawah_ci_selisih_min_eksklusif": 0.0, "terhadap": ["naif_1"], "label_bila_lulus": "lulus"},
          "bootstrap": {"seed": 1, "ulang": 200, "ci_persen": 90}, "tak_dapat_dinilai": {"label": "tak_dapat_dinilai", "bila": "x"}, "naif": [{"id": "naif_1"}]}
    bar = [{"x": i, "y": i * 2 + (i % 3), "naif_1": (i * 7) % 13, "blok": f"b{i % 30}"} for i in range(90)]
    assert nilai_vonis(bar, Kd, 300)["label"] == "lulus"
    assert nilai_vonis(bar[:19], Kd, 30)["label"] == "tak_dapat_dinilai", "blok < 20"
    assert nilai_vonis(bar, Kd, 400)["label"] == "tak_dapat_dinilai", "sah/dipilih < 0,30"
    rata = [{**b, "x": 5} for b in bar]
    assert nilai_vonis(rata, Kd, 300)["label"] == "tak_dapat_dinilai", "rho tak terdefinisi bukan gagal"
    acak = [{**b, "x": (b["x"] * 37) % 11} for b in bar]
    assert nilai_vonis(acak, Kd, 300)["label"] == "gagal"
    assert "Vonis: **lulus**" in ringkas_md({**nilai_vonis(bar, Kd, 300), "rincian": {"gagal_baca": 0, "tanpa_poligon": 0, "tak_sah_radar": 1, "sah_radar": 90, "sah_radar_tanpa_penduduk": 0, "sah_radar_tanpa_naif": 0},
                                             "tanggal": "2026-11-26", "kriteria_versi": 2}, {"naif": [{"id": "naif_1", "nama": "luas kab"}]})
    # versi: kosong -> 1; lintasan sama -> tetap; beda -> n+1; yang lama tidak ditimpa
    with tempfile.TemporaryDirectory() as t:
        kj, d = "KJ-UJI", os.path.join(t, "siklus/saji/kaji")
        assert versi(t, kj, "s1") == (1, True)
        os.makedirs(d)
        json.dump({"sidik_masukan": "s1"}, open(os.path.join(d, f"{kj}_banjir_gfm_v1.json"), "w"))
        assert versi(t, kj, "s1") == (1, False) and versi(t, kj, "s2") == (2, True)
    # sel: kecil tetap 110 m; ribuan sel digabung ke 330 m dan muat 300 KB
    k, sm = sel_geojson([(100.0005, -1.0005, 0.4)])
    assert sm == 110 and json.loads(k)["features"][0]["properties"] == {"ha": 0.4}
    besar = [(94.0 + (j + .5) / 1000, -12.0 + (i + .5) / 1000, 0.3) for i in range(0, 70) for j in range(0, 70)]
    d, sm = sel_geojson(besar)
    assert sm == 330 and len(d) <= MAKS_GEOJSON, (sm, len(d))
    # tingkat ketiga: sel jarang 330 m (>300 KB) tapi muat di 550 m; total ha terjaga
    lebar = [(94.0 + (j * 3 + .5) / 1000, -12.0 + (i * 3 + .5) / 1000, 0.3) for i in range(0, 60) for j in range(0, 60)]
    d, sm = sel_geojson(lebar)
    assert sm in (550, 1100) and len(d) <= MAKS_GEOJSON, (sm, len(d))
    assert abs(sum(f["properties"]["ha"] for f in json.loads(d)["features"]) - 0.3 * len(lebar)) <= 0.0005 * 0.3 * len(lebar)
    # tak muat di tingkat terkasar: alasan tertulis, bukan diam
    d, sm = sel_geojson([(94.0 + k * 0.011, -12.0, 0.1) for k in range(8000)])
    assert sm == 1100 and len(d) > MAKS_GEOJSON and "catatan" in json.loads(d)
    # atribusi bangunan per provinsi terpakai (K9): Aceh Overture, lain Open Buildings, provinsi tanpa paparan tidak disebut
    sf = {"11": "Overture Maps buildings rilis x", "12": "Google Open Buildings v3 (Sirko)"}.get
    assert atribusi_bangunan(["11", "12", "12", None], sf) == ["Overture Maps Foundation, kontributor OpenStreetMap, ODbL 1.0 (bangunan untuk pembagian penduduk)",
                                                              "Google Open Buildings v3, CC BY 4.0 (bangunan untuk pembagian penduduk)"]
    assert atribusi_bangunan(["12"], sf) == ["Google Open Buildings v3, CC BY 4.0 (bangunan untuk pembagian penduduk)"] and atribusi_bangunan([], sf) == []
    # kasus ALGORITMA 4 lewat hitung_kab asli: WorldPop bawah 100, atas 400, GHSL tidak tersedia
    hs = P._ha_sel(P.BG.LAT0 + 500.5 / P.BG.HALUS)
    ctr = lambda i, j: (P.BG.LON0 + (j + .5) / P.BG.HALUS, P.BG.LAT0 + (i + .5) / P.BG.HALUS)
    sel = [(500, 500, 10, 1000, "K", *ctr(500, 500)), (500, 501, 30, 3000, "K", *ctr(500, 501)), (500, 502, 60, 6000, "K", *ctr(500, 502))]
    titik = [(*ctr(500, 500), 0.6 * hs), (*ctr(500, 501), 0.2 * hs)]
    z = P.zona_gfm(titik, 0.0006)
    pap = P.hitung_kab(sel, [z["bawah"], z["atas"]], [], {"K": 1000})
    gf = {"kab4": "0001", "prov": "99", "kab": "Uji", "status": "ok", "sah": True, "lintasan": "2025-11-28T23:00:00Z", "pra": "2025-11-10T23:00:00Z", "langkah": 0.0006, "kisi_kasar": False,
          "tampil": {"baru_ha": 5.0, "persen_teramati": 10.0}, "mentah": {"luas_ha": 100.0, "teramati_ha": 50.0, "cakupan_pct": 50.0, "baru_ha": 5.0, "kec": {"K": {"luas_ha": 100.0, "mask_ha": 10.0}}, "titik_baru": [list(x) for x in titik]}}
    r = KB.banjir_gfm([{"gfm": gf, "paparan": pap}])
    assert r["ringkas"]["rentang"] == [100, 400] and r["kab"][0]["penduduk"]["ghsl"]["tersedia"] is False and r["kab"][0]["penduduk"]["dukcapil"]["tersedia"] is False
    # perakit ujung ke ujung dengan berkas palsu: provinsi tanpa grid (Aceh) = tak ada angka penduduk, kab keluar dari jiwa_kab_sah, tidak 0
    with tempfile.TemporaryDirectory() as t:
        kej = os.path.join(t, "kej")
        os.makedirs(os.path.join(kej, "KJ-UJI_citra"))
        tak = {**gf, "kab4": "0002", "sah": False, "tampil": {"baru_ha": None, "alasan": "sinyal lemah"}}
        json.dump({"kj": "KJ-UJI", "mulai": "2025-11-26", "ambang": {}, "sumber": "GFM", "kab": [gf, tak]}, open(os.path.join(kej, "KJ-UJI.json"), "w"))
        open(os.path.join(kej, "KJ-UJI_citra", "0001_radar_pra.png"), "wb").write(b"\x89PNG" + b"0" * 100)
        json.dump({"atribusi": ["Sentinel"], "kab": [{"kab4": "0001", "citra": {"radar_pra": {"status": "ok", "berkas": "0001_radar_pra.png"}, "asli_pra": {"status": "tertutup awan"}}}]}, open(os.path.join(kej, "KJ-UJI_citra.json"), "w"))
        aceh = lambda g: (None, "data bangunan belum tersedia (grid halus provinsi 99 tidak ada)")
        keluar = os.path.join(t, "keluar")
        n, baru, h, m, b = rakit("KJ-UJI", ["0001", "0002"], keluar, kej, aceh, "sidik-uji")
        assert (n, baru, m) == (1, True, []) and h["ringkas"]["rentang"] is None and h["ringkas"]["kab_tanpa_angka_penduduk"] == 2 and h["ringkas"]["status_model"] == "hipotesis" and h["ringkas"]["kab_sah"] == 1
        assert "alasan_rentang" in h["ringkas"] and "penduduk" not in h["kab"][1] and "total" not in json.dumps(h)
        assert sorted(k.rsplit("/", 1)[1] for k, _ in b) == ["0001_radar_pra.png", "0001_sel.geojson"]
        assert rakit("KJ-UJI", ["0001", "0002"], keluar, kej, aceh, "sidik-uji")[:2] == (1, False)
        # lintasan sama, penduduk berubah None -> angka: versi naik, v1 tidak ditimpa
        v1 = open(os.path.join(keluar, "siklus/saji/kaji/KJ-UJI_banjir_gfm_v1.json"), "rb").read()
        assert rakit("KJ-UJI", ["0001", "0002"], keluar, kej, lambda g: (pap, None), "sidik-uji")[:2] == (2, True)
        assert open(os.path.join(keluar, "siklus/saji/kaji/KJ-UJI_banjir_gfm_v1.json"), "rb").read() == v1
        assert rakit("KJ-UJI", ["0001", "0002"], keluar, kej, lambda g: (pap, None), "sidik-uji")[:2] == (2, False)
        assert rakit("KJ-UJI", ["0001", "0002"], keluar, kej, lambda g: (pap, None), "kriteria-lain")[:2] == (3, True), "sidik kriteria beda = versi naik"
        gf2 = {**gf, "lintasan": "2025-12-10T23:00:00Z"}
        json.dump({"kj": "KJ-UJI", "mulai": "2025-11-26", "ambang": {}, "sumber": "GFM", "kab": [gf2, tak]}, open(os.path.join(kej, "KJ-UJI.json"), "w"))
        assert rakit("KJ-UJI", ["0001", "0002"], keluar, kej, aceh, "sidik-uji")[:2] == (4, True) and os.path.exists(os.path.join(keluar, "siklus/saji/kaji/KJ-UJI_banjir_gfm_v1.json"))
    # GS-12 pilih: hanya banjir fase tanggap dalam jendela; --kj melewati saringan; kab = kejadian + sumber terpasang
    kini = dt.date(2025, 12, 1)
    jd = [{"id": "KJ-A", "jenis": "banjir", "fase": "tanggap", "mulai": "2025-11-26", "kab4": "1116"},
          {"id": "KJ-B", "jenis": "banjir", "fase": "terverifikasi", "mulai": "2025-11-26", "kab4": "1201"},
          {"id": "KJ-C", "jenis": "gempa", "fase": "tanggap", "mulai": "2025-11-26", "kab4": "1201"},
          {"id": "KJ-D", "jenis": "banjir", "fase": "tanggap", "mulai": "2025-11-01", "kab4": "1201"},
          {"id": "KJ-E", "jenis": "banjir", "fase": "tanggap", "mulai": "2025-11-27", "kab4": None}]
    sb = [{"kejadian_id": "KJ-A", "status": "terpasang", "kab4": "1108"}, {"kejadian_id": "KJ-A", "status": "ditolak", "kab4": "1109"},
          {"kejadian_id": "KJ-A", "status": "terpasang", "kab4": "1116"}]
    assert pilih(jd, sb, kini) == [("KJ-A", "2025-11-26", ["1108", "1116"])]
    assert pilih(jd, sb, kini, "KJ-D") == [("KJ-D", "2025-11-01", ["1201"])] and pilih(jd, sb, kini, "KJ-X") == []
    print("uji genangan_kaji: lulus")


if __name__ == "__main__":
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("mode", choices=["jalan", "kirim", "prasyarat", "uji", "vonis"])
    ap.add_argument("--basis", default="https://centurisk97.id")
    ap.add_argument("--wrangler")
    ap.add_argument("--kirim", action="store_true", help="kirim: kirim sungguhan ke Worker (tanpa ini kering)")
    ap.add_argument("--kj")
    ap.add_argument("--mulai")
    ap.add_argument("--kab", nargs="*")
    ap.add_argument("--keluar", default=KELUAR)
    ap.add_argument("--ulang", action="store_true")
    ap.add_argument("--kering", action="store_true", help="jalan: cache saja, tanpa unduh langkah banjir; vonis: cetak tanpa menulis sidik dan ringkasan")
    ap.add_argument("--paralel", type=int, default=2, help="vonis: pasangan dibaca bersamaan")
    ap.add_argument("--ulang-gagal", action="store_true", help="vonis: baca ulang pasangan berstatus gagal (galat infrastruktur)")
    a = ap.parse_args()
    if a.mode == "uji":
        _uji()
    elif a.mode == "prasyarat":
        sys.exit(subprocess.run([sys.executable, os.path.join(AB, "genangan_kriteria.py"), "prasyarat"]).returncode)
    elif a.mode == "kirim":
        sys.exit(_kirim(a))
    elif a.mode == "vonis":
        _vonis(a)
    else:
        if not (a.kj and a.mulai and a.kab):
            sys.exit("jalan butuh --kj, --mulai, --kab")
        sys.exit(_jalan(a))
