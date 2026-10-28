"""LAB (bukan produksi, tanpa layar): luas terbakar dari dNBR Sentinel-2 diuji terhadap Gaveau 2019 dan dibandingkan dengan M0 (titik x 4,3 ha).

Kriteria dikunci di lab_kriteria/lab_dnbr.json (ber-hash, ditulis sebelum hasil). Memakai ulang: konsesi_citra_jelas.sampel (NBR per piksel, masker SCL; pembaca COG citra.py),
luas_citra.adegan_antara (pencarian STAC Earth Search), wilayah.Wilayah (provinsi), Anggaran gaya lab_luas.
Pakai:  python3 scripts/data/lab_dnbr.py uji     # self-check sintetis, tanpa jaringan
        LAB_MENIT=25 python3 scripts/data/lab_dnbr.py jalan   # -> public/data/lab/dnbr.json + dnbr_ringkas.md
Gaveau: GAVEAU_SHP=<jalur .shp> (bawaan data/raw/lab/gaveau/2019_burnarea_indonesia.shp; diunduh dari Zenodo bila tak ada).
Stdlib saja. Keterbatasan: gambut sering membara di bawah permukaan (dNBR tak melihat); satu tahun acuan; sampel kotak, bukan seluruh Indonesia.
"""
import csv, datetime as dt, hashlib, json, math, mmap, os, random, struct, sys, time, urllib.request

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from wilayah import AKAR  # noqa: E402

KRIT_JALUR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "lab_kriteria", "lab_dnbr.json")
KRIT = json.load(open(KRIT_JALUR, encoding="utf-8"))
SHA = hashlib.sha256(json.dumps(KRIT, sort_keys=True, separators=(",", ":"), ensure_ascii=False).encode()).hexdigest()
OUT = os.path.join(AKAR, "public/data/lab")
RAW = os.path.join(AKAR, "data/raw/lab")
CSV = os.path.join(AKAR, "data/raw/firms/viirs_2019.csv")
KM, N = KRIT["kotak"]["km"], KRIT["kotak"]["n"]
GRID = KRIT["dnbr"]["grid_kalibrasi"]
EPS = KRIT["uji"]["eps_ha"]
PX_HA = (KM * 1000 / N) ** 2 / 1e4
FAKTOR = 4.3
UJI_USGS = KRIT["dnbr"]["usgs"][KRIT["dnbr"]["usgs_utama"]]


# ---------------- Gaveau: pembaca shp stdlib + rasterisasi scanline ----------------
def baca_shp(jalur, kotak_list):
    """Poligon (cincin [(lon,lat)..]) milik rekaman yang bbox-nya menyentuh salah satu kotak (w,s,e,n). -> {indeks_kotak: [poligon]}"""
    hasil = {i: [] for i in range(len(kotak_list))}
    with open(jalur, "rb") as f, mmap.mmap(f.fileno(), 0, access=mmap.ACCESS_READ) as m:
        pos, tot = 100, len(m)
        while pos + 12 <= tot:
            panjang = struct.unpack(">i", m[pos + 4:pos + 8])[0] * 2
            isi = pos + 8
            tipe = struct.unpack("<i", m[isi:isi + 4])[0]
            if tipe in (5, 15, 25):
                w, s, e, n = struct.unpack("<4d", m[isi + 4:isi + 36])
                kena = [i for i, k in enumerate(kotak_list) if w <= k[2] and e >= k[0] and s <= k[3] and n >= k[1]]
                if kena:
                    npart, npt = struct.unpack("<2i", m[isi + 36:isi + 44])
                    parts = list(struct.unpack("<%di" % npart, m[isi + 44:isi + 44 + 4 * npart])) + [npt]
                    po = isi + 44 + 4 * npart
                    xy = struct.unpack("<%dd" % (2 * npt), m[po:po + 16 * npt])
                    cinc = [[(xy[2 * j], xy[2 * j + 1]) for j in range(parts[p], parts[p + 1])] for p in range(npart)]
                    for i in kena:
                        hasil[i].append(cinc)
            pos = isi + panjang
    return hasil


def kotak_ll(lat, lon, km=KM):
    ky, kx = 110.574, 111.32 * math.cos(math.radians(lat))
    return (lon - km / 2 / kx, lat - km / 2 / ky, lon + km / 2 / kx, lat + km / 2 / ky)


