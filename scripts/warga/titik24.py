"""Titik panas 24 jam terakhir, ringkas, untuk lencana "terkonfirmasi satelit" Lapor Warga.

Baca public/data/kluster.json (api24 per kompleks -> id kompleks) dan public/data/hotspot.json (kolom jam = jam relatif
terhadap 'acuan'), buang duplikat per kotak 0,005 derajat (~500 m), tulis public/data/titik24.json:
  {"acuan": iso, "laci": ["K0001", ...], "titik": [[lat, lon, indeks_laci_atau_-1], ...]}
Worker (src/worker.js) mencari titik <= 2 km dari laporan api. Jalankan setelah firms/harian di pipeline data.
"""
import json
import pathlib

D = pathlib.Path(__file__).resolve().parents[2] / "public" / "data"


def main():
    hs = json.loads((D / "hotspot.json").read_text())
    kl = json.loads((D / "kluster.json").read_text())
    laci, titik, sudah = [], [], set()

    def tambah(la, lo, k):
        kunci = (round(la / 0.005), round(lo / 0.005))
        if kunci in sudah:
            return
        sudah.add(kunci)
        titik.append([round(la, 4), round(lo, 4), k])

    for f in kl["features"]:
        p = f["properties"]
        if not p.get("api24"):
            continue
        laci.append(p["id"])
        for lo, la in p["api24"]:
            tambah(la, lo, len(laci) - 1)
    k = hs["kolom"]
    i_lat, i_lon, i_jam = k.index("lat"), k.index("lon"), k.index("jam")
    for r in hs["baris"]:
        if r[i_jam] >= -24:
            tambah(r[i_lat], r[i_lon], -1)
    (D / "titik24.json").write_text(json.dumps({"acuan": hs["acuan"], "laci": laci, "titik": titik}, separators=(",", ":")))
    print(f"titik24: {len(titik)} titik, {len(laci)} kompleks, acuan {hs['acuan']}")


if __name__ == "__main__":
    main()
