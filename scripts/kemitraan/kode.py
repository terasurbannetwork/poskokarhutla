#!/usr/bin/env python3
"""Crosswalk kode wilayah modul Kemitraan Kampus (ALG §1, KM-A03).
Kunci = kode IRBI 4 digit dari public/data/wilayah/indeks.json. Kolom lain dicocokkan lewat NAMA
dalam provinsi yang sama (nk dari scripts/umum/nama_wilayah.py + penanda kota); tidak pasti -> null
+ alasan di kode_gagal.json. TIDAK MENEBAK.
Pakai: python3 -I scripts/kemitraan/kode.py [--cek]"""
import collections, glob, json, os, re, sys

AKAR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..")
sys.path.insert(0, os.path.join(AKAR, "scripts", "umum"))  # -I tidak menambah direktori skrip
from nama_wilayah import nk  # noqa: E402

P = lambda *a: os.path.join(AKAR, "public", *a)
J = lambda p: json.load(open(p, encoding="utf-8"))
kota = lambda n: bool(re.match(r"\s*kota\b", (n or "").lower()))
kunci = lambda prov, n: (prov, kota(n), nk(n)[1])  # kab dan kota senama (Bandung) tidak tertukar


def indeks_nama(pasang):
    """pasang: [(prov2, nama, nilai)] -> {kunci: [nilai,...]}"""
    d = collections.defaultdict(list)
    for prov, n, v in pasang:
        d[kunci(prov, n)].append(v)
    return d


def centroid(geoms):
    """Centroid berbobot luas atas cincin luar (bidang lon/lat; cukup untuk jarak ratusan km). [lat, lon]."""
    polis = [p for g in geoms for p in (g["coordinates"] if g["type"] == "MultiPolygon" else [g["coordinates"]])]
    A = cx = cy = 0.0
    for pol in polis:
        r = pol[0]
        for (x0, y0), (x1, y1) in zip(r, r[1:] + r[:1]):
            c = x0 * y1 - x1 * y0
            A += c; cx += (x0 + x1) * c; cy += (y0 + y1) * c
    if A == 0:
        return None
    return [round(cy / (3 * A), 4), round(cx / (3 * A), 4)]


def bangun():
    irbi = {k: v for k, v in J(P("data", "wilayah", "indeks.json")).items() if len(k) == 4}
    ir = {k: (v[1] or "").strip() for k, v in irbi.items()}
    byir = indeks_nama((k[:2], n, k) for k, n in ir.items())

    def cari(prov, nama, sumber):
        """-> (kode IRBI | None, alasan | None)"""
        c = byir.get(kunci(prov, nama), [])
        if len(c) == 1:
            return c[0], None
        return None, f"{sumber}: nama '{nama}' (prov {prov}) " + ("tidak ada padanan di IRBI" if not c else f"cocok {len(c)} kab IRBI ({','.join(sorted(c))})")

    # Kemendagri: desa_cari.json kab {"PP.KK": nama}
    kem, gagal_sumber = {}, collections.defaultdict(list)
    for kd, n in J(P("data", "desa_cari.json"))["kab"].items():
        k, why = cari(kd[:2], n, "desa_cari")
        if k and k in kem:
            k, why = None, f"desa_cari: {kd} dan {kem[k]} cocok kab IRBI {k} yang sama"
        if k:
            kem[k] = kd
        else:
            gagal_sumber["kemendagri"].append(f"{kd} {n}: {why}")
    # Kode sumber kekeringan = nomor urut sumbernya sendiri (bukan BPS, 3211 = Kota Bandung): disimpan apa adanya
    kek = {}
    for f in sorted(glob.glob(P("data", "kejadian", "kekeringan-*.json"))):
        for r in J(f)["kab"]:
            k, why = cari(r["prov"], r["nama"], "kekeringan")
            if k:
                kek[k] = r["kode"]
            else:
                gagal_sumber["kekeringan"].append(f"{r['kode']} {r['nama']}: {why}")
    # Neraca air: kunci berkas = kode IRBI (terbukti: nama tiap kunci sama dengan indeks.json)
    ner = {k for k, v in J(P("data", "neraca_air", "kab.json"))["kab"].items()
           if k in ir and nk(ir[k])[1] == nk(v["nama"])[1] and kota(ir[k]) == kota(v["nama"])}
    # Pusat: centroid poligon dalam provinsi yang sama
    pusat = {}
    for prov in sorted({k[:2] for k in ir}):
        f = P("geo", "kabupaten", prov + ".json")
        if not os.path.exists(f):
            continue
        poli = indeks_nama((prov, ft["properties"]["kab"], ft) for ft in J(f)["features"])
        for k, n in ir.items():
            c = poli.get(kunci(prov, n), []) if k[:2] == prov else []
            if c:  # poligon senama (mis. Pohuwato/Pahuwato) = bagian kab yang sama; digabung
                pusat[k] = centroid([ft["geometry"] for ft in c])

    out, gagal = {}, {}
    for k in sorted(ir):
        n = ir[k]
        out[k] = {"prov": k[:2], "nama": n, "bps": None, "kemendagri": kem.get(k),
                  "kunci_nama": k[:2] + "|" + re.sub(r"^kab\.\s*", "", n, flags=re.I),
                  "pusat": pusat.get(k), "kekeringan": kek.get(k)}
        g = {}
        if k not in kem:
            g["kemendagri"] = "tidak tercocok pasti di desa_cari.json (513 kab) lewat nama dalam provinsi"
        if not pusat.get(k):
            g["pusat"] = "tidak ada poligon senama pasti di public/geo/kabupaten/" + k[:2] + ".json"
        if g:
            gagal[k] = g
    ringkas = {"kemendagri": len(kem), "pusat": sum(1 for v in out.values() if v["pusat"]),
               "kekeringan": len(kek), "neraca_air": len(ner)}
    # BPS: tak ada sumber BPS terverifikasi di repo (neraca = kode IRBI; kekeringan = nomor urut sumbernya sendiri) -> null di semua kab
    umum = {"bps": "tidak ada sumber kode BPS terverifikasi di repo; neraca_air memakai kode IRBI, kekeringan nomor urut sumber"}
    return out, {"umum": umum, "kab": gagal, "sumber_tak_cocok": {a: sorted(b) for a, b in sorted(gagal_sumber.items())}, "ringkas": ringkas}


