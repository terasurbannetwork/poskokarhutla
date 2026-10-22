"""Uji balik baseline (RANCANGAN §4.6): ramal hilang 2020–2024 dari laju 2010–2019, banding aktual.

laju = Σ hilang[2010..2019] / Σ hutan_awal_tahun[2010..2019]; hutan_awal_tahun t = hutan2000 − Σ hilang[2001..t−1].
Ramalan: mulai dari hutan awal 2020, tiap tahun hilang = hutan × laju, hutan −= hilang.

Dua varian: `semua` (semua kehilangan tutupan) dan `tanpa_kehutanan` (tanpa pendorong WRI 4 =
tebang/hutan tanaman, yang di HPH sebagian besar terencana, bukan deforestasi yang bisa dihindari).

Pakai:  python3 scripts/karbon/ujibalik.py [--masuk data/raw/karbon/saring.json] [--min-hutan 1000]
        python3 scripts/karbon/ujibalik.py --uji
"""
import argparse, datetime, json, os, statistics, sys

AKAR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "../..")
ACUAN, UJI = (2010, 2019), (2020, 2024)


def hilang_th(b, t, kecuali=()):
    h = b["hilang"].get(str(t), {})
    return (h.get("ha") or 0) - sum(p["ha"] for k, p in h.get("pendorong", {}).items() if k in kecuali)


def ramal(b, acuan=ACUAN, uji=UJI, kecuali=()):
    """-> (ramal_ha, aktual_ha, laju). Hutan awal tahun selalu dikurangi SEMUA kehilangan."""
    hutan, awal = b["hutan2000_ha"], {}
    for t in range(2001, uji[1] + 1):
        awal[t] = hutan
        hutan -= hilang_th(b, t)
    sum_awal = sum(awal[t] for t in range(acuan[0], acuan[1] + 1))
    laju = sum(hilang_th(b, t, kecuali) for t in range(acuan[0], acuan[1] + 1)) / sum_awal if sum_awal > 0 else 0
    f, r = awal[uji[0]], 0.0
    for _ in range(uji[0], uji[1] + 1):
        r += f * laju
        f -= f * laju
    return r, sum(hilang_th(b, t, kecuali) for t in range(uji[0], uji[1] + 1)), laju


def persentil(x, p):
    x = sorted(x)
    if not x:
        return None
    k = (len(x) - 1) * p
    i = int(k)
    return x[i] + (x[min(i + 1, len(x) - 1)] - x[i]) * (k - i)


def ringkas(baris):
    rasio = [b["rasio"] for b in baris if b["rasio"] is not None]
    ape = [abs(b["ramal_ha"] - b["aktual_ha"]) / b["aktual_ha"] for b in baris if b["aktual_ha"] > 0]
    tr, ta = sum(b["ramal_ha"] for b in baris), sum(b["aktual_ha"] for b in baris)
    r2 = lambda v: None if v is None else round(v, 3)
    return {
        "n": len(baris), "n_aktual_nol": len(baris) - len(rasio),
        "median_rasio": r2(statistics.median(rasio)) if rasio else None,
        **{f"p{int(p * 100)}_rasio": r2(persentil(rasio, p)) for p in (0.1, 0.25, 0.75, 0.9)},
        "mape": r2(statistics.mean(ape)) if ape else None,
        "dalam_25pct": r2(sum(abs(r - 1) <= 0.25 for r in rasio) / len(rasio)) if rasio else None,
        "dalam_50pct": r2(sum(abs(r - 1) <= 0.5 for r in rasio) / len(rasio)) if rasio else None,
        "total_ramal_ha": round(tr), "total_aktual_ha": round(ta), "rasio_total": r2(tr / ta) if ta else None,
    }


def ujibalik(saring, min_hutan=1000):
    hasil = {"dibuat": datetime.datetime.now(datetime.timezone.utc).isoformat(timespec="seconds"),
             "acuan": list(ACUAN), "uji": list(UJI), "min_hutan_ha": min_hutan}
    pilih = [b for b in saring["baris"] if b["hutan2000_ha"] >= min_hutan]
    for nama, kecuali in (("semua", ()), ("tanpa_kehutanan", ("4",))):
        baris = []
        for b in pilih:
            r, a, laju = ramal(b, kecuali=kecuali)
            baris.append({"id": b["id"], "ramal_ha": round(r, 1), "aktual_ha": round(a, 1),
                          "laju": round(laju, 6), "rasio": round(r / a, 3) if a > 0 else None})
        hasil[nama] = {"ringkas": ringkas(baris), "baris": baris}
    return hasil


