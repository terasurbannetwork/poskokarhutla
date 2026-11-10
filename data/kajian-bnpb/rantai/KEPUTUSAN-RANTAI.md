# KEPUTUSAN-RANTAI: Rantai Kejadian, Kalender Kewajiban, Rapor SPM

Dokumen ini menang atas dokumen lain di folder ini. Hanya pemilik yang boleh mengubah bagian "Sudah diputuskan". Pertanyaan terbuka tidak boleh dijawab agent dengan karangan: berhenti dan tanya pemilik.

Urutan otoritas: KEPUTUSAN-RANTAI > RISET > PRD > ALUR > ALGORITMA > DESIGN-SYSTEM > DESAIN-TEKNIS > KEAMANAN-PRIVASI > RENCANA-UJI > TIKET. Dasarnya `data/hukum/peta_peraturan.json` dan `docs/bnpb/PETA-PERATURAN.md` (10 Nov 2026). Angka dan pasal di paket ini dibaca dari teks penuh `data/hukum/teks/*.txt.gz`; yang tidak ketemu ditulis sebagai pertanyaan.

## Sudah diputuskan (permintaan pemilik, 10 Nov 2026)

- D1. Tiga fitur dibangun sebagai satu paket: (1) Rantai Satu Kejadian, (3) Kalender Kewajiban per Daerah, (4) Rapor Standar Pelayanan Minimal BPBD. Fitur 6 (LogPal Siap Audit) ada di `data/kajian-bnpb/logpal/`.
- D2. Rantai Satu Kejadian: satu KIB (nomor 16 digit di `logbook_kib`) mengikat penilaian awal, kaji cepat, SK status, posko, logistik, Dana Siap Pakai, Jitupasna, dan hibah rehabilitasi-rekonstruksi. Pimpinan melihat tiap kejadian macet di tahap apa.
- D3. Kalender Kewajiban: Jam Aturan (`public/inti/jam_aturan.json`) diperluas menjadi tenggat nyata per BPBD: laporan hibah tiap 3 bulan dan setor sisa dana 120 hari (Juklak 9/2024), peninjauan RPBD (Perban 3/2026), penilaian Destana (Perban 7/2025), laporan pelatihan (Perban 2/2025).
- D4. Rapor SPM BPBD memakai Juklak 4, 5, 6, 7 tahun 2026 dan waktu respons 25 menit, di atas Rapor Kinerja yang ada (`RAPOR` di `src/meja_spek.js`).
- D5. Ditunda pemilik, TIDAK dimasukkan: dasar hukum di tiap keputusan, Keadaan Tertentu, penjaga status peraturan.
- D6. Akses D1 baru hanya di `src/hak.js` (gerbang `tests/agen/gerbang-d1.test.mjs`). Meja Kerja, Logbook, dan LogPal dipakai ulang, tidak ditulis ulang.
- D7. Satu pengerja lain sedang menambah meja `pengungsi`, `pengaduan`, `klaster`, `risiko`; paket ini menganggapnya sudah ada (11 meja). Rantai tidak menyentuh meja `pengaduan` (identitas pelapor).

## Keputusan teknis agent (boleh diubah pemilik)

- T1. Tempat: `/bnpb/rantai` dan `/bnpb/kalender` di Ruang BNPB; blok SPM masuk Rapor Kinerja yang sudah tampil di `public/admin/pimpinan.js` lewat `GET /api/meja/rapor`.
- T2. Kunci rantai = KIB. Tautan catatan meja ke KIB lewat tabel samping 1:1 `rantai_tautan` (bukan ALTER `meja_catatan`, pola 0027/0055). Penautan dilakukan manual oleh pemilik catatan; sistem hanya menyarankan kejadian satu kabupaten dengan tanggal berdekatan, tidak pernah menautkan sendiri.
- T3. Rantai tidak menyimpan salinan angka. Semua dibaca dari sumber (logbook, meja). Tabel baru hanya: tautan, penanda "tahap tidak berlaku", jangkar tanggal kalender, dan pemenuhan kewajiban.
- T4. Kalender memakai `tenggat()` dari `public/inti/jam_aturan.js`. Kunci baru ditambahkan ke `jam_aturan.json` dan `jam_aturan.js` (kembar) dengan kutipan persis dari pasal, lolos `gerbang-jam-aturan`. Tidak ada angka tertanam di kode.
- T5. Kalender tidak menggantikan aplikasi E-Pelaporan BNPB (Juklak 9/2024 hal. 9-11). Ia mengingatkan dan mencatat tanggal terpenuhi, tidak menerima isi laporan.
- T6. Tanda macet dibedakan: "lewat tenggat pasal" (dari kunci berpasal) dan "mandek" (dari ambang internal berlabel asumsi, sudah ada di Jam Aturan). Tahap tanpa tenggat tidak pernah dilabeli terlambat.
- T7. Rapor SPM adalah blok terpisah, tidak masuk `gabungSkor`/`RAPOR.bobot` (bobot Rapor Kinerja masih sementara). Hasilnya angka dan jumlah kasus, tanpa vonis lulus atau gagal sampai pemilik menetapkan ambangnya (Q9).
- T8. Indikator SPM yang Juklak-nya tidak memberi angka tidak dibuat (Juklak 4/2026 tidak menyebut frekuensi gladi; Juklak 5/2026 tidak memuat angka). Lihat RISET §3.
- T9. Dua meja baru lewat mesin Meja Kerja: `spm_respons` dan `spm_kie`, dengan tipe kolom baru `waktu` (menit, WIB).
- T10. Rapor SPM dan Kalender hanya untuk petugas BPBD kabupatennya sendiri, staf berwilayah, dan admin. Tidak ada di `/api/meja/rapor/publik`.
- T11. Dummy mengikuti `~/.claude/DUMMY.md`: dua ikon, Super Admin saja, isinya ditentukan halaman. Klik, tab, dan paginasi mengikuti `~/.claude/INP.md`.
- T12. Kejadian tanpa KIB (jenis `lainnya`, atau kejadian lama tanpa `kab_bps`) tidak punya rantai; layar menulis alasannya, tidak menebak.

