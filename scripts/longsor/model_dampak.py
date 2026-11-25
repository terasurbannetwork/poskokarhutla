#!/usr/bin/env python3
"""Model dampak longsor empiris (KI-62): hujan -> peluang kejadian -> rumah rusak. Pola scripts/banjir/model_dampak.py, versi stdlib kecil.

Skala: HANYA kabupaten yang lolos public/data/label_mutu/longsor.json (kab_layak). Sasaran kejadian = hari-kab DIBI 'Tanah Longsor'/'Gerakan Tanah'
(gab=0, sama dengan uji_balik.json); rumah rusak = berat+sedang+ringan DIBI pada hari-kab itu (0 DIBI bisa berarti tak tercatat; dilaporkan).
Tahap 1  logit p = logit(klimatologi kab x bulan, dilatih <=2021) + b0 + b1*z, z = hujan 7 hari kab (rerata log1p sel) dibakukan per kab pada hari latih.
         Pembanding = klimatologi itu sendiri. Metrik Brier per hari-kab, selang95 bootstrap berpasangan per blok kab-bulan.
Tahap 2  log1p(rumah rusak) = c0 + c1*z pada hari kejadian. Pembanding = median latih. Metrik |galat| per hari kejadian.
Pembagian waktu: latih 2017-2021, uji 2022, 2023, 2025 (2024 dibuang, sama dengan uji_balik; BUKAN lembar buta, tahun-tahun itu sudah dilihat oleh model lain).
Kriteria dibekukan di model_dampak.kriteria.json + model_dampak.sidik SEBELUM jalan. Positif uji < 100 -> "data tidak cukup", gerbang tertutup.

  python3 scripts/longsor/model_dampak.py ambil     # DIBI + kolom rumah -> data/raw/longsor/dibi_rumah.json (jaringan, sekali)
  python3 scripts/longsor/model_dampak.py bekukan   # tulis sidik (menolak menimpa)
  python3 scripts/longsor/model_dampak.py jalan     # cek sidik, hitung, tulis model_dampak.json + public/data/gerbang/longsor.json
  python3 scripts/longsor/model_dampak.py uji       # self-check tanpa jaringan
"""
import datetime as dt, importlib.util, json, math, os, sys

AYAH = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, AYAH)
from dasar import AKAR, KELUAR, MENTAH, WIB, daftar_kec, kunci_sel, sel_hujan, simpan  # noqa: E402
import rumus  # noqa: E402

KRITERIA = os.path.join(AYAH, "model_dampak.kriteria.json")
SIDIK = os.path.join(AYAH, "model_dampak.sidik")
MASUKAN = os.path.join(MENTAH, "dibi_rumah.json")
LABEL = os.path.join(AKAR, "public/data/label_mutu/longsor.json")
JENIS = ("Tanah Longsor", "Gerakan Tanah")
KOLOM_RUMAH = ("rumah_rusak_berat", "rumah_rusak_sedang", "rumah_rusak_ringan")


def _muat(nama, rel):
    s = importlib.util.spec_from_file_location(nama, os.path.join(AKAR, rel))
    m = importlib.util.module_from_spec(s)
    s.loader.exec_module(m)
    return m


# ---------------------------------------------------------------- data
def ambil():
    K = _muat("banjir_kejadian_md", "scripts/banjir/kejadian.py")
    cocok = K.Pencocok()
    kol = ["dt", "provinsi", "kabupaten", "id_kab_bps", "jenis_bencana"]
    met = [("n", "SUM(jumlah_kejadian)")] + [(c, f"SUM({c})") for c in KOLOM_RUMAH]
    out = {}
    for j in JENIS:
        for r in K.superset(kol, met, [{"col": "jenis_bencana", "op": "==", "val": j}, {"col": "tahun", "op": ">=", "val": 2016}]):
            if not r.get("dt") or not r.get("kabupaten"):
                continue
            kode = str(K.angka(r.get("id_kab_bps")))[:2] if r.get("id_kab_bps") else ""
            p, n = cocok.cari(str(r["kabupaten"]), kode)
            if not n:
                continue
            tgl = dt.datetime.fromtimestamp(r["dt"] / 1000, WIB).date().isoformat()
            a = out.setdefault(f"{p}|{n}|{tgl}", [0, 0])
            a[0] += K.angka(r.get("n")) or 1
            a[1] += sum(K.angka(r.get(c)) for c in KOLOM_RUMAH)
    simpan(MASUKAN, {"dibuat": dt.date.today().isoformat(), "kolom": ["kejadian", "rumah_rusak"], "baris": out})
    print(f"dibi_rumah: {len(out)} hari-kab")


