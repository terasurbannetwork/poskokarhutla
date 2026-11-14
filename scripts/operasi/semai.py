"""Peluang Semai Awan (Operasi Udara), ALGORITMA semai-awan. SA-02 (`uji`), SA-03/SA-04 (`jalan`), `fixture`, `ukurw`.

Pakai:
  python3 scripts/operasi/semai.py uji                    stdlib murni; kasus akhir pada fixture nyata (numpy opsional untuk silang)
  python3 scripts/operasi/semai.py jalan --putaran YYYYMMDDHH|auto [--keluar DIR] [--sekarang ISO] [--kluster P] [--hotspot24 P]
  python3 scripts/operasi/semai.py fixture --putaran YYYYMMDDHH [--kluster P]    menulis fixture_semai.json
  python3 scripts/operasi/semai.py ukurw --putaran YYYYMMDDHH                    sebaran w di sel lolos G1-G8
Masukan: data/raw/semai/<putaran>/<langkah>.npz (semai_ifs.py), public/data/kluster.json (frp24), hotspot24.json, scripts/udara/kota.json,
         scripts/cuaca/data/bandara.json, public/geo/provinsi.json dan kabupaten/*.json, seed op_base (renlap.muat_base),
         public/udara/data/awan_himawari.json (bila ada), <keluar>/asap_beban.npz (bila ada; diisi SA-05).
Keluaran: <keluar>/semai.json, awan_<langkah>.png (DESAIN-TEKNIS §3). `jalan` butuh numpy (hanya di semai.yml).
"""
import json, os, re, sys

AKAR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, AKAR)
import semai_murni as M  # noqa: E402


def muat_bobot():
    with open(os.path.join(AKAR, "semai_bobot.json"), encoding="utf-8") as f:
        return json.load(f)


