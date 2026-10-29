"""PEMBANDING (bukan jalur utama sejak 27 Okt 2026, lihat iklim_global.py: CHIRPS + NASA POWER, semua Jawa tanpa kuota).
Jalur ini menulis iklim.json berformat sama tetapi sumber ERA5; JANGAN dijalankan di atas iklim.json hasil iklim_global.py
(cache iklim.json lama dipakai sebagai p_era5/et0_era5 oleh iklim_global.py gabung; cadangannya: salin dulu ke tempat lain).

NA-03 Iklim bulanan per sel 0,1 derajat: ERA5 seamless via Open-Meteo Archive 1991-2025 -> iklim.json (di-commit).

MODEL: `models=era5_seamless`, BUKAN `era5_land`. Dicek 27 Okt 2026: Open-Meteo mengembalikan precipitation_sum null
untuk era5_land di Jawa (1995 dan 2024, harian dan per jam; suhu ada). era5_seamless = ERA5-Land bila ada, ERA5 0,25
derajat bila tidak: hujan praktis dari ERA5 0,25 derajat, ET0 dari ERA5-Land 0,1 derajat. Hujan ERA5 di Jawa
pegunungan perlu diuji lawan CHIRPS/GloFAS di NA-06.

Variabel harian `precipitation_sum` dan `et0_fao_evapotranspiration` (Penman-Monteith FAO-56 yang dihitung Open-Meteo
dari ERA5-Land), dijumlah per bulan (mm). Pola permintaan sama dengan scripts/data/tanah.py; `ambil`, `KuotaHabis`,
`per_lokasi`, `simpan` dari scripts/banjir/umum.py.

Kuota Open-Meteo (bobot = lokasi x max(1, var/10 x hari/14), lihat tanah.py): 2 var x 12.784 hari = 182,6 per sel.
Batas gratis 600/menit, 5.000/jam, 10.000/hari -> 3 sel per permintaan (548) lalu jeda 65 dtk, ~27 sel/jam, ~54
sel/hari. Semua sel Jawa (lihat topologi.json meta.n_sel) butuh berminggu-minggu; tiap jalan melanjutkan sel yang
belum ada dan berhenti rapi saat kuota habis (KuotaHabis). Cache disimpan sesudah tiap permintaan (atomik).

Pakai:
  python3 scripts/air/neraca/iklim.py --prov 34          subset: sel sub-DAS yang menyentuh DIY + seluruh hulunya
  python3 scripts/air/neraca/iklim.py --semua [--maks N] tarik penuh (ulang tiap hari sampai lengkap)
  python3 scripts/air/neraca/iklim.py uji                swa-uji tanpa jaringan
"""
import calendar, collections, json, os, sys, time, urllib.parse

DIR = os.path.dirname(os.path.abspath(__file__))
AKAR = os.path.abspath(os.path.join(DIR, "../../.."))
sys.path.insert(0, os.path.join(AKAR, "scripts/banjir"))
from umum import KuotaHabis, ambil, per_lokasi, simpan  # noqa: E402

TOPO = os.path.join(DIR, "topologi.json")
KELUAR = os.path.join(DIR, "iklim.json")
URL = "https://archive-api.open-meteo.com/v1/archive?"
VAR = ("precipitation_sum", "et0_fao_evapotranspiration")
AWAL, AKHIR = 1991, 2025
PER_MINTA, JEDA = 3, 65
MODEL = "era5_seamless"


def bulan_seri(a=AWAL, b=AKHIR):
    return [f"{y}-{m:02d}" for y in range(a, b + 1) for m in range(1, 13)]


def bulanan(waktu, nilai):
    """harian -> {YYYY-MM: jumlah mm}; bulan dengan hari kosong (None) atau tak lengkap ditolak (tidak diisi diam-diam)."""
    jml, n = collections.defaultdict(float), collections.Counter()
    for t, v in zip(waktu, nilai):
        if v is None:
            continue
        if v < 0:
            raise ValueError(f"{t}: nilai negatif {v}")
        jml[t[:7]] += v
        n[t[:7]] += 1
    return {k: round(jml[k], 1) for k in jml if n[k] == calendar.monthrange(int(k[:4]), int(k[5:]))[1]}


def ringkas_sel(daily):
    """respons harian satu lokasi -> {"p": [...], "et0": [...]} sepanjang bulan_seri; gagal bila ada bulan hilang."""
    seri = bulan_seri()
    out = {}
    for v, k in zip(VAR, ("p", "et0")):
        b = bulanan(daily["time"], daily[v])
        hilang = [m for m in seri if m not in b]
        if hilang:
            raise ValueError(f"{v}: {len(hilang)} bulan tak lengkap, mis. {hilang[:3]}")
        out[k] = [b[m] for m in seri]
    return out


def sel_subset(topo, prov):
    """sel iklim untuk sub-DAS yang menyentuh kab provinsi `prov` dan semua sub-DAS hulunya (himpunan tertutup)"""
    sub = topo["subdas"]
    anak = collections.defaultdict(list)
    for i, s in sub.items():
        anak[str(s["nd"])].append(i)
    pilih = {i for i, s in sub.items() if any(k.startswith(prov) for k in s["kab"])}
    tumpuk = list(pilih)
    while tumpuk:
        for c in anak[tumpuk.pop()]:
            if c not in pilih:
                pilih.add(c)
                tumpuk.append(c)
    # urut per DAS utuh, DAS terkecil dulu: tiap jalan yang terpotong kuota tetap menyisakan DAS yang lengkap
    # beserta hulunya, jadi neraca.py bisa jalan atas sebagian DAS.
    def muara(i):
        while str(sub[i]["nd"]) in sub:
            i = str(sub[i]["nd"])
        return i
    das = collections.defaultdict(set)
    for i in pilih:
        das[muara(i)] |= {c for kb in sub[i]["kab"].values() for c in kb}
    urut, lihat = [], set()
    for m in sorted(das, key=lambda m: (len(das[m]), m)):
        for c in sorted(das[m] - lihat):
            urut.append(c)
            lihat.add(c)
    return urut, pilih


