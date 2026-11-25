#!/usr/bin/env python3
"""KI-26: pembanding luar NASA LHASA v2 (Global Landslide Nowcast, GES DISC). Python stdlib saja.

Tugas: nilai arsip harian NASA pada label/tahun uji_balik.json (2022, 2023, 2025), deskriptif. SYARAT: arsip harian terunduh tanpa kredensial,
beririsan dengan tahun uji, dan <= 200 MB. `probe` menanyakan katalog CMR publik (tanpa kredensial) dan memeriksa syarat itu;
bila tak terpenuhi, `tulis` mencatat pembanding_luar = DITUTUP berikut buktinya di public/longsor/data/uji_balik.json (tanpa menyentuh kunci lain).

  python3 -I scripts/longsor/lhasa_nasa.py probe   # 2 permintaan HTTP ke cmr.earthdata.nasa.gov
  python3 -I scripts/longsor/lhasa_nasa.py tulis   # probe + tulis pembanding_luar
  python3 -I scripts/longsor/lhasa_nasa.py uji
"""
import json, os, sys, urllib.request

AKAR = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "../.."))
UJI_BALIK = os.path.join(AKAR, "public/longsor/data/uji_balik.json")
CMR = "https://cmr.earthdata.nasa.gov/search/granules.json?short_name=Global_Landslide_Nowcast&page_size=1&sort_key=-start_date"
TAHUN_UJI = (2022, 2023, 2025)
BATAS_MB = 200


def ambil_json(url):
    with urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": "poskokarhutla-longsor/1.0"}), timeout=30) as r:
        return r.status, json.load(r)


def putusan(terakhir_tgl, ukuran_mb, tahun_uji=TAHUN_UJI):
    """-> (bisa, alasan). Fungsi murni."""
    alasan = []
    if int(terakhir_tgl[:4]) < min(tahun_uji):
        alasan.append(f"granule terakhir {terakhir_tgl}: tidak beririsan dengan tahun uji {list(tahun_uji)}")
    if ukuran_mb > BATAS_MB:
        alasan.append(f"satu granule harian global {ukuran_mb:.0f} MB > {BATAS_MB} MB (hari-hari uji >= 3 x 365 granule)")
    return (not alasan), "; ".join(alasan) or "syarat terpenuhi (akses tanpa kredensial belum diuji)"


def probe():
    st, d = ambil_json(CMR)
    g = d["feed"]["entry"][0]
    tgl, mb = g["time_start"][:10], float(g["granule_size"])
    bisa, alasan = putusan(tgl, mb)
    return {"status": "DAPAT DINILAI" if bisa else "DITUTUP", "alasan": alasan, "http": st, "sumber": CMR,
            "koleksi": "Global_Landslide_Nowcast 2.0.0 (GES DISC, C2654319036-GES_DISC)", "granule_terakhir": g["producer_granule_id"],
            "tanggal_granule_terakhir": tgl, "ukuran_granule_mb": round(mb, 1),
            "akses": "data.gesdisc.earthdata.nasa.gov/data/Landslide/...: HEAD -> 303 ke penyimpan terproteksi (Earthdata); tak dicoba unduh penuh",
            "dicek": "2026-11-25", "catatan": "deskriptif, bukan vonis baru; tidak memakai label/periode PRAREG-LHASA2"}


def tulis():
    h = probe()
    d = json.load(open(UJI_BALIK))
    d["pembanding_luar"] = {"nasa_lhasa_v2": h}
    with open(UJI_BALIK + ".tmp", "w") as f:
        json.dump(d, f, ensure_ascii=False, separators=(",", ":"))
    os.replace(UJI_BALIK + ".tmp", UJI_BALIK)
    print(h["status"], "-", h["alasan"])


def uji():
    assert putusan("2021-02-09", 444.0)[0] is False
    assert "tidak beririsan" in putusan("2021-02-09", 10)[1]
    assert putusan("2025-12-31", 10)[0] is True
    assert putusan("2025-12-31", 444)[0] is False
    print("lhasa_nasa uji lolos")


if __name__ == "__main__":
    {"probe": lambda: print(json.dumps(probe(), indent=1)), "tulis": tulis, "uji": uji}.get(sys.argv[1] if len(sys.argv) > 1 else "uji", uji)()
