# PRD: Aplikasi terpasang dan peringatan dini

Dasar: `KEPUTUSAN-PWA.md` (K1). Fitur bernomor F-n; tiket pada `TIKET.md`.

## Tujuan

Warga memasang Pantau Bencana di layar utama Android atau iPhone tanpa toko aplikasi, memilih kecamatannya, dan dikabari lebih dulu bila prakiraan banjir, longsor, asap, atau angin untuk daerahnya naik ke Waspada atau lebih, lengkap dengan tempat berkumpul terdekat.

## Peran

| Peran | Kebutuhan |
| --- | --- |
| Warga | pasang mudah, pilih wilayah, terima kabar singkat, tahu harus ke mana, bisa mematikan kapan saja |
| Staf Pusdalops BNPB | melihat berapa pelanggan per kab, riwayat peristiwa, mematikan kiriman global |
| BPBD kab/kota | menandai titik evakuasi yang boleh tampil ke publik (Q8) |

## Fitur

| No | Fitur | Penerimaan ringkas |
| --- | --- | --- |
| F-1 | Dapat dipasang | Manifest sah dengan nama Pantau Bencana, ikon PNG 192, 512, dan maskable, `start_url` `/lapor/`, mode standalone. Android menawarkan Pasang; iPhone mendapat panduan tiga langkah. |
| F-2 | Kartu Pasang | Tampil di beranda `/lapor` pada kunjungan kedua dan seterusnya selama belum terpasang; bisa ditutup dan tidak muncul lagi 30 hari. |
| F-3 | Pilih wilayah | Cari kecamatan dengan pencarian wilayah lapor (K29), simpan sampai 3. |
| F-4 | Pilih jenis dan ambang | Banjir, longsor, asap, angin; ambang Waspada, Siaga, atau Awas (bawaan Waspada). |
| F-5 | Nyalakan notifikasi | Izin diminta sesudah ketukan; ditolak atau tidak didukung ditangani dengan kalimat jelas dan tanpa mengulang meminta. |
| F-6 | Notifikasi peringatan | Judul: jenis dan tingkat; isi: kab/kota, hari sasaran, label prakiraan; tombol aksi Lihat arahan. |
| F-7 | Kartu arahan | Dibuka dari notifikasi: tingkat per hari 1 sampai 3, imbauan dari aturan dampak yang sudah ada, tiga titik berkumpul terdekat dengan jarak, label sumber, tombol Arah (Google Maps), nomor penting (K27). |
| F-8 | Kelola langganan | Layar kecil: wilayah, jenis, ambang, Matikan semua. Matikan menghapus baris di server. |
| F-9 | Kendali staf | Daftar angka per kab (jumlah langganan, tanpa identitas), riwayat peristiwa dan hasil kirim, tombol jeda global. |
| F-10 | Titik evakuasi BPBD | BPBD menandai baris `titik_pengungsian` sebagai publik (Q8). |
| F-11 | Bahasa | Antarmuka mengikuti bahasa pilihan (K58, K79); isi push Indonesia atau Inggris (Q15). |

## Di luar lingkup

Aplikasi toko (Play, App Store); notifikasi dari peringatan resmi BMKG (Q13); pelacakan lokasi latar belakang; peta evakuasi rute jalan sendiri; notifikasi penurunan tingkat (Q10); SMS dan WhatsApp sebagai saluran peringatan (K-lapor: tanpa router WA bersama).

## Larangan

1. Tidak pernah menulis "aman", "tidak ada ancaman", atau "sudah normal" sebagai pesan peringatan; tingkat Normal hanya muncul di kartu sebagai nilai, bukan sebagai jaminan.
2. Tidak mengklaim tingkat kecamatan dari data kab/kota (D6).
3. Tidak menyimpan lokasi GPS warga di server, tidak menyimpan nomor WA, tidak ada akun.
4. Tidak mengirim iklan, survei, atau konten selain peringatan dan satu pesan konfirmasi saat berlangganan.
5. Tidak ada angka kinerja model sebagai kepastian; jenis yang belum teruji berlabel.

## Ukuran keberhasilan

| Ukuran | Cara hitung | Target |
| --- | --- | --- |
| Pasang | langganan baru per 100 kunjungan kartu Pasang | dicatat saja, tanpa target sebelum ada data |
| Terkirim | kiriman status 201 dibagi kiriman dicoba | pantau; di bawah 90 persen ditinjau |
| Terbuka | klik notifikasi dibagi terkirim (hitungan agregat, tanpa identitas) | pantau |
| Berhenti | langganan dihapus pengguna dalam 7 hari pertama | di atas 30 persen berarti kiriman terlalu sering, tinjau ambang |
