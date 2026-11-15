# KEAMANAN-PRIVASI: Misi Udara

Otoritas: `KEPUTUSAN-MISI.md`. Pola: `data/kajian-bnpb/operasi-udara/KEAMANAN-PRIVASI.md`. Repo ini publik.

## 1. Kelas data

| Data | Kelas | Tempat | Siapa boleh baca |
| ---- | ----- | ------ | ---------------- |
| Flight plan jenis `dropping`, `pantau`, `evakuasi`, `angkut`, `cari` | operasional internal | bawaan di luar repo; tahap 2: R2 `operasi/misi/<tanggal>/<id>/` (awalan terpisah dari renlap Paritas, sehingga rute `/api/pb/renlap*` tidak bisa membukanya) | sama dengan `/api/operasi/peta` (Q10 [SEMENTARA]) |
| Flight plan jenis `kunjungan` | sensitif: rute pejabat | hanya di luar repo; tahap 2: R2 di balik sesi | hanya `pusdalops` (Q10 [SEMENTARA]) |
| Baris `pb_misi` (misi, status zona, tipe, total km, menit) | internal, tanpa nama | D1 | sama dengan jenis flight plannya |
| `batas_terbang.json`, `misi_templat.json` | bukan rahasia | repo | siapa pun; hanya angka bersumber |
| Zona manual per kejadian | operasional internal | bersama flight plan | sama |
| Hasil misi (F-15) | internal, tanpa nama | `pb_misi_hasil` | sama |

## 2. Aturan tetap

1. **Tanpa nama orang.** Nama kru, pilot, penumpang, korban, dan pejabat yang dikunjungi tidak disimpan dan tidak dicetak. Jumlah orang boleh, namanya tidak (prinsip 3 di KEPUTUSAN-MISI). Formulir menampilkan peringatan "tanpa nama" di kolom bebas dan membatasi panjangnya. Pemeriksa pola nama otomatis belum ada dan tidak diklaim ada.
2. **Keluaran bawaan di luar repo (D7).** Bawaan `--keluar` adalah `~/Documents/Laporan-Harian-BNPB/misi-udara/<tanggal>/`. Jenis `kunjungan` menolak `--keluar` di dalam repo (uji MU-04). Jenis lain boleh ke `data/laporan-bnpb/paparan/` bila staf memilihnya.
3. **Tidak ada keluaran di `public/`.** Uji gerbang MU-09 memeriksa bahwa mesin tidak menulis ke `public/`.
4. **Berkas 15 Nov 2026 sudah ter-commit** di `data/laporan-bnpb/paparan/flight-plan-banjir-2026-11-15/` (kunjungan ke Sultan Daulat). Dibiarkan sampai pemilik memutuskan dihapus atau tidak (Q9 [SEMENTARA]). Paket ini tidak menghapusnya. Riwayat git publik tetap menyimpannya walau berkas dihapus; keputusan pemilik perlu memperhitungkan itu.
5. **Tautan pendek dibuka hanya oleh perintah baris dan bot WA** di Mac mini (Q11 [SEMENTARA]). Worker tidak pernah membukanya. Pengalihan hanya diikuti bila host akhirnya `google.com` (jalur `/maps`) atau `maps.app.goo.gl`; host lain ditolak. Batas jumlah pengalihan dan batas waktu tunggu dipasang; skema selain `https` ditolak. Ini mencegah SSRF dan pembocoran ke host asing.
6. **Validasi masukan titik.** Hanya empat bentuk (D8). Lintang -11,5 sampai 6,5 dan bujur 94,5 sampai 141,5; angka bukan hingga (NaN, tak terhingga) ditolak; panjang masukan dibatasi; plus code pendek ditolak tanpa titik acuan dalam 50 km. Nama tempat saja ditolak.
7. **Zona manual wajib alasan dan sumber** (Q14). Tanpa keduanya, zona ditolak. Alasan dan sumber dibatasi panjangnya, bebas nama orang.
8. **Data basi dan data kosong tidak pernah lolos diam-diam.** Tiap pemeriksaan mencetak jam data; di atas batas basi dicetak "tidak diperiksa" (ALGORITMA bagian 3).
9. **Teks keluar lewat penyaring.** Nama titik dan zona melewati penyaring HTML dan XML sebelum masuk PDF, KML, GPX, dan layar.
10. **Rahasia.** Tidak ada kunci, token, atau nomor HP di berkas yang dilacak git; nomor HP tidak masuk repo.
11. **Citra peta dari luar.** Latar peta PDF diunduh sebagai ubin citra dari server Esri, sehingga area rute terlihat oleh server itu dan nomor ubinnya tersimpan di cache `scripts/operasi/kerja/ubin` (diabaikan git). Untuk jenis `kunjungan` peta digambar tanpa citra secara bawaan; `--citra` memaksanya, `--tanpa-citra` tersedia untuk jenis lain. Tautan pendek hanya diikuti ke port 443.

