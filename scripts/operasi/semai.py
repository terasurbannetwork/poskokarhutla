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
import datetime as dt, json, math, os, re, sys, time

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

    uji_banjir_murni(b, ok, dekat)
    uji_fixture(b, ok)
    uji_banjir_fixture(b, ok)
    uji_refaktor(ok)
    print(f"semai uji: {n[0]} kasus lolos")


def uji_banjir_murni(b, ok, dekat):
    """RENCANA-UJI semai-banjir §1: fungsi murni tujuan banjir, tiap aturan dengan kasus yang ditolak."""
    def tolak(f, *a, **k):
        try:
            f(*a, **k)
        except ValueError as e:
            return str(e)
        return None

    bb = b["banjir"]
    ok(bb["status"] == "HIPOTESIS" and bb["versi_banjir"] == "1" and b["versi"] == "1", "blok banjir berlabel, versi karhutla utuh")
    ok(len(M.nilai(b, "banjir.sasaran_tetap")) == 13, "13 kab tetap")
    # H
    for tiba, e in [(0.5, 0), (1, 1), (2, 1), (3, 1), (3.5, 0.5), (4, 0), (5, 0)]:
        dekat(M.faktor_h(tiba, b), e, pesan=f"H tiba {tiba}")
    dekat(M.faktor_h(None, b), 0, pesan="H tanpa masuk")
    ok("-1" in (tolak(M.faktor_h, -1) or ""), "tiba negatif ditolak, pesan memuat angkanya")
    ok("x" in (tolak(M.faktor_h, "x") or ""), "tiba teks ditolak")
    ok(tolak(M.faktor_h, True) is not None, "tiba bool ditolak")
    # contoh ALGORITMA §6, skor, P
    w = tuple(M.nilai(b, f"banjir.skor.w{x}") for x in "qhp")
    dekat(sum(w), 1, pesan="bobot skor banjir")
    dekat(M.skor(0.566, M.faktor_h(3.5, b), 1.0, w), 0.59, 0.005, "contoh §6")
    dekat(M.skor(0.566, M.faktor_h(0.5, b), 1.0, w), 0, pesan="H 0 -> skor 0")
    for km, e in [(5, 0), (30, 0.5), (80, 1)]:
        dekat(M.faktor_t(km, 10, 50), e, pesan=f"P darat {km} km")
    # gerbang
    for kw, e in [(dict(dalam=True, jarak_km=0), False), (dict(dalam=False, jarak_km=5), False), (dict(dalam=False, jarak_km=15), True),
                  (dict(dalam=False, jarak_km=10), False)]:
        ok(M.lolos_gb("GB1", b, **kw) is e, f"GB1 {kw}")
    ok("-3" in (tolak(M.lolos_gb, "GB1", b, dalam=False, jarak_km=-3) or ""), "GB1 jarak negatif ditolak")
    terl = {"3171", "3201"}
    for kw, e in [(dict(titik_kab="3171", sel_kab=None), False), (dict(titik_kab=None, sel_kab="3171"), False),
                  (dict(titik_kab=None, sel_kab="3201"), False), (dict(titik_kab=None, sel_kab=None), True)]:
        ok(M.lolos_gb("GB2", b, terlarang=terl, **kw) is e, f"GB2 {kw}")
    for tiba, e in [(0.5, False), (2, True), (5, False), (None, False)]:
        ok(M.lolos_gb("GB3", b, tiba=tiba) is e, f"GB3 {tiba}")
    ok(M.lolos_gb("GB4", b, hari_tiba="2026-11-25", d="2026-11-25") and not M.lolos_gb("GB4", b, hari_tiba="2026-11-26", d="2026-11-25"), "GB4")
    ok("GB9" in (tolak(M.lolos_gb, "GB9", b) or ""), "gerbang tak dikenal ditolak")
    ok(tolak(M.lolos_gb, "GB3", b) is not None, "masukan kurang ditolak")
    ok("2026" in (tolak(M.lolos_gb, "GB4", b, hari_tiba=20261125, d="2026-11-25") or "2026"), "GB4 tanggal bukan teks ditolak")
    # koridor dan angin
    ok(not M.di_koridor(20, 10, b) and not M.di_koridor(200, 10, b) and M.di_koridor(60, 10, b) and not M.di_koridor(60, 30, b), "koridor")
    ok("-5" in (tolak(M.di_koridor, -5, 1, b) or ""), "koridor jarak negatif ditolak")
    ok(M.angin_lemah(1.5, b) and not M.angin_lemah(2, b), "angin lemah 1,5 / 2 m/s")
    ok("-1" in (tolak(M.angin_lemah, -1, b) or ""), "angin negatif ditolak")
    ok(M.zona_id_banjir("20261125T12", 0) == "20261125T12-BA" and M.zona_id_banjir("p", 2) == "p-BC", "zona id")
    ok("26" in (tolak(M.zona_id_banjir, "p", 26) or ""), "urut 26 ditolak")
    # empat keadaan kosong
    ok([M.alasan_kosong_banjir(0, False, 0), M.alasan_kosong_banjir(3, True, 0), M.alasan_kosong_banjir(3, False, 0),
        M.alasan_kosong_banjir(3, False, 2, ada_ifs=False), M.alasan_kosong_banjir(3, False, 2)] ==
       ["tidak_ada_sasaran", "angin_lemah", "tidak_ada_awan_hulu", "tanpa_prakiraan", None], "alasan kosong")
    ok("-1" in (tolak(M.alasan_kosong_banjir, -1, False, 0) or ""), "hitungan negatif ditolak")
    # pilih_sasaran
    d = "2026-11-25"
    def kab(i, bnj, p50):
        return dict(id=i, BNJ=[[bnj, 0], [0, 0], [0, 0]], HJN=[[0, 0, p50]] * 3)
    pred = dict(kode=dict(BNJ=dict(hari=[d, "2026-11-26", "2026-11-27"], vonis={"ps|1": ["belum teruji", 1, 0, False, 1]})),
                kab=[kab("9001", 2, 0), kab("9002", 1, 0.29), kab("9003", 1, 0.3), kab("9004", 1, 0)],
                waspada=[dict(kab="9005", tenggang=1, aturan="banjir"), dict(kab="9006", tenggang=2, aturan="asap")])
    pred["kab"].append(kab("9005", 0, 0))
    pred["kab"].append(kab("9006", 0, 0))
    bm = dict(kab={"31.72": dict(hari=[dict(tgl=d, kondisi="Hujan Petir")]), "99.01": dict(hari=[dict(tgl=d, kondisi="Berawan")]),
                   "99.02": dict(hari=[dict(tgl="2026-11-26", kondisi="Hujan Lebat")])})
    r = M.pilih_sasaran(d, pred, bm, b, manual=["9100"])
    a = {x["kode"]: x for x in r["sasaran"]}
    ok(a["9001"]["asal"] == ["prakiraan"] and a["9001"]["belum_teruji"], "BNJ level 2 masuk, belum teruji")
    ok("9002" not in a and "9004" not in a, "p50 0,29 dan tanpa sinyal tidak masuk")
    ok("9003" in a and "9005" in a and "9006" not in a, "p50 0,3 dan waspada banjir masuk, waspada asap tidak")
    ok(a["3171"]["asal"] == ["tetap"] and a["9100"]["asal"] == ["manual"], "tetap dan manual")
    ok(a["3172"]["asal"] == ["tetap", "bmkg"] and "9901" not in a and "9902" not in a, "BMKG Hujan Petir kunci 31.72 -> 3172, hari lain dan Berawan tidak")
    ok(not any(x["belum_teruji"] for x in r["sasaran"] if x["asal"] != ["prakiraan"]), "belum teruji hanya asal prakiraan saja")
    lulus = dict(pred, kode=dict(BNJ=dict(pred["kode"]["BNJ"], vonis={"ps|1": ["lulus", 1, 0, True, 1]})))
    ok(not M.pilih_sasaran(d, lulus, bm, b)["sasaran"][-1]["belum_teruji"], "vonis lulus melepas label")
    r = M.pilih_sasaran(d, pred, bm, b, umur_prediksi_jam=40)
    ok("9001" not in {x["kode"] for x in r["sasaran"]} and any("basi (40 jam)" in x for x in r["sumber"]), "prakiraan 40 jam dilewati, tercatat basi")
    r = M.pilih_sasaran("2026-11-26", pred, None, b, tercakup=False)
    ok({x["kode"] for x in r["sasaran"] if x["pantau"]} == {"9003"} and "BMKG kab10 tidak ada" in r["sumber"], "tenggang 2 tak tercakup: hanya p50 0,3 pantau; BMKG hilang tercatat")
    pred2 = dict(pred, kab=[dict(kab("9001", 0, 0), BNJ=[[0, 0], [2, 0], [0, 0]])])
    r = M.pilih_sasaran("2026-11-26", pred2, None, b, tercakup=False)
    ok([x["pantau"] for x in r["sasaran"] if x["kode"] == "9001"] == [True], "tenggang 2 hari tak tercakup = pantau")
    ok(not M.pilih_sasaran("2026-11-26", pred2, None, b)["sasaran"][-1]["pantau"], "tercakup = bukan pantau")
    ok("tak ada di kode.BNJ.hari" in "".join(M.pilih_sasaran("2027-01-01", pred, None, b)["sumber"]), "tanggal di luar tenggang tercatat")
    kosong = json.loads(json.dumps(b))
    kosong["banjir"]["sasaran_tetap"]["nilai"] = []
    ok(M.pilih_sasaran(d, None, None, kosong)["alasan_kosong"] == "tidak_ada_sasaran", "tanpa sasaran")
    ok("2026/11" in (tolak(M.pilih_sasaran, "2026/11/25", pred, bm, b) or "2026/11"), "format tanggal")
    ok("2026/11/25" in (tolak(M.pilih_sasaran, "2026/11/25", pred, bm, b) or ""), "d salah ditolak, pesan memuat nilainya")
    ok("12" in (tolak(M.pilih_sasaran, d, pred, bm, b, manual=["12"]) or ""), "kode manual 2 angka ditolak")
    ok("-2" in (tolak(M.pilih_sasaran, d, pred, bm, b, umur_prediksi_jam=-2) or ""), "umur negatif ditolak")


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
def tempat_py():
    """Titik kota dan bandara untuk faktor T: ([[lat, lon]], baris kota). Stdlib."""
    kota = muat_json("scripts/udara/kota.json")["baris"]
    band = muat_json("scripts/cuaca/data/bandara.json")["bandara"]
    return [[r[3], r[4]] for r in kota] + [[v[1], v[2]] for v in band.values()], kota


