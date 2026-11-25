"""TS-05: daftar kotak halus (domain genangan) untuk simulasi tsunami. Python 3.12 stdlib saja.
Saat ini HANYA daftar kotak dan self-check; belum ada DEM, batimetri dekat pantai, atau kekasaran (TS-06, TS-07).

Tiga kotak pertama menurut K6 (23 Nov 2026): Ujung Kulon, Pangandaran sampai Cilacap, Banyuwangi sampai Rajegwesi.
Format kotak = [lon_barat, lat_selatan, lon_timur, lat_utara], derajat. Batas dipilih agar memuat (a) garis pantai sasaran dan sisi darat sampai
sekitar 10 km ke pedalaman, (b) paparan laut dangkal sekitar 10-15 km ke arah laut, (c) titik run-up historis NCEI (tsunami_runup.json) di kawasan itu.
Batas ini keputusan rancangan awal, bukan hasil hitung genangan; dapat dipertajam saat DEM masuk (TS-06) tanpa mengubah nama kotak.
Kelas uji kejadian TIDAK ditentukan di sini (dikunci di TS-14). Menurut Q17 ketiga kotak ini belum punya kejadian uji kelas A.
Pantai di luar semua kotak = "belum dihitung", tidak pernah 0 atau aman.

Pakai:  python3 scripts/gempa/tsunami_medan.py uji
"""
import json, math, os, re, sys

DATA = os.path.join(os.path.dirname(os.path.abspath(__file__)), "../../public/gempa/data/")

KOTAK = {
    "ujung_kulon": {"nama": "Ujung Kulon (Banten)", "kotak": [104.95, -6.95, 105.75, -6.30],
                    "acuan": "Taman Nasional Ujung Kulon dan Pulau Panaitan, pantai barat Banten sampai Sumur; tsunami Selat Sunda 2018 (NCEI)"},
    "pangandaran_cilacap": {"nama": "Pangandaran sampai Cilacap", "kotak": [108.25, -7.95, 109.30, -7.35],
                            "acuan": "pantai selatan Jawa Barat bagian timur sampai Jawa Tengah bagian barat; Pangandaran 2006 (NCEI)"},
    "banyuwangi_rajegwesi": {"nama": "Banyuwangi sampai Rajegwesi", "kotak": [113.75, -8.90, 114.50, -8.40],
                             "acuan": "Teluk Rajegwesi, Pancer, Lampon, Grajagan; Banyuwangi 1994 (NCEI mengeja Rajekwesi)"},
}

# titik wajib di dalam kotak masing-masing (lat, lon); sumber: peta umum dan koordinat run-up NCEI
TITIK_ACUAN = {
    "ujung_kulon": [("Tanjung Layar", -6.78, 105.21), ("Pulau Panaitan", -6.60, 105.20), ("Sumur", -6.45, 105.65)],
    "pangandaran_cilacap": [("Pangandaran", -7.70, 108.65), ("Cilacap", -7.73, 109.00), ("Nusakambangan", -7.75, 109.10)],
    "banyuwangi_rajegwesi": [("Rajekwesi 1994", -8.5565, 113.9351667), ("Pancer", -8.589, 114.005), ("Grajagan", -8.73, 114.35)],
}


def luas_km2(k):
    lon0, lat0, lon1, lat1 = k
    return (lon1 - lon0) * (lat1 - lat0) * 111.19 ** 2 * math.cos(math.radians((lat0 + lat1) / 2))


def di_dalam(k, lat, lon):
    return k[0] <= lon <= k[2] and k[1] <= lat <= k[3]


def kotak_untuk(lat, lon):
    """Kunci kotak yang memuat titik, atau None (= 'belum dihitung', bukan 0)."""
    for kunci, v in KOTAK.items():
        if di_dalam(v["kotak"], lat, lon):
            return kunci
    return None


def uji():
    ks = list(KOTAK)
    assert len(ks) == 3
    for kunci, v in KOTAK.items():
        k = v["kotak"]
        assert len(k) == 4 and k[0] < k[2] and k[1] < k[3], (kunci, k)
        assert 94 <= k[0] and k[2] <= 142 and -12 <= k[1] and k[3] <= 7, ("di luar cakupan batimetri", kunci)
        assert 500 < luas_km2(k) < 12000, (kunci, luas_km2(k))  # masuk akal sebagai domain pantai (bukan satu provinsi)
        for nama, la, lo in TITIK_ACUAN[kunci]:
            assert di_dalam(k, la, lo), (kunci, nama)
    for i, a in enumerate(ks):  # tidak tumpang tindih
        for b in ks[i + 1:]:
            A, B = KOTAK[a]["kotak"], KOTAK[b]["kotak"]
            assert A[2] <= B[0] or B[2] <= A[0] or A[3] <= B[1] or B[3] <= A[1], (a, b)
    assert kotak_untuk(-8.5565, 113.9351667) == "banyuwangi_rajegwesi" and kotak_untuk(-6.2, 106.8) is None  # Jakarta: belum dihitung
    # kotak memuat laut dan darat pada grid batimetri nyata, dan titik run-up NCEI yang sesuai
    if os.path.exists(DATA + "batimetri.bin"):
        sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
        import tsunami_sumber as ts
        G = ts.muat_grid(DATA)
        for kunci, v in KOTAK.items():
            k = v["kotak"]
            laut = darat = 0
            for j in range(G["ny"]):
                la = G["lat0"] + j * G["d"]
                if not k[1] <= la <= k[3]:
                    continue
                for i in range(G["nx"]):
                    lo = G["lon0"] + i * G["d"]
                    if k[0] <= lo <= k[2]:
                        if G["z"][j * G["nx"] + i] < 0:
                            laut += 1
                        else:
                            darat += 1
            assert laut >= 5 and darat >= 5, (kunci, laut, darat)
    if os.path.exists(DATA + "tsunami_runup.json"):
        r = json.load(open(DATA + "tsunami_runup.json"))["runup"]
        for kunci, v in KOTAK.items():
            n = sum(1 for x in r if x["tinggi_m"] is not None and di_dalam(v["kotak"], x["lat"], x["lon"]))
            assert n >= 20, (kunci, "titik run-up NCEI di dalam kotak", n)
    assert not re.search(r"\baman\b", json.dumps(KOTAK, ensure_ascii=False).lower()), "kata terlarang di daftar kotak"
    print("tsunami_medan uji OK:", {k: round(luas_km2(v["kotak"])) for k, v in KOTAK.items()}, "km2")


if __name__ == "__main__":
    uji()
