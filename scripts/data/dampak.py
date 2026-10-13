"""Dampak karhutla musim berjalan -> public/data/dampak.json (tab "Dampak"). stdlib saja, dijalankan harian.

Pakai:  python3 scripts/data/dampak.py       hitung dari berkas public/data/*.json yang sudah ada (tanpa jaringan)
        python3 scripts/data/dampak.py uji   uji invarian dengan data buatan

Semua angka di sini PERKIRAAN untuk perencanaan, bukan neraca resmi. Rujukan, asumsi, dan rentang ditulis di
dict SUMBER dan ikut tersimpan di json supaya halaman bisa menampilkannya apa adanya.
"""
import datetime as dt, json, math, os, re, sys
from collections import defaultdict

sys.path.insert(0, os.path.dirname(__file__))
from posko import km
from wilayah import PRIORITAS

AKAR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
D = os.path.join(AKAR, "public/data")
WIB = dt.timezone(dt.timedelta(hours=7))

# ------------------------------------------------------------------ rujukan & asumsi (semua angka ketikan tangan ada di sini)
# World Bank (2016) The Cost of Fire, Indonesia Sustainable Landscapes Knowledge Note 1, tabel "Estimated losses and damages
# from forest fires and haze, June-October 2015 (USD millions)", 8 provinsi, 2,425 juta ha (tabel luas per provinsi, BPPT/KLHK).
WB2015 = {"pertanian": 4839, "lingkungan_hayati": 287, "lingkungan_karbon": 3966, "kehutanan": 3931, "industri_tambang": 610,
          "perdagangan": 1333, "transportasi": 372, "pariwisata": 399, "kesehatan": 151, "pendidikan": 39, "pemadaman": 197}
WB2015_TOTAL, WB2015_HA = 16124, 2_425_000
# luas per jenis lahan 2015 (grafik "Hectares burned by land type", WB 2016) -> nilai per ha sektor lahan
WB2015_LAHAN = {"sawit": 505_887, "perkebunan": 72_763, "pangan": 346_039, "lainnya": 807_369}
WB2015_SUB = {"perkebunan": 3112, "pangan": 1727}  # baris Estate crops & Food crops (USD juta)
# World Bank (2019) Indonesia Economic Quarterly Des 2019, Box A.1: USD 5,2 miliar, 8 provinsi, Juni-Okt 2019.
# Basis luasnya tidak tunggal: 620.201 ha (resmi Jan-Sep, dikutip box) atau luas resmi KLHK setahun penuh (luas_resmi.json).
WB2019_USD, WB2019_HA_SEP = 5.2e9, 620_201
# ke Rupiah 2026. Kerugian ini terjadi di ekonomi Indonesia (ECLAC DaLA, nilai Rupiah yang dilaporkan dalam USD), jadi
# dikembalikan ke Rupiah dengan kurs tahun dasar yang dipakai Bank Dunia lalu dinaikkan dengan inflasi INDONESIA (BPS),
# bukan inflasi AS x kurs 2026 (cara lama melebihkan ~25%: depresiasi Rupiah 2015-2026 bukan kenaikan nilai kerugian).
# Kurs dasar: 2015 = IDR 221 triliun / USD 16.124 juta (WB 2016 hlm. 1) = 13.706; 2019 = 14.160 (IEQ Des 2019 Tabel A.4).
# Inflasi BPS Des-ke-Des 2016-2025: 3,02 3,61 3,13 2,72 1,68 1,87 5,51 2,61 1,57 2,92; 2026 = 9 bulan pada laju 2025.
KURS_DASAR = {"2015": 221e12 / 16_124e6, "2019": 14_160}
INFLASI_ID = {2016: 3.02, 2017: 3.61, 2018: 3.13, 2019: 2.72, 2020: 1.68, 2021: 1.87, 2022: 5.51, 2023: 2.61, 2024: 1.57, 2025: 2.92}
IHK_2026 = {t: math.prod(1 + v / 100 for y, v in INFLASI_ID.items() if y > int(t)) * (1 + INFLASI_ID[2025] / 100) ** 0.75
            for t in KURS_DASAR}
