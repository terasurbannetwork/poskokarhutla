# DESIGN-SYSTEM: Alat gambar wilayah

Tombol dan kartu mengikuti token `public/inti/tema.css` dan kartu `public/inti/kartu.css` (AGENTS §3.5, §3.9). Tidak ada warna literal baru di luar `tema.css` (gerbang token-warna). Atom dulu: tombol alat dan pemilih memakai elemen yang sudah ada.

## 1. Aturan selera (mengikat)

- Tombol alat: ikon polos tanpa garis luar, satu tombol "Gambar wilayah" di kontrol peta yang ada; bentuk (poligon, kotak, buffer) sebagai deretan pilihan penuh lebar, berikon, dibagi rata.
- Kartu hasil: `.ex.ex-std`; kepala = nama seksi berikon ("Wilayah digambar"); pil kategori `.ex-ey`; isi tabel `.ex-tabel` menempel penuh, kepala tabel biru tua bertulisan putih di tengah; tanpa kalimat kesimpulan dan tanpa kaki Sumber; definisi di `title`.
- Kartu tidak menempel (jarak 20 px).
- Garis gambar memakai satu warna token (`tema.css`), isi transparan; titik simpul dengan area ketuk ≥ 44 px di ponsel.
- Tanpa HURUF KAPITAL SEMUA dan tanpa titik tengah pemisah; angka format Indonesia.
- Tooltip saat menyorot simpul dan saat menyorot baris angka.

## 2. Tata letak

| Lebar | Susunan |
| ----- | ------- |
| ≥ 1024 px | kartu di panel samping yang sudah ada (bisa ditarik, memori sidebar-bisa-ditarik); tidak menutup legenda |
| 600 sampai 1023 px | kartu di bawah peta, tinggi paling 45% layar |
| < 600 px | lembar bawah; deretan bentuk tetap penuh lebar |

## 3. Isi kartu (urutan)

1. Luas wilayah digambar (km2, ha) dan pemilih periode.
2. Titik panas (lokasi unik), FRP jumlah dan maksimum, siang, malam.
3. Sel berdeteksi dan jejak sel.
4. Insiden dalam gambar dengan luas dNBR (hanya bila ada).
5. Desa beririsan (daftar bisa dilipat `<details>`) dan kecamatan beririsan dengan penduduk (pil perkiraan kasar).

## 4. Keadaan kosong dan galat

Tiap bagian punya keadaan "menunggu data", "tak terukur", dan "gambar terlalu luas"; tidak ada 0 untuk yang tak terukur.
