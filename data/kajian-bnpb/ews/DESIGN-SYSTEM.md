# DESIGN-SYSTEM: Panel EWS

Mengikuti token `public/inti/tema.css` dan kartu standar `public/inti/kartu.css` (AGENTS 3.5, 3.9). Dasbor rujukan bertema gelap dan oranye; yang ditiru isinya, bukan warnanya (KEPUTUSAN K2).

## Tingkat dan warna

| Tingkat | Token | Label |
| --- | --- | --- |
| Normal | `--ok` | Normal |
| Waspada | `--warn` | Waspada |
| Siaga | `--brand-accent` | Siaga |
| Awas | `--bad` | Awas |
| Tidak ada data terkini | `--ink2` | Tidak ada data terkini |
| Tanpa ambang | tanpa warna | (tanpa label tingkat) |

Tidak ada warna literal baru di luar `tema.css` (gerbang `gerbang-token-warna`). Kata "Aman" tidak dipakai.

## Komponen (atom dulu, baru blok)

1. **Angka pos** `.al-angka`: nilai besar tabular, satuan kecil di bawah. Basi: angka abu dengan teks "terakhir <umur> lalu".
2. **Pil tingkat** `.al-pil`: ikon + label, bentuk pil yang sama dengan pil status repo.
3. **Tabel mini pos** `.al-rinci`: dua kolom label dan nilai (ambang, hujan jam, hujan hari, baterai, suhu, waktu). Sel tanpa data menulis "tidak ada data", tidak 0.
4. **Kartu pos** `.al-kartu` = kepala (nama pos, ikon sumber) + angka + pil + tabel mini. Lebar sama, tinggi sejajar per baris (aturan tanpa ruang kosong).
5. **Baris pemberitahuan** `.al-putus`: satu baris di atas panel, ikon peringatan, "4 alat tanpa data terkini", tombol tutup ikon polos. Tidak berupa dialog yang menutupi layar.
6. **Kartu CCTV** `.al-cctv`: nama pos, rasio 16:9, pemutar bawaan; kamera tidak tersedia tampil abu dengan teks "Kamera tidak menjawab".
7. **Grafik** `.al-grafik`: komponen grafik repo, garis tunggal, ambang sebagai garis putus-putus berlabel, tooltip nilai dan waktu.

## Tata letak

- Satu kartu `.ex.ex-std` berjudul nama seksi "Pemantauan alat" berikon, tanpa kalimat kesimpulan (AGENTS 3.5 pembaruan 11 Nov).
- Isi: pil pilihan "Pos" dan "CCTV" ujung ke ujung, lalu kisi kartu (3 kolom di desktop, 1 di HP).
- Kartu berjarak 20 px, tidak menempel.
- Teks dalam bahasa polos dan tanpa huruf kapital semua (selera pemilik).
