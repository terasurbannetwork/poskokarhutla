"""#4 MapBiomas Indonesia -> public/data/transisi_lahan.json   (LAB: numpy; tidak jalan di produksi)

AKSES: bucket publik Google Cloud `mapbiomas-public`, prefix initiatives/indonesia/collection_2/ (tanpa kunci; UA jujur).
  coverage/indonesia_coverage_{2000..2022}.tif  (30 m, kelas uint8, ~230 MB, GeoTIFF ubin 512 LZW)
  fire-col1/annual/fire_annual_{2013..2023}.tif (nilai = kelas tutupan piksel yang terbakar tahun itu, 0 = tidak terbakar)
Dibaca per ubin lewat HTTP Range (tif_lzw.py), TANPA mengunduh seluruh berkas. rasterio/GDAL tidak terpasang -> pembaca sendiri.
Kelas 35 = sawit (diverifikasi: modus kelas di 40 konsesi sawit Kemenhut/GFW = 3 hutan, 35, 13; hanya 35 yang khas sawit).
Legenda lain tidak diterjemahkan (berkas legenda koleksi 2 tidak ada di bucket) -> keluaran memakai kode kelas.

Sampel: 120 ubin 512x512 piksel (~15 km) acak di sel riwayat api f>=6 (riwayat_grid.json). Semua piksel dalam ubin dipakai.
  BIAS: kerangka sampel = daerah rawan api, jadi hasil berlaku untuk daerah itu, bukan seluruh Indonesia.
Rumus:
  Matriks Markov 4 tahun: M[c,c'] = n(cov_{Y-1}=c, cov_{Y+3}=c') / n(cov_{Y-1}=c), terpisah untuk piksel terbakar tahun Y dan tidak terbakar.
  Sasaran: sawit_3th = (cov_{Y+3} == 35) untuk piksel terbakar di Y yang BUKAN sawit di Y-1 (sawit jarang berbalik, jadi sawit di Y+3 ~ jadi sawit <= 3 tahun).
  Model A (matriks) : P = M_latih[c] (laju per kelas awal, dilatih Y=2015: cov 2014 -> 2018).
  Model B (logistik): kelas awal (one-hot) + pangsa sawit tetangga (jendela 33x33 px ~ 1 km) di Y-1.
  Uji: Y=2019 (cov 2018 -> 2022), kelas/koefisien dari 2015. Pembanding: laju dasar latih, dan 'tetangga saja' (persistensi spasial).
  LOLOS bila AUC(B) > AUC(tetangga saja) + 0,02 DAN Brier(B) < Brier(laju dasar).
  Ketat: latih pada ubin genap saja, uji pada ubin ganjil (pisah waktu DAN ruang).
Keterbatasan: tutupan MapBiomas hasil klasifikasi; 'jadi sawit' bisa artefak klasifikasi. Ubin tanpa margin (pinggir ubin: jendela terpotong).
Pakai: python3 lab_mapbiomas.py panen | olah | uji"""
import json, os, sys, random, datetime as dt, glob
sys.path.insert(0, os.path.dirname(__file__))
import numpy as np
from tif_lzw import Tif
from panen_util import tulis, auc, brier

RAIZ = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
D = os.path.join(RAIZ, "public", "data")
RAW = os.path.join(RAIZ, "data", "raw", "mapbiomas")
B = "https://storage.googleapis.com/mapbiomas-public/initiatives/indonesia/collection_2/"
SAWIT = 35
TILE = 512
N_UBIN = 120
EVENT = {2015: (2014, 2018), 2019: (2018, 2022)}   # tahun api -> (cov sebelum, cov sesudah +3)
W = 16                                              # setengah jendela tetangga (33x33)


