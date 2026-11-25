"""KI-81: Vs30 per tapak + koreksi bias jarak/kedalaman guncangan.py, diuji lawan MMI laporan MAGMA (latih separuh awal waktu, uji separuh akhir).
Kriteria dikunci di koreksi_guncangan.kriteria.json + .sidik SEBELUM UJI dibuka. UJI dibuka sekali (sidik.buka).

Pakai (dari akar repo, `python3 -I`):  uji | latih (hanya LATIH, tidak menyentuh UJI) | kunci (tulis .sidik) | buka (UJI sekali, tulis hasil)
"""
import hashlib, importlib.util, json, os, statistics as st, sys

AKAR = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".."))
DIR = os.path.join(AKAR, "scripts/gempa")


def _muat(nama, *jalur):
    sp = importlib.util.spec_from_file_location(nama, os.path.join(AKAR, *jalur))
    mod = importlib.util.module_from_spec(sp)
    sys.modules[nama] = mod
    sp.loader.exec_module(mod)
    return mod


SD = _muat("umum_sidik", "scripts", "umum", "sidik.py")
PB = _muat("umum_pembanding", "scripts", "umum", "pembanding.py")
KM = _muat("gempa_kajian_magma", "scripts", "gempa", "kajian_magma.py")
GC = _muat("gempa_guncangan", "scripts", "gempa", "guncangan.py")

REL = "scripts/gempa/koreksi_guncangan"
KODE = [REL + ".py", "scripts/gempa/kajian_magma.py"]
KRITERIA, SIDIK, BUKA, JEJAK, HASIL = REL + ".kriteria.json", REL + ".sidik", REL + ".buka", REL + ".jejak.jsonl", "public/gempa/data/koreksi_guncangan.json"
MAGMA_JSON, VS30_BIN = "public/gempa/data/kajian_magma.json", "public/gempa/data/vs30.bin"
TGL_BELAH = "2020-11-18"   # LATIH <= ini < UJI
K_KECIL, PUTARAN, B, BENIH = 10.0, 25, 1000, 11
KJ = [n for _, n in KM.JARAK]
KD = [KM.kelas_dalam(x) for x in (0, 100, 400)]


def pasangan():
    d = json.load(open(os.path.join(AKAR, MAGMA_JSON)))
    ps, _ = KM.banding(d["kajian"], GC, KM.indeks_tempat(json.load(open(GC.PUSAT))))
    V = GC.muat_vs30()
    for p in ps:
        p["lama"] = GC.mmi_perkiraan(p["m"], p["d"], p["dalam"], p["jenis"])
        p["site"] = GC.mmi_perkiraan(p["m"], p["d"], p["dalam"], p["jenis"], V(p["lat"], p["lon"]))
        p["kj"], p["kd"] = KM.kelas_jarak(p["jarak"]), KM.kelas_dalam(p["dalam"])
    return ps


def belah(ps):
    return [p for p in ps if p["tgl"] <= TGL_BELAH], [p for p in ps if p["tgl"] > TGL_BELAH]


def lat_koreksi(latih):
    """{'mu', 'a': {kelas jarak: nilai}, 'b': {kelas dalam: nilai}}; sisa = site - laporan."""
    r = [p["site"] - p["lapor"] for p in latih]
    mu = sum(r) / len(r)
    a, b = {k: 0.0 for k in KJ}, {k: 0.0 for k in KD}
    for _ in range(PUTARAN):
        for tab, kunci in ((a, "kj"), (b, "kd")):
            lain = b if tab is a else a
            lk = "kd" if tab is a else "kj"
            for k in tab:
                s = [r[i] - mu - lain[latih[i][lk]] for i, p in enumerate(latih) if p[kunci] == k]
                tab[k] = sum(s) / (len(s) + K_KECIL) if s else 0.0
    return {"mu": mu, "a": a, "b": b}


def koreksi(p, c):
    return min(10.0, max(1.0, p["site"] - (c["mu"] + c["a"][p["kj"]] + c["b"][p["kd"]])))


def mae(ps, kunci):
    return sum(abs(p[kunci] - p["lapor"]) for p in ps) / len(ps)


def bias(ps, kunci):
    return sum(p[kunci] - p["lapor"] for p in ps) / len(ps) if ps else None


def tabel(ps, kunci):
    return {k: {"n": len(s), "bias": round(bias(s, kunci), 2), "mae": round(mae(s, kunci), 2)} for k, s in
            ((k, [p for p in ps if p["kj"] == k]) for k in KJ) if s} | {k: {"n": len(s), "bias": round(bias(s, kunci), 2), "mae": round(mae(s, kunci), 2)} for k, s in
            ((k, [p for p in ps if p["kd"] == k]) for k in KD) if s}


