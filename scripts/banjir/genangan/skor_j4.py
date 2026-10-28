"""Penilai J4 (PRAREG-J4.md): fungsi murni atas raster kedalaman maks (mesin.mjs --raster) dan laporan banjir tersaring (petabencana.py saring).
Beda dari skor_j3.py (POD radius 300 m, jenuh): ukuran yang menormalkan luas.
  AUC     laporan vs titik darat acak (kontrol), skor = kedalaman maks (m) dalam radius 300 m; seri = 0,5
  POD     bagian laporan dengan sel basah (>= 10 cm) dalam 300 m;  POFD = bagian kontrol dengan sel basah dalam 300 m
  HSS     Heidke dari tabel laporan/kontrol, kontrol dibobot n_laporan/n_kontrol (seimbang); Peirce = POD - POFD
  NULL    medan basah acak BERKLASTER (blok b x b sel, b = 5 dan 10) dengan jumlah sel basah darat SAMA; 100 benih; laporan dan kontrol tetap
          -> POD, HSS null (p50, p95) dan p = bagian benih dengan HSS >= model (nilai kecil = model lebih baik dari acak berklaster)
Kontrol = sel darat acak seragam (bukan "bukti kering": laporan hanya positif, jadi AUC/HSS mengukur tempat laporan relatif terhadap daratan, bukan akurasi mutlak).
Pakai:  python3 scripts/banjir/genangan/skor_j4.py uji
"""
import array, bisect, datetime as dt, json, math, os, random, sys

D = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, D)
import skor_j3  # noqa: E402

AMBANG, RADIUS, BENIH, N_KONTROL, N_NULL, BLOK = skor_j3.AMBANG, skor_j3.RADIUS, 7, 4000, 100, (5, 10)


def muat_label(mulai, jam=96, berkas=None, kec=None):
    """Laporan banjir tersaring (petabencana_banjir.json) dalam jendela [mulai 00:00 WIB, +jam), di dalam poligon DKI, tanpa duplikat -> [{t, lon, lat, kedalaman_cm, kab, kec}]."""
    import bersama
    berkas = berkas or os.path.join(bersama.MENTAH, "petabencana_banjir.json"); kec = kec or bersama.KecDKI()
    a = dt.datetime.fromisoformat(mulai + "T00:00:00+07:00"); b = a + dt.timedelta(hours=jam); lihat, o = set(), []
    for r in json.load(open(berkas)):
        if not (a <= dt.datetime.fromisoformat(r["t"]) < b):
            continue
        k = (r["t"], r["lon"], r["lat"], r["kedalaman_cm"])
        if k in lihat:
            continue
        lihat.add(k); c = kec.cari(r["lon"], r["lat"])
        if c:
            o.append({"t": r["t"], "lon": r["lon"], "lat": r["lat"], "kedalaman_cm": r["kedalaman_cm"], "kab": c[0], "kec": c[1]})
    return o


def cakram(dx, radius=RADIUS):
    r = math.ceil(radius / dx)
    return [(i, j) for j in range(-r, r + 1) for i in range(-r, r + 1) if math.hypot(i, j) * dx <= radius]


def dilasi(R, nilai, cak):
    """nilai: {indeks sel: nilai > 0} (jarang) -> larik float N: maks nilai dalam cakram di sekitar tiap sel."""
    nx, ny = R["nx"], R["ny"]; out = array.array("f", bytes(4 * nx * ny))
    for k, v in nilai.items():
        i0, j0 = k % nx, k // nx
        for di, dj in cak:
            i, j = i0 + di, j0 + dj
            if 0 <= i < nx and 0 <= j < ny and out[j * nx + i] < v:
                out[j * nx + i] = v
    return out


def sel_titik(R, lon, lat):
    ci, cj = (lon - R["lon0"]) / R["dlon"], (R["lat0"] - lat) / R["dlat"]
    i, j = round(ci), round(cj)
    return j * R["nx"] + i if 0 <= i < R["nx"] and 0 <= j < R["ny"] else None