# CPI AS & kurs 2026 disimpan hanya sebagai pembanding (dampak.js lama menampilkannya)
CPI = {"2015": 237.0, "2019": 255.7, "2026": 330.8}
KURS = 16_500  # Rp per USD 2026 (pembanding saja)
# emisi: gambut = IPCC 2013 Wetlands Supplement Bab 2 (tanah organik tropis, kebakaran liar): konsumsi bahan bakar 353 (170-536)
# t bahan kering/ha; faktor emisi CO2 1.703 g/kg, CH4 21,0 g/kg. Tanah mineral = vegetasi: faktor emisi hutan tropis
# Andreae & Merlet (2001): CO2 1.580 g/kg, CH4 6,8 g/kg; konsumsi bahan bakar 10/30/80 t/ha = ASUMSI kami (semak..hutan sekunder).
# CH4 -> CO2e pakai GWP100 AR5 = 28.
GWP_CH4 = 28
GAMBUT_TDM = (170, 353, 536)
MINERAL_TDM = (10, 30, 80)
EF_GAMBUT = 1.703 + 0.021 * GWP_CH4   # t CO2e per t bahan kering
EF_MINERAL = 1.580 + 0.0068 * GWP_CH4
EMISI_NASIONAL_MT = 1800  # Mt CO2e/th, Komunikasi Nasional ke-2 RI (dikutip WB 2016)
# kesehatan: meta-analisis Wang dkk. (2025) Environ Res 273:121221 (45 studi): PM2.5 asap kebakaran per +10 ug/m3 ->
# kunjungan IGD pernapasan RR 1,04 (CI 95% 1,02-1,06). Menggantikan Aguilera dkk. (2021) Nat Commun 12:1493 (satu wilayah,
# California; rawat inap +1,3% s.d. +10% antar-definisi paparan, bukan selang kepercayaan; titik tengah 5% dulu pilihan kami).
# Dasar: prevalensi ISPA terdiagnosis nakes 1 bulan terakhir per provinsi (Riskesdas 2018 Tabel 5.1.1, kolom D; nasional 4,4%)
# -> per hari / 30. Provinsi pemekaran 2022 memakai induknya (Papua 10,5, Papua Barat 7,5).
RR10 = (1.02, 1.04, 1.06)
ISPA_HARIAN = 0.044 / 30
ISPA_PROV = {"11": 4.3, "12": 2.8, "13": 4.1, "14": 2.2, "15": 3.2, "16": 3.5, "17": 8.9, "18": 4.2, "19": 1.5, "21": 3.8,
             "31": 2.7, "32": 4.7, "33": 4.6, "34": 2.8, "35": 6.0, "36": 5.3, "51": 4.6, "52": 2.7, "53": 7.3, "61": 3.2,
             "62": 6.2, "63": 2.3, "64": 3.8, "65": 2.1, "71": 2.1, "72": 2.6, "73": 1.9, "74": 2.8, "75": 2.0, "76": 1.8,
             "81": 5.6, "82": 2.4, "91": 10.5, "92": 7.5, "93": 10.5, "94": 10.5, "95": 10.5, "96": 7.5}
PM_ACUAN, PM_BATAS = 15.0, 100.0  # pedoman WHO 24 jam; selisih dibatasi 100 ug/m3 (hubungan log-linear tidak diuji di atasnya)
ISPU = [15.5, 55.4, 150.4, 250.4]
RADIUS = (1, 5, 10)
LEVEL_DEKAT = 2  # kedekatan diukur ke kompleks berstatus "Siaga pemadaman awal" ke atas (api yang sedang perlu dipadamkan)

KOTA = [("Pekanbaru", 0.51, 101.45, "14"), ("Dumai", 1.67, 101.45, "14"), ("Jambi", -1.61, 103.61, "15"), ("Palembang", -2.98, 104.76, "16"),
        ("Pontianak", -0.03, 109.33, "61"), ("Ketapang", -1.85, 109.97, "61"), ("Palangka Raya", -2.21, 113.92, "62"), ("Sampit", -2.53, 112.95, "62"),
        ("Pangkalan Bun", -2.68, 111.62, "62"), ("Banjarmasin", -3.32, 114.59, "63"), ("Banjarbaru", -3.44, 114.83, "63"),
        ("Samarinda", -0.50, 117.15, "64"), ("Balikpapan", -1.24, 116.85, "64"), ("Merauke", -8.49, 140.40, "93"), ("Kupang", -10.17, 123.60, "53"),
        ("Medan", 3.59, 98.67, "12"), ("Padang", -0.95, 100.35, "13"), ("Batam", 1.13, 104.05, "21"), ("Tanjung Pinang", 0.92, 104.45, "21"),
        ("Bengkulu", -3.80, 102.27, "17"), ("Bandar Lampung", -5.43, 105.26, "18"), ("Pangkalpinang", -2.13, 106.11, "19"),
        ("Jakarta", -6.20, 106.85, "31"), ("Tarakan", 3.30, 117.60, "65"), ("Jayapura", -2.53, 140.70, "91"), ("Manokwari", -0.86, 134.06, "92"),
        ("Ambon", -3.70, 128.17, "81"), ("Makassar", -5.14, 119.42, "73"), ("Kendari", -3.97, 122.51, "74"), ("Manado", 1.47, 124.84, "71")]
TETANGGA = [("Singapura", 1.35, 103.82, "Singapura"), ("Johor Bahru", 1.49, 103.74, "Malaysia"), ("Melaka", 2.19, 102.25, "Malaysia"),
            ("Kuala Lumpur", 3.14, 101.69, "Malaysia"), ("George Town", 5.41, 100.33, "Malaysia"), ("Kuching", 1.55, 110.35, "Malaysia"),
            ("Sibu", 2.29, 111.83, "Malaysia"), ("Miri", 4.40, 113.99, "Malaysia"), ("Kota Kinabalu", 5.98, 116.07, "Malaysia"),
            ("Bandar Seri Begawan", 4.89, 114.94, "Brunei"), ("Hat Yai", 7.01, 100.47, "Thailand"), ("Dili", -8.56, 125.57, "Timor-Leste")]

KAT = {"Perusahaan perkebunan": "konsesi_sawit", "Pemegang PBPH (hutan alam)": "konsesi_hph", "Pemegang konsesi": "konsesi_lain",
       "BKSDA / Balai Taman Nasional": "konservasi", "Pemerintah daerah (KPH/dinas kehutanan)": "lindung",
       "KPH / pemegang PBPH": "hutan_produksi", "Desa / camat / bupati": "apl"}


# ------------------------------------------------------------------ fungsi murni
def mulai_musim(hari):
    return dt.date(hari.year, 6, 1)


