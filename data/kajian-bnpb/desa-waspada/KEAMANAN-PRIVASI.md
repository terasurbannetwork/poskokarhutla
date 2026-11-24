# KEAMANAN-PRIVASI: Desa Waspada

## 1. Data dan sensitivitasnya

| Data | Sumber | Sensitivitas | Boleh publik |
| ---- | ------ | ------------ | ------------ |
| Nama desa, kecamatan, kab, provinsi | `desa_cari.json` | rendah, data administrasi publik | ya |
| Titik panas 7 dan 24 jam per desa | `hotspot.json` (FIRMS) | rendah, sudah publik per titik | ya, agregat per desa |
| Tahun terbakar per desa | `riwayat_petak.bin` | sedang: riwayat bisa dibaca sebagai stigma; nama desa publik tidak berisiko hukum bila tanpa kata sebab, pelaku, atau kepemilikan (diperiksa 24 Nov 2026: tidak ada kunci orang atau lahan di paket) | ya, sebagai bilangan dan tanpa kata sebab; menunggu Q1 |
| Porsi gambut per desa | `gambut.geojson` | rendah | ya, berpil perkiraan |
| Peluang kab/kota 3 hari | `prediksi.json` | rendah | ya, berpil hipotesis |
| Pin desa | titik tengah poligon | rendah | ya, 0,001 derajat |
| Koordinat titik individual atau petak | `riwayat_petak.bin`, `hotspot.json` | sedang bila ditautkan ke desa | **tidak** ditambahkan salinan baru ke berkas ini |
| Data orang, pemilik lahan, konsesi | tidak dipakai | tinggi | tidak ada di paket ini |

Tidak ada data pribadi. Paket ini tidak punya input pengguna dan tidak punya rute tulis.

## 2. Aturan keras

1. Tidak ada nama orang, pemilik lahan, perusahaan, atau konsesi di `desa_waspada.json`, CSV, atau halaman.
2. Tidak ada kata sebab atau pelaku (D14); gerbang memeriksa kata terlarang di berkas publik dan teks halaman.
3. Tidak ada koordinat titik panas individual atau petak 375 m di berkas publik.
4. Tidak ada rute Worker, tidak ada rahasia, tidak ada kunci API di skrip.
5. Satu-satunya `fetch` halaman adalah membaca `desa_waspada.json` (satu asal); tidak ada sumber pihak ketiga.
6. Teks dari data (nama desa) dimasukkan ke DOM lewat `textContent`, bukan `innerHTML`.
7. Ekspor CSV mengutip dan menetralkan sel yang diawali `=`, `+`, `-`, `@` (injeksi rumus spreadsheet) dengan awalan apostrof.
8. Tidak ada klaim "aman" atau "bebas api" di mana pun.

## 3. Ancaman dan penangkal

| Ancaman | Penangkal |
| ------- | --------- |
| Daftar dibaca sebagai vonis atas desa (stigma, tekanan sosial) | kata D14, `title` kepala kartu menulis keterbatasan, tanpa peringkat gabungan, Q1 menanyakan publik atau staf |
| Peluang kab/kota dibaca sebagai peluang desa | kolom bernama "peluang kab/kota", `title`, tidak diurut menurut peluang, pil hipotesis |
| Angka laju pembanding disalin tanpa ukur | gerbang menolak laju 0,39 dan 0,116 (angka pembanding) di `laju` berkas publik; laju hanya dari `desa_waspada_laju.json` |
| Injeksi nama desa di DOM atau CSV | `textContent`, penetral sel CSV |
| Berkas publik membengkak (denial of wallet pada static assets) | batas 450 KB, gerbang |
| Pembanding berlisensi MIT salah atribusi | kepala berkas dan ADR-5 |
| Titik dekat batas ditempatkan di desa tetangga lalu dipakai untuk menunjuk desa yang salah | pil "batas desa disederhanakan" di `title`, galat batas dicatat (ALGORITMA D6); ekspor memuat baris keterangan |
| Desa di lereng gunung api tampil di daftar A karena titik kawah, dibaca sebagai kebakaran | `batasan` di berkas publik dan `title` kepala kartu (Q9) |
| Dua hitungan desa berulang (kartu kecamatan `preventif` lawan daftar B) dibaca bertentangan | label definisi di tiap angka, tidak dijumlah (KEPUTUSAN D3) |
| Data lama dikira baru | `dibuat` dan `acuan` tampil di kepala halaman; bila `acuan` tertua dari 12 jam halaman menampilkan peringatan |

## 4. Retensi

- `desa_waspada.json` ditimpa tiap putaran; tidak ada arsip.
- `desa_statik.json` bulanan, di cache Actions, tidak di repo.
- `desa_waspada_laju.json` di repo (hasil agregat; tanpa koordinat).
- Tidak ada log pengguna.

## 5. Periksa sebelum terbit

1. Gerbang `gerbang-desa-waspada.test.mjs` hijau (RENCANA-UJI §5).
2. `security-reviewer` membaca halaman dan skrip ekspor (penetral CSV, `textContent`).
3. `selera-angka` membaca kolom (format Indonesia, satuan, tanpa presisi palsu).
4. Pemilik menjawab Q1 (publik atau staf) sebelum apa pun terbit. Tautan menu yang tidak dipasang **bukan** kendali: berkas statis di `public/` bisa dibuka siapa pun yang tahu jalurnya. Karena itu, tanpa jawaban Q1, `data/desa_waspada.json` dan `desa-waspada/` masuk `public/.assetsignore` (tidak terbit); gerbang memeriksa baris itu ada selama Q1 belum ditutup. Bila Q1 dijawab "staf", halaman dan data pindah ke jalur di balik sesi (rancangan terpisah).
5. `terbit.yml` sukses dan `/api/status` diperiksa sebelum menulis "tayang" (memori terbit-gagal).