def tarik(sel, cache, maks=None):
    perlu = [c for c in sel if c not in cache["sel"]][:maks]
    print(f"perlu {len(perlu)} sel (cache {len(cache['sel'])}), bobot ~{len(perlu) * 182.6:.0f}", file=sys.stderr)
    for a in range(0, len(perlu), PER_MINTA):
        b = perlu[a:a + PER_MINTA]
        q = {"latitude": ",".join(c.split(",")[0] for c in b), "longitude": ",".join(c.split(",")[1] for c in b),
             "models": MODEL, "daily": ",".join(VAR), "start_date": f"{AWAL}-01-01", "end_date": f"{AKHIR}-12-31",
             "timezone": "Asia/Jakarta"}
        try:
            data = per_lokasi(ambil(URL + urllib.parse.urlencode(q), batas_waktu=300))
        except KuotaHabis as e:
            print(f"  kuota habis ({str(e)[:100]}); jalankan lagi nanti, cache aman", file=sys.stderr)
            return False
        for c, d in zip(b, data):
            cache["sel"][c] = ringkas_sel(d["daily"])
            cache["sel"][c]["elev"] = d.get("elevation")
        simpan(KELUAR, cache)
        print(f"  {a + len(b)}/{len(perlu)} sel (cache {len(cache['sel'])})", file=sys.stderr)
        if a + PER_MINTA < len(perlu):
            time.sleep(JEDA)
    return True


def main(arg):
    topo = json.load(open(TOPO))
    if "--prov" in arg:
        sel, _ = sel_subset(topo, arg[arg.index("--prov") + 1])
    elif "--semua" in arg:
        sel = sorted({c for s in topo["subdas"].values() for kb in s["kab"].values() for c in kb})
    else:
        sys.exit(__doc__)
    maks = int(arg[arg.index("--maks") + 1]) if "--maks" in arg else None
    cache = json.load(open(KELUAR)) if os.path.exists(KELUAR) else {
        "meta": {"sumber": "ERA5 / ERA5-Land (Copernicus C3S) via Open-Meteo Archive API, models=era5_seamless (era5_land tanpa hujan di Open-Meteo), CC BY 4.0",
                 "variabel": {"p": "precipitation_sum", "et0": "et0_fao_evapotranspiration (FAO-56 PM, Open-Meteo)"},
                 "satuan": "mm/bulan", "bulan_awal": f"{AWAL}-01", "bulan_akhir": f"{AKHIR}-12", "label": "estimasi-model"},
        "sel": {}}
    cache["meta"]["ditarik"] = time.strftime("%Y-%m-%d")
    lengkap = tarik(sel, cache, maks)
    print(f"{'lengkap' if lengkap and all(c in cache['sel'] for c in sel) else 'belum lengkap'}: "
          f"{sum(c in cache['sel'] for c in sel)}/{len(sel)} sel", file=sys.stderr)


def uji():
    hari = [f"2001-02-{d:02d}" for d in range(1, 29)] + [f"2001-03-{d:02d}" for d in range(1, 31)]
    b = bulanan(hari, [1.0] * 28 + [2.0] * 30)
    assert b == {"2001-02": 28.0}, f"Maret kurang sehari harus ditolak: {b}"
    try:
        bulanan(["2001-01-01"], [-1])
    except ValueError:
        pass
    else:
        raise AssertionError("hujan negatif lolos")
    seri = bulan_seri()
    assert len(seri) == 420 and seri[0] == "1991-01" and seri[-1] == "2025-12"
    try:
        ringkas_sel({"time": hari, VAR[0]: [1.0] * 58, VAR[1]: [1.0] * 58})
    except ValueError as e:
        assert "bulan tak lengkap" in str(e)
    else:
        raise AssertionError("seri bolong lolos")
    topo = {"subdas": {"1": {"nd": 2, "kab": {"3301": {"a": 1}}}, "2": {"nd": 3, "kab": {"3401": {"b": 1}}},
                       "3": {"nd": 0, "kab": {"3401": {"c": 1}}}, "4": {"nd": 0, "kab": {"3201": {"d": 1}}}}}
    sel, pilih = sel_subset(topo, "34")
    assert pilih == {"1", "2", "3"} and sel == ["a", "b", "c"], (pilih, sel)   # hulu dari Jateng ikut, DAS lain tidak
    topo["subdas"]["5"] = {"nd": 0, "kab": {"3402": {"e": 1, "f": 1}}}
    topo["subdas"]["6"] = {"nd": 0, "kab": {"3403": {"g": 1}}}
    sel, _ = sel_subset(topo, "34")
    assert sel == ["g", "e", "f", "a", "b", "c"], sel   # DAS terkecil dulu, sel satu DAS berurutan
    print("ok iklim")


if __name__ == "__main__":
    uji() if sys.argv[1:] == ["uji"] else main(sys.argv[1:])
