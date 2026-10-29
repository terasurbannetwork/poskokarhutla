# Panduan drone termal untuk gambut membara

Disusun 28 Okt 2026. Halaman: **/admin/drone**. Kode: `src/drone.js` (rute), `public/admin/drone.js` (layar),
`public/admin/drone_rute.js` (rute sapuan dan KMZ), `scripts/data/harian.py` (sel bara). Rencana armada dan dock:
`docs/bnpb/RENCANA-DRONE.md`. Rujukan ilmiah: `scripts/data/RISET-BARA-GAMBUT.md`.

## 1. Untuk apa

Satelit hanya melihat panas yang sampai ke permukaan. Bara gambut bersuhu rendah dan sering tertutup asap, jadi
sebagian besar lolos dari satelit. Drone dengan kamera termal yang terbang rendah bisa melihat titik panas sekecil
satu meter di atas bara, lalu memetakan letaknya sebelum regu masuk.

Sistem menandai cluster sebagai **gambut membara** bila syarat ini terpenuhi:

- cluster berstatus Waspada ke atas;
- titiknya jatuh di peta gambut BBSDLP;
- sel 750 m-nya terdeteksi di 2 tanggal atau lebih, dan salah satu deteksinya malam hari.

Setiap cluster seperti itu mendapat **ikon drone** di peta, dan sel gambutnya (piksel 375 m) dijadikan sasaran rute.

## 2. Siapa yang boleh membuka

| Akun | Boleh? | Cara masuk |
| --- | --- | --- |
| Admin moderator | Ya, termasuk tombol data contoh (🧪 🧹) bila Super Admin | Masuk admin |
| Staf BNPB, peran apa pun | Ya | Meja Pantau (`/admin/pantau`); sesudah masuk, halaman kembali ke cluster yang dipilih |
| Akun instansi aktif (pemda, TNI, Polri) | Ya | Masuk di `/instansi` dulu, lalu buka tautan drone |
| Akun situs Centurisk97 | Ya | Masuk situs seperti biasa |
| Instansi belum aktif, tamu | Tidak | Dialihkan ke halaman masuk |

Ikon drone di peta tampil untuk semua pengunjung. Halaman rutenya tetap hanya untuk akun di atas.

## 3. Cara pakai, langkah demi langkah

1. **Buka peta** di centurisk97.id, nyalakan lapisan **Cluster**. Cluster gambut membara punya ikon drone bulat navy
   berbingkai emas di sisi kanan atas penandanya.
2. **Klik ikon drone.** Halaman **Atur drone gambut** terbuka di tab baru, dengan cluster itu sudah terpilih. Jalan
   lain: buka pop-up cluster, bagian "Gambut terbakar di bawah permukaan (estimasi)", lalu pilih **🛸 Atur drone ke
   gambut ini**.
3. **Periksa daftar.** Kiri atas memuat semua cluster gambut membara hari ini, diurutkan dari status tertinggi lalu
   persistensi tertinggi. Di peta, sel merah adalah sel persisten (bara paling mungkin), dan sel oranye adalah sel
   gambut lain di cluster yang sama.
4. **Pilih drone** yang dibawa regu. Waktu terbang satu baterai dan sudut pandang kamera terisi otomatis.
   **Sesuaikan dengan baterai nyata di lapangan.**
5. **Atur ketinggian** (bawaan 100 m, maksimal 120 m), kecepatan (bawaan 6 m/detik), dan tumpang tindih foto
   (bawaan 20%). Pengaruhnya dibahas di bagian 4.
6. **Klik peta di titik lepas landas**, yaitu tempat regu berdiri: tepi jalan, tanggul kanal, atau lahan aman yang
   sudah padam. Bawaannya ujung lajur pertama, dan itu jarang tempat yang bisa dicapai regu.
7. **Baca ringkasan:** jumlah penerbangan (satu penerbangan = satu baterai), panjang rute, waktu terbang, dan jumlah
   foto. Peringatan merah muncul bila:
   - titik lepas landas lebih dari 2 km dari lajur pertama (perlu izin BVLOS), atau
   - satu lajur tidak muat dalam satu baterai.
