"""#34 SIRANAP Kemenkes x asap: kebutuhan tempat tidur tambahan dan "hari sampai penuh" per kabupaten -> public/data/bnpb/rs_kapasitas.json

RUMUS    PM_lebih  = max(0, maks rata-rata bergulir 24 jam PM2,5 prakiraan 72 jam - 15,5)           [ug/m3; 15,5 = batas Baik, Permen LHK P.14/2020]
         lambda    = P x r0/1000/365 x (RR10^(PM_lebih/10) - 1)           tambahan rawat inap pernapasan per HARI
           P  penduduk kabupaten (Dukcapil, kerentanan.json)         r0  laju rawat inap pernapasan per 1000 penduduk per TAHUN (ASUMSI)
           RR10 risiko relatif rawat inap pernapasan per +10 ug/m3 PM2,5 asap kebakaran lahan/hutan (LITERATUR)
         TT_stabil = lambda x LOS             tempat tidur terisi tambahan pada keadaan tunak (tiap pasien menempati LOS hari)
         hari_penuh = TT_kosong / lambda      bila TT_kosong < lambda x LOS; selain itu "aman" (pasien pulang secepat yang masuk, tempat tidur kosong cukup)
KOEFISIEN RR10 = 1,04 (CI95 1,02-1,05) rawat inap pernapasan per +10 ug/m3 PM2,5 asap kebakaran liar: Wang Y, Chen J, Huang Y, dkk. (2025)
         "Associations of wildfire-derived particulate matter with hospitalization, emergency department visits and mortality: a systematic
         review and meta-analysis", Environ Res 273:121221, doi:10.1016/j.envres.2025.121221 (PMID 40020860; diperiksa dari abstrak PubMed,
         29 Okt 2026). Skenario rendah/tengah/tinggi memakai batas bawah/titik/atas selang itu. Studi mayoritas Amerika Utara dan Australia:
         keterlaluan untuk dipindahkan mentah ke Indonesia, jadi tiga skenario selalu ditampilkan bersama.
ASUMSI   r0 = 2 / 5 / 10 per 1000 per tahun dan LOS = 5 hari adalah ASUMSI kerja (tak ada statistik rawat inap pernapasan per kabupaten yang
         terbuka dan terverifikasi); ganti dengan angka BPJS/Kemenkes bila diperoleh. Karena itu keluaran adalah RENTANG, bukan ramalan.
SUMBER   SIRANAP (yankes.kemkes.go.id/app/siranap): TIDAK TERJANGKAU dari lingkungan kerja (DNS tidak resolve, 29 Okt 2026). Pemuat di sini
         membaca CSV ternormalisasi data/raw/bnpb/siranap.csv (kolom kab,tt_total,tt_kosong,tanggal) yang harus diisi dari mesin yang bisa
         menjangkau SIRANAP; tanpa berkas itu `tt_kosong` = null dan hari_penuh = null (STATUS: MENUNGGU AKSES). Tidak ada angka karangan.
         Pengurai HTML SIRANAP sengaja BELUM ditulis: strukturnya belum pernah dilihat dari sini, dan pengurai tebakan lebih berbahaya daripada kosong.
Pakai:  python3 scripts/bnpb/rs_kapasitas.py   |   python3 scripts/bnpb/rs_kapasitas.py --cek
"""
import csv, datetime as dt, json, math, os, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import hvc_dasar as D

PM_DASAR = 15.5
SKENARIO = {"rendah": {"rr10": 1.02, "r0": 2.0}, "tengah": {"rr10": 1.04, "r0": 5.0}, "tinggi": {"rr10": 1.05, "r0": 10.0}}
LOS = 5.0
UMUR_SIRANAP_MAKS_HARI = 3
CSV_SIRANAP = os.path.join(D.MENTAH, "siranap.csv")


def pm_lebih(pm_jam):
    """PM2,5 per jam (prakiraan 72 jam) -> kelebihan di atas PM_DASAR dari rata-rata bergulir 24 jam tertinggi; kurang dari 24 jam data -> None."""
    v = [x for x in pm_jam if x is not None]
    if len(v) < 24:
        return None
    m = max(sum(v[i:i + 24]) / 24 for i in range(len(v) - 23))
    return max(0.0, m - PM_DASAR)


def tambahan_per_hari(penduduk, lebih, r0, rr10):
    """lambda: tambahan rawat inap pernapasan per hari. lebih <= 0 -> 0."""
    if lebih is None or lebih <= 0 or penduduk <= 0:
        return 0.0
    return penduduk * r0 / 1000 / 365 * (rr10 ** (lebih / 10) - 1)


