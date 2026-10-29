"""Gabung arsip + kalibrasi + skor + aturan dampak -> public/prediksi/data/prediksi.json (yang tampil di /prediksi).

Per kode diambil baris arsip TERAKHIR (tanggal terbitnya ikut tertulis; kode yang hari ini gagal dibekukan tampil dengan
tanggal lamanya, bukan disamarkan). Peluang diganti versi kalibrasi HANYA untuk grup berstatus "dipakai" di kalibrasi.json;
jumlah & lama hujan dikali rasio provinsi yang "dipakai". Tiap angka membawa vonis grupnya dari skor.json
("belum teruji" bila belum ada / n < 30).

Dampak (aturan.json): jiwa terpapar = penduduk kecamatan berbahaya tinggi (public/data/penduduk.json x
public/banjir/data/bahaya.json); sekolah & murid dari public/data/sekolah.json; faskes/RS dari public/data/fasilitas.json
(ke pusat kecamatan terdekat di provinsi yang sama). Mengungsi = jiwa terpapar x laju DIBI sum(mengungsi)/sum(terdampak)
(kab bila >= 3 kejadian bertercatat, selain itu nasional). Kebutuhan harian Sphere 2018. Semua berlabel perkiraan.

Pakai:  python3 scripts/prediksi/terbit.py   |   python3 scripts/prediksi/terbit.py uji
"""
import datetime as dt, json, math, os, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import dasar as D
from kalibrasi import terapkan

SINI = os.path.dirname(os.path.abspath(__file__))
TAMPIL = {"HJN": ["p1", "p20", "p50", "tot", "mulai", "lama", "puncak", "m"], "API": ["p", "d"], "BNJ": ["lv", "ps"],
          "LSR": ["lv", "ps"], "ASP": ["pm", "kat"], "ROB": ["lewat", "sel"]}
LABEL = {"HJN": "Hujan", "API": "Titik panas", "BNJ": "Banjir", "LSR": "Longsor", "ASP": "Asap (PM2,5)", "ROB": "Rob"}
AMBANG_KOL = {("HJN", "p1"): 1, ("HJN", "p20"): 20, ("HJN", "p50"): 50, ("API", "p"): 1, ("BNJ", "ps"): 1, ("LSR", "ps"): 1}
OP = {">=": lambda a, b: a >= b, "<": lambda a, b: a < b, ">": lambda a, b: a > b, "<=": lambda a, b: a <= b}
BATASAN = ["Semua peluang di halaman ini mentah sampai rapornya cukup (>= 30 pasangan) dan kalibrasinya lolos uji tahan 14 hari.",
           "Peluang hujan tanpa ansambel (m=0) adalah skor kasar dari jumlah hujan deterministik, bukan peluang terkalibrasi.",
           "Hujan sementara dinilai terhadap analisis model, bukan pengukuran; nilai final memakai ERA5.",
           "Dampak dan kebutuhan Sphere adalah perkiraan dari paparan x laju historis DIBI, belum diuji balik."]


def terakhir(entri):
    out = {}
    for e in entri:
        if e["k"] not in out or e["t"] >= out[e["k"]]["t"]:
            out[e["k"]] = e
    return out


def vonis(skor, kode, ambang, n):
    """Vonis grup (final dipilih atas sementara). -> (teks, n, bss_klim)"""
    g = [x for x in (skor.get("kode", {}).get(kode, {}).get("grup") or []) if x["ambang"] == ambang and x["tenggang"] == n]
    g.sort(key=lambda x: x["tahap"] != "final")
    if not g:
        return ["belum teruji", 0, None]
    return [g[0]["vonis"], g[0]["n_banding"], g[0].get("bss_klimatologi")]


def peta_kal(kal):
    p = {(x["kode"], x["ambang"], x["tenggang"]): x["peta"] for x in kal.get("peluang", []) if x["status"] == "dipakai" and x.get("peta")}
    r = {(x["besaran"], x["tenggang"], x["prov"]): x["rasio"] for x in kal.get("jumlah", []) if x["status"] == "dipakai"}
    return p, r


