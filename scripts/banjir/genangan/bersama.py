"""Bersama untuk panen J1 genangan Jakarta: kotak, kejadian, unduh jujur (UA jelas) dengan lanjut-dari-cache, kecamatan DKI."""
import datetime as dt, json, os, sys, time, urllib.error, urllib.request

AYAH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
sys.path.insert(0, AYAH)
from wilayah import AKAR, Poligon  # noqa: E402
from umum import simpan, baca, WIB  # noqa: E402,F401

AKAR = os.path.abspath(AKAR)
MENTAH = os.path.join(AKAR, "data/raw/banjir/genangan")
RINGKAS = os.path.join(AKAR, "public/banjir/data/genangan")
UA = "poskobanjir/1.0 (riset genangan Jakarta; +https://centurisk97.id)"

# Jakarta + penyangga (Bogor-Depok-Tangerang-Bekasi sisi hulu/sisi samping)
KOTAK = (106.60, -6.40, 107.05, -6.05)  # lon_min, lat_min, lon_maks, lat_maks

# Kejadian dengan pasangan hujan jam + genangan teramati (RANCANGAN-GENANGAN-JAKARTA.md §3)
KEJADIAN = {
    "2017-01": ("2017-01-01", "2017-02-28"),
    "2018-01": ("2018-01-01", "2018-02-28"),
    "2020-01": ("2020-01-01", "2020-01-10"),
    "2021-02": ("2021-02-01", "2021-02-28"),
    "2025-03": ("2025-03-01", "2025-03-31"),
}


def hari(s):
    return dt.date.fromisoformat(s)


def jendela(awal, akhir, margin=3):
    """Tanggal awal-akhir kejadian +- margin hari -> (awal, akhir) ISO."""
    return (hari(awal) - dt.timedelta(days=margin)).isoformat(), (hari(akhir) + dt.timedelta(days=margin)).isoformat()


def ambil_json(url, coba=4, batas_waktu=120, kepala=None):
    for i in range(coba):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA, **(kepala or {})})
            with urllib.request.urlopen(req, timeout=batas_waktu) as r:
                return json.loads(r.read())
        except urllib.error.HTTPError as e:
            if i == coba - 1 or (400 <= e.code < 500 and e.code != 429):
                raise RuntimeError(f"{url.split('?')[0]}: HTTP {e.code} {e.read()[:200]!r}")
            time.sleep(30 * (i + 1) if e.code == 429 else 10 * (i + 1))
        except Exception as e:
            if i == coba - 1:
                raise RuntimeError(f"{url.split('?')[0]}: {e}")
            time.sleep(10 * (i + 1))


def ambil_berkas(url, jalur, kepala=None, coba=3):
    """Unduh ke `jalur` (lewati bila sudah ada). Kembalikan ukuran byte. Tulis .tmp lalu ganti."""
    if os.path.exists(jalur) and os.path.getsize(jalur) > 0:
        return os.path.getsize(jalur)
    os.makedirs(os.path.dirname(jalur), exist_ok=True)
    for i in range(coba):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA, **(kepala or {})})
            with urllib.request.urlopen(req, timeout=300) as r, open(jalur + ".tmp", "wb") as f:
                while True:
                    b = r.read(1 << 20)
                    if not b:
                        break
                    f.write(b)
            os.replace(jalur + ".tmp", jalur)
            return os.path.getsize(jalur)
        except urllib.error.HTTPError as e:
            if i == coba - 1 or (400 <= e.code < 500 and e.code != 429):
                raise RuntimeError(f"{url.split('?')[0]}: HTTP {e.code}")
            time.sleep(10 * (i + 1))
        except Exception as e:
            if i == coba - 1:
                raise RuntimeError(f"{url.split('?')[0]}: {e}")
            time.sleep(10 * (i + 1))


class KecDKI:
    """Titik -> (kab, kec) DKI dari public/geo/kecamatan/31.json; None di luar DKI."""
    def __init__(self):
        self.p = Poligon(os.path.join(AKAR, "public/geo/kecamatan/31.json"))

    def cari(self, lon, lat):
        pr = self.p.cari(lon, lat)
        return (pr["kab"], pr["kec"]) if pr else None


def median(v):
    v = sorted(v)
    n = len(v)
    return None if not n else (v[n // 2] if n % 2 else (v[n // 2 - 1] + v[n // 2]) / 2)


if __name__ == "__main__":
    assert jendela("2020-01-01", "2020-01-10") == ("2019-12-29", "2020-01-13")
    assert median([1, 3, 2]) == 2 and median([1, 2]) == 1.5 and median([]) is None
    k = KecDKI()
    assert k.cari(106.8272, -6.1754)[0].upper().find("JAKARTA") >= 0, k.cari(106.8272, -6.1754)  # Monas
    assert k.cari(107.5, -6.9) is None
    print("ok")