def hari_penuh(kosong, lam, los=LOS):
    """-> (hari, status). status: 'penuh' (kosong <= 0), 'terbatas' (hari = kosong/lam, penuh sebelum pasien pertama pulang),
    'aman' (laju masuk x LOS <= kosong), 'tanpa_data' (kosong None)."""
    if kosong is None:
        return None, "tanpa_data"
    if kosong <= 0:
        return 0.0, "penuh"
    if lam <= 0 or kosong >= lam * los:
        return None, "aman"
    return kosong / lam, "terbatas"


def muat_siranap(jalur, hari_ini=None):
    """CSV kab,tt_total,tt_kosong,tanggal -> ({kab: {tt_total, tt_kosong, n_rs, tanggal}}, jumlah baris basi/rusak dibuang). Basi = > UMUR hari."""
    if not os.path.exists(jalur):
        return {}, 0
    hari_ini = hari_ini or dt.date.today()
    out, dibuang = {}, 0
    for r in csv.DictReader(open(jalur, newline="", encoding="utf-8")):
        try:
            tgl = dt.date.fromisoformat(r["tanggal"][:10])
            tot, kos = int(float(r["tt_total"])), int(float(r["tt_kosong"]))
            if kos < 0 or kos > tot or (hari_ini - tgl).days > UMUR_SIRANAP_MAKS_HARI:
                raise ValueError
        except (KeyError, ValueError):
            dibuang += 1
            continue
        a = out.setdefault(r["kab"], {"tt_total": 0, "tt_kosong": 0, "n_rs": 0, "tanggal": r["tanggal"][:10]})
        a["tt_total"] += tot; a["tt_kosong"] += kos; a["n_rs"] += 1
        a["tanggal"] = min(a["tanggal"], r["tanggal"][:10])     # ikut data tertua
    return out, dibuang


def hitung_kab(penduduk, pm_jam, siranap_kab):
    lebih = pm_lebih(pm_jam)
    kosong = siranap_kab["tt_kosong"] if siranap_kab else None
    sk = {}
    for nama, p in SKENARIO.items():
        lam = tambahan_per_hari(penduduk, lebih, p["r0"], p["rr10"])
        h, st = hari_penuh(kosong, lam)
        sk[nama] = {"masuk_per_hari": round(lam, 2), "tt_stabil": round(lam * LOS, 1), "hari_penuh": None if h is None else round(h, 1), "status": st}
    return {"n": penduduk, "pm_lebih": None if lebih is None else round(lebih, 1), "skenario": sk,
            "tt_kosong": kosong, "tt_total": siranap_kab["tt_total"] if siranap_kab else None,
            "n_rs": siranap_kab["n_rs"] if siranap_kab else None}


def jalan():
    pr = json.load(open(os.path.join(D.AKAR, "public/udara/data/prakiraan.json")))
    ker = json.load(open(os.path.join(D.KELUAR, "kerentanan.json")))["kab"]
    sir, dibuang = muat_siranap(CSV_SIRANAP)
    kab = {}
    for k in pr["kota"]:
        kode = k["kode"]
        n = ker.get(kode, {}).get("n") or k.get("jiwa") or 0
        kab[kode] = hitung_kab(n, k.get("pm") or [], sir.get(kode))
    ada = [v for v in kab.values() if v["pm_lebih"] is not None]
    D.simpan_plafon("rs_kapasitas.json", {
        "sumber": "Prakiraan PM2,5 CAMS (public/udara/data/prakiraan.json) x penduduk Dukcapil x koefisien rawat inap pernapasan asap kebakaran; SIRANAP Kemenkes bila tersedia",
        "atribusi": "Kemenkes (SIRANAP), Dukcapil Kemendagri, Copernicus CAMS; Wang Y dkk. 2025 Environ Res 273:121221",
        "lisensi": "SIRANAP: syarat pakai tidak dapat dibaca dari lingkungan kerja; CAMS: Copernicus; koefisien: kutipan literatur",
        "siranap": {"status": "OK" if sir else "MENUNGGU AKSES", "kab_dengan_data": len(sir), "baris_dibuang": dibuang,
                    "catatan": "tanpa data SIRANAP hanya sisi permintaan (masuk_per_hari, tt_stabil) yang terhitung; hari_penuh = null"},
        "prakiraan_dibuat": pr.get("dibuat"), "rumus": "lambda = P x r0/1000/365 x (RR10^(PM_lebih/10) - 1); TT_stabil = lambda x LOS; hari_penuh = TT_kosong / lambda bila TT_kosong < lambda x LOS",
        "skenario": SKENARIO, "los_hari": LOS, "pm_dasar": PM_DASAR,
        "label": "RENTANG berasumsi (r0, LOS asumsi kerja; RR dari meta-analisis Amerika Utara/Australia), bukan ramalan; tidak diuji balik (tak ada label rawat inap per kabupaten)",
        "kab": kab})
    print(f"rs_kapasitas.json: {len(kab)} kab, {len(ada)} dengan PM, SIRANAP {len(sir)} kab", file=sys.stderr)


