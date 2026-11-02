"""Model BAYANGAN /prediksi: pemenang lab adu model (2 Nov 2026) dipasang berdampingan dengan model lama, dinilai prospektif
harian di nilai.py, TIDAK mengganti apa pun dan TIDAK tampil di kartu Besok. Model lama diganti hanya bila bayangan menang di data baru.

Kode arsip (dasar.KODE_B): BNJ_B banjir (logit 7 faktor), LSR_B longsor (logit 32 fitur), CEX_B cuaca ekstrem (logit + koefisien kab,
kejadian berjeda), KRH_B karhutla (>= 5 titik VIIRS S-NPP n/h per kab-hari, logit ramping). Satu baris arsip per kode per hari terbit,
kolom ["p"] (CEX_B: ["p", "jeda"]), tenggang +1..+3. Tabel koefisien/kuantil ada di bnj|lsr|cex|krh.json di folder ini (disalin dari
lab, dirampingkan; skrip ekspornya di ekspor/). Definisi fitur = skrip lab persis; selisihnya sengaja ditulis di sini:

 1. HUJAN. Lab: CHIRPS per kab (final, terlambat berminggu). Operasi: total harian Open-Meteo di titik pusat kab (catat.py, riwayat
    di public/prediksi/data/bayangan/hujan_harian.json) + prakiraan t+1..t+3 dari baris HJN hari itu. Persentil dihitung terhadap
    kuantil CHIRPS lab karena klimatologi Open-Meteo per kab belum ada: SUMBER HUJAN BEDA DENGAN LATIH (ditandai di Rapor). Jendela
    yang berakhir di hari sasaran memuat hari prakiraan (nowcast lab dipakai dengan hujan prakiraan, skor lab tenggang lebih rendah).
 2. MAKS SEL. Lab memakai hujan maks sel CHIRPS (m*, mx3); Open-Meteo titik hanya satu nilai. Pengganti: m = r x rasio_m kab (rasio
    jumlah maks/rerata hari basah di latih), ditandai proksi.
 3. KEJADIAN (CEX_B). Fitur berjeda J = 7 hari di lab. DIBI terisi susulan: label dianggap lengkap hanya sampai (DIBI sampai - 14 hari),
    jadi J efektif = max(7, hari sasaran - batas itu) dan ditulis di kolom "jeda". tc365 dihitung dari DIBI yang ada (1 tahun) dan
    diskalakan 365/hari tercakup. Pelaporan tahun lalu = tabel lab 2025: hanya berlaku untuk hari sasaran di 2026 (selain itu dilewati).
 4. KRH_B. Lab tidak menyimpan intersep model h0 dan fitur 90 hari/KBDI/ONI tidak ada di operasi, jadi model ramping dilatih ulang di lab
    dengan protokol sama (latih 2015-2019, C dipilih di val, UJI 2023-2025), satu model per tenggang (hotspot berakhir t-1).
Masukan yang tidak lengkap (riwayat hujan kurang, DIBI/hotspot hilang) = kab/tenggang itu dilewati dan dicatat, tidak dikarang.

Pakai:  python3 scripts/prediksi/bayangan/model.py uji      (tanpa jaringan; cocokkan fitur dengan skrip lab)
        python3 scripts/prediksi/bayangan/model.py semai   (butuh jaringan: isi riwayat hujan 95 hari lewat Open-Meteo, hemat kuota)
"""
import bisect, datetime as dt, json, math, os, re, sys

SINI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.dirname(SINI))
import dasar as D

