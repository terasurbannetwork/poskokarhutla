"""M1 model genangan DKI: tangki per kecamatan -> public/banjir/data/kecamatan_genangan.json

Kriteria TERKUNCI di docs/banjir/KRITERIA-M1.md (sha256 di KRITERIA_SHA256; beda = hasil tidak sah, skrip menolak).

  tangki.py uji                 self-check stdlib, tanpa jaringan
  tangki.py latih               kalibrasi 2017-2023 (CV blok-tahun), tulis m1_param.json + kecamatan_genangan.json
  tangki.py bekukan             SEKALI: tulis sidik (kode + parameter + kriteria) ke data/banjir/genangan/m1_beku.json; kedua kali ditolak
  tangki.py prakira [--tanggal YYYY-MM-DD] [--kering]
                                baca m1_hujan.jsonl -> m1_prakiraan.jsonl (append-only); menolak tanggal yang labelnya sudah ada,
                                menolak bila belum dibekukan atau kode/parameter berubah sejak beku (--kering = hitung, cetak, tidak menulis)

Model (per kecamatan k, per jam, simpanan V dalam mm di atas luas kecamatan):
  limpasan   SCS-CN kumulatif: Pc indeks hujan sebelumnya (meluruh, paruh waktu PARUH_PC jam), Q(Pc) = (Pc-0,2S)^2/(Pc+0,8S);
             limpasan jam = Q(Pc+P) - Q(Pc). Satu S kota (tidak ada data kedap per kecamatan di repo).
  keluaran   out_k = Kd * f_k * (1 - kappa * [pasang tinggi dan kecamatan pesisir]) mm/jam, tidak melebihi V.
  f_k        prior dari kerapatan saluran OSM (drain+canal+ditch, bukan sungai) dan jumlah rumah pompa per km2:
             f_k = max(0,2; rata kedua rasio ternormalkan) ^ gamma. gamma = 0 berarti semua kecamatan sama.
  genangan   ya bila V melewati ambang Vth pada jam mana pun di hari WIB itu.
  kedalaman  (V_maks - Vth) / 10 / PHI cm (HIPOTESIS: PHI = fraksi luas cekungan, ASUMSI tetap, tidak terkalibrasi).
  lama surut jam dari puncak V sampai V <= Vth, hujan nol sesudah akhir hari (HIPOTESIS, tidak ada label surut).
Parameter bebas (5): S, Kd, gamma, kappa, Vth. Selebihnya TETAP dan tertulis (PARUH_PC, PHI, PC_BASAH, AMBANG_PASANG, bentuk hietograf,
definisi pesisir). Kalibrasi: N_KANDIDAT titik acak (benih tetap, tidak bergantung data) x sapuan Vth; tiap lipatan CV (satu tahun
dilepas) memilih pasangan terbaik (ETS gabungan) HANYA dari tahun lain; model akhir memilih dari semua tahun 2017-2023.
Anggota keluaran = 7 model lipatan + model akhir; peluang = bagian anggota yang berkata ya, rentang = min-maks antar anggota.
Hujan latih: GSMaP harian (hari UTC) dibagi ke jam mengikuti pola jam ERA5 0,25 derajat hari UTC yang sama (nol = rata), lalu
dijumlah ke hari WIB; fitur (mm, m1, m3) sama bentuknya dengan m1_hujan.jsonl; model selalu membaca hujan lewat hietograf(mm, m1, m3).
Tahun > 2023 tidak pernah dimuat saat kalibrasi.
"""
import bisect, datetime as dt, hashlib, json, math, os, random, sys, tempfile

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from bersama import AKAR, WIB, KecDKI, baca, simpan  # noqa: E402
import pemicu  # noqa: E402
import gsmap  # noqa: E402
from uji_balik import skor  # noqa: E402

KRITERIA = os.path.join(AKAR, "docs/banjir/KRITERIA-M1.md")
KRITERIA_SHA256 = "614a30046eb1770f26d28ae0296bd581297b9b53c2d3aa2796263be3b03a1ca0"
KODE = os.path.abspath(__file__)
DIR = os.path.join(AKAR, "data/banjir/genangan")
PARAM = os.path.join(DIR, "m1_param.json")
BEKU = os.path.join(DIR, "m1_beku.json")
HUJAN_OP = os.path.join(DIR, "m1_hujan.jsonl")
LABEL_OP = os.path.join(DIR, "m1_label.jsonl")
PRAKIRAAN = os.path.join(DIR, "m1_prakiraan.jsonl")
KELUAR = os.path.join(AKAR, "public/banjir/data/kecamatan_genangan.json")
SALURAN = os.path.join(AKAR, "public/banjir/data/genangan/saluran_kec.json")
M0 = os.path.join(AKAR, "public/banjir/data/kecamatan_pemicu.json")
ERA5 = pemicu.HUJAN
VERSI = 1

TAHUN = (2017, 2023)            # kalibrasi; 2024+ tidak dimuat (KRITERIA-M1 larangan)
MUSIM = pemicu.MUSIM            # Nov-Apr
MUSIM_REF = tuple(range(2017, 2023))   # musim 2017/18 .. 2022/23
N_REF, N_MAKS = 3, 200
LABEL = "Hipotesis, belum lolos uji"

# --- tetap (bukan parameter bebas)
PARUH_PC = 72.0          # jam, paruh waktu indeks hujan sebelumnya
DEC = 0.5 ** (1.0 / PARUH_PC)
PHI = 0.3                # fraksi luas cekungan, ASUMSI (kedalaman hipotesis)
PC_BASAH = 60.0          # mm, keadaan tanah "basah" pada tabel (kering = 0)
AMBANG_PASANG = 0.70     # indeks pasang pantura >= ini = pasang tinggi (kuantil 85% seri pasang_astro.json)
PUNCAK_JAM = 15          # jam WIB puncak hietograf
N_KANDIDAT = 800
GRID_VTH = [round(0.25 * 1.17 ** i, 3) for i in range(36)]      # 0,25 .. ~65 mm
RANGE = {"S": (8.0, 150.0), "Kd": (0.3, 12.0), "gamma": (0.0, 1.0), "kappa": (0.0, 0.9)}
GRID_D = (10, 25, 50, 75, 100, 150, 200, 300)
GRID_M1 = (5, 10, 20, 40, 70, 100)
SURUT_MAKS = 72


def kriteria_ok():
    h = hashlib.sha256(open(KRITERIA, "rb").read()).hexdigest()
    if h != KRITERIA_SHA256:
        sys.exit(f"KRITERIA-M1.md berubah ({h}); hasil tidak sah, tolak")
    return h


def sha_berkas(j):
    return hashlib.sha256(open(j, "rb").read()).hexdigest()


