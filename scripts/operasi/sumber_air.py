#!/usr/bin/env python3
"""Sumber air untuk water bombing (helibucket) di sekitar tiap base udara, dari OpenStreetMap lewat Overpass.

Pemilik 11 Nov 2026: "renlap ini juga ngasih tau harusnya ambil airnya dimana untuk water bombing".
Yang diambil: natural=water dengan water lake/reservoir/river/oxbow/lagoon (atau tanpa tag water), dan waterway=riverbank,
dengan luas kotak batas minimal LUAS_MIN_HA (perkiraan kasar; kolam ikan kecil dibuang). Titik = pusat badan air.
Ini kandidat dari peta, bukan titik yang sudah dicek pilot: kedalaman, rintangan (kabel, pohon), dan izin tidak diketahui.

  python3 scripts/operasi/sumber_air.py buat [--radius-km 150]   -> public/data/operasi/sumber_air.json
  python3 scripts/operasi/sumber_air.py uji
Base diambil dari renlap terbaru (public/data/operasi/renlap_*.json).
"""
import argparse
import json
import math
import subprocess
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

AKAR = Path(__file__).resolve().parents[2]
KELUAR = AKAR / "public/data/operasi/sumber_air.json"
OVERPASS = "https://overpass-api.de/api/interpreter"
LUAS_MIN_HA = 4.0
JENIS_OK = {"lake", "reservoir", "river", "oxbow", "lagoon", "-"}


def luas_kotak_ha(b):
    """Luas kotak batas (ha), dikali 0,5 sebagai perkiraan badan air tak beraturan."""
    lat = math.radians((b["minlat"] + b["maxlat"]) / 2)
    dy = (b["maxlat"] - b["minlat"]) * 111.32
    dx = (b["maxlon"] - b["minlon"]) * 111.32 * math.cos(lat)
    return dx * dy * 100 * 0.5


def tanya(lat, lon, r_m):
    q = (f'[out:json][timeout:180];(way["natural"="water"](around:{r_m},{lat},{lon});relation["natural"="water"](around:{r_m},{lat},{lon});'
         f'way["waterway"="riverbank"](around:{r_m},{lat},{lon}););out center bb tags;')
    for coba in range(4):
        r = subprocess.run(["curl", "-s", "-m", "200", "-A", "centurisk97-renlap/1", "--data-urlencode", "data=" + q, OVERPASS], capture_output=True, text=True)
        if r.returncode == 0 and r.stdout.startswith("{"):
            return json.loads(r.stdout)["elements"]
        time.sleep(20 * (coba + 1))
    raise RuntimeError("Overpass gagal")


def saring(el):
    out = []
    for e in el:
        t, b = e.get("tags", {}), e.get("bounds")
        if not b:
            continue
        c = e.get("center") or {"lat": (b["minlat"] + b["maxlat"]) / 2, "lon": (b["minlon"] + b["maxlon"]) / 2}   # Overpass "out bb" tanpa center
        jenis = t.get("water", "river" if t.get("waterway") == "riverbank" else "-")
        if jenis not in JENIS_OK:
            continue
        ha = luas_kotak_ha(b)
        if ha < LUAS_MIN_HA:
            continue
        out.append([round(c["lat"], 5), round(c["lon"], 5), jenis, t.get("name") or "", round(ha)])
    return out


def buat(a):
    src = sorted((AKAR / "public/data/operasi").glob("renlap_*.json"))[-1]
    base = json.loads(src.read_text())["base"]
    semua, per = {}, {}
    for b in base:
        el = tanya(b["lat"], b["lon"], int(a.radius_km * 1000))
        titik = saring(el)
        per[b["id"]] = len(titik)
        for t in titik:
            semua[(t[0], t[1])] = t
        print(f"{b['id']}: {len(el)} badan air OSM, {len(titik)} lolos (>= {LUAS_MIN_HA:g} ha)", file=sys.stderr)
        time.sleep(5)
    d = {"dibuat": datetime.now(timezone.utc).isoformat(timespec="minutes"), "sumber": "OpenStreetMap (Overpass), natural=water dan waterway=riverbank",
         "radius_km": a.radius_km, "luas_min_ha": LUAS_MIN_HA, "per_base": per, "kolom": ["lat", "lon", "jenis", "nama", "ha"],
         "catatan": "Kandidat dari peta, bukan titik yang dicek pilot: kedalaman, rintangan, dan izin belum diketahui. Luas = perkiraan dari kotak batas.",
         "titik": sorted(semua.values())}
    KELUAR.write_text(json.dumps(d, ensure_ascii=False, separators=(",", ":")))
    print(f"{len(d['titik'])} titik -> {KELUAR} ({KELUAR.stat().st_size // 1024} KB)", file=sys.stderr)


def uji():
    b = {"minlat": 0.0, "maxlat": 0.001, "minlon": 0.0, "maxlon": 0.001}
    assert 0.6 < luas_kotak_ha(b) < 0.7, luas_kotak_ha(b)   # 111 m x 111 m = 1,24 ha, separuhnya 0,62
    el = [{"tags": {"natural": "water", "water": "pond"}, "bounds": {"minlat": 0, "maxlat": .01, "minlon": 0, "maxlon": .01}, "center": {"lat": 0, "lon": 0}},
          {"tags": {"natural": "water", "water": "lake", "name": "Danau"}, "bounds": {"minlat": 0, "maxlat": .01, "minlon": 0, "maxlon": .01}, "center": {"lat": .005, "lon": .005}},
          {"tags": {"natural": "water"}, "bounds": {"minlat": 0, "maxlat": .0001, "minlon": 0, "maxlon": .0001}, "center": {"lat": 0, "lon": 0}}]
    assert [x[3] for x in saring(el)] == ["Danau"], "kolam dan badan air kecil dibuang"
    print("uji sumber_air: lolos")


if __name__ == "__main__":
    p = argparse.ArgumentParser()
    p.add_argument("aksi", choices=["buat", "uji"])
    p.add_argument("--radius-km", type=float, default=150)
    a = p.parse_args()
    uji() if a.aksi == "uji" else buat(a)
