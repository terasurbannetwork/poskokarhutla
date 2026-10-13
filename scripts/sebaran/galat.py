"""Analisis kesalahan model sel (GBDT) pada titik awal VALIDASI 2023 (dan pustaka kasus bila ada) -> data/raw/sebaran/galat.json

Per titik awal dihitung sisa (residual): log((1+ramalan)/(1+teramati)) luas 72 jam (median Monte Carlo), F1 sel baru 24 jam,
salah arah, salah 'lolos' (lolos terlewat / lolos palsu, ambang P >= 0,5 setelah kalibrasi). Lalu dipecah per variabel
(lahan & konsesi, gambut, provinsi, bulan, FWI/DC/RH/angin, malam, ENSO, jarak jalan/kanal, lintasan tanpa deteksi).
Diagnosis otomatis 15 kasus terburuk:
  lompat   porsi sel baru yang > R (1,9 km) dari sel aktif mana pun -> tak terjangkau model (api loncat / titik baru menyatu)
  celah    lintasan VIIRS tanpa deteksi selama 72 jam padahal api masih menyala sesudahnya (awan/asap/geometri lintasan)
  hujan    hujan >= 5 mm dalam 24 jam namun api tetap tumbuh (gambut membara)
Uji TIDAK disentuh di sini; perbaikan disetel pada validasi lalu uji dibuka sekali di latih_jalan.py.

Pakai:  python3 scripts/sebaran/galat.py   |  ... uji
"""
import json, math, os, pickle, statistics, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import latih as L  # noqa: E402
import latih_jalan as LJ  # noqa: E402
from umum import MENTAH, NX, PROVINSI, ij  # noqa: E402


def lompat(tb, ak, baru, R=5):
    """Porsi sel baru yang berjarak > R sel (Chebyshev) dari semua sel aktif."""
    if not baru:
        return 0.0
    A = [ij(a) for a in ak]
    jauh = sum(1 for k in baru if min(max(abs(ij(k)[0] - a), abs(ij(k)[1] - b)) for a, b in A) > R)
    return jauh / len(baru)


