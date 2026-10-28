"""Penyetel J3 (PRAREG-J3.md, bagian Algoritma kalibrasi). HANYA kejadian kalibrasi (2017-01, 2018-01, 2020-01); label uji tak pernah disentuh.
Semua run lewat `mesin.mjs` dengan argumen beku (`kunci_j3.argumen_beku`); raster dicache di data/raw/banjir/genangan/j3_kal/ (nama memuat sidik, Kd atau hash isi peta Kd, faktor):
  1  skala_hujan: tiap nilai grid, Kd seragam KD_AWAL, semua kejadian -> skala* = kerugian total terkecil
  2  Kd: tiap nilai grid Kd seragam pada skala*; Kd* = Kd seragam terbaik (pembanding b); peta per kecamatan = argmin(kerugian kecamatan + MU*|ln(Kd/Kd*)|);
     peta per kab/kota (5 kenop, pembanding laporan-saja) = argmin yang sama atas jumlah kecamatan kab itu
  3  run peta kecamatan dan peta kab pada kejadian kalibrasi. ATURAN: peta kecamatan dipakai hanya bila kerugian totalnya < kerugian Kd seragam; selain itu model final = Kd seragam.
     Pagar 2021-02 dinilai dengan model final (ambang PRAREG, blok BEKU `pagar`): gagal -> ditolak_pagar=true dan `buka` menolak. Pagar dilaporkan, TIDAK memilih apa pun.
Kerugian kecamatan per kejadian = w*((1 - POD_kec) + LAMBDA*frac_basah), w = max(n_laporan_kec, N_MIN); kecamatan tanpa laporan pada kejadian >= LAPORAN_BANYAK laporan: w=N_MIN dan hanya suku basah.
Konstanta dicerminkan di blok BEKU PRAREG dan diperiksa `uji`. Pakai:  python3 scripts/banjir/genangan/kalibrasi_j3.py jalan | kering | uji
(`kering`: 1 kejadian 2020-01, 2 run, tanpa tulis hasil, tanpa cek kunci)
"""
import glob, hashlib, json, math, os, subprocess, sys, tempfile

D = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, D)
import kunci_j3, skor_j3  # noqa: E402

AKAR = kunci_j3.AKAR
KAL = os.path.join(AKAR, "data/raw/banjir/genangan/j3_kal")
KD_AWAL, LAMBDA, MU, N_MIN, LAPORAN_BANYAK = 12, 1.0, 0.05, 5, 100
MULAI = kunci_j3.beku()["mulai"]   # sumber tunggal jendela; dicocokkan dengan KEJADIAN_J3 di mesin.mjs oleh `uji`


def nama_cache(sid, ev, skala, kd=None, kd_map=None, faktor=None):
    """Nama berkas cache: sidik, kejadian, skala, Kd seragam ATAU hash isi peta Kd (dict atau jalur json), faktor dx. Kd/peta/faktor beda = nama beda."""
    if isinstance(kd_map, str):
        kd_map = json.load(open(kd_map))
    u = f"kd{kd}" if kd_map is None else "peta" + hashlib.sha256(json.dumps(kd_map, sort_keys=True).encode()).hexdigest()[:10]
    return f"{sid[:10]}_{ev}_s{skala}_{u}" + (f"_f{faktor}" if faktor else "")


def jalankan_mesin(ev, skala, kd=None, kd_map=None, faktor=None):
    """-> jalur raster (cache)."""
    nama = nama_cache(kunci_j3.sidik(), ev, skala, kd, kd_map, faktor); jalur = os.path.join(KAL, nama + ".raster.gz")
    if not os.path.exists(jalur):
        os.makedirs(KAL, exist_ok=True)
        if isinstance(kd_map, dict):   # peta inline dari hasil_j3.json -> berkas untuk --kd-kec
            p = os.path.join(KAL, nama + ".kd.json"); json.dump(dict(sorted(kd_map.items())), open(p, "w")); kd_map = p
        a = ["node", os.path.join(D, "mesin.mjs"), *kunci_j3.argumen_beku(), *(["--faktor", str(faktor)] if faktor else []), "--kejadian", ev, "--mulai", MULAI[ev],
             "--skala-hujan", str(skala), "--raster", jalur, "--keluar", os.path.join(KAL, nama + ".json")] + (["--kd", str(kd)] if kd_map is None else ["--kd", str(KD_AWAL), "--kd-kec", kd_map])
        subprocess.run(a, check=True, stdout=subprocess.DEVNULL)
    return jalur


