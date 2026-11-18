# DESIGN-SYSTEM: tindakan di seksi Sarana dan fasilitas

Mengikuti `data/kajian-bnpb/operasi-udara/DESIGN-SYSTEM.md` §8 (tingkat wadah) dan AGENTS.md 3.5 (kartu standar), 3.9 (token dulu). Tidak ada warna literal baru: semua lewat token `public/inti/tema.css` dan kelas yang sudah ada di `public/inti/renlap.css` dan `public/inti/kartu.css`.

## 1. Kartu "Tindakan"

- Kartu `.ex.ex-std` dengan kepala nama seksi berikon ("Tindakan"), tanpa kalimat temuan, tanpa kaki sumber.
- Isi: tabel `.ex-tabel` tiga kolom: Tindakan, Persen kejadian logbook (bar + angka), Kejadian. Kepala tabel navy tua bertulisan putih (kelas tabel yang ada).
- Angka format Indonesia: "73,4 persen", "14.805". Definisi kolom di `title` kepala tabel ("persen kejadian berisi di logbook Pusdalops 2011-2026 yang mencatat tindakan ini").
- Bencana tanpa data logbook (udara): kolom persen "tidak tercatat", bukan nol.
- Diletakkan pertama di wadah renlap, sebelum kartu Renlap.

## 2. Kolom Tindakan di kartu Hasil tindakan

- Satu sel per baris: `<details class="rl-tdk">` dengan `<summary>` berupa tombol kecil "Pilih tindakan" atau "3 tindakan". Isi: daftar `<label>` berkotak centang, satu per kode bencana itu, urut sama dengan kartu Tindakan.
- Tanpa garis luar pada tombol ikon (memori pemilik "ikon tanpa garis luar").
- Membuka `<details>` urgent (bawaan peramban); centang hanya mengubah `S.ubah`, tanpa menggambar ulang tabel (INP).

## 3. Rekap di kartu Kepatuhan

- Di bawah daftar alasan: daftar `ul.rl-alasan` yang sama bentuknya, "Evakuasi warga: 12". Urut jumlah terbesar. Kosong = tidak ditampilkan.

## 4. Teks

Bahasa lugas, tanpa huruf kapital semua, tanpa "·", tanpa kata "aman".
