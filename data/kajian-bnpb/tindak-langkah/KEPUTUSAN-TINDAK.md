# KEPUTUSAN-TINDAK: Log tindak lanjut Usulan langkah (Pantau Dalops)

Dokumen ini menang atas semua dokumen lain di folder ini. Keputusan pemilik dicatat apa adanya. Hal yang belum diputuskan ada di bagian Q dan tidak dijawab dengan karangan; bawaan sementaranya ditandai **[BAWAAN SEMENTARA]**.

## Masalah

Seksi "Usulan langkah" di `/bnpb/dalops` (tab Banjir, menu Penanganan) menghitung langkah BPBD bersama BNPB per kab/kota dari status prakiraan, posko, dan laporan terdampak (`H.mitigasi()` di `public/bnpb/dalops_hitung.js`). Daftarnya dihitung ulang tiap kali halaman dibuka, jadi tidak ada catatan apakah langkah itu sudah dikerjakan, siapa yang mengerjakan, dan kapan. Pada 12 Nov 2026 ada 4 kab/kota terdampak belum surut, 8 Awas, dan 46 Siaga di daftar itu.

## Keputusan pemilik (12 Nov 2026)

| No | Keputusan |
| --- | --- |
| K1 | Tabel Usulan langkah dirapikan dan "dibuat kaya log gitu jadi bisa dipantau". |
| K2 | Jenis log yang dipilih pemilik: **log tindak lanjut staf**. Tiap langkah punya status yang diisi staf, tercatat siapa dan kapan, dan riwayatnya bisa dilihat. Pemilik memilih mengerjakannya di sesi yang sama ("Do it here"). |
| K3 | Paket dokumen dulu, baru kode (AGENTS.md 3.7). |

## Keputusan rancangan (agent, bisa dibatalkan pemilik)

| No | Keputusan | Alasan |
| --- | --- | --- |
| D1 | Satu langkah dikenali dengan kunci `banjir|<kode prov>|<nama kab>|<jenis langkah>`. Jenis langkah: posko, evakuasi, lereng, kebutuhan, kendala, konfirmasi, pendataan, lanjut, pantau. | Daftar langkah dihitung ulang tiap hari; kunci yang stabil membuat status kemarin tetap menempel pada langkah yang sama hari ini. |
| D2 | Dua tabel D1: `dl_tindak` (keadaan terkini per kunci) dan `dl_tindak_log` (riwayat append-only, tidak pernah diubah atau dihapus lewat rute). Teks langkah saat itu ikut disimpan di riwayat. | Pemantauan butuh jejak; teks langkah berubah dari hari ke hari. |
| D3 | SQL hanya di `src/hak.js` (gerbang `tests/agen/gerbang-d1.test.mjs`); rute di `src/dalops_tindak.js`. | Aturan repo. |
| D4 | Tulis hanya staf berperan pusdalops atau koordalops dan moderator (`modOK`). Akun gerbang situs dan pemirsa baca-saja tidak bisa menulis. Staf berwilayah hanya untuk provinsi wilayahnya. | Sama dengan pola isian Operasi Udara. |
| D5 | Batas laju 120 tulis per 10 menit per pengisi, dihitung dari `dl_tindak_log`. | Mencegah salah klik beruntun dan skrip. |
| D6 | Tanpa unggah foto di fase ini. | Foto butuh R2, pembersih EXIF, dan aturan privasi tersendiri. |

## Pertanyaan terbuka untuk pemilik (Q)

| Q | Pertanyaan | Bawaan sementara | Menahan |
| --- | --- | --- | --- |
| Q1 | Status apa saja? | **[BAWAAN SEMENTARA]** tiga: Belum, Dikerjakan, Selesai. | tidak menahan |
| Q2 | Pimpinan boleh mengubah status, atau hanya melihat? | **[BAWAAN SEMENTARA]** hanya melihat; yang menulis Pusdalops, Koordalops, dan moderator. | tidak menahan |
| Q3 | Nama pengisi ditampilkan di riwayat? | **[BAWAAN SEMENTARA]** ya, nama staf dari akun (halaman internal staf); moderator tampil "Moderator". | tidak menahan |
| Q4 | Langkah yang sudah Selesai tapi besoknya masih muncul di daftar: dibuka lagi otomatis? | **[BAWAAN SEMENTARA]** tidak; tetap Selesai dengan tanggalnya, staf bisa mengubahnya. | tidak menahan |
| Q5 | Jenis bencana lain ikut? | **[BAWAAN SEMENTARA]** hanya banjir, karena Usulan langkah baru ada untuk banjir. | tidak menahan |
| Q6 | Perlu bukti foto atau tautan dokumen? | **[BAWAAN SEMENTARA]** belum (D6); catatan teks 300 karakter. | TL-08 |

Migrasi `0128_dl_tindak.sql` harus diterapkan pemilik di D1 produksi sebelum fitur ini jalan; tanpa migrasi, rute menjawab 503 dan layar tetap tampil tanpa kolom status.
