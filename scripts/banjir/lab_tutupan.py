"""LAB (29 Okt 2026): apakah PERUBAHAN TUTUPAN LAHAN tahunan memperbaiki model_kab.py? -> data/raw/banjir/lab_tutupan/ (BUKAN public/)

Eksperimen terpisah. TIDAK mengubah model_kab.py / uji_balik.py / berkas bersama yang disidik (J4); hanya mengimpor mereka.
Sumber tutupan: Impact Observatory Annual LULC v02 (10 m, 2017-2023, CC BY 4.0) di Microsoft Planetary Computer; COG dibaca terdesimasi.
Protokol dan hasil: RISET-MODEL-KAB.md bagian "11. LAB tutupan lahan".

Mode (jalankan dengan python venv yang punya numpy+rasterio untuk `ambil`; `uji`/`jalan` stdlib):
  ambil   porsi kelas IO LULC per sel hujan 0,25 derajat per tahun 2017-2023 -> lulc_sel.json (cache, lanjut bila putus)
  jalan   latih model_kab dengan/tanpa fitur tutupan pada barisan latih yang SAMA, nilai di validasi 2022-2023 (uji 2024-2025 TIDAK
          dibuka), bandingkan dengan metrik uji balik yang sudah ada (ETS pada jumlah alarm sama, CI bootstrap blok berpasangan, Brier)
  uji     swauji sintetis tanpa jaringan
"""
import datetime as dt, json, math, os, sys, time, urllib.request
from concurrent.futures import ThreadPoolExecutor

os.environ.setdefault("MODEL_KAB_SEBAGIAN", "1")     # hanya kab yang seluruh sel ERA5-nya sudah di cache; KELUAR model_kab tidak ditulis
DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, DIR)
import model_kab as mk
from umum import MENTAH, baca, simpan
G, ub = mk.G, mk.ub

OUT = os.path.join(MENTAH, "lab_tutupan")
CACHE = os.path.join(OUT, "lulc_sel.json")
TAHUN = list(range(2017, 2024))
KELAS = {1: "water", 2: "trees", 4: "flooded", 5: "crops", 7: "built", 8: "bare", 11: "range"}   # 10 = awan (dikeluarkan dari penyebut)
STAC = "https://planetarycomputer.microsoft.com/api/stac/v1/search?collections=io-lulc-annual-v02&limit=50&bbox="
SAS = "https://planetarycomputer.microsoft.com/api/sas/v1/token/io-lulc-annual-v02"
PX = 100          # jendela sel 0,25 derajat dibaca 100 x 100 (10.000 contoh per sel-tahun)
BIJI_LAB = (1, 2, 3)


def kunci_sel(s):
    return f"{s[0]:.3f}_{s[1]:.3f}"


# ------------------------------------------------------------------ ambil (rasterio)
def _json(url, coba=4):
    for i in range(coba):
        try:
            return json.load(urllib.request.urlopen(url, timeout=90))
        except Exception as e:
            if i == coba - 1:
                raise
            time.sleep(3 * (i + 1))


def _satu_sel(s, token):
    import numpy as np, rasterio
    from rasterio.windows import from_bounds
    from rasterio.warp import transform_bounds
    from rasterio.enums import Resampling
    lat, lon = s
    items = _json(STAC + f"{lon},{lat},{lon},{lat}")["features"]
    per = {}
    for f in items:
        per.setdefault(int(f["id"].split("-")[1]), f)
    out = {}
    for th in TAHUN:
        f = per.get(th)
        if not f:
            continue
        with rasterio.open(f["assets"]["data"]["href"] + "?" + token) as src:
            b = transform_bounds("EPSG:4326", src.crs, lon - .125, lat - .125, lon + .125, lat + .125)
            a = src.read(1, window=from_bounds(*b, transform=src.transform), out_shape=(PX, PX), resampling=Resampling.nearest,
                         boundless=True, fill_value=0)
        v, n = np.unique(a, return_counts=True)
        out[str(th)] = {str(int(k)): int(c) for k, c in zip(v, n)}
    return out