def uji():
    th = lambda d: {str(t): {"ha": d.get(t, 0), "co2_t": 0, "ha_gambut": 0, "ha_primer": 0} for t in range(2001, 2026)}
    # laju tetap 1%/th dari 2001: hutan 1000 -> hilang_t = 1000*0,99^(t-2001)*0,01; ramalan mesti tepat sama aktual
    d, f = {}, 1000.0
    for t in range(2001, 2026):
        d[t], f = f * 0.01, f * 0.99
    b = {"id": "a", "hutan2000_ha": 1000.0, "hilang": th(d)}
    r, a, laju = ramal(b)
    assert abs(laju - 0.01) < 1e-12 and abs(r - a) < 1e-9 and abs(a - 1000 * 0.99 ** 19 * (1 - 0.99 ** 5)) < 1e-9, (r, a, laju)
    # kasus tangan: hutan 2000 ha, hilang 10 ha/th 2010–2019 saja, 40 ha/th 2020–2024
    b2 = {"id": "b", "hutan2000_ha": 2000.0, "hilang": th({**{t: 10 for t in range(2010, 2020)}, **{t: 40 for t in range(2020, 2025)}})}
    r, a, laju = ramal(b2)
    awal = sum(2000 - 10 * i for i in range(10))  # 19.550
    assert abs(laju - 100 / awal) < 1e-12 and a == 200
    assert abs(r - 1900 * (1 - (1 - laju) ** 5)) < 1e-9 and 0.24 < r / a < 0.25, r
    # pendorong 4 dikeluarkan dari laju & aktual, tapi hutan tetap berkurang
    b3 = json.loads(json.dumps(b2))
    for t in range(2010, 2025):
        b3["hilang"][str(t)]["pendorong"] = {"4": {"ha": b3["hilang"][str(t)]["ha"] / 2, "co2_t": 0}}
    r3, a3, l3 = ramal(b3, kecuali=("4",))
    assert a3 == 100 and abs(l3 - laju / 2) < 1e-12 and abs(r3 - 1900 * (1 - (1 - l3) ** 5)) < 1e-9
    # ringkasan: aktual nol tidak ikut rasio; kecil di bawah min_hutan disaring
    kecil = {"id": "c", "hutan2000_ha": 10.0, "hilang": th({})}
    nol = {"id": "d", "hutan2000_ha": 5000.0, "hilang": th({})}
    h = ujibalik({"baris": [b, b2, kecil, nol]}, 1000)["semua"]
    s = h["ringkas"]
    assert s["n"] == 3 and s["n_aktual_nol"] == 1 and [x["id"] for x in h["baris"]] == ["a", "b", "d"]
    assert s["dalam_25pct"] == 0.5 and s["dalam_50pct"] == 0.5 and abs(s["median_rasio"] - (1 + 0.245) / 2) < 0.01, s
    assert persentil([1, 2, 3, 4, 5], 0.25) == 2 and persentil([1, 2], 0.5) == 1.5
    print("ujibalik ok")


if __name__ == "__main__":
    if "--uji" in sys.argv:
        uji()
        sys.exit()
    a = argparse.ArgumentParser()
    a.add_argument("--masuk", default=os.path.join(AKAR, "data/raw/karbon/saring.json"))
    a.add_argument("--keluar", default=os.path.join(AKAR, "data/raw/karbon/ujibalik.json"))
    a.add_argument("--min-hutan", type=float, default=1000)
    o = a.parse_args()
    h = ujibalik(json.load(open(o.masuk)), o.min_hutan)
    json.dump(h, open(o.keluar, "w"), ensure_ascii=False, indent=1)
    for k in ("semua", "tanpa_kehutanan"):
        print(k, json.dumps(h[k]["ringkas"], ensure_ascii=False))
