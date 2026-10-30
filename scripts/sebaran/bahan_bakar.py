"""Lab: apakah TINGGI KANOPI -> MUATAN BAHAN BAKAR memperbaiki model "akan membesar" (lolos.py)? (29 Okt 2026, RENCANA-PANEN #7)

LAB, bukan produksi: butuh numpy + rasterio (venv terpisah), tidak masuk workflow, TIDAK menyentuh model_sebaran.json
maupun public/sebaran_model.js. Hasil: LOLOS/GAGAL apa adanya; tidak ada pemasangan ke produksi.

Sumber: Meta/WRI High Resolution Canopy Height Maps v1 (Tolan dkk. 2024, Remote Sens. Environ. 300:113888), 1,19 m, uint8 meter,
S3 publik tanpa kunci: s3://dataforgood-fb-data/forests/v1/alsgedi_global_v6_float/chm/<quadkey zoom-9>.tif (lisensi CC BY 4.0).
Ubin 20-220 MB, tanpa overview, blok = 1 baris (65536 px): mengunduh utuh tidak layak (jaringan ~0,5 MB/s), maka tiap sel kisi model
375 m (umum.sel) dibaca SEBAGAI SAMPEL JARANG lewat HTTP range: 3 irisan baris x 314 piksel penuh (selang ~143 m) -> rata-rata & maks.
Hanya sel peristiwa yang ikut sampel latih lolos.py (positif + 5% negatif) di ubin yang selesai dalam anggaran waktu (BAHAN_MENIT).
Self-check `uji` butuh numpy (untuk AUC berbobot).

Muatan bahan bakar W = A * h**B  (Mg/ha). Bentuk pangkat tinggi-kanopi -> biomassa di atas tanah: Mascaro dkk. 2011 (Glob. Change Biol.
17:1190), Asner & Mascaro 2014 (Remote Sens. Environ. 140:614). KOEFISIEN A, B DI SINI ASUMSI, BELUM DICOCOKKAN KE PLOT: pohon GBDT
tak berubah oleh transformasi monoton satu fitur, jadi metrik uji tidak bergantung pada A, B (dibuktikan self-check).
Sebelum W dipakai sebagai angka tonase di layar, A, B wajib dikalibrasi ke plot (mis. data plot BIOMASSA/GEDI L4A).

  bahan_bakar.py uji         # self-check fungsi murni (tanpa jaringan/numpy)
  bahan_bakar.py koordinat   # baris lolos provinsi PRIORITAS -> sel 375 m, daftar ubin
  bahan_bakar.py ubin        # unduh + agregasi ubin (bisa dilanjutkan), tulis public/data/bahan_bakar.json
  bahan_bakar.py uji_balik   # CV 2015-2023 + uji 2024-26, dengan vs tanpa fitur (kode jalan lolos.py)

Lingkungan: SEBARAN_MENTAH = data/raw/sebaran asli (berisi lolos_baris.pkl, peristiwa.jsonl); BAHAN_KELUAR = folder kerja.
"""
import json, math, os, sys, time

DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, DIR)
import umum  # noqa: E402
from umum import D, NX, X0, Y0, PRIORITAS, PUBLIK  # noqa: E402

MENTAH = os.environ.get("SEBARAN_MENTAH", umum.MENTAH)
KELUAR = os.environ.get("BAHAN_KELUAR", os.path.join(MENTAH, "bahan_bakar"))
S3 = "https://dataforgood-fb-data.s3.amazonaws.com/forests/v1/alsgedi_global_v6_float/chm/"
ZOOM = 9
PIX = 1024          # ubin dibaca 1024x1024 (~76 m)
JENDELA = 2         # +-2 piksel -> 5x5 (~382 m ~ satu sel 375 m)
A_W, B_W = 2.0, 1.5  # ASUMSI, lihat docstring
MERC = 6378137.0


