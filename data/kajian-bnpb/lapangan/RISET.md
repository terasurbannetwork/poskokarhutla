# RISET: Pegawai dan Relawan Lapangan

Ringkasan tiga riset 1 Nov 2026. Rincian dan semua tautan di `riset/`:

| Berkas | Isi |
|---|---|
| `riset/R1-GITHUB-WAJAH.md` | Pustaka wajah di peramban, liveness, aplikasi presensi bergeotag di GitHub |
| `riset/R2-PRAKTIK-LAZIM.md` | Cara pemerintah, Tagana, FEMA, SES, Jepang melakukannya; UU PDP; ICS 214 |
| `riset/R3-KODE-REPO.md` | Yang sudah ada di repo ini dan dipakai ulang |

## 1. Biasanya gimana (jawaban singkat)

1. **Presensi pemerintah** memakai GPS + swafoto dengan radius dari kantor (contoh Pemprov Jabar 500 m). Tidak ada aturan
   nasional yang menetapkan cara presensi lapangan; tiap instansi mengatur sendiri. Pengenalan wajah resmi belum lazim.
2. **GPS palsu marak** (Cirebon sekitar 1.320 ASN, Baubau 588, Asahan sekitar 300). Peramban tidak bisa mendeteksi
   aplikasi fake GPS; pertahanannya di server: pola sampel, lompatan mustahil, jaringan, tinjauan manusia.
3. **Relawan** dikelola dengan nomor induk, jenjang, keahlian, pelatihan (Tagana), dimobilisasi dari daftar siap tugas,
   jasanya diakui lewat lama bakti (SES) atau sertifikat. Relawan bukan pegawai: absennya bukti kontribusi, bukan disiplin.
4. **Logbook harian lapangan** baku: ICS 214 Activity Log (kejadian, periode, personel, tabel waktu dan kegiatan).
5. **Wajah di peramban** sudah bisa tanpa server khusus: Human (MIT) memberi deteksi, sudut kepala, embedding, dan anti-spoof
   dalam satu pustaka; Cloudflare Workers AI tidak punya model wajah.
6. **Tidak ada proyek presensi sumber terbuka yang layak ditiru utuh**; yang ditiru bagiannya.

## 2. Yang ditiru dan dari mana

| Bagian | Ditiru dari | Catatan |
|---|---|---|
| Deteksi wajah, sudut kepala (yaw, pitch), embedding, anti-spoof | vladmandic/human (MIT) | satu pustaka, model disimpan di aset statis kita |
| Pendaftaran berarah dan tantangan acak | sssxyd/face-liveness-detector (MIT): gerbang mutu, frame berturut, batas waktu | angka sudut ditetapkan sendiri (ALGORITMA §2) |
| Haversine di server, radius per titik tugas, kamera langsung (bukan galeri) | shosst17/presensi-penggajian-app (pola saja; tanpa lisensi, kode tidak disalin) | |
| Antrean luring | p8kaushal/face-attendance (MIT) | IndexedDB, ditandai `luring` |
| Bentuk rekaman presensi | Frappe HRMS Employee Checkin (GPL-3.0, bentuk saja) | |
| Stempel di foto | aplikasi GPS Map Camera yang dipakai regu Kalteng dan Kaltim | dicetak di klien, nilainya dari server |
| Logbook harian | ICS 214 | |
| GPS 3 sampel, `nilaiGps`, EXIF, `bersihMedia`, sha256 | repo ini (uji pilot, Ruang Instansi) | pakai ulang |

## 3. Kegunaan untuk pimpinan

| Data | Kegunaan |
|---|---|
| Induk pegawai dan relawan | tahu siapa, bisa apa, ada di mana, tanpa tanya satu-satu |
| Absen pindai wajah bergeotag | bukti kehadiran di lokasi tugas, peta personel per kabupaten hari ini |
| Logbook harian | kegiatan dan kendala per hari, bahan sitrep dan pertanggungjawaban |
| Laporan kondisi lapangan | label untuk model: hotspot benar atau salah, banjir terjadi atau tidak, tebal gambut, jarak air |
| Panggilan bot WA | relawan sesuai keahlian dan wilayah terpanggil dalam menit |
| Jam layanan relawan | pengakuan dan sertifikat, data kapasitas per kabupaten |
| Kepatuhan isi logbook | pimpinan cukup memantau siapa yang belum mengisi |

## 4. Data yang dikumpulkan (ringkas; skema di DESAIN-TEKNIS §3)

| Kelompok | Bidang |
|---|---|
| Induk orang | jenis (pegawai, relawan), nama, NIP (pegawai), unit, jabatan, WA, email, kab domisili, keahlian, sertifikat, status, persetujuan wajah |
| Wajah | lima vektor (depan, kiri, kanan, atas, bawah), versi model, mutu, foto acuan depan |
| Tugas lapangan | judul, bencana, titik dan radius, mulai dan selesai, anggota |
| Absen | waktu server, waktu HP, lat, lon, akurasi, sampel GPS, jarak ke titik, skor wajah, tantangan, skor anti-spoof, foto, sha256, status, penanda |
| Logbook harian | tanggal, tugas, kegiatan, hasil, kendala, kebutuhan, kondisi lapangan terstruktur, foto bergeotag |
| Panggilan | tugas, keahlian, wilayah, kuota, batas balas, penerima, balasan |

## 5. Jebakan yang dijaga desain

GPS palsu (penanda server, bukan vonis), waktu HP palsu (waktu server + nonce), foto lama diunggah ulang (sha256 unik +
nonce), wajah gagal karena helm atau hujan (tinjauan manusia, bukan tolak), sinyal lemah (antrean luring), data biometrik
(persetujuan, simpan terpisah, hapus saat keluar), batas pesan WA (limiter gateway), kuota baca D1 (ringkasan dan cache).