def hujan_kab(kabs):
    """{kab: {tanggal: rerata log1p(r7 mm) atas sel kab}} untuk kab yang punya sel hujan."""
    d = json.load(open(os.path.join(MENTAH, "hujan.json")))
    awal = dt.date.fromisoformat(d["mulai"])
    r7 = {k: rumus.jumlah7(h) for k, h in d["sel"].items()}
    sel_kab = {}
    for k in daftar_kec():
        nm = f'{k["prov"]}|{k["kab"]}'
        c = kunci_sel(*sel_hujan(k["lat"], k["lon"]))
        if nm in kabs and c in r7:
            sel_kab.setdefault(nm, set()).add(c)
    out = {}
    for nm, cs in sel_kab.items():
        n = len(next(iter(r7.values())))
        h = {}
        for i in range(n):
            v = [r7[c][i] for c in cs]
            if all(x is not None for x in v):
                h[awal + dt.timedelta(days=i)] = sum(math.log1p(x / 10) for x in v) / len(v)
        out[nm] = h
    return out


# ---------------------------------------------------------------- hitung (fungsi murni)
def sig(x):
    return 1 / (1 + math.exp(-max(-30, min(30, x))))


def logit(p):
    p = min(max(p, 1e-6), 1 - 1e-6)
    return math.log(p / (1 - p))


def newton2(X, y, off, it=25):
    """Logistik 2 parameter (b0, b1) dengan offset; Newton. X = daftar z."""
    b0 = b1 = 0.0
    for _ in range(it):
        g0 = g1 = h00 = h01 = h11 = 0.0
        for z, t, o in zip(X, y, off):
            p = sig(o + b0 + b1 * z)
            w = p * (1 - p)
            g0 += t - p; g1 += (t - p) * z
            h00 += w; h01 += w * z; h11 += w * z * z
        h00 += 1e-6; h11 += 1e-6   # ridge kecil agar tak singular
        det = h00 * h11 - h01 * h01
        if abs(det) < 1e-12:
            break
        d0, d1 = (h11 * g0 - h01 * g1) / det, (h00 * g1 - h01 * g0) / det
        b0 += d0; b1 += d1
        if abs(d0) + abs(d1) < 1e-9:
            break
    return b0, b1


def ols2(z, y):
    n = len(z)
    mz, my = sum(z) / n, sum(y) / n
    v = sum((a - mz) ** 2 for a in z)
    c1 = sum((a - mz) * (b - my) for a, b in zip(z, y)) / v if v > 1e-12 else 0.0
    return my - c1 * mz, c1


def auc(pos, neg):
    if not pos or not neg:
        return None
    s = sorted([(x, 1) for x in pos] + [(x, 0) for x in neg])
    r, i, jum = 0.0, 0, 0.0
    while i < len(s):
        j = i
        while j < len(s) and s[j][0] == s[i][0]:
            j += 1
        jum += sum(1 for k in range(i, j) if s[k][1]) * ((i + j + 1) / 2)
        i = j
    return (jum - len(pos) * (len(pos) + 1) / 2) / (len(pos) * len(neg))