# ---------------- fungsi murni ----------------
def quadkey(lon, lat, z=ZOOM):
    lat = max(min(lat, 85.05112878), -85.05112878)
    n = 1 << z
    x = int((lon + 180) / 360 * n)
    y = int((1 - math.asinh(math.tan(math.radians(lat))) / math.pi) / 2 * n)
    q = ""
    for i in range(z, 0, -1):
        m = 1 << (i - 1)
        q += str((1 if x & m else 0) + (2 if y & m else 0))
    return q


def merkator(lon, lat):
    return MERC * math.radians(lon), MERC * math.log(math.tan(math.pi / 4 + math.radians(lat) / 2))


def muatan(h, a=A_W, b=B_W):
    """W = a * h**b (Mg/ha); h <= 0 -> 0."""
    return a * h ** b if h > 0 else 0.0


def piksel(lon, lat, kiri, atas, res):
    x, y = merkator(lon, lat)
    return int((x - kiri) / res), int((atas - y) / res)


def jendela(arr, c, r, w=JENDELA):
    """(rata-rata, maks) blok (2w+1)^2 di sekitar kolom c, baris r; arr = list of list; di luar batas dipotong. Kosong -> None."""
    H, W = len(arr), len(arr[0])
    v = [arr[j][i] for j in range(max(r - w, 0), min(r + w + 1, H)) for i in range(max(c - w, 0), min(c + w + 1, W))]
    return (sum(v) / len(v), max(v)) if v else None


def diuji_self():
    # quadkey: pusat ubin contoh Meta (EPSG:3857 kiri -10175297, bawah 16906647) harus kembali ke nama berkasnya
    cx, cy = (-10175297.2 + -10097025.7) / 2, (16906647.7 + 16984919.2) / 2
    lon, lat = math.degrees(cx / MERC), math.degrees(2 * math.atan(math.exp(cy / MERC)) - math.pi / 2)
    assert quadkey(lon, lat) == "001311332", quadkey(lon, lat)
    assert len(quadkey(102.0, 0.5)) == ZOOM
    x, y = merkator(0, 0)
    assert abs(x) < 1e-9 and abs(y) < 1e-6
    assert abs(merkator(180, 0)[0] - math.pi * MERC) < 1e-6
    assert muatan(0) == 0 and muatan(-3) == 0 and abs(muatan(4, 1, 2) - 16) < 1e-12
    assert muatan(10) > muatan(5) > muatan(1) > 0   # monoton -> pohon GBDT tak terpengaruh A, B
    a = [[0] * 7 for _ in range(7)]
    a[3][3] = 10
    assert jendela(a, 3, 3) == (10 / 25, 10)
    assert jendela(a, 0, 0, 1) == (0.0, 0)          # sudut: terpotong, 4 piksel
    assert piksel(0, 0, -1000.0, 1000.0, 100.0) == (10, 10)
    import numpy as np
    p, yv = np.array([.1, .4, .35, .8]), np.array([0, 0, 1, 1])
    assert abs(auc_w(p, yv, np.ones(4)) - .75) < 1e-12                      # kasus buku teks sklearn
    assert abs(auc_w(np.array([.5, .5]), np.array([0, 1]), np.ones(2)) - .5) < 1e-12   # seri = 0,5
    assert abs(auc_w(p, yv, np.array([1, 1, 1, 1.])) - auc_w(np.r_[p, p], np.r_[yv, yv], np.ones(8))) < 1e-12
    assert abs(ap_w(np.array([.9, .8, .1]), np.array([1, 0, 1]), np.ones(3)) - (1 + 2 / 3) / 2) < 1e-12
    print("ok")


# ---------------- baris lolos di provinsi prioritas ----------------
def baris_prioritas():
    import pickle
    d = pickle.load(open(os.path.join(MENTAH, "lolos_baris.pkl"), "rb"))
    R = d["baris"]
    import zlib
    NEG = .05  # = lolos.NEG: baris yang ikut = semua positif + 5% negatif (kunci crc32 id), bobot negatif 1/NEG
    return [i for i, r in enumerate(R) if r[2] in PRIORITAS and (r[4] or (zlib.crc32(r[0].encode()) % 1000) < NEG * 1000)], R


