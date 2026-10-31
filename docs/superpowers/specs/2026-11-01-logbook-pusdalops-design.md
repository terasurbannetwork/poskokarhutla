# Logbook Pusdalops: dari arsip ke sistem kerja

Tanggal: 1 November 2026. Status: rancangan, menunggu review pemilik.

## Latar

Arsip logbook harian Pusdalops BNPB 2011–2022 sudah terurai: 34.881 kejadian, 97,6% berkode
kab/kota (`prov|nama`). Hasil yang sudah ada dan di-commit (2683dcc6):

- `data/pusdalops/logbook_kejadian.csv` (versi bersih, tanpa teks bebas), `public/data/logbook_riwayat.json`
  (rekap kab x jenis x bulan/tahun, `tahun_ada`, `bulan_penuh`), data mentah di R2 privat
  `internal/pusdalops-logbook/`.
- Uji balik arsip (banjir gagal di luar-sampel 2022, longsor AUC 0,66, karhutla lift 2,26),
  silang DIBI, kalender `/prediksi`, lapisan peta kebakaran permukiman, dasbor tren (artifact).

Yang kita pelajari dari data dan memengaruhi rancangan ini:

1. Satu aturan hujan nasional gagal; pola musim berbeda antardaerah (Maluku, Maluku Utara,
   Sulawesi Tengah dan Tenggara memuncak Juni–Agustus, bukan Desember–Februari).
2. Pelaporan berat ke Jawa; provinsi Papua mencatat 0,3–1 kejadian per kab per tahun.
3. Median satu kejadian hanya dilaporkan satu kali: hampir tidak ada laporan lanjutan.
4. Input bebas melahirkan 1.423 ejaan kab/kota dan korban terhitung ganda.
5. Kendala lapangan terbanyak: akses jalan terputus (923), logistik/BBM (431), sinyal (306),
   sumber air untuk pemadaman (283), personel (248).

## Sub-proyek dan urutan

Kelima sub-proyek bebas satu sama lain kecuali yang ditandai. Tiap sub-proyek mendapat rencana
implementasi sendiri (skill writing-plans) sebelum dikerjakan.

| Kode | Sub-proyek | Bergantung pada | Pengerja |
| ---- | ---------- | --------------- | -------- |
| D | Input logbook baku | — | `warga-api` (rute, D1) + `ruang-bnpb` (layar) |
| C | Laporan otomatis | D (untuk data baru; arsip bisa langsung) | `ruang-bnpb` + mesin deck |
| B1 | Ambang hujan per kab | — | `banjir`, `longsor` → `validasi-model` |
| B2 | Deteksi daerah senyap | — | `pipa-data` |
| B3 | Saran stok logistik bulanan | kalender (sudah ada) | `ruang-bnpb` |
| B4 | Rantai bencana | — | `prediksi` |
| A | Peta publik riwayat dan musim | — | `layar-peta` |
| E | SOP pra-musim dan insight | kalender, kendala | `ruang-bnpb` |

Urutan yang diusulkan: D lebih dulu (akar mutu data); A, B1, B2 paralel karena memakai arsip;
lalu C, B3, B4, E.

## D. Input logbook baku

Tujuan: entri baru langsung terstruktur, tanpa salah ejaan wilayah, korban tidak ganda.

- Layar staf di `/bnpb/logbook` (login staf yang sudah ada). Satu entri = satu kejadian atau
  satu pembaruan atas kejadian yang sudah ada.
- Wilayah dipilih dari daftar `public/geo` (prov → kab/kota → kecamatan → desa), bukan diketik.
- Tombol "Lanjutan dari kejadian…": daftar kejadian terbuka di kab yang sama 14 hari terakhir.
  Pembaruan menimpa angka dampak terakhir, tidak menambah kejadian baru (memperbaiki temuan 3 dan 4).
- Kolom korban terstruktur: meninggal, hilang, luka, mengungsi (jiwa/KK), rumah RB/RS/RR/terendam,
  luas (ha). Pemeriksa wajar memakai `BATAS_WAJAR` yang sudah ada di `scripts/umum/laphar_arsip.py`.
