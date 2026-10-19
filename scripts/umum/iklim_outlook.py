"""Outlook iklim (pola P6): hujan musiman Indonesia ~ Nino (RONI) x Dipol Samudra Hindia (DMI) -> public/data/iklim_outlook.json

Pakai:  python3 scripts/umum/iklim_outlook.py        ambil data (cache data/raw/iklim/), fit, tulis berkas
        python3 scripts/umum/iklim_outlook.py uji    self-check luring (tanpa jaringan, tanpa berkas)

Sumber (semua publik, tanpa kunci):
  Hujan   CHIRPS v2.0 bulanan 0,05 deg, 1981-kini (UCSB CHG; Funk dkk. 2015), lewat IRI Data Library Columbia
          (iridl.ldeo.columbia.edu/SOURCES/.UCSB/.CHIRPS/.v2p0/.monthly/.global/.precipitation). Rerata per kotak
          lintang-bujur; laut bertopeng di CHIRPS sehingga yang terhitung hanya sel daratan. Nasional = rerata
          kotak berbobot JUMLAH SEL DARATAN tiap kotak (sel 0,05 deg di khatulistiwa: selisih luas < 2%).
  RONI    NOAA CPC RONI.ascii.txt (musim 3-bulanan, 1950-kini), dibaca ulang lewat scripts/data/iklim.py.
  DMI     NOAA PSL dmi.had.long.data (HadISST 1.1, bulanan, 1870-kini, tertinggal sekitar 4 bulan).
          Nilai terkini (setelah bulan terakhir HadISST) = rerata 4 minggu terakhir DMI OISST mingguan NOAA OSMC
          (yang sama dipakai scripts/data/iklim.py). Dua produk SST berbeda: kecocokannya pada bulan tumpang-tindih
          dilaporkan di medan "dmi_perbandingan".

Model, per kotak x per musim 3-bulanan (12 musim bergulir DJF..NDJ; musim dinamai awalan bulan, tahun = tahun bulan tengah):
  hujan% = a + b*RONI + c*DMI + d*RONI*DMI,  hujan% = 100*(total musim / rerata 1991-2020 musim yang sama - 1).
  OLS ditulis tangan. Galat leave-one-out dihitung eksak lewat matriks topi (e_i/(1-h_ii)) dan dibandingkan dengan
  prakiraan iklim biasa (rerata tahun lain, juga leave-one-out): skill_loo = 1 - SSE_model/SSE_iklim_biasa.
  Kalimat "tiap +1 C ..." hanya ditulis bila |t|>=2 dan skill_loo>0; selain itu ditulis tidak teruji.
Prakiraan: pendorong musim depan = PERSISTENSI nilai terakhir (CPC tidak punya angka RONI prakiraan yang bisa dibaca
  mesin di sini). Tahun pembanding: 5 tahun terdekat di ruang (RONI, DMI) terstandar pada musim yang sama.
"""
import datetime as dt
import importlib.util
import json
import math
import os
import re
import sys
import threading
import time
import urllib.request
from concurrent.futures import ThreadPoolExecutor

AKAR = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "../.."))
KELUAR = os.path.join(AKAR, "public/data/iklim_outlook.json")
MENTAH = os.path.join(AKAR, "data/raw/iklim")
IRI = "https://iridl.ldeo.columbia.edu/SOURCES/.UCSB/.CHIRPS/.v2p0/.monthly/.global/.precipitation"
DMI_HAD = "https://psl.noaa.gov/gcos_wgsp/Timeseries/Data/dmi.had.long.data"
UA = "poskokarhutla/1.0 (pantau bencana; data publik)"
MULAI_HUJAN = 1981
BASIS = (1991, 2020)
K_BANDING = 5
MUSIM = ["DJF", "JFM", "FMA", "MAM", "AMJ", "MJJ", "JJA", "JAS", "ASO", "SON", "OND", "NDJ"]  # indeks 0 = bulan tengah Januari
BLN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"]
# id: (nama, bujur_barat, bujur_timur, lintang_selatan, lintang_utara). Kotak persegi, BUKAN batas administrasi.
KOTAK = {
    "aceh_sumut": ("Aceh-Sumut", 95.0, 100.0, 1.5, 5.9),
    "sumatra_tengah_selatan": ("Riau-Jambi-Sumsel", 100.0, 106.5, -4.5, 2.2),
    "jawa": ("Jawa", 105.0, 114.6, -8.8, -5.9),
    "kalbar_kalteng": ("Kalbar-Kalteng", 108.8, 115.5, -3.5, 2.0),
    "kaltim_kaltara": ("Kaltim-Kaltara", 115.5, 119.0, -2.5, 4.3),
    "sulawesi": ("Sulawesi", 119.0, 125.0, -5.5, 1.5),
    "bali_nt": ("Bali-NTB-NTT", 115.0, 125.0, -10.2, -8.0),
    "maluku": ("Maluku", 126.0, 131.0, -8.5, 2.0),
    "papua": ("Papua", 131.0, 141.0, -9.0, 0.0),
}


