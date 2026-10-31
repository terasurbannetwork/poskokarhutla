"""#33 Risiko per kabupaten R = H x V / C (Perka BNPB 2/2012) + uji balik terhadap korban jiwa DIBI
-> public/data/bnpb/risiko_hvc.json (R per kabupaten + hasil uji)  dan  public/data/bnpb/dibi_kab_tahun.json (tabel label)

H  (bahaya)       indeks bahaya InaRISK 0-1 per jenis, rata-rata semua kecamatan di kabupaten (bukan maks: maks menjenuhkan, 440 dari 515
                  kabupaten bernilai 100 untuk banjir). Banjir/longsor/kekeringan/abrasi dari public/banjir/data/bahaya.json, gempa dari
                  public/gempa/data/inarisk_gempa.json (keduanya sudah ada di repo), karhutla dan cuaca ekstrem dicuplik dengan cara yang sama
                  (titik pusat kecamatan, ImageServer InaRISK). Tsunami dan gunung api tidak punya H di repo: barisnya dibuang dan dihitung.
V  (kerentanan)   V_z dari kerentanan.json (#28 #29 + Dukcapil). C (kapasitas) dari ikd.json (#32). Kapasitas fiskal DJPK (#33): MENUNGGU DATA.
R  (indeks)       R_j = H01_j x V01 / C01,  V01 = Phi(V_z) (0-1),  C01 = max(C, 0,05).  R_kab = jumlah R_j; jenis utama = argmax R_j.
                  Ini INDEKS peringkat, bukan peluang atau jumlah korban.
LABEL             DIBI BNPB (Superset publik, scripts/banjir/kejadian.py:superset), baris = kabupaten x tahun x kelompok jenis.
                  y = meninggal + hilang (jiwa), kejadian = jumlah kejadian DIBI baris itu. Hanya kabupaten-tahun yang MENCATAT kejadian
                  ada barisnya, jadi model ini menjawab "berapa korban jiwa per kejadian yang tercatat", bukan "di mana akan ada kejadian".
MODEL             E[y] = kejadian x exp(b0 + jenis + b_H H + b_V V_z + b_C C_z) , sebaran NB2 (Poisson bila LR tak menolak; lihat hvc_stat).
                  M0 jenis saja (pembanding naif: laju per kejadian per jenis)  |  M1 +H (pembanding resmi pesanan)  |  M2 +H+V+C
                  |  M3 jenis + ln R (rumus Perka sebagai satu fitur).  Latih tahun <= 2021, uji 2022 sampai tahun penuh terakhir.
SKOR              log-kemungkinan NB uji per baris (aturan skor sejati, makin besar makin baik), deviance Poisson, MAE jiwa per baris.
VONIS             LOLOS bila selisih skor-log M2 - M1 DAN M2 - M0 punya batas bawah selang 95% (bootstrap per kabupaten) > 0. Selain itu GAGAL.
BATAS             V dan C statis (terukur sekitar 2020-2025) dipakai untuk label 2015-2021: tidak ada kebocoran label, tetapi ada
                  ketidakcocokan waktu. DIBI mencatat per kabupaten dan pelaporannya ikut penduduk dan kapasitas pelapor. Sebagian besar
                  korban jiwa datang dari segelintir kejadian (Palu 2018, banjir Sumatra 2025), jadi ukuran uji kecil secara efektif.
Pakai:  python3 scripts/bnpb/risiko_hvc.py [--tanpa-jaringan]   |   python3 scripts/bnpb/risiko_hvc.py --cek
"""
import datetime as dt, importlib.util, json, math, os, sys, time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import hvc_dasar as D
import hvc_stat as S
import terpapar as T

TAHUN_MULAI, TRAIN_AKHIR = 2015, 2021
CATATAN_RUMUS = ("Rumus kita H x V / C (Perka BNPB 2/2012) berbeda dari rumus Buku RBI R = (H x V x (1-C))^(1/3) (Buku RBI hal. 53) "
                 "dan dari IRB resmi BNPB (deret LAKIP 2025, baseline 147,95). Skor ini peringkat relatif antarkabupaten, "
                 "bukan nilai IRB resmi, dan tidak boleh disebut IRB.")
