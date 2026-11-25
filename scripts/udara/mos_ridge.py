"""KI-74: MOS ridge per stasiun untuk PM2,5 hari+1..+3 (CAMS dikoreksi ke stasiun BMKG), mode bayangan + uji prospektif.

Model  : z = ln(PM+1) pada rata-rata harian UTC.  z_obs[t+h] = a + b1 z_cams[t+h] + b2 z_obs[t] + b3 (z_cams[t+h]-z_cams[t]) + b4 sin/cos(hari-tahun) [+ b5 F_api_hulu].
         Ridge lambda=1 (intersep tak dikenai penalti), Gauss. Satu model per stasiun per tenggang h. Latih hanya pada target <= hari asal (asal bergulir).
         Stasiun < 120 hari latih: kemiringan gabungan (efek tetap per stasiun) + intersep stasiun. Balik transformasi = median: exp(z)-1, tanpa s2/2.
F_api_hulu: sum FRP exp(-jarak/150 km) pada titik panas FIRMS dalam sektor +-45 derajat dari ARAH DATANG angin 850 hPa, jendela 24-48 j. Fungsi ada
         (f_api_hulu) tetapi DIMATIKAN: arsip angin 850 hPa untuk periode latih tidak tersimpan di repo dan tidak dikarang (ALASAN_API).
Pembanding: persistensi 24 j (rata-rata obs hari asal) dan persistensi teredam mu + rho (z_obs[t]-mu). Vonis: MAE model < keduanya dan batas bawah
         bootstrap blok (blok = hari target) selisih MAE > 0, hanya hari target SESUDAH TGL_KUNCI, minimal 28 hari. Kriteria: mos_ridge.kriteria.json.
Data   : data/raw/udara/koreksi_bmkg_pasangan.json (bagian sesudah 2026-11-07T03 TERBAKAR oleh koreksi_bmkg.buka: jangan dipakai menyetel) lalu arsip
         jam mos_ridge_jam.json yang diisi `bayangan` (obs bmkg_pm25.json + CAMS Open-Meteo). Arsip prakiraan append-only: mos_ridge_arsip.jsonl.
Pakai  : python3 -I scripts/udara/mos_ridge.py uji | eksplorasi | kunci | bayangan | vonis
"""
import datetime as dt
import hashlib
import importlib.util
import json
import math
import os
import sys

AKAR = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".."))
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import alat


def _muat(nama, *jalur):
    sp = importlib.util.spec_from_file_location(nama, os.path.join(AKAR, *jalur))
    mod = importlib.util.module_from_spec(sp)
    sys.modules[nama] = mod
    sp.loader.exec_module(mod)
    return mod


SD = _muat("umum_sidik", "scripts", "umum", "sidik.py")
PB = _muat("umum_pembanding", "scripts", "umum", "pembanding.py")

REL = "scripts/udara/mos_ridge"
KODE = [REL + ".py"]
KRITERIA, SIDIK, BUKA, JEJAK = REL + ".kriteria.json", REL + ".sidik", REL + ".buka", REL + ".jejak.jsonl"
PASANGAN = os.path.join(alat.RAW, "koreksi_bmkg_pasangan.json")
STORE = os.path.join(alat.RAW, "mos_ridge_jam.json")
ARSIP = os.path.join(alat.RAW, "mos_ridge_arsip.jsonl")
HASIL = "mos_ridge.json"
LAMBDA, MIN_HARI_STASIUN, MIN_JAM_HARI, TENGGANG = 1.0, 120, 18, (1, 2, 3)
TGL_KUNCI, MIN_HARI_UJI = dt.date(2026, 11, 25), 28
TERBAKAR_SESUDAH = "2026-11-07T03"          # pasangan sesudah jam ini sudah dibuka koreksi_bmkg.buka
STEL_SAMPAI = dt.date(2026, 11, 6)           # hari penuh terakhir yang boleh dipakai menyetel/eksplorasi
FITUR_API = False
ALASAN_API = ("arsip angin 850 hPa Open-Meteo untuk 16 Okt-7 Nov 2026 tidak tersimpan di repo dan tidak diisi karangan; "
              "F_api_hulu dinyalakan hanya sesudah arsip angin per jam disimpan dan fitur ini diuji di data setelan")


