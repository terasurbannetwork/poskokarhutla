"""Kalibrasi ambang kecocokan wajah dari pasangan skor yang sudah disahkan peninjau (LP-025, ALGORITMA §3, U-20).

Masukan CSV dengan kolom: skor (kemiripan kosinus 0..1), sama (1 = orang sama, 0 = orang berbeda).
Keluaran: ambang terkecil dengan salah terima (FAR) <= target (bawaan 0,1%), beserta salah tolak (FRR) di ambang itu.
Pakai: python3 scripts/lapangan/kalibrasi.py pasangan.csv [--far 0.001]      Uji: --uji
Kerangka: hasil dibaca manusia lalu masuk KEPUTUSAN-LAPANGAN; skrip ini tidak mengubah konstanta apa pun.
"""
import csv
import sys

MIN_SAMA = 200   # ALGORITMA §3: 200 pasangan sah pertama


def baca(jalur):
    sama, beda = [], []
    with open(jalur, newline="", encoding="utf-8") as f:
        for b in csv.DictReader(f):
            try:
                s, y = float(b["skor"]), str(b["sama"]).strip()
            except (KeyError, TypeError, ValueError):
                continue
            if y in ("1", "0") and 0 <= s <= 1:
                (sama if y == "1" else beda).append(s)
    return sama, beda


def far_frr(sama, beda, t):
    far = sum(s >= t for s in beda) / len(beda)
    frr = sum(s < t for s in sama) / len(sama)
    return far, frr


def pilih_ambang(sama, beda, far_maks=0.001):
    """Ambang terkecil (=> FRR terkecil) dengan FAR <= far_maks. -> dict atau None bila kedua kelompok belum ada."""
    if not sama or not beda:
        return None
    kandidat = sorted(set(sama + beda))
    kandidat.append(max(kandidat) + 1e-9)   # ambang di atas semua skor: FAR 0
    for t in kandidat:
        far, frr = far_frr(sama, beda, t)
        if far <= far_maks:
            return {"ambang": round(t, 4), "far": far, "frr": frr, "n_sama": len(sama), "n_beda": len(beda), "cukup": len(sama) >= MIN_SAMA}
    return None


def uji():
    sama = [0.7 + i / 1000 for i in range(250)]                  # 0,700..0,949
    beda = [0.2 + i / 1000 for i in range(250)] + [0.72]         # satu pasangan beda orang bernilai tinggi
    r = pilih_ambang(sama, beda, 0.001)
    assert r["ambang"] > 0.72 and r["far"] == 0 and 0 < r["frr"] < 0.2 and r["cukup"], r
    r2 = pilih_ambang(sama, beda, 0.01)                          # 1/251 = 0,4% <= 1%: ambang boleh turun ke 0,72
    assert r2["ambang"] <= 0.72 and r2["frr"] < r["frr"], (r, r2)
    assert pilih_ambang([], beda) is None and pilih_ambang(sama, []) is None
    assert pilih_ambang(sama[:10], beda)["cukup"] is False
    import os, tempfile
    with tempfile.TemporaryDirectory() as d:
        j = os.path.join(d, "p.csv")
        open(j, "w", encoding="utf-8").write("skor,sama\n0.8,1\n0.3,0\nabc,1\n1.5,0\n0.5,2\n0.9,1\n")
        assert baca(j) == ([0.8, 0.9], [0.3])
    print("kalibrasi: uji lulus")
    return 0


def main(argv):
    if "--uji" in argv:
        return uji()
    far = float(argv[argv.index("--far") + 1]) if "--far" in argv else 0.001
    jalur = [a for i, a in enumerate(argv) if not a.startswith("--") and (i == 0 or argv[i - 1] != "--far")]
    if not jalur:
        print(__doc__); return 2
    sama, beda = baca(jalur[0])
    r = pilih_ambang(sama, beda, far)
    if not r:
        print(f"kalibrasi: data belum cukup ({len(sama)} sama, {len(beda)} beda) atau tak ada ambang dengan FAR <= {far}"); return 1
    print(f"AMBANG_LOLOS usulan {r['ambang']}  FAR {r['far']:.4%}  FRR {r['frr']:.4%}  ({r['n_sama']} sama, {r['n_beda']} beda)" + ("" if r["cukup"] else f"  PERINGATAN: kurang dari {MIN_SAMA} pasangan sah"))
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
