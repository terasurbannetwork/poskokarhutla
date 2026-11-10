"""Pertumbuhan bangunan di zona bahaya dari GHSL BUILT-S R2023A (SK-095, ALG F6.5). Semua keluaran `hipotesis`.

Epoch 2015 dan 2020 berbasis pengamatan, 2025 dan 2030 model (pasangan 2015-2020 'pengamatan', 2020-2030 'model'). B_Z(e) = jumlah m2 terbangun piksel 100 m
yang pusatnya di zona Z (F2), B_k = seluruh kabupaten. CAGR_Z = (B_Z(e2)/B_Z(e1))^(1/(e2-e1)) - 1 bila B_Z(e1) > 0; indeks konsentrasi =
((B_Z(e2)-B_Z(e1))/(B_k(e2)-B_k(e1))) / (A_Z/A_k) bila penyebut > 0 dan B_k tumbuh. Tidak terhitung = None ("menunggu"), tidak pernah 0.
Irisan PIPPIB dan konsesi (ha) dihitung dari pusat piksel (1 piksel = 1 ha), bukan pemotongan geometri; RTRW tidak otomatis. GHSL belum diunduh = menunggu.
Inti stdlib, teruji tanpa jaringan; pembacaan GeoTIFF Mollweide (`lab`) butuh rasterio dan pyproj di venv sementara, bukan di repo.
Pakai: python3 -I scripts/siklus/ghsl_lab.py uji | <python-venv-lab> -I scripts/siklus/ghsl_lab.py lab PROV EPOCH=ubin1.tif,ubin2.tif [EPOCH=...]
"""
import importlib.util, json, os, sys

AB = os.path.dirname(os.path.abspath(__file__))
AKAR = os.path.normpath(os.path.join(AB, "../.."))
EPOCH = (2015, 2020, 2025, 2030)
MODEL_EPOCH = (2025, 2030)
PASANGAN = (((2015, 2020), "pengamatan"), ((2020, 2030), "model"))
CATATAN = "indikasi pertumbuhan terbangun terhadap zona, bukan ramalan kejadian; epoch 2025 dan 2030 hasil model GHSL; RTRW tidak diperiksa otomatis"


def _muat(nama):
    s = importlib.util.spec_from_file_location("sk_gl_" + nama, os.path.join(AB, nama + ".py"))
    m = importlib.util.module_from_spec(s)
    s.loader.exec_module(m)
    return m


def _angka(x):
    return isinstance(x, (int, float)) and not isinstance(x, bool) and x >= 0


def cagr(b1, b2, e1, e2):
    """Fraksi per tahun; None bila B(e1) tidak positif, nilai kosong, atau e2 <= e1."""
    if not (_angka(b1) and _angka(b2)) or b1 <= 0 or e2 <= e1:
        return None
    return (b2 / b1) ** (1 / (e2 - e1)) - 1


def indeks_konsentrasi(bz1, bz2, bk1, bk2, az, ak):
    """>1: pertumbuhan terkonsentrasi di zona melebihi porsi luasnya. None bila B_k tidak tumbuh, luas tidak positif, atau data kosong."""
    if not all(_angka(x) for x in (bz1, bz2, bk1, bk2, az, ak)) or bk2 - bk1 <= 0 or az <= 0 or ak <= 0:
        return None
    return ((bz2 - bz1) / (bk2 - bk1)) / (az / ak)


def hitung_kab(bk, ak, zona=None, tata_ruang=None):
    """bk {epoch: m2|None} seluruh kabupaten; ak luas kabupaten m2; zona {nama: {'bz': {epoch: m2|None}, 'az': m2}};
    tata_ruang {'pippib_ha': x|None, 'konsesi_ha': y|None} (irisan dengan zona). -> isi satu kabupaten di tumbuh_<prov>.json."""
    for e in bk:
        if e not in EPOCH:
            raise ValueError(f"epoch {e} bukan salah satu {EPOCH}")
    for nama, z in (zona or {}).items():
        for e in z["bz"]:
            if e not in EPOCH:
                raise ValueError(f"{nama}: epoch {e} bukan salah satu {EPOCH}")
    out = {"epoch": list(EPOCH), "built_m2": [bk.get(e) for e in EPOCH], "model_epoch": list(MODEL_EPOCH), "luas_m2": ak,
           "cagr_persen": {}, "di_zona": {}, "zona": {}}
    for (e1, e2), basis in PASANGAN:
        c = cagr(bk.get(e1), bk.get(e2), e1, e2)
        out["cagr_persen"][f"{e1}-{e2}"] = {"nilai": None if c is None else c * 100, "basis": basis}
    for nama, z in (zona or {}).items():
        out["di_zona"][nama] = [z["bz"].get(e) for e in EPOCH]
        out["zona"][nama] = {"luas_m2": z["az"], "pasangan": {}}
        for (e1, e2), basis in PASANGAN:
            c = cagr(z["bz"].get(e1), z["bz"].get(e2), e1, e2)
            out["zona"][nama]["pasangan"][f"{e1}-{e2}"] = {
                "cagr_persen": None if c is None else c * 100, "basis": basis,
                "indeks_konsentrasi": indeks_konsentrasi(z["bz"].get(e1), z["bz"].get(e2), bk.get(e1), bk.get(e2), z["az"], ak)}
    tr = tata_ruang or {}
    out["tata_ruang"] = {"pippib_ha": tr.get("pippib_ha"), "konsesi_ha": tr.get("konsesi_ha"), "dasar": "pusat piksel 100 m, 1 piksel = 1 ha",
                         "rtrw": "tidak otomatis"}
    return out


