"""NA-06 Validasi neraca air: (a) limpasan total Jawa vs BPS 2020; (b) aliran muara 12 sungai vs GloFAS v4; (c) hujan CHIRPS vs ERA5 dan
ET0 POWER vs Open-Meteo di 18 sel DIY; (d) kalibrasi minimal alpha, k bila jelas meleset. Menulis data/kajian-bnpb/neraca-air/VALIDASI.md.
Pakai: python3 validasi.py hitung   (butuh mentah/glofas_muara.json)  |  python3 validasi.py uji
Ambang vonis (ditulis di VALIDASI.md): total vs BPS |bias| <= 15%; muara: median rasio model/GloFAS 0,8-1,25 dan tiap sungai 0,5-2;
korelasi bulanan median >= 0,8; hujan CHIRPS vs ERA5 informasional (bias < 20%, r >= 0,9)."""
import calendar, csv, itertools, json, math, os, statistics, sys

DIR = os.path.dirname(os.path.abspath(__file__))
AKAR = os.path.abspath(os.path.join(DIR, "../../.."))
sys.path.insert(0, DIR)
import neraca as N  # noqa: E402
import glofas as GF  # noqa: E402

PAKET = os.path.join(AKAR, "data/kajian-bnpb/neraca-air")
BPS_2020 = 175558.0   # juta m3/th, BPS 2020 (RANCANGAN §3.4; paket air-jawa)
LUAS_BPS = 132698.0


def korelasi(a, b):
    ma, mb = sum(a) / len(a), sum(b) / len(b)
    sa = math.sqrt(sum((x - ma) ** 2 for x in a))
    sb = math.sqrt(sum((x - mb) ** 2 for x in b))
    if sa == 0 or sb == 0:
        raise ValueError("deviasi nol: korelasi tak terdefinisi")
    return sum((x - ma) * (y - mb) for x, y in zip(a, b)) / (sa * sb)


def bulanan_glofas(waktu, q):
    """harian m3/s -> {(y, m): rerata m3/s}; bulan tak lengkap/None dibuang"""
    jml, n = {}, {}
    for t, v in zip(waktu, q):
        if v is None:
            continue
        k = (int(t[:4]), int(t[5:7]))
        jml[k] = jml.get(k, 0.0) + v
        n[k] = n.get(k, 0) + 1
    return {k: jml[k] / n[k] for k in jml if n[k] == calendar.monthrange(*k)[1]}


def jalankan_model(topo, iklim, keb, waduk, alpha=None, k=None):
    if alpha is not None:
        N.ASUMSI_ALPHA, N.ASUMSI_K = alpha, k
    return N.jalankan(topo, iklim, keb, waduk)


def metrik_muara(h, gl):
    """per sungai: model vs GloFAS (m3/s) rerata tahunan, rerata Jun-Okt, korelasi bulanan"""
    jl = h["hasil"][2025][1]
    bulan = h["bulan"]
    out = {}
    for nama, g in gl.items():
        gm = bulanan_glofas(g["waktu"], g["q"])
        mt = jl["muara_t"][g["subdas"]]
        mod = {bulan[t]: mt[t] * 1e6 / (calendar.monthrange(*bulan[t])[1] * 86400) for t in range(len(bulan))}
        ks = sorted(set(gm) & set(mod))
        a = [mod[x] for x in ks]
        b = [gm[x] for x in ks]
        kem = [x for x in ks if x[1] in N.KEMARAU]
        out[nama] = {"model": sum(a) / len(a), "glofas": sum(b) / len(b),
                     "model_kemarau": sum(mod[x] for x in kem) / len(kem), "glofas_kemarau": sum(gm[x] for x in kem) / len(kem),
                     "r": korelasi(a, b), "n_bulan": len(ks), "sel": (g["lat"], g["lon"])}
        out[nama]["rasio"] = out[nama]["model"] / out[nama]["glofas"]
        out[nama]["rasio_kemarau"] = out[nama]["model_kemarau"] / out[nama]["glofas_kemarau"]
    return out


