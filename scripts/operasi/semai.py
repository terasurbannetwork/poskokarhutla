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
import datetime as dt, json, os, re, sys, time

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
    # rute OMC §7c: titik masuk 10 NM sebelum zona, kaki tabur 10 NM melintang angin, berjarak 3 NM, kembali ke base
    import renlap
    la, lo = M.titik_dari(0.0, 110.0, 90, 60)
    ok(abs(la) < 1e-9 and abs(renlap.jarak_nm(0.0, 110.0, la, lo) - 60) < 0.01, "titik_dari")
    rt = M.titik_rute_omc((0.0, 110.0), (0.0, 111.0), 0.0, 10, 10, 3, renlap.baringan)
    ok(len(rt) == 7 and rt[0] == rt[6] and abs(renlap.jarak_nm(*rt[1], 0.0, 111.0) - 10) < 0.01, "rute: titik masuk 10 NM")
    ok(abs(renlap.jarak_nm(*rt[2], *rt[3]) - 10) < 0.05 and abs(renlap.jarak_nm(*rt[3], *rt[4]) - 3) < 0.05, "rute: kaki 10 NM, jarak 3 NM")
    ok(abs(renlap.baringan(*rt[2], *rt[3]) % 180 - 90) < 1, "rute: angin ke utara, kaki melintang timur-barat")
    ok(renlap.jarak_nm(*rt[1], *rt[2]) < renlap.jarak_nm(*rt[1], *rt[3]), "rute: kaki pertama dari ujung terdekat titik masuk")
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

    uji_fixture(b, ok)
    print(f"semai uji: {n[0]} kasus lolos")


def uji_fixture(b, ok):
    """Ujung ke ujung pada potongan nyata (fixture_semai.json): turunan skalar -> gerbang -> D, T -> skor -> zona -> jendela.
    Stdlib saja; bila numpy ada, cermin vektornya disilangkan ke jalur skalar."""
    fx = os.path.join(AKAR, "fixture_semai.json")
    if not os.path.exists(fx):
        print("semai uji: fixture_semai.json tidak ada, kasus ujung ke ujung dilewati (jalankan `semai.py fixture`)")
        return
    with open(fx, encoding="utf-8") as f:
        F = json.load(f)
    off = b["zona_waktu"]["offset_jam"]
    w = (M.nilai(b, "skor.wq"), M.nilai(b, "skor.wd"), M.nilai(b, "skor.wt"))
    F0, rad, tau = M.nilai(b, "d.f0_mw"), M.nilai(b, "d.radius_api_km"), M.nilai(b, "d.tau_menit")
    ih = int(F["putaran"][8:10])
    langkah = F["langkah"]
    tampil = [s for s in langkah if s >= 12]
    n_lolos = n_d = 0
    for nm, L in F["lokasi"].items():
        zt = M.zona_waktu_prov(L["prov_kode"], b["zona_waktu"]["provinsi"])
        n = L["n"]
        cls = [(c["lat"], c["lon"], c["frp24"] * (M.nilai(b, "d.pengali_gambut") if c["gambut"] else 1.0)) for c in L["cluster"]]
        skor_cs = {}                                    # (i, j) -> {s: skor bawaan}
        sels = {}
        for s in tampil:
            k = langkah.index(s)
            for i in range(n):
                for j in range(n):
                    c = {key: arr[k][i][j] for key, arr in L["medan"].items()}
                    tp_n = L["medan"]["sfc_tp"][k + 1][i][j] if k + 1 < len(langkah) else None
                    sel = M.turunan_sel(c, tp_n, (ih + s + off[zt]) % 24)
                    lat, lon = L["lat0"] - 0.1 * i, L["lon0"] + 0.1 * j
                    hl, ho = M.titik_hujan(lat, lon, sel["u_pengarah"], sel["v_pengarah"], tau)
                    Fk = sum(e for y, x, e in cls if M.haversine(hl, ho, y, x) <= rad)
                    dm = min(M.haversine(hl, ho, y, x) for y, x in L["tempat"])
                    Dv, Tv = M.faktor_d(Fk, F0), M.faktor_t(dm, M.nilai(b, "t.dekat_km"), M.nilai(b, "t.jauh_km"))
                    sk, Q, _ = M.skor_sel(sel, Dv, Tv, b)
                    n_lolos += M.gerbang(sel, b)[0]
                    sels[(s, i, j)] = (sel, Dv, Tv, sk)
                    if sk > 0:
                        n_d += 1
                    ok(0 <= sk <= 1 and 0 <= Q <= 1 and 0 <= Dv <= 1 and 0 <= Tv <= 1, f"{nm} faktor di luar 0..1")
                    ok(Dv > 0 or sk == 0, f"{nm}: D = 0 harus skor 0")
                    skor_cs.setdefault((i, j), {})[s] = sk
        cells = [dict(lat=L["lat0"] - 0.1 * i, lon=L["lon0"] + 0.1 * j, skor=max(v.values()), ij=(i, j)) for (i, j), v in skor_cs.items()]
        zn = M.zona_nms(cells, M.nilai(b, "zona.jarak_min_km"), M.nilai(b, "zona.maks"), M.nilai(b, "zona.skor_min"))
        ok(len(zn) <= 5 and all(z["skor"] >= 0.35 for z in zn), f"{nm}: zona patuh ambang dan maksimum")
        for a in range(len(zn)):
            for c2 in range(a):
                ok(M.haversine(zn[a]["lat"], zn[a]["lon"], zn[c2]["lat"], zn[c2]["lon"]) > 40, f"{nm}: zona berjarak > 40 km")
        if not cls:
            ok(not zn and all(v == 0 for d in skor_cs.values() for v in d.values()), f"{nm}: tanpa api di cuplikan tidak ada zona")
        for z in zn:
            per = [skor_cs[z["ij"]].get(s, 0.0) for s in tampil]
            ib = per.index(max(per))
            txt = M.jendela_85(per, ib, [ih + s for s in tampil], zt, off, M.nilai(b, "zona.jendela_persen"), M.nilai(b, "gerbang.jam_mulai"), M.nilai(b, "gerbang.jam_akhir"))
            ok(re.fullmatch(r"\d\d\.00 sampai \d\d\.00 " + zt, txt or ""), f"{nm}: jendela {txt}")
            sel, Dv, _, _ = sels[(tampil[ib], *z["ij"])]
            ok(Dv > 0 and M.gerbang(sel, b)[0], f"{nm}: zona hanya di sel lolos gerbang dengan api di bawah titik hujan")
        L["_zn"] = zn
    ok(n_lolos > 0, "fixture memuat sel lolos gerbang")
    ok(any(L["_zn"] for L in F["lokasi"].values()), "fixture menghasilkan setidaknya satu zona (Kendari, api nyata di dekatnya)")
    try:
        import numpy as np
    except ImportError:
        print("semai uji: numpy tidak ada, silang cermin vektor dilewati")
        return
    for nm, L in F["lokasi"].items():
        n = L["n"]
        for s in tampil:
            k = langkah.index(s)
            P = {t: {key: np.array(arr[langkah.index(t)], dtype="float32") for key, arr in L["medan"].items()} for t in (s, s + 3) if t in langkah}
            jam = np.full((n, n), float((ih + s + off[M.zona_waktu_prov(L["prov_kode"], b["zona_waktu"]["provinsi"])]) % 24))
            d = turunan_np(P, s, jam)
            g = gerbang_np(d, b)
            for i in range(0, n, 4):
                for j in range(0, n, 4):
                    sel = sels_ij = None
                    c = {key: arr[k][i][j] for key, arr in L["medan"].items()}
                    tp_n = L["medan"]["sfc_tp"][k + 1][i][j] if k + 1 < len(langkah) else None
                    sel = M.turunan_sel(c, tp_n, jam[i, j])
                    for key in ("lcl", "geser", "tdasar", "w", "rh850", "elev"):
                        ok(abs(float(d[key][i, j]) - sel[key]) < 0.02 + 1e-3 * abs(sel[key]), f"{nm} cermin numpy {key}")
                    ok((sel["hujan"] is None and np.isnan(d["hujan"][i, j])) or abs(float(d["hujan"][i, j]) - sel["hujan"]) < 0.02, "cermin hujan")
                    ok((sel["hangat_m"] is None) == bool(np.isnan(d["hangat_m"][i, j])), "cermin hangat None/NaN")
                    if sel["hangat_m"] is not None:
                        ok(abs(float(d["hangat_m"][i, j]) - sel["hangat_m"]) < 0.5, "cermin hangat_m")
                    ok(bool(g[i, j]) == M.gerbang(sel, b)[0], f"{nm} cermin gerbang s={s} ({i},{j})")


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


