# Layar Pusdalops: logbook sampai siaga

Halaman ini mencatat layar piket Pusdalops dari logbook sampai siaga pra-musim.

## Logbook Pusdalops, /bnpb/logbook

Layar staf untuk mencatat kejadian terstruktur menurut kontrak L1. Satu kejadian punya banyak entri; angka dampak di entri adalah nilai terkini, entri lanjutan menimpa, tidak menjumlah. Jenis kejadian yang diterima: banjir, cuaca, kebakaran permukiman, karhutla, longsor, gempabumi, gunungapi, kekeringan, kecelakaan, konflik sosial, lainnya, gelombang pasang, tsunami, dan wabah (`src/logbook.js:14`). Isian angka di atas batas wajar ditolak kecuali dikirim dengan tanda yakin. Draf formulir disimpan di peramban supaya isian setengah jadi tidak hilang. Akses: moderator atau staf berperan pusdalops, koordalops, pimpinan; layar ini boleh dibingkai di `/admin/laporan`.

## Dokumen Pusdalops, /bnpb/dokumen

Enam jenis dokumen dari logbook: BAST Piket, Laporan Menonjol, Laporan Shift, Rekap Mingguan, Laporan Harian, dan Sitrep Kejadian (`public/bnpb/dokumen.js:10`). Pilih tab dan tanggal, lalu cetak A4 lewat `window.print()` atau salin teks WA. Hari laporan 07.00 sampai 07.00 WIB. Teks Laporan Harian wajib lolos pengurai `LaporanUrai`. Sitrep gunung api dan gempa diambil dari berkas instansi statis.

## Bahan Laporan Harian, /bnpb/bahan

Form pilihan yang menghasilkan teks WA baku, lalu dikirim lewat `POST /api/wa/form`. Empat tab: Koordalops (dari Logbook), BMKG pagi, PVMBG pagi, dan Satgas pemadaman (`public/bnpb/bahan.js`). Pratinjau teks disusun di peramban dan ditunda 200 ms supaya ketikan tidak tertahan. Akses staf.

## Operasi Pusdalops, /bnpb/operasi

Enam tab: Pemulihan, Laporan Khusus, Roll Call, SK Aktif, Berantai, dan Medsos. Data dari rute `/api/pusdalops/pemulihan`, `/lapsus`, `/rollcall`, `/berantai`. Penanda basi muncul bila waktu data lebih dari 24 jam (sama dengan `BASI_MS` di `src/lapsus.js`). Alamat `/bnpb/operasi-lapangan` dialihkan 302 ke `/operasi` karena peta operasi udara pindah ke peta utama.

## Perencanaan Pusdalops, /bnpb/perencanaan

Tiga tab: Beban laporan kab, Kalender operasi, dan Stok pra-musim (`public/bnpb/perencanaan.js:9`). Semuanya deskriptif dari laporan Pusdalops, bukan ramalan, dan belum diuji balik. Kalender hanya menampilkan sel persiapan bila keyakinan bukan rendah.

## Siaga pra-musim, /bnpb/siaga

Per kab/kota dan bulan: peluang musim, daftar SOP pra-musim dengan tenggat mundur dari awal musim, saran jenis stok penyangga tanpa jumlah, desa langganan terisolir, dan daerah senyap. Tiap angka peluang tampil bersama pembilang dan penyebutnya.