def kontrol_sel(R, n=N_KONTROL, benih=BENIH):
    """n sel darat acak (kec >= 0), seragam, benih tetap."""
    rng = random.Random(benih); N = R["nx"] * R["ny"]; out = []
    while len(out) < n:
        k = rng.randrange(N)
        if R["kec"][k] >= 0:
            out.append(k)
    return out


def auc(pos, neg):
    """P(skor laporan > skor kontrol) + 0,5 P(seri)."""
    s = sorted(neg); n = len(s)
    if not pos or not n:
        return None
    return sum((bisect.bisect_left(s, x) + bisect.bisect_right(s, x)) / 2 for x in pos) / (len(pos) * n)


def hss(a, b, c, d):
    """Heidke dari tabel (boleh pecahan berbobot); None bila penyebut 0."""
    pen = (a + c) * (c + d) + (a + b) * (b + d)
    return None if pen == 0 else 2 * (a * d - b * c) / pen


def tabel(basah_dekat, sel_lap, sel_kon):
    """-> (pod, pofd, hss) dari mask basah-dekat (indeks sel -> bool)."""
    a = sum(bool(basah_dekat[k]) for k in sel_lap); c = len(sel_lap) - a
    b = sum(bool(basah_dekat[k]) for k in sel_kon); d = len(sel_kon) - b; w = len(sel_lap) / len(sel_kon)
    return a / len(sel_lap), b / len(sel_kon), hss(a, b * w, c, d * w)


def null_klaster(R, n_sel, blok, rng):
    """Sel basah acak berklaster: blok blok x blok ditempel di sudut acak sampai >= n_sel sel darat basah (kelebihan <= blok^2 sel dibiarkan)."""
    nx, ny = R["nx"], R["ny"]; ya = set()
    while len(ya) < n_sel:
        i0, j0 = rng.randrange(nx), rng.randrange(ny)
        for j in range(j0, min(ny, j0 + blok)):
            for i in range(i0, min(nx, i0 + blok)):
                if R["kec"][j * nx + i] >= 0:
                    ya.add(j * nx + i)
    return dict.fromkeys(ya, 1.0)   # kelebihan <= blok^2 sel (<1% luas): luas "sama" sampai selisih itu


def pctl(v, p):
    v = sorted(v); return v[min(len(v) - 1, int(p * len(v)))] if v else None


def nilai(R, lap, n_null=N_NULL, benih=BENIH, n_kontrol=N_KONTROL):
    """Semua metrik J4 untuk satu raster dan satu daftar laporan (sudah dalam DKI). -> dict."""
    cak = cakram(R["dx_m"]); hm = R["hm"]
    sel_lap = [k for k in (sel_titik(R, r["lon"], r["lat"]) for r in lap) if k is not None]
    kon = kontrol_sel(R, n_kontrol, benih)
    if not sel_lap:
        return {"n_laporan": 0}
    dalam = {k: v for k, v in enumerate(hm) if v > 0 and R["kec"][k] >= 0}
    dil = dilasi(R, dalam, cak)
    wet = {k: v for k, v in dalam.items() if v >= AMBANG}; dilw = dilasi(R, wet, cak)
    land = sum(1 for c in R["kec"] if c >= 0)
    pod, pofd, h = tabel([x >= AMBANG for x in dilw], sel_lap, kon)
    o = {"n_laporan": len(sel_lap), "luas_basah": len(wet) / land, "auc": auc([dil[k] for k in sel_lap], [dil[k] for k in kon]),
         "pod": pod, "pofd": pofd, "peirce": pod - pofd, "hss": h, "null": {}}
    if "diangkat" in R:   # fraksi sel basah yang berada di sel cekungan yang diangkat; dasarnya = fraksi sel darat diangkat
        dg = R["diangkat"]; o["basah_di_diangkat"] = sum(dg[k] for k in wet) / len(wet) if wet else None; o["darat_diangkat"] = sum(dg[k] for k in range(len(dg)) if R["kec"][k] >= 0) / land
    for b in BLOK:
        rng = random.Random(benih); P, H = [], []
        for _ in range(n_null):
            nl = null_klaster(R, len(wet), b, rng); dn = dilasi(R, nl, cak); p, _f, hh = tabel([x > 0 for x in dn], sel_lap, kon)
            P.append(p); H.append(hh if hh is not None else -1)
        o["null"][f"b{b}"] = {"pod_p50": pctl(P, .5), "pod_p95": pctl(P, .95), "hss_p50": pctl(H, .5), "hss_p95": pctl(H, .95),
                              "p_hss": sum(x >= (h if h is not None else -1) for x in H) / len(H)}
    return o


