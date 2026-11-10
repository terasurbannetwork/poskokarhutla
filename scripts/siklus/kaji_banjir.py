"""Kaji cepat banjir, karhutla, gunung api (SK-055; ALGORITMA F3.3 dan F3.4). Fungsi murni, tanpa jaringan.

Masukan: `paparan` = keluaran paparan.hitung_kab (poligon kejadian_aktif_geo.json sudah menjadi zona `banjir:poligon`),
`kec_siaga` = nama kecamatan Siaga/Awas dari dampak.json/status banjir (None = belum ada), `fas` = fasilitas.hitung, `kedalaman` = [(d_m, luas_m2)] hunian.
Banjir: rentang jiwa [bawah, batas_atas_jam1]; bawah = terkecil dari tiga sumber jiwa yang ada (berdampingan, tidak dijumlah atau dirata-rata),
batas atas = jiwa WorldPop seluruh kecamatan Siaga/Awas (diangkat ke sumber terbesar bila lebih kecil). Salah satu tak ada: rentang None + alasan, bukan 0.
Tanpa kedalaman: "kedalaman belum tersedia", JRC tidak jalan. Kerusakan hanya hunian (kurva niaga dan industri belum tertulis di konst): euro 2010, rupiah `menunggu` tanpa kurs dan faktor harga.
Karhutla (radius km1/km3/km5 kumulatif, titik panas dan luas hanya dari sistem kita) dan gunung api (KRB I, II, III): hanya paparan. Jenis lain: belum ada perkiraan otomatis.
Label selalu `estimasi-model`. Pakai: python3 -I scripts/siklus/kaji_banjir.py uji
"""
import importlib.util, json, math, os, sys, tempfile

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
    print("kaji_banjir: uji hijau")


if __name__ == "__main__":
    if sys.argv[1:] == ["uji"]:
        _uji()
    else:
        sys.exit("pakai: kaji_banjir.py uji")