def isi_terdekat(label):
    """Sel tanpa label (-1) diisi label tetangga lewat pelebaran 8-tetangga berulang (pendekatan provinsi daratan terdekat)."""
    np = _np()
    lab = label.copy()
    while (lab < 0).any():
        pad = np.pad(lab, 1, constant_values=-1)
        baru = lab.copy()
        for di in (-1, 0, 1):
            for dj in (-1, 0, 1):
                g = pad[1 + di:1 + di + NLAT, 1 + dj:1 + dj + NLON]
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
    idx = isi_terdekat(lab)
    os.makedirs(os.path.dirname(CACHE_PROV), exist_ok=True)
    np.savez(CACHE_PROV, idx=idx, darat=darat, kode=np.array(kode))
    return idx, darat, kode


# ---- turunan numpy ----------------------------------------------------------------------------------------------------
def turunan_np(P, i, jam_lokal):
    """P = {langkah jam: dict npz float32}; i = langkah (jam). Cermin M.turunan_sel."""
    np = _np()
    c = P[i]
    tp_n = P[i + 3]["sfc_tp"] if i + 3 in P else None
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
    return np.array([[r[3], r[4]] for r in kota] + [[v[1], v[2]] for v in band.values()]), kota


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


# ---- evaluasi sel kandidat ----------------------------------------------------------------------------------------------
class Konteks:
    pass


def sel_sekitar(lat_c, lon_c, radius_km):
    """Mask (NLAT, NLON) sel dalam radius_km dari salah satu titik pusat."""
    np = _np()
    la, lo = lintang(), bujur()
    m = np.zeros((NLAT, NLON), bool)
    r = int(radius_km / 11.0) + 2
    for y, x in zip(lat_c, lon_c):
        i, j = int(round((LAT0 - y) / RES)), int(round((x - LON0) / RES))
        i0, i1, j0, j1 = max(0, i - r), min(NLAT, i + r + 1), max(0, j - 2 * r), min(NLON, j + 2 * r + 1)
        if i0 >= i1 or j0 >= j1:
            continue
        Y, X = np.meshgrid(la[i0:i1], lo[j0:j1], indexing="ij")
        m[i0:i1, j0:j1] |= haversine_np(Y, X, y, x) <= radius_km
    return m


def lebarkan(mask, r_sel):
    """Pelebaran biner dengan cakram berjari-jari r_sel sel (tanpa scipy)."""
    np = _np()
    out = mask.copy()
    k = int(r_sel)
    for di in range(-k, k + 1):
        for dj in range(-k, k + 1):
            if di * di + dj * dj > r_sel * r_sel:
                continue
            pad = np.pad(mask, k)
            out |= pad[k + di:k + di + NLAT, k + dj:k + dj + NLON]
    return out


