"""Cuaca ekstrem: ringkasan prakiraan hujan, embusan angin, dan peluang ansambel untuk layar /cuaca/.

Tidak mengambil data baru: membaca keluaran modul banjir (sumber sama, tidak diunduh dua kali)
  public/banjir/data/hujan.json            Open-Meteo, kisi 0,25 derajat, 10 hari (hujan mm, embusan km/jam)
  public/banjir/data/hujan_ansambel.json   ECMWF IFS 51 anggota, peluang hujan harian >= 50 / >= 100 mm
  public/banjir/data/meta.json             nama provinsi
dan menulis
  public/banjir/data/cuaca_prakiraan.json   {dibuat, hari, hari_ini, sel:[[lat,lon,prov,[mm],[km/jam]]], ens:[[lat,lon,prov,[p50],[p100]]]}
  public/banjir/data/cuaca_meta.json        {dibuat, ambang, prov, hitung per hari, sumber}  (juga dibaca /api/status)
Keluaran sengaja di folder data banjir: hanya folder itu yang dikecualikan dari checkout main dan di-commit oleh banjir.yml
(token tanpa scope workflow, jadi workflow tak bisa disunting). public/cuaca/data hanya menampung penanda folder untuk registry.
Peringatan BMKG (nowcast CAP, gelombang) tidak disalin: layar membaca public/data/peringatan.json apa adanya.

Ambang dari docs/multi-bencana/bencana/cuaca.md §4 (hipotesis awal, belum dikunci uji balik):
  hujan harian 50 / 100 / 150 mm (kelas BMKG lebat, sangat lebat, ekstrem)
  embusan 15 / 20 / 25 m/s = 54 / 72 / 90 km/jam
Badai guntur (CAPE dan LI) tidak ditampilkan: indeks angkat (LI) tidak ada di sumber, dibuang (A18).

Pakai:  python3 scripts/cuaca/cuaca.py   |   python3 scripts/cuaca/cuaca.py uji
Jalankan sesudah hujan.py dan ansambel_hujan.py (dirantai di akhir scripts/banjir/posko.py).
"""
import os, sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "../banjir"))
from umum import KELUAR as BANJIR, baca, simpan

HUJAN = (50, 100, 150)
ANGIN = (54, 72, 90)


def tingkat(v, ambang):
    """0 bila di bawah ambang pertama, selain itu 1..3."""
    return sum(1 for a in ambang if (v or 0) >= a)


def hitung(sel, ens, n_hari):
    """Per hari: jumlah sel hujan [lebat, sangat lebat, ekstrem], embusan [waspada, siaga, awas], titik ansambel p50 >= 50%."""
    out = []
    for i in range(n_hari):
        h, a = [0, 0, 0], [0, 0, 0]
        for r in sel:
            if tingkat(r[3][i], HUJAN):
                h[tingkat(r[3][i], HUJAN) - 1] += 1
            if tingkat(r[4][i], ANGIN):
                a[tingkat(r[4][i], ANGIN) - 1] += 1
        out.append({"hujan": h, "angin": a, "ens": sum(1 for r in ens if (r[3][i] or 0) >= .5)})
    return out


def sejajar(hari, hari_e, nilai):
    """Deret ansambel (mulai hari_e[0]) disejajarkan ke daftar `hari`; hari di luar jangkauan = None."""
    p = dict(zip(hari_e, nilai))
    return [p.get(t) for t in hari]


def olah(hujan, ans, prov):
    hari = hujan["hari"]
    sel = [[g["lat"], g["lon"], g["prov"], g["h"], g["g"]] for g in hujan["grid"]]
    ens = [[g["lat"], g["lon"], g["prov"], sejajar(hari, ans["hari"], g["p50"]), sejajar(hari, ans["hari"], g["p100"])] for g in ans["grid"]] if ans else []
    i0 = hari.index(hujan["hari_ini"])
    pakai = {r[2] for r in sel} | {r[2] for r in ens}
    return {"hari": hari, "hari_ini": hujan["hari_ini"], "sel": sel, "ens": ens}, {
        "hari": hari, "hari_ini": hujan["hari_ini"], "i0": i0, "sel": hujan["sel"],
        "ambang": {"hujan": list(HUJAN), "angin_kmj": list(ANGIN)},
        "prov": {k: v for k, v in prov.items() if k in pakai},
        "hitung": hitung(sel, ens, len(hari)),
        "sumber": {"hujan": "Open-Meteo (model terbaik per lokasi), kisi 0,25 derajat",
                   "ansambel": ans.get("model") if ans else None, "peringatan": "BMKG"}}


def main():
    hujan = baca(os.path.join(BANJIR, "hujan.json"))
    if not hujan:
        print("hujan.json tidak ada: cuaca dilewati", file=sys.stderr)
        sys.exit(1)
    ans = baca(os.path.join(BANJIR, "hujan_ansambel.json"))
    if ans and ans["hari"][0] < hujan["hari_ini"]:
        ans = None  # ansambel basi (hari pertamanya sudah lewat) dibuang, bukan ditampilkan salah hari
    prov = (baca(os.path.join(BANJIR, "meta.json")) or {}).get("provinsi", {})
    pr, meta = olah(hujan, ans, prov)
    pr["dibuat"] = meta["dibuat"] = (baca(os.path.join(BANJIR, "meta.json")) or {}).get("dibuat")
    simpan(os.path.join(BANJIR, "cuaca_prakiraan.json"), pr)
    simpan(os.path.join(BANJIR, "cuaca_meta.json"), meta)
    h = meta["hitung"][meta["i0"]]
    print(f"cuaca: {len(pr['sel'])} sel, {len(pr['ens'])} titik ansambel; hari ini hujan lebat+ {sum(h['hujan'])} sel, embusan >= 54 km/jam {sum(h['angin'])} sel")


if __name__ == "__main__":
    if sys.argv[1:] == ["uji"]:
        assert [tingkat(v, HUJAN) for v in (None, 49.9, 50, 100, 150, 400)] == [0, 0, 1, 2, 3, 3]
        assert [tingkat(v, ANGIN) for v in (53, 54, 72, 90)] == [0, 1, 2, 3]
        assert sejajar(["a", "b", "c"], ["b", "c", "d"], [.1, .2, .3]) == [None, .1, .2]
        hj = {"hari": ["a", "b"], "hari_ini": "b", "sel": .25, "grid": [
            {"lat": 1, "lon": 2, "prov": "11", "h": [0, 120], "g": [10, 80]},
            {"lat": 1, "lon": 3, "prov": "12", "h": [60, 5], "g": [55, 10]}]}
        an = {"hari": ["b"], "model": "m", "grid": [{"lat": 1, "lon": 2, "prov": "11", "p50": [.7], "p100": [.2], "p3": [0]}]}
        pr, m = olah(hj, an, {"11": "Aceh", "12": "Sumut", "99": "Lain"})
        assert m["hitung"][1] == {"hujan": [0, 1, 0], "angin": [0, 1, 0], "ens": 1}, m["hitung"]
        assert m["hitung"][0] == {"hujan": [1, 0, 0], "angin": [1, 0, 0], "ens": 0}
        assert pr["ens"][0][3] == [None, .7] and "99" not in m["prov"] and m["i0"] == 1
        assert olah(hj, None, {})[0]["ens"] == []
        print("ok")
    else:
        main()
