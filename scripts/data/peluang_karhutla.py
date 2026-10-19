"""Peluang bahaya api (FWI) 7 hari per provinsi + nasional -> public/data/peluang.json (kontrak peluang/1, scripts/umum/peluang.py).

Tidak menarik ulang ansambel: membungkus public/data/fwi_ansambel.json (ECMWF IFS 51 anggota, dibuat ansambel.py) yang sudah
berisi per sel 0,5 derajat per hari: pt = P(FWI >= 7), ps = P(FWI >= 14), p10/med/p90 FWI.

Agregasi (dipilih, bukan model baru): peluang wilayah = RERATA peluang sel di dalamnya = peluang bahwa SEBUAH SEL yang diambil
acak di wilayah itu melewati ambang (pecahan sel yang diharapkan melewati). Bukan peluang "ada sel yang melewati" (itu mendekati
100% bila satu sel saja) dan bukan peluang satu titik tertentu. p10/p50/p90 = median lintas sel dari p10/med/p90 tiap sel
(FWI sel tipikal, urutannya terjaga karena median monoton).

Pakai:  python3 scripts/data/peluang_karhutla.py        tulis public/data/peluang.json
        python3 scripts/data/peluang_karhutla.py uji   self-check luring
"""
import importlib.util, json, os, statistics, sys

sys.path.insert(0, os.path.dirname(__file__))
from wilayah import AKAR, PROVINSI

_s = importlib.util.spec_from_file_location("peluang", os.path.join(AKAR, "scripts/umum/peluang.py"))
P = importlib.util.module_from_spec(_s)
sys.modules["peluang"] = P   # dataclass-aman; kontrak dipakai apa adanya
_s.loader.exec_module(P)

AMBANG = [{"k": "tinggi", "label": "FWI 7 atau lebih (Tinggi)", "nilai": 7},
          {"k": "sangat_tinggi", "label": "FWI 14 atau lebih (Sangat Tinggi)", "nilai": 14}]
NASIONAL = "ID"


def rata(xs):
    xs = [x for x in xs if x is not None]
    return round(sum(xs) / len(xs), 4) if xs else None


def med(xs):
    xs = [x for x in xs if x is not None]
    return round(statistics.median(xs), 1) if xs else None


def hari_wilayah(sel, tanggal):
    out = []
    for i, t in enumerate(tanggal):
        out.append({"t": t, "p": [rata([g["pt"][i] for g in sel]), rata([g["ps"][i] for g in sel])],
                    "p10": med([g["p10"][i] for g in sel]), "p50": med([g["med"][i] for g in sel]),
                    "p90": med([g["p90"][i] for g in sel])})
    return out


def vonis(hs, nama, n_sel):
    """Kalimat dari ambang Sangat Tinggi bila ada hari dengan >= 10% sel, selain itu dari ambang Tinggi."""
    i = 1 if max((h["p"][1] or 0) for h in hs) >= 0.10 else 0
    kej = ["Tinggi (FWI 7 atau lebih)", "Sangat Tinggi (FWI 14 atau lebih)"][i]
    puncak = max(hs, key=lambda h: h["p"][i] or 0)
    p = puncak["p"][i] or 0
    if p == 0:
        return f"Dalam {len(hs)} hari ke depan, tidak ada sel di {nama} yang berbahaya api {kej} di satu skenario pun."
    return (f"Dalam {len(hs)} hari ke depan, sekitar {P.persen(p)} dari {n_sel} sel di {nama} diperkirakan berbahaya api {kej} "
            f"pada puncaknya, {P.tanggal(puncak['t'])}.")


