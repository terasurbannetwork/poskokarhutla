# Kode lebih sempit dari dokumen

Halaman ini mencatat bagian dokumen perencanaan yang belum ada atau lebih sempit di kode.

## Kode lebih sempit daripada dokumen perencanaan

Kode menang atas dokumen; bagian berikut tercatat di paket dokumen tetapi belum ada di kode per 24 November 2026.

**Pantauan Operasi Udara (`operasi-udara`):**

- Rute PDF renlap dari bot (`/api/operasi/renlap/pdf`, UD-01), `status7` (UD-03), jam laporan pertama (`op_lapor_pertama`, UD-02), `op_gerak_muncul` dan penilaian "api muncul lagi" (UD-06), `/api/operasi/kontrak` dan `/api/operasi/personel` (UD-33), serta `scripts/operasi/prakiraan_base.py` (UD-09) tidak ditemukan di `src/`, `migrations/`, atau `scripts/`. Karena itu: tidak ada klasifikasi "telat" versus "tepat waktu" (hanya "belum ada status sesudah 07.30"), tidak ada penanda rusak berulang 3 dari 7 hari, tidak ada tombol PDF renlap dari bot, tidak ada waktu respons per cluster (hanya M7 per temuan berasap), dan prakiraan cuaca 3 sampai 6 jam, batas terang matahari, serta penanda ADS-B di luar base dan sinyal hilang belum ada di layar.
- Nomor migrasi pada dokumen rancangan (0125 untuk tabel `op_lapor_pertama`) bergeser: nomor 0125 sudah dipakai berkas lain, dan isian manual memakai 0126.
- Rute isian manual yang ada hanya gelar, sortie, hasil, temuan, hapus, dan riwayat. Isian armada, kontrak, personel, dan foto (UD-28, UD-29, UD-33) belum punya rute walau tabelnya sudah dibuat. Layar isian (`public/operasi_isian.js`, UD-30 dan seterusnya) belum ada; semua isian manual saat ini lewat API.
- Zona waktu per base hanya memuat Banjarmasin (WITA); dokumen mencantumkan daftar base lebih panjang yang seluruhnya WIB, sehingga hasilnya sama untuk base WIB tetapi base baru berzona lain harus ditambahkan di `ZONA_BASE`.
- Radius jangkauan berbeda antara layar (200 km, `public/operasi_peta.js:36`) dan mesin renlap (120 Nm, sekitar 222 km, `bobot_renlap.json`); keduanya bawaan sementara karena `jelajah_nm` belum terisi.
- Penjelasan di kode untuk seksi Sarana menyebut "kini semuanya mati" (`public/operasi_laporan.js:62`); keadaan sebenarnya, registri menyalakan operasi untuk delapan bencana selain karhutla sehingga seksi itu aktif.
- `public/renlap.html` adalah renlap SIPPA, bukan bagian modul ini.
- Komentar kepala `public/inti/renlap.js` menyatakan PDF renlap generik belum ada; hanya KML, GPX, dan JSON yang bisa diunduh, walau rute berkas menerima format `pdf` bila sudah ada di R2.

**Paritas bencana:**

- `kemampuan.dokumen` kosong untuk semua bencana, sehingga rute dokumen (sitrep, renops, laporan KIB, renkon) menjawab 404.
- `kemampuan.ekonomi`, `pencegahan`, dan `prioritas` bernilai `false` untuk semua bencana; keputusan ekonomi, pencegahan, dan prioritas wilayah belum diaktifkan.
- Paket Paritas memuat lebih banyak alur (W1 sampai W8: dasbor pimpinan, tangga peringatan, laporan berkala, bukti model, layar publik setara karhutla) yang hanya sebagian di modul ini. Bagian yang bukan operasi tidak dicakup dokumen ini.
- Renlap lintas bencana: tiga model target (longsor, kekeringan, cuaca) adalah hipotesis karena belum lolos uji balik. Model longsor tercatat gagal (AUC 0,70 lawan klimatologi 0,78). Ambang kekeringan spi3 berlabel hipotesis. Jenis tanpa uji balik memakai bobot 1,0 sama rata.

**Misi Udara:**

- Yang berjalan: MU-01 sampai MU-04 (batas bersumber, pembaca titik, rute urut tetap, templat enam misi, keluaran PDF, KML, GPX, teks, JSON).
- Yang belum ada: `scripts/umum/zona_terbang.py` dan seluruh pemeriksaan zona (gunung api, abu, tsunami, cuaca, banjir, longsor) serta zona manual (MU-05, MU-07); belokan menghindari zona larangan; pemeriksaan daya tahan dan saran isi ulang (MU-06; `daya_tahan_mnt` kosong untuk semua tipe); pola pencarian (MU-08); gerbang `tests/agen/gerbang-misi-udara.test.mjs` (MU-09); pembaca InaRISK (MU-15; hasil penyelidikan 24 November 2026: lapisan bahaya gunung api dan tsunami yang terbuka berupa raster tanpa ambang resmi, layanan vektor bernama jelas meminta token); bot WhatsApp (MU-10), tabel `pb_misi` dan rute `/api/pb/misi` (MU-11, MU-14), dan layar isian (MU-12, MU-13).
- Karena zona belum diperiksa, keluaran menulis "zona belum diperiksa" dan menandai "NOTAM tidak diperiksa". Keluaran tidak boleh dibaca sebagai rute bebas hambatan.
