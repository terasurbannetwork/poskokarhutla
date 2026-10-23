"""Peluang api 7 hari per sel 0,05 derajat (docs/riset/RISIKO-MINGGUAN.md, didaftarkan d8ae2180 SEBELUM dibangun).

Langkah (tiap langkah menyimpan cache di data/raw/risiko/, aman diulang):
  python3 scripts/sebaran/risiko_mingguan.py api        # FIRMS -> api.npz (hitungan per sel-hari WIB per sensor) + setara.json
  python3 scripts/sebaran/risiko_mingguan.py lahan      # lahan & wilayah per sel -> lahan.npz
  python3 scripts/sebaran/risiko_mingguan.py cuaca      # cuaca harian per sel 0,5 derajat (NASA POWER) -> cuaca_merra2/, bisa dilanjutkan
  python3 scripts/sebaran/risiko_mingguan.py balik      # siapkan (tetap_<th>.npy, minggu.npz) + 11 lipatan + nilai -> public/data/risiko_mingguan_uji.json
  python3 scripts/sebaran/risiko_mingguan.py nilai      # hitung ulang metrik & vonis dari lipat_<th>.npz
  RISIKO_ABLASI=tanpa_cuaca python3 scripts/sebaran/risiko_mingguan.py balik   # ablasi INFO, tidak menentukan vonis
  python3 scripts/sebaran/risiko_mingguan.py uji        # swauji (termasuk kebocoran yang harus DITOLAK)
Produksi (public/data/risiko_mingguan.json) BELUM ada: lihat docs/riset/RISIKO-MINGGUAN.md "Hasil".

Hari = hari WIB (UTC+7). Hari terbit t: fitur dari hari <= t; target = >= 1 titik di hari t+1..t+7.
Sensor (ditetapkan sebelum melatih, angka penyetaranya di setara.json): S-NPP sebelum SAKLAR (1 Apr 2018), NOAA-20 sesudahnya.
"""
import csv, datetime as dt, json, math, os, sys, time

import numpy as np

DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, DIR)
sys.path.insert(1, os.path.join(DIR, "..", "data"))
from umum import AKAR, PUBLIK  # noqa: E402

RAW = os.path.join(AKAR, "data/raw/risiko")
FIRMS = os.path.join(AKAR, "data/raw/firms")
X0, Y1, SEL, NX, NY = 94.5, 6.5, 0.05, 940, 360          # kisi riwayat_sel
HARI0 = dt.date(2012, 1, 1)                               # hari 0
SAKLAR = (dt.date(2018, 4, 1) - HARI0).days               # NOAA-20 arsip mulai 1 Apr 2018
TH_UJI = tuple(range(2015, 2026))
TH_RIWAYAT0 = 2012
MUSIM = (7, 8, 9, 10, 11)


def log(*a):
    print(time.strftime("%H:%M:%S"), *a, file=sys.stderr, flush=True)


def hari(d):
    return (d - HARI0).days


def tgl(h):
    return HARI0 + dt.timedelta(days=int(h))


def sel_id(lon, lat):
    ix, iy = int((lon - X0) / SEL), int((Y1 - lat) / SEL)
    return iy * NX + ix if 0 <= ix < NX and 0 <= iy < NY else -1


