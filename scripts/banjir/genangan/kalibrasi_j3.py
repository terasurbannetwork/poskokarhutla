"""Penyetel J3 (PRAREG-J3.md, bagian Kenop bebas dan Algoritma kalibrasi). HANYA kejadian kalibrasi (2017-01, 2018-01, 2020-01); label uji tak pernah disentuh.
Dua tahap, semua run lewat `mesin.mjs` dengan argumen beku (`kunci_j3.argumen_beku`), hasil raster dicache di data/raw/banjir/genangan/j3_kal/:
  1  skala_hujan: tiap nilai grid, Kd seragam KD_AWAL, semua kejadian -> skala* = argmin kerugian total
  2  Kd: tiap nilai grid Kd seragam pada skala*, semua kejadian; Kd tiap kecamatan = argmin kerugian kecamatan itu + MU*|ln(Kd/Kd*)|, Kd* = Kd seragam terbaik (= pembanding (b))
  3  satu run akhir dengan peta Kd per kecamatan per kejadian (verifikasi) + skor pagar 2021-02 (dilaporkan, TIDAK memilih apa pun)
Anggaran run = |skala|*E + (|Kd|-1)*E + E (+1 pagar) dan dicetak sebelum jalan. Kerugian kecamatan per kejadian: (1 - POD_kec) + LAMBDA*frac_basah_kec
(frac_basah hanya bila kecamatan punya laporan, atau kejadian >= 100 laporan). Konstanta di bawah dibekukan lewat sidik (berkas ini ikut sidik).
Pakai:  python3 scripts/banjir/genangan/kalibrasi_j3.py jalan | kering | uji      (`kering`: 1 kejadian 2020-01, 2 run, tanpa tulis hasil; tak butuh cek kunci)
"""
import json, math, os, subprocess, sys

D = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, D)
import kunci_j3, skor_j3  # noqa: E402

AKAR = kunci_j3.AKAR
KAL = os.path.join(AKAR, "data/raw/banjir/genangan/j3_kal")
KD_AWAL, LAMBDA, MU = 12, 0.5, 0.05
KEJADIAN = {"2017-01": "2017-02-19", "2018-01": "2018-02-13", "2020-01": "2019-12-30", "2021-02": "2021-02-18"}   # cermin KEJADIAN_J3 (mesin.mjs)


def jalankan_mesin(ev, skala, kd=None, kd_map=None):
    """-> jalur raster (cache). kd seragam atau kd_map = jalur json {kab|kec: Kd}."""
    nama = f"{kunci_j3.sidik()[:10]}_{ev}_s{skala}_"   # cache terkunci ke sidik: kode/PRAREG berubah = cache lama tak dipakai + (f"kd{kd}" if kd_map is None else "peta")
    jalur = os.path.join(KAL, nama + ".raster.gz")
    if not os.path.exists(jalur):
        os.makedirs(KAL, exist_ok=True)
        a = ["node", os.path.join(D, "mesin.mjs"), *kunci_j3.argumen_beku(), "--kejadian", ev, "--mulai", KEJADIAN[ev], "--skala-hujan", str(skala),
             "--raster", jalur, "--keluar", os.path.join(KAL, nama + ".json")] + (["--kd", str(kd)] if kd_map is None else ["--kd", str(KD_AWAL), "--kd-kec", kd_map])
        subprocess.run(a, check=True, stdout=subprocess.DEVNULL)
    return jalur


def muat_label(ev):
    return json.loads(subprocess.run(["node", os.path.join(D, "mesin.mjs"), "label", ev], check=True, capture_output=True, text=True).stdout)


def kerugian_kec(R, nl):
    """{kec: kerugian} satu kejadian."""
    n, b = {}, {}
    for r, m in nl:
        k = f"{r['kab']}|{r['kec']}"; n[k] = n.get(k, 0) + 1; b[k] = b.get(k, 0) + (m >= skor_j3.AMBANG)
    banyak = len(nl) >= 100; out = {}
    for k, (s, w) in skor_j3.per_kec(R).items():
        if k in n:
            out[k] = (1 - b[k] / n[k]) + LAMBDA * w / s
        elif banyak:
            out[k] = LAMBDA * w / s
    return out


def jumlah(daftar):
    o = {}
    for d in daftar:
        for k, v in d.items():
            o[k] = o.get(k, 0) + v
    return o


def pilih_skala(kerugian):
    """kerugian {skala: {kec: nilai}} -> skala terbaik (ikatan: yang terkecil)."""
    return min(sorted(kerugian), key=lambda s: sum(kerugian[s].values()))


def pilih_kd(kerugian, grid):
    """kerugian {kd: {kec: nilai}} (seragam, skala*) -> (kd_seragam_terbaik, {kec: kd}); penalti MU*|ln(kd/kd*)|."""
    kds = min(sorted(kerugian), key=lambda g: sum(kerugian[g].values()))
    kecs = sorted({k for v in kerugian.values() for k in v})
    return kds, {k: min(sorted(kerugian), key=lambda g: kerugian[g].get(k, 0) + MU * abs(math.log(g / kds))) for k in kecs}