def baris_tampil(e, kab_id, prov, pk, rk):
    """Baris arsip satu kab -> 3 baris tampil (kolom TAMPIL), terkalibrasi bila grupnya dipakai."""
    kol = e["kol"]
    out = []
    for n, r in enumerate(e["kab"].get(kab_id) or [None] * 3, 1):
        if r is None:
            out.append(None)
            continue
        v = dict(zip(kol, r))
        for c in TAMPIL[e["k"]]:
            a = AMBANG_KOL.get((e["k"], c))
            if a is not None and (peta := pk.get((e["k"], a, n))):
                v[c] = round(terapkan(peta, v[c]), 2)
        if e["k"] == "HJN":
            for c in ("tot", "lama"):
                if (ra := rk.get((c, n, prov))) and v[c] is not None:
                    v[c] = round(v[c] * ra, 1) if c == "tot" else round(v[c] * ra)
            # p1 >= p20 >= p50 dijaga sesudah kalibrasi per ambang
            v["p20"] = max(v["p20"], v["p50"])
            v["p1"] = max(v["p1"], v["p20"])
        out.append([v.get(c) for c in TAMPIL[e["k"]]])
    return out


# ---------- paparan ----------
def paparan(akar, daftar, cari, aturan):
    """-> {kab: {bahaya: {jiwa, kec, sekolah, murid, faskes}}, "_kab": {jiwa, murid}}"""
    pend = D.baca(os.path.join(akar, "public", "data", "penduduk.json"), {}).get("kec", {})
    bah = D.baca(os.path.join(akar, "public", "banjir", "data", "bahaya.json"), {}).get("kec", {})
    pusat = D.baca(os.path.join(akar, "public", "banjir", "data", "pusat_kec.json"), {})
    kec_kab = {k: cari(*k.split("|")[:2]) for k in set(pend) | set(bah) | set(pusat)}
    kunci_kec = {(k.split("|")[0], D.kunci(k.split("|")[1]), D.kunci(k.split("|")[2])): k for k in kec_kab if k.count("|") == 2}
    sekolah, murid_kab = {}, {}
    s = D.baca(os.path.join(akar, "public", "data", "sekolah.json"), {"kolom": [], "baris": []})
    c = {n: i for i, n in enumerate(s["kolom"])}
    for r in s["baris"]:
        kec = kunci_kec.get((r[c["prov"]], D.kunci(r[c["kab"]] or ""), D.kunci(r[c["kec"]] or "")))
        if kec:
            x = sekolah.setdefault(kec, [0, 0])
            x[0] += 1
            x[1] += r[c["siswa"]] or 0
            if kec_kab.get(kec):
                murid_kab[kec_kab[kec]] = murid_kab.get(kec_kab[kec], 0) + (r[c["siswa"]] or 0)
    faskes = {}
    per_prov = {}
    for k, ll in pusat.items():
        per_prov.setdefault(k.split("|")[0], []).append((ll[0], ll[1], k))
    for f in D.baca(os.path.join(akar, "public", "data", "fasilitas.json"), []):
        if f.get("t") in ("faskes", "rs") and (kec := D.terdekat(f["lat"], f["lon"], per_prov.get(f.get("prov"), []), 0.5)):
            faskes[kec] = faskes.get(kec, 0) + 1
    out = {k["id"]: {"_kab": {"jiwa": k["jiwa"], "murid": murid_kab.get(k["id"], 0)}} for k in daftar}
    for a in aturan:
        p = a.get("paparan") or {}
        if p.get("jenis") != "kec_bahaya":
            continue
        for kec, b in bah.items():
            if (b.get(p["bahaya"]) or 0) >= p["ambang"] and (kab := kec_kab.get(kec)):
                x = out[kab].setdefault(p["bahaya"], {"jiwa": 0, "kec": 0, "sekolah": 0, "murid": 0, "faskes": 0})
                x["jiwa"] += pend.get(kec, 0)
                x["kec"] += 1
                x["sekolah"] += sekolah.get(kec, [0, 0])[0]
                x["murid"] += sekolah.get(kec, [0, 0])[1]
                x["faskes"] += faskes.get(kec, 0)
    return out


