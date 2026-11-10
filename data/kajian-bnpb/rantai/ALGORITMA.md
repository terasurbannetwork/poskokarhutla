# ALGORITMA

Semua fungsi murni (tanpa D1), diuji tanpa DB. Waktu epoch milidetik UTC; tanggal diturunkan di WIB (UTC+7) seperti `public/inti/jam_aturan.js`. Tafsir tanggal ikut aturan file itu: "N hari" = tanggal WIB + N hari kalender, "N bulan" = tanggal sama N bulan kemudian dipangkas ke akhir bulan, "N tahun" = 12 x N bulan.

## 1. Rantai Satu Kejadian

Tahap dibaca sebagai delapan jalur, bukan jalur pipa ketat: logistik sering berjalan sebelum SK status. Urutan hanya untuk tampilan.

Masukan per KIB: kejadian logbook (id, mulai, status buka/tutup), waktu entri pertama `t_awal`, daftar `logbook_sk`, ada tidaknya isian `posko`, dan daftar catatan meja tertaut (meja, status, data, tanda `bahaya` yang sudah dihitung `baris()` di `src/meja.js`).

| Jalur | selesai bila | berjalan bila | Tenggat |
| --- | --- | --- | --- |
| 1 awal | ada entri logbook | - | tidak ada (Juklak 4/2023 hal. 4 "segera") |
| 2 kaji | kaji_cepat berstatus `masuk_jitupasna` | kaji_cepat `dilaporkan` atau `diverifikasi` | `kaji_mulai`: `t_awal` + 24 jam, hanya bila kejadian buka dan belum ada catatan kaji |
| 3 sk | ada baris `logbook_sk` | kaji merekomendasikan status (`rek_status = ya`) tetapi belum ada SK | tidak ada; hanya keterangan "SK belum tercatat N hari" tanpa label terlambat |
| 4 posko | ada entri dengan `posko` bukan NULL | - | tidak ada (Q3) |
| 5 logistik | semua catatan logistik `diterima` | ada catatan logistik belum `diterima` | mandek bila tanda `belum_disetujui` (ambang internal 24 jam, asumsi) |
| 6 dsp | semua catatan dsp `selesai` atau `ditolak` | ada dsp `diajukan` sampai `spm` | macet pasal bila tanda `laporan_terlambat` atau `spj_terlambat` (Perban 4/2020 Pasal 21 ayat 1, 2) |
| 7 jitupasna | ada catatan rehab (wajib `tgl_jitupasna`) | kaji `masuk_jitupasna` tetapi belum ada rehab | macet pasal `r3p`: hari-0 + 90 hari, hari-0 = `tmt_mulai` SK tingkat `tanggap` paling awal; hanya bila SK tanggap ada dan belum ada rehab |
| 8 hibah | rehab `selesai` atau `ditolak` | rehab `usulan` sampai `dibangun` | mandek bila tanda `macet` rehab (60 hari, asumsi); macet pasal bila ada baris Kalender hibah KIB itu berstatus lewat |

Status jalur: `belum_mulai`, `berjalan`, `selesai`, `tidak_berlaku` (penanda admin di `rantai_tahap_batal`, mengalahkan yang lain), `macet`. `macet` membawa `jenis` = `pasal` atau `mandek`, `sejak` (jatuh tempo pasal, atau waktu terakhir ditambah ambang), `alasan` (teks siap tampil beserta pasal), dan `acuan` bila pasal.

Ringkasan kejadian:
- `posisi` = jalur berurutan tertinggi yang `selesai` atau `berjalan`.
- `macet` = jalur macet paling awal; sisanya jadi lencana "+n".
- `umur_macet_hari` = lantai((kini - `sejak`) / 1 hari).
- Urutan daftar: `macet.jenis = pasal` dulu, lalu `mandek`, masing-masing `umur_macet_hari` menurun, lalu kejadian tanpa macet menurut waktu entri terakhir.
- Corong: hitung kejadian per `posisi`, dan hitung terpisah yang macet per jalur.

Penautan (menjaga data bersih):
- KIB wajib 16 angka, ada di `logbook_kib`, `prov` sama dengan catatan, dan kabupaten sama. Selain itu jawaban "tidak ditemukan" (pola `cariInduk`).
- Satu catatan paling banyak satu tautan; meja `pengaduan` ditolak.
- Saran: kejadian logbook satu `prov|kab` dengan `mulai` dalam 14 hari dari tanggal catatan (`sk_gabung_hari`, ambang yang sudah ada), diurutkan paling dekat; maksimal 5; hanya usulan.

Contoh uji: kejadian buka, `t_awal` = 2026-11-01 08:00 WIB, tanpa catatan kaji, kini = 2026-11-02 08:01 WIB: jalur 2 `macet pasal`, `sejak` = 2026-11-02 08:00, `umur_macet_hari` = 0. Kini = 2026-11-04 08:01: `umur_macet_hari` = 2.

## 2. Kalender Kewajiban

Baris = {prov, kab, kunci, label, jatuh_tempo (YYYY-MM-DD), sisa_hari, status, acuan, letak, asumsi, sumber (`meja` atau `jangkar`), ref}.

`sisa_hari` = hari kalender WIB antara kini dan `jatuh_tempo`. Status: `terpenuhi` (ada baris `kw_penuhi` atau meja sudah memenuhi), `lewat` (`sisa_hari` < 0), `dekat` (0 sampai `jam_dekat_hari`, 30, asumsi), `ada_waktu`, `tanpa_jangkar` (tanggal jangkar belum diisi), `periksa` (khusus setor sisa dana).