def _cek():
    # pm_lebih: konstan 20 -> 4,5 ; data < 24 jam -> None ; di bawah dasar -> 0 ; jendela bergulir menangkap puncak
    assert abs(pm_lebih([20.0] * 72) - 4.5) < 1e-9 and pm_lebih([20.0] * 23) is None and pm_lebih([5.0] * 72) == 0.0
    puncak = [10.0] * 24 + [60.0] * 24 + [10.0] * 24
    assert abs(pm_lebih(puncak) - (60 - 15.5)) < 1e-9
    # lambda: RR10 = 1 atau lebih = 0 -> nol ; hitungan tangan 1 juta jiwa, r0 5/1000/th, RR 1,04, +10 ug -> 1e6*5/1000/365*0,04 = 0,5479 per hari
    assert tambahan_per_hari(1e6, 10.0, 5.0, 1.0) == 0.0 and tambahan_per_hari(1e6, 0.0, 5.0, 1.04) == 0.0 and tambahan_per_hari(1e6, None, 5.0, 1.04) == 0.0
    assert abs(tambahan_per_hari(1e6, 10.0, 5.0, 1.04) - 1e6 * 5 / 1000 / 365 * 0.04) < 1e-9
    assert tambahan_per_hari(1e6, 20.0, 5.0, 1.04) > 2 * tambahan_per_hari(1e6, 10.0, 5.0, 1.04) * 0.99, "dosis-respons bergerak naik dengan PM"
    # hari penuh: 4 hari bila kosong 40 dan 10/hari ; aman bila 10/hari x 5 hari = 50 <= 60 ; penuh bila 0 ; tanpa data tetap tanpa data
    assert hari_penuh(40, 10.0) == (4.0, "terbatas") and hari_penuh(60, 10.0) == (None, "aman") and hari_penuh(0, 10.0) == (0.0, "penuh")
    assert hari_penuh(None, 10.0) == (None, "tanpa_data") and hari_penuh(5, 0.0) == (None, "aman")
    assert hari_penuh(49, 10.0)[1] == "terbatas" and hari_penuh(50, 10.0)[1] == "aman", "batas tepat: kosong = lambda x LOS -> aman"
    # pemuat CSV: basi, rusak, kosong > total dibuang ; baris sekabupaten dijumlah
    import tempfile
    t = tempfile.mkdtemp()
    p = os.path.join(t, "s.csv")
    open(p, "w").write("kab,tt_total,tt_kosong,tanggal\n3301,100,30,2026-10-29\n3301,50,10,2026-10-28\n3302,10,20,2026-10-29\n3303,10,1,2026-09-01\n3304,x,1,2026-10-29\n")
    d, dbg = muat_siranap(p, dt.date(2026, 10, 29))
    assert d == {"3301": {"tt_total": 150, "tt_kosong": 40, "n_rs": 2, "tanggal": "2026-10-28"}} and dbg == 3, (d, dbg)
    assert muat_siranap(os.path.join(t, "tidak_ada.csv")) == ({}, 0)
    # gabungan: tanpa SIRANAP -> hari_penuh None dan status tanpa_data, permintaan tetap terhitung
    k = hitung_kab(1_000_000, [40.0] * 72, None)
    assert k["tt_kosong"] is None and k["skenario"]["tengah"]["status"] == "tanpa_data" and k["skenario"]["tengah"]["masuk_per_hari"] > 0
    assert k["skenario"]["rendah"]["masuk_per_hari"] < k["skenario"]["tengah"]["masuk_per_hari"] < k["skenario"]["tinggi"]["masuk_per_hari"]
    k2 = hitung_kab(1_000_000, [40.0] * 72, {"tt_total": 500, "tt_kosong": 5, "n_rs": 3, "tanggal": "2026-10-29"})
    # PM 40 -> 24,5 ug di atas dasar; 5 tempat tidur kosong: skenario tinggi (~3,5 masuk/hari) penuh dalam ~1,4 hari, rendah (~0,27/hari x 5 = 1,4 <= 5) aman
    assert k2["skenario"]["tinggi"]["status"] == "terbatas" and 1.0 < k2["skenario"]["tinggi"]["hari_penuh"] < 2.0, k2["skenario"]["tinggi"]
    assert k2["skenario"]["rendah"]["status"] == "aman" and k2["skenario"]["rendah"]["hari_penuh"] is None
    print("rs_kapasitas: --cek hijau (SIRANAP live: MENUNGGU AKSES)")


if __name__ == "__main__":
    _cek() if "--cek" in sys.argv else jalan()
