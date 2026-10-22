"""Ambang bahaya FWI dari PERSENTIL historis per provinsi (pola bcgov/wps) -> public/data/persentil_fwi.json

Alternatif kelas FWI absolut BMKG (aturan.kelas_fwi: <2, <7, <14). FWI absolut dikalibrasi di Kanada/Sumatra-Kalimantan;
di Papua Selatan/NTT/Jawa ia bisa terus "rendah" atau terus "tinggi". Persentil mengukur "tinggi dibanding biasanya di sini".

Tabel: FWI harian jam 12 setempat (fwi.deret, kerangka harian.cuaca_fwi) dari ERA5 Open-Meteo archive 2015-2025 (11 tahun),
hanya hari musim kebakaran provinsi itu (dasarian dengan p_semua >= 0,3 di musim.json, sama dengan musim.ringkas),
dikumpulkan dari sel 0,5 derajat contoh provinsi itu. P50, P80, P90, P97 (peringkat terdekat, sama dengan musim.persentil).
Kelas (aturan.kelas_fwi_persentil, sama bentuk 0-3 dengan kelas_fwi supaya status() tak berubah):
  0 < P50 | 1 P50-P80 | 2 P80-P97 | 3 >= P97.
Pilihan: P80 dan P97 meniru batas "tinggi" dan "ekstrem" wps (P90/P97 untuk ekstrem); kelas 2 diberi lebar 17 titik persen
(bukan P90) agar porsi hari berstatus tinggi (>= kelas 2) ~20% per definisi. P90 tetap disimpan sebagai info.

Uji balik (mode `balik`), kebocoran dicegah leave-year-out: tabel untuk tahun uji Y dihitung dari 10 tahun lain.
Kejadian = hari-sel 0,5 derajat dengan >= K titik VIIRS (type 0, keyakinan bukan rendah, hari WIB) di data/raw/firms
(2015, 2019, 2023, 2024, 2025), hanya hari musim. Ukuran per skema (kelas >= 2 = "tinggi"): hit rate, porsi hari berstatus
tinggi, false alarm (1 - presisi), J = hit - POFD (Youden), AUC FWI mentah vs AUC peringkat persentil provinsi.
Keputusan ADOPSI hanya bila J persentil > J absolut di kedua kelompok (Sumatra+Kalimantan, lainnya) DAN hit rate persentil
>= hit absolut - 0,02 di K=20; selain itu fungsi + tabel hanya info pembanding dan harian.py tidak diubah.

HASIL (22 Okt 2026; 16 provinsi x 2 sel = 32 sel, 4 tahun uji (2019, 2023, 2024, 2025; 2015 hanya pemanasan), K=20 titik/hari-sel; musim = definisi musim.json 0,3):
  kelompok / skema          porsi  hit    far    J       | musim lebar (0,1): porsi hit    far    J
  Sum+Kal  absolut >=7      0,398  0,890  0,619  0,592   |  0,276 0,837 0,681 0,627
  Sum+Kal  persentil >=P80  0,419  0,909  0,630  0,591   |  0,356 0,892 0,737 0,598
  Lainnya  absolut >=7      0,633  0,929  0,921  0,313   |  0,440 0,926 0,930 0,503
  Lainnya  persentil >=P80  0,327  0,625  0,897  0,315   |  0,287 0,624 0,928 0,349
  Lainnya  absolut >=14     0,518  0,848  0,912  0,349   |  0,354 0,826 0,922 0,488
  Lainnya  persentil >=P97  0,072  0,223  0,834  0,159   |  0,060 0,255 0,860 0,201
KEPUTUSAN: TIDAK ADOPSI menurut aturan K=20 (kedua definisi musim). Arah di K lain campuran: persentil menang J di K=5
Sumatra+Kalimantan (0,588 vs 0,549) dan di K=50 Lainnya (hanya 38-49 kejadian). Selisih J < 0,01 dianggap seri (tanpa selang
kepercayaan; hari-sel beruntun berkorelasi). Persentil unggul untuk membandingkan FWI LINTAS provinsi (AUC pooled), bukan status per kompleks.
Persentil menurunkan porsi hari "tinggi" di luar Sumatra/Kalimantan (0,63 -> 0,33) tetapi dengan membuang 30-40% hari api besar
(hit 0,93 -> 0,62); J tak lebih baik (0,315 vs 0,313; musim lebar 0,349 vs 0,503). Di Sumatra/Kalimantan hit sama dan J sama
(0,591 vs 0,592). Satu-satunya keunggulan: AUC pooled lintas provinsi (peringkat persentil 0,84-0,85 vs FWI mentah 0,71-0,80),
yaitu membuat FWI sebanding antarprovinsi untuk peringkat nasional, bukan memisahkan hari api di dalam satu provinsi.
Temuan terkait: FWI musim di NTT/NTB/Jatim sudah >= 14 pada median (P50 20-40), jadi kelas absolut di sana nyaris selalu 3
(hari berstatus tinggi 0,63) dan tak memilah; tetapi persentil 4 kelas tetap tak lebih baik karena hari api besar di
sana (sabana/ladang) tidak berkorelasi kuat dengan FWI di dalam musim.
Batas: sel contoh = 2 sel teratas per provinsi dengan hari-api terbanyak (condong ke sel rawan, base rate lebih tinggi dari
rata provinsi); provinsi bermusim sempit (Riau 2 dasarian, Papua 1) tabelnya hanya 200-400 nilai; kejadian = hitungan titik
per sel 0,5 derajat, bukan kompleks (aturan.py memakai px24 per kompleks); VIIRS 2015 hanya S-NPP sedangkan 2024-2025
tiga satelit (hitungan K tak setara antartahun).
Tabel info pembanding ada di public/data/persentil_fwi.json (`hitung`); harian.py TIDAK diubah.

Pakai:
  python3 scripts/data/persentil_fwi.py tarik     # ERA5 -> data/raw/persentil_fwi/cuaca/ (kuota Open-Meteo, aman diulang)
  python3 scripts/data/persentil_fwi.py hitung    # tabel -> public/data/persentil_fwi.json
  python3 scripts/data/persentil_fwi.py balik [0,3]  # uji balik, cetak tabel (argumen: ambang p_semua musim; 0,1 = musim lebar)
  python3 scripts/data/persentil_fwi.py uji       # self-check kecil tanpa jaringan
"""
import bisect, csv, datetime as dt, glob, json, math, os, sys

