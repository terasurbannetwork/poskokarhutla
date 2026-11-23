# Design system

Meniru tata letak InaRISK v4, memakai merek Centurisk97. Token hanya dari `public/inti/tema.css`
(AGENTS 3.9: literal warna baru di CSS ditolak gerbang `gerbang-token-warna`).

## Token yang dipakai

| Peran | Token |
| --- | --- |
| Latar halaman, kartu | `--paper`, `--card`, `--line`, `--shadow` |
| Teks | `--ink`, `--ink2` |
| Merek (tab aktif, tombol utama, kepala tabel navy) | `--brand`, `--brand2`, `--on-brand`, `--head-bg`, `--on-head` |
| Kelas Tinggi, Sedang, Rendah | `--bad` / `--bad-tx`, `--warn` / `--warn-tx`, `--ok` / `--ok-tx` |
| H, V, C (lencana bulat di metodologi) | `--bad`, `--warn`, `--ok` |
| Terpapar / tidak terpapar | `--bad`, `--info` |
| Jari-jari | `--r`, `--r-sm`, `--r-pill` |

## Kerangka halaman

- Kepala situs bersama (`.ad-top`, `bnpb.css`), lalu bilah tab ujung ke ujung berikon, dibagi rata
  (memori "deretan pilihan ujung ke ujung"). Tab aktif bergaris bawah `--brand`.
- Tab IRBI: kolom kiri 320 px (Filter, Metodologi IRBI, Dokumen terkait), kanan: deret 5 kartu angka,
  lalu peta (kiri) + peringkat (kanan, gulir sendiri), sama tinggi (memori "tanpa ruang kosong").
  Di 390 px semua satu kolom, filter di atas.
- Kartu = `.ex.ex-std` (`public/inti/kartu.css`): kepala nama seksi berikon, tanpa kalimat kesimpulan,
  tanpa kaki sumber (AGENTS 3.5). Sumber cukup satu baris di kaki halaman.
- Jarak antar kartu 20 px (memori "kartu tidak menempel").

## Elemen

| Elemen | Keadaan |
| --- | --- |
| Pil kelas (Tinggi, Sedang, Rendah, Tanpa skor) | latar 15%, teks `-tx` |
| Tombol detail baris (›) | ikon polos tanpa kotak (memori "ikon tanpa garis luar"), fokus terlihat |
| Pemilih (`select`) dan cari | tinggi `--h-ctl`; kab dinonaktifkan sampai provinsi dipilih |
| Dialog detail | `<dialog>` modal, tutup dengan Esc, klik latar, tombol X; isi gulir |
| Jarum IKD | SVG busur tiga warna, jarum, angka 2 desimal, titik warna tingkat |
| Radar P1-P7 | SVG 7 sumbu, kisi 25/50/75/100% |
| Batang jiwa terpapar | 100% bertumpuk, label persen di dalam bila muat |
| Tren | batang SVG, dua kelompok dipisah garis putus, label nilai di atas |
| Tooltip grafik | `[data-tip]` dari `public/inti/tip.js` (memori "selera teks dan grafik": tiap grafik ber-hover) |

## Teks

Bahasa Indonesia polos (skill `bahasa-indonesia-plain`), tanpa huruf kapital semua (memori "tanpa
kapital": label kartu ditulis biasa, bukan KAPITAL), tanpa em dash dan tanpa titik tengah pemisah,
angka format Indonesia (`Intl.NumberFormat('id-ID')`), skor dua desimal, IKD dua desimal.

## Cetak (ringkasan PDF)

`@media print`: sembunyikan semua kecuali dialog terbuka; A4 tegak; kartu tidak terpotong
(`break-inside: avoid`); kaki: catatan skala wilayah dan "Sumber: InaRISK BNPB".