def baca_raster(jalur):
    R = skor_j3.baca_raster(jalur)
    if "diangkat" in R and isinstance(R["diangkat"], str):
        import base64; R["diangkat"] = bytes(base64.b64decode(R["diangkat"]))
    return R


def uji():
    nx = ny = 40; N = nx * ny; kec = array.array("h", [0] * N); hm = array.array("f", [0.0] * N)
    for j in range(10, 20):                              # sel basah 10x10 di (10..19, 10..19), kedalaman 0,5 m
        for i in range(10, 20):
            hm[j * nx + i] = 0.5
    R = {"nx": nx, "ny": ny, "dx_m": 100.0, "lon0": 0.0, "lat0": 0.0, "dlon": 1e-3, "dlat": 1e-3, "nama": ["A|a"], "kec": kec, "hm": hm}
    lap = [{"lon": (10 + i % 10) * 1e-3, "lat": -(10 + i // 10 % 10) * 1e-3} for i in range(100)]    # laporan semuanya di dalam kotak basah
    assert abs(auc([2, 3], [1, 2]) - 0.875) < 1e-9 and auc([1], [1]) == 0.5 and auc([], [1]) is None
    assert hss(10, 0, 0, 10) == 1 and abs(hss(5, 5, 5, 5)) < 1e-12 and hss(0, 0, 0, 0) is None
    cak = cakram(100.0); assert len(cak) == 29 and (0, 0) in cak
    dil = dilasi(R, {5 * nx + 5: 1.0}, cak); assert dil[5 * nx + 5] == 1.0 and dil[5 * nx + 8] == 1.0 and dil[5 * nx + 9] == 0.0 and dil[6 * nx + 6] == 1.0
    n = nilai(R, lap, n_null=20, n_kontrol=500)
    assert n["n_laporan"] == 100 and n["pod"] == 1.0 and n["auc"] > 0.9 and n["hss"] > 0.8 and abs(n["luas_basah"] - 100 / N) < 1e-9, n
    assert n["null"]["b5"]["hss_p95"] < n["hss"] and n["null"]["b10"]["p_hss"] < 0.2, n["null"]    # model tepat >> null acak berklaster
    s = null_klaster(R, 120, 5, random.Random(1)); assert 120 <= len(s) < 120 + 25
    kon = kontrol_sel(R, 50); assert len(kon) == 50 and all(R["kec"][k] >= 0 for k in kon) and kon == kontrol_sel(R, 50)
    with __import__("tempfile").TemporaryDirectory() as t:
        p = os.path.join(t, "pb.json")
        json.dump([{"t": "2020-01-01T10:00:00+07:00", "lon": 106.82, "lat": -6.2, "kedalaman_cm": 30}, {"t": "2020-01-01T10:00:00+07:00", "lon": 106.82, "lat": -6.2, "kedalaman_cm": 30},
                   {"t": "2020-03-01T10:00:00+07:00", "lon": 106.82, "lat": -6.2, "kedalaman_cm": 30}, {"t": "2020-01-01T10:00:00+07:00", "lon": 105.0, "lat": -6.2, "kedalaman_cm": 30}], open(p, "w"))
        l = muat_label("2019-12-30", 96, berkas=p); assert len(l) == 1 and l[0]["kab"] and l[0]["kec"], l      # dedup, jendela, poligon DKI
    print("ok")


if __name__ == "__main__":
    uji() if sys.argv[1:] == ["uji"] else sys.exit(__doc__)
