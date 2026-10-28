"""Estimasi kebakaran gambut bawah permukaan (bara) per kompleks: E = A x D x BD x CC x EF.

Fungsi murni, tanpa jaringan. Dipanggil harian.py untuk kompleks gambut level >= 2.
Semua variabel berupa skenario rendah/tengah/atas (tinggi), dikombinasi ujung-ke-ujung (rendah x rendah, tinggi x tinggi);
bukan selang kepercayaan. ESTIMASI, belum divalidasi lapangan.

Self-check:  python3 scripts/data/gambut_bara.py
"""
PIKSEL_HA = 14.0625             # garis_api.PIKSEL_HA (sel ~375 m); diulang agar modul ini berdiri sendiri
FRAKSI_TERBAKAR = (0.10, 0.30, 1.00)   # ASUMSI: porsi jejak piksel gambut yang benar-benar terbakar (tidak diketahui)
D_BAWAH, D_ATAS = 15.0, 51.0    # cm. 15 = rata-rata - SD Ballhorn dkk. 2009 PNAS (33 +- 18 cm); 51 = rata-rata Page dkk. 2002 Nature
# (riset 28 Okt 2026: 33 +- 18 cm terverifikasi di abstrak PNAS doi:10.1073/pnas.0906457106; angka 51 cm Page 2002 BELUM terbaca di teks, sumber
#  sekunder menyebut "lebih dari 0,5 m"; Simpson dkk. 2016 Jambi 23 +- 19 cm; Konecny dkk. 2016: kebakaran berulang makin dangkal)
BD = (0.07, 0.10, 0.15)         # t/m3. ASUMSI: kisaran umum gambut tropis
CC = 1.0                        # ASUMSI: kerangka kedalaman terbakar
KAL_N = None                    # n insiden bila D_BAWAH/D_ATAS dikalibrasi (pasang_kalibrasi); None = bawaan literatur
# t gas per t bahan kering (= g/kg). CO2 & CH4 sama dengan dampak.py (IPCC 2013 Wetlands Supp. Bab 2, tanah organik tropis);
# CO 0,210: IPCC 2013 Wetlands Supplement Tabel 2.7 (belum diverifikasi ke dokumen asli).
EF = {"co2": 1.703, "ch4": 0.021, "co": 0.210}

CATATAN = {
    "a": "Luas terbakar = jumlah sel unik ~375 m berdeteksi di peta gambut x 14,06 ha, dibatasi luas kompleks. Fraksi yang benar-benar terbakar tidak diketahui: rendah 10%, tengah 30%, tinggi 100% dari jejak (ASUMSI). Bergantung pada ukuran kisi sel; bukan luas terbakar terukur.",
    "d": "Kedalaman terbakar 15-51 cm: 15 = rata-rata - SD Ballhorn dkk. 2009 PNAS, 51 = rata-rata Page dkk. 2002 Nature (angka 51 cm belum dicek ke teks lengkap). Skenario tengah = 15 + 36 x indeks persistensi (interpolasi ini ASUMSI). Dipotong ke kedalaman muka air proxy bila ada (api tidak membakar di bawah muka air).",
    "fb": "Indeks persistensi = porsi sel 750 m di gambut yang terdeteksi pada >= 2 tanggal WIB berbeda DAN setidaknya sekali pada malam hari (18.00-06.00 WIB). "
          "Syarat malam: bara bersuhu rendah lebih mudah dibedakan tanpa pantulan matahari, dan deteksi VIIRS malam lebih cocok dengan Landsat di gambut Kalteng "
          "(Sofan dkk. 2019, Remote Sensing 11:465; Elvidge dkk. 2013, Remote Sensing 5:4423). Titik VIIRS keyakinan rendah di piksel 375 m yang sama ikut menambah "
          "tanggal dan malam (Tansey dkk. 2008: memasukkan keyakinan rendah memperbaiki deteksi di gambut). ASUMSI bahwa persistensi menandakan bara: "
          "belum ada ambang persistensi yang tervalidasi di literatur; bukan ukuran bara.",
    "wt": "Muka air = proxy PFVI dari hujan dan ET0 (sel 0,5 derajat terdekat yang punya nilai, radius 1 derajat, keadaan H-2), bukan pengukuran. Bila tidak ada muka air, kedalaman tidak dipotong sehingga skenario tinggi cenderung tinggi.",
    "bd": "Kerapatan gambut 0,07 / 0,10 / 0,15 t/m3 (ASUMSI: kisaran umum gambut tropis).",
    "cc": "CC = 1,0 (ASUMSI, kerangka kedalaman terbakar).",
    "ef": "g/kg bahan kering: CO2 1.703, CH4 21,0 (IPCC 2013 Wetlands Supplement Bab 2, tanah organik tropis; sama dengan dampak.py), CO 210 (IPCC 2013 Wetlands Supplement Tabel 2.7, belum diverifikasi ke dokumen asli).",
    "rentang": "Skenario rendah/tengah/tinggi dikombinasi ujung-ke-ujung (rendah x rendah, tinggi x tinggi); bukan selang kepercayaan.",
    "banding": "Perkiraan lokal per cluster, bukan tambahan dari estimasi emisi nasional (dampak.py); jangan dijumlahkan.",
    "status": "Estimasi, belum divalidasi lapangan; muka air = proxy, bukan pengukuran; MCE tidak dihitung: tidak ada ukuran CO2 sebanding pada kolom asap dari satelit.",
}


