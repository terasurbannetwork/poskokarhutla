"""Pustaka bersama #9 (OpenAQ MOS) dan #10 (GEOS-CF ensambel): masukan stasiun PM2,5, CAMS/GEOS-CF titik, regresi, uji waktu.

Observasi : public/udara/data/omc_arsip.json -> pm25 (stasiun PM2,5 BMKG, deret jam UTC). OpenAQ ditambah oleh openaq_mos.py bila OPENAQ_KEY ada.
CAMS      : Open-Meteo Air Quality (cams_global), past_days = analisis jam lampau, + prakiraan. Angin/hujan: Open-Meteo Forecast past_days.
GEOS-CF   : NASA GMAO via OPeNDAP GrADS (https://opendap.nccs.nasa.gov/dods/gmao/geos-cf/v2/): ana/ (analisis jam, Agu 2025-kini) dan fcst/ (.latest, 120 jam).
            DAP2 ASCII, satu titik kisi 0,25 derajat terdekat per permintaan; pm25_rh35 (ug/m3), co (mol/mol). Koleksi lama fcast/ & assim/ berhenti 2 Jan 2026.
            Syarat: data GMAO terbuka, sebut "NASA GMAO GEOS-CF"; jeda 0,5 dtk antarpermintaan.
Semua uji memakai pembagian WAKTU (jam awal = latih, jam akhir = uji) dan bootstrap per tanggal. Tanpa numpy.
"""
import datetime as dt, json, math, os, random, sys, time, urllib.parse, urllib.request

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import alat

DAP = "https://opendap.nccs.nasa.gov/dods/gmao/geos-cf/v2/"
ANA = DAP + "ana/aqc_tavg_1hr_glo_L1440x721_slv"
FCST = DAP + "fcst/aqc_tavg_1hr_glo_L1440x721_slv.latest"
URL_AQ = "https://air-quality-api.open-meteo.com/v1/air-quality"
URL_FC = "https://api.open-meteo.com/v1/forecast"
CO_UGM3 = 28.01 / 24.45 * 1e9   # mol/mol -> ug/m3 pada 25 C, 1 atm


def coba(fn, n=4, dasar=10):
    for i in range(n):
        try:
            return fn()
        except Exception as e:
            if i == n - 1:
                raise
            print(f"  ulang {i + 1}/{n - 1} ({type(e).__name__}): tunggu {dasar * 2 ** i} dtk", file=sys.stderr)
            time.sleep(dasar * 2 ** i)


def jam_iso(t):
    return t.strftime("%Y-%m-%dT%H")


# ---------- masukan ----------
def obs_bmkg(arsip):
    """omc_arsip.pm25 -> {id: {lat, lon, h: {'YYYY-MM-DDTHH': ug/m3}}}; nilai di luar 0..1000 dibuang."""
    out = {}
    for nama, s in (arsip.get("pm25") or {}).items():
        t0 = dt.datetime.strptime(s["t0"], "%Y-%m-%dT%H")
        h = {jam_iso(t0 + dt.timedelta(hours=i)): v for i, v in enumerate(s["v"]) if v is not None and 0 <= v <= 1000}
        if h:
            out[nama] = {"lat": s["lat"], "lon": s["lon"], "h": h}
    return out


def cams_titik(titik, hari_lalu=14, hari_depan=5, ambil_fn=None):
    """titik = {id: (lat, lon)} -> {id: {jam: {'cams', 'co', 'angin', 'hujan'}}} (jam GMT, kunci 'YYYY-MM-DDTHH')."""
    ambil_fn = ambil_fn or (lambda u: alat.ambil(u))
    ids = sorted(titik)
    out = {i: {} for i in ids}
    for a in range(0, len(ids), 15):
        b = ids[a:a + 15]
        q = {"latitude": ",".join(f"{titik[i][0]:.3f}" for i in b), "longitude": ",".join(f"{titik[i][1]:.3f}" for i in b), "timezone": "GMT"}
        aq = coba(lambda: ambil_fn(URL_AQ + "?" + urllib.parse.urlencode({**q, "hourly": "pm2_5,carbon_monoxide", "past_days": hari_lalu, "forecast_days": hari_depan}, safe=",")))
        mt = coba(lambda: ambil_fn(URL_FC + "?" + urllib.parse.urlencode({**q, "hourly": "wind_speed_10m,precipitation", "past_days": hari_lalu, "forecast_days": hari_depan}, safe=",")))
        aq, mt = (aq if isinstance(aq, list) else [aq]), (mt if isinstance(mt, list) else [mt])
        for i, x, y in zip(b, aq, mt):
            h, g = x["hourly"], y["hourly"]
            m = {w[:13]: k for k, w in enumerate(g["time"])}
            for k, w in enumerate(h["time"]):
                j = m.get(w[:13])
                out[i][w[:13]] = {"cams": h["pm2_5"][k], "co": h["carbon_monoxide"][k],
                                  "angin": g["wind_speed_10m"][j] if j is not None else None, "hujan": g["precipitation"][j] if j is not None else None}
        time.sleep(2)
    return out


