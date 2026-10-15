"""Uji balik PFVI (scripts/data/pfvi.py) vs FWI di sel gambut 0,5 derajat -> data/raw/pfvi/*.json, angka di RISET-PFVI.md

Sel = sel kisi fwi.json yang >= 30% titik 0,05 derajatnya di poligon gambut (lahan/gambut.geojson), provinsi Sumatra &
Kalimantan prioritas. Cuaca ERA5 (Open-Meteo archive) per jam 1 Mei - 31 Okt, sama dengan harian.cuaca_fwi: jam 12 lokal +
hujan 24 jam; PFVI memakai suhu maks harian, hujan harian, ET0 FAO harian.
Api = deteksi VIIRS S-NPP (arsip negara FIRMS, keyakinan n/h, type 0) yang jatuh di poligon gambut sel itu.

  python3 scripts/sebaran/pfvi_balik.py sel
  python3 scripts/sebaran/pfvi_balik.py cuaca 2015 2018 2019 2023 2024 2025
  python3 -I scripts/sebaran/pfvi_balik.py api <direktori viirs_YYYY.csv>     (unduhan = data tak tepercaya, -I)
  python3 -I scripts/sebaran/pfvi_balik.py zenodo <berkas csv Zenodo 17907349>
  python3 scripts/sebaran/pfvi_balik.py balik | eskalasi
"""
import csv, datetime as dt, glob, json, math, os, sys, time, urllib.parse

DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, DIR)
sys.path.insert(1, os.path.join(DIR, "..", "data"))
import fwi as F  # noqa: E402
import pfvi as P  # noqa: E402
from umum import AKAR, PUBLIK, Poligon  # noqa: E402

OUT = os.path.join(AKAR, "data/raw/pfvi")
URL = "https://archive-api.open-meteo.com/v1/archive"
VAR = ["temperature_2m", "relative_humidity_2m", "wind_speed_10m", "precipitation", "et0_fao_evapotranspiration"]
MULAI, AKHIR = "05-01", "10-31"
PROV = {"14", "15", "16", "61", "62", "63", "64"}
LATIH, UJI = (2015, 2018), (2019, 2023)


def log(*a):
    print(time.strftime("%H:%M:%S"), *a, file=sys.stderr, flush=True)


def gambut():
    return Poligon(os.path.join(PUBLIK, "lahan/gambut.geojson"))


def sel():
    gb = gambut()
    out = []
    for c in json.load(open(os.path.join(PUBLIK, "fwi.json")))["grid"]:
        if c["prov"] not in PROV:
            continue
        n = sum(1 for i in range(10) for j in range(10) if gb.cari(c["lon"] - .225 + i * .05, c["lat"] - .225 + j * .05))
        if n >= 30:
            out.append({"lat": c["lat"], "lon": c["lon"], "prov": c["prov"], "gambut": n / 100})
    json.dump(out, open(os.path.join(OUT, "sel.json"), "w"))
    log(f"{len(out)} sel gambut")


def nama(th, c):
    return os.path.join(OUT, "cuaca", f"{th}_{c['lat']:.2f}_{c['lon']:.2f}.json")


def cuaca(tahun):
    import importlib.util
    sp = importlib.util.spec_from_file_location("banjir_umum", os.path.join(DIR, "..", "banjir", "umum.py"))
    B = importlib.util.module_from_spec(sp)
    sp.loader.exec_module(B)
    KuotaHabis, ambil, per_lokasi = B.KuotaHabis, B.ambil, B.per_lokasi
    S = json.load(open(os.path.join(OUT, "sel.json")))
    os.makedirs(os.path.join(OUT, "cuaca"), exist_ok=True)
    hari = (dt.date(2001, 10, 31) - dt.date(2001, 5, 1)).days + 1
    bobot = max(1, len(VAR) / 10) * max(1, hari / 14)
    for th in tahun:
        sisa = [c for c in S if not os.path.exists(nama(th, c))]
        for a in range(0, len(sisa), 8):
            b = sisa[a:a + 8]
            q = {"latitude": ",".join(str(c["lat"]) for c in b), "longitude": ",".join(str(c["lon"]) for c in b),
                 "start_date": f"{th}-{MULAI}", "end_date": f"{th}-{AKHIR}", "hourly": ",".join(VAR), "timezone": "auto"}
            try:
                for c, d in zip(b, per_lokasi(ambil(URL + "?" + urllib.parse.urlencode(q), batas_waktu=240))):
                    json.dump({"utc_offset": d["utc_offset_seconds"], **d["hourly"]}, open(nama(th, c), "w"), separators=(",", ":"))
            except KuotaHabis as e:
                log("kuota habis, lanjutkan nanti:", e)
                return
            log(f"{th} {a + len(b)}/{len(sisa)}")
            time.sleep(len(b) * bobot / 9)  # ~540 bobot/menit; batas jam 5.000 -> ambil() menunggu 429 per menit


