#!/usr/bin/env python3
"""HR-05: uji kejujuran T10 kelengkapan bangunan OSM (RENCANA-UJI pemetaan-relawan, bagian "Kriteria T10 terkunci").
Mesin hanya mengundi 10 kab, menghitung kelas mesin, mengundi petak 1 km2, dan menghitung vonis dari lembar
yang diisi MANUSIA. Mesin tidak pernah mengisi kelas manual. Tanpa nama orang; keluaran agregat.
Lembar isian (tanpa kelas mesin) dan kunci mesin ditulis terpisah (kriteria butir 5).
Pakai: python3 -I scripts/pemetaan/uji_jujur.py --cek
       python3 -I scripts/pemetaan/uji_jujur.py --undi [--keluar <dir>]      # jaringan ohsome
       python3 -I scripts/pemetaan/uji_jujur.py --vonis [--keluar <dir>]"""
import csv, hashlib, importlib.util, json, os, random, sys
from datetime import datetime, timezone

AB = os.path.dirname(os.path.abspath(__file__))
AKAR = os.path.normpath(os.path.join(AB, "../.."))
PAKET = os.path.join(AKAR, "data/kajian-bnpb/pemetaan-relawan")
KELUAR = os.path.join(PAKET, "uji-jujur")
JUDUL = "## Kriteria T10 terkunci"
SIDIK_KUNCI = "89731d7d887c2de3cc1862c8ca1781e0ccc23c6cc0bcca9707c0ba66c57fa2a5"   # sidik bagian kriteria saat dikunci 26 Nov 2026
BENIH = 20261126
STRATA = (("perkotaan", 4), ("perdesaan", 4), ("campuran", 2))
PADAT_DESA = 50.0     # bangunan per km2 (kriteria butir 2)
UBIN = 9              # 9 x 9 sel 0,001 derajat = ubin 0,009 derajat (~1 km)
UBIN_MIN = 20
KELAS = ("tipis", "sedang", "memadai")
TAK_TERBACA = "tak terbaca"


def _muat(nama, rel):
    s = importlib.util.spec_from_file_location(nama, os.path.join(AKAR, rel))
    m = importlib.util.module_from_spec(s)
    sys.modules.setdefault(nama, m)
    s.loader.exec_module(m)
    return m


KL = _muat("pm_kelengkapan", "scripts/pemetaan/kelengkapan.py")
PK = _muat("pm_paket", "scripts/pemetaan/paket.py")
PB, KONST = KL.PB, KL.KONST


def sidik(teks):
    """SHA-256 bagian kriteria (dari judul sampai akhir berkas, cara `sed -n '/judul/,$p' | shasum`)."""
    i = teks.index(JUDUL)
    return hashlib.sha256(teks[i:].encode("utf-8")).hexdigest()


def sidik_berkas():
    return sidik(open(os.path.join(PAKET, "RENCANA-UJI.md"), encoding="utf-8").read())


def strata(nama, padat):
    if nama.startswith("Kota"):
        return "perkotaan"
    if padat is None:
        return None
    return "perdesaan" if padat < PADAT_DESA else "campuran"


def undi_kab(kode, ada_grid, ukur, benih=BENIH):
    """kode = kode.json; ada_grid(prov) bool; ukur(prov, kab4) -> baris kelengkapan + 'padat'/'kelas'.
    -> (terpilih [(strata, kab4, baris)], dilewati [(kab4, alasan)]). Butir 1-3 kriteria."""
    calon = sorted(k for k, v in kode.items() if ada_grid(v["prov"]))
    random.Random(benih).shuffle(calon)
    sisa, prov_pakai, pilih, lewat = dict(STRATA), set(), [], []
    for k in calon:
        if not any(sisa.values()):
            break
        v = kode[k]
        if v["prov"] in prov_pakai:
            continue
        kota = v["nama"].startswith("Kota")
        if kota and not sisa["perkotaan"] or not kota and not (sisa["perdesaan"] or sisa["campuran"]):
            continue
        b = ukur(v["prov"], k)
        s = strata(v["nama"], b.get("padat"))
        if s is None or not sisa[s]:
            continue
        if b.get("kelas") is None:
            lewat.append((k, "rasio null (pembanding di bawah 100 atau ohsome tidak menjawab)"))
            continue
        sisa[s] -= 1
        prov_pakai.add(v["prov"])
        pilih.append((s, k, b))
    return pilih, lewat


