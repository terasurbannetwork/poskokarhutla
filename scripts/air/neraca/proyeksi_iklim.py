#!/usr/bin/env python3
"""NA-29: proyeksi perubahan iklim per kab/kota Jawa dari NASA NEX-GDDP-CMIP6 (0,25 derajat, harian).

Perubahan hujan (pr, persen) dan suhu (tas, derajat C) 2041-2060 terhadap 1995-2014, skenario ssp245 dan ssp585,
sebaran antar 5 model (median, p10, p90). BUKAN prakiraan: proyeksi berbias model (lihat meta.catatan).

Unduhan: subset spasial di server (THREDDS NCSS NASA NCCS, kotak Jawa, satu tahun satu variabel ~0,85 MB), BUKAN berkas
global ~250 MB. 5 model x (20 historical + 20 ssp245 + 20 ssp585) tahun x 2 variabel = 600 permintaan ~ 0,5 GB.
Hasil reduksi per berkas dicache di data/kajian-bnpb/neraca-air/mentah/nex_gddp/ (kecil), jadi jalan ulang tanpa jaringan.
Murni stdlib (netCDF-3 klasik dibaca lewat iklim_global.baca_nc3). Jalan manual/lab, bukan workflow.

  python3 proyeksi_iklim.py tarik   # unduh + reduksi ke cache (bisa dilanjutkan; --batas-mb N, bawaan 2000)
  python3 proyeksi_iklim.py hitung  # cache -> public/data/neraca_air/proyeksi_iklim.json
  python3 proyeksi_iklim.py uji     # self-check tanpa jaringan
"""
import json, os, struct, subprocess, sys, time
from concurrent.futures import ThreadPoolExecutor

DIR = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(DIR, "..", "..", ".."))
sys.path.insert(0, DIR)
import iklim_global as G  # noqa: E402  (baca_nc3, baca_var)

TOPO = os.path.join(DIR, "topologi.json")
KAB_RINGKAS = os.path.join(REPO, "public/data/neraca_air/ringkas.json")
CACHE = os.path.join(REPO, "data/kajian-bnpb/neraca-air/mentah/nex_gddp")
KELUAR = os.path.join(REPO, "public/data/neraca_air/proyeksi_iklim.json")

NCSS = "https://ds.nccs.nasa.gov/thredds/ncss/grid/AMES/NEX/GDDP-CMIP6"
KOTAK = dict(north=-5.5, south=-9.0, west=104.9, east=114.8)  # Jawa + Madura + Kep. Seribu
# Lima model, semuanya r1i1p1f1 dengan historical + ssp245 + ssp585 + pr + tas (diperiksa 10 Nov 2026 lewat .dds NCCS).
MODEL = ["ACCESS-CM2", "MPI-ESM1-2-HR", "MRI-ESM2-0", "NorESM2-MM", "CMCC-ESM2"]
SKENARIO = ["ssp245", "ssp585"]
DASAR = range(1995, 2015)
MASA_DEPAN = range(2041, 2061)
MUSIM = {"tahunan": range(1, 13), "kemarau": range(6, 11), "basah": (11, 12, 1, 2, 3, 4, 5)}  # kemarau = Jun-Okt (keputusan pemilik 1)
HARI_NOLEAP = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
HARI_KABISAT = [31, 29] + HARI_NOLEAP[2:]


def hari_bulan(n_hari):
    if n_hari == 365:
        return HARI_NOLEAP
    if n_hari == 366:
        return HARI_KABISAT
    raise ValueError(f"jumlah hari {n_hari} bukan 365/366 (kalender 360 hari tidak didukung)")


def persentil(xs, p):
    """Interpolasi linear (sama dengan numpy default)."""
    if not xs:
        raise ValueError("kosong")
    s = sorted(xs)
    k = (len(s) - 1) * p / 100
    a = int(k)
    b = min(a + 1, len(s) - 1)
    return s[a] + (s[b] - s[a]) * (k - a)