def ambil():
    ev, sk, kabs, sel = mk.muat_sampel()
    cache = baca(CACHE) or {}
    sisa = [s for s in sorted(sel) if kunci_sel(s) not in cache]
    print(f"{len(kabs)} kab, {len(sel)} sel, {len(sisa)} sel belum di cache", file=sys.stderr)
    token = _json(SAS)["token"]
    t0 = time.time()

    def kerja(s):
        try:
            return s, _satu_sel(s, token)
        except Exception as e:                      # noqa: BLE001
            return s, str(e)[:100]
    with ThreadPoolExecutor(6) as ex:
        for i, (s, r) in enumerate(ex.map(kerja, sisa), 1):
            if isinstance(r, dict) and len(r) == len(TAHUN):
                cache[kunci_sel(s)] = r
            else:
                print("  gagal", s, r if isinstance(r, str) else f"hanya {len(r)} tahun", file=sys.stderr)
            if i % 10 == 0:
                simpan(CACHE, cache)
                print(f"  {i}/{len(sisa)} ({time.time() - t0:.0f} dtk)", file=sys.stderr)
    simpan(CACHE, cache)
    return 0 if all(kunci_sel(s) in cache for s in sel) else 1


# ------------------------------------------------------------------ fitur
def porsi(cnt):
    """cnt {kelas: jumlah} -> {nama: porsi dari piksel bertutupan jelas (bukan nodata 0, bukan awan 10)}."""
    tot = sum(c for k, c in cnt.items() if int(k) in KELAS)
    return {n: (cnt.get(str(k), 0) / tot if tot else 0.0) for k, n in KELAS.items()}


def porsi_kab(cache, sel_kab, th):
    """Rata-rata porsi atas sel hujan kabupaten (porsi wilayah kab, bukan maks)."""
    ps = [porsi(cache[kunci_sel(s)][str(th)]) for s in sel_kab]
    return {n: sum(p[n] for p in ps) / len(ps) for n in KELAS.values()}


# fitur tutupan untuk kejadian tahun T: HANYA tahun <= T-1 (tanpa bocor waktu). Nama kolom tambahan:
TUTUPAN = {
    "level": ["lc_built", "lc_trees", "lc_fveg"],             # porsi tahun T-1
    "delta": ["lc_d_built1", "lc_d_trees1"],                  # T-1 dikurangi T-2 (pertambahan built, kehilangan trees = negatif)
}


def kolom_tutupan(cache, sk, kabs, tahun, kelompok):
    """{(kab, tahun): [nilai...]} sesuai urutan nama di TUTUPAN[kelompok...]. T-1 dan T-2 harus ada di 2017-2023 (T >= 2019 untuk delta)."""
    out = {}
    for k in kabs:
        sel = list(sk[k])
        for T in tahun:
            p1 = porsi_kab(cache, sel, min(T - 1, TAHUN[-1]))
            v = []
            if "level" in kelompok:
                v += [p1["built"], p1["trees"], p1["flooded"]]
            if "delta" in kelompok:
                p2 = porsi_kab(cache, sel, min(T - 2, TAHUN[-1]))
                v += [p1["built"] - p2["built"], p1["trees"] - p2["trees"]]
            out[(k, T)] = v
    return out


def tambah(B, kol):
    return {**B, "X": [x + kol[(k, t)] for x, k, t in zip(B["X"], B["kab"], B["tahun"])]}


# ------------------------------------------------------------------ eksperimen
def latih_skor(TR, VA, aktif, seed, hp):
    w = [1.0] * len(TR["y"])
    m = G.latih_gbdt(TR["X"], TR["y"], w, pohon=hp["pohon"], dalam=hp["dalam"], lr=hp["lr"], min_h=hp["min_h"], l2=hp["l2"], sub=hp["sub"],
                     seed=seed, fitur_aktif=aktif)
    z = mk.skor_gbdt(m, VA["X"])
    return mk.pakai_platt(mk.platt(z, VA["y"]), z)


