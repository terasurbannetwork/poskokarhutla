"""GS-02: kunci kriteria uji balik genangan satelit (data/kajian-bnpb/genangan-satelit/ALGORITMA.md bagian 7, DESAIN-TEKNIS bagian 1).

Tidak membaca raster. `layak` menghitung pasangan kab-hari DIBI yang SECARA METADATA bisa diuji (lintasan GFM 0-6 hari sesudah tanggal DIBI,
kandidat pra 8-45 hari sebelum lintasan dan sebelum tanggal DIBI), membaginya kalibrasi lawan uji menurut waktu, lalu menulis
genangan_kriteria.json dan genangan_sidik.json (jangkar_commit KOSONG; sesi induk mengisinya sesudah commit).
Memakai ulang scripts/banjir/genangan_nasional.py (Katalog, pilih_pra, Titik/GRID/maju, STAC). Pola kunci ditiru dari kerusakan.periksa_kunci.

Pakai:  python3 -I scripts/siklus/genangan_kriteria.py uji          self-check tanpa jaringan
        python3 -I scripts/siklus/genangan_kriteria.py layak        tarik metadata STAC bulanan (cache), tulis kriteria + sidik
        python3 -I scripts/siklus/genangan_kriteria.py layak --luring   sama, tanpa jaringan: pakai cache bulanan apa adanya (juga bulan berjalan)
        python3 -I scripts/siklus/genangan_kriteria.py versi-baru --alasan "..."   kunci ulang (versi naik, riwayat mencatat sidik + jangkar lama);
                                                                    hanya bila versi lama berjangkar & utuh dan genangan_vonis.json belum ada
        python3 -I scripts/siklus/genangan_kriteria.py prasyarat    tolak bila sidik hilang, jangkar kosong, sidik beda, jangkar bukan leluhur HEAD,
                                                                    riwayat kunci putus, atau genangan_vonis.json ada/pernah ada di git (gerbang tests/agen/gerbang-genangan-kriteria.test.mjs)
Langkah CI yang menjalankan `prasyarat` butuh checkout `fetch-depth: 0` (git show dan merge-base atas commit jangkar).
"""
import datetime as dt, hashlib, importlib.util, json, os, subprocess, sys, tempfile, time
from concurrent.futures import ThreadPoolExecutor

AB = os.path.dirname(os.path.abspath(__file__))
AKAR = os.path.normpath(os.path.join(AB, "../.."))
KRI = os.path.join(AB, "genangan_kriteria.json")
SID = os.path.join(AB, "genangan_sidik.json")
KERUSAKAN = os.path.join(AB, "kerusakan_kriteria.json")
CACHE = os.path.join(AKAR, "data/raw/banjir/gfm_nasional/layak")   # gitignored (data/raw/banjir/*)
BATAS_UJI = "2024-01-01"
VONIS = os.path.join(AB, "genangan_vonis.json")   # ditulis GS-13; adanya berkas ini menutup jalan versi-baru
MARGIN_PRA = 7         # hari (K6, pemilik 25 Nov 2026): pra paling lambat tanggal DIBI - 7, SAMA DENGAN itu diterima (pra <= DIBI - 7)
JENDELA = 6            # hari sesudah tanggal DIBI (genangan_nasional.JENDELA["dibi"])
JARAK_EPISODE = 30     # hari: pasangan uji harus lebih jauh dari ini dari episode terlihat di provinsi yang sama
EPISODE = [            # (provinsi, mulai, akhir, kode): episode yang sudah terlihat
    ({"11", "12", "13"}, "2025-11-01", "2026-02-28", "sumatera2025"),
    ({"11"}, "2026-09-01", "2026-10-31", "aceh2026"),
    ({"33"}, "2024-01-25", "2024-04-15", "demak2024"),
    ({"33"}, "2025-12-15", "2026-02-05", "kerusakan_ks"),
]


class Tolak(RuntimeError):
    """kriteria tidak terkunci: uji balik tidak boleh jalan"""


def _gn():
    s = importlib.util.spec_from_file_location("genangan_nasional", os.path.join(AKAR, "scripts/banjir/genangan_nasional.py"))
    m = importlib.util.module_from_spec(s)
    sys.modules["genangan_nasional"] = m
    s.loader.exec_module(m)
    return m


# ---------------------------------------------------------------- kunci (tiruan kerusakan.periksa_kunci)
def sidik_isi(isi):
    return hashlib.sha256(isi[:-1] if isi.endswith(b"\n") else isi).hexdigest()