D0 = dt.date(2008, 1, 1).toordinal()
HIST_MIN = {"BNJ_B": 30, "LSR_B": 60, "CEX_B": 90, "KRH_B": 30}   # hari riwayat hujan (sampai hari sasaran) yang dibutuhkan
TAHUN_LAP = 2025                                                    # tabel pelaporan "tahun lalu" lab; sah untuk sasaran 2026
CEX_RE = re.compile(r"cuaca ekstrem|angin|puting")                  # jenis DIBI yang sama dengan label lab (bangun.py)
MARGIN = 14                                                         # sama dengan nilai.MARGIN_DIBI
INFO = {
    "BNJ_B": {"nama": "Banjir", "lama": "BNJ", "metode": "logit 7 faktor: persentil hujan kab 1/3/14/30 hari, pola kab x bulan, pelaporan tahun lalu, InaRISK",
              "uji_lab": "AP uji 0,042 vs klimatologi 0,024 dan aturan 40 mm 0,028 (CI95 di atas nol); alarm meleset 97%"},
    "LSR_B": {"nama": "Longsor", "lama": "LSR", "metode": "logit 32 fitur: pola kab x bulan, pelaporan tahun lalu, hujan 1-60 hari dan persentil, kerentanan, jarak sesar",
              "uji_lab": "AP uji 0,050 vs klimatologi 0,031 dan aturan hujan 0,009; alarm meleset 97%"},
    "CEX_B": {"nama": "Cuaca ekstrem", "lama": None, "metode": "logit + koefisien kab; sebagian besar skill dari pelaporan dan kejadian lalu, bukan fisika badai",
              "uji_lab": "AP uji 0,054 vs klimatologi 0,030 dan hujan 50 mm 0,009 (jeda 7 hari); alarm meleset 94%"},
    "KRH_B": {"nama": "Karhutla (>= 5 titik VIIRS)", "lama": None, "metode": "logit ramping: hujan 1-30 hari, hari tanpa hujan, titik panas S-NPP 1-30 hari, pola kab x bulan",
              "uji_lab": "AP uji 0,57 s.d. 0,59 vs klimatologi 0,39 dan persistensi 0,44 s.d. 0,46 (tenggang 1 s.d. 3)"},
}
CATATAN = ("Model bayangan dari lab adu model 2 Nov 2026 (latih 2008-2019, uji 2023 s.d. Mar 2026), dibekukan sebelum kejadian dan dinilai "
           "dengan label dan aturan yang sama dengan model lama. Sumber hujan beda dengan latih (Open-Meteo titik pusat vs CHIRPS rerata kab; "
           "persentil memakai kuantil CHIRPS), maks sel diganti proksi, peluang mentah (belum dikalibrasi). KRH_B dilatih ulang ramping (tanpa fitur 90 hari/KBDI/ONI) dan belum diverifikasi independen. Tidak mengganti model lama.")
_cache = {}


def tabel(nama):
    if nama not in _cache:
        _cache[nama] = json.load(open(os.path.join(SINI, nama + ".json")))
    return _cache[nama]


# ---------- dasar ----------
def pct(q, x, sisi):
    """Persentil x terhadap 41 kuantil (0..1 per 1/40). 'left' = bagian < x (banjir), 'right' = bagian <= x (lainnya), seperti searchsorted lab."""
    n = (bisect.bisect_left if sisi == "left" else bisect.bisect_right)(q, x)
    if n == 0:
        return 0.0
    if n >= len(q):
        return 1.0
    return (n - 1 + (x - q[n - 1]) / (q[n] - q[n - 1])) / (len(q) - 1)


def sigmoid(z):
    return 1 / (1 + math.exp(-max(-30.0, min(30.0, z))))


def logit(p):
    p = min(max(p, 1e-5), 1 - 1e-5)
    return math.log(p / (1 - p))


def jumlah(a, w):
    return sum(a[-w:])


def hari_ke_tgl(o):
    return dt.date.fromordinal(o)


# ---------- BNJ_B ----------
def z_bnj(T, k, r, bulan):
    t = T["kab"][k]
    q = t["q"]
    x = {"p_r1": pct(q["r1"], r[-1], "left"), "p_r3": pct(q["r3"], jumlah(r, 3), "left"), "p_r14": pct(q["r14"], jumlah(r, 14), "left"),
         "p_r30": pct(q["r30"], jumlah(r, 30), "left"), "klim_kabbulan": t["klim"][bulan - 1], "pel_logn": t["pel_2025"],
         "s_inarisk_rerata": t["inarisk"] or 0.0}
    return T["b0"] + sum(T["koef"][n] * v for n, v in x.items()), x


