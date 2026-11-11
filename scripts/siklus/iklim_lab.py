"""Risiko Masa Depan F6 (SK-094, ALG F6.1 sampai F6.4, F6.6): indeks ETCCDI dari NEX-GDDP-CMIP6, delta terhadap historical model SENDIRI, rentang antarmodel,
muka laut AR6. Semua keluaran `hipotesis`, sinyal perubahan terhadap dasar, bukan ramalan kejadian.

Hanya tiga indeks: Rx1day, Rx5day, CDD. Dasar 1995-2014 historical model yang sama; horizon "2030" = 2021-2040, "2050" = 2041-2060; skenario ssp245 dan ssp585.
CHIRPS v3 hanya pembanding bias (B_median - B_CHIRPS), tidak dicampur ke delta; belum dihitung = None ("menunggu").
Inti (rumus, kalender, agregasi, tulis) murni stdlib dan teruji tanpa jaringan. Pembacaan NetCDF (`lab`) butuh xarray, h5netcdf, h5py, fsspec, aiohttp di venv sementara
(bukan di repo) dan tidak dipakai `uji`. kab4 = Kemendagri lewat kunci.kab4(nama, provinsi), tidak pernah kode BPS.
Pakai: python3 -I scripts/siklus/iklim_lab.py uji | <python-venv-lab> -I scripts/siklus/iklim_lab.py lab PROV URL_ATAU_NC [KELUAR.json]
"""
import importlib.util, json, math, os, sys, tempfile

AB = os.path.dirname(os.path.abspath(__file__))
AKAR = os.path.normpath(os.path.join(AB, "../.."))
INDEKS = ("rx1day", "rx5day", "cdd")
SATUAN = {"rx1day": "mm", "rx5day": "mm", "cdd": "hari"}
DASAR = (1995, 2014)
HORIZON = {"2030": (2021, 2040), "2050": (2041, 2060)}
SKENARIO = ("ssp245", "ssp585")
KALENDER_TETAP = {"noleap": 365, "365_day": 365, "360_day": 360, "all_leap": 366, "366_day": 366}
KALENDER_GREGORIAN = ("standard", "gregorian", "proleptic_gregorian")
# AR6 (R3), relatif 1995-2014, m: (median, p17, p83). Horizon 2021-2040 tidak ada di tabel: menunggu.
AR6 = {("2050", "ssp245"): (0.20, 0.17, 0.26), ("2050", "ssp585"): (0.23, 0.20, 0.29)}
CATATAN = "selisih terhadap dasar, bukan ramalan kejadian; penurunan muka tanah pesisir tidak dihitung"
YAKIN_KEMITRAAN = {"tinggi": "terverifikasi", "sedang": "terverifikasi", "rendah": "estimasi-model", "tidak": "hipotesis"}


def _muat(nama):
    s = importlib.util.spec_from_file_location("sk_il_" + nama, os.path.join(AB, nama + ".py"))
    m = importlib.util.module_from_spec(s)
    s.loader.exec_module(m)
    return m


# ---------- F6.1 indeks harian ----------
def panjang_tahun(kalender, tahun):
    """Jumlah hari satu tahun menurut kalender model. Kalender tak dikenal = ValueError (tidak diasumsikan)."""
    if kalender in KALENDER_TETAP:
        return KALENDER_TETAP[kalender]
    if kalender in KALENDER_GREGORIAN:
        return 366 if tahun % 4 == 0 and (tahun % 100 != 0 or tahun % 400 == 0) else 365
    raise ValueError(f"kalender {kalender!r} tidak dikenal")


def periksa_tahun(rr, kalender, tahun):
    """RR harian (mm/hari) satu tahun. Panjang tidak sesuai kalender, nilai kosong, NaN, atau negatif = ValueError; tidak ditambal."""
    if len(rr) != panjang_tahun(kalender, tahun):
        raise ValueError(f"{tahun}: {len(rr)} hari, kalender {kalender} menuntut {panjang_tahun(kalender, tahun)}")
    for x in rr:
        if x is None or isinstance(x, bool) or not isinstance(x, (int, float)) or math.isnan(x) or x < 0:
            raise ValueError(f"{tahun}: nilai RR tidak sah {x!r}")
    return rr