def koordinat():
    import numpy as np
    os.makedirs(KELUAR, exist_ok=True)
    idx, R = baris_prioritas()
    pos = {R[i][0]: i for i in idx}
    lon, lat = {}, {}
    with open(os.path.join(MENTAH, "peristiwa.jsonl")) as f:
        for ln in f:
            i = pos.get(ln[7:15])
            if i is None:
                continue
            e = json.loads(ln)
            lon[i], lat[i] = e["lon0"], e["lat0"]
    idx = [i for i in idx if i in lon]
    L = np.array([lon[i] for i in idx]); B = np.array([lat[i] for i in idx])
    kk = np.array([umum.sel(a, b) for a, b in zip(L, B)])
    qk = np.array([quadkey(*umum.pusat(int(k))) for k in kk])
    np.savez(os.path.join(KELUAR, "koord.npz"), baris=np.array(idx), kk=kk, qk=qk)
    u = {q: int(len(set(kk[qk == q].tolist()))) for q in sorted(set(qk.tolist()))}
    print(len(idx), "baris prioritas;", len(set(kk.tolist())), "sel unik;", len(u), "ubin", u)


# ---------------- agregasi ubin ----------------
BARIS_UJI = (-120, 0, 120)   # tiga baris piksel 1,19 m (selang ~143 m) per sel, tiap baris selebar sel (314 piksel)
LEBAR = 157                  # +-157 piksel = 375 m


def baca_sel(d, kiri, atas, res, lon, lat):
    """-> (rata, maks) tinggi kanopi (m) dari 3 irisan baris 1x314 piksel resolusi penuh di sekitar pusat sel; None bila di luar ubin."""
    import numpy as np
    from rasterio.windows import Window
    c, r = piksel(lon, lat, kiri, atas, res)
    v = []
    for dr in BARIS_UJI:
        rr = r + dr
        if 0 <= rr < d.height and c - LEBAR >= 0 and c + LEBAR < d.width:
            v.append(d.read(1, window=Window(c - LEBAR, rr, 2 * LEBAR + 1, 1)).astype(np.float32))
    if not v:
        return None
    v = np.concatenate(v, axis=None)
    return float(v.mean()), float(v.max())


