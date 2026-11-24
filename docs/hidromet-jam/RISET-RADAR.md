# RISET-RADAR: uji akses radar BMKG (tiket H30)

Tanggal uji: 24 Nov 2026. Pelaksana: `cuaca-udara`. Cakupan: uji akses saja (KEPUTUSAN Q1). Tidak ada panen, tidak ada kode di `scripts/`.
Semua permintaan memakai UA peramban yang sama dengan `scripts/cuaca/bmkg_kab10.py`.

## Ringkasan

**Halaman radar publik BMKG tidak bisa dibaca secara otomatis.** `https://www.bmkg.go.id/cuaca/radar` dan `/cuaca/radar-cuaca` menjawab HTTP 403 dengan halaman tantangan Cloudflare ("Just a moment... Enable JavaScript and cookies"). Itu perlindungan bot. Sesuai aturan tugas, pengujian dihentikan di titik itu: tidak ada upaya melewati tantangan, tidak ada citra yang diunduh, dan endpoint XHR di balik halaman itu tidak terbaca.

Akibatnya, bagian format, georeferensi, interval, dan kedalaman riwayat di bawah **belum terverifikasi**. Yang terverifikasi hanya yang tertulis di tabel "Hasil uji".

## Hasil uji

| URL | Hasil | Arti |
| --- | --- | --- |
| `www.bmkg.go.id/cuaca/radar` | 403, tantangan Cloudflare | Halaman radar tidak bisa dibaca tanpa peramban sungguhan. Berhenti di sini |
| `www.bmkg.go.id/cuaca/radar-cuaca` | 403, tantangan Cloudflare | idem |
| `www.bmkg.go.id/cuaca/satelit` | 200 | Halaman satelit terbuka (bukan tugas ini, dicatat untuk H-lain) |
| `www.bmkg.go.id/` | 200 | Menu "Radar Cuaca" menaut ke `/cuaca/radar`. Sitemap memuat `/cuaca/radar` |
| `inderaja.bmkg.go.id` | 301 ke `www.bmkg.go.id/` | Tidak ada situs radar terpisah di domain ini. Sitelet radar/inderaja lama sudah dialihkan |
| `radar.bmkg.go.id` | tidak terhubung (DNS/koneksi gagal) | Tidak ada |
| `data.bmkg.go.id/` | 200 | Portal Data Terbuka: hanya prakiraan cuaca, gempabumi, peringatan dini cuaca (nowcast). **Radar tidak termasuk** |
| `data.bmkg.go.id/DataMKG/` | 403 | Tidak ada daftar direktori |
| `api.bmkg.go.id/` | 404 JSON "no Route matched" | Gateway API; rute radar tidak diketahui dan tidak ditebak |
| `www.bmkg.go.id/robots.txt` | 200 | `Disallow: /api` dan `/alerts` untuk semua UA; `/cuaca/radar` tidak dilarang, tetapi sejumlah UA (termasuk `Go-http-client`) diblokir total |

## Syarat pakai

- Portal Data Terbuka (`data.bmkg.go.id/tentang`): pengguna **wajib mencantumkan BMKG sebagai sumber data dan menampilkannya di aplikasi/sistem**. Portal itu menyebut hanya data terbuka yang terdaftar; radar tidak ada di daftar.
- Halaman radar tidak terbaca, jadi **teks hak cipta/syarat pakai khusus radar tidak diketahui**. Halaman `kebijakan-privasi` tidak memuat klausul hak cipta citra. `syarat-ketentuan` 404.
- Kontak resmi: `support[at]bmkg.go.id` (portal data terbuka). PTSP dan PPID tersedia di `ptsp.bmkg.go.id` dan `ppid.bmkg.go.id`.
- Kesimpulan untuk Q1: **halaman publik tidak cukup sebagai dasar panen otomatis**, karena (a) halaman dijaga tantangan bot, dan (b) radar tidak berada di data terbuka berlisensi. Jalur bersih adalah izin tertulis atau layanan data resmi.

## Yang diketahui dari luar uji ini (TIDAK diverifikasi, jangan dijadikan dasar)

Dari ingatan umum, bukan dari pengujian hari ini: citra radar BMKG biasanya mosaik/CMAX berupa PNG dengan legenda dBZ berwarna, per radar sekitar tiap 10 menit, dengan riwayat pendek (beberapa jam). Tidak ada bukti bahwa riwayat 14 Nov 2026 10.00-15.00 WIB masih tersedia. Semua ini harus dibuktikan oleh jalur resmi di bawah.

## Jalur yang disarankan (berurutan)

