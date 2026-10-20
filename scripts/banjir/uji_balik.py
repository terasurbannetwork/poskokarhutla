"""Uji balik aturan status.py (banjir & longsor) terhadap kejadian DIBI BNPB -> public/banjir/data/validasi.json

Satuan: kabupaten-hari. DIBI mencatat per kabupaten, jadi level kabupaten = level kecamatan TERTINGGI di kabupaten itu
(persis yang dilihat orang di peta). Level kecamatan tidak turun bila bahaya naik, jadi cukup satu kecamatan per sel
hujan: yang bahayanya tertinggi.
Hujan "sempurna": ERA5 (Open-Meteo archive, 0,25 derajat, sama dengan kisi hujan.json), per sel terdekat tiap kecamatan:
  p   hujan harian (precipitation_sum, zona Asia/Jakarta)        -> H3 dan A7 (7 hari sebelum hari itu)
  im  hujan per jam terbesar hari itu (hourly precipitation)       -> imax
  sm  soil_moisture_7_to_28cm_mean (ERA5 = HTESSEL, model tanah yang sama dengan IFS; status.py memakai 3-27 cm)
Level hari e = aturan status.py untuk d = 0 dengan prakiraan sempurna: H3 = hujan e+geser..e+geser+2 (geser 0 = d..d+2,
aturan sebelum uji balik; -1 = d-1..d+1, aturan berlaku sejak 13 Okt 2026), A7 = hujan e-7..e-1, sm hari e.
Kejadian hari e = ada baris DIBI dengan jumlah kejadian >= 1 di kabupaten itu tanggal e (banjir: jenis banjir atau
bandang; longsor: longsor). Semua hari dihitung, bukan hari tanpa kejadian yang dicocokkan: pencocokan mengubah laju
dasar dan membuat FAR/PSS tidak bermakna.
Tiap level L (>= Waspada, >= Siaga, Awas) dinilai sebagai ramalan ya/tidak:
  POD = a/(a+c)   FAR = b/(a+b)   CSI = a/(a+b+c)   PSS = a/(a+c) - b/(b+d)
  ETS = (a - ar)/(a + b + c - ar), ar = (a+b)(a+c)/n            (a kena, b alarm palsu, c luput, d benar-tenang)
CI 95%: bootstrap blok (kabupaten x tahun), 1.000 ulangan: kejadian bergerombol per musim, hari tidak saling bebas.
Kisi alternatif (k x jendela, longsor juga sm_jenuh x a7_basah) dipilih dengan rata-rata ETS tiga level di periode latih
2016-2021, lalu dinilai di 2022-2025. Usul diterima hanya bila CI 95% bootstrap berpasangan selisih ETS (usul - berlaku) di
periode uji seluruhnya di atas 0. Aturan berlaku (BERLAKU = konstanta status.py) juga selalu dibandingkan dengan aturan
SEBELUM uji balik. Longsor 2024 dibuang: DIBI 2024 hanya mencatat 219 longsor (tahun lain 600-1.300).

Kuota: archive menghitung bobot var/10 x hari/14 per lokasi -> 3 var x 3.666 hari = ~79 per sel. 5 sel per panggilan
(~390, di bawah 600/menit), jeda JEDA dtk (batas 5.000/jam); berhenti rapi bila kuota harian habis, jalan ulang
melanjutkan. Respons mentah per sel disimpan gzip di data/raw/banjir/uji_balik/, jadi jalan ulang gratis.

Pakai:  python3 scripts/banjir/uji_balik.py       ambil yang belum ada, lalu hitung (bila semua sel sudah ada)
        python3 scripts/banjir/uji_balik.py uji   swauji luring dengan data mainan
"""
import datetime as dt, gzip, json, math, os, random, sys, time
from collections import defaultdict

sys.path.insert(0, os.path.dirname(__file__))
from umum import KELUAR, MENTAH, KuotaHabis, ambil, baca, per_lokasi, simpan
from status import A7_BASAH, GESER, K_BANJIR, K_LONGSOR, SM_JENUH, level_banjir, level_longsor

