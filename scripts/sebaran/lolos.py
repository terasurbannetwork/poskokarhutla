"""Model khusus "akan membesar" (lolos = >= 10 sel ~ 140 ha dalam 72 jam) dari titik api BARU, terpisah dari model sel.

Masalah yang diperbaiki: peluang lolos lama = porsi run Monte Carlo model sel yang mencapai 10 sel. Di uji 2024-2026 AUC
0,70, di 123 kasus lalu hanya ~1/3 api besar yang ditandai. Di sini satu pengklasifikasi GBDT per titik api baru, dengan:
  - cuaca 24 jam ke depan & kode FWI (sama dengan model sel), lahan di sel awal, akses, riwayat MODIS, ENSO/IOD;
  - ukuran awal: sel & FRP (maks, jumlah) di lintasan pertama, siang/malam;
  - KONTEKS titik sekitar (S-NPP): titik dalam 5/10 km 3 hari terakhir, jarak titik aktif 24 jam terdekat, hari aktif dalam 10 km
    selama 7 hari (rezim cuaca-api & kompleks di dekatnya);
  - NOAA-20: sel N20 dalam 750 m dari sel lintasan pertama, +-3 jam (data N20 mulai Apr 2018; sebelumnya = -1);
  - mode RAMAL ULANG (<= 14 jam, setelah lintasan berikutnya): sel S-NPP sampai t0+14 jam, terdeteksi lagi?, FRP sesudahnya,
    sel N20 sampai t0+14 jam.
Semua fitur tersedia di peramban (hotspot.json memuat S-NPP & NOAA-20 7 hari) dan di prospektif.py.

Disiplin uji: penyetelan HANYA pada 2015-2023 dengan validasi silang tinggal-satu-tahun (9 lipatan, termasuk El Nino 2015,
2019, 2023). Uji 2024-2026 sudah pernah dibuka sekali (model sel) -> di sini "LIHAT KEDUA" (sedikit optimistis), dilaporkan
sekali di akhir. Ambang WASPADA dipilih di prediksi luar-lipatan 2015-2023: ambang tertinggi dengan recall >= 70%.
Peluang dikalibrasi Platt pada prediksi luar-lipatan.

Keluaran: data/raw/sebaran/lolos_baris.pkl, lolos_cv.json; public/data/model_sebaran.json (kunci "lolos", "lolos_ulang",
"selang"); hasil ringkas di data/raw/sebaran/lolos_hasil.json.

Pakai:  python3 scripts/sebaran/lolos.py bangun | cv | akhir | selang | uji
"""
import bisect, json, math, multiprocessing as mp, os, pickle, random, statistics, sys, time, zlib
from array import array

DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, DIR)
import gbdt as G  # noqa: E402
from umum import AKAR, HA_SEL, MENTAH, PUBLIK, bootstrap, muat_viirs, pusat, sel  # noqa: E402

CUACA_F = ["ws", "ws_maks", "rh_min", "t_maks", "vpd_maks", "hujan24", "hujan72", "hari_kering", "ffmc", "dmc", "dc", "bui", "isi_maks", "fwi"]
LAHAN_F = ["gambut", "hutan", "produksi", "apl", "kebun", "hti", "hph", "tambang", "sanksi", "kanal_km", "jalan_km", "desa_km", "penduduk_km2", "riwayat_f"]
API_F = ["n0", "frp0", "frp_jml0", "malam", "oni", "dmi"]
KONTEKS_F = ["titik5_3h", "titik10_3h", "jarak_aktif_km", "hari_aktif10"]
N20_F = ["n20_0"]
ULANG_F = ["n14", "frp14", "lagi14", "n20_14"]
SEMUA = CUACA_F + LAHAN_F + API_F + KONTEKS_F + N20_F + ULANG_F
# arah fisik yang dijaga bila kendala monoton dipakai (lebih kering / lebih besar -> tidak lebih kecil peluangnya)
MONO = {"vpd_maks": 1, "dc": 1, "dmc": 1, "bui": 1, "ffmc": 1, "hujan24": -1, "hujan72": -1, "rh_min": -1, "n0": 1, "frp0": 1,
        "frp_jml0": 1, "n14": 1, "lagi14": 1, "frp14": 1}
LEPAS = 10
ULANG_MENIT = 14 * 60
BARIS = os.path.join(MENTAH, "lolos_baris.pkl")
CV = os.path.join(MENTAH, "lolos_cv.json")
HASIL = os.path.join(MENTAH, "lolos_hasil.json")
N20_CSV = os.path.join(AKAR, "data/raw/firms/viirs_noaa20.csv")
TAHUN_CV = list(range(2015, 2024))
NEG = .05  # porsi negatif yang ikut latih (bobot 1/NEG): semua positif dipakai
TARGET_RECALL = .70
PROSES = int(os.environ.get("LOLOS_PROSES", "1"))  # mesin 8 GB: tiap anak menyalin sebagian baris (hitungan referensi)
BIAYA = 10  # biaya api besar terlewat / biaya alarm palsu (anggapan, dilaporkan terpisah dari ambang recall)


def log(*a):
    print(time.strftime("%H:%M:%S"), *a, file=sys.stderr, flush=True)


