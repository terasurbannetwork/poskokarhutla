"""Uji peta bahaya banjir InaRISK lawan kejadian banjir DIBI per kabupaten -> public/banjir/data/uji_inarisk.json

Pertanyaan (H1 usulan FIT Telkom University, "Penguatan InaRISK", Okt 2026): seberapa cocok peta bahaya banjir InaRISK
dengan kejadian banjir yang tercatat? Usulan itu baru menguji satu kejadian secara kualitatif. Di sini diuji dengan
semua kejadian DIBI 2008-2025 di semua kabupaten yang ada di dua sumber.

Data:
  X  = InaRISK banjir per kabupaten = persen luas kabupaten di zona sedang + tinggi (bahaya_kelas.json, dijumlah
       berbobot luas kecamatan). Pembanding X_lama = rata-rata nilai tertinggi 10 titik per kecamatan (bahaya.json).
  Y  = jumlah kejadian banjir + banjir bandang DIBI 2008-2025 per kabupaten (kejadian.json, kab x jenis x tahun).
  P  = penduduk kabupaten (jumlah kolom pend risiko_kecamatan.json, WorldPop 2026).
  Y_res = sisa log(1 + Y) sesudah regresi pada log P. Kabupaten padat lebih sering melapor, jadi Y_res
       menanyakan: di antara kabupaten yang sama padatnya, apakah yang zona bahayanya luas lebih sering banjir?

Ukuran: korelasi peringkat Spearman, selang kepercayaan 95% bootstrap 2.000 ulangan atas kabupaten (benih tetap).
Untuk dibandingkan dengan usulan juga dilaporkan presisi, recall, F1: "rawan" = X di kuartil atas, "sering" = Y_res di
kuartil atas.

Vonis DITULIS SEBELUM DATA DIBUKA (31 Okt 2026). Yang menentukan hanya X utama (zona sedang + tinggi):
  V1 selaras      : batas bawah CI95 rho(X, Y) > 0
  V2 di luar P    : batas bawah CI95 rho(X, Y_res) > 0
  V3 kelas > lama : batas bawah CI95 [rho(X, Y_res) - rho(X_lama, Y_res)] > 0   (bootstrap berpasangan)
  V4 stabil       : V2 berlaku di 2008-2016 DAN di 2017-2025 (masing-masing dengan Y_res periodenya)
Hasil ditulis apa adanya, termasuk bila gagal. Batas: DIBI dicatat per kabupaten, jadi uji per kecamatan atau
kelurahan belum mungkin; DIBI hanya kejadian yang dilaporkan, bukan semua genangan.

Pakai:  python3 scripts/banjir/uji_inarisk.py   |   python3 scripts/banjir/uji_inarisk.py uji
"""
import json, math, os, random, sys

AKAR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
DATA = os.path.join(AKAR, "public/banjir/data")
TAHUN = (2008, 2025)
PERIODE = ((2008, 2016), (2017, 2025))
JENIS = ("banjir", "bandang")
ULANG = 2000
BENIH = 20261031


def peringkat(xs):
    """Peringkat rata-rata untuk nilai seri (1..n)."""
    urut = sorted(range(len(xs)), key=lambda i: xs[i])
    r = [0.0] * len(xs)
    i = 0
    while i < len(urut):
        j = i
        while j + 1 < len(urut) and xs[urut[j + 1]] == xs[urut[i]]:
            j += 1
        for k in range(i, j + 1):
            r[urut[k]] = (i + j) / 2 + 1
        i = j + 1
    return r


def pearson(a, b):
    n = len(a)
    ma, mb = sum(a) / n, sum(b) / n
    sa = math.sqrt(sum((x - ma) ** 2 for x in a))
    sb = math.sqrt(sum((y - mb) ** 2 for y in b))
    return sum((x - ma) * (y - mb) for x, y in zip(a, b)) / (sa * sb) if sa and sb else 0.0


def spearman(a, b):
    return pearson(peringkat(a), peringkat(b))


def sisa(y, p):
    """Sisa regresi log(1 + y) pada log(p)."""
    ly, lp = [math.log1p(v) for v in y], [math.log(max(v, 1)) for v in p]
    n = len(ly)
    mx, my = sum(lp) / n, sum(ly) / n
    sxx = sum((x - mx) ** 2 for x in lp)
    b = sum((x - mx) * (v - my) for x, v in zip(lp, ly)) / sxx if sxx else 0.0
    return [v - (my + b * (x - mx)) for x, v in zip(lp, ly)]