def raster_poligon(cinc, lat, lon, km=KM, n=N):
    """satu poligon (banyak cincin; even-odd lintas cincin) -> bytearray"""
    ky, kx = 110.574, 111.32 * math.cos(math.radians(lat))
    h = km / n
    mask = bytearray(n * n)
    edges = [(y1, y2, x1, x2) for r in cinc for (x1, y1), (x2, y2) in zip(r, r[1:] + r[:1]) if y1 != y2]
    for y in range(n):
        la = lat + (km / 2 - (y + .5) * h) / ky
        xs = sorted(x1 + (la - y1) * (x2 - x1) / (y2 - y1) for y1, y2, x1, x2 in edges if (y1 > la) != (y2 > la))
        for a, b in zip(xs[::2], xs[1::2]):
            for c in range(max(0, math.ceil(((a - lon) * kx + km / 2) / h - .5)), min(n - 1, math.floor(((b - lon) * kx + km / 2) / h - .5)) + 1):
                mask[y * n + c] = 1
    return mask


def acuan_kotak(polys, lat, lon):
    """union poligon Gaveau pada grid kotak -> bytearray"""
    out = bytearray(N * N)
    for cinc in polys:
        m = raster_poligon(cinc, lat, lon)
        for i, v in enumerate(m):
            if v:
                out[i] = 1
    return out


def unduh_gaveau():
    jalur = os.environ.get("GAVEAU_SHP") or os.path.join(RAW, "gaveau", "2019_burnarea_indonesia.shp")
    if os.path.exists(jalur):
        return jalur
    import zipfile
    d = os.path.dirname(jalur)
    os.makedirs(d, exist_ok=True)
    z = os.path.join(d, "g.zip")
    urllib.request.urlretrieve("https://zenodo.org/api/records/4551243/files/2019_burnedarea_indonesia.zip/content", z)
    zipfile.ZipFile(z).extractall(d)
    os.remove(z)
    return jalur


# ---------------- dNBR ----------------
def hitung(nbr_pra, nbr_pasca, ref=None):
    """-> {n_valid, per_ambang: {t: [n_terbakar, n_tp]}}; ref: bytearray acuan (tp = terbakar DAN acuan) atau None. Valid = kedua NBR ada."""
    sah = [(a - b, (ref[i] if ref else 0)) for i, (a, b) in enumerate(zip(nbr_pra, nbr_pasca)) if a is not None and b is not None]
    per = {}
    for t in GRID:
        k = [(d, r) for d, r in sah if d > t]
        per[str(t)] = [len(k), sum(r for _, r in k)]
    return {"n_valid": len(sah), "ref_valid": sum(r for _, r in sah), "per_ambang": per}


def luas_ha(h, t, n_total=N * N):
    """ekstrapolasi: porsi terbakar pada piksel valid x seluruh piksel kotak x luas piksel"""
    return h["per_ambang"][str(t)][0] / h["n_valid"] * n_total * PX_HA if h["n_valid"] else None


def galat(pred, acuan):
    return math.log((pred + EPS) / (acuan + EPS))