def _muat_iklim():
    """Muat scripts/data/iklim.py (oni(), netcdf3(), ambil) dengan nama unik; tidak disalin."""
    s = importlib.util.spec_from_file_location("umum_iklim_cpc", os.path.join(AKAR, "scripts/data/iklim.py"))
    m = importlib.util.module_from_spec(s)
    s.loader.exec_module(m)
    return m


# ---------------------------------------------------------------- jaringan + cache
def unduh(url, coba=3, batas=180):
    for i in range(coba):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA})
            with urllib.request.urlopen(req, timeout=batas) as r:
                return r.read().decode("utf-8", "replace")
        except Exception as e:  # noqa: BLE001 jaringan: coba ulang lalu menyerah
            if i == coba - 1:
                raise RuntimeError(f"{url[:90]}: {e}")
            time.sleep(8 * (i + 1))


def _cache(nama):
    return os.path.join(MENTAH, nama)


def _baca(nama):
    try:
        with open(_cache(nama), encoding="utf-8") as f:
            return f.read()
    except OSError:
        return None


def _tulis(nama, teks):
    os.makedirs(MENTAH, exist_ok=True)
    with open(_cache(nama), "w", encoding="utf-8") as f:
        f.write(teks)


def teks_bertahan(url, nama):
    """Unduh; bila gagal pakai cache; kembalikan (teks, dari_cache)."""
    try:
        t = unduh(url)
        _tulis(nama, t)
        return t, False
    except RuntimeError as e:
        t = _baca(nama)
        if t is None:
            raise
        print(f"  {nama}: jaringan gagal ({e}); pakai cache", file=sys.stderr)
        return t, True


# ---------------------------------------------------------------- parser (diuji luring)
def parse_tsv(teks):
    """Keluaran data.tsv IRI (satu angka per baris) -> list float|None (NaN/-999 -> None)."""
    out = []
    for b in teks.split():
        try:
            v = float(b)
        except ValueError:
            return None  # halaman galat HTML, bukan data
        out.append(None if (not math.isfinite(v) or v < -900) else v)
    return out


def parse_dmi(teks):
    """dmi.had.long.data -> {(tahun, bulan): nilai}; -9999 dibuang."""
    out = {}
    for b in teks.splitlines():
        p = b.split()
        if len(p) == 13 and p[0].isdigit() and 1800 < int(p[0]) < 2200:
            for m, x in enumerate(p[1:], 1):
                v = float(x)
                if v > -90:
                    out[(int(p[0]), m)] = v
    return out


def bulan_ke_indeks(y, m):
    return y * 12 + m - 1


def indeks_ke_bulan(i):
    return i // 12, i % 12 + 1


def nama_bulan_iri(y, m):
    return f"{['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][m - 1]} {y}"


_kunci = threading.Lock()


def ambil_kotak(kid, tembolok):
    """Perpanjang deret bulanan satu kotak dari bulan setelah data cache sampai sekarang; sambungan per 5 tahun."""
    k = tembolok.setdefault(kid, {"mulai": f"{MULAI_HUJAN}-01", "nilai": []})
    _, x0, x1, y0, y1 = KOTAK[kid]
    sel = f"X/{x0}/{x1}/RANGEEDGES/Y/{y0}/{y1}/RANGEEDGES"
    mulai = bulan_ke_indeks(MULAI_HUJAN, 1)
    sekarang = bulan_ke_indeks(dt.date.today().year, dt.date.today().month)
    while True:
        awal = mulai + len(k["nilai"])
        if awal > sekarang:
            break
        ya, ma = indeks_ke_bulan(awal)
        akhir_th = ya + 4
        url = (f"{IRI}/{sel}/%5BX/Y%5Daverage/T/({nama_bulan_iri(ya, ma).replace(' ', '%20')})/"
               f"(Dec%20{akhir_th})/RANGE/data.tsv")
        v = parse_tsv(unduh(url))
        if not v:
            break  # belum ada data lagi
        k["nilai"] += v
        with _kunci:
            _tulis("chirps.json", json.dumps(tembolok, separators=(",", ":")))
        if len(v) < (akhir_th - ya) * 12 + 13 - ma:  # potongan terakhir (sampai data terbaru)
            break
    return k