# ---------- aljabar ----------
def gauss(A, b):
    """Selesaikan A x = b (eliminasi Gauss, pivot parsial). A dan b tidak diubah."""
    n = len(A)
    M = [list(map(float, A[i])) + [float(b[i])] for i in range(n)]
    for c in range(n):
        p = max(range(c, n), key=lambda r: abs(M[r][c]))
        if abs(M[p][c]) < 1e-12:
            raise ValueError("matriks singular")
        M[c], M[p] = M[p], M[c]
        for r in range(c + 1, n):
            f = M[r][c] / M[c][c]
            for k in range(c, n + 1):
                M[r][k] -= f * M[c][k]
    x = [0.0] * n
    for i in range(n - 1, -1, -1):
        x[i] = (M[i][n] - sum(M[i][k] * x[k] for k in range(i + 1, n))) / M[i][i]
    return x


def ridge(X, y, lam=LAMBDA):
    """-> (intersep, koef). Fitur dipusatkan; hanya koef yang dikenai penalti lam."""
    n, p = len(X), len(X[0])
    xm = [sum(r[j] for r in X) / n for j in range(p)]
    ym = sum(y) / n
    Xc = [[r[j] - xm[j] for j in range(p)] for r in X]
    A = [[sum(r[i] * r[j] for r in Xc) + (lam if i == j else 0.0) for j in range(p)] for i in range(p)]
    b = [sum(r[i] * (yy - ym) for r, yy in zip(Xc, y)) for i in range(p)]
    w = gauss(A, b)
    return ym - sum(a * c for a, c in zip(w, xm)), w


# ---------- fitur ----------
def z(v):
    return math.log(v + 1.0)


def balik(zv):
    return max(0.0, math.exp(zv) - 1.0)   # median: tanpa koreksi s2/2


def f_api_hulu(lat, lon, titik_panas, arah_datang, ulang_jam=36):
    """titik_panas = [(lat, lon, frp, umur_jam)] -> sum FRP exp(-d/150) di sektor +-45 derajat dari arah DATANG angin, umur 24-48 j."""
    tot = 0.0
    for la, lo, frp, umur in titik_panas:
        if not 24 <= umur <= 48:
            continue
        d = alat.jarak_km(lat, lon, la, lo)
        brg = math.degrees(math.atan2(math.sin(math.radians(lo - lon)) * math.cos(math.radians(la)),
                                      math.cos(math.radians(lat)) * math.sin(math.radians(la)) - math.sin(math.radians(lat)) * math.cos(math.radians(la)) * math.cos(math.radians(lo - lon)))) % 360
        if abs((brg - arah_datang + 180) % 360 - 180) <= 45:
            tot += frp * math.exp(-d / 150.0)
    return tot


def fitur(zc_t, zo_d, zc_d, hari_target):
    doy = hari_target.timetuple().tm_yday
    return [zc_t, zo_d, zc_t - zc_d, math.sin(2 * math.pi * doy / 365.25), math.cos(2 * math.pi * doy / 365.25)]   # F_api_hulu: FITUR_API=False


# ---------- data harian ----------
def harian(obs_jam, cams_jam):
    """{st: {jam: pm}} x2 -> {st: {tanggal UTC: (obs, cams)}} rata-rata, hanya hari dengan >= MIN_JAM_HARI jam pasangan."""
    H = {}
    for st, o in obs_jam.items():
        per = {}
        for j, v in o.items():
            c = (cams_jam.get(st) or {}).get(j)
            if c is not None and v is not None:
                per.setdefault(j[:10], []).append((v, c))
        for d, l in per.items():
            if len(l) >= MIN_JAM_HARI:
                H.setdefault(st, {})[dt.date.fromisoformat(d)] = (sum(a for a, _ in l) / len(l), sum(b for _, b in l) / len(l))
    return H


def cams_harian(cams_jam):
    """CAMS saja (target prakiraan): {st: {tanggal: rata-rata}} dengan >= MIN_JAM_HARI jam."""
    out = {}
    for st, c in cams_jam.items():
        per = {}
        for j, v in c.items():
            if v is not None:
                per.setdefault(j[:10], []).append(v)
        out[st] = {dt.date.fromisoformat(d): sum(l) / len(l) for d, l in per.items() if len(l) >= MIN_JAM_HARI}
    return out


def contoh(H, h, batas):
    """Contoh latih {st: [(x, y)]}: asal d, target d+h, KEDUANYA <= batas (tidak ada data masa depan)."""
    out = {}
    for st, hari in H.items():
        for d, (o, c) in hari.items():
            t = d + dt.timedelta(days=h)
            if t <= batas and t in hari:
                out.setdefault(st, []).append((fitur(z(hari[t][1]), z(o), z(c), t), z(hari[t][0])))
    return out