def uji():
    b = muat_bobot()
    n = [0]

    def ok(cond, pesan=""):
        assert cond, pesan
        n[0] += 1

    def dekat(a, e, tol=1e-6, pesan=""):
        ok(abs(a - e) <= tol, f"{pesan}: {a} != {e}")

    ok(b["status"] == "HIPOTESIS" and isinstance(b["versi"], str) and b["versi"] and b["muatan_kg"] == {}, "label bobot")

    def periksa_dasar(n, jalur=""):
        if isinstance(n, dict):
            if "nilai" in n or "dasar" in n:
                ok(n.get("dasar") in ("N", "L", "H"), f"dasar tak sah di {jalur}: {n.get('dasar')}")
            for k, v in n.items():
                if k != "nilai":
                    periksa_dasar(v, f"{jalur}.{k}")
    periksa_dasar(b)
    ok(abs(sum(M.nilai(b, f"skor.w{x}") for x in "qdt") - 1) < 1e-9, "bobot skor berjumlah 1")

    # LCL, level beku, w
    dekat(M.lcl_m(30, 24), 750, pesan="LCL")
    dekat(M.suhu_dasar(30, 750), 30 - 7.35)
    gh, t = [100, 800, 1500, 3000, 4400], [295, 288, 280, 268, 258]
    lb = M.level_beku(t, gh)
    dekat(lb, 2356.25, pesan="level beku (literal)")
    ok(M.level_beku([295, 290, 285], [100, 800, 1500]) is None, "tanpa lapisan beku")
    ok(M.kedalaman_hangat(None, 750) is None, "tanpa beku -> kedalaman None")
    dekat(M.kedalaman_hangat(2356.25, 750, 600), 1006.25, pesan="kedalaman memotong elevasi dataran tinggi")
    s = dict(lcc=0.9, mucape=2000, tclw=0.1, geser=5, rh850=80, hujan=0, tdasar=20, hangat_m=M.kedalaman_hangat(None, 750), jam_lokal=10)
    lolos, gagal = M.gerbang(s, b)
    ok(not lolos and gagal == ["G8"], f"tanpa lapisan beku gagal G8: {gagal}")
    dekat(M.w_ke_ms(-0.5, 290, 850), 0.05, 0.001, "w tanda dibalik")
    ok(M.w_ke_ms(-0.5, 290, 850) > 0, "naik positif")

    # gerbang: batas persis
    dasar = dict(lcc=0.25, mucape=1500, tclw=0.05, geser=12.5, rh850=65, hujan=3.99, tdasar=10, hangat_m=1000, jam_lokal=7)
    ok(M.gerbang(dasar, b) == (True, []), "semua tepat di batas lolos")
    ubah = {"G1": ("lcc", 0.2499), "G2": ("mucape", 1499.9), "G3": ("tclw", 0.0499), "G4": ("geser", 12.51), "G5": ("rh850", 64.9),
            "G6": ("hujan", 4.0), "G7": ("tdasar", 9.99), "G8": ("hangat_m", 999), "G9": ("jam_lokal", 16)}
    for g, (k, v) in ubah.items():
        lolos, gagal = M.gerbang({**dasar, k: v}, b)
        ok(gagal == [g], f"{g} gagal tepat di luar batas: {gagal}")
    ok(M.gerbang({**dasar, "jam_lokal": 15}, b)[0], "blok 15-18 beririsan jendela")
    ok(M.gerbang({**dasar, "jam_lokal": 5}, b)[0] and not M.gerbang({**dasar, "jam_lokal": 4}, b)[0], "blok 05-08 beririsan, 04-07 tidak")
    lolos, gagal = M.gerbang({**dasar, "tdasar": 5, "hangat_m": None}, b, "nimbus")
    ok(lolos, "mode Nimbus mematikan G7 dan G8")
    ok(M.tanda_bahaya({"mucape": 3501}, b) and not M.tanda_bahaya({"mucape": 3500}, b) and not M.tanda_bahaya({"mucape": 9000}, b, "nimbus"), "tanda bahaya")

    # ramp, T
    for x, e in [(1500, 0), (2250, 0.5), (3000, 1), (4000, 1)]:
        dekat(M.ramp(x, 1500, 3000), e, pesan=f"ramp {x}")
    for km, e in [(5, 0), (10, 0), (30, 0.5), (50, 1), (80, 1)]:
        dekat(M.faktor_t(km, M.nilai(b, "t.dekat_km"), M.nilai(b, "t.jauh_km")), e, pesan=f"T {km}")

    # D, skor
    ok(M.faktor_d(0, 200) == 0.0, "D tanpa api")
    w = (0.45, 0.40, 0.15)
    ok(M.skor(0.9, 0.0, 1.0, w) == 0 and M.skor(0.9, 0.0, 1.0, w, "nimbus") == 0, "D 0 -> skor 0 kedua mode")
    ok(M.skor(0, 0.9, 1.0, w) == 0 and M.skor(0.9, 0.9, 0, w) == 0, "satu faktor 0 -> skor 0 (geometris)")

    # contoh ALGORITMA §6
    komp = {"cape": 0.53, "air": 0.36, "rh": 1, "geser": 0.54, "naik": 0.40}
    Q, Qn = M.faktor_q(komp), M.faktor_q(komp, "nimbus")
    D = M.faktor_d(442, 200)
    dekat(Q, 0.566, 0.0005, "Q"); dekat(Qn, 0.608, 0.0005, "Q nimbus"); dekat(D, 0.890, 0.0005, "D")
    dekat(round(M.skor(Q, D, 1.0, w), 2), 0.74, pesan="skor bawaan")
    dekat(round(M.skor(Qn, D, 1.0, w, "nimbus"), 2), 0.78, pesan="skor nimbus")
    dekat(round(M.skor(0.66, 0.83, 1.0, w, "nimbus"), 2), 0.78, pesan="contoh panduan Nimbus")
    # komponen_q dari masukan mentah
    kq = M.komponen_q(dict(mucape=2250, tclw=0.175, rh850=80, geser=6.25, w=0.5 * M.nilai(b, "q.naik_penuh_ms")), b)
    ok(all(abs(kq[k] - 0.5) < 1e-9 for k in kq), f"komponen_q {kq}")

    # titik hujan
    la, lo = M.titik_hujan(0.0, 100.0, 10.0, 0.0, 30)
    dekat(la, 0.0); dekat(M.haversine(0, 100, la, lo), 18.0, 0.05, "hanyut 10 m/s x 30 menit = 18 km")

    # zona NMS
    sel = [dict(lat=0.0, lon=100.0, skor=0.8), dict(lat=0.0, lon=100.27, skor=0.7),   # ~30 km dari yang pertama
           dict(lat=0.0, lon=101.0, skor=0.6), dict(lat=0.0, lon=102.0, skor=0.5),
           dict(lat=0.0, lon=103.0, skor=0.4), dict(lat=0.0, lon=104.0, skor=0.38), dict(lat=0.0, lon=105.0, skor=0.37),
           dict(lat=0.0, lon=106.0, skor=0.36), dict(lat=0.0, lon=107.0, skor=0.34)]
    ok(sum(c["skor"] >= 0.35 and c["lon"] != 100.27 for c in sel) == 7, "7 sel lolos ambang dan 40 km, dipotong maksimum jadi 5")
    zn = M.zona_nms(sel, 40, 5, 0.35)
    ok(len(M.zona_nms(sel, 40, 10, 0.35)) == 7, "tanpa batas maksimum: 7 zona")
    ok(len(zn) == 5 and (0.0, 100.27) not in [(z["lat"], z["lon"]) for z in zn], "dua sel 30 km: satu zona; maksimum 5")
    ok(all(z["skor"] >= 0.35 for z in M.zona_nms(sel, 40, 10, 0.35)), "skor < 0,35 dibuang (sel 0,34)")
    ok(len(M.zona_nms([dict(lat=0, lon=100, skor=0.35)], 40, 5, 0.35)) == 1, "ambang 0,35 inklusif")

    # jendela 85% dan zona waktu
    off = b["zona_waktu"]["offset_jam"]
    pz = b["zona_waktu"]["provinsi"]
    for kode, e in [("62", "WIB"), ("63", "WITA"), ("51", "WITA"), ("82", "WIT")]:
        ok(M.zona_waktu_prov(kode, pz) == e, f"zona waktu {kode}")
    ok(M.zona_waktu_prov("6201", pz) == "WIB", "kode kab -> provinsi")
    J = lambda *a: M.jendela_85(*a, M.nilai(b, "zona.jendela_persen"), M.nilai(b, "gerbang.jam_mulai"), M.nilai(b, "gerbang.jam_akhir"))
    ok(J([0.7, 0.74, 0.72, 0.5], 1, [0, 3, 6, 9], "WIB", off) == "07.00 sampai 16.00 WIB", "00z-09z dipotong ke 07..16")
    ok(J([0.74, 0.72], 0, [3, 6], "WIB", off) == "10.00 sampai 16.00 WIB", "blok 03Z dan 06Z WIB")
    ok(J([0.74], 0, [3], "WITA", off) == "11.00 sampai 14.00 WITA", "blok 03Z WITA")
    ok(J([0.74, 0.60, 0.74], 0, [3, 6, 9], "WIB", off) == "10.00 sampai 13.00 WIB", "tidak melompati langkah < 85%")
    ok(J([0.5, 0.9, 0.8, 0.77, 0.9], 1, [0, 3, 6, 9, 12], "WIB", off) == "10.00 sampai 16.00 WIB", "85% lawan puncak 0,9 = 0,765")
    ok(J([0.9], 0, [12], "WIB", off) is None, "seluruhnya di luar jendela: None")
    ok(J([0.9], 0, [27], "WIB", off) == "10.00 sampai 13.00 WIB", "langkah > 24 jam melipat ke hari berikutnya")

    # hujan blok
    tp = [0.0, 3.0, 9.0]
    dekat(M.hujan_blok(tp, 0), 1.0); dekat(M.hujan_blok(tp, 1), 2.0)
    ok(M.hujan_blok(tp, 2) is None, "langkah terakhir tanpa pasangan")

    # kota sudah berasap, arah
    ok(M.arah_8(-1.40, 115.30, -1.60, 115.50) == "dari tenggara", "kota di barat laut cluster")
    ok(M.arah_8(0, 100, 1, 100) == "dari utara" and M.arah_8(0, 100, 0, 99) == "dari barat", "arah utara/barat")

    # cluster
    dekat(M.ambang_cluster([3000, 100, 50], b), 60)
    dekat(M.ambang_cluster([500, 100], b), 40)
    ok("60" in M.kalimat_kosong("tidak_ada_api_besar", M.ambang_cluster([3000, 100], b)), "kalimat kosong menyebut 60")
    ok(M.kalimat_kosong("tidak_ada_awan").startswith("Tidak ada awan layak semai"), "kosong awan")
    ok("Putaran terakhir: 2026-11-14 00z" in M.kalimat_kosong("tanpa_prakiraan", jam_putaran="2026-11-14 00z"), "kosong tanpa prakiraan")

    # DMS, mitra
    ok(M.dms(-4.6, 121.9) == "4°36'00\" S 121°54'00\" E", M.dms(-4.6, 121.9))
    bm = M.nilai(b, "mitra.bulat_derajat")
    dekat(M.bulat_mitra(-4.6, bm), -4.5); dekat(M.bulat_mitra(121.9, bm), 122.0)

    # menit terbang, ketinggian, bahan, sortie
    jk, mb = M.nilai(b, "terbang.jelajah_kmj"), M.nilai(b, "terbang.menit_bulat")
    ok(M.menit_terbang(81, jk, mb) == 15 and M.menit_terbang(176, jk, mb) == 35, "menit terbang dibulatkan 5")
    K = lambda lcl, elev: M.ketinggian_kaki(lcl, elev, M.nilai(b, "ketinggian.lcl_min_m"), M.nilai(b, "ketinggian.lcl_maks_m"),
                                            M.nilai(b, "ketinggian.bulat_kaki"), M.nilai(b, "ketinggian.m_ke_kaki"))
    ok(K(1200, 50) == 4000 and K(250, 0) is None and K(3100, 0) is None, "ketinggian")
    ok(M.ada_inversi([300, 299, 301, 290]) and not M.ada_inversi([300, 298, 295]), "inversi")
    # dataran tinggi: 1000 hPa di bawah tanah (gh 100 < elev 600) dibuang; inversi semu di bawah tanah tak dihitung
    ok(M.ada_inversi([290, 295, 293, 290], [100, 800, 1500, 3000], 0) and not M.ada_inversi([290, 295, 293, 290], [100, 800, 1500, 3000], 600),
       "inversi dataran tinggi")
    # sel laut dekat Bali (provinsi daratan terdekat 51) = WITA, bukan WIB/WIT
    ok(M.zona_waktu_prov("51", pz) == "WITA" and M.zona_waktu_prov("3578", pz) == "WIB", "zona waktu sel laut dekat Bali")
    ok(M.usul_bahan(True, "tinggi").startswith("dry ice") and M.usul_bahan(True, "rendah") == "NaCl" and M.usul_bahan(False, "tinggi") == "NaCl", "bahan")
    ok(M.jumlah_sortie(180, 35, 30, 5) == 1 and M.jumlah_sortie(600, 35, 30, 2) == 2 and M.jumlah_sortie(10, 35, 30, 3) == 1, "sortie")

    # ringkasan
    dat = dict(judul_id="Sab 14 Nov, 16.00 WIB", judul_en="Sat 14 Nov, 16:00 WIB", model="ECMWF 00z", bulat_mitra=bm, n_cluster=47, frp_mw=6231,
               asap="menyeberang ke Timor-Leste sekitar 24 jam lagi", asap_en="crossing into Timor-Leste in about 24 hours",
               zona=[dict(huruf="A", prov="Kalimantan Tengah", prov_en="Central Kalimantan", lat=-1.4, lon=115.3, jendela="13.00 sampai 16.00 WIB",
                          skor=0.74, base="Tjilik Riwut", base_kode="PKY", menit=35)])
    pos = M.ringkasan_teks(dat, "pos")
    ok("- A Kalimantan Tengah, -1,400 115,300, 13.00 sampai 16.00 WIB, skor 0,74, dari Tjilik Riwut (PKY) sekitar 35 menit" in pos, pos)
    ok("6.231 MW" in pos and pos.endswith("Konfirmasi tiap operasi dengan BMKG."), pos)
    mi = M.ringkasan_teks(dat, "mitra")
    koord = re.findall(r"~(-?\d+\.\d), (-?\d+\.\d)", mi)
    ok(koord == [("-1.5", "115.5")], f"koordinat mitra {koord}")
    ok(all(abs(float(x) * 2 - round(float(x) * 2)) < 1e-9 for p in koord for x in p), "kelipatan 0,5")
    ok(not re.search(r"-?\d+\.\d{2,}", mi.replace(":00", "")) and not re.search(r"(?i)skor|score|0[.,]74|Tjilik|PKY|-1[.,]4|115[.,]3", mi), mi)
    kosong = M.ringkasan_teks(dict(dat, zona=[], kalimat_kosong=M.kalimat_kosong("tidak_ada_awan")), "pos")
    ok("Tidak ada awan layak semai" in kosong, "ringkasan kosong")

    print(f"semai uji: {n[0]} kasus lolos")