def ringkas(xs):
    return {"median": round(persentil(xs, 50), 2), "p10": round(persentil(xs, 10), 2), "p90": round(persentil(xs, 90), 2)}


# ---------- bobot sel topologi (0,1 derajat, km2) -> kisi 0,25 derajat ----------
def bobot_kab(topo, lat, lon, ada):
    """-> {kode: [(ilat, ilon, km2)]}. Tiap sel 0,1 derajat dipetakan ke sel 0,25 derajat terdekat; kalau itu sel laut/kosong
    (ada[i][j] False), ambil sel berisi terdekat dalam radius 3 sel."""
    la0, lo0 = lat[0], lon[0]
    dla, dlo = (lat[-1] - la0) / (len(lat) - 1), (lon[-1] - lo0) / (len(lon) - 1)
    out = {}
    for sd in topo["subdas"].values():
        for kode, sels in sd["kab"].items():
            for kunci, km2 in sels.items():
                a, o = (float(x) for x in kunci.split(","))
                i = min(max(round((a - la0) / dla), 0), len(lat) - 1)
                j = min(max(round((o - lo0) / dlo), 0), len(lon) - 1)
                if not ada[i][j]:
                    cand = [(abs(ii - i) ** 2 + abs(jj - j) ** 2, ii, jj)
                            for ii in range(max(i - 3, 0), min(i + 4, len(lat)))
                            for jj in range(max(j - 3, 0), min(j + 4, len(lon))) if ada[ii][jj]]
                    if not cand:
                        raise ValueError(f"sel {kunci} kab {kode}: tak ada sel berisi dalam radius 3")
                    _, i, j = min(cand)
                out.setdefault(kode, {})
                out[kode][(i, j)] = out[kode].get((i, j), 0) + km2
    return {k: [(i, j, w) for (i, j), w in d.items()] for k, d in out.items()}


def reduksi(data, nlat, nlon, bobot, var, hari):
    """data: deret datar (time,lat,lon). -> {kode: [12 nilai]} rerata bulanan terbobot.
    pr: mm/hari (kg m-2 s-1 x 86400); tas: derajat C (K - 273,15)."""
    nt = len(data) // (nlat * nlon)
    if nt != sum(hari):
        raise ValueError(f"{nt} langkah waktu, harapan {sum(hari)}")
    skala, geser = (86400.0, 0.0) if var == "pr" else (1.0, -273.15)
    out = {}
    for kode, sel in bobot.items():
        wt = sum(w for _, _, w in sel)
        idx = [(i * nlon + j, w / wt) for i, j, w in sel]
        jumlah = [0.0] * 12
        t = 0
        for b, nh in enumerate(hari):
            for _ in range(nh):
                base = t * nlat * nlon
                jumlah[b] += sum(data[base + k] * w for k, w in idx)
                t += 1
        out[kode] = [round(j / nh * skala + geser, 4) for j, nh in zip(jumlah, hari)]
    return out


# ---------- unduh ----------
def url(model, sk, var, th):
    q = "&".join(f"{k}={v}" for k, v in KOTAK.items())
    p = f"{model}/{sk}/r1i1p1f1/{var}/{var}_day_{model}_{sk}_r1i1p1f1_gn_{th}_v2.0.nc"
    return f"{NCSS}/{p}?var={var}&{q}&horizStride=1&time_start={th}-01-01T00:00:00Z&time_end={th}-12-31T23:59:59Z&accept=netcdf"


def jalur_cache(model, sk, var, th):
    return os.path.join(CACHE, f"{model}_{sk}_{var}_{th}.json")