C_MIN = 0.05
JENIS_H = ["banjir", "longsor", "kekeringan", "abrasi", "gempa", "karhutla", "cuaca"]
PETA_JENIS = {
    "banjir": ["Banjir", "Banjir dan Tanah Longsor", "Banjir Bandang", "Banjir Genangan", "Banjir Rob", "Banjir Lahar (Lahar)"],
    "longsor": ["Tanah Longsor", "Gerakan Tanah"],
    "kekeringan": ["Kekeringan", "Kekeringan Pertanian"],
    "abrasi": ["Gelombang Pasang / Abrasi", "Abrasi Pantai", "Gelombang Pasang"],
    "gempa": ["Gempabumi", "Gempa Bumi dan Tsunami", "Gempabumi Reruntuhan"],
    "karhutla": ["Kebakaran Hutan dan Lahan", "Kebakaran Lahan", "Kebakaran Hutan", "Kebakaran Lahan Gambut"],
    "cuaca": ["Cuaca Ekstrem", "Puting Beliung", "Angin Kencang", "Angin Topan"],
}
JENIS_DARI_NAMA = {n: j for j, ns in PETA_JENIS.items() for n in ns}
LAPISAN_TAMBAH = {"karhutla": "layer_bahaya_kebakaran_hutan_dan_lahan", "cuaca": "layer_bahaya_cuaca_ekstrim"}
METRIK_DIBI = [("jumlah_kejadian", "jumlah_kejadian"), ("meninggal", "meninggal"), ("hilang", "hilang"), ("luka_sakit", "luka"),
               ("menderita", "terdampak"), ("mengungsi", "mengungsi"), ("rumah_rusak_berat", "rr_berat")]
MODEL = {"M0": "jenis saja (naif)", "M1": "jenis + H", "M2": "jenis + H + V + C", "M3": "jenis + ln R"}


# ------------------------------------------------------------------ label DIBI
def jenis_kelompok(nama):
    return JENIS_DARI_NAMA.get(str(nama).strip())


def agregasi_dibi(baris, tahun):
    """Baris mentah Superset (tahun, id_kab_bps, jenis_bencana, SUM...) -> {(kode, tahun, kelompok): [kejadian, meninggal, hilang, luka, terdampak, mengungsi, rr_berat]}
    Jenis di luar PETA_JENIS dibuang (dihitung di `dibuang`)."""
    out, dibuang = {}, 0
    for r in baris:
        j = jenis_kelompok(r.get("jenis_bencana"))
        kab = r.get("id_kab_bps")
        if j is None or not kab:
            dibuang += 1
            continue
        a = out.setdefault((f"{int(kab):04d}", tahun, j), [0] * len(METRIK_DIBI))
        for i, (kol, _) in enumerate(METRIK_DIBI):
            a[i] += int(round(float(r.get(kol) or 0)))
    return out, dibuang


def tarik_dibi(tahun_akhir):
    s = importlib.util.spec_from_file_location("banjir_kejadian", os.path.join(D.AKAR, "scripts/banjir/kejadian.py"))
    sys.path.insert(0, os.path.join(D.AKAR, "scripts/banjir"))
    m = importlib.util.module_from_spec(s)
    s.loader.exec_module(m)
    kol = ["tahun", "id_kab_bps", "jenis_bencana"]
    met = [(k, f"SUM({k})") for k, _ in METRIK_DIBI]
    total, dibuang = {}, 0
    for th in range(TAHUN_MULAI, tahun_akhir + 1):
        r = m.superset(kol, met, [{"col": "tahun", "op": "IN", "val": [th]}], 50000)
        if len(r) >= 50000:
            raise RuntimeError(f"DIBI {th}: batas 50.000 baris tercapai")
        a, d = agregasi_dibi(r, th)
        total.update(a)
        dibuang += d
        print(f"  DIBI {th}: {len(r)} baris -> {len(a)} kab-jenis", file=sys.stderr)
        time.sleep(1)
    return total, dibuang


# ------------------------------------------------------------------ H per kabupaten
def h_dari_kecamatan(nilai_kec, peta_kode):
    """{ "prov|kab|kec": nilai 0-1 } -> {kode kab: rata-rata semua kecamatan} (kecamatan tanpa nilai = nol bahaya di raster)."""
    s = {}
    for k, v in nilai_kec.items():
        kode = peta_kode.get("|".join(k.split("|")[:2]))
        if kode:
            t = s.setdefault(kode, [0.0, 0])
            t[0] += float(v or 0.0)
            t[1] += 1
    return {k: t[0] / t[1] for k, t in s.items()}