def harian(th, c):
    """-> [(tgl, t12, rh12, ws12, hujan24, tmaks, hujan_hari, et0_hari)] dari berkas cuaca per jam (waktu lokal)."""
    d = json.load(open(nama(th, c)))
    t = d["time"]
    out = []
    for i in range(23, len(t), 24):
        if not t[i].endswith("T23:00"):
            continue
        hari = t[i][:10]
        j = i - 11  # jam 12 lokal
        r24 = d["precipitation"][j - 23:j + 1]
        blok = slice(i - 23, i + 1)
        if j < 23 or None in r24 or None in d["temperature_2m"][blok]:
            out.append((hari, None, None, None, None, None, None, None))
            continue
        out.append((hari, d["temperature_2m"][j], d["relative_humidity_2m"][j], d["wind_speed_10m"][j], sum(r24),
                    max(d["temperature_2m"][blok]), sum(d["precipitation"][blok]), sum(x or 0 for x in d["et0_fao_evapotranspiration"][blok])))
    return out


def api(direktori):
    """VIIRS tahunan -> {th: {"lat,lon": {tgl_lokal: [n_gambut, frp_gambut]}}} untuk sel di sel.json."""
    gb = gambut()
    S = {(c["lat"], c["lon"]) for c in json.load(open(os.path.join(OUT, "sel.json")))}
    cache, out = {}, {}
    for f in sorted(glob.glob(os.path.join(direktori, "viirs_*.csv"))):
        th = f[-8:-4]
        per = out.setdefault(th, {})
        for r in csv.DictReader(open(f)):
            if r["confidence"] not in ("n", "h") or r.get("type", "0") != "0":
                continue
            la, lo = float(r["latitude"]), float(r["longitude"])
            k = (math.floor(la / .5) * .5 + .25, math.floor(lo / .5) * .5 + .25)
            if k not in S:
                continue
            kk = (round(la, 2), round(lo, 2))
            if kk not in cache:
                cache[kk] = bool(gb.cari(lo, la))
            if not cache[kk]:
                continue
            w = dt.datetime.fromisoformat(r["acq_date"]) + dt.timedelta(hours=int(r["acq_time"][:2]) + 7, minutes=int(r["acq_time"][2:]))
            x = per.setdefault(f"{k[0]},{k[1]}", {}).setdefault(w.date().isoformat(), [0, 0.0])
            x[0] += 1
            x[1] += float(r["frp"] or 0)
        log(th, sum(len(v) for v in per.values()), "sel-hari berapi")
    json.dump(out, open(os.path.join(OUT, "api.json"), "w"))


def _logit1(s, n, k, iterasi=30):
    """Regresi logistik 1 peubah pada data berkelompok: s[i] nilai, n[i] jumlah, k[i] api. -> (b0, b1, loglik)."""
    b0 = b1 = 0.0
    for _ in range(iterasi):
        g0 = g1 = h00 = h01 = h11 = 0.0
        for x, m, y in zip(s, n, k):
            p = 1 / (1 + math.exp(-(b0 + b1 * x)))
            g0 += y - m * p
            g1 += (y - m * p) * x
            w = m * p * (1 - p)
            h00 += w; h01 += w * x; h11 += w * x * x
        det = h00 * h11 - h01 * h01 + 1e-12
        b0 += (h11 * g0 - h01 * g1) / det
        b1 += (h00 * g1 - h01 * g0) / det
    ll = 0.0
    for x, m, y in zip(s, n, k):
        p = min(max(1 / (1 + math.exp(-(b0 + b1 * x))), 1e-12), 1 - 1e-12)
        ll += y * math.log(p) + (m - y) * math.log(1 - p)
    return b0, b1, ll


# Batas fisik gambut tropis (van Genuchten: n 1,1-3; alpha = skala hisap 10-150 cm). Tanpa batas, Zenodo mendorong ke
# tangga tajam (n 12, alpha 400 cm = di batas kotak): datanya punya lompatan di ~100 cm yang tercampur letak stasiun.
BATAS_VG = [(1.1, 3.0), (10.0, 150.0)]