def ambil(model, sk, var, th, topo, bobot_memo):
    jc = jalur_cache(model, sk, var, th)
    if os.path.exists(jc):
        return 0
    for percobaan in range(3):
        r = subprocess.run(["curl", "-s", "-L", "--max-time", "240", "-w", "%{http_code}", "-o", "-", url(model, sk, var, th)],
                           capture_output=True)
        b, kode = r.stdout[:-3], r.stdout[-3:]
        if kode == b"200" and b[:3] == b"CDF":
            break
        time.sleep(5 * (percobaan + 1))
    else:
        raise RuntimeError(f"gagal {model} {sk} {var} {th}: http {kode!r} {len(b)} byte")
    dims, vs = G.baca_nc3(b)
    lat, _, _ = G.baca_var(b, dims, vs, "lat")
    lon, _, _ = G.baca_var(b, dims, vs, "lon")
    data, dn, _ = G.baca_var(b, dims, vs, var)
    if dn != ["time", "lat", "lon"]:
        raise ValueError(f"urutan dimensi {dn}")
    nl, no = len(lat), len(lon)
    ada = [[data[i * no + j] < 1e19 for j in range(no)] for i in range(nl)]  # hari pertama = topeng darat
    kunci = (lat[0], lon[0], nl, no, tuple(map(tuple, ada)).__hash__())
    if kunci not in bobot_memo:
        bobot_memo[kunci] = bobot_kab(topo, lat, lon, ada)
    hasil = reduksi(data, nl, no, bobot_memo[kunci], var, hari_bulan(dims["time"]))
    os.makedirs(CACHE, exist_ok=True)
    with open(jc + ".tmp", "w") as f:
        json.dump({"model": model, "skenario": sk, "var": var, "tahun": th, "byte": len(b), "bulanan": hasil}, f)
    os.replace(jc + ".tmp", jc)
    return len(b)


def daftar_kerja():
    k = []
    for m in MODEL:
        for var in ("pr", "tas"):
            for th in DASAR:
                k.append((m, "historical", var, th))
            for sk in SKENARIO:
                for th in MASA_DEPAN:
                    k.append((m, sk, var, th))
    return k


def tarik(batas_mb=2000, pekerja=4):
    topo = json.load(open(TOPO))
    kerja = [w for w in daftar_kerja() if not os.path.exists(jalur_cache(*w))]
    print(f"{len(kerja)} berkas belum di cache dari {len(daftar_kerja())}")
    total, memo = 0, {}
    sudah = sum(json.load(open(jalur_cache(*w)))["byte"] for w in daftar_kerja() if os.path.exists(jalur_cache(*w)))
    if sudah / 1e6 > batas_mb:
        raise SystemExit("cache sudah melewati batas")
    sisa_batas = batas_mb * 1e6 - sudah
    with ThreadPoolExecutor(pekerja) as ex:
        futs = []
        for w in kerja:
            futs.append((w, ex.submit(ambil, *w, topo, memo)))
        for n, (w, f) in enumerate(futs, 1):
            total += f.result()
            if total > sisa_batas:
                ex.shutdown(cancel_futures=True)
                raise SystemExit(f"batas unduh {batas_mb} MB terlewati: berhenti")
            if n % 20 == 0:
                print(f"{n}/{len(kerja)} unduh {(sudah + total) / 1e6:.0f} MB", flush=True)
    print(f"selesai, unduhan sesi ini {total / 1e6:.1f} MB; cache total {(sudah + total) / 1e6:.1f} MB")


# ---------- hitung ----------
def agregat(bulanan, var, musim):
    """12 nilai bulanan -> pr: mm total musim; tas: derajat C rerata musim (berbobot hari)."""
    hari = HARI_NOLEAP
    ms = [m - 1 for m in MUSIM[musim]]
    if var == "pr":
        return sum(bulanan[m] * hari[m] for m in ms)
    return sum(bulanan[m] * hari[m] for m in ms) / sum(hari[m] for m in ms)


def rerata_masa(bulanan_th):
    """list 12-bulanan per tahun -> 12-bulanan rerata."""
    return [sum(t[b] for t in bulanan_th) / len(bulanan_th) for b in range(12)]