def muat_h():
    peta = D.kab_kode()
    bj = json.load(open(os.path.join(D.AKAR, "public/banjir/data/bahaya.json")))["kec"]
    gm = json.load(open(os.path.join(D.AKAR, "public/gempa/data/inarisk_gempa.json")))["nilai"]
    kec = {"banjir": {k: max(v["banjir"], v["bandang"]) for k, v in bj.items()}, "longsor": {k: v["longsor"] for k, v in bj.items()},
           "kekeringan": {k: v["kering"] for k, v in bj.items()}, "abrasi": {k: v["gelombang"] for k, v in bj.items()}, "gempa": gm}
    pusat = json.load(open(os.path.join(D.AKAR, "public/banjir/data/pusat_kec.json")))
    kunci = list(pusat)
    for j, lay in LAPISAN_TAMBAH.items():
        cache = os.path.join(D.MENTAH, f"h_kec_{j}.json")
        if os.path.exists(cache) and len(json.load(open(cache))) == len(kunci):
            v = json.load(open(cache))
        else:
            v = T.sampel(lay, [(pusat[k][1], pusat[k][0]) for k in kunci])
            os.makedirs(D.MENTAH, exist_ok=True)
            json.dump(v, open(cache, "w"), separators=(",", ":"))
        kec[j] = dict(zip(kunci, v))
    return {j: h_dari_kecamatan(kec[j], peta) for j in JENIS_H}


# ------------------------------------------------------------------ R dan fitur
def indeks_r(h01, v_z, c_raw):
    """R = H01 x V01 / C01 ; V01 = Phi(V_z), C01 = max(C, C_MIN). Semua syarat: h01 dalam [0,1]."""
    return h01 * S.cdf_normal(v_z) / max(c_raw, C_MIN)


def baris_fitur(row, fit):
    """row {kab, h(jenis), ...} + fit {kab: {H:{j:..}, v, c, cz}} -> dict fitur atau None bila ada yang hilang."""
    f = fit.get(row["kab"])
    if not f or f["v"] is None or f["c"] is None or f["cz"] is None or row["j"] not in f["H"]:
        return None
    h = f["H"][row["j"]]
    return {"h": h, "v": f["v"], "cz": f["cz"], "lnr": math.log(max(indeks_r(h, f["v"], f["c"]), 1e-6))}


def matriks(rows, fit, model, jenis):
    """-> (X, y, off, gugus, baris_dipakai). Kolom: 1, dummy jenis (jenis[1:]), lalu fitur sesuai model."""
    X, y, off, gugus, pakai = [], [], [], [], []
    for r in rows:
        f = baris_fitur(r, fit)
        if f is None or r["kej"] <= 0:
            continue
        x = [1.0] + [1.0 if r["j"] == j else 0.0 for j in jenis[1:]]
        if model == "M1":
            x += [f["h"]]
        elif model == "M2":
            x += [f["h"], f["v"], f["cz"]]
        elif model == "M3":
            x += [f["lnr"]]
        X.append(x); y.append(float(r["y"])); off.append(math.log(r["kej"])); gugus.append(r["kab"]); pakai.append(r)
    return X, y, off, gugus, pakai


def nama_kolom(model, jenis):
    return ["intersep"] + [f"jenis:{j}" for j in jenis[1:]] + {"M0": [], "M1": ["H"], "M2": ["H", "V", "C"], "M3": ["lnR"]}[model]