def muat_label(ev):
    return json.loads(subprocess.run(["node", os.path.join(D, "mesin.mjs"), "label", ev], check=True, capture_output=True, text=True).stdout)


def kerugian_kec(R, nl):
    """{kec: kerugian berbobot} satu kejadian."""
    n, b = {}, {}
    for r, m in nl:
        k = f"{r['kab']}|{r['kec']}"; n[k] = n.get(k, 0) + 1; b[k] = b.get(k, 0) + (m >= skor_j3.AMBANG)
    banyak = len(nl) >= LAPORAN_BANYAK; out = {}
    for k, (s, w) in skor_j3.per_kec(R).items():
        if k in n:
            out[k] = max(n[k], N_MIN) * ((1 - b[k] / n[k]) + LAMBDA * w / s)
        elif banyak:
            out[k] = N_MIN * LAMBDA * w / s
    return out


def jumlah(daftar):
    o = {}
    for d in daftar:
        for k, v in d.items():
            o[k] = o.get(k, 0) + v
    return o


def total(d):
    return sum(d.values())


def pilih_skala(kerugian):
    """kerugian {skala: {kec: nilai}} -> skala terbaik (ikatan: yang terkecil)."""
    return min(sorted(kerugian), key=lambda s: total(kerugian[s]))


def pilih_kd(kerugian, kelompok=lambda k: k):
    """kerugian {kd: {kec: nilai}} (seragam, skala*) -> (Kd* seragam terbaik, {kelompok: kd}); penalti MU*|ln(kd/Kd*)| per kecamatan.
    kelompok(kec) = kec -> peta per kecamatan; kab -> peta per kab/kota (kenop = jumlah kab)."""
    kds = min(sorted(kerugian), key=lambda g: total(kerugian[g])); skor = {}
    for g, d in kerugian.items():
        for k, v in d.items():
            skor.setdefault(kelompok(k), {}).setdefault(g, 0); skor[kelompok(k)][g] += v + MU * abs(math.log(g / kds))
    return kds, {k: min(sorted(v), key=lambda g: v[g]) for k, v in skor.items()}


def peta_kec(peta_kelompok, kecs, kelompok=lambda k: k):
    return {k: peta_kelompok[kelompok(k)] for k in kecs if kelompok(k) in peta_kelompok}


def anggaran(grid_s, grid_kd, E):
    """tahap 1 + tahap 2 + tahap 3 (peta kecamatan dan peta kab) + pagar 2021-02 (final, seragam, kab = 3 run)"""
    return len(grid_s) * E + (len(grid_kd) - 1) * E + 2 * E + 3


def kab(k):
    return k.split("|")[0]


def loeo(h):
    """Leave-one-event-out dari tabel tahap 2: Kd dipilih dari kejadian lain, dinilai di kejadian yang ditahan. -> {ev: {kerugian_peta, kerugian_seragam, peta_lebih_baik}}; {} bila < 2 kejadian."""
    T = {int(g): v for g, v in h["tabel_tahap2"].items()}; evs = sorted(next(iter(T.values()))); out = {}
    for e in evs if len(evs) > 1 else []:
        sisa = {g: jumlah([v[x] for x in evs if x != e]) for g, v in T.items()}
        kds, peta = pilih_kd(sisa)
        lp = sum(T[peta.get(k, kds)][e].get(k, 0) for k in T[kds][e]); ls = total(T[kds][e])
        out[e] = {"kerugian_peta": lp, "kerugian_seragam": ls, "peta_lebih_baik": lp < ls}
    return out


