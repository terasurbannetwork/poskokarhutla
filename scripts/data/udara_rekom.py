"""Rekomendasi pangkalan helikopter water bombing dan pesawat modifikasi cuaca (OMC) -> public/data/udara_rekom.json

Helikopter: kandidat = bandara/pangkalan militer di mana pun (boleh lintas provinsi; butuh Avtur, jadi helipad tanpa
bandara tidak dipakai sebagai pangkalan). Per provinsi prioritas, greedy: pilih bandara yang menjangkau bobot kompleks
prioritas/siaga terbesar dalam RADIUS_HELI km, ulangi sampai >= 90% bobot terjangkau (maks 3 pangkalan per provinsi).
Waktu terbang = jarak / 200 km/jam. Siklus siram (menit) = 2,5 + 0,8 x jarak ke sumber air (km), asumsi sumber air 5 km
(estimasi dari riset pemakaian bucket; diganti jarak nyata ke sungai/danau bila data air OSM tersedia).
Pangkalan aju helikopter: kompleks prioritas yang > RADIUS_HELI dari pangkalan utama terpilih diberi landasan kecil /
helipad terdekat (<= 60 km) sebagai titik isi ulang; Avtur dikirim lewat darat.
OMC: bandara dengan landasan >= 1.000 m (CN-295 butuh ~962 m), satu per provinsi, terdekat ke pusat bobot api.
"""
import json, math, os, sys

sys.path.insert(0, os.path.dirname(__file__))
from posko import km, pilih
from wilayah import AKAR, PRIORITAS, PROVINSI

DATA = os.path.join(AKAR, "public/data")
RADIUS_HELI, LAJU_HELI, JARAK_AIR = 100.0, 200.0, 5.0
BASIS = {"bandara_besar", "bandara_sedang", "bandara_kecil", "pangkalan_militer"}


def siklus(jarak_air_km=JARAK_AIR):
    return 2.5 + 0.8 * jarak_air_km


def main():
    udara = json.load(open(os.path.join(DATA, "udara.json")))
    kand = [u for u in udara if u["jenis"] in BASIS and (u.get("landasan_m") or 0) >= 800]
    fitur = json.load(open(os.path.join(DATA, "kluster.json")))["features"]
    heli, omc, aju = [], [], []
    kecil = [u for u in udara if u["jenis"] in BASIS | {"helipad", "landasan_perintis"}]
    for prov in PRIORITAS:
        kom = [{"id": f["properties"]["id"], "lat": f["properties"]["lat"], "lon": f["properties"]["lon"],
                "w": (3 if f["properties"]["level"] == 3 else 0.3) * max(1, f["properties"]["px24"]), "lv": f["properties"]["level"]}
               for f in fitur if f["properties"]["prov"] == prov and f["properties"]["level"] >= 2]
        if not kom:
            continue
        total = sum(k["w"] for k in kom)
        pilihan, _ = pilih(kom, kand, RADIUS_HELI)
        kena = 0
        for i, (b, ikut) in enumerate(pilihan):
            if i >= 3 or kena >= 0.9 * total:
                break
            kena += sum(k["w"] for k in ikut)
            j = [km(b["lat"], b["lon"], k["lat"], k["lon"]) for k in ikut]
            heli.append({"prov": prov, "nama": b["nama"], "icao": b.get("icao"), "kab": b.get("kab"), "prov_bandara": b.get("prov"),
                         "lat": b["lat"], "lon": b["lon"], "landasan_m": b.get("landasan_m"), "jenis": b["jenis"],
                         "kompleks": len(ikut), "prioritas": sum(1 for k in ikut if k["lv"] == 3),
                         "jarak_rata": round(sum(j) / len(j)), "terbang_menit_rata": round(sum(j) / len(j) / LAJU_HELI * 60),
                         "cakupan": round(kena / total * 100), "siklus_menit": round(siklus(), 1), "siram_per_jam": round(60 / siklus(), 1)})
        # kompleks prioritas di luar jangkauan pangkalan utama terpilih -> pangkalan aju
        utama = [h for h in heli if h["prov"] == prov]
        for k in kom:
            if k["lv"] < 3 or any(km(k["lat"], k["lon"], h["lat"], h["lon"]) <= RADIUS_HELI for h in utama):
                continue
            c = min(kecil, key=lambda u: km(k["lat"], k["lon"], u["lat"], u["lon"]))
            d = km(k["lat"], k["lon"], c["lat"], c["lon"])
            if d > 60:
                continue
            ada = next((a for a in aju if a["nama"] == (c["nama"] or "Helipad") and abs(a["lat"] - c["lat"]) < 1e-6), None)
            if ada:
                ada["kompleks"].append(k["id"]); continue
            dh = min((km(c["lat"], c["lon"], h["lat"], h["lon"]) for h in utama), default=None)
            aju.append({"prov": prov, "nama": c["nama"] or "Helipad", "jenis": c["jenis"], "lat": c["lat"], "lon": c["lon"],
                        "kompleks": [k["id"]], "jarak_api": round(d), "ke_utama_km": dh and round(dh)})
        bw = total
        la, lo = sum(k["lat"] * k["w"] for k in kom) / bw, sum(k["lon"] * k["w"] for k in kom) / bw
        o = [u for u in kand if (u.get("landasan_m") or 0) >= 1000]
        b = min(o, key=lambda u: km(la, lo, u["lat"], u["lon"]))
        omc.append({"prov": prov, "nama": b["nama"], "icao": b.get("icao"), "lat": b["lat"], "lon": b["lon"], "landasan_m": b.get("landasan_m"),
                    "jarak_ke_pusat_api": round(km(la, lo, b["lat"], b["lon"]))})
    with open(os.path.join(DATA, "udara_rekom.json"), "w") as f:
        json.dump({"radius_heli_km": RADIUS_HELI, "laju_heli_kmj": LAJU_HELI, "asumsi_jarak_air_km": JARAK_AIR,
                   "heli": heli, "aju": aju, "omc": omc}, f, ensure_ascii=False, separators=(",", ":"))
    for h in heli:
        print(PROVINSI[h["prov"]], "heli:", h["nama"], h["icao"], f'{h["kompleks"]} cluster ({h["prioritas"]} prio), {h["terbang_menit_rata"]} mnt, cakupan {h["cakupan"]}%', file=sys.stderr)
    for a in aju:
        print(PROVINSI[a["prov"]], "aju:", a["nama"], a["jenis"], len(a["kompleks"]), "cluster prioritas,", a["jarak_api"], "km", file=sys.stderr)
    for o in omc:
        print(PROVINSI[o["prov"]], "OMC:", o["nama"], o["icao"], o["landasan_m"], "m", file=sys.stderr)


if __name__ == "__main__":
    if sys.argv[1:] == ["uji"]:
        assert abs(siklus(5) - 6.5) < 1e-9 and round(60 / siklus(2), 1) == 14.6
        print("ok")
    else:
        main()