def delta(dasar12, depan12, var, musim):
    a, f = agregat(dasar12, var, musim), agregat(depan12, var, musim)
    if var == "pr":
        if a <= 0:
            raise ValueError("hujan dasar nol, persen tak terdefinisi")
        return (f - a) / a * 100
    return f - a


def muat(model, sk, var, th):
    return json.load(open(jalur_cache(model, sk, var, th)))


def hitung():
    nama = {k: v["nama"] for k, v in json.load(open(KAB_RINGKAS))["kab"].items()}
    byte = 0
    per = {}  # (sk, var, kode, musim) -> [delta per model]; dasar[(var,kode,musim)] -> [per model]
    dasar = {}
    for m in MODEL:
        th_dasar, th_depan = {}, {}
        for var in ("pr", "tas"):
            d = [muat(m, "historical", var, t) for t in DASAR]
            byte += sum(x["byte"] for x in d)
            th_dasar[var] = {k: rerata_masa([x["bulanan"][k] for x in d]) for k in d[0]["bulanan"]}
            for sk in SKENARIO:
                f = [muat(m, sk, var, t) for t in MASA_DEPAN]
                byte += sum(x["byte"] for x in f)
                th_depan[(sk, var)] = {k: rerata_masa([x["bulanan"][k] for x in f]) for k in f[0]["bulanan"]}
        for var in ("pr", "tas"):
            for kode, d12 in th_dasar[var].items():
                for ms in MUSIM:
                    dasar.setdefault((var, kode, ms), []).append(agregat(d12, var, ms))
                    for sk in SKENARIO:
                        per.setdefault((sk, var, kode, ms), []).append(delta(d12, th_depan[(sk, var)][kode], var, ms))
    kab = {}
    for kode in sorted({k[2] for k in per}):
        e = {"nama": nama.get(kode), "dasar": {}}
        for ms in MUSIM:
            e["dasar"][ms] = {"pr_mm": round(sum(dasar[("pr", kode, ms)]) / len(MODEL), 0),
                              "tas_c": round(sum(dasar[("tas", kode, ms)]) / len(MODEL), 2)}
        for sk in SKENARIO:
            e[sk] = {"pr_persen": {ms: ringkas(per[(sk, "pr", kode, ms)]) for ms in MUSIM},
                     "tas_c": {ms: ringkas(per[(sk, "tas", kode, ms)]) for ms in MUSIM}}
        kab[kode] = e
    meta = {
        "label": "estimasi-model",
        "judul": "Proyeksi perubahan iklim per kab/kota Jawa, 2041-2060 terhadap 1995-2014",
        "sumber": "NASA NEX-GDDP-CMIP6 v2.0 (BCSD, 0,25 derajat, harian), subset spasial THREDDS NCSS ds.nccs.nasa.gov",
        "atribusi": "Thrasher, B., Wang, W., Michaelis, A., Melton, F., Lee, T., Nemani, R. (2022). NASA Global Daily "
                    "Downscaled Projections, CMIP6. Scientific Data 9, 262. doi:10.1038/s41597-022-01393-4; data doi:10.7917/OFSG3345. "
                    "NASA Center for Climate Simulation. Data model CMIP6: lembaga pemilik tiap model (ACCESS-CM2 CSIRO-ARCCSS, "
                    "MPI-ESM1-2-HR MPI-M, MRI-ESM2-0 MRI, NorESM2-MM NCC, CMCC-ESM2 CMCC).",
        "lisensi": "CC0 1.0 (semua keluaran NEX-GDDP-CMIP6 sejak September 2022, per katalog AWS Open Data registry.opendata.aws/nex-gddp-cmip6; "
                   "berkas lama bertanda CC-BY-SA 4.0 sebelum itu). Data disediakan apa adanya, tanpa jaminan (disclaimer di tiap berkas).",
        "model": MODEL, "varian": "r1i1p1f1 (satu realisasi per model)",
        "periode_dasar": "1995-2014 (historical)", "periode_depan": "2041-2060",
        "skenario": SKENARIO, "musim": {"tahunan": "Jan-Des", "kemarau": "Jun-Okt", "basah": "Nov-Mei"},
        "satuan": {"pr_persen": "perubahan total hujan, persen terhadap 1995-2014 model yang sama",
                   "tas_c": "perubahan suhu udara rerata harian, derajat C", "dasar.pr_mm": "total hujan model, mm per musim, rerata 5 model",
                   "dasar.tas_c": "suhu model, derajat C, rerata 5 model"},
        "cara": "Tiap model: rerata 20 tahun masa depan dikurangi/dibagi rerata 20 tahun dasar model yang SAMA (delta, bukan nilai absolut), "
                "per kab dari rerata sel 0,25 derajat terbobot luas irisan topologi (sel 0,1 derajat terdekat). Sebaran = median, p10, p90 "
                "antar 5 model (interpolasi linear).",
        "unduhan_mb": round(byte / 1e6, 1),
        "catatan": "BUKAN prakiraan. Proyeksi berbias model: (1) bias correction bawaan NEX-GDDP adalah BCSD (Thrasher dkk. 2012) terhadap "
                   "Princeton GMFD 1950-2014, produk reanalisis-terkoreksi global yang kasar untuk hujan tropis; BUKAN dikoreksi ke CHIRPS "
                   "atau pos hujan Indonesia, sehingga nilai absolut model tidak boleh dibanding langsung dengan iklim.json; pakai delta. "
                   "(2) Hujan konvektif, monsun, ENSO dan efek orografi Jawa kurang tertangkap model 100-250 km. "
                   "(3) Hanya 5 model dan satu realisasi tiap model: p10/p90 dari 5 nilai hampir sama dengan min/maks dan meremehkan "
                   "ketidakpastian; jendela 20 tahun masih memuat variabilitas alami (ENSO) sehingga delta hujan kecil bisa bukan sinyal. "
                   "(4) Tidak ada koreksi evapotranspirasi: suhu naik tidak otomatis ET0 naik di neraca. (5) Belum divalidasi terhadap "
                   "pengamatan Jawa; tidak termasuk NA-06. (6) Urutan hujan antar skenario tidak bermakna: selisihnya di dalam derau 5 model, jangan "
                   "mengutip satu skenario lebih basah dari yang lain; median hujan tanpa uji signifikansi dan p10-p90 sering melewati nol. "
                   "(7) Kab kepulauan (Kepulauan Seribu) memakai sel darat terdekat dalam radius 3 sel karena sel 0,25 derajat di atasnya laut/kosong.",
        "pemakai": "hasil.py (bagian Proyeksi iklim di HASIL.md). Belum masuk neraca.py: skenario proyeksi butuh keputusan koreksi ET0.",
    }
    os.makedirs(os.path.dirname(KELUAR), exist_ok=True)
    with open(KELUAR, "w") as f:
        json.dump({"meta": meta, "kab": kab}, f, ensure_ascii=False, separators=(",", ":"))
    print(f"{len(kab)} kab, {os.path.getsize(KELUAR) / 1e3:.0f} KB, cache {byte / 1e6:.0f} MB")


