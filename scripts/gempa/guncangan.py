"""Model guncangan: magnitudo + jarak + kedalaman -> PGA (GMPE) -> MMI (GMICE) per pusat kecamatan.

Kelas tektonik (jenis), sitasi:
  kerak      Boore, Stewart, Seyhan & Atkinson 2014 (BSSA14), Earthquake Spectra 30(3):1057-1085, PGA, mekanisme tak ditentukan (e0)
  antarmuka  Zhao et al. 2006, BSSA 96(3):898-913, PGA, subduksi antarmuka (SI = 0)
  intraslab  Zhao et al. 2006, PGA, subduksi dalam lempeng (SS, SSL)
  PGA -> MMI Worden, Gerstenberger, Rhoades & Wald 2012, BSSA 102(1):204-221, Tabel 5 (PGA, cm/s^2)
Jarak sumber: gempa titik diubah ke jarak patahan hingga memakai panjang rupture Wells & Coppersmith 1994
(log10 L = -2.44 + 0.59 M); Rjb = max(0, Repi - L/4). Itu heuristik tanpa arah patahan.

KOEFISIEN DITULIS ULANG DARI TABEL MAKALAH TANPA SALINAN DIGITAL DI SESI INI: wajib dicocokkan ke makalah oleh validasi-model.
Hanya mean (tanpa sigma). Vs30 seragam 400 m/s (belum ada peta Vs30 di repo). Tsunami TIDAK dibahas di sini.

Pakai:  python3 scripts/gempa/guncangan.py uji | ekspor
"""
import datetime as dt, json, math, os, sys

AKAR = os.path.normpath(os.path.join(os.path.dirname(__file__), "../.."))
PUSAT = os.path.join(AKAR, "public/banjir/data/pusat_kec.json")  # {"prov|kab|kec": [lat, lon]}, 7.274 titik; tidak disalin
KELUAR = os.path.join(AKAR, "public/gempa/data/model_guncangan.json")
PROSPEKTIF = os.path.join(AKAR, "public/gempa/data/prospektif_guncangan.json")
G = 980.665  # cm/s^2
R_BUMI = 6371.0088
VS30_BAKU = 400.0
JENIS = ("kerak", "antarmuka", "intraslab")

PARAM = {
    "bssa14_pga": {"e0": 0.4473, "e4": 1.431, "e5": 0.05053, "e6": -0.1662, "Mh": 5.5, "c1": -1.134, "c2": 0.1917, "c3": -0.008088,
                   "h": 4.5, "clin": -0.6, "Vc": 1500.0, "Vref": 760.0, "f1": 0.0, "f3": 0.1, "f4": -0.15, "f5": -0.00701},
    "zhao06_pga": {"a": 1.101, "b": -0.00564, "c": 0.0055, "d": 1.080, "e": 0.01412, "hc": 15.0, "SI": 0.0, "SS": 2.607, "SSL": -0.528,
                   "C": {"I": 1.111, "II": 1.344, "III": 1.355, "IV": 1.420}},
    "worden12_pga": {"c1": 1.78, "c2": 1.55, "c3": -1.60, "c4": 3.70, "t1": 1.57},
    "wells_coppersmith94": {"a": -2.44, "b": 0.59},
    "mmi_min": 1.0, "mmi_maks": 10.0, "ambang_jendela": 2.0, "jendela_maks_km": 2500.0,
}


def kelas_zhao(vs30):
    return "I" if vs30 >= 600 else "II" if vs30 >= 300 else "III" if vs30 >= 200 else "IV"


def tebak_jenis(dalam):
    """Heuristik kedalaman saja: >= 50 km intraslab, selain itu kerak. Antarmuka (megathrust) harus diberikan pemanggil."""
    return "intraslab" if dalam >= 50 else "kerak"


def rjb_km(m, repi, P=PARAM):
    w = P["wells_coppersmith94"]
    return max(0.0, repi - 10 ** (w["a"] + w["b"] * m) / 4)


def _bssa_pga_g(m, rjb, vs30, c):
    def fe_fp(rj):
        fe = c["e0"] + (c["e4"] * (m - c["Mh"]) + c["e5"] * (m - c["Mh"]) ** 2 if m <= c["Mh"] else c["e6"] * (m - c["Mh"]))
        r = math.sqrt(rj * rj + c["h"] ** 2)
        return fe + (c["c1"] + c["c2"] * (m - 4.5)) * math.log(r) + c["c3"] * (r - 1)
    pgar = math.exp(fe_fp(rjb))  # batuan acuan Vs30 760: Flin = Fnl = 0
    flin = c["clin"] * math.log(min(vs30, c["Vc"]) / c["Vref"])
    f2 = c["f4"] * (math.exp(c["f5"] * (min(vs30, 760.0) - 360)) - math.exp(c["f5"] * (760 - 360)))
    fnl = c["f1"] + f2 * math.log((pgar + c["f3"]) / c["f3"])
    return math.exp(fe_fp(rjb) + flin + fnl)