def rx1day(rr):
    return max(rr)


def rx5day(rr):
    """Maks jumlah lima hari berurutan di dalam tahun ini (jendela tidak melintasi tahun karena rr satu tahun)."""
    return max(sum(rr[i:i + 5]) for i in range(len(rr) - 4))


def cdd(rr):
    """Rentang terpanjang hari berurutan dengan RR < 1 mm."""
    n = m = 0
    for x in rr:
        n = n + 1 if x < 1 else 0
        m = max(m, n)
    return m


def indeks_tahun(rr, kalender, tahun):
    periksa_tahun(rr, kalender, tahun)
    return {"rx1day": rx1day(rr), "rx5day": rx5day(rr), "cdd": cdd(rr)}


# ---------- sel ke kabupaten ----------
def _dalam(x, y, cincin):
    d = False
    for (x1, y1), (x2, y2) in zip(cincin, cincin[1:] + cincin[:1]):
        if (y1 > y) != (y2 > y) and x < (x2 - x1) * (y - y1) / (y2 - y1) + x1:
            d = not d
    return d


def _poligon(geo):
    return [geo["coordinates"]] if geo["type"] == "Polygon" else geo["coordinates"]


def sel_kabupaten(geo, lats, lons):
    """-> ([(i, j)], sel_terdekat). Sel berpusat di dalam poligon; tanpa sel, sel terdekat ke centroid (asumsi-kebijakan, dicatat)."""
    P = _poligon(geo)
    dalam = [(i, j) for i, la in enumerate(lats) for j, lo in enumerate(lons)
             if any(_dalam(lo, la, p[0]) and not any(_dalam(lo, la, h) for h in p[1:]) for p in P)]
    if dalam:
        return dalam, False
    pts = [c for p in P for c in p[0]]
    cx, cy = sum(c[0] for c in pts) / len(pts), sum(c[1] for c in pts) / len(pts)
    i = min(range(len(lats)), key=lambda a: abs(lats[a] - cy))
    j = min(range(len(lons)), key=lambda a: abs(lons[a] - cx))
    return [(i, j)], True


# ---------- F6.2 F6.3 delta dan rentang ----------
def persentil(xs, p):
    """Interpolasi linear, posisi q = (n - 1) x p pada data terurut naik."""
    x = sorted(xs)
    if not x:
        return None
    q = (len(x) - 1) * p
    a, b = math.floor(q), math.ceil(q)
    return x[a] + (q - a) * (x[b] - x[a])


def delta_model(periode, dasar):
    """Rerata tahunan periode P, dasar B (model yang sama) -> {P, B, delta, relatif}. relatif None bila B <= 0; deret kosong = None."""
    if not periode or not dasar:
        return None
    P, B = sum(periode) / len(periode), sum(dasar) / len(dasar)
    return {"P": P, "B": B, "delta": P - B, "relatif": (P - B) / B * 100 if B > 0 else None}


def ringkas(deltas, relatifs=()):
    """{delta_m} lintas model -> median, rentang p17 sampai p83 (konvensi AR6), n, n_positif. Tanpa model = None, bukan 0."""
    if not deltas:
        return None
    r = [x for x in relatifs if x is not None]
    n = len(deltas)
    # ambang usulan (asumsi-kebijakan, belum disetujui pemilik): rentang p17-p83 baru tampil dari 5 model, dianggap andal dari 10
    return {"median": persentil(deltas, .5), "p17": persentil(deltas, .17) if n >= 5 else None, "p83": persentil(deltas, .83) if n >= 5 else None, "rentang_andal": n >= 10, "n_model": n,
            "n_model_positif": sum(1 for d in deltas if d > 0), "relatif_median": persentil(r, .5) if r else None}