def sha_param(p):
    """sha256 isi parameter tanpa penanda waktu 'dibuat'."""
    return hashlib.sha256(json.dumps({k: v for k, v in p.items() if k != "dibuat"}, sort_keys=True, separators=(",", ":")).encode()).hexdigest()


def sidik(p):
    """sidik = sha256(sha kode + sha parameter + sha kriteria)."""
    return hashlib.sha256((sha_berkas(KODE) + sha_param(p) + KRITERIA_SHA256).encode()).hexdigest()


# ------------------------------------------------------------------ kecamatan, prior, pasang
def kec_daratan():
    return [k for k in pemicu.kecamatan() if "SERIBU" not in k[0].upper()]


def luas_km2():
    """{kunci: luas km2} dari poligon kecamatan (proyeksi ekuirektangular di lintang tengah; cukup untuk rasio kerapatan)."""
    out = {}
    for f in json.load(open(os.path.join(AKAR, "public/geo/kecamatan/31.json")))["features"]:
        g = f["geometry"]
        polis = g["coordinates"] if g["type"] == "MultiPolygon" else [g["coordinates"]]
        a = 0.0
        for p in polis:
            r = p[0]
            c = math.cos(math.radians(sum(x[1] for x in r) / len(r)))
            xy = [(x[0] * 111.32 * c, x[1] * 110.57) for x in r]
            a += abs(sum(xy[i][0] * xy[(i + 1) % len(xy)][1] - xy[(i + 1) % len(xy)][0] * xy[i][1] for i in range(len(xy)))) / 2
        out[f"{f['properties']['kab']}|{f['properties']['kec']}"] = a
    return out


def prior_f(kunci_kec, gamma):
    """-> ({kunci: f_k}, {kunci: pesisir}). f_k dari kerapatan saluran dan rumah pompa per km2 (rata-rata dua rasio ternormalkan)."""
    sal, lu = baca(SALURAN)["kecamatan"], luas_km2()
    ds = [(sum(sal.get(k, {}).get("km", {}).get(j, 0) for j in ("drain", "canal", "ditch")) / lu[k]) for k in kunci_kec]
    dp = [sal.get(k, {}).get("rumah_pompa", 0) / lu[k] for k in kunci_kec]
    ms, mp = (sum(x) / len(x) or 1.0 for x in (ds, dp))
    raw = [(a / ms + b / mp) / 2 for a, b in zip(ds, dp)]
    f = {k: max(0.2, r) ** gamma for k, r in zip(kunci_kec, raw)}
    return f, {k: "Jakarta Utara" in k for k in kunci_kec}


_SKALA = []


def skala_pasang():
    if not _SKALA:
        import pasang_astro
        _SKALA.append(pasang_astro.skala())
    return _SKALA[0]


def indeks_pasang(tgl, skala):
    """Indeks pasang pantura hari tgl (date): 0,8 diurnal + 0,2 semi-diurnal, gaya astronomis 13.00 WIB dinormalkan skala."""
    import pasang_astro
    d, s = pasang_astro.gaya(dt.datetime(tgl.year, tgl.month, tgl.day, 6, tzinfo=dt.timezone.utc))
    return 0.8 * d / skala[0] + 0.2 * s / skala[1]


# ------------------------------------------------------------------ hujan latih per jam WIB
def muat_era5_jam():
    """{sel: {waktu WIB 'YYYY-MM-DDTHH:MM': mm}} dari cache pemicu.py (ERA5 0,25 derajat jam)."""
    out = {}
    for a, b in pemicu.CHUNK:
        j = baca(os.path.join(ERA5, f"era5_{a:%Y%m%d}_{b:%Y%m%d}.json"))
        if not j:
            sys.exit("cache ERA5 jam belum lengkap: jalankan `pemicu.py ambil`")
        for s, x in zip(j["sel"], j["data"]):
            out.setdefault(tuple(s), {}).update(zip(x["waktu"], x["mm"]))
    return out


def jam_utc_hari(G, e, tgl):
    """24 nilai mm jam UTC hari tgl: total GSMaP G dibagi mengikuti pola ERA5 (waktu WIB = UTC + 7); nol/hilang = rata."""
    v = [e.get((dt.datetime(tgl.year, tgl.month, tgl.day) + dt.timedelta(hours=h + 7)).strftime("%Y-%m-%dT%H:00")) for h in range(24)]
    s = sum(x for x in v if x is not None) if None not in v else 0.0
    return [G / 24.0] * 24 if s <= 1e-9 else [G * x / s for x in v]


def maks3(v):
    return max(sum(v[i:i + 3]) for i in range(len(v) - 2))


def hujan_wib(g, kecs, era5, tahun_maks=TAHUN[1]):
    """-> {kunci: {tanggal_iso: (mm, m1, m3)}} hari WIB 00.00-23.59. GSMaP tahun > tahun_maks TIDAK dibaca."""
    out = {}
    for k, la, lo in kecs:
        idx = pemicu.sel_gsmap(g, la, lo)[0]
        e = era5[pemicu.sel_era5(la, lo)]
        utc = {}
        for t, v in g["hari"].items():
            if int(t[:4]) <= tahun_maks and v[idx] is not None:
                utc[dt.date.fromisoformat(t)] = jam_utc_hari(v[idx], e, dt.date.fromisoformat(t))
        o = {}
        for d0, jam in utc.items():
            d = d0 + dt.timedelta(days=1)       # hari WIB d = jam 17-23 UTC hari d-1 + jam 0-16 UTC hari d; di sini d = d0+1 lewat 17Z d0
            if d.year <= tahun_maks and d in utc:
                w = jam[17:] + utc[d][:17]
                o[d.isoformat()] = (sum(w), max(w), maks3(w))
        out[k] = o
    return out


# ------------------------------------------------------------------ label dinormalkan per musim (KRITERIA-M1)
def musim_dari(tgl):
    return tgl.year if tgl.month >= 11 else tgl.year - 1


