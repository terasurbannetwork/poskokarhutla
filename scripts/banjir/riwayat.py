"""Indeks risiko historis banjir, longsor, rob; kalender musim; permukaan kekerapan
-> public/banjir/data/riwayat.json, riwayat_grid.json (banjir), riwayat_grid_longsor.json

Setara skorRiwayat di Posko Karhutla (index.html), diadaptasi untuk kejadian BNPB/DIBI yang dicatat PER KABUPATEN:

(a) Indeks risiko 0-100 per kabupaten/kota (dan provinsi = jumlah kabupatennya), per bahaya, dinilai se-Indonesia:
      40  kekerapan  fK = tahun berkejadian / tahun tercakup; "berkejadian" = >= 1 kejadian (kab/kota) atau
                     >= 10 kejadian (provinsi, banjir & longsor; setara ambang bertingkat karhutla 10/100/500 titik)
      25  besaran    fB = log(1 + total kejadian) / log(1 + total terbesar)
      15  tren       fT = (log2(rasio) + 1) / 2, dipotong 0-1. rasio = rasio wilayah / rasio nasional;
                     rasio = (rata-rata tahun terbaru + 1) / (rata-rata tahun sebelumnya + 1), tahun terbaru = 30% tahun
                     tercakup terakhir. Dibagi rasio nasional karena pencatatan DIBI sendiri naik tiap tahun (933 baris
                     2008, 5.202 baris 2021): tanpa itu hampir semua wilayah tampak "naik".
      20  InaRISK    fH = rata-rata indeks bahaya InaRISK kecamatan di wilayah itu (banjir / longsor)
    Bobot riwayat 40:25:15 = 50:30:20 karhutla dikali 0,8; 20 sisanya InaRISK.
    Rob: tanpa InaRISK (bobot persis karhutla 50:30:20). Lapisan "gelombang ekstrem & abrasi" yang disampel di titik
    tengah kecamatan bernilai 0 untuk hampir semua kota pantai (Jakarta Utara, Semarang, Pekalongan, Medan), jadi tidak
    membedakan apa pun; karena itu rob juga tidak punya skor kecamatan maupun permukaan sel.
    Tahun tercakup = tahun penuh (<= TAHUN_AKHIR) yang mencatat bahaya itu di >= 5 kab/kota se-Indonesia
    (banjir & longsor 2008-2025; rob hanya beberapa tahun karena kategori "Banjir Rob" DIBI baru dipakai 2018+).
    Kelas dari posisi skor se-Indonesia: 10% teratas sangat tinggi, 10-30% tinggi, 30-60% sedang, sisanya rendah;
    skor sama selalu kelas sama.
    Ikut dinilai: wilayah dengan >= 1 kejadian atau indeks bahaya > 0.
(b) Kecamatan (banjir, longsor): riwayat BNPB/DIBI hanya sampai kabupaten, jadi skor kecamatan = skor kabupaten x (0,4 + 0,6 x bahaya
    InaRISK kecamatan). Kelas dari posisi se-Indonesia antar kecamatan.
(c) Kalender musim per provinsi per dasarian (10 hari) dari tanggal kejadian DIBI 2008-TAHUN_AKHIR (persis musim.py
    karhutla): ambang = persentil 90 jumlah kejadian semua dasarian provinsi itu (min. 1); peluang = porsi tahun yang
    dasarian itu >= ambang, dipisah tahun La Nina / tahun biasa. Tahun La Nina (ONI NOAA CPC <= -0,5 pada musim hujan
    utama): LA_NINA.
(d) Permukaan kekerapan per sel 0,1 derajat (skema sama dengan public/data/riwayat_grid.json): kejadian kabupaten per tahun
    dibagi ke kecamatannya berbobot (0,1 + bahaya InaRISK kecamatan); e = perkiraan kejadian kecamatan setahun;
    f = jumlah P(>= 1 kejadian) = 1 - exp(-e) atas tahun tercakup (perkiraan "tahun berkejadian", 0..tahun);
    r = rata-rata e per tahun. Tiap sel mengambil nilai kecamatan tempat titik tengahnya jatuh.

Tanggal kejadian DIBI diambil ulang lewat kejadian.dibi() (cache data/raw/banjir/dibi_tanggal.json); bila gagal dan
cache tidak ada, dipakai kejadian_dibi di kejadian.json (hanya 3 tahun terakhir).

Pakai:  python3 scripts/banjir/riwayat.py   |   python3 scripts/banjir/riwayat.py uji
"""
import json, math, os, sys