# =====================================================================================================================
# jalan: butuh numpy. Cermin vektor dari semai_murni.turunan_sel / gerbang / komponen_q (disilang di uji bila numpy ada).
# =====================================================================================================================
REPO = os.path.dirname(os.path.dirname(AKAR))
CACHE_PROV = os.path.join(REPO, "data/raw/semai/prov_idx.npz")
LAT0, LON0, RES = 7.0, 94.0, 0.1
NLAT, NLON = 191, 481
BBOX = [94, -12, 142, 7]
KAB_BENDERA = {"M": "MODIS", "N": "SNPP", "N20": "NOAA20", "N21": "NOAA21"}
ARAH_EN = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"]


def _np():
    import numpy as np
    return np


def n_(b, j):
    return M.nilai(b, j)


def lintang():
    return LAT0 - RES * _np().arange(NLAT)


def bujur():
    return LON0 + RES * _np().arange(NLON)


def haversine_np(lat1, lon1, lat2, lon2):
    np = _np()
    p1, p2 = np.radians(lat1), np.radians(lat2)
    a = np.sin((p2 - p1) / 2) ** 2 + np.cos(p1) * np.cos(p2) * np.sin(np.radians(lon2 - lon1) / 2) ** 2
    return 2 * M.R_BUMI_KM * np.arcsin(np.sqrt(a))


