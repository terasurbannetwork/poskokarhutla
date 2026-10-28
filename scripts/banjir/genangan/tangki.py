"""M1 model genangan DKI: tangki per kecamatan -> public/banjir/data/kecamatan_genangan.json

Kriteria TERKUNCI di docs/banjir/KRITERIA-M1.md (sha256 di KRITERIA_SHA256; beda = hasil tidak sah, skrip menolak).

  tangki.py uji                 self-check stdlib, tanpa jaringan
  tangki.py latih               kalibrasi 2017-2023 (CV blok-tahun), tulis m1_param.json + kecamatan_genangan.json
  tangki.py bekukan             SEKALI: tulis sidik (kode + parameter + kriteria) ke data/banjir/genangan/m1_beku.json; kedua kali ditolak
  tangki.py prakira [--versi teramati|prakiraan] [--tanggal YYYY-MM-DD] [--kering]
                                -> m1_prakiraan.jsonl (append-only, kunci tanggal+versi). teramati (bawaan): hujan dari m1_hujan.jsonl.
                                prakiraan: hujan per jam Open-Meteo ECMWF IFS, wajib ditulis sebelum 00.00 WIB hari itu.
                                Menolak: belum dibekukan, kode/parameter/berkas sidik berubah, label hari itu sudah ada,
                                tanggal < tanggal beku atau di luar Nov-Apr/30 Apr 2027 (kode keluar 3), arsip menyusut terhadap git HEAD
                                (--kering = hitung, cetak, tidak menulis)

Model (per kecamatan k, per jam, simpanan V dalam mm di atas luas kecamatan):
  limpasan   SCS-CN kumulatif: Pc indeks hujan sebelumnya (meluruh, paruh waktu PARUH_PC jam), Q(Pc) = (Pc-0,2S)^2/(Pc+0,8S);
             limpasan jam = Q(Pc+P) - Q(Pc). Satu S kota (tidak ada data kedap per kecamatan di repo).
  keluaran   out_k = Kd * f_k * (1 - kappa * [pasang tinggi dan kecamatan pesisir]) mm/jam, tidak melebihi V.
  f_k        prior dari kerapatan saluran OSM (drain+canal+ditch, bukan sungai) dan jumlah rumah pompa per km2:
             f_k = max(0,2; rata kedua rasio ternormalkan) ^ gamma. gamma = 0 berarti semua kecamatan sama.
  genangan   ya bila V melewati ambang Vth pada jam mana pun di hari WIB itu.
  kedalaman  (V_maks - Vth) / 10 / PHI cm (HIPOTESIS: PHI = fraksi luas cekungan, ASUMSI tetap, tidak terkalibrasi).
  lama surut jam dari puncak V sampai V <= Vth, hujan nol sesudah akhir hari (HIPOTESIS, tidak ada label surut).
Suku dasar per kecamatan (keputusan pemilik 28 Okt 2026): ambang kecamatan Vth_k = Vth * exp(-b * z_k), z_k = logit(p_k) - logit(p_kota),
p_k = (pos_k + M_PRIOR * p_kota) / (n_k + M_PRIOR) = frekuensi hari berlabel positif kecamatan k yang menyusut ke kota (M_PRIOR TETAP, bukan
parameter bebas). pos/n dihitung HANYA dari tahun latih lipatan itu (model akhir: 2017-2023), jadi tahun yang dilepas tidak pernah masuk z_k.
Parameter bebas (6): S, Kd, gamma, kappa, b, Vth (b = satu parameter baru; b=0 = M1 tanpa suku dasar). Selebihnya TETAP dan tertulis (PARUH_PC, PHI, PC_BASAH, AMBANG_PASANG, bentuk hietograf,
definisi pesisir). Kalibrasi: N_KANDIDAT titik acak (benih tetap, tidak bergantung data) x sapuan Vth; tiap lipatan CV (satu tahun
dilepas) memilih pasangan terbaik (ETS gabungan) HANYA dari tahun lain; model akhir memilih dari semua tahun 2017-2023.
Anggota keluaran = 7 model lipatan + model akhir; peluang = bagian anggota yang berkata ya, rentang = min-maks antar anggota.
Hujan latih: GSMaP harian (hari UTC) dibagi ke jam mengikuti pola jam ERA5 0,25 derajat hari UTC yang sama (nol = rata), lalu
dijumlah ke hari WIB; fitur (mm, m1, m3) sama bentuknya dengan m1_hujan.jsonl; model selalu membaca hujan lewat hietograf(mm, m1, m3).
Tahun > 2023 tidak pernah dimuat saat kalibrasi.
"""
import bisect, datetime as dt, hashlib, json, math, os, random, sys, tempfile, urllib.parse

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from bersama import AKAR, WIB, KecDKI, ambil_json, baca, simpan  # noqa: E402
import pemicu  # noqa: E402
import gsmap  # noqa: E402
import m1_kumpul  # noqa: E402
from uji_balik import skor  # noqa: E402