def kering_vg(h, n, alpha):
    """1 - theta(h): bagian 'kering' kurva van Genuchten, 0 (jenuh) .. 1. Bentuk WTF di pfvi.py."""
    return 1 - (1 + (h / alpha) ** n) ** (-(1 - 1 / n))


def zenodo(jalur):
    """Bentuk (n, alpha) dari kejadian api vs muka air di dataset Zenodo 17907349. Validasi blok spasial 1 derajat."""
    from gbdt import auc
    rows = []
    for r in csv.DictReader(open(jalur)):
        wt = float(r["Water Table Height"])  # meter, negatif = di bawah permukaan
        rows.append((max(0.0, -wt * 100), int(r["Fire Occurance"]), math.floor(float(r["Longitude"])), math.floor(float(r["Latitude"]))))
    def kelompok(rs):
        g = {}
        for h, y, _, _ in rs:
            a = g.setdefault(round(h, 2), [0, 0]); a[0] += 1; a[1] += y
        hs = sorted(g)
        return hs, [g[h][0] for h in hs], [g[h][1] for h in hs]
    def pas(rs):
        hs, n, k = kelompok(rs)
        rugi = lambda p: -_logit1([kering_vg(h, p[0], p[1]) for h in hs], n, k, 15)[2]
        return P.kalibrasi(rugi, BATAS_VG, awal=8, iterasi=150)
    (nn, al), nll = pas(rows)
    hs, n, k = kelompok(rows)
    b0, b1, _ = _logit1([kering_vg(h, nn, al) for h in hs], n, k)
    y = [r[1] for r in rows]
    blok = sorted({(r[2], r[3]) for r in rows})
    # blok spasial: model dilatih tanpa blok itu; AUC & LL luar-blok. Pembanding: ambang 60 cm (Taufik dkk.) dan laju dasar.
    pb, yb = [], []
    for b in blok:
        latih = [r for r in rows if (r[2], r[3]) != b]
        uji = [r for r in rows if (r[2], r[3]) == b]
        hs_, n_, k_ = kelompok(latih)
        (n1, a1), _ = P.kalibrasi(lambda p: -_logit1([kering_vg(h, p[0], p[1]) for h in hs_], n_, k_, 15)[2], BATAS_VG, awal=3, iterasi=100)
        c0, c1, _ = _logit1([kering_vg(h, n1, a1) for h in hs_], n_, k_)
        pb += [1 / (1 + math.exp(-(c0 + c1 * kering_vg(r[0], n1, a1)))) for r in uji]
        yb += [r[1] for r in uji]
    dasar = sum(y) / len(y)
    ll = lambda p, y: sum(math.log(min(max(q if t else 1 - q, 1e-12), 1)) for q, t in zip(p, y)) / len(y)
    tabel = []
    for a, b in ((0, 20), (20, 40), (40, 60), (60, 80), (80, 100), (100, 150), (150, 300)):
        s = [r[1] for r in rows if a <= r[0] < b]
        tabel.append({"h_cm": f"{a}-{b}", "n": len(s), "laju_api": round(sum(s) / len(s), 3) if s else None})
    hasil = {"n": len(rows), "api": sum(y), "n_param": round(nn, 3), "alpha_cm": round(al, 1), "b0": round(b0, 3), "b1": round(b1, 3),
             "auc_semua": round(auc([kering_vg(r[0], nn, al) for r in rows], y), 3),
             "auc_luar_blok": round(auc(pb, yb), 3), "ll_luar_blok": round(ll(pb, yb), 4), "ll_dasar": round(ll([dasar] * len(y), y), 4),
             "auc_ambang60": round(auc([1.0 if r[0] >= 60 else 0.0 for r in rows], y), 3),
             "laju_h_ge60": round(sum(r[1] for r in rows if r[0] >= 60) / sum(1 for r in rows if r[0] >= 60), 3),
             "laju_h_lt60": round(sum(r[1] for r in rows if r[0] < 60) / sum(1 for r in rows if r[0] < 60), 3),
             "blok": len(blok), "per_kedalaman": tabel}
    json.dump(hasil, open(os.path.join(OUT, "zenodo.json"), "w"), indent=1)
    log(json.dumps(hasil))