def blok(t, ix0, iy0, n=TILE):
    """Piksel [iy0:iy0+n, ix0:ix0+n] dari Tif t (pad 0 di luar citra)."""
    out = np.zeros((n, n), np.uint8)
    for ty in range(max(0, iy0 // t.th), min(t.ny, (iy0 + n - 1) // t.th + 1)):
        for tx in range(max(0, ix0 // t.tw), min(t.nx, (ix0 + n - 1) // t.tw + 1)):
            a = t.tile(tx, ty)
            x0, y0 = tx * t.tw, ty * t.th
            xa, xb = max(x0, ix0), min(x0 + t.tw, ix0 + n); ya, yb = max(y0, iy0), min(y0 + t.th, iy0 + n)
            out[ya - iy0:yb - iy0, xa - ix0:xb - ix0] = a[ya - y0:yb - y0, xa - x0:xb - x0]
    return out


def pangsa_tetangga(mask, w=W):
    """Rata-rata mask (0/1) di jendela (2w+1)^2, jendela dipotong di tepi (integral image)."""
    m = mask.astype(np.float64); n = m.shape[0]
    I = np.zeros((n + 1, n + 1)); I[1:, 1:] = m.cumsum(0).cumsum(1)
    i = np.arange(n); lo = np.clip(i - w, 0, n); hi = np.clip(i + w + 1, 0, n)
    s = I[hi][:, hi] - I[lo][:, hi] - I[hi][:, lo] + I[lo][:, lo]
    c = np.outer(hi - lo, hi - lo)
    return s / c


def pilih_ubin(cov, k=N_UBIN):
    g = json.load(open(os.path.join(D, "riwayat_grid.json")))
    ub = set()
    for ix, iy, f, r in g["sel_data"]:
        if f >= 6:
            lon = g["x0"] + (ix + .5) * g["sel"]; lat = g["y1"] - (iy + .5) * g["sel"]
            px, py = cov.px(lon, lat)
            if 0 <= px < cov.W and 0 <= py < cov.H:
                ub.add((px // TILE, py // TILE))
    ub = sorted(ub); random.Random(7).shuffle(ub)
    return ub[:k], len(ub)


def panen():
    os.makedirs(RAW, exist_ok=True)
    cv = {y: Tif(B + f"coverage/indonesia_coverage_{y}.tif") for y in (2014, 2018, 2022)}
    fr = {y: Tif(B + f"fire-col1/annual/fire_annual_{y}.tif") for y in (2015, 2019)}
    c0 = cv[2018]
    for y, f in fr.items():
        assert abs(f.sx - c0.sx) < 1e-12
    ubin, total = pilih_ubin(c0)
    print("ubin kandidat", total, "dipakai", len(ubin), flush=True)
    for i, (tx, ty) in enumerate(ubin):
        p = os.path.join(RAW, f"u_{tx}_{ty}.npz")
        if os.path.exists(p): continue
        ix0, iy0 = tx * TILE, ty * TILE
        d = {}
        for y, t in cv.items():
            assert abs((t.x0 - c0.x0) / c0.sx) < 1e-3 and abs((t.y0 - c0.y0) / c0.sy) < 1e-3  # grid sama antartahun
            d[f"c{y}"] = blok(t, ix0, iy0)
        for y, f in fr.items():
            dx = round((c0.x0 - f.x0) / c0.sx); dy = round((f.y0 - c0.y0) / c0.sy)
            d[f"f{y}"] = blok(f, ix0 + dx, iy0 + dy)
        np.savez_compressed(p, **d)
        print(i + 1, "/", len(ubin), tx, ty, flush=True)


def one_hot(pre, kelas):
    X = np.zeros((len(pre), len(kelas) + 1))
    for j, k in enumerate(kelas):
        X[:, j] = pre == k
    X[:, -1] = ~np.isin(pre, kelas)
    return X


def newton(X, y, l2=1.0, it=30):
    n, m = X.shape
    mu = X.mean(0); sd = X.std(0); sd[sd == 0] = 1
    Z = np.hstack([np.ones((n, 1)), (X - mu) / sd]); w = np.zeros(m + 1)
    for _ in range(it):
        p = 1 / (1 + np.exp(-np.clip(Z @ w, -30, 30)))
        g = Z.T @ (p - y); H = (Z * (p * (1 - p))[:, None]).T @ Z
        reg = np.eye(m + 1) * l2; reg[0, 0] = 0
        step = np.linalg.solve(H + reg, g + reg @ w); w -= step
        if np.abs(step).max() < 1e-7: break
    return lambda Xn: 1 / (1 + np.exp(-np.clip(np.hstack([np.ones((len(Xn), 1)), (Xn - mu) / sd]) @ w, -30, 30)))


def kumpul():
    """-> per tahun api: dict pre, post, nbr, ubin (piksel terbakar, bukan sawit sebelumnya, tutupan sah) + matriks hitung."""
    out = {y: {"pre": [], "post": [], "nbr": [], "ubin": [], "mb": np.zeros((64, 64), np.int64), "mu": np.zeros((64, 64), np.int64)} for y in EVENT}
    for p in sorted(glob.glob(os.path.join(RAW, "u_*.npz"))):
        z = np.load(p); tx, ty = map(int, os.path.basename(p)[2:-4].split("_"))
        for y, (a, b) in EVENT.items():
            pre, post, fire = z[f"c{a}"], z[f"c{b}"], z[f"f{y}"] > 0
            ok = (pre > 0) & (post > 0)
            nb = pangsa_tetangga(pre == SAWIT)
            O = out[y]
            m = ok & fire & (pre != SAWIT)
            O["pre"].append(pre[m]); O["post"].append(post[m]); O["nbr"].append(nb[m]); O["ubin"].append(np.full(m.sum(), (tx + ty) % 2, np.int8))
            for key, mm in (("mb", ok & fire), ("mu", ok & ~fire)):
                np.add.at(O[key], (np.minimum(pre[mm], 63), np.minimum(post[mm], 63)), 1)
    for y, O in out.items():
        for k in ("pre", "post", "nbr", "ubin"): O[k] = np.concatenate(O[k])
    return out


def olah():
    dat = kumpul()
    tr, te = dat[2015], dat[2019]
    assert len(tr["pre"]) > 1000 and len(te["pre"]) > 1000, "ubin belum dipanen"
    cls, cn = np.unique(tr["pre"], return_counts=True)
    kelas = [int(c) for c, n in zip(cls, cn) if n / cn.sum() >= 0.01]

    def evaluasi(A, Bt, tag):
        ya, yb = (A["post"] == SAWIT).astype(float), (Bt["post"] == SAWIT).astype(float)
        base = ya.mean()
        laju = {k: ya[A["pre"] == k].mean() for k in kelas}
        pa = np.array([laju.get(int(c), base) for c in Bt["pre"]])                       # Model A
        f = newton(np.hstack([one_hot(A["pre"], kelas), A["nbr"][:, None]]), ya)
        pb = f(np.hstack([one_hot(Bt["pre"], kelas), Bt["nbr"][:, None]]))               # Model B
        pn = Bt["nbr"]                                                                    # pembanding: tetangga saja
        ad = lambda s: round(auc(yb.astype(int).tolist(), s.tolist()), 3) if 0 < yb.sum() < len(yb) else None
        r = {"n_latih": int(len(ya)), "n_uji": int(len(yb)), "laju_sawit_latih": round(float(base), 4), "laju_sawit_uji": round(float(yb.mean()), 4),
             "auc_matriks_A": ad(pa), "auc_logistik_B": ad(pb), "auc_tetangga_saja": ad(pn),
             "brier_matriks_A": round(float(((pa - yb) ** 2).mean()), 5), "brier_logistik_B": round(float(((pb - yb) ** 2).mean()), 5),
             "brier_laju_dasar": round(float(((base - yb) ** 2).mean()), 5)}
        ok = r["auc_logistik_B"] is not None and r["auc_logistik_B"] > r["auc_tetangga_saja"] + .02 and r["brier_logistik_B"] < r["brier_laju_dasar"]
        r["vonis"] = "LOLOS" if ok else "GAGAL"
        r["alasan"] = (f"AUC B {r['auc_logistik_B']} vs tetangga-saja {r['auc_tetangga_saja']} (syarat +0,02); "
                       f"Brier B {r['brier_logistik_B']} vs laju dasar {r['brier_laju_dasar']}")
        return r
    utama = evaluasi(tr, te, "waktu")
    sel = lambda O, par: {k: O[k][O["ubin"] == par] for k in ("pre", "post", "nbr")}
    ketat = evaluasi(sel(tr, 0), sel(te, 1), "waktu+ruang")
    # lift terbakar vs tidak (2019, per kelas awal): P(sawit | terbakar) / P(sawit | tidak terbakar)
    def tabel(O, y):
        mb, mu = O["mb"], O["mu"]; kl = {}
        for k in kelas:
            nb_, nu_ = mb[k].sum(), mu[k].sum()
            if nb_ < 200 or nu_ < 200: continue
            pb_, pu_ = mb[k, SAWIT] / nb_, mu[k, SAWIT] / nu_
            top = lambda row, n: {int(c): round(float(row[c] / n), 4) for c in np.argsort(-row)[:5] if row[c] / n >= 0.005}
            kl[str(k)] = {"n_terbakar": int(nb_), "n_tidak": int(nu_), "ke_terbakar": top(mb[k], nb_), "ke_tidak": top(mu[k], nu_),
                          "p_sawit_terbakar": round(float(pb_), 4), "p_sawit_tidak": round(float(pu_), 5),
                          "lift": round(float(pb_ / pu_), 2) if pu_ > 0 else None}
        return kl
    out = {"dibuat": dt.datetime.now(dt.timezone.utc).isoformat(timespec="minutes"),
           "jenis": "model prediksi (uji balik waktu: latih api 2015, uji api 2019)",
           "sumber": "MapBiomas Indonesia Koleksi 2 (tutupan 2000-2022) + MapBiomas Fire Indonesia Koleksi 1 (2013-2023)",
           "kelas_sawit": SAWIT, "catatan_kelas": "kode kelas MapBiomas Indonesia; 35 = sawit (diverifikasi empiris), 3 = hutan; legenda lain tidak diterjemahkan",
           "sampel": {"ubin_512px": len(glob.glob(os.path.join(RAW, "u_*.npz"))), "kerangka": "sel riwayat api f>=6 (bias ke daerah rawan api)",
                      "piksel_terbakar_2015": int(len(tr["pre"])), "piksel_terbakar_2019": int(len(te["pre"]))},
           "rumus": "P(sawit di Y+3 | terbakar di Y, kelas awal c, pangsa sawit tetangga); matriks Markov 4 tahun per kelas awal",
           "uji_balik_waktu": utama, "uji_balik_waktu_ruang": ketat,
           "matriks_api_2015": tabel(tr, 2015) if False else tabel(dat[2015], 2015), "matriks_api_2019": tabel(dat[2019], 2019),
           "atribusi": "MapBiomas Indonesia (mapbiomas.org), Auriga Nusantara dkk.", "lisensi": "CC BY-SA 4.0 (MapBiomas); cantumkan atribusi"}
    print(tulis(os.path.join(D, "transisi_lahan.json"), out), "bita")
    print(json.dumps({"waktu": utama, "waktu+ruang": ketat}, indent=1, ensure_ascii=False))


def uji():
    m = np.zeros((6, 6)); m[2:4, 2:4] = 1
    p = pangsa_tetangga(m, 1)
    assert abs(p[0, 0] - 0.0) < 1e-9 and abs(p[2, 2] - 4 / 9) < 1e-9 and abs(p[5, 5]) < 1e-9
    rng = np.random.default_rng(0); X = rng.normal(size=(3000, 1)); y = (rng.random(3000) < 1 / (1 + np.exp(-2 * X[:, 0]))).astype(float)
    f = newton(X, y); assert auc(y.astype(int).tolist(), f(X).tolist()) > .8
    print("lab_mapbiomas uji OK")


if __name__ == "__main__":
    a = sys.argv[1] if len(sys.argv) > 1 else "olah"
    {"panen": panen, "olah": olah, "uji": uji}[a]()