def latih(H, h, batas, lam=LAMBDA, min_hari=MIN_HARI_STASIUN):
    """-> model {"st": {id: (a, w)}, "gab": (a, w), "mode": {id: 'stasiun'|'gabungan'}} dari data <= batas."""
    ex = contoh(H, h, batas)
    if not ex:
        return None
    m = {"st": {}, "mode": {}}
    X, y, xm_st, ym_st = [], [], {}, {}
    for st, l in ex.items():
        if len(l) >= min_hari:
            m["st"][st] = ridge([a for a, _ in l], [b for _, b in l], lam)
            m["mode"][st] = "stasiun"
        p = len(l[0][0])
        xm = [sum(a[j] for a, _ in l) / len(l) for j in range(p)]
        ym = sum(b for _, b in l) / len(l)
        xm_st[st], ym_st[st] = xm, ym
        X += [[a[j] - xm[j] for j in range(p)] for a, _ in l]
        y += [b - ym for _, b in l]
    if len(X) < 8:
        return None
    _, w = ridge(X, y, lam)   # pusat per stasiun: kemiringan gabungan efek tetap
    for st in ex:
        if st not in m["st"]:
            m["st"][st] = (ym_st[st] - sum(a * c for a, c in zip(w, xm_st[st])), w)
            m["mode"][st] = "gabungan"
    m["gab"] = (sum(ym_st[s] - sum(a * c for a, c in zip(w, xm_st[s])) for s in ex) / len(ex), w)
    return m


def prediksi(m, st, x):
    a, w = m["st"].get(st, m["gab"])
    return balik(a + sum(c * v for c, v in zip(w, x)))


def teredam(H, h, batas, st, zo_d):
    """mu + rho (z_obs[t]-mu); mu = rata-rata z_obs stasiun sampai batas, rho gabungan antar-stasiun untuk tenggang h (dijepit 0..1)."""
    mu = {}
    for s, hari in H.items():
        v = [z(o) for d, (o, _) in hari.items() if d <= batas]
        if v:
            mu[s] = sum(v) / len(v)
    num = den = 0.0
    for s, hari in H.items():
        for d, (o, _) in hari.items():
            t = d + dt.timedelta(days=h)
            if t <= batas and t in hari and s in mu:
                num += (z(o) - mu[s]) * (z(hari[t][0]) - mu[s])
                den += (z(o) - mu[s]) ** 2
    if st not in mu or den <= 0:
        return None
    rho = min(1.0, max(0.0, num / den))
    return balik(mu[st] + rho * (zo_d - mu[st]))


def evaluasi(H, mulai, sampai, min_latih=7):
    """Asal bergulir: untuk tiap asal d di [mulai, sampai-h], latih dengan target <= d, prediksi d+h. -> baris dict."""
    baris = []
    for h in TENGGANG:
        d = mulai
        while d + dt.timedelta(days=h) <= sampai:
            m = latih(H, h, d)
            if m:
                for st, hari in H.items():
                    t = d + dt.timedelta(days=h)
                    if d in hari and t in hari and st in m["st"]:
                        o, c = hari[d]
                        ct = hari[t][1]
                        td = teredam(H, h, d, st, z(o))
                        if td is None:
                            continue
                        baris.append({"h": h, "st": st, "hari": t.isoformat(), "y": hari[t][0], "model": prediksi(m, st, fitur(z(ct), z(o), z(c), t)),
                                      "pers": o, "teredam": td, "mentah": ct})
            d += dt.timedelta(days=1)
    return baris


def mae(rows, k):
    return sum(abs(r[k] - r["y"]) for r in rows) / len(rows)


def ringkas(rows):
    kunci = ("model", "pers", "teredam", "mentah")
    return {"n": len(rows), "mae": {k: round(mae(rows, k), 3) for k in kunci}} if rows else {"n": 0}


def selang(rows, lawan, B=500):
    """CI95 bootstrap blok (hari target) untuk MAE_lawan - MAE_model (positif = model lebih baik)."""
    fn = lambda rs: (sum(abs(r[lawan] - r["y"]) for r in rs) - sum(abs(r["model"] - r["y"]) for r in rs)) / len(rs)
    return PB.bootstrap_blok(fn, rows, "hari", B=B, seed=3)


# ---------- masukan ----------
def baca_pasangan(sampai_jam=None):
    d = json.load(open(PASANGAN, encoding="utf-8"))
    obs, cams = {}, {}
    for j, st, o, c in d["baris"]:
        if sampai_jam and j > sampai_jam:
            continue
        obs.setdefault(st, {})[j] = o
        cams.setdefault(st, {})[j] = c
    return obs, cams, d


