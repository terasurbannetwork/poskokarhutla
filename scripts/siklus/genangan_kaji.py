"""GS-07: perakit genangan satelit per kejadian (data/kajian-bnpb/genangan-satelit/DESAIN-TEKNIS.md bagian 3 dan 4).

Menjalankan langkah banjir GS-01 (genangan_nasional kejadian), GS-04 (genangan_lahan), GS-05 (citra_banjir kejadian) bila keluarannya belum ada,
lalu paparan (paparan.zona_gfm + hitung_kab), lalu menyusun kaji_banjir.banjir_gfm menjadi berkas R2 LOKAL di data/raw/siklus/kaji (gitignored):
  siklus/saji/kaji/<kj>_banjir_gfm_v<n>.json, siklus/saji/kaji_berkas/<kj>/banjir_gfm/v<n>/<kab4>_sel.geojson dan <kab4>_<citra>.png.
Versi v<n> naik hanya bila lintasan satu kab berubah; versi lama tidak ditimpa. Tidak mengunggah ke R2 atau D1 (rute Worker dan migrasi = GS-08).
Provinsi tanpa data/terkunci/bangunan/halus_<prov>.json: penduduk "data bangunan belum tersedia", kab itu keluar dari jiwa_kab_sah, tidak pernah 0.
Pakai: python3 scripts/siklus/genangan_kaji.py jalan --kj KJ --mulai TGL --kab 1116 1201 [--kering] [--ulang] [--keluar DIR] | prasyarat | uji | vonis
       python3 scripts/siklus/genangan_kaji.py kirim --keluar AKAR_SAJI [--kj KJ] [--wrangler W] [--basis URL] [--kirim]   (GS-12, siklus.yml; env PIPA_TOKEN)
  kirim: kejadian Q2 dari Buku Besar (banjir, fase tanggap, mulai <= JENDELA_HARI hari lalu; atau --kj yang dibuka staf), versi terakhir ditarik dari R2,
  langkah banjir dijalankan ulang, versi baru dikirim ke /api/siklus/ingest/kaji; berkasnya disalin ke --keluar (diunggah gudang.py) HANYA bila D1 menerima
  versi yang sama, jadi versi di R2 dan baris D1 tetap selangkah.
"""
import argparse, datetime as dt, glob, hashlib, importlib.util, json, math, os, re, shutil, subprocess, sys, tempfile

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


def _uji():
    P, KB = _P(), _muat("scripts/siklus/kaji_banjir.py")
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
    ap.add_argument("--kering", action="store_true", help="cache saja, tanpa unduh langkah banjir")
    a = ap.parse_args()
    if a.mode == "uji":
        _uji()
    elif a.mode == "prasyarat":
        sys.exit(subprocess.run([sys.executable, os.path.join(AB, "genangan_kriteria.py"), "prasyarat"]).returncode)
    elif a.mode == "kirim":
        sys.exit(_kirim(a))
    elif a.mode == "vonis":
        print("vonis: belum dijalankan (GS-13)")
    else:
        if not (a.kj and a.mulai and a.kab):
            sys.exit("jalan butuh --kj, --mulai, --kab")
        sys.exit(_jalan(a))
