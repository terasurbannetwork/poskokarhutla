# DESIGN-SYSTEM

Merek Centurisk97: token `public/inti/tema.css`, kepala situs bersama, warna status `--dp-0` sampai `--dp-3` dan `--dp-belum` (induk). Tanpa literal warna baru di luar `tema.css`. Pola tata letak meniru `/jaringan` METI (RISET 1), rupa tetap Centurisk97.

## Komponen

- Pil tab tengah (segmen berikon, ujung ke ujung di HP dengan gulir mendatar).
- Panel kiri lipat 360 px, tombol lipat di tepi; di 768 px ke bawah jadi lembar bawah tiga tinggi (tertutup, setengah, tinggi) dengan pegangan.
- Kotak angka ringkas 2 kali 2 atau 5 sejajar; angka besar, label kecil, chip fakta di bawah.
- Pil bahaya berikon dengan angka.
- Daftar kab: baris rapat, nama, provinsi kecil, pil status bertulisan "Awas" (huruf biasa).
- Kartu fakta: kartu standar `.ex.ex-std` per seksi (Status per bahaya, Prakiraan BMKG per desa, Debit sungai, Keterpaparan, Kelas bahaya desa); kepala nama seksi, tanpa kalimat kesimpulan.
- Garis waktu bawah: tombol putar, empat titik hari ("Hari ini", "Besok", "Lusa", "Hari ke-3") dan tombol terpisah "Ringkas 3 hari" (bawaan).
- Legenda bawah: warna status, abu belum terukur, tombol "Cara membaca status" membuka matriks K kali E.
- Chip fakta: Bersumber (titik penuh), Dihitung (titik kosong), Hipotesis (pil hipotesis induk), Belum terukur (garis putus).
- Tab baca: lebar baca 72 karakter; Lapisan dua kolom (tumpukan lapis kiri, jejak dan tabel kanan); Ringkasan daftar bab di kiri, bab di kanan; Sumber daftar sumber di kiri, isi di kanan.
- Grafik batang mendatar dengan tooltip saat diarahkan.

## Teks

Lewat skill `bahasa-indonesia-plain`. Status ditulis "Awas", "Siaga", "Waspada", "Normal", "Belum terukur". Tooltip Normal dari induk D13.
