"""Penaksir kedalaman genangan + bangunan terendam gaya FwDET (Cohen dkk. 2018) di atas luas genangan Copernicus GFM.

Pakai:  python3 scripts/banjir/kedalaman_genangan.py ambil [--prov 63 33 13] [--paralel 2]   (jaringan: keadaan GFM per titik + DEM GLO-30, cache)
        python3 scripts/banjir/kedalaman_genangan.py hitung [--prov ..] [--R km] [--dmin m] [--wr n] [--q pct] [--sm n]   (dari cache, tanpa jaringan)
        python3 scripts/banjir/kedalaman_genangan.py tala                  (uji kisi parameter di Kalsel 63 SAJA)
        python3 scripts/banjir/kedalaman_genangan.py uji                   (self-check sintetis)

MASALAH. genangan_nasional.py menghitung bangunan di piksel GFM tergenang. Radar buta di permukiman (pantulan ganda,
exclusion_mask), jadi air di antara rumah tak terlihat dan bangunan terdampak jauh di bawah DIBI (Demak 14 Mar 2024: 2.730-5.988
bangunan vs 131.703 jiwa terdampak).

METODE (semua pada kisi titik sampel Titik genangan_nasional.py, langkah >= 65 m, 8 tetangga):
 1. DEM = Copernicus GLO-30 (COG terbuka AWS `copernicus-dem-30m`, HTTP Range). GLO-30 adalah DSM: atap ikut. Permukaan tanah
    ditaksir sebagai persentil `q` elevasi dalam jendela (2*wr+1)^2 titik (wr=0: DSM apa adanya).
 2. Tepi = titik tergenang teramati (bukan air tetap, bukan ter-mask) yang bertetangga dengan titik KERING TERAMATI. Tepi bersebelahan
    dengan mask/tak teramati BUKAN tepi (di situ radar buta, bukan air berakhir).
 3. Permukaan air: tiap titik non-kering (tergenang, ter-mask, tak teramati, air tetap) dalam R km mewarisi elevasi tanah tepi terdekat
    (BFS beberapa sumber), lalu median jendela (2*sm+1)^2. Kedalaman = permukaan - tanah.
 4. Tergenang taksiran = titik ter-mask/tak teramati yang TERHUBUNG ke titik tergenang teramati (dalam R km, lewat titik ter-mask/tak
    teramati/air tetap yang kedalamannya >= dmin) dan kedalamannya >= dmin.
 5. Bangunan (grid halus 110 m, sama dengan genangan_nasional.hitung_bangunan): bawah = n x min(1, ha_tergenang/ha_sel), atas = n bila
    ada titik tergenang; per kedalaman (< 0,5, 0,5-1,5, > 1,5 m) menurut median kedalaman titik tergenang di sel itu.

KRITERIA (ditulis SEBELUM melihat Jateng/Sumbar; parameter R, dmin, wr, q, sm dipilih di Kalsel 63 Jan 2021 SAJA):
 - perkiraan jiwa = bangunan_tengah x (penduduk kab / bangunan kab), penduduk dari public/data/penduduk.json (WorldPop, jumlah kec),
   bangunan_tengah = (bawah+atas)/2. Galat = |log10(max(perkiraan, 100) / terdampak DIBI)| per kabupaten-hari.
 - FwDET LEBIH BAIK dari GFM-saja di satu wilayah bila MEDIAN galat itu turun, pada kabupaten ber-cakupan sah (cakupan_pct >= 10 dan
   DIBI terdampak > 0). Lolos = lebih baik di Jateng DAN di Sumbar; Sumbar tanpa kabupaten ber-cakupan sah = "tak dapat diuji".
 - Dilaporkan juga korelasi peringkat Spearman antar kabupaten, dan bias median log10(perkiraan/DIBI).
Batas jujur: DIBI mencatat satu baris per hari-kabupaten, sedangkan citra satu lintasan; tanggalnya tak selalu bersamaan.

Python 3.9 stdlib. Atribusi: Copernicus DEM GLO-30 (c) DLR/Airbus 2021, disediakan lewat Copernicus; GFM: Copernicus EMS.
"""
import argparse, base64, builtins, datetime as dt, glob, gzip, json, math, os, statistics, sys, time
from concurrent.futures import ThreadPoolExecutor

