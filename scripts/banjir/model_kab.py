"""Model peluang banjir kabupaten-hari (GBDT pohon dangkal) vs aturan status.py -> data/raw/banjir/model_kab/ (BUKAN public/)

Resep karhutla (RISET-MODEL-KAB.md, docs/multi-bencana/PELATIHAN-MODEL.md): pembagian waktu ketat, setel HANYA di validasi, uji
dibuka SEKALI, kalibrasi Platt, pembanding sederhana (aturan status.py, klimatologi kab-bulan, regresi logistik) harus dikalahkan,
kriteria lulus dibekukan (sidik sha256) sebelum uji disentuh. GBDT/LR/AUC/Brier diimpor dari scripts/sebaran/gbdt.py (tidak disalin).
Satuan, sampel (ambang_wilayah.muat: kabupaten dipilih dari kejadian <= 2021), label (DIBI banjir/bandang), hujan ERA5 sempurna
(cache uji_balik.py) SAMA dengan uji_balik/ambang_wilayah. latih 2016-2021, validasi 2022-2023, uji 2024-2025.

Mode:
  ambil   DIBI (bila dibi_tanggal.json belum ada) + ERA5 sampel lewat uji_balik.ambil_cuaca (cache per sel, kuota; lanjut bila putus)
  latih   setel kedalaman x laju belajar x pohon (logloss validasi), ablasi kelompok fitur, Platt di validasi, tabel validasi vs
          aturan/klimatologi/LR pada jumlah alarm SAMA, tulis kandidat.json + latih.json + sidik. TIDAK menyentuh uji.
  buka    uji 2024-2025, SEKALI: menolak bila sidik berubah atau sudah dibuka. (dijalankan pemilik, bukan pengerja)
  uji     swauji sintetis tanpa jaringan.
"""
import bisect, datetime as dt, gzip, hashlib, importlib.util, json, math, os, random, sys, time
from collections import defaultdict

DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, DIR)
from umum import KELUAR as KELUAR_PUBLIK, MENTAH, baca, simpan
from status import GESER
import uji_balik as ub


def _impor(nama, jalur):
    s = importlib.util.spec_from_file_location(nama, jalur)
    m = importlib.util.module_from_spec(s)
    s.loader.exec_module(m)
    return m


G = _impor("gbdt_sebaran", os.path.join(DIR, "..", "sebaran", "gbdt.py"))

LATIH, VALIDASI, UJI = range(2016, 2022), range(2022, 2024), range(2024, 2026)
# MODEL_KAB_SEBAGIAN=1: hanya kabupaten yang SEMUA selnya sudah di cache (kuota harian Open-Meteo habis sebelum sampel lengkap).
# Keluaran ke model_kab_sebagian/ dan `buka` ditolak: itu pratinjau pipa, bukan kandidat yang boleh diuji.
SEBAGIAN = bool(os.environ.get("MODEL_KAB_SEBAGIAN"))
KELUAR = os.path.join(MENTAH, "model_kab_sebagian" if SEBAGIAN else "model_kab")
KANDIDAT, HASIL_LATIH, HASIL_UJI = (os.path.join(KELUAR, n) for n in ("kandidat.json", "latih.json", "uji.json"))
DIBI_TGL = os.path.join(MENTAH, "dibi_tanggal.json")
RISET = os.path.join(DIR, "RISET-MODEL-KAB.md")
MULAI = 30                      # indeks hari pertama yang dinilai: A30 butuh 30 hari ke belakang (data mulai 2015-12-22)
APIK = (0.85, 0.90, 0.95)
ULANG = 1000
LEVEL_ALARM = {"waspada": 1, "siaga": 2}

# kelompok fitur -> nama fitur (urutan kolom = urutan di sini). Sumber tiap fitur ada di RISET-MODEL-KAB.md §3.
KELOMPOK = {
    "hujan": ["h1", "h3", "imax", "pers_h3"],
    "anteseden": ["a7", "a30", "api85", "api90", "api95"],
    "tanah": ["sm"],
    "musim": ["bulan_sin", "bulan_cos"],
    "statis": ["frek_dibi", "bahaya_b"],
    "aturan": ["level_aturan"],
}
FITUR = [f for g in KELOMPOK.values() for f in g]
HIPER = [(d, lr) for d in (2, 3, 4) for lr in (0.05, 0.1)]
POHON_MAKS = 200
HIPER_TETAP = {"min_h": 5.0, "l2": 1.0, "sub": 0.5, "seed": 1}

# KRITERIA lulus: DIBEKUKAN. Mengubah isinya mengubah sidik_kriteria(), dan RISET-MODEL-KAB.md memuat sidik yang sama (dicek `uji`).
KRITERIA = {
    "periode": "uji 2024-2025, dibuka sekali",
    "alarm": "ambang model = jumlah alarm sama dengan aturan status.py (>= Waspada, >= Siaga) pada periode yang sama",
    "dETS_waspada_ci_bawah_lebih_dari": 0.0,
    "dETS_siaga_ci_bawah_lebih_dari": 0.0,
    "dETS_vs_lr_waspada_siaga_ci_bawah_lebih_dari": 0.0,
    "dETS_vs_klimatologi_waspada_siaga_ci_bawah_lebih_dari": 0.0,
    "brier_skill_vs_klimatologi_ci_bawah_lebih_dari": 0.0,
    "kalibrasi": "model, regresi logistik, dan klimatologi sama-sama dikalibrasi Platt di validasi 2022-2023; klimatologi terkalibrasi = acuan Brier skill",
    "penjaga_lr": "titik: AUC model >= AUC regresi logistik",
    "seri": "pemecah seri skor pada ambang alarm: acak berbiji tetap 11",
    "ci": "bootstrap blok (kab x tahun), 1000 ulangan, berpasangan, persentil 2,5 dan 97,5, biji 11",
}
BIJI = 11


def sidik_kriteria():
    return hashlib.sha256(json.dumps(KRITERIA, sort_keys=True, ensure_ascii=False).encode()).hexdigest()[:16]


