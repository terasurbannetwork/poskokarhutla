"""MB-4 Skor prioritas daerah (ALGORITMA.md sec 5.2; DESAIN-TEKNIS sec 4.4).

Pustaka murni, tidak menulis berkas, bukan langkah jalan.py.
Rumus tunggal: rata-rata geometrik berbobot dari persentil, tanpa mode jumlah berbobot.

  q = maks(p, 0,01)  komponen persentil       q = v  komponen mutlak
  S = prod q_j ^ (w_j / W)  atas komponen yang punya nilai untuk kab itu
  S = None ("data kurang") bila W < 0,5 x jumlah semua bobot

Komponen: komponen[j] adalah salah satu dari
  {"tipe": "persentil", "nilai": {kab: x}, "arah": +1 | -1}   persentil dihitung di sini
  {"tipe": "persentil", "p": {kab: p}}                         persentil sudah jadi (fixture)
  {"tipe": "mutlak",    "v": {kab: v}}                         v di [0, 1], 0 berarti nol

Uji: python3 -I scripts/bnpb/unit/skor.py --cek
"""
import math
import random
import sys

LANTAI = 0.01
LABEL = "Asumsi: bobot sementara"


def persentil(nilai_per_kab, arah=1):
    """{kab: p} di [0, 1]; p = peringkat 0-based / (n-1), seri = rata-rata peringkat.
    Nilai None dilewati. n < 2: komponen dianggap tidak ada -> {}."""
    if arah not in (1, -1):
        raise ValueError(f"arah harus +1 atau -1, dapat {arah!r}")
    ada = {k: v for k, v in nilai_per_kab.items() if v is not None}
    for k, v in ada.items():
        if isinstance(v, bool) or not isinstance(v, (int, float)) or not math.isfinite(v):
            raise ValueError(f"nilai kab {k}: {v!r} bukan angka hingga")
    n = len(ada)
    if n < 2:
        return {}
    urut = sorted(ada.items(), key=lambda kv: kv[1])
    p, i = {}, 0
    while i < n:
        j = i
        while j + 1 < n and urut[j + 1][1] == urut[i][1]:
            j += 1
        pr = ((i + j) / 2) / (n - 1)
        for m in range(i, j + 1):
            p[urut[m][0]] = pr if arah == 1 else 1 - pr
        i = j + 1
    return p


def _angka(j, k, x, nama):
    if isinstance(x, bool) or not isinstance(x, (int, float)) or not math.isfinite(x) or not 0 <= x <= 1:
        raise ValueError(f"komponen {j} kab {k}: {nama}={x!r} harus angka hingga di [0, 1]")
    return x


def _siap(komponen):
    """Per komponen -> (tipe, {kab: nilai_asli}, {kab: p atau v})."""
    out = {}
    for j, c in komponen.items():
        tipe = c.get("tipe")
        if tipe == "mutlak":
            v = {k: _angka(j, k, x, "v") for k, x in c["v"].items() if x is not None}
            out[j] = (tipe, v, v)
        elif tipe == "persentil":
            if "p" in c:
                p = {k: _angka(j, k, x, "p") for k, x in c["p"].items() if x is not None}
                out[j] = (tipe, p, p)
            else:
                out[j] = (tipe, c["nilai"], persentil(c["nilai"], c.get("arah", 1)))
        else:
            raise ValueError(f"komponen {j}: tipe {tipe!r} bukan persentil/mutlak")
    return out


