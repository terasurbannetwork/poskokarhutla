"""Dampak: balita & lansia terpapar, tambahan kasus ISPA, sekolah, jarak pandang bandara -> public/udara/data/rentan.json

Masukan : public/udara/data/prakiraan.json (r24 + status 3 hari), scripts/udara/kota.json (jiwa per kab/kota, WorldPop 2026),
          public/data/sekolah.json, public/data/metar.json (jarak pandang terakhir per bandara).
Rumus   : terpapar = jiwa x porsi umur pada hari berstatus waspada+ (PM2,5 24 jam > 55,4).
          ISPA tambahan/hari (HANYA kota-hari berstatus waspada+) = jiwa x y0 x (1 - exp(-b x min(100, maks(0, r24 - 15)))),
          b = ln(RR)/10; lo/hi dari CI RR (lo dijepit 0).
          Jarak pandang = 3,912 / (0,013 + MEE x f(RH) x PM2,5 x 1e-3) km (Koschmieder), dijepit 10 km.
"""
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import alat
import kota as kota_mod

BALITA, LANSIA = 0.076, 0.12
Y0 = 0.093 / 30
RR = (0.9982, 1.019, 1.0402)
C0 = 15
DC_MAKS = 100   # ug/m3 di atas C0: fungsi HRAPIE berasal dari kisaran konsentrasi Eropa, tak diekstrapolasi lebih jauh
MEE, F_RH, RAYLEIGH = 4.0, 1.5, 0.013
MAKS_SEKOLAH = 300
ASUMSI = [
    {"nama": "Porsi balita (0-4 tahun)", "nilai": "7,6% penduduk", "sumber": "BPS, Proyeksi Penduduk Indonesia 2020-2050 Hasil SP2020 (tahun 2025, dibulatkan, nasional)"},
    {"nama": "Porsi lansia (60+ tahun)", "nilai": "12,0% penduduk", "sumber": "BPS, Statistik Penduduk Lanjut Usia 2024 (nasional)"},
    {"nama": "Penduduk kab/kota", "nilai": "WorldPop 2026 1 km dijumlah ke kab/kota lewat pusat kecamatan", "sumber": "WorldPop Global2 R2025A (CC BY 4.0)"},
    {"nama": "Insidensi dasar ISPA", "nilai": "9,3% per bulan (diagnosis nakes atau gejala) = 0,31% per hari",
     "sumber": "Kemenkes, Riskesdas 2018 (prevalensi ISPA periode 1 bulan, semua umur)"},
    {"nama": "RR rawat inap pernapasan (Héroux 2015, HRAPIE) dipakai sebagai proksi", "nilai": "RR 1,019 (IK 95% 0,9982-1,0402) per 10 ug/m3 PM2,5 harian",
     "sumber": "Héroux et al. 2015, Int. J. Public Health 60:619 (rekomendasi WHO Europe HRAPIE 2013); RR rawat inap dipakai untuk kasus ISPA: proksi, bukan fungsi ISPA"},
    {"nama": "Cakupan dan batas ekstrapolasi ISPA", "nilai": "dihitung hanya untuk kab/kota pada hari berstatus Tidak sehat atau lebih (> 55,4 ug/m3); kenaikan dibatasi 100 ug/m3 di atas 15",
     "sumber": "asumsi; fungsi log-linier tidak diuji pada konsentrasi kabut asap ratusan ug/m3"},
    {"nama": "Konsentrasi pembanding", "nilai": "15 ug/m3 (rata-rata 24 jam)", "sumber": "WHO Global Air Quality Guidelines 2021"},
    {"nama": "Efisiensi hamburan massa (+ absorpsi), asumsi tidak diuji", "nilai": "4 m2/g kering x f(RH) 1,5 + Rayleigh 0,013/km",
     "sumber": "Hand & Malm 2007, J. Geophys. Res. 112:D16203 (hamburan); absorpsi dan f(RH) asumsi; prakiraan jarak pandang belum diuji terhadap METAR"},
    {"nama": "Jarak pandang", "nilai": "Koschmieder V = 3,912 / b_ext, maks 10 km", "sumber": "Koschmieder 1924; rata-rata 24 jam, bukan jarak pandang terburuk dalam sehari"},
]