8. **Unduh KMZ** untuk tiap penerbangan. Nama berkasnya `drone-gambut-<cluster>-terbang<n>.kmz`.
9. **Pindahkan KMZ ke remote** (kabel USB atau kartu microSD), lalu buka DJI Pilot 2: **Rute, Impor rute (KMZ/KML)**.
   Periksa di layar remote: ketinggian, kecepatan, aksi kamera, dan zona larangan terbang. Ubah di sana bila perlu.
10. **Terbang** satu penerbangan per baterai, sesuai urutan. Ganti baterai di titik lepas landas.
11. **Setelah terbang:** baca foto termal (bagian 5), lalu unggah titik panasnya ke tugas lewat **Akun Instansi,
    tugas, tab Drone**. Format CSV-nya persis seperti ini:

    ```
    lat,lon,suhu_c,waktu
    -2.73512,114.20177,63.5,2026-10-28T07:12:00+07:00
    ```

    Batasnya 2.000 titik per tugas. Titik harus dalam radius 5 km dari tugas dan berumur paling lama 7 hari.

## 4. Menyetel sensor dan memprogram misi

### 4a. Yang tertulis di KMZ (tidak perlu diatur ulang di remote)

| Bagian | Nilai | Alasan |
| --- | --- | --- |
| Pola rute | Bolak-balik timur–barat, hanya di atas sel gambut, celah antarsel dilompati | Menghemat baterai, tidak memotret lahan mineral |
| Lebar lajur | 2 × tinggi × tan(½ sudut pandang) × (1 − tumpang tindih) | Lajur bersebelahan saling menutup |
| Ketinggian | Relatif ke titik lepas landas (`relativeToStartPoint`) | Gambut datar. Di perbukitan, pakai mode AGL di FlightHub 2 |
| Gimbal | −90° (tegak lurus) di titik pertama | Suhu paling akurat saat kamera tegak lurus permukaan |
| Foto | Termal dan lebar (`ir,wide`), tiap N meter (`multipleDistance`) | N = panjang tapak × (1 − tumpang tindih) |
| Akhir misi | Pulang ke titik lepas landas (`goHome`); sinyal putus = pulang | Aman bila remote kehilangan sinyal |
| Kode drone | `droneEnumValue`, `droneSubEnumValue`, `payloadEnumValue` | Wajib cocok dengan drone. Lihat 4c |

Contoh: pada 100 m dengan sudut pandang horizontal 49°, lebar tapak sekitar 91 m. Dengan tumpang tindih 20%, jarak
lajur sekitar 73 m dan foto diambil tiap sekitar 58 m. Satu piksel termal 640 × 512 kira-kira 14 cm, cukup untuk
titik panas berukuran 1 m.

### 4b. Setelan kamera termal di DJI Pilot 2 (sebelum terbang)

| Setelan | Isi | Kenapa |
| --- | --- | --- |
| Format foto | **R-JPEG** (radiometrik), bukan JPEG biasa | Hanya R-JPEG yang menyimpan suhu per piksel |
| Mode gain | **High gain** untuk mencari bara; **Low gain** bila ada api menyala | High gain lebih peka di suhu rendah tetapi rentangnya sempit. Cek rentang di spesifikasi drone; pada Mavic 3T dan M30T, high gain sekitar −20 sampai 150 °C dan low gain sekitar 0 sampai 500 °C |
| Emisivitas | **0,95** | Perkiraan untuk tanah organik dan abu. Nilai tepatnya untuk gambut Indonesia belum ada di rujukan kami |
| Jarak objek | Isi dengan ketinggian terbang (mis. 100 m) | Koreksi atmosfer suhu |
| Suhu dan kelembapan udara | Isi dari BMKG atau stasiun lokal | Koreksi atmosfer suhu |
| Palet tampilan | White Hot atau Ironbow | Hanya tampilan; suhu tersimpan sama di R-JPEG |
| Alarm suhu / isoterm | Calon bara = suhu latar + 10 °C; kuat = 50 °C ke atas | Burke dkk. 2019 (Drones 3:23) mencatat suhu permukaan di atas api gambut 50–400 °C dan risiko lolos bila di bawah 40 °C. Angka ini masih perlu dicek ke teks lengkapnya, jadi setel ulang dari pengalaman lapangan |
| Pemanasan kamera | Nyalakan 5–10 menit sebelum lepas landas | Kalibrasi otomatis (FFC) stabil, pembacaan suhu tidak melompat |

