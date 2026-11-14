# KEAMANAN-PRIVASI: Peluang Semai Awan dan Prakiraan Asap

## 1. Data dan sifatnya

| Data | Sifat | Tempat |
| ---- | ----- | ------ |
| Prakiraan IFS, zona, kandidat, asap, arsip putaran | turunan data publik (ECMWF CC BY 4.0, FIRMS), tetapi koordinat zona adalah usulan operasi | R2 `operasi/semai/`, dibaca lewat `GET /api/operasi/semai/berkas/*` di balik sesi |
| Rapor uji prospektif | agregat tanpa koordinat | `public/data/operasi/semai_rapor.json` |
| Target semai (`op_semai_target`) | keputusan operasi BNPB | D1, di balik sesi |
| Akun yang membuat target | id akun saja, bukan nama | D1 `oleh` |
| Sortie OMC | isian peran `tmc` | D1 `omc_sortie` (sudah ada) |
| Rahasia GSMaP/Earthdata | kredensial | GitHub secret, tidak pernah di berkas |

Tidak ada data pribadi baru. Nama kru, nama pilot, dan nomor HP tidak disimpan (prinsip Operasi Udara).

## 2. Matriks hak

| Aksi | Publik | Pembaca `/operasi` | `pusdalops` | `tmc` | Moderator |
| ---- | ------ | ------------------ | ----------- | ----- | --------- |
| Baca `semai.json` dan raster | tidak | ya | ya | ya | ya |
| Baca rapor agregat | ya | ya | ya | ya | ya |
| Lihat seksi Peluang semai | tidak (layar staf) | ya | ya | ya | ya |
| Pilih tampilan Tinjau BMKG | – | ya (Q4) | ya | ya | ya |
| Jadikan target renlap | tidak | tidak | ya (Q3) | ya (Q3) | ya |
| Hapus target (lunak, beralasan) | tidak | tidak | ya | ya | ya |
| Baca target | tidak | ya | ya | ya | ya |

Q4 (peran `bmkg`) dan Q5 (tautan mitra tanpa login) belum dibangun.

## 3. Tampilan Mitra

Keluaran prakiraan ada di R2 di balik sesi, jadi koordinat zona penuh tidak terbaca publik. Tampilan Mitra membulatkan zona ke
0,5 derajat dan menyembunyikan titik api per piksel, alasan, dan titik hujan. Itu pembatasan tampilan untuk staf yang menyiapkan bahan
mitra, bukan pengaman terhadap staf sendiri:

- Layar dan ringkasan Mitra hanya untuk bahan yang disalin staf lalu dikirim; tidak ada tautan Mitra yang dibagikan ke luar (Q5).
- Ringkasan Mitra dibangun dari blok `mitra` yang dibulatkan server, bukan membulatkan koordinat penuh di peramban, supaya teks yang
  tersalin tidak pernah memuat koordinat penuh walau ada galat layar.

## 4. Rute

- `GET /api/operasi/semai/berkas/<nama>` hanya melayani nama dari daftar tetap; jalur lain 404 (tanpa traversal).
- `POST /api/operasi/semai/target` tidak menerima koordinat dari klien; koordinat, skor, dan alasan diambil server dari arsip R2
  putaran yang disebut (mencegah target palsu dengan alasan karangan).
- Validasi: `zona_id` cocok pola `^\d{10}-[A-E]$`, `base_id` ada di `op_base`, tanggal hari ini atau besok WIB, catatan <= 500 huruf,
  teks dibersihkan dari kendali; batas laju 30 per hari per akun; asal permintaan diperiksa seperti rute tulis Operasi Udara lain.
- Hapus hanya lunak, alasan wajib; riwayat tetap.
- Uji guard: `guard-api` dan `security-reviewer` (RENCANA-UJI §5).

## 5. Layar

- Semua teks dari data (nama kota, provinsi, catatan target) disisipkan sebagai teks (`textContent`), bukan HTML.
- Tidak ada `eval` atau `innerHTML` dari `semai.json`.
- Salin ke papan klip hanya dari aksi pengguna (klik).

## 6. Lisensi dan atribusi

- ECMWF Open Data CC BY 4.0: bilah sumber menyebut "ECMWF IFS, CC BY 4.0" dan ringkasan teks menyebut "data ECMWF".
- GeoNames CC BY 4.0: atribusi di kartu "Cara memutuskan".
- NASA FIRMS: atribusi seperti layar repo lain.
- Nimbus: tidak ada kode, gambar, merek, atau teks Nimbus yang disalin ke layar; yang diambil adalah fungsi dan nilai ambang yang
  dicatat sebagai acuan di `riset/R3-NIMBUS.md`. Nama "Nimbus" hanya muncul di dokumen kajian dan label mode pembanding di Tinjau BMKG
  ("seperti Nimbus" dapat diganti "pembanding v2" bila pemilik keberatan).

## 7. Klaim

Kalimat terlarang di layar, ringkasan, dan PDF (D8): "akan hujan", "pasti", "memadamkan", "mengurangi titik panas x%", "menambah hujan
x mm". Gerbang teks di RENCANA-UJI §6 memeriksanya.