# ---------------- indeks titik & fitur (dipakai juga oleh prospektif.py) ----------------
class Indeks:
    """Deteksi (t menit, lat, lon) di kisi 0,1 derajat; t harus urut naik."""
    def __init__(self, t, lat, lon):
        self.k = {}
        for a in range(len(t)):
            key = (math.floor(lon[a] * 10), math.floor(lat[a] * 10))
            b = self.k.get(key)
            if b is None:
                b = self.k[key] = (array("d"), array("d"), array("d"))
            b[0].append(t[a])
            b[1].append(lat[a])
            b[2].append(lon[a])
        self.t_min = min(t) if len(t) else math.inf

    def dalam(self, t_a, t_b, lon, lat, r_km):
        """-> [(t, km, lat, lon)] untuk t_a <= t < t_b dan jarak <= r_km (r_km <= 10)."""
        gx, gy = math.floor(lon * 10), math.floor(lat * 10)
        kx = 111.32 * math.cos(math.radians(lat))
        out = []
        for dx in (-1, 0, 1):
            for dy in (-1, 0, 1):
                b = self.k.get((gx + dx, gy + dy))
                if not b:
                    continue
                for q in range(bisect.bisect_left(b[0], t_a), bisect.bisect_left(b[0], t_b)):
                    d = math.hypot((b[2][q] - lon) * kx, (b[1][q] - lat) * 110.57)
                    if d <= r_km:
                        out.append((b[0][q], d, b[1][q], b[2][q]))
        return out


