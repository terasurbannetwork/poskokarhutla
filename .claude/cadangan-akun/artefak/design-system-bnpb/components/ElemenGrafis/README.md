# ElemenGrafis

27 bentuk geometris plug-and-play untuk halaman bingkai deck BNPB, masing-masing bermakna kebencanaan dan dibangun sebagai bentuk native PowerPoint.

Tiap gambar menunjukkan empat varian: oranye dan navy, navy dan oranye, navy dan abu-biru, putih di atas foto. Enam elemen terakhir (`piksel_*`) satu keluarga dan boleh saling menggantikan.

## Aturan penempatan

- Hanya halaman bingkai: sampul, penutup, daftar isi, pembatas bagian. Slide isi data tidak dihias.
- Satu jenis elemen per deck, dipakai di semua halaman bingkai.
- Zona tetap: daftar isi dan pembatas di pojok kiri bawah panel; sampul dan penutup hanya gugus kotak di tepi bawah sambungan, tidak di atas foto.
- Selalu berjangkar ke tepi slide, tepi panel, atau celah foto. Gugus kotak bersentuhan sudut ke sudut.
- Warna: `oranye`, `navy`, `skala-netral-2` di latar terang; putih dengan satu aksen oranye di atas foto. Tidak transparan, tanpa `biru-lembaga` dan `merah`.
- Jauh dari teks, logo, pil, dan kredit foto. Tanpa segitiga yang menyerupai lambang.

## Pemilihan otomatis dari judul deck

| Kata di judul | Elemen |
| --- | --- |
| kerja sama, koordinasi | `kotak_tumpuk` |
| karhutla, kebakaran, titik panas | `piksel` |
| gempa | `gelombang` |
| tsunami, banjir, air | `setengah` |
| cuaca, iklim, kekeringan | `pelangi` |
| peringatan dini | `sinyal` |
| satelit | `orbit` |
| peta jalan | `simpul` |
| lainnya | `kotak_tangga` |

Spek deck boleh menimpa dengan `"elemen": "nama"` atau mematikan dengan `"elemen": ""`. Di slide lain: `"hiasan": [{"jenis": "gelombang", "x": 760, "y": 360, "w": 180, "h": 160, "warna": ["oranye", "navy"]}]`.
