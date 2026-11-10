"""Kaji cepat banjir, karhutla, gunung api (SK-055; ALGORITMA F3.3 dan F3.4). Fungsi murni, tanpa jaringan.

Masukan: `paparan` = keluaran paparan.hitung_kab (poligon kejadian_aktif_geo.json sudah menjadi zona `banjir:poligon`),
`kec_siaga` = nama kecamatan Siaga/Awas dari dampak.json/status banjir (None = belum ada), `fas` = fasilitas.hitung, `kedalaman` = [(d_m, luas_m2)] hunian.
Banjir: rentang jiwa [bawah, batas_atas_jam1]; bawah = terkecil dari tiga sumber jiwa yang ada (berdampingan, tidak dijumlah atau dirata-rata),
batas atas = jiwa WorldPop seluruh kecamatan Siaga/Awas (diangkat ke sumber terbesar bila lebih kecil). Salah satu tak ada: rentang None + alasan, bukan 0.
Tanpa kedalaman: "kedalaman belum tersedia", JRC tidak jalan. Kerusakan hanya hunian (kurva niaga dan industri belum tertulis di konst): euro 2010, rupiah `menunggu` tanpa kurs dan faktor harga.
Karhutla (radius km1/km3/km5 kumulatif, titik panas dan luas hanya dari sistem kita) dan gunung api (KRB I, II, III): hanya paparan. Jenis lain: belum ada perkiraan otomatis.
Label selalu `estimasi-model`. Pakai: python3 -I scripts/siklus/kaji_banjir.py uji
"""
import datetime as dt, importlib.util, json, math, os, sys, tempfile

AB = os.path.dirname(os.path.abspath(__file__))
YAKIN = "estimasi-model"
BELUM = "belum ada perkiraan otomatis"
SUMBER_JIWA = ("worldpop", "dukcapil", "ghsl")
PETA_ZONA = {"karhutla": "karhutla", "gunungapi": "gunungapi"}


def _muat(nama):
    s = importlib.util.spec_from_file_location("sk_" + nama, os.path.join(AB, nama + ".py"))
    m = importlib.util.module_from_spec(s)
    s.loader.exec_module(m)
    return m


K = _muat("konst")


def _angka(x, apa):
    if isinstance(x, bool) or not isinstance(x, (int, float)) or not math.isfinite(x):
        raise ValueError(f"{apa}: bukan angka terhingga ({x!r})")
    return x


def kumulatif(sel, radii=(1, 3, 5)):
    """sel [(jarak_km, n)] -> {radius: n kumulatif}; di luar radius terbesar tidak dihitung (UJ-F3-06)."""
    for j, n in sel:
        if _angka(j, "jarak") < 0 or _angka(n, "n") < 0:
            raise ValueError("jarak atau n negatif")
    return {r: sum(n for j, n in sel if j <= r) for r in radii}


def kerusakan_hunian(sel):
    """sel [(kedalaman_m, luas_m2)] -> euro 2010 = f(d) x D_maks x luas (kurva JRC hunian). Rupiah menunggu tanpa KURS dan FAKTOR_HARGA."""
    euro = 0.0
    for d, a in sel:
        if _angka(a, "luas") < 0:
            raise ValueError("luas negatif")
        euro += K.jrc_f(_angka(d, "kedalaman")) * K.JRC_D_MAKS["hunian"] * a
    rp = round(euro * K.KURS * K.FAKTOR_HARGA) if K.KURS and K.FAKTOR_HARGA else None
    return {"euro_2010": round(euro, 1), "rentang": None, "alasan_rentang": "lebar rentang kurva JRC tidak bersumber di repo",
            "rupiah": rp if rp is not None else "menunggu", "kurva": "JRC Asia hunian (Huizinga dkk 2017), interpolasi linear (asumsi-kebijakan)"}


def _fasilitas(fas, bahaya, kunci):
    if not fas:
        return None
    out = {}
    for kat, e in fas.get("berkoordinat", {}).items():
        out[kat] = {sm: s["zona"].get(bahaya, {}).get(kunci) for sm, s in e["sumber"].items()}
    j = fas.get("jalan_km", {}).get(f"{bahaya}:{kunci}")
    return {"hitungan_per_sumber": out, "jalan_km_batas_atas": j}


