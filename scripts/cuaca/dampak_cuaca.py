"""Dampak cuaca ekstrem, tanpa jaringan -> public/banjir/data/cuaca_dampak.json (folder yang di-commit banjir.yml; lihat cuaca.py)

  terpapar  per tanggal (semua hari di cuaca_prakiraan.json): jiwa yang tinggal di sel 0,25 derajat dengan hujan harian >= 50 mm
            (batas hujan lebat BMKG), per provinsi (public/data/penduduk.json, WorldPop, satu baris per sel x provinsi). Ini PRAKIRAAN model, bukan jiwa yang
            sudah terdampak; sel kisi hujan dan kisi penduduk sama (0,25 derajat) sehingga dicocokkan lewat koordinat sel.
            Sekolah dan fasilitas kesehatan tidak dihitung: datanya per kecamatan, sedangkan hujan per sel (A18).
  tahunan   kejadian, korban, dan rumah rusak tahunan "cuaca ekstrem" BNPB/DIBI dari kejadian.json, nasional (provinsi tidak: layar tidak memakainya).
            Hanya angka yang tercatat; kunci yang tidak ada pada sumbernya tidak diisi.
Bagian tanpa data dibuang: tanggal tanpa sel >= 50 mm tidak punya kunci; tak satu pun -> tak ada "terpapar".

{"hari_ini", "dibuat", "ambang_mm", "terpapar": {tanggal: {"penduduk", "sel", "prov": {kode: {"penduduk", "sel"}}}}, "tahunan": {"nasional"}, "sumber"}
Pakai:  python3 scripts/cuaca/dampak_cuaca.py   |   python3 scripts/cuaca/dampak_cuaca.py uji   (dirantai dari cuaca.py main)
"""
import datetime as dt, os, sys
from collections import defaultdict

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "../banjir"))
from umum import AKAR, KELUAR, WIB, baca, simpan

AMBANG = 50  # mm per hari: awal kelas hujan lebat BMKG (sama dengan cuaca.py HUJAN[0])


def kunci(la, lo):
    return f"{la:.3f},{lo:.3f}"


def terpapar(sel, i, pend_grid, ambang=AMBANG):
    """sel = [[lat, lon, prov, [mm], [km/jam]]]; pend_grid = [[lat, lon, jiwa, prov]]; i = indeks hari. Kosong -> None."""
    lebat = {kunci(r[0], r[1]) for r in sel if (r[3][i] or 0) >= ambang}
    if not lebat:
        return None
    prov = defaultdict(lambda: {"penduduk": 0, "sel": set()})
    for la, lo, jiwa, p in pend_grid:
        if p and kunci(la, lo) in lebat:
            prov[p]["penduduk"] += jiwa
            prov[p]["sel"].add(kunci(la, lo))
    prov = {p: {"penduduk": v["penduduk"], "sel": len(v["sel"])} for p, v in sorted(prov.items()) if v["penduduk"]}
    if not prov:
        return None
    return {"penduduk": sum(v["penduduk"] for v in prov.values()), "sel": len(lebat), "prov": prov}


def tahunan(blok):
    """{tahun: {kunci: angka}} dari blok kejadian.json, hanya kunci yang ada dan bukan None."""
    return {t: {k: v for k, v in d.items() if v is not None} for t, d in sorted((blok or {}).items()) if d}


def main(pr=None, meta=None):
    pr = pr or baca(os.path.join(KELUAR, "cuaca_prakiraan.json"))
    if not pr:
        sys.exit("cuaca_prakiraan.json belum ada")
    out = {"hari_ini": pr["hari_ini"], "dibuat": dt.datetime.now(WIB).isoformat(timespec="minutes"), "ambang_mm": AMBANG, "sumber": {}}
    pend = baca(os.path.join(AKAR, "public/data/penduduk.json"))
    t = {d: x for i, d in enumerate(pr["hari"]) if pend and (x := terpapar(pr["sel"], i, pend["grid"]))}
    if t:
        out["terpapar"] = t
        out["sumber"]["terpapar"] = "Open-Meteo (prakiraan hujan harian per sel 0,25 derajat), penduduk WorldPop 2026; prakiraan, bukan jiwa yang sudah terdampak"
    kj = baca(os.path.join(KELUAR, "kejadian.json"))
    if kj:
        nas = tahunan(kj.get("nasional", {}).get("cuaca"))
        if nas:
            out["tahunan"] = {"nasional": nas}
            out["sumber"]["tahunan"] = kj.get("sumber", "BNPB")
    simpan(os.path.join(KELUAR, "cuaca_dampak.json"), out)
    h = t.get(pr["hari_ini"])
    print(f"cuaca dampak: hari ini {pr['hari_ini']}: " + (f"{h['sel']} sel >= {AMBANG} mm, {h['penduduk']:,} jiwa" if h else "tidak ada sel hujan lebat")
          + f"; {len(t)} tanggal berpenduduk terpapar"
          + f"; tahunan {list(out.get('tahunan', {}))}", file=sys.stderr)


def uji():
    sel = [[1.125, 2.125, "11", [60, 10], [0, 0]], [1.125, 2.375, "11", [10, 80], [0, 0]], [1.375, 2.125, "12", [200, 0], [0, 0]]]
    pend = [[1.125, 2.125, 100, "11"], [1.125, 2.125, 7, "12"], [1.125, 2.375, 50, "11"], [1.375, 2.125, 9, "12"], [1.375, 2.125, 1, ""], [5, 5, 99, "11"]]
    t = terpapar(sel, 0, pend)
    assert t == {"penduduk": 116, "sel": 2, "prov": {"11": {"penduduk": 100, "sel": 1}, "12": {"penduduk": 16, "sel": 2}}}, t   # baris tanpa provinsi atau di luar sel dibuang
    assert terpapar(sel, 1, pend) == {"penduduk": 50, "sel": 1, "prov": {"11": {"penduduk": 50, "sel": 1}}}
    assert terpapar(sel, 0, [[9, 9, 5, "11"]]) is None
    assert tahunan({"2024": {"kejadian": 3, "meninggal": None}, "2023": {}}) == {"2024": {"kejadian": 3}} and tahunan(None) == {}
    print("ok dampak cuaca")


if __name__ == "__main__":
    uji() if sys.argv[1:] == ["uji"] else main()
