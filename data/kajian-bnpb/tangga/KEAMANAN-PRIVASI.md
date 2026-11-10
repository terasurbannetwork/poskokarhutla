# KEAMANAN-PRIVASI: Tangga Peringatan

## Data

Semua masukan publik (BMKG, FIRMS-turunan, model sendiri). Tidak ada data pribadi, tidak ada foto, tidak ada koordinat orang. `tangga.json` hanya memuat nama wilayah, kalimat sumber, tingkat, tanggal.

## Hak

Layar baca saja, di bawah halaman `/prediksi` yang sudah ada (`noindex`). Tidak ada rute baru, tidak ada tulisan ke D1 atau R2, tidak ada secret. Tab Tangga tidak memanggil `/api/*`.

## Risiko dan penjaga

| Risiko | Penjaga |
| --- | --- |
| Peringatan usang dibaca sebagai aktual | Batas basi (ALGORITMA 6); tanggal terbit/diambil tampil di tiap anak tangga. |
| Pernyataan provinsi dibaca sebagai kabupaten | Pil "tingkat provinsi"; field `c` wajib. |
| Pembaca mengira sinyal adalah probabilitas | Tanpa angka persen untuk sinyal; aturan tampil; kalimat "pernyataan resmi searah", bukan "akan terjadi". |
| Pembaca mengira ketiadaan pernyataan = keadaan aman | Kata "aman" dilarang dan diuji; teks "tidak disebut" dipakai. |
| Menyisipkan HTML dari teks sumber ke layar | Semua teks lewat `esc()` sebelum `innerHTML`. |
| Arsip diubah | Append-only; baris lama diperiksa sebelum dan sesudah menulis. |
| Label analisis (Himawari) dibaca sebagai peringatan | Pil "analisis", `tk` null, tidak ikut sinyal. |
