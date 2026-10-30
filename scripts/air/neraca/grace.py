"""NA-27 GRACE/GRACE-FO: anomali simpanan air terestrial (TWSA, cm setara tinggi air) Jawa -> public/data/neraca_air/grace.json.

Sumber: JPL Tellus mascon RL06.3Mv04 CRI (PO.DAAC, DOI 10.5067/TEMSC-3JC634), bulanan 2002-04..sekarang, kisi 0,5 derajat
TETAPI resolusi asli mascon sama-luas ~3 derajat (~330 km): nilai per kab TERHALUS, bukan pengukuran lokal. Banyak kab dalam
satu mascon berbagi sinyal yang hampir sama; baca sebagai "iklim simpanan wilayah", bukan simpanan kab.
Akses: berkas .nc tunggal 46 MB di archive.podaac.earthdata.nasa.gov, header `Authorization: Bearer $EARTHDATA_TOKEN`
(OPeNDAP Hyrax POCLOUD menjawab 404 .dmrpp untuk koleksi ini, jadi unduh penuh). Berkas HDF5 -> `tarik` butuh h5py (hanya lab);
`hitung` murni stdlib dan membaca mentah/grace_jawa.json (kecil, ikut git).

Rumus (hitung):
  1. kab/DAS -> sel GRACE 0,5 derajat lewat sel iklim 0,1 derajat topologi.json (bobot km2 irisan HydroBASINS x kab).
  2. Deret kab = rerata berbobot luas atas sel GRACE (hanya sel daratan, land_mask=1).
  3. Tren: Sen (median kemiringan semua pasangan) atas deret tanpa musim (dikurangi klimatologi bulanan); CI 95% dari
     Hirsch-Slack/Gilbert (Var S Mann-Kendall) dengan n dikoreksi autokorelasi lag-1 (n_eff = n(1-r1)/(1+r1)).
  4. Prakiraan 3 bulan: x_t = y_t - klim[bulan]; AR(1) x_{t+h} = phi^h x_t; y = klim + x. phi dari regresi lag-1.
     Hindcast origin bergulir (latih hanya data <= origin), dibanding persistensi (y_t) dan klimatologi (klim[bulan]).
     LOLOS bila RMSE terkumpul model < persistensi DAN < klimatologi di h=1,2,3.
     Selang prakiraan = +- 1,96 x RMSE hindcast tiap h (empiris, bukan analitik).
  5. Banding dengan simpanan model neraca (tanah + tampungan linear, kumulatif P - ETa - R tiap sel, neraca.bak):
     korelasi mentah dan tanpa musim, lag korelasi silang terbaik (+ = GRACE tertinggal model), rasio simpangan baku.
Label semua keluaran: estimasi-model / produk gravimetri terhaluskan.

Pakai: python3 grace.py tarik [--nc berkas.nc] | hitung | uji
"""
import json, math, os, subprocess, sys

DIR = os.path.dirname(os.path.abspath(__file__))
AKAR = os.path.abspath(os.path.join(DIR, "../../.."))
sys.path.insert(0, DIR)
MENTAH = os.path.join(AKAR, "data/kajian-bnpb/neraca-air/mentah/grace_jawa.json")
KELUAR = os.path.join(AKAR, "public/data/neraca_air/grace.json")
TOPO, IKLIM = (os.path.join(DIR, f) for f in ("topologi.json", "iklim.json"))
URL = ("https://archive.podaac.earthdata.nasa.gov/podaac-ops-cumulus-protected/TELLUS_GRAC-GRFO_MASCON_CRI_GRID_RL06.3_V4/"
       "GRCTellus.JPL.200204_202607.GLO.RL06.3M.MSCNv04CRI.nc")
KOTAK = (-9.5, -5.0, 104.5, 115.5)    # lat_min, lat_max, lon_min, lon_max
LATIH_MIN = 120                        # bulan kalender minimal sebelum origin hindcast pertama (10 tahun)
HORIZON = (1, 2, 3)
AWAL_IKLIM = 1991


# ---------- statistik murni ----------
def bulan_idx(ym):
    y, m = int(ym[:4]), int(ym[5:7])
    return y * 12 + m - 1


def ym_dari(i):
    return f"{i // 12:04d}-{i % 12 + 1:02d}"


def klim(seri, idx_batas=None):
    """seri {idx_bulan: nilai} -> klimatologi per bulan kalender (12), hanya idx <= idx_batas"""
    s, n = [0.0] * 12, [0] * 12
    for i, v in seri.items():
        if idx_batas is None or i <= idx_batas:
            s[i % 12] += v
            n[i % 12] += 1
    return [s[k] / n[k] if n[k] else 0.0 for k in range(12)]