def hitung(baris, kr):
    """baris = [(kab, tgl(date), a, ev(0/1), rumah)] -> hasil dict. Latih/uji menurut tahun di kr."""
    latih = [b for b in baris if kr["latih"][0] <= b[1].year <= kr["latih"][1]]
    uji = [b for b in baris if b[1].year in kr["uji"]]
    pos_lat, pos_uji = sum(b[3] for b in latih), sum(b[3] for b in uji)
    rumah_uji = sum(1 for b in uji if b[3] and b[4] > 0)
    res = {"n_hari_latih": len(latih), "n_hari_uji": len(uji), "kejadian_latih": pos_lat, "kejadian_uji": pos_uji,
           "kejadian_uji_dengan_rumah_rusak": rumah_uji}
    if pos_lat < kr["min_positif"] or pos_uji < kr["min_positif"]:
        res["vonis"] = "data tidak cukup"
        res["alasan"] = f"kejadian latih {pos_lat}, uji {pos_uji}; minimal {kr['min_positif']} masing-masing"
        return res
    # statistik per kab dari hari latih
    ms = {}
    for kab in {b[0] for b in latih}:
        a = [b[2] for b in latih if b[0] == kab]
        mu = sum(a) / len(a)
        sd = max(math.sqrt(sum((x - mu) ** 2 for x in a) / len(a)), 0.1)
        n = sum(b[3] for b in latih if b[0] == kab)
        ms[kab] = (mu, sd, n / len(a))
    hb = {}
    for b in latih:
        s = hb.setdefault((b[0], b[1].month), [0, 0])
        s[0] += b[3]; s[1] += 1
    K = kr["susut_hari"]

    def klim(kab, m):
        n, d = hb.get((kab, m), [0, 0])
        return (n + K * ms[kab][2]) / (d + K)

    z = lambda b: (b[2] - ms[b[0]][0]) / ms[b[0]][1]
    b0, b1 = newton2([z(b) for b in latih], [b[3] for b in latih], [logit(klim(b[0], b[1].month)) for b in latih])
    res["tahap1"] = {"b0": round(b0, 4), "b1": round(b1, 4)}
    pk, pm, blok = [], [], {}
    for b in uji:
        q = klim(b[0], b[1].month)
        p = sig(logit(q) + b0 + b1 * z(b))
        bk, bm = (q - b[3]) ** 2, (p - b[3]) ** 2
        pk.append(q); pm.append(p)
        s = blok.setdefault((b[0], b[1].year, b[1].month), [0.0, 0])
        s[0] += bk - bm; s[1] += 1
    res["tahap1"].update({
        "brier_model": sum((p - b[3]) ** 2 for p, b in zip(pm, uji)) / len(uji),
        "brier_klim": sum((p - b[3]) ** 2 for p, b in zip(pk, uji)) / len(uji),
        "auc_model": auc([p for p, b in zip(pm, uji) if b[3]], [p for p, b in zip(pm, uji) if not b[3]]),
        "auc_klim": auc([p for p, b in zip(pk, uji) if b[3]], [p for p, b in zip(pk, uji) if not b[3]]),
        "selisih_blok": [s[0] / s[1] for s in blok.values()], "n_blok": len(blok)})
    # tahap 2
    ev_l = [b for b in latih if b[3]]
    ev_u = [b for b in uji if b[3]]
    res["tahap2_n"] = {"latih": len(ev_l), "uji": len(ev_u)}
    if len(ev_u) < kr["min_positif"]:
        res["tahap2"] = {"vonis": "data tidak cukup", "alasan": f"hari kejadian uji {len(ev_u)} < {kr['min_positif']}"}
        res["vonis"] = "tahap 1 dinilai, tahap 2 data tidak cukup"
        return res
    y = lambda b: math.log1p(b[4])
    c0, c1 = ols2([z(b) for b in ev_l], [y(b) for b in ev_l])
    ys = sorted(y(b) for b in ev_l)
    med = ys[len(ys) // 2]
    gal_m = [abs(y(b) - (c0 + c1 * z(b))) for b in ev_u]
    gal_p = [abs(y(b) - med) for b in ev_u]
    res["tahap2"] = {"c0": round(c0, 4), "c1": round(c1, 4), "median_latih": round(med, 4), "gal_model": gal_m, "gal_pemb": gal_p}
    res["vonis"] = "dihitung"
    return res


def gerbang_entri(res, G, sumber):
    if res.get("vonis") == "data tidak cukup":
        return {"longsor_peluang_kejadian": G.kosong("Brier peluang longsor kab-hari", res["alasan"], sumber, "klimatologi kab x bulan"),
                "longsor_rumah_rusak": G.kosong("galat |log1p rumah rusak|", res["alasan"], sumber, "median latih")}
    t1 = res["tahap1"]
    sl = G.selang_berpasangan(t1["selisih_blok"])
    e1 = G.entri_ringkas("Brier peluang longsor kab-hari", "rendah", "klimatologi kab x bulan", res["n_hari_uji"], t1["brier_model"], t1["brier_klim"],
                         [sl[1], sl[2]] if sl else None, sumber, vonis=None,
                         catatan=f"{res['kejadian_uji']} hari kejadian uji; AUC model {round(t1['auc_model'], 4)} vs klim {round(t1['auc_klim'], 4)}; uji 2022/2023/2025 bukan lembar buta")
    t2 = res.get("tahap2", {})
    if "gal_model" in t2:
        e2 = G.entri("galat |log1p rumah rusak| per hari kejadian", "rendah", "median latih", t2["gal_model"], t2["gal_pemb"], sumber,
                     catatan="rumah rusak DIBI 0 mungkin tak tercatat; uji 2022/2023/2025 bukan lembar buta")
    else:
        e2 = G.kosong("galat |log1p rumah rusak|", t2.get("alasan", "tahap 2 tak dihitung"), sumber, "median latih")
    return {"longsor_peluang_kejadian": e1, "longsor_rumah_rusak": e2}


def jalan():
    S = _muat("sidik_umum", "scripts/umum/sidik.py")
    G = _muat("gerbang_umum", "scripts/umum/gerbang.py")
    os.chdir(AKAR)
    sid = S.cek(os.path.relpath(SIDIK, AKAR))
    kr = json.load(open(KRITERIA))
    kabs = set(json.load(open(LABEL))["kab_layak"])
    dibi = json.load(open(MASUKAN))["baris"]
    hj = hujan_kab(kabs)
    baris = []
    for kab, h in hj.items():
        for tgl, a in h.items():
            if tgl.year < kr["latih"][0] or tgl.year == 2024 or tgl.year > 2025:
                continue
            ev, rr = dibi.get(f"{kab}|{tgl.isoformat()}", [0, 0])
            baris.append((kab, tgl, a, 1 if ev else 0, rr))
    res = hitung(baris, kr)
    res.update({"kab_dengan_hujan": len(hj), "kab_layak": len(kabs), "sidik": sid["sidik"]})
    sumber = ["public/longsor/data/model_dampak.json", "public/data/label_mutu/longsor.json"]
    ent = gerbang_entri(res, G, sumber)
    ring = {k: v for k, v in res.items() if k not in ("tahap1", "tahap2")}
    t1 = {k: (round(v, 4) if isinstance(v, float) else v) for k, v in res.get("tahap1", {}).items() if k != "selisih_blok"}
    t2 = {k: v for k, v in res.get("tahap2", {}).items() if k not in ("gal_model", "gal_pemb")}
    if "gal_model" in res.get("tahap2", {}):
        t2["mae_model"] = round(sum(res["tahap2"]["gal_model"]) / len(res["tahap2"]["gal_model"]), 4)
        t2["mae_median"] = round(sum(res["tahap2"]["gal_pemb"]) / len(res["tahap2"]["gal_pemb"]), 4)
    out = {"dibuat": dt.date.today().isoformat(), "aturan": "lihat docstring scripts/longsor/model_dampak.py",
           "kriteria": kr, "ringkas": ring, "tahap1": t1, "tahap2": t2,
           "gerbang": {k: {"boleh_tampil": v["boleh_tampil"], "alasan": v["alasan"]} for k, v in ent.items()},
           "catatan": "Skala 17 kab berlabel layak; bukan nasional. Peluang dan rumah rusak TIDAK tampil di layar kecuali gerbang boleh_tampil (public/data/gerbang/longsor.json)."}
    simpan(os.path.join(KELUAR, "model_dampak.json"), out)
    print("gerbang:", G.tulis("longsor", ent))
    print(json.dumps({"ringkas": ring, "tahap1": t1, "tahap2": t2, "gerbang": out["gerbang"]}, ensure_ascii=False, indent=1))


def bekukan():
    S = _muat("sidik_umum", "scripts/umum/sidik.py")
    os.chdir(AKAR)
    h = S._hash_berkas(os.path.relpath(MASUKAN, AKAR))
    rel = lambda p: os.path.relpath(p, AKAR)
    print(S.tulis(rel(SIDIK), [rel(os.path.join(AYAH, "model_dampak.py"))], rel(KRITERIA), [h, S._hash_berkas(rel(LABEL))])["sidik"])


def uji():
    import random
    r = random.Random(3)
    kr = {"latih": [2017, 2021], "uji": [2022, 2023, 2025], "min_positif": 100, "susut_hari": 60}
    baris = []
    for kab in ("a", "b"):
        d = dt.date(2017, 1, 1)
        while d <= dt.date(2025, 12, 31):
            if d.year != 2024:
                a = r.gauss(3, 1)
                ev = 1 if r.random() < sig(-2.5 + 1.2 * (a - 3)) else 0
                baris.append((kab, d, a, ev, int(ev * math.exp(0.4 * (a - 3) + r.gauss(1, 0.3)))))
            d += dt.timedelta(days=1)
    res = hitung(baris, kr)
    assert res["tahap1"]["b1"] > 0.5, res["tahap1"]      # hujan harus terbaca pada data sintetis yang memang bergantung hujan
    assert res["tahap1"]["brier_model"] <= res["tahap1"]["brier_klim"] + 1e-4
    assert res["tahap2"]["c1"] > 0
    kecil = hitung(baris[:300], kr)
    assert kecil["vonis"] == "data tidak cukup"
    G = _muat("gerbang_umum", "scripts/umum/gerbang.py")
    assert not gerbang_entri(kecil, G, [])["longsor_peluang_kejadian"]["boleh_tampil"]   # gagal-tertutup
    assert abs(auc([2, 3], [1, 2]) - 0.875) < 1e-9
    print("model_dampak uji lolos")


if __name__ == "__main__":
    {"ambil": ambil, "bekukan": bekukan, "jalan": jalan, "uji": uji}.get(sys.argv[1] if len(sys.argv) > 1 else "uji", uji)()