def jumlah_sel(kid):
    _, x0, x1, y0, y1 = KOTAK[kid]
    sel = f"X/{x0}/{x1}/RANGEEDGES/Y/{y0}/{y1}/RANGEEDGES"
    v = parse_tsv(unduh(f"{IRI}/T/(Jan%202000)/VALUE/{sel}/dup/mul/0/mul/1/add/%5BX/Y%5Dsum/data.tsv"))
    return int(v[0])


def muat_hujan():
    """-> ({kid: {(tahun,bulan): mm}}, {kid: n_sel}, dari_cache)."""
    try:
        tem = json.loads(_baca("chirps.json") or "{}")
    except ValueError:
        tem = {}
    sel = tem.pop("_sel", {})
    dari_cache = False
    try:
        with ThreadPoolExecutor(3) as ex:
            list(ex.map(lambda kid: ambil_kotak(kid, tem), KOTAK))
            for kid, n in zip(KOTAK, ex.map(lambda kid: sel.get(kid) or jumlah_sel(kid), KOTAK)):
                sel[kid] = n
    except RuntimeError as e:
        if not all(tem.get(k, {}).get("nilai") for k in KOTAK):
            raise
        print(f"  CHIRPS: jaringan gagal ({e}); pakai cache", file=sys.stderr)
        dari_cache = True
    _tulis("chirps.json", json.dumps({**tem, "_sel": sel}, separators=(",", ":")))
    seri = {}
    for kid in KOTAK:
        a = bulan_ke_indeks(MULAI_HUJAN, 1)
        seri[kid] = {indeks_ke_bulan(a + i): v for i, v in enumerate(tem[kid]["nilai"]) if v is not None}
    return seri, sel, dari_cache


# ---------------------------------------------------------------- statistik (uji luring)
def total_musim(seri, y, c):
    """Total hujan musim berpusat bulan c (1..12) tahun y: bulan c-1, c, c+1; None bila ada yang hilang."""
    bl = []
    for dm in (-1, 0, 1):
        m = c + dm
        yy = y
        if m < 1:
            m, yy = 12, y - 1
        elif m > 12:
            m, yy = 1, y + 1
        bl.append((yy, m))
    if not all(b in seri for b in bl):
        return None
    return sum(seri[b] for b in bl)


def rerata_musim_dmi(dmi, y, c):
    bl = []
    for dm in (-1, 0, 1):
        m, yy = c + dm, y
        if m < 1:
            m, yy = 12, y - 1
        elif m > 12:
            m, yy = 1, y + 1
        bl.append((yy, m))
    return sum(dmi[b] for b in bl) / 3 if all(b in dmi for b in bl) else None


def invers(a):
    """Gauss-Jordan dengan pivot parsial; ValueError bila singular."""
    n = len(a)
    m = [list(map(float, r)) + [1.0 if i == j else 0.0 for j in range(n)] for i, r in enumerate(a)]
    for i in range(n):
        p = max(range(i, n), key=lambda r: abs(m[r][i]))
        if abs(m[p][i]) < 1e-12:
            raise ValueError("matriks singular")
        m[i], m[p] = m[p], m[i]
        d = m[i][i]
        m[i] = [x / d for x in m[i]]
        for r in range(n):
            if r != i and m[r][i]:
                f = m[r][i]
                m[r] = [x - f * y for x, y in zip(m[r], m[i])]
    return [r[n:] for r in m]


def desain(roni, dmi):
    return [1.0, roni, dmi, roni * dmi]


