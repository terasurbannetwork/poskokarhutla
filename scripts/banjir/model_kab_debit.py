"""Debit sungai GloFAS sebagai fitur model banjir kabupaten-hari: M1 (dengan debit) lawan M0 (tanpa) -> data/raw/banjir/model_kab_debit/

Protokol DIBEKUKAN di PRAREG-DEBIT.md (disetujui pemilik 29 Okt 2026); berkas ini hanya melaksanakannya. Mengimpor model_kab.py dan
uji_balik.py TANPA mengubah isinya; konstanta yang ditambal dari luar (LATIH/VALIDASI/UJI, akhir data) ikut disidik.

Mode:
  pilih   pindai kisi 5x5 titik 0,05 derajat per sel (2.600 titik) di Flood API, 1-14 Feb 2023 dan 1-14 Agu 2023; titik dengan rata-rata
          median tertinggi per sel, kembar dibuang, median < 5 m3/s ditandai. Cache, lanjut bila putus. Menyalin sampel.json.
  ambil   debit harian 2016-01-01..2027-05-02 (atau kemarin) per titik terpilih + ERA5 2026-01-01..akhir (cache terpisah dari uji_balik).
          Berhenti rapi bila kuota habis; jalan ulang melanjutkan/menambah (data musim 2026/27 menyusul).
  latih   (butuh --ulang bila kandidat.json sudah ada; ditolak sesudah sia/buka dimulai) latih 2016-2023, validasi 2024-2025: kelompok (GBDT/LR) menurut logloss M0, M0 dan M1, Platt, MDE, sidik. Hanya metrik VALIDASI.
  sia     Uji A 2026-01..09, SEKALI, sesudah 2026-11-15: pemeriksaan kesia-siaan (hanya bisa menolak).
  buka    uji final A+B (2026-01..09 dan 2026-11..2027-04), SEKALI, sesudah 2027-06-01. (dijalankan pemilik, bukan pengerja)
  uji     swauji sintetis tanpa jaringan.
Jangkar luar: scripts/banjir/model_kab_debit.sidik = JSONL hanya-tambah, dilacak git, di luar sidik. latih/sia/buka menambah baris;
gerbang sia/buka membaca versi HEAD (harus sama dengan working tree), jadi commit berkas itu sesudah tiap mode. Sesudah sia dimulai,
`ambil` tidak menyentuh data <= 2026-10-31, hanya menambah sesudahnya. Peringatan debit None > 5% HANYA peringatan: tidak menghentikan
dan tidak mengubah vonis.
"""
import bisect, contextlib, datetime as dt, gzip, hashlib, json, math, os, random, statistics, subprocess, sys, time
from collections import defaultdict

DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, DIR)
from umum import KuotaHabis, MENTAH, ambil as unduh, baca, per_lokasi, simpan
from status import GESER
import uji_balik as ub
import model_kab as MK

G = MK.G
API = "https://flood-api.open-meteo.com/v1/flood"
GLOFAS = "Open-Meteo Flood API, model bawaan (GloFAS v4 seamless); tanpa parameter models"
PROTOKOL = os.path.join(DIR, "PRAREG-DEBIT.md")
OUT = os.path.join(MENTAH, "model_kab_debit")
KANDIDAT_ASAL = os.path.join(MENTAH, "model_kab", "kandidat.json")
DIBI_TGL = os.path.join(MENTAH, "dibi_tanggal.json")
SIDIK_JEJAK = os.path.join(DIR, "model_kab_debit.sidik")   # JSONL hanya-tambah, dilacak git, DI LUAR sidik
JEJAK_REPO = os.path.abspath(os.path.join(DIR, "..", ".."))
BATAS_BEKU = dt.date(2026, 10, 31)   # sesudah sia dimulai, ambil hanya boleh menambah data SESUDAH tanggal ini
DAYA_CATATAN = "hanya derau evaluasi pada alarm tetap; daya sebenarnya lebih rendah"
BATAS_KOSONG = 5.0   # persen debit None di jendela dinilai yang memicu PERINGATAN (hanya peringatan, bukan gerbang)


def J(nama):
    return os.path.join(OUT, nama)


# ------------------------------------------------------------------ konstanta (ditambal dari luar, ikut sidik)
MK.LATIH, MK.VALIDASI, MK.UJI = range(2016, 2024), range(2024, 2026), range(2026, 2028)
AKHIR_LATIH = ub.AKHIR                       # 2026-01-03: validasi s/d 2025-12-31 + e+1 + cadangan, sama dengan cache ERA5 uji_balik
AKHIR_SIA, AKHIR_BUKA = dt.date(2026, 10, 2), dt.date(2027, 5, 2)    # hari terakhir dinilai = akhir - 2
JENDELA_A, JENDELA_B = (dt.date(2026, 1, 1), dt.date(2026, 9, 30)), (dt.date(2026, 11, 1), dt.date(2027, 4, 30))
SIA_DARI, BUKA_DARI = dt.date(2026, 11, 15), dt.date(2027, 6, 1)
DEBIT_AWAL = dt.date(2016, 1, 1)
ERA5_AWAL = dt.date(2026, 1, 1)
ERA5_API = "https://archive-api.open-meteo.com/v1/archive"
PINDAI = {"feb": (dt.date(2023, 2, 1), dt.date(2023, 2, 14)), "agu": (dt.date(2023, 8, 1), dt.date(2023, 8, 14))}
LANGKAH, MIN_MEDIAN = 0.05, 5.0
ULANG, BIJI = 1000, 11
POHON_MAKS, HIPER = MK.POHON_MAKS, MK.HIPER
SKEMA = ("kab_musim", "pulau_minggu")
KELOMPOK_M0 = sorted(g for g in MK.KELOMPOK if g != "anteseden")
SUNGAI = ["q3", "q_pers", "q_naik"]
FITUR = MK.FITUR + SUNGAI
AKTIF0 = MK.aktif_dari(KELOMPOK_M0)
AKTIF1 = AKTIF0 + [FITUR.index(f) for f in SUNGAI]

KRITERIA = {
    "pertanyaan": "M1 (M0 + kelompok sungai q3, q_pers, q_naik) menambah keterampilan atas M0; satu kontras utama, resep dan sampel sama",
    "M0": "fitur model_kab.py tanpa kelompok anteseden",
    "pembagian": "latih 2016-2023, validasi 2024-2025, Uji A 2026-01-01..09-30 (hanya bisa menolak), Uji B 2026-11-01..2027-04-30",
    "alarm": "jumlah alarm sama dengan aturan status.py (>= Waspada, >= Siaga) pada periode yang dinilai; seri dipecah acak biji 11",
    "ci": "bootstrap 1000 ulangan biji 11, dua skema blok: kab x musim-tahun (Okt-Mar, Apr-Sep) dan pulau x minggu; batas bawah = yang lebih kecil",
    "sia": "dETS(M1-M0) Waspada titik <= 0 -> 'tidak terbukti', Uji B tidak dibuka; selain itu lanjut; tidak bisa meluluskan",
    "lulus": "batas bawah CI95 dETS(M1-M0) > 0 pada Waspada DAN Siaga, dan batas bawah CI95 selisih Brier skill (M1-M0) > 0",
    "tidak_lulus": "dETS(M1-M0) Waspada titik <= 0 atau batas atas CI95-nya < 0",
    "tidak_meyakinkan": "selain keduanya",
    "kelompok_model": "GBDT atau regresi logistik menurut logloss M0 di validasi; M1 memakai kelompok yang sama",
    "kalibrasi": "Platt di validasi untuk M0, M1, dan klimatologi (acuan Brier skill)",
    "fitur_sungai": "q3=log1p(maks debit e-1..e+1); q_pers=persentil maks itu terhadap debit harian sel pada LATIH; "
                    "q_naik=maks/max(median e-31..e-2; 0,1) dibatasi 50; kabupaten = maks atas sel",
    "titik": "kisi 5x5 per sel, rata-rata median 1-14 Feb dan 1-14 Agu 2023, kembar dibuang, median < 5 m3/s ditandai",
}


def sidik_kriteria():
    return hashlib.sha256(json.dumps(KRITERIA, sort_keys=True, ensure_ascii=False).encode()).hexdigest()[:16]


def tambal():
    return {"LATIH": [MK.LATIH[0], MK.LATIH[-1]], "VALIDASI": [MK.VALIDASI[0], MK.VALIDASI[-1]], "UJI": [MK.UJI[0], MK.UJI[-1]],
            "AWAL": str(ub.AWAL), "AKHIR_LATIH": str(AKHIR_LATIH), "AKHIR_SIA": str(AKHIR_SIA), "AKHIR_BUKA": str(AKHIR_BUKA),
            "JENDELA_A": [str(x) for x in JENDELA_A], "JENDELA_B": [str(x) for x in JENDELA_B], "MULAI": MK.MULAI, "GESER": GESER,
            "APIK": list(MK.APIK), "HIPER": HIPER, "HIPER_TETAP": MK.HIPER_TETAP, "POHON_MAKS": POHON_MAKS, "BIJI": BIJI, "ULANG": ULANG,
            "FITUR": FITUR, "AKTIF0": AKTIF0, "AKTIF1": AKTIF1, "PINDAI": {k: [str(x) for x in v] for k, v in PINDAI.items()},
            "MIN_MEDIAN": MIN_MEDIAN, "GLOFAS": GLOFAS}


@contextlib.contextmanager
def tambal_ub(awal=None, akhir=None):
    a, b = ub.AWAL, ub.AKHIR
    ub.AWAL, ub.AKHIR = awal or a, akhir or b
    try:
        yield
    finally:
        ub.AWAL, ub.AKHIR = a, b


def tgl(s):
    return dt.date.fromisoformat(s)


def hari_ke(d):
    return (d - ub.AWAL).days


# ------------------------------------------------------------------ sampel dan titik
def muat_sampel():
    """-> (kabs, sel [tuple], sk {kab: {(la, lo): [bahaya banjir, bahaya longsor]}}) dari sampel.json (dikunci, tidak dipilih ulang)."""
    s = baca(J("sampel.json"))
    if not s:
        sys.exit("sampel.json belum ada: jalankan `pilih`")
    return s["kab"], [tuple(x) for x in s["sel"]], {k: {(a, b): [c, d] for a, b, c, d in v} for k, v in s["sk"].items()}