def banjir(paparan, kec_siaga=None, fas=None, kedalaman=None):
    z = (paparan or {}).get("zona", {}).get("banjir")
    if not z or not z.get("tersedia"):
        return {"bahaya": "banjir", "yakin": YAKIN, "status": "menunggu", "alasan": (z or {}).get("alasan", "tidak ada poligon kejadian aktif")}
    pz = z["per_zona"]["poligon"]
    jiwa = pz["jiwa"]
    ada = [v for v in (jiwa.get(s) for s in SUMBER_JIWA) if v is not None]
    kec = paparan.get("kec", {})
    atas, asing = None, []
    if kec_siaga is not None:
        asing = sorted(k for k in kec_siaga if k not in kec)
        v = [kec[k].get("jiwa_worldpop") for k in kec_siaga if k in kec]
        atas = None if any(x is None for x in v) else sum(v)
    r, alasan = None, None
    if not ada:
        alasan = "jiwa terpapar tak ada di tiga sumber (menunggu)"
    elif atas is None:
        alasan = "kecamatan Siaga/Awas atau jiwa WorldPop-nya belum ada (menunggu)"
    else:
        r = [min(ada), max(atas, max(ada))]
    out = {"bahaya": "banjir", "yakin": YAKIN, "status": "ok", "bangunan_terpapar": pz["n"], "jiwa_terpapar": jiwa, "jiwa_selisih": pz.get("jiwa_selisih"),
           "batas_atas_jam1": atas, "kec_tak_dikenal": asing, "rentang_jiwa": r, "alasan_rentang": alasan,
           "fasilitas": _fasilitas(fas, "banjir", "poligon"),
           "catatan": "Poligon kejadian aktif bukan genangan terukur: ini paparan, bukan dampak. Batas atas = seluruh kecamatan Siaga/Awas, bukan hanya bagian tergenang."}
    out["kerusakan"] = ({"status": "kedalaman belum tersedia"} if not kedalaman else kerusakan_hunian(kedalaman))
    return out


def paparan_saja(paparan, bahaya, fas=None):
    """Karhutla dan gunung api: bangunan dan jiwa (tiga sumber) per radius atau kelas KRB. Tanpa kerusakan atau korban."""
    z = (paparan or {}).get("zona", {}).get(bahaya)
    if not z or not z.get("tersedia"):
        return {"bahaya": bahaya, "yakin": YAKIN, "status": "menunggu", "alasan": (z or {}).get("alasan", "zona belum ada")}
    return {"bahaya": bahaya, "yakin": YAKIN, "status": "ok", "hanya": "paparan",
            "zona": {k: {"bangunan_terpapar": v["n"], "jiwa_terpapar": v["jiwa"], "jiwa_selisih": v.get("jiwa_selisih"), "fasilitas": _fasilitas(fas, bahaya, k)}
                     for k, v in z["per_zona"].items()},
            "catatan": "Hanya paparan, tanpa kerusakan atau korban. Titik panas, luas, dan kluster karhutla hanya dari sistem kita."}


def kaji(bahaya, paparan=None, **kw):
    if bahaya == "banjir":
        return banjir(paparan, **kw)
    if bahaya in PETA_ZONA:
        return paparan_saja(paparan, PETA_ZONA[bahaya], kw.get("fas"))
    return {"bahaya": bahaya, "yakin": YAKIN, "status": BELUM}


def tulis(root, kj, isi):
    """kaji/<KJ>.json lewat batas 100 KB dan kunci terlarang (saji.periksa_berkas); -> daftar masalah."""
    G, S = _muat("gudang"), _muat("saji")
    kunci = f"siklus/saji/kaji/{kj}.json"
    data = json.dumps(G.selubung("kaji", {"kejadian": kj, **isi}), ensure_ascii=False, sort_keys=True).encode()
    m = S.periksa_berkas(kunci, data)
    if not m:
        j = os.path.join(root, *kunci.split("/"))
        os.makedirs(os.path.dirname(j), exist_ok=True)
        open(j, "wb").write(data)
    return m