def skor(komponen, bobot=None):
    """{kab: {skor, rinci, hilang, bobot, label, catatan}}. bobot None = sama rata."""
    if bobot is None:
        bobot = {j: 1 for j in komponen}
    # bobot = daftar komponen sistem; komponen yang tidak dikirim dihitung hilang untuk semua kab
    for j in bobot:
        if not bobot[j] > 0:
            raise ValueError(f"bobot komponen {j} harus > 0, dapat {bobot[j]!r}")
    for j in komponen:
        if j not in bobot:
            raise ValueError(f"komponen {j} tanpa bobot")
    total = sum(bobot.values())
    siap = _siap(komponen)
    kabs = sorted({k for _, _, q in siap.values() for k in q})
    hasil = {}
    for k in kabs:
        ada = [j for j in komponen if k in siap[j][2]]
        hilang = [j for j in bobot if j not in ada]
        W = sum(bobot[j] for j in ada)
        rinci, s, kunci = {}, None, "ok"
        for j in ada:
            tipe, asli, pv = siap[j]
            q = max(pv[k], LANTAI) if tipe == "persentil" else pv[k]
            rinci[j] = {"nilai_asli": asli.get(k), ("p" if tipe == "persentil" else "v"): pv[k],
                        "q": q, "w": bobot[j]}
        if W < 0.5 * total - 1e-12:
            kunci = "data kurang"
        elif any(r["q"] == 0 for r in rinci.values()):
            s = 0.0
        else:
            s = math.exp(sum(r["w"] * math.log(r["q"]) for r in rinci.values()) / W)
        hasil[k] = {"skor": s, "rinci": rinci, "hilang": hilang,
                    "bobot": {j: bobot[j] / W for j in ada} if W else {},
                    "label": LABEL, "catatan": kunci}
    return hasil


def urut(hasil):
    """Kode kab menurut S menurun, S sama menurut kode menaik, null di akhir."""
    return sorted(hasil, key=lambda k: (hasil[k]["skor"] is None, -(hasil[k]["skor"] or 0), k))


# ---------------------------------------------------------------- self-check
def _hit(komponen, bobot=None, kab="a"):
    return skor(komponen, bobot)[kab]


def _pers(*ps):
    return {f"c{i}": {"tipe": "persentil", "p": {"a": p}} for i, p in enumerate(ps) if p is not None}


def _dekat(a, b, tol=5e-6):
    assert a is not None and abs(a - b) <= tol, f"dapat {a}, harap {b}"