def ols(X, y):
    """-> dict koef, r2, sd_resid, loo (rmse), skill_loo, se[], t[]. X baris desain, y sama panjang."""
    n, p = len(X), len(X[0])
    xtx = [[sum(X[k][i] * X[k][j] for k in range(n)) for j in range(p)] for i in range(p)]
    inv = invers(xtx)
    xty = [sum(X[k][i] * y[k] for k in range(n)) for i in range(p)]
    beta = [sum(inv[i][j] * xty[j] for j in range(p)) for i in range(p)]
    hat = [sum(X[k][i] * sum(inv[i][j] * X[k][j] for j in range(p)) for i in range(p)) for k in range(n)]
    res = [y[k] - sum(beta[j] * X[k][j] for j in range(p)) for k in range(n)]
    sse = sum(e * e for e in res)
    ym = sum(y) / n
    sst = sum((v - ym) ** 2 for v in y)
    loo = [res[k] / (1 - hat[k]) for k in range(n)]
    sse_loo = sum(e * e for e in loo)
    sse_biasa = sum((v - (sum(y) - v) / (n - 1)) ** 2 for v in y)  # rerata tahun lain, juga leave-one-out
    s2 = sse / (n - p)
    se = [math.sqrt(s2 * inv[i][i]) for i in range(p)]
    return {"beta": beta, "r2": 1 - sse / sst if sst > 0 else 0.0, "sd_resid": math.sqrt(s2),
            "rmse_loo": math.sqrt(sse_loo / n), "sd_anomali": math.sqrt(sst / (n - 1)),
            "skill_loo": 1 - sse_loo / sse_biasa if sse_biasa > 0 else 0.0,
            "t": [b / s if s > 0 else 0.0 for b, s in zip(beta, se)], "n": n}


def pembanding(daftar, r0, d0, k=K_BANDING):
    """daftar [(tahun, roni, dmi)] -> k terdekat di ruang (RONI,DMI) terstandar: [(jarak, tahun)]."""
    if len(daftar) < 2:
        return []
    def sd(i):
        v = [x[i] for x in daftar]
        m = sum(v) / len(v)
        return math.sqrt(sum((a - m) ** 2 for a in v) / (len(v) - 1)) or 1.0
    s1, s2 = sd(1), sd(2)
    return sorted((math.hypot((r - r0) / s1, (d - d0) / s2), t) for t, r, d in daftar)[:k]


def kalimat(nama, musim, c, koef, t, skill, kunci="roni"):
    """Kalimat siap tampil dari satu koefisien; kalau tak lulus uji, kalimat tak-teruji."""
    i = 1 if kunci == "roni" else 2
    awal, akhir = BLN[(c - 2) % 12], BLN[c % 12]
    ind = "RONI (Pasifik tengah-timur)" if kunci == "roni" else "DMI (Samudra Hindia barat dikurangi timur)"
    if abs(t[i]) < 2 or skill <= 0:
        return f"{nama}, {awal}-{akhir}: hubungan dengan {ind} tidak teruji (|t|={abs(t[i]):.1f}, skill LOO {skill:+.2f})."
    arah = "turun" if koef[i] < 0 else "naik"
    lain = "DMI nol" if kunci == "roni" else "RONI nol"
    return f"Tiap +1 °C {ind}, hujan {awal}-{akhir} di {nama} {arah} sekitar {abs(koef[i]):.0f}% (saat {lain})."


# ---------------------------------------------------------------- perakit
def anomali(seri_kotak, y, c, klim):
    t = total_musim(seri_kotak, y, c)
    return None if t is None or not klim else 100 * (t / klim - 1)


def klimatologi(seri_kotak, c):
    v = [total_musim(seri_kotak, y, c) for y in range(BASIS[0], BASIS[1] + 1)]
    v = [x for x in v if x is not None]
    return sum(v) / len(v) if len(v) >= 25 else None


def seri_nasional(seri, sel):
    """Deret bulanan nasional berbobot jumlah sel daratan (bulan hanya bila semua kotak ada)."""
    bulan = set.intersection(*[set(s) for s in seri.values()])
    w = sum(sel.values())
    return {b: sum(seri[k][b] * sel[k] for k in seri) / w for b in bulan}