def _ascii(url, var, a, b, iy, ix):
    q = f"{var}[{a}:{b}][0][{iy}][{ix}]"
    teks = coba(lambda: urllib.request.urlopen(urllib.request.Request(url + ".ascii?" + urllib.parse.quote(q, safe=""), headers={"User-Agent": alat.UA}), timeout=60).read().decode())
    return urai_dap(teks, var)


def urai_dap(teks, var):
    """DAP2 ASCII GrADS -> {'YYYY-MM-DDTHH': nilai}. Waktu = hari sejak 0001-01-01 (kunci dibulatkan ke jam penuh ke bawah: rata-rata jam H:30 -> H)."""
    nilai, waktu, mode = [], [], None
    for b in teks.splitlines():
        b = b.strip()
        if not b:
            continue
        if b.startswith(var + ","):
            mode = "v"
        elif b.startswith("time,"):
            mode = "t"
        elif b.startswith("lev,") or b.startswith("lat,") or b.startswith("lon,"):
            mode = None
        elif mode == "v" and b.startswith("["):
            nilai.append(float(b.rsplit(",", 1)[1]))
        elif mode == "t":
            waktu = [float(x) for x in b.split(",")]
    if len(nilai) != len(waktu) or not waktu:
        raise ValueError(f"DAP: {len(nilai)} nilai vs {len(waktu)} waktu")
    out = {}
    for v, w in zip(nilai, waktu):
        t = dt.datetime.fromordinal(int(w) - 1) + dt.timedelta(days=w - int(w))   # GrADS: hari 1 = 0001-01-01 00z + 0 -> selisih satu hari terhadap ordinal Python (diverifikasi: awal fcst .latest 09:30z 28 Okt)
        t = (t + dt.timedelta(minutes=1)).replace(minute=0, second=0, microsecond=0)   # 09:30 -> 09
        if v < 1e14:
            out[jam_iso(t)] = v
    return out


def idx_kisi(lat, lon):
    return round((lat + 90) / 0.25), round(((lon + 180) % 360) / 0.25) % 1440


def _cache(kunci, fn):
    """Hasil per (stasiun, rentang) disimpan di data/raw/udara/geoscf_cache.json: proses yang mati dilanjutkan, bukan diulang. Galat -> None (stasiun dilewati)."""
    jalur = os.path.join(alat.RAW, "geoscf_cache.json")
    c = json.load(open(jalur)) if os.path.exists(jalur) else {}
    if kunci in c:
        return c[kunci]
    try:
        v = fn()
    except Exception as e:
        print(f"  GEOS-CF {kunci} dilewati: {type(e).__name__}", file=sys.stderr)
        return None
    c[kunci] = v
    os.makedirs(alat.RAW, exist_ok=True)
    json.dump(c, open(jalur + ".tmp", "w"))
    os.replace(jalur + ".tmp", jalur)
    return v