Baris dari jangkar (kunci jangkar di `kw_jangkar.kunci`):

| Baris | Jangkar | Jatuh tempo |
| --- | --- | --- |
| hibah_berkala tahap k | `hibah_spph`, `hibah_akhir_pelaksanaan` | akhir tahap = SPPH + 3k bulan; jatuh tempo = akhir tahap + 15 hari kalender (tafsir kita). Tahap k ada selama SPPH + 3(k-1) bulan masih sebelum akhir pelaksanaan. |
| hibah_akhir | `hibah_akhir_pelaksanaan` | + 60 hari kalender |
| hibah_setor | `hibah_akhir_pelaksanaan` | + 120 hari kalender. Berstatus `periksa` (bukan `lewat`) sampai petugas menandai terpenuhi dengan keterangan "tidak ada sisa dana" atau tanggal setor, karena kewajiban hanya ada bila sisa dana masih di kas daerah (Perban 4/2024 Pasal 29 ayat 1) |
| hibah_bukti_setor | tanggal setor + batas setor | bukti terpisah paling lambat 3 hari kalender setelah batas setor (Juklak 9/2024 hal. 12); baris muncul hanya bila setor belum ditandai sebelum laporan akhir |
| rpbd_tinjau | `rpbd_tetap`, `rpbd_tinjau_terakhir` | lebih besar dari keduanya + 24 bulan |
| rpbd_monev | `rpbd_tetap`, `rpbd_monev_terakhir` | lebih besar dari keduanya + 12 bulan |
| pelatihan_lapor | `pelatihan_selesai` (per kegiatan) | + 7 hari kerja; hanya akun penyelenggara (Q7) |

Baris dari meja (tidak butuh input baru): DSP (laporan perkembangan tanggal 5 bulan berikutnya, SPJ 3 bulan sesudah status berakhir), renkon (berlaku sampai, reviu), Destana (penilaian per desa + 3 tahun; baris rekap "N desa lewat"). Perhitungan memakai `tandaBahaya` dan `tenggat()` yang sama dengan Meja Kerja (`src/meja_spek.js`), supaya tidak ada dua rumus.

Contoh uji (tanggal WIB):
- SPPH 2026-01-31, tahap I: akhir tahap 2026-04-30 (31 Jan + 3 bulan dipangkas), jatuh tempo 2026-05-15.
- Akhir pelaksanaan 2026-12-31: hibah_akhir 2027-03-01; hibah_setor 2027-04-30; bukti setor terpisah 2027-05-03.
- RPBD ditetapkan 2026-02-28, tanpa peninjauan lain: rpbd_tinjau 2028-02-28 (tanggal sama 24 bulan kemudian; 2028 kabisat tetapi tanggal 28 ada, jadi tidak digeser ke 29).
- Pelatihan selesai Jumat 2026-11-06, `libur_nasional` kosong: lapor Selasa 2026-11-17 (7 hari kerja Senin-Jumat setelah tanggal mulai).

Rekap staf: per `kunci`, jumlah BPBD berstatus `lewat`, `dekat`, `tanpa_jangkar`, `terpenuhi`.

## 3. Rapor SPM (blok `spm` di hasil `hitungRapor`)

Jendela: tahun kalender berjalan WIB (asumsi, berlabel). Hanya catatan meja `spm_respons` dan `spm_kie` dengan `dummy = 0` kecuali permintaan dummy.

Per kabupaten:
- Respons (Juklak 6/2026 hal. 8): `respons_menit` = `t_siap` - `t_lapor`; memenuhi bila <= `nilai("spm_respons_menit")` = 25. Keluaran: `n`, `memenuhi`, `median_menit`.
- Tempuh: `tempuh_menit` = `t_tiba` - `t_kerah`; memenuhi bila <= `nilai("spm_tempuh_menit")` = 150. Dua deret: semua kasus, dan kasus `hambatan = tidak`, karena waktu tempuh standar ditetapkan tanpa memperhitungkan hambatan (hal. 8 butir 3c).
- Laporan akhir (hal. 13): terlambat bila `tgl_laporan_akhir` > `tgl_henti` + 14 hari kalender, atau belum ada dan kini melewati batas itu. Keluaran: `n`, `terlambat`.
- KIE (Juklak 7/2026 hal. 7): `n_tatap_muka` dalam tahun berjalan. Target 2 bila kelas risiko `tinggi`, 1 bila `sedang`; kelas tidak diketahui (Q11) berarti target kosong dan status kosong.
- Juklak 4 dan 5: objek tetap `{ada_angka: false, alasan}`.

Aturan tampil angka: bila `n` < 5, persen tidak dihitung; keluarannya hanya "k dari n". Tanpa vonis lulus atau gagal (Q9); keluaran memberi angka dan jumlah kasus saja.

Validasi masukan `spm_respons`: `t_lapor` <= `t_siap` <= `t_kerah` <= `t_tiba`, tiap selisih <= 7 hari, selain itu ditolak. Operasi yang belum selesai memiliki cap waktu kosong dan tidak dihitung di `n` untuk indikator yang bergantung padanya.

Contoh uji: 6 operasi dengan respons 10, 20, 25, 26, 40, 15 menit: n = 6, memenuhi = 4, persen = 67, median = 22,5. Dengan 4 operasi: keluaran "3 dari 4", tanpa persen.