def konteks(idx, t0, lon, lat):
    xs = idx.dalam(t0 - 7 * 1440, t0, lon, lat, 10.0)
    return {"titik5_3h": sum(1 for t, d, *_ in xs if t >= t0 - 3 * 1440 and d <= 5), "titik10_3h": sum(1 for t, *_ in xs if t >= t0 - 3 * 1440),
            "jarak_aktif_km": min([d for t, d, *_ in xs if t >= t0 - 1440] or [10.0]),
            "hari_aktif10": len({min(6, int((t0 - t) // 1440)) for t, *_ in xs})}


def n20_sekitar(idx, sel_daf, t_a, t_b):
    """Sel 375 m NOAA-20 berbeda dalam 750 m dari pusat sel mana pun di sel_daf, t_a <= t < t_b. -1 = tidak ada data N20."""
    if idx is None or t_a < idx.t_min:
        return -1
    out = set()
    for k in sel_daf:
        lo, la = pusat(k)
        for _, _, la2, lo2 in idx.dalam(t_a, t_b, lo, la, .75):
            out.add(sel(lo2, la2))
    return len(out)


def fitur_lolos(w, s, tahun, n0, frp0, frp_jml0, malam, oni, dmi, kont, n20_0, ulang=None):
    v = {**{x: w[x] for x in CUACA_F}, **{x: s[x] for x in LAHAN_F if x != "sanksi"}, "sanksi": 1 if s["sanksi_th"] <= tahun else 0,
         "n0": n0, "frp0": frp0, "frp_jml0": frp_jml0, "malam": malam, "oni": oni, "dmi": dmi, **kont, "n20_0": n20_0}
    v.update(ulang or {"n14": n0, "frp14": 0.0, "lagi14": 0, "n20_14": n20_0})
    return v


def prediksi(M, v):
    """Peluang terkalibrasi (Platt) dari model ekspor {fitur, bias, pohon, platt}."""
    x = [v[f] for f in M["fitur"]]
    z = M["bias"] + sum(G.nilai_pohon(t, x) for t in M["pohon"])
    a, b = M["platt"]
    return G.sigmoid(a + b * z)


# ---------------- bangun baris ----------------
_I = {}


def baris(e):
    import latih as L
    k = L.ktx()
    S = L.seri_untuk(e)
    if S is None:
        return None
    det = e["det"]
    p = det[0][0]
    if not S.cukup(p, 24):
        return None
    w = S.jendela(p)
    th = int(e["t0"][:4])
    s = k.sel(det[0][1], e["prov"])
    oni, dmi = k.iklim(p)
    pertama = [d for d in det if d[0] - p <= 30]
    sel0 = sorted({d[1] for d in pertama})
    jam_lokal = ((p + e["lon0"] * 4) / 60) % 24
    kont = konteks(_I["snpp"], p, e["lon0"], e["lat0"])
    sampai = [d for d in det if d[0] <= p + ULANG_MENIT]
    sel14 = sorted({d[1] for d in sampai})
    lagi = [d for d in sampai if d[0] > p + 60]
    ulang = {"n14": len(sel14), "frp14": max([d[2] for d in lagi] or [0.0]), "lagi14": 1 if lagi else 0,
             "n20_14": n20_sekitar(_I["n20"], sel14, p - 180, p + ULANG_MENIT + 1)}
    v = fitur_lolos(w, s, th, len(sel0), max(d[2] for d in pertama), sum(d[2] for d in pertama), 0 if 6 <= jam_lokal < 18 else 1, oni, dmi, kont,
                    n20_sekitar(_I["n20"], sel0, p - 180, p + 181), ulang)
    n72 = len({d[1] for d in det if d[0] <= p + 72 * 60})
    st = "sabana" if e["prov"] in ("53", "93") and not s["gambut"] else "gambut" if s["gambut"] else "mineral"
    return (e["id"], th, e["prov"], st, 1 if n72 >= LEPAS else 0, n72, len(sel14), array("d", (v[f] for f in SEMUA)))


def bangun():
    import latih as L
    from fitur import Konteks
    t0 = time.time()
    v = muat_viirs()
    _I["snpp"] = Indeks(v["t"], v["lat"], v["lon"])
    v = muat_viirs(N20_CSV, "viirs_n20_veg")
    _I["n20"] = Indeks(v["t"], v["lat"], v["lon"])
    del v
    L._ktx = Konteks(bekas=False)
    log("indeks siap", round(time.time() - t0))
    with mp.get_context("fork").Pool(4) as pool:
        import itertools
        evs = L.peristiwa(semua_kecil=True)
        if os.environ.get("LOLOS_N"):  # uji alur cepat
            evs = itertools.islice(evs, 0, None, int(os.environ["LOLOS_N"]))
        R = [r for r in pool.imap_unordered(baris, evs, chunksize=200) if r]
    R.sort(key=lambda r: r[0])
    pickle.dump({"kolom": SEMUA, "baris": R}, open(BARIS, "wb"), protocol=pickle.HIGHEST_PROTOCOL)
    log(f"{len(R)} titik api baru, {sum(r[4] for r in R)} lolos; {round(time.time() - t0)} dtk")


# ---------------- latih & metrik ----------------
D = {}


def muat():
    if "R" not in D:
        d = pickle.load(open(BARIS, "rb"))
        D["R"], D["kol"] = d["baris"], d["kolom"]
    return D["R"]


def ikut_latih(r):
    return r[4] or (zlib.crc32(r[0].encode()) % 1000) < NEG * 1000


def latih(idx, fitur, cfg):
    R, kol = muat(), D["kol"]
    c = [kol.index(f) for f in fitur]
    idx = [i for i in idx if ikut_latih(R[i])]
    X = [[R[i][7][j] for j in c] for i in idx]
    y = [R[i][4] for i in idx]
    w = [cfg.get("wpos", 1.0) if R[i][4] else 1 / NEG for i in idx]
    mw = sum(w) / len(w)
    w = [x / mw for x in w]
    mono = {j: MONO[f] for j, f in enumerate(fitur) if f in MONO} if cfg.get("mono") else None
    m = G.latih_gbdt(X, y, w, pohon=cfg.get("pohon", 150), dalam=cfg.get("dalam", 4), lr=cfg.get("lr", .08), mono=mono, fokal=cfg.get("fokal", 0.0))
    m["fitur"] = list(fitur)
    return m


def skor_mentah(m, idx):
    R, kol = muat(), D["kol"]
    c = [kol.index(f) for f in m["fitur"]]
    return [m["bias"] + sum(G.nilai_pohon(t, [R[i][7][j] for j in c]) for t in m["pohon"]) for i in idx]


def _lipat(arg):
    th, fitur, cfg = arg
    R = muat()
    tr = [i for i, r in enumerate(R) if r[1] in TAHUN_CV and r[1] != th]
    te = [i for i, r in enumerate(R) if r[1] == th]
    m = latih(tr, fitur, cfg)
    out = list(zip(te, skor_mentah(m, te)))
    log(f"  lipatan {th} selesai")
    return out


def oof(fitur, cfg, pool):
    out = {}
    tugas = [(th, fitur, cfg) for th in TAHUN_CV]
    for daf in (pool.imap_unordered(_lipat, tugas) if pool else map(_lipat, tugas)):
        out.update(daf)
    return out


class _TanpaPool:  # PROSES = 1: lipatan dijalankan berurutan di proses ini (mesin sempit memori)
    def __enter__(self):
        return None

    def __exit__(self, *a):
        return False


def kolam():
    return mp.get_context("fork").Pool(PROSES) if PROSES > 1 else _TanpaPool()


def platt(z, y):
    m = G.latih_lr([[a] for a in z], y, [1.0] * len(z), l2=.01)
    b = m["b"][1] / m["sd"][0]
    return [m["b"][0] - b * m["mu"][0], b]


def ap(p, y):
    o = sorted(zip(p, y), key=lambda t: -t[0])
    pos = sum(y)
    tp = s = 0
    for k, (_, yi) in enumerate(o, 1):
        if yi:
            tp += 1
            s += tp / k
    return s / pos if pos else None


def ambang_recall(p, y, target=TARGET_RECALL):
    """Ambang tertinggi yang masih menangkap >= target dari yang lolos."""
    pos = sorted((pi for pi, yi in zip(p, y) if yi), reverse=True)
    if not pos:
        return None
    return pos[max(0, math.ceil(target * len(pos)) - 1)]


def pada(p, y, a):
    tp = sum(1 for pi, yi in zip(p, y) if yi and pi >= a)
    fp = sum(1 for pi, yi in zip(p, y) if not yi and pi >= a)
    pos, neg = sum(y), len(y) - sum(y)
    return {"ambang": round(a, 4), "recall": round(tp / max(1, pos), 3), "presisi": round(tp / max(1, tp + fp), 3),
            "alarm_palsu_per_tidak_lolos": round(fp / max(1, neg), 3), "ditandai_per_100": round(100 * (tp + fp) / max(1, len(y)), 1),
            "tp": tp, "fp": fp, "fn": pos - tp, "tn": neg - fp}


def metrik(p, y, ambang=None):
    out = {"n": len(y), "lolos": sum(y), "auc": round(G.auc(p, y), 4) if 0 < sum(y) < len(y) else None,
           "ap": round(ap(p, y), 4) if sum(y) else None, "ap_acak": round(sum(y) / max(1, len(y)), 4)}
    if ambang is not None and len(y):
        out["pada_ambang"] = pada(p, y, ambang)
        out["brier"] = round(G.brier(p, y), 4)
    return out


# ---------------- validasi silang ----------------
KONFIG = [
    ("A: cuaca + lahan + ukuran awal (setara pendorong)", CUACA_F + LAHAN_F + API_F, {}),
    ("B: A + konteks titik sekitar", CUACA_F + LAHAN_F + API_F + KONTEKS_F, {}),
    ("C: B + NOAA-20", CUACA_F + LAHAN_F + API_F + KONTEKS_F + N20_F, {}),
    ("D: C + bobot kelas lolos 5x", CUACA_F + LAHAN_F + API_F + KONTEKS_F + N20_F, {"wpos": 5.0}),
    ("E: C + kendala monoton", CUACA_F + LAHAN_F + API_F + KONTEKS_F + N20_F, {"mono": True}),
    ("F: C + fokal gamma 2", CUACA_F + LAHAN_F + API_F + KONTEKS_F + N20_F, {"fokal": 2.0}),
    ("U: C + ramal ulang 14 jam (lintasan berikutnya)", CUACA_F + LAHAN_F + API_F + KONTEKS_F + N20_F + ULANG_F, {}),
]
KISI = [{"dalam": 4, "pohon": 150, "lr": .08}, {"dalam": 3, "pohon": 300, "lr": .08}, {"dalam": 5, "pohon": 150, "lr": .06}]  # kecil: mesin 8 GB, stdlib


def ringkas_oof(o, label=None):
    R = muat()
    idx = sorted(o)
    z = [o[i] for i in idx]
    y = [R[i][4] for i in idx]
    ab = platt(z, y)
    p = [G.sigmoid(ab[0] + ab[1] * a) for a in z]
    a70 = ambang_recall(p, y)
    out = {"semua": metrik(p, y, a70), "platt": ab, "ambang_recall70": a70}
    out["biaya"] = pada(p, y, 1 / (1 + BIAYA))  # ambang biaya: p >= 1/(1+BIAYA) bila peluang terkalibrasi
    out["per_tahun"] = {th: metrik([pi for pi, i in zip(p, idx) if R[i][1] == th], [R[i][4] for i in idx if R[i][1] == th], a70) for th in TAHUN_CV}
    out["per_lahan"] = {st: metrik([pi for pi, i in zip(p, idx) if R[i][3] == st], [R[i][4] for i in idx if R[i][3] == st], a70)
                        for st in ("gambut", "mineral", "sabana")}
    # mode ulang: hanya titik yang BELUM lolos pada t0 + 14 jam (yang sudah besar tidak perlu diramal)
    belum = [(pi, R[i][4]) for pi, i in zip(p, idx) if R[i][6] < LEPAS]
    out["belum_lolos_14j"] = metrik([a for a, _ in belum], [b for _, b in belum], a70)
    return out, dict(zip(idx, p))


def cv():
    R = muat()
    log(f"{len(R)} baris; latih-CV {sum(1 for r in R if r[1] in TAHUN_CV)}")
    H = {"dibuat": time.strftime("%Y-%m-%d"), "n": len(R), "lolos": sum(r[4] for r in R), "konfig": {}, "neg_sampel": NEG}
    simpan = {}
    with kolam() as pool:
        for nama, fitur, cfg in KONFIG:
            t = time.time()
            o = oof(fitur, cfg, pool)
            H["konfig"][nama], simpan[nama] = ringkas_oof(o)
            s = H["konfig"][nama]["semua"]
            log(nama, "AUC", s["auc"], "AP", s["ap"], s["pada_ambang"], round(time.time() - t), "dtk")
            json.dump(H, open(CV, "w"), ensure_ascii=False, indent=1)
        # kisi hiperparameter pada konfigurasi terbaik (AP luar-lipatan) di antara A-F
        terbaik = max([k for k in KONFIG if not k[0].startswith("U")], key=lambda k: H["konfig"][k[0]]["semua"]["ap"])
        H["terpilih_awal"] = terbaik[0]
        H["kisi"] = []
        for g in KISI:
            if g == {"dalam": 4, "pohon": 150, "lr": .08}:  # = bawaan konfigurasi, sudah dihitung
                r = H["konfig"][terbaik[0]]
            else:
                o = oof(terbaik[1], {**terbaik[2], **g}, pool)
                r, _ = ringkas_oof(o)
            H["kisi"].append({**g, "auc": r["semua"]["auc"], "ap": r["semua"]["ap"], "presisi70": r["semua"]["pada_ambang"]["presisi"]})
            log("kisi", g, H["kisi"][-1])
            json.dump(H, open(CV, "w"), ensure_ascii=False, indent=1)
    pickle.dump(simpan, open(os.path.join(MENTAH, "lolos_oof.pkl"), "wb"))
    log("cv selesai")


# ---------------- akhir: lihat kedua 2024-2026, kasus, ekspor ----------------
def pilihan(H):
    nama = H["terpilih_awal"]
    k = next(k for k in KONFIG if k[0] == nama)
    g = max(H["kisi"], key=lambda r: r["ap"])
    cfg = {**k[2], **{x: g[x] for x in ("dalam", "pohon", "lr")}}
    ku = next(k for k in KONFIG if k[0].startswith("U"))
    return k[1], cfg, ku[1], {**ku[2], **{x: g[x] for x in ("dalam", "pohon", "lr")}}


def akhir():
    R = muat()
    H = json.load(open(CV))
    fitur, cfg, fitur_u, cfg_u = pilihan(H)
    log("konfigurasi", fitur, cfg)
    with kolam() as pool:
        o = oof(fitur, cfg, pool)
        ou = oof(fitur_u, cfg_u, pool)
    hasil_cv, p_oof = ringkas_oof(o)
    hasil_cv_u, pu_oof = ringkas_oof(ou)
    ab, a70 = hasil_cv["platt"], hasil_cv["ambang_recall70"]
    abu, a70u = hasil_cv_u["platt"], hasil_cv_u["ambang_recall70"]
    cvi = [i for i, r in enumerate(R) if r[1] in TAHUN_CV]
    uji = [i for i, r in enumerate(R) if r[1] >= 2024]
    m = latih(cvi, fitur, cfg)
    mu = latih(cvi, fitur_u, cfg_u)
    p_uji = dict(zip(uji, (G.sigmoid(ab[0] + ab[1] * z) for z in skor_mentah(m, uji))))
    pu_uji = dict(zip(uji, (G.sigmoid(abu[0] + abu[1] * z) for z in skor_mentah(mu, uji))))
    Hs = {"dibuat": time.strftime("%Y-%m-%d"), "fitur": fitur, "cfg": cfg, "fitur_ulang": fitur_u, "cfg_ulang": cfg_u,
          "cv_2015_2023": hasil_cv, "cv_ulang": hasil_cv_u}
    yu = [R[i][4] for i in uji]
    Hs["uji_lihat_kedua"] = {"catatan": "uji 2024-2026 dibuka KEDUA kalinya (model sel sudah pernah dinilai di sini): sedikit optimistis",
                             "semua": metrik([p_uji[i] for i in uji], yu, a70),
                             "biaya": pada([p_uji[i] for i in uji], yu, 1 / (1 + BIAYA)),
                             "per_tahun": {th: metrik([p_uji[i] for i in uji if R[i][1] == th], [R[i][4] for i in uji if R[i][1] == th], a70) for th in (2024, 2025, 2026)},
                             "per_lahan": {st: metrik([p_uji[i] for i in uji if R[i][3] == st], [R[i][4] for i in uji if R[i][3] == st], a70) for st in ("gambut", "mineral", "sabana")},
                             "ulang": metrik([pu_uji[i] for i in uji], yu, a70u),
                             "ulang_belum_lolos_14j": metrik([pu_uji[i] for i in uji if R[i][6] < LEPAS], [R[i][4] for i in uji if R[i][6] < LEPAS], a70u)}
    # sebelum/sesudah pada himpunan yang SAMA dengan laporan lama: 500 deteksi pertama uji & 123 kasus
    pos = {r[0]: i for i, r in enumerate(R)}
    import latih_jalan as LJ
    ua = pickle.load(open(os.path.join(MENTAH, "uji_awal.pkl"), "rb"))["uji"]
    K = json.load(open(os.path.join(MENTAH, "hasil.json"))).get("kal_lepas")
    lama = [(LJ.p_kal(K, r["p_lepas"]), 1 if r["akhir72"] >= LEPAS else 0, r["id"], r["strata"]) for r in ua if r["ji"] == 0 and "p_lepas" in r]
    ada = [x for x in lama if x[2] in pos]
    Hs["uji500"] = {"n_lama": len(lama), "n_cocok": len(ada),
                    "lama_mc": {"semua": metrik([x[0] for x in ada], [x[1] for x in ada], .5), "ambang_0_2": pada([x[0] for x in ada], [x[1] for x in ada], .2)},
                    "baru": metrik([p_uji[pos[x[2]]] for x in ada], [x[1] for x in ada], a70),
                    "baru_ulang": metrik([pu_uji[pos[x[2]]] for x in ada], [x[1] for x in ada], a70u),
                    "per_lahan": {st: {"lama": metrik([x[0] for x in ada if x[3] == st], [x[1] for x in ada if x[3] == st], .5),
                                       "baru": metrik([p_uji[pos[x[2]]] for x in ada if x[3] == st], [x[1] for x in ada if x[3] == st], a70)}
                                  for st in ("gambut", "mineral", "sabana")}}
    kas = json.load(open(os.path.join(PUBLIK, "sebaran_kasus.json")))
    pk = {**p_oof, **p_uji}
    pku = {**pu_oof, **pu_uji}
    kk = [(b["p_lepas"], b["lepas"], pk.get(pos.get(b["id"])), pku.get(pos.get(b["id"])), b) for b in kas["kasus"]]
    kk = [x for x in kk if x[2] is not None]
    Hs["kasus"] = {"n": len(kk), "catatan": "kasus 2015-2023: prediksi luar-lipatan (model tanpa tahun kasus); 2024-2026: model 2015-2023",
                   "lama_mc": metrik([x[0] for x in kk], [x[1] for x in kk], .5), "baru": metrik([x[2] for x in kk], [x[1] for x in kk], a70),
                   "baru_ulang": metrik([x[3] for x in kk], [x[1] for x in kk], a70u),
                   "per_kelas": {kel: {"lama_benar": round(statistics.mean([(x[0] >= .5) == bool(x[1]) for x in kk if x[4]["kelas"] == kel]), 3),
                                       "baru_benar": round(statistics.mean([(x[2] >= a70) == bool(x[1]) for x in kk if x[4]["kelas"] == kel]), 3),
                                       "baru_ulang_benar": round(statistics.mean([(x[3] >= a70u) == bool(x[1]) for x in kk if x[4]["kelas"] == kel]), 3),
                                       "n": sum(1 for x in kk if x[4]["kelas"] == kel)} for kel in ("besar", "sedang", "kecil")}}
    pickle.dump({R[i][0]: p for i, p in {**p_oof, **p_uji}.items()}, open(PELUANG, "wb"))
    # tulis peluang baru ke pustaka kasus (dialog Insight menampilkan keduanya)
    for b in kas["kasus"]:
        i = pos.get(b["id"])
        if i in pk:
            b["p_lolos"] = round(pk[i], 3)
            b["waspada"] = pk[i] >= a70
            b["p_lolos_ulang"] = round(pku[i], 3)
    kas["ringkasan"]["lolos_baru"] = {"auc": Hs["kasus"]["baru"]["auc"], **Hs["kasus"]["baru"]["pada_ambang"], "ambang": round(a70, 4)}
    json.dump(kas, open(os.path.join(PUBLIK, "sebaran_kasus.json"), "w"), ensure_ascii=False, separators=(",", ":"))
    # model peramban: konfigurasi sama, dilatih ulang pada SEMUA tahun 2015-2026; kalibrasi & ambang dari luar-lipatan 2015-2023
    semua = list(range(len(R)))
    me, mue = latih(semua, fitur, cfg), latih(semua, fitur_u, cfg_u)
    ekspor = lambda mm, ab_, a_: {"fitur": mm["fitur"], "bias": round(mm["bias"], 6), "pohon": mm["pohon"], "platt": [round(ab_[0], 6), round(ab_[1], 6)], "ambang": round(a_, 4)}
    M = json.load(open(os.path.join(PUBLIK, "model_sebaran.json")))
    M["lolos"] = {**ekspor(me, ab, a70), "kinerja": {"cv_recall": hasil_cv["semua"]["pada_ambang"]["recall"], "cv_presisi": hasil_cv["semua"]["pada_ambang"]["presisi"],
                                                     "uji2_auc": Hs["uji_lihat_kedua"]["semua"]["auc"], "uji2_recall": Hs["uji_lihat_kedua"]["semua"]["pada_ambang"]["recall"],
                                                     "uji2_presisi": Hs["uji_lihat_kedua"]["semua"]["pada_ambang"]["presisi"],
                                                     "kasus_recall": Hs["kasus"]["baru"]["pada_ambang"]["recall"]},
                  "catatan": "titik api baru (< 10 sel); ambang = recall >= 70% pada luar-lipatan 2015-2023"}
    def bar(h, mdl, m_):
        pa = m_.get("pada_ambang") or {}
        return {"himpunan": h, "model": mdl, "n": m_["n"], "lolos": m_["lolos"], "auc": m_["auc"], "recall": pa.get("recall"), "presisi": pa.get("presisi"),
                "alarm_palsu": pa.get("alarm_palsu_per_tidak_lolos"), "ditandai_per_100": pa.get("ditandai_per_100")}
    M["lolos"]["laporan"] = [
        bar("Luar-lipatan 2015-2023 (penyetelan)", "baru", hasil_cv["semua"]),
        bar("Uji 2024-2026, semua titik baru (lihat kedua)", "baru", Hs["uji_lihat_kedua"]["semua"]),
        bar("Uji 2024-2026, 500 deteksi pertama", "lama (Monte Carlo, ambang 50%)", Hs["uji500"]["lama_mc"]["semua"]),
        bar("Uji 2024-2026, 500 deteksi pertama", "baru", Hs["uji500"]["baru"]),
        bar("123 kejadian lalu", "lama (Monte Carlo, ambang 50%)", Hs["kasus"]["lama_mc"]),
        bar("123 kejadian lalu", "baru", Hs["kasus"]["baru"]),
        bar("123 kejadian lalu", "baru, ramal ulang 14 jam", Hs["kasus"]["baru_ulang"])]
    M["lolos"]["per_lahan_uji"] = {st: bar(st, "baru", v) for st, v in Hs["uji_lihat_kedua"]["per_lahan"].items()}
    M["lolos_ulang"] = {**ekspor(mue, abu, a70u), "menit": ULANG_MENIT, "catatan": "ramal ulang setelah lintasan berikutnya (<= 14 jam sesudah deteksi pertama)"}
    json.dump(M, open(os.path.join(PUBLIK, "model_sebaran.json"), "w"), separators=(",", ":"))
    if os.path.exists(HASIL):  # hasil 'selang' (dijalankan terpisah) dipertahankan
        Hs = {**{k: v for k, v in json.load(open(HASIL)).items() if k == "selang"}, **Hs}
    json.dump(Hs, open(HASIL, "w"), ensure_ascii=False, indent=1)
    log("akhir:", json.dumps({"uji2": Hs["uji_lihat_kedua"]["semua"], "uji500": Hs["uji500"]["baru"], "kasus": Hs["kasus"]["baru"]}))


# ---------------- selang luas terkalibrasi (konformal) ----------------
def _awal(arg):
    import latih as L
    e, mdl, tau = arg
    r = L.evaluasi_awal((e, 0, {"gbdt": mdl}, {"gbdt": tau}, None, 20))
    if not r or "mc" not in r:
        return None
    return {"id": r["id"], "th": r["th"], "strata": r["strata"], "awal": r["awal"], "mc": r["mc"], "obs": [s["no"] for s in r["skor"]["persistensi"]]}


def skor_konformal(mc, obs):
    """CQR di ruang log(1 + sel baru): seberapa jauh teramati keluar dari [P10, P90] Monte Carlo (negatif = di dalam)."""
    lo, hi = math.log1p(mc[0]), math.log1p(mc[2])
    o = math.log1p(obs)
    return max(lo - o, o - hi)


def kuantil_konformal(sk, a=.8):
    s = sorted(sk)
    n = len(s)
    return s[min(n - 1, math.ceil((n + 1) * a) - 1)]


def lebarkan(mc, q):
    """[P10, P50, P90] sel baru -> selang dilebarkan/disempitkan q (log)."""
    return [min(mc[1], max(0.0, (1 + mc[0]) * math.exp(-q) - 1)), mc[1], max(mc[1], (1 + mc[2]) * math.exp(q) - 1)]


def kunci_selang(strata, waspada):
    return f"{strata}|{1 if waspada else 0}"


def q_selang(q, strata, waspada, h):
    """q per (lahan, WASPADA); kelompok kecil memakai gabungan semua lahan dengan tanda yang sama."""
    return (q.get(kunci_selang(strata, waspada)) or q[kunci_selang("*", waspada)])[h]


KAL = os.path.join(MENTAH, "lolos_selang_kal.pkl")
PELUANG = os.path.join(MENTAH, "lolos_peluang.pkl")  # {id peristiwa: peluang membesar (luar-lipatan <= 2023, model 2015-2023 untuk uji)}


def selang():
    """Kalibrasi selang luas (CQR konformal): titik awal deteksi pertama 2015-2023, model sel yang tidak melihat tahunnya
    (lipatan kasus.py untuk 2015-2022, model 2015-2022 untuk 2023). Bersyarat pada lahan x tanda WASPADA model membesar
    (luar-lipatan), karena api yang akan membesar adalah yang selangnya paling sering terlalu sempit. Uji cakupan: uji
    2024-2026 (lihat kedua) dan 123 kasus. Tahap Monte Carlo di-cache (lolos_selang_kal.pkl); butuh lolos_peluang.pkl (akhir)."""
    import latih as L
    if os.path.exists(KAL):
        kal = pickle.load(open(KAL, "rb"))
    else:
        import kasus as KS
        H = json.load(open(L.HASIL))
        M = KS.latih_lipat(H)
        vm = pickle.load(open(os.path.join(MENTAH, "val_model.pkl"), "rb"))
        geser = (H.get("geser_logit") or {}).get("pilihan")
        for m_ in M.values():
            m_["geser"] = geser
        tau = H["tau"]["gbdt"]["tau"]
        rnd, res, n_lihat = random.Random(55), {}, {}
        kap = 40  # per (tahun, besar?) -> ~540 titik awal
        for e in L.peristiwa(semua_kecil=True):
            th = int(e["t0"][:4])
            if th > 2023:
                continue
            kk = (th, e["sel"] >= 3)
            n_lihat[kk] = n_lihat.get(kk, 0) + 1
            r_ = res.setdefault(kk, [])
            cap = kap if kk[1] else kap // 2
            if len(r_) < cap:
                r_.append(e)
            else:
                j = rnd.randrange(n_lihat[kk])
                if j < cap:
                    r_[j] = e
        evs = [e for v in res.values() for e in v]
        args = [(e, vm["gbdt"] if int(e["t0"][:4]) == 2023 else M[KS.LIPAT[int(e["t0"][:4])]], tau) for e in evs]
        log(f"selang: {len(args)} titik awal kalibrasi")
        from fitur import Konteks
        L._ktx = Konteks(bekas=False)  # bekas terbakar 375 m hanya kolom riset; model sel tidak memakainya (hemat ~1 GB per proses)
        with mp.get_context("fork").Pool(2) as pool:
            kal = [r for r in pool.imap_unordered(_awal, args, chunksize=2) if r]
        pickle.dump(kal, open(KAL, "wb"))
    if not os.path.exists(PELUANG):
        log("selang: Monte Carlo tersimpan; jalankan 'akhir' lalu 'selang' lagi")
        return
    P = pickle.load(open(PELUANG, "rb"))
    ambang = json.load(open(os.path.join(PUBLIK, "model_sebaran.json")))["lolos"]["ambang"]
    tanda = lambda i: P.get(i, 0.0) >= ambang
    for r in kal:
        r["waspada"] = tanda(r["id"])
    q = {}
    for st in ("gambut", "mineral", "sabana", "*"):
        for w in (False, True):
            rs = [r for r in kal if (st == "*" or r["strata"] == st) and r["waspada"] == w]
            if len(rs) >= (20 if st == "*" else 40):
                q[kunci_selang(st, w)] = [round(kuantil_konformal([skor_konformal(r["mc"][h], r["obs"][h]) for r in rs]), 4) for h in range(3)]

    def cak(rows, qq):
        out = []
        for h in range(3):
            d = [1 if (lambda iv: iv[0] - 1e-9 <= r["obs"][h] <= iv[2] + 1e-9)(lebarkan(r["mc"][h], q_selang(qq, r["strata"], r["waspada"], h) if qq else 0)) else 0 for r in rows]
            out.append(round(statistics.mean(d), 3) if d else None)
        return out
    out = {"q": q, "n_kal": {k: sum(1 for r in kal if (k.startswith("*") or r["strata"] == k.split("|")[0]) and r["waspada"] == (k[-1] == "1")) for k in q},
           "kal_cakupan_mentah": cak(kal, None), "kal_cakupan": cak(kal, q)}
    ua = pickle.load(open(os.path.join(MENTAH, "uji_awal.pkl"), "rb"))["uji"]
    uj = [{"strata": r["strata"], "mc": r["mc"], "obs": [s["no"] for s in r["skor"]["persistensi"]], "ji": r["ji"], "waspada": tanda(r["id"])} for r in ua if r.get("mc")]
    out["uji2_cakupan_mentah"], out["uji2_cakupan"] = cak(uj, None), cak(uj, q)
    out["uji2_deteksi_pertama"] = cak([r for r in uj if r["ji"] == 0], q)
    out["uji2_per_lahan"] = {st: {"mentah": cak([r for r in uj if r["strata"] == st], None), "kalibrasi": cak([r for r in uj if r["strata"] == st], q),
                                  "n": sum(1 for r in uj if r["strata"] == st)} for st in ("gambut", "mineral", "sabana")}
    kas = json.load(open(os.path.join(PUBLIK, "sebaran_kasus.json")))
    kc = []
    for b in kas["kasus"]:
        a = b["ha_awal"] / HA_SEL
        kc.append({"strata": b["strata"], "mc": [[max(0.0, x / HA_SEL - a) for x in m] for m in b["pred_ha"]], "obs": [max(0.0, x / HA_SEL - a) for x in b["obs_ha"]],
                   "th": b["th"], "kelas": b["kelas"], "waspada": tanda(b["id"])})
    out["kasus_cakupan_mentah"], out["kasus_cakupan"] = cak(kc, None), cak(kc, q)
    out["kasus_per_kelas"] = {k: {"mentah": cak([r for r in kc if r["kelas"] == k], None), "kalibrasi": cak([r for r in kc if r["kelas"] == k], q)} for k in ("besar", "sedang", "kecil")}
    out["kasus_2024_2026"] = cak([r for r in kc if r["th"] >= 2024], q)
    for b, r in zip(kas["kasus"], kc):
        iv = [lebarkan(r["mc"][h], q_selang(q, r["strata"], r["waspada"], h)) for h in range(3)]
        b["selang_ha"] = [[round(x[0] * HA_SEL + b["ha_awal"]), round(x[2] * HA_SEL + b["ha_awal"])] for x in iv]
    kas["ringkasan"]["cakupan_kalibrasi"] = out["kasus_cakupan"]
    json.dump(kas, open(os.path.join(PUBLIK, "sebaran_kasus.json"), "w"), ensure_ascii=False, separators=(",", ":"))
    Mj = json.load(open(os.path.join(PUBLIK, "model_sebaran.json")))
    Mj["selang"] = {"q": q, "ruang": "log(1 + sel baru)", "target": .8, "kunci": "lahan|WASPADA (1/0); '*' = semua lahan",
                    "catatan": "CQR: P10/P90 Monte Carlo dilebarkan q per lahan, tanda WASPADA & hari; dikalibrasi pada 2015-2023 (luar-sampel)"}
    json.dump(Mj, open(os.path.join(PUBLIK, "model_sebaran.json"), "w"), separators=(",", ":"))
    Hs = json.load(open(HASIL)) if os.path.exists(HASIL) else {}
    Hs["selang"] = out
    json.dump(Hs, open(HASIL, "w"), ensure_ascii=False, indent=1)
    log("selang", json.dumps(out))

if __name__ == "__main__":
    a = sys.argv[1:]
    if a == ["uji"]:
        I = Indeks([0, 100, 4000, 9000], [0.0, 0.0, 0.03, 0.0], [110.0, 110.02, 110.0, 110.5])
        k = konteks(I, 4320, 110.0, 0.0)
        # t=0 di luar 3 hari (4320 - 0 = 3 hari pas -> >= batas ikut), t=100 2,2 km, t=4000 3,3 km; t=9000 sesudah t0 tidak dihitung
        assert k["titik10_3h"] == 3 and k["titik5_3h"] == 3 and k["hari_aktif10"] == 3 and abs(k["jarak_aktif_km"] - 3.317) < .01, k
        assert konteks(I, 0, 110.0, 0.0)["titik10_3h"] == 0 and konteks(I, 0, 110.0, 0.0)["jarak_aktif_km"] == 10.0
        assert n20_sekitar(None, [sel(110, 0)], 0, 10) == -1 and n20_sekitar(I, [sel(110, 0)], -500, 50) == -1
        assert n20_sekitar(I, [sel(110, 0)], 0, 50) == 1 and n20_sekitar(I, [sel(110, 0)], 0, 200) == 1  # 2,2 km di luar 750 m
        qq = {"gambut|1": [1, 2, 3], "*|1": [4, 5, 6], "*|0": [0, 0, 0]}
        assert q_selang(qq, "gambut", True, 1) == 2 and q_selang(qq, "mineral", True, 2) == 6 and q_selang(qq, "sabana", False, 0) == 0
        assert kuantil_konformal(list(range(10))) == 8 and lebarkan([0, 1, 3], 0) == [0.0, 1, 3.0]
        assert abs(lebarkan([1, 2, 3], math.log(2))[2] - 7) < 1e-9 and lebarkan([1, 2, 3], math.log(2))[0] == 0.0
        assert skor_konformal([0, 1, 3], 2) < 0 and skor_konformal([0, 1, 3], 7) > 0
        p, y = [.9, .8, .7, .2, .1], [1, 0, 1, 1, 0]
        assert ambang_recall(p, y, .66) == .7 and pada(p, y, .7)["recall"] == round(2 / 3, 3) and abs(ap(p, y) - (1 + 2 / 3 + 3 / 4) / 3) < 1e-9
        ab = platt([-2, -1, 0, 1, 2] * 20, [0, 0, 0, 1, 1] * 20)
        assert ab[1] > 0
        print("ok")
    elif a == ["bangun"]:
        bangun()
    elif a == ["cv"]:
        cv()
    elif a == ["akhir"]:
        akhir()
    elif a == ["selang"]:
        selang()
    else:
        sys.exit(__doc__)