- Kolom kendala dan kebutuhan berupa pilihan (kategori dari analisis arsip) plus catatan bebas.
- Impor dari WA: pesan bahan masuk lewat `src/wa.js`, diurai jadi draf entri yang dikonfirmasi petugas.
- Simpan di D1, migrasi baru bernomor urut (diperiksa `migrasi-idempoten`); migrasi produksi
  dijalankan pemilik.
- Pertanyaan terbuka: siapa pengisi (Pusdalops saja, atau juga BPBD). Rancangan ini mulai dari
  Pusdalops; akses BPBD menyusul sebagai peran baru tanpa mengubah skema.

## C. Laporan otomatis

- Laporan harian Pusdalops: dari entri D hari itu (07.00–07.00 WIB) ke deck harian lewat mesin
  `~/Documents/Laporan-Harian-BNPB/mesin` dan `src/laporan_bnpb.js`; bisa dikirim lewat bot WA.
- Laporan musim per provinsi: kejadian musim berjalan dibanding rata-rata 2014–2020 per jenis.
- Rapor kelancaran lapor BPBD: hari dengan laporan, jumlah laporan lanjutan, keterlambatan.
- Angka korban di laporan hanya dari entri D (terstruktur), tidak dari arsip lama.

## B. Peringatan dan operasi

- B1 Ambang hujan per kab: dari logbook 2014–2020 + ERA5, cari ambang hujan 1/3/7 hari per kab
  yang memisahkan hari berkejadian; uji luar-sampel di 2022 dan 2026; pembanding persisten wajib.
  Hanya menggantikan aturan nasional di kab yang lulus.
- B2 Daerah senyap: harian, kab dengan sinyal kuat (hujan di atas ambang B1, titik api, peringatan
  BMKG) tanpa laporan logbook/DIBI → daftar telepon untuk Pusdalops di `/bnpb`.
- B3 Saran stok: per gudang/provinsi per bulan, dari kalender kab dan kebutuhan terbanyak per jenis
  (makanan, tenda/terpal, sandang, air bersih untuk banjir; terpal dan material untuk longsor).
- B4 Rantai: 15,8% banjir diikuti longsor di kab yang sama dalam 3 hari; satu kejadian memicu siaga
  jenis lanjutan untuk kab itu dan tetangganya.

## A. Peta publik

- "Riwayat bencana di daerahmu": cari kab/kecamatan, tampil kejadian 2014–2020 per jenis, bulan
  rawan, "N dari 7 tahun". Kecamatan hanya bila nama kecamatan di logbook cocok dengan geo.
- Peta musim berjalan: geser bulan, warna per kab = jenis dominan bulan itu.
- Peta langganan bencana: kab dengan kejadian 7 dari 7 tahun, ditumpuk penduduk.
- Data terbuka agregat per kab per bulan (CSV) di `public/data`.
- Semua tanpa angka korban dari arsip, tanpa teks bebas, dengan catatan bias pelaporan.

## E. SOP pra-musim dan insight

- Daftar periksa per kab per bulan dari kalender, kendala terbanyak, dan kebutuhan terbanyak.
- Musim lokal: Maluku dan Sulawesi bagian tengah/timur siaga banjir Juni–Agustus; Aceh dan Riau
  siaga karhutla Februari–Maret.
- Laporan insight berkala (dasbor tren diperluas): pola per daerah, lonjakan, tren, kendala.

## Batasan yang berlaku untuk semua

- Repo publik: data mentah logbook tetap di `data/raw` dan R2 privat; yang terbit hanya agregat.
- Angka korban arsip tidak dipakai di mana pun.
- Tiap angka kinerja model melewati `validasi-model`; tiap layar melewati `selera-angka` dan `inp-reviewer`.
- Tidak ada deploy atau migrasi produksi dari subagent.

## Kriteria selesai per sub-proyek

- D: entri baru tersimpan dengan kode wilayah valid, lanjutan tidak menambah kejadian, uji `npm run uji:warga` hijau.
- C: laporan harian terbentuk dari entri D tanpa sunting manual untuk satu hari uji.
- B1: tabel ambang per kab + skor luar-sampel 2022/2026 lawan persisten, divalidasi.
- B2: daftar senyap harian muncul di `/bnpb` dengan alasan tiap baris.
- A: lapisan dan pencarian tampil di peta, uji layar hijau, dicek di browser.
- E: daftar periksa per kab per bulan tersedia di `/bnpb` dan bisa diekspor.