sys.path.insert(0, os.path.dirname(__file__))
import aturan as A
import fwi as F
from wilayah import AKAR, PROVINSI

MENTAH = os.path.join(AKAR, "data/raw/persentil_fwi")
KELUAR = os.path.join(AKAR, "public/data/persentil_fwi.json")
TAHUN = list(range(2015, 2026))
TAHUN_API = [2015, 2019, 2023, 2024, 2025]
KAL_SUM = {"11", "12", "13", "14", "15", "16", "17", "18", "19", "21", "61", "62", "63", "64", "65"}
CONTOH_PROV = ["14", "15", "16", "61", "62", "63", "64", "53", "52", "93", "91", "73", "74", "72", "35", "81"]
PER_PROV = 2
P_TABEL = (50, 80, 90, 97)
WIB = dt.timedelta(hours=7)


def persentil(xs, p):
    s = sorted(xs)
    return s[min(len(s) - 1, int(p / 100 * (len(s) - 1)))]


def tabel_dari(nilai):
    """{'p50':..,'p80':..,'p90':..,'p97':..,'n':..} dari daftar FWI hari musim."""
    return {**{f"p{p}": round(persentil(nilai, p), 2) for p in P_TABEL}, "n": len(nilai)}


kelas_persentil = A.kelas_fwi_persentil  # satu definisi, di aturan.py


def peringkat(fwi, urut):
    """Porsi nilai latih <= fwi (0-1) dari daftar latih terurut."""
    return bisect.bisect_right(urut, fwi) / len(urut)


