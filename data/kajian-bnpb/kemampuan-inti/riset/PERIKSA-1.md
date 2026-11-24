# Pemeriksaan bersih pertama paket Kemampuan Inti (25 Nov 2026)

Saya memeriksa paket data/kajian-bnpb/kemampuan-inti/ (sekitar 35 klaim dicek ke kode di HEAD 404b51269). Tidak ada berkas yang disunting.

## 1. Salah fakta

1. **HARUS: Q3 dan KI-02 salah membaca kode.**
   - Q3 menulis "layar dan CAP memakai Moderate = Waspada". Kenyataannya `src/peringatan.js:83` berisi `TINGKAT_CAP = {Severe: "Siaga", Extreme: "Awas"}`, jadi Moderate sama sekali tidak masuk peringatan terpadu dan CAP.
   - Bawaan Q3 karena itu bukan "ikut layar". Ia menambah alarm publik baru (Moderate menjadi Waspada di CAP dan layar alarm).
   - Kedua pemetaan dipatok uji gerbang PB-42 (`tests/cuaca/pb42.test.mjs:11-17`: "hanya Severe dan Extreme ... tingkat resmi tidak dinaikkan"). Selisih ini sengaja dicatat di `paritas-bencana/ALGORITMA.md:65`.
   - KI-02 jadi mengubah gerbang yang sudah SELESAI dan mengubah peringatan publik. Keduanya keputusan pemilik, bukan bawaan.
   - Yang benar-benar tidak konsisten hanya sisi email: `src/ews.js:48` memetakan Severe ke 3 (Awas), sedangkan CAP memetakan Severe ke Siaga.
2. **HARUS: KI-03 dan Q2 bertentangan dengan keputusan pemilik.**
   - `data/kajian-bnpb/prediksi-besok/KEPUTUSAN-BESOK.md` K12 (19 Nov, jawaban pemilik) menetapkan gelombang /prediksi Sedang mulai 1,25 m.
   - D6 di dokumen yang sama memasang aturan "Hari tidak melaut" pada `GEL.hs >= 1,25`.
   - Bawaan Q2 ("Waspada mulai 2,5 m seperti `dasar.py`") membatalkan K12 dan mematikan aturan melaut.
   - Nilai yang dikutip benar (`scripts/cuaca/dasar.py:12-13`; `scripts/prediksi/catat.py:45-46`). Tetapi dua tabel itu mengukur hal berbeda (kategori BMKG Maritim lawan ambang dasar cuaca), jadi tidak bisa diseragamkan tanpa pemilik.
3. **HARUS: KI-05 bagian cuaca sudah ada.**
   - `scripts/cuaca/verifikasi.py:51-80` sudah menghitung `klimatologi_alarm_sama` per lead dan `persistensi`.
   - `scripts/cuaca/uji_logbook.py:7,96-124` juga sudah punya klimatologi kab x bulan pada jumlah alarm sama, persistensi, dan selang ETS.
   - Klaim RISET temuan 3 ("cuaca ... hindcast tanpa pembanding naif") salah.
   - Pembanding itu juga sudah menjadi isi PB-50 (`paritas-bencana/TIKET.md:91`).
   - KI-05 sebaiknya dipersempit ke udara saja. `prakiraan.json` `galat.metar` memang belum punya pembanding.
4. **HARUS: KI-34 sudah selesai.** `risiko_produksi.py harian` sudah terjadwal di `.github/workflows/data.yml:216-229`, lengkap dengan pemulihan dari R2. Tiket ditutup.
5. **HARUS: KI-22 (`CCA_B`) duplikat `CEX_B`.** `scripts/prediksi/bayangan/model.py:4,41` sudah punya model bayangan cuaca ekstrem `CEX_B` (logit dengan koefisien kab terhadap kejadian DIBI). RISET M14 Cca ✓ pun mengakuinya.
6. **HARUS: bukti siap KI-12 pasti gagal.** `scripts/sebaran/gerbang.py:149` menulis `"dibuat": time.strftime(...)`, jadi `git diff --exit-code public/data/gerbang_model.json` merah di hari lain. Golden harus membandingkan isi tanpa `dibuat`.
7. **SEBAIKNYA: klaim "karhutla satu-satunya yang mengalahkan pembanding" berlebihan.**
   - Di `public/data/gerbang_model.json`, `model_sel`, `mesin_fisika`, dan `jejak_api` semuanya kalah dari persistensi (selang95 seluruhnya negatif).
   - `lolos` (selisih 0,364) juga `boleh_tampil=false`, karena `selang95` masih null dan vonis prospektif belum keluar.
   - KEPUTUSAN bagian "Masalah" dan RISET temuan 1 perlu menyebut ini.