def muat_json(rel):
    with open(os.path.join(REPO, rel), encoding="utf-8") as f:
        return json.load(f)


def prov_nama():
    import importlib.util as u
    sp = u.spec_from_file_location("status_darurat", os.path.join(REPO, "scripts/umum/status_darurat.py"))
    m = u.module_from_spec(sp)
    sp.loader.exec_module(m)
    return m.PROV_NAMA


# ---- provinsi per sel 0,1 derajat -----------------------------------------------------------------------------------
def pip_ring_toggle(inside, X, Y, ring):
    """Aturan genap-ganjil: balik `inside` untuk titik (X, Y) yang punya persilangan ke kanan dengan ring."""
    np = _np()
    for (x1, y1), (x2, y2) in zip(ring, ring[1:] + ring[:1]):
        if y1 == y2:
            continue
        sel = (y1 > Y) != (y2 > Y)
        if sel.any():
            xc = (x2 - x1) * (Y - y1) / (y2 - y1) + x1
            inside ^= sel & (X < xc)
    return inside


def mask_geom(geom, lat_grid, lon_grid):
    """Mask boolean (NLAT, NLON) sel yang pusatnya di dalam Polygon/MultiPolygon (genap-ganjil lintas semua cincin)."""
    np = _np()
    polys = geom["coordinates"] if geom["type"] == "MultiPolygon" else [geom["coordinates"]]
    out = np.zeros((NLAT, NLON), bool)
    for poly in polys:
        xs = [p[0] for r in poly for p in r]
        ys = [p[1] for r in poly for p in r]
        i0 = max(0, int((LAT0 - max(ys)) / RES) - 1); i1 = min(NLAT, int((LAT0 - min(ys)) / RES) + 2)
        j0 = max(0, int((min(xs) - LON0) / RES) - 1); j1 = min(NLON, int((max(xs) - LON0) / RES) + 2)
        if i0 >= i1 or j0 >= j1:
            continue
        Y, X = np.meshgrid(lat_grid[i0:i1], lon_grid[j0:j1], indexing="ij")
        ins = np.zeros(Y.shape, bool)
        for r in poly:
            ins = pip_ring_toggle(ins, X, Y, [tuple(p[:2]) for p in r])
        out[i0:i1, j0:j1] |= ins
    return out