sys.path.insert(0, os.path.dirname(__file__))
from umum import KELUAR, MENTAH, simpan, baca
from wilayah import AKAR

BOBOT = {"banjir": {"kekerapan": 40, "besaran": 25, "tren": 15, "inarisk": 20}, "rob": {"kekerapan": 50, "besaran": 30, "tren": 20, "inarisk": 0}}
BOBOT["longsor"] = BOBOT["banjir"]
BAHAYA = {"banjir": "banjir", "longsor": "longsor", "rob": None}  # jenis kejadian -> lapisan InaRISK
LA_NINA = [2010, 2011, 2020, 2021, 2022]
AMBANG_PROV = {"banjir": 10, "longsor": 10, "rob": 1}  # kejadian setahun supaya provinsi dihitung "berkejadian"
TAHUN_AKHIR = 2025  # tahun penuh terakhir; 2026 ditampilkan tapi tidak dinilai
CACHE = os.path.join(MENTAH, "dibi_tanggal.json")
X0, X1, Y0, Y1, SEL = 94.5, 141.5, -11.5, 6.5, 0.1


def kelas(daf):
    """daf diurut skor menurun -> isi kelas & lv dari posisi skor (bukan baris): skor sama selalu kelas sama."""
    pertama = {}
    for i, r in enumerate(daf):
        pertama.setdefault(r["skor"], i)
    for r in daf:
        q = pertama[r["skor"]] / len(daf)
        r["lv"] = 3 if q < .1 else 2 if q < .3 else 1 if q < .6 else 0
        r["kelas"] = ["Rendah", "Sedang", "Tinggi", "Sangat tinggi"][r["lv"]]


def tahun_tercakup(kab, jenis, akhir=TAHUN_AKHIR, min_kab=5):
    hit = {}
    for v in kab.values():
        for t, n in v.get(jenis, {}).items():
            if n > 0:
                hit[t] = hit.get(t, 0) + 1
    return sorted(t for t, n in hit.items() if n >= min_kab and int(t) <= akhir)


def rasio(v, n_baru):
    lama, baru = v[:-n_baru], v[-n_baru:]
    return (sum(baru) / len(baru) + 1) / ((sum(lama) / len(lama) if lama else 0) + 1)


def skor(daf, th, B=BOBOT["banjir"], amb=1):
    """daf: [{kunci, v (kejadian per tahun tercakup), h}] -> isi skor, komponen, kelas; urut menurun."""
    if not daf:
        return daf
    nb = max(1, round(len(th) * .3))
    nas = [sum(r["v"][i] for r in daf) for i in range(len(th))]
    lama, baru = nas[:-nb], nas[-nb:]
    rN = (sum(baru) / len(baru)) / max(1e-9, sum(lama) / len(lama)) if lama else 1
    maks = max(sum(r["v"]) for r in daf)
    for r in daf:
        v = r["v"]
        r["total"] = sum(v)
        r["tahun"] = sum(1 for x in v if x >= amb)
        r["puncak"] = th[v.index(max(v))] if r["total"] else None
        r["tren"] = round(rasio(v, nb) / rN, 2)
        r["fK"] = r["tahun"] / len(th)
        r["fB"] = math.log1p(r["total"]) / math.log1p(maks) if maks else 0
        r["fT"] = min(1, max(0, (math.log2(max(r["tren"], 1e-9)) + 1) / 2))
        r["fH"] = r["h"]
        r["skor"] = round(B["kekerapan"] * r["fK"] + B["besaran"] * r["fB"] + B["tren"] * r["fT"] + B["inarisk"] * r["fH"])
    daf.sort(key=lambda r: (-r["skor"], -r["total"]))
    kelas(daf)
    return daf