8. **SEBAIKNYA: matriks salah di beberapa sel.**
   - **E2 (tangga bersumber):** Krh, Bnj, dan Rob ditandai ✓, padahal kamusnya di `public/ews_tindakan.js:20-50,123-131` tanpa `rujukan`. Hanya cuaca, gempa, tsunami, udara, dan gunung api yang punya. KI-56 hanya mencakup longsor.
   - **E10 Kkr ✗:** salah. `scripts/umum/saran_status.py:14,41,142` sudah menyarankan status kekeringan (berlabel hipotesis). Cuaca sengaja dilewati dengan alasan tertulis (`:16,44`), jadi KI-55 untuk cuaca melawan alasan itu.
   - **D1 Lsr ✗:** salah. `scripts/prediksi/terbit.py:7-10` sudah menghitung paparan longsor (penduduk kecamatan bahaya tinggi, sekolah, faskes, Sphere). KI-61 sebagian besar duplikat.
   - **E4 web push:** Lsr, Cca, dan Udr ✓ berasal dari prakiraan model (`src/pw_inti.js:10` `JENIS_PW` = BNJ, LSR, ASP, CEX, ditandai "belum teruji"), bukan sumber resmi. E4 Krh ✓ tidak ada di `JENIS_PW`.
9. **CATATAN: path dan berkas uji salah.**
   - KI-16 menyebut `scripts/banjir/petabencana.py`. Berkas itu tidak ada; yang ada `scripts/banjir/genangan/petabencana.py`, yang beku di J4 sidik.
   - KI-46 menyebut `tests/banjir/sim_longsor.test.mjs`. Berkas itu belum ada, jadi harus ditandai "(baru)".
   - KI-15: titik potong udara ada di tiga tempat (`scripts/udara/alat.py:18`, `scripts/udara/kualitas.py:20` dengan 4 batas, `public/udara/murni.js:5`). Komentar `murni.js:3` merujuk ke `kualitas.py`, bukan `alat.py`.
10. **Terverifikasi benar (untuk catatan):**
    - KI-01: longsor terkirim lewat `nilaiTitik` (`src/ews.js:196-199`) tanpa `sumber_jenis`, padahal `penilaiLongsor` (`:292-302`) menandainya hipotesis.
    - KI-04:
      - `model_guncangan.json:891-900` tertulis "belum_diuji", padahal `kajian_magma.json` mencatat `banding_mmi.semua.n=1474` (n = pasangan tempat, bukan jumlah gempa; `kajian=496`).
      - `gnss.py:265` menyebut `peluang_gempa.py`, padahal `peluang_gempa.py` tidak memakai GNSS.
      - Komentar `lintas.yml:332` bilang beruntun "belum dirantai", padahal `:345` menjalankannya.
    - Catatan KI-04: `kajian_magma.py` mengimpor `guncangan.py` (`:112-113`). Menulis hasil MAGMA dari dalam `guncangan.py` membuat ketergantungan melingkar; lebih aman ditulis oleh pembaca terpisah.

## 2. Duplikat dan tumpang tindih

11. **HARUS: D1(e) dilanggar oleh tiket F1 sendiri.**
    - KI-10 dan KI-11 hanya membuat berkas baru tanpa pemakai.
    - KI-12 hanya punya karhutla sebagai pemakai.
    - KI-14 hanya udara di tiket itu.
    - KI-17 tanpa pemakai bencana.
    - Mesin metrik sudah ada di 30+ berkas (`scripts/banjir/prospektif.py`, `scripts/cuaca/uji_logbook.py`, `scripts/prediksi/nilai.py`, dan lain-lain). "Implementasi lama tidak ditulis ulang" berarti ini salinan ke-N tanpa pemakai.
    - Perbaikannya: tiap tiket mesin wajib memasang dua pemakai nyata di tiket yang sama, dan jangan memigrasikan berkas yang sudah bersidik.