def celah(e, p, jam=72):
    """Lintasan (~12 jam) tanpa deteksi dalam (p, p+jam] padahal masih ada deteksi sesudah jendela itu."""
    ts = sorted({t for t, _, _ in e["det"]})
    if not any(t > p + jam * 60 for t in ts):
        return 0
    dalam = [t for t in ts if p < t <= p + jam * 60]
    harap = jam // 12
    return max(0, harap - len({(t - p) // 720 for t in dalam}))


def kovariat(r, e, k):
    p, tb, ak, b24, b48, b72 = L.jangkar(e)[r["ji"]]
    S = L.seri_untuk(e)
    w = S.jendela(p)
    s = k.sel(e["det"][0][1], e["prov"])
    oni, _ = k.iklim(p)
    jl = ((p + e["lon0"] * 4) / 60) % 24
    return {"prov": e["prov"], "bulan": int(e["t0"][5:7]), "ws": w["ws"], "rh_min": w["rh_min"], "dc": w["dc"], "fwi": w["fwi"], "hujan24": w["hujan24"],
            "ffmc": w["ffmc"], "gambut": s["gambut"], "kebun": s["kebun"], "hti": s["hti"], "hph": s["hph"], "konsesi": s["konsesi"], "apl": s["apl"],
            "jalan_km": s["jalan_km"], "kanal_km": s["kanal_km"], "malam": 0 if 6 <= jl < 18 else 1, "oni": oni,
            "lompat": lompat(tb, ak, b72 - tb), "celah": celah(e, p), "hujan_tumbuh": 1 if w["hujan24"] >= 5 and b24 else 0, "awal": len(tb)}


BIN = {"ws": [5, 10, 15], "rh_min": [40, 50, 60], "dc": [200, 300, 400], "fwi": [7, 14, 25], "ffmc": [80, 85, 90], "hujan24": [.1, 5],
       "jalan_km": [1, 3, 10], "kanal_km": [.01, 1], "oni": [.5, 1.0], "lompat": [.01, .2, .5], "celah": [1, 2, 4], "awal": [2, 3, 6]}


def kelas(v, b):
    for i, x in enumerate(b):
        if v < x:
            return f"< {x}" if i == 0 else f"{b[i - 1]}-{x}"
    return f">= {b[-1]}"


def pecah(rows, f):
    grup = {}
    for r in rows:
        v = r["kov"][f]
        g = kelas(v, BIN[f]) if f in BIN else (PROVINSI.get(v, v) if f == "prov" else v)
        grup.setdefault(g, []).append(r)
    out = []
    for g, rs in sorted(grup.items(), key=lambda x: str(x[0])):
        if len(rs) < 8:
            continue
        lep = [x for x in rs if x["pertama"]]
        out.append({"kelas": g, "n": len(rs), "bias_log_luas72": round(statistics.mean(x["bias"] for x in rs), 3),
                    "abs_log_luas72": round(statistics.mean(abs(x["bias"]) for x in rs), 3), "f1_24": round(statistics.mean(x["f1"] for x in rs), 3),
                    "f1_mikro_24": round(2 * sum(x["tp"] for x in rs) / max(1, sum(x["np"] + x["no"] for x in rs)), 3),
                    "lolos_terlewat": sum(1 for x in lep if x["y"] and x["p"] < .5), "lolos_palsu": sum(1 for x in lep if not x["y"] and x["p"] >= .5),
                    "p_rata": round(statistics.mean(x["p"] for x in lep), 3) if lep else None, "lolos_teramati": round(statistics.mean(x["y"] for x in lep), 3) if lep else None})
    return out


def main(sumber="val"):
    V = pickle.load(open(os.path.join(MENTAH, "val_model.pkl"), "rb"))
    hv, K = V["hv"], V.get("kal_lepas")
    if sumber == "uji":  # hanya untuk laporan (pola kesalahan di uji); tidak dipakai menyetel apa pun
        hv = pickle.load(open(os.path.join(MENTAH, "uji_awal.pkl"), "rb"))["uji"]
    ids = {r["id"] for r in hv}
    evs = {}
    for l in open(os.path.join(MENTAH, "peristiwa.jsonl")):
        if l[7:15] in ids:  # baris diawali {"id":"E0000000"
            e = json.loads(l)
            evs[e["id"]] = e
    k = L.ktx()
    rows = []
    for r in hv:
        e = evs.get(r["id"])
        if not e or "gbdt" not in r["skor"]:
            continue
        g = r["skor"]["gbdt"]
        obs72 = r["skor"]["persistensi"][2]["no"]
        pred72 = r["mc"][2][1] if r.get("mc") else g[2]["np"]
        rows.append({"id": r["id"], "ji": r["ji"], "pertama": r["ji"] == 0, "kov": kovariat(r, e, k), "bias": math.log((1 + pred72) / (1 + obs72)),
                     "f1": g[0]["f1"], "tp": g[0]["tp"], "np": g[0]["np"], "no": g[0]["no"], "arah": g[0]["arah"], "obs72": obs72, "pred72": pred72,
                     "p": LJ.p_kal(K, r["p_lepas"]) if "p_lepas" in r else 0, "y": 1 if r["akhir72"] >= L.LEPAS else 0})
    H = {"n": len(rows), "sumber": sumber, "tahun": "2023" if sumber == "val" else "2024-2026", "pecah": {f: pecah(rows, f) for f in ["gambut", "kebun", "hti", "hph", "konsesi", "apl", "prov", "bulan", "malam", *BIN]}}
    # kalibrasi per kelompok (peluang lolos vs teramati)
    # 15 terburuk: |bias| terbesar
    buruk = sorted(rows, key=lambda x: -abs(x["bias"]))[:15]
    for b in buruk:
        c = b["kov"]
        sebab = []
        if c["lompat"] >= .2:
            sebab.append(f"{round(100 * c['lompat'])}% sel baru > 1,9 km dari api aktif (loncat/titik baru menyatu)")
        if c["celah"] >= 2:
            sebab.append(f"{c['celah']} lintasan tanpa deteksi (awan/asap)")
        if c["hujan_tumbuh"]:
            sebab.append("tumbuh walau hujan >= 5 mm (gambut membara)")
        if b["bias"] < -1 and not sebab:
            sebab.append("tumbuh jauh lebih besar dari ramalan tanpa tanda data (kemungkinan bahan bakar/variabel tak terlihat)")
        if b["bias"] > 1 and not sebab:
            sebab.append("ramalan terlalu besar: kemungkinan dipadamkan / padam sendiri (pemadaman tidak ada di data)")
        b["sebab"] = sebab
    H["terburuk"] = [{k_: v for k_, v in b.items() if k_ != "tp"} for b in buruk]
    H["ringkas"] = {"porsi_lompat_20": round(sum(1 for r in rows if r["kov"]["lompat"] >= .2) / len(rows), 3),
                    "porsi_celah_2": round(sum(1 for r in rows if r["kov"]["celah"] >= 2) / len(rows), 3),
                    "bias_rata": round(statistics.mean(r["bias"] for r in rows), 3)}
    json.dump(H, open(os.path.join(MENTAH, f"galat_{sumber}.json"), "w"), ensure_ascii=False, indent=1, default=str)
    from umum import PUBLIK
    P = os.path.join(PUBLIK, "sebaran_galat.json")
    out = json.load(open(P)) if os.path.exists(P) else {}
    out[sumber] = {"n": H["n"], "tahun": H["tahun"], "ringkas": H["ringkas"], "pecah": H["pecah"],
                   "terburuk": [{k_: b[k_] for k_ in ("id", "ji", "bias", "obs72", "pred72", "sebab")} | {"prov": b["kov"]["prov"], "gambut": b["kov"]["gambut"]} for b in H["terburuk"]]}
    json.dump(out, open(P, "w"), ensure_ascii=False, separators=(",", ":"), default=str)
    print(json.dumps(H["ringkas"]), file=sys.stderr)


if __name__ == "__main__":
    if sys.argv[1:] == ["uji"]:
        assert kelas(3, [5, 10]) == "< 5" and kelas(7, [5, 10]) == "5-10" and kelas(12, [5, 10]) == ">= 10"
        a = 1000 * NX + 1000
        assert lompat({a}, {a: 0}, {a + 1, a + 10}) == .5
        e = {"det": [(0, a, 1), (720, a, 1), (5000, a, 1)]}
        assert celah(e, 0, 72) == 5  # 6 lintasan diharap, hanya 1 terisi dalam 72 jam, api masih ada sesudahnya
        print("ok")
    else:
        main(sys.argv[1] if len(sys.argv) > 1 else "val")