def periksa_kunci(kri=KRI, sid=SID, git=True, akar=AKAR, vonis=VONIS):
    """-> kriteria (dict). Tolak bila jangkar kosong, sidik beda, isi di commit jangkar beda, jangkar bukan leluhur HEAD,
    riwayat kunci putus (jangkar lama bukan leluhur jangkar baru, atau isi lama tidak cocok sidik lama), atau berkas vonis pernah ada di git."""
    if not os.path.exists(sid):
        raise Tolak("genangan_sidik.json hilang: kriteria tidak punya sidik terkunci")
    s = json.load(open(sid))
    if not s.get("jangkar_commit"):
        raise Tolak("jangkar_commit kosong: kriteria belum dijangkar ke commit")
    isi = open(kri, "rb").read()
    if sidik_isi(isi) != s["sidik"]:
        raise Tolak("sidik berkas kriteria tidak cocok dengan genangan_sidik.json: kriteria berubah sesudah dikunci")
    if git:
        rel = os.path.relpath(kri, akar)
        r = subprocess.run(["git", "-C", akar, "show", f"{s['jangkar_commit']}:{rel}"], capture_output=True)
        if r.returncode or r.stdout != isi:
            raise Tolak("isi kriteria berbeda dari commit jangkar (atau commit jangkar tidak ada)")
        leluhur = lambda a, b: not subprocess.run(["git", "-C", akar, "merge-base", "--is-ancestor", a, b], capture_output=True).returncode
        if not leluhur(s["jangkar_commit"], "HEAD"):
            raise Tolak("commit jangkar bukan leluhur HEAD")
        # riwayat kunci: tiap jangkar lama leluhur jangkar sesudahnya, isinya di jangkar lama cocok sidik lama
        rantai = list(s.get("riwayat", [])) + [{"versi": s.get("versi"), "sidik": s["sidik"], "jangkar_commit": s["jangkar_commit"]}]
        for lama, baru in zip(rantai, rantai[1:]):
            if not lama.get("jangkar_commit") or not leluhur(lama["jangkar_commit"], baru["jangkar_commit"]):
                raise Tolak(f"jangkar versi {lama.get('versi')} bukan leluhur jangkar versi {baru.get('versi')}")
            r = subprocess.run(["git", "-C", akar, "show", f"{lama['jangkar_commit']}:{rel}"], capture_output=True)
            if r.returncode or sidik_isi(r.stdout) != lama.get("sidik"):
                raise Tolak(f"isi kriteria versi {lama.get('versi')} di commit jangkarnya tidak cocok sidik lamanya")
        # uji balik yang sudah pernah dijalankan menutup jalan, walau berkas vonis sudah dihapus
        rv = os.path.relpath(vonis, akar)
        r = subprocess.run(["git", "-C", akar, "log", "--all", "--format=%H", "--", rv], capture_output=True, text=True)
        if r.returncode or r.stdout.strip() or os.path.exists(vonis):
            raise Tolak(f"{rv} ada atau pernah ada di riwayat git (atau riwayat tak terbaca): uji balik GS-13 sudah dijalankan")
    return json.loads(isi)


# ---------------------------------------------------------------- pembagian dan pasangan terlarang
def episode_kerusakan(berkas=KERUSAKAN, indeks=(205, 209, 212, 218)):
    """pasangan kalibrasi kerusakan-satelit -> episode (provinsi, mulai-14 hari, akhir+14 hari, kode)."""
    K = json.load(open(berkas))
    out = []
    for i in indeks:
        p = dict(zip(K["pasangan_kolom"], K["pasangan"][i]))
        d = dt.timedelta(days=14)
        out.append(({p["id_kab_sumber"].split(".")[0]}, (dt.date.fromisoformat(p["mulai"]) - d).isoformat(),
                    (dt.date.fromisoformat(p["akhir"]) + d).isoformat(), "kerusakan_ks"))
    return EPISODE + out


def terlihat(prov, tgl, episode):
    """-> kode episode terlihat bila [tgl, tgl+6] berjarak <= 30 hari dari episode di provinsi yang sama, selain itu None."""
    d = dt.date.fromisoformat(tgl)
    margin = dt.timedelta(days=JARAK_EPISODE)
    for provs, a, b, kode in episode:
        if prov in provs and d + dt.timedelta(days=JENDELA) >= dt.date.fromisoformat(a) - margin and d <= dt.date.fromisoformat(b) + margin:
            return kode
    return None


def bagian(prov, tgl, episode):
    """-> (bagian, catatan). Kalibrasi bila dekat episode terlihat atau sebelum 2024; selain itu uji."""
    k = terlihat(prov, tgl, episode)
    if k:
        return "kalibrasi", k
    return ("kalibrasi", "") if tgl < BATAS_UJI else ("uji", "")


def blok(prov, tgl):
    """unit bootstrap: (provinsi, minggu ISO tanggal DIBI)"""
    y, w, _ = dt.date.fromisoformat(tgl).isocalendar()
    return f"{prov}|{y}-W{w:02d}"


def urut_sampel(prov, kab, tgl):
    return hashlib.sha256(f"{prov}|{kab}|{tgl}".encode()).hexdigest()


# ---------------------------------------------------------------- kelayakan dari metadata
def pra_sebelum_acuan(kat, ubin, awal, margin=MARGIN_PRA):
    """lintasan ubin yang jatuh paling lambat awal - margin hari (K6; batas inklusif: pra tepat di awal - margin diterima)."""
    batas = (awal - dt.timedelta(days=margin)).isoformat()
    return [k for k in kat.ub.get(ubin, []) if k["t"][:10] <= batas]