# ---------------- uji balik ----------------
def muat(tahun):
    """-> {(th, lat, lon): dict deret harian: tgl, fwi, ffmc, dmc, dc, isi, bui, hujan24, tmaks, hujan, et0, n, frp, gambut}"""
    S = json.load(open(os.path.join(OUT, "sel.json")))
    A = json.load(open(os.path.join(OUT, "api.json")))
    D = {}
    for th in tahun:
        for c in S:
            if not os.path.exists(nama(th, c)):
                continue
            h = harian(th, c)
            kode = F.deret([x[1:5] for x in h])
            ap = A.get(str(th), {}).get(f"{c['lat']},{c['lon']}", {})
            t_last = 30.0
            d = {k: [] for k in ("tgl", "fwi", "ffmc", "dmc", "dc", "isi", "bui", "hujan24", "tmaks", "hujan", "et0", "n", "frp")}
            for x, k in zip(h, kode):
                t_last = x[5] if x[5] is not None else t_last
                for nm, v in (("tgl", x[0]), ("hujan24", x[4] or 0), ("tmaks", t_last), ("hujan", x[6] or 0), ("et0", x[7] or 0),
                              ("n", ap.get(x[0], [0, 0])[0]), ("frp", ap.get(x[0], [0, 0])[1])):
                    d[nm].append(v)
                for nm in ("fwi", "ffmc", "dmc", "dc", "isi", "bui"):
                    d[nm].append(k[nm])
            d["gambut"] = c["gambut"]
            D[(th, c["lat"], c["lon"])] = d
    return D


def jalankan_pfvi(d, par, wt_par):
    wt = P.muka_air_proxy(d["hujan"], d["et0"], wt_par, wt0=0.0)
    return wt, P.deret(wt, d["hujan"], d["tmaks"], par, x0=0.0)


def baris_hari(D, bulan=("08", "09", "10")):
    """Indeks (seri, hari t) untuk ramalan hari t -> api hari t+1."""
    return [(k, t) for k, d in D.items() for t in range(len(d["tgl"]) - 1) if d["tgl"][t][5:7] in bulan]


def rugi_pfvi(D, idx, vg):
    """-loglik regresi logistik 1 peubah (api besok ~ PFVI hari ini) di data latih, untuk menyetel aH, bH, Sy, k, bocor."""
    def f(p):
        aH, bH, sy, k, bocor = p
        cache = {key: jalankan_pfvi(d, (aH, bH, *vg), (sy, k, bocor))[1] for key, d in D.items()}
        g = {}
        for key, t in idx:
            a = g.setdefault(round(cache[key][t]), [0, 0]); a[0] += 1; a[1] += D[key]["n"][t + 1] > 0
        xs = sorted(g)
        return -_logit1([x / 100 for x in xs], [g[x][0] for x in xs], [g[x][1] for x in xs], 12)[2] / len(idx)
    return f


def metrik(skor, y, tanda):
    from gbdt import auc
    tp = sum(1 for a, b in zip(tanda, y) if a and b)
    nt = sum(tanda)
    return {"auc": round(auc(skor, y), 3), "recall": round(tp / max(sum(y), 1), 3), "presisi": round(tp / nt, 3) if nt else None,
            "porsi_tanda": round(nt / len(y), 3)}


def recall_anggaran(skor, y, porsi):
    """Recall bila hanya `porsi` sel-hari teratas yang ditandai (anggaran alarm sama untuk semua varian)."""
    o = sorted(range(len(skor)), key=lambda i: -skor[i])[:max(1, round(porsi * len(skor)))]
    tp = sum(y[i] for i in o)
    return {"recall": round(tp / max(sum(y), 1), 3), "presisi": round(tp / len(o), 3)}


