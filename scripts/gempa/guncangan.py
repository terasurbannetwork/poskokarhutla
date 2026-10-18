"""Model guncangan: magnitudo + jarak + kedalaman -> PGA (GMPE) -> MMI (GMICE) per pusat kecamatan.

Kelas tektonik (jenis), sitasi:
  kerak      Boore, Stewart, Seyhan & Atkinson 2014 (BSSA14), Earthquake Spectra 30(3):1057-1085, PGA, mekanisme tak ditentukan (e0)
  antarmuka  Zhao et al. 2006, BSSA 96(3):898-913, PGA, subduksi antarmuka (SI = 0)
  intraslab  Zhao et al. 2006, PGA, subduksi dalam lempeng (SS, SSL)
  PGA -> MMI Worden, Gerstenberger, Rhoades & Wald 2012, BSSA 102(1):204-221, Tabel 5 (PGA, cm/s^2)
Jarak sumber: gempa titik diubah ke jarak patahan hingga memakai panjang rupture Wells & Coppersmith 1994
(log10 L = -2.44 + 0.59 M); Rjb = max(0, Repi - L/4). Itu heuristik tanpa arah patahan.

Koefisien BSSA14 (PGA) dan Zhao 2006 (PGA) dicocokkan ke OpenQuake (boore_2014.py, zhao_2006.py) 16 Okt 2026; Worden 2012 dicocokkan manual (tak terverifikasi daring).
Zhao: magnitudo INTRASLAB dipotong 7,8 (np.clip seperti ZhaoEtAl2006SSlabNSHMP2014 di OpenQuake); antarmuka TIDAK dipotong (ZhaoEtAl2006SInter tanpa klip; perbaikan 18 Okt 2026), suku kedalaman e*(min(h,125)-hc), suku kuadrat magnitudo
slab P*(M-Mc)+Q*(M-Mc)^2+W (Mc 6,5); antarmuka Mc 7,1 dengan P/Q/W = 0 untuk PGA. BSSA14 tidak dipotong.
Jenis: gempa dangkal (15-50 km) M >= 7 butuh jenis eksplisit, atau ditebak "antarmuka" bila <= 200 km dari segmen subduksi (param "palung", PB2002 batas_lempeng); tidak pernah diam-diam BSSA14 untuk megathrust.
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
    "zhao06_pga": {"a": 1.101, "b": -0.00564, "c": 0.0055, "d": 1.080, "e": 0.01412, "hc": 15.0, "mag_maks_intraslab": 7.8, "h_maks": 125.0, "SI": 0.0, "SS": 2.607, "SSL": -0.528,
                   "MCI": 7.1, "PI": 0.0, "QI": 0.0, "WI": 0.0, "MCS": 6.5, "PS": 0.1392, "QS": 0.1584, "WS": -0.0529,
                   "C": {"I": 1.111, "II": 1.344, "III": 1.355, "IV": 1.420}},
    "worden12_pga": {"c1": 1.78, "c2": 1.55, "c3": -1.60, "c4": 3.70, "t1": 1.57},
    "wells_coppersmith94": {"a": -2.44, "b": 0.59},
    "mmi_min": 1.0, "mmi_maks": 10.0, "ambang_jendela": 2.0, "jendela_maks_km": 400.0, "mmi_valid_min": 3.0, "mmi_valid_maks": 8.0,
    "radius_palung_km": 200.0, "palung": [[[104.576,-8.167],[104.981,-8.569],[105.59,-8.926],[106.123,-9.24],[106.345,-9.371],[106.827,-9.665],[107.379,-9.89],[107.836,-10.053],[108.363,-10.178],[109.067,-10.328],[109.626,-10.371],[110.159,-10.44],[110.615,-10.477],[111.015,-10.477],[111.523,-10.577],[112.17,-10.652],[112.563,-10.758],[113.204,-10.87],[113.756,-10.964],[114.41,-11.088],[115.013,-11.15],[115.571,-11.219],[116.174,-11.275],[116.853,-11.331],[117.576,-11.337],[118.236,-11.387],[118.75,-11.362],[119.27,-11.393],[119.841,-11.462],[120.451,-11.524],[120.886,-11.492]],[[138.359,9.379],[138.574,9.953],[138.71,10.649],[138.813,11.121],[139.483,10.901],[140.1,10.946],[140.772,10.858],[141.608,11.058],[142.122,11.285],[142.961,11.403],[143.097,11.569]],[[143.097,11.569],[143.503,11.494],[144.157,11.79],[144.619,12.021],[145.024,12.211],[145.349,12.314],[145.691,12.647],[146.221,13.002],[146.752,13.363]],[[92.278,6.948],[92.376,6.333],[92.537,5.702],[92.665,5.005],[92.903,4.384],[93.227,3.716],[93.754,3.048],[94.405,2.457],[94.979,2.104]],[[94.979,2.104],[95.542,1.882],[96.089,1.487],[96.202,1.345]],[[96.202,1.345],[96.379,1.123],[96.67,0.759],[97.011,0.116],[97.372,-0.547],[97.769,-1.247],[98.035,-1.634],[98.301,-2.021],[98.874,-2.665],[99.37,-3.312],[99.675,-3.729],[99.98,-4.145],[100.359,-4.656],[100.791,-5.305],[101.346,-5.983],[101.858,-6.558],[102.452,-7.197],[103.183,-7.621],[103.763,-7.863],[104.576,-8.167]],[[125.494,13.306],[125.686,12.818],[126.137,12.265],[126.24,11.63],[126.214,11.06],[126.573,10.296],[126.824,9.449],[127.053,8.75],[127.219,8.136],[127.234,7.292],[127.25,6.447],[127.459,5.897],[127.498,5.474],[127.836,5.224],[128.151,4.763],[128.387,4.335],[128.684,3.7],[128.998,3.114],[129.217,2.671],[129.246,1.928],[129.197,1.059]],[[126.872,2.346],[126.426,1.706]],[[126.426,1.706],[126.144,1.001],[125.969,0.19]],[[123.43,2.006],[123.219,2.024],[122.48,2.377],[121.669,2.309],[120.824,2.311],[120.189,2.208],[119.696,2.033],[119.306,1.577],[119.249,0.714],[119.475,-0.081]],[[125.969,-0.278],[125.969,0.19],[126.144,1.001],[126.426,1.706]],[[119.475,-0.081],[119.296,-0.68],[119.045,-1.491],[118.884,-1.95],[118.723,-2.408],[118.578,-3.255],[118.823,-3.61]],[[128.383,-2.286],[129.258,-2.416],[130.107,-2.519],[130.585,-2.694],[131.063,-2.868],[131.489,-3.149],[131.915,-3.429],[132.316,-3.935],[132.717,-4.44]],[[138.793,-1.159],[138.674,-0.82],[138.054,-0.718],[137.435,-0.616],[136.943,-0.422],[136.451,-0.228],[135.656,-0.023],[134.938,0.421],[134.471,0.259],[133.899,0.057],[133.327,-0.146],[132.824,-0.043],[132.515,0.017]],[[132.515,0.017],[132.373,0.034],[131.738,0.15],[131.102,0.266],[130.546,0.475],[129.989,0.684],[129.197,1.059]],[[92.278,6.948],[91.903,7.663],[91.781,8.16],[91.651,8.656],[91.596,9.13],[91.533,9.604],[91.559,10.056],[91.576,10.514],[91.591,11.3],[91.643,11.791],[91.7,12.283],[91.889,13.154],[92.068,13.715]],[[125.969,0.19],[125.616,-0.128],[125.263,-0.446]],[[138.793,-1.159],[139.257,-1.39],[139.805,-1.557],[140.226,-1.767],[140.837,-1.893],[141.195,-2.167],[141.594,-2.272],[141.868,-2.398],[142.246,-2.693]],[[142.246,-2.693],[142.449,-2.814],[142.633,-2.932],[142.936,-3.018],[143.172,-3.053],[143.508,-3.156],[143.743,-3.46]]],
}


def kelas_zhao(vs30):
    return "I" if vs30 >= 600 else "II" if vs30 >= 300 else "III" if vs30 >= 200 else "IV"


def _jarak_segmen_km(lat, lon, a, b):
    """Jarak titik ke segmen (a, b = [lon, lat]) pada proyeksi ekuirektangular lokal; cukup untuk ambang 200 km."""
    k = math.cos(math.radians(lat))
    px, py = (a[0] - lon) * k, a[1] - lat
    qx, qy = (b[0] - lon) * k, b[1] - lat
    dx, dy = qx - px, qy - py
    t = 0.0 if dx == 0 and dy == 0 else max(0.0, min(1.0, -(px * dx + py * dy) / (dx * dx + dy * dy)))
    return math.hypot(px + t * dx, py + t * dy) * math.pi / 180 * R_BUMI


def dekat_palung(lat, lon, P=PARAM):
    return any(_jarak_segmen_km(lat, lon, l[i], l[i + 1]) <= P["radius_palung_km"] for l in P["palung"] for i in range(len(l) - 1))


def tebak_jenis(dalam, m=None, lat=None, lon=None, P=PARAM):
    """>= 50 km intraslab. 15-50 km dan M >= 7: antarmuka bila <= 200 km dari palung subduksi (butuh lat, lon), selain itu kerak;
    tanpa lat/lon error (pemanggil wajib memberi jenis). Selebihnya kerak."""
    if dalam >= 50:
        return "intraslab"
    if m is not None and m >= 7 and 15 <= dalam < 50:
        if lat is None or lon is None:
            raise ValueError("gempa dangkal M>=7 (15-50 km) butuh jenis eksplisit atau lat/lon untuk tebakan dekat palung")
        return "antarmuka" if dekat_palung(lat, lon, P) else "kerak"
    return "kerak"


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
    m = max(m, 0.0)
    if jenis == "intraslab":  # klip hanya untuk slab (OpenQuake ZhaoEtAl2006SSlabNSHMP2014); antarmuka tanpa klip
        m = min(m, c["mag_maks_intraslab"])
    h = min(h, c["h_maks"])
    r = x + c["c"] * math.exp(c["d"] * m)
    ln = c["a"] * m + c["b"] * x - math.log(r) + (c["e"] * (h - c["hc"]) if h >= c["hc"] else 0.0) + c["C"][kelas_zhao(vs30)]
    if jenis == "antarmuka":
        ln += c["SI"] + c["PI"] * (m - c["MCI"]) + c["QI"] * (m - c["MCI"]) ** 2 + c["WI"]
    else:
        ln += c["SS"] + c["SSL"] * math.log(x) + c["PS"] * (m - c["MCS"]) + c["QS"] * (m - c["MCS"]) ** 2 + c["WS"]
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


def ekstrapolasi(mmi, P=PARAM):
    """True bila MMI di luar rentang 3-8 tempat model layak dipercaya (GMICE Worden/GMPE di luar data)."""
    return not (P["mmi_valid_min"] <= mmi <= P["mmi_valid_maks"])


def mmi_perkiraan(m, repi, dalam, jenis=None, vs30=VS30_BAKU, P=PARAM):
    return pga_ke_mmi(pga_cms2(m, repi, dalam, jenis or tebak_jenis(dalam, m, P=P), vs30, P), P)


def jendela_km(m, dalam, jenis=None, vs30=VS30_BAKU, P=PARAM):
    """Radius (km, kelipatan 10) di mana MMI rata-rata masih >= 2; di luarnya tidak dihitung. Bisection tetap 40 putaran."""
    jenis = jenis or tebak_jenis(dalam, m, P=P)
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
    """g = {lat, lon, m, dalam, jenis?}; pusat = {kunci: [lat, lon]} -> {kunci: {"mmi", "ekstrapolasi"}} hanya di dalam jendela_km."""
    jenis = g.get("jenis") or tebak_jenis(g["dalam"], g["m"], g["lat"], g["lon"], P)
    win = jendela_km(g["m"], g["dalam"], jenis, vs30, P)
    out = {}
    for k, (la, lo) in pusat.items():
        d = jarak_km(g["lat"], g["lon"], la, lo)
        if d <= win:
            v = mmi_perkiraan(g["m"], d, g["dalam"], jenis, vs30, P)
            out[k] = {"mmi": v, "ekstrapolasi": ekstrapolasi(v, P)}
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
        "catatan": ["BSSA14 dan Zhao dicocokkan ke OpenQuake 16 Okt 2026; Worden 2012 dicocokkan manual.",
                    "Hanya nilai rata-rata, tanpa sigma; Vs30 seragam 400 m/s karena belum ada peta Vs30 di repo (efek tapak diabaikan).",
                    "Jenis tektonik ditebak dari kedalaman (>= 50 km intraslab, selain itu kerak); gempa dangkal 15-50 km M>=7 butuh jenis eksplisit atau ditebak antarmuka bila <= 200 km dari segmen subduksi PB2002.",
                    "Gempa titik diubah ke Rjb lewat Rjb = max(0, Repi - L/4), L Wells & Coppersmith: tanpa arah patahan, mengabaikan efek direktivitas.",
                    "Zhao 2006: magnitudo intraslab dipotong 7,8 (seperti OpenQuake SSlabNSHMP2014); antarmuka tidak dipotong (perbaikan 18 Okt 2026: sebelumnya M8,5 selatan Jawa memberi MMI permukiman terkuat 5,49, kini sekitar 6,4); jarak x = sqrt(Rjb^2 + h^2) dipakai sebagai perkiraan Rrup; tanpa koreksi regional; MMI dipotong di 1 sampai 10, di luar 3 sampai 8 ditandai ekstrapolasi.",
                    "Jendela hitung dibatasi 400 km dari pusat gempa.",
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
    assert tebak_jenis(30, 9.1, 3.3, 95.9) == "antarmuka" and tebak_jenis(30, 7.2, -2.0, 110.0) == "kerak"
    try:
        tebak_jenis(30, 8.0)
        raise SystemExit("megathrust M8 tanpa jenis/lokasi diterima")
    except ValueError:
        pass
    z = PARAM["zhao06_pga"]
    assert _zhao_pga_cms2(9.1, 100, 30, "antarmuka", 400, z) > _zhao_pga_cms2(7.8, 100, 30, "antarmuka", 400, z)  # antarmuka tanpa klip
    assert _zhao_pga_cms2(9.1, 100, 80, "intraslab", 400, z) == _zhao_pga_cms2(7.8, 100, 80, "intraslab", 400, z)  # slab dipotong 7,8
    assert pga_cms2(9.1, 100, 30, "kerak") > pga_cms2(7.8, 100, 30, "kerak")  # BSSA14 tak dipotong
    assert ekstrapolasi(2.5) and ekstrapolasi(8.5) and not ekstrapolasi(5)
    assert PARAM["jendela_maks_km"] == 400.0
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
        assert h and max(v["mmi"] for v in h.values()) >= 6
        print("kec dalam jendela (Lombok M6,9):", len(h), "MMI maks", round(max(v["mmi"] for v in h.values()), 2))
    print("guncangan uji OK")


if __name__ == "__main__":
    {"uji": uji, "ekspor": ekspor}[sys.argv[1] if len(sys.argv) > 1 else "uji"]()