AYAH = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, AYAH)
import genangan_nasional as GN  # noqa: E402
from genangan_nasional import BG, Titik, kec_kab, tiff_mini  # noqa: E402

AKAR = os.path.normpath(os.path.join(AYAH, "../.."))
DIR = os.path.join(GN.MENTAH, "kedalaman")
DEM_URL = "https://copernicus-dem-30m.s3.amazonaws.com/Copernicus_DSM_COG_10_{ns}{la:02d}_00_{ew}{lo:03d}_00_DEM/Copernicus_DSM_COG_10_{ns}{la:02d}_00_{ew}{lo:03d}_00_DEM.tif"
# keadaan titik
KERING, BASAH, TAK, MASK, TETAP, LUAR = 0, 1, 2, 3, 4, 5
LOLOS = (BASAH, TAK, MASK, TETAP)          # titik yang boleh dilalui air
PARAM = {"R": 6.0, "dmin": 0.1, "wr": 1, "q": 10, "sm": 2}   # terbaik kisi Kalsel 63 (di tepi kisi: R maks, dmin min, q min); TIDAK disetel ulang di Jateng/Sumbar
BIN = (0.5, 1.5)


# ---------------------------------------------------------------- DEM GLO-30
class Dem:
    """Ubin GLO-30 1x1 derajat, dibaca per blok lewat HTTP Range; nilai(lon, lat) -> meter atau None (laut/kosong/nodata)."""
    def __init__(self):
        self.ubin, self.dec = {}, {}

    def _buka(self, la, lo):
        k = (la, lo)
        if k not in self.ubin:
            u = DEM_URL.format(ns="N" if la >= 0 else "S", la=abs(la), ew="E" if lo >= 0 else "W", lo=abs(lo))
            try:
                rf = GN.RangeFile(u)
                self.ubin[k] = (rf, tiff_mini.Tiff(rf))
            except RuntimeError as e:
                if "404" in str(e) or "403" in str(e):   # ubin laut tak ada
                    self.ubin[k] = None
                else:
                    raise
        return self.ubin[k]

    def siapkan(self, titik):
        """titik = [(lon, lat)]: unduh semua blok yang disentuh, paralel per ubin."""
        per = {}
        for lo, la in titik:
            per.setdefault((math.floor(la), math.floor(lo)), []).append((lo, la))
        for (la, lo), ps in per.items():
            u = self._buka(la, lo)
            if not u:
                continue
            rf, t = u
            perlu = {self._blok(t, la, lo, x, y) for x, y in ps} - {None}
            perlu = [b for b in perlu if (la, lo, b) not in self.dec]
            rf.siapkan([(t.offs[b[1] * t.per_baris + b[0]], t.cnts[b[1] * t.per_baris + b[0]]) for b in perlu])

    @staticmethod
    def _blok(t, la, lo, x, y):
        c, r = int((x - lo) * t.lebar), int((la + 1 - y) * t.tinggi)
        return (c // t.tl, r // t.tt) if 0 <= c < t.lebar and 0 <= r < t.tinggi else None

    def nilai(self, x, y):
        la, lo = math.floor(y), math.floor(x)
        u = self._buka(la, lo)
        if not u:
            return None
        _, t = u
        c, r = min(int((x - lo) * t.lebar), t.lebar - 1), min(int((la + 1 - y) * t.tinggi), t.tinggi - 1)
        b = (c // t.tl, r // t.tt)
        k = (la, lo, b)
        if k not in self.dec:
            self.dec[k] = t.ubin(*b) if t.cnts[b[1] * t.per_baris + b[0]] else None
        a = self.dec[k]
        if a is None:
            return None
        v = a[(r % t.tt) * t.tl + c % t.tl]
        return None if (t.nodata is not None and v == t.nodata) or v < -500 else float(v)


# ---------------------------------------------------------------- keadaan GFM per titik
def keadaan_titik(pt, nama_ubin, lin, r):
    """-> bytes keadaan per titik (KERING..LUAR); aturan sama dengan genangan_nasional.hitung."""
    g, x0, ya = GN.ubin_dari_nama(nama_ubin)
    sel, blok = [], set()
    out = bytearray([LUAR]) * len(pt.p)
    for i, (x, y) in enumerate(pt.xy(g)):
        if x0 <= x < x0 + 300000 and ya - 300000 < y <= ya:
            c, b = int((x - x0) // 20), int((ya - y) // 20)
            sel.append((i, c, b))
            blok.add((c // 512, b // 512))
    with ThreadPoolExecutor(8) as ex:
        list(ex.map(lambda x: x.siapkan(blok), lin.semua() + [r]))
    for i, c, b in sel:
        v, e = lin.baca(c, b)
        out[i] = TAK if v == 255 else MASK if e == 1 else TETAP if r.nilai(c, b) == 1 else BASAH if v == 1 else KERING
    return bytes(out)


def slug(kunci):
    return kunci.replace("|", "_").replace(" ", "-")


def simpan_gz(jalur, d):
    os.makedirs(DIR, exist_ok=True)
    with gzip.open(jalur + ".tmp", "wt") as g:
        json.dump(d, g, separators=(",", ":"))
    os.replace(jalur + ".tmp", jalur)


def ambil_satu(h, kat, dem):
    jalur = os.path.join(DIR, slug(h["kunci"]) + ".json.gz")
    if os.path.exists(jalur):
        return "cache"
    pt = Titik(kec_kab(h["prov"], h["kab"]))
    l = next(x for x in kat.ub[h["ubin"]] if x["id"] == h["post"])
    hrefs = {k[a] for k in l["fr"] for a in ("f", "m") if k[a]} | {l["r"]}
    with ThreadPoolExecutor(12) as ex:
        ras = dict(zip(sorted(hrefs), ex.map(lambda x: GN.Raster(GN.HULU + x), sorted(hrefs))))
    lin = GN.Lintas([(ras[k["f"]], ras[k["m"]] if k["m"] else None) for k in l["fr"]])
    s = keadaan_titik(pt, h["ubin"], lin, ras[l["r"]])
    # DEM hanya di titik non-kering yang mungkin dipakai: seluruh titik dalam kotak jarak R dari non-kering terlalu ruwet; ambil semua
    xy = [(p[1], p[2]) for p in pt.p]
    dem.siapkan(xy)
    z = []
    for x, y in xy:
        v = dem.nilai(x, y)
        z.append(-32768 if v is None else round(v * 10))
    simpan_gz(jalur, {"kunci": h["kunci"], "n": len(s), "langkah": pt.langkah, "s": base64.b64encode(s).decode(), "z": z})
    return f"{len(s)} titik"


PASANGAN = os.path.join(DIR, "pasangan.json")


def pasangan(prov):
    """Pasangan (kabupaten, lintasan) dari snapshot pasangan.json. Snapshot dibuat sekali dari label_kab_hari.csv + katalog + DIBI
    (hasil.jsonl bersama bisa dikosongkan/ditulis ulang sesi lain: 27 Okt hilang di tengah kerja), BUKAN dari hasil.jsonl."""
    if not os.path.exists(PASANGAN):
        kat = GN.Katalog(GN.muat_item())
        dibi = {}
        for j, p, n, t, v in GN.baris_dibi():
            if {"banjir", "bandang"} & set(j):
                dibi[(p, n, t)] = dibi.get((p, n, t), 0) + v.get("terdampak", 0)
        out = []
        for r in GN.csv.reader(builtins.open(GN.LABEL)):
            if r[6] != "dibi" or r[0].split("|")[0] not in ("63", "33", "13"):
                continue
            p, n = r[0].split("|")
            pt = Titik(kec_kab(p, n))
            fr = pt.ubin()
            t = dt.date.fromisoformat(r[1])
            c = [(fr[u], l) for u, ls in kat.ub.items() if u in fr for l in ls if l["t"][:10] == r[1]]
            f, l = max(c, key=lambda x: x[0])
            h = GN.muat_hasil().get(f"dibi|{p}|{n}|{r[5]}")   # otoritatif bila ada: lintasan sama dengan hitungan bangunan GFM-saja
            if h and h.get("status") == "ok":
                l = next(x for x in kat.ub[h["ubin"]] if x["id"] == h["post"])
            out.append({"kunci": f"dibi|{p}|{n}|{r[5]}", "prov": p, "kab": n, "acuan": r[5], "post": l["id"], "ubin": l["ub"], "tgl": l["t"],
                        "cakupan_pct": float(r[4]), "terdampak": dibi.get((p, n, r[5]), 0), "tergenang_ha_gn": float(r[7]),
                        "bangunan_gn": [int(r[9] or 0), int(r[10] or 0)], "status": "ok", "sumber": "dibi"})
        GN.simpan(PASANGAN, out)
    return [h for h in GN.baca(PASANGAN) if h["prov"] in prov]


def ambil(a):
    kat = GN.Katalog(GN.muat_item())
    dem = Dem()
    for h in (h for h in pasangan(a.prov) if h["cakupan_pct"] >= 10):   # cakupan < 10% tak sah dievaluasi: jangan buang unduhan (tautan lambat)
        # DEM bersama antar pasangan (cache dekode); GFM paralel di dalam satu pasangan
        t0 = time.time()
        try:
            print(f"  {h['kunci']}: {ambil_satu(h, kat, dem)} ({time.time() - t0:.0f} dtk)", flush=True)
        except Exception as e:
            print(f"  GAGAL {h['kunci']}: {type(e).__name__} {e}", file=sys.stderr, flush=True)


# ---------------------------------------------------------------- model FwDET (murni, tanpa jaringan)
def median(v):
    return statistics.median(v)


def persentil(v, q):
    v = sorted(v)
    return v[min(len(v) - 1, int(q / 100 * len(v)))]


def kedalaman(g, s, z, par):
    """g = [(j, i)] indeks kisi per titik; s = keadaan; z = elevasi DSM (m atau None); par = PARAM.
    -> (dalam, tak): dalam[k] = kedalaman m (None bila tak diketahui), tak[k] = True bila tergenang taksiran."""
    n = len(s)
    pos = {c: k for k, c in enumerate(g)}
    nb = [[pos[(j + dj, i + di)] for dj in (-1, 0, 1) for di in (-1, 0, 1) if (dj or di) and (j + dj, i + di) in pos] for j, i in g]
    # 1. tanah = persentil rendah jendela
    wr, q = par["wr"], par["q"]
    if wr > 0:
        zb = []
        for k, (j, i) in enumerate(g):
            w = [z[pos[(j + dj, i + di)]] for dj in range(-wr, wr + 1) for di in range(-wr, wr + 1)
                 if (j + dj, i + di) in pos and z[pos[(j + dj, i + di)]] is not None]
            zb.append(persentil(w, q) if w else None)
    else:
        zb = list(z)
    langkah_km = par["langkah"] * 111.32
    rs = max(1, int(par["R"] / langkah_km))
    # 2-3. tepi -> permukaan
    e0 = [None] * n
    front = [k for k in range(n) if s[k] == BASAH and zb[k] is not None and any(s[m] == KERING for m in nb[k])]
    for k in front:
        e0[k] = zb[k]
    for _ in range(rs):
        baru = []
        for k in front:
            for m in nb[k]:
                if e0[m] is None and s[m] in LOLOS:
                    e0[m] = e0[k]
                    baru.append(m)
        front = baru
    sm = par["sm"]
    sf = [None] * n
    for k, (j, i) in enumerate(g):
        if e0[k] is None:
            continue
        sf[k] = median([e0[pos[(j + dj, i + di)]] for dj in range(-sm, sm + 1) for di in range(-sm, sm + 1)
                        if (j + dj, i + di) in pos and e0[pos[(j + dj, i + di)]] is not None]) if sm > 0 else e0[k]
    dep = [None if sf[k] is None or zb[k] is None else sf[k] - zb[k] for k in range(n)]
    # 4. taksiran: BFS dari titik tergenang teramati lewat mask/tak teramati/air tetap yang cukup dalam
    tak = [False] * n
    seen = [s[k] == BASAH for k in range(n)]
    front = [k for k in range(n) if s[k] == BASAH]
    for _ in range(rs):
        baru = []
        for k in front:
            for m in nb[k]:
                if not seen[m] and s[m] in (TAK, MASK, TETAP) and (s[m] == TETAP or (dep[m] is not None and dep[m] >= par["dmin"])):
                    seen[m] = True
                    baru.append(m)
                    tak[m] = s[m] != TETAP
        front = baru
    dalam = [None if s[k] == BASAH and dep[k] is None else (max(dep[k], 0.0) if s[k] == BASAH else dep[k] if tak[k] else None) for k in range(n)]
    return dalam, tak


def ha_sel(i):
    return GN.ha_sel(i)


def sel_bangunan(pt, bgn, titik_ok, dalam):
    """titik_ok = indeks titik tergenang -> {(i,j): [n, ha, [kedalaman]]} pada sel halus yang berisi bangunan."""
    sel = {}
    for k in titik_ok:
        _, lo, la, ha = pt.p[k]
        c = (math.floor((la - BG.LAT0) * BG.HALUS), math.floor((lo - BG.LON0) * BG.HALUS))
        v = bgn.get(c)
        if v:
            z = sel.setdefault(c, [v[0], 0.0, []])
            z[1] += ha
            z[2].append(dalam[k])
    return sel


def agregat(sel):
    """-> {'bawah','atas', 'kelas': [[bawah, atas] per < 0,5 / 0,5-1,5 / > 1,5 m]} (angka bulat)."""
    lo = hi = 0.0
    kl = [[0.0, 0.0] for _ in range(3)]
    for (i, _), (n, ha, dd) in sel.items():
        f = min(1.0, ha / ha_sel(i))
        d = [x for x in dd if x is not None]
        m = median(d) if d else 0.0
        c = 0 if m < BIN[0] else 1 if m <= BIN[1] else 2
        lo, hi = lo + n * f, hi + n
        kl[c][0] += n * f
        kl[c][1] += n
    return {"bawah": round(lo), "atas": round(hi), "kelas": [[round(a), round(b)] for a, b in kl]}


def jalankan(pt, s, z, par, bgn):
    """-> dict hasil satu kabupaten (luas ha + bangunan GFM-saja dan FwDET)."""
    g = [(round(p[2] / pt.langkah - .5), round(p[1] / pt.langkah - .5)) for p in pt.p]
    par = {**par, "langkah": pt.langkah}
    dalam, tak = kedalaman(g, s, z, par)
    basah = [k for k in range(len(s)) if s[k] == BASAH]
    fw = basah + [k for k in range(len(s)) if tak[k]]
    ha = lambda ks: sum(pt.p[k][3] for k in ks)
    out = {"gfm_ha": round(ha(basah), 1), "taksiran_ha": round(ha(fw) - ha(basah), 1),
           "taksiran_mask_ha": round(ha(k for k in fw if s[k] == MASK and tak[k]), 1),
           "kedalaman_median_m": round(median([dalam[k] for k in basah if dalam[k] is not None] or [0]), 2)}
    if bgn is not None:
        out["gfm"] = agregat(sel_bangunan(pt, bgn, basah, dalam))
        out["fwdet"] = agregat(sel_bangunan(pt, bgn, fw, dalam))
    return out


# ---------------------------------------------------------------- penduduk, evaluasi
_PEND = {}


def jiwa_per_bangunan(prov, kab):
    if not _PEND:
        _PEND["p"] = json.load(builtins.open(os.path.join(AKAR, "public/data/penduduk.json")))["kec"]
        _PEND["b"] = json.load(builtins.open(os.path.join(AKAR, "data/terkunci/bangunan/kec.json")))["kec"]
    pre = f"{prov}|{kab}|"
    p = sum(v for k, v in _PEND["p"].items() if k.startswith(pre))
    b = sum(v[0] for k, v in _PEND["b"].items() if k.startswith(pre))
    return p / b if b else None


def galat(est, dibi):
    return abs(math.log10(max(est, 100) / dibi))


def spearman(x, y):
    def rank(v):
        o = sorted(range(len(v)), key=lambda i: v[i])
        r = [0.0] * len(v)
        for p, i in enumerate(o):
            r[i] = p
        return r
    rx, ry = rank(x), rank(y)
    mx, my = statistics.mean(rx), statistics.mean(ry)
    sx = math.sqrt(sum((a - mx) ** 2 for a in rx)) * math.sqrt(sum((b - my) ** 2 for b in ry))
    return sum((a - mx) * (b - my) for a, b in zip(rx, ry)) / sx if sx else None


def muat_cache(h):
    j = os.path.join(DIR, slug(h["kunci"]) + ".json.gz")
    if not os.path.exists(j):
        return None
    with gzip.open(j, "rt") as g:
        d = json.load(g)
    return bytes(base64.b64decode(d["s"])), [None if v == -32768 else v / 10 for v in d["z"]]


_PT = {}


def hitung_semua(prov, par):
    rows = []
    for h in pasangan(prov):
        c = muat_cache(h)
        if c is None:
            continue
        if h["kunci"] not in _PT:
            _PT[h["kunci"]] = Titik(kec_kab(h["prov"], h["kab"]))
        pt = _PT[h["kunci"]]
        bgn, _ = GN.grid_bangunan(h["prov"])
        r = jalankan(pt, c[0], c[1], par, bgn)
        rp = jiwa_per_bangunan(h["prov"], h["kab"])
        mid = lambda b: (b["bawah"] + b["atas"]) / 2
        r.update({"prov": h["prov"], "kab": h["kab"], "tgl": h["tgl"][:10], "dibi": h["terdampak"], "cakupan_pct": h["cakupan_pct"],
                  "jiwa_per_bangunan": round(rp, 2) if rp else None, "jiwa_gfm": round(mid(r["gfm"]) * rp) if rp else None, "jiwa_fwdet": round(mid(r["fwdet"]) * rp) if rp else None})
        rows.append(r)
    return rows


def sah(r):
    return r["cakupan_pct"] >= 10 and r["dibi"] > 0 and r["jiwa_gfm"] is not None


def evaluasi(rows):
    """-> {median galat GFM, FwDET, bias, spearman, n} pada kabupaten ber-cakupan sah."""
    v = [r for r in rows if sah(r)]
    if not v:
        return None
    out = {"n": len(v)}
    for k in ("gfm", "fwdet"):
        out[f"galat_{k}"] = round(median([galat(r["jiwa_" + k], r["dibi"]) for r in v]), 3)
        out[f"bias_{k}"] = round(median([math.log10(max(r["jiwa_" + k], 100) / r["dibi"]) for r in v]), 3)
        out[f"spearman_{k}"] = round(spearman([r["jiwa_" + k] for r in v], [r["dibi"] for r in v]), 2) if len(v) > 2 else None
    out["lebih_baik"] = out["galat_fwdet"] < out["galat_gfm"]
    return out


def tabel(rows):
    print(f"{'prov kab':28} {'tgl':10} {'cak%':>5} {'GFM ha':>8} {'taks ha':>8} {'bangunan GFM':>14} {'bangunan FwDET':>16} {'jiwa GFM':>9} {'jiwa FwDET':>10} {'DIBI':>8} {'med m':>5}")
    for r in sorted(rows, key=lambda r: (r["prov"], r["kab"])):
        b = lambda x: f"{x['bawah']}-{x['atas']}"
        print(f"{r['prov'] + ' ' + r['kab']:28} {r['tgl']:10} {r['cakupan_pct']:5.1f} {r['gfm_ha']:8.0f} {r['taksiran_ha']:8.0f} {b(r['gfm']):>14} {b(r['fwdet']):>16} "
              f"{r['jiwa_gfm']:9} {r['jiwa_fwdet']:10} {r['dibi']:8} {r['kedalaman_median_m']:5}{'' if sah(r) else '  (cakupan tak sah)'}")


def hitung(a):
    par = {**PARAM, **{k: v for k, v in (("R", a.R), ("dmin", a.dmin), ("wr", a.wr), ("q", a.q), ("sm", a.sm)) if v is not None}}
    print("parameter:", par)
    rows = hitung_semua(a.prov, par)
    tabel(rows)
    for p in sorted({r["prov"] for r in rows}):
        print(f"  evaluasi {p}:", evaluasi([r for r in rows if r["prov"] == p]))
    if a.simpan:
        os.makedirs(DIR, exist_ok=True)
        GN.simpan(os.path.join(DIR, "kedalaman.json"), {"dibuat": dt.datetime.now(GN.WIB).isoformat(timespec="minutes"), "parameter": par, "pasangan": rows,
                                                         "evaluasi": {p: evaluasi([r for r in rows if r["prov"] == p]) for p in sorted({r["prov"] for r in rows})},
                                                         "_catatan": "Eksperimen, BUKAN keluaran publik. Bangunan Google Open Buildings v3 (CC BY 4.0); DEM Copernicus GLO-30; GFM Copernicus EMS."})
        print("ditulis", os.path.join(DIR, "kedalaman.json"))


def tala(a):
    best = []
    for R in (1.5, 3.0, 6.0):
        for dmin in (0.1, 0.25, 0.5):
            for wr, q in ((0, 50), (1, 25), (1, 10)):
                par = {"R": R, "dmin": dmin, "wr": wr, "q": q, "sm": 2}
                e = evaluasi(hitung_semua(["63"], par))
                print(par, e and (e["galat_gfm"], e["galat_fwdet"], e["bias_fwdet"], e["spearman_fwdet"]), flush=True)
                if e:
                    best.append((e["galat_fwdet"], par))
    best.sort(key=lambda x: x[0])
    print("terbaik:", best[:5])


# ---------------------------------------------------------------- uji
def uji():
    par = {"R": 5.0, "dmin": 0.1, "wr": 0, "q": 50, "sm": 0, "langkah": 0.001}
    # lembah buatan 1 baris: lereng 0,1 m per titik; basah kol 0-9 (kol 5-7 ter-mask: buta), kering teramati kol 10-14, mask jauh 15-17
    n = 20
    g = [(0, i) for i in range(n)]
    z = [0.1 * i for i in range(n)]
    s = [BASAH] * 5 + [MASK] * 3 + [BASAH] * 2 + [KERING] * 5 + [MASK] * 3 + [KERING] * 2
    dalam, tak = kedalaman(g, s, z, par)
    assert abs(dalam[0] - 0.9) < 1e-9 and abs(dalam[4] - 0.5) < 1e-9 and dalam[9] == 0.0, dalam      # permukaan = tanah tepi (kol 9) = 0,9
    assert tak[5:8] == [True] * 3 and abs(dalam[5] - 0.4) < 1e-9, (tak, dalam)                      # buta terhubung, di bawah permukaan
    assert not any(tak[15:18]) and not any(tak[:5]) and not any(tak[8:15]), tak                   # buta tak terhubung: tidak
    # buta terhubung tapi lebih tinggi dari permukaan: tidak tergenang
    z2 = list(z)
    z2[6] = 1.5
    _, tak2 = kedalaman(g, s, z2, par)
    assert tak2[5] and not tak2[6] and tak2[7], tak2   # blok 6 terlalu tinggi; 7 terhubung dari kanan (kol 8)
    # R membatasi: R=0,34 km = 3 langkah dari tepi (kol 9): kol 7 dan 6 terjangkau permukaannya, kol 5 tidak
    dk, tk = kedalaman(g, s, z, {**par, "R": 0.34})
    assert tk[7] and tk[6] and not tk[5], tk
    # tepi bersebelahan mask BUKAN tepi: tanpa titik kering, tak ada permukaan, tak ada kedalaman
    d0, t0 = kedalaman(g[:8], [BASAH] * 5 + [MASK] * 3, z[:8], par)
    assert d0[0] is None and not any(t0), d0
    # DSM: atap 5 m di tengah tanah datar: persentil rendah jendela 3x3 membuang atap
    gg = [(j, i) for j in range(3) for i in range(3)]
    zz = [0.0] * 9
    zz[4] = 5.0
    d, _ = kedalaman(gg, [KERING] * 4 + [BASAH] + [KERING] * 4, zz, {**par, "wr": 1, "q": 25, "sm": 0})
    assert d[4] == 0.0, d      # tepi tunggal: tanah ~0, atap terbuang -> kedalaman 0 (bukan -5)
    d, _ = kedalaman(gg, [KERING] * 4 + [BASAH] + [KERING] * 4, zz, {**par, "wr": 0, "sm": 0})
    assert d[4] == 0.0, d
    # aritmetika bangunan: sel (5,5) n=100 ditutup 0,25 sel; sel (6,6) n=10 ditutup penuh, kedalaman 1 m -> kelas 2
    A = ha_sel(5)
    sel = {(5, 5): [100, .25 * A, [0.2, 0.3]], (6, 6): [10, 3 * ha_sel(6), [1.0]]}
    r = agregat(sel)
    assert r["bawah"] == round(25 + 10) and r["atas"] == 110 and r["kelas"] == [[25, 100], [10, 10], [0, 0]], r
    # sama dengan hitung_bangunan genangan_nasional (basis banding GFM-saja)
    gn, _ = GN.hitung_bangunan([[0, 5, 5, 100, .25 * A, 0.0], [0, 6, 6, 10, 3 * ha_sel(6), 0.0]], ["X"])
    assert gn["tergenang"] == [r["bawah"], r["atas"]], (gn, r)
    # evaluasi: median galat, korelasi peringkat
    rows = [{"cakupan_pct": 50, "dibi": 1000, "jiwa_gfm": 100, "jiwa_fwdet": 900}, {"cakupan_pct": 50, "dibi": 10000, "jiwa_gfm": 1000, "jiwa_fwdet": 11000},
            {"cakupan_pct": 50, "dibi": 100000, "jiwa_gfm": 5000, "jiwa_fwdet": 120000}, {"cakupan_pct": 2, "dibi": 5000, "jiwa_gfm": 0, "jiwa_fwdet": 0}]
    e = evaluasi(rows)
    assert e["n"] == 3 and e["lebih_baik"] and e["spearman_fwdet"] == 1.0, e
    assert abs(galat(100, 1000) - 1.0) < 1e-9 and abs(galat(0, 1000) - 1.0) < 1e-9
    print("ok")


def utama():
    p = argparse.ArgumentParser()
    p.add_argument("mode", choices=["ambil", "hitung", "tala", "uji"])
    p.add_argument("--prov", nargs="*", default=["63", "33", "13"])
    p.add_argument("--R", type=float)
    p.add_argument("--dmin", type=float)
    p.add_argument("--wr", type=int)
    p.add_argument("--q", type=int)
    p.add_argument("--sm", type=int)
    p.add_argument("--simpan", action="store_true")
    a = p.parse_args()
    {"ambil": ambil, "hitung": hitung, "tala": tala}.get(a.mode, lambda _: uji())(a)


if __name__ == "__main__":
    utama()