def sidik_penuh(kand):
    """sha256: kriteria + kandidat (pohon, Platt, pembanding, fitur) + isi model_kab.py, uji_balik.py, status.py + dibi_tanggal.json."""
    isi = {k: kand[k] for k in ("fitur", "bias", "pohon", "platt", "platt_lr", "platt_klim", "hiper", "lr", "klim", "frek", "frek_awal",
                                "pers_batas", "sel")}
    h = hashlib.sha256(json.dumps({"kriteria": KRITERIA, "kand": isi}, sort_keys=True).encode())
    kode = [os.path.join(DIR, n) for n in ("model_kab.py", "uji_balik.py", "status.py", "umum.py")]
    kode += [os.path.join(DIR, "..", "sebaran", "gbdt.py"), os.path.join(KELUAR_PUBLIK, "bahaya.json"), DIBI_TGL]
    for j in kode:
        h.update(hashlib.sha256(open(j, "rb").read()).digest())
    h.update(json.dumps(manifest_era5(kand["sel"]), sort_keys=True).encode())
    return h.hexdigest()[:16]


def manifest_era5(sel):
    """Daftar berkas cache ERA5 sampel: [nama, ukuran, sha256] per sel (urut)."""
    out = []
    for s in sorted(map(tuple, sel)):
        j = ub.jalur(*s)
        out.append([os.path.basename(j), os.path.getsize(j), hashlib.sha256(open(j, "rb").read()).hexdigest()])
    return out


# ------------------------------------------------------------------ data
def muat_sampel():
    baris = baca(DIBI_TGL)
    if not baris or min(r[3] for r in baris) > "2016-01-01":
        sys.exit("dibi_tanggal.json belum ada/kurang: jalankan `model_kab.py ambil`")
    ev, sk = ub.peristiwa(baris), ub.sel_per_kab()
    batas = ub.hari_ke(dt.date(LATIH[-1], 12, 31))   # kabupaten dipilih dari kejadian <= 2021 saja (sama ambang_wilayah.pilih_latih)
    kabs = ub.pilih({j: {k: {e for e in v if e <= batas} for k, v in ev[j].items()} for j in ev}, sk)
    if SEBAGIAN:
        kabs = [k for k in kabs if all(os.path.exists(ub.jalur(*s)) for s in sk[k])]
    return ev, sk, kabs, {s for k in kabs for s in sk[k]}


def muat_cuaca(sel):
    sisa = [s for s in sel if not os.path.exists(ub.jalur(*s))]
    if sisa:
        sys.exit(f"cache ERA5 belum lengkap ({len(sisa)} sel): jalankan `model_kab.py ambil`")
    out = {}
    for s in sel:
        with gzip.open(ub.jalur(*s), "rt") as f:
            out[s] = ub.deret(json.load(f))
    return out


def tahun_dari(e):
    return (ub.AWAL + dt.timedelta(e)).year


def hari_tahun(tahun):
    lo, hi = ub.hari_ke(dt.date(tahun[0], 1, 1)), min(ub.hari_ke(dt.date(tahun[-1], 12, 31)), ub.hari_ke(ub.AKHIR) - 2)
    return range(max(lo, MULAI), hi + 1)


def seri_sel(c, hari):
    """Fitur harian satu sel untuk hari `hari`. Hanya hujan/tanah hari <= e+1 (H3 = e-1..e+1, sama dengan aturan GESER = -1)."""
    p, im, sm = c["p"], c["im"], c["sm"]
    api = {k: [0.0] * len(p) for k in APIK}      # api[k][e] = indeks hujan anteseden s/d hari e-1
    for k in APIK:
        a = 0.0
        for e in range(len(p)):
            api[k][e] = a
            a = k * a + p[e]
    out = {}
    for e in hari:
        w = slice(e + GESER, e + GESER + 3)
        ims = [x for x in im[w] if x is not None]
        out[e] = {"h1": p[e], "h3": sum(p[w]), "imax": max(ims) if ims else 0.0, "a7": sum(p[e - 7:e]), "a30": sum(p[e - 30:e]),
                  "api85": api[0.85][e], "api90": api[0.90][e], "api95": api[0.95][e], "sm": sm[e]}
    return out


def persentil_batas(cuaca):
    """Per sel: H3 terurut pada hari-hari LATIH saja (klimatologi sel itu)."""
    out = {}
    for s, c in cuaca.items():
        out[s] = sorted(sum(c["p"][e + GESER:e + GESER + 3]) for e in hari_tahun(LATIH))
    return out


def laju_awal(baris, kabs):
    """Laju hari-kejadian banjir/bandang DIBI nasional sampel pada 2008-2015 (SEBELUM tahun latih): nilai tahun latih pertama."""
    kab, lo, hi = set(kabs), dt.date(2008, 1, 1), dt.date(2015, 12, 31)
    hari = {(f"{p}|{n}", t) for jenis, p, n, t, v in baris if v >= 1 and {"banjir", "bandang"} & set(jenis) and f"{p}|{n}" in kab and lo <= dt.date.fromisoformat(t) <= hi}
    return len(hari) / (len(kab) * ((hi - lo).days + 1))


def frekuensi(ev, kabs, awal):
    """Laju hari kejadian DIBI per kab, dihaluskan ke `awal` dengan bobot 30 hari: (n_kej + 30 awal)/(n_hari + 30).
    ekspansif[kab][y] = hanya dari tahun latih < y (2016 = awal, nasional pra-2016); penuh[kab] = semua tahun latih (validasi/uji).
    Nilai baris tahun y TIDAK bergantung pada label tahun y."""
    rentang = {y: set(hari_tahun([y])) for y in LATIH}
    jum = {k: {y: len(rentang[y] & set(ev["banjir"].get(k, ()))) for y in LATIH} for k in kabs}

    def laju(k, th):
        n = sum(len(rentang[y]) for y in th)
        return (sum(jum[k][y] for y in th) + 30 * awal) / (n + 30)
    penuh = {k: laju(k, LATIH) for k in kabs}
    eks = {k: {y: laju(k, [t for t in LATIH if t < y]) for y in LATIH} for k in kabs}
    return penuh, eks


