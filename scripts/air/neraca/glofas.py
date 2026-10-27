"""NA-06b GloFAS v4 (Open-Meteo flood API) debit harian di muara sungai besar Jawa -> data/kajian-bnpb/neraca-air/mentah/glofas_muara.json.
Tiap muara: kisi (2n+1)^2 titik 0,05 derajat di sekitar koordinat perkiraan; dipakai sel dengan debit rerata terbesar (sel sungai).
Pakai: python3 glofas.py tarik | uji"""
import json, os, subprocess, sys, time, urllib.parse

DIR = os.path.dirname(os.path.abspath(__file__))
AKAR = os.path.abspath(os.path.join(DIR, "../../.."))
KELUAR = os.path.join(AKAR, "data/kajian-bnpb/neraca-air/mentah/glofas_muara.json")
URL = "https://flood-api.open-meteo.com/v1/flood?"
# nama: (id sub-DAS muara model di topologi.json, lat, lon perkiraan muara, setengah lebar kisi 0,05 derajat)
MUARA = {
    "Bengawan Solo": ("5090010700", -6.90, 112.55, 3), "Brantas (Porong)": ("5090010810", -7.55, 112.88, 3),
    "Citarum": ("5090009500", -6.03, 107.20, 5), "Citanduy": ("5090008500", -7.68, 108.80, 3),
    "Serayu": ("5090008440", -7.68, 109.10, 3), "Cimanuk": ("5090009760", -6.33, 108.35, 3),
    "Jratunseluna (Serang-Lusi-Juwana)": ("5090010420", -6.90, 110.60, 4), "Progo": ("5090008250", -7.95, 110.20, 3),
    "Ciujung": ("5090009300", -6.03, 106.22, 3), "Cisadane": ("5090009400", -6.00, 106.65, 3),
    "Pemali": ("5090009960", -6.85, 109.03, 3), "Opak-Oyo": ("5090008230", -8.01, 110.30, 1),
}
AWAL, AKHIR = "1991-01-01", "2024-12-31"


def kisi(lat, lon, n):
    return [(round(lat + a * 0.05, 3), round(lon + b * 0.05, 3)) for a in range(-n, n + 1) for b in range(-n, n + 1)]


def curl_json(q, maks=180):
    for coba in range(1, 4):
        try:
            r = subprocess.run(["curl", "-s", "--max-time", str(maks), "-f", URL + urllib.parse.urlencode(q, safe=",")], capture_output=True, timeout=maks + 20)
            d = json.loads(r.stdout)
            return d if isinstance(d, list) else [d]
        except Exception as e:
            print(f"  gagal percobaan {coba}: {str(e)[:100]}", file=sys.stderr, flush=True)
            time.sleep(30 * coba)
    return None


def tarik():
    """langkah 1: kisi di sekitar muara, hanya tahun 2020 (murah) -> sel sungai = debit rerata terbesar; langkah 2: deret penuh sel itu"""
    cache = json.load(open(KELUAR)) if os.path.exists(KELUAR) else {}
    for nama, (sid, lat, lon, n) in MUARA.items():
        if nama in cache:
            continue
        pts = kisi(lat, lon, n)
        d = curl_json({"latitude": ",".join(str(p[0]) for p in pts), "longitude": ",".join(str(p[1]) for p in pts),
                       "daily": "river_discharge", "start_date": "2020-01-01", "end_date": "2020-12-31"})
        if d is None:
            continue
        best = max(d, key=lambda x: sum(v for v in x["daily"]["river_discharge"] if v is not None))
        time.sleep(3)
        d2 = curl_json({"latitude": best["latitude"], "longitude": best["longitude"], "daily": "river_discharge", "start_date": AWAL, "end_date": AKHIR})
        if d2 is None:
            continue
        q_ = d2[0]["daily"]["river_discharge"]
        cache[nama] = {"subdas": sid, "lat": best["latitude"], "lon": best["longitude"], "waktu": d2[0]["daily"]["time"], "q": q_}
        json.dump(cache, open(KELUAR, "w"), separators=(",", ":"))
        print(f"  {nama}: sel {best['latitude']},{best['longitude']} rerata {sum(v for v in q_ if v is not None) / len(q_):.1f} m3/s", file=sys.stderr, flush=True)
        time.sleep(3)
    print(f"GloFAS {len(cache)}/{len(MUARA)} muara", file=sys.stderr)


def uji():
    k = kisi(0, 0, 2)
    assert len(k) == 25 and (0.0, 0.0) in k and len({p for p in k}) == 25
    assert all(len(v) == 4 for v in MUARA.values())
    print("ok glofas")


if __name__ == "__main__":
    uji() if sys.argv[1:] == ["uji"] else tarik() if sys.argv[1:] == ["tarik"] else sys.exit(__doc__)
