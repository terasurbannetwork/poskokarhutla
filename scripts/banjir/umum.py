"""Bersama: unduh dengan coba-ulang, simpan JSON ringkas, WIB, kisi darat."""
import datetime as dt, json, os, sys, time, urllib.error, urllib.parse, urllib.request

sys.path.insert(0, os.path.dirname(__file__))
from wilayah import AKAR

KELUAR = os.path.join(AKAR, "public/banjir/data")
MENTAH = os.path.join(AKAR, "data/raw/banjir")
WIB = dt.timezone(dt.timedelta(hours=7))


class KuotaHabis(RuntimeError):
    """Open-Meteo menolak karena kuota jam/harian habis: menunggu di sini tidak menolong, berhenti dan lanjutkan nanti."""


def ambil(url, data=None, coba=5, batas_waktu=180, kepala=None):
    """GET (atau POST bila data) -> JSON. 429 menunggu makin lama (kuota menit/jam Open-Meteo); galat lain 10, 20, 30 dtk."""
    if isinstance(data, dict):
        data = urllib.parse.urlencode(data).encode()
    for i in range(coba):
        try:
            req = urllib.request.Request(url, data=data, headers={"User-Agent": "poskobanjir/1.0", **(kepala or {})})
            with urllib.request.urlopen(req, timeout=batas_waktu) as r:
                return json.loads(r.read())
        except urllib.error.HTTPError as e:
            alasan = e.read().decode(errors="replace")[:300]
            if e.code == 429 and ("Daily" in alasan or "Hourly" in alasan):
                raise KuotaHabis(alasan)
            if i == coba - 1 or (400 <= e.code < 500 and e.code != 429):  # 404/400 tidak sembuh dengan menunggu
                raise RuntimeError(f"{url.split('?')[0]}: HTTP {e.code} {alasan}")
            tunggu = 65 * (i + 1) if e.code == 429 else 10 * (i + 1)
            print(f"  HTTP {e.code}, tunggu {tunggu} dtk: {alasan[:120]}", file=sys.stderr)
            time.sleep(tunggu)
        except Exception as e:
            if i == coba - 1:
                raise RuntimeError(f"{url.split('?')[0]}: {e}")
            time.sleep(10 * (i + 1))


def simpan(jalur, isi):
    os.makedirs(os.path.dirname(jalur), exist_ok=True)
    with open(jalur, "w") as f:
        json.dump(isi, f, ensure_ascii=False, separators=(",", ":"))


def baca(jalur, bawaan=None):
    return json.load(open(jalur)) if os.path.exists(jalur) else bawaan


def grid_darat(w, sel=0.25):
    """Pusat sel kisi `sel` derajat di atas Indonesia yang darat: pusatnya atau salah satu dari 4 titik geser
    +-0,08 derajat jatuh di kecamatan. -> [(lat, lon, kode_prov)]"""
    titik = []
    lat = -11.0 - sel / 2
    while lat <= 6.5:
        lon = 94.75 + sel / 2
        while lon <= 141.5:
            adm = next((a for a in (w.cari(lon + dx, lat + dy) for dx, dy in
                                    ((0, 0), (.08, 0), (-.08, 0), (0, .08), (0, -.08))) if a), None)
            if adm:
                titik.append((round(lat, 3), round(lon, 3), adm[0]))
            lon += sel
        lat += sel
    return titik


def per_lokasi(data):
    """Open-Meteo mengembalikan objek tunggal untuk satu lokasi dan daftar untuk banyak lokasi."""
    return data if isinstance(data, list) else [data]
