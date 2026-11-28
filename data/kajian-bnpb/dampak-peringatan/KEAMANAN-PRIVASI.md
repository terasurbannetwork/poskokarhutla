# KEAMANAN-PRIVASI: Dampak peringatan dini dan status prakiraan

## Fakta awal

Repo ini publik. Paket ini tidak memuat data pribadi: poligon peringatan BMKG, penduduk agregat per desa (WorldPop dan Dukcapil agregat), fasilitas umum, dan status. Risiko utamanya bukan kebocoran, melainkan salah baca: angka berpresisi palsu, hijau dibaca sebagai selamat, dan penduduk dalam poligon dibaca sebagai korban.

## Data dan tempatnya

| Data | Sifat | Tempat | Siapa melihat |
| --- | --- | --- | --- |
| Poligon dan teks peringatan BMKG | publik (CAP) | D1 `cuaca_nowcast` (sudah ada), disajikan `GET /api/cuaca/nowcast` | publik |
| `ringkas.json`, `status.json` | turunan, kab ke atas, dibulatkan | R2, disajikan Worker dengan cache tepi | publik |
| `desa/<kab4>.json` | penduduk per desa, kelas bahaya, nama dan titik fasilitas | R2 `dampak_peringatan/desa/`, rute staf di balik sesi | staf |
| `status_arsip/YYYY-MM.jsonl` | status per kab per hari | `public/prediksi/data/` di git | publik |
| `public/data/gerbang/status_prakiraan.json` | hasil uji | git | publik |
| Langganan push | endpoint peramban dan kode kecamatan | D1 `pw_langganan` (sudah ada, paket `pwa-peringatan`) | tidak publik |

## Aturan

- Keluaran publik berhenti di kab/kota (D18). Per desa dan nama fasilitas hanya staf; titik koordinat fasilitas tidak pernah di `public/`.
- Dukcapil hanya agregat per desa; tidak ada data per orang. Laki-laki dan perempuan per desa dari kolom `pria` dan `wanita` (jumlah per desa), terpapar sebagai perkiraan; balita dan lansia hanya hitungan per desa. Tahun dan lisensi layanan tidak tertulis (data administrasi kependudukan, bukan sensus).
- Umpan Lapor Kejadian InaRISK yang memuat nama pelapor tidak ditarik dan tidak dirujuk selain di RISET.
- Rute baru: `GET /api/dampak-peringatan/ringkas` dan `/status` hanya baca, batas laju per IP, cache tepi; `GET /api/dampak-peringatan/desa` hanya sesi staf (hak baru di `src/hak.js`, `guard-api` dan `security-reviewer` memeriksa). Parameter `kab` diperiksa pola empat digit; selain itu 400.
- Teks dari sumber luar (nama peringatan BMKG, nama fasilitas) lewat `textContent`; tautan hanya `https:` dan `rel="noopener noreferrer"`.
- Notifikasi: tanpa angka penduduk, tanpa kode wilayah, isi dibatasi seperti `pwa-peringatan`; tidak ada kanal baru. Label "Prakiraan Centurisk97, bukan peringatan resmi BMKG atau BNPB" tetap (pwa Q2).
- Tidak pernah menulis kata yang menjanjikan keselamatan, "terdampak", atau "korban" sebagai fakta; diuji P4.
- Peringatan BMKG, status prakiraan kita, dan status keadaan darurat kepala daerah selalu di blok terpisah (D14).
- Tanpa data dummy dan tanpa tombol uji (aturan pemilik 11 Nov 2026); isian uji hanya di fixture dalam uji.
- Rahasia: hanya `CLOUDFLARE_API_TOKEN` dan `CLOUDFLARE_ACCOUNT_ID` untuk unggah R2 di workflow (sudah ada di GitHub, seperti `siklus.yml`); tidak masuk berkas yang dilacak. Sumber datanya publik. Variabel alamat dasar bukan rahasia. Kunci VAPID warga tetap milik paket `pwa-peringatan`.
- Migrasi D1 `pw_kirim_harian` menyimpan id perangkat (kolom `pw_langganan.id`, 16 karakter), bukan endpoint, dan dibersihkan sesudah 3 hari.

## Risiko

| Risiko | Penahan |
| --- | --- |
| Hijau dibaca "selamat" | teks tooltip D13, tanpa ikon centang, abu bila ada sumber hilang, diuji P11 dan N3 |
| Angka berpresisi palsu | pembulatan di keluaran (ALGORITMA 4), diuji P3 |
| Penduduk di poligon dibaca korban | label "keterpaparan, bukan korban", kata larangan diuji |
| Angka antarsumber tampak setara atau dijumlah | tiga sumber berdampingan, diuji P6 |
| Orang yang sama dihitung dua kali antarbahaya | tidak ada jumlah antarbahaya; total dari gabungan zona |
| Poligon arsip kasar dipakai menghitung penduduk | hitung hanya dari poligon CAP utuh; arsip hanya uji balik kasar dan berlabel |
| Peringatan basi dibaca aktual | kesegaran 3 jam dan 36 jam; basi menjadi "belum terukur" |
| Notifikasi berlebihan dan biaya | satu per perangkat per terbitan, batas 40 per menit, naik saja, pwa D7 sampai D13 |
| Status kita dibaca peringatan resmi | nama "Status prakiraan Centurisk97", pil hipotesis, blok BMKG terpisah; dalam sinyal Tangga (K14) tetap masukan terpisah berlabel |
| Penyalahgunaan rute desa | sesi staf, `guard-api`, tidak di `public/` |
| Titik pusat desa salah mengenai poligon | kab dianggap tersentuh bila paling sedikit satu pusat desa di dalam poligon; dinyatakan sebagai batas ketelitian di halaman metode |
| Status dipakai menggantikan keputusan kepala daerah | teks dan halaman metode menyatakan bukan penetapan status |