def rp(usd, tahun):
    """USD tahun dasar -> Rupiah 2026: kurs tahun dasar (yang dipakai Bank Dunia) x inflasi Indonesia sampai 2026."""
    return usd * KURS_DASAR[tahun] * IHK_2026[tahun]


def per_ha(ha_resmi_2019):
    """Biaya kerusakan & kerugian per ha (USD): (rendah, tengah, tinggi, tahun dasar masing-masing)."""
    return [(WB2019_USD / ha_resmi_2019, "2019"), (WB2015_TOTAL * 1e6 / WB2015_HA, "2015"), (WB2019_USD / WB2019_HA_SEP, "2019")]


def tambah_ispa(n, pm, rr10, dasar=ISPA_HARIAN):
    """Kunjungan ISPA tambahan per hari untuk n jiwa pada PM2.5 rata-rata 24 jam pm (ug/m3), log-linear, selisih dibatasi
    PM_BATAS. dasar = peluang kunjungan ISPA per orang per hari (ISPA_PROV/100/30)."""
    d = min(max(0.0, pm - PM_ACUAN), PM_BATAS)
    return n * dasar * (math.exp(math.log(rr10) * d / 10) - 1)


def kelas_pm(v):
    return sum(v > a for a in ISPU)


def jarak_kompleks(lat, lon, k):
    """km dari titik ke tepi kompleks (lingkaran seluas kompleks di titik beratnya); 0 bila di dalam."""
    return max(0.0, km(lat, lon, k["lat"], k["lon"]) - k["r"])


RADIUS_ASAP, AMBANG_ASAP = 300.0, 25.0


def arah(la1, lo1, la2, lo2):
    """arah kompas (derajat) dari titik 1 ke titik 2."""
    y = math.sin(math.radians(lo2 - lo1)) * math.cos(math.radians(la2))
    x = math.cos(math.radians(la1)) * math.sin(math.radians(la2)) - math.sin(math.radians(la1)) * math.cos(math.radians(la2)) * math.cos(math.radians(lo2 - lo1))
    return (math.degrees(math.atan2(y, x)) + 360) % 360


def asap_api(lat, lon, kompleks, radius=RADIUS_ASAP):
    """Seberapa besar asap kebakaran bisa mencapai titik ini: jumlah titik panas 24 jam kompleks dalam RADIUS_ASAP km, dibobot
    jarak (1 - d/R) dan arah angin di kompleks (asap bergerak ke wd + 180; selisih <= 60 derajat bobot penuh, 60-120 setengah,
    selebihnya 0; dalam 50 km dihitung penuh apa pun arahnya). Di atas AMBANG_ASAP = asap karhutla; di bawahnya PM2.5 tinggi
    kemungkinan dari polusi kota/industri, bukan kebakaran. ponytail: tanpa model transpor; ganti dengan CAMS GFAS bila tersedia."""
    tot, dekat = 0.0, None
    for k in kompleks:
        d = km(lat, lon, k["lat"], k["lon"])
        if d > radius:
            continue
        dekat = d if dekat is None else min(dekat, d)
        w = 1.0
        if d > 50 and k.get("wd") is not None:
            beda = abs((arah(k["lat"], k["lon"], lat, lon) - (k["wd"] + 180)) % 360)
            beda = min(beda, 360 - beda)
            w = 1.0 if beda <= 60 else 0.5 if beda <= 120 else 0.0
        tot += (k.get("n24") or 0) * w * (1 - d / radius)
    return round(tot, 1), dekat and round(dekat)


def angka_id(s, ribu=False):
    v = float(s.replace(".", "").replace(",", "."))
    return int(v * 1000) if ribu else int(v)


def ispa_berita(judul):
    """Jumlah kasus ISPA yang disebut di judul, mis. '52.483 Kasus', '17 Ribu', '22 Orang Sehari'. None bila tidak ada."""
    if not re.search(r"\bispa\b", judul, re.I):
        return None
    m = re.search(r"(\d{1,3}(?:\.\d{3})+|\d+(?:,\d+)?)\s*(ribu|rb)?\s*(?:kasus|orang|pasien|warga|penderita|jiwa)?", judul, re.I)
    hits = [(angka_id(a, bool(r)), r) for a, r in re.findall(r"(\d{1,3}(?:\.\d{3})+|\d+(?:,\d+)?)\s*(ribu|rb)?\s*(?=kasus|orang|pasien|warga|penderita|jiwa|ribu)", judul, re.I)]
    hits += [(angka_id(a, True), "ribu") for a in re.findall(r"(\d+(?:,\d+)?)\s*ribu", judul, re.I)]
    v = [x for x, _ in hits if x > 0]
    return max(v) if v else (None if not m else None)


SEKOLAH = r"sekolah|siswa|pelajar|belajar|kbm|pjj|\bpaud\b|\bsd\b|\bsmp\b|\bsma\b"
TUTUP = r"libur|diliburkan|daring|dari rumah|\bpjj\b|\bbdr\b|tutup|ditutup|dipangkas|ditiadakan|dihentikan|pulang lebih awal|online|jarak jauh|penyesuaian"


def sekolah_berita(judul):
    t = judul.lower()
    return bool(re.search(SEKOLAH, t) and re.search(TUTUP, t) and re.search(r"asap|karhutla|kabut|ispu|udara", t))


GAMBUT_2015 = 0.33  # porsi gambut luas terbakar 2015 (WB 2016); 2019 = 0,44 (WB IEQ Des 2019)