def pasang_kalibrasi(kal=None, n_min=10):
    """Ganti D_BAWAH/D_ATAS dengan p10/p90 kedalaman_bara_cm isian lapangan kelas gambut bila n >= n_min (kalibrasi.py). Dipanggil harian.main dan taktik.main,
    bukan saat impor. -> n atau None."""
    global D_BAWAH, D_ATAS, KAL_N
    if kal is None:
        import kalibrasi
        kal = kalibrasi.muat()
    v = ((kal or {}).get("kedalaman_bara") or {}).get("gambut") or {}
    try:
        if v.get("n", 0) >= n_min and 0 < float(v["p10"]) < float(v["p90"]):
            D_BAWAH, D_ATAS, KAL_N = float(v["p10"]), float(v["p90"]), v["n"]
            CATATAN["d"] += f" DIKALIBRASI: p10-p90 kedalaman bara isian lapangan, berdasarkan {v['n']} insiden gambut ({D_BAWAH:g}-{D_ATAS:g} cm)."
            return v["n"]
    except (KeyError, TypeError, ValueError):
        pass
    return None


def hitung(deteksi, luas_ha, wt=None):
    """deteksi: [(kunci_piksel, tanggal_wib, frp, malam)] untuk titik DI LAHAN GAMBUT saja; kunci_piksel = (i, j) sel 375 m
    (harian.pix); malam = True bila 18.00-06.00 WIB. wt: cm (negatif = di bawah permukaan) atau None. frp tidak dipakai (tetap diterima agar pemanggil sederhana).
    Sel 750 m dihitung persisten bila >= 2 tanggal DAN ada deteksi malam (CATATAN["fb"]).
    -> dict `bara` atau None bila tanpa piksel gambut. Kunci: a, d, m, co2, ch4, co (tiap [rendah, tengah, tinggi]),
    fb (indeks persistensi 0..1), wt, px (sel 375 m), dipotong (bool), tertahan_air (bool),
    sp ([[i, j, 1|0]] piksel 375 m terurut, 1 = sel 750 m-nya persisten; dipakai rute sapuan drone, pemanggil boleh mengubahnya ke lat/lon)."""
    px, sel, mlm = set(), {}, set()
    for k, tg, _, malam in deteksi:
        px.add(k)
        s = (k[0] // 2, k[1] // 2)  # sel 750 m
        sel.setdefault(s, set()).add(tg)
        if malam:
            mlm.add(s)
    if not px:
        return None
    tetap = {s for s, t in sel.items() if len(t) >= 2 and s in mlm}
    fb = len(tetap) / len(sel)
    jejak = len(px) * PIKSEL_HA
    a = [min(jejak * f, luas_ha) if luas_ha else jejak * f for f in FRAKSI_TERBAKAR]
    d0 = [D_BAWAH, D_BAWAH + (D_ATAS - D_BAWAH) * fb, D_ATAS]
    d = d0 if wt is None else [min(x, max(0.0, -wt)) for x in d0]
    m = [ai * 1e4 * (di / 100) * bi * CC for ai, di, bi in zip(a, d, BD)]
    return {"a": [round(x, 1) for x in a], "d": [round(x) for x in d], "m": [round(x) for x in m],
            **{g: [round(x * e) for x in m] for g, e in EF.items()},
            "fb": round(fb, 2), "wt": None if wt is None else round(wt), "px": len(px),
            "sp": [[i, j, int((i // 2, j // 2) in tetap)] for i, j in sorted(px)],
            "dipotong": d != d0, "tertahan_air": wt is not None and wt >= 0, **({"kal_n": KAL_N} if KAL_N else {})}


def uji():
    # 10 sel 750 m terpisah (piksel 375 m genap): 5 terdeteksi di 2 tanggal (satu malam), 5 sekali -> fb 0,5; wt -20 -> D [15,33,51] dipotong [15,20,20]
    dt_ = [((2 * i, 0), tg, 10.0, tg == "2026-10-16") for i in range(5) for tg in ("2026-10-15", "2026-10-16")] + [((2 * i, 0), "2026-10-16", 50.0, True) for i in range(5, 10)]
    r = hitung(dt_, 1000, wt=-20)
    assert r["px"] == 10 and r["fb"] == 0.5 and r["wt"] == -20 and r["dipotong"] and not r["tertahan_air"], r
    assert r["a"] == [14.1, 42.2, 140.6], r["a"]             # 140,625 ha x (0,1; 0,3; 1)
    assert r["d"] == [15, 20, 20], r["d"]
    # tengah: 42,1875 ha x 1e4 x 0,20 m x 0,10 = 8437,5 t; CO2 x 1,703 = 14369
    assert r["m"][1] == 8438 and r["co2"][1] == 14369 and r["ch4"][1] == 177 and r["co"][1] == 1772, r
    assert r["m"][0] == round(14.0625 * 1e4 * 0.15 * 0.07) and r["m"][2] == round(140.625 * 1e4 * 0.20 * 0.15), r["m"]
    for g in ("a", "d", "m", "co2", "ch4", "co"):
        assert r[g][0] <= r[g][1] <= r[g][2], (g, r[g])
    # tanpa pemotongan: D tengah = 15 + 36 x 0,5 = 33
    t = hitung(dt_, 1000)
    assert t["d"] == [15, 33, 51] and t["wt"] is None and not t["dipotong"]
    # muka air dangkal memotong; di atas permukaan = tertahan air, semua nol
    assert hitung(dt_, 1000, wt=-10)["d"] == [10, 10, 10]
    w = hitung(dt_, 1000, wt=5)
    assert w["tertahan_air"] and w["d"] == [0, 0, 0] and w["m"] == w["co2"] == w["ch4"] == w["co"] == [0, 0, 0], w
    # muka air dalam (-100) tidak memotong
    assert not hitung(dt_, 1000, wt=-100)["dipotong"]
    # luas kompleks membatasi A
    assert hitung(dt_, 50)["a"][2] == 50.0
    # persistensi dihitung di sel 750 m: dua piksel 375 m satu sel pada tanggal beda = 1 sel, 2 tanggal -> fb 1; FRP tak berpengaruh
    assert hitung([((0, 0), "a", 90.0, True), ((1, 1), "b", 90.0, False)], 100)["fb"] == 1.0
    assert hitung([((0, 0), "a", 9.0, True), ((1, 1), "b", 9.0, False), ((4, 0), "a", 9.0, True)], 100)["sp"] == [[0, 0, 1], [1, 1, 1], [4, 0, 0]]
    assert hitung([((0, 0), "a", 5.0, True), ((2, 0), "a", 5.0, True)], 100)["fb"] == 0
    # syarat malam: 2 tanggal tanpa satu pun deteksi malam bukan persisten; malam sekali tanpa tanggal kedua juga bukan
    assert hitung([((0, 0), "a", 5.0, False), ((0, 0), "b", 5.0, False)], 100)["fb"] == 0
    assert hitung([((0, 0), "a", 5.0, True), ((0, 0), "a", 5.0, False)], 100)["fb"] == 0
    assert hitung([], 100) is None
    # kalibrasi: n < 10 tidak menimpa; n >= 10 menimpa dan menandai kal_n; kembalikan agar uji lain tak terpengaruh
    global D_BAWAH, D_ATAS, KAL_N
    asli, cat = (D_BAWAH, D_ATAS), CATATAN["d"]
    assert pasang_kalibrasi({"kedalaman_bara": {"gambut": {"n": 9, "p10": 10, "p90": 40}}}) is None and (D_BAWAH, D_ATAS) == asli and "kal_n" not in hitung(dt_, 1000)
    assert pasang_kalibrasi({"kedalaman_bara": {"gambut": {"n": 12, "p10": 10, "p90": 40}}}) == 12 and (D_BAWAH, D_ATAS) == (10.0, 40.0) and hitung(dt_, 1000)["kal_n"] == 12
    assert pasang_kalibrasi({"kedalaman_bara": {"gambut": {"n": 12, "p10": 50, "p90": 40}}}) is None
    D_BAWAH, D_ATAS = asli
    KAL_N, CATATAN["d"] = None, cat
    print("gambut_bara uji: OK")


if __name__ == "__main__":
    uji()