def isi_terdekat(label, ada):
    """Sel tanpa label (-1) diisi label tetangga lewat pelebaran 8-tetangga berulang (pendekatan provinsi daratan terdekat)."""
    np = _np()
    lab = label.copy()
    while (lab < 0).any():
        baru = lab.copy()
        for di in (-1, 0, 1):
            for dj in (-1, 0, 1):
                if di == dj == 0:
                    continue
                g = np.full_like(lab, -1)
                a = lab[max(0, -di):NLAT - max(0, di), max(0, -dj):NLON - max(0, dj)]
                g[max(0, di):NLAT - max(0, -di) or None, max(0, dj):NLON - max(0, -dj) or None] = a
                tm = (baru < 0) & (g >= 0)
                baru[tm] = g[tm]
        if (baru == lab).all():
            break
        lab = baru
    return lab


def indeks_provinsi():
    """-> (idx int16 [NLAT, NLON] ke daftar kode, darat bool, kode list). Dicache di data/raw/semai/prov_idx.npz."""
    np = _np()
    if os.path.exists(CACHE_PROV):
        z = np.load(CACHE_PROV, allow_pickle=False)
        return z["idx"], z["darat"], [str(k) for k in z["kode"]]
    g = muat_json("public/geo/provinsi.json")["features"]
    kode = sorted(f["properties"]["kode"] for f in g)
    la, lo = lintang(), bujur()
    lab = np.full((NLAT, NLON), -1, np.int16)
    for f in g:
        lab[mask_geom(f["geometry"], la, lo) & (lab < 0)] = kode.index(f["properties"]["kode"])
    darat = lab >= 0
    idx = isi_terdekat(lab, darat)
    os.makedirs(os.path.dirname(CACHE_PROV), exist_ok=True)
    np.savez(CACHE_PROV, idx=idx, darat=darat, kode=np.array(kode))
    return idx, darat, kode