**Waktu terbang terbaik:** pagi setelah matahari terbit (sekitar 06.00–08.00 WIB) atau sore menjelang terbenam.
Permukaan belum atau tidak lagi dipanasi matahari, jadi kontras bara dengan latar paling tinggi. Siang terik
membuat tanah gundul dan abu sama panasnya dengan bara tipis. Terbang malam dilarang PM 37/2020 tanpa izin
khusus (lihat `RENCANA-DRONE.md` bagian 8).

**Tumpang tindih:** 20% cukup untuk **mencari** bara. Untuk **mosaik peta termal** (ortofoto), naikkan ke 70%
samping dan 80% depan. Waktu terbangnya naik sekitar 3 kali.

### 4c. Kode drone (wajib dicek sekali per jenis drone)

Nilai bawaan di halaman **belum diverifikasi**. Cara mendapatkan nilai yang benar:

1. Di DJI Pilot 2, buat satu rute titik (waypoint) asal-asalan dengan drone yang sama, lalu simpan.
2. Ekspor rute itu sebagai KMZ, buka dengan aplikasi zip, lalu buka `wpmz/waylines.wpml`.
3. Salin angka di `<wpml:droneEnumValue>`, `<wpml:droneSubEnumValue>`, dan `<wpml:payloadEnumValue>`.
4. Di halaman drone, buka **Lanjutan: kamera dan kode drone**, lalu isi ketiga angka itu.
5. Kabari pengelola sistem supaya nilai bawaan di `public/admin/drone_rute.js` (objek `DRONE`) dibetulkan untuk
   semua orang.

Nilai bawaan saat ini: Mavic 3T 77/1/67, Matrice 30T 67/1/53, Matrice 4TD 100/1/99. Sudut pandang horizontal
termal: 49° (3T, 30T) dan 45° (4TD). Waktu terbang aman satu baterai: 30, 28, dan 30 menit. Semuanya perkiraan;
cek di lembar spesifikasi drone.

## 5. Membaca hasil

### Otomatis: skrip `scripts/bnpb/drone_termal.py` (disarankan)

Satu cluster bisa menghasilkan ratusan foto. Skrip ini membaca semua foto R-JPEG dalam satu folder, lalu:

1. mengambil suhu tiap piksel lewat DJI Thermal SDK;
2. menandai piksel yang lebih panas dari median foto + 10 °C (minimal 40 °C);
3. menggabungkan piksel yang bersebelahan jadi satu titik bara;
4. menghitung koordinat tiap titik dari posisi drone, ketinggian, dan arah gimbal;
5. menggabungkan titik yang sama dari foto yang tumpang tindih;
6. menulis CSV siap unggah dan ringkasan pesan WhatsApp.

Persiapan sekali di laptop posko:

- Unduh **DJI Thermal SDK** (gratis) dari situs pengembang DJI.
- Taruh program `dji_irp` dari SDK itu di PATH, atau tunjuk lewat `--sdk`.
- Python 3 sudah cukup; tidak perlu pustaka lain.

```bash
python3 scripts/bnpb/drone_termal.py /jalur/folder_foto -o titik_bara.csv --suhu-udara 32 --kelembapan 60
```

| Opsi | Bawaan | Kapan diubah |
| --- | --- | --- |
| `--delta` | 10 | Calon bara = median foto + delta °C. Turunkan (mis. 6) bila bara tipis lolos, naikkan bila terlalu banyak alarm palsu |
| `--min-suhu` | 40 | Ambang mutlak. Siang terik bisa membuat tanah gundul mendekati 40 °C |
| `--min-piksel` | 3 | Bercak lebih kecil dianggap derau |
| `--fov` | 49 | Sudut pandang horizontal termal, sama dengan halaman drone |
| `--lebar`, `--tinggi` | 640, 512 | 1280 dan 1024 bila memakai mode resolusi super |
| `--zona` | +07:00 | Jam kamera di WITA (+08:00) atau WIT (+09:00) |
| `--raw` | mati | Memakai berkas `.raw` hasil `dji_irp` yang sudah ada, tanpa memanggil SDK |