def _tahun_lengkap(seri, rentang):
    a, b = rentang
    return [seri[t] for t in range(a, b + 1) if seri.get(t) is not None] if all(seri.get(t) is not None for t in range(a, b + 1)) else None


def susun_kab(per_model, bias_chirps=None):
    """per_model: {model: {'historical': {indeks: {tahun: nilai}}, 'ssp245': {...}, 'ssp585': {...}}} untuk SATU kabupaten.
    -> {horizon: {skenario: {indeks: {...}}}}. Model tanpa data lengkap dasar DAN periode tidak dihitung; n_model dicatat.
    bias_chirps: {indeks: B_chirps} bila ada; bias = B_median - B_CHIRPS, di luar delta."""
    out = {}
    for hor, rentang in HORIZON.items():
        for sk in SKENARIO:
            for ix in INDEKS:
                dl, rl, bs = [], [], []
                for m in per_model.values():
                    d = delta_model(_tahun_lengkap(m.get(sk, {}).get(ix, {}), rentang), _tahun_lengkap(m.get("historical", {}).get(ix, {}), DASAR))
                    if d:
                        dl.append(d["delta"])
                        rl.append(d["relatif"])
                        bs.append(d["B"])
                r = ringkas(dl, rl)
                if r is None:
                    cel = {"status": "menunggu", "median": None, "p17": None, "p83": None, "selisih_dasar": None, "satuan": SATUAN[ix], "n_model": 0}
                else:
                    cel = {**r, "selisih_dasar": r["median"], "satuan": SATUAN[ix], "dasar_median": persentil(bs, .5)}
                bc = (bias_chirps or {}).get(ix)
                cel["bias_chirps"] = cel["dasar_median"] - bc if r and bc is not None else None
                out.setdefault(hor, {}).setdefault(sk, {})[ix] = cel
    return out


# ---------- F6.4 muka laut ----------
def muka_laut(horizon, skenario, psmsl=None):
    """AR6 global (median, rentang 17-83 persen, m). 2021-2040 tidak ada di tabel = menunggu. PSMSL menggantikan nilai global bila diberikan dan disebut."""
    v = AR6.get((horizon, skenario))
    if v is None:
        return {"status": "menunggu", "median": None, "rentang": None, "satuan": "m", "alasan": "horizon tidak ada di tabel AR6; menunggu rekaman Zenodo dibaca",
                "yakin": "hipotesis"}
    return {"median": v[0], "rentang": [v[1], v[2]], "satuan": "m", "titik": "global" if psmsl is None else psmsl, "sumber": "AR6 WG1 Bab 9 lewat tabel HKO (R3), nilai tahun 2050", "titik_waktu": "2050",
            "dasar": "1995-2014", "yakin": "hipotesis", "catatan": "keluaran meter, bukan area tergenang; penurunan muka tanah tidak dihitung"}


def yakin_kemitraan(y):
    """Label yakin profil kemitraan -> enam nilai KA 8 (KA 27b)."""
    if y not in YAKIN_KEMITRAAN:
        raise ValueError(f"yakin kemitraan {y!r} tidak dikenal")
    return YAKIN_KEMITRAAN[y]


