# ALUR: ujung ke ujung per peran

## 1. Rantai Satu Kejadian

Petugas Pusdalops BPBD (kode meja atau akun staf):
1. Kejadian dibuka di Logbook; sistem memberi KIB 16 digit bila `kab_bps` dikirim (`src/logbook.js`). Tanpa KIB, rantai tidak ada (T12).
2. Membuat catatan meja (kaji cepat, logistik, DSP, rehab). Formulir punya isian opsional "KIB kejadian". Diisi: server memeriksa KIB ada dan satu kabupaten dengan catatan; bila tidak, jawaban sama dengan "tidak ditemukan".
3. Atau dari detail catatan lama: "Tautkan ke kejadian" menampilkan saran kejadian satu kabupaten dengan tanggal berdekatan; petugas memilih satu. Sistem tidak menautkan sendiri.
4. Satu catatan hanya satu KIB; mengganti KIB meninggalkan jejak di `pantau_jejak`.

Pimpinan (staf berperan):
1. Buka `/bnpb/rantai`: corong delapan tahap, daftar kejadian terurut dari yang paling lama macet.
2. Pilih satu KIB: garis waktu, tahap macet, alasan, pasal, tautan ke catatan sumber.
3. Admin dapat menandai tahap "tidak berlaku" dengan alasan; pembatalan tanda juga berjejak.

Status sebuah tahap diturunkan dari data sumber setiap dibaca (ALGORITMA §1). Tidak ada tombol "selesai" manual.

## 2. Kalender Kewajiban

Petugas BPBD:
1. Buka kalender kabupatennya. Baris dari meja (DSP, renkon, Destana) langsung muncul.
2. Untuk baris dari jangkar (hibah, RPBD, pelatihan), memasukkan tanggal jangkar sekali: SPPH, PHD, akhir masa pelaksanaan, penetapan Perkada RPBD, akhir pelatihan. Siapa yang boleh memasukkan menunggu Q5, Q6.
3. Setelah kewajiban dikerjakan di luar (mis. laporan di E-Pelaporan), menekan "terpenuhi" dengan tanggal. Sistem tidak memeriksa isi.
4. Kalender menampilkan sisa hari dan pasal; tenggat berlabel asumsi tampil berlabel.

Staf pimpinan: buka `/bnpb/kalender`, lihat rekap BPBD yang lewat tenggat per kunci, buka satu BPBD.

## 3. Rapor SPM

Pusdalops BPBD:
1. Tiap operasi pencarian, pertolongan, evakuasi: catatan meja `spm_respons` berisi cap waktu laporan diterima, unit siap diberangkatkan, unit dikerahkan, tiba (menit, WIB), hambatan bila ada, tanggal operasi dihentikan, tanggal laporan akhir.
2. Tiap sosialisasi tatap muka: catatan meja `spm_kie` berisi tanggal, kecamatan, desa, sasaran.

Pimpinan dan admin: Rapor Kinerja di `public/admin/pimpinan.js` memuat blok SPM per kabupaten: waktu respons (n kasus, persen yang memenuhi 25 menit, median), waktu tempuh, laporan akhir terlambat, sosialisasi tahun ini. Baris Juklak 4 dan 5 menulis "belum ada angka di juklak".

## 4. Dummy dan data kosong

Super Admin menekan tombol dummy dua ikon di halamannya; isi menyesuaikan halaman: di Rantai, tiga kejadian di tiga kabupaten contoh dengan tahap berbeda; di Kalender, jangkar contoh dengan satu lewat tenggat; di rapor, catatan SPM contoh. Layar kosong tanpa dummy menulis penyebabnya (belum ada KIB, belum ada jangkar, belum ada catatan SPM).