Batasan:
- Kamera dianggap tegak lurus dan tanah datar. Foto yang miring lebih dari 15° dilewati.
- Parameter jarak di SDK dibatasi 25 m. Untuk terbang 100 m, koreksi udara memakai 25 m, jadi suhu terbaca sedikit lebih rendah dari aslinya. Untuk mencari bara ini tidak masalah, karena yang dicari perbedaan suhu.
- Format metadata DJI dan opsi `dji_irp` belum dicek dengan foto dan versi SDK sungguhan. Uji sekali dengan satu folder foto contoh.
- Self-check tanpa SDK: `python3 scripts/bnpb/drone_termal.py --uji`.

### Manual: DJI Thermal Analysis Tool

1. Salin folder foto dari kartu drone.
2. Buka R-JPEG di **DJI Thermal Analysis Tool 3** (gratis). Atur emisivitas dan jarak seperti 4b, lalu pakai alat
   titik atau kotak untuk membaca suhu maksimum tiap foto.
3. Tandai foto dengan titik di atas ambang. Koordinatnya ada di metadata foto (posisi drone). Karena kamera tegak
   lurus, posisi drone kurang lebih sama dengan posisi titik panas, dengan selisih paling jauh setengah lebar tapak
   (sekitar 45 m pada 100 m).
4. Susun CSV `lat,lon,suhu_c,waktu` dari titik yang ditandai, lalu unggah ke tugas (langkah 3.11). Titik itu tampil
   di layar tugas dan ikut menentukan arahan pemadaman.
5. Bila ada laser rangefinder (Matrice 4TD), pakai koordinat titik laser. Hasilnya lebih tepat daripada posisi drone.

## 6. Tahap berikutnya: kirim langsung ke dock

Pilihan "dock" sudah disiapkan di halaman: Matrice 4TD dengan kode drone dock. KMZ yang sama bisa diunggah ke
FlightHub 2 sebagai rute dan dijalankan oleh dock. **Mengirim otomatis dari halaman ke dock belum dibangun**,
karena butuh tiga hal: dock yang terpasang, jembatan DJI Cloud API atau FlightHub 2 OpenAPI, dan rute worker
bertabel misi. Alurnya sudah dirancang di `RENCANA-DRONE.md` bagian 6–7 (`scripts/bnpb/drone.py`).

## 7. SOP lapangan (PDF)

Versi ringkas siap cetak untuk regu: `public/panduan/sop-drone-gambut.pdf` (diunduh dari tombol di halaman
/admin/drone). Sumbernya `docs/bnpb/sop-drone-gambut.html`; cetak ulang sesudah mengubahnya:

```bash
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless --no-pdf-header-footer --print-to-pdf=public/panduan/sop-drone-gambut.pdf docs/bnpb/sop-drone-gambut.html
```

## 8. Yang belum diuji

- **KMZ belum pernah dibuka di DJI Pilot 2 atau FlightHub 2 sungguhan.**
  - Yang sudah terbukti: zip-nya sah (dibaca pembaca zip Python), XML-nya terurai, dan jumlah titik cocok dengan
    rute (`tests/agen/drone-rute.test.mjs`).
  - Yang belum terbukti: pemicu foto `multipleDistance` dan struktur `template.kml` yang minimal. Uji dulu di
    lapangan terbuka sebelum dipakai di lokasi api.
- Kode drone, sudut pandang, dan waktu baterai bawaan (lihat 4c).
- Emisivitas 0,95 dan ambang alarm suhu: belum ada nilai tervalidasi untuk gambut Indonesia.
- Penanda "gambut membara" sendiri masih hipotesis. Persistensi 2 tanggal dengan deteksi malam belum diuji balik
  terhadap bara yang benar-benar ditemukan di lapangan. Hasil drone yang diunggah (langkah 3.11) adalah data untuk
  menguji balik penanda ini.