def kering_tahun(h, gl, tahun_list=(1997, 2015, 2019, 2023)):
    """Jun-Okt tiap tahun skenario: rerata m3/s model vs GloFAS per sungai -> {tahun: {sungai: (model, glofas)}} (apakah model runtuh di kemarau ekstrem)"""
    jl = h["hasil"][2025][1]
    out = {}
    for y in tahun_list:
        out[y] = {}
        for nama, g in gl.items():
            gm = bulanan_glofas(g["waktu"], g["q"])
            ts = [t for t, (yy, m) in enumerate(h["bulan"]) if yy == y and m in N.KEMARAU]
            mod = sum(jl["muara_t"][g["subdas"]][t] * 1e6 / (calendar.monthrange(*h["bulan"][t])[1] * 86400) for t in ts) / len(ts)
            glo = sum(gm[(y, m)] for m in N.KEMARAU) / len(N.KEMARAU)
            out[y][nama] = (mod, glo)
    return out


def skor(m):
    return sum(math.log(v["rasio"]) ** 2 + math.log(v["rasio_kemarau"]) ** 2 for v in m.values())


def total_jawa(h):
    ny = len(h["bulan"]) / 12
    semua = list(h["luas_kab"])
    luas = sum(h["luas_kab"][k] for k in semua)
    seri = [sum(h["kabv"][k]["R"][t] for k in semua) for t in range(len(h["bulan"]))]
    rata = sum(seri) / ny
    r2020 = sum(v for t, v in enumerate(seri) if h["bulan"][t][0] == 2020)
    P = sum(sum(h["kabv"][k]["P"]) for k in semua) / ny
    E = sum(sum(h["kabv"][k]["ETa"]) for k in semua) / ny
    return {"luas": luas, "R_rata": rata * LUAS_BPS / luas, "R_2020": r2020 * LUAS_BPS / luas,
            "P": P * LUAS_BPS / luas, "ETa": E * LUAS_BPS / luas}


def banding_diy(iklim):
    s = [v for v in iklim["sel"].values() if "p_era5" in v]
    ba = lambda a, b: (sum(a) / len(a)) / (sum(b) / len(b)) - 1
    out = {"n": len(s), "p_bias": ba([sum(v["p"]) for v in s], [sum(v["p_era5"]) for v in s]),
           "et0_bias": ba([sum(v["et0"]) for v in s], [sum(v["et0_era5"]) for v in s])}
    for x, y in (("p", "p_era5"), ("et0", "et0_era5")):
        rs = []
        for v in s:   # klimatologi bulan kalender per sel
            kl = lambda z: [sum(z[m::12]) / 35 for m in range(12)]
            rs.append(korelasi(kl(v[x]), kl(v[y])))
        out[f"{x}_r_klim"] = statistics.median(rs)
        out[f"{x}_r_bulanan"] = statistics.median(korelasi(v[x], v[y]) for v in s)
    out["p_mm_chirps"] = statistics.mean(sum(v["p"]) / 35 for v in s)
    out["p_mm_era5"] = statistics.mean(sum(v["p_era5"]) / 35 for v in s)
    out["et0_mm_power"] = statistics.mean(sum(v["et0"]) / 35 for v in s)
    out["et0_mm_era5"] = statistics.mean(sum(v["et0_era5"]) / 35 for v in s)
    return out


