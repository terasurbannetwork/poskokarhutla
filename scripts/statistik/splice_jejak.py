"""Pasang persetujuan (persetujuan.js, dimuat lebih dulu), statistik anonim (jejak.js), dan dialog "Kirim pesan" (pesan.js).

Tiap jangkar harus cocok TEPAT sekali; kalau satu saja tidak, tidak ada berkas yang ditulis (batal total).
Pemakaian:  python3 scripts/statistik/splice_jejak.py            # tulis
            python3 scripts/statistik/splice_jejak.py --cek      # hanya periksa jangkar
            python3 scripts/statistik/splice_jejak.py --akar DIR # folder public lain (uji)
"""
import argparse
import pathlib
import sys

# halaman tanpa analitik halaman (Tentang, Privasi): hanya spanduk persetujuan + tautan "Pengaturan privasi". Disisip SEBELUM jangkar.
SEBELUM = {
    "tentang.html": ('<script src="/pesan.js" defer></script>', '<script src="/persetujuan.js" defer></script>\n<script src="/jejak.js" data-halaman="tentang" defer></script>\n'),
    "privasi.html": ('</body>', '<script src="/persetujuan.js" defer></script>\n<script src="/jejak.js" data-halaman="privasi" defer></script>\n'),
}

ATURAN = {
    "index.html": ('<script src="bagikan.js" data-halaman="karhutla" defer></script>',
                   '\n<script src="persetujuan.js" defer></script>\n<script src="jejak.js" data-halaman="karhutla" defer></script>\n<script src="pesan.js" defer></script>'),
    "banjir/index.html": ('<script src="../informasi.js" data-halaman="banjir"></script>',
                          '\n<script src="../persetujuan.js" defer></script>\n<script src="../jejak.js" data-halaman="banjir" defer></script>\n<script src="../pesan.js" defer></script>'),
    "warga/index.html": ('<script src="../informasi.js" data-halaman="warga"></script>',
                         '\n<script src="../persetujuan.js" defer></script>\n<script src="../jejak.js" data-halaman="warga" defer></script>'),
}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--akar", default=str(pathlib.Path(__file__).resolve().parents[2] / "public"))
    ap.add_argument("--cek", action="store_true")
    a = ap.parse_args()
    akar = pathlib.Path(a.akar)
    hasil, galat = {}, []
    for nama, (jangkar, tambah) in ATURAN.items():
        p = akar / nama
        teks = p.read_text(encoding="utf-8")
        if "jejak.js" in teks:
            continue   # sudah terpasang
        n = teks.count(jangkar)
        if n != 1:
            galat.append(f"{nama}: jangkar cocok {n} kali, harus 1: {jangkar[:70]!r}")
            continue
        hasil[p] = teks.replace(jangkar, jangkar + tambah)
    for nama, (jangkar, tambah) in SEBELUM.items():
        p = akar / nama
        if not p.exists():
            continue
        teks = hasil.get(p) or p.read_text(encoding="utf-8")
        if "jejak.js" in teks:
            continue
        if "persetujuan.js" in teks:   # versi lama sisipan (persetujuan saja): tambahkan jejak.js tepat sesudahnya
            jangkar, tambah = '<script src="/persetujuan.js" defer></script>\n', tambah.split("\n", 1)[1]
            n = teks.count(jangkar)
            if n != 1:
                galat.append(f"{nama}: jangkar persetujuan cocok {n} kali, harus 1")
                continue
            hasil[p] = teks.replace(jangkar, jangkar + tambah)
            continue
        n = teks.count(jangkar)
        if n != 1:
            galat.append(f"{nama}: jangkar cocok {n} kali, harus 1: {jangkar[:70]!r}")
            continue
        hasil[p] = teks.replace(jangkar, tambah + jangkar)
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