def bandingkan(VA, p_dasar, p_baru, p_klim):
    """Metrik uji balik yang sudah ada: ETS pada jumlah alarm = aturan (Waspada/Siaga), dETS berpasangan CI95 blok kab x tahun, AUC/Brier/BSS."""
    y, bl = VA["y"], mk.blok_indeks(VA)
    r = {"n": len(y), "kej": sum(y), "kab": len({k for k, _ in bl})}
    for nm, p in (("dasar", p_dasar), ("baru", p_baru)):
        r[nm] = {"auc": G.auc(p, y), "brier": G.brier(p, y), "logloss": G.logloss(p, y)}
    r["bss_baru_vs_dasar"] = mk.brier_skill(VA, p_baru, p_dasar, bl)
    for nama, L in mk.LEVEL_ALARM.items():
        n = sum(1 for l in VA["level"] if l >= L)
        bd, bb = (mk.cacah(VA, mk.alarm_sebanyak(p, n), bl) for p in (p_dasar, p_baru))
        d, ci = mk.ci_selisih(bb, bd)
        sd, sb = (ub.skor(*mk.jumlah(b, sorted(b))) for b in (bd, bb))
        r[nama] = {"kont_dasar": mk.jumlah(bd, sorted(bd)), "kont_baru": mk.jumlah(bb, sorted(bb)), "alarm": n, "ets_dasar": sd["ets"], "ets_baru": sb["ets"], "pod_dasar": sd["pod"], "pod_baru": sb["pod"], "far_dasar": sd["far"],
                   "far_baru": sb["far"], "dETS": d, "ci": ci}
    return r


def rata(rs):
    """Rata-rata antar biji pada angka titik (CI diambil dari biji pertama + rata-rata p, lihat jalan())."""
    return rs


def jalan():
    t0 = time.time()
    cache = baca(CACHE)
    ev, sk, kabs, cuaca, pers, penuh, eks, awal = mk.siapkan()
    miss = [kunci_sel(s) for k in kabs for s in sk[k] if kunci_sel(s) not in cache]
    assert not miss, f"cache tutupan kurang {len(miss)} sel: jalankan `ambil`"
    hp = baca(os.path.join(mk.MENTAH, "model_kab_sebagian", "kandidat.json"))["hiper"]    # hiperparameter tetap, tidak disetel di sini
    print(f"{len(kabs)} kab; hiper tetap {hp}")
    n0 = len(mk.FITUR)
    hasil = {}
    for nama, kel, th_latih in (("V1_level", ["level"], range(2018, 2022)), ("V2_level_delta", ["level", "delta"], range(2019, 2022))):
        TR = mk.bangun(cuaca, sk, kabs, ev, th_latih, pers, penuh, eks)
        VA = mk.bangun(cuaca, sk, kabs, ev, mk.VALIDASI, pers, penuh, eks)
        klim = mk.klimatologi(ev, kabs, penuh)
        kt = kolom_tutupan(cache, sk, kabs, list(th_latih) + list(mk.VALIDASI), kel)
        TRb, VAb = tambah(TR, kt), tambah(VA, kt)
        dasar, semua = list(range(n0)), list(range(n0 + len(next(iter(kt.values())))))
        pk, _ = mk.peluang_pembanding(VA, klim, mk.laju_per_level(TR))
        print(f"\n== {nama}: latih {th_latih[0]}-{th_latih[-1]} {len(TR['y'])} baris ({sum(TR['y'])} kejadian), validasi {len(VA['y'])} ({sum(VA['y'])}); {time.time() - t0:.0f} dtk", flush=True)
        per_biji = []
        for sd in BIJI_LAB:
            pd_, pb_ = latih_skor(TRb, VAb, dasar, sd, hp), latih_skor(TRb, VAb, semua, sd, hp)
            per_biji.append((pd_, pb_))
        # rata-rata peluang antar biji (peredam derau pohon acak sub=0,5) lalu bandingkan sekali: CI dan titik konsisten
        pd_ = [sum(v) / len(v) for v in zip(*(a for a, _ in per_biji))]
        pb_ = [sum(v) / len(v) for v in zip(*(b for _, b in per_biji))]
        r = bandingkan(VA, pd_, pb_, pk)
        r["per_biji_dETS"] = {sd: {nm: bandingkan(VA, a, b, pk)[nm]["dETS"] for nm in mk.LEVEL_ALARM} for sd, (a, b) in zip(BIJI_LAB, per_biji)}
        hasil[nama] = r
        for m in ("dasar", "baru"):
            print(f"  {m:6s} AUC {r[m]['auc']:.4f} Brier {r[m]['brier']:.5f} logloss {r[m]['logloss']:.5f}")
        print(f"  BSS baru vs dasar {r['bss_baru_vs_dasar'][0]:+.4f} CI95 [{r['bss_baru_vs_dasar'][1][0]:+.4f}, {r['bss_baru_vs_dasar'][1][1]:+.4f}]")
        for nm in mk.LEVEL_ALARM:
            x = r[nm]
            print(f"  >= {nm} alarm {x['alarm']}: ETS dasar {x['ets_dasar']:.6f} baru {x['ets_baru']:.6f}  dETS {x['dETS']:+.4f} CI95 [{x['ci'][0]:+.4f}, {x['ci'][1]:+.4f}]"
                  f"  POD {x['pod_dasar']:.3f}->{x['pod_baru']:.3f} FAR {x['far_dasar']:.3f}->{x['far_baru']:.3f}")
        print("  kontingensi [a,b,c,d]:", {nm: (r[nm]["kont_dasar"], r[nm]["kont_baru"]) for nm in mk.LEVEL_ALARM})
        print("  dETS per biji:", {sd: {k: round(v, 4) for k, v in d.items()} for sd, d in r["per_biji_dETS"].items()})
    simpan(os.path.join(OUT, "hasil.json"), {"dibuat": dt.date.today().isoformat(), "hasil": hasil, "hiper": hp, "kab": kabs})
    print(f"selesai ({time.time() - t0:.0f} dtk)")