def vonis(ps, c):
    for p in ps:
        p["baru"] = koreksi(p, c)
    sel = PB.bootstrap_blok(lambda s: mae(s, "lama") - mae(s, "baru"), ps, "id", B=B, seed=BENIH)
    dek = [p for p in ps if p["kj"] == KJ[0]]
    b_l, b_b = abs(bias(dek, "lama")), abs(bias(dek, "baru"))
    lolos = mae(ps, "baru") < mae(ps, "lama") and sel["lo"] is not None and sel["lo"] > 0 and b_b < b_l
    return {"vonis": "lolos" if lolos else "gagal", "n": len(ps), "kejadian": len({p["id"] for p in ps}),
            "mae": {"lama": round(mae(ps, "lama"), 3), "hanya_vs30": round(mae(ps, "site"), 3), "baru": round(mae(ps, "baru"), 3)},
            "benar_1": {k: round(sum(abs(p[k] - p["lapor"]) <= 1 for p in ps) / len(ps), 3) for k in ("lama", "site", "baru")},
            "selang_selisih_mae_lama_minus_baru": {k: sel[k] for k in ("est", "lo", "hi", "B", "n_blok")},
            "bias_dekat_lama_baru": [round(bias(dek, "lama"), 2), round(bias(dek, "baru"), 2)],
            "per_kelas": {"lama": tabel(ps, "lama"), "hanya_vs30": tabel(ps, "site"), "baru": tabel(ps, "baru")}}


def masukan():
    h = lambda b: hashlib.sha256(b).hexdigest()[:16]
    return [h(json.dumps(GC.PARAM, sort_keys=True).encode()), h(open(os.path.join(AKAR, MAGMA_JSON), "rb").read()), h(open(os.path.join(AKAR, VS30_BIN), "rb").read())]


def latih():
    ps = pasangan()
    tr, te = belah(ps)
    c = lat_koreksi(tr)
    print(json.dumps({"latih": len(tr), "uji_n_saja": len(te), "koreksi": c, "mae_latih_lama": round(mae(tr, "lama"), 3), "mae_latih_site": round(mae(tr, "site"), 3)}, indent=1))
    return tr, te, c


def kunci():
    os.chdir(AKAR)
    d = SD.tulis(SIDIK, KODE, KRITERIA, masukan())
    print("sidik", d["sidik"])


def buka():
    os.chdir(AKAR)
    s = SD.cek(SIDIK)
    assert s["masukan"] == masukan(), "masukan (PARAM, kajian_magma.json, vs30.bin) berubah sejak sidik"
    tr, te, c = latih()
    SD.buka(BUKA, JEJAK, s["sidik"], None)   # gagal bila sudah dibuka; sebelum UJI disentuh
    out = {"v": 1, "sidik": s["sidik"], "tgl_belah": TGL_BELAH, "koreksi": c, "uji": vonis(te, c),
           "catatan": "Vonis hanya untuk UJI (separuh akhir waktu). Bias seleksi MAGMA (tempat yang merasakan, kajian gempa merusak) tidak hilang. Tampil di layar tidak berubah."}
    json.dump(out, open(HASIL, "w"), ensure_ascii=False, indent=1)
    with open(JEJAK, "a") as f:
        f.write(json.dumps({"hasil": out["uji"]["vonis"], "mae": out["uji"]["mae"]}) + "\n")
    print(json.dumps(out["uji"], ensure_ascii=False, indent=1))


def uji():
    # fit memulihkan bias tambahan sintetis; vonis menolak koreksi yang memperburuk
    ps = [{"id": i // 3, "lapor": 4.0, "site": 4.0 + 1.0 * (i % 3 == 0) - 0.5, "kj": KJ[0] if i % 3 == 0 else KJ[2], "kd": KD[0], "lama": 5.0, "tgl": "2017-01-01"} for i in range(900)]
    c = lat_koreksi(ps)
    for p in ps:
        assert abs(koreksi(p, c) - 4.0) < 0.12, (koreksi(p, c), c)
    jelek = {"mu": -2.0, "a": {k: 0.0 for k in KJ}, "b": {k: 0.0 for k in KD}}
    dat = [{"id": i, "lapor": 4.0, "site": 4.0, "lama": 4.0 + (i % 2) * 0.5, "kj": KJ[0], "kd": KD[0]} for i in range(40)]
    assert vonis(dat, jelek)["vonis"] == "gagal"
    assert vonis([dict(p, site=p["lama"]) for p in dat], {"mu": 0.0, "a": {k: 0.0 for k in KJ}, "b": {k: 0.0 for k in KD}})["vonis"] == "gagal"  # tak ada perbaikan
    assert vonis(dat, {"mu": 0.0, "a": {k: 0.0 for k in KJ}, "b": {k: 0.0 for k in KD}})["vonis"] == "lolos"  # site=4,0 sempurna lawan lama 4,0/4,5
    tr, te = belah([{"tgl": "2020-11-18"}, {"tgl": "2020-11-19"}])
    assert len(tr) == 1 and len(te) == 1
    print("koreksi_guncangan uji OK")


if __name__ == "__main__":
    {"uji": uji, "latih": latih, "kunci": kunci, "buka": buka}[sys.argv[1] if len(sys.argv) > 1 else "uji"]()