def uji_balik(rows, fit, test_akhir, n_boot=1000):
    """rows [{kab,tahun,j,kej,y}] -> dict hasil. Latih tahun <= TRAIN_AKHIR, uji TRAIN_AKHIR+1 .. test_akhir."""
    latih = [r for r in rows if r["tahun"] <= TRAIN_AKHIR]
    uji = [r for r in rows if TRAIN_AKHIR < r["tahun"] <= test_akhir]
    jenis = sorted({r["j"] for r in latih})
    uji = [r for r in uji if r["j"] in jenis]
    hasil, per_baris = {}, {}
    for m in MODEL:
        X, y, off, _, _ = matriks(latih, fit, m, jenis)
        Xt, yt, offt, gt, _ = matriks(uji, fit, m, jenis)
        fm = S.cocok(X, y, off)
        mu = S.prediksi(Xt, offt, fm["beta"])
        ll = S.ll_baris(yt, mu, fm["alpha"])
        dev = S.deviance_baris(yt, mu, 0.0)
        per_baris[m] = (ll, gt)
        kol = nama_kolom(m, jenis)
        hasil[m] = {"nama": MODEL[m], "n_latih": len(X), "n_uji": len(Xt), "keluarga": fm["keluarga"], "alpha": round(fm["alpha"], 3),
                    "lr_nb_vs_poisson": round(fm["lr"], 1), "pearson_dispersi_poisson": round(fm["pearson_disp"], 2),
                    "koef": {k: [round(b, 3), round(s, 3)] for k, b, s in zip(kol, fm["beta"], fm["se"]) if not k.startswith("jenis:") and k != "intersep"},
                    "skor_log_uji": round(sum(ll) / len(ll), 4), "deviance_poisson_uji": round(sum(dev) / len(dev), 3),
                    "mae_jiwa_uji": round(sum(abs(a - b) for a, b in zip(yt, mu)) / len(yt), 3), "jiwa_uji": int(sum(yt)), "jiwa_prediksi_uji": round(sum(mu), 1)}
    def banding(a, b):
        la, g = per_baris[a]
        lb, _ = per_baris[b]
        rata, lo, hi = S.bootstrap_gugus([x - y for x, y in zip(la, lb)], g, n_boot)
        return {"selisih_skor_log": round(rata, 4), "ci95": [round(lo, 4), round(hi, 4)], "lolos": lo > 0}
    bd = {"M2_vs_M1": banding("M2", "M1"), "M2_vs_M0": banding("M2", "M0"), "M1_vs_M0": banding("M1", "M0"), "M3_vs_M1": banding("M3", "M1")}
    vonis = "LOLOS" if bd["M2_vs_M1"]["lolos"] and bd["M2_vs_M0"]["lolos"] else "GAGAL"
    return {"pembagian": {"latih": f"{TAHUN_MULAI}-{TRAIN_AKHIR}", "uji": f"{TRAIN_AKHIR + 1}-{test_akhir}"}, "jenis": jenis, "model": hasil, "banding": bd,
            "vonis": vonis, "vonis_M3_rumus_Perka": "LOLOS" if bd["M3_vs_M1"]["lolos"] else "GAGAL"}


def spearman_kab(rows, fit, pembanding, tahun_dari, tahun_ke):
    """Korelasi peringkat kabupaten: tiap prediktor statis vs total jiwa (meninggal + hilang) tahun_dari..tahun_ke (kabupaten tanpa baris = 0)."""
    jiwa = {}
    for r in rows:
        if tahun_dari <= r["tahun"] <= tahun_ke:
            jiwa[r["kab"]] = jiwa.get(r["kab"], 0) + r["y"]
    kab = [k for k, f in fit.items() if f["v"] is not None and f["c"] is not None]
    y = [jiwa.get(k, 0) for k in kab]
    pred = {"R_total": [sum(indeks_r(h, fit[k]["v"], fit[k]["c"]) for h in fit[k]["H"].values()) for k in kab],
            "H_total": [sum(fit[k]["H"].values()) for k in kab], "V": [fit[k]["v"] for k in kab],
            "kebalikan_C": [-fit[k]["c"] for k in kab], "penduduk": [fit[k]["n"] for k in kab]}
    for nama, d in pembanding.items():
        pred[nama] = [d.get(k) if d.get(k) is not None else 0 for k in kab]
    return {"n_kab": len(kab), "kab_dengan_jiwa": sum(1 for v in y if v > 0), "periode": f"{tahun_dari}-{tahun_ke}",
            "rho": {k: None if S.spearman(v, y) is None else round(S.spearman(v, y), 3) for k, v in pred.items()}}


def ke_fit(h_kab, ker, ikd):
    """Gabung H per jenis + kerentanan.json + ikd.json -> {kab: {H, v, c, cz, n}}."""
    out = {}
    for k, kk in ker.items():
        c = ikd.get(k)
        out[k] = {"H": {j: round(h_kab[j][k], 4) for j in JENIS_H if k in h_kab[j]}, "v": kk.get("v"), "n": kk["n"],
                  "c": None if c is None else c["c"], "cz": None if c is None else c["z"]}
    return out


def irbi_total_2025():
    import csv
    jalur = os.path.join(D.AKAR, "data/kajian-bnpb/data/irbi/irbi_kab_2025.csv")
    if not os.path.exists(jalur):
        return {}
    return {r["kode"]: float(r["total"]) for r in csv.DictReader(open(jalur)) if r.get("total") not in ("", None)}


