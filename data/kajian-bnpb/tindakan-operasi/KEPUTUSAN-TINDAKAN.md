# KEPUTUSAN-TINDAKAN: Tindakan lapangan per bencana di operasi generik

Dokumen ini menang atas semua dokumen lain di folder ini. Keputusan pemilik dicatat apa adanya. Hal yang belum diputuskan ada di bagian Q dan tidak dijawab dengan karangan; bawaan sementaranya ditandai **[BAWAAN SEMENTARA]**.

## Masalah

Operasi generik di `/operasi` (paket Paritas Bencana, W1) sudah punya sarana, renlap, hasil per target, dan kepatuhan untuk tujuh bencana. Isian hasil per target hanya mencatat didatangi atau tidak, alasan, hasil, dan catatan. Tidak ada tempat mencatat **tindakan apa** yang dilakukan di target itu (evakuasi, pembersihan material, dropping air, dan seterusnya), padahal tindakan itulah yang dicatat BNPB dan BPBD di logbook Pusdalops sejak 2011. Longsor, bencana ketiga terbanyak di logbook, bahkan belum menyalakan operasi.

## Keputusan pemilik (17 Nov 2026)

| No | Keputusan |
| --- | --- |
| K1 | Pemilik menanyakan tindakan operasi tiap bencana selain karhutla, lalu memilih acuan "yang biasa dilakukan BNPB". |
| K2 | Pemilik: "Ya lanjut semua tindakan yang tercatat. Lu atur agar ada di operasi." Semua tindakan yang tercatat di logbook per bencana masuk operasi generik. |
| K3 | Paket dokumen dulu, baru kode (AGENTS.md 3.7). |

## Keputusan rancangan (agent, bisa dibatalkan pemilik)

| No | Keputusan | Alasan |
| --- | --- | --- |
| D1 | Sumber daftar tindakan adalah kolom `upaya`, `kondisi`, dan `peralatan` arsip logbook Pusdalops 2011-2026 (`data/raw/logbook/arsip/*/baris.jsonl`), dikategorikan dengan kata kunci (ALGORITMA 1). | "Yang biasa dilakukan BNPB" diambil dari catatan BNPB sendiri, bukan karangan. |
| D2 | Satu tindakan masuk daftar suatu bencana bila tercatat di paling sedikit 2 persen kejadian berisi bencana itu, atau ada sumber logbook lain yang menyebutnya (OMC banjir dari `public/data/bnpb/logbook_omc.json`: 24 dari 120 kejadian OMC bertujuan hujan dan banjir). | Di bawah 2 persen hampir semuanya salah tangkap kata kunci. |
| D3 | Katalog tindakan satu: 23 kode di `public/bencana.json` kunci puncak `tindakan` ({kode: label}), urutan kode diperiksa terhadap tuple `TINDAKAN` di `scripts/umum/bencana.py`. Daftar per bencana di `kemampuan.tindakan` (urut dari persen logbook terbesar). | Satu registri, dinyalakan per bencana, tanpa salinan per bencana (Paritas D1). |
| D4 | Pemadaman api, water bombing, dan patroli api tidak masuk operasi generik meski muncul di logbook gunung api dan kekeringan. Itu wilayah modul karhutla yang sudah ada. Karhutla tetap `tindakan: []` di registri. | Satu tempat untuk tiap tindakan; karhutla tidak boleh mundur (Paritas D4). |
| D5 | Tindakan dicatat per target renlap, di baris hasil yang sudah ada: `POST /api/pb/hasil` menerima `tindakan` (daftar kode, maks 12) dan tabel samping baru `pb_renlap_tindakan` (migrasi 0153). Tanpa `ALTER` pada tabel lama. | Tindakan terjadi di target; kepatuhan dan hasil sudah ada di sana. |
| D6 | Kepatuhan menambah `per_tindakan` (jumlah target per kode). Tabel 0153 belum ada di produksi = kepatuhan tetap jalan tanpa `per_tindakan`, hasil tetap tersimpan tanpa tindakan dan jawabannya memberi tahu. | Migrasi diterapkan pemilik; fitur lama tidak boleh mati menunggu. |
| D7 | Persen logbook per tindakan dihitung `scripts/data/logbook_tindakan.py` ke `public/data/bnpb/logbook_tindakan.json`, hanya hitungan, tanpa teks asli, nama, atau angka korban. Arsip mentah tetap di luar git. | Pola `logbook_turunan.py`. |
| D8 | Longsor menyalakan operasi dan renlap (sarana alat berat, tim SAR, tenda, air bersih, dapur umum; bobot `longsor` yang sudah berlabel HIPOTESIS). Target renlap longsor dari nowcast tetap berlabel hipotesis sampai uji balik PB-49 lolos. | Mesin `target_longsor` di `scripts/umum/renlap.py` sudah ada; mencatat tindakan bukan model. |
| D9 | Layar: kartu baru "Tindakan" di seksi Sarana dan fasilitas (daftar tindakan bencana terpilih dengan persen logbook), kolom "Tindakan" di kartu Hasil tindakan, daftar per tindakan di kartu Kepatuhan. Kartu standar AGENTS 3.5: kepala nama seksi, tanpa kalimat kesimpulan. | Kartu yang sudah ada dipakai ulang. |

## Pertanyaan terbuka untuk pemilik (Q)

| Q | Pertanyaan | Bawaan sementara | Menahan |
| --- | --- | --- | --- |
| Q1 | Kebakaran permukiman (8.252 kejadian di logbook, tindakan utama pemadaman 66 persen) belum ada di registri. Dibuat entri bencana sendiri? | **[BAWAAN SEMENTARA]** tidak dibangun di paket ini. | tidak menahan |
| Q2 | Kualitas udara tidak punya jenis di logbook. Tindakannya dari mana? | **[BAWAAN SEMENTARA]** pembagian masker dan sosialisasi, dari sarana `masker` yang sudah ada di registri udara; persen logbook tampil "tidak tercatat". | tidak menahan |
| Q3 | OMC banjir dibuatkan zona usulan seperti seksi Peluang semai karhutla? | **[BAWAAN SEMENTARA]** tidak; OMC banjir hanya dicatat sebagai tindakan yang sudah dilakukan. Zona usulan butuh paket sendiri. | tidak menahan |
| Q4 | Tindakan per target cukup centang, atau perlu jumlah (orang dievakuasi, liter air, unit alat)? | **[BAWAAN SEMENTARA]** centang saja; jumlah tetap di kolom catatan. | TO-06 |
