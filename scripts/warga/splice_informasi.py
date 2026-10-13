"""Pasang tab "Informasi" (Lapor Warga) + titik panas 3 jam ke public/index.html dan public/banjir/index.html.

Tiap jangkar harus cocok TEPAT sekali; kalau satu saja tidak, tidak ada berkas yang ditulis (batal total).
Pemakaian:  python3 scripts/warga/splice_informasi.py            # tulis
            python3 scripts/warga/splice_informasi.py --cek      # hanya periksa jangkar
            python3 scripts/warga/splice_informasi.py --akar DIR # folder public lain (uji)
"""
import argparse
import pathlib
import sys

MENU_LAMA = 'Hujan, sungai, pasang laut, status kecamatan</small></a>'

KARHUTLA = [
    ("tab", '["peta", "Peta"], ["insight", "Insight"]',
     '["peta", "Peta"], ["informasi", "Informasi"], ["insight", "Insight"]'),
    ("bagian", '<section class="page scroll" id="p-berita" aria-label="Berita karhutla"><div class="wrap" id="berita"></div></section>',
     '<section class="page scroll" id="p-berita" aria-label="Berita karhutla"><div class="wrap" id="berita"></div></section>\n'
     '  <section class="page" id="p-informasi" aria-label="Lapor Warga"><div id="informasi"></div></section>'),
    ("kait", '    if (id === "berita") Berita.render();\n',
     '    if (id === "berita") Berita.render();\n    if (id === "informasi") window.Informasi?.render();\n'),
    ("css", '<link href="databaru.css" rel="stylesheet">',
     '<link href="databaru.css" rel="stylesheet">\n<link href="informasi.css" rel="stylesheet">'),
    ("skrip", '<script src="databaru.js" data-halaman="karhutla"></script>',
     '<script src="databaru.js" data-halaman="karhutla"></script>\n<script src="informasi.js" data-halaman="karhutla"></script>\n<script src="titik_live.js"></script>'),
    ("menu", MENU_LAMA,
     MENU_LAMA + '<a href="./warga/">Lapor Warga<small>Laporan warga: listrik, sinyal, BBM, bantuan</small></a>'),
]
BANJIR = [
    ("tab", '["peta", "Peta"], ["insight", "Insight"]',
     '["peta", "Peta"], ["informasi", "Informasi"], ["insight", "Insight"]'),
    ("bagian", '<section class="page scroll" id="p-insight" aria-label="Insight banjir"><div class="wrap" id="insight"></div></section>',
     '<section class="page scroll" id="p-insight" aria-label="Insight banjir"><div class="wrap" id="insight"></div></section>\n'
     '  <section class="page" id="p-informasi" aria-label="Lapor Warga"><div id="informasi"></div></section>'),
    ("kait", 'nanti(() => { if (id === "peta" && peta) peta.resize(); const f =',
     'nanti(() => { if (id === "peta" && peta) peta.resize(); if (id === "informasi") window.Informasi?.render(); const f ='),
    ("css", '<link href="../databaru.css" rel="stylesheet">',
     '<link href="../databaru.css" rel="stylesheet">\n<link href="../informasi.css" rel="stylesheet">'),
    ("skrip", '<script src="../databaru.js" data-halaman="banjir"></script>',
     '<script src="../databaru.js" data-halaman="banjir"></script>\n<script src="../informasi.js" data-halaman="banjir"></script>'),
    ("menu", MENU_LAMA,
     MENU_LAMA + '<a href="../warga/">Lapor Warga<small>Laporan warga: listrik, sinyal, BBM, bantuan</small></a>'),
]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--akar", default=str(pathlib.Path(__file__).resolve().parents[2] / "public"))
    ap.add_argument("--cek", action="store_true")
    a = ap.parse_args()
    akar = pathlib.Path(a.akar)
    hasil, galat = {}, []
    for nama, aturan in (("index.html", KARHUTLA), ("banjir/index.html", BANJIR)):
        p = akar / nama
        teks = p.read_text(encoding="utf-8")
        if '["informasi", "Informasi"]' in teks or 'id="p-informasi"' in teks:
            galat.append(f"{nama}: sudah terpasang (tab informasi sudah ada)")
            continue
        for kunci, lama, baru in aturan:
            n = teks.count(lama)
            if n != 1:
                galat.append(f"{nama}: jangkar '{kunci}' cocok {n} kali, harus 1: {lama[:70]!r}")
                continue
            teks = teks.replace(lama, baru)
        hasil[p] = teks
    if galat:
        sys.exit("BATAL, tidak ada berkas yang ditulis:\n  " + "\n  ".join(galat))
    if a.cek:
        print("semua jangkar cocok tepat sekali")
        return
    for p, teks in hasil.items():
        p.write_text(teks, encoding="utf-8")
        print("ditulis", p)


if __name__ == "__main__":
    main()