def hitung():
    topo, iklim, keb = (json.load(open(p)) for p in (N.TOPO, N.IKLIM, N.KEB))
    waduk = list(csv.DictReader(open(N.WADUK)))
    gl = json.load(open(os.path.join(PAKET, "mentah/glofas_muara.json")))
    awal = (N.ASUMSI_ALPHA, N.ASUMSI_K)
    h0 = jalankan_model(topo, iklim, keb, waduk)
    m0, t0 = metrik_muara(h0, gl), total_jawa(h0)
    grid = {}
    for a, k in itertools.product((0.4, 0.5, 0.6, 0.7, 0.8, 0.9), (0.5, 1.0, 2.0, 3.0)):
        h = jalankan_model(topo, iklim, keb, waduk, a, k)
        m = metrik_muara(h, gl)
        grid[(a, k)] = (skor(m), statistics.median(v["rasio"] for v in m.values()), statistics.median(v["rasio_kemarau"] for v in m.values()))
        print(f"  alpha {a} k {k}: skor {grid[(a, k)][0]:.3f} median rasio tahunan {grid[(a, k)][1]:.2f} Jun-Okt {grid[(a, k)][2]:.2f}", file=sys.stderr, flush=True)
    N.ASUMSI_ALPHA, N.ASUMSI_K = awal
    json.dump({"awal": {"alpha": awal[0], "k": awal[1], "muara": m0, "total": t0, "kering": kering_tahun(h0, gl)}, "grid": {f"{a},{k}": v for (a, k), v in grid.items()},
               "diy": banding_diy(iklim)}, open(os.path.join(PAKET, "mentah/validasi_hitung.json"), "w"), indent=1)
    print("selesai; lihat mentah/validasi_hitung.json", file=sys.stderr)


def f(x, d=0):
    return f"{x:,.{d}f}".replace(",", "#").replace(".", ",").replace("#", ".")


def vonis(m, t):
    """-> daftar (pemeriksaan, nilai, ambang, vonis) dengan ambang yang tertulis di docstring"""
    rs = [v["rasio"] for v in m.values()]
    rk = [v["rasio_kemarau"] for v in m.values()]
    cor = [v["r"] for v in m.values()]
    bias = t["R_rata"] / BPS_2020 - 1
    ok = lambda c: "LOLOS" if c else "TIDAK LOLOS"
    return [("Limpasan total Jawa vs BPS 2020 (rerata 1991-2025, diskala ke 132.698 km2)", f"{f(t['R_rata'])} vs {f(BPS_2020)} Mm3/th ({bias:+.1%})", "|bias| <= 15%", ok(abs(bias) <= 0.15)),
            ("Muara: median rasio model/GloFAS, rerata tahunan", f"{statistics.median(rs):.2f}", "0,80-1,25", ok(0.8 <= statistics.median(rs) <= 1.25)),
            ("Muara: sungai dengan rasio di luar 0,5-2", f"{sum(1 for x in rs if not 0.5 <= x <= 2)} dari {len(rs)}", "0", ok(all(0.5 <= x <= 2 for x in rs))),
            ("Muara: median rasio Jun-Okt", f"{statistics.median(rk):.2f}", "0,80-1,25", ok(0.8 <= statistics.median(rk) <= 1.25)),
            ("Muara: sungai dengan rasio Jun-Okt di luar 0,5-2", f"{sum(1 for x in rk if not 0.5 <= x <= 2)} dari {len(rk)} (rentang {min(rk):.2f}-{max(rk):.2f})", "0", ok(all(0.5 <= x <= 2 for x in rk))),
            ("Muara: median korelasi bulanan", f"{statistics.median(cor):.2f}", ">= 0,80", ok(statistics.median(cor) >= 0.8))]


