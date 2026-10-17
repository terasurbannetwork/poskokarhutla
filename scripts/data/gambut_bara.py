"""Estimasi kebakaran gambut bawah permukaan (bara) per kompleks: E = A x D x BD x CC x EF.

Fungsi murni, tanpa jaringan. Dipanggil harian.py untuk kompleks gambut level >= 2.
Semua variabel berupa rentang [bawah, tengah, atas]; dikombinasi ujung-ke-ujung (bawah x bawah, atas x atas)
= BATAS, bukan selang kepercayaan. ESTIMASI, belum divalidasi lapangan.

Self-check:  python3 scripts/data/gambut_bara.py
"""
import statistics

PIKSEL_HA = 14.0625             # garis_api.PIKSEL_HA (sel ~375 m); diulang agar modul ini berdiri sendiri
FRAKSI_TERBAKAR = (0.10, 0.30, 1.00)   # ASUMSI: porsi jejak piksel gambut yang benar-benar terbakar (tidak diketahui)
D_BAWAH, D_ATAS = 15.0, 51.0    # cm. Page dkk. 2002 Nature (0,51 m, 1997); Ballhorn dkk. 2009 PNAS (0,33 +- 0,18 m, Kalteng 2006)
FRP_BARA_MW = 20.0              # ASUMSI: median FRP piksel < 20 MW + >= 2 tanggal = membara
BD = (0.07, 0.10, 0.15)         # t/m3, gambut tropis
CC = 1.0                        # IPCC 2013 Wetlands Supplement, dalam kerangka kedalaman terbakar
# t gas per t bahan kering (= g/kg). CO2 & CH4 sama dengan dampak.py (IPCC 2013 Wetlands Supp. Bab 2, tanah organik tropis);
# CO 0,210 dari brief (IPCC 2013 Tabel 2.7), belum ada di repo lain.
EF = {"co2": 1.703, "ch4": 0.021, "co": 0.210}

CATATAN = {
    "a": "Luas terbakar = jumlah sel unik ~375 m berdeteksi di peta gambut x 14,06 ha, dibatasi luas kompleks. Fraksi yang benar-benar terbakar tidak diketahui: bawah 10%, tengah 30%, atas 100% dari jejak (ASUMSI).",
    "d": "Kedalaman terbakar 15-51 cm (Page dkk. 2002 Nature 51 cm; Ballhorn dkk. 2009 PNAS 33 +- 18 cm). Tengah naik menuju atas menurut fraksi bara fb. Dipotong ke kedalaman muka air proxy bila ada (api tidak membakar di bawah muka air).",
    "fb": "Fraksi bara = porsi piksel gambut terdeteksi >= 2 tanggal WIB berbeda dengan median FRP < 20 MW (ambang 20 MW = ASUMSI).",
    "wt": "Muka air = proxy PFVI dari hujan dan ET0 (sel 0,5 derajat terdekat, keadaan H-2), bukan pengukuran. Null bila bukan sel gambut PFVI.",
    "bd": "Kerapatan gambut tropis 0,07 / 0,10 / 0,15 t/m3.",
    "cc": "CC = 1,0 (IPCC 2013 Wetlands Supplement, gambut tropis, kerangka kedalaman terbakar).",
    "ef": "g/kg bahan kering: CO2 1.703, CH4 21,0, CO 210 (IPCC 2013 Wetlands Supplement, tanah organik tropis).",
    "rentang": "Rentang dikombinasi ujung-ke-ujung (bawah x bawah, atas x atas): batas, bukan selang kepercayaan.",
    "status": "Estimasi, belum divalidasi lapangan; muka air = proxy, bukan pengukuran; MCE tidak dipakai karena Sentinel-5P/MOPITT hanya mengukur CO.",
}


def hitung(deteksi, luas_ha, wt=None):
    """deteksi: [(kunci_piksel, tanggal_wib, frp)] untuk titik DI LAHAN GAMBUT saja. wt: cm (negatif = di bawah permukaan) atau None.
    -> dict `bara` atau None bila tanpa piksel gambut."""
    per = {}
    for k, tg, frp in deteksi:
        s = per.setdefault(k, [set(), []])
        s[0].add(tg)
        s[1].append(frp)
    if not per:
        return None
    fb = sum(1 for tgl_, frp in per.values() if len(tgl_) >= 2 and statistics.median(frp) < FRP_BARA_MW) / len(per)
    jejak = len(per) * PIKSEL_HA
    a = [min(jejak * f, luas_ha) if luas_ha else jejak * f for f in FRAKSI_TERBAKAR]
    d = [D_BAWAH, D_BAWAH + (D_ATAS - D_BAWAH) * fb, D_ATAS]
    if wt is not None:
        d = [min(x, max(0.0, -wt)) for x in d]
    m = [ai * 1e4 * (di / 100) * bi * CC for ai, di, bi in zip(a, d, BD)]
    return {"a": [round(x, 1) for x in a], "d": [round(x) for x in d], "m": [round(x) for x in m],
            **{g: [round(x * e) for x in m] for g, e in EF.items()},
            "fb": round(fb, 2), "wt": None if wt is None else round(wt), "px": len(per)}


def uji():
    # 10 piksel, 5 membara (2 tanggal, FRP 10) dan 5 sekali lihat -> fb 0,5; wt -20 -> D [15,33,51] dipotong [15,20,20]
    dt_ = [((i, 0), tg, 10.0) for i in range(5) for tg in ("2026-10-15", "2026-10-16")] + [((i, 0), "2026-10-16", 50.0) for i in range(5, 10)]
    r = hitung(dt_, 1000, wt=-20)
    assert r["px"] == 10 and r["fb"] == 0.5 and r["wt"] == -20, r
    assert r["a"] == [14.1, 42.2, 140.6], r["a"]             # 140,625 ha x (0,1; 0,3; 1)
    assert r["d"] == [15, 20, 20], r["d"]
    # tengah: 42,1875 ha x 1e4 x 0,20 m x 0,10 = 8437,5 t; CO2 x 1,703 = 14369
    assert r["m"][1] == 8438 and r["co2"][1] == 14369 and r["ch4"][1] == 177 and r["co"][1] == 1772, r
    assert r["m"][0] == round(14.0625 * 1e4 * 0.15 * 0.07) and r["m"][2] == round(140.625 * 1e4 * 0.20 * 0.15), r["m"]
    for g in ("a", "d", "m", "co2", "ch4", "co"):
        assert r[g][0] <= r[g][1] <= r[g][2], (g, r[g])
    # tanpa pemotongan: D tengah = 15 + 36 x 0,5 = 33
    assert hitung(dt_, 1000)["d"] == [15, 33, 51] and hitung(dt_, 1000)["wt"] is None
    # muka air dangkal memotong; di atas permukaan = tidak ada yang terbakar
    assert hitung(dt_, 1000, wt=-10)["d"] == [10, 10, 10]
    assert hitung(dt_, 1000, wt=5)["m"] == [0, 0, 0]
    # luas kompleks membatasi A
    assert hitung(dt_, 50)["a"][2] == 50.0
    # sekali terdeteksi atau FRP tinggi bukan bara
    assert hitung([((0, 0), "2026-10-16", 5.0)], 100)["fb"] == 0
    assert hitung([((0, 0), "a", 50.0), ((0, 0), "b", 60.0)], 100)["fb"] == 0
    assert hitung([], 100) is None
    print("gambut_bara uji: OK")


if __name__ == "__main__":
    uji()