def balik():
    from gbdt import latih_lr, prediksi_lr
    Z = json.load(open(os.path.join(OUT, "zenodo.json")))
    vg = (Z["n_param"], Z["alpha_cm"])
    DL, DU = muat(LATIH), muat(UJI)
    il, iu = baris_hari(DL), baris_hari(DU)
    log(f"latih {len(DL)} seri {len(il)} sel-hari; uji {len(DU)} seri {len(iu)} sel-hari")
    t0 = time.time()
    batas = [(-5.0, 10.0), (0.0, 0.1), (0.05, 0.4), (0.5, 1.5), (0.0, 1.0)]
    p, v = P.kalibrasi(rugi_pfvi(DL, il, vg), batas, awal=5, iterasi=120)
    log(f"kalibrasi {[round(x, 4) for x in p]} rugi {v:.4f} ({time.time() - t0:.0f} dtk)")
    par, wt_par = (p[0], p[1], *vg), tuple(p[2:])
    # sensitivitas bentuk: kurva 60 cm ala Taufik (n 2, alpha 60) dengan setelan lain sama
    v60 = rugi_pfvi(DL, il, (2.0, 60.0))(p)
    # nol-WT: PFVI tanpa faktor muka air (aH = bH = 0) = KBDI murni, untuk melihat sumbangan faktor muka air
    v0 = rugi_pfvi(DL, il, vg)((0.0, 0.0, *p[2:]))

    def tabel(D, idx):
        S = {k: jalankan_pfvi(d, par, wt_par) for k, d in D.items()}
        fw = [D[k]["fwi"][t] for k, t in idx]
        pf = [S[k][1][t] for k, t in idx]
        wt = [S[k][0][t] for k, t in idx]
        y1 = [1 if D[k]["n"][t + 1] > 0 else 0 for k, t in idx]
        y20 = [1 if D[k]["n"][t + 1] >= 20 else 0 for k, t in idx]
        return fw, pf, wt, y1, y20, S

    fwL, pfL, _, y1L, _, _ = tabel(DL, il)
    X = lambda fw, pf: [[math.log1p(a), b / 100] for a, b in zip(fw, pf)]
    lr = latih_lr(X(fwL, pfL), y1L, [1.0] * len(y1L))
    fwU, pfU, wtU, y1U, y20U, SU = tabel(DU, iu)
    gab = [prediksi_lr(lr, x) for x in X(fwU, pfU)]
    # ambang gabungan: peluang di mana porsi tanda di data LATIH = porsi FWI >= 7 di data latih (anggaran alarm sama)
    pl = sorted((prediksi_lr(lr, x) for x in X(fwL, pfL)), reverse=True)
    amb = pl[max(0, round(sum(1 for a in fwL if a >= 7) / len(fwL) * len(pl)) - 1)]
    H = {"param": {"aH": round(p[0], 4), "bH": round(p[1], 5), "n": vg[0], "alpha_cm": vg[1], "Sy": round(p[2], 3), "k_et": round(p[3], 3),
                   "bocor_cm_hari": round(p[4], 3), "rugi_latih": round(v, 5), "rugi_kurva60": round(v60, 5), "rugi_tanpa_wt": round(v0, 5)},
         "lr_gabungan": lr, "ambang_gabungan": round(amb, 4), "n_uji": len(iu), "api_besok": sum(y1U), "api20_besok": sum(y20U)}
    for nm, y in (("api", y1U), ("api20", y20U)):
        porsi = sum(1 for a in fwU if a >= 7) / len(fwU)
        H[nm] = {
            "FWI>=7": metrik(fwU, y, [a >= 7 for a in fwU]), "FWI>=14": metrik(fwU, y, [a >= 14 for a in fwU]),
            "PFVI>150": metrik(pfU, y, [b > 150 for b in pfU]), "PFVI>225": metrik(pfU, y, [b > 225 for b in pfU]),
            "FWI>=7&PFVI>150": metrik(gab, y, [a >= 7 and b > 150 for a, b in zip(fwU, pfU)]),
            "gabungan_LR": metrik(gab, y, [g >= amb for g in gab]),
            "muka_air_proxy": metrik([-w for w in wtU], y, [w < -60 for w in wtU]),
            "anggaran_sama_FWI7": {"porsi": round(porsi, 3), "FWI": recall_anggaran(fwU, y, porsi), "PFVI": recall_anggaran(pfU, y, porsi),
                                   "gabungan": recall_anggaran(gab, y, porsi)}}
        for th in UJI:
            ii = [i for i, (k, t) in enumerate(iu) if k[0] == th]
            yy = [y[i] for i in ii]
            H[nm][f"auc_{th}"] = {v_: metrik([s[i] for i in ii], yy, [False] * len(ii))["auc"] for v_, s in (("FWI", fwU), ("PFVI", pfU), ("gabungan", gab))}
    # kewajaran proxy: muka air proxy sel Kalimantan, 30 Sep 2019 vs sebaran Zenodo
    kal = sorted(SU[k][0][DU[k]["tgl"].index("2019-09-30")] for k in DU if k[0] == 2019 and k[2] > 108)
    H["proxy_kal_2019_09_30_cm"] = {"p10": round(kal[len(kal) // 10]), "med": round(kal[len(kal) // 2]), "p90": round(kal[9 * len(kal) // 10])}
    json.dump(H, open(os.path.join(OUT, "balik.json"), "w"), indent=1)
    log(json.dumps({k: v for k, v in H.items() if k != "lr_gabungan"}, indent=1))


def eskalasi(pakai_pfvi_par=True):
    """Sel-hari gambut yang SUDAH berapi (1-19 deteksi) -> membesar = puncak deteksi harian +1..+3 hari >= 20.
    GBDT (gbdt.py) dengan fitur cuaca FWI + ukuran api, dengan/tanpa PFVI & muka air proxy. Latih 2015/2018/2019/2023,
    uji 2024-2025. Selisih AUC dengan bootstrap berpasangan per seri sel-tahun."""
    import random
    from gbdt import auc, latih_gbdt, prediksi_gbdt
    H = json.load(open(os.path.join(OUT, "balik.json")))
    q = H["param"]
    par, wt_par = (q["aH"], q["bH"], q["n"], q["alpha_cm"]), (q["Sy"], q["k_et"], q["bocor_cm_hari"])
    def baris(tahun):
        D = muat(tahun)
        R = []
        for k, d in D.items():
            wt, pf = jalankan_pfvi(d, par, wt_par)
            for t in range(7, len(d["tgl"]) - 3):
                n = d["n"][t]
                if not 1 <= n < 20 or d["tgl"][t][5:7] not in ("06", "07", "08", "09", "10"):
                    continue
                y = 1 if max(d["n"][t + 1:t + 4]) >= 20 else 0
                dasar = [d["fwi"][t], d["ffmc"][t], d["dmc"][t], d["dc"][t], d["isi"][t], d["bui"][t], d["hujan24"][t],
                         math.log1p(n), math.log1p(d["frp"][t]), math.log1p(sum(d["n"][t - 7:t])), d["gambut"]]
                R.append((k, dasar, [pf[t], wt[t]], y))
        return R
    RL, RU = baris((2015, 2018, 2019, 2023)), baris((2024, 2025))
    log(f"eskalasi: latih {len(RL)} ({sum(r[3] for r in RL)} membesar), uji {len(RU)} ({sum(r[3] for r in RU)} membesar)")
    out = {"n_latih": len(RL), "pos_latih": sum(r[3] for r in RL), "n_uji": len(RU), "pos_uji": sum(r[3] for r in RU)}
    P_ = {}
    for nm, f in (("dasar", lambda r: r[1]), ("dasar+pfvi", lambda r: r[1] + r[2])):
        m = latih_gbdt([f(r) for r in RL], [r[3] for r in RL], [1.0] * len(RL), pohon=150, dalam=3, lr=.05, min_h=5.0)
        P_[nm] = [prediksi_gbdt(m, f(r)) for r in RU]
        out[nm] = round(auc(P_[nm], [r[3] for r in RU]), 3)
    # PFVI sendiri (tanpa ukuran api) sebagai pembanding mentah
    out["pfvi_saja"] = round(auc([r[2][0] for r in RU], [r[3] for r in RU]), 3)
    out["fwi_saja"] = round(auc([r[1][0] for r in RU], [r[3] for r in RU]), 3)
    kel = {}
    for i, r in enumerate(RU):
        kel.setdefault(r[0], []).append(i)
    ks, rnd, sel_ = list(kel), random.Random(1), []
    for _ in range(300):
        ii = [i for k in (rnd.choice(ks) for _ in ks) for i in kel[k]]
        y = [RU[i][3] for i in ii]
        a, b = auc([P_["dasar"][i] for i in ii], y), auc([P_["dasar+pfvi"][i] for i in ii], y)
        if a is not None and b is not None:
            sel_.append(b - a)
    sel_.sort()
    out["d_auc"] = round(out["dasar+pfvi"] - out["dasar"], 3)
    out["d_auc_ci95"] = [round(sel_[int(.025 * len(sel_))], 3), round(sel_[int(.975 * len(sel_)) - 1], 3)]
    H["eskalasi"] = out
    json.dump(H, open(os.path.join(OUT, "balik.json"), "w"), indent=1)
    log(json.dumps(out))


if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    perintah = sys.argv[1]
    if perintah == "sel":
        sel()
    elif perintah == "cuaca":
        cuaca([int(x) for x in sys.argv[2:]])
    elif perintah == "api":
        api(sys.argv[2])
    elif perintah == "balik":
        balik()
    elif perintah == "eskalasi":
        eskalasi()
    elif perintah == "zenodo":
        zenodo(sys.argv[2])
