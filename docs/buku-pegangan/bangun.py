"""Bangun halaman artifact buku pegangan dari berkas Markdown.

Satu templat (`templat.html`) untuk semua buku: kepala, daftar isi lengket, kotak cari, isi Markdown
yang dirender di peramban. Jalankan: python3 docs/buku-pegangan/bangun.py
Keluaran: docs/buku-pegangan/terbit/<nama>.html, lalu diterbitkan lewat tool Artifact.
"""
import json
import pathlib

AKAR = pathlib.Path(__file__).parent
BUKU = [
    # nama berkas keluaran, sumber md, judul, label proyek, subjudul, aksen terang, aksen gelap
    ("pantau-bencana", "pantau-bencana.md", "Buku Pegangan Pantau Bencana", "Pantau Bencana",
     "Semua selera, keputusan, gerbang, dan armada yang berlaku di situs Pantau Bencana, di satu tempat.", "#1f3a68", "#8fb2ea"),
    ("rencana-multi-bencana", "../multi-bencana/_gabung.md", "Rencana Multi-Bencana", "Pantau Bencana",
     "Arsitektur, paket fitur, peta, model, copywriting, dan alur kerja untuk membawa semua bencana ke kelengkapan karhutla.", "#1f3a68", "#8fb2ea"),
    ("utama", "rujukan/utama.md", "Buku Pegangan Utama", "MBG · GR · BS · WI",
     "Satu pedoman utuh untuk membangun dan merawat sistem bisnis, dilebur dari MBG Bangka, Gemah Ripah, Betutu Sambe, dan Worth It.", "#171717", "#e4e4e7"),
    ("mbg-bangka", "rujukan/mbg-bangka.md", "Buku Pegangan Tim MBG Bangka", "MBG Bangka",
     "Selera Pinka, kanon deploy, dan kontrak kerja untuk semua yang menyentuh app MBG Bangka.", "#0b2545", "#8fb2ea"),
    ("gemah-ripah", "rujukan/gemah-ripah.md", "Buku Pegangan Gemah Ripah", "Gemah Ripah",
     "Selera dan keputusan pemilik yang berlaku di app Gemah Ripah, toko supplier telur, ayam, dan susu.", "#34471f", "#a7c47a"),
    ("betutu-sambe", "rujukan/betutu-sambe.md", "Buku Pegangan Betutu Sambe", "Betutu Sambe",
     "Selera dan keputusan pemilik yang berlaku di app Betutu Sambe, dapur pusat dan outlet ayam betutu Bali.", "#8a1c1f", "#e9a3a5"),
    ("worth-it", "rujukan/worth-it.md", "Buku Pegangan Worth It", "Worth It",
     "Keputusan pemilik, selera tampilan, gerbang, dan armada untuk penilai harga barang bekas dan properti.", "#0b2545", "#8fb2ea"),
]


def bangun(nama, sumber, judul, proyek, sub, aksen, aksen_gelap):
    md = (AKAR / sumber).read_text(encoding="utf-8")
    templat = (AKAR / "templat.html").read_text(encoding="utf-8")
    js = json.dumps(md, ensure_ascii=False).replace("</", "<\\/")
    kaki = f"Sumber: <code>docs/buku-pegangan/{sumber}</code> di repo poskokarhutla. Dibangun ulang dengan <code>python3 docs/buku-pegangan/bangun.py</code>."
    html = (templat.replace("__JUDUL__", judul).replace("__PROYEK__", proyek).replace("__SUB__", sub)
            .replace("__AKSEN_GELAP__", aksen_gelap).replace("__AKSEN__", aksen).replace("__KAKI__", kaki)
            .replace("__MD__", js))
    keluar = AKAR / "terbit" / f"{nama}.html"
    keluar.parent.mkdir(exist_ok=True)
    keluar.write_text(html, encoding="utf-8")
    return keluar, len(html)


if __name__ == "__main__":
    import sys
    pilih = set(sys.argv[1:])
    for b in BUKU:
        if pilih and b[0] not in pilih:
            continue
        if not (AKAR / b[1]).exists():
            print("lewati (sumber belum ada):", b[0])
            continue
        p, n = bangun(*b)
        print(f"{p.relative_to(AKAR)}  {n / 1024:.0f} KB")