# ---------- LSR_B ----------
STAT = ["S_rerata", "S_maks", "Spv_rerata", "lereng_rerata", "lereng_maks", "sesar_min_km", "bagian_S_tinggi", "log_n_kec"]


def z_lsr(T, k, r, m, bulan):
    t = T["kab"][k]
    q = t["q"]
    x = {}
    for w in (1, 3, 7, 14, 30):
        x[f"r{w}"] = jumlah(r, w)
        x[f"p{w}"] = pct(q[f"r{w}"], x[f"r{w}"], "right")
    for w in (1, 3, 7):
        x[f"m{w}"] = jumlah(m, w)
    x["pm1"], x["pm3"] = pct(q["m1"], x["m1"], "right"), pct(q["m3"], x["m3"], "right")
    a = 0.0
    for v in r:
        a = 0.9 * a + v
    x["api"], x["papi"] = a, pct(q["api"], a, "right")
    x["ante"], x["ante60"] = x["r30"] - x["r7"], jumlah(r, 60) - x["r30"]
    x["sin"], x["cos"] = math.sin(2 * math.pi * bulan / 12), math.cos(2 * math.pi * bulan / 12)
    x["lclim"], x["lkab"], x["lap_prev"] = t["lclim"][bulan - 1], t["lkab"], t["lap_prev_2025"]
    for n, v in zip(STAT, t["st"]):
        x["st_" + n] = v
    K = T["koef"]
    z = K["b0"]
    for n, w, mu, sd in zip(K["fitur"], K["w"], K["mu"], K["sd"]):
        z += w * ((mu if x[n] is None else x[n]) - mu) / sd
    return z, x


# ---------- CEX_B ----------
class Kejadian:
    """Hari kejadian per kab (ordinal). prov = 2 digit pertama id. `sampai` = hari terakhir label dianggap lengkap."""

    def __init__(self, per_kab, sampai, dari):
        self.k = {i: sorted(set(v)) for i, v in per_kab.items()}
        self.sampai, self.dari = sampai, dari
        self.prov, self.nas = {}, {}
        for i, v in self.k.items():
            for d in v:
                self.prov.setdefault(i[:2], []).append(d)
                self.nas[d] = self.nas.get(d, 0) + 1
        self.prov = {p: sorted(v) for p, v in self.prov.items()}

    @staticmethod
    def _n(lst, a, b):
        return bisect.bisect_right(lst, b) - bisect.bisect_left(lst, a)

    def hitung(self, i, a, b):
        return self._n(self.k.get(i, []), a, b)

    def hitung_prov(self, p, a, b):
        return self._n(self.prov.get(p, []), a, b)

    def hitung_nas(self, a, b):
        return sum(n for d, n in self.nas.items() if a <= d <= b)

    def terakhir(self, i, b):
        v = self.k.get(i, [])
        j = bisect.bisect_right(v, b)
        return v[j - 1] if j else None


