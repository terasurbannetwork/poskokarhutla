"""Kalender musim dan indeks risiko riwayat kekeringan -> public/data/kekeringan_riwayat.json (tanpa jaringan di luar cache hujan spi.py)

Bahan: cache hujan bulanan NASA POWER 1991-2025 per sel 0,5 derajat (data/raw/kekeringan_hujan.json, diisi spi.hujan_bulanan oleh status.py), ONI (prakiraan.muat_oni),
kejadian kering DIBI BNPB (public/banjir/data/kejadian.json, jenis `kering`, hanya 2023-2026).

kalender  per provinsi dan nasional, rata-rata sel provinsi: curah hujan bulanan rata-rata 1991-2025 (mm), rata-rata pada tahun El Nino (ONI Jul-Sep >= +0,5) dan
          porsi tahun dengan bulan kering. Bulan kering = < 60 mm (Schmidt-Ferguson 1951, klasifikasi bulan kering/lembap/basah yang dipakai di Indonesia).
          Sengaja BUKAN porsi tahun SPI rendah: SPI dibakukan per bulan sehingga porsinya sama di semua bulan menurut definisi dan tak menunjukkan musim.
risiko    indeks 0-100 per kabupaten, bobot sama dengan risiko_riwayat karhutla (scripts/data/aturan.py): 50% kekerapan, 30% besaran, 20% tren.
            kekerapan = porsi tahun 1991-2025 yang punya >= 1 bulan berstatus Siaga atau lebih (SPI-3 <= -1,5 pada >= 30% penduduk kabupaten, aturan status.py);
            besaran   = log(1 + total bulan Siaga+) / log(1 + total terbesar antar kabupaten);
            tren      = rata-rata bulan Siaga+ per tahun pada paruh akhir seri vs paruh awal; turun separuh = 0, naik dua kali = 1 (log2).
          Catatan: SPI memakai baku 1991-2020, jadi porsi bulan Siaga rata-rata nasional ditetapkan definisi; yang informatif adalah perbedaan antar kabupaten dan tren.
          Kejadian DIBI (2023-2026, terlalu pendek untuk tren) ditampilkan sebagai pembanding, TIDAK masuk indeks.
Pakai:  python3 scripts/kekeringan/riwayat.py      |  python3 scripts/kekeringan/riwayat.py uji
"""
import calendar, datetime as dt, json, math, os, sys

AB = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, AB)
sys.path.insert(1, os.path.join(AB, "..", "banjir"))
from umum import baca, simpan
import hth as H
import prakiraan as PK
import spi as SPI
import ujibalik as UB

BULAN_KERING_MM = 60
EL_NINO = .5
TAHUN = list(range(1991, 2026))
BOBOT = (.5, .3, .2)


def indeks(per_tahun, maks_total):
    """per_tahun = [bulan Siaga+ tiap tahun, urut tahun] -> (risiko 0-100, kekerapan 0-1, total, tren 0-1)."""
    n = len(per_tahun)
    if not n or maks_total <= 0:
        return 0, 0.0, 0, .5
    i = n // 2
    lama, baru = sum(per_tahun[:i]) / max(i, 1), sum(per_tahun[i:]) / max(n - i, 1)
    tren = min(1, max(0, (math.log2((baru + 1) / (lama + 1)) + 1) / 2))
    total = sum(per_tahun)
    frek = sum(1 for x in per_tahun if x >= 1) / n
    return round(100 * (BOBOT[0] * frek + BOBOT[1] * math.log1p(total) / math.log1p(maks_total) + BOBOT[2] * tren)), round(frek, 3), total, round(tren, 3)


def kalender(pow_sel, prov_sel, tahun_el_nino):
    """{prov: {mm: [12], mm_elnino: [12], kering_pct: [12], n_sel}}; 'nasional' = semua sel. Bulan tanpa data di sebuah sel tak dihitung untuk sel itu."""
    out = {}
    kelompok = {"nasional": list(pow_sel)}
    for k in pow_sel:
        kelompok.setdefault(prov_sel.get(k, "?"), []).append(k)
    for g, ks in kelompok.items():
        if g == "?":
            continue
        mm, el, kr = [], [], []
        for m in range(1, 13):
            semua, ele, kering, n = [], [], 0, 0
            for k in ks:
                for y in TAHUN:
                    v = pow_sel[k].get(f"{y}{m:02d}")
                    if v is None:
                        continue
                    x = v * calendar.monthrange(y, m)[1]
                    semua.append(x); n += 1
                    kering += x < BULAN_KERING_MM
                    if y in tahun_el_nino:
                        ele.append(x)
            mm.append(round(sum(semua) / len(semua)) if semua else None)
            el.append(round(sum(ele) / len(ele)) if ele else None)
            kr.append(round(100 * kering / n) if n else None)
        out[g] = {"mm": mm, "mm_elnino": el, "kering_pct": kr, "n_sel": len(ks)}
    return out


