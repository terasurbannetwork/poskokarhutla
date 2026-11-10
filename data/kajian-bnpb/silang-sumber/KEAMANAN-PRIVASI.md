# KEAMANAN-PRIVASI: Silang Sumber

## Data

Semua masukan publik (BMKG, PVMBG, DIBI, USGS, EMSC, Open-Meteo, hasil sendiri). Logbook Pusdalops dipakai sebagai agregat yang sudah ada di repo (`logbook_riwayat.json`); data Dalops mentah tidak masuk repo. Tidak ada data pribadi, foto, atau koordinat orang.

## Hak

Layar baca saja, `noindex`. Tidak ada rute worker baru, tidak ada tulisan ke D1 atau R2, tidak ada secret. API `tropicalcyclone` ber-token tidak dipakai (KEPUTUSAN K9).

## Risiko dan penjaga

| Risiko | Penjaga |
| --- | --- |
| Hasil turunan dibaca sebagai peringatan | Pil "Deteksi Centurisk97"; tidak tampil sebagai peringatan sebelum uji balik. |
| Persen dari sampel kecil | Gerbang a + c >= 30, diuji. |
| Skor menyesatkan karena DIBI telat lapor | Catatan di layar dan batas `dinilai_sampai` 14 hari. |
| Arsip diubah belakangan | Append-only; baris lama diperiksa sebelum dan sesudah menulis. |
| Mengisi mundur arsip supaya skor bagus | Tanggal beku harus lebih awal dari periode target; baris yang melanggar dibuang. |
| "Perlu dicek" dibaca sebagai vonis | Kedua nilai dan lembaga tampil; tidak ada kolom "yang benar". |
| "Tidak disebut" dibaca sebagai aman | Kata "aman" dilarang dan diuji di keluaran dan layar. |
| Zona tsunami salah dipetakan ke kabupaten | Nama tak cocok tetap tampil; kamus ditinjau manusia; penanda `sebagian`. |
| Pemutar ulang dibaca sebagai kejadian nyata | Label "latihan" dan tanggal asli selalu tampil. |
| Penyisipan HTML dari teks sumber | Semua teks lewat `esc()` sebelum `innerHTML`. |
| Melanggar ketentuan akses BMKG | Pemilik sudah menyadari pada 10 Nov 2026; hanya berkas yang sudah dipanen modul lain yang dibaca. |
