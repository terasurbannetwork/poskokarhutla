"""Satu definisi angka "titik panas" yang dihitung (keputusan pemilik 25 Okt 2026): LOKASI UNIK per hari kalender WIB.

Semua satelit (MODIS, VIIRS S-NPP, NOAA-20, NOAA-21), SEMUA tingkat keyakinan (rendah, sedang, tinggi).
Keyakinan rendah dikembalikan (keputusan pemilik 28 Okt 2026; 25 Okt sempat sedang/tinggi saja) karena api gambut membara
bersuhu rendah dan sering tertutup asap, sehingga sinyalnya justru jatuh di kelas rendah:
  - Tansey dkk. 2008 (JGR 113, doi:10.1029/2008JD010717), gambut terdegradasi Kalteng: MODIS melewatkan ~60% kebakaran,
    dan MEMASUKKAN titik keyakinan rendah memperbaiki kecocokan dengan luas terbakar.
  - Atwood dkk. 2016 (PLOS ONE, doi:10.1371/journal.pone.0159410): api gambut 2015 bersuhu rendah; MODIS menangkap < separuh
    piksel api yang dilihat sensor sensitif TET-1 FireBird.
  - Sofan dkk. 2019 (Remote Sensing 11:465, doi:10.3390/rs11040465): VIIRS 375 m hanya 71% terhadap kebenaran lapangan gambut Kalteng.
Akibat: lebih banyak alarm palsu di luar gambut (pantulan, permukaan panas). Yang TETAP sedang/tinggi karena koefisiennya diukur
dari titik sedang/tinggi dan belum dikalibrasi ulang: luas terbakar (laporan.py HA_TITIK, angka_kawasan.js n2x), faktor insiden
(insiden.py), rasio NOAA-20/S-NPP (firms_sumber.py), pembanding riwayat S-NPP (sejarah.json), cluster/kompleks (harian.py). Satu sel kisi ~375 m (ukuran piksel VIIRS)
dihitung SEKALI per hari, berapa pun satelit dan lintasan yang melihatnya. Alasan: NOAA-20 dan NOAA-21 lewat dengan selang
~50 menit di orbit yang sama, jadi titik mentah menghitung api yang sama dua kali; pada 25 Okt 2026 433 dari 704 titik NOAA-21
Kalteng jatuh di sel yang sudah terdeteksi satelit lain hari itu, 271 sel sungguh baru. Dengan lokasi unik NOAA-21 ikut menambah
cakupan tanpa hitung dobel, dan pensiunnya S-NPP (1 Nov 2026) tidak membuat angka anjlok.

Akibat: angka ini TIDAK sama dengan SiPongi/GIS BNPB (titik mentah M+N+N20, juga termasuk keyakinan rendah). Cermin JS: public/angka_kawasan.js (selTitik, tandaiUnik).
Uji tanpa jaringan:  python3 scripts/data/titik_unik.py
"""
import math

SENSOR = ("M", "N", "N20", "N21")
KEYAKINAN_MIN = 0   # 0 = rendah ikut dihitung (28 Okt 2026, lihat docstring); dulu 1
SEL = 0.003375   # derajat, ~375 m


def sel(lat, lon):
    """Sel kisi ~375 m tempat titik jatuh (bujur diskalakan cos lintang supaya sel tetap persegi)."""
    return (round(lat / SEL), round(lon * math.cos(math.radians(lat)) / SEL))


def dihitung(s, c):
    return s in SENSOR and c >= KEYAKINAN_MIN


def unik(titik, kunci_hari, kunci=lambda p: (p["s"], p["c"], p["lat"], p["lon"])):
    """Titik yang dihitung: deteksi PERTAMA (urutan masukan) tiap (hari, sel) di antara titik yang lolos dihitung().
    kunci_hari(p) -> label hari; kunci(p) -> (sensor, keyakinan, lat, lon)."""
    lihat, out = set(), []
    for p in titik:
        s, c, la, lo = kunci(p)
        if not dihitung(s, c):
            continue
        k = (kunci_hari(p), sel(la, lo))
        if k not in lihat:
            lihat.add(k)
            out.append(p)
    return out


if __name__ == "__main__":
    p = lambda s, c, la, lo, h="10-25": {"s": s, "c": c, "lat": la, "lon": lo, "h": h}
    T = [p("N20", 1, -2.0, 113.0), p("N21", 2, -2.0001, 113.0001),   # sel sama, satelit lain: sekali
         p("N21", 1, -2.0, 113.01),                                    # ~1,1 km ke timur: sel baru
         p("N", 1, -2.0, 113.0, "10-24"),                              # sel sama hari lain: dihitung lagi
         p("M", 0, -3.0, 114.0), p("X", 2, -3.0, 114.0)]               # keyakinan rendah: DIHITUNG (KEYAKINAN_MIN 0); sensor asing: ditolak
    assert KEYAKINAN_MIN == 0, "pemilik 28 Okt 2026: keyakinan rendah ikut dihitung"
    u = unik(T, lambda q: q["h"])
    assert [(q["s"], q["h"]) for q in u] == [("N20", "10-25"), ("N21", "10-25"), ("N", "10-24"), ("M", "10-25")], u
    assert not dihitung("X", 2) and dihitung("M", 0)
    assert sel(-2.0, 113.0) == sel(-2.0001, 113.0001) != sel(-2.0, 113.01)
    print("titik_unik: uji lolos")