# ---------------------------------------------------------------- data
def sel05(lat, lon):
    return math.floor(lat / .5) * .5 + .25, math.floor(lon / .5) * .5 + .25


def api_per_sel():
    """{(lat,lon): {tanggal WIB: titik}} dari arsip VIIRS (type 0, keyakinan bukan l)."""
    out = {}
    for th in TAHUN_API:
        for r in csv.DictReader(open(os.path.join(AKAR, f"data/raw/firms/viirs_{th}.csv"))):
            if r["confidence"] == "l" or r.get("type", "0") not in ("0", ""):
                continue
            jam = r["acq_time"].zfill(4)
            t = dt.datetime.fromisoformat(f"{r['acq_date']}T{jam[:2]}:{jam[2:]}") + WIB
            k = sel05(float(r["latitude"]), float(r["longitude"]))
            d = out.setdefault(k, {})
            d[t.date().isoformat()] = d.get(t.date().isoformat(), 0) + 1
    return out


def pilih_sel():
    """PER_PROV sel kisi fwi.json per provinsi contoh dengan paling banyak hari-api (>= 5 titik); disimpan di sel.json."""
    jalur = os.path.join(MENTAH, "sel.json")
    if os.path.exists(jalur):
        return json.load(open(jalur))
    api = api_per_sel()
    grid = json.load(open(os.path.join(AKAR, "public/data/fwi.json")))["grid"]
    out = []
    for p in CONTOH_PROV:
        sel = [(sum(1 for n in api.get((g["lat"], g["lon"]), {}).values() if n >= 5), g) for g in grid if g["prov"] == p]
        for n, g in sorted(sel, key=lambda x: -x[0])[:PER_PROV]:
            out.append({"lat": g["lat"], "lon": g["lon"], "prov": p, "hari_api": n})
    os.makedirs(MENTAH, exist_ok=True)
    json.dump(out, open(jalur, "w"))
    return out


def jalur_cuaca(c):
    return os.path.join(MENTAH, "cuaca", f"{c['lat']:.2f}_{c['lon']:.2f}.json")


def tarik():
    """Satu panggilan archive per sel (2015-2025, bobot ~290 dari 10.000/hari). Berkas ada = dilewati."""
    sys.path.insert(0, os.path.join(AKAR, "scripts/banjir"))
    from umum import ambil, KuotaHabis, simpan  # noqa: E402
    import harian
    for c in pilih_sel():
        if os.path.exists(jalur_cuaca(c)):
            continue
        url = (f"https://archive-api.open-meteo.com/v1/archive?latitude={c['lat']}&longitude={c['lon']}"
               f"&start_date={TAHUN[0]}-01-01&end_date={TAHUN[-1]}-12-31&timezone=auto&hourly=temperature_2m,"
               "relative_humidity_2m,wind_speed_10m,precipitation")
        try:
            h = ambil(url, batas_waktu=300)["hourly"]
        except KuotaHabis as e:
            print("kuota habis, lanjutkan nanti:", str(e)[:100])
            return
        h["wind_direction_10m"] = [0] * len(h["time"])
        simpan(jalur_cuaca(c), [[t, a, b, w, r] for t, a, b, w, r, _ in harian.siang(h)])
        print("ok", c)


def fwi_sel(c):
    """{tanggal: fwi} 2015-2025 dari cuaca jam 12 sel, FWI bersambung dari awal baku (Jan 2015 dibuang dari tabel)."""
    hari = json.load(open(jalur_cuaca(c)))
    seri = F.deret([x[1:5] for x in hari])
    return {h[0]: s["fwi"] for h, s in zip(hari, seri) if "celah" not in s}


def musim_hari(prov, ambang=0.3):
    """Himpunan indeks dasarian musim (p_semua >= 0,3, awal..akhir) provinsi."""
    p = json.load(open(os.path.join(AKAR, "public/data/musim.json")))["prov"][prov]["p_semua"]
    idx = [i for i, v in enumerate(p) if v >= ambang]
    return range(idx[0], idx[-1] + 1) if idx else range(0)