def anggaran(grid_s, grid_kd, E):
    return len(grid_s) * E + (len(grid_kd) - 1) * E + E


def jalan(evs, grid_s, grid_kd, maks_run=None, jalankan=jalankan_mesin, label=muat_label, raster=skor_j3.baca_raster):
    lab = {e: label(e) for e in evs}; n = [0]

    def rugi(ev, **kw):
        if maks_run is not None and n[0] >= maks_run:
            return None
        n[0] += 1; R = raster(jalankan(ev, **kw)); return kerugian_kec(R, skor_j3.nilai_laporan(R, lab[ev]))
    print(f"anggaran run: {anggaran(grid_s, grid_kd, len(evs))} (kejadian {evs})", file=sys.stderr)
    k1 = {}
    for s in grid_s:
        r = [rugi(e, skala=s, kd=KD_AWAL) for e in evs]
        if None in r:
            return {"berhenti": "anggaran kering habis", "tahap1": {str(a): sum(b.values()) for a, b in k1.items()}, "run": n[0]}
        k1[s] = jumlah(r)
    s_best = pilih_skala(k1); k2 = {KD_AWAL: k1[s_best]}
    for g in grid_kd:
        if g != KD_AWAL:
            k2[g] = jumlah([rugi(e, skala=s_best, kd=g) for e in evs])
    kds, peta = pilih_kd(k2, grid_kd)
    return {"skala": s_best, "kd_seragam": kds, "kd_kec": peta, "tahap1": {str(a): sum(b.values()) for a, b in k1.items()}, "tahap2": {str(a): sum(b.values()) for a, b in k2.items()}, "run": n[0]}


def uji():
    kecs = ["A|a", "B|b"]
    assert pilih_skala({1.0: {"x": 2}, 1.5: {"x": 1}}) == 1.5 and pilih_skala({1.0: {"x": 1}, 1.5: {"x": 1}}) == 1.0
    kds, peta = pilih_kd({5: {"A|a": 2, "B|b": 0.2}, 12: {"A|a": 0.5, "B|b": 0.9}, 30: {"A|a": 0.6, "B|b": 0.9}}, (5, 12, 30))
    assert kds == 12 and peta == {"A|a": 12, "B|b": 5}, (kds, peta)       # B memilih 5 walau menyimpang dari Kd* (selisih kerugian 0,7 > penalti 0,05*ln(12/5))
    assert anggaran((1, 1.25, 1.5, 1.75, 2.0), range(8), 3) == 5 * 3 + 7 * 3 + 3
    import array
    hm = array.array("f", [0.5] * 4 + [0.0] * 4); R = {"nx": 4, "ny": 2, "dx_m": 100.0, "lon0": 0.0, "lat0": 0.0, "dlon": 1e-3, "dlat": 1e-3, "nama": kecs, "kec": array.array("h", [0] * 4 + [1] * 4), "hm": hm}
    lap = [{"t": "2020-01-01T10:00:00+07:00", "lon": 0, "lat": 0, "kedalaman_cm": 20, "kab": "A", "kec": "a"}]
    k = kerugian_kec(R, skor_j3.nilai_laporan(R, lap)); assert k == {"A|a": LAMBDA * 1.0}, k    # kena (0) + denda basah penuh; B tanpa laporan, <100 laporan: tak dihukum
    s = jalan(["2020-01"], (1.0, 1.5), (5, 12), maks_run=1, jalankan=lambda ev, **kw: "x", label=lambda e: lap, raster=lambda p: R)
    assert s["berhenti"] and s["run"] == 1
    s = jalan(["2020-01"], (1.0, 1.5), (5, 12), jalankan=lambda ev, **kw: "x", label=lambda e: lap, raster=lambda p: R)
    assert s["skala"] == 1.0 and s["kd_seragam"] in (5, 12) and set(s["kd_kec"]) == {"A|a"}, s
    print("ok")


if __name__ == "__main__":
    c = sys.argv[1:2]; B = kunci_j3.beku(); gs, gk = B["skala_hujan_grid"], B["kd_grid_mm_jam"]
    if c == ["uji"]:
        uji()
    elif c == ["kering"]:
        print(json.dumps(jalan(["2020-01"], gs, gk, maks_run=2), indent=1))
    elif c == ["jalan"]:
        g = kunci_j3.periksa()
        if g:
            sys.exit("kunci belum hijau: " + g)
        evs = B["kalibrasi"]; h = jalan(evs, gs, gk)
        peta = {}; os.makedirs(KAL, exist_ok=True)
        for e in evs:
            peta[e] = os.path.join(KAL, f"kd_{e}.json"); json.dump(h["kd_kec"], open(peta[e], "w"))
        # tahap 3 (run akhir per kejadian + pagar 2021-02) dilaporkan oleh sesi induk lewat skor_j3; tak mengubah pilihan di atas
        json.dump({k: v for k, v in h.items()}, open(os.path.join(KAL, "hasil_j3.json"), "w"), indent=1); print("ditulis hasil_j3.json")
    else:
        sys.exit(__doc__)