def evaluasi(ctx, ci, cj, sasaran=None):
    """Hitung semua faktor untuk sel (ci, cj) pada tiap langkah tampil. Mengembalikan dict array (S, N). `sasaran(lat, lon)`
    -> 0/1 (mode mulai-dari-target, ALGORITMA §7b): D dikali D_target."""
    np = _np()
    b = ctx.b
    N = len(ci)
    lat, lon = ctx.la[ci], ctx.lo[cj]
    taus = [n_(b, "d.tau_menit")] + list(n_(b, "d.tau_sensitivitas_menit"))
    rad, F0 = n_(b, "d.radius_api_km"), n_(b, "d.f0_mw")
    w = (n_(b, "skor.wq"), n_(b, "skor.wd"), n_(b, "skor.wt"))
    K = ctx.K
    ev = {k: [] for k in ("gfull", "gnim", "bahaya", "Q", "Qn", "F", "cl", "hlat", "hlon", "angin_u", "angin_v", "lcl", "elev", "mucape", "lcc", "tclw",
                          "geser", "rh850", "tdasar", "hangat_m", "w", "cape", "air", "rh", "g", "naik")}
    ev["D"] = {t: [] for t in taus}; ev["T"] = {t: [] for t in taus}
    for s in ctx.tampil:
        d = ctx.der[s]
        x = {k: (v[ci, cj] if hasattr(v, "shape") and v.ndim == 2 else v) for k, v in d.items()}
        x["jam_lokal"] = d["jam_lokal"][ci, cj]
        kp = komp_np(x, b)
        ev["gfull"].append(gerbang_np(x, b)); ev["gnim"].append(gerbang_np(x, b, "nimbus"))
        ev["bahaya"].append(x["mucape"] > n_(b, "bahaya.mucape_maks"))
        ev["Q"].append(q_np(kp)); ev["Qn"].append(q_np(kp, "nimbus"))
        for k in ("lcl", "elev", "mucape", "lcc", "tclw", "geser", "rh850", "tdasar", "hangat_m", "w"):
            ev[k].append(x[k])
        ev["cape"].append(kp["cape"]); ev["air"].append(kp["air"]); ev["rh"].append(kp["rh"]); ev["g"].append(kp["geser"]); ev["naik"].append(kp["naik"])
        ev["angin_u"].append(x["u_pengarah"]); ev["angin_v"].append(x["v_pengarah"])
        for t in taus:
            hl, ho = titik_hujan_np(lat, lon, x["u_pengarah"], x["v_pengarah"], t)
            if len(K["lat"]):
                dist = haversine_np(hl[:, None], ho[:, None], K["lat"][None], K["lon"][None])
                dalam = dist <= rad
                Fe = (dalam * K["frp_eff"][None]).sum(1)
                if t == taus[0]:
                    Fr = (dalam * K["frp"][None]).sum(1)
                    cl = np.where(dalam.any(1), np.argmax(np.where(dalam, K["frp"][None], -1), 1), -1)
            else:
                Fe = np.zeros(N); Fr = np.zeros(N); cl = np.full(N, -1)
            D = np.where(Fe > 0, 1 - np.exp(-Fe / F0), 0.0)
            if sasaran is not None:
                D = D * sasaran(hl, ho)
            dm = haversine_np(hl[:, None], ho[:, None], ctx.tempat[:, 0][None], ctx.tempat[:, 1][None]).min(1)
            ev["D"][t].append(D); ev["T"][t].append(ramp_np(dm, n_(b, "t.dekat_km"), n_(b, "t.jauh_km")))
            if t == taus[0]:
                ev["hlat"].append(hl); ev["hlon"].append(ho); ev["F"].append(Fr); ev["cl"].append(cl)
    A = lambda v: np.array(v)
    for k in list(ev):
        if k in ("D", "T"):
            ev[k] = {t: A(v) for t, v in ev[k].items()}
        else:
            ev[k] = A(ev[k])
    t0 = taus[0]
    ev["taus"] = taus
    ev["skor_b"] = np.where(ev["gfull"], skor_np(ev["Q"], ev["D"][t0], ev["T"][t0], w), 0.0)
    ev["skor_n"] = np.where(ev["gnim"], skor_np(ev["Qn"], ev["D"][t0], ev["T"][t0], w, "nimbus"), 0.0)
    return ev


def utc_jam(ctx, jam_sejak_tengah_malam):
    return (ctx.hari0 + dt.timedelta(hours=float(jam_sejak_tengah_malam))).strftime("%Y-%m-%dT%H:%MZ")