def z_cex(T, k, r, m, h, ev, jeda):
    """h = ordinal hari sasaran; r, m berakhir di h; ev = Kejadian; jeda = J (hari). -> (z, fitur)."""
    t = T["kab"][k]
    q = t["q"]
    bulan = hari_ke_tgl(h).month
    s7, s30 = jumlah(r, 7), jumlah(r, 30)
    kering = 0
    for v in r:
        kering = min(kering + 1, 90) if v < 1 else 0
    ph = ((h - D0) % 365.25) / 365.25 * 2 * math.pi
    tc365 = ev.hitung(k, h - 394, h - 30)
    a0 = max(h - 394, ev.dari)
    if a0 > h - 30 or ev.sampai < h - 30:
        raise ValueError("riwayat kejadian tak cukup")
    tc365 *= 365 / (h - 30 - a0 + 1)
    ter = ev.terakhir(k, h - jeda)
    sejak = min(h - ter - (jeda - 1), 999) if ter is not None else 999
    x = {"l_m0": math.log1p(m[-1]), "l_r0": math.log1p(r[-1]), "l_s3": math.log1p(jumlah(r, 3)), "l_s7": math.log1p(s7), "l_s30": math.log1p(s30),
         "l_mx3": math.log1p(max(m[-3:])), "cdf_m0": pct(q["m0"], m[-1], "right"), "cdf_s7": pct(q["s7"], s7, "right"),
         "cdf_s30": pct(q["s30"], s30, "right"), "l_kering": math.log1p(kering), "rasio": m[-1] / (r[-1] + 1.0),
         "sin1": math.sin(ph), "cos1": math.cos(ph), "sin2": math.sin(2 * ph), "cos2": math.cos(2 * ph), "lg_klim": logit(t["klim"][bulan - 1]),
         "l_tc": math.log1p(tc365), "l_it": math.log1p(t["it_2025"]), "l_tc90": math.log1p(ev.hitung(k, h - jeda - 89, h - jeda)),
         "l_sejak": math.log1p(sejak), "l_pv3": math.log1p(ev.hitung_prov(k[:2], h - jeda - 2, h - jeda)),
         "l_nat3": math.log1p(ev.hitung_nas(h - jeda - 2, h - jeda))}
    u = (x["l_m0"] - T["mu_u_v"][0]) / T["sd_u_v"][0]
    v = (x["l_s7"] - T["mu_u_v"][1]) / T["sd_u_v"][1]
    return T["b0"] + sum(T["koef"][n] * x[n] for n in T["koef"]) + t["a"] + t["bu"] * u + t["bv"] * v, x


# ---------- KRH_B ----------
def z_krh(T, k, tenggang, r, cnt, h):
    """cnt = {ordinal: titik S-NPP n/h di kab}; hotspot berakhir h - (tenggang+1) = hari lengkap terakhir."""
    M = T["tenggang"][str(tenggang)]
    e = h - (tenggang + 1)
    c = lambda d: cnt[d]
    x = {f"hujan{w}": jumlah(r, w) for w in (1, 3, 7, 14, 30)}
    for nama, ambang in (("cdd1", 1), ("cdd5", 5)):
        n = 0
        for v in reversed(r[-30:]):
            if v >= ambang:
                break
            n += 1
        x[nama] = n
    for w in (1, 3, 7, 14, 30):
        x[f"hs{w}"] = math.log1p(sum(c(d) for d in range(e - w + 1, e + 1)))
    ev = [c(d) >= 5 for d in range(e - 29, e + 1)]
    x["ev7"], x["ev30"] = sum(ev[-7:]), sum(ev)
    x["sejak_ev30"] = next((i for i, v in enumerate(reversed(ev)) if v), 30)
    doy = hari_ke_tgl(h).timetuple().tm_yday
    x["sin"], x["cos"] = math.sin(2 * math.pi * doy / 365.25), math.cos(2 * math.pi * doy / 365.25)
    f = M["fitur"]
    z = M["b0"] + sum(w * (x[n] - mu) / sd for n, w, mu, sd in zip(f, M["w"], M["mu"], M["sd"]))
    return z + M["w"][-1] * logit(T["klim"][k][hari_ke_tgl(h).month - 1]), x


# ---------- entri arsip ----------
def seri(hist, pra, k, t, n, panjang):
    """Total hujan harian kab k untuk panjang hari berakhir t+n: riwayat (<= t) + prakiraan HJN (t+1..t+n). None bila ada hari bolong."""
    out = []
    for i in range(-(panjang - 1 - n), n + 1):
        d = D.geser(t, i)
        if i <= 0:
            v = (hist.get(d) or {}).get(k)
        else:
            row = (pra["kab"].get(k) or [None] * 3)[i - 1]
            v = row[3] if row else None
        if v is None:
            return None
        out.append(v)
    return out


