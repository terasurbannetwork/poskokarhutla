"""Rekomendasi posko cuaca ekstrem -> public/banjir/data/cuaca_posko.json (rantai sesudah prakiraan_kec; tanpa jaringan)

Pola scripts/kekeringan/posko.py (pola A): posko DIHITUNG dari tingkat prakiraan, BUKAN laporan lapangan. Tingkat kecamatan = maks 3 hari cuaca_kec.json;
hanya Siaga/Awas (>= 2) dipakai, dikelompokkan per kabupaten, digabung BP.gabung (<= 15 km); pos kabupaten = kantor BPBD bila namanya cocok.
Pakai:  python3 scripts/cuaca/posko.py   |   python3 scripts/cuaca/posko.py uji
"""
import datetime as dt, importlib.util as _iu, os, sys

AB = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, AB)
from dasar import KELUAR, WIB, baca, simpan
_sp = _iu.spec_from_file_location("banjir_posko", os.path.join(AB, "..", "banjir", "posko.py"))   # nama "posko" bentrok dengan berkas ini
BP = _iu.module_from_spec(_sp)
sys.path.insert(1, os.path.join(AB, "..", "banjir"))
_sp.loader.exec_module(BP)

AKAR = os.path.abspath(os.path.join(AB, "..", ".."))
SIAGA = 2


def bangun(cuaca, pusat, bpbd):
    kunci = list(pusat)
    per_kab = {}
    for r in cuaca.get("kec", []):
        k, lv = kunci[r[0]], max(t for t in r[1] if t is not None)
        if lv >= SIAGA:
            per_kab.setdefault("|".join(k.split("|")[:2]), []).append((k, lv))
    kantor = {}
    for b in bpbd.get("kantor", []):
        kantor.setdefault(BP.norm(b["nama"]), []).append(b)
    lap, kab = [], []
    for kb, kec in sorted(per_kab.items()):
        mine = []
        for k, l, layan in BP.gabung(sorted(kec, key=lambda x: (-x[1], x[0])), pusat):
            la, lo = pusat[k]
            mine.append({"id": f"C{len(lap) + len(mine) + 1:04d}", "kab": kb, "kec": k.split("|")[2], "lat": la, "lon": lo, "lv": l, "kec_n": len(layan), "layan": [x.split("|")[2] for x in layan[:6]]})
        la, lo = sum(p["lat"] for p in mine) / len(mine), sum(p["lon"] for p in mine) / len(mine)
        nama = kb.split("|")[1]
        bp = next((b for b in kantor.get(BP.norm(nama), []) if BP.km(la, lo, b["lat"], b["lon"]) <= 200), None)
        y = {"kab": kb, "nama": nama, "prov": kb[:2], "lv": max(p["lv"] for p in mine), "posko": [p["id"] for p in mine], "kec_n": sum(p["kec_n"] for p in mine)}
        if bp:
            y["bpbd"] = {"nama": bp["nama"], "lat": bp["lat"], "lon": bp["lon"], "alamat": bp.get("alamat"), "pusdalops": bp.get("pusdalops")}
        lap += mine
        kab.append(y)
    return {"dibuat": dt.datetime.now(WIB).isoformat(timespec="minutes"), "hari": cuaca.get("hari"), "label": "Deteksi Centurisk97",
            "param": {"gabung_km": BP.GABUNG_KM, "kelok": BP.KELOK, "laju_kmj": BP.LAJU},
            "nasional": {"kab": len(kab), "posko": len(lap), "kec": sum(p["kec_n"] for p in lap)},
            "sumber": {"pos": "Tingkat prakiraan cuaca ekstrem Centurisk97 (maksimum 3 hari); kantor BPBD kabupaten dari BNPB peta_bpbd bila namanya cocok"},
            "kabupaten": sorted(kab, key=lambda y: (-y["lv"], -y["kec_n"], y["kab"])), "posko": lap}


def main():
    cuaca, pusat = baca(os.path.join(KELUAR, "cuaca_kec.json")), baca(os.path.join(KELUAR, "pusat_kec.json"))
    if not cuaca or not pusat:
        sys.exit("posko cuaca: cuaca_kec.json/pusat_kec.json belum ada")
    isi = bangun(cuaca, pusat, baca(os.path.join(AKAR, "public/data/bpbd.json")) or {})
    simpan(os.path.join(KELUAR, "cuaca_posko.json"), isi)
    n = isi["nasional"]
    print(f"posko cuaca: {n['posko']} posko, {n['kab']} kabupaten, {n['kec']} kecamatan", file=sys.stderr)


def uji():
    pus = {"11|Alfa|a": [.3, .3], "11|Alfa|b": [.3, .35], "11|Zeta|c": [.3, 1.2], "11|Zeta|d": [.3, 1.3]}
    cu = {"hari": ["x"], "kec": [[0, [1, 3, 0]], [1, [2, 2, 2]], [2, [1, 1, 1]], [3, [None, 2, 1]]]}
    bp = {"kantor": [{"nama": "ALFA", "lat": .3, "lon": .3, "alamat": "x", "pusdalops": "1"}]}
    o = bangun(cu, pus, bp)
    assert o["nasional"] == {"kab": 2, "posko": 2, "kec": 3}, o["nasional"]        # c level 1: tak masuk; a (Awas) + b digabung; d sendiri
    assert o["kabupaten"][0]["lv"] == 3 and o["kabupaten"][0]["bpbd"]["pusdalops"] == "1" and "bpbd" not in o["kabupaten"][1]
    assert bangun({"kec": [[2, [1, 1, 1]]]}, pus, {})["nasional"]["posko"] == 0    # hanya Waspada: tak ada posko
    print("ok posko cuaca")


if __name__ == "__main__":
    uji() if sys.argv[1:] == ["uji"] else main()