def ubin():
    import numpy as np, rasterio, concurrent.futures as cf
    k = np.load(os.path.join(KELUAR, "koord.npz"))
    kk, qk = k["kk"], k["qk"]
    os.makedirs(os.path.join(KELUAR, "ubin"), exist_ok=True)
    batas = time.time() + 60 * float(os.environ.get("BAHAN_MENIT", "45"))
    env = dict(GDAL_HTTP_MAX_RETRY="4", GDAL_HTTP_RETRY_DELAY="2", GDAL_HTTP_TIMEOUT="60", CPL_VSIL_CURL_ALLOWED_EXTENSIONS=".tif",
               GDAL_DISABLE_READDIR_ON_OPEN="EMPTY_DIR", VSI_CACHE="TRUE", GDAL_HTTP_MULTIPLEX="YES")
    urut = sorted(set(qk.tolist()), key=lambda q: -len(set(kk[qk == q].tolist())))
    for q in urut:
        fn = os.path.join(KELUAR, "ubin", q + ".npz")
        if os.path.exists(fn):
            continue
        if time.time() > batas:
            print("anggaran waktu habis; ubin tersisa diabaikan (baris dikeluarkan dari KEDUA lengan)", flush=True)
            break
        sel = np.unique(kk[qk == q])
        t = time.time()
        rata, maks = np.full(len(sel), np.nan, np.float32), np.full(len(sel), np.nan, np.float32)
        try:
            with rasterio.Env(**env):
                with rasterio.open(S3 + q + ".tif") as d0:
                    kiri, atas, res = d0.bounds.left, d0.bounds.top, d0.res[0]

                def kerja(bagian):
                    with rasterio.Env(**env), rasterio.open(S3 + q + ".tif") as d:
                        out = []
                        for n in bagian:
                            for coba in range(4):
                                try:
                                    out.append((n, baca_sel(d, kiri, atas, res, *umum.pusat(int(sel[n])))))
                                    break
                                except Exception:
                                    time.sleep(2 ** coba)
                        return out
                bag = [list(range(a, len(sel), 12)) for a in range(12)]
                with cf.ThreadPoolExecutor(12) as ex:
                    for out in ex.map(kerja, bag):
                        for n, v in out:
                            if v:
                                rata[n], maks[n] = v
        except Exception as ex:
            print(q, "GAGAL", type(ex).__name__, str(ex)[:100], flush=True)
            continue
        np.savez(fn, sel=sel, rata=rata, maks=maks)
        print(q, len(sel), "sel", int(np.isfinite(rata).sum()), "terbaca", round(time.time() - t), "dtk", flush=True)
    S, Rt, Mk = [], [], []
    for q in sorted(set(qk.tolist())):
        fn = os.path.join(KELUAR, "ubin", q + ".npz")
        if os.path.exists(fn):
            z = np.load(fn)
            S += z["sel"].tolist(); Rt += z["rata"].tolist(); Mk += z["maks"].tolist()
    ok = [i for i, v in enumerate(Rt) if v == v]
    h = np.array([Rt[i] for i in ok])
    keluar = {
        "dibuat": time.strftime("%Y-%m-%d"), "jenis": "fitur (bukan prediksi)", "provinsi": PRIORITAS,
        "sumber": "Meta/WRI High Resolution Canopy Height Maps v1 (Tolan dkk. 2024, RSE 300:113888), 1,19 m",
        "atribusi": "Meta & World Resources Institute, CC BY 4.0; s3://dataforgood-fb-data/forests/v1/alsgedi_global_v6_float",
        "lisensi": "CC BY 4.0", "kisi": {"d": D, "x0": X0, "y0": Y0, "nx": NX, "kunci": "j*nx+i"},
        "agregasi": f"rata-rata & maks dari {len(BARIS_UJI)} irisan baris {2 * LEBAR + 1} piksel (1,19 m) di sekitar pusat sel 375 m (sampel jarang, bukan seluruh sel)",
        "cakupan": "hanya sel yang memuat peristiwa api yang ikut sampel latih lolos.py (semua positif + 5% negatif), di ubin yang selesai terunduh",
        "muatan": {"rumus": "W = a*h^b (Mg/ha)", "a": A_W, "b": B_W, "status_koefisien": "ASUMSI, BELUM DIKALIBRASI KE PLOT",
                   "rujukan": ["Mascaro dkk. 2011, Glob. Change Biol. 17:1190", "Asner & Mascaro 2014, Remote Sens. Environ. 140:614"]},
        "n_sel": len(ok), "sel_tanpa_nilai": len(S) - len(ok),
        "ringkas": {"h_rata_p10_p50_p90": [round(float(np.percentile(h, p)), 1) for p in (10, 50, 90)] if len(h) else None},
        "sel": [S[i] for i in ok], "h_rata": [round(Rt[i], 1) for i in ok], "h_maks": [round(Mk[i]) for i in ok],
    }
    p = os.path.join(KELUAR, "bahan_bakar.json")
    json.dump(keluar, open(p, "w"), separators=(",", ":"))
    print("tulis", p, os.path.getsize(p), "B;", len(ok), "sel")


# ---------------- uji balik ----------------
def auc_w(p, y, w):
    """AUC berbobot (seri = setengah). p, y, w: array numpy."""
    import numpy as np
    o = np.argsort(p, kind="mergesort")
    p, y, w = p[o], y[o], w[o]
    u, awal = np.unique(p, return_index=True)
    wn = np.add.reduceat(w * (1 - y), awal)       # bobot negatif per nilai unik
    wp = np.add.reduceat(w * y, awal)
    cn = np.cumsum(wn) - wn                        # negatif dengan skor lebih rendah
    return float((wp * (cn + wn / 2)).sum() / (wp.sum() * wn.sum()))