def ispa(jiwa, r24):
    """(t, lo, hi) tambahan kasus ISPA per hari."""
    if jiwa < 0 or r24 is None or r24 < 0:
        raise ValueError(f"jiwa {jiwa} / r24 {r24} tidak sah")
    dc = min(DC_MAKS, max(0.0, r24 - C0))
    f = lambda rr: max(0.0, jiwa * Y0 * (1 - math.exp(-math.log(rr) / 10 * dc)))
    return f(RR[1]), f(RR[0]), f(RR[2])


def jarak_pandang(pm):
    if pm is None or pm < 0:
        raise ValueError(f"PM2,5 tidak sah: {pm}")
    return round(min(10.0, 3.912 / (RAYLEIGH + MEE * F_RH * pm * 1e-3)), 1)


def hitung(prak, kota, sekolah, metar):
    jiwa = {k["kode"]: k for k in kota}
    kunci_kab = {(k["prov"], kota_mod.kunci(k["kab"])): k["kode"] for k in kota}
    n_hari = len(prak["hari"])
    sk_kota, daftar = {}, []
    kol = sekolah["kolom"]
    iN, iP, iK, iLa, iLo = (kol.index(x) for x in ("nama", "prov", "kab", "lat", "lon"))
    for r in sekolah["baris"]:
        kd = kunci_kab.get((r[iP], kota_mod.kunci(r[iK] or "")))
        if kd:
            sk_kota.setdefault(kd, []).append(r)
    nol = lambda: {"balita": [0] * n_hari, "lansia": [0] * n_hari, "ispa": [[0.0, 0.0, 0.0] for _ in range(n_hari)], "sekolah": [0] * n_hari}
    nas, prov, per_kota = nol(), {}, []
    for k in prak["kota"]:
        j = jiwa.get(k["kode"], {}).get("jiwa", 0)
        o = nol()
        for d in range(n_hari):
            buruk = k["st"][d] != "normal"
            o["balita"][d] = round(j * BALITA) if buruk else 0
            o["lansia"][d] = round(j * LANSIA) if buruk else 0
            o["sekolah"][d] = len(sk_kota.get(k["kode"], ())) if buruk else 0
            o["ispa"][d] = list(ispa(j, k["r24"][d])) if buruk else [0.0, 0.0, 0.0]
        P = prov.setdefault(k["prov"], nol())
        for T in (nas, P):
            for d in range(n_hari):
                for f in ("balita", "lansia", "sekolah"):
                    T[f][d] += o[f][d]
                T["ispa"][d] = [a + b for a, b in zip(T["ispa"][d], o["ispa"][d])]
        if any(o["balita"]) or any(x[0] >= 1 for x in o["ispa"]):
            per_kota.append({"kode": k["kode"], "nama": k["nama"], "prov": k["prov"], **o})
        if n_hari > 1 and k["st"][1] != "normal":
            for r in sk_kota.get(k["kode"], ()):
                daftar.append((-k["r24"][1], {"nama": r[iN], "lat": r[iLa], "lon": r[iLo], "kode_kota": k["kode"], "st": k["st"][1]}))

    def bulat(T):
        T["ispa"] = [{"t": round(a), "lo": round(b), "hi": round(c)} for a, b, c in T["ispa"]]
        return T

    daftar.sort(key=lambda x: x[0])
    bd = []
    for m in metar:
        if m.get("lat") is None:
            continue
        kp = min(prak["kota"], key=lambda k: alat.jarak_km(m["lat"], m["lon"], k["lat"], k["lon"]), default=None)
        if kp is None or alat.jarak_km(m["lat"], m["lon"], kp["lat"], kp["lon"]) > 50:
            continue
        bd.append({"icao": m["icao"], "nama": m.get("nama"), "vis_km": None if m.get("vis_m") is None else round(m["vis_m"] / 1000, 1),
                   "vis_waktu": m.get("waktu"), "wx": m.get("wx"), "kode_kota": kp["kode"],
                   "prakiraan_km": [jarak_pandang(x) for x in kp["r24"]], "prakiraan_teruji": False, "pm": kp["r24"]})
    return {"v": 1, "hari": prak["hari"], "nasional": bulat(nas), "prov": {p: bulat(T) for p, T in sorted(prov.items())},
            "kota": [bulat(o) for o in per_kota], "sekolah": [x[1] for x in daftar[:MAKS_SEKOLAH]],
            "bandara": sorted(bd, key=lambda b: min(b["prakiraan_km"])), "asumsi": ASUMSI}


