"""Kalibrasi berpenjaga dari pasangan matang -> public/prediksi/data/kalibrasi.json (tiap keputusan tercatat).

Peluang, per (kode, ambang, tenggang), hanya pasangan tahap "final" (HJN sementara = analisis model, tidak dipakai):
  uji = 14 tanggal sasaran terakhir, fit = sampai 46 tanggal sebelumnya. Regresi isotonik (PAV, stdlib) pada fit.
  Dicoba hanya bila fit >= 30 pasangan, >= 14 tanggal, dan uji >= 30 pasangan; selain itu "menunggu".
  "dipakai" hanya bila Brier uji turun; kalau tidak "ditolak" dan layar memakai peluang mentah (fail-closed).
Jumlah & lama hujan (HJN): rasio bias per provinsi sum(amatan)/sum(prakiraan) pada fit, dibatasi 0,5..2;
  "dipakai" hanya bila galat absolut rata-rata uji turun.
Kriteria terkunci model lain (PRAREG-PROSPEKTIF, KRITERIA_SHA256) tidak disentuh: berkas ini hanya untuk /prediksi.

Pakai:  python3 scripts/prediksi/kalibrasi.py   |   python3 scripts/prediksi/kalibrasi.py uji
"""
import datetime as dt, os, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import dasar as D

UJI_HARI, FIT_HARI, N_MIN, FIT_HARI_MIN = 14, 46, 30, 14
RASIO = (0.5, 2.0)


def pav(ps, os_):
    """Regresi isotonik naik (pool adjacent violators). -> titik [(p rata-rata blok, nilai blok)] urut naik."""
    g = {}
    for p, o in zip(ps, os_):
        s = g.setdefault(p, [0.0, 0.0, 0])
        s[0] += p
        s[1] += o
        s[2] += 1
    blok = [[sp, so, n] for _, (sp, so, n) in sorted(g.items())]
    i = 0
    while i < len(blok) - 1:
        if blok[i][1] / blok[i][2] > blok[i + 1][1] / blok[i + 1][2]:
            a, b = blok[i], blok.pop(i + 1)
            a[0], a[1], a[2] = a[0] + b[0], a[1] + b[1], a[2] + b[2]
            i = max(i - 1, 0)
        else:
            i += 1
    return [(round(sp / n, 4), round(so / n, 4)) for sp, so, n in blok]


def terapkan(peta, p):
    """Interpolasi linier antar titik peta; di luar rentang = titik ujung."""
    if p is None or not peta:
        return p
    if p <= peta[0][0]:
        return peta[0][1]
    for (x0, y0), (x1, y1) in zip(peta, peta[1:]):
        if p <= x1:
            return round(y0 + (y1 - y0) * (p - x0) / (x1 - x0), 4) if x1 > x0 else y1
    return peta[-1][1]


def brier(ps, os_):
    return round(sum((p - o) ** 2 for p, o in zip(ps, os_)) / len(ps), 5) if ps else None


def belah(baris, kol_sasaran=4):
    """-> (fit, uji) menurut tanggal sasaran: uji = UJI_HARI tanggal terakhir, fit = FIT_HARI tanggal sebelumnya."""
    tgl = sorted({x[kol_sasaran] for x in baris})
    uji_t = set(tgl[-UJI_HARI:])
    fit_t = set(tgl[:-UJI_HARI][-FIT_HARI:])
    return [x for x in baris if x[kol_sasaran] in fit_t], [x for x in baris if x[kol_sasaran] in uji_t], len(fit_t), len(uji_t)


def kal_peluang(baris):
    """baris = pasangan satu grup [.., p(6), o(7) ..] -> keputusan."""
    fit, uji, hf, hu = belah(baris)
    out = {"n_fit": len(fit), "n_uji": len(uji), "hari_fit": hf, "hari_uji": hu}
    if len(fit) < N_MIN or hf < FIT_HARI_MIN or len(uji) < N_MIN:
        return {**out, "status": "menunggu", "alasan": f"butuh fit >= {N_MIN} pasangan dan {FIT_HARI_MIN} hari + uji {UJI_HARI} hari >= {N_MIN} pasangan"}
    peta = pav([x[6] for x in fit], [x[7] for x in fit])
    bm = brier([x[6] for x in uji], [x[7] for x in uji])
    bk = brier([terapkan(peta, x[6]) for x in uji], [x[7] for x in uji])
    ok = bk < bm
    return {**out, "status": "dipakai" if ok else "ditolak", "brier_uji_mentah": bm, "brier_uji_kalibrasi": bk,
            "alasan": "Brier uji turun" if ok else "Brier uji tidak turun: peluang mentah dipakai", "peta": peta if ok else None}


def kal_jumlah(baris, i_f, i_o):
    """Rasio bias satu provinsi. baris = pasangan HJN ambang 1 dengan ekstra; i_f/i_o = indeks prakiraan/amatan di ekstra."""
    fit, uji, hf, hu = belah(baris)
    f = [(x[10][i_f], x[10][i_o]) for x in fit if x[10][i_f] is not None and x[10][i_o] is not None]
    u = [(x[10][i_f], x[10][i_o]) for x in uji if x[10][i_f] is not None and x[10][i_o] is not None]
    out = {"n_fit": len(f), "n_uji": len(u), "hari_fit": hf, "hari_uji": hu}
    sf = sum(a for a, _ in f)
    if len(f) < N_MIN or hf < FIT_HARI_MIN or len(u) < N_MIN or sf <= 0:
        return {**out, "status": "menunggu", "alasan": f"butuh fit >= {N_MIN} pasangan dan {FIT_HARI_MIN} hari + uji >= {N_MIN}"}
    r = round(min(max(sum(b for _, b in f) / sf, RASIO[0]), RASIO[1]), 3)
    m0 = round(sum(abs(a - b) for a, b in u) / len(u), 3)
    m1 = round(sum(abs(a * r - b) for a, b in u) / len(u), 3)
    ok = m1 < m0
    return {**out, "status": "dipakai" if ok else "ditolak", "rasio": r if ok else None, "rasio_fit": r, "mae_uji_mentah": m0,
            "mae_uji_kalibrasi": m1, "alasan": "galat uji turun" if ok else "galat uji tidak turun: angka mentah dipakai"}