def entri(kode, t, daftar, hist, pra, ev=None, hs=None):
    """-> (entri tanpa t/k/dibuat atau None, catatan). hist {tgl: {id: mm}}, pra baris arsip HJN hari t, ev Kejadian (CEX_B), hs {id: {ordinal: n}} (KRH_B)."""
    hari = [D.geser(t, i) for i in (1, 2, 3)]
    if not pra or pra.get("t") != t or pra.get("hari") != hari:
        return None, "baris HJN hari ini tak ada (prakiraan hujan hilang)"
    if kode != "KRH_B" and {int(x[:4]) for x in hari} != {TAHUN_LAP + 1}:
        return None, f"tabel pelaporan tahun lalu {TAHUN_LAP} hanya sah untuk sasaran {TAHUN_LAP + 1}"
    if (kode == "CEX_B" and ev is None) or (kode == "KRH_B" and hs is None):
        return None, "masukan kejadian DIBI / titik panas tidak ada"
    T = tabel({"BNJ_B": "bnj", "LSR_B": "lsr", "CEX_B": "cex", "KRH_B": "krh"}[kode])
    H = HIST_MIN[kode]
    kab, lewat = {}, 0
    for kb in daftar:
        k = kb["id"]
        if k not in (T["kab"] if "kab" in T else T["klim"]):
            continue
        baris = []
        for n in (1, 2, 3):
            h = dt.date.fromisoformat(hari[n - 1]).toordinal()
            r = seri(hist, pra, k, t, n, H)
            try:
                if r is None:
                    raise KeyError
                bulan = hari_ke_tgl(h).month
                if kode == "BNJ_B":
                    baris.append([round(sigmoid(z_bnj(T, k, r, bulan)[0]), 5)])
                elif kode == "KRH_B":
                    baris.append([round(sigmoid(z_krh(T, k, n, r, hs[k], h)[0]), 5)])
                else:
                    rasio = T["kab"][k]["rasio_m"]
                    m = [v * rasio for v in r]
                    if kode == "LSR_B":
                        baris.append([round(sigmoid(z_lsr(T, k, r, m, bulan)[0]), 5)])
                    else:
                        jeda = max(7, h - ev.sampai)
                        baris.append([round(sigmoid(z_cex(T, k, r, m, h, ev, jeda)[0]), 5), jeda])
            except (KeyError, ValueError, TypeError):
                baris.append(None)
                lewat += 1
        if any(baris):
            kab[k] = baris
    if not kab:
        return None, f"masukan tak lengkap untuk semua kab (butuh riwayat hujan {H} hari" + (", DIBI" if kode == "CEX_B" else ", titik panas 30 hari" if kode == "KRH_B" else "") + ")"
    kol = ["p", "jeda"] if kode == "CEX_B" else ["p"]
    sumber = f"{INFO[kode]['nama']}: {INFO[kode]['metode']}; lab adu model 2 Nov 2026; hujan Open-Meteo titik pusat + persentil CHIRPS (sumber hujan beda dengan latih)"
    return {"sumber": sumber, "kol": kol, "hari": hari, "kab": kab}, f"{len(kab)} kab, {lewat} kab-tenggang dilewati"


# ---------- riwayat hujan ----------
def jalur_riwayat(data=None):
    return os.path.join(data or D.DATA, "bayangan", "hujan_harian.json")


def baca_riwayat(data=None):
    return (D.baca(jalur_riwayat(data), {}) or {}).get("hari", {})