def layak_satu(gn, kat, frak, awal, margin=MARGIN_PRA):
    """-> (n_kandidat, tanggal_pra) bila ada lintasan 0-6 hari sesudah awal dengan pra sah; selain itu None."""
    cand = kat.kandidat(frak, awal, awal + dt.timedelta(days=JENDELA))[:gn.MAKS_KANDIDAT]
    for n, l in cand:
        pra = gn.pilih_pra(pra_sebelum_acuan(kat, n, awal, margin), l)
        if pra:
            return len(cand), pra["t"][:10]
    return None


# ---------------------------------------------------------------- metadata STAC (bulanan, cache; tanpa raster)
LURING = False   # True: cache dipakai walau bulan berjalan; bulan yang belum di-cache tetap menarik


def bulan_cache(gn, ym):
    f = os.path.join(CACHE, ym + ".json")
    if os.path.exists(f) and (LURING or ym < dt.date.today().strftime("%Y-%m")):
        return json.load(open(f))
    akhir = gn.bulan_berikut(ym)
    badan = {"collections": ["GFM"], "bbox": gn.KOTAK, "limit": 500, "datetime": f"{ym}-01T00:00:00Z/{akhir}-01T00:00:00Z",
             "fields": {"include": ["id", "properties.datetime", "properties.Equi7Tile", "assets.ensemble_flood_extent", "assets.reference_water_mask"]}}
    out, ref = [], {}
    while badan:
        d = gn.stac_post(badan)
        for f_ in d["features"]:
            a = f_["assets"]
            if "ensemble_flood_extent" not in a:
                continue
            ub = f_["properties"]["Equi7Tile"]
            if a.get("reference_water_mask"):
                ref[ub] = 1
            if f_["properties"]["datetime"][:7] == ym:
                out.append([f_["id"], f_["properties"]["datetime"], ub])
        nx = next((l for l in d.get("links", []) if l.get("rel") == "next"), None)
        badan = nx.get("body") if nx and nx.get("method") == "POST" and d["features"] else None
        time.sleep(gn.JEDA)
    os.makedirs(CACHE, exist_ok=True)
    tmp = f + ".tmp"
    json.dump({"item": out, "ref": sorted(ref)}, open(tmp, "w"))
    os.replace(tmp, f)
    return {"item": out, "ref": sorted(ref)}


def muat_katalog(gn, dari="2015-01"):
    bulan, ym, ini = [], dari, dt.date.today().strftime("%Y-%m")
    while ym <= ini:
        bulan.append(ym)
        ym = gn.bulan_berikut(ym)
    with ThreadPoolExecutor(4) as ex:
        hasil = list(ex.map(lambda b: bulan_cache(gn, b), bulan))
    ref_ok = {u for h in hasil for u in h["ref"]} | set(gn.baca(os.path.join(gn.DIR, "ubin_ref.json"), {}))
    item = {i: {"id": i, "t": t, "ub": u, "f": "x", "m": "", "fp": 0, "an": False, "r": "x" if u in ref_ok else None}
            for h in hasil for i, t, u in h["item"]}
    return gn.Katalog(item)