def kesenjangan_anggaran(r_kab, anggaran):
    """kesenjangan = peringkat(R) - peringkat(anggaran per kapita), peringkat 1 = terbesar; positif = risiko lebih tinggi daripada anggaran.
    anggaran {kab: nilai atau None}; kabupaten tanpa anggaran tidak dinilai. -> {kab: selisih peringkat dalam persentil -1..1}."""
    ada = [k for k in r_kab if anggaran.get(k) is not None]
    if len(ada) < 2:
        return {}
    ra = S.peringkat([-r_kab[k] for k in ada])
    rb = S.peringkat([-anggaran[k] for k in ada])
    n = len(ada)
    return {k: round((rb[i] - ra[i]) / (n - 1), 3) for i, k in enumerate(ada)}


def muat_djpk(jalur, penduduk):
    """CSV data/raw/bnpb/djpk_apbd.csv (kolom kab,tahun,belanja_bpbd,btt dalam rupiah; satu baris per kab-tahun) -> {kab: rupiah per kapita tahun terbaru}.
    Berkas harus diisi dari djpk.kemenkeu.go.id (Data Keuangan Daerah) oleh mesin yang bisa menjangkaunya; tanpa berkas -> {}."""
    import csv
    if not os.path.exists(jalur):
        return {}
    terbaru = {}
    for r in csv.DictReader(open(jalur, newline="", encoding="utf-8")):
        try:
            t, v = int(r["tahun"]), float(r["belanja_bpbd"] or 0) + float(r["btt"] or 0)
        except (KeyError, ValueError):
            continue
        if r["kab"] not in terbaru or t > terbaru[r["kab"]][0]:
            terbaru[r["kab"]] = (t, v)
    return {k: v / penduduk[k] for k, (t, v) in terbaru.items() if penduduk.get(k)}


def jalan():
    mulai = time.time()
    tahun_akhir = dt.date.today().year - 1
    ker = json.load(open(os.path.join(D.KELUAR, "kerentanan.json")))["kab"]
    ikd = json.load(open(os.path.join(D.KELUAR, "ikd.json")))["kab"]
    fit = ke_fit(muat_h(), ker, ikd)
    agr, dibuang = tarik_dibi(tahun_akhir)
    rows = [{"kab": k, "tahun": t, "j": j, "kej": a[0], "y": a[1] + a[2], "lk": a[3], "td": a[4], "ng": a[5], "rb": a[6]} for (k, t, j), a in sorted(agr.items())]
    tanpa_fit = sum(1 for r in rows if baris_fitur(r, fit) is None)
    uji = uji_balik(rows, fit, tahun_akhir)
    irbi = irbi_total_2025()
    sp = spearman_kab(rows, fit, {"IRBI_resmi_2025": irbi}, TRAIN_AKHIR + 1, tahun_akhir)
    r_kab, ringkas = {}, {}
    for k, f in fit.items():
        if f["v"] is None or f["c"] is None:
            continue
        rj = {j: round(indeks_r(h, f["v"], f["c"]), 3) for j, h in f["H"].items()}
        r_kab[k] = sum(rj.values())
        ringkas[k] = {"H": f["H"], "v": f["v"], "c": f["c"], "R": rj, "R_total": round(r_kab[k], 3), "utama": max(rj, key=rj.get) if rj else None}
    anggaran = muat_djpk(os.path.join(D.MENTAH, "djpk_apbd.csv"), {k: f["n"] for k, f in fit.items()})
    for k, g in kesenjangan_anggaran(r_kab, anggaran).items():
        ringkas[k]["kesenjangan"] = g
    urut = sorted(r_kab, key=lambda k: -r_kab[k])
    for i, k in enumerate(urut):
        ringkas[k]["peringkat"] = i + 1
    info = D.kab_info()
    for k in ringkas:
        ringkas[k]["nama"] = info.get(k, {}).get("nama")
    D.simpan_plafon("dibi_kab_tahun.json", {
        "sumber": "DIBI BNPB (dibi.bnpb.go.id, Superset dasbor publik, tidak resmi lewat API)", "atribusi": "BNPB, Data Informasi Bencana Indonesia",
        "lisensi": "data publik dasbor DIBI; syarat pakai tidak tertulis",
        "catatan": "baris = kabupaten x tahun x kelompok jenis; kelompok: " + json.dumps(PETA_JENIS, ensure_ascii=False) + "; jenis di luar kelompok dibuang",
        "kolom": ["kab", "tahun", "jenis", "kejadian", "meninggal_hilang", "luka", "terdampak", "mengungsi", "rumah_rusak_berat"],
        "baris": [[r["kab"], r["tahun"], r["j"], r["kej"], r["y"], r["lk"], r["td"], r["ng"], r["rb"]] for r in rows]})
    D.simpan_plafon("risiko_hvc.json", {
        "sumber": "InaRISK BNPB (H), kerentanan.json (V), ikd.json (C), DIBI BNPB (label)", "atribusi": "BNPB (InaRISK, DIBI); Dukcapil; Meta RWI (CC BY-NC 4.0)",
        "rumus": "R_j = H01_j x Phi(V_z) / max(C, 0,05); R_kab = Sum_j R_j (Perka BNPB 2/2012: R = H x V / C)",
        "catatan_rumus": CATATAN_RUMUS,
        "label": f"INDEKS peringkat, BUKAN prediksi korban; yang diuji adalah model jumlah korban jiwa (lihat uji), vonis {uji['vonis']}",
        "fiskal_djpk": {"status": "OK" if anggaran else "MENUNGGU DATA", "kab_dengan_data": len(anggaran), "catatan": "djpk.kemenkeu.go.id tidak terjangkau dari lingkungan kerja (TLS timeout); C hanya kapasitas InaRISK"},
        "uji": uji, "uji_peringkat_kab": sp, "baris_dibi": {"dipakai": len(rows) - tanpa_fit, "tanpa_fitur": tanpa_fit, "jenis_dibuang": dibuang},
        "kab": ringkas})
    print(f"risiko_hvc: {len(rows)} baris DIBI, vonis {uji['vonis']}, {time.time() - mulai:.0f} dtk", file=sys.stderr)
    print(json.dumps(uji, ensure_ascii=False, indent=1))
    print(json.dumps(sp, ensure_ascii=False))


