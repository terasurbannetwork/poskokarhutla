"""Sentinel-5P TROPOMI CO + Aerosol Index (NASA GES DISC, OPeNDAP awan) -> public/udara/data/tropomi_seri.json + tropomi_kisi.json

Daftar granul : CMR (anonim), kotak Indonesia. Data: opendap.earthdata.nasa.gov, DAP4 (.dap) dengan `Authorization: Bearer`
                EARTHDATA_TOKEN (env, atau .env di akar repo hanya variabel itu). Token tidak pernah dicetak/ditulis; redirect DITOLAK
                supaya token tak keluar dari host OPeNDAP. DAP2 tak bisa: berkas berisi atribut Int64.
Produk        : OFFL (latensi 2-4 hari). NRT tidak ada di S3 awan (404), jadi tidak dipakai (diuji 30 Okt 2026).
CO            : carbonmonoxide_total_column, mol/m2 -> 1e18 molekul/cm2 (x60,2214), qa_value >= 0,5
AI            : aerosol_index_354_388, qa_value >= 0,8 ; AI > 1 = asap
Keluaran      : seri harian per provinsi (rata piksel sah; null bila < 10 piksel) + kisi 0,25 derajat hari terbaru.
Analisis      : CO_anom = (CO - median 30 hari provinsi bersih) / (1,4826 MAD). Uji: anom besok ~ FRP + angin + anom hari ini
                vs persistensi (RMSE), waktu: latih 70% hari awal, uji 30% akhir. Terlalu sedikit data = TAK TERUJI.
Pakai         : python3 scripts/udara/tropomi.py [hari_mundur=8]  (tanpa token: dilewati) ; python3 scripts/udara/tropomi.py uji
"""
import datetime as dt
import json
import math
import os
import re
import statistics
import struct
import sys
import time
import urllib.error
from concurrent.futures import ThreadPoolExecutor
import urllib.parse
import urllib.request

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import alat

CMR = "https://cmr.earthdata.nasa.gov/search/granules.json"
HOST = "https://opendap.earthdata.nasa.gov/collections/"
KONSEP = {"co": "C2087132178-GES_DISC", "ai": "C2087131083-GES_DISC"}
VAR = {"co": ("carbonmonoxide_total_column", 0.5), "ai": ("aerosol_index_354_388", 0.8)}
BOX = (95.0, -11.0, 141.0, 6.0)   # barat, selatan, timur, utara
MOL_KE_1E18 = 6.02214076e23 / 1e4 / 1e18
MIN_PX = 10
KOLOM = ["co", "ai", "n_co", "n_ai", "frp", "angin"]
SIMPAN_HARI = 400
MIN_UJI = 100   # pasangan hari-provinsi di data uji, di bawah ini = TAK TERUJI
TIPE = {"Float32": ("f", 4), "Byte": ("B", 1), "UInt8": ("B", 1), "Int32": ("i", 4), "Int16": ("h", 2)}


def token():
    t = os.environ.get("EARTHDATA_TOKEN")
    if not t:
        p = os.path.join(alat.AKAR, ".env")
        # worktree: .env ada di akar repo induk (tiga tingkat di atas .claude/worktrees/<nama>)
        for c in (p, os.path.join(alat.AKAR, "../../../.env")):
            if os.path.exists(c):
                for l in open(c, encoding="utf-8"):
                    if l.startswith("EARTHDATA_TOKEN="):
                        t = l.split("=", 1)[1].strip().strip("\"'")
                        break
            if t:
                break
    return t


class _Tolak(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *a, **k):
        raise urllib.error.URLError("redirect ditolak (token tidak boleh keluar dari host)")


_BUKA = urllib.request.build_opener(_Tolak)


def dap_ambil(url, tok, timeout=120):
    for i in range(3):
        try:
            with _BUKA.open(urllib.request.Request(url, headers={"Authorization": "Bearer " + tok, "User-Agent": alat.UA}), timeout=timeout) as r:
                return r.read()
        except Exception as e:
            time.sleep(5 * (i + 1))
            if i == 2:
                raise RuntimeError(f"gagal {url.split('?')[0].split('/')[-1][:60]}: {type(e).__name__}: {str(e).replace(tok, '***')[:120]}") from None