def main():
    prak = alat.keluaran("prakiraan.json")
    d = hitung(prak, alat.kota(), alat.data("sekolah.json"), alat.data("metar.json", []))
    d["dibuat"] = alat.iso(alat.sekarang())
    nb = alat.simpan("rentan.json", d)
    n = d["nasional"]
    alat.log(f"rentan.json: {nb // 1024} KB; balita {n['balita']}, lansia {n['lansia']}, ISPA {n['ispa']}, sekolah {n['sekolah']}, bandara {len(d['bandara'])}")


def uji():
    t, lo, hi = ispa(1_000_000, 115)              # 100 ug/m3 di atas pembanding: 3.100 x (1 - 1,019^-10) = ~533
    assert abs(t - 1e6 * Y0 * (1 - 1.019 ** -10)) < 1e-6 and lo == 0 and hi > t > 500, (t, lo, hi)
    assert ispa(1_000_000, 400) == (t, lo, hi)    # kenaikan dijepit 100 ug/m3 di atas 15
    assert ispa(1000, 10) == (0, 0, 0)
    for salah in ((-1, 50), (10, -5), (10, None)):
        try:
            ispa(*salah)
            raise AssertionError(f"ispa{salah} harus ditolak")
        except ValueError:
            pass
    assert jarak_pandang(0) == 10.0 and jarak_pandang(200) == round(3.912 / (0.013 + 1.2), 1) == 3.2
    try:
        jarak_pandang(-1)
        raise AssertionError("PM negatif harus ditolak")
    except ValueError:
        pass
    prak = {"hari": ["d0", "d1", "d2"], "kota": [
        {"kode": "1671", "nama": "Kota Palembang", "prov": "16", "lat": -2.97, "lon": 104.75, "r24": [200, 80, 20], "st": ["siaga", "waspada", "normal"]},
        {"kode": "1601", "nama": "Kab. OKU", "prov": "16", "lat": -4.0, "lon": 104.0, "r24": [10, 10, 10], "st": ["normal"] * 3}]}
    kota = [{"kode": "1671", "prov": "16", "kab": "Kota Palembang", "jiwa": 1000, "lat": 0, "lon": 0},
            {"kode": "1601", "prov": "16", "kab": "Ogan Komering Ulu", "jiwa": 500, "lat": 0, "lon": 0}]
    sk = {"kolom": ["nama", "jenjang", "status", "npsn", "siswa", "prov", "kab", "kec", "desa", "lat", "lon"],
          "baris": [["SD 1", "SD", "N", "1", 9, "16", "Kota Palembang", "", "", -2.9, 104.7], ["SD 2", "SD", "N", "2", 9, "16", "Ogan Komering Ulu", "", "", -4, 104]]}
    metar = [{"icao": "WIPP", "nama": "Palembang", "lat": -2.9, "lon": 104.7, "vis_m": 3000, "waktu": "2026-10-18T00:00:00Z", "wx": "FU"},
             {"icao": "WAJJ", "lat": 0, "lon": 0, "vis_m": 8000}]
    d = hitung(prak, kota, sk, metar)
    assert d["nasional"]["balita"] == [76, 76, 0] and d["nasional"]["lansia"] == [120, 120, 0] and d["nasional"]["sekolah"] == [1, 1, 0]
    assert d["prov"]["16"]["balita"] == [76, 76, 0] and [k["kode"] for k in d["kota"]] == ["1671"]
    assert d["sekolah"] == [{"nama": "SD 1", "lat": -2.9, "lon": 104.7, "kode_kota": "1671", "st": "waspada"}]
    assert len(d["bandara"]) == 1 and d["bandara"][0]["vis_km"] == 3.0 and d["bandara"][0]["prakiraan_km"][0] == 3.2   # WAJJ > 50 km dari kota mana pun
    assert d["nasional"]["ispa"][2] == {"t": 0, "lo": 0, "hi": 0} and d["nasional"]["ispa"][0]["t"] >= 0 and d["bandara"][0]["prakiraan_teruji"] is False
    prak["kota"][1]["r24"] = [55, 55, 55]         # status normal: ISPA tidak dihitung walau di atas 15
    assert hitung(prak, kota, sk, metar)["prov"]["16"]["ispa"][2] == {"t": 0, "lo": 0, "hi": 0}
    print("rentan uji: lulus")


if __name__ == "__main__":
    uji() if sys.argv[1:] == ["uji"] else main()
