"""Lab: apakah PERUBAHAN TUTUPAN LAHAN tahunan memperbaiki model "akan membesar" (lolos.py)? (29 Okt 2026)

LAB, bukan produksi: butuh numpy + rasterio + requests (venv terpisah), tidak masuk workflow. Tidak menyentuh model_sebaran.json.
Sumber: Impact Observatory Annual LULC v02 (10 m, 2017-2023, CC BY 4.0) di Microsoft Planetary Computer, dibaca langsung dari
COG lewat overview 1/8 (80 m; dicek vs resolusi penuh: porsi kelas sama sampai +-0,2 poin) dengan token SAS anonim.

  venv/bin/python scripts/sebaran/lab_tutupan.py koordinat   # id baris lolos_baris.pkl -> lon/lat (peristiwa.jsonl)
  venv/bin/python scripts/sebaran/lab_tutupan.py tutupan     # hitung kelas dalam kotak 3x3 km per (peristiwa, tahun); bisa dilanjutkan
  venv/bin/python scripts/sebaran/lab_tutupan.py uji         # LOYO baseline vs +tutupan, bootstrap berpasangan, lihat-kedua 2024-26

Bocor waktu: peristiwa tahun T hanya memakai tutupan tahun <= T-1 (L = min(T-1, 2023)); perubahan = L dibanding L-2.
"""
import json, os, sys, time

import numpy as np

DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, DIR)
from umum import AKAR, MENTAH  # noqa: E402

KELUAR = os.path.join(MENTAH, "tutupan")
os.makedirs(KELUAR, exist_ok=True)
TAHUN = list(range(2017, 2024))
KELAS = [1, 2, 4, 5, 7, 8, 10, 11]       # air, pohon, vegetasi tergenang, tanaman, bangunan, tanah terbuka, awan, semak/padang
RAD = 19                                  # piksel 80 m -> kotak 39x39 = 3,1 km
BASE = "https://ai4edataeuwest.blob.core.windows.net/io-lulc/io-annual-lulc-v02/"


def koordinat():
    import pickle
    d = pickle.load(open(os.path.join(MENTAH, "lolos_baris.pkl"), "rb"))
    R = d["baris"]
    pos = {r[0]: i for i, r in enumerate(R)}
    lon, lat = np.full(len(R), np.nan), np.full(len(R), np.nan)
    with open(os.path.join(MENTAH, "peristiwa.jsonl")) as f:
        for ln in f:
            i = pos.get(ln[7:15])  # {"id":"E0000000" -> 8 karakter id
            if i is None:
                continue
            e = json.loads(ln)
            lon[i], lat[i] = e["lon0"], e["lat0"]
    assert not np.isnan(lon).any(), int(np.isnan(lon).sum())
    np.savez(os.path.join(KELUAR, "koord.npz"), lon=lon, lat=lat, th=np.array([r[1] for r in R]))
    print(len(R), "baris;", np.nanmin(lon), np.nanmax(lon), np.nanmin(lat), np.nanmax(lat))


