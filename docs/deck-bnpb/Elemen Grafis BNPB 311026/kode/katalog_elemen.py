#!/usr/bin/env python3
"""Katalog pustaka elemen grafis BNPB (scripts/elemen.py): satu halaman per elemen, tiga varian warna, nama dan makna.

    .venv/bin/python scripts/katalog_elemen.py KELUAR.pptx [--akar assets/proyek-bnpb]
"""
import argparse
import sys
from pathlib import Path

SINI = Path(__file__).resolve().parent
sys.path.insert(0, str(SINI))
from deck import Deck, Kanvas, ke_pdf  # noqa: E402
import elemen  # noqa: E402

VARIAN = [('Oranye dan navy', ['oranye', 'navy']), ('Navy dan oranye', ['navy', 'oranye']), ('Navy dan abu-biru', ['navy', 'skala.netral.2']),
          ('Putih di atas foto', ['kertas', 'oranye'])]   # palet hiasan: tanpa biru lembaga (bertabrakan dengan biru data), tanpa merah


def main():
    a = argparse.ArgumentParser()
    a.add_argument('keluar')
    a.add_argument('--akar', default=str(SINI.parent / 'assets' / 'proyek-bnpb'))
    x = a.parse_args()
    spek = {'kajian': 'rehab', 'tanggal': '2026-10-31', 'pesan_kunci': 'Katalog elemen grafis', 'slide': []}
    d = Deck(spek, 'katalog-elemen', akar=x.akar, keluaran=Path(x.keluar).parent / '.deck-cache')
    T = d.T
    for nama, fn in elemen.ELEMEN.items():
        sl = d.prs.slides.add_slide(d.lay['PUTIH'])
        kv = Kanvas(d, sl)
        kv.teks(43.2, 36, 600, 34, [d.R(nama.replace('_', ' ').capitalize(), dict(T['judul_temuan'], warna='teks', ukuran_pt=24), tebal=True)], jangkar='m', bungkus=False)
        kv.teks(43.2, 72, 860, 22, [d.R(elemen.MAKNA[nama], dict(T['isi_panel'], warna='teks-2', ukuran_pt=13))], jangkar='m', bungkus=False)
        kv.garis(43.2, 104, 916.8, 104, 'skala.netral.3', 0.75)
        for i, (label, warna) in enumerate(VARIAN):
            bx = 43.2 + i * 220
            if warna[0] == 'kertas':   # contoh di atas foto
                kv.gambar(d.potong_foto('foto/huntap-aceh.jpg', 206, 300), bx, 124, 206, 300, 'foto')
            else:
                kv.bentuk('kotak', bx, 124, 206, 300, 'tint.netral.muda')
            fn(d, kv, bx + 23, 184, 160, 180, warna)
            kv.teks(bx, 434, 206, 18, [d.R(label, dict(T['label_tabel_utama'], warna='teks', ukuran_pt=11), tebal=True)], jangkar='m', bungkus=False)
        kv.teks(43.2, 470, 870, 40, [d.R('Pakai di spek slide mana pun: "hiasan": [{"jenis": "' + nama + '", "x": ..., "y": ..., "w": ..., "h": ..., "warna": ["oranye"]}]', dict(T['isi_tabel'], warna='teks-3', ukuran_pt=9))], jangkar='t')
    d.prs.save(x.keluar)
    print('ok', x.keluar, ke_pdf(Path(x.keluar)))


if __name__ == '__main__':
    main()