def median(xs):
    s = sorted(xs)
    n = len(s)
    return None if not n else (s[n // 2] if n % 2 else (s[n // 2 - 1] + s[n // 2]) / 2)


def kalibrasi_lopo(kot):
    """kot: list dict {prov, h, acuan_ha}. -> ({prov: ambang}, ambang_semua). Ambang tiap provinsi dipilih dari kotak provinsi LAIN (median |galat| minimum; seri -> ambang lebih tinggi)."""
    def terbaik(sub):
        sk = {t: median([abs(galat(luas_ha(k["h"], t), k["acuan_ha"])) for k in sub]) for t in GRID}
        return min(GRID, key=lambda t: (round(sk[t], 9), -t)) if sub else None
    # satu provinsi saja: tak ada pelatih lain -> jatuh ke ambang USGS utama
    return {p: terbaik([k for k in kot if k["prov"] != p]) or UJI_USGS for p in {k["prov"] for k in kot}}, terbaik(kot)


def bootstrap_ci(sel, ulang, benih, tingkat):
    """CI persentil dari median(sel) dengan resampling kotak"""
    rng = random.Random(benih)
    m = sorted(median([rng.choice(sel) for _ in sel]) for _ in range(ulang))
    a = (1 - tingkat) / 2
    return m[int(a * (len(m) - 1))], m[int((1 - a) * (len(m) - 1))]


def vonis(kot):
    """kot: kotak dinilai (prov, h, acuan_ha, m0_ha). -> ringkasan metrik + keputusan per kriteria."""
    u = KRIT["uji"]
    if not kot:
        return {"n_kotak": 0, "lolos": False, "alasan": "tak ada kotak dinilai"}
    amb, amb_semua = kalibrasi_lopo(kot)
    for k in kot:
        k["lopo_t"] = amb[k["prov"]]
        k["pred_lopo"] = luas_ha(k["h"], amb[k["prov"]])
        k["pred_usgs"] = luas_ha(k["h"], UJI_USGS)
    e_m0 = [abs(galat(k["m0_ha"], k["acuan_ha"])) for k in kot]
    e_lo = [abs(galat(k["pred_lopo"], k["acuan_ha"])) for k in kot]
    e_us = [abs(galat(k["pred_usgs"], k["acuan_ha"])) for k in kot]
    def banding(e):
        sel = [a - b for a, b in zip(e_m0, e)]
        lo, hi = bootstrap_ci(sel, u["bootstrap_ulang"], u["bootstrap_benih"], u["tingkat_ci"])
        return {"median_abs_galat_log": round(median(e), 4), "faktor_median": round(math.exp(median(e)), 3), "selisih_vs_M0_median": round(median(sel), 4), "selisih_ci90": [round(lo, 4), round(hi, 4)], "lebih_baik_dari_M0": median(e) < median(e_m0) and lo > 0}
    pv = {}
    for p in sorted({k["prov"] for k in kot}):
        s = [k for k in kot if k["prov"] == p]
        pv[p] = {"n": len(s), "acuan_ha": round(sum(k["acuan_ha"] for k in s)), "M0_ha": round(sum(k["m0_ha"] for k in s)), "dnbr_lopo_ha": round(sum(k["pred_lopo"] for k in s)), "dnbr_usgs_ha": round(sum(k["pred_usgs"] for k in s))}
    lopo, usgs = banding(e_lo), banding(e_us)
    cukup = len(kot) >= u["min_kotak_dinilai"] and len(pv) >= u["min_provinsi"]
    return {"n_kotak": len(kot), "n_provinsi": len(pv), "cukup_data": cukup, "M0": {"median_abs_galat_log": round(median(e_m0), 4), "faktor_median": round(math.exp(median(e_m0)), 3)},
            "dnbr_lopo": lopo, "dnbr_usgs_0.27": usgs, "ambang_lopo_per_provinsi": amb, "ambang_semua_kotak": amb_semua, "per_provinsi": pv,
            "total": {"acuan_ha": round(sum(k["acuan_ha"] for k in kot)), "M0_ha": round(sum(k["m0_ha"] for k in kot)), "dnbr_lopo_ha": round(sum(k["pred_lopo"] for k in kot)), "dnbr_usgs_ha": round(sum(k["pred_usgs"] for k in kot))},
            "lolos": bool(cukup and lopo["lebih_baik_dari_M0"])}


# ---------------- pemilihan kotak ----------------
def muat_titik():
    pts = []
    with open(CSV) as f:
        for r in csv.DictReader(f):
            if r["satellite"] == "N" and r["confidence"] in ("n", "h") and r["type"] == "0":
                pts.append((float(r["latitude"]), float(r["longitude"]), r["acq_date"]))
    return pts


def pilih_kotak(pts, wil, kr=KRIT["kotak"]):
    j0, j1 = kr["jendela_titik"]
    s = kr["sel_derajat"]
    sel = {}
    for la, lo, d in pts:
        if j0 <= d <= j1:
            sel.setdefault((round(la / s), round(lo / s)), []).append(1)
    rng = random.Random(kr["benih"])
    per = {}
    for (a, b), v in sorted(sel.items()):
        la, lo = a * s, b * s
        strata = "tinggi" if len(v) >= kr["titik_min_tinggi"] else "sedang" if len(v) >= kr["titik_min_sedang"] else None
        w = wil.cari(lo, la) if strata else None
        if w:
            per.setdefault((w[0], strata), []).append({"lat": round(la, 4), "lon": round(lo, 4), "prov": w[0], "strata": strata, "n_titik_jendela": len(v)})
    out = []
    for k in sorted(per):
        c = rng.sample(per[k], len(per[k]))
        ambil = []
        for x in c:
            if len(ambil) >= kr["per_provinsi_per_strata"]:
                break
            if all(abs(x["lat"] - y["lat"]) > KM / 110 * 1.2 or abs(x["lon"] - y["lon"]) > KM / 110 * 1.2 for y in out + ambil):
                ambil.append(x)
        out += ambil
    rng.shuffle(out)
    return out[:kr["maks_kotak"]]


def titik_m0(pts, lat, lon, d0, d1):
    w, s, e, n = kotak_ll(lat, lon)
    return sum(1 for la, lo, d in pts if d0 <= d <= d1 and s <= la <= n and w <= lo <= e)


# ---------------- jaringan ----------------
def adegan_nbr(J, LC, C, lat, lon, jendela, kr):
    """adegan bersih terbaik di jendela: (tgl, id, nbr, awan%) atau None. Kandidat berurut awan item terendah."""
    cand = sorted(LC.adegan_antara(C, lat, lon, KM, jendela[0], jendela[1]), key=lambda a: a[1])[:kr["kandidat_maks"]]
    for tgl, _, it in cand:
        r = J.sampel(it, lat, lon, KM)
        if r and r[2] <= kr["awan_maks_pct"] and sum(1 for v in r[0] if v is not None) >= N * N * kr["cakupan_min_pct"] / 100:
            return tgl, it["id"], r[0], r[2]
    return None


def kotak_satu(J, LC, C, k, polys, pts):
    kr = KRIT["adegan"]
    pra = adegan_nbr(J, LC, C, k["lat"], k["lon"], kr["pra"], kr)
    if not pra:
        return {**k, "dibuang": "tak ada adegan pra bersih"}
    pas = adegan_nbr(J, LC, C, k["lat"], k["lon"], kr["pasca"], kr)
    if not pas:
        return {**k, "dibuang": "tak ada adegan pasca bersih"}
    ref = acuan_kotak(polys, k["lat"], k["lon"])
    h = hitung(pra[2], pas[2], ref)
    if h["n_valid"] < N * N * kr["cakupan_min_pct"] / 100:
        return {**k, "dibuang": "cakupan valid gabungan rendah (%d%%)" % (100 * h["n_valid"] / N / N)}
    return {**k, "tgl_pra": pra[0], "tgl_pasca": pas[0], "adegan_pra": pra[1], "adegan_pasca": pas[1], "awan_pasca_pct": pas[3], "h": h,
            "acuan_ha": round(sum(ref) * PX_HA, 1), "n_titik_m0": titik_m0(pts, k["lat"], k["lon"], pra[0], pas[0])}


def jalan():
    import konsesi_citra_jelas as J, luas_citra as LC, citra as C
    from wilayah import Wilayah
    J.N = N
    t0, total = time.time(), float(os.environ.get("LAB_MENIT", "25")) * 60
    pts = muat_titik()
    kotak = pilih_kotak(pts, Wilayah())
    print("kotak terpilih", len(kotak), file=sys.stderr)
    shp = unduh_gaveau()
    polys = baca_shp(shp, [kotak_ll(k["lat"], k["lon"]) for k in kotak])
    cache = os.path.join(RAW, "dnbr_kotak")
    os.makedirs(cache, exist_ok=True)
    hasil, tertunda = [], 0
    for i, k in enumerate(kotak):
        cj = os.path.join(cache, "%s_%s_%s.json" % (SHA[:8], k["lat"], k["lon"]))
        if os.path.exists(cj):
            hasil.append(json.load(open(cj)))
            continue
        if time.time() - t0 > total:
            tertunda += 1
            continue
        try:
            r = kotak_satu(J, LC, C, k, polys[i], pts)
        except (OSError, TimeoutError) as e:
            r = None
            print("galat jaringan", k["lat"], k["lon"], e, file=sys.stderr)
        if r is None:
            tertunda += 1
            continue
        json.dump(r, open(cj, "w"))
        hasil.append(r)
        print(i, k["prov"], "dibuang=" + r["dibuang"] if "dibuang" in r else "ok", file=sys.stderr)
    simpan(hasil, tertunda, len(kotak), round(time.time() - t0))


def simpan(hasil, tertunda, n_kotak, detik):
    nilai = []
    for r in hasil:
        if "h" not in r:
            continue
        nilai.append({**r, "m0_ha": r["n_titik_m0"] * FAKTOR})
    v = vonis(nilai)
    dibuang = {}
    for r in hasil:
        if "dibuang" in r:
            dibuang[r["dibuang"].split(" (")[0]] = dibuang.get(r["dibuang"].split(" (")[0], 0) + 1
    J = {"versi": 1, "status": "LAB, bukan produksi", "dibuat": dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds"), "kriteria_sha": SHA, "kriteria": KRIT,
         "cakupan": {"kotak_dipilih": n_kotak, "kotak_dinilai": len(nilai), "kotak_dibuang": dibuang, "kotak_tertunda_anggaran": tertunda, "detik": detik,
                     "ket": "sampel kotak 6x6 km dari sel titik panas S-NPP 2019 (strata tinggi/sedang per provinsi), BUKAN seluruh Indonesia; kotak tanpa adegan bersih dibuang (bias seleksi ke wilayah kurang berawan)"},
         "vonis": v,
         "keterbatasan": ["Gambut sering membara di bawah permukaan: dNBR tidak melihatnya, luas gambut cenderung kurang.", "Satu tahun acuan (2019): LOYO tidak mungkin; ambang LOPO hanya lintas provinsi.",
                          "Acuan Gaveau berbasis Sentinel-2 juga: independen metode, bukan sensor; Gaveau bukan kebenaran lapangan.", "GFED5 tidak dipakai (netCDF4 tak terpasang, resolusi 0,25 derajat).",
                          "Pasca Okt-Des 2019: api sesudah tanggal adegan pasca tak terlihat, bekas tua memudar; M0 dihitung pada jendela tanggal yang sama.", "B8A (20 m) menggantikan B8; masker awan dilebarkan hanya 1 piksel (20 m), bayangan tipis bisa lolos.",
                          "M1 tidak ada keluaran per kotak, tidak dibandingkan."],
         "kotak": [{k: r[k] for k in ("lat", "lon", "prov", "strata", "n_titik_jendela", "tgl_pra", "tgl_pasca", "acuan_ha", "n_titik_m0", "m0_ha", "pred_lopo", "pred_usgs", "lopo_t") if k in r} for r in nilai]}
    os.makedirs(OUT, exist_ok=True)
    json.dump(J, open(os.path.join(OUT, "dnbr.json"), "w"), ensure_ascii=False, separators=(",", ":"), default=lambda o: round(o, 3))
    open(os.path.join(OUT, "dnbr_ringkas.md"), "w").write(ringkas(J))
    print("dnbr.json ditulis; lolos =", v.get("lolos"), file=sys.stderr)


def ringkas(J):
    v, c = J["vonis"], J["cakupan"]
    L = ["# LAB dNBR Sentinel-2 vs Gaveau 2019 (bukan produksi)", "", "Status: **%s** · kriteria_sha %s" % ("LOLOS" if v.get("lolos") else "TIDAK LOLOS", J["kriteria_sha"][:12]), "",
         "Cakupan: %d kotak 6x6 km dipilih, %d dinilai, dibuang %s, tertunda %d. Sampel, bukan seluruh Indonesia." % (c["kotak_dipilih"], c["kotak_dinilai"], c["kotak_dibuang"], c["kotak_tertunda_anggaran"]), ""]
    if v.get("n_kotak"):
        L += ["| Metode | median abs galat-log | faktor | selisih vs M0 (CI90) |", "|---|---|---|---|",
              "| M0 titik x 4,3 ha | %s | %sx | - |" % (v["M0"]["median_abs_galat_log"], v["M0"]["faktor_median"])]
        for nm, k in (("dNBR LOPO", "dnbr_lopo"), ("dNBR USGS 0,27", "dnbr_usgs_0.27")):
            m = v[k]
            L.append("| %s | %s | %sx | %s %s |" % (nm, m["median_abs_galat_log"], m["faktor_median"], m["selisih_vs_M0_median"], m["selisih_ci90"]))
        t = v["total"]
        L += ["", "Total semua kotak (ha): acuan %s, M0 %s, dNBR LOPO %s, dNBR USGS %s." % (t["acuan_ha"], t["M0_ha"], t["dnbr_lopo_ha"], t["dnbr_usgs_ha"]), "Ambang kalibrasi semua kotak: %s." % v["ambang_semua_kotak"]]
    L += ["", "Keterbatasan:"] + ["- " + x for x in J["keterbatasan"]]
    return "\n".join(L) + "\n"


# ---------------- uji sintetis ----------------
def uji():
    import tempfile
    # 1. scanline = pip, termasuk lubang
    lat, lon = -2.0, 110.0
    w, s, e, n = kotak_ll(lat, lon)
    cx, cy = (w + e) / 2, (s + n) / 2
    dx, dy = (e - w) / 6, (n - s) / 6
    luar = [(cx - dx, cy - dy), (cx + dx, cy - dy), (cx + dx, cy + dy), (cx - dx, cy + dy)]
    lubang = [(cx - dx / 2, cy - dy / 2), (cx + dx / 2, cy - dy / 2), (cx + dx / 2, cy + dy / 2), (cx - dx / 2, cy + dy / 2)]
    m = raster_poligon([luar], lat, lon)
    assert abs(sum(m) * PX_HA - (2 * dx * 111.32 * math.cos(math.radians(lat))) * (2 * dy * 110.574) * 100) < 0.02 * sum(m) * PX_HA, sum(m) * PX_HA
    m2 = raster_poligon([luar, lubang], lat, lon)
    assert abs(sum(m2) / sum(m) - 0.75) < 0.03
    # 2. pembaca shp: tulis shp mini dengan dua poligon, hanya yang menyentuh kotak terbaca
    def rek(no, cinc):
        pts = [p for r in cinc for p in r]
        xs, ys = [p[0] for p in pts], [p[1] for p in pts]
        body = struct.pack("<i4d2i", 5, min(xs), min(ys), max(xs), max(ys), 1, len(pts)) + struct.pack("<i", 0) + b"".join(struct.pack("<2d", *p) for p in pts)
        return struct.pack(">2i", no, len(body) // 2) + body
    jauh = [[(120.0, 1.0), (120.1, 1.0), (120.1, 1.1)]]
    with tempfile.TemporaryDirectory() as d:
        p = os.path.join(d, "t.shp")
        data = rek(1, [luar]) + rek(2, jauh)
        open(p, "wb").write(b"\0" * 100 + data)
        got = baca_shp(p, [(w, s, e, n)])[0]
        assert len(got) == 1 and len(got[0][0]) == 4
    # 3. dNBR: 25% piksel terbakar; luas, ekstrapolasi, tp
    pra = [0.5] * 100
    pas = [0.5 - (0.3 if i < 25 else 0.0) for i in range(100)]
    pas[99] = None
    ref = bytearray([1] * 25 + [0] * 75)
    h = hitung(pra, pas, ref)
    assert h["n_valid"] == 99 and h["per_ambang"]["0.27"] == [25, 25] and h["per_ambang"]["0.35"] == [0, 0]
    assert abs(luas_ha(h, 0.27, 99) - 25 * PX_HA) < 1e-6
    # 4. LOPO: ambang benar (0.27 memisahkan) terpilih dari provinsi lain; M0 buruk kalah
    def kot(p, i):
        ha = 100 + 20 * i
        nb = int(ha / (N * N * PX_HA) * 1000)
        h_ = {"n_valid": 1000, "ref_valid": 0, "per_ambang": {str(t): [nb if t <= 0.27 else 0, 0] for t in GRID}}
        h_["per_ambang"]["0.05"][0] = nb * 5      # ambang rendah menggelembungkan (fenologi)
        return {"prov": p, "h": h_, "acuan_ha": nb / 1000 * N * N * PX_HA, "m0_ha": nb / 1000 * N * N * PX_HA * 4}
    ks = [kot(p, i) for p in ("11", "12", "13") for i in range(6)]
    amb, _ = kalibrasi_lopo(ks)
    assert set(amb.values()) == {0.27}, amb
    v = vonis(ks)
    assert v["lolos"] and v["dnbr_lopo"]["median_abs_galat_log"] < 0.01 < v["M0"]["median_abs_galat_log"], v
    assert not vonis(ks[:5])["lolos"]                 # data kurang = tidak lolos
    # 5. ringkas jalan tanpa galat
    J = {"vonis": v, "cakupan": {"kotak_dipilih": 18, "kotak_dinilai": 18, "kotak_dibuang": {}, "kotak_tertunda_anggaran": 0}, "kriteria_sha": SHA, "keterbatasan": ["x"]}
    assert "LOLOS" in ringkas(J)
    print("uji lab_dnbr: semua lolos")


if __name__ == "__main__":
    uji() if sys.argv[1:] == ["uji"] else jalan()