def kalibrasi(pas):
    """pas = isi pasangan.json -> isi kalibrasi.json."""
    final = [x for x in pas["baris"] if x[3] == "final"]
    grup = {}
    for x in final:
        grup.setdefault((x[0], x[1], x[2]), []).append(x)
    peluang = [{"kode": k, "ambang": a, "tenggang": n, **kal_peluang(v)} for (k, a, n), v in sorted(grup.items())]
    jumlah = []
    hjn = [x for x in final if x[0] == "HJN" and x[1] == 1 and x[10]]
    per_prov = {}
    for x in hjn:
        per_prov.setdefault((x[2], x[5][:2]), []).append(x)
    for (n, prov), v in sorted(per_prov.items()):
        for besaran, i_f, i_o in (("tot", 4, 5), ("lama", 2, 3)):
            jumlah.append({"besaran": besaran, "tenggang": n, "prov": prov, **kal_jumlah(v, i_f, i_o)})
    return {"versi": 1, "dibuat": dt.datetime.now(D.WIB).replace(microsecond=0).isoformat(),
            "aturan": {"uji_hari": UJI_HARI, "fit_hari": FIT_HARI, "n_min": N_MIN, "fit_hari_min": FIT_HARI_MIN, "rasio": list(RASIO),
                       "metode": "isotonik PAV; dipakai hanya bila Brier 14 hari uji tahan turun, selain itu peluang mentah"},
            "peluang": peluang, "jumlah": jumlah,
            "ringkas": {s: sum(1 for x in peluang + jumlah if x["status"] == s) for s in ("dipakai", "ditolak", "menunggu")}}


def uji():
    assert pav([0.1, 0.2, 0.3], [0, 1, 0]) == [(0.1, 0.0), (0.25, 0.5)], pav([0.1, 0.2, 0.3], [0, 1, 0])
    peta = pav([0.2] * 10 + [0.8] * 10, [0] * 8 + [1] * 2 + [1] * 9 + [0])
    assert peta == [(0.2, 0.2), (0.8, 0.9)] and terapkan(peta, 0.5) == 0.55 and terapkan(peta, 0.0) == 0.2 and terapkan(peta, 1) == 0.9
    assert all(a[1] <= b[1] for a, b in zip(peta, peta[1:])), "peta wajib monoton"
    t0 = dt.date(2026, 8, 1)

    def baris(n_hari, p_fn, o_fn, per=5):
        return [["HJN", 20, 1, "final", (t0 + dt.timedelta(days=d)).isoformat(), f"11{k:02d}", p_fn(d, k), o_fn(d, k), 0, 0.2,
                 [None, None, None, None, 10.0, 20.0]] for d in range(n_hari) for k in range(per)]
    # model terlalu yakin: p 0,8 padahal frekuensi 0,4 -> kalibrasi menurunkan Brier -> dipakai
    b = baris(40, lambda d, k: 0.8, lambda d, k: int(k < 2))
    r = kal_peluang(b)
    assert r["status"] == "dipakai" and r["brier_uji_kalibrasi"] < r["brier_uji_mentah"] and r["n_uji"] == 70, r
    # model sudah terkalibrasi sempurna (p = o): kalibrasi tidak bisa lebih baik -> ditolak, peta None
    b2 = baris(40, lambda d, k: float(k < 2), lambda d, k: int(k < 2))
    assert kal_peluang(b2)["status"] == "ditolak" and kal_peluang(b2)["peta"] is None
    # data terlalu sedikit -> menunggu, tidak dikarang
    assert kal_peluang(baris(10, lambda d, k: 0.5, lambda d, k: 1))["status"] == "menunggu"
    # rasio bias: prakiraan 10, amatan 20 -> rasio 2 (dibatasi), galat turun -> dipakai
    j = kal_jumlah(b, 4, 5)
    assert j["status"] == "dipakai" and j["rasio"] == 2.0 and j["mae_uji_kalibrasi"] == 0, j
    b3 = [x[:10] + [[None, None, None, None, 10.0, 100.0]] for x in b]
    assert kal_jumlah(b3, 4, 5)["rasio_fit"] == 2.0, "rasio dibatasi 0,5..2"
    k = kalibrasi({"baris": b + [x[:3] + ["sementara"] + x[4:] for x in b]})
    assert k["peluang"][0]["n_fit"] + k["peluang"][0]["n_uji"] == 200, "tahap sementara tidak ikut kalibrasi"
    assert k["ringkas"]["dipakai"] >= 1
    print("kalibrasi.py: uji lulus")


if __name__ == "__main__":
    if sys.argv[1:2] == ["uji"]:
        uji()
    elif len(sys.argv) == 1:
        pas = D.baca(os.path.join(D.DATA, "pasangan.json"), {"baris": []})
        k = kalibrasi(pas)
        D.simpan(os.path.join(D.DATA, "kalibrasi.json"), k)
        print("kalibrasi:", k["ringkas"])
    else:
        print(__doc__)
