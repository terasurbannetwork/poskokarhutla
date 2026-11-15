# ALGORITMA: Usulan Lifeline

Semua ambang di bawah adalah **HIPOTESIS** (Q3), tampil berlabel hipotesis sampai dikalibrasi dengan status resmi yang ditetapkan staf (setelah 30 kejadian, bandingkan usulan dengan status resmi per layanan).

## 1. Jendela

Isyarat dihitung dalam 24 jam terakhir, hanya untuk kab di kejadian itu dan hanya sesudah tanggal mulai kejadian.

## 2. Aturan per layanan

| Layanan | Merah | Kuning | Hijau |
| --- | --- | --- | --- |
| Listrik | Lapor Warga: >50% laporan listrik di kab = padam, minimal 5 pelapor | >= 3 pelapor "padam" atau logbook kendala `listrik` atau meja dampak `listrik_unit` > 0 | >= 3 laporan "hidup" sesudah laporan padam terakhir |
| Sinyal | >50% laporan sinyal = tidak_ada, minimal 5 | >= 3 "tidak_ada/lemah" atau logbook kendala `sinyal` atau `telekom_unit` > 0 | >= 3 "lancar" sesudah gangguan terakhir |
| Air bersih | meja pengungsi keb_air = tidak di >50% titik terbuka kab | keb_air = tidak di >= 1 titik, atau logbook kebutuhan air_bersih, atau `air_unit` > 0 | semua titik terbuka keb_air = ada |
| Jalan dan akses | Lapor Warga akses putus/tertimbun >= 3 pelapor | akses tergenang, logbook kendala `akses`, meja dampak jalan_km atau jembatan > 0 | tidak diusulkan otomatis |
| BBM | bbm/elpiji habis >= 5 pelapor | terbatas/habis >= 3 pelapor atau `spbu_unit` > 0 | >= 3 "tersedia" sesudah gangguan |
| Faskes | tidak diusulkan otomatis | faskes_penuh >= 3 atau layanan faskes rusak > 0 | tidak diusulkan otomatis |
| Pangan | keb_pangan = tidak di >50% titik terbuka | keb_pangan = tidak di >= 1 titik (logistik meja tidak dipakai: barangnya terikat posko teks, bukan kab) | semua titik keb_pangan = ada |
| Pengungsian | titik terbuka dengan putaran basi > 3 hari >= 50% | ada titik basi | semua titik terbuka diperbarui <= 3 hari |

Tanpa isyarat apa pun: usulan abu.

## 3. Pelapor berbeda

Lapor Warga tidak menyimpan sidik perangkat. Pelapor dihitung per `laporan.ip_hash` (hash IP bergaram, `src/worker.js:199`), bukan per laporan. Batasnya: banyak orang di balik satu IP (jaringan seluler CGNAT, wifi posko pengungsian) dihitung satu pelapor, jadi usulan condong ke abu, tidak ke merah palsu. `ip_hash` tidak pernah keluar sebagai bukti.

## 3a. Pemetaan wilayah

`laporan` hanya punya koordinat; kab-nya ada di `laporan_wilayah.kab` berupa NAMA (bisa kosong atau `tak_ada`). `logbook_kejadian` dan `meja_catatan` juga memakai prov + NAMA kab. Semua isyarat dipetakan ke kab4 lewat `kab4Dari(prov, nama)` (`src/siklus_kab.js`, dipakai KP-19). Nama yang tidak terpetakan tidak pernah ditebak: isyaratnya dilewati dan dihitung di catatan "isyarat tak terpetakan" per kejadian.

## 3b. Kejadian yang berbagi kab

Isyarat Lapor Warga, logbook, dan meja tidak bertaut ke `KJ-`. Bila dua kejadian aktif menyentuh kab yang sama, isyarat kab itu dipakai untuk usulan keduanya, dengan label "isyarat kab, tidak khusus kejadian". Status resmi tetap per kejadian, ditetapkan staf (D9).

## 4. Dua konsep "basi" yang berbeda

1. **Status resmi basi**: `sekarang - diperbarui > 24 jam` (Q7). Hanya tanda di layar; warna tidak berubah.
2. **Titik pengungsian basi**: catatan meja pengungsi terbaru sebuah titik terbuka bertanggal data lebih dari 3 hari lalu. Dipakai untuk usulan pengungsian (merah bila separuh atau lebih titik terbuka basi, kuning bila ada) dan sebagai syarat kesegaran hijau air dan pangan: titik basi tidak pernah menghasilkan hijau (usulan abu, dengan alasan). Titik yang tercatat "tidak" tetap kuning atau merah walau basi (condong hati-hati).

Penyimpangan terdokumentasi dari tabel bagian 2 (semua berlabel hipotesis; alasan usulan memuat "ambang hipotesis"):
- Pelapor dihitung per `ip_hash` per layanan dengan laporan terakhirnya; elpiji digabung ke bbm sehingga satu `ip_hash` yang melapor bbm dan elpiji = satu pelapor. `ip_hash` kolomnya NOT NULL, jadi tidak ada pelapor tanpa hash.
- BBM merah = `habis` >= 5 pelapor (angka mutlak), berbeda dari listrik dan sinyal (lebih dari separuh).
- Jalan kuning dari warga: tergenang, putus, atau tertimbun gabungan >= 3 pelapor (tabel tidak memberi angka).
- Kuning dari logbook atau meja dampak menang atas hijau; hijau dari warga menang atas kuning dari warga saja.
- Pengungsi: titik dikenali lewat `titik_id` bila ada, kalau tidak lewat nama tempat huruf kecil; jendela sejak mulai kejadian, bukan 24 jam. Register `titik_pengungsian` belum dipakai.

## 5. Uji jujur

Sesudah kalibrasi, laporkan per layanan: persentase usulan yang sama dengan status resmi, dan persentase sel resmi merah yang usulannya abu (kebutaan mesin). Angka itu tampil di catatan kisi.
