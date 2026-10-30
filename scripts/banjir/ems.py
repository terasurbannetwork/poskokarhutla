"""Copernicus EMS Rapid Mapping: aktivasi publik + kesiapan validasi poligon -> public/banjir/data/ems.json

Jalur akses (diuji 29 Okt 2026, tanpa kunci):
  daftar   GET https://rapidmapping.emergency.copernicus.eu/backend/dashboard-api/public-activations-info/?limit=1000&ordering=-eventTime
           -> 268 aktivasi publik, EMSR656 (24 Mar 2023) sampai EMSR935; tiap entri: kode, negara, kategori, eventTime, centroid, n_aois, n_products.
  rinci    GET .../public-activations/?code=EMSRnnn  -> AOI (WKT), produk (DEL/GRA/REF), tanggal citra, statistik luas; unduhan
           produk lewat downloadPath di rinci (zip shapefile/GeoJSON) bila tersedia.
  Batas    kode < EMSR656 dijawab 403 "Authentication credentials were not provided" dan portal lama
           (emergency.copernicus.eu/mapping/list-of-components/...) 404: arsip sebelum Mar 2023 TIDAK terbuka tanpa akun.
           12 kode di rentang 656..935 (658, 700, 723, 724, 840, 869, 876, 879, 880, 891, 911, 919) juga 403: tidak publik (sensitif).
Temuan: 0 dari 268 aktivasi publik berada di Indonesia (negara terbanyak Yunani 53, Spanyol 33, Jerman 20). Jadi tidak ada poligon
dampak EMS Indonesia untuk memvalidasi model genangan; validasi CSI/POD/FAR dikerjakan terhadap deteksi banjir MODIS (mcdwd_model.py).
Kode ini otomatis menarik poligon begitu ada aktivasi Indonesia (kategori Flood) di daftar publik; `csi_pod_far` siap dipakai oleh
validasi poligon (fungsi murni, swa-uji).

Pakai:  python3 scripts/banjir/ems.py        ambil daftar, tulis ems.json
        python3 scripts/banjir/ems.py uji
Sopan: 1 permintaan daftar per jalan; rinci hanya untuk aktivasi Indonesia, jeda 1 dtk.
Atribusi: Copernicus Emergency Management Service - Rapid Mapping (lisensi Copernicus, bebas dengan atribusi).
"""
import datetime as dt, json, os, sys, time, urllib.request
from collections import Counter

sys.path.insert(0, os.path.dirname(__file__))
from umum import KELUAR, WIB, simpan

API = "https://rapidmapping.emergency.copernicus.eu/backend/dashboard-api/"
UA = "poskobanjir/1.0 (Pantau Bencana; +https://centurisk97.id)"
BERKAS = os.path.join(KELUAR, "ems.json")
ATRIBUSI = "Copernicus Emergency Management Service (c) European Union, Rapid Mapping; ringkasan oleh Pantau Bencana"


def get(path):
    with urllib.request.urlopen(urllib.request.Request(API + path, headers={"User-Agent": UA}), timeout=60) as r:
        return json.loads(r.read())


def csi_pod_far(pred, obs):
    """Dua himpunan sel (set) -> POD = a/(a+c), FAR = b/(a+b), CSI = a/(a+b+c); a kena, b alarm palsu, c luput. None bila penyebut 0."""
    a, b, c = len(pred & obs), len(pred - obs), len(obs - pred)
    bagi = lambda x, y: round(x / y, 4) if y else None
    return {"a": a, "b": b, "c": c, "pod": bagi(a, a + c), "far": bagi(b, a + b), "csi": bagi(a, a + b + c)}


def ringkas(daftar):
    idn = [a for a in daftar if "Indonesia" in a["countries"]]
    return {"n_publik": len(daftar), "dari": min(a["activationTime"] for a in daftar)[:10], "sampai": max(a["activationTime"] for a in daftar)[:10],
            "per_negara_teratas": dict(Counter(c for a in daftar for c in a["countries"]).most_common(8)),
            "per_kategori": dict(Counter(a["category"] for a in daftar).most_common()),
            "aktivasi_indonesia": [{k: a[k] for k in ("code", "name", "category", "eventTime", "activationTime", "n_aois", "n_products")} for a in idn],
            "n_indonesia": len(idn)}


def main():
    d = get("public-activations-info/?limit=1000&offset=0&ordering=-eventTime")
    daftar = d["results"]
    assert d["count"] == len(daftar), (d["count"], len(daftar))
    r = ringkas(daftar)
    for a in r["aktivasi_indonesia"]:        # akan terisi bila Indonesia pernah diaktifkan dalam daftar publik
        time.sleep(1)
        a["rinci"] = [{"aoi": x["name"], "extent": x["extent"], "produk": [(p["type"], p["version"]["deliveryTime"] if p.get("version") else None) for p in x["products"]]}
                      for x in get(f"public-activations/?code={a['code']}")["results"][0]["aois"]]
    isi = {"dibuat": dt.datetime.now(WIB).isoformat(timespec="seconds"), "sumber": API, "atribusi": ATRIBUSI,
           "lisensi": "Copernicus (bebas, atribusi wajib)", **r,
           "akses": {"daftar": "public-activations-info (tanpa kunci)", "rinci": "public-activations/?code=",
                     "batas": "hanya EMSR656+ (Mar 2023+); kode lebih lama 403 tanpa akun; 12 kode di rentang publik juga 403"},
           "keputusan": ("TIDAK ADA LABEL: 0 aktivasi Indonesia pada daftar publik; validasi poligon EMS tidak dapat dikerjakan. "
                         "Pengganti: validasi terhadap deteksi banjir MODIS (mcdwd_model.json)." if not r["n_indonesia"] else
                         "Ada aktivasi Indonesia: unduh produk DEL dan hitung CSI/POD/FAR terhadap genangan model (csi_pod_far).")}
    simpan(BERKAS, isi)
    print(json.dumps({k: isi[k] for k in ("n_publik", "dari", "sampai", "n_indonesia", "keputusan")}, ensure_ascii=False, indent=1))


def uji():
    assert csi_pod_far({1, 2, 3, 4}, {3, 4, 5}) == {"a": 2, "b": 2, "c": 1, "pod": .6667, "far": .5, "csi": .4}
    assert csi_pod_far(set(), set())["csi"] is None and csi_pod_far({1}, {1})["csi"] == 1.0
    r = ringkas([{"countries": ["Indonesia"], "activationTime": "2024-01-02T00:00", "category": "Flood", "code": "E1", "name": "x", "eventTime": "t", "n_aois": 1, "n_products": 1},
                 {"countries": ["Spain"], "activationTime": "2025-01-02T00:00", "category": "Fire"}])
    assert r["n_indonesia"] == 1 and r["dari"] == "2024-01-02" and r["per_kategori"] == {"Flood": 1, "Fire": 1}
    print("ok")


if __name__ == "__main__":
    uji() if sys.argv[1:] == ["uji"] else main()
