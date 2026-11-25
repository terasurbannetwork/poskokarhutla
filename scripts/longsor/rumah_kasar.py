"""KI-76: pengganti tahap besaran model_dampak.py (pensiun, kalah dari median). Perkiraan kasar rumah rusak per kejadian longsor
= median DIBI per provinsi; di layar dikali peluang kejadian (P x median). Hanya hari-kab ber-rumah-rusak > 0 dihitung
(0 DIBI = mungkin tak tercatat, bukan nol); provinsi < MIN_N hari = null ("belum cukup data"), tidak pernah 0.
Pakai: python3 scripts/longsor/rumah_kasar.py [uji]   (masukan data/raw/longsor/dibi_rumah.json dari `model_dampak.py ambil`)"""
import json, os, statistics, sys, datetime as dt
AKAR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
MASUKAN = os.path.join(AKAR, "data/raw/longsor/dibi_rumah.json")
KELUAR = os.path.join(AKAR, "public/longsor/data/rumah_kasar.json")
MIN_N = 10
LABEL = "perkiraan kasar, belum teruji"


def hitung(baris):
    per = {}
    for k, (n, rumah) in baris.items():
        if n and rumah > 0:
            per.setdefault(k.split("|")[0], []).append(rumah)
    prov = {}
    for p, v in sorted(per.items()):
        if len(v) < MIN_N:
            prov[p] = {"median_rumah": None, "n_hari": len(v), "alasan": "belum cukup data"}
        else:
            q = statistics.quantiles(v, n=4)
            prov[p] = {"median_rumah": statistics.median(v), "p25": q[0], "p75": q[2], "n_hari": len(v)}
    return {"label": LABEL, "rumus": "peluang kejadian x median rumah rusak per kejadian per provinsi (DIBI, hanya hari tercatat > 0)",
            "catatan": "pengganti tahap besaran model_dampak.py yang kalah dari median; bukan prediksi, bukan 'aman'; kosong bukan nol", "provinsi": prov}


def uji():
    b = {f"A|k|d{i}": [1, i + 1] for i in range(11)}
    b.update({f"B|k|d{i}": [1, 5] for i in range(3)})
    b["C|k|x"] = [1, 0]
    r = hitung(b)["provinsi"]
    assert r["A"]["median_rumah"] == 6 and r["B"]["median_rumah"] is None and "C" not in r
    print("rumah_kasar uji ok")


if __name__ == "__main__":
    if sys.argv[1:] == ["uji"]:
        uji()
    else:
        o = hitung(json.load(open(MASUKAN))["baris"]); o["dibuat"] = dt.date.today().isoformat()
        json.dump(o, open(KELUAR, "w"), ensure_ascii=False, separators=(",", ":"))
        print(len(o["provinsi"]), "provinsi ->", KELUAR)