def laju_ungsi(akar, cari, jenis):
    """-> (fungsi kab -> laju, laju nasional). Laju = sum(mengungsi)/sum(terdampak) kejadian DIBI berjenis itu."""
    d = D.baca(os.path.join(akar, "public", "data", "dibi_kejadian.json"), {"kejadian": []})
    per, nas = {}, [0, 0, 0]
    for r in d["kejadian"]:
        if r["jenis"] in jenis and (r.get("terdampak") or r.get("mengungsi")):
            k = cari(r["prov_kode"], r["kab"])
            x = per.setdefault(k, [0, 0, 0])
            for y in (x, nas):
                y[0] += r.get("mengungsi", 0)
                y[1] += max(r.get("terdampak", 0), r.get("mengungsi", 0))
                y[2] += 1
    n = nas[0] / nas[1] if nas[1] else 0
    return (lambda k: per[k][0] / per[k][1] if k in per and per[k][2] >= 3 and per[k][1] else n), n


def kebutuhan(ungsi, sp):
    return {"mengungsi": ungsi, "air_l": ungsi * sp["air_l"], "hunian_m2": round(ungsi * sp["hunian_m2"]),
            "jamban": math.ceil(ungsi / sp["jamban_per"]), "kkal": ungsi * sp["kkal"]}


def nilai_var(kab, n, var):
    """var 'KODE.kol' atau 'HJN.tot3' -> nilai untuk tenggang n (1..3) dari baris tampil kab."""
    kode, kol = var.split(".")
    rows = kab.get(kode)
    if not rows:
        return None
    if var == "HJN.tot3":
        v = [r[TAMPIL_X["HJN"].index("tot")] if r else None for r in rows]
        return None if None in v else round(sum(v), 1)
    r = rows[n - 1]
    return r[TAMPIL_X[kode].index(kol)] if r and kol in TAMPIL_X[kode] else None


TAMPIL_X = {**TAMPIL, "HJN": TAMPIL["HJN"] + ["sm"], "API": TAMPIL["API"] + ["ps"]}


def evaluasi(a, kab, n):
    """-> True / False / None (masukan kurang)."""
    hasil = []
    for s in a.get("semua", []):
        v = nilai_var(kab, n, s["v"])
        hasil.append(None if v is None else OP[s["op"]](v, s["nilai"]))
    if a.get("salah_satu"):
        x = [None if (v := nilai_var(kab, n, s["v"])) is None else OP[s["op"]](v, s["nilai"]) for s in a["salah_satu"]]
        hasil.append(True if True in x else (None if None in x else False))
    if False in hasil:
        return False
    return None if None in hasil or not hasil else True


