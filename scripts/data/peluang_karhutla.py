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
import datetime as dt, importlib.util, json, os, statistics, sys

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


LUAS = [(0.9, "hampir seluruh"), (0.6, "sebagian besar"), (0.4, "sekitar separuh"), (0.15, "sebagian"), (0.0, "sebagian kecil")]


def LUAS_KATA(p):
    return next(k for b, k in LUAS if p >= b)


def vonis(hs, nama):
    """Kalimat dari ambang Sangat Tinggi bila ada hari dengan >= 10% wilayah, selain itu dari ambang Tinggi."""
    i = 1 if max((h["p"][1] or 0) for h in hs) >= 0.10 else 0
    kej = ["Tinggi", "Sangat Tinggi"][i]
    puncak = max(hs, key=lambda h: h["p"][i] or 0)
    p = puncak["p"][i] or 0
    if p == 0:
        return f"Dalam {len(hs)} hari ke depan, bahaya api {kej} tidak diperkirakan di {nama} pada satu skenario pun."
    luas = LUAS_KATA(p)
    return (f"Dalam {len(hs)} hari ke depan, bahaya api {kej} diperkirakan meliputi {luas} {nama} "
            f"pada puncaknya, {P.tanggal(puncak['t'])} ({P.persen(p)} wilayah).")


def bangun(ans, hari_ini=None):
    """hari_ini: 'YYYY-MM-DD' WIB; hari yang sudah lewat dibuang. None bila tak ada hari ke depan."""
    ada = [i for i, t in enumerate(ans["hari"]) if hari_ini is None or t >= hari_ini]
    if not ada:
        return None
    tanggal = [ans["hari"][i] for i in ada]
    grid = [{**g, **{k: [g[k][i] for i in ada] for k in ("pt", "ps", "med", "p10", "p90")}} for g in ans["grid"]]
    wil = {NASIONAL: {"nama": "wilayah rawan", "tingkat": "nasional", "sel": grid}}
    for g in grid:
        wil.setdefault(g["prov"], {"nama": PROVINSI.get(g["prov"], g["prov"]), "tingkat": "provinsi", "sel": []})["sel"].append(g)
    out = {}
    for kode, w in wil.items():
        hs = hari_wilayah(w["sel"], tanggal)
        out[kode] = {"nama": w["nama"], "tingkat": w["tingkat"], "sel": len(w["sel"]), "hari": hs,
                     "vonis": vonis(hs, w["nama"])}
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
    hari_ini = dt.datetime.now(dt.timezone(dt.timedelta(hours=7))).date().isoformat()
    d = bangun(ans, hari_ini)
    if d is None:
        # ansambel basi: semua harinya sudah lewat. Berkas lama TIDAK ditimpa (kontrak melarang wilayah kosong); layar menilai dari `dibuat`.
        print(f"peluang.json: ansambel basi (hari terakhir {ans['hari'][-1]} < {hari_ini}), berkas lama dibiarkan")
        return
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
    v = d["wilayah"]["62"]["vonis"]
    assert "Kalimantan Tengah" in v and "(25% wilayah)" in v and "sebagian" in v and "sel" not in v.replace("selasa", ""), v
    assert "tidak diperkirakan" in d["wilayah"]["14"]["vonis"]
    # hari lewat dibuang; semua lewat -> None
    d2 = bangun(ans, "2026-10-21")
    assert [x["t"] for x in d2["wilayah"]["62"]["hari"]] == ["2026-10-21"] and P.periksa(d2) == []
    assert bangun(ans, "2026-10-22") is None
    assert LUAS_KATA(0.99) == "hampir seluruh" and LUAS_KATA(0.7) == "sebagian besar" and LUAS_KATA(0.5) == "sekitar separuh" and LUAS_KATA(0.2) == "sebagian" and LUAS_KATA(0.05) == "sebagian kecil"
    print("peluang_karhutla.py: uji lulus")


if __name__ == "__main__":
    uji() if sys.argv[1:] == ["uji"] else main()