API = "https://archive-api.open-meteo.com/v1/archive"
CACHE = os.path.join(MENTAH, "uji_balik")
AWAL, AKHIR = dt.date(2015, 12, 22), dt.date(2026, 1, 3)   # 2016-01-01..2025-12-31 + 7 hari A7 di depan + 2 hari H3 di belakang
LATIH, UJI = (2016, 2021), (2022, 2025)
LONGSOR_BOLONG = {2024}
PER_PANGGIL, JEDA = 5, 330
KELOMPOK = {"1": "Sumatra", "2": "Sumatra", "3": "Jawa", "5": "Bali-Nusa Tenggara", "6": "Kalimantan", "7": "Sulawesi",
            "8": "Maluku-Papua", "9": "Maluku-Papua"}
ANGGARAN = {"Jawa": 32, "Sumatra": 18, "Sulawesi": 18, "Kalimantan": 14, "Bali-Nusa Tenggara": 12, "Maluku-Papua": 10}  # sel
MAKS_SEL_KAB = 8
LEVEL = {1: "waspada", 2: "siaga", 3: "awas"}  # dinilai sebagai ">= level"
BERLAKU = {"banjir": {"k": K_BANJIR, "geser": GESER}, "longsor": {"k": K_LONGSOR, "geser": GESER, "sm_jenuh": SM_JENUH, "a7_basah": A7_BASAH}}
# aturan sebelum uji balik 13 Okt 2026 (ambang BMKG 50/100/150 pada hujan d..d+2), untuk pembanding di RISET-UJI-BALIK.md
SEBELUM = {"banjir": {"k": 1.0, "geser": 0}, "longsor": {"k": 1.0, "geser": 0, "sm_jenuh": 0.45, "a7_basah": 50}}
KISI = {"k": [0.6, 0.8, 1.0, 1.2], "geser": [0, -1, -2], "sm_jenuh": [0.40, 0.45, 0.50], "a7_basah": [25, 50, 100]}
ULANG = 1000


def hari_ke(tgl):
    return (dt.date.fromisoformat(tgl) - AWAL).days if isinstance(tgl, str) else (tgl - AWAL).days


# ------------------------------------------------------------------ data
def peristiwa(baris):
    """Baris dibi_tanggal.json [jenis, prov, kab, tanggal, n] -> {"banjir": {kab: {hari}}, "longsor": ...}; n < 1 dibuang."""
    out = {"banjir": defaultdict(set), "longsor": defaultdict(set)}
    for jenis, p, kab, tgl, n in baris:
        if n < 1 or not (AWAL <= dt.date.fromisoformat(tgl) <= AKHIR):
            continue
        if {"banjir", "bandang"} & set(jenis):
            out["banjir"][f"{p}|{kab}"].add(hari_ke(tgl))
        if "longsor" in jenis:
            out["longsor"][f"{p}|{kab}"].add(hari_ke(tgl))
    return out


def sel_per_kab():
    """-> {kab: {(lat, lon): [bahaya banjir maks, bahaya longsor maks]}} memakai sel terdekat seperti status.py."""
    from bahaya import kecamatan
    hujan, bh = baca(os.path.join(KELUAR, "hujan.json")), baca(os.path.join(KELUAR, "bahaya.json"))["kec"]
    sel = hujan["sel"]
    petak = {(math.floor(g["lat"] / sel), math.floor(g["lon"] / sel)): g for g in hujan["grid"]}

    def terdekat(la, lo):
        gy, gx = math.floor(la / sel), math.floor(lo / sel)
        if (gy, gx) in petak:
            return petak[(gy, gx)]
        dekat = [petak[k] for k in ((gy + a, gx + b) for a in (-1, 0, 1) for b in (-1, 0, 1)) if k in petak]
        return min(dekat or hujan["grid"], key=lambda g: (g["lat"] - la) ** 2 + (g["lon"] - lo) ** 2)

    out = defaultdict(dict)
    for k, c in kecamatan().items():
        g = terdekat(c["lat"], c["lon"])
        b = out[k.rsplit("|", 1)[0]].setdefault((g["lat"], g["lon"]), [0, 0])
        b[0], b[1] = max(b[0], bh.get(k, {}).get("banjir", 0)), max(b[1], bh.get(k, {}).get("longsor", 0))
    return out