# ------------------------------------------------------------------ self-check
def _sintetik(rng, n_kab, efek_vc):
    """Data buatan: korban per kejadian ~ NB(mu = laju jenis x exp(0,9 H + efek_vc*(0,5 V - 0,5 C))). Tahun 2015-2024."""
    jenis = ["banjir", "gempa", "cuaca"]
    fit, rows = {}, []
    for i in range(n_kab):
        k = f"{i:04d}"
        h = {j: rng.random() for j in jenis}
        fit[k] = {"H": h, "v": rng.gauss(0, 1), "c": rng.uniform(0.1, 0.7), "n": 1000 + i, "cz": 0.0}
    cs = [f["c"] for f in fit.values()]
    m = sum(cs) / len(cs)
    sd = math.sqrt(sum((c - m) ** 2 for c in cs) / len(cs))
    for f in fit.values():
        f["cz"] = (f["c"] - m) / sd
    laju = {"banjir": 0.05, "gempa": 0.3, "cuaca": 0.02}
    for k, f in fit.items():
        for t in range(2015, 2025):
            for j in jenis:
                if rng.random() < 0.35:
                    kej = rng.randint(1, 4)
                    mu = kej * laju[j] * math.exp(0.9 * f["H"][j] + efek_vc * (0.5 * f["v"] - 0.5 * f["cz"]))
                    g = rng.gammavariate(2.0, mu / 2.0)       # NB: alpha = 0,5
                    L, kk, p = math.exp(-g), 0, 1.0
                    while True:
                        p *= rng.random()
                        if p <= L:
                            break
                        kk += 1
                    rows.append({"kab": k, "tahun": t, "j": j, "kej": kej, "y": kk})
    return fit, rows