def undi_petak(sel, lat0, lon0, step, kab4, benih=BENIH, n=3):
    """sel [(i, j, n, luas, kec, lon, lat)] -> n ubin [(bbox [x0,y0,x1,y1], n_ob)] berbobot jumlah bangunan, tanpa pengembalian."""
    ubin = {}
    for i, j, c, *_ in sel:
        ubin[(i // UBIN, j // UBIN)] = ubin.get((i // UBIN, j // UBIN), 0) + c
    calon = sorted((k, c) for k, c in ubin.items() if c >= UBIN_MIN)
    rng, hasil = random.Random(benih + int(kab4)), []
    while calon and len(hasil) < n:
        x = rng.random() * sum(c for _, c in calon)
        for idx, (k, c) in enumerate(calon):
            x -= c
            if x < 0:
                break
        (ti, tj), c = calon.pop(idx)
        y0, x0 = lat0 + ti * UBIN * step, lon0 + tj * UBIN * step
        hasil.append(([round(x0, 6), round(y0, 6), round(x0 + UBIN * step, 6), round(y0 + UBIN * step, 6)], c))
    return hasil


def tautan(bbox):
    lo, la = round((bbox[0] + bbox[2]) / 2, 5), round((bbox[1] + bbox[3]) / 2, 5)
    return {"pusat": [la, lo],
            "osm": f"https://www.openstreetmap.org/#map=17/{la}/{lo}",
            "id_citra": f"https://www.openstreetmap.org/edit?editor=id#map=17.00/{la}/{lo}&background=EsriWorldImagery",
            "google_citra": f"https://www.google.com/maps/@{la},{lo},900m/data=!3m1!1e3"}


def vonis(isian, kunci):
    """isian [dict kab4, kelas_manual, petak_dipakai]; kunci {kab4: kelas_mesin}. Butir 6-7.
    Kelas manual kosong = belum diperiksa (bukan tidak cocok); 'tak terbaca' = tidak cocok."""
    rinci, kosong = [], []
    for r in isian:
        m = (r.get("kelas_manual") or "").strip().lower()
        if not m:
            kosong.append(r["kab4"])
            continue
        if m != TAK_TERBACA and m not in KELAS:
            raise ValueError(f"{r['kab4']}: kelas manual '{m}' bukan {KELAS} atau '{TAK_TERBACA}'")
        rinci.append({"kab4": r["kab4"], "manual": m, "mesin": kunci[r["kab4"]], "cocok": m == kunci[r["kab4"]]})
    if kosong:
        return {"vonis": "menunggu periksa pemilik", "belum_diperiksa": kosong, "cocok": None, "n": len(isian)}
    c = sum(x["cocok"] for x in rinci)
    return {"vonis": "lulus" if c >= KONST["UJI"]["COCOK_MIN"] else "gagal", "cocok": c, "n": len(rinci), "rinci": rinci}


def jalankan(keluar):
    s = sidik_berkas()
    if s != SIDIK_KUNCI:
        sys.exit(f"kriteria T10 di RENCANA-UJI berubah sesudah dikunci ({s}); undian baru butuh benih baru")
    kode = json.load(open(os.path.join(AKAR, "public/data/kemitraan/kode.json"), encoding="utf-8"))
    grid = lambda p: os.path.exists(os.path.join(AKAR, f"data/terkunci/bangunan/halus_{p}.json"))
    oh = KL.Ohsome()
    t = oh.tanggal_data()
    if not t:
        sys.exit("ohsome metadata tidak menjawab; undian tidak dijalankan")
    waktu = t[:10]
    zona = {}

    def ukur(p, k):
        _, g = KL.zona_kab(k)
        zona[k] = g
        pemb = PB.kab(p, k, g)
        luas = PK.luas_km2(g) if g else 0
        padat = pemb["n_pembanding"] / luas if pemb["n_pembanding"] is not None and luas > 0 else None
        if strata(kode[k]["nama"], padat) is None:
            return {"padat": None, "kelas": None}
        b = KL.baris(k, oh.hitung(g, waktu), pemb)
        b["padat"] = None if padat is None else round(padat, 1)
        b["luas_km2"] = round(luas, 1)
        return b

    P = PB._paparan()
    pilih, lewat = undi_kab(kode, grid, ukur)
    kunci, isian = [], []
    for st, k, b in pilih:
        sel, lat0, lon0, step, _, _ = P.sel_kab(kode[k]["prov"], k, AKAR)
        petak = []
        for bbox, n_ob in undi_petak(sel, lat0, lon0, step, k):
            kotak = {"type": "Polygon", "coordinates": [[[bbox[0], bbox[1]], [bbox[2], bbox[1]], [bbox[2], bbox[3]], [bbox[0], bbox[3]], [bbox[0], bbox[1]]]]}
            n_osm = oh.hitung([kotak], waktu)
            r = PB.rasio(n_osm, n_ob)
            petak.append({"bbox": bbox, "n_ob": n_ob, "n_osm": n_osm, "rasio": None if r is None else round(r, 3), **tautan(bbox)})
        kunci.append({"kab4": k, "nama": kode[k]["nama"], "strata": st, "kelas_mesin": b["kelas"], "rasio": b["rasio"],
                      "n_osm": b["n_osm"], "n_pembanding": b["n_pembanding"], "padat_per_km2": b["padat"], "luas_km2": b["luas_km2"],
                      "petak": petak})
        p0 = petak[0] if petak else None
        isian.append({"kab4": k, "nama": kode[k]["nama"], "strata": st,
                      **{f"petak{i + 1}_{f}": (petak[i][f] if i < len(petak) else "") for i in range(3) for f in ("id_citra", "google_citra", "osm")},
                      "petak_dipakai": "", "persen_osm_perkiraan": "", "kelas_manual": "", "catatan": ""})
    os.makedirs(keluar, exist_ok=True)
    dok = {"hr": "HR-05", "dibuat": datetime.now(timezone.utc).isoformat(timespec="seconds"), "sidik_kriteria": s, "benih": BENIH,
           "tanggal_data_osm": t, "sumber": "OpenStreetMap contributors (ODbL) via ohsome; Google Open Buildings v3 (CC BY 4.0), keyakinan >= 0,7",
           "ambang": "HIPOTESIS (Q6)", "zona": "seluruh poligon kab (aproksimasi HR-04), bukan zona bahaya",
           "dilewati": [{"kab4": a, "alasan": b} for a, b in lewat], "kab": kunci}
    json.dump(dok, open(os.path.join(keluar, "kunci_mesin.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    with open(os.path.join(keluar, "lembar_isian.csv"), "w", encoding="utf-8", newline="") as f:
        w = csv.DictWriter(f, fieldnames=list(isian[0]))
        w.writeheader()
        w.writerows(isian)
    return dok


def vonis_berkas(keluar):
    kunci = json.load(open(os.path.join(keluar, "kunci_mesin.json"), encoding="utf-8"))
    if kunci["sidik_kriteria"] != sidik_berkas():
        sys.exit("kriteria T10 berubah sesudah lembar dibuat; vonis tidak sah")
    isian = list(csv.DictReader(open(os.path.join(keluar, "lembar_isian.csv"), encoding="utf-8")))
    return vonis(isian, {r["kab4"]: r["kelas_mesin"] for r in kunci["kab"]})


def cek():
    # sidik: hanya bagian kriteria; teks sebelum judul tidak berpengaruh
    assert sidik("a\n" + JUDUL + " x\n1.\n") == sidik("b\n" + JUDUL + " x\n1.\n") != sidik(JUDUL + " x\n2.\n")
    assert sidik_berkas() == SIDIK_KUNCI, "kriteria T10 berubah sesudah dikunci"
    assert [strata("Kota A", None), strata("Kab. B", 10), strata("Kab. B", 50), strata("Kab. B", None)] == ["perkotaan", "perdesaan", "campuran", None]
    # undian: 4/4/2, satu per provinsi, null dilewati dan dicatat, deterministik
    kode = {f"{p}{i:02d}": {"prov": str(p), "nama": ("Kota " if i % 3 == 0 else "Kab. ") + f"{p}{i}"} for p in range(11, 40) for i in range(1, 7)}
    def ukur(p, k):
        if k.endswith("02"):
            return {"padat": 10, "kelas": None}
        return {"padat": 10 if int(k) % 2 else 80, "kelas": "sedang"}
    a, la = undi_kab(kode, lambda p: p != "39", ukur)
    b, _ = undi_kab(kode, lambda p: p != "39", ukur)
    assert a == b and len(a) == 10 and len({kode[k]["prov"] for _, k, _ in a}) == 10
    assert [s for s, _, _ in a].count("perkotaan") == 4 and [s for s, _, _ in a].count("perdesaan") == 4
    assert all(kode[k]["prov"] != "39" for _, k, _ in a) and all(k.endswith("02") for k, _ in la)
    # petak: berbobot, minimal 20 bangunan, tanpa pengembalian, deterministik, 9 x 9 sel
    sel = [(0, 0, 15, 0), (1, 1, 10, 0), (9, 0, 5, 0), (20, 20, 400, 0), (40, 40, 30, 0)]
    p1 = undi_petak(sel, -1.0, 100.0, 0.001, "6301")
    assert p1 == undi_petak(sel, -1.0, 100.0, 0.001, "6301") and len(p1) == 3
    assert sorted(n for _, n in p1) == [25, 30, 400] and len({tuple(b) for b, _ in p1}) == 3, p1
    bb = [b for b, n in p1 if n == 400][0]
    assert abs((bb[2] - bb[0]) - 0.009) < 1e-9 and abs(bb[0] - 100.018) < 1e-9, bb
    assert undi_petak([(0, 0, 19, 0)], 0, 0, 0.001, "1101") == []
    # vonis: kosong = menunggu, bukan gagal; tak terbaca = tidak cocok; 7/10 lulus, 6/10 gagal
    kunci = {str(i): "sedang" for i in range(10)}
    isi = [{"kab4": str(i), "kelas_manual": ""} for i in range(10)]
    assert vonis(isi, kunci)["vonis"] == "menunggu periksa pemilik"
    isi = [{"kab4": str(i), "kelas_manual": "Sedang" if i < 7 else TAK_TERBACA} for i in range(10)]
    v = vonis(isi, kunci); assert v["vonis"] == "lulus" and v["cocok"] == 7, v
    isi[6]["kelas_manual"] = "tipis"
    v = vonis(isi, kunci); assert v["vonis"] == "gagal" and v["cocok"] == 6, v
    try:
        vonis([{"kab4": "0", "kelas_manual": "aman"}], kunci); raise AssertionError("kelas liar harus ditolak")
    except ValueError:
        pass
    t = tautan([100.0, -1.0, 100.009, -0.991])
    assert t["pusat"] == [-0.9955, 100.0045] and "EsriWorldImagery" in t["id_citra"]
    print("OK uji_jujur.py: sidik kriteria terkunci, undian 4/4/2 deterministik, petak berbobot, vonis 7 dari 10")


if __name__ == "__main__":
    a = sys.argv
    o = a[a.index("--keluar") + 1] if "--keluar" in a else KELUAR
    if "--cek" in a:
        cek()
    elif "--undi" in a:
        d = jalankan(o)
        for r in d["kab"]:
            print(r["kab4"], r["nama"], r["strata"], r["kelas_mesin"], r["rasio"], r["n_osm"], r["n_pembanding"], [p["rasio"] for p in r["petak"]])
        print("dilewati", d["dilewati"])
    elif "--vonis" in a:
        print(json.dumps(vonis_berkas(o), ensure_ascii=False, indent=1))
    else:
        sys.exit(__doc__)
