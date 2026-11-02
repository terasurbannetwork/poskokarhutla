"""Simulator sensor tanpa perangkat keras. Tiap nilai dilewatkan kodek biner (kuantisasi sama dengan alat asli)
lalu dikirim bertanda tangan ke /api/sensor/baca.

  python3 sensor/sim/simulasi.py --skenario tma_banjir --alat TMA-DEMO-01 --kunci rahasia-demo
  python3 sensor/sim/simulasi.py --daftar
Waktu dalam badan = jam nyata saat kirim (worker menolak selisih > 10 menit); waktu simulasi hanya
menggerakkan deret, dimampatkan lewat --jeda (detik nyata antar bacaan).
"""
import argparse
import math
import os
import random
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
from sensor import payload  # noqa: E402
from sensor.gateway.penanda import badan_json, iso, post_http, tanda  # noqa: E402

LANGKAH_MENIT = 5     # satu bacaan simulasi = 5 menit waktu simulasi


def _tma(n, naik_dari, rng):
    h = 120.0
    for i in range(n):
        t = i * LANGKAH_MENIT / 60
        laju = 0 if i < naik_dari else min(15 + 10 * (i - naik_dari) * 0.35, 75)   # cm/jam, makin curam lalu jenuh
        h += laju * LANGKAH_MENIT / 60 + rng.gauss(0, 0.3)
        yield {"tinggi_cm": round(h, 1), "laju_cm_jam": round(laju + rng.gauss(0, 0.5), 1), "n": 9}


def _hujan(n, lebat_dari, rng):
    jam = []
    for i in range(n):
        lebat = lebat_dari is not None and i >= lebat_dari
        mm5 = rng.uniform(2.5, 4.5) if lebat else (0.2 if rng.random() < 0.05 else 0.0)
        jam.append(mm5)
        mm60 = sum(jam[-12:])
        yield {"mm10": round(sum(jam[-2:]), 1), "mm60": round(mm60, 1), "tips": int(sum(jam) / 0.2) & 0xFFFF}


def _longsor(n, mulai, rng):
    g, riwayat = 0.0, []
    for i in range(n):
        if i >= mulai:                                    # rayapan 0,3 -> 1 mm/jam, lalu percepatan eksponensial
            k = i - mulai
            laju_sejati = 0.3 + 0.01 * k if k < 60 else 0.9 * math.exp(0.08 * (k - 60))
            g += laju_sejati * LANGKAH_MENIT / 60
        g += rng.gauss(0, 0.02)
        riwayat.append(g)
        laju = (riwayat[-1] - riwayat[max(0, len(riwayat) - 3)]) / (min(2, len(riwayat) - 1) * LANGKAH_MENIT / 60) if len(riwayat) > 1 else 0
        yield {"geser_mm": round(max(g, 0), 1), "laju_mm_jam": round(laju, 1), "miring_x": round(g * 0.02, 2),
               "miring_y": round(g * 0.01, 2), "lembap": min(100, int(55 + g * 0.3 + rng.uniform(-1, 1))), "sirene": 0}


def _gambut(n, kering, rng):
    cm = -12.0
    for i in range(n):
        cm += (-0.55 if kering else 0.0) + rng.gauss(0, 0.15)
        yield {"muka_air_cm": round(cm, 1), "lembap": max(5, min(100, int(60 + cm * 0.6 + rng.uniform(-1, 1))))}


def _gas(n, asap_dari, rng):
    for i in range(n):
        k = 0 if asap_dari is None or i < asap_dari else i - asap_dari
        yield {"co_ppm": round(1.2 + rng.uniform(-0.3, 0.3) + (4 * k if k else 0), 1),
               "pm25": round(18 + rng.uniform(-3, 3) + (12 * k if k else 0), 1),
               "pm10": round(25 + rng.uniform(-4, 4) + (14 * k if k else 0), 1)}


SKENARIO = {   # nama -> (jenis, pembuat deret, jumlah bacaan default, argumen awal kejadian)
    "tma_normal": ("tma", _tma, 48, 10**6),
    "tma_banjir": ("tma", _tma, 48, 12),
    "hujan_normal": ("hujan", _hujan, 48, None),
    "hujan_lebat": ("hujan", _hujan, 48, 12),
    "longsor_normal": ("longsor", _longsor, 144, 10**6),
    "longsor_rayapan": ("longsor", _longsor, 144, 20),
    "gambut_basah": ("gambut", _gambut, 60, False),
    "gambut_kering": ("gambut", _gambut, 60, True),
    "gas_normal": ("gas", _gas, 48, None),
    "gas_asap": ("gas", _gas, 48, 12),
}


def deret(nama, n=None, seed=7):
    """Daftar nilai (sudah melewati kodek biner) untuk satu skenario. Deterministik per seed."""
    jenis, f, n0, arg = SKENARIO[nama]
    out = []
    for i, v in enumerate(f(n or n0, arg, random.Random(seed))):
        out.append(payload.decode(payload.encode(jenis, i, 3.9, v))["nilai"])
    return jenis, out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--skenario", default="tma_banjir")
    ap.add_argument("--alat", default="SIM-01")
    ap.add_argument("--kunci", default=os.environ.get("SENSOR_KUNCI", "kunci-demo"))
    ap.add_argument("--url", default="http://localhost:8788/api/sensor/baca")
    ap.add_argument("--jeda", type=float, default=1.0, help="detik nyata antar bacaan (>=1 agar waktu tak kembar)")
    ap.add_argument("--n", type=int)
    ap.add_argument("--daftar", action="store_true")
    ap.add_argument("--kering", action="store_true", help="cetak badan bertanda tanpa mengirim")
    a = ap.parse_args()
    if a.daftar:
        return print("\n".join("%-16s %s" % (k, v[0]) for k, v in SKENARIO.items()))
    jenis, seri = deret(a.skenario, a.n)
    for i, nilai in enumerate(seri):
        p = {"alat": a.alat, "waktu": iso(time.time()), "nilai": nilai, "baterai": 3.9, "rssi": -95}
        badan = badan_json(p)
        if a.kering:
            print(badan.decode(), tanda(a.kunci, badan))
            continue
        kode = post_http(a.url, badan, tanda(a.kunci, badan))
        print("%3d %s %s -> HTTP %s" % (i, jenis, nilai, kode or "jaringan gagal"))
        time.sleep(a.jeda)


if __name__ == "__main__":
    main()
