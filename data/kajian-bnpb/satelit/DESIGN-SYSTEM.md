# DESIGN-SYSTEM: Pemantauan satelit

Ikut AGENTS 3.5 (kartu `.ex.ex-std`, kepala = nama seksi berikon, tanpa kalimat kesimpulan, tanpa kaki sumber) dan 3.9 (token di `public/inti/tema.css` dulu, element, blocks, baru layar). Tidak ada warna literal baru di berkas layar. Komponen bersama di `public/inti/satelit.js` dan `public/inti/satelit.css`; layar bencana hanya memasang.

## 1. Element

| Element | Keadaan | Token |
| --- | --- | --- |
| Pil status sumber | `hidup` (tanpa pil, hanya jam pindaian di teks kecil), `terlambat` (warn), `terputus` (gagal) | token status yang ada |
| Pil keyakinan | `hipotesis` (warn) selama vonis belum `lolos`; hilang sesudah lolos | sama dengan `public/inti/gerbang.js` |
| Pil sumber | `Himawari-9 10 menit`, `VIIRS`, `TROPOMI`, `Copernicus GFM`, `NOAA STAR` (abu, kecil) | abu |
| Jam pindaian | "pindaian 14.10 WIB" ; umur > 1 jam ditulis "1 jam 20 menit lalu" | teks sekunder |
| Titik Himawari di peta | lingkaran kosong (bukan isi) supaya tidak tertukar dengan VIIRS; ukuran kelas kuat dan sedang | token kategori yang ada; bila kurang, tambah di `tema.css` |
| Gugus abu | poligon arsir tipis | token kategori |

## 2. Blocks

- **Kartu Satelit** (satu per layar bencana): kepala "Satelit" berikon satelit; baris status sumber; isi deteksi (tabel atau angka `.sk-ber`); kanan judul: pemilih jenis bila layar punya lebih dari satu (segmen `.seg.penuh` berikon, ujung ke ujung).
- **Kartu Status resmi** tetap milik modulnya (BMKG, PVMBG, VAAC) dan diletakkan DI ATAS kartu Satelit. Tidak ada kartu gabungan.
- **Metode** (`<details>`): Data, Deteksi, Uji, Catatan; vonis dan atribusi di butir Uji dan Data.

## 3. Pasangan per layar

| Layar | Kartu dan lapis | Tinjau |
| --- | --- | --- |
| Peta utama karhutla | lapis "Himawari 10 menit" terpisah dari VIIRS; kartu Satelit: status sumber, jumlah titik pindaian terakhir per provinsi, menit dahulu median (dari rapor) | `http://localhost:8800/` |
| Tugas api `/instansi` | kolom Himawari: jam pertama terlihat dari sumber ber-vonis lolos; selama WLF mati dan L1b belum lolos kolom kosong dengan teks "sumber terputus sejak <jam WIB>" (D16), tidak pernah diisi dari L1b | `http://localhost:8800/instansi` |
| `/gunungapi` | kartu "Abu dan panas kawah": per gunung level >= II, piksel abu pindaian terakhir, FRP kawah harian, SO2 (berlabel "data 2 sampai 4 hari lalu") | `http://localhost:8800/gunungapi` |
| `/cuaca` | kartu "Awan konvektif 10 menit": kab dengan puncak tembus atau tumbuh cepat; lapis OT | `http://localhost:8800/cuaca` |
| `/banjir` (staf) | kartu "Genangan harian": tabel kab aktif, baris tak teramati berteks | `http://localhost:8800/banjir` |
| `/kekeringan` | kartu "Vegetasi (VHI)": kab mingguan | `http://localhost:8800/kekeringan` |
| `/udara` | kartu "Asap dari satelit": AI per kab, berdampingan dengan PM2.5 | `http://localhost:8800/udara` |

## 4. Teks

- "Tidak terdeteksi satelit pada pindaian <jam>", "tertutup awan", "di luar lintasan", "sumber terputus sejak <jam WIB>", "belum lolos uji".
- "Titik panas Himawari" (bukan "api"), "piksel abu" (bukan "awan abu" sebelum lolos), "puncak tembus", "penduduk" tidak dipakai di paket ini.
- Dilarang: "aman", "padam", "bebas api", "tidak ada abu", "cerah", titik tengah "·" sebagai pemisah, huruf kapital semua.
- Angka Indonesia: koma desimal, "rb" di atas 10.000, FRP dibulatkan 10 MW, luas abu dibulatkan 10 km2; tanpa presisi palsu.

## 5. Keadaan

Memuat (kerangka abu), kosong ("tidak terdeteksi satelit pada pindaian <jam>"), sebagian (sebagian wilayah tertutup awan, persennya ditulis), terlambat, terputus, gagal muat (pesan singkat, kartu lain tetap), belum lolos uji (pil hipotesis).

## 6. Interaksi

Ganti jenis dan klik baris adalah kontrol urgent; lapis peta diperbarui deferred (INP.md). Lapis dibuat sekali; pindaian baru hanya mengganti sumber GeoJSON. Tanpa animasi putar pindaian di rilis pertama.