def tulis_md(pra, akhir, diy, grid, pilih):
    L = ["# VALIDASI neraca air Jawa (NA-06)\n",
         "> LABEL tetap **estimasi-model**: validasi di bawah bukan pengganti data pos duga (keputusan pemilik 8: tanpa data BBWS). Dihasilkan `scripts/air/neraca/validasi.py`; angka dari `mentah/validasi_hitung.json`.\n",
         "Pembanding: BPS 2020 (limpasan total 175.558 juta m3/th; sendiri sebuah perkiraan), GloFAS v4 (Open-Meteo flood API, 0,05 derajat, 1991-2024, sudah dalam m3/s; model global, bukan pengukuran), ERA5/ERA5-Land (Open-Meteo, 18 sel DIY).\n"]
    for judul, d in (("Sebelum kalibrasi", pra), ("Sesudah kalibrasi (parameter dipakai v1)", akhir)):
        L.append(f"\n## {judul}: alpha = {d['alpha']}, k = {d['k']} bulan\n\n| Pemeriksaan | Nilai | Ambang | Vonis |\n| --- | --- | --- | --- |")
        L += [f"| {a} | {b} | {c} | {v} |" for a, b, c, v in vonis(d["muara"], d["total"])]
        L.append("\n| Muara | Sel GloFAS | Model (m3/s) | GloFAS (m3/s) | Rasio | Model Jun-Okt | GloFAS Jun-Okt | Rasio Jun-Okt | r bulanan |\n| --- | --- | --- | --- | --- | --- | --- | --- | --- |")
        for n, v in d["muara"].items():
            L.append(f"| {n} | {v['sel'][0]:.2f}, {v['sel'][1]:.2f} | {f(v['model'], 1)} | {f(v['glofas'], 1)} | {v['rasio']:.2f} | {f(v['model_kemarau'], 1)} | {f(v['glofas_kemarau'], 1)} | {v['rasio_kemarau']:.2f} | {v['r']:.2f} |")
    L.append("\n## Kemarau ekstrem: Jun-Okt tahun skenario, model vs GloFAS (m3/s, sesudah kalibrasi)\n\n| Sungai | " + " | ".join(f"{y} model / GloFAS (rasio)" for y in akhir["kering"]) + " |\n| --- | " + "--- | " * len(akhir["kering"]))
    for n in akhir["muara"]:
        L.append(f"| {n} | " + " | ".join(f"{f(v[n][0], 1)} / {f(v[n][1], 1)} ({v[n][0] / v[n][1]:.2f})" for v in akhir["kering"].values()) + " |")
    med = {y: statistics.median(v[n][0] / v[n][1] for n in akhir["muara"]) for y, v in akhir["kering"].items()}
    nol = {y: sum(1 for n in v if v[n][0] < 0.05) for y, v in akhir["kering"].items()}
    jr = {y: v["Jratunseluna (Serang-Lusi-Juwana)"][0] / v["Jratunseluna (Serang-Lusi-Juwana)"][1] for y, v in akhir["kering"].items()}
    L.append("\nMedian rasio model/GloFAS Jun-Okt: " + ", ".join(f"{y} {m:.2f}" for y, m in med.items()) + ". Jumlah sungai dengan aliran model ~0 (<0,05 m3/s): " + ", ".join(f"{y} {n} dari {len(akhir['muara'])}" for y, n in nol.items())
             + f". Jratunseluna: model {', '.join(f'{y} {r:.1f}x' for y, r in jr.items())} GloFAS. Arah bias bergantung tahun: tahun yang model-nya memadamkan aliran (1997) MELEBIH-LEBIHKAN kekurangan; tahun yang model-nya mengalirkan lebih dari GloFAS (2015/2019/2023 di Jratunseluna dan Citarum) MEREMEHKANNYA. Skenario tahun kering tidak boleh dibaca sebagai batas atas maupun bawah.\n")
    t = akhir["total"]
    L.append(f"\n## Neraca total Jawa (sesudah kalibrasi, diskala ke 132.698 km2)\n\nP {f(t['P'])}, ETa {f(t['ETa'])}, R {f(t['R_rata'])} Mm3/th; R tahun 2020 saja {f(t['R_2020'])} Mm3 (BPS 2020: {f(BPS_2020)}, selisih {t['R_2020'] / BPS_2020 - 1:+.1%}).\n")
    L.append(f"\n## Hujan dan ET0 di {diy['n']} sel DIY: CHIRPS/POWER (dipakai) vs ERA5 Open-Meteo\n\n| Besaran | Dipakai | ERA5 | Bias | r klimatologi bulan | r deret bulanan |\n| --- | --- | --- | --- | --- | --- |\n"
             f"| Hujan (mm/th) | {f(diy['p_mm_chirps'])} | {f(diy['p_mm_era5'])} | {diy['p_bias']:+.1%} | {diy['p_r_klim']:.2f} | {diy['p_r_bulanan']:.2f} |\n"
             f"| ET0 (mm/th) | {f(diy['et0_mm_power'])} | {f(diy['et0_mm_era5'])} | {diy['et0_bias']:+.1%} | {diy['et0_r_klim']:.2f} | {diy['et0_r_bulanan']:.2f} |\n\n"
             f"Vonis hujan (bias < 20%, r klimatologi >= 0,9): {'LOLOS' if abs(diy['p_bias']) < 0.2 and diy['p_r_klim'] >= 0.9 else 'TIDAK LOLOS'}. ET0 informasional: POWER 0,5 derajat dengan rerata bulanan lebih kasar daripada ERA5-Land 0,1 derajat.\n")
    L.append("\n## Kalibrasi minimal alpha, k (TAW 130 mm dan Kc 1,0 tetap)\n\nSel = median rasio model/GloFAS tahunan / median rasio Jun-Okt atas 12 muara (target 0,80-1,25 keduanya); skor = jumlah kuadrat ln(rasio) semua sungai (kecil = baik; peka terhadap sungai pencilan). Hanya dua parameter, 12 sungai: risiko menyesuaikan berlebih, dan GloFAS sendiri bukan kebenaran.\n\n| alpha \\ k | " + " | ".join(str(k) for k in sorted({float(x.split(',')[1]) for x in grid})) + " |\n| --- | " + "--- | " * len({x.split(',')[1] for x in grid}))
    ks = sorted({float(x.split(",")[1]) for x in grid})
    for a in sorted({float(x.split(",")[0]) for x in grid}):
        L.append(f"| {a} | " + " | ".join(f"{grid[f'{a},{k}'][1]:.2f} / {grid[f'{a},{k}'][2]:.2f} (skor {grid[f'{a},{k}'][0]:.1f})" for k in ks) + " |")
    L.append(f"\nDipilih: {pilih}\n")
    return "\n".join(L)