def _zhao_pga_cms2(m, x, h, jenis, vs30, c):
    r = x + c["c"] * math.exp(c["d"] * m)
    ln = c["a"] * m + c["b"] * x - math.log(r) + (c["e"] * (h - c["hc"]) if h >= c["hc"] else 0.0) + c["C"][kelas_zhao(vs30)]
    ln += c["SI"] if jenis == "antarmuka" else c["SS"] + c["SSL"] * math.log(x)
    return math.exp(ln)


def pga_cms2(m, repi, dalam, jenis, vs30=VS30_BAKU, P=PARAM):
    """PGA rata-rata (cm/s^2) di jarak episenter repi (km)."""
    if jenis not in JENIS:
        raise ValueError("jenis harus salah satu dari %s" % (JENIS,))
    rjb = rjb_km(m, repi, P)
    if jenis == "kerak":
        return _bssa_pga_g(m, rjb, vs30, P["bssa14_pga"]) * G
    return _zhao_pga_cms2(m, math.sqrt(rjb * rjb + dalam * dalam), dalam, jenis, vs30, P["zhao06_pga"])


def pga_ke_mmi(pga, P=PARAM):
    w = P["worden12_pga"]
    lg = math.log10(pga)
    mmi = w["c1"] + w["c2"] * lg if lg <= w["t1"] else w["c3"] + w["c4"] * lg
    return min(P["mmi_maks"], max(P["mmi_min"], mmi))


def mmi_perkiraan(m, repi, dalam, jenis=None, vs30=VS30_BAKU, P=PARAM):
    return pga_ke_mmi(pga_cms2(m, repi, dalam, jenis or tebak_jenis(dalam), vs30, P), P)


def jendela_km(m, dalam, jenis=None, vs30=VS30_BAKU, P=PARAM):
    """Radius (km, kelipatan 10) di mana MMI rata-rata masih >= 2; di luarnya tidak dihitung. Bisection tetap 40 putaran."""
    jenis = jenis or tebak_jenis(dalam)
    lo, hi = 1.0, P["jendela_maks_km"]
    if mmi_perkiraan(m, hi, dalam, jenis, vs30, P) >= P["ambang_jendela"]:
        return int(hi)
    for _ in range(40):
        mid = (lo + hi) / 2
        if mmi_perkiraan(m, mid, dalam, jenis, vs30, P) >= P["ambang_jendela"]:
            lo = mid
        else:
            hi = mid
    return max(10, int(math.ceil(hi / 10.0)) * 10)