# ---------- keluaran per provinsi ----------
def masa_depan(prov, kab_hasil, n_model=None, G=None):
    """kab_hasil {kab4: susun_kab(...)} -> isi masa_depan/<prov>.json (selubung gudang). kab4 harus 4 digit Kemendagri dan berawalan prov."""
    G = G or _muat("gudang")
    for k in kab_hasil:
        if not (len(k) == 4 and k.isdigit() and k.startswith(prov)):
            raise ValueError(f"kab4 {k!r} bukan kode Kemendagri provinsi {prov}")
    return G.selubung("masa_depan", {
        "prov": prov, "yakin": "hipotesis",
        "dasar": {"sumber": "historical model yang sama", "periode": f"{DASAR[0]}-{DASAR[1]}"},
        "pembanding_bias": {"sumber": "chirps-v3", "periode": f"{DASAR[0]}-{DASAR[1]}", "status": "menunggu"},
        "horizon": list(HORIZON), "periode_horizon": {h: f"{a}-{b}" for h, (a, b) in HORIZON.items()},
        "skenario": list(SKENARIO), "indeks": list(INDEKS), "kab": kab_hasil,
        "muka_laut": {h: {s: muka_laut(h, s) for s in SKENARIO} for h in HORIZON},
        "catatan": CATATAN, "keterbatasan": "grid sekitar 27 km lebih kasar dari banyak kabupaten; kabupaten tanpa sel di dalam memakai sel terdekat ke centroid"})


def tulis(root, prov, isi):
    """Tulis siklus/saji/masa_depan/<prov>.json setelah lolos batas 2 MB dan kunci terlarang (saji.periksa_berkas); -> daftar masalah."""
    S = _muat("saji")
    data = json.dumps(isi, ensure_ascii=False, sort_keys=True).encode()
    m = S.periksa_berkas(f"siklus/saji/masa_depan/{prov}.json", data)
    if not m:
        j = os.path.join(root, "siklus/saji/masa_depan", f"{prov}.json")
        os.makedirs(os.path.dirname(j), exist_ok=True)
        open(j, "wb").write(data)
    return m


# ---------- lab (xarray; tidak dipakai uji) ----------
def lab_tahun(sumber, prov, akar=AKAR):
    """Satu berkas NEX-GDDP pr satu tahun (URL atau jalur .nc) -> {kab4: {rx1day, rx5day, cdd, n_sel, sel_terdekat}} untuk satu provinsi."""
    import fsspec, numpy as np, xarray as xr
    K = _muat("kunci")
    geo = json.load(open(os.path.join(akar, "public/geo/kabupaten", f"{prov}.json")))["features"]
    f = fsspec.open(sumber, "rb", block_size=4 * 1024 * 1024).open() if sumber.startswith("http") else sumber
    ds = xr.open_dataset(f, engine="h5netcdf", decode_times=False)
    kal = ds.time.attrs.get("calendar", "standard")
    tahun = int(sumber.rsplit("_", 1)[1][:4]) if "_gn_" in sumber else None
    pts = [c for ft in geo for p in _poligon(ft["geometry"]) for c in p[0]]
    x0, x1, y0, y1 = (min(c[0] for c in pts) - .5, max(c[0] for c in pts) + .5, min(c[1] for c in pts) - .5, max(c[1] for c in pts) + .5)
    pr = ds.pr.sel(lat=slice(y0, y1), lon=slice(x0, x1)).load()
    lats, lons = [float(v) for v in pr.lat], [float(v) for v in pr.lon]
    rr = np.asarray(pr.values, dtype="float64") * 86400
    hasil = {}
    for ft in geo:
        k = K.kab4(ft["properties"]["kab"], prov)
        if k is None:
            hasil["tak_terpetakan:" + ft["properties"]["kab"]] = None
            continue
        sel, dekat = sel_kabupaten(ft["geometry"], lats, lons)
        per = [indeks_tahun(rr[:, i, j].tolist(), kal, tahun) for i, j in sel]
        hasil[k] = {**{ix: sum(p[ix] for p in per) / len(per) for ix in INDEKS}, "n_sel": len(sel), "sel_terdekat": dekat}
    return {"tahun": tahun, "kalender": kal, "kab": hasil}


