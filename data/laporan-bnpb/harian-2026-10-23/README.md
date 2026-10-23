# Laporan Kejadian Bencana Harian 22–23 Okt 2026 (format 221026)

Format: deck pemilik "Laporan Kejadian Bencana Harian 221026" (`templat-221026.pptx`), cakupan isi seperti laporan 18–19 Okt.
Isian kejadian dari laporan Dit. Koordalops 23 Okt 07.00 WIB (`../harian-2026-10-23.json`). Angka karhutla = data website
centurisk97.id persis: titik panas 22 Okt dari `harian30.json`, sisa belum padam 22 Okt dan luas terbakar 1 Jan–22 Okt dari
`peta_karhutla*.json` (Gunung Arjuno = jumlah 10 kecamatan lereng dari `peta_karhutla_wil.json`).

Bangun ulang (dari folder ini, berkas web/*.json ditarik dulu dari https://centurisk97.id/data/):

    mkdir -p tpl && (cd tpl && unzip -oq ../templat-221026.pptx)   # ikon dan media templat dibaca dari tpl/ppt/media
    python3 data.py && node peta.mjs && node ikon.mjs && python3 -I buat.py templat-221026.pptx keluar.pptx

`buat.py` menolak titik tengah " · " di teks tampil. Hasilnya 2 slide (ringkasan dan rincian): sampul dan penutup templat dibuang atas permintaan pemilik 23 Okt.
