"""Riset pendorong: (a) kapan satu titik panas MEMBESAR (lolos) dan (b) ke mana dan seberapa jauh api menjalar.

(a) Unit = peristiwa (9 provinsi, Jul-Nov, ada berkas cuaca), keadaan saat deteksi PERTAMA. Label lolos = >= 10 sel
    (~140 ha) terdeteksi dalam 72 jam pertama. Fitur: cuaca 24 jam ke depan + FWI (masa panas 30 hari), lahan di sel
    titik awal, jarak kanal/jalan/desa, keberulangan (MODIS 0,1 derajat dan bekas 375 m 1-3 tahun), FRP & jumlah sel
    lintasan pertama, siang/malam, ENSO/IOD, ketinggian & kemiringan (OpenTopoData SRTM 90 m, sampel peristiwa; titik awal + 375 m ke timur + 375 m ke utara).
    Analisis: laju lolos per kelas tiap variabel (rasio terhadap kelas acuan), regresi logistik terstandar 2015-2022 dengan
    selang Wald 95%, GBDT + kepentingan permutasi (penurunan AUC) di 2023-2026, kurva ketergantungan parsial.
(b) Unit = hari kebakaran dengan sel baru (arah & jauh dari lacak.py). Cuaca = jendela 24 jam mulai 06:00 waktu setempat.
    Analisis: porsi arah menjalar (pergeseran pusat sel baru >= 750 m) dalam +-30/45 derajat bawah angin per kelas angin;
    luas baru per hari & pergeseran per kelas angin, gambut, FWI, DC, hari kering; regresi log(ha baru/hari) (OLS, selang Wald).

Pakai:  python3 scripts/sebaran/pendorong.py [elevasi]  |  ... uji
  'elevasi' dulu mengambil ketinggian (OpenTopoData, <= 1.000 panggilan/hari; cache data/raw/sebaran/elevasi.json).
"""
import json, math, multiprocessing as mp, os, random, statistics, sys, time, urllib.parse

DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, DIR)
import cuaca  # noqa: E402
import gbdt as G  # noqa: E402
import latih as L  # noqa: E402
from umum import MENTAH, PUBLIK, PROVINSI, bootstrap, jarak_m, pusat, sel, selisih_sudut, waktu  # noqa: E402

ELEV = os.path.join(MENTAH, "elevasi.json")
KELUAR = os.path.join(MENTAH, "pendorong.json")
FA = ["ws", "ws_maks", "rh_min", "t_maks", "vpd_maks", "hujan24", "hujan72", "hari_kering", "ffmc", "dmc", "dc", "bui", "isi_maks", "fwi",
      "gambut", "hutan", "produksi", "apl", "kebun", "hti", "hph", "tambang", "sanksi", "gambut_konsesi",
      "kanal_km", "jalan_km", "desa_km", "penduduk_km2", "sungai_km", "riwayat_f", "bekas", "bekas1", "tahun_sejak",
      "n0", "frp0", "malam", "oni", "dmi", "elevasi", "lereng", "sm0", "sm1", "blh", "awan", "radiasi"]
NAMA = {"ws": "angin rata-rata (km/jam)", "ws_maks": "angin maks (km/jam)", "rh_min": "RH minimum (%)", "t_maks": "suhu maks (C)",
        "hujan24": "hujan 24 jam ke depan (mm)", "hujan72": "hujan 72 jam lalu (mm)", "hari_kering": "hari tanpa hujan >= 1 mm",
        "ffmc": "FFMC", "dmc": "DMC", "dc": "DC (kekeringan dalam)", "bui": "BUI", "isi_maks": "ISI maks", "fwi": "FWI",
        "gambut": "di gambut", "hutan": "kawasan lindung/konservasi", "produksi": "kawasan hutan produksi (HP/HPT/HPK)",
        "apl": "di luar kawasan hutan (APL)", "kebun": "konsesi sawit", "hti": "konsesi HTI (kayu pulp)", "hph": "konsesi HPH (penebangan)",
        "tambang": "izin tambang (PPKH)", "sanksi": "konsesi pemegang yang sudah disanksi karhutla", "gambut_konsesi": "gambut DI DALAM konsesi",
        "vpd_maks": "defisit tekanan uap maks (kPa)", "penduduk_km2": "kepadatan penduduk (jiwa/km2, sel 0,25)", "sungai_km": "jarak ke sungai OSM (km)",
        "bekas1": "terbakar tahun lalu (375 m)", "tahun_sejak": "tahun sejak terakhir terbakar (VIIRS)",
        "sm0": "lengas tanah 0-7 cm (m3/m3)", "sm1": "lengas tanah 7-28 cm (m3/m3)", "blh": "tinggi lapisan batas maks (m)",
        "awan": "tutupan awan rata-rata (%)", "radiasi": "radiasi gelombang pendek maks (W/m2)",
        "kanal_km": "kanal (km per sel 2 km)", "jalan_km": "jarak ke jalan (km)", "desa_km": "jarak ke desa (km)",
        "riwayat_f": "tahun terbakar MODIS 2002-2025", "bekas": "bekas terbakar 1-3 th (375 m)", "n0": "sel di lintasan pertama",
        "frp0": "FRP maks lintasan pertama (MW)", "malam": "pertama terlihat malam", "oni": "ONI (El Nino +)", "dmi": "DMI (IOD +)",
        "elevasi": "ketinggian (m)", "lereng": "kemiringan (%)"}


