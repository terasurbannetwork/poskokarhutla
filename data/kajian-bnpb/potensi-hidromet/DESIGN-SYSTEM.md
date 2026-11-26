# DESIGN-SYSTEM

Ikut `public/lapor/lapor.css` dan token `public/inti/tema.css`; warna status dari token `--dp-0` sampai `--dp-3` dan `--dp-belum` (paket induk). Tanpa literal warna baru di luar `tema.css`.

## Komponen

- `.ap-ringkas`: lima kotak angka sejajar ujung ke ujung, label "Awas", "Siaga", "Waspada", "Normal", "Belum terukur".
- `.ap-iklim`: kartu kecil dua kolom ONI dan IOD; nilai besar, bulan data kecil, label status; abu bila basi.
- Pil bahaya: komponen pil mode Kejadian (`Semua`, `Resmi`, ...), ikon bahaya, angka jumlah.
- Sub-tab: segmen tiga bagian selebar panel.
- Daftar kab: tabel gaya mode Kejadian (kepala navy, baris rapat): Kab/kota, Bahaya, Status, Pemicu.
- Kartu rincian: kartu standar `.ex.ex-std`, kepala nama seksi ("Status per bahaya", "Prakiraan BMKG per desa", "Debit sungai", "Keterpaparan", "Rekomendasi per pihak"), tanpa kalimat kesimpulan.
- Analisis: kartu per blok; batang horizontal dengan tooltip saat diarahkan; matriks sebagai tabel.
- Pil "hipotesis" dari induk untuk status, debit.
- Legenda: gaya legenda Kejadian; tombol buka "Cara membaca status".

## Peta

Kab diisi warna status, garis tipis; kartu hari menggantikan kartu "Tanggal data" dengan segmen Hari ini, Besok, Lusa, 3 hari.

## Teks

Bahasa polos (skill `bahasa-indonesia-plain`). Status ditulis "Awas", "Siaga", "Waspada", "Normal", "Belum terukur". Tooltip Normal dari induk D13.