def uji():
    assert porsi({"0": 50, "10": 20, "7": 10, "2": 30}) == {"water": 0.0, "trees": 0.75, "flooded": 0.0, "crops": 0.0, "built": 0.25, "bare": 0.0, "range": 0.0}
    k = kunci_sel((-6.125, 106.875))
    cache = {k: {str(t): {"7": 10 * (t - 2016), "2": 100 - 10 * (t - 2016)} for t in TAHUN}}
    sk = {"31|X": {(-6.125, 106.875): [0, 0]}}
    kt = kolom_tutupan(cache, sk, ["31|X"], [2019, 2022], ["level", "delta"])
    # kejadian 2019 memakai 2018 (built 20/100 = 0,2) dan delta 2018-2017; BUKAN 2019 (0,3)
    assert abs(kt[("31|X", 2019)][0] - 0.2) < 1e-9 and abs(kt[("31|X", 2019)][3] - 0.1) < 1e-9
    assert abs(kt[("31|X", 2022)][0] - 0.5) < 1e-9
    # mengubah tutupan tahun T tidak mengubah fitur tahun T
    c2 = json.loads(json.dumps(cache)); c2[k]["2019"] = {"7": 99, "2": 1}
    assert kolom_tutupan(c2, sk, ["31|X"], [2019], ["level", "delta"]) == {("31|X", 2019): kt[("31|X", 2019)]}
    B = {"kab": ["31|X"], "tahun": [2019], "X": [[1.0]]}
    assert tambah(B, kt)["X"] == [[1.0] + kt[("31|X", 2019)]]
    print("ok lab_tutupan")


if __name__ == "__main__":
    a = sys.argv[1:]
    {"uji": uji, "jalan": jalan}.get(a[0] if a else "", lambda: sys.exit(__doc__))() if a != ["ambil"] else sys.exit(ambil())