def ubin(lon, lat):
    z = int((lon + 180) // 6) + 1
    b = "N" if lat >= 0 else "M" if lat >= -8 else "L"
    return f"{z:02d}{b}"


def tutupan():
    import requests, rasterio
    from rasterio.warp import transform
    k = np.load(os.path.join(KELUAR, "koord.npz"))
    lon, lat = k["lon"], k["lat"]
    N = len(lon)
    ub = np.array([ubin(a, b) for a, b in zip(lon, lat)])
    ubin_u = sorted(set(ub))
    print("ubin", {u: int((ub == u).sum()) for u in ubin_u})
    sel = [u for u in ubin_u if (ub == u).sum() >= 20]
    for th in TAHUN:
        fn = os.path.join(KELUAR, f"hitung_{th}.npy")
        C = np.load(fn) if os.path.exists(fn) else np.zeros((N, 12), np.uint16)
        sel_ok = os.path.join(KELUAR, f"selesai_{th}.json")
        ok = set(json.load(open(sel_ok))) if os.path.exists(sel_ok) else set()
        for u in sel:
            if u in ok:
                continue
            t = time.time()
            tok = requests.get("https://planetarycomputer.microsoft.com/api/sas/v1/token/io-lulc-annual-v02", timeout=30).json()["token"]
            with rasterio.open(f"{BASE}{u}_{th}0101-{th + 1}0101.tif?{tok}") as d:
                a = d.read(1, out_shape=(d.height // 8, d.width // 8))
                sx, sy = d.width / a.shape[1], d.height / a.shape[0]
                ix = np.flatnonzero(ub == u)
                xs, ys = transform("EPSG:4326", d.crs, lon[ix].tolist(), lat[ix].tolist())
                cx = ((np.array(xs) - d.transform.c) / d.transform.a / sx).astype(int)
                cy = ((np.array(ys) - d.transform.f) / d.transform.e / sy).astype(int)
                H, W = a.shape
                for j, i in enumerate(ix):
                    if not (0 <= cx[j] < W and 0 <= cy[j] < H):
                        continue
                    w = a[max(cy[j] - RAD, 0):cy[j] + RAD + 1, max(cx[j] - RAD, 0):cx[j] + RAD + 1]
                    C[i] = np.bincount(w.ravel(), minlength=12)[:12]
            ok.add(u)
            np.save(fn, C)
            json.dump(sorted(ok), open(sel_ok, "w"))
            print(th, u, len(ix), "peristiwa", round(time.time() - t, 1), "dtk", flush=True)


def fitur_tutupan():
    """-> (N, 7) float32 [tr_L, cr_L, ba_L, rg_L, d_tr, d_cr, d_open]; hilang = -9. L = min(T-1, 2023) (tanpa bocor waktu)."""
    k = np.load(os.path.join(KELUAR, "koord.npz"))
    th = k["th"]
    P = {}
    for y in TAHUN:
        C = np.load(os.path.join(KELUAR, f"hitung_{y}.npy")).astype(np.float64)
        valid = C.sum(1) - C[:, 0] - C[:, 10]
        ok = valid >= 0.5 * (2 * RAD + 1) ** 2   # piksel valid >= 50% kotak penuh
        F = np.full((len(C), 4), np.nan)
        for j, kls in enumerate([(2,), (5,), (8,), (11,)]):
            F[:, j] = C[:, list(kls)].sum(1) / np.where(valid > 0, valid, np.nan)
        F[~ok] = np.nan
        P[y] = F
    X = np.full((len(th), 7), -9.0, np.float32)
    for i_th in sorted(set(th.tolist())):
        L = min(i_th - 1, 2023)
        m = th == i_th
        if L >= 2017:
            X[m, :4] = np.nan_to_num(P[L][m], nan=-9.0)
        if L - 2 >= 2017:
            a, b = P[L][m], P[L - 2][m]
            d = np.stack([a[:, 0] - b[:, 0], a[:, 1] - b[:, 1], (a[:, 2] + a[:, 3]) - (b[:, 2] + b[:, 3])], 1)
            X[m, 4:] = np.nan_to_num(d, nan=-9.0)
    return X


# ---------------------------------------------------------------- uji balik
CFG = dict(pohon=150, dalam=5, lr=.06)
NEG = .05
SEEDS = (1, 2, 3)
TH_UJI = (2020, 2021, 2022, 2023)
NAMA_T = ["tr_L", "cr_L", "ba_L", "rg_L", "d_tr", "d_cr", "d_open"]


def muat_baris():
    import pickle, zlib
    d = pickle.load(open(os.path.join(MENTAH, "lolos_baris.pkl"), "rb"))
    R, kol = d["baris"], d["kolom"]
    import json as _j
    fitur = _j.load(open(os.path.join(MENTAH, "lolos_hasil.json")))["fitur"]
    c = [kol.index(f) for f in fitur]
    X = np.array([[r[7][j] for j in c] for r in R], np.float32)
    th = np.array([r[1] for r in R])
    y = np.array([r[4] for r in R])
    ikut = np.array([bool(r[4]) or (zlib.crc32(r[0].encode()) % 1000) < NEG * 1000 for r in R])
    return X, th, y, ikut, fitur


def skor_model(X, y, th, ikut, cols, latih_th, uji_mask):
    """Rata-rata skor mentah 3 benih; sampel latih = aturan lolos.ikut_latih (positif semua + 5% negatif, bobot 20)."""
    import gbdt_np as GN
    tr = np.flatnonzero(np.isin(th, latih_th) & ikut)
    w = np.where(y[tr] == 1, 1.0, 1 / NEG)
    w = w / w.mean()
    out = np.zeros(int(uji_mask.sum()))
    for s in SEEDS:
        m = GN.latih(X[tr][:, cols], y[tr], w, seed=s, **CFG)
        out += GN.skor(m, X[uji_mask][:, cols])
    return out / len(SEEDS)


def ap_auc_w(skor, y, w):
    """AP dan AUC berbobot (bobot = banyaknya salinan bootstrap), skor kontinu (seri diabaikan)."""
    o = np.argsort(-skor, kind="mergesort")
    yy, ww = y[o], w[o]
    wp, wn = ww * yy, ww * (1 - yy)
    cp, cn, ca = np.cumsum(wp), np.cumsum(wn), np.cumsum(ww)
    P, Nn = wp.sum(), wn.sum()
    ap = float((wp * cp / np.maximum(ca, 1e-12)).sum() / P)
    auc = float((wp * (Nn - cn)).sum() / (P * Nn))
    return ap, auc


def presisi_recall70(skor, y):
    o = np.argsort(-skor, kind="mergesort")
    yy = y[o]
    cp = np.cumsum(yy)
    k = int(np.searchsorted(cp, int(np.ceil(.7 * yy.sum()))) + 1)
    return float(cp[k - 1] / k)


def uji():
    t0 = time.time()
    X, th, y, ikut, fitur = muat_baris()
    T = fitur_tutupan()
    XT = np.hstack([X, T])
    n0 = X.shape[1]
    kolom = {"baseline": list(range(n0)), "B+tutupan": list(range(n0 + 7)),
             "B+tingkat": list(range(n0)) + [n0 + i for i in range(4)], "B+perubahan": list(range(n0)) + [n0 + i for i in range(4, 7)]}
    kl = np.load(os.path.join(KELUAR, "koord.npz"))
    klaster = (th.astype(np.int64) * 100000 + np.floor(kl["lon"]).astype(np.int64) * 200 + np.floor(kl["lat"]).astype(np.int64) + 100)
    H = {"dibuat": time.strftime("%Y-%m-%d"), "cfg": CFG, "benih": list(SEEDS), "n_fitur_baseline": n0,
         "cakupan_tutupan": {str(t): round(float((T[th == t, 0] > -9).mean()), 3) for t in sorted(set(th.tolist()))}}
    tr_all = [t for t in range(2015, 2024)]
    S = {m: np.full(len(y), np.nan) for m in kolom}
    for t in TH_UJI:
        mask = th == t
        for m, cols in kolom.items():
            S[m][mask] = skor_model(XT, y, th, ikut, cols, [a for a in tr_all if a != t], mask)
        print("lipat", t, round(time.time() - t0), "dtk", flush=True)
    kedua = (th >= 2024)
    for m, cols in kolom.items():
        S[m][kedua] = skor_model(XT, y, th, ikut, cols, tr_all, kedua)
    print("lihat kedua", round(time.time() - t0), "dtk", flush=True)
    np.savez_compressed(os.path.join(KELUAR, "skor_uji.npz"), th=th, y=y, klaster=klaster, **{m.replace("+", "_"): v for m, v in S.items()})

    def blok(mask, label):
        yy, kk = y[mask], klaster[mask]
        r = {"n": int(mask.sum()), "lolos": int(yy.sum())}
        for m in kolom:
            ap, auc = ap_auc_w(S[m][mask], yy, np.ones(len(yy)))
            r[m] = {"ap": round(ap, 4), "auc": round(auc, 4), "presisi_recall70": round(presisi_recall70(S[m][mask], yy), 4)}
        rng = np.random.default_rng(11)
        ku, inv = np.unique(kk, return_inverse=True)
        d = {m: [] for m in kolom if m != "baseline"}
        for _ in range(400):
            c = np.bincount(rng.integers(0, len(ku), len(ku)), minlength=len(ku))
            w = c[inv].astype(float)
            ab = ap_auc_w(S["baseline"][mask], yy, w)
            for m in d:
                a2 = ap_auc_w(S[m][mask], yy, w)
                d[m].append((a2[0] - ab[0], a2[1] - ab[1]))
        for m in d:
            a = np.array(d[m])
            ap0, auc0 = r[m]["ap"] - r["baseline"]["ap"], r[m]["auc"] - r["baseline"]["auc"]
            r[m]["d_ap"] = [round(ap0, 4)] + [round(float(np.percentile(a[:, 0], q)), 4) for q in (2.5, 97.5)]
            r[m]["d_auc"] = [round(auc0, 4)] + [round(float(np.percentile(a[:, 1], q)), 4) for q in (2.5, 97.5)]
            r[m]["d_presisi70"] = round(r[m]["presisi_recall70"] - r["baseline"]["presisi_recall70"], 4)
        r["klaster"] = int(len(ku))
        print(label, json.dumps(r, ensure_ascii=False), flush=True)
        return r

    H["luar_lipatan_2020_2023"] = blok(np.isin(th, TH_UJI), "2020-2023")
    H["per_tahun"] = {str(t): blok(th == t, str(t)) for t in TH_UJI}
    H["lihat_kedua_2024_2026"] = blok(kedua, "2024-2026")
    H["per_tahun_kedua"] = {str(t): blok(th == t, str(t)) for t in (2024, 2025, 2026)}
    json.dump(H, open(os.path.join(KELUAR, "hasil_uji.json"), "w"), ensure_ascii=False, indent=1)
    print("selesai", round(time.time() - t0), "dtk")


if __name__ == "__main__":
    {"koordinat": koordinat, "tutupan": tutupan, "uji": uji}[sys.argv[1]]()