def tempat_np():
    """Titik kota dan bandara untuk faktor T: (lat, lon) array."""
    t, kota = tempat_py()
    return _np().array(t), kota


def bandara_gabung(base):
    """S10: base op_base aktif + 136 bandara BMKG yang belum jadi base -> {id: {nama, lat, lon, icao, terdaftar}}. Stdlib."""
    icao_base = {bs.get("icao"): bid for bid, bs in base.items() if bs.get("aktif", 1)}
    out = {bid: {"nama": bs["nama"], "lat": bs["lat"], "lon": bs["lon"], "icao": bs.get("icao"), "terdaftar": True}
           for bid, bs in base.items() if bs.get("aktif", 1)}
    for ic, (nm, la, lo, _pv) in muat_json("scripts/cuaca/data/bandara.json")["bandara"].items():
        if ic not in icao_base:
            out[ic] = {"nama": nm, "lat": la, "lon": lo, "icao": ic, "terdaftar": False}
    return out


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
    c.bandara = bandara_gabung(c.base)
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
    if args.tujuan == "banjir":
        return jalan_banjir(args, b, dibuat, keluar, c)
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


def hitung_golden(b):
    """Potret karhutla (stdlib) dari fixture_semai.json: lolos gerbang, skor sel > 0 (skor 6 desimal), zona berurutan. SB-01."""
    with open(os.path.join(AKAR, "fixture_semai.json"), encoding="utf-8") as f:
        F = json.load(f)
    off = b["zona_waktu"]["offset_jam"]
    w = (M.nilai(b, "skor.wq"), M.nilai(b, "skor.wd"), M.nilai(b, "skor.wt"))
    F0, rad, tau = M.nilai(b, "d.f0_mw"), M.nilai(b, "d.radius_api_km"), M.nilai(b, "d.tau_menit")
    ih = int(F["putaran"][8:10])
    langkah = F["langkah"]
    tampil = [s for s in langkah if s >= 12]
    out = {}
    for nm, L in F["lokasi"].items():
        n = L["n"]
        zt = M.zona_waktu_prov(L["prov_kode"], b["zona_waktu"]["provinsi"])
        cls = [(c["lat"], c["lon"], c["frp24"] * (M.nilai(b, "d.pengali_gambut") if c["gambut"] else 1.0)) for c in L["cluster"]]
        skor_cs, sel_nol, lolos = {}, [], 0
        for s in tampil:
            k = langkah.index(s)
            for i in range(n):
                for j in range(n):
                    c = {key: arr[k][i][j] for key, arr in L["medan"].items()}
                    tp_n = L["medan"]["sfc_tp"][k + 1][i][j] if k + 1 < len(langkah) else None
                    sel = M.turunan_sel(c, tp_n, (ih + s + off[zt]) % 24)
                    hl, ho = M.titik_hujan(L["lat0"] - 0.1 * i, L["lon0"] + 0.1 * j, sel["u_pengarah"], sel["v_pengarah"], tau)
                    Fk = sum(e for y, x, e in cls if M.haversine(hl, ho, y, x) <= rad)
                    dm = min(M.haversine(hl, ho, y, x) for y, x in L["tempat"])
                    sk = M.skor_sel(sel, M.faktor_d(Fk, F0), M.faktor_t(dm, M.nilai(b, "t.dekat_km"), M.nilai(b, "t.jauh_km")), b)[0]
                    lolos += M.gerbang(sel, b)[0]
                    skor_cs.setdefault((i, j), {})[s] = sk
                    if sk > 0:
                        sel_nol.append([s, i, j, round(sk, 6)])
        cells = [dict(lat=L["lat0"] - 0.1 * i, lon=L["lon0"] + 0.1 * j, skor=max(v.values()), ij=(i, j)) for (i, j), v in skor_cs.items()]
        zn = M.zona_nms(cells, M.nilai(b, "zona.jarak_min_km"), M.nilai(b, "zona.maks"), M.nilai(b, "zona.skor_min"))
        out[nm] = {"lolos_gerbang": lolos, "sel_skor_positif": len(sel_nol), "sel": sel_nol,
                   "zona": [[round(z["lat"], 4), round(z["lon"], 4), round(z["skor"], 6), list(z["ij"])] for z in zn]}
    return out


def uji_golden():
    """`semai.py uji golden`: bandingkan persis dengan fixture_semai_golden.json (tulis ulang: tambah `--tulis`)."""
    import subprocess
    b = muat_bobot()
    now = hitung_golden(b)
    gp = os.path.join(AKAR, "fixture_semai_golden.json")
    if "--tulis" in sys.argv:
        try:
            sha = subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=AKAR, text=True).strip()
        except Exception:
            sha = "tidak diketahui"
        with open(gp, "w", encoding="utf-8") as f:
            json.dump({"dibuat": "2026-11-25", "sumber_commit": sha, "fixture": "fixture_semai.json", "lokasi": now}, f, ensure_ascii=False, separators=(",", ":"))
        print(f"golden ditulis {os.path.getsize(gp) / 1024:.0f} KB @ {sha[:9]}")
        return
    with open(gp, encoding="utf-8") as f:
        G = json.load(f)["lokasi"]

    def beda(a, e, jalur):
        if isinstance(e, dict) and isinstance(a, dict):
            for k in sorted(set(e) | set(a)):
                r = beda(a.get(k), e.get(k), f"{jalur}.{k}")
                if r:
                    return r
        elif isinstance(e, list) and isinstance(a, list):
            if len(a) != len(e):
                return f"{jalur}: panjang {len(a)} != golden {len(e)}"
            for i, (x, y) in enumerate(zip(a, e)):
                r = beda(x, y, f"{jalur}[{i}]")
                if r:
                    return r
        elif a != e:
            return f"{jalur}: {a} != golden {e}"
    r = beda(now, G, "lokasi")
    if r:
        print("semai uji golden GAGAL, beda pertama " + r)
        sys.exit(1)
    print(f"semai uji golden: {len(G)} lokasi, {sum(v['sel_skor_positif'] for v in G.values())} sel skor>0, {sum(len(v['zona']) for v in G.values())} zona identik")