def siapkan_sampel():
    if os.path.exists(J("sampel.json")):
        return
    asal = baca(KANDIDAT_ASAL)
    if not asal:
        sys.exit("model_kab/kandidat.json tidak ada: sampel tidak bisa dikunci")
    sk = ub.sel_per_kab()
    sel = sorted(tuple(x) for x in asal["sel"])
    cell = {c for k in asal["kab"] for c in sk[k]}
    if cell != set(sel):
        sys.exit("sel per kabupaten (hujan.json/bahaya.json) tidak cocok dengan kandidat.json: sampel tidak dikunci")
    simpan(J("sampel.json"), {"dibuat": str(dt.date.today()), "sumber": "data/raw/banjir/model_kab/kandidat.json", "kab": asal["kab"],
                              "sel": [list(x) for x in sel], "sk": {k: [[a, b, v[0], v[1]] for (a, b), v in sorted(sk[k].items())] for k in asal["kab"]}})


def kunci_titik(la, lo):
    return f"{la:.3f},{lo:.3f}"


def kisi_sel(s, n=2):
    return [(round(s[0] + i * LANGKAH, 3), round(s[1] + j * LANGKAH, 3)) for i in range(-n, n + 1) for j in range(-n, n + 1)]


def skor_titik(m):
    v = [x for x in m.values() if x is not None]
    return sum(v) / len(v) if v else None


def pilih_titik(sel, cache):
    """Per sel: titik dengan rata-rata median tertinggi; sel GloFAS kembar (koordinat balikan API sama) dibuang, sel dengan skor
    tertinggi menang. Tanpa kandidat berdata -> titik tengah. -> [{sel, lat, lon, g, median, tanpa_sungai}] urut sel."""
    kand = {}
    for s in sel:
        r = []
        for la, lo in kisi_sel(s):
            c = cache.get(kunci_titik(la, lo))
            sk_ = skor_titik(c["m"]) if c else None
            if sk_ is not None:
                r.append((-sk_, kunci_titik(la, lo), la, lo, tuple(c["g"])))
        kand[s] = sorted(r)
    urut = sorted(sel, key=lambda s: (kand[s][0][0] if kand[s] else 1.0, s))   # skor terbesar dulu, tanpa kandidat paling akhir
    ambil_, out = set(), {}
    for s in urut:
        pilih_ = next((c for c in kand[s] if c[4] not in ambil_), None)
        if pilih_:
            ambil_.add(pilih_[4])
            out[s] = {"sel": list(s), "lat": pilih_[2], "lon": pilih_[3], "g": list(pilih_[4]), "median": round(-pilih_[0], 2),
                      "tanpa_sungai": -pilih_[0] < MIN_MEDIAN}
        else:
            out[s] = {"sel": list(s), "lat": s[0], "lon": s[1], "g": None, "median": 0.0, "tanpa_sungai": True}
    return [out[s] for s in sorted(sel)]


def muat_titik():
    t = baca(J("titik.json"))
    if not t:
        sys.exit("titik.json belum ada: jalankan `pilih`")
    return t["titik"]


# ------------------------------------------------------------------ unduh
def panggil(url, batas=600):
    """unduh() dengan kuota JAM menunggu 20 menit (3 kali); kuota HARIAN melempar KuotaHabis."""
    for coba in range(4):
        try:
            return unduh(url, batas_waktu=batas)
        except KuotaHabis as e:
            if "Hourly" not in str(e) or coba == 3:
                raise
            print("  kuota jam habis, tunggu 20 menit", file=sys.stderr)
            time.sleep(1200)


def pilih():
    siapkan_sampel()
    kabs, sel, sk = muat_sampel()
    cache = baca(J("pilih_cache.json"), {})
    semua = sorted({c for s in sel for c in kisi_sel(s)})
    print(f"{len(sel)} sel, {len(semua)} titik, ~{len(semua) * len(PINDAI)} bobot", file=sys.stderr)
    for nama, (a, b) in PINDAI.items():
        sisa = [c for c in semua if nama not in cache.get(kunci_titik(*c), {}).get("m", {})]
        for i in range(0, len(sisa), 100):
            bag = sisa[i:i + 100]
            url = (f"{API}?latitude={','.join(str(c[0]) for c in bag)}&longitude={','.join(str(c[1]) for c in bag)}"
                   f"&daily=river_discharge&start_date={a}&end_date={b}")
            try:
                data = panggil(url)
            except KuotaHabis as e:
                print(f"berhenti, kuota habis ({e}); jalankan lagi, cache dipakai ulang", file=sys.stderr)
                simpan(J("pilih_cache.json"), cache)
                return 1
            for c, d in zip(bag, per_lokasi(data)):
                v = [x for x in d["daily"]["river_discharge"] if x is not None]
                e = cache.setdefault(kunci_titik(*c), {"g": [round(d["latitude"], 3), round(d["longitude"], 3)], "m": {}})
                e["m"][nama] = statistics.median(v) if v else None
            simpan(J("pilih_cache.json"), cache)
            print(f"  {nama} {min(i + 100, len(sisa))}/{len(sisa)}", file=sys.stderr)
            time.sleep(11)
    titik = pilih_titik(sel, cache)
    kosong = sum(1 for t in titik if t["g"] is None)
    simpan(J("titik.json"), {"dibuat": str(dt.date.today()), "glofas": GLOFAS, "pindai": {k: [str(x) for x in v] for k, v in PINDAI.items()},
                             "tanpa_sungai": sum(t["tanpa_sungai"] for t in titik), "tanpa_kandidat": kosong, "titik": titik})
    print(f"{len(titik)} titik terpilih, {sum(t['tanpa_sungai'] for t in titik)} sel bertanda 'tanpa sungai berarti' (median < {MIN_MEDIAN}), "
          f"{kosong} tanpa kandidat berdata")
    return 0


def jalur_debit(t):
    return J(os.path.join("debit", f"{t['lat']:.3f}_{t['lon']:.3f}.json"))


def jalur_era5(s):
    return J(os.path.join("era5_2026", f"{s[0]:.3f}_{s[1]:.3f}.json.gz"))


def akhir_debit(c):
    return tgl(c["awal"]) + dt.timedelta(len(c["q"]) - 1) if c and c["q"] else None


def ambil():
    kabs, sel, sk = muat_sampel()
    titik = muat_titik()
    kemarin = dt.date.today() - dt.timedelta(1)
    tujuan_q, tujuan_e = min(AKHIR_BUKA, kemarin), min(AKHIR_BUKA, dt.date.today() - dt.timedelta(6))   # ERA5 tertinggal ~5 hari
    rc = 0
    # 1. ERA5 2026 (murah: ~10 bobot per sel), 5 sel per panggilan, cache terpisah dari uji_balik.
    # Sesudah sia.mulai: data <= BATAS_BEKU tidak boleh diunduh ulang/ditimpa; hanya ditambah dari hari sesudah akhir cache.
    beku = os.path.exists(J("sia.mulai"))
    grup = defaultdict(list)
    for s_ in sel:
        c = baca_gz(jalur_era5(s_))
        if c and tgl(c["akhir"]) >= tujuan_e:
            continue
        mulai = ERA5_AWAL if not beku else (tgl(c["akhir"]) + dt.timedelta(1) if c else None)
        if mulai is None or (beku and mulai <= BATAS_BEKU):
            print(f"  ERA5 {s_} dilewati: sia sudah dimulai, data <= {BATAS_BEKU} tidak boleh diubah", file=sys.stderr)
            continue
        grup[mulai].append(s_)
    print(f"ERA5 2026: {sum(map(len, grup.values()))}/{len(sel)} sel perlu diunduh/diperbarui sampai {tujuan_e}", file=sys.stderr)
    for mulai, sisa in sorted(grup.items()):
        for i in range(0, len(sisa), 5):
            bag = sisa[i:i + 5]
            url = (f"{ERA5_API}?latitude={','.join(str(x[0]) for x in bag)}&longitude={','.join(str(x[1]) for x in bag)}"
                   f"&start_date={mulai}&end_date={tujuan_e}&daily=precipitation_sum,soil_moisture_7_to_28cm_mean&hourly=precipitation"
                   "&models=era5&timezone=Asia%2FJakarta&timeformat=unixtime")
            try:
                data = panggil(url)
            except KuotaHabis as e:
                print(f"berhenti, kuota habis ({e}); jalankan lagi", file=sys.stderr)
                return 1
            for x, d in zip(bag, per_lokasi(data)):
                lama = baca_gz(jalur_era5(x)) if mulai > ERA5_AWAL else None
                tulis_gz(jalur_era5(x), {"awal": str(ERA5_AWAL), "akhir": str(tujuan_e), "unduh": str(dt.date.today()),
                                         "d": gabung_era5(lama["d"], d) if lama else d})
            time.sleep(30)
    # 2. debit: satu titik per panggilan (bobot ~hari/14), tambah dari hari terakhir bila cache sudah ada
    hari_ = (tujuan_q - DEBIT_AWAL).days + 1
    perlu = [t for t in titik if (akhir_debit(baca(jalur_debit(t))) or DEBIT_AWAL - dt.timedelta(1)) < tujuan_q]
    print(f"debit: {len(perlu)}/{len(titik)} titik perlu diunduh/ditambah sampai {tujuan_q} (~{hari_ // 14} bobot per titik penuh, "
          f"kuota harian 10.000, jam 5.000)", file=sys.stderr)
    for n, t in enumerate(perlu):
        c = baca(jalur_debit(t)) or {"lat": t["lat"], "lon": t["lon"], "awal": str(DEBIT_AWAL), "q": [], "segmen": [], "model": GLOFAS}
        a = (akhir_debit(c) + dt.timedelta(1)) if c["q"] else DEBIT_AWAL
        if beku and a <= BATAS_BEKU:
            print(f"  debit {t['lat']},{t['lon']} dilewati: sia sudah dimulai, data <= {BATAS_BEKU} tidak boleh diubah", file=sys.stderr)
            rc = 1
            continue
        url = f"{API}?latitude={t['lat']}&longitude={t['lon']}&daily=river_discharge&start_date={a}&end_date={tujuan_q}"
        try:
            data = panggil(url, 300)
        except KuotaHabis as e:
            print(f"berhenti, kuota habis ({e}); jalankan lagi, cache dipakai ulang", file=sys.stderr)
            rc = 1
            break
        d = per_lokasi(data)[0]["daily"]
        if d["time"][0] != str(a) or len(d["time"]) != (tujuan_q - a).days + 1:
            sys.exit(f"respons debit tidak utuh untuk {t['lat']},{t['lon']}: {d['time'][:1]} {len(d['time'])} hari")
        c["q"] += d["river_discharge"]
        c["segmen"].append([str(a), str(tujuan_q), str(dt.date.today())])
        simpan(jalur_debit(t), c)
        print(f"  debit {n + 1}/{len(perlu)}", file=sys.stderr)
        time.sleep(35)
    tulis_manifest(titik, sel)
    return rc


