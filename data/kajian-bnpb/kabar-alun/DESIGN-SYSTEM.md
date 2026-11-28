# DESIGN-SYSTEM: Kabar Alun-alun

Tidak ada token, warna, atau komponen baru di luar yang sudah dipakai `public/lapor/lapor.css` dan `public/inti/`. Warna hanya dari token `public/inti/tema.css`; literal warna baru ditolak `tests/agen/gerbang-token-warna.test.mjs` (AGENTS 3.9).

## Peta

Peta Alun-alun yang ada (`gambarPetaAlun`, MapLibre, OpenFreeMap, titik berkelompok) dipakai ulang. Satu titik per kejadian; warna titik mengikuti status resmi (berjalan, belum, selesai) dengan nada token yang sudah ada, dan abu untuk kejadian "belum ada laporan resmi". Kejadian tanpa titik tidak digambar di peta, hanya di daftar.

## Kartu kejadian

Memakai kartu standar `.ex.ex-std` dari `public/inti/kartu.css` (AGENTS 3.5): kepala = nama seksi berikon (jenis dan nama kab/kota), tanpa kalimat temuan dan tanpa kaki sumber. Isi berupa empat pita berurutan, tiap pita punya pil sumber di kepalanya:

| Pita | Isi | Bila kosong |
| --- | --- | --- |
| Resmi BNPB | status, tiga angka berdampingan (KK terdampak, mengungsi, rumah terdampak), kesegaran per kejadian | "Belum ada laporan resmi" |
| Laporan warga | satu baris per klaster: jenis, wilayah desa, angka dampak yang lebih dari 0 berlabel "laporan warga" (0 tidak ditampilkan karena bisa berarti belum dijawab), jumlah pelapor bila ada | "Belum ada laporan warga" |
| Berita | maksimal 5 baris: judul (tautan), media, jam terbit | "Belum ada berita yang cocok" |
| Media sosial | satu baris | "Belum tersambung" |

Pembaruan 26 Nov 2026 (pemilik: "Bagusin"): pita yang kosong tidak digambar. Sumber yang kosong disebut sekali di baris kecil di bawah kartu, misalnya "Belum ada laporan warga dan berita."; berita yang gagal dimuat tetap tampil sebagai pita karena itu gangguan, bukan kosong. Pita Media sosial tidak diulang di tiap kartu selama belum tersambung; keterangannya tampil sekali lewat saringan Medsos. Peta memuat legenda warna titik (Berjalan, Belum, Selesai, Belum ada laporan resmi).

Pita dipisah jarak 20 px; kartu tidak menempel satu sama lain (AGENTS memori "kartu tidak menempel"). Pita Resmi memakai tabel `.ex-tabel` bila lebih dari satu baris angka.

## Teks

Bahasa lugas lewat skill `bahasa-indonesia-plain`. Tanpa titik tengah, tanpa huruf kapital semua, angka format Indonesia. Tidak pernah ada kata "aman". Angka kosong ditulis "belum ada data", tidak 0. Tautan berita `target=_blank rel="noopener noreferrer"`, hanya skema `http:` atau `https:`.

## Saringan

Deretan pilihan ujung ke ujung dan terbagi rata, berikon, memakai pola tab yang sudah ada di `lapor.js`: Semua, Diikuti, jenis, status. Dirender sekali; saring hanya mengganti `hidden` agar tidak membekukan layar (INP).