def bangun_fit(seri, roni, dmi, tahun_akhir):
    """-> (fit[musim][wilayah], pendorong[musim][tahun]=(roni,dmi), baris[musim] = [(tahun,roni,dmi)])."""
    fit, pend, baris = {}, {}, {}
    for ci, ms in enumerate(MUSIM, 1):
        daftar = []
        for y in range(MULAI_HUJAN, tahun_akhir + 1):
            r = roni.get((ms, y))
            d = rerata_musim_dmi(dmi, y, ci)
            if r is not None and d is not None:
                daftar.append((y, r, d))
        baris[ms] = daftar
        pend[ms] = {y: (r, d) for y, r, d in daftar}
        fit[ms] = {}
        for kid, s in seri.items():
            kl = klimatologi(s, ci)
            xs, ys, th = [], [], []
            for y, r, d in daftar:
                a = anomali(s, y, ci, kl)
                if a is not None:
                    xs.append(desain(r, d)); ys.append(a); th.append(y)
            if len(ys) < 20:
                continue
            f = ols(xs, ys)
            f.update(klim=kl, tahun=th, y=ys)
            fit[ms][kid] = f
    return fit, pend, baris


def dmi_osmc(iklim):
    """Rerata bulanan DMI OISST mingguan NOAA OSMC + rerata 4 minggu terakhir."""
    b = unduh_biner(iklim.DMI)
    nc = iklim.netcdf3(b)
    w = next(v for k, v in nc.items() if k.upper() == "TIME")
    n = next(v for k, v in nc.items() if k.upper() != "TIME")
    t0 = dt.date(1800, 1, 1)
    pts = [(t0 + dt.timedelta(days=a), v) for a, v in zip(w, n) if abs(v) < 50]
    bln = {}
    for t, v in pts:
        bln.setdefault((t.year, t.month), []).append(v)
    return {k: sum(v) / len(v) for k, v in bln.items()}, pts[-4:]


def unduh_biner(url, coba=3):
    for i in range(coba):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": UA}), timeout=120) as r:
                return r.read()
        except Exception as e:  # noqa: BLE001
            if i == coba - 1:
                raise RuntimeError(f"{url}: {e}")
            time.sleep(8 * (i + 1))


