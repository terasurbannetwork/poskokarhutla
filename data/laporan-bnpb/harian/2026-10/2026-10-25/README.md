# Laporan Kejadian Bencana Harian 24–25 Okt 2026 (format 221026, cut-off 25 Okt 08.00 WIB)

Pembangun sama dengan `../harian-2026-10-23/`. Isian kejadian dari laporan Dit. Koordalops 24 Okt 07.00 s.d. 25 Okt 07.00 WIB
(`../harian-2026-10-25.json`, 23 laporan, 21 menonjol). Cut-off laporan harian 08.00 WIB (pemilik 25 Okt), tercetak di bawah judul.
Angka karhutla = website centurisk97.id hari 24 Okt (`peta_karhutla*.json` dibuat 25 Okt 05.05 WIB). Provinsi Prioritas website yang
tidak ada di Koordalops ditambahkan (Kalbar, Papua Selatan), jadi 23 kejadian menonjol.

Beda dari 23 Okt: panel kekeringan lintas provinsi (provinsi di bawah nama kabupaten, TOTAL tidak menjumlah liter karena Blitar
kumulatif sejak 22 Jul), banjir bandang Solok, peta memberi nomor kekeringan pada provinsi yang hanya berisi kekeringan.
Blitar ditulis WA di bawah Jawa Tengah; PDF Koordalops entri 13: Jawa Timur.

Status karhutla ikut sisa website (>= 10 ha = ditangani); laporan lapangan "padam" tidak menimpanya, karena bila beda data kita
diutamakan (pemilik 25 Okt; Kaltim: Koordalops sisa 0, website ±90 ha dan 110 hotspot). Pengecualian (pemilik 25 Okt): BPBD melapor api belum padam = dalam penanganan walau sisa satelit 0 ha (awan, kabut, api di bawah
tajuk tak terlihat satelit). Angka tetap website 24 Okt (hari penuh, bukan data pagi ini). Kena: Kuningan (Ciremai) dan Karanganyar (Lawu).

Bangun ulang (dari folder ini):

    mkdir -p web tpl && (cd tpl && unzip -oq ../templat-221026.pptx)
    for f in peta_karhutla peta_karhutla_kab peta_karhutla_wil harian30 kluster_awal; do curl -sfL -o web/$f.json https://centurisk97.id/data/$f.json; done
    python3 -I data.py && node peta.mjs && SAMPUL=1 python3 -I buat.py templat-221026.pptx "Laporan Kejadian Bencana Harian 251026.pptx"

SAMPUL=1 mempertahankan sampul dan penutup templat (pemilik 25 Okt, seperti PDF 241026): 4 halaman, periode dan tanggal diganti,
baris "Lampiran" dibuang. Tanpa SAMPUL = 2 slide. PDF diekspor lewat Microsoft PowerPoint (osascript `save as PDF`); bila PowerPoint
gagal membuka berkas di folder ini, salin ke scratchpad dulu lalu ekspor dari sana. Ikon `ik/` sudah jadi; `ikon.mjs` hanya bila ikon baru dibutuhkan.