def jalan(evs, grid_s, grid_kd, maks_run=None, jalankan=jalankan_mesin, label=muat_label, raster=skor_j3.baca_raster, tahap3=False):
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
            return {"berhenti": "anggaran kering habis", "tahap1": {str(a): total(b) for a, b in k1.items()}, "run": n[0]}
        k1[s] = jumlah(r)
    s_best = pilih_skala(k1); per_ev = {KD_AWAL: {e: rugi(e, skala=s_best, kd=KD_AWAL) for e in evs}}   # run ini ada di cache tahap 1
    for g in grid_kd:
        if g != KD_AWAL:
            per_ev[g] = {e: rugi(e, skala=s_best, kd=g) for e in evs}
    k2 = {g: jumlah(per_ev[g].values()) for g in per_ev}
    kds, p_kec = pilih_kd(k2); _, p_kab = pilih_kd(k2, kab)
    kecs = sorted(p_kec); p_kab_kec = peta_kec(p_kab, kecs, kab)
    h = {"skala": s_best, "kd_seragam": kds, "kd_kec": p_kec, "kd_kab": p_kab, "tahap1": {str(a): total(b) for a, b in k1.items()}, "tahap2": {str(a): total(b) for a, b in k2.items()},
         "tabel_tahap2": {str(g): {e: d for e, d in v.items()} for g, v in per_ev.items()}, "run": n[0]}
    if tahap3:   # tahap 3: peta (inline di hasil) dijalankan di kejadian kalibrasi; peta kecamatan dipakai hanya bila menang di kalibrasi DAN pada kejadian yang disisihkan (LOEO)
        l_kec = sum(total(rugi(e, skala=s_best, kd_map=p_kec)) for e in evs); l_kab = sum(total(rugi(e, skala=s_best, kd_map=p_kab_kec)) for e in evs); l_ser = total(k2[kds])
        lo = loeo(h); lo_ok = bool(lo) and sum(v["kerugian_peta"] for v in lo.values()) < sum(v["kerugian_seragam"] for v in lo.values())
        h.update({"kerugian_kalibrasi": {"seragam": l_ser, "kec": l_kec, "kab": l_kab}, "loeo": lo, "loeo_peta_menang": lo_ok, "final": "kec" if l_kec < l_ser and lo_ok else "seragam",
                  "kd_kab_kec": p_kab_kec, "run": n[0]})
    return h


def pagar(h, B, jalankan=jalankan_mesin, label=muat_label, raster=skor_j3.baca_raster, bahaya=None):
    """Skor 2021-02 dengan model final; hanya LAPORAN (tak memilih). -> dict, ditolak bila di bawah ambang BEKU `pagar` atau tak mengalahkan InaRISK pada luas sama."""
    ev, P = B["pagar"][0], B["pagar_ambang"]
    kw = {"kd": h["kd_seragam"]} if h["final"] == "seragam" else {"kd_map": h["kd_kec"]}
    R = raster(jalankan(ev, skala=h["skala"], **kw)); nl = skor_j3.nilai_laporan(R, label(ev)); luas = skor_j3.luas_basah(R); p = skor_j3.pod(nl)
    pi = skor_j3.pod_kec(nl, skor_j3.inarisk_ya(R, bahaya or {}, luas)) if bahaya is not None else None
    ok = p is not None and p >= P["pod_min"] and luas <= P["luas_basah_maks"] and (pi is None or p > pi)
    return {"pod": p, "luas_basah": luas, "pod_inarisk_luas_sama": pi, "n_laporan": len(nl), "ambang": P, "ditolak": not ok}


