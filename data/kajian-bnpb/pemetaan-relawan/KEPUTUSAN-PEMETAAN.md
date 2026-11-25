# KEPUTUSAN-PEMETAAN: Pemetaan bangunan oleh relawan (HOT Tasking Manager)

Dokumen ini menang atas semua dokumen lain di folder ini. Keputusan pemilik dicatat apa adanya. Hal yang belum diputuskan ada di bagian Q dan tidak dijawab dengan karangan; bawaan sementaranya ditandai **[BAWAAN SEMENTARA]**.

## Masalah

Peta paparan per bangunan hanya sebaik data bangunannya. Paparan memakai Google Open Buildings v3, bukan OpenStreetMap (`scripts/umum/bangunan.py:1`, `scripts/siklus/paparan.py:1`, `src/bangunan.js:1`). OSM hanya dipakai sebagai cadangan kepadatan gedung kasar di Jakarta (`scripts/banjir/genangan/gedung.py:1-6`). Pangsa sumber Overture baru disampel untuk Banda Aceh dan Jakarta (`scripts/siklus/sumber.json:209-223`). Tidak ada ukuran kelengkapan bangunan OSM per kab dan tidak ada integrasi Tasking Manager (hanya penarikan data proyek HOT per kejadian di `scripts/akademisi/sambung_panen.mjs:233`, indeks citra OpenAerialMap di `public/data/citra_terbuka.json`, dan sebutan HOTOSM di `data/kajian-bnpb/pustaka/4-ndpba.md`), dan kampus mitra (`/kemitraan`) belum bisa menerima tugas lewat kode: `km_masalah` (migrasi 0081) sudah dipakai `src/kemitraan_masalah.js`, tetapi `km_aktivasi`, `km_satgas`, `km_piket`, `km_pelajaran` (0083) belum dipakai satu pun berkas di `src/`.

## Keputusan pemilik

| No | Keputusan |
| --- | --- |
| K1 | 15 Nov 2026: Pemetaan bangunan oleh relawan disetujui sebagai fitur F8 ("Oke apa lagi", menerima butir 4 daftar ketiga). Sistem mendeteksi kab di zona bahaya yang bangunan OSM-nya masih tipis, lalu menyiapkan proyek pemetaan; mahasiswa kampus mitra `/kemitraan` jadi pemetanya. |
| K2 | Paket dokumen dulu, baru kode (AGENTS.md 3.7). |

## Keputusan rancangan (agent, bisa dibatalkan pemilik)

| No | Keputusan | Alasan |
| --- | --- | --- |
| D1 | Kelengkapan per kab = rasio bangunan OSM terhadap bangunan pembanding (Google Open Buildings, ambang 0,70), selalu berlabel metode "rasio, bukan kelengkapan mutlak". | Tidak ada kebenaran lapangan; rasio dua sumber adalah satu-satunya yang bisa dihitung. |
| D2 | Daftar prioritas = paparan bahaya x (1 - kelengkapan), tampil sebagai usulan berpil "Belum diuji" sampai ada uji sederhana (Bagian 4 ALGORITMA). | Konvensi modul Kemitraan: skor otomatis berpil sampai lulus uji. |
| D3 | Sistem hanya MENYIAPKAN proyek (AOI GeoJSON, teks instruksi, saran citra). Staf atau pemilik yang mengirim ke Tasking Manager lewat akun HOT sendiri. Tidak ada panggilan tulis otomatis ke HOT atau OSM. | Membuka proyek adalah tindakan ke luar, butuh akun dan tunduk pada pedoman organised editing OSM; AGENTS.md 9 melarang kiriman otomatis. |
| D4 | Kampus bergabung lewat `/kemitraan`; keikutsertaan dicatat di tabel baru yang menaut `km_satgas` atau institusi, bukan memperluas `km_aktivasi`. | `km_aktivasi` punya CHECK `bahaya` dan `radius_km` 50-500 yang tidak cocok untuk proyek pemetaan. |
| D5 | Sumbangan per kampus dihitung dari hashtag changeset `#CentuRisk-<kode>` yang dibaca balik dari API publik, hanya sebagai agregat per kampus per proyek. | Tanpa kunci API; nama pengguna OSM tidak disimpan di repo. |
| D6 | Hasil pemetaan tidak otomatis mengganti sumber paparan. Peralihan ke OSM per kab adalah keputusan sumber data terpisah (Q5). | Mengubah angka paparan butuh uji balik dan persetujuan pemilik. |
| D7 | Tampil hanya di dalam sesi staf dan akun kampus, tidak publik. | Daftar kab "bangunan tipis" bisa disalahbaca sebagai nilai wilayah. |

## Pertanyaan terbuka untuk pemilik (Q)

| Q | Pertanyaan | Bawaan sementara | Menahan |
| --- | --- | --- | --- |
| Q1 | Siapa pemegang akun HOT Tasking Manager (organisasi atau perorangan) dan siapa yang menyetujui proyek sebelum dikirim? | **[BAWAAN SEMENTARA]** pemilik memegang satu akun organisasi BNPB atau mitra HOT; staf Pusdalops menyiapkan, pemilik menyetujui. | HR-08 |
| Q2 | Apakah BNPB lebih baik menitipkan proyek ke HOT Indonesia atau komunitas OSM lokal (misalnya lewat kontak resmi) daripada membuka sendiri? | **[BAWAAN SEMENTARA]** ajukan koordinasi ke HOT lebih dulu; proyek sendiri hanya sesudah ada persetujuan komunitas. | HR-08 |
| Q3 | Nama pengguna OSM mahasiswa publik secara bawaan di OSM. Boleh ditampilkan di layar internal? | **[BAWAAN SEMENTARA]** tidak: layar hanya menampilkan agregat per kampus; nama pengguna tidak disimpan. | HR-06 |
| Q4 | Citra apa yang disarankan (Maxar Open Data, Bing, atau Esri) dan siapa yang memastikan lisensi tiap citra? | **[BAWAAN SEMENTARA]** hanya daftar saran; stafnya yang memilih di Tasking Manager. | HR-07 |
| Q5 | Bila kelengkapan OSM suatu kab melewati ambang, apakah paparan boleh beralih ke OSM atau Overture untuk kab itu? | **[BAWAAN SEMENTARA]** tidak beralih; hanya ditampilkan sebagai pembanding sampai ada keputusan sumber data. | HR-10 |
| Q6 | Ambang "tipis": rasio berapa? | **[BAWAAN SEMENTARA, HIPOTESIS]** rasio di bawah 0,6 = tipis; 0,6 sampai 0,85 = sedang; di atas 0,85 = memadai. Dikalibrasi dengan sampel manual 10 kab. | tidak menahan |
| Q7 | Berapa minimum peserta dan lama proyek agar layak dibuka? | **[BAWAAN SEMENTARA]** satu kampus, 10 pemeta, 30 hari. | tidak menahan |
| Q8 | Apakah kegiatan ini dihitung sebagai jam kegiatan mahasiswa (sertifikat `/kemitraan`)? | **[BAWAAN SEMENTARA]** ya, lewat modul sertifikat yang ada, sesudah KM-sertifikat hidup. | HR-09 |


## Jawaban pemilik 25 Nov 2026

Pemilik: "gas semua bawaan". Semua pertanyaan terbuka di berkas ini yang punya bawaan sementara kini **diputuskan sesuai bawaannya**, kecuali yang tertulis di bawah. Rekap pertanyaan: `data/kajian-bnpb/PERTANYAAN-TERBUKA.md`.