# ---- turunan numpy ----------------------------------------------------------------------------------------------------
def turunan_np(P, i, jam_lokal):
    """P = {langkah_ke_i: dict npz float32}. i = indeks langkah di daftar penuh. Cermin M.turunan_sel."""
    np = _np()
    c = P[i]
    tp_n = P[i + 1]["sfc_tp"] if i + 1 in P else None
    gh1000 = c["pl_gh_1000"]
    elev = np.maximum(0.0, gh1000)
    lcl = np.maximum(0.0, M.ESPY * (c["sfc_2t"] - c["sfc_2d"]))
    T = np.stack([c[f"pl_t_{p}"] for p in M.NIVO_PL]); GH = np.stack([c[f"pl_gh_{p}"] for p in M.NIVO_PL])
    beku = T <= M.BEKU_K
    ada = beku.any(0)
    k = beku.argmax(0)
    k0 = np.maximum(k - 1, 0)
    t0 = np.take_along_axis(T, k0[None], 0)[0]; t1 = np.take_along_axis(T, k[None], 0)[0]
    g0 = np.take_along_axis(GH, k0[None], 0)[0]; g1 = np.take_along_axis(GH, k[None], 0)[0]
    with np.errstate(divide="ignore", invalid="ignore"):
        lb = np.where(k == 0, g1, g0 + (t0 - M.BEKU_K) / (t0 - t1) * (g1 - g0))
    lb = np.where(ada, lb, np.nan)
    wms = lambda w, t, p: -w * M.R_UDARA * t / (p * 100.0 * M.G)
    w = (wms(c["pl_w_850"], c["pl_t_850"], 850) + wms(c["pl_w_700"], c["pl_t_700"], 700)) / 2
    us = (c["pl_u_850"] + c["pl_u_700"]) / 2; vs = (c["pl_v_850"] + c["pl_v_700"]) / 2
    hujan = np.full_like(lcl, np.nan) if tp_n is None else np.maximum(0.0, (tp_n - c["sfc_tp"]) / 3.0)
    return dict(lcc=c["sfc_lcc"], mucape=c["sfc_mucape"], tclw=c["sfc_tclw"],
                geser=np.hypot(c["pl_u_200"] - c["pl_u_850"], c["pl_v_200"] - c["pl_v_850"]),
                rh850=np.minimum(100.0, c["pl_r_850"]), hujan=hujan,
                tdasar=c["sfc_2t"] - M.BEKU_K - M.LAPSE_KERING * lcl, hangat_m=lb - (lcl + elev),
                jam_lokal=jam_lokal, w=w, lcl=lcl, elev=elev, lbeku=lb, u_pengarah=us, v_pengarah=vs)