def pusat(c):
    return X0 + (c % NX + .5) * SEL, Y1 - (c // NX + .5) * SEL


# ---------------------------------------------------------------- api
def baca_firms(berkas, nonveg):
    """-> {(sel, hari WIB): n} keyakinan n/h, api vegetasi (pola riwayat_grid: type 0; NRT tanpa type dibuang bila sel 0,01
    derajatnya pernah bertipe 1/2/3 di arsip standar SENSOR MANA PUN)."""
    out = {}
    for b in berkas:
        for r in csv.DictReader(open(b)):
            if r["confidence"] not in ("n", "h"):
                continue
            t = r.get("type")
            if t:
                if t != "0":
                    continue
            elif (round(float(r["latitude"]), 2), round(float(r["longitude"]), 2)) in nonveg:
                continue
            c = sel_id(float(r["longitude"]), float(r["latitude"]))
            if c < 0:
                continue
            j = r["acq_time"].zfill(4)
            w = dt.datetime.fromisoformat(r["acq_date"]) + dt.timedelta(hours=int(j[:2]) + 7, minutes=int(j[2:]))
            k = (c, hari(w.date()))
            out[k] = out.get(k, 0) + 1
    return out


def api():
    from riwayat_grid import bukan_vegetasi
    snpp = [os.path.join(FIRMS, "viirs_2012_2014.csv"), os.path.join(FIRMS, "viirs.csv")]
    n20 = [os.path.join(FIRMS, "viirs_noaa20.csv")]
    nonveg = set()
    for b in snpp + n20:
        nonveg |= bukan_vegetasi(b)
    os.makedirs(RAW, exist_ok=True)
    arr = {}
    for nm, b in (("snpp", snpp), ("n20", n20)):
        d = baca_firms(b, nonveg)
        k = np.array(sorted(d), dtype=np.int64)
        arr[nm + "_sel"], arr[nm + "_hari"] = k[:, 0].astype(np.int32), k[:, 1].astype(np.int32)
        arr[nm + "_n"] = np.array([d[(int(a), int(b_))] for a, b_ in k], dtype=np.int32)
        log(nm, len(d), "sel-hari", tgl(k[:, 1].min()), tgl(k[:, 1].max()))
    np.savez_compressed(os.path.join(RAW, "api.npz"), **arr)
    setara(arr)


def hari_ada(A, nm):
    """Hari dengan >= 1 deteksi nasional (hari lain = celah data sensor itu)."""
    return np.unique(A[nm + "_hari"])


def setara(A=None):
    """Ukur penyetara S-NPP -> NOAA-20 di masa tumpang tindih (hari yang dua sensor sama-sama punya data)."""
    A = A if A is not None else dict(np.load(os.path.join(RAW, "api.npz")))
    hs, hn = hari_ada(A, "snpp"), hari_ada(A, "n20")
    sama = np.intersect1d(hs, hn)
    sama = sama[sama >= SAKLAR]
    lo, hi = int(sama.min()), int(sama.max())
    out = {"tumpang": [tgl(lo).isoformat(), tgl(hi).isoformat()], "hari_sama": int(len(sama)),
           "celah_snpp": int((hi - lo + 1) - len(np.intersect1d(hs, np.arange(lo, hi + 1)))),
           "celah_n20": int((hi - lo + 1) - len(np.intersect1d(hn, np.arange(lo, hi + 1))))}
    ms = {}
    for nm in ("snpp", "n20"):
        m = np.isin(A[nm + "_hari"], sama)
        ms[nm] = (A[nm + "_sel"][m].astype(np.int64), A[nm + "_hari"][m], A[nm + "_n"][m])
    out["titik_snpp"], out["titik_n20"] = int(ms["snpp"][2].sum()), int(ms["n20"][2].sum())
    out["faktor_titik"] = round(out["titik_n20"] / out["titik_snpp"], 4)
    # sel-minggu (minggu = hari // 7) positif menurut tiap sensor
    per = {}
    for nm, (c, h, n) in ms.items():
        per[nm] = set((c * 4000 + h // 7).tolist())
    a, b = per["snpp"], per["n20"]
    out.update({"selminggu_snpp": len(a), "selminggu_n20": len(b), "selminggu_keduanya": len(a & b),
                "rasio_selminggu": round(len(b) / len(a), 4), "p_n20_bila_snpp": round(len(a & b) / len(a), 4),
                "p_snpp_bila_n20": round(len(a & b) / len(b), 4)})
    th = {}
    for nm, s in per.items():
        for k in s:
            y = tgl((k % 4000) * 7).year
            th.setdefault(y, [0, 0])[nm == "n20"] += 1
    out["rasio_per_tahun"] = {str(y): round(v[1] / v[0], 3) for y, v in sorted(th.items()) if v[0]}
    json.dump(out, open(os.path.join(RAW, "setara.json"), "w"), indent=1)
    log(json.dumps(out))
    return out


def seri_api():
    """Seri tergabung: S-NPP sebelum SAKLAR, NOAA-20 sesudahnya. Hitungan S-NPP dikali faktor_titik (setara.json).
    -> (sel int64, hari int32, n float32) urut hari."""
    A = np.load(os.path.join(RAW, "api.npz"))
    f = json.load(open(os.path.join(RAW, "setara.json")))["faktor_titik"]
    ms, mn = A["snpp_hari"] < SAKLAR, A["n20_hari"] >= SAKLAR
    c = np.concatenate([A["snpp_sel"][ms], A["n20_sel"][mn]]).astype(np.int64)
    h = np.concatenate([A["snpp_hari"][ms], A["n20_hari"][mn]])
    n = np.concatenate([A["snpp_n"][ms] * f, A["n20_n"][mn].astype(np.float64)]).astype(np.float32)
    o = np.argsort(h, kind="stable")
    return c[o], h[o], n[o]


def himpunan_sel():
    """Sel yang pernah punya >= 1 titik (seri tergabung 2012-2026) + penyangga 1 sel (dilasi 3x3). Tetap untuk semua metode."""
    jalur = os.path.join(RAW, "sel.npy")
    if os.path.exists(jalur):
        return np.load(jalur)
    c, _, _ = seri_api()
    G = np.zeros((NY, NX), bool)
    G.flat[np.unique(c)] = True
    D = G.copy()
    for a in (-1, 0, 1):
        for b in (-1, 0, 1):
            s = np.zeros_like(G)
            s[max(a, 0):NY + min(a, 0), max(b, 0):NX + min(b, 0)] = G[max(-a, 0):NY + min(-a, 0), max(-b, 0):NX + min(-b, 0)]
            D |= s
    out = np.flatnonzero(D.ravel()).astype(np.int64)
    np.save(jalur, out)
    return out


def populasi():
    """Sel yang dinilai: himpunan_sel yang jatuh di wilayah Kemendagri (Indonesia). Sel laut penyangga dan sel Malaysia/PNG/Timor
    Leste di kotak kisi dibuang. -> (sel, prov, kab, X lahan)"""
    S, L = himpunan_sel(), np.load(os.path.join(RAW, "lahan.npz"))
    m = L["prov"] != ""
    return S[m], L["prov"][m], L["kab"][m], L["X"][m]


# ---------------------------------------------------------------- lahan & wilayah
LAHAN_F = ["gambut", "hutan", "produksi", "apl", "kebun", "hti", "hph", "konsesi", "kanal_km", "jalan_km", "penduduk_km2"]


def lahan():
    """Lapisan lahan model sebaran (umum.Lahan) per sel 0,05: porsi 3x3 titik contoh untuk poligon, nilai pusat untuk jarak.
    Wilayah (provinsi, kabupaten) dari pusat sel; bila pusat di laut, titik contoh pertama yang kena darat. -> lahan.npz"""
    from umum import HUTAN, PRODUKSI, Lahan
    from wilayah import Wilayah
    S, L, W = himpunan_sel(), Lahan(), Wilayah()
    X = np.zeros((len(S), len(LAHAN_F)), np.float32)
    prov, kab = [], []
    sub = [(-.0167, -.0167), (0, -.0167), (.0167, -.0167), (-.0167, 0), (0, 0), (.0167, 0), (-.0167, .0167), (0, .0167), (.0167, .0167)]
    for i, c in enumerate(S):
        lon, lat = pusat(int(c))
        acc = np.zeros(8)
        wil = None
        for dx, dy in sub:
            x, y = lon + dx, lat + dy
            kw = L.kw.cari(x, y) or {}
            jenis = {p.get("jenis") for p in L.ks.cari(x, y)}
            acc += [1 if L.gb.cari(x, y) else 0, kw.get("fungsi") in HUTAN, kw.get("fungsi") in PRODUKSI, 0 if kw else 1,
                    "sawit" in jenis, "hti" in jenis, "hph" in jenis, 1 if jenis else 0]
            if wil is None and (dx, dy) == (0, 0):
                wil = W.cari(x, y)
        if wil is None:
            for dx, dy in sub:
                wil = W.cari(lon + dx, lat + dy)
                if wil:
                    break
        X[i, :8] = acc / len(sub)
        X[i, 8:] = [L.kanal_km(lon, lat), L.jarak_jalan(lon, lat) / 1000, L.penduduk_km2(lon, lat)]
        prov.append(wil[0] if wil else "")
        kab.append(f"{wil[0]}|{wil[1]}" if wil else "")
        if (i + 1) % 10000 == 0:
            log(f"lahan {i + 1}/{len(S)}")
    np.savez_compressed(os.path.join(RAW, "lahan.npz"), X=X, prov=np.array(prov), kab=np.array(kab))
    log("lahan selesai", sum(1 for p in prov if not p), "sel tanpa wilayah")


# ---------------------------------------------------------------- cuaca
# Cuaca: NASA POWER harian (MERRA-2, ~0,5 x 0,625 derajat), BUKAN ERA5. Alasan (diukur sebelum membangun): Open-Meteo archive
# menghitung 1 panggilan per lokasi per 14 hari, jadi 2012-2025 = ~365 panggilan per lokasi; 1.097 sel 0,5 derajat = ~400 rb
# panggilan = ~40 hari kuota gratis 10.000/hari. POWER: satu permintaan per titik untuk seluruh rentang, tanpa kunci.
POWER = "https://power.larc.nasa.gov/api/temporal/daily/point"
VAR_C = ["PRECTOTCORR", "T2M_MAX", "T2M_MIN", "RH2M", "QV2M", "PS", "WS10M", "WS10M_MAX"]
# Uji balik berhenti 31 Des 2025: permintaan yang menyentuh 2026 memakai sumber GEOSIT dan (diukur 23 Okt 2026, API v2.10.1)
# MENGALIKAN SELURUH deret hujan 24x, termasuk tahun MERRA-2 lama. Respons dengan GEOSIT ditolak.
C_MULAI, C_AKHIR = "20120101", "20251231"


def sel05(c):
    """Sel 0,05 -> kunci sel cuaca 0,5 derajat (iy05, ix05)."""
    return (c // NX) // 10, (c % NX) // 10


def pusat05(k):
    return X0 + (k[1] + .5) * .5, Y1 - (k[0] + .5) * .5


def jalur_cuaca(k):
    return os.path.join(RAW, "cuaca_merra2", f"{k[0]}_{k[1]}.json")   # data/raw/risiko/cuaca/ = unduhan pertama dengan hujan x24, JANGAN dipakai


def cuaca():
    import urllib.error, urllib.parse, urllib.request
    os.makedirs(os.path.dirname(jalur_cuaca((0, 0))), exist_ok=True)
    ks = sorted({sel05(int(c)) for c in populasi()[0]})
    sisa = [k for k in ks if not os.path.exists(jalur_cuaca(k))]
    akhir = C_AKHIR
    log(f"{len(ks)} sel cuaca, sisa {len(sisa)}")
    for i, k in enumerate(sisa):
        lon, lat = pusat05(k)
        q = {"parameters": ",".join(VAR_C), "community": "AG", "longitude": f"{lon:.3f}", "latitude": f"{lat:.3f}",
             "start": C_MULAI, "end": akhir, "format": "JSON"}
        for coba in range(6):
            try:
                with urllib.request.urlopen(POWER + "?" + urllib.parse.urlencode(q), timeout=180) as r:
                    d = json.load(r)
                break
            except (urllib.error.URLError, TimeoutError, json.JSONDecodeError) as e:
                tunggu = 30 * (coba + 1) * (3 if getattr(e, "code", 0) == 429 else 1)
                log(f"{k}: {e}; tunggu {tunggu} dtk")
                time.sleep(tunggu)
        else:
            log("gagal terus, berhenti; jalankan ulang nanti")
            return
        assert "GEOSIT" not in d["header"]["sources"] and d["parameters"]["PRECTOTCORR"]["units"] == "mm/day", d["header"]
        p = d["properties"]["parameter"]
        hari_ = sorted(p[VAR_C[0]])
        isi = {"mulai": hari_[0], "titik": d["geometry"]["coordinates"],
               **{v: [None if p[v][h] == -999 else p[v][h] for h in hari_] for v in VAR_C}}
        tmp = jalur_cuaca(k) + ".tmp"
        json.dump(isi, open(tmp, "w"), separators=(",", ":"))
        os.replace(tmp, jalur_cuaca(k))
        if (i + 1) % 25 == 0:
            log(f"cuaca {i + 1}/{len(sisa)}")
        time.sleep(1.0)
    log("cuaca selesai")



# ---------------------------------------------------------------- cuaca harian -> fitur per (sel cuaca, hari)
CUACA_F = ["hujan7", "hujan30", "hujan60", "hari_kering", "dc", "dmc", "ffmc", "fwi", "tmaks7", "rhmin7", "angin7"]
HARI_C = hari(dt.date(2025, 12, 31)) + 1        # jumlah hari cuaca (2012-01-01 .. 2025-12-31)


def es(t):
    return 0.6108 * np.exp(17.27 * t / (t + 237.3))


def deret_cuaca(d):
    """Satu berkas POWER -> array (HARI_C, len(CUACA_F)). Nilai pada hari t hanya memakai hari <= t.
    FWI: suhu siang ~ T2M_MAX, RH siang ~ RH pada T2M_MAX dari tekanan uap (QV2M, PS), angin ~ WS10M rata-rata harian (km/jam),
    hujan 24 jam ~ hujan harian. Hari kosong: kode FWI dibawa dari kemarin (fwi.deret)."""
    import fwi as F
    assert d["mulai"] == "20120101"
    n = HARI_C
    a = {v: np.array([np.nan if x is None else x for x in d[v][:n]], np.float64) for v in VAR_C}
    assert all(len(x) == n for x in a.values()), "deret cuaca terpotong"
    q = a["QV2M"] / 1000
    e = q * a["PS"] / (0.622 + 0.378 * q)
    rh = np.clip(100 * e / es(a["T2M_MAX"]), 0, 100)
    ws = a["WS10M"] * 3.6
    hj = a["PRECTOTCORR"]
    kode = F.deret([(None if np.isnan(t) else float(t), None if np.isnan(h) else float(h), None if np.isnan(w) else float(w),
                     None if np.isnan(r) else float(r)) for t, h, w, r in zip(a["T2M_MAX"], rh, ws, hj)])
    out = np.full((n, len(CUACA_F)), np.nan, np.float32)
    h0 = np.nan_to_num(hj)
    cs = np.concatenate([[0], np.cumsum(h0)])
    for j, L in enumerate((7, 30, 60)):
        idx = np.arange(n)
        out[:, j] = cs[idx + 1] - cs[np.maximum(idx + 1 - L, 0)]
    kering, last = np.zeros(n), -10 ** 6
    for t in range(n):
        if h0[t] >= 2:
            last = t
        kering[t] = min(t - last, 60)
    out[:, 3] = kering
    for j, k in enumerate(("dc", "dmc", "ffmc", "fwi")):
        out[:, 4 + j] = [r[k] for r in kode]
    for j, x in enumerate((a["T2M_MAX"], rh, ws)):
        c = np.concatenate([[0], np.cumsum(np.nan_to_num(x))])
        m = np.concatenate([[0], np.cumsum(~np.isnan(x))])
        idx = np.arange(n)
        lo = np.maximum(idx + 1 - 7, 0)
        out[:, 8 + j] = (c[idx + 1] - c[lo]) / np.maximum(m[idx + 1] - m[lo], 1)
    return out


def cuaca_harian():
    """-> (kunci sel cuaca [(iy05, ix05)], array (nW, HARI_C, F)) di cache cuaca_harian.npy; sel tanpa berkas = NaN."""
    jalur = os.path.join(RAW, "cuaca_harian.npz")
    ks = sorted({sel05(int(c)) for c in populasi()[0]})
    if os.path.exists(jalur):
        z = np.load(jalur)
        if [tuple(x) for x in z["kunci"]] == ks and z["lengkap"].all():
            return ks, z["W"], z["lengkap"]
    W = np.full((len(ks), HARI_C, len(CUACA_F)), np.nan, np.float32)
    lengkap = np.zeros(len(ks), bool)
    for i, k in enumerate(ks):
        if os.path.exists(jalur_cuaca(k)):
            W[i] = deret_cuaca(json.load(open(jalur_cuaca(k))))
            lengkap[i] = True
        if (i + 1) % 200 == 0:
            log(f"cuaca harian {i + 1}/{len(ks)}")
    np.savez(jalur, kunci=np.array(ks), W=W, lengkap=lengkap)
    log(f"cuaca harian: {lengkap.sum()}/{len(ks)} sel cuaca ada")
    return ks, W, lengkap


def hujan_depan(sumber):
    """Hujan 7 hari ke depan sebagai fitur. Arsip PRAKIRAAN yang benar-benar terbit tiap hari tidak ada untuk 2015-2025, jadi fitur
    ini TIDAK dipakai. Reanalisis masa depan (ERA5/MERRA-2 sesudah hari terbit) = prakiraan sempurna = kebocoran: ditolak."""
    if sumber != "prakiraan_arsip":
        raise ValueError(f"kebocoran: hujan sesudah hari terbit dari '{sumber}' bukan prakiraan yang tersedia saat terbit")
    raise NotImplementedError("arsip prakiraan harian belum ada")


# ---------------------------------------------------------------- baris sel-minggu
API_F = ["n7", "n30", "n7_3", "n30_3", "n7_11", "n30_11", "hari_sejak"]
WAKTU_F = ["minggu", "oni", "dmi"]
RIWAYAT_F = ["klim", "klim5", "klim_3", "kekerapan", "reg_prov", "reg_kab"]
TETAP_F = API_F + CUACA_F + WAKTU_F
FITUR = TETAP_F + LAHAN_F + RIWAYAT_F
MINGGU = 52
EMBARGO = 90           # hari: baris latih yang jendela fiturnya (<= 90 hari) menyentuh tahun uji dibuang
TH0, TH1 = 2012, 2025


def hari_terbit(Y, k):
    """Minggu k (0..51) tahun Y: target = hari-dalam-tahun 7k+1..7k+7; hari terbit = sehari sebelumnya."""
    return hari(dt.date(Y, 1, 1)) + 7 * k - 1


def kotak(G, r):
    """Jumlah jendela (2r+1)^2 pada kisi (NY, NX)."""
    c = np.zeros((NY + 1, NX + 1))
    c[1:, 1:] = G.cumsum(0).cumsum(1)
    y0 = np.clip(np.arange(NY) - r, 0, NY)
    y1 = np.clip(np.arange(NY) + r + 1, 0, NY)
    x0 = np.clip(np.arange(NX) - r, 0, NX)
    x1 = np.clip(np.arange(NX) + r + 1, 0, NX)
    return c[y1][:, x1] - c[y0][:, x1] - c[y1][:, x0] + c[y0][:, x0]


def matriks_minggu(c, h, n, S):
    """P[s, th-TH0, k] = sel s punya titik di minggu kalender k; P3 = ada titik di 3x3 sekitar."""
    th = np.array([tgl(int(x)).year for x in range(int(h.max()) + 1)])
    doy = np.array([tgl(int(x)).timetuple().tm_yday for x in range(int(h.max()) + 1)])
    yy, kk = th[h] - TH0, (doy[h] - 1) // 7
    m = (kk < MINGGU) & (yy >= 0) & (yy <= TH1 - TH0)
    nth = TH1 - TH0 + 1
    G = np.zeros((nth, MINGGU, NY * NX), bool)
    G[yy[m], kk[m], c[m]] = True
    P = G[:, :, S].transpose(2, 0, 1).copy()
    G3 = np.zeros_like(G)
    Gv = G.reshape(nth, MINGGU, NY, NX)
    G3v = G3.reshape(nth, MINGGU, NY, NX)
    for a in (-1, 0, 1):
        for b in (-1, 0, 1):
            G3v[:, :, max(a, 0):NY + min(a, 0), max(b, 0):NX + min(b, 0)] |= Gv[:, :, max(-a, 0):NY + min(-a, 0), max(-b, 0):NX + min(-b, 0)]
    P3 = G3[:, :, S].transpose(2, 0, 1).copy()
    return P, P3


def enso_bulan():
    E = json.load(open(os.path.join(AKAR, "data/raw/sebaran/enso.json")))
    return E["oni"], E["dmi"]


def bulan_geser(d, m):
    y, mm = d.year, d.month - m
    while mm < 1:
        y, mm = y - 1, mm + 12
    return f"{y}-{mm:02d}"


def fitur_tetap(Y, c, h, n, S, wk, W, oni, dmi):
    """Fitur yang tidak bergantung lipatan untuk semua sel S di 52 minggu tahun Y -> (52*|S|, len(TETAP_F)) float32.
    Semua dari hari <= hari terbit. ONI = musim 3 bulan berpusat 2 bulan sebelum bulan terbit (terbit di bulan terbit), DMI = bulan lalu."""
    out = np.zeros((MINGGU, len(S), len(TETAP_F)), np.float32)
    for k in range(MINGGU):
        t = hari_terbit(Y, k)
        a, b = np.searchsorted(h, t - 89), np.searchsorted(h, t, side="right")
        cc, hh, nn = c[a:b], h[a:b], n[a:b]
        assert not len(hh) or hh.max() <= t
        g30 = np.bincount(cc[hh > t - 30], nn[hh > t - 30], NY * NX).reshape(NY, NX)
        g7 = np.bincount(cc[hh > t - 7], nn[hh > t - 7], NY * NX).reshape(NY, NX)
        akhir = np.full(NY * NX, -10 ** 6)
        np.maximum.at(akhir, cc, hh)
        kol = [g7.ravel(), g30.ravel(), kotak(g7, 1).ravel(), kotak(g30, 1).ravel(), kotak(g7, 5).ravel(), kotak(g30, 5).ravel(),
               np.minimum(t - akhir, 90)]
        for j, v in enumerate(kol):
            out[k, :, j] = v[S]
        j0 = len(API_F)
        out[k, :, j0:j0 + len(CUACA_F)] = W[wk, t] if t < W.shape[1] else np.nan
        d = tgl(t)
        out[k, :, j0 + len(CUACA_F):] = [k, oni.get(bulan_geser(d, 2), np.nan), dmi.get(bulan_geser(d, 1), np.nan)]
    return out.reshape(MINGGU * len(S), len(TETAP_F))


def siapkan():
    """Cache tahunan fitur tetap (tetap_<Y>.npy) + matriks minggu (minggu.npz)."""
    S, prov, kab, XL = populasi()
    c, h, n = seri_api()
    pos = np.full(NY * NX, -1)
    pos[S] = np.arange(len(S))
    jm = os.path.join(RAW, "minggu.npz")
    if not os.path.exists(jm):
        P, P3 = matriks_minggu(c, h, n, S)
        np.savez_compressed(jm, P=P, P3=P3)
    ks, W, lengkap = cuaca_harian()
    if not lengkap.all():
        raise SystemExit(f"cuaca belum lengkap ({lengkap.sum()}/{len(ks)}): jalankan `cuaca` dulu")
    ki = {k: i for i, k in enumerate(ks)}
    wk = np.array([ki[sel05(int(x))] for x in S])
    oni, dmi = enso_bulan()
    for Y in TH_UJI:
        jl = os.path.join(RAW, f"tetap_{Y}.npy")
        if os.path.exists(jl):
            continue
        np.save(jl + ".tmp.npy", fitur_tetap(Y, c, h, n, S, wk, W, oni, dmi))
        os.replace(jl + ".tmp.npy", jl)
        log(f"fitur tetap {Y}")


def riwayat_tahun(Y, T):
    """Tahun riwayat untuk baris tahun Y pada lipatan uji T: SEBELUM Y dan BUKAN T."""
    return [y for y in range(TH0, Y) if y != T]


def cek_riwayat(Y, T, tahun):
    bocor = [y for y in tahun if y >= Y or y == T]
    if bocor:
        raise AssertionError(f"kebocoran: riwayat baris {Y} (uji {T}) memakai tahun {bocor}")


def fitur_riwayat(P, P3, Y, tahun):
    """-> (52*|S|, 4): klim (minggu sama), klim5 (+-2 minggu), klim_3 (3x3 sekitar), kekerapan (tahun dengan api) dari `tahun`."""
    ns = P.shape[0]
    if not tahun:
        return np.full((MINGGU * ns, 4), np.nan, np.float32)
    ii = [y - TH0 for y in tahun]
    Pm = P[:, ii, :].mean(1)                       # (S, 52)
    P3m = P3[:, ii, :].mean(1)
    c5 = np.stack([Pm[:, max(k - 2, 0):k + 3].mean(1) for k in range(MINGGU)], 1)
    kek = P[:, ii, :].any(2).mean(1)
    out = np.stack([Pm.T, c5.T, P3m.T, np.repeat(kek[None], MINGGU, 0)], 2)   # (52, S, 4)
    return out.reshape(MINGGU * ns, 4).astype(np.float32)


# --- efek wilayah bertingkat (HIERARKI-WILAYAH.md): nasional -> provinsi -> kabupaten, k dari tahun latih saja
K_GRID = (0.0, 1e2, 1e3, 1e4, 1e5, 1e6, 1e9)


def hitung_unit(P, ui, nu, tahun):
    """Jumlah positif & sel-minggu per (unit, minggu) dengan jendela +-2 minggu dari `tahun`. -> (s, n) bentuk (nu, 52)."""
    ii = [y - TH0 for y in tahun]
    pk = P[:, ii, :].sum(1).astype(np.float64)          # (S, 52)
    s = np.zeros((nu, MINGGU))
    np.add.at(s, ui, pk)
    cnt = np.bincount(ui, minlength=nu).astype(np.float64) * len(ii)
    s5 = np.stack([s[:, max(k - 2, 0):k + 3].sum(1) for k in range(MINGGU)], 1)
    n5 = np.stack([cnt * (min(k + 3, MINGGU) - max(k - 2, 0)) for k in range(MINGGU)], 1)
    return s5, n5


def susut(P, pi, ai, npv, nab, tahun, kp, ka):
    """-> (laju provinsi, laju kabupaten) bentuk (unit, 52), susut (s + k*induk)/(n + k)."""
    sp, n_p = hitung_unit(P, pi, npv, tahun)
    sa, n_a = hitung_unit(P, ai, nab, tahun)
    nat = sp.sum(0) / np.maximum(n_p.sum(0), 1)
    rp = (sp + kp * nat) / np.maximum(n_p + kp, 1e-12)
    induk = np.zeros(nab, int)
    induk[ai] = pi
    ra = (sa + ka * rp[induk]) / np.maximum(n_a + ka, 1e-12)
    return rp, ra


def pilih_k_wilayah(P, pi, ai, npv, nab, latih, T):
    """k provinsi lalu kabupaten, tinggalkan-satu-tahun di tahun LATIH saja (logloss tiap sel-minggu tahun ditinggal)."""
    if T in latih:
        raise AssertionError(f"kebocoran: tahun uji {T} ikut memilih k wilayah")
    def rugi(kp, ka):
        L = 0.0
        for y0 in latih:
            th = [y for y in range(TH0, TH1 + 1) if y not in (T, y0)]
            rp, ra = susut(P, pi, ai, npv, nab, th, kp, ka)
            pa = np.clip(ra[ai], 1e-6, 1 - 1e-6)                # (S, 52)
            yy = P[:, y0 - TH0, :]
            L -= (yy * np.log(pa) + (~yy) * np.log(1 - pa)).sum()
        return L
    kp = min(K_GRID, key=lambda k: (rugi(k, 1e9), -k))
    ka = min(K_GRID, key=lambda k: (rugi(kp, k), -k))
    return kp, ka


def kode_wilayah(prov, kab):
    up, pi = np.unique(prov, return_inverse=True)
    ua, ai = np.unique(kab, return_inverse=True)
    return up, pi, ua, ai


def baris_tahun(Y, T, P, P3, XL, wil, kk, ns):
    """Matriks fitur lengkap tahun Y untuk lipatan uji T (T=None: produksi)."""
    tahun = riwayat_tahun(Y, T)
    cek_riwayat(Y, T, tahun)
    Xt = np.load(os.path.join(RAW, f"tetap_{Y}.npy"), mmap_mode="r")
    up, pi, ua, ai = wil
    R = fitur_riwayat(P, P3, Y, tahun)
    rp, ra = susut(P, pi, ai, len(up), len(ua), tahun, *kk)
    reg = np.stack([rp[pi].T, ra[ai].T], 2).reshape(MINGGU * ns, 2).astype(np.float32)
    XLr = np.broadcast_to(XL[None], (MINGGU, ns, XL.shape[1])).reshape(MINGGU * ns, -1)
    return np.concatenate([np.asarray(Xt), XLr, R, reg], 1)


def target_tahun(P, Y):
    return P[:, Y - TH0, :].T.reshape(-1)          # urutan (minggu, sel) = urutan baris


def ambil_latih(Y, T, y, rng_seed):
    """Indeks baris latih tahun Y: semua positif dengan peluang 0,5 (bobot 2), negatif 0,02 (bobot 50); baris dalam EMBARGO hari
    sesudah akhir tahun uji dibuang. Sampel tetap per tahun (sama di semua lipatan)."""
    rng = np.random.default_rng(rng_seed + Y)
    u = rng.random(len(y))
    m = np.where(y, u < 0.5, u < 0.02)
    if T is not None and Y == T + 1:
        ns = len(y) // MINGGU
        k = np.repeat(np.arange(MINGGU), ns)
        t = np.array([hari_terbit(Y, x) for x in range(MINGGU)])[k]
        m &= t - (EMBARGO - 1) > hari(dt.date(T, 12, 31))
    if T is not None:
        assert Y != T, "kebocoran: tahun uji masuk data latih"
    idx = np.flatnonzero(m)
    return idx, np.where(y[idx], 2.0, 50.0)


# ---------------------------------------------------------------- uji balik tinggalkan-satu-tahun
HP = {"pohon": 300, "dalam": 6, "lr": 0.05, "l2": 1.0, "min_h": 20.0, "sub": 0.7}   # ditetapkan sebelum melihat hasil; tidak disetel
SEED = 7
JI = {f: i for i, f in enumerate(FITUR)}


def muat_dasar():
    S, prov, kab, XL = populasi()
    z = np.load(os.path.join(RAW, "minggu.npz"))
    return S, prov, kab, XL, z["P"], z["P3"], kode_wilayah(prov, kab)


def pembanding(X):
    """Fitur pembanding: persistensi (titik 7 hari terakhir di sel) dan klimatologi (minggu kalender sama, tahun-tahun sebelumnya)."""
    pers = (X[:, JI["n7"]] > 0).astype(np.float64)
    klim = np.nan_to_num(X[:, JI["klim"]].astype(np.float64))
    return pers, klim


# Ablasi INFO (bukan model terdaftar, tidak menentukan vonis): RISIKO_ABLASI=tanpa_cuaca melatih tanpa CUACA_F, berkas lipat_tanpa_cuaca_<T>.
ABLASI = os.environ.get("RISIKO_ABLASI", "")
BUANG = {"": [], "tanpa_cuaca": CUACA_F}[ABLASI]
AKTIF = [i for i, f in enumerate(FITUR) if f not in BUANG]
AWALAN = f"lipat_{ABLASI}_" if ABLASI else "lipat_"


def lipatan(T, dasar):
    """Latih tanpa tahun T, nilai di T. -> data/raw/risiko/lipat_<T>.npz"""
    import gbdt_np as G
    jl = os.path.join(RAW, f"{AWALAN}{T}.npz")
    if os.path.exists(jl):
        return
    S, prov, kab, XL, P, P3, wil = dasar
    up, pi, ua, ai = wil
    ns = len(S)
    latih = [y for y in TH_UJI if y != T]
    t0 = time.time()
    kk = pilih_k_wilayah(P, pi, ai, len(up), len(ua), latih, T)
    Xs, ys, ws = [], [], []
    for Y in latih:
        X = baris_tahun(Y, T, P, P3, XL, wil, kk, ns)
        y = target_tahun(P, Y)
        idx, w = ambil_latih(Y, T, y, SEED)
        Xs.append(X[idx]); ys.append(y[idx]); ws.append(w)
        del X
    X, y, w = np.concatenate(Xs), np.concatenate(ys), np.concatenate(ws)
    del Xs
    log(f"lipat {T}: k wilayah {kk}, latih {len(y)} baris ({int(y.sum())} positif), {time.time() - t0:.0f} dtk")
    m = G.latih(X[:, AKTIF], y, w, **HP, seed=SEED, log=log)
    pers, klim = pembanding(X)
    blr = G.logistik(np.column_stack([pers, klim]), y, w)
    XT = baris_tahun(T, T, P, P3, XL, wil, kk, ns)
    yT = target_tahun(P, T)
    pT = G.prediksi(m, XT[:, AKTIF])
    persT, klimT = pembanding(XT)
    lrT = G.pred_logistik(blr, np.column_stack([persT, klimT]))
    pakai = np.zeros(len(FITUR), int)
    for s_ in m["pohon"]:
        for nd in s_:
            if len(nd) > 1:
                pakai[AKTIF[nd[0]]] += 1
    np.savez_compressed(jl, y=yT, p=pT.astype(np.float32), pers=persT.astype(np.int8), klim=klimT.astype(np.float32),
                        lr=lrT.astype(np.float32), kk=np.array(kk), blr=blr, pakai=pakai)
    json.dump(m, open(os.path.join(RAW, f"model_{ABLASI + '_' if ABLASI else ''}{T}.json"), "w"))
    log(f"lipat {T} selesai {time.time() - t0:.0f} dtk; AUC model {G.auc(pT, yT):.4f} lr {G.auc(lrT, yT):.4f}")


def fase_enso():
    """Fase ENSO per tahun dari ONI JAS (pusat Agustus): >= 0,5 El Nino, <= -0,5 La Nina, selain itu netral."""
    oni, _ = enso_bulan()
    return {y: ("el_nino" if oni[f"{y}-08"] >= .5 else "la_nina" if oni[f"{y}-08"] <= -.5 else "netral") for y in TH_UJI}


def recall_atas(p, y, grup, porsi=0.1, seed=1):
    """Recall bila tiap grup (provinsi-minggu) menandai porsi teratas sel menurut p (seri dipecah acak, sama untuk semua metode)."""
    r = np.random.default_rng(seed).random(len(p))
    o = np.lexsort((r, -p, grup))
    g = grup[o]
    awal = np.flatnonzero(np.r_[True, g[1:] != g[:-1]])
    ukuran = np.diff(np.r_[awal, len(g)])
    pangkat = np.arange(len(g)) - np.repeat(awal, ukuran)
    tanda = pangkat < np.repeat(np.ceil(porsi * ukuran), ukuran)
    yo = y[o]
    return float((yo & tanda).sum() / max(yo.sum(), 1))


METODE = ("model", "persistensi", "klimatologi", "logistik")
NBIN = 4096


def kumpul():
    """Gabung semua lipatan -> dict array (baris uji 2015-2025)."""
    S, prov, kab, XL = populasi()
    up, pi = np.unique(prov, return_inverse=True)
    ns = len(S)
    gamb = XL[:, LAHAN_F.index("gambut")] >= .5
    D = {k: [] for k in ("y", "model", "persistensi", "klimatologi", "logistik", "prov", "tahun", "minggu", "gambut")}
    for T in TH_UJI:
        z = np.load(os.path.join(RAW, f"lipat_{T}.npz"))
        D["y"].append(z["y"]); D["model"].append(z["p"]); D["persistensi"].append(z["pers"].astype(np.float32))
        D["klimatologi"].append(z["klim"]); D["logistik"].append(z["lr"])
        D["prov"].append(np.tile(pi, MINGGU)); D["tahun"].append(np.full(MINGGU * ns, T, np.int16))
        D["minggu"].append(np.repeat(np.arange(MINGGU, dtype=np.int16), ns)); D["gambut"].append(np.tile(gamb, MINGGU))
    D = {k: np.concatenate(v) for k, v in D.items()}
    doy1 = D["minggu"] * 7 + 1
    bulan = np.array([(dt.date(2021, 1, 1) + dt.timedelta(days=int(d) - 1)).month for d in range(1, 366)])
    D["musim"] = np.isin(bulan[doy1 - 1], MUSIM)
    return D, up


def ringkas(D, m, blok, rng, ulang=1000):
    """Metrik pada subset m. Selang 95% bootstrap blok (provinsi x tahun)."""
    import gbdt_np as G
    y = D["y"][m]
    out = {"n": int(m.sum()), "positif": int(y.sum()), "laju": round(float(y.mean()), 5)}
    if y.sum() == 0 or y.all():
        return out
    br = {k: float(((D[k][m] - y) ** 2).mean()) for k in METODE}
    au = {k: G.auc(D[k][m], y) for k in METODE}
    terbaik_b = min(METODE[1:], key=lambda k: br[k])
    terbaik_a = max(METODE[1:], key=lambda k: au[k])
    out.update({"brier": {k: round(v, 6) for k, v in br.items()}, "auc": {k: round(v, 4) for k, v in au.items()},
                "pembanding_brier": terbaik_b, "pembanding_auc": terbaik_a,
                "bss": round(1 - br["model"] / br[terbaik_b], 4), "d_auc": round(au["model"] - au[terbaik_a], 4)})
    if blok is None:
        return out
    b = blok[m]
    ub, bi = np.unique(b, return_inverse=True)
    nb = len(ub)
    # histogram per blok untuk AUC; jumlah kuadrat per blok untuk Brier
    H, SB = {}, {}
    for k in ("model", terbaik_a):
        q = np.quantile(D[k][m], np.linspace(0, 1, NBIN + 1)[1:-1])
        kb = np.searchsorted(q, D[k][m], side="right")
        H[k] = (np.bincount(bi * NBIN + kb, y, nb * NBIN).reshape(nb, NBIN), np.bincount(bi * NBIN + kb, ~y, nb * NBIN).reshape(nb, NBIN))
    for k in ("model", terbaik_b):
        SB[k] = np.bincount(bi, (D[k][m] - y) ** 2, nb)
    nbk = np.bincount(bi, minlength=nb).astype(float)
    W = rng.multinomial(nb, np.ones(nb) / nb, size=ulang).astype(float)     # (ulang, nb)

    def auc_h(pos, neg):
        cn = np.cumsum(neg, 1) - neg
        return (pos * (cn + neg / 2)).sum(1) / (pos.sum(1) * neg.sum(1))
    A = {k: auc_h(W @ H[k][0], W @ H[k][1]) for k in H}
    Bm = {k: (W @ SB[k]) / (W @ nbk) for k in SB}
    bss = np.sort(1 - Bm["model"] / Bm[terbaik_b])
    da = np.sort(A["model"] - A[terbaik_a])
    lo, hi = int(.025 * ulang), int(.975 * ulang) - 1
    out["bss_ci95"] = [round(float(bss[lo]), 4), round(float(bss[hi]), 4)]
    out["d_auc_ci95"] = [round(float(da[lo]), 4), round(float(da[hi]), 4)]
    return out


def nilai_balik():
    """Metrik + syarat beku -> public/data/risiko_mingguan_uji.json"""
    import gbdt_np as G
    from wilayah import PRIORITAS, PROVINSI
    D, up = kumpul()
    rng = np.random.default_rng(11)
    blok = D["prov"].astype(np.int64) * 10000 + D["tahun"]
    fase = fase_enso()
    fz = np.array([fase[int(t)] for t in TH_UJI])
    fy = fz[D["tahun"] - TH_UJI[0]]
    grup = (D["tahun"].astype(np.int64) * 100 + D["minggu"]) * 100 + D["prov"]
    hasil = {"dibuat": dt.date.today().isoformat(), "rancangan": "docs/riset/RISIKO-MINGGUAN.md (d8ae2180)", "fase_enso": fase,
             "setara": json.load(open(os.path.join(RAW, "setara.json"))), "fitur": FITUR, "hp": HP, "himpunan": {}}
    for nm, m0 in (("musim", D["musim"]), ("setahun", np.ones(len(D["y"]), bool))):
        H = {"semua": ringkas(D, m0, blok, rng)}
        p_ = np.clip(D["model"][m0].astype(np.float64), 1e-7, 1 - 1e-7)
        H["semua"]["kemiringan"] = round(G.kemiringan(p_, D["y"][m0]), 4)
        kb = np.empty(len(p_), int)
        kb[np.argsort(p_, kind="stable")] = np.arange(len(p_)) * 10 // len(p_)      # 10 kantong berisi sama banyak
        H["semua"]["reliabilitas"] = [[round(float(p_[kb == b].mean()), 5), round(float(D["y"][m0][kb == b].mean()), 5), int((kb == b).sum())]
                                      for b in range(10)]
        H["semua"]["recall_atas10"] = {k: round(recall_atas(D[k][m0].astype(np.float64), D["y"][m0], grup[m0]), 4) for k in METODE}
        H["per_tahun"] = {str(t): ringkas(D, m0 & (D["tahun"] == t), None, rng) for t in TH_UJI}
        H["per_provinsi"] = {}
        for i, kode in enumerate(up):
            r = ringkas(D, m0 & (D["prov"] == i), blok, rng, ulang=300)
            r["nama"] = PROVINSI.get(kode, kode)
            r["prioritas"] = kode in PRIORITAS
            H["per_provinsi"][str(kode)] = r
        H["per_enso"] = {f: ringkas(D, m0 & (fy == f), blok, rng) for f in ("el_nino", "netral", "la_nina") if (m0 & (fy == f)).any()}
        H["per_enso"]["bukan_el_nino"] = ringkas(D, m0 & (fy != "el_nino"), blok, rng)
        H["per_lahan"] = {"gambut": ringkas(D, m0 & D["gambut"], blok, rng), "mineral": ringkas(D, m0 & ~D["gambut"], blok, rng)}
        s = H["semua"]
        prov_ok = {k: v["bss"] >= 0 for k, v in H["per_provinsi"].items() if v["prioritas"] and v["positif"] >= 200}
        H["syarat"] = {
            "1_bss_dan_auc": bool(s["bss"] > 0 and s["bss_ci95"][0] > 0 and s["d_auc"] > 0 and s["d_auc_ci95"][0] > 0),
            "2_provinsi_prioritas": bool(all(prov_ok.values())), "2_rinci": prov_ok,
            "3_kemiringan": bool(.8 <= s["kemiringan"] <= 1.2),
            "4_enso": bool(all(H["per_enso"].get(f, {}).get("bss", -1) >= 0 for f in ("el_nino", "bukan_el_nino")))}
        H["lolos"] = all(v for k, v in H["syarat"].items() if not k.endswith("rinci"))
        hasil["himpunan"][nm] = H
    hasil["vonis"] = "LOLOS" if all(H["lolos"] for H in hasil["himpunan"].values()) else "GAGAL"
    pk = sum(np.load(os.path.join(RAW, f"lipat_{T}.npz"))["pakai"] for T in TH_UJI)
    hasil["belahan_per_fitur"] = {f: int(v) for f, v in sorted(zip(FITUR, pk), key=lambda x: -x[1])}
    hasil["k_wilayah"] = {str(T): np.load(os.path.join(RAW, f"lipat_{T}.npz"))["kk"].tolist() for T in TH_UJI}
    json.dump(hasil, open(os.path.join(PUBLIK, "risiko_mingguan_uji.json"), "w"), ensure_ascii=False, indent=1)
    log("vonis", hasil["vonis"], json.dumps({k: v["syarat"] for k, v in hasil["himpunan"].items()}))
    return hasil


def balik():
    siapkan()
    dasar = muat_dasar()
    for T in TH_UJI:
        lipatan(T, dasar)
    if ABLASI:
        return ablasi()
    nilai_balik()


def ablasi():
    """Tambahkan ringkasan ablasi (info) ke risiko_mingguan_uji.json tanpa mengubah vonis."""
    import gbdt_np as G
    jl = os.path.join(PUBLIK, "risiko_mingguan_uji.json")
    h = json.load(open(jl))
    D, _ = kumpul()
    p = np.concatenate([np.load(os.path.join(RAW, f"{AWALAN}{T}.npz"))["p"] for T in TH_UJI])
    out = {"catatan": "INFO, bukan model terdaftar; tidak menentukan vonis. Sama persis dengan model kecuali fitur yang dibuang.", "buang": BUANG}
    for nm, m in (("musim", D["musim"]), ("setahun", np.ones(len(p), bool))):
        y = D["y"][m]
        out[nm] = {"auc": round(G.auc(p[m], y), 4), "brier": round(float(((p[m] - y) ** 2).mean()), 6),
                   "auc_model": round(G.auc(D["model"][m], y), 4), "brier_model": round(float(((D["model"][m] - y) ** 2).mean()), 6),
                   "brier_logistik": round(float(((D["logistik"][m] - y) ** 2).mean()), 6)}
        out[nm]["bss_vs_logistik"] = round(1 - out[nm]["brier"] / out[nm]["brier_logistik"], 4)
    h.setdefault("ablasi", {})[ABLASI] = out
    json.dump(h, open(jl, "w"), ensure_ascii=False, indent=1)
    log("ablasi", json.dumps(out))


# ---------------------------------------------------------------- swauji
def uji():
    rng = np.random.default_rng(5)

    def tolak(f, *a, kata="kebocoran", jenis=AssertionError):
        try:
            f(*a)
        except jenis as e:
            assert kata in str(e), e
            return
        raise SystemExit(f"{f.__name__}{a} seharusnya DITOLAK")
    # 1. riwayat: tahun >= tahun baris dan tahun uji ditolak; tahun yang dipilih hanya sebelum Y, bukan T
    assert riwayat_tahun(2019, 2016) == [2012, 2013, 2014, 2015, 2017, 2018] and riwayat_tahun(2015, 2019) == [2012, 2013, 2014]
    tolak(cek_riwayat, 2019, 2016, [2015, 2019])
    tolak(cek_riwayat, 2019, 2016, [2016])
    tolak(cek_riwayat, 2019, 2016, [2021])
    cek_riwayat(2019, 2016, riwayat_tahun(2019, 2016))
    # 2. fitur riwayat tidak berubah bila tahun >= Y atau tahun uji diacak
    ns = 30
    P = rng.random((ns, TH1 - TH0 + 1, MINGGU)) < .2
    P3 = P | (rng.random(P.shape) < .1)
    th = riwayat_tahun(2019, 2016)
    a = fitur_riwayat(P, P3, 2019, th)
    Q, Q3 = P.copy(), P3.copy()
    Q[:, [2016 - TH0] + list(range(2019 - TH0, TH1 - TH0 + 1))] ^= True
    Q3[:, 2016 - TH0] ^= True
    assert np.array_equal(a, fitur_riwayat(Q, Q3, 2019, th)), "fitur riwayat melihat tahun uji / masa depan"
    assert abs(a[5 * ns + 3, 0] - P[3, [y - TH0 for y in th], 5].mean()) < 1e-6
    # 3. efek wilayah: k dipilih tanpa tahun uji; tahun uji di daftar latih ditolak; susut k=0 = laju mentah, k besar = induk
    pi = np.array([0] * 15 + [1] * 15)
    ai = np.array([0] * 5 + [1] * 10 + [2] * 15)
    tolak(pilih_k_wilayah, P, pi, ai, 2, 3, [2015, 2016, 2019], 2019)
    rp, ra = susut(P, pi, ai, 2, 3, th, 0.0, 0.0)
    s5, n5 = hitung_unit(P, ai, 3, th)
    assert np.allclose(ra, s5 / n5)
    rp2, ra2 = susut(P, pi, ai, 2, 3, th, 0.0, 1e12)
    assert np.allclose(ra2, rp2[[0, 0, 1]], atol=1e-6)
    # 4. hujan ke depan dari reanalisis = prakiraan sempurna: ditolak
    tolak(hujan_depan, "reanalisis", jenis=ValueError)
    tolak(hujan_depan, "era5", jenis=ValueError)
    # 5. sampel latih: tahun uji ditolak; embargo membuang minggu awal tahun sesudah tahun uji
    y = rng.random(MINGGU * 10) < .3
    tolak(ambil_latih, 2019, 2019, y, 1)
    idx, w = ambil_latih(2020, 2019, y, 1)
    k = idx // 10
    t = np.array([hari_terbit(2020, x) for x in k])
    assert len(idx) and (t - (EMBARGO - 1) > hari(dt.date(2019, 12, 31))).all() and k.min() >= 12
    idx2, _ = ambil_latih(2021, 2019, y, 1)
    assert idx2.min() < 10 * 12, "embargo hanya untuk tahun tepat sesudah tahun uji"
    assert set(np.unique(w)) <= {2.0, 50.0}
    # 6. fitur api & cuaca tetap sama bila titik / cuaca SESUDAH hari terbit diubah
    S = np.array([sel_id(110.02, -2.02), sel_id(110.07, -2.02), sel_id(111.0, -3.0)])
    Y = 2019
    t5 = hari_terbit(Y, 5)
    cc = np.array([S[0], S[0], S[1], S[2], S[0]], np.int64)
    hh = np.array([t5 - 40, t5 - 3, t5, t5 + 1, t5 + 3], np.int32)
    nn = np.ones(5, np.float32)
    W = rng.random((1, HARI_C, len(CUACA_F))).astype(np.float32)
    wk = np.zeros(3, int)
    X1 = fitur_tetap(Y, cc, hh, nn, S, wk, W, {}, {})
    W2 = W.copy()
    W2[0, t5 + 1:] = 99
    X2 = fitur_tetap(Y, cc[:3], hh[:3], nn[:3], S, wk, W2, {}, {})
    r5 = slice(5 * 3, 6 * 3)
    assert np.array_equal(X1[r5], X2[r5], equal_nan=True), "fitur minggu 5 melihat sesudah hari terbit"
    assert X1[5 * 3 + 0, 0] == 1 and X1[5 * 3 + 1, 0] == 1 and X1[5 * 3 + 0, 1] == 1   # n7 dan n30 (t-40 di luar 30 hari)
    assert X1[5 * 3 + 0, 2] == 2 and X1[5 * 3 + 2, 2] == 0                              # 3x3: sel tetangga ikut, sel jauh tidak
    assert X1[5 * 3 + 0, 6] == 3 and X1[5 * 3 + 2, 6] == 90                              # hari sejak api terakhir, dipotong 90
    j = len(API_F)
    assert np.allclose(X1[5 * 3, j:j + len(CUACA_F)], W[0, t5])
    # 7. deret cuaca: nilai hari t tidak bergantung hari sesudah t
    d = {"mulai": "20120101", **{v: [float(x) for x in rng.uniform(1, 30, HARI_C)] for v in VAR_C}}
    d["RH2M"] = [60.0] * HARI_C
    d["QV2M"] = [15.0] * HARI_C
    d["PS"] = [100.0] * HARI_C
    a = deret_cuaca(d)
    d2 = {k: (v[:3000] + [0.0] * (HARI_C - 3000) if isinstance(v, list) else v) for k, v in d.items()}
    b = deret_cuaca(d2)
    assert np.allclose(a[:3000], b[:3000], equal_nan=True), "deret cuaca melihat masa depan"
    assert abs(a[100, 0] - sum(d["PRECTOTCORR"][94:101])) < 1e-3
    # 8. kotak = jumlah tetangga brute force
    G = rng.random((NY, NX))
    K = kotak(G, 1)
    assert abs(K[100, 200] - G[99:102, 199:202].sum()) < 1e-6 and abs(K[0, 0] - G[:2, :2].sum()) < 1e-6
    # 9. minggu kalender: target minggu k = hari-dalam-tahun 7k+1..7k+7; hari terbit sehari sebelum
    assert tgl(hari_terbit(2019, 0)) == dt.date(2018, 12, 31) and tgl(hari_terbit(2019, 1) + 1) == dt.date(2019, 1, 8)
    # 10. recall teratas per grup & fase ENSO dari data
    p = np.array([.9, .1, .5, .4, .3, .2, .8, .7, .6, .05])
    yy = np.array([1, 0, 0, 0, 0, 0, 1, 1, 0, 0], bool)
    gr = np.array([0] * 5 + [1] * 5)
    assert recall_atas(p, yy, gr, porsi=.2) == 2 / 3
    f = fase_enso()
    assert f[2015] == "el_nino" and f[2023] == "el_nino" and f[2022] == "la_nina", f
    print("ok")

if __name__ == "__main__":
    {"api": api, "setara": setara, "cuaca": cuaca, "lahan": lahan, "siapkan": siapkan, "balik": balik, "nilai": nilai_balik, "uji": uji}[sys.argv[1]]()