def log(*a):
    print(time.strftime("%H:%M:%S"), *a, file=sys.stderr, flush=True)


# ---------------- ketinggian ----------------
def titik_elevasi(e):
    lo, la = e["lon0"], e["lat0"]
    dx = .375 / (111.32 * math.cos(math.radians(la)))
    return [(round(la, 4), round(lo, 4)), (round(la, 4), round(lo + dx, 4)), (round(la + .375 / 110.57, 4), round(lo, 4))]


def ambil_elevasi(evs, maks=24000):
    c = json.load(open(ELEV)) if os.path.exists(ELEV) else {}
    perlu = []
    for e in evs[:maks]:
        for t in titik_elevasi(e):
            if f"{t[0]},{t[1]}" not in c:
                perlu.append(t)
    perlu = list(dict.fromkeys(perlu))
    log(f"elevasi: {len(perlu)} titik baru")
    import urllib.request
    for a in range(0, len(perlu), 100):
        b = perlu[a:a + 100]
        u = "https://api.opentopodata.org/v1/srtm90m?locations=" + "|".join(f"{x[0]},{x[1]}" for x in b)
        for coba in range(4):
            try:
                with urllib.request.urlopen(urllib.request.Request(u, headers={"User-Agent": "poskokarhutla/1.0"}), timeout=60) as r:
                    d = json.loads(r.read())
                break
            except Exception as x:
                log("elevasi coba ulang", x)
                time.sleep(5 * (coba + 1))
        else:
            break
        for t, z in zip(b, d["results"]):
            c[f"{t[0]},{t[1]}"] = z["elevation"]
        if a % 5000 == 0:
            json.dump(c, open(ELEV, "w"))
            log(f"  elevasi {a}/{len(perlu)}")
        time.sleep(1.1)  # batas OpenTopoData: 1 panggilan/dtk, 1.000/hari, 100 titik/panggilan
    json.dump(c, open(ELEV, "w"))
    return c


# ---------------- (a) baris per peristiwa ----------------
_EL = None


def baris_lolos(e):
    global _EL
    if _EL is None:
        _EL = json.load(open(ELEV)) if os.path.exists(ELEV) else {}
    k = L.ktx()
    S = L.seri_untuk(e)
    if S is None:
        return None
    det = e["det"]
    p = det[0][0]
    if not S.cukup(p, 24):
        return None
    w = S.jendela(p)
    k0 = det[0][1]
    s = k.sel(k0, e["prov"])
    oni, dmi = k.iklim(p)
    th = int(e["t0"][:4])
    pertama = [d for d in det if d[0] == p]
    n72 = len({d[1] for d in det if d[0] <= p + 72 * 60})
    jam_lokal = ((p + e["lon0"] * 4) / 60) % 24
    z = [_EL.get(f"{a},{b}") for a, b in titik_elevasi(e)]
    if None in z:
        elev = lereng = None
    else:
        elev, lereng = z[0], 100 * math.hypot(z[1] - z[0], z[2] - z[0]) / 375
    r = {"id": e["id"], "th": th, "prov": e["prov"], "lepas": 1 if n72 >= L.LEPAS else 0, "n72": n72, "ha_akhir": e["ha"],
         "lon": e["lon0"], "lat": e["lat0"], "bulan": int(e["t0"][5:7]),
         **{x: w[x] for x in ("ws", "ws_maks", "rh_min", "t_maks", "hujan24", "hujan72", "hari_kering", "ffmc", "dmc", "dc", "bui", "isi_maks", "fwi")},
         **{x: s[x] for x in ("gambut", "hutan", "produksi", "apl", "kebun", "hti", "hph", "tambang", "kanal_km", "jalan_km", "desa_km",
                              "penduduk_km2", "riwayat_f")}, "vpd_maks": w["vpd_maks"],
         "sanksi": 1 if s["sanksi_th"] <= th else 0, "konsesi": s["konsesi"], "gambut_konsesi": s["gambut"] * s["konsesi"],
         "sungai_km": k.sungai_km(k0), "bekas": k.bekas_lalu(k0, th), "bekas1": k.riwayat_sel(k0, th)[0], "tahun_sejak": k.riwayat_sel(k0, th)[1],
         **ekstra_awal(e, p), "n0": len({d[1] for d in pertama}), "frp0": max(d[2] for d in pertama),
         "malam": 0 if 6 <= jam_lokal < 18 else 1, "oni": oni, "dmi": dmi, "elevasi": elev, "lereng": lereng}
    return r