def pilih(ev, sk, anggaran=ANGGARAN):
    """Kabupaten sampel: per kelompok pulau, urut jumlah hari kejadian (banjir + longsor) menurun, kab > MAKS_SEL_KAB sel
    dilewati, berhenti sebelum anggaran sel kelompok terlampaui (sel bersama kab tetangga dihitung sekali)."""
    out, sel = [], {g: set() for g in anggaran}
    skor = lambda k: len(ev["banjir"].get(k, ())) + len(ev["longsor"].get(k, ()))
    for k in sorted(sk, key=lambda k: (-skor(k), k)):
        g = KELOMPOK[k[0]]
        baru = set(sk[k]) - sel[g]
        if skor(k) and len(sk[k]) <= MAKS_SEL_KAB and len(sel[g]) + len(baru) <= anggaran[g]:
            out.append(k)
            sel[g] |= baru
    return sorted(out)


def jalur(la, lo):
    return os.path.join(CACHE, f"{la:.3f}_{lo:.3f}.json.gz")


def ambil_cuaca(sel):
    """Unduh sel yang belum ada di cache. -> True bila semua sudah ada."""
    sisa = [s for s in sorted(sel) if not os.path.exists(jalur(*s))]
    print(f"{len(sel)} sel, {len(sisa)} belum di cache (~{len(sisa) * 79} panggilan berbobot)", file=sys.stderr)
    os.makedirs(CACHE, exist_ok=True)
    for a in range(0, len(sisa), PER_PANGGIL):
        bagian = sisa[a:a + PER_PANGGIL]
        url = (f"{API}?latitude={','.join(str(s[0]) for s in bagian)}&longitude={','.join(str(s[1]) for s in bagian)}"
               f"&start_date={AWAL}&end_date={AKHIR}&daily=precipitation_sum,soil_moisture_7_to_28cm_mean&hourly=precipitation"
               "&models=era5&timezone=Asia%2FJakarta&timeformat=unixtime")
        for coba in range(6):
            try:
                data = ambil(url, batas_waktu=600)
                break
            except KuotaHabis as e:
                if "Hourly" not in str(e) or coba == 5:
                    print(f"berhenti, kuota habis ({e}); jalankan lagi besok, cache dipakai ulang", file=sys.stderr)
                    return False
                print("  kuota jam habis, tunggu 20 menit", file=sys.stderr)
                time.sleep(1200)
        for s, d in zip(bagian, per_lokasi(data)):
            with gzip.open(jalur(*s) + ".tmp", "wt") as f:  # tulis lalu ganti nama: jalan yang terputus tidak meninggalkan cache rusak
                json.dump(d, f, separators=(",", ":"))
            os.replace(jalur(*s) + ".tmp", jalur(*s))
        print(f"  {min(a + PER_PANGGIL, len(sisa))}/{len(sisa)}", file=sys.stderr)
        if a + PER_PANGGIL < len(sisa):
            time.sleep(JEDA)
    return True


