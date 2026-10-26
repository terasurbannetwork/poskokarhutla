"""Pasang i18n (EN / ID) ke halaman lewat jangkar, bukan sunting langsung (agen/sesi lain juga menyisip ke berkas yang sama):
  - <script src="i18n.js"> paling awal di <head> (sinkron: tambalan locale harus berlaku sebelum skrip lain jalan)
  - <link rel="alternate" hreflang> id / en / x-default
Tombol "EN / ID" tidak disisip ke HTML: i18n.js memasangnya sendiri di `header .stat` (atau melayang di kanan atas bila tak ada header).

Tiap jangkar harus cocok PERSIS satu kali; satu saja meleset = berkas itu tidak ditulis. Sudah terpasang = dilewati.
Halaman lain (tentang, statistik, …) cukup menambah satu baris di <head>:  <script src="/i18n.js"></script>
Pakai:  python3 scripts/i18n/splice_i18n.py [--cek]
"""
import argparse
import pathlib
import sys

AKAR = pathlib.Path(__file__).resolve().parents[2]
SITUS = "https://centurisk97.id"
TANDA = "i18n.js"


def blok(js, jalur):
    return (f'<script src="{js}"></script>\n'
            f'<link rel="alternate" hreflang="id" href="{SITUS}{jalur}">\n'
            f'<link rel="alternate" hreflang="en" href="{SITUS}{jalur}?lang=en">\n'
            f'<link rel="alternate" hreflang="x-default" href="{SITUS}{jalur}">\n')


# (berkas, jangkar, sisipan ditaruh SESUDAH jangkar)
ATURAN = [
    ("public/index.html", '<base href="/">\n', blok("i18n.js", "/")),
    ("public/banjir/index.html", '<link rel="icon" href="../img/logo.svg?v=2" type="image/svg+xml">\n', blok("../i18n.js", "/banjir/")),
    ("public/privasi.html", "<title>", None),
]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--cek", action="store_true")
    a = ap.parse_args()
    gagal = False
    for berkas, jangkar, sisip in ATURAN:
        p = AKAR / berkas
        if not p.exists():
            print(f"{berkas}: tidak ada, dilewati")
            continue
        s = p.read_text()   # dibaca ulang tepat sebelum menulis
        if TANDA in s:
            print(f"{berkas}: sudah terpasang, dilewati")
            continue
        n = s.count(jangkar)
        if n != 1:
            print(f"{berkas}: jangkar {jangkar!r} {n} kemunculan, diharapkan 1 — TIDAK ditulis")
            gagal = True
            continue
        if sisip is None:   # halaman sederhana: skrip saja, sebelum <title>
            sisip, jangkar_baru = '<script src="/i18n.js"></script>\n', jangkar
            baru = s.replace(jangkar, sisip + jangkar_baru, 1)
        else:
            baru = s.replace(jangkar, jangkar + sisip, 1)
        if a.cek:
            print(f"{berkas}: jangkar cocok")
            continue
        p.write_text(baru)
        print(f"{berkas}: terpasang")
    sys.exit(1 if gagal else 0)


if __name__ == "__main__":
    main()