def gabung_era5(lama, baru):
    """Menyambung respons ERA5 `baru` (mulai sehari sesudah `lama` berakhir) ke `lama`; data lama tidak diubah."""
    out = json.loads(json.dumps(lama))
    if baru["daily"]["time"][0] - lama["daily"]["time"][-1] != 86400:
        raise ValueError("respons ERA5 baru tidak menyambung tepat sesudah cache")
    for bagian in ("daily", "hourly"):
        for k, v in baru[bagian].items():
            out[bagian][k] = out[bagian][k] + v
    return out


def baca_gz(j):
    if not os.path.exists(j):
        return None
    with gzip.open(j, "rt") as f:
        return json.load(f)


def tulis_gz(j, isi):
    os.makedirs(os.path.dirname(j), exist_ok=True)
    with gzip.open(j + ".tmp", "wt") as f:
        json.dump(isi, f, separators=(",", ":"))
    os.replace(j + ".tmp", j)


def tulis_manifest(titik, sel):
    m = {"diperbarui": str(dt.date.today()), "glofas": GLOFAS,
         "debit": {kunci_titik(t["lat"], t["lon"]): {"akhir": str(akhir_debit(baca(jalur_debit(t)))), "segmen": (baca(jalur_debit(t)) or {}).get("segmen")}
                   for t in titik if os.path.exists(jalur_debit(t))},
         "era5_2026": {kunci_titik(*s): (baca_gz(jalur_era5(s)) or {}).get("akhir") for s in sel if os.path.exists(jalur_era5(s))}}
    simpan(J("manifest.json"), m)
    print(f"manifest: {len(m['debit'])}/{len(titik)} titik debit, {len(m['era5_2026'])}/{len(sel)} sel ERA5 2026")


# ------------------------------------------------------------------ data deret
def deret_rentang(d, awal, akhir):
    with tambal_ub(awal, akhir):
        return ub.deret(d)


def cuaca_sampai(sel, akhir):
    """ERA5 per sel dari AWAL sampai `akhir`. akhir <= AKHIR_LATIH: cache uji_balik apa adanya. Lebih: cache lama + cache 2026 sejak 2026-01-04."""
    if akhir <= AKHIR_LATIH:
        return MK.muat_cuaca(sel)
    n, n_lama = (akhir - ub.AWAL).days + 1, (AKHIR_LATIH - ub.AWAL).days + 1
    out = {}
    for s in sel:
        if not os.path.exists(ub.jalur(*s)) or not os.path.exists(jalur_era5(s)):
            sys.exit(f"cache ERA5 sel {s} belum lengkap: jalankan `ambil`")
        with gzip.open(ub.jalur(*s), "rt") as f:
            lama = deret_rentang(json.load(f), ub.AWAL, AKHIR_LATIH)
        c = baca_gz(jalur_era5(s))
        baru = deret_rentang(c["d"], ERA5_AWAL, tgl(c["akhir"]))
        lewat = (AKHIR_LATIH - ERA5_AWAL).days + 1
        cuaca = {k: lama[k] + baru[k][lewat:] for k in ("p", "im", "sm")}
        if len(cuaca["p"]) < n:
            sys.exit(f"ERA5 sel {s} baru sampai {c['akhir']}, perlu {akhir}: jalankan `ambil` lagi")
        out[s] = {k: v[:n] for k, v in cuaca.items()}
    return out


def debit_sampai(titik, akhir):
    """-> {sel: [debit atau None] sejak ub.AWAL sampai `akhir`}; menolak bila cache belum sampai `akhir`."""
    n = (akhir - ub.AWAL).days + 1
    pad = [None] * (DEBIT_AWAL - ub.AWAL).days
    out = {}
    for t in titik:
        c = baca(jalur_debit(t))
        if not c or akhir_debit(c) < akhir:
            sys.exit(f"debit {t['lat']},{t['lon']} belum sampai {akhir}: jalankan `ambil`")
        out[tuple(t["sel"])] = (pad + c["q"])[:n]
    return out


def fitur_q(q, e, batas):
    """-> (q3, q_pers, q_naik) untuk hari e. Jendela e-1..e+1 (GESER), sebelumnya e-31..e-2; data kosong dibuang."""
    w = [x for x in q[e + GESER:e + GESER + 3] if x is not None]
    mx = max(w) if w else 0.0
    pra = [x for x in q[max(0, e - 31):max(0, e - 1)] if x is not None]
    med = statistics.median(pra) if pra else 0.0
    return (math.log1p(mx), bisect.bisect_left(batas, mx) / len(batas) if batas else 0.0, min(mx / max(med, 0.1), 50.0))


def batas_debit(q):
    """Debit harian sel pada hari-hari LATIH, terurut (distribusi q_pers)."""
    return sorted(x for e in MK.hari_tahun(MK.LATIH) for x in (q[e],) if x is not None)


def tambah_sungai(B, qs, batas, sk):
    """Menambah 3 kolom (urut SUNGAI) ke tiap baris B["X"]: maksimum atas sel kabupaten. Kosong -> semua 0."""
    memo = {}

    def f(s, e):
        if (s, e) not in memo:
            memo[(s, e)] = fitur_q(qs[s], e, batas[s])
        return memo[(s, e)]
    for kab, e, x in zip(B["kab"], B["e"], B["X"]):
        x.extend(max(f(s, e)[i] for s in sk[kab]) for i in range(3))
    return B


def baris_sampai(maks, baris):
    return [r for r in baris if r[3] <= maks]


def hash_baris(baris):
    return hashlib.sha256(json.dumps(sorted(map(list, baris)), sort_keys=True, ensure_ascii=False).encode()).hexdigest()


# ------------------------------------------------------------------ model
def x_lr(x):
    return MK.x_lr(x[:len(MK.FITUR)]) + [x[len(MK.FITUR)], x[len(MK.FITUR) + 1], math.log1p(x[len(MK.FITUR) + 2])]


def prediksi(model, platt_, X):
    """Peluang terkalibrasi. model: {jenis: gbdt, aktif, bias, pohon} atau {jenis: lr, aktif, lr}."""
    if model["jenis"] == "gbdt":
        z = MK.skor_gbdt(model, X)
    else:
        z = [MK.logit(G.prediksi_lr(model["lr"], [x_lr(x)[i] for i in model["aktif"]])) for x in X]
    return MK.pakai_platt(platt_, z), z


def cocok_gbdt(TR, VA, aktif, grid=None, pohon_maks=None, log=None):
    """Kisi kedalaman x laju belajar x jumlah pohon menurut logloss validasi (Platt tiap kandidat). -> (model, platt, logloss, hiper)."""
    grid, pohon_maks = grid or HIPER, pohon_maks or POHON_MAKS
    w, kisi, tahap = [1.0] * len(TR["y"]), [], set(range(20 if pohon_maks >= 20 else 1, pohon_maks + 1, 10 if pohon_maks >= 20 else 1))
    for d, lr in grid:
        m = G.latih_gbdt(TR["X"], TR["y"], w, pohon=pohon_maks, dalam=d, lr=lr, fitur_aktif=aktif, **MK.HIPER_TETAP)
        for t, z in MK.skor_bertahap(m, VA["X"], tahap).items():
            kisi.append((G.logloss(MK.pakai_platt(MK.platt(z, VA["y"]), z), VA["y"]), d, lr, t))
        if log:
            log(f"    dalam {d} lr {lr}: logloss validasi terbaik {min(k for k in kisi if k[1] == d and k[2] == lr)[0]:.5f}")
    ll, d, lr, n = min(kisi)
    m = G.latih_gbdt(TR["X"], TR["y"], w, pohon=n, dalam=d, lr=lr, fitur_aktif=aktif, **MK.HIPER_TETAP)
    model = {"jenis": "gbdt", "aktif": aktif, "bias": m["bias"], "pohon": m["pohon"]}
    z = MK.skor_gbdt(model, VA["X"])
    pl = MK.platt(z, VA["y"])
    return model, pl, G.logloss(MK.pakai_platt(pl, z), VA["y"]), {"dalam": d, "lr": lr, "pohon": n, **MK.HIPER_TETAP}


def cocok_lr(TR, VA, aktif):
    Xt = [[x_lr(x)[i] for i in aktif] for x in TR["X"]]
    lr = G.latih_lr(Xt, TR["y"], [1.0] * len(Xt))
    model = {"jenis": "lr", "aktif": aktif, "lr": {k: lr[k] for k in ("mu", "sd", "b")}}
    p, z = prediksi(model, {"mu": 0, "sd": 1, "b0": 0, "b1": 1}, VA["X"])   # logit mentah dulu
    pl = MK.platt(z, VA["y"])
    return model, pl, G.logloss(MK.pakai_platt(pl, z), VA["y"]), {}


def cocok_kelompok(TR, VA, log=None, **kw):
    """Kelompok GBDT/LR menurut logloss M0 di validasi; M1 sama. -> (jenis, {m0:(model, platt, ll, hiper), m1:...}, {gbdt: ll, lr: ll})."""
    g0, l0 = cocok_gbdt(TR, VA, AKTIF0, log=log, **kw), cocok_lr(TR, VA, AKTIF0)
    ll = {"gbdt": g0[2], "lr": l0[2]}
    jenis = "gbdt" if g0[2] <= l0[2] else "lr"
    return jenis, ({"m0": g0, "m1": cocok_gbdt(TR, VA, AKTIF1, log=log, **kw)} if jenis == "gbdt" else {"m0": l0, "m1": cocok_lr(TR, VA, AKTIF1)}), ll


# ------------------------------------------------------------------ penilaian
def musim_tahun(bulan, tahun):
    """Okt-Mar = satu musim yang diberi tahun akhirnya (Jan-Mar 2026 dan Jan-Mar 2027 berbeda); Apr-Sep = musim kering tahun itu."""
    return (tahun + 1, "hujan") if bulan >= 10 else (tahun, "hujan") if bulan <= 3 else (tahun, "kering")