def irisan_ha(pusat, poligon, dalam):
    """Jumlah ha (1 piksel 100 m = 1 ha) dari pusat piksel [(x, y)] di dalam poligon (daftar cincin luar); dalam(x, y, cincin) dari iklim_lab."""
    return sum(1 for x, y in pusat if any(dalam(x, y, c) for c in poligon))


def tumbuh_prov(prov, kab_hasil, G=None):
    G = G or _muat("gudang")
    for k in kab_hasil:
        if not (len(k) == 4 and k.isdigit() and k.startswith(prov)):
            raise ValueError(f"kab4 {k!r} bukan kode Kemendagri provinsi {prov}")
    return G.selubung("tumbuh", {"prov": prov, "yakin": "hipotesis", "sumber": "ghsl-built-s", "catatan": CATATAN, "kab": kab_hasil})


def tulis(root, prov, isi):
    """siklus/saji/masa_depan/tumbuh_<prov>.json setelah lolos batas 2 MB dan kunci terlarang; -> daftar masalah."""
    S = _muat("saji")
    k = f"siklus/saji/masa_depan/tumbuh_{prov}.json"
    data = json.dumps(isi, ensure_ascii=False, sort_keys=True).encode()
    m = S.periksa_berkas(k, data)
    if not m:
        j = os.path.join(root, *k.split("/"))
        os.makedirs(os.path.dirname(j), exist_ok=True)
        open(j, "wb").write(data)
    return m


def _luas(poli):
    """Luas m2 poligon GeoJSON dalam koordinat sama-luas (Mollweide): cincin luar dikurangi lubang."""
    sh = lambda c: abs(sum(x1 * y2 - x2 * y1 for (x1, y1), (x2, y2) in zip(c, c[1:] + c[:1]))) / 2
    return sum(sh(p[0]) - sum(sh(h) for h in p[1:]) for p in poli)


def lab_kab(prov, epoch_tif, akar=AKAR):
    """epoch_tif {epoch: [jalur .tif ubin 54009 100 m]} -> {kab4: hitung_kab(...)} satu provinsi, tanpa zona (zona F2 menyusul, 'menunggu').
    B_k(e) = jumlah nilai piksel yang pusatnya di dalam poligon kabupaten; nilai nodata dikeluarkan; ubin tidak ada = None."""
    import numpy as np, rasterio
    from pyproj import Transformer
    from rasterio.features import geometry_mask
    K, IL = _muat("kunci"), _muat("iklim_lab")
    geo = json.load(open(os.path.join(akar, "public/geo/kabupaten", f"{prov}.json")))["features"]
    tf = Transformer.from_crs(4326, "ESRI:54009", always_xy=True)
    hasil, tak, topeng = {}, [], {}
    ubin = {e: [(r, r.read(1).astype("float64")) for r in (rasterio.open(j) for j in js)] for e, js in epoch_tif.items()}
    for ft in geo:
        k = K.kab4(ft["properties"]["kab"], prov)
        if k is None:
            tak.append(ft["properties"]["kab"])
            continue
        poli = [[[list(tf.transform(x, y)) for x, y in ring] for ring in p] for p in IL._poligon(ft["geometry"])]
        ak, bk = _luas([[[tuple(c) for c in r] for r in p] for p in poli]), {}
        for e, rs in ubin.items():
            tot, ada = 0, False
            for r, ar in rs:
                for p in poli:
                    g = {"type": "Polygon", "coordinates": p}
                    xs = [c[0] for c in p[0]]
                    ys = [c[1] for c in p[0]]
                    b = r.bounds
                    if max(xs) < b.left or min(xs) > b.right or max(ys) < b.bottom or min(ys) > b.top:
                        continue
                    kc = (k, id(p), r.bounds)  # topeng sama untuk semua epoch (grid ubin sama)
                    if kc not in topeng:
                        topeng[kc] = geometry_mask([g], out_shape=r.shape, transform=r.transform, invert=True)
                    ok = topeng[kc] & (ar != r.nodata) & (ar >= 0)
                    tot += float(ar[ok].sum())
                    ada = True
            bk[e] = tot if ada else None
        hasil[k] = hitung_kab(bk, ak)
    return {"kab": hasil, "tak_terpetakan": tak}


