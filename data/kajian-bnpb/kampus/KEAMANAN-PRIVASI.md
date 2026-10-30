# KEAMANAN-PRIVASI: Kemitraan Kampus

Dokumen kedelapan dalam urutan otoritas. Kalah dari KP s.d. DT; menang atas RU, TIKET.
Versi 1.0, 30 Okt 2026. Pengulas wajib: `security-reviewer`, `guard-api`.

## 1. Matriks hak (baca B, tulis T, — tidak)

| Data | PB | AG | BP | PL | KK | ST | PM | SA |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Profil daerah JSON (`public/data/kemitraan`) | B | B | B | B | B | B | B | B |
| Buku profil (bab 8 pakar) | — | — | B kabnya | — | B | B | B | B |
| Rekomendasi pakar (nama, kampus, skor, paper) | — | — | B kabnya | — | B | B | B | B |
| Kontak pakar (email/WA publik bersumber) | — | — | — | — | — | B | B | B |
| Masalah | — | — | T kabnya | — | B | T | B | T |
| Jawaban pendataan + koreksi | — | — | T kunjungannya | — | — | T | B | T |
| Kampus (profil) | B nama, prov | — | — | — | T miliknya | T | B | T |
| Anggota (identitas, WA, email) | — | T dirinya | — | — | B/T kampusnya | B | — | B |
| Anggota agregat (k ≥ 5) | B | — | — | — | — | B | B | B |
| Perjanjian + PDF | — | — | — | — | T miliknya | T | B | T |
| Proposal, konsorsium | — | — | — | — | T bila ketua/anggota | T | B | T |
| Hibah proposal | — | — | — | B yang ditugaskan | T miliknya | T | B | T |
| Telaah | — | — | — | T miliknya, sebelum kirim | — | B | B | B |
| Satgas, aktivasi | — | B panggilannya | — | — | T satgasnya, B aktivasi | T | B | T |
| Sertifikat (verifikasi) | B ringkas | B miliknya | — | — | B kampusnya | T | B | T |
| Magang | B lowongan buka (tanpa pembimbing) | T lamarannya | T lowongan kabnya | T nilai (pembimbing) | B kampusnya | T | B | T |
| Desa binaan, dampingan, BUMN | — | — | B kabnya | — | T miliknya (desa, dampingan) | T | B | T |
| Modul | B | B | B | B | B | T | B | T |
| Dasbor | — | — | — | — | — | B | B | B |

Tiap baris = satu uji "peran salah DITOLAK" di RU §2.4.

## 2. Data pribadi (UU 27/2022 PDP)
- **Minimum:** tanpa NIK/KTP/tanggal lahir/alamat rumah. Anggota: nama, WA/email, unsur,
  prodi, angkatan, kab domisili, instansi (alumni), keahlian.
- **Persetujuan:** centang PDP wajib, teks baku menyebut tujuan (koordinasi kemitraan dan
  satgas), penerima (BNPB, koordinator kampus), masa simpan, hak cabut.
- **Hak cabut:** pola relawan (anonimkan, bukan hapus; `km_anggota` kolom bebas dikosongkan
  serentak). Retensi anggota nonaktif 180 hari → anonim (cron lama).
- **Pakar:** data dari sumber publik bersumber (KP /akademisi 28 Okt). Tidak disalin ke D1
  selain `akademisi_id`. Hak koreksi/hapus pakar mengikuti `/akademisi` (formulir koreksi
  akademisi, bila belum ada: tiket di luar modul ini).
- **k-anonim:** angka publik per kab/kampus/unsur < 5 → "di bawah 5".
- **Sertifikat publik:** hanya nama tampil (boleh disingkat pemilik), kampus, peran, jam,
  tanggal. Tanpa WA/email.
- **Repo publik:** tidak ada data pribadi, kode, token, atau isi R2 privat di git. Uji
  gerbang memindai `public/data/kemitraan/**` untuk pola email/WA/`A[0-9]{6,}`.

## 3. Autentikasi
- KK: sandi ≥ 10 huruf, PBKDF2-SHA256 100k (`hashSandi`), garam per akun, kunci 15 menit
  setelah 5 gagal, laju sebelum cek sandi, sesi 12 jam HttpOnly Secure SameSite=Strict,
  header `x-km: 1` (CSRF), keluar menghapus sesi D1.
- Kode pribadi 26 hex (104 bit): hanya sha di D1; kode di fragmen `#k=`, dipindah ke
  sessionStorage lalu fragmen dihapus; dikirim header `x-kode`; tombol Keluar menghapus.
  Kode BPBD/PL berbatas waktu (`berlaku`), dapat dicabut.
- Tautan atur sandi: 32 hex, 72 jam, sekali pakai.
- Perbandingan sha/token pipeline: waktu-tetap.

## 4. Masukan dan berkas
- Semua teks: buang karakter kontrol, batas panjang = CHECK D1; JSON kedalaman ≤ 4.
- Berkas: cek magic byte + ukuran; nama R2 dibangkitkan server (`<id>.pdf`), tidak dari nama
  unggahan; unduh dengan `Content-Disposition: attachment` dan `X-Content-Type-Options:
  nosniff`; PDF tidak pernah dirender inline di origin utama.
- URL dari pengguna (web kampus, tautan donor): hanya `https://`, ≤ 200, ditampilkan lewat
  `urlOk` + `rel=noopener noreferrer`.
- Layar: SEMUA nilai lewat `esc()`/textContent; tidak ada `innerHTML` dengan data mentah.

## 5. Penyalahgunaan
- Pendaftaran palsu kampus: perlu surat tugas + persetujuan ST.
- Pendaftaran palsu anggota: perlu persetujuan KK; Turnstile; laju 10/jam/IP.
- Oracle keberadaan: jawaban daftar sama untuk baru/duplikat.
- Penelaah konflik: penelaah sekampus ditolak server (409).
- Panggilan satgas massal: tidak ada kiriman otomatis; tiap wa.me dibuka manusia.
- Kapasitas: angka kesiapan tidak memengaruhi skor prioritas risiko (pola C3).

## 6. Header dan CSP
Pola `/akademisi` + `/bnpb`: `default-src 'self'; script-src 'self' <CDN ekspor sama
akademisi>; style-src 'self' fonts.googleapis.com; font-src fonts.gstatic.com; img-src
'self' data: <foto pakar seperti akademisi>; frame-ancestors 'none'`. Halaman berkode:
`Cache-Control: no-store`, `Referrer-Policy: no-referrer`.