def _uji():
    # F6.3 kasus uji (UJ-F6-01)
    r = ringkas([-2, 0, 3, 5, 10])
    assert r["median"] == 3 and abs(r["p17"] - -0.64) < 1e-9 and abs(r["p83"] - 6.6) < 1e-9 and r["n_model_positif"] == 3 and r["n_model"] == 5, r
    d = delta_model([80, 100, 120, 100], [90, 90, 90, 90])
    assert d["P"] == 100 and d["B"] == 90 and d["delta"] == 10 and abs(d["relatif"] - 11.1111) < 1e-3, d
    assert delta_model([5], [0])["relatif"] is None, "B = 0: relatif null"
    assert ringkas([]) is None and delta_model([], [1]) is None, "tanpa data = None, bukan 0"
    # UJ-F6-02 indeks harian
    assert rx1day([0, 12.5, 3]) == 12.5 and cdd([0, .5, 1, 0, 0, 0, 3]) == 3 and cdd([1] * 5) == 0, "CDD: RR < 1 mm"
    a = [0] * 365
    a[0] = a[1] = a[2] = a[3] = a[4] = 10
    assert rx5day(a) == 50
    b = [0] * 365
    b[-2] = b[-1] = 10
    assert rx5day(b) == 20, "jendela tidak melintasi tahun: hanya dua hari terakhir tahun ini"
    assert indeks_tahun([0.0] * 360, "360_day", 2000)["cdd"] == 360 and panjang_tahun("proleptic_gregorian", 2000) == 366 and panjang_tahun("standard", 2100) == 365
    for salah, kal in (([0] * 364, "noleap"), ([0] * 365, "360_day"), ([0] * 365, "kalender_aneh"), ([0] * 364 + [-1], "noleap"), ([0] * 364 + [None], "noleap"), ([0] * 364 + [float("nan")], "noleap")):
        try:
            periksa_tahun(salah, kal, 2001)
            raise AssertionError("harus ditolak")
        except ValueError:
            pass
    # sel kabupaten: dalam poligon, atau terdekat ke centroid dan tercatat
    persegi = {"type": "Polygon", "coordinates": [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]]}
    assert sel_kabupaten(persegi, [.25, .75, 1.5], [.25, .75]) == ([(0, 0), (0, 1), (1, 0), (1, 1)], False)
    kecil = {"type": "Polygon", "coordinates": [[[.30, .30], [.32, .30], [.32, .32], [.30, .32], [.30, .30]]]}
    assert sel_kabupaten(kecil, [0, .25, .5], [0, .25, .5]) == ([(1, 1)], True), "tanpa sel di dalam: sel terdekat centroid"
    lubang = {"type": "Polygon", "coordinates": persegi["coordinates"] + [[[.2, .2], [.8, .2], [.8, .8], [.2, .8], [.2, .2]]]}
    assert sel_kabupaten(lubang, [.5], [.5])[1] is True, "lubang poligon tidak dihitung"
    # susun_kab: dua model, satu tanpa dasar lengkap
    th = lambda a, b, v: {t: v for t in range(a, b + 1)}
    m1 = {"historical": {"rx1day": th(1995, 2014, 90)}, "ssp245": {"rx1day": th(2021, 2040, 100)}}
    m2 = {"historical": {"rx1day": th(1995, 2014, 80)}, "ssp245": {"rx1day": th(2021, 2040, 78)}}
    m3 = {"historical": {"rx1day": th(1995, 2013, 80)}, "ssp245": {"rx1day": th(2021, 2040, 500)}}
    k = susun_kab({"A": m1, "B": m2, "C": m3}, bias_chirps={"rx1day": 70})
    c = k["2030"]["ssp245"]["rx1day"]
    assert c["n_model"] == 2 and c["median"] == 4 and c["selisih_dasar"] == 4 and c["n_model_positif"] == 1 and c["satuan"] == "mm", c
    assert c["dasar_median"] == 85 and c["bias_chirps"] == 15, "bias CHIRPS terpisah dari delta"
    kosong = k["2050"]["ssp585"]["cdd"]
    assert kosong["status"] == "menunggu" and kosong["median"] is None and kosong["bias_chirps"] is None and kosong["satuan"] == "hari", "tanpa data: menunggu, bukan 0"
    assert set(k) == {"2030", "2050"} and set(k["2030"]) == set(SKENARIO) and set(k["2030"]["ssp245"]) == set(INDEKS), "tiga indeks, dua skenario saja"
    # UJ-F6-04 label dan muka laut
    s = muka_laut("2050", "ssp245")
    assert s["median"] == .20 and s["rentang"] == [.17, .26] and s["yakin"] == "hipotesis" and "tidak dihitung" in s["catatan"]
    assert s["sumber"] == "AR6 WG1 Bab 9 lewat tabel HKO (R3), nilai tahun 2050" and s["titik_waktu"] == "2050"
    r4, r5, r10 = ringkas([1, 2, 3, 4]), ringkas([1, 2, 3, 4, 5]), ringkas(list(range(10)))
    assert r4["p17"] is None and r4["p83"] is None and r4["median"] == 2.5 and not r4["rentang_andal"], "n < 5: rentang menunggu"
    assert r5["p17"] is not None and not r5["rentang_andal"] and r10["rentang_andal"], "n >= 10 andal (ambang usulan)"
    assert muka_laut("2050", "ssp585")["rentang"] == [.20, .29]
    w = muka_laut("2030", "ssp245")
    assert w["status"] == "menunggu" and w["median"] is None and w["yakin"] == "hipotesis"
    assert [yakin_kemitraan(x) for x in ("tinggi", "sedang", "rendah", "tidak")] == ["terverifikasi", "terverifikasi", "estimasi-model", "hipotesis"]
    try:
        yakin_kemitraan("mungkin")
        raise AssertionError("label asing ditolak")
    except ValueError:
        pass
    # keluaran: hipotesis, kab4 Kemendagri provinsi sama, ukuran dan kunci terlarang
    isi = masa_depan("33", {"3301": k})
    assert isi["yakin"] == "hipotesis" and isi["jenis"] == "masa_depan" and isi["dasar"]["periode"] == "1995-2014" and isi["pembanding_bias"]["status"] == "menunggu"
    assert isi["catatan"].endswith("tidak dihitung") and "total" not in json.dumps(isi)
    for salah in ("3201", "33", "33.01", "kab"):
        try:
            masa_depan("33", {salah: k})
            raise AssertionError("kab4 salah ditolak")
        except ValueError:
            pass
    with tempfile.TemporaryDirectory() as t:
        assert tulis(t, "33", isi) == [] and os.path.getsize(os.path.join(t, "siklus/saji/masa_depan/33.json")) < 2_000_000
        besar = {**isi, "kab": {f"33{i:02d}": k for i in range(1, 99)} | {"x": "y" * 2_000_000}}
        assert "melewati batas" in " ".join(tulis(t, "34", besar)) and not os.path.exists(os.path.join(t, "siklus/saji/masa_depan/34.json"))
        bad = {**isi, "kab": {"3301": {"total": 5}}}
        assert "kunci terlarang" in " ".join(tulis(t, "35", bad))
        # saji.masa_depan_ringkas membaca bentuk ini
        S = _muat("saji")
        rg = S.masa_depan_ringkas(t)
        assert rg["yakin"] == "hipotesis" and rg["prov"]["33"]["2030"]["ssp245"]["rx1day"] == 4
    print("iklim_lab: uji hijau")


if __name__ == "__main__":
    a = sys.argv[1:]
    if a[:1] == ["uji"]:
        _uji()
    elif a[:1] == ["lab"] and len(a) >= 3:
        try:
            r = lab_tahun(a[2], a[1])
        except ImportError as e:
            sys.exit(f"pustaka lab belum ada ({e}); pasang di venv sementara, bukan di repo")
        s = json.dumps(r, ensure_ascii=False, sort_keys=True, indent=1)
        open(a[3], "w").write(s) if len(a) > 3 else print(s)
    else:
        sys.exit("pakai: iklim_lab.py uji | lab PROV URL_ATAU_NC [KELUAR.json]")