def simpan_riwayat(hujan, t, data=None, simpan_hari=120):
    """hujan = {id: {tanggal: (jam24, sm)}} dari catat.ambil_hujan. Menyimpan total harian tanggal <= t (prakiraan t+1.. TIDAK dimasukkan);
    nilai lebih baru menimpa yang lama (analisis menggantikan prakiraan). Ini cache masukan, bukan arsip beku."""
    hari = baca_riwayat(data)
    for k, h in hujan.items():
        for tgl, (jam, _sm) in h.items():
            v = [x for x in jam if x is not None]
            if tgl <= t and len(v) >= 20:
                hari.setdefault(tgl, {})[k] = round(sum(v), 1)
    batas = D.geser(t, -simpan_hari)
    hari = {d: v for d, v in sorted(hari.items()) if d >= batas}
    D.simpan(jalur_riwayat(data), {"dibuat": t, "sumber": "Open-Meteo total harian titik pusat kab (catat.py); cache masukan model bayangan", "hari": hari})
    return hari


def semai(hari=95):
    """Isi riwayat `hari` hari ke belakang (Archive ERA5 untuk > 5 hari lalu, forecast API untuk 5 hari terakhir). Memakai kuota
    Open-Meteo, jadi hanya mengunduh rentang yang bolong; riwayat sudah lengkap = tidak ada panggilan."""
    import nilai as N
    kini = D.hari_ini()
    daftar = D.kab()
    hist = baca_riwayat()
    bolong = [d for d in (D.geser(kini, -i) for i in range(1, hari + 1)) if len(hist.get(d) or {}) < 0.9 * len(daftar)]
    if not bolong:
        print("semai: riwayat lengkap, tidak mengunduh")
        return
    batas = D.geser(kini, -N.FINAL_HARI)
    for mulai, akhir, final in ((min(bolong), min(batas, kini), True), (max(D.geser(batas, 1), min(bolong)), D.geser(kini, -1), False)):
        if mulai > akhir:
            continue
        for tgl, v in N.unduh_hujan(daftar, mulai, akhir, final).items():
            for k, s in v.items():
                hist.setdefault(tgl, {})[k] = s[0]
    D.simpan(jalur_riwayat(), {"dibuat": kini, "sumber": "semai: ERA5 (Archive) + forecast API", "hari": dict(sorted(hist.items()))})
    print("semai:", len(hist), "hari di riwayat")


# ---------- uji ----------
def tgl_lab(idx):
    return dt.date.fromordinal(D0 + idx)