12. **SEBAIKNYA: KI-40 bukan "dibangun sekali".** Peringkat perlakuan sudah ada empat salinan: `public/sim_perlakuan.js`, `public/banjir/sim_tanggap.js`, `public/gunungapi/sim_tanggap.js`, `public/kekeringan/sim_tanggap.js`. Mengekstrak hanya dari gunung api menambah salinan kelima. Tiketnya harus menyatukan yang ada dengan uji golden masing-masing.
13. **SEBAIKNYA: tiga tiket rob menilai hal yang sama.**
    - KI-06, KI-23, dan KI-25 sama-sama menilai rob terhadap label.
    - KI-06 memakai 26 kejadian DIBI. Dibagi latih dan uji, hasilnya hampir pasti TIDAK MEYAKINKAN. Padahal `public/pesisir/data/rob_kejadian.json` punya 565 kejadian di 179 kab.
    - Tiga tiket ini sebaiknya digabung.
14. **SEBAIKNYA: KI-66 harus memakai sumber Sphere yang sudah ada.** Angka Sphere sudah ada di `scripts/prediksi/aturan.json` (dipakai `terbit.py:226`) dan `src/siklus_hitung.js:196`, yang menyebut Perka 7/2008 sebagai acuan. KI-66 harus memakai `aturan.json`, bukan membuat rumus bersama baru.
15. **CATATAN: KI-50 bersinggungan dengan paket PWA.** Untuk push, KI-50 harus merujuk `data/kajian-bnpb/pwa-peringatan/KEPUTUSAN-PWA.md` Q13 (bawaan: peringatan resmi BMKG tidak diteruskan lewat push pada rilis pertama) dan Q2, bukan hanya PB-*.

## 3. Kegunaan (D1)

16. **SEBAIKNYA dibuang atau dirombak:**
    - **KI-17 (gerbang lisensi):** "memindai impor" tidak bisa diperiksa mesin secara bermakna, kasus nyatanya hanya MIROVA, dan tidak menghasilkan satu pun D1(a)-(e).
    - **KI-33 bagian karhutla:** peluang tahunan ≥1 cluster per kab di kab rawan nyaris 1, jadi tidak informatif. Bagian gunung api (GVP per gunung) n-nya kecil.
    - **KI-45:** satu kejadian per replay (Seroja, Tapanuli) dan sudah diduga TIDAK MEYAKINKAN. Tanpa vonis, ini bukan D1(b).
    - **KI-32 (GMP):** BSS susulan hanya 0,0021, jadi tidak ada keluaran yang lolos.
    - **KI-13:** vonis per wilayah di `ambang_kab.py` sudah dibuka di logbook 2026. Menjalankan ulang aturan pilih baru di set uji yang sama bukan bukti baru. Syarat "vonis harus sama" juga tidak dijamin karena metodenya berbeda (shrinkage lawan pilih menang).
17. **CATATAN:**
    - KI-27: status 4 tingkat dihitung dari FIRMS dan labelnya juga dari FIRMS, jadi persistensi kemungkinan besar menang. Tetap berguna (D1 a), tetapi vonisnya bisa ditebak.
    - ALGORITMA §5 ambang "klimatologi + 0,05" dan "≥80% bulan" adalah angka tanpa sumber, jadi harus ditandai bawaan sementara.

## 4. Berbahaya

18. **HARUS: KI-54 merusak uji beku.** Tiket ini mengubah `level_banjir` di `scripts/banjir/status.py`, padahal sha256 fungsi itu masuk sidik `siaga_persentil` (`scripts/banjir/PRAREG-SIAGA-PERSENTIL.md:86-89`; `siaga_persentil.py:454,505`, menolak dengan kode 4). Akibatnya uji prospektif yang sedang jalan berhenti. Ia juga mengubah status publik (email dan CAP banjir) tanpa keputusan pemilik.
19. **HARUS: KI-43 menyentuh berkas beku.** `scripts/banjir/nowcast_jkt.py` ada dalam `SIDIK_DAFTAR`-nya sendiri (`:34,54`, butuh amandemen tertulis), dan `nowcast_jkt.buka` sudah ada. Perubahan `tempuh` harus dipindah ke berkas baru yang hanya membaca.
20. **HARUS: KI-42 membakar set uji gerbang karhutla.** Pengali laju dikalibrasi pada 123 kasus yang sama dengan set uji gerbang `mesin_fisika` (`scripts/sebaran/gerbang.py:9-10,161`). Pakai pembagian waktu, atau set kasus baru.
21. **HARUS: Q1 dan KI-01 melawan D7 sendiri.**
    - D7, Paritas Q17, dan AGENTS §2.40 yang baru semuanya bilang hipotesis tidak dikirim keluar. Bawaan Q1 tetap mengirim email longsor.
    - Rob sama persis: email rob terkirim dari model (`src/ews.js:212-216`), padahal D7 menggolongkan rob "belum lolos". KI-01 tidak mencakup rob.
    - Push PWA juga mengirim LSR, CEX, dan ASP yang "belum teruji". Itu sah menurut PWA Q2, tetapi bertentangan dengan D7.
    - Pemilik harus memilih satu aturan.