def uji():
    import array, re
    B = kunci_j3.beku(); A = B["kalibrasi_algo"]
    global KAL; kal0, sr0, KAL = KAL, subprocess.run, tempfile.mkdtemp(); subprocess.run = lambda a, **k: a   # peta Kd dict -> berkas --kd-kec (dulu crash di tahap 3)
    try:
        jalankan_mesin("2020-01", 1.0, kd_map={"b|x": 5.0, "a|y": 20.0}); assert json.load(open(glob.glob(os.path.join(KAL, "*.kd.json"))[0])) == {"a|y": 20.0, "b|x": 5.0}
    finally: KAL, subprocess.run = kal0, sr0
    assert (KD_AWAL, LAMBDA, MU, N_MIN, LAPORAN_BANYAK) == (A["kd_awal"], A["lambda"], A["mu"], A["n_min"], A["laporan_banyak"]), "konstanta cermin beda dari blok BEKU"
    js = open(os.path.join(D, "mesin.mjs"), encoding="utf8").read()
    ev = re.findall(r'"(\d{4}-\d\d)": \{mulai: "([\d-]+)", jam: (\d+), peran: "(\w+)"', js)
    peran = {e: r for r in ("kalibrasi", "pagar", "uji") for e in B[r]}
    assert {e: m for e, m, _, _ in ev} == MULAI == B["mulai"], "jendela beda dari KEJADIAN_J3 di mesin.mjs"
    assert all(int(j) == B["jam"] and peran[e] == r for e, _, j, r in ev) and len(ev) == len(peran) == 6, "peran/jam beda dari blok BEKU"
    with tempfile.TemporaryDirectory() as t:
        m1, m2, m3 = (os.path.join(t, f"{i}.json") for i in (1, 2, 3))
        json.dump({"A|a": 5}, open(m1, "w")); json.dump({"A|a": 8}, open(m2, "w")); json.dump({"A|a": 5}, open(m3, "w"))
        nm = [nama_cache("s" * 12, "2020-01", 1.0, kd=g) for g in (5, 8)] + [nama_cache("s" * 12, "2020-01", 1.0, kd_map=m) for m in (m1, m2, m3)]
        assert len(set(nm)) == 4 and nm[2] == nm[4] and nm[2] != nm[3] and nm[0] != nm[1], nm      # Kd beda / isi peta beda = nama beda; isi sama = nama sama
        assert nama_cache("s" * 12, "2020-01", 1.0, kd=5) != nama_cache("s" * 12, "2020-01", 1.0, kd=5, faktor=4) and nama_cache("a" * 12, "e", 1, kd=5) != nama_cache("b" * 12, "e", 1, kd=5)
    kecs = ["A|a", "B|b"]
    assert pilih_skala({1.0: {"x": 2}, 1.5: {"x": 1}}) == 1.5 and pilih_skala({1.0: {"x": 1}, 1.5: {"x": 1}}) == 1.0
    kds, peta = pilih_kd({5: {"A|a": 2, "B|b": 0.2}, 12: {"A|a": 0.5, "B|b": 0.9}, 30: {"A|a": 0.6, "B|b": 0.9}})
    assert kds == 12 and peta == {"A|a": 12, "B|b": 5}, (kds, peta)
    _, pk = pilih_kd({5: {"X|a": 1, "X|b": 1, "Y|c": 0.1}, 12: {"X|a": 0.5, "X|b": 0.5, "Y|c": 9}}, kab)
    assert pk == {"X": 12, "Y": 5} and peta_kec(pk, ["X|a", "Y|c"], kab) == {"X|a": 12, "Y|c": 5}
    assert anggaran((1, 1.25, 1.5, 1.75, 2.0), range(8), 3) == 5 * 3 + 7 * 3 + 2 * 3 + 3
    hm = array.array("f", [0.5] * 4 + [0.0] * 4); R = {"nx": 4, "ny": 2, "dx_m": 100.0, "lon0": 0.0, "lat0": 0.0, "dlon": 1e-3, "dlat": 1e-3, "nama": kecs, "kec": array.array("h", [0] * 4 + [1] * 4), "hm": hm}
    lap = [{"t": "2020-01-01T10:00:00+07:00", "lon": 0, "lat": 0, "kedalaman_cm": 20, "kab": "A", "kec": "a"}]
    k = kerugian_kec(R, skor_j3.nilai_laporan(R, lap)); assert k == {"A|a": N_MIN * LAMBDA * 1.0}, k    # w = max(1, N_MIN); kena + denda basah penuh; B tanpa laporan, <100 laporan: tak dihukum
    # membasahi semua tidak menang: Kd ekstrem (basah penuh, POD 1) vs Kd moderat (basah 25%, POD 0,5) pada 10 laporan
    assert 10 * ((1 - 1) + LAMBDA * 1.0) > 10 * ((1 - .5) + LAMBDA * .25) - 10 * .25 * 0, "LAMBDA 1: basah penuh (1,0) tidak mengalahkan miss separuh+basah seperempat (0,75)"
    dasar = dict(jalankan=lambda ev, **kw: "x", label=lambda e: lap, raster=lambda p: R)
    s = jalan(["2020-01"], (1.0, 1.5), (5, 12), maks_run=1, **dasar); assert s["berhenti"] and s["run"] == 1
    s = jalan(["2020-01"], (1.0, 1.5), (5, 12), tahap3=True, **dasar)
    assert s["skala"] == 1.0 and s["kd_seragam"] in (5, 12) and set(s["kd_kec"]) == {"A|a"} and s["final"] == "seragam" and s["loeo"] == {}, s     # peta tak lebih baik / LOEO kosong: seragam
    ev3 = ["2017-01", "2018-01", "2020-01"]; hh = {"tabel_tahap2": {"5": {e: {"X|1": 3, "X|2": 1} for e in ev3}, "12": {e: {"X|1": 1, "X|2": 3} for e in ev3}}}
    lo = loeo(hh); assert set(lo) == set(ev3) and all(v["kerugian_peta"] <= v["kerugian_seragam"] for v in lo.values())
    assert not loeo({"tabel_tahap2": {"5": {"a": {"X|1": 1}}}})
    P = {"pod_min": .4, "luas_basah_maks": .25}
    g = pagar({"final": "seragam", "kd_seragam": 12, "skala": 1.0}, {"pagar": ["2021-02"], "pagar_ambang": P}, bahaya={"31|A|a": {"banjir": 1}}, **dasar)
    assert g["pod"] == 1.0 and g["luas_basah"] == .5 and g["ditolak"], g     # luas basah 50% > 25%: ditolak
    R0 = {**R, "hm": array.array("f", [0.0] * 7 + [0.2])}   # tak ada sel basah di laporan, luas basah kecil
    g = pagar({"final": "seragam", "kd_seragam": 12, "skala": 1.0}, {"pagar": ["2021-02"], "pagar_ambang": P}, bahaya={"31|A|a": {"banjir": 1}}, jalankan=lambda ev, **kw: "x", label=lambda e: lap, raster=lambda p: R0)
    assert g["pod"] == 0.0 and g["luas_basah"] <= .25 and g["ditolak"], g     # POD < 0,4: ditolak
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
        os.makedirs(KAL, exist_ok=True)

        if os.path.exists(kunci_j3.STATE) and json.load(open(kunci_j3.STATE)).get("dibuka"):
            sys.exit("label uji sudah dibuka: kalibrasi tidak boleh diulang")
        h = jalan(B["kalibrasi"], gs, gk, tahap3=True)
        h["sidik"] = kunci_j3.sidik()
        bahaya = json.load(open(os.path.join(AKAR, "public/banjir/data/bahaya.json")))["kec"]
        h["pagar"] = pagar(h, B, bahaya=bahaya); h["ditolak_pagar"] = h["pagar"]["ditolak"]
        json.dump(h, open(os.path.join(KAL, "hasil_j3.json"), "w"), indent=1, sort_keys=True); print("ditulis hasil_j3.json; ditolak_pagar =", h["ditolak_pagar"])
    else:
        sys.exit(__doc__)
