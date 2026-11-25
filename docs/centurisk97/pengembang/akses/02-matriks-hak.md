# Matriks hak per fitur

Halaman ini memuat matriks hak per fitur dan per peran.

## Matriks hak per fitur

Tanda: B = baca, T = tulis, P = proses atau putuskan, tanda kurung = hanya untuk dirinya atau wilayahnya.

| Fitur | Tamu | Akun umum | Anggota lembaga | BPBD (profil aktif) | Aparat | Pegawai atau relawan | Staf BNPB | Moderator ke atas |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Minta dan periksa kode di `/masuk` | T | T | T | tidak lewat kode | T | T | T (lalu sandi) | tidak lewat kode |
| Lengkapi profil akun umum, pilih ruang, keluar | | T | T | | T | T | T | |
| Atur sandi sesudah kode | | | T (pendataan dan kampus; instansi hanya pemilik nomor akun) | tidak | T (pemilik nomor akun) | | tidak | |
| Mengundang anggota berantai | | | T (untuk akun sendiri) | tidak, lewat PIC | T | | T (wilayah haknya) | T |
| Papan aktivasi `/admin/aktivasi` dan undang ulang | | | | | | | B dan T bila berperan verifikator, pusdalops, atau koordalops | B dan T |
| Peta domain email ke lembaga (`mk_domain`) | | | | | | | | T (bukan akun gerbang situs) |
| Verifikasi akun instansi (surat tugas dan kartu) | | | | tidak, lewat 3 PIC | T (isi sendiri) | | P setuju atau tolak di wilayahnya (verifikator, pusdalops) | P semua, termasuk cabut dan reset sandi |
| Buat akun BPBD massal | | | | | | | | T |
| Tugas api, kabar, kartu, alat, korban | | | | T (wilayahnya) | T (wilayahnya) | | B | B dan P |
| Profil PIC: buat, ubah, foto, PIN, ajukan | | | | T (profil sendiri sesudah PIN) | | | | |
| Profil PIC: setuju, cabut, reset PIN, buka kunci | | | | | | | setuju saja, di wilayahnya (verifikator, pusdalops) | semua aksi |
| Log profil | | | | B (lembaga sendiri) | | | | B semua |
| Absen, logbook, wajah sendiri | | | | | T | | | |
| Panel Lapangan: tinjau absen, impor, panggilan relawan | | | | | | ketua regu: B untuk tugasnya | T (pimpinan, koordalops) | T; impor CSV hanya Super Admin |
| LogPal: baca gudang | | | | pemprov: provinsinya; pemkab dan pemkot: miliknya | tidak | | semua (pusdalops, koordalops, pimpinan) | semua |
| LogPal: tulis barang, mutasi, opname | | | | gudang miliknya | | | gudang pemilik BNPB | gudang pemilik BNPB |
| LogPal: ajukan permintaan | | | | T (milik sendiri) | | | T (BPBD pemohon dan provinsi diisi dari isian) | T (sama dengan staf) |
| LogPal: proses tahap permintaan | | | | tidak | | | P | P |
| Segel: buka halaman verifikasi | B | B | B | B | B | B | B | B |
| Segel: cabut | | | | | | | rancangan: pimpinan | rancangan: moderator |

Catatan matriks: baris LogPal mengikuti `aktor()` di `src/logpal.js:48-55`. Untuk aktor staf, `buatPermintaan` mengambil BPBD pemohon dan provinsi dari isian (`src/logpal.js:244`), sedangkan untuk BPBD keduanya diambil dari akunnya. Baris segel adalah rancangan (bawaan sementara Q5), belum ada di kode.
