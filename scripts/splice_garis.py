"""Tambalan garis luar kompleks ke public/index.html (agen lain juga menyisip ke berkas ini, jadi lewat jangkar):
  1. Simulasi: benih cadangan "sel di dalam bentuk kompleks" membaca Polygon DAN MultiPolygon (garis luar organik
     dari scripts/data/garis_api.py bisa terpecah jadi beberapa bagian dan berlubang; aturan genap-ganjil atas semua cincin).
  2. Tab Metode: baris Bentuk / Luas indikatif dan keterbatasannya menjelaskan garis luar baru, bukan lambung cembung.

Tiap jangkar harus cocok PERSIS sekali; satu saja meleset = tidak ada yang ditulis. Sudah terpasang = dilewati.
Pakai:  python3 scripts/splice_garis.py [--cek] [--berkas public/index.html]
"""
import argparse
import pathlib
import sys

TANDA = "cincinK = !gK"
ATURAN = [
    ("sim benih multipolygon",
     """    if (!awal.size && this.f.geometry?.type === "Polygon") { const ring = this.f.geometry.coordinates[0];
      const dalam = (x, y) => { let c = false; for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) { const [xi, yi] = ring[i], [xj, yj] = ring[j];
        if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c; } return c; };""",
     """    const gK = this.f.geometry, cincinK = !gK ? [] : gK.type === "Polygon" ? gK.coordinates : gK.type === "MultiPolygon" ? gK.coordinates.flat() : [];
    if (!awal.size && cincinK.length) { /* genap-ganjil atas semua cincin: bagian terpisah dan lubang ikut benar */
      const dalam = (x, y) => { let c = false; for (const ring of cincinK) for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) { const [xi, yi] = ring[i], [xj, yj] = ring[j];
        if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c; } return c; };"""),
    ("metode luas",
     '["Luas indikatif", "jumlah sel ± 375 m berbeda selama 7 hari × 14,0625 ha (0,375 km × 0,375 km). Laci kompleks menampilkannya sebagai rentang 0,3–1,0 kali nilai itu"]',
     '["Luas indikatif", "luas garis luar kompleks (di bawah), lubang dikurangi. Sejak 14 Okt 2026; sebelumnya jumlah sel ± 375 m berbeda × 14,0625 ha. Deteksi di tepi sapuan kini dihitung selebar pikselnya (bisa ± 0,8 km), deteksi tunggal ± 0,84 sel. Laci kompleks menampilkannya sebagai rentang 0,3–1,0 kali nilai itu"]'),
    ("metode bentuk",
     '["Bentuk", "lambung cembung (monotone chain) bila ≥ 3 simpul dan status ≥ siaga; selain itu titik"]',
     '["Bentuk", "garis luar mengikuti deteksi (bila ≥ 3 titik berbeda dan status ≥ siaga; selain itu titik): tiap deteksi VIIRS diraster ke kisi 375 m selebar jejak pikselnya (scan × track FIRMS), celah satu sel ditutup (dilatasi lalu erosi satu sel), tiap komponen terhubung dikontur (marching squares), dihaluskan Chaikin dan disederhanakan 56 m. Api yang terpisah jadi beberapa bagian (MultiPolygon); lahan tak terbakar yang dikelilingi api jadi lubang"]'),
    ("metode batas",
     '"Lambung cembung memuat lahan yang tidak terbakar; luas indikatif bukan luas terbakar.',
     '"Garis luar adalah jejak piksel deteksi, bukan batas bekas terbakar: piksel 375 m memuat lahan yang tidak terbakar dan api kecil di bawah ambang tidak terdeteksi; luas indikatif bukan luas terbakar.'),
]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--cek", action="store_true")
    ap.add_argument("--berkas", default=str(pathlib.Path(__file__).resolve().parents[1] / "public/index.html"))
    a = ap.parse_args()
    p = pathlib.Path(a.berkas)
    s = p.read_text()
    if TANDA in s:
        print(f"{p}: sudah terpasang, dilewati")
        return
    salah = [f"{n}: {s.count(lama)} kemunculan, diharapkan 1" for n, lama, _ in ATURAN if s.count(lama) != 1]
    if salah:
        sys.exit("jangkar tidak cocok, tidak ada yang ditulis:\n  " + "\n  ".join(salah))
    if a.cek:
        print(f"{p}: {len(ATURAN)} jangkar cocok")
        return
    for _, lama, baru in ATURAN:
        s = s.replace(lama, baru)
    p.write_text(s)
    print(f"{p}: {len(ATURAN)} tambalan dipasang")


if __name__ == "__main__":
    main()
