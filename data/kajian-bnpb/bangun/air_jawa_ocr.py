#!/usr/bin/env python3
"""OCR lampiran Permen PUPR 14/PRT/M/2015 (Berita Negara 2015 No. 638, 590 hlm; hlm 13-590 pindaian) untuk paket `air-jawa`.

Jalankan dari akar repo (sekali; hasilnya disimpan, bangun utama membaca teks simpanan secara luring):
  python3 data/kajian-bnpb/bangun/air_jawa_ocr.py [hlm_awal hlm_akhir]
Butuh pdftoppm (poppler) dan tesseract 5 + bahasa `ind` di PATH. Tidak ada dependensi Python di luar stdlib.
Garis tabel dihapus dulu (deret/kolom piksel gelap bersambung panjang), lalu halaman dua-tabel dibelah di garis ganda tengah
supaya urutan baca kiri-atas-ke-bawah lalu kanan. Keluaran: data/kajian-bnpb/data/air-jawa/mentah/permen14_ocr/pNNN.txt
"""
import concurrent.futures as cf, os, subprocess, sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", ".."))
PDF = os.path.join(ROOT, "data/kajian-bnpb/riset/mentah/bn638.pdf")
OUT = os.path.join(ROOT, "data/kajian-bnpb/data/air-jawa/mentah/permen14_ocr")
DPI = 300
TANPA_BELAH = {13, 29, 63, 28, 60}   # rekap per provinsi (tabel lebar) + hlm 28/60 (tabel pendek pompa/tambak) yang salah terdeteksi dua-tabel
GELAP = bytes(1 if b < 160 else 0 for b in range(256))


def versi_mesin():
    t = subprocess.run(["tesseract", "--version"], capture_output=True, text=True).stdout.split("\n")[0].strip()
    p = subprocess.run(["pdftoppm", "-v"], capture_output=True, text=True).stderr.split("\n")[0].strip()
    return f"#mesin {t}; {p}; lang ind; psm 6; dpi {DPI}\n"


def pgm(hlm):
    raw = subprocess.run(["pdftoppm", "-f", str(hlm), "-l", str(hlm), "-r", str(DPI), "-gray", PDF], capture_output=True, check=True).stdout
    p5, wh, mx, data = raw.split(b"\n", 3)
    assert p5 == b"P5" and mx == b"255"
    w, h = map(int, wh.split())
    return w, h, bytearray(data[: w * h])


def run_terpanjang(b):
    return max(len(x) for x in b.split(b"\x00"))


def kelompok(xs):
    out = []
    for x in xs:
        if out and x - out[-1][-1] <= 3:
            out[-1].append(x)
        else:
            out.append([x])
    return [(g[0], g[-1]) for g in out]


def bersihkan(w, h, ba):
    """Hapus garis tabel. Kembalikan kelompok kolom garis vertikal (untuk deteksi tata letak)."""
    t = bytes(ba).translate(GELAP)
    baris = [r for r in range(h) if run_terpanjang(t[r * w:(r + 1) * w]) > 0.035 * w]   # 0,035 w: garis bawah subtotal ikut terhapus
    kolom = [c for c in range(w) if run_terpanjang(t[c::w]) > 0.06 * h]
    for r in baris:
        for rr in (r - 1, r, r + 1):
            if 0 <= rr < h:
                ba[rr * w:(rr + 1) * w] = b"\xff" * w
    for c in kolom:
        for cc in (c - 1, c, c + 1):
            if 0 <= cc < w:
                ba[cc::w] = b"\xff" * len(range(cc, w * h, w))
    return kelompok(kolom)


def belah(w, kol):
    """Halaman dua-tabel: >= 9 garis vertikal dan dua garis berdekatan (< 4% lebar) di 40-55% lebar (batas kanan tabel kiri
    dan batas kiri tabel kanan). Satu-tabel (Lampiran I/II, air tanah) punya 6-7 garis. Kembalikan x belah atau None."""
    if len(kol) < 9:
        return None
    tengah = [(a + b) / 2 for a, b in kol if 0.40 * w < (a + b) / 2 < 0.55 * w]
    for x1, x2 in zip(tengah, tengah[1:]):
        if x2 - x1 < 0.04 * w:
            return int((x1 + x2) / 2)
    return None


def ocr(w, h, ba, x0, x1, tmp):
    lebar = x1 - x0
    isi = b"".join(bytes(ba[r * w + x0:r * w + x1]) for r in range(h))
    with open(tmp, "wb") as f:
        f.write(b"P5\n%d %d\n255\n" % (lebar, h) + isi)
    r = subprocess.run(["tesseract", tmp, "stdout", "-l", "ind", "--psm", "6"], capture_output=True, text=True, check=True).stdout
    os.remove(tmp)
    return r


def satu(hlm):
    w, h, ba = pgm(hlm)
    kol = bersihkan(w, h, ba)
    x = None if hlm in TANPA_BELAH else belah(w, kol)
    tmp = os.path.join(OUT, f".tmp{hlm}.pgm")
    if x:
        teks = MESIN + f"#TATA_LETAK dua-tabel belah_x={x} lebar={w}\n#KIRI\n" + ocr(w, h, ba, 0, x, tmp) + "#KANAN\n" + ocr(w, h, ba, x, w, tmp)
    else:
        teks = MESIN + f"#TATA_LETAK satu-tabel lebar={w}\n" + ocr(w, h, ba, 0, w, tmp)
    with open(os.path.join(OUT, f"p{hlm:03d}.txt"), "w", encoding="utf-8") as f:
        f.write(teks)
    return hlm, bool(x)


MESIN = versi_mesin() if __name__ == "__main__" else ""

if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    a, b = (int(sys.argv[1]), int(sys.argv[2])) if len(sys.argv) == 3 else (13, 590)
    todo = [p for p in range(a, b + 1) if not os.path.exists(os.path.join(OUT, f"p{p:03d}.txt"))]
    with cf.ThreadPoolExecutor(max_workers=max(1, (os.cpu_count() or 2) - 1)) as ex:
        for hlm, dua in ex.map(satu, todo):
            print(f"hlm {hlm}: {'dua-tabel' if dua else 'satu-tabel'}", flush=True)
    print(f"selesai: {len(todo)} halaman")