def terbit(akar=D.AKAR, folder=None, data=None, entri=None, kini=None):
    data = data or D.DATA
    daftar = D.kab(akar)
    cari = D.pencari(daftar)
    semua = entri if entri is not None else D.semua_arsip(folder)
    akhir = terakhir(semua)
    if not akhir:
        sys.exit("terbit: arsip kosong; jalankan catat.py dulu")
    skor = D.baca(os.path.join(data, "skor.json"), {})
    kal = D.baca(os.path.join(data, "kalibrasi.json"), {})
    pk, rk = peta_kal(kal)
    at = json.load(open(os.path.join(SINI, "aturan.json")))
    aturan = [a for a in at["aturan"] if a.get("aktif", True)]
    pap = paparan(akar, daftar, cari, aturan)
    laju = {a["id"]: laju_ungsi(akar, cari, set(a["mengungsi"]["jenis_dibi"])) for a in aturan if a.get("mengungsi")}
    kabs, waspada = [], []
    for k in daftar:
        x = {"id": k["id"], "nama": k["nama"], "prov": k["prov"], "pn": k["pn"], "jiwa": k["jiwa"]}
        for kode, e in akhir.items():
            rows = baris_tampil(e, k["id"], k["prov"], pk, rk)
            if any(rows):
                x[kode] = rows
        # kolom bantu aturan (sm, ps) tidak ditampilkan, dibaca langsung dari arsip
        bantu = {}
        for kode, kol in (("HJN", "sm"), ("API", "ps")):
            e = akhir.get(kode)
            if e and x.get(kode):
                bantu[kode] = [r + [dict(zip(e["kol"], a or [])).get(kol)] if r else None for r, a in zip(x[kode], e["kab"].get(k["id"]) or [None] * 3)]
        xv = {**x, **bantu}
        for a in aturan:
            for n in (1, 2, 3):
                if evaluasi(a, xv, n):
                    p = a.get("paparan", {})
                    d = dict(pap[k["id"]].get(p.get("bahaya"), {})) if p.get("jenis") == "kec_bahaya" else {"jiwa": k["jiwa"]}
                    if p.get("murid"):
                        d["murid"] = pap[k["id"]]["_kab"]["murid"]
                    if a["id"] in laju and d.get("jiwa"):
                        f, _ = laju[a["id"]]
                        d["laju_ungsi"] = round(f(k["id"]), 4)
                        d["kebutuhan"] = kebutuhan(round(d["jiwa"] * d["laju_ungsi"]), at["sphere"])
                    waspada.append({"kab": k["id"], "tenggang": n, "aturan": a["id"], "maka": a["maka"], "dampak": d})
        kabs.append(x)
    kode = {}
    for kd, e in akhir.items():
        vn = {}
        for c in TAMPIL[kd]:
            a = AMBANG_KOL.get((kd, c))
            if a is not None:
                for n in (1, 2, 3):
                    vn[f"{c}|{n}"] = vonis(skor, kd, a, n) + [bool(pk.get((kd, a, n)))]
        kode[kd] = {"label": LABEL[kd], "terbit": e["t"], "hari": e["hari"], "sumber": e["sumber"], "dibuat": e["dibuat"],
                    "kol": TAMPIL[kd], "vonis": vn, "status": (skor.get("kode", {}).get(kd) or {}).get("status", "menunggu")}
    out = {"versi": 1, "dibuat": dt.datetime.now(D.WIB).replace(microsecond=0).isoformat(), "kode": kode, "kab": kabs,
           "waspada": waspada, "aturan": [{k: a[k] for k in ("id", "maka", "semua", "salah_satu", "paparan", "catatan", "aktif", "alasan") if k in a} for a in at["aturan"]],
           "sphere": at["sphere"], "kalibrasi": kal.get("ringkas", {}), "batasan": BATASAN}
    galat = periksa(out)
    if galat:
        raise ValueError("prediksi.json tidak sah: " + "; ".join(galat[:5]))
    D.simpan(os.path.join(data, "prediksi.json"), out)
    D.simpan(os.path.join(data, "lalu.json"), lalu(semua, kini or D.hari_ini(), pk, rk))
    return out


def lalu(semua, kini, pk, rk, hari=3):
    """Prakiraan tenggang +1 yang sasarannya hari ini dan 3 hari lalu, untuk tab Konfirmasi:
    {"hari": {sasaran: {kode: {"kol": [...], "kab": {id: baris}}}}}"""
    awal = D.geser(kini, -hari)
    out = {}
    for e in semua:
        s = e["hari"][0]
        if awal <= s <= kini:
            kab = {k: r for k in e["kab"] if (r := baris_tampil(e, k, k[:2], pk, rk)[0])}
            out.setdefault(s, {})[e["k"]] = {"terbit": e["t"], "kol": TAMPIL[e["k"]], "kab": kab}
    return {"dibuat": kini, "hari": out}


def periksa(d):
    g = []
    if len(d["kab"]) != 514:
        g.append(f"kab {len(d['kab'])} != 514")
    for k in d["kab"]:
        for kode, rows in k.items():
            if kode not in TAMPIL:
                continue
            kol = TAMPIL[kode]
            for r in rows:
                if r is None:
                    continue
                v = dict(zip(kol, r))
                for c in ("p1", "p20", "p50", "p", "ps"):
                    if v.get(c) is not None and not 0 <= v[c] <= 1:
                        g.append(f"{k['id']} {kode}.{c}={v[c]} di luar 0..1")
                if kode == "HJN" and not v["p1"] >= v["p20"] >= v["p50"]:
                    g.append(f"{k['id']} HJN peluang tidak menurun dengan ambang")
                if kode == "HJN" and not 0 <= v["tot"] <= 1000:
                    g.append(f"{k['id']} HJN tot {v['tot']} mustahil")
                if kode in ("BNJ", "LSR") and v["lv"] not in (0, 1, 2, 3):
                    g.append(f"{k['id']} {kode} level {v['lv']}")
    for w in d["waspada"]:
        kb = w["dampak"].get("kebutuhan")
        if kb and (kb["mengungsi"] < 0 or kb["jamban"] < 0):
            g.append(f"{w['kab']} kebutuhan negatif")
    return g