def ekstra_awal(e, p):
    """Lengas tanah, lapisan batas, awan, radiasi 24 jam sejak deteksi pertama (sampel blok, cuaca.py ekstra)."""
    import datetime as dt
    t = waktu(p)
    d = cuaca.seri_ekstra(t.date(), e["lat0"], e["lon0"])
    if not d:
        return {x: None for x in cuaca.KOL_EKSTRA}
    i = int((t - dt.datetime.fromisoformat(d["mulai"] + "+00:00")).total_seconds() // 3600)
    ok = lambda xs: [x for x in xs[i:i + 24] if x is not None]
    v = {c: ok(d[c]) for c in cuaca.KOL_EKSTRA}
    if not v["sm0"]:
        return {x: None for x in cuaca.KOL_EKSTRA}
    return {"sm0": statistics.mean(v["sm0"]), "sm1": statistics.mean(v["sm1"]), "blh": max(v["blh"] or [0]),
            "awan": statistics.mean(v["awan"] or [0]), "radiasi": max(v["radiasi"] or [0])}


# ---------------- (b) baris per hari menjalar ----------------
def baris_arah(e):
    k = L.ktx()
    S = L.seri_untuk(e)
    if S is None or len(e["hari"]) < 2:
        return []
    out = []
    for h, baru, a, jauh, laju in e["hari"][1:]:
        if a is None or not jauh:
            continue
        m = int(h * 1440 + 360 - e["lon0"] * 4)  # 06:00 waktu setempat hari kebakaran h
        if not S.cukup(m, 24):
            continue
        w = S.jendela(m)
        gb = sum(k.sel(x, e["prov"])["gambut"] for x in baru) / len(baru)
        lama = [x for hh, bb, *_ in e["hari"] if hh < h for x in bb]
        c0, c1 = L.pusat_set(lama), L.pusat_set(baru)
        geser = jarak_m(*c0, *c1)
        s0 = k.sel(e["det"][0][1], e["prov"])
        out.append({"id": e["id"], "th": int(e["t0"][:4]), "prov": e["prov"], "arah": a, "jauh": jauh, "n_baru": len(baru), "geser": geser,
                    **{x: s0[x] for x in ("kebun", "hti", "hph", "tambang", "konsesi", "apl", "hutan", "produksi")}, "gambut0": s0["gambut"],
                    "sanksi": 1 if s0["sanksi_th"] <= int(e["t0"][:4]) else 0, "vpd_maks": w["vpd_maks"],
                    "ha_baru": len(baru) * 14.06,
                    "ws": w["ws"], "ke": w["ke"], "beda": selisih_sudut(a, w["ke"]), "ffmc": w["ffmc"], "dc": w["dc"], "fwi": w["fwi"],
                    "isi_maks": w["isi_maks"], "rh_min": w["rh_min"], "hari_kering": w["hari_kering"], "hujan24": w["hujan24"],
                    "gambut": gb, "kanal_km": k.sel(baru[0], e["prov"])["kanal_km"], "oni": k.iklim(m)[0]})
    return out


# ---------------- statistik ----------------
def kelas_laju(rs, f, batas, lbl, y="lepas"):
    out = []
    for i, nm in enumerate(lbl):
        lo = batas[i - 1] if i else -math.inf
        hi = batas[i] if i < len(batas) else math.inf
        g = [r[y] for r in rs if r.get(f) is not None and lo <= r[f] < hi]
        if g:
            out.append({"kelas": nm, "n": len(g), "laju": round(sum(g) / len(g), 4)})
    if out and out[0]["laju"]:
        for o in out:
            o["rasio"] = round(o["laju"] / out[0]["laju"], 2)
    return out


def median_kelas(rs, f, batas, lbl):
    """Per kelas: luas baru per hari (rata-rata & median ha), pergeseran pusat (m), dan porsi arah dalam +-30/45 derajat
    bawah angin dihitung hanya pada hari dengan pergeseran pusat >= 750 m (dua piksel; di bawahnya arah = derau piksel)."""
    out = []
    for i, nm in enumerate(lbl):
        lo = batas[i - 1] if i else -math.inf
        hi = batas[i] if i < len(batas) else math.inf
        g = [r for r in rs if r.get(f) is not None and lo <= r[f] < hi]
        if len(g) < 20:
            continue
        nyata = [r for r in g if r["geser"] >= 750]
        out.append({"kelas": nm, "n": len(g), "ha_rata": round(statistics.mean(r["ha_baru"] for r in g)), "ha_median": round(statistics.median(r["ha_baru"] for r in g)),
                    "geser_median_m": round(statistics.median(r["geser"] for r in g)), "geser_p90_m": round(sorted(r["geser"] for r in g)[int(.9 * len(g))]),
                    "n_geser_nyata": len(nyata),
                    "bawah_angin_30": round(sum(1 for r in nyata if r["beda"] <= 30) / len(nyata), 3) if nyata else None,
                    "bawah_angin_45": round(sum(1 for r in nyata if r["beda"] <= 45) / len(nyata), 3) if nyata else None,
                    "melawan_angin_45": round(sum(1 for r in nyata if r["beda"] >= 135) / len(nyata), 3) if nyata else None})
    for o in out:
        o["rasio_ha"] = round(o["ha_rata"] / max(1, out[0]["ha_rata"]), 2)
    return out


def rasio_ci(a, b, y="lepas", n=400, seed=3):
    """Rasio rata-rata y grup a / grup b, selang 95% bootstrap."""
    if len(a) < 20 or len(b) < 20:
        return None
    ma, mb = statistics.mean(r[y] for r in a), statistics.mean(r[y] for r in b)
    if not mb:
        return None
    rnd = random.Random(seed)
    xs = []
    for _ in range(n):
        sa = statistics.mean(a[rnd.randrange(len(a))][y] for _ in range(len(a)))
        sb = statistics.mean(b[rnd.randrange(len(b))][y] for _ in range(len(b)))
        if sb:
            xs.append(sa / sb)
    xs.sort()
    return [round(ma / mb, 2), round(xs[int(.025 * len(xs))], 2), round(xs[int(.975 * len(xs))], 2)]


BANDING = [  # (label, syarat kelompok, syarat acuan)
    ("Sawit di gambut vs di luar konsesi (semua lahan)", lambda r: r["kebun"] and r["gambut"], lambda r: not r["konsesi"]),
    ("Sawit di gambut vs gambut di luar konsesi", lambda r: r["kebun"] and r["gambut"], lambda r: r["gambut"] and not r["konsesi"]),
    ("Sawit di tanah mineral vs mineral di luar konsesi", lambda r: r["kebun"] and not r["gambut"], lambda r: not r["gambut"] and not r["konsesi"]),
    ("Konsesi sawit (semua) vs di luar konsesi", lambda r: r["kebun"], lambda r: not r["konsesi"]),
    ("HTI (kayu pulp) vs di luar konsesi", lambda r: r["hti"], lambda r: not r["konsesi"]),
    ("HTI di gambut vs gambut di luar konsesi", lambda r: r["hti"] and r["gambut"], lambda r: r["gambut"] and not r["konsesi"]),
    ("HPH (penebangan) vs di luar konsesi", lambda r: r["hph"], lambda r: not r["konsesi"]),
    ("Izin tambang vs di luar konsesi", lambda r: r["tambang"], lambda r: not r["konsesi"]),
    ("Pemegang konsesi yang sudah disanksi vs konsesi lain", lambda r: r["sanksi"], lambda r: r["konsesi"] and not r["sanksi"]),
    ("Gambut vs tanah mineral", lambda r: r["gambut"], lambda r: not r["gambut"]),
    ("Kawasan lindung/konservasi vs APL (di luar kawasan hutan)", lambda r: r["hutan"], lambda r: r["apl"]),
    ("Hutan produksi (HP/HPT/HPK) vs APL", lambda r: r["produksi"], lambda r: r["apl"]),
    ("Terbakar tahun lalu vs tidak", lambda r: r.get("bekas1"), lambda r: r.get("bekas1") == 0),
]


def banding_lahan(A, B):
    """Tabel polos: peluang membesar (A, per titik api baru) dan luas/jarak menjalar per hari (B, per hari menjalar)."""
    out = []
    for lbl, f, g in BANDING:
        a, b = [r for r in A if f(r)], [r for r in A if g(r)]
        ba = [r for r in B if f({**r, "gambut": r["gambut0"]})] if B else []
        bb = [r for r in B if g({**r, "gambut": r["gambut0"]})] if B else []
        o = {"banding": lbl, "n": len(a), "n_acuan": len(b), "lolos": round(statistics.mean(r["lepas"] for r in a), 4) if a else None,
             "lolos_acuan": round(statistics.mean(r["lepas"] for r in b), 4) if b else None, "rasio_lolos": rasio_ci(a, b),
             "n_hari": len(ba), "ha_hari": round(statistics.mean(r["ha_baru"] for r in ba)) if ba else None,
             "ha_hari_acuan": round(statistics.mean(r["ha_baru"] for r in bb)) if bb else None, "rasio_ha_hari": rasio_ci(ba, bb, "ha_baru"),
             "geser_km": round(statistics.median(r["geser"] for r in ba) / 1000, 2) if ba else None,
             "geser_km_acuan": round(statistics.median(r["geser"] for r in bb) / 1000, 2) if bb else None}
        out.append(o)
    return out


def ols(X, y):
    """-> (b, se) dengan intersep di b[0]."""
    n, m = len(X), len(X[0]) + 1
    Z = [[1.0] + list(r) for r in X]
    A = [[sum(z[a] * z[c] for z in Z) for c in range(m)] for a in range(m)]
    v = [sum(z[a] * yi for z, yi in zip(Z, y)) for a in range(m)]
    b = G.selesaikan(A, v)
    res = [yi - sum(bi * zi for bi, zi in zip(b, z)) for z, yi in zip(Z, y)]
    s2 = sum(r * r for r in res) / max(1, n - m)
    Ai = G.balik(A)
    return b, [math.sqrt(max(0, s2 * Ai[i][i])) for i in range(m)]


def standar(rs, fitur):
    mu = {f: statistics.mean(r[f] for r in rs) for f in fitur}
    sd = {f: (statistics.pstdev(r[f] for r in rs) or 1) for f in fitur}
    return mu, sd


def main(elevasi=False):
    t0 = time.time()
    evs = list(L.peristiwa(semua_kecil=True))
    log(f"{len(evs)} peristiwa")
    if elevasi:
        rnd = random.Random(4)
        sampel = rnd.sample(evs, min(24000, len(evs)))
        ambil_elevasi(sampel)
    ctx = mp.get_context("fork")
    with ctx.Pool(5) as pool:
        A = [r for r in pool.imap_unordered(baris_lolos, evs, chunksize=200) if r]
        B = [r for rs in pool.imap_unordered(baris_arah, [e for e in evs if e["sel"] >= 3], chunksize=50) for r in rs]
    log(f"lolos: {len(A)} peristiwa ({sum(r['lepas'] for r in A)} lolos); arah: {len(B)} hari-menjalar")
    H = {"dibuat": time.strftime("%Y-%m-%d"), "n_peristiwa": len(A), "n_lolos": sum(r["lepas"] for r in A),
         "laju_dasar": round(sum(r["lepas"] for r in A) / len(A), 4), "definisi_lolos": f">= {L.LEPAS} sel (~{L.LEPAS * 14} ha) dalam 72 jam"}

    # ---- (a) tabel kelas
    K = {
        "ws": ([10, 15, 20], ["< 10", "10-15", "15-20", ">= 20"]),
        "rh_min": ([40, 50, 60], ["< 40", "40-50", "50-60", ">= 60"]),
        "hari_kering": ([3, 7, 14, 21], ["0-2", "3-6", "7-13", "14-20", ">= 21"]),
        "dc": ([100, 200, 300], ["< 100", "100-200", "200-300", ">= 300"]),
        "ffmc": ([80, 85, 88, 90], ["< 80", "80-85", "85-88", "88-90", ">= 90"]),
        "fwi": ([2, 7, 14], ["rendah < 2", "sedang 2-7", "tinggi 7-14", "sangat tinggi >= 14"]),
        "hujan24": ([.1, 5, 20], ["0", "0,1-5", "5-20", ">= 20"]),
        "gambut": ([.5], ["mineral", "gambut"]), "hutan": ([.5], ["bukan", "lindung/konservasi"]),
        "produksi": ([.5], ["bukan", "HP/HPT/HPK"]), "apl": ([.5], ["kawasan hutan", "APL"]), "kebun": ([.5], ["bukan", "sawit"]),
        "hti": ([.5], ["bukan", "HTI"]), "hph": ([.5], ["bukan", "HPH"]), "tambang": ([.5], ["bukan", "tambang"]),
        "sanksi": ([.5], ["bukan", "pemegang disanksi"]), "gambut_konsesi": ([.5], ["bukan", "gambut dalam konsesi"]),
        "vpd_maks": ([1.5, 2.5, 3.5], ["< 1,5", "1,5-2,5", "2,5-3,5", ">= 3,5"]),
        "penduduk_km2": ([10, 50, 200], ["< 10", "10-50", "50-200", ">= 200"]),
        "sungai_km": ([1, 3, 6], ["< 1", "1-3", "3-6", ">= 6"]),
        "bekas1": ([.5], ["tidak", "terbakar tahun lalu"]), "tahun_sejak": ([2, 4, 8], ["1", "2-3", "4-7", ">= 8"]),
        "sm0": ([.3, .4, .5], ["< 0,30", "0,30-0,40", "0,40-0,50", ">= 0,50"]), "sm1": ([.3, .4, .5], ["< 0,30", "0,30-0,40", "0,40-0,50", ">= 0,50"]),
        "blh": ([1000, 1500, 2000], ["< 1.000", "1.000-1.500", "1.500-2.000", ">= 2.000"]),
        "awan": ([25, 50, 75], ["< 25", "25-50", "50-75", ">= 75"]), "radiasi": ([700, 850, 950], ["< 700", "700-850", "850-950", ">= 950"]),
        "kanal_km": ([.01, 1, 3], ["0", "< 1", "1-3", ">= 3"]),
        "jalan_km": ([1, 3, 10], ["< 1", "1-3", "3-10", ">= 10"]),
        "desa_km": ([1, 3, 6], ["< 1", "1-3", "3-6", ">= 6"]),
        "riwayat_f": ([1, 5, 10], ["0", "1-4", "5-9", ">= 10"]),
        "bekas": ([.5], ["belum", "pernah 1-3 th"]),
        "n0": ([2, 3, 5], ["1", "2", "3-4", ">= 5"]),
        "frp0": ([5, 10, 25, 50], ["< 5", "5-10", "10-25", "25-50", ">= 50"]),
        "malam": ([.5], ["siang", "malam"]),
        "oni": ([-.5, .5, 1.0], ["La Nina", "netral", "El Nino lemah", "El Nino >= 1"]),
        "dmi": ([-.4, .4], ["IOD -", "netral", "IOD +"]),
        "lereng": ([1, 3, 8], ["< 1%", "1-3%", "3-8%", ">= 8%"]),
        "elevasi": ([20, 100, 300], ["< 20 m", "20-100 m", "100-300 m", ">= 300 m"]),
    }
    H["kelas"] = {f: {"nama": NAMA[f], "tabel": kelas_laju(A, f, b, l)} for f, (b, l) in K.items() if f in NAMA}
    H["banding_lahan"] = banding_lahan(A, B)

    # ---- (a) regresi logistik (2015-2022), satuan SD
    fitur = [f for f in FA if all(r.get(f) is not None for r in A[:2000])]
    ada = [r for r in A if all(r.get(f) is not None for f in fitur)]
    trn = [r for r in ada if r["th"] <= 2022]
    tes = [r for r in ada if r["th"] > 2022]
    mu, sd = standar(trn, fitur)
    tr_s = random.Random(1).sample(trn, min(60000, len(trn)))
    X = [[(r[f] - mu[f]) / sd[f] for f in fitur] for r in tr_s]
    y = [r["lepas"] for r in tr_s]
    m = G.latih_lr(X, y, [1.0] * len(X), l2=1.0)
    Hi = G.balik(m["H"])
    lr = []
    for j, f in enumerate(fitur):
        b, se = m["b"][j + 1], math.sqrt(max(0, Hi[j + 1][j + 1]))
        lr.append({"fitur": f, "nama": NAMA[f], "or_per_sd": round(math.exp(b), 3), "ci": [round(math.exp(b - 1.96 * se), 3), round(math.exp(b + 1.96 * se), 3)],
                   "sd": round(sd[f], 3)})
    lr.sort(key=lambda r: -abs(math.log(r["or_per_sd"])))
    Xt = [[(r[f] - mu[f]) / sd[f] for f in fitur] for r in tes]
    yt = [r["lepas"] for r in tes]
    H["logistik"] = {"fitur": lr, "n_latih": len(tr_s), "auc_uji": round(G.auc([G.prediksi_lr(m, x) for x in Xt], yt), 4), "n_uji": len(tes)}
    log("logistik AUC uji", H["logistik"]["auc_uji"])

    # ---- (a) GBDT + kepentingan permutasi + ketergantungan parsial (dengan elevasi bila ada)
    fitur_g = [f for f in FA if sum(1 for r in A if r.get(f) is not None) > .5 * len(A)]
    pakai = lambda r: [(-999 if r.get(f) is None else r[f]) for f in fitur_g]
    trg = random.Random(2).sample([r for r in A if r["th"] <= 2022], min(60000, sum(1 for r in A if r["th"] <= 2022)))
    teg = [r for r in A if r["th"] > 2022]
    g = G.latih_gbdt([pakai(r) for r in trg], [r["lepas"] for r in trg], [1.0] * len(trg), pohon=150, dalam=4, lr=.08)
    Xg = [pakai(r) for r in teg]
    yg = [r["lepas"] for r in teg]
    base = G.auc([G.prediksi_gbdt(g, x) for x in Xg], yg)
    rnd = random.Random(5)
    imp = []
    for j, f in enumerate(fitur_g):
        col = [x[j] for x in Xg]
        rnd.shuffle(col)
        Xp = [x[:j] + [c] + x[j + 1:] for x, c in zip(Xg, col)]
        imp.append({"fitur": f, "nama": NAMA[f], "turun_auc": round(base - G.auc([G.prediksi_gbdt(g, x) for x in Xp], yg), 4)})
    imp.sort(key=lambda r: -r["turun_auc"])
    H["gbdt"] = {"auc_uji": round(base, 4), "n_uji": len(teg), "permutasi": imp, "fitur": fitur_g}
    pd = {}
    sampel = rnd.sample(Xg, min(3000, len(Xg)))
    for it in imp[:8]:
        j = fitur_g.index(it["fitur"])
        v = sorted(x[j] for x in Xg if x[j] != -999)
        grid = sorted({v[int(q * (len(v) - 1))] for q in (0, .05, .1, .2, .3, .4, .5, .6, .7, .8, .9, .95, 1)})
        pd[it["fitur"]] = [[round(a, 3), round(statistics.mean(G.prediksi_gbdt(g, x[:j] + [a] + x[j + 1:]) for x in sampel), 4)] for a in grid]
    H["ketergantungan_parsial"] = pd
    log("GBDT lolos AUC uji", base)

    # ---- (b) arah & jarak
    Hb = {"n": len(B), "peluang_acak_30": round(60 / 360, 3), "peluang_acak_45": round(90 / 360, 3)}
    ny = [r for r in B if r["geser"] >= 750]
    Hb["semua"] = {"n_geser_nyata": len(ny), "bawah_angin_30": round(sum(1 for r in ny if r["beda"] <= 30) / len(ny), 3),
                   "bawah_angin_45": round(sum(1 for r in ny if r["beda"] <= 45) / len(ny), 3), "beda_median": round(statistics.median(r["beda"] for r in ny)),
                   "ha_median": round(statistics.median(r["ha_baru"] for r in B)), "geser_median_m": round(statistics.median(r["geser"] for r in B))}
    # bergeser jauh (>= 2 km) dan angin >= 10 km/jam: kasus paling 'bersih'
    kuat = [r for r in B if r["geser"] >= 2000 and r["ws"] >= 10]
    Hb["bersih"] = {"n": len(kuat), "bawah_angin_30": round(sum(1 for r in kuat if r["beda"] <= 30) / max(1, len(kuat)), 3),
                    "bawah_angin_45": round(sum(1 for r in kuat if r["beda"] <= 45) / max(1, len(kuat)), 3),
                    "bawah_angin_90": round(sum(1 for r in kuat if r["beda"] <= 90) / max(1, len(kuat)), 3)}
    Hb["histogram_beda"] = [sum(1 for r in ny if b <= r["beda"] < b + 15) for b in range(0, 180, 15)]
    Hb["angin"] = median_kelas(B, "ws", [5, 10, 15, 20], ["< 5", "5-10", "10-15", "15-20", ">= 20"])
    Hb["gambut"] = median_kelas(B, "gambut", [.5], ["mineral", "gambut"])
    Hb["fwi"] = median_kelas(B, "fwi", [7, 14, 25], ["< 7", "7-14", "14-25", ">= 25"])
    Hb["dc"] = median_kelas(B, "dc", [200, 300, 400], ["< 200", "200-300", "300-400", ">= 400"])
    Hb["hari_kering"] = median_kelas(B, "hari_kering", [3, 7, 14], ["0-2", "3-6", "7-13", ">= 14"])
    Hb["rh_min"] = median_kelas(B, "rh_min", [40, 50, 60], ["< 40", "40-50", "50-60", ">= 60"])
    Hb["kanal"] = median_kelas(B, "kanal_km", [.01, 1], ["tanpa kanal", "< 1 km", ">= 1 km"])
    Hb["oni"] = median_kelas(B, "oni", [.5, 1.0], ["bukan El Nino", "El Nino lemah", "El Nino >= 1"])
    fb = ["ws", "rh_min", "ffmc", "dc", "hari_kering", "hujan24", "gambut", "kanal_km", "oni"]
    mu, sd = standar(B, fb)
    b, se = ols([[(r[f] - mu[f]) / sd[f] for f in fb] for r in B], [math.log(r["ha_baru"]) for r in B])
    Hb["ols_log_ha_harian"] = [{"fitur": f, "kali_per_sd": round(math.exp(b[i + 1]), 3), "ci": [round(math.exp(b[i + 1] - 1.96 * se[i + 1]), 3), round(math.exp(b[i + 1] + 1.96 * se[i + 1]), 3)],
                           "sd": round(sd[f], 3)} for i, f in enumerate(fb)]
    H["arah"] = Hb
    H["waktu_menit"] = round((time.time() - t0) / 60, 1)
    json.dump(H, open(KELUAR, "w"), ensure_ascii=False, indent=1)
    # contoh bagi cerita: kurva & tabel ringkas
    json.dump(H, open(os.path.join(PUBLIK, "sebaran_pendorong.json"), "w"), ensure_ascii=False, separators=(",", ":"))
    log("selesai")


def panjang():
    """Lahan saja, rekaman terpanjang: semua peristiwa S-NPP 2012-2026, 9 provinsi, semua bulan (tanpa cuaca).
    -> data/raw/sebaran/pendorong_panjang.json (digabung ke sebaran_pendorong.json sebagai 'banding_lahan_panjang')."""
    from umum import Lahan
    lh, A = Lahan(), []
    for l in open(os.path.join(MENTAH, "peristiwa_panjang.jsonl")):
        e = json.loads(l)
        if e["prov"] not in L.PRIORITAS:
            continue
        p0 = e["det"][0][0]
        k0 = e["det"][0][1]
        s = lh(k0, e["prov"])
        th = int(e["t0"][:4])
        n72 = len({d[1] for d in e["det"] if d[0] <= p0 + 72 * 60})
        A.append({"th": th, "lepas": 1 if n72 >= L.LEPAS else 0, **{x: s[x] for x in ("gambut", "hutan", "produksi", "apl", "kebun", "hti", "hph", "tambang", "konsesi")},
                  "sanksi": 1 if s["sanksi_th"] <= th else 0, "bulan": int(e["t0"][5:7])})
    out = {"n": len(A), "tahun": [min(r["th"] for r in A), max(r["th"] for r in A)], "laju_dasar": round(statistics.mean(r["lepas"] for r in A), 4),
           "banding": [b for b in banding_lahan(A, []) if b["rasio_lolos"]],
           "per_tahun_gambut": {th: [round(statistics.mean([r["lepas"] for r in A if r["th"] == th and r["gambut"]] or [0]), 4),
                                     round(statistics.mean([r["lepas"] for r in A if r["th"] == th and not r["gambut"]] or [0]), 4)] for th in sorted({r["th"] for r in A})}}
    json.dump(out, open(os.path.join(MENTAH, "pendorong_panjang.json"), "w"), ensure_ascii=False, indent=1)
    P = os.path.join(PUBLIK, "sebaran_pendorong.json")
    if os.path.exists(P):
        H = json.load(open(P))
        H["banding_lahan_panjang"] = out
        json.dump(H, open(P, "w"), ensure_ascii=False, separators=(",", ":"))
    log(f"panjang: {len(A)} peristiwa {out['tahun']}")


if __name__ == "__main__":
    if sys.argv[1:] == ["uji"]:
        rs = [{"x": i, "lepas": 1 if i >= 5 else 0} for i in range(10)]
        t = kelas_laju(rs, "x", [5], ["rendah", "tinggi"])
        assert t[0]["laju"] == 0 and t[1]["laju"] == 1
        b, se = ols([[i] for i in range(50)], [2 * i + 1 for i in range(50)])
        assert abs(b[0] - 1) < 1e-6 and abs(b[1] - 2) < 1e-6 and se[1] < 1e-6
        print("ok")
    elif sys.argv[1:] == ["panjang"]:
        panjang()
    else:
        main(elevasi="elevasi" in sys.argv[1:])