1. **Minta izin tertulis dan spesifikasi** lewat PTSP/`support@bmkg.go.id`: URL/API resmi, format, georeferensi (batas, proyeksi), legenda dBZ, interval, riwayat, batas laju, syarat atribusi. Tanyakan sekaligus arsip 14 Nov 2026 10.00-15.00 WIB untuk studi kasus Ciwidey (radar Bandung/Jakarta) dan apakah ada layanan data radar berbayar/kerja sama (BNPB sebagai lembaga pemerintah mungkin sudah punya jalur).
2. **Alternatif yang sudah boleh dipakai** sambil menunggu: IMERG per jam (sudah dipanen lab, K5) dan nowcast kecamatan BMKG (`peringatan dini cuaca`, data terbuka). Keduanya bukan pengganti radar, tetapi menutup sebagian kebutuhan U10.
3. Bukan jalur: skrip yang menembus Cloudflare, peramban tanpa kepala untuk melewati tantangan, atau menebak endpoint `api.bmkg.go.id`. Ditolak.

## Rancangan ingestion (berlaku HANYA setelah izin dan spesifikasi ada)

Tujuan: per kecamatan, tiap 10 menit, hitung `dbz_maks` dan `luas_ge40_km2` (luas sel piksel >= 40 dBZ di dalam poligon kecamatan).

1. **Ambil** citra mosaik terbaru + stempel waktu dari nama berkas/metadata (UTC, disimpan; tampil WIB). Jadwal penarik tiap 10 menit, jeda acak kecil, satu permintaan per siklus, UA jujur proyek, hormati batas laju yang dibalas BMKG.
2. **Arsip mentah** ke R2 (`arsip/radar/AAAA/MM/DD/<stempel>.png`) dengan sidik sha256. Tanpa arsip mentah, angka tidak bisa diaudit ulang.
3. **Georeferensi**: pakai batas dan proyeksi dari spesifikasi resmi (bukan ditebak dari piksel). Bangun peta piksel ke kecamatan sekali (rasterisasi poligon `pusat_kec`/batas kecamatan) dan simpan sebagai indeks tetap.
4. **Piksel ke dBZ**: cocokkan warna ke legenda resmi dengan jarak warna terdekat; piksel di luar legenda (peta dasar, teks, garis batas, logo) dibuang. Ini langkah paling rapuh (lihat risiko).
5. **Agregasi** per kecamatan: `dbz_maks`, `luas_ge40_km2`, `persen_ge40`, `n_piksel_valid`. Simpan satu baris per (kecamatan, waktu) dengan flag mutu (`citra_basi`, `piksel_valid_rendah`).
6. **Mutu**: tolak citra yang stempel waktunya lebih dari 20 menit dari jam sekarang atau yang piksel validnya di bawah ambang. Jangan isi nol untuk data hilang.
7. **Label**: "pengamatan, bukan prakiraan" (K2). Tetap internal sampai uji integrasi lulus (aturan 3 CLAUDE.md global).
8. **Uji integrasi** dengan citra sungguhan hasil izin (bukan mock): titik koordinat Ciwidey 14 Nov harus jatuh di kecamatan benar dan menghasilkan dBZ yang masuk akal.

## Risiko

| Risiko | Dampak | Penanganan |
| --- | --- | --- |
| Tantangan Cloudflare di halaman radar | Penarik otomatis tidak bisa jalan | Jalur resmi/izin; jangan dilewati |
| Izin/hak cipta radar tidak jelas | Pelanggaran syarat pakai, atribusi hilang | Izin tertulis dulu; atribusi "BMKG" tampil di UI |
| Citra PNG berwarna, bukan nilai mentah | Kuantisasi legenda, kehilangan presisi dBZ; garis batas dan teks mengotori piksel | Minta data mentah/terkuantisasi resmi; uji warna-ke-dBZ pada kasus 14 Nov |
| Riwayat pendek | Studi kasus 14 Nov mungkin sudah hilang; tidak bisa uji balik | Minta arsip lewat PTSP; mulai arsip sendiri sejak hari panen pertama |
| Radar terbatas jangkauan dan terhalang pegunungan (bayangan radar) | Nol palsu di lembah | Simpan flag jangkauan per radar; jangan tafsir nol sebagai "tidak hujan" |
| Perubahan format/URL tanpa pemberitahuan | Penarik diam-diam kosong | Uji bentuk tiap siklus, alarm bila piksel valid turun |
| Beban ke BMKG | Diblokir | Satu permintaan per 10 menit, batas laju, hentikan saat 403/429 |
| Waktu citra salah (UTC vs WIB) | Pergeseran 7 jam | Simpan UTC, uji dengan kasus 14 Nov |

## Pertanyaan untuk pemilik

1. Setuju mengajukan izin tertulis dan permintaan spesifikasi ke BMKG (PTSP/`support@bmkg.go.id`)? Surat bisa disiapkan.
2. Apakah BNPB sudah punya kerja sama data radar BMKG yang bisa dipakai?
3. Boleh memakai peramban sungguhan yang dioperasikan pemilik sendiri untuk melihat halaman radar sekali (tanpa otomatisasi), supaya endpoint dan syarat pakai di halaman bisa dicatat?