## Pertanyaan terbuka untuk pemilik

Rantai dan Kalender:
- Q1. Siapa yang boleh melihat rantai lintas BPBD: peran staf mana (pimpinan, koordalops, pusdalops)? Apakah BPBD melihat rantai kejadian kabupaten lain? Usulan awal: BPBD hanya kabupatennya, staf sesuai wilayahnya, admin semua.
- Q2. Kejadian anak (`logbook_narasi.induk_id`, kejadian utama lintas wilayah): rantainya digabung di kejadian induk atau tiap KIB berdiri sendiri?
- Q3. Tahap "Posko" tidak punya status baku; sumbernya isian bebas `posko` di entri logbook. Cukup "ada isian posko" sebagai tanda tahap selesai?
- Q4. Tahap "Hibah rehab-rekon" dibaca dari meja `rehab` (model stimulan rumah). Hibah RR menurut Perban 4/2024 mencakup konstruksi dan nonkonstruksi (Pasal 9 ayat 1 huruf e, g, hal. 6). Cukup meja `rehab`, atau perlu meja hibah baru?
- Q5. Tanggal SPPH, PHD, dan akhir masa pelaksanaan hibah tidak ada di sistem. Siapa yang memasukkan: BPBD penerima, atau staf Deputi Rehabilitasi dan Rekonstruksi?
- Q6. RPBD belum ada di sistem (meja `renkon` adalah rencana kontinjensi). Tanggal penetapan Perkada RPBD, peninjauan terakhir, dan pemantauan-evaluasi terakhir dimasukkan siapa?
- Q7. Laporan pelatihan (Perban 2/2025 Pasal 14 ayat 3-4, hal. 6) dikirim penyelenggara pelatihan ke Kepala Pusdiklat PB, dan penyelenggara adalah Pusdiklat PB atau Lembaga Penyelenggara Pelatihan Terakreditasi (Pasal 17 ayat 1, hal. 7). BPBD baru terkena bila ia penyelenggara terakreditasi. Kalender memuat baris ini hanya untuk akun yang ditandai penyelenggara; setuju?
- Q8. Penilaian Destana "dapat dilakukan" (Pasal 14 ayat 1, hal. 7) tetapi jaraknya "paling sedikit setiap 3 (tiga) tahun" (ayat 5). Ditampilkan sebagai kewajiban (merah bila lewat) atau jadwal anjuran?

Rapor SPM:
- Q9. Juklak 6/2026 menetapkan waktu respons paling lama 25 menit dan waktu tempuh 150 menit (hal. 8) per operasi, tetapi tidak menetapkan berapa persen kasus yang harus memenuhi. Berapa ambang "memenuhi SPM" per kabupaten?
- Q10. Definisi cap waktu: respons dihitung "sejak informasi/laporan kedaruratan diterima sampai unit pencarian dan pertolongan siap diberangkatkan", tempuh "sejak unit dikerahkan sampai tiba di lokasi" (hal. 8). Apakah "siap diberangkatkan" dan "dikerahkan" dua cap waktu berbeda, dan siapa (Pusdalops BPBD) yang mencatatnya?
- Q11. Juklak 7/2026: sosialisasi minimal dua kali setahun di kabupaten/kota risiko tinggi dan sekali setahun di risiko sedang (hal. 7). Kelas risiko kabupaten diambil dari sumber mana (InaRISK, IRBI, atau yang lain)?
- Q12. Juklak 4/2026 (gladi) tidak memuat frekuensi dan Juklak 5/2026 (peralatan) tidak memuat angka; Juklak 5 menunjuk "petunjuk pelaksanaan standar minimal kebutuhan logistik dan peralatan" (hal. 6, 8), yang sama dengan Q4 LogPal (belum didapat). Indikator keduanya dibiarkan tidak diukur sampai ada angka dari pemilik atau dokumennya?
- Q13. Rapor SPM antar-BPBD boleh dibuka ke publik kelak, atau tetap internal?
- Q14. Rapor SPM digabung ke skor Rapor Kinerja (perlu bobot) atau tetap blok terpisah?