## 3. Matriks hak (Q10 [SEMENTARA])

| Tindakan | `pusdalops` | akun BPBD | pembaca pimpinan (`AKUN_SITUS*`) | tamu |
| -------- | ----------- | --------- | -------------------------------- | ---- |
| Membuat flight plan | ya | tidak | tidak | tidak |
| Membaca daftar dan berkas (bukan `kunjungan`) | ya | sesuai hak baca `/api/operasi/peta` | ya | 403 |
| Membaca jenis `kunjungan` | ya | tidak | tidak | 403 |
| Mencatat hasil misi (F-15) | ya | tidak | tidak | 403 |

## 4. Tahap 2 dan 3

1. **D1 hanya lewat `src/hak.js`.** Tiap kueri `pb_misi` melewati pemeriksa hak, memakai `?` terikat, batas 50 baris, dan diuji `EXPLAIN` memakai indeks `(misi, dibuat)`. Migrasi hanya `CREATE ... IF NOT EXISTS`, ditinjau `migrasi-idempoten`.
2. **R2 tulis sekali.** Kunci disusun server dari nilai tervalidasi, bukan dari nama berkas kiriman; versi lama tidak ditimpa.
3. **Rute baca berkas** mengembalikan `content-disposition: attachment`, `cache-control: private, no-store`, `x-content-type-options: nosniff` (pola Operasi Udara).
4. **Batas laju** pada `/api/pb/misi`, `/api/pb/misi/berkas`, dan `/api/pb/misi/zona`; rute baca membaca berkas statis, bukan D1, untuk zona. Tanpa cron baru.
5. **CSRF** dijaga terpusat di `src/worker.js`; rute baru tidak dikecualikan. Pembuatan flight plan lewat `POST /api/pb/misi`; Worker tidak menghitung rute.
6. **Bot WA** hanya menerima permintaan dari grup yang berhak dan tidak membaca pesan lain.
7. **Pengulas wajib:** rute dan unggahan `guard-api` dan `security-reviewer`; migrasi `migrasi-idempoten`; layar `selera-angka` dan `inp-reviewer`; pembaca titik MU-02 `security-reviewer`.

## 5. Yang dicatat di log

| Dicatat | Tidak dicatat |
| ------- | ------------- |
| waktu, jenis misi, bencana, status zona, tipe, total km, total menit, versi, jumlah titik, id staf `staf:<id>` | koordinat titik jenis `kunjungan`, nama orang, nomor HP, isi tautan Maps, isi kolom bebas |

Pengisi dicatat sebagai `staf:<id>` atau `admin:<hash12>`, bukan nama. Pesan galat tidak menggemakan koordinat kunjungan.

## 6. Ancaman dan penangkal

| Ancaman | Penangkal |
| ------- | --------- |
| Rute kunjungan pejabat terbaca publik lewat repo | D7, penolakan `--keluar` di repo, Q9 untuk berkas 15 Nov |
| Tautan pendek mengarah ke host jahat (SSRF) | whitelist host akhir, batas pengalihan, hanya di perintah baris dan bot WA |
| Titik di luar Indonesia atau angka tak sah merusak hitungan | validasi wilayah dan angka hingga |
| Data basi dianggap lolos | batas basi dan baris "tidak diperiksa" (uji kejujuran 3) |
| Angka batas tanpa sumber | uji menolak baris tanpa sumber, berkeyakinan C, atau berkeyakinan S tanpa nomor Q |
| Tamu atau pimpinan mengubah flight plan | hak tulis terpisah, uji 403 |
| XSS dari nama titik atau alasan zona | penyaring HTML dan XML |
