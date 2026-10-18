"""Gelombang laut per titik pesisir -> public/banjir/data/cuaca_gelombang.json

Open-Meteo Marine (cell_selection=sea), 72 jam dari 00:00 UTC hari ini, di titik pelabuhan (cuaca_sarana.json) dan titik rob banjir (rob.json).
hs dalam dm (0,1 m) per jam, arah dalam derajat tiap 3 jam. Titik yang seluruh nilainya kosong (sel laut tak ada) dibuang.
Pakai: python3 scripts/cuaca/gelombang.py   |   python3 scripts/cuaca/gelombang.py uji
"""
import os, sys, urllib.parse

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from dasar import KELUAR, ambil, baca, sekarang, simpan

MARINE = "https://marine-api.open-meteo.com/v1/marine"
N = 72


def titik_sumber():
    """[(lat, lon, prov, nama)] dari pelabuhan + rob.json, tanpa duplikat (dibulatkan 0,05 derajat)."""
    out, lihat = [], set()
    sar = baca(os.path.join(KELUAR, "cuaca_sarana.json")) or {}
    for n, la, lo, p, _ in sar.get("pelabuhan", []):
        out.append((la, lo, p, n))
    rob = baca(os.path.join(KELUAR, "rob.json")) or {}
    kode = {v: k for k, v in (baca(os.path.join(KELUAR, "meta.json")) or {}).get("provinsi", {}).items()}
    for t in rob.get("titik", []):
        out.append((t["lat"], t["lon"], kode.get(t.get("prov"), ""), t.get("kec")))
    res = []
    for r in out:
        k = (round(r[0] / .05), round(r[1] / .05))
        if k not in lihat and r[2]:
            lihat.add(k)
            res.append(r)
    return res


def olah(src, resp):
    """src = (lat, lon, prov, nama); resp = respons Marine satu titik -> baris titik atau None bila tanpa data."""
    h = resp.get("hourly") or {}
    hs, ar = h.get("wave_height") or [], h.get("wave_direction") or []
    if len(hs) < N or all(x is None for x in hs[:N]):
        return None
    d = [None if x is None else int(round(x * 10)) for x in hs[:N]]
    a = [None if x is None else int(round(x)) for x in ar[:N:3]]
    return [round(src[0], 3), round(src[1], 3), src[2], src[3], d, a, max(x for x in d if x is not None)]


def main():
    src = titik_sumber()
    if not src:
        raise RuntimeError("gelombang: tidak ada titik (cuaca_sarana.json kosong)")
    baris, t0 = [], None
    for a in range(0, len(src), 50):
        b = src[a:a + 50]
        q = {"latitude": ",".join(f"{s[0]:.4f}" for s in b), "longitude": ",".join(f"{s[1]:.4f}" for s in b), "hourly": "wave_height,wave_direction",
             "cell_selection": "sea", "forecast_days": 3, "timezone": "UTC"}
        res = ambil(MARINE + "?" + urllib.parse.urlencode(q))
        for s, x in zip(b, res if isinstance(res, list) else [res]):
            r = olah(s, x)
            if r:
                baris.append(r)
                t0 = t0 or x["hourly"]["time"][0]
    if not baris:
        raise RuntimeError("gelombang: semua titik tanpa data")
    simpan(os.path.join(KELUAR, "cuaca_gelombang.json"), {"dibuat": sekarang(), "t0": t0 + ":00Z", "n": N, "titik": baris,
                                                           "sumber": "Open-Meteo Marine (model gelombang), titik pelabuhan dan pesisir rob"})
    print(f"cuaca gelombang: {len(baris)}/{len(src)} titik, hs maks {max(r[6] for r in baris) / 10:g} m", file=sys.stderr)


def uji():
    s = (1.23456, 100.5, "14", "X")
    assert olah(s, {"hourly": {"wave_height": [None] * N, "wave_direction": [None] * N}}) is None
    assert olah(s, {"hourly": {"wave_height": [1.26] * N, "wave_direction": [200.4] * N}}) == [1.235, 100.5, "14", "X", [13] * N, [200] * (N // 3), 13]
    r = olah(s, {"hourly": {"wave_height": [None] + [2.0] * (N - 1), "wave_direction": [None] * N}})
    assert r[4][0] is None and r[6] == 20
    print("ok gelombang")


if __name__ == "__main__":
    uji() if sys.argv[1:] == ["uji"] else main()