def gerbang_np(s, b, mode="bawaan"):
    n = lambda j: n_(b, j)
    g = ((s["lcc"] >= n("gerbang.lcc_min")) & (s["mucape"] >= n("gerbang.mucape_min")) & (s["tclw"] >= n("gerbang.tclw_min"))
         & (s["geser"] <= n("gerbang.geser_maks")) & (s["rh850"] >= n("gerbang.rh850_min")) & (s["hujan"] < n("gerbang.hujan_maks_mm_jam"))
         & (s["jam_lokal"] < n("gerbang.jam_akhir")) & (s["jam_lokal"] + 3 > n("gerbang.jam_mulai")))
    if mode != "nimbus":
        g = g & (s["tdasar"] >= n("gerbang.tdasar_min_c")) & (s["hangat_m"] >= n("gerbang.hangat_min_m"))
    return g


def ramp_np(x, lo, hi):
    return _np().clip((x - lo) / (hi - lo), 0.0, 1.0)


def komp_np(s, b):
    n = lambda j: n_(b, j)
    return {"cape": ramp_np(s["mucape"], n("q.cape_lo"), n("q.cape_hi")), "air": ramp_np(s["tclw"], n("q.air_lo"), n("q.air_hi")),
            "rh": ramp_np(s["rh850"], n("q.rh_lo"), n("q.rh_hi")), "geser": ramp_np(n("q.geser_maks") - s["geser"], 0.0, n("q.geser_maks")),
            "naik": ramp_np(s["w"], 0.0, n("q.naik_penuh_ms"))}


def q_np(k, mode="bawaan"):
    ks = ["cape", "air", "rh", "geser"] + ([] if mode == "nimbus" else ["naik"])
    return sum(k[x] for x in ks) / len(ks)


def skor_np(Q, D, T, w, mode="bawaan"):
    np = _np()
    wq, wd, wt = w
    if mode == "nimbus":
        return np.where(D > 0, wq * Q + wd * D + wt * T, 0.0)
    with np.errstate(invalid="ignore", divide="ignore"):
        return np.where((Q > 0) & (D > 0) & (T > 0), np.power(Q, wq) * np.power(D, wd) * np.power(T, wt), 0.0)


def titik_hujan_np(lat, lon, u, v, tau):
    np = _np()
    d = tau * 60.0
    return lat + v * d / 111320.0, lon + u * d / (111320.0 * np.maximum(0.05, np.cos(np.radians(lat))))


def ramp_pil(x):
    """Kelas awan 1..4 untuk PNG (b['raster']['kelas_q'])."""
    return None


