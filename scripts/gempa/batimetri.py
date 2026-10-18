"""Batimetri + topografi Indonesia untuk simulasi tsunami peramban -> public/gempa/data/batimetri.{bin,json}.
Python 3.12 stdlib saja (jalan juga di 3.9).

Sumber: NOAA NCEI ETOPO 2022 v1, 15 detik busur (permukaan, gabungan GEBCO/SRTM/Copernicus DEM), diambil lewat ERDDAP
NOAA CoastWatch (griddap ETOPO_2022_v1_15s). Domain publik (karya Pemerintah AS), atribusi NOAA NCEI tetap ditulis.
Diambil dengan langkah 12 sel (= 3 menit busur, 0,05 derajat, ~5,5 km): titik sampel, BUKAN rata-rata sel. Cukup untuk
waktu tempuh gelombang panjang dan animasi, tidak untuk genangan darat.

Keluaran: batimetri.bin = Int16 little-endian, meter, laut negatif, baris dari selatan ke utara, kolom barat ke timur;
nilai (j, i) di lat0 + j*d, lon0 + i*d (pusat sel). batimetri.json = {lon0, lat0, d, nx, ny, sumber, lisensi, dibuat}.

  python3 scripts/gempa/batimetri.py        unduh (sekali, ~12 MB CSV) lalu tulis
  python3 scripts/gempa/batimetri.py uji    periksa berkas yang sudah ditulis
"""
import array
import datetime as dt
import json
import os
import sys

from umum import KELUAR, ambil, simpan

ERDDAP = "https://coastwatch.pfeg.noaa.gov/erddap/griddap/ETOPO_2022_v1_15s.csv"
SEL = 1 / 240          # 15 detik busur
LANGKAH = 12           # 12 x 15" = 3'
D = SEL * LANGKAH
LAT0 = -90 + (round((-12 + 90) / SEL - 0.5) + 0.5) * SEL   # pusat sel 15" terdekat ke -12 = -11,99792
LON0 = -180 + (round((94 + 180) / SEL - 0.5) + 0.5) * SEL  # 94,00208
NY = int((7 - LAT0) / D) + 1   # 380
NX = int((142 - LON0) / D) + 1  # 960
PITA = 40               # baris per permintaan
PLAFON = 1_500_000
BIN = os.path.join(KELUAR, "batimetri.bin")
META = os.path.join(KELUAR, "batimetri.json")


def unduh():
    z = array.array("h", [0]) * (NX * NY)
    for j0 in range(0, NY, PITA):
        j1 = min(NY, j0 + PITA) - 1
        la, lb = LAT0 + j0 * D, LAT0 + j1 * D
        url = (f"{ERDDAP}?z%5B({la:.9f}):{LANGKAH}:({lb:.9f})%5D%5B({LON0:.9f}):{LANGKAH}:({LON0 + (NX - 1) * D:.9f})%5D")
        baris = ambil(url, batas_waktu=300, mentah=True).decode().splitlines()[2:]
        assert len(baris) == (j1 - j0 + 1) * NX, f"pita {j0}: {len(baris)} baris, harap {(j1 - j0 + 1) * NX}"
        for s in baris:
            lat, lon, v = s.split(",")
            j, i = round((float(lat) - LAT0) / D), round((float(lon) - LON0) / D)
            assert 0 <= j < NY and 0 <= i < NX, s
            z[j * NX + i] = max(-32768, min(32767, round(float(v)))) if v != "NaN" else 0
        print(f"baris {j0}-{j1} dari {NY}", file=sys.stderr)
    return z


def main():
    z = unduh()
    if sys.byteorder != "little":
        z.byteswap()
    with open(BIN + ".tmp", "wb") as f:
        z.tofile(f)
    os.replace(BIN + ".tmp", BIN)
    simpan(META, {"lon0": round(LON0, 6), "lat0": round(LAT0, 6), "d": D, "nx": NX, "ny": NY, "satuan": "m, laut negatif",
                  "urutan": "Int16 LE, baris selatan->utara, kolom barat->timur",
                  "sumber": "NOAA NCEI ETOPO 2022 v1 15 detik busur (permukaan), via ERDDAP NOAA CoastWatch ETOPO_2022_v1_15s, "
                            "disampel tiap 3 menit busur",
                  "sitasi": "NOAA National Centers for Environmental Information 2022. ETOPO 2022 15 Arc-Second Global Relief Model. "
                            "doi:10.25921/fd45-gt74",
                  "lisensi": "Domain publik (NOAA, Pemerintah AS); atribusi NOAA NCEI",
                  "dibuat": dt.datetime.now(dt.timezone.utc).strftime("%Y-%m-%dT%H:%MZ")})
    print(NX, "x", NY, os.path.getsize(BIN), "byte")


def baca():
    m = json.load(open(META))
    z = array.array("h")
    with open(BIN, "rb") as f:
        z.fromfile(f, m["nx"] * m["ny"])
    if sys.byteorder != "little":
        z.byteswap()
    return m, z


def nilai(m, z, lat, lon):
    j, i = round((lat - m["lat0"]) / m["d"]), round((lon - m["lon0"]) / m["d"])
    return z[j * m["nx"] + i]


def uji():
    m, z = baca()
    assert (m["nx"], m["ny"]) == (NX, NY) == (960, 380), (m["nx"], m["ny"])
    assert len(z) == NX * NY and os.path.getsize(BIN) == 2 * NX * NY
    ukuran = os.path.getsize(BIN) + os.path.getsize(META)
    assert ukuran <= PLAFON, f"{ukuran} byte > plafon {PLAFON}"
    lo, hi = min(z), max(z)
    assert -11000 < lo < -6000, f"terdalam {lo} m: Laut Banda/Palung Jawa harus -6.000 sampai -8.000 m"
    assert 3000 < hi < 5100, f"tertinggi {hi} m: Puncak Jaya 4.884 m, tersampel 3' harus 3.000-5.000 m"
    laut = sum(1 for v in z if v < 0) / len(z)
    assert 0.6 < laut < 0.85, f"porsi laut {laut:.2f}"
    # palung Jawa di selatan Jawa Tengah: titik terdalam kotak 109-111E, 10,5-9,5S harus < -5.500 m
    palung = min(nilai(m, z, -10.5 + a * 0.05, 109 + b * 0.05) for a in range(21) for b in range(41))
    assert palung < -5500, f"palung Jawa {palung} m"
    jkt = nilai(m, z, -6.20, 106.82)
    assert 0 <= jkt <= 20, f"Jakarta (Monas) {jkt} m, harap 0-20 m"
    assert nilai(m, z, -5.8, 107.0) < -10, "Laut Jawa utara Jakarta harus laut"
    assert nilai(m, z, -7.25, 112.75) < 30, "Surabaya dataran rendah"
    assert nilai(m, z, -6.83, 107.62) > 900, "Lembang di atas 900 m"
    print(f"batimetri.py uji: lolos ({NX}x{NY}, {ukuran} byte, {lo}..{hi} m, laut {laut:.0%}, palung {palung} m, Jakarta {jkt} m)")


if __name__ == "__main__":
    uji() if sys.argv[1:] == ["uji"] else main()