22. **SEBAIKNYA: KI-26 dan KI-60 berdekatan dengan berkas beku.**
    - KI-26 jangan memakai label atau periode uji `PRAREG-LHASA2` (sudah bersidik, `scripts/longsor/model_lhasa2.sidik`).
    - KI-60 dan KI-44 tidak boleh menyunting `public/banjir/sim_genangan.js` dan `scripts/banjir/umum.py`, yang beku sidik J4 (`scripts/banjir/genangan/j4_sidik.json`).
23. **CATATAN: urutan AGENTS §3.7.** AGENTS.md §2.40 sudah ditambahkan di tree kerja sebelum pemeriksaan bersih ini selesai, padahal §3.7 mengurutkan: paket, pemeriksa, baru bagian §2.

## 5. Yang terlewat dari R1-R4

24. **SEBAIKNYA ditambah ke matriks atau "Tidak dibawa":**
    - Rob tidak punya tiket untuk layar alarm, CAP, atau push, padahal RISET temuan 4 menyebutnya. Tiket kanal resmi rob BMKG tidak ada; KI-50 tidak memuat rob.
    - Kamus tangga untuk pesisir dan kekeringan tidak ada di `public/ews_tindakan.js`.
    - Karhutla, banjir, dan rob tanpa `rujukan` (lihat poin 8).
    - Dari R4 "TEKNIK UNIK" nomor 4, 7, dan 9, tidak ada di matriks:
      - koreksi Bonferroni lintas rancangan (`ambang2.py`);
      - MOS per stasiun dan GEV L-momen untuk bias hujan HJN dan ambang banjir (`synop.py`, `iklim_stasiun.py`);
      - tangga resmi lawan kita untuk gunung api dan udara (`tangga.py`).
    - R4:98 mencatat "CAP masih menyebut 5 jenis lama". Ini informasi salah kecil, layak masuk F0.
    - Arah abu prospektif hanya dibanding acak 25% (`scripts/gunungapi/prospektif.py:8,97`), padahal `uji_abu.py:14-18` menilai klimatologi lebih jujur. KI-41 harus menambahkan klimatologi juga ke prospektif, dan klaim "lulus awal" di KEPUTUSAN perlu dilunakkan.

## 6. Konsistensi internal

25. **SEBAIKNYA:**
    - **M18 (deteksi lonjakan):** menunjuk KI-53, padahal tiket lonjakan adalah KI-52.
    - **S3 (evakuasi berkapasitas):** menunjuk KI-43, padahal KI-43 adalah faktor sisi aman (S4). Sel ✗ S3 untuk Rob, Lsr, Pss, dan Cca tidak punya tiket.
    - **KI-02, 03, 06, 27, 52, 54, 70, 71:** ada di TIKET tetapi tidak ada di matriks. Ini boleh, tetapi sebaiknya ada kolomnya.
    - **Sel ✗ tanpa tiket:** banyak, misalnya M6 Gna dan Kkr, M8 Rob, Lsr, Pss, dan Cca, M14 Rob, Pss, Gmp, dan Gna, S2 Rob, Pss, dan Tsn, D2 Rob, Lsr, Cca, dan Gna. KI-70 akan lolos per baris, tetapi tidak per sel. Aturannya harus memeriksa per sel.
    - **Ketergantungan aneh:** KI-42 bergantung pada KI-44, dan KI-46 bergantung pada KI-40 (run-out tidak butuh mesin perlakuan).
    - **Rujukan Q** (Q1→KI-01, Q2→KI-03, Q3→KI-02, Q4→KI-60, Q5→KI-51, Q6→KI-30) cocok dua arah.

Berkas utama yang diperiksa:
- data/kajian-bnpb/kemampuan-inti/TIKET.md
- data/kajian-bnpb/kemampuan-inti/RISET.md
- data/kajian-bnpb/kemampuan-inti/KEPUTUSAN-KEMAMPUAN.md