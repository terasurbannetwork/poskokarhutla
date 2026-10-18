"""Dampak cuaca ekstrem, tanpa jaringan -> public/banjir/data/cuaca_dampak.json (folder yang di-commit banjir.yml; lihat cuaca.py)

  terpapar  per tanggal (semua hari di cuaca_prakiraan.json): jiwa yang tinggal di sel 0,25 derajat dengan hujan harian >= 50 mm
            (batas hujan lebat BMKG), per provinsi (public/data/penduduk.json, WorldPop, satu baris per sel x provinsi). Ini PRAKIRAAN model, bukan jiwa yang
            sudah terdampak; sel kisi hujan dan kisi penduduk sama (0,25 derajat) sehingga dicocokkan lewat koordinat sel.
            Sekolah dan fasilitas kesehatan tidak dihitung: datanya per kecamatan, sedangkan hujan per sel (A18).
  tahunan   kejadian, korban, dan rumah rusak tahunan "cuaca ekstrem" BNPB/DIBI dari kejadian.json, nasional (provinsi tidak: layar tidak memakainya).
            Hanya angka yang tercatat; kunci yang tidak ada pada sumbernya tidak diisi.
Bagian tanpa data dibuang: tanggal tanpa sel >= 50 mm tidak punya kunci; tak satu pun -> tak ada "terpapar".

{"hari_ini", "dibuat", "ambang_mm", "terpapar": {tanggal: {"penduduk", "sel", "prov": {kode: {"penduduk", "sel"}}}}, "tahunan": {"nasional"}, "sumber"}
Perluasan 72 jam (dari cuaca_kec.json, cuaca_gelombang.json, cuaca_sarana.json; kunci lama tetap):
  hari      3 tanggal cuaca_kec.json
  zona      kecamatan tingkat >= 2 per hari: {jiwa, sekolah, faskes, kec}[3]; sekolah/faskes hanya yang tercatat (bisa kurang; null = tak ada cakupan)
  pelabuhan [[indeks cuaca_sarana, [t per hari], hs maks dm, embusan maks km/jam]] hanya yang t >= 1 sedikitnya sehari; bandara [[indeks, [t], mm maks, embusan maks]]
  pesisir   {jiwa: [3]} penduduk kecamatan dengan hs >= 2,5 m (proksi warga pesisir/nelayan; data nelayan tak ada)
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


def _hitung_banjir():
    import importlib.util
    sp = importlib.util.spec_from_file_location("banjir_dampak", os.path.join(AKAR, "scripts/banjir/dampak.py"))
    m = importlib.util.module_from_spec(sp)
    sp.loader.exec_module(m)
    return m.hitung


def perluas(out, kec, gel, sar, hujan, pusat, pend, sekolah, fasilitas, hitung):
    """Tambah hari, zona, pesisir, pelabuhan, bandara ke `out`. kec = cuaca_kec.json; hujan = hujan.json; pusat = pusat_kec.json;
    pend = {kunci: jiwa}; sekolah = {kunci: (n, siswa)}; fasilitas = {kunci: (faskes, rs)}; hitung = banjir/dampak.hitung."""
    from dasar import ANGIN, HS, HUJAN, Kisi, tingkat
    from prakiraan_kec import hs_harian
    hari = kec["hari"]
    kunci = list(pusat)
    zona = [hitung([kunci[r[0]] for r in kec["kec"] if r[1][n] >= 2], pend, sekolah, fasilitas) for n in range(3)]
    out["hari"] = hari
    out["zona"] = {"jiwa": [z.get("penduduk", 0) for z in zona], "sekolah": [z.get("sekolah") for z in zona],
                   "faskes": [z.get("faskes") for z in zona], "kec": [z["kec"] for z in zona]}
    out["pesisir"] = {"jiwa": [sum(pend.get(kunci[r[0]], 0) for r in kec["kec"] if r[6] and r[6][n] >= 25) for n in range(3)]}
    kisi = Kisi([(g["lat"], g["lon"], g["h"], g["g"]) for g in hujan["grid"]])
    ix = [hujan["hari"].index(d) if d in hujan["hari"] else None for d in hari]
    hs = {(round(a, 3), round(o, 3)): per for a, o, per in hs_harian(gel, hari)}
    hmaks = {(round(r[0], 3), round(r[1], 3)): r[6] for r in (gel or {}).get("titik", [])}
    pel, bdr = [], []
    for i, (n, la, lo, p, j) in enumerate(sar.get("pelabuhan", [])):
        k, c = (round(la, 3), round(lo, 3)), kisi.dekat(la, lo)
        if k not in hs or not c:
            continue
        g = [None if x is None else c[3][x] for x in ix]
        t = [max(tingkat(g[d], ANGIN), tingkat(hs[k][d] / 10, HS)) for d in range(3)]
        if max(t):
            pel.append([i, t, hmaks[k], int(round(max(x or 0 for x in g)))])
    for i, (kode, n, la, lo, p) in enumerate(sar.get("bandara", [])):
        c = kisi.dekat(la, lo)
        if not c:
            continue
        mm, g = [[None if x is None else c[q][x] for x in ix] for q in (2, 3)]
        t = [max(tingkat(mm[d], HUJAN), tingkat(g[d], ANGIN)) for d in range(3)]
        if max(t):
            bdr.append([i, t, int(round(max(x or 0 for x in mm))), int(round(max(x or 0 for x in g)))])
    out["pelabuhan"], out["bandara"] = pel, bdr


def _sekolah_faskes(kunci_kec):
    """{kunci: (sekolah, siswa)} dan {kunci: (faskes, rs)} untuk kecamatan di `kunci_kec`; kecamatan di provinsi tanpa catatan dibuang (bukan 0)."""
    sk, fs = {}, {}
    j = baca(os.path.join(AKAR, "public/data/sekolah.json"))
    if j:
        ps = set()
        for r in j["baris"]:
            k = f"{r[5]}|{r[6]}|{r[7]}"
            ps.add(r[5])
            if k in kunci_kec:
                n, s = sk.get(k, (0, 0))
                sk[k] = (n + 1, s + (r[4] or 0))
        sk = {k: sk.get(k, (0, 0)) for k in kunci_kec if k.split("|")[0] in ps}
    f = baca(os.path.join(AKAR, "public/data/fasilitas.json"))
    if f:
        from wilayah import Wilayah
        w, pf = Wilayah(), {x.get("prov") for x in f if x["t"] in ("faskes", "rs")}
        pk = {k.split("|")[0] for k in kunci_kec}
        for x in f:
            if x["t"] in ("faskes", "rs") and x.get("prov") in pk:
                m = w.cari(x["lon"], x["lat"])
                k = f"{m[0]}|{m[1]}|{m[2]}" if m else None
                if k in kunci_kec:
                    a, b = fs.get(k, (0, 0))
                    fs[k] = (a + (x["t"] == "faskes"), b + (x["t"] == "rs"))
        fs = {k: fs.get(k, (0, 0)) for k in kunci_kec if k.split("|")[0] in pf}
    return sk, fs


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
    try:
        kec, pusat = baca(os.path.join(KELUAR, "cuaca_kec.json")), baca(os.path.join(KELUAR, "pusat_kec.json"))
        if kec and pusat and pend:
            from dasar import MASUKAN
            kunci = list(pusat)
            sk, fs = _sekolah_faskes({kunci[r[0]] for r in kec["kec"] if max(r[1]) >= 2})
            perluas(out, kec, baca(os.path.join(KELUAR, "cuaca_gelombang.json")), baca(os.path.join(KELUAR, "cuaca_sarana.json")) or {},
                    baca(os.path.join(MASUKAN, "hujan.json")), pusat, pend["kec"], sk, fs, _hitung_banjir())
    except Exception as e:  # perluasan tak boleh merusak kunci lama
        print(f"::warning title=cuaca dampak 72 jam::{e}", file=sys.stderr)
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
    kec = {"hari": ["a", "b", "c"], "kec": [[0, [3, 0, 0], [], [], [], [], [30, 0, 0]], [1, [0, 2, 0], [], [], [], [], None], [2, [1, 1, 1], [], [], [], [], [26, 26, 26]]]}
    pusat = {"11|A|X": [0, 0], "11|A|Y": [0, 0], "11|A|Z": [0, 0]}
    hujan = {"hari": ["a", "b", "c"], "grid": [{"lat": 1.125, "lon": 1.125, "h": [], "g": [60, 10, 10]}]}
    gel = {"t0": "2026-01-01T00:00Z", "n": 72, "titik": [[1.1, 1.1, "11", "Pel", [30] * 72, [], 30]]}
    sar = {"pelabuhan": [["Pel", 1.1, 1.1, "11", "umum"]], "bandara": [["WXXX", "Bd", 1.1, 1.1, "11"]]}
    hit = lambda ks, pend, sk, fs: {"kec": len(ks), "penduduk": sum(pend[k] for k in ks)}
    o = {}
    hujan["grid"][0]["h"] = [120, 0, 0]
    gel["t0"] = "2025-12-31T17:00Z"  # tiga hari WIB a,b,c = 2026-01-01.. tetapi 'a','b','c' bukan tanggal -> pelabuhan dilewati
    perluas(o, kec, gel, sar, hujan, pusat, {"11|A|X": 100, "11|A|Y": 10, "11|A|Z": 1}, {}, {}, hit)
    assert o["zona"] == {"jiwa": [100, 10, 0], "sekolah": [None] * 3, "faskes": [None] * 3, "kec": [1, 1, 0]}, o["zona"]
    assert o["pesisir"] == {"jiwa": [101, 1, 1]} and o["pelabuhan"] == [] , o
    assert o["bandara"] == [[0, [2, 0, 0], 120, 60]], o["bandara"]    # hari a: 120 mm = Siaga (2) mengalahkan embusan 60 km/jam (1); hari lain di bawah ambang
    print("ok dampak cuaca")


if __name__ == "__main__":
    uji() if sys.argv[1:] == ["uji"] else main()