def granul(produk, t0, t1):
    """[(judul, mulai_iso)] granul OFFL yang memotong kotak Indonesia pada [t0, t1] (date), urut waktu."""
    keluar, hal = [], 1
    while True:
        q = {"collection_concept_id": KONSEP[produk], "bounding_box": ",".join(map(str, BOX)), "page_size": 200, "page_num": hal,
             "temporal": f"{t0}T00:00:00Z,{t1}T23:59:59Z", "sort_key": "start_date"}
        e = alat.ambil(CMR + "?" + urllib.parse.urlencode(q))["feed"]["entry"]
        keluar += [(x["title"], x["time_start"]) for x in e]
        if len(e) < 200:
            return keluar
        hal += 1


def dap4(b):
    """Badan respons DAP4 (potongan: bit 4 = little-endian, 1 = akhir) -> (teks DMR, muatan data). CRC 4 byte per variabel ikut di muatan."""
    ch, o = [], 0
    while o < len(b):
        h = struct.unpack(">I", b[o:o + 4])[0]
        n = h & 0xFFFFFF
        ch.append(b[o + 4:o + 4 + n])
        o += 4 + n
    if not ch or not ch[0].lstrip().startswith(b"<?xml"):
        raise ValueError("respons DAP4 tanpa DMR")
    return ch[0].decode("latin-1"), b"".join(ch[1:])


def baca_var(b, nama_n):
    """nama_n: {nama: jumlah elemen yang diminta}. Urutan variabel = urutan di DMR respons. -> {nama: tuple nilai}."""
    dmr, isi = dap4(b)
    urut = [(m.group(2), m.group(1)) for m in re.finditer(r'<(Float32|Byte|UInt8|Int32|Int16) name="(\w+)">', dmr) if m.group(2) in nama_n]
    keluar, o = {}, 0
    for nama, tp in urut:
        f, w = TIPE[tp]
        n = nama_n[nama]
        keluar[nama] = struct.unpack(f"<{n}{f}", isi[o:o + n * w])
        o += n * w + 4
    if set(keluar) != set(nama_n) or o != len(isi):
        raise ValueError(f"muatan DAP4 tak cocok: dapat {sorted(keluar)} sisa {len(isi) - o} byte")
    return keluar


def url(produk, judul, ce):
    return f"{HOST}{KONSEP[produk]}/granules/{urllib.parse.quote(judul, safe='')}.dap?dap4.ce={ce}"


