"""Turunkan kunci HMAC alat dari kunci induk: kunci_alat = HMAC-SHA256(SENSOR_KUNCI_INDUK, alat_id) heks huruf kecil.
Kunci ini dipakai sebagai kunci penanda badan (penanda.tanda) dan ditempel ke config.h (KUNCI_HMAC) / gateway.json.
Kunci induk HANYA dari lingkungan (export SENSOR_KUNCI_INDUK=...), tidak pernah dicetak.

  python3 sensor/gateway/kunci_alat.py TMA-BJN-01              # cetak kunci alat (--tulis-config tak ada: salin manual)
  python3 sensor/gateway/kunci_alat.py TMA-BJN-01 --config sensor/firmware/tma/include/config.h   # isi KUNCI_HMAC di config.h
"""
import argparse
import hashlib
import hmac
import os
import re
import sys


def kunci_alat(induk, alat_id):
    if not induk:
        raise ValueError("SENSOR_KUNCI_INDUK kosong")
    return hmac.new(induk.encode("utf-8"), alat_id.encode("utf-8"), hashlib.sha256).hexdigest()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("alat")
    ap.add_argument("--config", help="config.h yang KUNCI_HMAC-nya diisi (kunci tidak dicetak)")
    a = ap.parse_args()
    try:
        k = kunci_alat(os.environ.get("SENSOR_KUNCI_INDUK", ""), a.alat)
    except ValueError as e:
        sys.exit(str(e))
    if not a.config:
        return print(k)
    t = open(a.config, encoding="utf-8").read()
    t, n = re.subn(r'(#define\s+KUNCI_HMAC\s+)"[^"]*"', lambda m: m.group(1) + '"' + k + '"', t)
    t = re.sub(r'(#define\s+ALAT_ID\s+)"[^"]*"', lambda m: m.group(1) + '"' + a.alat + '"', t)
    if n != 1:
        sys.exit("KUNCI_HMAC tidak ditemukan di " + a.config)
    open(a.config, "w", encoding="utf-8").write(t)
    print("config.h terisi untuk", a.alat)


if __name__ == "__main__":
    main()