def _cek():
    import random
    assert jenis_kelompok(" Banjir Bandang ") == "banjir" and jenis_kelompok("Konflik Sosial") is None and jenis_kelompok("Puting Beliung") == "cuaca"
    assert jenis_kelompok("Kebakaran Gedung dan Permukiman") is None, "kebakaran gedung bukan karhutla"
    assert len(JENIS_DARI_NAMA) == sum(len(v) for v in PETA_JENIS.values()), "satu nama DIBI tak boleh masuk dua kelompok"
    a, dbg = agregasi_dibi([{"id_kab_bps": 3301, "jenis_bencana": "Banjir ", "jumlah_kejadian": 2.0, "meninggal": 1, "hilang": 2, "luka_sakit": 3},
                            {"id_kab_bps": 3301, "jenis_bencana": "Banjir Bandang", "jumlah_kejadian": 1.0, "meninggal": 4},
                            {"id_kab_bps": 3301, "jenis_bencana": "Konflik Sosial", "meninggal": 9}, {"id_kab_bps": None, "jenis_bencana": "Banjir"}], 2020)
    assert a == {("3301", 2020, "banjir"): [3, 5, 2, 3, 0, 0, 0]} and dbg == 2, (a, dbg)
    assert h_dari_kecamatan({"33|A|x": 1.0, "33|A|y": 0.0, "33|B|z": 0.5, "99|Q|q": 1.0}, {"33|A": "3301", "33|B": "3302"}) == {"3301": 0.5, "3302": 0.5}
    # R: monoton naik di H dan V, turun di C; penyebut dikunci C_MIN
    assert indeks_r(0.8, 0.0, 0.3) > indeks_r(0.4, 0.0, 0.3) and indeks_r(0.5, 1.0, 0.3) > indeks_r(0.5, -1.0, 0.3) and indeks_r(0.5, 0.0, 0.2) > indeks_r(0.5, 0.0, 0.6)
    assert abs(indeks_r(0.5, 0.0, 0.0) - 0.5 * 0.5 / C_MIN) < 1e-12, "C = 0 tidak boleh meledak"
    # kesenjangan anggaran: risiko tertinggi dengan anggaran terkecil = kesenjangan terbesar
    ks = kesenjangan_anggaran({"A": 9.0, "B": 5.0, "C": 1.0}, {"A": 1.0, "B": 5.0, "C": 9.0, "D": None})
    assert ks == {"A": 1.0, "B": 0.0, "C": -1.0}, ks      # R tertinggi + anggaran terkecil = kurang dibiayai = positif
    assert kesenjangan_anggaran({"A": 1.0}, {"A": 1.0}) == {}
    import tempfile
    p = os.path.join(tempfile.mkdtemp(), "d.csv")
    open(p, "w").write("kab,tahun,belanja_bpbd,btt\n3301,2023,1000,500\n3301,2024,2000,1000\n3302,2024,x,1\n3303,2024,10,0\n")
    assert muat_djpk(p, {"3301": 100, "3302": 10}) == {"3301": 30.0}, muat_djpk(p, {"3301": 100, "3302": 10})   # tahun terbaru; baris rusak dan kab tanpa penduduk dibuang
    assert muat_djpk(p + "x", {}) == {}
    # Uji sinyal nyata: V dan C berpengaruh -> M2 harus LOLOS. Tanpa pengaruh -> M2 harus GAGAL (penjaga tak boleh meloloskan derau).
    rng = random.Random(11)
    fit, rows = _sintetik(rng, 260, 1.0)
    u = uji_balik(rows, fit, 2024, n_boot=300)
    assert u["vonis"] == "LOLOS", (u["vonis"], u["banding"])
    assert u["model"]["M2"]["koef"]["V"][0] > 0 > u["model"]["M2"]["koef"]["C"][0], u["model"]["M2"]["koef"]
    assert u["model"]["M1"]["koef"]["H"][0] > 0.4
    assert u["model"]["M2"]["keluarga"] == "nb" and 0.2 < u["model"]["M2"]["alpha"] < 1.0, u["model"]["M2"]
    assert u["pembagian"] == {"latih": "2015-2021", "uji": "2022-2024"}
    rng = random.Random(12)
    fit0, rows0 = _sintetik(rng, 260, 0.0)
    u0 = uji_balik(rows0, fit0, 2024, n_boot=300)
    assert u0["vonis"] == "GAGAL", (u0["vonis"], u0["banding"]["M2_vs_M1"])
    # Spearman kabupaten: prediktor yang sama dengan sumber derau harus berkorelasi positif
    sp = spearman_kab(rows, fit, {}, 2022, 2024)
    assert sp["rho"]["R_total"] > 0.1 and sp["n_kab"] == 260, sp
    # baris tanpa fitur dibuang, bukan dihitung nol
    assert baris_fitur({"kab": "9999", "j": "banjir"}, fit) is None and matriks([{"kab": "9999", "j": "banjir", "kej": 1, "y": 0}], fit, "M1", ["banjir"])[0] == []
    print("risiko_hvc: --cek hijau")


if __name__ == "__main__":
    _cek() if "--cek" in sys.argv else jalan()