def bangun(ans):
    tanggal, grid = ans["hari"], ans["grid"]
    wil = {NASIONAL: {"nama": "Provinsi rawan", "tingkat": "nasional", "sel": grid}}
    for g in grid:
        wil.setdefault(g["prov"], {"nama": PROVINSI.get(g["prov"], g["prov"]), "tingkat": "provinsi", "sel": []})["sel"].append(g)
    out = {}
    for kode, w in wil.items():
        hs = hari_wilayah(w["sel"], tanggal)
        out[kode] = {"nama": w["nama"], "tingkat": w["tingkat"], "sel": len(w["sel"]), "hari": hs,
                     "vonis": vonis(hs, w["nama"], len(w["sel"]))}
    urut = [NASIONAL] + sorted((k for k in out if k != NASIONAL), key=lambda k: -max(h["p"][1] or 0 for h in out[k]["hari"]))
    batasan = [
        f"Angka adalah pecahan sel 0,5 derajat (~55 km) di wilayah itu yang diperkirakan melewati ambang FWI, dirata-rata dari peluang tiap sel ({ans['anggota']} anggota ansambel {ans['model']}); bukan peluang satu titik dan bukan peluang \"ada api\".",
        f"Cuaca ansambel diambil sekali per kotak 1 derajat lalu dipakai bersama sel di dalamnya, sehingga sel bertetangga tidak bebas satu sama lain dan rentang p10-p90 cenderung terlalu sempit.",
        f"Cakupan hanya {len(wil) - 1} provinsi rawan (cakupan \"{ans['cakupan']}\"), bukan seluruh Indonesia. FWI bukan jumlah titik panas: hari berbahaya tidak otomatis ada kebakaran, sumber api tetap manusia.",
        "Belum ada uji balik peluang ini terhadap kejadian titik panas, jadi keandalannya (kalibrasi) belum terukur.",
        f"Nasional di sini = gabungan seluruh sel provinsi rawan yang dicakup ansambel. Ansambel dibuat {ans['dibuat']}; keadaan awal FFMC/DMC/DC dari fwi.json dan dilanjutkan sendiri oleh tiap anggota."]
    return P.berkas("karhutla", "ECMWF IFS ansambel lewat Open-Meteo, sistem FWI Kanada",
                    ans["anggota"], {"label": "Indeks FWI siang hari", "satuan": "FWI", "desimal": 1}, AMBANG,
                    {k: out[k] for k in urut}, batasan)


def main():
    ans = json.load(open(os.path.join(AKAR, "public/data/fwi_ansambel.json")))
    d = bangun(ans)
    jalur = os.path.join(AKAR, "public/data/peluang.json")
    with open(jalur, "w") as f:
        json.dump(d, f, ensure_ascii=False, separators=(",", ":"))
    print(f"peluang.json: {len(d['wilayah'])} wilayah, {os.path.getsize(jalur) / 1024:.0f} KB")
    for k in list(d["wilayah"])[:4]:
        print(" ", k, d["wilayah"][k]["vonis"])


def uji():
    g = lambda lat, pr, pt, ps: {"lat": lat, "lon": 100, "prov": pr, "pt": pt, "ps": ps, "med": [5, 9], "p10": [2, 4], "p90": [8, 15], "ph": [0, 0]}
    ans = {"hari": ["2026-10-20", "2026-10-21"], "anggota": 51, "model": "x", "cakupan": "prioritas", "dibuat": "t",
           "grid": [g(1, "62", [1.0, 0.5], [0.5, 0.0]), g(2, "62", [0.0, 0.5], [0.0, 0.0]), g(3, "14", [0.0, 0.0], [0.0, 0.0])]}
    d = bangun(ans)
    assert P.periksa(d) == []
    h = d["wilayah"]["62"]["hari"]
    assert h[0]["p"] == [0.5, 0.25] and h[1]["p"] == [0.5, 0.0], h
    assert d["wilayah"][NASIONAL]["hari"][0]["p"][0] == round(1 / 3, 4)
    assert list(d["wilayah"])[:2] == [NASIONAL, "62"], "urut: nasional lalu provinsi paling parah"
    assert "Kalimantan Tengah" in d["wilayah"]["62"]["vonis"] and "25%" in d["wilayah"]["62"]["vonis"], d["wilayah"]["62"]["vonis"]
    assert "tidak ada sel" in d["wilayah"]["14"]["vonis"]
    print("peluang_karhutla.py: uji lulus")


if __name__ == "__main__":
    uji() if sys.argv[1:] == ["uji"] else main()