def frak_kab(gn, prov, kab, ada, n=60):
    """{ubin: bagian} dari simpul batas kab (bukan area): metadata saja, tanpa Titik/raster. Hanya ubin yang ada di katalog."""
    kec = gn.kec_kab(prov, kab)
    simpul = [p for rs in kec.values() for r in rs for p in r]
    if not simpul:
        return None
    langkah = max(1, len(simpul) // n)
    cnt, tot = {}, 0
    for lon, lat in simpul[::langkah]:
        tot += 1
        for g in gn.GRID:
            x, y = gn.maju(g, lon, lat)
            nm = f"{g}020M_E{int(x // 300000) * 3:03d}N{int(y // 300000) * 3:03d}T3"
            if nm in ada:
                cnt[nm] = cnt.get(nm, 0) + 1
    return {k: v / tot for k, v in cnt.items()} or None


# ---------------------------------------------------------------- kriteria
def dasar(versi=1):
    return {
        "versi": versi, "margin_pra_hari": MARGIN_PRA if versi >= 2 else 0, "tiket": "GS-02", "paket": "data/kajian-bnpb/genangan-satelit",
        "rujukan": "ALGORITMA.md bagian 7 dan 2; KEPUTUSAN-GENANGAN.md Q4 dan Q5 (bawaan sementara)",
        "satuan": "pasangan kab-hari DIBI banjir atau banjir bandang dengan terdampak > 0; lintasan GFM 0 sampai 6 hari sesudah tanggal DIBI; "
                  "kandidat pra 8 sampai 45 hari sebelum lintasan dan paling lambat tanggal DIBI dikurangi margin_pra_hari (--pra-sebelum-acuan; v1 tanpa margin, v2 N = 7 hari, pemilik 25 Nov 2026; sama dengan batas diterima); cakupan sah",
        "x": "WorldPop tengah = (bawah + atas) / 2, penduduk di area genangan (mesin paparan F2)",
        "y": "DIBI terdampak kab-hari itu",
        "statistik": "Spearman(x, y)",
        "naif": [{"id": "naif_1", "nama": "luas kab"}, {"id": "naif_2", "nama": "penduduk WorldPop seluruh kab"},
                 {"id": "naif_3", "nama": "luas tergenang baru (ha)"}],
        "bootstrap": {"berpasangan": True, "unit": "blok = (provinsi, minggu ISO tanggal DIBI)", "ulang": 2000, "ci_persen": 90, "seed": 20261124,
                      "selisih": "rho - rho(naif_k); blok yang sama diresampel untuk model dan naif, semua pasangan sah dalam blok ikut"},
        "lulus": {"n_blok_sah_min": 20, "n_pasangan_dicatat_di_samping": True, "rho_min": 0.4, "batas_bawah_ci_selisih_min_eksklusif": 0.0, "terhadap": ["naif_1", "naif_2", "naif_3"],
                  "label_bila_lulus": "lulus"},
        "tak_dapat_dinilai": {"bila": "blok sah < 20, atau sah/dipilih < 0,30 pada sampel uji", "label": "tak_dapat_dinilai", "pil": "hipotesis tetap"},
        "ambang": {"cakupan_pct_min": 10, "sinyal_lemah": False, "zona_bawah": 0.5, "status": "HIPOTESIS (Q4, bawaan sementara)",
                   "beku": True, "alasan_beku": "dikunci pada nilai bawaan sebelum kalibrasi dijalankan; tidak disetel lagi"},
        "sampel_uji": {"urutan": "sha256 dari 'prov|kab|tanggal' naik", "N": 300, "status_N": "HIPOTESIS, bawaan sementara: anggaran baru diukur GS-03",
                       "aturan": ["GS-13 membaca persis N pertama dari daftar urutan; tidak boleh menambah, mengganti, atau berhenti lebih awal berdasar hasil",
                                  "gagal baca tetap masuk penyebut",
                                  "laporan wajib memuat: dipilih, sah, gagal baca, tak sah",
                                  "sah/dipilih < 0,30 atau blok sah < 20: tak_dapat_dinilai"]},
        "pembanding_sekunder": {"nama": "rumah terendam per kab-hari", "ikut_vonis": False, "status": "bawaan sementara (Q5)",
                                "catatan": "dilaporkan berdampingan; riwayat DIBI harian tidak punya kolom rumah_terendam, jadi dilaporkan hanya "
                                           "bila ada, selain itu 'menunggu', tidak pernah 0"},
        "batas_klaim": "Hanya di antara kab yang DIBI catat banjir (y > 0 karena definisi satuan). Lulus berarti 'peringkat kab menurut penduduk "
                       "di area genangan sejalan dengan DIBI', bukan angka mutlak dan bukan kemampuan membedakan banjir dari tidak banjir.",
        "pemisahan": {"kalibrasi": f"tanggal DIBI < {BATAS_UJI}, ditambah pasangan dekat episode terlihat",
                      "uji": f"tanggal DIBI >= {BATAS_UJI} dan berjarak > {JARAK_EPISODE} hari dari episode terlihat di provinsi yang sama (diukur dari tanggal DIBI, margin lintasan +{JENDELA} hari)",
                      "episode_terlihat": [[sorted(p), a, b, k] for p, a, b, k in episode_kerusakan()],
                      "catatan": "pasangan terlihat dimasukkan ke bagian kalibrasi (RENCANA-UJI) dengan kolom 'terlihat', tidak pernah ke uji"},
        "pasangan_kolom": ["prov", "kab", "tanggal", "terdampak_dibi", "bagian", "terlihat", "n_kandidat_lintasan", "tanggal_pra"],
    }


def tulis(K, riwayat=None, alasan=None):
    ph = dict(K, pasangan="@@")
    teks = json.dumps(ph, indent=1, ensure_ascii=False).replace('"@@"', "[\n" + ",\n".join(json.dumps(r, ensure_ascii=False) for r in K["pasangan"]) + "\n]")
    open(KRI, "w").write(teks + "\n")
    s = {"berkas": "scripts/siklus/genangan_kriteria.json", "sidik": sidik_isi(open(KRI, "rb").read()),
         "cara": "sha256 atas isi berkas kriteria tanpa satu baris baru penutup (byte per byte)", "ditulis": dt.date.today().isoformat(), "versi": K["versi"],
         **({"riwayat": riwayat, "alasan_versi": alasan} if riwayat else {}),
         "jangkar_commit": "",
         "catatan": "Isi jangkar_commit dengan hash commit yang memuat kedua berkas, sesudah commit, SEBELUM GS-03 atau GS-13 memulai. "
                    "prasyarat menolak selama kosong."}
    open(SID, "w").write(json.dumps(s, indent=1) + "\n")
    return s


def versi_baru_syarat(sid=SID, kri=KRI, vonis=VONIS, git=True):
    """-> (versi_lama, riwayat_baru). Tolak bila versi lama belum berjangkar/utuh atau uji balik sudah dijalankan (vonis ada).
    Satu-satunya pintu kunci ulang; tidak bisa dipakai menyetel ulang sesudah melihat hasil."""
    if os.path.exists(vonis):
        raise Tolak("genangan_vonis.json ada: uji balik GS-13 sudah dijalankan, kunci ulang ditutup")
    K = periksa_kunci(kri, sid, git=git, vonis=vonis)   # versi lama wajib berjangkar dan utuh
    s = json.load(open(sid))
    if s.get("vonis"):
        raise Tolak("sidik memuat vonis: kunci ulang ditutup")
    return K["versi"], list(s.get("riwayat", [])) + [{"versi": K["versi"], "sidik": s["sidik"], "jangkar_commit": s["jangkar_commit"]}]


def layak(luring=False, baru=None):
    """baru = alasan (str) bila dipanggil dari versi-baru: versi naik, riwayat bertambah. Tanpa itu: tolak bila sudah berjangkar."""
    global LURING
    LURING = luring
    versi, riwayat, alasan = 1, None, None
    if baru:
        lama, riwayat = versi_baru_syarat()
        versi, alasan = lama + 1, baru
    else:
        if os.path.exists(SID):
            s = json.load(open(SID))
            if s.get("jangkar_commit"):
                raise Tolak("kriteria sudah dijangkar: tidak boleh ditulis ulang (pakai versi-baru --alasan)")
            versi, riwayat, alasan = s.get("versi", 1), s.get("riwayat"), s.get("alasan_versi")   # lanjutkan versi yang belum dijangkar
    gn = _gn()
    t0 = time.time()
    kat = muat_katalog(gn)
    ada = set(kat.ub)
    print(f"katalog metadata: {sum(len(v) for v in kat.ub.values())} lintasan di {len(ada)} ubin ({time.time() - t0:.0f} dtk)", flush=True)
    per = {}
    for j, p, n, t, v in gn.baris_dibi():
        if not ({"banjir", "bandang"} & set(j)) or t < "2015-10-01" or not v.get("terdampak", 0) > 0:
            continue
        per[(p, n, t)] = per.get((p, n, t), 0) + v["terdampak"]
    epi = episode_kerusakan()
    frak, tanpa_poligon, hasil = {}, set(), []
    for (p, n, t), td in sorted(per.items()):
        if (p, n) not in frak:
            try:
                frak[(p, n)] = frak_kab(gn, p, n, ada)
            except (OSError, KeyError):
                frak[(p, n)] = None
        if frak[(p, n)] is None:
            tanpa_poligon.add((p, n))
            continue
        r = layak_satu(gn, kat, frak[(p, n)], dt.date.fromisoformat(t), MARGIN_PRA if versi >= 2 else 0)
        if r:
            b, c = bagian(p, t, epi)
            hasil.append([p, n, t, td, b, c, r[0], r[1]])
    K = dasar(versi)
    K["pasangan"] = hasil
    assert all(len(h) == len(K["pasangan_kolom"]) for h in hasil)
    cnt = lambda b, c=None: sum(1 for h in hasil if h[4] == b and (c is None or h[5] == c))
    uji_ = sorted((h for h in hasil if h[4] == "uji"), key=lambda h: urut_sampel(h[0], h[1], h[2]))
    N = K["sampel_uji"]["N"]
    pilih = [[h[0], h[1], h[2]] for h in uji_[:N]]
    K["sampel_uji"]["pasangan"] = pilih
    K["sampel_uji"]["n_blok_di_sampel"] = len({blok(p, t) for p, _, t in pilih})
    K["jumlah"] = {"kab_hari_dibi_banjir_terdampak_positif": len(per), "kab_tanpa_poligon_atau_ubin": len(tanpa_poligon),
                   "layak_kalibrasi": cnt("kalibrasi"), "layak_uji_populasi": cnt("uji"), "sampel_uji_dipilih": len(pilih),
                   "blok_di_sampel": K["sampel_uji"]["n_blok_di_sampel"],
                   "layak_kalibrasi_terlihat": {c: cnt("kalibrasi", c) for c in sorted({e[3] for e in epi})}}
    K["cara_hitung"] = (
        "Tanpa raster. Metadata STAC GFM per bulan (item dengan ensemble_flood_extent) di data/raw/banjir/gfm_nasional/layak/ (gitignored), "
        "dijadikan Katalog genangan_nasional (bingkai <= 10 menit = satu lintasan; hanya ubin dengan air acuan). Ubin tiap kab dari simpul batas "
        "kecamatan (60 simpul merata) diproyeksikan ke tiap grid Equi7, bukan dari titik sampel berbobot luas; ubin yang menyentuh kab di tepi "
        "bisa ikut atau terlewat. Layak = ada kandidat (maks 4 teratas menurut bagian ubin) yang punya pra sah (pilih_pra: 8 sampai 45 hari, "
        "orbit +- 90 menit) sebelum tanggal DIBI. Layak BUKAN sah: cakupan >= 10 persen baru diketahui dari raster di GS-13; "
        "riwayat terhitung saat ini hanya 10 sah dari 21 pasangan (hasil.jsonl). Populasi uji layak jauh lebih besar dari yang dibaca: GS-13 hanya membaca sampel_uji.")
    K["hasil_diharapkan"] = ("n sah ditentukan GS-13 dari 300 sampel; riwayat lama hanya 10 dari 21 sah; "
                             "tak_dapat_dinilai bila sah/dipilih < 0,30 atau blok sah < 20")
    tulis(K, riwayat, alasan)
    print(json.dumps(K["jumlah"], ensure_ascii=False, indent=1))
    print("hasil_diharapkan:", K["hasil_diharapkan"])


# ---------------------------------------------------------------- self-check
def uji():
    gn = _gn()
    dd = lambda s: dt.date.fromisoformat(s)

    def kat(*ts):
        return gn.Katalog({f"i{i}": {"id": f"i{i}", "t": t, "ub": "OC020M_E000N000T3", "f": "x", "m": "", "fp": 0, "an": False, "r": "x"}
                           for i, t in enumerate(ts)})
    fr = {"OC020M_E000N000T3": 1.0}
    # layak: post 2024-02-20 (2 hari sesudah acuan 02-18), pra 2024-02-01 (19 hari sebelum post), jam lintas sama
    k = kat("2024-02-20T23:05:00Z", "2024-02-01T23:00:00Z")
    assert layak_satu(gn, k, fr, dd("2024-02-18")) == (1, "2024-02-01")
    assert layak_satu(gn, kat("2024-02-20T23:05:00Z"), fr, dd("2024-02-18")) is None          # tanpa pra
    assert layak_satu(gn, kat("2024-02-20T23:05:00Z", "2024-02-01T20:00:00Z"), fr, dd("2024-02-18")) is None   # orbit beda > 90 menit
    assert layak_satu(gn, kat("2024-02-27T23:05:00Z", "2024-02-01T23:00:00Z"), fr, dd("2024-02-18")) is None   # post di luar 0-6 hari
    assert layak_satu(gn, kat("2024-02-17T23:05:00Z", "2024-02-01T23:00:00Z"), fr, dd("2024-02-18")) is None   # post sebelum tanggal DIBI
    # margin 7 hari (K6): pra paling lambat acuan - 7, inklusif
    assert MARGIN_PRA == 7
    u = "OC020M_E000N000T3"
    acuan = dd("2024-02-18")
    k2 = kat("2024-02-12T23:00:00Z", "2024-02-11T23:00:00Z", "2024-02-10T23:00:00Z", "2024-02-01T23:00:00Z")
    ok = [x["t"][:10] for x in pra_sebelum_acuan(k2, u, acuan)]
    assert "2024-02-12" not in ok and "2024-02-11" in ok and "2024-02-10" in ok       # acuan-6 ditolak, acuan-7 diterima
    assert layak_satu(gn, kat("2024-02-20T23:05:00Z", "2024-02-12T23:00:00Z"), fr, acuan) is None
    assert layak_satu(gn, kat("2024-02-19T23:05:00Z", "2024-02-11T23:00:00Z"), fr, acuan) == (1, "2024-02-11")
    assert layak_satu(gn, kat("2024-02-20T23:05:00Z", "2024-02-12T23:00:00Z"), fr, acuan, 0) == (1, "2024-02-12")   # margin 0 = tanpa margin
    # pembagian waktu dan pasangan terlarang
    epi = episode_kerusakan()
    assert len(epi) == len(EPISODE) + 4
    assert bagian("32", "2023-12-31", epi) == ("kalibrasi", "")
    assert bagian("32", "2024-01-01", epi) == ("uji", "")
    # contoh nyata yang lolos pada versi per kab-hari: semuanya harus bukan uji
    for prov, tgl in (("12", "2025-11-18"), ("11", "2026-10-19"), ("33", "2024-02-06"), ("33", "2024-03-10"), ("33", "2026-01-24")):
        assert bagian(prov, tgl, epi)[0] == "kalibrasi" and bagian(prov, tgl, epi)[1], (prov, tgl)
    assert bagian("12", "2026-04-15", epi)[0] == "uji"            # > 30 hari dari episode Sumatera (akhir 2026-02-28)
    assert bagian("12", "2025-09-20", epi)[0] == "uji"            # lintasan +6 hari = 09-26, > 30 hari sebelum 2025-11-01
    assert bagian("12", "2025-09-30", epi) == ("kalibrasi", "sumatera2025")
    assert bagian("32", "2025-12-20", epi)[0] == "uji"            # provinsi lain tidak ikut
    assert blok("33", "2024-03-10") == "33|2024-W10" and blok("33", "2024-03-11") == "33|2024-W11"
    # bentuk data: tiap baris sama panjang dengan kolom; placeholder tidak membuat daftar bersarang
    with tempfile.TemporaryDirectory() as d:
        global KRI, SID
        KRI0, SID0 = KRI, SID
        KRI, SID = os.path.join(d, "k.json"), os.path.join(d, "s.json")
        try:
            K = dasar()
            K["pasangan"] = [["33", "Demak", "2024-03-10", 5, "kalibrasi", "demak2024", 1, "2024-02-01"]]
            tulis(K)
            J = json.load(open(KRI))
            assert J["pasangan"] == K["pasangan"] and all(len(r) == len(J["pasangan_kolom"]) for r in J["pasangan"])
        finally:
            KRI, SID = KRI0, SID0
    # kunci ulang: hanya bila versi lama berjangkar+utuh dan vonis belum ada
    def tolak(fn, pesan):
        try:
            fn()
        except Tolak as e:
            return str(e)
        raise SystemExit(pesan)
    with tempfile.TemporaryDirectory() as d:
        kri, sid, von = (os.path.join(d, n) for n in ("k.json", "s.json", "v.json"))
        open(kri, "w").write('{"versi":1}\n')
        sj = lambda **k: json.dump({"sidik": sidik_isi(open(kri, "rb").read()), "jangkar_commit": "abc", **k}, open(sid, "w"))
        vb = lambda: versi_baru_syarat(sid, kri, von, git=False)
        sj()
        assert vb() == (1, [{"versi": 1, "sidik": sidik_isi(open(kri, "rb").read()), "jangkar_commit": "abc"}])
        sj(riwayat=[{"versi": 0, "sidik": "x", "jangkar_commit": "y"}])           # riwayat lama utuh, versi lama ditambahkan di belakang
        assert [r["versi"] for r in vb()[1]] == [0, 1]
        sj(vonis={"label": "lulus"})
        tolak(vb, "vonis di sidik harus menutup versi-baru")
        sj()
        open(von, "w").write("{}")
        assert "GS-13" in tolak(vb, "berkas vonis harus menutup versi-baru")
        os.remove(von)
        json.dump({"sidik": sidik_isi(open(kri, "rb").read()), "jangkar_commit": ""}, open(sid, "w"))
        tolak(vb, "versi lama tanpa jangkar harus ditolak")
        sj()
        open(kri, "w").write('{"versi":9}\n')
        tolak(vb, "kriteria lama yang berubah harus ditolak")
    assert dasar(2)["margin_pra_hari"] == 7 and dasar(1)["margin_pra_hari"] == 0
    # kunci: jangkar kosong ditolak, sidik salah ditolak
    with tempfile.TemporaryDirectory() as d:
        kri, sid = os.path.join(d, "k.json"), os.path.join(d, "s.json")
        open(kri, "w").write('{"a":1}\n')
        json.dump({"sidik": sidik_isi(open(kri, "rb").read()), "jangkar_commit": ""}, open(sid, "w"))
        for fn in (lambda: periksa_kunci(kri, sid, git=False),):
            try:
                fn()
                raise SystemExit("jangkar kosong harus ditolak")
            except Tolak:
                pass
        json.dump({"sidik": sidik_isi(open(kri, "rb").read()), "jangkar_commit": "abc"}, open(sid, "w"))
        assert periksa_kunci(kri, sid, git=False) == {"a": 1}
        open(kri, "w").write('{"a":2}\n')
        try:
            periksa_kunci(kri, sid, git=False)
            raise SystemExit("sidik salah harus ditolak")
        except Tolak:
            pass
    # git: isi beda di commit jangkar, jangkar bukan leluhur HEAD, sidik hilang
    with tempfile.TemporaryDirectory() as d:
        g = lambda *a: subprocess.run(["git", "-C", d, "-c", "user.name=u", "-c", "user.email=u@x", *a], capture_output=True, text=True, check=True).stdout.strip()
        kri, sid = os.path.join(d, "k.json"), os.path.join(d, "s.json")
        g("init", "-q")
        open(kri, "w").write('{"a":1}\n')
        g("add", "k.json")
        g("commit", "-q", "-m", "c0")
        c0 = g("rev-parse", "HEAD")
        sd = lambda j: json.dump({"sidik": sidik_isi(open(kri, "rb").read()), "jangkar_commit": j}, open(sid, "w"))
        sd(c0)
        assert periksa_kunci(kri, sid, akar=d, vonis=os.path.join(d, "v.json")) == {"a": 1}
        open(kri, "w").write('{"a":2}\n')            # isi beda dari commit jangkar, sidik ikut diperbarui
        sd(c0)
        try:
            periksa_kunci(kri, sid, akar=d, vonis=os.path.join(d, "v.json"))
            raise SystemExit("isi beda di commit jangkar harus ditolak")
        except Tolak as e:
            assert "berbeda dari commit jangkar" in str(e)
        open(kri, "w").write('{"a":1}\n')
        g("checkout", "-q", "--detach")
        open(kri, "w").write('{"a":3}\n')
        g("commit", "-q", "-am", "c1")
        c1 = g("rev-parse", "HEAD")
        g("checkout", "-q", c0)                       # HEAD = c0; c1 bukan leluhur
        open(kri, "w").write('{"a":3}\n')
        sd(c1)
        try:
            periksa_kunci(kri, sid, akar=d, vonis=os.path.join(d, "v.json"))
            raise SystemExit("jangkar bukan leluhur HEAD harus ditolak")
        except Tolak as e:
            assert "bukan leluhur" in str(e)
        os.remove(sid)
        try:
            periksa_kunci(kri, sid, akar=d, vonis=os.path.join(d, "v.json"))
            raise SystemExit("sidik hilang harus ditolak")
        except Tolak as e:
            assert "hilang" in str(e)
    # riwayat kunci dan vonis di riwayat git (validasi-model 25 Nov 2026)
    with tempfile.TemporaryDirectory() as d:
        g = lambda *a: subprocess.run(["git", "-C", d, "-c", "user.name=u", "-c", "user.email=u@x", *a], capture_output=True, text=True, check=True).stdout.strip()
        kri, sid, von = (os.path.join(d, n) for n in ("k.json", "s.json", "v.json"))
        pk = lambda: periksa_kunci(kri, sid, akar=d, vonis=von)
        tulis_kri = lambda t: (open(kri, "w").write(t), g("add", "k.json"), g("commit", "-q", "-m", t), g("rev-parse", "HEAD"))[-1]
        sd = lambda j, riw: json.dump({"versi": 2, "sidik": sidik_isi(open(kri, "rb").read()), "jangkar_commit": j, "riwayat": riw}, open(sid, "w"))
        g("init", "-q")
        h1 = tulis_kri('{"v":1}\n')
        s1 = sidik_isi(b'{"v":1}\n')
        h2 = tulis_kri('{"v":2}\n')
        sd(h2, [{"versi": 1, "sidik": s1, "jangkar_commit": h1}])
        assert pk() == {"v": 2}
        sd(h2, [{"versi": 1, "sidik": "salah", "jangkar_commit": h1}])
        assert "tidak cocok sidik lama" in tolak(pk, "isi lama tak cocok sidik lama harus ditolak")
        sd(h2, [{"versi": 1, "sidik": s1, "jangkar_commit": ""}])
        assert "bukan leluhur jangkar" in tolak(pk, "jangkar lama kosong harus ditolak")
        g("checkout", "-q", "--orphan", "lain")          # jangkar lama di cabang lain: bukan leluhur jangkar baru
        open(kri, "w").write('{"v":1}\n')
        g("add", "k.json")
        g("commit", "-q", "-m", "akar lain")              # pesan beda: tanpa itu hash sama dengan h1 (pohon, waktu, tanpa induk sama)
        h0 = g("rev-parse", "HEAD")
        assert h0 != h1
        g("checkout", "-q", "-f", h2)
        sd(h2, [{"versi": 1, "sidik": s1, "jangkar_commit": h0}])
        assert "bukan leluhur jangkar" in tolak(pk, "jangkar lama bukan leluhur jangkar baru harus ditolak")
        sd(h2, [{"versi": 1, "sidik": s1, "jangkar_commit": h1}])
        open(von, "w").write("{}")
        assert "GS-13" in tolak(pk, "berkas vonis di pohon kerja harus ditolak")
        g("checkout", "-q", "lain")                      # vonis pernah di-commit lalu dihapus, di cabang mana pun
        g("add", "v.json")
        g("commit", "-q", "-m", "vonis")
        g("rm", "-q", "v.json")
        g("commit", "-q", "-m", "hapus vonis")
        g("checkout", "-q", "-f", h2)
        assert not os.path.exists(von)
        assert "pernah ada di riwayat git" in tolak(pk, "vonis yang pernah ada di riwayat git harus ditolak")
    print("uji genangan_kriteria: lulus")


if __name__ == "__main__":
    mode = sys.argv[1] if len(sys.argv) > 1 else "uji"
    try:
        if mode == "uji":
            uji()
        elif mode == "layak":
            layak(luring="--luring" in sys.argv)
        elif mode == "versi-baru":
            a = sys.argv[2:]
            if "--alasan" not in a or not a[a.index("--alasan") + 1:][:1] or not a[a.index("--alasan") + 1].strip():
                sys.exit('versi-baru butuh --alasan "..."')
            layak(luring="--luring" in a, baru=a[a.index("--alasan") + 1])
        elif mode == "prasyarat":
            periksa_kunci()
            print("prasyarat lulus: kriteria terkunci")
        else:
            sys.exit(__doc__)
    except Tolak as e:
        print("DITOLAK:", e, file=sys.stderr)
        sys.exit(2)