KRITERIA = os.path.join(AKAR, "docs/banjir/KRITERIA-M1.md")
KRITERIA_SHA256 = "614a30046eb1770f26d28ae0296bd581297b9b53c2d3aa2796263be3b03a1ca0"
TAFSIR = os.path.join(AKAR, "docs/banjir/KRITERIA-M1-TAFSIR.md")
TAFSIR_SHA256 = "bcc9c7789cb00ce265a34f0e9e32e29d040f3095e630c7f4b79df0e4815eb2c1"
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
# berkas luar tangki.py yang ikut sidik (H1): ubah satu byte = sidik lain = jendela uji lain
SIDIK_BERKAS = [os.path.join(AKAR, r) for r in (
    "scripts/banjir/pasang_astro.py", "public/banjir/data/genangan/saluran_kec.json", "public/geo/kecamatan/31.json",
    "scripts/banjir/genangan/pemicu.py", "scripts/banjir/genangan/bersama.py", "scripts/banjir/genangan/gsmap.py",
    "scripts/banjir/genangan/m1_kumpul.py", "scripts/banjir/genangan/m1_nilai.py",
    "scripts/banjir/genangan/petabencana.py", "scripts/banjir/wilayah.py", "scripts/banjir/umum.py", "scripts/banjir/uji_balik.py")]
JENDELA_AKHIR = dt.date(2027, 4, 30)     # KRITERIA-M1: jendela uji berakhir 30 April 2027
KELUAR_JENDELA = 3                       # kode keluar prakira: tanggal di luar jendela (workflow menganggapnya "dilewati", bukan galat)
OPENMETEO = "https://api.open-meteo.com/v1/forecast"
JAM_UJI = None                           # hanya self-check: jam palsu

TAHUN = (2017, 2023)            # kalibrasi; 2024+ tidak dimuat (KRITERIA-M1 larangan)
MUSIM = pemicu.MUSIM            # Nov-Apr
MUSIM_REF = tuple(range(2017, 2023))   # musim 2017/18 .. 2022/23
N_REF = 3
M_PRIOR = 200            # hari semu penyusutan frekuensi kecamatan ke kota (TETAP; ~1100 hari berlabel per kecamatan per 6 tahun)
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
RANGE = {"S": (8.0, 150.0), "Kd": (0.3, 12.0), "gamma": (0.0, 1.0), "kappa": (0.0, 0.9), "b": (0.0, 1.2)}
GRID_D = (10, 25, 50, 75, 100, 150, 200, 300)
GRID_M1 = (5, 10, 20, 40, 70, 100)
SURUT_MAKS = 72


def kriteria_ok():
    h = hashlib.sha256(open(KRITERIA, "rb").read()).hexdigest()
    if h != KRITERIA_SHA256:
        sys.exit(f"KRITERIA-M1.md berubah ({h}); hasil tidak sah, tolak")
    return h


def tafsir_ok():
    h = hashlib.sha256(open(TAFSIR, "rb").read()).hexdigest()
    if h != TAFSIR_SHA256:
        sys.exit(f"KRITERIA-M1-TAFSIR.md berubah ({h}); hasil tidak sah, tolak")
    return h


def sha_berkas(j):
    return hashlib.sha256(open(j, "rb").read()).hexdigest()


def sha_param(p):
    """sha256 isi parameter tanpa penanda waktu 'dibuat'."""
    return hashlib.sha256(json.dumps({k: v for k, v in p.items() if k != "dibuat"}, sort_keys=True, separators=(",", ":")).encode()).hexdigest()


def sidik(p):
    """sidik = sha256(sha kode + sha parameter + sha kriteria + sha tafsir + sha tiap berkas di SIDIK_BERKAS, urut daftar)."""
    return hashlib.sha256((sha_berkas(KODE) + sha_param(p) + KRITERIA_SHA256 + TAFSIR_SHA256
                           + "".join(sha_berkas(j) for j in SIDIK_BERKAS)).encode()).hexdigest()


def sekarang():
    return JAM_UJI or dt.datetime.now(WIB)


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


def normalkan(baris, ref=None):
    """baris: [(musim, n_laporan, kedalaman_maks_cm)] -> ({musim: n_musim}, ref, tak_tercapai). Tafsir KRITERIA-M1-TAFSIR.md:
    ref = median, atas musim 2017/18..2022/23, proporsi baris dengan n >= 3 (aturan (b) SAJA). n_musim = n >= 1 terkecil sehingga
    proporsi (kedalaman >= 10 cm ATAU n >= n_musim) <= ref; bila (a) sendiri > ref, n_musim = tak hingga (label hanya (a)), dicatat.
    ref diberikan = dipakai apa adanya (penilai prospektif: acuan dari kalibrasi, baris hanya musim uji)."""
    per = {}
    for s, n, dm in baris:
        per.setdefault(s, []).append((n, dm))
    if ref is None:
        pr = sorted(sum(1 for n, dm in per[s] if n >= N_REF) / len(per[s]) for s in MUSIM_REF if s in per)
        ref = (pr[(len(pr) - 1) // 2] + pr[len(pr) // 2]) / 2
    nm, tak = {}, []
    for s, v in per.items():
        if sum(1 for n, dm in v if dm >= 10) / len(v) > ref:
            nm[s] = math.inf
            tak.append(s)
            continue
        nm[s] = next(n for n in range(1, max(a for a, _ in v) + 2) if sum(1 for a, b in v if b >= 10 or a >= n) / len(v) <= ref)
    return nm, ref, sorted(tak)


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


def logit(p):
    return math.log(p / (1 - p))


def hitung_z(dunia, tahun_pakai):
    """z_k per kecamatan dari frekuensi hari berlabel positif HANYA pada tahun_pakai, menyusut ke kota dengan M_PRIOR hari semu."""
    pos, tot = [0] * len(dunia.seri), [0] * len(dunia.seri)
    for i, rows in enumerate(dunia.seri):
        for (o, mm, h, tgl, y, th) in rows:
            if y is not None and th in tahun_pakai:
                pos[i] += y
                tot[i] += 1
    pk = sum(pos) / sum(tot)
    pk = min(max(pk, 1e-6), 1 - 1e-6)
    return [logit(min(max((p + M_PRIOR * pk) / (n + M_PRIOR), 1e-6), 1 - 1e-6)) - logit(pk) for p, n in zip(pos, tot)]


def skala_vm(vm, b, z):
    """skor kecamatan = V_maks * exp(b z_k); ya bila skor > Vth (setara Vth_k = Vth exp(-b z_k))."""
    return vm if not b else [[v * w for v in row] for row, w in zip(vm, (math.exp(b * x) for x in z))]


def vth_kec(a, k):
    """Vth_k satu anggota (a berisi 'z' per kunci kecamatan; anggota tanpa 'z' = tanpa suku dasar)."""
    return a["Vth"] * math.exp(-a.get("b", 0.0) * a.get("z", {}).get(k, 0.0))


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
                    "gamma": round(r.uniform(*RANGE["gamma"]), 3), "kappa": round(r.uniform(*RANGE["kappa"]), 3), "b": round(r.uniform(*RANGE["b"]), 3)})
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