def deret(d):
    """Respons Open-Meteo satu lokasi -> {"p": [mm], "im": [mm/jam], "sm": [m3/m3]} per hari sejak AWAL sampai AKHIR.
    Menolak respons yang tidak mulai di AWAL, bolong harinya, atau kurang variabel."""
    off, h, j = d["utc_offset_seconds"], d["daily"], d["hourly"]
    hari = [(t + off) // 86400 for t in h["time"]]
    n = (AKHIR - AWAL).days + 1
    if len(hari) != n or hari[0] != (AWAL - dt.date(1970, 1, 1)).days or any(b - a != 1 for a, b in zip(hari, hari[1:])):
        raise ValueError(f"deret harian tidak utuh: {len(hari)} hari, harus {n} mulai {AWAL}")
    if len(h["precipitation_sum"]) != n or len(h["soil_moisture_7_to_28cm_mean"]) != n:
        raise ValueError("panjang variabel harian beda dengan waktu")
    im = [None] * n
    for t, x in zip(j["time"], j["precipitation"]):
        i = (t + off) // 86400 - hari[0]
        if x is not None and 0 <= i < n:
            im[i] = x if im[i] is None else max(im[i], x)
    return {"p": [x or 0 for x in h["precipitation_sum"]], "im": im, "sm": h["soil_moisture_7_to_28cm_mean"]}


# ------------------------------------------------------------------ penilaian
def level_harian(c, b, jenis, par, hari):
    """Level satu sel di hari-hari `hari` (indeks sejak AWAL)."""
    p, im, sm, g, k = c["p"], c["im"], c["sm"], par["geser"], par["k"]
    out = []
    for e in hari:
        w = slice(e + g, e + g + 3)
        h3 = sum(p[w])
        ims = [x for x in im[w] if x is not None]
        imax = max(ims) if ims else None
        if jenis == "banjir":
            out.append(level_banjir(h3, b[0], None, imax, k=k, i_waspada=par.get("i_waspada", 20)))
        else:
            out.append(level_longsor(h3, sum(p[e - 7:e]), b[1], sm[e], imax, k=k, sm_jenuh=par["sm_jenuh"], a7_basah=par["a7_basah"]))
    return out


def tabel(cuaca, sk, kabs, ev, jenis, par, tahun):
    """-> {(kab, tahun): [[a, b, c, d] untuk level 1, 2, 3]} di tahun-tahun `tahun`."""
    out = {}
    for kab in kabs:
        kej = ev[jenis].get(kab, set())
        for y in tahun:
            if jenis == "longsor" and y in LONGSOR_BOLONG:
                continue
            hari = list(range(max(hari_ke(dt.date(y, 1, 1)), 7), min(hari_ke(dt.date(y, 12, 31)), hari_ke(AKHIR) - 2) + 1))
            lv = [max(t) for t in zip(*(level_harian(cuaca[s], b, jenis, par, hari) for s, b in sk[kab].items()))]
            blok = [[0, 0, 0, 0] for _ in LEVEL]
            for e, l in zip(hari, lv):
                o = e in kej
                for i, L in enumerate(LEVEL):
                    blok[i][(0 if o else 1) if l >= L else (2 if o else 3)] += 1
            out[(kab, y)] = blok
    return out


def skor(a, b, c, d):
    """-> {pod, far, csi, pss, ets}; None bila penyebutnya 0."""
    n = a + b + c + d
    bagi = lambda x, y: x / y if y else None
    ar = (a + b) * (a + c) / n if n else 0
    pod, pofd = bagi(a, a + c), bagi(b, b + d)
    return {"pod": pod, "far": bagi(b, a + b), "csi": bagi(a, a + b + c),
            "pss": pod - pofd if pod is not None and pofd is not None else None, "ets": bagi(a - ar, a + b + c - ar)}


def jumlah(blok, kunci, i):
    t = [0, 0, 0, 0]
    for k in kunci:
        t = [x + y for x, y in zip(t, blok[k][i])]
    return t


def bootstrap(blok, i, ulang=ULANG, seed=1):
    """CI 95% tiap skor dengan menarik ulang blok (kab, tahun)."""
    kunci, r = sorted(blok), random.Random(seed)
    sampel = defaultdict(list)
    for _ in range(ulang):
        for m, v in skor(*jumlah(blok, [r.choice(kunci) for _ in kunci], i)).items():
            if v is not None:
                sampel[m].append(v)
    return {m: [round(v[int(.025 * (len(v) - 1))], 3), round(v[int(.975 * (len(v) - 1))], 3)]
            for m, v in ((m, sorted(v)) for m, v in sampel.items())}


def ets_rata(blok, kunci=None):
    kunci = sorted(blok) if kunci is None else kunci
    xs = [skor(*jumlah(blok, kunci, i))["ets"] for i in range(len(LEVEL))]
    return sum(x or 0 for x in xs) / len(xs)


def selisih(b1, b0, ulang=ULANG, seed=2):
    """CI 95% bootstrap berpasangan untuk ETS rata-rata b1 - b0 (blok sama untuk keduanya)."""
    kunci, r, xs = sorted(b0), random.Random(seed), []
    for _ in range(ulang):
        pilih_ = [r.choice(kunci) for _ in kunci]
        xs.append(ets_rata(b1, pilih_) - ets_rata(b0, pilih_))
    xs.sort()
    return round(ets_rata(b1) - ets_rata(b0), 4), [round(xs[int(.025 * (ulang - 1))], 4), round(xs[int(.975 * (ulang - 1))], 4)]


def kombinasi(jenis):
    kunci = ["k", "geser"] + (["sm_jenuh", "a7_basah"] if jenis == "longsor" else [])
    out = [{}]
    for k in kunci:
        out = [{**o, k: v} for o in out for v in KISI[k]]
    return out


def ringkas(blok, i):
    """Skor + CI + tabel + laju (porsi kabupaten-hari yang berstatus setinggi ini)."""
    n = jumlah(blok, sorted(blok), i)
    s = skor(*n)
    return {**{m: None if v is None else round(v, 3) for m, v in s.items()}, "ci": bootstrap(blok, i),
            "n": dict(zip("abcd", n)), "laju": round((n[0] + n[1]) / sum(n), 3)}


def cetak(judul, blok):
    print(f"  {judul}")
    for i, L in enumerate(LEVEL):
        s, ci = skor(*jumlah(blok, sorted(blok), i)), bootstrap(blok, i, 300)
        f = lambda m: "  -  " if s[m] is None else f"{s[m]:.3f} [{ci[m][0]:.3f}-{ci[m][1]:.3f}]"
        print(f"    >= {LEVEL[L]:8s} n={jumlah(blok, sorted(blok), i)}  POD {f('pod')}  FAR {f('far')}  CSI {f('csi')}  "
              f"PSS {f('pss')}  ETS {f('ets')}")


def main():
    baris = baca(os.path.join(MENTAH, "dibi_tanggal.json"))
    if not baris:
        sys.exit("data/raw/banjir/dibi_tanggal.json belum ada: jalankan riwayat.py dulu")
    ev, sk = peristiwa(baris), sel_per_kab()
    kabs = pilih(ev, sk)
    sel = {s for k in kabs for s in sk[k]}
    print(f"sampel: {len(kabs)} kab, {len(sel)} sel: {', '.join(kabs)}", file=sys.stderr)
    if not ambil_cuaca(sel):
        sys.exit(1)
    cuaca = {}
    for s in sel:
        with gzip.open(jalur(*s), "rt") as f:
            cuaca[s] = deret(json.load(f))
    th_latih, th_uji = range(LATIH[0], LATIH[1] + 1), range(UJI[0], UJI[1] + 1)
    hasil, catatan = {}, []
    for jenis in ("banjir", "longsor"):
        print(f"\n== {jenis.upper()}")
        latih = []
        for par in kombinasi(jenis):
            par_ = {**BERLAKU[jenis], **par}
            latih.append((ets_rata(tabel(cuaca, sk, kabs, ev, jenis, par_, th_latih)), par_))
        latih.sort(key=lambda x: -x[0])
        b0_l = tabel(cuaca, sk, kabs, ev, jenis, BERLAKU[jenis], th_latih)
        print(f"  latih {LATIH}: aturan berlaku ETS rata {ets_rata(b0_l):.4f}; 5 teratas:")
        for e, par in latih[:5]:
            print(f"    {e:.4f}  {par}")
        terbaik = latih[0][1]
        b0 = tabel(cuaca, sk, kabs, ev, jenis, BERLAKU[jenis], th_uji)
        bs = tabel(cuaca, sk, kabs, ev, jenis, SEBELUM[jenis], th_uji)
        cetak(f"uji {UJI}, aturan sebelum uji balik {SEBELUM[jenis]}", bs)
        cetak(f"uji {UJI}, aturan berlaku {BERLAKU[jenis]}", b0)
        ds, cis = selisih(b0, bs)
        print(f"  selisih ETS rata (berlaku - sebelum) di uji: {ds:+.4f} CI95 [{cis[0]:+.4f}, {cis[1]:+.4f}]")
        usul = {"par": terbaik, "diterima": False}
        if terbaik != BERLAKU[jenis]:
            b1 = tabel(cuaca, sk, kabs, ev, jenis, terbaik, th_uji)
            cetak(f"uji {UJI}, usul {terbaik}", b1)
            d, ci = selisih(b1, b0)
            usul.update(selisih_ets=d, ci=ci, diterima=ci[0] > 0)
            print(f"  selisih ETS rata (usul - berlaku) di uji: {d:+.4f} CI95 [{ci[0]:+.4f}, {ci[1]:+.4f}] -> "
                  + ("LAMPAUI DERAU: pertimbangkan mengganti konstanta status.py" if ci[0] > 0 else "ditolak (tidak melampaui derau)"))
        else:
            print("  usul terbaik latih = aturan berlaku")
        catatan.append(f"{jenis}: berlaku {BERLAKU[jenis]} vs sebelum {SEBELUM[jenis]}: selisih ETS uji {ds:+.4f} CI95 {cis}.")
        per_pulau = {}
        for g in sorted(set(KELOMPOK.values())):
            sub = {k: v for k, v in b0.items() if KELOMPOK[k[0][0]] == g}
            if sub:
                cetak(f"uji, aturan berlaku, {g} ({len({k for k, _ in sub})} kab)", sub)
                per_pulau[g] = {LEVEL[L]: ringkas(sub, i) for i, L in enumerate(LEVEL)}
        hasil[jenis] = {**{LEVEL[L]: ringkas(b0, i) for i, L in enumerate(LEVEL)}, "aturan": BERLAKU[jenis],
                        "kab": len({k for k, _ in b0}), "pulau": per_pulau,
                        "sebelum": {"aturan": SEBELUM[jenis], **{LEVEL[L]: ringkas(bs, i) for i, L in enumerate(LEVEL)}},
                        "selisih_ets_vs_sebelum": {"nilai": ds, "ci": cis}, "usul_latih": usul}
    simpan(os.path.join(KELUAR, "validasi.json"), {
        "dibuat": dt.datetime.now(dt.timezone(dt.timedelta(hours=7))).isoformat(timespec="minutes"),
        "periode_latih": f"{LATIH[0]}-{LATIH[1]}", "periode_uji": f"{UJI[0]}-{UJI[1]}", **hasil,
        "catatan": "Kabupaten-hari, level kabupaten = kecamatan tertinggi; hujan ERA5 sebagai prakiraan sempurna (skill nyata "
                   "lebih rendah); kejadian DIBI (tanggal laporan, kurang catat kejadian kecil -> FAR tampak tinggi); jalur "
                   "sungai GloFAS & ansambel tidak diuji. Longsor tanpa 2024 (DIBI tidak lengkap). " + " ".join(catatan)})
    print(f"\nvalidasi.json ditulis", file=sys.stderr)


# ------------------------------------------------------------------ swauji
def uji():
    global AWAL, AKHIR
    assert AWAL == dt.date(2015, 12, 22) and hari_ke("2015-12-29") == 7
    simpan_awal, simpan_akhir = AWAL, AKHIR
    try:
        AWAL, AKHIR = dt.date(2020, 1, 1), dt.date(2020, 1, 12)
        n, off = 12, 25200
        t0 = (AWAL - dt.date(1970, 1, 1)).days * 86400 - off
        p = [0, 0, 0, 0, 0, 0, 0, 0, 40, 30, 20, 0]
        d = {"utc_offset_seconds": off,
             "daily": {"time": [t0 + 86400 * i for i in range(n)], "precipitation_sum": p, "soil_moisture_7_to_28cm_mean": [0.5] * n},
             "hourly": {"time": [t0 + 3600 * i for i in range(24 * n)], "precipitation": [(i % 24 == 5) * 25.0 for i in range(24 * n)]}}
        c = deret(d)
        assert c["p"] == p and c["im"] == [25.0] * n and len(c["sm"]) == n, c
        for rusak in ({**d, "daily": {**d["daily"], "time": d["daily"]["time"][1:]}},          # hari pertama hilang
                      {**d, "daily": {**d["daily"], "precipitation_sum": p[:-1]}}):           # variabel terpotong
            try:
                deret(rusak)
                raise AssertionError("deret menerima respons rusak")
            except ValueError:
                pass
        ev = peristiwa([[["banjir"], "32", "X", "2020-01-09", 1], [["bandang"], "32", "X", "2020-01-10", 1],
                        [["banjir"], "32", "X", "2020-01-11", 0], [["longsor"], "32", "X", "2019-01-01", 1]])
        assert ev["banjir"]["32|X"] == {8, 9} and not ev["longsor"].get("32|X"), ev  # n=0 dan di luar periode dibuang
        # jendela maju: hari 8 -> 40+30+20 = 90 mm, imax 25 -> waspada; bahaya 0,5 -> siaga lewat H3 >= 100? tidak (90)
        lv = level_harian(c, [0.5, 0.7], "banjir", SEBELUM["banjir"], range(n - 2))
        assert lv[8] == 1 and lv[0] == 1, lv  # imax 25 >= 20 tiap hari -> waspada semua hari
        c0 = {**c, "im": [None] * n}
        lv = level_harian(c0, [0.5, 0.7], "banjir", SEBELUM["banjir"], range(n - 2))
        assert lv == [0, 0, 0, 0, 0, 0, 0, 1, 1, 1], lv
        assert level_harian(c0, [0.5, 0.7], "banjir", {"k": 1.0, "geser": -2}, [9]) == [1]  # jendela mundur 7..9 = 70
        assert level_harian(c0, [0.5, 0.7], "banjir", {"k": 0.8, "geser": 0}, [8]) == [2]   # 90 >= 80 dan B >= 0,33
        # kenop bawaan = status.py apa adanya
        for h3 in (0, 49.9, 50, 99.9, 100, 149.9, 150, 300):
            for b in (0, .33, .66, 1):
                for a7 in (0, 49, 50, 149, 150):
                    for sm in (None, .44, .45):
                        assert level_longsor(h3, a7, b, sm, None, **{x: BERLAKU["longsor"][x] for x in ("k", "sm_jenuh", "a7_basah")}) \
                            == level_longsor(h3, a7, b, sm, None)
        # tabel kontingensi: hari yang punya A7 penuh dan H3 penuh = 7..9; level >= 1 di 7, 8, 9; kejadian 8, 9
        blok = tabel({(0, 0): c0}, {"32|X": {(0, 0): [0.5, 0.7]}}, ["32|X"], ev, "banjir", SEBELUM["banjir"], [2020])
        assert blok[("32|X", 2020)][0] == [2, 1, 0, 0] and blok[("32|X", 2020)][1] == [0, 0, 2, 1], blok
    finally:
        AWAL, AKHIR = simpan_awal, simpan_akhir
    s = skor(10, 20, 5, 965)
    assert abs(s["pod"] - 10 / 15) < 1e-9 and abs(s["far"] - 20 / 30) < 1e-9 and abs(s["csi"] - 10 / 35) < 1e-9, s
    assert abs(s["pss"] - (10 / 15 - 20 / 985)) < 1e-9 and s["ets"] < s["csi"], s
    assert skor(0, 0, 0, 10)["pod"] is None and skor(0, 0, 0, 10)["far"] is None  # tanpa kejadian: tidak dikarang 0
    acak = skor(1, 99, 9, 891)  # ramalan seacak laju dasar -> ETS dan PSS ~0
    assert abs(acak["ets"]) < 1e-9 and abs(acak["pss"]) < 1e-9, acak
    blok = {("a", y): [[a, b, c, 300]] * 3 for y, (a, b, c) in enumerate([(3, 5, 1), (0, 2, 2), (4, 1, 0), (1, 6, 3)])}
    ci = bootstrap(blok, 0, 200)
    for m, v in skor(*jumlah(blok, sorted(blok), 0)).items():
        assert ci[m][0] <= v <= ci[m][1], (m, v, ci[m])
    assert selisih(blok, blok, 50) == (0, [0, 0])
    sk = {"32|A": {(1, 1): 0, (1, 2): 0}, "32|B": {(1, 2): 0, (1, 3): 0}, "32|C": {(2, i): 0 for i in range(9)}, "72|D": {(5, 5): 0}}
    e = {"banjir": {"32|A": {1, 2, 3}, "32|B": {1, 2}, "32|C": set(range(50)), "72|D": {1}}, "longsor": {}}
    assert pilih(e, sk, {"Jawa": 3, "Sulawesi": 0}) == ["32|A", "32|B"], pilih(e, sk, {"Jawa": 3, "Sulawesi": 0})  # C > 8 sel, D di luar anggaran
    assert len(kombinasi("banjir")) == 12 and len(kombinasi("longsor")) == 108 and BERLAKU["banjir"] in [{**o} for o in kombinasi("banjir")]
    print("ok uji_balik")


if __name__ == "__main__":
    uji() if sys.argv[1:] == ["uji"] else main()
