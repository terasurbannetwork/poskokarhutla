# Layar Gempa dan Tsunami

Halaman ini menguraikan layar Gempa dan Tsunami di /gempa/.

## Gempa dan Tsunami: `/gempa/`

Tab menurut `public/gempa/tab.js:3`: Peta, Kejadian, Katalog BMKG, Insight, Tren, Berita, Dampak, Simulasi, Foto, Tentang, Metode. Tab Informasi (`/gempa/informasi`) disembunyikan dari menu tetapi dapat dibuka lewat URL (`tab.js:5`). Tab Operasi ada di kode (`public/gempa/operasi.js`) dan muncul hanya untuk sesi yang boleh membaca `GET /api/pb/titik` (lihat bagian Referensi teknis).

**Peta (`/gempa/peta`).** Langkah pakai:
1. Buka halaman. Peta menampilkan gempa terbaru dari `GET /api/gempa/terbaru`.
2. Pilih jendela waktu di pemilih "Jendela waktu gempa": 24 jam, 72 jam, 7 hari (168 jam), atau 30 hari (720 jam). Nilai lain ditolak server dengan kode 400 (`src/gempa.js:260`, fungsi `jamSah`).
3. Klik titik gempa atau satu baris di panel kiri untuk membuka laci rincian: magnitudo, kedalaman, waktu WIB, wilayah, status tsunami BMKG, MMI dirasakan, tautan shakemap, dan model turunan (guncangan, susulan, risiko).
4. Aktifkan lapisan lewat "Overlay peta": batas lempeng, sesar aktif, sensor InaTEWS, pelampung DART, stasiun GNSS, dan lapisan evakuasi tsunami.

Arti label: pil tingkat "Tidak berpotensi tsunami", "Tsunami Waspada", "Tsunami Siaga", dan "Tsunami Awas" adalah kode BMKG 0 sampai 3 apa adanya (`public/bencana.json`, kunci `tingkat` gempa). Gempa yang teksnya tidak menyebut tsunami tampil "BMKG tidak menyebut tsunami", artinya kode kosong, bukan tingkat nol (`src/gempa.js:26`). Format angka: "M 5,7", "kedalaman 10 km", waktu "12 Okt 04.34 WIB".

**Kejadian (`/gempa/kejadian`, rincian `/gempa/k/G0016`).** Daftar kejadian bernomor G0001 dan seterusnya: satu gempa utama M 5 atau lebih beserta susulannya. Satu kejadian tampil 72 jam, atau 7 hari bila M 6,5 atau lebih. Halaman rincian memuat peta isoseismal (batas tiap kelas MMI), peluang susulan, penduduk dan fasilitas terpapar, kontak BPBD, dan lembar fakta. Hal yang sering disalahpahami: jumlah susulan adalah batas bawah, karena gempa kecil yang tidak pernah masuk katalog tidak terhitung (`src/gempa.js:160` dan komentar `tautkanSusulanKecil`).

**Katalog BMKG (`/gempa/katalog`).** Arsip buletin InaTEWS BMKG: katalog semua magnitudo, buletin M 5 atau lebih, buletin Dirasakan, buletin tsunami (zona dan tinggi terukur), serta katalog sejarah gempa merusak 1821 sampai 2025 dan tsunami 416 sampai 2025 dari PDF BMKG. Di bawahnya ada kartu "Tsunami per zona": tingkat resmi tiap zona pantai BMKG dan pemetaannya ke kabupaten. Kabupaten yang berada di beberapa zona memakai tingkat tertinggi, tidak dirata-rata. Kejadian arsip dapat diputar ulang dan selalu berlabel latihan beserta tanggal aslinya. Pemetaan zona ke kabupaten adalah turunan kita dan belum ditinjau manusia (`scripts/gempa/tsunami_zona.py`, bidang `ditinjau: false`).

**Insight (`/gempa/insight`).** Kartu ringkas berjudul kalimat temuan: gempa terkini, sebaran MMI, sesar, pesisir, kawasan evakuasi, dan dampak BNPB. Di bawahnya kartu "Gempa beruntun di sekitar gunung api" (lihat Metode, bagian Gempa beruntun).

**Tren (`/gempa/tren`).** Riwayat USGS sejak 1900 per provinsi dan tahun: jumlah per kelas magnitudo, M terbesar, dan nilai-b. Tab ini tidak punya kalender musim karena gempa tidak bermusim. Kolom provinsi hanya berasal dari USGS M 5 atau lebih, karena katalog merusak dan tsunami BMKG tidak punya kunci provinsi.

**Berita (`/gempa/berita`).** Berita gempa dan tsunami hasil panen RSS dengan leksikon relevansi (`scripts/gempa/berita.py`). Nada sentimen tidak ditampilkan karena belum punya label uji (`SENTIMEN_TERUJI` bernilai salah).

**Dampak (`/gempa/dampak`).** Penduduk yang tinggal di kecamatan berindeks bahaya gempa tinggi (InaRISK dikali WorldPop). Kelas indeks: rendah di bawah 1/3, sedang 1/3 sampai kurang dari 2/3, tinggi 2/3 atau lebih; ini pilihan kita, bukan ambang resmi InaRISK (`scripts/gempa/dampak.py`). Yang dihitung seluruh penduduk kecamatan, bukan hanya yang berada di piksel berbahaya.

**Simulasi (`/gempa/sim`).** Peta penuh dengan panel kiri dan bilah waktu. Jawabannya "bagaimana jika", bukan prakiraan. Langkah pakai:
1. Dari laci rincian tekan "Simulasikan", atau buka `/gempa/sim?lat=&lon=&m=&dalam=`. Tanpa parameter, simulasi memakai gempa M 5 atau lebih terkuat dalam 7 hari terakhir; bila data tidak ada, dipakai Sesar Lembang (`public/gempa/metode.js`, bab Simulasi).
2. Atur magnitudo, kedalaman, lokasi, dan jenis sumber (kerak atau subduksi).
3. Geser bilah waktu untuk melihat muka gelombang P dan S, MMI per kecamatan, kerusakan dan perkiraan korban, waktu tiba tsunami "T + menit", dan titik evakuasi.
Setiap tampilan memuat label simulasi. Angka kerusakan dan korban jiwa masih meleset beberapa kali lipat per kejadian (lihat Metode, bagian Kerusakan dan korban). Status tsunami resmi tampil terpisah di atas dan tidak berubah oleh simulasi.

**Foto (`/gempa/foto`).** Foto warga dengan kategori Kerusakan bangunan, Retakan tanah, Pengungsian, Genangan tsunami, dan Lainnya (`public/bencana.json`, kunci `foto_kategori`). Unggahan melewati rute Lapor Warga milik `warga-api`.

**Tentang, Metode.** Tentang memuat halaman penjelasan produk. Metode (`/gempa/metode`) adalah satu-satunya tempat rumus ditampilkan; bab yang datanya tidak ada disembunyikan.

**Laporan harian (`/gempa/laporan.html`).** Ringkasan satu hari (60 hari terakhir tersedia): jumlah gempa M 4 atau lebih dan M 5 atau lebih, gempa dirasakan, M terbesar, sorotan tsunami BMKG, dan peluang susulan.