def cek():
    # A1 sampai A3
    r = _hit(_pers(0.9, 0.5, 0.7, 0.1))
    _dekat(r["skor"], 0.42129)
    assert r["label"] == LABEL
    bobot4 = {f"c{i}": 1 for i in range(4)}
    k = _pers(0.9, 0.5, 0.7)
    k["c3"] = {"tipe": "persentil", "p": {"b": 0.5}}  # komponen ada, tapi bukan untuk kab "a"
    r = _hit(k, bobot4)
    _dekat(r["skor"], 0.68041)
    assert r["hilang"] == ["c3"], r["hilang"]
    r = _hit(_pers(0.9, 0.5, 0.7, 0.0))
    _dekat(r["skor"], 0.23691)
    assert r["rinci"]["c3"]["q"] == 0.01
    # A4 mutlak nol
    k = _pers(0.9, 0.5, 0.7)
    k["c3"] = {"tipe": "mutlak", "v": {"a": 0}}
    assert _hit(k)["skor"] == 0
    # A5, A6 (DIK-1)
    k = {"risiko": {"tipe": "persentil", "p": {"a": 0.8}}, "celah_kapasitas": {"tipe": "persentil", "p": {"a": 0.7}},
         "kejadian": {"tipe": "persentil", "p": {"a": 0.5}}, "celah_layanan": {"tipe": "mutlak", "v": {"a": 0.6}}}
    _dekat(_hit(k)["skor"], 0.64022)
    b4 = {j: 1 for j in k}
    k6 = {j: c for j, c in k.items() if j != "celah_layanan"}
    r = _hit(k6, b4)
    _dekat(r["skor"], 0.65421)
    assert r["hilang"] == ["celah_layanan"]
    # A7 bobot
    r = _hit(_pers(0.9, 0.5, 0.1), {"c0": 2, "c1": 1, "c2": 1})
    _dekat(r["skor"], 0.44860)
    assert [r["bobot"][j] for j in ("c0", "c1", "c2")] == [0.5, 0.25, 0.25]
    # A8 data kurang: 4 komponen, hanya 1 ada
    r = skor({**_pers(0.9), "c1": {"tipe": "persentil", "p": {"b": 0.5}},
                                                      "c2": {"tipe": "persentil", "p": {"b": 0.5}},
                                                      "c3": {"tipe": "persentil", "p": {"b": 0.5}}}, bobot4)["a"]
    assert r["skor"] is None and r["catatan"] == "data kurang"
    urutan = urut({"x": {"skor": None}, "y": {"skor": 0.0}, "z": {"skor": 0.2}})
    assert urutan == ["z", "y", "x"], urutan  # null bukan 0
    # A9 persentil seri
    p = persentil({"a": 10, "b": 20, "c": 20, "d": 40})
    assert [p[k] for k in "abcd"] == [0, 0.5, 0.5, 1], p
    pm = persentil({"a": 10, "b": 20, "c": 20, "d": 40}, -1)
    assert [pm[k] for k in "abcd"] == [1, 0.5, 0.5, 0], pm
    assert persentil({"a": 5}) == {} and persentil({"a": 5, "b": None}) == {}
    # A10 PLP-2 biner
    k = _pers(0.9, 0.5, 0.7)
    k["c3"] = {"tipe": "mutlak", "v": {"a": 0.5}}
    _dekat(_hit(k)["skor"], 0.62997)
    k["c3"] = {"tipe": "mutlak", "v": {"a": 1.0}}
    _dekat(_hit(k)["skor"], 0.74917)
    # invarian: bobot ternormal 1; urutan stabil; ditolak bila salah
    r = _hit(_pers(0.3, 0.6, 0.9), {"c0": 3, "c1": 1, "c2": 2})
    assert abs(sum(r["bobot"].values()) - 1) < 1e-9
    h = skor({"c": {"tipe": "persentil", "p": {"k2": 0.5, "k1": 0.5, "k3": 0.9}}})
    assert urut(h) == ["k3", "k1", "k2"], urut(h)
    for salah in (lambda: skor({"c": {"tipe": "mutlak", "v": {"a": 1.5}}}),
                  lambda: skor({"c": {"tipe": "persentil", "p": {"a": 0.5}}}, {"c": 0}),
                  lambda: skor({"c": {"tipe": "persentil", "p": {"a": 0.5}}}, {"d": 1}),
                  lambda: skor({"c": {"tipe": "jumlah", "v": {"a": 0.5}}}),
                  lambda: persentil({"a": 1, "b": 2}, 0),
                  lambda: skor({"c": {"tipe": "persentil", "p": {"a": 1.2}}}),
                  lambda: skor({"c": {"tipe": "persentil", "p": {"a": -0.1}}}),
                  lambda: skor({"c": {"tipe": "persentil", "p": {"a": float("nan")}}}),
                  lambda: skor({"c": {"tipe": "mutlak", "v": {"a": float("inf")}}}),
                  lambda: persentil({"a": 1, "b": float("nan")})):
        try:
            salah()
        except ValueError:
            continue
        raise AssertionError("masukan salah tidak ditolak")
    # monoton: 500 pasangan acak berbenih; S di [0, 1]
    rng = random.Random(20261105)
    for _ in range(500):
        n = rng.randint(2, 5)
        ps = [rng.random() for _ in range(n)]
        w = {f"c{i}": rng.choice((1, 2, 3)) for i in range(n)}
        mut = rng.randrange(n)
        k1 = {f"c{i}": ({"tipe": "mutlak", "v": {"a": ps[i]}} if i == mut else {"tipe": "persentil", "p": {"a": ps[i]}})
              for i in range(n)}
        s1 = skor(k1, w)["a"]["skor"]
        j = rng.randrange(n)
        ps2 = list(ps)
        ps2[j] = min(1.0, ps[j] + rng.random() * 0.5)
        k2 = {f"c{i}": ({"tipe": "mutlak", "v": {"a": ps2[i]}} if i == mut else {"tipe": "persentil", "p": {"a": ps2[i]}})
              for i in range(n)}
        s2 = skor(k2, w)["a"]["skor"]
        assert 0 <= s1 <= 1 and s2 >= s1 - 1e-12, f"tidak monoton: {s1} -> {s2} (komponen c{j}, p {ps[j]} -> {ps2[j]})"
    print("skor.py --cek: lulus")


if __name__ == "__main__":
    if "--cek" in sys.argv:
        cek()
    else:
        print(__doc__)