def klimatologi(ev, kabs, rata):
    """Laju per kab-bulan dari latih, dihaluskan ke laju kab dengan bobot 30 hari: (n_kej + 30 r_kab)/(n_hari + 30)."""
    out = {}
    hari = hari_tahun(LATIH)
    kej = {k: set(ev["banjir"].get(k, ())) for k in kabs}
    for k in kabs:
        for m in range(1, 13):
            es = [e for e in hari if (ub.AWAL + dt.timedelta(e)).month == m]
            out[f"{k}|{m}"] = (sum(1 for e in es if e in kej[k]) + 30 * rata[k]) / (len(es) + 30)
    return out


def bangun(cuaca, sk, kabs, ev, tahun, pers, penuh, eks):
    """Baris kab-hari tahun `tahun` -> dict kolom: kab, tahun, bulan, e, X (urut FITUR), y, level."""
    B = {"kab": [], "tahun": [], "bulan": [], "e": [], "X": [], "y": [], "level": []}
    hari = list(hari_tahun(tahun))
    par = ub.BERLAKU["banjir"]
    sel_seri = {}
    for kab in kabs:
        for s in sk[kab]:
            if s not in sel_seri:
                sel_seri[s] = seri_sel(cuaca[s], hari)
    for kab in kabs:
        kej = ev["banjir"].get(kab, set())
        sel = list(sk[kab].items())
        lv = [max(t) for t in zip(*(ub.level_harian(cuaca[s], b, "banjir", par, hari) for s, b in sel))]
        bh = max(b[0] for _, b in sel)
        for e, l in zip(hari, lv):
            y_ = tahun_dari(e)
            f = {n: max(sel_seri[s][e][n] for s, _ in sel) for n in ("h1", "h3", "imax", "a7", "a30", "api85", "api90", "api95", "sm")}
            f["pers_h3"] = max(bisect.bisect_left(pers[s], sel_seri[s][e]["h3"]) / len(pers[s]) for s, _ in sel)
            m = (ub.AWAL + dt.timedelta(e)).month
            f["bulan_sin"], f["bulan_cos"] = math.sin(2 * math.pi * m / 12), math.cos(2 * math.pi * m / 12)
            f["frek_dibi"] = eks[kab][y_] if y_ in LATIH else penuh[kab]
            f["bahaya_b"], f["level_aturan"] = bh, l
            B["kab"].append(kab); B["tahun"].append(y_); B["bulan"].append(m); B["e"].append(e)
            B["X"].append([f[n] for n in FITUR]); B["y"].append(1 if e in kej else 0); B["level"].append(l)
    return B


# ------------------------------------------------------------------ model
def kol(nama):
    return [FITUR.index(f) for f in nama]


def aktif_dari(kelompok):
    return sorted(i for g in kelompok for i in kol(KELOMPOK[g]))


def x_lr(x):
    """Regresi logistik: hujan/anteseden berekor panjang -> log1p; sisanya apa adanya."""
    panjang = set(kol(["h1", "h3", "imax", "a7", "a30", "api85", "api90", "api95"]))
    return [math.log1p(v) if i in panjang else v for i, v in enumerate(x)]


def skor_gbdt(mdl, X):
    return [mdl["bias"] + sum(G.nilai_pohon(s, x) for s in mdl["pohon"]) for x in X]


def skor_bertahap(mdl, X, tahap):
    """logit tiap baris pada jumlah pohon di `tahap` (urut naik)."""
    F = [mdl["bias"]] * len(X)
    out = {}
    for t, s in enumerate(mdl["pohon"], 1):
        F = [f + G.nilai_pohon(s, x) for f, x in zip(F, X)]
        if t in tahap:
            out[t] = F
    return out


def platt(logit, y):
    m = G.latih_lr([[z] for z in logit], y, [1.0] * len(y), l2=1e-3)
    return {"mu": m["mu"][0], "sd": m["sd"][0], "b0": m["b"][0], "b1": m["b"][1]}


def pakai_platt(pl, logit):
    return [G.sigmoid(pl["b0"] + pl["b1"] * (z - pl["mu"]) / pl["sd"]) for z in logit]


# ------------------------------------------------------------------ metrik
def kontingensi(alarm, y, idx):
    a = sum(1 for i in idx if alarm[i] and y[i]); b = sum(1 for i in idx if alarm[i] and not y[i])
    c = sum(1 for i in idx if not alarm[i] and y[i]); d = len(idx) - a - b - c
    return [a, b, c, d]


def alarm_sebanyak(skor, n, biji=BIJI):
    """Alarm = n skor tertinggi; seri dipecah acak dengan biji tetap (bukan urutan indeks: indeks berurut kab lalu waktu)."""
    r = random.Random(biji)
    acak = [r.random() for _ in skor]
    urut = sorted(range(len(skor)), key=lambda i: (-skor[i], acak[i]))
    ya = set(urut[:n])
    return [i in ya for i in range(len(skor))]


def seri_ambang(skor, n):
    """Jumlah baris yang skornya SAMA dengan skor alarm terakhir (n-th tertinggi): ukuran seri yang dipecah acak."""
    if not n:
        return 0
    batas = sorted(skor, reverse=True)[n - 1]
    return sum(1 for v in skor if v == batas)