def tulis_teks(o):
    return json.dumps(o, ensure_ascii=False, sort_keys=True, separators=(",", ":")) + "\n"


def cek():
    a, ga = bangun()
    b, gb = bangun()
    ta, tb = tulis_teks(a), tulis_teks(b)
    assert ta == tb and tulis_teks(ga) == tulis_teks(gb), "tidak deterministik: dua kali bangun beda byte"
    n4 = len([k for k in J(P("data", "wilayah", "indeks.json")) if len(k) == 4])
    # KENYATAAN: indeks.json berisi 514 kab/kota (kunci 4 digit); target tiket "548" tidak terjangkau (548 = termasuk 34 baris provinsi)
    assert len(a) == n4 == 514, f"jumlah kode {len(a)} != 514 (kunci 4 digit indeks.json {n4}); tiket menyebut 548"
    kem = sum(1 for v in a.values() if v["kemendagri"])
    pus = sum(1 for v in a.values() if v["pusat"])
    assert kem >= 500, f"kemendagri {kem} < 500"
    assert pus == len(a), f"pusat {pus} != {len(a)}: " + ",".join(k for k, v in a.items() if not v["pusat"])
    idx = J(P("data", "wilayah", "indeks.json"))
    assert a["3171"]["nama"] == idx["3171"][1] == "Kota Administrasi Jakarta Pusat", a["3171"]
    assert a["3171"]["kemendagri"] == "31.71", a["3171"]
    assert a["6211"]["nama"].endswith("Pulang Pisau") and a["6211"]["pusat"], a["6211"]
    assert a["3204"]["kemendagri"] != a["3273"]["kemendagri"], "Kab. dan Kota Bandung tertukar"
    for k, v in a.items():  # tiap null tercatat berikut alasan
        for f in ("bps", "kemendagri", "pusat"):
            assert v[f] is not None or ga["umum"].get(f) or (k in ga["kab"] and ga["kab"][k].get(f)), f"{k}.{f} null tanpa alasan"
        if v["pusat"]:
            la, lo = v["pusat"]
            assert -11.5 < la < 6.5 and 94 < lo < 141.5, f"{k} pusat di luar Indonesia: {v['pusat']}"
    for nama, t in (("kode.json", ta), ("kode_gagal.json", tulis_teks(ga))):
        p = P("data", "kemitraan", nama)
        assert os.path.exists(p) and open(p, encoding="utf-8").read() == t, f"{nama} di disk beda dari hasil bangun; jalankan tanpa --cek"
    print(f"OK kode.py: {len(a)} kab (tiket 548: tak terjangkau, indeks.json = 514), kemendagri {kem}, bps 0, pusat {pus}, ringkas {ga['ringkas']}")


if __name__ == "__main__":
    if "--cek" in sys.argv:
        cek()
    else:
        k, g = bangun()
        os.makedirs(P("data", "kemitraan"), exist_ok=True)
        for nama, o in (("kode.json", k), ("kode_gagal.json", g)):
            open(P("data", "kemitraan", nama), "w", encoding="utf-8").write(tulis_teks(o))
        print("tulis", len(k), g["ringkas"])