# ---------- uji ----------
def uji():
    # hari: kabisat 366, noleap 365, 360 ditolak
    assert sum(hari_bulan(365)) == 365 and sum(hari_bulan(366)) == 366 and hari_bulan(366)[1] == 29
    for bad in (360, 364):
        try:
            hari_bulan(bad); raise SystemExit("360 harus ditolak")
        except ValueError:
            pass
    # persentil angka tangan: [1..5] p10 = 1,4 ; p50 = 3 ; p90 = 4,6
    assert [round(persentil([5, 1, 3, 2, 4], p), 6) for p in (10, 50, 90)] == [1.4, 3.0, 4.6]
    assert ringkas([1, 2, 3, 4, 5]) == {"median": 3.0, "p10": 1.4, "p90": 4.6}
    # reduksi: kisi 2x2, 365 hari; pr konstan 1e-5 kg/m2/s -> 0,864 mm/hari; sel (0,0) bobot 3, sel (1,1) bobot 1
    nl = no = 2
    data = []
    for _ in range(365):
        data += [1e-5, 0.0, 0.0, 3e-5]
    r = reduksi(data, nl, no, {"X": [(0, 0, 3.0), (1, 1, 1.0)]}, "pr", hari_bulan(365))
    esp = (3 * 1e-5 + 1 * 3e-5) / 4 * 86400
    assert all(abs(v - esp) < 1e-3 for v in r["X"]) and len(r["X"]) == 12, r
    rt = reduksi([300.0] * (365 * 4), nl, no, {"X": [(0, 1, 1.0)]}, "tas", hari_bulan(365))
    assert all(abs(v - 26.85) < 1e-3 for v in rt["X"])
    try:
        reduksi([0.0] * 10, nl, no, {"X": [(0, 0, 1.0)]}, "pr", hari_bulan(365)); raise SystemExit("panjang salah harus ditolak")
    except ValueError:
        pass
    # bobot: sel laut dipindah ke sel darat terdekat; tanpa darat -> galat
    topo = {"subdas": {"1": {"kab": {"9999": {"-7.00,107.00": 10.0, "-7.05,107.05": 6.0}}}}}
    lat, lon = [-7.25, -7.0], [106.75, 107.0]
    ada = [[False, False], [False, True]]
    b = bobot_kab(topo, lat, lon, ada)["9999"]
    assert b == [(1, 1, 16.0)], b
    try:
        bobot_kab(topo, lat, lon, [[False, False], [False, False]]); raise SystemExit("tanpa darat harus ditolak")
    except ValueError:
        pass
    # delta: hujan 1000 -> 1100 mm = +10%; suhu +2 K = +2,0 ; dasar nol ditolak
    d12 = [1000 / 365] * 12
    f12 = [1100 / 365] * 12
    assert abs(delta(d12, f12, "pr", "tahunan") - 10.0) < 1e-9
    assert abs(delta([26.0] * 12, [28.0] * 12, "tas", "kemarau") - 2.0) < 1e-9
    try:
        delta([0.0] * 12, f12, "pr", "tahunan"); raise SystemExit("dasar nol harus ditolak")
    except ValueError:
        pass
    # invarian: delta tahunan pr 0 bila periode sama; musim kemarau+basah mencakup 12 bulan tanpa tumpang
    assert delta(d12, d12, "pr", "tahunan") == 0
    assert sorted(list(MUSIM["kemarau"]) + list(MUSIM["basah"])) == list(range(1, 13))
    # agregat per musim, angka tangan: pr 1 mm/hari tiap bulan -> tahunan 365, kemarau Jun-Okt 30+31+31+30+31=153, basah 365-153=212
    p1 = [1.0] * 12
    assert agregat(p1, "pr", "tahunan") == 365 and agregat(p1, "pr", "kemarau") == 153 and agregat(p1, "pr", "basah") == 212
    # tas: Jan 20 C, sisanya 30 C; Jan masuk musim basah (31 hari dari 212), bukan kemarau
    t = [30.0] * 12; t[0] = 20.0
    assert abs(agregat(t, "tas", "kemarau") - 30.0) < 1e-12
    assert abs(agregat(t, "tas", "basah") - (30 * 212 - 10 * 31) / 212) < 1e-9
    # 5 model, daftar kerja = 5 x 2 var x 60 tahun
    assert len(MODEL) == 5 and len(daftar_kerja()) == 600
    print("proyeksi_iklim uji: ok")


if __name__ == "__main__":
    a = sys.argv[1:]
    if not a or a[0] == "uji":
        uji()
    elif a[0] == "tarik":
        mb = int(a[a.index("--batas-mb") + 1]) if "--batas-mb" in a else 2000
        tarik(mb)
    elif a[0] == "hitung":
        hitung()
    else:
        raise SystemExit(__doc__)
