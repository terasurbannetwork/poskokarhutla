"""VIIRS "utama" yang sadar waktu untuk jalur prediksi (prospektif.py, jejak.py; setara di public/sebaran_model.js).

Model dilatih pada deteksi VIIRS S-NPP ("N"). FIRMS berhenti mendistribusikan S-NPP pada 1 Nov 2026 13:00 UTC; NOAA-21 ("N21") menggantikannya
(N21 satu bidang orbit dan jam lintas +-13:30 dengan N20, jadi paling mirip S-NPP; semua VIIRS TIDAK digabung karena distribusi fitur berubah
dan model dilatih per S-NPP). Aturan: deteksi "N" sebelum SNPP_AKHIR, "N21" pada/sesudahnya; yang lain dibuang dari himpunan S-NPP.

Satu sumber kebenaran batas: SNPP_AKHIR di scripts/data/peta_karhutla.py:68 (milik pipa-data). Berkas itu berat, jadi nilainya DIDUPLIKASI di sini dan
self-check `python3 scripts/sebaran/sensor.py uji` membaca teks peta_karhutla.py lalu menolak bila keduanya beda. Ubah keduanya bersama.

BELUM DIUKUR (tulis di laporan, jangan diklaim): pergeseran distribusi fitur N21 vs S-NPP (jumlah titik per lintasan, FRP, ukuran piksel di tepi sapuan, jam lintas).
Model TIDAK dilatih ulang pada N21; ramalan sesudah peralihan dicatat dan dinilai TERPISAH (prospektif.json per_sensor.N21), tidak dicampur ke metrik S-NPP.
Skrip pembanding yang diusulkan (belum dijalankan; butuh FIRMS_MAP_KEY yang tidak ada di container ini): scripts/sebaran/banding_n21.py yang mengunduh arsip
VIIRS_NOAA21_SP dan VIIRS_SNPP_SP 2023-03 s.d. 2026 untuk 9 provinsi prioritas, lalu membandingkan per hari: jumlah deteksi nominal/tinggi, FRP median,
sel 375 m unik, dan fitur lolos.konteks (titik5_3h, titik10_3h, jarak_aktif_km, hari_aktif10) pada titik api yang sama; keluaran selisih + selang bootstrap.
Bila selisih fitur bermakna, model "lolos" harus disetel ulang pada N21 sebelum ramalan N21 boleh dihitung teruji.
"""
import datetime as dt, os, re, sys

SNPP_AKHIR = ("2026-11-01", 780)  # (tanggal UTC, menit UTC): akuisisi S-NPP terakhir yang didistribusikan FIRMS (sama dengan peta_karhutla.py)
T0 = dt.datetime(2015, 1, 1, tzinfo=dt.timezone.utc)  # sama dengan umum.T0 (menit sejak 2015-01-01 UTC)
RIWAYAT_MENIT = 7 * 1440  # fitur memakai deteksi 7 hari sebelum titik
HORIZON_MENIT = 72 * 60   # label memakai deteksi 72 jam sesudah titik


def menit_akhir():
    """SNPP_AKHIR dalam menit sejak T0."""
    return (dt.datetime.fromisoformat(SNPP_AKHIR[0]).replace(tzinfo=dt.timezone.utc) - T0).total_seconds() / 60 + SNPP_AKHIR[1]


def utama_pada(menit):
    """Kode sensor VIIRS utama untuk deteksi pada menit ini."""
    return "N" if menit < menit_akhir() else "N21"


def baris_utama(r):
    """r = [menit, lat, lon, sensor, ...] (bentuk gudang prospektif). True bila deteksi ini bagian dari seri VIIRS utama."""
    return r[3] == utama_pada(r[0])


def peralihan(t0):
    """Titik pada menit t0 memakai fitur [t0-7 hari, t0] dan label [t0, t0+72 jam]; True bila jendela itu memuat batas pergantian (campuran S-NPP dan N21)."""
    a = menit_akhir()
    return t0 - RIWAYAT_MENIT < a < t0 + HORIZON_MENIT


def kelompok(t0):
    """"N" (seluruh jendela S-NPP), "N21" (seluruh jendela N21), atau "peralihan" (campuran: dinilai terpisah, tidak masuk metrik S-NPP)."""
    return "peralihan" if peralihan(t0) else utama_pada(t0)


def snpp_akhir_peta_karhutla():
    """Baca konstanta SNPP_AKHIR dari scripts/data/peta_karhutla.py (tanpa mengimpornya)."""
    j = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "data", "peta_karhutla.py")
    m = re.search(r'^SNPP_AKHIR\s*=\s*\("(\d{4}-\d{2}-\d{2})",\s*(\d+)\)', open(j, encoding="utf-8").read(), re.M)
    return (m.group(1), int(m.group(2))) if m else None


def uji():
    assert snpp_akhir_peta_karhutla() == SNPP_AKHIR, ("SNPP_AKHIR beda dengan scripts/data/peta_karhutla.py", snpp_akhir_peta_karhutla(), SNPP_AKHIR)
    a = menit_akhir()
    assert (T0 + dt.timedelta(minutes=a)).isoformat() == "2026-11-01T13:00:00+00:00"
    # sebelum/sesudah pergantian memilih sensor yang benar
    assert utama_pada(a - 1) == "N" and utama_pada(a) == "N21" and utama_pada(a + 5000) == "N21" and utama_pada(0) == "N"
    assert baris_utama([a - 1, 0, 0, "N"]) and not baris_utama([a - 1, 0, 0, "N21"]) and not baris_utama([a - 1, 0, 0, "N20"])
    assert baris_utama([a, 0, 0, "N21"]) and not baris_utama([a, 0, 0, "N"]) and not baris_utama([a + 60, 0, 0, "N20"])
    # kelompok ramalan: 72 jam jelas sebelum batas = N; 7 hari jelas sesudah = N21; di antaranya peralihan
    assert kelompok(a - HORIZON_MENIT) == "N" and kelompok(a - HORIZON_MENIT + 1) == "peralihan"
    assert kelompok(a + RIWAYAT_MENIT) == "N21" and kelompok(a + RIWAYAT_MENIT - 1) == "peralihan"
    assert kelompok(a - 100000) == "N" and kelompok(a + 100000) == "N21"
    print("ok")


if __name__ == "__main__":
    if sys.argv[1:] == ["uji"]:
        uji()
    else:
        print(snpp_akhir_peta_karhutla(), menit_akhir())