def dasarian(tgl):
    m, d = int(tgl[5:7]), int(tgl[8:10])
    return (m - 1) * 3 + min(2, (d - 1) // 10)


def persentil(xs, p):
    s = sorted(xs)
    return s[min(len(s) - 1, int(p * (len(s) - 1)))]


def musim(per, tahun):
    """per: {tahun: [36]} satu provinsi -> ringkasan kalender."""
    nol = [0] * 36
    ambang = max(1, persentil([per.get(y, nol)[d] for y in tahun for d in range(36)], .9))
    p = lambda ys: [round(sum(1 for y in ys if per.get(y, nol)[d] >= ambang) / len(ys), 2) if ys else 0 for d in range(36)]
    rata = [round(sum(per.get(y, nol)[d] for y in tahun) / len(tahun), 1) for d in range(36)]
    ln, bi = [y for y in tahun if y in LA_NINA], [y for y in tahun if y not in LA_NINA]
    return {"ambang": ambang, "rata": rata, "p_semua": p(tahun), "p_la_nina": p(ln), "p_biasa": p(bi), "puncak": rata.index(max(rata))}


def tanggal_dibi():
    """-> ([(jenis_list, prov, kab, tanggal, kejadian)], keterangan)"""
    try:
        from kejadian import dibi, Pencocok
        out = [[j, p, n, t, v["kejadian"]] for j, p, n, t, v in dibi(Pencocok())]
        simpan(CACHE, out)
    except Exception as e:
        print(f"  DIBI tidak terjangkau ({e}); pakai cache", file=sys.stderr)
        out = baca(CACHE)
    if out:
        return out, f"DIBI BNPB 2008-{TAHUN_AKHIR}"
    K = json.load(open(os.path.join(KELUAR, "kejadian.json")))
    return [[r["jenis"].split("_"), r["prov"], r["kab"], r["tanggal"], 1] for r in K.get("kejadian_dibi", [])], "DIBI BNPB 3 tahun terakhir (cadangan)"


def bobot_kec(kec_kab, bahaya, lapis):
    """kecamatan satu kab -> bobot berbagi kejadian (0,1 + bahaya), jumlah 1."""
    w = {k: .1 + (bahaya.get(k, {}).get(lapis) or 0) for k in kec_kab}
    s = sum(w.values())
    return {k: x / s for k, x in w.items()}


def grid(w, kec_f, kec_r, n, jalur, sumber):
    sel_ = []
    for iy in range(round((Y1 - Y0) / SEL)):
        for ix in range(round((X1 - X0) / SEL)):
            adm = w.cari(X0 + (ix + .5) * SEL, Y1 - (iy + .5) * SEL)
            if not adm:
                continue
            k = "|".join(adm)
            if kec_f.get(k, 0) >= .05:
                sel_.append([ix, iy, round(kec_f[k], 1), round(kec_r[k], 2)])
    simpan(jalur, {"sumber": sumber, "x0": X0, "y1": Y1, "sel": SEL, "w": round((X1 - X0) / SEL), "h": round((Y1 - Y0) / SEL),
                   "tahun": n, "ambang": 1, "sel_data": sel_})
    return len(sel_)


def main():
    K = json.load(open(os.path.join(KELUAR, "kejadian.json")))
    bahaya = json.load(open(os.path.join(KELUAR, "bahaya.json")))["kec"]
    semua_th = [str(t) for t in K["tahun"]]
    kec_per_kab = {}
    for k in bahaya:
        kec_per_kab.setdefault(k.rsplit("|", 1)[0], []).append(k)
    out = {"sumber": K.get("sumber", ""), "la_nina": LA_NINA, "tahun": semua_th, "tahun_akhir": TAHUN_AKHIR,
           "jenis": {}, "musim": {}}
    from wilayah import Wilayah
    W = None
    for jenis, lapis in BAHAYA.items():
        th = tahun_tercakup(K["kab"], jenis)
        hb = lambda k: (bahaya[k].get(lapis) or 0) if lapis else 0
        hk = lambda kab: sum(hb(k) for k in kec_per_kab[kab]) / len(kec_per_kab[kab])
        kab = []
        for kk in kec_per_kab:
            v = [K["kab"].get(kk, {}).get(jenis, {}).get(t, 0) for t in th]
            h = hk(kk)
            if sum(v) or h > 0:
                kab.append({"kunci": kk, "v": v, "h": round(h, 3), "vs": [K["kab"].get(kk, {}).get(jenis, {}).get(t, 0) for t in semua_th]})
        skor(kab, th, BOBOT[jenis])
        prov = {}
        for r in kab:
            p = prov.setdefault(r["kunci"].split("|")[0], {"kunci": r["kunci"].split("|")[0], "v": [0] * len(th), "vs": [0] * len(semua_th), "hs": [], "n": 0})
            p["v"] = [a + b for a, b in zip(p["v"], r["v"])]
            p["vs"] = [a + b for a, b in zip(p["vs"], r["vs"])]
        for p in prov.values():
            ks = [k for kb in kec_per_kab if kb.startswith(p["kunci"] + "|") for k in kec_per_kab[kb]]
            p["h"] = round(sum(hb(k) for k in ks) / len(ks), 3)
        prov = skor(list(prov.values()), th, BOBOT[jenis], AMBANG_PROV[jenis])
        # (b) kecamatan
        skab = {r["kunci"]: r["skor"] for r in kab}
        kec = [{"kunci": k, "skor": round(skab[kb] * (.4 + .6 * hb(k)))} for kb in skab for k in kec_per_kab[kb]] if lapis else []
        kec.sort(key=lambda r: -r["skor"])
        kec and kelas(kec)
        bulat = lambda r: {"v": r["vs"], "skor": r["skor"], "lv": r["lv"], "tahun": r["tahun"], "total": r["total"], "puncak": r["puncak"],
                           "tren": r["tren"], "fK": round(r["fK"], 3), "fB": round(r["fB"], 3), "fT": round(r["fT"], 3), "h": r["h"]}
        out["jenis"][jenis] = {"tahun_cakup": th, "tahun_baru": th[-max(1, round(len(th) * .3)):], "lapis": lapis, "bobot": BOBOT[jenis], "ambang_prov": AMBANG_PROV[jenis],
                               "maks": max(r["total"] for r in kab), "maks_prov": max(r["total"] for r in prov),
                               "prov": {r["kunci"]: bulat(r) for r in prov}, "kab": {r["kunci"]: bulat(r) for r in kab},
                               "kec": {r["kunci"]: [r["skor"], r["lv"]] for r in kec}}
        print(f"{jenis}: {len(th)} tahun ({th[0]}-{th[-1]}), {len(kab)} kab, {len(kec)} kec; teratas "
              + ", ".join(f"{r['kunci']} {r['skor']}" for r in kab[:5]), file=sys.stderr)
        # (d) permukaan: banjir & longsor (rob terlalu jarang untuk dipetakan per sel)
        if lapis:
            kec_f, kec_r = {}, {}
            for r in kab:
                bw = bobot_kec(kec_per_kab[r["kunci"]], bahaya, lapis)
                for k, x in bw.items():
                    e = [n * x for n in r["v"]]
                    kec_f[k] = sum(1 - math.exp(-a) for a in e)
                    kec_r[k] = sum(e) / len(e)
            W = W or Wilayah()
            nama = "riwayat_grid.json" if jenis == "banjir" else f"riwayat_grid_{jenis}.json"
            n = grid(W, kec_f, kec_r, len(th), os.path.join(KELUAR, nama),
                     f"BNPB/DIBI {th[0]}-{th[-1]} per kab/kota, dibagi ke kecamatan berbobot 0,1 + bahaya {lapis} InaRISK")
            print(f"  {nama}: {n} sel", file=sys.stderr)
    # (c) kalender musim
    rows, ket = tanggal_dibi()
    for jenis in BAHAYA:
        hit = {}
        for js, p, _, tgl, n in rows:
            if jenis in js and 2008 <= int(tgl[:4]) <= TAHUN_AKHIR:
                hit.setdefault(p, {}).setdefault(int(tgl[:4]), [0] * 36)[dasarian(tgl)] += n
        tahun = list(range(min(int(t[:4]) for *_, t, _ in rows if t), TAHUN_AKHIR + 1)) if jenis != "rob" else \
            [int(t) for t in out["jenis"]["rob"]["tahun_cakup"]]
        out["musim"][jenis] = {k: musim(v, tahun) for k, v in hit.items() if sum(map(sum, v.values())) >= 10}
        out["musim"][jenis + "_tahun"] = [tahun[0], tahun[-1]]
    out["musim"]["sumber"] = ket
    simpan(os.path.join(KELUAR, "riwayat.json"), out)
    print(f"riwayat.json: {os.path.getsize(os.path.join(KELUAR, 'riwayat.json')) // 1024} KB; musim dari {ket}", file=sys.stderr)


def uji():
    th = ["2020", "2021", "2022", "2023", "2024"]
    daf = [{"kunci": "a", "v": [1, 1, 1, 1, 1], "h": 1}, {"kunci": "b", "v": [0, 0, 0, 0, 0], "h": 0},
           {"kunci": "c", "v": [0, 0, 0, 0, 9], "h": .5}, {"kunci": "d", "v": [0, 0, 0, 0, 9], "h": .5}]
    skor(daf, th)
    a = next(r for r in daf if r["kunci"] == "a")
    assert a["fK"] == 1 and a["skor"] >= 60, a
    b = next(r for r in daf if r["kunci"] == "b")
    assert b["skor"] == round(15 * b["fT"]) and b["lv"] == 0, b  # tanpa kejadian & tanpa bahaya: hanya tren
    c, d = [r for r in daf if r["kunci"] in "cd"]
    assert c["skor"] == d["skor"] and c["kelas"] == d["kelas"], "skor sama harus kelas sama"
    assert daf[0]["lv"] == 3 and [r["skor"] for r in daf] == sorted((r["skor"] for r in daf), reverse=True)
    # tren dinormalisasi nasional: wilayah yang naik persis seperti nasional -> 1
    t2 = [{"kunci": "x", "v": [10, 10, 10, 10, 20], "h": 0}, {"kunci": "y", "v": [10, 10, 10, 10, 20], "h": 0}]
    skor(t2, th)
    assert abs(t2[0]["tren"] - 1) < .1, t2[0]
    assert dasarian("2020-01-01") == 0 and dasarian("2020-01-31") == 2 and dasarian("2020-09-15") == 25 and dasarian("2020-12-31") == 35
    m = musim({2010: [5] + [0] * 35, 2015: [0] * 36}, [2010, 2015])
    assert m["p_la_nina"][0] == 1 and m["p_biasa"][0] == 0 and m["p_semua"][0] == .5 and m["puncak"] == 0, m
    bw = bobot_kec(["a", "b"], {"a": {"banjir": 1}, "b": {"banjir": 0}}, "banjir")
    assert abs(sum(bw.values()) - 1) < 1e-9 and bw["a"] > bw["b"] > 0
    t3 = skor([{"kunci": "p", "v": [5, 12, 10, 0, 30], "h": 0}], th, amb=10)
    assert t3[0]["tahun"] == 3, t3
    assert tahun_tercakup({f"k{i}": {"rob": {"2020": 1, "2026": 3}} for i in range(5)}, "rob") == ["2020"]
    print("ok")


if __name__ == "__main__":
    uji() if sys.argv[1:] == ["uji"] else main()
