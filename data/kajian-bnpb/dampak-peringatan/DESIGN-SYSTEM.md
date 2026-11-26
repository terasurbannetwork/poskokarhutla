# DESIGN-SYSTEM: Dampak peringatan dini dan status prakiraan

Tidak ada token, warna, atau komponen baru di luar yang sudah ada di `public/inti/tema.css`, `public/inti/kartu.css`, dan `public/lapor/lapor.css`. Literal warna baru ditolak `tests/agen/gerbang-token-warna.test.mjs` (AGENTS 3.9). Nama token status dipilih di DP-09 dari token yang sudah dipakai tab Besok; bila belum ada token yang cocok, token ditambah di `tema.css` dulu, bukan di layar.

## Status

| Tingkat | Warna (dari token tab Besok) | Teks | Keterangan |
| --- | --- | --- | --- |
| Normal | hijau | Normal | tooltip D13; tidak pernah ikon centang atau perisai |
| Waspada | kuning | Waspada | |
| Siaga | oranye | Siaga | |
| Awas | merah | Awas | |
| belum terukur | abu | Belum terukur | tooltip: sebagian sumber belum masuk atau basi |

Warna: K5 mengalahkan registri hanya di lapisan ini (D33): Normal hijau, belum terukur abu, meski `public/bencana.json` menamai tingkat 0 dengan abu. Token dipilih di DP-10; bila belum ada token hijau status, ditambah di `tema.css` dulu. Karhutla memakai nama tingkat registri (Pencegahan rutin, Patroli terpadu, Siaga pemadaman awal, Prioritas pemadaman) dengan warna yang sama seperti tingkat 0 sampai 3.

Setiap status selalu bertulisan (warna bukan satu-satunya pembeda). Pil "hipotesis" kecil di samping nama "Status prakiraan Centurisk97" selama gerbang belum lolos. Tanda "sebagian sumber" berupa pil kedua. Status tidak pernah disejajarkan dalam satu baris dengan peringatan BMKG: peringatan BMKG berada di blok sendiri berjudul "Peringatan BMKG yang aktif" lengkap dengan nama lembaga dan waktu berlaku.

## Kartu kab (Alun-alun, tab Besok)

Kartu standar `.ex.ex-std` (AGENTS 3.5): kepala = nama kab berikon, tanpa kalimat temuan dan tanpa kaki sumber. Isi: baris status per bahaya (tiga baris), satu baris "Keterpaparan, bukan korban" berisi penduduk dibulatkan dengan label sumber (WorldPop) dan, di bawahnya sebagai teks sekunder, sebaran per kelas bahaya; satu baris jumlah fasilitas yang terpeta; blok peringatan BMKG dengan teks dan sumber. Angka kosong ditulis "belum terukur", tidak 0. Penduduk berlabel "penduduk di area peringatan BMKG" di blok sendiri; di tab Besok ia bukan kolom "Jiwa" (penduduk kab) dan bukan "jiwa terpapar" aturan dampak, dan tidak pernah dijumlah dengan keduanya (D31). Fasilitas ditulis per sumber (mis. sekolah Dapodik, faskes OSM) tanpa jumlah gabungan.

## Saklar Alun-alun

Deretan dua pilihan ujung ke ujung, terbagi rata, berikon: "Kejadian" dan "Peringatan", bawaan Kejadian; pola tab yang sudah ada di `lapor.js`. Tampilan Peringatan memakai peta yang sama (`gambarPetaAlun`): isi kab diwarnai menurut status, poligon BMKG sebagai garis tepi dengan isi tipis. Daftar kartu kejadian disembunyikan di tampilan Peringatan, bukan dibuang. Kartu kejadian boleh memuat satu baris kecil "Status prakiraan: Siaga banjir" bila ada, berupa tautan ke tampilan Peringatan kab itu; baris tidak memakai warna status besar dan tidak berada di dalam pita sumber.

## Peta tiap bencana (K11)

Satu modul bersama; di halaman bencana ia menambah satu tombol lapisan "Status prakiraan" pada daftar lapisan peta yang ada (bukan panel baru), bawaan mati. Bila dinyalakan: isi kab diwarnai menurut status bahaya halaman itu saja, poligon BMKG yang cocok digambar, sentuh kab membuka kartu kab dengan baris bahaya halaman itu. Tidak ada saklar Kejadian dan Peringatan di sana; tidak ada daftar kartu kejadian. Warna dan pil sama dengan bagian Status. Karhutla: warna dari status taktis yang sudah ada, tanpa poligon.

## Dalops dan Layar Pimpinan

Dalops: seksi baru di bawah menu Penanganan atau Prakiraan, kartu standar, kepala "Dampak peringatan" berikon. Isi: peta status dengan poligon, tabel `.ex-tabel` per desa (kepala tabel navy tua, tulisan putih, rata tengah), tombol ikon polos Unduh CSV (tanpa garis luar). Layar Pimpinan: satu kartu dengan dua angka berdampingan (kab Siaga dan Awas, penduduk terpapar), tautan ke Dalops. Latar gelap hanya untuk kepala halaman (AGENTS 3.5, pembaruan 11 Nov).

## Teks

Lewat skill `bahasa-indonesia-plain` dan `modern-web-guidance` dirujuk dulu untuk kode klien. Tanpa titik tengah sebagai pemisah, tanpa huruf kapital semua, angka format Indonesia, tidak ada kata yang menjanjikan keselamatan, tidak ada "terdampak" atau "korban". Nama wilayah ditulis nama, tidak kode. Tautan keluar `target=_blank rel="noopener noreferrer"`, hanya `https:`. Teks dari sumber luar (nama peringatan, nama fasilitas) lewat `textContent`.

## Saring dan INP

Saklar, filter bahaya, dan tabel desa dirender sekali; ganti tampilan hanya mengganti `hidden`. Tabel desa besar (ratusan baris) memakai render bertahap supaya klik tidak membekukan layar (AGENTS INP). Pemeriksa: `inp-reviewer`, `selera-angka`.