def dasarian(tgl):
    d = dt.date.fromisoformat(tgl)
    return (d.month - 1) * 3 + min(2, (d.day - 1) // 10)


def kumpul(ambang=0.3):
    """{prov: [(lat,lon, {tgl: fwi} musim saja)]} hanya sel yang cuacanya sudah ditarik, 2016+ (tahun pertama = pemanasan)."""
    out = {}
    for c in pilih_sel():
        if not os.path.exists(jalur_cuaca(c)):
            continue
        ms = musim_hari(c["prov"], ambang)
        s = {t: v for t, v in fwi_sel(c).items() if t >= "2016" and dasarian(t) in ms}
        out.setdefault(c["prov"], []).append(((c["lat"], c["lon"]), s))
    return out


def tabel_prov(data, tanpa=None):
    """{prov: tabel_dari(...)} dari semua tahun kecuali `tanpa` (leave-year-out)."""
    return {p: tabel_dari([v for _, s in sels for t, v in s.items() if t[:4] != str(tanpa)]) for p, sels in data.items()}


# ---------------------------------------------------------------- uji balik
def auc(skor_kejadian, skor_lain):
    """Peluang skor kejadian > skor bukan-kejadian (Mann-Whitney, seri 0,5), O(n log n)."""
    if not skor_kejadian or not skor_lain:
        return None
    urut = sorted(skor_lain)
    n = 0.0
    for x in skor_kejadian:
        n += (bisect.bisect_left(urut, x) + bisect.bisect_right(urut, x)) / 2
    return n / (len(skor_kejadian) * len(urut))


def balik(K=20, ambang=0.3):
    """Hitung per kelompok: tabel konfusi kelas >= 2 / == 3 untuk skema absolut dan persentil leave-year-out."""
    api = api_per_sel()
    data = kumpul(ambang)
    hasil = {}
    tabel_th = {th: tabel_prov(data, th) for th in TAHUN_API}
    for kel, himp in (("Sumatra+Kalimantan", KAL_SUM), ("Lainnya", None), ("Semua", ())):
        satu = {"hari": 0, "kejadian": 0}
        sk = {"abs": [], "per": [], "raw": [], "rank": []}  # (kelas, ada_kejadian)
        for p, sels in data.items():
            if himp is None and p in KAL_SUM or himp and p not in himp:
                continue
            for th in TAHUN_API:
                tab = tabel_th[th][p]
                latih = sorted(v for _, s in sels for t, v in s.items() if t[:4] != str(th))
                for xy, s in sels:
                    for t, v in s.items():
                        if t[:4] != str(th):
                            continue
                        y = api.get(xy, {}).get(t, 0) >= K
                        sk["abs"].append((A.kelas_fwi(v), y))
                        sk["per"].append((kelas_persentil(v, tab), y))
                        sk["raw"].append((v, y))
                        sk["rank"].append((peringkat(v, latih), y))
        if not sk["abs"]:
            continue
        n = len(sk["abs"])
        pos = sum(1 for _, y in sk["abs"] if y)
        r = {"hari": n, "kejadian": pos}
        for nama in ("abs", "per"):
            for lv in (2, 3):
                tp = sum(1 for k, y in sk[nama] if k >= lv and y)
                fp = sum(1 for k, y in sk[nama] if k >= lv and not y)
                r[f"{nama}{lv}"] = {"porsi": round((tp + fp) / n, 3), "hit": round(tp / pos, 3) if pos else None,
                                        "far": round(fp / (tp + fp), 3) if tp + fp else None,
                                        "J": round(tp / pos - fp / (n - pos), 3) if pos and n > pos else None}
        r["auc_fwi"] = round(auc([v for v, y in sk["raw"] if y], [v for v, y in sk["raw"] if not y]), 3)
        r["auc_peringkat"] = round(auc([v for v, y in sk["rank"] if y], [v for v, y in sk["rank"] if not y]), 3)
        hasil[kel] = r
    return hasil


def keputusan(b20):
    """ADOPSI hanya bila J(per2) > J(abs2) di kedua kelompok dan hit(per2) >= hit(abs2) - 0,02 (K=20)."""
    ok = all(b20[k]["per2"]["J"] > b20[k]["abs2"]["J"] and b20[k]["per2"]["hit"] >= b20[k]["abs2"]["hit"] - .02
             for k in ("Sumatra+Kalimantan", "Lainnya") if k in b20)
    return "ADOPSI" if ok else "TIDAK"


def cetak(K, ambang=0.3):
    for k, v in balik(K, ambang).items():
        print(f"\n[K={K}] {k}: {v['hari']} hari-sel musim, {v['kejadian']} hari api besar, AUC FWI {v['auc_fwi']} vs peringkat {v['auc_peringkat']}")
        print("  skema           porsi   hit    far     J")
        for nama, lab in (("abs2", "absolut >=2 (FWI>=7)"), ("per2", "persentil >=2 (>=P80)"), ("abs3", "absolut 3 (FWI>=14)"), ("per3", "persentil 3 (>=P97)")):
            m = v[nama]
            print(f"  {lab:<22}{m['porsi']:<8}{m['hit']!s:<7}{m['far']!s:<8}{m['J']}")


def hitung():
    data = kumpul()
    out = {"sumber": "ERA5 Open-Meteo archive 2016-2025 (2015 pemanasan), FWI Van Wagner jam 12 setempat, hari musim kebakaran (musim.json p_semua >= 0,3)",
           "sel_contoh": {p: [list(xy) for xy, _ in s] for p, s in data.items()},
           "kelas": "0 <P50 | 1 P50-P80 | 2 P80-P97 | 3 >=P97",
           "prov": {p: {"nama": PROVINSI.get(p, p), **t} for p, t in tabel_prov(data).items()}}
    json.dump(out, open(KELUAR, "w"), ensure_ascii=False, separators=(",", ":"))
    print("tulis", KELUAR, len(out["prov"]), "provinsi")


def uji():
    t = tabel_dari(list(range(101)))
    assert (t["p50"], t["p80"], t["p90"], t["p97"], t["n"]) == (50, 80, 90, 97, 101), t
    assert [kelas_persentil(x, t) for x in (49.9, 50, 79.9, 80, 96.9, 97)] == [0, 1, 1, 2, 2, 3]
    assert kelas_persentil(8, None) == A.kelas_fwi(8) == 2
    assert auc([3, 4], [1, 2]) == 1 and auc([1, 2], [3, 4]) == 0 and auc([1], [1]) == .5
    assert abs(peringkat(5, [1, 3, 5, 7]) - .75) < 1e-9
    assert dasarian("2019-09-15") == 25 and sel05(-10.2, 123.8) == (-10.25, 123.75)
    assert keputusan({k: {"abs2": {"J": .1, "hit": .5}, "per2": {"J": .2, "hit": .5}} for k in ("Sumatra+Kalimantan", "Lainnya")}) == "ADOPSI"
    assert keputusan({k: {"abs2": {"J": .1, "hit": .5}, "per2": {"J": .2, "hit": .4}} for k in ("Sumatra+Kalimantan", "Lainnya")}) == "TIDAK"
    print("ok")


if __name__ == "__main__":
    m = sys.argv[1] if len(sys.argv) > 1 else "uji"
    if m == "tarik":
        tarik()
    elif m == "hitung":
        hitung()
    elif m == "balik":
        amb = float(sys.argv[2]) if len(sys.argv) > 2 else 0.3  # 0,3 = definisi musim.ringkas; 0,1 = musim lebar (sensitivitas)
        print("ambang musim p_semua >=", amb)
        for K in (5, 20, 50):
            cetak(K, amb)
        print("\nKEPUTUSAN (K=20):", keputusan(balik(20, amb)))
    else:
        uji()
