# DESIGN-SYSTEM: Insiden Kaya

Pop-up insiden mendapat dua kartu standar `.ex.ex-std` dari `public/inti/kartu.css` (AGENTS §3.5) dan token situs Centurisk97 (`public/inti/tema.css`). Urutan bangun: token, element, blocks, baru layar (AGENTS §3.9); tidak ada gaya baru di tingkat layar.

## 1. Aturan selera (mengikat)

- Kepala kartu = **nama seksi berikon**: "Perkembangan api", "Bangunan dekat api". **Tanpa kalimat kesimpulan** di kepala atau baris pertama kartu (AGENTS §3.5, pembaruan 11 Nov 2026). Angka temuan hanya sebagai isi tabel dan angka besar.
- Tanpa kaki "Sumber" atau keterangan. Definisi kolom dan keterbatasan masuk `title` kepala tabel dan kepala kartu. Atribusi Open Buildings: Q8.
- Tanpa huruf kapital semua. Tanpa latar sorot abu-abu. Label = ikon 12 px + teks.
- Tanpa titik tengah `·` sebagai pemisah; pakai koma atau baris baru.
- Kartu tidak menempel: wadah `display:grid; gap:20px` (gerbang `gerbang-kartu-renggang`).
- Warna hanya lewat token; literal warna baru di `public/**/*.css` ditolak `gerbang-token-warna`.
- Ukuran huruf `rem`. Tabel muat tanpa geser di lebar 1440 dan di lebar ponsel 375 (kolom panjang pindah ke baris kecil).
- Teks Indonesia lewat `bahasa-indonesia-plain`: kalimat pendek, istilah satelit dijelaskan sekali di `title`.
- Kode klien dirujukkan dulu ke `modern-web-guidance` (`search` lalu `retrieve`) sebelum menulis pola UI.

## 2. Kartu "Perkembangan api"

Struktur dari atas ke bawah:

1. Kepala: ikon api + "Perkembangan api"; di kanan kepala: pil status data ("hipotesis" bila D9 belum lulus, "dihitung sejak <tgl>" bila arsip pendek).
2. Deret pil hari (isi: tanggal pendek), satu pil per langkah garis depan, pil terakhir terpilih; lebar penuh, dibagi rata (memori "deretan pilihan ujung ke ujung"). Bila > 8 pil: bisa digulir di dalam deret, tidak menggeser halaman.
3. Tabel `.ex-tabel` menempel penuh, kepala tabel navy tua tulisan putih, rata tengah:

| Kolom | Isi | `title` kepala |
| ----- | --- | -------------- |
| Hari | tanggal pukul 14.00 WIB | garis depan dihitung sekali sehari pukul 14.00 WIB |
| Dijangkau (ha) | luas sel yang dilalui garis depan | batas atas luas terbakar, bukan luas terbakar; satu piksel 14,06 ha |
| Baru (ha) | tambahan dari hari sebelumnya | – |
| Laju p90 (km per hari) | angka atau "belum terukur" | persentil 90 jarak kemajuan sel baru; "belum terukur" bila di bawah satu sel (0,38 km) |
| Catatan | "lompatan 4,2 km" atau kosong | lompatan = sel baru 2 sampai 10 km dari yang sudah tercapai; arah geometri, bukan arah angin |

4. Baris perkiraan titik awal (satu baris di atas tabel atau satu baris tabel pertama): ikon pin + "perkiraan titik awal terdeteksi, galat ±N jam"; `title` menjelaskan bahwa satelit melihat api sesudah menyala; bila `mulai_lebih_awal`, tambahan "sudah besar saat pertama terlihat".

Peta (di dalam pop-up atau peta utama bila pop-up menumpang): isokron sebagai garis, warna menurut hari dari token deret berurutan (terang ke gelap), isokron terpilih tebal, sisanya tipis; titik awal sebagai lingkaran berjari-jari galat; lompatan sebagai garis putus-putus dari asal ke tujuan. Legenda hanya menggambarkan yang tergambar.

## 3. Kartu "Bangunan dekat api"

1. Kepala: ikon bangunan + "Bangunan dekat api"; pil "perkiraan".
2. Dua angka besar sejajar penuh: "sekarang" (`kini`) dan "sejak terdeteksi" (`kumulatif`), angka dengan awalan "sekitar" atau "kurang dari 5", satuan "bangunan"; di bawah masing-masing satu baris kecil "dalam 500 m dari petak api".
3. Satu baris berikon: luas atap total ("sekitar 12.400 m²").
4. Keadaan kosong: "belum tercakup untuk provinsi ini" (ikon info, bukan peringatan merah); `kini` kosong tampil "–" dengan keterangan "tidak ada petak api berumur ≤ 12 jam".
5. `title` kepala memuat: sumber Open Buildings v3 keyakinan ≥ 0,70, galat posisi ±0,08 km, bangunan tak terdeteksi tidak dikoreksi, bukan jumlah jiwa, bukan penjumlahan dengan sumber lain.

Peta: lingkaran 500 m (gambar geometri) mengitari petak segar, bukan penanda bangunan. Tidak ada koordinat bangunan digambar (KEAMANAN-PRIVASI).

## 4. Kata dan istilah

| Boleh | Tidak |
| ----- | ----- |
| titik panas, petak api, dijangkau, belum terukur, tak terlihat sejak | titik api (kecuali kutipan resmi), padam, aman, penyebab, pelaku |
| perkiraan titik awal terdeteksi | titik awal api, sumber api |
| lompatan (arah dari asal ke tujuan) | api tertiup ke arah, arah angin |
| bangunan terdeteksi dalam 500 m | bangunan terancam, korban, warga terdampak |

## 5. Interaksi dan kinerja (INP)

- Pop-up dibuka: kepala dan kerangka kartu dicat dulu; `fetch` berkas progresi menyusul; tampilkan placeholder tinggi tetap.
- Klik pil hari hanya mengubah filter/properti satu lapisan GeoJSON; tidak membangun ulang sumber, tidak merender ulang tabel. Chrome kontrol urgent, isi berat ditunda (AGENTS global butir 2).
- Satu sumber GeoJSON per insiden, isokron sebagai fitur dengan properti `k`; ≤ 30 fitur; tidak ada `setPaintProperty` berkala.
- `inp-reviewer` memeriksa handler pil dan pembuka pop-up.

## 6. Hubungan dengan lapisan lain di peta utama

Api 3D (PKH-12, K5) dan isokron memakai peta yang sama. Aturan: isokron digambar sebagai lapisan vektor di bawah label dan di atas dasar peta; lapisan partikel api tidak menutupi isokron terpilih. Gerbang performa peta (PKH-15) berlaku: lapisan baru masuk dalam satu blok urutan lapisan.

## 7. Aksesibilitas

- Pil hari dapat dijangkau papan tombol, `aria-pressed`, label "hari <tanggal>".
- Isokron bukan satu-satunya pembawa informasi: tabel memuat angka yang sama.
- Warna deret hari memenuhi kontras terhadap peta dasar terang dan citra; `prefers-reduced-motion` mematikan animasi pemutaran bila kelak ditambahkan.