def ap_w(p, y, w):
    import numpy as np
    o = np.argsort(-p, kind="mergesort")
    y, w = y[o], w[o]
    tp, tot = np.cumsum(w * y), np.cumsum(w)
    return float((w * y * tp / tot).sum() / (w * y).sum())


def uji_balik():
    """Kode jalan = lolos.py: latih(idx, fitur, cfg) pada lipatan tinggal-satu-tahun 2015-2023 -> Platt dari luar-lipatan ->
    model 2015-2023 diuji pada 2024-26. Konfigurasi & fitur = yang dipakai produksi (lolos_hasil.json). Dua lengan memakai
    himpunan baris yang SAMA (baris ikut-latih lolos.py, di ubin terunduh); beda hanya fitur h_rata, h_maks, W.
    Metrik berbobot (negatif bobot 1/NEG) karena negatif hanya 5% yang disampel -> mewakili himpunan penuh."""
    import numpy as np
    import gbdt as G
    import lolos as LO
    LO.MENTAH = MENTAH
    LO.BARIS = os.path.join(MENTAH, "lolos_baris.pkl")
    R = LO.muat()
    hasil = json.load(open(os.path.join(MENTAH, "lolos_hasil.json")))
    fitur, cfg = hasil["fitur"], hasil["cfg"]
    k = np.load(os.path.join(KELUAR, "koord.npz"))
    peta = {}
    for fn in os.listdir(os.path.join(KELUAR, "ubin")):
        z = np.load(os.path.join(KELUAR, "ubin", fn))
        for s, a, m in zip(z["sel"].tolist(), z["rata"].tolist(), z["maks"].tolist()):
            if a == a:
                peta[s] = (a, m)
    sel_baris = {int(i): int(s) for i, s in zip(k["baris"], k["kk"])}
    pakai = [i for i, s in sel_baris.items() if s in peta]
    LO.D["kol"] = LO.D["kol"] + ["h_rata", "h_maks", "W"]
    for i in pakai:
        a, m = peta[sel_baris[i]]
        r = list(R[i])
        r[7] = list(r[7]) + [a, m, muatan(a)]
        R[i] = tuple(r)
    tambah = ["h_rata", "h_maks", "W"]
    lengan = {"tanpa": fitur, "dengan": fitur + tambah}
    tahun = np.array([r[1] for r in R])
    y = np.array([r[4] for r in R])
    wt = np.where(y == 1, 1.0, 1 / LO.NEG)
    cv = [i for i in pakai if tahun[i] in LO.TAHUN_CV]
    uji = [i for i in pakai if tahun[i] >= 2024]
    print(len(pakai), "baris; CV", len(cv), "positif", int(y[cv].sum()), "; uji", len(uji), "positif", int(y[uji].sum()), flush=True)

    def platt_w(z, yy, ww):
        m = G.latih_lr([[a] for a in z], yy, ww, l2=.01)
        b = m["b"][1] / m["sd"][0]
        return [m["b"][0] - b * m["mu"][0], b]

    S = {}
    for nm, fz in lengan.items():
        t = time.time()
        oof = {}
        for th in LO.TAHUN_CV:
            tr = [i for i in cv if tahun[i] != th]
            te = [i for i in cv if tahun[i] == th]
            if not te:
                continue
            m = LO.latih(tr, fz, cfg)
            oof.update(zip(te, LO.skor_mentah(m, te)))
            print(nm, "lipatan", th, round(time.time() - t), "dtk", flush=True)
        ii = sorted(oof)
        ab = platt_w([oof[i] for i in ii], [int(y[i]) for i in ii], [float(wt[i]) for i in ii])
        p_oof = {i: G.sigmoid(ab[0] + ab[1] * oof[i]) for i in ii}
        a70 = LO.ambang_recall([p_oof[i] for i in ii], [int(y[i]) for i in ii])
        m = LO.latih(cv, fz, cfg)
        p_uji = {i: G.sigmoid(ab[0] + ab[1] * z) for i, z in zip(uji, LO.skor_mentah(m, uji))}
        S[nm] = {"oof": p_oof, "uji": p_uji, "a70": a70, "platt": ab}
        print(nm, "selesai", round(time.time() - t), "dtk", flush=True)
    H = {"dibuat": time.strftime("%Y-%m-%d"), "provinsi": PRIORITAS, "cfg": cfg, "n_fitur_dasar": len(fitur), "fitur_tambah": tambah,
         "baris": len(pakai), "catatan": "dua lengan pada himpunan baris yang sama; metrik berbobot (negatif x20); uji 2024-26 = LIHAT KEDUA (lolos.py sudah pernah dinilai di sini)"}
    for blok, kunci, ids in (("luar_lipatan_2015_2023", "oof", sorted(S["tanpa"]["oof"])), ("uji_2024_2026", "uji", uji)):
        yy = np.array([int(y[i]) for i in ids]); ww = np.array([wt[i] for i in ids])
        r = {"n": len(ids), "lolos": int(yy.sum())}
        P = {nm: np.array([S[nm][kunci][i] for i in ids]) for nm in lengan}
        for nm in lengan:
            p, a70 = P[nm], S[nm]["a70"]
            tp = float((ww * ((p >= a70) & (yy == 1))).sum()); fp = float((ww * ((p >= a70) & (yy == 0))).sum())
            pre, rec = tp / max(tp + fp, 1e-9), tp / float((ww * yy).sum())
            r[nm] = {"auc": round(auc_w(p, yy, ww), 4), "brier": round(float((ww * (p - yy) ** 2).sum() / ww.sum()), 5),
                     "ap": round(ap_w(p, yy, ww), 4), "ambang_recall70": round(a70, 4), "presisi": round(pre, 3), "recall": round(rec, 3),
                     "f1": round(2 * pre * rec / max(pre + rec, 1e-9), 4)}
        rng = np.random.default_rng(7)
        dA, dB, dF = [], [], []
        for _ in range(300):
            j = rng.integers(0, len(ids), len(ids))
            if yy[j].sum() in (0, len(j)):
                continue
            a_ = auc_w(P["dengan"][j], yy[j], ww[j]) - auc_w(P["tanpa"][j], yy[j], ww[j])
            b_ = float((ww[j] * ((P["dengan"][j] - yy[j]) ** 2 - (P["tanpa"][j] - yy[j]) ** 2)).sum() / ww[j].sum())
            dA.append(a_); dB.append(b_)
        q = lambda v: [round(float(np.percentile(v, x)), 5) for x in (2.5, 97.5)]
        r["d_auc"] = [round(r["dengan"]["auc"] - r["tanpa"]["auc"], 4)] + q(dA)
        r["d_brier"] = [round(r["dengan"]["brier"] - r["tanpa"]["brier"], 5)] + q(dB)
        H[blok] = r
        print(blok, json.dumps(r), flush=True)
    t = H["uji_2024_2026"]
    H["vonis"] = ("LOLOS" if t["dengan"]["auc"] > t["tanpa"]["auc"] and t["dengan"]["brier"] <= t["tanpa"]["brier"] else "GAGAL")
    H["aturan"] = "LOLOS bila AUC uji 2024-26 naik DAN Brier uji tidak memburuk (RENCANA-PANEN #7); model produksi TIDAK diganti apa pun vonisnya"
    json.dump(H, open(os.path.join(KELUAR, "hasil_uji.json"), "w"), ensure_ascii=False, indent=1)
    print("VONIS", H["vonis"])


if __name__ == "__main__":
    {"uji": diuji_self, "koordinat": koordinat, "ubin": ubin, "uji_balik": uji_balik}[sys.argv[1]]()