def uji():
    assert abs(korelasi([1, 2, 3], [2, 4, 6]) - 1) < 1e-12 and abs(korelasi([1, 2, 3], [3, 2, 1]) + 1) < 1e-12
    try:
        korelasi([1, 1], [1, 2])
    except ValueError:
        pass
    else:
        raise AssertionError("deviasi nol lolos")
    w = [f"2001-02-{d:02d}" for d in range(1, 29)] + ["2001-03-01"]
    b = bulanan_glofas(w, [1.0] * 28 + [5.0])
    assert b == {(2001, 2): 1.0}, f"bulan tak lengkap harus dibuang: {b}"
    assert skor({"x": {"rasio": 1.0, "rasio_kemarau": 1.0}}) == 0
    assert skor({"x": {"rasio": 2.0, "rasio_kemarau": 0.5}}) > skor({"x": {"rasio": 1.2, "rasio_kemarau": 0.9}})
    print("ok validasi")


def md(pilih):
    """VALIDASI.md dari mentah/validasi_hitung.json (parameter v1) dan mentah/validasi_prakalibrasi.json (bila ada)"""
    akhir = json.load(open(os.path.join(PAKET, "mentah/validasi_hitung.json")))
    jp = os.path.join(PAKET, "mentah/validasi_prakalibrasi.json")
    pra = json.load(open(jp)) if os.path.exists(jp) else akhir
    teks = tulis_md(pra["awal"], akhir["awal"], akhir["diy"], akhir["grid"], pilih)
    open(os.path.join(PAKET, "VALIDASI.md"), "w").write(teks + "\n" + open(os.path.join(PAKET, "mentah/validasi_catatan.md")).read())
    print("tulis VALIDASI.md", file=sys.stderr)


if __name__ == "__main__":
    a = sys.argv[1:]
    uji() if a == ["uji"] else hitung() if a == ["hitung"] else md(a[1]) if a[:1] == ["md"] and len(a) == 2 else sys.exit(__doc__)
