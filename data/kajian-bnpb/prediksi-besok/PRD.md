# PRD: tab Besok versi tabel dan peta

## Masalah
Tab Besok menampilkan 514 kartu berisi 5–6 kalimat, diurutkan menurut peluang hujan lebat. Staf tidak bisa memindai kab mana yang perlu ditangani, aturan yang terpicu hanya tampil satu bilah, rob tidak tampil, dan pil uji diulang ribuan kali.

## Pengguna
Staf Pusdalops BNPB dan BPBD yang menyiapkan siaga untuk besok sampai tiga hari.

## Fitur
- F-1 Kendali: cari kab, dropdown provinsi bertema, pilihan hari (besok, lusa, H+3), pilihan tampilan Tabel atau Peta.
- F-2 Pil bencana selebar layar berikon: Semua, Hujan, Banjir, Longsor, Titik panas, Asap, Gelombang dan rob, Angin. Angka = jumlah kab level >= 2.
- F-3 Kartu "Perlu tindakan": tiap aturan terpicu satu baris lipat (jumlah kab, jiwa), dibuka berisi tabel kab dan dampaknya.
- F-4 Tabel kab: kolom Kab/kota, Jiwa, Hujan, Banjir, Longsor, Titik panas, Asap, Gelombang, Rob, Angin. Sel berwarna menurut level, kepala kolom membawa pil teruji/belum teruji.
- F-5 Pop-up rincian kab dari klik baris atau wilayah peta.
- F-6 Peta kab berwarna menurut bencana terpilih, legenda dan pil level berangka di dalam peta.
- F-7 Kode arsip `GEL` dan `CEX`, aturan melaut dan angin kencang.
- F-8 Tangga: kekeringan skala sepekan (HTH kita) dan bulan (peluang model, hipotesis).

## Larangan
Tanpa kalimat kesimpulan di kepala kartu; tanpa "aman"; tanpa titik tengah sebagai pemisah; tanpa huruf kapital semua; tanpa abrasi harian; tanpa skor gabungan lintas bencana.