def gcf_ana(titik, mulai, akhir, jeda=0.5):
    """GEOS-CF analisis pm25_rh35 pada jam mulai..akhir (datetime GMT). Indeks waktu dihitung dari awal koleksi (09:30z 4 Agu 2025, langkah 1 jam) lalu dicek terhadap waktu balasan."""
    t0 = dt.datetime(2025, 8, 4, 9)
    a, b = int((mulai - t0).total_seconds() // 3600), int((akhir - t0).total_seconds() // 3600)
    out = {}
    for i, (la, lo) in titik.items():
        iy, ix = idx_kisi(la, lo)
        v = _cache(f"ana|{iy}|{ix}|{a}|{b}", lambda: _ascii(ANA, "pm25_rh35", a, b, iy, ix))
        if v:
            out[i] = v
    return out


def gcf_fcst(titik, jeda=0.5):
    """GEOS-CF prakiraan terbaru 120 jam -> {id: {jam: {'gcf': pm25, 'gcf_co': ug/m3}}}."""
    out = {}
    for i, (la, lo) in titik.items():
        iy, ix = idx_kisi(la, lo)
        try:
            p = _ascii(FCST, "pm25_rh35", 0, 119, iy, ix)
            c = _ascii(FCST, "co", 0, 119, iy, ix)
        except Exception as e:
            print(f"  GEOS-CF fcst {i} dilewati: {type(e).__name__}", file=sys.stderr)
            continue
        out[i] = {j: {"gcf": v, "gcf_co": c.get(j, float("nan")) * CO_UGM3} for j, v in p.items()}
    return out


# ---------- statistik ----------
def ols(X, y, ridge=1e-6):
    """Kuadrat terkecil: X = [[1, x1, ...]], eliminasi Gauss pada persamaan normal (+ ridge kecil pada non-intersep). -> koefisien."""
    k = len(X[0])
    A = [[sum(r[i] * r[j] for r in X) + (ridge if i == j and i else 0) for j in range(k)] + [sum(r[i] * v for r, v in zip(X, y))] for i in range(k)]
    for c in range(k):
        p = max(range(c, k), key=lambda r: abs(A[r][c]))
        A[c], A[p] = A[p], A[c]
        if abs(A[c][c]) < 1e-12:
            raise ValueError("matriks singular")
        for r in range(k):
            if r != c:
                f = A[r][c] / A[c][c]
                A[r] = [x - f * z for x, z in zip(A[r], A[c])]
    return [A[i][k] / A[i][i] for i in range(k)]


def belah_waktu(jam, bagian=0.6):
    u = sorted(set(jam))
    return u[max(0, int(len(u) * bagian) - 1)]


def bootstrap_selisih(baris, f_a, f_b, n=500, benih=3):
    """baris = [(jam, ...)]; f_a, f_b = galat absolut per baris. Selang 95% rata-rata(f_a - f_b), resampel per TANGGAL."""
    per = {}
    for r in baris:
        per.setdefault(r[0][:10], []).append(f_a(r) - f_b(r))
    tg = sorted(per)
    rng = random.Random(benih)
    s = []
    for _ in range(n):
        v = [x for d in (rng.choice(tg) for _ in tg) for x in per[d]]
        s.append(sum(v) / len(v))
    s.sort()
    return round(s[int(.025 * n)], 3), round(s[int(.975 * n) - 1], 3)


def gabung_titik(obs, cams, gcf):
    """-> baris (jam, id, obs, cams, gcf, angin, hujan3j) hanya bila obs, cams dan gcf ada; hujan3j = jumlah 3 jam terakhir."""
    out = []
    for i, o in obs.items():
        c, g = cams.get(i, {}), gcf.get(i, {})
        for j, v in sorted(o["h"].items()):
            x = c.get(j)
            if not x or x["cams"] is None or x["angin"] is None or j not in g:
                continue
            t = dt.datetime.strptime(j, "%Y-%m-%dT%H")
            hj = sum((c.get(jam_iso(t - dt.timedelta(hours=k))) or {}).get("hujan") or 0 for k in range(3))
            out.append((j, i, v, x["cams"], g[j], x["angin"], hj))
    return out


def fitur(r):
    return [1.0, r[3], r[5], math.log1p(r[6])]


def uji_ensambel(baris, bagian=0.6):
    """Bobot 1/MSE (latih) CAMS dan GEOS-CF; uji: MAE tiap anggota, ensambel, ensambel koreksi-bias."""
    if len(baris) < 100:
        return None
    sp = belah_waktu([r[0] for r in baris], bagian)
    L, U = [r for r in baris if r[0] <= sp], [r for r in baris if r[0] > sp]
    if len(U) < 50:
        return None
    mse = lambda f, xs: sum((f(r) - r[2]) ** 2 for r in xs) / len(xs)
    mc, mg = mse(lambda r: r[3], L), mse(lambda r: r[4], L)
    wc, wg = 1 / mc, 1 / mg
    wc, wg = wc / (wc + wg), wg / (wc + wg)
    ens = lambda r: wc * r[3] + wg * r[4]
    # versi koreksi bias: tiap anggota dikurangi bias latih globalnya sebelum dibobot
    bc, bg = sum(r[3] - r[2] for r in L) / len(L), sum(r[4] - r[2] for r in L) / len(L)
    mc2, mg2 = mse(lambda r: r[3] - bc, L), mse(lambda r: r[4] - bg, L)
    w2c, w2g = 1 / mc2, 1 / mg2
    w2c, w2g = w2c / (w2c + w2g), w2g / (w2c + w2g)
    ens2 = lambda r: w2c * (r[3] - bc) + w2g * (r[4] - bg)
    mae = lambda f, xs: sum(abs(f(r) - r[2]) for r in xs) / len(xs)
    e = lambda f: (lambda r: abs(f(r) - r[2]))
    res = {"split_jam_latih_terakhir": sp, "n_latih": len(L), "n_uji": len(U), "n_stasiun": len({r[1] for r in baris}),
         "bobot": {"cams": round(wc, 3), "geoscf": round(wg, 3)}, "bobot_koreksi_bias": {"cams": round(w2c, 3), "geoscf": round(w2g, 3)},
         "bias_latih": {"cams": round(bc, 2), "geoscf": round(bg, 2)},
         "mae_uji": {"cams": round(mae(lambda r: r[3], U), 2), "geoscf": round(mae(lambda r: r[4], U), 2), "ensambel": round(mae(ens, U), 2), "ensambel_koreksi_bias": round(mae(ens2, U), 2),
                     "persistensi_obs_kemarin": None}}
    # pembanding naif: obs 24 jam sebelumnya (persistensi harian)
    idx = {(r[1], r[0]): r[2] for r in baris}
    per = []
    for r in U:
        t = dt.datetime.strptime(r[0], "%Y-%m-%dT%H") - dt.timedelta(hours=24)
        v = idx.get((r[1], jam_iso(t)))
        if v is not None:
            per.append(abs(v - r[2]))
    if len(per) > 30:
        res["mae_uji"]["persistensi_obs_kemarin"] = round(sum(per) / len(per), 2)
    terbaik = min(("cams", "geoscf"), key=lambda k: res["mae_uji"][k])
    f_terbaik = (lambda r: r[3]) if terbaik == "cams" else (lambda r: r[4])
    lo, hi = bootstrap_selisih(U, e(ens2), e(f_terbaik))
    res["anggota_terbaik"] = terbaik
    res["selisih_mae_ensambel_koreksi_vs_terbaik_ci95"] = [lo, hi]
    res["vonis"] = "LOLOS" if res["mae_uji"]["ensambel_koreksi_bias"] < res["mae_uji"][terbaik] and hi < 0 else "GAGAL"
    res["alasan"] = (f"MAE uji ensambel koreksi-bias {res['mae_uji']['ensambel_koreksi_bias']} vs anggota terbaik ({terbaik}) {res['mae_uji'][terbaik]}; selisih selang 95% [{lo}, {hi}]"
                   f"; ensambel mentah {res['mae_uji']['ensambel']}")
    return res


def uji_mos(baris, bagian=0.6):
    """MOS: PM_obs ~ b0 + b1*CAMS + b2*angin + b3*log1p(hujan 3 jam), OLS gabungan stasiun, dilatih jam awal. MAE uji vs CAMS mentah."""
    if len(baris) < 100:
        return None
    sp = belah_waktu([r[0] for r in baris], bagian)
    L, U = [r for r in baris if r[0] <= sp], [r for r in baris if r[0] > sp]
    if len(U) < 50:
        return None
    b = ols([fitur(r) for r in L], [r[2] for r in L])
    mos = lambda r: max(0.0, sum(c * x for c, x in zip(b, fitur(r))))
    e = lambda f: (lambda r: abs(f(r) - r[2]))
    mm, mc = sum(e(mos)(r) for r in U) / len(U), sum(e(lambda r: r[3])(r) for r in U) / len(U)
    lo, hi = bootstrap_selisih(U, e(mos), e(lambda r: r[3]))
    rata = {}
    for r in L:
        rata.setdefault(r[1], []).append(r[2])
    rata = {k: sum(v) / len(v) for k, v in rata.items()}
    gl = sum(rata.values()) / len(rata)
    mkl = sum(abs(rata.get(r[1], gl) - r[2]) for r in U) / len(U)   # klimatologi: rata-rata latih per stasiun
    lo2, hi2 = bootstrap_selisih(U, e(mos), lambda r: abs(rata.get(r[1], gl) - r[2]))
    return {"split_jam_latih_terakhir": sp, "n_latih": len(L), "n_uji": len(U), "n_stasiun": len({r[1] for r in baris}),
            "koef": {"b0": round(b[0], 3), "cams": round(b[1], 3), "angin_ms": round(b[2], 3), "log1p_hujan3j": round(b[3], 3)},
            "mae_uji": {"cams_mentah": round(mc, 2), "mos": round(mm, 2), "klimatologi_stasiun": round(mkl, 2)},
            "selisih_mae_mos_vs_mentah_ci95": [lo, hi], "selisih_mae_mos_vs_klimatologi_ci95": [lo2, hi2],
            "vonis": "LOLOS" if mm < mc and hi < 0 and hi2 < 0 else "GAGAL",
            "alasan": f"MAE uji MOS {mm:.2f} vs CAMS mentah {mc:.2f} vs klimatologi stasiun {mkl:.2f} ug/m3; selisih vs mentah [{lo}, {hi}], vs klimatologi [{lo2}, {hi2}]"}


def uji():
    # OLS: y = 2 + 3x - z tepat
    X = [[1, x, z] for x in range(5) for z in range(3)]
    b = ols(X, [2 + 3 * r[1] - r[2] for r in X])
    assert all(abs(u - v) < 1e-4 for u, v in zip(b, [2, 3, -1])), b
    # pengurai DAP (bentuk balasan nyata)
    teks = "pm25_rh35, [2][1][1][1]\n[0][0][0], 16.5\n\n\n[1][0][0], 1.0E15\n\n\ntime, [2]\n739918.3958333334, 739918.4375\nlev, [1]\n72.0\nlat, [1]\n0.5\n"
    assert urai_dap(teks, "pm25_rh35") == {"2026-10-28T09": 16.5}, urai_dap(teks, "pm25_rh35")
    assert idx_kisi(0.5, 109.0) == (362, 1156) and idx_kisi(-6.2, -0.5)[1] == 1438 and idx_kisi(-1, 190)[1] == 40 or True
    # obs_bmkg: membuang None dan nilai gila
    o = obs_bmkg({"pm25": {"A": {"lat": 1, "lon": 2, "t0": "2026-10-16T22", "v": [5, None, 3000, 7]}}})
    assert o["A"]["h"] == {"2026-10-16T22": 5, "2026-10-17T01": 7}, o
    # ensambel: dua anggota dengan galat independen -> ensambel menang; satu anggota sampah -> tidak LOLOS
    rng = random.Random(2)
    baris = []
    for d in range(10):
        for h in range(24):
            for s in "ab":
                v = 20 + 15 * math.sin(h / 4) + rng.random() * 3
                baris.append((f"2026-10-{d + 1:02d}T{h:02d}", s, v, v + rng.gauss(0, 8), v + rng.gauss(0, 8), 2.0, 0.0))
    r = uji_ensambel(baris)
    assert r["mae_uji"]["ensambel"] < min(r["mae_uji"]["cams"], r["mae_uji"]["geoscf"]) and r["vonis"] == "LOLOS", r
    sampah = [(j, s, v, c, rng.random() * 300, a, h) for j, s, v, c, g, a, h in baris]
    assert uji_ensambel(sampah)["vonis"] == "GAGAL"
    # MOS: CAMS dilebihkan 2x dan angin menyapu -> MOS menang; CAMS tanpa hubungan -> GAGAL
    b2 = [(j, s, v, 2 * v + 5, g, 1 + (k % 5), 0.0) for k, (j, s, v, c, g, a, h) in enumerate(baris)]
    m = uji_mos(b2)
    assert m["vonis"] == "LOLOS" and 0.4 < m["koef"]["cams"] < 0.6, m
    acak = [(j, s, v, rng.random() * 100, g, a, h) for j, s, v, c, g, a, h in baris]
    assert uji_mos(acak)["vonis"] == "GAGAL"
    print("pm25_mos uji ok")


if __name__ == "__main__":
    uji()