def blok_indeks(B, per="kab_tahun"):
    """kab_tahun = blok utama; pulau_minggu = sensitivitas (korelasi antar-kab di hari/minggu yang sama)."""
    out = defaultdict(list)
    for i, (k, t, e) in enumerate(zip(B["kab"], B["tahun"], B["e"])):
        out[(k, t) if per == "kab_tahun" else (ub.KELOMPOK[k[0]], e // 7)].append(i)
    return out


def logit(p):
    p = min(max(p, 1e-9), 1 - 1e-9)
    return math.log(p / (1 - p))


def jumlah(blok, kunci):
    t = [0, 0, 0, 0]
    for k in kunci:
        t = [x + y for x, y in zip(t, blok[k])]
    return t


def cacah(B, alarm, bl):
    return {k: kontingensi(alarm, B["y"], ix) for k, ix in bl.items()}


def ci_selisih(b1, b0, ulang=ULANG, biji=BIJI):
    """(selisih ETS titik, [bawah, atas]) bootstrap blok berpasangan: blok yang sama untuk dua penilai."""
    kunci, r, xs = sorted(b0), random.Random(biji), []
    ets = lambda b, ks: ub.skor(*jumlah(b, ks))["ets"] or 0.0
    for _ in range(ulang):
        ks = [r.choice(kunci) for _ in kunci]
        xs.append(ets(b1, ks) - ets(b0, ks))
    xs.sort()
    return ets(b1, kunci) - ets(b0, kunci), [xs[int(.025 * (ulang - 1))], xs[int(.975 * (ulang - 1))]]


def ci_skor(blok, ulang=ULANG, biji=BIJI):
    kunci, r = sorted(blok), random.Random(biji)
    s = defaultdict(list)
    for _ in range(ulang):
        for m, v in ub.skor(*jumlah(blok, [r.choice(kunci) for _ in kunci])).items():
            if v is not None:
                s[m].append(v)
    return {m: [round(sorted(v)[int(.025 * (len(v) - 1))], 3), round(sorted(v)[int(.975 * (len(v) - 1))], 3)] for m, v in s.items()}


def brier_skill(B, p, ref, bl, ulang=ULANG, biji=BIJI):
    """1 - BS(p)/BS(ref) dengan CI bootstrap blok. Mengembalikan (titik, [bawah, atas])."""
    y = B["y"]
    se = {k: (sum((p[i] - y[i]) ** 2 for i in ix), sum((ref[i] - y[i]) ** 2 for i in ix)) for k, ix in bl.items()}
    f = lambda ks: 1 - sum(se[k][0] for k in ks) / sum(se[k][1] for k in ks)
    kunci, r = sorted(se), random.Random(biji)
    xs = sorted(f([r.choice(kunci) for _ in kunci]) for _ in range(ulang))
    return f(kunci), [xs[int(.025 * (ulang - 1))], xs[int(.975 * (ulang - 1))]]


def penilaian(B, p_model, p_lr, p_klim, p_aturan, ulang=ULANG):
    """Metrik probabilitas + kontingensi pada jumlah alarm sama dengan aturan Waspada/Siaga. p_* = peluang terkalibrasi."""
    y, bl = B["y"], blok_indeks(B)
    out = {"n": len(y), "kej": sum(y), "laju": round(sum(y) / len(y), 4), "kab": len({k for k, _ in bl})}
    out["probabilitas"] = {nama: {"auc": G.auc(p, y), "brier": G.brier(p, y), "logloss": G.logloss(p, y)}
                           for nama, p in (("model", p_model), ("lr", p_lr), ("klimatologi", p_klim), ("aturan", p_aturan))}
    for nama, p in (("model", p_model), ("lr", p_lr), ("aturan", p_aturan)):
        out["probabilitas"][nama]["brier_skill_vs_klim"], out["probabilitas"][nama]["bss_ci"] = brier_skill(B, p, p_klim, bl, ulang)
    out["reliabilitas_model"] = G.reliabilitas(p_model, y)
    for nama, L in LEVEL_ALARM.items():
        n_alarm = sum(1 for l in B["level"] if l >= L)
        alarm = {"aturan": [l >= L for l in B["level"]], "model": alarm_sebanyak(p_model, n_alarm), "lr": alarm_sebanyak(p_lr, n_alarm),
                 "klimatologi": alarm_sebanyak(p_klim, n_alarm)}
        blk = {m: cacah(B, a, bl) for m, a in alarm.items()}
        r = {"alarm": n_alarm, "laju_alarm": round(n_alarm / len(y), 4),
             "seri_di_ambang": {m: seri_ambang(p, n_alarm) for m, p in (("model", p_model), ("lr", p_lr), ("klimatologi", p_klim))}}
        for m in alarm:
            s = ub.skor(*jumlah(blk[m], sorted(blk[m])))
            r[m] = {**{k: None if v is None else round(v, 4) for k, v in s.items()}, "ci": ci_skor(blk[m], ulang) if ulang else {}}
        for m in ("lr", "klimatologi"):
            d, ci = ci_selisih(blk[m], blk["aturan"], ulang) if ulang else (0, [0, 0])
            r["d_ets_" + m + "_vs_aturan"] = {"nilai": round(d, 4), "ci": [round(x, 4) for x in ci]}
        d, ci = ci_selisih(blk["model"], blk["aturan"], ulang) if ulang else (0, [0, 0])
        r["d_ets_model_vs_aturan"] = {"nilai": round(d, 4), "ci": [round(x, 4) for x in ci]}
        for m in ("lr", "klimatologi"):
            d, ci = ci_selisih(blk["model"], blk[m], ulang) if ulang else (0, [0, 0])
            r["d_ets_model_vs_" + m] = {"nilai": round(d, 4), "ci": [round(x, 4) for x in ci]}
        if ulang:   # sensitivitas (tidak menentukan vonis): blok pulau x minggu menangkap korelasi antar-kab pada hari yang sama
            b2 = blok_indeks(B, "pulau_minggu")
            bm, ba = cacah(B, alarm["model"], b2), cacah(B, alarm["aturan"], b2)
            d, ci = ci_selisih(bm, ba, ulang)
            r["d_ets_model_vs_aturan_pulau_minggu"] = {"nilai": round(d, 4), "ci": [round(x, 4) for x in ci], "blok": len(b2)}
        out[nama] = r
    return out


def vonis(pen):
    """Menerapkan KRITERIA pada penilaian() periode uji -> {"lulus": bool, "rincian": {...}}."""
    k = KRITERIA
    rin = {}
    for nama in LEVEL_ALARM:
        for lawan, batas in (("aturan", k[f"dETS_{nama}_ci_bawah_lebih_dari"]), ("lr", k["dETS_vs_lr_waspada_siaga_ci_bawah_lebih_dari"]),
                             ("klimatologi", k["dETS_vs_klimatologi_waspada_siaga_ci_bawah_lebih_dari"])):
            rin[f"dETS_{nama}_vs_{lawan}"] = pen[nama]["d_ets_model_vs_" + lawan]["ci"][0] > batas
    rin["brier_skill_ci_bawah"] = pen["probabilitas"]["model"]["bss_ci"][0] > k["brier_skill_vs_klimatologi_ci_bawah_lebih_dari"]
    rin["penjaga_auc_lr"] = pen["probabilitas"]["model"]["auc"] >= pen["probabilitas"]["lr"]["auc"]
    return {"lulus": all(rin.values()), "rincian": rin}


# ------------------------------------------------------------------ pembanding
def peluang_pembanding(B, klim, laju_level):
    p_klim = [klim[f"{k}|{m}"] for k, m in zip(B["kab"], B["bulan"])]
    p_aturan = [laju_level[l] for l in B["level"]]
    return p_klim, p_aturan


def kalibrasi_pembanding(p_lr, p_klim, pl_lr, pl_klim):
    """LR dan klimatologi diberi perlakuan SAMA dengan model: Platt (dipasang di validasi)."""
    return pakai_platt(pl_lr, [logit(p) for p in p_lr]), pakai_platt(pl_klim, [logit(p) for p in p_klim])


def laju_per_level(B):
    """Peluang empiris kejadian per level aturan (0..3) dari data latih = aturan dibaca sebagai probabilitas."""
    n, a = [0] * 4, [0] * 4
    for l, y in zip(B["level"], B["y"]):
        n[l] += 1; a[l] += y
    return [(a[i] + 0.5) / (n[i] + 1) for i in range(4)]


# ------------------------------------------------------------------ mode
def ambil():
    if not os.path.exists(DIBI_TGL):
        from kejadian import dibi, Pencocok
        simpan(DIBI_TGL, [[j, p, n, t, v["kejadian"]] for j, p, n, t, v in dibi(Pencocok())])
    ev, sk, kabs, sel = muat_sampel()
    ada0 = sum(os.path.exists(ub.jalur(*s)) for s in sel)
    print(f"{len(kabs)} kab, {len(sel)} sel, {ada0} sudah di cache", file=sys.stderr)
    lengkap = ub.ambil_cuaca(sel)
    ada1 = sum(os.path.exists(ub.jalur(*s)) for s in sel)
    print(f"sel terambil sekarang {ada1 - ada0}, kuota berbobot ~{(ada1 - ada0) * 79}; lengkap={lengkap}", file=sys.stderr)
    return 0 if lengkap else 1


def siapkan():
    ev, sk, kabs, sel = muat_sampel()
    cuaca = muat_cuaca(sel)
    pers = persentil_batas(cuaca)
    awal = laju_awal(baca(DIBI_TGL), kabs)
    penuh, eks = frekuensi(ev, kabs, awal)
    return ev, sk, kabs, cuaca, pers, penuh, eks, awal


def latih():
    if os.path.exists(HASIL_UJI):
        sys.exit("uji sudah dibuka; latih ulang = eksperimen baru dengan periode uji baru")
    t0 = time.time()
    ev, sk, kabs, cuaca, pers, penuh, eks, awal = siapkan()
    klim = klimatologi(ev, kabs, penuh)
    TR = bangun(cuaca, sk, kabs, ev, LATIH, pers, penuh, eks)
    VA = bangun(cuaca, sk, kabs, ev, VALIDASI, pers, penuh, eks)
    print(f"{len(kabs)} kab, {len(cuaca)} sel; latih {len(TR['y'])} baris ({sum(TR['y'])} kejadian), validasi {len(VA['y'])} ({sum(VA['y'])})")
    w = [1.0] * len(TR["y"])
    semua = sorted(KELOMPOK)
    # 1. kedalaman x laju belajar x pohon, logloss validasi (Platt dipasang pada validasi tiap kandidat = perbandingan setara)
    kisi, tahap = [], set(range(20, POHON_MAKS + 1, 10))
    for d, lr in HIPER:
        m = G.latih_gbdt(TR["X"], TR["y"], w, pohon=POHON_MAKS, dalam=d, lr=lr, fitur_aktif=aktif_dari(semua), **HIPER_TETAP)
        for t, z in skor_bertahap(m, VA["X"], tahap).items():
            pl = platt(z, VA["y"])
            kisi.append((G.logloss(pakai_platt(pl, z), VA["y"]), d, lr, t))
        print(f"  dalam {d} lr {lr}: logloss validasi terbaik {min(k for k in kisi if k[1] == d and k[2] == lr)[0]:.5f}  ({time.time() - t0:.0f} dtk)", flush=True)
    ll, d, lr, n_pohon = min(kisi)
    print(f"  terpilih dalam {d}, lr {lr}, {n_pohon} pohon (logloss validasi {ll:.5f})")

    def cocok(grup):
        m = G.latih_gbdt(TR["X"], TR["y"], w, pohon=n_pohon, dalam=d, lr=lr, fitur_aktif=aktif_dari(grup), **HIPER_TETAP)
        z = skor_gbdt(m, VA["X"])
        pl = platt(z, VA["y"])
        return m, z, pl, G.logloss(pakai_platt(pl, z), VA["y"])

    # 2. ablasi kelompok: buang satu kelompok; dipertahankan terbuang bila logloss validasi tidak memburuk (satu putaran, berurutan)
    grup, (m, z, pl, base), abl = list(semua), cocok(semua), {}
    for g in semua:
        sisa = [x for x in grup if x != g]
        if not sisa:
            continue
        r = cocok(sisa)
        abl[g] = {"logloss_tanpa": round(r[3], 5), "selisih": round(r[3] - base, 5), "dibuang": r[3] <= base}
        print(f"  ablasi {g:10s} logloss tanpa {r[3]:.5f} (selisih {r[3] - base:+.5f}) -> {'DIBUANG' if r[3] <= base else 'dipertahankan'}", flush=True)
        if r[3] <= base:
            grup, (m, z, pl, base) = sisa, r
    print(f"  kelompok akhir {grup}, logloss validasi {base:.5f}")
    # 3. pembanding dan penilaian validasi
    p_model = pakai_platt(pl, z)
    lr_m = G.latih_lr([x_lr(x) for x in TR["X"]], TR["y"], w)
    p_lr = [G.prediksi_lr(lr_m, x_lr(x)) for x in VA["X"]]
    p_klim, p_aturan = peluang_pembanding(VA, klim, laju_per_level(TR))
    pl_lr, pl_klim = platt([logit(p) for p in p_lr], VA["y"]), platt([logit(p) for p in p_klim], VA["y"])
    p_lr, p_klim = kalibrasi_pembanding(p_lr, p_klim, pl_lr, pl_klim)
    pen = penilaian(VA, p_model, p_lr, p_klim, p_aturan)
    # kepentingan fitur: jumlah gain tak tersedia di gbdt.py -> hitung frekuensi pemakaian belahan berbobot kedalaman
    pakai = defaultdict(float)
    for s in m["pohon"]:
        for sp in s:
            if len(sp) > 1:
                pakai[FITUR[sp[0]]] += 1
    kand = {"versi": "model-kab-1", "dibuat": dt.datetime.now(dt.timezone(dt.timedelta(hours=7))).isoformat(timespec="minutes"),
            "status": "KANDIDAT: uji 2024-2025 belum dibuka; ERA5 prakiraan sempurna", "fitur": FITUR, "kelompok_aktif": grup,
            "aktif": aktif_dari(grup), "bias": m["bias"], "pohon": m["pohon"], "platt": pl, "platt_lr": pl_lr, "platt_klim": pl_klim,
            "hiper": {"dalam": d, "lr": lr, "pohon": n_pohon, **HIPER_TETAP}, "lr": {k: lr_m[k] for k in ("mu", "sd", "b")},
            "klim": klim, "frek": penuh, "frek_awal": awal, "sel": sorted(cuaca), "pers_batas": {f"{s[0]:.3f}_{s[1]:.3f}": v[::max(1, len(v) // 200)] for s, v in pers.items()},
            "laju_level": laju_per_level(TR), "kab": kabs, "sidik_kriteria": sidik_kriteria()}
    kand["sidik"] = sidik_penuh(kand)
    simpan(KANDIDAT, kand)
    simpan(HASIL_LATIH, {"dibuat": kand["dibuat"], "kisi": [{"logloss": k[0], "dalam": k[1], "lr": k[2], "pohon": k[3]} for k in sorted(kisi)[:20]],
                         "ablasi": abl, "validasi": pen, "pemakaian_belahan": dict(sorted(pakai.items(), key=lambda x: -x[1])),
                         "hari_kejadian": {"latih": sum(TR["y"]), "validasi": sum(VA["y"])}})
    cetak(pen)
    print("belahan terbanyak:", ", ".join(f"{k} {int(v)}" for k, v in sorted(pakai.items(), key=lambda x: -x[1])[:8]))
    print(f"sidik {kand['sidik']} sidik_kriteria {kand['sidik_kriteria']}; kandidat.json ditulis; UJI BELUM DIBUKA ({time.time() - t0:.0f} dtk)")


def cetak(pen):
    print(f"  n={pen['n']} kejadian={pen['kej']} laju={pen['laju']} kab={pen['kab']}")
    for m, v in pen["probabilitas"].items():
        print(f"    {m:12s} AUC {v['auc']:.4f}  Brier {v['brier']:.5f}  logloss {v['logloss']:.5f}"
              + (f"  BSS vs klim {v['brier_skill_vs_klim']:+.4f} [{v['bss_ci'][0]:+.4f}, {v['bss_ci'][1]:+.4f}]" if "brier_skill_vs_klim" in v else ""))
    for nama in LEVEL_ALARM:
        r = pen[nama]
        print(f"    >= {nama} (alarm {r['alarm']}, {r['laju_alarm'] * 100:.1f}% kab-hari)")
        for m in ("aturan", "model", "lr", "klimatologi"):
            s = r[m]
            f = lambda k: "-" if s[k] is None else f"{s[k]:.3f}"
            print(f"      {m:12s} POD {f('pod')} FAR {f('far')} CSI {f('csi')} ETS {f('ets')} PSS {f('pss')}")
        for m in ("model", "lr", "klimatologi"):
            x = r["d_ets_" + m + "_vs_aturan"]
            print(f"      dETS {m} - aturan {x['nilai']:+.4f} CI95 [{x['ci'][0]:+.4f}, {x['ci'][1]:+.4f}]")
        for m in ("lr", "klimatologi"):
            x = r["d_ets_model_vs_" + m]
            print(f"      dETS model - {m} {x['nilai']:+.4f} CI95 [{x['ci'][0]:+.4f}, {x['ci'][1]:+.4f}]")
        if "d_ets_model_vs_aturan_pulau_minggu" in r:
            x = r["d_ets_model_vs_aturan_pulau_minggu"]
            print(f"      (sensitivitas blok pulau x minggu, {x['blok']} blok) dETS model - aturan {x['nilai']:+.4f} CI95 [{x['ci'][0]:+.4f}, {x['ci'][1]:+.4f}]")
        print(f"      seri di ambang (baris dengan skor = skor alarm terakhir, dipecah acak): {r['seri_di_ambang']}")


def buka():
    if SEBAGIAN:
        sys.exit("MODEL_KAB_SEBAGIAN: pratinjau sampel tidak lengkap tidak boleh membuka uji")
    if os.path.exists(HASIL_UJI):
        sys.exit(f"uji sudah dibuka ({baca(HASIL_UJI).get('tanggal')}); tidak bisa dibuka lagi")
    kand = baca(KANDIDAT)
    if not kand:
        sys.exit("kandidat.json belum ada: jalankan `latih`")
    if kand["sidik_kriteria"] != sidik_kriteria() or kand["sidik"] != sidik_penuh(kand):
        sys.exit("sidik kriteria/kandidat/kode berubah sejak `latih`: uji ditolak. Latih ulang dan kunci ulang sebelum membuka.")
    if sidik_kriteria() not in open(RISET).read():
        sys.exit("RISET-MODEL-KAB.md tidak memuat sidik_kriteria yang sama dengan kode: uji ditolak.")
    ev, sk, kabs, cuaca, pers, penuh, eks, awal = siapkan()
    assert kabs == kand["kab"], "sampel kabupaten berubah"
    UJ = bangun(cuaca, sk, kabs, ev, UJI, pers, penuh, eks)
    mdl = {"bias": kand["bias"], "pohon": kand["pohon"]}
    p_model = pakai_platt(kand["platt"], skor_gbdt(mdl, UJ["X"]))
    p_lr = [G.prediksi_lr(kand["lr"], x_lr(x)) for x in UJ["X"]]
    p_klim, p_aturan = peluang_pembanding(UJ, kand["klim"], kand["laju_level"])
    p_lr, p_klim = kalibrasi_pembanding(p_lr, p_klim, kand["platt_lr"], kand["platt_klim"])
    pen = penilaian(UJ, p_model, p_lr, p_klim, p_aturan)
    v = vonis(pen)
    cetak(pen)
    print("VONIS", "LULUS" if v["lulus"] else "TIDAK LULUS", v["rincian"])
    simpan(HASIL_UJI, {"tanggal": dt.date.today().isoformat(), "sidik": kand["sidik"], "kriteria": KRITERIA, "uji": pen, "vonis": v})
    # hasil + sidik juga masuk RISET-MODEL-KAB.md (ikut git), bukan hanya uji.json di data/raw yang di-gitignore
    with open(RISET, "a") as f:
        f.write(f"\n## 10. Hasil uji 2024-2025 (dibuka {dt.date.today().isoformat()}, sidik `{kand['sidik']}`, sidik kriteria `{sidik_kriteria()}`)\n\n"
                f"VONIS: **{'LULUS' if v['lulus'] else 'TIDAK LULUS'}**. Rincian: `{json.dumps(v['rincian'])}`\n\n```json\n"
                + json.dumps({k: pen[k] for k in ("n", "kej", "laju", "kab", "probabilitas", "waspada", "siaga")}, indent=1, ensure_ascii=False) + "\n```\n")


# ------------------------------------------------------------------ swauji
def sintetis(n_hari=700, seed=5):
    """Cuaca mainan satu sel dengan hujan lebat sesekali; label = hujan H3 tinggi bersama anteseden basah (ada sinyal)."""
    r = random.Random(seed)
    p = [r.expovariate(1 / 6) * (r.random() < 0.5) + (80 * (r.random() < 0.02)) for _ in range(n_hari)]
    return {"p": p, "im": [x / 4 for x in p], "sm": [0.3 + 0.002 * min(sum(p[max(0, i - 7):i]), 100) for i in range(n_hari)]}


def uji():
    assert sidik_kriteria() in open(RISET).read(), "RISET-MODEL-KAB.md harus memuat sidik_kriteria: " + sidik_kriteria()
    assert len(FITUR) == len(set(FITUR)) == 15 and aktif_dari(sorted(KELOMPOK)) == list(range(15))
    simpan_a, simpan_b = ub.AWAL, ub.AKHIR
    try:
        ub.AWAL, ub.AKHIR = dt.date(2015, 12, 22), dt.date(2017, 11, 21)
        n = (ub.AKHIR - ub.AWAL).days + 1
        c = sintetis(n)
        hari = list(range(MULAI, n - 2))
        s0 = seri_sel(c, hari)
        # tanpa bocoran: ubah hujan SETELAH e+1 tidak boleh mengubah fitur hari e; ubah hari e+1 harus mengubah H3 (jendela aturan)
        e = 300
        c2 = {**c, "p": c["p"][:e + 2] + [999.0] * (n - e - 2), "im": c["im"][:e + 2] + [99.0] * (n - e - 2)}
        s1 = seri_sel(c2, [e])[e]
        assert all(s1[k] == s0[e][k] for k in s1 if k != "sm") and s1["sm"] == s0[e]["sm"], (s1, s0[e])
        c3 = {**c, "p": c["p"][:e + 1] + [c["p"][e + 1] + 50] + c["p"][e + 2:]}
        assert seri_sel(c3, [e])[e]["h3"] == s0[e]["h3"] + 50 and seri_sel(c3, [e])[e]["a30"] == s0[e]["a30"]
        # API memakai hujan s/d e-1: hujan hari e tidak masuk
        c4 = {**c, "p": c["p"][:e] + [c["p"][e] + 70] + c["p"][e + 1:]}
        assert seri_sel(c4, [e])[e]["api90"] == s0[e]["api90"] and seri_sel(c4, [e])[e]["h1"] == s0[e]["h1"] + 70
        # persentil dari tahun latih saja: mengubah hujan tahun uji tidak menggeser batas
        cu = {"p": [x if tahun_dari(i) in LATIH else x + 500 for i, x in enumerate(c["p"])], "im": c["im"], "sm": c["sm"]}
        assert persentil_batas({(0, 0): c})[(0, 0)] == persentil_batas({(0, 0): cu})[(0, 0)]
        # bangun(): baris benar; frek_dibi ekspansif: nilai baris tahun y tidak bergantung pada label tahun y
        kab = "32|X"
        ev = {"banjir": {kab: {e for e in hari if tahun_dari(e) == 2016 and e % 20 == 0}}, "longsor": {}}
        ev2 = {"banjir": {kab: ev["banjir"][kab] | {e for e in hari if tahun_dari(e) == 2017 and e % 7 == 0}}, "longsor": {}}
        sk = {kab: {(0, 0): [0.5, 0.5]}}
        cua = {(0, 0): c}
        pers = persentil_batas(cua)
        awal = 0.004
        penuh, eks = frekuensi(ev, [kab], awal)
        penuh2, eks2 = frekuensi(ev2, [kab], awal)
        assert eks[kab][2016] == eks2[kab][2016] == awal               # tahun latih pertama = laju pra-latih, tanpa label 2016
        assert eks[kab][2017] == eks2[kab][2017] > awal                # 2017 hanya melihat 2016, bukan label 2017
        assert eks[kab][2018] != eks2[kab][2018]                       # 2018 melihat 2017: label 2017 boleh masuk tahun SESUDAHNYA
        B = bangun(cua, sk, [kab], ev, [2016, 2017], pers, penuh, eks)
        B2 = bangun(cua, sk, [kab], ev2, [2016, 2017], pers, penuh2, eks2)
        fk = FITUR.index("frek_dibi")
        assert [x[fk] for x in B["X"]] == [x[fk] for x in B2["X"]], "frek_dibi baris tahun y bergantung pada label tahun y"
        assert sum(B2["y"]) > sum(B["y"])                              # label memang beda, fitur tidak
        assert len(B["y"]) == len(B["X"]) == len(B["level"]) and sum(B["y"]) == len(ev["banjir"][kab]) and set(B["tahun"]) == {2016, 2017}
        assert all(len(x) == len(FITUR) for x in B["X"])
        i = [j for j, t in enumerate(B["tahun"]) if t == 2016][0]
        assert B["X"][i][fk] == awal
        # laju_awal: hanya 2008-2015 yang dihitung
        bar = [[["banjir"], "32", "X", "2010-01-01", 1], [["banjir"], "32", "X", "2010-01-01", 1], [["bandang"], "32", "X", "2012-05-05", 2],
               [["banjir"], "32", "X", "2016-01-01", 1], [["longsor"], "32", "X", "2011-01-01", 1]]
        assert abs(laju_awal(bar, ["32|X"]) - 2 / 2922) < 1e-12
        # kontingensi, alarm sebanyak, vonis
        assert kontingensi([1, 1, 0, 0, 1], [1, 0, 1, 0, 0], range(5)) == [1, 2, 1, 1]
        assert alarm_sebanyak([0.1, 0.9, 0.5, 0.9], 2) == [False, True, False, True]   # seri 0,9 dan 0,9: dua-duanya masuk
        assert sum(alarm_sebanyak([0.5] * 10, 3)) == 3 and seri_ambang([0.5] * 10, 3) == 10 and seri_ambang([0.9, 0.5, 0.5, 0.1], 2) == 2
        # seri dipecah acak, bukan menurut indeks (indeks awal tidak selalu menang) dan deterministik
        seri = alarm_sebanyak([0.5] * 200, 50)
        assert seri == alarm_sebanyak([0.5] * 200, 50) and not all(seri[:50]) and sum(seri) == 50
        # latih LR+GBDT+Platt di data sintetis ber-sinyal, ekspor pohon datar identik dengan prediksi_gbdt
        r = random.Random(1)
        X = [[r.random(), r.random(), r.random()] for _ in range(1500)]
        y = [1 if r.random() < 0.02 + 0.5 * (x[0] > 0.8) else 0 for x in X]
        m = G.latih_gbdt(X, y, [1.0] * len(X), pohon=20, dalam=2, lr=0.1)
        m2 = json.loads(json.dumps(m))
        assert all(abs(skor_gbdt(m2, [x])[0] - math.log(G.prediksi_gbdt(m, x) / (1 - G.prediksi_gbdt(m, x)))) < 1e-9 for x in X[:50])
        st = skor_bertahap(m, X[:30], {5, 20})
        assert all(abs(a - b) < 1e-9 for a, b in zip(st[20], skor_gbdt(m, X[:30])))
        z = skor_gbdt(m, X)
        pl = platt(z, y)
        pp = pakai_platt(pl, z)
        assert G.auc(pp, y) > 0.7 and abs(sum(pp) / len(pp) - sum(y) / len(y)) < 0.01, (G.auc(pp, y), sum(pp) / len(pp))
        # penilaian() end-to-end: model sempurna mengalahkan aturan acak pada ETS; vonis bekerja
        kabs_ = [f"k{i}" for i in range(8)]
        r = random.Random(2)
        kabs_ = [f"32|k{i}" for i in range(8)]
        Bs = {"kab": [], "tahun": [], "bulan": [], "e": [], "X": [], "y": [], "level": []}
        for k in kabs_:
            for t in (2022, 2023):
                for _ in range(300):
                    yy = 1 if r.random() < 0.05 else 0
                    Bs["kab"].append(k); Bs["tahun"].append(t); Bs["bulan"].append(1); Bs["e"].append(len(Bs["y"]) % 400); Bs["X"].append([]); Bs["y"].append(yy)
                    Bs["level"].append(2 if (yy and r.random() < 0.3) or r.random() < 0.1 else 0)
        sempurna = [0.9 if v else 0.04 for v in Bs["y"]]
        klim_ = [sum(Bs["y"]) / len(Bs["y"])] * len(Bs["y"])
        pen = penilaian(Bs, sempurna, klim_, klim_, [0.05 + 0.2 * (l >= 2) for l in Bs["level"]], ulang=200)
        assert "d_ets_model_vs_aturan_pulau_minggu" in pen["siaga"] and pen["siaga"]["seri_di_ambang"]["klimatologi"] == len(Bs["y"])
        assert pen["waspada"]["alarm"] == pen["siaga"]["alarm"] and pen["waspada"]["model"]["pod"] == 1.0
        assert pen["waspada"]["d_ets_model_vs_aturan"]["ci"][0] > 0 and pen["probabilitas"]["model"]["bss_ci"][0] > 0.5
        v = vonis(pen)
        assert v["lulus"] and len(v["rincian"]) == 8, v
        for lawan in ("aturan", "lr", "klimatologi"):   # tiap syarat dETS melawan tiap pembanding, di tiap level, bisa menggagalkan
            for nama in LEVEL_ALARM:
                rusak = {**pen, nama: {**pen[nama], "d_ets_model_vs_" + lawan: {"nilai": 0, "ci": [-0.01, 0.02]}}}
                assert not vonis(rusak)["lulus"] and not vonis(rusak)["rincian"][f"dETS_{nama}_vs_{lawan}"]
        assert not vonis({**pen, "probabilitas": {**pen["probabilitas"], "model": {**pen["probabilitas"]["model"], "bss_ci": [-0.01, 0.9]}}})["lulus"]
        assert not vonis({**pen, "probabilitas": {**pen["probabilitas"], "lr": {**pen["probabilitas"]["lr"], "auc": 1.1}}})["lulus"]
        # kalibrasi pembanding: Platt identik dengan perlakuan model (laju rata-rata terjaga)
        z0 = [logit(0.02 + 0.3 * v_) for v_ in y[:1500]]
        pl0 = platt(z0, y)
        assert abs(sum(pakai_platt(pl0, z0)) / 1500 - sum(y) / 1500) < 0.01
        # model yang hanya mengulang klimatologi tidak lulus
        pen2 = penilaian(Bs, klim_, klim_, klim_, [0.05 + 0.2 * (l >= 2) for l in Bs["level"]], ulang=200)
        assert not vonis(pen2)["lulus"]
    finally:
        ub.AWAL, ub.AKHIR = simpan_a, simpan_b
    print("ok model_kab")


if __name__ == "__main__":
    perintah = sys.argv[1:]
    if perintah == ["uji"]:
        uji()
    elif perintah == ["ambil"]:
        sys.exit(ambil())
    elif perintah == ["latih"]:
        latih()
    elif perintah == ["buka"]:
        buka()
    else:
        sys.exit(__doc__)
