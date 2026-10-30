# GLOSARIUM dan peta Grand Design: Kemitraan Kampus

Lampiran rujukan; tidak menetapkan apa pun (kalah dari semua dokumen lain). 30 Okt 2026.

## 1. Istilah baku

| Istilah | Arti di modul ini |
| --- | --- |
| Kampus mitra | institusi berstatus `aktif` di `km_kampus` |
| Simpul / satelit | peran kampus (slide 11–12); satelit menunjuk simpul |
| Koordinator kampus (KK) | akun sandi yang menyetujui anggota kampusnya |
| Anggota | dosen, tendik, mahasiswa, atau alumni yang disetujui KK (baris `relawan` + `km_anggota`) |
| Unsur | dosen, tendik, mahasiswa, alumni |
| Satgas Kampus | satgas tanggap bencana per kampus, tiga unsur wakil: kampus, mahasiswa, alumni |
| Aktivasi | satu pemanggilan kampus untuk satu kejadian |
| Panggilan | satu ajakan ke satu orang dalam aktivasi; dikirim manusia lewat wa.me |
| Pakar | dosen di direktori `/akademisi` (R2), dirujuk dengan id OpenAlex |
| Pakar piket | pakar yang bersedia siaga satu minggu untuk satu rumpun |
| Profil daerah | JSON + lembar + buku semua bencana untuk satu kab/kota |
| Masalah | satu (kab, bahaya, aspek) dengan uraian dan bukti |
| Masalah otomatis | kandidat dari data (ALG §3.3), belum divalidasi |
| Belanja masalah | BPBD/unit mengajukan masalah dan kebutuhan |
| Kategori | pasangan bahaya × aspek (110) |
| Kunjungan | satu pendataan lapangan tim ke satu kab |
| Koreksi lapangan | perbaikan angka profil dari kunjungan, diterima ST |
| Proposal bersama | proposal BNPB + kampus ke donor luar |
| Hibah | dana pemicu BNPB lewat panggilan internal dan telaah |
| Penelaah (PL) | pemberi nilai hibah berkode pribadi |
| TKT | Tingkat Kesiapterapan Teknologi 1–9 |
| Desa binaan | desa yang dibina satu kampus lintas angkatan KKN |
| Kab dampingan | kab/kota yang dokumennya (KRB, RPB, IKD, renkon, Destana) didampingi kampus |
| Kode pribadi | 26 hex di `#k=`, hanya sha di D1 |
| kab4 | kode IRBI 4 digit (kunci kab modul ini) |

## 2. Peta 19 program Grand Design → fitur

| Program (slide 24) | Fitur | Catatan |
| --- | --- | --- |
| MoU payung | F-D4 (arsip `mou_payung`) | penandatanganan di luar sistem |
| Kepala BNPB Mengajar | – | kegiatan; cukup kalender biasa |
| Bank Masalah Kebencanaan | F-M1..F-M7 | inti modul |
| Satu Data Bencana untuk Riset | F-M1 (profil terbuka), API v1 lama, F-R1 | perjanjian data: tabel `riset_permintaan` lama |
| Mata kuliah kebencanaan | F-T7 (modul/RPS), ADR-03 indikator 3 | |
| Konsorsium doktor | – | administratif Dikti |
| Simpul riset dan hibah | F-R1, F-R6 | |
| Dana riset internasional | F-R2..F-R5 | |
| Diplomasi ilmiah ASEAN | F-R4 (mitra luar negeri di konsorsium) | forum di luar sistem |
| Naskah kebijakan | `riset_luaran` policy_brief + `riset_kebijakan` lama | |
| Forum, jurnal, anugerah | F-X1 (data peringkat Anugerah dari skor keaktifan) | forum/jurnal di luar sistem |
| Ruang uji inovasi | F-R7 | |
| Korps Relawan Bencana Kampus | F-D2, F-S1..F-S5 | anggota = relawan jalur kampus |
| KKN tematik dan magang | F-T1, F-T4 | |
| Satu Kampus Sepuluh Desa | F-T3, F-T4 | |
| Pakar Siaga Kampus | F-S3, F-S4 | |
| Buku pascabencana | F-S5 (catatan pembelajaran) | |
| Pendampingan KRB dan RPB | F-T5, F-M1 (data dasar) | |
| Kampus Aman Bencana | F-D1 (fasilitas), ADR-03 indikator 13 | |

## 3. Peta 14 indikator (slide 28) → kueri
Lihat DT §6.3.