def bootstrap(fungsi, n, ulang=ULANG, benih=BENIH):
    """fungsi(indeks) -> angka; -> (titik, batas bawah, batas atas) CI95 persentil."""
    rng = random.Random(benih)
    titik = fungsi(list(range(n)))
    vs = sorted(fungsi([rng.randrange(n) for _ in range(n)]) for _ in range(ulang))
    return [round(titik, 3), round(vs[int(.025 * ulang)], 3), round(vs[int(.975 * ulang) - 1], 3)]


def prf(x, y):
    """Presisi, recall, F1: positif = kuartil atas masing-masing deret."""
    ax, ay = sorted(x)[int(.75 * len(x))], sorted(y)[int(.75 * len(y))]
    tp = sum(1 for a, b in zip(x, y) if a >= ax and b >= ay)
    pp, ap = sum(1 for a in x if a >= ax), sum(1 for b in y if b >= ay)
    p, r = (tp / pp if pp else 0.0), (tp / ap if ap else 0.0)
    return {"presisi": round(p, 3), "recall": round(r, 3), "f1": round(2 * p * r / (p + r), 3) if p + r else 0.0,
            "acak": round(ap / len(y), 3)}


def susun(kelas, lama, kejadian, pend):
    """-> daftar kabupaten {kab, x, x_lama, p, y: {tahun: n}} yang ada di semua sumber."""
    kab = {}
    for k, v in kelas.items():
        kk = k.rsplit("|", 1)[0]
        a = kab.setdefault(kk, {"km2": 0.0, "zona": 0.0, "tinggi": 0.0, "lama": [], "p": 0})
        b = v.get("banjir", [0, 0, 0])
        a["km2"] += v["km2"]
        a["zona"] += (b[1] + b[2]) * v["km2"]
        a["tinggi"] += b[2] * v["km2"]
    for k, v in lama.items():
        kk = k.rsplit("|", 1)[0]
        if kk in kab:
            kab[kk]["lama"].append(v.get("banjir", 0.0))
    for k, n in pend.items():
        if k in kab:
            kab[k]["p"] += n
    out = []
    for kk, a in sorted(kab.items()):
        j = kejadian.get(kk)
        if not j or not a["km2"] or not a["lama"] or not a["p"]:
            continue
        y = {}
        for jenis in JENIS:
            for t, n in j.get(jenis, {}).items():
                if TAHUN[0] <= int(t) <= TAHUN[1]:
                    y[int(t)] = y.get(int(t), 0) + n
        out.append({"kab": kk, "x": a["zona"] / a["km2"], "x_tinggi": a["tinggi"] / a["km2"],
                    "x_lama": sum(a["lama"]) / len(a["lama"]), "p": a["p"], "y": y})
    return out


def nilai(rows):
    n = len(rows)
    X = [r["x"] for r in rows]
    XT = [r["x_tinggi"] for r in rows]
    XL = [r["x_lama"] for r in rows]
    P = [r["p"] for r in rows]

    def y_periode(a, b):
        return [sum(v for t, v in r["y"].items() if a <= t <= b) for r in rows]
    Y = y_periode(*TAHUN)
    YR = sisa(Y, P)
    pil = lambda d, idx: [d[i] for i in idx]

    def rho(a, b):
        return lambda idx: spearman(pil(a, idx), pil(b, idx))
    hasil = {
        "n_kab": n, "n_kejadian": sum(Y),
        "rho_x_y": bootstrap(rho(X, Y), n),
        "rho_x_yres": bootstrap(rho(X, YR), n),
        "rho_xlama_yres": bootstrap(rho(XL, YR), n),
        "selisih_x_xlama_yres": bootstrap(lambda idx: spearman(pil(X, idx), pil(YR, idx)) - spearman(pil(XL, idx), pil(YR, idx)), n),
        "rho_xtinggi_yres": bootstrap(rho(XT, YR), n),
        "rho_penduduk_y": bootstrap(rho(P, Y), n),
        "periode": {},
        "prf_x_yres": prf(X, YR),
        "prf_xlama_yres": prf(XL, YR),
    }
    for a, b in PERIODE:
        Yp = y_periode(a, b)
        hasil["periode"][f"{a}-{b}"] = {"n_kejadian": sum(Yp), "rho_x_yres": bootstrap(rho(X, sisa(Yp, P)), n)}
    v2p = [hasil["periode"][k]["rho_x_yres"][1] > 0 for k in hasil["periode"]]
    hasil["vonis"] = {
        "V1 selaras dengan kejadian": hasil["rho_x_y"][1] > 0,
        "V2 selaras di luar jumlah penduduk": hasil["rho_x_yres"][1] > 0,
        "V3 sebaran kelas lebih baik dari nilai tertinggi": hasil["selisih_x_xlama_yres"][1] > 0,
        "V4 stabil di dua periode": all(v2p),
    }
    return hasil