def jarak_km(lat1, lon1, lat2, lon2):
    p1, p2 = math.radians(lat1), math.radians(lat2)
    a = math.sin((p2 - p1) / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(math.radians(lon2 - lon1) / 2) ** 2
    return 2 * R_BUMI * math.asin(min(1.0, math.sqrt(a)))


def mmi_kecamatan(g, pusat, vs30=VS30_BAKU, P=PARAM):
    """g = {lat, lon, m, dalam, jenis?}; pusat = {kunci: [lat, lon]} -> {kunci: MMI} hanya di dalam jendela_km."""
    jenis = g.get("jenis") or tebak_jenis(g["dalam"])
    win = jendela_km(g["m"], g["dalam"], jenis, vs30, P)
    out = {}
    for k, (la, lo) in pusat.items():
        d = jarak_km(g["lat"], g["lon"], la, lo)
        if d <= win:
            out[k] = mmi_perkiraan(g["m"], d, g["dalam"], jenis, vs30, P)
    return out


def ekspor():
    kini = dt.datetime.now(dt.timezone.utc).strftime("%Y-%m-%dT%H:%MZ")
    model = {
        "versi": 1, "dibuat": kini, "jenis": "guncangan_gmpe_gmice",
        "param": PARAM, "vs30_baku": VS30_BAKU, "jenis_tektonik": list(JENIS),
        "sitasi": {"kerak": "Boore, Stewart, Seyhan, Atkinson 2014, Earthquake Spectra 30(3):1057-1085",
                   "antarmuka": "Zhao et al. 2006, BSSA 96(3):898-913", "intraslab": "Zhao et al. 2006, BSSA 96(3):898-913",
                   "gmice": "Worden, Gerstenberger, Rhoades, Wald 2012, BSSA 102(1):204-221",
                   "panjang_rupture": "Wells & Coppersmith 1994, BSSA 84(4):974-1002"},
        "kinerja_uji": {"status": "belum_diuji", "n_laporan": 0, "metrik": None,
                        "alasan": "Belum ada arsip laporan Dirasakan BMKG yang bisa dibaca: tabel D1 `gempa` (kolom mmi_maks) diisi cron Worker milik warga-api dan belum "
                                  "terkumpul/diekspor ke repo; BMKG hanya menyimpan 15 butir terakhir. Tidak ada angka kinerja yang dikarang.",
                        "rencana": "Bandingkan MMI model di kecamatan/kab yang dilaporkan dengan MMI Dirasakan (rentang ambil tertinggi): bias, RMSE, persen dalam +-1 kelas, "
                                   "lawan pembanding. Uji dibuka sekali."},
        "pembanding": {"nama": "satu GMPE tanpa kelas tektonik (BSSA14 untuk semua jenis)", "status": "belum_diuji"},
        "catatan": ["Koefisien ditranskripsi dari tabel makalah tanpa salinan digital di sesi pembuatan; wajib dicocokkan oleh validasi-model sebelum angkanya tampil.",
                    "Hanya nilai rata-rata, tanpa sigma; Vs30 seragam 400 m/s karena belum ada peta Vs30 di repo (efek tapak diabaikan).",
                    "Jenis tektonik ditebak dari kedalaman (>= 50 km intraslab, selain itu kerak); antarmuka/megathrust harus diberikan pemanggil.",
                    "Gempa titik diubah ke Rjb lewat Rjb = max(0, Repi - L/4), L Wells & Coppersmith: tanpa arah patahan, mengabaikan efek direktivitas.",
                    "Zhao 2006 tanpa suku kuadrat magnitudo (QI/WI/QS/WS) dan tanpa koreksi regional; MMI dipotong di 1 sampai 10.",
                    "Bukan prakiraan gempa utama dan tidak memuat status tsunami (kosakata terpisah, sumber BMKG/PTWC)."],
        "prospektif": "prospektif_guncangan.json",
    }
    json.dump(model, open(KELUAR, "w"), ensure_ascii=False, indent=1)
    pros = {"diperbarui": kini, "dicatat": 0, "dinilai": 0, "metrik": None,
            "catatan": "Append-only: ramalan MMI per gempa Dirasakan baru dicatat saat arsip D1 gempa (warga-api) tersedia; belum ada yang dicatat atau dinilai."}
    json.dump(pros, open(PROSPEKTIF, "w"), ensure_ascii=False, indent=1)
    print("ditulis", KELUAR, PROSPEKTIF)


def uji():
    # kewajaran fisik (BUKAN akurasi): monoton terhadap jarak dan magnitudo, nilai masuk akal pada contoh
    for jenis, dalam in (("kerak", 10), ("antarmuka", 25), ("intraslab", 80)):
        d = [mmi_perkiraan(7.0, r, dalam, jenis) for r in (5, 20, 50, 100, 300)]
        assert all(a >= b for a, b in zip(d, d[1:])), (jenis, d)
        mm = [mmi_perkiraan(mag, 30, dalam, jenis) for mag in (5.0, 6.0, 7.0, 8.0)]
        assert all(a < b for a, b in zip(mm, mm[1:])), (jenis, mm)
        assert jendela_km(5.0, dalam, jenis) < jendela_km(7.5, dalam, jenis)
        print(jenis, "M7 MMI@5,20,50,100,300 km:", [round(x, 2) for x in d], "jendela M7:", jendela_km(7.0, dalam, jenis), "km")
    assert 6 <= mmi_perkiraan(6.9, 20, 10, "kerak") <= 9
    assert mmi_perkiraan(5.0, 150, 10, "kerak") < 3
    assert abs(pga_ke_mmi(10 ** 1.57) - 4.21) < 0.01
    assert tebak_jenis(10) == "kerak" and tebak_jenis(120) == "intraslab"
    try:
        mmi_perkiraan(6, 10, 10, "salah")
        raise SystemExit("jenis salah diterima")
    except ValueError:
        pass
    if os.path.exists(KELUAR):  # berkas ekspor harus selaras dengan PARAM (JS membaca berkas ini)
        mdl = json.load(open(KELUAR))
        assert mdl["param"] == PARAM, "model_guncangan.json basi: jalankan `guncangan.py ekspor`"
        assert mdl["kinerja_uji"]["status"] in ("belum_diuji", "diuji") and mdl["dibuat"] and mdl["catatan"]
    if os.path.exists(PUSAT):
        pusat = json.load(open(PUSAT))
        assert len(pusat) == 7274
        h = mmi_kecamatan({"lat": -8.4, "lon": 116.4, "m": 6.9, "dalam": 15}, pusat)
        assert h and max(h.values()) >= 6, max(h.values())
        print("kec dalam jendela (Lombok M6,9):", len(h), "MMI maks", round(max(h.values()), 2))
    print("guncangan uji OK")


if __name__ == "__main__":
    {"uji": uji, "ekspor": ekspor}[sys.argv[1] if len(sys.argv) > 1 else "uji"]()