def normalkan(baris):
    """baris: [(musim, n_laporan, kedalaman_maks_cm)] -> ({musim: n_musim}, ref, tak_tercapai).
    ref = median (musim 2017/18..2022/23) proporsi baris positif menurut label (a: kedalaman >= 10 cm, ATAU b: n >= 3).
    (Tafsiran kalimat KRITERIA-M1 "menurut aturan (b) dengan n = 3": aturan label dengan n = 3, termasuk (a); tafsiran (b) saja
    membuat ref 1% yang tak bisa dicapai karena (a) sendiri sudah di atasnya.) n_musim = bilangan bulat terkecil sehingga
    proporsi positif (a: kedalaman >= 10 cm, ATAU b: n >= n_musim) tidak melebihi ref. Tak ada n yang cukup: N_MAKS dan dicatat."""
    per = {}
    for s, n, dm in baris:
        per.setdefault(s, []).append((n, dm))
    pr = sorted(sum(1 for n, dm in per[s] if dm >= 10 or n >= N_REF) / len(per[s]) for s in MUSIM_REF if s in per)
    ref = (pr[(len(pr) - 1) // 2] + pr[len(pr) // 2]) / 2
    nm, tak = {}, []
    for s, v in per.items():
        for n in range(1, N_MAKS + 1):
            if sum(1 for a, b in v if b >= 10 or a >= n) / len(v) <= ref:
                nm[s] = n
                break
        else:
            nm[s], _ = N_MAKS, tak.append(s)
    return nm, ref, tak


# ------------------------------------------------------------------ tangki
def hietograf(mm, m1, m3):
    """24 nilai mm/jam WIB dari (total, maks 1 jam, maks 3 jam): puncak jam 15, m3-m1 di jam 16 (60%) dan 14 (40%),
    sisa merata di 8 jam 11-13 dan 17-21 (pola teramati Jakarta: kejadian <= 4 jam, volume terbesar di awal). Jumlah = mm."""
    h = [0.0] * 24
    if mm <= 0:
        return h
    m1 = min(max(m1, 0.0), mm)
    m3 = min(max(m3, m1), mm)
    h[PUNCAK_JAM] = m1
    h[PUNCAK_JAM + 1] += 0.6 * (m3 - m1)
    h[PUNCAK_JAM - 1] += 0.4 * (m3 - m1)
    for i in (11, 12, 13, 17, 18, 19, 20, 21):
        h[i] += (mm - m3) / 8
    return h


def jalan(h, V, Pc, out, S, jejak=False):
    """Satu hari (24 jam). -> (V_maks sepanjang hari termasuk awal, V_akhir, Pc_akhir, limpasan_total, keluaran_total, jejak V per jam | None)."""
    ia, s8 = 0.2 * S, 0.8 * S
    vmax, R, O, tr = V, 0.0, 0.0, ([] if jejak else None)
    for p in h:
        if p > 0.0:
            a = Pc + p
            r = (a - ia) ** 2 / (a + s8) if a > ia else 0.0
            r -= (Pc - ia) ** 2 / (Pc + s8) if Pc > ia else 0.0
            Pc = a
            R += r
            V += r
        Pc *= DEC
        o = V if V < out else out
        V -= o
        O += o
        if V > vmax:
            vmax = V
        if jejak:
            tr.append(V)
    return vmax, V, Pc, R, O, tr


def jalan_kering(V, Pc, out):
    """Hari tanpa hujan (jalan pintas, hasil sama dengan jalan() dengan hietograf nol)."""
    return V, max(0.0, V - 24 * out), Pc * DEC ** 24


def keluaran(prm, f, pesisir, tinggi):
    return prm["Kd"] * f * (1 - prm["kappa"] * (1 if (tinggi and pesisir) else 0))


def surut(tr, hp, vth):
    """jam dari jam puncak hp sampai V <= vth (hujan nol sesudah akhir hari, V turun linear tak terhingga tidak dihitung: tr sudah diperpanjang)."""
    for j in range(hp + 1, len(tr)):
        if tr[j] <= vth:
            return j - hp
    return SURUT_MAKS


def kasus(prm, f, pesisir, d, m1, tinggi, basah, m3):
    """Satu skenario tabel: (ya, kedalaman_cm, surut_jam)."""
    out = keluaran(prm, f, pesisir, tinggi)
    vmax, V, Pc, R, O, tr = jalan(hietograf(d, m1, m3), 0.0, PC_BASAH if basah else 0.0, out, prm["S"], jejak=True)
    tr = tr + [max(0.0, V - out * (i + 1)) for i in range(SURUT_MAKS)]      # perpanjang tanpa hujan
    if vmax <= prm["Vth"]:
        return False, 0.0, 0
    hp = max(range(24), key=lambda i: tr[i])
    return True, (vmax - prm["Vth"]) / 10 / PHI, surut(tr, hp, prm["Vth"])


# ------------------------------------------------------------------ rangkaian per kecamatan
def seri_kec(hari_k, label_k, nm):
    """hari_k: {tanggal: (mm, m1, m3)}; -> list terurut (ordinal, mm, hietograf|None, tgl, y|None, tahun). y = label hari musim 2017-2023."""
    out = []
    for t in sorted(hari_k):
        tgl = dt.date.fromisoformat(t)
        mm, m1, m3 = hari_k[t]
        y = None
        if tgl.month in MUSIM and TAHUN[0] <= tgl.year <= TAHUN[1]:
            n, dm = label_k.get(t, (0, 0))
            y = 1 if (dm >= 10 or n >= nm[musim_dari(tgl)]) else 0
        out.append((tgl.toordinal(), mm, hietograf(mm, m1, m3) if mm > 0 else None, tgl, y, tgl.year))
    return out


def simulasi(seri, out_normal, out_tinggi, S, tinggi_set):
    """V_maks per hari untuk satu kecamatan; keadaan awal kering, direset bila ada hari hilang. -> list sejajar seri."""
    hasil, V, Pc, prev = [], 0.0, 0.0, None
    for o, mm, h, tgl, y, th in seri:
        if prev is not None and o != prev + 1:
            V, Pc = 0.0, 0.0
        prev = o
        out = out_tinggi if o in tinggi_set else out_normal
        if h is None:
            vm, V, Pc = jalan_kering(V, Pc, out)
        else:
            vm, V, Pc, _, _, _ = jalan(h, V, Pc, out, S)
        hasil.append(vm)
    return hasil


def hitung_kontingensi(pos, neg, c):
    """pos/neg terurut; ya bila skor > c. -> (a, b, c, d)."""
    a = len(pos) - bisect.bisect_right(pos, c)
    b = len(neg) - bisect.bisect_right(neg, c)
    return a, b, len(pos) - a, len(neg) - b


def ets_dari(t):
    return skor(*t)["ets"] if sum(t) else None


class Dunia:
    """Semua yang dibutuhkan simulasi: seri per kecamatan, pasang, prior."""

    def __init__(self, kecs, seri, tinggi_set, luas):
        self.kecs, self.seri, self.tinggi, self.luas = kecs, seri, tinggi_set, luas

    def vmax_semua(self, prm):
        f, pes = prior_f([k for k, _, _ in self.kecs], prm["gamma"])
        res = []
        for i, (k, _, _) in enumerate(self.kecs):
            on, ot = keluaran(prm, f[k], pes[k], False), keluaran(prm, f[k], pes[k], True)
            res.append(simulasi(self.seri[i], on, ot, prm["S"], self.tinggi))
        return res


def kumpul_tahun(dunia, vm):
    """-> {tahun: (pos terurut, neg terurut)} vmax pada baris berlabel."""
    p, n = {}, {}
    for i, rows in enumerate(dunia.seri):
        for (o, mm, h, tgl, y, th), v in zip(rows, vm[i]):
            if y is not None:
                (p if y else n).setdefault(th, []).append(v)
                (n if y else p).setdefault(th, [])
    return {th: (sorted(p[th]), sorted(n[th])) for th in p}


def cari_terbaik(tabel, tahun_pakai):
    """tabel: [(kand_idx, {tahun: [kontingensi per Vth]})]; -> (ets, kand_idx, vi) terbaik pada gabungan tahun_pakai."""
    best = (-9.0, None, None)
    for ci, per in tabel:
        for vi in range(len(GRID_VTH)):
            t = [0, 0, 0, 0]
            for th in tahun_pakai:
                t = [x + y for x, y in zip(t, per[th][vi])]
            e = ets_dari(t)
            if e is not None and e > best[0]:
                best = (e, ci, vi)
    return best


def kandidat(n=N_KANDIDAT, benih=20261028):
    r = random.Random(benih)
    out = []
    for _ in range(n):
        out.append({"S": round(math.exp(r.uniform(*map(math.log, RANGE["S"]))), 3), "Kd": round(math.exp(r.uniform(*map(math.log, RANGE["Kd"]))), 3),
                    "gamma": round(r.uniform(*RANGE["gamma"]), 3), "kappa": round(r.uniform(*RANGE["kappa"]), 3)})
    return out


def blok_dari_prediksi(dunia, vm, vth, tahun):
    """kontingensi per blok (kecamatan, tahun) untuk baris berlabel di `tahun`."""
    out = {}
    for i, rows in enumerate(dunia.seri):
        for (o, mm, h, tgl, y, th), v in zip(rows, vm[i]):
            if y is not None and th == tahun:
                t = out.setdefault((i, th), [0, 0, 0, 0])
                ya = v > vth
                t[0 if ya and y else 1 if ya else 2 if y else 3] += 1
    return out


def gabung(*bloks):
    out = {}
    for b in bloks:
        for k, v in b.items():
            out[k] = [x + y for x, y in zip(out.get(k, [0, 0, 0, 0]), v)]
    return out


def baris_berlabel(dunia):
    return [(i, o, mm, th, y, tgl) for i, rows in enumerate(dunia.seri) for (o, mm, h, tgl, y, th) in rows if y is not None]


def pembanding_cv(dunia, tahun_all):
    """Klimatologi bulanan per kecamatan dan ambang harian seragam, CV blok-tahun yang sama. -> {nama: blok}."""
    B = baris_berlabel(dunia)
    kl, am = {}, {}
    for held in tahun_all:
        tr = [r for r in B if r[3] != held]
        te = [r for r in B if r[3] == held]
        # klimatologi: laju positif per (kec, bulan) pada latih; potong dipilih ETS pada latih
        sel = {}
        for i, o, mm, th, y, tgl in tr:
            a = sel.setdefault((i, tgl.month), [0, 0])
            a[0] += y
            a[1] += 1
        laju = {k: v[0] / v[1] for k, v in sel.items()}
        pos = sorted(laju[(i, tgl.month)] for i, o, mm, th, y, tgl in tr if y)
        neg = sorted(laju[(i, tgl.month)] for i, o, mm, th, y, tgl in tr if not y)
        cands = sorted(set(round(x, 4) for x in laju.values()))
        cut = max(cands, key=lambda c: ets_dari(hitung_kontingensi(pos, neg, c - 1e-9)) or -9)
        b = {}
        for i, o, mm, th, y, tgl in te:
            ya = laju.get((i, tgl.month), 0.0) >= cut
            t = b.setdefault((i, th), [0, 0, 0, 0])
            t[0 if ya and y else 1 if ya else 2 if y else 3] += 1
        kl = gabung(kl, b)
        # ambang harian
        pos = sorted(r[2] for r in tr if r[4])
        neg = sorted(r[2] for r in tr if not r[4])
        cutd = max(range(2, 200), key=lambda c: ets_dari(hitung_kontingensi(pos, neg, c - 1e-9)) or -9)
        b = {}
        for i, o, mm, th, y, tgl in te:
            ya = mm >= cutd
            t = b.setdefault((i, th), [0, 0, 0, 0])
            t[0 if ya and y else 1 if ya else 2 if y else 3] += 1
        am = gabung(am, b)
    return {"klimatologi_bulanan": kl, "ambang_harian_kota": am}


def m0_beku(dunia, hujan_fitur):
    """M0 beku (kecamatan_pemicu.json) dipakai apa adanya pada baris yang sama: (d, m1) -> peluang (interpolasi bilinear di ln),
    ya bila >= potong. CATATAN: M0 dilatih pada 2017-2023, jadi ini DALAM-SAMPEL untuk M0 (menguntungkan M0)."""
    m = baca(M0)
    gd, gm = m["grid"]["harian_mm"], m["grid"]["maks_1j_mm"]
    pot = m["model"]["potong_peluang"]

    def sisip(g, v):
        v = min(max(v, g[0]), g[-1])
        j = max(0, min(len(g) - 2, bisect.bisect_right(g, v) - 1))
        w = (math.log(v) - math.log(g[j])) / (math.log(g[j + 1]) - math.log(g[j]))
        return j, w

    def p_at(p, i, j):
        while j >= 0 and p[i * len(gm) + j] is None:
            j -= 1
        return p[i * len(gm) + j] if j >= 0 else 0.0

    out = {}
    for ki, (k, _, _) in enumerate(dunia.kecs):
        p = m["kec"][k]["p"]
        for (o, mm, h, tgl, y, th), (d, m1, _) in zip(dunia.seri[ki], hujan_fitur[ki]):
            if y is None:
                continue
            i, wi = sisip(gd, max(d, 1e-3))
            j, wj = sisip(gm, max(m1, 1e-3))
            v = ((1 - wi) * ((1 - wj) * p_at(p, i, j) + wj * p_at(p, i, j + 1)) + wi * ((1 - wj) * p_at(p, i + 1, j) + wj * p_at(p, i + 1, j + 1)))
            ya = v >= pot
            t = out.setdefault((ki, th), [0, 0, 0, 0])
            t[0 if ya and y else 1 if ya else 2 if y else 3] += 1
    return out


def ringkas(blok):
    t = [sum(v[i] for v in blok.values()) for i in range(4)]
    s = skor(*t)
    return {**{m: None if s[m] is None else round(s[m], 3) for m in ("pod", "far", "csi", "ets")}, "n": dict(zip("abcd", t))}


# ------------------------------------------------------------------ latih
def kumpul_data():
    """-> (kecs, hujan_wib, info). Tahun > 2023 tidak dimuat."""
    kecs = kec_daratan()
    g, pesan = gsmap.muat_harian()
    if not g:
        sys.exit("GSMaP tidak bisa dipakai: " + pesan)
    h = hujan_wib(g, kecs, muat_era5_jam())
    assert max(int(t[:4]) for v in h.values() for t in v) <= TAHUN[1], "ada hari > 2023 di data latih"
    return kecs, h, {"sha256_gsmap_hingga_2023": pemicu.sidik_gsmap(g, TAHUN[1]), "versi_gsmap": g["meta"].get("versi")}


def bangun_dunia(kecs, h, lap, skala):
    baris = []
    for k, _, _ in kecs:
        for t in h[k]:
            tgl = dt.date.fromisoformat(t)
            if tgl.month in MUSIM and TAHUN[0] <= tgl.year <= TAHUN[1]:
                n, dm = lap.get((k, t), (0, 0))
                baris.append((musim_dari(tgl), n, dm))
    nm, ref, tak = normalkan(baris)
    seri = [seri_kec(h[k], {t: lap[(k, t)] for t in h[k] if (k, t) in lap}, nm) for k, _, _ in kecs]
    tinggi = set()
    tgls = {s[3] for rows in seri for s in rows}
    for tgl in tgls:
        if indeks_pasang(tgl, skala) >= AMBANG_PASANG:
            tinggi.add(tgl.toordinal())
    return Dunia(kecs, seri, tinggi, luas_km2()), nm, ref, tak


def latih():
    kriteria_ok()
    kecs, h, info = kumpul_data()
    lap = pemicu.label_laporan()
    skala = skala_pasang()
    dunia, nm, ref, tak = bangun_dunia(kecs, h, lap, skala)
    assert all(s[5] <= TAHUN[1] for rows in dunia.seri for s in rows), "tahun > 2023 termuat"
    tahun = list(range(TAHUN[0], TAHUN[1] + 1))
    cands = kandidat()
    tabel = []
    for ci, prm in enumerate(cands):
        vm = dunia.vmax_semua(prm)
        per = kumpul_tahun(dunia, vm)
        tabel.append((ci, {th: [hitung_kontingensi(*per[th], v) for v in GRID_VTH] for th in tahun}))
        if ci % 20 == 0:
            print(f"  kandidat {ci}/{len(cands)}", file=sys.stderr)
    anggota, lipat = [], {}
    for held in tahun + [None]:
        e, ci, vi = cari_terbaik(tabel, [t for t in tahun if t != held])
        prm = {**cands[ci], "Vth": GRID_VTH[vi]}
        anggota.append({"lipatan": held, "ets_latih": round(e, 4), **prm})
        if held:
            lipat[held] = prm
    # CV: tiap lipatan dilepas, nilai pada tahun dilepas dengan parameter dari tahun lain
    cv_m1 = {}
    for held in tahun:
        prm = lipat[held]
        vm = dunia.vmax_semua(prm)
        cv_m1 = gabung(cv_m1, blok_dari_prediksi(dunia, vm, prm["Vth"], held))
    hujan_fitur = [[h[k][s[3].isoformat()] for s in dunia.seri[i]] for i, (k, _, _) in enumerate(kecs)]
    pb = pembanding_cv(dunia, tahun)
    pb["m0_beku_dalam_sampel"] = m0_beku(dunia, hujan_fitur)
    for v in pb.values():
        for k in cv_m1:
            v.setdefault(k, [0, 0, 0, 0])
    cv = {"M1": ringkas(cv_m1), **{n: ringkas(b) for n, b in pb.items()}}
    selisih = {}
    terbaik = max(pb, key=lambda n: ringkas(pb[n])["ets"] or -9)
    for n in pb:
        t, ci = pemicu.bootstrap_selisih(cv_m1, pb[n])
        selisih[n] = {"selisih_ets": t, "ci95": ci}
    per_tahun = {}
    for th in tahun:
        per_tahun[th] = {"M1": ringkas({k: v for k, v in cv_m1.items() if k[1] == th}),
                         "klimatologi_bulanan": ringkas({k: v for k, v in pb["klimatologi_bulanan"].items() if k[1] == th})}
    c3 = pemicu.grid_m3([{"d": mm, "m1": m1, "m3": m3} for v in h.values() for (mm, m1, m3) in v.values() if mm > 0])
    prevalensi = {s: None for s in nm}
    param = {
        "versi": VERSI, "dibuat": dt.datetime.now(WIB).isoformat(timespec="seconds"),
        "parameter_bebas": {"jumlah": 5, "nama": ["S", "Kd", "gamma", "kappa", "Vth"]},
        "tetap": {"paruh_pc_jam": PARUH_PC, "phi": PHI, "pc_basah_mm": PC_BASAH, "ambang_pasang": AMBANG_PASANG, "puncak_jam": PUNCAK_JAM},
        "anggota": anggota, "c3": [round(x, 5) for x in c3], "skala_pasang": [round(x, 6) for x in skala],
        "kandidat": {"n": N_KANDIDAT, "benih": 20261028, "rentang": RANGE, "grid_vth": GRID_VTH},
        "latih": {"tahun": list(TAHUN), "baris_berlabel": len(baris_berlabel(dunia)), "positif": sum(r[4] for r in baris_berlabel(dunia)),
                  "ref_proporsi_b3": round(ref, 5), "n_musim": {str(k): v for k, v in sorted(nm.items())}, "musim_tak_tercapai": tak, **info},
        "cv": {"ringkas": cv, "selisih_vs_pembanding": selisih, "pembanding_terbaik": terbaik, "per_tahun": per_tahun},
    }
    simpan(PARAM, param)
    tulis(param, kecs)
    print(json.dumps(cv, ensure_ascii=False), file=sys.stderr)
    print(json.dumps(selisih, ensure_ascii=False), file=sys.stderr)
    for a in anggota:
        print("  anggota", a, file=sys.stderr)


# ------------------------------------------------------------------ keluaran tabel
def m3_dari(c3, d, m1):
    m3 = min(d, math.expm1(c3[0] + c3[1] * math.log1p(d) + c3[2] * math.log1p(m1)))
    return max(m3, m1)


def tulis(param, kecs):
    kunci = [k for k, _, _ in kecs]
    ang = param["anggota"]
    fs = [prior_f(kunci, a["gamma"]) for a in ang]
    kec = {}
    for ki, k in enumerate(kunci):
        P, DLO, DHI, SLO, SHI = [], [], [], [], []
        for d in GRID_D:
            for m1 in GRID_M1:
                for tinggi in (False, True):
                    for basah in (False, True):
                        if m1 > d:
                            for L in (P, DLO, DHI, SLO, SHI):
                                L.append(None)
                            continue
                        m3 = m3_dari(param["c3"], d, m1)
                        rs = [kasus(a, f[0][k], f[1][k], d, m1, tinggi, basah, m3) for a, f in zip(ang, fs)]
                        ya = [r for r in rs if r[0]]
                        P.append(round(len(ya) / len(rs), 2))
                        DLO.append(round(min(r[1] for r in ya)) if ya else 0)
                        DHI.append(round(max(r[1] for r in ya)) if ya else 0)
                        SLO.append(min(r[2] for r in ya) if ya else 0)
                        SHI.append(max(r[2] for r in ya) if ya else 0)
        kec[k] = {"p": P, "dalam_cm": [DLO, DHI], "surut_jam": [SLO, SHI]}
    sd = sidik(param)
    simpan(KELUAR, {
        "label": LABEL, "versi": VERSI, "dibuat": dt.date.today().isoformat(),
        "grid": {"harian_mm": list(GRID_D), "maks_1j_mm": list(GRID_M1), "pasang": ["rendah", "tinggi"], "tanah": ["kering", "basah"],
                 "urutan": "indeks = ((i_harian * %d + j_maks1j) * 2 + pasang) * 2 + tanah; null bila maks 1 jam > harian" % len(GRID_M1),
                 "p": "peluang = bagian dari %d anggota model (7 lipatan CV + model akhir) yang berkata genangan" % len(ang),
                 "dalam_cm": "[batas bawah, batas atas] kedalaman setara antar anggota yang berkata ya; HIPOTESIS",
                 "surut_jam": "[bawah, atas] jam dari puncak sampai simpanan di bawah ambang; HIPOTESIS"},
        "model": {"definisi": "tangki per kecamatan: limpasan SCS-CN, keluaran drainase Kd x f_kec, pasang tinggi menahan keluaran kecamatan pesisir",
                  "parameter_bebas": param["parameter_bebas"], "tetap": param["tetap"], "anggota": ang, "label": "laporan PetaBencana dinormalkan per musim (KRITERIA-M1)",
                  "latih": param["latih"], "cv": param["cv"]},
        "uji_prospektif": {"kriteria_sha256": KRITERIA_SHA256, "sidik": sd, "sha256_parameter": sha_param(param), "sha256_kode": sha_berkas(KODE),
                           "tanggal_beku": None, "status": "belum dibekukan", "jendela": "dari tanggal beku sampai 2027-04-30, hanya November-April"},
        "keterbatasan": [
            "Hujan latih: GSMaP harian dibagi ke jam mengikuti pola jam ERA5 0,25 derajat hari UTC yang sama; GSMaP per jam tidak dipakai (belum ada arsip 2017-2023), jadi puncak jam bergantung pola ERA5 yang meremehkan konvektif.",
            "Satu S (CN) kota: tidak ada peta kedap air per kecamatan; tampungan seragam (tanpa DEM per kecamatan).",
            "Kd per kecamatan hanya dari prior kerapatan saluran OSM (tidak lengkap) dan jumlah rumah pompa; kapasitas pompa resmi tidak publik.",
            "Pasang tinggi = indeks gaya astronomis (bukan tinggi muka air), kecamatan pesisir = Jakarta Utara.",
            "Kedalaman dan lama surut HIPOTESIS: tidak ada label kedalaman/surut terukur; fraksi cekungan %.1f ASUMSI." % PHI,
            "Label PetaBencana bias pelapor; dinormalkan per musim, bukan dikoreksi."],
        "kec": kec})


# ------------------------------------------------------------------ bekukan
def bekukan():
    kriteria_ok()
    ada = baca(BEKU)
    if ada and ada.get("beku"):
        sys.exit(f"sudah dibekukan {ada['beku'][0]['tanggal_beku']} (sidik {ada['beku'][0]['sidik'][:12]}); pembekuan hanya sekali, versi baru = berkas baru")
    p, k = baca(PARAM), baca(KELUAR)
    if not p or not k:
        sys.exit("jalankan `tangki.py latih` dulu")
    if k["uji_prospektif"]["sha256_parameter"] != sha_param(p) or k["uji_prospektif"]["sha256_kode"] != sha_berkas(KODE):
        sys.exit("keluaran tidak cocok dengan kode/parameter sekarang: jalankan `tangki.py latih` ulang sebelum membekukan")
    rec = {"sidik": sidik(p), "sha256_kode": sha_berkas(KODE), "sha256_parameter": sha_param(p), "kriteria_sha256": KRITERIA_SHA256,
           "tanggal_beku": dt.datetime.now(WIB).isoformat(timespec="seconds"), "versi": VERSI}
    simpan(BEKU, {"beku": [rec]})
    k["uji_prospektif"].update(sidik=rec["sidik"], tanggal_beku=rec["tanggal_beku"], status="berjalan")
    simpan(KELUAR, k)
    print("beku", rec["sidik"])


# ------------------------------------------------------------------ prakira
def baca_jsonl(jalur):
    return [json.loads(b) for b in open(jalur, encoding="utf-8") if b.strip()] if os.path.exists(jalur) else []


def periksa_beku():
    b, p = baca(BEKU), baca(PARAM)
    if not b or not b.get("beku"):
        sys.exit("model belum dibekukan: prakiraan tidak sah (jalankan `tangki.py bekukan`)")
    if not p or b["beku"][0]["sidik"] != sidik(p):
        sys.exit("kode/parameter/kriteria berubah sejak beku: prakiraan ditolak (tidak ada penyetelan sesudah pembekuan)")
    return p


def prakira_baris(p, rows, tgl):
    """Hitung prakiraan semua kecamatan untuk tgl dari m1_hujan (replay hari berurutan; keadaan awal kering, reset bila hari hilang/dikeluarkan)."""
    kunci = [k for k, _, _ in kec_daratan()]
    skala = p["skala_pasang"]
    ang = p["anggota"]
    fs = [prior_f(kunci, a["gamma"]) for a in ang]
    byd = {r["tanggal"]: r for r in rows}
    awal = [r for r in rows if r["tanggal"] <= tgl.isoformat()]
    keadaan = [{k: [0.0, 0.0] for k in kunci} for _ in ang]
    prev, hasil = None, None
    for r in awal:
        t = dt.date.fromisoformat(r["tanggal"])
        if r.get("dikeluarkan"):
            prev = None
            continue
        if prev is not None and t != prev + dt.timedelta(days=1):
            keadaan = [{k: [0.0, 0.0] for k in kunci} for _ in ang]
        prev = t
        tinggi = indeks_pasang(t, skala) >= AMBANG_PASANG
        hasil = {k: [] for k in kunci}
        for ai, a in enumerate(ang):
            for k in kunci:
                x = r["kec"][k]
                h = hietograf(x["mm"], x["m1"], x["m3"])
                f, pes = fs[ai][0][k], fs[ai][1][k]
                V, Pc = keadaan[ai][k]
                out = keluaran(a, f, pes, tinggi)
                vmax, V2, Pc2, _, _, tr = jalan(h, V, Pc, out, a["S"], jejak=True)
                tr = tr + [max(0.0, V2 - out * (i + 1)) for i in range(SURUT_MAKS)]
                ya = vmax > a["Vth"]
                hp = max(range(24), key=lambda i: tr[i]) if ya else 0
                hasil[k].append((ya, vmax, (vmax - a["Vth"]) / 10 / PHI if ya else 0.0, surut(tr, hp, a["Vth"]) if ya else 0))
                keadaan[ai][k] = [V2, Pc2]
    if hasil is None or prev != tgl:
        return None
    return {k: {"ya": v[-1][0], "p": round(sum(1 for x in v if x[0]) / len(v), 2), "v_mm": round(v[-1][1], 1),
                "dalam_cm": [round(min(x[2] for x in v if x[0])), round(max(x[2] for x in v if x[0]))] if any(x[0] for x in v) else [0, 0],
                "surut_jam": [min(x[3] for x in v if x[0]), max(x[3] for x in v if x[0])] if any(x[0] for x in v) else [0, 0]}
            for k, v in hasil.items()}


def prakira(tanggal=None, kering=False):
    kriteria_ok()
    p = periksa_beku()
    rows = sorted(baca_jsonl(HUJAN_OP), key=lambda r: r["tanggal"])
    if not rows:
        sys.exit("m1_hujan.jsonl kosong")
    tgl = dt.date.fromisoformat(tanggal) if tanggal else dt.date.fromisoformat(rows[-1]["tanggal"])
    if any(r["tanggal"] == tgl.isoformat() for r in baca_jsonl(LABEL_OP)):
        sys.exit(f"{tgl}: label hari itu sudah ada; prakiraan harus mendahului label, ditolak")
    if any(r["tanggal"] == tgl.isoformat() for r in baca_jsonl(PRAKIRAAN)):
        print(f"{tgl}: prakiraan sudah ada (append-only, tidak ditimpa)")
        return
    ada = next((r for r in rows if r["tanggal"] == tgl.isoformat()), None)
    if not ada or ada.get("dikeluarkan"):
        sys.exit(f"{tgl}: tidak ada hujan teramati yang sah di m1_hujan.jsonl")
    kec = prakira_baris(p, rows, tgl)
    r = {"tanggal": tgl.isoformat(), "versi_hujan": "teramati", "label": LABEL, "sidik": baca(BEKU)["beku"][0]["sidik"],
         "kriteria_sha256": KRITERIA_SHA256, "dibuat": dt.datetime.now(WIB).isoformat(timespec="seconds"), "kec": kec}
    if kering:
        print(json.dumps(r, ensure_ascii=False)[:600])
        return
    os.makedirs(DIR, exist_ok=True)
    with open(PRAKIRAAN, "a", encoding="utf-8") as f:
        f.write(json.dumps(r, ensure_ascii=False, separators=(",", ":")) + "\n")
    print(f"prakiraan {tgl}: {sum(1 for v in kec.values() if v['ya'])} dari {len(kec)} kecamatan genangan")


# ------------------------------------------------------------------ self-check
def uji():
    global DIR, PARAM, BEKU, HUJAN_OP, LABEL_OP, PRAKIRAAN, KELUAR
    kriteria_ok()
    # 1. hietograf: jumlah = mm, m1 dan m3 terpenuhi
    for mm, m1, m3 in ((50, 20, 35), (10, 10, 10), (80, 5, 12)):
        h = hietograf(mm, m1, m3)
        assert abs(sum(h) - mm) < 1e-9 and abs(h[PUNCAK_JAM] - m1) < 1e-9
    # 2. keseimbangan massa: V0 + limpasan = V_akhir + keluaran (jalur penuh dan jejak)
    r = random.Random(7)
    for _ in range(40):
        mm = r.uniform(0, 250)
        m1 = r.uniform(0, mm)
        h = hietograf(mm, m1, min(mm, m1 * 1.8))
        V0, Pc0, out, S = r.uniform(0, 30), r.uniform(0, 80), r.uniform(0.2, 9), r.uniform(10, 140)
        vm, V, Pc, R, O, tr = jalan(h, V0, Pc0, out, S, jejak=True)
        assert abs(V0 + R - V - O) < 1e-8, (V0, R, V, O)
        assert len(tr) == 24 and vm >= max(tr) - 1e-12 and V >= 0 and R <= mm + 1e-9
    # jalan pintas hari kering = jalan() dengan hietograf nol
    for V0 in (0.0, 3.0, 40.0):
        a = jalan([0.0] * 24, V0, 11.0, 1.5, 50.0)
        b = jalan_kering(V0, 11.0, 1.5)
        assert abs(a[1] - b[1]) < 1e-9 and abs(a[2] - b[2]) < 1e-9 and a[0] == b[0]
    # 3. monotonik: hujan naik -> V_maks tidak turun; Kd naik -> V_maks tidak naik; pasang tinggi (pesisir) -> tidak turun
    prev = -1
    for lam in (0.2, 0.5, 1, 1.5, 2, 3):
        vm = jalan(hietograf(40 * lam, 15 * lam, 25 * lam), 0.0, 0.0, 2.0, 60.0)[0]
        assert vm >= prev - 1e-12
        prev = vm
    prev = 1e9
    for kd in (0.5, 1, 2, 4, 8):
        vm = jalan(hietograf(120, 40, 80), 0.0, 0.0, kd, 60.0)[0]
        assert vm <= prev + 1e-12
        prev = vm
    p0 = {"S": 60.0, "Kd": 2.0, "kappa": 0.5, "Vth": 5.0}
    assert keluaran(p0, 1.0, True, True) < keluaran(p0, 1.0, True, False) == keluaran(p0, 1.0, False, True)
    # 4. tidak memuat 2024+: hujan_wib menyaring GSMaP tahun > tahun_maks; normalkan berkas label tidak membaca lain
    g = {"meta": {"grid": {"lon": [106.8], "lat": [-6.2]}}, "hari": {}}
    t = dt.date(2023, 12, 20)
    while t <= dt.date(2024, 1, 10):
        g["hari"][t.isoformat()] = [10.0]
        t += dt.timedelta(days=1)
    kk = [("A|a", -6.2, 106.8)]
    era = {pemicu.sel_era5(-6.2, 106.8): {}}
    hw = hujan_wib(g, kk, era)
    assert hw["A|a"] and max(hw["A|a"]) == "2023-12-31", max(hw["A|a"])
    # GSMaP rata 10 mm/hari dan ERA5 kosong -> 10 mm per hari WIB, m1 = 10/24
    assert abs(hw["A|a"]["2023-12-25"][0] - 10.0) < 1e-9 and abs(hw["A|a"]["2023-12-25"][1] - 10 / 24) < 1e-9
    # pola jam ERA5 dipakai: semua hujan di satu jam WIB 12.00 (= 05Z) pada hari UTC 2023-12-25
    for i in range(24):
        era[pemicu.sel_era5(-6.2, 106.8)][(dt.datetime(2023, 12, 25, 7) + dt.timedelta(hours=i)).strftime("%Y-%m-%dT%H:00")] = 0.0
    era[pemicu.sel_era5(-6.2, 106.8)]["2023-12-25T12:00"] = 4.0
    hw = hujan_wib(g, kk, era)
    assert abs(hw["A|a"]["2023-12-25"][1] - 10.0) < 1e-9 and abs(hw["A|a"]["2023-12-25"][0] - (10 + 7 * 10 / 24)) < 1e-9
    # 5. normalisasi label per musim
    baris = []
    for s in range(2017, 2023):
        baris += [(s, 3, 0)] * 5 + [(s, 0, 0)] * 95
    baris += [(2023, 1, 0)] * 30 + [(2023, 0, 0)] * 70       # musim ramai pelapor: n_musim naik
    nm, ref, tak = normalkan(baris)
    assert abs(ref - 0.05) < 1e-9 and nm[2017] == 1 and nm[2023] == 2 and not tak, (nm, ref, tak)
    # 6. pembekuan sekali, prakiraan menolak sesudah label dan sebelum beku
    asli = (DIR, PARAM, BEKU, HUJAN_OP, LABEL_OP, PRAKIRAAN, KELUAR)
    tmp = tempfile.mkdtemp()
    try:
        DIR = tmp
        PARAM, BEKU, HUJAN_OP, LABEL_OP, PRAKIRAAN = (os.path.join(tmp, n) for n in ("p.json", "b.json", "h.jsonl", "l.jsonl", "r.jsonl"))
        KELUAR = os.path.join(tmp, "k.json")
        kunci = [k for k, _, _ in kec_daratan()]
        prm = {"versi": VERSI, "anggota": [{"lipatan": None, "S": 40.0, "Kd": 1.5, "gamma": 0.5, "kappa": 0.4, "Vth": 4.0},
                                          {"lipatan": 2017, "S": 60.0, "Kd": 1.0, "gamma": 0.3, "kappa": 0.2, "Vth": 6.0}],
               "c3": [0.0, 0.8, 0.2], "skala_pasang": [1.0, 1.0], "dibuat": "x"}
        simpan(PARAM, prm)
        simpan(KELUAR, {"uji_prospektif": {"sha256_parameter": sha_param(prm), "sha256_kode": sha_berkas(KODE), "status": "belum dibekukan"}})
        try:
            prakira("2026-10-26")
        except SystemExit as ex:
            assert "belum dibekukan" in str(ex)
        else:
            raise AssertionError("prakiraan sebelum beku harus ditolak")
        bekukan()
        try:
            bekukan()
        except SystemExit as ex:
            assert "sudah dibekukan" in str(ex)
        else:
            raise AssertionError("bekukan kedua harus ditolak")
        assert baca(KELUAR)["uji_prospektif"]["status"] == "berjalan"
        with open(HUJAN_OP, "w") as f:
            for i, mm in enumerate((0.0, 60.0, 90.0)):
                d = f"2026-10-{25 + i}"
                f.write(json.dumps({"tanggal": d, "dikeluarkan": False, "kec": {k: {"mm": mm, "m1": mm / 3, "m3": mm * 0.6, "h": 0} for k in kunci}}) + "\n")
        with open(LABEL_OP, "w") as f:
            f.write(json.dumps({"tanggal": "2026-10-27", "pb": {"kec": {}}}) + "\n")
        try:
            prakira("2026-10-27")
        except SystemExit as ex:
            assert "label" in str(ex)
        else:
            raise AssertionError("prakiraan sesudah label harus ditolak")
        prakira("2026-10-26")
        prakira("2026-10-26")
        rr = baca_jsonl(PRAKIRAAN)
        assert len(rr) == 1 and rr[0]["tanggal"] == "2026-10-26" and len(rr[0]["kec"]) == 42
        assert any(v["ya"] for v in rr[0]["kec"].values()), "60 mm hari kedua harus menggenangi sebagian kecamatan"
        # kode berubah sesudah beku -> prakiraan menolak
        b = baca(BEKU)
        b["beku"][0]["sidik"] = "0" * 64
        simpan(BEKU, b)
        try:
            prakira("2026-10-26", kering=True)
        except SystemExit as ex:
            assert "berubah" in str(ex)
        else:
            raise AssertionError("sidik basi harus ditolak")
    finally:
        DIR, PARAM, BEKU, HUJAN_OP, LABEL_OP, PRAKIRAAN, KELUAR = asli
    # 7. berkas nyata (bila ada)
    if os.path.exists(KELUAR):
        d = baca(KELUAR)
        assert os.path.getsize(KELUAR) < 300_000, os.path.getsize(KELUAR)
        assert len(d["kec"]) == 42 and d["label"] == LABEL and d["uji_prospektif"]["kriteria_sha256"] == KRITERIA_SHA256
        p = baca(PARAM)
        assert p["latih"]["tahun"][1] <= 2023 and d["uji_prospektif"]["sha256_parameter"] == sha_param(p)
        n = len(GRID_D) * len(GRID_M1) * 4
        for k, v in d["kec"].items():
            assert len(v["p"]) == n and all(x is None or 0 <= x <= 1 for x in v["p"])
        b = baca(BEKU)
        if b and b.get("beku"):
            assert b["beku"][0]["sidik"] == sidik(p), "sidik beku != kode/parameter sekarang"
    print("ok")


if __name__ == "__main__":
    a = sys.argv[1:] or ["uji"]
    if a[0] == "prakira":
        prakira(a[a.index("--tanggal") + 1] if "--tanggal" in a else None, "--kering" in a)
    else:
        {"latih": latih, "bekukan": bekukan, "uji": uji}.get(a[0], uji)()