def banjir_jam1(paparan, kec_siaga, waktu_data=None, kode=None):
    """Ringkas banjir jam pertama untuk ingest/kaji: {"status","ringkas","masukan"}; None bila rentang tak ada (menunggu_data tidak dikirim)."""
    b = banjir(paparan, kec_siaga=kec_siaga)
    if b.get("status") != "ok" or b["rentang_jiwa"] is None:
        return None
    return {"status": "dihitung", "masukan": {"sumber": "kejadian_aktif", "kode": kode, "waktu_data": waktu_data},
            "ringkas": {"rentang": b["rentang_jiwa"], "bangunan_terpapar": b["bangunan_terpapar"], "jiwa_terpapar": b["jiwa_terpapar"],
                        "batas_atas_jam1": b["batas_atas_jam1"], "n_kec_siaga": len(kec_siaga), "kec_tak_dikenal": len(b["kec_tak_dikenal"])}}


def muatan_banjir(kj, r):
    return {"kejadian_id": kj, "model": "banjir_jam1", "status": r["status"], "yakin": YAKIN, "masukan": r["masukan"], "ringkas": r["ringkas"], "hasil_r2": None}


def rencana(kejadian, baris, paparan_dir, keluar=None):
    """kejadian = kejadian_aktif_awal.json['kejadian'] (kec = Siaga/Awas), paparan_dir/<kode>.json = keluaran paparan.hitung_kab. -> (muatan, lewati)."""
    G = _muat("kaji_gempa")
    muatan, lewati = [], []
    for e in kejadian:
        kode = e["kode"]
        kj = G.peta_kj(baris, ("banjir",), kode)
        f = os.path.join(paparan_dir or "", kode + ".json")
        if not kj:
            lewati.append((kode, "belum punya KJ- di sk_kejadian_sumber"))
        elif not paparan_dir or not os.path.exists(f):
            lewati.append((kode, "paparan kejadian belum dihitung (menunggu)"))
        else:
            r = banjir_jam1(json.load(open(f, encoding="utf-8")), e["kec"], e.get("sejak"), kode)
            if r is None:
                lewati.append((kode, "rentang tak ada (menunggu_data)"))
            else:
                m = muatan_banjir(kj, r)
                if keluar:   # hasil_r2 terisi hanya bila berkasnya benar-benar ditulis (job mengunggahnya sesudah ingest)
                    msl = tulis(keluar, kj, {"model": "banjir_jam1", "kode": kode, **banjir(json.load(open(f, encoding="utf-8")), kec_siaga=e["kec"])})
                    if msl:
                        lewati.append((kode, "saji kaji ditolak: " + "; ".join(msl)))
                        continue
                    m["hasil_r2"] = f"siklus/saji/kaji/{kj}.json"
                muatan.append(m)
    return muatan, lewati


def _kirim_cli(a):
    G = _muat("kaji_gempa")
    akar = os.path.normpath(os.path.join(AB, "../.."))
    o = lambda n, b=None: G._opsi(a, n, b)
    awal = json.load(open(os.path.join(akar, "public/banjir/data/kejadian_aktif_awal.json"), encoding="utf-8"))
    basis, sungguhan = o("--basis", "https://centurisk97.id").rstrip("/"), "--kirim" in a
    http, baris = None, []
    if sungguhan or "--basis" in a:
        tk = os.environ.get("PIPA_TOKEN")
        if not tk:
            sys.exit("butuh env PIPA_TOKEN")
        http = _muat("pasang")._http(tk)
        h = dt.date.today()
        baris = G.tarik_sumber(http, basis, (h - dt.timedelta(days=30)).isoformat(), h.isoformat())
    muatan, lewati = rencana(awal["kejadian"], baris, o("--paparan"), o("--keluar"))
    for i, why in lewati:
        print("LEWATI", i, why)
    for kj, hs in G.kirim(muatan, basis, http, sungguhan):
        print("KIRIM" if sungguhan else "KERING", kj, hs)
    print("| terkirim" if sungguhan else "| dry-run (tambah --kirim untuk mengirim)")