def risiko_kab(spi, peta):
    """{kab: [bulan Siaga+ per tahun TAHUN]}"""
    per = {}
    for y in TAHUN:
        for m in range(1, 13):
            for kab, lv in UB.tingkat_kab(spi, y, m, peta).items():
                a = per.setdefault(kab, [0] * len(TAHUN))
                a[y - TAHUN[0]] += lv >= 2
    return per


def bangun(pow_sel, prov_sel, oni, penduduk, pusat, kej, hari):
    if len(pow_sel) < 3:
        raise ValueError(f"riwayat butuh seri POWER banyak sel, ada {len(pow_sel)}")
    el = {y for y in TAHUN if (o := oni.get(("JAS", y))) is not None and o >= EL_NINO}
    if len({y for (_, y) in oni}) < 25:
        raise ValueError("ONI kurang dari 25 tahun")
    spi = UB.spi3_sel(pow_sel, range(1, 13), TAHUN)
    peta = H.peta_kec(penduduk, pusat, pow_sel)
    per = risiko_kab(spi, peta)
    mx = max((sum(a) for a in per.values()), default=0)
    dibi = {}
    kabs = set(per)
    n_dibi, _, _ = UB.kejadian_per_kab(kej or {}, kabs)
    for (kab, ym), n in n_dibi.items():
        dibi[kab] = dibi.get(kab, 0) + n
    kab = {}
    for k, a in per.items():
        r, f, tot, tr = indeks(a, mx)
        kab[k] = {"risiko": r, "kekerapan": f, "bulan_siaga": tot, "tren": tr, "dibi": dibi.get(k, 0)}
    return {"dibuat": dt.datetime.now(H.WIB).isoformat(timespec="minutes"), "hari": hari, "label": "Deteksi Centurisk97", "tahun": [TAHUN[0], TAHUN[-1]],
            "tahun_el_nino": sorted(el), "bulan_kering_mm": BULAN_KERING_MM, "bobot": {"kekerapan": BOBOT[0], "besaran": BOBOT[1], "tren": BOBOT[2]}, "maks_bulan_siaga": mx,
            "catatan": "Indeks 0-100: 50% kekerapan tahun bersiaga, 30% besaran, 20% tren (paruh akhir vs paruh awal seri). SPI berbaku 1991-2020 sehingga porsi bulan Siaga rata-rata nasional ditetapkan definisi; "
                       "yang bermakna adalah perbedaan antar kabupaten. Kejadian DIBI 2023-2026 hanya pembanding.",
            "sumber": "NASA POWER (MERRA-2) hujan bulanan 1991-2025; ONI NOAA CPC; kejadian DIBI BNPB; bulan kering Schmidt-Ferguson 1951 (< 60 mm)",
            "kalender": kalender(pow_sel, prov_sel, el), "kab": kab}


def main():
    r = lambda f: json.load(open(os.path.join(H.DIR_DATA, f)))
    tanah, penduduk, iklim = r("tanah.json"), r("penduduk.json"), r("iklim.json")
    pusat = json.load(open(os.path.join(H.AKAR, "public/banjir/data/pusat_kec.json")))
    hari = dt.datetime.now(H.WIB).date()
    pow_sel = SPI.hujan_bulanan([(g["lat"], g["lon"]) for g in tanah["grid"]], hari)
    prov = {f"{g['lat']},{g['lon']}": g["prov"] for g in tanah["grid"]}
    kej = baca(os.path.join(H.AKAR, "public/banjir/data/kejadian.json"))
    isi = bangun(pow_sel, prov, PK.muat_oni(iklim), penduduk, pusat, kej, hari.isoformat())
    simpan(os.path.join(H.DIR_DATA, "kekeringan_riwayat.json"), isi)
    top = sorted(isi["kab"].items(), key=lambda x: -x[1]["risiko"])[:3]
    print(f"riwayat: {len(isi['kab'])} kab, {len(isi['kalender']) - 1} prov; tertinggi {[(k, v['risiko']) for k, v in top]}", file=sys.stderr)