def uji():
    ROOT = os.path.normpath(os.path.join(SINI, "..", "..", ".."))
    fx = lambda n: json.load(open(os.path.join(ROOT, "tests", "prediksi", "fixture", n + ".json")))
    # pct: kuantil dengan ikatan (banyak nol hujan)
    q = [0.0] * 13 + [float(i) for i in range(1, 29)]
    assert pct(q, 0.0, "left") == 0.0 and abs(pct(q, 0.0, "right") - 12 / 40) < 1e-9 and pct(q, 99, "right") == 1.0 and abs(pct(q, 14.5, "right") - 26.5 / 40) < 1e-9
    maks = {}

    def cocok(nama, a, b, tol):
        maks[nama] = max(maks.get(nama, 0), abs(a - b))
        assert abs(a - b) < tol, f"{nama}: {a} vs lab {b}"
    # BNJ_B
    T = tabel("bnj")
    for f in fx("bnj"):
        z, x = z_bnj(T, f["kab"], f["R"], int(f["tgl"][5:7]))
        for n, v in x.items():
            lab = f["x"][n]
            cocok("bnj." + n, v, 0.0 if lab != lab else lab, 0.02 if n.startswith("p_") else 1e-3)
        cocok("bnj.z", z, f["z"], 0.06)
    # LSR_B
    T = tabel("lsr")
    for f in fx("lsr"):
        z, x = z_lsr(T, f["kab"], f["R"], f["M"], int(f["tgl"][5:7]))
        for n in ("r1", "r30", "m3", "ante60", "lclim", "lap_prev"):
            cocok("lsr." + n, x[n], f["x"][n], 0.02)
        for n in ("p1", "p3", "p14", "p30", "pm3", "papi"):
            cocok("lsr." + n, x[n], f["x"][n], 0.02)
        cocok("lsr.api", x["api"], f["x"]["api"], 0.05)
        cocok("lsr.z", z, f["z"], 0.1)
    # CEX_B
    T = tabel("cex")
    for f in fx("cex"):
        per = {}
        for kd, d in f["ev"]:
            per.setdefault(kd, []).append(D0 + d)
        h = D0 + f["t"]
        ev = Kejadian(per, h - 7, D0 + f["t"] - 400)
        z, x = z_cex(T, f["kab"], f["R"], f["M"], h, ev, 7)
        for n, v in x.items():
            cocok("cex." + n, v, f["x"][n], 0.03 if n.startswith("cdf") else 0.02)
        cocok("cex.z", z, f["z"], 0.06)
    # KRH_B
    T = tabel("krh")
    for f in fx("krh"):
        h = dt.date.fromisoformat(f["tgl"]).toordinal()
        cnt = {h - len(f["C"]) + 1 + i: c for i, c in enumerate(f["C"])}
        z, _ = z_krh(T, f["kab"], f["tenggang"], f["R"], cnt, h)
        cocok("krh.z", z, f["z"], 0.03)
    # pemetaan kab: 514 nama lab -> id sama, 6 pasang Kab/Kota senama tidak tertukar
    daftar = D.kab()
    cari = D.pencari(daftar)
    nm = json.load(open(os.path.join(SINI, "peta_kab.json")))["nama"]
    assert len(nm) == 514
    tak = [k for k, n in nm.items() if cari(k[:2], n) != k]
    assert not tak, f"kab lab tak terpetakan/tertukar: {tak[:10]}"
    byid = {k["id"]: k["nama"] for k in daftar}
    for kab_, kota in (("3202", "3272"), ("3206", "3278"), ("3308", "3371"), ("3326", "3375"), ("3516", "3576"), ("5301", "5371")):
        assert cari(kab_[:2], nm[kab_]) == kab_ and cari(kota[:2], nm[kota]) == kota and byid[kota].startswith("Kota"), (kab_, kota)
    for n in ("bnj", "lsr", "cex"):
        assert set(tabel(n)["kab"]) == set(byid), n
    assert set(tabel("krh")["klim"]) == set(byid)
    # entri: riwayat penuh + prakiraan HJN sintetis -> baris sah; riwayat bolong -> dilewati (tidak dikarang)
    t = "2026-11-02"
    hari = [D.geser(t, i) for i in (1, 2, 3)]
    k0 = daftar[0]["id"]
    pra = {"t": t, "k": "HJN", "hari": hari, "kab": {k0: [[0.5, 0.2, 0.1, 12.0, 14, 3, 14, 0.4, 1]] * 3}}
    hist = {D.geser(t, -i): {k0: 4.0} for i in range(0, 100)}
    for kode in ("BNJ_B", "LSR_B"):
        e, cat = entri(kode, t, [daftar[0]], hist, pra)
        assert e and D.periksa_entri({"t": t, "k": kode, "dibuat": "x", **e}) is None, (kode, cat)
        assert 0 < e["kab"][k0][0][0] < 1
    del hist[D.geser(t, -5)]
    e, cat = entri("BNJ_B", t, [daftar[0]], hist, pra)
    assert e is None and "tak lengkap" in cat, cat
    assert entri("BNJ_B", "2027-02-01", [daftar[0]], hist, dict(pra, t="2027-02-01", hari=[D.geser("2027-02-01", i) for i in (1, 2, 3)]))[0] is None, "pelaporan 2025 tak sah untuk 2027"
    print("bayangan/model.py: uji lulus; selisih maks lawan lab:", {k: round(v, 4) for k, v in sorted(maks.items()) if k.endswith(".z")})


if __name__ == "__main__":
    if sys.argv[1:2] == ["uji"]:
        uji()
    elif sys.argv[1:2] == ["semai"]:
        semai()
    else:
        print(__doc__)
