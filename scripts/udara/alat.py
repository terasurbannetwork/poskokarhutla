"""Alat bersama pipeline udara: unduh (UA peramban, 1 ulangan), simpan atomik, status P.14/2020, jarak, jam ISO.

Masukan karhutla dibaca dari public/data/<nama>; env UDARA_DATA_DIR menimpa folder itu (uji lokal dengan salinan produksi).
"""
import datetime as dt
import json
import math
import os
import sys
import time
import urllib.request

AKAR = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "../.."))
OUT = os.path.join(AKAR, "public/udara/data")
RAW = os.path.join(AKAR, "data/raw/udara")
UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36"
WIB = dt.timezone(dt.timedelta(hours=7))
BATAS = [55.4, 150.4, 250.4]   # P.14/2020, PM2,5 rata-rata 24 jam: batas atas Sedang, Tidak sehat, Sangat tidak sehat
STATUS = ["normal", "waspada", "siaga", "awas"]


JEDA = 5


def ambil(url, teks=False, timeout=180, rahasia=()):
    """GET dengan UA peramban; satu ulangan bila jaringan putus atau JSON rusak.

    Pesan galat TIDAK memuat query string (bisa berisi token) dan semua nilai `rahasia` disamarkan; rantai pengecualian
    asli dibuang (`from None`) supaya traceback tidak membawa URL lengkap.
    """
    for i in range(2):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": UA}), timeout=timeout) as r:
                b = r.read().decode("utf-8")
            return b if teks else json.loads(b)
        except Exception as e:
            if i:
                pesan = f"gagal ambil {url.split('?')[0]}: {type(e).__name__}: {e}"
                for r_ in rahasia:
                    if r_:
                        pesan = pesan.replace(r_, "***")
                raise RuntimeError(pesan) from None
            time.sleep(65 if "429" in str(e) else JEDA)   # 429 = batas per menit Open-Meteo


def simpan(nama, isi, folder=OUT):
    p = nama if os.path.isabs(nama) else os.path.join(folder, nama)
    os.makedirs(os.path.dirname(p), exist_ok=True)
    with open(p + ".tmp", "w", encoding="utf-8") as f:
        json.dump(isi, f, ensure_ascii=False, separators=(",", ":"))
    os.replace(p + ".tmp", p)
    return os.path.getsize(p)


def muat(p, bawaan=None):
    if not os.path.exists(p):
        if bawaan is not None:
            return bawaan
        raise FileNotFoundError(p)
    with open(p, encoding="utf-8") as f:
        return json.load(f)


def data(nama, bawaan=None):
    """Masukan karhutla public/data/<nama> (atau UDARA_DATA_DIR/<nama>)."""
    d = os.environ.get("UDARA_DATA_DIR")
    p = os.path.join(d, nama) if d and os.path.exists(os.path.join(d, nama)) else os.path.join(AKAR, "public/data", nama)
    return muat(p, bawaan)


def keluaran(nama, bawaan=None):
    return muat(os.path.join(OUT, nama), bawaan)


def kota():
    """[{kode, nama, prov, lat, lon, jiwa, kab}] dari scripts/udara/kota.json (dibangun sekali oleh kota.py)."""
    k = muat(os.path.join(os.path.dirname(os.path.abspath(__file__)), "kota.json"))
    return [dict(zip(k["kolom"], r)) for r in k["baris"]]


def status(r24):
    if r24 is None:
        return None
    if not isinstance(r24, (int, float)) or r24 < 0 or math.isnan(r24):
        raise ValueError(f"PM2,5 tidak sah: {r24!r}")
    return STATUS[sum(r24 > b for b in BATAS)]


def jarak_km(la1, lo1, la2, lo2):
    p1, p2 = math.radians(la1), math.radians(la2)
    a = math.sin((p2 - p1) / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(math.radians(lo2 - lo1) / 2) ** 2
    return 12742 * math.asin(min(1, math.sqrt(a)))


def iso(t):
    return t.astimezone(dt.timezone.utc).strftime("%Y-%m-%dT%H:%MZ")


def dari_iso(s):
    s = s.replace("Z", "+00:00")
    t = dt.datetime.fromisoformat(s if ("+" in s[10:] or "-" in s[10:]) else s + "+00:00")
    return t.astimezone(dt.timezone.utc)


def sekarang():
    """Jam UTC dibulatkan ke bawah; env SEKARANG=ISO untuk uji ulang."""
    s = os.environ.get("SEKARANG")
    t = dari_iso(s) if s else dt.datetime.now(dt.timezone.utc)
    return t.replace(minute=0, second=0, microsecond=0)


def hari_wib(t):
    return t.astimezone(WIB).date().isoformat()


def log(*a):
    print(*a, file=sys.stderr)


def uji():
    assert [status(v) for v in (0, 55.4, 55.5, 150.4, 150.5, 250.4, 250.5, None)] == \
        ["normal", "normal", "waspada", "waspada", "siaga", "siaga", "awas", None]
    for salah in (-1, float("nan"), "50"):
        try:
            status(salah)
            raise AssertionError(f"status({salah!r}) harus ditolak")
        except ValueError:
            pass
    assert abs(jarak_km(0, 0, 0, 1) - 111.2) < .2 and jarak_km(-3, 104, -3, 104) == 0
    t = dari_iso("2026-10-18T17:30Z")
    assert iso(t) == "2026-10-18T17:30Z" and hari_wib(t) == "2026-10-19" and iso(dari_iso("2026-10-18T03:00")) == "2026-10-18T03:00Z"
    global JEDA
    JEDA, rahasia = 0, "TOKENRAHASIA123"
    try:   # port tertutup di mesin sendiri: gagal cepat, tanpa jaringan luar
        ambil(f"http://127.0.0.1:9/map/bounds?latlng=1&token={rahasia}", timeout=2, rahasia=(rahasia,))
        raise AssertionError("ambil harus gagal")
    except RuntimeError as e:
        assert rahasia not in str(e) and "token" not in str(e) and e.__cause__ is None and e.__suppress_context__, str(e)
    print("alat uji: lulus")


if __name__ == "__main__":
    uji()