def porsi_gambut(pk):
    """Porsi gambut (rendah, tengah, tinggi). Bendera gambut kompleks (titik berat/20 titik pertama di peta gambut) melebih-lebihkan,
    jadi ia dipakai sebagai batas atas; batas bawah = porsi 2015; tengah = rata-rata keduanya."""
    lo, hi = sorted((GAMBUT_2015, pk))
    return lo, (lo + hi) / 2, hi


def angka(v):
    """BNPB campur number dan teks Indonesia ('22.790,83')."""
    if isinstance(v, (int, float)):
        return v
    try:
        return float(str(v).replace(".", "").replace(",", "."))
    except ValueError:
        return None


def rentang_rasio(xs):
    xs = sorted(xs)
    if len(xs) < 4:
        return None
    q = lambda p: xs[min(len(xs) - 1, int(p * (len(xs) - 1) + .5))]
    return q(.25), q(.75)


def luas_musim(modis, satelit, bulan, tahun):
    """Luas terbakar musim berjalan per provinsi dari jumlah titik MODIS x rasio ha/titik (MCD64A1 / MODIS, 2002-tahun lalu).
    -> {prov: {titik, rasio, ha, lo, hi}}"""
    th = [t for t in satelit["tahun"] if int(t) < int(tahun) - 1]  # tahun terakhir satelit belum final
    tot_ha = tot_n = 0
    semua, per = [], {}
    for p, v in satelit["ha"].items():
        if p not in modis["prov"]:
            continue
        pasang = [(v[satelit["tahun"].index(t)], sum(modis["prov"][p][t])) for t in th if t in modis["prov"][p]]
        ha, n = sum(a for a, _ in pasang), sum(b for _, b in pasang)
        if n:
            per[p] = (ha / n, rentang_rasio([a / b for a, b in pasang if b >= 200]))
            tot_ha, tot_n = tot_ha + ha, tot_n + n
            semua += [a / b for a, b in pasang if b >= 200]
    r_nas, rg_nas = tot_ha / tot_n, rentang_rasio(semua)
    out = {}
    for p, v in modis["prov"].items():
        n = sum(v.get(tahun, [0] * 12)[bulan - 1:])
        if not n:
            continue
        r, rg = per.get(p, (r_nas, rg_nas))
        lo, hi = rg or rg_nas or (r, r)
        lo, hi = min(lo, r), max(hi, r)
        out[p] = {"titik": n, "rasio": round(r, 1), "ha": round(n * r), "lo": round(n * lo), "hi": round(n * hi)}
    return out, round(r_nas, 1)


# ------------------------------------------------------------------ jalan
def baca(n, d=None):
    try:
        return json.load(open(os.path.join(D, n)))
    except Exception:
        return d