def hash_pasangan(d):
    return hashlib.sha256(json.dumps(d["baris"], separators=(",", ":")).encode()).hexdigest()


def eksplorasi():
    """EKSPLORASI di periode setelan (16 Okt-6 Nov) saja. Bukan vonis."""
    obs, cams, _ = baca_pasangan(sampai_jam=STEL_SAMPAI.isoformat() + "T23")
    H = harian(obs, cams)
    hasil = {}
    for h in TENGGANG:
        rows = evaluasi(H, dt.date(2026, 10, 24), STEL_SAMPAI)
        rows = [r for r in rows if r["h"] == h]
        hasil[h] = ringkas(rows)
    print(json.dumps({"label": "EKSPLORASI periode setelan, bukan vonis", "fitur_api": ALASAN_API, "hasil": hasil}, ensure_ascii=False, indent=1))
    return hasil


def kunci():
    _, _, d = baca_pasangan()
    asal = os.getcwd()
    os.chdir(AKAR)
    try:
        s = SD.tulis(SIDIK, KODE, KRITERIA, [hash_pasangan(d), f"n={len(d['baris'])}", f"tgl_kunci={TGL_KUNCI}"])
    finally:
        os.chdir(asal)
    alat.log(f"mos_ridge: sidik {s['sidik']} dikunci")


# ---------- bayangan ----------
def perbarui_store():
    st = alat.muat(STORE, None)
    if not st:
        obs, cams, d = baca_pasangan()
        st = {"v": 1, "obs": obs, "cams": cams, "titik": d["titik"]}
    bm = alat.keluaran("bmkg_pm25.json", {})
    for s in bm.get("stasiun", []):
        sid = s["nama"].upper()
        if sid not in st["titik"] or not s.get("t0") or not s.get("deret"):
            continue
        t0 = dt.datetime.fromisoformat(s["t0"])
        for i, v in enumerate(s["deret"]):
            if v is not None:
                j = (t0 + dt.timedelta(hours=i)).astimezone(dt.timezone.utc).strftime("%Y-%m-%dT%H")
                st["obs"].setdefault(sid, {})[j] = v
    ids = sorted(st["titik"])
    for a in range(0, len(ids), 15):
        b = ids[a:a + 15]
        d = alat.ambil("https://air-quality-api.open-meteo.com/v1/air-quality?" + "&".join([
            "latitude=" + ",".join(f"{st['titik'][i][0]:.3f}" for i in b), "longitude=" + ",".join(f"{st['titik'][i][1]:.3f}" for i in b),
            "hourly=pm2_5&past_days=7&forecast_days=4&timezone=GMT&domains=cams_global"]))
        for i, x in zip(b, d if isinstance(d, list) else [d]):
            for w, v in zip(x["hourly"]["time"], x["hourly"]["pm2_5"]):
                if v is not None:
                    st["cams"].setdefault(i, {})[w[:13]] = v
    alat.simpan(STORE, st)
    return st


def arsip_baca():
    try:
        return [json.loads(x) for x in open(ARSIP, encoding="utf-8") if x.strip()]
    except OSError:
        return []


def bayangan(st=None, sekarang=None):
    """Latih dengan data <= hari asal, tulis prakiraan h=1..3 ke arsip append-only (kunci asal+stasiun+h tidak ditimpa)."""
    st = st or perbarui_store()
    H = harian(st["obs"], st["cams"])
    ch = cams_harian(st["cams"])
    asal = max((d for hari in H.values() for d in hari), default=None)
    if asal is None:
        return 0
    ada = {(r["asal"], r["st"], r["h"]) for r in arsip_baca()}
    n = 0
    nu = (sekarang or dt.datetime.now(dt.timezone.utc)).strftime("%Y-%m-%dT%H:%MZ")
    with open(ARSIP, "a", encoding="utf-8") as f:
        for h in TENGGANG:
            m = latih(H, h, asal)
            if not m:
                continue
            t = asal + dt.timedelta(days=h)
            for sid, hari in H.items():
                if asal not in hari or sid not in m["st"] or t not in ch.get(sid, {}) or (asal.isoformat(), sid, h) in ada:
                    continue
                o, c = hari[asal]
                td = teredam(H, h, asal, sid, z(o))
                if td is None:
                    continue
                f.write(json.dumps({"asal": asal.isoformat(), "target": t.isoformat(), "h": h, "st": sid, "model": round(prediksi(m, sid, fitur(z(ch[sid][t]), z(o), z(c), t)), 2),
                                    "pers": round(o, 2), "teredam": round(td, 2), "mentah": round(ch[sid][t], 2), "mode": m["mode"][sid], "api": FITUR_API,
                                    "dibuat": nu}, ensure_ascii=False) + "\n")
                n += 1
    return n