def arah_dari(u, v):
    import math
    deg = (math.degrees(math.atan2(-u, -v)) + 360) % 360
    return ARAH_EN[int((deg + 22.5) // 45) % 8]


def kota_terdekat(ctx, lat, lon):
    d = haversine_np(lat, lon, ctx.kota_ll[:, 0], ctx.kota_ll[:, 1])
    k = int(d.argmin())
    return k, float(d[k])


def rakit_zona(ctx, ev, k, s, huruf, skor_mat, mode, lengkap=True, hati_hati=False):
    """Satu zona dari sel k pada langkah tampil ke-s. None bila jendela terbang kosong."""
    np = _np()
    b = ctx.b
    t0 = ev["taus"][0]
    zt = ctx.zt_cell[ctx.ci[k], ctx.cj[k]]
    lang_utc = [ctx.init.hour + st for st in ctx.tampil]
    r = M.jendela_rentang(list(map(float, skor_mat[:, k])), s, lang_utc, zt, b["zona_waktu"]["offset_jam"],
                          n_(b, "zona.jendela_persen"), n_(b, "gerbang.jam_mulai"), n_(b, "gerbang.jam_akhir"))
    if r is None:
        return None
    lat, lon = float(ctx.la[ctx.ci[k]]), float(ctx.lo[ctx.cj[k]])
    pk = ctx.kode_prov[ctx.idx_prov[ctx.ci[k], ctx.cj[k]]]
    kk, _ = kota_terdekat(ctx, lat, lon)
    nama_kota = ctx.kota_nama[kk]
    darat = bool(ctx.darat[ctx.ci[k], ctx.cj[k]])
    jend_txt = f"{r['mulai_lokal']:02d}.00 sampai {r['akhir_lokal']:02d}.00 {zt}"
    z = {"id": f"{ctx.putaran}-{huruf}", "huruf": huruf, "lat": round(lat, 1), "lon": round(lon, 1),
         "skor": round(float(skor_mat[s, k]), 2), "langkah": int(ctx.tampil[s]), "jendela": [utc_jam(ctx, r["utc_mulai"]), utc_jam(ctx, r["utc_akhir"])],
         "jendela_teks": jend_txt, "zona_waktu": zt, "prov_kode": pk, "prov": ctx.prov_nm[pk],
         "kota": nama_kota if darat else f"lepas pantai dekat {nama_kota}",
         "hujan": {"lat": round(float(ev["hlat"][s, k]), 2), "lon": round(float(ev["hlon"][s, k]), 2), "tau_menit": t0},
         "Q": round(float(ev["Qn"][s, k] if mode == "nimbus" else ev["Q"][s, k]), 3), "D": round(float(ev["D"][t0][s, k]), 3),
         "T": round(float(ev["T"][t0][s, k]), 3)}
    if not lengkap:
        return z
    u, v = float(ev["angin_u"][s, k]), float(ev["angin_v"][s, k])
    kmj = (u * u + v * v) ** 0.5 * 3.6
    z.update({"Q_nimbus": round(float(ev["Qn"][s, k]), 3), "skor_nimbus": round(float(ev["skor_n"][s, k]), 2),
              "komp": {a: round(float(ev[a][s, k]), 2) for a in ("cape", "air", "rh")} | {"geser": round(float(ev["g"][s, k]), 2), "naik": round(float(ev["naik"][s, k]), 2)},
              "masukan": {"lcc": round(float(ev["lcc"][s, k]), 2), "mucape": int(round(float(ev["mucape"][s, k]))), "tclw": round(float(ev["tclw"][s, k]), 3),
                          "geser": round(float(ev["geser"][s, k]), 1), "rh850": int(round(float(ev["rh850"][s, k]))), "tdasar": round(float(ev["tdasar"][s, k]), 1),
                          "hangat_m": None if np.isnan(ev["hangat_m"][s, k]) else int(round(float(ev["hangat_m"][s, k]))), "w": round(float(ev["w"][s, k]), 2),
                          "angin_dari": arah_dari(u, v), "angin_kmj": int(round(kmj)), "geser_km": int(round(kmj * t0 / 60.0)),
                          "frp_25km": int(round(float(ev["F"][s, k])))}})
    ic = int(ev["cl"][s, k])
    z["cluster"] = ctx.cl[ic]["id"] if ic >= 0 else None
    # base terdekat (op_base seed), menit terbang perkiraan
    jb = {bid: M.haversine(lat, lon, bs["lat"], bs["lon"]) for bid, bs in ctx.bandara.items()}
    bid = min(jb, key=jb.get)
    km = jb[bid]
    menit = M.menit_terbang(km, n_(b, "terbang.jelajah_kmj"), n_(b, "terbang.menit_bulat"))
    bd = ctx.bandara[bid]
    z["base"] = {"id": bid, "icao": bd["icao"], "nama": bd["nama"], "km": int(round(km)), "menit": menit, "perkiraan": True,
                 "terdaftar": bd["terdaftar"]}
    tanda = []
    if ctx.awan_kab.get((ctx.kota_prov[kk], ctx.kota_kab[kk])):
        tanda.append("awan_teramati")
    if hati_hati:
        tanda.append("hati_hati")
    z["tanda"] = tanda
    z["mitra"] = {"lat": M.bulat_mitra(lat, n_(b, "mitra.bulat_derajat")), "lon": M.bulat_mitra(lon, n_(b, "mitra.bulat_derajat"))}
    # ketinggian, inversi, bahan, sortie (ALGORITMA §7b)
    kaki = M.ketinggian_kaki(float(ev["lcl"][s, k]), float(ev["elev"][s, k]), n_(b, "ketinggian.lcl_min_m"), n_(b, "ketinggian.lcl_maks_m"),
                             n_(b, "ketinggian.bulat_kaki"), n_(b, "ketinggian.m_ke_kaki"))
    z["ketinggian"] = {"kaki": kaki, "teks": "dasar awan tidak terbaca model" if kaki is None else f"sekitar {kaki:,} kaki (dasar awan perkiraan)".replace(",", ".")}
    c = ctx.P[ctx.tampil[s]]
    t = [float(c[f"pl_t_{p}"][ctx.ci[k], ctx.cj[k]]) for p in M.NIVO_PL[:4]]
    gh = [float(c[f"pl_gh_{p}"][ctx.ci[k], ctx.cj[k]]) for p in M.NIVO_PL[:4]]
    inv = M.ada_inversi(t, gh, float(ev["elev"][s, k]))
    beban = ctx.beban_asap(s, ctx.ci[k], ctx.cj[k])
    bahan = M.usul_bahan(inv, beban)
    z["bahan"] = {"usul": bahan, "inversi": bool(inv), "beban_asap": beban, "catatan": None if ctx.asap is not None else "tanpa data asap"}
    jmenit = (r["akhir_lokal"] - r["mulai_lokal"]) * 60
    ms = n_(b, "terbang.menit_semai")
    z["jumlah"] = {"muatan": "muatan armada belum diisi" if not b["muatan_kg"] else None, "armada_siap": None,
                   "armada_label": "armada siap belum diketahui, dihitung 1",
                   "sortie": M.jumlah_sortie(jmenit, menit, ms, 1), "sortie_tanpa_batas_armada": M.jumlah_sortie(jmenit, menit, ms, 10 ** 6)}
    z["rute"] = rute_omc(ctx, bid, lat, lon, u, v, kaki)
    return z


def rute_omc(ctx, bid, lat, lon, u, v, kaki):
    """ALGORITMA §7c: rute satu sortie OMC base -> titik masuk -> dua kaki tabur melintang angin -> base, pakai renlap.py."""
    import math
    import renlap
    b, bd = ctx.b, ctx.bandara[bid]
    vor_b = ctx.base.get(bid) or {}
    vor = (vor_b["vor_lat"], vor_b["vor_lon"]) if vor_b.get("vor_lat") is not None else None
    dk = json.load(open(os.path.join(REPO, "scripts/operasi/bobot_renlap.json"), encoding="utf-8"))["deklinasi_timur_derajat"]["bawaan"]
    angin_ke = math.degrees(math.atan2(u, v)) % 360 if (u * u + v * v) ** 0.5 >= n_(b, "rute.angin_tenang_ms") else None
    pts = M.titik_rute_omc((bd["lat"], bd["lon"]), (lat, lon), angin_ke, n_(b, "rute.masuk_nm"), n_(b, "rute.kaki_nm"),
                           n_(b, "rute.jarak_kaki_nm"), renlap.baringan)
    nama = [f"Base {bd['nama']}", "Titik masuk", "Awal kaki tabur 1", "Akhir kaki tabur 1", "Awal kaki tabur 2", "Akhir kaki tabur 2",
            f"Kembali ke base {bd['nama']}"]
    cp = []
    for i, (la, lo) in enumerate(pts):
        c = {"kode": f"CP{i}", "nama": nama[i], "lat": round(la, 5), "lon": round(lo, 5), "dms": renlap.dms(la, lo)}
        if vor:
            r, j = renlap.radial_jarak(vor, la, lo, dk)
            c.update({"radial": r, "jarak_vor_nm": round(j, 1), "vor": vor_b.get("vor_kode")})
        cp.append(c)
    kt = n_(b, "terbang.jelajah_kmj") / 1.852
    leg = []
    for i in range(len(pts) - 1):
        nm = renlap.jarak_nm(*pts[i], *pts[i + 1])
        hb = renlap.baringan(*pts[i], *pts[i + 1])
        leg.append({"dari": f"CP{i}", "ke": f"CP{i + 1}", "nm": round(nm, 1), "haluan_benar": round(hb) % 360 or 360,
                    "haluan_magnet": round((hb - dk) % 360) % 360 or 360, "menit": max(1, round(nm / kt * 60)),
                    "tabur": i in (2, 4), "kaki": kaki if 1 <= i <= 4 else None})
    return {"cp": cp, "leg": leg, "nm": round(sum(x["nm"] for x in leg), 1), "menit": sum(x["menit"] for x in leg),
            "jelajah_kt": round(kt), "angin_ke": None if angin_ke is None else round(angin_ke), "deklinasi_timur": dk,
            "perkiraan": True}


def zona_dari(ctx, ev, skor_mat, mode, lengkap=True, hati_hati=False, huruf_awal=0, jauhi=()):
    np = _np()
    b = ctx.b
    if skor_mat.size == 0:
        return []
    best = skor_mat.max(0); bi = skor_mat.argmax(0)
    cells = [dict(lat=float(ctx.la[ctx.ci[k]]), lon=float(ctx.lo[ctx.cj[k]]), skor=float(best[k]), k=k) for k in np.nonzero(best > 0)[0]]
    pilih = M.zona_nms(cells, n_(b, "zona.jarak_min_km"), n_(b, "zona.maks"), n_(b, "zona.skor_min"))
    out = []
    for c in pilih:
        if any(M.haversine(c["lat"], c["lon"], y, x) <= n_(b, "zona.jarak_min_km") for y, x in jauhi):
            continue
        z = rakit_zona(ctx, ev, c["k"], int(bi[c["k"]]), chr(65 + huruf_awal + len(out)), skor_mat, mode, lengkap, hati_hati)
        if z:
            out.append(z)
    return out


def baris_kandidat(ctx, ev, ci, cj, skor_rank, maks):
    """Baris [lat, lon, langkah, Q, D, T, cape, air, rh, geser, naik, D20, T20, D45, T45, D60, T60, g, bhy] terbaik (sel, langkah)."""
    np = _np()
    S, N = skor_rank.shape
    ada = np.argwhere(skor_rank > 0)
    if len(ada) == 0:
        return []
    v = skor_rank[ada[:, 0], ada[:, 1]]
    top = ada[np.argsort(-v)[:maks]]
    t0, ts = ev["taus"][0], ev["taus"][1:]
    out = []
    for s, k in top:
        r = [round(float(ctx.la[ci[k]]), 1), round(float(ctx.lo[cj[k]]), 1), int(ctx.tampil[s]),
             round(float(ev["Q"][s, k]), 3), round(float(ev["D"][t0][s, k]), 3), round(float(ev["T"][t0][s, k]), 3),
             round(float(ev["cape"][s, k]), 2), round(float(ev["air"][s, k]), 2), round(float(ev["rh"][s, k]), 2),
             round(float(ev["g"][s, k]), 2), round(float(ev["naik"][s, k]), 2)]
        for t in ts:
            r += [round(float(ev["D"][t][s, k]), 3), round(float(ev["T"][t][s, k]), 3)]
        r += [int(ev["gfull"][s, k]), int(ev["bahaya"][s, k])]
        out.append(r)
    return out


def kolom_kandidat(ev):
    ts = ev["taus"][1:]
    return ["lat", "lon", "langkah", "Q", "D", "T", "cape", "air", "rh", "geser", "naik"] + [f"{a}{t}" for t in ts for a in ("D", "T")] + ["g", "bhy"]


# ---- jalan ----------------------------------------------------------------------------------------------------------------
def pilih_putaran(arg):
    d = os.path.join(REPO, "data/raw/semai")
    if arg != "auto":
        return arg
    ada = sorted(x for x in os.listdir(d) if re.fullmatch(r"\d{10}", x) and os.path.exists(os.path.join(d, x, "36.npz")))
    if not ada:
        sys.exit("tanpa putaran lengkap di data/raw/semai (jalankan semai_ifs.py dulu)")
    return ada[-1]


def muat_putaran(putaran):
    np = _np()
    P = {}
    for s in range(0, 37, 3):
        z = np.load(os.path.join(REPO, "data/raw/semai", putaran, f"{s}.npz"))
        P[s] = {k: z[k].astype("float32") for k in z.files}
    return P


def siapkan(putaran, dibuat, b, jalur_kluster, P=None):
    np = _np()
    c = Konteks()
    c.b, c.putaran = b, putaran
    c.init = dt.datetime.strptime(putaran, "%Y%m%d%H").replace(tzinfo=dt.timezone.utc)
    c.hari0 = c.init.replace(hour=0)
    c.P = P if P is not None else muat_putaran(putaran)
    c.la, c.lo = lintang(), bujur()
    c.prov_nm = prov_nama()
    c.idx_prov, c.darat, c.kode_prov = indeks_provinsi()
    pz, off = b["zona_waktu"]["provinsi"], b["zona_waktu"]["offset_jam"]
    zn = [M.zona_waktu_prov(k, pz) for k in c.kode_prov]          # KeyError bila provinsi tak dikenal: bukan tebakan
    c.zt_cell = np.array(zn)[c.idx_prov]
    off_cell = np.array([off[z] for z in zn])[c.idx_prov]
    c.tampil = [s for s in range(0, 37, 3) if c.init + dt.timedelta(hours=s) >= dibuat][:9]
    c.der = {}
    for s in c.tampil:
        jam = (c.init.hour + s + off_cell) % 24
        c.der[s] = turunan_np(c.P, s, jam)
    c.cl = muat_cluster(jalur_kluster, c.prov_nm)
    fr = [x["frp24"] for x in c.cl]
    c.ambang = M.ambang_cluster(fr, b)
    c.big = [x for x in c.cl if x["frp24"] >= c.ambang]
    c.K = {"lat": np.array([x["lat"] for x in c.cl]), "lon": np.array([x["lon"] for x in c.cl]), "frp": np.array([x["frp24"] for x in c.cl]),
           "frp_eff": np.array([x["frp24"] * (n_(b, "d.pengali_gambut") if x["gambut"] else 1.0) for x in c.cl])}
    c.tempat, kota = tempat_np()
    c.kota_ll = np.array([[r[3], r[4]] for r in kota])
    c.kota_nama = [r[6] for r in kota]
    c.kota_kab = [r[6] for r in kota]
    c.kota_prov = [r[2] for r in kota]
    import renlap
    c.base = renlap.muat_base()
    # S10 (pemilik 14 Nov 2026): OMC berangkat dari bandara terdekat, tanpa batas jelajah. Kandidat = base op_base + 136 bandara
    # BMKG (scripts/cuaca/data/bandara.json); bandara yang sudah jadi base memakai id base (renlap bisa menargetkannya).
    icao_base = {bs.get("icao"): bid for bid, bs in c.base.items() if bs.get("aktif", 1)}
    c.bandara = {bid: {"nama": bs["nama"], "lat": bs["lat"], "lon": bs["lon"], "icao": bs.get("icao"), "terdaftar": True}
                 for bid, bs in c.base.items() if bs.get("aktif", 1)}
    for ic, (nm, la, lo, _pv) in json.load(open(os.path.join(REPO, "scripts/cuaca/data/bandara.json"), encoding="utf-8"))["bandara"].items():
        if ic not in icao_base:
            c.bandara[ic] = {"nama": nm, "lat": la, "lon": lo, "icao": ic, "terdaftar": False}
    c.awan_kab = {}
    fa = os.path.join(REPO, "public/udara/data/awan_himawari.json")
    if os.path.exists(fa):
        for kode, v in json.load(open(fa, encoding="utf-8"))["kab"].items():
            c.awan_kab[(kode[:2], v["kab"])] = v.get("persen_dingin", 0) > 0
    c.asap = None
    return c


def pasang_asap(c, keluar):
    np = _np()
    f = os.path.join(keluar, "asap_beban.npz")
    if not os.path.exists(f):
        return
    # format lintasan.py mode semai: `jam` = jam sejak awal putaran (per jam layar), `beban` (n, NLAT, NLON) lintang naik (lat0 -12),
    # dinormalkan p99. Grid semai lintang turun (LAT0 7), jadi dibalik; langkah s memakai jam s.
    z = np.load(f)
    jam = [int(x) for x in z["jam"]]
    c.asap = {j: z["beban"][i][::-1].astype("float32") for i, j in enumerate(jam)}


def tingkat_asap(c, v, b):
    return "tinggi" if v >= n_(b, "asap.tingkat_tinggi") else "sedang" if v >= n_(b, "asap.tingkat_sedang") else "rendah" if v >= n_(b, "asap.tingkat_rendah") else None


def jalan(args):
    np = _np()
    t_mulai = time.time()
    b = muat_bobot()
    putaran = pilih_putaran(args.putaran)
    dibuat = dt.datetime.fromisoformat(args.sekarang.replace("Z", "+00:00")) if args.sekarang else dt.datetime.now(dt.timezone.utc)
    keluar = args.keluar or os.path.join(REPO, "data/raw/semai/keluar")
    os.makedirs(keluar, exist_ok=True)
    c = siapkan(putaran, dibuat, b, args.kluster or os.path.join(REPO, "public/data/kluster.json"))
    pasang_asap(c, keluar)
    c.beban_asap = lambda s, i, j: (None if c.asap is None or c.tampil[s] not in c.asap else tingkat_asap(c, float(c.asap[c.tampil[s]][i, j]), b))
    out = {"dibuat": dibuat.strftime("%Y-%m-%dT%H:%M:%SZ"), "versi_bobot": b["versi"], "status_bobot": b["status"], "mode": "bawaan",
           "putaran": {"model": "ECMWF IFS", "res": 0.1, "init": c.init.strftime("%Y-%m-%dT%H:%M:%SZ"), "lisensi": "CC BY 4.0",
                       "umur_jam": round((dibuat - c.init).total_seconds() / 3600, 1)},
           "sumber": {"firms": sumber_firms(args.hotspot24 or os.path.join(REPO, "public/data/hotspot24.json"), dibuat, b)},
           "langkah": c.tampil, "raster": {"awan": "awan_{l}.png", "asap": "asap_{l}.png", "bbox": BBOX},
           "api": {"n_cluster": len(c.big), "frp_mw": round(sum(x["frp24"] for x in c.big)), "ambang_mw": round(c.ambang, 1)}}
    # raster awan layak semai (seluruh grid) dan angin pengarah 1 derajat
    k1, k2, k3 = n_(b, "raster.kelas_q")
    palet = [(0, 0, 0), (198, 219, 239), (107, 174, 214), (33, 113, 181), (8, 48, 107)]
    alfa = [0, 150, 175, 200, 225]
    ukuran_png = []
    u_l, v_l = [], []
    for s in c.tampil:
        d = c.der[s]
        Q = q_np(komp_np(d, b))
        kls = np.where(gerbang_np(d, b), 1 + (Q >= k1) + (Q >= k2) + (Q >= k3), 0).astype(np.uint8)
        ukuran_png.append(tulis_png(os.path.join(keluar, f"awan_{s}.png"), kls, palet, alfa))
        u_l.append(np.round(d["u_pengarah"][::10, ::10].astype("float64"), 1).tolist()); v_l.append(np.round(d["v_pengarah"][::10, ::10].astype("float64"), 1).tolist())
    out["angin"] = {"step": 1.0, "lat0": LAT0, "lon0": LON0, "langkah": c.tampil, "u": u_l, "v": v_l, "jenis": "pengarah 850-700 hPa"}
    fa = os.path.join(keluar, "asap.json")          # blok asap dari lintasan.py mode semai (SA-05), dijalankan lebih dulu
    out["asap"] = json.load(open(fa, encoding="utf-8")) if os.path.exists(fa) else None
    # sel kandidat
    if not c.big:
        out.update(alasan_kosong="tidak_ada_api_besar", kalimat_kosong=M.kalimat_kosong("tidak_ada_api_besar", c.ambang), zona=[], hati_hati=[],
                   kandidat_kolom=[], kandidat=[], cluster=[], nimbus={"zona": []}, kandidat_target={})
    else:
        mask = sel_sekitar([x["lat"] for x in c.big], [x["lon"] for x in c.big], n_(b, "cluster.radius_sel_km"))
        c.ci, c.cj = np.nonzero(mask)
        ev = evaluasi(c, c.ci, c.cj)
        zona = zona_dari(c, ev, np.where(ev["bahaya"], 0.0, ev["skor_b"]), "bawaan")
        zl = [(z["lat"], z["lon"]) for z in zona]
        hati = zona_dari(c, ev, np.where(ev["bahaya"], ev["skor_b"], 0.0), "bawaan", hati_hati=True, huruf_awal=len(zona), jauhi=zl)[:3]
        nim = zona_dari(c, ev, ev["skor_n"], "nimbus", lengkap=False)
        rank = np.maximum(ev["skor_b"], ev["skor_n"])
        out["kandidat_kolom"] = kolom_kandidat(ev)
        out["kandidat"] = baris_kandidat(c, ev, c.ci, c.cj, rank, 400)
        out["zona"], out["hati_hati"] = zona, hati
        out["nimbus"] = {"zona": nim}
        out["alasan_kosong"] = None if zona else "tidak_ada_awan"
        out["kalimat_kosong"] = None if zona else M.kalimat_kosong("tidak_ada_awan")
        lz = {z["cluster"]: z["huruf"] for z in zona if z.get("cluster")}
        cl_out = []
        for x in sorted(c.big, key=lambda x: -x["frp24"]):
            kk, _ = kota_terdekat(c, x["lat"], x["lon"])
            cl_out.append({"id": x["id"], "lat": round(x["lat"], 2), "lon": round(x["lon"], 2), "prov_kode": x["prov"], "prov": c.prov_nm[x["prov"]],
                           "kab": x["kab"], "kota": c.kota_nama[kk], "piksel": x["px24"], "frp24": round(x["frp24"]), "gambut": x["gambut"],
                           "akhir": x["akhir"], "zona": lz.get(x["id"])})
        out["cluster"] = cl_out
        out["kandidat_target"] = kandidat_target(c, b)
    s = json.dumps(out, ensure_ascii=False, separators=(",", ":"))
    with open(os.path.join(keluar, "semai.json"), "w", encoding="utf-8") as f:
        f.write(s)
    out["_lapor"] = dict(detik=round(time.time() - t_mulai, 1), json_kb=round(len(s.encode()) / 1024, 1), png_kb=[round(x / 1024, 1) for x in ukuran_png])
    return out


def kandidat_target(c, b):
    """Target kabupaten dengan cluster aktif (frp24 > 0): kandidat terbaik per target untuk Tinjau BMKG (ALGORITMA §7b). Poligon KHG
    tidak ada di repo (khg_prioritas.json hanya memuat nama kab), jadi target KHG belum ada: hanya kabupaten."""
    np = _np()
    kolom, hasil = None, {}
    grup = {}
    for x in c.cl:
        if x["kab"]:
            grup.setdefault((x["prov"], x["kab"]), []).append(x)
    kabgeo = {}
    for (pv, kab), cls in sorted(grup.items()):
        if pv not in kabgeo:
            f = os.path.join(REPO, "public/geo/kabupaten", f"{pv}.json")
            kabgeo[pv] = {ft["properties"]["kab"]: ft["geometry"] for ft in json.load(open(f, encoding="utf-8"))["features"]} if os.path.exists(f) else {}
        m = np.zeros((NLAT, NLON), bool)
        if kab in kabgeo[pv]:
            m |= mask_geom(kabgeo[pv][kab], c.la, c.lo)
        for x in cls:                                  # kab sempit (< 1 sel) tetap punya sel: sel pusat tiap cluster
            m[min(NLAT - 1, max(0, int(round((LAT0 - x["lat"]) / RES)))), min(NLON - 1, max(0, int(round((x["lon"] - LON0) / RES))))] = True
        cand = lebarkan(m, n_(b, "cluster.radius_sel_km") / 11.1)
        dekat = lebarkan(m, n_(b, "d.radius_api_km") / 11.1)

        def sasaran(hl, ho, dekat=dekat):
            i = np.clip(np.round((LAT0 - hl) / RES).astype(int), 0, NLAT - 1); j = np.clip(np.round((ho - LON0) / RES).astype(int), 0, NLON - 1)
            return dekat[i, j].astype(float)
        ci, cj = np.nonzero(cand)
        c.ci, c.cj = ci, cj
        ev = evaluasi(c, ci, cj, sasaran)
        rows = baris_kandidat(c, ev, ci, cj, np.maximum(ev["skor_b"], ev["skor_n"]), 40)
        if kolom is None:
            kolom = kolom_kandidat(ev)
        hasil[f"{pv}|{kab}"] = {"nama": kab, "prov": c.prov_nm[pv], "n_cluster": len(cls), "frp24": round(sum(x["frp24"] for x in cls)), "baris": rows}
    return {"kolom": kolom or [], "target": hasil, "catatan": "target KHG belum ada: poligon KHG tidak tersedia di repo"}


def ukur_w(putaran):
    """Sebaran w (m/s) di sel lolos G1-G8 (G9 dimatikan) seluruh grid, langkah 0..33 (langkah 36 tanpa hujan blok)."""
    np = _np()
    b = muat_bobot()
    P = muat_putaran(putaran)
    ws = []
    for s in range(0, 34, 3):
        d = turunan_np(P, s, np.full((NLAT, NLON), 12.0))
        ws.append(d["w"][gerbang_np(d, b)])
    w = np.concatenate(ws)
    p = {q: float(np.percentile(w, q)) for q in (50, 90, 95)}
    print(f"n={len(w)} dari {34 // 3 * NLAT * NLON}; w m/s p50={p[50]:.3f} p90={p[90]:.3f} p95={p[95]:.3f} min={w.min():.3f} maks={w.max():.3f}")


def buat_fixture(putaran, jalur_kluster):
    """Potongan nyata 21 x 21 sel (2 x 2 derajat) sekitar Palangkaraya dan Kendari, 13 langkah, 29 field, dibulatkan."""
    np = _np()
    P = muat_putaran(putaran)
    b = muat_bobot()
    desimal = {"sfc_lcc": 3, "sfc_mucape": 0, "sfc_tclw": 4, "sfc_tp": 2, "sfc_2t": 2, "sfc_2d": 2, "pl_r_850": 1}
    lokasi = {"palangkaraya": (-2.21, 113.92, "62"), "kendari": (-3.97, 122.52, "74")}
    tempat, _ = tempat_np()
    pn = prov_nama()
    cl = muat_cluster(jalur_kluster, pn)
    out = {"_catatan": "Potongan nyata ECMWF IFS 0,1 derajat (CC BY 4.0) dan kluster.json; dibuat `semai.py fixture`. Dipakai `semai.py uji`.",
           "putaran": putaran, "langkah": list(range(0, 37, 3)), "lokasi": {}}
    for nm, (y, x, pv) in lokasi.items():
        i0, j0 = int(round((LAT0 - y) / RES)), int(round((x - LON0) / RES))
        sl = (slice(i0 - 10, i0 + 11), slice(j0 - 10, j0 + 11))
        medan = {}
        for k in P[0]:
            dec = desimal.get(k, 3 if k.startswith("pl_w") else 1)
            medan[k] = [np.round(P[s][k][sl].astype("float64"), dec).tolist() for s in range(0, 37, 3)]
        la0, la1 = LAT0 - RES * (i0 + 10), LAT0 - RES * (i0 - 10)
        lo0, lo1 = LON0 + RES * (j0 - 10), LON0 + RES * (j0 + 10)
        out["lokasi"][nm] = {"prov_kode": pv, "lat0": round(LAT0 - RES * (i0 - 10), 1), "lon0": round(lo0, 1), "n": 21,
                             "cluster": [{k: v for k, v in c.items() if k in ("id", "lat", "lon", "frp24", "gambut")} for c in cl
                                         if la0 - 0.6 <= c["lat"] <= la1 + 0.6 and lo0 - 0.6 <= c["lon"] <= lo1 + 0.6],
                             "tempat": [[round(float(a), 3), round(float(b_), 3)] for a, b_ in tempat if la0 - 1 <= a <= la1 + 1 and lo0 - 1 <= b_ <= lo1 + 1],
                             "medan": medan}
    p = os.path.join(AKAR, "fixture_semai.json")
    with open(p, "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, separators=(",", ":"))
    print(f"fixture {os.path.getsize(p) / 1024:.0f} KB; cluster: " + ", ".join(f"{k}={len(v['cluster'])}" for k, v in out["lokasi"].items()))


def main():
    import argparse
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("cmd", choices=["uji", "jalan", "fixture", "ukurw"])
    ap.add_argument("--putaran", default="auto")
    ap.add_argument("--keluar")
    ap.add_argument("--sekarang")
    ap.add_argument("--kluster")
    ap.add_argument("--hotspot24")
    a = ap.parse_args()
    if a.cmd == "uji":
        uji()
    elif a.cmd == "jalan":
        o = jalan(a)
        print(json.dumps(o["_lapor"]))
        for z in o["zona"]:
            print(z["huruf"], z["prov_kode"], z["prov"], z["lat"], z["lon"], "skor", z["skor"], z["jendela_teks"], z["base"]["id"], z["base"]["menit"], "menit",
                  z["tanda"], z["cluster"], z["ketinggian"]["teks"], z["bahan"]["usul"], "sortie", z["jumlah"]["sortie"])
        print("alasan_kosong:", o["alasan_kosong"], "| hati_hati:", len(o["hati_hati"]), "| nimbus:", [(z["huruf"], z["prov"], z["lat"], z["lon"], z["skor"]) for z in o["nimbus"]["zona"]])
        print("langkah", o["langkah"], "| kandidat", len(o["kandidat"]), "| target", len(o["kandidat_target"].get("target", {})), "| api", o["api"], "| firms", o["sumber"]["firms"])
    elif a.cmd == "fixture":
        buat_fixture(pilih_putaran(a.putaran), a.kluster or os.path.join(REPO, "public/data/kluster.json"))
    else:
        ukur_w(pilih_putaran(a.putaran))


if __name__ == "__main__":
    main()