def main():
    kini = dt.datetime.now(WIB)
    m0 = mulai_musim(kini.date())
    kl = [f["properties"] for f in baca("kluster.json")["features"]]
    aktif = [{"id": p["id"], "lat": p["lat"], "lon": p["lon"], "prov": p["prov"], "level": p["level"], "luas": p.get("luas") or 0,
              "r": math.sqrt((p.get("luas") or 0) / 100 / math.pi), "kab": p.get("kab")} for p in kl if p.get("level", 0) >= LEVEL_DEKAT]
    asap, pen, desa, fas = baca("asap.json"), baca("penduduk.json"), baca("osm/desa.json", {}), baca("fasilitas.json", [])
    berita = baca("berita.json", {"artikel": []})
    out = {"dibuat": kini.isoformat(timespec="minutes"), "mulai_musim": m0.isoformat()}

    # --- 1 & 3 & 9: udara, kesehatan, kota, lintas batas
    hari = asap["hari"] if asap else []
    pm_sel = {(r[0], r[1]): r[2] for r in asap["grid"]} if asap else {}
    sel = asap["sel"] if asap else 1
    pm_di = lambda la, lo: pm_sel.get((math.floor(la / sel) * sel + sel / 2, math.floor(lo / sel) * sel + sel / 2))
    # kelas ISPU dan fungsi risiko berbasis rata-rata 24 jam: pakai kolom pm25_rata (asap.py) bila ada; berkas lama -> maks/jam
    pm24_sel = {(r[0], r[1]): r[6] for r in asap["grid"] if len(r) > 6} if asap else {}
    pm24_di = (lambda la, lo: pm24_sel.get((math.floor(la / sel) * sel + sel / 2, math.floor(lo / sel) * sel + sel / 2))) if pm24_sel else pm_di
    semua_k = [{"lat": p["lat"], "lon": p["lon"], "n24": p.get("n24") or 0, "wd": p.get("wd")} for p in kl]
    api_sel = {}
    def kena_api(la, lo):
        c = (round(la, 1), round(lo, 1))
        if c not in api_sel:
            api_sel[c] = asap_api(la, lo, semua_k)[0] >= AMBANG_ASAP
        return api_sel[c]
    kes = defaultdict(lambda: {"jiwa": [[0] * 5 for _ in hari], "ispa": [[0.0] * 3 for _ in hari]})
    for la, lo, n, p in pen["grid"]:
        pm = pm24_di(la, lo)
        if not pm or not p or not kena_api(la, lo):  # hanya penduduk yang udaranya dipengaruhi asap kebakaran
            continue
        dasar = ISPA_PROV.get(p[:2], ISPA_HARIAN * 3000) / 100 / 30
        for i, v in enumerate(pm):
            if v is None:
                continue
            kes[p]["jiwa"][i][kelas_pm(v)] += n
            for j, rr in enumerate(RR10):
                kes[p]["ispa"][i][j] += tambah_ispa(n, v, rr, dasar)
    for p in kes:
        kes[p]["ispa"] = [[round(x) for x in d] for d in kes[p]["ispa"]]
    out["udara"] = {"hari": hari, "dibuat": asap and asap["dibuat"], "prov": dict(kes), "pm_basis": "rata24" if pm24_sel else "maks",
                    "kota": [{"nama": n, "lat": la, "lon": lo, "prov": p, "pm": pm_di(la, lo), "skor_api": a[0], "api_km": a[1], "karhutla": a[0] >= AMBANG_ASAP}
                             for n, la, lo, p in KOTA if pm_di(la, lo) for a in [asap_api(la, lo, semua_k)]],
                    "aturan_asap": f"titik panas 24 jam kompleks <= {RADIUS_ASAP:.0f} km, dibobot jarak dan arah angin; >= {AMBANG_ASAP:.0f} = asap karhutla",
                    "tetangga": [{"nama": n, "negara": ng, "lat": la, "lon": lo, "pm": pm_di(la, lo), "skor_api": a[0], "karhutla": a[0] >= AMBANG_ASAP}
                                 for n, la, lo, ng in TETANGGA if pm_di(la, lo) for a in [asap_api(la, lo, semua_k, 900)]]}  # asap lintas batas menempuh ratusan km
    art = berita.get("artikel", [])
    ispa = [{"tgl": a["tgl"][:10], "jumlah": ispa_berita(a["judul"]), "judul": a["judul"], "url": a["url"], "media": a.get("sumber"), "prov": a.get("prov") or []}
            for a in art if a["tgl"][:10] >= m0.isoformat() and ispa_berita(a["judul"])]
    out["ispa_berita"] = sorted(ispa, key=lambda x: x["tgl"], reverse=True)[:60]
    out["sekolah_berita"] = [{"tgl": a["tgl"][:10], "judul": a["judul"], "url": a["url"], "media": a.get("sumber"), "prov": a.get("prov") or []}
                             for a in sorted(art, key=lambda a: a["tgl"], reverse=True) if a["tgl"][:10] >= m0.isoformat() and sekolah_berita(a["judul"])][:60]
    ada_asal = any("asal" in a for a in art)
    intl = [a for a in art if (a.get("asal") == "internasional") if ada_asal] if ada_asal else \
        [a for a in art if re.search(r"malaysia|singapura|singapore|brunei|jerebu|transboundary", a["judul"], re.I)]
    per_hari = defaultdict(int)
    for a in intl:
        per_hari[a["tgl"][:10]] += 1
    out["internasional"] = {"metode": "asal" if ada_asal else "kata kunci", "harian": dict(sorted(per_hari.items())),
                            "contoh": [{"tgl": a["tgl"][:10], "judul": a["judul"], "url": a["url"], "media": a.get("sumber")}
                                       for a in sorted(intl, key=lambda a: a["tgl"], reverse=True)[:40]]}

    # --- 4 & 5: kedekatan desa, penduduk, sekolah, faskes ke kompleks aktif
    grid = defaultdict(list)
    for k in aktif:
        grid[(math.floor(k["lat"] * 10), math.floor(k["lon"] * 10))].append(k)

    def terdekat(la, lo):
        b, gy, gx = None, math.floor(la * 10), math.floor(lo * 10)
        for dy in range(-2, 3):
            for dx in range(-2, 3):
                for k in grid.get((gy + dy, gx + dx), ()):
                    d = jarak_kompleks(la, lo, k)
                    if b is None or d < b[0]:
                        b = (d, k)
        return b

    dekat = defaultdict(lambda: {"desa": [0, 0, 0], "jiwa": [0, 0, 0], "sekolah": [0, 0, 0], "faskes": [0, 0, 0], "sekolah_tidak_sehat": 0})
    daftar_desa, daftar_sek = [], []
    for p, rows in desa.items():
        for la, lo, kode, nama in rows:
            t = terdekat(la, lo)
            if t and t[0] <= RADIUS[-1]:
                for i, r in enumerate(RADIUS):
                    dekat[p]["desa"][i] += t[0] <= r
                daftar_desa.append({"nama": nama, "kode": kode, "prov": p, "lat": la, "lon": lo, "km": round(t[0], 1), "kompleks": t[1]["id"], "level": t[1]["level"]})
    for x in fas:
        jenis = "sekolah" if x["t"] == "sekolah" else "faskes"
        pm = pm_di(x["lat"], x["lon"])
        if jenis == "sekolah" and pm and pm[0] is not None and pm[0] > ISPU[1]:
            dekat[x["prov"]]["sekolah_tidak_sehat"] += 1
        t = terdekat(x["lat"], x["lon"])
        if t and t[0] <= RADIUS[-1]:
            for i, r in enumerate(RADIUS):
                dekat[x["prov"]][jenis][i] += t[0] <= r
            if jenis == "sekolah" and t[0] <= 5:
                daftar_sek.append({"nama": x["nama"], "prov": x["prov"], "lat": x["lat"], "lon": x["lon"], "km": round(t[0], 1), "kompleks": t[1]["id"],
                                   "level": t[1]["level"], "pm": pm})
    # penduduk: sel 0,02 derajat (~2,2 km) diberi kepadatan sel WorldPop 0,25 derajat induknya
    pad, prov_sel = defaultdict(float), {}
    for la, lo, n, p in pen["grid"]:
        pad[(la, lo)] += n
        if p and n > prov_sel.get((la, lo), ("", 0))[1]:
            prov_sel[(la, lo)] = (p, n)
    luas_sel = lambda la: (0.25 * 111.32) ** 2 * math.cos(math.radians(la))
    s, minj = 0.02, {}
    for k in aktif:
        jang = k["r"] + RADIUS[-1]
        dy, dx = jang / 111.32, jang / (111.32 * math.cos(math.radians(k["lat"])))
        for iy in range(math.floor((k["lat"] - dy) / s), math.floor((k["lat"] + dy) / s) + 1):
            for ix in range(math.floor((k["lon"] - dx) / s), math.floor((k["lon"] + dx) / s) + 1):
                la, lo = (iy + .5) * s, (ix + .5) * s
                d = max(0.0, math.hypot((la - k["lat"]) * 111.32, (lo - k["lon"]) * 111.32 * math.cos(math.radians(k["lat"]))) - k["r"])
                if d <= RADIUS[-1] and d < minj.get((iy, ix), 99):
                    minj[(iy, ix)] = d
    for (iy, ix), d in minj.items():
        la, lo = (iy + .5) * s, (ix + .5) * s
        ib = (math.floor(la / .25) * .25 + .125, math.floor(lo / .25) * .25 + .125)
        if ib not in pad or ib not in prov_sel:
            continue
        n = pad[ib] / luas_sel(ib[0]) * (s * 111.32) ** 2 * math.cos(math.radians(la))
        for i, r in enumerate(RADIUS):
            if d <= r:
                dekat[prov_sel[ib][0]]["jiwa"][i] += n
    for p in dekat:
        dekat[p]["jiwa"] = [round(x) for x in dekat[p]["jiwa"]]
    out["dekat"] = {"radius_km": list(RADIUS), "prov": dict(dekat), "kompleks_aktif": len(aktif), "level_min": LEVEL_DEKAT,
                    "desa": sorted(daftar_desa, key=lambda x: (x["km"], -x["level"]))[:80],
                    "sekolah": sorted(daftar_sek, key=lambda x: (x["km"], -x["level"]))[:80]}

    # --- 6: lahan terbakar (kompleks aktif) & luas musim berjalan
    kat, gambut, kat_prov = defaultdict(float), defaultdict(float), defaultdict(lambda: defaultdict(float))
    lindung, perusahaan = [], defaultdict(lambda: {"luas": 0.0, "kompleks": [], "jenis": ""})
    for p in kl:
        if p.get("level", 0) < 1:
            continue
        L = p.get("luas") or 0
        t = p.get("tanggung") or ["Desa / camat / bupati", ""]
        c = KAT.get(t[0], "apl")
        kat[c] += L
        kat_prov[p["prov"]][c] += L
        gambut["gambut" if p.get("gambut") else "mineral"] += L
        if c in ("konservasi", "lindung"):
            lindung.append({"id": p["id"], "nama": t[1], "prov": p["prov"], "kab": p.get("kab"), "luas": L, "level": p["level"], "gambut": p.get("gambut")})
        if c.startswith("konsesi") and t[1]:
            q = perusahaan[t[1]]
            q["luas"] += L
            q["kompleks"].append(p["id"])
            q["jenis"] = c
    tot = sum(kat.values()) or 1
    bagi = {k: v / tot for k, v in kat.items()}
    bagi_gambut = gambut["gambut"] / (sum(gambut.values()) or 1)
    musim, r_nas = luas_musim(baca("sejarah_modis.json"), baca("luas_satelit.json"), m0.month, str(m0.year))
    H = [sum(v[k] for v in musim.values()) for k in ("lo", "ha", "hi")]
    bn = baca("bnpb.json", {"rows": []})
    out["lahan"] = {"kompleks_ha": round(tot), "kategori_ha": {k: round(v) for k, v in kat.items()}, "gambut_ha": {k: round(v) for k, v in gambut.items()},
                    "kategori_prov": {p: {k: round(v) for k, v in d.items()} for p, d in kat_prov.items()},
                    "lindung": sorted(lindung, key=lambda x: -x["luas"])[:40],
                    "perusahaan": sorted([{"nama": k, **v, "luas": round(v["luas"]), "kompleks": v["kompleks"][:12]} for k, v in perusahaan.items()], key=lambda x: -x["luas"])[:40]}
    out["musim"] = {"mulai": m0.isoformat(), "ha": H, "prov": musim, "rasio_nasional": r_nas,
                    "bnpb": {r["Provinsi"]: angka(r.get("Lahan Terbakar Indikatif (Ha)")) for r in bn["rows"]}, "bnpb_waktu": bn.get("updatedAt")}

    # --- 7: emisi
    pgs = porsi_gambut(bagi_gambut)
    em = [h * (pg * g * EF_GAMBUT + (1 - pg) * m * EF_MINERAL) / 1e6 for h, g, m, pg in zip(H, GAMBUT_TDM, MINERAL_TDM, pgs)]
    pg = pgs[1]
    out["emisi"] = {"mt_co2e": [round(x, 1) for x in em], "porsi_gambut": [round(x, 3) for x in pgs], "porsi_gambut_kompleks": round(bagi_gambut, 3),
                    "nasional_mt_th": EMISI_NASIONAL_MT,
                    "hari_setara": [round(x / (EMISI_NASIONAL_MT / 365), 1) for x in em],
                    "gambut_mt": round(H[1] * pg * GAMBUT_TDM[1] * EF_GAMBUT / 1e6, 1), "mineral_mt": round(H[1] * (1 - pg) * MINERAL_TDM[1] * EF_MINERAL / 1e6, 1)}

    # --- 8: ekonomi lahan (nilai kerusakan & kerugian per ha jenis lahan, WB 2015)
    nilai = {"konsesi_sawit": WB2015_SUB["perkebunan"] * 1e6 / (WB2015_LAHAN["sawit"] + WB2015_LAHAN["perkebunan"]),
             "apl": WB2015_SUB["pangan"] * 1e6 / WB2015_LAHAN["pangan"],
             "kehutanan": WB2015["kehutanan"] * 1e6 / WB2015_LAHAN["lainnya"]}
    eko = {}
    for c, f in bagi.items():
        u = nilai["konsesi_sawit"] if c == "konsesi_sawit" else nilai["apl"] if c == "apl" else nilai["kehutanan"]
        eko[c] = {"porsi": round(f, 3), "ha": [round(h * f) for h in H], "usd_ha": round(u), "rp": [round(rp(h * f * u, "2015")) for h in H]}
    out["ekonomi"] = eko

    # --- 10: total kerugian per sektor
    ph = per_ha(sum(v[1] for v in baca("luas_resmi.json")["ha"].values()))
    tengah = ph[1][0]
    sektor = {}
    for k, v in WB2015.items():
        f = v / WB2015_TOTAL
        sektor[k] = [round(rp(H[i] * ph[i][0] * f, ph[i][1])) for i in range(3)]
    out["kerugian"] = {"sektor": sektor, "total": [sum(v[i] for v in sektor.values()) for i in range(3)], "usd_ha": [round(x) for x, _ in ph],
                       "dasar": [t for _, t in ph], "kurs": KURS, "cpi": CPI, "ha": H,
                       "kurs_dasar": {t: round(v) for t, v in KURS_DASAR.items()}, "ihk_2026": {t: round(v, 4) for t, v in IHK_2026.items()},
                       "rp_per_usd": {t: round(rp(1, t)) for t in KURS_DASAR}}

    out["asumsi"] = {"rr10": RR10, "ispa_harian": ISPA_HARIAN, "ispa_prov": ISPA_PROV, "pm_acuan": PM_ACUAN, "pm_batas": PM_BATAS, "gambut_tdm": GAMBUT_TDM, "mineral_tdm": MINERAL_TDM,
                     "ef_gambut": round(EF_GAMBUT, 3), "ef_mineral": round(EF_MINERAL, 3), "gwp_ch4": GWP_CH4, "nilai_usd_ha": {k: round(v) for k, v in nilai.items()},
                     "wb2015": WB2015, "wb2015_ha": WB2015_HA, "wb2019_usd": WB2019_USD, "wb2019_ha_sep": WB2019_HA_SEP}
    cek(out)
    json.dump(out, open(os.path.join(D, "dampak.json"), "w"), ensure_ascii=False, separators=(",", ":"))
    print(f"musim sejak {m0}: {H[1]:,.0f} ha ({H[0]:,.0f}-{H[2]:,.0f}); emisi {em[1]:,.0f} Mt CO2e; kerugian Rp{out['kerugian']['total'][1] / 1e12:,.1f} T"
          f" ({out['kerugian']['total'][0] / 1e12:,.1f}-{out['kerugian']['total'][2] / 1e12:,.1f}); {len(aktif)} kompleks aktif")