def _uji():
    import tempfile
    # UJ-F6-03 kasus ALG F6.5
    c = cagr(40000, 46000, 2015, 2020)
    assert abs(c * 100 - 2.83) < .01, c
    assert abs(indeks_konsentrasi(40000, 46000, 400000, 420000, 10, 100) - 3.0) < 1e-9
    assert cagr(0, 5, 2015, 2020) is None and cagr(None, 5, 2015, 2020) is None and cagr(5, 6, 2020, 2020) is None, "B(e1) = 0 tanpa CAGR"
    assert indeks_konsentrasi(1, 2, 400, 400, 10, 100) is None and indeks_konsentrasi(1, 2, 400, 390, 10, 100) is None, "B_k tidak tumbuh = None"
    assert indeks_konsentrasi(1, 2, 400, 410, 0, 100) is None and indeks_konsentrasi(None, 2, 4, 5, 1, 2) is None
    bk = {2015: 400000, 2020: 420000, 2025: 430000, 2030: 441000}
    z = {"banjir": {"bz": {2015: 40000, 2020: 46000, 2025: 48000, 2030: 50000}, "az": 10}, "karhutla": {"bz": {2015: 0, 2020: 100, 2025: None, 2030: None}, "az": 5}}
    h = hitung_kab(bk, 100, z, {"pippib_ha": 12, "konsesi_ha": None})
    p = h["zona"]["banjir"]["pasangan"]["2015-2020"]
    assert h["epoch"] == [2015, 2020, 2025, 2030] and h["model_epoch"] == [2025, 2030] and p["basis"] == "pengamatan" and abs(p["indeks_konsentrasi"] - 3.0) < 1e-9
    assert h["zona"]["banjir"]["pasangan"]["2020-2030"]["basis"] == "model"
    kh = h["zona"]["karhutla"]["pasangan"]
    assert kh["2015-2020"]["cagr_persen"] is None and kh["2020-2030"]["cagr_persen"] is None and kh["2020-2030"]["indeks_konsentrasi"] is None, "tanpa data: None, bukan 0"
    assert h["tata_ruang"]["pippib_ha"] == 12 and h["tata_ruang"]["konsesi_ha"] is None and h["tata_ruang"]["rtrw"] == "tidak otomatis"
    assert hitung_kab({}, 100)["built_m2"] == [None] * 4 and hitung_kab({}, 100)["cagr_persen"]["2015-2020"]["nilai"] is None, "GHSL belum diunduh = menunggu"
    for salah in ({1999: 5}, {"2020": 5}):
        try:
            hitung_kab(salah, 100)
            raise AssertionError("epoch asing ditolak")
        except ValueError:
            pass
    IL = _muat("iklim_lab")
    sq = [[[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]]]
    assert abs(_luas([[[(0, 0), (10, 0), (10, 10), (0, 10)], [(2, 2), (4, 2), (4, 4), (2, 4)]]]) - 96) < 1e-9, "luas = luar - lubang"
    assert irisan_ha([(5, 5), (11, 5), (1, 1)], sq, IL._dalam) == 2
    isi = tumbuh_prov("33", {"3301": h})
    assert isi["yakin"] == "hipotesis" and isi["jenis"] == "tumbuh" and "total" not in json.dumps(isi)
    try:
        tumbuh_prov("33", {"3201": h})
        raise AssertionError("kab4 provinsi lain ditolak")
    except ValueError:
        pass
    with tempfile.TemporaryDirectory() as t:
        assert tulis(t, "33", isi) == [] and os.path.exists(os.path.join(t, "siklus/saji/masa_depan/tumbuh_33.json"))
        assert "melewati batas" in " ".join(tulis(t, "34", {**isi, "x": "y" * 2_000_000}))
        S = _muat("saji")
        assert S.masa_depan_ringkas(t)["status"] == "menunggu", "tumbuh_ bukan masa_depan: tidak masuk ringkasan"
    print("ghsl_lab: uji hijau")


if __name__ == "__main__":
    a = sys.argv[1:]
    if a[:1] == ["uji"]:
        _uji()
    elif a[:1] == ["lab"] and len(a) >= 3:
        try:
            r = lab_kab(a[1], {int(x.split("=", 1)[0]): x.split("=", 1)[1].split(",") for x in a[2:] if "=" in x})
        except ImportError as e:
            sys.exit(f"pustaka lab belum ada ({e}); pasang di venv sementara, bukan di repo")
        print(json.dumps(r, ensure_ascii=False, sort_keys=True))
    else:
        sys.exit("pakai: ghsl_lab.py uji | lab PROV EPOCH=ubin1.tif,ubin2.tif [EPOCH=...]")