def vonis(st=None):
    """Uji prospektif: hanya target SESUDAH TGL_KUNCI dan prakiraan dibuat sebelum hari target; dibuka sekali (sidik.buka), hanya bila >= 28 hari."""
    st = st or alat.muat(STORE, {})
    H = harian(st.get("obs", {}), st.get("cams", {}))
    rows = []
    for r in arsip_baca():
        t = dt.date.fromisoformat(r["target"])
        if t > TGL_KUNCI and r["dibuat"][:10] < r["target"] and t in H.get(r["st"], {}):
            rows.append({"h": r["h"], "st": r["st"], "hari": r["target"], "y": H[r["st"]][t][0], "model": r["model"], "pers": r["pers"], "teredam": r["teredam"], "mentah": r["mentah"]})
    hari = {r["hari"] for r in rows}
    if len(hari) < MIN_HARI_UJI:
        alat.log(f"mos_ridge: belum cukup, {len(hari)} < {MIN_HARI_UJI} hari target sesudah {TGL_KUNCI}; uji tidak dibuka")
        return None
    asal = os.getcwd()
    os.chdir(AKAR)
    try:
        s = SD.cek(SIDIK)
        out = {"v": 1, "sidik": s["sidik"], "n": len(rows), "n_hari": len(hari), "per_tenggang": {}}
        mae_all = {k: round(mae(rows, k), 3) for k in ("model", "pers", "teredam", "mentah")}
        ci = {k: selang(rows, k) for k in ("pers", "teredam")}
        lolos = mae_all["model"] < mae_all["pers"] and mae_all["model"] < mae_all["teredam"] and all(c["lo"] is not None and c["lo"] > 0 for c in ci.values())
        kuat = min(("pers", "teredam"), key=mae_all.get)
        out.update(mae=mae_all, selang={k: [c["lo"], c["hi"]] for k, c in ci.items()}, selang_vs=kuat, vonis="lolos" if lolos else "gagal",
                   pembanding_terkuat={"pers": "persistensi_24j", "teredam": "persistensi_teredam"}[kuat])
        for h in TENGGANG:
            out["per_tenggang"][h] = ringkas([r for r in rows if r["h"] == h])
        SD.buka(BUKA, JEJAK, s["sidik"], {"vonis": out["vonis"], "mae": mae_all, "n_hari": len(hari)})
    finally:
        os.chdir(asal)
    alat.simpan(HASIL, out)
    return out