def tulis_png(path, kelas, palet, alfa):
    """PNG berpalet 8 bit (stdlib zlib + struct). kelas: array uint8 [H, W] (indeks palet, 0 = transparan)."""
    import struct, zlib
    h, w = kelas.shape

    def blok(t, d):
        return struct.pack(">I", len(d)) + t + d + struct.pack(">I", zlib.crc32(t + d) & 0xFFFFFFFF)
    raw = b"".join(b"\x00" + kelas[r].tobytes() for r in range(h))
    png = (b"\x89PNG\r\n\x1a\n" + blok(b"IHDR", struct.pack(">IIBBBBB", w, h, 8, 3, 0, 0, 0))
           + blok(b"PLTE", bytes(c for rgb in palet for c in rgb)) + blok(b"tRNS", bytes(alfa))
           + blok(b"IDAT", zlib.compress(raw, 9)) + blok(b"IEND", b""))
    with open(path, "wb") as f:
        f.write(png)
    return len(png)


# ---- masukan ---------------------------------------------------------------------------------------------------------
def tempat_np():
    """Titik kota dan bandara untuk faktor T: (lat, lon) array."""
    np = _np()
    kota = muat_json("scripts/udara/kota.json")["baris"]
    band = muat_json("scripts/cuaca/data/bandara.json")["bandara"]
    return np.array([[r[3], r[4]] for r in kota] + [[v[1], v[2]] for v in band]), kota


def muat_cluster(jalur, prov_nm):
    """Cluster dengan frp24 > 0, di dalam wilayah dan provinsi dikenal. Kunci: id, lat, lon, frp24, gambut, prov, kab, px24, akhir."""
    out = []
    for f in json.load(open(jalur, encoding="utf-8"))["features"]:
        p = f["properties"]
        if p.get("frp24", 0) > 0 and BBOX[0] <= p["lon"] <= BBOX[2] and BBOX[1] <= p["lat"] <= BBOX[3] and p.get("prov") in prov_nm:
            out.append(dict(id=p["id"], lat=p["lat"], lon=p["lon"], frp24=float(p["frp24"]), gambut=bool(p.get("gambut")),
                            prov=p["prov"], kab=p.get("kab"), px24=p.get("px24"), akhir=p.get("akhir")))
    return out


def sumber_firms(jalur, dibuat, b):
    """Hitungan piksel 24 jam per satelit dari hotspot24.json (kolom `sensor`, `jam` jam relatif acuan, negatif = lampau)."""
    if not os.path.exists(jalur):
        return {"piksel": None, "satelit": [], "hilang": [], "catatan": "hotspot24.json tidak ada"}
    h = json.load(open(jalur, encoding="utf-8"))
    ks, kj = h["kolom"].index("sensor"), h["kolom"].index("jam")
    cnt = {}
    for r in h["baris"]:
        if r[kj] > -24:
            cnt[r[ks]] = cnt.get(r[ks], 0) + 1
    acuan = dt.datetime.fromisoformat(h["acuan"].replace("Z", "+00:00"))
    ada = [KAB_BENDERA[k] for k in ("N", "N20", "N21") if cnt.get(k, 0) > 0]
    harap = ["N20", "N21"] + (["N"] if dibuat.replace(tzinfo=dt.timezone.utc) < SNPP_AKHIR() else [])
    return {"piksel": sum(cnt.values()), "per_satelit": {KAB_BENDERA.get(k, k): v for k, v in sorted(cnt.items())}, "satelit": ada,
            "hilang": [KAB_BENDERA[k] for k in harap if cnt.get(k, 0) == 0],
            "jam": acuan.strftime("%Y-%m-%dT%H:%MZ"),
            "basi": (dibuat.replace(tzinfo=dt.timezone.utc) - acuan).total_seconds() / 3600 > n_(b, "satelit.firms_basi_jam"),
            "catatan": "hilang = nol piksel 24 jam (rerata 7 hari belum tersedia di berkas ini)"}


def SNPP_AKHIR():
    import importlib.util as u
    sp = u.spec_from_file_location("firms_sumber", os.path.join(REPO, "scripts/data/firms_sumber.py"))
    m = u.module_from_spec(sp)
    sp.loader.exec_module(m)
    return m.SNPP_AKHIR
