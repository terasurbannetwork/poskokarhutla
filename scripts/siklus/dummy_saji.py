"""Berkas contoh dummy paparan di R2 (DT 9 butir 6): siklus/saji/_dummy/paparan/* memakai paparan.hitung_kab dan paparan.rinci yang SAMA dengan produksi
pada fixture kecil. Selubung dummy:true, wilayah fiktif (provinsi 99, kabupaten 9999, kecamatan Contoh), koordinat di 0,0 (laut, bukan wilayah nyata),
di luar manifest produksi (saji.bangun melewati _dummy/). Bagian masa depan ditambah tiket ghsl.
Pakai: python3 -I scripts/siklus/dummy_saji.py bangun ROOT | uji
"""
import importlib.util, json, os, sys, tempfile

AB = os.path.dirname(os.path.abspath(__file__))


def _muat(nama):
    s = importlib.util.spec_from_file_location("sk_" + nama, os.path.join(AB, nama + ".py"))
    m = importlib.util.module_from_spec(s)
    s.loader.exec_module(m)
    return m


P, S, G = _muat("paparan"), _muat("saji"), _muat("gudang")
PROV, KAB = "99", "9999"


def fixture():
    """Sel 110 m di sekitar 0,0; 2 kecamatan, 3 desa. Angka fiktif."""
    sel = [(i, j, 20 + 5 * ((i + j) % 4), 1500 + 100 * ((i + j) % 4), "Contoh A" if j < 6 else "Contoh B", (j + .5) * .001, (i + .5) * .001)
           for i in range(0, 8) for j in range(0, 12)]
    desa = [("D1", "Contoh A", .001, .002, 900), ("D2", "Contoh A", .004, .006, 700), ("D3", "Contoh B", .009, .004, 800)]
    wp = {"Contoh A": 1500, "Contoh B": 950}
    poligon = {"type": "Polygon", "coordinates": [[[0, 0], [.006, 0], [.006, .004], [0, .004], [0, 0]]]}
    zonas = [P.zona_dari_bagian([poligon], "banjir", "poligon"), P.zona_dari_bagian([{"type": "Point", "coordinates": [.003, .003]}], "karhutla", "km1", 1),
             P.tak_tersedia("rob", "hanya titik tinggi laut, tidak ada poligon"), P.tak_tersedia("gempa", "pita MMI dihitung tiket F3.1")]
    return sel, desa, wp, zonas


def berkas():
    """-> {nama relatif di bawah paparan/: isi} (belum diselubungi)."""
    sel, desa, wp, zonas = fixture()
    h = P.hitung_kab(sel, zonas, desa, wp, None, None)
    h["kab4"], h["nama"] = KAB, "Kabupaten Contoh"
    return {f"{PROV}.json": P.ringkas_prov(PROV, True, {KAB: {"n": h["n"], "luas_m2": h["luas_m2"]}}),
            f"kab/{KAB}.json": h, f"rinci/{KAB}.json": {"kab4": KAB, **P.rinci(sel, zonas, 0.0, 0.0, 0.001)}}


def bangun(root):
    """Tulis tiga berkas contoh; -> daftar masalah (batas ukuran dan kunci terlarang diperiksa dengan kunci produksi yang setara)."""
    masalah, tulisan = [], []
    for nama, isi in berkas().items():
        data = json.dumps(P.selubung("paparan", {"dummy": True, **isi}, G), ensure_ascii=False, sort_keys=True).encode()
        m = S.periksa_berkas(f"siklus/saji/paparan/{nama}", data)
        masalah += m
        tulisan.append((nama, data))
    if not masalah:
        for nama, data in tulisan:
            j = os.path.join(root, "siklus", "saji", "_dummy", "paparan", *nama.split("/"))
            os.makedirs(os.path.dirname(j), exist_ok=True)
            open(j, "wb").write(data)
    return masalah


def _uji():
    with tempfile.TemporaryDirectory() as t:
        assert bangun(t) == []
        dasar = os.path.join(t, "siklus/saji/_dummy/paparan")
        ada = sorted(os.path.relpath(os.path.join(a, f), dasar) for a, _, fs in os.walk(dasar) for f in fs)
        assert ada == ["99.json", f"kab/{KAB}.json", f"rinci/{KAB}.json"], ada
        isi = {n: json.load(open(os.path.join(dasar, n))) for n in ada}
        assert all(b["dummy"] is True and b["yakin"] == "estimasi-model" and b["ambang_keyakinan"] == 0.7 for b in isi.values())
        k = isi[f"kab/{KAB}.json"]
        assert k["zona"]["rob"]["tersedia"] is False and k["zona"]["banjir"]["per_zona"]["poligon"]["n"] > 0   # fungsi agregat yang sama dengan produksi
        r = isi[f"rinci/{KAB}.json"]
        assert r["sel_m"] == 110 and r["sel"] and all(abs(r["lat0"] + (c[0] + .5) * r["step"]) < .01 and abs(r["lon0"] + (c[1] + .5) * r["step"]) < .02 for c in r["sel"])
        assert "total" not in json.dumps(isi)
        # di luar manifest produksi
        assert S.bangun(t, {"plafon_byte": 10_000_000, "lapis": {"mentah": 3_000_000, "bersih": 3_000_000, "saji": 3_000_000}, "fitur": {"F2": "menunggu"}, "berkas_public_maks": 200},
                        S.R.muat(), public=0) == []
        man = json.load(open(os.path.join(t, "siklus/saji/manifest.json")))
        assert not any("_dummy" in x["kunci"] for x in man["berkas"])
    # fixture rusak ditolak: kunci terlarang masuk -> tidak ada berkas ditulis
    asli = berkas
    globals()["berkas"] = lambda: {**asli(), "kab/9999.json": {"kab": {"x": {"total": 5}}}}
    try:
        with tempfile.TemporaryDirectory() as t:
            m = bangun(t)
            assert m and "kunci terlarang" in " ".join(m) and not os.path.exists(os.path.join(t, "siklus"))
    finally:
        globals()["berkas"] = asli
    print("dummy_saji: uji hijau")


if __name__ == "__main__":
    a = sys.argv[1:]
    if a == ["uji"]:
        _uji()
    elif a[:1] == ["bangun"] and len(a) == 2:
        m = bangun(a[1])
        print("\n".join(m) or "dummy_saji: 3 berkas ditulis di _dummy/paparan")
        sys.exit(1 if m else 0)
    else:
        sys.exit("pakai: dummy_saji.py bangun ROOT | uji")