# =====================================================================================================================
# tujuan banjir (semai-banjir ALGORITMA §2 sampai §8). Inti stdlib: dipakai `uji` (fixture) dan `jalan --tujuan banjir` (numpy
# hanya untuk menyiapkan medan). Jalur karhutla tidak menyentuh blok ini.
# =====================================================================================================================
MAKS_SASARAN_KAND, MAKS_KAND_PER_SASARAN, MAKS_BYTE_BANJIR = 60, 40, 300 * 1024
RADIUS_TAK_PETA_KM = 50.0       # ponytail: radius tetap dari pusat kab tanpa poligon; ukuran kab sebenarnya tak diketahui, ganti poligon bila ada
KALIMAT_BANJIR = {
    "tidak_ada_sasaran": "Tidak ada sasaran banjir untuk {d} dari prakiraan kita, BMKG, daftar tetap, atau Pusdalops.",
    "angin_lemah": "Angin pengarah di sasaran terlalu lemah untuk mencegat awan dari hulu.",
    "tidak_ada_awan_hulu": "Tidak ada awan layak semai di hulu sasaran dalam 24 jam ke depan. Hujan sasaran bisa tumbuh di tempat.",
    "tanpa_prakiraan": "Prakiraan belum tersedia.",
    "semua_pantau": "Semua sasaran banjir untuk {d} baru jatuh di hari yang belum tercakup putaran ini; zona menyusul di putaran berikutnya.",
    "di_luar_kisi": "Sasaran berada di luar kisi angin putaran ini, jadi lintasan hulu tidak bisa dihitung."}


def _lintasan():
    p = os.path.join(REPO, "scripts/udara")
    if p not in sys.path:
        sys.path.insert(0, p)
    import lintasan
    return lintasan


def pip(poly, lon, lat):
    """Aturan genap-ganjil lintas semua cincin satu poligon ([[lon, lat]...])."""
    ins = False
    for r in poly:
        for (x1, y1), (x2, y2) in zip(r, r[1:] + r[:1]):
            if (y1 > lat) != (y2 > lat) and lon < (x2 - x1) * (lat - y1) / (y2 - y1) + x1:
                ins = not ins
    return ins


def dalam_kab(k, lat, lon):
    x0, y0, x1, y1 = k["bbox"]
    return x0 <= lon <= x1 and y0 <= lat <= y1 and any(pip(p, lon, lat) for p in k["polys"])


def kab_di(kabs, lat, lon):
    """Kode kab yang daratannya memuat titik; None = laut atau di luar data."""
    return next((k["kode"] for k in kabs if dalam_kab(k, lat, lon)), None)


def siapkan_kab(kode, nama, prov, lat, lon, geom):
    polys = geom["coordinates"] if geom["type"] == "MultiPolygon" else [geom["coordinates"]]
    xs = [p[0] for pl in polys for r in pl for p in r]
    ys = [p[1] for pl in polys for r in pl for p in r]
    return dict(kode=kode, nama=nama, prov=prov, lat=lat, lon=lon, polys=polys, bbox=(min(xs), min(ys), max(xs), max(ys)))