def bangun():
    ik = _muat_iklim()
    hari = dt.date.today()
    teks_roni, c_roni = teks_bertahan(ik.RONI, "roni.txt")
    roni_l = ik.oni(teks_roni)
    roni = {(x["musim"], x["tahun"]): x["nilai"] for x in roni_l}
    teks_dmi, c_dmi = teks_bertahan(DMI_HAD, "dmi_had.txt")
    dmi = parse_dmi(teks_dmi)
    seri, sel, c_hujan = muat_hujan()
    seri["nasional"] = seri_nasional({k: v for k, v in seri.items()}, sel)
    sel_n = dict(sel)
    nasional_nama = "Indonesia (rerata kotak berbobot sel darat)"
    nama = {k: v[0] for k, v in KOTAK.items()}
    nama["nasional"] = nasional_nama
    tahun_akhir = hari.year - 1
    fit, pend, baris = bangun_fit(seri, roni, dmi, tahun_akhir)

    # pendorong terkini
    r_akhir = roni_l[-1]
    dmi_akhir_bulan = max(dmi)
    try:
        osmc, last4 = dmi_osmc(ik)
        d_now = sum(v for _, v in last4) / len(last4)
        asal_dmi = f"rerata 4 minggu terakhir DMI OISST NOAA OSMC (sampai {last4[-1][0].isoformat()})"
        tump = sorted(set(osmc) & set(dmi))
        xa, xb = [osmc[k] for k in tump], [dmi[k] for k in tump]
        ma, mb = sum(xa) / len(xa), sum(xb) / len(xb)
        cov = sum((a - ma) * (b - mb) for a, b in zip(xa, xb))
        korelasi = cov / math.sqrt(sum((a - ma) ** 2 for a in xa) * sum((b - mb) ** 2 for b in xb))
        rms = math.sqrt(sum((a - b) ** 2 for a, b in zip(xa, xb)) / len(xa))
        dmi_banding = {"bulan_tumpang_tindih": len(tump), "korelasi": round(korelasi, 3), "rms_selisih_c": round(rms, 3),
                       "bias_c": round(ma - mb, 3), "catatan": "OISST (OSMC) vs HadISST (PSL); beda produk SST, bukan definisi DMI"}
    except RuntimeError as e:
        d_now = dmi[dmi_akhir_bulan]
        asal_dmi = f"nilai HadISST bulan terakhir {dmi_akhir_bulan[0]}-{dmi_akhir_bulan[1]:02d} (OSMC tak terjangkau: {e})"
        dmi_banding = None

    # prakiraan: musim berpusat bulan sekarang dan 11 bulan berikutnya
    prak = []
    for dk in range(13):  # bulan ini + 12 bulan berikutnya (outlook12 memakai 12 bulan sesudah bulan ini)
        yy, mm = indeks_ke_bulan(bulan_ke_indeks(hari.year, hari.month) + dk)
        ms = MUSIM[mm - 1]
        obs = roni.get((ms, yy))
        r0 = obs if obs is not None else r_akhir["nilai"]
        asal_r = f"teramati {ms} {yy}" if obs is not None else f"persistensi {r_akhir['musim']} {r_akhir['tahun']} ({r_akhir['nilai']:+.2f})"
        pb = pembanding([(t, r, d) for t, r, d in baris[ms] if t <= tahun_akhir], r0, d_now)
        wil = {}
        for kid, f in fit[ms].items():
            x = desain(r0, d_now)
            pred = sum(b * v for b, v in zip(f["beta"], x))
            wil[kid] = {"anom_pct": round(pred, 1), "p10": round(pred - 1.2816 * f["rmse_loo"], 1), "p90": round(pred + 1.2816 * f["rmse_loo"], 1)}
        banding = []
        for jarak, t in pb:
            r, d = pend[ms][t]
            h = {}
            for kid, s in seri.items():
                a = anomali(s, t, mm, fit[ms].get(kid, {}).get("klim"))
                if a is not None:
                    h[kid] = round(a, 1)
            banding.append({"tahun": t, "roni": round(r, 2), "dmi": round(d, 2), "jarak": round(jarak, 2), "hujan_pct": h})
        prak.append({"musim": ms, "tahun": yy, "bulan_tengah": f"{yy}-{mm:02d}", "label": f"{BLN[(mm - 2) % 12]} {yy - (mm == 1)} - {BLN[mm % 12]} {yy + (mm == 12)}",
                     "horizon_bulan": dk,
                     "ekstrapolasi": not (min(x[1] for x in baris[ms]) <= r0 <= max(x[1] for x in baris[ms]) and min(x[2] for x in baris[ms]) <= d_now <= max(x[2] for x in baris[ms])),
                     "pendorong": {"roni": round(r0, 2), "dmi": round(d_now, 2), "roni_asal": asal_r,
                                   "dmi_asal": asal_dmi},
                     "jenis_pendorong": "persistensi",
                     "wilayah": wil, "pembanding": banding})
    ringkas = []
    for ms in MUSIM:
        f = fit[ms].get("nasional")
        if f:
            ci = MUSIM.index(ms) + 1
            ringkas.append({"musim": ms, "kalimat_roni": kalimat(nasional_nama, ms, ci, f["beta"], f["t"], f["skill_loo"], "roni"),
                            "kalimat_dmi": kalimat(nasional_nama, ms, ci, f["beta"], f["t"], f["skill_loo"], "dmi")})
    wil_fit = {}
    for ms, d in fit.items():
        ci = MUSIM.index(ms) + 1
        wil_fit[ms] = {}
        for kid, f in d.items():
            wil_fit[ms][kid] = {"a_b_c_d": [round(b, 2) for b in f["beta"]], "t": [round(x, 1) for x in f["t"]], "n": f["n"],
                                "r2": round(f["r2"], 3), "sd_resid": round(f["sd_resid"], 1), "sd_anomali": round(f["sd_anomali"], 1),
                                "rmse_loo": round(f["rmse_loo"], 1), "skill_loo": round(f["skill_loo"], 3),
                                "lulus": bool(f["skill_loo"] > 0.1), "tahun": [f["tahun"][0], f["tahun"][-1]],
                                "kalimat_roni": kalimat(nama[kid], ms, ci, f["beta"], f["t"], f["skill_loo"], "roni"),
                                "kalimat_dmi": kalimat(nama[kid], ms, ci, f["beta"], f["t"], f["skill_loo"], "dmi")}
    semua = [(ms, kid, f) for ms, d in fit.items() for kid, f in d.items()]
    uji_balik = {"metode": "leave-one-out eksak (matriks topi); pembanding = rerata tahun lain; skill = 1 - SSE_model/SSE_biasa",
                 "n_fit": len(semua), "n_skill_positif": sum(1 for *_, f in semua if f["skill_loo"] > 0),
                 "n_skill_lulus_0_1": sum(1 for *_, f in semua if f["skill_loo"] > 0.1),
                 "skill_median": round(sorted(f["skill_loo"] for *_, f in semua)[len(semua) // 2], 3),
                 "terbaik": [{"musim": m, "wilayah": k, "skill_loo": round(f["skill_loo"], 3), "r2": round(f["r2"], 3)}
                             for m, k, f in sorted(semua, key=lambda x: -x[2]["skill_loo"])[:5]],
                 "terburuk": [{"musim": m, "wilayah": k, "skill_loo": round(f["skill_loo"], 3)}
                              for m, k, f in sorted(semua, key=lambda x: x[2]["skill_loo"])[:3]]}
    out = {"dibuat": dt.datetime.now(dt.timezone(dt.timedelta(hours=7))).isoformat(timespec="minutes"),
           "versi": "iklim_outlook/1",
           "sumber": {"hujan": "CHIRPS v2.0 bulanan 0,05 deg (UCSB CHG, Funk dkk. 2015) via IRI Data Library: " + IRI,
                      "roni": ik.RONI, "dmi_riwayat": DMI_HAD + " (HadISST 1.1)", "dmi_terkini": asal_dmi,
                      "dari_cache": {"hujan": c_hujan, "roni": c_roni, "dmi": c_dmi}},
           "basis_klimatologi": list(BASIS), "tahun_fit": [MULAI_HUJAN, tahun_akhir],
           "wilayah": {k: {"nama": nama[k], **({"kotak": {"bujur": [KOTAK[k][1], KOTAK[k][2]], "lintang": [KOTAK[k][3], KOTAK[k][4]]}, "sel_darat": sel_n[k]}
                                              if k in KOTAK else {"bobot": "jumlah sel darat"})} for k in nama},
           "rumus": "hujan_pct = a + b*RONI + c*DMI + d*RONI*DMI; urutan a_b_c_d; hujan_pct = 100*(total musim/rerata 1991-2020 - 1)",
           "keadaan_sekarang": {"roni": {"musim": r_akhir["musim"], "tahun": r_akhir["tahun"], "nilai": r_akhir["nilai"]},
                                "dmi": round(d_now, 2), "dmi_asal": asal_dmi, "dmi_hadisst_terakhir": f"{dmi_akhir_bulan[0]}-{dmi_akhir_bulan[1]:02d}"},
           "dmi_perbandingan": dmi_banding,
           "kalimat_nasional": ringkas,
           "uji_balik": uji_balik,
           "prakiraan": prak,
           "fit": wil_fit,
           "pendorong_riwayat": {ms: {str(t): [round(r, 2), round(d, 2)] for t, (r, d) in p.items()} for ms, p in pend.items()},
           "batasan": [
               "Pendorong musim depan = persistensi nilai terakhir (RONI musim teramati terakhir, DMI 4 minggu terakhir), bukan prakiraan. ENSO dan IOD berubah dalam hitungan bulan; prakiraan lebih dari 2-3 musim ke depan hampir pasti meleset kalau keadaan pendorongnya berubah.",
               "Regresi memakai pendorong musim yang SAMA dengan hujannya (serentak). Skill LOO mengukur kecocokan hubungan, bukan kemampuan meramal dari pendorong yang belum teramati.",
               "Kotak persegi bukan batas administrasi: sebagian laut dan pulau tetangga ikut tersaring; Kalsel selatan, Bengkulu-Lampung sebagian, dan Natuna di luar kotak.",
               "Hanya 45 tahun data per musim dan 4 parameter; tahun ekstrem (1997, 2015, 2019) berpengaruh besar. Normal galat residu dipakai untuk rentang p10-p90 (asumsi).",
               "DMI terkini dari OISST (OSMC) berbeda produk dengan DMI riwayat HadISST; kecocokannya ada di dmi_perbandingan.",
               "CHIRPS memadukan satelit dan stasiun; di Papua dan Maluku stasiunnya jarang sehingga lebih tidak pasti."]}
    os.makedirs(os.path.dirname(KELUAR), exist_ok=True)
    with open(KELUAR + ".tmp", "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, separators=(",", ":"))
    os.replace(KELUAR + ".tmp", KELUAR)
    nas = fit["SON"].get("nasional")
    print(f"iklim_outlook.json {os.path.getsize(KELUAR) / 1e3:.0f} KB | RONI {r_akhir['musim']} {r_akhir['tahun']} {r_akhir['nilai']:+.2f} DMI {d_now:+.2f} "
          f"| SON nasional R2 {nas['r2']:.2f} LOO {nas['rmse_loo']:.1f}% skill {nas['skill_loo']:+.2f}" if nas else "iklim_outlook.json")
    print(f"  uji balik: {uji_balik['n_skill_positif']}/{uji_balik['n_fit']} fit skill>0; median {uji_balik['skill_median']}")
    return out


# ---------------------------------------------------------------- uji
def uji():
    assert parse_tsv("1.5\n2\n-999\nNaN\n") == [1.5, 2.0, None, None]
    assert parse_tsv("<html>") is None
    d = parse_dmi(" 1870 2026\n2025  0.1 0.2 0.3 0.4 0.5 0.6 0.7 0.8 0.9 1.0 1.1 1.2\n2026  0.5 0.6 -9999 -9999 -9999 -9999 -9999 -9999 -9999 -9999 -9999 -9999\n-9999\n")
    assert d[(2025, 12)] == 1.2 and d[(2026, 2)] == 0.6 and (2026, 3) not in d
    # DJF memakai Desember tahun sebelumnya; NDJ memakai Januari tahun berikutnya
    s = {(2019, 12): 100, (2020, 1): 200, (2020, 2): 300, (2020, 11): 1, (2020, 12): 2, (2021, 1): 3}
    assert total_musim(s, 2020, 1) == 600 and total_musim(s, 2020, 12) == 6 and total_musim(s, 2020, 6) is None
    assert abs(rerata_musim_dmi({(2019, 12): 3, (2020, 1): 0, (2020, 2): 0}, 2020, 1) - 1) < 1e-9
    # invers
    a = [[4, 1, 0], [1, 3, 1], [0, 1, 2]]
    iv = invers(a)
    for i in range(3):
        for j in range(3):
            assert abs(sum(a[i][k] * iv[k][j] for k in range(3)) - (i == j)) < 1e-9
    # OLS pulih koefisien dari data sintetis (derau deterministik kecil) dan LOO topi == LOO brute-force
    import random
    rnd = random.Random(7)
    X, y, pts = [], [], []
    for _ in range(45):
        r, dd = rnd.uniform(-2, 2), rnd.uniform(-1, 1)
        v = 5 - 14 * r + 20 * dd + 6 * r * dd + rnd.gauss(0, 3)
        X.append(desain(r, dd)); y.append(v)
    f = ols(X, y)
    for b, t in zip(f["beta"], (5, -14, 20, 6)):
        assert abs(b - t) < 3, f["beta"]
    assert f["r2"] > 0.9 and f["skill_loo"] > 0.8 and 2 < f["sd_resid"] < 5
    sse = 0
    for i in range(len(y)):
        g = ols(X[:i] + X[i + 1:], y[:i] + y[i + 1:])
        sse += (y[i] - sum(b * v for b, v in zip(g["beta"], X[i]))) ** 2
    assert abs(math.sqrt(sse / len(y)) - f["rmse_loo"]) < 1e-6, (sse, f["rmse_loo"])
    # tanpa sinyal: skill LOO tidak boleh positif besar
    yn = [rnd.gauss(0, 10) for _ in X]
    assert ols(X, yn)["skill_loo"] < 0.2
    # tahun pembanding: terdekat di ruang terstandar
    dft = [(2000 + i, i / 10, 0.0) for i in range(30)]
    assert [t for _, t in pembanding(dft, 1.0, 0.0, 3)] == [2010, 2009, 2011] or sorted(t for _, t in pembanding(dft, 1.0, 0.0, 3)) == [2009, 2010, 2011]
    # kalimat
    ks = kalimat("Jawa", "SON", 10, [0, -14.2, 3, 0], [0, -4.0, 1, 0], 0.4)
    assert "Sep-Nov" in ks and "turun sekitar 14%" in ks
    assert "tidak teruji" in kalimat("Jawa", "SON", 10, [0, -14.2, 3, 0], [0, -1.0, 1, 0], 0.4)
    assert "tidak teruji" in kalimat("Jawa", "SON", 10, [0, -14.2, 3, 0], [0, -4.0, 1, 0], -0.1)
    # nasional berbobot sel
    sn = seri_nasional({"a": {(2000, 1): 100.0}, "b": {(2000, 1): 200.0}}, {"a": 1, "b": 3})
    assert abs(sn[(2000, 1)] - 175) < 1e-9
    print("iklim_outlook uji: lulus")


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "uji":
        uji()
    else:
        uji()
        bangun()