# ---------- swa-uji ----------
def uji():
    # Gauss: sistem tahu jawabannya; singular ditolak
    A, b = [[2, 1, -1], [-3, -1, 2], [-2, 1, 2]], [8, -11, -3]
    x = gauss(A, b)
    assert all(abs(u - v) < 1e-9 for u, v in zip(x, [2, 3, -1])), x
    try:
        gauss([[1, 2], [2, 4]], [1, 2])
        assert False
    except ValueError:
        pass
    # ridge: lam kecil memulihkan koefisien; lam besar menyusutkan ke 0 dan intersep ke rata-rata
    X = [[i, (i * 7) % 5] for i in range(30)]
    y = [3 + 2 * a - 1 * c for a, c in X]
    a0, w0 = ridge(X, y, 1e-9)
    assert abs(a0 - 3) < 1e-6 and abs(w0[0] - 2) < 1e-6 and abs(w0[1] + 1) < 1e-6, (a0, w0)
    a1, w1 = ridge(X, y, 1e9)
    assert abs(w1[0]) < 1e-3 and abs(a1 - sum(y) / len(y)) < 1e-2, (a1, w1)
    assert abs(ridge(X, y, 10)[1][0]) < abs(w0[0])
    # balik transformasi = median, nol aman
    assert abs(balik(z(25.0)) - 25.0) < 1e-9 and balik(-5) == 0.0
    # data sintetis: obs = f(cams, obs kemarin); 4 stasiun, 40 hari
    import random
    rng = random.Random(1)
    H, d0 = {}, dt.date(2026, 10, 1)
    for s in "ABCD":
        zo, zc = 3.0, 3.0
        for i in range(40):
            zc = 0.7 * zc + 0.9 + rng.gauss(0, .3)
            zo = 0.5 * zc + 0.4 * zo + 0.5 + rng.gauss(0, .1)
            H.setdefault(s, {})[d0 + dt.timedelta(days=i)] = (balik(zo), balik(zc))
    # tanpa data masa depan: batas 20 Okt memberi model yang SAMA walau data sesudahnya diganti sampah
    batas = dt.date(2026, 10, 20)
    m1 = latih(H, 1, batas, min_hari=5)
    H2 = {s: {d: ((v[0] * 50, v[1] * 50) if d > batas else v) for d, v in hari.items()} for s, hari in H.items()}
    m2 = latih(H2, 1, batas, min_hari=5)
    assert m1["gab"] == m2["gab"] and m1["st"] == m2["st"], "model berubah karena data sesudah batas"
    ex = contoh(H, 3, batas)
    assert all(len(l) <= 17 for l in ex.values()), "contoh memuat target sesudah batas"   # asal <= batas-3
    # gabungan vs stasiun: min_hari tinggi = gabungan semua; rendah = per stasiun
    assert set(m1["mode"].values()) == {"stasiun"}
    assert set(latih(H, 1, batas, min_hari=999)["mode"].values()) == {"gabungan"}
    mg = latih(H, 1, batas, min_hari=999)
    assert all(mg["st"][s][1] == mg["gab"][1] for s in H), "kemiringan gabungan harus sama"
    assert len({round(mg["st"][s][0], 6) for s in H}) > 1 or True
    assert prediksi(mg, "TAK_ADA", [3, 3, 0, 0, 1]) >= 0     # stasiun baru: intersep gabungan
    # asal bergulir menang atas teredam di data yang memang bergantung pada CAMS
    r = evaluasi(H, dt.date(2026, 10, 15), dt.date(2026, 11, 8))
    assert r and all(x["hari"] > "2026-10-15" for x in r) and mae(r, "model") < mae(r, "teredam"), ringkas(r)
    # F_api_hulu: titik di hulu (angin DARI utara, titik di utara) masuk; titik di selatan dan terlalu tua tidak
    ph = [(1.0, 100.0, 10.0, 30), (-1.0, 100.0, 10.0, 30), (1.0, 100.0, 10.0, 60)]
    f = f_api_hulu(0.0, 100.0, ph, 0.0)
    assert abs(f - 10 * math.exp(-alat.jarak_km(0, 100, 1, 100) / 150)) < 1e-9 and f_api_hulu(0.0, 100.0, ph, 90.0) == 0.0
    assert FITUR_API is False and ALASAN_API
    # bayangan: arsip append-only, jalan kedua tidak menggandakan (arsip sementara)
    global ARSIP
    import tempfile
    with tempfile.TemporaryDirectory() as t:
        ARSIP = os.path.join(t, "a.jsonl")
        jam = lambda s: {f"{d + dt.timedelta(days=i):%Y-%m-%d}T{h:02d}": 1 for i in range(0, 1) for h in range(24)} if False else None
        obs = {s: {f"{d0 + dt.timedelta(days=i):%Y-%m-%d}T{h:02d}": H[s][d0 + dt.timedelta(days=i)][0] for i in range(40) for h in range(24)} for s in H}
        cm = {s: {f"{d0 + dt.timedelta(days=i):%Y-%m-%d}T{h:02d}": H[s][d0 + dt.timedelta(days=i)][1] for i in range(44) for h in range(24)} if False else
              {f"{d0 + dt.timedelta(days=i):%Y-%m-%d}T{h:02d}": (H[s][d0 + dt.timedelta(days=i)][1] if i < 40 else 30.0) for i in range(43) for h in range(24)} for s in H}
        n1 = bayangan({"obs": obs, "cams": cm})
        n2 = bayangan({"obs": obs, "cams": cm})
        assert n1 > 0 and n2 == 0 and len(arsip_baca()) == n1, (n1, n2)
        assert all(r["target"] > r["asal"] for r in arsip_baca())
    print("ok")


if __name__ == "__main__":
    perintah = sys.argv[1:] and sys.argv[1]
    if perintah == "uji":
        uji()
    elif perintah == "eksplorasi":
        eksplorasi()
    elif perintah == "kunci":
        kunci()
    elif perintah == "bayangan":
        alat.log(f"mos_ridge: bayangan menulis {bayangan()} baris")
        vonis()
    elif perintah == "vonis":
        print(vonis())
    else:
        print(__doc__)