def muat():
    kelas = json.load(open(os.path.join(DATA, "bahaya_kelas.json")))["kec"]
    lama = json.load(open(os.path.join(DATA, "bahaya.json")))["kec"]
    kejadian = json.load(open(os.path.join(DATA, "kejadian.json")))["kab"]
    rk = json.load(open(os.path.join(DATA, "risiko_kecamatan.json")))
    ip, ik, ipd = rk["kolom"].index("prov"), rk["kolom"].index("kab"), rk["kolom"].index("pend")
    pend = {}
    for r in rk["kec"]:
        k = f"{r[ip]}|{r[ik]}"
        pend[k] = pend.get(k, 0) + (r[ipd] or 0)
    return kelas, lama, kejadian, pend


def main():
    rows = susun(*muat())
    h = nilai(rows)
    h.update({
        "dibuat": __import__("time").strftime("%Y-%m-%d"),
        "pertanyaan": "Apakah kabupaten dengan zona bahaya banjir InaRISK lebih luas lebih sering mengalami banjir tercatat?",
        "x": "persen luas kabupaten di zona bahaya banjir InaRISK sedang + tinggi",
        "y": f"kejadian banjir + banjir bandang DIBI {TAHUN[0]}-{TAHUN[1]} per kabupaten",
        "y_res": "sisa log(1 + kejadian) sesudah regresi pada log penduduk",
        "ci": f"selang 95% bootstrap {ULANG} ulangan atas kabupaten; format [titik, bawah, atas]",
        "batas": ["DIBI dicatat per kabupaten: uji per kecamatan atau kelurahan belum mungkin.",
                  "DIBI hanya kejadian yang dilaporkan; banjir kecil di daerah sepi bisa tidak tercatat.",
                  "Korelasi antar kabupaten, bukan ketepatan batas zona di lapangan."],
    })
    with open(os.path.join(DATA, "uji_inarisk.json"), "w") as f:
        json.dump(h, f, ensure_ascii=False, indent=1)
    print(json.dumps(h, ensure_ascii=False, indent=1))


def uji():
    assert peringkat([10, 20, 20, 30]) == [1, 2.5, 2.5, 4]
    assert abs(spearman([1, 2, 3, 4], [10, 20, 30, 40]) - 1) < 1e-12
    assert abs(spearman([1, 2, 3, 4], [4, 3, 2, 1]) + 1) < 1e-12
    # y sebanding p persis -> sisa nol semua
    assert all(abs(v) < 1e-9 for v in sisa([math.e ** 2 - 1, math.e ** 3 - 1], [math.e ** 2, math.e ** 3]))
    # deret selaras sempurna: CI bootstrap menempel di 1
    t, lo, hi = bootstrap(lambda idx: spearman([i for i in idx], [2 * i for i in idx]) if len(set(idx)) > 1 else 1.0, 30, ulang=200)
    assert t == 1 and lo == 1 and hi == 1
    p = prf([1, 2, 3, 4, 5, 6, 7, 8], [1, 2, 3, 4, 5, 6, 7, 8])
    assert p["presisi"] == 1 and p["recall"] == 1 and p["acak"] == .25
    kelas = {"11|A|a": {"km2": 10, "banjir": [0, 20, 30]}, "11|A|b": {"km2": 30}}
    rows = susun(kelas, {"11|A|a": {"banjir": .8}, "11|A|b": {"banjir": 0}},
                 {"11|A": {"banjir": {"2010": 3, "2030": 9}, "bandang": {"2020": 1}}}, {"11|A": 1000})
    assert len(rows) == 1 and abs(rows[0]["x"] - 12.5) < 1e-9 and rows[0]["y"] == {2010: 3, 2020: 1} and rows[0]["x_lama"] == .4
    print("ok uji_inarisk")


if __name__ == "__main__":
    uji() if sys.argv[1:] == ["uji"] else main()
