"""Pasang modul sebaran ke public/index.html: cerita (Insight "Baca cerita"), 4 exhibit Insight, pilihan
"Model data (dilatih)" di Simulasi. Semua modul menambal objek yang ada (Insight, Sim), jadi index.html hanya
mendapat 1 baris CSS dan 4 baris skrip.

Tiap jangkar harus cocok TEPAT sekali; kalau satu saja tidak, tidak ada berkas yang ditulis (batal total).
Pemakaian:  python3 scripts/sebaran/splice_sebaran.py            # tulis
            python3 scripts/sebaran/splice_sebaran.py --cek      # hanya periksa jangkar
            python3 scripts/sebaran/splice_sebaran.py --akar DIR # folder public lain (uji)
            python3 scripts/sebaran/splice_sebaran.py --berkas _uji_sisip.html   # salinan index.html untuk uji
"""
import argparse
import pathlib
import sys

ATURAN = [
    ("css", '<link href="databaru.css" rel="stylesheet">',
     '<link href="databaru.css" rel="stylesheet">\n<link href="cerita_karhutla.css" rel="stylesheet">'),
    # sesudah sim_perlakuan.js: Insight & Sim sudah ada; urutan: evaluator -> cerita -> exhibit -> Simulasi
    ("skrip", '<script src="sim_perlakuan.js"></script>',
     '<script src="sim_perlakuan.js"></script>\n<script src="sebaran_model.js"></script>\n<script src="cerita_karhutla.js"></script>\n'
     '<script src="insight_sebaran.js"></script>\n<script src="sim_data.js"></script>'),
]
TANDA = '<script src="sebaran_model.js"></script>'


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--akar", default=str(pathlib.Path(__file__).resolve().parents[2] / "public"))
    ap.add_argument("--berkas", default="index.html")
    ap.add_argument("--cek", action="store_true")
    a = ap.parse_args()
    p = pathlib.Path(a.akar) / a.berkas
    teks = p.read_text(encoding="utf-8")
    galat = []
    if TANDA in teks:
        galat.append(f"{a.berkas}: sudah terpasang")
    for kunci, lama, baru in ATURAN:
        n = teks.count(lama)
        if n != 1:
            galat.append(f"{a.berkas}: jangkar '{kunci}' cocok {n} kali, harus 1: {lama[:70]!r}")
            continue
        teks = teks.replace(lama, baru)
    if galat:
        sys.exit("BATAL, tidak ada berkas yang ditulis:\n  " + "\n  ".join(galat))
    if a.cek:
        print("semua jangkar cocok tepat sekali")
        return
    p.write_text(teks, encoding="utf-8")
    print("ditulis", p)


if __name__ == "__main__":
    main()