def _uji():
    def salah(f, *a):
        try:
            f(*a)
        except ValueError:
            return
        raise AssertionError(f"harus ditolak: {a}")
    jw = {"worldpop": 667, "dukcapil": 600, "ghsl": None}
    pap = {"kec": {"A": {"jiwa_worldpop": 1000}, "B": {"jiwa_worldpop": 400}, "C": {"jiwa_worldpop": None}},
           "zona": {"banjir": {"tersedia": True, "per_zona": {"poligon": {"n": 200, "jiwa": jw, "jiwa_selisih": 67}}},
                    "karhutla": {"tersedia": True, "per_zona": {f"km{r}": {"n": n, "jiwa": jw} for r, n in ((1, 100), (3, 300), (5, 600))}},
                    "gunungapi": {"tersedia": False, "alasan": "paparan_geo.json tidak terbaca"}}}
    # UJ-F3-04: rentang [jiwa_terpapar, batas_atas_jam1]; tiga sumber berdampingan, tidak dijumlah
    b = kaji("banjir", pap, kec_siaga=["A", "B", "Z"])
    assert b["rentang_jiwa"] == [600, 1400] and b["batas_atas_jam1"] == 1400 and b["kec_tak_dikenal"] == ["Z"] and b["yakin"] == YAKIN
    assert b["jiwa_terpapar"]["ghsl"] is None and b["kerusakan"] == {"status": "kedalaman belum tersedia"}, "tanpa kedalaman JRC tidak jalan"
    assert kaji("banjir", pap, kec_siaga=["A"])["rentang_jiwa"] == [600, 1000]
    assert kaji("banjir", pap, kec_siaga=["A", "C"])["rentang_jiwa"] is None, "jiwa kecamatan tak ada = menunggu, bukan 0"
    assert kaji("banjir", pap)["rentang_jiwa"] is None and kaji("banjir", pap)["batas_atas_jam1"] is None, "tanpa daftar Siaga/Awas = menunggu"
    assert kaji("banjir", pap, kec_siaga=[])["rentang_jiwa"] == [600, 667], "batas atas diangkat ke sumber terbesar"
    kos = json.loads(json.dumps(pap))
    kos["zona"]["banjir"]["per_zona"]["poligon"]["jiwa"] = {s: None for s in SUMBER_JIWA}
    assert kaji("banjir", kos, kec_siaga=["A"])["rentang_jiwa"] is None
    assert kaji("banjir", None)["status"] == "menunggu" and kaji("banjir", {"zona": {"banjir": {"tersedia": False, "alasan": "x"}}})["alasan"] == "x"
    # UJ-F3-05: JRC hunian d 0,75 m, 50 m2 -> 2.275,5 euro 2010; d 7 m -> f 1; d <= 0 -> 0; rupiah menunggu
    r = kaji("banjir", pap, kec_siaga=["A"], kedalaman=[(0.75, 50)])["kerusakan"]
    assert r["euro_2010"] == 2275.5 and r["rupiah"] == "menunggu" and r["rentang"] is None
    assert kerusakan_hunian([(7, 1)])["euro_2010"] == 111.0 and kerusakan_hunian([(0, 9), (-1, 9)])["euro_2010"] == 0.0
    assert K.KURS is None and K.FAKTOR_HARGA is None, "uji ini mengandaikan kurs dan faktor harga belum bernilai"
    for x in ((float("nan"), 1), ("1", 1), (True, 1), (1, -5), (1, None), (None, 1)):
        salah(kerusakan_hunian, [x])
    # UJ-F3-06: karhutla dan gunung api hanya paparan, kumulatif
    assert kumulatif([(0.9, 100), (2.5, 200), (4.9, 300), (6, 400)]) == {1: 100, 3: 300, 5: 600}
    salah(kumulatif, [(-1, 5)])
    salah(kumulatif, [(1, "5")])
    k = kaji("karhutla", pap)
    assert k["hanya"] == "paparan" and [v["bangunan_terpapar"] for v in k["zona"].values()] == [100, 300, 600] and "kerusakan" not in k
    assert kaji("gunungapi", pap)["status"] == "menunggu" and kaji("gunungapi", pap)["alasan"].startswith("paparan_geo")
    assert kaji("gempa", pap) == {"bahaya": "gempa", "yakin": YAKIN, "status": BELUM} and kaji("kekeringan", pap)["status"] == BELUM
    # fasilitas berdampingan dan jalan batas atas
    fas = {"berkoordinat": {"sekolah": {"sumber": {"dapodik": {"n": 6, "zona": {"banjir": {"poligon": 5}}}, "osm": {"n": 3, "zona": {"banjir": {"poligon": 3}}}}}},
           "jalan_km": {"banjir:poligon": 4.2}}
    f = kaji("banjir", pap, kec_siaga=["A"], fas=fas)["fasilitas"]
    assert f == {"hitungan_per_sumber": {"sekolah": {"dapodik": 5, "osm": 3}}, "jalan_km_batas_atas": 4.2}
    # berkas saji: lolos periksa; kunci terlarang ditolak; label tidak bisa diturunkan dari data
    with tempfile.TemporaryDirectory() as t:
        assert tulis(t, "KJ-2026-ABCDEFGH", b) == []
        d = json.load(open(os.path.join(t, "siklus/saji/kaji/KJ-2026-ABCDEFGH.json")))
        assert d["yakin"] == YAKIN and d["jenis"] == "kaji" and d["bahaya"] == "banjir"
        assert tulis(t, "KJ-2026-XXXXXXXX", {"total": 1}) and not os.path.exists(os.path.join(t, "siklus/saji/kaji/KJ-2026-XXXXXXXX.json"))
    assert "total" not in json.dumps(b) and "rata" not in json.dumps(b)
    # SK-056: banjir_jam1 dan rencana kirim
    r = banjir_jam1(pap, ["A", "B"], "2026-10-18", "B0007")
    assert r["ringkas"]["rentang"] == [600, 1400] and r["masukan"]["kode"] == "B0007" and r["status"] == "dihitung"
    assert banjir_jam1(pap, ["A", "C"]) is None and banjir_jam1(pap, None if False else ["A"], None, "x") is not None, "rentang tak ada = None"
    assert banjir_jam1({"zona": {"banjir": {"tersedia": False}}}, ["A"]) is None
    G = _muat("kaji_gempa")
    assert G.periksa(muatan_banjir("KJ-2026-9A2WGN3G", r)) == [] and G.periksa(muatan_banjir("KJ-2026-9A2WGN3G", {**r, "ringkas": {"rentang": None}}))
    bar = [{"sumber": "banjir", "kode": "B0007", "status": "terpasang", "kejadian_id": "KJ-2026-9A2WGN3G"}, {"sumber": "banjir", "kode": "B0008", "status": "terpasang", "kejadian_id": "KJ-2026-9A2WGN3H"}]
    kej = [{"kode": "B0007", "sejak": "2026-10-18", "kec": ["A", "B"]}, {"kode": "B0008", "kec": ["A", "C"]}, {"kode": "B0009", "kec": ["A"]}, {"kode": "B0010", "kec": ["A"]}]
    with tempfile.TemporaryDirectory() as t:
        for k in ("B0007", "B0008", "B0010"):
            json.dump(pap, open(os.path.join(t, k + ".json"), "w"))
        mu, lw = rencana(kej, bar, t)
        assert [x["kejadian_id"] for x in mu] == ["KJ-2026-9A2WGN3G"] and [i for i, _ in lw] == ["B0008", "B0009", "B0010"], lw
        assert rencana(kej, bar, None)[0] == [], "tanpa paparan tidak ada yang dikirim"
        assert mu[0]["hasil_r2"] is None, "tanpa --keluar tidak ada berkas, hasil_r2 kosong"
        with tempfile.TemporaryDirectory() as o:
            m2, _ = rencana(kej, bar, t, o)
            f = os.path.join(o, "siklus/saji/kaji/KJ-2026-9A2WGN3G.json")
            d = json.load(open(f))
            assert m2[0]["hasil_r2"] == "siklus/saji/kaji/KJ-2026-9A2WGN3G.json" and d["model"] == "banjir_jam1" and d["rentang_jiwa"] == [600, 1400] and G.periksa(m2[0]) == []
    pernah = []
    assert G.kirim(mu, "https://x", lambda *a: pernah.append(a))[0][1].startswith("dry-run") and not pernah
    print("kaji_banjir: uji hijau")


if __name__ == "__main__":
    if sys.argv[1:] == ["uji"]:
        _uji()
    elif sys.argv[1:2] == ["kirim"]:
        _kirim_cli(sys.argv[2:])
    else:
        sys.exit("pakai: kaji_banjir.py uji | kirim [--paparan DIR] [--basis URL] [--keluar AKAR_SAJI] [--kirim]")