def m0_fungsi():
    """M0 beku (kecamatan_pemicu.json) -> f(kunci_kec, harian_mm, maks_1j_mm) -> bool: peluang (interpolasi bilinear di ln) >= potong."""
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

    def ya(k, d, m1):
        p = m["kec"][k]["p"]
        i, wi = sisip(gd, max(d, 1e-3))
        j, wj = sisip(gm, max(m1, 1e-3))
        v = ((1 - wi) * ((1 - wj) * p_at(p, i, j) + wj * p_at(p, i, j + 1)) + wi * ((1 - wj) * p_at(p, i + 1, j) + wj * p_at(p, i + 1, j + 1)))
        return v >= pot
    return ya


def m0_beku(dunia, hujan_fitur):
    """M0 beku dipakai apa adanya pada baris yang sama (lihat m0_fungsi).
    CATATAN: M0 dilatih pada 2017-2023, jadi ini DALAM-SAMPEL untuk M0 (menguntungkan M0)."""
    f = m0_fungsi()
    out = {}
    for ki, (k, _, _) in enumerate(dunia.kecs):
        for (o, mm, h, tgl, y, th), (d, m1, _) in zip(dunia.seri[ki], hujan_fitur[ki]):
            if y is None:
                continue
            ya = f(k, d, m1)
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
    tafsir_ok()
    kecs, h, info = kumpul_data()
    lap = pemicu.label_laporan()
    skala = skala_pasang()
    dunia, nm, ref, tak = bangun_dunia(kecs, h, lap, skala)
    assert all(s[5] <= TAHUN[1] for rows in dunia.seri for s in rows), "tahun > 2023 termuat"
    tahun = list(range(TAHUN[0], TAHUN[1] + 1))
    cands = kandidat()
    kunci_kec = [k for k, _, _ in kecs]
    lipatan = tahun + [None]
    zf = {held: hitung_z(dunia, [t for t in tahun if t != held]) for held in lipatan}      # z hanya dari tahun latih lipatan itu
    tabel = {held: [] for held in lipatan}
    tab0 = []                                                                              # ablasi: tanpa suku dasar (b=0)
    for ci, prm in enumerate(cands):
        vm = dunia.vmax_semua(prm)
        per = kumpul_tahun(dunia, vm)
        tab0.append((ci, {th: [hitung_kontingensi(*per[th], v) for v in GRID_VTH] for th in tahun}))
        for held in lipatan:
            per = kumpul_tahun(dunia, skala_vm(vm, prm["b"], zf[held]))
            tabel[held].append((ci, {th: [hitung_kontingensi(*per[th], v) for v in GRID_VTH] for th in tahun if th != held}))
        if ci % 20 == 0:
            print(f"  kandidat {ci}/{len(cands)}", file=sys.stderr)
    anggota, lipat, lipat0 = [], {}, {}
    for held in lipatan:
        pakai = [t for t in tahun if t != held]
        e, ci, vi = cari_terbaik(tabel[held], pakai)
        prm = {**cands[ci], "Vth": GRID_VTH[vi]}
        anggota.append({"lipatan": held, "ets_latih": round(e, 4), **prm, "z": {k: round(x, 4) for k, x in zip(kunci_kec, zf[held])}})
        e0, ci0, vi0 = cari_terbaik(tab0, pakai)
        if held:
            lipat[held] = (prm, zf[held])
            lipat0[held] = {**cands[ci0], "b": 0.0, "Vth": GRID_VTH[vi0]}
    # CV: tiap lipatan dilepas, nilai pada tahun dilepas dengan parameter dan z dari tahun lain
    cv_m1, cv_nol = {}, {}
    for held in tahun:
        prm, z = lipat[held]
        cv_m1 = gabung(cv_m1, blok_dari_prediksi(dunia, skala_vm(dunia.vmax_semua(prm), prm["b"], z), prm["Vth"], held))
        p0 = lipat0[held]
        cv_nol = gabung(cv_nol, blok_dari_prediksi(dunia, dunia.vmax_semua(p0), p0["Vth"], held))
    hujan_fitur = [[h[k][s[3].isoformat()] for s in dunia.seri[i]] for i, (k, _, _) in enumerate(kecs)]
    pb = pembanding_cv(dunia, tahun)
    pb["m0_beku_dalam_sampel"] = m0_beku(dunia, hujan_fitur)
    terbaik = max(pb, key=lambda n: ringkas(pb[n])["ets"] or -9)
    pb["m1_tanpa_suku_dasar"] = cv_nol
    for v in pb.values():
        for k in cv_m1:
            v.setdefault(k, [0, 0, 0, 0])
    cv = {"M1": ringkas(cv_m1), **{n: ringkas(b) for n, b in pb.items()}}
    selisih, per_tahun = {}, {}
    for n in pb:
        t, ci = pemicu.bootstrap_selisih(cv_m1, pb[n])
        selisih[n] = {"selisih_ets": t, "ci95": ci}
    for th in tahun:
        sub = lambda bl: {k: v for k, v in bl.items() if k[1] == th}
        per_tahun[th] = {"M1": ringkas(sub(cv_m1)), **{n: ringkas(sub(b)) for n, b in pb.items()}, "selisih": {}}
        for n in pb:
            t, ci = pemicu.bootstrap_selisih(sub(cv_m1), sub(pb[n]))
            per_tahun[th]["selisih"][n] = {"selisih_ets": t, "ci95": ci}
    c3 = pemicu.grid_m3([{"d": mm, "m1": m1, "m3": m3} for v in h.values() for (mm, m1, m3) in v.values() if mm > 0])
    param = {
        "versi": VERSI, "dibuat": dt.datetime.now(WIB).isoformat(timespec="seconds"),
        "parameter_bebas": {"jumlah": 6, "nama": ["S", "Kd", "gamma", "kappa", "b", "Vth"]},
        "suku_dasar": "Vth_k = Vth*exp(-b*z_k); z_k = logit(p_k)-logit(p_kota), p_k=(pos_k+M*p_kota)/(n_k+M); frekuensi dari tahun latih lipatan saja",
        "tetap": {"m_prior_hari": M_PRIOR, "paruh_pc_jam": PARUH_PC, "phi": PHI, "pc_basah_mm": PC_BASAH, "ambang_pasang": AMBANG_PASANG, "puncak_jam": PUNCAK_JAM},
        "anggota": anggota, "c3": [round(x, 5) for x in c3], "skala_pasang": [round(x, 6) for x in skala],
        "kandidat": {"n": N_KANDIDAT, "benih": 20261028, "rentang": RANGE, "grid_vth": GRID_VTH},
        "latih": {"tahun": list(TAHUN), "baris_berlabel": len(baris_berlabel(dunia)), "positif": sum(r[4] for r in baris_berlabel(dunia)),
                  "ref_proporsi_b3": round(ref, 5), "ref_proporsi_b3_tepat": ref, "n_musim": {str(k): (None if v == math.inf else v) for k, v in sorted(nm.items())},
                  "n_musim_catatan": "null = tak hingga: proporsi (a) saja melebihi acuan, label musim itu hanya (a)", "musim_hanya_a": tak, "tafsir_sha256": TAFSIR_SHA256, **info},
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
                        rs = [kasus({**a, "Vth": vth_kec(a, k)}, f[0][k], f[1][k], d, m1, tinggi, basah, m3) for a, f in zip(ang, fs)]
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
        "model": {"definisi": "tangki per kecamatan: limpasan SCS-CN, keluaran drainase Kd x f_kec, pasang tinggi menahan keluaran kecamatan pesisir, ambang Vth geser per kecamatan oleh logit frekuensi tergenang (suku dasar)",
                  "parameter_bebas": param["parameter_bebas"], "tetap": param["tetap"], "anggota": [{k: v for k, v in a.items() if k != "z"} for a in ang], "label": "laporan PetaBencana dinormalkan per musim (KRITERIA-M1 + tafsir)",
                  "latih": param["latih"], "cv": param["cv"]},
        "uji_prospektif": {"kriteria_sha256": KRITERIA_SHA256, "sidik": sd, "sha256_parameter": sha_param(param), "sha256_kode": sha_berkas(KODE),
                           "tafsir_sha256": TAFSIR_SHA256, "tanggal_beku": None, "status": "belum dibekukan", "jendela": "dari tanggal beku sampai 2027-04-30, hanya November-April"},
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
    tafsir_ok()
    ada = baca(BEKU)
    if ada and ada.get("beku"):
        sys.exit(f"sudah dibekukan {ada['beku'][0]['tanggal_beku']} (sidik {ada['beku'][0]['sidik'][:12]}); pembekuan hanya sekali, versi baru = berkas baru")
    p, k = baca(PARAM), baca(KELUAR)
    if not p or not k:
        sys.exit("jalankan `tangki.py latih` dulu")
    if k["uji_prospektif"]["sha256_parameter"] != sha_param(p) or k["uji_prospektif"]["sha256_kode"] != sha_berkas(KODE):
        sys.exit("keluaran tidak cocok dengan kode/parameter sekarang: jalankan `tangki.py latih` ulang sebelum membekukan")
    rec = {"sidik": sidik(p), "sha256_kode": sha_berkas(KODE), "sha256_parameter": sha_param(p), "kriteria_sha256": KRITERIA_SHA256,
           "tafsir_sha256": TAFSIR_SHA256, "tanggal_beku": sekarang().isoformat(timespec="seconds"), "versi": VERSI,
           "sha256_m0": sha_berkas(M0),
           "sha256_berkas": {os.path.relpath(j, AKAR): sha_berkas(j) for j in SIDIK_BERKAS}}
    simpan(BEKU, {"beku": [rec]})
    k["uji_prospektif"].update(sidik=rec["sidik"], tanggal_beku=rec["tanggal_beku"], status="berjalan")
    simpan(KELUAR, k)
    print("beku", rec["sidik"])


# ------------------------------------------------------------------ prakira
def baca_jsonl(jalur):
    return [json.loads(b) for b in open(jalur, encoding="utf-8") if b.strip()] if os.path.exists(jalur) else []


def m0_ok():
    """M0 (kecamatan_pemicu.json, pembanding b) harus sama dengan saat beku; penilai menolak bila berbeda."""
    b = baca(BEKU)["beku"][0]
    if b.get("sha256_m0") != sha_berkas(M0):
        sys.exit("kecamatan_pemicu.json (M0) berbeda dari saat beku: pembanding (b) tidak sah, penilaian ditolak")


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
                vk = vth_kec(a, k)
                ya = vmax > vk
                hp = max(range(24), key=lambda i: tr[i]) if ya else 0
                hasil[k].append((ya, vmax, (vmax - vk) / 10 / PHI if ya else 0.0, surut(tr, hp, vk) if ya else 0))
                keadaan[ai][k] = [V2, Pc2]
    if hasil is None or prev != tgl:
        return None
    return {k: {"ya": v[-1][0], "p": round(sum(1 for x in v if x[0]) / len(v), 2), "v_mm": round(v[-1][1], 1),
                "dalam_cm": [round(min(x[2] for x in v if x[0])), round(max(x[2] for x in v if x[0]))] if any(x[0] for x in v) else [0, 0],
                "surut_jam": [min(x[3] for x in v if x[0]), max(x[3] for x in v if x[0])] if any(x[0] for x in v) else [0, 0]}
            for k, v in hasil.items()}


def hujan_prakiraan(tgls, ambil=ambil_json):
    """Hujan prakiraan per jam Open-Meteo forecast (ECMWF IFS, zona Asia/Bangkok = WIB) di pusat 42 kecamatan -> {tanggal_iso: {kunci: {mm,m1,m3,h}}}.
    Fitur sama bentuknya dengan m1_hujan.jsonl (mm/m1/m3 hari WIB). Jam tak lengkap = galat (tidak menebak)."""
    kecs = kec_daratan()
    q = {"latitude": ",".join(str(round(la, 4)) for _, la, _ in kecs), "longitude": ",".join(str(round(lo, 4)) for _, _, lo in kecs),
         "hourly": "precipitation", "models": "ecmwf_ifs", "timezone": "Asia/Bangkok",
         "start_date": min(tgls).isoformat(), "end_date": max(tgls).isoformat()}
    d = ambil(OPENMETEO + "?" + urllib.parse.urlencode(q, safe=","))
    d = d if isinstance(d, list) else [d]
    if len(d) != len(kecs):
        sys.exit(f"Open-Meteo memberi {len(d)} titik, diminta {len(kecs)}")
    out = {t.isoformat(): {} for t in tgls}
    for (k, _, _), x in zip(kecs, d):
        for t in tgls:
            v = [m for w, m in zip(x["hourly"]["time"], x["hourly"]["precipitation"]) if w[:10] == t.isoformat()]
            if len(v) != 24:
                sys.exit(f"{k} {t}: {len(v)} jam prakiraan, perlu 24")
            out[t.isoformat()][k] = {"mm": round(sum(a or 0 for a in v), 1), "m1": round(max(a or 0 for a in v), 1),
                                     "m3": m1_kumpul.maks_n(v, 3), "h": sum(a is None for a in v)}
    return out


def tolak_jendela(pesan):
    print(pesan, file=sys.stderr)
    raise SystemExit(KELUAR_JENDELA)


def prakira(tanggal=None, kering=False, versi="teramati", ambil=ambil_json):
    kriteria_ok()
    tafsir_ok()
    p = periksa_beku()
    rows = sorted(baca_jsonl(HUJAN_OP), key=lambda r: r["tanggal"])
    if versi == "teramati" and not rows:
        sys.exit("m1_hujan.jsonl kosong")
    if versi not in ("teramati", "prakiraan"):
        sys.exit("versi harus teramati atau prakiraan")
    tgl = dt.date.fromisoformat(tanggal) if tanggal else (dt.date.fromisoformat(rows[-1]["tanggal"]) if versi == "teramati" else sekarang().date() + dt.timedelta(days=1))
    beku = dt.datetime.fromisoformat(baca(BEKU)["beku"][0]["tanggal_beku"]).date()
    if tgl < beku:
        tolak_jendela(f"{tgl}: sebelum tanggal beku {beku}, ditolak (jendela uji dimulai saat beku)")
    if tgl.month not in MUSIM or tgl > JENDELA_AKHIR:
        tolak_jendela(f"{tgl}: di luar jendela uji (hanya November-April, sampai {JENDELA_AKHIR}), ditolak")
    if any(r["tanggal"] == tgl.isoformat() for r in baca_jsonl(LABEL_OP)):
        sys.exit(f"{tgl}: label hari itu sudah ada; prakiraan harus mendahului label, ditolak")
    if versi == "prakiraan" and sekarang() >= dt.datetime.combine(tgl, dt.time(0), WIB):
        sys.exit(f"{tgl}: prakiraan harus ditulis sebelum 00.00 WIB hari itu (sekarang {sekarang().isoformat(timespec='minutes')}), ditolak")
    if any(r["tanggal"] == tgl.isoformat() and r.get("versi") == versi for r in baca_jsonl(PRAKIRAAN)):
        print(f"{tgl}: {versi} sudah ada (append-only, tidak ditimpa)")
        return
    extra = {}
    if versi == "teramati":
        ada = next((r for r in rows if r["tanggal"] == tgl.isoformat()), None)
        if not ada or ada.get("dikeluarkan"):
            sys.exit(f"{tgl}: tidak ada hujan teramati yang sah di m1_hujan.jsonl")
        # D-1 belum punya baris hujan: tunda (kode 3, tanpa menulis) sampai umur D-1 >= 4 hari; sesudah itu reset kering sah, ditandai d1_hilang
        kemarin = tgl - dt.timedelta(days=1)
        d1_hilang = kemarin >= beku and not any(r["tanggal"] == kemarin.isoformat() for r in rows)
        if d1_hilang and (sekarang().date() - kemarin).days < 4:
            tolak_jendela(f"{tgl}: baris hujan {kemarin} belum ada (umur < 4 hari), prakiraan teramati ditunda")
        extra = {"d1_hilang": d1_hilang} if d1_hilang else {}
    else:
        # hari sebelumnya belum punya baris hujan teramati saat 23.30 WIB: diisi prakiraan yang sama (tanpa itu keadaan tanah direset kering)
        kemarin = tgl - dt.timedelta(days=1)
        perlu = [tgl] + ([kemarin] if not any(r["tanggal"] == kemarin.isoformat() for r in rows) else [])
        hp = hujan_prakiraan(perlu, ambil)
        rows = sorted([r for r in rows if r["tanggal"] <= kemarin.isoformat()]
                      + [{"tanggal": t, "dikeluarkan": False, "kec": v} for t, v in hp.items()], key=lambda r: r["tanggal"])
        extra = {"sumber_hujan": "open-meteo forecast ecmwf_ifs, titik pusat kecamatan", "d1_dari_prakiraan": kemarin in perlu,
                 "hujan": {k: [v["mm"], v["m1"], v["m3"]] for k, v in hp[tgl.isoformat()].items()}}
    kec = prakira_baris(p, rows, tgl)
    if kec is None:
        sys.exit(f"{tgl}: replay tidak berakhir di tanggal itu")
    r = {"tanggal": tgl.isoformat(), "versi": versi, "label": LABEL, "sidik": baca(BEKU)["beku"][0]["sidik"],
         "kriteria_sha256": KRITERIA_SHA256, "tafsir_sha256": TAFSIR_SHA256, "dibuat": sekarang().isoformat(timespec="seconds"), **extra, "kec": kec}
    if kering:
        print(json.dumps(r, ensure_ascii=False)[:600])
        return
    os.makedirs(DIR, exist_ok=True)
    for j in (PRAKIRAAN, BEKU):
        m1_kumpul.pastikan_tak_menyusut(j)
    with open(PRAKIRAAN, "a", encoding="utf-8") as f:
        f.write(json.dumps(r, ensure_ascii=False, separators=(",", ":")) + "\n")
    print(f"prakira {versi} {tgl}: {sum(1 for v in kec.values() if v['ya'])} dari {len(kec)} kecamatan genangan")


# ------------------------------------------------------------------ self-check
def uji():
    global DIR, PARAM, BEKU, HUJAN_OP, LABEL_OP, PRAKIRAAN, KELUAR, SIDIK_BERKAS, JAM_UJI
    kriteria_ok()
    tafsir_ok()
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
    # tafsir: acuan HANYA dari aturan (b); (a) yang melebihi acuan -> n_musim tak hingga dan dicatat; (a) di bawah acuan tak mengubah acuan
    nm, ref, tak = normalkan(baris + [(2024, 0, 12)] * 10 + [(2024, 0, 0)] * 90 + [(2025, 0, 12)] * 3 + [(2025, 5, 0)] * 6 + [(2025, 0, 0)] * 91)
    assert abs(ref - 0.05) < 1e-9 and nm[2024] == math.inf and tak == [2024] and nm[2025] == 6, (nm, ref, tak)
    # 5b. suku dasar tanpa kebocoran tahun yang dilepas: ubah label tahun 2020 -> z lipatan 'lepas 2020' tidak berubah, z lain berubah
    dn = Dunia([("A|a", 0, 0), ("B|b", 0, 0)], [], set(), {})
    def mk(y2020):
        rw = lambda kec, y, th: (th * 1000 + kec, 5.0, None, dt.date(th, 12, 1), y, th)
        return Dunia(dn.kecs, [[rw(0, 1 if th < 2022 else 0, th) for th in range(2017, 2024)] * 30 + [rw(0, y2020, 2020)] * 30,
                               [rw(1, 0, th) for th in range(2017, 2024)] * 30], set(), {})
    z1, z2 = hitung_z(mk(0), [t for t in range(2017, 2024) if t != 2020]), hitung_z(mk(1), [t for t in range(2017, 2024) if t != 2020])
    assert z1 == z2 and z1[0] > 0 > z1[1], (z1, z2)
    assert hitung_z(mk(0), list(range(2017, 2024))) != hitung_z(mk(1), list(range(2017, 2024)))
    assert abs(sum(z for z in hitung_z(mk(0), [2017])) ) < 5 and skala_vm([[2.0]], 0.0, [1.0]) == [[2.0]]
    assert abs(vth_kec({"Vth": 4.0, "b": 0.5, "z": {"A": 2.0}}, "A") - 4.0 * math.exp(-1.0)) < 1e-12 and vth_kec({"Vth": 4.0}, "A") == 4.0
    # 6a. sidik memuat SEMUA berkas daftar (H1): ubah satu byte di berkas mana pun = sidik lain
    nama = {os.path.basename(j) for j in SIDIK_BERKAS}
    assert len(SIDIK_BERKAS) == 12 and all(os.path.exists(j) for j in SIDIK_BERKAS) and {"m1_nilai.py", "m1_kumpul.py", "pasang_astro.py", "saluran_kec.json", "31.json"} <= nama, nama
    pp = {"a": 1}
    asli_sb = SIDIK_BERKAS
    tmp0 = tempfile.mkdtemp()
    try:
        SIDIK_BERKAS = []
        for i, j in enumerate(asli_sb):
            c = os.path.join(tmp0, f"{i}.txt")
            open(c, "w").write(f"isi {i}")
            SIDIK_BERKAS.append(c)
        s0 = sidik(pp)
        for c in SIDIK_BERKAS:
            open(c, "a").write("x")
            s1 = sidik(pp)
            assert s1 != s0, c
            s0 = s1
    finally:
        SIDIK_BERKAS = asli_sb
    # 6. pembekuan sekali, penjaga prakiraan: sebelum beku, tanggal < beku, di luar Nov-Apr, sesudah label, 00.00 WIB, arsip menyusut
    asli = (DIR, PARAM, BEKU, HUJAN_OP, LABEL_OP, PRAKIRAAN, KELUAR)
    tmp = tempfile.mkdtemp()
    wib = lambda s: dt.datetime.fromisoformat(s).replace(tzinfo=WIB)
    asli_pt = m1_kumpul.pastikan_tak_menyusut
    dipanggil = []
    m1_kumpul.pastikan_tak_menyusut = lambda j: dipanggil.append(j)
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

        def tolak(kata, kode=None, **kw):
            try:
                prakira(**kw)
            except SystemExit as ex:
                assert ex.code == kode if kode else kata in str(ex.code), (kata, ex.code, kw)
            else:
                raise AssertionError("harus ditolak: " + kata)
        JAM_UJI = wib("2026-11-10T10:00:00")
        tolak("belum dibekukan", tanggal="2026-11-12")
        bekukan()
        try:
            bekukan()
        except SystemExit as ex:
            assert "sudah dibekukan" in str(ex)
        else:
            raise AssertionError("bekukan kedua harus ditolak")
        assert baca(KELUAR)["uji_prospektif"]["status"] == "berjalan" and baca(BEKU)["beku"][0]["tanggal_beku"].startswith("2026-11-10")
        assert set(baca(BEKU)["beku"][0]["sha256_berkas"]) == {os.path.relpath(j, AKAR) for j in SIDIK_BERKAS}
        with open(HUJAN_OP, "w") as f:
            for d, mm in (("2026-11-11", 0.0), ("2026-11-12", 60.0), ("2026-11-13", 90.0)):
                f.write(json.dumps({"tanggal": d, "dikeluarkan": False, "kec": {k: {"mm": mm, "m1": mm / 3, "m3": mm * 0.6, "h": 0} for k in kunci}}) + "\n")
        for t in ("2026-11-05", "2026-10-30", "2027-05-02", "2027-11-20"):      # < beku; Oktober; Mei; sesudah 30 Apr 2027
            tolak("jendela", KELUAR_JENDELA, tanggal=t)
            tolak("jendela", KELUAR_JENDELA, tanggal=t, versi="prakiraan")
        # prakiraan: palsu Open-Meteo, 2 hari (hari sebelumnya belum punya hujan teramati -> diisi prakiraan)
        def palsu(url):
            q = urllib.parse.parse_qs(urllib.parse.urlparse(url).query)
            a0, a1 = dt.date.fromisoformat(q["start_date"][0]), dt.date.fromisoformat(q["end_date"][0])
            n = len(q["latitude"][0].split(","))
            assert q["models"] == ["ecmwf_ifs"] and q["timezone"] == ["Asia/Bangkok"] and n == 42
            w = [f"{a0 + dt.timedelta(days=i // 24)}T{i % 24:02d}:00" for i in range((a1 - a0).days * 24 + 24)]
            return [{"hourly": {"time": w, "precipitation": [2.0] * len(w)}} for _ in range(n)]
        JAM_UJI = wib("2026-11-12T23:30:00")
        prakira("2026-11-13", versi="prakiraan", ambil=palsu)
        prakira("2026-11-13", versi="prakiraan", ambil=palsu)       # kedua: sudah ada, tidak ditimpa
        rr = baca_jsonl(PRAKIRAAN)
        assert len(rr) == 1 and rr[0]["versi"] == "prakiraan" and rr[0]["dibuat"].startswith("2026-11-12T23:30") and not rr[0]["d1_dari_prakiraan"], rr
        assert rr[0]["hujan"][kunci[0]] == [48.0, 2.0, 6.0] and PRAKIRAAN in dipanggil and BEKU in dipanggil, dipanggil
        JAM_UJI = wib("2026-11-14T00:00:00")
        tolak("00.00 WIB", tanggal="2026-11-14", versi="prakiraan", ambil=palsu)       # tepat tengah malam hari D = terlambat
        JAM_UJI = wib("2026-11-13T23:30:00")
        prakira("2026-11-15", versi="prakiraan", ambil=palsu)     # 11-14 belum ada di m1_hujan.jsonl -> d1 dari prakiraan
        assert baca_jsonl(PRAKIRAAN)[-1]["d1_dari_prakiraan"] and len(baca_jsonl(PRAKIRAAN)[-1]["kec"]) == 42
        m0_ok()                                                       # sha M0 sama dengan saat beku
        b0 = baca(BEKU)
        assert b0["beku"][0]["sha256_m0"] == sha_berkas(M0)
        b0["beku"][0]["sha256_m0"] = "0" * 64
        simpan(BEKU, b0)
        try:
            m0_ok()
        except SystemExit as ex:
            assert "M0" in str(ex.code)
        else:
            raise AssertionError("M0 berubah harus ditolak")
        b0["beku"][0]["sha256_m0"] = sha_berkas(M0)
        simpan(BEKU, b0)
        # teramati
        JAM_UJI = wib("2026-11-14T05:00:00")
        prakira("2026-11-12")
        prakira("2026-11-13")
        prakira("2026-11-13")
        rr = baca_jsonl(PRAKIRAAN)
        assert [(r["tanggal"], r["versi"]) for r in rr] == [("2026-11-13", "prakiraan"), ("2026-11-15", "prakiraan"), ("2026-11-12", "teramati"), ("2026-11-13", "teramati")], rr
        assert any(v["ya"] for v in rr[2]["kec"].values()), "60 mm hari kedua harus menggenangi sebagian kecamatan"
        assert "d1_hilang" not in rr[2] and "d1_hilang" not in rr[3]      # D-1 ada
        # D-1 hilang: 11-16 punya hujan, 11-15 tidak. Umur D-1 2 hari -> tunda kode 3 tanpa menulis; umur 5 hari -> sah, d1_hilang
        with open(HUJAN_OP, "a") as f:
            f.write(json.dumps({"tanggal": "2026-11-16", "dikeluarkan": False, "kec": {k: {"mm": 30.0, "m1": 10.0, "m3": 20.0, "h": 0} for k in kunci}}) + "\n")
        JAM_UJI = wib("2026-11-17T05:00:00")
        n0 = len(baca_jsonl(PRAKIRAAN))
        tolak("tunda", KELUAR_JENDELA, tanggal="2026-11-16")
        assert len(baca_jsonl(PRAKIRAAN)) == n0
        JAM_UJI = wib("2026-11-20T05:00:00")
        prakira("2026-11-16")
        assert baca_jsonl(PRAKIRAAN)[-1]["d1_hilang"] is True and len(baca_jsonl(PRAKIRAAN)) == n0 + 1
        with open(LABEL_OP, "w") as f:
            f.write(json.dumps({"tanggal": "2026-11-13", "pb": {"kec": {}}}) + "\n")
        tolak("label", tanggal="2026-11-13")
        tolak("label", tanggal="2026-11-13", versi="prakiraan", ambil=palsu)
        # kode berubah sesudah beku -> prakiraan menolak
        b = baca(BEKU)
        b["beku"][0]["sidik"] = "0" * 64
        simpan(BEKU, b)
        tolak("berubah", tanggal="2026-11-12", kering=True)
    finally:
        DIR, PARAM, BEKU, HUJAN_OP, LABEL_OP, PRAKIRAAN, KELUAR = asli
        JAM_UJI = None
        m1_kumpul.pastikan_tak_menyusut = asli_pt
    # 7. berkas nyata (bila ada)
    if os.path.exists(KELUAR):
        d = baca(KELUAR)
        assert os.path.getsize(KELUAR) < 300_000, os.path.getsize(KELUAR)
        assert len(d["kec"]) == 42 and d["label"] == LABEL and d["uji_prospektif"]["kriteria_sha256"] == KRITERIA_SHA256
        assert d["uji_prospektif"]["tafsir_sha256"] == TAFSIR_SHA256
        p = baca(PARAM)
        assert p["latih"]["tahun"][1] <= 2023 and d["uji_prospektif"]["sha256_parameter"] == sha_param(p)
        n = len(GRID_D) * len(GRID_M1) * 4
        for k, v in d["kec"].items():
            assert len(v["p"]) == n and all(x is None or 0 <= x <= 1 for x in v["p"])
        b = baca(BEKU)
        if b and b.get("beku"):
            assert b["beku"][0]["sidik"] == sidik(p), "sidik beku != kode/parameter sekarang"
    print("ok")


def opsi(a, nama):
    return a[a.index(nama) + 1] if nama in a else None


if __name__ == "__main__":
    a = sys.argv[1:] or ["uji"]
    if a[0] == "prakira":
        prakira(opsi(a, "--tanggal"), "--kering" in a, opsi(a, "--versi") or "teramati")
    else:
        {"latih": latih, "bekukan": bekukan, "uji": uji}.get(a[0], uji)()