def blok_baru(B, skema):
    out = defaultdict(list)
    for i, (k, t, m, e) in enumerate(zip(B["kab"], B["tahun"], B["bulan"], B["e"])):
        out[(k, musim_tahun(m, t)) if skema == "kab_musim" else (ub.KELOMPOK[k[0]], e // 7)].append(i)
    return out


def ets_titik(b, ks):
    return ub.skor(*MK.jumlah(b, ks))["ets"] or 0.0


def d_ets(B, p0, p1, n_alarm, ulang=ULANG):
    """dETS(M1 - M0) pada n_alarm alarm sama: titik + CI per skema blok + gabungan (bawah = terkecil, atas = terbesar)."""
    a0, a1 = MK.alarm_sebanyak(p0, n_alarm), MK.alarm_sebanyak(p1, n_alarm)
    out = {"alarm": n_alarm}
    for sk_ in SKEMA:
        bl = blok_baru(B, sk_)
        d, ci = MK.ci_selisih(MK.cacah(B, a1, bl), MK.cacah(B, a0, bl), ulang, BIJI)
        out[sk_] = {"nilai": round(d, 4), "ci": [round(ci[0], 4), round(ci[1], 4)], "blok": len(bl)}
    out["nilai"] = out[SKEMA[0]]["nilai"]
    out["ci"] = [min(out[s]["ci"][0] for s in SKEMA), max(out[s]["ci"][1] for s in SKEMA)]
    return out


def d_brier_skill(B, p0, p1, ref, ulang=ULANG):
    """BSS(M1) - BSS(M0) terhadap ref (klimatologi terkalibrasi) = (BS0 - BS1)/BS_ref; bootstrap blok berpasangan, dua skema."""
    y, out = B["y"], {}
    for sk_ in SKEMA:
        bl = blok_baru(B, sk_)
        se = {k: tuple(sum((p[i] - y[i]) ** 2 for i in ix) for p in (p0, p1, ref)) for k, ix in bl.items()}
        f = lambda ks: (sum(se[k][0] for k in ks) - sum(se[k][1] for k in ks)) / sum(se[k][2] for k in ks)
        kunci, r = sorted(se), random.Random(BIJI)
        xs = sorted(f([r.choice(kunci) for _ in kunci]) for _ in range(ulang))
        out[sk_] = {"nilai": round(f(kunci), 5), "ci": [round(xs[int(.025 * (ulang - 1))], 5), round(xs[int(.975 * (ulang - 1))], 5)]}
    out["nilai"] = out[SKEMA[0]]["nilai"]
    out["ci"] = [min(out[s]["ci"][0] for s in SKEMA), max(out[s]["ci"][1] for s in SKEMA)]
    return out


def rangkum(B, p0, p1, p_klim, ulang=ULANG, penuh=True):
    """Semua angka yang dilaporkan untuk satu periode. penuh=False: tanpa dETS vs aturan/AUC tambahan (hemat)."""
    y = B["y"]
    out = {"n": len(y), "kej": sum(y), "laju": round(sum(y) / len(y), 4), "kab": len(set(B["kab"]))}
    out["probabilitas"] = {m: {"auc": G.auc(p, y), "brier": G.brier(p, y), "logloss": G.logloss(p, y)} for m, p in
                           (("M0", p0), ("M1", p1), ("klimatologi", p_klim))}
    out["d_brier_skill"] = d_brier_skill(B, p0, p1, p_klim, ulang)
    for nama, L in MK.LEVEL_ALARM.items():
        n = sum(1 for l in B["level"] if l >= L)
        r = out[nama] = d_ets(B, p0, p1, n, ulang)
        if penuh:
            a_rule, a1 = [l >= L for l in B["level"]], MK.alarm_sebanyak(p1, n)
            bl = blok_baru(B, SKEMA[0])
            d, ci = MK.ci_selisih(MK.cacah(B, a1, bl), MK.cacah(B, a_rule, bl), ulang, BIJI)
            r["M1_vs_aturan"] = {"nilai": round(d, 4), "ci": [round(ci[0], 4), round(ci[1], 4)]}
            for m, p in (("M0", p0), ("M1", p1)):
                r["ets_" + m] = round(ub.skor(*MK.jumlah(MK.cacah(B, MK.alarm_sebanyak(p, n), bl), sorted(bl)))["ets"] or 0, 4)
    return out


def vonis(r):
    """Vonis final dari rangkum() gabungan A+B -> 'LULUS' | 'TIDAK LULUS' | 'TIDAK MEYAKINKAN' + rincian."""
    w, s, b = r["waspada"], r["siaga"], r["d_brier_skill"]
    rin = {"dETS_waspada_bawah_positif": w["ci"][0] > 0, "dETS_siaga_bawah_positif": s["ci"][0] > 0, "brier_skill_bawah_positif": b["ci"][0] > 0}
    if all(rin.values()):
        v = "LULUS"
    elif w["nilai"] <= 0 or w["ci"][1] < 0:
        v = "TIDAK LULUS"
    else:
        v = "TIDAK MEYAKINKAN"
    return {"vonis": v, "rincian": rin}


def vonis_sia(r):
    """Pemeriksaan kesia-siaan Uji A: hanya bisa menolak."""
    return {"vonis": "tidak terbukti" if r["waspada"]["nilai"] <= 0 else "lanjut", "d_ets_waspada": r["waspada"]["nilai"]}


def mde(B, p0, p1, target=200, ulang=100, ulangan=20, biji=BIJI):
    """Simulasi daya: sampel blok (kab x musim) dari validasi sampai ~`target` kejadian, SE dETS(M1-M0) lewat bootstrap blok.
    MDE80 = 2,8 SE (daya 80% pada alfa dua sisi 5%), MDE50 = 1,96 SE (lower CI tepat 0). Alarm diambil dari seluruh validasi (tetap)."""
    bl = blok_baru(B, SKEMA[0])
    kej = {k: sum(B["y"][i] for i in ix) for k, ix in bl.items()}
    if sum(kej.values()) == 0:
        return None
    out, r = {"target_kejadian": target, "kejadian_validasi": sum(kej.values()), "catatan": DAYA_CATATAN}, random.Random(biji)
    keys = sorted(bl)
    for nama, L in MK.LEVEL_ALARM.items():
        n = sum(1 for l in B["level"] if l >= L)
        b0, b1 = MK.cacah(B, MK.alarm_sebanyak(p0, n), bl), MK.cacah(B, MK.alarm_sebanyak(p1, n), bl)
        ses = []
        for _ in range(ulangan):
            ks, c = [], 0
            while c < target:
                k = r.choice(keys)
                ks.append(k)
                c += kej[k]
            xs = []
            for _ in range(ulang):
                dr = [r.choice(ks) for _ in ks]
                xs.append(ets_titik(b1, dr) - ets_titik(b0, dr))
            ses.append(statistics.stdev(xs))
        se = sum(ses) / len(ses)
        out[nama] = {"se": round(se, 5), "mde_80": round(2.8 * se, 4), "mde_50": round(1.96 * se, 4)}
    return out


def kuantil(v, qs=(0.1, 0.5, 0.9)):
    v = sorted(v)
    return [round(v[int(q * (len(v) - 1))], 4) for q in qs]


# ------------------------------------------------------------------ sidik
ISI_KAND = ("fitur", "jenis", "m0", "m1", "platt0", "platt1", "platt_klim", "hiper", "klim", "frek", "frek_awal", "sel", "kab")


def hash_berkas(*jalur):
    return [hashlib.sha256(open(j, "rb").read()).hexdigest() for j in jalur]


def manifest_debit(titik, akhir):
    """[nama, sha256 dari deret debit s/d `akhir`] per titik (urut). Deret = nilai, bukan berkas: tambahan sesudah `akhir` tidak mengubahnya."""
    out = []
    for t in titik:
        c = baca(jalur_debit(t))
        if not c:
            sys.exit(f"debit {t['lat']},{t['lon']} belum diunduh")
        n = (akhir - tgl(c["awal"])).days + 1
        out.append([os.path.basename(jalur_debit(t)), hashlib.sha256(json.dumps(c["q"][:n]).encode()).hexdigest()])
    return out


def sidik_penuh(kand, baris):
    """sha256: kriteria + isi kandidat + titik terpilih + sampel + konstanta tambalan + isi kode (berkas ini, model_kab, uji_balik, status,
    umum, gbdt) + protokol + manifest ERA5 lama dan debit s/d AKHIR_LATIH + hash baris DIBI <= 2025."""
    titik = muat_titik()
    h = hashlib.sha256(json.dumps({"kriteria": KRITERIA, "kand": {k: kand[k] for k in ISI_KAND}, "tambal": tambal(), "titik": titik},
                                  sort_keys=True).encode())
    kode = [os.path.abspath(__file__)] + [os.path.join(DIR, n) for n in ("model_kab.py", "uji_balik.py", "status.py", "umum.py")]
    kode += [os.path.join(DIR, "..", "sebaran", "gbdt.py"), PROTOKOL, J("sampel.json"), J("titik.json")]
    h.update(json.dumps(hash_berkas(*kode)).encode())
    h.update(json.dumps(MK.manifest_era5(kand["sel"])).encode())
    h.update(json.dumps(manifest_debit(titik, AKHIR_LATIH)).encode())
    h.update(hash_baris(baris_sampai("2025-12-31", baris)).encode())
    return h.hexdigest()[:16]


# ------------------------------------------------------------------ data model
def data_latih():
    kabs, sel, sk = muat_sampel()
    titik = muat_titik()
    baris = baris_sampai("2025-12-31", baca(DIBI_TGL))
    simpan(J("dibi_le2025.json"), baris)     # sidik dihitung dari salinan ini; pembaruan dibi_tanggal.json tidak mengunci sia/buka
    ev = ub.peristiwa(baris)
    cuaca = MK.muat_cuaca(sel)
    pers = MK.persentil_batas(cuaca)
    awal = MK.laju_awal(baris, kabs)
    penuh, eks = MK.frekuensi(ev, kabs, awal)
    qs = debit_sampai(titik, AKHIR_LATIH)
    batas = {s: batas_debit(q) for s, q in qs.items()}
    return {"kabs": kabs, "sel": sel, "sk": sk, "titik": titik, "baris": baris, "ev": ev, "cuaca": cuaca, "pers": pers, "awal": awal,
            "penuh": penuh, "eks": eks, "qs": qs, "batas": batas, "klim": MK.klimatologi(ev, kabs, penuh)}


def bangun_semua(D, tahun, ev=None, eks=None):
    B = MK.bangun(D["cuaca"], D["sk"], D["kabs"], ev or D["ev"], tahun, D["pers"], D["penuh"], eks if eks is not None else D["eks"])
    return tambah_sungai(B, D["qs"], D["batas"], D["sk"])


def p_klim_dari(B, klim, platt_k):
    return MK.pakai_platt(platt_k, [MK.logit(klim[f"{k}|{m}"]) for k, m in zip(B["kab"], B["bulan"])])


def kosong_jendela(qs, awal, akhir):
    """Porsi debit None pada hari awal-1..akhir+1 (jendela fitur) di semua titik. Peringatan bila > BATAS_KOSONG persen:
    HANYA peringatan, tidak menghentikan dan tidak mengubah vonis."""
    a, b = hari_ke(awal) - 1, hari_ke(akhir) + 1
    n = sum(len(q[a:b + 1]) for q in qs.values())
    k = sum(1 for q in qs.values() for x in q[a:b + 1] if x is None)
    r = {"n": n, "kosong": k, "persen": round(100 * k / max(1, n), 3)}
    if r["persen"] > BATAS_KOSONG:
        print(f"PERINGATAN (hanya peringatan, tidak menghentikan dan tidak mengubah vonis): debit kosong {r['persen']}% (> {BATAS_KOSONG}%) pada {awal}..{akhir}", file=sys.stderr)
    return r


def hash_jendela(D, awal, akhir):
    """sha256 deret ERA5 dan debit per sel/titik pada awal-31..akhir+2 (semua yang dipakai fitur hari-hari jendela)."""
    a, b = hari_ke(awal) - 31, hari_ke(akhir) + 3
    h = lambda x: hashlib.sha256(json.dumps(x).encode()).hexdigest()
    return {"era5": {kunci_titik(*s): h([D["cuaca"][s][k][a:b] for k in ("p", "im", "sm")]) for s in sorted(D["cuaca"])},
            "debit": {kunci_titik(*s): h(D["qs"][s][a:b]) for s in sorted(D["qs"])}}


def tambah_jejak(baris):
    """Jangkar luar: satu baris JSONL ditambahkan ke model_kab_debit.sidik (dilacak git; JANGAN sunting tangan, commit sesudah tiap mode)."""
    with open(SIDIK_JEJAK, "a") as f:
        f.write(json.dumps(baris, sort_keys=True) + "\n")


def catat_sidik(kand):
    tambah_jejak({"jenis": "latih", "waktu": kand["dibuat"], "sidik": kand["sidik"], "sidik_kriteria": kand["sidik_kriteria"]})


def sha_berkas(j):
    return hash_berkas(j)[0]


def jejak_head():
    """Baris jejak dari `git show HEAD:...`. Menolak bila berkas tidak terlacak di HEAD atau working tree beda dari HEAD."""
    rel = os.path.relpath(os.path.realpath(SIDIK_JEJAK), os.path.realpath(JEJAK_REPO))
    r = subprocess.run(["git", "-C", JEJAK_REPO, "show", "HEAD:" + rel], capture_output=True)
    if r.returncode:
        sys.exit(f"{rel} tidak terlacak di HEAD (belum di-commit?): ditolak")
    if not os.path.exists(SIDIK_JEJAK) or open(SIDIK_JEJAK, "rb").read() != r.stdout:
        sys.exit(f"{rel} di working tree beda dari HEAD: commit (atau kembalikan) dulu, ditolak")
    return [json.loads(x) for x in r.stdout.decode().splitlines() if x.strip()]


def cek_latih(ulang):
    for n in ("sia.mulai", "buka.mulai", "sia.json", "buka.json"):
        if os.path.exists(J(n)):
            sys.exit(f"{n} ada: sia/buka sudah dimulai; latih ulang = eksperimen baru")
    if os.path.exists(J("kandidat.json")) and not ulang:
        sys.exit("kandidat.json sudah ada: latih ulang butuh flag --ulang (menambah baris latih baru di jejak)")


def latih(ulang=False):
    cek_latih(ulang)
    t0 = time.time()
    D = data_latih()
    TR, VA = bangun_semua(D, MK.LATIH), bangun_semua(D, MK.VALIDASI)
    print(f"{len(D['kabs'])} kab, {len(D['sel'])} sel; latih {len(TR['y'])} baris ({sum(TR['y'])} kej), validasi {len(VA['y'])} ({sum(VA['y'])} kej)")
    tanpa = sum(1 for t in D["titik"] if t["tanpa_sungai"])
    jenis, mod, ll = cocok_kelompok(TR, VA, log=lambda s: print(s, flush=True))
    print(f"  kelompok {jenis} (logloss validasi M0: {ll})")
    (m0, pl0, ll0, h0), (m1, pl1, ll1, h1) = mod["m0"], mod["m1"]
    p0, z0 = prediksi(m0, pl0, VA["X"])
    p1, z1 = prediksi(m1, pl1, VA["X"])
    klim = D["klim"]
    pk_mentah = [klim[f"{k}|{m}"] for k, m in zip(VA["kab"], VA["bulan"])]
    pl_k = MK.platt([MK.logit(p) for p in pk_mentah], VA["y"])
    pk = MK.pakai_platt(pl_k, [MK.logit(p) for p in pk_mentah])
    pen = rangkum(VA, p0, p1, pk)
    daya = mde(VA, p0, p1)
    qi = FITUR.index("q3")
    kand = {"versi": "model-kab-debit-1", "dibuat": dt.datetime.now(dt.timezone(dt.timedelta(hours=7))).isoformat(timespec="minutes"),
            "status": "KANDIDAT: Uji A/B belum dibuka", "fitur": FITUR, "jenis": jenis, "m0": m0, "m1": m1, "platt0": pl0, "platt1": pl1,
            "platt_klim": pl_k, "hiper": {"m0": h0, "m1": h1}, "klim": klim, "frek": D["penuh"], "frek_awal": D["awal"],
            "sel": [list(s) for s in D["sel"]], "kab": D["kabs"], "sidik_kriteria": sidik_kriteria()}
    kand["sidik"] = sidik_penuh(kand, D["baris"])
    simpan(J("kandidat.json"), kand)
    catat_sidik(kand)
    kosong = kosong_jendela(D["qs"], dt.date(MK.VALIDASI[0], 1, 1), dt.date(MK.VALIDASI[-1], 12, 31))
    simpan(J("latih.json"), {"dibuat": kand["dibuat"], "jenis": jenis, "logloss_m0_kelompok": ll, "logloss_validasi": {"m0": ll0, "m1": ll1},
                             "validasi": pen, "mde": daya, "mde_catatan": DAYA_CATATAN, "debit_kosong_validasi": kosong, "q3_validasi_kuantil_10_50_90": kuantil([x[qi] for x in VA["X"]]),
                             "sel_tanpa_sungai": tanpa, "hari_kejadian": {"latih": sum(TR["y"]), "validasi": sum(VA["y"])},
                             "debit_kosong_persen": round(100 * sum(1 for q in D["qs"].values() for x in q[MK.MULAI:] if x is None) /
                                                          max(1, sum(len(q) - MK.MULAI for q in D["qs"].values())), 3)})
    cetak(pen)
    print(f"MDE (alarm tetap, ~{daya['target_kejadian']} kejadian): {daya}" if daya else "MDE tidak dihitung (tanpa kejadian)")
    print(f"sidik {kand['sidik']} sidik_kriteria {kand['sidik_kriteria']}; kandidat.json ditulis; Uji A/B BELUM DIBUKA ({time.time() - t0:.0f} dtk)")


def cetak(pen):
    print(f"  n={pen['n']} kej={pen['kej']} laju={pen['laju']} kab={pen['kab']}")
    for m, v in pen["probabilitas"].items():
        print(f"    {m:12s} AUC {v['auc']:.4f}  Brier {v['brier']:.5f}  logloss {v['logloss']:.5f}")
    b = pen["d_brier_skill"]
    print(f"    dBSS M1-M0 {b['nilai']:+.5f} CI95 [{b['ci'][0]:+.5f}, {b['ci'][1]:+.5f}]")
    for nama in MK.LEVEL_ALARM:
        r = pen[nama]
        print(f"    >= {nama} (alarm {r['alarm']}): dETS M1-M0 {r['nilai']:+.4f} CI95 [{r['ci'][0]:+.4f}, {r['ci'][1]:+.4f}]  "
              + "  ".join(f"{s}: [{r[s]['ci'][0]:+.4f}, {r[s]['ci'][1]:+.4f}]" for s in SKEMA))


# ------------------------------------------------------------------ sia dan buka
def bekukan_label(nama, jendela, baris=None):
    """Salinan baris DIBI jendela itu + sha256, sekali. Sudah ada -> diverifikasi, tidak ditimpa. -> baris beku."""
    j = J(f"label_{nama}.json")
    if os.path.exists(j):
        c = baca(j)
        if hash_baris(c["baris"]) != c["sha256"]:
            sys.exit(f"label beku {nama} rusak (sha256 tidak cocok)")
        return c["baris"]
    a, b = (str(x) for x in jendela)
    isi = [r for r in (baris if baris is not None else baca(DIBI_TGL)) if a <= r[3] <= b]
    simpan(j, {"dibekukan": str(dt.date.today()), "jendela": [a, b], "n": len(isi), "sha256": hash_baris(isi), "baris": isi})
    return isi


def cek_kelengkapan(kand, akhir):
    """Semua pemeriksaan kelengkapan data SEBELUM penanda .mulai ditulis: sampel tidak berubah, ERA5 dan debit sampai `akhir`."""
    kabs, sel, sk = muat_sampel()
    if kabs != kand["kab"] or [list(x) for x in sel] != kand["sel"]:
        sys.exit("sampel.json berubah sejak `latih`: ditolak")
    for x in sel:
        c = baca_gz(jalur_era5(x)) if os.path.exists(jalur_era5(x)) else None
        if not os.path.exists(ub.jalur(*x)) or not c or tgl(c["akhir"]) < akhir:
            sys.exit(f"cache ERA5 sel {x} belum sampai {akhir}: jalankan `ambil`")
    for t in muat_titik():
        a = akhir_debit(baca(jalur_debit(t))) if os.path.exists(jalur_debit(t)) else None
        if not a or a < akhir:
            sys.exit(f"debit {t['lat']},{t['lon']} belum sampai {akhir}: jalankan `ambil`")


def tulis_mulai(mode, sidik):
    """Atomik lintas proses: O_CREAT|O_EXCL, jadi dua proses tidak bisa lolos bersamaan."""
    try:
        fd = os.open(J(mode + ".mulai"), os.O_CREAT | os.O_EXCL | os.O_WRONLY)
    except FileExistsError:
        sys.exit(f"{mode}.mulai sudah ada: proses lain sudah memulai")
    with os.fdopen(fd, "w") as f:
        json.dump({"waktu": dt.datetime.now().isoformat(timespec="seconds"), "sidik": sidik}, f)


def gerbang(mode, hari_ini=None):
    """Menolak (sys.exit) bila mode tidak boleh jalan. Semua pemeriksaan (jangkar git, kelengkapan data) di sini, penanda .mulai terakhir."""
    hari_ini = hari_ini or dt.date.today()
    if os.path.exists(J(mode + ".mulai")):
        sys.exit(f"{mode} sudah dimulai ({baca(J(mode + '.mulai')).get('waktu')}); proses yang mati di tengah tetap terhitung dibuka")
    if os.path.exists(J(mode + ".json")):
        sys.exit(f"{mode} sudah dijalankan ({baca(J(mode + '.json')).get('tanggal')}); tidak bisa dijalankan lagi")
    if hari_ini < (SIA_DARI if mode == "sia" else BUKA_DARI):
        sys.exit(f"{mode} baru boleh dijalankan sejak {SIA_DARI if mode == 'sia' else BUKA_DARI}")
    kand = baca(J("kandidat.json"))
    if not kand:
        sys.exit("kandidat.json belum ada: jalankan `latih`")
    if mode == "buka":
        s = baca(J("sia.json"))
        if not s:
            sys.exit("Uji A (`sia`) belum dijalankan")
        if s["vonis"]["vonis"] != "lanjut":
            sys.exit("Uji A menolak ('tidak terbukti'): Uji B tidak dibuka")
        if s["sidik"] != kand["sidik"]:
            sys.exit("sidik pada sia.json beda dengan kandidat.json")
    if kand["sidik_kriteria"] != sidik_kriteria() or kand["sidik"] != sidik_penuh(kand, baca(J("dibi_le2025.json"), [])):
        sys.exit("sidik kriteria/kandidat/kode/data berubah sejak `latih`: ditolak. Latih ulang dan kunci ulang sebelum membuka.")
    jejak = jejak_head()
    latih_ = [b for b in jejak if b.get("jenis") == "latih"]
    if not latih_ or latih_[-1].get("sidik") != kand["sidik"] or latih_[-1].get("sidik_kriteria") != kand["sidik_kriteria"]:
        sys.exit("baris `latih` terakhir di HEAD (model_kab_debit.sidik) tidak sama dengan kandidat.json: ditolak")
    if any(b.get("jenis") == mode for b in jejak):
        sys.exit(f"jejak di HEAD sudah memuat baris `{mode}`: tidak bisa dijalankan lagi")
    if mode == "buka":
        ada = [b for b in jejak if b.get("jenis") == "sia" and b.get("sha256_sia") == sha_berkas(J("sia.json"))
               and b.get("sha256_label_A") == sha_berkas(J("label_A.json"))]
        if not ada:
            sys.exit("HEAD tidak memuat baris `sia` yang cocok dengan sia.json dan label_A.json sekarang (commit jejak sesudah sia): ditolak")
    cek_kelengkapan(kand, AKHIR_SIA if mode == "sia" else AKHIR_BUKA)
    print(f"jejak HEAD: {len(latih_)} baris latih (terakhir sidik {latih_[-1]['sidik']}); data lengkap; {mode} dimulai")
    tulis_mulai(mode, kand["sidik"])
    return kand


def data_uji(kand, jendela, akhir, label):
    """Baris Uji (B["X"] sudah dengan kolom sungai) pada hari-hari dalam `jendela` (daftar rentang), label dari baris beku `label`."""
    kabs, sel, sk = muat_sampel()
    titik = muat_titik()
    assert kabs == kand["kab"] and [list(s) for s in sel] == kand["sel"], "sampel berubah"
    with tambal_ub(akhir=akhir):
        cuaca = cuaca_sampai(sel, akhir)
        qs = debit_sampai(titik, akhir)
        base = ub.AWAL
        D = {"kabs": kabs, "sk": sk, "cuaca": cuaca, "qs": qs, "pers": MK.persentil_batas(cuaca), "penuh": kand["frek"],
             "batas": {s: batas_debit(q) for s, q in qs.items()}}
        B = MK.bangun(cuaca, sk, kabs, ub.peristiwa(label), range(MK.UJI[0], akhir.year + 1), D["pers"], D["penuh"], {})
        tambah_sungai(B, qs, D["batas"], sk)
    ada = [i for i, e in enumerate(B["e"]) if any(hari_ke(a) <= e <= hari_ke(b) for a, b in jendela)]
    return {k: [v[i] for i in ada] for k, v in B.items()}, D


def prediksi_uji(kand, B):
    p0, _ = prediksi(kand["m0"], kand["platt0"], B["X"])
    p1, _ = prediksi(kand["m1"], kand["platt1"], B["X"])
    pk = p_klim_dari(B, kand["klim"], kand["platt_klim"])
    return p0, p1, pk


def sia():
    kand = gerbang("sia")
    label = bekukan_label("A", JENDELA_A)
    B, D = data_uji(kand, [JENDELA_A], AKHIR_SIA, label)
    p0, p1, pk = prediksi_uji(kand, B)
    kosong = kosong_jendela(D["qs"], *JENDELA_A)
    hasha = hash_jendela(D, *JENDELA_A)
    q3 = FITUR.index("q3")
    pembanding = {"q3_validasi": baca(J("latih.json"))["q3_validasi_kuantil_10_50_90"], "q3_uji_A": kuantil([x[q3] for x in B["X"]])}
    print("sebaran q3 (kuantil 10/50/90):", pembanding)   # dicatat SEBELUM menilai
    pen = rangkum(B, p0, p1, pk)
    v = vonis_sia(pen)
    cetak(pen)
    print("SIA", v)
    simpan(J("sia.json"), {"tanggal": str(dt.date.today()), "sidik": kand["sidik"], "sha256_label": baca(J("label_A.json"))["sha256"],
                           "sebaran_q3": pembanding, "hash_jendela_A": hasha, "debit_kosong": kosong, "uji_A": pen, "vonis": v, "manifest": baca(J("manifest.json"))})
    tambah_jejak({"jenis": "sia", "waktu": dt.datetime.now().isoformat(timespec="seconds"), "sha256_sia": sha_berkas(J("sia.json")),
                  "sha256_label_A": sha_berkas(J("label_A.json"))})
    print("jejak model_kab_debit.sidik ditambah baris `sia`: COMMIT berkas itu sebelum `buka`")


def buka():
    kand = gerbang("buka")
    labA = bekukan_label("A", JENDELA_A)
    if hash_baris(labA) != baca(J("sia.json"))["sha256_label"]:
        sys.exit("label Uji A berubah sejak `sia`")
    labB = bekukan_label("B", JENDELA_B)
    B, D = data_uji(kand, [JENDELA_A, JENDELA_B], AKHIR_BUKA, labA + labB)
    if hash_jendela(D, *JENDELA_A) != baca(J("sia.json"))["hash_jendela_A"]:
        sys.exit("deret ERA5/debit jendela Uji A berubah sejak `sia`: ditolak")
    kosong = {"A": kosong_jendela(D["qs"], *JENDELA_A), "B": kosong_jendela(D["qs"], *JENDELA_B)}
    p0, p1, pk = prediksi_uji(kand, B)
    pen = rangkum(B, p0, p1, pk)
    v = vonis(pen)
    cetak(pen)
    print("VONIS", v["vonis"], v["rincian"])
    simpan(J("buka.json"), {"tanggal": str(dt.date.today()), "sidik": kand["sidik"], "sha256_label": {"A": baca(J("label_A.json"))["sha256"],
                            "B": baca(J("label_B.json"))["sha256"]}, "debit_kosong": kosong, "uji_final": pen, "vonis": v, "manifest": baca(J("manifest.json"))})
    tambah_jejak({"jenis": "buka", "waktu": dt.datetime.now().isoformat(timespec="seconds"), "sha256_buka": sha_berkas(J("buka.json")),
                  "sha256_label_A": sha_berkas(J("label_A.json")), "sha256_label_B": sha_berkas(J("label_B.json"))})


# ------------------------------------------------------------------ swauji
def _tolak(f, frag):
    try:
        f()
    except SystemExit as e:
        assert frag in str(e), (frag, str(e))
        return
    raise AssertionError(f"harus ditolak: {frag}")


def uji():
    import tempfile
    # 1. fitur sungai: jendela e-1..e+1, median nol, batas 50, awal deret, data kosong
    n = 100
    q = [10.0] * n
    q[60] = 30.0
    batas = sorted(q[40:90])
    base = fitur_q(q, 59, batas)
    assert abs(base[0] - math.log1p(30.0)) < 1e-12, base
    q2 = list(q); q2[62] = 999.0                           # e+3: di luar jendela e=59 (59-1..59+1)
    assert fitur_q(q2, 59, batas) == base
    q2 = list(q); q2[60] = 31.0                            # e+1: di dalam jendela
    assert fitur_q(q2, 59, batas)[0] != base[0]
    q2 = list(q); q2[58] = 50.0                            # e-1: di dalam jendela
    assert abs(fitur_q(q2, 59, batas)[0] - math.log1p(50.0)) < 1e-12
    q2 = list(q); q2[61] = 999.0                           # e+2 tidak ikut
    assert fitur_q(q2, 59, batas)[0] == base[0]
    nol = [0.0] * n
    nol[60] = 1.0
    assert fitur_q(nol, 60, [0.0, 1.0])[2] == 10.0         # median nol -> penyebut 0,1: 1/0,1
    nol[60] = 100.0
    assert fitur_q(nol, 60, [0.0, 1.0])[2] == 50.0         # dibatasi 50
    assert fitur_q([None] * n, 60, batas) == (0.0, 0.0, 0.0)   # kosong -> 0
    assert fitur_q(q, MK.MULAI, batas)[2] > 0              # e-31 negatif tidak membalik indeks
    assert fitur_q(q, 59, [])[1] == 0.0
    q3 = [float(i) for i in range(1000)]                   # persentil dari batas LATIH saja
    assert fitur_q(q3, 500, sorted(q3[:100]))[1] == 1.0 and fitur_q(q3, 50, sorted(q3[:100]))[1] == bisect.bisect_left(q3[:100], 51.0) / 100
    # kolom sungai ditambahkan sebagai maks atas sel
    B = {"kab": ["32|A"], "e": [80], "X": [[0.0] * len(MK.FITUR)]}
    qa, qb = [5.0] * n, [5.0] * n
    qb[80] = 100.0
    tambah_sungai(B, {(0, 0): qa, (1, 1): qb}, {(0, 0): [], (1, 1): []}, {"32|A": {(0, 0): 0, (1, 1): 0}})
    assert len(B["X"][0]) == len(FITUR) and abs(B["X"][0][-3] - math.log1p(100.0)) < 1e-12
    assert FITUR[-3:] == SUNGAI and len(AKTIF0) == 10 and len(AKTIF1) == 13 and "a7" not in [FITUR[i] for i in AKTIF0]
    # 2. musim dan dua skema blok
    assert musim_tahun(1, 2026) != musim_tahun(1, 2027) and musim_tahun(10, 2026) == musim_tahun(1, 2027) == (2027, "hujan")
    assert musim_tahun(3, 2026) == musim_tahun(12, 2025) and musim_tahun(4, 2026) == musim_tahun(9, 2026) == (2026, "kering")
    Bs = {"kab": [], "tahun": [], "bulan": [], "e": [], "X": [], "y": [], "level": []}
    r = random.Random(3)
    kabs_ = [f"{p}|k{i}" for p in (11, 32) for i in range(4)]
    for k in kabs_:
        for t, m in ((2026, 1), (2026, 2), (2026, 11), (2027, 2), (2027, 3)):
            for d in range(60):
                e = (t - 2026) * 365 + m * 30 + d % 28
                yy = 1 if r.random() < 0.06 else 0
                Bs["kab"].append(k); Bs["tahun"].append(t); Bs["bulan"].append(m); Bs["e"].append(e); Bs["X"].append([]); Bs["y"].append(yy)
                Bs["level"].append(2 if r.random() < 0.08 else 1 if r.random() < 0.15 else 0)
    bl1, bl2 = blok_baru(Bs, "kab_musim"), blok_baru(Bs, "pulau_minggu")
    assert len(bl1) == 8 * 2 and (kabs_[0], (2027, "hujan")) in bl1 and (kabs_[0], (2026, "hujan")) in bl1        # Jan-Feb 2026 vs Nov 2026+Feb-Mar 2027
    assert all(k[0] in ("Sumatra", "Jawa") for k in bl2) and any(len(ix) > 60 for ix in bl2.values())              # antar-kab sehari masuk blok sama
    sempurna = [0.9 if v else 0.03 for v in Bs["y"]]
    klimk = [sum(Bs["y"]) / len(Bs["y"])] * len(Bs["y"])
    dr = d_ets(Bs, klimk, sempurna, sum(1 for l in Bs["level"] if l >= 1), ulang=100)
    assert dr["ci"][0] == min(dr[s]["ci"][0] for s in SKEMA) and dr["ci"][1] == max(dr[s]["ci"][1] for s in SKEMA) and dr["nilai"] > 0
    assert dr["ci"][0] > 0 and dr["kab_musim"]["blok"] == 16 and dr["pulau_minggu"]["blok"] == len(bl2)
    db = d_brier_skill(Bs, klimk, sempurna, klimk, ulang=100)
    assert db["ci"][0] > 0 and d_brier_skill(Bs, sempurna, klimk, klimk, ulang=100)["nilai"] < 0
    sama = d_ets(Bs, sempurna, sempurna, 40, ulang=50)
    assert sama["nilai"] == 0 and sama["ci"] == [0.0, 0.0]
    pen = rangkum(Bs, klimk, sempurna, klimk, ulang=50)
    assert vonis(pen)["vonis"] == "LULUS" and vonis_sia(pen)["vonis"] == "lanjut"
    assert vonis(rangkum(Bs, sempurna, klimk, klimk, ulang=50))["vonis"] == "TIDAK LULUS"
    assert vonis_sia(rangkum(Bs, sempurna, klimk, klimk, ulang=50))["vonis"] == "tidak terbukti"
    rua = lambda wi, ws, bi: {"waspada": {"nilai": wi[0], "ci": wi[1:]}, "siaga": {"nilai": ws[0], "ci": ws[1:]}, "d_brier_skill": {"nilai": 0, "ci": bi}}
    assert vonis(rua((.02, .01, .03), (.03, .01, .05), [.001, .01]))["vonis"] == "LULUS"
    assert vonis(rua((.02, .01, .03), (.03, -.01, .05), [.001, .01]))["vonis"] == "TIDAK MEYAKINKAN"
    assert vonis(rua((.02, .01, .03), (.03, .01, .05), [-.001, .01]))["vonis"] == "TIDAK MEYAKINKAN"
    assert vonis(rua((.02, -.02, -.01), (.03, .01, .05), [.001, .01]))["vonis"] == "TIDAK LULUS"      # batas atas < 0
    assert vonis(rua((-.001, -.02, .03), (.03, .01, .05), [.001, .01]))["vonis"] == "TIDAK LULUS"      # titik <= 0
    dm = mde(Bs, klimk, sempurna, target=30, ulang=30, ulangan=4)
    assert dm["waspada"]["mde_80"] > dm["waspada"]["mde_50"] > 0
    # 3. pilih_titik: skor tertinggi, kembar dibuang, tanda < 5
    s1, s2, s3 = (0.0, 0.0), (0.25, 0.0), (5.0, 5.0)
    cache = {}
    for s, base_ in ((s1, 100.0), (s2, 2.0), (s3, None)):
        for i, (la, lo) in enumerate(kisi_sel(s)):
            cache[kunci_titik(la, lo)] = {"g": [la, lo], "m": {"feb": None if base_ is None else base_ + i, "agu": None if base_ is None else base_ + i}}
    top2 = kunci_titik(*kisi_sel(s2)[-1])
    cache[top2]["g"] = list(kisi_sel(s1)[-1])               # kembar GloFAS: titik terbaik s2 jatuh di sel GloFAS yang sama dengan terbaik s1
    cache[top2]["m"] = {"feb": 50.0, "agu": 50.0}
    tt = {tuple(t["sel"]): t for t in pilih_titik([s1, s2, s3], cache)}
    assert tt[s1]["g"] == list(kisi_sel(s1)[-1]) and tt[s1]["median"] == 124.0 and not tt[s1]["tanpa_sungai"]
    assert tt[s2]["g"] != tt[s1]["g"] and tt[s2]["g"] is not None                                      # kembar dibuang, s1 menang
    assert tt[s3]["g"] is None and tt[s3]["tanpa_sungai"] and (tt[s3]["lat"], tt[s3]["lon"]) == s3
    assert tt[s2]["tanpa_sungai"] == (tt[s2]["median"] < MIN_MEDIAN) and len(kisi_sel(s1)) == 25
    # 4. latih end-to-end kecil pada data mainan: kelompok dipilih, M0 != M1, model bisa diprediksi
    r = random.Random(7)
    Xs, ys = [], []
    for _ in range(1500):
        x = [r.random() for _ in FITUR]
        Xs.append(x); ys.append(1 if r.random() < 0.03 + 0.4 * (x[FITUR.index("q3")] > 0.8) else 0)
    TR_, VA_ = {"X": Xs[:1000], "y": ys[:1000]}, {"X": Xs[1000:], "y": ys[1000:]}
    jenis, mod, ll = cocok_kelompok(TR_, VA_, grid=[(2, 0.1)], pohon_maks=20)
    assert jenis in ("gbdt", "lr") and set(ll) == {"gbdt", "lr"} and mod["m1"][2] < mod["m0"][2], (ll, mod["m0"][2], mod["m1"][2])   # sinyal hanya di q3
    p1_, _ = prediksi(mod["m1"][0], mod["m1"][1], VA_["X"])
    assert len(p1_) == 500 and abs(sum(p1_) / 500 - sum(VA_["y"]) / 500) < 0.02
    ml = cocok_lr(TR_, VA_, AKTIF1)
    pl_, _ = prediksi(ml[0], ml[1], VA_["X"])
    assert abs(sum(pl_) / 500 - sum(VA_["y"]) / 500) < 0.02 and ml[0]["jenis"] == "lr" and json.loads(json.dumps(ml[0])) == ml[0]
    # 5. sidik, label beku, penolakan buka kedua kali, gerbang
    global OUT, sidik_penuh, SIDIK_JEJAK, JEJAK_REPO, cek_kelengkapan
    lama = OUT
    with tempfile.TemporaryDirectory() as tmp:
        OUT = tmp
        try:
            baris = [[["banjir"], "32", "X", "2025-01-01", 1], [["banjir"], "32", "X", "2026-02-01", 1], [["banjir"], "32", "X", "2026-12-01", 1]]
            assert len(baris_sampai("2025-12-31", baris)) == 1
            assert hash_baris(baris_sampai("2025-12-31", baris)) == hash_baris(baris_sampai("2025-12-31", baris + [[["banjir"], "32", "X", "2026-05-05", 1]]))
            assert hash_baris(baris_sampai("2025-12-31", baris)) != hash_baris(baris_sampai("2025-12-31", [[["banjir"], "32", "X", "2025-01-02", 1]] + baris[1:]))
            a = bekukan_label("A", JENDELA_A, baris)
            assert len(a) == 1 and a[0][3] == "2026-02-01"
            assert bekukan_label("A", JENDELA_A, []) == a                       # sudah beku: tidak ditimpa
            c = baca(J("label_A.json")); c["baris"].append(baris[0]); simpan(J("label_A.json"), c)
            try:
                bekukan_label("A", JENDELA_A, baris); raise AssertionError("label rusak harus ditolak")
            except SystemExit:
                pass
            for mode in ("sia", "buka"):                                        # sebelum tanggal: ditolak
                try:
                    gerbang(mode, dt.date(2026, 10, 29)); raise AssertionError(mode)
                except SystemExit as e:
                    assert "baru boleh" in str(e)
            simpan(J("buka.json"), {"tanggal": "2027-06-02"})                  # buka kedua kali ditolak
            try:
                gerbang("buka", dt.date(2027, 7, 1)); raise AssertionError("buka kedua kali")
            except SystemExit as e:
                assert "sudah dijalankan" in str(e)
            os.remove(J("buka.json"))
            try:
                gerbang("buka", dt.date(2027, 7, 1)); raise AssertionError("tanpa kandidat")
            except SystemExit as e:
                assert "kandidat.json belum ada" in str(e)
            simpan(J("kandidat.json"), {"sidik": "x", "sidik_kriteria": sidik_kriteria()})
            try:
                gerbang("buka", dt.date(2027, 7, 1)); raise AssertionError("tanpa sia")
            except SystemExit as e:
                assert "sia" in str(e)
            simpan(J("sia.json"), {"vonis": {"vonis": "tidak terbukti"}, "sidik": "x", "tanggal": "2026-11-16"})
            try:
                gerbang("buka", dt.date(2027, 7, 1)); raise AssertionError("A menolak")
            except SystemExit as e:
                assert "menolak" in str(e)
            simpan(J("sia.json"), {"vonis": {"vonis": "lanjut"}, "sidik": "beda", "tanggal": "2026-11-16"})
            try:
                gerbang("buka", dt.date(2027, 7, 1)); raise AssertionError("sidik beda")
            except SystemExit as e:
                assert "sidik" in str(e)
            # jangkar git JSONL, gerbang, .mulai atomik, kelengkapan, latih/ambil terkunci
            simpan(J("sia.json"), {"vonis": {"vonis": "lanjut"}, "sidik": "x", "tanggal": "2026-11-16"})
            repo = os.path.join(tmp, "repo")
            os.makedirs(repo)
            git = lambda *a: subprocess.run(["git", "-C", repo, "-c", "user.name=t", "-c", "user.email=t@t", "-c", "commit.gpgsign=false", *a],
                                            capture_output=True, check=True)
            git("init", "-q")
            simpan(os.path.join(repo, "x.txt"), {})
            git("add", "x.txt"); git("commit", "-q", "-m", "awal")
            simpan_lama = (sidik_penuh, SIDIK_JEJAK, JEJAK_REPO, cek_kelengkapan)
            sidik_penuh, SIDIK_JEJAK, JEJAK_REPO = (lambda k, b: "x"), os.path.join(repo, "model_kab_debit.sidik"), repo
            cek_kelengkapan = lambda k, a: None
            try:
                kd = {"dibuat": "t", "sidik": "x", "sidik_kriteria": sidik_kriteria()}
                tolak = lambda frag, mode="buka": _tolak(lambda: gerbang(mode, dt.date(2027, 7, 1)), frag)
                tolak("tidak terlacak")                                              # berkas jangkar belum ada di HEAD
                assert not os.path.exists(J("buka.mulai"))                          # ditolak tidak menghabiskan jatah
                catat_sidik({**kd, "sidik": "lain"})
                git("add", "model_kab_debit.sidik"); git("commit", "-q", "-m", "latih lain")
                tolak("baris `latih` terakhir")                                      # HEAD: latih terakhir != kandidat
                catat_sidik(kd)
                tolak("beda dari HEAD")                                              # working tree maju dari HEAD
                git("add", "model_kab_debit.sidik"); git("commit", "-q", "-m", "latih")
                tolak("sia` yang cocok")                                             # buka butuh baris sia di HEAD cocok hash
                simpan(J("label_A.json"), {"sha256": "a"})
                tambah_jejak({"jenis": "sia", "waktu": "t", "sha256_sia": sha_berkas(J("sia.json")), "sha256_label_A": "salah"})
                git("add", "model_kab_debit.sidik"); git("commit", "-q", "-m", "sia salah")
                tolak("sia` yang cocok")
                tambah_jejak({"jenis": "sia", "waktu": "t", "sha256_sia": sha_berkas(J("sia.json")), "sha256_label_A": sha_berkas(J("label_A.json"))})
                git("add", "model_kab_debit.sidik"); git("commit", "-q", "-m", "sia")
                assert len(jejak_head()) == 4
                assert gerbang("buka", dt.date(2027, 7, 1))["sidik"] == "x" and baca(J("buka.mulai"))["sidik"] == "x"
                tolak("sudah dimulai")                                               # proses mati di tengah: buka.json tidak ada
                assert not os.path.exists(J("buka.json"))
                _tolak(lambda: tulis_mulai("buka", "x"), "sudah ada")               # O_EXCL: kedua kalinya gagal
                os.remove(J("buka.mulai"))
                tambah_jejak({"jenis": "buka", "waktu": "t"})
                git("add", "model_kab_debit.sidik"); git("commit", "-q", "-m", "buka")
                tolak("sudah memuat baris `buka`")                                  # jejak HEAD mencegah ulang walau buka.json dihapus
                # kelengkapan data (dipasang ulang) memeriksa sebelum .mulai
                cek_kelengkapan = simpan_lama[3]
                os.remove(J("sampel.json")) if os.path.exists(J("sampel.json")) else None
                _tolak(lambda: cek_kelengkapan({"kab": [], "sel": []}, AKHIR_SIA), "sampel.json belum ada")
                simpan(J("sampel.json"), {"kab": ["a"], "sel": [], "sk": {}})
                _tolak(lambda: cek_kelengkapan({"kab": [], "sel": []}, AKHIR_SIA), "berubah")
                simpan(J("sampel.json"), {"kab": [], "sel": [[99.0, 99.0]], "sk": {}})
                _tolak(lambda: cek_kelengkapan({"kab": [], "sel": [[99.0, 99.0]]}, AKHIR_SIA), "belum sampai")
                # latih terkunci: kandidat ada butuh --ulang; sia/buka dimulai menolak
                for n in ("sia.mulai", "buka.mulai", "buka.json"):
                    if os.path.exists(J(n)):
                        os.remove(J(n))
                os.remove(J("sia.json"))
                simpan(J("kandidat.json"), {})
                _tolak(lambda: cek_latih(False), "--ulang")
                cek_latih(True)
                simpan(J("sia.mulai"), {})
                _tolak(lambda: cek_latih(True), "sia.mulai")
                # ambil sesudah sia.mulai: sambung ERA5 menyambung tepat, data lama tidak berubah
                lama_d = {"daily": {"time": [0, 86400], "p": [1, 2]}, "hourly": {"time": [0, 3600, 86400], "x": [1, 2, 3]}, "utc_offset_seconds": 0}
                baru_d = {"daily": {"time": [172800], "p": [3]}, "hourly": {"time": [172800], "x": [4]}}
                g = gabung_era5(lama_d, baru_d)
                assert g["daily"]["p"] == [1, 2, 3] and g["hourly"]["x"] == [1, 2, 3, 4] and lama_d["daily"]["p"] == [1, 2]
                try:
                    gabung_era5(lama_d, {"daily": {"time": [259200]}, "hourly": {}}); raise AssertionError("harus ditolak")
                except ValueError:
                    pass
                assert BATAS_BEKU == dt.date(2026, 10, 31) and BATAS_BEKU > JENDELA_A[1]
            finally:
                sidik_penuh, SIDIK_JEJAK, JEJAK_REPO, cek_kelengkapan = simpan_lama
            # jendela A: hash berubah hanya bila deret yang dipakai fitur berubah; porsi debit kosong
            na = hari_ke(JENDELA_A[1]) + 10
            Dj = {"cuaca": {(0.0, 0.0): {k: [1.0] * na for k in ("p", "im", "sm")}}, "qs": {(0.0, 0.0): [5.0] * na}}
            h0 = hash_jendela(Dj, *JENDELA_A)
            Dj["qs"][(0.0, 0.0)][hari_ke(JENDELA_A[1]) + 6] = 9.0                     # di luar jendela fitur
            Dj["cuaca"][(0.0, 0.0)]["p"][hari_ke(JENDELA_A[0]) - 40] = 9.0            # sebelum e-31
            assert hash_jendela(Dj, *JENDELA_A) == h0
            Dj["qs"][(0.0, 0.0)][hari_ke(JENDELA_A[1]) + 1] = 9.0                     # e+1 hari terakhir
            assert hash_jendela(Dj, *JENDELA_A) != h0
            h1 = hash_jendela(Dj, *JENDELA_A)
            Dj["cuaca"][(0.0, 0.0)]["sm"][hari_ke(JENDELA_A[0])] = 0.5
            assert hash_jendela(Dj, *JENDELA_A) != h1
            with tambal_ub():
                kj = kosong_jendela({(0, 0): [1.0] * (hari_ke(JENDELA_A[0]) - 1) + [None] * 2 + [1.0] * 400}, *JENDELA_A)
            assert kj["kosong"] == 2 and kj["n"] > 250 and kj["persen"] < BATAS_KOSONG
        finally:
            OUT = lama
    assert sidik_kriteria() == sidik_kriteria() and len(sidik_kriteria()) == 16
    KR = dict(KRITERIA); KRITERIA["lulus"] = "diubah"
    try:
        assert sidik_kriteria() != hashlib.sha256(json.dumps(KR, sort_keys=True, ensure_ascii=False).encode()).hexdigest()[:16]
    finally:
        KRITERIA.update(KR)
    assert tambal()["LATIH"] == [2016, 2023] and tambal()["VALIDASI"] == [2024, 2025] and tambal()["UJI"] == [2026, 2027]
    assert MK.LATIH[-1] < MK.VALIDASI[0] < MK.UJI[0]
    assert (AKHIR_BUKA - dt.timedelta(2)) == JENDELA_B[1] and (AKHIR_SIA - dt.timedelta(2)) == JENDELA_A[1]
    print("ok model_kab_debit")


if __name__ == "__main__":
    perintah = sys.argv[1:]
    if perintah == ["uji"]:
        uji()
    elif perintah in (["pilih"], ["ambil"]):
        sys.exit(pilih() if perintah == ["pilih"] else ambil())
    elif perintah in (["latih"], ["latih", "--ulang"]):
        latih(ulang="--ulang" in perintah)
    elif perintah == ["sia"]:
        sia()
    elif perintah == ["buka"]:
        buka()
    else:
        sys.exit(__doc__)