def uji():
    import tempfile
    daftar = D.kab()
    a_banjir = {"id": "banjir", "semua": [{"v": "HJN.tot", "op": ">=", "nilai": 50}, {"v": "HJN.sm", "op": ">=", "nilai": 0.45}]}
    a_lsr = {"id": "longsor", "salah_satu": [{"v": "HJN.tot", "op": ">=", "nilai": 100}, {"v": "HJN.tot3", "op": ">=", "nilai": 150}]}
    row = lambda tot, sm: [0.9, 0.9, 0.8, tot, 10, 5, 12, 1, sm]
    kab = {"HJN": [row(60, 0.5), row(60, 0.3), row(60, None)]}
    assert evaluasi(a_banjir, kab, 1) is True and evaluasi(a_banjir, kab, 2) is False and evaluasi(a_banjir, kab, 3) is None
    assert evaluasi(a_lsr, kab, 1) is True, "3 hari 180 mm >= 150"
    assert evaluasi(a_lsr, {"HJN": [row(10, 0), None, row(10, 0)]}, 1) is None, "tot3 tak lengkap = masukan kurang, bukan False"
    assert evaluasi({"semua": [{"v": "ASP.kat", "op": ">=", "nilai": 1}]}, {}, 1) is None
    sp = {"air_l": 15, "hunian_m2": 3.5, "jamban_per": 20, "kkal": 2100}
    assert kebutuhan(41, sp) == {"mengungsi": 41, "air_l": 615, "hunian_m2": 144, "jamban": 3, "kkal": 86100}
    # kalibrasi hanya bila dipakai; urutan peluang dijaga sesudahnya
    e = {"k": "HJN", "kol": ["p1", "p20", "p50", "tot", "mulai", "lama", "puncak", "sm", "m"], "kab": {"1101": [[0.8, 0.4, 0.05, 10.0, 3, 4, 5, 0.4, 0], None, None]}}
    pk = {("HJN", 20, 1): [(0.05, 0.1), (0.4, 0.9)]}
    r = baris_tampil(e, "1101", "11", pk, {("tot", 1, "11"): 1.5})
    assert r[0][:4] == [0.9, 0.9, 0.05, 15.0] and r[1] is None, r
    assert vonis({}, "HJN", 1, 1) == ["belum teruji", 0, None]
    # terbit utuh dari entri sintetis, berkas nyata repo untuk paparan; keluaran sah
    t = "2026-10-29"
    ent = [{"t": t, "k": "HJN", "dibuat": "x", "sumber": "uji", "hari": [D.geser(t, i) for i in (1, 2, 3)], "kol": e["kol"],
            "kab": {k["id"]: [[0.9, 0.8, 0.6, 70.0, 13, 6, 15, 0.5, 0]] * 3 for k in daftar}}]
    with tempfile.TemporaryDirectory() as tmp:
        o = terbit(data=tmp, entri=ent)
        assert periksa(o) == [] and len(o["kab"]) == 514
        assert {w["aturan"] for w in o["waspada"]} >= {"banjir", "longsor"}
        w = next(w for w in o["waspada"] if w["aturan"] == "banjir" and w["dampak"].get("jiwa"))
        assert w["dampak"]["jiwa"] > 0 and "kebutuhan" in w["dampak"], w
        assert o["kode"]["HJN"]["vonis"]["p50|1"][0] == "belum teruji"
        bad = json.loads(json.dumps(o))
        bad["kab"][0]["HJN"][0][0] = 1.4
        assert periksa(bad), "peluang > 1 ditolak"
    print("terbit.py: uji lulus")


if __name__ == "__main__":
    if sys.argv[1:2] == ["uji"]:
        uji()
    elif len(sys.argv) == 1:
        o = terbit()
        print("terbit:", len(o["kab"]), "kab;", {k: v["terbit"] for k, v in o["kode"].items()}, ";", len(o["waspada"]), "waspada")
    else:
        print(__doc__)