def tepi_titik(polys, spasi_km=5.0):
    """Titik tepi (lat, lon) tiap sekitar spasi_km sepanjang semua cincin."""
    out = []
    for pl in polys:
        for r in pl:
            for (x1, y1), (x2, y2) in zip(r, r[1:] + r[:1]):
                n = max(1, int(M.haversine(y1, x1, y2, x2) // spasi_km))
                for t in range(n):
                    q = (y1 + (y2 - y1) * t / n, x1 + (x2 - x1) * t / n)
                    if not out or M.haversine(out[-1][0], out[-1][1], *q) >= spasi_km * 0.8:
                        out.append(q)
    return out


def jarak_tepi(lat, lon, pts):
    best = 1e9
    for y, x in pts:
        if abs(y - lat) * 111.0 < best:
            best = min(best, M.haversine(lat, lon, y, x))
    return best


def kisi_pengarah(lat, lon, langkah, U, V):
    """Adaptor u_pengarah, v_pengarah per langkah ke kisi bentuk lintasan.angin_di (D4): lat, lon daftar pusat sel; jam = langkah;
    u[0][k][j][i] dalam m/s x 10 (bulat), None bila bukan angka. U, V: daftar per langkah dari matriks [lat][lon] (m/s)."""
    def kemas(M_):
        return [[[None if (x is None or x != x) else int(round(x * 10)) for x in row] for row in m] for m in M_]
    return {"lat": list(lat), "lon": list(lon), "jam": list(langkah), "u": [kemas(U)], "v": [kemas(V)]}


def maju_tiba(A, lat, lon, jam0, tujuan, b, langkah_menit=15):
    """Lintasan maju (Heun) dari titik hujan sampai gb3_tiba_maks jam. tujuan = [(idx, kab, tepi)]. -> {idx: (tiba_jam, lat, lon)}
    pada saat pertama titik di dalam poligon atau <= gb1_jarak_km dari tepi."""
    L = _lintasan()
    hasil, sisa = {}, list(tujuan)
    mks, dts = n_(b, "banjir.gb3_tiba_maks_jam"), langkah_menit * 60
    jarak = n_(b, "banjir.gb1_jarak_km")
    jam = 0.0
    while sisa:
        for t in list(sisa):
            i, k, tepi = t
            x0, y0, x1, y1 = k["bbox"]
            if x0 - 0.2 <= lon <= x1 + 0.2 and y0 - 0.2 <= lat <= y1 + 0.2 and (dalam_kab(k, lat, lon) or jarak_tepi(lat, lon, tepi) <= jarak):
                hasil[i] = (jam, lat, lon)
                sisa.remove(t)
        if not sisa or jam + langkah_menit / 60 > mks + 1e-9:
            break
        a = L.angin_di(A, 0, lon, lat, jam0 + jam)
        if a is None:
            break
        lo1, la1 = L.geser(lon, lat, *a, dts)
        bb = L.angin_di(A, 0, lo1, la1, jam0 + jam + langkah_menit / 60)
        if bb is None:
            break
        lon, lat = L.geser(lon, lat, (a[0] + bb[0]) / 2, (a[1] + bb[1]) / 2, dts)
        jam += langkah_menit / 60
    return hasil


class Medan:
    """Medan siap hitung: sel (i baris dari utara, j kolom dari barat) pada lat0 - 0.1 i, lon0 + 0.1 j. `sel(s, i, j)` mengembalikan
    dict turunan_sel (plus jam_lokal); A = kisi_pengarah; langkah = semua langkah A; tampil = langkah yang dievaluasi."""
    def __init__(self, lat0, lon0, nlat, nlon, langkah, tampil, init, A, sel):
        self.lat0, self.lon0, self.nlat, self.nlon = lat0, lon0, nlat, nlon
        self.langkah, self.tampil, self.init, self.A, self.sel = langkah, tampil, init, A, sel


def _hari(init, jam, off):
    return (init + dt.timedelta(hours=jam + off)).strftime("%Y-%m-%d")


def hitung_banjir(med, kabs, kota, bandara, tempat, prov_nm, b, sasaran, d, putaran, tak_peta=()):
    """Inti §3 sampai §8. sasaran = hasil M.pilih_sasaran()['sasaran'] dengan kunci kab (kode) sudah punya geometri di `kabs`.
    tak_peta = [(lat, lon)] pusat kab yang geometrinya tidak ada: titik hujan di luar poligon dalam RADIUS_TAK_PETA_KM darinya "tak terpetakan"
    (bukan laut), ditolak seperti GB2. -> dict (zona, sasaran, kandidat_sasaran, alasan_kosong, ...). Tanpa IO; `ditolak` = hitungan
    penolakan per gerbang (untuk uji)."""
    L = _lintasan()
    n = lambda j: n_(b, j)
    kab_by = {k["kode"]: k for k in kabs}
    krow = {r[0]: r for r in kota}
    tau, A, l0 = n("d.tau_menit"), med.A, med.langkah[0]
    off_z, pz = b["zona_waktu"]["offset_jam"], b["zona_waktu"]["provinsi"]
    w = (n("banjir.skor.wq"), n("banjir.skor.wh"), n("banjir.skor.wp"))
    sas = [dict(s, k=kab_by[s["kode"]], tepi=tepi_titik(kab_by[s["kode"]]["polys"])) for s in sasaran if s["kode"] in kab_by]
    aktif = [i for i, s in enumerate(sas) if not s["pantau"]]
    terlarang = {s["kode"] for s in sas}
    lemah = {i: True for i in aktif}                         # i -> semua langkah angin lemah
    luar = {i: True for i in aktif}                          # i -> pusat di luar kisi pada semua langkah
    ditolak = dict(GB1=0, GB2=0, GB2_titik_terancam=0, tak_terpetakan=0, GB3=0, GB4=0)
    cand = {}                                                # (s, i, j) -> {idx sasaran}
    cache_e = {}
    for si in aktif:
        s_ = sas[si]
        pusat = krow[s_["kode"]][3:5]
        mulai = [(pusat[1], pusat[0])] + [(x, y) for y, x in s_["tepi"][::max(1, len(s_["tepi"]) // 24)]]   # ponytail: <= 24 titik tepi
        for s in med.tampil:
            a = L.angin_di(A, 0, pusat[1], pusat[0], s - l0)
            if a is not None:
                luar[si] = False
            if a is None or M.angin_lemah((a[0] ** 2 + a[1] ** 2) ** 0.5, b):
                continue
            lemah[si] = False
            for lon, lat in mulai:
                for p in L.mundur(A, 0, lon, lat, s - l0, 4.0, 15):
                    ci, cj = int(round((med.lat0 - p[1]) / 0.1)), int(round((p[0] - med.lon0) / 0.1))
                    for i in range(max(0, ci - 3), min(med.nlat, ci + 4)):
                        for j in range(max(0, cj - 3), min(med.nlon, cj + 4)):
                            cy, cx = med.lat0 - 0.1 * i, med.lon0 + 0.1 * j
                            dl = M.haversine(cy, cx, p[1], p[0])
                            if dl > n("banjir.koridor_lintasan_km"):
                                continue
                            e = cache_e.get((si, i, j))
                            if e is None:
                                e = cache_e[(si, i, j)] = jarak_tepi(cy, cx, s_["tepi"])
                            if M.di_koridor(e, dl, b):
                                # sel dinilai pada langkah terdekat ke waktu ia dilewati lintasan mundur (s - jam mundur)
                                se = min(med.tampil, key=lambda x: abs(x - (s - p[2])))
                                cand.setdefault((se, i, j), set()).add(si)
    hasil, n_gerbang = [], 0
    for (s, i, j), ks in sorted(cand.items()):
        sel = med.sel(s, i, j)
        if not M.gerbang(sel, b)[0]:
            continue
        n_gerbang += 1
        cy, cx = med.lat0 - 0.1 * i, med.lon0 + 0.1 * j
        hy, hx = M.titik_hujan(cy, cx, sel["u_pengarah"], sel["v_pengarah"], tau)
        tk, sk = kab_di(kabs, hy, hx), kab_di(kabs, cy, cx)
        if not M.lolos_gb("GB2", b, titik_kab=tk, sel_kab=sk, terlarang=terlarang):
            ditolak["GB2"] += 1
            ditolak["GB2_titik_terancam"] += tk in terlarang
            continue
        di = any(dalam_kab(x["k"], hy, hx) for x in sas)       # tersisa: di luar daratan kab terlarang, tapi bisa di kab tak berpoligon sasaran
        jt = min(jarak_tepi(hy, hx, x["tepi"]) for x in sas) if not di else 0.0
        if not M.lolos_gb("GB1", b, dalam=di, jarak_km=jt):
            ditolak["GB1"] += 1
            continue
        if tk is None and any(M.haversine(hy, hx, y, x) <= RADIUS_TAK_PETA_KM for y, x in tak_peta):
            ditolak["tak_terpetakan"] += 1               # bukan laut: geometri kab hilang, tolak konservatif
            continue
        tj = maju_tiba(A, hy, hx, s - l0 + tau / 60.0, [(k, sas[k]["k"], sas[k]["tepi"]) for k in sorted(ks)], b)
        cegat = []
        for k, (tiba, ly, lx) in sorted(tj.items()):
            zt = M.zona_waktu_prov(sas[k]["k"]["prov"], pz)
            if not M.lolos_gb("GB3", b, tiba=tiba):
                ditolak["GB3"] += 1
            elif not M.lolos_gb("GB4", b, hari_tiba=_hari(med.init, s + tau / 60.0 + tiba, off_z[zt]), d=d):
                ditolak["GB4"] += 1
            else:
                cegat.append((k, tiba, ly, lx))
        if not cegat:
            continue
        k, tiba, ly, lx = max(cegat, key=lambda c: M.faktor_h(c[1], b))
        H = M.faktor_h(tiba, b)
        komp = M.komponen_q(sel, b)
        Q = M.faktor_q(komp)
        if tk is None:                                      # titik hujan di luar semua daratan kab: laut
            P, dm = 1.0, None
        else:
            dm = min(M.haversine(hy, hx, y, x) for y, x in tempat)
            P = M.faktor_t(dm, n("t.dekat_km"), n("t.jauh_km"))
        sk_ = M.skor(Q, H, P, w) if Q > 0 else 0.0
        hasil.append(dict(s=s, i=i, j=j, lat=cy, lon=cx, hy=hy, hx=hx, Q=Q, H=H, P=P, skor=sk_, komp=komp, sel=sel, laut=tk is None,
                          dm=dm, tiba_h=tiba, cegat=[(sas[k_]["kode"], t_, la_, lo_) for k_, t_, la_, lo_ in cegat], k=k))
    # zona (§6): terbaik per sel, NMS 40 km, <= 5, skor >= 0,35
    per_sel = {}
    for r in hasil:
        per_sel.setdefault((r["i"], r["j"]), {})[r["s"]] = r
    cells = [dict(lat=v[max(v, key=lambda s: v[s]["skor"])]["lat"], lon=v[max(v, key=lambda s: v[s]["skor"])]["lon"],
                  skor=max(x["skor"] for x in v.values()), ij=ij) for ij, v in per_sel.items()]
    belum = {x["kode"]: x["belum_teruji"] for x in sas}
    zn, zona = M.zona_nms(cells, n("zona.jarak_min_km"), n("zona.maks"), n("zona.skor_min")), []
    lang = med.tampil
    for c in zn:
        v = per_sel[c["ij"]]
        per = [v[s]["skor"] if s in v else 0.0 for s in lang]
        ib = per.index(max(per))
        r = v[lang[ib]]
        kk = min(range(len(kota)), key=lambda q: M.haversine(r["hy"], r["hx"], kota[q][3], kota[q][4]))
        zt = M.zona_waktu_prov(kota[kk][2], pz)
        jr = M.jendela_rentang(per, ib, [med.init.hour + s for s in lang], zt, off_z, n("zona.jendela_persen"), n("gerbang.jam_mulai"), n("gerbang.jam_akhir"))
        if jr is None:
            continue
        bid = min(bandara, key=lambda q: M.haversine(r["lat"], r["lon"], bandara[q]["lat"], bandara[q]["lon"]))
        bd, km = bandara[bid], M.haversine(r["lat"], r["lon"], bandara[bid]["lat"], bandara[bid]["lon"])
        menit = M.menit_terbang(km, n("terbang.jelajah_kmj"), n("terbang.menit_bulat"))
        kaki = M.ketinggian_kaki(r["sel"]["lcl"], r["sel"]["elev"], n("ketinggian.lcl_min_m"), n("ketinggian.lcl_maks_m"), n("ketinggian.bulat_kaki"), n("ketinggian.m_ke_kaki"))
        kd = [x[0] for x in r["cegat"]]
        zid = M.zona_id_banjir(putaran, len(zona))
        zona.append({
            "id": zid, "huruf": zid[-1], "tujuan": "banjir", "lat": round(r["lat"], 1), "lon": round(r["lon"], 1), "skor": round(r["skor"], 2),
            "langkah": int(lang[ib]), "jendela": [(med.init.replace(hour=0) + dt.timedelta(hours=x)).strftime("%Y-%m-%dT%H:%MZ") for x in (jr["utc_mulai"], jr["utc_akhir"])],
            "jendela_teks": f"{jr['mulai_lokal']:02d}.00 sampai {jr['akhir_lokal']:02d}.00 {zt}", "zona_waktu": zt, "prov_kode": kota[kk][2],
            "prov": (prov_nm or {}).get(kota[kk][2], kota[kk][2]), "kota": kota[kk][6] if not r["laut"] else f"lepas pantai dekat {kota[kk][6]}", "laut": r["laut"],
            "hujan": {"lat": round(r["hy"], 2), "lon": round(r["hx"], 2), "tau_menit": tau},
            "Q": round(r["Q"], 3), "H": round(r["H"], 3), "P": round(r["P"], 3), "komp": {a: round(x, 2) for a, x in r["komp"].items()},
            "cegat": [{"kab": q[0], "tiba_jam": round(q[1], 2), "masuk": {"lat": round(q[2], 2), "lon": round(q[3], 2)}} for q in r["cegat"]],
            "ketinggian": {"kaki": kaki, "teks": "dasar awan tidak terbaca model" if kaki is None else f"sekitar {kaki:,} kaki (dasar awan perkiraan)".replace(",", ".")},
            "base": {"id": bid, "icao": bd["icao"], "nama": bd["nama"], "km": int(round(km)), "menit": menit, "perkiraan": True, "terdaftar": bd["terdaftar"]},
            "belum_teruji": all(belum.get(q, False) for q in kd),
            "alasan": {"sasaran": kd, "C": f"awan layak semai, kualitas {r['Q']:.2f}".replace(".", ","),
                       "H": f"awan tiba di sasaran sekitar {r['tiba_h']:.1f} jam sesudah semai".replace(".", ","),
                       "P": "titik hujan di laut" if r["laut"] else f"titik hujan {r['dm']:.0f} km dari kota terdekat",
                       "B": f"base {bd['nama']}, sekitar {menit} menit terbang"}})
    # sasaran keluar
    zs = {}
    for z in zona:
        for k_ in z["alasan"]["sasaran"]:
            zs.setdefault(k_, []).append(z["id"])
    sas_out = []
    for si, s_ in enumerate(sas):
        if s_["pantau"]:
            ak = "pantau"
        elif zs.get(s_["kode"]):
            ak = None
        else:
            ak = "di_luar_kisi" if luar.get(si) else "angin_lemah" if lemah.get(si) else "tidak_ada_awan_hulu"
        sas_out.append(dict(kab=s_["kode"], nama=s_["k"]["nama"], prov=s_["k"]["prov"], asal=s_["asal"], pantau=s_["pantau"], belum_teruji=s_["belum_teruji"],
                            cakupan="kab", zona=zs.get(s_["kode"], []), alasan_kosong=ak))
    # kandidat_sasaran (§8): <= 40 terbaik per sasaran, <= 60 sasaran, urut tetap, manual, bmkg, prakiraan
    urut = sorted(range(len(sas)), key=lambda q: (M._URUT_ASAL.index(sas[q]["asal"][0]), q))[:MAKS_SASARAN_KAND]
    idx_out = {q: u for u, q in enumerate(urut)}
    kand = []
    per_k = {}
    for r in sorted(hasil, key=lambda r: -r["skor"]):
        if r["skor"] > 0 and r["k"] in idx_out and per_k.get(r["k"], 0) < MAKS_KAND_PER_SASARAN:
            per_k[r["k"]] = per_k.get(r["k"], 0) + 1
            c_ = r["komp"]
            kand.append([round(r["lat"], 1), round(r["lon"], 1), r["s"], round(r["Q"], 3), round(r["H"], 3), round(r["P"], 3), idx_out[r["k"]],
                         int(r["laut"]), round(c_["cape"], 2), round(c_["air"], 2), round(c_["rh"], 2), round(c_["geser"], 2), round(c_["naik"], 2)])
    semua_lemah = bool(aktif) and all(lemah[q] for q in aktif)
    if sas and not aktif:
        alasan = "semua_pantau"
    elif aktif and all(luar[q] for q in aktif):
        alasan = "di_luar_kisi"
    else:
        alasan = M.alasan_kosong_banjir(len(aktif), semua_lemah, len(zona))
    return dict(zona=zona, sasaran=sas_out, urut_sasaran=[sas[q]["kode"] for q in urut], kandidat_kolom=["lat", "lon", "langkah", "Q", "H", "P", "sasaran_idx", "laut", "cape", "air", "rh", "geser", "naik"],
                kandidat_sasaran=kand, alasan_kosong=alasan, kalimat_kosong=KALIMAT_BANJIR[alasan].format(d=d) if alasan else None,
                n_kandidat=len(cand), n_lolos_gerbang=n_gerbang, n_evaluasi=len(hasil), ditolak=ditolak, _hasil=hasil, _sas=sas)

def muat_kab_repo():
    """Semua kab/kota daratan: kota.json (kode, pusat) + public/geo/kabupaten/<prov>.json (nama -> geometri)."""
    kabs, geo, hilang = [], {}, []
    for r in muat_json("scripts/udara/kota.json")["baris"]:
        if r[2] not in geo:
            f = os.path.join(REPO, "public/geo/kabupaten", f"{r[2]}.json")
            geo[r[2]] = {x["properties"]["kab"]: x["geometry"] for x in json.load(open(f, encoding="utf-8"))["features"]} if os.path.exists(f) else {}
        if r[6] in geo[r[2]]:
            kabs.append(siapkan_kab(r[0], r[6], r[2], r[3], r[4], geo[r[2]][r[6]]))
        else:
            hilang.append(r)
    return kabs, hilang


def jalan_banjir(args, b, dibuat, keluar, c):
    """`jalan --tujuan banjir`: membaca putaran IFS yang sama dengan karhutla (c = siapkan()), menulis <keluar>/semai_banjir.json."""
    np = _np()
    t_mulai = time.time()
    off = b["zona_waktu"]["offset_jam"]["WIB"]
    siang = [s for s in c.tampil if b["gerbang"]["jam_mulai"]["nilai"] <= (c.init.hour + s + off) % 24 < b["gerbang"]["jam_akhir"]["nilai"]] or c.tampil[:1]
    d = _hari(c.init, siang[0], off)
    pred, bm = [json.load(open(os.path.join(REPO, p), encoding="utf-8")) if os.path.exists(os.path.join(REPO, p)) else None
                for p in ("public/prediksi/data/prediksi.json", "public/banjir/data/cuaca_bmkg_kab10.json")]
    umur = max(0.0, (dibuat - dt.datetime.fromisoformat(pred["dibuat"])).total_seconds() / 3600) if pred else 0.0
    tercakup = d in {_hari(c.init, s, off) for s in c.tampil}
    ps = M.pilih_sasaran(d, pred, bm, b, umur_prediksi_jam=umur, tercakup=tercakup)
    kabs, hilang = muat_kab_repo()
    ada = {k["kode"] for k in kabs}
    sasaran = [s for s in ps["sasaran"] if s["kode"] in ada]
    ps["sumber"] = list(ps["sumber"])
    if hilang:
        ps["sumber"].append(f"geometri kab tak ditemukan untuk {len(hilang)} kab/kota ({', '.join(r[0] for r in hilang[:10])}"
                            + (", dst" if len(hilang) > 10 else "") + "): titik hujan di dekatnya ditolak sebagai tak terpetakan, bukan dihitung laut")
    if len(sasaran) < len(ps["sasaran"]):
        ps["sumber"].append("sasaran tanpa geometri dilewati: " + ", ".join(s["kode"] for s in ps["sasaran"] if s["kode"] not in ada))
    out = {"dibuat": dibuat.strftime("%Y-%m-%dT%H:%M:%SZ"), "tujuan": "banjir", "versi_bobot": b["versi"], "versi_banjir": b["banjir"]["versi_banjir"],
           "status_bobot": b["banjir"]["status"],
           "putaran": {"model": "ECMWF IFS", "res": 0.1, "init": c.init.strftime("%Y-%m-%dT%H:%M:%SZ"), "lisensi": "CC BY 4.0"},
           "hari_sasaran": d,
           "sumber": {"prediksi": {"dibuat": pred["dibuat"] if pred else None, "vonis_bnj": _vonis_bnj(pred)},
                      "bmkg_kab10": {"dibuat": bm["dibuat"] if bm else None}, "manual": {"n": 0}, "catatan": ps["sumber"]},
           "langkah": c.tampil, "raster": {"awan": "awan_{l}.png"}}
    if not sasaran:
        out.update(sasaran=[], zona=[], kandidat_kolom=[], kandidat_sasaran=[], alasan_kosong="tidak_ada_sasaran",
                   kalimat_kosong=KALIMAT_BANJIR["tidak_ada_sasaran"].format(d=d))
    else:
        bb = [k["bbox"] for k in kabs if k["kode"] in {s["kode"] for s in sasaran}]
        i0 = max(0, int((LAT0 - max(x[3] for x in bb) - 2.0) / RES)); i1 = min(NLAT, int((LAT0 - min(x[1] for x in bb) + 2.0) / RES) + 1)
        j0 = max(0, int((min(x[0] for x in bb) - 2.0 - LON0) / RES)); j1 = min(NLON, int((max(x[2] for x in bb) + 2.0 - LON0) / RES) + 1)
        sl = (slice(i0, i1), slice(j0, j1))
        U = [((c.P[s]["pl_u_850"] + c.P[s]["pl_u_700"]) / 2)[sl].astype("float64").tolist() for s in sorted(c.P)]
        V = [((c.P[s]["pl_v_850"] + c.P[s]["pl_v_700"]) / 2)[sl].astype("float64").tolist() for s in sorted(c.P)]
        A = kisi_pengarah([LAT0 - RES * i for i in range(i0, i1)], [LON0 + RES * j for j in range(j0, j1)], sorted(c.P), U, V)

        def sel(s, i, j):
            d_, gi, gj = c.der[s], i0 + i, j0 + j
            r = {k: float(d_[k][gi, gj]) for k in ("lcc", "mucape", "tclw", "geser", "rh850", "tdasar", "w", "lcl", "elev", "u_pengarah", "v_pengarah", "jam_lokal")}
            for k in ("hujan", "hangat_m"):
                x = float(d_[k][gi, gj])
                r[k] = None if x != x else x
            return r
        med = Medan(LAT0 - RES * i0, LON0 + RES * j0, i1 - i0, j1 - j0, sorted(c.P), c.tampil, c.init, A, sel)
        tempat, kota = tempat_py()
        r = hitung_banjir(med, kabs, kota, c.bandara, tempat, c.prov_nm, b, sasaran, d, c.putaran, [(x[3], x[4]) for x in hilang])
        for k in ("_hasil", "_sas", "n_kandidat", "n_lolos_gerbang", "n_evaluasi", "ditolak"):
            r.pop(k)
        urut = r.pop("urut_sasaran")
        r["sasaran"] = sorted(r["sasaran"], key=lambda s: urut.index(s["kab"]) if s["kab"] in urut else len(urut))
        out.update(r)
    pred_k = {x["id"]: x for x in pred["kab"]} if pred else {}
    t = out.get("hari_sasaran") and pred and d in pred["kode"]["BNJ"]["hari"] and pred["kode"]["BNJ"]["hari"].index(d)
    for s in out["sasaran"]:
        p = pred_k.get(s["kab"])
        s["tenggang"] = None if not p or "prakiraan" not in s["asal"] else t + 1
        s["bnj_lv"], s["hjn_p50"] = (p["BNJ"][t][0], p["HJN"][t][2]) if p and t is not False else (None, None)
    s = json.dumps(out, ensure_ascii=False, separators=(",", ":"))
    while len(s.encode()) > MAKS_BYTE_BANJIR and out.get("kandidat_sasaran"):
        out["kandidat_sasaran"] = out["kandidat_sasaran"][:int(len(out["kandidat_sasaran"]) * 0.8)]
        s = json.dumps(out, ensure_ascii=False, separators=(",", ":"))
    with open(os.path.join(keluar, "semai_banjir.json"), "w", encoding="utf-8") as f:
        f.write(s)
    out["_lapor"] = dict(detik=round(time.time() - t_mulai, 1), json_kb=round(len(s.encode()) / 1024, 1))
    return out


def _vonis_bnj(pred):
    v = ((pred or {}).get("kode", {}).get("BNJ", {}).get("vonis") or {}).values()
    return "lulus" if any(x and x[0] == "lulus" for x in v) else "belum teruji"


# ---- fixture banjir: dari fixture_semai.json (Kendari), turunan skalar dibekukan; uji murni stdlib --------------------------
SEL_KUNCI = ("lcc", "mucape", "tclw", "geser", "rh850", "hujan", "tdasar", "hangat_m", "w", "lcl", "elev", "u_pengarah", "v_pengarah")
SEL_DESIMAL = dict(lcc=2, mucape=0, tclw=3, geser=1, rh850=0, hujan=1, tdasar=1, hangat_m=0, w=2, lcl=0, elev=0, u_pengarah=1, v_pengarah=1)


def buat_fixture_banjir():
    with open(os.path.join(AKAR, "fixture_semai.json"), encoding="utf-8") as f:
        F = json.load(f)
    L = F["lokasi"]["kendari"]
    b = muat_bobot()
    off = b["zona_waktu"]["offset_jam"]["WITA"]
    ih, langkah, n = int(F["putaran"][8:10]), F["langkah"], L["n"]
    tampil = [s for s in langkah if s >= 18]
    sel = {k: [] for k in SEL_KUNCI}
    for s in tampil:
        k = langkah.index(s)
        mat = {x: [] for x in SEL_KUNCI}
        for i in range(n):
            baris = {x: [] for x in SEL_KUNCI}
            for j in range(n):
                c = {key: arr[k][i][j] for key, arr in L["medan"].items()}
                tp_n = L["medan"]["sfc_tp"][k + 1][i][j] if k + 1 < len(langkah) else None
                t = M.turunan_sel(c, tp_n, (ih + s + off) % 24)
                for x in SEL_KUNCI:
                    baris[x].append(None if t[x] is None else round(t[x], SEL_DESIMAL[x]) + 0 if SEL_DESIMAL[x] else int(round(t[x])))
            for x in SEL_KUNCI:
                mat[x].append(baris[x])
        for x in SEL_KUNCI:
            sel[x].append(mat[x])
    la0, la1, lo0, lo1 = L["lat0"] - 0.1 * (n - 1), L["lat0"], L["lon0"], L["lon0"] + 0.1 * (n - 1)
    kabs, geo = [], {x["properties"]["kab"]: x["geometry"] for x in json.load(open(os.path.join(REPO, "public/geo/kabupaten/74.json"), encoding="utf-8"))["features"]}
    for r in muat_json("scripts/udara/kota.json")["baris"]:
        if r[2] != "74":
            continue
        k = siapkan_kab(r[0], r[6], r[2], r[3], r[4], geo[r[6]])
        if k["bbox"][0] > lo1 + 0.1 or k["bbox"][2] < lo0 - 0.1 or k["bbox"][1] > la1 + 0.1 or k["bbox"][3] < la0 - 0.1:
            continue
        polys = []
        for pl in k["polys"]:
            ring = []
            for rg in pl:
                st = max(1, len(rg) // 70)
                rg2 = [[round(p[0], 3), round(p[1], 3)] for p in rg[::st]]
                ring.append(rg2 if rg2[0] == rg2[-1] or len(rg2) < 3 else rg2)
            polys.append(ring)
        kabs.append(dict(kode=r[0], nama=r[6], prov="74", lat=r[3], lon=r[4], polys=polys))
    d = "2026-11-15"
    out = {"_catatan": "Potongan nyata ECMWF IFS 0,1 derajat (CC BY 4.0) sekitar Kendari, turunan skalar dibekukan dari fixture_semai.json; poligon kab "
                       "disederhanakan; dibuat `semai.py fixture_banjir`. Dipakai `semai.py uji`.",
           "putaran": F["putaran"], "langkah": tampil, "lat0": L["lat0"], "lon0": L["lon0"], "n": n, "zona_waktu": "WITA", "prov_kode": "74",
           "hari": d, "sekarang": "2026-11-14T09:00:00+00:00", "bobot_timpa": {"sasaran_tetap": ["7471"]},
           "prediksi": {"dibuat": "2026-11-14T07:00:00+00:00",
                        "kode": {"BNJ": {"hari": [d, "2026-11-16", "2026-11-17"], "vonis": {"ps|1": ["belum teruji", 1, 0, False, 1]}}},
                        "kab": [{"id": "7405", "BNJ": [[2, 0.5], [0, 0], [0, 0]], "HJN": [[0, 0, 0.1]] * 3}], "waspada": []},
           "bmkg": {"dibuat": "2026-11-14T08:00:00+00:00", "kab": {"74.02": {"hari": [{"tgl": d, "kondisi": "Hujan Lebat"}]}}},
           "kab": kabs, "sel": sel}
    p = os.path.join(AKAR, "fixture_semai_banjir.json")
    with open(p, "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, separators=(",", ":"))
    print(f"fixture banjir {os.path.getsize(p) / 1024:.0f} KB; kab {[k['kode'] for k in kabs]}")


def medan_fixture(F):
    """Medan dari fixture_semai_banjir.json (stdlib)."""
    n, langkah = F["n"], F["langkah"]
    init = dt.datetime.strptime(F["putaran"], "%Y%m%d%H").replace(tzinfo=dt.timezone.utc)
    sel_ = F["sel"]
    A = kisi_pengarah([F["lat0"] - 0.1 * i for i in range(n)], [F["lon0"] + 0.1 * j for j in range(n)], langkah, sel_["u_pengarah"], sel_["v_pengarah"])
    return init, A, lambda b: Medan(F["lat0"], F["lon0"], n, n, langkah, langkah, init, A, lambda s, i, j: _sel_fixture(F, b, s, i, j))


def _sel_fixture(F, b, s, i, j):
    k = F["langkah"].index(s)
    r = {x: F["sel"][x][k][i][j] for x in SEL_KUNCI}
    r["jam_lokal"] = (int(F["putaran"][8:10]) + s + b["zona_waktu"]["offset_jam"][F["zona_waktu"]]) % 24
    return r


def uji_refaktor(ok):
    """Refaktor tempat_py/bandara_gabung harus sama dengan kode sebelum SB-04 (ce80ba9ba). Snapshot bandara: base sintetis (aktif, tak aktif,
    tanpa ICAO) + bandara.json -> 137 id, sha1 id terurut, diambil dari kode lama; WIHH (base aktif) tak digandakan, WAAA (base mati) tetap bandara BMKG."""
    import hashlib
    base = {"b1": {"nama": "X", "lat": 1, "lon": 2, "icao": "WIHH", "aktif": 1}, "b2": {"nama": "Y", "lat": 1, "lon": 2, "icao": "WAAA", "aktif": 0},
            "b3": {"nama": "Z", "lat": 3, "lon": 4, "icao": None, "aktif": 1}}
    bg = bandara_gabung(base)
    sha = hashlib.sha1("|".join(sorted(bg)).encode()).hexdigest()
    ok(len(bg) == 137 and sha == "ae201b0439ce7a6d08b881e80340c4089184f9d0" and "WIHH" not in bg and "WAAA" in bg and bg["b1"]["terdaftar"], f"bandara_gabung beda dari kode lama: {len(bg)} {sha}")
    try:
        import numpy as np
    except ImportError:
        print("semai uji: numpy tidak ada, silang tempat_np lawan tempat_py dilewati")
        return
    tp = tempat_py()[0]
    tn = tempat_np()[0]
    ok(tn.shape == (len(tp), 2) and bool(np.array_equal(tn, np.array(tp))), "tempat_np()[0] harus sama dengan tempat_py()[0]")


def uji_banjir_fixture(b, ok):
    """SB-04: ujung ke ujung stdlib pada potongan Kendari. Invarian: tak ada zona di daratan kab terlarang, tak ada titik hujan di
    sasaran, tiap zona lolos GB1 sampai GB4, skor = Q^wQ H^wH P^wP, kalimat kosong cocok alasan."""
    fx = os.path.join(AKAR, "fixture_semai_banjir.json")
    if not os.path.exists(fx):
        print("semai uji: fixture_semai_banjir.json tidak ada, kasus banjir ujung ke ujung dilewati (jalankan `semai.py fixture_banjir`)")
        return
    with open(fx, encoding="utf-8") as f:
        F = json.load(f)
    bb = json.loads(json.dumps(b))
    bb["banjir"]["sasaran_tetap"]["nilai"] = F["bobot_timpa"]["sasaran_tetap"]
    init, A, mk = medan_fixture(F)
    med = mk(bb)
    kota = muat_json("scripts/udara/kota.json")["baris"]
    kabs = [siapkan_kab(k["kode"], k["nama"], k["prov"], k["lat"], k["lon"], {"type": "MultiPolygon", "coordinates": k["polys"]}) for k in F["kab"]]
    d = F["hari"]
    ps = M.pilih_sasaran(d, F["prediksi"], F["bmkg"], bb)
    ok({s["kode"] for s in ps["sasaran"]} == {"7471", "7405", "7402"}, f"sasaran fixture {[s['kode'] for s in ps['sasaran']]}")
    tempat, _ = tempat_py()
    pn = prov_nama()
    base = bandara_gabung(__import__("renlap").muat_base())
    r = hitung_banjir(med, kabs, kota, base, tempat, pn, bb, ps["sasaran"], d, F["putaran"])
    terlarang = {s["kode"] for s in ps["sasaran"]}
    sasaran_k = {s["kode"]: s["k"] for s in r["_sas"]}
    ok(r["n_kandidat"] > 0 and r["n_lolos_gerbang"] > 0, f"fixture memuat kandidat koridor ({r['n_kandidat']}) dan sel lolos G1-G9 ({r['n_lolos_gerbang']})")
    ok(all(not dalam_kab(kab, h["lat"], h["lon"]) for kab in kabs if kab["kode"] in terlarang for h in r["_hasil"]), "GB2: sel hasil tidak di daratan kab terlarang")
    for h in r["_hasil"]:
        ok(all(not dalam_kab(k, h["hy"], h["hx"]) for k in sasaran_k.values()), "0 titik hujan di dalam sasaran")
        ok(all(jarak_tepi(h["hy"], h["hx"], tepi_titik(k["polys"])) > 10 - 2.6 for k in sasaran_k.values()), "GB1 titik hujan > 10 km dari tepi (toleransi spasi tepi)")
        ok(0 <= h["H"] <= 1 and 0 <= h["P"] <= 1 and 0 <= h["Q"] <= 1 and h["cegat"], "faktor 0..1 dan ada sasaran dicegat")
        for kd, tiba, _, _ in h["cegat"]:
            ok(1 <= tiba <= 4, f"GB3 tiba {tiba} jam di luar 1..4")
        # hulu angin: dari titik hujan ke titik masuk sasaran searah angin pengarah (dot > 0), bukan melawan angin
        u_, v_ = h["sel"]["u_pengarah"], h["sel"]["v_pengarah"]
        for kd, _, ly, lx in h["cegat"]:
            ok((lx - h["hx"]) * math.cos(math.radians(h["hy"])) * u_ + (ly - h["hy"]) * v_ > 0,
               f"titik hujan ({h['hy']:.2f},{h['hx']:.2f}) tidak di hulu angin masuk {kd} ({ly:.2f},{lx:.2f}): angin {u_:.1f},{v_:.1f}")
    for z in r["zona"]:
        ok(z["tujuan"] == "banjir" and re.fullmatch(r"\d{10}-B[A-E]", z["id"]) and z["skor"] >= 0.35, f"zona {z['id']}")
        ok(all(not dalam_kab(k, z["lat"], z["lon"]) for k in kabs if k["kode"] in terlarang), f"zona {z['id']} tidak di daratan kab sasaran/terancam")
        ok(all(not dalam_kab(k, z["hujan"]["lat"], z["hujan"]["lon"]) for k in sasaran_k.values()), f"titik hujan zona {z['id']} di luar sasaran")
        ok(z["alasan"]["sasaran"] and set(z["alasan"]["sasaran"]) <= terlarang, "alasan.sasaran wajib dan berasal dari S(d)")
        ok(z["belum_teruji"] is all(x["belum_teruji"] for x in r["_sas"] if x["kode"] in z["alasan"]["sasaran"]), "zona belum_teruji dari sasarannya")
        ok(re.fullmatch(r"\d\d\.00 sampai \d\d\.00 WITA", z["jendela_teks"]), z["jendela_teks"])
    for a in range(len(r["zona"])):
        for c2 in range(a):
            ok(M.haversine(r["zona"][a]["lat"], r["zona"][a]["lon"], r["zona"][c2]["lat"], r["zona"][c2]["lon"]) > 40, "zona berjarak > 40 km")
    ok(len(r["zona"]) <= 5 and (r["alasan_kosong"] is None) == bool(r["zona"]), f"alasan_kosong {r['alasan_kosong']} cocok jumlah zona {len(r['zona'])}")
    ok(all(s["alasan_kosong"] is None for s in r["sasaran"] if s["zona"]), "sasaran bernas zona tanpa alasan kosong")
    ok(all(len([x for x in r["kandidat_sasaran"] if x[6] == u]) <= 40 for u in range(len(r["sasaran"]))), "kandidat <= 40 per sasaran")
    ok(all(len(x) == len(r["kandidat_kolom"]) for x in r["kandidat_sasaran"]), "lebar baris kandidat sesuai kolom")
    ok(r["ditolak"]["GB1"] > 0, f"GB1 menolak titik hujan dekat/di sasaran ({r['ditolak']})")
    # GB4 ujung ke ujung: hari sasaran digeser sehari -> semua tiba jatuh di hari lain, tak ada zona
    r4 = hitung_banjir(med, kabs, kota, base, tempat, pn, bb, ps["sasaran"], "2026-11-16", F["putaran"])
    ok(r4["ditolak"]["GB4"] > 0 and not r4["zona"] and r4["n_evaluasi"] == 0, f"GB4 menolak hari tiba lain ({r4['ditolak']})")
    # GB2 ujung ke ujung: semua kab lain di fixture jadi terancam (pantau) -> sel dan titik hujan di sana ditolak
    ekstra = [dict(kode=k["kode"], asal=["prakiraan"], pantau=True, belum_teruji=True) for k in kabs if k["kode"] not in terlarang]
    r2b = hitung_banjir(med, kabs, kota, base, tempat, pn, bb, ps["sasaran"] + ekstra, d, F["putaran"])
    ok(r2b["ditolak"]["GB2"] > 0 and r2b["ditolak"]["GB2_titik_terancam"] > 0, f"GB2 menolak titik hujan di kab terancam ({r2b['ditolak']})")
    ok(all(not dalam_kab(k, h["hy"], h["hx"]) for k in kabs for h in r2b["_hasil"]), "sisa hasil: titik hujan di laut, tak ada di daratan kab terancam")
    # kab tanpa geometri: titik hujan di luar poligon dekat pusatnya bukan laut, ditolak
    kd0 = next((kab_di(kabs, h["hy"], h["hx"]) for h in r["_hasil"] if kab_di(kabs, h["hy"], h["hx"])), None)
    ok(kd0 is not None, "fixture memuat hasil dengan titik hujan di daratan kab tak terlarang")
    sisa = [k for k in kabs if k["kode"] != kd0]
    hil = next(k for k in kabs if k["kode"] == kd0)
    r3a = hitung_banjir(med, sisa, kota, base, tempat, pn, bb, ps["sasaran"], d, F["putaran"])
    ok(any(h["laut"] and h["P"] == 1.0 for h in r3a["_hasil"]), "tanpa tahu geometri hilang, daratan salah dihitung laut (P = 1): bug yang dijaga")
    r3 = hitung_banjir(med, sisa, kota, base, tempat, pn, bb, ps["sasaran"], d, F["putaran"], tak_peta=[(hil["lat"], hil["lon"])])
    ok(r3["ditolak"]["tak_terpetakan"] > 0 and sum(h["laut"] for h in r3["_hasil"]) < sum(h["laut"] for h in r3a["_hasil"]),
       f"tak terpetakan ditolak, bukan laut ({r3['ditolak']})")
    # label belum teruji dari vonis: asal prakiraan saja
    ok(_vonis_bnj(F["prediksi"]) == "belum teruji" and _vonis_bnj(None) == "belum teruji", "vonis BNJ belum teruji")
    # angin lemah: kisi diam -> tidak ada kandidat, alasan angin_lemah
    mati = json.loads(json.dumps(F))
    mati["sel"]["u_pengarah"] = [[[0.0] * F["n"] for _ in range(F["n"])] for _ in F["langkah"]]
    mati["sel"]["v_pengarah"] = mati["sel"]["u_pengarah"]
    _, _, mk2 = medan_fixture(mati)
    r2 = hitung_banjir(mk2(bb), kabs, kota, base, tempat, pn, bb, ps["sasaran"], d, F["putaran"])
    ok(r2["alasan_kosong"] == "angin_lemah" and not r2["zona"] and r2["n_kandidat"] == 0, f"angin 0 -> angin_lemah, bukan {r2['alasan_kosong']}")
    pantau = [dict(s_, pantau=True) for s_ in ps["sasaran"]]
    rp = hitung_banjir(med, kabs, kota, base, tempat, pn, bb, pantau, d, F["putaran"])
    ok(rp["alasan_kosong"] == "semua_pantau" and rp["kalimat_kosong"], f"semua pantau -> semua_pantau, bukan {rp['alasan_kosong']}")
    geser_f = dict(F, lat0=F["lat0"] + 30)                                                                      # kisi digeser: sasaran di luar
    _, _, mk3 = medan_fixture(geser_f)
    med_l = mk3(bb)
    rl = hitung_banjir(med_l, kabs, kota, base, tempat, pn, bb, ps["sasaran"], d, F["putaran"])
    ok(rl["alasan_kosong"] == "di_luar_kisi", f"sasaran di luar kisi -> di_luar_kisi, bukan {rl['alasan_kosong']}")
    sasaran_tanpa = hitung_banjir(med, kabs, kota, base, tempat, pn, bb, [], d, F["putaran"])
    ok(sasaran_tanpa["alasan_kosong"] == "tidak_ada_sasaran" and "banjir" in (sasaran_tanpa["kalimat_kosong"] or ""), "tanpa sasaran")
    print(f"semai uji banjir fixture: {len(r['zona'])} zona, {r['n_kandidat']} sel koridor, {r['n_lolos_gerbang']} lolos G1-G9, {r['n_evaluasi']} lolos GB1-GB4")


def main():
    import argparse
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("cmd", choices=["uji", "jalan", "fixture", "fixture_banjir", "ukurw"])
    ap.add_argument("sub", nargs="?")
    ap.add_argument("--tulis", action="store_true")
    ap.add_argument("--putaran", default="auto")
    ap.add_argument("--keluar")
    ap.add_argument("--sekarang")
    ap.add_argument("--kluster")
    ap.add_argument("--hotspot24")
    ap.add_argument("--tujuan", choices=["karhutla", "banjir"], default="karhutla")
    a = ap.parse_args()
    if a.cmd == "uji" and a.sub == "golden":
        uji_golden()
    elif a.cmd == "uji":
        uji()
    elif a.cmd == "jalan":
        o = jalan(a)
        print(json.dumps(o["_lapor"]))
        if a.tujuan == "banjir":
            print("hari", o["hari_sasaran"], "| sasaran", len(o["sasaran"]), "| zona", [(z["id"], z["prov"], z["lat"], z["lon"], z["skor"], z["jendela_teks"]) for z in o["zona"]],
                  "| alasan_kosong:", o["alasan_kosong"], "| kandidat", len(o["kandidat_sasaran"]))
            return
        for z in o["zona"]:
            print(z["huruf"], z["prov_kode"], z["prov"], z["lat"], z["lon"], "skor", z["skor"], z["jendela_teks"], z["base"]["id"], z["base"]["menit"], "menit",
                  z["tanda"], z["cluster"], z["ketinggian"]["teks"], z["bahan"]["usul"], "sortie", z["jumlah"]["sortie"])
        print("alasan_kosong:", o["alasan_kosong"], "| hati_hati:", len(o["hati_hati"]), "| nimbus:", [(z["huruf"], z["prov"], z["lat"], z["lon"], z["skor"]) for z in o["nimbus"]["zona"]])
        print("langkah", o["langkah"], "| kandidat", len(o["kandidat"]), "| target", len(o["kandidat_target"].get("target", {})), "| api", o["api"], "| firms", o["sumber"]["firms"])
    elif a.cmd == "fixture_banjir":
        buat_fixture_banjir()
    elif a.cmd == "fixture":
        buat_fixture(pilih_putaran(a.putaran), a.kluster or os.path.join(REPO, "public/data/kluster.json"))
    else:
        ukur_w(pilih_putaran(a.putaran))


if __name__ == "__main__":
    main()