def uji():
    # indeks: kronis (tiap tahun) > sekali besar; seri kosong netral pada tren; tren naik > turun
    assert indeks([0] * 34, 10)[0] == 10 and indeks([], 10)[0] == 0                     # tanpa kejadian: hanya tren netral (20% x .5)
    kron = indeks([1] * 34, 34)[0]
    sekali = indeks([34] + [0] * 33, 34)[0]
    assert kron > sekali and indeks([0] * 17 + [2] * 17, 34)[3] > indeks([2] * 17 + [0] * 17, 34)[3] and 0 <= sekali <= kron <= 100
    assert indeks([1] * 34, 34)[1] == 1.0 and indeks([0, 0, 1, 0], 4)[1] == .25
    # kalender: sel A kering (30 mm/bulan, 1 mm/hari) tiap Agu, 200 mm di bulan lain; El Nino 2015 lebih kering
    def seri(f):
        return {f"{y}{m:02d}": (1.0 if m == 8 else 6.5) * f(y, m) for y in range(1991, 2026) for m in range(1, 13)}
    a = seri(lambda y, m: .5 if y == 2015 and m == 8 else 1)
    k = kalender({"0.25,0.25": a, "0.25,1.25": a}, {"0.25,0.25": "11", "0.25,1.25": "11"}, {2015})
    assert k["nasional"]["kering_pct"][7] == 100 and k["nasional"]["kering_pct"][0] == 0 and k["11"]["mm_elnino"][7] < k["11"]["mm"][7] and k["11"]["n_sel"] == 2
    # bangun: bentuk keluaran, tahun El Nino, DIBI hanya jenis kering (urutan risiko antar kabupaten diuji lewat indeks di atas)
    kering = {f"{y}{m:02d}": (.02 if y in (1997, 2015) and 6 <= m <= 10 else 5.0 + (y * 7 + m * 3) % 5 * .3) for y in range(1991, 2027) for m in range(1, 13) if (y, m) <= (2026, 8)}
    normal = {f"{y}{m:02d}": 5.0 + (y * 7 + m * 3) % 5 * .3 for y in range(1991, 2027) for m in range(1, 13) if (y, m) <= (2026, 8)}
    oni = {(m, y): (1.0 if y in (1997, 2015) else 0.0) for y in range(1991, 2027) for m in ("MAM", "JAS")}
    kej = {"kejadian_dibi": [{"tanggal": "2024-08-03", "jenis": "kering", "prov": "11", "kab": "Alfa"}, {"tanggal": "2024-08-03", "jenis": "banjir", "prov": "11", "kab": "Alfa"}]}
    o = bangun({"0.25,0.25": kering, "0.25,1.25": normal, "0.25,2.25": normal}, {"0.25,0.25": "11", "0.25,1.25": "11", "0.25,2.25": "11"}, oni,
               {"kec": {"11|Alfa|a": 1000, "11|Beta|b": 1000}}, {"11|Alfa|a": [.3, .3], "11|Beta|b": [.3, 1.2]}, kej, "2026-10-19")
    assert o["tahun_el_nino"] == [1997, 2015] and set(o["kab"]) == {"11|Alfa", "11|Beta"} and all(0 <= v["risiko"] <= 100 for v in o["kab"].values()) and o["kab"]["11|Alfa"]["dibi"] == 1 and o["kab"]["11|Beta"]["dibi"] == 0
    assert o["kab"]["11|Alfa"]["bulan_siaga"] > 0 and len(json.dumps(o)) < 20_000
    for jelek in (lambda: bangun({"a": kering}, {}, oni, {"kec": {}}, {}, None, "x"), lambda: bangun({"a": kering, "b": kering, "c": kering}, {}, {("JAS", 2000): 0}, {"kec": {}}, {}, None, "x")):
        try:
            jelek()
            raise SystemExit("harus menolak masukan kurang")
        except ValueError:
            pass
    print("ok riwayat")


if __name__ == "__main__":
    uji() if sys.argv[1:] == ["uji"] else main()
