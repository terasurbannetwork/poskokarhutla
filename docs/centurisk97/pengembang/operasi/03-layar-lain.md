# Layar kontrak, sarana, misi udara

Halaman ini menjelaskan bagian layar Operasi untuk kontrak, sarana bencana lain, tindakan lapangan, misi udara, operasi darat, dan tab di peta utama.

## Kontrak dan modifikasi cuaca

- **Kontrak 2026.** Rekap kontrak per provinsi (jam operasi, sortie, jatuhan, liter) dari berkas `public/data/operasi/rekap_udara.json`. Berkas ini statis dan berlabel "rekap s.d. 25 Okt"; angkanya tidak dijumlah dengan data bot yang dimulai 27 Oktober. Harga dan tarif kontrak tidak pernah tampil.
- **OMC resmi BMKG aktif** dan **Modifikasi cuaca**: sortie OMC dari `/api/omc/sortie` dan hasil dari `/udara/data/omc_hasil.json`. Formulir OMC ada di `/admin/omc` (peran `tmc`), bukan di layar ini.

## Sarana dan fasilitas (operasi untuk bencana selain karhutla)

Seksi ini tampil bila registri menyalakan `kemampuan.operasi` untuk sebuah bencana selain karhutla. Per 24 November 2026 delapan bencana menyalakannya: banjir, pesisir, cuaca, gempa, udara, gunung api, kekeringan, dan longsor (`public/bencana.json`). Karhutla bernilai `operasi: false` karena operasi karhutla memakai bagian Udara dan Darat yang sudah ada.

Pilih bencana dengan deret pil di atas, lalu empat kartu:

1. **Titik sarana dan fasilitas** (`public/inti/pb_titik.js`). Daftar sarana (heli evakuasi, perahu, pompa, truk tangki, tenda, terpal, atap darurat, alat berat, genset, dapur umum, masker, unit air bersih, tim SAR) dan fasilitas (tempat evakuasi, fasilitas kesehatan, sekolah, gudang, helipad, sumber air, barak, ruang udara bersih, pos pantau) per kabupaten. Staf Pusdalops, moderator, dan akun instansi pemda aktif bisa menambah, mengubah, dan menghapus titik di wilayahnya. Isi: golongan, jenis, nama tempat atau unit (bukan nama orang), koordinat, kapasitas (bilangan bulat), status (siap, dipakai, rusak, tidak tersedia), dan catatan hingga 200 karakter. Penghapusan wajib beralasan 5 sampai 300 karakter dan bersifat lunak.
2. **Renlap** (`public/inti/renlap.js`). Tombol untuk meminta renlap per wilayah dan tanggal, daftar renlap dengan status (Diminta, Draf, Terbit, Selesai, Gagal, Dibatalkan), tombol Terbit dan Selesai, serta unduhan KML, GPX, dan JSON. Permintaan yang masih berstatus Diminta lebih dari 30 menit ditampilkan sebagai "Gagal, ulangi".
3. **Hasil tindakan.** Untuk renlap yang berstatus Terbit atau Selesai, staf mencatat per target: didatangi atau tidak, alasan bila tidak, hasil (Selesai, Sebagian, Belum, Eskalasi), catatan, dan tindakan yang dilakukan (lihat bagian berikutnya).
4. **Kepatuhan.** Rekap persen target yang didatangi, target yang belum diisi, alasan tidak didatangi, dan jumlah target per tindakan.

Alasan tidak didatangi yang tersedia: akses terputus, cuaca, sarana kurang, warga menolak, tidak diperlukan lagi, lokasi salah, dan lainnya.

Hal yang sering disalahpahami: renlap generik bukan dibuat di peramban. Permintaan memicu mesin di GitHub Actions yang menghitung target dari data publik, lalu mengirim hasilnya ke Worker. Bila `GITHUB_TOKEN` belum terpasang, jawaban memuat "mesin belum disambungkan" dan baris tetap tercatat sebagai Diminta.

## Tindakan lapangan per target

Di baris hasil sebuah target, staf mencentang tindakan yang dilakukan (maksimal 12 per target). Daftar tindakan yang boleh dicentang berbeda tiap bencana (`kemampuan.tindakan` di registri). Di kartu **Tindakan** tampil daftar tindakan bencana terpilih beserta persen kejadian logbook Pusdalops yang mencatatnya; angka itu pencocokan kata kunci pada teks logbook, bisa kurang atau lebih dari kenyataan. Bila bencana tidak ada di logbook (kualitas udara), persen ditulis "tidak tercatat". Tindakan hanya dicentang, tidak ada jumlah; jumlah (orang dievakuasi, liter air, unit alat) ditulis di kolom catatan (Q4 di paket tindakan).

Pemadaman api, water bombing, dan patroli api tidak masuk operasi generik karena sudah menjadi wilayah modul karhutla.

## Misi Udara (flight plan helikopter)

Misi Udara belum punya layar. Staf teknis menjalankannya sebagai perintah baris di komputer yang memegang repositori. Untuk satu misi, isi: bencana, jenis misi, base awal, titik tujuan berurutan, dan opsional tipe helikopter, kecepatan, jam berangkat, base akhir. Hasilnya berkas PDF tiga halaman (peta rute, tabel leg untuk pilot, pemeriksaan dan daftar periksa), KML, GPX, teks siap kirim WhatsApp, dan JSON.

Jenis misi: **dropping** (bantuan), **pantau**, **evakuasi**, **angkut**, **cari** (hanya untuk banjir, longsor, gempa, pesisir), dan **kunjungan**. Titik boleh dimasukkan sebagai koordinat desimal, DMS, tautan Google Maps (panjang atau pendek), atau plus code; nama tempat saja ditolak. Titik yang belum pasti ditandai `menyusul`, dan flight plan dibuat ulang saat titik pasti masuk.

Hal yang sering disalahpahami:

- Status pada keluaran adalah "zona belum diperiksa" karena pemeriksaan zona terbang (radius gunung api, abu, peringatan tsunami, cuaca) belum dibangun. Itu bukan penanda bahwa rute bebas hambatan.
- Keluaran tidak pernah ditulis ke `public/`. Untuk jenis kunjungan, penyimpanan di dalam repositori ditolak karena repositori publik.
- Tidak ada nama orang di keluaran.

## Operasi Darat

Bagian **Darat** menampilkan tiga seksi: Personel per unsur (TNI, Polri, Manggala Agni, BPBD, masyarakat), Penanganan lahan (dipadamkan 2026), dan Patroli regu. Datanya dari laporan karhutla terkunci (`/api/laporan-karhutla/snapshot/:tanggal`), angka rekap BNPB terakhir (`/data/bnpb.json`, `/data/operasi_resmi.json`), dan `/api/ops/patroli`. Bila laporan harian belum dikunci, layar memakai angka rekap BNPB terakhir dan menuliskan tanggalnya.

## Tab Operasi di peta utama

Selain `/operasi`, peta utama punya tab "Operasi" untuk rencana kebutuhan sumber daya karhutla (regu, personel, pompa, selang, titik bor, heli, OMC, logistik) dengan penggeser target 1 sampai 14 hari (`public/operasi.js`, `scripts/data/operasi.py`). Beban kerja dihitung harian per kompleks aktif, lalu dibagi target hari di peramban dengan rumus yang sama. Rincian koefisien dan sumbernya tertulis di `KOEF` pada `scripts/data/operasi.py`.