def piksel(produk, judul, tok):
    """Piksel sah di kotak Indonesia: [(lon, lat, nilai)]. Dua tahap: lintang dulu, lalu hanya baris yang memotong kotak."""
    nv, qmin = VAR[produk]
    r1 = dap_ambil(url(produk, judul, "/PRODUCT/latitude"), tok)
    teks, isi = dap4(r1)
    m = re.search(r'<Dimension name="scanline" size="(\d+)"', teks)
    g = re.search(r'<Dimension name="ground_pixel" size="(\d+)"', teks)
    if not (m and g):
        raise ValueError("ukuran scanline/ground_pixel tak ditemukan di DMR")
    nrow, ncol = int(m.group(1)), int(g.group(1))
    lat = struct.unpack(f"<{nrow * ncol}f", isi[:nrow * ncol * 4])
    kol = (0, ncol // 4, ncol // 2, 3 * ncol // 4, ncol - 1)
    ada = [r for r in range(nrow) if any(BOX[1] <= lat[r * ncol + c] <= BOX[3] for c in kol)]
    if not ada:
        return []
    a, b = ada[0], ada[-1]
    n = (b - a + 1) * ncol
    sl = f"%5B0%5D%5B{a}:{b}%5D%5B0:{ncol - 1}%5D"
    ce = ";".join(f"/PRODUCT/{v}{sl}" for v in ("longitude", "latitude", "qa_value", nv))
    d = baca_var(dap_ambil(url(produk, judul, ce), tok), {"longitude": n, "latitude": n, "qa_value": n, nv: n})
    lo, la, qa, v = d["longitude"], d["latitude"], d["qa_value"], d[nv]
    skala = MOL_KE_1E18 if produk == "co" else 1.0
    return [(lo[i], la[i], v[i] * skala) for i in range(n)
            if qa[i] >= qmin * 100 and abs(v[i]) < 1e30 and BOX[0] <= lo[i] <= BOX[2] and BOX[1] <= la[i] <= BOX[3]]


class Provinsi:
    """Titik -> kode provinsi (public/geo/provinsi.json), ray casting; hasil di-cache per sel 0,1 derajat."""

    def __init__(self):
        fs = alat.muat(os.path.join(alat.AKAR, "public/geo/provinsi.json"))["features"]
        self.p = []
        for f in fs:
            g = f["geometry"]
            polys = g["coordinates"] if g["type"] == "MultiPolygon" else [g["coordinates"]]
            for pg in polys:
                xs = [c[0] for c in pg[0]]
                ys = [c[1] for c in pg[0]]
                self.p.append((f["properties"]["kode"], min(xs), max(xs), min(ys), max(ys), pg))
        self.c = {}

    @staticmethod
    def _dalam(x, y, ring):
        d, j = False, len(ring) - 1
        for i in range(len(ring)):
            xi, yi, xj, yj = ring[i][0], ring[i][1], ring[j][0], ring[j][1]
            if (yi > y) != (yj > y) and x < (xj - xi) * (y - yi) / (yj - yi) + xi:
                d = not d
            j = i
        return d

    def kode(self, x, y):
        k = (round(x * 10), round(y * 10))   # sel 0,1 derajat, titik tengah sel
        if k not in self.c:
            cx, cy = k[0] / 10, k[1] / 10
            self.c[k] = None
            for kode, x0, x1, y0, y1, pg in self.p:
                if x0 <= cx <= x1 and y0 <= cy <= y1 and self._dalam(cx, cy, pg[0]) and not any(self._dalam(cx, cy, h) for h in pg[1:]):
                    self.c[k] = kode
                    break
        return self.c[k]

    def pusat(self):
        """kode -> (lon, lat) rata-rata titik cincin terluar (cukup untuk memilih titik angin)."""
        s = {}
        for kode, *_, pg in self.p:
            a = s.setdefault(kode, [0, 0, 0])
            for x, y in pg[0]:
                a[0] += x; a[1] += y; a[2] += 1
        return {k: (v[0] / v[2], v[1] / v[2]) for k, v in s.items()}


def agregasi(titik_co, titik_ai, prov):
    """-> ({kode: [co, ai, n_co, n_ai]}, {sel 0,25: [co, ai, n_co, n_ai]}); rata-rata, null bila piksel < MIN_PX per provinsi."""
    P, K = {}, {}
    for j, titik in ((0, titik_co), (1, titik_ai)):
        for x, y, v in titik:
            k = prov.kode(x, y)
            if k:
                a = P.setdefault(k, [0.0, 0.0, 0, 0])
                a[j] += v; a[2 + j] += 1
            g = K.setdefault((math.floor(y / 0.25) * 0.25 + 0.125, math.floor(x / 0.25) * 0.25 + 0.125), [0.0, 0.0, 0, 0])
            g[j] += v; g[2 + j] += 1
    def rata(a, minpx):
        return [round(a[0] / a[2], 3) if a[2] >= minpx else None, round(a[1] / a[3], 3) if a[3] >= minpx else None, a[2], a[3]]
    return {k: rata(a, MIN_PX) for k, a in P.items()}, {k: rata(a, 3) for k, a in K.items()}


def frp_harian(prov):
    """{tgl: {kode: FRP total}} dari public/data/titik_hari/*.json (hari tak berarsip = tak ada = dianggap 0)."""
    d = os.path.join(alat.AKAR, "public/data/titik_hari")
    out = {}
    for f in sorted(os.listdir(d)):
        if not re.fullmatch(r"\d{4}-\d\d-\d\d\.json", f):
            continue
        j = alat.muat(os.path.join(d, f))
        kol = j.get("kolom", [])   # baris: lat, lon, jam, sensor, frp, keyakinan, wilayah_idx, ...
        h = out.setdefault(f[:10], {})
        for r in j["baris"]:
            k = j["wilayah"][r[6]].split("|")[0]
            h[k] = h.get(k, 0.0) + r[4]
    return out


def angin_harian(pusat, mulai):
    """{kode: {tgl: kecepatan maks 10 m (m/s)}} dari Open-Meteo (past_days <= 92); gagal = {} (fitur angin dinolkan)."""
    out = {}
    try:
        kd = sorted(pusat)
        lat = ",".join(f"{pusat[k][1]:.2f}" for k in kd)
        lon = ",".join(f"{pusat[k][0]:.2f}" for k in kd)
        n = min(92, (dt.date.today() - mulai).days + 2)
        j = alat.ambil(f"https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&daily=wind_speed_10m_max&timezone=Asia%2FBangkok&past_days={n}&forecast_days=1&wind_speed_unit=ms")
        for k, r in zip(kd, j if isinstance(j, list) else [j]):
            out[k] = dict(zip(r["daily"]["time"], r["daily"]["wind_speed_10m_max"]))
    except Exception as e:
        alat.log(f"::warning title=tropomi angin::{type(e).__name__}: {str(e)[:150]}")
    return out


def anomali(seri):
    """seri {kode: {tgl: baris}} -> {kode: {tgl: anom}}. Dasar = CO provinsi bersih (FRP 30 hari terkecil) pada jendela 30 hari sampai hari itu."""
    hari = sorted({t for v in seri.values() for t in v})
    out = {k: {} for k in seri}
    for t in hari:
        t0 = (dt.date.fromisoformat(t) - dt.timedelta(days=29)).isoformat()
        jend = [h for h in hari if t0 <= h <= t]
        frp = {k: sum(v.get(h, [0] * 6)[4] or 0 for h in jend) for k, v in seri.items() if any(v.get(h, [None])[0] is not None for h in jend)}
        bersih = sorted(frp, key=frp.get)[:max(5, len(frp) // 3)]
        x = [seri[k][h][0] for k in bersih for h in jend if h in seri[k] and seri[k][h][0] is not None]
        if len(x) < 30:
            continue
        med = statistics.median(x)
        mad = 1.4826 * statistics.median(abs(v - med) for v in x)
        if mad <= 0:
            continue
        for k, v in seri.items():
            if t in v and v[t][0] is not None:
                out[k][t] = (v[t][0] - med) / mad
    return out


def ols(X, y):
    """Kuadrat terkecil lewat persamaan normal + ridge 1e-9; X baris [1, ...]."""
    m = len(X[0])
    A = [[sum(r[i] * r[j] for r in X) + (1e-9 if i == j else 0) for j in range(m)] + [sum(r[i] * v for r, v in zip(X, y))] for i in range(m)]
    for i in range(m):
        p = max(range(i, m), key=lambda r: abs(A[r][i]))
        A[i], A[p] = A[p], A[i]
        for r in range(m):
            if r != i:
                f = A[r][i] / A[i][i]
                A[r] = [a - f * b for a, b in zip(A[r], A[i])]
    return [A[i][m] / A[i][i] for i in range(m)]


def uji_model(seri, an):
    """anom besok ~ log1p(FRP) + angin + anom hari ini, waktu-terpisah; bandingkan RMSE dengan persistensi (anom besok = anom hari ini)."""
    baris = []
    for k, v in seri.items():
        for t, a in an[k].items():
            t1 = (dt.date.fromisoformat(t) + dt.timedelta(days=1)).isoformat()
            if t1 in an[k]:
                r = v[t]
                baris.append((t, [1.0, math.log1p(r[4] or 0), r[5] or 0.0, a], an[k][t1], a))
    tgl = sorted({b[0] for b in baris})
    if len(tgl) < 10:
        return {"status": "TAK TERUJI", "alasan": f"hanya {len(tgl)} hari berpasangan (butuh >= 10 untuk membelah latih/uji)", "n_uji": 0}
    batas = tgl[int(len(tgl) * 0.7) - 1]
    lat = [b for b in baris if b[0] <= batas]
    uji = [b for b in baris if b[0] > batas]
    out = {"hari_pasangan": len(tgl), "batas_latih": batas, "n_latih": len(lat), "n_uji": len(uji)}
    if len(uji) < MIN_UJI or len(lat) < 30:
        return {**out, "status": "TAK TERUJI", "alasan": f"pasangan uji {len(uji)} < {MIN_UJI} atau latih {len(lat)} < 30; pencatatan jalan terus"}
    w = ols([b[1] for b in lat], [b[2] for b in lat])
    rm = math.sqrt(sum((sum(wi * xi for wi, xi in zip(w, b[1])) - b[2]) ** 2 for b in uji) / len(uji))
    rp = math.sqrt(sum((b[3] - b[2]) ** 2 for b in uji) / len(uji))
    return {**out, "rmse_model": round(rm, 3), "rmse_persistensi": round(rp, 3), "koef": [round(c, 4) for c in w],
            "kolom_koef": ["intersep", "log1p_frp", "angin", "anom_hari_ini"], "status": "LOLOS" if rm < 0.95 * rp else "GAGAL",
            "kriteria": "LOLOS bila RMSE model < 95% RMSE persistensi pada hari uji (30% terakhir)"}


def main(hari_mundur=8):
    tok = token()
    if not tok:
        alat.log("::warning title=tropomi dilewati::EARTHDATA_TOKEN tidak ada")
        return
    seri_f = os.path.join(alat.OUT, "tropomi_seri.json")
    lama = alat.muat(seri_f, {"prov": {}})["prov"]
    ada = {t for v in lama.values() for t in v}
    hari = [(dt.date.today() - dt.timedelta(days=i)).isoformat() for i in range(1, hari_mundur + 1)]
    perlu = [h for h in hari if h not in ada]
    prov = Provinsi()
    kisi = None
    def tulis():
        # fitur FRP + angin untuk semua hari, lalu anomali + uji; dipanggil tiap hari selesai supaya kerja panjang tak hilang
        frp = frp_harian(prov)
        tgl = sorted({t for v in lama.values() for t in v})[-SIMPAN_HARI:]
        pusat = prov.pusat()
        ang = angin_harian(pusat, dt.date.fromisoformat(tgl[0])) if tgl else {}
        for k, v in lama.items():
            for t in list(v):
                if t not in tgl:
                    del v[t]
                    continue
                v[t][4] = round(frp.get(t, {}).get(k, 0.0), 1)
                a = ang.get(k, {}).get(t)
                v[t][5] = a if a is not None else (v[t][5] if len(v[t]) > 5 else None)
        an = anomali(lama)
        for k, v in lama.items():
            for t in v:
                v[t] = v[t][:6] + ([round(an[k][t], 2)] if t in an[k] else [None])
        # anom ikut di indeks 6 untuk layar; uji memakai an (bukan kolom)
        model = uji_model(lama, an)
        alat.simpan("tropomi_seri.json", {"dibuat": dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds"), "sumber": "NASA GES DISC, Sentinel-5P TROPOMI L2 OFFL (CO, AER_AI); kontrol Centurisk97",
                                          "satuan": {"co": "1e18 molekul/cm2", "ai": "indeks aerosol (AI>1 = asap)", "frp": "MW", "angin": "m/s maks 10 m", "anom": "sigma robust vs provinsi bersih"},
                                          "kolom": KOLOM + ["anom"], "min_piksel": MIN_PX, "prov": lama, "model": model})
        if kisi:
            h, K = kisi
            alat.simpan("tropomi_kisi.json", {"hari": h, "sel_derajat": 0.25, "kolom": ["lat", "lon", "co", "ai", "n_co", "n_ai"],
                                              "baris": [[round(la, 3), round(lo, 3)] + r for (la, lo), r in sorted(K.items())]})
        alat.log(f"tropomi: {len(tgl)} hari, model {model['status']}" + (f" RMSE {model['rmse_model']} vs persistensi {model['rmse_persistensi']}" if "rmse_model" in model else ""))
    for h in sorted(perlu, reverse=True):
        g = {p: [x for x in granul(p, h, h)] for p in ("co", "ai")}
        if not g["co"]:
            alat.log(f"tropomi {h}: belum ada granul OFFL")
            continue
        tit = {"co": [], "ai": []}

        def ambil_g(pj):
            try:
                return pj[0], piksel(pj[0], pj[1], tok)
            except Exception as e:
                alat.log(f"::warning title=tropomi granul::{pj[0]} {h}: {str(e)[:200]}")
                return pj[0], None
        with ThreadPoolExecutor(12) as ex:
            hasil = list(ex.map(ambil_g, [(p, j) for p in ("co", "ai") for j, _ in g[p]]))
        if any(px is None for _, px in hasil):
            alat.log(f"tropomi {h}: ada granul gagal, hari dilewati (dicoba lagi di jalan berikut)")
            continue
        for p, px in hasil:
            tit[p] += px
        P, K = agregasi(tit["co"], tit["ai"], prov)
        for k, r in P.items():
            lama.setdefault(k, {})[h] = r + [None, None]
        kisi = (h, K)
        alat.log(f"tropomi {h}: granul co={len(g['co'])} ai={len(g['ai'])}, piksel co={len(tit['co'])} ai={len(tit['ai'])}, provinsi {len(P)}")
        tulis()
    tulis()


def uji():
    # DAP4: dua variabel dengan CRC, little-endian
    dmr = b'<?xml version="1.0"?><Dataset><Group name="PRODUCT"><Byte name="qa">x</Byte><Float32 name="v">y</Float32></Group></Dataset>'
    isi = bytes([50, 100]) + b"\0\0\0\0" + struct.pack("<2f", 1.5, 2.5) + b"\0\0\0\0"
    ch = lambda f, d: struct.pack(">I", (f << 24) | len(d)) + d
    d = baca_var(ch(4, dmr) + ch(4, isi[:3]) + ch(5, isi[3:]), {"qa": 2, "v": 2})
    assert d == {"qa": (50, 100), "v": (1.5, 2.5)}, d
    # redirect ditolak
    try:
        _Tolak().redirect_request(None, None, 302, "", {}, "http://x")
        assert False
    except urllib.error.URLError:
        pass
    # provinsi: Palangka Raya di Kalteng (62), Jakarta 31
    p = Provinsi()
    assert p.kode(113.9, -2.2) == "62" and p.kode(106.85, -6.2) == "31", (p.kode(113.9, -2.2), p.kode(106.85, -6.2))
    # agregasi: < MIN_PX = null
    P, _ = agregasi([(113.9, -2.2, 3.0)] * 12 + [(106.85, -6.2, 2.0)] * 5, [(113.9, -2.2, 2.0)] * 12, p)
    assert P["62"][0] == 3.0 and P["62"][1] == 2.0 and P["31"][0] is None, P
    # ols pulih koefisien
    X = [[1, a, b] for a in range(5) for b in range(4)]
    w = ols(X, [2 + 3 * r[1] - r[2] for r in X])
    assert all(abs(a - b) < 1e-6 for a, b in zip(w, [2, 3, -1])), w
    # uji_model: data sintetik pendek -> TAK TERUJI; panjang AR(1) beranggota FRP -> status ada
    assert uji_model({"a": {}}, {"a": {}})["status"] == "TAK TERUJI"
    import random
    random.seed(1)
    seri, an = {}, {}
    for k in range(10):
        x, s, a = 0.0, {}, {}
        for i in range(60):
            t = (dt.date(2026, 6, 1) + dt.timedelta(days=i)).isoformat()
            frp = random.random() * 50
            x = 0.5 * x + 0.04 * frp + random.gauss(0, 0.3)
            s[t] = [0, 0, 20, 20, frp, 3.0]; a[t] = x
        seri[str(k)], an[str(k)] = s, a
    m = uji_model(seri, an)
    assert m["status"] in ("LOLOS", "GAGAL") and m["rmse_model"] < m["rmse_persistensi"], m
    print("tropomi uji ok")


if __name__ == "__main__":
    if sys.argv[1:] == ["uji"]:
        uji()
    else:
        main(int(sys.argv[1]) if len(sys.argv) > 1 else 8)