def phi_lag1(x):
    """koefisien AR(1) tanpa intersep dari pasangan bulan berurutan yang keduanya teramati"""
    a = b = 0.0
    for i, v in x.items():
        if i + 1 in x:
            a += v * x[i + 1]
            b += v * v
    return a / b if b > 0 else 0.0


def sen(x):
    """x {idx_bulan: nilai} -> (kemiringan per tahun, lo, hi) CI 95% dengan koreksi autokorelasi"""
    t = sorted(x)
    n = len(t)
    if n < 24:
        raise ValueError("deret terlalu pendek untuk tren")
    sl = sorted((x[t[j]] - x[t[i]]) * 12 / (t[j] - t[i]) for i in range(n) for j in range(i + 1, n))
    N = len(sl)
    med = sl[N // 2] if N % 2 else (sl[N // 2 - 1] + sl[N // 2]) / 2
    # sisa tanpa tren -> r1 -> n_eff
    b0 = sorted(x[i] - med * i / 12 for i in t)
    b0 = b0[len(b0) // 2]
    res = {i: x[i] - med * i / 12 - b0 for i in t}
    r1 = max(min(phi_lag1(res), 0.95), 0.0)
    n_eff = max(n * (1 - r1) / (1 + r1), 4.0)
    var = n * (n - 1) * (2 * n + 5) / 18 * (n / n_eff)   # autokorelasi MEMBESARKAN varians S (n/n_eff >= 1)
    c = 1.96 * math.sqrt(var)
    m1, m2 = int((N - c) / 2), int((N + c) / 2) + 1
    return med, sl[max(m1, 0)], sl[min(m2, N - 1)], n_eff


def korelasi(a, b):
    n = len(a)
    if n < 3:
        return None
    ma, mb = sum(a) / n, sum(b) / n
    sa = math.sqrt(sum((x - ma) ** 2 for x in a))
    sb = math.sqrt(sum((x - mb) ** 2 for x in b))
    return None if sa == 0 or sb == 0 else sum((x - ma) * (y - mb) for x, y in zip(a, b)) / (sa * sb)


def prakiraan(y, origin, h, batas=None):
    """y {idx: nilai}; prakiraan ke idx origin+h hanya dari data <= origin. -> (ar, persistensi, klimatologi)"""
    ytr = {i: v for i, v in y.items() if i <= origin}
    k = klim(ytr)
    x = {i: v - k[i % 12] for i, v in ytr.items()}
    ph = phi_lag1(x)
    tgt = origin + h
    return k[tgt % 12] + (ph ** h) * x[origin], ytr[origin], k[tgt % 12]


def hindcast(deret):
    """deret {nama: {idx: nilai}} -> ({h: [n, SSE_ar, SSE_pers, SSE_klim]} terkumpul, per nama). Tiap origin dilatih
    HANYA dengan data <= origin (klim, phi dihitung ulang); target harus teramati."""
    kum = {h: [0, 0.0, 0.0, 0.0] for h in HORIZON}
    per = {}
    for nm, y in deret.items():
        ids = sorted(y)
        mulai = ids[0] + LATIH_MIN
        loc = {h: [0, 0.0, 0.0, 0.0] for h in HORIZON}
        for o in ids:
            if o < mulai:
                continue
            if not any(o + h in y for h in HORIZON):
                continue
            ytr = {i: v for i, v in y.items() if i <= o}
            k = klim(ytr)
            x = {i: v - k[i % 12] for i, v in ytr.items()}
            ph = phi_lag1(x)
            for h in HORIZON:
                if o + h not in y:
                    continue
                a, p, c = k[(o + h) % 12] + ph ** h * x[o], y[o], k[(o + h) % 12]
                for q in (loc[h], kum[h]):
                    q[0] += 1
                    q[1] += (a - y[o + h]) ** 2
                    q[2] += (p - y[o + h]) ** 2
                    q[3] += (c - y[o + h]) ** 2
        per[nm] = loc
    return kum, per


def rmse_dict(q):
    n = q[0]
    return {"n": n, "rmse_ar": math.sqrt(q[1] / n), "rmse_pers": math.sqrt(q[2] / n), "rmse_klim": math.sqrt(q[3] / n)} if n else None


def vonis_hindcast(rm):
    """LOLOS bila RMSE AR < persistensi DAN < klimatologi di semua horizon"""
    if any(r is None for r in rm.values()):
        return "GAGAL"
    return "LOLOS" if all(r["rmse_ar"] < r["rmse_pers"] and r["rmse_ar"] < r["rmse_klim"] for r in rm.values()) else "GAGAL"


def banding_model(g, m):
    """g, m {idx: nilai}; irisan bulan; -> korelasi mentah/tanpa musim, lag terbaik, rasio sd"""
    ids = sorted(set(g) & set(m))
    if len(ids) < 36:
        return None
    gm, mm = sum(g[i] for i in ids) / len(ids), sum(m[i] for i in ids) / len(ids)
    ga = {i: g[i] - gm for i in ids}
    ma = {i: m[i] - mm for i in ids}
    kg, km = klim(ga), klim(ma)
    gd = {i: ga[i] - kg[i % 12] for i in ids}
    md = {i: ma[i] - km[i % 12] for i in ids}

    def r_lag(a, b, L):   # b digeser: pasangkan a[i] dengan b[i-L]; L>0 = a tertinggal b
        p = [(a[i], b[i - L]) for i in a if i - L in b]
        return korelasi([u for u, _ in p], [v for _, v in p]) if len(p) >= 24 else None
    lags = {L: r_lag(ga, ma, L) for L in range(-6, 7)}
    best = max((L for L in lags if lags[L] is not None), key=lambda L: lags[L])
    sd = lambda d: math.sqrt(sum(v * v for v in d.values()) / len(d))
    return {"n_bulan": len(ids), "r_mentah": korelasi([ga[i] for i in ids], [ma[i] for i in ids]),
            "r_tanpa_musim": korelasi([gd[i] for i in ids], [md[i] for i in ids]),
            "lag_terbaik_bulan": best, "r_pada_lag_terbaik": lags[best], "r_lag0": lags[0],
            "rasio_sd_grace_per_model": sd(ga) / sd(ma) if sd(ma) else None}


# ---------- tarik (lab, h5py) ----------
def tarik(nc=None):
    try:
        import h5py
    except ImportError:
        raise SystemExit("tarik butuh h5py (lab): python3 -m venv v; v/bin/pip install h5py; lalu jalankan dengan v/bin/python3")
    if nc is None:
        tok = os.environ.get("EARTHDATA_TOKEN")
        if not tok:
            raise SystemExit("EARTHDATA_TOKEN tidak ada di lingkungan (atau beri --nc berkas.nc)")
        nc = os.path.join(os.environ.get("TMPDIR", "/tmp"), "grace_mascon.nc")
        r = subprocess.run(["curl", "-s", "-L", "--max-time", "600", "-H", "Authorization: Bearer " + tok, "-o", nc,
                            "-w", "%{http_code}", URL], capture_output=True, text=True)
        if r.stdout.strip() != "200":
            raise SystemExit(f"unduh gagal HTTP {r.stdout.strip()}: cek token Earthdata / persetujuan aplikasi PO.DAAC")
    f = h5py.File(nc, "r")
    t, la, lo = f["time"][:], f["lat"][:], f["lon"][:]
    ya = [i for i in range(len(la)) if KOTAK[0] <= la[i] <= KOTAK[1]]
    xa = [j for j in range(len(lo)) if KOTAK[2] <= lo[j] <= KOTAK[3]]
    y0, y1, x0, x1 = ya[0], ya[-1] + 1, xa[0], xa[-1] + 1
    lwe, unc = f["lwe_thickness"][:, y0:y1, x0:x1], f["uncertainty"][:, y0:y1, x0:x1]
    lm, sf, mid = f["land_mask"][y0:y1, x0:x1], f["scale_factor"][y0:y1, x0:x1], f["mascon_ID"][y0:y1, x0:x1]
    import datetime
    ep = datetime.date(2002, 1, 1)
    tb = f["time_bounds"][:]
    waktu = []
    for k, d in enumerate(t):   # titik tengah -> YYYY-MM; dua larik jatuh di bulan sama (2012-01, 2015-04): geser yang awal bila batas awalnya di bulan lalu, selain itu yang akhir ke bulan depan
        dt = ep + datetime.timedelta(days=float(d))
        idx = dt.year * 12 + dt.month - 1
        if waktu and idx == bulan_idx(waktu[-1]):
            aw = ep + datetime.timedelta(days=float(tb[k - 1][0]))
            if aw.year * 12 + aw.month - 1 < idx and (len(waktu) < 2 or bulan_idx(waktu[-2]) < idx - 1):
                waktu[-1] = ym_dari(idx - 1)
            else:
                idx += 1
        waktu.append(ym_dari(idx))
    assert len(set(waktu)) == len(waktu) and waktu == sorted(waktu), "bulan ganda/tak urut di deret waktu"
    sel, mascon = {}, {}
    for a in range(y1 - y0):
        for b in range(x1 - x0):
            v = [float(lwe[k, a, b]) for k in range(len(t))]
            if all(x < -9000 for x in v):
                continue
            mid_ = int(mid[a, b])
            sel[f"{la[y0 + a]:.2f},{lo[x0 + b]:.2f}"] = {"id": mid_, "darat": int(lm[a, b]), "sf": round(float(sf[a, b]), 3),
                                                       "lwe": [None if x < -9000 else round(x, 2) for x in v]}
            if mid_ not in mascon:
                u = [float(unc[k, a, b]) for k in range(len(t))]
                mascon[mid_] = [None if x < -9000 else round(x, 2) for x in u]
    meta = {"sumber": "JPL GRACE/GRACE-FO Mascon RL06.3Mv04 CRI (NASA/JPL, PO.DAAC), DOI 10.5067/TEMSC-3JC634",
            "satuan": "cm setara tinggi air (EWH), anomali terhadap rerata 2004.0-2009.999",
            "resolusi_asli": "mascon sama-luas 3 derajat; kisi 0,5 derajat hanyalah keluaran terhaluskan (CRI)",
            "kotak_lat_lon": list(KOTAK), "n_sel": len(sel), "n_mascon": len(mascon),
            "hilang": str(f.attrs.get("months_missing", b""))[2:-1]}
    os.makedirs(os.path.dirname(MENTAH), exist_ok=True)
    json.dump({"meta": meta, "waktu": waktu, "sel": sel, "ketidakpastian_mascon": {str(k): v for k, v in mascon.items()}},
              open(MENTAH, "w"), separators=(",", ":"))
    print(f"mentah ditulis: {len(waktu)} bulan, {len(sel)} sel, {len(mascon)} mascon, {os.path.getsize(MENTAH) / 1e3:.0f} KB")


# ---------- hitung (stdlib) ----------
def sel_grace(kunci):
    """sel iklim 0,1 derajat 'lat,lon' (pusat) -> kunci sel GRACE 0,5 derajat 'lat,lon' (pusat)"""
    la, lo = (float(x) for x in kunci.split(","))
    return f"{math.floor(la / 0.5) * 0.5 + 0.25:.2f},{math.floor(lo / 0.5) * 0.5 + 0.25:.2f}"


def sel_darat_terdekat(kunci, darat):
    la, lo = (float(x) for x in kunci.split(","))
    return min(sorted(darat), key=lambda c: (float(c.split(",")[0]) - la) ** 2 + (float(c.split(",")[1]) - lo) ** 2)


def bobot_ke_sel_grace(sel_km2, darat):
    """{sel_iklim: km2} -> {sel_grace_darat: bobot (jumlah 1)}; sel GRACE laut dipindah ke daratan terdekat"""
    w = {}
    for c, a in sel_km2.items():
        g = sel_grace(c)
        if g not in darat:
            g = sel_darat_terdekat(g, darat)
        w[g] = w.get(g, 0.0) + a
    tot = sum(w.values())
    return {g: a / tot for g, a in w.items()}


def rata_berbobot(seri_sel, bobot, bulan):
    """seri_sel {sel: {idx: v}}; rerata berbobot per bulan atas sel yang punya nilai (bobot dinormalkan ulang)"""
    out = {}
    for i in bulan:
        s = b = 0.0
        for g, w in bobot.items():
            v = seri_sel[g].get(i)
            if v is not None:
                s += w * v
                b += w
        if b > 0:
            out[i] = s / b
    return out


def simpanan_model(topo_sub, iklim):
    """simpanan model (tanah + tampungan linear) per sel iklim, cm, indeks bulan absolut: kumulatif P - ETa - R (mm) / 10"""
    import neraca as N
    cum = {}
    for c in {c for s in topo_sub.values() for kb in s["kab"].values() for c in kb}:
        d = iklim["sel"].get(c)
        if d is None:
            continue
        eta, r, sm, g, sm0, g0 = N.bak_dipanaskan(d["p"], d["et0"], taw=N.ASUMSI_TAW, kc=N.ASUMSI_KC, alpha=N.ASUMSI_ALPHA, k=N.ASUMSI_K)
        s, ser = 0.0, {}
        for t, (pi, ei, ri) in enumerate(zip(d["p"], eta, r)):
            s += pi - ei - ri
            ser[AWAL_IKLIM * 12 + t] = s / 10
        assert abs(s - ((sm + g) - (sm0 + g0))) < 1e-6, "kumulatif P-ETa-R tidak sama dengan perubahan simpanan bak"
        cum[c] = ser
    return cum


def hilir_ke(topo_sub, muara):
    """id sub-DAS -> id muara bila rantai nd mencapainya"""
    memo = {}

    def cari(i):
        if i in memo:
            return memo[i]
        memo[i] = None
        if i in muara:
            memo[i] = i
        else:
            nd = str(topo_sub[i]["nd"])
            if nd in topo_sub and nd != "0":
                memo[i] = cari(nd)
        return memo[i]
    sys.setrecursionlimit(10000)
    return {i: cari(i) for i in topo_sub}


def hitung():
    import glofas as GF
    for p in (MENTAH, TOPO, IKLIM):
        if not os.path.exists(p):
            raise SystemExit(f"{p} tidak ada (jalankan `tarik` atau topologi/iklim lebih dulu)")
    raw, topo, iklim = (json.load(open(p)) for p in (MENTAH, TOPO, IKLIM))
    nama = {k: v["nama"] for k, v in json.load(open(os.path.join(AKAR, "public/data/neraca_air/kab.json")))["kab"].items()}
    waktu = [bulan_idx(w) for w in raw["waktu"]]
    darat = {k for k, v in raw["sel"].items() if v["darat"] == 1}
    seri = {k: {waktu[j]: x for j, x in enumerate(v["lwe"]) if x is not None} for k, v in raw["sel"].items()}
    tsub = topo["subdas"]
    # bobot sel iklim per kab, per DAS (12 muara), dan seluruh Jawa
    km_kab, km_das, km_jawa = {}, {}, {}
    muara = {v[0]: n for n, v in GF.MUARA.items()}
    ke_muara = hilir_ke(tsub, muara)
    for i, s in tsub.items():
        for k, kb in s["kab"].items():
            for c, a in kb.items():
                km_kab.setdefault(k, {})[c] = km_kab.get(k, {}).get(c, 0.0) + a
                km_jawa[c] = km_jawa.get(c, 0.0) + a
                if ke_muara[i]:
                    km_das.setdefault(muara[ke_muara[i]], {})[c] = km_das.get(muara[ke_muara[i]], {}).get(c, 0.0) + a
    kab_ok = sorted(k for k in km_kab if k in nama)
    cumm = simpanan_model(tsub, iklim)
    bulan_g = sorted(set().union(*(set(v) for v in seri.values())))
    bulan_m = sorted(next(iter(cumm.values())))

    def bangun(sel_km2):
        bw = bobot_ke_sel_grace(sel_km2, darat)
        g = rata_berbobot(seri, bw, bulan_g)
        tot = sum(sel_km2.values())
        mm = {}
        for i in bulan_m:
            s = b = 0.0
            for c, a in sel_km2.items():
                if c in cumm:
                    s += a * cumm[c][i]
                    b += a
            if b:
                mm[i] = s / b
        # model: anomali terhadap rerata periode GRACE (jendela sama), bukan terhadap awal simulasi
        ids = [i for i in bulan_g if i in mm]
        mu = sum(mm[i] for i in ids) / len(ids)
        mm = {i: v - mu for i, v in mm.items()}
        ids_mascon = {}
        for gk, w in bw.items():
            ids_mascon[raw["sel"][gk]["id"]] = ids_mascon.get(raw["sel"][gk]["id"], 0.0) + w
        return {"g": g, "m": mm, "km2": tot, "mascon": ids_mascon}

    unit = {("kab", k): bangun(km_kab[k]) for k in kab_ok}
    unit.update({("das", n): bangun(v) for n, v in km_das.items()})
    km_masc = {}
    for c, a in km_jawa.items():   # satuan bebas sebenarnya: mascon (kab/DAS hanya campuran berbobot dari mereka)
        g = sel_grace(c)
        g = g if g in darat else sel_darat_terdekat(g, darat)
        km_masc.setdefault(raw["sel"][g]["id"], {})[c] = a
    unit.update({("mascon", str(i)): bangun(v) for i, v in km_masc.items()})
    unit[("jawa", "Jawa")] = bangun(km_jawa)
    deret = {u: v["g"] for u, v in unit.items()}
    _, per = hindcast(deret)
    # vonis utama = terkumpul atas mascon saja (satuan hampir bebas); kab/DAS berbagi mascon sehingga menghitung ganda
    kum = {h: [sum(per[u][h][j] for u in per if u[0] == "mascon") for j in range(4)] for h in HORIZON}
    rm = {h: rmse_dict(kum[h]) for h in HORIZON}
    vonis = vonis_hindcast(rm)
    last = max(bulan_g)
    out_u = {}
    for u, v in unit.items():
        y = v["g"]
        med, lo, hi, neff = sen({i: y[i] - klim(y)[i % 12] for i in y})
        k = klim(y)
        x = {i: y[i] - k[i % 12] for i in y}
        ph = phi_lag1(x)
        r_h = {h: rmse_dict(per[u][h]) for h in HORIZON}
        lolos = vonis_hindcast(r_h)
        pr = {"bulan": [ym_dari(last + h) for h in HORIZON],
              "nilai": [round(k[(last + h) % 12] + ph ** h * x[last], 2) if last in x else None for h in HORIZON]}
        pr["lo"] = [round(n - 1.96 * r_h[h]["rmse_ar"], 2) for n, h in zip(pr["nilai"], HORIZON)]
        pr["hi"] = [round(n + 1.96 * r_h[h]["rmse_ar"], 2) for n, h in zip(pr["nilai"], HORIZON)]
        mb = banding_model(y, v["m"])
        e = {"km2": round(v["km2"]), "mascon": {str(a): round(b, 3) for a, b in sorted(v["mascon"].items())},
             "tren_cm_per_thn": round(med, 3), "tren_ci95": [round(lo, 3), round(hi, 3)], "n_eff": round(neff, 1),
             "tren_signifikan": lo > 0 or hi < 0, "tren_juta_m3_per_thn": round(med * v["km2"] * 0.01, 1),
             "phi_ar1": round(ph, 3), "hindcast": {str(h): {a: (round(b, 3) if a != "n" else b) for a, b in r_h[h].items()} for h in HORIZON},
             "vonis_hindcast": lolos, "prakiraan_cm": pr,
             "banding_model": None if mb is None else {a: (round(b, 3) if isinstance(b, float) else b) for a, b in mb.items()},
             "tws_cm": [round(y[i], 2) if i in y else None for i in bulan_g]}
        if u[0] == "kab":
            e["nama"] = nama[u[1]]
        out_u[u] = e
    kab_ = {k: out_u[("kab", k)] for k in kab_ok}
    das_ = {n: out_u[("das", n)] for n in km_das}
    jawa = out_u[("jawa", "Jawa")]
    masc_ = {n: out_u[("mascon", n)] for u, n in [(u, u[1]) for u in out_u if u[0] == "mascon"]}
    rr = lambda f: sorted(e["banding_model"][f] for e in kab_.values() if e["banding_model"] and e["banding_model"][f] is not None)
    med_ = lambda xs: xs[len(xs) // 2] if xs else None
    n_lolos = sum(e["vonis_hindcast"] == "LOLOS" for e in kab_.values())
    hasil = {
        "meta": {
            "label": "estimasi-model", "produk": "GRACE/GRACE-FO JPL mascon RL06.3Mv04 CRI, TWSA bulanan",
            "sumber": raw["meta"]["sumber"], "satuan": "cm setara tinggi air; anomali terhadap rerata 2004-2009",
            "peringatan_resolusi": "Resolusi asli mascon ~3 derajat (~330 km). Nilai per kab/DAS hanyalah rerata berbobot luas dari "
                                   f"{len({m for e in kab_.values() for m in e['mascon']})} mascon yang menutup Jawa, sehingga kab bertetangga berbagi sinyal dan "
                                   "tren yang hampir sama. Bacalah sebagai simpanan wilayah, bukan simpanan kab; tidak untuk keputusan tingkat kab.",
            "tws": "total simpanan terestrial (tanah + air tanah dalam + air permukaan + salju); model neraca hanya tanah + tampungan linear",
            "waktu": raw["waktu"], "bulan_terakhir": ym_dari(last), "n_bulan": len(bulan_g), "bulan_hilang_produk": raw["meta"]["hilang"],
            "metode": {"agregasi": "sel iklim 0,1 deg topologi.json (HydroBASINS lev09 x kab) -> sel GRACE 0,5 deg daratan, bobot km2",
                       "tren": "Sen pada deret tanpa musim; CI 95% Mann-Kendall dengan n_eff koreksi autokorelasi lag-1",
                       "prakiraan": "AR(1) pada anomali dari klimatologi bulanan, h=1..3; selang = +-1,96 x RMSE hindcast per kab dan h",
                       "hindcast": f"origin bergulir, latih hanya data <= origin, origin pertama >= {LATIH_MIN} bulan sesudah awal; pembanding persistensi dan klimatologi",
                       "vonis": "LOLOS bila RMSE AR < persistensi DAN < klimatologi di h=1,2,3; vonis utama atas hindcast terkumpul MASCON (satuan hampir bebas), vonis per kab/DAS menyertai",
                       "model_banding": "simpanan model = kumulatif (P - ETa - R) tiap sel iklim, cm, dari neraca.bak (ASUMSI_* neraca.py), anomali terhadap rerata jendela GRACE; lag + = GRACE tertinggal model"},
            "jadwal_usulan": "statis.yml bulanan (produk JPL terbit ~sebulan sekali dengan jeda ~2-3 bulan): pip install h5py; EARTHDATA_TOKEN dari secret; "
                             "python3 scripts/air/neraca/grace.py tarik && python3 scripts/air/neraca/grace.py hitung",
        },
        "hindcast_terkumpul_mascon":{str(h): {a: (round(b, 3) if a != "n" else b) for a, b in rm[h].items()} for h in HORIZON},
        "vonis_hindcast": vonis,
        "ringkasan": {"kab_lolos": n_lolos, "kab_total": len(kab_),
                      "mascon_lolos": sorted(n for n, e in masc_.items() if e["vonis_hindcast"] == "LOLOS"),
                      "mascon_gagal": sorted(n for n, e in masc_.items() if e["vonis_hindcast"] == "GAGAL"),
                      "banding_model_median": {"r_mentah": med_(rr("r_mentah")), "r_tanpa_musim": med_(rr("r_tanpa_musim")),
                                               "lag_terbaik_bulan": med_(rr("lag_terbaik_bulan")), "rasio_sd_grace_per_model": med_(rr("rasio_sd_grace_per_model"))},
                      "kab_tren_signifikan": sum(e["tren_signifikan"] for e in kab_.values())},
        "jawa": jawa, "mascon": masc_, "das": das_, "kab": kab_,
    }
    for h in hasil["hindcast_terkumpul_mascon"].values():
        h["skill_vs_persistensi"] = round(1 - h["rmse_ar"] / h["rmse_pers"], 3)
        h["skill_vs_klimatologi"] = round(1 - h["rmse_ar"] / h["rmse_klim"], 3)
    ukuran = len(json.dumps(hasil, separators=(",", ":")))
    assert ukuran < 2_000_000, f"keluaran {ukuran} B melewati 2 MB"
    os.makedirs(os.path.dirname(KELUAR), exist_ok=True)
    json.dump(hasil, open(KELUAR, "w"), separators=(",", ":"), ensure_ascii=False)
    print(f"{KELUAR}: {ukuran / 1e3:.0f} KB; vonis {vonis}; kab lolos {n_lolos}/{len(kab_)}")
    return hasil


# ---------- uji ----------
def uji():
    import random
    rng = random.Random(7)
    # 1. Sen: garis tepat 2 cm/thn dengan lubang data
    y = {i: 2.0 * i / 12 for i in range(0, 240) if i % 7 != 3}
    med, lo, hi, _ = sen(y)
    assert abs(med - 2.0) < 1e-9 and lo <= 2.0 <= hi, (med, lo, hi)
    # musiman murni + tanpa tren -> tren ~ 0 setelah buang klimatologi
    s = {i: 10 * math.sin(2 * math.pi * i / 12) for i in range(240)}
    k = klim(s)
    assert abs(sen({i: v - k[i % 12] for i, v in s.items()})[0]) < 1e-9
    # tren positif dengan derau: CI memuat nilai benar 1,5
    y = {i: 1.5 * i / 12 + rng.gauss(0, 3) for i in range(240)}
    med, lo, hi, _ = sen(y)
    assert lo < 1.5 < hi and lo > 0, (med, lo, hi)
    # autokorelasi memperlebar CI: AR(0,9) vs derau putih, panjang dan varians kira-kira sama
    xa, ar = 0.0, {}
    for i in range(240):
        xa = 0.9 * xa + rng.gauss(0, 1)
        ar[i] = xa
    sd = math.sqrt(sum(v * v for v in ar.values()) / 240)
    wn = {i: rng.gauss(0, sd) for i in range(240)}
    ca, cw = sen(ar), sen(wn)
    assert ca[2] - ca[1] > cw[2] - cw[1] and ca[3] < cw[3], (ca, cw)
    # 2. masukan salah ditolak
    try:
        sen({i: 0.0 for i in range(10)})
    except ValueError:
        pass
    else:
        raise AssertionError("deret 10 bulan lolos sebagai tren")
    # 3. AR(1): phi pulih; hindcast bocor-bebas (mengubah masa depan tidak mengubah prakiraan)
    x, ph = 0.0, 0.8
    y = {}
    for i in range(300):
        x = ph * x + rng.gauss(0, 1)
        y[i] = x + 5 * math.sin(2 * math.pi * i / 12)
    kk = klim(y)
    est = phi_lag1({i: v - kk[i % 12] for i, v in y.items()})
    assert abs(est - ph) < 0.12, est
    a1 = prakiraan(y, 200, 2)
    y2 = dict(y)
    for i in range(201, 300):
        y2[i] += 1000
    assert prakiraan(y2, 200, 2) == a1, "prakiraan memakai data setelah origin (bocor)"
    # 4. hindcast: seri persisten -> LOLOS; derau putih -> AR tidak lebih buruk dari persistensi (persistensi menggandakan varians)
    _, per = hindcast({"ar": y})
    r = {h: rmse_dict(per["ar"][h]) for h in HORIZON}
    assert vonis_hindcast(r) == "LOLOS", r
    pw = {i: 5 * math.sin(2 * math.pi * i / 12) + rng.gauss(0, 2) for i in range(300)}
    _, per = hindcast({"pw": pw})
    r = {h: rmse_dict(per["pw"][h]) for h in HORIZON}
    assert all(r[h]["rmse_ar"] < r[h]["rmse_pers"] for h in HORIZON), r
    assert vonis_hindcast({1: None, 2: r[2], 3: r[3]}) == "GAGAL"
    assert vonis_hindcast({h: {"rmse_ar": 2.0, "rmse_pers": 1.0, "rmse_klim": 3.0} for h in HORIZON}) == "GAGAL", "AR kalah dari persistensi harus GAGAL"
    # 5. banding model: seri sama r=1; digeser 2 bulan -> lag terbaik 2; invers -> r<0
    m = {i: math.sin(2 * math.pi * i / 12) + 0.3 * math.sin(2 * math.pi * i / 37) for i in range(120)}
    g = {i + 2: v for i, v in m.items()}
    b = banding_model(m, m)
    assert abs(b["r_mentah"] - 1) < 1e-9 and b["lag_terbaik_bulan"] == 0
    b = banding_model(g, m)
    assert b["lag_terbaik_bulan"] == 2, b
    assert banding_model({i: -v for i, v in m.items()}, m)["r_mentah"] < -0.99
    assert banding_model({i: 1.0 for i in range(10)}, {i: 1.0 for i in range(10)}) is None
    # 6. pemetaan kisi: sel iklim -> sel GRACE 0,5 derajat; bobot jumlah 1; sel laut dipindah ke darat terdekat
    assert sel_grace("-6.05,106.45") == "-6.25,106.25" and sel_grace("-7.05,110.05") == "-7.25,110.25"
    w = bobot_ke_sel_grace({"-6.05,106.45": 3.0, "-6.05,106.55": 1.0}, {"-6.25,106.25", "-6.25,106.75"})
    assert abs(sum(w.values()) - 1) < 1e-12 and abs(w["-6.25,106.25"] - 0.75) < 1e-12
    w = bobot_ke_sel_grace({"-5.05,106.45": 1.0}, {"-6.25,106.25", "-9.25,106.25"})
    assert list(w) == ["-6.25,106.25"], w
    # 7. indeks bulan bolak-balik; rerata berbobot menormalkan ulang sel kosong
    assert ym_dari(bulan_idx("2011-12")) == "2011-12" and bulan_idx("2012-01") - bulan_idx("2011-12") == 1
    assert rata_berbobot({"a": {1: 10.0}, "b": {}}, {"a": 0.5, "b": 0.5}, [1, 2]) == {1: 10.0}
    # 8. kumulatif P-ETa-R model = perubahan simpanan (konservasi massa) pada iklim buatan
    import neraca as N
    p, e = [200, 10, 0, 50, 300, 20], [90, 100, 110, 100, 90, 100]
    eta, rr, sm, gg, sm0, g0 = N.bak_dipanaskan(p, e, taw=N.ASUMSI_TAW, kc=N.ASUMSI_KC, alpha=N.ASUMSI_ALPHA, k=N.ASUMSI_K)
    assert abs(sum(a - b - c for a, b, c in zip(p, eta, rr)) - ((sm + gg) - (sm0 + g0))) < 1e-9
    # 9. hilir_ke menelusuri rantai nd sampai muara
    assert hilir_ke({"1": {"nd": 2}, "2": {"nd": 3}, "3": {"nd": 0}, "4": {"nd": 0}}, {"3": "X"}) == {"1": "3", "2": "3", "3": "3", "4": None}
    print("grace.py uji: semua lolos")


if __name__ == "__main__":
    a = sys.argv[1:]
    if a[:1] == ["tarik"]:
        tarik(a[a.index("--nc") + 1] if "--nc" in a else None)
    elif a[:1] == ["hitung"]:
        hitung()
    elif a[:1] == ["uji"]:
        uji()
    else:
        raise SystemExit(__doc__)