def cek(o):
    """Invarian keluaran: gagal = tidak menulis berkas."""
    for k in (o["musim"]["ha"], o["emisi"]["mt_co2e"], o["kerugian"]["total"]):
        assert k[0] <= k[1] <= k[2], f"rentang rendah<=tengah<=tinggi dilanggar: {k}"
    for p, d in o["dekat"]["prov"].items():
        for f in ("desa", "jiwa", "sekolah", "faskes"):
            assert d[f] == sorted(d[f]), f"{p} {f}: radius lebih besar harus >= radius kecil, dapat {d[f]}"
    for p, d in o["udara"]["prov"].items():
        for x in d["ispa"]:
            assert 0 <= x[0] <= x[1] <= x[2], f"{p}: ISPA tambahan harus naik dengan RR, dapat {x}"
    assert abs(sum(o["kerugian"]["sektor"][k][1] for k in o["kerugian"]["sektor"]) - o["kerugian"]["total"][1]) < len(WB2015), "jumlah sektor != total"
    assert abs(sum(v["porsi"] for v in o["ekonomi"].values()) - 1) < 0.01 or not o["ekonomi"], "porsi kategori lahan harus berjumlah 1"


def uji():
    k = [{"lat": 0.0, "lon": 0.0, "n24": 100, "wd": 270}]  # angin dari barat: asap ke timur
    assert asap_api(0, 1.0, k)[0] > AMBANG_ASAP, "kota 111 km searah angin harus kena asap"
    assert asap_api(0, -1.0, k)[0] == 0, "kota 111 km melawan arah angin tidak boleh dihitung kena asap"
    assert asap_api(0, 4.0, k)[0] == 0, "kota > 300 km tidak dihitung"
    assert asap_api(0, -0.3, k)[0] > 0, "dalam 50 km dihitung apa pun arah angin"
    assert sum(WB2015.values()) == WB2015_TOTAL, f"tabel WB 2015 harus berjumlah {WB2015_TOTAL}, dapat {sum(WB2015.values())}"
    lo, c, hi = per_ha(1_649_258)
    assert lo[0] < c[0] < hi[0], f"per ha harus rendah<tengah<tinggi: {lo[0]:.0f} {c[0]:.0f} {hi[0]:.0f}"
    assert 6000 < c[0] < 7000, f"WB 2015: 16.124 juta / 2,425 juta ha = 6.649 USD/ha, dapat {c[0]:.0f}"
    assert rp(1, "2015") > rp(1, "2019") > KURS, "USD lama harus lebih mahal dalam Rupiah 2026"
    # 1 USD 2015 = Rp13.706 (kurs WB) x IHK Des 2015->2026 (1,3255 x 1,0292^0,75 = 1,3545) = Rp18.565, bukan Rp23.030 (CPI AS x kurs 2026)
    assert abs(rp(1, "2015") - 18565) < 15 and abs(rp(1, "2019") - 16962) < 15, (rp(1, "2015"), rp(1, "2019"))
    assert abs(tambah_ispa(1e6, 25, 1.04, 0.022 / 30) - 1e6 * 0.022 / 30 * 0.04) < 1e-6, "dasar ISPA per provinsi harus dipakai"
    assert set(ISPA_PROV) >= {"14", "15", "16", "61", "62", "63", "64", "93"}, "provinsi prioritas wajib punya dasar ISPA"
    assert tambah_ispa(1e6, 10, 1.1) == 0 and tambah_ispa(1e6, PM_ACUAN, 1.1) == 0, "PM di bawah acuan WHO tidak boleh menambah ISPA"
    a, b = tambah_ispa(1e6, 60, 1.05), tambah_ispa(1e6, 120, 1.05)
    assert 0 < a < b, "ISPA tambahan harus naik dengan PM2.5"
    assert tambah_ispa(1e6, 500, 1.05) == tambah_ispa(1e6, PM_ACUAN + PM_BATAS, 1.05), "selisih PM harus dibatasi"
    assert abs(tambah_ispa(1e6, 25, 1.05) - 1e6 * ISPA_HARIAN * 0.05) < 1e-6, "+10 ug/m3 = +5% dasar"
    assert [kelas_pm(v) for v in (10, 30, 100, 200, 300)] == [0, 1, 2, 3, 4]
    k = {"lat": 0, "lon": 0, "r": 2.0}
    assert jarak_kompleks(0, 0.01, k) == 0, "titik di dalam kompleks berjarak 0"
    assert 8.9 < jarak_kompleks(0, 0.1, k) < 9.2, jarak_kompleks(0, 0.1, k)
    assert ispa_berita("Video: Imbas Karhutla, ISPA di Sumsel Tembus 52.483 Kasus Per September 2026") == 52483
    assert ispa_berita("Kabut Asap Palembang, Kasus ISPA Tembus 17 Ribu") == 17000
    assert ispa_berita("Pasien ISPA di Palangka Raya Tembus 22 Orang Sehari") == 22
    assert ispa_berita("Kenali Gejala ISPA dan Cara Mencegahnya") is None
    assert ispa_berita("Kasus DBD naik 300 kasus") is None, "bukan ISPA"
    assert sekolah_berita("Siswa Pekanbaru Kembali Belajar Daring, Imbas Asap Karhutla")
    assert sekolah_berita("Khawatir Asap Karhutla, 465 Sekolah di Kalsel Ajukan Penyesuaian Pembelajaran")
    assert not sekolah_berita("Siswa SMA juara lomba sains nasional"), "bukan penutupan sekolah"
    assert not sekolah_berita("Sekolah diliburkan karena banjir rob"), "bukan karena asap"
    # luas musim: rasio ha/titik dari data buatan; provinsi tanpa data satelit pakai rasio nasional
    modis = {"prov": {"62": {"2020": [0] * 6 + [100] * 6, "2021": [0] * 6 + [300] * 6, "2026": [0] * 5 + [10, 20, 30, 0, 0, 0, 0]},
                      "99": {"2026": [0] * 5 + [5, 0, 0, 0, 0, 0, 0]}}}
    sat = {"tahun": ["2020", "2021", "2022"], "ha": {"62": [6000, 36000, 0]}}
    m, r = luas_musim(modis, sat, 6, "2026")
    assert m["62"]["titik"] == 60 and m["62"]["rasio"] == r == 17.5, (m, r)
    assert m["99"]["ha"] == round(5 * 17.5), "provinsi tanpa satelit pakai rasio nasional"
    assert all(v["lo"] <= v["ha"] <= v["hi"] for v in m.values())
    assert porsi_gambut(0.66) == (0.33, 0.495, 0.66) and porsi_gambut(0.2) == (0.2, 0.265, 0.33), "porsi gambut harus terurut"
    assert angka("22.790,83") == 22790.83 and angka(1926.23) == 1926.23 and angka("-") is None
    # cek() harus menolak keluaran yang melanggar invarian
    buruk = {"musim": {"ha": [3, 2, 1]}, "emisi": {"mt_co2e": [1, 2, 3]}, "kerugian": {"total": [1, 2, 3], "sektor": {}}, "dekat": {"prov": {}},
             "udara": {"prov": {}}, "ekonomi": {}}
    try:
        cek(buruk)
        raise SystemExit("cek() harus menolak rentang terbalik")
    except AssertionError:
        pass
    print("uji dampak: lolos")


if __name__ == "__main__":
    uji() if sys.argv[1:] == ["uji"] else main()
